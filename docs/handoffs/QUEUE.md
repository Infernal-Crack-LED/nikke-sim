# QUEUE.md — live action items (session state, AI-facing)

> Moved out of `CLAUDE.md` 2026-07-26 (owner ruling: the work queue is session state, not an
> instruction file — `CLAUDE.md` keeps durable rules + verified facts only). Every live/deferred
> TODO or "next steps" list MUST live HERE — chat is ephemeral, only files carry across sessions.
> Landed current state → `docs/STATE.md`; research threads → `docs/open-questions.md`; settled WHY
> → `docs/DECISIONS.md`; the actionable **live TODO → here**.
>
> **Hygiene (the `.claude/hooks/commit-state-hygiene.sh` nudge fires once per session on commit):**
> items below carry ONLY genuinely-open action items as short pointers into their handoff/plan docs
> — no landed-work narration (landed state → `docs/STATE.md`; settled WHY → `docs/DECISIONS.md`).
> When an item lands, DELETE it here (keep only its open follow-up clause); a done handoff →
> `CLOSED (date)` marker + `mv` into `docs/handoffs/closed/`; a fully-landed top-level `docs/*.md`
> (never a living log) → same into `docs/closed/`; a resolved question → close it in
> `docs/open-questions.md` (single U-numbering — move it to `docs/answered-questions.md` with the
> answer inline, no new A-number).

**PHASE: industrialize the accuracy sweep** — every owned unit within ±3% (multi-run avg) at n≥5,
fewest videos. Master plan: `docs/handoffs/2026-07-16-full-sweep-plan.md`. Dashboard:
`npx tsx scripts/board-read.ts`. **Submission intake: 0 pending** (Nikke Sim Data Submission Google
Form → `/submission-intake` → `/probe-processing` → hand-tune; this line is the tracked count).

### 🤖 AUTONOMOUS WORK QUEUE — read this INSTEAD of the pointer list below if unattended

> **Why this exists (2026-07-25).** The pointer list below is an excellent _attended_ handoff and a poor
> _autonomous_ task list: ~15 threads, most gated on recordings the run cannot obtain, owner rulings it
> cannot get. An unattended session reading it finds no unambiguous
> next action and wanders — burning a night for near-zero landed output. This queue is the opposite: a
> short, ordered list where every item is **(a) unblocked, (b) verifiable by
> a script that already exists.** Owner maintains it; keep it SHORT (≤5) and delete items as they land.
>
> **Rules for an unattended run:**
>
> 1. **Take the topmost unblocked item and finish it.** Do not survey the whole list, do not re-plan the
>    phase, do not "improve" an area you were not sent to.
> 2. **Land in committed slices.** A slice = a coherent change + its gate green (`bash scripts/verify.sh`
>    or `npx vitest run`) + a commit whose message names the premise it rests on and how it was verified.
>    Committing is encouraged and cheap (constraint 2); pushing stays owner-gated. The autonomous
>    blast-radius cap enforces this mechanically at 300 uncommitted lines.
> 3. **PRODUCTIVITY STOP.** Every ~45 min, ask: _what have I committed with a green gate?_ Two consecutive
>    checkpoints with no commit ⇒ **STOP the thread**, write findings to a handoff doc, and either move to
>    the next queue item or end the run. A night that produces one honest committed slice plus a clear
>    handoff beats a night of exploration with nothing landed.
> 4. **Reuse before you derive** (the SUFFICIENCY rule) — search for an existing labeled set before
>    generating ground truth. An unattended run is exactly where the 5-hour re-derivation happens.
> 5. **One unvalidated fact is not a mandate.** If a finding implies a broad rewrite, that is a STOP-and-
>    propose, not a green light: write the proposal, commit it, continue. Sweeps are FINDINGS-ONLY.

**QUEUE (owner-maintained; empty = do a survey pass and propose, do not invent work):**

1. _(empty — owner fills)_

### Open action items (pointers — attended sessions)

- **⇒ 🟡 UNIT-CARD INFOGRAPHIC — BUILT + POLISHED, WAITING ON DEPLOY.**
  Branch `unit-card-infographic`, worktree `../nikke-sim-wt-unitcard`, + bakery-bot `main`.
  `verify.sh` + `web:build` + `web-smoke` green, NOTHING PUSHED. Plan +
  landed-state: `docs/handoffs/2026-07-28-unit-card-infographic-plan.md`.
  Preview any slug in both shapes with `npx tsx scripts/render-unit-card.ts <slug>`.
  The owner's polish pass ran 2026-07-28 and settled every parked tunable (layout consts, the
  Λ glyph, the icon set, the zero-value rule, the empty-plate question) — see the three
  `feat(infographics)` / `feat(icons)` commits on the branch. What is left:
  1. **Not deployed.** The bakery-bot `/nikke` change reads the manifest from the LIVE site, so
     the cards only appear once nikke-sim deploys; until then `/nikke` keeps its existing embed
     (that fallback is tested).
  2. **Bot side NOT started** — `/nikke` must show a "not sim supported" line when a unit is in
     the manifest's new `notSimSupported` list (27 units with no card ON PURPOSE), and must NOT
     show it for a transient miss (outage / newly-synced unit). Spec, contract and test list:
     bakery-bot `docs/handoffs/2026-07-28-nikke-unit-card-not-supported.md`. Safe to ship
     before the nikke-sim deploy — an older manifest has no such field and every lookup
     answers false.
  3. **No vector source for burst any more.** The burst/class icons were replaced site-wide with
     the owner's higher-res set (old `burst_*.svg`/`.png` + 25×25 `class_*` deleted). Burst is
     now RASTER everywhere, ~100px native — fine at every size either surface draws today, but
     a future surface wanting it large has nothing to rasterize from.

- **⇒ 🔵 EVERY SIM-SUPPORTED B3 SHOULD BE ON THE DPS CHARTS.** 7 of them are not:
  `2b`, `a2`, `phantom`, `red-hood`, `rei-ayanami`, `rei-ayanami-tentative-name`, `sugar`.
  A B3/Λ unit's whole card is its two DPS charts, so an absent one renders two large "Not
  ranked on this board" plates — those 7 are the only sim-supported units with no bar chart at
  all (of 90). Not researched; no handoff written.
  - **Ruling (owner, 2026-07-28): no second-class fallback layout.** A B3/Λ unit that is NOT
    sim-supported simply gets NO CARD (`scripts/build-infographics.ts` `unitJobs`) — 27 units,
    54 images. The 7 above keep their cards because their emptiness is a DATA gap this item
    closes, not a permanent state. B1/B2 units are unaffected either way: buffer / sustain /
    burst-CDR rank unsupported units too.

