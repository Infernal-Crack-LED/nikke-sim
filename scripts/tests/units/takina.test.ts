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
// SKILL2 STEADY-STATE MODELING (why S2 is a permanent uptime-average, not a 5s/10s timed pulse): the S2 prose
// carries NO trigger/cooldown clause; the datamine skill2 table is a passive `CharacterSkill` with no
// `skill_cooltime`. Prydwen (COMMUNITY ⚑) lists a 15s cooldown pulse. The engine cannot pulse a passive-trigger
// buff (a passive trigger ignores durationSec — sim.ts:983-993 — so encoding 10.09%/5s as passive+durationSec
// would be a 100%-uptime permanent, OVER-crediting). The faithful steady-state is the UPTIME-AVERAGE over the
// 15s cycle: enemy damageTakenPct 10.09 × 5/15 = 3.36 (33% uptime), ally trueDamagePct 140.49 × 10/15 = 93.66
// (67% uptime), both encoded as frame-0 permanents. The 15s cooldown is COMMUNITY-sourced (⚑, needs measurement);
// the durations 5s/10s are the prose's own. This is a documented CALIBRATED ⚑, not a silent value change.
//
// EVENT-LOG CONVENTIONS (measured for this fixture): boss-held debuffs (the S2 enemy damageTakenPct 3.36 and the
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
//   T4  "all enemies: Damage Taken ▲10.09% for 5 sec" = damageTakenPct 3.36 (uptime-average ⚑), passive, target
//       the boss (targetIdx null), permanent. Nearest-wrong (a): value 10.09 (the raw prose magnitude, ignoring
//       the 15s-pulse uptime-average). (b): target allies (would buff the team, not debuff the boss).
//   T5  "all allies: True Damage ▲140.49% for 10 sec" = trueDamagePct 93.66 (uptime-average ⚑), passive, target
//       allies (all 3 slots incl. takina), permanent. Nearest-wrong (a): value 140.49 (raw prose, no uptime-
//       average). (b): target enemy (would debuff the boss, not buff the team).
//   T6  PIN (documented skip): the S2 "Stuns for 2 sec" is UNMODELED (boss-inert: the partless boss does not
//       fire/charge/reload, so a stun changes nothing). The S2 SLOT is active (it emits the T4 enemy debuff +
//       T5 ally buff). Assert: takina's skill2-keyed buffs (key prefix `1:skill2:`) emit EXACTLY the two modeled
//       stat families {damageTakenPct, trueDamagePct} and NO third (stun/CC) effect — the documented skip is
//       distinguished from a silent drop or a mis-encoding of the stun as a damage stat.
//   T7  "Changes the weapon in use — Damage 200.64% of final ATK, 10 sec" + "Normal attacks deal true damage for
//       10 sec" = burstCast → self weaponSwap damagePct 200.64, 10s, trueNormals:true. The swap shots (atkPct
//       200.64) exist; removing the swap block removes them. trueNormals makes the swap shots TRUE-flavored, which
//       routes the trueDamagePct buffs (T3 35.05 + T5 93.66) into their Damage-Up bucket (trueDamagePct is
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
import { runComp, withPatchedOverride } from '../lib/harness.js';

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
// T4 nearest-wrong (value): the enemy debuff at the RAW prose magnitude 10.09 (no uptime-average).
const cfS2TakenRaw = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct')
  );
  if (!b) {
    throw new Error(
      'takina S2 enemy damageTaken block missing — fixture is stale'
    );
  }
  eff(b, 'damageTakenPct').value = 10.09;
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
// T5 nearest-wrong (value): the ally True Damage buff at the RAW prose magnitude 140.49 (no uptime-average).
const cfS2TrueRaw = withPatchedOverride('takina', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'trueDamagePct')
  );
  if (!b) {
    throw new Error(
      'takina S2 ally trueDamage block missing — fixture is stale'
    );
  }
  eff(b, 'trueDamagePct').value = 140.49;
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
const s2TakenRaw = run({ takina: cfS2TakenRaw });
const s2TakenAllies = run({ takina: cfS2TakenAllies });
const s2TrueRaw = run({ takina: cfS2TrueRaw });
const s2TrueEnemy = run({ takina: cfS2TrueEnemy });
const noSwap = run({ takina: cfNoSwap });
const noTrueNormals = run({ takina: cfNoTrueNormals });
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

  describe('T4 — S2 all enemies: Damage Taken ▲10.09%/5s ⇒ uptime-average damageTakenPct 3.36 (passive permanent ⚑)', () => {
    const taken = bossDebuff(base.events, 'damageTakenPct', 3.36);
    it('is a permanent (no expiry) frame-0 debuff on the BOSS (targetIdx null), value 3.36', () => {
      expect(taken.length).toBeGreaterThan(0);
      expect(taken.every((b) => b.value === 3.36 && b.targetIdx === null)).toBe(
        true
      );
      expect(dursOf(taken)).toEqual([null]);
      expect(Math.min(...taken.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (value): the raw prose 10.09 (nearest-wrong, no uptime-average) is NOT the faithful encoding', () => {
      expect(bossDebuff(s2TakenRaw.events, 'damageTakenPct', 3.36).length).toBe(
        0
      );
      expect(
        bossDebuff(s2TakenRaw.events, 'damageTakenPct', 10.09).length
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (target): allies (nearest-wrong) buffs the team (casterIdx takina, all slots), not the boss', () => {
      const cf = tkBuff(s2TakenAllies.events, 'damageTakenPct', 3.36);
      expect(targetsOf(cf)).toEqual(ALL_SLOTS);
      expect(
        bossDebuff(s2TakenAllies.events, 'damageTakenPct', 3.36).length
      ).toBe(0);
    });
  });

  describe('T5 — S2 all allies: True Damage ▲140.49%/10s ⇒ uptime-average trueDamagePct 93.66 (passive permanent ⚑)', () => {
    const td = tkBuff(base.events, 'trueDamagePct', 93.66);
    it('is a permanent (no expiry) frame-0 buff on ALL allies (incl. takina), value 93.66', () => {
      expect(td.length).toBeGreaterThan(0);
      expect(td.every((b) => b.value === 93.66)).toBe(true);
      expect(targetsOf(td)).toEqual(ALL_SLOTS);
      expect(dursOf(td)).toEqual([null]);
      expect(Math.min(...td.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (value): the raw prose 140.49 (nearest-wrong, no uptime-average) is NOT the faithful encoding', () => {
      expect(tkBuff(s2TrueRaw.events, 'trueDamagePct', 93.66).length).toBe(0);
      expect(
        tkBuff(s2TrueRaw.events, 'trueDamagePct', 140.49).length
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (target): enemy (nearest-wrong) removes the ally buff (no trueDamagePct 93.66 on any ally)', () => {
      // trueDamagePct is a self/ally Damage-Up stat — retargeting it to `enemy` strips the team buff entirely
      expect(tkBuff(s2TrueEnemy.events, 'trueDamagePct', 93.66).length).toBe(0);
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
    it('the swap shots are TRUE-flavored: trueDamagePct (flavor-gated) rides their Damage-Up bucket', () => {
      // faithful swap shots carry the trueDamagePct buffs (T3 35.05 + T5 93.66) in dmgUp
      expect(Math.min(...swapDmgUp(base.events))).toBeGreaterThan(1.9); // ≥ +93.66% trueDamagePct alone
    });
    it('DISCRIMINATING (flavor): trueNormals:false (nearest-wrong) strips trueDamagePct → strictly lower swap dmgUp', () => {
      expect(swapShots(noTrueNormals.events).length).toBeGreaterThan(0);
      // every faithful swap shot outruns every flavor-stripped swap shot (the trueDamagePct contribution)
      expect(Math.min(...swapDmgUp(base.events))).toBeGreaterThan(
        Math.max(...swapDmgUp(noTrueNormals.events))
      );
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
