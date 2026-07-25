# VALIDATION INDEX — where the ground truth already is

> **Read this BEFORE deriving any ground truth by hand.** This repo already holds a large labeled
> corpus. The most expensive mistake available here is re-deriving data it already contains — on
> 2026-07-24 a reader review spent ~5 hours and ~6% of a weekly quota hand-reading 7 videos to
> reproduce labels the regression harness already had.
>
> **An existing labeled artifact IS an independent method.** Its labels were produced independently of
> whatever you are deriving right now, which is exactly the property "prove it differently" asks for.
> Running the existing harness against it is a real check, not a shortcut — and when it passes, **the
> bar is MET: say so and act.** (CLAUDE.md → Discipline forcing-functions → SUFFICIENCY.)
>
> CURRENT-STATE doc: rewrite freely, delete stale rows. If you add a labeled artifact, add its row here.

## The 30-second lookup

| If you need… | It is already at… | Score/check it with |
|---|---|---|
| **Does the engine still produce the same per-unit damage?** | `scripts/regression-snapshot.json` (graded comps; hard-fails on >0.1% per-unit drift) | `npx tsx scripts/regression.ts` · `--update` ONLY with the change it reflects |
| **Does a kit primitive behave correctly?** | `scripts/tests/engine/*.test.ts` — block gates, buff application, burst CDR, `durationShots`, event log, flat damage, hit-count trigger, `hitsPerShot`, reload buff removal, target-status gate | `npx vitest run` |
| **Is a specific unit's kit modeled faithfully?** | `scripts/tests/units/*.test.ts` — `ark-ranger-black`, `clean-weapons`, `crown`, `helm`, `liter`, `marciana-marine-study`, `privaty` | `npx vitest run scripts/tests/units/<slug>` |
| **Does the team generator still pick correctly?** | `scripts/tests/generators/*.test.ts` (14 files) | `npx vitest run scripts/tests/generators` |
| **Board-wide sim-vs-real per unit** | every recorded comp, ranked by stability | `npx tsx scripts/board-read.ts` |
| **The support-core control suite** (`liter` / `crown` / `helm` + 4 carries) | `scripts/control-regression-snapshot.json` | `npx tsx scripts/control-regression.ts` |
| **Base-weapon (no-kit) accuracy for the 6 clean units** | `docs/probe-data/clean-weapons-readings.json` — append a run, it re-averages | `npx tsx scripts/clean-weapons-read.ts` (`SMGQUANT=1` for measured cadence) |
| **What a probe video actually showed** (popup values, timestamps, crit/core flags) | `docs/probe-data/<slug>.json` — one file per parsed video; schema + helpers in `scripts/probe/parsed.ts`, format table in `docs/probe-data/README.md` | load the JSON; `scripts/probe/dot-crit.ts` for DoT-crit questions |
| **What footage exists at all, and under what conditions** | `docs/probe-data/catalog.json` (the recordings themselves are gitignored) | `npx tsx scripts/probe/catalog.ts` |
| **The prose findings behind a measurement** | `docs/probe-runs.md` (1,586 lines, 18 sections — the human measurement log) | grep it before assuming a value is unmeasured |
| **Which popup belongs to which unit/hit** | the deterministic expected-hit-value table | `npx tsx scripts/probe/hit-values.ts <focus> <slot1..4> [--boss X]` |
| **A unit's kit text / stats / nicknames** | `data/characters.json` (synergy API sync) | — |
| **Datamined per-shot burst gauge** | `data/gauge-per-shot.json` | — |
| **Per-unit kit tier + open findings** | `data/kit-status.json` (the per-unit finding SSOT) | `npx tsx scripts/kit-status.ts --check` |
| **A blind-rebuild reference for a unit's kit** | `scripts/blind-rebuild/truth/<slug>.truth.json` (~19 units) | — |
| **SG landing / accuracy geometry** | `docs/probe-data/{noir,isabel,guilty,marciana,brid-silent-track}-sg-band.json`, `sg-pellet-landing.json`, `per-unit-sg-landing.json`, `sg-drawn-geometry.json` | `npx tsx scripts/sg-geometry-regression.ts` |
| **Core-rate / hit-rate band data** | `docs/probe-data/coreband*-{chisato-smg,drake-sg,scarlet-ar,moran-ar}.json`, `jill-hitrate-core.json`, `soda-tb-sg-core-hr-windows.json` | — |
| **A per-unit solo/control recon** | `ls docs/probe-data/ \| grep -E 'recon\|solo'` — ~12 files. Trust the FILENAME's slug, not a remembered nickname; several bases have variants (`marciana` ≠ `marciana-marine-study`, `quency` ≠ `quency-escape-queen`) | — |
| **Overload / doll-economy behaviour** | their own snapshots | `npx tsx scripts/overload-regression.ts` · `scripts/doll-regression.ts` |
| **Everything at once (the gate)** | — | `bash scripts/verify.sh` |

## Validating a READER (OCR / VLM / CV), specifically

This is the case that caused the incident, so it gets its own rule.

**The instrument is the existing labeled set, not your eyes.** Run the reader over footage that already
has a parsed record in `docs/probe-data/`, then diff the reader's JSON against that record and report a
per-field score plus every disagreement. Those labels were produced independently of the reader, so the
check is genuinely method-diverse — and it is the *correct* instrument here, not a weaker substitute.

Readers: `read-popups-vlm.ts` · `read-pellets.ts` / `count-pellets.py` · `read-total-damage.ts` ·
`read-burst-gauge.ts` · `read-battle-records.ts` · `read-ammo.ts` · `scan.ts` · `classify.py`.

Free arithmetic checksums that need no new labels at all:
- per-unit Battle-Records totals must **sum to** `total-damage.json`'s final cumulative;
- popup values must fall in a band from `hit-values.ts` for the comp;
- a popup that persists across N frames should decode identically in all N.

⚠ **Do not confuse two different rules.** *"Re-running a VLM reader is not a confirmation route"*
(CLAUDE.md) governs **confirming a measured VALUE** — a deterministic decoder repeats its own mistakes.
It does **not** govern **validating a READER**, where the labeled set is exactly the right check.

⚠ **`/scientific-method` does not apply to tooling.** It gates damage-model values. Scripts, readers,
tests and docs are gated by `verify.sh` + these fixtures. See the skill's CHEAP LANE section.

## If nothing here covers it

Say so **explicitly**, and state the cost **before** starting. Then prefer **building a reusable
committed fixture** over a one-off hand derivation — a fixture answers the question permanently and adds
a row to this table; a hand derivation answers it once and leaves nothing behind.

In an unattended run, the image-read budget will deny frame reading past its cap
(`NIKKE_IMAGE_BUDGET`), because that is the shape this failure always takes. That deny is not an
obstacle to route around: it means *stop and report what would settle the question*.
