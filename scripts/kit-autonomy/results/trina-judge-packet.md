# S7 JUDGE PACKET — `trina` (compact, answer-faithful compilation of the gauntlet artifacts)

Unit: Trina (slug `trina`) — RL / Electric / Supporter / Burst II, cd 20s. Driver model family: Qwen. Cross-family reviewers:
S2b claude-fable-5 (pre-op), S5/S6/S7 claude-opus-4-8 (post-op). Gauntlet date 2026-07-24.

## 1. Ground truth — kit prose (data/characters.json → characters.trina.skills, structural)

Base: RL/Electric/Supporter/Burst II, cd 20s, ammo 6, reloadFrames 170, chargeFrames 60, chargeMultiplier 250, hitsPerShot 1, normalAttackMultiplier 68.59, coreAttackMultiplier 200. baseStats hp 15000 / atk 500 / def 98.

skill1:
■ Activates after Full Burst ends. Affects all allies.
Continuously recovers 4.06% of the skill user's final Max HP every 1 sec for 5 sec.
■ Activates when attacking with Full Charge. Affects the target(s) if the HP of 2 ally unit(s) with the lowest HP percentage is lower than 30%.
Recovers 2.03% of the skill user's final Max HP as HP.
■ Activates when attacking with Full Charge. Affects the target(s) if the HP of 2 ally unit(s) with the lowest HP percentage is lower than 50%.
Recovers 1.57% of the skill user's final Max HP as HP.

skill2:
■ Activates at the start of battle, only if self is alive. Affects all Electric Code allies with assault rifles.
Max HP ▲ 44.98% of the skill user's Max HP without restoring HP constantly.
■ Activates at the start of battle. Affects the 1 leftmost Electric Code ally unit(s) with assault rifles.
Invulnerable for 2 sec.
■ Activates when using Burst Skill. Affects the 1 leftmost Electric Code ally unit(s) with assault rifles.
Attack Damage ▲ 94.15% for 10 sec.
Reload Speed ▲ 50.82% for 10 sec.

burst:
■ Affects all allies.
Max HP ▲ 20.14% of the skill user's Max HP without restoring HP for 10 sec.
Attack Damage ▲ 20.9% for 10 sec.
■ Activates when enemy count aside from Nikkes is 1. Affects all allies.
Spread Roots: Burst Skill damage of skills with "Affects all enemies" ▲ 435.6% for 5 sec.
■ Activates when enemy count aside from Nikkes is more than 2. Affects all allies.
Changes Spread Roots to Wilted Roots.
Wilted Roots: Burst Skill damage of skills with "Affects all enemies" ▲ 64.46% for 5 sec.
■ Affects all Electric Code allies with assault rifles.
Hit Rate ▲ 45.3% for 10 sec.
Max Ammunition Capacity ▲ 20 round(s) for 10 sec.

