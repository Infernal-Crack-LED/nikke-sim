export type Weapon = 'AR' | 'SG' | 'RL' | 'SR' | 'MG' | 'SMG' | 'Pistol';
export type BurstType = 'I' | 'II' | 'III' | 'Λ';
export type Element = 'Fire' | 'Water' | 'Wind' | 'Electric' | 'Iron';
export type NikkeClass = 'Attacker' | 'Supporter' | 'Defender';

export interface BaseStats {
  resourceId: number;
  atk: number;
  hp: number;
  def: number;
  critRate: number;    // percent, e.g. 15
  critDamage: number;  // percent multiplier, e.g. 150
  maxLevel: number;
  grade: { ratio: number; atk: number; hp: number; def: number };
  core: { atk: number; hp: number; def: number };
}

// Skill activation cooldowns in SECONDS, sourced by bakery-bot from the community wiki
// (Fandom) and folded into the DB's skill_descriptions jsonb. Per slot: a number = seconds,
// `null` = no cooldown (a passive skill — must never be scheduled on a timer). The whole object
// being ABSENT from a character (see CharacterData.skillCooldownsSec being optional) means
// "unknown" — the unit hasn't been matched to its wiki page yet — which is distinct from a
// null slot. Cooldowns are static kit data (they do NOT scale with skill level), same for
// every account. See docs/handoffs/2026-07-20-skill-cooldowns-to-sim.md (bakery-bot contract).
export interface SkillCooldownsSec {
  skill1: number | null;
  skill2: number | null;
  burst: number | null;
}

export interface CharacterData {
  slug: string;
  name: string;
  imageUrl: string | null;
  weapon: Weapon;
  burst: BurstType;
  burstCooldownSec: number;
  class: NikkeClass;
  element: Element;
  // Every element this unit counts as for ELEMENTAL ADVANTAGE — its own code plus any granted by
  // its kit (Rapi: Red Hood's Skill 2 gives Electric-code advantage, i.e. she also counts as Iron).
  // Derived from the override's `advantageVs` effects by src/data/sync.ts; OMITTED for the normal
  // case of a unit that only counts as its own code. Read it via unitElements() (src/elements.ts),
  // never bare — the engine resolves advantage from the effect itself and ignores this field.
  countsAsElements?: Element[];
  manufacturer: string | null;    // Elysion/Missilis/Tetra/Pilgrim/Abnormal — drives the relationship
                                   // (bond) ATK bonus, which is a class×manufacturer stat (Pilgrims cap higher)
  normalAttackMultiplier: number; // % of ATK per trigger pull (all pellets/hits included)
  coreAttackMultiplier: number;   // % — 200 = core hits deal 2x
  ammo: number;
  reloadFrames: number;           // wall-clock reload, 60fps frames
  chargeFrames: number;           // RL/SR frames to full charge (0 otherwise)
  chargeMultiplier: number;       // % — total charge factor, e.g. 250
  hitsPerShot: number;            // hits per trigger pull (for hit-count skill triggers)
  rl3: number | null;             // burst gen: % of gauge generated per 3 seconds
  burstGaugePerShot: number | null;
  treasure: boolean;              // has a Treasure (favorite item); DB prydwen_slug ends -treasure
  // Support tags (sync.ts second stage). Independent — a unit can be one, both, or
  // neither. Neither = "unsupported": pulled in for Team Builder browsing only, never
  // offered by the sim/roster-sim engine tabs or the DPS chart/generator tabs.
  generatorSupported: boolean;    // enikk top-100-proven (data/enikk-supported.json) — DPS
                                   // chart + the Team/Roster/Custom-DPS generator tabs
  simSupported: boolean;          // has a hand-tuned kit override (src/skills/overrides/) —
                                   // Team Sim, Roster Sim, Optimize Overload, Overload
                                   // Breakpoints. Today == generatorSupported (74/74 overrides
                                   // authored); will outgrow it as more kits get overrides.
  nicknames?: string[];           // APPROVED community nicknames (src/data/nicknames.ts derivation)
  skills: { skill1: string; skill2: string; burst: string };
  // Raw, UNPRUNED blablalink roledata snapshot (game source-of-truth), passed through verbatim
  // from the DB `role_*` jsonb columns. Field names inside are blablalink snake_case. Nothing in
  // the engine reads this yet — it is staged in characters.json so we can later migrate weapon
  // timing/profile fields off the live Synergy API onto it and prune the redundant end. See
  // docs/handoffs/skill-data-sim-side-handoff.md ("role_* snapshot columns").
  role?: RoleSnapshot;
}

