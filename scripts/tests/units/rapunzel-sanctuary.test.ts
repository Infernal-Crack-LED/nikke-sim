// PER-UNIT KIT SPEC — `rapunzel-sanctuary` (Rapunzel: Sanctuary; RL / Supporter / Fire / Pilgrim,
// Burst II, cd 40s, ammo 6, chargeFrames 60, chargeMult 250, normalMult 61.3). NOT the base
// `rapunzel` (RL/Iron) nor `rapunzel-pure-grace` (SR/Iron). Kit-autonomy gauntlet 2026-10-29.
// Tier 2 (burstCast-vs-fullBurstEnter identity; a status-scoped target "self and all allies in the
// Into the Fray state"; a receiving-side stat immunity).
//
// One assertion group per KIT LINE (L1..L11), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` on rapunzel-sanctuary appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters['rapunzel-sanctuary'].skills, SL10):
//   S1 ■ Full Charge attack → all allies: Restores HP equal to 3.9% of the user's final max HP   [L1]
//      ■ entering Full Burst → self and all allies in the Into the Fray state:
//        Attack Damage ▲ 27.45% for 10 sec                                                     [L2]
//      ■ using Nanoparticle Injection → self: Cooldown of Burst Skill ▲ 40 sec; Nanoparticle
//        Consumption: DEF ▲ 10% (continuous)                                         [L3 UNMODELED]
//      ■ only when at Full Charge during a Full Charge attack → self: immunity to effects that
//        increase / decrease charge speed (continuous)                                        [L4]
//   S2 ■ Full Charge maintained ≥ 1 sec while not in Goddess Blessing → self: shared shield
//        7.39% of the user's final max HP for all allies, removed when charging ends  [L5 UNMODELED]
//      ■ same trigger → all allies: Goddess Blessing: DEF ▲ 42.24% of the user's DEF 10s
//                                                                                  [L6 UNMODELED]
//      ■ entering Full Burst → self and all allies in the Into the Fray state:
//        ATK ▲ 29.17% of the skill user's ATK for 10 sec                                       [L7]
//      ■ Full Charge attack → the enemy nearest the crosshair: 220.7% of final ATK as
//        additional damage                                                                    [L8]
//   BU ■ when NOT in Nanoparticle Consumption: (≥ 3 allies incapacitated → incapacitated allies:
//        Nanoparticle Injection revive 96% HP + ATK ▲ 101.37% / DEF ▲ 221.76% of the user's,
//        once per battle [L10 UNMODELED]) | (≤ 2 incapacitated → all allies: ATK ▲ 34.84% of the
//        skill user's ATK 10s [L9])
//      ■ when IN Nanoparticle Consumption → all allies: ATK ▲ 34.84% of the user's ATK 10s [L11]
//
// Unreachable branches (v1 has no HP pool: the boss deals no damage, nobody is ever incapacitated):
// the ≥3-incapacitated revive branch never activates, so Nanoparticle Injection — and with it the
// +40s burst cooldown and the Nanoparticle Consumption state — never happen; her burst is ALWAYS
// the "≤2 incapacitated" branch. L11 (in Consumption) carries the SAME grant as L9, so the one
// encoded burst block is the burst's behaviour in every reachable state.
//
// "Into the Fray" is a FAMILY of named self-states ("Into the Fray: <Mode>" — marian-queen's
// Sharpened Resolve / Penetrant Wish, scarlet-goddeath's Serene Mind / At One With the Sword).
// The target is the engine `alliesInStatus` selector (statusPrefix "Into the Fray", includeSelf):
// it reads ally `selfStatus` windows by prefix. The fixture gives marian-queen a battle-start
// "Into the Fray: Sharpened Resolve" status (her S1 mode, active from the start of battle) via a
// fixture patch, so the ally half is exercised independently of how her own override names it.
//
// Why each assertion discriminates:
//   L1  Every full-charge shot of hers fires a recovery event on an ALLY (folkwang's probe consumer
//       fires once per shot frame). Counterfactuals: heal block dropped (0 firings); target self
//       (the ally probe never fires).
//   L2  At EVERY Full Burst start (including chains she did not cast in), Attack Damage 27.45 lands
//       on exactly {self, the Into the Fray ally}, expiring 600f later. Counterfactuals: target all
//       allies (liter/folkwang also buffed); target self (the ally missed); burstCast keying (frames
//       land on her cast frames, not FB starts — and miss FBs she did not cast in).
//   L4  An ally-wide charge-speed buff (folkwang probe) lands on every ally but her.
//       Counterfactual: statImmunities removed (she receives it).
//   L7  Same set / frames / duration as L2 for the caster-ATK 29.17 grant. Counterfactuals as L2,
//       plus atkPct (own-ATK) instead of casterAtkPct.
//   L8  Exactly one skill2 220.7% hit per shot of hers, on the shot frame, skill bucket, not
//       core-eligible. Counterfactuals: dropped; doubled; core-flagged.
//   L9  On EACH of her burst casts, caster-ATK 34.84 lands on all four allies on the CAST frame
//       (before Full Burst), expiring 600f later, exactly one grant per ally per cast.
//       Counterfactuals: fullBurstEnter keying (frame shift); target self only; both 34.84 branches
//       encoded unconditionally (double grant).
//   L3/L5/L6/L10/L11 inertness: no shield events, no DEF/101.37 grants, burst cooldown never grows.
//
// Fixture: liter (B1) / rapunzel-sanctuary (B2, focus) / marian-queen (B3, +Into the Fray status) /
// folkwang (B2, bare weapon + synthetic probe blocks: a 'recovery' consumer, a 'shielded' consumer),
// boss Fire. folkwang never takes a stage-2 cast here, so the fullBurstEnter-vs-burstCast check on
// Full Bursts she sat out uses a second fixture with two B2s (twoB2, below). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  bareWeaponOverride,
  runComp,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'rapunzel-sanctuary';
