# S7 JUDGE PACKET — `velvet` (compact, answer-faithful compilation of the gauntlet artifacts)

Read this file ONCE, then return the JSON verdict. Do NOT read any other file. You grade ARTIFACTS vs
ground truth (the real kit text + the damage-formula/mechanics SSOT below + two independent blind re-derivations).
You do NOT trust the driver's self-report. Magnitudes are owner/measurement-gated and OUT OF SCOPE — do not
flag a magnitude unless it contradicts the prose's own number.

## 1. Ground truth — kit prose (data/characters.json → characters.velvet.skills, structural)

Base: SR / Wind / Supporter / Burst II, cd 20s, ammo 6, reloadFrames 141, chargeFrames 60, chargeMultiplier 250,
hitsPerShot 1, normalAttackMultiplier 69.04, coreAttackMultiplier 200, critRate 15, critDamage 150, Tetra.

- **S1** ■ Activates at the start of battle and when entering Burst Stage 2. (Bullet Snatch)
  - Effect 1: Affects all enemies. Removes 5% of ammo.
  - Effect 2: Affects self. Fills the ammo pouch with 6000 round(s), up to a maximum of 6000. Continuous, cannot be removed.
  - ■ Activates when attacking with Full Charge while NOT in Full Burst. Affects self.
  - Effect 1: Expends ammo from the ammo pouch. Amount: 100 round(s).
  - Effect 2: ATK ▲ 30.5% for 3 sec. / Effect 3: Attack Damage ▲ 30.5% for 3 sec.
- **S2** ■ Activates when attacking with Full Charge during Full Burst.
  - Effect 1: Affects self. Expends ammo from the ammo pouch. Amount: 300 round(s).
  - Effect 2: Affects all allies. ATK ▲ 25.2% of the skill user's ATK for 3 sec continuously.
  - Effect 3: Affects all allies. Charge Damage ▲ 100.8% for 3 sec.
  - ■ Activates after landing 50 normal attack(s) during Full Burst.
  - Effect 1: Affects self. Expends ammo from the ammo pouch. Amount: 300 round(s).
  - Effect 2: Affects self. Attack Damage ▲ 15.03% for 5 sec.
  - Effect 3: Affects the target. Deals 400.92% of final ATK as additional damage.
- **Burst** ■ Affects self. Changes the weapon in use:
  - Damage: 7% of final ATK. Duration: 10 sec.
  - Additional Effect: Attack Damage ▲ 34.52% for 10 sec.

