// PER-UNIT KIT SPEC — `label` (Label, Elysion Iron AR Defender, Burst I, cd 20s). Kit-autonomy
// gauntlet 2026-07-31; test-first line-by-line spec.
//
// GREENFIELD NOTE: Label shipped with NO override (simSupported:false) — before this gauntlet the
// unit could not sim at all (resolveSkills throws for prose-without-override). So the usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the faithful
// encoding AND the nearest-wrong model (patched via withPatchedOverride) provably fails it, so each
// assertion discriminates rather than rubber-stamps.
//
// Label is a TANK: almost her whole kit is defensive (shields, damage-taken reduction, taunt-immunity,
// stun) and therefore DPS-inert in a partless-boss sim with no incoming damage. Her ONLY self-damage
// line is the S2 self ATK ▲93.39% she carries "while in Delusion"; she also hands allies a burst-gated
// ATK buff and a (DPS-inert) self Max HP buff on burst.
//
// Kit (data/characters.json → characters.label.skills, lvl-10 values):
//   S1 ■ start of battle → self: Delusion shield = 30.15% of final Max HP, continuous          [L5]
//      ■ when Delusion ends → self: Delusion Shattered (untargetable + stun, up to 2x)          [UNMODELED]
//      ■ normal attack / burst while not in Delusion → self: re-create Delusion shield          [UNMODELED-inert]
//   S2 ■ start of battle → allies (except self): Electric-code dmg taken ▼70.4% / 5s, 1x/battle [UNMODELED]
//      ■ while in Delusion → self: Burst Gauge filling speed ▲70.4% continuously               [L2]
//      ■ while in Delusion → self: ATK ▲93.39% continuously                                    [L1]
//      ■ while in Delusion → self: Electric-code dmg taken ▼70.4% continuously                 [UNMODELED]
//      ■ while in Shared Delusion → allies (except self): ATK ▲80.36% of LABEL's ATK           [L3]
//   BU ■ self: Max HP ▲20.26% for 10 sec                                                       [L4 inert]
//      ■ Shared Delusion: Label's shield becomes invulnerable for 10 sec                       [UNMODELED-invuln]
//
// STATUS-GATE COLLAPSE (the key modeling judgment, drives L1/L2): the S2 self buffs read "only while
// in Delusion status". Delusion is the S1 shield, created at battle start; the sim models no incoming
// damage, so the shield never breaks and Delusion is PERMANENT — the gate is always satisfied and the
// buffs are faithfully encoded `passive` (frame 0, no expiry). The real-fight shield-break downtime is
// sub-second (the shield re-creates on her next normal attack) and is documented as a gap, not a
// load-bearing behaviour.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  atkPct 93.39, SELF-scoped, passive/permanent, and LIVE. NOTE: atkPct vs casterAtkPct is NOT
//       a gate for this line — for a SELF buff caster===target, so own-ATK scaling (atkPct) and a
//       caster-basis flat add (casterAtkPct) are mathematically IDENTICAL (verified: byte-equal
//       totals). The honest discriminations are therefore (a) LIVENESS — removing the buff collapses
//       her total (she has no other ATK source this size); and (b) SCOPING — the kit says "Affects
//       self", so the nearest-wrong model is an allies-wide ATK buff, which puts +93.39% on all four
//       and lifts ada's total. The stat is pinned to atkPct (the literal "ATK ▲%" own-scaling reading).
//   L2  burstGenPct 70.4, self, passive/permanent — pinned by value/scoping/frame/expiry; the
//       removed counterfactual leaves no such buff (encoding gate).
//   L3  casterAtkPct (a FLAT add sized off LABEL's ATK), allies EXCLUDESELF, fired on HER burstCast
//       (Shared Delusion is the status her burst creates), 10s. Three discriminations: (a) scoping —
//       the include-self counterfactual adds Label as a 4th target; (b) basis — an atkPct
//       counterfactual would size the buff off EACH ally's own ATK (over-buffing high-ATK ada) and
//       records the percentage 80.36, not the flat caster-sized number; (c) timing — apply frames
//       coincide with Label's (stage-1) burstCast, which precedes fullBurstStart, not with FB entry.
//   L4  targetMaxHpPct 20.26, self, burstCast, 10s — and OFFENSIVELY INERT: Label has no
//       atkOfMaxHpPct conversion, so removing it changes NO unit's total by a point (e3 rule).
//   L5  the Delusion shield is event-only (engine `shield` emits no HP pool) and Label has no
//       `shielded` consumer, so it is DPS-inert — pinned STRUCTURALLY (the override carries the
//       block), the honest channel for an inert event-only line (no log event exists to assert).
//
// Fixture (deterministic — no seed; event-log over totals where a line is scoping/timing-sensitive):
//   ['label','crown','ada','helm'] — Label is the SOLE Burst I (20s cd) → casts every rotation;
//   crown (B2, 20s) covers stage II; ada/helm (B3) cover stage III. Boss Fire, focus ada (the carry).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['label', 'crown', 'ada', 'helm'];
const LABEL = 0; // label's slot in COMP
const ALLIES_EXCEPT_LABEL = ['ada', 'crown', 'helm']; // COMP minus label, sorted

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------

