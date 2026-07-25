# S7 JUDGE PACKET — `takina` (compact, answer-faithful compilation of the gauntlet artifacts)
Unit: Takina (slug `takina`) — SR / Iron / Supporter / Burst II, cd 20s. Driver model family: Qwen. Cross-family
reviewers: S2b claude-fable-5 (pre-op), S5/S6/S7 claude-opus-4-8 (post-op). Gauntlet date 2026-07-24.

## 1. Ground truth — kit prose (data/characters.json → characters.takina.skills, structural; levels 10/10/10)
Base: SR/Iron/Supporter/Burst II, cd 20s, ammo 6, reloadFrames 141, chargeFrames 60, chargeMultiplier 250,
hitsPerShot 1, normalAttackMultiplier 69.04, coreAttackMultiplier 200. baseStats hp 15000 / atk 500 / def 84,
critRate 15 / critDamage 150. Manufacturer Abnormal. The normalized `skills` prose below is the SSOT the sim reads.

skill1:
■ Activates at the start of battle and when Full Burst ends. Affects self.
ATK ▲ 80.04% for 5 sec.
■ Activates when entering Full Burst. Affects self.
True Damage ▲ 35.05% for 15 sec.

skill2:
■ Affects all enemies.
Damage Taken ▲ 10.09% for 5 sec.
Stuns for 2 sec.
■ Affects all allies.
True Damage ▲ 140.49% for 10 sec.

burst:
■ Affects self.
Changes the weapon in use.
Damage: 200.64% of final ATK
Duration: 10 sec
Additional Effects
Affects self: Normal attacks deal true damage for 10 sec.
Affects targets hit: Damage Taken ▲ 6.04% for 5 sec.

NOTE: skill2 carries NO activation clause and the datamine skill2 table is a passive `CharacterSkill` with NO
`skill_cooltime` field — the prose gives the durations (5s/10s) but no trigger/cooldown.

## 2. Damage-formula + mechanics SSOT (the facts the verdict turns on)
Damage = ATK × major (FB +50% by timing; ×1.10 element if advantaged; +30% range) × charge × damageUp-bucket ×
taken × distributed. takina is Iron, neutral vs the Fire boss in the fixture (no element major).

**trueDamagePct is FLAVOR-GATED (the load-bearing scoping fact; sim.ts:1414).** The damageUp bucket adds
`(opts.trueFlavor ? stat(u,'trueDamagePct',frame) : 0)` — trueDamagePct applies ONLY to true-flavored hits. So
takina's ally-wide trueDamagePct 93.66 (and her self 35.05) benefit ONLY true-flavored damage: inert on any ally
dealing no true damage (liter/helm in the fixture), and live on takina's own swap shots (which are true-flavored).
This defuses the "unscoped +140% Damage-Up" trap both blind agents flagged: encoding trueDamagePct does NOT inflate
ordinary ally damage — the engine gates it by flavor. The driver's encoding (trueDamagePct to allies) is faithful
AND correctly scoped by the engine.

**trueNormals on weaponSwap makes the swap shots true-flavored (types.ts:225; sim.ts:2848/2874).** The burst
"Normal attacks deal true damage for 10 sec" = `weaponSwap.trueNormals:true` — a same-weapon flavor swap (the gun
never changes; normals become true-flavored at the swap's 200.64% multiplier for 10s). This is the line that makes
takina's own 35.05 + the team 93.66 trueDamagePct live on her swap output. **REDACTION ARTIFACT (both blind
agents):** the schema line `trueNormals?: boolean; // … (Takina: "Normal attacks deal true damage")` NAMES Takina,
so the de-contamination stripped it from the blind packets' redacted schema. Both fable (S2b: "schema gap, driver
must document") and opus (S5/S6: "no type-conversion primitive", SKIPPED the line) therefore flagged the true-damage
conversion as a GAP / no-primitive. The primitive EXISTS (trueNormals); the driver's encoding resolves it. This is a
RECON_ERROR forced by the (correct, mandatory) redaction, NOT an override divergence — but note opus's S6 override
consequently UNDER-models takina (it drops the true flavor, so the 35.05/93.66 buffs never reach her swap shots).

**ENGINE FIDELITY NOTE (owner spot-check ⚑, NOT an override gotcha):** true swap normals still CRIT in the engine
— sim.ts:2842 hardcodes `crit:true` for normal shots (swap included); the §2c "true damage cannot crit" carve-out
(owner ruling 2026-07-21) is plumbed only for riders via RIDER_CRIT (sim.ts:84/2891), not swap normals. Measured:
takina's 200.64% swap shots have critEligible===true. The override encoding (trueNormals:true) is faithful to the
prose regardless; whether the engine should suppress crit on true swap normals is an engine-fidelity question (broad
blast radius — chisato/laplace share the path — needing owner awareness), flagged in the override caveats + manual
review, NOT changed here.

