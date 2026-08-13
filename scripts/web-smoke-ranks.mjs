// Smoke test for the Support Rankings tab (/ranks/support inside the sim
// App's rankings section): boots the built bundle, shims fetch to serve the
// four real artifacts from dist/, and asserts the section tabs, board pills,
// the Buffer default board (+ profile badge), the hidden boss-settings panel,
// the methodology disclosure, and the Burst Gen / Buffer Typed switches all
// render. Mirrors web-smoke-dpschart.mjs.
//
// Run through tsx, not bare node: the buffer board's row filter is TypeScript
// (src/ranks/buffer-rows.ts) and this file imports it rather than restating
// which rows the page drops — a copy here would go stale the first time that
// list changed, and the smoke would then assert a top row the board no longer
// shows.
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import {
  rankedBufferRows,
  OFF_BOARD_BUFFER_SLUGS,
} from '../src/ranks/buffer-rows.js';
import { computeRanksInputHash } from './artifact-input-hash.js';

const artifacts = {
  'burstgen.json': JSON.parse(readFileSync('dist/burstgen.json', 'utf8')),
  'burstcdr.json': JSON.parse(readFileSync('dist/burstcdr.json', 'utf8')),
  'sustain.json': JSON.parse(readFileSync('dist/sustain.json', 'utf8')),
  'bufferchart.json': JSON.parse(readFileSync('dist/bufferchart.json', 'utf8')),
  'b1b2dps.json': JSON.parse(readFileSync('dist/b1b2dps.json', 'utf8')),
};

// expected content, read from the artifacts themselves (not hardcoded):
// buffer generic's #1 row (the default board), a profiled buffer unit's
// badge, burst-gen's #1 row, buffer typed's #1. The buffer rows go through
// rankedBufferRows first — the artifact's #1 is not necessarily the board's.
const bufferGeneric = rankedBufferRows(
  artifacts['bufferchart.json'].cells.generic
);
const bufferTyped = rankedBufferRows(artifacts['bufferchart.json'].cells.typed);
const bufferTop = bufferGeneric[0][0];
const bufferTopName = artifacts['bufferchart.json'].units[bufferTop].name;
// Off-board units are excluded at the SOURCE: the builder never puts them in
// the population, so they are absent from the artifact's rows AND from its units
// map — that is what keeps every consumer's rank numbering right, not the
// render-time filter. Asserted at module scope so a builder regression fails the
// smoke before any DOM work happens.
//
// ...but ONLY against an artifact this tree built. PR CI does not build the
// boards: it FETCHES the published set (scripts/fetch-published-boards.ts, Step
// 0 of the artifact-decoupling plan) and runs this tier with SKIP_BOARD_BUILD=1.
// A published artifact predating the population filter still carries the
// off-board rows, and decision 1 of that plan rules such staleness ADVISORY —
// the deploy path rebuilds, so a PR must not block on it (the same escape hatch
// board-hash-parity.test.ts takes, keyed the same way, on the artifact's own
// inputsHash rather than on which env var the workflow happened to set). In that
// mode what is under test is the render-time BACKSTOP, which is exactly the
// thing that has to hold there — the DOM assertions below carry it. Announce
// which mode ran: a source check that silently evaporates reads as a pass.
const bufferArt = artifacts['bufferchart.json'];
const bufferBuiltHere = bufferArt.inputsHash === computeRanksInputHash();
if (bufferBuiltHere) {
  for (const slug of OFF_BOARD_BUFFER_SLUGS) {
    for (const board of ['generic', 'typed']) {
      if (bufferArt.cells[board].some((e) => e[0] === slug)) {
        throw new Error(
          `bufferchart ${board} still carries off-board slug "${slug}" — ` +
            'scripts/build-bufferchart.ts must filter it out of the population ' +
            '(src/ranks/buffer.ts bufferPopulation)'
        );
      }
    }
    if (slug in bufferArt.units) {
      throw new Error(
        `bufferchart units map still carries off-board slug "${slug}"`
      );
    }
  }
  process.stdout.write(
    '  ✓ bufferchart artifact was built from this tree and contains no off-board unit\n'
  );
} else {
  process.stdout.write(
    '  ⓘ bufferchart artifact was NOT built from this tree (published/stale — PR CI Step 0);\n' +
      '    the population check is advisory here, so the render-time backstop is what is\n' +
      '    under test below. Rebuild with `npm run ranks:all` to exercise the source check.\n'
  );
}
// Names the board must NOT render, so the exclusion is asserted on the rendered
// DOM too and not just trusted from the artifact. Read from the roster, not the
// artifact's units map — the whole point is that the map no longer has them.
const rosterNames = JSON.parse(
  readFileSync('data/characters.json', 'utf8')
).characters;
const hiddenNames = [...OFF_BOARD_BUFFER_SLUGS]
  .map((slug) => rosterNames[slug]?.name)
  .filter(Boolean);
