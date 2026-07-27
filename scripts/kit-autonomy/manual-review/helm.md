# Manual review — helm (Helm (Treasure))

**Gauntlet date:** 2026-07-25
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped-buff `critRateNormalPct`; round-count `durationShots`; `burstCast`-vs-`fullBurstEnter`; meta-defining Crown heal synergy)

> Slug disambiguation: `helm` IS the Treasure variant (data `treasure:true`, name "Helm (Treasure)",
> aka "thelm", SR/Water/Attacker/Burst III). It is distinct from `helm-aquamarine` (AR/Iron, "shelm").

## Kit summary

Helm (Treasure) is a Water-element sniper Attacker on Burst III who charges every shot. Each
full-charge pull does three things at once: it heals the whole team a little (event-only — no HP
pool), dumps 14.31% into the team burst gauge (a large rotation accelerator on a ~1.37s shot cycle),
and tacks a 178.98%-of-ATK rider onto whatever she shot. When the last round of her six-shot magazine
lands, every ally gets +14.64% critical rate on NORMAL ATTACKS ONLY for 5s (it never lifts crit on
skill procs or burst damage). On entering Full Burst she gives all allies +27.87% Attack Damage for
10s (TREASURE value; the untreasured base was 11.85), and she passively adds interruption-part damage
that is exactly inert against the partless scope-lock boss. Her burst fires one 8236.8%-of-ATK nuke at
the strongest enemy (FB-exempt — the cast lands before the window opens), opens a 10-second team
recovery window, and raises her OWN charge-damage multiplier by 158.4% for her next 10 ROUNDS
(`durationShots`, not seconds — on a 6-round magazine it necessarily spans a reload).

## Line-by-line

| Line                                                  | Disposition      | Notes                                                                                                                |
| ----------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| S1: lastBullet → allies critRateNormalPct 14.64/5s    | FAITHFUL         | Scoped to NORMAL ATTACKS only (never generic critRatePct); H1 discriminates 3 ways                                   |
| S1: full charge → allies heal (0.59% Max HP)          | FAITHFUL         | Event-only (no HP pool); drives Crown's "when recovery takes effect" — load-bearing through tandem                   |
| S1: full charge → fill Burst Gauge 14.31%             | FAITHFUL         | Carried by `data/gauge-per-shot.json` (`flatPerTrigger 1431`, datamined 2-way), NOT an override block                |
| S2: passive → allies partsDamagePct 3.08              | FAITHFUL (inert) | Exactly byte-identical totals vs partless boss (H4), not merely "small"                                              |
| S2: fullBurstEnter → allies attackDamagePct 27.87/10s | FAITHFUL         | TREASURE value (base 11.85); `fullBurstEnter` NOT `burstCast`                                                        |
| S2: full charge → enemy flatDamage 178.98%            | FAITHFUL         | Once per pull, crit-eligible, no core/range; ⚑ trigger read as `shotFired`                                           |
| Burst: burstCast → enemy flatDamage 8236.8%           | FAITHFUL         | TREASURE nuke (base 1237.5); FB-exempt (H7: empty fbMajorApplied list)                                               |
| Burst: burstCast → allies recovery 54.45%/10s         | DOCUMENTED_GAP   | Event-only 10-tick/1s window; no magnitude fabricated; H8 pins under isolation                                       |
| Burst: burstCast → self chargeDamageMultPct 158.4     | FAITHFUL         | `durationShots:10` (ROUNDS, no timed expiry), self-scoped; rounds-vs-seconds pinned in engine/duration-shots.test.ts |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 8 load-bearing lines
  FAITHFUL; 1 non-load-bearing GAP (burst lifesteal). CONVERGED on 7 lines; H3 CONVERGED (gauge fill
  location differs — data pipeline vs override); H8 PARTIAL (lifesteal: reviewer preferred
  unmodeled-verbatim, driver models an event-only window).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 9 kit lines.
  Out-of-box vs the driver override: 23 pass / 6 fail / 1 skip. **All 6 failures are RECON_ERRORs**
  (encoding-detail guesses, not kit-line errors): the charge StatKey (`chargeDamagePct` vs the
  schema-correct `chargeDamageMultPct`, 4 tests) and the gauge-fill LOCATION (override `fillGauge`
  block vs `gauge-per-shot.json`, 2 tests). Every kit-line assertion the blind got right — scoped
  crit, 27.87 treasure on fullBurstEnter, 178.98 rider, 8236.8 FB-exempt nuke, inert parts — passed
  unchanged. After adapting only those two guesses (`blind/helm.adapted.test.ts`): **29 pass / 1 skip**.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on every load-bearing
  decision (scoped crit, `fullBurstEnter` not `burstCast`, `durationShots:10` not seconds, FB-exempt
  nuke, inert parts, shotFired riders). Diverges on 3 RECON_ERRORs (charge key, gauge location, heal
  field — driver is schema-correct) + the lifesteal treatment (blind: unmodeled-verbatim).
- **S7 (claude-opus-5, binding judge):** **GO, faithfulness 1.0, discriminationOk:true.** All 9 lines
  accounted (8 FAITHFUL + 1 DOCUMENTED_GAP), zero silent drops. Judge independently verified each of
  the 6 blind reds is a predicate mismatch, not a behavioural divergence, and ruled the driver's
  event-window lifesteal "acceptable and marginally more faithful than unmodeled-verbatim" (kept as
  DOCUMENTED_GAP because the 1s cadence is invented).

## Residual flags for owner

1. **SR cadence note slip — RESOLVED during gauntlet.** The S7 judge flagged the override note's
   "60f charge + 30f recovery = validated 90-frame cycle" as contradicting both SSOT docs (MEASURED
   60f + 22f = 1.37s, citing helm's own recording). Driver verified: the engine ships
   `SR_BOLT_RECOVERY_FRAMES = 22` (`src/engine/sim.ts:139`, matching the SSOT) and measured ~105 helm
   pulls/180s (≈82f cycle, far above the ~95 a 90f cycle would give). **The engine is correct and was
   NOT touched** (protected + engine-wide); the stale note sentence was corrected, along with a second
   note slip (rl3 arithmetic "8.4 + 3×14.31" sums to 51.33; the closing form is 3×(5.6+14.31)=59.73
   using the boss-doubled 5.6%/shot weapon gen — which corroborates the 14.31 fill even more strongly).
2. **⚑ full-charge trigger read (MEASUREMENT-GATED).** "Hitting a target with Full Charge" is read as
   `shotFired` (every auto SR pull = one full charge that lands) for the S1 heal/gauge tier and the
   178.98% rider. Needs a helm focus video showing one rider popup per charged shot. If any
   partial-charge shots occur, the rider count falls short of the shot count.
3. **Lifesteal DOCUMENTED_GAP.** The 54.45%-of-attack-damage recovery is modeled as an event-only
   10-tick/1s window (no magnitude, no HP pool). Both blind roles preferred unmodeled-verbatim; the
   judge ruled the driver's window acceptable. Watch item: it is a SECOND recovery source (~10 firings
   × 4 allies per burst) — any future consumer that COUNTS recoveries (rather than being refreshed by
   them) would be over-fed. Board-inert today (S1's ~1.5s heal already saturates Crown-style consumers).
4. **Gauge suppression not event-asserted.** H3's `it.skip` documents that the gauge pipeline emits no
   event, so "unscaled by focus + suppressed during FB/chain" is not assertable from the log today
   (owned by the step-2 gauge-backfill row, not this file).
