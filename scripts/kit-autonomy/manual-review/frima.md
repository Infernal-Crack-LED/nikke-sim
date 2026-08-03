# frima — Frima (Treasure) · kit-autonomy gauntlet 2026-08-02 · GO (faithfulness 1.0)

**Verdict:** GO, cross-family corroborated · **faithfulness 1.0** (binding judge kimi-code/k3, discriminationOk true) · **Tier 2** (round-count chargeCounter + Wake Up status-gate via swap proxy + scoped team true-damage amplification) · from-scratch build (no prior override; baseline was bare weapon, simSupported:false → true).

SR / Supporter / Iron / Burst I, 20s CD, ammo 6, reloadFrames 111, chargeFrames 60, normalMult 65.95, chargeMultiplier 250. P0 disambiguation: slug `frima` IS the Treasure variant — never the bare base Frima. The favorite-item prose (characters.frima.skills) is the SSOT (DECISIONS 2026-07-17); the datamine skill1/skill2 detail tables carry the UNTREASURED base kit and disagree (base S1 = "4 normal attacks → DEF ▼15.84%", no stacking/true damage; base S2/burst have no True Damage lines).

## Kit summary

A two-stage engine: full-charge hits stack Sleepy (boss DEF ▼ 4% ×5, 10s) and — once max-stacked — the 6th full charge flips Frima into **Wake Up**, a 10s self state that makes her SR normals true-flavored and re-arms on a rolling ~7.85s cycle (near-permanent uptime after the ~7.9s ramp). While Wake Up is live, every full charge hands the whole team True Damage ▲28.16% (5s) and each burst adds True Damage ▲49.97% (10s) on top; both pay ONLY on true-flavored hits (frima's own true normals + any teammate's true damage, e.g. ada grenades). Her burst is a plain 101.66%-ATK single nuke (pre-FB, ×1) plus a second DEF ▼9.86% shred. The Max HP lines are party survival, no damage.

## Line-by-line dispositions

| Line | Disposition | Encoding / reason |
|---|---|---|
| S1-L1 Sleepy DEF ▼4% ×5 / 10s | DOCUMENTED_GAP (unenactable) | Boss DEF enters only as fixed cfg.bossDef (sim.ts:1722); no debuff channel; max 20% of ≈140 DEF ≈ 28 ATK ≈ 0.02% at scope. NOT damageTakenPct (would over-credit a ~20% team vuln — the exact nearest-wrong S2b named). viper/phantom/guilty/marciana precedent. Its max-stack precondition is carried by the chargeCounter:6 construction. |
| S1-L2 Wake Up: true normals 10s after 6 FC on max stacks | FAITHFUL | chargeCounter {count:6, countInFb:6} → self weaponSwap {damagePct:65.95 (her own normal mult — swap shots deal exactly her normal FC damage, chargeMultiplier 250 preserved), trueNormals:true, durationSec:10}. Co-extensive with the Wake Up state (engine has no self-status channel; no competing cannon for the swap slot, unlike eunhwa-tu). countInFb:6 explicit (engine defaults countInFb??1 within 10s of own burst — SBS semantics). |
| S2-L1 allies Max HP ▲6.09% / 4s | DOCUMENTED_GAP (inert) | Timed maxHpPct has no engine reader; ally-granted Max HP excluded from atkOfMaxHpPct (sim.ts:1513, e3 video rule). blanc/moran precedent. |
| S2-L2 Wake Up: allies True Damage ▲28.16% / 5s | FAITHFUL | shotFired + swapGate:'swapped' → allies (incl. self) trueDamagePct 28.16 / 5s. shotFired ≡ FC attack for an SR (premise-pinned: every pull charged). |
| B-L1 101.66% of final ATK, 10 highest-DEF enemies | FAITHFUL | burstCast → enemy flatDamage 101.66, PLAIN flavor, ×1 (targeting collapses to the single boss). B1 cast lands pre-FB → never takes the +50% major (pinned). |
| B-L1b DEF ▼9.86% / 10s | DOCUMENTED_GAP (unenactable) | Same as S1-L1 (~14 ATK ≈ 0.01% at scope). |
| B-L2 allies Max HP ▲30.26% / 4s | DOCUMENTED_GAP (inert) | Same as S2-L1. |
| B-L3 Wake Up: allies True Damage ▲49.97% / 10s | FAITHFUL | burstCast + swapGate:'swapped' → allies trueDamagePct 49.97 / 10s; stacks additively with S2-L2 while both live. Gate is LIVE in the fixture: the first cast (~t4.9s) precedes Wake Up onset (~t7.9s) and is exactly the one blocked cast. |