## 2. Damage-formula + mechanics SSOT (the facts the verdict turns on)

Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket × taken × distributed.
**casterAtkPct vs atkPct:** "ATK ▲ x% of the skill user's ATK" = `casterAtkPct` — a FLAT add resolving to
(value/100)×caster.staticAtk at apply time (feeds the flat-ATK path; the buffApply `value` is the resolved flat
ATK, e.g. ~25133 for Velvet, NOT 25.2). `atkPct` instead scales each TARGET's own ATK by x%. Velvet's S2 says
"25.2% of the skill user's ATK" → casterAtkPct (flat add of Velvet's ATK to every ally), not atkPct.
**chargeDamagePct vs chargeDamageMultPct:** "Charge Damage ▲ x%" = `chargeDamagePct` — ADDITIVE percentage points
in the charge bucket. `chargeDamageMultPct` scales BASE charge damage (a different, stronger math). Velvet's S2
says "Charge Damage ▲ 100.8%" → additive chargeDamagePct.
**fbGate (inFb/outFb):** a block gate checked WHEN the trigger fires; 'inFb' blocks only activate during Full
Burst, 'outFb' only outside it. The schema's canonical outFb example is Velvet's S1 ("Full Charge while not in
Full Burst"). Velvet's S1 self-buff = shotFired + outFb; her S2 team buff = shotFired + inFb.
**shotFired as "Full Charge" proxy:** TriggerDef has NO distinct "fullCharge" kind. For an SR in auto-play every
trigger pull IS a full charge (chargeFrames 60, chargeMultiplier 250), so `shotFired` is the faithful proxy for
"attacking with Full Charge"; the in-FB / out-of-FB distinction is carried by fbGate, not the trigger kind.
**hitCount(count, countInFb):** fires every `count` CUMULATIVE hits (fight-wide); `countInFb` overrides the
threshold DURING FB. fbGate gates FIRE-TIME only — it does NOT restrict which hits accrue to the counter. So
"after landing 50 normal attacks during Full Burst" encoded as hitCount:50 + fbGate:inFb counts ALL cumulative
hits toward 50 but only FIRES the proc if the 50th lands inside FB. True FB-only counting / per-FB reset is NOT
expressible — a documented fidelity hypothesis (both readings converge on 0 procs for an SR in a 180s fight: an
SR lands ~10 hits per FB window, so 50 in-FB hits is unreachable; the cumulative 50th hit lands OUT of FB and the
fbGate suppresses it).
**weaponSwap:** "Changes the weapon in use" — a temporary weapon override; `damagePct` is the per-shot multiplier
WHILE SWAPPED and the swap REPLACES the base weapon (Velvet's swap shots fire at 7% of final ATK instead of her
69.04 SR normal). durationSec is the hard time bound. The swap weapon's cadence/ammo/weapon-class are kit-silent
(ALWAYS-⚑ #3) — the engine fires a default swap cadence (~10 shots/10s); a precise unflagged pullsPerSec would be
auto-suspect.
**flatDamage:** an instant hit, % of caster final ATK; bucket 'skill'; "additional damage" with no core/crit/range
clause stated → no core eligibility, lands by timing inside FB (so the +50% FB major applies if in FB).
**consumeAmmo / no enemy entity:** `consumeAmmo` empties the TARGET's magazine by a fraction (forces a reload if it
drops to 0). The sim has NO enemy entity — resolveTargets({kind:'enemy'}) returns [] — so "removes 5% of ammo
from all enemies" is inert in v1 (and a sign-flip onto ALLIES would force ally reloads = the nearest-wrong).
**resource / resourceGate (the ammo pouch):** named resource pools tracked live; `resource` adjusts the pool,
`resourceGate` gates a block on the pool balance. The DRIVER dropped the pouch bookkeeping as derivably
NEVER-BINDING (max drain per 20s rotation ≈ 7 outFb×100 + 7 inFb×300 + ≤1 proc×300 ≈ 3.1k « 6000 cap, refilled to
cap at every Burst-Stage-2 entry) → every ammo-gated effect fires at full uptime, so modeling the pool is
damage-neutral. The S6 blind modeled it explicitly with gates AND flagged (⚑ #1) that if the fill is "continuous
and cannot be removed" the gates are cosmetic and should be deleted — i.e. the blind's own flag converges on the
driver's drop.
**Gates available:** fbGate(inFb/outFb), swapGate, requiresTargetStatus (ENEMY status only), requiresCore, everyN,
resourceGate, formation/teamHas.

## 3. Driver's override (src/skills/overrides/velvet.json, structural)

{
"note": "Kit-autonomy gauntlet 2026-07-24 (cross-family: S2b claude-fable-5, S5/S6/S7 claude-opus-4-8; GO — STRUCTURE certified faithful, magnitudes remain hand-validated vs the T5 wind-weak recording; residual owner spot-check = hitCount:50 cumulative-vs-in-FB counting + weaponSwap shot cadence, see scripts/kit-autonomy/manual-review/velvet.md). Hand-verified vs a real scope-lock run (wind-weak probe comp; the earlier draft read 1.94 hot). Ammo pouch: refills to 6000 at battle start and on every Burst Stage 2 entry (team rotation state), and per-rotation spend (100/shot outside FB, 300/shot in FB, 300 per proc) stays well under 6000, so pouch bookkeeping is dropped — every ammo-gated effect fires at full uptime. The pouch-fill / enemy bullet-steal block of S1 is resource/defensive (skipped). CORRECTION vs draft: S1's self ATK 30.5% + Attack Damage 30.5% (3s, refreshed per full-charge shot) is text-gated 'while NOT in Full Burst' — the draft ignored the gate, keeping it up through FB windows (72% uptime, where the +50% FB multiplier lives). Now fbGate:outFb (hard cutoff; in-game ~3s of carryover into each FB is lost, slight undercount). S2's team buff (ATK 25.2% of caster + Charge Damage 100.8%, 3s per full-charge shot DURING full burst) is shotFired + fbGate:inFb, continuous while she fires in FB. S2's '50 normal attacks during Full Burst' proc (400.92% + self Attack Damage 15.03%/5s): draft used hitCount 100 as an uptime fudge; now the real count 50 with fbGate:inFb (an SR lands ~10 hits per FB window, so it procs rarely — kept for fidelity). Burst slot left to parser (weaponSwap 7%/shot + Attack Damage 34.52%/10s); the swap's true fire rate is not in the text. OPEN: if the pouch refill required HER OWN stage-2 cast, a never-bursting Velvet would run dry in ~2 rotations and lose all skill buffs — revisit if she still reads hot. CHARFIX: real SR fire cycle = 1.0s charge + ~0.5s bolt recovery -> chargeFrames 90 (the DB records charge only for some SRs; liberalio's DB value is already 90); validated velvet 1.50->1.05 (wind-weak T5 probe). Q8 UPDATE: charFixes removed — the universal SR bolt-recovery rule (60f charge + 30f recovery) reproduces the validated 90-frame cycle. [materialized 2026-07-16: burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified]",
"unmodeled": {
"skill1": [
"Bullet Snatch (battle start + Burst Stage 2): removes 5% ammo from all enemies; fills own ammo pouch to 6,000 rounds.",
"Full Charge attack while not in Full Burst: expends 100 ammo from the ammo pouch."
],
"skill2": [
"Full Charge attack during Full Burst: expends 300 ammo from the ammo pouch.",
"Landing 50 normal attacks during Full Burst: expends 300 ammo from the ammo pouch."
],
"burst": [
"Additional Effect (weapon-change spec — VERBATIM TEXT NOT AVAILABLE to this audit; fetch from blablalink: likely carries the swap weapon's charge time / ammo / Full Charge Damage spec that pins the swap shot economy)"
]
},
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "shotFired"
},
"target": {
"kind": "self"
},
"fbGate": "outFb",
"effects": [
{
"kind": "buff",
"stat": "atkPct",
"value": 30.5,
"durationSec": 3
},
{
"kind": "buff",
"stat": "attackDamagePct",
"value": 30.5,
"durationSec": 3
}
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "shotFired"
},
"target": {
"kind": "allies"
},
"fbGate": "inFb",
"effects": [
{
"kind": "buff",
"stat": "casterAtkPct",
"value": 25.2,
"durationSec": 3
},
{
"kind": "buff",
"stat": "chargeDamagePct",
"value": 100.8,
"durationSec": 3
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 50
},
"target": {
"kind": "enemy"
},
"fbGate": "inFb",
"effects": [
{
"kind": "flatDamage",
"atkPct": 400.92
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 50
},
"target": {
"kind": "self"
},
"fbGate": "inFb",
"effects": [
{
"kind": "buff",
"stat": "attackDamagePct",
"value": 15.03,
"durationSec": 5
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
"damagePct": 7,
"durationSec": 10
},
{
"kind": "buff",
"stat": "attackDamagePct",
"value": 34.52,
"durationSec": 10
}
]
}
],
"caveats": [
"skill2: team buff (ATK 25.2% of caster + Charge Damage 100.8%) is kept alive by SWAPPED shots during her own 10s burst weapon-swap — kit requires a Full Charge attack; unverified whether the swap weapon full-charges (needs footage).",
"burst: swap shot economy is a materialized parser estimate, not hand-verified — engine fires ~10 swapped shots/10s (60f cycle, no bolt gap) each carrying her SR charge-damage bucket on top of the 7% multiplier."
]
}

## 4. S2b pre-op adversarial review (claude-fable-5, cross-family) — leakDetected null

{
"slug": "velvet",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "■ start of battle / entering Burst Stage 2",
"disposition": "UNMODELED",
"scope": "resource bookkeeping (ammo pouch), not a damage stat",
"durationSemantics": "permanent pool, refilled to 6000 cap on each trigger ('continuous and cannot be removed')",
"triggerIdentity": "battle-start + stageEnter:2 (ANY stage-2 burst cast, not her own burstCast — 'entering Burst Stage 2' is the team rotation event)",
"targetSet": "self (pouch); Effect 1 targets all enemies",
"nearestWrongModel": "treating the pouch as a binding gate worth simulating dynamically, or keying the refill to her own burstCast so the pool 'runs dry' on rotations crown takes B2",
"distinguishingAssertion": "DERIVATION, not sim: max drain per 20s rotation ≈ 7 outFB charges×100 + 7 inFB charges×300 + ≤1 hitCount proc×300 ≈ 3.1k < 6000, refilled every stage-2 entry → pool NEVER binds. If the driver modeled a resource, assert every resourceGate evaluation passes (zero blocked activations across a full control run); if unmodeled, assert identical buff uptimes to a resource-modeled patch",
"inertness": "pouch modeling choice must move ZERO damage on any comp — it is derivably never-binding",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "skill1",
"kitLine": "Affects all enemies. Removes 5% of ammo",
"disposition": "UNMODELED",
"scope": "enemy ammo economy — the sim boss has no ammo/magazine",
"durationSemantics": "instant",
"triggerIdentity": "same header (battle start + stage-2 enter)",
"targetSet": "all enemies (resolveTargets enemy → [] in this engine)",
"nearestWrongModel": "encoding it as consumeAmmo on ALLIES (sign/target flip) — would force ally reloads and CUT team damage",
"distinguishingAssertion": "zero reload/consumeAmmo events on any ally slot attributable to velvet; teammates' shot counts identical with velvet's S1 block active vs stripped",
"inertness": "must not move any ally's ammo economy or the board",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "skill1",
"kitLine": "Full Charge while not in Full Burst: ATK ▲30.5%",
"disposition": "FAITHFUL",
"scope": "generic ATK, self only",
"durationSemantics": "durationSec 3 (true seconds; no round language)",
"triggerIdentity": "per full-charge shot fired, fbGate:'outFb' (the schema's own canonical outFb example). Repeating — refreshes on every out-of-FB charge shot, giving near-continuous uptime outside FB with a short gap across the 141f reload",
"targetSet": "self",
"nearestWrongModel": "dropping the outFb gate (buff also refreshes on in-FB charges, stacking with the S2 self path all fight) or one-shot 'passive' 100% uptime",
"distinguishingAssertion": "buffApply atkPct=30.5 targeting velvet occurs ONLY with inFullBurst=false at the sourcing shot; every FB window contains zero fresh applications, and uptime dips ~0.3-1.4s during the reload+recharge seam (a passive encoding shows no dip; an ungated one shows in-FB applies)",
"inertness": "self-only — no buffApply of this stat on any other slot; must not fire during FB",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill1",
"kitLine": "Attack Damage ▲30.5% for 3 sec (same block)",
"disposition": "FAITHFUL",
"scope": "attackDamagePct (Damage Up bucket) — NOT a second ATK line",
"durationSemantics": "durationSec 3",
"triggerIdentity": "same full-charge outFb block",
"targetSet": "self",
"nearestWrongModel": "collapsing both 30.5s into a single doubled atkPct 61%, or bucketing Attack Damage as chargeDamagePct because the trigger is a charge shot",
"distinguishingAssertion": "damage events from velvet's out-of-FB charge shots carry BOTH a 1.305 ATK-side factor and an additive 30.5 in the Damage-Up bucket (bucket field on the damage event) — the two multiply (~1.70×), they don't add to 1.61",
"inertness": "must not inflate the charge bucket or any ally's Damage Up",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "allies: ATK ▲25.2% of the skill user's ATK",
"disposition": "FAITHFUL",
"scope": "casterAtkPct — flat add of 25.2% of VELVET's ATK, not a 25.2% scaler on each ally's own ATK",
"durationSemantics": "durationSec 3 ('continuously' = maintained by re-trigger, not permanent)",
"triggerIdentity": "per full-charge shot, fbGate:'inFb' ('with Full Charge DURING Full Burst')",
"targetSet": "all allies INCLUDING self (no 'except self' clause)",
"nearestWrongModel": "stat=atkPct (scales the carry's much larger ATK → big over-credit), or trigger=fullBurstEnter one-shot (wrong uptime shape and fires even in FBs where she cannot full-charge)",
"distinguishingAssertion": "buffApply events with stat casterAtkPct value 25.2 land on ALL 5 slots, sourced from velvet in-FB charge shots only; carry's damage delta from this line equals a FLAT add pinned to velvet's ATK (patch velvet's ATK ×2 via withPatchedOverride-adjacent control → ally gain doubles; under atkPct it would be invariant). CRITICAL: in FBs entered off VELVET'S OWN burst this block must fire ZERO times — her swap weapon (7%/shot) has no full charge, so only crown-cast (non-velvet-burst) FBs proc it",
"inertness": "zero applications outside FB; zero applications during her own swap windows",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "allies: Charge Damage ▲100.8% for 3 sec",
"disposition": "FAITHFUL",
"scope": "chargeDamagePct — additive points in the charge bucket, allies incl. self",
"durationSemantics": "durationSec 3, refreshed per in-FB full charge",
"triggerIdentity": "same inFb full-charge block",
"targetSet": "all allies including self",
"nearestWrongModel": "chargeDamageMultPct (base-charge multiplier — different, stronger math) or granting it out-of-FB where it would ride her own permanent charge uptime",
"distinguishingAssertion": "a charging teammate's charge-bucket contribution rises by +100.8 additive points only inside 3s windows trailing velvet's in-FB charge shots; velvet's own out-of-FB charge damage is UNCHANGED by this line (only S1's 30.5s apply there)",
"inertness": "no effect on non-charge damage (normals/riders); nothing outside FB",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "after landing 50 normal attack(s) during FB",
"disposition": "FIX",
"scope": "counter counts velvet's landed normal-attack ROUNDS during Full Burst only (SR hitsPerShot 1; swap shots ARE normal attacks and dominate the count)",
"durationSemantics": "self Attack Damage ▲15.03% durationSec 5 on proc",
"triggerIdentity": "hitCount:50 with in-FB counting — NOT a plain cumulative hitCount:50 with an fbGate slapped on fire-time (that counts out-of-FB SR rounds toward the threshold). ⚑ whether the count resets at FB end is a convention — pin from footage if it matters",
"targetSet": "self (buff) / enemy (rider)",
"nearestWrongModel": "ungated cumulative hitCount:50 — velvet's out-of-FB SR shots (~0.7/s) accrue the counter so procs fire in fights where she NEVER bursts; faithfully, ~8 SR rounds per non-velvet FB can never reach 50, so the line is reachable ONLY inside her own 10s swap windows at the ⚑ swap cadence (needs ≥5 shots/s to proc even once)",
"distinguishingAssertion": "in a comp where velvet never casts her burst (crown holds B2), assert ZERO 400.92 flatDamage events all fight even though her cumulative hit total far exceeds 50; in a velvet-bursting run, procs appear only inside her swap windows, count consistent with the ⚑ swap fire rate",
"inertness": "no procs from out-of-FB firing; no procs in never-bursts comps",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "Deals 400.92% of final ATK as additional dmg",
"disposition": "FAITHFUL",
"scope": "flatDamage 400.92, % of velvet's final ATK snapshotted at proc (rides her live 34.52+15.03 Damage-Up and swap-window ATK state)",
"durationSemantics": "instant per proc",
"triggerIdentity": "same hitCount-in-FB block",
"targetSet": "the target (enemy)",
"nearestWrongModel": "granting core eligibility or the +30% range bonus to the rider, or exempting it from FB (it lands DURING FB by timing → +50% applies; it is not burst-cast damage)",
"distinguishingAssertion": "each 400.92 damage event shows crit at caster sheet rate, core=0, rangeApplied=false, fbMajorApplied=true (proc timing is inside FB by construction)",
"inertness": "count is bounded by pouch-independent trigger math (pool never gates it); zero events when the hitCount never trips",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Changes the weapon: 7% of final ATK, 10 sec",
"disposition": "FIX",
"scope": "weaponSwap damagePct 7, durationSec 10 — replaces her SR (no charging while swapped)",
"durationSemantics": "hard 10s time bound, no maxShots stated",
"triggerIdentity": "burstCast (her own Burst-II cast only)",
"targetSet": "self",
"nearestWrongModel": "modeling the swap as an additive buff on top of continuing SR charge shots (she'd keep proccing S2's charge block during her own FBs — over-credit on the ally buffs AND her charge damage), or silently inventing a precise fire rate",
"distinguishingAssertion": "during each 10s swap window: velvet emits many low-mult (7%) shot events, ZERO charge-bucket damage, and ZERO S1/S2 full-charge buffApply events sourced from her. ⚑ ALWAYS-⚑ #3: swap cadence/ammo/weapon-class are kit-silent — the tuple MUST ship flagged with an optimistic estimate + popup-read recipe; the 7%/shot magnitude with a ~50-hit threshold implies ≥~5 shots/s as a consistency floor, not a measurement",
"inertness": "swap must not run on crown-cast rotations; base SR economy resumes at window end",
"evidenceTier": "CALIBRATED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Attack Damage ▲ 34.52% for 10 sec",
"disposition": "FAITHFUL",
"scope": "attackDamagePct, self only, applies to swap shots and the 400.92 rider inside the window",
"durationSemantics": "durationSec 10, co-terminous with the swap",
"triggerIdentity": "burstCast — a self mode inside her OWN burst block; NOT fullBurstEnter",
"targetSet": "self",
"nearestWrongModel": "fullBurstEnter keying — fires on EVERY team FB including crown-cast rotations where velvet never burst (the canonical burst-cast/FB-enter over-credit; diverges precisely because another Burst-II unit shares the team)",
"distinguishingAssertion": "buffApply attackDamagePct=34.52 on velvet appears only in rotations whose burstCast event names HER slot; rotations where crown's burstCast fires show zero such applications",
"inertness": "no application on non-velvet-burst rotations; never targets allies",
"evidenceTier": "DATAMINED",
"loadBearing": true
}
],
"loadBearingSet": [
"skill1:fullCharge-outFb ATK▲30.5 (3s)",
"skill1:fullCharge-outFb AttackDamage▲30.5 (3s)",
"skill2:fullCharge-inFb casterAtkPct 25.2 → all allies",
"skill2:fullCharge-inFb chargeDamagePct 100.8 → all allies",
"skill2:hitCount50-inFb AttackDamage▲15.03 (5s)",
"skill2:hitCount50-inFb flatDamage 400.92",
"burst:weaponSwap 7%/10s (⚑ cadence)",
"burst:attackDamagePct 34.52 (burstCast, 10s)"
],
"unmodeledVerbatim": {
"skill1": [
"Effect 1: Affects all enemies. Removes 5% of ammo.",
"Effect 2: Affects self. Fills the ammo pouch with 6000 round(s), up to a maximum of 6000. This effect is continuous and cannot be removed.",
"Effect 1: Expends ammo from the ammo pouch. Amount: 100 round(s)."
],
"skill2": [
"Effect 1: Affects self. Expends ammo from the ammo pouch. Amount: 300 round(s). (both blocks)"
],
"burst": []
},
"notes": "Expected shared-prior misreads to hunt: (1) THE BIG ONE — S2's ally buffs (casterAtkPct 25.2 + chargeDamage 100.8) CANNOT fire during full bursts entered off velvet's own burst, because her swap weapon (7%/shot, no charge time stated) replaces the SR and never full-charges; they fire only in crown-cast FBs where she keeps her SR. A driver who lets the swap coexist with SR charging, or keys the ally buffs to fullBurstEnter, over-credits every velvet-burst rotation. (2) hitCount:50 must count in-FB rounds only — a cumulative counter with a fire-time fbGate reaches 50 off out-of-FB SR shots and procs the 400.92 rider in comps where velvet never bursts; faithfully those comps see ZERO procs (~8 SR rounds per 10s FB can never reach 50). (3) casterAtkPct vs atkPct on the 25.2 — flat add of the SUPPORTER's ATK, verifiable by scaling velvet's ATK and checking the ally delta scales while carry-ATK scaling leaves it fixed. (4) burstCast vs fullBurstEnter on the 34.52 self buff — diverges because crown is a second Burst-II. (5) The 6000-round pouch is derivably NEVER-binding (max ~3.1k drain per 20s rotation vs refill-to-cap at every stage-2 entry) — model-or-omit must be damage-neutral; a driver who spent effort making the pool gate anything, or keyed the refill to her own burstCast so it could run dry, encoded a mechanic the arithmetic forbids. (6) Swap cadence/ammo is the one ALWAYS-⚑: no fire-rate appears in the prose; a precise unflagged pullsPerSec is auto-suspect. All stated magnitudes/durations are literal kit text (seconds throughout — no round-count durations anywhere in this kit).",
"model": "claude-fable-5"
}