// One key per DB `role_*` column, prefix stripped. Deliberately loose (`unknown`) — this is an
// unpruned passthrough; do not model it until a field is promoted to a real engine input.
export interface RoleSnapshot {
  weapon?: unknown;       // role_weapon: shot_id, bonusrange_min/max, shot_detail (firing model)
  burstMeta?: unknown;    // role_burst_meta: use_burst_skill, change_burst_step, burst_apply_delay, burst_duration
  skillDetails?: unknown; // role_skill_details: ulti/skill1/skill2 ids + tables + full skill-detail blocks
  statScaling?: unknown;  // role_stat_scaling: grade_core_id, grow_grade, stat_enhance_detail
  element?: unknown;      // role_element: element_id, element_details
  piece?: unknown;        // role_piece: piece_id, piece_detail (Limit-Break item)
  meta?: unknown;         // role_meta: original_rare, class, corporation, critical_*, categories
}

export interface LevelMultiplier {
  attack: number[];
  hp: number[];
  def: number[];
}

export interface DataFile {
  syncedAt: string;
  characters: Record<string, CharacterData & { baseStats: BaseStats | null }>;
}

// ---- structured event log (test instrumentation) ----
//
// `SimConfig.onEvent` turns the engine's internal timeline into ASSERTABLE data. The board gates
// FIT (does the number match the recording); unit tests gate FAITHFULNESS (does the kit line fire
// on the right trigger, at the right target, in the right scope) — and total-damage deltas can
// only test faithfulness indirectly. The DBG_* env taps already PRINT most of this; the hook makes
// it structured instead of grep-able. See docs/handoffs/2026-07-23-tdd-transition-plan.md §1d.
//
// CONTRACT:
//   - PURE OBSERVATION. The engine never reads back from a handler, and a handler must never mutate
//     the objects it is handed (they are the engine's live state, not copies). Throwing from a
//     handler propagates out of runSim.
//   - ZERO-COST WHEN UNSET. Every emit site is guarded by `if (onEvent)`, so an unset hook costs one
//     truthiness check and allocates nothing. Sim output is byte-identical either way — the
//     regression snapshot is the control.
//   - `frame` is the 60fps frame index; `sec` is frame/60, provided so tests read in kit units.
//
// DELIBERATE SCOPE (what is NOT emitted, and why):
//   - There is no `buffExpire` for TIME or ROUND-COUNT expiry. Buff lapse is LAZY in this engine —
//     `stat()` skips lapsed entries at read time, and nothing ever sweeps the list — so there is no
//     moment to emit. `buffApply` carries `expiresFrame`/`durationShots`, which is the assertable
//     contract; `buffRemove` fires only for a genuine REMOVAL from the list (today: removeOnReload).
//   - There is no separate `hit` event. `damage` is one event per damage INSTANCE — the granularity
//     `dealDamage` works at, which every source funnels through (normal fire, skill/burst riders,
//     DoT ticks, flighted hits, stored-hit releases). That is NOT one event per game-side hit: an MG
//     pull covers `hitsPerShot` belt rounds and an SG pull covers the whole pellet spray (landing
//     folded into the coefficient), each as ONE instance. Per-bucket totals are a fold over it.
//     A `hitCount`-triggered kit line counts HITS, not instances — read `hitsPerShot` for that.
//   - Only `applyBuff` grants are logged. Cube/OL permanent stats are pushed onto the buff list
//     directly at setup, so a unit's live buff set cannot be reconstructed from events alone.
//   - `onEvent` is a function, so a SimConfig carrying one cannot cross a worker boundary
//     (structuredClone throws on functions). Today no web caller sets it.
export type SimEventBase = { frame: number; sec: number };

