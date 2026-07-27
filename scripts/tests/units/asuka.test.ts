// PER-UNIT KIT SPEC — base `asuka` (Asuka, AR/Attacker/Fire, Burst III, cd 40s, ammo 20).
// NOT the MG/Wind variant `asuka-wille` — reason from the exact slug `asuka`.
// Kit-autonomy gauntlet 2026-07-24 (test-first; owner-driven spec audit).
//
// One assertion group per KIT LINE (H1..H7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a recovery source — never to supply the
// encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.asuka.skills):
//   S1 ■ start of battle → self: Damage dealt to Shield ▲601.01% continuously              [H1 UNMODELED]
//      ■ when recovery takes effect → self: ATK ▲96.98% for 25 sec                          [H2]
//   S2 ■ entering Full Burst, self in Shield status: Elem. Advantage Attack Dmg ▲30.02%/10s [H3]
//      ■ entering Full Burst → all Fire Code allies: Damage vs core ▲60.07% for 10 sec      [H4]
//   BU ■ self: Gain Pierce for 25 sec                                                      [PIERCE — modeled-inert]
//      ■ self: Attack damage ▲150.04% for 10 sec                                            [H5]
//      ■ self: Recovers 3.16% of attack damage as HP over 10 sec                            [H6]
//      ■ self: Hit Rate ▲101.37% for 10 sec                                                 [H7]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   H1  no shield-damage StatKey exists and the partless scope-lock boss never shields, so the line
//       is honestly UNMODELED — pinned as a VERBATIM `unmodeled.skill1` entry (a documented skip,
//       not a silent drop). No damage assertion is possible (nothing encodes it).
//   H2  the ATK buff is RECOVERY-triggered, not passive and not burstCast. Proven two ways: remove
//       every heal that reaches her and it fires ZERO times (a passive/burstCast model still fires);
//       and the nearest-wrong encoding — the pre-gauntlet PASSIVE proxy — fires exactly ONCE at
//       frame 0, whereas the recovery model refreshes repeatedly across the fight.
//   H3  self-scoped at FB entry, gated on Shield status via the requiresShielded block gate
//       (gauntlet FIX 2026-07-24 — the primitive DOES exist; the shipped note wrongly claimed
//       otherwise). crown's burst shield keeps her shielded at every FB entry here, so the gate is
//       satisfied and the buff lands on all 11 entries; remove crown's shield and it falls silent.
//       Inert without elemental advantage regardless (boss Fire, she Fire) — asserted on buffApply.
//   H4  scoped to FIRE-CODE allies — she is the only Fire unit in the comp, so it must reach her
//       slot ALONE and must NOT reach liter/crown (Iron) or helm (Water). The all-allies
//       counterfactual hits all four slots, proving the scoping assertion is one the generic model
//       provably fails.
//   H5/H7  burstCast self-buffs: fire once per asuka burst, at the cast frame, self-scoped, 10s.
//   H6  the lifesteal is a RECOVERY EVENT, not a number: with helm's heals removed it becomes the
//       SOLE recovery source reaching her, and her own S1 then fires exactly once per burst AT the
//       burst frame — the self-sustaining ATK chain the override note posits, here measured in-sim.
//   PIERCE  "Gain Pierce 25s" is a timed gainPierce:25s burstCast effect (gauntlet FIX 2026-07-24 —
//       was the permanent top-level hasPierce flag; both blind models chose the timed effect). Pierce
//       is inert in v1 (PIERCE_CORE_DOUBLE off, pierceDamagePct unbuffed), so the 25s window is pinned
//       statically + a removing-it-changes-nothing totals check, not a damage discrimination.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / asuka B3 / helm B3, boss Fire,
// focus asuka). asuka is slot index 2. Two Burst-III units alternate the chain, so asuka casts 6
// bursts over 180s and there are 11 Full-Burst entries (each fires her S2). Crown heals ONLY
// herself (hitCount:860 self-heal), so the recovery sources reaching asuka are helm's all-ally
// heals + asuka's own burst lifesteal. Deterministic (no seed); event-log over totals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / asuka 2 / helm 3. */
const ASUKA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('asuka'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** ISOLATION: remove EVERY heal that reaches asuka — helm's all-ally S1 + burst heals AND asuka's
 *  own burst lifesteal. Leaves asuka with NO recovery source, so her recovery-triggered S1 must
 *  fall silent if (and only if) it is genuinely recovery-gated. */
const noRecoverySource = (() => {
  const helmNoHeal = withPatchedOverride('helm', (ov) => {
    const s1 = ov.skill1.length;
    const bu = ov.burst.length;
    ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
    ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
    if (ov.skill1.length === s1 || ov.burst.length === bu)
      {throw new Error('helm heal blocks missing — fixture is stale');}
  });
  const asukaNoLifesteal = withPatchedOverride('asuka', (ov) => {
    let removed = 0;
    for (const b of ov.burst) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      removed += before - b.effects.length;
    }
    if (!removed)
      {throw new Error('asuka burst lifesteal missing — fixture is stale');}
  });
  return { helm: helmNoHeal, asuka: asukaNoLifesteal };
})();

