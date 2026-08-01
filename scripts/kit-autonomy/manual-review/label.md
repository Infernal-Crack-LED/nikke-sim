# Manual review — label (Label)

**Gauntlet date:** 2026-07-31
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 1 (the DPS-relevant encoding is a passive self ATK buff + a standard burst-gated team ATK
buff + an inert self Max HP buff; the kit's "while in Delusion" status-gate collapses to a passive in
the no-incoming-damage sim — documented, not a load-bearing behavioural subtlety; no round-count, no
scoped-crit, no burstCast-vs-fullBurstEnter subtlety for her OWN damage)

> Slug disambiguation: `label` is Label (data `name:"Label"`, Elysion Iron AR Defender, Burst I,
> 20s CD). GREENFIELD — she shipped with NO override (`simSupported:false`); before this gauntlet the
> unit could not sim at all (`resolveSkills` throws for prose-without-override).

## Kit summary

Label is an Iron AR Defender (tank) whose kit is almost entirely defensive — shields, damage-taken
reduction, taunt-immunity, stun — and therefore mostly DPS-inert in a partless-boss sim with no
incoming damage. At battle start she creates **Delusion**, a shield worth 30.15% of her own final Max
HP (event-only — no HP pool). While Delusion is up she gains **+93.39% ATK** and **+70.4% burst-gauge
fill speed** on herself (her only self-damage line is the ATK buff). Her burst raises her own Max HP by
20.26% for 10s (offensively inert — she has no HP→ATK conversion) and creates **Shared Delusion** (her
shield becomes invulnerable for 10s); during that 10s window every ally except herself gains ATK equal
to **80.36% of Label's ATK**. If Delusion ever breaks she becomes briefly untargetable and stunned
(Delusion Shattered) — unreachable in v1 because nothing breaks the shield.

**The key modeling judgment (status-gate collapse):** the S2 self buffs read "only while in Delusion
status". Delusion is the start-of-battle shield; the sim models no incoming damage, so the shield never
breaks and Delusion is permanent — the gate is always satisfied and the buffs are faithfully encoded
`passive` (frame 0, no expiry). The real-fight shield-break downtime is sub-second (the shield
re-creates on her next normal attack) and is documented as a gap, not a load-bearing behaviour. All
three blind agents independently made this same call.

## Line-by-line

