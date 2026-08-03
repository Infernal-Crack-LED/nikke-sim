/**
 * claire (Claire) — RL / Electric / Supporter / Burst I, cd 40s, ammo 6, reload 141f, charge 60f.
 *
 * BLIND kit spec test — written from the kit prose ALONE (no sight of the shipped override).
 *
 * WHAT THE KIT SAYS
 *   skill1 — trigger: landing 3 Full Charge attacks; target: the 2 allies with the HIGHEST FINAL ATK;
 *            effect: recover 2.86% of the SKILL USER's final Max HP as HP.
 *   skill2 — trigger: using Burst Skill (this unit's OWN burst cast); target: all allies;
 *            effect: Shield = 10.13% of the SKILL USER's final Max HP, for 10 sec.
 *   burst  — trigger: own burst cast; target: all allies;
 *            effects: restore 34.35% of the SKILL USER's final Max HP; remove 1 debuff.
 *
 * Claire carries ZERO damage lines, ZERO stat buffs and ZERO weapon-economy lines. Her entire kit is
 * heal + shield + cleanse, so the faithfulness surface is mostly STRUCTURAL (trigger identity, target
 * set, magnitude, primitive choice) plus behavioural inertness. The documented cfg.onEvent kinds carry
 * no heal/shield event, so the sim-side checks are written as counterfactuals that stay valid whether or
 * not a teammate consumes the heal/shield — crown's "when recovery takes effect" and any `shielded`
 * trigger fire on the EVENT, never on its magnitude, so a 10x magnitude scale must be damage-identical.
 *
 * FIXTURE: controlComp('claire', true) — liter B1 / crown B2 / claire (carry, focus) / helm B3, so the
 * burst chain actually completes (a lone unit makes ZERO Full Bursts). Deterministic, no seed. 4 runs.
 *
 * WHY EACH ASSERTION DISCRIMINATES — per-test comments below; every structural test names the
 * nearest-wrong model it goes RED under.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

/**
 * The harness documentation describes two mutually exclusive override-file shapes:
 * slot -> Block[] and slot -> { blocks: Block[] }. Both agree there is NO top-level `blocks`.
 * These helpers read/write either shape, so the spec tests kit SEMANTICS, not the container.
 */
function getBlocks(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s;
  }
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function setBlocks(ov: any, slot: Slot, blocks: any[]): void {
  const s = ov?.[slot];
  if (s && !Array.isArray(s) && Array.isArray(s.blocks)) {
    s.blocks = blocks;
  } else {
    ov[slot] = blocks;
  }
}
function effectsOf(blocks: any[]): any[] {
  const out: any[] = [];
  const walk = (e: any): void => {
    out.push(e);
    if (Array.isArray(e?.steps)) {
      e.steps.forEach(walk);
    }
  };
  for (const b of blocks) {
    for (const e of b?.effects ?? []) {
      walk(e);
    }
  }
  return out;
}
function deepNumbers(x: any, out: number[] = []): number[] {
  if (typeof x === 'number') {
    out.push(x);
  } else if (Array.isArray(x)) {
    for (const v of x) {
      deepNumbers(v, out);
    }
  } else if (x && typeof x === 'object') {
    for (const v of Object.values(x)) {
      deepNumbers(v, out);
    }
  }
  return out;
}
function hasMagnitude(x: any, v: number): boolean {
  return deepNumbers(x).some((n) => Math.abs(n - v) < 1e-6);
}
/** Every prose string the override carries (unmodeled record, in either shape, plus the note). */
function proseOf(ov: any): string[] {
  const out: string[] = [];
  const push = (u: any): void => {
    if (u && typeof u === 'object') {
      for (const v of Object.values(u)) {
        if (Array.isArray(v)) {
          out.push(...v.filter((s): s is string => typeof s === 'string'));
        }
      }
    }
  };
  push(ov?.unmodeled);
  for (const s of SLOTS) {
    push(ov?.[s]?.unmodeled);
  }
  if (typeof ov?.note === 'string') {
    out.push(ov.note);
  }
  return out;
}
/** Any magnitude-carrying scalar field an effect might use for a heal / shield / stat value. */
const MAG_FIELDS = [
  'maxHpPct',
  'hpPct',
  'pct',
  'value',
  'atkPct',
  'healPct',
  'amount',
];

