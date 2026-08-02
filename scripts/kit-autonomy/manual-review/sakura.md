# Manual review — sakura (Sakura)

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`burstCdr` keyed to `fullBurstEnter` — the burstCast-vs-fullBurstEnter trigger axis; caster-scaled scoped team buff `casterAtkPct`)

> Slug disambiguation: `sakura` IS the original SR/Fire/Supporter/Burst I unit (data `weapon:"SR"`,
> `element:"Fire"`, `burst:"I"`). It is distinct from `sakura-bloom-in-summer` (AR/Wind, aka "sbis").
> Confirmed via `scripts/lint-slug-disambiguation.ts` (the lint enumerates both; the target slug
> `sakura` matches the SR/Fire entry).

## Kit summary

Sakura is a Fire-element sniper Supporter on Burst I. Her damage footprint is entirely two team
buffs; everything else on her kit is defensive, projectile-scoped, or parts-scoped and moves nothing
in a damage-only sim. Every 3rd normal attack she fires, all allies gain a stack of "Cherry Blossom
Tea" — a DEF buff (8.15% of DEF, ×10, 15s) that is provably damage-neutral here (DEF does not feed
damage dealt and the boss deals none). On every team Full Burst entry she refunds all allies' burst
cooldowns by a flat 4.84s (her one genuine rotation lever — it compresses the team's burst cycle; it
is NOT once-per-battle). Her burst grants all allies ATK equal to 23.76% of her OWN ATK for 10s on
every cast (a caster-scaled flat add, ≈23,372 at scope lock — not a percentage of each target's ATK).
The rest is out of domain: damage to enemy projectiles (Anomaly interception only), a 1/battle
reduction of damage taken from Wind-code enemies (defensive; the immortal boss deals no damage), and
a max-Tea-stacks-gated boost to interruption-part damage (inert vs the partless boss, and the
stack-count gate has no engine primitive).

## Line-by-line

| Line                                                               | Disposition      | Notes                                                                                                                                                                                |
| ------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1: hitCount:3 → allies defPct 8.15, ×10, 15s (Cherry Blossom Tea) | FAITHFUL (inert) | A DEF buff (defup icon, no "ATK ▲" prefix). defPct is inert in v1 → whole-board totals byte-identical with the block removed (pinned). Modeled on 3-way blind convergence.           |
| S2: attacking an enemy projectile → damage to it ▲7.74%            | DOCUMENTED_GAP   | Out-of-domain: the sim has no enemy-projectile entity. Verbatim in `unmodeled.skill2`. ⚑ no sim primitive.                                                                           |
| S2: fullBurstEnter → allies burstCdr 4.84s                         | FAITHFUL         | The one damage-moving line (rotation acceleration). fullBurstEnter, NOT burstCast, NOT oncePerBattle. Proven via FB cycle-length (2110f vs 2400f) + oncePerBattle nearest-wrong.     |
| Burst: Wind-code enemy damage ▼90.72% / 30s, 1/battle              | DOCUMENTED_GAP   | Defensive incoming-damage reduction; the boss deals no damage. The "1/battle" clause attaches HERE, not to the ATK line. Verbatim in `unmodeled.burst`.                              |
| Burst: burstCast → allies casterAtkPct 23.76, 10s                  | FAITHFUL         | Caster-scaled FLAT add (0.2376 × sakura staticAtk ≈ 23,372), every cast, all allies. NOT atkPct (which would scale each target's own ATK).                                           |
| Burst: @max Tea stacks → allies partsDamagePct 23.54% / 30s        | DOCUMENTED_GAP   | partsDamagePct inert vs the partless boss (helm H4 precedent) AND gated on a stack count the engine cannot read (no buff-stack-count gate primitive). Verbatim in `unmodeled.burst`. |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Agreed K2/K3/K4/K5
  dispositions; confirmed K5's flat-resolved value and that the "1/battle" clause attaches to K4 (the
  Wind-mitigation sentence), not K5. Flagged K1's stack pool as load-bearing (gate-feeder for K6) but
  its OWN note 4 concluded the tea-stack expiry is kit-silent/measurement-gated and the gated payload
  (partsDamagePct) is inert → "document it rather than tune it." Driver adopted the inert-defPct
  encoding on the strength of this + S5/S6 convergence.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently read S1 as a defensive defPct
  grant ("there is no atkOfDefPct StatKey"), skipped K2/K6 as unobservable GAPs. Vs the driver
  override: **13 pass / 5 fail / 3 skip.** All 5 failures are burstCdr Full-Burst-COUNT assertions in
  the blind's `controlComp` (liter/crown/sakura/helm) fixture: liter is a short-CD Burst I who drives
  the team FB cycle, so FB COUNT ties at 5 with/without the 4.84s refund (it crosses no count boundary
  in 180s). The CDR is provably live in that same fixture by a finer observable — team damage 862.7M
  with CDR vs 856.7M without (~0.7% up) — and the driver's sole-B1 fixture discriminates it cleanly via
  cycle-length. Classified RECON_ERROR (blind-fixture observable coarseness), not an override fault.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. **Block-for-block identical** to the
  driver on all four structural decisions: skill1 defPct 8.15 hitCount:3→allies (×10/15s), skill2
  burstCdr 4.84 fullBurstEnter→allies, burst casterAtkPct 23.76 burstCast→allies/10s, and
  unmodeled skill2(projectile)+burst(wind). SOLE divergence = K6: blind encoded an UNGATED inert
  partsDamagePct 23.54 (its own caveat: gate unenforced, inert vs partless boss, "must be gated if
  parts ever become live"); driver left K6 UNMODELED per helm H4 + the S5 blind skip. Damage-identical
  either way — a documentation-style divergence, not a finding.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, zero gotchas.**
  All six lines FAITHFUL or DOCUMENTED_GAP with verbatim unmodeled records. Judge independently ruled
  the 5 S5 reds "RECON_ERROR-class, attributed to the blind, not the driver" (FB count in a
  liter-dominated comp is too coarse for a 4.84s refund that crosses no count boundary; the blind's own
  team-damage delta + the driver's cycle-length instrument corroborate the CDR is live), and the K6
  divergence "documentation-style, not a finding."

## Residual flags (owner spot-check)

- ⚑ **Cherry Blossom Tea refresh-vs-expiry stack semantics** are kit-silent and currently unobservable
  (defPct is inert). If DEF ever feeds damage, or the K6 parts gate gains a primitive, the
  15s-per-stack refresh question becomes live and needs a MEASUREMENT, not an assumption.
- ⚑ **Max-stacks reachability** at real SR cadence: driver and S5 both estimate ~3–4 stacks steady
  state under non-refreshing expiry (≈4.1s per stack vs a 15s stack life), so the 10-stack cap — and
  therefore K6's gate — may never open in practice. Only matters if parts damage ever becomes live.
- ⚑ **burstCdr observable:** the 4.84s refund does not cross an FB-count boundary inside 180s in a
  liter-dominated comp; it is measurable as a shortened FB cycle length (sole-B1 fixture) or a small
  team-damage delta. A future hand-tune should confirm the rotation acceleration against a real fight.
- Tier stays **MODEL_ONLY** / tuned:false — the gauntlet certifies STRUCTURE (faithfulness), not
  magnitudes; no real fight has validated Sakura's numbers yet.
