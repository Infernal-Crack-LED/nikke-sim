---
name: probe-processing
description: Process a NIKKE probe recording (damage screenshot + video) into measurements — totals, full-burst counts and rotation anatomy, per-popup damage values, gauge-bar readings, pellet landing. Local VLM/CV reader scripts SURVEY the video into JSON; Opus confirms the load-bearing values and does the analysis (attribution, consistency, reconciliation, rulings). Use whenever new files land in docs/probes/ or a test battery item needs scoring.
---

# Probe processing — recordings into measurements

## COST DISCIPLINE — the failure mode this skill exists to prevent (owner, 2026-07-24)

**This skill's historical failure mode is a 2–3 hour Opus session that produces nothing.** Cause: an
open-ended visual hunt (frame-stepping a countdown, eyeballing popups frame by frame, re-deriving a
numpy scan from scratch every run). Manual LLM frame-reading has a poor track record here — it is
slow, expensive, and has produced misreads that cost more than they saved. So:

- **DEFAULT PATH = ZERO Opus frame reads.** The readers run, you read JSON. If you are about to look
  at a video frame, you have left the default path — say why, out loud, before you do it.
- **BUDGET: ≤3 `frames.ts` calls per video, total.** Each one is batched (`--times` / a `--dur/--fps`
  burst), each targets a NAMED value you already know you need. Hitting the budget is a STOP, not a
  cue to keep going.
- **STOP RULE.** If a question has not resolved after the readers + the budget, **stop and report**:
  what is blocking, what the readers gave you, and **which script would close the gap**. A blocked
  finding written down in 10 minutes beats a 3-hour hunt. Never open-endedly "keep looking".
- **Never re-derive a scan.** If you find yourself writing ffmpeg+numpy for something this skill
  describes, that is a signal to BUILD the script (see MISSING READERS below), not to hand-roll it
  again. Hand-rolled scan code is the single largest recurring token sink in this workflow.
- **Push work down the tier.** Anything mechanical — extraction, scans, contact sheets, running the
  readers — goes to `probe-scaffold` (Sonnet). Opus reads the manifest, not the pixels.

The confirmation duties below are real but SMALL and BOUNDED — each is one batched call against a
value you can name. They are not licence to explore.

## ARCHITECTURE — scripts survey, Opus confirms + analyzes (2026-07-24)

`scripts/probe/read-*.ts` + `count-pellets.py` sample a whole recording with a local VLM/CV and emit
JSON. They are far cheaper than manual frame reads and they cover the whole fight, so they run FIRST
and produce the **candidate** timeline (timer spine, cumulative-total curve, burst-state changes,
pellet events, popup candidates). They do not end the job:

> **TIER RULE — a reader output is a SURVEY, not a measured truth.** Every reader is a 7B VLM or a CV
> heuristic validated on ONE recording. A value becomes measured truth only when it is **confirmed**
> by an independent route. Confirmation is required only for values that will be ENACTED — a
> `scripts/regression.ts` assert, a DECISIONS ruling, an override retune. A reading that is merely
> being reported/logged does not need it; say which tier it is and move on.
>
> **Confirmation routes, cheapest first — always take the cheapest one that works:**
>
> 1. **Arithmetic closure (free, strongest).** The pellet lattice's integer residues, rider
>    count-closure, monotonicity, cadence consistency across bands. A genuine read lands on the grid;
>    a digit misread does not. This confirms without looking at anything.
> 2. **A second script.** Two readers that agree (e.g. a total-damage step vs a pellet event) or a
>    numpy scan vs the burst gauge. Costs Sonnet time, not Opus attention.
> 3. **ONE batched `frames.ts` crop** of the exact instants — last resort, counts against the budget.

Three phases:

1. **Phase 1 — run the readers** (delegate to the `probe-scaffold` subagent, pinned to Sonnet):
   transcode/rotate, overview sheet, the readers the QUESTION needs, the deterministic helpers
   (`hit-values.ts`, `classify.py`, `catalog.ts`), metadata mapping, file organization. It returns a
   MANIFEST of paths + the scripts' own JSON/summaries/warnings — never its own interpretation.
   See `.claude/agents/probe-scaffold.md`.
2. **Phase 2 — validate + analyze the JSON** (you, on Opus): run each reader's trust gate below,
   discard/re-read what fails, then turn what survives into measurements — the damage curve, the
   burst rotation, per-shot landing, cadence.
3. **Phase 3 — judgment you own** (Opus, never delegated): popup→unit attribution under value-band
   entanglement, crit/core confirmation, per-unit totals off the Battle-Records screenshot, the full
   kit audit, whole-picture consistency, sim reconciliation and the rulings.

**Pick readers by the QUESTION, not by inventory.** Most are minutes-long (the pellet counter is
~4.5 min per 60 s of video) and mostly independent:

- a rotation / FULL-BURST question → **`scan.ts`** (~12 s, no model, three built-in cross-checks)
- a CADENCE question → **`read-ammo.ts`** (shots/second, every weapon class) + `read-pellets.ts` for SG landing
- an SG PELLET-LANDING question → the UNIGEO **marker detector** (`scripts/unigeo/marker_detect2.py` +
  `marker_track.py`, ✅ validated _given a disc centre_) via the `read-markers.py` wrapper, or
  `read-pellets.ts` (CV popup survey, ⚑ candidate). **Both already exist — do NOT re-derive a pellet
  counter from scratch.** Caveat: `read-markers.py` now localizes the disc via the proven ammo-box
  template track (crosshair works) but its per-shot counts still UNDER-READ — see its reader-table note.
- a magnitude / lattice question → `read-total-damage.ts`, then **`read-battle-records.ts`** for the per-unit split
- a per-hit question → `read-popups-vlm.ts` on a SHORT `--at/--dur` clip
  Running them all on a whole video by default is wasted wall-clock. NOTE the asymmetry: `scan.ts` and
  `read-ammo.ts` are deterministic CV and cheap; the VLM readers are the slow ones.

