// PER-UNIT KIT SPEC — `aria` (Aria, Tetra MG Attacker, Water, Burst II, cd 40s, ammo 300,
// reloadFrames 161, normalMult 5.47 / coreMult 200, critRate 15 / critDamage 150). Kit-autonomy
// gauntlet 2026-08-03; test-first line-by-line spec.
//
// GREENFIELD NOTE: aria shipped with NO override (simSupported:false) — before this gauntlet the
// unit could not sim at all (resolveSkills throws for prose-without-override). So the usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the
// faithful encoding AND the nearest-wrong model (patched via withPatchedOverride) provably fails
// it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.aria.skills, lvl-10 values):
//   S1 "Allegro"   ■ at the beginning of Full Burst → all allies: Critical Damage ▲26.99% / 10s [A1]
//   S2 "Lacrimoso" ■ when the last bullet hits → all allies: Critical Rate ▲7.03% / 5s          [A2]
//   BU "Da Capo Aria" ■ all allies: Shield = 37.86% of skill user's final Max HP / 10s          [A3]
//                  ■ self: Hit Rate ▲30.37% / 15s                                               [A4]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   A1  the kit names the Full Burst itself ("at the beginning of Full Burst"), not her own cast:
//       fullBurstEnter, NOT burstCast. Her stage-2 cast lands ~0.8s BEFORE the window opens (the
//       chain still needs the B3), so the two encodings place the 10s crit-damage window on
//       different frames — pinned against the burstCast counterfactual (Tier-2 lever).
//   A2  the kit says "Critical Rate ▲" — UNSCOPED. helm's identical-looking S1 line is scoped to
//       normal attacks (critRateNormalPct); the nearest-wrong model for aria is that scoped stat,
//       which would leave the team's skill/burst crit untouched. Proven three ways: shipped moves
//       the skill bucket (helm's crit-eligible riders), the scoped counterfactual does NOT (it
//       matches the removed reference on skill/burst), and the scoped counterfactual still moves
//       the normal bucket (i.e. it is a live but wrong-scoped stat, not a dead key).
//   A3  the engine `shield` effect is EVENT-ONLY (no HP pool; v1 boss deals no damage) and emits
//       no SimEvent, and the fixture has no `shielded` consumer — so the line is DPS-inert and is
//       pinned STRUCTURALLY (the override carries the block) + totals-equality under removal
//       (label L5 precedent).
//   A4  hitRatePct is a live StatKey and the buff genuinely applies (asserted on the log), but the
//       engine's Hit-Rate→core channel has NO MG coverage — PELLET_GAUSS / CONE_DELTA / UNIGEO and
//       the hrCoreMult fallback are all AR/SMG/SG accuracy-circle models; MG/SR/RL return the base
//       unchanged (sim.ts). So the line is damage-inert at scope lock and removal changes no
//       total — pinned as a canary: if the engine ever gains an MG HR channel this fails and the
//       line must be re-judged (⚑ out-of-domain, see override note).
//
// Fixture (deterministic — no seed; event-log over totals where a line is scoping/timing-
// sensitive): ['liter','aria','helm'] — liter (B1, 20s) opens the chain, aria is the SOLE B2
// (casts every rotation — PROBED: adding crown to the comp starves aria to zero casts, since
// same-stage selection takes the ready slot-first unit and crown's 20s cd is always up), helm
// (B3, 40s) closes it and supplies the crit-eligible skill-bucket riders + burst nukes A2 is
// discriminated on. Boss Fire (aria's ×1.1 Water major), focus aria. 5 Full Bursts in 180s.
//
// SECOND COMP (the two-way trigger lever — S2b claude-fable-5 review convergence): the STARVED
// comp ['liter','crown','aria','helm'] keeps opening Full Bursts (crown takes every stage-2
// slot) while aria casts ZERO bursts, so the two trigger encodings diverge maximally there:
// her S1 (fullBurstEnter) must STILL fire on every Full Burst she did not cast, and her burst
// block (burstCast — the shield + the self Hit Rate) must be SILENT. A driver who keyed both
// lines to the same trigger fails one side of this comp.
//
// SHIELD EMISSION (S2b review adoption): the engine `shield` effect emits no SimEvent of its
// own, so A3's liveness is proven through a TANDEM consumer — a `shielded`-triggered sentinel
// block patched into liter's override (in-memory only), which must fire exactly once per aria
// burst and zero times with aria's shield block removed. The sentinel stat is defPct: inert in
// v1 (self DEF moves no damage), so the probe run stays damage-neutral.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixtures ---------------------------------------------------------------------------------
const COMP = ['liter', 'aria', 'helm'];
const ARIA = 1; // aria's slot in COMP
/** Same chain with crown added — PROBED: crown's 20s cd is always up and same-stage selection
 *  takes the ready slot-first unit, so aria casts zero bursts while FBs still open. */
