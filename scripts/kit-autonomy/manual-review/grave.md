# Manual review — `grave` (Grave) — kit-autonomy gauntlet 2026-07-25

**Verdict: GO (cross-family corroborated)** · faithfulness **1.0** · **Tier 2** · discriminationOk **true** · 0 REAL-GOTCHA.

Grave — AR / Supporter / Fire / Burst II, cd 20s, ammo 60, Pilgrim OVERSPEC. Not a variant. A mature, **measured** override (solo anchor 1.005 from grave solo.MP4, n=19). The gauntlet made **no functional change** — only the provenance stamp; the override was already faithful and measured.

## What ran

| Stage   | Role                        | Model              | Outcome                                                                                                                             |
| ------- | --------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| S0      | slug lint + line inventory  | driver             | clean (no AMBIGUOUS); 17 kit lines → 12 FAITHFUL + 5 documented-UNMODELED; Tier 2                                                   |
| S2a     | driver test (test-first)    | driver             | `scripts/tests/units/grave.test.ts`, 23 assertions, 7 groups (G1–G7 + unmodeled pins), 6 counterfactual runs                        |
| S2b     | test-faithfulness review    | **claude-fable-5** | independently re-derived all 16 load-bearing lines; converged on every burst mechanic + magnitude; leakDetected null                |
| S2c/S2d | reconcile + verify          | driver             | 23/23 green vs shipped (`reviews/grave.verify.txt`); reconciliation `reviews/grave.test-review.json`                                |
| S3      | minimum faithful edit       | driver             | note provenance stamp only; no encoding change (already faithful + measured); validate-overrides VALID                              |
| S4      | engine check                | driver             | no change — missing primitives (status-end trigger, empty-magazine effect) block bounded/documented/non-anchor lines → ⚑, not NO-GO |
| S5      | blind test writer           | **claude-opus-5**  | 5 pass / 24 fail / 5 skip vs driver override — judge ruled ALL 24 fails RECON_ERROR or driver-wins divergence                       |
| S6      | blind override writer       | **claude-opus-5**  | independent rebuild converged on every load-bearing burst mechanic + magnitude; diverged only on documented-approx lines            |
| S7      | reconciling judge (binding) | **claude-opus-5**  | **GO**, faithfulness 1.0, 0 REAL-GOTCHA (`results/grave.json`)                                                                      |

## Line-by-line (judge `lineFindings`: 12 FAITHFUL + 5 DOCUMENTED_GAP)

- **S1 Burst Gauge filling speed ▲38.96% (Heat Emission)** — FAITHFUL. Passive → all allies incl self, `burstGenPct 38.96`, permanent (frame 0, no expiry). G1 pins target set {0,1,2,3} + permanence. The Heat-Emission GATE is the separate documented approximation below.
- **S1 Pierce Damage ▲48.4% (Heat Emission)** — FAITHFUL. Passive → allies **excludeSelf**, `pierceDamagePct 48.4`. grave-self can never benefit (pierce-tagged only in Prediction, when Heat Emission is OFF), so excludeSelf delivers her faithful zero AND blocks a burst-window double-count. G2 pins target set {0,2,3} (grave excluded) + that dropping excludeSelf lifts her in-window Damage-Up. S2b reached the same endpoint from an independent removal-condition hypothesis.
- **S1 Reload Ratio ▼50%** — FAITHFUL (**MEASURED**). `charFixes.reloadFrames 193` → effective 201f (round(193×0.975)+13), reproducing the measured 3.35s/201f gap (n=19). G3 pins the value + that the datamined 81f fires strictly MORE shots. Both blinds' literal `reloadSpeedPct -50` lands at 131f (~35% too fast); S2b's refill-fraction reading is refuted by the observed full 60-round mags (61.5 shots/gap).
- **S1 "Removes 100% of ammo" (Prediction-end)** — DOCUMENTED_GAP. Unmodeled verbatim; no engine effect can EMPTY a magazine and no Prediction-end trigger exists. ~9-11 forced 201f reloads/fight in comps (over-credit, consistent with board HOT); tracked in U19.
- **S1 "Removes Heat Emission under certain conditions"** — DOCUMENTED_GAP. Condition unspecified in kit → unmodeled verbatim. S6's derived 2.7s window inherits the datamined 81f the driver measured away (worse model).
- **S1 self-heal 2% Max HP/1s** — DOCUMENTED_GAP. SELF-target; the recovery event fires on the RECEIVER (grave), who has no on-recovery trigger, so it cannot feed a teammate (unlike Helm→Crown). Genuinely inert cross-unit; S2b independently agreed.
- **S2 Overheat I — ATK ▲15.48% after 15 hits** — FAITHFUL. `hitCount 15` → self `atkPct 15.48`, sustained. G4 pins first-fire after setup + before first burst + structural hitCount-15. Three-family convergence on every field.
- **S2 "Removed upon reloading to max ammunition"** — DOCUMENTED_GAP (the ONE enactable residual). Absorbed by the sustained approximation (hand decision). `removeOnReload` exists in the schema and both blinds reached for it; real uptime ~75% of non-Prediction shots vs 100% shipped (over-credit). See gotcha below.
- **S2 Overheat II — ATK ▲20.66% (30 hits, in Prediction)** — FAITHFUL. `burstCast` → self `atkPct 20.66`, **durationSec 10** (= Prediction window). The prose gate "While in Prediction" is an ACTIVE gate, so the buff dies with Prediction — the driver's 10s window beats S2b's "permanent once earned" (over-credits the whole out-of-window fight) and S6's cumulative hitCount:30 (degenerates to the same full-window behaviour). G5 pins first-fire on the first burst frame, once per burst, 600-frame window.
- **S2 Overheat III — Attack Damage ▲30.8% (60 hits, in Prediction)** — FAITHFUL. `burstCast` → self `attackDamagePct 30.8` (Damage-Up bucket, **NOT atkPct**), 10s. Three-way convergence on the bucket. G5 pins it.
- **Burst Prediction: unlimited ammunition 10s** — FAITHFUL. `burstCast` → self `unlimitedAmmo` 10s. G6: every in-window shot is unlimited (≥100 shots); stripping it drops in-window shots as she burns the 60-round mag.
- **Burst Gain Pierce 10s** — FAITHFUL. `burstCast` → self `gainPierce` 10s; `hasPierce` deliberately NOT set. Three-way convergence on the harder encoding (timed effect, not whole-fight flag). G6: stripping gainPierce collapses her in-window Damage-Up (probe 2.72/3.00 → 1.79/2.07). This is the line the owner enabled knowing it moves comps ~0.83→~1.18 HOT (faithful > fit); the judge concurs.
- **Burst Pierce Damage ▲52.8% 10s (self)** — FAITHFUL. `pierceDamagePct 52.8` self, 10s; live because gainPierce tags her for the same window. G6 pins.
- **Burst Critical Rate ▲85.19% 10s (self)** — FAITHFUL. UNSCOPED `critRatePct 85.19` (no "of normal attacks" qualifier), self, 10s. G6: in-window crit rate caps at exactly 1.0; stripping drops it to 0.15/0.30. Three-way convergence incl. the scope trap.
- **Burst Attack Damage ▲48.2% 10s (allies)** — FAITHFUL. `attackDamagePct 48.2` (NOT atkPct) to all allies incl self, 10s. G7 pins target set + bucket.
- **Burst Pierce Damage ▲39.98% 10s (allies)** — FAITHFUL. `pierceDamagePct 39.98` to all allies, 10s; inert on non-pierce teammates, live for grave in-window. G7 pins.
- **Burst Max Ammunition ▲3 round(s) 10s (allies)** — FAITHFUL. `maxAmmoFlat 3` (kit-literal FLAT rounds, NOT the old near-inert `maxAmmoPct` proxy), all allies, 10s. G7 pins structurally (maxAmmoFlat present, maxAmmoPct absent) + behaviourally.
- **Burst "Current HP ▼1%/1s, 10s"** — DOCUMENTED_GAP. Defensive self-cost; v1 has no HP pool. Unanimous skip across all three derivations.

