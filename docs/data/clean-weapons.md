# Clean weapon-type best candidates (owner ruled)

The base-weapon faithfulness basis: one unit per weapon class whose kit contributes **nothing to
damage**, so a recording of them measures the engine's bare weapon model — fire cadence,
ammo/reload cycle, charge + release latency, pellet landing, core/crit, range bands — with no kit
encoding in the way. Constraint: **bursts are never used**.

Pinned by `scripts/tests/units/clean-weapons.test.ts`; fixtures in `scripts/tests/lib/harness.ts`.
Ruling + rationale: `docs/DECISIONS.md` (2026-07-23).

## Scoring it

```sh
npx tsx scripts/clean-weapons-read.ts              # sim vs real, per unit (shipped: SMG 20.0/s)
SMGRATE=24 npx tsx scripts/clean-weapons-read.ts   # revert arm: pre-quantization nominal 24/s
```

Real totals live in `docs/probe-data/clean-weapons-readings.json` — **append a run there** and the
scorer picks it up and re-averages automatically. The sim side comes from the same `bareWeaponComp`
fixture the pinned test uses, so the two can never drift apart. Ratio is **sim/real** (>1 = HOT).

Board as of 2026-07-23 (3 recordings): **4/6 within ±3%** on the shipped engine (SMG frame-quantized
to 20.0/s, DECISIONS 2026-07-23 — `idoll-ocean` 1.166→1.017); the `SMGRATE=24` revert reads 3/6.
Run-to-run repeatability where n=2 is ±0.2–0.8%. Open residuals: `marciana` SG 0.846
(→ the SG landing probe), `folkwang` AR 0.963 (**open-questions U32**), and `idoll-ocean`'s ATK basis
reading ~1.4% low against a popup (**open-questions U33**).

## The six

Fielded as **two teams of three** (they cannot be fielded as one team). Boss element **Iron** —
the only element neutral for all six.

| team | unit | weapon | element | burst | ★/core | notes |
|---|---|---|---|---|---|---|
| A | `folkwang` | AR | Water | II | 3★/7 | shields / taunt / Max HP only |
| A | `marciana` | SG | Iron | II | 3★/7 | heals / DEF only |
| A | `snow-crane` | SR | Water | II | 3★/7 | ⚠ burst grants **Pierce** — "never burst" is load-bearing here |
| B | `emma` | MG | Fire | I | 3★/7 | heals only |
| B | `claire` | RL | Electric | I | **2★/0** | heals / shield only; not SSR |
| B | `idoll-ocean` | SMG | Water | I | **0★/0** | heals only; not SSR |

## Bursts are off

The sim models this directly via **`cfg.disableBursts`**, matching the in-game setting — the
burst chain never opens, so nothing is cast, no stage advances, and Full Burst never happens.
The gauge still fills and sits pinned at 100. It does not touch damage: team B casts 15 bursts
with the flag off and 0 with it on, for byte-identical damage.

Team A is additionally all Burst II, so it could not open a chain even with bursting on — a
second, independent guarantee kept so a regression in the flag cannot silently corrupt its
baselines. Neither team has a Burst III unit, so neither could reach Full Burst regardless.

## Rarity ceilings

Scope lock's `copies: 10` encodes an **SSR** ceiling (3★ + core 7). Two of the six are not SSR
and cannot reach it, so the fixture caps them per-unit (`CLEAN_WEAPON_LIMITS`):

| unit | can reach | ATK capped | ATK on plain scope lock | damage over-credit if uncapped |
|---|---|---|---|---|
| `idoll-ocean` | 0★ / core 0 | 68,928 | 81,530 | **15.5%** |
| `claire` | 2★ / core 0 | 79,200 | 90,632 | **12.6%** |

Damage is very nearly linear in ATK for a bare weapon (boss DEF is subtracted per hit, so not
exactly), so the error is a near-pure scalar — harmless to the *shape* of a fight, fatal to the
sim-vs-real ratio that is this basis's only output.

⚠ **`data/characters.json` carries no unit-rarity field** (the only `rarity` in the repo is doll
rarity), so nothing derives or enforces these — they are owner-supplied and hand-maintained.
This is latent for any non-SSR unit anywhere in the sim, not just these two.

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

## Why the SMG slot has no alternative

`idoll-ocean` is not SSR, but she is the **only** viable SMG. Of 30 SMG units, exactly three have
no damage-raising line in skill 1 + skill 2 (the burst is irrelevant — bursts are off):

- `idoll-ocean` — heals only. ✅
- `rei` (SMG/Water, *not* `rei-ayanami`) — clean, but **not owned**.
- `mica-snow-buddy` — **not clean**: *"Max Ammunition Capacity ▲ 40% continuously"* raises fire
  uptime, and so raises damage.

Every other SMG carries an explicit offensive line (ATK ▲, Critical, Hit Rate, Reload Speed,
Attack Speed, direct damage, or an enemy `DEF ▼` / `Damage Taken ▲`).

## Fixture note

The six have no override on disk (`simSupported: false`), and the engine throws for a unit that
has skill prose but no override. The test fixture therefore **synthesizes an empty kit** rather
than committing six override files — so there is no encoding that could drift away from "bare
weapon", and no protected-path edit involved.
