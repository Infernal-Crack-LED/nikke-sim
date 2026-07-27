// PER-UNIT KIT SPEC — `mana` (Mana, Attacker/AR/Wind, Burst III, cd 40s, ammo 60). Kit-autonomy
// gauntlet 2026-07-26; test-first independent re-derivation from the blablalink prose in
// data/characters.json → characters.mana.skills.
//
// One assertion group per KIT LINE (M1..M7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is masked by another
// unit's — never to supply the encoding under test.
//
// Kit (blablalink prose, max-level values):
//   S1 ■ start of battle → self: Metal γ: ATK ▲58.08% continuously (once per battle)          [M1]
//      ■ in Metal γ after landing 10 normal attacks → all allies: recover 2.04% of caster Max HP [M6]
//      ■ (γ-gated resurrect of an incapacitated ally / ally-out-of-action → Removes Metal γ)   [UNMODELED]
//   S2 ■ start of battle → self: Metal σ: Burst Gauge filling speed ▲70.4% continuously       [M2]
//      ■ entering Full Burst in Metal σ → self: Attack Damage ▲21.12% + ATK ▲63.36% (10s), Removes σ [M3]
//      ■ entering Full Burst → 1 ally w/ longest basic Charge Time: Charge Time ▼0.18s (10s)   [M7]
//      ■ cast Burst before FB ends → self: re-grant Metal σ (re-arms the +70.4% + the FB gate) [Mσ]
//   BU ■ self: Sustained Damage ▲52.8% for 10 sec                                            [M4]
//      ■ 1 enemy nearest crosshair: 396% of final ATK as sustained damage every 1s for 10s     [M5]
//
// THE σ ECONOMY IS A LIVE RESOURCE POOL (the engine's resources/resourceGate/perResource primitives;
// soda-twinkling-bunny exemplar). `sigma` starts at 1 (max 1). The FB-entry AD/ATK buff is
// resourceGate(sigma>=1) on fullBurstEnter and spends sigma -1; sigma is re-granted (+1) only by
// mana's OWN burstCast (which lands before the FB window opens). Net: FB1 procs from the initial σ
// regardless of who casts; σ is consumed at each σ-gated FB entry and re-granted only by a mana
// cast, so in this MULTI-B3 fixture (mana + helm, both Burst III cd 40) the AD/ATK pair procs on the
// FBs mana CASTS (σ held) and NOT on the FBs helm completes while σ is down. This encoding was
// independently derived by the blind cross-family reviewer (S2b, claude-fable-5) and adopted in S3;
// it replaces a prior burstCast-keyed approximation that matched only the firing COUNT.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  γ is a PERMANENT passive (expiresFrame null, applied at t=0). Removing it drops her total
//       (it amplifies ~all her damage); a duration-gated or wrong-value encoding fails the shape pin.
//   M2  σ burstGenPct is a PERMANENT perResource passive (live = sigma×70.4). It is faithfully
//       modeled but cadENCE-INERT for mana specifically: her 40s burst CD (not gauge fill) gates her
//       casts — verified 6 casts/180s WITH or WITHOUT σ. The pin is therefore the ENCODING PRESENCE
//       (a permanent burstGenPct passive applied at t=0), discriminated against removal. (The
//       perResource σ-gating is damage-equivalent to always-on for her, so no cadence discrimination
//       exists; the gating is kept for literal σ fidelity, not asserted behaviourally.)
//   M3  The FB self-buffs key to fullBurstEnter GATED on σ. In this multi-B3 fixture FBs happen ~2×
//       as often as mana casts, so: shipped applies on the FB-start frames where σ is held (a STRICT
//       SUBSET of all FB-start frames — the mana-cast FBs); the ungated-fullBurstEnter counterfactual
//       applies on EVERY FB-start frame; the burstCast counterfactual (the prior approximation)
//       applies on mana's CAST frames, which are NOT FB-start frames (the cast lands ~0.4s before the
//       FB window opens). Three-way discrimination on the apply-frame set.
//   Mσ  The burstCast re-grant re-arms σ after FB1 consumes it. Removing it collapses the buff to
//       FB1-ONLY (the initial σ, 1 proc); shipped procs on FB1 AND every later mana-cast FB (>1).
//   M4  sustainedDamagePct is FLAVOR-SCOPED: it lifts the sustained DoT ticks (M5) in-window but
//       must NEVER lift her AR normal shots. Removing it lowers in-window tick damage and leaves her
//       normal-shot total byte-identical.
//   M5  The burst DoT is 396% final ATK, 1 tick/sec for 10s = exactly 10 ticks per cast whose full
//       window fits the fight, in the burst bucket off srcSlot 'burst'. A lvl-9 magnitude (378) or a
//       2s interval (5 ticks) counterfactual fails the per-cast pins.
//   M6  The hitCount-10 team heal is an EVENT (no HP pool modeled): its only observable is that it
//       fires crown's "when recovery takes effect → team Attack Damage +20.99%" consumer at mana's
//       hitCount-10 cadence. Isolated (crown's + helm's own heals patched out) so every recovery
//       firing is attributable to mana; removing her heal collapses the recovery count.
//   M7  Charge support: the TRIGGER (fullBurstEnter → allies chargeSpeedPct, NOT σ-gated) is
//       faithful and pinned by presence; the MAGNITUDE (18 = 0.18s ÷ 1.0s basic charge — exact for
//       helm, the control comp's only charge weapon, but comp-dependent) and the "longest-Charge-Time
//       ally" single-target selection are flagged ⚑ approximations (no engine primitive; chargeSpeedPct
//       is inert on non-charge allies), so the value is NOT pinned as a measured number.
//
// UNMODELED (never fire under scope-lock — no ally deaths; documented verbatim in the override's
// `unmodeled`): the γ-gated resurrect + "ally out of action → Removes Metal γ" (exactly why γ stays
// permanent). Inert; no assertion. (The σ re-grant + "Removes Metal σ" are NOW modeled by the resource
// pool, so unmodeled.skill2 is empty.)
//
// Fixture: the 720-kit-audit control core (liter B1 / crown B2) + mana (B3 carry, focused) + helm
// (B3) — a deliberate MULTI-B3 team so M3/Mσ's σ-economy discrimination is observable. Deterministic
// (no seed); event-log assertions over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
/** controlComp('mana') slot order: liter 0 / crown 1 / mana 2 / helm 3. */
const CROWN = 1;
const MANA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('mana'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- helpers ----------------------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');
const buffDurSec = (b: BuffApply) =>
  b.expiresFrame == null ? null : (b.expiresFrame - b.frame) / FPS;

const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const manaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'mana');
const manaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mana'
  );
