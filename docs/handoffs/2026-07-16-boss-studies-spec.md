# Boss studies — spec (2026-07-16, rev 2 after owner review)

> Goal: mirror the kit-study flow (recording → extraction toolchain → subagent authoring skill →
> grade harness → tracked artifact) to produce **boss profiles**: per-boss JSON models of
> everything about the FIGHT that isn't the team — downtime, core-exposed uptime, owner-declared
> QTE phases, forced-cover mechanics, element-lock phases, movement/range script, defense, hitbox
> geometry. Today all of this is hardcoded for the single scope-lock raid boss; boss studies make
> it data.

Owner rulings baked into this revision (2026-07-16): no community footage (owner recordings only);
bosses have infinite HP — every trigger is time-based; QTE phases are OWNER-AUTHORED, not
video-derived; the schema also owns owner-authored **element-lock phases**; real raid bosses have
NO scope lock, so grading runs on the owner's real account stats; **DEF derivation is DEFERRED to
v2** (measured effect ~0.1%/hit on the known boss, A26 — low value, high harness cost); v1 = one
real boss end-to-end (necessarily non-scope-locked). **First validation test (rev 3): run the
extraction blind against the KNOWN scope-lock profile using `docs/probes/control/crown.MP4`.**

## 0. Why (and why now)

- The sim's boss is a set of engine constants measured against ONE boss: `BOSS_RANGE_SCRIPT` +
  `UNHITTABLE_FRAMES` (sim.ts:125-153), `SG_LANDING_BY_BAND` (sim.ts:154-169, explicitly flagged
  "single-boss, do not generalize"), `bossDef:140` + 100% core exposure (scripts/lib/scope-lock.ts),
  boss-transition cast blocking (sim.ts:1246), partless assumption throughout.
- Solo raid bosses rotate. Every new raid currently means re-deriving those constants by hand,
  scattered across sessions. A boss profile makes that a repeatable study with a tracked artifact,
  exactly like `src/skills/overrides/<slug>.json` did for kits.

## 1. The artifact — `data/bosses/<slug>.json` (`BossProfile`)

One tracked JSON per boss, loaded by the engine via `SimConfig.boss` (default = the scope-lock
boss, preserving current behavior). Draft schema (final shape lives in `src/engine/boss.ts` types;
every field carries an evidence note, mirroring override notes). Fields split into three
provenance classes: **video-derived** (the study measures them), **arithmetic-derived** (popup
math on owner footage), and **owner-authored** (the owner declares them from playing the fight;
the study never derives them).

```jsonc
{
  "slug": "scope-lock-raid",          // the current test boss becomes profile #1
  "name": "…",
  "element": "iron",                  // for element-advantage math
  "durationSec": 180,
  "def": 140,                          // arithmetic-derived (popup method, §2) — real-stats basis
  "parts": "none",                     // v1: partless only; field reserved (pierce double-hit,
                                       // interruption-part damage are multi-part mechanics)
  "hitbox": {                          // geometry class driving pellet landing
    "sgLandingByBand": { "near": 0.9, "mid": 1.0, "far": 0.75, "midfar": 0.9 },
    "note": "gappy silhouette; drake counter-delta method"
  },
  "rangeScript": [                     // video-derived: when the boss sits in which band
    { "fromSec": 0, "band": "mid" }, { "fromSec": 33, "band": "near" }, …
  ],
  "transitionUnhittableSec": 1.0,      // off-screen walk window per transition
  "downtime": [                        // windows where units cannot damage the boss.
                                       // ALL triggers are time-based (infinite boss HP — owner
                                       // ruling; there are no health-threshold phases).
    {
      "kind": "cover",                 // "cover" | "offscreen" | "invuln" — video-derived
      "atSec": [42, 97, 151],
      "durationSec": 6.5,
      "gaugeFills": false,             // do hits during the window fill burst gauge?
      "note": "forced-cover telegraph; duration incl. re-aim recovery"
    },
    {
      "kind": "qte",                   // OWNER-AUTHORED: red interrupt-circle phases. The video
                                       // toolchain never derives these — too hard to calibrate
                                       // from footage; the owner declares times/durations/
                                       // semantics from playing the fight.
      "atSec": [65],
      "durationSec": 8.0,
      "circleDamageCounts": false,     // does circle damage land on the boss total?
      "gaugeFills": false,
      "note": "owner-declared 2026-…"
    }
  ],
  "elementLock": [                     // OWNER-AUTHORED: phases where ONLY element-advantaged
                                       // units deal damage; non-advantaged units deal zero.
    {
      "atSec": [110],
      "durationSec": 15.0,
      "nonAdvantagedGaugeFills": true, // ⚑ semantics per boss: do their hits still fill gauge?
      "note": "owner-declared"
    }
  ],
  "coreExposure": {                    // video-derived: when the core can be hit at all
    "base": 1.0,                       // fraction of hittable time the core is exposed
    "windows": [],                     // explicit exposed/hidden schedule if the boss scripts it
    "note": "scope-lock boss: always exposed (basis assumption)"
  },
  "evidence": { "<field>": "tier + source + provenance class, per docs/CONVENTIONS.md" },
  "flags": [ /* ⚑ needs-measurement entries: field / estimate / reasoning / recipe */ ]
}
```

