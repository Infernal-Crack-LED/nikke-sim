# Manual review — rosanna (Rosanna)

**Gauntlet date:** 2026-07-26
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`bossElementGate` status-gate on the burst taken-debuff; scoped self-buffs; `hitCount` round-count cadence; concealment status-gate ⚑ on the additional damage)
**Judge:** kimi-code/k3 (binding S7) · zero REAL-GOTCHA · `discriminationOk:true`
**Board:** MODEL_ONLY / `board:null` (faithfulness-certified, NOT field-tuned — `tuned:false`, 0 graded teams)

> Slug disambiguation: `rosanna` is the BASE unit (MG / Electric / Attacker / Burst I, cd 40s,
> Tetra; data `treasure:true`). It is distinct from the already-reviewed variant
> `rosanna-chic-ocean` (AR / Wind / Supporter / Burst II) — do NOT conflate the two.

## Kit summary

Rosanna is an Electric machine-gun Burst-I Attacker built around Concealment and Frenzy, and her
kit is heavily PVE-survival/utility oriented — so on the immortal-boss / no-targeting DPS basis
most of her lines are genuinely out-of-domain and are documented verbatim in `unmodeled`. The five
DPS-load-bearing lines that ARE modeled: every 120 normal attacks she gives herself a brief
+19.34% Critical Rate buff for 3s (UNSCOPED `critRatePct` — the kit says plain "Critical Rate",
not "of normal attacks"); passively, whenever she has elemental advantage, she deals +20% damage
(`elemAdvantageDamagePct`, routed to the measured ELEMENT bucket — live vs a Water boss, inert vs a
non-advantaged boss); every 500 normal attacks she adds a stacking +22.61% ATK Frenzy (×10 / 30s);
her burst, Assalto, slams the priority target for 1310.4% of final ATK as a single FB-exempt hit
(the cast lands before the Full Burst window opens); and — against Water Code targets only — that
burst leaves a 30-second Damage Taken ▲29% debuff that is boss-held and lifts the WHOLE team's
damage. The rest of her kit (Concealment targeting-prevention ×3, enemy buff-strip, two
ally-incapacitation triggers, and the concealment-gated 561.6% burst rider) does nothing in a boss
DPS fight where nobody dies and no targeting occurs; the 561.6% rider is carried as an honest ⚑
rather than a silent drop.

## Line-by-line

| Line                                                               | Disposition    | Notes                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: 120 normals → self Concealment 10s (removed on hit)            | DOCUMENTED_GAP | Targeting-prevention status, no concealment primitive; v1 boss deals no damage so "removed on hit" never fires. Verbatim in `unmodeled.skill1`                                                                                                                          |
| S1: 120 normals → self Critical Rate ▲19.34% / 3s                  | FAITHFUL       | UNSCOPED `critRatePct` (not `critRateNormalPct`), `hitCount:120`, self, `durationSec:3`; 49 applies = floor(5991/120). R2 GREEN vs shipped, RED vs scoped-crit counterfactual                                                                                           |
| S1: 10 normals → remove 5 buffs, once/battle                       | DOCUMENTED_GAP | Enemy buff-strip; boss carries no buffs. S2b independently warns NOT to misread as clearing boss-held `damageTakenPct`. Verbatim                                                                                                                                        |
| S1: stage target appears → Elemental Advantage Attack Damage ▲20%  | FAITHFUL       | Passive self `elemAdvantageDamagePct:20`; ELEMENT bucket, applied only while `advantaged()`. Two-sided: `mult.elem` 1.30 live vs Water → 1.10 on removal; inert vs Iron (1.00). Always-on `attackDamagePct` counterfactual provably NON-inert vs Iron                   |
| S2: battle start → self Concealment 5s                             | DOCUMENTED_GAP | Long expired before any 40s+ burst cast; NOT the live gate for the 561.6% rider. Verbatim in `unmodeled.skill2`                                                                                                                                                         |
| S2: ally incapacitated → Frenzy ATK ▲22.61% ×10/30s + gauge 36.54% | DOCUMENTED_GAP | No incapacitation TriggerDef; immortal-boss fixture → zero stacks is faithful. Catastrophic nearest-wrong (passive-at-stacks ≈ +226% ATK over-credit) avoided by every role. Verbatim                                                                                   |
| S2: ally incapacitated → 400% final ATK to 1 enemy                 | DOCUMENTED_GAP | Same ally-death trigger; R7 asserts no rosanna hit at `atkPct:400` exists (not silently proxied). Verbatim                                                                                                                                                              |
| S2: 500 normals → Frenzy ATK ▲22.61% ×10/30s                       | FAITHFUL       | DISTINCT 500-normal source (not the ally-death one). `hitCount:500` → `atkPct:22.61` / `maxStacks:10` / `durationSec:30`; 11 pulsed applies = floor(5991/500), none at frame 0. R3 RED vs always-on passive counterfactual (one apply at frame 0)                       |
| Burst: Assalto 1310.4% of final ATK (prio Attacker, 2 enemies)     | FAITHFUL       | `burstCast` → enemy `flatDamage:1310.4`; 5 hits = 5 casts, burst bucket, `fbMajorApplied:false` on every hit; "2 enemies / prio Attacker" collapses to the single boss. R4 RED vs lvl-9 1244.88 counterfactual                                                          |
| Burst: 561.6% additional when Concealed                            | DOCUMENTED_GAP | Honest ⚑1 — gated on a Concealment self-state with no engine primitive; R6 asserts no 561.6% proxy hit exists. Estimate ≈ +43% burst when concealed; recipe + tier below. 2-of-3 blinds (S5 skip, S6 unmodeled) corroborate the gap over S2b's model-ungated suggestion |
| Burst: Assalto target is Water Code → Damage Taken ▲29% / 30s      | FAITHFUL       | `burstCast` + `bossElementGate:'Water'` → boss-held (`casterIdx`+`targetIdx` null) `damageTakenPct:29`, once per cast; team-wide `mult.taken` 1.29 in-window (crown + helm drop on removal); 0 applies vs Iron. R5 RED vs ungated counterfactual (fires vs Iron)        |