if (hiddenNames.length !== OFF_BOARD_BUFFER_SLUGS.size) {
  throw new Error(
    'an OFF_BOARD_BUFFER_SLUGS entry is not a roster slug — the DOM assertion ' +
      'below would silently check nothing'
  );
}
// Map buffer comp-profile ids to the badge text rendered by the frontend's
// profileLabel(). Keep in sync with web/src/rankChartBars.ts.
const PROFILE_LABELS = {
  'with-healer': 'w/ Healer',
  'with-shielder': 'w/ Shielder',
  'w/ Prika': 'w/ Prika',
  'w/ Mint': 'w/ Mint',
  'w/ Anchor': 'w/ Anchor',
  'w/ Rouge': 'w/ Rouge',
};
const bufferProfileIds = new Set([
  ...artifacts['bufferchart.json'].cells.generic.map((e) => e[3]),
  ...artifacts['bufferchart.json'].cells.typed.map((e) => e[3]),
]);
for (const id of bufferProfileIds) {
  if (id && !(id in PROFILE_LABELS)) {
    throw new Error(
      `unmapped buffer profile id "${id}" — update PROFILE_LABELS in web-smoke-ranks.mjs and web/src/rankChartBars.ts`
    );
  }
}
const profiledEntry = bufferGeneric.find((e) => e[3]);
const profileBadge = profiledEntry?.[3]
  ? PROFILE_LABELS[profiledEntry[3]]
  : null;

// B1/B2 board profile ids and their rendered badge text (rankChartBars.ts).
//
// ⚠ B1B2DpsRow is [slug, dps, PROFILE, TEMPLATE] (src/ranks/types.ts) — profile is
// index 2. It is NOT BufferRow, which is [slug, addedPct, rules, PROFILE] with profile
// at index 3, the shape the block above this one reads. Reading e[3] here yields the
// template ('b1-20s' | 'b1-40s' | 'b2'), which is never a profile id.
const B1B2_PROFILE_IDX = 2;
const B1B2_TEMPLATE_IDX = 3;
const B1B2_PROFILE_LABELS = {
  'with-avistar': 'w/ Avistar',
  'with-other-b1': 'w/ Other B1',
  'with-chime': 'w/ Chime',
  'as-b1': 'B1',
  'as-b2': 'B2',
};
// Templates are not rendered as badges, but pinning them here is what catches a row
// re-ordering: if profile and template ever swap indices, one of these two loops throws
// with the value it actually found instead of silently badging the wrong field.
const B1B2_TEMPLATES = ['b1-20s', 'b1-40s', 'b2'];
const b1b2Rows = Object.values(artifacts['b1b2dps.json'].cells).flat();
for (const id of new Set(b1b2Rows.map((e) => e[B1B2_PROFILE_IDX]))) {
  if (id && !(id in B1B2_PROFILE_LABELS)) {
    throw new Error(
      `unmapped B1/B2 profile id "${id}" at row index ${B1B2_PROFILE_IDX} — either a new profile needs a label in B1B2_PROFILE_LABELS (web-smoke-ranks.mjs) and web/src/rankChartBars.ts, or B1B2DpsRow's field order changed`
    );
  }
}
for (const t of new Set(b1b2Rows.map((e) => e[B1B2_TEMPLATE_IDX]))) {
  if (!B1B2_TEMPLATES.includes(t)) {
    throw new Error(
      `unexpected B1/B2 template "${t}" at row index ${B1B2_TEMPLATE_IDX} — expected one of ${B1B2_TEMPLATES.join(', ')}; B1B2DpsRow's field order may have changed`
    );
  }
}
// The loops above validate EVERY cell; the badge assertion must come from the cell the
// page actually renders on load (DEFAULT_B1B2_CELL in src/ranks/b1b2-cells.ts), or the
// text check below looks for a badge that is not on screen.
const b1b2ProfiledEntry = artifacts['b1b2dps.json'].cells['c100-eleadv'].find(
  (e) => e[B1B2_PROFILE_IDX]
);
const b1b2ProfileBadge = b1b2ProfiledEntry
  ? B1B2_PROFILE_LABELS[b1b2ProfiledEntry[B1B2_PROFILE_IDX]]
  : null;