/** Max-HP GRANTS that reached the sim, as a stable fingerprint (targetSlug:value, sorted). */
function hpGrantFingerprint(events: SimEvent[]): string[] {
  return (events as any[])
    .filter((e) => e.kind === 'buffApply' && e.stat === 'maxHpFlat')
    .map((e) => String(e.targetSlug) + ':' + String(e.value))
    .sort();
}

const OV: any = withPatchedOverride('claire', () => undefined);

interface Run {
  res: any;
  events: SimEvent[];
}
function run(patch?: any): Run {
  const events: SimEvent[] = [];
  const opts: any = controlComp('claire', true);
  const res = runComp({
    ...opts,
    overrides: {
      ...(opts.overrides ?? {}),
      ...(patch ? { claire: patch } : {}),
    },
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        events.push(ev);
      },
    },
  } as any);
  return { res, events };
}
const dmg = (r: Run, slug: string): number => totals(r.res)[slug] ?? 0;

// --- counterfactual overrides (in-memory clones; committed JSON untouched) ---------------------

/** Every heal/shield/stat magnitude x10. Heals and shields carry no damage payload, so this MUST be
 *  damage-identical; a stat-buff or Max-HP-grant encoding of the same lines would not be. */
const scaledOv = withPatchedOverride('claire', (ov: any) => {
  for (const slot of SLOTS) {
    for (const e of effectsOf(getBlocks(ov, slot))) {
      for (const f of MAG_FIELDS) {
        if (typeof e[f] === 'number') {
          e[f] = e[f] * 10;
        }
      }
    }
  }
});
/** Whole kit removed — the tandem-safe inertness direction. */
const emptyOv = withPatchedOverride('claire', (ov: any) => {
  for (const slot of SLOTS) {
    setBlocks(ov, slot, []);
  }
});
/** Non-vacuity probe: an obviously-visible burst-cast hit appended to her burst slot. If claire never
 *  casts her burst in this fixture, every burst-gated assertion above is testing nothing. */
const probeOv = withPatchedOverride('claire', (ov: any) => {
  setBlocks(ov, 'burst', [
    ...getBlocks(ov, 'burst'),
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [{ kind: 'flatDamage', atkPct: 5000 }],
    },
  ]);
});

const base = run();
const scaled = run(scaledOv);
const emptied = run(emptyOv);
const probe = run(probeOv);

// ------------------------------------------------------------------------------------------------

describe('claire skill1 — 3 Full Charges -> heal the 2 highest-final-ATK allies for 2.86% caster Max HP', () => {
  const blocks = getBlocks(OV, 'skill1');

  it('is keyed to a FULL-CHARGE counter of 3, not to a raw hit/shot/interval counter', () => {
    // "Activates when landing 3 Full Charge attack(s)" is the chargeCounter primitive (a per-full-charge
    // phase counter). RED under the nearest-wrong models: hitCount:3 (counts every landed round, not only
    // full charges), shotFired, lastBullet, or a bare interval — all of which fire at the wrong cadence
    // for a charge weapon that also fires uncharged rounds.
    expect(blocks.length).toBeGreaterThan(0);
    const triggers = blocks.map((b: any) => b?.trigger?.kind);
    expect(triggers).toContain('chargeCounter');
    const b = blocks.find((x: any) => x?.trigger?.kind === 'chargeCounter');
    const count = b.trigger.count;
    expect(Array.isArray(count) ? count : [count]).toEqual([3]);
    expect(b.trigger.countInFb).toBeUndefined(); // no in-FB threshold change in the kit text
  });

  it('targets exactly 2 allies ranked by FINAL (live) ATK, self not excluded', () => {
    // "Affects 2 ally unit(s) with the highest final ATK" -> alliesTopAtk{count:2, byFinalAtk:true}.
    // RED under: target 'allies' (over-broad, heals the whole team), count !== 2, a static-ATK ranking
    // (byFinalAtk absent — the A3 literal-word rule requires live ranking when the kit says "final ATK"),
    // or excludeSelf:true (the kit never says "except the skill user").
    const b =
      blocks.find((x: any) => x?.trigger?.kind === 'chargeCounter') ??
      blocks[0];
    expect(b.target.kind).toBe('alliesTopAtk');
    expect(b.target.count).toBe(2);
    expect(b.target.byFinalAtk).toBe(true);
    expect(b.target.excludeSelf).toBeFalsy();
  });

  it('carries the 2.86% caster-Max-HP recovery as a heal, never as a stat buff', () => {
    // The magnitude must survive into the model (no silent rounding/drop), and the line is a HEAL —
    // RED under the nearest-wrong encoding "recovers X% of Max HP" -> buff{stat:'casterMaxHpPct'} /
    // {stat:'targetMaxHpPct'}, which grants Max HP (a permanent stat) instead of restoring HP.
    expect(hasMagnitude(blocks, 2.86)).toBe(true);
    const kinds = effectsOf(blocks).map((e: any) => e.kind);
    expect(kinds).not.toContain('buff');
  });
});