const manaCastFrames = (evs: SimEvent[]) =>
  manaCasts(evs)
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbStartFrames = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** Mana's burst-bucket damage is ONLY the sustained DoT ticks (her other burst line is a buff). */
const manaDot = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'mana' && d.bucket === 'burst' && d.srcSlot === 'burst'
  );
const manaNormals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'mana' && d.bucket === 'normal');
/** Frames at which mana applied her σ-gated FB-entry Attack Damage self-buff (value-typed). */
const manaAdBuffFrames = (evs: SimEvent[]) =>
  buffs(evs)
    .filter(
      (b) =>
        b.casterIdx === MANA &&
        b.targetIdx === MANA &&
        b.stat === 'attackDamagePct' &&
        Math.abs(b.value - 21.12) < 0.01
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);
/** Distinct frames crown's recovery consumer fired (its +20.99% Attack Damage team buff). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

// ---- counterfactual / isolation patches -------------------------------------------------------
/** M1 reference: γ ATK passive removed entirely. */
const manaNoGamma = withPatchedOverride('mana', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill1.length === before)
    {throw new Error('mana S1 γ atkPct block missing — fixture is stale');}
});
/** M2 reference: σ burstGenPct passive removed entirely. */
const manaNoSigma = withPatchedOverride('mana', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'burstGenPct'));
  if (ov.skill2.length === before)
    {throw new Error('mana S2 σ burstGenPct block missing — fixture is stale');}
});
/** M3 counterfactual: the FB-entry buff UNGATED (resourceGate removed) — procs on EVERY FB. */
const manaUngatedFb = withPatchedOverride('mana', (ov) => {
  const blk = ov.skill2.find((b: any) => hasStat(b, 'attackDamagePct'));
  if (!blk || !blk.resourceGate)
    {throw new Error(
      'mana S2 σ-gated FB-entry block missing — fixture is stale'
    );}
  delete blk.resourceGate;
});
/** M3 counterfactual: the FB-entry buff re-keyed to burstCast (the prior approximation) — procs on
 *  mana's CAST frames, which precede (and are distinct from) the FB-start frames. */
