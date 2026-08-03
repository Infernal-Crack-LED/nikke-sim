# SEO follow-ups — open decisions and their evidence

> **Class: CURRENT-STATE** (see [CONVENTIONS.md](CONVENTIONS.md) → Doc hygiene). Freely
> rewritten; a resolved item is DELETED here once its outcome is captured in
> [DECISIONS.md](DECISIONS.md). This holds no history.
>
> Scope: search-visibility decisions that are **deliberately deferred pending real data**,
> plus the measurements that make them decidable. Opened 2026-08-03 out of the
> character-landing-pages work ([handoffs/2026-08-02-character-landing-pages-plan.md](handoffs/2026-08-02-character-landing-pages-plan.md)).
>
> The point of this doc is that these questions are **not answerable from the repo**. They
> need a live crawl. Guessing at them costs more than waiting.

---

## 1. Thin-content policy for the low-data unit pages — OPEN

### The question

The site publishes a page for all **196** characters. Should the ones with little data be
suppressed from the index, and if so, which?

### What the risk actually is

Google does not penalise thin pages; it **declines to index them**. In Search Console the
symptoms are, under **Pages → Why pages aren't indexed**:

- **"Crawled — currently not indexed"** — seen and judged not worth indexing
- **"Discovered — currently not indexed"** — known but not yet crawled, often a crawl-budget signal
- **"Soft 404"** — the page reads as a placeholder

The cost is crawl budget, not a ranking hit: 196 URLs competing for attention can slow how
often the pages that DO deserve to rank get recrawled. **No character or word threshold is
published by Google.** Every number in this doc is a heuristic for making the call, not a
rule anyone has confirmed.

### Measured state (2026-08-03)

Crawler-visible text = the server-injected no-JS `#root` body with tags stripped — literally
what a crawler that runs no JS sees. Reproduce with:

```sh
npm run web:build && MEASURE=1 node scripts/unit-page-check.mjs
```

| Tier                                | Pages | Min   | Median    | Max   |
| ----------------------------------- | ----- | ----- | --------- | ----- |
| All                                 | 196   | 369   | **1,024** | 3,008 |
| Has an overload table               | 73    | 1,179 | 1,673     | 3,008 |
| Simulated, no overload table        | 38    | 530   | 921       | 2,024 |
| Kit + identity only (not simulated) | 85    | 369   | **616**   | 1,259 |

**No page is under 300 characters. Only 17 are under 500:**

`soldier-fa` (369) · `idoll-sun` · `soldier-eg` · `product-23` · `product-12` ·
`product-08` · `admi` · `neve` · `mica` · `idoll-flower` · `soldier-ow` · `anis` ·
`delta` · `n102` · `signal` · `rapi` · `himeno` (499)

Those are **exact slugs**, straight out of the census — several are base units whose variants
are nowhere near this list (`anis` is the RL/Iron base, not `anis-star` or
`anis-sparkling-summer`; `mica` is RL/Wind, not `mica-snow-buddy`; `rapi` is AR/Fire, not
`rapi-red-hood`; `delta` is SR/Wind, not `delta-ninja-thief`). Read them as slugs, never as
base names.

Mostly starter/NPC-tier units whose in-game kits are two short lines. Their pages are honest
and complete — there is little to say about them, which is a content-supply fact rather than
a page defect.

### What the measurement changed

The original plan proposed **gating `/unit/*` sitemap entries on `simSupported`**. The data
kills that rule: `simSupported` does not track page thinness. The unsimulated tier's median
is 616 characters and plenty of its members clear 1,000, while the genuinely thin set is 17
pages that cut across the tiers. Gating on `simSupported` would suppress ~85 pages to solve
a problem at most 17 have.

Recorded here because it is the kind of plausible-sounding rule that would have shipped
unexamined.

### Options

