# Manual review — emilia (Emilia)

**Gauntlet date:** 2026-08-02
**Verdict:** NO-GO(engine-core)
**Faithfulness:** n/a (no faithful override is landable on the current engine)
**Tier:** 2 (`burstCast`-vs-`fullBurstEnter`; round-count `durationShots`; meta-defining single-shot charge nuke)

> Slug disambiguation: `emilia` is unique (S0 lint clean, no AMBIGUOUS; nickname "emi"). RL / Attacker
> / Water / Burst III, cd 40s, ammo 6, chargeFrames 60, chargeMultiplier 250%, normalMult 61.3,
> coreMult 200%. A Re:Zero collab unit (Abnormal). First modeling attempt — no prior override, no
> kit-status row, `simSupported:false` (left as-is by this run).

## Kit summary

Emilia is a Water RL Attacker whose entire identity is a single enormous full-charge nuke. Her burst
("Freezing Witch") buffs her NEXT shot's Charge Damage by **+1300.53%** (charge multiplier 250% →
1550.53%) for exactly one shot, at the cost of **-300% Charge Speed** on that shot (it charges far
slower). Around that nuke she has sustained full-charge self-buffs: every full charge gives herself
+13.01% Charge Speed (1 round) and +2.01% Charge Damage _per unit of her final Max Ammunition
Capacity_ (1 round). On every full-charge hit she also deals **Fixed Damage to the main body equal to
58.99% of the damage she just dealt** — a "%-of-hit repeat" rider that fires on every charged shot,
nuke included. Entering Full Burst raises her Max Ammunition Capacity by +3 for 10s, and her burst
also doubles her Explosion Range (+101.24%, 10s).

## Line-by-line

| Line                                                                                 | Disposition                | Notes                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: full charge → self Charge Speed ▲13.01% / 1 round                                | MODELABLE (FAITHFUL)       | `shotFired` → self → `chargeSpeedPct 13.01`, `durationShots:1` (RL pull = one full charge).                                                                                                                                                                                             |
| S1: full charge → self Charge Damage ▲2.01% per unit of final Max Ammo / 1 round     | MODELABLE (approx) + ⚑     | Base 6 ammo ⇒ +12.06pp ⇒ `chargeDamagePct 12.06`, `durationShots:1`. The _dynamic_ "per unit of FINAL Max Ammo" scaling (which would rise to +18.09pp while S2's +3 ammo is live) has **no primitive** — `perResource` reads named resource pools, not the computed `maxAmmo()`. Minor. |
| **S2: full-charge hit → Fixed Damage to main body = 58.99% of damage dealt by self** | **BLOCKER (missing prim)** | **The reason for NO-GO(engine-core).** See below.                                                                                                                                                                                                                                       |
| S2: entering Full Burst → self Max Ammunition Capacity ▲3 / 10s                      | MODELABLE (FAITHFUL)       | `fullBurstEnter` → self → `maxAmmoFlat 3`, `durationSec:10` (theme-14 "▲ N round(s)" precedent: grave/noir/tove/trina — `drake`'s Max Ammo lines are genuinely percent in kit text, not a flat-round precedent). Indirect damage impact (more shots before reload).                     |
| Burst: self Explosion Range ▲101.24% / 10s                                           | UNMODELED (inert)          | Splash **radius**; no splash-radius primitive, and inert vs the single scope-lock boss (no adds to splash onto). Verbatim in `unmodeled`, `partsDamagePct`-inert precedent. Not load-bearing on this basis.                                                                             |
| Burst: Freezing Witch — Charge Speed ▼300% for 1 shot (downside)                     | ⚑ (secondary)              | `chargeSpeedPct` is clamped to `[0,100]` in `sim.ts` (`Math.min(100, Math.max(0, …))`), so a _negative_ charge speed (slower charge) is unrepresentable. Omitting it OVER-credits her (the nuke charges ~4× faster in sim). A downside; minor fire-rate fidelity gap, 1 shot / 40s.     |
| Burst: Freezing Witch — Charge Damage ▲1300.53% for 1 shot                           | MODELABLE (FAITHFUL)       | `burstCast` → self → `chargeDamagePct 1300.53`, `durationShots:1`. The signature nuke: an ordinary additive charge-bucket buff (NOT collection-item `chargeDamageMultPct`), charge mult 250% → 1550.53% on that one shot. Load-bearing and fully modelable.                             |

## The blocker — S2 "Fixed Damage = 58.99% of the damage dealt by self"

This line is a **"%-of-hit repeat"**, documented as a first-class damage mechanic in the SSOT
(`docs/data/nikke-damage-formula.md` §3): _"%-of-hit repeats ('deals X% of the damage dealt') inherit
everything from the parent hit implicitly."_ When Emilia's full-charge hit lands for damage `D`, this
proc deals an additional `0.5899 × D` as a separate Fixed-Damage instance to the main body, inheriting
the parent's crit / element / Damage-Up / Full-Burst state, and (per the function-damage table) NEVER
coreing and NEVER taking the +30% range bonus.

**Why it cannot be landed faithfully:**

- **No engine primitive.** A full grep of `src/` finds no effect that scales a rider off the parent
  hit's computed damage (no `pctOfHit` / `echo` / `mirror` / `repeat` / `fixedDamagePct` effect; the
  only damage-dealing effects are `flatDamage` / `storedHit` / `dot`, all of which take a static
  `atkPct` = % of final ATK, not % of damage dealt). Emilia is the **first offensive carrier** of this
  mechanic in the roster (the only other "damage dealt" kit text is `sakura`'s _defensive_ "damage
  dealt BY Wind Code enemies ▼90.72%", an out-of-domain damage-taken-reduction line).
- **Load-bearing.** It fires on **every** full-charge hit (≈ +58.99% per charged shot, nuke included)
  — comfortably the largest single contribution to her sustained damage and a major addition to the
  nuke itself. Far above any ±3% board band.
- **In-domain.** It is an offensive damage dealer with a trigger that fires abundantly on the
  scope-lock basis (`shotFired` / full-charge landing). Only the damage _effect_ lacks a primitive.
- **Folding it into a bucket would be a fudge.** The nearest-wrong encoding is `chargeDamagePct ≈
147.48` (= 0.5899 × base charge 2.5), which reproduces the proc's total on a full-charge hit _only if_
  the proc shares the parent's charge/dmgUp/elem/crit. But the proc is function damage that **never
  cores and never takes range**, whereas charge-bucket damage cores and ranges with the main hit — so
  the fold silently over-credits on every core hit. That is exactly the "weaken-to-GO" the gauntlet
  forbids; a blind judge would (correctly) flag it as a REAL-GOTCHA.

**Why this is NO-GO(engine-core) and not a ⚑-tolerated GO:** S4 of the gauntlet procedure rules
_"a missing primitive blocking a LOAD-BEARING line → NO-GO(engine-core); inert/out-of-domain lines →
⚑/UNMODELED, not NO-GO."_ The contrast case is `yulha` (landed GO, faithfulness 1.0, with its
load-bearing Calm mechanic UNMODELED): Calm is **out-of-domain** — it triggers "when attacked 30
times", and the immortal-boss sim never acts, so the line _cannot fire_ and omitting it is an honest
omission. Emilia's S2 proc is the opposite: it fires on every full charge, so omitting it is a forced
weakening of an in-domain damage dealer, not an honest omission.

## Recommendation

Add a "%-of-hit repeat" rider primitive to the engine, then re-run this gauntlet. Concretely:

1. **Primary (the blocker):** a new `EffectDef` — e.g. `{ kind: 'hitRepeat', pct: number }` (or a
   `pctOfHitDamage` field on `flatDamage`) — that, when the carrying trigger's hit lands, deals an
   additional function-damage instance equal to `pct%` of that hit's **final** damage, inheriting the
   parent's crit / element / Damage-Up / Full-Burst state, **never core, never range** (per
   `nikke-damage-formula.md` §3). Thread it through the `dealDamage` landing path so the parent's
   computed damage is available. Emilia's S2 then encodes as `shotFired → enemy → hitRepeat pct:58.99`.
