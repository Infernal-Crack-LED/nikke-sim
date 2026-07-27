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

**Two font-specific checks belong in this phase's deploy validation**, because Phase 2 is the first
time nikke-sim renders on Railway rather than on the owner's Mac — which is exactly the environment
difference that caused the original blank-text bug (macOS has system fonts and hides the mistake
locally; Railway Linux does not):

- Confirm the TTFs are present in the deployed artifact, not just in the repo.
- Have the build script itself render one card and assert non-zero text ink **before** writing the
  full set, so a fontless deploy fails the build instead of publishing ~200 textless images to a CDN
  under `immutable` cache headers — where they would then be near-impossible to evict.

### Phase 3 — the render API _(nikke-sim)_

Add the `/api/v1/img/*` routes. `serve.mjs` is 227 lines of hand-rolled routing; adding a request
body, query parsing, rate limiting, and a shared secret is the point where a small framework (hono)
earns its keep. Content-addressed on-disk cache for dynamic renders, LRU-evicted.

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

## 6. Open decisions for the owner

1. **Font on the _browser_ path.** The server path is settled, not a decision: bundle + register
   Roboto or render textless cards (§1a). What is open is whether the web also self-hosts Roboto
   (~300 KB for Regular, more if Medium/Bold are needed as real faces rather than synthesized) so a
   user's "Copy image" and a bot-posted PNG are pixel-identical — versus keeping the system-font stack
   in-browser and accepting that the two paths lay out text differently.
   _Recommend: bundle, subset to the Latin glyphs actually used (~40–60 KB/face)._ Note the cost is
   not only bytes: the browser path then **must** `await document.fonts.ready` before drawing, or the
   first copy-image click silently produces fallback-metric or blank text — the browser-side echo of
   the same bug.
2. **Dynamic cards to Discord:** URL-reference (fast, public, zero bytes) vs. byte-upload (private,
   ephemeral, slower)? _Recommend: URL by default, byte-upload available in the client._
3. **Cloudflare now or later?** The proxy step is ~10 minutes and free. _Recommend: now, at Phase 2._
4. **Framework at Phase 3** — grow `serve.mjs`, or adopt hono? _Recommend: hono once there are POST
   bodies and rate limits to handle._
5. **Pre-generation breadth** — head-only (~40 MB) vs. the full 600-image matrix (~120 MB)?
   _Recommend: head-only + on-demand tail._
