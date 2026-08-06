// PER-UNIT KIT SPEC — `signal` (Signal — SMG / Attacker / Fire / Burst II, cd 20s, ammo 120,
// reloadFrames 81, hitsPerShot 1, normalMult 8.1, SSR rarity). Kit-autonomy gauntlet
// 2026-08-05 (test-first re-derivation).
//
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/signal.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates
// exactly as a verification gauntlet would (mica/himeno precedent).
//
// Kit (blablalink prose, data/characters.json → characters.signal.skills, lvl 10):
//   S1 ■ after landing 60 normal attacks → the target(s):
//        DEF ▼ 5.94% for 5 sec.                                           [UNMODELED — G1]
//        ATK ▼ 5.94% for 5 sec.                                           [UNMODELED — G1]
//   S2 ■ self, when entering Full Burst:
//        Recover 44.08% of attack damage as HP over 10 sec.               [FAITHFUL — G3]
//   BU ■ enemies within attack range (Burst II, cd 20s):
//        229.22% of final ATK as damage                                   [FAITHFUL — G2]
//        DEF ▼ 12.34% for 10 sec.                                         [UNMODELED — G4]
//
// Signal is a fire-element B2 ATTACKER whose kit splits into three families:
//
//   • G1 (the whole S1 sentence) has NO engine channel: both halves are enemy-targeted
//     ATK▼/DEF▼ debuffs, and sim.ts admits only damageTakenPct/distributedDamagePct into
//     enemyBuffs — 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'
//     (sim.ts dispatch; mica/ether/exia/himeno/eunhwa precedent). The hitCount:60 trigger
//     IS engine-native, but encoding it with dead effects would be noise, so the line ships
//     verbatim-unmodeled + ⚑ and the omission is pinned by ABSENCE (zero signal buffApply
//     events) against the damageTakenPct laundering counterfactual which DOES emit boss
//     debuffs and lift team totals.
//   • G3 (S2) is the kit's event channel: 'Activates when entering Full Burst' →
//     fullBurstEnter (NOT burstCast — her own B2 cast lands mid-chain, BEFORE the Full
//     Burst window opens; the discrimination is the recovery start offset, pinned against
//     the burstCast-keyed counterfactual). 'Recover 44.08% of attack damage as HP over
//     10 sec' is a heal-over-time: heal ticks:10 intervalSec:1, event-only by engine design
//     (no HP amount modeled — the 44.08% magnitude rides in caveats, not fudged; helm/milk/
//     biscuit precedent). OBSERVABILITY: the heal targets SIGNAL HERSELF, and the engine
//     emits no recovery SimEvent — a recovery event is only observable through the
//     RECIPIENT's own 'recovery'-triggered blocks (fireRecovery dispatches only the
//     target's blocks). The spec therefore instruments her with an INERT PROBE via
//     withPatchedOverride — a recovery-triggered self defPct 1 buff (defPct is damage-inert
//     in v1, so the probe moves nothing: pinned) — exactly the shield-probe pattern
//     ether.test.ts uses to observe shield events through a requiresShielded gate. The
//     probe's buffApply stream IS the recovery-event log: a faithful 10s window produces
//     ~10 firings per Full Burst cycle, starting strictly AFTER signal's cast frame.
//   • G2 (burst damage) is a standard burstCast flatDamage nuke (mica/milk/belorta
//     precedent): her OWN cast, never fullBurstEnter — as the SOLE B2 she casts every Full
//     Burst so both keyings fire equal COUNTS; the discrimination is TIMING: the cast lands
//     BEFORE the Full Burst window opens, so the nuke never takes the +50% FB major
//     (discriminate by the fbMajor flag, not the count). 'Enemies within attack range'
//     collapses to the single partless boss.
//   • G4 (burst DEF▼) has the same NO-channel fate as G1 (mica M7 precedent): verbatim
//     unmodeled + ⚑, pinned against a damageTakenPct laundering.
//
// Fixture: liter/signal/ada/asuka, forced-neutral boss (null), camera focus ada (the RL
// carry). The shape is biscuit's sole-B2 comp: signal is the SOLE Burst II (20s CD covers
// stage II alone; liter B1 20s; ada + asuka B3 40s alternate stage III), so she casts every
// Full Burst and no competing B2 (crown) vacates her burst/FB assertions. asuka (B3 — no
// stage collision) is a NON-HEALING partner: with her burst's instant self-heal filtered
// out of EVERY run (helm H8 isolation precedent), NO fixture mate delivers recovery to
// anyone — signal's own S2 is the only recovery source, so her probe stream is uncontaminated
// (a healing mate like helm — burst heal AND per-pull S1 heal, both all-ally — would
// saturate the channel). Boss-debuff hygiene: liter and asuka have NO enemy-targeted blocks
// and ada's are DoTs (damage events, not buffs), so ANY boss-held buffApply in this fixture
// would be a laundering of a G1/G4 ▼ line. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SLUGS = ['liter', 'signal', 'ada', 'asuka'] as const;
/** slot order: liter 0 / signal 1 / ada 2 / asuka 3. */
const SIGNAL = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: null,
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- fixture isolation ------------------------------------------------------------------
/** asuka's burst block carries an instant self-heal; left in, it would emit recovery events
 *  and contaminate signal's probe stream. Filtered in EVERY run (helm H8 precedent). */