export type SimEvent =
  /** One trigger pull. Emitted after the shot's damage and block dispatch have resolved. */
  | (SimEventBase & {
      kind: 'shot';
      unitIdx: number;
      slug: string;
      charged: boolean;
      /** Magazine ordinal = how many `reload` events this unit has had (0 on the first magazine).
       *  It counts RELOAD-TO-MAX only — an `instantReload` skill refill, a weapon-swap entry/exit
       *  refill and a per-shot ammo refund all top the magazine up WITHOUT advancing it, exactly as
       *  they do not fire `removeOnReload`. On a unit with those, this is not "the Nth clip". */
      magIndex: number;
      /** Rounds left after this pull (unchanged when the shot was unlimited-ammo). */
      ammoAfter: number;
      unlimitedAmmo: boolean;
    })
  /** One damage instance, at the single choke point every source passes through. */
  | (SimEventBase & {
      kind: 'damage';
      unitIdx: number;
      slug: string;
      bucket: 'normal' | 'skill' | 'burst';
      /** WHICH KIT LINE produced this instance: the owning skill slot, 'normal' for weapon fire,
       *  or null where the engine genuinely has no single source (`extraHitDamagePct` is a SUMMED
       *  buff stat, so its rider cannot name one). `bucket` is the damage CATEGORY and does not
       *  distinguish skill1 from skill2 — this does, which is what a per-kit-line spec asserts on. */
      srcSlot: 'normal' | 'skill1' | 'skill2' | 'burst' | null;
      amount: number;
      atkPct: number;
      /** ATK after the flat boss-DEF subtraction — the value `amount` is built from. */
      baseAtk: number;
      /** Whether this instance was ELIGIBLE to crit / core (not whether a roll landed). */
      critEligible: boolean;
      coreEligible: boolean;
      /** Resolved rates actually used, 0..1 (0 when not eligible). `critRate` is the reason a
       *  normal-attack-scoped buff like critRateNormalPct is directly assertable per bucket. */
      critRate: number;
      coreRate: number;
      inFullBurst: boolean;   // an FB window was live at this frame
      fbMajorApplied: boolean; // ...and this instance actually took the +50% (noFb units/lines do not)
      rangeApplied: boolean;
      /** The multiplier decomposition, exactly as the damage formula composes it
       *  (docs/data/damage-calculation.md). amount = baseAtk × atkPct/100 × the product of these. */
      mult: {
        major: number;
        elem: number;
        charge: number;
        dmgUp: number;
        seqMult: number;
        projFactor: number;
        taken: number;
        distributed: number;
      };
    })
  /** A buff/debuff applied or refreshed. `key` encodes caster slot + skill slot + stat + value. */
  | (SimEventBase & {
      kind: 'buffApply';
      key: string;
      stat: string;
      value: number;
      stacks: number;
      maxStacks: number;
      /** Slot index of the caster; null when the engine did not attribute one. */
      casterIdx: number | null;
      /** Slot index of the holder; null = the BOSS (an enemy debuff). */
      targetIdx: number | null;
      targetSlug: string | null;
      refresh: boolean;             // true = refreshed/re-stacked an existing entry
      expiresFrame: number | null;  // null = no wall-clock expiry
      durationShots: number | null; // round-count budget ("for N round(s)"), null = none
    })
  /** A buff genuinely REMOVED from a unit's list (see the no-buffExpire note above). */
  | (SimEventBase & {
      kind: 'buffRemove';
      unitIdx: number;
      slug: string;
      key: string;
      stat: string;
      cause: 'reload';
    })
  /** Reload to MAX ammunition — the event `removeOnReload` keys off. */
  | (SimEventBase & {
      kind: 'reload';
      unitIdx: number;
      slug: string;
      /** 'magazine' = the weapon's own reload completed; 'transitionSnap' = the fast-reloader
       *  snap-refill at a boss range transition (both are genuine reload-to-max events). */
      cause: 'magazine' | 'transitionSnap';
      magIndex: number;
    })
  /** A burst skill cast, at the stage it filled. */
  | (SimEventBase & {
      kind: 'burstCast';
      unitIdx: number;
      slug: string;
      stage: number;
    })
  /** Full Burst window boundaries. */
  | (SimEventBase & { kind: 'fullBurstStart'; endFrame: number })
  | (SimEventBase & { kind: 'fullBurstEnd' });