- **⇒ 🔴 SHAREABLE SAVED CONFIGS — BUILT, NEEDS TWO OWNER GATES BEFORE IT WORKS IN PROD.**
  Branch `infographics-card-fixes`, worktree `../nikke-sim-wt-cardfix` (`f025cc8`) + bakery-bot
  `main` (`f2f9af1`), `verify.sh` + `web:build` + `web-smoke` green, NOTHING PUSHED. The three
  owner questions were answered 2026-07-28 — **(1a)** the numbers are a browser-computed
  SNAPSHOT stored with the config (no engine in `dist-server`), **(2a)** the id lives in
  bakery-bot `user_profiles` behind a kind-allowlisted public read, **(3)** `POST /render`
  returns `{url, imageUrl, pageUrl}` — and all four asks are implemented. What is left is
  deployment and two things only the owner can decide:
  1. **GATE — deploy order.** The bakery-bot public read (`GET /api/profiles/:id/public`) must be
     live BEFORE any `?id=` link is minted, or every shared link 404s. It is an additive route,
     no schema change, so it can ship independently and ahead of the sim.
  2. **GATE — the 100-profiles-per-kind cap.** `POST /api/profiles` refuses a genuinely new name
     past 100 rows per (user, kind). Shares are named by a content hash, so re-sharing an
     unchanged config is idempotent and costs nothing, but a user who shares 100 DISTINCT configs
     hits `limit_reached` and silently falls back to the long `?b=` link. Options: raise the cap
     for the share kind, evict oldest, or accept the fallback. **Accepted for now** — nothing
     breaks, links just get long again.
  - **Tell the bot:** `POST /api/v1/img/render` now answers `{url, imageUrl, pageUrl}`; `url`
    is an alias of `imageUrl` so nothing existing breaks, and `pageUrl` is present only for a
    request that named a config id. `{id}` alone is accepted (kind inferred from the config), as
    is `{kind, id}` (mismatched kind → 400).
  - **Known limit, unchanged from the earlier integration report:** a `characters.json` change (a
    unit rename) moves pixels without moving the cache hash. The key covers renderer changes, not
    data changes; if it bites, add a data stamp to the key.
  - **Follow-up worth doing:** `NIKKESIM_CONFIG_API` / `NIKKESIM_SITE_ORIGIN` default to the prod
    bakery-bot origin and `https://nikkesim.app`. Set them explicitly in Railway rather than
    relying on the defaults baked into `src/server/config-store.ts`.
  - **Cross-family code review (kimi-code/k3) ran on the branch: round 1 FIX-BEFORE-MERGE → all
    four findings fixed (`b86e42f`) → round 2 CLEAN.** Packets + result JSONs in
    `scratchpad/gates/2026-07-28-shared-configs/`. The FIX was real and is the one worth
    remembering: `shareName` hashed the ENCODED payload, which carries a click-time `at`, so
    every press minted a new profile row — the code carried a comment promising precisely the
    idempotency it did not deliver. Split into `sharedConfigIdentity` (name from this) vs the
    stored payload; the same root also fed the render cache key, now normalized through the
    shared `simmedDay`. Round 2's two NOTEs (orphaned old-shape cache entries; pre-fix share rows
    surviving against the cap) are both **empirically empty** — this branch has never been pushed
    or deployed, so no `sim-share` row and no with-results cache entry has ever existed. Nothing
    to migrate; do NOT file migration work for them.

  **Other decisions already made, don't relitigate:** the composition card keeps the boss/level/
  core line (a SELECTION, not a metric); a card renders the FULL `drawTeamCard` layout only when
  the request carries a results snapshot, the composition card otherwise; `RENDERER_VERSION` is
  `v2` and must be bumped by any further renderer change (the shared-config work deliberately did
  NOT bump it — results are APPENDED to the cache key, so every existing no-results key is
  byte-identical and nothing on disk was orphaned).

- **⇒ BAKERY-BOT INTEGRATION REPORT (2026-07-28) — BOTH ITEMS ANSWERED on branch
  `infographics-card-fixes`.** (1) _"the cache hash is derived from the request, not the output"_ —
  half already handled, half was real. `specCacheKey` has ALWAYS carried `RENDERER_VERSION`
  (`src/infographics/spec.ts`), which is exactly the "version stamp" the report asks for, and it is
  now `v2`; the real defect was hashing the RAW build code, so `blocked` (and every other field no
  pixel depends on) forked the content address — fixed by hashing a render-relevant PROJECTION of
  the decoded build (`renderRelevantBuild`), pinned BOTH ways against the actual renderers in
  `scripts/tests/share/build-render-key.test.ts` (dropped field ⇒ byte-identical PNG; drawn field
  ⇒ different PNG). (2) _URL length_ — no new addressing mode was needed: the short
  `/api/v1/img/cache/<type>.<hash>.png` (~45 chars) is already what the 302's `location` header
  carries and what `POST /api/v1/img/render` returns as `{url}`, so the bot can embed that instead
  of uploading bytes. What was MISSING is what made it unsafe: the PNG cache is byte-bounded
  (200 MB ≈ 570 cards) with LRU eviction, so an embedded cache URL would eventually 404 an old
  Discord post. `src/server/spec-store.ts` now remembers each cache filename's spec in a sidecar,
  and a miss RE-RENDERS through the same parse→resolve pipe (refusing any sidecar that resolves to
  a different hash) — the short URL is now as durable as the long one. **Still open / to tell the
  bot:** a `characters.json` change (a unit rename) moves pixels without moving the hash — the key
  covers renderer changes, not data changes; if that bites, add a data stamp to the key.
- **⇒ POST-MERGE CODE REVIEW OF PR #33 (`9526dad`) — 2 FIXES LANDED on branch
  `infographics-card-fixes`, 4 FOLLOW-UPS OPEN.** The review ran after the merge (owner ask).
  No blockers; the two FIX-level defects are fixed on that branch (worktree
  `../nikke-sim-wt-cardfix`, unpushed, `verify.sh` green): (a) `buildChargeTable` hardcoded the
  22f release latency, so every AUTOFIRE charge unit (anis-star, cinderella, liberalio,
  neon-vision-eye, vesti-tactical-upgrade — datamined `input_type: 'DOWN_Charge'`) published a
  shots-per-Full-Burst ~25–30% below the site's own /charge panel, on the tab share button, the
  /builder card AND the hosted `table/charge-speed?unit=` route; (b) `drawTableCard` distributed
  width evenly with no truncation, so the 6–7-column resources card overdrew its neighbouring
  column. Also landed there: the owner's bar-label style ruling (a bar track never clips a NIKKE
  name — `canvas2d.ts` `barTrackX`/`fitText`, applied to `dpsChart.ts` + `teamCard.ts`) and
  `RENDERER_VERSION` → `v2` (the renderers changed, so v1 cache files must age out). **Open
  follow-ups, none blocking a deploy:**
  1. **Memoized REJECTED promises** — `BuilderPage.loadImgManifest` and
     `tableShare.loadOlDefaultTable` cache the promise including its rejection, so one transient
     fetch failure permanently breaks "Get hosted URL" / the OL share until a page reload. Clear
     the memo in a `.catch` that rethrows.
  2. **No in-process render concurrency cap** — `api.ts ensureCached` single-flights identical
     specs only; N distinct concurrent specs run N renders, each up to `MAX_CANVAS_PIXELS`
     (12M px ≈ 48 MB RGBA) on one instance, with the routes anonymous by design. A 4–8 slot
     semaphore turns a burst into latency instead of RSS. Do this before bakery-bot points
     production traffic at `POST /render`.
  3. **Breakpoint-panel tier vs card tier** — the /charge panel computes rows at the selected OL
     tier (`olTierValues(bpTier)`), the share card always renders the T11 constants. Self-
     consistent (the subtitle names T11) but it disagrees with the table it was copied from at
     any other tier: pass the tier's per-line value into `buildAmmoTable`/`buildChargeTable`.
  4. **▲ renders as tofu in every NODE card** — Roboto has no U+25B2 and the Node font stack has
     no fallback face, so the advantaged-element marker is a □ box on the pre-rendered images
     (the browser falls back per-glyph, so the site is fine). Pre-existing, cosmetic, visible on
     every DPS/team card: either register a fallback face for the Node renderer or swap the
     marker for a Roboto-covered glyph.

