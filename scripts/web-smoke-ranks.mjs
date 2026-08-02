// Smoke test for the Support Rankings tab (/ranks/support inside the sim
// App's rankings section): boots the built bundle, shims fetch to serve the
// four real artifacts from dist/, and asserts the section tabs, board pills,
// the Buffer default board (+ profile badge), the hidden boss-settings panel,
// the methodology disclosure, and the Burst Gen / Buffer Typed switches all
// render. Mirrors web-smoke-dpschart.mjs.
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';

const artifacts = {
  'burstgen.json': JSON.parse(readFileSync('dist/burstgen.json', 'utf8')),
  'burstcdr.json': JSON.parse(readFileSync('dist/burstcdr.json', 'utf8')),
  'sustain.json': JSON.parse(readFileSync('dist/sustain.json', 'utf8')),
  'bufferchart.json': JSON.parse(readFileSync('dist/bufferchart.json', 'utf8')),
  'b1b2dps.json': JSON.parse(readFileSync('dist/b1b2dps.json', 'utf8')),
};

// expected content, read from the artifacts themselves (not hardcoded):
// buffer generic's #1 row (the default board), a profiled buffer unit's
// badge, burst-gen's #1 row, buffer typed's #1
const bufferTop = artifacts['bufferchart.json'].cells.generic[0][0];
const bufferTopName = artifacts['bufferchart.json'].units[bufferTop].name;
const profiledEntry = artifacts['bufferchart.json'].cells.generic.find(
  (e) => e[3]
);
// Map buffer comp-profile ids to the badge text rendered by the frontend's
// profileLabel(). Keep in sync with web/src/SupportRankings.tsx.
const PROFILE_LABELS = {
  'with-healer': 'w/ Healer',
  'with-shielder': 'w/ Shielder',
  'w/ Prika': 'w/ Prika',
  'w/ Mint': 'w/ Mint',
  'w/ Anchor': 'w/ Anchor',
  'w/ Bunny': 'w/ Bunny',
  'with-avistar': 'w/ MG B1',
  'with-other-b1': 'w/ Other B1',
  'with-chime': 'w/ Chime',
  'as-b1': 'B1',
  'as-b2': 'B2',
};
const profileBadge = profiledEntry?.[3]
  ? (PROFILE_LABELS[profiledEntry[3]] ?? null)
  : null;
const burstgenTop = artifacts['burstgen.json'].entries[0][0];
const burstgenTopName = artifacts['burstgen.json'].units[burstgenTop].name;
const typedTop = artifacts['bufferchart.json'].cells.typed[0][0];
const typedTopName = artifacts['bufferchart.json'].units[typedTop].name;
const b1b2Top = artifacts['b1b2dps.json'].cells['c100-eleadv'][0][0];
const b1b2TopName = artifacts['b1b2dps.json'].units[b1b2Top].name;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  {
    url: 'http://localhost:4173/ranks/support',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  }
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
  if (!(k in globalThis)) {
    globalThis[k] = dom.window[k] ?? globalThis[k];
  }
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}
// route each board's fetch by URL suffix to the real dist/ artifact
globalThis.fetch = (url) => {
  const file = Object.keys(artifacts).find((f) => String(url).endsWith(f));
  if (!file) {
    return Promise.resolve({ ok: false, status: 404, json: () => ({}) });
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => artifacts[file],
  });
};

// routes are code-split — the entry chunk is the index-*.js bundle; the lazy
// page chunk it imports resolves over file:// as a real Node module
const bundle = readdirSync('dist/assets').find(
  (f) => f.startsWith('index') && f.endsWith('.js')
);
if (!bundle) {
  throw new Error('no entry chunk (index-*.js) in dist/assets');
}
await import('file://' + process.cwd() + '/dist/assets/' + bundle);

const waitFor = async (re, what) => {
  const t0 = Date.now();
  for (;;) {
    if (re.test(dom.window.document.body.textContent ?? '')) {
      return;
    }
    if (Date.now() - t0 > 8000) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
};
// the boards live inside the lazy App chunk — wait for the section tab bar
// first, then for the buffer (default board) artifact to render its top row
await waitFor(/Support Rankings/, 'rankings section tabs');
await waitFor(new RegExp(esc(bufferTopName)), 'buffer default board');

const text = () => dom.window.document.body.textContent ?? '';
const checks = {
  'section tabs render': [
    'DPS Rankings',
    'Support Rankings',
    'Unit Comparisons',
  ].every((s) => text().includes(s)),
  'board pills render (buffer first)': [
    'Team Buffs',
    'Burst Gen',
    'Sustain',
    'Burst CDR',
    'B1/B2 DPS',
  ].every((s) => text().includes(s)),
  // owner 2026-07-26: pill order Buffer → Burst Gen → Sustain → Burst CDR → B1/B2 DPS
  // (first occurrences are the pills; the intro copy is lowercase)
  'pill order: buffer, burst gen, sustain, cdr, b1/b2 dps': (() => {
    const i = [
      'Team Buffs',
      'Burst Gen',
      'Sustain',
      'Burst CDR',
      'B1/B2 DPS',
    ].map((s) => text().indexOf(s));
    return (
      i.every((x) => x >= 0) &&
      i[0] < i[1] &&
      i[1] < i[2] &&
      i[2] < i[3] &&
      i[3] < i[4]
    );
  })(),
  [`buffer default top bar renders (${bufferTopName})`]:
    text().includes(bufferTopName),
  'profile badge renders': profileBadge ? text().includes(profileBadge) : false,
  'methodology disclosure present': text().includes('How this works'),
  // the boards are precomputed — the App's boss/team settings can't affect
  // them, so the shared panel is hidden on this tab (owner 2026-07-26)
  'boss & team settings hidden': !text().includes('Boss & team settings'),
};
// switch boards like a user would: Burst Gen, then back to Buffer → Typed
const clickPill = (label) => {
  const btn = [...dom.window.document.querySelectorAll('.pills button')].find(
    (b) => b.textContent === label
  );
  if (!btn) {
    throw new Error(`pill "${label}" not found`);
  }
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
};
try {
  // wait on the board TITLE (unique to the board), not the top unit: Liberalio
  // also sits on the buffer board, and a name-based wait can race React's
  // microtask flush (match the old board, assert after the re-render)
  clickPill('Burst Gen');
  await waitFor(/Burst Generation/, 'burst-gen board');
  checks[`burst-gen top bar renders (${burstgenTopName})`] =
    text().includes(burstgenTopName);
  clickPill('Team Buffs');
  await waitFor(/Generic/, 'buffer sub-board pills');
  clickPill('Typed');
  await waitFor(/Team Buffs · typed/, 'buffer typed board');
  checks['buffer Generic/Typed pills render'] = true;
  checks[`buffer typed top bar renders (${typedTopName})`] =
    text().includes(typedTopName);
  clickPill('B1/B2 DPS');
  await waitFor(/B1\/B2 DPS · Core 100 · Ele Adv/, 'b1b2 dps board');
  checks[`b1b2 dps top bar renders (${b1b2TopName})`] =
    text().includes(b1b2TopName);
} catch (e) {
  checks['board switching works'] = false;
  console.error('  board switch error:', e.message);
}

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(pass ? '  ✓' : '  ✗', name);
  if (!pass) {
    ok = false;
  }
}
if (!ok) {
  console.log('\n--- body excerpt:\n', text().slice(0, 800));
  process.exit(1);
}
console.log(
  '\nranks smoke passed — section tabs, buffer default board, hidden boss settings, board switching'
);