| #   | Option                                                                            | Trade-off                                                                                                                                         |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Do nothing** — all 196 stay indexable                                           | Cheapest. Correct if Google indexes them; the kit text IS unique and niche-unit kit searches have almost no competition.                          |
| 2   | **`noindex` a set scoped by measured length**, keep crawlable + linked            | Pages still pass link equity and still serve a human who lands on one; they stop competing for index slots. Reversible by deleting one condition. |
| 3   | **Drop from sitemap, keep indexable**                                             | Weakest. Removes the discovery hint but not the page — Google still finds them via `/characters`, so it lands near option 1 with less control.    |
| 4   | **Enrich instead of suppress** — add base stats, weapon cadence, element matchups | Turns a suppression problem into a content problem and lifts every tier, not just the thin one. Best long-term answer.                            |

### Recommendation

**Do nothing now.** Revisit with data. If a crawl does show a problem, prefer **option 2
scoped by measured length** (never by `simSupported`), with **option 4** as the real fix.

### Decision rule — apply after ~4–6 weeks of Search Console data

1. Search Console → **Pages**. Take the URL lists for "Crawled — currently not indexed" and
   "Soft 404"; cross-reference against the 17 above.
2. **Fewer than ~20 unit URLs unindexed** → do nothing. That is the normal tail for a
   catalogue this size.
3. **A large share of the unsimulated pages unindexed BUT the 73 overload-table pages
   indexed** → the thin tier is the problem. Apply option 2 with a measured-length
   condition, then re-run the census above to confirm the boundary.
4. **The overload-table pages are ALSO unindexed** → thinness is **not** the cause. Look at
   crawl budget, canonicalisation, or site-level signals before touching these pages at all.
   Acting on thin content here would be treating the wrong problem.

---

## Settled — do not re-litigate

- **Treasure units state their Treasure's release date (2026-08-03).** What looked like a
  per-unit data bug on `sugar` was the column being inconsistent about which Synergy row it
  read — the base entry for 18 of the 21 Treasure units, the `宝` entry for the other 3. The
  owner ruled the `宝` date is the right one to show (this roster carries the Treasure
  version), `src/data/sync.ts` now resolves that row itself, and the audit is re-runnable via
  `scripts/audit-release-dates.ts`. The rest of the column was audited at the same time and is
  exact. See [DECISIONS.md](DECISIONS.md).

- **Prerendering ANY route through Playwright: REJECTED (2026-08-03), and the existing pass was
  deleted.** `scripts/prerender.ts` did exactly this for `/mechanics` and `/howto` — and had never
  run in production, because it was wired into `npm run build:deploy` while `railway.json` builds
  with `bash scripts/verify.sh artifacts`. Both routes served 1 character of body text to non-JS
  crawlers until 2026-08-03. They are now request-time-injected from
  `web/public/content-pages.json` (`scripts/build-content-pages.ts`), generated from the same
  modules the React pages import. See DECISIONS.md.

- **Prerendering `/unit/*` through Playwright: REJECTED (2026-08-03).** `unitStaticHtml`
  already existed as the request-time pattern, covers every unit at no build cost, and a
  prerender pass would have duplicated it while adding minutes to every deploy. Both servers
  (`src/server/static.ts` and its hand-mirror `scripts/serve.mjs`) emit the identity row,
  the kit, the ranked overload table and the sim-status badge; `/characters` emits its full
  link list. If richer no-JS output is ever wanted, extend those functions — do not add a
  prerender pass.
- **Sitemap coverage.** `scripts/build-sitemap.ts` emits all 196 `/unit/<slug>` URLs plus
  `/characters`, and runs inside `build:deploy`; `scripts/tests/share/sitemap-drift.test.ts`
  guards it. A new character is picked up automatically on the next deploy.
- **The no-JS body must not advertise `ol-optimal.json`'s pick.** It disagrees with the
  ranking the visitor sees for most units, and indexing a different recommendation than the
  page shows is worse than indexing none. Both servers read `data/unit-pages.json`, the same
  artifact the React page uses; pinned by the serve tests.