const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** L1 reference: the S2 self ATK line removed entirely (proves the buff is live). */
const labelNoAtk = withPatchedOverride('label', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill2.length !== before - 1) {
    throw new Error('label S2 self atkPct block missing — fixture is stale');
  }
});

/** L1 nearest-wrong: the self ATK line widened from `self` to `allies`. The kit says "Affects
 *  self", so the nearest wrong MODEL is an allies-wide ATK buff. (NOTE: atkPct vs casterAtkPct is
 *  NOT a gate here — for a SELF buff caster===target, so own-ATK scaling and a caster-basis flat
 *  add are mathematically identical; the real discrimination is scoping + liveness.) */
const labelAtkToAllies = withPatchedOverride('label', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkPct'));
  if (!b || b.target?.kind !== 'self') {
    throw new Error('label S2 self atkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});

/** L2 reference: the S2 self burst-gauge line removed. */
const labelNoBurstGen = withPatchedOverride('label', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'burstGenPct'));
  if (ov.skill2.length !== before - 1) {
    throw new Error('label S2 burstGenPct block missing — fixture is stale');
  }
});

/** L3 scoping nearest-wrong: the ally ATK line widened to include Label herself. */
const labelAllyIncludeSelf = withPatchedOverride('label', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b || b.target?.kind !== 'allies' || b.target.excludeSelf !== true) {
    throw new Error(
      'label S2 ally casterAtkPct (allies/excludeSelf) block missing — fixture is stale'
    );
  }
  b.target = { kind: 'allies' }; // drop excludeSelf
});

/** L3 basis nearest-wrong: the ally ATK line as a target-basis atkPct (% of EACH ally's own ATK)
 *  instead of a caster-basis casterAtkPct (% of LABEL's ATK). */
const labelAllyAsAtkPct = withPatchedOverride('label', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error(
      'label S2 ally casterAtkPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});

/** L4 reference: the burst self Max HP line removed (proves it is offensively inert). */
const labelNoMaxHp = withPatchedOverride('label', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
  if (ov.burst.length !== before - 1) {
    throw new Error(
      'label burst targetMaxHpPct block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAtk = run({ label: labelNoAtk });
const atkToAllies = run({ label: labelAtkToAllies });
const noBurstGen = run({ label: labelNoBurstGen });
const allyIncludeSelf = run({ label: labelAllyIncludeSelf });
const allyAsAtkPct = run({ label: labelAllyAsAtkPct });
const noMaxHp = run({ label: labelNoMaxHp });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs Label applied to HERSELF (caster + holder both Label). */
const selfBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.casterIdx === LABEL && b.targetSlug === 'label' && b.stat === stat
  );
/** Buffs Label applied, regardless of holder (used for the ally line + its scoping checks). */
const labelCasterBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === LABEL && b.stat === stat);
/** Buffs Label applied to OTHERS only (excludes her own self-buffs of the same stat). */
const allyBuffsOf = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.casterIdx === LABEL && b.stat === stat && b.targetSlug !== 'label'
  );
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const labelCasts = (evs: SimEvent[]) =>
  casts(evs).filter((c) => c.slug === 'label');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const distinctTargets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetSlug))].sort();