**swapGate('swapped') vs fbGate('inFb') — the FIX (cross-family corroborated).** The burst "Affects targets hit:
Damage Taken ▲6.04% for 5 sec" is an Additional Effect of the SWAP weapon's hits → it fires on swap-weapon normals,
i.e. only while the swap is live. `swapGate:'swapped'` (sim.ts:1684-1686: fires iff the owner's kit weaponSwap is
live) is the faithful gate. The shipped override used `fbGate:'inFb'`, conflating the swap window [burstCast,+10s]
with the Full Burst window [fullBurstStart,+FBdur]; for a bursting B2 they overlap but are NOT identical (the swap
opens at takina's cast, before FB opens, and closes before FB ends). **Both blind agents independently derived
swapGate:'swapped'** — fable S2b ("shotFired-shaped with swapGate:'swapped', inheriting the burstCast gate via the
swap's existence; NOT fullBurstEnter") and opus S6 (encoded shotFired + swapGate:'swapped'). The driver's FIX
(fbGate→swapGate) is therefore cross-family corroborated. In the fixture (focused sole-B2: takina casts 10× but the
team completes only 5 Full Bursts) the discrimination is observable: 5 of takina's swap windows have NO Full Burst,
so swapGate fires the 6.04 debuff there while fbGate (requires inFb) fires nothing — the driver's T8 pins this.

**skill2 uptime-average (documented CALIBRATED ⚑ — the one substance divergence vs the blind agents).** The skill2
prose gives NO trigger/cooldown. Prydwen (COMMUNITY tier ⚑) lists a 15s cooldown pulse. The engine cannot pulse a
passive-trigger buff (a passive trigger ignores durationSec — sim.ts:983-993 — so encoding 10.09%/5s as
passive+durationSec would be a 100%-uptime permanent, OVER-crediting). The driver models the faithful steady-state
UPTIME-AVERAGE over the 15s cycle as frame-0 permanents: enemy damageTakenPct 10.09 × 5/15 = 3.36 (33% uptime, boss
debuff), ally trueDamagePct 140.49 × 10/15 = 93.66 (67% uptime). The blind agents proposed an interval-trigger PULSE
instead (fable: interval at the skill CD, 5s/10s durations, real gaps; opus: interval sec=20 with 10.09/140.49 for
5s/10s). These are behavior-equivalent steady-states (the same average buff over the fight); they differ only in the
encoded CD (driver 15s from Prydwen; opus guessed 20s) and mechanism (permanent-average vs pulse). The driver's value
is better-sourced (Prydwen 15s) and is fight-validated (tier MEASURED, board 0.9158 on the pre-gauntlet encoding).
This is a DOCUMENTED ⚑ (estimate + recipe + tier in the override caveats), NOT a silent value change and NOT a
REAL-GOTCHA: all three readings agree skill2 is a periodic pulse with ⚑ cadence that is NOT permanent-at-full-value.

**Boss-held debuffs emit casterIdx===null AND targetIdx===null** (the skill2 enemy damageTakenPct 3.36 and the burst
target-hit damageTakenPct 6.04); the buff KEY carries the caster SLOT (`<slot>:<skillSlot>:<stat>:<value>`, takina =
slot 1). Filter them by stat+value+targetIdxnull, never by casterIdx. Ally/self buffs carry casterIdx===1.

**burstCast vs fullBurstEnter (trigger identity, B2):** skill1's "entering Full Burst" True Damage 35.05 =
`fullBurstEnter` (ANY team Full Burst), NOT burstCast (takina's own cast). skill1's "when Full Burst ends" ATK 80.04 =
`fullBurstEnd`. The burst weaponSwap + riders = `burstCast` (takina's OWN B2 cast). takina is Burst II: in the
fixture (sole B2, focused SR) she fills her gauge faster than the B1/B3 chain completes → she CASTS ~10× while the
team completes only ~5 Full Bursts (casts > fbs is expected), so trigger identity is frame-discriminated (her
burstCast frame strictly precedes each fullBurstStart, which strictly precedes each fullBurstEnd), and 5 of her swap
windows have no Full Burst (the T8 discriminator).

**No battleStart trigger (v1):** skill1's "Activates at the start of battle … ATK ▲80.04% for 5 sec" has TWO
activations (battle-start + Full-Burst-end). The engine has NO battleStart trigger, and a passive-trigger buff ignores
durationSec (sim.ts:983-993) — so encoding the battle-start activation as a passive would over-credit a permanent
80.04% ATK. The driver models ONLY the Full-Burst-end activation (fullBurstEnd block) and documents the battle-start
activation UNMODELED. (opus S6 encoded a battle-start passive+durationSec and itself flagged the over-credit risk;
the driver's UNMODELED is the faithful choice.)

**Gates available:** fbGate(inFb/outFb), swapGate(swapped/unswapped), requiresTargetStatus (ENEMY status only),
requiresCore, everyN, hitCount, resourceGate, formation/teamHas. There is NO battleStart trigger, NO ally-buff-stack
gate, and NO partial-reload effect kind in v1.

## 3. Driver's override (src/skills/overrides/takina.json — post-S3, with the fbGate→swapGate FIX)
```json
{
  "note": "Kit-autonomy gauntlet 2026-07-24 (GO faithfulness; cross-family S2b claude-fable-5 / S5-S7 claude-opus-4-8 converged). S1: ATK 80.04%/5s on fullBurstEnd (self) — the battle-start activation of the SAME line is UNMODELED (engine has no battleStart trigger; passive-trigger buffs ignore durationSec, sim.ts:983-993, so that instance is not override-expressible). True Damage 35.05%/15s on fullBurstEnter (self). S2 is a 15s-cooldown pulse (cooldown NOT in the DB text; Prydwen COMMUNITY ⚑ confirms 15s): enemies Damage Taken 10.09%/5s + 2s stun (boss-inert, UNMODELED), allies True Damage 140.49%/10s. The engine cannot pulse a passive-trigger buff (a passive trigger ignores durationSec), so both lines are modeled as uptime-averaged frame-0 permanents: damageTakenPct 10.09 x 5/15 = 3.36 (boss debuff), trueDamagePct 140.49 x 10/15 = 93.66 (all allies incl. self). trueDamagePct is flavor-gated (sim.ts:1414), so the 93.66 benefits ONLY true-flavored damage — inert on allies dealing no true damage. Burst: weaponSwap 200.64%/shot for 10s with trueNormals:true ('Normal attacks deal true damage') so her own 35.05 + the team 93.66 True Damage buffs apply to the swap shots exactly. The 6.04% Damage Taken per target hit during the swap is a shotFired boss debuff gated swapGate:'swapped' — fires only while the swap weapon is live, faithful to 'targets hit' by the swap normals (the prior fbGate:'inFb' approximation conflated the swap window with the FB window; for a bursting B2 they overlap but are not identical). ENGINE NOTE (owner spot-check ⚑): true swap normals still CRIT in the engine (sim.ts:2842 hardcodes crit:true; the §2c 'true damage cannot crit' carve-out is plumbed only for riders via RIDER_CRIT, not swap normals) — an engine-fidelity observation, not an encoding choice made here.",
  "caveats": [
    "⚑ S2 15s cooldown is COMMUNITY-sourced (Prydwen), NOT in the kit prose — the uptime-average values (damageTakenPct 3.36 = 10.09 x 5/15; trueDamagePct 93.66 = 140.49 x 10/15) depend on it. CALIBRATED; recipe: read the real skill2 cooldown + pulse shape from a focused Takina recording and rescale (value x uptime/CD). An interval-trigger pulse (10.09/140.49 for 5s/10s every CD) is the behavior-equivalent alternative the blind S2b reviewer independently proposed; both average to the same steady-state.",
    "⚑ swap-shot economy (cadence / charge behaviour / ammo of the swapped 200.64% weapon) is kit-silent (ALWAYS-⚑ #3) — estimated optimistically by the engine's swap model; the kit gives no Full Charge line so no chargeMultPct.",
    "⚑ true swap normals crit in the engine (sim.ts:2842 crit:true; §2c 'true damage cannot crit' carve-out covers riders/RIDER_CRIT only, not swap normals). Engine-fidelity gap; board impact unmeasured — owner spot-check, not an override encoding."
  ],
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle: ATK ▲ 80.04% for 5 sec (the battle-start activation only; the Full-Burst-end activation of the same line IS modeled as the fullBurstEnd block — engine has no battleStart trigger and passive-trigger buffs ignore durationSec, sim.ts:983-993, so this instance is not override-expressible today)"
    ],
    "skill2": [
      "Deals Stun to all enemies for 2 sec (boss-inert: the sim's boss does not fire/charge/reload, so a stun on it changes nothing; genuinely-skippable class)"
    ],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 80.04,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 35.05,
          "durationSec": 15
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.36
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 93.66
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 200.64,
          "durationSec": 10,
          "trueNormals": true
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "swapGate": "swapped",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 6.04,
          "durationSec": 5
        }
      ]
    }
  ]
}
```

## 4. S2b pre-op adversarial review (claude-fable-5, cross-family) — leakDetected null
```json
{
  "slug": "takina",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle & FB ends: ATK ▲ 80.04%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK buff (unscoped stat, atkPct — scales her own ATK); applies to all her damage while live",
      "durationSemantics": "wall-clock 5 sec per activation ('for 5 sec' is literal seconds, not rounds); re-applied fresh on each trigger, not permanent",
      "triggerIdentity": "TWO triggers on one line: (1) one-shot at battle start t=0, (2) fullBurstEnd (every team FB end, regardless of who burst). NOT fullBurstEnter, NOT burstCast, NOT passive",
      "targetSet": "self only",
      "nearestWrongModel": "encoded as a permanent passive atkPct 80.04 (always-on), or keyed to fullBurstEnter instead of fullBurstEnd — both inflate uptime from ~5s slivers to continuous/FB-aligned coverage",
      "distinguishingAssertion": "cfg.onEvent: collect buffApply{stat:atkPct,value:80.04,target:takina}. Assert exactly one at t≈0 with matching buffRemove at t≈5s; assert one within a frame AFTER each fullBurstEnd event and NONE at any fullBurstStart frame; assert zero coverage in the window (5s post-battle-start .. first fullBurstEnd)",
      "inertness": "must not be active during the FB window itself (unless a prior FB ended <5s before — impossible in a standard rotation); teammates' ATK must not move",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "entering Full Burst: True Damage ▲ 35.05%",
      "disposition": "FAITHFUL",
      "scope": "True-Damage-scoped buff (trueDamagePct). Whether it moves her output at all depends on her attacks being true-flavored — which only her own burst's 10s rider grants. Outside her burst window this buff should be damage-inert on her",
      "durationSemantics": "wall-clock 15 sec — deliberately OUTLASTS the 10s FB window by 5s; do not truncate to 10s",
      "triggerIdentity": "fullBurstEnter — fires on ANY team Full Burst, including rotations where takina did not cast her own burst. NOT burstCast",
      "targetSet": "self only (skill2's ally-wide True Damage line is the separate team grant — do not merge)",
      "nearestWrongModel": "keyed to burstCast (only fires on her own burst rotations — under-credits when another B2 like crown takes the slot), or durationSec 10, or encoded as generic attackDamagePct that boosts her non-true damage",
      "distinguishingAssertion": "run a comp where takina is present but another B2 casts every burst: assert buffApply{trueDamagePct,35.05,target:takina} at EVERY fullBurstStart (green faithful / red under burstCast), with buffRemove 15s later (not 10s). Additionally assert her non-true (unswapped SR) damage per shot is IDENTICAL with the buff live vs withPatchedOverride zeroing it (true-scope inertness)",
      "inertness": "must not lift her plain SR shot damage outside her burst's true-damage window; must not apply to allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "all enemies: Damage Taken ▲ 10.09%",
      "disposition": "FAITHFUL",
      "scope": "boss DEBUFF benefiting the WHOLE TEAM's damage (taxonomy #4) — not a self buff",
      "durationSemantics": "wall-clock 5 sec per activation → uptime fraction 5/CD, with real gaps between windows; NOT permanent",
      "triggerIdentity": "⚑ NO activation clause → interval trigger at the datamined skill CD, first fire t=CD (no 'Forcefully uses' language anywhere in this kit, so no t=0 first-fire). The cadence tuple is an ALWAYS-⚑ field",
      "targetSet": "enemy (boss). Harness note: boss-held debuffs emit buffApply with casterIdx===null AND targetIdx===null — filter by stat+value 10.09",
      "nearestWrongModel": "permanent/passive debuff (100% uptime instead of 5/CD), or mis-scoped to self as a damage buff, or first-fire at t=0",
      "distinguishingAssertion": "filter buffApply{damageTakenPct,10.09,casterIdx:null,targetIdx:null}: assert first application at t≈CD (not t=0), a matching removal/expiry 5s later, and ≥2 applications spaced CD apart. Assert TEAM totals (all four allies' damage, via totals/unitOf) drop when withPatchedOverride zeroes this block — proving team-wide benefit, not self-only",
      "inertness": "no buffApply targeting any ally slot for this stat; boss multiplier back to baseline between windows",
      "evidenceTier": "DATAMINED magnitude; CALIBRATED ⚑ cadence",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stuns for 2 sec.",
      "disposition": "UNMODELED",
      "scope": "boss stun — the v1 boss deals no damage and never fires, so preventing it from firing/charging/reloading moves nothing",
      "durationSemantics": "2 sec wall-clock (irrelevant given inertness)",
      "triggerIdentity": "same ⚑ interval block as the Damage Taken line",
      "targetSet": "enemy (boss); resolveTargets({kind:'enemy'}) returns [] — a stun effect authored here is a structural no-op",
      "nearestWrongModel": "mis-targeting the stun at allies (would zero their fire/charge/reload for 2s per interval — catastrophic), or inventing boss-damage value for it",
      "distinguishingAssertion": "assert NO ally emits a stun-shaped gap: every ally's shot cadence (shot events per unit) is identical with the line present vs removed; totals delta from this line alone must be exactly 0",
      "inertness": "entire line must move zero damage; must appear in unmodeled (or as an inert enemy-targeted stun) — never silently dropped without record",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "all allies: True Damage ▲ 140.49%",
      "disposition": "FAITHFUL",
      "scope": "True-Damage-scoped team buff — by game semantics it boosts ONLY true-flavored damage a holder deals (true-flavored flatDamage/dot riders, and takina's own swap shots during her burst rider window). It must NOT act as a generic +140% Damage-Up for ordinary attacks",
      "durationSemantics": "wall-clock 10 sec per activation → uptime 10/CD; NOT permanent",
      "triggerIdentity": "⚑ NO activation clause → same interval-at-skill-CD convention as the other skill2 block (presumably the same cast: debuff+stun on enemies, buff on allies, one cooldown)",
      "targetSet": "ALL allies INCLUDING self ({kind:'allies'} with no excludeSelf) — 5 recipients",
      "nearestWrongModel": "THE trap line: encoding 140.49 as an unscoped Damage-Up-bucket stat that inflates every ally's ordinary damage by up to +140% (diluted). Secondary misreads: excludeSelf, or permanent uptime",
      "distinguishingAssertion": "two-part: (a) buffApply{trueDamagePct,140.49} lands on all 5 unit slots every CD with 10s expiry; (b) SCOPING inertness — for an ally with zero true-flavored hits (e.g. the liter/crown control units), per-hit damage mult during the buff window is IDENTICAL to the same frames with the block zeroed via withPatchedOverride. Green under flavor-scoped faithful reading; red (+~140% diluted) under generic-bucket misread",
      "inertness": "allies dealing no true damage gain exactly nothing; boss debuff stat unaffected",
      "evidenceTier": "DATAMINED magnitude; CALIBRATED ⚑ cadence",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Changes weapon: 200.64%, Duration 10 sec",
      "disposition": "FAITHFUL",
      "scope": "weaponSwap {damagePct:200.64, durationSec:10} — a PER-SHOT multiplier while swapped (vs base normalAttackMultiplier 69.04, a ~2.9× per-shot step-up), NOT a one-time nuke",
      "durationSemantics": "hard 10 sec time bound; no maxShots stated",
      "triggerIdentity": "burstCast — her OWN burst block; fires ONLY on rotations takina actually casts B2. NOT fullBurstEnter. Note she is Burst II: in the standard controlComp crown holds B2, so a naive control harness never fires this at all — tests must use a comp where takina actually bursts",
      "targetSet": "self (caster-slot weapon overwrite)",
      "nearestWrongModel": "one-time flatDamage 200.64% on cast (loses ~10s of boosted volume), or keyed to fullBurstEnter (fires on every FB even when crown bursts). ⚑ swap shot economy: cadence/charge behaviour/ammo of the swapped weapon are kit-silent (ALWAYS-⚑ #3) — estimate optimistically and flag; kit gives no Full Charge line, so no chargeMultPct",
      "distinguishingAssertion": "on a rotation takina casts: assert her shot events in the 10s post-cast carry mult≈200.64 (multiple such shots, count>1 — red under one-time-nuke), reverting to 69.04-based shots after 10s; on a rotation crown casts B2 instead, assert ZERO swapped shots (red under fullBurstEnter keying). Swap shots landing inside the FB window must show fbMajorApplied (they get +50% by timing; only cast-instant riders are FB-exempt)",
      "inertness": "no swap shots outside the 10s window; base SR economy (ammo 6, reloadFrames 141, chargeFrames 60) resumes after",
      "evidenceTier": "DATAMINED magnitude; CALIBRATED ⚑ swap economy",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "self: normal attacks deal true damage 10s",
      "disposition": "GAP",
      "scope": "flavor CONVERSION of her own attacks to true damage for the 10s window (coextensive with the swap) — this is the line that makes S1b's 35.05% and skill2's 140.49% live on her own output. It is NOT itself a magnitude",
      "durationSemantics": "wall-clock 10 sec from her burst cast",
      "triggerIdentity": "burstCast (self mode inside her own burst block)",
      "targetSet": "self",
      "nearestWrongModel": "two opposite traps: (1) dropping it as 'pure flavor text' — which silently DISCONNECTS her from all three True Damage ▲ magnitudes in this kit; (2) making her attacks permanently true-flavored (S2's 140.49% would then boost her full-time). Schema gap: weaponSwap carries no flavor/true field, so the visible schema has no clean primitive to flavor-tag shots — driver must document the encoding choice",
      "distinguishingAssertion": "with the True Damage buffs live: her per-shot damage mult DURING the 10s swap window reflects the trueDamagePct contributions (compare identical frames with withPatchedOverride zeroing the true-damage buffs — delta > 0 inside window); OUTSIDE the window the same toggle produces zero delta on her ordinary SR shots",
      "inertness": "true-flavor tag (and hence True Damage ▲ credit on her) must vanish at window end; allies' flavor untouched",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "targets hit: Damage Taken ▲ 6.04% 5s",
      "disposition": "FAITHFUL",
      "scope": "ON-HIT boss debuff carried by her swapped shots — team-wide benefit while maintained. Distinct value from skill2's 10.09% (both damageTakenPct on the boss; they coexist/stack per the bucket)",
      "durationSemantics": "5 sec per HIT, refreshed by each subsequent swap shot → effectively continuous over the 10s swap window plus a ≤5s tail after the last shot; NOT a single 5s window at cast",
      "triggerIdentity": "per-hit during the swap (shotFired-shaped with swapGate:'swapped'), inheriting the burstCast gate via the swap's existence; NOT fullBurstEnter, NOT a cast-time one-shot",
      "targetSet": "enemy (boss) — 'targets hit'; emits casterIdx===null/targetIdx===null buffApply, filter by value 6.04",
      "nearestWrongModel": "single application at burst cast for 5s (loses the refresh chain and the tail; ~5s uptime instead of ~15s), or permanent debuff, or conflated/merged with the 10.09% skill2 value",
      "distinguishingAssertion": "count buffApply{damageTakenPct,6.04}: assert one application per swap shot (count ≈ swap shot count, >1 — red under cast-once), last expiry ≈ last-swap-shot time +5s (not cast +5s), and zero applications on rotations takina does not burst",
      "inertness": "absent entirely outside her burst rotations; the 10.09% skill2 debuff's own event stream unchanged by this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ATK ▲80.04% (battle-start + fullBurstEnd, 5s)",
    "skill1:True Damage ▲35.05% (fullBurstEnter, 15s)",
    "skill2:Damage Taken ▲10.09% (interval, boss, 5s)",
    "skill2:True Damage ▲140.49% (interval, all allies incl. self, 10s)",
    "burst:weaponSwap 200.64% / 10s (burstCast)",
    "burst:Damage Taken ▲6.04% per hit (swap shots, 5s refresh)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Stuns for 2 sec."
    ],
    "burst": [
      "Affects self: Normal attacks deal true damage for 10 sec. — ONLY if the driver cannot flavor-tag swap shots; if dropped, it must be recorded here, never silently"
    ]
  },
  "notes": "Three places I expect a shared-prior misread. (1) TRUE-DAMAGE SCOPING is the load-bearing question of this whole kit: three separate True Damage ▲ magnitudes (35.05 self, 140.49 team-wide, plus the burst flavor-conversion rider that makes them live on her). If trueDamagePct is implemented as an unscoped Damage-Up-bucket stat, the ally-wide 140.49% massively over-credits four units who deal no true damage — the driver and the engine could share this misread, and only the ally-inertness assertion in the skill2 line catches it. The visible schema comment ('Damage Up bucket') is ambiguous on scoping and weaponSwap has no flavor field, so the burst rider is a genuine encoding GAP the driver must reconcile explicitly. (2) B2 SLOT CONTENTION: takina is Burst II and controlComp's fixed B2 is crown — a test comp built naively never lets her cast, so her entire burst block (swap + both riders) is silently dead and any 'green' totals test proves nothing about it; tests must verify at least one burstCast event by takina and must probe the burstCast-vs-fullBurstEnter divergence on a rotation crown bursts. (3) SKILL2 CADENCE is a ⚑ interval invented from the datamined skill CD (no activation clause, no force-cast language → first fire t=CD); both skill2 blocks presumably share one cast. Uptime ratios (5/CD debuff, 10/CD team buff) are where a permanent-passive misread hides — assert expiries, not just applications. Minor: the stun is enemy-targeted and structurally inert in v1 (no enemy entity, boss never fires) — assert zero-delta rather than trusting the drop; skill1a must key to fullBurstEnd (buff lives in the POST-FB troughs, opposite phase to a fullBurstEnter misread).",
  "model": "claude-fable-5"
}
```

## 5. S5 blind post-op test-writer (claude-opus-4-8, cross-family) — leakDetected null (spec + fixtures + gaps)
```json
{
  "slug": "takina",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start+FB-end: self ATK \u25b280.04%/5s",
      "disposition": "FAITHFUL",
      "assertion": "buffApply atkPct\u224880.04 self, applied >=2x (start-of-battle + >=1 FB-end refresh); zeroing lowers takina but NOT liter/crown. Fails under nearest-wrong = ally-scoped (would move teammates) or single-trigger (would apply once)."
    },
    {
      "slot": "skill1",
      "kitLine": "FB-enter: self True Dmg \u25b235.05%/15s",
      "disposition": "FAITHFUL",
      "assertion": "buffApply trueDamagePct\u224835.05 present; zeroing lowers takina, teammate liter unchanged. Fails under nearest-wrong = all-allies scope (35.05 would then move liter) or generic atkPct encoding."
    },
    {
      "slot": "skill2",
      "kitLine": "all enemies: Dmg Taken \u25b210.09%/5s",
      "disposition": "FAITHFUL (trigger MEASUREMENT-GATED \u2691)",
      "assertion": "boss-held buffApply damageTakenPct\u224810.09 (casterIdx/targetIdx null); zeroing lowers BOTH takina and liter (proves enemy-debuff/team-wide scope). Fails under nearest-wrong = self-only buff (would not move liter). Cadence not asserted \u2014 no stated trigger."
    },
    {
      "slot": "skill2",
      "kitLine": "enemies: Stun 2s",
      "disposition": "GAP",
      "assertion": "it.skip \u2014 immortal partless scope-lock boss yields no damage-scored consequence for a stun."
    },
    {
      "slot": "skill2",
      "kitLine": "all allies: True Dmg \u25b2140.49%/10s",
      "disposition": "FAITHFUL (trigger MEASUREMENT-GATED \u2691)",
      "assertion": "buffApply trueDamagePct\u2248140.49 hits >=2 distinct ally targetIdx; zeroing lowers teammate liter. Fails under nearest-wrong = self-only (140.49 wouldn't move liter) \u2014 the discriminator vs the 35.05 self line."
    },
    {
      "slot": "burst",
      "kitLine": "self weaponSwap 200.64% ATK/10s",
      "disposition": "FAITHFUL",
      "assertion": "zeroing weaponSwap.damagePct lowers takina total; takina damage events fire inFullBurst==true (swap window opens). Non-vacuous because both swapped and base-fire states occur. Fails under nearest-wrong = swap unmodeled (no delta)."
    },
    {
      "slot": "burst",
      "kitLine": "self: normal attacks deal true dmg 10s",
      "disposition": "GAP / UNMODELED",
      "assertion": "it.skip \u2014 no schema primitive converts normal-attack damage TYPE to true (weaponSwap has no flavor field; trueDamagePct is a bucket buff, not a type flip). Belongs in note/unmodeled."
    },
    {
      "slot": "burst",
      "kitLine": "targets hit: Dmg Taken \u25b26.04%/5s",
      "disposition": "FAITHFUL",
      "assertion": "boss buffApply damageTakenPct\u22486.04 present (distinct value from skill2's 10.09). Fails under nearest-wrong = merged into the 10.09 debuff or omitted."
    }
  ],
  "fixtures": "controlComp('takina', true) \u2014 liter(B1)/crown(B2)/takina(B3)/helm(B3), boss Fire, focus takina. helm=true kept: none of takina's discriminators read a stat helm confounds (helm buffs are generic support and do not create false 80.04/35.05/140.49/10.09/6.04 magnitudes). The chain is REQUIRED so Full Bursts occur \u2014 otherwise skill1B (FB-enter), skill1A's FB-end refresh, and the entire burst branch are un-exercised (vacuous). Counterfactuals use withPatchedOverride('takina', \u2026) mutating effects by stat/kind+value so they are robust to the driver's unseen block layout.",
  "gaps": [
    "skill2 'Stun for 2 sec' \u2014 it.skip: immortal partless scope-lock boss has no damage-scored consequence for enemy stun; presence-only, not discriminating.",
    "burst 'Normal attacks deal true damage for 10 sec' \u2014 it.skip: no type-conversion primitive in the effect schema (weaponSwap lacks a flavor field; trueDamagePct is a Damage-Up bucket buff, not a normal-attack damage-TYPE flip). Belongs in the override note/unmodeled.",
    "\u2691 skill2 trigger cadence: kit gives skill2 NO activation clause. Taxonomy default -> interval, but the exact interval sec is datamine/measurement-gated. Tests assert effect PRESENCE + team-wide scope, deliberately NOT cadence/timing.",
    "\u2691 skill1A dual trigger: 'start of battle' (t=0 passive-like) AND 'when Full Burst ends' (fullBurstEnd). Modeled/asserted as >=2 applications; the exact split between start vs refresh count depends on FB frequency in the fixture and is not pinned to an absolute count."
  ],
  "model": "claude-opus-4-8"
}
```
**S5 convergence run (driver ran the S5 test UNMODIFIED vs the driver's shipped override):** SUITE ERROR — 16 tests,
ALL 16 SKIPPED, 0 run. The suite fails at `beforeAll` setup: the counterfactual helpers `zeroStat`/`zeroSwap` iterate
`o.blocks`, but the override shape is `{skill1:[],skill2:[],burst:[]}` (no `blocks` array) → `TypeError: o.blocks is
not iterable` thrown at module setup → every test skipped. This is a DOCUMENTED BLIND HARNESS ARTIFACT (identical to
the tove S5 `o.blocks` no-op), NOT an override divergence. Two further blind artifacts would confound the run even if
it loaded: (a) the fixture is `controlComp('takina')` = liter/crown/takina/helm with crown holding B2 — the B2-slot
contention trap fable warned about (takina, a B2, may not cast → her whole burst branch un-exercised); (b) `dmg()`
reads `unitOf(res,slug).total` but the harness row exposes `totalDamage` (so `dmg()` is undefined). Convergence is
therefore established NOT by the S5 run but by: the driver's own T1–T8 (22/22 GREEN, fully non-vacuous, §8 matrix),
the fable S2b spec (7/8 lines converge + independent swapGate derivation), and the opus S6 override (independently
reproduced skill1/skill2/burst structure + swapGate). The S5 SPEC table itself converges with the driver on every
line's disposition (skill1 ATK 80.04 self, TrueDmg 35.05 FB-enter self, skill2 boss-debuff team-wide + ally TrueDmg,
burst weaponSwap 200.64, 6.04 debuff, stun GAP); the only spec-level divergence is the skill2 VALUE (S5 asserts the
raw 10.09/140.49 interval-pulse reading vs the driver's uptime-average 3.36/93.66 — the documented ⚑ divergence).

## 6. S6 blind post-op override-writer (claude-opus-4-8, cross-family) — leakDetected null (override + audit + flags)
```json
{
  "slug": "takina",
  "leakDetected": null,
  "override": {
    "slug": "takina",
    "skill1": [
      {
        "slot": "skill1",
        "trigger": {
          "kind": "passive"
        },
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "atkPct",
            "value": 80.04,
            "durationSec": 5
          }
        ]
      },
      {
        "slot": "skill1",
        "trigger": {
          "kind": "fullBurstEnd"
        },
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "atkPct",
            "value": 80.04,
            "durationSec": 5
          }
        ]
      },
      {
        "slot": "skill1",
        "trigger": {
          "kind": "fullBurstEnter"
        },
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "trueDamagePct",
            "value": 35.05,
            "durationSec": 15
          }
        ]
      }
    ],
    "skill2": [
      {
        "slot": "skill2",
        "trigger": {
          "kind": "interval",
          "sec": 20
        },
        "target": {
          "kind": "enemy"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "damageTakenPct",
            "value": 10.09,
            "durationSec": 5
          }
        ]
      },
      {
        "slot": "skill2",
        "trigger": {
          "kind": "interval",
          "sec": 20
        },
        "target": {
          "kind": "allies"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "trueDamagePct",
            "value": 140.49,
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
          "kind": "self"
        },
        "effects": [
          {
            "kind": "weaponSwap",
            "damagePct": 200.64,
            "durationSec": 10
          }
        ]
      },
      {
        "slot": "burst",
        "trigger": {
          "kind": "shotFired"
        },
        "swapGate": "swapped",
        "target": {
          "kind": "enemy"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "damageTakenPct",
            "value": 6.04,
            "durationSec": 5
          }
        ]
      }
    ],
    "unmodeled": {
      "skill1": [],
      "skill2": [
        "Stuns for 2 sec."
      ],
      "burst": [
        "Affects self: Normal attacks deal true damage for 10 sec."
      ]
    },
    "caveats": [
      "⚑ skill2 cadence: kit prose gives NO activation clause for either skill2 group → modeled as interval sec=20 (UNMEASURED estimate; datamine-unreliable). The 140.49% ally True-Damage uptime is highly sensitive to this — pin the skill cooldown + first-fire phase from footage.",
      "⚑ burst weaponSwap economy: swap fire cadence / magazine / shot-count are kit-silent. Left unset → engine defaults to base SR (6 ammo, ~1s charge) cadence, which likely UNDER-credits if the swap is a fast dual-pistol weapon. Count burst-window popups to set pullsPerSec/maxAmmo/maxShots.",
      "burst 'Normal attacks deal true damage 10s' is a damage-TYPE conversion of the swapped weapon's shots; no schema primitive exists for it (trueDamagePct is a % Damage-Up bucket, not a type conversion). SKIPPED → could under-credit if the sim reduces normal damage by boss DEF.",
      "skill1 start-of-battle ATK ▲80.04% is encoded as a `passive` buff with durationSec:5 (applied t=0, expires t=5). If the engine treats `passive` as permanent and ignores durationSec, this over-credits — the fullBurstEnd refresh block is the safe recurring carrier.",
      "skill2 enemy Damage Taken ▲ and burst on-hit Damage Taken ▲ are boss DEBUFFS that benefit the whole team (not self buffs); the enemy Stun is CC and inert on the immortal partless boss.",
      "burst on-hit Damage Taken ▲6.04% is keyed to shotFired+swapGate:swapped so it refreshes each swap shot (effectively up for the whole 10s burst + 5s tail), matching the 'targets hit … for 5 sec' per-hit semantics."
    ],
    "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. skill1: two triggers on the ATK buff (start-of-battle passive+durationSec AND fullBurstEnd refresh), plus a fullBurstEnter self True-Damage buff. skill2: no activation clause → interval (⚑ cadence sec=20) carrying an enemy Damage-Taken debuff and a large all-ally True-Damage buff; enemy stun skipped (CC, inert). burst: self weaponSwap (200.64%/shot, 10s; ⚑ swap fire economy defaulted to base weapon) + a per-swap-shot enemy Damage-Taken debuff; the 'normal attacks deal true damage' type-conversion has no schema primitive and is left unmodeled."
  },
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "start-battle & FB-end: ATK ▲80.04% 5s",
      "status": "IMPLEMENTED",
      "effectOrReason": "self atkPct 80.04 durationSec5 — passive block (battle start) + fullBurstEnd block (refresh)"
    },
    {
      "slot": "skill1",
      "kitLine": "FB-enter: True Damage ▲35.05% 15s",
      "status": "IMPLEMENTED",
      "effectOrReason": "fullBurstEnter → self trueDamagePct 35.05 durationSec15"
    },
    {
      "slot": "skill2",
      "kitLine": "all enemies: Damage Taken ▲10.09% 5s",
      "status": "IMPLEMENTED",
      "effectOrReason": "interval(⚑20s) → enemy damageTakenPct 10.09 durationSec5 (boss debuff)"
    },
    {
      "slot": "skill2",
      "kitLine": "Stuns for 2 sec.",
      "status": "SKIPPED",
      "effectOrReason": "CC; enemy-stun inert on immortal partless boss (resolveTargets enemy→[]) → unmodeled"
    },
    {
      "slot": "skill2",
      "kitLine": "all allies: True Damage ▲140.49% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "interval(⚑20s) → allies trueDamagePct 140.49 durationSec10"
    },
    {
      "slot": "burst",
      "kitLine": "Changes weapon; Damage 200.64%; 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast → self weaponSwap damagePct200.64 durationSec10 (⚑ cadence/ammo)"
    },
    {
      "slot": "burst",
      "kitLine": "self: Normal attacks deal true damage 10s",
      "status": "SKIPPED",
      "effectOrReason": "damage-type conversion of swap shots; no schema primitive → unmodeled + caveat"
    },
    {
      "slot": "burst",
      "kitLine": "targets hit: Damage Taken ▲6.04% 5s",
      "status": "IMPLEMENTED",
      "effectOrReason": "shotFired + swapGate:swapped → enemy damageTakenPct 6.04 durationSec5 (per-hit refresh)"
    }
  ],
  "flags": [
    {
      "field": "skill2[*].trigger.sec",
      "estimate": "interval sec = 20 (both skill2 groups)",
      "reasoning": "Kit prose gives NO activation clause for skill2 → interval per the no-clause rule. Skill cooldown is not in the prose and datamined skill CDs are unreliable; 140.49% ally True-Damage (10s dur) uptime hinges on it (CD~20s → ~50% uptime).",
      "recipe": "Datamine skillCooldownsSec for takina S2, then pin first-fire phase (t=CD vs t=0) by watching when the ally True-Damage / enemy Damage-Taken popup first appears in footage."
    },
    {
      "field": "burst[0].effects[0] (weaponSwap pullsPerSec/maxAmmo/maxShots/weapon)",
      "estimate": "left unset → defaults to base SR (ammo 6, chargeFrames 60); likely UNDER-credits",
      "reasoning": "Weapon-swap shot economy is kit-silent (ALWAYS-⚑). 200.64%/shot over 10s; if the swap is a fast/uncharged weapon the base SR cadence badly undercounts shots. Guessing a precise cadence blind would be fabrication.",
      "recipe": "Count normal-attack popups inside the 10s burst window in a Takina burst recording → derive shots/sec and magazine; set weaponSwap.pullsPerSec/maxAmmo/maxShots (and weapon class if it changes)."
    },
    {
      "field": "burst 'normal attacks deal true damage' (unmodeled)",
      "estimate": "0 damage change modeled",
      "reasoning": "No effect primitive converts a weapon's shots to true-damage type. Effect is nonzero only if the sim reduces normal damage by boss DEF (true damage would bypass it).",
      "recipe": "Confirm whether the sim applies boss DEF to normal hits; if so, add a swap-scoped true-damage routing or an equivalent Damage-Up compensation calibrated to the observed burst popups."
    },
    {
      "field": "skill1[0] passive+durationSec encoding",
      "estimate": "start-of-battle ATK ▲80.04% for 5s via passive buff w/ durationSec:5",
      "reasoning": "No dedicated battle-start trigger exists; passive is the only t=0 apply. Correct ONLY if the engine expires passive buffs at durationSec; if passive is permanent, this over-credits a huge ATK buff.",
      "recipe": "Confirm passive+durationSec expiry in sim.ts; if unsupported, drop this block (keep only the fullBurstEnd refresh) and accept the tiny opening-5s undercredit."
    }
  ],
  "model": "claude-opus-4-8"
}
```

## 7. Driver's test (scripts/tests/units/takina.test.ts — 22 tests, 22 GREEN vs the post-S3 override)
```ts
// PER-UNIT KIT SPEC — `takina` (Takina, Supporter/SR/Iron, Burst II, cd 20s, ammo 6, reloadFrames 141,
// chargeFrames 60, hitsPerShot 1, normalMult 69.04 / coreMult 200, chargeMult 250, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (T1..T8), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.takina.skills, levels 10/10/10 — the normalized `skills` prose is the
// SSOT):
//   S1 ■ at battle start AND when Full Burst ends → self: ATK ▲80.04% for 5 sec
//         (battle-start activation UNMODELED — engine has no battleStart trigger; the FB-END activation IS
//          modeled as the fullBurstEnd block)                                                  [T1 / T2]
//      ■ when entering Full Burst → self: True Damage ▲35.05% for 15 sec                       [T3]
//   S2 ■ all enemies: Damage Taken ▲10.09% for 5 sec  (+ Stuns 2 sec — UNMODELED, boss-inert)  [T4 / T6]
//      ■ all allies: True Damage ▲140.49% for 10 sec                                           [T5]
//   BU ■ self: Changes the weapon in use — Damage 200.64% of final ATK, Duration 10 sec        [T7]
//      ■ self (Additional): Normal attacks deal true damage for 10 sec  (trueNormals on the swap) [T7]
//      ■ targets hit (Additional): Damage Taken ▲6.04% for 5 sec  (swap-weapon hits)           [T8]
//
// SKILL2 STEADY-STATE MODELING (why S2 is a permanent uptime-average, not a 5s/10s timed pulse): the S2 prose
// carries NO trigger/cooldown clause; the datamine skill2 table is a passive `CharacterSkill` with no
// `skill_cooltime`. Prydwen (COMMUNITY ⚑) lists a 15s cooldown pulse. The engine cannot pulse a passive-trigger
// buff (a passive trigger ignores durationSec — sim.ts:983-993 — so encoding 10.09%/5s as passive+durationSec
// would be a 100%-uptime permanent, OVER-crediting). The faithful steady-state is the UPTIME-AVERAGE over the
// 15s cycle: enemy damageTakenPct 10.09 × 5/15 = 3.36 (33% uptime), ally trueDamagePct 140.49 × 10/15 = 93.66
// (67% uptime), both encoded as frame-0 permanents. The 15s cooldown is COMMUNITY-sourced (⚑, needs measurement);
// the durations 5s/10s are the prose's own. This is a documented CALIBRATED ⚑, not a silent value change.
//
// EVENT-LOG CONVENTIONS (measured for this fixture): boss-held debuffs (the S2 enemy damageTakenPct 3.36 and the
// burst target-hit damageTakenPct 6.04) emit buffApply with casterIdx===null AND targetIdx===null, but the buff
// KEY carries the caster SLOT (`<slot>:<skillSlot>:<stat>:<value>`, takina = slot 1) — so they are read by
// stat+value+targetIdxnull, never by casterIdx. Ally/self buffs carry casterIdx===1 normally.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   T1  PIN (documented skip): the battle-start ATK activation is UNMODELED (no battleStart trigger). The S1
//       SLOT is active (it emits the T2 FB-end ATK + T3 FB-enter True Damage self-buffs), so this is a specific
//       within-slot skip. Assert: NO atkPct 80.04 application at frame 0 (battle start) — the first 80.04 lands
//       at the first FB-END, not at spawn. GREEN vs shipped (no frame-0 80.04), RED if a battle-start passive
//       were added.
//   T2  "when Full Burst ends → self ATK ▲80.04% for 5 sec" = atkPct 80.04, fullBurstEnd, target self, 5s.
//       Nearest-wrong (a): trigger fullBurstEnter (lands on FB-START frames, strictly BEFORE the FB-END frames).
//       (b): target allies (would hit all 3 slots, not just takina). Frame-discriminated (takina is sole B2; her
//       burstCast frame strictly precedes each fullBurstStart, which strictly precedes each fullBurstEnd).
//   T3  "when entering Full Burst → self True Damage ▲35.05% for 15 sec" = trueDamagePct 35.05, fullBurstEnter,
//       target self, 15s. Nearest-wrong (a): trigger burstCast (lands on takina's CAST frames, strictly BEFORE
//       the FB-START frames). (b): duration 5s vs the prose 15s. Frame-discriminated.
//   T4  "all enemies: Damage Taken ▲10.09% for 5 sec" = damageTakenPct 3.36 (uptime-average ⚑), passive, target
//       the boss (targetIdx null), permanent. Nearest-wrong (a): value 10.09 (the raw prose magnitude, ignoring
//       the 15s-pulse uptime-average). (b): target allies (would buff the team, not debuff the boss).
//   T5  "all allies: True Damage ▲140.49% for 10 sec" = trueDamagePct 93.66 (uptime-average ⚑), passive, target
//       allies (all 3 slots incl. takina), permanent. Nearest-wrong (a): value 140.49 (raw prose, no uptime-
//       average). (b): target enemy (would debuff the boss, not buff the team).
//   T6  PIN (documented skip): the S2 "Stuns for 2 sec" is UNMODELED (boss-inert: the partless boss does not
//       fire/charge/reload, so a stun changes nothing). The S2 SLOT is active (it emits the T4 enemy debuff +
//       T5 ally buff). Assert: takina's skill2-keyed buffs (key prefix `1:skill2:`) emit EXACTLY the two modeled
//       stat families {damageTakenPct, trueDamagePct} and NO third (stun/CC) effect — the documented skip is
//       distinguished from a silent drop or a mis-encoding of the stun as a damage stat.
//   T7  "Changes the weapon in use — Damage 200.64% of final ATK, 10 sec" + "Normal attacks deal true damage for
//       10 sec" = burstCast → self weaponSwap damagePct 200.64, 10s, trueNormals:true. The swap shots (atkPct
//       200.64) exist; removing the swap block removes them. trueNormals makes the swap shots TRUE-flavored, which
//       routes the trueDamagePct buffs (T3 35.05 + T5 93.66) into their Damage-Up bucket (trueDamagePct is
//       flavor-gated — sim.ts:1414 — it applies ONLY to true-flavored hits). Nearest-wrong (a): weaponSwap removed
//       → no 200.64 shots. (b): trueNormals:false → swap shots lose the true flavor → their dmgUp drops by the
//       trueDamagePct contribution (strictly lower than the faithful swap shots). [ENGINE NOTE: true swap normals
//       still crit in the engine — sim.ts:2842 hardcodes crit:true; the §2c 'true damage cannot crit' carve-out
//       is plumbed only for riders (RIDER_CRIT), not swap normals. That is an engine-fidelity observation flagged
//       for owner spot-check, NOT an override-encoding gotcha; the trueNormals encoding itself is faithful.]
//   T8  "targets hit: Damage Taken ▲6.04% for 5 sec" (under the burst's swap Additional Effects) = shotFired →
//       enemy (boss) damageTakenPct 6.04, 5s, gated swapGate:'swapped' (fires only while takina's swap weapon is
//       live, i.e. on swap-weapon hits in [burstCast, +10s]). This is the FIX line: the shipped override gated it
//       fbGate:'inFb' (swap window ≈ FB window for a bursting B2), but the line is keyed to the SWAP weapon's
//       hits, not the FB window — swapGate is the faithful gate (prior-audit residual F5). The fixture makes this
//       discriminable: focused takina (sole B2) fills her gauge faster than the chain completes, so she CASTS her
//       burst ~10× over 180s while the team completes only ~5 Full Bursts — 5 of her swap windows have NO Full
//       Burst. swapGate fires the 6.04 debuff in those non-FB swap windows; fbGate (requires inFb) fires nothing
//       there. Nearest-wrong (a): UNGATED shotFired → fires on every takina shot all fight (outside the swap
//       windows + far more often). (b): fbGate:'inFb' (the shipped encoding) → every application lands inside an
//       FB window; swapGate produces applications OUTSIDE every FB window (the non-FB swap windows).
//
// Fixture: Takina is Burst II, so a custom sole-B2 comp [liter(B1) / takina(B2,SR Iron) / helm(B3,SR Water)] is
// used (NOT controlComp, which fields crown as a second B2 and would steal takina's casts). Takina is the SOLE
// Burst II and is camera-focused (×2.5 burst gauge on her charge SR) → she fills her gauge faster than the
// B1/B3 chain completes, casting ~10× while the team completes ~5 Full Bursts (casts > fbs is EXPECTED here, and
// is exactly what makes the T8 swapGate-vs-fbGate discrimination observable). Her burstCast frame strictly
// precedes each fullBurstStart, which strictly precedes each fullBurstEnd. Boss Fire (takina Iron is neutral vs
// Fire — clean: no element major confounds the true-damage assertions). Focus takina. Deterministic (no seed).
// Slot order: liter 0 / takina 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const TAKINA = 1; // slot index in the fixture
const ALL_SLOTS = [0, 1, 2];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIXTURE = {
  slugs: ['liter', 'takina', 'helm'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'takina',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...FIXTURE, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** takina-caster buffApply events (ally/self buffs carry casterIdx===TAKINA). */
const tkBuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === TAKINA &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
/** Boss-held debuffs emit casterIdx===null AND targetIdx===null; read by stat+value (key carries the caster slot). */
const bossDebuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.targetIdx === null &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1),
  );
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame)),
  ),
];
const takinaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'takina',
  );
const castFrames = (evs: SimEvent[]) => takinaBursts(evs).map((e) => e.frame);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
/** Full-Burst windows [startFrame, endFrame]. */
function fbWindows(evs: SimEvent[]): [number, number][] {
  const s = fbStartFrames(evs);
  const e = fbEndFrames(evs);
  return s.map((sf, i) => [sf, e[i]]);
}
const takinaDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'takina');
/** [burstCast, +10s] swap windows — the window the swapGate('swapped') gate reads. */
function castWindows(evs: SimEvent[]): [number, number][] {
  return takinaBursts(evs).map((c) => [c.frame, c.frame + 10 * FPS]);
}
const inWindow = (frame: number, wins: [number, number][]) =>
  wins.some(([s, e]) => frame >= s && frame <= e);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
const eff = (b: any, stat: string) =>
  b.effects.find((e: any) => e.stat === stat);

// T2 nearest-wrong (trigger): the FB-END ATK line keyed to fullBurstEnter (FB-START frames).
const cfS1AtkFbEnter = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnd');
  if (!b)
    throw new Error('takina S1 fullBurstEnd block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
// T2 nearest-wrong (target): self → allies (hit all 3 slots, not just takina).
const cfS1AtkAllies = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnd');
  if (!b)
    throw new Error('takina S1 fullBurstEnd block missing — fixture is stale');
  b.target = { kind: 'allies' };
});
// T3 nearest-wrong (trigger): the FB-enter True Damage line keyed to burstCast (takina's CAST frames).
const cfS1TrueBurstCast = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
  if (!b)
    throw new Error(
      'takina S1 fullBurstEnter block missing — fixture is stale',
    );
  b.trigger = { kind: 'burstCast' };
});
// T3 nearest-wrong (duration): 15s → 5s.
const cfS1TrueDur5 = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
  if (!b)
    throw new Error(
      'takina S1 fullBurstEnter block missing — fixture is stale',
    );
  eff(b, 'trueDamagePct').durationSec = 5;
});
// T4 nearest-wrong (value): the enemy debuff at the RAW prose magnitude 10.09 (no uptime-average).
const cfS2TakenRaw = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct'),
  );
  if (!b)
    throw new Error(
      'takina S2 enemy damageTaken block missing — fixture is stale',
    );
  eff(b, 'damageTakenPct').value = 10.09;
});
// T4 nearest-wrong (target): enemy → allies (buff the team instead of debuffing the boss).
const cfS2TakenAllies = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct'),
  );
  if (!b)
    throw new Error(
      'takina S2 enemy damageTaken block missing — fixture is stale',
    );
  b.target = { kind: 'allies' };
});
// T5 nearest-wrong (value): the ally True Damage buff at the RAW prose magnitude 140.49 (no uptime-average).
const cfS2TrueRaw = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'trueDamagePct'),
  );
  if (!b)
    throw new Error(
      'takina S2 ally trueDamage block missing — fixture is stale',
    );
  eff(b, 'trueDamagePct').value = 140.49;
});
// T5 nearest-wrong (target): allies → enemy.
const cfS2TrueEnemy = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'trueDamagePct'),
  );
  if (!b)
    throw new Error(
      'takina S2 ally trueDamage block missing — fixture is stale',
    );
  b.target = { kind: 'enemy' };
});
// T7 nearest-wrong (swap): the burst weaponSwap removed → no 200.64 swap shots.
const cfNoSwap = withPatchedOverride('takina', (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap'),
  );
  if (ov.burst.length === before)
    throw new Error('takina burst weaponSwap block missing — fixture is stale');
});
// T7 nearest-wrong (flavor): trueNormals:true → false (swap shots lose the true flavor → lose trueDamagePct).
const cfNoTrueNormals = withPatchedOverride('takina', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap'),
  );
  if (!b)
    throw new Error('takina burst weaponSwap block missing — fixture is stale');
  b.effects.find((e: any) => e.kind === 'weaponSwap').trueNormals = false;
});
// T8 nearest-wrong (gate, UNGATED): strip the gate from the 6.04 shotFired debuff → fires on every takina shot.
const cfDebuffUngated = withPatchedOverride('takina', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct' && e.value === 6.04),
  );
  if (!b)
    throw new Error(
      'takina burst 6.04 debuff block missing — fixture is stale',
    );
  delete b.fbGate;
  delete b.swapGate;
});
// T8 nearest-wrong (gate, fbGate — the SHIPPED encoding the FIX replaces): swapGate → fbGate:'inFb'.
const cfDebuffFbGate = withPatchedOverride('takina', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct' && e.value === 6.04),
  );
  if (!b)
    throw new Error(
      'takina burst 6.04 debuff block missing — fixture is stale',
    );
  delete b.swapGate;
  b.fbGate = 'inFb';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1AtkFbEnter = run({ takina: cfS1AtkFbEnter });
const s1AtkAllies = run({ takina: cfS1AtkAllies });
const s1TrueBurstCast = run({ takina: cfS1TrueBurstCast });
const s1TrueDur5 = run({ takina: cfS1TrueDur5 });
const s2TakenRaw = run({ takina: cfS2TakenRaw });
const s2TakenAllies = run({ takina: cfS2TakenAllies });
const s2TrueRaw = run({ takina: cfS2TrueRaw });
const s2TrueEnemy = run({ takina: cfS2TrueEnemy });
const noSwap = run({ takina: cfNoSwap });
const noTrueNormals = run({ takina: cfNoTrueNormals });
const debuffUngated = run({ takina: cfDebuffUngated });
const debuffFbGate = run({ takina: cfDebuffFbGate });

const casts = takinaBursts(base.events).length;
const fbs = fbStartFrames(base.events).length;
const castWins = castWindows(base.events);
const fbWins = fbWindows(base.events);

describe('takina — kit spec', () => {
  describe('fixture sanity — Takina casts her burst and the team reaches Full Burst', () => {
    it('Takina casts >0 bursts and the team completes >0 Full Bursts (focused sole-B2: she casts MORE often than the chain completes)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // focused SR B2 fills her gauge faster than the B1/B3 chain completes → casts >= fbs, and at least one
      // of her swap windows has NO Full Burst (the asymmetry the T8 swapGate-vs-fbGate discrimination reads).
      expect(casts).toBeGreaterThanOrEqual(fbs);
      expect(casts).toBeGreaterThan(fbs);
    });
    it('trigger identity is frame-discriminable: burstCast < fullBurstStart < fullBurstEnd', () => {
      const cf = castFrames(base.events);
      const fs = fbStartFrames(base.events);
      const fe = fbEndFrames(base.events);
      expect(cf.every((f) => !fs.includes(f) && !fe.includes(f))).toBe(true);
      expect(Math.min(...cf)).toBeLessThan(Math.min(...fs));
      expect(Math.min(...fs)).toBeLessThan(Math.min(...fe));
    });
  });

  describe('T1 — S1 battle-start ATK activation is UNMODELED (no battleStart trigger)', () => {
    it('PIN: NO atkPct 80.04 application at frame 0 — the first 80.04 lands at the first FB-END, not at spawn', () => {
      const atk = tkBuff(base.events, 'atkPct', 80.04);
      expect(atk.length).toBeGreaterThan(0);
      expect(atk.every((b) => b.frame > 0)).toBe(true);
      expect(Math.min(...atk.map((b) => b.frame))).toBe(
        Math.min(...fbEndFrames(base.events)),
      );
    });
  });

  describe('T2 — S1 FB-end → self ATK ▲80.04% for 5 sec (fullBurstEnd)', () => {
    const atk = tkBuff(base.events, 'atkPct', 80.04);
    it('fires on fullBurstEnd frames, target self only, 5s duration', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(targetsOf(atk)).toEqual([TAKINA]);
      expect(dursOf(atk)).toEqual([5 * FPS]);
      const fe = fbEndFrames(base.events);
      const fs = fbStartFrames(base.events);
      expect(atk.every((b) => fe.includes(b.frame))).toBe(true);
      expect(atk.every((b) => !fs.includes(b.frame))).toBe(true);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) lands on FB-START frames, not FB-END frames', () => {
      const cf = tkBuff(s1AtkFbEnter.events, 'atkPct', 80.04);
      expect(cf.length).toBeGreaterThan(0);
      expect(
        cf.every((b) => fbStartFrames(s1AtkFbEnter.events).includes(b.frame)),
      ).toBe(true);
    });
    it('DISCRIMINATING (target): allies (nearest-wrong) hits all 3 slots, not just takina', () => {
      expect(targetsOf(tkBuff(s1AtkAllies.events, 'atkPct', 80.04))).toEqual(
        ALL_SLOTS,
      );
    });
  });

  describe('T3 — S1 FB-enter → self True Damage ▲35.05% for 15 sec (fullBurstEnter)', () => {
    const td = tkBuff(base.events, 'trueDamagePct', 35.05);
    it('fires on fullBurstStart frames, target self only, 15s duration', () => {
      expect(td.length).toBeGreaterThan(0);
      expect(targetsOf(td)).toEqual([TAKINA]);
      expect(dursOf(td)).toEqual([15 * FPS]);
      expect(
        td.every((b) => fbStartFrames(base.events).includes(b.frame)),
      ).toBe(true);
    });
    it('DISCRIMINATING (trigger): burstCast (nearest-wrong) lands on takina CAST frames, before FB-start', () => {
      const cf = tkBuff(s1TrueBurstCast.events, 'trueDamagePct', 35.05);
      expect(cf.length).toBeGreaterThan(0);
      expect(
        cf.every((b) => castFrames(s1TrueBurstCast.events).includes(b.frame)),
      ).toBe(true);
      expect(
        cf.every(
          (b) => !fbStartFrames(s1TrueBurstCast.events).includes(b.frame),
        ),
      ).toBe(true);
    });
    it('DISCRIMINATING (duration): 5s (nearest-wrong) is not the prose 15s', () => {
      expect(dursOf(tkBuff(s1TrueDur5.events, 'trueDamagePct', 35.05))).toEqual(
        [5 * FPS],
      );
    });
  });

  describe('T4 — S2 all enemies: Damage Taken ▲10.09%/5s ⇒ uptime-average damageTakenPct 3.36 (passive permanent ⚑)', () => {
    const taken = bossDebuff(base.events, 'damageTakenPct', 3.36);
    it('is a permanent (no expiry) frame-0 debuff on the BOSS (targetIdx null), value 3.36', () => {
      expect(taken.length).toBeGreaterThan(0);
      expect(taken.every((b) => b.value === 3.36 && b.targetIdx === null)).toBe(
        true,
      );
      expect(dursOf(taken)).toEqual([null]);
      expect(Math.min(...taken.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (value): the raw prose 10.09 (nearest-wrong, no uptime-average) is NOT the faithful encoding', () => {
      expect(bossDebuff(s2TakenRaw.events, 'damageTakenPct', 3.36).length).toBe(
        0,
      );
      expect(
        bossDebuff(s2TakenRaw.events, 'damageTakenPct', 10.09).length,
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (target): allies (nearest-wrong) buffs the team (casterIdx takina, all slots), not the boss', () => {
      const cf = tkBuff(s2TakenAllies.events, 'damageTakenPct', 3.36);
      expect(targetsOf(cf)).toEqual(ALL_SLOTS);
      expect(
        bossDebuff(s2TakenAllies.events, 'damageTakenPct', 3.36).length,
      ).toBe(0);
    });
  });

  describe('T5 — S2 all allies: True Damage ▲140.49%/10s ⇒ uptime-average trueDamagePct 93.66 (passive permanent ⚑)', () => {
    const td = tkBuff(base.events, 'trueDamagePct', 93.66);
    it('is a permanent (no expiry) frame-0 buff on ALL allies (incl. takina), value 93.66', () => {
      expect(td.length).toBeGreaterThan(0);
      expect(td.every((b) => b.value === 93.66)).toBe(true);
      expect(targetsOf(td)).toEqual(ALL_SLOTS);
      expect(dursOf(td)).toEqual([null]);
      expect(Math.min(...td.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (value): the raw prose 140.49 (nearest-wrong, no uptime-average) is NOT the faithful encoding', () => {
      expect(tkBuff(s2TrueRaw.events, 'trueDamagePct', 93.66).length).toBe(0);
      expect(
        tkBuff(s2TrueRaw.events, 'trueDamagePct', 140.49).length,
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (target): enemy (nearest-wrong) removes the ally buff (no trueDamagePct 93.66 on any ally)', () => {
      // trueDamagePct is a self/ally Damage-Up stat — retargeting it to `enemy` strips the team buff entirely
      expect(tkBuff(s2TrueEnemy.events, 'trueDamagePct', 93.66).length).toBe(0);
    });
  });

  describe('T6 — S2 "Stuns for 2 sec" is UNMODELED (boss-inert)', () => {
    it("PIN: takina's skill2-keyed buffs emit EXACTLY {damageTakenPct, trueDamagePct} and NO stun/CC effect", () => {
      const s2Stats = new Set(
        buffs(base.events)
          .filter((b) => b.key.startsWith(`${TAKINA}:skill2:`))
          .map((b) => b.stat),
      );
      expect([...s2Stats].sort()).toEqual(['damageTakenPct', 'trueDamagePct']);
    });
  });

  describe('T7 — Burst self weaponSwap 200.64% final ATK, 10s; normals deal TRUE damage (trueNormals)', () => {
    const swapShots = (evs: SimEvent[]) =>
      takinaDamage(evs).filter((d) => d.atkPct === 200.64);
    const swapDmgUp = (evs: SimEvent[]) =>
      swapShots(evs).map((d) => d.mult.dmgUp);
    it('the swap shots fire (atkPct 200.64 exists) and are removed with the swap block', () => {
      expect(swapShots(base.events).length).toBeGreaterThan(0);
      expect(swapShots(noSwap.events).length).toBe(0);
    });
    it('the swap shots are TRUE-flavored: trueDamagePct (flavor-gated) rides their Damage-Up bucket', () => {
      // faithful swap shots carry the trueDamagePct buffs (T3 35.05 + T5 93.66) in dmgUp
      expect(Math.min(...swapDmgUp(base.events))).toBeGreaterThan(1.9); // ≥ +93.66% trueDamagePct alone
    });
    it('DISCRIMINATING (flavor): trueNormals:false (nearest-wrong) strips trueDamagePct → strictly lower swap dmgUp', () => {
      expect(swapShots(noTrueNormals.events).length).toBeGreaterThan(0);
      // every faithful swap shot outruns every flavor-stripped swap shot (the trueDamagePct contribution)
      expect(Math.min(...swapDmgUp(base.events))).toBeGreaterThan(
        Math.max(...swapDmgUp(noTrueNormals.events)),
      );
    });
  });

  describe('T8 — Burst "targets hit: Damage Taken ▲6.04%/5s" = shotFired boss debuff, swapGate(swapped) [FIX]', () => {
    const debuff = bossDebuff(base.events, 'damageTakenPct', 6.04);
    it('every 6.04 application lands inside a [burstCast, +10s] swap window (swapGate, not ungated)', () => {
      expect(debuff.length).toBeGreaterThan(0);
      expect(debuff.every((b) => b.targetIdx === null)).toBe(true); // the boss
      expect(dursOf(debuff)).toEqual([5 * FPS]);
      expect(debuff.every((b) => inWindow(b.frame, castWins))).toBe(true);
    });
    it('DISCRIMINATING (gate vs UNGATED): ungated fires outside the swap windows + far more often', () => {
      const cf = bossDebuff(debuffUngated.events, 'damageTakenPct', 6.04);
      expect(
        cf.some((b) => !inWindow(b.frame, castWindows(debuffUngated.events))),
      ).toBe(true);
      expect(cf.length).toBeGreaterThan(debuff.length);
    });
    it('DISCRIMINATING (gate vs fbGate — THE FIX): swapGate fires in non-FB swap windows that fbGate (requires inFb) cannot', () => {
      // faithful swapGate: a 6.04 application exists OUTSIDE every Full Burst window (a swap window with no FB)
      expect(debuff.some((b) => !inWindow(b.frame, fbWins))).toBe(true);
      // fbGate (shipped): EVERY 6.04 application lands inside a Full Burst window (none outside)
      const cf = bossDebuff(debuffFbGate.events, 'damageTakenPct', 6.04);
      expect(cf.length).toBeGreaterThan(0);
      expect(
        cf.every((b) => inWindow(b.frame, fbWindows(debuffFbGate.events))),
      ).toBe(true);
    });
  });
});
```

## 8. S2d independent verification matrix (scripts/kit-autonomy/reviews/takina.verify.txt)
```
S2d INDEPENDENT VERIFICATION GATE — takina (2026-07-24)
Method: `npx vitest run scripts/tests/units/takina.test.ts` against (i) the unmodified SHIPPED override
and (ii) each named counterfactual (withPatchedOverride). 22 tests.

Fixture: liter(B1) / takina(B2,SR Iron) / helm(B3,SR Water), boss Fire, focus takina.
Measured cadence: takina casts 10x, team completes 5 Full Bursts (focused sole-B2 fills gauge faster than
the chain completes -> 5 non-FB swap windows; this is what makes the T8 swapGate-vs-fbGate gate observable).

--- (i) vs SHIPPED override (fbGate:'inFb' on the burst 6.04 debuff) ---
FAITHFUL pins (expect GREEN):
  T1 battle-start ATK UNMODELED (no frame-0 80.04; first at first FB-end) ......... GREEN
  T2 FB-end ATK 80.04 self 5s (fullBurstEnd frames) ............................... GREEN
  T3 FB-enter TrueDmg 35.05 self 15s (fullBurstStart frames) ...................... GREEN
  T4 enemy damageTakenPct 3.36 boss permanent (uptime-average) .................... GREEN
  T5 ally trueDamagePct 93.66 all-allies permanent (uptime-average) ............... GREEN
  T6 skill2 emits exactly {damageTakenPct, trueDamagePct} (stUN UNMODELED) ........ GREEN
  T7 weaponSwap 200.64 swap shots exist + true-flavored (trueDamagePct in dmgUp) .. GREEN
  T8 PIN every 6.04 application in a [cast,+10s] swap window ...................... GREEN (fbGate windows ⊆ cast windows here)
FIX line (expect RED vs shipped — to be greened in S3):
  T8 swapGate fires in non-FB swap windows fbGate cannot .......................... RED  <-- the FIX (fbGate->swapGate)

--- (ii) each named counterfactual (expect RED = the assertion discriminates) ---
  T2 trigger fullBurstEnter -> lands on FB-START not FB-END frames ................ RED (discriminated)
  T2 target allies -> hits all 3 slots not just takina ............................ RED (discriminated)
  T3 trigger burstCast -> lands on cast frames before FB-start .................... RED (discriminated)
  T3 duration 5s -> not the prose 15s ............................................. RED (discriminated)
  T4 value 10.09 (raw, no uptime-average) -> 3.36 absent, 10.09 present .......... RED (discriminated)
  T4 target allies -> buffs team not boss ......................................... RED (discriminated)
  T5 value 140.49 (raw) -> 93.66 absent, 140.49 present .......................... RED (discriminated)
  T5 target enemy -> ally buff removed ............................................ RED (discriminated)
  T7 weaponSwap removed -> no 200.64 shots ........................................ RED (discriminated)
  T7 trueNormals:false -> swap dmgUp strictly lower (loses trueDamagePct) ......... RED (discriminated)
  T8 ungated -> fires outside swap windows + more often ........................... RED (discriminated)
  T8 fbGate (shipped) -> no application outside FB windows (vs swapGate which has)  RED (discriminated)

VERDICT: no test is GREEN under both shipped and its counterfactual (none vacuous). Every FAITHFUL pin is
GREEN vs shipped; every counterfactual is RED; the single FIX line (T8 swapGate) is RED vs shipped and is
greened in S3 by changing the burst 6.04 debuff gate fbGate:'inFb' -> swapGate:'swapped'.
```

## 9. Driver's reconciliation summary (for the judge to grade, not to trust)
- **Convergent (cross-family):** skill1 ATK 80.04 (FB-end self 5s; battle-start UNMODELED), skill1 TrueDmg 35.05
  (FB-enter self 15s — fable + opus both land fullBurstEnter, NOT burstCast), skill2 stun UNMODELED (boss-inert),
  burst weaponSwap 200.64 (burstCast self 10s), burst 6.04 debuff (shotFired + **swapGate:'swapped'** — independently
  derived by BOTH fable S2b and opus S6; the driver's fbGate→swapGate FIX is cross-family corroborated).
- **Documented ⚑ divergence (skill2 mechanism):** driver = uptime-average permanents (3.36/93.66, 15s Prydwen);
  blind = interval pulse (fable 15s / opus 20s, full values + durations). Behavior-equivalent steady-states; driver
  better-sourced + fight-validated. DOCUMENTED-GAP/FIDELITY, not a REAL-GOTCHA.
- **Redaction artifact (trueNormals):** both blind agents flagged the true-damage conversion as a GAP/no-primitive
  because the trueNormals schema line (naming Takina) was stripped; the primitive exists, driver encodes
  trueNormals:true. RECON_ERROR (forced by the mandatory redaction). opus's S6 override under-models takina as a
  result (drops the true flavor).
- **Engine fidelity ⚑ (not an override gotcha):** true swap normals crit in the engine (sim.ts:2842 crit:true; §2c
  carve-out covers riders only). Flagged for owner spot-check; engine change is broad-blast-radius, not made here.
- **Blind harness artifacts (S5):** `o.blocks` no-op (suite skips), controlComp B2-contention fixture, `u.total`
  misread — none is an override divergence.

## 10. ⚑ flags the driver recorded (estimate + recipe + tier — all in the override caveats)
1. **skill2 15s cooldown (COMMUNITY ⚑, trigger-cadence):** the skill2 prose gives NO trigger/cooldown; Prydwen lists a 15s pulse. The uptime-average values (damageTakenPct 3.36 = 10.09×5/15; trueDamagePct 93.66 = 140.49×10/15) depend on it. Estimate: 15s cooldown, 5s/10s durations. Recipe: read the real skill2 cooldown + pulse shape from a focused Takina recording; rescale value×uptime/CD. The interval-pulse encoding (fable 15s / opus 20s, full values + durations) is the behavior-equivalent alternative. Tier: COMMUNITY (Prydwen) — CALIBRATED ⚑.
2. **swap-shot economy (kit-silent ⚑, ALWAYS-⚑ #3):** cadence/charge/ammo of the swapped 200.64% weapon are kit-silent; estimated optimistically by the engine's swap model. No Full Charge line → no chargeMultPct. Recipe: count normal-attack popups inside the 10s burst window → derive shots/sec + magazine. Tier: CALIBRATED ⚑.
3. **true swap normals crit (ENGINE-fidelity ⚑):** sim.ts:2842 hardcodes crit:true for swap normals; the §2c "true damage cannot crit" carve-out (owner 2026-07-21) is plumbed only for riders (RIDER_CRIT), not swap normals. Measured: takina's 200.64% swap shots are critEligible. Board impact unmeasured. This is an ENGINE question (broad blast radius — chisato/laplace share the path), flagged for owner spot-check, NOT an override encoding and NOT changed here. Tier: engine-fidelity ⚑.

## 11. Verdict instructions
Grade the driver's IMPLEMENTATION (the override in §3 + the test in §7) against the ground-truth prose (§1) and the formula/mechanics SSOT (§2), using the S2b pre-op review (§4), the S5 blind test (§5), and the S6 blind override (§6) as two independent cross-family re-derivations. Do NOT trust the driver's self-report — grade the artifacts.

Convergence is MECHANICAL: the S5 blind tests run UNMODIFIED vs the driver's shipped override gave a SUITE ERROR (16 tests, all 16 SKIPPED — the `o.blocks is not iterable` harness artifact thrown at beforeAll setup; plus the controlComp B2-contention fixture and the `u.total`/`totalDamage` misread would confound it). Classify this as a documented blind harness artifact, NOT an override divergence. The blind SPEC table (§5) + the S6 blind override (§6) are the fixture-independent convergence signals.

Per kit line classify FAITHFUL / DOCUMENTED-GAP / REAL-GOTCHA{SILENT_DROP,ENGINE/FIDELITY,ENCODING} / RECON_ERROR. Run the fire-rate "modeled≠working" check (each FAITHFUL block fires at the prose-implied cadence over 180s — the burst blocks fire on takina's ~10 casts; the skill1 FB-end/FB-enter blocks fire per Full Burst; the skill2 passives fire at frame 0 and persist). Check discrimination (§8 matrix — no vacuous test; the T8 FIX line is RED vs the shipped fbGate and GREEN vs swapGate). Magnitudes are owner/measurement-gated and OUT OF SCOPE except where they contradict the prose's own number.

The driver-vs-blind divergences to adjudicate: (1) **skill2 mechanism** — driver uptime-average permanents (3.36/93.66, 15s Prydwen ⚑) vs blind interval-pulse (fable 15s / opus 20s, full 10.09/140.49 + durations); behavior-equivalent steady-states, driver better-sourced + fight-validated — DOCUMENTED-GAP/FIDELITY or REAL-GOTCHA? (2) **trueNormals** — driver encodes trueNormals:true (the prose "normal attacks deal true damage"); both blind agents flagged it as a GAP/no-primitive because the trueNormals schema line (naming Takina) was REDACTED from their packets — RECON_ERROR forced by the mandatory redaction, or a real gap? (opus's S6 override drops the true flavor and under-models takina.) (3) **swapGate FIX** — driver changed the burst 6.04 debuff fbGate:'inFb' → swapGate:'swapped'; both fable S2b and opus S6 independently derived swapGate:'swapped' — corroborated FAITHFUL fix, or encoding error? (4) **battle-start ATK** — driver UNMODELED (no battleStart trigger; passive ignores durationSec → over-credits) vs opus S6 passive+durationSec (opus itself flagged the over-credit risk). (5) **true-swap-crit** — engine fidelity ⚑ (not an override encoding).

Return ONLY this JSON (tight, structured — not an essay):
{
  "slug": "takina",
  "kitDescription": "<plain-English 3-6 sentences: what the kit DOES in game terms>",
  "convergence": {
    "s2b_fable_preop": { "model": "claude-fable-5", "leakDetected": null, "result": "<convergence summary>" },
    "s5_blind_tests": { "model": "claude-opus-4-8", "leakDetected": null, "specConvergence": "<...>", "testRun": "<suite error / 16 skipped + classification>" },
    "s6_blind_override": { "model": "claude-opus-4-8", "leakDetected": null, "result": "<convergence summary + divergences adjudicated>" },
    "overall": "<CONVERGENT|... one line>"
  },
  "lineFindings": [ { "slot": "skill1|skill2|burst", "kitLine": "<≤40 chars>", "disposition": "FAITHFUL|UNMODELED|GAP", "classification": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR", "tier": "MEASURED|DATAMINED|COMMUNITY|CALIBRATED", "note": "<...>" } ],
  "gotchas": [ { "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING", "slot": "...", "summary": "...", "evidence": "...", "documentedByDriver": true, "severity": "high|med|low", "suggestedFix": "<faithful rep or 'needs measurement' + recipe — NEVER a fudge>" } ],
  "discriminationOk": true,
  "discriminationNote": "<the §8 matrix + fire-rate check result>",
  "faithfulnessScore": <0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>,
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
`gotchas` is [] if there are no REAL-GOTCHAs. `suggestedFix` is a faithful representation or a flagged measurement, NEVER a number chosen to hit the board. The verdict is BINDING.
