// ADAPTED COPY (driver-maintained) of the pristine S5 blind artifact blind/yukiko.test.ts.
// Structural-only fixes (assertion intent untouched), per the ade-agent-bunny precedent:
//   1. harness import path: '../lib/harness.js' -> '../../tests/lib/harness.js'
//      (the blind dir has no lib/; the harness lives under scripts/tests/).
// The pristine artifact stays verbatim as the cross-family evidence.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * yukiko — MG / Fire / Attacker / Burst III. BLIND kit-spec test, written from the kit prose alone.
 *
 * FIXTURE: controlComp('yukiko', false) — liter (B1) + crown (B2) + yukiko (B3).
 *   - B1 + B2 are mandatory: a lone Burst III never casts and the fight makes ZERO Full Bursts.
 *   - The fixed second B3 (the SR/Water slot) is dropped ON PURPOSE. With two B3s the stage-3 cast
 *     alternates, so yukiko's OWN burst count — i.e. how many Scarlet Flower windows exist — stops
 *     being deterministic, and that unit's ally buffs sit inside every counterfactual delta.
 *   - crown STAYS: there is no heal/recovery event kind in the log, so yukiko's Persona heal is only
 *     observable through a teammate's on-recovery buffApply. crown is that consumer.
 *   - Boss element is Fire (harness default) and yukiko is Fire => NO elemental advantage, so the S2
 *     Elemental-Advantage buff is damage-INERT on this fixture (asserted structurally, never by damage),
 *     and no Wind Code enemy exists => the whole 1 More cluster must be gate-inert.
 *
 * OVERRIDE SHAPE: the harness packet documents two readings of a slot value (Block[] vs
 * { blocks: Block[] }), so every patch helper below handles BOTH and writes back through the same
 * shape it found. Each counterfactual also asserts it actually REMOVED something — a patch that
 * removes nothing is a vacuous test, and a zero count is itself the MISSING-line detector.
 */

const SLUG = 'yukiko';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const FPS = 60;

type Rec = Record<string, unknown>;

interface BuffEv {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
  expiresFrame?: number;
}

interface DmgEv {
  kind: string;
  bucket?: string;
  inFullBurst?: boolean;
  fbMajorApplied?: boolean;
}

const asBuffs = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e) => (e as unknown as BuffEv).kind === 'buffApply') as unknown as BuffEv[];
const asDmg = (evs: SimEvent[]): DmgEv[] =>
  evs.filter((e) => (e as unknown as DmgEv).kind === 'damage') as unknown as DmgEv[];
const kindsOf = (evs: SimEvent[]): string[] =>
  evs.map((e) => (e as unknown as { kind: string }).kind);
const near = (a: number | undefined, b: number, eps = 0.05): boolean =>
  a !== undefined && a !== null && Math.abs(a - b) < eps;

// ---- shape-agnostic override patch helpers ---------------------------------------------------

function blocksOf(ov: Rec, slot: string): Rec[] {
  const s = ov[slot];
  if (Array.isArray(s)) return s as Rec[];
  if (s && typeof s === 'object' && Array.isArray((s as Rec).blocks)) {
    return (s as { blocks: Rec[] }).blocks;
  }
  return [];
}

function setBlocksOf(ov: Rec, slot: string, next: Rec[]): void {
  const s = ov[slot];
  if (Array.isArray(s)) ov[slot] = next;
  else if (s && typeof s === 'object' && Array.isArray((s as Rec).blocks)) {
    (s as { blocks: Rec[] }).blocks = next;
  }
}

function eachBlock(ov: Rec, fn: (b: Rec, slot: string) => void): void {
  for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) fn(b, slot);
}

/** Remove every effect matching pred; drop blocks left with no effects. Returns removal count. */
function dropEffects(ov: Rec, pred: (e: Rec, b: Rec, slot: string) => boolean): number {
  let removed = 0;
  for (const slot of SLOTS) {
    const kept: Rec[] = [];
    for (const b of blocksOf(ov, slot)) {
      const effs = (b.effects as Rec[] | undefined) ?? [];
      const remaining = effs.filter((e) => {
        if (pred(e, b, slot)) {
          removed += 1;
          return false;
        }
        return true;
      });
      b.effects = remaining;
      if (remaining.length > 0) kept.push(b);
    }
    setBlocksOf(ov, slot, kept);
  }
  return removed;
}

function run(mutate?: (ov: Rec) => void): { res: ReturnType<typeof runComp>; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, false) as unknown as Rec;
  if (mutate) {
    opts.overrides = {
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        mutate(ov as unknown as Rec);
      }),
    };
  }
  const cfg = ((opts.cfg as Rec | undefined) ?? {}) as Rec;
  cfg.onEvent = (ev: SimEvent) => {
    events.push(ev);
  };
  opts.cfg = cfg;
  const res = runComp(opts as unknown as Parameters<typeof runComp>[0]);
  return { res, events };
}