**Downtime semantics in the engine** (extends the existing unhittable-window machinery): while a
downtime window is active — hold fire exactly like `UNHITTABLE_FRAMES` does today (MG wind-down
runs, ≤1s-reload free-reload rule applies, in-progress reloads continue), block burst casts (the
measured off-screen rule, sim.ts:1246), no gauge fill unless `gaugeFills`, no damage. Buff
durations and burst cooldowns keep ticking unless a measurement says otherwise (⚑ per boss).

**Element-lock semantics:** during a window, units WITHOUT element advantage vs the boss deal zero
damage; advantaged units are unaffected. Whether non-advantaged units keep firing (ammo/reload
cycle advances) and keep filling gauge is a per-boss ⚑ the owner pins — default: they fire and
fill gauge, damage is nulled.

**Core-exposure semantics:** `coreExposure.base < 1` (or a hidden window) scales the auto-aim core
rate the same way the Hit-Rate→core model scales it (multiplicative on the band core rate, cap
1.0) — hidden core = body hits, not lost hits.

## 2. Measurement methodology — one recipe per parameter

All footage is OWNER-RECORDED (ruling: no community footage). Video work reuses the probe
toolchain (`scripts/probe/frames.ts`, `classify.py`, catalog) plus one new detector.

Two complementary downtime signals (owner-specified):

1. **Face count — the PRIMARY forced-cover metric.** The combat camera sits behind the squad: a
   normal frame shows the backs of five heads. During forced cover the camera shows their FACES —
   **five faces visible simultaneously = the team is force-covered.** This is state-based (not
   event-based), so it cannot misattribute edge timing the way the weapon-state signal can.
   **CALIBRATED v1 (2026-07-16, on `docs/probes/714 noon/1.mp4` fight-end cover phase):**
   detection = nagadomi's `lbpcascade_animeface` (MIT, vendored at
   `scripts/boss-study/lbpcascade_animeface.xml`, runs via `opencv-python-headless<5`; registered
   in `data/sources.json`) on 1311-wide frames; exclude the squad-strip portrait box; require
   ≥(unit count − 1) faces ≥45 px spanning ≥50% of frame width, ≥2 consecutive samples, inside
   fight bounds (pre/post-fight lineups are frontal too). Validated: flags the calibrated cover
   phase + zero false positives across all of crown.MP4.
   **MEASURED SURPRISE — the frontal-faces state fires at EVERY boss-unhittable walk,** not only
   special cover mechanics: on 714/1.mp4 it hits all five range transitions (fight 33 / 70.5 /
   110 / 147 / 180); on crown.MP4 (4-unit comp) it near-misses at transitions #3/#4/#5 —
   including pinning the reload-masked transition #4 (~142.5) that the weapon-state signal alone
   could only call ambiguous. So faces are a SECOND INDEPENDENT downtime signal corroborating the
   weapon state, exactly covering its natural-reload masking edge case.
   History: the v0 skin-blob proxy is DEAD (bare-skin blobs from behind count 5–8 on normal
   frames); an intermediate "composition signature" misread (reticle absent + reload bar + yellow
   countdown) was owner-refuted — the yellow countdown is the FULL BURST timer, "SVD-00 READY" is
   Red Hood's KIT UI (kits can reskin the aim box — expect per-kit tracker variants), reticle and
   reload bar are routine. LESSON (whole-picture): never derive a detector from a single
   unfamiliar frame's elements read in isolation.
