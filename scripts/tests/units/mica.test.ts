// PER-UNIT KIT SPEC — `mica` (Mica — RL / Supporter / Wind / Burst I, cd 20s, ammo 6,
// reloadFrames 141, chargeFrames 60, chargeMult 250, normalMult 61.3, SR rarity).
// Kit-autonomy gauntlet 2026-08-05 (test-first re-derivation).
//
// ⚠ EXACT SLUG: `mica` is the BASE unit (RL/Wind/B1). `mica-snow-buddy` (SMG/Iron, aka
// "msb") is an ENTIRELY DIFFERENT unit. lint-slug-disambiguation flags every bare
// "Mica"/"mica" token for this pair — including the slug itself, so NO text form passes
// clean (the base unit has no approved nickname); the confirmation is recorded here and
// in the override/manual-review headers per the mary precedent — this spec is about the
// RL/Wind supporter only.
//
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/mica.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates
// exactly as a verification gauntlet would (jackal/himeno precedent).
//
// SR RARITY (original_rare SR) → the plain scope-lock ceiling (copies 10 ⇒ 3★ + core 7)
// is an SSR ceiling an SR unit can never reach: unitLimits {stars:3, core:0} (himeno /
// belorta precedent).
//
// Kit (blablalink prose, data/characters.json → characters.mica.skills, lvl 10):
//   S1 ■ attacked 20× → self:
//        DEF ▲39.18% for 10S                                     [ENCODED, DORMANT — M1]
//   S2 ■ 2 allies with the highest final ATK (20s cooldown, no activation clause):
//        Max Ammunition Capacity ▲2 round(s) for 10 sec                        [FAITHFUL — M4]
//        DEF ▲19.89% for 10 sec                                                [FAITHFUL — M5]
//   BU ■ all enemies (Burst I, cd 20s):
//        152.22% of final ATK as Burst Skill damage                            [FAITHFUL — M6]
//        DEF ▼13.32% for 5 sec                                               [MODELED — M7]
//
// Mica is a wind-element B1 SUPPORTER whose kit splits into three families:
//
//   • M1 (the whole S1 sentence) is gated on "attacked 20 times" — a counter of hits
//     RECEIVED — and is ENCODED kit-verbatim on the `attacked` trigger (owner ruling
//     2026-08-13: encode it for family consistency even though it is inert today).
//     It is dormant BY MECHANISM: the engine's ONLY caller of recordAttack is the
//     `manualAttacks` test hook, so no production comp can advance the counter, and the
//     effect side (self DEF ▲39.18%) would be damage-INERT even if it fired (self DEF
//     never feeds damage dealt).
//     Family state, verified against the tree rather than assumed — an earlier version of
//     this header had it backwards on three units. ENCODED: makima/20, admi/20, jackal/10,
//     yulha/30, anis/40, mica/20. Still UNMODELED: maiden, noise, rapi — the remaining
//     follow-up, deliberately not swept here.
//     Dormancy is pinned from BOTH sides, since "no buff appears" alone would also be what
//     a broken encoding looks like: the block ships with the kit's shape and emits zero
//     applications normally, but firing 20 attacks through the hook DOES apply it. The
//     attacks-misread counterfactual (hitCount:20 on her OWN shots) stays red.
//   • M4/M5 (S2) is the kit's load-bearing channel: a 20s-CD skill with NO activation
//     clause = interval:20 (the CD-driven skill2 convention — poli/himeno precedent; first
//     fire at t=20s, 50% duty cycle: 10s window every 20s), targeting the 2 allies with
//     the highest FINAL ATK (alliesTopAtk{count:2, byFinalAtk} — quency carries the
//     identical wording with the identical encoding; no "(except the skill user)" clause,
//     so the pool includes the caster, but base ATK 450 keeps mica out of the top-2 on any
//     realistic comp — in the fixture the holders are ada+helm at 600). The AMMO line is a
//     weapon-state modifier (hard rule 1 / prior 9): maxAmmoFlat 2 — the theme-14
//     FLAT-round primitive ('▲ 2 round(s)' is a magnitude in flat rounds; maxAmmo() =
//     round(base×(1+pct/100)) + flat, so the nearest-wrong maxAmmoPct 2 computes
//     round(6×1.02) = 6 and silently never extends a magazine). Extended magazines mean
//     fewer reloads → more shots → more gauge and more damage for the holders. The DEF
//     half rides the same block, damage-INERT in v1 (byte-identical removal is pinned).
//   • M6 (burst damage) is a standard burstCast flatDamage nuke (harran/milk precedent):
//     her OWN cast, never fullBurstEnter — as the SOLE B1 she casts every Full Burst so
//     both keyings fire equal COUNTS; the discrimination is TIMING: the cast lands BEFORE
//     the Full Burst window opens, so the nuke never takes the +50% FB major (milk K5
//     precedent: discriminate by the fbMajor flag, not the count). 'All enemies' collapses
//     to the single partless boss.
//   • M7 (burst DEF▼) is MODELED (encoded 2026-08-10): a SIBLING burstCast → enemy defPct
//     -13.32 /5s block on the enemy DEF channel (bossDefNow scales cfg.bossDef, floor 0;
//     channel damage math owned by scripts/tests/engine/enemy-def-debuff.test.ts; a sibling
//     so the M6 flatDamage-keyed trigger patcher stays surgical — anis precedent).
//     Nearest wrong model: laundering the DEF▼ into damageTakenPct (a different mechanic —
//     the boss taking more damage) would fabricate a team lift the kit never grants; the
//     ABSENCE pins prove the shipped override is not that model.
//
// Fixture: mica/admi/ada/helm, forced-neutral boss (null), camera focus mica (RL is a
// charge weapon ⇒ ×2.5 burst gauge). Mirrors jackal's B1 shape minus liter (liter is also
// Burst I and would alternate the stage-I slot, halving mica's casts): mica is the SOLE B1
// (20s CD covers stage I alone; admi B2 20s; ada + helm B3 40s alternate), so she casts
// every Full Burst. admi sits in the B2 slot INSTEAD OF jackal's crown for a ranking
// reason: mica's S2 selects by LIVE final ATK (byFinalAtk), and crown's S1 grants a large
// casterAtkPct flat ATK add to every burst caster for 15s of each 20s cycle, which would
// re-rank the pool at every firing and drag mica herself into the top-2; admi's only
// grants are reloadSpeedPct + critDamagePct (her burst) — neither moves ATK, so the
// ranking stays static-shaped: base ATK 450 (mica) / 500 (admi) / 600 (ada) / 600 (helm)
// ⇒ top-2 = {ada, helm} at every firing, lowest-2 = {mica, admi} (ada's own self
// atkPct/casterAtkPct windows only lift her FURTHER). Boss-debuff hygiene: admi has NO
// enemy-targeted blocks (her S1/S2 are unmodeled; her burst buffs allies), ada's are DoTs
// and helm's are flatDamage (damage events, not buffs) — so every boss-held buffApply in
// this fixture is mica's own M7 defPct shave (any other shape would be a laundering of
// it). Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['mica', 'admi', 'ada', 'helm'] as const;
/** slot order: mica 0 / admi 1 / ada 2 / helm 3. */
const MICA = 0;
const ADMI = 1;
const ADA = 2;
const HELM = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: null,
    focusSlug: 'mica',
    unitLimits: { mica: { stars: 3, core: 0 } },
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** M1 the 'attacks-misread' mis-model: "attacked 20 times" read as "attacks 20 times"
 *  (hitCount on mica's OWN shots) — the nearest-wrong trigger encoding. */
const m1AttacksMisread = withPatchedOverride('mica', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 20 },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'defPct', value: 39.18, durationSec: 10 }],
  });
});
/** M2 wrong duty cycle: the whole S2 as ONE permanent passive (no 20s interval, no expiry). */
const m2Passive = withPatchedOverride('mica', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.map((b: any) => ({
    ...b,
    trigger: { kind: 'passive' },
    effects: b.effects.map((e: any) => {
      const { durationSec: _durationSec, ...rest } = e;
      return rest;
    }),
  }));
  if (ov.skill2.length !== before || before === 0) {
    throw new Error('mica skill2 blocks missing — fixture is stale');
  }
});
/** M3 wrong scope: buffs ALL allies instead of the 2 highest-final-ATK. */
const m3AllAllies = withPatchedOverride('mica', (ov) => {
  for (const b of ov.skill2) {
    if (b.target?.kind === 'alliesTopAtk') {
      b.target = { kind: 'allies' };
    }
  }
});
/** M3 wrong rank direction: the 2 LOWEST-final-ATK allies instead of the 2 highest. */
const m3Lowest = withPatchedOverride('mica', (ov) => {
  for (const b of ov.skill2) {
    if (b.target?.kind === 'alliesTopAtk') {
      b.target = { kind: 'alliesLowestAtk', count: 2, byFinalAtk: true };
    }
  }
});
/** M4 nearest-wrong magnitude encoding: the flat-round line as a percent (maxAmmoPct 2 →
 *  round(6×1.02) = 6 — never extends a magazine). */