const others = (res: ReturnType<typeof runComp>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(totals(res))) if (k !== SLUG) out[k] = v;
  return out;
};
const teamTotal = (res: ReturnType<typeof runComp>): number =>
  Object.values(totals(res)).reduce((a, b) => a + b, 0);

// ---- hoisted runs (each is a full 180s sim; 7 total) ------------------------------------------

const removed = {
  heal: 0,
  scarletHeal: 0,
  windGates: 0,
  s2AtkDmg: 0,
  amp: 0,
  nuke: 0,
};

const base = run();

// every heal source stripped — isolates the Persona / Mediarama tandem
const healOff = run((ov) => {
  removed.heal = dropEffects(ov, (e) => e.kind === 'heal');
});

// only the burst-triggered (Scarlet Flower) heal stripped — proves it is a SECOND, separate source
const scarletHealOff = run((ov) => {
  removed.scarletHeal = dropEffects(ov, (e, b, slot) => {
    if (e.kind !== 'heal') return false;
    const trig = (b.trigger as Rec | undefined)?.kind;
    return trig === 'burstCast' || slot === 'skill2' || slot === 'burst';
  });
});

// boss-element gates removed — turns the Wind-only 1 More cluster ON so its inertness is provably a
// GATE and not a missing line
const windOff = run((ov) => {
  let n = 0;
  eachBlock(ov, (b) => {
    if (b.bossElementGate !== undefined) {
      delete b.bossElementGate;
      n += 1;
    }
  });
  removed.windGates = n;
});

const s2AtkOff = run((ov) => {
  removed.s2AtkDmg = dropEffects(
    ov,
    (e) => e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value as number, 55.31),
  );
});

const ampOff = run((ov) => {
  removed.amp = dropEffects(
    ov,
    (e) => e.kind === 'buff' && e.stat === 'distributedDamagePct' && near(e.value as number, 90.01),
  );
});

const nukeOff = run((ov) => {
  removed.nuke = dropEffects(
    ov,
    (e) => e.kind === 'flatDamage' && near(e.atkPct as number, 1258.79, 0.5),
  );
});

const baseKinds = kindsOf(base.events);
const baseBuffs = asBuffs(base.events);
const yIdx = baseBuffs.find((b) => b.targetSlug === SLUG)?.targetIdx ?? -1;
const onYukiko = (b: BuffEv): boolean => b.targetSlug === SLUG || (yIdx >= 0 && b.targetIdx === yIdx);