const burstgenTop = artifacts['burstgen.json'].entries[0][0];
const burstgenTopName = artifacts['burstgen.json'].units[burstgenTop].name;
const typedTop = bufferTyped[0][0];
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
// The drawn rows' unit names only — an absence check against the whole page
// text would also see nav links and profile badges that mention a unit.
const rowNames = () =>
  [
    ...dom.window.document.querySelectorAll('.dpschart-bars .dpschart-name'),
  ].map((el) => el.textContent ?? '');
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
  // the filter, asserted on what the page actually drew
  [`buffer generic omits ${hiddenNames.join(', ') || '(nothing hidden)'}`]:
    hiddenNames.every((n) => !rowNames().some((r) => r.includes(n))),
  'profile badge renders': profileBadge ? text().includes(profileBadge) : false,
  'methodology disclosure present': text().includes('How this works'),
  // the boards are precomputed — the App's boss/team settings can't affect
  // them, so the shared panel is hidden on this tab (owner 2026-07-26)
  'boss & team settings hidden': !text().includes('Boss & team settings'),
  // every row links to its unit page (owner 2026-08-04): name AND portrait
  // anchors to /unit/<slug>, asserted on the default (buffer generic) board —
  // every board row is a real character, so a bare <span> row is a regression
  'every row name links to its unit page': (() => {
    const cells = [
      ...dom.window.document.querySelectorAll('.dpschart-bars .dpschart-name'),
    ];
    return (
      cells.length > 0 &&
      cells.every(
        (el) =>
          el.tagName === 'A' && el.getAttribute('href')?.startsWith('/unit/')
      )
    );
  })(),
  [`top row name + portrait link to /unit/${bufferTop}`]:
    dom.window.document
      .querySelector('.dpschart-bars a.dpschart-name')
      ?.getAttribute('href') === `/unit/${bufferTop}` &&
    dom.window.document
      .querySelector('.dpschart-bars a.dpschart-portrait-link')
      ?.getAttribute('href') === `/unit/${bufferTop}`,
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
  checks[`burst-gen top row links to /unit/${burstgenTop}`] =
    dom.window.document
      .querySelector('.dpschart-bars a.dpschart-name')
      ?.getAttribute('href') === `/unit/${burstgenTop}`;
  clickPill('Team Buffs');
  await waitFor(/Generic/, 'buffer sub-board pills');
  clickPill('Typed');
  await waitFor(/Team Buffs · typed/, 'buffer typed board');
  checks['buffer Generic/Typed pills render'] = true;
  checks[`buffer typed top bar renders (${typedTopName})`] =
    text().includes(typedTopName);
  checks[`buffer typed omits ${hiddenNames.join(', ') || '(nothing hidden)'}`] =
    hiddenNames.every((n) => !rowNames().some((r) => r.includes(n)));
  clickPill('B1/B2 DPS');
  await waitFor(/B1\/B2 DPS · Core 100 · Ele Adv/, 'b1b2 dps board');
  checks[`b1b2 dps top bar renders (${b1b2TopName})`] =
    text().includes(b1b2TopName);
  if (b1b2ProfileBadge) {
    checks[`b1b2 dps profile badge renders (${b1b2ProfileBadge})`] =
      text().includes(b1b2ProfileBadge);
  }
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