describe('label — kit spec', () => {
  describe('fixture sanity', () => {
    it('label is the sole Burst I and casts her burst every rotation', () => {
      const n = labelCasts(base.events).length;
      expect(n).toBeGreaterThan(5);
      expect(
        [...new Set(labelCasts(base.events).map((c) => c.stage))],
        'label is Burst I'
      ).toEqual([1]);
    });
  });

  describe('L1 — S2 self ATK ▲93.39% while in Delusion (passive, own-ATK scaling)', () => {
    const applied = selfBuffs(base.events, 'atkPct');

    it('is atkPct 93.39 (the percentage, own-ATK scaling), applied once at setup', () => {
      expect(applied.length, 'no S2 self atkPct buff applied').toBe(1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([93.39]);
      expect(applied[0].frame, 'a passive applies at setup').toBe(0);
    });

    it('is self-scoped and continuous (no wall-clock expiry, no round budget)', () => {
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual(['label']);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([null]);
    });

    it('is LIVE: removing it collapses Label\u2019s total damage (she has no other ATK source this size)', () => {
      const baseDmg = base.totals.label;
      const noAtkDmg = noAtk.totals.label;
      expect(baseDmg).toBeGreaterThan(0);
      expect(
        noAtkDmg,
        'removing a +93.39% ATK buff must roughly halve her ATK-scaled damage'
      ).toBeLessThan(baseDmg * 0.75);
    });

    it('DISCRIMINATING (scoping): widening the line to all allies puts the buff on the whole team', () => {
      // Shipped: held by Label ALONE (kit "Affects self").
      expect(distinctTargets(selfBuffs(base.events, 'atkPct'))).toEqual([
        'label',
      ]);
      // Nearest-wrong: the same atkPct 93.39 reaches all four, and an ally's total rises because it
      // now carries a +93.39% ATK buff the faithful model never gave it.
      const widened = buffs(atkToAllies.events).filter(
        (b) => b.stat === 'atkPct' && Math.abs(b.value - 93.39) < 0.01
      );
      expect(distinctTargets(widened)).toEqual([...COMP].sort());
      expect(unitOf(atkToAllies.res, 'ada').totalDamage).toBeGreaterThan(
        unitOf(base.res, 'ada').totalDamage
      );
    });
  });

  describe('L2 — S2 self Burst Gauge filling speed ▲70.4% while in Delusion (passive)', () => {
    const applied = selfBuffs(base.events, 'burstGenPct');

    it('is burstGenPct 70.4, self-scoped, applied once at setup, permanent', () => {
      expect(applied.length, 'no S2 burstGenPct buff applied').toBe(1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([70.4]);
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual(['label']);
      expect(applied[0].frame).toBe(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing the line leaves no burstGenPct buff (encoding gate)', () => {
      expect(selfBuffs(noBurstGen.events, 'burstGenPct').length).toBe(0);
    });
  });

  describe('L3 — S2 ally ATK ▲80.36% of LABEL\u2019s ATK while in Shared Delusion (burstCast, allies except self, 10s)', () => {
    const applied = labelCasterBuffs(base.events, 'casterAtkPct');

    it('is a caster-basis flat add sized off Label\u2019s static ATK', () => {
      expect(
        applied.length,
        'no S2 ally casterAtkPct buff applied'
      ).toBeGreaterThan(0);
      const labelAtk = unitOf(base.res, 'label').staticAtk;
      for (const b of applied) {
        expect(
          Math.abs(b.value - (labelAtk * 80.36) / 100),
          `flat ATK ${b.value} should be 80.36% of label staticAtk ${labelAtk}`
        ).toBeLessThan(1);
      }
    });

    it('reaches the three allies but NOT Label herself (excludeSelf), for 10 sec, once per burst per ally', () => {
      expect(distinctTargets(applied)).toEqual(ALLIES_EXCEPT_LABEL);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect(applied.length).toBe(labelCasts(base.events).length * 3);
    });

    it('fires on LABEL\u2019S burstCast (Shared Delusion is her burst\u2019s status), which precedes Full Burst', () => {
      const castFrames = labelCasts(base.events).map((c) => c.frame);
      const applyFrames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      // one distinct apply frame per label cast
      expect(applyFrames.length).toBe(castFrames.length);
      for (const f of applyFrames) {
        expect(
          castFrames.some((cf) => Math.abs(cf - f) <= 2),
          `ally-buff apply frame ${f} has no nearby label burstCast (${castFrames.slice(0, 3)}...)`
        ).toBe(true);
      }
      // and those frames are NOT the Full Burst start frames (Label casts at stage 1, before FB opens)
      const fbFrames = fbStarts(base.events).map((f) => f.frame);
      const onFb = applyFrames.filter((f) =>
        fbFrames.some((fb) => Math.abs(fb - f) <= 2)
      );
      expect(
        onFb.length,
        'stage-1 burstCast frames should not coincide with Full Burst entry'
      ).toBeLessThan(applyFrames.length);
    });

    it('DISCRIMINATING: widening to include self adds Label as a 4th target', () => {
      const widened = labelCasterBuffs(allyIncludeSelf.events, 'casterAtkPct');
      expect(distinctTargets(widened)).toEqual([...COMP].sort());
    });

    it('DISCRIMINATING: a target-basis atkPct records the percentage and over-buffs high-ATK ada', () => {
      // ally-only reader: Label's OWN self atkPct (93.39) is also casterIdx===LABEL, so exclude it.
      const wrong = allyBuffsOf(allyAsAtkPct.events, 'atkPct');
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([80.36]);
      const adaFaithful = unitOf(base.res, 'ada').totalDamage;
      const adaWrong = unitOf(allyAsAtkPct.res, 'ada').totalDamage;
      expect(
        adaWrong,
        'atkPct (% of ada\u2019s own ATK) must over-buff ada vs casterAtkPct (% of label\u2019s ATK)'
      ).not.toBeCloseTo(adaFaithful, 0);
      expect(adaWrong).toBeGreaterThan(adaFaithful);
    });
  });

  describe('L4 — Burst self Max HP ▲20.26% for 10s (targetMaxHpPct → engine maxHpFlat) — offensively INERT', () => {
    // The engine converts targetMaxHpPct → maxHpFlat at apply time; the buffApply event carries
    // stat:'maxHpFlat' and the computed FLAT grant (20.26% of the target's own Max HP). For a SELF
    // grant casterIdx === targetIdx === LABEL.
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === LABEL && b.stat === 'maxHpFlat'
    );
    const labelMaxHp = unitOf(base.res, 'label').maxHp;

    it('fires once per burst cast, self-scoped, as a flat 20.26%-of-Max-HP grant', () => {
      expect(applied.length, 'no burst maxHpFlat buff applied').toBeGreaterThan(
        0
      );
      expect(applied.length).toBe(labelCasts(base.events).length);
      for (const b of applied) {
        expect(b.targetIdx, 'self-scoped Max HP grant').toBe(LABEL);
        expect(
          Math.abs(b.value - (labelMaxHp * 20.26) / 100),
          `flat HP ${b.value} should be 20.26% of label maxHp ${labelMaxHp}`
        ).toBeLessThan(1);
      }
    });

    it('lasts exactly 10 sec (600 frames)', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT: removing it changes NO unit\u2019s total by a single point (no atkOfMaxHpPct feed)', () => {
      expect(noMaxHp.totals).toEqual(base.totals);
    });
  });

  describe('L5 — S1 Delusion shield (event-only, DPS-inert) — structural pin', () => {
    it('the shipped override carries a passive self shield block at 30.15% final Max HP', () => {
      const ov = loadOverride('label')!;
      const shield: any = (ov.skill1 ?? []).find((b: any) =>
        b.effects.some((e: any) => e.kind === 'shield')
      );
      expect(
        shield,
        'no S1 shield block in the shipped override'
      ).toBeDefined();
      expect(shield.trigger?.kind).toBe('passive');
      expect(shield.target?.kind).toBe('self');
      const e: any = shield.effects.find((x: any) => x.kind === 'shield');
      expect(e.maxHpPct).toBe(30.15);
    });
  });
});
