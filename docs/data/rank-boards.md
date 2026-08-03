# Ranking boards beyond DPS — methodology

> Five ranked lists that sit next to the DPS chart: burst generation, burst
> cooldown reduction, sustain, buffer value, and B1/B2 DPS. Backend artifacts
> live in `web/public/` (`burstgen.json`, `burstcdr.json`, `sustain.json`,
> `bufferchart.json`, `b1b2dps.json`), built by `npm run ranks:all` (sources in
> `src/ranks/`, builders in `scripts/build-*.ts`). Everything below is scope
> lock: level 400, Base-5 gear, 3★ / core 7, 10/10/10 skills, 180-second fight.

## Burst generation (`burstgen.json`)

Ranks every sim-supported unit by the **gauge-percent it contributes per second of active gauge-building time** over a 180s fight with a standard no-op team and bursting enabled. The unit under test is placed as the **leftmost member of its burst category** so it bursts first when ready, and is measured **unfocused** — camera focus is parked on a non-charge no-op teammate, so charge weapons generate at ×1.0 (the ×2.5 focused charge bonus is a camera artifact a board cannot grant to every unit at once, so it is not applied here). Teammates are weapon-modal no-op controls with empty kits, so the value comes from the unit's own kit, weapon cadence, and burst rotation.

The reported value is `unit.gaugeGenerated / sim.gaugeBuildTimeSec` — the unit's uncapped total contribution divided by the time the team bar was actively accepting energy (not full, not locked in Full Burst or a chain stage). The artifact also reports the team's **Full Burst count** for that fight.

The no-op B1 (AR) is a synthetic placeholder with a 7 s team burst-cooldown reduction on its burst cast. This normalizes control teams for the baseline CDR a real B1 enabler contributes, even though the placeholder has no other skills.

Standard no-op teams (the unit under test is inserted at the ▼ slot):

- **B1 20s** — `[▼unit, B2 SR, B2 SR, B3 RL, B3 MG]`
- **B1 40s** — `[▼unit, B1 AR, B2 SR, B3 RL, B3 MG]` (a second B1 covers off-rotations while the 40s B1 is on cooldown)
- **B2** — `[B1 AR, ▼unit, B2 SR, B3 RL, B3 MG]`
- **B3** — `[B1 AR, B2 SR, B2 SR, ▼unit, B3 RL]`

Λ units are pinned to B3 for this board. Gauge effects that require a Full Burst to have happened are now counted because the team actually bursts.

**Pair profiles** (`with-2mg` / `with-mg`): the two team-ammo-scaling kits still get MG partners, but now the partners are slotted as B3 teammates so they also sustain the rotation:

- **Little Mermaid** — B3 slots become MG: `[LM, B2 SR, B2 SR, B3 MG, B3 MG]`
- **Cinderella: Crystal Wave** — the second B3 becomes MG: `[B1 AR, B2 SR, B2 SR, CWC, B3 MG]`

Both units are ranked **both ways** — plain base team and profiled — flagged `null` / `with-2mg` / `with-mg` so the two standings compare at a glance.

## Burst cooldown reduction (`burstcdr.json`)

Ranks the fifteen burst-CDR-tagged units by **nominal team cooldown reduction,
in seconds, per 20-second Full Burst, averaged over a 180-second fight**.
Full-Burst-triggered CDR is counted once per 20-second cycle; escalating ladders
(Liter, Volume, Dolla, Helm: Aquamarine) are averaged across the full fight so
their ramp-up pulls the headline below the capped steady-state. The per-FB ramp
is shown alongside the averaged value. Shot-triggered reduction (Dorothy per
magazine, D: Killer Wife / Rouge per 8 full-charge shots, Milk per 10) is valued
off the unit's own simulated fire cadence.

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
(satisfies the same-squad condition on her Full-Burst recovery). Both are
ranked with and without the profile (`with-mint` / `with-mast-rm` / `null`).

Two honest limitations: "recover X% of attack damage" lines are valued on the
unit's **own** damage only (in a real team, allies' damage counts too, so
lifesteal-style healers like Helm read low); and lines that cannot trigger at
scope lock — low-HP conditions, cover-HP recovery, on-attacked procs — count
zero by construction, not because the kit is weak.

## Buffer value (`bufferchart.json`)

Ranks supports by the **total % team damage increase** they provide to two
standard carries: synthetic class-modal machine-gun and rocket-launcher
attackers (no skills, scope-lock attacker stats, both elementally advantaged),
simulated with the tested buffer versus a no-op in the same burst slot. The
reported number is `(carry DPS with buffer − carry DPS with no-op) / carry DPS
with no-op × 100`. The buffer's own weapon damage is not counted. Burst-1 and
Burst-2 units burst on cooldown; a tested Burst-3 buffer sits rightmost and
never bursts, so its value must come through passives. Value that comes through
faster rotations (gauge batteries, cooldown reduction) is captured, because the
whole fight is simulated.

Soline: Frost Ticket is excluded from this board: her kit reduces team damage
in the standard comp, so her negative percentage is not useful for ranking
support value.

Two boards per unit:

- **Generic** — the plain machine-gun + rocket-launcher carry pair. Only buffs
  that need nothing special from their targets apply (attack, critical,
  generic damage; rocket-launcher normals already count as projectile
  explosions).
