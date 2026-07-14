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
const checks = {
  'renders title': text.includes('NIKKE Solo Raid Sim'),
  'default team loaded': text.includes('Modernia') && text.includes('Liter'),
  'sim produced team damage': /team\s*\d+(\.\d+)?[MB]/.test(text),
  'share % rendered': /%/.test(text),
  'full bursts reported': /full\s*bursts/.test(text),
  'site nav renders': text.includes('Mechanics') && text.includes('Sim'),
  'header buttons render':
    text.includes('Patch Notes') &&
    text.includes('Meet the dev') &&
    text.includes('Log in with Discord'),
  'social footer renders': text.includes('Blablalink') && text.includes('GitHub'),
};
let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(pass ? '  ✓' : '  ✗', name);
  if (!pass) ok = false;
}
if (!ok) { console.log('\n--- body excerpt:\n', text.slice(0, 600)); process.exit(1); }
console.log('\nsmoke test passed — client-side sim runs and renders results');