const asukaNoBurstHeal = withPatchedOverride('asuka', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error('asuka burst heal effect missing — fixture is stale');
  }
});

/** G3 PROBE — the engine emits no recovery SimEvent, and signal's S2 heals HERSELF, so the
 *  recovery window is observable ONLY through her own 'recovery'-triggered blocks. Instrument
 *  her with an inert one: recovery → self defPct 1 / 2s (defPct is damage-inert in v1 — the
 *  probe's zero-footprint is itself pinned in G3). The probe block is instrumentation
 *  (withPatchedOverride's isolation role), never part of the encoding under test — the
 *  shipped override supplies the heal alone (ether's shield-probe pattern). */
const PROBE = {
  slot: 'skill1',
  trigger: { kind: 'recovery' },
  target: { kind: 'self' },
  effects: [{ kind: 'buff', stat: 'defPct', value: 1, durationSec: 2 }],
};
const withProbe = (ov: any) => {
  ov.skill1.push(JSON.parse(JSON.stringify(PROBE)));
  return ov;
};

// ---- counterfactual patches ---------------------------------------------------------------
/** G1 the laundering mis-model: the S1 DEF▼/ATK▼ pair (both 5.94%) rewritten as a boss
 *  damageTakenPct debuff on the every-60-hits counter (a different mechanic the kit never
 *  grants — the boss taking MORE damage). */
const g1Laundered = withPatchedOverride('signal', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 60 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 5.94, durationSec: 5 },
    ],
  });
});
/** G2 wrong magnitude: the lvl-1 value 114.61 instead of the lvl-10 229.22. */
const g2Weak = withPatchedOverride('signal', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('signal burst flatDamage block missing — fixture is stale');
  }
  e.atkPct = 114.61;
});
/** G2 wrong trigger: fullBurstEnter (lands at the FB window start, INSIDE the +50% major)
 *  instead of burstCast (lands on signal's OWN cast frame, before the window opens). */
const g2OnFbEnter = withPatchedOverride('signal', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!block) {
    throw new Error('signal burst flatDamage block missing — fixture is stale');
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** G2 reference: the burst nuke removed (functional baseline). */
const g2NoBurst = withPatchedOverride('signal', (ov) => {
  const before = ov.burst.length;
  ov.burst = [];
  if (before === 0) {
    throw new Error('signal burst blocks missing — fixture is stale');
  }
});
/** G3 wrong trigger: burstCast keying — the recovery window opens on her OWN cast frame
 *  (mid-chain, before the FB window), not when Full Burst begins. Probe included so the
 *  window is observable under the counterfactual too. */
const g3OnBurstCast = withPatchedOverride('signal', (ov) => {
  const block = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'heal')
  );
  if (!block) {
    throw new Error('signal S2 heal block missing — fixture is stale');
  }
  block.trigger = { kind: 'burstCast' };
  withProbe(ov);
});
/** G3 probe-only instrumented shipped model (the recovery-event log for the window shape). */
const g3Probed = withPatchedOverride('signal', withProbe);
/** G3 reference: the S2 heal removed, probe still armed (proves ONLY S2 feeds the probe). */
const g3NoS2 = withPatchedOverride('signal', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('signal skill2 blocks missing — fixture is stale');
  }
  withProbe(ov);
});
/** G4 the laundering mis-model: the burst DEF▼ rewritten as a boss damageTakenPct debuff. */
const g4Laundered = withPatchedOverride('signal', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 12.34, durationSec: 10 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim; asuka isolation in every run) ----------------
const runIsolated = (signalOverride?: any) =>
  run({
    asuka: asukaNoBurstHeal,
    ...(signalOverride ? { signal: signalOverride } : {}),
  });
const base = runIsolated();
const g1 = runIsolated(g1Laundered);
const weak = runIsolated(g2Weak);
const onFbEnter = runIsolated(g2OnFbEnter);
const noBurst = runIsolated(g2NoBurst);
const probed = runIsolated(g3Probed);
const onBurstCast = runIsolated(g3OnBurstCast);
const noS2Probed = runIsolated(g3NoS2);
const g4 = runIsolated(g4Laundered);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const signalBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'signal');
const signalNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'signal' && e.bucket === 'burst'
  );
