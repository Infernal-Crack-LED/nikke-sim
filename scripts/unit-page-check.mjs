// Roll-out check for the /unit/<slug> landing pages and the /characters index —
// phase 5 of docs/handoffs/2026-08-02-character-landing-pages-plan.md.
//
//   npm run web:build && node scripts/unit-page-check.mjs
//   SLUGS=a,b,c node scripts/unit-page-check.mjs     # check specific units
//   PORT=4400 node scripts/unit-page-check.mjs       # pick a free port
//   MEASURE=1 node scripts/unit-page-check.mjs       # crawler-visible text census
//
// WHY A SCRIPT AND NOT A GLANCE. The page is data-driven over 196 characters
// whose records are wildly uneven — 85 aren't simulated at all, 38 more have no
// overload table, one has no release date, one has no archetype tags, one is the
// only Λ burst. The design was iterated on ONE fully-populated unit, so every
// section's absent-state is the untested path. This drives the edge cases the
// screenshot pass never touches and fails loudly on a page error.
//
// It asserts STRUCTURE, not content: every page must render its H1, its identity
// row and its Skills section, must never throw, and must show exactly one of the
// two mutually-exclusive states for the data-dependent sections. Which units have
// which data is the artifact's business and changes every sync; that is why the
// expectations below are DERIVED from the artifacts rather than hardcoded.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const REPO = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, REPO), 'utf8'));
const characters = read('data/characters.json').characters;
const unitPages = read('data/unit-pages.json').units;

process.env.PORT = process.env.PORT || '4471';
await import('./serve.mjs');
const base = `http://localhost:${process.env.PORT}`;

// One representative per structurally-distinct record shape, chosen by QUERYING
// the data rather than by hand, so this keeps covering the edge cases as the
// roster changes. `find` returns undefined if a shape stops existing (e.g. every
// unit gains a release date) — those simply drop out of the run.
const byShape = () => {
  const all = Object.values(characters);
  const tags = read('data/archetype-tags.json').tags;
  const first = (f) => all.find(f)?.slug;
  return [
    ['fully populated', 'maiden-ice-rose'],
    ['no release date', first((u) => !u.releaseDate)],
    ['Λ burst', first((u) => u.burst === 'Λ')],
    ['not in the sim', first((u) => !u.simSupported)],
    [
      'simulated, no overload table',
      first((u) => u.simSupported && !unitPages[u.slug]?.ol),
    ],
    ['no archetype tags', first((u) => !tags[u.slug]?.length)],
    ['treasure entry', first((u) => u.treasure)],
    ['charge weapon (CS tab)', first((u) => u.weapon === 'RL')],
    ['non-charge (no CS tab)', first((u) => u.weapon === 'AR')],
  ].filter(([, slug]) => slug);
};

const targets = process.env.SLUGS
  ? process.env.SLUGS.split(',').map((s) => [`SLUGS=${s.trim()}`, s.trim()])
  : byShape();

const browser = await chromium.launch();
const failures = [];

// MEASURE=1 — the crawler-visible text census behind the thin-content policy in
// docs/seo-followups.md. Fetches every unit page and counts the characters a
// crawler that runs NO JS actually sees: strip tags from the server-injected
// #root body. That is the one number the indexing decision turns on, so it has to
// be reproducible rather than a figure someone measured once by hand.
async function measure() {
  const rows = [];
  for (const slug of Object.keys(characters)) {
    const html = await (await fetch(`${base}/unit/${slug}`)).text();
    const i = html.indexOf('id="root">');
    const body = i >= 0 ? html.slice(i, html.indexOf('</body>', i)) : '';
    const text = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    rows.push({
      slug,
      n: text.length,
      ol: Boolean(unitPages[slug]?.ol?.length),
      sim: Boolean(characters[slug].simSupported),
    });
  }
  const tier = (label, f) => {
    const ns = rows
      .filter(f)
      .map((r) => r.n)
      .sort((a, b) => a - b);
    if (!ns.length) {
      return;
    }
    console.log(
      `  ${label.padEnd(34)} n=${String(ns.length).padStart(3)}  min=${String(ns[0]).padStart(5)}` +
        `  median=${String(ns[Math.floor(ns.length / 2)]).padStart(5)}  max=${String(ns[ns.length - 1]).padStart(5)}`
    );
  };
  console.log('\ncrawler-visible text per unit page (characters)\n');
  tier('all', () => true);
  tier('has an overload table', (r) => r.ol);
  tier('simulated, no overload table', (r) => r.sim && !r.ol);
  tier('kit + identity only', (r) => !r.sim);
  const thin = rows.filter((r) => r.n < 500).sort((a, b) => a.n - b.n);
  console.log(
    `\n  under 500 chars: ${thin.length}   under 300: ${rows.filter((r) => r.n < 300).length}`
  );
  thin.forEach((r) => console.log(`    ${String(r.n).padStart(5)}  ${r.slug}`));
  console.log('');
}

