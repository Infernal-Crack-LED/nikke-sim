// Diagnostic: does the browser reuse ONE rasterization of the same SVG URL
// across multiple display sizes on the same page (as the real site does:
// 16px pills / 18px cards / 40px filter icons)? If the large render deviates
// heavily from its own ideal reference after a small render loaded first,
// the decode cache is serving a scaled-up small bitmap.
// Scratch file — delete after use.
import { chromium, firefox } from 'playwright';
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';

const ICONS = '/Users/maxwellsutton/nikke-sim/web/public/nikke-icons';
const toDataUrl = (file) =>
  `data:image/svg+xml;base64,${readFileSync(file).toString('base64')}`;
// http-ish URL matters: data: URLs may bypass the image decode cache, so use
// a unique query per size-pair test but the SAME url for both sizes within a
// test (that's the point: one URL, two sizes).
const SRC = toDataUrl(`${ICONS}/code_fire.svg`);

function decodePng(buf) {
  let pos = 8;
  let w = 0, h = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const px = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.from(line);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      switch (filter) {
        case 1: cur[x] = (cur[x] + a) & 255; break;
        case 2: cur[x] = (cur[x] + b) & 255; break;
        case 3: cur[x] = (cur[x] + ((a + b) >> 1)) & 255; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          cur[x] = (cur[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
          break;
        }
      }
    }
    for (let x = 0; x < w; x++) {
      const si = x * channels, di = (y * w + x) * 4;
      px[di] = cur[si]; px[di + 1] = cur[si + 1]; px[di + 2] = cur[si + 2];
      px[di + 3] = channels === 4 ? cur[si + 3] : 255;
    }
    prev = cur;
  }
  return { w, h, px };
}

function deviation(a, b) {
  if (a.w !== b.w || a.h !== b.h) return NaN;
  let sum = 0;
  const n = a.w * a.h * 4;
  for (let i = 0; i < n; i++) sum += Math.abs(a.px[i] - b.px[i]);
  return sum / n;
}

const RAMP = ' .:-=+*#%@';
const lum = (px, i) => px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
function ascii(img) {
  const lines = [];
  for (let y = 0; y < img.h; y++) {
    let line = '';
    for (let x = 0; x < img.w; x++)
      line += RAMP[Math.min(RAMP.length - 1, Math.floor((lum(img.px, (y * img.w + x) * 4) / 255) * RAMP.length))];
    lines.push(line);
  }
  return lines.join('\n');
}

async function idealRef(page, dev) {
  const dataUrl = await page.evaluate(
    async ({ src, dev }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      let size = 1024;
      let cv = document.createElement('canvas');
      cv.width = cv.height = size;
      let cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, 0, 0, size, size);
      while (size > dev) {
        const next = Math.max(dev, Math.round(size / 2));
        const nv = document.createElement('canvas');
        nv.width = nv.height = next;
        const nx = nv.getContext('2d');
        nx.imageSmoothingEnabled = true;
        nx.imageSmoothingQuality = 'high';
        nx.drawImage(cv, 0, 0, next, next);
        cv = nv;
        size = next;
      }
      return cv.toDataURL('image/png');
    },
    { src: SRC, dev },
  );
  return decodePng(Buffer.from(dataUrl.split(',')[1], 'base64'));
}

async function test(name, launch, dpr) {
  let browser;
  try {
    browser = await launch();
  } catch (e) {
    console.log(`(skipped ${name}: ${e.message.split('\n')[0]})`);
    return;
  }
  const ctx = await browser.newContext({
    viewport: { width: 500, height: 300 },
    deviceScaleFactor: dpr,
  });
  const page = await ctx.newPage();

  // order A: small (16px) loads first, then large (40px) — mimics pills
  // rendering before the user scrolls to the 40px filter row
  for (const order of ['small-first', 'large-first']) {
    const sizes = order === 'small-first' ? [16, 40] : [40, 16];
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;background:#14161b}img{position:absolute;display:block;object-fit:contain}</style><body></body>`,
    );
    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      await page.evaluate(
        async ({ src, s, i }) => {
          const img = new Image();
          img.id = `s${s}`;
          img.style.cssText = `left:${20 + i * 120}px;top:20px;width:${s}px;height:${s}px`;
          img.src = src;
          document.body.appendChild(img);
          await img.decode();
        },
        { src: SRC, s, i },
      );
    }
    await page.waitForTimeout(200);
    const big = decodePng(await page.locator('#s40').screenshot());
    const ref = await idealRef(page, Math.round(40 * dpr));
    const d = deviation(big, ref);
    console.log(`\n=== ${name} dpr ${dpr}, ${order}: 40px render devFromIdeal=${d.toFixed(2)} (${big.w}x${big.h}) ===`);
    if (d > 15) console.log(ascii(big));
  }
  await ctx.close();
  await browser.close();
}

for (const dpr of [1, 2]) {
  await test('chromium', chromium.launch.bind(chromium), dpr);
  await test('firefox', firefox.launch.bind(firefox), dpr);
}