> **Server:** the VLM readers call a local OpenAI-compatible vision server (llama.cpp serving
> Qwen2.5-VL-7B) kept alive by launchd on `:8090`
> (`deploy/launchd/com.nikke-sim.model-vision.plist`). If `curl -s http://localhost:8090/v1/models`
> fails, the readers cannot run — fix the server, don't substitute a guess.

> **⚠ RESOLUTION GATE — check `ffprobe` dims BEFORE trusting any reader.** Every reader's default
> crop is pixel-perfect for a **2622×1206** post-rotation frame (timer `crop=59:39:2317:21`, total
> `crop=347:74:1136:11`, gauge `crop=188:82:2428:448`, damage area `crop=1303:396:672:268`). On a
> community submission at another resolution the crops land on empty pixels and the VLM returns
> plausible-looking nulls/garbage rather than an error. Override `--*-crop` (or rescale) first.

> **Give every run its own `--out <dir>`.** All readers default to `$CLAUDE_SCRATCH|/tmp/<name>`, so
> two videos processed in one session silently overwrite each other's JSON.

## Ground rules (violating these has burned us)

- Popups belong ONLY to the camera-focused unit — including damage RECEIVED by that unit's own
  summons (boss hits on cinderella's Decoy show in her stream). Never attribute a popup to a unit
  by value coincidence.
- **Popup COLOUR + POSITION convention (owner-confirmed 2026-07-14):**
  - **crit** = ORANGE number + crit icon to the left (orange outline / white centre). Orange WITHOUT
    the icon is NOT a crit — e.g. liberalio's orange reads are a ×1.3333 FB factor, not crits.
  - **core hit** = RED number + "CORE HIT" above (red numbers are cores even when small — size scales
    with visual distance to the target, not damage).
  - **crit + core** = RED + "CORE HIT" + crit icon (red outline / black centre).
  - **heal** = bright GREEN — NOT damage (e.g. Helm's B3 life-leech-on-attack-damage heals the team).
  - **plain** = WHITE.
  - A crit reads ~×1.333 (not ×1.5) DURING Full Burst, because the base major is already ~1.5.
  - **SPATIAL RULE:** DAMAGE always pops at the CROSSHAIR; HEALS pop over the CHARACTER — separate
    green heals from damage by SCREEN POSITION, not just colour. Cyan/blue numbers = boss hits on the
    focus unit's CROWN SHIELD (not damage). Top-centre + bottom running total = TEAM cumulative.
    Popups are per-hit but can OVERLAP visually.
- **THERE IS NEVER A BOSS HP BAR in recordings (owner 2026-07-19).** The white box with white
  numbers next to the crosshair is the **AMMO COUNTER** — use its decrements as the shot/pull
  clock. Any read of that box as "boss HP" / "HP segments" is wrong by definition. (A video agent
  misread it as a boss HP-segment counter and lost its best denominator; on non-scope-lock footage
  the displayed magazine can exceed the datamined base — overload-gear Max-Ammo lines — so an
  unexpected count like 17 on a mag-9 unit is still the ammo box, not something else.)
  _Script note:_ `read-pellets.ts` template-matches this box (`ammo-box-template.png`) purely to
  LOCATE the crosshair (it applies a fixed offset); it does not read the digits. The match can lock
  onto an HP-bar-like element — a `--max-template-disp` gate rejects >150 px jumps and carries the
  last good position forward, so a shot read during a jump-run is suspect.
- **NO RANGE DROP-OFF ON DAMAGE VALUES (owner 2026-07-19).** Popup values never change with boss
  distance — range affects ACCURACY only (core-hit and pellet-landing rates via the band). A
  popup-value change over time is a BUFF change, never distance; identical values at mid and far
  are expected, not a finding.
- **IDENTIFY hits by the value table, never by eye.** Before reading, run `scripts/probe/hit-values.ts
<focus> <team…> --boss <E>` to get every hit type's value band for the focus unit; map each popup
  value to a band. Skipping this burned us: LM's 64733 is her SMG NORMAL (14-68k), NOT her DoT
  (~156-220k in-game); liberalio's proc (1.13-7.73M) fully overlaps her normal charge — value bands
  that overlap CANNOT be attributed, so pick a unit/hit with a clean band (or a low-buff window).
- **Battle-Records field map (2026-07-15 — a misread here caused a bogus "13% ATK confound"):**
  - the **crossed-swords (⚔) field is COMBAT POWER** (a per-unit composite of stats+skills) — **NOT
    Combat ATK.** The red damage bar = total damage dealt; shield = damage taken; asterisk = healing.
  - **ATK is CLASS-BASED** — same-class units have IDENTICAL base ATK (scope-lock: Attacker 118,027 /
    Supporter 98,367 / Defender 78,707, per `data/reference-stats.json`). **INVARIANT: if a "stat"
    varies across same-class units at the same gear, it is NOT ATK.** Never read ATK off the screen;
    use the sim's `staticAtk` / the reference file. (NB: the older ~120,143 Attacker value was the
    OL0-gear basis; scope-lock Base-5 is 118,027 — a gear-level difference, NOT treasure.)
- **SCREEN-NUMBER DISCIPLINE:** before using ANY number read off a screenshot/video downstream, (1)
  NAME the field (what stat is it?), and (2) CROSS-CHECK it against a reference anchor
  (`data/reference-stats.json`) or a known value. An un-named, un-anchored number compounded across
  turns is how a single misread becomes a phantom finding. **This applies to reader output verbatim** —
  a VLM total or timer that fails its anchor check is a misread, not a datum. When you build a sim
  harness to compare against a recording, run it through the scope-lock SSOT + `sanityCheck` (below) —
  never hand-roll a config.
- Burst-bar / burst-gauge full-burst detection near cut-ins produces false positives — confirm counts
  with a second instrument (FB splash scan and/or nuke/laser signature, below).
- The team bar's full-resting render = 83.5% of pixel width; ≥96% = pre-chain glow only.
- Check for aborted first attempts: map the video's segments with a 1-frame-per-8s overview sheet
  before reading anything.
- **The in-game clock DRIFTS vs video time (~2s over a fight** — stagger/transition freezes pause
  game-time). Never band-tag by clock arithmetic alone; band by VISUAL boss size (core diameter)
  and use the clock only as a coarse locator. Also: the ammo box turns RED at low ammo (don't
  conflate with core popups), and pink impact rings are a general hit effect, not core-specific.
- **FB TIMING/COUNT ANCHORS TO THE 3:00-TIMER-START; the pre-timer video is a LOAD SCREEN, NOT
  "human startup lag" (owner ruling 2026-07-21).** The recording opens on a load screen; the in-game
  3:00 timer only starts ticking once it ends (confirmed on `chisato.mov`: at video 8.0s NO timer is
  rendered — still loading — and it appears by ~8.5s already reading 02:59). So establish **game t0 =
  the 03:00→02:59 frame** and measure every full-burst time from THERE — never from video t=0.
  ⚠ **Find t0 with ONE coarse timer sheet, NOT a frame-by-frame hunt** (that hunt is what burned a
  multi-hour session): `frames.ts <video> --at 3 --dur 10 --fps 2 --region timer --sheet 5 --zoom 3`
  puts the whole load→02:59 transition on one sheet. **t0 to ±0.5 s is plenty for band-level reads**
  (bands are ~37 s apart); only for FB _timing_ to ±0.1 s do ONE refine sheet on that single second
  (`--dur 1 --fps 10`). Never sub-refine below ~3 frames. The sim's FB times are from fight t0, so
  compare footage FB times **re-anchored to the 3:00-start**. Do NOT explain away a sim-vs-footage
  first-FB offset as "human startup lag / recorder slop" — re-anchor precisely first; a residual that
  survives clean anchoring is a REAL signal (rotation cadence / a post-timer unit-deploy delay), not
  player slowness. (This corrects the framing that dismissed FB-count gaps as startup-lag confounds —
  e.g. the U16 ludmilla-winter-owner / rosanna-chic-ocean 13-vs-12 read, and the chisato-comp 13-vs-~11
  read.)

## Phase 1 — the reader scripts (run via `probe-scaffold`)

Flags below are what the CODE parses; where a default is noted the script's own header comment may
disagree (`read-pellets.ts`'s header claims `--fps 30 --zoom 4` and a stale pellet crop — the code
defaults are 60 / 3 / `crop=1303:396:672:268`). Pass the validated values explicitly.

| Reader                                                                                                                                                 | Actually reads                                                                                                                                                                                                                    | Output                                                                                                                                                                                                             | Maturity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `read-pellets.ts <video> --at S --dur S --fps 30 --zoom 2 --out D`                                                                                     | per-shot **pellet counts** from the damage-area popups (CV) + a VLM **timer spine** @1fps + crosshair tracking. **SG-only popup reader; distinct from the UNIGEO pellet-marker counter below.** It does NOT read the ammo digits  | `D/pellets.json` — `reads[]`, `shots[]` `{fightT, white, red, total, core, frames, backendAgreement}`, `summary {totalShots, validShots, expectedShots, avgTotal, avgRed}`                                         | ⚑ CANDIDATE — tuned 2026-07-24 on `marciana-solo.MP4` ONLY. Best run detected **70 of ~90** expected shots, 58 in the 5–10 valid bound, avgTotal **7.6** vs the lattice-measured ≈**8.45**, avgRed 0.19 vs ~0.5 expected. **Do not use its landing average as a landing measurement** (see U35)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `scripts/probe/read-markers.py <video> --out D` (UNIGEO pellet-marker counter; wraps `scripts/unigeo/marker_detect2.py`)                               | per-shot **pellet landing** from the in-game pellet markers (white/red circles inside the grey aim disc) + radial position relative to the disc centre. Requires disc-centre tracking and per-HR scaling. **SG-only.**            | per-shot `{t_video, landed, cores, radii_white, radii_red}` + radial-distribution JSON; consumable by `scripts/unigeo/w1-fit.py` / `w4-part2-fit.py`                                                               | ✅ **VALIDATED 2026-07-22** on `soda tb control.mov` near HR-ON vs owner count: structural match, core totals 10 vs 11, cadence reproduced, recall ~0.70 with radially unbiased misses. **Preferred instrument for SG landing / UNIGEO geometry questions — but the ✅ validation SUPPLIED the disc centre; it covers the marker DETECTION, not the disc-finder.** The `scripts/probe/read-markers.py <video> [--at S --dur S --fps 60 --hr 0 --zoom 2 --crop …] --out D` wrapper (wraps `scripts/unigeo/marker_detect2.py`) localizes the disc via the proven **ammo-box-template crosshair track** (the same locator as `read-pellets.ts`; the HoughCircles `find_disc` is only a no-template fallback) + tracking → `D/shots.json` `{shots[{t_video,landed,cores,radii_white,radii_red}], summary{totalShots,avgLanded,avgCores}}` + `D/discs.json` (per-frame disc centre/radius/conf). Needs `scripts/probe/.venv` (cv2/numpy). ⚠ **Crosshair localization now works** (markers detected on `marciana-solo.MP4`, no longer the 0% of the old HoughCircles finder) **but per-shot counts UNDER-READ** — avgLanded ≈4.4 vs the lattice ≈8.45 / `read-pellets.ts` 7.6 on a 15 s clip. Treat its counts as a survey pending tuning. |
| `read-total-damage.ts <video> [--fps 1] --out D`                                                                                                       | cumulative **team total** + timer @1 fps (the SG-lattice source / damage curve)                                                                                                                                                   | `D/total-damage.json` — `{video, fps, at, dur, reads[{videoT,timerSec,totalDamage}], warnings[]}`; warns on any DECREASE (physically impossible ⇒ misread)                                                         | usable as a survey; individual totals need confirmation before any lattice fit rests on them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `scan.ts <video> [--fps 5] [--t0 S] [--expect N] --out D`                                                                                              | **deterministic CV, NO VLM.** Full-Burst counts + timings from three detectors (gauge drain window / whole-frame golden splash / stage-3 hexagon), burst chain anatomy, nuke signatures. ~12 s per whole video, one ffmpeg decode | `D/scan.json` — `fbCandidates[{videoT,fightT,sources[],confidence,durationSec}]`, `fullWindows[]`, `burstChains[]`, `gaugeStates[]`, `orphanEvents[]`, `nukeEvents[]`, `summary`                                   | ✅ **VALIDATED 2026-07-24 — EXACT on 8 recordings** with independently measured FB counts (11/12/13/13/13/13/14 + the soda-twinkling-bunny control's 10), every burst corroborated by a 2nd detector. **This is the FB-count instrument**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `read-battle-records.ts <shot> [--comp a,b,c] [--total-damage D/total-damage.json] --out D`                                                            | per-unit **totals + slot order** off the end-of-fight Battle Records screen (VLM), with an arithmetic checksum + the ⚔=Combat-Power field map hard-coded                                                                          | `D/battle-records.json` — `units[{slot,slug,totalDamage,damageTaken,healing,combatPower}]`, `checksum{sum,cumulativeTotal,deltaPct,pass}`, `warnings[]`                                                            | ✅ 37/37 numbers exact on two screenshots (2026-07-24). Trust it only when the **checksum closes** — without `--total-damage`/`--expect-total` it is an unconfirmed VLM read                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `read-ammo.ts <video> [--fps 10] [--at S --dur S] [--expect-rate N] --out D`                                                                           | **ammo-counter digits** per frame → firing runs → **rounds/second** (deterministic digit-atlas template match; abstains rather than guessing)                                                                                     | `D/ammo.json` — `reads[]`, `reloads[]`, `runs[{startT,endT,from,to,roundsPerSec,r2}]`, `cadence{overall,median}`                                                                                                   | ✅ SMG validated in TWO range bands (20.31 / 20.32 per s, r²=1.00), reproducing the hand read that settled the SMG cadence. ⚠ **small-magazine SG not yet readable** (~29% of frames, no usable run)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `read-burst-gauge.ts <video> [--classifier cv\|vlm] [--fps 5] [--t0 S] [--sim <slug,…>] --out D`                                                       | burst-gauge **state** per frame → debounced **state CHANGES** + FB count, optional sim compare. `--classifier cv` (DEFAULT) delegates to `scan.ts`; `vlm` is the old per-frame model read, kept for A/B                           | `D/burst-gauge.json` — `reads[]`, `transitions[{videoT,timerSec,fightT,from,to}]`, `fullBursts`, `cv{detectors,summary,fbCandidates,fullWindows}`, `simTransitions[]?`                                             | **cv**: validated as above. **vlm**: ⚠ do NOT count full bursts off it — on a 30 s LM window it reported SIX transitions into `full` (the CV reads 2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `read-popups-vlm.ts <video> --focus <slug> [--boss E --comp a,b,c --fps 5 --at --dur --crop --min-looks 3 --min-agreement 0.75 --save <slug>] --out D` | damage **popups** (value, crit/core, position) + timer, deduped across frames, each scored for **confidence** (agreeing looks / total looks) and **band membership**                                                              | `D/popup-reads.json` — per-frame raw + deduped popups with `confidence`/`inBand`/`bands`/`autoAccept`, split into `autoAccepted[]` + `needsConfirmation[]` (with a ready-made batched `frames.ts --times` command) | **PROVISIONAL.** The confidence split is live, but the AUTO-ACCEPT path is **unexercised** (see below) — in practice treat every popup as needing confirmation and use `needsConfirmation[]` as the batched worklist. `--save` now persists ONLY auto-accepted popups                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Deterministic helpers (no VLM): `hit-values.ts <focus> <team…> --boss <E>` (the value-band table —
ALWAYS run first; the attribution key), `classify.py` (popup colour classifier), `catalog.ts`
(recording index), `frames.ts` for ad-hoc extraction (below). UNIGEO geometry helpers:
`scripts/unigeo/gen-coverage.py` (rebuilds per-band coverage profiles from an owner-traced silhouette),
`scripts/unigeo/w1-fit.py` / `w4-part2-fit.py` (score candidate core-diameter / landing series against
measured cells), and `scripts/probe/read-markers.py` — a runnable SG pellet-marker counter that wraps
`scripts/unigeo/marker_detect2.py` + `marker_track.py` and locates the disc via the proven ammo-box
template crosshair track (machine-reads pellet markers for SG landing/radial distribution). ⚠ The
crosshair lock works but per-shot counts still under-read vs the lattice; the validated part is the
marker detection — count tuning is outstanding.

### Trust gates — run these in Phase 2 before a reader number is used

- **Timer spine / `fightT` (all readers).** `read-burst-gauge.ts` computes
  `fightStartVideoT = videoT + timerSec − 180` from **the FIRST read that has a timer** — a SINGLE
  anchor, exactly what the counter-reconciliation rules forbid. One VLM timer misread shifts every
  `fightT` by the size of the misread. Cross-check `fightStartVideoT` against the visual 03:00→02:59
  flip (one timer sheet) and against ≥1 later read (`videoT + timerSec` should stay ≈ constant); if
  it drifts, correct it before comparing anything to the sim.
- **`total-damage.json`.** Any `warnings` entry ⇒ discard that read. Then check monotonic slope
  plausibility, and confirm the 2–3 totals a lattice fit actually leans on with a full-res
  `frames.ts --times "t1,t2,t3" --region total --zoom 3`. The lattice itself is the strongest gate:
  a genuine read lands on the integer per-pellet grid, a digit misread does not.
- **`scan.json` (the FB count).** `summary.fullBursts` is the count; `summary.corroborated` says how
  many of them a SECOND detector saw. Gates: `corroborated` should equal `fullBursts` (a
  drain-window-only burst is a splash the background washed out — plausible, but say so);
  `orphanEvents[]` must be empty (an event matching no window is a missed render or a false
  positive); `summary.minGap` ≥10 s and `maxGap` ≤2× `minGap` (real full bursts are ~13–34 s apart).
  The script prints a ⚠ for each. `fullWindows[].durationSec` are RENDERED widths (~8.2 s for a
  nominal 10 s window) — compare them to each other, never as an absolute duration.
- **`burst-gauge.json`.** `transitions[]` are ALL state changes, not full bursts — the FB count is
  the number of transitions with `to === "full"`, and it equals `scan.json`'s under `--classifier cv`.
  ⚠ With `--classifier vlm` do not count full bursts at all (it read 6 in a 30 s window).
- **`ammo.json`.** `readRate` is how many frames yielded a value (abstentions are correct
  behaviour, not failure); `rejected` counts monotonicity violations discarded. A cadence is
  trustworthy when several `runs[]` agree, each with `r2` ≈ 1.0. `cadence.overall` is weighted by
  rounds spent, so one long run dominates one short one — check `runs[]`, not just the headline.
- **`battle-records.json`.** `checksum.pass` is the gate. Without a checksum the read is a survey.
  Any `warnings[]` entry ⇒ do not use the values.
- **`pellets.json`.** Compare `summary.totalShots` against `summary.expectedShots` (which just assumes
  1.5 shots/s — SG) and against the cadence you measured off the ammo counter; a >10% shortfall means
  missed shots, so the per-shot histogram is truncated, not merely noisy. `backendAgreement` and the
  5–10 valid bound flag individual bad shots.
- **`popup-reads.json`.** Every load-bearing value gets a full-res frame confirmation (value + colour
  - position) before use. Bands that overlap can't be attributed at all (see Phase 3).

## Fire cadence — ONE call, four numbers (2026-07-23)

**No longer a hand read (2026-07-24):** `scripts/probe/read-ammo.ts` reads the counter digits
deterministically and fits rounds/second per firing run.

```sh
npx tsx scripts/probe/read-ammo.ts "<video>" --at <t> --dur 20 --out <dir> [--expect-rate 20]
# slow, small-magazine weapons (SG): add --min-run 4 --min-rounds 3
```

It locates the box with the same `ammo-box-template.png` track the pellet counter uses (the box is
crosshair-anchored and SLIDES across the frame as the boss changes band), reads the glyphs against a
fixed-font digit atlas, and ABSTAINS on a weak match rather than guessing. Monotonicity does the
confirming for free: ammo only ever rises at a reload, so a read that climbs mid-run is discarded.
Repeat in a second RANGE BAND (a rate that holds across bands is the weapon's, not one moment's).

⚠ If it returns no firing runs, fall back to the two-frame hand read: `frames.ts <video> --times
"<t>,<t+0.5>" --region ammoband` and read the counter (`076` → `066` = 10 rounds = **20/s**). Put
both timestamps in ONE `--times` list. If the counter is unreadable there, that is a STOP (report
it), not the start of a frame hunt.

Cadence splits the two ways a bare-weapon total can be wrong: `total = shots × damage-per-shot`.
**Then check frame quantization.** The game fires on 60 fps boundaries, so a datamined `rate_of_fire`
is only achievable if `60 / (rate_of_fire/60)` is a whole number of frames; otherwise the interval
rounds UP and the effective rate is `60 / ceil(frames)` (SMG: 1440 rpm = 2.5 frames → 3 → 20.0/s,
matching the counter exactly). A datamined value can be right about the NOMINAL rate and wrong about
the EFFECTIVE one — see `docs/modeling-priors.md`.

Corollary for choosing instruments: **FB counts measure gauge/second; the ammo counter measures
shots/second.** Not interchangeable — a cadence question answered with FB counts will not
discriminate. (The 2026-07-17 SMG 20→24 adoption had only FB counts and could not see it.)

## Full-burst counts — ONE command, three built-in instruments (2026-07-24)

```sh
npx tsx scripts/probe/scan.ts "<video>" --out <dir> [--t0 <s>] [--expect <n>]
```

That is the whole job: ~12 s, one ffmpeg decode, no model, and it runs all three detectors and
cross-checks them itself. **Do not hand-roll a scan** — the prose recipes below are what `scan.ts`
implements, kept here as documentation of its constants (which are measured calibrations: do not
refit them).

What it keys on, and how the three fail differently — which is why agreement between them counts:

- **Full-Burst DRAIN WINDOW (the spine).** The burst-indicator widget draws a magenta bar that
  resets at the burst and DRAINS to zero over ~8.5 s of rendered width. Being an ~8.5 s signal, no
  sampling rate can miss it, and it carries its own plausibility checks (uniform duration, peak fill
  ~0.95, ≥12 s spacing). This detector matched the measured count on **all 8** validation recordings.
- **FULL BURST splash (yellow-dominance scan, independent screen region):** yellow fraction
  (`r>150, g>120, b<120, r+g>2b+100`); on a WHOLE-frame 64×30 downscale the banner dilutes to
  ~0.11–0.16 (background ~0.02) — hence the **0.11** threshold, with a **≥10 s minimum gap** to
  reject cut-in echoes (which cluster ~7 s after a real one). It keys on the golden burst-SEQUENCE
  flash, NOT a literal "FULL BURST" banner. ⚠ Bright/grey backgrounds dim it: it caught only 5 of 13
  on the LM control, which is exactly why it corroborates rather than gates.
- **Stage-3 hexagon.** The burst chain renders green "I" → yellow "II" → red "III" hexagons at the
  widget's left edge, ~0.4 s each; the red one precedes the Full Burst. ~80% recall (a screen-wide
  colour wash hides it), and it also gives the chain anatomy in `burstChains[]`.