- **⇒ INFOGRAPHIC CENTRALIZATION + IMAGE API — PHASES 0–3 LANDED (PR #32), PHASE 6 LANDED on
  branch `infographics-phase6` (unpushed), PHASE 4 PR-READY on bakery-bot branch
  `infographics-centralization` (worktree `../bakery-bot-wt-infographics`, unpushed) →
  `docs/handoffs/2026-07-27-infographics-centralization-plan.md`.** One renderer
  (`src/infographics/{core,node}`) now serves the web tabs, the build-time pre-rendered head
  (208+ images + manifest.json), and the `/api/v1/img/*` routes. **Phase 6 landed 2026-07-28:**
  share-image buttons on every remaining tab (ranks, charge, overload, olsim, doll, resources —
  `web/src/tableShare.ts` host + core `rankTables.ts` builders + tableCard `rowColors`), olsim
  before/after OL card, unit-comparison cards (RenderSpec `units[]`, `dps.png?units=a,b,c`,
  DPS Rankings "Compare units…" picker), and the `/builder` public card-builder page (client-side
  preview + manifest URL / POST `/api/v1/img/render` for a hosted link). **Phase 4 (bakery-bot thin
  client) is code-complete but MUST NOT merge/deploy until the new server is live in prod** — the
  six commands now `setImage()` nikkesim.app URLs (manifest-hashed or 302→content-addressed), the
  1,113-line fork + 192 portraits + Roboto TTFs + `@napi-rs/canvas` are deleted (−2 MB), `sharp`
  stays for `/nikke`. **Remaining owner gates, in order:** (1) merge/push `infographics-phase6`
  (this branch also contains the hono server — first deploy runs the new build); (2) flip
  `railway.json` startCommand `npm run start` → `npm run start:server` and deploy — `/api/v1/img/*`
  is dark until this happens (item (1) of the follow-ups bullet below); (3) add the Cloudflare
  rate-limit rule on `POST /api/v1/img/render` (rate limiting lives at the edge by decision 6.3);
  (4) merge/deploy bakery-bot `infographics-centralization`; (5) R2 for the static set only once
  it outgrows the deploy artifact or Railway egress becomes visible. Historical plan detail
  (fork drift, §1a font guarantees, §6 decisions, §6.6 windowing math) is in the plan doc.

- **⇒ INFOGRAPHIC PHASE-3 REVIEW FOLLOW-UPS (branch `infographics-centralization`; three opus
  cross-family review rounds 2026-07-27 — blocker + fixes landed, packets under the gitignored
  `scratchpad/gates/`):** (1) **startCommand flip is
  owner-gated** — `railway.json` still starts `scripts/serve.mjs`, so `/api/v1/img/*` is dark in prod
  until the owner flips to `npm run start:server` (dist-server/ now builds in the `verify.sh deploy`
  tier).
  **LANDED 2026-07-28 on branch `infographics-phase6`:** (2) API surface gaps — on-demand
  `/api/v1/img/dps.png?cell&element&unit`, `/api/v1/img/table/{max-ammo,charge-speed}.png`, and the
  static `table/{ol,charge-speed}.png` pre-renders (shared `src/infographics/core/tableData.ts`);
  (3) compiled-bundle boot test (`scripts/tests/share/serve-bundle.test.ts`); (5) ink-region
  geometry dedupe (core cards export `*_TITLE_ICON` / `*_TITLE_INK_REGION`); (6) RenderCache
  in-memory byte tracking (readdir only across the cap / on boot); (8) portrait LRU keyed on
  dir+slug; (9) poison-restore in a `finally`; (10) 304 last-modified symmetry + wrong-etag
  body assertions; (4) golden drift off-Mac — decoded-pixel compare (sharp RGBA, ≥99.9% of
  pixels within channel delta 2, exact dimensions) now runs on EVERY platform; byte-exact sha256
  stays as a stronger darwin-arm64 gate; (7a) Matrix-tab portrait share card made deliberate —
  draw-call-level test of the `hasPortraits`/`labelW=210` branch in `windowed-render.test.ts` +
  a `dpsChart.ts` module-header note; (7b) reproducible woff2 subsets — `npm run fonts:subsets`
  (`scripts/subset-fonts.ts`) rebuilds them from the TTFs + a checked-in glyph manifest
  (`src/infographics/assets/fonts/subset-ranges.json`), and `@font-face` now declares the matching
  `unicode-range` so out-of-subset glyphs fall through the stack.

- **⇒ LANDED 2026-07-28 (branch `infographics-phase6`): hono migration + `POST /api/v1/img/render`
  — the §6.4 trigger fired (owner-approved).** `src/server/` now builds a Hono app (`hono` +
  `@hono/node-server`, bundled into dist-server) served over node:http via `getRequestListener`;
  the behavior contract is unchanged (serve-api/serve-bundle pass, serve-headers untouched against
  the old serve.mjs, static handler kept hand-rolled for exact ETag/304/OG parity). New
  `src/infographics/spec.ts` is the shared request contract — `RenderSpec` union, `parseRenderSpec`,
  `specCacheKey` (the `v1|...` key strings are pinned byte-for-byte in
  `scripts/tests/share/render-spec.test.ts`; drift orphans every cached render) — used by BOTH the
  GET query routes and POST /render, so the two can never drift (parity asserted in
  `serve-render.test.ts`). POST answers 200 `{"url":"/api/v1/img/cache/<file>"}`; guards: 16 KB
  body cap → 413 (content-length AND stream), 415 non-JSON, 400 bad JSON/spec; rate limiting stays
  at Cloudflare, `REQUIRE_RENDER_SECRET` (env-off) gates it when flipped. **Still owner-gated:**
  the `railway.json` startCommand flip (item (1) above) — POST /render is dark in prod until then.

- **⇒ FOCUS CHARGE-GAUGE BONUS IS PER-UNIT, NOT FLAT 2.5× — own PR, NOT ENACTED →
  `docs/handoffs/2026-07-27-focus-charge-gauge-per-unit.md`.** The camera-focus charge bonus is
  hardcoded `FOCUS_CHARGE_GEN = 2.5` (`src/engine/sim.ts:1257`) and ignores the datamined
  `full_charge_burst_energy` column (`fullChargeBonus` in `data/gauge-per-shot.json`), which equals
  `chargeMultiplier` for every unit and IS the focus multiplier ×100 (measured anchor: takina/maiden
  250 → focused base×2.5; additive reading ruled out by TB3 A1/A2). Four units deviate from 250:
  **alice 350 → 3.5× (currently 40% under-credited)**, cinderella + vesti-tactical-upgrade 200 → 2.0×,
  scarlet-black-shadow 150 → 1.5×. Burst-gen board UNAFFECTED (measured unfocused as of 2026-07-27);
  only focused sim fights move (DPS chart / probes / team sim). **Gated:** `/scientific-method`
  (engine default change) + the four non-250 values are datamine-derived not recorded → owner picks
  measure-`alice`-first vs land-as-⚑-hypothesis; overturns the 2026-07-13 "full_charge_burst_energy
  unused" ruling (needs DECISIONS entry + `burst-gauge.md` §4 rewrite).

- **⇒ RL3-VS-BOARD OUTLIER GAUGE INVESTIGATION — findings-only, NOT ENACTED →
  `docs/handoffs/2026-07-27-rl3-rank-outlier-gauge-investigation.md`.** Triage the 53 `|Δrank| ≥ 10`
  outliers in `docs/rl3-burstgen-rank-comparison.md` (regenerate: `npx tsx scripts/rl3-burstgen-compare.ts`)
  into legitimate kit/rotation effect vs comparison artifact vs modeling gap. Seeded clusters: **(A)** the
  RL clip-reload family (arcana/anchor/diesel/mint/ada) sits at the sim board's BOTTOM (1.65–2.2%/s,
  Δ≈−61..−70) — possible RL cadence datamine gap vs the rl3 4-shot-opener artifact; **(B)** SG units
  under-generate in sim (landing-fraction `sgGaugeFrac` × the no-op range script; overlaps the SG-landing
  geometry thread); **(C)** catalogued unmodeled skill-gen (anis-star battery+aura, ein orb, trina/laplace
  battle-start fill — `burst-gauge.md` §2); **(D)** sim-over-performers with real kit gauge (bready DoT,
  red-hood, neon — mostly legitimate). flora/rosanna/sugar already resolved 2026-07-27. Findings-only;
  per-unit enactments gated via `/kit-tdd` / `/scientific-method`.

