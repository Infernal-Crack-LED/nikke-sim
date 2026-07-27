# Kit-autonomy gauntlet — `cinderella` (Cinderella, BASE RL/Defender/Electric/Burst III; aka "cindy")

**Date:** 2026-07-25 · **Verdict:** GO (cross-family corroborated) · **Faithfulness:** 1.0 (8/8) · **Tier:** 2 · **discriminationOk:** true

> Scope note: this is the BASE unit `cinderella` (RL/Electric). Its variant `cinderella-crystal-wave`
> (MG/Iron) is a separate unit and was out of scope.

## Kit (data/characters.json → characters.cinderella.skills)

- **S1** entering Burst Stage 3 → self: ATK ▲ 2.71% of final Max HP, 10s · attacking with Full Charge → self: Charge Speed ▲ 100%, removed on reload-to-max · hitting with Full Charge → target: 136.6% of final ATK additional damage.
- **S2** battle start / B3 entry → self: Decoy avatar (96% final Max HP), continuous · every 3s while a decoy is present → self: Beautiful, Max HP ▲ 1.6%, stacks ×12.
- **Burst** random enemies: 1365.92% of final ATK, sequential ×10 · same targets when in Beautiful: 28.9% of final ATK, mirrors Beautiful stack count.

## Line dispositions (driver ↔ fable S2b ↔ opus S5/S6 — all converged)

| Line                                          | Disposition                                                                              | Encoding (shipped)                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| C1 S1 ATK 2.71% MaxHP / B3 entry / self / 10s | FAITHFUL                                                                                 | `skill1[0]` stageEnter{3} → self `atkOfMaxHpPct` 2.71 / 10s — **byte-identical** to the S6 blind override      |
| C2 S1 Charge Speed ▲100% / removed on reload  | FAITHFUL (DOCUMENTED mechanism substitution)                                             | `charFixes.magDumpRof` (video-measured whole-mag dump)                                                         |
| C3 S1 136.6% full-charge rider                | FAITHFUL                                                                                 | `skill1[2]` shotFired → enemy `flatDamage` 136.6                                                               |
| C4 S2 Decoy avatar (×2)                       | UNMODELED (defensive/aggro; inert vs damageless v1 boss; verbatim in `unmodeled.skill2`) | —                                                                                                              |
| C5 S2 Beautiful MaxHP ▲1.6%×12                | FAITHFUL                                                                                 | `skill1[1]` passive → self `casterMaxHpPct` 19.2 `rampSec` 36 (1.6×12; 3s×12)                                  |
| C6 Burst 1365.92%×10 nuke                     | FAITHFUL                                                                                 | `burst[0]` burstCast → enemy `flatDamage` 13659.2 `flavor:sequential` (consolidated; FB-exempt by cast timing) |
| C7 Burst 28.9%×Beautiful-stacks mirror        | FAITHFUL                                                                                 | `burst[1]` burstCast → enemy `flatDamage` 346.8 `rampSec` 36 — **byte-identical** to the S6 blind override     |

## Cross-family convergence

