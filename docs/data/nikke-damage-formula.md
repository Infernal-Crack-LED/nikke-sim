# Damage formula — buckets, membership, and proc rules

Detail doc for [game-mechanics.md](game-mechanics.md) §1/§9. Engine implementation:
`dealDamage()` in `src/engine/sim.ts`. Rewritten 2026-07-13 from the decoded tables
(nikke-einkk, FunctionTable) + community verification (austerityzero/nikke.gg guide,
ginmy.net bracket tests, KR/JP write-ups); the old rl3-gauge and 3.75s-MG notes that used
to live here are superseded (see [burst-gauge.md](burst-gauge.md) and
[nikke_mg_windup_model.md](nikke_mg_windup_model.md)).

## 1. Structure

```
damage = FinalATK_term × rate% × Major × Element × Charge × DamageUp × Taken × Distributed
```

Buffs INSIDE a bucket are additive with each other; buckets MULTIPLY. Independently
verified by ginmy.net: an Attack Damage ▲ buff measured multiplicative with favorable-code,
core, crit, range, full-burst, charge, and Damage-Taken ▲ — but additive with
defense-ignore damage (same bucket).

| Bucket | Contents | Engine |
|---|---|---|
| FinalATK term | `BaseATK × (1+ΣATK%) + Σ(caster-ATK flat)` − `DEF × (1+ΣDEF%)` (DEF floor 0; test boss DEF = 0) | `effectiveAtk()` |
| rate% | weapon per-shot % or the skill's "X% of final ATK" | per-hit `atkPct` |
| **Major** | `1 + 0.5·FB + 0.3·range + critRate·(critDmg−100%+ΣCritDmg%) + coreRate·AUTO_CORE_RATE·(coreMult−100%+ΣCoreDmg%)` — one additive bracket | `major` |
| Element | `1.1 + ΣElementDmg%`, only with elemental advantage | `elem` |
| Charge | `chargeMult + chargeMult·Σ(chargeDamageMultPct)/100 + Σ(chargeDamagePct)/100` — only on charged hits | `charge` |
| **Damage Up** | `1 + ΣAttackDamage + [Sustained] + [Sequential] + [True] + [elemAdvantageDamage, adv only] + [Pierce, tagged units] + [ProjExpl on RL normals]` — flavor terms gate on the hit's flavor | `dmgUp` |
| Projectile factor | `1 + ProjExpl/ProjAttach %` — ONLY on explosion/attachment-flavored hits; multiplicative with Damage Up, not inside it | `projFactor` |
| Taken | `1 + ΣDamageTaken + [DistributedDebuff while a DT▲ is live]` (enemy-side) | `taken` |
| Distributed | `1 + ΣDistributedDamage%` on distributed-flavored hits | `distributed` |

Base stats: crit rate 15%, crit damage 150%, core multiplier 200% (a few units 150%),
full burst +50%, effective range +30% (RL never — see
[range_data.md](range_data.md)), elemental advantage base ×1.1.

`AUTO_CORE_RATE = 0.85` ⚑ is a full-auto correction, not part of the in-game formula — see
[auto-play.md](auto-play.md).

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
- Damage-ratio buffs of the form "○○ Damage ▲" (Sustained/True/Sequential/Parts/Pierce/
  Shield/ProjExpl) are ALL additive inside Damage Up (ore-game).

## 3. Skill-proc ("additional damage") rules — datamined

Kit lines "deals X% of final ATK as additional damage" are FUNCTION-type skill damage
(FunctionTable `Damage`/`DefIgnoreDamage`/`DurationDamage`), not bullets. The universal
rule (Prydwen unit notes + JP verification + einkk implementation — there are no per-unit
"classes"):

| Multiplier | Function damage gets it? |
|---|---|
| Crit | **YES** — rolls at the caster's crit rate (engine: flatDamage/storedHit crit by default) |
| Core | **NEVER** (even procs that trigger ON core hits) |
| Effective range +30% | **NEVER** |
| Full Burst +50% | **YES if the proc lands during FB** (timing-based, not class-based) |
| Element ×1.1+ | yes |
| Damage Up bucket | yes |
| Charge multiplier | never |

Delivery-type exceptions:
- **launchWeapon** procs (Anis: Star's stars, Rapi:RH's attachable projectiles) are real
  weapon fire: they core and crit, still no range bonus; they take Projectile
  Explosion/Attachment buffs via the projectile factor.
- **%-of-hit repeats** ("deals X% of the damage dealt") inherit everything from the parent
  hit implicitly.
- Full-charge-GATED procs (Maiden:IR, SBS S1 counter, rouge S1, neon-VE) only count
  full-charge releases — on auto that is ~68% of shots ([auto-play.md](auto-play.md)).

DoTs (burn/acid = Sustained): function damage on a tick timer; ticks reference CURRENT
buffs (no snapshot — Jill's FB ATK buff boosts an already-running acid stack); no core, no
range; first tick of a burst-cast DoT can miss FB-window buffs (timing); tick CRIT is
unverified — kept OFF in the engine (einkk allows it; open item).

Burst-nuke FB timing — MEASURED 2026-07-13 (test battery 2, test 1): damage dealt BY a
burst skill at cast does NOT receive the +50% full-burst multiplier, while buffs live at
cast (including allies' burst-granted buffs from earlier in the same rotation) DO apply.
Cinderella's nuke popup read non-crit 4,066,936 / crit 6,100,403 (the ×1.5 crit ratio
confirms the pair) — 98.7% of the no-full-burst prediction and a 34% miss for the
with-full-burst branch. This matches the JP/einkk use-time snapshot rule: cast-instant
burst damage lands at the window boundary; burst-originated damage that lands DURING the
window (DoT ticks, stored-hit releases, per-shot procs) still gets the +50%.

Legacy note: a few overrides still carry `noFb` flags from the pre-datamine calibration era
(privaty, liberalio, little-mermaid, SBS, jill's dot). Under the true rule these should be
timing-based; they are retained as calibration until the U8 rotation ground truth lands.

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
