# Handoff — centralize infographic generation into nikke-sim + expose an image API

**Date:** 2026-07-27
**Status:** PLAN — not started, nothing enacted
**Owner ask:** move all infographic logic to one place (nikke-sim), expose an API bakery-bot
consumes, pre-generate the static images so there is no latency and no cache races, and make this
the base for an expanded infographic surface whose real payoff is the `nikkesim.app` watermark on
every image people post.

---

## 1. Where the logic actually lives today (verified 2026-07-27)

### nikke-sim — the origin

| File                                                                                        | Exports                                                                                                      | Consumer                                   |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `src/share/teamCard.ts`                                                                     | `drawTeamCard`, `drawRosterCard`, `Canvas2DLike`, `FONT`, `ELEMENT_COLORS`, `roundRect`, `PORTRAIT_CROP_TOP` | `web/src/teamShare.ts`                     |
| `src/share/dpsChart.ts`                                                                     | `drawDpsChart`, `relScore`, `CHART_W`, `chartHeight`                                                         | `web/src/shareImage.ts`, `DpsChartTab.tsx` |
| `src/share/build-code.ts`                                                                   | `encodeBuild` / `decodeBuild` (BUILD_VERSION 1)                                                              | web team/roster builder                    |
| `web/src/teamShare.ts`                                                                      | browser canvas host: portrait load → draw → clipboard                                                        | Sim tab, team + roster generators          |
| `web/src/shareImage.ts`                                                                     | browser canvas host for the DPS chart                                                                        | DPS chart tab                              |
| `scripts/build-dpschart.ts` + `build-{burstgen,burstcdr,sustain,bufferchart,ol-default}.ts` | precomputed **JSON** into `web/public/`                                                                      | web tabs + the bot                         |

### bakery-bot — a drifted fork

`apps/bot/src/lib/nikke-sim/` (1,113 lines) is a **copy** of the above plus a Node render host:

| File                     | Status                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `teamCard.ts` (430)      | fork of nikke-sim's 408-line original — **diverged** (see below)                                                  |
| `dpsChart.ts` (177)      | fork of nikke-sim's 172-line original — **diverged**                                                              |
| `build-code.ts` (122)    | fork — **already behind**: missing nikke-sim's `bossRange` field                                                  |
| `tableCard.ts` (143)     | **bot-only — no nikke-sim counterpart at all**                                                                    |
| `fonts.ts` (21)          | registers bundled Roboto with `@napi-rs/canvas`                                                                   |
| `portrait.ts` (35)       | loads from **192 duplicated `-128.webp` files, 1.7 MB**, copied by hand from `nikke-sim/web/public/img/portraits` |
| `icon.ts` (19)           | the nikkesim icon as a Discord attachment + a canvas Image                                                        |
| `warmup.ts` (78)         | boots all 192 portraits + throwaway renders at startup **purely to hide cold-render latency**                     |
| `dpschart-cache.ts` (88) | fetch `nikkesim.app/dpschart.json`, 6 h TTL, single-flight                                                        |

Consumers: `/dps`, `/teams`, `/roster`, `/ol`, `/max-ammo`, `/charge-speed` (1,122 lines of commands),
plus `@napi-rs/canvas` + `sharp` in `apps/bot/package.json`.

### The drift is already visible in the output

Not a theoretical maintenance cost — the two copies **render different images today**:

- **Font:** nikke-sim `FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"`;
  bakery-bot `FONT = "Roboto"` + `import './fonts.js'`. Different glyph metrics ⇒ different text
  widths, different truncation, different layout. **This one is not a preference — see §1a.**
- **Fields the bot added and nikke-sim never got:** `DpsChartData.icon`, `DpsChartData.footer`,
  `DpsBar.slug`, `TeamCardMeta.icon`, `TeamCardMeta.footer`. The bot draws a branded header icon;
  the web does not.
- **Field nikke-sim added and the bot never got:** `GlobalsBuild.bossRange` / `UnionBossBuild.bossRange`.
  Both copies are still `BUILD_VERSION = 1` and the field is optional, so `decodeBuild()` does **not**
  reject — it silently drops `bossRange`, and no current card renderer reads it. Nothing is broken
  today; it is a demonstration that the fork drifts silently in the direction that eventually _will_
  break, with no test that would catch it.
- `tableCard.ts` exists only in the bot, so the site cannot render the tables the bot posts.

### 1a. Fonts are a hard requirement with a SILENT failure mode

**This already happened in bakery-bot: cards rendered with no text at all, because the font was not
packaged with the render.** Railway's Linux container ships no system fonts, so `@napi-rs/canvas`
resolves the family to nothing and draws nothing. There is **no exception and no warning** — the
canvas is produced, the PNG is valid, the layout, bars, and portraits are all correct, and every
string is simply absent. That is the worst possible failure shape: it passes any "did we get a PNG?"
check and only a human looking at the image catches it.

`fonts.ts` is the fix, and it is load-bearing. The working mechanism is **three separate guarantees**,
all of which must survive the move — losing any one of them silently reproduces the blank-text bug:

