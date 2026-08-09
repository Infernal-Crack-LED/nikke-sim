// PER-UNIT KIT SPEC — `makima` (Makima, Defender/SMG/Water, Burst II, cd 20s, ammo 120,
// hitsPerShot 1, reloadFrames 111). Kit-autonomy gauntlet 2026-08-04, test-first (S2a).
//
// One assertion group per KIT LINE (M1..M4 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and PROBES (synthetic consumers that make an
// event-only line observable) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.makima.skills):
//   S1 ■ attacked 20 times → all allies: Reload Speed ▲36.96% / DEF ▲14.78% for 10 sec   [L1]
//   S2 ■ after landing 120 normal attacks → self: Attract: Taunt all enemies for 3 sec    [L2]
//      ■ taking lethal damage → self: Indomitability 7 sec (1/battle)                     [L3]
//                                   + Cooldown of Burst Skill ▼11.58 sec                  [L4]
//   BU ■ self: Gain Pierce for 10 sec                                                     [L5]
//      ■ self: Recover 34.02% of attack damage as HP OVER 10 SEC                          [L6]
//      ■ during indomitability → self: Incoming healing ▲41.02% for 10 sec                [L7]
//
// Dispositions: L5/L6 FAITHFUL (block-modeled, pinned M1/M2). L1/L2/L3/L4/L7 UNMODELED —
// out-of-domain (v1 models NO incoming ally damage: no attacked-count trigger, no lethal-damage
// trigger, no indomitability status, no aggro/targeting; admi ⚑1 / folkwang / blanc / poli
// precedents) — absence-pinned M3 (behavioural + structural).
//
// Why each assertion discriminates:
//   M1  the pierce tag is damage-INERT at scope lock (nothing consumes it: no pierceDamagePct
//       source in the fixture, PIERCE_CORE_DOUBLE=false — alice precedent), so the shipped model
//       must total EXACTLY as the tag-less one. The probe run injects a pierceDamagePct self-buff
//       to make the tag observable: with it, her in-window normal hits must lift strictly above
//       the untagged counterfactual while the out-of-window hits stay byte-identical — pinning
//       BOTH the tag's presence and its 10s boundary. A permanent-pierce misread (no durationSec /
//       top-level hasPierce) would lift the out-of-window segment too and fail the equality leg.
//   M2  her recovery is self-targeted, so NO fixture ally can consume it — the probe injects a
//       recovery-triggered inert buff on makima herself. A 10s HoT (ticks:10) must fire it ~10×
//       per cast spanning ≥8s; a single-instant-heal counterfactual fires exactly 1× and fails.
//   M3  every unmodeled line is damage-irrelevant at scope lock, so the WHOLE shipped kit must
//       total byte-identical to the bare weapon. The phantom counterfactual (S1 as an always-on
//       team reloadSpeedPct — the nearest wrong model of the attacked-20x line) moves team totals
//       and fails the pin; the structural scan pins the exact block inventory so no future edit
//       can smuggle in a burstCdr/taunt/status encoding of an out-of-domain line.
//   M0  fixture guard: makima is the SOLE Burst II in the comp (liter B1 / makima B2 / ada B3) —
//       a second B2 (crown-style) would starve her casts to zero and vacuate every assertion.
//
// Fixture: liter / makima / ada, boss Fire (water ×1.10), focus ada, scope-lock basis.
// Deterministic (no seed); event-log over totals wherever an event exists.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SLUGS = ['liter', 'makima', 'ada'] as const;
/** Slot order above: liter 0 / makima 1 / ada 2. */
const MAKIMA = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const COMP = {
  slugs: [...SLUGS],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...COMP,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / probe patches -----------------------------------------------------------
const hasGainPierce = (b: any) =>
  b.effects.some((e: any) => e.kind === 'gainPierce');
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** M1 reference: her burst pierce line removed entirely. */
const makimaNoPierce = withPatchedOverride('makima', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasGainPierce(b));
  if (ov.burst.length === before) {
    throw new Error('makima burst gainPierce block missing — fixture is stale');
  }
});