- **⇒ PROBE READER BUILD-OUT — P0/P1/P2/P4 BUILT 2026-07-24 on branch `probe-readers`, AWAITING
  OWNER MERGE** (DECISIONS 2026-07-24; validation record `docs/probe-runs.md`; instrument registry
  `docs/STATE.md` §7; plan `docs/handoffs/2026-07-24-probe-reader-buildout-plan.md`).
  `scripts/probe/scan.ts` + `scan-frames.py` (deterministic CV, no model) is now the FB-count
  instrument — **exact on 8 recordings** with independently measured counts, every burst
  corroborated by a 2nd detector; `read-burst-gauge.ts` gained `--classifier cv|vlm` (cv default)
  - `--t0`; `read-ammo.ts` + `count-pellets.py --ammo-digits` + `ammo-atlas/` close the cadence hand
    read (SMG 20.3/s in two bands); `read-battle-records.ts` reads the end-of-fight screen with an
    arithmetic checksum (37/37 exact); `read-popups-vlm.ts` scores popup confidence; `hit-values.ts`
    moved onto a shared `hit-bands.ts`.
    **Open tail, all small:** (a) `read-popups-vlm.ts`'s **auto-accept path is UNEXERCISED** — 0 of 30
    popups auto-accepted on the one hand-read probe because `little-mermaid`'s bands overlap; it stays
    unproven until a CLEAN-band focus unit trips it, and that first firing should be checked against a
    hand read → **open-questions U36** (opened 2026-07-24, carries the how-to). (b) `read-ammo.ts` cannot yet read a **small-magazine SG** counter (~29% of frames on
    `marciana-solo`, 1–2 digits, weak template lock) — SG cadence still goes via the pellet counter;
    ⇒ this also means **U34** (Max-Ammo ▲-expiry belt clip) is answerable for SMG/AR/MG but not SG.
    (c) **P3** was never a build — it is the `read-pellets.ts` validation obligation, still filed
    into **U35**. ⚠ Re-running a VLM reader is NOT a confirmation route: two runs over the same video
    agreed 100% (190/190) — the decoder is deterministic, so it repeats its own mistakes. Cross-checks
    must be method-diverse.
    **⚠⚠ SCOPE OF THAT WARNING (added 2026-07-25 after it was misapplied at ~5h cost): it governs
    CONFIRMING A MEASURED VALUE — "is this popup really 7694?" — where a second run of the same decoder
    adds nothing. It does NOT govern VALIDATING OR REVIEWING A READER.** For reader/tooling work the
    instrument is the **existing labeled set** — run the script over it and report the score/confusion
    matrix. Those labels were produced independently of the reader, so that IS a method-diverse check and
    it is the CORRECT and SUFFICIENT one. Hand-reading frames to re-derive labels the repo already holds
    is the failure mode, not the rigorous option. See the SUFFICIENCY rule in Discipline forcing-functions.

- **⇒ BASE-WEAPON FAITHFULNESS TEST — sim side LANDED 2026-07-23, RECORDINGS OPEN →
  `docs/data/clean-weapons.md`** (ruling + rationale in DECISIONS 2026-07-23). The six clean-weapon
  units (kits contribute zero damage) are now runnable and pinned:
  `scripts/tests/units/clean-weapons.test.ts` (25 assertions) + `bareWeaponComp`/`bareWeaponOverride`
  in `scripts/tests/lib/harness.ts`. Basis: scope lock, boss **Iron** (only neutral-for-all element),
  core 100, bursting OFF via the new `cfg.disableBursts` engine flag (default-off, byte-identical
  unset), two teams of three — **A** `folkwang`/`marciana`/`snow-crane`, **B**
  `emma`/`claire`/`idoll-ocean`. ⚠ **RARITY CEILINGS ARE LOAD-BEARING for the recordings:**
  `idoll-ocean` must be 0★/core 0 and `claire` 2★/core 0 (they are not SSR and cannot reach scope
  lock's 3★/core 7; uncapped they over-read 15.5% / 12.6%). `idoll-ocean` has no viable SMG
  replacement (`rei` is clean but unowned; `mica-snow-buddy` carries Max Ammunition Capacity ▲).
  **FIRST SCORING LANDED 2026-07-23** (recordings `docs/probes/clean-weapons/`, full table +
  reasoning in `docs/probe-runs.md`): **3/6 inside ±3%** — `snow-crane` SR 0.986, `emma` MG 0.977,
  `claire` RL 1.024; `folkwang` AR 0.956 marginal. **Two big outliers, both localized to the WEAPON
  MODEL** (these units have no override and no damage kit, so neither can be calibration debt):
  **`marciana` SG 0.843 COLD** and **`idoll-ocean` SMG 1.166 HOT**. NOT ENACTED (n=1/unit).
  ⇒ The `claire`→`noah` RL swap is no longer worth taking (she reads 1.024; swapping would move the
  neutral element Iron→Water and re-pin all six for no gain).
  Score it any time with **`npx tsx scripts/clean-weapons-read.ts`** (`SMGQUANT=1` for the measured
  cadence); real totals in `docs/probe-data/clean-weapons-readings.json` — append a run and it
  re-averages. Board 2026-07-23 (3 recordings): **3/6 within ±3%**, **4/6** under `SMGQUANT=1`;
  repeatability ±0.2–0.8% where n=2.
  **SMG SIDE IS DONE** — `/probe-processing` on `emma-claire-idollocean.MP4` root-caused it to the
  20-vs-24 rounds/s cadence (see the P0 gated-flip item above).
  **Two small residuals now filed:** `folkwang` AR **0.963 COLD at n=2**, spread only ±0.8% — a
  stable AR weapon-model term, matching the board's AR class mean 0.965 (**open-questions U32**;
  needs a re-record with `folkwang` in SLOT 3, she was unfocused in both team-A runs); and
  `idoll-ocean`'s ATK basis reading **~1.4% low** against a 7694 popup — **ANSWERED 2026-07-26**:
  the recording lacked the relationship (bond) bonus (~1.4% of total ATK); the ceiling is correct
  (**answered-questions U33**).
  **SG SIDE IS DONE — the cold-read is the PELLET-LANDING term** (`/probe-processing` on
  `snowcrane-folkwang-marciana.MP4`, n=2 = **0.850 COLD**; full record `docs/probe-runs.md` § SG SIDE,
  parse `docs/probe-data/marciana-sg-band.json`). Localized by elimination: ATK basis pinned **+0.23%**
  (5 popup values on one per-pellet lattice, u≈2011.47), cadence = sim (40 game-frames), crit = fixed
  stat, core popups rare — so the 17.7% gap is FORCED onto landing (real ≈8.45/10 mean vs sim 7.18),
  concentrated at the LONG bands (sim near 8.13/mid 7.13/midfar 6.57/far 6.07). ⇒ A pure SG override
  re-tune would be fitting overrides to a **weapon-model** landing error — fix the landing model first.
  **OPEN follow-up: exact per-band landing needs a SOLO `marciana` recording** (popup-stacking defeats
  per-shot counts; the running-total lattice is mixed across 3 units here) → **open-questions U35**.
  NOT ENACTED (n=2, measurement only).