| #   | Guarantee                                | Mechanism today (bakery-bot)                                                                                                                                                 |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The font files exist at runtime**      | 3 × Roboto TTF (Regular/Medium/Bold, ~920 KB total) in `apps/bot/src/assets/`                                                                                                |
| 2   | **They survive the build**               | `apps/bot/scripts/copy-assets.mjs`, run in the `build` script — `tsc` emits only JS, so without this step `dist/assets/` has no TTFs and `registerFromPath` fails at runtime |
| 3   | **Registration runs before any drawing** | a side-effect import, `import './fonts.js'` at the top of `teamCard.ts` — the single entry point; `dpsChart.ts` inherits it transitively by importing from `teamCard.ts`     |

Guarantee 3 is the fragile one, and **the `core/` + `node/` split proposed in §2 breaks it.** Once
`core/teamCard.ts` must stay DOM-free and browser-safe it can no longer `import './fonts.js'` — that
would drag `@napi-rs/canvas` into the web bundle. The ordering guarantee has to be **re-established in
`node/`**, not inherited. See §2 for how.

Two further traps worth pinning down now:

- **The registered family name must match the `FONT` constant exactly.** `theme.ts` saying `Roboto`
  while registration registered nothing (or a different name) is the same blank output.
  `GlobalFonts.registerFromPath()` returns a **boolean** — check it and throw on false. A render host
  that starts with unregistered fonts should refuse to boot, not serve blank cards.
- **Bundling Roboto on the browser path has its own version of this bug.** A `@font-face` font is not
  usable by `canvas` until it is loaded; drawing before `await document.fonts.ready` yields fallback
  metrics or blank text on the first "Copy image" click, then works on the second. If the web path
  bundles Roboto (§6.1), the `await` is mandatory and belongs in `teamShare.ts` / `shareImage.ts`.

### The cache problem, precisely

Two independent layers, and the lower one is misconfigured:

1. **`scripts/serve.mjs:183-185` sends `cache-control: public, max-age=31536000, immutable` to every
   non-`index.html` file.** Correct for Vite's content-hashed bundles. **Wrong for the unversioned
   data JSONs** — verified live: `curl -sI https://www.nikkesim.app/dpschart.json` returns
   `max-age=31536000, immutable`. Any browser, proxy, or Discord CDN is licensed to hold
   `/dpschart.json` for a **year** at a URL whose contents change every deploy.
2. **`dpschart-cache.ts` layers a 6 h in-process TTL on top of that.** So the bot's "refresh" can be
   served a year-old body, and there is no way to tell — the URL is identical either way. Cold start
   and TTL expiry also stampede (mitigated in-process by `inflight`, not across restarts/instances).

`warmup.ts` is the latency symptom of the same architecture: the bot pays a cold-render cost it only
has because it renders at all.

**Root cause of both: unversioned URLs for mutable content.** Content-addressed URLs fix it
structurally — a stale cache then yields a _valid older image_, never a torn or wrong one.

### Hosting today

`nikkesim.app` → Namecheap DNS → **Railway directly** (`37ixjmxs.up.railway.app`, `server: railway-hikari`).
**No Cloudflare, no CDN, no object storage in the path.** `scripts/serve.mjs` is a zero-dependency
`node:http` static server over `dist/`, with per-tab OG-tag injection.

---

## 2. Target architecture

The organizing split is **enumerable vs. unbounded**, because it decides pre-generate vs. render-on-demand:

| Class       | Examples                                                                                                                                         | Input space                   | Strategy                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Static**  | DPS ranking charts (90 cells × element filters), unit/character cards (192), rank boards (burstgen, burstcdr, sustain, buffer), OL default table | fully determined by the build | **pre-render at build time**, content-hashed filename, `immutable` — zero latency, zero races                          |
| **Dynamic** | team card, roster card, custom sim result, a user's synced roster                                                                                | unbounded (build code)        | **render on demand**, key the cache on a hash of the build code — content-addressed, so also `immutable` once produced |

Both classes call **the same renderer module**. That is the whole point of the move.

### Module layout in nikke-sim

```
src/infographics/
  core/                 # DOM-free drawing — the ONLY place layout lives
    canvas2d.ts         # Canvas2DLike, roundRect, PORTRAIT_CROP_TOP  (from share/teamCard.ts)
    theme.ts            # FONT, ELEMENT_COLORS, spacing, and the MANDATORY nikkesim.app watermark
    dpsChart.ts         # drawDpsChart      (merged: nikke-sim base + bot's icon/footer/slug)
    teamCard.ts         # drawTeamCard, drawRosterCard
    tableCard.ts        # drawTableCard     (MOVED IN from bakery-bot)
    unitCard.ts         # NEW — per-character card
  node/                 # Node-only render host (everything currently bot-only)
    fonts.ts            # bundled Roboto registration        (MOVED IN from bakery-bot)
    portraits.ts        # slug -> Image, from web/public/img/portraits — ONE copy, no bot mirror
    render.ts           # THE ONLY Node entry point — imports ./fonts.js FIRST (see below)
  assets/fonts/         # Roboto-{Regular,Medium,Bold}.ttf   (MOVED IN from bakery-bot, ~920 KB)
  spec.ts               # the request contract — shared by the prebuild script AND the API
src/share/build-code.ts # STAYS — a codec, not a renderer
```

