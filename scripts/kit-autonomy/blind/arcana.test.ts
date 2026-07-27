// PER-UNIT KIT SPEC — `arcana` (Arcana, Supporter/RL/Electric, BURST II, cd 40s, ammo 6,
// reloadFrames 171, chargeFrames 60, normalAttackMultiplier 64.04). BLIND spec (S5): written from
// the kit prose alone — the shipped override, its author's reasoning, and any other test for this
// unit were not read.
//
// One assertion group per KIT LINE (K1..K10). Assertions are OBSERVATIONAL (event log + totals)
// rather than shape-of-JSON wherever possible, so any FAITHFUL encoding passes and only a wrong
// MODEL fails. `withPatchedOverride` appears solely to build counterfactuals.
//
// Kit (blablalink prose):
//   S1 a) FB ENDS → all Burst-3 ELECTRIC allies who cast their burst, IF self in Wheel of Fortune:
//           "The Magician": Cooldown of Skill 2 ▼75% for 15 sec                          [K1 GAP]
//                            Attack damage ▲180% for 15 sec                                [K2]
//      b) FB ENDS → all allies: ATK ▲5% OF THE SKILL USER'S ATK for 10 sec                 [K3]
//   S2 a) (same gated target set) "Strength": ATK ▲180% OF THE SKILL USER'S ATK for 15 sec  [K4]
//      b) FB ENDS → all allies IF self in Wheel of Fortune:
//           "Death": Cooldown of Burst Skill ▼6 sec                                        [K5b]
//                     ATK ▲50% OF THE SKILL USER'S ATK for 5 sec                           [K5a]
//      c) FB ENDS → all allies: Attack damage ▲7.5% for 10 sec                             [K6]
//   BU a) all ELECTRIC allies: "Wheel of Fortune": Attack damage ▲10% for 10 sec           [K7]
//      b) all enemies: 300% of final ATK as Burst Skill damage                              [K8]
//                      "Judgement": Damage taken ▲10% for 10 sec                            [K9]
//
// "The Magician" / "Strength" / "Death" / "Judgement" / "Wheel of Fortune" are tarot LABELS on the
// lines that follow them, not separate mechanics — nothing extra to model. "Wheel of Fortune" is
// the ONE exception: it is also a real STATUS, conferred by her own burst block (K7) to Electric
// allies — and she is Electric — so "if self is in Wheel of Fortune status" reduces to "IF ARCANA
// CAST HER OWN BURST INTO THIS ROTATION". That is `ownBurstGate:'cast'` territory, NOT the
// `targetStatus`/`requiresTargetStatus` channel (which is enemy-only by construction).
//
// TWO FIXTURES, because the control comp physically cannot exercise this kit:
//
//   A = controlComp('arcana')  →  liter 0 / crown 1 / arcana 2 / helm 3, boss Fire.
//       helm is the B3 that makes a chain possible at all (arcana is B2 — a comp of B1+B2+B2 makes
//       ZERO Full Bursts). But helm is SR/WATER, so this comp contains NO Burst-3 Electric ally:
//       K2 and K4 MUST be perfectly inert here. That inertness IS the target-set discriminator —
//       an `allies`-targeted (or element-blind, or stage-blind) model fires them in this comp.
//       Crown (B2, cd 20s) also contests arcana's burst slot, so arcana bursts on SOME rotations at
//       most — which is what makes the Wheel-of-Fortune gate's OFF case observable. Every A-fixture
//       assertion is written to hold whether arcana casts zero bursts or several.
//
//   B = [liter, arcana, ELECTRIC_B3], boss Fire, focus arcana.
//       arcana is the SOLE Burst II and ELECTRIC_B3 is the SOLE Burst III, so a Full Burst is
//       impossible unless BOTH cast: every FB end is therefore guaranteed to have (i) arcana in
//       Wheel of Fortune and (ii) a qualifying Burst-3 Electric burst-caster. This is the ACTIVE
//       case for K2/K4/K5, non-vacuous by construction rather than by luck. ELECTRIC_B3 is DERIVED
//       from the roster at runtime — hardcoding a slug would rot the moment the roster moves.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   K2/K4  nearest-wrong = target `allies` (or burstCasters with the element/stage facet dropped).
//          Proven twice: they must land on EXACTLY the Electric B3 in fixture B (never on liter,
//          never on arcana herself — she is Burst II and cannot qualify for her own line), and they
//          must be ENTIRELY ABSENT in fixture A, which has no Electric B3.
//   K3/K4/K5a  nearest-wrong = `atkPct` (scales the TARGET's own ATK) instead of `casterAtkPct`
//          (flat add of x% of ARCANA's ATK). The prose says "of the skill user's ATK" — the two
//          models differ for every ally whose ATK differs from arcana's, so the counterfactual must
//          MOVE totals. Asserted as a real damage delta, not just a stat-name equality.
//   K5    nearest-wrong = the gate dropped. Ungated, the Death block fires on EVERY Full Burst end;
//          gated it can fire at most once per arcana burst. Fixture A asserts STRICTLY FEWER
//          firings than FB ends (true whether she bursts 0 or k times) and fixture B asserts it
//          fires on every FB end — so the pair is non-vacuous in both directions.
//   K5b   burst-CDR is invisible to the buff log; its only observable is that rotations come
//          FASTER. Removing it must reduce the Full Burst count over the 180s fight.
//   K10   nearest-wrong = `fullBurstEnter`. This is the single highest-leverage error in the kit:
//          re-keyed to FB ENTRY, every window (15s/10s/5s) would blanket the Full Burst itself and
//          collect the +50% FB major. Asserted structurally (firing frames coincide with
//          fullBurstEnd, never fullBurstStart) AND by damage (the counterfactual moves totals).
//   K8    a burst CAST lands before the FB window opens, so the 300% nuke must never take the +50%
//          major, and "as Burst Skill damage" with no core-strike wording gets no core bucket.
//   K9    "Damage taken ▲" is an ENEMY debuff benefiting the whole team, not a self/ally buff — it
//          must appear boss-held (casterIdx AND targetIdx null), never on an ally slot.
//
// Deterministic (no seed). 5 runs, each a full 180s sim.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  type CompOptions,
  controlComp,
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'arcana';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

