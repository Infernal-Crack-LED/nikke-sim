# Manual review — sin (Sin)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped self-only buff windows; `fullBurstEnd` trigger identity; `burstCast`-vs-`fullBurstEnter` keying; resource-gated burst-usage escalation)

> Slug disambiguation: `sin` is the base Missilis unit (AR/Defender/Electric/Burst II, cd 20s,
> released 2023-01-12, `treasure:false`, slug lint clean — no AMBIGUOUS). GREENFIELD build: no
> shipped override existed (`simSupported:false` — before this gauntlet the unit could not sim at
> all, since `resolveSkills` throws for prose-without-override).

## Kit summary

Sin is an Electric AR Defender on Burst II whose kit is almost entirely survivability. When she
fires her last bullet she duplicates 15.03% of the team's highest Max HP onto herself for 5s (in
game a shield; the engine maps the "Duplicate X% Max HP" shape as a Max-HP grant — the quency S1
precedent, whose StatKey comment names sin as the next carrier) and taunts all enemies (no threat
model in v1). Each time a Full Burst ENDS she raises her own Burst Gauge filling speed by 16.17%
for 5s — live (her gauge generation rises) but damage-inert at scope lock, because the fixture
rotation is cooldown-limited and the gauge caps before the next chain anyway. Her Burst Skill
escalates with usage count ("each subsequent effect triggers all effects before it"): lifesteal
(modeled as a self heal-HoT — event-only and behaviorally silent), incoming-healing amplification
(unmodeled — the schema has no such StatKey, but the escalation gate still advances on every cast),
and DEF ▲43.2% (encoded via a `burstUses` resource pool + `resourceGate`, so it applies on every
cast from the third — cumulative semantics pinned against instant-max and cast-3-only
counterfactuals). Her burst's two ■ blocks split cleanly: the Damage Taken ▲12.23% debuff is gated
on "enemy unit(s) (excluding Nikkes) are more than 4" — never satisfiable at single-boss scope, so
never-firing IS the faithful behaviour (and the ungated mis-encoding would over-credit the whole
team ~12% per cast — the kit's highest-leverage trap, absence-pinned with an inflation
counterfactual); the 176.32%-of-final-ATK hit carries NO activation clause, fires unconditionally
on her own cast, lands before the Full Burst window opens, and never takes the +50% major.

## Line-by-line

