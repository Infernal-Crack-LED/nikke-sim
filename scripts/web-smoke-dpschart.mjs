// Smoke test for the DPS Chart tab: boots the built bundle at ?chart=… (which selects
// the DPS Chart calc tab), shims fetch to serve the built artifact, and asserts the
// headliners, charted bars, matrix, and compare annotation render.
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';

const artifact = readFileSync('dist/dpschart.json', 'utf8');

const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  {
    url: 'http://localhost:4173/?chart=standard-hc.eleweak.c100.8of12&cmp=helm',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  },
);
for (const k of [
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
]) {
  if (!(k in globalThis)) globalThis[k] = dom.window[k] ?? globalThis[k];
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
if (!globalThis.requestAnimationFrame)
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
// serve the artifact for loadDpsChart()'s fetch
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => JSON.parse(artifact),
});

// routes are code-split — the entry chunk is the index-*.js bundle; the sim
// chunk it lazy-imports resolves over file:// as a real Node module
const bundle = readdirSync('dist/assets').find(
  (f) => f.startsWith('index') && f.endsWith('.js'),
);
if (!bundle) throw new Error('no entry chunk (index-*.js) in dist/assets');
await import('file://' + process.cwd() + '/dist/assets/' + bundle);
// wait for the lazy sim chunk + the chart tab's artifact fetch to render
const t0 = Date.now();
for (;;) {
  if (/rank\s*\d+\s*\/\s*\d+/.test(dom.window.document.body.textContent ?? ''))
    break;
  if (Date.now() - t0 > 8000)
    throw new Error('timed out waiting for chart tab');
  await new Promise((r) => setTimeout(r, 50));
}

const text = dom.window.document.body.textContent;
const checks = {
  'DPS Rankings tab active': text.includes('DPS Rankings'),
  'framework toggle renders':
    text.includes('Solo Framework') && text.includes('Team Framework'),
  'solo headliner 1 renders (default mode)':
    text.includes('Scope Lock Neutral'),
  'solo headliner 2 renders': text.includes('8/12 Elemental Advantage'),
  'solo headliner 3 renders': text.includes('12/12 Elemental Advantage'),
  'charted bars render': text.includes('Snow White: Heavy Arms'),
  'full matrix renders': text.includes('Full matrix'),
  'compare annotation renders': /rank\s*\d+\s*\/\s*\d+/.test(text),
};
let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(pass ? '  ✓' : '  ✗', name);
  if (!pass) ok = false;
}
if (!ok) {
  console.log('\n--- body excerpt:\n', text.slice(0, 800));
  process.exit(1);
}
console.log(
  '\ndpschart smoke passed — chart tab renders headliners, bars, matrix, compare',
);