/** The G3 probe's firing frames — one buffApply per recovery event delivered to signal
 *  (applyBuff emits on refresh too), i.e. the recovery-event log itself. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  buffs(evs)
    .filter(
      (b) => b.casterIdx === SIGNAL && b.stat === 'defPct' && b.value === 1
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);

describe('signal — kit spec', () => {
  describe('fixture sanity — the B2 chain actually runs', () => {
    it('signal is the sole B2 and casts every Full Burst (>= 6 casts / 180s)', () => {
      expect(signalBursts(base.events).length).toBeGreaterThanOrEqual(6);
    });
    it('her SMG weapon deals damage on the plain scope-lock basis (SSR)', () => {
      expect(base.totals.signal).toBeGreaterThan(0);
    });
    it('the isolation holds: signal S2 is the ONLY recovery source in the fixture', () => {
      // Probe armed but S2 removed → zero firings: no fixture mate delivers recovery.
      expect(recoveryFrames(noS2Probed.events)).toEqual([]);
    });
  });

  describe('G1 — S1 (every 60 hits → enemy DEF▼5.94%/ATK▼5.94%, 5s) is genuinely unmodeled', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride('signal') as any;
      const joined = ov.unmodeled.skill1.join('\n');
      expect(joined).toContain('Activates after landing 60 normal attack(s)');
      expect(joined).toContain('DEF ▼ 5.94% for 5 sec.');
      expect(joined).toContain('ATK ▼ 5.94% for 5 sec.');
    });

    it('enacts NOTHING: signal emits no buff applications at all (S2 is a heal event, burst is flat damage)', () => {
      expect(
        buffs(base.events).filter((b) => b.casterIdx === SIGNAL),
        'no signal-cast buff may exist'
      ).toEqual([]);
    });

    it('DISCRIMINATING: a damageTakenPct laundering on the 60-hit counter emits boss debuffs and lifts team totals', () => {
      const bossDebuffs = buffs(g1.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(bossDebuffs.length).toBeGreaterThan(0);
      expect([...new Set(bossDebuffs.map((b) => b.value))]).toEqual([5.94]);
      expect(sum(g1.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('G2 — burst nuke: 229.22% of final ATK to enemies in attack range, on her OWN cast', () => {
    const casts = signalBursts(base.events);
    const nukes = signalNukes(base.events);

    it('fires once per signal burst cast, at the kit magnitude, in the burst bucket, crit-eligible', () => {
      expect(casts.length).toBeGreaterThanOrEqual(6);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([229.22]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
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

    it('DISCRIMINATING: the lvl-1 magnitude 114.61 changes every nuke', () => {
      expect([...new Set(signalNukes(weak.events).map((d) => d.atkPct))]).toEqual(
        [114.61]
      );
    });

    it('DISCRIMINATING: fullBurstEnter keying lands INSIDE the FB window (+50% major) off the cast frames', () => {
      const fbNukes = signalNukes(onFbEnter.events);
      expect(fbNukes.length).toBeGreaterThan(0);
      // As the sole B2 the counts coincide — the discrimination is TIMING, not count:
      // every fullBurstEnter nuke sits inside the window and takes the +50% major.
      expect(
        fbNukes.every((d) => d.fbMajorApplied),
        'fullBurstEnter nukes must take the FB major'
      ).toBe(true);
      const castFrames = new Set(
        signalBursts(onFbEnter.events).map((c) => c.frame)
      );
      expect(
        fbNukes.filter((d) => castFrames.has(d.frame)),
        'fullBurstEnter applications must land off her cast frames'
      ).toEqual([]);
      expect(sum(onFbEnter.totals)).not.toEqual(sum(base.totals));
    });

    it('FUNCTIONAL: removing the burst erases every nuke and lowers her total', () => {
      expect(signalNukes(noBurst.events)).toHaveLength(0);
      expect(base.totals.signal).toBeGreaterThan(noBurst.totals.signal);
    });
  });

  describe('G3 — S2: entering Full Burst → self recovery, 44.08% of attack damage over 10 sec', () => {
    // The engine heal carries no HP amount by design — the encodable substance is the
    // 10-SECOND RECOVERY-EVENT WINDOW (ticks:10 intervalSec:1). The heal targets signal
    // HERSELF and no recovery SimEvent exists, so the window is observed through her own
    // inert recovery PROBE (defPct 1 buffApply per delivered recovery). Only casts whose
    // full window fits inside the 180s fight are measurable.
    const casts = signalBursts(probed.events).filter(
      (c) => c.frame + 13 * FPS <= FIGHT_FRAMES
    );
    const frames = recoveryFrames(probed.events);

    it('has bursts with a complete window to measure', () => {
      expect(
        casts.length,
        'no signal burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
    });

    it('keeps recovery firing across the whole 10 sec after each Full Burst entry', () => {
      for (const cast of casts) {
        const inWindow = frames.filter(
          (f) => f > cast.frame && f <= cast.frame + 13 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - inWindow[0]) / FPS
          : 0;
        expect(
          inWindow.length,
          `FB after cast at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery ` +
            `firing(s) spanning ${spanSec.toFixed(1)}s — a single instant heal produces exactly 1`
        ).toBeGreaterThanOrEqual(8);
        expect(
          spanSec,
          'the window must span ~9-10s of ticks, not collapse to one frame'
        ).toBeGreaterThanOrEqual(8);
      }
    });

    it('opens strictly AFTER her own cast frame — the FB window, not her cast, keys the heal', () => {
      expect(casts.length).toBeGreaterThan(0);
      for (const cast of casts) {
        const first = frames.find((f) => f >= cast.frame);
        expect(
          first,
          `no recovery firing after cast at ${cast.sec.toFixed(2)}s`
        ).toBeDefined();
        expect(
          first,
          `recovery fired ON cast frame ${cast.frame} — burstCast keying, not fullBurstEnter`
        ).toBeGreaterThan(cast.frame);
      }
    });

    it('the probe is inert: instrumenting the channel moves no unit total by a point', () => {
      expect(probed.totals).toEqual(base.totals);
    });

    it('DISCRIMINATING: burstCast keying opens the window ON her cast frames', () => {
      const cfFrames = recoveryFrames(onBurstCast.events);
      const castFrames = new Set(
        signalBursts(onBurstCast.events).map((c) => c.frame)
      );
      // Every cast fires its heal instantly on its OWN frame under the counterfactual —
      // one recovery firing per cast frame (the shipped model has ZERO on-cast firings:
      // every shipped firing is strictly after its cast).
      expect(castFrames.size).toBeGreaterThan(0);
      expect(
        cfFrames.filter((f) => castFrames.has(f)),
        'burstCast-keyed recovery must fire exactly on every cast frame'
      ).toHaveLength(castFrames.size);
      expect(
        frames.filter((f) => casts.some((c) => c.frame === f)),
        'shipped recovery must never fire on a cast frame'
      ).toEqual([]);
    });

    it('FUNCTIONAL: removing S2 starves the armed probe (only S2 feeds it)', () => {
      expect(recoveryFrames(noS2Probed.events)).toEqual([]);
      expect(recoveryFrames(probed.events).length).toBeGreaterThan(0);
    });

    it('is damage-inert by construction: totals are byte-identical with the line removed', () => {
      expect(noS2Probed.totals).toEqual(probed.totals);
    });
  });

  describe('G4 — burst DEF ▼12.34% for 10s is genuinely unmodeled (no enemy-DEF channel)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.unmodeled.burst.join('\n')).toContain(
        'DEF ▼ 12.34% for 10 sec.'
      );
    });

    it('enacts NOTHING: no boss debuff anywhere (DEF▼ is dropped, not laundered)', () => {
      // Boss debuffs emit with targetIdx null. Fixture mates cannot produce one: liter and
      // asuka have no enemy-targeted blocks and ada's are DoTs (damage events, not buffs) —
      // so ANY boss-held buffApply would be a laundering of a signal ▼ line.
      expect(
        buffs(base.events).filter((b) => b.targetIdx === null),
        'no boss-targeted debuff may exist'
      ).toEqual([]);
    });

    it('DISCRIMINATING: a damageTakenPct laundering emits boss debuffs and lifts team totals', () => {
      const bossDebuffs = buffs(g4.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(bossDebuffs.length).toBeGreaterThan(0);
      expect([...new Set(bossDebuffs.map((b) => b.value))]).toEqual([12.34]);
      expect(sum(g4.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('trigger + effect encoding — literal kit/datamine semantics', () => {
    it('S1 is EMPTY (the hitCount:60 trigger is engine-native but both ▼ effects have no channel)', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.skill1).toEqual([]);
    });

    it('S2 is ONE fullBurstEnter self-heal block: ticks 10, intervalSec 1', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.skill2.length).toBe(1);
      const block = ov.skill2[0];
      expect(block.trigger).toEqual({ kind: 'fullBurstEnter' });
      expect(block.target).toEqual({ kind: 'self' });
      expect(block.effects).toEqual([
        { kind: 'heal', ticks: 10, intervalSec: 1 },
      ]);
    });

    it('the burst is ONE flatDamage block keyed to her own cast', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.burst.length).toBe(1);
      const block = ov.burst[0];
      expect(block.trigger).toEqual({ kind: 'burstCast' });
      expect(block.target).toEqual({ kind: 'enemy' });
      expect(block.effects).toEqual([
        { kind: 'flatDamage', atkPct: 229.22 },
      ]);
    });
  });
});