/** M1 probe: a passive pierceDamagePct self-buff makes the pierce TAG observable (it feeds the
 *  Damage-Up bucket of pierce-tagged hits, sim.ts pierceTagged gate). Present in BOTH the shipped
 *  and the tag-less run — only the gainPierce block differs between them. */
const injectPierceProbe = (ov: any) => {
  ov.skill1 = [
    ...(ov.skill1 ?? []),
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'pierceDamagePct', value: 50, durationSec: 180 },
      ],
    },
  ];
};
const makimaPierceProbe = withPatchedOverride('makima', injectPierceProbe);
const makimaPierceProbeNoTag = withPatchedOverride('makima', (ov) => {
  injectPierceProbe(ov);
  ov.burst = ov.burst.filter((b: any) => !hasGainPierce(b));
});

/** M2 probe: her recovery is SELF-targeted, so no ally can consume it — inject a
 *  recovery-triggered buff on makima herself. defPct is damage-inert in v1, so the probe changes
 *  no totals; its buffApply events are the heal cadence made visible. */
const injectRecoveryProbe = (ov: any) => {
  ov.skill2 = [
    ...(ov.skill2 ?? []),
    {
      slot: 'skill2',
      trigger: { kind: 'recovery' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'defPct', value: 1, durationSec: 0.5 }],
    },
  ];
};
const makimaHealProbe = withPatchedOverride('makima', injectRecoveryProbe);
/** M2 counterfactual: the same recovery line as a single INSTANT heal (no ticks). */
const makimaHealInstant = withPatchedOverride('makima', (ov) => {
  injectRecoveryProbe(ov);
  for (const b of ov.burst) {
    for (const e of b.effects) {
      if (e.kind === 'heal') {
        delete e.ticks;
        delete e.intervalSec;
      }
    }
  }
});

/** M3 counterfactual: the nearest wrong model of L1 — her attacked-20x team reload-speed line as
 *  an always-on passive (the trigger is unmodelable in v1; the line must NOT fire at all). */
const makimaS1Phantom = withPatchedOverride('makima', (ov) => {
  ov.skill1 = [
    ...(ov.skill1 ?? []),
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [
        {
          kind: 'buff',
          stat: 'reloadSpeedPct',
          value: 36.96,
          durationSec: 180,
        },
      ],
    },
  ];
});

/** M3 bare-kit basis: the empty kit (no override exists for makima pre-gauntlet; this is the
 *  weapon-only model every unmodeled line must not disturb). */
const bareKit = bareWeaponOverride('makima');

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const bare = run({ makima: bareKit });
const noPierce = run({ makima: makimaNoPierce });
const pierceProbed = run({ makima: makimaPierceProbe });
const pierceProbeNoTag = run({ makima: makimaPierceProbeNoTag });
const healProbed = run({ makima: makimaHealProbe });
const healInstant = run({ makima: makimaHealInstant });
const s1Phantom = run({ makima: makimaS1Phantom });

// ---- readers ----------------------------------------------------------------------------------
const makimaCasts = (evs: SimEvent[]): BurstCast[] =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'makima'
  );
const makimaNormals = (evs: SimEvent[]): Damage[] =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'makima' && e.bucket === 'normal'
  );
const probeFirings = (evs: SimEvent[]): BuffApply[] =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === MAKIMA &&
      e.stat === 'defPct' &&
      e.value === 1
  );

/** Her normal-bucket damage summed in [from, to), anchored per cast. */
function windowSum(evs: SimEvent[], from: number, to: number): number {
  return makimaNormals(evs)
    .filter((d) => d.frame >= from && d.frame < to)
    .reduce((s, d) => s + d.amount, 0);
}