| Line                                                                 | Disposition      | Notes                                                                                                                          |
| -------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| S1: start → self Delusion shield 30.15% final Max HP                 | FAITHFUL (inert) | Event-only `shield` (no HP pool); Label has no `shielded` consumer; pinned structurally (L5) — no log event exists to assert   |
| S1: Delusion ends → Delusion Shattered (untargetable + stun, 2x)     | DOCUMENTED_GAP   | Requires a shield BREAK (incoming damage, unmodeled); taunt-immunity/stun are defensive/CC with no DPS channel                 |
| S1: normal attack / burst while not in Delusion → re-create shield   | DOCUMENTED_GAP   | Re-creation triggers only fire once the shield has broken, which never happens in sim — inert; must NOT be encoded ungated     |
| S2: start → allies (except self) Electric dmg-taken ▼70.4%/5s 1x     | DOCUMENTED_GAP   | Defensive damage-taken REDUCTION, Electric-conditional (control boss is Fire), no incoming-damage model                        |
| S2: while Delusion → self burstGenPct 70.4 (continuous)              | FAITHFUL         | Passive self (Delusion permanent in sim); value/scoping/frame/permanence pinned (L2)                                           |
| S2: while Delusion → self atkPct 93.39 (continuous)                  | FAITHFUL         | Her main self-damage line; passive self; LIVE (removing collapses her total) + self-scoped (L1). atkPct≡casterAtkPct for self  |
| S2: while Delusion → self Electric dmg-taken ▼70.4% (continuous)     | DOCUMENTED_GAP   | Defensive, Electric-conditional, no incoming-damage model                                                                      |
| S2: while Shared Delusion → allies (except self) ATK 80.36% of Label | FAITHFUL         | `casterAtkPct` (flat, % of LABEL's ATK), `burstCast` trigger, excludeSelf, 10s; basis/scoping/timing discriminated (L3)        |
| Burst: self Max HP ▲20.26%/10s                                       | FAITHFUL (inert) | `targetMaxHpPct`→engine `maxHpFlat`; offensively inert (no atkOfMaxHpPct feed) — proven by byte-equal totals on strip (L4)     |
| Burst: Shared Delusion — shield invulnerable 10s                     | DOCUMENTED_GAP   | Invulnerability unmodeled (no damage model); the 10s STATUS window it opens IS modeled as the duration of the S2 ally ATK buff |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. FULL CONVERGENCE — the
  reviewer's per-line spec, loadBearingSet, and unmodeled set matched the driver exactly, with NO
  REAL-GOTCHA. It independently flagged the SAME three risks the driver had already handled: (1) the
  Burst-I fixture hazard (controlComp puts liter at B1 alongside Label, so Label never casts — the
  driver makes Label the sole B1 and asserts she casts); (2) "continuously" on the Shared Delusion
  ally line must be the burst's 10s window, NOT permanent (driver: `burstCast`/10s); (3) `casterAtkPct`
  flat-resolves vs `atkPct` (driver asserts the flat value).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same kit lines and
  discriminations. As-written it used `controlComp('label')` (the B1 hazard) + harness-API bugs + an
  un-restricted `casterAtkPct` filter. After MECHANICAL-ONLY adaptation (import path; `onEvent`→`cfg`;
  override slots are block arrays; the sole-B1 fixture; damage field `slug`; and restricting the
  Shared-Delusion filters to `casterIdx===LABEL_SLOT` — the blind filter also caught **crown's** S1
  `casterAtkPct 64.51`, since Label IS a burst caster, contaminating every skill2c assertion), the blind
  test vs the driver override is **16 pass / 3 skip (documented GAPs) / 0 fail**. The 5 pre-adaptation
  failures ALL traced to the crown-filter contamination + fixture hazard, proven by green-after-isolation;
  NONE was a faithfulness divergence.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. INDEPENDENT CONVERGENCE — the blind
  override matches the driver on every load-bearing decision: skill1 passive self shield 30.15; skill2
  passive self `burstGenPct 70.4` + `atkPct 93.39`; skill2 `burstCast` allies-excludeSelf `casterAtkPct
80.36`/10s; burst `burstCast` self `targetMaxHpPct 20.26`/10s. Same Delusion-permanence premise, same
  Shared-Delusion 10s inference, same unmodeled set, same ⚑ reasoning. Only delta: the blind writer
  grouped the two passive self buffs into ONE block (driver splits them) — functionally identical.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  Convergence `s5TestsVsDriverOverride:GREEN`, `redAssertions:[]`. All 11 kit lines accounted
  (5 FAITHFUL + 6 DOCUMENTED_GAP), zero silent drops. The judge independently confirmed the two judgment
  calls (Delusion gate→passive collapse; Shared Delusion 10s inference) were made by all three agents and
  are corroborated by the prose + the mechanics SSOT, and that discrimination is real across the board
  (liveness, scoping, basis, timing, present-but-inert).

## Residual flags for owner

1. **⚑ Cadence tuple (MANDATORY, datamine-unreliable).** `pullsPerSec` at the AR class default /
   `reloadFrames 81` / rolling-reload; NOT escalated (60-ammo AR at 720 rpm empties in ~5s — no
   mag-dump<1s / charge / per-N-round flavor). Recipe: rounds/min + reload gap from any Label focus video.
2. **⚑ Delusion-uptime (out-of-domain, defensive).** The passive encoding assumes ~100% Delusion uptime;
   a real fight has brief shield-break gaps (re-shield on the next normal attack — sub-second). Estimate:
   near-full uptime. Tier: defensive-mechanic gap, out-of-domain for a DPS sim — no board damage rides on
   it. If unit-facing boss damage is ever modeled, the self buffs must become shield-state-gated and the
   Delusion-Shattered / re-shield lines become live.
3. **Same-model residual (judge-flagged):** the **10s Shared Delusion window is an inference** — the prose
   prints no duration on the S2 ally line ("continuously"); all three same-model agents read it as the
   burst's invulnerability window (10s). And the **passive gate-collapse assumes the shield never breaks**
   (true in v1). Both are in the override's `caveats`; a one-minute owner read of those two caveats is the
   remaining human check.
4. **Self-buff stat equivalence (note, not a gap):** for a SELF buff, `atkPct` (own-ATK scaling) and
   `casterAtkPct` (caster-basis flat add) are mathematically IDENTICAL (caster===target; verified
   byte-equal totals). The driver pins `atkPct` as the literal "ATK ▲%" reading and discriminates on
   scoping (self-vs-allies) + liveness rather than stat-choice.