const TEAM = ['liter', SLUG, 'marian-queen', 'folkwang'];
const LITER = 0;
const RAP = 1;
const MARIAN = 2;
const FOLK = 3;
const WIN = 600; // 10 s
const ITF = 'Into the Fray: Sharpened Resolve';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Dmg = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const REC_MARK = 0.0123; // folkwang's recovery-probe marker value
const SHIELD_MARK = 0.0456; // folkwang's shielded-probe marker value
const CSPD_MARK = 7.89; // the ally-wide charge-speed probe

function folkwangProbe(chargeSpeed: boolean) {
  const ov = bareWeaponOverride('folkwang') as any;
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'recovery' },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'atkPct', value: REC_MARK, durationSec: 1 },
      ],
    },
    {
      slot: 'skill1',
      trigger: { kind: 'shielded' },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'atkPct', value: SHIELD_MARK, durationSec: 1 },
      ],
    },
  ];
  if (chargeSpeed) {
    ov.skill2 = [
      {
        slot: 'skill2',
        trigger: { kind: 'battleStart' },
        target: { kind: 'allies' },
        effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: CSPD_MARK }],
      },
    ];
  }
  return ov;
}

const marianInFray = () =>
  withPatchedOverride('marian-queen', (ov) => {
    ov.skill1 = [
      {
        slot: 'skill1',
        trigger: { kind: 'battleStart' },
        target: { kind: 'self' },
        effects: [{ kind: 'selfStatus', name: ITF, durationSec: 999 }],
      },
      ...ov.skill1,
    ];
  });

