/**
 * makima (Makima) - SMG / Water / Defender / Burst II - BLIND kit spec (written from kit prose alone).
 *
 * Kit (structural read, short quotes):
 *   skill1  header: activation clause is being ATTACKED 20 times; scope: all allies
 *           -> Reload Speed up 36.96% for 10 sec; DEF up 14.78% for 10 sec
 *   skill2  header: after landing 120 normal attacks; scope: self -> Attract: Taunt 3 sec
 *   skill2  header: when taking lethal damage; scope: self -> indomitability 7 sec, 1x per battle,
 *           and Cooldown of Burst Skill down 11.58 sec
 *   burst   header: Affects self -> Gain Pierce for 10 sec; Recover 34.02% of attack damage as HP
 *           over 10 sec
 *   burst   header: Activates during indomitability -> Incoming healing up 41.02% for 10 sec
 *
 * Reading: this kit carries ZERO damage lines and ZERO offensive ally buffs. Everything that could
 * move damage is either (a) triggered by an event the v1 sim cannot produce (being attacked / taking
 * lethal damage - the scope-lock boss deals no damage to allies), or (b) a defensive stat the engine
 * documents as inert (defPct). The two live, modelable claims are: burst Pierce is a 10-SECOND
 * WINDOW (a gainPierce effect, NOT the whole-fight hasPierce flag), and the 11.58 sec burst-CDR is
 * GATED behind the lethal-damage/indomitability header, so it must never reach the rotation.
 *
 * Fixture: controlComp('makima', true) - makima is Burst II, so the comp B1 + B2 + B3 chain is what
 * makes her burst castable at all, and the second B3 (helm) is kept so full bursts actually fire.
 * Deterministic (no seed). Six hoisted 180s runs.
 *
 * Why the assertions discriminate:
 *   - strip skill2 + burst, expect identical totals -> RED if the taunt / indomitability / lifesteal /
 *     CDR lines were modeled as reachable damage or rotation effects. Nearest-wrong models: reading
 *     'Recover 34.02% of attack damage as HP' as a damage rider (it is lifesteal), or hanging the
 *     11.58 sec CDR off a passive / burstCast trigger instead of the unreachable lethal-damage one.
 *   - strip skill1, expect identical totals -> RED if the attacked-20-times reload-speed grant was
 *     given an INVENTED cadence (passive / interval). Reload speed IS damage (it gates shots fired),
 *     so this is the one line where a blind author can silently buff the whole team off a trigger the
 *     sim cannot produce and nobody has measured.
 *   - three sensitivity probes prove the fixture WOULD detect each wrong model, so the equality
 *     assertions above are not vacuous.
 *   - structural asserts on the committed override catch inert-but-wrong encodings (whole-fight
 *     hasPierce, a burst block keyed to fullBurstEnter instead of burstCast) that no total can see at
 *     scope lock because no unit in the comp carries a Pierce Damage buff.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'makima';
type AnyRec = Record<string, any>;

// The override file is slot-keyed; a slot is either a bare Block[] or a CharacterSkills carrying its
// own blocks[]. Handle both so no counterfactual depends on which shape the loader hands back.
function slotBlocks(ov: AnyRec, slot: string): AnyRec[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? (s as AnyRec[]) : ((s.blocks as AnyRec[]) ?? []);
}

function setSlotBlocks(ov: AnyRec, slot: string, blocks: AnyRec[]): void {
  const s = ov?.[slot];
  if (s && !Array.isArray(s)) {
    s.blocks = blocks;
  } else {
    ov[slot] = blocks;
  }
}

function run(opts: AnyRec) {
  const events: SimEvent[] = [];
  const cfg = {
    ...((opts.cfg as AnyRec) ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  const res = runComp({ ...opts, cfg } as never);
  return { res, events, tot: totals(res) as Record<string, number> };
}

function withMakima(mutate: (ov: AnyRec) => void) {
  const opts = controlComp(SLUG, true) as unknown as AnyRec;
  return {
    ...opts,
    overrides: {
      ...((opts.overrides as AnyRec) ?? {}),
      [SLUG]: withPatchedOverride(SLUG, (ov) =>
        mutate(ov as unknown as AnyRec)
      ),
    },
  };
}

const committed = withPatchedOverride(SLUG, () => {}) as unknown as AnyRec;
const burstSlotBlocks = slotBlocks(committed, 'burst');
const allBlocks = [
  ...slotBlocks(committed, 'skill1'),
  ...slotBlocks(committed, 'skill2'),
  ...burstSlotBlocks,
];
const allEffects = allBlocks.flatMap((b) => (b.effects as AnyRec[]) ?? []);

// ---- hoisted runs (6 x 180s) ----
const base = run(controlComp(SLUG, true) as unknown as AnyRec);

const noS2B = run(
  withMakima((ov) => {
    setSlotBlocks(ov, 'skill2', []);
    setSlotBlocks(ov, 'burst', []);
    delete ov.hasPierce;
  })
);

const noS1 = run(
  withMakima((ov) => {
    setSlotBlocks(ov, 'skill1', []);
  })
);

const cdrProbe = run(
  withMakima((ov) => {
    setSlotBlocks(ov, 'skill2', [
      ...slotBlocks(ov, 'skill2'),
      {
        slot: 'skill2',
        trigger: { kind: 'passive' },
        target: { kind: 'allies' },
        effects: [{ kind: 'burstCdr', seconds: 11.58 }],
      },
    ]);
  })
);

const shotProbe = run(
  withMakima((ov) => {
    setSlotBlocks(ov, 'skill2', [
      ...slotBlocks(ov, 'skill2'),
      {
        slot: 'skill2',
        trigger: { kind: 'shotFired' },
        target: { kind: 'enemy' },
        effects: [{ kind: 'flatDamage', atkPct: 34.02 }],
      },
    ]);
  })
);

const burstProbe = run(
  withMakima((ov) => {
    setSlotBlocks(ov, 'burst', [
      ...slotBlocks(ov, 'burst'),
      {
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'enemy' },
        effects: [{ kind: 'flatDamage', atkPct: 400 }],
      },
    ]);
  })
);

const buffs = base.events.filter(
  (e) => (e as unknown as AnyRec).kind === 'buffApply'
) as unknown as AnyRec[];
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const othersOf = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).filter(([k]) => k !== SLUG));

const KIT_MAGNITUDES = [36.96, 14.78, 34.02, 41.02, 11.58];
const OFFENSIVE_STATS = [
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
  'attackDamagePct',
  'critRatePct',
  'critRateNormalPct',
  'critDamagePct',
  'coreDamagePct',
  'elementDamagePct',
  'chargeDamagePct',
  'chargeDamageMultPct',
  'chargeSpeedPct',
  'sustainedDamagePct',
  'sequentialDamagePct',
  'sequentialMultPct',
  'trueDamagePct',
  'elemAdvantageDamagePct',
  'normalAttackPct',
  'extraHitDamagePct',
  'attackSpeedPct',
  'fireRatePct',
  'maxAmmoPct',
  'maxAmmoFlat',
  'burstGenPct',
  'hitRatePct',
  'damageTakenPct',
];

describe('makima - fixture sanity', () => {
  it('makima fires her SMG in the control comp (runs are non-empty)', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('the fixture would DETECT invented makima damage (sensitivity probe)', () => {
    // a per-shot flatDamage rider is the nearest-wrong reading of the 34.02% lifesteal line
    expect(shotProbe.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });

  it('the fixture actually casts the makima burst (non-vacuity for burst-slot lines)', () => {
    // a burstCast-triggered hit only lands if she reaches burst stage II in this comp; if this is
    // RED the burst-slot assertions below prove nothing and the fixture needs a different comp
    expect(burstProbe.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });

  it('the fixture would DETECT an active burst-cooldown reduction (sensitivity probe)', () => {
    expect(cdrProbe.tot).not.toEqual(base.tot);
  });
});

describe('makima - the kit carries no damage lines', () => {
  it('no damage-dealing effect kind appears anywhere in the override', () => {
    const dmgKinds = [
      'flatDamage',
      'dot',
      'hitRepeat',
      'storedHit',
      'stackedNuke',
    ];
    const found = allEffects
      .filter((e) => dmgKinds.includes(e.kind as string))
      .map((e) => `${e.slot ?? ''}:${e.kind}`);
    // nearest-wrong: Recover 34.02% of attack damage as HP read as a damage rider instead of lifesteal
    expect(found).toEqual([]);
  });

  it('skill2 + burst move damage for nobody at scope lock', () => {
    // taunt (no aggro model), indomitability (nothing takes lethal damage), the 10s lifesteal (no HP
    // pool), the 11.58s CDR (gated behind indomitability) and the Pierce window (no ally carries a
    // Pierce Damage buff) are ALL damage-inert here. Stripping them must be byte-identical.
    expect(noS2B.tot).toEqual(base.tot);
  });
});

describe('makima - burst Pierce is a timed window, not a whole-fight flag', () => {
  it('does not set the static whole-fight hasPierce flag', () => {
    // hasPierce tags EVERY shot for the full 180s; the kit grants Pierce for 10 sec off her burst
    expect(committed.hasPierce).not.toBe(true);
  });

  it('grants Pierce via a 10-second gainPierce effect on a burst-cast self block', () => {
    const gainers = burstSlotBlocks.filter((b) =>
      ((b.effects as AnyRec[]) ?? []).some((e) => e.kind === 'gainPierce')
    );
    expect(gainers.length).toBeGreaterThan(0);
    for (const b of gainers) {
      expect(b.slot).toBe('burst');
      expect((b.target as AnyRec)?.kind).toBe('self');
      // burst-cast, NOT fullBurstEnter: this comp holds a second Burst II unit, so a
      // fullBurstEnter key would grant Pierce on rotations makima never bursts (over-credit)
      expect((b.trigger as AnyRec)?.kind).toBe('burstCast');
    }
    for (const e of allEffects.filter((x) => x.kind === 'gainPierce')) {
      expect(e.durationSec).toBe(10);
    }
  });
});

describe('makima - the 11.58s burst-CDR is gated, never unconditional', () => {
  it('no burstCdr effect rides a trigger the sim can reach', () => {
    const reachable = [
      'passive',
      'burstCast',
      'fullBurstEnter',
      'fullBurstEnd',
      'shotFired',
      'lastBullet',
      'hitCount',
      'interval',
      'stageEnter',
      'teamAmmo',
      'chargeCounter',
      'bossElement',
    ];
    const cdrBlocks = allBlocks.filter((b) =>
      ((b.effects as AnyRec[]) ?? []).some((e) => e.kind === 'burstCdr')
    );
    // the CDR sits under the taking-lethal-damage header; at scope lock nobody takes damage, so a
    // reachable trigger would shorten every rotation and silently add full bursts
    for (const b of cdrBlocks) {
      expect(reachable).not.toContain((b.trigger as AnyRec)?.kind);
    }
  });
});

describe('makima - skill1 (attacked 20 times) is inert at scope lock', () => {
  it('stripping skill1 changes nobody', () => {
    // THE DIVERGENCE PROBE. DEF is engine-inert, but Reload Speed 36.96% to ALL allies IS damage
    // (it gates shots fired). Its trigger - being attacked 20 times - cannot occur in v1 (the boss
    // deals no damage), so any uptime for it is an INVENTED cadence, not a measured one. RED here
    // means the reload buff was modeled on a passive/interval stand-in and the whole team is being
    // buffed off an unmeasurable trigger.
    expect(noS1.tot).toEqual(base.tot);
  });

  it('teammates in particular are untouched by makima skill1', () => {
    expect(othersOf(noS1.tot)).toEqual(othersOf(base.tot));
  });
});

describe('makima - stat mapping (no defensive line leaks into an offensive stat)', () => {
  it('no kit magnitude appears under an offensive stat', () => {
    const bad = buffs
      .filter(
        (b) =>
          OFFENSIVE_STATS.includes(b.stat as string) &&
          KIT_MAGNITUDES.some((v) => near(b.value as number, v))
      )
      .map((b) => `${b.stat}=${b.value}`);
    // classic nearest-wrong: Reload Speed up 36.96% encoded as attackSpeedPct or fireRatePct
    expect(bad).toEqual([]);
  });

  it('the reload and DEF magnitudes are not swapped', () => {
    expect(
      buffs.filter(
        (b) => b.stat === 'reloadSpeedPct' && near(b.value as number, 14.78)
      )
    ).toEqual([]);
    expect(
      buffs.filter((b) => b.stat === 'defPct' && near(b.value as number, 36.96))
    ).toEqual([]);
  });

  it('the lifesteal and incoming-healing magnitudes emit no stat buff at all', () => {
    // 34.02% is HP recovery and 41.02% is Incoming Healing - neither has a StatKey; emitting either
    // as a buff means a healing line was converted into a stat the engine consumes
    const leaked = buffs
      .filter(
        (b) => near(b.value as number, 34.02) || near(b.value as number, 41.02)
      )
      .map((b) => `${b.stat}=${b.value}`);
    expect(leaked).toEqual([]);
  });

  it('if skill1 is modeled at all, its grants are ALL-ALLY scoped at the kit magnitudes', () => {
    const reload = buffs.filter(
      (b) => b.stat === 'reloadSpeedPct' && near(b.value as number, 36.96)
    );
    const def = buffs.filter(
      (b) => b.stat === 'defPct' && near(b.value as number, 14.78)
    );
    for (const group of [reload, def]) {
      if (group.length === 0) {
        continue;
      }
      const targets = new Set(group.map((b) => b.targetSlug as string));
      // Affects all allies - a self-only encoding would be a scope error
      expect(targets.size).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('makima - unmodelable kit lines (documented gaps)', () => {
  it.skip('skill1 fires on the 20th incoming attack - no incoming-attack trigger primitive exists, and the scope-lock boss deals no damage to allies', () => {});

  it.skip('skill2 Attract/Taunt for 3 sec - no taunt primitive and no boss aggro model; the hitCount 120 trigger itself is expressible but its payload is not', () => {});

  it.skip('skill2 indomitability 7 sec, 1x per battle - triggered by taking lethal damage, which cannot occur in v1', () => {});

  it.skip('burst Recover 34.02% of attack damage as HP over 10 sec - no HP pool; the only observable payload would be recovery events for an on-heal consumer, and no comp unit here consumes them', () => {});

  it.skip('burst Incoming healing up 41.02% during indomitability - no StatKey for incoming healing, and the indomitability gate is unreachable', () => {});
});
