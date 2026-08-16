// PER-UNIT KIT SPEC — `takina` (Takina, Supporter/SR/Iron, Burst II, cd 20s, ammo 6, reloadFrames 141,
// chargeFrames 60, hitsPerShot 1, normalMult 69.04 / coreMult 200, chargeMult 250, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (T1..T8), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.takina.skills, levels 10/10/10 — the normalized `skills` prose is the
// SSOT):
//   S1 ■ at battle start AND when Full Burst ends → self: ATK ▲80.04% for 5 sec
//         (battle-start activation modeled with the `battleStart` trigger; the FB-END activation is the
//          fullBurstEnd block)                                                                  [T1 / T2]
//      ■ when entering Full Burst → self: True Damage ▲35.05% for 15 sec                       [T3]
//   S2 ■ all enemies: Damage Taken ▲10.09% for 5 sec  (+ Stuns 2 sec — UNMODELED, boss-inert)  [T4 / T6]
//      ■ all allies: True Damage ▲140.49% for 10 sec                                           [T5]
//   BU ■ self: Changes the weapon in use — Damage 200.64% of final ATK, Duration 10 sec        [T7]
//      ■ self (Additional): Normal attacks deal true damage for 10 sec  (trueNormals on the swap) [T7]
//      ■ targets hit (Additional): Damage Taken ▲6.04% for 5 sec  (swap-weapon hits)           [T8]
//
// SKILL2 PULSE MODELING (owner ruling 2026-08-16): the 15s skill2 cooldown is CONFIRMED correct
// (data/characters.json skillCooldownsSec.skill2 = 15; the always-on uptime-average encoding this spec
// previously pinned is INCORRECT). S2 is an interval:15 pulse pair — enemies Damage Taken ▲10.09% for 5 sec,
// allies True Damage ▲140.49% for 10 sec — at the prose's raw magnitudes and durations. First fire at t=15s
// (the interval-trigger first-fire convention — S2 has no "at the start of battle" clause, unlike S1; ⚑ phase
// is convention, pin from footage if a recording ever reads it). The enemy pulse is a non-damage enemy-debuff
// application, so each application credits takina's datamined per-trigger gauge value (560 → 5.6 bar-%) via
// applicationGauge — the iron-sweep-relevant generation channel.
//
// EVENT-LOG CONVENTIONS (measured for this fixture): boss-held debuffs (the S2 enemy damageTakenPct 10.09 and the
// burst target-hit damageTakenPct 6.04) emit buffApply with casterIdx===null AND targetIdx===null, but the buff
// KEY carries the caster SLOT (`<slot>:<skillSlot>:<stat>:<value>`, takina = slot 1) — so they are read by
// stat+value+targetIdxnull, never by casterIdx. Ally/self buffs carry casterIdx===1 normally.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   T1  the battle-start ATK activation is modeled with `battleStart` (durationSec 5s, fires once at frame 0).
//       Assert: there IS an atkPct 80.04 application at frame 0, and it expires at 5s. RED if battleStart is
//       missing or mis-encoded as a permanent passive (which would ignore durationSec and stay always-on).
//   T2  "when Full Burst ends → self ATK ▲80.04% for 5 sec" = atkPct 80.04, fullBurstEnd, target self, 5s.
//       Nearest-wrong (a): trigger fullBurstEnter (lands on FB-START frames, strictly BEFORE the FB-END frames).
//       (b): target allies (would hit all 3 slots, not just takina). Frame-discriminated (takina is sole B2; her
//       burstCast frame strictly precedes each fullBurstStart, which strictly precedes each fullBurstEnd).
//   T3  "when entering Full Burst → self True Damage ▲35.05% for 15 sec" = trueDamagePct 35.05, fullBurstEnter,
//       target self, 15s. Nearest-wrong (a): trigger burstCast (lands on takina's CAST frames, strictly BEFORE
//       the FB-START frames). (b): duration 5s vs the prose 15s. Frame-discriminated.
//   T4  "all enemies: Damage Taken ▲10.09% for 5 sec" = damageTakenPct 10.09, interval:15, durationSec 5,
//       target the boss (targetIdx null). First fire frame 900, cadence 900f. Nearest-wrong (a): the retired
//       uptime-average permanent (3.36 @ frame 0, no expiry — the pre-2026-08-16 encoding). (b): target allies
//       (would buff the team, not debuff the boss). T4b pins the applicationGauge credit per pulse.
//   T5  "all allies: True Damage ▲140.49% for 10 sec" = trueDamagePct 140.49, interval:15, durationSec 10,
//       target allies (all 3 slots incl. takina). First fire frame 900, cadence 900f. Nearest-wrong (a): the
//       retired uptime-average permanent (93.66 @ frame 0). (b): target enemy (would strip the team buff).
//   T6  PIN (documented skip): the S2 "Stuns for 2 sec" is UNMODELED (boss-inert: the partless boss does not
//       fire/charge/reload, so a stun changes nothing). The S2 SLOT is active (it emits the T4 enemy debuff +
//       T5 ally buff). Assert: takina's skill2-keyed buffs (key prefix `1:skill2:`) emit EXACTLY the two modeled
//       stat families {damageTakenPct, trueDamagePct} and NO third (stun/CC) effect — the documented skip is
//       distinguished from a silent drop or a mis-encoding of the stun as a damage stat.
//   T7  "Changes the weapon in use — Damage 200.64% of final ATK, 10 sec" + "Normal attacks deal true damage for
//       10 sec" = burstCast → self weaponSwap damagePct 200.64, 10s, trueNormals:true. The swap shots (atkPct
//       200.64) exist; removing the swap block removes them. trueNormals makes the swap shots TRUE-flavored, which
//       routes the trueDamagePct buffs (T3 35.05 + the T5 140.49 pulse when its window overlaps) into their
//       Damage-Up bucket (trueDamagePct is
//       flavor-gated — sim.ts:1414 — it applies ONLY to true-flavored hits). Nearest-wrong (a): weaponSwap removed
//       → no 200.64 shots. (b): trueNormals:false → swap shots lose the true flavor → their dmgUp drops by the
//       trueDamagePct contribution (strictly lower than the faithful swap shots). [ENGINE NOTE: true swap normals
//       still crit in the engine — sim.ts:2842 hardcodes crit:true; the §2c 'true damage cannot crit' carve-out
//       is plumbed only for riders (RIDER_CRIT), not swap normals. That is an engine-fidelity observation flagged
//       for owner spot-check, NOT an override-encoding gotcha; the trueNormals encoding itself is faithful.]
//   T8  "targets hit: Damage Taken ▲6.04% for 5 sec" (under the burst's swap Additional Effects) = shotFired →
//       enemy (boss) damageTakenPct 6.04, 5s, gated swapGate:'swapped' (fires only while takina's swap weapon is
//       live, i.e. on swap-weapon hits in [burstCast, +10s]). This is the FIX line: the shipped override gated it
//       fbGate:'inFb' (swap window ≈ FB window for a bursting B2), but the line is keyed to the SWAP weapon's
//       hits, not the FB window — swapGate is the faithful gate (prior-audit residual F5). The fixture makes this
//       discriminable: focused takina (sole B2) fills her gauge faster than the chain completes, so she CASTS her
//       burst ~10× over 180s while the team completes only ~5 Full Bursts — 5 of her swap windows have NO Full
//       Burst. swapGate fires the 6.04 debuff in those non-FB swap windows; fbGate (requires inFb) fires nothing
//       there. Nearest-wrong (a): UNGATED shotFired → fires on every takina shot all fight (outside the swap
//       windows + far more often). (b): fbGate:'inFb' (the shipped encoding) → every application lands inside an
//       FB window; swapGate produces applications OUTSIDE every FB window (the non-FB swap windows).
//
// Fixture: Takina is Burst II, so a custom sole-B2 comp [liter(B1) / takina(B2,SR Iron) / helm(B3,SR Water)] is
// used (NOT controlComp, which fields crown as a second B2 and would steal takina's casts). Takina is the SOLE
// Burst II and is camera-focused (×2.5 burst gauge on her charge SR) → she fills her gauge faster than the
// B1/B3 chain completes, casting ~10× while the team completes ~5 Full Bursts (casts > fbs is EXPECTED here, and
// is exactly what makes the T8 swapGate-vs-fbGate discrimination observable). Her burstCast frame strictly
// precedes each fullBurstStart, which strictly precedes each fullBurstEnd. Boss Fire (takina Iron is neutral vs
// Fire — clean: no element major confounds the true-damage assertions). Focus takina. Deterministic (no seed).
// Slot order: liter 0 / takina 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  bareWeaponOverride,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';