## Judge gotchas (all non-blocking)

- **Overheat I removeOnReload (low, ENCODING, documented + enactable)** — the only residual NOT primitive-blocked. `removeOnReload:true` exists and both blinds used it unprompted; the removal clause is literal kit text. Expected direction: small reduction in non-window damage (same direction as the board HOT). **Suggested fix:** add `removeOnReload:true` to the hitCount-15 `atkPct 15.48` effect, A/B'd against the solo anchor (1.005) on its own (a non-window effect — must not be folded into the U19 burst-window work). Left as a documented hand approximation per tread-lightly; owner may enact.

## Owner spot-check cluster

1. **Overheat I removeOnReload** (enactable today, zero primitive cost) — the single highest-value refinement; small, documented, A/B against solo 1.005.
2. **Overheat II/III ramp-in** (largest residual, primitive-blocked) — full 10s-window uptime vs the real ~2.5s/~5.0s ramp at 12 rounds/s. Judge correction: trimming `durationSec` to 7.5/5.0 preserves the uptime INTEGRAL but not the ALIGNMENT (real buff starts late; trimmed one ends early; damage is non-uniform across the window). A start-delay primitive or a window-scoped hitCount trigger is the faithful fix, not the haircut.
3. **Prediction-end ammo dump** (~9-11 forced reloads/fight in comps) — genuinely primitive-blocked on BOTH the empty-magazine effect and the status-end trigger.
4. **Two engine-behaviour claims adjudicated by reasoning, not instrument** (same-model residual): (a) recovery events fire receiver-side (what makes dropping the 2%/s self-heal safe under hard-rule 2); (b) excludeSelf on the 48.4 stays correct ONLY while the Heat Emission gate is unmodelled — **if a self-status gate primitive ever lands, excludeSelf must be removed in the same change** or the compensation silently becomes an under-credit.

## Board context

grave rank 29 · 3 comps · ratio **1.104 HOT** (1.09–1.11) · err 0.104 · tol ±15%. The HOT is the DOCUMENTED burst-window residual (U19): the faithful pierce is modeled on purpose; the surviving HOT is a separately-tracked over-model. The gauntlet made no functional change, so the reading is unchanged (before == after). Solo anchor 1.005 unaffected (a lone B2 never bursts → never leaves Heat Emission).

## Artifacts

- Driver test: `scripts/tests/units/grave.test.ts` (23/23 green)
- Override: `src/skills/overrides/grave.json` (provenance stamp; validate-overrides VALID)
- S2b review: `scripts/kit-autonomy/reviews/grave.test-review.json` · verify: `reviews/grave.verify.txt`
- Blind: `scripts/kit-autonomy/blind/grave.test.ts` + `grave.override.json`
- Cross-family packets/results: `scripts/kit-autonomy/cross-family/grave/{s2b,s5,s6,s7}-*.json`
- Binding verdict: `scripts/kit-autonomy/results/grave.json` · judge packet: `results/grave-judge-packet.md`
