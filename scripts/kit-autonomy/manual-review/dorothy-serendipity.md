# dorothy-serendipity — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Dorothy: Serendipity (`dorothy-serendipity`, aka `ds`/`sdoro`) — Water · SG · Attacker · Burst III ·
40s CD · ammo 9 · reloadFrames 111 · chargeFrames 0 · hitsPerShot 10 · normalAttackMultiplier 201.5 · Pilgrim
OVERSPEC. **This is the SG variant — a different unit from the AR/Water base at slug `dorothy`; never conflate.**

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (10 FAITHFUL, 2 DOCUMENTED_GAP) ·
**0 silent drops, 0 REAL-GOTCHA, 2 non-blocking FIDELITY residuals** · S2b claude-fable-5, S5/S6/S7 claude-opus-5
(all cross-family). Both blind models independently re-derived every load-bearing line; S2b and S6 independently
named the _same_ two tricky points the driver had already resolved by measurement (the pellet-vs-round trigger
and the pierce rounds-vs-seconds window). The S7 judge ruled the driver **strictly more faithful** than the blind
on the pierce window (exact 3-shell window vs the blind's argued `durationSec 2.2`) and the pellet clamp
("fixed at 1" honoured literally — the burst's +5 is dropped, not summed to 6).

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Flash)** ■ Activates when hitting the target with 80 pellets. Affects self.
  - Gains Pierce for 3 round(s).
  - Hit Rate ▲ 98.18% for 3 round(s).
  - Attack damage ▲ 72% for 3 round(s).
  - Pellet count is fixed at 1 for 3 round(s).
  - ■ Activates when hitting the target with 160 pellets. Affects self.
  - Expands Pierce range by 200% for 3 round(s).
- **S2 (Radiant Wings)** ■ Activates at the start of battle. Affects self.
  - Pierce damage ▲ 55.08% continuously.
  - ■ Activates only during Full Burst. Affects self.
  - ATK ▲ 75.24% continuously.
  - Hit Rate ▲ 40.68% continuously.
- **Burst (False Salvation)** ■ Affects self.
  - Attack speed ▲ 65% for 15 sec.
  - ATK ▲ 88.12% for 15 sec.
  - Number of pellets ▲ 5 for 15 sec.

---

## 2. What the code does (override + blind re-derivations)

**skill1 — the pellet-consolidation primitive.** S1 is NOT a skill-effect block; the `skill1` array is empty by
design and the whole mechanic lives in the config-driven `consolidation` block
(`{triggerLandedPellets:80, shots:3, coreRate:0.9, pelletFraction:1.0, attackDamagePct:72, pierce:true}`).
After **80 landed pellets** accrue (the cone remodel's per-shot landed count × hitsPerShot, including the burst's
+5), she fires **3 single aligned bullets** (the ammo counter drops 3 — "3 rounds" = 3 shots/episode, owner
confirmed), each carrying the **FULL shot** (`pelletFraction 1.0` → `atkPct 201.5`, the measured merge, NOT the
per-pellet 20.15 self-nerf), at `coreRate 0.9`, **+72% attack damage** folded into the Damage-Up bucket, Pierce-
tagged (so S2's 55.08% goes live on it), with **no effective-range bonus**. The observable signature is a
normal-bucket damage instance at `coreRate 0.9` — no ordinary SG spray shot cores at 0.9 (the cone gives
0.01–0.10). While consolidating, the burst's +5 pellets are dropped (the single-bullet path wins), and gauge is
base-capped (the +pellets buff does not pump per-trigger energy).

**skill2** — passive `pierceDamagePct 55.08` (continuous; inert except on the Pierce-tagged consolidation bullet,
where it is live — removing it drops only the consolidation bullet's Damage-Up by exactly 0.5508), plus a
`fullBurstEnter` block: `atkPct 75.24` + `hitRatePct 40.68` for 10s. The FB gate fires on **every team Full Burst
window** (11× in the control comp), NOT on her own 6 burst casts — the defining fullBurstEnter-vs-burstCast
discrimination. The FB hit rate is live via the engine's CONE_DELTA path (lifts her SG core fraction in the FB
window; removing it costs ~28%).

**burst** — `burstCast` → self: `attackSpeedPct 65` + `atkPct 88.12` + `pelletCountFlat 5`, all 15s (900f). The
15s outlives the ~10s FB window by ~5s. `pelletCountFlat 5` is the real primitive (10→15 effective pellets, each
extra pellet = 1/10 of the shot through the same cone landing/falloff/shot-level core), superseding the old
`normalAttackPct +50%` proxy (damage-neutral, but a faithful queryable pellet count).

**Cross-family convergence.** S2b (fable) independently derived the landed-pellet trigger (naming `hitCount:80`
as the ~10×-too-slow nearest-wrong), window-scoped (not whole-fight) pierce, the full-shot merge over the
per-pellet self-nerf, and the FB-state-vs-burstCast split. S6 (opus) converged byte-for-byte on skill2 and burst
and **flagged** (rather than solved) exactly the two places the driver has measured answers — the pellet-vs-round
accumulator (10× ambiguous without reading sim.ts) and the gainPierce rounds-vs-seconds gap. The S5 blind suite
runs **RED (7 assertions)** vs the driver override, but **every RED is structural**: the `consolidation`
primitive's schema was redacted from the blind packets (it names the target), so the blind re-derived S1 with
generic primitives (`hitCount:80` + buff effects + `gainPierce`) and its patch helpers matched nothing. The 10
passes are the generic-primitive lines (pierce 55.08 passive, FB ATK/hitRate, burst buffs). The judge classified
all 7 REDs as STRUCTURAL / RECON_ERROR / DOCUMENTED_GAP — not faithfulness disagreements.

---

## 3. Residuals worth a human spot-check (both non-blocking)

1. **⚑ MEASUREMENT CONFLICT (med, owner-accepted, pre-existing).** The consolidation trigger now accrues **landed**
   pellets (owner ruling 2026-07-21), but the earlier **fired/all-land** accrual was the one CALIBRATED to her solo
   (`dorothy-solo-reanalysis.json`, ~55–64 episodes). Landed-count triggers ~1.5–2× less often at scope-lock bands,
   so the solo consolidation episode count now reads LOW. **Needs a solo re-validation.** Judge's recipe: on the
   owned solo recording, count consolidated-shell episodes directly (each = 3 consecutive single-large-popup shells;
   ammo drops 3) and read the per-shot landed-pellet count per band. If measured episodes are 55–64 while landed
   accrual predicts ~30–40, the discrepancy sits in the **landing fraction** (`BAND_SG_HIT_FRAC` / unigeo coverage),
   **not** the 80 threshold — fix it there. **Do NOT close her residual by tuning consolidation**: the remaining
   ~0.13 residual is the shared SG-spray under-model (sim spray ~23M vs measured ~32M, ~1.4× short; noir 1.56×
   confirms), localized to noir's clean anchor.

2. **Documentation-only note contradiction (low).** The override note's _lead_ paragraph is superseded
   pre-consolidation text claiming "'Pellet count fixed at 1' + 'Gains Pierce' are NOT modeled" and "pellet-count
   triggers map to hitCount" — which contradicts the consolidation block shipped below it (the note later self-marks
   "CONSOLIDATION MODE — CORRECTLY MODELED 2026-07-15 … SUPERSEDES an earlier misread"). The shipped JSON implements
   the latter; behavior is correct. Judge's suggested cleanup: delete the stale lead sentences so the note reads as
   one current model, and quote the two `unmodeled.skill1` lines verbatim. No code/value change. (Left as-is here —
   tread-lightly on hand-authored note history; the supersession is self-documented within the note.)

**Same-model residual to watch:** all four agents share a model family pair (fable + opus), so their agreement on
the FB-state keying and the 15s-outlives-10s duration split proves _stability_, not truth. The one thing only
footage settles is the consolidation episode **cadence** — exactly residual (1).

---

## 4. Artifacts

- Driver test: `scripts/tests/units/dorothy-serendipity.test.ts` (22 assertions; GREEN vs shipped + RED vs
  counterfactual; S2d verified).
- Override: `src/skills/overrides/dorothy-serendipity.json` (note += "Kit-autonomy gauntlet 2026-07-25").
- S2b review: `scripts/kit-autonomy/reviews/dorothy-serendipity.test-review.json` (claude-fable-5).
- S5/S6 blind: `scripts/kit-autonomy/blind/dorothy-serendipity.{test.ts,override.json}` (claude-opus-5).
- S7 binding verdict: `scripts/kit-autonomy/results/dorothy-serendipity.json` (claude-opus-5; GO, 1.0).
- Cross-family packets/results: `scripts/kit-autonomy/cross-family/dorothy-serendipity/`.