/** LIFESTEAL-ONLY: remove helm's all-ally heals but KEEP asuka's own burst lifesteal, making it the
 *  sole recovery source reaching her — isolates the self-proc chain (H6). */
const lifestealOnly = withPatchedOverride('helm', (ov) => {
  const s1 = ov.skill1.length;
  const bu = ov.burst.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === s1 || ov.burst.length === bu)
    {throw new Error('helm heal blocks missing — fixture is stale');}
});

/** H2 counterfactual: the pre-gauntlet encoding — S1 ATK as an always-on PASSIVE (healer-team
 *  uptime proxy), instead of the kit-faithful recovery trigger. */
const asukaPassiveS1 = withPatchedOverride('asuka', (ov) => {
  let patched = 0;
  for (const b of ov.skill1)
    {if (b.trigger?.kind === 'recovery') {
      b.trigger = { kind: 'passive' };
      patched++;
    }}
  if (!patched)
    {throw new Error('asuka S1 recovery block missing — fixture is stale');}
});

/** H3/H4 counterfactual: both S2 buffs un-scoped to ALL allies (drops the self-only and
 *  Fire-code-only targeting). */
const asukaS2All = withPatchedOverride('asuka', (ov) => {
  let patched = 0;
  for (const b of ov.skill2) {
    if (
      b.effects.some(
        (e: any) =>
          e.stat === 'elemAdvantageDamagePct' || e.stat === 'coreDamagePct'
      )
    ) {
      b.target = { kind: 'allies' };
      patched++;
    }
  }
  if (patched < 2)
    {throw new Error('asuka S2 buff blocks missing — fixture is stale');}
});

/** H3 gate-discrimination: remove crown's burst SHIELD (the comp's only shield source). With the
 *  kit-faithful requiresShielded gate now on S2, her Elemental Advantage buff must fall silent —
 *  proving the gate is live, not decorative. */
const crownNoShield = withPatchedOverride('crown', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'shield');
    removed += before - b.effects.length;
  }
  if (!removed)
    {throw new Error('crown burst shield missing — fixture is stale');}
});

/** PIERCE inertness: drop the timed gainPierce effect. Pierce moves no damage vs the v1 boss
 *  (PIERCE_CORE_DOUBLE off, no pierceDamagePct), so totals must be byte-identical. */
const asukaNoPierce = withPatchedOverride('asuka', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
    removed += before - b.effects.length;
  }
  if (!removed)
    {throw new Error('asuka burst gainPierce missing — fixture is stale');}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noRecovery = run(noRecoverySource);
const selfProc = run({ helm: lifestealOnly });
const passive = run({ asuka: asukaPassiveS1 });
const s2All = run({ asuka: asukaS2All });
const noShield = run({ crown: crownNoShield });
const noPierce = run({ asuka: asukaNoPierce });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const asukaBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ASUKA &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const asukaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'asuka'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const frames = (bs: BuffApply[]) => bs.map((b) => b.frame);
const targets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort();
const dur = (bs: BuffApply[]) => [
  ...new Set(bs.map((b) => b.expiresFrame! - b.frame)),
];

const SHIPPED = JSON.parse(
  readFileSync(
    new URL('../../../src/skills/overrides/asuka.json', import.meta.url),
    'utf8'
  )
);