- **⇒ TDD TRANSITION (owner-approved 2026-07-23, NEW KIT WORKFLOW) →
  `docs/handoffs/2026-07-23-tdd-transition-plan.md`.** Kit work switches from batch-BDD (kit-parse →
  audit → board-fit) to test-first. **Step 1a–1c LANDED 2026-07-23** — vitest is the gate
  (`npx vitest run`, ONE verify.sh step globbing `scripts/tests/**/*.test.ts`; engine/ + generators/
  - units/ + lib/harness.ts; all 9 bespoke tests migrated, the 6 orphans now wired in). **Step 1d
    LANDED 2026-07-23** — the `cfg.onEvent` structured event hook (the plan's one gated engine edit:
    isolated worktree, `/scientific-method` step-7 reviewed, merged; output byte-identical on a
    whole-board A/B, not just the snapshots), so event-level kit assertions are live for steps 2–3.
    6 payload follow-ups (weapon-swap events, perResource/ramp/swap-gate fields on `buffApply`, …) are
    listed under §1d in the plan doc — build them as step-2 tests need them. Open:
    (2) engine-primitive test backfill by census priority (before
    per-unit work); (3) per-unit dedicated sessions, OWNER drives the spec line-by-line from kit text —
    **run them with the `/kit-tdd` skill** (created 2026-07-23; the operational form of the plan's step 3:
    slug gate → owner-driven spec table → RED test against the SHIPPED override → gated fix → board A/B);
    (4) audit-kit/blind-rebuild demoted to post-validation sampling. Rationale: the board gates
    FIT only; faithfulness errors of a few % (helm's `critRateNormalPct` mis-scoped generic, her
    round count faked as `durationSec`) are absorbed by calibration and only unit tests can gate them.

- **⇒ SMG OVERRIDE RE-TUNE WORKLIST (follow-up to the LANDED SMG cadence flip).** The SMG cadence
  flip 24→20.0/s (frame quantization) LANDED default-ON 2026-07-23 (DECISIONS; `docs/STATE.md`
  `SMGRATE` row; revert `SMGRATE=24`). Open tail: ~24 SMG overrides were fit to the old 24/s and now
  read a few % COLD → the re-tune worklist in `docs/control-regression-followups.md`. Post-flip
  residuals still open: `quency-escape-queen` ~1.05 HOT, `nayuta` ~0.85 COLD. New question from the
  landing: **U34** (Max-Ammo ▲-expiry over-cap belt clip — immediate vs lazy, now reached code at
  20/s). The full work order is CLOSED → `docs/handoffs/closed/2026-07-23-smg-cadence-flip.md`.

- **⇒ ENGINE-WORK ORDER (read FIRST before resuming per-kit retunes) →
  `docs/handoffs/2026-07-22-engine-work-plan.md`.** The remaining engine work ranked by BLAST RADIUS, with
  the rationale that P0/P1 items change the shared math every override is calibrated against (a retune done
  first has to be redone), while P2 primitives are additive and interleave freely. Order: (1) score the
  `CONE_DELTA` holdouts + revert-trigger check; **(2) LANDED 2026-07-22 — `RIDERCRIT` ON, see A32 (U13);
  remainder → U28**; (3) accuracy-circle geometry (3 owner rulings
  open; take the one hard range measurement first); (4) A2/U20 same-cast self-buff — **ANSWERED 2026-07-26:
  own same-cast self-buffs DO apply to cast-instant burst (answered-questions U20)**;
  (5) **P2 primitives — NOTHING BUILDABLE REMAINS** (verified 2026-07-22): pellet-count LANDED 07-21,
  eve bucket LANDED 07-20, snow-white charge-swap STRUCK, **"rolling reload" was a MIS-STATED MECHANIC
  → U30** (owner correction 2026-07-22: chunked units empty the mag then refill it in PARTS — they never
  top up mid-mag. `reload_bullet` = 1/chunks is the tell, `reload_time` is per-chunk, and shipped
  `reloadFrames` already multiplies it for 190/192 units ⇒ **nothing to build**. `modernia`/`volume` were
  never carriers; `grave` is the lone un-multiplied one, HELD at 81 by owner decision + pinned in the new
  `scripts/check-reload-chunks.ts` verify gate; the COMPOSITION of parts→duration stays open in U30),
  leaving only **5e state machines. The TARGET-STATUS GATE half of 5e LANDED 2026-07-23** (`targetStatus`
  effect + `requiresTargetStatus` gate; the hardcoded `wipeOut`/`requiresWipeOut` pair was then DELETED
  and `d-killer-wife` migrated onto it — owner ruling, faithful > fit, board-neutral → DECISIONS
  2026-07-23 ×2, `docs/STATE.md` §5, `docs/engine-modeling-gaps.md` §1a). ⚠ **Its "same machinery for all four" rationale was REFUTED** by the
  premise gate — evidence tier **DATAMINED (kit text), complete 4-of-4 census** of the units named, read
  by a fresh-context blind `premise-verifier` and cross-checked by roster-wide status-token grep. This is
  a STRUCTURAL claim about what the four kits say, not an empirical one: it flips no constant, no default
  and no board value, and it narrows the scope of work not yet built. The registry is NECESSARY for all
  four but SUFFICIENT only for `privaty` (enemy-carried status, clean predicate read). `mint` still needs a timerless memoryful XOR toggle, `prika` a
  cross-unit status event bus + in-flight duration mutation, `milk-blooming-bunny` a **reload-count-scoped
  stat CLAMP** (which is also the §1b LOCK gap — note it is NOT a timed window) — three separate builds,
  detailed in the plan doc. Do not re-attempt them on the registry alone. **5f `privaty` is CLOSED —
  ENACTED 2026-07-23** (owner ruling, faithful > fit → DECISIONS): the fabricated DoT is replaced by a
  `lastBullet` `flatDamage 1687` gated `requiresTargetStatus 'Designated Target'`, the status applied by
  her burst, `noFb` gone. Settled by a frame read (u7 @ 15.503s) whose arithmetic identifies the rider
  exactly and shows it taking the +50% FB major. **DELIBERATE board cost 0.937 COLD → 1.118 HOT** —
  fit-exposure from the removed `noFb` calibration, NOT this encoding; do not close it by re-adding
  `noFb` or shaving the datamined coefficients (per-unit localization thread).
  **⇒ U14 IS NOW EMPTY: she was the roster's LAST `noFb` carrier**, so `FBRULE=perkit` is behaviourally
  identical to `FBRULE=timing` for every unit and the default flip `sim.ts` promised ("once all 6 are
  green … zero further drift") is now provably a no-op. **NOT taken — engine default, owner-gated; queued.**
  **P0 is CLEAR:** the crit/core bracket is ADDITIVE (owner ruling 2026-07-22, zero engine change →
  DECISIONS).

- **⇒ KIT-AUDIT IMPLEMENTATION PLAN → `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md`.**
  Phase C continues from `elegg-boom-and-shock`. Open, all measurement/footage-gated: the A4 primitive
  build-order (state machines — do NOT bulk-land); the soda-twinkling-bunny FB-extension + jill
  trueNormals gated enactment passes; scarlet-black-shadow in-burst per-phase proc count (needs
  isolated-burst footage); moran swap-window throughput (needs isolated moran-solo); chisato's PI/PI2
  reenterStage attribution re-derive (code-verified inert). ⚑ dorothy-serendipity landed-consolidation
  switch contradicts her measured solo count (~55–64) → solo re-validation before it's fully trusted.

- **⇒ UNIGEO SHIPPED (default `'all'`, owner enactment 2026-07-22 → DECISIONS; live model
  `docs/STATE.md` §4; full thread `docs/handoffs/2026-07-22-sg-geometry-handoff.md`).** SG/AR/SMG
  accuracy geometry is now uniform-in-circle (R(hr) linear-to-zero at HR 100 from the datamined
  scale; SG landing = 0.96×coverage with the new Hit-Rate term; core = area-ratio/lens). The N5
  fire comp's real FB count is 12 (owner recount) vs sim 10 → **open-questions U29** (pre-existing
  burst-generation question, NOT a UNIGEO regression — W6 isolation record). **TOP FOLLOW-UP: the
  SG OVERRIDE RE-TUNE PASS** — SG units carry 12–24% landing calibration debt (board SG mean
  |ratio−1| 0.084→0.131 until re-tuned; the graded SG comps are the worklist).
  ⚠ **RE-SCOPED 2026-07-23, then CONFIRMED by the SG-landing probe:** `marciana` (SG, NO override,
  zero damage kit) scores **0.850 COLD at n=2**, and `/probe-processing` localized it to the **LANDING
  term of the SG weapon model** (ATK pinned +0.23%, cadence = sim, crit/core ruled out;
  `docs/probe-runs.md` § SG SIDE, parse `docs/probe-data/marciana-sg-band.json`, **open-questions
  U35**). ⇒ Fix the SG **landing model** BEFORE any override re-tune — a pure override pass would be
  fitting overrides to absorb a weapon-model error. Exact per-band landing is footage-gated on a SOLO
  `marciana` recording (U35). Then: owner core
  re-trace mid/midfar/far (upgrades ⚑ fit-selected series C); third clean SMG cell (de-saturates
  the ⚑ SMG lens pair — its little-mermaid long-band over-prediction is an active red flag);
  bloom-phase footage for f_bloom; blanc near-HR39 re-count; burst-5 near-ON count backstop;
  chisato SMG midfar HR22 stays excluded (WEAK); quency-escape-queen flag-off HOT baseline =
  Explore-Route kit over-credit (owner kit audit). (Mechanics SSOT pair refreshed to UNIGEO
  2026-07-22 — done.)

