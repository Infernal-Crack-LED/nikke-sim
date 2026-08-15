// Structured skill-effect schema. Produced by the prose parser
// (src/skills/parser.ts) and by hand-written overrides (src/skills/overrides/*.json).

export type SkillSlot = 'skill1' | 'skill2' | 'burst';

export type StatKey =
  | 'atkPct' // ATK ▲ x% (scales target's own ATK)
  | 'casterAtkPct' // ATK ▲ x% of caster's ATK (flat add)
  | 'highestAllyAtkPct' // ATK ▲ x% of the HIGHEST ally's ATK (flat add — guilty "Mind If I Borrow This?"). Resolves to (value/100)×max(all units' staticAtk) at apply time; feeds the same flat-ATK path as casterAtkPct. Solo (self is the max) == casterAtkPct.
  | 'atkOfMaxHpPct' // ATK ▲ x% of the unit's own final Max HP (flat add — Cinderella, Maiden:IR)
  | 'atkOfCasterMaxHpPct' // ATK ▲ x% of the SKILL USER'S final Max HP, granted to the target
  //                    (maxwell-ordinary-mechanic S2). Resolved at APPLY time to a FLAT ATK add
  //                    ((value/100) × the caster's liveMaxHp) and routed to the casterAtkPct
  //                    consumer — uniform across all targets, snapshotted per application. The
  //                    caster's live Max HP follows the e3 scope: own-kit maxHpFlat feeds (the
  //                    caster's own S-stacks count), ally-granted Max HP does not. DISTINCT from
  //                    atkOfMaxHpPct, which re-reads each TARGET'S own live Max HP every frame.
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
  | 'chargeDamagePct' // additive percentage points in the charge bucket
  | 'chargeDamageMultPct' // scales by BASE charge damage (collection items, Helm's max-treasure burst)
  | 'chargeSpeedPct'
  | 'skillCooldownReductionSec' // "Cooldown of Skill X ▼ N sec" — dynamically shortens interval-trigger timers while active
  | 'attackDamagePct' // "Attack Damage" — Damage Up bucket
  | 'sustainedDamagePct'
  | 'sequentialDamagePct' // "Sequential Attack Damage ▲x%" — ADDITIVE in the Damage Up bucket (diluted by other support buffs; e.g. snow-white-heavy-arms)
  | 'sequentialMultPct' // "Damage multiplier of sequential attacks scaled by x%" — a TRUE multiplier on sequential-flavored damage in its OWN multiplicative bucket (NOT diluted; eve Mk2 ×2). Distinct mechanic from the additive sequentialDamagePct above.
  | 'casterMaxHpPct' // grants Max HP = % of CASTER's Max HP ("X% of the skill user's Max HP" — rouge/anis/trina)
  | 'targetMaxHpPct' // grants Max HP = % of the TARGET's OWN Max HP ("Max HP ▲ X%" — blanc/maiden). Same
  //                    e3 feed rule as casterMaxHpPct: only feeds atkOfMaxHpPct when caster === target (self)
  | 'highestAllyMaxHpPct' // grants Max HP = % of the HIGHEST-Max-HP unit's Max HP ("Duplicates X% of the
  //                    Max HP of the Nikke with the highest Max HP" — quency S1). Resolves at APPLY time
  //                    to a flat Max HP grant of (value/100) × max(all units' static maxHp) — the
  //                    highestAllyAtkPct precedent (static basis; the kit says plain "highest", not
  //                    "final"). Same e3 feed rule. Next expected carrier: sin.
  | 'partsDamagePct' // parsed but inert in v1 (no parts on the boss)
  | 'pierceDamagePct' // Damage Up bucket entry for Pierce-tagged attacks (static hasPierce, gainPierce window, or weaponSwap.hasPierce)
  | 'damageTakenPct' // debuff on the boss (positive = boss takes more)
  | 'maxAmmoPct'
  | 'maxAmmoFlat' // Max Ammunition ▲ N rounds — FLAT round count (not %), added on top of the
  //                      maxAmmoPct scaling in maxAmmo() (theme 14: "▲ N round(s)" kit lines that the
  //                      percent-only schema could only approximate — grave/noir/tove/drake/trina)
  | 'reloadSpeedPct'
  | 'reloadSpeedClamp' // "Reload speed is fixed at X% increase/reduction" — clamps effective reload speed pct, ignoring additive buffs
  | 'reloadTimeClamp' // "Reload time is fixed at X sec" — clamps effective reload time to X seconds (frames)
  | 'attackSpeedPct'
  | 'fireRatePct'
  | 'chargeTimeClamp' // "Charge time is fixed at X sec" — clamps effective charge time to X seconds (frames)
  | 'extraHitDamagePct' // flat % of final ATK added per normal-attack hit while active
  | 'trueDamagePct' // Damage Up bucket (doc line 8)
  // Burst-Skill-Damage amplifiers (jackal / trina) — additive Damage-Up terms read ONLY by
  // burst-slot damage instances carrying the matching `burstDesc` scope tag ("Affects 1 enemy
  // unit(s)" vs "Affects all enemies" in the amplified skill's own description). ⚑ bucket
  // placement follows the documented "○○ Damage ▲ → additive Damage Up" family rule
  // (docs/data/nikke-damage-formula.md §2, ginmy-verified for the family, not measured for
  // these two members specifically).
  | 'burstSkillSingleDamagePct'
  | 'burstSkillAoeDamagePct'
  | 'projectileExplosionPct' // Damage Up bucket; only RL kits carry it
  | 'elemAdvantageDamagePct' // Element bucket, active only with elemental advantage (NOT Damage Up)
  | 'distributedDamagePct' // boosts the caster's own distributed-damage hits
  | 'projectileAttachmentPct' // boosts the caster's projectile-attachment procs
  | 'normalAttackPct' // scales the normal attack multiplier (like the SMG/SG doll line)
  | 'pelletCountFlat' // "Number of pellets ▲ N" — flat effective SG pellet-count add for a window.
  //                            Threaded through the SG landing/gauge path so extra pellets pass the SAME
  //                            per-pellet landing fraction / range falloff / shot-level core as the base
  //                            (each pellet = 1/base of the shot). Opt-in; SG-only & swap-off (inert on
  //                            non-SG and when 0). Damage-neutral vs the old normalAttackPct proxy for a
  //                            unit with no OTHER normal-mult; the faithful gain is a real, queryable
  //                            pellet count (effectivePellets) + correct multiplicative interaction with
  //                            any co-active normalAttackPct. Gauge is NOT pumped (energy is per-trigger).
  | 'burstGenPct' // scales the unit's burst gauge contribution
  | 'hitRatePct' // core-hit lift (⚑ derived; sim.ts hrCoreMult; live by default, HRCORE=0 disables)
  | 'defPct' // inert in v1 (self DEF doesn't affect own damage — Endurance cube)
  | 'maxHpPct'; // self Max HP ▲ % (Vigor cube) — converted to a maxHpFlat self-grant in sim.ts, feeds HP-scaling ATK (atkOfMaxHpPct)