describe('asuka (base, AR/Fire/Attacker) — kit spec', () => {
  describe('H1 — S1 shield-damage 601.01% is honestly UNMODELED (inert: no StatKey, partless boss)', () => {
    it('is documented verbatim in unmodeled.skill1, not silently dropped', () => {
      expect(SHIPPED.unmodeled.skill1).toContain(
        'Damage dealt to Shield ▲ 601.01% continuously.'
      );
    });
  });

  describe('H2 — S1 ATK ▲96.98%/25s is RECOVERY-triggered, self-scoped', () => {
    const applied = asukaBuffs(base.events, 'atkPct', 96.98);

    it('is the kit magnitude, self-scoped, for 25 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([25 * FPS]);
    });

    it('is GATED on receiving a recovery — zero firings when no heal reaches her', () => {
      // A passive or burstCast encoding would still fire here; only a recovery gate falls silent.
      expect(asukaBuffs(noRecovery.events, 'atkPct', 96.98).length).toBe(0);
    });

    it('DISCRIMINATING: the passive proxy fires once at battle start; recovery refreshes across the fight', () => {
      const passiveApplied = asukaBuffs(passive.events, 'atkPct', 96.98);
      expect(
        frames(passiveApplied),
        'passive applies a single always-on buff at t=0'
      ).toEqual([0]);
      expect(
        applied.length,
        'recovery re-fires as heals land — far more than the single passive grant'
      ).toBeGreaterThan(passiveApplied.length);
      expect(
        Math.max(...frames(applied)),
        'recovery firings span the whole fight, not just t=0'
      ).toBeGreaterThan(1000);
    });
  });

  describe('H3 — S2 Elemental Advantage ▲30.02%/10s on Full Burst entry, self-scoped, SHIELD-GATED', () => {
    const applied = asukaBuffs(base.events, 'elemAdvantageDamagePct', 30.02);

    it('fires once per Full Burst entry at the kit magnitude, for 10 sec, on herself only', () => {
      // crown's burst shield keeps asuka shielded at every FB entry in this comp, so the
      // requiresShielded gate is satisfied throughout and the buff lands on all 11 entries.
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([10 * FPS]);
    });

    it('is GATED on Shield status — suppressed entirely when no shield source exists', () => {
      // The kit reads "Affects self when in Shield status"; remove crown's shield (the comp's only
      // shield source) and the gate must zero the block. Proves the gate is live, not decorative —
      // the nearest-wrong model (gate dropped) keeps firing here.
      expect(
        asukaBuffs(noShield.events, 'elemAdvantageDamagePct', 30.02).length
      ).toBe(0);
    });

    it('DISCRIMINATING: un-scoping to all allies would reach every slot', () => {
      expect(
        targets(asukaBuffs(s2All.events, 'elemAdvantageDamagePct', 30.02))
      ).toEqual([0, 1, 2, 3]);
    });
  });

  describe('H4 — S2 core-damage ▲60.07%/10s on Full Burst entry, scoped to FIRE-CODE allies', () => {
    const applied = asukaBuffs(base.events, 'coreDamagePct', 60.07);

    it('fires once per Full Burst entry at the kit magnitude, for 10 sec', () => {
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect(dur(applied)).toEqual([10 * FPS]);
    });

    it('reaches ONLY the Fire-code ally (herself) — not the Iron or Water allies', () => {
      // asuka is the sole Fire unit in the comp; liter/crown are Iron, helm is Water.
      expect(targets(applied)).toEqual([ASUKA]);
    });

    it('DISCRIMINATING: an all-allies encoding would reach all four slots', () => {
      expect(targets(asukaBuffs(s2All.events, 'coreDamagePct', 60.07))).toEqual(
        [0, 1, 2, 3]
      );
    });
  });

  describe('H5 — burst Attack damage ▲150.04%/10s, self-scoped, on cast', () => {
    const applied = asukaBuffs(base.events, 'attackDamagePct', 150.04);
    const burstFrames = asukaBursts(base.events).map((b) => b.frame);

    it('fires once per asuka burst, at the cast frame, on herself, for 10 sec', () => {
      expect(applied.length).toBe(burstFrames.length);
      expect(applied.length).toBeGreaterThan(0);
      expect(frames(applied)).toEqual(burstFrames);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([10 * FPS]);
    });
  });

  describe('H6 — burst lifesteal is a RECOVERY EVENT that self-procs her own S1', () => {
    it("with helm's heals gone, her lifesteal fires S1 exactly once per burst, at the cast frame", () => {
      const burstFrames = asukaBursts(selfProc.events).map((b) => b.frame);
      const s1 = asukaBuffs(selfProc.events, 'atkPct', 96.98);
      expect(burstFrames.length).toBeGreaterThan(0);
      expect(
        frames(s1),
        'each burst lifesteal procs exactly one S1 recovery, at the cast frame'
      ).toEqual(burstFrames);
    });
  });

  describe('H7 — burst Hit Rate ▲101.37%/10s, self-scoped, on cast', () => {
    const applied = asukaBuffs(base.events, 'hitRatePct', 101.37);
    const burstFrames = asukaBursts(base.events).map((b) => b.frame);

    it('fires once per asuka burst, at the cast frame, on herself, for 10 sec', () => {
      expect(applied.length).toBe(burstFrames.length);
      expect(applied.length).toBeGreaterThan(0);
      expect(frames(applied)).toEqual(burstFrames);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([10 * FPS]);
    });
  });

  describe('PIERCE — burst "Gain Pierce 25s" is a timed gainPierce effect (inert in v1)', () => {
    const pierceEffect = SHIPPED.burst[0].effects.find(
      (e: any) => e.kind === 'gainPierce'
    );

    it('is encoded as a timed gainPierce:25s burstCast effect, not the permanent hasPierce flag', () => {
      // Gauntlet FIX 2026-07-24: the kit says "for 25 sec", so it is a 25s window keyed to her burst
      // cast — not the always-on top-level hasPierce flag (which both cross-family blind models
      // independently rejected in favour of the timed gainPierce effect).
      expect(pierceEffect).toBeTruthy();
      expect(pierceEffect.durationSec).toBe(25);
      expect(SHIPPED.hasPierce).toBeUndefined();
    });

    it('is damage-inert in v1 (pierceDamagePct unbuffed, PIERCE_CORE_DOUBLE off) — removing it changes no total', () => {
      expect(noPierce.totals).toEqual(base.totals);
    });
  });
});