const m4AmmoPct = withPatchedOverride('mica', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'maxAmmoFlat');
  if (!e) {
    throw new Error('mica S2 maxAmmoFlat effect missing — fixture is stale');
  }
  e.stat = 'maxAmmoPct';
});
/** M4/M5 reference: the whole S2 removed (functional baseline). */
const m4NoS2 = withPatchedOverride('mica', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('mica skill2 blocks missing — fixture is stale');
  }
});
/** M5 nearest-wrong misread: the S2 DEF grant as an OFFENSIVE atkPct buff (would move
 *  every holder's damage — defPct is the inert-by-construction stat). */
const m5AtkMisread = withPatchedOverride('mica', (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'defPct') {
        e.stat = 'atkPct';
      }
    }
  }
});
/** M5 reference: ONLY the defPct effect removed (maxAmmoFlat stays — isolates the
 *  inertia of the DEF half). */
const m5DefRemoved = withPatchedOverride('mica', (ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'defPct');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error('mica S2 defPct effect missing — fixture is stale');
  }
});
/** M6 wrong magnitude: the lvl-1 value 66.6 instead of the lvl-10 152.22. */
const m6Weak = withPatchedOverride('mica', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('mica burst flatDamage block missing — fixture is stale');
  }
  e.atkPct = 66.6;
});
/** M6 wrong trigger: fullBurstEnter (lands at the FB window start, INSIDE the +50% major)
 *  instead of burstCast (lands on mica's OWN cast frame, before the window opens). */