export type TriggerDef =
  | { kind: 'passive' } // always active
  | { kind: 'battleStart' } // once at frame 0, durationSec respected (unlike passive)
  | { kind: 'attacked'; count: number } // when the owner has been attacked `count` times
  | { kind: 'burstCast'; stage?: 1 | 2 | 3 } // when the owner casts their burst (optionally only at that stage — Λ kits)
  | { kind: 'fullBurstEnter' } // when full burst begins
  | { kind: 'fullBurstEnd' }
  | {
      kind: 'hitCount';
      count: number;
      countInFb?: number;
      countInFbStage?: number;
      perPull?: boolean; // true = count trigger PULLS (1 per shot), false/omitted = count landed PELLETS (`hitsPerShot` per shot). The SG 10× lever.
      // WHICH attacks advance the counter. Default 'always' — every normal attack accrues, and the
      // block's gates (fbGate/swapGate/…) are checked only when a threshold is CROSSED, so a
      // crossing the gate blocks still SPENDS its N. That is right for a kit worded "every N normal
      // attacks, [effect] during Full Burst" (the counting is unconditional; only the effect is
      // scoped) and WRONG for one worded "landing N normal attack(s) DURING Full Burst", where
      // out-of-window attacks should not count at all.
      // 'gated' = accrue ONLY while the block's own gates pass, i.e. the kit's scope applies to the
      // COUNTING. Opt-in per unit, read off the kit's wording — there is no way to infer which
      // reading a kit means from the block shape alone, so this is authored, never defaulted.
      countScope?: 'always' | 'gated';
    } // fires every `count` cumulative hits; `countInFb` overrides the threshold DURING Full Burst (RRH rocket meter: 120 out of burst → 60 in her FB). `countInFbStage` SCOPES that override: it then applies ONLY during the 10s window after the owner's OWN burst cast at that stage (prose "▼N for 10 sec" granted by that cast — RRH's ▼60 is a Stage-3 line, owner ruling 2026-08-04), NOT any team FB window; without it the any-FB-state convention stays (SWID)
  | {
      kind: 'chargeCounter';
      count: number | number[];
      countInFb?: number | number[];
    } // cycling per-full-charge phase counter:
  // each full charge advances a phase counter; phase P fires (block.effects[P], in order) once its OWN
  // threshold accrues, then the counter resets and advances to P+1. `count`/`countInFb` may be a scalar
  // (same threshold every phase) OR a per-phase array (PREFERRED — the datamined "attack count required
  // to N times" is per-phase). Scarlet: Black Shadow: outside FB [3,6,9], her burst drops it to [1,2,3]
  // for 10s (so one full 3-phase cycle = 6 charges in FB / 18 outside; the 848% phase2 is the RAREST,
  // matching video — N3 focus read shows the large phases barely materialise). +50% FB applies per-proc
  // by landing timing.
  | { kind: 'teamAmmo'; count: number } // fires each time TOTAL ally ammo consumed crosses count (infinite-ammo shots don't consume)     // every N normal-attack hits by the owner
  | { kind: 'shotFired' } // every trigger pull by the owner
  | { kind: 'lastBullet' } // on the owner's last bullet / reload start
  | { kind: 'recovery' } // when the owner RECEIVES a heal (a 'heal' effect targets them) — Crown's "when recovery takes effect"
  | { kind: 'shielded' } // when the owner RECEIVES a shield (a 'shield' effect targets them) — shield-synergy kits (e.g. naga's shield-gate)
  | { kind: 'interval'; sec: number } // fires every `sec` seconds of battle, first at t=sec — kit lines that "just happen" on an internal cooldown with no visible activation clause (snow-white S2a 144.73%, owner-stated 15s CD 2026-07-20). ⚑ first-fire phase (t=sec vs t=0) is a convention; pin from footage when a consumer's cadence is popup-read
  // "Activates when entering Burst Stage N" — the chain REACHES stage N: the gauge fills (N=1) or
  // the stage-(N-1) unit casts (N=2,3). Owner ruling 2026-08-13: entry to stage N is the moment it
  // becomes time to activate burst N, so it LEADS the stage-N cast by the 30f chain gap.
  | { kind: 'stageEnter'; stage: 1 | 2 | 3 }
  // "Activates when an ally uses a Burst Skill" — a stage-N burst is CAST by anyone. One chain step
  // LATER than the same-numbered stageEnter; do not substitute one for the other.
  | { kind: 'stageCast'; stage: 1 | 2 | 3 }
  | { kind: 'bossElement'; element: string } // permanent, but only if the boss has this element
  | { kind: 'unsupported'; raw: string };

