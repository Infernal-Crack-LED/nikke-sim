# Damage formula — buckets, membership, and proc rules

Detail doc for [game-mechanics.md](game-mechanics.md) §1/§9. Engine implementation:
`dealDamage()` in `src/engine/sim.ts`. Rewritten 2026-07-13 from the decoded tables
(nikke-einkk, FunctionTable) + community verification (austerityzero/nikke.gg guide,
ginmy.net bracket tests, KR/JP write-ups); updated 2026-08 to reflect the Projectile
Attachment/Explosion rework (additive Damage-Up composition) and the live default state
of `DOT_CRIT`.

## 1. Structure

```
damage = FinalATK_term × rate% × Major × Element × Charge × DamageUp × seqMult × Taken × Distributed
```

Buffs INSIDE a bucket are additive with each other; buckets MULTIPLY. Independently
verified by ginmy.net: an Attack Damage ▲ buff measured multiplicative with favorable-code,
core, crit, range, full-burst, charge, and Damage-Taken ▲ — but additive with
defense-ignore damage (same bucket).

| Bucket          | Contents                                                                                                                                                                              | Engine           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `FinalATK_term` | `BaseATK × (1+ΣATK%) + Σ(caster-ATK flat) + Σ(HP→ATK flat)` − `DEF` (DEF floor 0; scope-lock boss DEF = 0)                                                                            | `effectiveAtk()` |
| `rate%`         | weapon per-shot % or the skill's "X% of final ATK"                                                                                                                                    | per-hit `atkPct` |
| **Major**       | `1 + 0.5·FB + 0.3·range + critRate·critBonus + coreExposure·ACR·coreBonus` — one additive bracket                                                                                     | `major`          |
| `Element`       | `1.1 + ΣElementDmg% + ΣSuperiorElementDmg%`, only with elemental advantage (superior-element placement MEASURED 2026-07-14, test battery 5 popup ratios)                              | `elem`           |
| `Charge`        | `chargeMult/100 + (chargeMult/100)·Σ(chargeDamageMultPct)/100 + Σ(chargeDamagePct)/100` — only on charged hits                                                                        | `charge`         |
| **Damage Up**   | `1 + ΣAttackDamage + [Sustained] + [Sequential] + [True] + [Pierce, tagged units] + [ProjExpl on RL normals] + [ProjExpl/ProjAttach on flavored hits]` — flavor terms gate on the hit | `dmgUp`          |
| `seqMult`       | `1 + sequentialMultPct/100` — separate multiplicative bucket for sequential-flavored hits only                                                                                        | `seqMult`        |
| `Taken`         | `1 + ΣDamageTaken + [DistributedDebuff while a DT▲ is live]` (enemy-side)                                                                                                             | `taken`          |
| `Distributed`   | `1 + ΣDistributedDamage%` on distributed-flavored hits                                                                                                                                | `distributed`    |

Base stats: crit rate 15%, crit damage 150%, core multiplier 200% (a few units 150%),
full burst +50%, effective range +30% (RL never — see game-mechanics.md §5), elemental
advantage base ×1.1.

Core rate for accuracy-circle weapons is driven by live geometry (`UNIGEO` default,
`src/engine/unigeo.ts`) or the legacy cone arm; see [game-mechanics.md](game-mechanics.md) §7.
`cfg.coreHitRate` is the configured core exposure (1.0 at scope lock), which the engine
multiplies by the accuracy-derived `ACR`.

## 2. Notable bracket behaviors (verified)

- Core is **+100% inside the Major bracket**, NOT a standalone ×2 — stacking crit + core +
  FB + range saturates additively (2.8–3.3 typical), which is why each individual bonus is
  worth less in a stacked team than naive multiplication suggests.
- ATK% applies **before** DEF subtraction; charge multiplier applies after.
- "X% of caster's ATK" team buffs add the CASTER's final ATK as a flat term — they do not
  dilute into the target's (1+ATK%) sum.
- Charge Damage ▲ adds flat points to the charge bucket (250% + 80 → ×3.3);
  `chargeDamageMultPct`-class buffs (Helm treasure burst, collection items) multiply the
  BASE charge damage instead.
- Damage-ratio buffs of the form "○○ Damage ▲" (Sustained/True/Sequential/Pierce/
  ProjExpl/ProjAttach) are ALL additive inside Damage Up (ore-game). `partsDamagePct` is
  parsed but inert on the partless scope-lock boss.