- **Typed** — the carries adapt to the buffer's kit, derived automatically
  from its override: weapon-typed targets swap both carries to that weapon
  (Tove → shotguns), pierce buffs grant both carries pierce (Ade: Agent
  Bunny), projectile-explosion buffs make both rocket launchers (Anis:
  Sparkling Summer), element-typed targets set both carries' element, and
  boss-element-gated enemy debuffs (Brid: Silent Track's Wind Code, Helm:
  Aquamarine's Electric Code) set the carries to the advantaged element that
  wakes the debuff.

**Pair profiles** (`w/ Prika` / `w/ Mint` / `w/ Anchor`):
**Mint**, **Prika**, and **Mast: Romantic Maid** are ranked with and without
their canonical partner (`w/ Prika` / `w/ Mint` / `w/ Anchor` / `null`). The
value shown is the _tested buffer's marginal added team damage %_ when the pair
is played together, versus a baseline where the tested slot is a no-op B2 but
the partner is still present in solo/default mode. Mint and Prika force each
other into their duet kit modes; Mast and Anchor are real units. The rows are
not additive: each row measures what the tested unit adds on top of the partner
already being in the team, including the synergy that forces the partner into
its duet mode (Mint/Prika) or simply adds the tested B2 alongside the partner
(Mast/Anchor).

**Blanc pair profile (code-only):** Blanc's duo profile is defined as `w/ Rouge`
— a synthetic no-op Rouge B1 whose presence satisfies her "ally from the same
squad" gate — but Blanc is in `EXCLUDED_BUFFER_SLUGS`, so neither her plain row
nor the `w/ Rouge` row is emitted to the published buffer board. The profile is
kept code-healthy in `scripts/tests/ranks/buffer.test.ts` and the Blanc unit
tests.

Read generic as plug-and-play value and typed as built-around value. Purely
defensive kits read near zero — the scope-lock boss deals no damage, so there
is nothing to mitigate.

**Comp profiles** (`with-healer` / `with-shielder`): some headline buffs are
gated on a teammate the standard comp doesn't field — Crown's team Attack
Damage buff fires only "when recovery takes effect" (her own Relax self-heal
holds it at roughly 27% uptime alone), and Naga's core-damage and ATK lines
require a shield covering her (inert without a shielder). Profiled runs give a
no-op teammate a synthetic heal/shield kit that holds the gate at full uptime.
Profiled units are ranked **both ways** — plain and profiled — flagged
`null` / `with-healer` / `with-shielder`. Buffs gated on other missing
triggers also read low on the plain board.

## B1/B2 DPS (`b1b2dps.json`)

Ranks every sim-supported **Burst-1 and Burst-2 unit by its own damage** in a
Solo-style no-op control team. The unit under test is inserted at the leftmost
slot of its burst stage and is the camera-focused unit (×2.5 burst-gauge
generation on charge weapons), matching the Solo framework. Teammates are
synthetic no-op controls whose only effects are rotation-support effects (the
B1 control carries the standard 7 s team burst-cooldown reduction on its burst
cast, mirroring a real B1 enabler), so the ranked value comes from the tested
unit's own kit, weapon cadence, and burst rotation.

Cells: **Core 0 / Core 100 × Neutral / Elemental advantage** (the boss is set to
the element the tested unit beats; for multi-element units the advantage cell
uses the native element). Investment is scope lock. The core axis is an
**exposure** — Core 100 means the boss core is available for the whole fight, and
each unit's realized core fraction is still set by its own aim geometry, so two
units in the same Core 100 cell do not core at the same rate.

Standard no-op teams (the unit under test is inserted at the ▼ slot):

- **B1 20s** — `[▼unit, B2 SR, B2 SR, B3 RL, B3 MG]`
- **B1 40s** — `[▼unit, B1 AR, B2 SR, B3 RL, B3 MG]` (a second B1 covers
  off-rotations)
- **B2** — `[B1 AR, ▼unit, B2 SR, B3 RL, B3 MG]`

The no-op B1 (AR) in the **40s-B1** and **B2** templates contributes the
standard 7 s team burst-cooldown reduction via its override
(`src/skills/overrides/noop-b1-ar.json`); 20s-B1 rows have no second B1, so they
rely on the tested B1's own CDR.

Because the no-op teammates have negligible ATK, `alliesTopAtk` selectors that do
not set `excludeSelf` resolve to the **tested unit** in plain rows, while
`alliesLowestAtk` resolves to a no-op placeholder. The two live carriers (naga
skill2, rapunzel skill2) use `count: 2`, so the first target is the tested unit
and the second is an inert no-op. This intentionally turns self-includable
highest-ATK buffs into self-buffs on this board (e.g. naga's core damage buff,
rapunzel's `targetMaxHpPct` buff). Partner rows are unaffected because the real
partner outranks the controls.

Λ units are pinned with `lambdaStage`; non-Λ units forced off-stage
(Rapi: Red Hood as B1) use a separate `forceStage` so `lambdaStage` stays
Λ-only:

- **Red Hood** — ranked as both B1 and B2.
- **Rapi: Red Hood** — ranked as B1.

**Partner profiles:** a few units are ranked both plain and with a canonical
partner in the matching stage slot:

- **Crown** — with **Chime** as a second B2 (`with-chime`).
- **Anis: Star** — with the real **Avistar** as a MG B1 partner (`with-avistar`),
  and with a generic other B1 (`with-other-b1`).

For a **20s-B1 profile row with a B1 partner**, the team switches to the
40s-B1 template: the partner fills the second B1 slot and the second no-op B2
is removed. The row therefore gains rotation coverage from the partner at the
cost of one B2 slot; the delta is not "same team + partner" but "20s-B1 solo
template → 40s-B1 partner template". 20s-B1 units without built-in burst CDR run
slower rotations than 40s-B1 or B2 rows, so the standing is most comparable
within the same template group.