## Cross-family corroboration

- **S2b test review — claude-fable-5** (leakDetected null): independently re-derived the trueNormals-swap Wake Up emulation, the Wake-Up-gated 28.16/49.97 (shotFired/burstCast, allies-incl-self), and the pre-FB ×1 plain nuke; predicted the first-cast gate block the driver later measured. Two divergences reconciled: (1) Wake Up onset hit-6 (driver) vs hit-11 (reviewer) — KEEP 6 (base datamine table is a plain cumulative counter; NIKKE phrases status-gated counting as "when attacking IN X status"; design coherence); flagged measurement-gated residual. (2) Max HP encode-vs-unmodeled — KEEP unmodeled (timed maxHpPct has no reader; reviewer's own inertness pin concedes zero delta). DEF-down lines converged via the reviewer's OWN GAP fallback.
- **S5 blind test — claude-opus-5**: vs driver override 8 GREEN / 19 RED / 4 SKIP. Triage: 9 reds = adjudicated-unmodeled lines the blind encoded (Sleepy ×4, Max HP ×4, burst DEF ×1 — the blind's own S6 flag concedes "StatKey has no boss-DEF-reduction member" and its GAP #3 concedes Max HP inertness); 10 reds = blind artifacts (srcSlug-vs-slug ×5, durationShots null-vs-undefined ×2, ov.slot.blocks shape ×3); 0 REAL-GOTCHA. Driver normalized only the import path and the onEvent-into-cfg harness wiring.
- **S6 blind override — claude-opus-5**: converged block-for-block on 28.16 / 49.97 / 101.66 / count-6 / shotFired≡FC / Max-HP-inert. Three divergences, all driver-precedent: (1) DEF-down as damageTakenPct — self-flagged as "not a faithful DEF model"; (2) Wake Up as enemy-scoped targetStatus — self-flagged category error; (3) true-normals left UNMODELED on the claim a flavor swap "would fabricate cadence/ammo/charge time" — refuted by the engine's same-weapon flavor-swap primitive (damagePct = her own multiplier, inherits chargeFrames, no ammo refill; chisato/takina). The blind model under-counts her personal true damage; the driver enacts the line.
- **S7 binding judge — kimi-code/k3**: GO, faithfulness 1.0, discriminationOk true. 4 FAITHFUL + 4 DOCUMENTED_GAP, each gap formula-cited against the SSOT; every S5 red classified as adjudicated gap or blind artifact ("no red survives triage as a driver gotcha"); one low-severity ENGINE gotcha (documentedByDriver).

## Residual flags (owner spot-check cluster)

1. **Wake Up onset count hit-6 vs hit-11** (interpretation, measurement-gated): popup-read the FC-count-to-Wake-Up-icon in a frima focus recording. Steady state is ~identical either way (~100% uptime); only onset differs (~7.9s vs ~16s). The gate-block discriminator holds under both readings.
2. **Engine bolt-recovery exemption on same-weapon flavor swaps** (engine-core, low): frima fires 60f (1.0s) during Wake Up vs 82f (1.37s) outside — ~27% more in-window shots than real cadence. Pre-existing behavior shared by takina/chisato/laplace; recipe: extend the bolt-recovery rule to flavor swaps, then re-grade. Not an encoding choice.
3. **countInFb:6 is damage-neutral** in every fixture (steady-state uptime ~100% regardless) — set for principle (the kit says 6 FC, not 1 within 10s of her burst); documented, not behaviour-pinnable.
4. **Schema GAPs** (near-inert at scope lock): both DEF-down lines (no boss-DEF debuff channel) and both Max HP lines (no timed-maxHpPct reader) — carried verbatim in the override's `unmodeled`.

## Artifacts

- Driver: `src/skills/overrides/frima.json` (validate-overrides PASS) · `scripts/tests/units/frima.test.ts` (19/19 green, deterministic)
- Reviews: `scripts/kit-autonomy/reviews/frima.test-review.json` (S2b) · `reviews/frima.verify.txt` (S2d)
- Blind: `scripts/kit-autonomy/blind/frima.test.ts` (S5) · `blind/frima.override.json` (S6)
- Judge: `scripts/kit-autonomy/results/frima.json` (S7, verdict + faithfulnessScore top-level) · `cross-family/frima/*.json` (all dispatch results)