`web/` keeps importing `core/` and hosting it on the browser canvas (`teamShare.ts`, `shareImage.ts`
shrink to thin hosts). `scripts/build-infographics.ts` and the API both import `node/render.ts` —
**and nothing outside `node/` may import a `core/` draw function on the server path.**

#### Preserving the font guarantees through the split

The split removes the mechanism that guarantees registration-before-draw today (§1a, guarantee 3),
so it must be rebuilt deliberately:

1. **`node/render.ts` is the single Node entry point** and is the only module that may
   `import './fonts.js'` as its first statement. `core/*` never imports `fonts.ts` — that is what
   keeps `@napi-rs/canvas` out of the web bundle. Every server-side render goes through `render.ts`,
   so no caller can reach a draw function with fonts unregistered.
2. **`fonts.ts` throws on failure.** `GlobalFonts.registerFromPath()` returns a boolean; if any of the
   three faces fails to register, throw at import. The render service then fails to boot loudly
   instead of serving a deploy's worth of textless cards.
3. **A build step copies `assets/fonts/` into the deploy output**, the nikke-sim equivalent of
   bakery-bot's `copy-assets.mjs`. Vite copies `web/public/`, not `src/` — the Node render path is
   outside Vite entirely, so the TTFs need their own copy step (or must be resolved from source via
   `import.meta.url` and included in the deploy). **This is the step most likely to be forgotten, and
   forgetting it reproduces the original blank-text bug exactly.**
4. **The golden-image test is the actual guard** (Phase 0). See §4 Phase 0 for the specific assertion —
   a byte-comparison against a committed fixture fails on blank text, which no smoke test would.

### The API contract

Spec-in, image-out, versioned path so bakery-bot can be pinned:

```
GET /api/v1/img/manifest.json                    # what exists, content hashes, absolute URLs, generatedAt
GET /api/v1/img/dps/{cell}.{hash}.png            # pre-rendered  ?element=fire&top=15
GET /api/v1/img/unit/{slug}.{hash}.png           # pre-rendered
GET /api/v1/img/rank/{board}.{hash}.png          # burstgen | burstcdr | sustain | buffer
GET /api/v1/img/team.png?b=<buildcode>           # dynamic -> 302 to /cache/team.{hash}.png
GET /api/v1/img/roster.png?b=<buildcode>         # dynamic
POST /api/v1/img/render                          # dynamic, arbitrary spec (JSON body) — future
```

Common query params: `?scale=1|2` (retina / social), `?format=png|webp`, later `?theme=`.

**`manifest.json` is what actually kills the race.** It is tiny, it is the _only_ mutable URL, and it
is served `no-cache`. Every image URL inside it already carries a content hash, so a bot holding a
stale manifest links a _valid older image_ — never a torn, missing, or mismatched one. Ship
`manifest.json` with `cache-control: no-cache`; ship everything it points at with
`public, max-age=31536000, immutable`.

**Fix `serve.mjs` in the same pass:** unversioned JSON (`/dpschart.json`, `/burstgen.json`,
`/burstcdr.json`, `/sustain.json`, `/bufferchart.json`, `/ol-default.json`) must move to
`no-cache` or gain a content hash. Today they are served `immutable` for a year, which is a live bug
independent of this project.

### What bakery-bot becomes

A thin client. Discord embeds accept a **remote URL** in `setImage()` — Discord's CDN fetches and
caches it — so for pre-generated images the bot ships **zero bytes and does zero rendering**:

```ts
const url = await nikkesim.imageUrl('dps', {
  cell: 'solo.eleweak.c100.8of12',
  element,
});
embed.setImage(url);
```

Deleted from bakery-bot: `dpsChart.ts`, `teamCard.ts`, `tableCard.ts`, `build-code.ts`, `fonts.ts`,
`portrait.ts`, `warmup.ts`, `dpschart-cache.ts`, the 192 duplicated portraits (1.7 MB), the three
bundled Roboto TTFs, and the `@napi-rs/canvas` dependency. Added: one `lib/nikkesim/client.ts`
(manifest cache + URL builders). Net ≈ −1,100 lines and −2 MB of assets.

⚠ **Discord caches by URL, hard.** Every URL the bot hands Discord must be content-versioned or
Discord serves a stale image indefinitely. The manifest's hashed paths satisfy this automatically —
but it is the single thing most likely to be got wrong, so it belongs in the client's doc comment.

