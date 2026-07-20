import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';

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

// Mount the built bundle in a fresh JSDOM at `url` and return the dom. The
// cache-busting query on the dynamic import forces the bundle module to
// re-execute on each mount, so we can render more than one route (Sim + Team
// Builder) in a single process. globalThis.document is pointed at the new dom
// before the import so React mounts into that dom's #root.
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
  const bundle = readdirSync('dist/assets').find((f) => f.endsWith('.js'));
  await import(
    'file://' +
      process.cwd() +
      '/dist/assets/' +
      bundle +
      '?u=' +
      encodeURIComponent(url)
  );
  await new Promise((r) => setTimeout(r, 300));
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
const tb = await mountAt('http://localhost:4173/teambuilder');
const tbDoc = tb.window.document;
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
  'testing requested stays visible': text.includes('Testing Requested'),
  'hamburger menu renders':
    menuText.includes('Patch Notes') &&
    menuText.includes('Meet the dev') &&
    menuText.includes('Credits') &&
    menuText.includes('Log in with Discord'),
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