function run(ov?: any, opts: { chargeSpeed?: boolean } = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: TEAM,
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides: {
      ...(ov ? { [SLUG]: ov } : {}),
      'marian-queen': marianInFray(),
      folkwang: folkwangProbe(!!opts.chargeSpeed),
    },
    cfg: { onEvent: (e) => events.push(e) },
  });
  const buffs = events.filter((e): e is BuffApply => e.kind === 'buffApply');
  const shots = events.filter(
    (e): e is Shot => e.kind === 'shot' && e.unitIdx === RAP
  );
  const dmg = events.filter(
    (e): e is Dmg => e.kind === 'damage' && e.unitIdx === RAP
  );
  const casts = events
    .filter((e) => e.kind === 'burstCast' && e.unitIdx === RAP)
    .map((e) => e.frame);
  const allCasts = events.filter((e) => e.kind === 'burstCast');
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  /** her grants of one authored value (buff key `<caster>:<slot>:<stat>:<value>`) */
  const mine = (stat: string, value: number) =>
    buffs.filter(
      (b) =>
        b.casterIdx === RAP &&
        b.stat === stat &&
        b.key.endsWith(`:${stat}:${value}`)
    );
  const probe = (value: number) =>
    buffs.filter(
      (b) => b.targetIdx === FOLK && b.stat === 'atkPct' && b.value === value
    );
  return { events, buffs, shots, dmg, casts, allCasts, fbStarts, mine, probe };
}
type Run = ReturnType<typeof run>;

/** frame → sorted holder set, for one grant */
function byFrame(bs: BuffApply[]): Map<number, number[]> {
  const m = new Map<number, number[]>();
  for (const b of bs) {
    m.set(b.frame, [...(m.get(b.frame) ?? []), b.targetIdx as number]);
  }
  for (const [f, v] of m) {
    m.set(
      f,
      [...new Set(v)].sort((a, b) => a - b)
    );
  }
  return m;
}

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const blocksWith = (ov: any, pred: (e: any) => boolean) =>
  (['skill1', 'skill2', 'burst'] as const).flatMap((s) =>
    (ov[s] as any[]).filter((b) => (b.effects ?? []).some(pred))
  );
const isGrant = (stat: string, value: number) => (e: any) =>
  e.kind === 'buff' && e.stat === stat && e.value === value;
const retarget = (stat: string, value: number, target: any) =>
  patch((ov) => {
    for (const b of blocksWith(ov, isGrant(stat, value))) {
      b.target = target;
    }
  });
const retrigger = (stat: string, value: number, trigger: any) =>
  patch((ov) => {
    for (const b of blocksWith(ov, isGrant(stat, value))) {
      b.trigger = trigger;
    }
  });
const dropEffect = (pred: (e: any) => boolean) =>
  patch((ov) => {
    for (const s of ['skill1', 'skill2', 'burst'] as const) {
      ov[s] = (ov[s] as any[])
        .map((b) => ({
          ...b,
          effects: (b.effects ?? []).filter((e: any) => !pred(e)),
        }))
        .filter((b) => b.effects.length > 0);
    }
  });

/** Second fixture — liter (B1) / crown (B2) / rapunzel-sanctuary (B2) / marian-queen (B3, +Into the
 *  Fray status) / helm (B3, the SR/Water Helm — NOT helm-aquamarine), boss Fire: crown sits before
 *  her in slot order, so some chains are cast by crown and she sits those Full Bursts out. */
