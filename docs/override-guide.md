# Writing skill overrides

Overrides are hand-written JSON files at `src/skills/overrides/<slug>.json` that express the **net behavior of a whole kit** where the line-by-line prose parser can't. They are the source of truth for a unit: any slot present in the override completely replaces the parser's output for that slot.

## Workflow

1. `npx tsx scripts/kit.ts <slug>` — prints the character's data, raw skill prose, the parser's current blocks, and its warnings.
2. Decide per slot (`skill1`, `skill2`, `burst`): if the parsed blocks are already faithful, **omit that slot** from the override (parser output is kept). If a slot is wrong or incomplete, write the full replacement — including the parts the parser got right, since your blocks replace the whole slot.
3. Write `src/skills/overrides/<slug>.json`. Plain JSON, no comments.
4. `npx tsx scripts/validate-overrides.ts <slug>` — fix until it passes (structural check + smoke sim). Sanity-check the reported damage/share.
5. The top-level `note` field is mandatory: state the modeling decisions, approximations, and anything deliberately skipped **with the reason**. Every `■` block of an overridden slot must be accounted for — as effects, or named in the note as skipped.

## File shape

```json
{
  "note": "How the kit was modeled, approximations, and skipped parts with reasons.",
  "skill1": [ Block, ... ],
  "skill2": [ Block, ... ],
  "burst":  [ Block, ... ]
}
```

`Block`:

```json
{
  "slot": "skill1",
  "trigger": { "kind": "..." },
  "target": { "kind": "..." },
  "formation": "noB1",          // optional: block active only when team has no OTHER B1/Λ ("hasB1" = inverse)
  "mode": "Snipe",              // optional: block active only in this user-selected kit mode;
                                //   declare choices in a top-level "modes": ["MG","Snipe"] (first = default)
  "effects": [ Effect, ... ]
}
```

## Triggers

| kind | fires | notes |
|---|---|---|
| `passive` | permanently at battle start | buffs under it are **always on — listed durations are ignored** (they re-trigger continuously in-game). Also use for "at start of battle", "when HP above X%" (full HP assumed), "when target appears" |
| `burstCast` | when THIS unit casts its burst | optional `"stage": 1\|2\|3` restricts to the stage it was used at (Λ / stage-variant kits) |
| `fullBurstEnter` / `fullBurstEnd` | when full burst starts/ends (any caster) | |
| `hitCount`, `count: N` | every N normal-attack HITS by this unit | pellets/multi-hits count individually (SG pull = 10 hits). "Every N normal attacks" for 1-hit weapons = N hits |
| `shotFired` | every trigger pull by this unit | use for "on full charge attack" (charge weapons always full-charge in the sim) |
| `lastBullet` | this unit's magazine empties | |
| `stageEnter`, `stage: N` | when a stage-N burst is cast by ANYONE | for "when entering Burst Stage N" |
| `bossElement`, `element: "Electric"` | permanent, only if the boss element matches | for "when attacking X Code enemies" |

## Targets

`self` · `allies` (all 5) · `enemy` (boss) · `burstCasters` / `nonBurstCasters` (this rotation) · `alliesTopAtk` + `count` · `alliesOfElement` + `element` · `alliesOfClass` + `cls` ("Attacker"/"Defender"/"Supporter")

## Effects