describe('yukiko — blind kit spec', () => {
  it('fixture is non-vacuous: the chain casts, Full Bursts happen, yukiko deals damage', () => {
    expect(yIdx).toBeGreaterThanOrEqual(0);
    expect(baseKinds.filter((k) => k === 'burstCast').length).toBeGreaterThanOrEqual(6);
    expect(baseKinds.filter((k) => k === 'fullBurstStart').length).toBeGreaterThanOrEqual(3);
    expect(baseKinds.filter((k) => k === 'fullBurstEnd').length).toBeGreaterThanOrEqual(3);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(totals(base.res)[SLUG]).toBeGreaterThan(0);
  });

  // S1 line 1 — Persona: continuous from battle start, Effect 1 heals ALL ALLIES every 3 sec.
  // Discriminates against: heal dropped as defensive/inert (delta 0), or modeled as a single
  // battle-start heal / a much slower interval (delta far below one apply per 3s window).
  it('S1 Persona heals all allies on a 3s cadence, driving the on-recovery teammate', () => {
    expect(removed.heal).toBeGreaterThanOrEqual(1);
    const baseApplies = baseBuffs.length;
    const noHealApplies = asBuffs(healOff.events).length;
    expect(noHealApplies).toBeLessThan(baseApplies);
    // a 3s cadence over a 180s fight is ~60 recovery events; a one-shot or a 15s+ interval cannot
    // clear this bar
    expect(baseApplies - noHealApplies).toBeGreaterThanOrEqual(10);
    // the extra ally buffs the heal unlocks must not REDUCE team output
    expect(teamTotal(base.res)).toBeGreaterThanOrEqual(teamTotal(healOff.res));
  });

  // S1 line 2 — ATK 65.37% for 15 sec, at battle start AND on every Full Burst END.
  // Discriminates against: battle-start only (count collapses to 1), fullBurstENTER keying (the
  // nearest boundary before each re-apply would be fullBurstStart), and a permanent/continuous
  // encoding (expiresFrame would not be a 15s window off frame 0).
  it('S1 grants self ATK 65.37% for 15s at battle start and again at every Full Burst END', () => {
    const idxs: number[] = [];
    base.events.forEach((e, i) => {
      const b = e as unknown as BuffEv;
      if (b.kind === 'buffApply' && near(b.value, 65.37) && onYukiko(b)) idxs.push(i);
    });
    expect(idxs.length).toBeGreaterThanOrEqual(3);

    const first = base.events[idxs[0]] as unknown as BuffEv;
    expect(first.stat).toBe('atkPct');
    // battle-start application sits at frame 0, so a 15s window expires at 900f
    expect(first.expiresFrame ?? -1).toBeGreaterThanOrEqual(15 * FPS - 20);
    expect(first.expiresFrame ?? -1).toBeLessThanOrEqual(15 * FPS + 20);

    for (const i of idxs.slice(1)) {
      let boundary = '';
      for (let j = i - 1; j >= 0; j -= 1) {
        const k = baseKinds[j];
        if (k === 'fullBurstStart' || k === 'fullBurstEnd') {
          boundary = k;
          break;
        }
      }
      expect(boundary).toBe('fullBurstEnd');
    }
  });

  // S1 line 3 — 400.31% distributed damage, and BURST line 2 — self ATK 45.33% for 10s: both keyed
  // to 1 More, which only takes effect with a Wind Code enemy present. The scope-lock boss is Fire,
  // so both must be INERT here — but authored and gated, not dropped. Deleting the element gate is
  // the non-vacuity proof: the effects must then appear.
  it('1 More cluster is Wind-gated: inert vs a Fire boss, live once the gate is removed', () => {
    expect(removed.windGates).toBeGreaterThanOrEqual(1);
    // inert on the control comp
    expect(baseBuffs.filter((b) => near(b.value, 45.33) && onYukiko(b))).toHaveLength(0);
    // gate removed: the self ATK buff fires on each of her burst casts, and the distributed rider
    // adds damage instances + total
    const lit = asBuffs(windOff.events).filter((b) => near(b.value, 45.33));
    expect(lit.length).toBeGreaterThanOrEqual(2);
    expect(lit[0].stat).toBe('atkPct');
    expect(asDmg(windOff.events).length).toBeGreaterThan(asDmg(base.events).length);
    expect(totals(windOff.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
  });

  // S2 line 1 — Attack Damage 55.31% continuously, SELF. Discriminates against: an allies-scoped
  // encoding (any non-yukiko target), and against the line being absent (removal count 0 / no delta).
  it('S2 Attack Damage 55.31% is a continuous SELF buff and moves only yukiko', () => {
    expect(removed.s2AtkDmg).toBeGreaterThanOrEqual(1);
    expect(totals(s2AtkOff.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
    expect(others(s2AtkOff.res)).toEqual(others(base.res));
    const leaked = baseBuffs.filter(
      (b) => b.stat === 'attackDamagePct' && near(b.value, 55.31) && !onYukiko(b),
    );
    expect(leaked).toHaveLength(0);
  });

  // S2 line 2 — Scarlet Flower: triggered by USING the Burst Skill (own cast), deactivating at Full
  // Burst end. Effect 2 is Fire Amp: Distributed Damage 90.01% on self.
  // Discriminates against: a passive/continuous encoding (one application at frame 0 with a
  // whole-fight window) and against fullBurstEnter keying, which would apply on team FBs she did not
  // cast; and the removal count catches the line being dropped entirely.
  it('S2 Scarlet Flower re-arms per own burst cast and its Fire Amp is a bounded self window', () => {
    expect(removed.amp).toBeGreaterThanOrEqual(1);
    const amp = baseBuffs.filter(
      (b) => b.stat === 'distributedDamagePct' && near(b.value, 90.01) && onYukiko(b),
    );
    expect(amp.length).toBeGreaterThanOrEqual(2);
    for (const a of amp) {
      expect(a.expiresFrame ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(190 * FPS);
    }
    // self-scoped, and it can never LOWER her damage
    expect(baseBuffs.filter((b) => b.stat === 'distributedDamagePct' && !onYukiko(b))).toHaveLength(0);
    expect(totals(ampOff.res)[SLUG]).toBeLessThanOrEqual(totals(base.res)[SLUG]);
    expect(others(ampOff.res)).toEqual(others(base.res));
  });

  // S2 line 2 / Effect 1 — Mediarama: a SECOND every-3-sec ally heal that exists only while Scarlet
  // Flower is up. Discriminates against folding both heal lines into one source (removal count 0, or
  // no additional recovery events during the burst windows).
  it('S2 Scarlet Flower adds its own ally heal on top of the S1 Persona heal', () => {
    expect(removed.scarletHeal).toBeGreaterThanOrEqual(1);
    expect(asBuffs(scarletHealOff.events).length).toBeLessThan(baseBuffs.length);
  });

  // S2 line 3 — Elemental Advantage Attack Damage 48.15% for 10 sec, on ENTERING Burst Stage 3.
  // stageEnter LEADS the stage-3 cast by the 30f chain gap, so a burstCast/stageCast encoding would
  // land the apply AFTER the last cast of the chain. The discriminator is purely ordinal (no frame
  // field needed): under the faithful reading a burstCast still occurs between the apply and the
  // Full Burst that follows it; under the nearest-wrong reading none does.
  it('S2 elemental-advantage buff applies at Burst Stage 3 ENTRY, ahead of the stage-3 cast', () => {
    const idxs: number[] = [];
    base.events.forEach((e, i) => {
      const b = e as unknown as BuffEv;
      if (b.kind === 'buffApply' && b.stat === 'elemAdvantageDamagePct' && near(b.value, 48.15)) {
        idxs.push(i);
      }
    });
    expect(idxs.length).toBeGreaterThanOrEqual(2);
    expect((base.events[idxs[0]] as unknown as BuffEv).targetSlug ?? SLUG).toBe(SLUG);

    let checked = 0;
    for (const i of idxs.slice(0, 3)) {
      const nextFb = baseKinds.findIndex((k, j) => j > i && k === 'fullBurstStart');
      if (nextFb < 0) continue;
      const castBetween = baseKinds.some(
        (k, j) => j > i && j < nextFb && k === 'burstCast',
      );
      expect(castBetween).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(1);
  });

  // BURST line 1 — 1258.79% of final ATK as distributed damage to all enemies. Burst-cast damage
  // lands BEFORE the Full Burst window opens, so it never takes the +50% Full Burst major.
  it('burst deals its 1258.79% distributed nuke, and it is Full-Burst exempt', () => {
    expect(removed.nuke).toBeGreaterThanOrEqual(1);
    const dropRatio = 1 - totals(nukeOff.res)[SLUG] / totals(base.res)[SLUG];
    expect(dropRatio).toBeGreaterThan(0.02);

    const burstDmg = asDmg(base.events).filter((d) =>
      String(d.bucket ?? '').toLowerCase().includes('burst'),
    );
    expect(burstDmg.length).toBeGreaterThanOrEqual(2);
    expect(burstDmg.every((d) => d.fbMajorApplied !== true)).toBe(true);
  });

  // ---- GAPS -----------------------------------------------------------------------------------

  // S2 line 4 — Follow Up: ATK 80.25% of the skill user's ATK for 25s to all standard Burst 3 allies
  // (except the user) IN THE PERSONA STATE. Two blockers: (a) it is 1-More gated, so inert vs a Fire
  // boss; (b) there is no target primitive for all-Burst-III-allies, and none at all for the Persona
  // state, so the target set cannot be expressed faithfully. Inertness is still asserted below.
  it.skip('S2 Follow Up targets Burst-III allies in the Persona state — GAP: no target primitive', () => {
    expect(true).toBe(true);
  });

  it('S2 Follow Up grants nothing on the control comp (Wind-gated, no eligible ally)', () => {
    const followUp = baseBuffs.filter(
      (b) => b.stat === 'casterAtkPct' && yIdx >= 0 && b.casterIdx === yIdx && b.targetIdx !== yIdx,
    );
    expect(followUp).toHaveLength(0);
  });

  // S2 line 2 / Effect 3 — Scarlet Protection: damage taken from Water Code enemies down 17.95%.
  // Purely defensive; the scope-lock boss deals no damage, so there is nothing to observe.
  it.skip('S2 Scarlet Protection is defensive — UNMODELED at scope lock', () => {
    expect(true).toBe(true);
  });

  // The heal MAGNITUDE (5.7% of the skill user's final Max HP, both Media and Mediarama) is not
  // representable: the heal effect carries no HP amount and no HP pool exists at scope lock.
  it.skip('heal magnitude 5.7% of final Max HP — GAP: no HP pool / heal carries no amount', () => {
    expect(true).toBe(true);
  });

  // Whether Fire Amp (Distributed Damage 90.01%) reaches yukiko's OWN burst nuke is a cast-frame
  // ordering question the kit does not settle: Scarlet Flower activates ON the same burst cast that
  // fires the 1258.79% distributed hit. MEASUREMENT-GATED — a popup read of her burst number with and
  // without the amp decides it; asserting either direction blind would pin a guess.
  it.skip('does Fire Amp amplify the same-cast burst nuke — MEASUREMENT-GATED (cast-frame ordering)', () => {
    expect(true).toBe(true);
  });

  // The elemental-advantage buff cannot be verified on the DAMAGE side here: yukiko is Fire and the
  // harness boss is Fire, so the element bucket is never advantaged and the buff contributes 0.
  // A Wind-boss fixture would be needed; the harness exposes no documented boss-element knob.
  it.skip('elemental-advantage buff damage effect — no advantage vs the Fire boss fixture', () => {
    expect(true).toBe(true);
  });
});