## 5. S5 blind post-op test-writer (claude-opus-4-8, cross-family) — leakDetected null (spec + fixtures + gaps)

{
"slug": "velvet",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "Start/BS2: fill 6000 pouch; -5% enemy ammo",
"disposition": "GAP",
"assertion": "it.skip — resource-pool init has no direct-damage observable; enemy ammo removal is inert (no enemy entity). Only matters as a depletion gate, which is unasserted."
},
{
"slot": "skill1",
"kitLine": "FullCharge !FB: self ATK+AtkDmg 30.5%/3s",
"disposition": "FAITHFUL",
"assertion": "buffApply atkPct=30.5 AND attackDamagePct=30.5 casterIdx=velvet, every targetIdx=velvet; teammate totals byte-identical when removed. Fails nearest-wrong: allies-scope (teammates would move) and drop-the-block (buff vanishes)."
},
{
"slot": "skill2",
"kitLine": "FullCharge inFB: allies +25.2% casterATK",
"disposition": "FAITHFUL",
"assertion": "buffApply casterAtkPct=25.2 exists AND atkPct=25.2 does NOT — discriminates '25.2% of skill-user ATK' (flat caster-scaled) from atkPct (target's own ATK)."
},
{
"slot": "skill2",
"kitLine": "FullCharge inFB: allies ChargeDmg 100.8%",
"disposition": "FAITHFUL",
"assertion": "buffApply chargeDamagePct=100.8 to >1 ally slot AND chargeDamageMultPct=100.8 absent (additive pts, not base-scaled mult); removing it moves teammate totals (proves ally-scope)."
},
{
"slot": "skill2",
"kitLine": "50 normals inFB: self AtkDmg 15.03%/5s",
"disposition": "FIX",
"assertion": "self attackDamagePct=15.03 fires iff FB normal-count>=50 (conditional non-vacuity). Payload: if driver counts ALL normals (not FB-only) it over-fires when fbNormals<50 -> the else-branch RED flags the divergence."
},
{
"slot": "skill2",
"kitLine": "50 normals inFB: 400.92% add'l damage",
"disposition": "FIX",
"assertion": "removing the flatDamage(400.92)+15.03 block never increases velvet total (monotone) and drops the buff. Rider disposition (noFb/noRange/no-core) is a FLAG, not magnitude-asserted."
},
{
"slot": "burst",
"kitLine": "self AtkDmg 34.52%/10s (own burst)",
"disposition": "FAITHFUL",
"assertion": "buffApply attackDamagePct=34.52 self on burst-cast (also the velvet-casts non-vacuity proxy); removing the swap block removes it. Nearest-wrong: keyed off velvet's burst, not any team FB."
},
{
"slot": "burst",
"kitLine": "weapon swap 7%/shot, 10s",
"disposition": "FAITHFUL",
"assertion": "velvet shot count differs vs a no-swap counterfactual — proves the swap changes weapon cadence/ammo (base SR 69.04/shot -> 7% swap weapon). Cadence itself is a FLAG (kit-silent)."
}
],
"fixtures": "controlComp('velvet', true): liter B1 / crown B2 / velvet(carry, actually B2) / helm B3, Fire boss, focus velvet. Velvet is Burst II so the carry slot holds a B2 and the FB chain is liter -> one B2 -> helm; the non-vacuity block asserts a fullBurstStart occurs AND velvet's burst-only 34.52% self-buff appears (proves velvet — not crown — was the B2 that cast), otherwise every in-FB (S2a) and burst (Bst) assertion would be silently vacuous. helm kept (true) — it is the B3 that completes the chain here, so it cannot be dropped.",
"gaps": [
"S1a (start-of-battle / BS2 ammo-pouch fill of 6000 rounds + 'remove 5% of enemy ammo'): it.skip — resource init has no queryable damage observable, and the enemy ammo removal is inert (resolveTargets({enemy}) is empty in v1).",
"Ammo-pouch depletion & whether the expend-ammo effects (S1b -100, S2a -300, S2b -300) are hard-gated on pool balance: NOT asserted — modeling-uncertain; would need a resourceGate + a fight long enough to drain 6000 between BS2 refills.",
"S2b '50 normal attacks during Full Burst' trigger encoding (hitCount vs per-FB reset; FB-only vs cumulative counting) and the 400.92% rider's noFb/noRange/core flags: FLAGGED — asserted only via the fires-iff-fbNormals>=50 conditional + a monotone counterfactual, not by exact magnitude.",
"Burst weapon-swap cadence (pulls/s of the 7% weapon): FLAGGED — kit-silent and datamine-unreliable; tested only as 'shot count changes vs no-swap', never as a specific value."
]
}