- **⇒ `fbext` BRANCH — MERGED to main 2026-07-22 (PR #17 `af0592b`, owner-confirmed).** Ordering fix +
  chip-gated FB-extension ladder + soda-twinkling-bunny's Hit Rate; the `soda-tb control` comp is
  graded (board 142 datapoints, boss NEUTRAL per owner — the recon's inferred Electric was wrong and
  would have handed both Iron units a ~10% advantage). The 4 formerly pre-merge items remain open as
  post-merge follow-ups: `docs/handoffs/2026-07-22-engine-work-plan.md` (FB-extension item).

- **⇒ ROSTER `simSupported`-EXPANSION BACKLOG.** rei (`rei`, ≠ `rei-ayanami`) is `generatorSupported`
  but has no override → excluded from DPS/generator tools until one is authored; the other ~117
  unsupported units are the kit-parse-rollout expansion backlog (not started).

- **⇒ SG-LANDING GEOMETRY: aim-circle method fix (`docs/data/sg-calc/`)** — all four owner rulings RESOLVED
  2026-07-22, scope collapsed to ONE workstream. Workstreams A + B are RETIRED (superseded by the live
  δ-offset cone — code-verified unreachable); discrete bands KEPT; the `k,c` range measurement is CLOSED as
  unobtainable (no in-game absolute-range readout — do not re-open). **Remaining:** rebuild
  `BAND_SG_HIT_FRAC` on the aim circle instead of the D=162 spread disc, then re-A/B `SGLANDING=geo` against
  a FRESH baseline (the plan's numbers predate the cone + rotation landings). Ground truth:
  `noir-sg-bands.json`. → DECISIONS 2026-07-22.

- **⇒ KIT-PARSE RECONCILIATION BACKLOG → `docs/handoffs/kit-parse-reconciliation-backlog.md`** +
  **ENGINE MODELING-GAP THREAD MAP → `docs/engine-modeling-gaps.md`.** The open tail of per-unit
  findings + the cross-unit cluster inventory (which primitives are built but not yet enacted per unit —
  all measurement/board-gated). Per-unit tier + finding SSOT: `data/kit-status.json`.

- **⇒ PATCH NOTES PENDING AT NEXT PUSH for roster-generator item 4** (merged to main 2026-07-24,
  `7ebc77b`, owner-approved — the perf plan is now CLOSED: items 0/1/2/3/5 in `5a50f78`, item 4 here;
  WHY in DECISIONS, A/B in `docs/handoffs/closed/2026-07-24-gen-item4-polish-ab.md`). Player-facing
  value is narrow — a measured NO-OP on the shipped full-pool config, +13%/a recovered team only on
  constrained (small-eligible-roster) pools — so the note should say that honestly rather than sell a
  speed/quality win. Earlier patch notes (`035465e`) already cover the item-0/1/2/3/5 search upgrade;
  both ship with the next push/deploy.

- **⇒ UNION-RAID GENERATOR — DEFERRED (owner ruling 2026-07-24) pending board stability.** Plan +
  precondition to resume: **`docs/handoffs/2026-07-24-union-raid-polish-plan.md` ON BRANCH
  `gen-union-item3`** (worktree `../nikke-sim-wt-gen-union-item3`, tip `7eb2174`; not on main).
  The owner-specified method is settled — build each boss's IDEAL team independently (heavy
  overlap on the meta supports is the INPUT, not a fault; the standard comps only emerge after
  re-allocation), then re-allocate ONLY the overlap by asking each claimant what it loses by
  conceding a contested unit — plus "any"-element rows (re-wire `weakness: null` from "none" to
  "ANY") and a "pick 3 bosses for me" control, backend first. **Deferred because judging the
  allocator needs a stable per-unit board:** the Water ideal differs from the standard comp by
  exactly ONE unit (`rapi-red-hood` over `snow-white-heavy-arms`, +13% with the same four
  teammates) while element advantage is only 1.1× on one unit's damage — a per-unit MARGIN
  question, not a search question. HYPOTHESIS, sim-only, NOT ENACTED. WIP code (typechecks, never
  run) on `gen-union-realloc-wip` @ `ddf304a`.
  **Already landed on `gen-union-item3` @ `cfad4df` and HELD, not queued for merge:**
  `topTeamsMultiBoss` extraction + build-order sweep + cross-boss polish, 10 tests, a `--union`
  bench arm, A/B artifact `docs/handoffs/closed/2026-07-24-union-multi-boss-ab.md` (+7.64% /
  0.00% / +9.58% on three boss triples at 3.4–4.0× wall clock; verify.sh + web:build + web-smoke
  green). It also carries a `web/src/simClient.ts` pool-init fix (the evaluator re-`init`s the pool
  per batch): workers hold ONE calc from the last `init`, so with several coordinators alive a batch
  could be simmed against another boss's cfg and silently return wrong damage. ⚠ **That hazard is
  LATENT on main, not live** — main's union loop awaits each `genBestTeam` fully, so only one
  coordinator ever exists at a time. It becomes reachable only with the multi-coordinator driver, so
  the fix travels WITH the union work; there is nothing to cherry-pick. ⚠ Union does NOT need the
  mint/prika post-pass — already a TEAM*CONSTRAINT.
  ⚠ **This branch was cut from `gen-item4`, which is now merged into main (`7ebc77b`) and its branch
  deleted** — so `gen-union-item3` rebases cleanly onto main whenever the work resumes.
  **⇒ UNION-RAID POLISH (open follow-up, spec written) → `docs/handoffs/2026-07-24-gen-item4-union-polish.md`**
  — findings half + the union build spec. `runUnionTopTeams` runs its own greedy loop over
  `genBestTeam` (one cfg PER BOSS), so it inherited nothing from item 4; the plan is to extract the
  polish driver out of `topTeams` and parameterize it per row. One hard constraint: **union must
  NEVER be sorted** (row \_i* is bound to boss _i_ — `shareUnionRoster` zips by index, so a sort
  mislabels bosses). The cross-boss accept rule is RESOLVED (raw sum — the app already reports the
  union roster as a plain damage sum, which IS union scoring); only score-vs-teamDamage remains, one
  line. Cheap pre-check before building any of it: does union greedy leave a team on the table on a
  constrained pool the way solo did?

- **⇒ MINT/PRIKA KIT FIX (owner-flagged "coming soon", 2026-07-24) must ALSO add the
  "prika bursts first, then only mint" rotation config** for the pair (owner requirement, same
  ruling that retired the always-combos). No engine knob exists today (only Λ `lambdaStage`) —
  needs a per-unit burst-selection primitive (e.g. max-casts + priority), gated engine work via
  `/scientific-method`. The generator already enforces their same-team pairing
  (`genCalc.TEAM_CONSTRAINTS`, relaxes if one is unavailable).

- **⇒ WEB/DPS-CHART PROFILE TODOs (2 deferred backend items).**
  - **Bready taste** — currently a MANUAL `sustained | distributed` mode pill. TODO: auto-derive the
    live taste from the team's actual buff types, model the tasteless state (both buff types absent →
    taste-gated lines + charge-speed debuff inert), measure the taste-line magnitudes (all ⚑).
    `src/skills/overrides/bready.json`.
  - **Diesel: Winter Sweets Highlight** — chart scores with the faithful Intro (bursts-first) numbers
    (owner ruling 2026-07-17: doc-only). TODO: model the burst-order-coupled Highlight (a no-op B3 must
    drive FB; Sustained ▲235.03 vs Intro ▲60.19, loses burst DoTs + team Damage-Taken ▲25% amp).
    `src/skills/overrides/diesel-winter-sweets.json`.