| kind | fields | semantics |
|---|---|---|
| `buff` | `stat`, `value` (%; negative for ▼), `durationSec?` (omit = permanent), `maxStacks?` | re-application refreshes duration and adds a stack (value × stacks). Stacking is per block-effect |
| `flatDamage` | `atkPct`, `flavor?` | instant hit of caster's final ATK %. No crit/core/charge. flavors: `distributed` (single boss → full value, boosted by caster's `distributedDamagePct`), `true`, `projectileAttachment` / `projectileExplosion` (boosted only by matching stats) |
| `dot` | `atkPct`, `durationSec`, `intervalSec?` (default 1), `flavor?` | ticks like flatDamage; same flavors as flatDamage. Riders/DoTs NEVER receive core damage (core only applies to direct core hits) |
| `weaponSwap` | `damagePct`, `durationSec`, `chargeTimeSec?`, `chargeMultPct?`, `maxAmmo?` | temporary weapon: per-pull multiplier override; base cadence kept unless `chargeTimeSec` makes it a charge weapon. Add an `attackSpeedPct` buff alongside if the swap changes fire rate |
| `fillGauge` | `pct` | instantly adds % to the team burst gauge |
| `storedHit` | `atkPct`, `charges?` (default 1), `flavor?` | accumulates charges; ALL release as one hit at the next full-burst entry, after FB-enter auras apply (Rapi:RH's attached projectiles) |
| `burstCdr` | `seconds`, `oncePerBattle?` | reduces targets' current burst cooldowns |
| `escalating` | `steps: [Effect...]` | Liter-style "Once:/Twice:/…" — Nth activation applies steps 1..N |
| `fullBurstExtend` | `seconds` (can be negative) | extends the current/next full burst |
| `unlimitedAmmo` | `durationSec` | |
| `instantReload` | `fraction?` (default 1) | refills that fraction of the magazine |
| `burstEligibility` | `stage` | unit may also fill that burst stage (Combat-Assist-style) |
| `advantageVs` | `element` | unit counts as elementally advantaged vs that boss element |

## Stats (buff `stat` values) and their formula buckets

- **ATK**: `atkPct` (scales own total ATK) · `casterAtkPct` (flat, % of the CASTER's ATK — "of caster's ATK" buffs)
- **Major modifiers**: `critRatePct`, `critDamagePct`, `coreDamagePct` (only matters when core-rate > 0)
- **Element bucket** (only with elemental advantage): `elementDamagePct`
- **Charge bucket** (charge weapons): `chargeDamagePct` (additive percentage points), `chargeDamageMultPct` (scales by BASE charge damage — collection items and Helm-style max-treasure burst buffs only; a 158.4% buff on a ×2.5 base adds +396 points), and `chargeSpeedPct` (faster charging)
- **Damage-Up bucket** (additive): `attackDamagePct` ("Attack Damage ▲"), `sustainedDamagePct`, `trueDamagePct`, `elemAdvantageDamagePct` (damage-up gated on advantage)
- **Projectile bucket** (its OWN multiplier, multiplicative with Damage-Up): `projectileExplosionPct` + `projectileAttachmentPct` — apply ONLY to matching flavored hits (RRH projectiles, Anis: Star stars); normal attacks, RL included, never benefit
- **Boss debuff** (target enemy, positive value): `damageTakenPct`, `distributedDamagePct` (the latter only affects distributed-flavor hits, and only while a Damage Taken ▲ is active on the boss)
- **Weapon behavior**: `maxAmmoPct`, `reloadSpeedPct`, `attackSpeedPct`/`fireRatePct` (fire rate), `normalAttackPct` (scales the normal-attack multiplier), `extraHitDamagePct` (flat % ATK added per hit while active), `burstGenPct` (unit's gauge contribution)
- **Own-proc boosters**: `distributedDamagePct`, `projectileAttachmentPct`
- **Inert in v1** (parse but no effect — fine to include for fidelity): `partsDamagePct`, `pierceDamagePct`, `hitRatePct`, `defPct`

## v1 modeling assumptions — what to SKIP (name it in the note)

- Boss never attacks; everyone is full HP forever → skip: heals, shields, taunts, invuln, revive, "when attacked/HP falls below" triggers, DEF/HP buffs, damage-taken ▼ on allies, cover repair.
- Single stationary boss, no parts → distributed damage hits in full; parts/pierce/interruption stats are inert; AoE radius is irrelevant.
- Crits are expected-value; hit rate is 100% (hit-rate buffs are inert).
- Skill text numbers are max skill level — use them exactly as written; never invent values.
- Named resource systems (stack currencies, gauges, modes) can't be tracked literally — model the **steady-state throughput**: e.g. "43 hits per stack × 20 stacks → team buff" becomes one `hitCount: 860` block (see `crown.json`). State the reduction in the note.
- If a mechanic is genuinely uncertain, prefer the conservative reading and flag it in the note.

## Worked examples (read these)

- `src/skills/overrides/crown.json` — stack cycle → single hitCount trigger
- `src/skills/overrides/modernia.json` — per-hit extra damage instead of a mis-parsed DoT
- `src/skills/overrides/red-hood.json` — stage-conditional Λ burst, once-per-battle CDR, weaponSwap
- `src/skills/overrides/rapi-red-hood.json` — formation gates, burstEligibility, advantageVs, flavored projectile procs
