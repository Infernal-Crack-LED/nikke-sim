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

The no-op B1 (AR) is a synthetic placeholder with a 7 s team burst-cooldown reduction, fired on **Full Burst entry** — the same trigger every real enabler uses (Liter, Sakura, Soline: Frost Ticket). This normalizes control teams for the baseline CDR a real B1 enabler contributes, even though the placeholder has no other skills. It deliberately does not key off the placeholder's own burst cast: that made its contribution depend on winning the stage-1 cast, so a tested Burst-1 sharing that stage suppressed the very cooldown reduction it was being measured against.

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
Burst-2 units burst on cooldown; a tested Burst-3 buffer does not burst at all,
so its value must come through passives. Value that comes through
faster rotations (gauge batteries, cooldown reduction) is captured, because the
whole fight is simulated.

The **standard team** is five slots: a no-op Burst-1 (20 seconds, carrying the
7-second team burst-cooldown reduction a real enabler would provide), two no-op
Burst-2s (20 seconds), and the two carries (Burst-3, 40 seconds, one machine gun
and one rocket launcher, alternating). The tested unit takes the spare slot of
its own burst stage and leads that stage — the second no-op Burst-2 is that
spare on a Burst-2 row, while a Burst-1 leads slot one and a Burst-3 sits
rightmost — and the baseline puts a no-op of that same stage back in its place,
so both sides field the same stage distribution.

**Camera focus sits on the spare no-op Burst-2 (the SR)**, never on the unit
under test. Focus is what grants a charge weapon ×2.5 burst gauge, so whoever
holds it sets the pace of the team's whole rotation; pinning it to a fixed inert
SR keeps burst generation identical in every run. It previously sat on the
second carry, whose weapon the typed board rewrites per tested unit — a rocket
launcher banks the ×2.5, a shotgun cannot take it at all — so the team's gauge,
and its Full Burst count, moved with the kit being measured. On a duo row the
partner occupies that slot and holds focus instead, on both sides of the
comparison.

A tested Burst-3's burst is turned off outright rather than merely being
outranked for the stage-3 cast. Sitting it rightmost makes the carries win that
cast while either is off cooldown, but they are 40-second units, and a fast
enough rotation reaches a stage 3 where only the tested unit is ready.

**Every team fields exactly one burst-cooldown enabler**, the way an optimal
team does: an optimal team always has one and almost never two. The unit under
test takes that role whenever its kit reduces its ALLIES' cooldowns, and the
no-op Burst-1 stands down for it; otherwise the no-op keeps the role.
Reduction a unit applies only to itself does not qualify — the same line the
burst-cooldown board draws — so Mint, Prika and Tia keep the no-op as their
enabler despite carrying reduction of their own. The baseline always keeps the
no-op's, since the unit under test is not in it and the team would otherwise
field no enabler at all. Reading a cooldown enabler's number, then, is reading
what it adds over the standard one it replaces.

The spare no-op is what makes long burst cooldowns readable. Every burst stage
stays covered by a 20-second unit, so a support with a 40- or 60-second cooldown
does not hold up the team's Full Burst chain while it waits: it is measured on
what its buffs add, not docked for a rotation the rest of the team can sustain
without it. A unit can still land above or below its baseline's Full Burst count
— its own cooldown reduction or burst-gauge generation genuinely speeds the team
up, and a slow weapon generating less gauge than the no-op it replaced genuinely
slows it down — and the board counts both, because they are the unit's doing.
`npx tsx scripts/probe/buffer-rotation-audit.ts` lists every unit that differs
from its baseline and which way; `npx tsx scripts/build-bufferchart.ts --explain
<slug>` breaks one unit's number into its rotation floor plus the contribution
of each buff line.

