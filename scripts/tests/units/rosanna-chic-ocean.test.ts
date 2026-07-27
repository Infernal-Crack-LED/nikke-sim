// PER-UNIT KIT SPEC — `rosanna-chic-ocean` (Rosanna: Chic Ocean, Supporter/AR/Wind, Burst II,
// cd 20s, ammo 60). The AR/Wind variant — a DIFFERENT unit from the MG/Electric base (slug
// `rosanna`); never conflate them (P0). Kit-autonomy gauntlet 2026-07-25.
//
// One assertion group per KIT LINE (R1..R5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['rosanna-chic-ocean'].skills):
//   S1 ■ start of battle → all allies: Damage to Parts ▲24.26% for 15 sec                 [R4 inert]
//      ■ ally/self destroys an enemy part → all allies: ATK ▲3% of caster ATK, ×5, 30s    [R5 UNMODELED]
//   S2 ■ (CD 30s) all allies: Damage to Parts ▲24.26% for 15 sec                          [R4 inert]
//      ■ (CD 30s) enemy nearest crosshair: 70.4% of FINAL ATK as sustained dmg /1s for 15s [R1 LOAD-BEARING]
//   BU ■ all allies: Sustained Damage ▲20.32% for 10 sec                                  [R2 LOAD-BEARING]
//      ■ all enemies: Damage Taken ▲32.23% for 10 sec                                     [R3 LOAD-BEARING]
//
// She is a PARTS-support buffer; against the partless scope-lock boss both Damage-to-Parts buffs
// (R4) and the part-destroy ATK stacks (R5) are INERT, so she is EXPECTED to look weak here —
// faithful, not a bug. Her ONLY damage is the S2 sustained DoT (R1); her burst (R2/R3) amplifies
// it (sustainedDamagePct feeds the sustained-flavored DoT) and the whole team (damageTakenPct).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   R1  the ⚑2 cadence resolution: skill2 has NO activation clause in the kit text, so the
//       datamined skillCooldownsSec.skill2 = 30 is the re-activation CD → auto-cast every 30s,
//       each cast a 15s window, FIRST fire at t=CD (no "Forcefully uses Skill 2" clause, so no
//       force-cast to t=0). That is 5 windows [31-45]…[151-165] = 75 ticks at exactly 1 tick/sec.
//       The REPLACED encoding (the invented passive-continuous "ONE passive instance dur 999",
//       100% uptime) would tick ~179× starting at t=1 — the counterfactual proves the 75/t=31 pin
//       is one it provably fails (and an interval+durationSec:15 overlap trap with CD<15s would
//       stack ~2 ticks/sec — the absolute cadence assertion kills that too). A lvl-9 magnitude
//       (67.2) keeps 75 ticks but moves atkPct — the second counterfactual.
//   R2  sustainedDamagePct is live ONLY because the DoT is flavored `sustained`: in-window DoT
//       ticks carry mult.dmgUp 1.2032, out-of-window 1.0, while her AR NORMAL shots NEVER carry
//       1.2032 (flavor-scoped — kills the attackDamagePct misread, which would lift every shot).
//       TRIGGER IDENTITY: the line fires on HER OWN burstCast (cd 20s), not fullBurstEnter — pinned
//       by application-frame timing: the buff lands on each of her 9 burstCast frames (each BEFORE
//       the FB window opens), whereas fullBurstEnter would land on the 5 fullBurstStart frames.
//       (A co-B2 divergence fixture is degenerate here — crown monopolizes every B2 cast, leaving
//       rosanna 0 casts — so cast-frame timing is the load-bearing discriminator.) Value 20.32 not
//       the lvl-9 19.4.
//   R3  damageTakenPct is a taken-bucket DEBUFF on the BOSS (targetIdx null, casterIdx null — the
//       engine attributes no caster to an enemy debuff, so filter by stat+value, NOT indices):
//       in-window DoT ticks carry mult.taken 1.3223. Same burstCast trigger identity as R2 (applies
//       on her cast frames). Removing it collapses to 1.0 and drops her total. Value 32.23 not
//       lvl-9 30.76.
//   R4  partsDamagePct must be EXACTLY inert vs the partless boss — byte-identical totals for every
//       unit on removal (not "small"), while the buffApply events still fire (the encoding is live,
//       just damage-inert). The two copies stay DISTINCT blocks: S1 applies once at frame 0
//       (battle-start), S2 recurs on the 30s CD — both asserted. Same inertness shape as helm H4.
//   R5  the part-destroy ATK stacks (3% caster ATK ×5 to all allies) are genuinely-skippable here:
//       the trigger "destroys an enemy's part" NEVER fires on the partless boss. Documented, not
//       asserted — but ⚑ a BIG hidden lever (casterAtkPct — flat 3% of HER ATK, not atkPct — ×5 =
//       15% to ALL allies) on parts bosses.
//
// Fixture: a minimal legal chain so the B2 under test actually CASTS — liter (B1) /
// rosanna-chic-ocean (B2) / ada (B3), forced-neutral boss (no elemental major confounds the
// sustained/taken bucket reads), focus ada. Deterministic (no seed). rosanna-chic-ocean is slot 1.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'rosanna-chic-ocean', 'ada'] as const;
const RCO = 1; // slot index of rosanna-chic-ocean in SLUGS
const ALL_ALLIES = [0, 1, 2];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

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

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** rosanna's sustained DoT ticks (her only damage line). */
const rcoDot = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'rosanna-chic-ocean' && d.srcSlot === 'skill2'
  );