| Line                                                                    | Disposition          | Notes                                                                                                                                                                    |
| ----------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: last bullet → Duplicate 15.03% Max HP of highest-Max-HP ally, 5s    | FAITHFUL (inert)     | `lastBullet → self highestAllyMaxHpPct 15.03/5s` → maxHpFlat of 15.03% × team-max static HP; ROSTER-TIE: all Defenders share the max static-HP basis, so the basis is provably value-identical to self-basis on every team (equivalence pinned); cadence pinned off engine reload events (liter's team maxAmmoPct window stretches the mag — pulls÷ammo arithmetic invalid); byte-equal totals under removal |
| S1: Attract — taunt all enemies 5s                                      | UNMODELED            | No threat model; partless boss with no ally-targeting AI — zero in-domain surface (nero N7 / delta-ninja-thief precedent); documented verbatim                          |
| S2: FB ends → self Burst Gauge filling speed ▲16.17%/5s                 | FAITHFUL             | `fullBurstEnd → self burstGenPct 16.17/5s`; trigger identity pinned frame-exactly on fullBurstEnd events; fullBurstEnter mis-key discriminated; LIVE (gaugeGenerated rises) yet damage-inert at CD-limited rotation (byte-equal totals) |
| S2: escalation — Once: lifesteal 15.3%/5s                               | FAITHFUL (silent)    | `burstCast → self heal ticks:5` (helm burst-heal precedent); event-only, self-targeted, behaviorally silent in v1 (no recovery-event log kind; no consumer of sin's own recovery) |
| S2: escalation — Twice: incoming healing ▲51%/5s                        | UNMODELED            | No incoming-healing StatKey (nero grumpy-cat ruling); the escalation GATE still advances on every own cast, so steps 1/3 fire on exactly the right casts                |
| S2: escalation — Three times: DEF ▲43.2%/5s                             | FAITHFUL (inert)     | `burstCast → self defPct 43.2/5s, resourceGate {burstUses min:2}`; absent on casts 1–2, present on every cast from the 3rd (cumulative); instant-max and cast-3-only counterfactuals discriminated; defPct inert in v1 |
| Burst: >4 enemies → all enemies Damage Taken ▲12.23%/5s                 | UNMODELED            | Gate never satisfied at single-boss scope (1 enemy) — never-firing IS faithful; no enemy-count primitive; ungated nearest-wrong would inflate the whole team ~12% per cast (⚑2); absence canary + inflation counterfactual |
| Burst: enemies in attack range → 176.32% final ATK damage               | FAITHFUL             | `burstCast → enemy flatDamage 176.32`; own-cast keyed; lands pre-FB (fbMajorApplied pinned false); level-1 magnitude 88.16 counterfactual discriminated; 99/100 roster nukes are non-crit (convention) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on the
  Max-HP duplication (basis + inertness), the fullBurstEnd gauge window, the 176.32 own-cast nuke
  (explicitly NOT folded under the >4-enemies header), the taunt and >4-enemy residuals, and the
  fixture-validity warning (a crown-style competing B2 would starve sin to zero casts — avoided by
  the sole-B2 fixture). ONE divergence reconciled: S2b judged the escalation cluster FAITHFUL
  (cumulative) where the driver had assumed no usage-count primitive existed — the driver's schema
  check falsified that assumption (`resources` + `resourceGate`, soda-twinkling precedent), and the
  cluster is modeled (steps 1+3; step 2 unmodeled for the missing StatKey). S2b's claim that the
  nuke "crits at the caster's sheet rate" was REJECTED (flatDamage crit is opt-in; 99/100 shipped
  burst nukes omit it).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Raw file crashes at module load on four
  RECON_ERROR shape classes (`ov.<slot>.blocks` containers, `.slot` vs `.position`, `srcSlot`-as-unit-index,
  `.buckets` vs `.breakdown`); the mechanically-adapted copy (`blind/sin.adapted.test.ts`, changes
  annotated A1–A5, no assertion touched) scores **20 pass / 1 fail / 4 skip** vs the driver override.
  The sole failure is `durationShots toBeUndefined()` receiving `null` — payload-shape RECON_ERROR,
  the semantic (timed, not round-counted) holds. The 4 skips are S5's own GAP markers (highest-ally
  basis unobservable — independently derived from the roster-tie; taunt/lifesteal/incoming-healing
  unobservable). Notable greens: the >4-enemy ABSENCE assertion + its ungated-inflation
  discrimination (the kit's highest-leverage trap), fullBurstEnd trigger identity, escalation
  monotonicity, teammate-byte-identity under burst removal, FB-exempt + no-range nuke.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. skill1 BYTE-IDENTICAL (both
  independently chose `highestAllyMaxHpPct 15.03/5s` on lastBullet self) and the gauge block
  BYTE-IDENTICAL. Escalation authored as an invented `kind:'escalating'` effect (non-schema —
  RECON_ERROR) with a defPct-0 placeholder for the unmodelable step 2 — semantically identical to
  the driver's resourceGate encoding. Nuke carries `crit:true` (vs the 99/100 non-crit roster
  convention the driver followed) and `noFb:true` (redundant — the cast lands pre-FB regardless;
  the driver's test pins `fbMajorApplied === []` without the flag).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true,
  gotchas:[].** All eight kit lines FAITHFUL or DOCUMENTED_GAP with live-fire confirmation and
  working counterfactual discrimination; the three deliberate skips (taunt, incoming-healing step,
  gated debuff) documented verbatim with recipes. Result: `scripts/kit-autonomy/results/sin.json`.

## Residual flags (owner spot-checks)

- **⚑1 CADENCE TUPLE (mandatory):** AR rate_of_fire 720 (12/s) + ammo 60 + reloadFrames 81 shipped
  at datamine-synced values (no charFixes; no odd-fire-mode text tell → not escalated). Drives her
  pull count, the S1 lastBullet cadence (~6.35s per mag cycle at base cadence) and her gauge
  contribution. Recipe: rounds/min + reload gap from any focused sin video. Tier: low.
- **⚑2 OUT-OF-DOMAIN (multi-enemy content):** the burst's Damage Taken ▲12.23%/5s needs an
  enemy-count gate (>4 non-Nikke enemies) the schema lacks; at single-boss scope its impact is
  exactly zero (gate never met). Recipe if multi-target fights enter scope: enemy-count gate
  primitive + the debuff as `damageTakenPct` on all enemies, 5s per cast. Tier: out-of-domain.
- **Step-1 lifesteal** is modeled but event-only and behaviorally silent (no recovery-event log
  kind; no consumer of sin's own recovery) — becomes observable only if a team-recovery consumer
  ever lands.
- **S1 basis** (highest-ally vs self Max HP) is provably value-tied roster-wide (every Defender
  shares the identical 16500+3000+200 static-HP basis; no non-Defender reaches it) — equivalence
  pinned, not discriminated; re-judge only if a unit with higher static Max HP ever ships.