describe('claire skill2 — own Burst cast -> 10.13% caster-Max-HP shield to all allies for 10s', () => {
  const blocks = getBlocks(OV, 'skill2');

  it('is keyed to the OWNER BURST CAST, not to Full Burst entry', () => {
    // "Activates when using Burst Skill" = this unit's own burst cast. Keying it to fullBurstEnter
    // OVER-CREDITS: it would fire on every team Full Burst even on rotations where a different Burst I
    // completes the chain (claire competes with liter for the B1 slot in this very fixture). This is the
    // single highest-value trigger-identity assertion in the file.
    expect(blocks.length).toBeGreaterThan(0);
    const triggers = blocks.map((b: any) => b?.trigger?.kind);
    expect(triggers).toContain('burstCast');
    expect(triggers).not.toContain('fullBurstEnter');
    expect(triggers).not.toContain('fullBurstEnd');
    expect(triggers).not.toContain('stageEnter');
  });

  it('shields ALL allies, self included', () => {
    // "Affects all allies" -> target{kind:'allies'} with no excludeSelf. RED under 'self',
    // alliesTopAtk (a leaked skill1 target set), or allies{excludeSelf:true}.
    const b =
      blocks.find((x: any) => x?.trigger?.kind === 'burstCast') ?? blocks[0];
    expect(b.target.kind).toBe('allies');
    expect(b.target.excludeSelf).toBeFalsy();
  });

  it('uses the shield primitive at 10.13% of caster Max HP for 10 sec', () => {
    // RED under: a maxHpPct/casterMaxHpPct buff standing in for the shield (a Max-HP grant is a different
    // mechanic and, unlike a shield, never fires a teammate's `shielded` trigger), a wrong magnitude, or a
    // missing/incorrect 10s window (a shield with no durationSec would sit permanent at scope lock and keep
    // any requiresShielded gate open for the whole fight).
    const shields = effectsOf(blocks).filter((e: any) => e.kind === 'shield');
    expect(shields.length).toBe(1);
    expect(shields[0].maxHpPct).toBeCloseTo(10.13, 6);
    expect(shields[0].durationSec).toBe(10);
    expect(effectsOf(blocks).map((e: any) => e.kind)).not.toContain('buff');
  });
});

describe('claire burst — restore 34.35% caster Max HP to all allies + remove 1 debuff', () => {
  const blocks = getBlocks(OV, 'burst');

  it('heals all allies for 34.35% of caster Max HP on her own burst cast', () => {
    // A burst-slot line with no separate activation clause fires on the burst cast itself and affects
    // "all allies". RED under: a fullBurstEnter re-key (burst-cast damage/effects land BEFORE the Full
    // Burst window opens), a narrowed target set, or a dropped/rescaled magnitude.
    expect(blocks.length).toBeGreaterThan(0);
    const b = blocks.find((x: any) => hasMagnitude(x, 34.35)) ?? blocks[0];
    expect(b.trigger.kind).toBe('burstCast');
    expect(b.target.kind).toBe('allies');
    expect(b.target.excludeSelf).toBeFalsy();
    expect(hasMagnitude(blocks, 34.35)).toBe(true);
    expect(effectsOf(blocks).map((e: any) => e.kind)).not.toContain('buff');
  });

  it.skip('removes 1 debuff — GAP: no cleanse/debuff primitive exists in the effect schema, and the scope-lock boss applies no debuffs, so the line has no observable payload', () => {
    expect(true).toBe(true);
  });

  it('records the debuff-removal line in the override prose (no silent drop)', () => {
    // The unmodelable line must still be auditable: it belongs in `unmodeled.burst` (or, failing that, the
    // note). RED when the line is simply absent from the override — the exact "silent drop" this record exists to prevent.
    const prose = proseOf(OV).join(' | ');
    expect(prose).toMatch(/debuff/i);
  });
});