### 5b. CONVERGENCE — S5 blind tests run against the driver's shipped override

The blind test as written had mechanical artifacts of blindness (it never saw the override or the repo's test
conventions): (a) harness import path (blind/ has no ../lib/harness); (b) its counterfactual helpers iterated
`o.blocks`, but the real OverrideFile uses `skill1`/`skill2`/`burst` slot arrays (the filter removed nothing);
(c) `unitOf(res,slug).total` → the real field is `.totalDamage`; (d) `e.srcSlot === vIdx` but srcSlot is a string
slot-name, not a numeric index (→ `e.slug === 'velvet'`). With ONLY those mechanical corrections applied
(assertions UNCHANGED) and run in a viable fixture (below):
**Result: 12 passed / 12 total — FULL CONVERGENCE on every load-bearing assertion.**

- PASSED (all load-bearing): fixture non-vacuity (FB>0 AND velvet's 34.52 self-buff present → velvet cast);
  S1b self ATK 30.5 + Attack Damage 30.5 (both present, self-scoped, teammate totals byte-identical when removed);
  S2a casterAtkPct present + atkPct@25.2 ABSENT (caster-scaled, not target-scaled); S2a chargeDamagePct 100.8
  present + chargeDamageMultPct@100.8 ABSENT (additive, not base-mult); S2a reaches >1 ally slot + removing it
  moves teammate damage (ally-scoped); S2b 15.03 fires-iff-fbNormals>=50 conditional (0 in fixture → expects 0) +
  monotone counterfactual; Bst 34.52 self-buff present + swap changes velvet's shot economy vs no-swap.
- DOCUMENTED BLIND FIXTURE ARTIFACT (classify, NOT a faithfulness divergence): the blind chose controlComp('velvet',
  true) = [liter B1 / crown B2 / velvet B2 / helm B3]. Crown is ALSO Burst II and out-prioritizes velvet for the B2
  cast — measured: crown casts 10×, velvet casts 0× in that comp, so the blind's non-vacuity guard + burst
  assertions are VACUOUS there (velvet never bursts). This is a fixture choice artifact (controlComp adds a
  competing B2), not a divergence in the driver's encoding. The convergence run above uses the viable sole-B2
  fixture [liter / velvet / helm] (velvet casts 10×, team FBs 5×) so the burst/FB assertions are actually
  exercised. The blind's SPEC table (the real signal) is fixture-independent and converges fully regardless.

## 6. S6 blind post-op override-writer (claude-opus-4-8, cross-family) — leakDetected null (override + audit + flags)

{
"slug": "velvet",
"resources": [
{
"name": "ammoPouch",
"initial": 6000,
"min": 0,
"max": 6000
}
],
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
"kind": "resource",
"name": "ammoPouch",
"delta": 6000
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "stageEnter",
"stage": 2
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "resource",
"name": "ammoPouch",
"delta": 6000
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "shotFired"
},
"fbGate": "outFb",
"resourceGate": {
"name": "ammoPouch",
"min": 100
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "atkPct",
"value": 30.5,
"durationSec": 3
},
{
"kind": "buff",
"stat": "attackDamagePct",
"value": 30.5,
"durationSec": 3
},
{
"kind": "resource",
"name": "ammoPouch",
"delta": -100
}
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "shotFired"
},
"fbGate": "inFb",
"resourceGate": {
"name": "ammoPouch",
"min": 300
},
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "buff",
"stat": "casterAtkPct",
"value": 25.2,
"durationSec": 3
},
{
"kind": "buff",
"stat": "chargeDamagePct",
"value": 100.8,
"durationSec": 3
},
{
"kind": "resource",
"name": "ammoPouch",
"delta": -300
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 50
},
"fbGate": "inFb",
"resourceGate": {
"name": "ammoPouch",
"min": 300
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "attackDamagePct",
"value": 15.03,
"durationSec": 5
},
{
"kind": "resource",
"name": "ammoPouch",
"delta": -300
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 50
},
"fbGate": "inFb",
"resourceGate": {
"name": "ammoPouch",
"min": 300
},
"target": {
"kind": "enemy"
},
"effects": [
{
"kind": "flatDamage",
"atkPct": 400.92
}
]
}
],
"burst": [
{
"slot": "burst",
"trigger": {
"kind": "burstCast",
"stage": 2
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "weaponSwap",
"damagePct": 7,
"durationSec": 10,
"pullsPerSec": 12
},
{
"kind": "buff",
"stat": "attackDamagePct",
"value": 34.52,
"durationSec": 10
}
]
}
],
"unmodeled": {
"skill1": [
"Bullet Snatch Effect 1: Affects all enemies. Removes 5% of ammo. (No enemy entity in the sim — resolveTargets({enemy}) is empty; inert. Recorded for completeness.)"
],
"skill2": [],
"burst": []
},
"caveats": [
"⚑ ammoPouch gating vs infinite-refill: skill1 says the fill is 'continuous and cannot be removed'. If that means the pouch is CONTINUOUSLY topped to 6000, every resourceGate/spend here is cosmetic and all buffs fire unconditionally — DELETE the gates. Modeled as a per-rotation refill pool (baseline). This decides whether skill2's charge buff / 50-hit proc can ever be ammo-starved.",
"⚑ swap-weapon economy: burst weaponSwap.pullsPerSec (=12 est), weapon-class, and maxAmmo are all kit-silent. The 7%/shot rapid weapon must fire fast enough to land 50 normals within the 10s FB and to keep skill2's charge buff refreshed.",
"⚑ 'Full Charge' identity of swap shots: skill2's ally-buff block triggers on 'attacking with Full Charge during FB'. Assumed the burst swap-weapon shots each count as a full charge (only way the charge buff and the 50-normal counter both fire in-FB). If false, skill2 block1 never triggers and the support value collapses.",
"⚑ 50-normals counting is 'during Full Burst' only; engine hitCount counts ALL hits. Out-of-FB base-SR shots should not count. Modeled with fbGate:'inFb' as a proxy (her only rapid fire is the in-FB swap weapon), but true FB-only counting is not expressible — verify proc frequency."
],
"note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Velvet (SR/Wind/Supporter/Burst II) is an ammo-pouch supporter: skill1 refills a 6000-round pouch at battle start + BS2 entry and self-buffs (ATK/Attack-Damage +30.5%, 3s) on each out-of-FB full charge; skill2 is the payload — on each in-FB full-charge shot it grants ALL allies ATK ▲25.2%-of-caster + Charge Damage ▲100.8% (3s, refreshed) for 300 pouch rounds, and after 50 in-FB normals deals 400.92% additional damage + self Attack-Damage ▲15.03%. Burst swaps to a rapid weapon (7%/shot, 10s) with self Attack-Damage ▲34.52%. Charge Damage ▲100.8% is the board-relevant headline for charge-based carries. Load-bearing unknowns are the pouch refill semantics (may be infinite → drop gates), swap fire rate/class, and whether swap shots register as full charges."
}

### 6b. S6 audit + flags