let TWO_B2: ReturnType<typeof twoB2Run> | undefined;
function twoB2Run() {
  const team = ['liter', 'crown', SLUG, 'marian-queen', 'helm'];
  const rap = team.indexOf(SLUG);
  const events: SimEvent[] = [];
  runComp({
    slugs: team,
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides: { 'marian-queen': marianInFray() },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return {
    casts: events
      .filter((e) => e.kind === 'burstCast' && e.unitIdx === rap)
      .map((e) => e.frame),
    fbStarts: events
      .filter((e) => e.kind === 'fullBurstStart')
      .map((e) => e.frame),
    mine: (stat: string, value: number) =>
      events.filter(
        (e): e is BuffApply =>
          e.kind === 'buffApply' &&
          e.casterIdx === rap &&
          e.stat === stat &&
          e.key.endsWith(`:${stat}:${value}`)
      ),
  };
}
const twoB2 = () => (TWO_B2 ??= twoB2Run());

let BASE: Run | undefined;
const base = () => (BASE ??= run());

// ---- fixture sanity ---------------------------------------------------------------------------
describe('fixture', () => {
  it('she shoots, casts her burst in several rotations, and Full Bursts happen', () => {
    const r = base();
    expect(r.shots.length).toBeGreaterThan(50);
    expect(r.casts.length).toBeGreaterThanOrEqual(3);
    expect(r.fbStarts.length).toBeGreaterThanOrEqual(3);
  });
});

// ---- L1: S1 full-charge heal to all allies -----------------------------------------------------
describe('L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled)', () => {
  it('the ally recovery probe fires on every one of her shot frames', () => {
    const r = base();
    const shotFrames = new Set(r.shots.map((s) => s.frame));
    const probeFrames = new Set(r.probe(REC_MARK).map((b) => b.frame));
    expect(shotFrames.size).toBeGreaterThan(50);
    for (const f of shotFrames) {
      expect(probeFrames.has(f), `no ally recovery at shot frame ${f}`).toBe(
        true
      );
    }
    // she is the fixture's only recovery source
    expect([...probeFrames].every((f) => shotFrames.has(f))).toBe(true);
  });

  it('COUNTERFACTUAL heal targets self only → the ally probe never fires', () => {
    const cf = run(
      patch((ov) => {
        for (const b of blocksWith(ov, (e) => e.kind === 'heal')) {
          b.target = { kind: 'self' };
        }
      })
    );
    expect(cf.probe(REC_MARK)).toHaveLength(0);
  });

  it('COUNTERFACTUAL heal dropped → the ally probe never fires', () => {
    const cf = run(dropEffect((e) => e.kind === 'heal'));
    expect(cf.probe(REC_MARK)).toHaveLength(0);
  });
});

// ---- L2 / L7: Full-Burst-entry grants to self + Into the Fray allies --------------------------
const FB_GRANTS: [string, string, number][] = [
  ['L2', 'attackDamagePct', 27.45],
  ['L7', 'casterAtkPct', 29.17],
];

for (const [id, stat, value] of FB_GRANTS) {
  describe(`${id} — entering Full Burst → self + Into the Fray allies: ${stat} ${value} for 10s`, () => {
    it('lands at EVERY Full Burst start on exactly {self, the Into the Fray ally}, 600f', () => {
      const r = base();
      const grants = r.mine(stat, value);
      const frames = byFrame(grants);
      expect([...frames.keys()].sort((a, b) => a - b)).toEqual(r.fbStarts);
      for (const holders of frames.values()) {
        expect(holders).toEqual([RAP, MARIAN]);
      }
      for (const g of grants) {
        expect(g.expiresFrame).toBe(g.frame + WIN);
      }
    });

    it('includes Full Bursts whose chain she did NOT cast in (a fullBurstEnter line, not burstCast)', () => {
      // two-B2 fixture: crown (slot before her) takes the stage-2 cast whenever it is ready
      const r = twoB2();
      const withoutHer = r.fbStarts.filter(
        (s) => !r.casts.some((c) => c <= s && s - c <= 120)
      );
      // the fixture must contain such Full Bursts, else this assertion is vacuous
      expect(withoutHer.length).toBeGreaterThan(0);
      const frames = new Set(r.mine(stat, value).map((g) => g.frame));
      for (const s of r.fbStarts) {
        expect(frames.has(s)).toBe(true);
      }
    });

    it('COUNTERFACTUAL target all allies → liter and folkwang also buffed', () => {
      const cf = run(retarget(stat, value, { kind: 'allies' }));
      const holders = new Set(cf.mine(stat, value).map((g) => g.targetIdx));
      expect(holders.has(LITER) || holders.has(FOLK)).toBe(true);
    });

    it('COUNTERFACTUAL target self → the Into the Fray ally is missed', () => {
      const cf = run(retarget(stat, value, { kind: 'self' }));
      const holders = new Set(cf.mine(stat, value).map((g) => g.targetIdx));
      expect(holders.has(MARIAN)).toBe(false);
    });

    it('COUNTERFACTUAL burstCast keying → grant frames are not the Full Burst starts', () => {
      const cf = run(retrigger(stat, value, { kind: 'burstCast' }));
      const frames = [...byFrame(cf.mine(stat, value)).keys()].sort(
        (a, b) => a - b
      );
      expect(frames).not.toEqual(cf.fbStarts);
    });
  });
}

describe('L7 — the grant is % of the SKILL USER’s ATK (casterAtkPct), not the target’s own ATK', () => {
  it('no atkPct 29.17 grant exists; COUNTERFACTUAL atkPct is distinguishable', () => {
    const r = base();
    expect(r.mine('atkPct', 29.17)).toHaveLength(0);
    const cf = run(
      patch((ov) => {
        for (const b of blocksWith(ov, isGrant('casterAtkPct', 29.17))) {
          for (const e of b.effects) {
            if (isGrant('casterAtkPct', 29.17)(e)) {
              e.stat = 'atkPct';
            }
          }
        }
      })
    );
    expect(cf.mine('casterAtkPct', 29.17)).toHaveLength(0);
  });
});

// ---- L4: charge-speed immunity -----------------------------------------------------------------
describe('L4 — immunity to charge-speed increase/decrease effects', () => {
  it('an ally-wide charge-speed buff lands on every ally but her', () => {
    const r = run(undefined, { chargeSpeed: true });
    const holders = new Set(
      r.buffs
        .filter((b) => b.stat === 'chargeSpeedPct' && b.value === CSPD_MARK)
        .map((b) => b.targetIdx)
    );
    expect(holders.has(LITER)).toBe(true);
    expect(holders.has(MARIAN)).toBe(true);
    expect(holders.has(RAP)).toBe(false);
  });

  it('COUNTERFACTUAL immunity removed → she receives it', () => {
    const cf = run(
      patch((ov) => {
        delete ov.charFixes;
      }),
      { chargeSpeed: true }
    );
    const holders = new Set(
      cf.buffs
        .filter((b) => b.stat === 'chargeSpeedPct' && b.value === CSPD_MARK)
        .map((b) => b.targetIdx)
    );
    expect(holders.has(RAP)).toBe(true);
  });
});

// ---- L8: full-charge additional damage ---------------------------------------------------------
describe('L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage', () => {
  it('exactly one skill2 220.7% hit per shot, on the shot frame', () => {
    const r = base();
    const hits = r.dmg.filter((d) => d.srcSlot === 'skill2');
    expect(hits.length).toBe(r.shots.length);
    for (const h of hits) {
      expect(h.atkPct).toBeCloseTo(220.7, 6);
      expect(h.bucket).toBe('skill');
      // plain "additional damage" — no core-strike wording, so not core-eligible
      expect(h.coreEligible).toBe(false);
    }
    expect(hits.map((h) => h.frame)).toEqual(r.shots.map((s) => s.frame));
  });

  it('COUNTERFACTUAL core-strike reading (core:true) → the rider becomes core-eligible', () => {
    const cf = run(
      patch((ov) => {
        for (const b of blocksWith(ov, (e) => e.kind === 'flatDamage')) {
          for (const e of b.effects) {
            e.core = true;
          }
        }
      })
    );
    const hits = cf.dmg.filter((d) => d.srcSlot === 'skill2');
    expect(hits.some((h) => h.coreEligible)).toBe(true);
  });

  it('COUNTERFACTUAL dropped → no skill2 damage', () => {
    const cf = run(dropEffect((e) => e.kind === 'flatDamage'));
    expect(cf.dmg.filter((d) => d.srcSlot === 'skill2')).toHaveLength(0);
  });
});

// ---- L9 / L11: burst caster-ATK to all allies --------------------------------------------------
describe('L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s', () => {
  it('lands on all four allies on EACH of her cast frames, 600f', () => {
    const r = base();
    const grants = r.mine('casterAtkPct', 34.84);
    const frames = byFrame(grants);
    expect([...frames.keys()].sort((a, b) => a - b)).toEqual(r.casts);
    for (const holders of frames.values()) {
      expect(holders).toEqual([LITER, RAP, MARIAN, FOLK]);
    }
    for (const g of grants) {
      expect(g.expiresFrame).toBe(g.frame + WIN);
    }
    // "Only one set of effects is applied": one grant per ally per cast, never a second branch
    expect(grants).toHaveLength(4 * r.casts.length);
  });

  it('the grant precedes the Full Burst it opens (cast frame < FB start)', () => {
    const r = base();
    for (const c of r.casts) {
      const fb = r.fbStarts.find((s) => s >= c);
      if (fb !== undefined) {
        expect(c).toBeLessThan(fb);
      }
    }
  });

  it('COUNTERFACTUAL fullBurstEnter keying → frames shift off her casts', () => {
    const cf = run(
      retrigger('casterAtkPct', 34.84, { kind: 'fullBurstEnter' })
    );
    const frames = [...byFrame(cf.mine('casterAtkPct', 34.84)).keys()];
    expect(frames.some((f) => cf.casts.includes(f))).toBe(false);
  });

  it('COUNTERFACTUAL both 34.84 branches encoded unconditionally → a second grant per ally per cast', () => {
    const cf = run(
      patch((ov) => {
        const b = blocksWith(ov, isGrant('casterAtkPct', 34.84))[0];
        ov.skill1 = [...ov.skill1, { ...b, slot: 'skill1' }];
      })
    );
    const all = cf.buffs.filter(
      (b) => b.casterIdx === RAP && b.key.endsWith(':casterAtkPct:34.84')
    );
    expect(all.length).toBeGreaterThan(4 * cf.casts.length);
  });

  it('COUNTERFACTUAL target self → allies not buffed', () => {
    const cf = run(retarget('casterAtkPct', 34.84, { kind: 'self' }));
    const holders = new Set(
      cf.mine('casterAtkPct', 34.84).map((g) => g.targetIdx)
    );
    expect([...holders]).toEqual([RAP]);
  });
});

// ---- L3 / L5 / L6 / L10: unreachable or defensive lines stay inert -----------------------------
describe('L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines', () => {
  it('L5: no shield event from her (the sim releases at full charge — never holds 1s)', () => {
    expect(base().probe(SHIELD_MARK)).toHaveLength(0);
  });

  it('COUNTERFACTUAL L5 shield keyed on fullCharge → the ally shielded probe fires', () => {
    const cf = run(
      patch((ov) => {
        ov.skill2 = [
          ...ov.skill2,
          {
            slot: 'skill2',
            trigger: { kind: 'fullCharge' },
            target: { kind: 'allies' },
            effects: [{ kind: 'shield', maxHpPct: 7.39 }],
          },
        ];
      })
    );
    expect(cf.probe(SHIELD_MARK).length).toBeGreaterThan(0);
  });

  it('L6/L10: no DEF grant and no once-per-battle 101.37% revive grant from her', () => {
    const r = base();
    const hers = r.buffs.filter((b) => b.casterIdx === RAP);
    expect(hers.some((b) => /def/i.test(b.stat))).toBe(false);
    expect(hers.some((b) => b.key.endsWith(':101.37'))).toBe(false);
  });

  it('L3: her burst cooldown never grows by 40s (consecutive casts < 80s apart)', () => {
    // liter (B1) shortens burst cooldowns, so even an 80s cooldown would land a little under 80s —
    // the discriminating arm is the cast-count counterfactual below
    const r = base();
    for (let i = 1; i < r.casts.length; i++) {
      expect(r.casts[i] - r.casts[i - 1]).toBeLessThan(80 * 60);
    }
  });

  it('COUNTERFACTUAL L3 +40s burst cooldown applied unconditionally → she casts fewer bursts', () => {
    // (liter's burst-cooldown reduction shortens both arms, so compare cast COUNTS, not gaps)
    const cf = run(
      patch((ov) => {
        ov.charFixes = { ...(ov.charFixes ?? {}), burstCooldownSec: 80 };
      })
    );
    expect(cf.casts.length).toBeLessThan(base().casts.length);
  });
});
