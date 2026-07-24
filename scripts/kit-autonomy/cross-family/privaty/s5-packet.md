# CROSS-FAMILY BLIND PACKET — role s5 — unit privaty
# Built by prepare-cross-family-packet.ts. De-contaminated + leak-asserted at build time.
# Run UNMODIFIED on a model of the OTHER family; do NOT consult the driver's test/override/reasoning.

# kit-autonomy — S5 BLIND post-op test-writer (blind to the driver)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md`. You write a full
per-unit kit spec test from the kit prose ALONE — the same forcing function the driver used, independently.
Your convergence with the driver's tests (run unmodified against the driver's override by the judge) is the
faithfulness signal; a divergence you catch that the driver did not document is the payload.

> **Content gate:** inspect kit prose STRUCTURALLY (the `■` header + `Affects …` clause + the stat keyword
> before `▲`/`▼`); quote ≤ ~40 chars; keep output clinical. Do not echo full flavorful sentences.

## You are given
- The unit's **kit prose** (skill1/skill2/burst) + base stats. Ground truth — read literally.
- The **harness API** (`scripts/tests/lib/harness.ts`) + the **effect schema** (`src/skills/types.ts`) + the
  disposition vocabulary + the 4 per-line questions + the RECURRING FAILURE-MODE taxonomy (REDACTED of this
  unit's answer — declare `leakDetected` if you spot this unit's slug/magnitudes in it).
- The exemplar `scripts/tests/units/helm.test.ts` for STRUCTURE only (header evidence comment, `run()` helper
  collecting `cfg.onEvent`, `withPatchedOverride` counterfactuals, hoisted runs, discriminating + inertness
  assertions). Copy the discipline, not the unit.

## You must NOT see
The driver's tests, the driver's override, the driver's reasoning, the truth file. If handed any, the test is
void — say so.

## Method
1. Enumerate every kit line; disposition each (FAITHFUL/FIX/MISSING/GAP/UNMODELED/MEASUREMENT-GATED) + the 4
   questions (scope / duration semantics / trigger identity / target set).
2. Write `scripts/tests/units/<slug>.test.ts` (return its full source): one assertion group per kit line.
   - **Fixture:** `controlComp('<slug>', true)` (supplies B1/B2 so a B3 casts; a lone B3 makes ZERO Full
     Bursts). Deterministic (no seed). Use `helm=false` if helm's buffs confound a reading.
   - **Discriminating assertion per FAITHFUL/FIX/MISSING line:** GREEN under the faithful reading, RED under
     the nearest-wrong model (built via `withPatchedOverride`). Event-log over totals wherever the claim is
     structural (`cfg.onEvent`; kinds shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/
     fullBurstEnd; `damage` carries bucket/srcSlot/crit+core rates/multiplier decomposition).
   - **Inertness assertions:** what the line must NOT move (teammates byte-identical; wrong buckets unmoved).
   - **Non-vacuity:** for a gated/conditional line, assert the fixture actually exercises BOTH the active and
     inactive case (else the assertion tests nothing).
   - **GAP lines:** `it.skip` with the reason (missing primitive / unobservable payload).
   - Header comment: what the kit says, the fixture, and WHY each assertion discriminates.
3. Keep runs hoisted (each `runComp` is a full 180s sim); a file under ~20 runs.

## Return ONLY this JSON
```json
{
  "slug": "<exact slug>",
  "leakDetected": "<null or what leaked>",
  "testSource": "<the full <slug>.test.ts source>",
  "spec": [ { "slot": "...", "kitLine": "<≤40 chars>", "disposition": "...", "assertion": "<what it proves + nearest-wrong it fails under>" } ],
  "fixtures": "<which comp(s) used and why>",
  "gaps": [ "<it.skip'd lines + reason>" ]
}
```
Save the test source to `scripts/kit-autonomy/blind/<slug>.test.ts` and the JSON to
`scripts/kit-autonomy/blind/<slug>.test-spec.json`. Tight structured JSON, not an essay.


=== KIT PROSE (legitimate input — ground truth; the answer tokens appear HERE by design) ===
Unit: Privaty (privaty)
Base: AR/Water/Attacker/Burst III, cd 40s, ammo 60, reloadFrames 81, chargeFrames 0, hitsPerShot 1, normalAttackMultiplier 13.65, coreAttackMultiplier 200.

skill1:
■ Activates when entering Full Burst. Affects all allies.
ATK ▲ 23.61% for 10 sec.
Reload Speed ▲ 51.16% for 10 sec.
Max Ammunition Capacity ▼ 50.66% for 10 sec.
Attack Damage ▲ 20.16% for 10 sec.

skill2:
■ Activates when the last bullet hits the target. Affects the target.
Damage Taken ▲ 10.01% for 10 sec.
Deals 256.17% of final ATK as additional damage. 
■ Activates when the last bullet hits a target in Designated Target status. Affects the target.
Deals 1687% of final ATK as additional damage.

burst:
■ Affects self.
Elemental Advantage Attack Damage ▲ 130% for 10 sec.
■ Affects all enemies.
Deals 1407.64% of final ATK as Burst Skill damage.
Stuns for 3 sec.
Designated Target: ATK ▼ 5.02% for 10 sec.
=== END KIT PROSE ===

# Redacted methodology for blind kit-authoring roles (unit-agnostic)