const FPS = 60;
const TAKINA = 1; // slot index in the fixture
const ALL_SLOTS = [0, 1, 2];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIXTURE = {
  slugs: ['liter', 'takina', 'helm'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'takina',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...FIXTURE, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** takina-caster buffApply events (ally/self buffs carry casterIdx===TAKINA). */
const tkBuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === TAKINA &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
/** Boss-held debuffs emit casterIdx===null AND targetIdx===null; read by stat+value (key carries the caster slot). */
const bossDebuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.targetIdx === null &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1)
  );
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame))
  ),
];
const takinaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'takina'
  );
const castFrames = (evs: SimEvent[]) => takinaBursts(evs).map((e) => e.frame);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
/** Full-Burst windows [startFrame, endFrame]. */
function fbWindows(evs: SimEvent[]): [number, number][] {
  const s = fbStartFrames(evs);
  const e = fbEndFrames(evs);
  return s.map((sf, i) => [sf, e[i]]);
}
const takinaDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'takina');
/** [burstCast, +10s] swap windows — the window the swapGate('swapped') gate reads. */
function castWindows(evs: SimEvent[]): [number, number][] {
  return takinaBursts(evs).map((c) => [c.frame, c.frame + 10 * FPS]);
}
const inWindow = (frame: number, wins: [number, number][]) =>
  wins.some(([s, e]) => frame >= s && frame <= e);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
