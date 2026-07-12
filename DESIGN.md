# NIKKE Solo Raid Damage Simulator — v1 Design

> **Status (2026-07-12): v1 is built and running** — see `README.md` for usage. Base ATK now comes
> from the DB (`base_stats`, see `base-stats-handoff.md`) instead of user input; gear (OL0/OL5) and
> doll bonuses come from `gear_doll.md` via `--ol` / `--doll`. The open questions below are resolved.

## Goal

A plug-and-play team builder: user inputs 5 Nikkes, the sim runs a 180-second (3-minute) solo raid fight and outputs expected total damage + DPS per Nikke, with a breakdown of where the damage came from (normal attacks, skill procs, burst damage) and buff uptimes.

## Team rules

- Exactly 5 members: **1× Burst I, 1× Burst II, 2× Burst III, 1 flex** (any burst type, incl. Λ). Validate on input.
- Position matters (slots 1–5, left to right) because of the burst rotation rule below.

## v1 simplifying assumptions

| Area | v1 assumption |
| --- | --- |
| Enemy DEF | 0 |
| Enemy debuffs on us | none |
| Core hits | `coreHitRate` parameter, default 0 (boss profiles are v2) |
| Boss element | single input (or "neutral"); grants 1.1× to advantaged units |
| Effective range | assumed always in range → +0.3 major modifier (toggle) |
| Accuracy | 100% of shots/pellets hit |
| Crit | expected value: `critRate × (0.5 + bonusCritDmg)` folded into major modifiers, no RNG |
| Parts / pierce / interruption / shields / distributed | out of scope (v2 profiles) |
| Ally debuffs ON the boss (Damage Taken ▲ etc.) | **in scope** — core team synergy, not an "enemy debuff" |

## Data sources

1. **`nikke_characters` table** (Bakery Bot DB, via `DATABASE_PUBLIC_URL`): id/name/aliases, weapon, burst type + cooldown, element, `normalAttackMultiplier`, `coreAttackMultiplier`, ammo, reload, `rl3` (burst gen), English skill text.
2. **Upstream nikke-synergy PostgREST API** (public, `apikey: dummy-key`) — verified working, 210 characters. Adds frame-accurate data the DB drops and that the sim genuinely needs:
   - `attack_speed`, `hits_per_shot`, `pellet_count` (SG), `charge_time` / `charge_multiplier` (RL/SR), `burst_gauge_per_shot`, `reload_time` (frames, = wall-clock reload incl. ~21f animation), `burst_activation_lag`, `burst_skill_duration`, `initial_shots`.
   - All frame fields are 60 fps.
3. **Gap: base ATK does not exist in either source.** v1: the user supplies each Nikke's ATK (in-game stat screen value), with a sensible default (~350k) so the tool still works "plug and play" for relative comparisons. A community base-stat curve import is a later enhancement.

Plan: a small sync script pulls both sources into a local normalized JSON snapshot (`data/characters.json`) so the sim itself is offline/deterministic and testable.

## Damage formula mapping

From `nikke-damage-formula.md`, with DEF = 0:

```
FinalDamage(hit) =
    ATK_effective × skillOrAttackMultiplier        // Base + Final ATK modifiers
  × (1 + E[crit] + coreTerm + 0.5·inFullBurst + 0.3·inRange)   // Major modifiers
  × (1.1·elemAdvantage + elemDamageBonuses)        // Element bonus
  × (1 + chargeBonuses + chargeMultiplier)         // RL/SR only
  × (1 + attackDamage + sustainedDamage + ...)     // Damage Up bucket
  × (1 + damageTakenDebuffsOnBoss)                 // Damage Taken bucket
```

Where `ATK_effective = baseATK × (1 + Σ ATK%) + Σ (casterATK% buffs, e.g. Crown S...uses caster's ATK)`.
Buckets are **additive within, multiplicative across** — the buff engine tags every buff with its bucket.

## Simulation engine