export type TargetDef =
  | { kind: 'self' }
  // excludeSelf: "all allies (except self)" — e.g. brid-silent-track burst
  | { kind: 'allies'; excludeSelf?: boolean }
  | { kind: 'enemy' }
  | { kind: 'burstCasters'; stage?: number; element?: string } // allies who cast a burst this rotation
  | { kind: 'nonBurstCasters' }
  // excludeSelf: "N highest-ATK ally (except the skill user)" — miranda, soda-twinkling-bunny.
  // Applied to the candidate pool BEFORE the count-slice (exclude-then-take-N).
  // byFinalAtk: rank by LIVE effectiveAtk (buffed) instead of staticAtk (base) — set ONLY when the
  // kit text literally says "highest/lowest FINAL ATK" (A3, 2026-07-20). Absent = static ranking
  // (kits that say plain "highest ATK", e.g. naga, keep base-ATK ranking per the owner literal-word rule).
  | {
      kind: 'alliesTopAtk';
      count: number;
      excludeSelf?: boolean;
      byFinalAtk?: boolean;
    }
  | {
      kind: 'alliesLowestAtk'; // "N [Burst X] ally unit(s) with the lowest final ATK"
      count: number;
      burst?: 'I' | 'II' | 'III';
      excludeSelf?: boolean; // e.g. Liberalio is immune to charge-speed buffs
      byFinalAtk?: boolean; // rank by live effectiveAtk when the kit says "lowest FINAL ATK" (A3)
    }
  | { kind: 'alliesOfElement'; element: string; excludeSelf?: boolean }
  | { kind: 'alliesOfClass'; cls: string; excludeSelf?: boolean }
  // "all shotgun-wielding allies [(except self)]" — weapon-typed, class-blind
  // (arcana-fortune-mate S1/S2, tove S2/burst). Weapon codes: AR/SMG/SG/SR/RL/MG.
  | { kind: 'alliesOfWeapon'; weapon: string; excludeSelf?: boolean }
  // "the N leftmost <element> ally unit(s) with <weapon>s" (Trina S2's real target)
  | {
      kind: 'alliesOfElementWeapon';
      element: string;
      weapon: string;
      count?: number;
    }
  // "self and N ally unit(s) on both sides" (Rouge's coin coverage — positional)
  | { kind: 'selfAndAdjacent'; sides: number }
  // "the N ally unit(s) with the lowest remaining HP [(except self)]" (blanc/moran survival grants).
  // v1 has no HP pool (immortal boss, nobody takes damage) so "lowest remaining HP" is indeterminate —
  // resolved deterministically to the leftmost `count` allies as a documented stand-in. The Max-HP grants
  // these lines carry are offensively INERT anyway (ally-granted Max HP does not feed a teammate's
  // atkOfMaxHpPct conversion — e3 video rule), so the stand-in choice moves no damage.
  | { kind: 'alliesLowestHp'; count: number; excludeSelf?: boolean };