- **S2b (claude-fable-5, test-faithfulness review):** independently re-derived all 7 lines (C1/C2/C3/C5/C6/C7 FAITHFUL, C4 UNMODELED); load-bearing set + unmodeled-verbatim match the driver. Declared a PARTIAL leak (the schema's `rampSec` comment names the mirror magnitudes; the 36s ramp is independently derivable from 3s×12).
- **S5 (claude-opus-5, blind test):** pure literal-prose re-derivation. Behavioral assertions (HP-scaled ATK 2.71/10s; stage-3 self scope; 136.6% rider no-core; mirror multiple-of-28.9% capped ×12; mirror ramps; decoy recorded) all pass vs the driver. 10 raw failures = 1 harness-API misuse (`onEvent` placed on the CompOptions root instead of in `cfg`) + 9 encoding-FORM divergences. Driver-reconciled adaptation (`blind/cinderella.adapted.test.ts`, [P1]–[P5]) runs **GREEN: 20 passed / 3 skipped** (the 3 skips are measurement-gated: the decoy avatar entity and the mirror once-vs-per-hit cadence).
- **S6 (claude-opus-5, blind override):** converged EXACTLY on C1 (atkOfMaxHpPct 2.71/stageEnter3/self/10s), C3 (136.6 rider), C6 total (10×1365.92=13659.2), C7 (346.8 rampSec 36), and C4 UNMODELED. Diverged only on the same three encoding mechanisms. Independently derived `rampSec 36` on BOTH the Beautiful feed and the burst mirror from the prose's own 3s×12 (strongest independent signal — derived, not fitted).
- **S7 (claude-opus-5, reconciling judge):** first verdict NO-GO (0.875) on G1; after the driver fixed G2 and pinned+documented G1, the retry verdict is **GO, faithfulness 1.0, discriminationOk true**.

## Gotchas adjudicated

- **G1 — burst same-cast snapshot (ENGINE, high) → DOCUMENTED_GAP (owner-resolution-required).** `burstSnapshotsPreFb:false` ⇒ the engine runs stageEnter before burstCast, so the nuke snapshots her OWN same-cast stage-3 `atkOfMaxHpPct` conversion (~+1.5× nuke baseAtk; ~45% of her fight damage). This contradicts the override's [HISTORICAL] BURST TIMING sentence (e3 video: "the nuke must lose … the same-cast stage-3 ATK stack"), which is NOT in the 2026-07-21 SUPERSEDES list — though that sentence's reasoning is explicitly coupled to the since-removed TWIN-INSTANCE model. **The owner already tracks this as kit-status finding F1 (P1): "burstSnapshotsPreFb:false contradicts note+engine-comment … decidable from existing footage at both flag values."** The gauntlet independently re-derived it. Resolution: re-read ONE nuke popup from `docs/probes/u8 e3` (the two models differ ~1.5× on the same cast; the file already reports early/late FB procs 633.7k/667.0k from that footage), then either set `burstSnapshotsPreFb:true` or delete the stale sentence + record the superseding measurement. The driver PINNED the shipped behavior (removing the conversion drops the nuke baseAtk >1.3×) and documented the contradiction verbatim; it did NOT fabricate a measurement. Estimate if the historical reading holds: ~20-25% nuke over-credit. Tier 2.
- **G2 — burst sequential flavor (FIDELITY, med) → FIXED.** The consolidated 13659.2 nuke now carries `flavor:"sequential"` (kit: "sequentially for 10 time(s)"), restoring routing into the SSOT `seqMult` bucket. Board-inert here (no sequential buffer; `validate-overrides` unchanged at 347.1M; every nuke instance's `mult.seqMult === 1`). Doubly pinned by the driver test.
- **G3 — Beautiful smooth-ramp slot (ENCODING, low) → DOCUMENTED.** Beautiful is a smooth `casterMaxHpPct` 19.2 `rampSec` 36 in the skill1 array (skill2 is `[]`) rather than 12 discrete 1.6% interval-3s stacks. Linear and discrete coincide at every 3s boundary; sub-1% inside a window. Self-granted ⇒ caster===target, so it feeds `atkOfMaxHpPct` exactly as the discrete form would. The empty skill2 is deliberate (block at skill1[1]); the discrete form is available if step-vs-line ever matters.

## Owner spot-check residuals (same-model prior — every agent in this gauntlet shares it)

1. **G1 — the one e3 nuke popup** (`docs/probes/u8 e3`). Highest-leverage unresolved question; no amount of agent agreement can settle it (all agents share the stageEnter/burstCast-ordering prior). Already kit-status F1.
2. **Mag-dump substitution** for the Charge-Speed line rests on **n=1 footage** (ammo-counter frame read). Both blind agents independently expected the literal `chargeSpeedPct` buff. If the read is revisited, this line AND the 136.6% rider's proc count move together.
3. **Burst mirror once-per-cast vs once-per-sequential-hit** (a 10× swing on the rider) is unsettled by the prose; remains an open ⚑ from S5/S6 that no artifact here resolves (needs popup counting on a recorded burst).

## Artifacts

- Driver test: `scripts/tests/units/cinderella.test.ts` (17 assertions, GREEN).
- Override: `src/skills/overrides/cinderella.json` (note += gauntlet provenance; G2 flavor fix; G1/G2/G3 caveats).
- Blind: `scripts/kit-autonomy/blind/cinderella.test.ts` (pure), `cinderella.adapted.test.ts` (reconciled, 20/3 GREEN), `cinderella.override.json`.
- Reviews: `scripts/kit-autonomy/reviews/cinderella.test-review.json` (S2b), `cinderella.verify.txt`.
- Cross-family: `scripts/kit-autonomy/cross-family/cinderella/` (s2b/s5/s6/s7 packets + results, incl. s7-retry).
- Binding verdict: `scripts/kit-autonomy/results/cinderella.json` (GO, 1.0).