**Privacy note for dynamic cards:** handing Discord a `?b=<buildcode>` URL means the build code
travels to Discord's CDN and the rendered card is publicly fetchable by anyone with the URL. Fine for
team comps (they're already shareable links). If a future infographic ever carries account-identifying
data, that one must be fetched as bytes and uploaded as an attachment instead. Both paths should exist
in the client from day one; default to URL-reference.

**Auth:** pre-generated GETs are public (they are meant to be shared). The dynamic render endpoint
takes a shared-secret header for bakery-bot plus IP rate-limiting for anonymous callers, since it is
the only compute-bearing route.

### The advertising goal has an architectural consequence

The bot fork made `footer` **overridable** — exactly the knob that erodes the watermark's value. In
the centralized renderer the `nikkesim.app` wordmark + icon are drawn by `theme.ts` as a
**non-optional** final pass. Callers may add a subtitle; they may not remove the mark.

Also worth doing while the plumbing is open: point each tab's `og:image` at the render API (with the
page's build code where there is one), so a shared _link_ previews the same card. `serve.mjs` already
injects per-tab OG tags — it is a one-line-per-tab extension.

---

## 3. Hosting recommendation

**Recommendation: keep the renderer self-hosted on Railway; put Cloudflare in front now; move the
static PNG set to Cloudflare R2 when the set gets big or egress shows up on the bill.**

### Why not render on the edge

Cloudflare Workers cannot run `@napi-rs/canvas` (native binary). Rendering there means rewriting
every renderer into Satori/JSX + `resvg-wasm` — i.e. throwing away the single-renderer property that
is the entire point of this project. **Rejected.** Same objection applies to Vercel/Netlify image
functions, which additionally add a third deploy target.

### Why not Cloudinary / imgix / a managed image service

Their pricing scales with exactly the thing you _want_ to be unbounded — public reshares of your
watermarked images. Paying per-view to advertise your own site is backwards. **Rejected.**

### The two live options

|                 | **Railway only (today + fix headers)**      | **Cloudflare in front / R2**                                                   |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| Cost            | included in the existing service            | CF proxy free; R2 $0.015/GB-mo, **$0 egress**                                  |
| Setup           | header fix only, no new infra               | orange-cloud the DNS (~10 min); R2 adds a build-time upload step + credentials |
| Edge cache      | Railway edge only                           | global, plus you keep the origin                                               |
| Deploy artifact | pre-rendered PNGs inflate every image build | images live outside the deploy                                                 |
| Social fanout   | Railway egress, uncapped                    | zero egress cost                                                               |

**Zero egress is the decisive property.** These images exist to be reposted, so the traffic profile
is deliberately outside your control. R2 is the only option in the list where a post going viral
costs nothing.

### Sizing (why the phasing matters)

The full static set is bigger than it looks: 192 unit cards + ~90 DPS cells × ~7 element variants +
rank boards ≈ **600+ images**, ~200 KB each at `scale=2` ⇒ **~120 MB baked into every Railway deploy
artifact, rebuilt on each deploy.** That is the number that forces the phase split:

- **Pre-generate the head** — the default cell, its element filters, the four rank boards, and the
  unit cards actually linked from the site ≈ **~200 images, ~40 MB**. Comfortable on Railway.
- **Render the long tail on demand**, content-address it, cache it. Same manifest, same renderer.
- Move the head to R2 once it outgrows the deploy artifact.

### Recommended sequence

1. **Now, zero cost:** pre-render the head into `dist/img/`, serve from Railway with content-hashed
   filenames + `immutable`, and fix the blanket-`immutable` bug in `serve.mjs`. This alone removes the
   bot's render latency and the stale-JSON race.
2. **Next, ~10 min, still free:** proxy `nikkesim.app` through Cloudflare (orange cloud) with a cache
   rule on `/api/v1/img/*`. No code change. Buys global edge caching and shields the dynamic render
   endpoint from repeat traffic.
3. **When warranted:** push the static set to R2 behind `img.nikkesim.app` at build time; keep the
   dynamic renderer on Railway behind the CF cache. Trigger: the pre-rendered set passes ~100 MB, or
   Railway egress becomes a visible line item.

---

## 4. Migration phases

Each phase is independently landable and leaves both repos working.

### Phase 0 — reconcile the fork _(nikke-sim; blocking)_

Nothing can be centralized while two copies disagree about what the image looks like.

- Diff both copies line-by-line; merge the bot's additions (`icon`, `footer`, `slug`, `tableCard.ts`)
  **into nikke-sim** as the surviving source.
- **Copy bakery-bot's font implementation over wholesale** — `fonts.ts`, the three Roboto TTFs, _and_
  the `copy-assets.mjs`-equivalent build step. It is proven working on Railway Linux; the blank-text
  bug is what happens without it (§1a). Do not reimplement it, and do not port `fonts.ts` without also
  porting the asset-copy step — the file alone is two of the three guarantees.
- Set `theme.ts` `FONT = 'Roboto'` (dropping the system-font stack) so the server path uses a family it
  can actually guarantee. Whether the _browser_ path also bundles Roboto is the one genuinely open
  question — §6.1.
- Add `fonts.ts` failure-throwing (check `registerFromPath`'s boolean) so a misconfigured host refuses
  to boot rather than emitting textless cards.
- Add a **golden-image regression test**: render each card type to PNG in Node, compare against a
  committed fixture. This is what stops the fork re-forming, and it makes every later phase verifiable.
  **It is also the only automated guard that catches blank text** — a PNG with no glyphs is a
  perfectly valid PNG of the right dimensions, so byte-comparison against a fixture is the test that
  fails. Add one cheap explicit assertion alongside it: measure text-region ink coverage (or
  `ctx.measureText('X').width > 0` after registration) and fail at zero, so the failure names itself
  instead of showing up as an opaque fixture mismatch.
- Reconcile `build-code.ts` (`bossRange` missing in the bot's copy — harmless today, see §1).
- **Implement row windowing on every row-based card — top 10 default, 4-above/5-below on a target
  (§6.6).** Without it the burstgen board renders all 79 rows at 1 : 4.7 and ~1 MB: an unreadable
  sliver in a Discord embed. This is a renderer design point, so it lands here rather than in the
  pre-generation phase — it applies to on-demand renders identically.
- **Pass the population `#1` dps into `drawDpsChart` explicitly** rather than inferring it from
  `bars[0]`. This is the `DpsChartData` signature change §6.6 requires so `relScore` keeps meaning
  the same thing on a windowed chart; doing it during reconciliation is far cheaper than retrofitting
  it after the bot is already consuming the API.

### Phase 1 — extract `src/infographics/` _(nikke-sim)_

Move `src/share/{teamCard,dpsChart}.ts` → `core/`, port `tableCard.ts` in, add `node/` (fonts,
portraits, render) and `assets/fonts/`. Re-point `web/src/{teamShare,shareImage}.ts`. Pure refactor —
the golden tests from Phase 0 prove no pixel moved. `src/share/build-code.ts` stays where it is.

**The font-ordering guarantee is the risk in this phase, not the file moves.** Implement §2's
"Preserving the font guarantees" list as part of the move: `node/render.ts` as the sole Node entry
point importing `./fonts.js` first, `core/*` importing it never. Add a lint rule or a unit test
asserting no `core/**` module imports `@napi-rs/canvas` or `fonts.ts` — that invariant is what keeps
both the web bundle clean _and_ the ordering guarantee honest, and it is invisible to a code review
six months from now.

### Phase 2 — build-time pre-generation _(nikke-sim)_

`scripts/build-infographics.ts` → `dist/img/**` + `manifest.json`, wired into `build:deploy`
alongside `dpschart` / `ranks:all`. Fix the `serve.mjs` cache headers here. Adds `@napi-rs/canvas` as
a nikke-sim dependency — **validate the NIXPACKS build early**, it is the one genuine deploy risk.

Scope per §6.5: **head-only, ~208 images (~25–40 MB)** — 2 headline cells × 6 element variants, 4
rank boards at top-25, 192 unit cards — with the list **derived from real link surfaces**, not
hardcoded. The tail renders on demand at Phase 3. Cloudflare goes in front here (6.3).

**Two font-specific checks belong in this phase's deploy validation**, because Phase 2 is the first
time nikke-sim renders on Railway rather than on the owner's Mac — which is exactly the environment
difference that caused the original blank-text bug (macOS has system fonts and hides the mistake
locally; Railway Linux does not):

- Confirm the TTFs are present in the deployed artifact, not just in the repo.
- Have the build script itself render one card and assert non-zero text ink **before** writing the
  full set, so a fontless deploy fails the build instead of publishing ~200 textless images to a CDN
  under `immutable` cache headers — where they would then be near-impossible to evict.

### Phase 3 — the render API _(nikke-sim)_

Add the `/api/v1/img/*` routes. Per §6.4 this phase is **a server build step plus two hand-rolled GET
routes — no framework yet**:

- **Add the server compile step** (esbuild or `tsc` → `dist/`) so `serve.mjs`'s successor can import
  `src/infographics/node/render.ts`. This is mandatory and is the actual work of the phase; it also
  puts the server on the typecheck surface for the first time (`tsconfig.json` includes only `.ts`
  today, so `serve.mjs` is checked by nothing).
- **Two GET routes**, `team.png?b=` and `roster.png?b=` — `new URL()` parsing, a build-code length
  cap + validation, content-addressed disk lookup, 302 to the hashed path. ~80–100 lines.
- **Rate limiting goes in Cloudflare, not in-process** (6.3) — it protects the origin before the
  request costs anything, and works across instances and restarts.
- Content-addressed on-disk cache for dynamic renders, LRU-evicted.

Defer hono to Phase 6, on the triggers listed in §6.4.

### Phase 4 — bakery-bot becomes a client _(bakery-bot)_

Replace `lib/nikke-sim/` with `lib/nikkesim/client.ts`; rewrite the six commands to reference URLs;
delete the fork, the portraits, `warmup.ts`, and `@napi-rs/canvas`. Keep a short-TTL manifest cache —
but now staleness is harmless by construction.

The fonts, TTFs, and `copy-assets.mjs` are **deleted from bakery-bot only after Phase 1 has them
running in nikke-sim** — they are moving, not going away.

Verified this is a clean move, not a copy: every `@napi-rs/canvas` importer in bakery-bot is either
`lib/nikke-sim/*` or one of the six nikkesim commands, so nothing else in the bot needs registered
fonts. Two things must survive the deletion, though — `apps/bot/src/lib/nikke/portrait.ts` uses
**`sharp`** (unrelated to this work, keep the dependency), and `copy-assets.mjs` also copies
`nikkesim-icon.png` and `blablalink-icon.png` for `icon.ts` / `blabla.ts`, so the script is trimmed,
not removed.

### Phase 5 — hosting _(infra)_

Cloudflare proxy, then R2 if the trigger fires. See §3.

### Phase 6 — the expanded surface _(the actual goal)_

With one renderer and one API, new infographics are additive: a "share this as an image" button on
every tab; unit comparison cards; before/after OL cards; a public builder page where anyone composes
a card from site data. Every one ships the watermark.

---

## 5. Repo constraints this plan must respect

- **Protected paths untouched.** Nothing here modifies `src/engine/**`, `data/**`,
  `src/skills/overrides/**`, or `scripts/regression-snapshot*.json`. `src/share/`, `src/infographics/`,
  `web/`, and `scripts/` are all unprotected.
- **Not a `/scientific-method` surface.** No damage-model value changes. Per CLAUDE.md the gate for
  tooling/scripts/renderers is `verify.sh` + fixtures. This _is_ a non-trivial structural change, so
  the repo's own prescribed gate is **`/logic-gate` pre-op before Phase 1**, and `/code-review` per phase.
- **`bash scripts/verify.sh` green before any push; commit freely, never push unattended.**
- **Engine-adjacent isolation rule (constraint 8):** none of this touches the engine, but the tree is
  shared — do the extraction on a dedicated worktree (`git worktree add ../nikke-sim-wt-infographics`)
  and merge back, since Phase 1 moves files the web imports.
- Cross-repo ordering: bakery-bot's Phase 4 **must** land after nikke-sim's Phase 3 is deployed, and
  the bot's current fork keeps working untouched until then — no flag-day.

---

## 6. Decisions

### 6.1–6.3 — DECIDED (owner, 2026-07-27): recommendation accepted on all three

1. **Font — bundle Roboto on the browser path too.** ⇒ Web self-hosts Roboto via `@font-face`,
   subset to the Latin glyphs actually used (~40–60 KB/face). `theme.ts` `FONT = 'Roboto'` on both
   paths, so a user's "Copy image" and a bot-posted PNG are pixel-identical.
   **Mandatory consequence:** `teamShare.ts` / `shareImage.ts` must `await document.fonts.ready`
   before drawing to canvas, or the first copy-image click silently yields fallback-metric or blank
   text (§1a). This is a Phase 1 acceptance criterion, not a nicety.
2. **Dynamic cards to Discord — URL-reference by default**, with byte-upload available in the client
   for anything account-identifying (§2).
3. **Cloudflare — proxy now, at Phase 2.** ⇒ Orange-cloud `nikkesim.app`, cache rule on
   `/api/v1/img/*`. This decision materially changes 6.4 (see below): edge caching and CF's own
   rate-limiting rules remove the two things that were going to justify a framework.

### 6.4 — Framework at Phase 3: grow `serve.mjs`, or adopt hono?

**Revised recommendation: split the question. Do the server _build step_ at Phase 3 (mandatory).
Defer hono to Phase 6 (deferrable, and 6.3 removed most of its justification).**

#### The real decision is hidden underneath, and it is not the framework

`scripts/serve.mjs` is plain `.mjs`, executed directly by node. Verified: `tsconfig.json` includes
only `src/**/*.ts`, `scripts/**/*.ts`, and `vitest.config.ts` — **`serve.mjs` is not type-checked
today, by anything.**

The dynamic render route has to call `renderTeamCard()` from `src/infographics/node/render.ts`, which
is TypeScript. A `.mjs` file run by bare node cannot import it. So Phase 3 forces one of:

- **compile the server** (esbuild or `tsc`) into `dist/` as a build step — the server joins the
  typecheck surface, which it should have been on all along; or
- **`tsx` at runtime** — adds a production dependency and startup cost, and leaves the server
  untyped. Not recommended; `tsx` is a dev tool here today.

**This build step is required whether or not hono is adopted.** It is the actual Phase 3 work. Once
it exists, adopting hono later is a small, contained change — which is exactly why it can wait.

#### What Phase 3 actually needs, and what each option costs

| Need                  | Hand-rolled on `node:http`                                                    | hono                                 |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| Route matching        | manual prefix/regex switch                                                    | typed router                         |
| Query parsing         | `new URL(req.url, base)` — already free in node                               | built-in                             |
| POST JSON body        | ~15 lines of stream accumulation **+ a size cap** (skipping the cap is a DoS) | `await c.req.json()`                 |
| Shared-secret auth    | ~5 lines                                                                      | middleware                           |
| Rate limiting         | ~40 lines (Map + periodic sweep), and **per-instance only**                   | middleware, same per-instance caveat |
| ETag / 304            | ~15 lines                                                                     | middleware                           |
| Error → status        | manual try/catch per route                                                    | built-in                             |
| Static + OG injection | **already written and working** (227 lines)                                   | keep as-is, or port it               |

#### Why 6.3 changes the answer

My original "adopt hono" rested on POST bodies and rate limiting. Decision 6.3 undercuts both:

- **Rate limiting belongs at the edge, not in-process.** A Cloudflare rate-limiting rule protects the
  origin _before_ the request costs you anything, and works across instances and restarts. In-process
  limiting on a single Railway container is strictly worse at the job — it only fires after the
  request already arrived. So the rate-limiting row above largely disappears from the origin.
- **There is no POST body at Phase 3.** With 6.2 (URL-reference) and content-addressing, the dynamic
  surface is **two GET routes with query params** — `team.png?b=` and `roster.png?b=`. `POST /render`
  with arbitrary specs is a Phase 6 item.

So Phase 3's genuine hand-rolled surface is: two routes, `new URL()` parsing, a build-code length cap

- validation, a content-addressed disk lookup, and a 302. Realistically **~80–100 lines**, not the
  200–300 I estimated when I assumed POST bodies and in-process limiting.

#### The trigger for adopting hono

Adopt it when **any** of these becomes true — don't pre-adopt:

- `POST /api/v1/img/render` with arbitrary JSON specs ships (Phase 6) — real body parsing + validation
- the route count passes ~6, or routes need shared middleware chains
- the API needs anything stateful per-request (sessions, per-user quotas, signed URLs)

At that point it is 2 dependencies (`hono` + `@hono/node-server`, both small and dependency-light),
and the build step already exists, so the migration is mechanical.

#### A third option, named for later: split the service

Keep `serve.mjs` as the static server and run the renderer as a **separate Railway service**. Not
worth it now (a second service costs money and adds CORS + a second deploy), but it is the natural
move if the renderer starts hurting the site — and there is a specific reason it might.
`@napi-rs/canvas` rendering is CPU- and memory-heavy; a burst of tail renders on a small shared
instance can starve the static file server, so **the site goes slow because someone shared a chart**.
That coupling is the real trigger to split, not route count. Worth watching once Phase 3 is live.

**⇒ Phase 3 action: add the server compile step, hand-roll the two GET routes, put rate limiting in
Cloudflare. Revisit hono at Phase 6.**

### 6.5 — Pre-generation breadth: head-only vs. the full matrix

**Recommendation stands — head-only + on-demand tail — and the real numbers make the case much
stronger than my estimate did. Two refinements: derive the head from real link surfaces rather than
hardcoding it, and cut the rank boards to a top-N (they are unusable as single images).**

#### Verified population numbers (2026-07-27)

| Quantity              | Value                                            | Source                                                                         |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Matrix cells          | **90**                                           | 5 frameworks × 2 eleadv × 3 core × 3 invest (`src/dpschart/matrix.ts:130-139`) |
| Ranked bars per chart | **21**                                           | SSS (4) + SS (17), `data/bossing-tiers.json` — **grows with the roster**       |
| Selector population   | **101**                                          | SSS–B                                                                          |
| Characters            | **192**                                          | `data/characters.json`                                                         |
| Rank board rows       | burstgen **79**, sustain **52**, burstcdr **15** | `web/public/*.json`                                                            |

Note the committed `dpschart.json` (2026-07-23) still shows 13 ranked / 40 selector — it predates the
current tiers file. **Ranked bar count is roster-driven and rising**, which matters below.

#### Size model, from a real datapoint

`web/public/og.png` is 1200×630 at 52 KB ⇒ **~0.07 bytes/px** for this project's flat design. Applying
it (portraits push it up somewhat, flat fills push it down):

| Image                           | Geometry @2×    | Est. size   |
| ------------------------------- | --------------- | ----------- |
| DPS chart, 21 bars              | 1800 × 2508     | ~230–320 KB |
| Team card, 5 units              | 2080 × 1268     | ~150–200 KB |
| **burstgen board, all 79 rows** | **1800 × 8540** | **~1 MB**   |

#### Finding: the rank boards cannot be one image

At 79 rows the burstgen board is **900 × 4270 logical px — a 1 : 4.7 aspect ratio.** Discord embeds
and Twitter cards scale that to an unreadable vertical sliver, and it is ~1 MB. This is a **renderer
design point that applies to pre-generated and on-demand equally**: rank boards need a **top-N cut
(recommend top 25, ~1 : 1.6)**, with pagination or a multi-column layout if the full board is wanted.
Fold this into Phase 0's card-type inventory. The same ceiling will eventually bite the DPS chart —
21 bars is 1 : 1.4 today and fine, but at ~40 ranked units it reaches 1 : 2.3 and needs the same cut.

#### The two sets, costed

**Full cartesian (the trap):**

- 90 cells × 6 element variants (all + 5 elements) = **540 charts** × ~270 KB ≈ **145 MB**
- 192 unit cards × ~100 KB ≈ **19 MB**
- ⇒ **~165 MB baked into every deploy artifact, rebuilt on every deploy**

**Head-only (what actually has a shareable URL):**

- 2 headline cells (eleweak + neutral @ c100/8of12) × 6 element variants = **12**
- 4 rank boards at top-25 = **4**
- 192 unit cards = **192**
- ⇒ **~208 images, ~25–40 MB**

#### Five reasons the head-only set is the right call

1. **Build time is the cost nobody budgets for.** 540 charts is 540 canvas renders + PNG encodes on
   every deploy. PNG-encoding a 4.5 Mpx image is on the order of 100–300 ms ⇒ **~2 minutes added to
   every deploy**, on a repo whose build already runs `verify.sh`. Head-only is ~30–45 s.
2. **Most of the matrix is never linked.** The DPS tab renders client-side from `dpschart.json`; it
   does not need PNGs. PNGs exist to be _shared_, and you can only share what you can link. A cell
   reachable only by fiddling the tab's selectors has no stable public URL until someone clicks
   "share this view" — which is precisely the on-demand case.
3. **Element-filtered charts are thin.** With 21 ranked units, a Fire filter yields ~4 bars.
   Pre-rendering 540 mostly-tiny charts spends the whole budget on the least valuable images. They
   remain perfectly legitimate _on demand_.
4. **Invalidation churn.** Content-hashed names mean every deploy's regenerated set is a new set;
   old objects linger until swept. Smaller head ⇒ less churn, cheaper sweeps, smaller R2 bill later.
5. **The tail is self-warming and self-measuring.** First request renders (~200–400 ms once), writes
   to the content-addressed cache, and Cloudflare (6.3) holds it at edge thereafter. Popular cells
   converge into the cache on their own — the real head gets **discovered rather than guessed**.

The one argument for full pre-generation is guaranteed zero cold-render on every possible URL. With
6.3 in place that reduces to a one-time ~300 ms for one user on an unpopular cell. Not worth 165 MB
and two minutes a deploy.

#### Refinement: derive the head, don't hardcode it

Make the pre-generation list **data-driven** — the union of:

- every URL the site's own share buttons can emit,
- every URL the bot's command surface can reference (the `/dps` default + element choices),
- anything flagged `featured` in the manifest.

Then "what's in the head" tracks real link surfaces automatically instead of drifting from a
hardcoded list. **Close the loop at Phase 5:** Umami is already wired into `serve.mjs` — log tail
renders and promote the top N into the head on each deploy.

**⇒ Phase 2 action: head-only (~208 images), derived from link surfaces, rank boards windowed per
§6.6. Measure one real render early and replace the ~0.07 B/px estimate above with the actual figure.**

### 6.6 — Row windowing: top 10 default, ±window on a target (DECIDED, owner 2026-07-27)

Supersedes the "top-25" placeholder in §6.5. Applies to **every row-based card** — the DPS chart and
all four rank boards — on both the pre-generated and on-demand paths.

**Rule:** default to the **top 10**. When a caller requests a specific unit, return a 10-row window
centred on it: **4 above, the target, 5 below.**

#### Exact windowing, including the clamps

With `n` rows and the target at 0-indexed `i`:

```
start = min( max(i - 4, 0), max(0, n - 10) )
end   = min(start + 10, n)
```

Behaviour at the edges, which the rule as stated does not cover and the implementation must:

| Case                                  | Window      | Target lands at                            |
| ------------------------------------- | ----------- | ------------------------------------------ |
| `n ≤ 10`                              | all rows    | its natural position                       |
| target rank ≤ 5                       | ranks 1–10  | its natural position (no room for 4 above) |
| target mid-board (e.g. rank 34 of 79) | ranks 30–39 | 5th row — 4 above, 5 below ✓               |
| target rank ≥ n−4 (e.g. 78 of 79)     | ranks 70–79 | shifted down (no room for 5 below)         |

The 4-above/5-below asymmetry is deliberate: it biases toward showing **who you can still catch**,
which is the more actionable direction for a player.

#### ⚠ Windowing silently breaks `relScore` — decide this explicitly

`relScore(dps, top)` is currently computed against `maxDps`, **the top bar of the rendered set**
(`src/share/dpsChart.ts:19-20` — "against the chart's #1… the #1 is 1.000"). That identity holds only
because the chart has always started at rank 1. **On a window starting at rank 30, `maxDps` becomes
rank 30's dps, so rank 30 renders as `1.000`** — a number that means something entirely different
from the `1.000` on the top-10 chart, with nothing in the image saying so.

That directly attacks the goal of these images: two shared screenshots of the same unit would show
different scores depending on which window they came from. Resolution:

- **The label is always normalized against the population #1**, never the window max. The number must
  mean the same thing in every image, or it is worse than no number.
- **Bar length scales to the window max**, so a deep window is still readable rather than a row of
  stubs.
- **Every row shows its absolute rank number**, which is what makes the two decisions above
  unambiguous rather than contradictory (a full-length bar labelled `0.742` reads correctly once the
  row says `#30`).
- **The header states the window** — e.g. `ranks 30–39 of 79`.

`drawDpsChart` therefore needs the population `#1` dps passed in explicitly, not inferred from
`bars[0]`. That is a **signature change to `DpsChartData`, so it belongs in Phase 0** with the rest of
the reconciliation, not bolted on later.

#### Consequences elsewhere

- **`DpsCompare` is largely superseded.** The existing bottom-annotation row (`name · rank N / M ·
score`, `COMPARE_H = 52`) exists to answer "where does my unit sit" — the window answers it better,
  in context, with real bars. Keep the field for a caller that wants top-10 _plus_ an out-of-window
  annotation, but the bot's `/nikke <unit>` should use the window.
- **Sizing improves, and the aspect ratio becomes good for social.** A 10-row chart is
  `118 + 10×52 + 44 = 682` px tall at 900 wide — **1.32 : 1**, which sits well in a Discord embed and
  a Twitter card. At 2× that is 1800 × 1364 ≈ 2.45 Mpx ⇒ **~170 KB**, down from the ~230–320 KB
  estimated for a 21-bar chart. The 1 : 4.7 / ~1 MB burstgen problem disappears entirely: no board
  ever renders all 79 rows as one image.
- **The §6.5 head-set arithmetic gets cheaper**, and the per-unit windows stay on-demand. Pre-
  generating a window for every unit would be 101 selector units × 2 headline cells = **202 extra
  images (~34 MB)**, roughly doubling the head for images that are inherently parameterized and
  self-warming. Leave them to the tail and let the Umami promotion loop (§6.5) pull the popular ones
  into the head.
