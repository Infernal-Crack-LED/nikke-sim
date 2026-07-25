# naga — kit manual review

**Verdict: GO (cross-family corroborated) · faithfulness 1.0 · Tier 2 · binding judge claude-opus-5.**
Gauntlet 2026-07-25. Naga (SG / Supporter / Electric / Burst II, cd 20s, ammo 9, hitsPerShot 10).

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1** ■ after 12 normal attacks → all allies: Restores 14.57% of Cover HP.
  ■ when a Shield is set in front of this unit → all allies: core damage ▲85.17% for 10s.
- **S2** ■ after 5 normal attacks → 2 highest-ATK allies: core damage ▲40.07% for 5s.
  ■ after 5 normal attacks → 2 lowest-HP allies: recover 9.58% of caster final Max HP.
- **Burst** ■ self: Gains Pierce for 10s.
  ■ all allies: ATK ▲16.18% of caster ATK for 10s.
  ■ if a Shield is set in front of this unit → all allies: ATK ▲31.02% of caster ATK for 10s.

## 2. What the code does (override + blind re-derivations)

`src/skills/overrides/naga.json` (7 kit lines → 4 FAITHFUL + 3 DOCUMENTED_GAP, 0 silent drops):

| Line | Encoding | Status |
| --- | --- | --- |
| S1 cover restore 14.57% | unmodeled verbatim | DOCUMENTED_GAP (cover-object repair, NOT a unit heal — encoding it as `heal` would spuriously feed on-recovery consumers; the adversarially-correct skip) |
| S1 shield → core ▲85.17%/10s | `{kind:'shielded'}` trigger → allies → coreDamagePct 85.17/10s | FAITHFUL (application trigger; inert with no shielder, owner-ruled default-off 2026-07-20) |
| S2 5 hits → core ▲40.07%/5s | hitCount 5 → alliesTopAtk count 2 → coreDamagePct 40.07/5s | DOCUMENTED_GAP (values kit-literal; see hitCount residual §4) |
| S2 5 hits → heal 9.58% | hitCount 5 → alliesLowestHp count 2 → `heal` (amountless) | DOCUMENTED_GAP (tandem recovery feed; HP magnitude + target stand-in unrepresentable in v1) |
| Burst self Pierce 10s | burstCast → self → gainPierce durationSec 10 | FAITHFUL (timed window, not whole-fight hasPierce; damage-inert at scope, alice/prika convention) |
| Burst ATK ▲16.18% | burstCast → allies → casterAtkPct 16.18/10s | FAITHFUL (unconditional; flat-resolved off naga's staticAtk) |
| Burst shield → ATK ▲31.02% | burstCast + requiresShielded → allies → casterAtkPct 31.02/10s | FAITHFUL (cast-time state gate; the strongest-tested line — gate-closed/open/deleted + magnitude-ratio arms) |

**This gauntlet discharged the prior audit's open hard-rule-2 finding.** The 2026-07-16 audit had
flagged "S2 heal in unmodeled violates hard rule 2 (crown consumer)"; the fable S2b review
independently re-derived the same conclusion (tandem rule). The heal is now modeled as a recovery
EVENT. Probe-verified load-bearing in crown comps (crown's recovery-triggered team Attack Damage
20.99% fires 24 → 1704×; carry +35.8M) and **byte-identical in the graded comp** (no recovery
consumer there), so calibration is untouched. The self-Pierce is now a timed `gainPierce` (the
engine primitive exists, types.ts:274). Both edits are minimum-faithful and owner-authorized.

**The driver is the only one of the three derivations that applies both shield primitives
distinctly** — S1 "WHEN a Shield is set" = `shielded` application trigger; burst "IF a Shield is
set" = `requiresShielded` state gate — exactly as game-mechanics.md §9 specifies.

Test spec: `scripts/tests/units/naga.test.ts` — 20 assertions, all GREEN vs shipped, each
load-bearing line carrying a board-moving counterfactual. Fixtures (deterministic, no seed):
`liter/blanc/naga/ada` (blanc cd60 is the shielder — crown cd20 leftmost would monopolize the B2
slot so naga never casts; probe-verified) and `liter/naga/ada/helm` (no shielder → gate closed).

## 3. Verdict & cross-family convergence

- **S2b (claude-fable-5):** converged on all 4 driver FAITHFUL lines; independently flagged the S2
  heal (tandem, load-bearing) and self-Pierce as needing modeling — both enacted.
- **S5 (claude-opus-5, blind test):** re-derived all 6 lines + counterfactuals. Pristine fixture had
  two bugs the author couldn't see (crown monopolizes B2 → naga burstCasts 0; crown's burst shield
  contradicts the author's own "s1b inert / no shield source" premise). Adapted ONLY fixture + two
  probe mechanisms (assertion intent unchanged); adapted test vs driver override = **15 passed /
  2 skipped (honest v1 GAPs) / 0 failed**. Pristine + adapted preserved at `blind/naga.test.ts` /
  `blind/naga.adapted.test.ts`.
- **S6 (claude-opus-5, blind override):** converged **identically on 5/6 lines**. The one divergence
  (S1 trigger: blind `passive+requiresShielded` vs driver `shielded` trigger) was **self-flagged by
  the blind author**, who recommended the driver's shield-application reading; fable endorsed it too.
- **S7 (claude-opus-5, binding judge):** **GO, faithfulness 1.0, discriminationOk true.** "Nothing
  must change for GO." The mechanical convergence-RED decomposes cleanly into 2 blind-fixture
  defects, 1 self-flagged s1b RECON_ERROR (ruled for the driver), and 1 genuine documented cadence
  finding (below).

## 4. Lines worth a human spot-check (the ⚑ flags)

1. **hitCount rounds-vs-pellets (ENGINE, med — the judge's gotcha #1).** The engine increments
   `hitCount` by `hitsPerShot` per shot (sim.ts:2905), so for an SG (hitsPerShot 10) naga's two
   "after 5 normal attack(s)" blocks fire ~1.5× per SHOT (~10× the prose cadence if "normal attack"
   means a trigger pull). **All three cross-family derivations read the prose as ROUNDS while the
   engine counts HITS** — the one place where agreement is not evidence. The driver kept count:5
   (kit-literal) and documented it (override note + adapted-test A4). Naga's own damage exposure is
   ~nil (worst rounds-based inter-proc gap = 4×40+111 = 271f = 4.5s, inside the 5s buff window; only
   the first proc shifts ~3.3s → ~0.4s). **This is engine-wide, not naga-specific — it deserves an
   owner ruling for every SG/MG hitCount carrier, not a per-unit patch.** Recipe: naga focus video,
   count 40.07% buff-icon appearances vs her ammo counter over one magazine (1 per ~5 rounds =
   ROUNDS; ~1-2 per round = HITS).
2. **S1 85.17% shield uptime (inherited ⚑).** The shield-gated lines (85.17 core, 31.02 ATK) ride
   the modeled shielder's shield cadence (blanc hitCount-120 / crown burst); real in-game shield
   uptime is unmeasured. Recipe: naga+crown focus video, compare the 85.17% buff-icon windows to
   crown's shield icon.
3. **Amountless heal + leftmost-2 stand-in (FIDELITY, low — judge's gotcha #2).** The 9.58%
   magnitude is unrepresentable (engine `heal` carries no amount; no HP pool) and "lowest HP%"
   resolves to the leftmost 2 slots. Damage-inert in the graded comp; the driver's crown probe seats
   the consumer inside the leftmost 2 by construction. Re-verify if a future comp seats an
   on-recovery consumer outside slots 0-1.

## 5. Residual risk

- **Board:** naga reads 0.839 COLD (1 graded comp, N2 modernia wind, >15% band) — **unchanged** by
  this gauntlet (the two new blocks are byte-identical there). The COLD reading predates this pass
  and is not a faithfulness signal (the override is kit-literal; the sim under-reads the real fight
  for reasons outside naga's encoding).
- **No regression risk from the edit:** both new blocks are inert in every graded comp (no recovery
  consumer; no pierceDamagePct source reaching SG naga — d-killer-wife's targets SR allies only).
- **Faithfulness residual:** the hitCount rounds-vs-hits convention (§4.1) is the only genuine
  prose-vs-engine gap; it is documented, engine-wide, and ~damage-inert for naga. Owner ruling
  recommended at the engine level.