const eff = (b: any, stat: string) =>
  b.effects.find((e: any) => e.stat === stat);

// T2 nearest-wrong (trigger): the FB-END ATK line keyed to fullBurstEnter (FB-START frames).
const cfS1AtkFbEnter = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnd');
  if (!b) {
    throw new Error('takina S1 fullBurstEnd block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
// T2 nearest-wrong (target): self → allies (hit all 3 slots, not just takina).
const cfS1AtkAllies = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnd');
  if (!b) {
    throw new Error('takina S1 fullBurstEnd block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
// T3 nearest-wrong (trigger): the FB-enter True Damage line keyed to burstCast (takina's CAST frames).
const cfS1TrueBurstCast = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
  if (!b) {
    throw new Error(
      'takina S1 fullBurstEnter block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'burstCast' };
});
// T3 nearest-wrong (duration): 15s → 5s.
const cfS1TrueDur5 = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
  if (!b) {
    throw new Error(
      'takina S1 fullBurstEnter block missing — fixture is stale'
    );
  }
  eff(b, 'trueDamagePct').durationSec = 5;
});
// T4 nearest-wrong (shape): the RETIRED uptime-average permanent (3.36, passive, no duration).
const cfS2TakenAveraged = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct')
  );
  if (!b) {
    throw new Error(
      'takina S2 enemy damageTaken block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'passive' };
  const e = eff(b, 'damageTakenPct');
  e.value = 3.36;
  delete e.durationSec;
});
// T4 nearest-wrong (target): enemy → allies (buff the team instead of debuffing the boss).
const cfS2TakenAllies = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct')
  );
  if (!b) {
    throw new Error(
      'takina S2 enemy damageTaken block missing — fixture is stale'
    );
  }
  b.target = { kind: 'allies' };
});
// T5 nearest-wrong (shape): the RETIRED uptime-average permanent (93.66, passive, no duration).
const cfS2TrueAveraged = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'trueDamagePct')
  );
  if (!b) {
    throw new Error(
      'takina S2 ally trueDamage block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'passive' };
  const e = eff(b, 'trueDamagePct');
  e.value = 93.66;
  delete e.durationSec;
});
// T5 nearest-wrong (target): allies → enemy.
const cfS2TrueEnemy = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'trueDamagePct')
  );
  if (!b) {
    throw new Error(
      'takina S2 ally trueDamage block missing — fixture is stale'
    );
  }
  b.target = { kind: 'enemy' };
});
// T7 nearest-wrong (swap): the burst weaponSwap removed → no 200.64 swap shots.
const cfNoSwap = withPatchedOverride('takina', (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (ov.burst.length === before) {
    throw new Error('takina burst weaponSwap block missing — fixture is stale');
  }
});
// T7 nearest-wrong (flavor): trueNormals:true → false (swap shots lose the true flavor → lose trueDamagePct).
const cfNoTrueNormals = withPatchedOverride('takina', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (!b) {
    throw new Error('takina burst weaponSwap block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.kind === 'weaponSwap').trueNormals = false;
});
// T7 nearest-wrong (economy): her burst read as a same-weapon FLAVOR swap (the chisato/clay/jill/
// frima shape) instead of a real weapon change — no magazine refill at either end, so she runs the
// swap dry mid-window and reloads. The owner ruling (2026-08-12) is the opposite.
const cfFlavorSwap = withPatchedOverride('takina', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (!b) {
    throw new Error('takina burst weaponSwap block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.kind === 'weaponSwap').sameWeapon = true;
});
// T8 nearest-wrong (gate, UNGATED): strip the gate from the 6.04 shotFired debuff → fires on every takina shot.
const cfDebuffUngated = withPatchedOverride('takina', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct' && e.value === 6.04)
  );
  if (!b) {
    throw new Error(
      'takina burst 6.04 debuff block missing — fixture is stale'
    );
  }
  delete b.fbGate;
  delete b.swapGate;
});
// T8 nearest-wrong (gate, fbGate — the SHIPPED encoding the FIX replaces): swapGate → fbGate:'inFb'.
const cfDebuffFbGate = withPatchedOverride('takina', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct' && e.value === 6.04)
  );
  if (!b) {
    throw new Error(
      'takina burst 6.04 debuff block missing — fixture is stale'
    );
  }
  delete b.swapGate;
  b.fbGate = 'inFb';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1AtkFbEnter = run({ takina: cfS1AtkFbEnter });