// ---- roster-derived fixture inputs -------------------------------------------------------------

const chars = data.characters as Record<string, any>;

/**
 * The Burst-III ELECTRIC ally that K2/K4 require. DERIVED, never hardcoded: the sim-supported
 * Electric Burst III with the shortest burst cooldown (so it sustains a chain), tie-broken by slug
 * so the pick is deterministic. If the roster ever loses every such unit, arcana's two largest kit
 * lines become untestable and this must fail LOUDLY rather than quietly skip them.
 */
const ELECTRIC_B3: string = (() => {
  const pool = Object.values(chars)
    .filter(
      (c) =>
        c.element === 'Electric' &&
        c.burst === 'III' &&
        c.simSupported &&
        c.slug !== SLUG
    )
    .sort(
      (a, b) =>
        a.burstCooldownSec - b.burstCooldownSec || (a.slug < b.slug ? -1 : 1)
    );
  if (!pool.length) {
    throw new Error(
      "no sim-supported Burst III Electric ally on the roster — arcana's S1a/S2a target set cannot " +
        'be exercised by any comp, so this suite cannot gate them'
    );
  }
  return pool[0].slug;
})();

const isElectric = (slug: string) => chars[slug].element === 'Electric';

// Fixture A — the control comp. arcana is the carry (slot 2); helm (slot 3) is the B3 that lets a
// chain close at all. NO Electric B3 present, by design.
const COMP_A = controlComp(SLUG);
const A_SLUGS = COMP_A.slugs;
const A_ARCANA = A_SLUGS.indexOf(SLUG);