const STARVED = ['liter', 'crown', 'aria', 'helm'];
const ARIA_STARVED = 2; // aria's slot in STARVED

function runAt(
  slugs: string[],
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'aria',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}
const run = (overrides: Record<string, any> = {}) => runAt(COMP, overrides);

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------

const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** A1 reference: the S1 crit-damage line removed entirely (proves the buff is live). */
const ariaNoCritDmg = withPatchedOverride('aria', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill1.length !== before - 1) {
    throw new Error('aria S1 critDamagePct block missing — fixture is stale');
  }
});

/** A1 nearest-wrong: the same line re-keyed to HER OWN burstCast. The kit says "at the beginning
 *  of Full Burst"; her stage-2 cast lands ~0.8s before the window opens, so the two encodings
 *  place the 10s window on different frames. */
const ariaBurstCastCritDmg = withPatchedOverride('aria', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'critDamagePct'));
  if (!b || b.trigger?.kind !== 'fullBurstEnter') {
    throw new Error(
      'aria S1 fullBurstEnter critDamagePct block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'burstCast' };
});

/** A2 reference: the S2 crit-rate line removed entirely. */
const ariaNoCritRate = withPatchedOverride('aria', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill2.length !== before - 1) {
    throw new Error('aria S2 critRatePct block missing — fixture is stale');
  }
});

/** A2 nearest-wrong: the line as helm's SCOPED stat (critRateNormalPct — "Critical Rate of
 *  normal attacks"). aria's kit carries no such scoping; the scoped stat would leave team
 *  skill/burst crit untouched. */
const ariaScopedCritRate = withPatchedOverride('aria', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critRatePct');
  if (!e) {
    throw new Error('aria S2 critRatePct effect missing — fixture is stale');
  }
  e.stat = 'critRateNormalPct';
});

/** A3 reference: the burst shield line removed (proves it is exactly inert). */
const ariaNoShield = withPatchedOverride('aria', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('aria burst shield block missing — fixture is stale');
  }
});

/** A4 reference: the burst self Hit Rate line removed (proves it is damage-inert on an MG). */
const ariaNoHitRate = withPatchedOverride('aria', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'hitRatePct'));
  if (ov.burst.length !== before - 1) {
    throw new Error('aria burst hitRatePct block missing — fixture is stale');
  }
});

/** A3 tandem consumer: a `shielded`-triggered sentinel patched into liter (in-memory only).
 *  defPct is inert in v1, so the probe stays damage-neutral — the sentinel is pure signal. */
const literShieldSentinel = withPatchedOverride('liter', (ov) => {
  ov.skill1 = [
    ...ov.skill1,
    {
      slot: 'skill1',
      trigger: { kind: 'shielded' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'defPct', value: 5 }],
    },
  ];
});

/** STARVED-comp isolation: crown's burst ALSO shields the team (maxHpPct 10.45 / 15s) and would
 *  fire the sentinel on her ~10 casts there. Stripping her shield effect (keeping the same
 *  block's attackDamagePct) leaves aria's block as the ONLY shield source the sentinel can see
 *  (helm/liter carry none) — the same isolation move helm's H8 applies to crown's heal. */