const s1AtkAllies = run({ takina: cfS1AtkAllies });
const s1TrueBurstCast = run({ takina: cfS1TrueBurstCast });
const s1TrueDur5 = run({ takina: cfS1TrueDur5 });
const s2TakenAveraged = run({ takina: cfS2TakenAveraged });
const s2TakenAllies = run({ takina: cfS2TakenAllies });
const s2TrueAveraged = run({ takina: cfS2TrueAveraged });
const s2TrueEnemy = run({ takina: cfS2TrueEnemy });
const noSwap = run({ takina: cfNoSwap });
const noTrueNormals = run({ takina: cfNoTrueNormals });
const flavorSwap = run({ takina: cfFlavorSwap });
const debuffUngated = run({ takina: cfDebuffUngated });
const debuffFbGate = run({ takina: cfDebuffFbGate });

const casts = takinaBursts(base.events).length;
const fbs = fbStartFrames(base.events).length;
const castWins = castWindows(base.events);
const fbWins = fbWindows(base.events);

describe('takina — kit spec', () => {
  describe('fixture sanity — Takina casts her burst and the team reaches Full Burst', () => {
    it('Takina casts >0 bursts and the team completes >0 Full Bursts (focused sole-B2: she casts MORE often than the chain completes)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // focused SR B2 fills her gauge faster than the B1/B3 chain completes → casts >= fbs, and at least one
      // of her swap windows has NO Full Burst (the asymmetry the T8 swapGate-vs-fbGate discrimination reads).
      expect(casts).toBeGreaterThanOrEqual(fbs);
      expect(casts).toBeGreaterThan(fbs);
    });
    it('trigger identity is frame-discriminable: burstCast < fullBurstStart < fullBurstEnd', () => {
      const cf = castFrames(base.events);
      const fs = fbStartFrames(base.events);
      const fe = fbEndFrames(base.events);
      expect(cf.every((f) => !fs.includes(f) && !fe.includes(f))).toBe(true);
      expect(Math.min(...cf)).toBeLessThan(Math.min(...fs));
      expect(Math.min(...fs)).toBeLessThan(Math.min(...fe));
    });
  });

  describe('T1 — S1 battle-start ATK activation (battleStart trigger)', () => {
    const atk = () => tkBuff(base.events, 'atkPct', 80.04);

    it('fires exactly one atkPct 80.04 application at frame 0', () => {
      const start = atk().filter((b) => b.frame === 0);
      expect(start.length).toBe(1);
      expect(start[0].targetIdx).toBe(TAKINA);
    });

    it('expires at 5 sec (durationSec respected, not a permanent passive)', () => {
      const start = atk().find((b) => b.frame === 0);
      expect(start).toBeDefined();
      expect(start!.expiresFrame! - start!.frame).toBe(5 * FPS);
    });

    it('is distinct from the FB-end activations, which land after frame 0', () => {
      const nonStart = atk().filter((b) => b.frame > 0);
      expect(nonStart.length).toBeGreaterThan(0);
      expect(Math.min(...nonStart.map((b) => b.frame))).toBe(
        Math.min(...fbEndFrames(base.events))
      );
    });
  });

  describe('T2 — S1 FB-end → self ATK ▲80.04% for 5 sec (fullBurstEnd)', () => {
    const atk = tkBuff(base.events, 'atkPct', 80.04).filter((b) => b.frame > 0);
    it('fires on fullBurstEnd frames, target self only, 5s duration', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(targetsOf(atk)).toEqual([TAKINA]);
      expect(dursOf(atk)).toEqual([5 * FPS]);
      const fe = fbEndFrames(base.events);
      const fs = fbStartFrames(base.events);
      expect(atk.every((b) => fe.includes(b.frame))).toBe(true);
      expect(atk.every((b) => !fs.includes(b.frame))).toBe(true);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) lands on FB-START frames, not FB-END frames', () => {
      const cf = tkBuff(s1AtkFbEnter.events, 'atkPct', 80.04).filter(
        (b) => b.frame > 0
      );
      expect(cf.length).toBeGreaterThan(0);
      expect(
        cf.every((b) => fbStartFrames(s1AtkFbEnter.events).includes(b.frame))
      ).toBe(true);
    });
    it('DISCRIMINATING (target): allies (nearest-wrong) hits all 3 slots, not just takina', () => {
      expect(targetsOf(tkBuff(s1AtkAllies.events, 'atkPct', 80.04))).toEqual(
        ALL_SLOTS
      );
    });
  });

  describe('T3 — S1 FB-enter → self True Damage ▲35.05% for 15 sec (fullBurstEnter)', () => {
    const td = tkBuff(base.events, 'trueDamagePct', 35.05);
    it('fires on fullBurstStart frames, target self only, 15s duration', () => {
      expect(td.length).toBeGreaterThan(0);
      expect(targetsOf(td)).toEqual([TAKINA]);
      expect(dursOf(td)).toEqual([15 * FPS]);
      expect(
        td.every((b) => fbStartFrames(base.events).includes(b.frame))
      ).toBe(true);
    });
    it('DISCRIMINATING (trigger): burstCast (nearest-wrong) lands on takina CAST frames, before FB-start', () => {
      const cf = tkBuff(s1TrueBurstCast.events, 'trueDamagePct', 35.05);
      expect(cf.length).toBeGreaterThan(0);
      expect(
        cf.every((b) => castFrames(s1TrueBurstCast.events).includes(b.frame))
      ).toBe(true);
      expect(
        cf.every(
          (b) => !fbStartFrames(s1TrueBurstCast.events).includes(b.frame)
        )
      ).toBe(true);
    });
    it('DISCRIMINATING (duration): 5s (nearest-wrong) is not the prose 15s', () => {
      expect(dursOf(tkBuff(s1TrueDur5.events, 'trueDamagePct', 35.05))).toEqual(
        [5 * FPS]
      );
    });
  });

  describe('T4 — S2 all enemies: Damage Taken ▲10.09% for 5s, 15s-cooldown pulse (interval:15, owner-confirmed CD 2026-08-16)', () => {
    const taken = bossDebuff(base.events, 'damageTakenPct', 10.09);
    it('pulses 10.09 on the BOSS (targetIdx null): first fire at frame 900 (t=15s), 900-frame cadence, 5s windows', () => {
      expect(taken.length).toBeGreaterThanOrEqual(11);
      expect(
        taken.every((b) => b.value === 10.09 && b.targetIdx === null)
      ).toBe(true);
      expect(dursOf(taken)).toEqual([5 * FPS]);
      const frames = taken.map((b) => b.frame);
      expect(Math.min(...frames)).toBe(15 * FPS);
      expect(frames.every((f) => f % (15 * FPS) === 0)).toBe(true);
    });
    it('DISCRIMINATING (shape): the retired uptime-average permanent (3.36 @ frame 0, no expiry) is NOT emitted', () => {
      expect(bossDebuff(base.events, 'damageTakenPct', 3.36).length).toBe(0);
      const avg = bossDebuff(s2TakenAveraged.events, 'damageTakenPct', 3.36);
      expect(avg.length).toBeGreaterThan(0);
      expect(dursOf(avg)).toEqual([null]);
      expect(Math.min(...avg.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (target): allies (nearest-wrong) buffs the team (casterIdx takina, all slots), not the boss', () => {
      const cf = tkBuff(s2TakenAllies.events, 'damageTakenPct', 10.09);
      expect(targetsOf(cf)).toEqual(ALL_SLOTS);
      expect(
        bossDebuff(s2TakenAllies.events, 'damageTakenPct', 10.09).length
      ).toBe(0);
    });
  });

  describe('T4b — each S2 enemy pulse credits applicationGauge (takina targetPerTrigger 560 → 5.6 bar-%)', () => {
    it('paired 40s no-burst delta vs the S2 enemy block removed = 2 applications × 5.6', () => {
      // Applications at t=15 and t=30 in 40s. The stripped arm keeps the ally True Damage block
      // (no gauge: ally-targeted) and every damage-side effect of the debuff does not change her
      // fire cadence, so the gaugeGenerated delta is exactly the two application credits.
      // 5.6 = data/gauge-per-shot.json takina targetPerTrigger 560 / 100 (datamined row; the
      // engine-level mechanism is pinned in scripts/tests/engine/application-gauge.test.ts).
      const strip = withPatchedOverride('takina', (ov: any) => {
        const before = ov.skill2.length;
        ov.skill2 = ov.skill2.filter(
          (b: any) => !b.effects.some((e: any) => e.stat === 'damageTakenPct')
        );
        if (ov.skill2.length === before) {
          throw new Error(
            'takina S2 enemy damageTaken block missing — fixture is stale'
          );
        }
      });
      const g = (takinaOv?: any) =>
        unitOf(
          runComp({
            slugs: ['takina', 'crown'],
            bossElement: 'Iron',
            focusSlug: 'takina',
            overrides: {
              ...(takinaOv ? { takina: takinaOv } : {}),
              crown: bareWeaponOverride('crown'),
            },
            cfg: { disableBursts: true, durationSec: 40 },
          }),
          'takina'
        ).gaugeGenerated;
      expect(g() - g(strip)).toBeCloseTo(2 * 5.6, 6);
    });
  });

  describe('T5 — S2 all allies: True Damage ▲140.49% for 10s, 15s-cooldown pulse (interval:15, owner-confirmed CD 2026-08-16)', () => {
    const td = tkBuff(base.events, 'trueDamagePct', 140.49);
    it('pulses 140.49 on ALL allies (incl. takina): first fire at frame 900 (t=15s), 900-frame cadence, 10s windows', () => {
      expect(td.length).toBeGreaterThanOrEqual(11 * ALL_SLOTS.length);
      expect(td.every((b) => b.value === 140.49)).toBe(true);
      expect(targetsOf(td)).toEqual(ALL_SLOTS);
      expect(dursOf(td)).toEqual([10 * FPS]);
      const frames = td.map((b) => b.frame);
      expect(Math.min(...frames)).toBe(15 * FPS);
      expect(frames.every((f) => f % (15 * FPS) === 0)).toBe(true);
    });
    it('DISCRIMINATING (shape): the retired uptime-average permanent (93.66 @ frame 0, no expiry) is NOT emitted', () => {
      expect(tkBuff(base.events, 'trueDamagePct', 93.66).length).toBe(0);
      const avg = tkBuff(s2TrueAveraged.events, 'trueDamagePct', 93.66);
      expect(avg.length).toBeGreaterThan(0);
      expect(dursOf(avg)).toEqual([null]);
      expect(Math.min(...avg.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (target): enemy (nearest-wrong) removes the ally buff (no trueDamagePct 140.49 on any ally)', () => {
      // trueDamagePct is a self/ally Damage-Up stat — retargeting it to `enemy` strips the team buff entirely
      expect(tkBuff(s2TrueEnemy.events, 'trueDamagePct', 140.49).length).toBe(
        0
      );
    });
  });

  describe('T6 — S2 "Stuns for 2 sec" is UNMODELED (boss-inert)', () => {
    it("PIN: takina's skill2-keyed buffs emit EXACTLY {damageTakenPct, trueDamagePct} and NO stun/CC effect", () => {
      const s2Stats = new Set(
        buffs(base.events)
          .filter((b) => b.key.startsWith(`${TAKINA}:skill2:`))
          .map((b) => b.stat)
      );
      expect([...s2Stats].sort()).toEqual(['damageTakenPct', 'trueDamagePct']);
    });
  });

  describe('T7 — Burst self weaponSwap 200.64% final ATK, 10s; normals deal TRUE damage (trueNormals)', () => {
    const swapShots = (evs: SimEvent[]) =>
      takinaDamage(evs).filter((d) => d.atkPct === 200.64);
    const swapDmgUp = (evs: SimEvent[]) =>
      swapShots(evs).map((d) => d.mult.dmgUp);
    it('the swap shots fire (atkPct 200.64 exists) and are removed with the swap block', () => {
      expect(swapShots(base.events).length).toBeGreaterThan(0);
      expect(swapShots(noSwap.events).length).toBe(0);
    });
    // OWNER RULING 2026-08-12, replacing the kit-silent estimate this unit shipped on: the swap
    // weapon does NOT charge, fires 12 shots in the 10s window, and does NOT reload; when the swap
    // ends her sniper comes back with a FULL magazine. The estimate it replaces was the largest
    // unmeasured lever behind her 0.78 COLD reading — it fired 7 shots per window (3, a ~3.5s
    // reload, then 4), because the swap inherited her SR charge cycle AND her SR magazine.
    // ENACTED 2026-08-12 (engine/swap-economy). The three clauses map to three encodings:
    //   1. "does not charge" — `chargeTimeSec: 0` on the swap. The engine now reads that field
    //      with a NULL check, so 0 survives as chargeFrames 0 instead of collapsing to `undefined`
    //      and inheriting the base SR's 60 (`u.swap?.chargeFrames ?? u.char.chargeFrames`). The
    //      fire loop then takes the cadence branch and reads `pullsPerSec` at last.
    //   2. "1.2 shots/sec" — `pullsPerSec: 1.2`, which the swap-cadence branch prefers over both
    //      her measured cadence and the SR class default.
    //   3. "no ammo / no reload" + "sniper restored to full on exit" — the swap declares its own
    //      magazine (`maxAmmo: 999`, the `laplace` RL/Iron precedent) and, being a REAL weapon
    //      change, no longer carries `sameWeapon`, so it takes the refill at BOTH ends. The
    //      refill gate used to key on `trueNormals`, which conflated the damage FLAVOR with the
    //      ammo ECONOMY; `sameWeapon` now marks the four genuine same-weapon flavor swaps
    //      (chisato / clay / jill / frima), each of whose `damagePct` equals its own
    //      `normalAttackMultiplier` exactly.
    // The three assertions below cover all three clauses: the shot COUNT, the absence of a
    // mid-window reload gap, and the post-window magazine.
    it('ENCODING: the swap declares its own economy — chargeTimeSec 0 / pullsPerSec 1.2 / maxAmmo 999, and is NOT a sameWeapon swap', () => {
      const ov: any = loadOverride('takina');
      const sw = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'weaponSwap');
      expect(sw).toBeTruthy();
      expect(sw.chargeTimeSec).toBe(0); // "does not charge" — a null-checked 0, not an omission
      expect(sw.pullsPerSec).toBe(1.2);
      expect(sw.maxAmmo).toBe(999); // "no ammo" — outlasts the 10s window (laplace RL/Iron precedent)
      expect(sw.sameWeapon).toBeUndefined(); // a REAL weapon change: refills at both ends
      expect(sw.trueNormals).toBe(true); // …and still true-flavored: flavor and economy are independent
    });
    it('fires 12 swap shots per window with NO reload gap (owner ruling)', () => {
      const casts = takinaBursts(base.events).map((c) => c.frame);
      expect(casts.length).toBeGreaterThan(0);
      for (const cast of casts) {
        const frames = swapShots(base.events)
          .map((d) => d.frame)
          .filter((f) => f > cast && f <= cast + 10 * FPS);
        expect(
          frames.length,
          `cast at ${(cast / FPS).toFixed(1)}s fired ${frames.length} swap shots, ruling says 12`
        ).toBe(12);
        // No reload: consecutive shots stay on cadence. A magazine break shows up as a gap of
        // several seconds (her SR reload is ~3.5s), so any gap far above the shot interval fails.
        const gaps = frames.slice(1).map((f, i) => f - frames[i]);
        expect(
          Math.max(...gaps) / FPS,
          'a multi-second gap means the swap weapon reloaded mid-window'
        ).toBeLessThan(1.5);
      }
    });
    // Ruling clause 3: "when the swap ends she returns to the sniper with its magazine restored to
    // full", read straight off the ammo counter — the first SR pull after each window leaves 5 of
    // her 6 rounds. Both wrong models are excluded numerically: keeping her half-spent magazine
    // across the window leaves FEWER (she entered most windows on 1-3 rounds), and leaking the
    // swap's own 999-round magazine back to the sniper leaves ~986.
    it('the SNIPER comes back with a FULL magazine (ammo 6) when the swap ends', () => {
      const shots = base.events.filter(
        (e): e is Extract<SimEvent, { kind: 'shot' }> =>
          e.kind === 'shot' && e.slug === 'takina'
      );
      const casts = takinaBursts(base.events).map((c) => c.frame);
      let windowsChecked = 0;
      for (const cast of casts) {
        const exit = cast + 10 * FPS;
        const first = shots.find((s) => s.frame > exit);
        if (!first) {
          continue; // last window, truncated by the end of the fight
        }
        windowsChecked++;
        expect(
          first.ammoAfter,
          `swap ending at ${(exit / FPS).toFixed(1)}s: a restored 6-round magazine reads 5 after the first pull`
        ).toBe(5);
      }
      expect(windowsChecked).toBeGreaterThan(0);
    });
    // The ruling's stated CONSEQUENCE, and the reason the restored magazine matters: "she then
    // never needs to reload, because she cannot land 6 full-charge sniper shots between bursts in
    // most comps." She fires 5-6 SR rounds per inter-burst gap here, so no reload ever completes.
    // Discriminated against the nearest-wrong reading — her burst as a same-weapon FLAVOR swap,
    // which withholds the refill at both ends and makes her run the swap dry mid-window.
    it('DISCRIMINATING (economy): she NEVER reloads; as a sameWeapon flavor swap she would', () => {
      const reloads = (evs: SimEvent[]) =>
        evs.filter((e) => e.kind === 'reload' && e.slug === 'takina');
      expect(reloads(base.events).length).toBe(0);
      expect(reloads(flavorSwap.events).length).toBeGreaterThan(0);
    });
    it('the swap shots are TRUE-flavored: trueDamagePct (flavor-gated) rides their Damage-Up bucket', () => {
      // Under the S2 pulse model the team True Damage is 140.49 for 10s of every 15 — swap shots
      // overlapped by a pulse inside an FB window stack T3 35.05 + T5 140.49 (dmgUp ≥ 2.7554);
      // swap shots in a non-FB window with no pulse overlap carry NO True Damage at all (dmgUp
      // floor 1.0 — the spec consequence that discriminates the pulse from the retired permanent,
      // whose floor was ≥ 1.9366 everywhere).
      expect(Math.max(...swapDmgUp(base.events))).toBeGreaterThan(2.75);
      expect(Math.min(...swapDmgUp(base.events))).toBe(1);
    });
    it('DISCRIMINATING (flavor): trueNormals:false (nearest-wrong) strips trueDamagePct — paired per-shot', () => {
      // trueNormals:false does not change cadence, so the two runs' swap shots pair by index.
      const b = swapShots(base.events);
      const c = swapShots(noTrueNormals.events);
      expect(c.length).toBe(b.length);
      expect(b.every((d, i) => d.frame === c[i].frame)).toBe(true);
      // no stripped shot ever carries the trueDamagePct pulse tier…
      expect(Math.max(...swapDmgUp(noTrueNormals.events))).toBeLessThan(2.4);
      // …every faithful shot ≥ its stripped twin, and the pulse-overlapped ones strictly exceed it
      const dmg = (d: Damage) => d.mult.dmgUp;
      expect(b.every((d, i) => dmg(d) >= dmg(c[i]) - 1e-9)).toBe(true);
      expect(b.filter((d, i) => dmg(d) > dmg(c[i]) + 1)).not.toHaveLength(0);
    });
  });

  describe('T8 — Burst "targets hit: Damage Taken ▲6.04%/5s" = shotFired boss debuff, swapGate(swapped) [FIX]', () => {
    const debuff = bossDebuff(base.events, 'damageTakenPct', 6.04);
    it('every 6.04 application lands inside a [burstCast, +10s] swap window (swapGate, not ungated)', () => {
      expect(debuff.length).toBeGreaterThan(0);
      expect(debuff.every((b) => b.targetIdx === null)).toBe(true); // the boss
      expect(dursOf(debuff)).toEqual([5 * FPS]);
      expect(debuff.every((b) => inWindow(b.frame, castWins))).toBe(true);
    });
    it('DISCRIMINATING (gate vs UNGATED): ungated fires outside the swap windows + far more often', () => {
      const cf = bossDebuff(debuffUngated.events, 'damageTakenPct', 6.04);
      expect(
        cf.some((b) => !inWindow(b.frame, castWindows(debuffUngated.events)))
      ).toBe(true);
      expect(cf.length).toBeGreaterThan(debuff.length);
    });
    it('DISCRIMINATING (gate vs fbGate — THE FIX): swapGate fires in non-FB swap windows that fbGate (requires inFb) cannot', () => {
      // faithful swapGate: a 6.04 application exists OUTSIDE every Full Burst window (a swap window with no FB)
      expect(debuff.some((b) => !inWindow(b.frame, fbWins))).toBe(true);
      // fbGate (shipped): EVERY 6.04 application lands inside a Full Burst window (none outside)
      const cf = bossDebuff(debuffFbGate.events, 'damageTakenPct', 6.04);
      expect(cf.length).toBeGreaterThan(0);
      expect(
        cf.every((b) => inWindow(b.frame, fbWindows(debuffFbGate.events)))
      ).toBe(true);
    });
  });
});