- **Projectile Explosion / Attachment Damage ▲** are additive inside Damage Up, not a
  separate multiplicative bucket. An attachment-flavored hit reads only Projectile
  Attachment ▲; an explosion-flavored hit reads only Projectile Explosion ▲. Plain rocket-
  launcher normal attacks also receive Projectile Explosion ▲ in Damage Up by default
  (`cfg.projExplOnRlNormals`, default `true`).

## 3. Skill-proc ("additional damage") rules — datamined

Kit lines "deals X% of final ATK as additional damage" are FUNCTION-type skill damage
(FunctionTable `Damage`/`DefIgnoreDamage`/`DurationDamage`), not bullets. The universal
rule (Prydwen unit notes + JP verification + einkk implementation — there are no per-unit
"classes"):

| Multiplier           | Function damage gets it?                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Crit                 | **YES** — rolls at the caster's crit rate (engine: flatDamage/storedHit/dot crit by default) |
| Core                 | **NEVER** (even procs that trigger ON core hits)                                             |
| Effective range +30% | **NEVER**                                                                                    |
| Full Burst +50%      | **YES if the proc lands during FB** (timing-based, not class-based)                          |
| Element ×1.1+        | yes                                                                                          |
| Damage Up bucket     | yes                                                                                          |
| Charge multiplier    | never                                                                                        |

Delivery-type exceptions:

- **launchWeapon** procs (Anis: Star's stars, Rapi:RH's rocket ATTACHES) are real weapon
  fire: they core and crit, still no range bonus; they receive Projectile Explosion/
  Attachment Damage ▲ through the Damage-Up bucket. Rapi:RH's EXPLOSION half is the
  EXCEPTION: skill damage — core-INELIGIBLE (owner footage ruling 2026-08-04, DECISIONS).
- **%-of-hit repeats** ("deals X% of the damage dealt") inherit everything from the parent
  hit implicitly.
- Full-charge-GATED procs (Maiden:IR, SBS S1 counter, rouge S1, neon-VE) only count
  full-charge releases — on auto that is essentially every shot.

DoTs (burn/acid = Sustained): function damage on a tick timer; ticks reference CURRENT
buffs (no snapshot — Jill's FB ATK buff boosts an already-running acid stack); no core, no
range; first tick of a burst-cast DoT can miss FB-window buffs (timing); **tick CRIT is ON
by default** (`DOT_CRIT`, 2026-07-21 — ginmy.net + our footage confirmed).

Burst-nuke FB timing — MEASURED 2026-07-13 (test battery 2, test 1): damage dealt BY a
burst skill at cast does NOT receive the +50% full-burst multiplier, while buffs live at
cast (including allies' burst-granted buffs from earlier in the same rotation) DO apply.
Cinderella's nuke popup read non-crit 4,066,936 / crit 6,100,403 (the ×1.5 crit ratio
confirms the pair) — 98.7% of the no-full-burst prediction and a 34% miss for the
with-full-burst branch. This matches the JP/einkk use-time snapshot rule: cast-instant
burst damage lands at the window boundary; burst-originated damage that lands DURING the
window (DoT ticks, stored-hit releases, per-shot procs) still gets the +50%.

Legacy note: a few overrides still carried `noFb` flags from the pre-datamine calibration era.
Under the current timing rule these were timing-based; the migration to the default `FBRULE='timing'`
removed the last carrier, so `noFb` in overrides is now rejected by validation.

## 4. Elemental wheel

Fire → Wind → Iron → Electric → Water → Fire (each beats the next).

## Sources

- https://nikke.gg/damage-formula/ (austerityzero guide, maintained)
- https://github.com/d34d633f/nikke-einkk (reference sim; bracket constants
  rangeCorrection=3000, fullBurstCorrection=5000, baseElementRate=11000)
- https://github.com/coolguydlm123/nikkecsvlibrary (FunctionTable.csv)
- https://ginmy.net/nikke_atkdamagebuff_test (bracket additivity tests)
- https://arca.live/b/nikketgv/115518814 · dcinside 651114 (KR formula grinds)
- Prydwen unit pages: Ein, Maiden: Ice Rose, Jill, SWHA, Privaty (Treasure)