- **⇒ ROLE-AUDIT FOLLOW-UPS → `docs/handoffs/2026-07-17-role-audit-followups.md`:** (1) custom-weaponry
  `role` sweep — mostly deflated by D; what's left = pierce-from-kit-text + (data-blocked) weapon-swap
  secondary-weapon row; (2) **anis-star dot-gauge re-model** then drop her `hitsPerShot` carve-out to 1
  (highest-value modeling fix; needs a measurement); (3) re-pin PH-water FB to 12 when the burst-cycle fix
  lands / after re-measure. Passive carries: next sync applies 18 behaviour-neutral `burstGaugePerShot`
  diffs; D.4 RL splash (multi-part scope only); E class-mismatch core-row guard (no current violator).

- **⇒ RANK BOARDS BEYOND DPS — BACKEND LANDED 2026-07-26** (methodology `docs/data/rank-boards.md`;
  registry `docs/STATE.md` §8). Four boards: burstgen / burstcdr / sustain / buffer, sources
  `src/ranks/`, `npm run ranks:all` → `web/public/*.json`. **OPEN follow-ups:** (1) frontend pass —
  plan written: `docs/handoffs/2026-07-26-rank-boards-frontend.md` (one `/ranks` page, pill-switched
  boards, profile badges; artifacts carry a `profile` flag with plain+profiled dual entries); (2) DPS ranks for B1/B2 →
  `docs/handoffs/2026-07-26-dps-ranks-b1b2.md` (owner plans in a separate session); (3) composite
  support rank → `docs/handoffs/2026-07-26-support-rank-composite.md` (same); **(4) Mint/Prika duo
  profiles on the buffer rank — plan written 2026-07-26:
  `docs/handoffs/2026-07-26-buffer-rank-mint-prika-plan.md`. The pair's duet modes already encode the
  rotation; the buffer-rank team assembler just needs a partner-unit profile path (Sustain already
  ships pair profiles). Known caveats to
  carry into any owner review: buffer board under-reads trigger-gated kits (crown's recovery-gated
  lines fire only with a healer present); `soline-frost-ticket` reads NEGATIVE (−32k) on the buffer
  board — unexamined sim interaction; sustain lifesteal lines valued on own damage only.

- **⇒ `unmodeled` BACKFILL (~40 hand-authored overrides)** (deferred, owner-approved) — their authored slots
  carry `unmodeled: []` (skips still note-only); fill per unit via a kit-parse audit pass. Hand-authored
  values tracing to OLD fan wording may disagree with the official prose — reconcile per-unit when touched,
  never as a blocker.

- **⇒ VERIFY BOSS PROFILES (low-prio).** medium/large `bossPelletProfile` magnitudes are ⚑ UNVERIFIED
  (owner-chosen, not measured). dorothy-serendipity PH-water (766M) vs N9-redhood (328M) already DISAGREE on
  best fit (small vs medium), so profiles are plausibly per-boss — needs real per-boss SG footage to map boss
  silhouette → profile before any board use.

- **⇒ ENGINE REGRESSION FULL-BURST COUNT FAILURES — four comps disabled in `scripts/regression.ts`.**
  `iron sweep (run G)`, `T5 wind-weak`, `T1 wind-weak`, and `N3 scarlet/liberalio iron` all read 1–3 Full
  Bursts short of their video-measured counts on clean `HEAD`. They are temporarily skipped with a
  `disabled` flag so `bash scripts/verify.sh` stays green. Likely related to the open burst-generation
  timing increment family (`U29`/`U31`); re-enable once the underlying shortfall is fixed.

### Tier-0 open threads