The board lists only units whose value comes out at zero or above. A unit that
reduces team damage in the standard comp has no standing to rank on a support
board, and its bar would also set the chart's left edge, compressing every
positive bar into what is left of the track. Blanc is dropped one step earlier,
for the same reason, before the boards are computed at all. Chime and Avistar
are held off the board as well; they are simmed as normal and their values are
unaffected everywhere else those are used.

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
  wakes the debuff. A True Damage ▲ buff (Flora's burst) makes both carries'
  normal attacks True-flavored, so the buff has real damage to multiply.
  Distributed and Sustained Damage ▲ buffs (Crust, Rosanna: Chic Ocean, Delta:
  Ninja Thief, the base Elegg — not Elegg: Boom and Shock — and Mast: Romantic
  Maid) give each carry a small synthetic
  hit every 10 seconds tagged that flavor — a clearly-labeled MOCK standing in
  for the fact that a plain weapon-fire carry can never generate either flavor
  on its own, sized to be a minor contributor so the buff registers without
  dominating the carry's own damage.

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

**Blanc pair profile:** Blanc's duo partner is a synthetic no-op Rouge B1, whose
presence satisfies her "ally from the same squad" gate, so the `w/ Rouge` row
shows what her burst-cooldown reduction is worth once that gate is open. Both her
rows are published: plain +7.9%, `w/ Rouge` +20.9% (generic and typed alike — no
line of her kit is weapon- or element-typed, so the two boards read the same).
The gap is her own burst frequency — 3 casts in 180 seconds with the gate shut
against 8 with it open. The profile is also pinned in
`scripts/tests/ranks/buffer.test.ts` and the Blanc unit tests.

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

## What the B1/B2 board and the B3 DPS chart do and don't share

The B1/B2 DPS board (`src/ranks/b1b2dps.ts`) and the Burst-3 DPS chart
(`src/dpschart/matrix.ts`) are two separate code paths, and the question of
whether a number from one can be read beside a number from the other keeps
coming up. The headline:

> **A B1/B2 DPS number is comparable only to a DPS chart cell on the Scope Lock
> investment tier.** The B1/B2 board has no investment axis at all — every row on
> it is Scope Lock. Putting a B1/B2 DPS next to a chart row at 8/12 or 12/12 is
> comparing two different accounts, not two units.

### The fight basis is identical

Everything about the simulated fight that is not a deliberate axis of one of the
two boards is set the same way on both sides:

| Fight setting                  | B1/B2 DPS board            | Burst-3 DPS chart            |
| ------------------------------ | -------------------------- | ---------------------------- |
| Boss defence `bossDef` = 0     | `src/ranks/b1b2dps.ts:298` | `src/dpschart/matrix.ts:505` |
| Level 400                      | `src/ranks/b1b2dps.ts:299` | `src/dpschart/matrix.ts:506` |
| Limit-break copies = 0         | `src/ranks/b1b2dps.ts:300` | `src/dpschart/matrix.ts:507` |
| No doll at team level          | `src/ranks/b1b2dps.ts:301` | `src/dpschart/matrix.ts:508` |
| Range bonus on                 | `src/ranks/b1b2dps.ts:304` | `src/dpschart/matrix.ts:511` |
| 180-second fight               | `src/ranks/b1b2dps.ts:305` | `src/dpschart/matrix.ts:512` |
| Camera focus = the tested unit | `src/ranks/b1b2dps.ts:306` | `src/dpschart/matrix.ts:513` |

Two details behind that table. The team-level "no doll" and "Base-5 gear" values
are defaults that each unit's own loadout can override, and on the chart's
invested tiers it does — those tiers hand every unit a doll and level-5 gear
(`src/dpschart/matrix.ts:319`, `:329`), while the Scope Lock tier leaves them at
Base-5 with no doll (`:316`), which is exactly what the B1/B2 board sets for
every unit (`src/ranks/b1b2dps.ts:258-260`). And neither board passes a Monte
Carlo seed, so both are deterministic expected-value runs rather than sampled
ones.

### The three real differences

**1. No investment axis on the B1/B2 board.** It hardcodes Base-5 gear and gives
no unit a cube, a doll or an overload line (`src/ranks/b1b2dps.ts:258`, `:302`;
the only mention of a cube in `src/ranks/` is the comment recording that there
isn't one). The chart carries three investment tiers — Scope Lock, 8/12 and
12/12 (`src/dpschart/matrix.ts:128-132`, `:144`) — and the two invested tiers add
the "Other" cube at level 10 and level 15 respectively
(`src/dpschart/matrix.ts:261-265`), a doll, level-5 gear, and overload lines
stamped at the project overload tier (`:309-332`). That is the reason for the
headline above: only the chart's Scope Lock cells describe the same account the
B1/B2 board describes.

**2. Core exposure is a two-way switch, not a three-way one.** The B1/B2 board
resolves its core axis as "Core 100 or nothing" — exposure 1 for the `c100`
cells and 0 for everything else (`src/ranks/b1b2dps.ts:291`,
`src/ranks/b1b2-cells.ts:17-25`). The chart carries three exposures, No Core /
Core 50 / Core 100 (`src/dpschart/matrix.ts:119-126`, `:143`, `:510`). There is
no Core 50 row on the B1/B2 board, so a chart Core 50 cell has no counterpart to
be read against. That is deliberate and settled — adding the row for symmetry was
considered and declined (DECISIONS, 2026-08-03).

**3. Different teams by construction.** The chart assembles one of five named
frameworks (`assembleTeam`, `src/dpschart/matrix.ts:426`); the B1/B2 board builds
its own control team and its own partner rows (`buildTeam`,
`src/ranks/b1b2dps.ts:168`; the partner profiles at `:69-92`). The rotation
support arrives by different means as well: the chart's Solo framework grants
every unit in the team, including the tested carry, a flat 7-second burst
cooldown reduction and gates the carry to bursting every other Full Burst
(`src/dpschart/matrix.ts:465`, `:481`, `:487`), whereas on the B1/B2 board the
same 7 seconds reaches the team only when the no-op Burst-1 control actually
casts its burst (`src/skills/overrides/noop-b1-ar.json`), and the 20s-B1 rows
have no such teammate at all. None of this is a defect — a Burst-1 or Burst-2
unit cannot be ranked inside a framework designed around a Burst-3 carry — but it
is why the two boards can never be merged into a single ordering, even at
matching investment.

### The overload tier does not reach this board

The single project-wide overload tier and the helper that stamps it (`OL_TIER` /
`atOlTier`, `src/dpschart/matrix.ts:292-301`) apply only to the chart's invested
tiers; the chart's Scope Lock tier carries no overload lines
(`src/dpschart/matrix.ts:316`). `src/ranks/` has no investment axis and no
reference to either symbol, so B1/B2 numbers do not move when the overload tier
changes. Worth knowing before a shift in the standings gets attributed to it.