const m6OnFbEnter = withPatchedOverride('mica', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!block) {
    throw new Error('mica burst flatDamage block missing — fixture is stale');
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** M6 reference: the burst nuke removed (functional baseline). */
const m6NoBurst = withPatchedOverride('mica', (ov) => {
  const before = ov.burst.length;
  ov.burst = [];
  if (before === 0) {
    throw new Error('mica burst blocks missing — fixture is stale');
  }
});
/** M7 the laundering mis-model: the burst DEF▼ rewritten as a boss damageTakenPct debuff
 *  (a different mechanic the kit never grants — the boss taking MORE damage). */
const m7Laundered = withPatchedOverride('mica', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 13.32, durationSec: 5 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const attacksMisread = run({ mica: m1AttacksMisread });
const passive = run({ mica: m2Passive });
const allAllies = run({ mica: m3AllAllies });
const lowest = run({ mica: m3Lowest });
const ammoPct = run({ mica: m4AmmoPct });
const noS2 = run({ mica: m4NoS2 });
const atkMisread = run({ mica: m5AtkMisread });
const defRemoved = run({ mica: m5DefRemoved });
const weak = run({ mica: m6Weak });
const onFbEnter = run({ mica: m6OnFbEnter });
const noBurst = run({ mica: m6NoBurst });
const laundered = run({ mica: m7Laundered });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const micaBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MICA && b.stat === stat);
const micaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mica'
  );
const micaNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'mica' && e.bucket === 'burst'
  );
/** Group a unit's shots by magazine ordinal. */
function byMag(evs: SimEvent[], slug: string): Map<number, Shot[]> {
  const m = new Map<number, Shot[]>();
  for (const s of evs.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === slug
  )) {
    (m.get(s.magIndex) ?? m.set(s.magIndex, []).get(s.magIndex)!).push(s);
  }
  return m;
}
/** ammoAfter of each magazine's FIRST shot — the refill size minus one. */
const firstShotAmmoAfter = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss[0].ammoAfter);
const magSizes = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss.length);