2. **The focused unit's weapon state.** The focus unit's ammo counter rides in a box attached to
   the moving auto-aim reticle (~90 px left of the ring); track the box per frame. At combat fire
   rates the digits change at every 2–4 Hz sample, so **digit-region pixel-stability after
   alignment = holding fire** (no OCR needed); **box absent** = a cinematic/covered state.
   Reloading or frozen **while ammo > 0** = forced; a reload that began at 0 is natural.
   KNOWN EDGE CASE (owner): a unit that runs to 0 ammo and starts a natural reload right before
   the boss becomes unhittable under-counts the downtime — which is why the face count outranks
   the weapon state wherever both apply. Kit-driven instant refills (e.g. team-ammo effects) also
   move the counter with ammo > 0 — refill EVENTS are not downtime; only not-firing RUNS are.

Two attribution guards: the top-centre running damage total is NOT a downtime signal (DoTs keep it
ticking while units can't shoot — do not use it); and Full-Burst cut-ins pause firing for ~1 s, so
the FB-splash detector (probe-processing step 4) must run alongside and those windows must be
attributed to bursts, never to boss downtime.

| Parameter                           | Provenance                          | Recipe                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forced cover                        | video-derived (PRIMARY: face count) | five simultaneous faces = force-covered; runs of face-frames = cover windows                                                                                                                                                                                                                                                                  |
| Downtime windows (offscreen/invuln) | video-derived                       | ammo-box tracking at 2-4 Hz: digit-region static or box absent, with ammo > 0 at window start; classify each window by surrounding frames (boss absent, telegraph, FB splash ⇒ not downtime)                                                                                                                                                  |
| QTE phases                          | OWNER-AUTHORED                      | owner declares onset times, durations, `circleDamageCounts`, `gaugeFills` from playing the fight; toolchain never derives these                                                                                                                                                                                                               |
| Element-lock phases                 | OWNER-AUTHORED                      | owner declares windows + non-advantaged semantics                                                                                                                                                                                                                                                                                             |
| Off-screen / walk transitions       | video-derived                       | boss absent from frame; confirm the per-boss transition length                                                                                                                                                                                                                                                                                |
| Range script                        | video-derived                       | popup class-ratio flips per weapon band (the crown-solo MG method) + visual distance track; output `fromSec/band` rows; note lead/lag ±4-6s approximation                                                                                                                                                                                     |
| Core-exposed uptime                 | video-derived                       | classify.py timeline of red "CORE HIT" popups from a high-core-rate focus unit (AR, auto-aim); windows where damage continues but core popups vanish = core hidden; normalize by that unit's known band core rate                                                                                                                             |
| Boss DEF                            | DEFERRED TO V2 (owner ruling)       | v1 ships `def` as a ⚑ estimate (the known-boss 140, effect ~0.1%/hit per A26 — too small to spend harness on now); the v2 recipe stays on record: real-stats popup arithmetic (unit's real final ATK from its stat sheet — never ⚔ Combat Power, never scope-lock `reference-stats.json` — solve `ATK − DEF` from a clean pre-FB white popup) |
| Hitbox / SG landing                 | video-derived + arithmetic          | the drake solo method (ammo-counter deltas + damage arithmetic, docs/probe-data/sg-pellet-landing.json) on an owner SG solo vs the boss                                                                                                                                                                                                       |
| Element / parts / gimmick inventory | external + video confirm            | datamine + wiki; register sources in `data/sources.json` per the accreditation rule                                                                                                                                                                                                                                                           |

## 3. The flow — mirroring kit-parse end to end

1. **Intake** — owner recording(s) land under `docs/probes/<boss>/`; catalog entry
   (`docs/probe-data/catalog.json`). Alongside the footage the owner supplies the **owner-authored
   block**: QTE phases, element-lock phases, and the recording team's real stat sheets (for DEF
   arithmetic and grading).
2. **Extract (neutral half)** — `scripts/boss-study/extract.ts <video>`: runs the mechanical
   detectors (weapon-state timeline, boss-absence scan, frame sheets around every forced-not-firing
   run) and emits a raw **observation log** `docs/boss-data/<slug>/observations.json` (the
   probe-data analogue: record what was SEEN — times, states, colours, values — never the model).
3. **Author (subagent half)** — `/boss-study` skill, run by a subagent (same pattern as
   `/kit-parse`): input = the observation log + frame sheets + the owner-authored block + any
   datamine/wiki text; output = the `BossProfile` JSON + a per-parameter audit table (MEASURED /
   OWNER-DECLARED / ESTIMATED-⚑ / UNKNOWN-⚑) + the ⚑ list with estimate + recipe each. The
   owner-authored block passes through VERBATIM — the subagent may cross-check it against the
   observation log (a declared QTE should coincide with a forced-not-firing run) and flag
   contradictions, but never adjusts it. Prime directive carries over verbatim: faithful > fit,
   measured > fudge; an honest UNKNOWN beats an invented schedule.
4. **Fable pre-op gate** — before any NEW recording or empirical read, the hypothesis+method plan
   goes through the scientific-method approval subagent (standing rule). Whole-picture consistency
   check is mandatory on every read (§4).
5. **Grade** — `scripts/boss-study/grade.ts <slug>`: sim a comp on the new profile vs the recorded
   per-unit totals + full-burst counts on that boss. Real bosses have no scope lock, so grading
   needs a **real-stats config builder** (the `scopeLockCfg` analogue fed by the owner's actual
   gear/OL/cube/skill levels for the recorded team) — a new harness piece, with its own
   `sanityCheck` anchored to the owner-supplied stat sheets. Also runs the internal-consistency
   gates below even when no graded comp exists yet.
6. **Persist + docs** — profile lands in `data/bosses/`; measurements go to `docs/probe-runs.md`;
   mechanics that generalize go through `/mechanics-doc-upkeep`; rulings to DECISIONS; sources to
   `data/sources.json`; new measured truths become `scripts/regression.ts` asserts.

## 4. Consistency gates (whole-picture, non-negotiable)

Every accepted profile must pass ALL of, before grading even starts:

- **Clock arithmetic**: hittable + downtime + element-lock + transition windows fit `durationSec`
  exactly; no overlapping windows (an element-lock window may NOT overlap a downtime window —
  they're different states).
- **Uptime reconciliation**: the weapon-state uptime fraction × a clean unit's known hot DPS ≈
  that unit's recorded total (the RRH-lesson gate — a locally plausible downtime read that can't
  reproduce the recorded total is wrong).
- **Owner-block cross-check**: every owner-declared QTE/element-lock window must be consistent
  with the observation log (forced-not-firing for QTE; the non-advantaged focus unit's popups
  vanishing for element-lock). A contradiction is surfaced, never silently reconciled.
- **Rotation reconciliation**: full-burst count predicted with the profile's downtime/cast-block
  windows matches the recorded burst-bar timeline (rotation is measured-exact on graded comps
  today; a new boss profile must not silently break that contract).
- **Core arithmetic**: core-popup fraction predicted by `coreExposure` × the unit's band core rate
  matches the classified popup timeline within noise.

## 5. Settled rulings (owner, 2026-07-16) — do not re-litigate without new evidence

1. **No community footage.** All boss-study recordings are owner-made.
2. **Infinite boss HP; everything is time-based.** No health-threshold triggers exist; the schema
   has no health-trigger concept and no boss-health simulation is planned.
3. **QTE phases are owner-authored.** Video calibration of red interrupt circles is out; the
   toolchain only cross-checks declared windows against the weapon-state timeline.
4. **v1 = one real boss end-to-end, non-scope-locked.** Real raid bosses have no scope lock;
   grading runs on real account stats via the real-stats config builder.
5. **DEF derivation deferred to v2** (rev 3): low damage impact (~0.1%/hit, A26) vs the harness
   cost; v1 ships `def` as a flagged estimate.
6. **Face count is the primary forced-cover metric** (rev 3): five simultaneous faces =
   force-covered; it outranks the weapon-state signal (which under-counts when a natural 0-ammo
   reload starts just before an unhittable window).

Also owner-authored by ruling: **element-lock phases** (element-advantage-only damage windows).

## 6. Increment plan

- **Phase 0 — profile extraction refactor (pure, no behavior change).** Add `BossProfile` +
  `data/bosses/scope-lock-raid.json`; move `BOSS_RANGE_SCRIPT` / `UNHITTABLE_FRAMES` / boss DEF /
  core-exposure basis / `SG_LANDING_BY_BAND` behind it; `SimConfig.boss` defaults to it. Gate:
  `verify.sh` green with **byte-identical regression snapshots** (any snapshot diff = the refactor
  isn't pure). `RANGE_ELIGIBLE` (weapon optimal rings) stays in the engine — it's a weapon fact,
  not a boss fact; the boss only contributes the distance timeline.
- **Phase 1 — downtime + element-lock + core-exposure engine mechanics.** Implement the `downtime`
  window semantics, `elementLock` nulling, and `coreExposure` scaling (§1). Gate: scope-lock
  profile has empty `downtime`/`elementLock` + `base:1.0`, so the board is unchanged; add
  synthetic-profile unit tests (e.g. 10% downtime ⇒ hot-DPS-scaled totals within tolerance, burst
  chains re-time correctly; an element-lock window zeroes exactly the non-advantaged units).
- **Phase 2 — toolchain + skill (IN PROGRESS, rev 3).** `scripts/boss-study/` detectors (ammo-box
  tracker + digit-stability, face-count cover scan, FB-splash attribution, fight-clock from UI
  appearance), `/boss-study` SKILL.md, `docs/boss-data/` layout. **First validation = the BLIND
  TEST: run the extraction on `docs/probes/control/crown.MP4` (a known scope-lock probe) with the
  authoring subagent blinded to the known profile; it must recover ~180 s of fight, ~zero forced
  downtime outside the five known range-transition windows (fight-seconds 33/70/106/144/176, each
  ~1 s, walk lead/lag ±4-6 s), zero forced-cover face windows, and attribute every Full-Burst
  cut-in pause to bursts, not boss downtime.** The face detector has NO positive examples in this
  footage — the blind test validates it false-positive-free only; positive calibration waits for
  the first recording with a real forced-cover phase (⚑). `grade.ts` + the real-stats config
  builder follow after the blind test passes.
- **Phase 3 — first real boss study (v1 exit).** The owner picks and records the boss, supplies
  the owner-authored block + real stat sheets; run the full flow; grade the recorded comp. Exit =
  the §4 gates pass + per-unit ratios in a tolerance band the owner accepts for a first
  non-scope-lock basis (real-stats configs are unvalidated territory — expect a wider band than
  the scope-lock board's).

Dependencies on in-flight work: none blocking. The Hit-Rate→core-rate re-derivation (NEXT
INCREMENT fix #2) shares the core-rate model that `coreExposure` multiplies into — land the
HR-clean band re-derivation first so boss core-exposure isn't calibrated against HR-contaminated
bands (same contamination lesson, one layer up).

## 7. Explicitly out of scope (v1)

Multi-part bosses and interruption-part damage crediting; boss-HP simulation (ruled out — infinite
HP, ruling 2); video-deriving QTE phases (ruling 3); modeling QTE break speed from team
composition; community footage (ruling 1); arena/PvP (standing); small-hitbox generalization of SG
landing beyond a per-boss measured table.

## Change log

- 2026-07-16 rev 3 — owner review 2: DEF derivation deferred to v2 (ruling 5); face-count added
  as the PRIMARY forced-cover metric (ruling 6) after the owner spotted the 0-ammo-reload edge
  case in the weapon-state signal; blind test against the known profile on
  `docs/probes/control/crown.MP4` named as the Phase-2 gate; detector design notes added (ammo
  box rides the moving reticle ~90 px left; digit pixel-stability replaces OCR; FB cut-ins must
  be attributed via the splash detector).
- 2026-07-16 rev 2 — owner review: downtime detector corrected to the focus-unit weapon-state
  signal (reload-while-ammo>0 / covered-at-full-ammo); the running-total counter idea REMOVED
  (top-centre only, DoT-contaminated); QTE video derivation removed → owner-authored; element-lock
  phases added (owner-authored); DEF + grading moved to a real-stats basis (no scope lock on real
  bosses); the four open decisions settled as rulings (§5).
- 2026-07-16 rev 1 — initial draft.