{
"audit": [
{
"slot": "skill1",
"kitLine": "Activates start of battle + enter BS2",
"status": "IMPLEMENTED",
"effectOrReason": "trigger split: passive (t0 refill) + stageEnter stage:2 (per-rotation refill)"
},
{
"slot": "skill1",
"kitLine": "All enemies: Removes 5% of ammo",
"status": "SKIPPED",
"effectOrReason": "No enemy entity in sim; recorded in unmodeled.skill1"
},
{
"slot": "skill1",
"kitLine": "Self: fill ammo pouch 6000, max 6000",
"status": "IMPLEMENTED",
"effectOrReason": "resource ammoPouch delta:+6000 (initial 6000, max 6000)"
},
{
"slot": "skill1",
"kitLine": "Full Charge while NOT in Full Burst",
"status": "IMPLEMENTED",
"effectOrReason": "trigger shotFired + fbGate:'outFb' (SR shot = full charge)"
},
{
"slot": "skill1",
"kitLine": "Expends 100 rounds",
"status": "IMPLEMENTED",
"effectOrReason": "resource ammoPouch delta:-100 + resourceGate min:100"
},
{
"slot": "skill1",
"kitLine": "ATK ▲ 30.5% for 3 sec (self)",
"status": "IMPLEMENTED",
"effectOrReason": "buff atkPct 30.5 durationSec:3"
},
{
"slot": "skill1",
"kitLine": "Attack Damage ▲ 30.5% 3 sec",
"status": "IMPLEMENTED",
"effectOrReason": "buff attackDamagePct 30.5 durationSec:3"
},
{
"slot": "skill2",
"kitLine": "Full Charge DURING Full Burst",
"status": "IMPLEMENTED",
"effectOrReason": "trigger shotFired + fbGate:'inFb' (swap shots assumed full-charge — ⚑)"
},
{
"slot": "skill2",
"kitLine": "Self: expends 300 rounds",
"status": "IMPLEMENTED",
"effectOrReason": "resource ammoPouch delta:-300 + resourceGate min:300"
},
{
"slot": "skill2",
"kitLine": "All allies ATK ▲25.2% of user ATK 3s",
"status": "IMPLEMENTED",
"effectOrReason": "buff casterAtkPct 25.2 durationSec:3, target allies"
},
{
"slot": "skill2",
"kitLine": "All allies Charge Damage ▲100.8% 3s",
"status": "IMPLEMENTED",
"effectOrReason": "buff chargeDamagePct 100.8 durationSec:3, target allies (headline)"
},
{
"slot": "skill2",
"kitLine": "After landing 50 normal attacks in FB",
"status": "IMPLEMENTED",
"effectOrReason": "trigger hitCount count:50 + fbGate:'inFb' (FB-only counting is proxy — ⚑)"
},
{
"slot": "skill2",
"kitLine": "Self: expends 300 rounds",
"status": "IMPLEMENTED",
"effectOrReason": "resource ammoPouch delta:-300 (in self block)"
},
{
"slot": "skill2",
"kitLine": "Self Attack Damage ▲15.03% 5s",
"status": "IMPLEMENTED",
"effectOrReason": "buff attackDamagePct 15.03 durationSec:5"
},
{
"slot": "skill2",
"kitLine": "Target: 400.92% of final ATK add'l dmg",
"status": "IMPLEMENTED",
"effectOrReason": "flatDamage atkPct 400.92, target enemy (FB by timing, no core/crit stated)"
},
{
"slot": "burst",
"kitLine": "Changes weapon: 7% final ATK, 10s",
"status": "IMPLEMENTED",
"effectOrReason": "weaponSwap damagePct:7 durationSec:10 (pullsPerSec/class/ammo ⚑)"
},
{
"slot": "burst",
"kitLine": "Attack Damage ▲ 34.52% for 10 sec",
"status": "IMPLEMENTED",
"effectOrReason": "buff attackDamagePct 34.52 durationSec:10, self"
}
],
"flags": [
{
"field": "resources.ammoPouch / all resourceGate+resource blocks",
"estimate": "Per-rotation pool: 6000, refilled at t0 + each BS2 entry, spent -100/-300 per proc",
"reasoning": "Kit says the fill is 'continuous and cannot be removed'. This may instead mean the pouch is CONTINUOUSLY auto-topped to 6000, in which case no proc is ever ammo-starved and the gates over-restrict (esp. the 50-hit proc and later charge-buff refreshes once >20 in-FB shots spend >6000).",
"recipe": "Watch a fight: does skill2's Charge-Damage buff ever lapse mid-FB, or does the 50-hit 400.92% proc fail to fire late in long FBs? If never starved → delete resources+gates, make all buffs unconditional."
},
{
"field": "burst[0].effects[0].weaponSwap.pullsPerSec / weapon / maxAmmo",
"estimate": "pullsPerSec 12 (SMG-like); weapon-class and maxAmmo unset",
"reasoning": "Datamine rate_of_fire is unreliable and the swap economy is kit-silent. 7%/shot implies a rapid weapon; it must fire fast enough to (a) land 50 normals inside the 10s FB and (b) refresh skill2's 3s charge buff. Class drives auto-core rate; maxAmmo/reload drives shot count.",
"recipe": "Datamine the burst swap shot_id (fire rate, magazine, class) OR count her shots per burst window in footage; set pullsPerSec/weapon/maxAmmo accordingly."
},
{
"field": "skill2[0].trigger (shotFired+fbGate:inFb) — 'Full Charge' identity of swap shots",
"estimate": "Swap-weapon shots each count as a Full Charge (so skill2 block1 fires during FB)",
"reasoning": "skill2's ally buff and the 50-normal counter both key off in-FB attacks. Velvet's base SR charges slowly; only the burst swap weapon can produce enough in-FB shots. Assumed the swap weapon fires full-charge shots. If it fires plain normals, block1 never triggers and Velvet's entire ally-support value disappears.",
"recipe": "Confirm in footage that ally Charge Damage / ATK buff icons apply during Velvet's own burst (i.e., her swap shots satisfy the 'Full Charge during FB' clause)."
},
{
"field": "skill2[1..2].trigger hitCount count:50 (FB-only counting)",
"estimate": "count:50 with fbGate:'inFb' as a proxy for 'during Full Burst' only",
"reasoning": "Engine hitCount counts ALL cumulative hits; the kit counts only normals landed during FB. Approximated by fbGate (her rapid fire is FB-only via the swap), but out-of-FB base-SR shots would still increment the raw counter — over-counting could pull the proc earlier than real.",
"recipe": "Measure how often the 400.92% add'l-damage popup appears (per-FB vs per-N-FBs); if the engine can't restrict counting to FB, adjust count to match observed cadence."
}
]
}

### 6c. S6 structural convergence vs the driver (driver summarizes; judge adjudicates)

The S6 blind, from prose alone, independently chose the SAME encoding as the driver on every load-bearing line:
casterAtkPct 25.2 (NOT atkPct) + chargeDamagePct 100.8 (NOT chargeDamageMultPct) on shotFired+inFb → all allies;
shotFired+outFb → self atkPct 30.5 + attackDamagePct 30.5 (two distinct stats); hitCount:50 + inFb → self
attackDamagePct 15.03/5s + enemy flatDamage 400.92; burstCast → self weaponSwap damagePct 7/10s + attackDamagePct
34.52/10s; S1 enemy-ammo-removal → unmodeled (no enemy entity). The blind's 4 ⚑ flags are EXACTLY the driver's
documented caveats + fable's two FIX flags: (1) pouch refill semantics (continuous-vs-per-rotation → blind itself
says delete the gates if continuous, converging on the driver's drop); (2) weaponSwap cadence/class/ammo kit-silent;
(3) "Full Charge" identity of swap shots (the team buff rides swap shots during Velvet's own burst — documented
caveat, measurement-gated); (4) hitCount cumulative-vs-FB-only counting. The ONLY structural difference is the blind
modeled the pouch as an explicit resource+gates while the driver dropped it as derivably never-binding — and the
blind's own ⚑ #1 acknowledges the drop is correct if the fill is continuous. No undocumented divergence.

## 7. Driver's test (scripts/tests/units/velvet.test.ts) — the gate (20 tests, all GREEN vs shipped)

// PER-UNIT KIT SPEC — `velvet` (Velvet, Supporter/SR/Wind, Burst II, cd 20s, ammo 6, chargeFrames 60,
// chargeMultiplier 250, hitsPerShot 1, normalMult 69.04 / coreMult 200).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (V1..V5), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.velvet.skills):
// S1 ■ start of battle / entering Burst Stage 2 — Bullet Snatch: removes 5% ammo from all enemies;
// fills own ammo pouch to 6000 (continuous, unremovable) (UNMODELED) [V1]
// ■ Full Charge while NOT in Full Burst → self: ATK ▲30.5% / Attack Damage ▲30.5% for 3 sec [V2]
// S2 ■ Full Charge DURING Full Burst → all allies: ATK ▲25.2% of caster's ATK / Charge Damage ▲100.8%
// for 3 sec continuously [V3]
// ■ after landing 50 normal attacks during Full Burst → self Attack Damage ▲15.03% / 5 sec +
// target 400.92% of final ATK additional damage [V4]
// BU ■ self: Changes the weapon in use (Damage 7% of final ATK, 10 sec) + Attack Damage ▲34.52% / 10s [V5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
// V1 Bullet Snatch is RESOURCE/DEFENSIVE bookkeeping. The ammo pouch is derivably NEVER-BINDING: max
// drain per 20s rotation ≈ 7 outFb charges×100 + 7 inFb charges×300 + ≤1 proc×300 ≈ 3.1k « 6000 cap,
// refilled to cap at every Burst-Stage-2 entry — so every ammo-gated effect fires at full uptime and
// the pouch + the enemy bullet-steal are a sanctioned UNMODELED skip (recorded verbatim), NOT a
// dynamic resource gate. PIN the absence: velvet emits ZERO maxAmmo buffs and forces ZERO ally reloads.
// Nearest-wrong (fable S2b): a sign-flipped consumeAmmo on ALLIES (the "removes 5% ammo" mis-targeted)
// — would force ally reloads and cut team damage. GREEN vs shipped (no such block → 0 ally reloads),
// RED vs the consumeAmmo-on-allies counterfactual (ally reload events appear).
// V2 "Full Charge while NOT in Full Burst" = shotFired + fbGate:'outFb' (the schema's canonical outFb
// example is Velvet). For an SR in auto-play every trigger pull IS a full charge, so shotFired is the
// faithful proxy for "Full Charge attack"; the outFb gate is the load-bearing clause. Two effects —
// atkPct 30.5 (ATK bucket) AND attackDamagePct 30.5 (Damage-Up bucket) — NOT a collapsed atkPct 61.
// Nearest-wrong (a): dropping the outFb gate (buff also refreshes on in-FB charges). Nearest-wrong (b):
// collapsing both 30.5s into one doubled atkPct. Both discriminated (gate: 0 in-FB applies; collapse:
// both distinct stats present at 30.5).
// V3 "Full Charge DURING Full Burst" = shotFired + fbGate:'inFb' → all allies. "ATK ▲25.2% of the skill
// user's ATK" = casterAtkPct — a FLAT add of 25.2% of VELVET's ATK (resolves to ~25133 at apply), NOT
// atkPct (a 25.2% scaler on each ally's own ATK). "Charge Damage ▲100.8%" = chargeDamagePct (additive
// points in the charge bucket), NOT chargeDamageMultPct (a base-charge multiplier). Nearest-wrong (a):
// dropping the inFb gate (team buff up outside FB). (b) stat=atkPct (scales the carry's larger ATK →
// big over-credit). (c) chargeDamageMultPct. All three discriminated. "All allies" INCLUDES velvet
// herself (no "except self" clause) — reaches slots 0,1,2. NOTE (documented caveat, not asserted): the
// team buff is kept alive by SWAPPED shots during velvet's own 10s burst weapon-swap — shotFired fires
// on swap shots; whether the swap weapon "full-charges" is measurement-gated (override caveats).
// V4 "after landing 50 normal attacks during Full Burst" = hitCount:50 + fbGate:'inFb' → self
// attackDamagePct 15.03/5s + target flatDamage 400.92. An SR lands ~10 hits per FB window, so 50 in-FB
// hits is unreachable in a 180s fight: the faithful encoding fires ZERO procs here (a non-vacuous
// ABSENCE — the counterfactuals below fire). Nearest-wrong (a): dropping the fbGate — the cumulative
// 50-hit threshold then crosses OUT of FB and procs (2 out-of-FB procs vs 0). Nearest-wrong (b): the
// draft's hitCount:100 fudge / a low threshold — lowering to 5 makes the proc fire 10× IN FB, each a
// 400.92% flatDamage (bucket skill) + a self 15.03% Attack Damage buff, proving the encoding WORKS when
// the threshold is reachable. ⚑ cumulative-vs-in-FB-only counting + FB-reset convention is a documented
// fidelity hypothesis (override note/caveats); both readings converge on 0 procs in this fixture.
// V5 Burst = burstCast → self weaponSwap (damagePct 7, 10s) + attackDamagePct 34.52 (10s). The swap
// REPLACES her SR: during each 10s burst window velvet fires low-mult swap shots at atkPct=7 (vs her
// 69.04 SR normal). "Additional Effect: Attack Damage ▲34.52% for 10 sec" = a self attackDamagePct buff
// on BURST CAST (pre-FB), 600f. Nearest-wrong (a): fullBurstEnter keying — fires on EVERY team FB (5×)
// including rotations a different B2 casts, not just velvet's own 10 casts. (b) duration ≠ 10s.
// (c) weaponSwap damagePct ≠ 7 (swap shots at the wrong multiplier). All discriminated. ⚑ the swap
// cadence/ammo/weapon-class are kit-silent (ALWAYS-⚑ #3) — a documented parser estimate (override
// caveats), not a fabricated precision.
//
// Fixture: Velvet is Burst II, so a custom sole-B2 comp [liter(B1) / velvet(B2) / helm(B3)] is used (NOT
// controlComp, which would add crown as a second B2 and steal half her casts). Velvet is the sole Burst II →
// she casts every Full Burst cycle (10 casts over 180s) while the team completes 5 Full Bursts — so burstCast
// (10) ≠ fullBurstEnter (5), which is what lets the V5 trigger-identity assertion discriminate by count. Boss
// Iron (Velvet is Wind → clean ×1.10 advantaged; liter/helm neutral — irrelevant, every assertion filters on
// casterIdx === VELVET). Focus Velvet. Deterministic (no seed). Slot order: liter 0 / velvet 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const VEL = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const FIXTURE = {
slugs: ['liter', 'velvet', 'helm'] as string[],
bossElement: 'Iron' as const,
focusSlug: 'velvet',
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
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const velBuffs = (evs: SimEvent[], stat: string, value?: number) =>
buffs(evs).filter(
(b) =>
b.casterIdx === VEL &&
b.stat === stat &&
(value === undefined || b.value === value),
);
const perTarget = (bs: BuffApply[], tgt: number) =>
bs.filter((b) => b.targetIdx === tgt);
const velBursts = (evs: SimEvent[]) =>
evs.filter(
(e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
e.kind === 'burstCast' && e.slug === 'velvet',
);
const fbStarts = (evs: SimEvent[]) =>
evs.filter((e) => e.kind === 'fullBurstStart');
const velDamage = (evs: SimEvent[]) =>
evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'velvet');