// Fixture B — arcana as sole B2, ELECTRIC_B3 as sole B3: every Full Burst requires both to cast.
const B_SLUGS = ['liter', SLUG, ELECTRIC_B3];
const COMP_B: CompOptions = {
  slugs: B_SLUGS,
  bossElement: 'Fire',
  focusSlug: SLUG,
};
const B_ARCANA = 1;
const B_TARGET = 2;

// ---- runner -------------------------------------------------------------------------------------

function run(opts: CompOptions, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ---------------------------------------------------------------------
// Each locates blocks by EFFECT/TRIGGER SIGNATURE (never by index) and throws if the signature is
// absent, so a stale fixture fails loudly instead of silently testing nothing.

/** K10: every "Activates when Full Burst ends" block re-keyed to FULL BURST ENTRY. */
const arcanaFbEnter = withPatchedOverride(SLUG, (ov: any) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2]) {
    if (b.trigger?.kind === 'fullBurstEnd') {
      b.trigger.kind = 'fullBurstEnter';
      n++;
    }
  }
  if (n === 0) {
    throw new Error(
      'arcana: no fullBurstEnd-triggered skill block — every skill line reads "Activates when Full ' +
        'Burst ends", so the shipped model is already mis-keyed'
    );
  }
});

/** K3/K4/K5a: caster-ATK grants re-read as target-scaling percentages. */
const arcanaSelfAtk = withPatchedOverride(SLUG, (ov: any) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2, ...ov.burst]) {
    for (const e of b.effects ?? []) {
      if (e.stat === 'casterAtkPct') {
        e.stat = 'atkPct';
        n++;
      }
    }
  }
  if (n === 0) {
    throw new Error(
      'arcana: no casterAtkPct effect — three kit lines read "ATK ▲ x% OF THE SKILL USER\'S ATK"'
    );
  }
});

/** K5b: Death's burst-cooldown reduction removed, isolating its rotation acceleration. */
const arcanaNoCdr = withPatchedOverride(SLUG, (ov: any) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2, ...ov.burst]) {
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'burstCdr');
    n += before - b.effects.length;
  }
  if (n === 0) {
    throw new Error(
      'arcana: no burstCdr effect — S2b reads "Cooldown of Burst Skill ▼ 6 sec"'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) ----------------------------------------------------
const A = run(COMP_A);
const AFbEnter = run(COMP_A, { [SLUG]: arcanaFbEnter });
const ASelfAtk = run(COMP_A, { [SLUG]: arcanaSelfAtk });
const B = run(COMP_B);
const BNoCdr = run(COMP_B, { [SLUG]: arcanaNoCdr });

// ---- readers --------------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const arcanaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const arcanaDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);

/** Buff applications CAST BY arcana carrying `stat` (optionally pinned to `value`). */
const grants = (evs: SimEvent[], idx: number, stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === idx &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );

/** One FIRING = one frame, even though an all-allies block emits one buffApply per holder. */
const firings = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);

/** Holder slots per firing frame. */
function holders(bs: BuffApply[]): Map<number, Set<number | null>> {
  const m = new Map<number, Set<number | null>>();
  for (const b of bs) {
    if (!m.has(b.frame)) {m.set(b.frame, new Set());}
    m.get(b.frame)!.add(b.targetIdx);
  }
  return m;
}

const durations = (bs: BuffApply[]) => [
  ...new Set(bs.map((b) => b.expiresFrame! - b.frame)),
];
const subset = (xs: number[], ys: number[]) => xs.every((x) => ys.includes(x));