export type EffectDef =
  | {
      kind: 'buff';
      stat: StatKey;
      value: number;
      durationSec?: number;
      maxStacks?: number;
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
      removeOnReload?: boolean;
      // SELF-STATUS GATE: "Activates ... while NOT in [this buff's own] status" — a recurring NIKKE
      // kit pattern (vesti-tactical-upgrade's Missile Guide: "when performing a Full Charge attack
      // while not in Missile Guide status"). Without this flag, a re-trigger of the SAME buff key
      // (same caster+slot+stat+value) ALWAYS refreshes it (applyBuff always refills shotsLeft /
      // expiresFrame), so a self-consuming trigger — one that both GRANTS the buff and is itself
      // gated on firing while the buff is live — can never lapse: it keeps re-arming its own
      // durationShots/durationSec window before the count/timer reaches zero, producing
      // near-permanent uptime instead of the kit's intended duty cycle (2026-08-03, vesti). When
      // true, this application is SKIPPED (no refresh, no stack) if a buff with the same key is
      // already ACTIVE (not lapsed: expiresFrame in the future AND shotsLeft, if set, > 0) on the
      // target — it only (re-)applies once the prior instance has fully lapsed. INERT for every
      // unit that does not set it (skipped only reads existing.expiresFrame/shotsLeft, both already
      // tracked).
      noRetriggerWhileActive?: boolean;
    }
  | {
      // adjust a named resource pool (declared in CharacterSkills.resources) by `delta` when this
      // block's trigger fires — soda's burst spends 17 chips (delta:-17), her in-FB every-3-normals
      // block earns 1 (delta:1). Clamped to the resource's [min,max]. Order within a slot matters:
      // a spend placed AFTER the resource-gated blocks lets those gates read the PRE-spend pool.
      kind: 'resource';
      name: string;
      delta: number;
    }
  | {
      kind: 'flatDamage'; // instant hit, % of caster final ATK
      atkPct: number;
      flavor?:
        | 'distributed'
        | 'sustained'
        | 'sequential'
        | 'true'
        | 'projectileAttachment'
        | 'projectileExplosion';
      core?: boolean; // direct core strike: receives the core bucket, scaled by core-rate
      crit?: boolean; // this hit can crit (e.g. Ein's Near Feathers)
      noRange?: boolean; // excluded from the +30% full-range bonus (Prydwen-confirmed for Near Feathers)
      noFb?: boolean; // excluded from the +50% full-burst bonus (Q1-calibrated proc exemption)
      delaySec?: number; // flighted damage: lands delaySec later, snapshotting buffs/FB at
      // LANDING (MEASURED 2026-07-14: rapi-red-hood's burst nuke missile
      // lands ~0.4s post-banner inside her window at the full buff state)
      // A full-charge cannon shot dealt as a DELAYED hit while the caster keeps firing her base
      // weapon (snow-white: her AR fires through the ~5s cannon charge; the cannon is one flighted
      // charge shot, NOT a weaponSwap that halts the base weapon — sw.MP4 2026-07-20). These four
      // only take effect on the delaySec path; instant flatDamage riders keep charge:false/noRange:true.
      charge?: boolean; // route through the charge bucket (§1d) — a real full-charge shot
      chargeMultPct?: number; // full-charge multiplier for a `charge` hit when no swap sources it
      // (base AR chargeMultiplier is 0); only read when charge:true
      pierce?: boolean; // Pierce-tagged (Pierce Damage ▲ feeds this hit's Damage-Up bucket),
      // independent of the unit-level hasPierce flag — one-shot/swap-scoped pierce
      rangeOk?: boolean; // opt this DELAYED hit INTO the +30% range bonus (delayed hits force
      // noRange by default; the cannon gets range like the swap shot it replaces)
      requiresPulls?: number; // fires only if the caster has fired >= N shots (MEASURED
      // 2026-07-14: her nuke needs >=1 sticky charge = 120 shots)
      // per-battle-elapsed ramp: scales this hit's atkPct by min(1, elapsed/rampSec) — for a
      // burst component that scales with a stack resource accruing from BATTLE START (cinderella's
      // Beautiful-mirror: 28.9%×12 stacks ramping over ~36s, so an early burst mirrors fewer
      // stacks). Snapshotted at cast/landing. Omit = full (back-compatible). ⚑ per-unit estimate.
      rampSec?: number;
      // Number of physical hits this effect represents for burst-gauge purposes only.
      // Sequential volleys and similar multi-hit flatDamage effects generate gauge per sub-hit
      // in-game, but the engine keeps one aggregated damage instance (so damage totals stay
      // tuned). gaugeHits = N fires skillGauge N times. Omit or 1 = unchanged behavior.
      // Author from the kit prose; see snow-white-heavy-arms / eve / little-mermaid.
      gaugeHits?: number;
      // Kit-description scope tag for the Burst-Skill-Damage amplifier family (jackal/trina):
      // 'allEnemies' when the kit's damage line sits under an "Affects all enemies" clause,
      // 'singleEnemy' under "Affects 1 enemy unit(s)". A tagged burst-slot hit reads the matching
      // burstSkillAoeDamagePct / burstSkillSingleDamagePct amp in the Damage-Up bucket; untagged
      // hits read neither. Authorable only on burst-slot blocks (validated) — the amps amplify
      // "Burst Skill damage", never skill procs.
      burstDesc?: 'singleEnemy' | 'allEnemies';
    }
  | {
      // "%-of-hit repeat" — kit text "Deals Fixed Damage ... equal to X% of the damage dealt
      // by self". A first-class mechanic in the SSOT (docs/data/nikke-damage-formula.md §3:
      // "%-of-hit repeats ('deals X% of the damage dealt') inherit everything from the parent
      // hit implicitly"). When the owner's hit lands for final damage `parentDmg`, this deals an
      // ADDITIONAL function-damage instance of `pct`% x parentDmg.
      //
      // DISTINCT PRIMITIVE FROM `flatDamage`, and not expressible as a field on it: flatDamage
      // scales off the caster's FINAL ATK and then composes its own multiplier stack, whereas a
      // hitRepeat scales off an ALREADY-COMPUTED damage number. Every bucket the parent took —
      // crit expectation, core, the +30% range bonus, Full Burst, element, the charge
      // multiplier, Damage Up, Damage Taken — is already inside that number, so the repeat
      // applies NONE of them again (re-applying any is a double-count) and never cores / never
      // takes range in its own right, exactly as §3's function-damage table requires. Its own
      // multiplier decomposition is all 1s.
      //
      // Folding it into a damage bucket instead (e.g. `chargeDamagePct` = pct x baseCharge)
      // reproduces the total on a body hit ONLY — charge-bucket damage cores and takes range,
      // this does not, so the fold silently over-credits every core hit. That is the fudge this
      // primitive exists to make unnecessary.
      //
      // AUTHORING: carried on a per-pull trigger (`shotFired` / `hitCount` / `chargeCounter`),
      // which the engine dispatches immediately after the pull's own damage instance, and
      // target `enemy` (validate-overrides enforces both). The engine additionally frame-locks
      // it to a damage instance the owner landed on THAT frame, so it can never ride a stale
      // hit. Lands in the owning slot's bucket (skill1/skill2 -> skill, burst -> burst).
      //
      // ⚑ BURST-GAUGE: generates one skill-damage impact of gauge, the same as `flatDamage` and
      // a DoT tick (sim.ts skillGauge — MEASURED for maiden-ice-rose's per-shot rider). Whether
      // a %-of-hit repeat specifically generates energy is UNMEASURED; the engine follows the
      // function-damage precedent rather than inventing an exception. Recipe: a focus recording
      // of a carrier — compare her gauge-bar slope against the same weapon cadence without the
      // proc, or count full bursts over a fixed window.
      kind: 'hitRepeat';
      pct: number;
    }
  | {
      kind: 'dot'; // ticks every intervalSec (default 1); never core-boosted
      atkPct: number;
      durationSec: number;
      intervalSec?: number;
      noRange?: boolean;
      noFb?: boolean;
      crit?: boolean; // this DoT's ticks roll crit at the caster's sheet rate. Sets the tick's crit
      // behaviour EXPLICITLY, overriding the global DOT_CRIT gate in either direction — and that gate
      // has defaulted ON since 2026-07-21 (sim.ts `DOT_CRIT = ENV.DOTCRIT !== 'off'`; DECISIONS), so
      // `crit:false` is the meaningful OPT-OUT for a DoT measured non-crit and `crit:true` is an
      // explicit pin that does not depend on the default. Measured anchors both ways: isabel's ~14.7s
      // periodic hit crits (3 of 11 fires, crit = non-crit ×1.5 exactly;
      // docs/probe-data/isabel-sg-band.json), while jill's acid tick is video-confirmed 99.7%
      // non-crit and mihara-bonding-chain's Ensnaring validated at 1.03 non-crit.
      flavor?:
        | 'distributed'
        | 'sustained'
        | 'sequential'
        | 'true'
        | 'projectileAttachment'
        | 'projectileExplosion';
      // live resource-scaled DoT: each tick's atkPct is recomputed as owner.resources[name] × mult
      // (ignores the static atkPct) — mihara-bonding-chain's Ensnaring DoT (50.05%/s per stack,
      // stacks cancelled on burst + rebuilt), so a stack pool drives the DoT dynamically.
      perResource?: { name: string; mult: number };
    }
  | {
      kind: 'weaponSwap'; // "Changes the weapon in use:" — temporary weapon override
      damagePct: number; // per-shot multiplier while swapped
      chargeTimeSec?: number; // full-charge time (charge weapons)
      chargeTimeClamp?: number; // "Charge time is fixed at X sec" on the swapped weapon (seconds)
      chargeMultPct?: number; // "Full Charge Damage: N% of damage"
      maxAmmo?: number;
      // The swap weapon's OWN datamined fire cadence (pulls/s), when it differs from the base
      // weapon — the swap loads a different shot spec (moran: swap shot_id fires 24/s vs base AR 12/s).
      pullsPerSec?: number;
      // The swap weapon's CLASS, when it differs from the base weapon — drives range-band
      // eligibility + auto-core rate for swap shots (nayuta: SMG base → SR "Memory Incineration" mode).
      // weapon:'SG' additionally routes the swap through the SG pellet-landing model (accuracy-circle
      // miss loss by range band) instead of guaranteed 100% landing (K: literal shotgun swap).
      weapon?: string;
      // Swap weapon's own pellet count, read only when weapon:'SG' — the SG landing/gauge path's
      // pellet base while swapped (falls back to the base char's hitsPerShot if omitted).
      // damagePct is the FULL-SHOT total (all pellets landing), same convention as a real SG
      // unit's normalAttackMultiplier — NOT a per-pellet value.
      pelletCount?: number;
      trueNormals?: boolean; // swap shots are true-flavored (Takina: "Normal attacks deal true damage")
      // The gun is NOT replaced — this "swap" only re-flavors/re-values the weapon already in hand
      // (chisato/clay/jill/frima: "Normal attacks deal true damage for N sec", modeled as a swap
      // because the flavor tag rides the swap state). A same-weapon swap grants NO magazine refill
      // at either end (kit-audit chisato #2 — you keep shooting the same half-spent gun); a REAL
      // weapon change picks up a fresh magazine on entry and hands the base weapon back FULL on exit
      // (owner ruling 2026-08-12, takina). This is the SOLE discriminator for that refill rule —
      // `trueNormals` used to double as the marker, which conflated a damage FLAVOR with the weapon's
      // ammo ECONOMY and made a true-damaging real weapon inexpressible (takina; `laplace` the
      // RL/Iron treasure unit, NOT laplace-ultimate-hero; `eunhwa-tactical-upgrade`, NOT base eunhwa). Diagnostic in the tree: every same-weapon carrier's `damagePct` equals its own
      // `normalAttackMultiplier` exactly (the gun is unchanged, so its damage is too).
      sameWeapon?: boolean;
      hasPierce?: boolean; // swap shots are Pierce-tagged ("Additional Effect: Pierce" scoped to the
      // swapped weapon, snow-white's cannon — owner-ruled 2026-07-20). Feeds the
      // per-shot pierce tag only (Pierce Damage ▲ bucket eligibility); never the
      // static whole-fight hasPierce flag
      durationSec: number; // hard time bound (e.g. the 10s burst window)
      maxShots?: number; // uses-based end: swap terminates right after the Nth swapped
      // shot fires, at variable time (MEASURED 2026-07-14, SWHA)
    }
  | { kind: 'fillGauge'; pct: number } // instantly fills the burst gauge
  | { kind: 'heal'; ticks?: number; intervalSec?: number } // emits recovery event(s) to the target(s) — no HP amount modeled; fires their 'recovery' triggers (heal-synergy kits, e.g. Helm→Crown). A per-second heal-over-time ("Recovers X% every 1 sec for N sec") sets ticks:N (intervalSec default 1) so it emits N recovery events over time, keeping on-recovery consumers refreshed; default ticks:1 = a single instant event (back-compatible)
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
  // Next expected: privaty's "Designated Target" (her skill-2 rider "when the last bullet hits a
  // target in Designated Target status") — NOT enacted, still measurement-gated.
  | { kind: 'targetStatus'; name: string; durationSec: number }
  | {
      kind: 'storedHit'; // accumulates charges that ALL release as hits when full burst begins
      atkPct: number; // per charge, % of caster's final ATK at release time
      charges?: number; // charges added per activation (default 1)
      flavor?:
        | 'distributed'
        | 'sustained'
        | 'sequential'
        | 'true'
        | 'projectileAttachment'
        | 'projectileExplosion';
      core?: number; // per-release core RATE (0..1) via the coreOverride path — aim/range-INDEPENDENT, not the weapon/band acr table. No shipped consumer since 2026-08-04: RRH's attached-rocket explosions were re-ruled core-INELIGIBLE (skill damage — owner footage ruling overturning the 2026-07-16 ~1/3 read; see DECISIONS)
      crit?: boolean; // the release rolls crit at the caster's sheet rate (like every other hit) — removes the stored-hit path's default crit-OFF exemption; consistency, not a new mechanic (RRH explosions crit — orange bodies observed; 2026-07-16 DECISIONS)
      instantInFb?: boolean; // charges added DURING Full Burst detonate immediately that same window (RRH: a rocket that attaches in FB explodes instantly), instead of only batch-releasing at the next FB start
    }
  | { kind: 'burstEligibility'; stage: 1 | 2 | 3 } // unit may also burst at this stage (Rapi:RH Combat Assist)
  | { kind: 'burstFirst' } // takes the FIRST eligible burst of its stage regardless of slot order (Prika duet opener)
  | { kind: 'reenterStage'; stage: 1 | 2 | 3 } // "Re-enters Burst Stage N": the rotation stays at stage N so ANOTHER eligible unit can also cast (Tia, Anis:Star Everyone's Star)
  | { kind: 'advantageVs'; element: string } // counts as elementally advantaged vs this boss element
  | { kind: 'burstCdr'; seconds: number; oncePerBattle?: boolean } // reduce targets' burst cooldowns
  | { kind: 'escalating'; steps: EffectDef[] } // Liter-style "Once:/Twice:/…": Nth activation applies steps 1..N
  | { kind: 'fullBurstExtend'; seconds: number }
  | { kind: 'unlimitedAmmo'; durationSec: number }
  // "Removes N% of ammunition" / forced-reload dump (theme 15): empties the target's current
  // magazine by `fraction` of MAX capacity (default 1 = 100%, the whole belt) and, if that drops
  // the belt to 0, forces an immediate reload (fires lastBullet triggers, same as firing dry).
  // The inverse of instantReload. e.g. grave's Prediction-end forced reload, asuka-wille, jill.
  | { kind: 'consumeAmmo'; fraction?: number }
  | {
      kind: 'gainPierce'; // "Gain Pierce": the target's attacks count as Pierce-tagged, so its (and
      // teammates') Pierce Damage ▲ buffs go live.
      durationSec?: number; // timed "for N sec" window
      // ROUND-COUNT window: "Gain Pierce for N round(s)" / "for 1 shot" — a BUDGET spent by FIRING,
      // not by the clock, mirroring the round-scoped buff rule (`durationShots` on a buff): one
      // round per pull, hitsPerShot per pull for MG, counted whether or not ammo was deducted, and
      // the GRANTING round never spends the budget (N rounds AFTER the grant). The alternative a
      // durationSec stand-in gives you drains through reloads and lulls and can leave the next
      // round the unit fires untagged; a budget waits for the round.
      // Pinned by scripts/tests/engine/gain-pierce-rounds.test.ts.
      // Five kits print this form. FOUR use this field: nihilister / harran (1 round), neve (2),
      // d-killer-wife ("for 1 shot"). The fifth, dorothy-serendipity ("Gains Pierce for 3
      // round(s)"), deliberately does NOT and must not be "converted": her grant shares one
      // trigger and one 3-round window with the "Pellet count is fixed at 1" clause beside it, so
      // it rides her `consolidation` block's `pierce: true` → the per-shot `pierceActive` tag,
      // which scopes pierce to exactly the consolidated rounds. Encoding it here as well would
      // double-book the same window.
      durationShots?: number;
      // BOTH ABSENT = continuous/permanent (pierceUntilFrame → ∞) — used to STEP-GATE pierce that
      // turns on only after a stack threshold (ade-agent-bunny: on a hitCount:10 "Spy Lens at max
      // stacks" trigger, replacing an always-on-from-t=0 hasPierce flag that a boolean can't
      // step-gate). If BOTH are given, both windows run and pierce is live while EITHER holds.
    }
  | {
      // "Convert excess value over X% of <stat A> to <stat B>. B ▲ R% of the excess value
      // continuously." A DERIVED stat: B is recomputed from A's live value every time it is read,
      // so it tracks A's stacks up and down instead of being baked to a constant.
      //
      // ONE carrier today — `red-hood` S1 ("excess over 100% of Charge Speed → Charge Damage ▲240%
      // of the excess"). Built anyway on owner direction (2026-08-11) because the alternative was a
      // hand-averaged constant, and an average of a ramp is wrong at both ends: hers shipped
      // `chargeDamagePct` 90 against a 1.92-at-zero-stacks / 93.36-at-ten-stacks range.
      //
      // ⚠ `from` is read as the target's LIVE TOTAL for that stat, allies included — which is what
      // the kit says ("excess value over 100% of Charge Speed", not "of your own Charge Speed").
      // So 93.36 is her SOLO-KIT ceiling, not a cap: six roster units grant `chargeSpeedPct` to
      // allies, and on her graded `PA MiKa` comp `alice`'s ▲11.67 carries her to 153.4. A carrier's
      // output is therefore team-composition-sensitive in a way a baked constant never was.
      //
      // The 100% threshold is not arbitrary — the engine already caps `chargeSpeedPct` at 100 when
      // it computes charge time, so the excess genuinely does nothing until a kit line converts it.
      kind: 'convertExcess';
      from: StatKey; // the stat whose overflow is converted (read live, incl. stacks)
      over: number; // the threshold it must exceed (percentage points)
      to: StatKey; // the stat the overflow is converted INTO
      rate: number; // % of the excess granted, e.g. 240 = ▲240% of the excess
    }
  | {
      kind: 'addStack'; // "Increases the stack count of stackable buffs by N"
      count?: number; // stacks to add (default 1)
      stat?: StatKey; // optional filter: only buffs with this stat receive stacks
    }
  | { kind: 'instantReload'; fraction?: number } // refill magazine (fraction of max, default full)
  | { kind: 'stun'; durationSec: number } // target can't fire/charge/reload (bursting unaffected)
  | {
      kind: 'stackedNuke'; // Maiden:IR MP — hits once per full burst the unit SAT OUT since its last burst
      atkPct: number; // per stack, % of final ATK
      hpPct?: number; // per stack, % of final Max HP added on top
      maxStacks?: number; // default 12
    }
  // OFFLINE-PARSER-ONLY kinds: emitted by scripts/lib/kit-parser.ts while
  // authoring/materializing, but NEVER valid in an override JSON (the validator
  // rejects them) — such kit text belongs verbatim in the override's `unmodeled`
  // field instead. The engine has no branch for either kind.
  | { kind: 'ignored'; note: string } // recognized, deliberately unmodeled (defensive etc.)
  | { kind: 'unsupported'; raw: string }; // unparseable

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
  // for kit gates keyed to a NAMED partner rather than a squad (eunhwa-tactical-upgrade's S2, gated
  // on emma-tactical-upgrade). For "an ally from the same squad" wording use `sameSquad` below, which
  // states the condition instead of enumerating today's answer to it.
  // `sameSquad`: the team contains SOME OTHER ally from the OWNER's squad — the primitive for kit
  // gates worded "an ally from the same squad … on the battlefield" (blanc's S2 burst-CDR). Squad
  // membership is curated in src/data/squads.ts (characters.json has no squad axis); the "still on
  // the battlefield" clause is scope-trivial (nobody dies at scope lock), so the gate is
  // composition-only. FAILS CLOSED: an owner with no curated squad never satisfies the gate
  // (validate-overrides.ts rejects the authoring). Prefer this over `.slugs` for same-squad gates.
  teamHas?: {
    element?: string;
    class?: string;
    weapon?: string;
    burst?: string;
    slugs?: string[];
    // literal `true`, never `false`: the facet is opt-in and omitting it means "no
    // squad gate", so `sameSquad: false` would read as an explicit negative gate the
    // engine does not implement (sim.ts treats falsy as unconstrained). This is the
    // contract validate-overrides.ts enforces at authoring time — typed so the
    // compiler catches it first.
    sameSquad?: true;
  };
  // mode gate: block active only when the unit's selected mode matches (the
  // override's top-level `modes` array declares the choices; first = default)
  mode?: string;
  // effects apply only on every Nth activation of this block's trigger
  // (e.g. Mast's Hangover: every 3rd full-burst end)
  everyN?: number;
  // phase for everyN: fire on activations ≡ offset (mod everyN), e.g. offset 1 + everyN 3
  // fires on the 1st, 4th, 7th… activation (Neon:VE starts at full Firepower Gauge)
  everyNOffset?: number;
  // BLOCK-LEVEL DELAY: the block's EFFECTS apply delaySec seconds after its TRIGGER fires.
  // Every gate above (fbGate / swapGate / requiresCore / requiresShielded / bossElementGate /
  // ownBurstGate / resourceGate / teamHas / everyN) is evaluated at TRIGGER time — the state the
  // kit line's activation clause actually reads — while targets and effect values resolve at
  // LANDING. For kit lines whose activation condition is only satisfied a fixed time after the
  // observable event that causes it, e.g. flora's S2-2 "when either adjacent ally reaches max HP":
  // her S1's 2-second Max HP grant is what drops the allies below max, so they return to max
  // exactly 2 sec after Burst Stage 2 entry (`stageEnter{stage:2}` + delaySec 2).
  // A landing frame past the end of the fight simply never applies.
  // Distinct from `flatDamage.delaySec`, which is FLIGHT time on ONE damage effect (a missile in
  // the air, snapshotting buffs at impact) — this delays the WHOLE block, effects of any kind.
  // Omit or 0 = applied inline on the trigger frame (strict no-op; pinned by
  // scripts/tests/engine/block-delay.test.ts).
  delaySec?: number;
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
  hasTrueNormals?: boolean; // kit's normal attacks are ALWAYS True-flavored (no swap gate) →
  // ally True Damage ▲ buffs feed them. STATIC whole-fight, unlike weaponSwap.trueNormals
  // (chisato's/takina's/base laplace's — slug `laplace`, RL/Iron — temporary swap-scoped flavor
  // change). Set only on kit-confirmed carriers; today's sole user is the buffer-board's synthetic
  // typed-carry adaptation (src/ranks/buffer.ts deriveCarrySpec), since no real roster unit's
  // normals are true-flavored outside a swap window.
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