// ---- sim configuration ----

// Gear set level. 'base5' = scope-lock base gear (default validation basis); 0/5 =
// Full T10 overload set at OL0/OL5. See src/stats.ts GEAR_ATK + docs/data/gear-doll.md.
export type GearLevel = 'base5' | 0 | 5;

export interface SimConfig {
  slugs: string[];          // 5 slugs, slot order 1..5
  bossElement: Element | null;
  bossDef: number;          // flat enemy DEF subtracted from effective ATK
  level: number;
  copies: number;           // 0-10 → grade = min(3, c), core = clamp(c-3, 0, 7)
  doll: boolean;
  ol: GearLevel;
  coreHitRate: number;      // 0..1, default 0
  rangeBonus: boolean;      // +0.3 major modifier
  durationSec: number;      // 180
  // --- experimental / A-B knobs (undefined = current default behaviour) ---
  projExplOnRlNormals?: boolean; // U4: RL normals get projExpl in Damage Up (default ON per user, 2026-07-13)
  // camera-focused unit (charge weapons on the focused unit generate x2.5 gauge).
  // Default: formation slot 3 = index min(2, n-1) — user convention 2026-07-13: the
  // MIDDLE character always holds camera focus unless a run says otherwise. Set for
  // recorded runs where a different unit held focus.
  focusSlug?: string;
  // Relationship (bond) level applied to ALL units this run (per-unit PreparedUnit.relationshipLevel
  // overrides). Undefined → each unit uses its manufacturer's MAX bond level (scope-lock basis, and
  // the web default). See src/relationship.ts, open-questions U18.
  relationshipLevel?: number;
  // Monte Carlo mode: when set, crit and core-hit rolls are sampled per instance
  // (full bonus or nothing) instead of expectation-folded, the boss's range-band
  // transition times jitter by up to ±2s, and burst-chain cast gaps jitter — matching
  // the two dominant real-run variance sources (user, 2026-07-13). Same seed = same
  // fight. undefined = deterministic expected-value sim (web UI default).
  seed?: number;
  // Boss silhouette size → SG pellet-landing profile (seeded runs only; backend, not exposed on
  // the front end yet — 2026-07-17). Governs how many of a shotgun's pellets the boss body catches:
  //   'small'  (default) = the measured jitter ranges as-is (near/mid {8,9,10}, midfar {7,8,9}, far {6,7,8})
  //   'medium' = each drawn landed-pellet count +1, clamped at full pellet count (near/mid → 84% 10 / 16% 9)
  //   'large'  = every band lands the full pellet count (a big boss the whole spray hits)
  // Inert in expected-value (unseeded) runs — those use the fixed SG_LANDING_BY_BAND table. ⚑ UNVERIFIED.
  bossPelletProfile?: 'small' | 'medium' | 'large';
  // Structured event log for tests/tooling. Unset (the default everywhere in production) = the
  // engine emits nothing and behaves byte-identically. See the SimEvent contract above.
  // NB it is a function, so JSON.stringify drops it — snapshots that serialize `result.config`
  // are unaffected.
  onEvent?: (ev: SimEvent) => void;
  // Never cast a burst — the fight is played with bursting turned OFF, which the owner can do
  // in game. The burst CHAIN never opens, so no burst is cast, no stage advances and Full Burst
  // never happens; the gauge still fills and simply sits pinned at 100, exactly as it does in a
  // real fight where the player never presses. Unset (the default everywhere in production) =
  // current behaviour, byte-identical.
  //
  // Added for the BASE-WEAPON faithfulness basis (docs/data/clean-weapons.md): the six
  // clean-weapon units are recorded with bursting off, so the sim must model that directly
  // rather than relying on their burst blocks happening to be empty.
  disableBursts?: boolean;
}