/** Full-burst windows [startFrame, endFrame] from the event stream. */
function fbWindows(evs: SimEvent[]): [number, number][] {
const wins: [number, number][] = [];
let start: number | null = null;
for (const e of evs) {
if (e.kind === 'fullBurstStart') start = e.frame;
if (e.kind === 'fullBurstEnd' && start != null) {
wins.push([start, e.frame]);
start = null;
}
}
return wins;
}
const countInFb = (bs: BuffApply[], wins: [number, number][]) =>
bs.filter((b) => wins.some(([a, z]) => b.frame >= a && b.frame <= z)).length;

/** The 400.92% additional-damage rider (V4 proc). */
const procHits = (evs: SimEvent[]) =>
velDamage(evs).filter((d) => d.srcSlot === 'skill2' && d.atkPct > 100);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** V1 inertness: strip Velvet's entire skill1 slot (the pouch + bullet-steal + self buff are all gone). _/
const cfNoSkill1 = withPatchedOverride('velvet', (ov: any) => {
ov.skill1 = [];
});
/_* V1 nearest-wrong: the "removes 5% ammo" sign-flipped onto ALLIES (consumeAmmo on the team). _/
const cfConsumeAllies = withPatchedOverride('velvet', (ov: any) => {
ov.skill1 = [
...ov.skill1,
{
slot: 'skill1',
trigger: { kind: 'shotFired' },
target: { kind: 'allies' },
effects: [{ kind: 'consumeAmmo', fraction: 0.05 }],
},
];
});
/_* The skill1 outFb self-buff block (V2 under test). _/
const isS1SelfBuff = (b: any) =>
b.trigger?.kind === 'shotFired' &&
b.fbGate === 'outFb' &&
b.effects?.some((e: any) => e.stat === 'atkPct' && e.value === 30.5);
/_* V2 nearest-wrong (gate): drop the outFb gate (buff also refreshes on in-FB charges). _/
const cfS1NoGate = withPatchedOverride('velvet', (ov: any) => {
let hit = 0;
for (const b of ov.skill1) if (isS1SelfBuff(b)) (delete b.fbGate, hit++);
if (!hit)
throw new Error(
'velvet S1 outFb self-buff block missing — fixture is stale',
);
});
/_* The skill2 inFb team-buff block (V3 under test). _/
const isS2TeamBuff = (b: any) =>
b.trigger?.kind === 'shotFired' &&
b.fbGate === 'inFb' &&
b.effects?.some((e: any) => e.stat === 'casterAtkPct');
/_* V3 nearest-wrong (gate): drop the inFb gate (team buff up outside FB). _/
const cfS2NoGate = withPatchedOverride('velvet', (ov: any) => {
let hit = 0;
for (const b of ov.skill2) if (isS2TeamBuff(b)) (delete b.fbGate, hit++);
if (!hit)
throw new Error(
'velvet S2 inFb team-buff block missing — fixture is stale',
);
});
/_* V3 nearest-wrong (stat): casterAtkPct → atkPct (a 25.2% scaler on each ally's OWN ATK). _/
const cfS2AtkPct = withPatchedOverride('velvet', (ov: any) => {
const b = ov.skill2.find((x: any) => isS2TeamBuff(x));
if (!b)
throw new Error(
'velvet S2 inFb team-buff block missing — fixture is stale',
);
b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});
/_* V3 nearest-wrong (stat): chargeDamagePct → chargeDamageMultPct (a base-charge multiplier). _/
const cfS2ChargeMult = withPatchedOverride('velvet', (ov: any) => {
const b = ov.skill2.find((x: any) => isS2TeamBuff(x));
if (!b)
throw new Error(
'velvet S2 inFb team-buff block missing — fixture is stale',
);
b.effects.find((e: any) => e.stat === 'chargeDamagePct').stat =
'chargeDamageMultPct';
});
/_* The skill2 hitCount proc blocks (V4 under test — the rider + the self buff share the trigger). _/
const isS2Proc = (b: any) => b.trigger?.kind === 'hitCount';
/_* V4 nearest-wrong (gate): drop the inFb gate — the 50-hit threshold crosses OUT of FB and procs. _/
const cfProcNoGate = withPatchedOverride('velvet', (ov: any) => {
let hit = 0;
for (const b of ov.skill2) if (isS2Proc(b)) (delete b.fbGate, hit++);
if (!hit)
throw new Error('velvet S2 hitCount proc block missing — fixture is stale');
});
/_* V4 nearest-wrong (threshold/effect): lower hitCount 50 → 5 so the proc fires in-FB (proves the encoding). _/
const cfProcCount5 = withPatchedOverride('velvet', (ov: any) => {
let hit = 0;
for (const b of ov.skill2) if (isS2Proc(b)) ((b.trigger.count = 5), hit++);
if (!hit)
throw new Error('velvet S2 hitCount proc block missing — fixture is stale');
});
/_* V5 nearest-wrong (trigger): burst attackDamage re-keyed burstCast → fullBurstEnter (5× not 10×). _/
const cfBurstFbEnter = withPatchedOverride('velvet', (ov: any) => {
const b = ov.burst.find((x: any) =>
x.effects?.some(
(e: any) => e.stat === 'attackDamagePct' && e.value === 34.52,
),
);
if (!b)
throw new Error(
'velvet burst attackDamage block missing — fixture is stale',
);
b.trigger = { kind: 'fullBurstEnter' };
});
/_* V5 nearest-wrong (duration): the 34.52% Attack Damage window shortened 10s → 3s. _/
const cfBurstDur3 = withPatchedOverride('velvet', (ov: any) => {
const b = ov.burst.find((x: any) =>
x.effects?.some(
(e: any) => e.stat === 'attackDamagePct' && e.value === 34.52,
),
);
if (!b)
throw new Error(
'velvet burst attackDamage block missing — fixture is stale',
);
b.effects.find(
(e: any) => e.stat === 'attackDamagePct' && e.value === 34.52,
).durationSec = 3;
});
/_* V5 nearest-wrong (swap mult): weaponSwap damagePct 7 → 70 (swap shots at the wrong multiplier). */
const cfSwap70 = withPatchedOverride('velvet', (ov: any) => {
const b = ov.burst.find((x: any) =>
x.effects?.some((e: any) => e.kind === 'weaponSwap'),
);
if (!b)
throw new Error('velvet burst weaponSwap block missing — fixture is stale');
b.effects.find((e: any) => e.kind === 'weaponSwap').damagePct = 70;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSkill1 = run({ velvet: cfNoSkill1 });
const consumeAllies = run({ velvet: cfConsumeAllies });
const s1NoGate = run({ velvet: cfS1NoGate });
const s2NoGate = run({ velvet: cfS2NoGate });
const s2AtkPct = run({ velvet: cfS2AtkPct });
const s2ChargeMult = run({ velvet: cfS2ChargeMult });
const procNoGate = run({ velvet: cfProcNoGate });
const procCount5 = run({ velvet: cfProcCount5 });
const burstFbEnter = run({ velvet: cfBurstFbEnter });
const burstDur3 = run({ velvet: cfBurstDur3 });
const swap70 = run({ velvet: cfSwap70 });

const casts = velBursts(base.events).length; // Velvet's burst casts (10)
const fbs = fbStarts(base.events).length; // team Full Bursts (5)
const wins = fbWindows(base.events);

describe('velvet — kit spec', () => {
describe('fixture sanity — Velvet casts her burst and the team reaches Full Burst', () => {
it('Velvet casts >0 bursts and the team completes >0 Full Bursts (burst/FB-gated lines are not vacuous)', () => {
expect(casts).toBeGreaterThan(0);
expect(fbs).toBeGreaterThan(0);
// sole-B2 comp: Velvet casts every cycle, so she casts at least as often as the team FBs
expect(casts).toBeGreaterThanOrEqual(fbs);
});
});

describe('V1 — S1 Bullet Snatch (pouch fill + enemy ammo removal) is UNMODELED and inert', () => {
it('PIN: Velvet emits ZERO maxAmmo buffs (the pouch is never modeled as a binding resource)', () => {
expect(
buffs(base.events).filter(
(b) =>
b.casterIdx === VEL &&
(b.stat === 'maxAmmoFlat' || b.stat === 'maxAmmoPct'),
).length,
).toBe(0);
});
it("PIN (inertness): stripping Velvet's whole skill1 leaves ALLY totals byte-identical (pouch never binds; bullet-steal moves nothing on the team)", () => {
const b = totals(base.res);
const n = totals(noSkill1.res);
expect(n.liter).toBe(b.liter);
expect(n.helm).toBe(b.helm);
});
it('DISCRIMINATING: a sign-flipped consumeAmmo on ALLIES (nearest-wrong) WOULD force extra ally reloads', () => {
const baseReloads = base.events.filter(
(e) => e.kind === 'reload' && e.slug !== 'velvet',
).length;
const cfReloads = consumeAllies.events.filter(
(e) => e.kind === 'reload' && e.slug !== 'velvet',
).length;
expect(cfReloads).toBeGreaterThan(baseReloads);
});
});

describe('V2 — S1 Full-Charge-outFb self ATK ▲30.5% + Attack Damage ▲30.5% for 3 sec (two distinct stats)', () => {
const atk = velBuffs(base.events, 'atkPct', 30.5);
const atkDmg = velBuffs(base.events, 'attackDamagePct', 30.5);
it('fires per out-of-FB charge shot on Velvet only, 3s refresh, and NEVER inside Full Burst (outFb gate)', () => {
expect(atk.length).toBeGreaterThan(0);
expect(atkDmg.length).toBeGreaterThan(0);
// self-only
expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([VEL]);
expect([...new Set(atkDmg.map((b) => b.targetIdx))]).toEqual([VEL]);
// 3-second wall-clock window, refreshed per shot
expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
3 * FPS,
]);
// outFb gate: ZERO applications land inside any Full Burst window
expect(countInFb(atk, wins)).toBe(0);
expect(countInFb(atkDmg, wins)).toBe(0);
});
it('DISCRIMINATING (gate): dropping outFb lets the buff refresh on in-FB charges (applications appear inside FB)', () => {
expect(
countInFb(
velBuffs(s1NoGate.events, 'atkPct', 30.5),
fbWindows(s1NoGate.events),
),
).toBeGreaterThan(0);
});
it('DISCRIMINATING (collapse): the two 30.5s are DISTINCT stats (atkPct + attackDamagePct), not a single atkPct 61', () => {
expect(velBuffs(base.events, 'atkPct', 61).length).toBe(0);
expect(atk.length).toBeGreaterThan(0);
expect(atkDmg.length).toBeGreaterThan(0);
});
});

describe('V3 — S2 Full-Charge-inFb team buff: casterAtkPct 25.2 (flat) + chargeDamagePct 100.8, all allies, 3s', () => {
const casterAtk = velBuffs(base.events, 'casterAtkPct');
const chargeDmg = velBuffs(base.events, 'chargeDamagePct', 100.8);
it("casterAtkPct is a FLAT add of Velvet's ATK (value >> a percentage), in FB only, reaching all three allies", () => {
expect(casterAtk.length).toBeGreaterThan(0);
// flat ATK add (≈25.2% of Velvet's ATK ≈ 25133), NOT a 25.2 percentage scaler
expect(casterAtk.every((b) => b.value > 1000)).toBe(true);
// inFb gate: every application lands inside a Full Burst window, none outside
expect(countInFb(casterAtk, wins)).toBe(casterAtk.length);
// all allies including self (slots 0,1,2)
for (const tgt of [0, 1, 2])
expect(perTarget(casterAtk, tgt).length).toBeGreaterThan(0);
});
it('chargeDamagePct 100.8 is the additive charge bucket, in FB only, reaching all three allies, 3s', () => {
expect(chargeDmg.length).toBeGreaterThan(0);
expect(countInFb(chargeDmg, wins)).toBe(chargeDmg.length);
expect([
...new Set(chargeDmg.map((b) => b.expiresFrame! - b.frame)),
]).toEqual([3 * FPS]);
for (const tgt of [0, 1, 2])
expect(perTarget(chargeDmg, tgt).length).toBeGreaterThan(0);
});
it('DISCRIMINATING (gate): dropping inFb lets the team buff apply OUTSIDE Full Burst', () => {
const cf = velBuffs(s2NoGate.events, 'casterAtkPct');
const cfWins = fbWindows(s2NoGate.events);
expect(cf.length - countInFb(cf, cfWins)).toBeGreaterThan(0);
});
it('DISCRIMINATING (stat): atkPct (nearest-wrong) reports a 25.2 percentage, not a flat ATK add', () => {
const cf = velBuffs(s2AtkPct.events, 'atkPct', 25.2);
expect(cf.length).toBeGreaterThan(0);
expect(cf.every((b) => b.value === 25.2)).toBe(true); // a scaler, value < 100
expect(velBuffs(s2AtkPct.events, 'casterAtkPct').length).toBe(0);
});
it('DISCRIMINATING (stat): chargeDamageMultPct (nearest-wrong) is a different stat than the additive chargeDamagePct', () => {
expect(
velBuffs(s2ChargeMult.events, 'chargeDamagePct', 100.8).length,
).toBe(0);
expect(
velBuffs(s2ChargeMult.events, 'chargeDamageMultPct', 100.8).length,
).toBeGreaterThan(0);
});
});

describe('V4 — S2 "50 normal attacks during FB" proc: self Attack Damage ▲15.03%/5s + target 400.92% flatDamage', () => {
it('PIN (absence): the faithful hitCount:50+inFb proc fires ZERO times in 180s (an SR cannot land 50 in-FB hits)', () => {
expect(procHits(base.events).length).toBe(0);
expect(velBuffs(base.events, 'attackDamagePct', 15.03).length).toBe(0);
});
it('DISCRIMINATING (gate): dropping inFb lets the cumulative 50-hit threshold proc OUT of FB', () => {
const hits = procHits(procNoGate.events);
expect(hits.length).toBeGreaterThan(0);
// those procs land OUTSIDE Full Burst (the gate is what suppresses them in the faithful encoding)
const ngWins = fbWindows(procNoGate.events);
expect(
hits.filter((d) =>
ngWins.some(([a, z]) => d.frame >= a && d.frame <= z),
).length,
).toBe(0);
});
it('DISCRIMINATING (threshold+effect): lowering the count to 5 makes the proc fire IN FB — 400.92 flatDamage + self 15.03 buff', () => {
const hits = procHits(procCount5.events);
expect(hits.length).toBeGreaterThan(0);
// each proc is 400.92% of final ATK (bucket skill), landing inside Full Burst
expect(hits.every((d) => d.atkPct === 400.92)).toBe(true);
const c5Wins = fbWindows(procCount5.events);
expect(
hits.filter((d) =>
c5Wins.some(([a, z]) => d.frame >= a && d.frame <= z),
).length,
).toBe(hits.length);
// the companion self Attack Damage ▲15.03% / 5s buff fires with each proc
const selfBuffs = velBuffs(procCount5.events, 'attackDamagePct', 15.03);
expect(selfBuffs.length).toBeGreaterThan(0);
expect([
...new Set(selfBuffs.map((b) => b.expiresFrame! - b.frame)),
]).toEqual([5 * FPS]);
});
});

describe('V5 — Burst: self weaponSwap (7% / 10s) + Attack Damage ▲34.52% for 10s, on BURST CAST', () => {
const applied = velBuffs(base.events, 'attackDamagePct', 34.52);
it('Attack Damage 34.52 is a self buff, once per Velvet cast, 10s (600f), on burstCast (not fullBurstEnter)', () => {
expect(applied.length).toBe(casts);
expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([VEL]);
expect([
...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
]).toEqual([10 * FPS]);
});
it('the weaponSwap REPLACES the SR: swap shots inside the burst window fire at atkPct=7 (vs 69.04 normals)', () => {
const burstFrames = velBursts(base.events).map((e) => e.frame);
const inSwap = (f: number) =>
burstFrames.some((bf) => f >= bf && f <= bf + 10 * FPS);
const normals = velDamage(base.events).filter(
(d) => d.srcSlot === 'normal',
);
const swapShots = normals.filter(
(d) => inSwap(d.frame) && d.atkPct === 7,
);
const baseShots = normals.filter((d) => !inSwap(d.frame));
expect(swapShots.length).toBeGreaterThan(0); // the swap weapon fires
expect(baseShots.every((d) => d.atkPct === 69.04)).toBe(true); // her SR normal mult outside the swap
});
it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires on every team FB (fbs), not every Velvet cast (casts)', () => {
expect(
velBuffs(burstFbEnter.events, 'attackDamagePct', 34.52).length,
).toBe(fbs);
expect(
velBuffs(burstFbEnter.events, 'attackDamagePct', 34.52).length,
).not.toBe(casts);
});
it('DISCRIMINATING (duration): a 3s window (nearest-wrong) is shorter than the faithful 10s', () => {
expect([
...new Set(
velBuffs(burstDur3.events, 'attackDamagePct', 34.52).map(
(b) => b.expiresFrame! - b.frame,
),
),
]).toEqual([3 * FPS]);
});
it('DISCRIMINATING (swap mult): damagePct 70 (nearest-wrong) puts swap shots at atkPct=70, not 7', () => {
const burstFrames = velBursts(swap70.events).map((e) => e.frame);
const inSwap = (f: number) =>
burstFrames.some((bf) => f >= bf && f <= bf + 10 * FPS);
const swap70Shots = velDamage(swap70.events).filter(
(d) => d.srcSlot === 'normal' && inSwap(d.frame) && d.atkPct === 70,
);
expect(swap70Shots.length).toBeGreaterThan(0);
expect(
velDamage(swap70.events).filter(
(d) => d.srcSlot === 'normal' && inSwap(d.frame) && d.atkPct === 7,
).length,
).toBe(0);
});
});
});

