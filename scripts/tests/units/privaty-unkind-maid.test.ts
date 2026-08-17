// PER-UNIT KIT SPEC — `privaty-unkind-maid` (Privaty: Unkind Maid, Attacker/SG/Electric, Burst III,
// cd 40s, ammo 9, hitsPerShot 10 pellets, normalMult 182.1). Kit-autonomy gauntlet 2026-08-01.
//
// One assertion group per KIT LINE (P1..P5), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['privaty-unkind-maid'].skills):
//   S1 ■ hitting the target with 30 pellets → 2 enemies nearest crosshair: 202.84% final ATK   [P1]
//   S2 ■ ≥5 pellets hit with a single normal attack → self: Reload Speed ▲20.88% for 2 sec     [P2]
//      ■ 30 pellet hits during Full Burst → self: Reload 1 round + ATK ▲11.22% ×5 / 2 sec       [P3]
//   BU ■ self: Attack damage ▲10.56% for 10 sec + Critical Damage ▲88.17% for 10 sec           [P4]
//      ■ all enemies: 1066.66% of final ATK as Burst Skill damage                              [P5]
//
// Dispositions (S0 inventory):
//   P1 FAITHFUL — `hitCount count:30`: the engine hit counter adds hitsPerShot (=10) per trigger
//      PULL (sim.ts:3585), so "30 pellets" = every 3rd pull, firing repeatedly. The "2 enemies
//      nearest the crosshair" collapses to the lone boss on the partless single-boss basis.
//   P2 FAITHFUL (approx) — `shotFired` → self reloadSpeedPct 20.88/2s. The per-shot "≥5 pellets"
//      gate has NO engine primitive; it is dropped (assumed satisfied — a single boss at the focus
//      band lands ~9/10 pellets, well over 5). The 2s window refreshed every ~0.67s shot gives
//      ~100% uptime regardless, so the gate is not load-bearing here. See ⚑ in the override note.
//   P3 FAITHFUL — `hitCount count:30` + `fbGate:'inFb'` → self → instantReload fraction ~1/9 (one
//      shell) + buff atkPct 11.22 maxStacks 5 / 2s. fbGate:'inFb' (sim.ts:2030) gates the firing to
//      Full Burst windows — the velvet/modernia precedent for "N hits during Full Burst". The blind
//      S2b reviewer (claude-fable-5) surfaced this encoding; the driver's first draft had it
//      UNMODELED, wrongly assuming no FB-gate primitive existed. Residual ⚑: the counter still
//      accrues ungated (engine counts always; kit counts in-FB hits) — a small boundary over-accrual.
//   P4 FAITHFUL — burstCast → self attackDamagePct 10.56 + critDamagePct 88.17, both 10s, self-only.
//   P5 FAITHFUL — burstCast → enemy flatDamage 1066.66; burst-cast instant damage is auto-FB-exempt
//      (the cast lands before the FB window opens), crit-on at the sheet rate (engine default).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   P1  the pellet-counter reading (count:30 = every 3rd pull) vs the nearest-wrong pull-counter
//       (count:10 = every pull): the counterfactual fires exactly 3× as often. Magnitude pinned at
//       the max-level 202.84, not the level-1 119.86.
//   P2  value 20.88 (max) not 12.33 (level-1); 2s window; applied at shot cadence; and removing it
//       must MOVE her total (reload speed → faster reloads → more shots), proving it is live.
//   P4  self-scoped (reaches Privaty alone, targetIdx 2) vs an allies-scoped counterfactual that
//       would reach all 3; values 10.56 / 88.17 (max) not 6.24 / 52.1 (level-1); 10s windows; one
//       application per burst cast.
//   P5  magnitude 1066.66 (max) not 630.3 (level-1); burst bucket; once per cast; and NEVER takes
//       the +50% FB major (cast precedes the FB window — verified fact 2026-07-13).
//
// Fixture: controlComp('privaty-unkind-maid', helm=false) = liter (B1) / crown (B2) / pum (B3, sole
// caster), boss Fire, focus pum. Privaty is the only Burst III, so she casts EVERY Full Burst —
// which is what makes her burst-gated lines (P4/P5) observable at all. Deterministic (no seed).
// Slot order: liter 0 / crown 1 / privaty-unkind-maid 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'privaty-unkind-maid';
/** controlComp(SLUG, false) slot order: liter 0 / crown 1 / privaty-unkind-maid 2. */
const PUM = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, false),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** P1 counterfactual: mis-read "30 pellets" as a per-pull counter (count:10 = every pull). */
const pumCount10 = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger.kind === 'hitCount');
  if (!b) {
    throw new Error('pum S1 hitCount block missing — fixture is stale');
  }
  b.trigger.count = 10;
});
/** P1 counterfactual: the level-1 magnitude 119.86 instead of the max-level 202.84. */
const pumS1Lvl1 = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('pum S1 flatDamage effect missing — fixture is stale');
  }
  e.atkPct = 119.86;
});
/** P2 reference: her reload-speed line removed entirely. */
const pumNoReload = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'reloadSpeedPct'));
  if (ov.skill2.length === before) {
    throw new Error('pum S2 reloadSpeedPct block missing — fixture is stale');
  }
});
/** P4 counterfactual: the burst self-buffs scoped to ALL allies instead of self only. */
const pumBurstAllies = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find(
    (x: any) =>
      x.target.kind === 'self' &&
      x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b) {
    throw new Error('pum burst self-buff block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** P5 counterfactual: the level-1 burst magnitude 630.3 instead of the max-level 1066.66. */
const pumBurstLvl1 = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('pum burst flatDamage effect missing — fixture is stale');
  }
  e.atkPct = 630.3;
});
/** P3 counterfactual: drop the fbGate so the 30-pellet counter fires whole-fight, not only in FB. */
const pumNoFbGate = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => x.fbGate === 'inFb');
  if (!b) {
    throw new Error('pum S2b fbGate:inFb block missing — fixture is stale');
  }
  delete b.fbGate;
  if (b.trigger?.countScope === 'gated') {
    delete b.trigger.countScope;
  }
});
/** P3 counterfactual: the level-1 ATK-stack magnitude 6.63 instead of the max-level 11.22. */
const pumS2bLvl1 = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => x.fbGate === 'inFb');
  const e = b?.effects.find((x: any) => x.stat === 'atkPct');
  if (!e) {
    throw new Error('pum S2b atkPct effect missing — fixture is stale');
  }
  e.value = 6.63;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const count10 = run({ [SLUG]: pumCount10 });