describe('claire — whole-kit inertness and non-vacuity', () => {
  it('declares no damage, stat-buff or weapon-economy effect anywhere in the kit', () => {
    // Claire's prose has zero damage lines, zero stat lines and zero reload/ammo/fire-rate/swap lines.
    // RED the moment the model invents offence for a Supporter, or reaches for a stat buff to express the
    // heal/shield. Also rejects the parser-only kinds the validator forbids in an override.
    const forbidden = new Set([
      'buff',
      'flatDamage',
      'dot',
      'storedHit',
      'stackedNuke',
      'weaponSwap',
      'gainPierce',
      'unlimitedAmmo',
      'consumeAmmo',
      'instantReload',
      'burstCdr',
      'fillGauge',
      'fullBurstExtend',
      'targetStatus',
      'burstEligibility',
      'burstFirst',
      'reenterStage',
      'advantageVs',
      'stun',
      'resource',
      'escalating',
      'ignored',
      'unsupported',
    ]);
    const found = SLOTS.flatMap((s) =>
      effectsOf(getBlocks(OV, s)).map((e: any) => e.kind)
    ).filter((k: string) => forbidden.has(k));
    expect(found).toEqual([]);
    expect(OV.hasPierce).toBeFalsy();
    expect(OV.modes).toBeUndefined();
    expect(OV.resources).toBeUndefined();
  });

  it('heal/shield magnitudes are damage-inert: scaling every magnitude 10x moves no unit total', () => {
    // Heals and shields carry no damage payload, and a teammate's `recovery` / `shielded` trigger fires on
    // the EVENT, not on its size — so a 10x scale must be byte-identical for EVERY unit. RED if any of
    // claire's magnitudes feeds a damage path (a stat buff, an HP->ATK conversion, or an invented rider).
    // Deliberately robust to whether crown consumes the heal in this fixture.
    const before = totals(base.res);
    const after = totals(scaled.res);
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    for (const s of Object.keys(before)) {
      expect(after[s]).toBe(before[s]);
    }
  });

  it('does not encode the heal or the shield as a Max-HP grant', () => {
    // casterMaxHpPct / targetMaxHpPct re-emit on buffApply as flat `maxHpFlat`. If either kit line were
    // modelled as a Max-HP grant instead of heal/shield, the 10x run's maxHpFlat fingerprint would differ.
    expect(hpGrantFingerprint(scaled.events)).toEqual(
      hpGrantFingerprint(base.events)
    );
  });

  it('removing her whole kit never RAISES any unit total (tandem-safe inertness)', () => {
    // Direction-only, because the heal/shield legitimately MAY drive a teammate's recovery/shield-gated
    // buff (crown sits in this fixture): dropping the kit can lose damage or change nothing, never gain.
    // RED if the model encodes any of claire's support lines as something that costs the team damage.
    const before = totals(base.res);
    const after = totals(emptied.res);
    for (const s of Object.keys(before)) {
      expect(after[s]).toBeLessThanOrEqual((before[s] ?? 0) + 1e-6);
    }
  });

  it('non-vacuity: claire fires in the fixture, and her burst-cast lines are actually reached', () => {
    // Without this, every burstCast assertion above is untested: claire is a Burst I sharing the fixture
    // with liter (also Burst I), so the rotation may never select her. The probe appends a visible
    // burst-cast hit; if her total does not move, her burst never casts in controlComp and skill2 + burst
    // are un-exercised by this suite — a fixture finding, not an override finding.
    expect(unitOf(base.res, 'claire').totalDamage).toBeGreaterThan(0);
    expect(dmg(probe, 'claire')).toBeGreaterThan(dmg(base, 'claire'));
  });
});