## 8. S2d independent verification matrix (driver) — gate PASSES

=== S2d INDEPENDENT VERIFICATION MATRIX — velvet (kit-autonomy gauntlet 2026-07-24) ===
Test file: scripts/tests/units/velvet.test.ts (driver-authored S2a; reconciled vs blind S2b claude-fable-5).
Gate: every FAITHFUL pin GREEN vs shipped; every DISCRIMINATING assertion provably differs from its
nearest-wrong counterfactual (no test green-under-both → none vacuous). No self-reported RED.
Fixture: [liter(B1) / velvet(B2) / helm(B3)], boss Iron (Wind ×1.10), focus velvet, deterministic.
Base run: Velvet casts = 10, team Full Bursts = 5 (burstCast 10 != fullBurstEnter 5 → trigger identity
is count-discriminable in this sole-B2 comp). Slot order liter 0 / velvet 1 / helm 2.

----- (i) vs UNMODIFIED SHIPPED override (already faithful — hand-verified parser-baseline) -----
✓ scripts/tests/units/velvet.test.ts (20 tests) 10ms
Test Files 1 passed (1)
Tests 20 passed (20)
(No S3 fix required: the shipped override is already faithful, so every line is a GREEN pin, not a FIX.
The override note/caveats already document the ammo-pouch drop, the outFb/inFb gates, the hitCount:50
fidelity choice, and the weaponSwap shot-economy estimate.)