const s1Lvl1 = run({ [SLUG]: pumS1Lvl1 });
const noReload = run({ [SLUG]: pumNoReload });
const burstAllies = run({ [SLUG]: pumBurstAllies });
const burstLvl1 = run({ [SLUG]: pumBurstLvl1 });
const noFbGate = run({ [SLUG]: pumNoFbGate });
const s2bLvl1 = run({ [SLUG]: pumS2bLvl1 });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const pumDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const pumShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const pumBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const pumBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === PUM && b.stat === stat);

/** Full Burst windows [start, end] in frames, from the fullBurstStart markers. */
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;
const fbWindows = (evs: SimEvent[]) =>
  evs
    .filter((e): e is FBStart => e.kind === 'fullBurstStart')
    .map((e) => ({ start: e.frame, end: e.endFrame }));
const inFb = (frame: number, wins: { start: number; end: number }[]) =>
  wins.some((w) => frame >= w.start && frame <= w.end);

describe('privaty-unkind-maid — kit spec', () => {
  describe('P1 — S1 pellet-counter nuke: 202.84% final ATK every 30 pellets (every 3rd pull)', () => {
    const nukes = pumDamage(base.events, 'skill1');
    const nukesCount10 = pumDamage(count10.events, 'skill1');

    it('fires repeatedly in the skill bucket at the kit magnitude', () => {
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([202.84]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is crit-eligible (engine rider convention — no "core strike" text, so no core)', () => {
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: count:30 (pellets) fires ~1/3 as often as count:10 (per pull)', () => {
      // The nearest-wrong reading treats "30 pellets" as a per-pull trigger; with 10 pellets/pull
      // the correct count:30 fires every 3rd pull, so the per-pull counterfactual fires >=3x as often.
      expect(nukesCount10.length).toBeGreaterThanOrEqual(3 * nukes.length);
      expect(nukes.length).toBeLessThan(nukesCount10.length);
    });

    it('DISCRIMINATING: the magnitude is max-level 202.84, not level-1 119.86', () => {
      expect([
        ...new Set(pumDamage(s1Lvl1.events, 'skill1').map((d) => d.atkPct)),
      ]).toEqual([119.86]);
      expect(nukes.length).toBe(pumDamage(s1Lvl1.events, 'skill1').length);
    });
  });

  describe('P2 — S2 reload-speed self-buff: 20.88% for 2s on every normal attack', () => {
    const applied = pumBuffs(base.events, 'reloadSpeedPct');

    it('is 20.88% (max-level) on a 2s window', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20.88]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(2 * FPS);
      }
    });

    it('is applied at shot cadence (refreshed every normal attack)', () => {
      const shots = pumShots(base.events).length;
      expect(
        applied.length,
        `${applied.length} reload-speed applications vs ${shots} shots`
      ).toBeGreaterThanOrEqual(Math.floor(shots * 0.9));
    });

    it('DISCRIMINATING: removing it changes her total (it is live, not inert)', () => {
      expect(base.totals[SLUG]).not.toEqual(noReload.totals[SLUG]);
    });
  });

  describe('P3 — S2b FB-gated 30-pellet counter: Reload 1 round + ATK ▲11.22% ×5/2s, in Full Burst only', () => {
    // hitCount count:30 + fbGate:'inFb' (the velvet/modernia precedent for "N hits during Full
    // Burst"). The atkPct stack is the observable: no other Privaty block emits atkPct, so
    // pumBuffs(_, 'atkPct') isolates this line.
    const atkStack = pumBuffs(base.events, 'atkPct');
    const wins = fbWindows(base.events);

    it('fires during Full Burst at the max-level magnitude on a 2s self-scoped window', () => {
      expect(atkStack.length).toBeGreaterThan(0);
      expect([...new Set(atkStack.map((b) => b.value))]).toEqual([11.22]);
      expect([...new Set(atkStack.map((b) => b.targetIdx))]).toEqual([PUM]);
      for (const b of atkStack) {
        expect(b.expiresFrame! - b.frame).toBe(2 * FPS);
      }
    });

    it('DISCRIMINATING: fbGate:inFb restricts every application to a Full Burst window', () => {
      expect(wins.length).toBeGreaterThan(0);
      const outside = atkStack.filter((b) => !inFb(b.frame, wins));
      expect(
        outside.map((b) => b.frame),
        'fbGate:inFb must keep every ATK-stack application inside Full Burst'
      ).toEqual([]);
    });

    it('DISCRIMINATING: dropping the gate fires the counter whole-fight (more applications, some outside FB)', () => {
      const ungated = pumBuffs(noFbGate.events, 'atkPct');
      const ungatedWins = fbWindows(noFbGate.events);
      expect(ungated.length).toBeGreaterThan(atkStack.length);
      expect(
        ungated.some((b) => !inFb(b.frame, ungatedWins)),
        'the ungated counter must fire outside Full Burst — proving the gate is what restricts shipped'
      ).toBe(true);
    });

    it('DISCRIMINATING: the magnitude is max-level 11.22, not level-1 6.63', () => {
      expect([
        ...new Set(pumBuffs(s2bLvl1.events, 'atkPct').map((b) => b.value)),
      ]).toEqual([6.63]);
    });
  });

  describe('P4 — burst self-buffs: Attack damage ▲10.56% + Critical Damage ▲88.17%, 10s, self only', () => {
    const atkBuff = pumBuffs(base.events, 'attackDamagePct');
    const critBuff = pumBuffs(base.events, 'critDamagePct');
    const bursts = pumBursts(base.events).length;

    it('applies both buffs once per burst cast at the max-level magnitudes', () => {
      expect(bursts).toBeGreaterThan(0);
      expect([...new Set(atkBuff.map((b) => b.value))]).toEqual([10.56]);
      expect([...new Set(critBuff.map((b) => b.value))]).toEqual([88.17]);
      expect(atkBuff.length).toBe(bursts);
      expect(critBuff.length).toBe(bursts);
    });

    it('runs both buffs for 10 sec', () => {
      for (const b of [...atkBuff, ...critBuff]) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: self-scoped — reaches Privaty alone, not all allies', () => {
      expect([...new Set(atkBuff.map((b) => b.targetIdx))]).toEqual([PUM]);
      expect([...new Set(critBuff.map((b) => b.targetIdx))]).toEqual([PUM]);
      // The allies-scoped counterfactual reaches all 3 units in the comp.
      const alliesAtk = buffs(burstAllies.events).filter(
        (b) => b.casterIdx === PUM && b.stat === 'attackDamagePct'
      );
      expect(new Set(alliesAtk.map((b) => b.targetIdx)).size).toBeGreaterThan(
        1
      );
    });
  });

  describe('P5 — burst nuke: 1066.66% of final ATK, cast before the Full Burst window', () => {
    const nukes = pumDamage(base.events, 'burst');
    const bursts = pumBursts(base.events).length;

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(bursts);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1066.66]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the magnitude is max-level 1066.66, not level-1 630.3', () => {
      expect([
        ...new Set(pumDamage(burstLvl1.events, 'burst').map((d) => d.atkPct)),
      ]).toEqual([630.3]);
    });
  });
});