const manaBurstCastKey = withPatchedOverride('mana', (ov) => {
  const blk = ov.skill2.find((b: any) => hasStat(b, 'attackDamagePct'));
  if (!blk)
    {throw new Error('mana S2 FB-entry block missing — fixture is stale');}
  blk.trigger = { kind: 'burstCast' };
  delete blk.resourceGate;
});
/** Mσ counterfactual: the burstCast σ re-grant removed — σ consumed at FB1, never re-armed. */
const manaNoRegain = withPatchedOverride('mana', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !(
        b.trigger?.kind === 'burstCast' &&
        b.effects.some((e: any) => e.kind === 'resource')
      )
  );
  if (ov.skill2.length === before)
    {throw new Error('mana S2 σ re-grant block missing — fixture is stale');}
});
/** M4 reference: the burst's sustainedDamagePct buff removed (collapses in-window DoT dmgUp). */
const manaNoSustained = withPatchedOverride('mana', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'sustainedDamagePct'));
  if (ov.burst.length === before)
    {throw new Error(
      'mana burst sustainedDamagePct block missing — fixture is stale'
    );}
});
/** M5 counterfactual: lvl-9 DoT magnitude 378 (keeps cadence, moves per-tick ATK%). */
const manaDotLvl9 = withPatchedOverride('mana', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'dot');
  if (!e) {throw new Error('mana burst dot effect missing — fixture is stale');}
  e.atkPct = 378;
});
/** M5 counterfactual: 2s tick interval (halves the tick count). */
const manaDotSlow = withPatchedOverride('mana', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'dot');
  if (!e) {throw new Error('mana burst dot effect missing — fixture is stale');}
  e.intervalSec = 2;
});
/** M6 isolation: remove crown's own self-heal so its recovery consumer only fires off others. */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before)
    {throw new Error('crown S2 heal block missing — fixture is stale');}
});
/** M6 isolation: remove BOTH of helm's heal sources (S1 full-charge heal + burst lifesteal window). */
const helmNoHeal = withPatchedOverride('helm', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
});
/** M6 reference: mana's hitCount-10 heal removed (on top of the isolation). */
const manaNoHeal = withPatchedOverride('mana', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before)
    {throw new Error('mana S1 heal block missing — fixture is stale');}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noGamma = run({ mana: manaNoGamma });
const noSigma = run({ mana: manaNoSigma });
const ungatedFb = run({ mana: manaUngatedFb });
const burstCastKey = run({ mana: manaBurstCastKey });
const noRegain = run({ mana: manaNoRegain });
const noSustained = run({ mana: manaNoSustained });
const dotLvl9 = run({ mana: manaDotLvl9 });
const dotSlow = run({ mana: manaDotSlow });
const isolated = run({ crown: crownNoHeal, helm: helmNoHeal });
const isolatedNoHeal = run({
  crown: crownNoHeal,
  helm: helmNoHeal,
  mana: manaNoHeal,
});