- **`liter` 1.208 HOT ▲ — the new CONTROL REGRESSION suite (`npx tsx scripts/control-regression.ts`).**
  Four 720-kit-audit recordings sharing a constant support core (liter B1 / crown B2 / carry B3 / helm B3,
  slot 5 empty, boss Fire, focus = the slot-3 carry; carries = ada / maiden-ice-rose /
  scarlet-black-shadow / soda-twinkling-bunny). Damage-only — **FB counts deliberately UNGRADED** (none
  measured off these videos; do not pin one). Opening board: **liter 1.208** and TIGHTLY clustered
  (1.174 / 1.183 / 1.222 / 1.252) ⇒ carry-independent, i.e. her OWN kit, the top tuning target;
  **crown 1.051** (1.040–1.062, same shape, second). **liter's kit WAS reviewed 2026-07-23 (`/kit-tdd`,
  owner-driven, all 4 lines FAITHFUL — no fix; 11 pins in `scripts/tests/units/liter.test.ts`), so her
  1.208 is NOT a kit-encoding error:** her kit has ZERO self-damage lines, so her own damage is pure SMG
  weapon fire. **SMG is the only weapon class whose board mean is above 1.0** (1.058 — chisato 1.15 /
  quency-escape-queen 1.17 / little-mermaid 1.04 / nayuta 0.86, vs AR 0.965 / RL 0.967 / SR 0.973 /
  MG 0.942 / SG 0.875), so liter belongs to the **SMG weapon-model thread** (the ⚑ SMG lens pair, the
  quency-escape-queen cadence/+1.04 overshoot, chisato's excluded midfar HR22) — NOT to a per-kit retune.
  ✅ **ROOT-CAUSED 2026-07-23 — THE SMG CADENCE IS 20 ROUNDS/S, NOT 24.** MEASURED off the ammo
  counter (`idoll-ocean` focused): 10 rounds per 0.5 s, dead linear, in TWO range bands.
  MECHANISM: 1440 rpm = 2.5 frames/shot at 60 fps, and SMG is the **only** weapon in the roster whose
  datamined `rate_of_fire` isn't a whole frame count (census: every other rate is exact) — quantizing
  2.5 up to 3 frames gives exactly 20.0/s. This is why SMG is the only class with a board mean >1.0.
  A/B (`SMGQUANT=1`): **liter 1.208 → 1.031** (spread [1.222 1.183 1.252 1.174] → [1.039 1.000 1.067
  1.019]), chisato 1.154→0.975, quency-escape-queen 1.174→1.046, little-mermaid 1.042→0.967,
  idoll-ocean 1.166→1.018, helm 1.042→1.017; board ±5% 10→13; **all 11 measured FB assertions pass in
  both arms**, retiring the 2026-07-17 "24 holds every measured-FB comp" premise (FB counts measure
  gauge/sec, the ammo counter measures shots/sec). ⇒ **SO THIS TIER-0 THREAD IS EXPLAINED — liter needs
  NO retune.** Full record + A/B table: `docs/probe-runs.md` 2026-07-23.
  ✅ **FLIP LANDED default-ON 2026-07-23** (DECISIONS; supersedes the 2026-07-17 D.2 24/s adoption on
  instrument grounds; `docs/STATE.md` `SMGRATE` row; revert `SMGRATE=24`). The 6 red tests were resolved
  (modernia MG spend root-caused as a belt-clip fixture artifact; the 5 FB-count fixtures rebuilt on
  non-SMG/gauge-rich vehicles). ⚠ crown also carries many BOARD readings from `scripts/experiment.ts` — a retune
  must be A/B'd on `scripts/board-read.ts` too, not just this suite.
  **⇒ BOARD-WIDE FOLLOW-UPS FROM THIS PROJECT → `docs/control-regression-followups.md`** (the
  batch-and-stop landing zone: the `durationShots` carrier census, the `critRateNormalPct` census, the
  10-unit fit-exposure re-tune worklist, override-prose drift, and the suite's open board questions).
  **helm is DONE for now** — her kit was reviewed 2026-07-23 and both findings landed (DECISIONS ×2):
  `critRateNormalPct` (her allies Critical Rate is normal-attacks-only) and `durationShots` (her burst's
  "for 10 round(s)" is a real round count, not `durationSec 13`). Control suite 1.027 → 1.042, board
  0.961 → 0.973. Her carries' n=1 readings after both fixes: maiden-ice-rose 0.844,
  scarlet-black-shadow 1.106, soda-twinkling-bunny 0.901, ada 0.970 — NOT actionable alone.
  ⚠ **helm remains carry-SPREAD** (0.972 soda-twinkling-bunny … 1.093 scarlet-black-shadow): an
  interaction, NOT a flat kit offset, and neither fix addressed it. Do not tune her to the mean before
  the spread is explained.
- **`jill` re-tune at 0.919 COLD ▼** — her kit-faithful reload landed 2026-07-22 (DECISIONS; **A33 (U31)**),
  moving her 1.031 HOT → 0.919 COLD, so she is now the top per-unit re-tune candidate. Two riders: her
  burst's _"Normal attacks deal True Damage for 10 sec"_ is unmodelled, and the reload-speed **LOCK** she
  carries needs the clamp primitive (`docs/engine-modeling-gaps.md` §1b, same build as the 5e
  target-status gate). **`N1 rapi/quency wind` is now UNPINNED** (sim 12 vs video-measured 13, value kept
  in-comment in `scripts/regression.ts`) — a pre-existing burst-generation shortfall her fix UNMASKED,
  same family as **U29**. Do NOT close it by restoring her phantom fire rate.
- **isabel mid/midfar clock-drift re-derive** — the one SG-landing thread still open (per-unit landing +
  class table STAND; class-wide far 0.66 REJECTED — open-questions **U27**, split out of the now-closed
  U17 on 2026-07-22; the settled record is **A31 (U17)** in ANSWERED).
- **HR→core slope refinements** — `asuka` saturation bracket (circle10 vs SAT=1); quency-escape-queen
  cadence + the +1.04 overshoot; slope validation via an existing measurement (`soda-tb-control`). Live
  model: `docs/STATE.md` §4.
- **AR-burst-window residual (moran/jill)** — footage-blocked. moran's swap coldness is THROUGHPUT
  (~1.3× more hits in the swap window), NOT per-shot (the '1440'=24/s datamine was measured-refuted; base
  ~12/s stands); needs an isolated moran-solo recording or the swap weapon's `shot_count` datamine.
- **Per-unit rotation re-tunes (answered-questions U16)** — RESOLVED 2026-07-26: the rotation
  over-generation is settled (DECISIONS 2026-07-21); the per-unit over-models (chisato, trina, naga,
  soda-twinkling-bunny) are rotation-independent and tracked as standard hand-tune queue items.
- **Blanc same-squad CDR override cleanup** — `src/skills/overrides/blanc.json` currently models the
  S2 "ally from the same squad still on the battlefield" CDR (40.76s) as unconditional because nobody
  dies at scope lock. The buffer-rank `w/ Bunny` profile works around this by suppressing the CDR in
  Blanc's plain row and keeping it active when the synthetic Bunny partner is present. The engine/
  override should instead gate the CDR with a `teamHas` slug condition (or a proper squad primitive)
  so the plain row is naturally inert without the partner and active with the partner. Out of scope for
  the current rank-board PR; the buffer-code workaround (`blancNoCdrOverride` in
  `src/ranks/buffer.ts`) should be removed once the override/engine is fixed.