/** rosanna's AR normal-shot damage. */
const rcoNormals = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'rosanna-chic-ocean' && d.bucket === 'normal'
  );
const buffDurSec = (b: BuffApply) =>
  b.expiresFrame == null ? null : (b.expiresFrame - b.frame) / FPS;
/** Distinct frames rosanna cast her burst. */
const rcoCastFrames = (evs: SimEvent[]) =>
  evs
    .filter(
      (e): e is BurstCast =>
        e.kind === 'burstCast' && e.slug === 'rosanna-chic-ocean'
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);
/** Distinct frames a Full Burst window opened. */
const fbStartFrames = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** Distinct frames rosanna applied a given stat. */
const applyFrames = (evs: SimEvent[], stat: string, byCaster = true) =>
  [
    ...new Set(
      buffs(evs)
        .filter((b) => b.stat === stat && (!byCaster || b.casterIdx === RCO))
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

// ---- counterfactuals (nearest wrong model each pin must discriminate against) -----------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const dotBlock = (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'dot')
  );
  if (!b)
    {throw new Error(
      'rosanna-chic-ocean S2 dot block missing — fixture is stale'
    );}
  return b;
};
const dotEffect = (ov: any) => {
  const e = dotBlock(ov).effects.find((x: any) => x.kind === 'dot');
  if (!e)
    {throw new Error(
      'rosanna-chic-ocean S2 dot effect missing — fixture is stale'
    );}
  return e;
};

/** R1 counterfactual: the REPLACED invented encoding — passive-continuous, 100% uptime (dur 999). */
const cfContinuous = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  dotBlock(ov).trigger = { kind: 'passive' };
  dotEffect(ov).durationSec = 999;
});
/** R1 counterfactual: lvl-9 magnitude 67.2 (keeps the cadence, moves the per-tick ATK%). */
const cfDotLvl9 = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  dotEffect(ov).atkPct = 67.2;
});
/** R2/R3 counterfactual: burst trigger re-keyed to fullBurstEnter (trigger-identity misread). */
const cfFbEnter = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  for (const b of ov.burst) {b.trigger = { kind: 'fullBurstEnter' };}
});
/** R2 counterfactual: sustained Damage line removed (functional — collapses in-window dmgUp). */
const cfNoSust = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'sustainedDamagePct'));
  if (ov.burst.length === before)
    {throw new Error(
      'rosanna-chic-ocean burst sustainedDamagePct block missing — fixture is stale'
    );}
});
/** R2 counterfactual: lvl-9 value 19.4 (value pin). */
const cfSustLvl9 = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  ov.burst
    .find((b: any) => hasStat(b, 'sustainedDamagePct'))
    .effects.find((e: any) => e.stat === 'sustainedDamagePct').value = 19.4;
});
/** R3 counterfactual: Damage Taken line removed (functional — collapses in-window taken). */
const cfNoTaken = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before)
    {throw new Error(
      'rosanna-chic-ocean burst damageTakenPct block missing — fixture is stale'
    );}
});
/** R3 counterfactual: lvl-9 value 30.76 (value pin). */
const cfTakenLvl9 = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  ov.burst
    .find((b: any) => hasStat(b, 'damageTakenPct'))
    .effects.find((e: any) => e.stat === 'damageTakenPct').value = 30.76;
});
/** R4 reference: both Damage-to-Parts lines removed (inert proof — totals must not move). */
const cfNoParts = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const continuous = run({ 'rosanna-chic-ocean': cfContinuous });
const dotLvl9 = run({ 'rosanna-chic-ocean': cfDotLvl9 });
const fbEnter = run({ 'rosanna-chic-ocean': cfFbEnter });
const noSust = run({ 'rosanna-chic-ocean': cfNoSust });
const sustLvl9 = run({ 'rosanna-chic-ocean': cfSustLvl9 });
const noTaken = run({ 'rosanna-chic-ocean': cfNoTaken });
const takenLvl9 = run({ 'rosanna-chic-ocean': cfTakenLvl9 });
const noParts = run({ 'rosanna-chic-ocean': cfNoParts });