**Frame-tick discrete simulation at 60 fps** (10,800 ticks for 180 s — trivial compute, and it matches the source data's frame units exactly, avoiding rounding drift on reloads/charges/lags).

Per Nikke, a weapon state machine:

- **AR** 12 rps, **SMG** 20 rps, **SG** 1.5 rps (× pellet_count hits), **MG** 60 rps with 3.75 s spin-up to max rate, **RL/SR** 1 s charge (`charge_time` frames) then shot at `charge_multiplier`.
- States: firing → (ammo empty) → reloading (`reload_time` frames, modified by reload-speed buffs / unlimited-ammo buffs) → firing. Max-ammo buffs resize the magazine.
- Every shot: emits a damage event **and** burst gauge energy (`burst_gauge_per_shot`; cross-check vs `rl3/3` per second).

### Burst rotation (the interesting part)

Global state: burst gauge → Stage I → Stage II → Stage III → Full Burst (10 s base, extendable e.g. Modernia +5 s) → gauge resets and refills.

At each stage-N window:

1. Eligible = Nikkes whose burst type is N **or Λ**, and whose burst cooldown has elapsed.
2. Pick the **leftmost** eligible (user's rule: leftmost B1, then leftmost B2, then leftmost B3; if on cooldown, next-leftmost with matching type).
3. If nobody is eligible, the rotation stalls until a cooldown comes back (this is real game behavior and will surface bad comps — a feature, not a bug).
4. Apply `burst_activation_lag` frames, fire the burst skill's effects (buffs + any % ATK damage), start that Nikke's `burst_cooltime`.

Cooldown-reduction effects (Liter, D:Killer Wife, etc.) mutate remaining burst cooldowns — this is what makes 1-1-2 comps rotate on time, so it's required in v1.

### Buff engine

```
Buff { stat, bucket, value, valueKind: pct | pctOfCasterAtk | flat,
       durationFrames, maxStacks, source, target }
```

- Triggers (v1 whitelist): `on_burst_cast`, `on_full_burst_enter`, `on_full_burst_end`, `on_shot`, `on_hit_count(N)`, `on_reload`, `every_N_sec`, `on_last_bullet`, `passive`.
- Targets: self / all allies / boss (debuff) / conditional subsets we can resolve ("allies who cast their burst" → tracked from rotation state).
- Anything using an unsupported trigger is **skipped with a visible warning** in the output — results stay honest about what wasn't modeled.
- Damage events snapshot the active buff set at their tick.

## Skill data strategy (the real work)

Skill text is prose, but verified samples (Liter, Crown, Modernia, Noah) show it's highly regular:
`■ <trigger clause>. Affects <target>.\n<Stat> ▲ <value>% for <t> sec.` — plus recognizable variants (stacks, "of caster's ATK", "Cooldown of Burst Skill ▼ x sec", "Deals x% of final ATK as damage").

Three-layer approach:

1. **Parser** — regex/grammar over `skill_1_en / skill_2_en / burst_skill_en` producing the structured effect schema. Expect it to fully handle ~60–70% of units.
2. **Hand-written overrides** — per-Nikke JSON files that replace or patch parser output. Curate the **solo-raid meta roster first** (~30–40 units: Liter, Crown, Naga, Tia, Blanc, Rouge, Modernia, Red Hood, Alice, Asuka, S.Cinderella, Cinderella, Ein, Rapunzel: PO, D:KW, Maxwell, Privaty, etc.).
3. **Coverage report** — CLI command listing which units are parser-only / hand-verified / unmodeled, so trust level is always explicit.

## Inputs / outputs

**In:** 5 slugs in slot order, per-Nikke ATK (optional, defaulted), boss element, `coreHitRate`, toggles (range bonus). Later: skill levels (v1 assumes max — matches DB text values).

**Out (per Nikke + team total):**
- Total damage, DPS, % of team damage
- Breakdown: normal attack / core portion / skill-proc damage / burst damage
- Rotation log: full-burst timestamps, who burst at each stage, stalls
- Buff uptime table + warnings for unmodeled effects

## Proposed architecture (TypeScript)

Matches the Bakery Bot ecosystem (Drizzle/`@app/db` types could be shared later, and a web UI is the natural v2 surface).

```
nikke-sim/
  src/
    data/        # sync from DB + synergy API → data/characters.json
    skills/      # parser + overrides/<slug>.json + effect schema
    engine/      # frame loop, weapon FSMs, buff engine, burst rotation
    report/      # damage breakdown, uptime, warnings
    cli.ts       # `nikke-sim run liter crown naga modernia alice --element fire`
  data/
  test/          # golden-file tests per team comp; unit tests on formula buckets
```

## Roadmap

- **v1 (this doc):** data sync, formula core, weapon FSMs, rotation, buff engine, parser + top-roster overrides, CLI output.
- **v1.5:** skill-level scaling, OL lines / cube / gear ATK inputs, base-stat curves.
- **v2:** boss profiles (core/no-core, parts, pierce geometry), enemy debuffs/mechanics, web UI team builder.

## Open questions / blockers

1. **`DATABASE_PUBLIC_URL` is not available in this environment** (not in shell env, `.env` here is empty, bakery-bot has only `.env.example`, no Railway CLI). Need the value dropped into `nikke-sim/.env` — or v1 can run entirely off the public synergy API (verified working) + a slug/alias mapping.
2. **Stack confirm:** TypeScript proposed; Python is the alternative if you'd rather iterate on formulas in notebooks.
3. **ATK input model:** confirm "user supplies ATK per Nikke, defaulted" is acceptable for v1.
4. Which ~30 units make the first hand-verified roster (I'd start from current solo-raid meta).