const crownNoShield = withPatchedOverride('crown', (ov) => {
  let stripped = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'shield');
    stripped += before - b.effects.length;
  }
  if (stripped !== 1) {
    throw new Error('crown burst shield effect missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noCritDmg = run({ aria: ariaNoCritDmg });
const burstCastCritDmg = run({ aria: ariaBurstCastCritDmg });
const noCritRate = run({ aria: ariaNoCritRate });
const scopedCritRate = run({ aria: ariaScopedCritRate });
const noShield = run({ aria: ariaNoShield });
const noHitRate = run({ aria: ariaNoHitRate });
const shieldProbe = run({ liter: literShieldSentinel });
const shieldProbeNoShield = run({
  aria: ariaNoShield,
  liter: literShieldSentinel,
});
const starved = runAt(STARVED);
const starvedSentinel = runAt(STARVED, {
  liter: literShieldSentinel,
  crown: crownNoShield,
});

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const ariaCasts = (evs: SimEvent[]) =>
  casts(evs).filter((c) => c.slug === 'aria');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** aria's slot differs between comps (1 in COMP, 2 in STARVED) — pass the slot. */
const ariaBuffs = (evs: SimEvent[], stat: string, slot: number = ARIA) =>
  buffs(evs).filter((b) => b.casterIdx === slot && b.stat === stat);
const distinctTargets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetSlug))].sort();

/** Distinct crit rates seen per unit on the given buckets — the A2 discriminator (helm's
 *  crit-eligible skill-bucket riders carry the team crit rate verbatim into the log). */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][]
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) {
      continue;
    }
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')])
  );
}

/** Frames on which aria fired her belt dry (ammoAfter 0) — the lastBullet trigger frames. */
const ariaDryFrames = (evs: SimEvent[]): number[] =>
  evs
    .filter(
      (e): e is Shot =>
        e.kind === 'shot' && e.slug === 'aria' && e.ammoAfter === 0
    )
    .map((s) => s.frame);

