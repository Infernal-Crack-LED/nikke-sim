// Diagnostic: compare SVG icon rasterization across engines (Chromium vs
// Firefox) and DPRs (1, 1.5, 2), for three variants:
//   raw    — SVG as shipped (viewBox only)
//   wh     — same SVG with explicit width/height attrs
//   inline — inline <svg> element (no <img> decode path)
// ASCII dumps + deviation from an ideal high-res stepped-down reference.
// Scratch file — delete after use.
import { chromium, firefox } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const ICONS = '/Users/maxwellsutton/nikke-sim/web/public/nikke-icons';
const OUT = '/Users/maxwellsutton/nikke-sim/.qwen/icon-diag';
const ELEMENTS = ['fire', 'water', 'wind', 'electric', 'iron'];
const CSS = 16;

for (const e of ELEMENTS) {
  const src = readFileSync(`${ICONS}/code_${e}.svg`, 'utf8');
  writeFileSync(`${OUT}/wh_${e}.svg`, src.replace('<svg ', '<svg width="73" height="73" '));
}

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

const lum = (px, i) => px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
const RAMP = ' .:-=+*#%@';
function ascii(img) {
  const lines = [];
  for (let y = 0; y < img.h; y++) {
    let line = '';
    for (let x = 0; x < img.w; x++) {
      line += RAMP[Math.min(RAMP.length - 1, Math.floor((lum(img.px, (y * img.w + x) * 4) / 255) * RAMP.length))];
    }
    lines.push(line);
  }
  return lines.join('\n');
}
function deviation(a, b) {
  if (a.w !== b.w || a.h !== b.h) return NaN;
  let sum = 0;
  const n = a.w * a.h * 4;
  for (let i = 0; i < n; i++) sum += Math.abs(a.px[i] - b.px[i]);
  return sum / n;
}

const toDataUrl = (file, mime) =>
  `data:${mime};base64,${readFileSync(file).toString('base64')}`;

async function runEngine(name, launch) {
  let browser;
  try {
    browser = await launch();
  } catch (e) {
    console.log(`(skipped ${name}: ${e.message.split('\n')[0]})`);
    return;
  }
  for (const dpr of [1, 1.5, 2]) {
    const ctx = await browser.newContext({
      viewport: { width: 400, height: 300 },
      deviceScaleFactor: dpr,
    });
    const page = await ctx.newPage();
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;background:#14161b}
       .cell{position:absolute;width:${CSS}px;height:${CSS}px}
       img,svg{width:${CSS}px;height:${CSS}px;display:block;object-fit:contain}</style><body></body>`,
    );

    const variants = [];
    for (const e of ELEMENTS) {
      variants.push({ id: `${e}/raw`, kind: 'img', url: toDataUrl(`${ICONS}/code_${e}.svg`, 'image/svg+xml') });
      variants.push({ id: `${e}/wh`, kind: 'img', url: toDataUrl(`${OUT}/wh_${e}.svg`, 'image/svg+xml') });
      variants.push({ id: `${e}/inline`, kind: 'inline', markup: readFileSync(`${ICONS}/code_${e}.svg`, 'utf8') });
    }

    await page.evaluate(
      async (variants) => {
        await Promise.all(
          variants.map(async (v, i) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `v${i}`;
            cell.style.left = `${(i % 10) * 30 + 8}px`;
            cell.style.top = `${Math.floor(i / 10) * 30 + 8}px`;
            if (v.kind === 'img') {
              const img = new Image();
              img.src = v.url;
              await img.decode();
              cell.appendChild(img);
            } else {
              cell.innerHTML = v.markup;
            }
            document.body.appendChild(cell);
          }),
        );
      },
      variants,
    );
    await page.waitForTimeout(250);

    // ideal reference per element: this engine's own high-res vector
    // rasterization, stepped down to the device size
    const dev = Math.round(CSS * dpr);
    const refs = {};
    for (const e of ELEMENTS) {
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
        { src: toDataUrl(`${ICONS}/code_${e}.svg`, 'image/svg+xml'), dev },
      );
      refs[e] = decodePng(Buffer.from(dataUrl.split(',')[1], 'base64'));
    }

    console.log(`\n########## ${name} @ dpr ${dpr} (css ${CSS}px -> ${dev} dev px) ##########`);
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const shot = decodePng(await page.locator(`#v${i} > *`).screenshot());
      const e = v.id.split('/')[0];
      const devn = deviation(shot, refs[e]);
      console.log(`--- ${v.id}  devFromIdeal=${devn.toFixed(2)} (${shot.w}x${shot.h}) ---`);
      if (e === 'fire' || devn > 12) console.log(ascii(shot));
    }
    await ctx.close();
  }
  await browser.close();
}

await runEngine('chromium', chromium.launch.bind(chromium));
await runEngine('firefox', firefox.launch.bind(firefox));