- **Nuke/laser signature** (cindy-class): blue dominance (`b>150, b>r+30`) >25% of frame. Reported
  with a `nearFullBurst` flag — most blue events are the FB cut-in flash, not a nuke.
- ⚠ **The "team burst bar" (`crop=200:14:2420:478`) and the solo meter (`crop=142:12:2470:488`) are
  SUB-STRIPS OF THE GAUGE CROP** (188×82 @ 2428,448 spans x 2428–2616, y 448–530). They are NOT an
  independent instrument — they re-measure the same drain bar more coarsely, and their ≥95%→<50%
  "drop" fires when the drain crosses half, not at the burst. `scan.json` keeps them under
  `diagnostics`, deliberately excluded from the corroboration count.

**Provenance of the thresholds:** the splash recipe was validated on the 9-team 714-noon batch
(2026-07-14, 6/9 exact vs sim); `scan.ts`'s three-detector merge was validated 2026-07-24 on 8
recordings whose FB counts were measured independently — `probe u7` 12 + 13, `rrh probe` 11/13/13/14,
`windweak t257` 13, and the soda-twinkling-bunny control's 10 — **exact on all 8**, with every burst
corroborated by a second detector. That is the standard a replacement has to beat.

## MISSING READERS — the worklist (2026-07-24: 1, 2, 3 and 5 are BUILT)