describe('makima — kit spec', () => {
  describe('M0 — fixture guard: sole-B2 comp, she casts every FB cycle', () => {
    it('casts her burst at stage 2, repeatedly (not starved by a second B2)', () => {
      const casts = makimaCasts(base.events);
      expect(
        casts.length,
        'no makima burst casts — fixture is starved'
      ).toBeGreaterThanOrEqual(6);
      expect([...new Set(casts.map((c) => c.stage))]).toEqual([2]);
    });
  });

  describe('M1 — L5 burst "Gain Pierce for 10 sec": timed self pierce tag, inert at scope lock', () => {
    it('is damage-inert at scope lock: shipped totals EXACTLY match the tag-less model', () => {
      expect(base.totals).toEqual(noPierce.totals);
    });

    it('tags her normal hits for 10s after each cast (probe: pierceDamagePct feed goes live in-window only)', () => {
      const casts = makimaCasts(pierceProbed.events);
      const measurable = casts.filter((c, i) => {
        const next = casts[i + 1];
        return c.frame + 10 * FPS < (next ? next.frame : FIGHT_FRAMES);
      });
      expect(
        measurable.length,
        'no cast has a full 10s pierce window before the next cast / fight end'
      ).toBeGreaterThanOrEqual(3);
      for (const c of measurable) {
        const inShipped = windowSum(
          pierceProbed.events,
          c.frame,
          c.frame + 10 * FPS
        );
        const inNoTag = windowSum(
          pierceProbeNoTag.events,
          c.frame,
          c.frame + 10 * FPS
        );
        expect(
          inShipped,
          `cast at ${c.sec.toFixed(1)}s: in-window normal damage must lift under the probe`
        ).toBeGreaterThan(inNoTag);
      }
    });

    it('expires at 10s: out-of-window hits are byte-identical with and without the tag', () => {
      const casts = makimaCasts(pierceProbed.events);
      let checked = 0;
      for (let i = 0; i + 1 < casts.length; i++) {
        const from = casts[i].frame + 11 * FPS; // 1s safety past the 10s expiry
        const to = casts[i + 1].frame;
        if (to - from < FPS) {
          continue;
        } // no clean gap (casts abnormally close)
        expect(
          windowSum(pierceProbed.events, from, to),
          `gap after cast ${i} must not carry the pierce feed — a permanent tag would lift it`
        ).toBe(windowSum(pierceProbeNoTag.events, from, to));
        checked++;
      }
      expect(
        checked,
        'no inter-cast gap was measurable'
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe('M2 — L6 burst "Recover 34.02% of attack damage as HP OVER 10 SEC": a 10s recovery window', () => {
    const firingsFor = (evs: SimEvent[], cast: BurstCast) =>
      probeFirings(evs).filter(
        (b) => b.frame >= cast.frame && b.frame <= cast.frame + 11 * FPS
      );

    it('keeps recovery firing across the whole 10s after each cast (not one instant heal)', () => {
      const casts = makimaCasts(healProbed.events).filter(
        (c) => c.frame + 10 * FPS <= FIGHT_FRAMES
      );
      expect(
        casts.length,
        'no makima burst has a full 10s window inside the fight'
      ).toBeGreaterThanOrEqual(3);
      for (const c of casts) {
        const firings = firingsFor(healProbed.events, c);
        const spanSec = firings.length
          ? (firings[firings.length - 1].frame - c.frame) / FPS
          : 0;
        expect(
          firings.length,
          `cast at ${c.sec.toFixed(1)}s produced ${firings.length} recovery firing(s) spanning ` +
            `${spanSec.toFixed(1)}s — a single instant heal produces exactly 1 at 0.0s`
        ).toBeGreaterThanOrEqual(8);
        expect(firings.length).toBeLessThanOrEqual(12);
        expect(
          spanSec,
          'the recovery window must reach ~10s, not collapse to the cast frame'
        ).toBeGreaterThanOrEqual(8);
      }
    });

    it('DISCRIMINATING: an instant-heal encoding fires once per cast and fails the window pin', () => {
      const casts = makimaCasts(healInstant.events).filter(
        (c) => c.frame + 10 * FPS <= FIGHT_FRAMES
      );
      expect(casts.length).toBeGreaterThanOrEqual(3);
      const counts = casts.map((c) => firingsFor(healInstant.events, c).length);
      expect(
        counts.some((n) => n >= 8),
        `instant-heal counterfactual firing counts ${JSON.stringify(counts)} — none may look ` +
          'like the shipped HoT cadence'
      ).toBe(false);
    });
  });

  describe('M3 — L1 is now encoded but inert at scope lock; L2/L3/L4/L7 remain unmodeled', () => {
    it('shipped totals are byte-identical to the bare weapon (no phantom damage from any line)', () => {
      expect(base.totals).toEqual(bare.totals);
    });

    it('DISCRIMINATING: an always-on encoding of the attacked-20x reload line moves team totals', () => {
      expect(s1Phantom.totals).not.toEqual(bare.totals);
    });

    it('structural: S1 encodes the attacked-20x reload/DEF block; S2 stays empty; burst is [gainPierce, heal]', () => {
      const ov = loadOverride('makima') as any;
      expect(ov, 'makima has no override on disk').toBeTruthy();
      expect(
        ov.skill1,
        'S1 must now contain the attacked-20x block'
      ).toHaveLength(1);
      const s1 = ov.skill1[0];
      expect(s1.trigger).toEqual({ kind: 'attacked', count: 20 });
      expect(s1.target).toEqual({ kind: 'allies' });
      expect(s1.effects).toEqual([
        { kind: 'buff', stat: 'reloadSpeedPct', value: 36.96, durationSec: 10 },
        { kind: 'buff', stat: 'defPct', value: 14.78, durationSec: 10 },
      ]);
      expect(
        ov.skill2,
        'S2 must stay unmodeled (taunt/lethal-damage lines are out of domain — in particular NO burstCdr)'
      ).toEqual([]);
      expect(ov.burst).toHaveLength(2);
      const pierce = ov.burst.find((b: any) => hasGainPierce(b));
      const heal = ov.burst.find((b: any) => hasHeal(b));
      expect(pierce).toBeTruthy();
      expect(heal).toBeTruthy();
      expect(pierce.trigger).toEqual({ kind: 'burstCast' });
      expect(pierce.target).toEqual({ kind: 'self' });
      expect(pierce.effects).toEqual([{ kind: 'gainPierce', durationSec: 10 }]);
      expect(heal.trigger).toEqual({ kind: 'burstCast' });
      expect(heal.target).toEqual({ kind: 'self' });
      expect(heal.effects).toEqual([
        { kind: 'heal', ticks: 10, intervalSec: 1 },
      ]);
      const all = [...ov.skill1, ...ov.skill2, ...ov.burst];
      expect(
        all.some((b: any) => b.effects.some((e: any) => e.kind === 'burstCdr')),
        'the lethal-gated burstCdr (L4) must not be encoded unconditionally'
      ).toBe(false);
    });

    it('structural: the unmodeled record carries every still-skipped line (no silent drops)', () => {
      const ov = loadOverride('makima') as any;
      const un = ov.unmodeled;
      expect(un.skill1).toEqual([]);
      expect(
        un.skill2.some((s: string) => s.includes('Taunt all enemies'))
      ).toBe(true);
      expect(
        un.skill2.some((s: string) => s.includes('indomitability for 7 sec'))
      ).toBe(true);
      expect(
        un.skill2.some((s: string) =>
          s.includes('Cooldown of Burst Skill ▼ 11.58 sec.')
        )
      ).toBe(true);
      expect(
        un.burst.some((s: string) => s.includes('Incoming healing ▲ 41.02%'))
      ).toBe(true);
    });
  });

  describe('M4 — rotation integrity: no cast lands closer than her unmodified 20s CD', () => {
    it('consecutive casts respect the CD (no phantom cooldown reduction is live)', () => {
      const frames = makimaCasts(base.events).map((c) => c.frame);
      for (let i = 1; i < frames.length; i++) {
        const gapSec = (frames[i] - frames[i - 1]) / FPS;
        expect(
          gapSec,
          `casts ${i - 1}→${i} only ${gapSec.toFixed(1)}s apart — her 20s CD cannot sustain that ` +
            'without a cooldown reduction, and the lethal-gated one is unmodeled'
        ).toBeGreaterThanOrEqual(15);
      }
    });

    it('her cast count equals the bare-kit count (the rotation is undisturbed by the kit)', () => {
      expect(makimaCasts(base.events).length).toBe(
        makimaCasts(bare.events).length
      );
    });
  });
});