describe('arcana — kit spec (blind)', () => {
  describe('fixture sanity — the two comps exercise what they claim to', () => {
    it('A: contains NO Burst-3 Electric ally, so the gated lines have no legal target', () => {
      const qualifying = A_SLUGS.filter(
        (s) =>
          s !== SLUG &&
          chars[s].element === 'Electric' &&
          chars[s].burst === 'III'
      );
      expect(
        qualifying,
        'control comp gained an Electric B3 — the K2/K4 inertness case is void'
      ).toEqual([]);
    });

    it('A: makes Full Bursts (arcana is Burst II — helm is what closes the chain)', () => {
      expect(fbEndFrames(A.events).length).toBeGreaterThan(1);
    });

    it('B: arcana is the sole Burst II and the target is the sole Burst III', () => {
      expect(B_SLUGS.filter((s) => chars[s].burst === 'II')).toEqual([SLUG]);
      expect(B_SLUGS.filter((s) => chars[s].burst === 'III')).toEqual([
        ELECTRIC_B3,
      ]);
    });

    it('B: every Full Burst is therefore preceded by an arcana cast (gate always ON)', () => {
      const ends = fbEndFrames(B.events);
      expect(
        ends.length,
        `no Full Burst in [${B_SLUGS.join(', ')}]`
      ).toBeGreaterThan(1);
      expect(arcanaBursts(B.events).length).toBeGreaterThanOrEqual(ends.length);
    });

    it('B: holds at least one NON-Electric ally, so element scoping is falsifiable', () => {
      expect(
        B_SLUGS.filter((s) => !isElectric(s)),
        'every ally in fixture B is Electric — K7 could not distinguish alliesOfElement from allies'
      ).not.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('K1 — S1a "The Magician: Cooldown of Skill 2 ▼75% for 15 sec"', () => {
    it.skip("cuts the target ally's skill-2 cooldown by 75% for 15 sec", () => {
      // GAP — no primitive. EffectDef carries `burstCdr` (BURST cooldowns) and nothing else
      // cooldown-shaped; a unit's SKILL cadence is not a mutable pool in this engine but is baked
      // into its trigger (an `interval.sec`, or an event trigger with no cooldown at all), and
      // there is no cross-unit channel to rewrite another character's trigger mid-fight.
      // Modeling it would need a new effect kind plus a per-unit skill-CD clock.
      // MUST be recorded verbatim in the override's `unmodeled.skill1` — it is a real, large
      // uplift (a 75% cut on the recipient's skill 2) that this sim under-credits, not a no-op.
    });
  });

  describe('K2 — S1a Attack damage ▲180% for 15 sec, to Burst-3 ELECTRIC burst-casters', () => {
    const active = grants(B.events, B_ARCANA, 'attackDamagePct', 180);

    it('fires in fixture B, at Full Burst END, once per FB end', () => {
      expect(
        active.length,
        'the 180% Attack Damage line never fired even with a legal target'
      ).toBeGreaterThan(0);
      expect(subset(firings(active), fbEndFrames(B.events))).toBe(true);
      expect(firings(active).length).toBeLessThanOrEqual(
        fbEndFrames(B.events).length
      );
    });

    it('lands on the Electric B3 ALONE — not liter, not arcana herself (she is Burst II)', () => {
      for (const [frame, hs] of holders(active)) {
        expect(
          [...hs],
          `frame ${frame}: wrong holder set for a Burst-3-Electric-scoped buff`
        ).toEqual([B_TARGET]);
      }
    });

    it('runs 15 sec', () => {
      expect(durations(active)).toEqual([15 * FPS]);
    });

    it('DISCRIMINATING: is perfectly inert with no Burst-3 Electric ally in the comp', () => {
      // An `allies`-targeted model — or one that kept `burstCasters` but dropped the element or
      // stage facet — fires this on helm/crown/liter here. It must produce nothing at all.
      expect(grants(A.events, A_ARCANA, 'attackDamagePct', 180)).toEqual([]);
    });
  });

  describe("K3 — S1b ATK ▲5% OF THE SKILL USER'S ATK, all allies, 10 sec, UNGATED", () => {
    const g = grants(A.events, A_ARCANA, 'casterAtkPct', 5);

    it('fires on EVERY Full Burst end (no Wheel of Fortune condition on this block)', () => {
      expect(g.length).toBeGreaterThan(0);
      expect(firings(g)).toEqual(fbEndFrames(A.events));
    });

    it('reaches all four allies including herself, for 10 sec', () => {
      for (const [frame, hs] of holders(g)) {
        expect(
          hs.size,
          `frame ${frame} reached ${hs.size} allies, expected ${A_SLUGS.length}`
        ).toBe(A_SLUGS.length);
        expect(
          hs.has(A_ARCANA),
          'the skill user must buff herself — the kit says "all allies"'
        ).toBe(true);
      }
      expect(durations(g)).toEqual([10 * FPS]);
    });

    it("DISCRIMINATING: is a flat add off ARCANA's ATK, not a self-scaling percentage", () => {
      // "x% OF THE SKILL USER'S ATK" (casterAtkPct — every ally gets the same flat number) vs the
      // nearest-wrong "ATK ▲x%" (atkPct — each ally scales its OWN ATK). The two agree only if
      // every ally's ATK equals arcana's, so the swap must move real damage.
      expect(
        ASelfAtk.totals,
        'swapping casterAtkPct → atkPct changed nothing — the caster-ATK basis is not wired through'
      ).not.toEqual(A.totals);
    });
  });

  describe('K4 — S2a "Strength": ATK ▲180% of the skill user\'s ATK, 15 sec, same gated target', () => {
    const active = grants(B.events, B_ARCANA, 'casterAtkPct', 180);

    it('fires at Full Burst end onto the Electric B3 alone, for 15 sec', () => {
      expect(
        active.length,
        'the 180% Strength grant never fired even with a legal target'
      ).toBeGreaterThan(0);
      expect(subset(firings(active), fbEndFrames(B.events))).toBe(true);
      for (const [frame, hs] of holders(active)) {
        expect(
          [...hs],
          `frame ${frame}: Strength leaked outside the Burst-3-Electric target set`
        ).toEqual([B_TARGET]);
      }
      expect(durations(active)).toEqual([15 * FPS]);
    });

    it('DISCRIMINATING: is inert with no Burst-3 Electric ally present', () => {
      expect(grants(A.events, A_ARCANA, 'casterAtkPct', 180)).toEqual([]);
    });
  });

  describe('K5a — S2b "Death": ATK ▲50% of the skill user\'s ATK, all allies, 5 sec, WoF-GATED', () => {
    const gA = grants(A.events, A_ARCANA, 'casterAtkPct', 50);
    const gB = grants(B.events, B_ARCANA, 'casterAtkPct', 50);

    it('ACTIVE case: fires on every Full Burst end when arcana always bursts (fixture B)', () => {
      expect(firings(gB)).toEqual(fbEndFrames(B.events));
      for (const [frame, hs] of holders(gB)) {
        expect(
          hs.size,
          `frame ${frame} reached ${hs.size} allies, expected ${B_SLUGS.length}`
        ).toBe(B_SLUGS.length);
      }
      expect(durations(gB)).toEqual([5 * FPS]);
    });

    it('DISCRIMINATING: fires STRICTLY FEWER times than Full Burst ends when she does not always burst', () => {
      // Wheel of Fortune is conferred by HER OWN burst (K7) and she is Electric, so this block can
      // only fire off a rotation she bursted into. In fixture A crown contests the Burst II slot, so
      // she bursts on at most some rotations. An UNGATED model fires on every FB end — the count
      // below would equal fbEnds. This holds whether she casts zero bursts or several.
      const ends = fbEndFrames(A.events).length;
      expect(
        firings(gA).length,
        `Death fired on ${firings(gA).length}/${ends} Full Burst ends with ` +
          `${arcanaBursts(A.events).length} arcana bursts — an ungated model fires on all ${ends}`
      ).toBeLessThan(ends);
    });

    it('never fires more often than arcana bursts', () => {
      expect(firings(gA).length).toBeLessThanOrEqual(
        arcanaBursts(A.events).length
      );
    });

    it('every firing follows one of HER casts inside the Wheel of Fortune window', () => {
      // Her burst opens WoF; the chain + 10s Full Burst put the FB end ~10-11s later, so the window
      // is generous (15s) — but an ungated firing in fixture A sits ~30s past her last cast and is
      // still excluded. Vacuous if she never bursts, which the count assertions above already cover.
      const casts = arcanaBursts(A.events).map((c) => c.frame);
      for (const f of firings(gA)) {
        const ok = casts.some((c) => f >= c && f - c <= 15 * FPS);
        expect(
          ok,
          `Death fired at frame ${f} with no arcana burst in the preceding 15s`
        ).toBe(true);
      }
    });
  });

  describe('K5b — S2b "Death": Cooldown of Burst Skill ▼6 sec, all allies', () => {
    it('accelerates the rotation — removing it costs Full Bursts over the fight', () => {
      // burstCdr emits no buff event, so its ONLY observable is rotation cadence. 6s off every
      // ally's burst cooldown at every (gated) FB end must compound into more Full Bursts across
      // 180s; a no-op or a once-per-battle reading would not move the count.
      const withCdr = fbStartFrames(B.events).length;
      const without = fbStartFrames(BNoCdr.events).length;
      expect(
        withCdr,
        `${withCdr} Full Bursts with the 6s CDR vs ${without} without — the CDR is not reaching allies' cooldowns`
      ).toBeGreaterThan(without);
    });
  });

  describe('K6 — S2c Attack damage ▲7.5% for 10 sec, all allies, UNGATED', () => {
    const g = grants(A.events, A_ARCANA, 'attackDamagePct', 7.5);

    it('fires on every Full Burst end, on all allies, for 10 sec', () => {
      expect(g.length).toBeGreaterThan(0);
      expect(firings(g)).toEqual(fbEndFrames(A.events));
      for (const [frame, hs] of holders(g)) {
        expect(
          hs.size,
          `frame ${frame} reached ${hs.size} allies, expected ${A_SLUGS.length}`
        ).toBe(A_SLUGS.length);
      }
      expect(durations(g)).toEqual([10 * FPS]);
    });

    it('is Damage Up (attackDamagePct), not an ATK grant', () => {
      expect(
        grants(A.events, A_ARCANA, 'atkPct', 7.5),
        '"Attack damage ▲" is the Damage Up bucket, not ATK'
      ).toEqual([]);
    });
  });

  describe('K7 — burst "Wheel of Fortune": Attack damage ▲10% for 10 sec, all ELECTRIC allies', () => {
    const g = grants(B.events, B_ARCANA, 'attackDamagePct', 10);
    const expected = new Set(
      B_SLUGS.map((s, i) => (isElectric(s) ? i : -1)).filter((i) => i >= 0)
    );

    it('fires once per burst CAST (not at FB entry, not at FB end)', () => {
      const casts = arcanaBursts(B.events).map((c) => c.frame);
      expect(firings(g).length).toBe(casts.length);
      expect(
        subset(firings(g), casts),
        'the WoF buff must land on the cast frame'
      ).toBe(true);
      expect(durations(g)).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: reaches the ELECTRIC allies only — an all-allies model would include liter', () => {
      for (const [frame, hs] of holders(g)) {
        expect(
          new Set([...hs]),
          `frame ${frame}: WoF holder set is not the Electric allies`
        ).toEqual(expected);
      }
    });

    it('includes arcana herself (she is Electric) — this is what arms her own WoF gate', () => {
      expect(expected.has(B_ARCANA)).toBe(true);
      for (const [, hs] of holders(g)) {expect(hs.has(B_ARCANA)).toBe(true);}
    });
  });

  describe('K8 — burst deals 300% of final ATK as Burst Skill damage', () => {
    const nukes = arcanaDamage(B.events).filter((d) => d.bucket === 'burst');

    it('lands once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.length).toBe(arcanaBursts(B.events).length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([300]);
    });

    it('never takes the +50% Full Burst major (a cast lands before the FB window opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the Full Burst window'
      ).toEqual([]);
    });

    it('takes no core bucket — the kit says "Burst Skill damage", not a core strike', () => {
      expect([...new Set(nukes.map((d) => d.coreRate))]).toEqual([0]);
    });
  });

  describe('K9 — burst "Judgement": Damage taken ▲10% for 10 sec, on all enemies', () => {
    // Boss-held debuffs carry casterIdx === null AND targetIdx === null, so they are found by
    // stat+value rather than by caster.
    const debuffs = buffs(B.events).filter(
      (b) => b.stat === 'damageTakenPct' && b.value === 10
    );

    it('is applied once per burst cast, for 10 sec', () => {
      expect(debuffs.length).toBeGreaterThan(0);
      expect(firings(debuffs).length).toBe(arcanaBursts(B.events).length);
      expect(durations(debuffs)).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: is held by the BOSS, never by an ally slot', () => {
      // "Damage Taken ▲" is an enemy debuff that lifts the whole team's output. Encoded as an ally
      // or self buff it would carry a real targetIdx and credit only its holders.
      expect([...new Set(debuffs.map((b) => b.targetIdx))]).toEqual([null]);
      expect([...new Set(debuffs.map((b) => b.casterIdx))]).toEqual([null]);
    });
  });

  describe('K10 — TRIGGER IDENTITY: every skill line fires when Full Burst ENDS', () => {
    const baseFirings = firings(
      grants(A.events, A_ARCANA, 'attackDamagePct', 7.5)
    );
    const cfFirings = firings(
      grants(AFbEnter.events, A_ARCANA, 'attackDamagePct', 7.5)
    );

    it('shipped: firings coincide with fullBurstEnd and NEVER with fullBurstStart', () => {
      expect(baseFirings.length).toBeGreaterThan(0);
      expect(baseFirings).toEqual(fbEndFrames(A.events));
      expect(
        baseFirings.filter((f) => fbStartFrames(A.events).includes(f)),
        'a Full-Burst-END line must not fire on the FB entry frame'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the fullBurstEnter counterfactual fires on the OTHER frames', () => {
      expect(cfFirings.length).toBeGreaterThan(0);
      expect(subset(cfFirings, fbStartFrames(AFbEnter.events))).toBe(true);
    });

    it('DISCRIMINATING: and it moves damage — every window would blanket the Full Burst itself', () => {
      // Keyed to entry, the 15s/10s/5s windows cover the FB window and its +50% major; keyed to
      // end they start as the window closes. This is the single largest mis-modeling risk in the
      // kit, so it must be a damage-visible difference, not a bookkeeping one.
      expect(
        AFbEnter.totals,
        'FB-entry vs FB-end changed no damage — the trigger is not actually gating these buffs'
      ).not.toEqual(A.totals);
    });
  });

  describe('inertness — arcana never moves what her kit does not name', () => {
    it('grants no crit / core / element / charge / weapon-state stat (her kit names none)', () => {
      const forbidden = new Set([
        'critRatePct',
        'critRateNormalPct',
        'critDamagePct',
        'coreDamagePct',
        'elementDamagePct',
        'chargeDamagePct',
        'chargeDamageMultPct',
        'chargeSpeedPct',
        'reloadSpeedPct',
        'fireRatePct',
        'attackSpeedPct',
        'maxAmmoPct',
        'maxAmmoFlat',
      ]);
      const seen = [
        ...new Set(
          [...buffs(A.events), ...buffs(B.events)]
            .filter((b) => b.casterIdx === A_ARCANA || b.casterIdx === B_ARCANA)
            .map((b) => b.stat)
            .filter((s) => forbidden.has(s as string))
        ),
      ];
      expect(
        seen,
        `arcana granted ${seen.join(', ')} — no kit line names any of these`
      ).toEqual([]);
    });

    it('deals damage from her burst only (no kit line gives her a skill-slot damage rider)', () => {
      const buckets = [
        ...new Set(arcanaDamage(B.events).map((d) => d.bucket)),
      ].sort();
      expect(
        buckets.filter((b) => b === 'skill'),
        'arcana has no skill-damage line in her kit'
      ).toEqual([]);
    });
  });
});