Every hand read left in this skill exists because a script doesn't. Each recurrence costs more than
the script would. When one of these bites, propose building it rather than doing it by hand again.

- ~~1. `scripts/probe/scan.ts`~~ **BUILT + VALIDATED** — deterministic CV, exact FB counts on 8
  measured recordings. It replaces the hand-rolled numpy scans this skill used to describe in prose.
- ~~2. `scripts/probe/read-ammo.ts`~~ **BUILT** — digit atlas + template match. SMG validated in two
  bands. ⚠ **Gap left:** small-magazine SG (`marciana-solo`) reads only ~29% of frames and yields no
  usable firing run — its counter is 1–2 digits and the box template locks weakly (conf ~0.43 vs
  ~0.73). Close that when an SG cadence question needs it; the pellet counter covers SG today.
- ~~3. Battle-Records reader~~ **BUILT** — `read-battle-records.ts`, VLM + arithmetic checksum.
- **4. `read-pellets.ts` validation beyond `marciana-solo.MP4`** + closing its ~22% shot shortfall,
  before its landing histogram can speak to U35. **STILL OPEN** (a validation obligation, not a build).
- ~~5. A confidence threshold for `read-popups-vlm.ts`~~ **BUILT, but the auto-accept path is
  UNEXERCISED.** The scoring (agreeing looks / total looks + band membership + class consistency)
  ships and produces a ranked `needsConfirmation[]`, which is the practical win. It auto-accepted
  **0 of 30** popups on the one hand-read probe available, because that focus unit's value bands
  overlap outright so no value can pin a class. **Do not treat an `autoAccept` as proven** until a
  focus unit with a CLEAN band trips it — and when one does, check it against a hand read first.
  **Tracked as open-questions U36**, which carries the how-to: run `hit-values.ts` FIRST and pick a
  focus unit with a hit whose band clears its own crit/core images, then hand-check what it accepts.