describe('rosanna-chic-ocean (Rosanna: Chic Ocean) — kit spec', () => {
  describe('R1 — S2 sustained DoT: 70.4% final ATK /1s for 15s, re-cast on the 30s CD (first fire t=30)', () => {
    const ticks = rcoDot(base.events);

    it('is the kit magnitude, in the skill bucket off skill2', () => {
      expect(ticks.length, 'no S2 DoT ticks landed').toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([70.4]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('ticks 75× = five 15s windows [31-45]…[151-165] at exactly 1 tick/sec, NOT continuous/overlapping', () => {
      expect(ticks.length, 'expected 5 windows × 15 ticks').toBe(75);
      const secs = ticks.map((d) => Math.round(d.sec)).sort((a, b) => a - b);
      expect(
        secs[0],
        'first tick must be t=31 (first cast t=30 + 1s), not t=1'
      ).toBe(31);
      expect(secs[secs.length - 1], 'last tick of the fifth window').toBe(165);
      // exactly five window-onsets, 30s apart
      expect([...new Set(secs.map((s) => Math.floor((s - 1) / 30)))]).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });

    it('DISCRIMINATING: the invented passive-continuous (dur 999) encoding ticks ~179× from t=1', () => {
      const ct = rcoDot(continuous.events);
      expect(ct.length).not.toBe(75);
      expect(
        Math.round(ct[0].sec),
        'continuous encoding starts at t=1, not t=31'
      ).toBe(1);
    });

    it('DISCRIMINATING: a lvl-9 magnitude keeps 75 ticks but moves atkPct to 67.2', () => {
      expect([...new Set(rcoDot(dotLvl9.events).map((d) => d.atkPct))]).toEqual(
        [67.2]
      );
    });
  });

  describe('R2 — burst: all allies Sustained Damage ▲20.32% for 10s, feeds her own sustained DoT only', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === RCO && b.stat === 'sustainedDamagePct'
    );

    it('is 20.32% (not lvl-9 19.4), reaching all three allies incl. herself, for 10 sec', () => {
      expect(
        applied.length,
        'no sustainedDamagePct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20.32]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_ALLIES
      );
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([10]);
    });

    it('TRIGGER IDENTITY: fires on her burstCast frames (each before the FB window), NOT fullBurstEnter', () => {
      const casts = rcoCastFrames(base.events);
      expect(applyFrames(base.events, 'sustainedDamagePct')).toEqual(casts);
      // the cast lands BEFORE the FB window opens — burstCast, not the FB-entry frame
      expect(casts[0]).toBeLessThan(fbStartFrames(base.events)[0]);
      // fullBurstEnter would apply on the (fewer) FB-start frames, not her (more numerous) casts
      expect(applyFrames(fbEnter.events, 'sustainedDamagePct')).toEqual(
        fbStartFrames(fbEnter.events)
      );
      expect(applyFrames(fbEnter.events, 'sustainedDamagePct')).not.toEqual(
        casts
      );
    });

    it('is LIVE and FLAVOR-SCOPED: lifts DoT ticks (dmgUp 1.2032) but never her AR normal shots', () => {
      expect(
        [
          ...new Set(rcoDot(base.events).map((d) => d.mult.dmgUp.toFixed(4))),
        ].sort()
      ).toEqual(['1.0000', '1.2032']);
      // an attackDamagePct misread would lift the normals too — sustainedDamagePct must not
      expect(rcoNormals(base.events).length).toBeGreaterThan(0);
      expect([
        ...new Set(rcoNormals(base.events).map((d) => d.mult.dmgUp.toFixed(4))),
      ]).toEqual(['1.0000']);
    });

    it('DISCRIMINATING: removing the line collapses every DoT tick to dmgUp 1.0 and drops her total', () => {
      expect([
        ...new Set(rcoDot(noSust.events).map((d) => d.mult.dmgUp.toFixed(4))),
      ]).toEqual(['1.0000']);
      expect(noSust.totals['rosanna-chic-ocean']).toBeLessThan(
        base.totals['rosanna-chic-ocean']
      );
    });

    it('DISCRIMINATING: lvl-9 19.4 moves the applied value', () => {
      const v = buffs(sustLvl9.events).filter(
        (b) => b.casterIdx === RCO && b.stat === 'sustainedDamagePct'
      );
      expect([...new Set(v.map((b) => b.value))]).toEqual([19.4]);
    });
  });

  describe('R3 — burst: all enemies Damage Taken ▲32.23% for 10s (a taken-bucket debuff on the boss)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.stat === 'damageTakenPct'
    );

    it('is 32.23% (not lvl-9 30.76), boss-held (casterIdx AND targetIdx null), for 10 sec', () => {
      expect(
        applied.length,
        'no damageTakenPct debuff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([32.23]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.casterIdx))]).toEqual([null]);
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([10]);
    });

    it('TRIGGER IDENTITY: fires on her burstCast frames, NOT fullBurstEnter', () => {
      expect(applyFrames(base.events, 'damageTakenPct', false)).toEqual(
        rcoCastFrames(base.events)
      );
      expect(applyFrames(fbEnter.events, 'damageTakenPct', false)).toEqual(
        fbStartFrames(fbEnter.events)
      );
    });

    it('is LIVE: in-window DoT ticks carry mult.taken 1.3223', () => {
      expect(
        [
          ...new Set(rcoDot(base.events).map((d) => d.mult.taken.toFixed(4))),
        ].sort()
      ).toEqual(['1.0000', '1.3223']);
    });

    it('DISCRIMINATING: removing the line collapses every tick to taken 1.0 and drops her total', () => {
      expect([
        ...new Set(rcoDot(noTaken.events).map((d) => d.mult.taken.toFixed(4))),
      ]).toEqual(['1.0000']);
      expect(noTaken.totals['rosanna-chic-ocean']).toBeLessThan(
        base.totals['rosanna-chic-ocean']
      );
    });

    it('DISCRIMINATING: lvl-9 30.76 moves the applied value', () => {
      const v = buffs(takenLvl9.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      expect([...new Set(v.map((b) => b.value))]).toEqual([30.76]);
    });
  });

  describe('R4 — S1/S2 Damage to Parts ▲24.26% is exactly inert vs the partless boss (kept for fidelity)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === RCO && b.stat === 'partsDamagePct'
    );

    it('the encoding is LIVE: 24.26% reaches all three allies for 15 sec', () => {
      expect(
        applied.length,
        'no partsDamagePct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([24.26]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_ALLIES
      );
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([15]);
    });

    it('keeps S1 (one-shot at battle start) and S2 (recurring on the 30s CD) as DISTINCT blocks', () => {
      // S1: exactly one application per ally at frame 0
      expect(
        applied.filter((b) => b.frame === 0).length,
        'S1 battle-start apply to 3 allies'
      ).toBe(3);
      // S2: recurring applications at t=30,60,90,120,150 (the interval:30 cadence)
      const recurSec = [
        ...new Set(
          applied.filter((b) => b.frame > 0).map((b) => b.frame / FPS)
        ),
      ].sort((a, b) => a - b);
      expect(recurSec).toEqual([30, 60, 90, 120, 150]);
    });

    it("removing BOTH parts lines changes NO unit's total by a single point", () => {
      expect(noParts.totals).toEqual(base.totals);
    });
  });

  describe('R5 — S1 part-destroy ATK stacks (×5 to all allies) are UNMODELED here', () => {
    it.skip('trigger "destroys an enemy\'s part" never fires on the partless boss — genuinely skippable', () => {
      // Not assertable in the scope-lock basis: the part-destroy trigger has no firing opportunity
      // against a partless boss, so the line contributes nothing and is correctly documented in the
      // override's `unmodeled`. ⚑ BIG hidden lever on parts bosses: casterAtkPct (flat 3% of HER
      // ATK, not atkPct) ×5 = 15% to ALL allies (out-of-domain for this basis; estimate + recipe in
      // the override note).
    });
  });
});