## Cross-family corroboration

> Claude quota was exhausted for this run, so all four blind roles ran on **Kimi** (a separate
> model family from the Qwen driver — cross-family separation preserved). Model strings below are
> the `model` field of each result JSON.

- **S2b (kimi-code/k3, test-faithfulness review):** `leakDetected:null`. CONVERGED on the crit
  19.34%/3s line (independently flags the scoped-`critRateNormalPct` and inherited-10s-duration
  traps), both Concealment lines, the buff-strip, the ally-death Frenzy (flags the ~226% ATK
  over-credit nearest-wrong), the Assalto 1310.4% FB-exempt nuke (flags the `fullBurstEnter` trap),
  and the liter-B1 fixture contention (which the driver's `rosanna/crown/helm` sole-B1 fixture
  already sidesteps with `BURSTS > 0`). TWO divergences: (1) the 561.6% rider — S2b dispositions it
  GAP/load-bearing and recommends encoding UNGATED + an inert marker buff + asserting ≈100%
  in-fixture uptime; (2) S2b's spec is INCOMPLETE — it omits four real kit lines the driver models
  (R1 Elemental Advantage 20%, R3 500-normal Frenzy, R5 Water-gated Taken, R7 ally-death 400%).
- **S5 (kimi-code/kimi-for-coding, blind test):** `leakDetected:null`. Convergence vs the driver
  override reads **RED**, but the S7 judge verified every failure is a blind-side harness-API
  RECON_ERROR, not a driver encoding fault: the `rosEvents()` helper reads `unitOf(res).events`
  (always `[]` — the harness only delivers events via `cfg.onEvent`), the counterfactual patches
  read a nonexistent `.blocks` wrapper (an override slot IS the `Block[]` array), and one filter
  compares `e.mult` (an object) to a number. The lone S5 PASS ("incapacitated Frenzy is inert") is
  vacuous on the empty event array. S5 also omitted R1/R3/R5 (incl. the distinct 500-normal Frenzy).
- **S6 (kimi-code/kimi-for-coding, blind override):** `leakDetected:null`. Byte-identical block on
  the crit line (trigger/target/stat/value/duration) and an identical Assalto 1310.4% burst block
  (+ a redundant `noFb:true`, functionally equal since burst-cast is engine-forced noFb); lists the
  561.6% rider in `unmodeled`. Convergent on the gap set; like S2b/S5 it omits R1/R3/R5.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, `discriminationOk:true`, zero
  REAL-GOTCHA.** All 12 kit lines accounted (5 FAITHFUL + 7 DOCUMENTED_GAP — 6 verbatim unmodeled +
  the ⚑1 rider), zero silent drops. Because all three blinds systematically OMITTED R1/R3/R5
  (omission, not contradiction), the judge verified each directly against the prose + the SSOT docs
  as FAITHFUL: `elemAdvantageDamagePct` in the measured ELEMENT bucket ( Privaty popup ratio
  2.8244, 2026-07-14), the 500-normal Frenzy distinct from the ally-death source, and the
  Water-Code Taken debuff in the boss-side Taken bucket benefiting all attackers. It ruled every S5
  RED a harness-API RECON_ERROR and adjudicated the one substantive divergence — S2b's
  model-ungated 561.6% vs the driver's honest gap — in the driver's favor as protocol-correct
  (documented, estimated, recipe'd; corroborated 2-of-3 blinds).

## Residual flags for owner

1. **⚑1 — burst 561.6% concealment-gated additional damage (OUT-OF-DOMAIN + MEASUREMENT-GATED).**
   Not modeled: it is gated on the Concealment SELF-STATE, which has no engine primitive
   (concealment is a targeting-prevention status, out-of-domain for DPS). **Estimate:** +561.6% of
   final ATK per burst on top of the 1310.4% Assalto (≈ +43% burst damage) WHEN concealment is up.
   **Recipe:** a concealment self-status primitive (window keyed to the S1 120-normal / S2
   battle-start sources) + a burst-cast-timing popup read to pin the overlap. **Tier:**
   out-of-domain + measurement-gated. **Owner decision (cheapest available upgrade):** the S7 judge
   noted the sim's basis IS the no-damage boss, so MG cadence re-procs concealment every ~3.6s
   (120 normals < the 10s window) and "removed on direct hit" never fires ⇒ in-domain concealment
   uptime is provably ≈100% after the first proc. S2b's ungated encoding + marker-buff assertion
   would therefore be EXACT on the sim's basis; landing it is a cheap, principled ~+43%-burst
   upgrade the owner may greenlight. The driver chose the conservative honest gap because real-fight
   uptime is strictly lower and unmeasured (concealment breaks on every direct hit), so encoding
   ungated would bake an unmeasured sim artifact into the total (fudge). R6 asserts no 561.6% proxy
   hit exists today, so an "always-on" fudge cannot sneak in silently.
2. **⚑2 — MG cadence tuple is datamine-default (proc COUNTS only).** MG pulls/s + `reloadFrames:121`
   - `ammo:300` are datamined defaults, not yet measured from video. The `hitCount:120` /
     `hitCount:500` proc ENCODINGS are kit-exact regardless, but the absolute proc COUNTS (49 crit
     applies, 11 Frenzy applies over 180s) scale with fire cadence, so a measured cadence would refine
     them. **Recipe:** rounds/min + reload gap from a focus video. Inherited flag; does not touch any
     encoding.