## Phase 2 — analyze the JSON (Opus)

- **Damage curve / totals** (`total-damage.json`): the running total per band is the SG-lattice
  source — fit the per-pellet lattice, decompose landing, count-close riders (Counter-reconciliation
  below).
- **Burst rotation** (`burst-gauge.json`): `to === "full"` transitions give the FB count and timing
  (re-anchored to fight t0 — after the timer-spine gate); `--sim <slugs>` prints observed-vs-sim
  nearest-match deltas. Judge a rotation change by FB-count preservation, not by the aggregate ratio.
- **Pellet landing / cadence** (`pellets.json`): per-shot counts + shot spacing. Treat the histogram
  as a shape to compare against the lattice decomposition, not as a landing measurement in its own
  right until the counter is validated beyond `marciana-solo`.
- **Popups** (`popup-reads.json`): candidates only → confirm, then attribute (Phase 3).
- **Damage SCREENSHOT (end-of-fight Battle Records)** — run `read-battle-records.ts` (pass
  `--total-damage <total-damage.json>` so the arithmetic checksum closes it). Fall back to ONE `Read`
  of the still image if the checksum fails or no total is available — it is a static, high-contrast
  screen, not a frame hunt, and it does not count against the `frames.ts` budget. Per-unit totals in TEAM SLOT order (focused unit = middle slot),
  field map in the ground rules, repeatability vs prior runs of the same comp (±3%).

