import { JSDOM } from 'jsdom';
import { readdirSync } from 'node:fs';

const GLOBALS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'CustomEvent',
  'Event',
];

// Poll until pred() is truthy (or timeout) — lazy chunks + the sim's first
// render land asynchronously after the entry module executes.
async function waitFor(pred, timeoutMs, what) {
  const t0 = Date.now();
  for (;;) {
    if (pred()) return;
    if (Date.now() - t0 > timeoutMs)
      throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

// Mount the built bundle in a fresh JSDOM at `url` and return the dom.
// globalThis.document is pointed at the new dom before the import so React
// mounts into that dom's #root.
async function mountAt(url) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url, pretendToBeVisual: true, runScripts: 'outside-only' },
  );
  for (const k of GLOBALS)
    if (!(k in globalThis)) globalThis[k] = dom.window[k] ?? globalThis[k];
  // jsdom doesn't provide Image; the portrait-thumbnail hooks use it for canvas
  if (!globalThis.Image)
    globalThis.Image =
      dom.window.Image ??
      class {
        set src(_) {}
      };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  if (!globalThis.requestAnimationFrame)
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  // Vite's modulepreload polyfill probes lazy chunks via fetch() when the DOM
  // lacks modulepreload support (JSDOM does) — answer the probes with an empty
  // ok response; the real chunk load goes through Node's file:// import().
  // (Real browsers support modulepreload and never take the fetch path.)
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({}),
  });
  // Routes are code-split — the entry chunk is the index-*.js bundle; the page
  // chunks it lazy-imports resolve over file:// as real Node modules. Import
  // it exactly once (bare URL): the lazy chunks import shared modules back
  // from the entry chunk, and a cache-busting query would make Node treat the
  // entry as two modules — double-booting React on the same #root.
  const bundle = readdirSync('dist/assets').find(
    (f) => f.startsWith('index') && f.endsWith('.js'),
  );
  if (!bundle) throw new Error('no entry chunk (index-*.js) in dist/assets');
  await import('file://' + process.cwd() + '/dist/assets/' + bundle);
  // wait for the lazy route chunk to resolve + render (Suspense)
  await waitFor(
    () => dom.window.document.querySelector('.app'),
    8000,
    'the app to mount',
  );
  return dom;
}

// ---- Sim tab --------------------------------------------------------------
const sim = await mountAt(
  'http://localhost:4173/?team=liter,crown,naga,modernia,alice',
);
const text = sim.window.document.body.textContent;

// The right-side actions collapse into a hamburger menu; open it so its items
// (Patch Notes / Meet the dev / Credits / Log in) render into the DOM to assert on.
const menuBtn = sim.window.document.querySelector('.nav-menu-btn');
menuBtn?.dispatchEvent(
  new sim.window.MouseEvent('click', { bubbles: true, button: 0 }),
);
await new Promise((r) => setTimeout(r, 50));
const menuText =
  sim.window.document.querySelector('.nav-menu-panel')?.textContent ?? '';

// ---- Team Builder tab -----------------------------------------------------
// SPA-navigate the mounted app to /teambuilder the way a user would (the top
// nav does pushState + popstate) — this also exercises the lazy route chunk.
sim.window.history.pushState({}, '', '/teambuilder');
sim.window.dispatchEvent(new sim.window.PopStateEvent('popstate'));
await waitFor(
  () => sim.window.document.querySelector('.teambuilder-pill'),
  8000,
  'the Team Builder tab to render',
);
const tbDoc = sim.window.document;
const tbText = tbDoc.body.textContent;
const groupLabels = [
  ...tbDoc.querySelectorAll('.teambuilder-archetype-group-label'),
].map((n) => n.textContent);
const pillCount = tbDoc.querySelectorAll('.teambuilder-pill').length;

const checks = {
  'renders title': text.includes('NIKKE Solo Raid Sim'),
  'default team loaded': text.includes('Modernia') && text.includes('Liter'),
  'sim produced team damage': /team\s*\d+(\.\d+)?[MB]/.test(text),
  'share % rendered': /%/.test(text),
  'full bursts reported': /full\s*bursts/.test(text),
  'site nav renders': text.includes('Mechanics') && text.includes('Sim'),
  'discord login stays visible': text.includes('Log in with Discord'),
  'hamburger menu renders':
    menuText.includes('Testing Requested') &&
    menuText.includes('Sync my roster') &&
    menuText.includes('Patch Notes') &&
    menuText.includes('Meet the dev') &&
    menuText.includes('Credits'),
  'social footer renders':
    text.includes('Blablalink') && text.includes('GitHub'),
  // Kit-role archetype pills render bucketed into their groups (Stat Buffs /
  // Damage Buffs / Ally Filters / Burst Support / Role).
  'teambuilder role groups render': [
    'Stat Buffs',
    'Damage Buffs',
    'Ally Filters',
    'Burst Support',
    'Role',
  ].every((g) => groupLabels.includes(g)),
  'teambuilder pills render': pillCount > 30 && tbText.includes('Shotgun ▲'),
};
let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(pass ? '  ✓' : '  ✗', name);
  if (!pass) ok = false;
}
if (!ok) {
  console.log('\n--- sim body excerpt:\n', text.slice(0, 600));
  console.log(
    '\n--- teambuilder groups:',
    groupLabels.join(' | '),
    '| pills:',
    pillCount,
  );
  process.exit(1);
}
console.log('\nsmoke test passed — client-side sim runs and renders results');
