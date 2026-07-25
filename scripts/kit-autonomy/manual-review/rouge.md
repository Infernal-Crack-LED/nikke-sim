# Manual review — `rouge` (Rouge)

**Verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **Tier 2** · gauntlet 2026-07-25
SR / Supporter / Electric / Burst I (cd 20s). Cross-family: S2b `claude-fable-5`, S5/S6/S7 `claude-opus-5`.

## What she is
A zero-damage-line support. Her entire contribution is team support: a repeating team-wide
burst-cooldown cut, a positional Attack Damage aura, and a burst team-ATK grant. Everything else
is Max-HP / Damage-Taken bookkeeping that is offensively inert on a partless boss that deals no
damage and where ally-granted Max HP feeds no ATK conversion.

## The three load-bearing (damage-moving) lines — all FAITHFUL, all proven LIVE
| Line | Encoding | Why it discriminates |
| --- | --- | --- |
| S1 — Cooldown of Burst Skill ▼7s every 8 Full Charges (all allies) | `hitCount{8}` → allies → `burstCdr{seconds:7}` | the kit's dominant lever; deleting it strictly collapses rouge's burstCast count over 180s |
| S2 — Sword Coin: Attack Damage ▲6.65% (self + 2 each side, continuous) | `passive` → `selfAndAdjacent{sides:2}` → `attackDamagePct 6.65` | positional: edge-slotted rouge covers {0,1,2}, provably misses slot 3; all-allies counterfactual reaches all 4 |
| Burst — ATK ▲15.07% of caster ATK, 10s (all allies) | `burstCast` → allies → `casterAtkPct 15.07, durationSec 10` | flat-resolved off rouge.staticAtk (emitted value ≫ 15.07, so not plain `atkPct`); deleting it drops the carry's total |

`hitCount` is the real engine trigger (SR is hitsPerShot 1 and auto always full-charges, so
hits ≈ full charges). The blind's `chargeCounter` guess is not in the engine TriggerDef union.

## Inert Max-HP grants (the key ruling)
Every "Max HP ▲ X% of the skill user's Max HP" line is a `casterMaxHpPct` **ally** grant.
Ally-granted Max HP does **NOT** feed a consumer's ATK=%-of-Max-HP conversion — the conversion
counts the consumer's OWN Max HP only (MEASURED cinderella e3 video; SSOT
`docs/data/damage-calculation.md:106-107`; engine enforces via `effectiveAtk` casterIdx===self).
Rouge has no `atkOfMaxHpPct` line of her own, so even her self-grants feed nothing, and the engine
has no HP pool. **The grants move no damage** — the unit test ASSERTS this (byte-identical totals
with every inert stat stripped). This REFUTES the 2026-07-13 "Max-HP grants are OFFENSIVE for
Cinderella" reading and resolves the prior kit-status F1/F2 "double-counted" finding (the old
fudged timeline averages 2.3/7.5/22/22.5/8.7 are removed; exact kit magnitudes used where encoded).

Encoded for kit-completeness (cross-family consensus) + asserted inert: S1 Max HP 5% (`hitCount 8`,
5s), S2 Double Sword 15.08% (`burstCast everyN:5`), Shield Coin Damage Taken ▼15.2% (`hitCount 30`,
negative ally `damageTakenPct`, inert). The three per-tier **burst** riders (10.15/20.1/30.02) are
**unmodeled** — coin-state-gated, the engine tracks no coin state, and firing them every cast would
over-credit the cadence; documented verbatim.

## Open residuals (all pre-flagged, all measurement-gated; none block GO)
1. **Coin exclusivity (med — the only flag that touches damage).** Prose is silent on whether
   Sword→Shield→Double Sword REPLACES or COEXISTS. If Shield Coin replaces Sword Coin at ~30 Full
   Charges (~45-60s), the 6.65% Attack Damage dies mid-fight (≈¾ of the run over-credited). Shipped
   reading = permanent ("continuously", no removal clause — the literal one; all three families
   converged on it). **Recipe:** focus video — does the 6.65% persist on rouge's neighbours after
   Shield Coin activates? Do not adjust any magnitude to compensate.
2. **Shield-Coin burst-rider heal asymmetry (med).** Four of five Max-HP lines say "without
   restoring HP"; the Shield-Coin rider (20.1%) ALONE omits it → literally a heal, which could arm
   on-recovery consumers (crown). Driver ships no-heal; S6 blind ships `heal{ticks:1}`; S2b graded it
   MISSING — a genuine cross-family split on a literal-word inference. Shield-Coin-gated (engine
   can't track) + crown's recovery typically already saturated. **Recipe:** rouge+crown focus video,
   confirm Shield Coin active, does crown's on-recovery buff refresh on rouge's burst?
3. **Ally-held negative `damageTakenPct` (low).** Encoded inert (negative ally value read by nothing;
   `damageTakenPct` is a boss-side term). Inertness assertion is the guard. If a future engine change
   makes ally-held `damageTakenPct` live, introduce a distinct ally damage-reduction stat or move to
   `unmodeled`.

## Cross-family convergence
- **S2b (fable)** corroborated all three offensive lines + the inert determination; pre-registered
  coin-exclusivity as the shared-prior misread and spotted the heal asymmetry.
- **S5 (opus)** blind test independently derived the same three lines + inert grants. Pristine had 3
  structural harness-API guesses wrong (`opts.onEvent` vs `cfg.onEvent`; `durationShots` null-vs-undefined;
  `controlComp` slots rouge mid-comp masking the positional scope). The **adapted copy**
  (`blind/rouge.adapted.test.ts`, assertion INTENT unchanged) is **GREEN vs the driver override:
  23 passed / 3 documented GAP skips**.
- **S6 (opus)** blind override converged on the three offensive lines + inert determination + both
  flags. Divergences all inert/structural and driver-favored: `sides:2` (literal) vs `sides:1` (opus
  ⚑); `hitCount` (valid) vs `chargeCounter` (opus guess); burst riders unmodeled (driver) vs
  resource-gated proxy (opus, damage-neutral); Shield Coin Damage-Taken modeled-inert (driver) vs
  unmodeled (opus).
- **S7 (opus, binding judge)** → **GO, faithfulness 1.0**, discriminationOk, S5 GREEN.

## Owner spot-checks (same-model residuals the judge flagged)
- The driver's R2 linear-scaling discriminator is also green under plain `atkPct`; caster-scaling is
  pinned by the added `value > 15.07` bound (folded in from S5 per the judge) + S5's independent
  assertion. Done.
- No assertion pins that rouge reaches a 5th burst cast, so the S2 Double Sword `everyN:5` block's
  firing is inferred from the expected 7-9 full bursts rather than observed (inert either way).

## Blast radius
The whole kit is zero-damage-line support, so the blast radius of every open flag **except coin
exclusivity** is exactly zero. Board reading 1.034 (HOT ▲, 0.96–1.07) — unchanged by the inert-grant
cleanup (offensive lines identical).
