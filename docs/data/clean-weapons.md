# Clean weapon-type best candidates (owner ruled)

The base-weapon faithfulness basis: one unit per weapon class whose kit contributes **nothing to
damage**, so a recording of them measures the engine's bare weapon model — fire cadence,
ammo/reload cycle, charge + release latency, pellet landing, core/crit, range bands — with no kit
encoding in the way. Constraint: **bursts are never used**.

Pinned by `scripts/tests/units/clean-weapons.test.ts`; fixtures in `scripts/tests/lib/harness.ts`.
Ruling + rationale: `docs/DECISIONS.md` (2026-07-23).

## The six

Fielded as **two teams of three** (they cannot be fielded as one team), split by burst stage so
that team A cannot burst at all. Boss element **Iron** — the only element neutral for all six.

| team | unit | weapon | element | burst | notes |
|---|---|---|---|---|---|
| A | `folkwang` | AR | Water | II | shields / taunt / Max HP only |
| A | `marciana` | SG | Iron | II | heals / DEF only |
| A | `snow-crane` | SR | Water | II | ⚠ burst grants **Pierce** — "never burst" is load-bearing here |
| B | `emma` | MG | Fire | I | heals only |
| B | `claire` | RL | Electric | I | heals / shield only |
| B | `idoll-ocean` | SMG | Water | I | heals only |

**Team A is all Burst II**, so no Burst I unit ever opens the chain and it casts **zero** bursts.
**Team B is all Burst I** and does cast, but a no-op burst is uptime-inert (there is no
cast-animation lock in the fire loop), so its numbers are bare-weapon too. Neither team reaches
Full Burst — there is no Burst III unit in either.

## Boss element

**Iron** is the unique neutral-for-all choice; `bossElement: null` is neutral by construction.
Every other element hands at least one unit the ×1.1 elemental major:

| unit element | advantaged against |
|---|---|
| Water (`folkwang`, `snow-crane`, `idoll-ocean`) | Fire |
| Iron (`marciana`) | Electric |
| Fire (`emma`) | Wind |
| Electric (`claire`) | Water |

## Why `kurumi` is not the AR cell

She was the original pick and is **rejected**. Two of her three damage lines do respect the
never-burst constraint (S1 block 2 is *"Activates when using Burst Skill"*, S2 is *"Activates
during Full Burst"*), but S1 block 1 does not:

> ■ Activates after landing 36 normal attack(s). Affects the target.
> Hacked: Deals 52.24% of final ATK as sustained damage every 1 sec for 5 sec.

That fires off a normal-attack counter with no burst dependency — 261.2% ATK per proc every 36
shots, against a 13.65% normal multiplier. She is not a bare weapon. `folkwang` is the only AR
with zero damage-touching lines including her burst.

## Fixture note

The six have no override on disk (`simSupported: false`), and the engine throws for a unit that
has skill prose but no override. The test fixture therefore **synthesizes an empty kit** rather
than committing six override files — so there is no encoding that could drift away from "bare
weapon", and no protected-path edit involved.