describe('aria — kit spec', () => {
  describe('fixture sanity', () => {
    it('aria is the sole B2 and casts her burst every rotation', () => {
      const cs = ariaCasts(base.events);
      expect(cs.length).toBeGreaterThanOrEqual(4);
      expect(
        [...new Set(cs.map((c) => c.stage))],
        'aria is Burst II'
      ).toEqual([2]);
    });

    it('the comp opens Full Bursts for the whole fight', () => {
      expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('A1 — S1 grants all allies Critical Damage ▲26.99% at the BEGINNING of Full Burst, 10s', () => {
    const applied = ariaBuffs(base.events, 'critDamagePct');

    it('reaches all three allies once per Full Burst at the kit magnitude', () => {
      expect(applied.length).toBe(fbStarts(base.events).length * COMP.length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([26.99]);
      expect(distinctTargets(applied)).toEqual([...COMP].sort());
    });

    it('applies exactly on the Full Burst START frame (fullBurstEnter), for 10 sec', () => {
      const fbFrames = new Set(fbStarts(base.events).map((f) => f.frame));
      expect(
        applied.length,
        'no FB-entry critDamagePct buff was applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          fbFrames.has(b.frame),
          `critDamagePct applied at ${b.frame} — not a Full Burst start frame`
        ).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is LIVE: removing the window lowers every ally\u2019s total damage', () => {
      for (const slug of COMP) {
        expect(noCritDmg.totals[slug]).toBeLessThan(base.totals[slug]);
      }
    });

    it('DISCRIMINATING (timing): a burstCast re-key rides her cast frames, not the FB start', () => {
      // Shipped: no application sits on (or near) any of aria's cast frames — her stage-2 cast
      // precedes the FB opening by the ~0.8s chain completion.
      const castFrames = ariaCasts(base.events).map((c) => c.frame);
      const nearCast = applied.filter((b) =>
        castFrames.some((cf) => Math.abs(cf - b.frame) <= 2)
      );
      expect(nearCast.map((b) => b.frame)).toEqual([]);
      // Counterfactual: every application sits on a cast frame instead.
      const wrong = ariaBuffs(burstCastCritDmg.events, 'critDamagePct');
      expect(wrong.length).toBeGreaterThan(0);
      for (const b of wrong) {
        expect(
          castFrames.some((cf) => Math.abs(cf - b.frame) <= 2),
          `burstCast-keyed application at ${b.frame} has no nearby aria cast`
        ).toBe(true);
      }
      // …and at least one of those frames is NOT a Full Burst start frame.
      const fbFrames = new Set(fbStarts(base.events).map((f) => f.frame));
      expect(
        wrong.some((b) => !fbFrames.has(b.frame)),
        'cast frames should not all coincide with FB starts'
      ).toBe(true);
    });
  });

  describe('A2 — S2 grants all allies Critical Rate ▲7.03% when her last bullet hits, 5s, UNSCOPED', () => {
    const applied = ariaBuffs(base.events, 'critRatePct');

    it('is 7.03% for 5 sec, reaching all three allies on every last-bullet frame', () => {
      expect(applied.length, 'no S2 critRatePct buff applied').toBeGreaterThan(
        0
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([7.03]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      expect(distinctTargets(applied)).toEqual([...COMP].sort());
    });

    it('fires once per emptied belt (the lastBullet trigger cadence)', () => {
      const dry = ariaDryFrames(base.events);
      const applyFrames = [...new Set(applied.map((b) => b.frame))];
      expect(dry.length).toBeGreaterThan(3);
      expect(applyFrames).toEqual(dry);
    });

    it('is LIVE: the team\u2019s skill-bucket crit lifts inside the windows', () => {
      // helm fires crit-eligible skill-bucket riders on every pull, so her resolved critRate
      // records the live team crit rate; aria's windows lift it off the 0.15 base.
      expect(critRatesByUnit(base.events, ['skill'])).not.toEqual(
        critRatesByUnit(noCritRate.events, ['skill'])
      );
      for (const slug of COMP) {
        expect(noCritRate.totals[slug]).toBeLessThan(base.totals[slug]);
      }
    });

    it('DISCRIMINATING: helm-style SCOPED crit (critRateNormalPct) leaves skill/burst crit untouched', () => {
      // The scoped stat is LIVE but wrong-scoped: it still moves the normal bucket…
      expect(critRatesByUnit(scopedCritRate.events, ['normal'])).not.toEqual(
        critRatesByUnit(noCritRate.events, ['normal'])
      );
      // …yet matches the removed reference exactly on skill/burst — the faithful unscoped stat
      // moves those buckets (asserted above), so the two models are provably distinct.
      expect(
        critRatesByUnit(scopedCritRate.events, ['skill', 'burst'])
      ).toEqual(critRatesByUnit(noCritRate.events, ['skill', 'burst']));
      expect(critRatesByUnit(base.events, ['normal'])).not.toEqual(
        critRatesByUnit(noCritRate.events, ['normal'])
      );
    });
  });

  describe('A3 — Burst shields all allies for 37.86% of her final Max HP, 10s (event-only, DPS-inert)', () => {
    it('the shipped override carries a burstCast all-ally shield block at the kit magnitude', () => {
      const ov = loadOverride('aria')!;
      const shieldBlock: any = (ov.burst ?? []).find((b: any) =>
        b.effects.some((e: any) => e.kind === 'shield')
      );
      expect(
        shieldBlock,
        'no burst shield block in the shipped override'
      ).toBeDefined();
      expect(shieldBlock.trigger?.kind).toBe('burstCast');
      expect(shieldBlock.target?.kind).toBe('allies');
      const e: any = shieldBlock.effects.find((x: any) => x.kind === 'shield');
      expect(e.maxHpPct).toBe(37.86);
      expect(e.durationSec).toBe(10);
    });

    it('is INERT: removing it changes NO unit\u2019s total by a single point (no HP pool, no shielded consumer)', () => {
      expect(noShield.totals).toEqual(base.totals);
    });

    it('is LIVE as a tandem channel: a patched shielded-consumer fires exactly once per aria burst', () => {
      // The engine `shield` effect emits no SimEvent of its own; the sentinel block patched into
      // liter (trigger shielded → self defPct 5, inert in v1) makes the emission observable.
      const sentinel = (evs: SimEvent[]) =>
        buffs(evs).filter(
          (b) => b.stat === 'defPct' && b.value === 5 && b.targetSlug === 'liter'
        );
      expect(sentinel(shieldProbe.events).length).toBe(
        ariaCasts(shieldProbe.events).length
      );
      expect(
        ariaCasts(shieldProbe.events).length,
        'the probe run must still cast aria\u2019s bursts'
      ).toBeGreaterThan(0);
      // …and with the shield block removed the consumer is silent.
      expect(sentinel(shieldProbeNoShield.events)).toEqual([]);
      // Removing the sentinel-bearing line from aria must not move damage (defPct is inert).
      expect(shieldProbe.totals).toEqual(base.totals);
    });
  });

  describe('A4 — Burst grants SELF Hit Rate ▲30.37% for 15s (buff live; no MG HR→core channel ⇒ damage-inert)', () => {
    const applied = ariaBuffs(base.events, 'hitRatePct');

    it('fires once per burst cast, self-scoped, at the kit magnitude for 15 sec', () => {
      expect(applied.length).toBe(ariaCasts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30.37]);
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual(['aria']);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('is damage-INERT on an MG: removing it changes NO unit\u2019s total (canary on the HR→core channel)', () => {
      // The engine's Hit-Rate→core models (PELLET_GAUSS / CONE_DELTA / UNIGEO / the hrCoreMult
      // fallback) are accuracy-circle models for AR/SMG/SG; MG has no circle row, so the buff
      // applies but moves no core fraction. If an MG channel ever lands, this fails loudly and
      // the line must be re-judged (not silently kept as "inert").
      expect(noHitRate.totals).toEqual(base.totals);
    });
  });

  describe('the STARVED comp — burstCast vs fullBurstEnter, discriminated in both directions', () => {
    // ['liter','crown','aria','helm']: crown (B2, 20s, first-ready same-stage selection) takes
    // every stage-2 slot, so aria casts ZERO bursts while Full Bursts still open. Her
    // fullBurstEnter line (S1) must keep firing; her burstCast lines (shield + Hit Rate) must
    // be silent. A single-trigger encoding of the two fails one side of this comp.
    it('fixture: aria casts nothing, crown closes every stage-2 slot, FBs still open', () => {
      expect(ariaCasts(starved.events).length).toBe(0);
      expect(
        casts(starved.events).filter((c) => c.slug === 'crown').length
      ).toBeGreaterThan(3);
      expect(fbStarts(starved.events).length).toBeGreaterThanOrEqual(4);
    });

    it('A1 STILL fires on every Full Burst aria did NOT cast (fullBurstEnter, not burstCast)', () => {
      const applied = ariaBuffs(starved.events, 'critDamagePct', ARIA_STARVED);
      expect(applied.length).toBe(
        fbStarts(starved.events).length * STARVED.length
      );
      const fbFrames = new Set(fbStarts(starved.events).map((f) => f.frame));
      for (const b of applied) {
        expect(fbFrames.has(b.frame)).toBe(true);
      }
    });

    it('A4 is SILENT: no Hit Rate applications on rotations she did not cast (burstCast, not fullBurstEnter)', () => {
      expect(
        ariaBuffs(starved.events, 'hitRatePct', ARIA_STARVED)
      ).toEqual([]);
    });

    it('A3 is SILENT: the shielded-consumer never fires on rotations she did not cast', () => {
      const sentinel = buffs(starvedSentinel.events).filter(
        (b) => b.stat === 'defPct' && b.value === 5 && b.targetSlug === 'liter'
      );
      expect(sentinel).toEqual([]);
    });
  });
});