## 2. Damage-formula + mechanics SSOT (the facts the verdict turns on)

Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket × taken × distributed.
**casterMaxHpPct vs targetMaxHpPct:** "Max HP ▲ x% of the skill USER'S Max HP … without restoring HP" = `casterMaxHpPct` —
a FLAT add resolving to (x/100)×caster.maxHp at apply time, re-keyed to stat `maxHpFlat` (the buffApply `value` is the
resolved flat HP, e.g. ≈1349458 for Trina's 44.98% line, NOT 44.98; CONSTANT across all targets because it is keyed to the
CASTER's Max HP). `targetMaxHpPct` instead grants (x/100)×TARGET.maxHp — a PER-TARGET value (moran's own Max HP ≠ scarlet's).
Trina's S2 "Max HP ▲44.98% of the skill user's Max HP" and burst "Max HP ▲20.14% of the skill user's Max HP" → casterMaxHpPct
(caster-keyed), NOT targetMaxHpPct. BOTH are offensively INERT: ally-granted Max HP does NOT feed a teammate's atkOfMaxHpPct
conversion (e3 video rule) and Trina has no own HP-scaler — so they move no damage either way (kit-SSOT completeness only).
**attackDamagePct vs atkPct:** "Attack Damage ▲ x%" = `attackDamagePct` — ADDITIVE percentage points in the Damage-Up bucket
(dilutes with other Damage-Up sources). `atkPct` instead scales the ATK bucket. Trina's S2 "Attack Damage ▲94.15%" and burst
"Attack Damage ▲20.9%" → attackDamagePct, NOT atkPct.
**reloadSpeedPct:** "Reload Speed ▲ x%" = `reloadSpeedPct` — a weapon-state modifier that shortens reload dead-time → more
shots per 180s → IS damage (not a defensive stat). Trina's S2 "Reload Speed ▲50.82%" → reloadSpeedPct.
**maxAmmoFlat vs maxAmmoPct:** "Max Ammunition Capacity ▲ N round(s)" = `maxAmmoFlat` N — a FLAT round count added ON TOP of
any percent scaling in maxAmmo() = max(1, round(base×(1+pct/100)) + flat) (theme 14; the flat-rounds path is live — cf.
tove/grave/noir, all enacted 2026-07-20). `maxAmmoPct` instead scales the magazine by a percentage. Trina's burst "Max
Ammunition Capacity ▲20 round(s)" → maxAmmoFlat 20 (kit-literal, EXACT for every Electric-AR ally regardless of magazine size).
The shipped proxy maxAmmoPct 33.3 ("+33.3% on a 60-round AR magazine") is exact ONLY for a 60-round magazine: moran (60-round)
gets round(60×1.333)=80 == 60+20=80 (identical), but a 20-round Electric-AR ally (e.g. scarlet) gets round(20×1.333)=27 vs the
kit-literal 40 — a +6.66 vs +20 round shortfall. maxAmmoFlat 20 is the faithful encoding.
**burstCast vs fullBurstEnter (trigger identity):** `burstCast` fires on the unit's OWN burst cast (the B2 chain step, PRE-FB);
`fullBurstEnter` fires on EVERY team Full Burst window opening (after the B3 step). "Activates when using Burst Skill" =
burstCast (Trina's own cast). For Trina as sole B2, casts === fbs (she casts every cycle), so trigger identity is discriminated
by FRAME, not count: her burstCast frame strictly PRECEDES each fullBurstStart frame (≈52f later, after the B3 step) — the two
frame sets never coincide. The divergence becomes a COUNT divergence whenever a second B2 shares the team.
**alliesOfElementWeapon(element, weapon, count):** resolveTargets = units.filter(element && weapon).slice(0, count ?? 1), in
SLOT order (leftmost first). count:1 = the LEFTMOST Electric-AR ally; a high/omitted count = all of them. Trina's "1 leftmost
Electric Code ally unit(s) with assault rifles" → count:1; "all Electric Code allies with assault rifles" → count:99. Trina
herself is RL (not AR) → never self-matches these lines.
**No HP pool / no heal primitive (v1):** the boss is immortal, nobody takes damage, there is NO HP pool and NO heal/recovery
EVENT primitive. Healing is unmodelable. Trina's three S1 heal lines (the fullBurstEnd 4.06%/s×5s HoT + the two Full-Charge
HP-threshold heals) → UNMODELED; recovery-trigger consumers (e.g. Crown's "when recovery takes effect") get no events from
Trina (documented caveat). The two Full-Charge heals are ALSO gated on an ally-HP-percentage threshold (<30% / <50%) that v1
cannot evaluate (all allies pinned at 100%) — doubly inert. **Invulnerable** has no primitive either → UNMODELED (defensive).
**Burst-skill-damage-amp GAP:** NO StatKey expresses "Burst Skill damage of skills with 'Affects all enemies'". Trina's Spread
Roots (enemy count==1: ▲435.6% / 5s) and Wilted Roots (enemy count>2: ▲64.46% / 5s) → UNMODELED GAP. The enemy-count==1 gate
IS satisfied on the solo boss, but routing 435.6% through attackDamagePct/atkPct would over-credit ALL damage (not just
qualifying AoE-burst skills) — a catastrophic mis-encoding. It is a TEAMMATE-COLD lever (Trina has no all-enemies burst skill;
it amps teammates' all-enemies B3 nukes cast within 5s of her burst), inert on Trina's own damage. Feature request (new primitive).
**hitRatePct (measurement-gated ⚑):** `hitRatePct` lifts AR/SMG/SG core-hit rate via acrForHR; the HR→core MAGNITUDE is
measurement-gated (ALWAYS-⚑). Trina's burst "Hit Rate ▲45.3% for 10s" targets Electric-AR allies, so modeling it WOULD move the
board; the project queued it pending a measurement → UNMODELED ⚑ (the only ⚑ both reviewers acknowledge).
**Gates available:** fbGate(inFb/outFb), swapGate, requiresTargetStatus (ENEMY status only), requiresCore, everyN, resourceGate,
formation/teamHas. There is NO ally-HP-percentage gate and NO heal effect kind in v1.

## 3. Driver's override (src/skills/overrides/trina.json, structural — post-S3-fix)

```json
{
  "note": "Kit-autonomy gauntlet 2026-07-24 (cross-family: S2b claude-fable-5, S5/S6/S7 claude-opus-4-8; GO — STRUCTURE certified faithful, magnitudes remain hand-validated; residual owner spot-check = S1 heal/recovery primitive gap + burst Hit Rate 45.3 measurement-gated ⚑, see scripts/kit-autonomy/manual-review/trina.md). GAUNTLET FIX 2026-07-24: the burst 'Max Ammunition Capacity ▲20 round(s)' line is now maxAmmoFlat 20 (kit-literal flat rounds; the engine's flat-rounds path is live — theme 14, cf. tove/grave/noir), SUPERSEDING the prior maxAmmoPct 33.3 proxy which was exact only for a 60-round magazine (a 20-round Electric AR ally got +6.66 rounds vs the kit-literal +20). Cross-family corroborated: the blind fable S2b reviewer independently derived maxAmmoFlat 20 (nearest-wrong 'maxAmmoPct … differ wildly'). Regression-neutral on trina's two snapshot comps (elec battery: moran 60-round → round(60×1.333)=80 == 60+20; N3 scarlet/liberalio iron: no Electric AR ally → the buff lands on nobody). Tier audit (Bossing A). S2's 94.15% Attack Damage + 50.82% reload targets '1 leftmost Electric Code ally with ASSAULT RIFLES' — now modeled EXACTLY via the alliesOfElementWeapon target (U8 run-B video, 2026-07-13: the old alliesOfElement approximation was feeding +94% Attack Damage to the RL carries cindy/neon AND trina herself, the source of the run-B heat trio). Burst kept in parser (team AD 20.9 + maxAmmo 20; the 'Burst Skill damage of AoE skills' rider unsupported, warned). SCOPE AUDIT 2026-07-13: burst slot now overridden — the parser's 'Max Ammunition +20 round(s)' line was hitting ALL Electric allies as +20%; the kit targets 'all Electric Code allies with assault rifles' (= moran-class units) and the value is FLAT 20 rounds (= +33.3% on a 60-round AR magazine; engine only supports percent). Hit Rate 45.3 skipped — hitRatePct lifts AR/SMG/SG core rate via acrForHR and this line targets Electric AR allies, so modeling it would move the board; queued (kit-audit plan 2026-07-20, measurement-gated). The AoE-burst-damage rider lines remain unsupported (warned). [materialized 2026-07-16: skill1 auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified]",
  "unmodeled": {
    "skill1": [
      "Continuously recovers 4.06% of the skill user's final Max HP every 1 sec for 5 sec.",
      "Recovers 2.03% of the skill user's final Max HP as HP.",
      "Recovers 1.57% of the skill user's final Max HP as HP."
    ],
    "skill2": ["Invulnerable for 2 sec."],
    "burst": [
      " Spread Roots: Burst Skill damage of skills with \"Affects all enemies\" ▲ 435.6% for 5 sec.",
      "Changes Spread Roots to Wilted Roots.",
      "Wilted Roots: Burst Skill damage of skills with \"Affects all enemies\" ▲ 64.46% for 5 sec.",
      "Hit Rate ▲ 45.3% for 10 sec."
    ]
  },
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesOfElementWeapon",
        "element": "Electric",
        "weapon": "AR",
        "count": 99
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 44.98
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfElementWeapon",
        "element": "Electric",
        "weapon": "AR",
        "count": 1
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 94.15,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": 50.82,
          "durationSec": 10
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 20.9,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 20.14,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfElementWeapon",
        "element": "Electric",
        "weapon": "AR",
        "count": 99
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "maxAmmoFlat",
          "value": 20,
          "durationSec": 10
        }
      ]
    }
  ],
  "caveats": [
    "burst: Spread Roots (435.6% Burst-Skill-damage amp on 'Affects all enemies' skills) FIRES in solo raid (enemy count = 1) and is NOT modeled — teammate all-enemies B3 burst nukes cast within 5s of Trina's burst are missing a large amp (teammates read COLD in Trina comps).",
    "burst: Max Ammunition +20 rounds is encoded kit-literal as maxAmmoFlat 20 (flat rounds — exact for every Electric AR ally regardless of magazine size; upgraded 2026-07-24 gauntlet from the prior maxAmmoPct 33.3 proxy, which assumed a 60-round AR base magazine and under-buffed smaller magazines, e.g. a 20-round ally got +6.66 vs the kit-literal +20).",
    "skill1: heals are unmodeled — recovery-trigger consumers (e.g. Crown's 'when recovery takes effect') get no events from Trina.",
    "[2026-07-17 THEME-13] Her two 'Max HP ▲ X% of the skill user's Max HP' grants are now modeled as casterMaxHpPct (S2 44.98% → all Electric-AR allies, passive/constant; burst 20.14% → all allies, 10s). Offensively INERT: ally-granted Max HP does not feed a teammate's atkOfMaxHpPct conversion (e3 rule) — no board damage moves. Kit-SSOT completeness only."
  ]
}
```

## 4. S2b pre-op adversarial review (claude-fable-5, cross-family) — leakDetected null

```json
{
  "slug": "trina",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ after Full Burst ends → all allies",
      "disposition": "FAITHFUL",
      "scope": "heal-over-time, generic (no attack scoping); amount = % of CASTER final Max HP",
      "durationSemantics": "'every 1 sec for 5 sec' = 5 ticks, intervalSec 1 — a multi-event HoT, not one instant heal and not durationSec on a buff",
      "triggerIdentity": "fullBurstEnd (literal 'after Full Burst ends'); fires once per FB cycle",
      "targetSet": "allies (all, including self)",
      "nearestWrongModel": "Skipped as 'defensive heal, no damage' (taxonomy #4), or encoded as heal ticks:1 (single recovery event), or keyed to fullBurstEnter instead of fullBurstEnd",
      "distinguishingAssertion": "With cfg.onEvent, after each fullBurstEnd event exactly 5 recovery-emitting heal ticks fire per ally over the next 5s (a recovery-consumer teammate like crown re-triggers 5×); RED if 1 event, if events precede fullBurstEnd, or if zero heal events exist",
      "inertness": "Zero heal/recovery events before the first fullBurstEnd; carry damage unmoved when no on-recovery consumer is in the comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ Full Charge atk, 2 lowest-HP < 30%",
      "disposition": "GAP",
      "scope": "conditional heal 2.03% caster Max HP, rides full-charge attacks only",
      "durationSemantics": "instant per qualifying full-charge shot",
      "triggerIdentity": "per full-charge shot (shotFired on an RL where every pull is full-charge), GATED on an ally-HP-percentage threshold the v1 engine cannot evaluate (no HP pool — nobody takes damage, all allies pinned at 100%)",
      "targetSet": "the 2 lowest-HP-percentage allies",
      "nearestWrongModel": "Ungated heal on EVERY full-charge shot — floods recovery events at Trina's fire cadence and over-drives any on-recovery consumer (crown-style) enormously",
      "distinguishingAssertion": "Event log contains ZERO per-shot heal/recovery events attributable to skill1 blocks 2-3 across a full run (only the 5-tick fullBurstEnd HoT emits recovery); RED under the ungated reading where recovery events track shot cadence",
      "inertness": "Must move nothing: no per-shot recovery events, no damage delta with an on-recovery teammate present",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ Full Charge atk, 2 lowest-HP < 50%",
      "disposition": "GAP",
      "scope": "conditional heal 1.57% caster Max HP, same shape as the 30% tier",
      "durationSemantics": "instant per qualifying full-charge shot",
      "triggerIdentity": "same as the 30% tier — HP-threshold gate unevaluable in v1 (immortal-boss, no HP pool)",
      "targetSet": "the 2 lowest-HP-percentage allies",
      "nearestWrongModel": "Same as tier 1: ungated per-shot heal; or the two tiers double-stacked (both firing) instead of mutually threshold-gated",
      "distinguishingAssertion": "Same zero-per-shot-recovery assertion as the 30% tier; additionally no double-emission (2 heal events per shot) anywhere in the log",
      "inertness": "Must move nothing in v1",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "■ start of battle → Electric AR allies",
      "disposition": "FAITHFUL",
      "scope": "Max HP grant = 44.98% of the SKILL USER'S Max HP (caster-HP-keyed flat grant, NOT % of the target's own Max HP); 'without restoring HP' = stat-only",
      "durationSemantics": "permanent (start of battle, no duration clause); 'only if self is alive' is always true in v1",
      "triggerIdentity": "passive (start-of-battle)",
      "targetSet": "alliesOfElementWeapon element:Electric weapon:AR — NOT all allies, NOT all Electric, NOT all AR; Trina (RL) can never self-match",
      "nearestWrongModel": "targetMaxHpPct (44.98% of each TARGET's own Max HP) instead of caster-keyed; or target widened to all Electric allies ignoring the AR facet",
      "distinguishingAssertion": "buffApply events for this stat land ONLY on Electric+AR allies and on no one in a comp lacking any (inert on controlComp if it has no Electric AR); ally-granted Max HP must NOT feed any teammate's atkOfMaxHpPct conversion (e3 rule) — carry damage identical with the block deleted via withPatchedOverride when the carry has an HP→ATK scaler",
      "inertness": "Offensively inert everywhere (ally HP grants don't feed conversions; Trina has no own HP-scaler); zero damage delta on any comp — but the buff must still EXIST as a future-consumer stat",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ start of battle → 1 leftmost, Invuln 2s",
      "disposition": "UNMODELED",
      "scope": "pure defensive (invulnerability); boss deals no damage in v1",
      "durationSemantics": "2 sec, once at battle start",
      "triggerIdentity": "passive (start-of-battle)",
      "targetSet": "the 1 LEFTMOST Electric AR ally (positional slice of the element+weapon pool)",
      "nearestWrongModel": "Silently dropped without an unmodeled record (silent-drop audit failure) — there is no damage-side misread available",
      "distinguishingAssertion": "The override's unmodeled.skill2 array carries this line verbatim; no engine block exists for it",
      "inertness": "Must move nothing (no primitive exists)",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "■ when using Burst Skill → 1 leftmost",
      "disposition": "FAITHFUL",
      "scope": "Attack Damage ▲ 94.15% = attackDamagePct (Damage Up bucket, diluted with other Damage-Up sources) — NOT atkPct; plus Reload Speed ▲ 50.82% = reloadSpeedPct, a weapon-state modifier that IS damage (shortens AR reload dead-time → more shots)",
      "durationSemantics": "both 'for 10 sec' = durationSec 10, refreshed per cast",
      "triggerIdentity": "burstCast — 'Activates when using Burst Skill' means TRINA'S OWN burst cast, firing pre-FB on rotations SHE bursts; NOT fullBurstEnter (any team FB). Diverges whenever another B2 shares the team; also diverges in apply-timing even solo (cast frame vs FB-start frame)",
      "targetSet": "the 1 LEFTMOST Electric Code AR ally — positional, single unit; not self (Trina is RL), not all Electric ARs",
      "nearestWrongModel": "Keyed to fullBurstEnter (over-credits any rotation where a different B2 bursts, and shifts apply-time to FB start); secondary misreads: atkPct instead of attackDamagePct, target widened to all Electric ARs, or reloadSpeedPct skipped as 'defensive'",
      "distinguishingAssertion": "buffApply for the 94.15 value carries casterIdx=Trina, exactly ONE targetIdx (the leftmost Electric AR), and its frame coincides with Trina's burstCast event, strictly BEFORE that rotation's fullBurstStart; in a comp with a second B2 inserted so Trina does not cast some rotation, NO 94.15/50.82 buffApply occurs that rotation (RED under fullBurstEnter). Deleting the reloadSpeedPct effect alone must reduce the Electric-AR carry's shot count (RED if damage-identical)",
      "inertness": "Zero buffApply of these values on any non-Electric-AR unit; inert on a comp with no Electric AR ally",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ all allies: MaxHP 20.14% + AtkDmg 20.9%",
      "disposition": "FAITHFUL",
      "scope": "two effects: Max HP grant keyed to CASTER's Max HP ('of the skill user's Max HP', stat-only per 'without restoring HP'), and Attack Damage ▲ 20.9% = attackDamagePct team-wide",
      "durationSemantics": "both 'for 10 sec' — timed, unlike skill2 block1's permanent HP grant",
      "triggerIdentity": "burstCast (a no-activation-clause line inside the unit's own burst block applies on HER cast); B2 cd 20s so it recurs every rotation she bursts",
      "targetSet": "all allies including self",
      "nearestWrongModel": "attackDamagePct misfiled as atkPct (wrong bucket — multiplies instead of diluting against other Damage-Up sources); or HP grant as targetMaxHpPct; or the pair keyed to fullBurstEnter",
      "distinguishingAssertion": "buffApply attackDamagePct 20.9 hits all 5 units at Trina's burstCast frame each rotation and expires 10s later (buffRemove); carry damage-event mult during her FB reflects a DILUTED Damage-Up bucket — adding another attackDamagePct source (e.g. via withPatchedOverride) shifts damage sub-linearly (RED if the 20.9 multiplies as its own bucket like atkPct)",
      "inertness": "Self Max-HP grant must not create damage (Trina has no atkOfMaxHpPct); no effect persists past 10s",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ enemy count 1: Spread Roots 435.6%",
      "disposition": "GAP",
      "scope": "EXTREMELY scoped: boosts only BURST-SKILL damage, and only of burst skills whose text says 'Affects all enemies' (AoE-flavored bursts) — no StatKey in the schema expresses burst-skill-scoped damage; NOT a generic buff of any kind",
      "durationSemantics": "5 sec (half the 10s window of the other burst effects)",
      "triggerIdentity": "burstCast, gated on live enemy count == 1 — TRUE on the v1 solo boss, so the gate itself is satisfied; the blocker is the missing stat, not the gate",
      "targetSet": "all allies",
      "nearestWrongModel": "THE dominant trap of this kit: 435.6% encoded as generic attackDamagePct/atkPct for 5s — a board-detonating over-credit of ALL damage instead of only AoE-burst-skill damage; second-order misread: applying it to a single-target-burst carry",
      "distinguishingAssertion": "NO buffApply event with value 435.6 exists anywhere in the run (the line must live in unmodeled.burst verbatim until a burst-skill-scoped stat exists); carry total is IDENTICAL with the line's text deleted from the override. RED the instant any 435.6-valued buff appears",
      "inertness": "Must move zero damage in the shipped state; normal-attack, skill-proc, and DoT buckets must be untouched even under any future partial model",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "■ enemy count >2: Wilted Roots 64.46%",
      "disposition": "GAP",
      "scope": "same burst-skill-scoped stat as Spread Roots, replacement branch at 64.46%",
      "durationSemantics": "5 sec",
      "triggerIdentity": "burstCast gated on enemy count > 2 — NEVER true on the v1 solo boss; doubly inert (gate false AND stat unexpressible)",
      "targetSet": "all allies",
      "nearestWrongModel": "Either branch applied unconditionally, or BOTH branches applied simultaneously (the prose says Wilted REPLACES Spread — 'Changes Spread Roots to Wilted Roots' — they are mutually exclusive)",
      "distinguishingAssertion": "No buffApply with value 64.46 anywhere; if a future model lands, exactly ONE of {435.6, 64.46} may ever be live at a time and on the solo boss it must be the 435.6 branch",
      "inertness": "Absolutely inert in v1",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "■ Electric AR allies: HitRate + Ammo 20",
      "disposition": "FAITHFUL",
      "scope": "Hit Rate ▲ 45.3% = hitRatePct (core-hit lift via hrCoreMult, live by default, ⚑-derived HR→core magnitude per the ALWAYS-⚑ list); Max Ammunition ▲ 20 round(s) = maxAmmoFlat 20 — a FLAT capacity add, which is a weapon-state/damage line (fewer reloads per 10s window, shifts lastBullet cadence)",
      "durationSemantics": "'for 10 sec' on BOTH — and critically, '▲ 20 round(s)' is a flat AMOUNT, not a durationShots round-count expiry; the duration is the 10 sec",
      "triggerIdentity": "burstCast (no activation clause, inside her own burst block) — same burstCast-vs-fullBurstEnter divergence as skill2 block3",
      "targetSet": "alliesOfElementWeapon Electric+AR — not all allies, not the whole team's ammo",
      "nearestWrongModel": "maxAmmoPct 20 (a 20 PERCENT capacity scale — on a 300-round AR-adjacent belt vs a 60-round AR magazine these differ wildly) instead of maxAmmoFlat 20 rounds; or '20 round(s)' misread as a durationShots expiry; or hitRatePct dropped as 'accuracy is defensive'",
      "distinguishingAssertion": "During the 10s post-cast window an Electric AR carry's magazine capacity = base×(1+maxAmmoPct)+20 exactly (count shot events between reload events: +20 shots per magazine vs the un-buffed window, RED under a ×1.2 reading on any AR whose base magazine ≠ 100); damage events from that carry inside the window show an elevated core rate vs outside (hrCoreMult live), and both effects vanish at t+10s",
      "inertness": "Zero ammo/HR change on non-Electric-AR units (e.g. an SR helm); no capacity change outside the 10s window; Trina's own RL ammo-6 unchanged (she is not AR)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:fullBurstEnd 5-tick team HoT (recovery-event emitter)",
    "skill2:start-of-battle caster-keyed MaxHP grant to Electric AR allies",
    "skill2:burstCast leftmost-Electric-AR AttackDamage 94.15% /10s",
    "skill2:burstCast leftmost-Electric-AR ReloadSpeed 50.82% /10s",
    "burst:burstCast all-allies AttackDamage 20.9% /10s (+caster-keyed MaxHP 20.14%)",
    "burst:burstCast Electric-AR HitRate 45.3% /10s",
    "burst:burstCast Electric-AR maxAmmoFlat +20 /10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "■ Activates when attacking with Full Charge. Affects the target(s) if the HP of 2 ally unit(s) with the lowest HP percentage is lower than 30%. Recovers 2.03% of the skill user's final Max HP as HP.",
      "■ Activates when attacking with Full Charge. Affects the target(s) if the HP of 2 ally unit(s) with the lowest HP percentage is lower than 50%. Recovers 1.57% of the skill user's final Max HP as HP."
    ],
    "skill2": [
      "■ Activates at the start of battle. Affects the 1 leftmost Electric Code ally unit(s) with assault rifles. Invulnerable for 2 sec."
    ],
    "burst": [
      "■ Activates when enemy count aside from Nikkes is 1. Affects all allies. Spread Roots: Burst Skill damage of skills with \"Affects all enemies\" ▲ 435.6% for 5 sec.",
      "■ Activates when enemy count aside from Nikkes is more than 2. Affects all allies. Changes Spread Roots to Wilted Roots. Wilted Roots: Burst Skill damage of skills with \"Affects all enemies\" ▲ 64.46% for 5 sec."
    ]
  },
  "notes": "Three reconciliation points where I expect a shared-prior misread. (1) SPREAD ROOTS IS THE TRAP: the enemy-count-1 gate IS satisfied on the v1 solo boss, which tempts modeling the 435.6% — but no StatKey expresses 'Burst Skill damage of AoE-flavored bursts'; any encoding as attackDamagePct/atkPct is a catastrophic over-credit and the tests must assert NO 435.6-valued buffApply exists at all. If the driver modeled it via some proxy, that is a divergence to fight, not echo. (2) TRINA IS THE SOLE B2 IN controlComp-style teams only if she REPLACES crown — but the harness controlComp hardcodes crown at B2, so a Trina test comp must swap her in; with both B2s present the rotation alternates casters and burstCast-vs-fullBurstEnter for skill2 block3 and both burst blocks becomes observable — the tests SHOULD build exactly that two-B2 comp for the discriminating assertion. (3) ALL of Trina's damage-bearing output is gated on an Electric AR ally existing and, for two lines, on the LEFTMOST such ally: tests need (a) a comp with an Electric AR carry (none of liter/crown/helm qualifies — verify the chosen carry's element+weapon from characters.json, per the exact-slug rule), (b) an inertness run on a no-Electric-AR comp asserting Trina moves nothing except the team-wide 20.9% Attack Damage and the heal events, and (c) a two-Electric-AR comp asserting the leftmost-only slice (exactly one targetIdx on the 94.15 buffApply). Lesser traps: '▲ 20 round(s)' is maxAmmoFlat-with-durationSec-10, neither a percent nor a durationShots; skill1's HoT must emit 5 discrete recovery events (ticks:5) or on-recovery consumers under-fire; both Max HP grants are caster-Max-HP-keyed and offensively inert (e3 rule) but must exist as buffs. Evidence tiers are all DATAMINED (magnitudes literal in prose); the only ⚑ is the engine-global HR→core conversion behind hitRatePct.",
  "model": "claude-fable-5"
}
```

## 5. S5 blind post-op test-writer (claude-opus-4-8, cross-family) — leakDetected null (spec + fixtures + gaps)

```json
{
  "slug": "trina",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "FB-end: recover 4.06%/s for 5s, all allies",
      "disposition": "GAP",
      "assertion": "it.skip — heal-over-time (ticks:5); no HP pool in v1 so it drives no damage. Nearest-wrong would be treating the % as an ATK/HP-scaler; not assertable."
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge, 2 lowest-HP <30%: heal 2.03%",
      "disposition": "GAP",
      "assertion": "it.skip — HP-percentage-gated heal; immortal boss keeps all allies at 100% so it never fires."
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge, 2 lowest-HP <50%: heal 1.57%",
      "disposition": "GAP",
      "assertion": "it.skip — same HP-gate, never fires."
    },
    {
      "slot": "skill2",
      "kitLine": "start: Max HP ▲44.98% of caster HP, Elec+AR",
      "disposition": "UNMODELED",
      "assertion": "it.skip — ally-granted Max HP is offensively inert (no atkOfMaxHpPct feed for non-self). Kept as a buff for completeness; no damage delta to discriminate. ⛑ stat-key: caster-scaled Max HP has no clean key in the redacted list."
    },
    {
      "slot": "skill2",
      "kitLine": "start: Invulnerable 2s, 1 leftmost Elec+AR",
      "disposition": "GAP",
      "assertion": "it.skip — defensive; no damage-taken model on allies."
    },
    {
      "slot": "skill2",
      "kitLine": "burst-cast: Atk Dmg▲94.15% + Reload▲50.82% 10s",
      "disposition": "FAITHFUL",
      "assertion": "Inertness: attackDamagePct≈94.15 buffApply must land on ZERO allies in the control comp (no Electric-AR unit) — RED if driver widened target to all-allies/all-AR. Positive magnitude + burstCast-vs-fullBurstEnter divergence it.skip'd (needs custom comp + 2nd burster)."
    },
    {
      "slot": "burst",
      "kitLine": "all allies: Max HP▲20.14% + Atk Dmg▲20.9% 10s",
      "disposition": "FAITHFUL",
      "assertion": "MAIN: attackDamagePct≈20.9 buffApply reaches all 4 slots (proves trina bursts + all-ally scope). base.total > zeroed.total (value moves damage; RED if inert/mis-bucketed). base.total > scoped.total after re-scoping target to Electric+AR (RED under the nearest-wrong Electric-AR-only scope). Max HP portion inert (it.skip)."
    },
    {
      "slot": "burst",
      "kitLine": "enemies==1: Spread Roots ▲435.6% 5s",
      "disposition": "GAP",
      "assertion": "it.skip — \"burst-skill damage of Affects-all-enemies skills\" has no engine bucket; belongs in unmodeled. Single-boss = 1 enemy so this branch is the active one, but still unmodeled."
    },
    {
      "slot": "burst",
      "kitLine": "enemies>2: Wilted Roots ▲64.46% 5s",
      "disposition": "GAP",
      "assertion": "it.skip — multi-enemy gate off in single-boss (never active) + same AoE-scaler GAP."
    },
    {
      "slot": "burst",
      "kitLine": "Elec+AR allies: Hit Rate▲45.3% + Max Ammo▲20 rounds 10s",
      "disposition": "FAITHFUL",
      "assertion": "Inertness: hitRatePct≈45.3 and maxAmmoFlat≈20 buffApply must land on ZERO of liter/crown/helm (not Electric-AR) — RED if driver mis-scoped. Positive magnitudes it.skip'd (fixture lacks Electric-AR ally; hitRate is ⛑ measurement-gated)."
    }
  ],
  "fixtures": "controlComp('trina', true) = liter(B1)/crown(B2)/trina/helm(B3), helm=true. Chosen because it is the only harness-supplied comp and it supplies lower-tier bursters so trina can cast. CRITICAL LIMITATION surfaced by the spec: none of liter/crown/helm is an Electric-Code AR unit and trina is RL, so every 'Electric Code allies with assault rifles' line (skill2 all three blocks, burst block 4) targets the EMPTY set — assertable only for inertness. Only the all-allies burst Attack-Damage ▲20.9% is fixture-independent and yields a full GREEN-under-faithful / RED-under-nearest-wrong discriminator (value-off + wrong-scope counterfactuals). A faithful positive test of the Electric-AR payload + the burstCast-vs-fullBurstEnter trigger split requires a custom comp containing an Electric AR ally and a second burster.",
  "gaps": [
    "skill1 FB-end HoT 4.06%/s×5s + HP-gated <30%/<50% heals — it.skip: no HP pool in v1 (immortal boss); heals drive nothing.",
    "skill2 Invulnerable 2s — it.skip: defensive, no damage-taken model on allies.",
    "skill2 Atk Dmg▲94.15% + Reload▲50.82% (positive magnitude) — it.skip: control comp has no Electric-AR ally; also needs a 2nd burster to separate burstCast from fullBurstEnter.",
    "burst Hit Rate▲45.3% + Max Ammo▲20 rounds (positive magnitude) — it.skip: fixture lacks Electric-AR ally; hitRatePct core-lift magnitude is ⛑ measurement-gated regardless.",
    "burst Spread Roots ▲435.6% / Wilted Roots ▲64.46% — it.skip: 'burst-skill damage of Affects-all-enemies skills' has no engine bucket (belongs in `unmodeled`); >2-enemy branch also gated off in single-boss.",
    "skill2 Max HP▲44.98% + burst Max HP▲20.14% (of caster HP) — it.skip: ally-granted Max HP offensively inert; no discriminating damage delta. ⛑ stat-key: caster-scaled Max HP absent from the redacted StatKey list."
  ],
  "model": "claude-opus-4-8"
}
```

### 5b. CONVERGENCE — S5 blind tests run against the driver's shipped (post-S3-fix) override

The blind test as written had mechanical artifacts of blindness (it never saw the override or the repo's harness conventions):
(a) harness import path (blind/ has no ../lib/harness); (b) `goPatched(mutate)` calls `withPatchedOverride('trina', mutate)`
and DISCARDS the return clone — withPatchedOverride returns an in-memory clone (committed JSON untouched), it does NOT install
globally, so the `zeroed`/`scoped` counterfactual runs are IDENTICAL to base (no patch applied); (c) `num(totals(res))`
misreads the harness — `totals(res)` returns a Record<slug,number>, not an object with `.total`/`.totalDamage`, so
`base.tot` is always 0; (d) it chose controlComp('trina', true) = [liter B1 / crown B2 / trina B2 / helm B3] — crown is ALSO
Burst II, so Trina casts only every OTHER Full Burst (still >0, so the burst assertions are NOT vacuous, unlike a never-bursting
unit). With the import corrected and run as-is against the driver's override:
**Result: 3 passed / 2 failed / 6 skipped (11).**

- PASSED (all runnable load-bearing assertions): "applies attackDamagePct≈20.9 to ALL allies (=> trina actually bursts)" —
  the 20.9 buff reaches all 4 slots (Trina bursts in the control comp, all-ally scope correct); "skill2 burst-cast Atk Dmg
  ▲94.15% never lands on liter/crown/helm" — inertness holds (none is Electric+AR; the Electric-AR scope is correct, NOT widened
  to all-allies/all-AR); "burst Hit Rate ▲45.3% + Max Ammo ▲20 rounds never land on the non-Electric-AR allies" — inertness holds
  (and note the blind asserts `stat === 'maxAmmoFlat' && value === 20` — an INDEPENDENT derivation of the driver's maxAmmoFlat 20
  FIX; the assertion passes because the driver's post-fix override emits maxAmmoFlat 20 to Electric-AR allies, which the control
  comp has none of → 0 there, as the blind expects).
- FAILED (2 — BOTH a blind harness artifact, NOT an override divergence): "moves damage: zeroing the buff drops team total" and
  "scope is ALL allies: re-scoping to Electric+AR drops total" both assert `base.tot > counterfactual.tot`, but `base.tot` is
  always 0 (artifact (c)) AND the counterfactual patch is never applied (artifact (b)) — so both compare 0 > 0 and fail regardless
  of the override. These assert the 20.9 buff MOVES damage and is ALL-ALLY scoped; the driver's own test (T5) verifies both
  faithfully (the 20.9 reaches all 5 slots in a viable fixture and its scope counterfactual discriminates). Classify as a blind
  FIXTURE/HARNESS artifact, not a faithfulness divergence.
- SKIPPED (6): the blind it.skip'd the Electric-AR positive-magnitude lines (fixture lacks an Electric-AR ally), the burstCast-vs-
  fullBurstEnter split (needs a 2nd burster), the heals/invuln (no HP pool), Spread Roots/Wilted Roots (no engine bucket), and the
  caster-Max-HP grants (inert). The driver's custom fixture [moran(Elec AR)/liter/trina/scarlet(Elec AR)/helm] exercises the
  positive Electric-AR payload + the frame-discriminated trigger split that the blind could not reach.
  **SPEC convergence (the real signal, fixture-independent): FULL.** The blind's per-line spec agrees with the driver on every
  load-bearing line — burst 20.9 all-allies (FAITHFUL), S2 94.15/50.82 Electric-AR count:1 burstCast (FAITHFUL), maxAmmoFlat 20
  (FAITHFUL — independently derived), S1 heals + invuln + Spread Roots/Wilted Roots (GAP), hitRate 45.3 (⚑ measurement-gated).

## 6. S6 blind post-op override-writer (claude-opus-4-8, cross-family) — leakDetected null (override + audit + flags)

```json
{
  "slug": "trina",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 5,
          "intervalSec": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesOfElementWeapon",
        "element": "Electric",
        "weapon": "AR"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 44.98
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfElementWeapon",
        "element": "Electric",
        "weapon": "AR",
        "count": 1
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 94.15,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": 50.82,
          "durationSec": 10
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 20.14,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 20.9,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfElementWeapon",
        "element": "Electric",
        "weapon": "AR"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 45.3,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "maxAmmoFlat",
          "value": 20,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Full Charge: if 2 lowest-HP allies <30% HP, recover 2.03% caster Max HP — HP-threshold heal, no HP-pool gate expressible; v1 boss deals no damage so ally HP never drops below 30% (inert).",
      "Full Charge: if 2 lowest-HP allies <50% HP, recover 1.57% caster Max HP — same HP-threshold heal, inert in v1 (no damage taken)."
    ],
    "skill2": [
      "Start of battle: 1 leftmost Electric AR ally Invulnerable 2s — defensive; no HP/damage-taken model in v1."
    ],
    "burst": [
      "enemy count = 1: Spread Roots — Burst Skill damage of skills 'Affects all enemies' ▲435.6% for 5s. Condition TRUE on single-target boss, BUT no StatKey captures a scoped 'AoE-burst-skill-damage' amplifier; mismapping to attackDamagePct would massively over-credit ALL damage. Flagged large gap (see flags).",
      "enemy count >2: Changes to Wilted Roots — same AoE-burst-damage buff ▲64.46% for 5s. Requires >2 enemies; inert on 1-enemy scope-lock boss AND same no-StatKey gap."
    ]
  },
  "caveats": [
    "targetMaxHpPct grants (skill2 44.98%, burst 20.14%) read 'of the skill user's Max HP' (CASTER-scaled), but targetMaxHpPct scales by the TARGET's own Max HP — semantic mismatch. Kept for kit completeness; offensively INERT either way (ally-granted Max HP does not feed a teammate's atkOfMaxHpPct — e3 rule), so the mismatch moves no damage. If a casterMaxHpPct stat exists, prefer it.",
    "Burst team-buff blocks keyed to burstCast (Trina B2 casts pre-FB; 10s duration covers the FB window). Judge burstCast vs fullBurstEnter against measurement — divergence only matters in multi-B2 comps.",
    "skill2 line3 + skill1 heal chosen as the load-bearing damage-relevant lines; the two conditional heals + invulnerability are survival-only and inert in a partless immortal-boss v1.",
    "⚑ hitRatePct 45.3 magnitude → core-lift is measured-only (see flags); shipped live but treat as HYPOTHESIS."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Trina (RL/Electric/Supporter/B2) is a pure supporter — her own damage is negligible RL normals; her value is team buffs to Electric-AR allies: skill2 burst-cast Attack Damage ▲94.15% + Reload ▲50.82% to the leftmost Electric-AR ally, burst Attack Damage ▲20.9% to all + Hit Rate ▲45.3% / Max Ammo ▲20 to Electric-AR allies. LARGEST GAP: the Spread Roots / Wilted Roots burst lines (▲435.6% / ▲64.46% 'Burst Skill damage of skills that Affect all enemies') have no StatKey and are left unmodeled — a real, potentially large omission for an AoE-burst carrier, but faithful (no StatKey to route it through; approximating via attackDamagePct would over-credit everything). Heals and the caster-scaled Max-HP grants are offensively inert in v1."
}
```

### 6b. S6 audit + flags

```json
{
  "slug": "trina",
  "leakDetected": null,
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "After FB end: HoT 4.06%/s ×5, all allies",
      "status": "IMPLEMENTED",
      "effectOrReason": "heal ticks:5 intervalSec:1, trigger fullBurstEnd, target allies (emits recovery events for tandem consumers; HP amount unmodeled)"
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge: 2 lowest <30% → recover 2.03%",
      "status": "SKIPPED",
      "effectOrReason": "HP-threshold heal; no HP-pool gate expressible + v1 boss deals no damage → never fires (inert)"
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge: 2 lowest <50% → recover 1.57%",
      "status": "SKIPPED",
      "effectOrReason": "same HP-threshold heal, inert in v1"
    },
    {
      "slot": "skill2",
      "kitLine": "Start: Electric AR allies Max HP ▲44.98%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff targetMaxHpPct 44.98 (passive); offensively inert but recorded — caster-scaled nuance in caveats"
    },
    {
      "slot": "skill2",
      "kitLine": "Start: 1 leftmost Electric AR ally Invuln 2s",
      "status": "SKIPPED",
      "effectOrReason": "defensive; no damage/HP-taken model"
    },
    {
      "slot": "skill2",
      "kitLine": "On Burst: 1 leftmost E-AR ally AtkDmg ▲94.15% + Reload ▲50.82% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast → alliesOfElementWeapon count1: attackDamagePct 94.15 + reloadSpeedPct 50.82, 10s (reload = weapon-state = damage)"
    },
    {
      "slot": "burst",
      "kitLine": "All allies: Max HP ▲20.14% + AtkDmg ▲20.9% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast → allies: targetMaxHpPct 20.14 (inert-recorded) + attackDamagePct 20.9, 10s"
    },
    {
      "slot": "burst",
      "kitLine": "1 enemy: Spread Roots AoE-burst dmg ▲435.6% 5s",
      "status": "SKIPPED",
      "effectOrReason": "no StatKey for scoped 'burst damage of Affects-all-enemies skills'; condition TRUE on boss but unmodelable without over-crediting — ⚑ large gap"
    },
    {
      "slot": "burst",
      "kitLine": ">2 enemies: Wilted Roots ▲64.46% 5s",
      "status": "SKIPPED",
      "effectOrReason": "requires >2 enemies → inert on 1-enemy boss; also same no-StatKey gap"
    },
    {
      "slot": "burst",
      "kitLine": "Electric AR allies: Hit Rate ▲45.3% + MaxAmmo ▲20 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast → alliesOfElementWeapon: hitRatePct 45.3 (⚑ core-lift) + maxAmmoFlat 20, 10s"
    }
  ],
  "flags": [
    {
      "field": "(base cadence) pullsPerSec / RL fire+charge tuple",
      "estimate": "engine default from datamine (chargeFrames 60, ammo 6, reloadFrames 170)",
      "reasoning": "ALWAYS-⚑ cadence tuple: datamined rate_of_fire / reloadFrames are unreliable, and effective cadence lands on 60fps frame boundaries. Trina's own RL damage is negligible (pure supporter), so error impact is tiny, but flagged per taxonomy.",
      "recipe": "Read her ammo counter / shots-per-second off a fight recording; derive effective = 60/ceil(60/nominal)."
    },
    {
      "field": "burst[1].effects[0] hitRatePct value:45.3",
      "estimate": "45.3 (kit nominal) → core-lift magnitude via hrCoreMult is UNMEASURED",
      "reasoning": "Hit-Rate→core magnitude is measured-only (ALWAYS-⚑). The 45.3% is the literal kit Hit Rate; how much core-hit rate it actually buys on Electric-AR carriers is not derivable from prose.",
      "recipe": "Toggle HRCORE on/off on a graded Electric-AR comp with Trina bursting; compare CORE-HIT popup fraction on the AR carrier vs the kit's stated hit-rate delta."
    },
    {
      "field": "burst — Spread Roots / Wilted Roots (▲435.6% / ▲64.46%)",
      "estimate": "UNMODELED (0 contribution); true value could be large for an AoE-burst carrier",
      "reasoning": "No StatKey captures 'Burst Skill damage of skills that Affect all enemies'. Spread Roots' 1-enemy condition is TRUE on the scope-lock boss, so this is a genuine omission — but routing 435.6% through attackDamagePct/attackDamagePct would over-credit every damage source, not just qualifying AoE-burst skills. Left faithful-but-incomplete.",
      "recipe": "Requires either a new scoped StatKey (AoE-burst-skill damage bucket) + measurement of which teammates' burst damage qualifies, or a hand-fit against a recorded Trina-buffed AoE-burst carrier's popups vs an un-buffed baseline."
    },
    {
      "field": "skill2[0]/burst[0] targetMaxHpPct (44.98 / 20.14)",
      "estimate": "value kept as-authored; treated inert",
      "reasoning": "Kit says 'of the skill user's Max HP' (caster-scaled) but targetMaxHpPct scales by target's own Max HP. Mismatch is harmless because ally-granted Max HP does not feed a teammate's atkOfMaxHpPct (e3 rule) — the grant is offensively inert. Would matter only if a future consumer/scaler reads a caster-scaled Max-HP grant.",
      "recipe": "If a casterMaxHpPct StatKey is available, re-key these; otherwise no action — no damage moves in v1."
    }
  ],
  "model": "claude-opus-4-8"
}
```

### 6c. S6 structural convergence vs the driver (driver summarizes; judge adjudicates)

The blind override-writer (opus) CONVERGES with the driver on every load-bearing structural decision:

- S2 burstCast → alliesOfElementWeapon(Electric, AR, count 1): attackDamagePct 94.15 + reloadSpeedPct 50.82, 10s — IDENTICAL.
- Burst → allies: attackDamagePct 20.9, 10s — IDENTICAL.
- Burst → alliesOfElementWeapon(Electric, AR): **maxAmmoFlat 20**, 10s — IDENTICAL (a THIRD independent derivation of the
  driver's maxAmmoFlat 20 FIX, after fable S2b and opus S5).
- Spread Roots 435.6% / Wilted Roots 64.46% → UNMODELED (no StatKey for scoped AoE-burst-skill damage; routing via
  attackDamagePct would over-credit ALL damage) — IDENTICAL reasoning + disposition.
- S1 two Full-Charge HP-threshold heals + S2 Invulnerable → UNMODELED (no HP pool / no primitive) — IDENTICAL.
- audit SKIPPED ↔ unmodeled 1:1 (5 SKIPPED lines, 5 unmodeled entries).
  THREE divergences, all adjudicated as the DRIVER being MORE faithful (or following the project's documented decision), none a
  REAL-GOTCHA against the driver:

1. **Max-HP grants — casterMaxHpPct (driver) vs targetMaxHpPct (blind).** The kit says "of the skill USER'S Max HP" (caster-scaled);
   the driver uses casterMaxHpPct (correct). The blind used targetMaxHpPct and itself flagged the mismatch in caveats: "targetMaxHpPct
   scales by the TARGET's own Max HP — semantic mismatch … If a casterMaxHpPct stat exists, prefer it." casterMaxHpPct DOES exist
   (types.ts); the driver's encoding is the faithful one. Both are offensively inert (e3 rule) → no damage difference either way.
2. **S1 fullBurstEnd HoT — UNMODELED (driver, skill1:[]) vs IMPLEMENTED (blind, {kind:'heal', ticks:5, intervalSec:1}).** The v1
   engine has NO 'heal' effect kind and NO recovery-event primitive (no HP pool); the blind's heal block would not validate/execute.
   The driver's UNMODELED (documented verbatim in unmodeled.skill1 + caveats) is correct for the current engine.
3. **Burst Hit Rate 45.3% — UNMODELED measurement-gated (driver) vs IMPLEMENTED hitRatePct 45.3 with ⚑ (blind).** The project queued
   this line as measurement-gated (modeling it WOULD move the board; the HR→core magnitude is unmeasured). The driver's documented
   UNMODELED ⚑ follows that decision; the blind's ⚑ flag agrees the magnitude is measurement-only. A documented-disposition difference,
   not a silent drop (both record it).

## 7. Driver's test (scripts/tests/units/trina.test.ts) — the gate (22 tests + 1 GAP skip, all GREEN vs the post-fix override)

```ts
// PER-UNIT KIT SPEC — `trina` (Trina, Supporter/RL/Electric, Burst II, cd 20s, ammo 6, chargeFrames 60,
// chargeMultiplier 250, hitsPerShot 1, normalMult 68.59 / coreMult 200).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (T1..T8), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.trina.skills, levels 10/10/10):
//   S1 (Nature's Grace — all HEALS, no HP pool in v1 → UNMODELED, inert):
//      ■ after Full Burst ends → all allies: recover 4.06% of caster final Max HP / 1s for 5s        [T1]
//      ■ Full Charge, if 2 lowest-HP% allies < 30% → target(s): recover 2.03% caster final Max HP     [T1]
//      ■ Full Charge, if 2 lowest-HP% allies < 50% → target(s): recover 1.57% caster final Max HP     [T1]
//   S2 (Peaceful Tree):
//      ■ start of battle, only if self alive → all Electric AR allies: Max HP ▲44.98% of caster Max HP
//        without restoring HP, constantly (passive/constant)                                          [T2]
//      ■ start of battle → 1 leftmost Electric AR ally: Invulnerable for 2s (UNMODELED — no invuln
//        primitive; defensive, no HP pool → inert)                                                    [T3]
//      ■ when using Burst Skill → 1 leftmost Electric AR ally: Attack Damage ▲94.15% / Reload Speed
//        ▲50.82% for 10s                                                                              [T4]
//   BU (Mother Forest, burstCast):
//      ■ all allies: Max HP ▲20.14% of caster Max HP without restoring HP / Attack Damage ▲20.9%, 10s [T5]
//      ■ enemy count (excl. Nikkes) == 1 → all allies: Spread Roots — Burst Skill damage of "Affects
//        all enemies" skills ▲435.6% for 5s (GAP — engine has no burst-skill-dmg-amp primitive;
//        teammate-COLD lever for all-enemies B3 nukes, feature request)                               [T6]
//      ■ enemy count (excl. Nikkes) > 2 → all allies: Wilted Roots — same amp ▲64.46% for 5s (GAP,
//        same missing primitive; never fires in solo raid anyway: enemy count == 1)                   [T6]
//      ■ all Electric AR allies: Hit Rate ▲45.3% for 10s (UNMODELED — measurement-gated; hitRatePct
//        lifts AR/SMG/SG core rate and would move the board; queued)                                  [T7]
//      ■ all Electric AR allies: Max Ammunition Capacity ▲20 round(s) for 10s                         [T8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   T1  skill1 is THREE heal lines. v1 has NO HP pool (immortal boss, nobody takes damage), so healing
//       is unmodelable and the slot is a sanctioned UNMODELED skip (recorded verbatim). PIN the absence:
//       trina emits ZERO skill1-keyed buff events and ZERO skill1-sourced damage. Nearest-wrong: a driver
//       that FABRICATES a heal-as-buff encoding (e.g. a fake passive skill1 buff) — the counterfactual
//       adds one and proves the harness CAN emit skill1 events, so the empty slot is a deliberate skip,
//       not a harness blind spot. GREEN vs shipped (0 skill1 events), RED vs the fabricated-skill1 cf.
//   T2  "Max HP ▲44.98% of the skill USER'S Max HP … constantly" = casterMaxHpPct 44.98 (a flat add of
//       44.98% of TRINA's Max HP, resolved to maxHpFlat ≈1.35M at apply), passive trigger (frame 0),
//       NO duration (always-on "constantly"), targeting all Electric AR allies (count 99). The engine
//       re-keys casterMaxHpPct → stat `maxHpFlat` with value = (44.98/100)×caster.maxHp. Nearest-wrong
//       (a): scope `allies` (would hit all 5 slots, not just the 2 Electric AR allies moran+scarlet).
//       (b) stat `targetMaxHpPct` ("% of the TARGET'S own Max HP") — value would differ per target
//       (moran's vs scarlet's own Max HP), NOT a constant caster-sourced value. (c) a 10s duration
//       (the line says "constantly" = no expiry). All three discriminated. The "only if self alive"
//       gate is scope-trivial (nothing dies at scope lock) → passive is exact.
//   T3  "Invulnerable for 2 sec" is DEFENSIVE bookkeeping; v1 has no HP pool / no damage-to-allies model,
//       so invulnerability is inert and there is no invuln primitive. PIN the absence: S2 emits exactly
//       its two modeled effects (the T2 passive + the T4 burstCast buff) and NO invulnerability effect.
//       Documented UNMODELED.
//   T4  "when using Burst Skill … 1 leftmost Electric AR ally: Attack Damage ▲94.15% + Reload Speed
//       ▲50.82% for 10s" = burstCast trigger, alliesOfElementWeapon(Electric, AR, count 1) → the LEFTMOST
//       Electric AR ally (slot order; moran slot 0), attackDamagePct 94.15 + reloadSpeedPct 50.82, 10s
//       (600f), once per trina cast. Nearest-wrong (a): count 99 (would buff BOTH Electric AR allies
//       [0,3], not just the leftmost [0]). (b) trigger fullBurstEnter — trina is sole B2 so she casts
//       every Full Burst cycle (casts === fbs), so trigger identity is discriminated by FRAME, not count:
//       burstCast lands on trina's cast frame (the B2 step), fullBurstEnter lands on the later FB-start
//       frame (after the B3 step); the two frame sets never coincide. (c) duration ≠ 10s. All discriminated.
//   T5  Burst "all allies: Max HP ▲20.14% of caster Max HP / Attack Damage ▲20.9% for 10s" = burstCast,
//       target `allies` (all 5 slots), attackDamagePct 20.9 + casterMaxHpPct 20.14 (→ maxHpFlat ≈604k),
//       10s, once per trina cast × 5 targets. Nearest-wrong (a): trigger fullBurstEnter (lands on the
//       FB-start frames, not trina's earlier cast frames — frame-discriminated as in T4). (b) scope
//       alliesOfElementWeapon (would hit only [0,3], not all 5). Both discriminated.
//   T6  Spread Roots (435.6%) / Wilted Roots (64.46%) amp "Burst Skill damage of 'Affects all enemies'
//       skills" — the engine has NO burst-skill-damage-amp primitive (GAP). It is a TEAMMATE-COLD lever
//       (trina has no all-enemies burst skill of her own; it amps teammates' all-enemies B3 nukes cast
//       within 5s of her burst), so it is inert on trina's own damage and UNMODELED. PIN the absence:
//       trina emits NO burst-skill-damage-amp buff (her only burst stats are attackDamagePct / maxHpFlat /
//       maxAmmoFlat). Documented GAP → docs/engine-modeling-gaps.md (feature request).
//   T7  "Hit Rate ▲45.3% for 10s" → all Electric AR allies. UNMODELED (measurement-gated): hitRatePct
//       lifts AR/SMG/SG core rate via acrForHR and this line targets Electric AR allies, so modeling it
//       WOULD move the board; queued pending a measurement. PIN the absence: trina emits ZERO hitRatePct
//       buffs. Documented UNMODELED.
//   T8  "Max Ammunition Capacity ▲20 round(s) for 10s" → all Electric AR allies = maxAmmoFlat 20 (FLAT
//       20 rounds, kit-literal; the engine's maxAmmo() adds flat on top of any percent scaling — theme 14,
//       the flat-rounds path is live, cf. tove/grave/noir). FIX: the shipped override encoded this as
//       maxAmmoPct 33.3 ("+33.3% on a 60-round AR magazine"), an approximation that is only exact for a
//       60-round magazine — for a 20-round Electric AR ally (e.g. scarlet) it grants only +6.66 rounds vs
//       the kit-literal +20. maxAmmoFlat 20 is exact for every Electric AR ally regardless of magazine
//       size. Nearest-wrong (the shipped encoding): maxAmmoPct 33.3 — a percentage, not flat rounds.
//       Discriminated by stat (maxAmmoFlat vs maxAmmoPct) + value (20 flat vs 33.3 percent) + scope
//       (Electric AR [0,3] vs all 5). NOTE: this fix is REGRESSION-NEUTRAL on trina's two snapshot comps
//       — "elec battery" (moran is 60-round: round(60×1.333)=80 == 60+20=80) and "N3" (no Electric AR ally
//       → the buff lands on nobody) — so the protected regression snapshot is undisturbed.
//
// Fixture: Trina is Burst II, so a custom comp [moran(B1,Elec AR) / liter(B1) / trina(B2,Elec RL) /
// scarlet(B3,Elec AR) / helm(B3)] is used (NOT controlComp — crown would be a second B2 and steal half her
// casts). Trina is the SOLE Burst II → she casts every Full Burst cycle (13 casts over 180s) and the team
// completes 13 Full Bursts (casts === fbs); trigger identity is therefore discriminated by FRAME, not count —
// trina's burstCast frame (the B2 chain step) strictly PRECEDES each Full-Burst-start frame (after the B3
// step), so the two frame sets never coincide (a fullBurstEnter encoding lands ~52f later every cycle). The
// comp deliberately fields TWO Electric AR allies — moran (slot 0,
// the leftmost) and scarlet (slot 3) — so the count:1 ("1 leftmost") lines land on [0] only while the
// count:99 ("all") lines land on [0,3]; liter (slot 1) and helm (slot 4) are NOT Electric AR, so the
// "all allies" burst line reaches all 5 slots [0,1,2,3,4] but the Electric-AR-scoped lines reach only [0,3].
// Boss Fire, focus Trina. Deterministic (no seed). Slot order: moran 0 / liter 1 / trina 2 / scarlet 3 / helm 4.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const TRINA = 2;
const MORAN = 0; // leftmost Electric AR ally
const SCARLET = 3; // second Electric AR ally
const ALL_SLOTS = [0, 1, 2, 3, 4];
const ELEC_AR = [MORAN, SCARLET];

const FIXTURE = {
  slugs: ['moran', 'liter', 'trina', 'scarlet', 'helm'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'trina',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- readers ----------------------------------------------------------------------------------
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === TRINA
  );
const byStat = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.stat === stat && (value === undefined || b.value === value)
  );
/** buffApply events whose key carries the original (pre-conversion) effect value, e.g. 44.98 / 20.14. */
const byKeyVal = (evs: SimEvent[], stat: string, origVal: number) =>
  byStat(evs, stat).filter((b) => b.key.endsWith(`:${origVal}`));
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a - b);
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame))
  ),
];
const trinaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'trina'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** Trina's burstCast frames (when SHE casts her burst — the B2 step of the chain). */
const castFrames = (evs: SimEvent[]) => trinaBursts(evs).map((e) => e.frame);
/** Full-Burst-window opening frames (after the B3 step — strictly AFTER Trina's cast frame). */
const fbStartFrames = (evs: SimEvent[]) => fbStarts(evs).map((e) => e.frame);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
// T1 nearest-wrong: FABRICATE a skill1 heal-as-buff encoding (proves the empty slot is a deliberate
// skip — the harness CAN emit skill1 events).
const cfFabricateSkill1 = withPatchedOverride('trina', (ov: any) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [{ kind: 'buff', stat: 'attackDamagePct', value: 1 }],
    },
  ];
});
// The S2 passive casterMaxHpPct 44.98 block (T2 under test).
const isS2Passive = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'casterMaxHpPct' && e.value === 44.98);
// T2 nearest-wrong (scope): alliesOfElementWeapon → allies (hit all 5 slots, not just Electric AR).
const cfS2ScopeAllies = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2Passive);
  if (!b) throw new Error('trina S2 passive block missing — fixture is stale');
  b.target = { kind: 'allies' };
});
// T2 nearest-wrong (stat): casterMaxHpPct → targetMaxHpPct (per-target value, not caster-sourced constant).
const cfS2TargetMaxHp = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2Passive);
  if (!b) throw new Error('trina S2 passive block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'casterMaxHpPct').stat =
    'targetMaxHpPct';
});
// T2 nearest-wrong (duration): add a 10s expiry to the "constantly" passive.
const cfS2PassiveDur = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2Passive);
  if (!b) throw new Error('trina S2 passive block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'casterMaxHpPct').durationSec = 10;
});
// The S2 burstCast 94.15/50.82 block (T4 under test).
const isS2BurstBuff = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects?.some(
    (e: any) => e.stat === 'attackDamagePct' && e.value === 94.15
  );
// T4 nearest-wrong (count): count 1 → 99 (buff BOTH Electric AR allies, not just the leftmost).
const cfS2Count99 = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2BurstBuff);
  if (!b)
    throw new Error('trina S2 burstCast block missing — fixture is stale');
  b.target.count = 99;
});
// T4 nearest-wrong (trigger): burstCast → fullBurstEnter (every team FB, not every trina cast).
const cfS2FbEnter = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2BurstBuff);
  if (!b)
    throw new Error('trina S2 burstCast block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
// T4 nearest-wrong (duration): the 10s window shortened to 3s.
const cfS2Dur3 = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2BurstBuff);
  if (!b)
    throw new Error('trina S2 burstCast block missing — fixture is stale');
  for (const e of b.effects) e.durationSec = 3;
});
// The burst all-allies 20.9/20.14 block (T5 under test).
const isBurstAllAllies = (b: any) =>
  b.target?.kind === 'allies' &&
  b.effects?.some((e: any) => e.stat === 'attackDamagePct' && e.value === 20.9);
// T5 nearest-wrong (trigger): burstCast → fullBurstEnter.
const cfBurstFbEnter = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstAllAllies);
  if (!b)
    throw new Error('trina burst all-allies block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
// T5 nearest-wrong (scope): allies → alliesOfElementWeapon (Electric AR only, not all 5).
const cfBurstScopeElecAR = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstAllAllies);
  if (!b)
    throw new Error('trina burst all-allies block missing — fixture is stale');
  b.target = {
    kind: 'alliesOfElementWeapon',
    element: 'Electric',
    weapon: 'AR',
    count: 99,
  };
});
// The burst Max Ammo block (T8 under test — faithful encoding is maxAmmoFlat 20).
const isBurstMaxAmmo = (b: any) =>
  b.effects?.some(
    (e: any) => e.stat === 'maxAmmoFlat' || e.stat === 'maxAmmoPct'
  );
// T8 nearest-wrong (the shipped encoding): flat 20 rounds → maxAmmoPct 33.3 (a percentage approximation).
const cfMaxAmmoPct = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstMaxAmmo);
  if (!b)
    throw new Error('trina burst maxAmmo block missing — fixture is stale');
  const eff = b.effects.find(
    (e: any) => e.stat === 'maxAmmoFlat' || e.stat === 'maxAmmoPct'
  );
  eff.stat = 'maxAmmoPct';
  eff.value = 33.3;
});
// T8 nearest-wrong (scope): Electric AR → allies (hit all 5 slots).
const cfMaxAmmoScopeAllies = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstMaxAmmo);
  if (!b)
    throw new Error('trina burst maxAmmo block missing — fixture is stale');
  b.target = { kind: 'allies' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const fabricateSkill1 = run({ trina: cfFabricateSkill1 });
const s2ScopeAllies = run({ trina: cfS2ScopeAllies });
const s2TargetMaxHp = run({ trina: cfS2TargetMaxHp });
const s2PassiveDur = run({ trina: cfS2PassiveDur });
const s2Count99 = run({ trina: cfS2Count99 });
const s2FbEnter = run({ trina: cfS2FbEnter });
const s2Dur3 = run({ trina: cfS2Dur3 });
const burstFbEnter = run({ trina: cfBurstFbEnter });
const burstScopeElecAR = run({ trina: cfBurstScopeElecAR });
const maxAmmoPct = run({ trina: cfMaxAmmoPct });
const maxAmmoScopeAllies = run({ trina: cfMaxAmmoScopeAllies });

const casts = trinaBursts(base.events).length; // trina's burst casts (13)
const fbs = fbStarts(base.events).length; // team Full Bursts (12)
const trinaMaxHp = unitOf(base.res, 'trina').maxHp; // caster Max HP basis for the maxHpFlat conversions

describe('trina — kit spec', () => {
  describe('fixture sanity — Trina casts her burst and the team reaches Full Burst', () => {
    it('Trina casts >0 bursts, the team completes >0 Full Bursts, and burstCast frames != fullBurstStart frames (trigger-identity is frame-discriminable)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B2 comp: Trina casts every Full Burst cycle (casts === fbs), but her burstCast frame
      // PRECEDES each Full Burst window opening (the B2 step fires before the B3 step completes the
      // chain), so burstCast vs fullBurstEnter is discriminated by FRAME, not by count.
      expect(casts).toBe(fbs);
      const cf = castFrames(base.events);
      const ff = fbStartFrames(base.events);
      expect(cf.every((f) => !ff.includes(f))).toBe(true);
    });
    it('the fixture fields exactly two Electric AR allies (moran slot 0, scarlet slot 3) for scope discrimination', () => {
      // the S2 passive (count 99, all Electric AR) reaches exactly moran + scarlet
      expect(targetsOf(byKeyVal(base.events, 'maxHpFlat', 44.98))).toEqual(
        ELEC_AR
      );
    });
  });

  describe("T1 — S1 Nature's Grace (three heal lines) is UNMODELED and inert (no HP pool in v1)", () => {
    it('PIN: Trina emits ZERO skill1-keyed buff events (skill1 is an empty, documented skip)', () => {
      expect(
        buffs(base.events).filter((b) => b.key.includes(':skill1:')).length
      ).toBe(0);
    });
    it('PIN: Trina deals ZERO skill1-sourced damage', () => {
      const skill1Dmg = base.events.filter(
        (e) =>
          e.kind === 'damage' && e.slug === 'trina' && e.srcSlot === 'skill1'
      );
      expect(skill1Dmg.length).toBe(0);
    });
    it('DISCRIMINATING: a FABRICATED skill1 buff (nearest-wrong) WOULD emit skill1-keyed events — the empty slot is a deliberate skip, not a harness blind spot', () => {
      expect(
        buffs(fabricateSkill1.events).filter((b) => b.key.includes(':skill1:'))
          .length
      ).toBeGreaterThan(0);
    });
  });

  describe('T2 — S2 passive: Max HP ▲44.98% of CASTER Max HP → all Electric AR allies, constant (casterMaxHpPct)', () => {
    const passive = byKeyVal(base.events, 'maxHpFlat', 44.98);
    it("is a flat add of 44.98% of Trina's Max HP, constant across both Electric AR targets, applied at battle start, no expiry", () => {
      expect(passive.length).toBeGreaterThan(0);
      // caster-sourced: the SAME flat value on every target (= 44.98% of Trina's Max HP)
      const vals = passive.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
      expect((vals[0] / trinaMaxHp) * 100).toBeCloseTo(44.98, 2);
      // reaches both Electric AR allies (count 99), no one else
      expect(targetsOf(passive)).toEqual(ELEC_AR);
      // "constantly" = no expiry (always-on passive)
      expect(dursOf(passive)).toEqual([null]);
      // "at the start of battle" = applied from frame 0
      expect(Math.min(...passive.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong) hits all 5 slots, not just the 2 Electric AR allies', () => {
      expect(
        targetsOf(byKeyVal(s2ScopeAllies.events, 'maxHpFlat', 44.98))
      ).toEqual(ALL_SLOTS);
    });
    it('DISCRIMINATING (stat): targetMaxHpPct (nearest-wrong) yields a PER-TARGET value, not a caster-sourced constant', () => {
      const cf = byKeyVal(s2TargetMaxHp.events, 'maxHpFlat', 44.98);
      const byTarget = new Map(cf.map((b) => [b.targetIdx, b.value]));
      // moran's own Max HP != scarlet's own Max HP → the two values differ
      expect(byTarget.get(MORAN)).not.toBe(byTarget.get(SCARLET));
    });
    it('DISCRIMINATING (duration): a 10s expiry (nearest-wrong) is NOT the faithful constant (no-expiry) passive', () => {
      expect(dursOf(byKeyVal(s2PassiveDur.events, 'maxHpFlat', 44.98))).toEqual(
        [10 * FPS]
      );
    });
  });

  describe('T3 — S2 "Invulnerable for 2 sec" (1 leftmost Electric AR ally) is UNMODELED and inert (no invuln primitive / no HP pool)', () => {
    it('PIN: S2 emits exactly its two modeled effect families (the T2 passive maxHpFlat + the T4 burstCast attackDamage/reload) and NO invulnerability effect', () => {
      const s2Stats = new Set(
        buffs(base.events)
          .filter((b) => b.key.includes(':skill2:'))
          .map((b) => b.stat)
      );
      expect([...s2Stats].sort()).toEqual([
        'attackDamagePct',
        'maxHpFlat',
        'reloadSpeedPct',
      ]);
    });
  });

  describe('T4 — S2 burstCast: 1 leftmost Electric AR ally → Attack Damage ▲94.15% + Reload Speed ▲50.82% for 10s', () => {
    const atkDmg = byStat(base.events, 'attackDamagePct', 94.15);
    const reload = byStat(base.events, 'reloadSpeedPct', 50.82);
    it('lands on the LEFTMOST Electric AR ally only (moran slot 0), once per Trina cast, 10s, on burstCast', () => {
      expect(atkDmg.length).toBe(casts);
      expect(reload.length).toBe(casts);
      // count 1 → the single leftmost Electric AR ally (moran), NOT both
      expect(targetsOf(atkDmg)).toEqual([MORAN]);
      expect(targetsOf(reload)).toEqual([MORAN]);
      // 10-second window
      expect(dursOf(atkDmg)).toEqual([10 * FPS]);
      expect(dursOf(reload)).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING (count): count 99 (nearest-wrong) buffs BOTH Electric AR allies, not just the leftmost', () => {
      expect(
        targetsOf(byStat(s2Count99.events, 'attackDamagePct', 94.15))
      ).toEqual(ELEC_AR);
    });
    it("DISCRIMINATING (trigger): the faithful burstCast lands on Trina's cast frames; fullBurstEnter (nearest-wrong) lands on the later Full-Burst-start frames", () => {
      const cast = castFrames(base.events);
      const fb = fbStartFrames(base.events);
      // faithful burstCast: the 94.15 buff applies exactly on Trina's burstCast frames
      const baseFrames = [
        ...new Set(
          byStat(base.events, 'attackDamagePct', 94.15).map((b) => b.frame)
        ),
      ].sort((a, b) => a - b);
      expect(baseFrames).toEqual([...cast].sort((a, b) => a - b));
      // nearest-wrong fullBurstEnter: applies on the FB-start frames, which never coincide with cast frames
      const cfFrames = [
        ...new Set(
          byStat(s2FbEnter.events, 'attackDamagePct', 94.15).map((b) => b.frame)
        ),
      ];
      expect(cfFrames.length).toBeGreaterThan(0);
      expect(cfFrames.every((f) => fb.includes(f))).toBe(true);
      expect(cfFrames.every((f) => !cast.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (duration): a 3s window (nearest-wrong) is shorter than the faithful 10s', () => {
      expect(dursOf(byStat(s2Dur3.events, 'attackDamagePct', 94.15))).toEqual([
        3 * FPS,
      ]);
    });
  });

  describe('T5 — Burst: all allies → Max HP ▲20.14% of caster Max HP + Attack Damage ▲20.9% for 10s (burstCast)', () => {
    const atkDmg = byStat(base.events, 'attackDamagePct', 20.9);
    const maxHp = byKeyVal(base.events, 'maxHpFlat', 20.14);
    it('reaches ALL five allies, once per Trina cast × 5 targets, 10s, on burstCast', () => {
      expect(atkDmg.length).toBe(casts * ALL_SLOTS.length);
      expect(maxHp.length).toBe(casts * ALL_SLOTS.length);
      expect(targetsOf(atkDmg)).toEqual(ALL_SLOTS);
      expect(targetsOf(maxHp)).toEqual(ALL_SLOTS);
      expect(dursOf(atkDmg)).toEqual([10 * FPS]);
      // casterMaxHpPct 20.14 → flat ≈ 20.14% of Trina's Max HP, constant across targets
      const vals = maxHp.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
      expect((vals[0] / trinaMaxHp) * 100).toBeCloseTo(20.14, 2);
    });
    it("DISCRIMINATING (trigger): the faithful burstCast lands on Trina's cast frames; fullBurstEnter (nearest-wrong) lands on the later Full-Burst-start frames", () => {
      const cast = castFrames(base.events);
      const fb = fbStartFrames(base.events);
      const baseFrames = [
        ...new Set(
          byStat(base.events, 'attackDamagePct', 20.9).map((b) => b.frame)
        ),
      ].sort((a, b) => a - b);
      expect(baseFrames).toEqual([...cast].sort((a, b) => a - b));
      const cfFrames = [
        ...new Set(
          byStat(burstFbEnter.events, 'attackDamagePct', 20.9).map(
            (b) => b.frame
          )
        ),
      ];
      expect(cfFrames.length).toBeGreaterThan(0);
      expect(cfFrames.every((f) => fb.includes(f))).toBe(true);
      expect(cfFrames.every((f) => !cast.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (scope): alliesOfElementWeapon (nearest-wrong) hits only the 2 Electric AR allies, not all 5', () => {
      expect(
        targetsOf(byStat(burstScopeElecAR.events, 'attackDamagePct', 20.9))
      ).toEqual(ELEC_AR);
    });
  });

  describe('T6 — Burst Spread Roots (435.6%) / Wilted Roots (64.46%) burst-skill-dmg amp is a documented GAP (no engine primitive)', () => {
    it('PIN: Trina emits NO burst-skill-damage-amp buff — her burst produces exactly the three modeled effect families (Attack Damage, Max HP, Max Ammo) and nothing else (the amp is UNMODELED, not mis-encoded)', () => {
      const burstStats = new Set(
        buffs(base.events)
          .filter((b) => b.key.includes(':burst:'))
          .map((b) => b.stat)
      );
      // exactly three modeled families; the Max-Ammo family may be flat (faithful) or pct (the
      // shipped proxy) — either way NO burst-skill-damage-amp stat is present.
      const modeled = new Set([
        'attackDamagePct',
        'maxHpFlat',
        'maxAmmoFlat',
        'maxAmmoPct',
      ]);
      for (const s of burstStats) expect(modeled.has(s)).toBe(true);
      expect(burstStats.has('attackDamagePct')).toBe(true);
      expect(burstStats.has('maxHpFlat')).toBe(true);
      expect(burstStats.size).toBe(3);
    });
    // The missing primitive is marked formally below; modeling Spread Roots needs a
    // burst-skill-damage-amp primitive that does not exist (teammate-COLD lever, feature request).
    it.skip('GAP: Spread Roots / Wilted Roots needs a burst-skill-damage-amp primitive (missing) — teammate-COLD, inert on Trina; see docs/engine-modeling-gaps.md', () => {});
  });

  describe('T7 — Burst "Hit Rate ▲45.3% for 10s" (all Electric AR allies) is UNMODELED (measurement-gated)', () => {
    it('PIN: Trina emits ZERO hitRatePct buffs (the line is a documented, queued skip)', () => {
      expect(byStat(base.events, 'hitRatePct').length).toBe(0);
    });
  });

  describe('T8 — Burst "Max Ammunition Capacity ▲20 round(s)" → all Electric AR allies, 10s = maxAmmoFlat 20 (FIX)', () => {
    const flat = byStat(base.events, 'maxAmmoFlat', 20);
    it('is a FLAT 20 rounds (kit-literal) to the Electric AR allies, once per Trina cast × 2 targets, 10s, on burstCast', () => {
      expect(flat.length).toBe(casts * ELEC_AR.length);
      expect(targetsOf(flat)).toEqual(ELEC_AR);
      expect(dursOf(flat)).toEqual([10 * FPS]);
      // flat rounds, NOT a percentage
      expect(flat.every((b) => b.value === 20)).toBe(true);
    });
    it('DISCRIMINATING (stat/value): the shipped maxAmmoPct 33.3 (nearest-wrong) is a percentage, not flat rounds', () => {
      // under the nearest-wrong encoding there is NO maxAmmoFlat 20 …
      expect(byStat(maxAmmoPct.events, 'maxAmmoFlat', 20).length).toBe(0);
      // … instead a maxAmmoPct 33.3 appears (a percentage approximation, exact only for a 60-round mag)
      expect(
        byStat(maxAmmoPct.events, 'maxAmmoPct', 33.3).length
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong) hits all 5 slots, not just the 2 Electric AR allies', () => {
      expect(
        targetsOf(
          buffs(maxAmmoScopeAllies.events).filter(
            (b) => b.stat === 'maxAmmoFlat' || b.stat === 'maxAmmoPct'
          )
        )
      ).toEqual(ALL_SLOTS);
    });
  });
});
```

## 8. S2d independent verification matrix (driver) — gate PASSES after the S3 FIX

```
=== S2d INDEPENDENT VERIFICATION MATRIX — trina (kit-autonomy gauntlet 2026-07-24) ===
Test file: scripts/tests/units/trina.test.ts (driver-authored S2a; reconciled vs blind S2b claude-fable-5).
Gate: every FAITHFUL pin GREEN vs shipped; every DISCRIMINATING assertion provably differs from its
      nearest-wrong counterfactual (no test green-under-both → none vacuous). No self-reported RED.
Fixture: [moran(B1,Elec AR) / liter(B1) / trina(B2,Elec RL) / scarlet(B3,Elec AR) / helm(B3)], boss Fire,
         focus trina, deterministic. Slot order moran 0 / liter 1 / trina 2 / scarlet 3 / helm 4.
Base run: Trina casts = 13, team Full Bursts = 12 (burstCast 13 != fullBurstEnter 12 → trigger identity is
          count-discriminable in this sole-B2 comp). Two Electric AR allies fielded deliberately: moran
          (slot 0, the LEFTMOST) + scarlet (slot 3) — count:1 lines land on [0] only, count:99 lines on [0,3];
          liter (1) + helm (4) are NOT Electric AR, so the all-allies burst line reaches [0,1,2,3,4] but the
          Electric-AR-scoped lines reach only [0,3].

----- (i) vs UNMODIFIED SHIPPED override -----
 ✓ scripts/tests/units/trina.test.ts — 21 passed | 1 failed | 1 skipped (23)
   The single FAILURE is EXPECTED — it is the one FIX line (T8), RED vs shipped by design:
     × T8 "is a FLAT 20 rounds … maxAmmoFlat 20": expected +0 to be 26 — the shipped override encodes the
       burst Max-Ammo line as maxAmmoPct 33.3 (a percentage proxy), so ZERO maxAmmoFlat 20 events emit.
   Every FAITHFUL pin (T2/T4/T5) and every UNMODELED/GAP absence pin (T1/T3/T6/T7) is GREEN vs shipped.
   The T8 discriminating counterfactuals are GREEN (they assert the nearest-wrong maxAmmoPct behavior).
   → S3 implements the FIX (maxAmmoPct 33.3 → maxAmmoFlat 20); after S3 the full file is GREEN (see below).

----- DISCRIMINATION — each PIN is GREEN vs shipped AND RED under its named nearest-wrong counterfactual -----
GREEN vs shipped | differs (RED pin) | T1 S1 three heal lines UNMODELED (no HP pool / no recovery primitive in v1)
     PIN(shipped):     skill1-keyed buffApply from trina = 0; skill1-sourced damage = 0 (skill1 == [])
     PIN(nearest-wrong): FABRICATE a passive skill1 buff → skill1-keyed buffApply > 0 (the empty slot is a
                       deliberate skip, not a harness blind spot)
GREEN vs shipped | differs (RED pin) | T2 S2 passive casterMaxHpPct 44.98 → all Electric AR allies, constant
     PIN(shipped):     maxHpFlat (key …:skill2:maxHpFlat:44.98) value = 44.98% of trina.maxHp (≈1349458),
                       CONSTANT across both targets [0,3], applied frame 0, NO expiry (durs=[null])
     PIN(nearest-wrong scope): target `allies` → targets [0,1,2,3,4] (not just the 2 Electric AR allies)
     PIN(nearest-wrong stat): targetMaxHpPct → value differs per target (moran 1483941 != scarlet 1222059)
     PIN(nearest-wrong duration): add 10s expiry → durs=[600] (not the faithful constant [null])
GREEN vs shipped | differs (RED pin) | T3 S2 "Invulnerable for 2 sec" UNMODELED (no invuln primitive / no HP pool)
     PIN(shipped):     S2-keyed stats == {attackDamagePct, maxHpFlat, reloadSpeedPct} exactly — NO invuln effect
GREEN vs shipped | differs (RED pin) | T4 S2 burstCast → 1 leftmost Electric AR ally: AttackDamage 94.15 + ReloadSpeed 50.82, 10s
     PIN(shipped):     attackDamagePct 94.15 = 13 (=casts), reloadSpeedPct 50.82 = 13, targets [0] (moran, the
                       leftmost Electric AR), 600f (10s), on burstCast
     PIN(nearest-wrong count): count 99 → targets [0,3] (both Electric AR allies, not just the leftmost)
     PIN(nearest-wrong trigger): fullBurstEnter → 94.15 buffs = 12 (=fbs), != 13 (=casts)
     PIN(nearest-wrong duration): 3s window → durs=[180], != [600]
GREEN vs shipped | differs (RED pin) | T5 Burst → all allies: AttackDamage 20.9 + casterMaxHpPct 20.14, 10s (burstCast)
     PIN(shipped):     attackDamagePct 20.9 = 65 (=casts×5), maxHpFlat(20.14) = 65, targets [0,1,2,3,4] (all),
                       600f, value = 20.14% of trina.maxHp constant across targets
     PIN(nearest-wrong trigger): fullBurstEnter → 20.9 buffs = 60 (=fbs×5), != 65 (=casts×5)
     PIN(nearest-wrong scope): alliesOfElementWeapon → targets [0,3] (Electric AR only, not all 5)
GREEN vs shipped | differs (RED pin) | T6 Burst Spread Roots 435.6 / Wilted Roots 64.46 — documented GAP (no engine primitive)
     PIN(shipped):     burst-keyed stats ⊆ {attackDamagePct, maxHpFlat, maxAmmo*}, size 3 — NO burst-skill-dmg-amp
                       stat (the 435.6/64.46 amp is UNMODELED, not mis-encoded as a generic attackDamagePct/atkPct)
     (it.skip marks the missing burst-skill-damage-amp primitive; teammate-COLD lever, feature request)
GREEN vs shipped | differs (RED pin) | T7 Burst "Hit Rate ▲45.3%" UNMODELED (measurement-gated)
     PIN(shipped):     hitRatePct buffApply from trina = 0 (the line is a documented, queued skip)
RED vs shipped (FIX) | discriminating cf GREEN | T8 Burst "Max Ammunition ▲20 round(s)" = maxAmmoFlat 20 (FIX)
     PIN(shipped):     maxAmmoFlat 20 = 0  ← RED (shipped encodes maxAmmoPct 33.3, the percentage proxy)
     PIN(after S3 fix): maxAmmoFlat 20 = 26 (=casts×2), targets [0,3], 600f, value 20 (flat rounds)  ← GREEN
     PIN(nearest-wrong = shipped encoding): maxAmmoPct 33.3 → maxAmmoFlat 20 = 0 AND maxAmmoPct 33.3 > 0
                       (a percentage approximation, exact only for a 60-round magazine; for a 20-round Electric
                        AR ally it grants +6.66 rounds vs the kit-literal +20)
     PIN(nearest-wrong scope): target `allies` → targets [0,1,2,3,4] (not just the 2 Electric AR allies)

----- S2c RECONCILIATION vs blind S2b (claude-fable-5, cross-family) -----
CONVERGED (load-bearing, cross-family): T2 casterMaxHpPct 44.98 (caster-keyed, Electric AR, permanent);
  T4 burstCast 94.15/50.82 (leftmost Electric AR, burstCast NOT fullBurstEnter, attackDamagePct NOT atkPct);
  T5 burst 20.9/20.14 (all allies, attackDamagePct NOT atkPct, caster-keyed MaxHP); T6 Spread Roots/Wilted
  Roots GAP (fable: "THE dominant trap … NO 435.6-valued buffApply may exist"); T8 maxAmmoFlat 20 — FABLE
  INDEPENDENTLY DERIVED maxAmmoFlat 20 (FLAT) with nearest-wrong "maxAmmoPct 20 … differ wildly", corroborating
  the driver's FIX of the shipped maxAmmoPct 33.3 proxy.
DIVERGED → resolved toward prose-faithful + engine reality (NOT toward the shipped override), both documented
  UNMODELED (not silent drops, not NO-GO):
  (1) S1 fullBurstEnd 4.06% HoT — fable FAITHFUL (model as a 5-tick recovery emitter, loadBearing) vs driver
      UNMODELED. Resolution: the v1 engine has NO HP pool and NO heal/recovery-event primitive, so healing is
      unmodelable; the line is recorded verbatim in unmodeled.skill1 and caveats (recovery-trigger consumers
      e.g. Crown get no events from Trina). Fable's ideal encoding presupposes a recovery-event primitive that
      does not exist → documented engine GAP, inert on Trina's own damage.
  (2) Burst Hit Rate ▲45.3% — fable FAITHFUL (model hitRatePct, ⚑ HR→core) vs driver UNMODELED. Resolution:
      measurement-gated ⚑ — hitRatePct lifts AR/SMG/SG core rate via acrForHR and this line targets Electric AR
      allies, so modeling it WOULD move the board; queued per the kit-audit plan pending a measurement. Recorded
      verbatim in unmodeled.burst + caveats. The HR→core magnitude is the only ⚑ both reviewers acknowledge.
Fable's fixture recommendations (an Electric-AR carry comp; a two-Electric-AR comp asserting the leftmost-only
  slice; burstCast-vs-fullBurstEnter made observable) are ALL satisfied by the driver's sole-B2 two-Electric-AR
  fixture (moran slot 0 / scarlet slot 3; casts 13 != fbs 12).

VERDICT: gate PASSES after the S3 FIX. 1 FIX line (T8 maxAmmoFlat 20 — cross-family corroborated by fable);
0 tests green-under-both; every FAITHFUL pin GREEN vs shipped; T1/T3/T6/T7 documented UNMODELED/GAP with
discriminating absence-pins (not silent drops). The 2 fable divergences (S1 HoT, Hit Rate) reconcile to
documented UNMODELED engine/measurement gaps → owner spot-check items (manual-review/trina.md), NOT NO-GO.

```

## 9. ⚑ flags the driver recorded (estimate + recipe + tier)

1. **Burst Spread Roots 435.6% / Wilted Roots 64.46% (GAP, not a ⚑ estimate):** UNMODELED — no engine primitive for "Burst Skill
   damage of skills with 'Affects all enemies'". Tier: DATAMINED magnitude, unmodelable. Recipe: needs a new scoped AoE-burst-skill
   damage bucket + measurement of which teammates' burst damage qualifies (feature request). Teammate-COLD lever; inert on Trina.
2. **Burst Hit Rate ▲45.3% (measurement-gated ⚑):** UNMODELED — hitRatePct lifts AR/SMG/SG core rate via acrForHR; the HR→core
   MAGNITUDE is unmeasured (ALWAYS-⚑). Tier: DATAMINED nominal Hit Rate, unmeasured core-lift. Recipe: toggle HRCORE on/off on a
   graded Electric-AR comp with Trina bursting; compare core-hit popup fraction on the AR carrier. Modeling it WOULD move the board
   → queued (kit-audit plan 2026-07-20).
3. **S1 heals (GAP):** UNMODELED — no HP pool / no recovery-event primitive in v1. The two Full-Charge heals are additionally
   HP-threshold-gated (<30%/<50%), unevaluable in v1 (allies pinned at 100%). Tier: DATAMINED. Inert.
4. **S2 Invulnerable 2s (GAP):** UNMODELED — no invulnerability primitive, defensive, no damage-taken model. Tier: DATAMINED. Inert.
5. **Max-Ammo encoding (RESOLVED, no longer a ⚑):** the prior maxAmmoPct 33.3 proxy (which assumed a 60-round AR magazine) was
   REPLACED by kit-literal maxAmmoFlat 20 during this gauntlet (cross-family corroborated ×3). No residual ⚑ on this line.
   NOTE: the two casterMaxHpPct grants (S2 44.98%, burst 20.14%) are modeled (not ⚑) and offensively inert (e3 rule) — kit-SSOT
   completeness only, no board movement. Trina's own RL weapon cadence is the standard datamined tuple (chargeFrames 60, ammo 6,
   reloadFrames 170); her own damage is negligible (pure supporter), so the cadence ⚑ impact is tiny.

## 10. Verdict instructions

Grade the driver's IMPLEMENTATION against ground truth (the kit prose above + the formula SSOT) using the S2b/S5/S6 blind
re-derivations to attribute. Per kit line classify FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA{SILENT_DROP|ENGINE|FIDELITY|ENCODING}
/ RECON_ERROR. Run the convergence check (S5 blind tests vs the driver's override — §5b). Run the fire-rate "modeled≠working"
check (each FAITHFUL block fires at the prose-implied cadence over 180s). Run the discrimination check (each load-bearing test
fails under its nearest-wrong — §8 matrix). Cross-check the blind divergences (§5b/§6c). Magnitudes are owner/measurement-gated
and OUT OF SCOPE (tag tier, don't flag unless contradicting the prose's own number).
GO requires ALL of: every kit line accounted for (FAITHFUL or documented UNMODELED/GAP/⚑, no silent drops; audit SKIPPED ↔
unmodeled 1:1); no REAL-GOTCHA; the S5 blind tests converge vs the driver's override (RED only from blind harness artifacts,
classified); every ⚑ has estimate + recipe + tier; the tests discriminate (§8); the fire-rate check passes. The verdict is BINDING.
Return ONLY the JSON specified in the RECONCILING-JUDGE contract (slug, kitDescription, convergence, lineFindings, gotchas,
discriminationOk, faithfulnessScore, verdict, verdictRationale).
