// Render the no-JS bodies for the prose content pages (/mechanics, /howto) into
// web/public/content-pages.json, which vite copies into dist/ and both servers
// inject into #root at request time.
//
// WHY THIS EXISTS RATHER THAN A PRERENDER PASS. scripts/prerender.ts used to
// drive these two routes through Playwright during `npm run build:deploy` — but
// railway.json's buildCommand is `bash scripts/verify.sh artifacts`, which never
// calls build:deploy, so the step never ran on the deploy box and both routes
// shipped an empty <div id="root"></div> to every crawler that does not execute
// JS. Request-time injection is the pattern that demonstrably works in
// production (see unitStaticHtml / charactersStaticHtml in src/server/static.ts)
// and is the approach docs/seo-followups.md settled on: extend those functions,
// do not add a prerender pass.
//
// The HTML is generated from the SAME modules MechanicsPage.tsx and HowToPage.tsx
// import, so the crawler-visible copy cannot drift from the rendered page — the
// same guarantee data/unit-pages.json gives the unit pages. React replaces this
// markup wholesale on load (createRoot, not hydration), so it only has to be
// valid and crawlable, not identical to React's output.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mechanics from '../web/src/mechanics-data.js';
import * as howto from '../web/src/howto-data.js';

const OUT = join(
  fileURLToPath(new URL('..', import.meta.url)),
  'web/public/content-pages.json'
);

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ul = (items: string[]): string =>
  `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;

// Mirrors MechanicsPage.tsx's <div className="app mech-page">. The tier order is
// read off tierLegend's declaration order rather than restating the page's
// TIER_ORDER, so a new tier can't appear in one place and not the other.
function mechanicsHtml(): string {
  const legend = Object.entries(mechanics.tierLegend)
    .map(
      ([tier, blurb]) =>
        `<div class="tier-legend-item"><span class="tier-badge">${esc(tier)}</span>` +
        `<span class="muted">${esc(blurb)}</span></div>`
    )
    .join('');

  const grid = mechanics.sections
    .map(
      (s) =>
        '<article class="mech-section"><div class="mech-section-head">' +
        `<h2>${esc(s.title)}</h2><div class="mech-tiers">` +
        s.tiers
          .map((t) => `<span class="tier-badge">${esc(t)}</span>`)
          .join('') +
        `</div></div>${ul(s.bullets)}</article>`
    )
    .join('');

  return (
    '<div class="app mech-page">' +
    `<header><h1>Game mechanics</h1><p class="muted">${esc(mechanics.intro)}</p></header>` +
    `<section class="tier-legend">${legend}</section>` +
    `<section class="mech-grid">${grid}</section>` +
    '</div>'
  );
}

// Mirrors HowToPage.tsx's <div className="app howto-page">. Every optional
// section field is emitted only when present, the same way the JSX guards them.
function howtoHtml(): string {
  const grid = howto.sections
    .map((s) => {
      const items = s.items
        ? '<dl class="howto-dl">' +
          s.items
            .map(
              (it) =>
                `<div><dt>${esc(it.term)}</dt><dd>${esc(it.def)}</dd></div>`
            )
            .join('') +
          '</dl>'
        : '';
      return (
        '<article class="mech-section howto-section">' +
        `<h2>${esc(s.title)}</h2>` +
        (s.intro ? `<p class="howto-intro muted">${esc(s.intro)}</p>` : '') +
        (s.bullets ? ul(s.bullets) : '') +
        items +
        (s.outro ? `<p class="howto-outro muted">${esc(s.outro)}</p>` : '') +
        '</article>'
      );
    })
    .join('');

  return (
    '<div class="app howto-page">' +
    `<header><h1>How to use this site</h1><p class="muted">${esc(howto.intro)}</p></header>` +
    `<div class="howto-grid">${grid}</div>` +
    '</div>'
  );
}

// Keyed by TAB_META key (no leading slash) — the same key both servers already
// resolve a request to, so the lookup is a plain property read.
export function generateContentPages(): string {
  return `${JSON.stringify(
    { pages: { mechanics: mechanicsHtml(), howto: howtoHtml() } },
    null,
    2
  )}\n`;
}

function main() {
  const json = generateContentPages();
  writeFileSync(OUT, json, 'utf8');
  const pages = Object.entries(
    (JSON.parse(json) as { pages: Record<string, string> }).pages
  );
  console.log(
    `content-pages: wrote ${pages.length} pages to ${OUT} ` +
      `(${pages.map(([k, v]) => `${k} ${v.length}b`).join(', ')})`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