describe('mica — kit spec', () => {
  describe('fixture sanity — the B1 chain actually runs', () => {
    it('mica is the sole B1 and casts every Full Burst (>= 6 casts / 180s)', () => {
      expect(micaBursts(base.events).length).toBeGreaterThanOrEqual(6);
    });
    it('her RL weapon deals damage on the SR rarity ceiling', () => {
      expect(base.totals.mica).toBeGreaterThan(0);
    });
  });

  describe('M1 — S1 (attacked-20× → self DEF ▲39.18%) is encoded, and dormant', () => {
    it('is ENCODED kit-verbatim on the attacked trigger, not parked in unmodeled', () => {
      const ov = loadOverride('mica') as any;
      expect(ov.unmodeled.skill1).toEqual([]);
      expect(ov.skill1).toEqual([
        {
          slot: 'skill1',
          trigger: { kind: 'attacked', count: 20 },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'defPct', value: 39.18, durationSec: 10 },
          ],
        },
      ]);
    });

    it('applies NO defPct 39.18 anywhere — the attacked-20x counter never accrues in-sim', () => {
      expect(
        buffs(base.events).filter(
          (b) => b.stat === 'defPct' && b.value === 39.18
        )
      ).toHaveLength(0);
    });

    it('DORMANT-NOT-BROKEN: feeding 20 attacks via the manualAttacks hook DOES fire it', () => {
      const events: SimEvent[] = [];
      runComp({
        slugs: [...SLUGS],
        bossElement: null,
        focusSlug: 'mica',
        unitLimits: { mica: { stars: 3, core: 0 } },
        cfg: {
          manualAttacks: SLUGS.map((_, i) =>
            i === MICA ? Array.from({ length: 20 }, (_, k) => 60 + k) : []
          ),
          onEvent: (e) => events.push(e),
        },
      });
      const fired = buffs(events).filter(
        (b) => b.stat === 'defPct' && b.value === 39.18
      );
      expect(fired.length).toBe(1);
      expect(fired[0].targetIdx).toBe(MICA);
    });

    it('the omission is a choice: the attacks-misread (hitCount:20) counterfactual applies the buff', () => {
      // defPct is damage-inert, so the discrimination is event-based: the shipped model
      // emits ZERO 39.18 applications while the misread fires from her own 20th shot.
      const misreadApplies = buffs(attacksMisread.events).filter(
        (b) => b.stat === 'defPct' && b.value === 39.18
      );
      expect(misreadApplies.length).toBeGreaterThan(0);
      expect(sum(attacksMisread.totals)).toEqual(sum(base.totals));
    });
  });

  describe('M2 — S2 fires on the 20s cooldown: first at t=20s, period 1200 frames', () => {
    const frames = [
      ...new Set(micaBuffs(base.events, 'maxAmmoFlat').map((b) => b.frame)),
    ].sort((a, b) => a - b);

    it('first-fires at t=20s (never at t=0), period exactly 20s', () => {
      expect(frames.length).toBeGreaterThanOrEqual(8);
      expect(frames[0], 'the interval first-fires at t=20s, not t=0').toBe(
        20 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1]).toBe(20 * FPS);
      }
    });

    it('DISCRIMINATING: a permanent passive applies once per target at frame 0', () => {
      const passiveApplies = buffs(passive.events).filter(
        (b) => b.casterIdx === MICA && b.stat === 'maxAmmoFlat'
      );
      // one application per top-2 target, all at battle start (no duty cycle, no expiry)
      expect(passiveApplies.length).toBe(2);
      expect(
        [...new Set(passiveApplies.map((b) => b.frame))],
        'the passive model is live from frame 0 — the shipped model never applies before t=20s'
      ).toEqual([0]);
    });
  });

  describe('M3 — S2 targets EXACTLY the 2 highest-final-ATK allies per firing', () => {
    const applied = micaBuffs(base.events, 'maxAmmoFlat');

    it('reaches exactly 2 holders every firing — ada + helm (600 ATK), never admi (500) or herself (450)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders,
          `frame ${frame} reached ${holders.size} allies, expected exactly the top-2 final ATK`
        ).toEqual(new Set([ADA, HELM]));
      }
    });

    it('DISCRIMINATING: unscoped all-allies reaches all 4 units per firing', () => {
      const unscoped = micaBuffs(allAllies.events, 'maxAmmoFlat');
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of unscoped) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      expect(perFrame.size).toBeGreaterThan(0);
      for (const holders of perFrame.values()) {
        expect(holders.size).toBe(SLUGS.length);
      }
    });

    it('DISCRIMINATING: lowest-2 ranking swaps both holders to mica + admi', () => {
      const lowestApplies = micaBuffs(lowest.events, 'maxAmmoFlat');
      const holders = new Set(lowestApplies.map((b) => b.targetIdx));
      expect(holders).toEqual(new Set([MICA, ADMI]));
    });
  });

  describe('M4 — Max Ammunition Capacity ▲2 rounds for 10s (FLAT, not percent)', () => {
    const applied = micaBuffs(base.events, 'maxAmmoFlat');

    it('carries the flat-round magnitude 2 with a 10s window', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('FUNCTIONAL: in-window refills load exactly 6 + 2 rounds for BOTH holders', () => {
      for (const holder of ['ada', 'helm']) {
        const firsts = firstShotAmmoAfter(base.events, holder);
        expect(
          firsts.filter((n) => n === 7).length,
          `${holder} first-shot ammoAfter ${JSON.stringify(firsts)} — expected at least one 6+2 refill`
        ).toBeGreaterThanOrEqual(1);
        expect(
          magSizes(base.events, holder).filter((n) => n === 8).length,
          `${holder} must fire an 8-round magazine (7…0) after the 6+2 refill`
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it('DISCRIMINATING: maxAmmoPct 2 computes round(6×1.02) = 6 — no 6+2 refill ever happens', () => {
      for (const holder of ['ada', 'helm']) {
        expect(
          firstShotAmmoAfter(ammoPct.events, holder),
          `the percent-only model never produces ${holder} first-shot ammoAfter 7`
        ).not.toContain(7);
        expect(
          magSizes(ammoPct.events, holder),
          `the percent-only model never extends ${holder} to 8 rounds`
        ).not.toContain(8);
        expect(
          firstShotAmmoAfter(noS2.events, holder),
          `with S2 removed, no 6+2 refill exists for ${holder} either`
        ).not.toContain(7);
      }
    });

    it('FUNCTIONAL: the extended magazines lift the holders’ totals vs S2 removed', () => {
      // More rounds per magazine → fewer reloads → more firing uptime (and the S2 defPct
      // half is inert, so the delta is the ammo channel alone — see M5).
      expect(base.totals.ada).toBeGreaterThan(noS2.totals.ada);
      expect(base.totals.helm).toBeGreaterThan(noS2.totals.helm);
    });
  });

  describe('M5 — S2 DEF ▲19.89% for 10s rides the same block, inert in v1', () => {
    const ammoFrames = new Set(
      micaBuffs(base.events, 'maxAmmoFlat').map((b) => b.frame)
    );
    const applied = micaBuffs(base.events, 'defPct');

    it('shares one activation with the ammo line (one block, two effects), magnitude 19.89, 10s', () => {
      expect(
        new Set(applied.map((b) => b.frame)),
        'DEF and ammo must fire on identical frames'
      ).toEqual(ammoFrames);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([19.89]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT in v1: an atkPct misread would move damage, defPct removal changes nothing', () => {
      // The offensive misread changes the holders' totals (DEF is not ATK).
      expect(sum(atkMisread.totals)).not.toEqual(sum(base.totals));
      // defPct itself is damage-neutral: removing ONLY it (ammo stays) leaves every unit
      // byte-identical.
      for (const s of SLUGS) {
        expect(
          defRemoved.totals[s],
          `${s} total with the DEF half removed`
        ).toEqual(base.totals[s]);
      }
    });
  });

  describe('M6 — burst nuke: 152.22% of final ATK to all enemies, on her OWN cast', () => {
    const casts = micaBursts(base.events);
    const nukes = micaNukes(base.events);

    it('fires once per mica burst cast, at the kit magnitude, in the burst bucket', () => {
      expect(casts.length).toBeGreaterThanOrEqual(6);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([152.22]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('lands on her own cast frames and never takes the +50% Full Burst major', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const d of nukes) {
        expect(castFrames.has(d.frame), 'nuke frame must be a cast frame').toBe(
          true
        );
      }
      expect(
        nukes.filter((d) => d.fbMajorApplied),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the lvl-1 magnitude 66.6 changes every nuke', () => {
      expect([...new Set(micaNukes(weak.events).map((d) => d.atkPct))]).toEqual(
        [66.6]
      );
    });

    it('DISCRIMINATING: fullBurstEnter keying lands INSIDE the FB window (+50% major) off the cast frames', () => {
      const fbNukes = micaNukes(onFbEnter.events);
      expect(fbNukes.length).toBeGreaterThan(0);
      // As the sole B1 the counts coincide — the discrimination is TIMING, not count:
      // every fullBurstEnter nuke sits inside the window and takes the +50% major.
      expect(
        fbNukes.every((d) => d.fbMajorApplied),
        'fullBurstEnter nukes must take the FB major'
      ).toBe(true);
      const castFrames = new Set(
        micaBursts(onFbEnter.events).map((c) => c.frame)
      );
      expect(
        fbNukes.filter((d) => castFrames.has(d.frame)),
        'fullBurstEnter applications must land off her cast frames'
      ).toEqual([]);
      expect(sum(onFbEnter.totals)).not.toEqual(sum(base.totals));
    });

    it('FUNCTIONAL: removing the burst erases every nuke and lowers her total', () => {
      expect(micaNukes(noBurst.events)).toHaveLength(0);
      expect(base.totals.mica).toBeGreaterThan(noBurst.totals.mica);
    });
  });

  describe('M7 — burst DEF ▼13.32%/5s as a sibling block on the enemy defPct channel (encoded 2026-08-10)', () => {
    it('one -13.32 boss debuff per burst cast, same frames, 5s window, from the burst slot', () => {
      // Boss debuffs emit with targetIdx null. Fixture mates cannot produce one: admi has
      // no enemy-targeted blocks; ada's are DoTs and helm's are flatDamage (damage events,
      // not buffs). Channel damage math owned by enemy-def-debuff.test.ts.
      const shaves = buffs(base.events).filter(
        (b) => b.targetIdx === null && b.stat === 'defPct' && b.value === -13.32
      );
      const castFrames = micaBursts(base.events).map((c) => c.frame);
      expect(shaves.length).toBe(castFrames.length);
      expect(shaves.length).toBeGreaterThanOrEqual(6);
      expect(shaves.map((b) => b.frame)).toEqual(castFrames);
      for (const b of shaves) {
        expect(b.key.startsWith(`${MICA}:burst:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(5 * 60);
      }
    });

    it('no boss-held buff other than the shave exists (the laundering trap stays pinned absent)', () => {
      const other = buffs(base.events).filter(
        (b) =>
          b.targetIdx === null && !(b.stat === 'defPct' && b.value === -13.32)
      );
      expect(other.map((b) => `${b.stat}:${b.value}`)).toEqual([]);
    });

    it('DISCRIMINATING: a damageTakenPct laundering emits boss debuffs and lifts team totals', () => {
      const bossDebuffs = buffs(laundered.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(bossDebuffs.length).toBeGreaterThan(0);
      expect([...new Set(bossDebuffs.map((b) => b.value))]).toEqual([13.32]);
      expect(sum(laundered.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('target-selection + trigger encoding — literal kit/datamine semantics', () => {
    it('S2 is one interval:20 block, alliesTopAtk{2, byFinalAtk}: "2 allies with the highest final ATK"', () => {
      const ov = loadOverride('mica') as any;
      expect(ov.skill2.length).toBe(1);
      const block = ov.skill2[0];
      expect(block.trigger).toEqual({ kind: 'interval', sec: 20 });
      // byFinalAtk per the A3 literal-word rule — the kit says 'highest FINAL ATK'
      // (quency precedent, identical wording); NO excludeSelf — the kit carries no
      // '(except the skill user)' clause (mast-style exclusion would say so).
      expect(block.target).toEqual({
        kind: 'alliesTopAtk',
        count: 2,
        byFinalAtk: true,
      });
      const stats = new Set(block.effects.map((e: any) => e.stat));
      expect(stats).toEqual(new Set(['maxAmmoFlat', 'defPct']));
    });

    it('the burst is the tagged nuke block + the defPct sibling, both keyed to her own cast', () => {
      const ov = loadOverride('mica') as any;
      expect(ov.burst.length).toBe(2);
      expect(ov.burst[0].trigger).toEqual({ kind: 'burstCast' });
      expect(ov.burst[0].target).toEqual({ kind: 'enemy' });
      expect(ov.burst[0].effects).toEqual([
        { kind: 'flatDamage', atkPct: 152.22, burstDesc: 'allEnemies' },
      ]);
      expect(ov.burst[1].trigger).toEqual({ kind: 'burstCast' });
      expect(ov.burst[1].target).toEqual({ kind: 'enemy' });
      expect(ov.burst[1].effects).toEqual([
        { kind: 'buff', stat: 'defPct', value: -13.32, durationSec: 5 },
      ]);
    });
  });
});
