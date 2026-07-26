// Smoke test for the Support Rankings tab (/ranks/support inside the sim
// App's rankings section): boots the built bundle, shims fetch to serve the
// four real artifacts from dist/, and asserts the section tabs, board pills,
// burst-gen bars, profile badge, methodology disclosure, and the Buffer →
// Typed switch all render. Mirrors web-smoke-dpschart.mjs.
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';

const artifacts = {
  'burstgen.json': JSON.parse(readFileSync('dist/burstgen.json', 'utf8')),
  'burstcdr.json': JSON.parse(readFileSync('dist/burstcdr.json', 'utf8')),
  'sustain.json': JSON.parse(readFileSync('dist/sustain.json', 'utf8')),
  'bufferchart.json': JSON.parse(readFileSync('dist/bufferchart.json', 'utf8')),
};

// expected content, read from the artifacts themselves (not hardcoded):
// burst-gen's #1 row name, a profiled burst-gen unit's badge, buffer typed's #1
const burstgenTop = artifacts['burstgen.json'].entries[0][0];
const burstgenTopName = artifacts['burstgen.json'].units[burstgenTop].name;
const profiledEntry = artifacts['burstgen.json'].entries.find((e) => e[2]);
const profileBadge =
  { 'with-2mg': 'w/ 2 MG', 'with-1mg': 'w/ 1 MG' }[profiledEntry?.[2]] ?? null;
const typedTop = artifacts['bufferchart.json'].cells.typed[0][0];
const typedTopName = artifacts['bufferchart.json'].units[typedTop].name;

const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  {
    url: 'http://localhost:4173/ranks/support',
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
  'MouseEvent',
]) {
  if (!(k in globalThis)) globalThis[k] = dom.window[k] ?? globalThis[k];
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
if (!globalThis.requestAnimationFrame)
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
// route each board's fetch by URL suffix to the real dist/ artifact
globalThis.fetch = async (url) => {
  const file = Object.keys(artifacts).find((f) => String(url).endsWith(f));
  if (!file) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => artifacts[file] };
};

// routes are code-split — the entry chunk is the index-*.js bundle; the lazy
// page chunk it imports resolves over file:// as a real Node module
const bundle = readdirSync('dist/assets').find(
  (f) => f.startsWith('index') && f.endsWith('.js'),
);
if (!bundle) throw new Error('no entry chunk (index-*.js) in dist/assets');
await import('file://' + process.cwd() + '/dist/assets/' + bundle);

const waitFor = async (re, what) => {
  const t0 = Date.now();
  for (;;) {
    if (re.test(dom.window.document.body.textContent ?? '')) return;
    if (Date.now() - t0 > 8000)
      throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
};
// the boards live inside the lazy App chunk — wait for the section tab bar
// first, then for the burst-gen artifact fetch to render its top row
await waitFor(/Support Rankings/, 'rankings section tabs');
await waitFor(
  new RegExp(burstgenTopName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  'burst-gen bars',
);

const text = () => dom.window.document.body.textContent ?? '';
const checks = {
  'section tabs render': [
    'DPS Rankings',
    'Support Rankings',
    'Unit Comparisons',
  ].every((s) => text().includes(s)),
  'board pills render': ['Burst Gen', 'Burst CDR', 'Sustain', 'Buffer'].every(
    (s) => text().includes(s),
  ),
  [`burst-gen top bar renders (${burstgenTopName})`]:
    text().includes(burstgenTopName),
  'profile badge renders': profileBadge
    ? text().includes(profileBadge)
    : false,
  'methodology disclosure present': text().includes('How this works'),
};
// switch to Buffer, then Typed — click the pills like a user would
const clickPill = (label) => {
  const btn = [...dom.window.document.querySelectorAll('.pills button')].find(
    (b) => b.textContent === label,
  );
  if (!btn) throw new Error(`pill "${label}" not found`);
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
};
try {
  clickPill('Buffer');
  await waitFor(/Generic/, 'buffer sub-board pills');
  clickPill('Typed');
  await waitFor(
    new RegExp(typedTopName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    'buffer typed board',
  );
  checks['buffer Generic/Typed pills render'] = true;
  checks[`buffer typed top bar renders (${typedTopName})`] =
    text().includes(typedTopName);
} catch (e) {
  checks['buffer Generic/Typed pills render'] = false;
  checks['buffer typed top bar renders'] = false;
  console.error('  buffer switch error:', e.message);
}

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(pass ? '  ✓' : '  ✗', name);
  if (!pass) ok = false;
}
if (!ok) {
  console.log('\n--- body excerpt:\n', text().slice(0, 800));
  process.exit(1);
}
console.log(
  '\nranks smoke passed — section tabs, board pills, burst-gen bars, profile badge, methodology, buffer typed board',
);
