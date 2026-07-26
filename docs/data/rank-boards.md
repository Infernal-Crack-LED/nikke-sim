# Ranking boards beyond DPS — methodology

> Four ranked lists that sit next to the DPS chart: burst generation, burst
> cooldown reduction, sustain, and buffer value. Backend artifacts live in
> `web/public/` (`burstgen.json`, `burstcdr.json`, `sustain.json`,
> `bufferchart.json`), built by `npm run ranks:all` (sources in `src/ranks/`,
> builders in `scripts/build-*.ts`). Everything below is scope lock: level 400,
> Base-5 gear, 3★ / core 7, 10/10/10 skills, 180-second fight.

## Burst generation (`burstgen.json`)

Ranks every sim-supported unit by the **total burst gauge it generates over
180 seconds**, uncapped (the 100% bar cap is ignored for the count; 100 = one
full bar). The unit fights **solo with bursting turned off** — the bar sits
pinned at 100% and every point of generation is counted, including the
over-cap waste a real fight would lose. Kit gauge effects are included (the
sim runs the unit's full override). The tested unit holds camera focus, so
charge weapons get the measured ×2.5 focus bonus.

Two units run with partners because their fills scale with team ammunition
burn: **Little Mermaid with two machine-gun partners** (her 400-ammunition
fill procs far more often) and **Cinderella: Crystal Wave with one**. A 2026-07-26
census of every burst-gauge-tagged kit confirmed these are the only two
team-scaling mechanics; every other kit works identically solo.

Consequence to know: gauge effects that require a Full Burst to have happened
read zero (none exist among sim-supported units today).

## Burst cooldown reduction (`burstcdr.json`)

Ranks the fifteen burst-CDR-tagged units by **nominal team cooldown reduction,
in seconds, per 40 seconds of fight**. Cooldown reduction that triggers per
Full Burst is counted at a standard 20-second full-burst cycle (two procs per
40 seconds); escalating ladders (Liter, Volume, Dolla, Helm: Aquamarine) are
ranked at their capped value with the ramp shown. Shot-triggered reduction
(Dorothy per magazine, D: Killer Wife / Rouge per 8 full-charge shots, Milk per
10) is valued off the unit's own simulated fire cadence.

Nominal, not effective: reduction landing on a unit already off cooldown is
wasted in real rotations, and conditional lines (formation requirements,
own-burst status) are noted, not deducted. Self-only cooldown reduction is a
note column, never part of the ranked value.

## Sustain (`sustain.json`)

Ranks healing and shielding units by **total effective HP restored plus
shielded over 180 seconds, team total**. One simulated fight per unit (no-op
teammates, bursting on, roughly a 20-second rotation) supplies the caster's
final Max HP and the exact burst/shot timeline; the kit's heal and shield
lines are then valued analytically against that timeline (the engine
deliberately does not model HP — the boss deals no damage at scope lock).
Multi-ally lines count per target at the caster's Max HP basis.

Pair profiles: **Prika runs with Mint** (their duet keeps Prika's Performance
— and with it her heal-over-time and outgoing-healing potency — up
permanently), and **Anchor: Innocent Maid runs with Mast: Romantic Maid**
(satisfies the same-squad condition on her Full-Burst recovery).

Two honest limitations: "recover X% of attack damage" lines are valued on the
unit's **own** damage only (in a real team, allies' damage counts too, so
lifesteal-style healers like Helm read low); and lines that cannot trigger at
scope lock — low-HP conditions, cover-HP recovery, on-attacked procs — count
zero by construction, not because the kit is weak.

## Buffer value (`bufferchart.json`)

Ranks supports by the **damage they add to two standard carries**: synthetic
class-modal machine-gun and rocket-launcher attackers (no skills, scope-lock
attacker stats, both elementally advantaged), simulated with the tested buffer
versus a no-op in the same burst slot. The buffer's own weapon damage is not
counted. Burst-1 and Burst-2 units burst on cooldown; a tested Burst-3 buffer
sits rightmost and never bursts, so its value must come through passives.
Value that comes through faster rotations (gauge batteries, cooldown
reduction) is captured, because the whole fight is simulated.

Two boards per unit:

- **Generic** — the plain machine-gun + rocket-launcher carry pair. Only buffs
  that need nothing special from their targets apply (attack, critical,
  generic damage; rocket-launcher normals already count as projectile
  explosions).
- **Typed** — the carries adapt to the buffer's kit, derived automatically
  from its override: weapon-typed targets swap both carries to that weapon
  (Tove → shotguns), pierce buffs grant both carries pierce (Ade: Agent
  Bunny), projectile-explosion buffs make both rocket launchers (Anis:
  Sparkling Summer), element-typed targets set both carries' element.

Read generic as plug-and-play value and typed as built-around value. Purely
defensive kits read near zero — the scope-lock boss deals no damage, so there
is nothing to mitigate. Buffs gated on external triggers the comp lacks (for
example recovery-triggered lines with no healer present) also read low.
