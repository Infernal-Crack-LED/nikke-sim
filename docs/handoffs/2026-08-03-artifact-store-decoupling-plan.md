# Decoupling the generated artifacts from the deploy path — scoping doc (2026-08-03)

Status: **SCOPE ONLY — Steps 2–4 unimplemented; Steps 0–1 + the builder canary are IMPLEMENTED on
branch `worktree-artifact-decoupling-review` (2026-08-04; verified: `verify.sh full` and the
simulated PR-CI artifacts tier green locally, incl. a full fetch-state simulation). Decision §8.1
applied as recommended (advisory on PRs; the deploy path is the hard gate); decision §8.2 still
open.**

Origin: owner asked why the CI `Build rank-board artifacts` step took ~8 min on PR #82 when the
`b71af726` incremental-rebuild work should have cut it, then asked to scope moving the pre-built
artifacts (infographics / rank boards / DPS chart) out of local files and into a DB, with
regeneration moved to a post-deploy step plus a nightly cron.

## 1. The triggering measurement (why this came up)

CI run [30877617106](https://github.com/Infernal-Crack-LED/nikke-sim/actions/runs/30877617106),
PR #82 (`k-burst-sg-swap-fix-2026-08-03`). Job total 14m10s, of which step 5
(`Build rank-board artifacts`) was **472s**:

| Command             | Time       |
| ------------------- | ---------- |
| `npm run dpschart`  | **434.3s** |
| `npm run ranks:all` | 37s        |

`verify.sh full` was 259s, `verify.sh artifacts` 98s. So the board build alone was ~51% of CI
wall-clock.

**The incremental gate did not fail — it correctly declined to fire.** `build-dpschart.ts:221-360`
hashes inputs into two buckets: a GLOBAL bucket (`GLOBAL_DIRS` = `src/dpschart`, `src/engine`;
`GLOBAL_FILES` includes `src/skills/types.ts`) and a PER-UNIT bucket. Carry-over from a prior
artifact is only attempted when `globalHash` matches (`:643-648`); then only units whose own hash
moved are resimulated. PR #82 touched `src/engine/sim.ts` **and** `src/skills/types.ts` — both
global — so zero rows carried and all 67 resimulated.

The run logs are unambiguous and split exactly on whether the branch touched a global-bucket file:

```
PR #82  k-burst-sg-swap-fix   (sim.ts + types.ts)  no carry-over message        434s
PR #81  vesti-missile-gate    (sim.ts + types.ts)  no carry-over message        299s
PR #80  kit-autonomy-batch    (overrides only)     "carrying over 64/67 rows,
                                                    resimulating 3 (d, epinel,
                                                    maiden)"                     22s
PR #79  fb-count-regression   (nothing hashed)     "inputs unchanged vs
                                                    nikkesim.app"                ~0s
```

(The three slugs in the #80 line are quoted **verbatim** from the build log — `build-dpschart.ts`
emits `changed.join(', ')` over raw `t.slug` values, so those are the exact slugs `d` (SMG/Wind),
`epinel`, and `maiden` (SG/Electric), not base names standing in for variants. PR #81's unit was
`vesti-tactical-upgrade` (RL/Fire), not `vesti` (RL/Water); PR #82's was `k`.)

Supporting facts verified while investigating:

- The live-artifact fetch works from the runner. `https://nikkesim.app/dpschart.json` → 200,
  202,815 B, valid `globalHash` / `inputsHash` / 64 `unitHashes`.
- The runner is 4 vCPU (`availableParallelism()` → the logged "4 worker(s)").
- 434s vs #81's 299s for identical work (67 rows, 4 workers) is unexplained; most likely runner
  variance, possibly K's new SG pellet-landing routing making her row a straggler. Cheap to settle
  if anyone cares: `DPSCHART_WORKERS=1 npx tsx scripts/build-dpschart.ts --force --out /tmp/x.json`
  before/after. Not load-bearing for this plan.

**Conclusion: no regression. 434s _is_ the full rebuild on a 4-vCPU runner** (the 245s figure in
`b71af726` was a dev-box number). The optimization simply cannot apply to an engine PR, because an
engine edit can move any unit's damage and a file hash cannot prove otherwise.

## 2. The proposal is two separable changes

1. **Where artifacts live** — local file vs DB. A storage question.
2. **When they are regenerated** — inside the deploy critical path vs post-deploy / nightly. A
   scheduling question.

**Only (2) buys the time back.** And (1) already has a working prototype in the tree:
`build-dpschart.ts:393` `fetchLiveCandidate()` pulls `https://nikkesim.app/dpschart.json` and
carries rows over from it. The live site is already functioning as the artifact store; a DB is the
same idea with a different transport plus an auth requirement.

Keep the two decisions apart — they sequence differently, and the image set pushes back hard on the
DB half (§4).

## 3. Real inventory and cost

| Artifact                                                                | Size    | Full build | Cached | Input hash?              |
| ----------------------------------------------------------------------- | ------- | ---------- | ------ | ------------------------ |
| `dpschart.json`                                                         | 203 KB  | **434s**   | 0–22s  | ✅ 2-tier global+perunit |
| `burstgen` / `burstcdr` / `sustain` / `bufferchart` / `b1b2dps` `.json` | 111 KB  | 37s        | —      | ❌ **none**              |
| `dist/img/**` (385 images) + `manifest.json`                            | 29.2 MB | 47.9s      | —      | ❌ **none**              |

Measured from the CI logs of the run above (`infographics: 385 images, 29.2 MB (0.032 B/px avg) in
47.9s`).

**The floor today is ~85s of artifact work even when dpschart caches perfectly**, because
`ranks:all` and `build:infographics` rebuild unconditionally. The ceiling is ~520s. The 8-minute run
was the ceiling.

Current plumbing:

- The 6 board JSONs are gitignored (`.gitignore:19-24`), written to `web/public/`, copied into
  `dist/` by `vite build`, and served statically.
- Client reads them by URL: `web/src/dpschartData.ts:29` fetches `${BASE_URL}dpschart.json`;
  `web/src/rankBoardsData.ts:30-34` maps the rest.
- Server reads them from disk: `src/server/api.ts:202` (`loadDpsChart`, for the `dps.png` route)
  and `src/infographics/core/unitCardData.ts:81` joins board data for unit cards.
- `build-infographics.ts` writes content-hashed filenames into `dist/img/` plus a mutable
  `manifest.json`. It must run AFTER `vite build` because `dist/` is wiped by `emptyOutDir`, and
  BEFORE nothing — it is the last artifact step (`verify.sh` artifacts tier).
- All 6 board JSONs are already publicly reachable and served `no-cache`
  (`src/server/static.ts:783-792` `MUTABLE_PATHS`). Verified live: all 6 return 200.

## 4. Storage design — split JSON from images

### JSON boards → Postgres is a good fit

314 KB total across 6 rows. The DB surface already exists: `pg` and `@types/pg` are dependencies,
`DATABASE_PUBLIC_URL` (bakery-bot's Postgres) is already wired and used read-only by
`src/data/sync.ts:122` and `scripts/audit-release-dates.ts:45`.

One table is enough:

```
artifact_key   text primary key   -- 'dpschart' | 'burstgen' | ... | 'img-manifest'
body           jsonb
inputs_hash    text
schema_version int
git_sha        text
generated_at   timestamptz
```

### 385 images / 29.2 MB → NOT Postgres

These are content-hashed immutable files served under `IMMUTABLE` headers
(`src/server/static.ts:779`, matched by `IMG_HASHED`) — the object-store/CDN shape, not the
relational-row shape. Two viable homes: a **Railway volume**, or **R2/S3**.

Either way this requires splitting `imgDir` out of `distDir` in `src/server/static.ts` (which today
resolves everything against `opts.distDir` — see `:903`, `:543-560` `loadImgManifest`), because
`dist/` is wiped by every `vite build`. If deploys stop rebuilding images, a fresh deploy leaves
`dist/img/` empty and the manifest points at files that do not exist. **This is the largest single
chunk of the project and the most likely to want its own plan doc.**

`img/manifest.json` travels with the JSON boards, not with the images — it is the mutable index, and
`static.ts:781-783` already documents it as "the only mutable URL in the image set".

## 5. The staleness gate — the largest _new_ build

Owner's framing ("unit tests fail if the board needed to be re-generated, which would be a sign to
run the script") is the right shape, and half the machinery exists — **but only for dpschart.** The
other five boards and the infographics have **zero** input hashing (verified: 0 `createHash` /
`inputsHash` / `globalHash` references in `build-burstgen.ts`, `build-burstcdr.ts`,
`build-sustain.ts`, `build-bufferchart.ts`, `build-b1b2dps.ts`).

Work required:

1. **Extract the hash logic** from `build-dpschart.ts:221-360` into a shared module so every builder
   and the test use one implementation. It is currently embedded in that one script.
2. **Define a global-input bucket per remaining builder** + infographics. Cheaper than dpschart's:
   none of them need the per-unit decomposition, a single global hash is sufficient.
3. **A test** that recomputes each artifact's current input hash, compares against the stored
   artifact's, and fails naming the exact refresh command.

### ⚠ Decision needed: hard-fail vs advisory

This test goes red on **every engine PR, by design**. Both #81 and #82 touched `src/engine/sim.ts`;
both would be red until someone refreshed. Options:

- **Hard-fail everywhere** — maximum signal, maximum friction.
- **Advisory on PRs, hard on `main` / pre-deploy** — recommended, paired with a one-command
  `npm run artifacts:refresh`. Rationale: a gate that is red by design trains people to ignore it.

## 6. The cron, and the trap inside it

**A nightly rebuild of a deterministic function of committed inputs produces byte-identical
output.** Nothing changes overnight unless `data/characters.json` changes — which happens only via
`npm run sync` against the synergy API. So the useful nightly job is **sync → detect drift → rebuild
→ publish**, not bare rebuild.

### ⚠ That creates a genuine hazard

The runner syncs `characters.json`, builds artifacts from it, publishes to the DB — and the repo
still has the OLD committed `characters.json` (it is a committed, protected path). The next PR's
staleness test then compares repo inputs against DB artifacts built from **un-committed** data, and
fails permanently with no local fix.

Resolutions, none free:

- Cron commits the sync (a bot push to `main` — collides with CLAUDE.md constraint 2, owner-gated
  pushes).
- Cron refuses to publish when sync produces a diff, and instead opens a PR or pings
  `autonomous_session_webhook`. **Preferred** — keeps the never-push constraint intact and turns
  roster drift into an owner notification, which is what it actually is.

### Where it runs: GH Actions `schedule:`, not the Mac

The owner's global CLAUDE.md documents the headless-launchd silent-kill failure mode; a nightly job
gated on the laptop being awake will silently stop. Cost ~9 min/night on a 4-vCPU runner worst case,
near-zero when hashes match. Caveats: GH disables scheduled workflows after 60 days of repo
inactivity (non-issue here), and schedule firing time drifts under load.

## 7. Hazards to design against

1. **Artifact/code version skew.** Today the artifact and the engine that produced it ship in the
   same build, so they are consistent by construction. After decoupling, prod can serve last night's
   board against today's engine. Mostly benign — it is display data — but `src/server/api.ts:202`
   and `src/infographics/core/unitCardData.ts:81` **join** board data server-side, so an artifact
   format change breaks them. Store `schema_version`; server falls back rather than 500s.
2. **Preserve the fresh-worktree property.** `verify.sh full` must keep running with no artifacts
   present — that is the entire reason the chart smokes live in the `artifacts` tier and not in
   `full` (`scripts/verify.sh:98-106` documents it: an isolated engine worktree per CLAUDE.md
   constraint 8 has no such file). The skip-when-absent behaviour in
   `scripts/tests/share/dpschart-parity.test.ts:34` and `unit-card-data.test.ts:44` must survive.
3. **Two writers.** Cron + manual refresh + (if kept) deploy. Low risk at single-owner scale;
   `INSERT ... ON CONFLICT` with the `inputs_hash` recorded is enough to tell what any row was built
   from.
4. **CI needs read access.** After the move, CI either reads the DB (needs a secret — available
   here, since PRs come from same-repo branches, but a new dependency) or reads the public URLs
   (what `build-dpschart.ts` already does, unauthenticated). **Prefer the public URL path.**

### Pre-existing bug found while scoping (fix independently of this project)

`b1b2dps.json` is **missing from `MUTABLE_PATHS`** (`src/server/static.ts:783-792`) while the other
five boards are listed. It currently serves `no-cache` via the unmatched-path fallback rather than by
intent — verified live. One default-change away from being served stale under a long cache. Add it
alongside the other five.

## 8. Sequencing — the cheap step first

**Step 0 — hours, no DB, no cron, no migration.** Replace the CI board-build step with 6 `curl`s
against `nikkesim.app`, plus the staleness hash test. Takes the 8-minute step to ~1s and removes
~50% of CI wall-clock **today**. It also de-risks everything downstream by proving the hash gate and
the fetch-published-artifacts pattern before any storage migration is committed to.

**Owner decision 2026-08-04 — Step 0's lost-signal mitigation.** Step 0 removes the only scheduled
proof that the builders still work on merged inputs — a builder broken by a merged PR would
otherwise surface only at the next manual refresh. Fix (owner decision): a post-deploy canary in
`deploy.yml` (`builder-canary`, `needs: deploy` — fires after every successful deploy to main, i.e.
after every merged PR): a forced from-scratch rebuild, `build-dpschart.ts --force --out
$RUNNER_TEMP/...` (output discarded — health check, not a publish path) plus `npm run ranks:all`.
`--force` is load-bearing: right after a deploy the live-site carry-over candidate matches the
merged inputs, so without it every row carries over (`build-dpschart.ts:617` gates the whole
candidate search on `!FORCE`) and the run proves nothing. Infographics are exempt — PR CI keeps
building them via the `artifacts` tier. Cost ~8 min, off the deploy critical path. Landed on branch
`worktree-artifact-decoupling-review` ahead of Step 0: redundant with the deploy path's own builder
run until then; the redundancy is what lets Step 0 delete that run safely.

**Step 0 landed 2026-08-04 on `worktree-artifact-decoupling-review`** (canary `69dfcf27`; Step 0
commits `7f5ba808` / `afb66b52` / `665e3590`): the §5-item-1 hash extraction (for dpschart) into
`scripts/artifact-input-hash.ts`; `scripts/fetch-published-boards.ts` (the six curls, with retries,
hard-fail on a missing/invalid published artifact — no silent fallback-to-build, which would
restore the exact cost being removed); `scripts/check-board-freshness.ts` (advisory — never fails
CI; the deploy.yml pre-deploy build + the Railway rebuild are the hard gate, so staleness
self-heals at deploy time); and `verify.sh`'s `SKIP_BOARD_BUILD` gate so PR CI smokes the fetched
set while the deploy box keeps building. The b1b2dps `MUTABLE_PATHS` fix (§7) landed alongside.
One-time cost: the extraction adds the new module to `GLOBAL_FILES`, moving every hash once (one
full rebuild on the next deploy). Verified before commit: 65/65 per-unit hashes byte-identical to
the live artifact, `verify.sh full` green, `SKIP_BOARD_BUILD=1 verify.sh artifacts` green.

**Step 1 landed 2026-08-04 on `worktree-artifact-decoupling-review`** (commits `a13c7d6d` /
`d4627b20` / `90ea0545`): input hashing generalized to every builder in `scripts/artifact-input-hash.ts`.
One shared GLOBAL bucket for the five rank boards — a deviation from the per-builder buckets
sketched in §5, justified because their refresh unit is `ranks:all` (all five rebuild
unconditionally), so a shared bucket can never mislead a decision the hash drives and
over-enumeration kills the false-FRESH failure mode. `ol-default.json` gets its own bucket — and
since it is COMMITTED, its parity gate is hard everywhere (a drift is always rebuild + commit).
Every builder embeds `inputsHash`; `dist/img/manifest.json` gains it as provenance (boards hashed
stripped-content, so rebuild timestamps cannot move it). `check-board-freshness.ts` covers all
boards (FRESH/STALE/NO-HASH, advisory), and `board-hash-parity.test.ts` is the §5 test — hard on
built/committed artifacts, skip-stale under `BOARDS_FETCHED=1` (ci.yml's fetch path), naming the
exact refresh command on failure. Verified before commit: rebuild determinism, recomputed ==
embedded for every bucket, full PR-CI simulation green. Steps 2–4 remain deferred options per the
2026-08-04 review ruling.

**Step 1** — extract + generalize input hashing to all 6 boards + infographics (§5).

**Step 2** — DB table + publish/read path for the JSON boards; pull the builders out of
`railway.json`'s `buildCommand`.

**Step 3** — images to volume/object store + the `imgDir`/`distDir` split (§4). Biggest chunk; may
warrant its own plan doc.

**Step 4** — nightly cron, once §6's roster-drift question has an answer.

### Open owner decisions (blocking Steps 1 and 4 respectively)

1. **Staleness test: hard-fail or advisory on PRs?** (§5) — APPLIED 2026-08-04 as recommended:
   advisory on PRs; the deploy path (deploy.yml pre-deploy build + Railway rebuild) is the hard
   gate, with `npm run dpschart && npm run ranks:all` as the local refresh. (Owner proceeded with
   Step 0 without overriding the recommendation.)
2. **What does the nightly sync do when it finds roster drift?** (§6) — recommendation: refuse to
   publish, open a PR / webhook the owner.

Everything else in Steps 0–3 is decidable without owner input.