2. **Secondary (fidelity, not blocking):** support **negative** `chargeSpeedPct` (a "Charge Speed ▼"
   downside) so the burst's -300% charge speed can slow the nuke shot; and a buff source that scales by
   live `maxAmmo()` for S1's "per unit of final Max Ammunition Capacity" charge-damage line.

With (1) in place the remaining six lines are all modelable as listed above and this unit should
re-gauntlet to GO.

## Cross-family corroboration

Not run. NO-GO(engine-core) is determined at S4 directly from the SSOT damage-formula doc + a
definitive engine grep; the gauntlet procedure STOPs at S4 for an engine-core blocker, so the blind
S2b/S5/S6/S7 dispatches (which exist to corroborate a GO) were not spent. The finding rests on
authoritative sources, not driver interpretation: the SSOT names the mechanic, and the engine has no
branch for it.

## Residual flags for owner

1. **Engine primitive gap (the blocker).** "%-of-hit repeat" / Fixed-Damage-mirror riders have no
   engine support. Emilia is the first offensive carrier; any future unit with "deals X% of the damage
   dealt" kit text hits the same wall. Highest-leverage fix.
2. **Negative charge speed.** `chargeSpeedPct` clamps to `[0,100]`; "Charge Speed ▼" downside lines
   (Emilia's burst -300%) are unrepresentable and currently over-credit charge rate when omitted.
3. **Max-ammo-scaled buffs.** No primitive scales a buff by live `maxAmmo()` (S1's per-ammo charge
   damage). Minor for Emilia; would matter for any kit with a larger ammo-scaled term.
4. **No partial override committed.** Deliberately did NOT author a subset override in
   `src/skills/overrides/` — a file omitting the load-bearing S2 proc would read as a landed (weakened)
   unit. `simSupported` stays `false`; no kit-status row added. The full proposed encoding for the six
   modelable lines is recorded in the table above so nothing is lost for the re-run.
