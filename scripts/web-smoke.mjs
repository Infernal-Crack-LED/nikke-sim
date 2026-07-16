import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:4173/?team=liter,crown,naga,modernia,alice',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'CustomEvent', 'Event']) {
  if (!(k in globalThis)) globalThis[k] = dom.window[k] ?? globalThis[k];
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const bundle = readdirSync('dist/assets').find((f) => f.endsWith('.js'));
await import('file://' + process.cwd() + '/dist/assets/' + bundle);
await new Promise((r) => setTimeout(r, 300));

const text = dom.window.document.body.textContent;

// The right-side actions collapse into a hamburger menu; open it so its items
// (Patch Notes / Meet the dev / Credits / Log in) render into the DOM to assert on.
const menuBtn = dom.window.document.querySelector('.nav-menu-btn');
menuBtn?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, button: 0 }));
await new Promise((r) => setTimeout(r, 50));
const menuText = dom.window.document.querySelector('.nav-menu-panel')?.textContent ?? '';

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
  'social footer renders': text.includes('Blablalink') && text.includes('GitHub'),
};
let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(pass ? '  ✓' : '  ✗', name);
  if (!pass) ok = false;
}
if (!ok) { console.log('\n--- body excerpt:\n', text.slice(0, 600)); process.exit(1); }
console.log('\nsmoke test passed — client-side sim runs and renders results');