----- DISCRIMINATION — each PIN is GREEN vs shipped AND RED under its named nearest-wrong counterfactual -----
GREEN vs shipped | differs (RED pin) | V1 Bullet Snatch UNMODELED (pouch + enemy ammo)
PIN(shipped): maxAmmo buffs from velvet = 0; stripping skill1 leaves liter/helm totals BYTE-IDENTICAL
PIN(nearest-wrong): consumeAmmo sign-flipped onto ALLIES → ally reload count 53 > base 33 (forced reloads)
GREEN vs shipped | differs (RED pin) | V2 S1 self ATK▲30.5 + AttackDamage▲30.5 outFb
PIN(shipped): atkPct 30.5 = 87 applies, ALL outFb (inFb=0), self only, 3s; attackDamagePct 30.5 = 87 (distinct stat)
PIN(nearest-wrong gate): drop outFb → atkPct 30.5 applies appear INSIDE FB (inFb>0)
PIN(nearest-wrong collapse): atkPct 61 = 0 (the two 30.5s are distinct stats, not a doubled atkPct)
GREEN vs shipped | differs (RED pin) | V3 S2 team casterAtkPct 25.2 (FLAT) + chargeDamagePct 100.8 inFb
PIN(shipped): casterAtkPct value≈25133 (flat add of velvet ATK, >1000), 135 applies ALL inFb, targets 0/1/2
chargeDamagePct 100.8 = 135 applies ALL inFb, 3s, targets 0/1/2
PIN(nearest-wrong gate): drop inFb → casterAtkPct applies appear OUTSIDE FB
PIN(nearest-wrong stat): atkPct 25.2 → value exactly 25.2 (a scaler <100), casterAtkPct = 0
PIN(nearest-wrong stat): chargeDamageMultPct 100.8 present, chargeDamagePct 100.8 = 0
GREEN vs shipped | differs (RED pin) | V4 S2 "50 normal attacks during FB" proc (hitCount:50 + inFb)
PIN(shipped): 400.92 flatDamage procs = 0; self attackDamagePct 15.03 = 0 (SR cannot land 50 in-FB hits)
PIN(nearest-wrong gate): drop inFb → 2 procs, ALL OUT of FB (cumulative 50-hit threshold crosses out-of-FB)
PIN(nearest-wrong threshold): hitCount 5 → 10 procs ALL IN FB, each atkPct=400.92 (bucket skill) + self 15.03/5s
NOTE: cumulative-vs-in-FB-only counting + FB-reset is a documented ⚑ fidelity hypothesis; both readings
converge on 0 procs in this fixture (the absence pin is non-vacuous: both counterfactuals fire).
GREEN vs shipped | differs (RED pin) | V5 burst weaponSwap 7%/10s + attackDamagePct 34.52/10s (burstCast)
PIN(shipped): attackDamagePct 34.52 = 10 (=casts), 600f (10s), self only; swap shots atkPct=7 (90) inside
the 10s burst window vs 69.04 SR normals outside it (the swap REPLACES the SR)
PIN(nearest-wrong trigger): fullBurstEnter → 34.52 buffs = 5 (=fbs), != 10 (=casts)
PIN(nearest-wrong duration): 3s window → 180f, != 600f
PIN(nearest-wrong swap mult): damagePct 70 → swap shots atkPct=70, atkPct=7 swap shots = 0

VERDICT: gate PASSES. 0 FIX lines (override already faithful); 0 tests green-under-both (shipped AND
counterfactual); every FAITHFUL pin GREEN vs shipped; V1 Bullet Snatch documented UNMODELED with a
discriminating absence-pin + inertness pin (not a silent drop, not an it.skip — actively pinned inert).
The two fable FIX flags (hitCount cumulative-vs-in-FB counting; weaponSwap cadence ⚑) are documented
fidelity HYPOTHESES in the override note/caveats, inert or measurement-gated, NOT encoding errors that move
damage in this fixture — reconciled to ⚑/owner-spot-check items (see manual-review/velvet.md §4), not NO-GO.

## 9. ⚑ flags the driver recorded (estimate + recipe + tier)

(1) hitCount:50 cumulative-vs-in-FB-only counting + per-FB reset convention — the engine hitCount counts ALL
cumulative hits and fbGate gates fire-time only; "50 normal attacks during Full Burst" ideally counts in-FB hits
only. Both readings converge on 0 procs in a 180s fight (an SR lands ~10 in-FB hits/window « 50), so the encoding
is inert here and the choice moves no damage; recipe = measure how often the 400.92% additional-damage popup fires
(per-FB vs per-N-FBs) on video (CALIBRATED ⚑ / fidelity hypothesis). (2) weaponSwap cadence/ammo/weapon-class —
kit-silent (ALWAYS-⚑ #3); engine default swap cadence shipped (~10 shots/10s, 60f cycle, no bolt gap), each swap
shot carries her SR charge bucket on top of the 7% multiplier; recipe = datamine the burst swap shot_id (fire rate/
magazine/class) or count shots per burst window on video (CALIBRATED ⚑). (3) "Full Charge" identity of swap shots —
the S2 team buff (casterAtkPct 25.2 + chargeDamagePct 100.8) is kept alive by SWAPPED shots during Velvet's own 10s
burst weapon-swap; shotFired fires on swap shots; whether the swap weapon satisfies "Full Charge" is unverified;
recipe = confirm ally Charge-Damage/ATK buff icons apply during Velvet's own burst on video (CALIBRATED ⚑). The
ammo pouch itself is NOT a ⚑ estimate — it is a sanctioned drop (derivably never-binding; model-or-omit is
damage-neutral, proven by the V1 inertness pin). S1's enemy-ammo-removal is documented UNMODELED (no enemy entity),
not a ⚑.

## 10. Verdict instructions

Return ONLY the JSON per the RECONCILING-JUDGE.md contract:
{slug, kitDescription, convergence:{s5TestsVsDriverOverride, redAssertions[]}, lineFindings:{skill1[],skill2[],burst[]},
gotchas[], discriminationOk, faithfulnessScore, verdict (GO|NO-GO(faithfulness)|NO-GO(engine-core)), verdictRationale, model}.
GO requires: every kit line accounted for (FAITHFUL or documented UNMODELED/GAP/⚑, no silent drops; audit SKIPPED ↔
unmodeled 1:1); no REAL-GOTCHA; the S5 blind tests run green vs the driver's override (convergence) — classify any RED;
every ⚑ has estimate+recipe+tier; the tests discriminate (S2d matrix); the fire-rate check passes (each FAITHFUL block
fires at its prose-implied cadence over 180s — NOTE: the S2b hitCount:50 proc is a fidelity-correct encoding that is
inert in this fixture by construction (0 procs; counterfactuals fire), NOT a modeled≠working silent drop; classify it
DOCUMENTED-GAP, not REAL-GOTCHA). The verdict is BINDING.