describe('mana — kit spec', () => {
  describe('M1 — S1 Metal γ: ATK ▲58.08% is a PERMANENT self passive, live from battle start', () => {
    const gamma = buffs(base.events).filter(
      (b) =>
        b.casterIdx === MANA &&
        b.targetIdx === MANA &&
        b.stat === 'atkPct' &&
        Math.abs(b.value - 58.08) < 0.01
    );

    it('is applied at t=0 with NO wall-clock expiry (permanent, "once per battle")', () => {
      expect(
        gamma.length,
        'no γ atkPct 58.08 buff was applied'
      ).toBeGreaterThan(0);
      expect(gamma[0].frame, 'γ must be live from battle start').toBe(0);
      expect([...new Set(gamma.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('is load-bearing: removing it drops her total damage', () => {
      expect(base.totals.mana).toBeGreaterThan(noGamma.totals.mana);
    });
  });

  describe('M2 — S2 Metal σ: Burst Gauge filling speed ▲70.4% is a permanent perResource passive', () => {
    // Cadence-inert for mana (her 40s burst CD, not gauge fill, gates her casts — verified 6 casts
    // with/without σ). The perResource σ-gating is damage-equivalent to always-on for her, so the pin
    // is the ENCODING PRESENCE (a permanent burstGenPct passive), discriminated against removal.
    const sigma = (evs: SimEvent[]) =>
      buffs(evs).filter(
        (b) =>
          b.casterIdx === MANA &&
          b.targetIdx === MANA &&
          b.stat === 'burstGenPct'
      );

    it('is applied at t=0 as a permanent passive (no wall-clock expiry)', () => {
      const applied = sigma(base.events);
      expect(
        applied.length,
        'no σ burstGenPct passive was applied'
      ).toBeGreaterThan(0);
      expect(applied[0].frame, 'σ must be live from battle start').toBe(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing the σ passive removes the burstGenPct buff entirely', () => {
      expect(sigma(noSigma.events)).toEqual([]);
    });
  });

  describe('M3 — S2 FB self-buffs (AD ▲21.12% + ATK ▲63.36%, 10s) key to fullBurstEnter GATED on Metal σ', () => {
    const fbStarts = fbStartFrames(base.events);
    const adFrames = manaAdBuffFrames(base.events);

    it('applies on FB-start frames where σ is held — a STRICT SUBSET of all FBs (multi-B3)', () => {
      expect(
        adFrames.length,
        'mana never applied her FB-entry buff'
      ).toBeGreaterThan(0);
      expect(fbStarts.length).toBeGreaterThan(adFrames.length); // σ-gated, not every FB
      // every apply frame IS a Full Burst start (fullBurstEnter trigger, σ held)
      for (const f of adFrames)
        {expect(fbStarts, `apply frame ${f} is not an FB-start`).toContain(f);}
    });

    it('is the kit magnitudes for 10 sec, self-scoped', () => {
      const ad = buffs(base.events).filter(
        (b) =>
          b.casterIdx === MANA &&
          b.targetIdx === MANA &&
          b.stat === 'attackDamagePct'
      );
      const atk = buffs(base.events).filter(
        (b) =>
          b.casterIdx === MANA &&
          b.targetIdx === MANA &&
          b.stat === 'atkPct' &&
          Math.abs(b.value - 63.36) < 0.01
      );
      expect([...new Set(ad.map((b) => b.value))]).toEqual([21.12]);
      expect([...new Set(ad.map((b) => buffDurSec(b)))]).toEqual([10]);
      expect(atk.length, 'no ATK 63.36 self-buff applied').toBeGreaterThan(0);
      expect([...new Set(atk.map((b) => buffDurSec(b)))]).toEqual([10]);
    });

    it('DISCRIMINATING: ungated fullBurstEnter would proc on EVERY FB-start frame', () => {
      expect(manaAdBuffFrames(ungatedFb.events)).toEqual(
        fbStartFrames(ungatedFb.events)
      );
      expect(manaAdBuffFrames(ungatedFb.events).length).toBeGreaterThan(
        adFrames.length
      );
    });

    it('DISCRIMINATING: burstCast keying (prior approximation) applies on CAST frames, not FB-start frames', () => {
      const cfFrames = manaAdBuffFrames(burstCastKey.events);
      const cfCasts = manaCastFrames(burstCastKey.events);
      expect(cfFrames).toEqual(cfCasts); // keyed to the cast, which precedes the FB window
      // the cast frames are NOT FB-start frames — the encoding the shipped model must differ from
      expect(cfFrames).not.toEqual(fbStartFrames(burstCastKey.events));
    });
  });

  describe('Mσ — S2 burstCast re-grant re-arms σ after FB1 consumes it', () => {
    it('shipped procs on FB1 AND later mana-cast FBs (>1); removing the re-grant collapses to FB1-only', () => {
      const shipped = manaAdBuffFrames(base.events);
      const regained = manaAdBuffFrames(noRegain.events);
      expect(
        shipped.length,
        'shipped σ buff must proc on more than just FB1'
      ).toBeGreaterThan(1);
      // without the re-grant, σ is consumed at FB1 and never re-armed → exactly one proc (the initial σ)
      expect(
        regained.length,
        'no-regain should leave only the FB1 proc from the initial σ'
      ).toBe(1);
    });
  });

  describe('M4 — burst Sustained Damage ▲52.8% (10s) is FLAVOR-SCOPED: feeds the DoT, never the normals', () => {
    it('applies on her cast frames, self-scoped, for 10 sec', () => {
      const applied = buffs(base.events).filter(
        (b) =>
          b.casterIdx === MANA &&
          b.targetIdx === MANA &&
          b.stat === 'sustainedDamagePct'
      );
      expect(
        applied.length,
        'no sustainedDamagePct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([52.8]);
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        manaCastFrames(base.events)
      );
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([10]);
    });

    it('lifts in-window DoT ticks but leaves her normal-shot total byte-identical when removed', () => {
      const casts = manaCastFrames(base.events);
      const inWindow = (d: Damage) =>
        casts.some((c) => d.frame > c && d.frame <= c + 10 * FPS);
      const baseTick = manaDot(base.events)
        .filter(inWindow)
        .map((d) => d.amount);
      const noSustTick = manaDot(noSustained.events)
        .filter(inWindow)
        .map((d) => d.amount);
      expect(
        baseTick.length,
        'no in-window DoT ticks to compare'
      ).toBeGreaterThan(0);
      expect(baseTick[0]).toBeGreaterThan(noSustTick[0]);
      const normalTotal = (evs: SimEvent[]) =>
        manaNormals(evs).reduce((s, d) => s + d.amount, 0);
      expect(normalTotal(base.events)).toBe(normalTotal(noSustained.events));
    });
  });

  describe('M5 — burst DoT: 396% of final ATK as sustained damage every 1s for 10s (10 ticks/cast)', () => {
    const ticks = manaDot(base.events);
    const completeCasts = manaCastFrames(base.events).filter(
      (c) => c + 10 * FPS <= FIGHT_FRAMES
    );

    it('is the kit magnitude, in the burst bucket off srcSlot burst', () => {
      expect(ticks.length, 'no DoT ticks landed').toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([396]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(ticks.map((d) => d.srcSlot))]).toEqual(['burst']);
    });

    it('lands exactly 10 ticks per cast whose full 10s window fits the fight, at 1 tick/sec', () => {
      expect(
        completeCasts.length,
        'no cast has a full window inside the fight'
      ).toBeGreaterThan(0);
      for (const c of completeCasts) {
        const inWindow = ticks.filter(
          (d) => d.frame > c && d.frame <= c + 10 * FPS
        );
        expect(
          inWindow.length,
          `cast at frame ${c} produced ${inWindow.length} ticks, expected 10`
        ).toBe(10);
      }
    });

    it('DISCRIMINATING: a lvl-9 magnitude keeps the cadence but moves atkPct to 378', () => {
      expect([
        ...new Set(manaDot(dotLvl9.events).map((d) => d.atkPct)),
      ]).toEqual([378]);
    });

    it('DISCRIMINATING: a 2s interval halves the per-cast tick count to 5', () => {
      const slowTicks = manaDot(dotSlow.events);
      for (const c of completeCasts) {
        const inWindow = slowTicks.filter(
          (d) => d.frame > c && d.frame <= c + 10 * FPS
        );
        expect(
          inWindow.length,
          `2s interval should give 5 ticks, got ${inWindow.length}`
        ).toBe(5);
      }
    });
  });

  describe('M6 — S1 hitCount-10 team heal is a live recovery EVENT at her shot cadence / 10', () => {
    it("drives crown's recovery consumer ~once per 10 mana shots (isolated)", () => {
      const frames = recoveryFrames(isolated.events).length;
      const shots = manaShots(isolated.events).length;
      expect(
        frames,
        `${frames} recovery firings vs ${shots} mana shots — a per-10 heal lands near shots/10`
      ).toBeGreaterThanOrEqual(Math.floor((shots / 10) * 0.9));
    });

    it('DISCRIMINATING: removing her heal collapses the isolated recovery count', () => {
      expect(recoveryFrames(isolated.events).length).toBeGreaterThan(
        recoveryFrames(isolatedNoHeal.events).length
      );
    });
  });

  describe('M7 — S2 Charge Time ▼0.18s support: fullBurstEnter trigger is live (magnitude/target are ⚑)', () => {
    it('applies a chargeSpeedPct buff to allies on Full Burst entry (trigger present, NOT σ-gated)', () => {
      const applied = buffs(base.events).filter(
        (b) => b.casterIdx === MANA && b.stat === 'chargeSpeedPct'
      );
      expect(
        applied.length,
        'no chargeSpeedPct buff was applied on FB entry'
      ).toBeGreaterThan(0);
      // value 18 and the all-allies target set are flagged ⚑ approximations — NOT pinned as measured.
    });
  });
});