## Phase 3 — judgment you own (Opus)

- **Popup → unit ATTRIBUTION** via the `hit-values.ts` value-band table. Entanglement caution: a
  DoT/proc hit can share a value band with the unit's normals (LM's 63.36% DoT ≈ her buffed SMG
  normals; liberalio's 202.5% proc overlaps her charge shot) — isolate by a low-buff pre-FB window
  where the bands separate before calling crit-vs-not. Overlapping bands CANNOT be attributed at all;
  pick a unit/hit with a clean band.
- **crit/core CONFIRMATION** of provisional popup reads — **only for popups a conclusion rests on**,
  and prefer the free route: pair a suspected crit against its non-crit sibling by RATIO (×1.5 = crit;
  the unit's measured FB factor = FB bonus) or map it to a `hit-values.ts` band. That is arithmetic,
  not a frame read. Fall back to the colour convention on a frame only when the ratio is ambiguous,
  and batch every such instant into ONE `--times` call.
- **Sim predictions to compare against:** `ONLY=<comp> DBG_UNIT=<slug> DBG_N=<n> npx tsx
scripts/experiment.ts` dumps per-instance bucket decompositions; `DBG_BUFFS=1` adds live buffs;
  `ROT=1` dumps the rotation log; `SEEDS=N` gives Monte Carlo distributions.
- **Popup comparison arithmetic:** popups are single instances — recompute the sim's expected value
  **without the crit/core expectation folded in** (the dbg line's `major` is the expectation form).
  Comparing a single popup against an expectation-form number is a guaranteed false mismatch.
- **Whole-picture consistency** across units/totals/rotation, then the rulings.

## Ad-hoc extraction — `frames.ts` (batch, never frame-by-frame)

For inspection the readers don't cover. The recordings are ~350 MB / 60 fps; cost is process-boots and
re-decodes, not per-seek work — **never loop a single-frame command** (one run spent ~3 h frame-stepping
the 03:00 countdown).

- **Many scattered timestamps → ONE call:** `frames.ts <video> --times "12,49,86,123,160" --region
total --zoom 3` fast-seeks each inside a single process.
- **A dense window → ONE burst:** `--at <t> --dur <w> --fps <n> [--sheet <cols>]` is a single decode.
- **Region presets** crop in-pass: `timer` (countdown), `total` (top-centre cumulative DMG),
  `ammoband` (full-width crosshair-height strip — the ammo box slides with the crosshair, so crop the
  band, don't chase a fixed box), `crosshair` (=damage), `character` (=heal), `full`.
- **Finding game t0:** one coarse timer sheet, at most one refine (see the FB-timing ground rule).
- Rule of thumb: if you're about to run `frames.ts` more than ~3× for one video, you want `--times`
  or a `--dur/--fps` burst instead.

## Full kit audit — MANDATORY when tuning any unit (owner requirement 2026-07-14)

Before concluding WHY a unit reads off, report its FULL kit to the owner **line by line**, each
marked IMPLEMENTED or SKIPPED — and for every IMPLEMENTED line, **code- AND run-validate** it.
"Present in the override" is NOT "working": two verified-present effects were silently inert
(LM's `teamAmmo` fired ~once not ~20×; Crown's team-ATK buff used a fixed-cadence proxy instead of
the real heal trigger). A drop mislabeled "correctly skipped" hides real damage — the owner caught
Helm's "defensive" 0.59% heal being the trigger for Crown's team ATK ▲ only because they know the
supports; the audit must surface it every time.

1. Dump the kit: `npx tsx scripts/kit.ts <slug>` (prose + parsed blocks + warnings) and the
   parser-only warnings (`resolveSkills(c, undefined)`) to see what the parser drops.
2. For EACH prose line: IMPLEMENTED (which override/parser block) or SKIPPED (state the reason —
   and challenge "defensive": is it a TRIGGER for a teammate's buff? a heal-synergy? see
   docs/modeling-priors.md prior 8).
3. RUN-VALIDATE each IMPLEMENTED line: DBG the exact team frame (`DBG_UNIT/DBG_GAUGE/DBG_BUFFS`)
   and confirm the block actually fires at the right RATE (not once, not never). Report firing
   counts, not just presence.
4. Present the table to the owner; only then localize the value/rate error.

## Persist the parse — MANDATORY going forward (owner requirement 2026-07-14)

The raw recordings under `docs/probes/` are gitignored (private media); reading popups off video
is the expensive step. So every parsed probe video gets a **tracked** record under
`docs/probe-data/<slug>.json` (schema + helpers: `scripts/probe/parsed.ts`; docs:
`docs/probe-data/README.md`) capturing:

- **the file paths** — `video`, `screenshot` (damage screen), `probeDir` — so we can return to the
  exact evidence;
- **the testing parameters** — `params` (basis, sync, skillLevels, gear, cube, coreLevel, treasure,
  bossPartless, durationSec, focusReason) — the historical context of what the test pinned;
- **the popups** — `t`, `value`, `crit`/`core` (colour), `kind`, `note`.

Reader JSON lives in scratch and is NOT tracked — copy the CONFIRMED values into the probe-data
record (and the reader command line into the note) so re-review is a JSON load, not another video
read. Record what was SEEN (colour/value/position), not the sim's prediction; sim comparison happens
in the analyzer. Never promote an unconfirmed VLM read into this record (that is what
`read-popups-vlm.ts --save` would do).

**Video-reading toolchain (`scripts/probe/`):**

- `hit-values.ts <focus> <team…> --boss <E>` — per-unit hit-value table (ALWAYS run first; the
  attribution key).
- `frames.ts <video> --at <s> [--dur --fps --region … --sheet --zoom]` OR `--times "t1,t2,…"` —
  ffmpeg extraction (see Ad-hoc extraction above).
- `read-pellets.ts` + `count-pellets.py` (+ `ammo-box-template.png`) — SG pellet counter + timer spine.
- `read-markers.py` (Python, `scripts/probe/.venv`) — SG pellet-marker counter; wraps the UNIGEO
  `scripts/unigeo/marker_detect2.py` + `marker_track.py` and locates the disc via the proven ammo-box
  template crosshair track (HoughCircles `find_disc` is only a fallback). Marker detection is ✅
  validated _given a disc centre_; the crosshair lock works but per-shot counts under-read (tuning TBD).
- `scripts/unigeo/marker_detect2.py` + `marker_track.py` — the UNIGEO pellet-marker detector + temporal
  tracker (relocated from the gitignored `docs/probes/drawn-geometry/` so they are tracked).
- `read-total-damage.ts` — cumulative-total + timer time series.
- `scan.ts` + `scan-frames.py` — deterministic CV scan: Full Burst counts/timings (three
  detectors), burst chain anatomy, nuke signatures. NO VLM. The FB-count instrument.
- `read-ammo.ts` (+ `ammo-atlas/`) — ammo-counter digits -> firing runs -> rounds/second.
- `read-battle-records.ts` — per-unit totals off the end-of-fight screen + arithmetic checksum.
- `hit-bands.ts` — the hit-value band table as a library (`computeHitBands`/`matchBands`); shared by
  `hit-values.ts` and the popup reader's in-band check so the two can never drift apart.
- `read-burst-gauge.ts` — burst-state timeline + transitions + optional sim compare.
- `read-popups-vlm.ts` — damage-popup reader (PROVISIONAL; Opus confirms + attributes). Classical CV
  can't separate popups from the bright moving boss (confirmed on `marciana-solo.MP4`) — this is the
  semantic route. Test on a short `--at/--dur` clip before any longer run.
- `classify.py <img-glob> [--region … --rate]` — popup colour classifier (numpy+PIL, no OCR):
  confirms heal-vs-damage by region and flags which frames carry crit/core colour. Present-fraction
  is APPROXIMATE (overlapping popups inflate it) — not a precise crit rate; confirm vs value reads.
- `parsed.ts` — persist/validate (schema above). `catalog.ts` — recording index
  (`docs/probe-data/catalog.json`; add an entry per video). `dot-crit.ts` — crit-signature analyzer.
- `fb-range-lab.ts` — FB/+range heuristic lab: A/B-grades the `FBRULE` engine knob (perkit/timing/
  dotfb/seqoff/noskillfb) vs the board + holds the measured FB ground truth. Use when reading a
  skill/DoT popup IN-FB vs OUT-FB to pin whether that instance gets the +50% Full Burst.

## Scope-lock test harness — SSOT (2026-07-15)

Every sim-vs-recording comparison runs on the SAME fixed basis; the ONLY per-test variable is the
boss ELEMENT. Do NOT hand-roll a `SimConfig` (that is how a core-0 drift caused a phantom ATK
confound).

- **Build configs via `scopeLockCfg(slugs, bossElement)`** (`scripts/lib/scope-lock.ts`) — it bakes
  the basis: DEF 140, core exposure 100%, core 7 (copies 10), Base-5, sync 400, range on, 180 s.
- **Per-element runners:** `npx tsx scripts/sim/{fire,water,wind,electric,iron,neutral}.ts <slug…>`
  (neutral = forced no-advantage / "none"). Each prints a **`sanityCheck`**: `staticAtk` vs the
  scope-lock reference (`data/reference-stats.json`) + same-class ATK uniformity. A mismatch prints a
  loud CONFIG-DRIFT FAIL — proven to catch the exact core-0 bug (staticAtk 104,615 vs ref 118,027).
- Reconciliation example: `scripts/solo-recon.ts` (sim 1-unit no-FB vs the damage-screen totals).
- **VARIANT/TREASURE pre-check before any RECONCILIATION** (2026-07-15): confirm the sim unit's variant + `treasure` state (characters.json) matches what was recorded. `treasure:true` = the sim models the unit WITH its Treasure/favorite item (stat/skill boost); if the owner recorded WITHOUT it (doesn't own it), totals aren't comparable and the reconciliation is confounded (e.g. sim `drake` is treasure=true vs a base-Drake recording). Direct core-RATE popup counts are treasure-INDEPENDENT (aim geometry); only TOTALS are affected.

## After measuring

- Results go in `docs/probe-runs.md` (human-facing, no invented codes); resolved open-questions
  move to `docs/answered-questions.md` with the measurement (single U-numbering); settled rulings go
  to `docs/DECISIONS.md`.
- **State the instrument and its tier** in whatever you write: "VLM reader, unconfirmed" and
  "popup-confirmed on frame X" are different evidence. A reader-only number is an observation, never
  an enactment trigger (CLAUDE.md point 7).
- **Accreditation:** if the measurement pulled a value or method from an EXTERNAL source (a datamine,
  a JP/KR/EN research post, an official tool), register/extend that source in `data/sources.json`
  (see docs/CONVENTIONS.md → Accreditation). Our own scope-lock recordings are MEASURED (not external).
- If a unit was TUNED (measured/calibrated/validated against this fight), record it in the
  authoritative hand-tuned record: add/update its row in `docs/hand-tuned.md` AND its entry in
  `data/hand-tuned.json` (`tier`, `tuned:true`, `evidence`, `date`). The hand-tune batch script
  reads that JSON for its control-group supports, so it must stay current.
- New measured truths (FB counts, verified popup values) become asserts in `scripts/regression.ts` —
  confirmed values only, never a bare reader output.
- Run `/mechanics-doc-upkeep` if a mechanic changed; `/skill-maintenance` if the extraction taught
  a new trick (fold it into THIS skill's steps).

## Verify

```sh
bash scripts/verify.sh
```

## Counter-reconciliation reads (SG gold standard) — hardened rules (2026-07-16)

Now driven by `read-total-damage.ts`'s cumulative-total series (`total-damage.json`), from the
isabel/guilty/brid-silent-track solo band-read campaign (docs/probe-data/*-sg-band.json):

- **Pin the ATK basis from the DATA, not a fixed control value:** the per-pellet quantization step
  (integer-lattice fit over all deltas) + popup values + any deterministic rider fixed-value pin the
  in-fight ATK term to ~0.01%. A fixed "near band must read M=1.281" gate encodes the FALSE premise
  that near landing is a universal constant (measured per-unit 0.81–0.94) — treat near M as a
  measurement, control the basis via the lattice.
- **Never trust a single timer anchor:** both 2026-07-16 reads found game-clock-vs-video drift
  (one uniform 2.07% fast, one non-constant). The readers' timer spine is itself single-anchored
  (see the trust gate) — read ≥4 timer anchors across the fight; if drift shows, make the
  drift-corrected game clock primary and report the video-clock variant per band. Where the unit's
  lattice changes at the near boundary (SG range bonus → non-mult-5 residues), the EMPIRICAL band
  boundaries are directly visible in the deltas — report them vs the nominal script windows.
- **The pellet lattice reads landing directly:** in the near band (per-pellet major 1.3) the delta
  decomposes into landed-pellet count + crit/core composition (U = 13L+5J+10C in units of step/10) —
  a per-shot landing histogram, popup-verifiable shot by shot. Off-near (major 1.0) the lattice still
  gives exact shot composition. The scope-lock in-fight ATK term reads ~+1.6% above the static
  reference on ALL three SG probes (open-questions U18) — expect the elevated step. The lattice
  OUTRANKS `pellets.json` where they disagree (it is arithmetic closure; the counter is a CV heuristic).
- **Riders separate cleanly:** deterministic fixed values that sit OFF the pellet grid; count-closure
  them exactly (brid-silent-track: 43 = floor(215 pulls/5), fires ~6f after the triggering pull).