Included in every blind packet (S2b/S5/S6). General failure-mode taxonomy + the 4 per-line questions + the
ALWAYS-⚑ fields. The packet-prep script strips any line naming the TARGET slug before dispatch (examples naming
other units are kept — they don't leak the target). Answer-free by construction.

## Recurring failure-mode taxonomy (the traps calibration hides — applies to ANY unit)
1. **SCOPE** — a buff scoped to "normal attacks" (or charge / crit-only) mis-encoded as a generic stat. A
   "Critical Rate of normal attacks" line is a scoped stat, NOT generic crit (generic over-credits skill/burst crit).
2. **DURATION SEMANTICS** — "for N round(s)" is a ROUND count (expires after the holder fires N rounds, spanning
   reloads), NEVER wall-clock seconds. Also distinguish stacks vs until-reload vs permanent vs "continuously".
3. **TRIGGER IDENTITY** — read the activation text literally: "when using Burst Skill" / a self mode in the
   unit's OWN burst block → burst-cast (fires only on rotations THIS unit bursts); "when entering Full Burst" /
   "during Full Burst" → full-burst-enter (fires on ANY team Full Burst); "when Full Burst ends" → full-burst-end;
   "when the last bullet hits/fires" → last-bullet (per-magazine); "every N hits" → hit-count (counts ROUNDS not
   pulls); a damage line with NO activation clause → interval. A rider can be GATED on a status/condition
   ("hits a target in <X> status"). Burst-cast vs full-burst-enter diverge whenever another same-tier unit is in
   the team — keying a burst-cast-gated effect to full-burst-enter OVER-CREDITS.
4. **TANDEM / CROSS-UNIT** — a heal/shield inert alone may drive a teammate's "on recovery / when healed" damage
   buff; never skip heal/shield/DEF/HP/lifesteal/gauge lines on isolation. "Damage Taken ▲" is a boss DEBUFF that
   benefits the whole team, not a self buff.
5. **DoT ENCODING** — the engine appends an independent DoT instance per fire and never dedups; a continuous/
   maintained DoT = ONE passive instance with duration ≥ fight length (a long duration on a repeating trigger
   MULTIPLIES).
6. **WEAPON-STATE modifiers** (reload speed/ratio, ammo capacity ▲▼, fire rate, charge speed, weapon swap) ARE
   damage — they gate shot count. Before writing "skip", ask "does this change shots fired or the weapon?" A
   "Max Ammunition ▼" halves magazines (raises last-bullet frequency).
7. **HP/DEF scalers** count the unit's OWN Max HP only; ally grants don't feed the conversion. Keep the stat buff
   even if the engine treats it inert (a future consumer/scaler).
8. **ELEMENT advantage** is a clean ×1.10 unless the kit carries an elemental-advantage damage buff
   ("Superior Elemental Code" style) — then it exceeds ×1.10 and must be modeled.
9. **noFb / range / core** — function-damage riders take Full Burst by TIMING (default ON); the +30% range bonus
   is universally OFF on riders (engine force-sets no-range); riders crit at the caster's rate but get NO core
   unless the text says "core strike damage"; burst-cast/instant damage is always FB-exempt (a burst cast lands
   before the FB window opens).
10. **STACK / currency** → steady-state with a ramp haircut; if start + consume + rebuild are kit-stated, DERIVE
    the trajectory (continuous level-scaling = time-average respecting the stated START; threshold-gated = check
    the PRE-consume count; sawtooth = ~cap/2).

## The 4 questions per kit line (the errors calibration hides)
1. **Scope** — normal attacks vs charge vs crit-only vs generic?
2. **Duration semantics** — seconds vs ROUNDS vs stacks vs until-reload vs permanent?
3. **Trigger identity** — last-bullet / shot-fired / hit-count / interval / full-burst-enter / burst-cast;
   on-cast vs on-hit; any gate (FB-gate / every-N / requires-core / requires-target-status)?
4. **Target set** — self / allies / all-including-self / the target (enemy) / caster-slot overwrite?

## ALWAYS-⚑ fields (outside the input domain — flag with estimate + reasoning + recipe; never ship silently)
A value not literally in the kit text, OR from a known-unreliable datamine field (rate_of_fire, reloadFrames),
MUST be a ⚑. The seven: (1) cadence tuple (datamine-unreliable); (2) a damage line the text gives NO trigger for
(invented trigger + cadence); (3) weapon-swap shot economy (kit-silent — estimate optimistically); (4) stack/
currency steady-state + ramp haircut (derive if stated); (5) multi-projectile split-vs-merge (kit-silent — read
popups); (6) per-kit noFb (default OFF; measured-only); (7) Hit-Rate→core magnitude (measured-only). A blind
parser that honestly flags what it can't know is CORRECT; one that guesses a precise ⚑ value is WRONG.


=== HARNESS API (scripts/tests/lib/harness.ts) ===
controlComp(carry, helm?=true) → CompOptions (liter B1 / crown B2 / carry B3 / helm B3, boss Fire, focus carry).
runComp(opts) → SimResult (deterministic, no seed). totals(res); unitOf(res, slug).
withPatchedOverride(slug, mutate) → in-memory override clone (committed JSON untouched).
cfg.onEvent: (ev) => void — kinds shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/fullBurstEnd;
damage carries bucket, srcSlot, crit/core rates, inFullBurst, fbMajorApplied, rangeApplied, mult.
NOTE: boss-held debuffs emit buffApply with casterIdx===null AND targetIdx===null — filter them by stat+value.

=== REDACTED EFFECT SCHEMA (types.ts, target-naming comments stripped) ===
// Structured skill-effect schema. Produced by the prose parser
// (src/skills/parser.ts) and by hand-written overrides (src/skills/overrides/*.json).

export type SkillSlot = 'skill1' | 'skill2' | 'burst';

export type StatKey =
  | 'atkPct'            // ATK ▲ x% (scales target's own ATK)
  | 'casterAtkPct'      // ATK ▲ x% of caster's ATK (flat add)
  | 'highestAllyAtkPct' // ATK ▲ x% of the HIGHEST ally's ATK (flat add — guilty "Mind If I Borrow This?"). Resolves to (value/100)×max(all units' staticAtk) at apply time; feeds the same flat-ATK path as casterAtkPct. Solo (self is the max) == casterAtkPct.
  | 'atkOfMaxHpPct'     // ATK ▲ x% of the unit's own final Max HP (flat add — Cinderella, Maiden:IR)
  | 'critRatePct'
  | 'critRateNormalPct' // "Critical Rate of normal attacks ▲x%" — Critical Rate that applies ONLY to
  //                       normal-attack hits, never to skill procs or burst damage. Distinct mechanic
  //                       from the unscoped critRatePct above: dealDamage adds it to the crit roll only
  //                       when category === 'normal'. Opt-in; inert (0) for every unit that lacks the
  //                       kit line, so it can never change a non-carrier. Carriers: helm (S1, allies —
  //                       an unscoped model over-credited the whole TEAM's skill/burst crit, which grew
  //                       when RIDERCRIT made flat-damage riders crit-eligible). `biscuit` also carries
  //                       the line but is not simSupported.
  | 'critDamagePct'
  | 'coreDamagePct'
  | 'elementDamagePct'
  | 'chargeDamagePct'     // additive percentage points in the charge bucket
  | 'chargeDamageMultPct' // scales by BASE charge damage (collection items, Helm's max-treasure burst)
  | 'chargeSpeedPct'
  | 'attackDamagePct'   // "Attack Damage" — Damage Up bucket
  | 'sustainedDamagePct'
  | 'sequentialDamagePct'  // "Sequential Attack Damage ▲x%" — ADDITIVE in the Damage Up bucket (diluted by other support buffs; e.g. snow-white-heavy-arms)
  | 'sequentialMultPct' // "Damage multiplier of sequential attacks scaled by x%" — a TRUE multiplier on sequential-flavored damage in its OWN multiplicative bucket (NOT diluted; eve Mk2 ×2). Distinct mechanic from the additive sequentialDamagePct above.
  | 'casterMaxHpPct' // grants Max HP = % of CASTER's Max HP ("X% of the skill user's Max HP" — rouge/anis/trina)
  | 'targetMaxHpPct' // grants Max HP = % of the TARGET's OWN Max HP ("Max HP ▲ X%" — blanc/maiden). Same
  //                    e3 feed rule as casterMaxHpPct: only feeds atkOfMaxHpPct when caster === target (self)
  | 'partsDamagePct'    // parsed but inert in v1 (no parts on the boss)
  | 'pierceDamagePct'   // parsed but inert in v1
  | 'damageTakenPct'    // debuff on the boss (positive = boss takes more)
  | 'maxAmmoPct'
  | 'maxAmmoFlat'       // Max Ammunition ▲ N rounds — FLAT round count (not %), added on top of the
  //                      maxAmmoPct scaling in maxAmmo() (theme 14: "▲ N round(s)" kit lines that the
  //                      percent-only schema could only approximate — grave/noir/tove/drake/trina)
  | 'reloadSpeedPct'
  | 'attackSpeedPct'
  | 'fireRatePct'
  | 'extraHitDamagePct' // flat % of final ATK added per normal-attack hit while active
  | 'trueDamagePct'          // Damage Up bucket (doc line 8)
  | 'projectileExplosionPct' // Damage Up bucket; only RL kits carry it
  | 'elemAdvantageDamagePct' // Damage Up bucket, active only with elemental advantage
  | 'distributedDamagePct'   // boosts the caster's own distributed-damage hits
  | 'projectileAttachmentPct' // boosts the caster's projectile-attachment procs
  | 'normalAttackPct'        // scales the normal attack multiplier (like the SMG/SG doll line)
  | 'pelletCountFlat'        // "Number of pellets ▲ N" — flat effective SG pellet-count add for a window.
  //                            Threaded through the SG landing/gauge path so extra pellets pass the SAME
  //                            per-pellet landing fraction / range falloff / shot-level core as the base
  //                            (each pellet = 1/base of the shot). Opt-in; SG-only & swap-off (inert on
  //                            non-SG and when 0). Damage-neutral vs the old normalAttackPct proxy for a
  //                            unit with no OTHER normal-mult; the faithful gain is a real, queryable
  //                            pellet count (effectivePellets) + correct multiplicative interaction with
  //                            any co-active normalAttackPct. Gauge is NOT pumped (energy is per-trigger).
  | 'burstGenPct'            // scales the unit's burst gauge contribution
  | 'hitRatePct'        // core-hit lift (⚑ derived; sim.ts hrCoreMult; live by default, HRCORE=0 disables)
  | 'defPct'            // inert in v1 (self DEF doesn't affect own damage — Endurance cube)
  | 'maxHpPct';         // self Max HP ▲ % (Vigor cube) — converted to a maxHpFlat self-grant in sim.ts, feeds HP-scaling ATK (atkOfMaxHpPct)

export type TriggerDef =
  | { kind: 'passive' }                     // always active
  | { kind: 'burstCast'; stage?: 1 | 2 | 3 } // when the owner casts their burst (optionally only at that stage — Λ kits)
  | { kind: 'fullBurstEnter' }              // when full burst begins
  | { kind: 'fullBurstEnd' }
  | { kind: 'hitCount'; count: number; countInFb?: number } // fires every `count` cumulative hits; `countInFb` overrides the threshold DURING Full Burst (RRH rocket meter: 120 out of burst → 60 in her FB)
  | { kind: 'chargeCounter'; count: number | number[]; countInFb?: number | number[] } // cycling per-full-charge phase counter:
  // each full charge advances a phase counter; phase P fires (block.effects[P], in order) once its OWN
  // threshold accrues, then the counter resets and advances to P+1. `count`/`countInFb` may be a scalar
  // (same threshold every phase) OR a per-phase array (PREFERRED — the datamined "attack count required
  // to N times" is per-phase). Scarlet: Black Shadow: outside FB [3,6,9], her burst drops it to [1,2,3]
  // for 10s (so one full 3-phase cycle = 6 charges in FB / 18 outside; the 848% phase2 is the RAREST,
  // matching video — N3 focus read shows the large phases barely materialise). +50% FB applies per-proc
  // by landing timing.
  | { kind: 'teamAmmo'; count: number } // fires each time TOTAL ally ammo consumed crosses count (infinite-ammo shots don't consume)     // every N normal-attack hits by the owner
  | { kind: 'shotFired' }                   // every trigger pull by the owner
  | { kind: 'lastBullet' }                  // on the owner's last bullet / reload start
  | { kind: 'recovery' }                    // when the owner RECEIVES a heal (a 'heal' effect targets them) — Crown's "when recovery takes effect"
  | { kind: 'shielded' }                    // when the owner RECEIVES a shield (a 'shield' effect targets them) — shield-synergy kits (e.g. naga's shield-gate)
  | { kind: 'interval'; sec: number }       // fires every `sec` seconds of battle, first at t=sec — kit lines that "just happen" on an internal cooldown with no visible activation clause (snow-white S2a 144.73%, owner-stated 15s CD 2026-07-20). ⚑ first-fire phase (t=sec vs t=0) is a convention; pin from footage when a consumer's cadence is popup-read
  | { kind: 'stageEnter'; stage: 1 | 2 | 3 } // when a stage-N burst is cast by anyone
  | { kind: 'bossElement'; element: string } // permanent, but only if the boss has this element
  | { kind: 'unsupported'; raw: string };

export type TargetDef =
  | { kind: 'self' }
  // excludeSelf: "all allies (except self)" — e.g. brid-silent-track burst
  | { kind: 'allies'; excludeSelf?: boolean }
  | { kind: 'enemy' }
  | { kind: 'burstCasters'; stage?: number; element?: string }                // allies who cast a burst this rotation
  | { kind: 'nonBurstCasters' }
  // excludeSelf: "N highest-ATK ally (except the skill user)" — miranda, soda-twinkling-bunny.
  // Applied to the candidate pool BEFORE the count-slice (exclude-then-take-N).
  // byFinalAtk: rank by LIVE effectiveAtk (buffed) instead of staticAtk (base) — set ONLY when the
  // kit text literally says "highest/lowest FINAL ATK" (A3, 2026-07-20). Absent = static ranking
  // (kits that say plain "highest ATK", e.g. naga, keep base-ATK ranking per the owner literal-word rule).
  | { kind: 'alliesTopAtk'; count: number; excludeSelf?: boolean; byFinalAtk?: boolean }
  | {
      kind: 'alliesLowestAtk'; // "N [Burst X] ally unit(s) with the lowest final ATK"
      count: number;
      burst?: 'I' | 'II' | 'III';
      excludeSelf?: boolean; // e.g. Liberalio is immune to charge-speed buffs
      byFinalAtk?: boolean;  // rank by live effectiveAtk when the kit says "lowest FINAL ATK" (A3)
    }
  | { kind: 'alliesOfElement'; element: string; excludeSelf?: boolean }
  | { kind: 'alliesOfClass'; cls: string; excludeSelf?: boolean }
  // "all shotgun-wielding allies [(except self)]" — weapon-typed, class-blind
  // (arcana-fortune-mate S1/S2, tove S2/burst). Weapon codes: AR/SMG/SG/SR/RL/MG.
  | { kind: 'alliesOfWeapon'; weapon: string; excludeSelf?: boolean }
  // "the N leftmost <element> ally unit(s) with <weapon>s" (Trina S2's real target)
  | { kind: 'alliesOfElementWeapon'; element: string; weapon: string; count?: number }
  // "self and N ally unit(s) on both sides" (Rouge's coin coverage — positional)
  | { kind: 'selfAndAdjacent'; sides: number }
  // "the N ally unit(s) with the lowest remaining HP [(except self)]" (blanc/moran survival grants).
  // v1 has no HP pool (immortal boss, nobody takes damage) so "lowest remaining HP" is indeterminate —
  // resolved deterministically to the leftmost `count` allies as a documented stand-in. The Max-HP grants
  // these lines carry are offensively INERT anyway (ally-granted Max HP does not feed a teammate's
  // atkOfMaxHpPct conversion — e3 video rule), so the stand-in choice moves no damage.
  | { kind: 'alliesLowestHp'; count: number; excludeSelf?: boolean };

export type EffectDef =
  | { kind: 'buff'; stat: StatKey; value: number; durationSec?: number; maxStacks?: number;
      // ROUND-COUNT duration: kit lines that last "for N round(s)" expire after the HOLDER fires N
      // rounds, not after a wall-clock window — so the window stretches across reloads and shrinks
      // when the unit fires faster. A round is one bullet: 1 per trigger pull, hitsPerShot for an MG
      // (the same count the ammo economy spends). Decremented right after the shot's blocks dispatch,
      // so the Nth shot still benefits, then the buff drops at 0 — the same "ends right after its Nth
      // shot" shape as weaponSwap.maxShots (MEASURED 2026-07-14).
      // Combine with durationSec to model "N rounds OR t seconds, whichever ends first"; alone (the
      // usual case) the buff has no time expiry at all. Omit = time-only, back-compatible.
      // Carrier: helm's burst Charge Damage Multiplier 158.4% "for 10 round(s)" — her magazine is 6,
      // so the window genuinely spans a reload and a durationSec could not express it.
      // NOT for "reload speed is FIXED at x for N rounds" lines (asuka-wille) — those are stat CLAMPS,
      // a different primitive (docs/engine-modeling-gaps.md §1b).
      durationShots?: number;
      // buff counts only while the caster's weaponSwap is live — for "held per swap round"
      // kit lines (MEASURED 2026-07-14, SWHA Fully Active charge/sequential buffs)
      whileSwapped?: boolean;
      // per-shot/per-charge STACK-RAMP: when a buff's value is authored at its MAX-stacks
      // magnitude but the real stacks accrue over the opening seconds (not instant), rampSec
      // linearly ramps the contribution 0 → full over rampSec from the buff's FIRST
      // application, then holds at cap — so the sim no longer over-credits t=0 (engine-modeling
      // -gaps.md theme 3). The ramp clock is the first-apply frame (frame 0 for a `passive`,
      // the cast frame for a burstCast-keyed self-buff) and is NOT reset by refreshes. Omit =
      // instant-to-max (back-compatible). ⚑ rampSec is a per-unit estimate unless measured.
      rampSec?: number;
      // live resource-scaled buff: the buff's value is IGNORED and instead computed each frame
      // as caster.resources[name] × mult — for a stat that tracks a dynamic pool (soda-twinkling
      // -bunny's Critical Damage ▲1.32% per Golden Chip: perResource {name:'goldenChip', mult:1.32}).
      // Apply as a `passive` self-buff so it is always present and re-reads the live pool.
      perResource?: { name: string; mult: number };
      // reload-triggered removal: this buff is STRIPPED from the target when it next reloads to max
      // ammunition (natural magazine reload-completion, or a fast-reloader's boss-transition
      // snap-refill) — kit lines "…Removed upon reloading to max ammunition" (cinderella's S1 Charge
      // Speed toggle). Apply it via a per-shot/full-charge trigger with NO durationSec so it persists
      // across the magazine and only the reload ends it. INERT for every unit that does not set it.
      removeOnReload?: boolean }
  | {
      // adjust a named resource pool (declared in CharacterSkills.resources) by `delta` when this
      // block's trigger fires — soda's burst spends 17 chips (delta:-17), her in-FB every-3-normals
      // block earns 1 (delta:1). Clamped to the resource's [min,max]. Order within a slot matters:
      // a spend placed AFTER the resource-gated blocks lets those gates read the PRE-spend pool.
      kind: 'resource'; name: string; delta: number }
  | {
      kind: 'flatDamage'; // instant hit, % of caster final ATK
      atkPct: number;
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
      core?: boolean; // direct core strike: receives the core bucket, scaled by core-rate
      crit?: boolean;    // this hit can crit (e.g. Ein's Near Feathers)
      noRange?: boolean; // excluded from the +30% full-range bonus (Prydwen-confirmed for Near Feathers)
      noFb?: boolean;    // excluded from the +50% full-burst bonus (Q1-calibrated proc exemption)
      delaySec?: number; // flighted damage: lands delaySec later, snapshotting buffs/FB at
                         // LANDING (MEASURED 2026-07-14: rapi-red-hood's burst nuke missile
                         // lands ~0.4s post-banner inside her window at the full buff state)
      // A full-charge cannon shot dealt as a DELAYED hit while the caster keeps firing her base
      // weapon (snow-white: her AR fires through the ~5s cannon charge; the cannon is one flighted
      // charge shot, NOT a weaponSwap that halts the base weapon — sw.MP4 2026-07-20). These four
      // only take effect on the delaySec path; instant flatDamage riders keep charge:false/noRange:true.
      charge?: boolean;       // route through the charge bucket (§1d) — a real full-charge shot
      chargeMultPct?: number; // full-charge multiplier for a `charge` hit when no swap sources it
                              // (base AR chargeMultiplier is 0); only read when charge:true
      pierce?: boolean;       // Pierce-tagged (Pierce Damage ▲ feeds this hit's Damage-Up bucket),
                              // independent of the unit-level hasPierce flag — one-shot/swap-scoped pierce
      rangeOk?: boolean;      // opt this DELAYED hit INTO the +30% range bonus (delayed hits force
                              // noRange by default; the cannon gets range like the swap shot it replaces)
      requiresPulls?: number; // fires only if the caster has fired >= N shots (MEASURED
                              // 2026-07-14: her nuke needs >=1 sticky charge = 120 shots)
      // per-battle-elapsed ramp: scales this hit's atkPct by min(1, elapsed/rampSec) — for a
      // burst component that scales with a stack resource accruing from BATTLE START (cinderella's
      // Beautiful-mirror: 28.9%×12 stacks ramping over ~36s, so an early burst mirrors fewer
      // stacks). Snapshotted at cast/landing. Omit = full (back-compatible). ⚑ per-unit estimate.
      rampSec?: number;
    }
  | {
      kind: 'dot'; // ticks every intervalSec (default 1); never core-boosted
      atkPct: number;
      durationSec: number;
      intervalSec?: number;
      noRange?: boolean;
      noFb?: boolean;
      crit?: boolean;    // this DoT's ticks roll crit at the caster's sheet rate — opt-in ONLY where MEASURED
                         // (isabel's ~14.7s periodic hit: ~15-25% of fires observed critting; docs/probe-data/isabel-sg-band.json).
                         // Overrides the global DOT_CRIT gate (which stays default-OFF): most DoTs are validated NON-crit
                         // (jill's acid tick video-confirmed at 99.7% non-crit; mihara's Ensnaring validated at 1.03 non-crit).
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
      // live resource-scaled DoT: each tick's atkPct is recomputed as owner.resources[name] × mult
      // (ignores the static atkPct) — mihara-bonding-chain's Ensnaring DoT (50.05%/s per stack,
      // stacks cancelled on burst + rebuilt), so a stack pool drives the DoT dynamically.
      perResource?: { name: string; mult: number };
    }
  | {
      kind: 'weaponSwap'; // "Changes the weapon in use:" — temporary weapon override
      damagePct: number;        // per-shot multiplier while swapped
      chargeTimeSec?: number;   // full-charge time (charge weapons)
      chargeMultPct?: number;   // "Full Charge Damage: N% of damage"
      maxAmmo?: number;
      // The swap weapon's OWN datamined fire cadence (pulls/s), when it differs from the base
      // weapon — the swap loads a different shot spec (moran: swap shot_id fires 24/s vs base AR 12/s).
      pullsPerSec?: number;
      // The swap weapon's CLASS, when it differs from the base weapon — drives range-band
      // eligibility + auto-core rate for swap shots (nayuta: SMG base → SR "Memory Incineration" mode).
      weapon?: string;
      trueNormals?: boolean;    // swap shots are true-flavored (Takina: "Normal attacks deal true damage")
      hasPierce?: boolean;      // swap shots are Pierce-tagged ("Additional Effect: Pierce" scoped to the
                                // swapped weapon, snow-white's cannon — owner-ruled 2026-07-20). Feeds the
                                // per-shot pierce tag only (Pierce Damage ▲ bucket eligibility); never the
                                // static whole-fight hasPierce flag
      durationSec: number;      // hard time bound (e.g. the 10s burst window)
      maxShots?: number;        // uses-based end: swap terminates right after the Nth swapped
                                // shot fires, at variable time (MEASURED 2026-07-14, SWHA)
    }
  | { kind: 'fillGauge'; pct: number }                        // instantly fills the burst gauge
  | { kind: 'heal'; ticks?: number; intervalSec?: number }    // emits recovery event(s) to the target(s) — no HP amount modeled; fires their 'recovery' triggers (heal-synergy kits, e.g. Helm→Crown). A per-second heal-over-time ("Recovers X% every 1 sec for N sec") sets ticks:N (intervalSec default 1) so it emits N recovery events over time, keeping on-recovery consumers refreshed; default ticks:1 = a single instant event (back-compatible)
  | { kind: 'shield'; maxHpPct?: number; durationSec?: number } // emits a shield event to the target(s) — no HP pool modeled (v1 boss deals no damage); fires their 'shielded' triggers; maxHpPct = % of CASTER final Max HP (recorded for kit completeness)
  // inflicts a kit-NAMED status on the boss for durationSec. Windows are keyed per NAME, so two
  // characters' unrelated statuses never satisfy each other's gate. Opens/extends the window read
  // by the `requiresTargetStatus` block gate.
  // This is the SOLE enemy-status channel. It replaced a hardcoded single-name `wipeOut` effect +
  // `requiresWipeOut` boolean (deleted 2026-07-23): that pair could express exactly ONE status for
  // the whole roster, so any second carrier would have silently satisfied d-killer-wife's gate and
  // vice versa — an incorrect model that happened to pass because only one unit used it.
  // TARGET IS IMPLICITLY THE ENEMY — there is no enemy entity in the sim
  // (resolveTargets({kind:'enemy'}) returns []), so the engine IGNORES block.target here (unlike
  // 'resource', which is owner-scoped). validate-overrides.ts nonetheless REQUIRES the carrying
  // block to be authored with target `enemy`, so a real override cannot silently mis-scope it.
  // Users: d-killer-wife ("Wipe Out", 10 s — her burst's body-branch ATK buff is gated on it).
  | { kind: 'targetStatus'; name: string; durationSec: number }
  | {
      kind: 'storedHit'; // accumulates charges that ALL release as hits when full burst begins
      atkPct: number;    // per charge, % of caster's final ATK at release time
      charges?: number;  // charges added per activation (default 1)
      flavor?: 'distributed' | 'sustained' | 'sequential' | 'true' | 'projectileAttachment' | 'projectileExplosion';
      core?: number;     // per-release core RATE (0..1) via the coreOverride path — aim/range-INDEPENDENT, not the weapon/band acr table (RRH attached-rocket explosions core ~1/3, MEASURED 2026-07-16)
      crit?: boolean;    // the release rolls crit at the caster's sheet rate (like every other hit) — removes the stored-hit path's default crit-OFF exemption; consistency, not a new mechanic (RRH explosions crit — orange bodies observed; 2026-07-16 DECISIONS)
      instantInFb?: boolean; // charges added DURING Full Burst detonate immediately that same window (RRH: a rocket that attaches in FB explodes instantly), instead of only batch-releasing at the next FB start
    }
  | { kind: 'burstEligibility'; stage: 1 | 2 | 3 }            // unit may also burst at this stage (Rapi:RH Combat Assist)
  | { kind: 'burstFirst' }                                    // takes the FIRST eligible burst of its stage regardless of slot order (Prika duet opener)
  | { kind: 'reenterStage'; stage: 1 | 2 | 3 }                // "Re-enters Burst Stage N": the rotation stays at stage N so ANOTHER eligible unit can also cast (Tia, Anis:Star Everyone's Star)
  | { kind: 'advantageVs'; element: string }                  // counts as elementally advantaged vs this boss element
  | { kind: 'burstCdr'; seconds: number; oncePerBattle?: boolean } // reduce targets' burst cooldowns
  | { kind: 'escalating'; steps: EffectDef[] }                // Liter-style "Once:/Twice:/…": Nth activation applies steps 1..N
  | { kind: 'fullBurstExtend'; seconds: number }
  | { kind: 'unlimitedAmmo'; durationSec: number }
  // "Removes N% of ammunition" / forced-reload dump (theme 15): empties the target's current
  // magazine by `fraction` of MAX capacity (default 1 = 100%, the whole belt) and, if that drops
  // the belt to 0, forces an immediate reload (fires lastBullet triggers, same as firing dry).
  // The inverse of instantReload. e.g. grave's Prediction-end forced reload, asuka-wille, jill.
  | { kind: 'consumeAmmo'; fraction?: number }
  | { kind: 'gainPierce'; durationSec?: number }              // "Gain Pierce": the target's attacks count as Pierce-tagged, so its (and teammates') Pierce Damage ▲ buffs go live. durationSec = timed "for N sec" window; ABSENT = continuous/permanent (pierceUntilFrame → ∞) — used to STEP-GATE pierce that turns on only after a stack threshold (ade-agent-bunny: on a hitCount:10 "Spy Lens at max stacks" trigger, replacing an always-on-from-t=0 hasPierce flag that a boolean can't step-gate)
  | { kind: 'instantReload'; fraction?: number }              // refill magazine (fraction of max, default full)
  | { kind: 'stun'; durationSec: number }                     // target can't fire/charge/reload (bursting unaffected)
  | {
      kind: 'stackedNuke'; // Maiden:IR MP — hits once per full burst the unit SAT OUT since its last burst
      atkPct: number;      // per stack, % of final ATK
      hpPct?: number;      // per stack, % of final Max HP added on top
      maxStacks?: number;  // default 12
    }
  // OFFLINE-PARSER-ONLY kinds: emitted by scripts/lib/kit-parser.ts while
  // authoring/materializing, but NEVER valid in an override JSON (the validator
  // rejects them) — such kit text belongs verbatim in the override's `unmodeled`
  // field instead. The engine has no branch for either kind.
  | { kind: 'ignored'; note: string }                         // recognized, deliberately unmodeled (defensive etc.)
  | { kind: 'unsupported'; raw: string };                     // unparseable

export interface Block {
  slot: SkillSlot;
  trigger: TriggerDef;
  target: TargetDef;
  effects: EffectDef[];
  // static squad-formation gate, evaluated once at sim setup (e.g. Rapi:RH's
  // Combat Assist only applies when the team has no Burst I unit). The unit
  // itself never counts ("no OTHER Burst 1 allies").
  formation?: 'noB1' | 'hasB1';
  // static team-composition gate, evaluated once at sim setup (like `formation`):
  // the block is active only when the team contains SOME OTHER ally matching ALL
  // specified facets — facets AND together; omit a facet to leave it unconstrained.
  // e.g. teamHas:{element:'Electric', burst:'III'} — the `arcana` (RL/Electric)
  // override's team buffs are DEAD "without a Burst-III Electric caster present"
  // (NOT arcana-fortune-mate), so the block is inert on any
  // team lacking one. The owner itself never counts (same rule as `formation`);
  // burst matches literally (a Λ unit does NOT satisfy burst:'III'). Omit = always
  // active (back-compatible). Burst codes 'I'|'II'|'III'|'Λ'; weapon AR/SMG/SG/SR/RL/MG.
  // `slugs`: the team contains one of these SPECIFIC units (matches some OTHER ally's exact slug) —
  // for kit gates keyed to named squad-mates the data has no squad axis for (noir's burst block 3
  // "an ally from the same squad": owner-ruled 2026-07-20 satisfied by blanc or rouge).
  teamHas?: { element?: string; class?: string; weapon?: string; burst?: string; slugs?: string[] };
  // mode gate: block active only when the unit's selected mode matches (the
  // override's top-level `modes` array declares the choices; first = default)
  mode?: string;
  // effects apply only on every Nth activation of this block's trigger
  // (e.g. Mast's Hangover: every 3rd full-burst end)
  everyN?: number;
  // phase for everyN: fire on activations ≡ offset (mod everyN), e.g. offset 1 + everyN 3
  // fires on the 1st, 4th, 7th… activation (Neon:VE starts at full Firepower Gauge)
  everyNOffset?: number;
  // core-hit gate: the block's in-game trigger needs a core hit, so it is
  // inert when the fight has no core exposure (e.g. Liberalio's 20.83% rider)
  requiresCore?: boolean;
  // full-burst-state gate, checked when the trigger fires: 'inFb' blocks only
  // activate during full burst, 'outFb' only outside it (e.g. Velvet's S1
  // "when attacking with Full Charge while not in Full Burst")
  fbGate?: 'inFb' | 'outFb';
  // weapon-swap-state gate, checked when the trigger fires: 'swapped' blocks
  // only activate while the owner's kit weaponSwap is live (e.g. SWHA's Fully
  // Active extra volley rides only her two swapped full-charge shots),
  // 'unswapped' only outside it
  swapGate?: 'swapped' | 'unswapped';
  // shield-state gate, checked when the trigger fires: the block only activates while the
  // OWNER currently has a shield set on them (a 'shield' effect targeted them and its
  // durationSec has not elapsed; no duration = permanent at scope, since boss damage is
  // unmodeled and nothing breaks shields). For "Activates if a Shield is set in front of
  // this unit" lines evaluated at cast time (naga's burst 31.02% — owner-ruled default-off
  // 2026-07-20). Distinct from the `shielded` TRIGGER (fires at shield application).
  requiresShielded?: boolean;
  // named target-status gate, checked when the trigger fires: the block only activates while the
  // boss currently carries the status of THIS NAME (opened by a `targetStatus` effect). Composes
  // with any real trigger, and with requiresCore. Statuses are name-keyed, so an unrelated kit's
  // status never opens this gate. Omit = no status requirement.
  // e.g. d-killer-wife's burst body-branch ATK buff, requiresTargetStatus: 'Wipe Out' — "when
  // allies hit an area of the Wipe-Out-afflicted target" (core-only proxy via requiresCore; the
  // parts-hit branch awaits destructible-part modeling). Replaced the boolean `requiresWipeOut`
  // 2026-07-23.
  requiresTargetStatus?: string;
  // boss-element gate, checked when the trigger fires: the block only activates
  // when the fight's boss element matches (e.g. helm-aquamarine's burst "when
  // attacking an Electric Code target → +164.83%"; brid-silent-track's FB-enter
  // "all Wind Code enemies → Damage Taken ▲"). Unlike the `bossElement` TRIGGER
  // (a permanent element-gated passive), this COMPOSES with any real trigger
  // (fullBurstEnter/hitCount/burstCast/…). Inert vs a non-matching boss (incl.
  // the neutral scope-lock boss), so it never disturbs graded comps.
  bossElementGate?: string;
  // own-burst gate, checked when the trigger fires: the block only activates when the
  // owner DID ('cast') or did NOT ('notCast') cast their own burst in the rotation leading
  // into this Full Burst. Composes with a `fullBurstEnter` trigger to express "Entering
  // Full Burst AFTER this unit uses her own Burst" ('cast') vs "…WITHOUT using own Burst"
  // ('notCast') — a plain team `fullBurstEnter` over-fires in multi-B3 comps where a
  // DIFFERENT B3 completes the chain. Unlike re-keying to `burstCast` (which fires PRE-FB
  // and loses the +50% Full-Burst major + FB auras), this keeps the block at FB entry.
  // e.g. cinderella-crystal-wave's FB-enter core-strike nuke ('cast'); the inverse is
  // diesel-winter-sweets' Highlight sustained ('notCast'). Evaluated against the same
  // rotationCasters set the burst-caster targets use; inert on graded comps where the unit
  // is the sole/actual burster. Omit = fires on any Full Burst (back-compatible).
  ownBurstGate?: 'cast' | 'notCast';
  // resource-pool gate: block fires only when a named resource (CharacterSkills.resources)
  // is within [min,max] at trigger time — soda-twinkling-bunny's burst ATK ▲65.25% activates
  // only at ≥30 Golden Chips ({name:'goldenChip', min:30}), Hit Rate at ≥20, FB-ext tiers at
  // ≥10/≥20. Evaluated on the PRE-spend pool if the spend effect is ordered after the gated block.
  resourceGate?: { name: string; min?: number; max?: number };
}

// Verbatim kit-text lines an override does NOT represent as blocks — the
// auditable "no silent drops" record, written per slot by the materializer /
// /kit-parse authors.
export type UnmodeledText = Record<SkillSlot, string[]>;

export interface CharacterSkills {
  blocks: Block[];
  warnings: string[];
  unmodeled?: UnmodeledText; // kit text deliberately not modeled (display/audit only)
  modes?: string[]; // user-selectable kit modes declared by the override (first = default)
  hasPierce?: boolean; // kit's attacks are Pierce-tagged → Pierce Damage ▲ feeds Damage Up
  burstSnapshotsPreFb?: boolean; // burst damage resolves pre-FB/pre-stage (per-unit cast timing)
  pierceModes?: string[]; // pierce only while in one of these kit modes (CCW: SR only)
  consolidation?: ConsolidationConfig; // pellet-consolidation mode (dorothy-S) — see OverrideFile / A26
  // named resource pools tracked live per unit (soda-twinkling-bunny's Golden Chip): initialized
  // at setup, adjusted by `resource` effects, read by `perResource` buffs + `resourceGate` blocks.
  resources?: { name: string; initial: number; min?: number; max?: number }[];
}

// Pellet-consolidation mode: after landing N pellets (near-gated), for K shots the unit fires ONE
// aligned bullet (pelletFraction of a full shot) at coreRate with attackDamagePct + Pierce — dorothy-S.
export interface ConsolidationConfig {
  triggerLandedPellets: number;
  shots: number;
  coreRate: number;
  pelletFraction: number;
  attackDamagePct: number;
  pierce?: boolean;
}