if (process.env.MEASURE) {
  await measure();
  await browser.close();
  process.exit(0);
}

async function checkUnit(label, slug) {
  const ctx = await browser.newContext({
    viewport: { width: 1180, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // 404s for optional build artifacts are expected on a dev/preview host and
    // are handled in-page; a real defect surfaces as a pageerror instead.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      errors.push(`console: ${m.text()}`);
    }
  });
  await page.goto(`${base}/unit/${slug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const n = (sel) => page.locator(sel).count();
  const found = {
    h1: (await page.locator('h1').count()) > 0,
    idents: await n('.unit-ident'),
    skills: await n('.unit-skill'),
    olTable: await n('.unit-ol-table'),
    tabs: await n('.unit-tabs button'),
    status: await n('.pill-tier'),
    crumbs: await n('.unit-crumbs a'),
  };
  const title = await page.title();
  const char = characters[slug];
  const expectCs = char.weapon === 'RL' || char.weapon === 'SR';

  const problems = [];
  if (!found.h1) {
    problems.push('no <h1>');
  }
  if (!found.idents) {
    problems.push('no identity row');
  }
  if (!found.skills) {
    problems.push('no skills');
  }
  if (!found.crumbs) {
    problems.push('no breadcrumb');
  }
  if (!found.status) {
    problems.push('no sim-status badge');
  }
  if (!/NIKKE/.test(title)) {
    problems.push(`title not set: ${title}`);
  }
  // The tab strip is always 2 tabs, 3 for a charge weapon.
  const wantTabs = expectCs ? 3 : 2;
  if (found.tabs !== wantTabs) {
    problems.push(`${found.tabs} tabs, expected ${wantTabs}`);
  }
  // A unit with an overload table must render one; a unit without must not
  // render an empty one.
  const hasOl = Boolean(unitPages[slug]?.ol?.length);
  if (hasOl && !found.olTable) {
    problems.push('has OL data but no table');
  }
  if (!hasOl && found.olTable) {
    problems.push('no OL data but rendered a table');
  }

  problems.push(...errors);
  const ok = problems.length === 0;
  console.log(
    `${ok ? '  ok ' : 'FAIL '} ${label.padEnd(30)} ${slug.padEnd(26)} ` +
      `idents=${found.idents} skills=${found.skills} tabs=${found.tabs} ol=${found.olTable}`
  );
  if (!ok) {
    problems.forEach((p) => console.log(`       ↳ ${p}`));
    failures.push(`${slug}: ${problems.join('; ')}`);
  }
  await ctx.close();
}

console.log(`\nunit pages (${targets.length} shapes)\n`);
for (const [label, slug] of targets) {
  await checkUnit(label, slug);
}

// An unknown slug must be a real "not found" page, never a crash or a blank.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/unit/definitely-not-a-nikke`, {
    waitUntil: 'networkidle',
  });
  const body = await page.locator('body').innerText();
  const ok = /not found/i.test(body) && errors.length === 0;
  console.log(`\n${ok ? '  ok ' : 'FAIL '} unknown slug → not-found page`);
  if (!ok) {
    failures.push(`unknown slug: ${errors.join('; ') || body.slice(0, 80)}`);
  }
  await ctx.close();
}

// The index must link every character; that link set IS the crawl surface.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/characters`, { waitUntil: 'networkidle' });
  // DISTINCT hrefs, not the raw anchor count: the New Characters row repeats
  // units that also appear in the full grid, so the raw count exceeds the roster
  // and would read as a discrepancy. What matters is that every character is
  // reachable exactly once as a crawl target.
  const hrefs = await page
    .locator('a[href^="/unit/"]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
  const total = Object.keys(characters).length;
  const missing = Object.keys(characters).filter(
    (slug) => !hrefs.includes(`/unit/${slug}`)
  );
  const ok = missing.length === 0 && errors.length === 0;
  console.log(
    `${ok ? '  ok ' : 'FAIL '} /characters links ${hrefs.length} distinct unit pages (roster ${total})`
  );
  if (!ok) {
    failures.push(
      `/characters: ${missing.length} unlinked (${missing.slice(0, 5).join(', ')}); ${errors.join('; ')}`
    );
  }
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('\nunit-page check: all passed\n');
process.exit(0);
