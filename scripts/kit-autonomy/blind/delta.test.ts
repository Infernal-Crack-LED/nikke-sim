/**
 * delta — SR / Wind / Defender / Burst II — BLIND kit spec (cross-family S5).
 * Written from the kit prose ALONE. No sight of the driver's override, tests, or reasoning.
 *
 * KIT (structure, verbatim headers):
 *   skill1  ■ Activates when performing a Full Charge attack. Affects self.
 *             Max HP ▲ 8.82% for 10 sec.
 *   skill2  ■ Activates when using Burst Skills. Affects self.
 *             DEF ▲ 51.42% for 20 sec.
 *   burst   ■ Affects self.
 *             Decoy: avatar with 91.68% of the skill user's final Max HP, 10 sec.
 *             Attract: Taunts all enemies for 10 sec.
 *
 * READING. Every line is SELF-scoped, and at scope lock every line is damage-INERT:
 *  - self Max HP only matters to an atkOfMaxHpPct-style consumer, which this kit does not carry;
 *  - defPct is documented inert in v1 (own DEF never touches own damage);
 *  - decoy / taunt have no engine primitive (no HP pool on the boss side, no aggro model).
 * So faithfulness here is NOT a magnitude question. It is: (a) is every line PRESENT with the
 * kit's number, (b) on the kit's TRIGGER, (c) with the kit's DURATION SEMANTICS, (d) scoped to
 * SELF, and (e) does the unit leak damage anywhere it must not. The inertness assertions are the
 * load-bearing ones, and they are paired with a SENSITIVITY control so they cannot pass vacuously.
 *
 * FIXTURE. controlComp('delta', true) — liter B1 / crown B2 / delta / helm B3, boss Fire, focus
 * delta. delta is Burst II, so she shares the B2 slot with crown: she bursts on the rotations crown
 * cannot, which is exactly what makes burstCast separable from fullBurstEnter (they would be
 * indistinguishable in a comp where delta is the only unit of her tier).
 *
 * RUNS (5, all hoisted — each is a full 180 s sim):
 *   CONTROL      shipped override
 *   STRIPPED     every slot's blocks emptied      → no-leak / inertness
 *   S1_PASSIVE   skill1 trigger → passive         → nearest-wrong for the full-charge trigger
 *   S2_FB        skill2 trigger → fullBurstEnter  → nearest-wrong for the burst-cast trigger
 *   AS_ATK       every buff stat → atkPct         → sensitivity control (proves the fixture CAN see
 *                                                    an offensively-miscoded stat, so STRIPPED's
 *                                                    byte-identical result is a real finding)
 *
 * SHAPE TOLERANCE. The override file is slot-keyed; a slot is read here as either Block[] or
 * { blocks: Block[] } so the spec pins BEHAVIOUR, not the loader's container shape.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'delta';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

const S1_MAXHP_PCT = 8.82;
const S1_SEC = 10;
const S2_DEF_PCT = 51.42;
const S2_SEC = 20;
const DECOY_MAXHP_PCT = 91.68;
const DECOY_SEC = 10;
const FPS = 60;
const FRAME_TOL = 5;

// Any stat key a faithful 'Max HP ▲ x%' self-line could legitimately use. The engine flat-resolves
// caster/target-scaled Max HP to 'maxHpFlat' on buffApply, so the emitted stat name is not fixed.
const MAXHP_STATS = [
  'maxHpFlat',
  'maxHpPct',
  'targetMaxHpPct',
  'casterMaxHpPct',
  'highestAllyMaxHpPct',
];
const OFFENSIVE_EFFECT_KINDS = [
  'flatDamage',
  'dot',
  'hitRepeat',
  'storedHit',
  'stackedNuke',
];
const ALLY_TARGET_KINDS = [
  'allies',
  'alliesTopAtk',
  'alliesLowestAtk',
  'alliesOfElement',
  'alliesOfClass',
  'alliesOfWeapon',
  'alliesOfElementWeapon',
  'selfAndAdjacent',
  'alliesLowestHp',
  'burstCasters',
  'nonBurstCasters',
];
// A 'Full Charge attack' activation is a per-pull trigger on a charge weapon.
const FULL_CHARGE_TRIGGERS = ['shotFired', 'chargeCounter', 'hitCount', 'lastBullet'];

/* ------------------------------------------------------------------ readers */

type Rec = Record<string, unknown>;
type BlockLike = Rec & { trigger?: Rec; target?: Rec; effects?: Rec[] };
type Ev = Rec;

function asBlocks(slotValue: unknown): BlockLike[] {
  if (!slotValue) return [];
  if (Array.isArray(slotValue)) return slotValue as BlockLike[];
  const nested = (slotValue as { blocks?: unknown }).blocks;
  return Array.isArray(nested) ? (nested as BlockLike[]) : [];
}

function slotBlocks(ov: unknown, slot: Slot): BlockLike[] {
  return asBlocks((ov as Rec)[slot]);
}

function slotEffects(ov: unknown, slot: Slot): Rec[] {
  return slotBlocks(ov, slot).flatMap((b) =>
    Array.isArray(b.effects) ? (b.effects as Rec[]) : [],
  );
}

function unmodeledOf(ov: unknown, slot: Slot): string[] {
  const u = (ov as { unmodeled?: Rec }).unmodeled;
  const v = u ? u[slot] : undefined;
  return Array.isArray(v) ? v.map((s) => String(s)) : [];
}

function clearSlot(ov: unknown, slot: Slot): void {
  const v = (ov as Rec)[slot];
  if (Array.isArray(v)) {
    v.length = 0;
    return;
  }
  if (v && typeof v === 'object') {
    const nested = (v as { blocks?: unknown }).blocks;
    if (Array.isArray(nested)) nested.length = 0;
  }
}

function retrigger(ov: unknown, slot: Slot, trigger: Rec): number {
  const bs = slotBlocks(ov, slot);
  for (const b of bs) b.trigger = trigger;
  return bs.length;
}

function swapAllBuffStats(ov: unknown, to: string): number {
  let n = 0;
  for (const slot of SLOTS) {
    for (const e of slotEffects(ov, slot)) {
      if (e.kind === 'buff') {
        e.stat = to;
        n += 1;
      }
    }
  }
  return n;
}

/* ------------------------------------------------------------------- events */

function kindOf(ev: Ev): string {
  return String(ev.kind ?? '');
}

function frameOf(ev: Ev): number | null {
  if (typeof ev.frame === 'number') return ev.frame;
  if (typeof ev.f === 'number') return ev.f;
  if (typeof ev.t === 'number') return Math.round(ev.t * FPS);
  if (typeof ev.sec === 'number') return Math.round(ev.sec * FPS);
  return null;
}

function namesOn(ev: Ev): string[] {
  const keys = ['slug', 'unit', 'unitSlug', 'casterSlug', 'sourceSlug', 'owner', 'targetSlug'];
  const out: string[] = [];
  for (const k of keys) {
    const v = ev[k];
    if (typeof v === 'string') out.push(v);
  }
  return out;
}

function idxOn(ev: Ev): number | null {
  for (const k of ['idx', 'unitIdx', 'slotIdx', 'srcSlot', 'casterIdx']) {
    const v = ev[k];
    if (typeof v === 'number') return v;
  }
  return null;
}

/** Largest set of events sharing one emitted `value` — isolates the per-shot buff from any
 *  other same-stat application (e.g. a burst-side Max-HP record) without guessing magnitudes. */
function dominantByValue(evs: Ev[]): Ev[] {
  const byValue = new Map<string, Ev[]>();
  for (const e of evs) {
    const k = String(e.value);
    const bucket = byValue.get(k) ?? [];
    bucket.push(e);
    byValue.set(k, bucket);
  }
  let best: Ev[] = [];
  for (const bucket of byValue.values()) if (bucket.length > best.length) best = bucket;
  return best;
}

/* --------------------------------------------------------------------- runs */

interface Run {
  totalsBySlug: Record<string, number>;
  events: Ev[];
}

function runDelta(patched?: Rec): Run {
  const events: Ev[] = [];
  const opts = { ...controlComp(SLUG, true) } as Rec;
  if (patched) {
    const existing = (opts.overrides ?? {}) as Rec;
    opts.overrides = { ...existing, ...patched };
  }
  opts.onEvent = (ev: SimEvent) => {
    events.push(ev as unknown as Ev);
  };
  const res = runComp(opts as unknown as Parameters<typeof runComp>[0]);
  return { totalsBySlug: totals(res), events };
}

// An unmutated clone == the committed override, read without touching disk.
const SHIPPED = withPatchedOverride(SLUG, () => {});
const BUFF_EFFECT_COUNT = SLOTS.reduce(
  (n, slot) => n + slotEffects(SHIPPED, slot).filter((e) => e.kind === 'buff').length,
  0,
);

const CONTROL = runDelta();
const STRIPPED = runDelta({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const slot of SLOTS) clearSlot(ov, slot);
  }),
});
const S1_PASSIVE = runDelta({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    retrigger(ov, 'skill1', { kind: 'passive' });
  }),
});
const S2_FB = runDelta({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    retrigger(ov, 'skill2', { kind: 'fullBurstEnter' });
  }),
});
const AS_ATK = runDelta({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    swapAllBuffStats(ov, 'atkPct');
  }),
});

/* ------------------------------------------------------------ derived views */

function buffApplies(run: Run): Ev[] {
  return run.events.filter((e) => kindOf(e) === 'buffApply');
}
function onDelta(evs: Ev[]): Ev[] {
  return evs.filter((e) => e.targetSlug === SLUG);
}
function maxHpApplies(run: Run): Ev[] {
  return onDelta(buffApplies(run)).filter((e) => MAXHP_STATS.includes(String(e.stat)));
}
function defApplies(run: Run): Ev[] {
  return onDelta(buffApplies(run)).filter((e) => String(e.stat) === 'defPct');
}

const DELTA_BUFFS = onDelta(buffApplies(CONTROL));
// A self-buff pins delta's unit index (caster === target), used to attribute index-only events.
const DELTA_IDX = (() => {
  const self = DELTA_BUFFS.find(
    (e) => typeof e.casterIdx === 'number' && e.casterIdx === e.targetIdx,
  );
  return self ? (self.casterIdx as number) : null;
})();

function isDeltaEvent(ev: Ev): boolean {
  if (namesOn(ev).includes(SLUG)) return true;
  return DELTA_IDX !== null && idxOn(ev) === DELTA_IDX;
}

const DELTA_SHOTS = CONTROL.events.filter((e) => kindOf(e) === 'shot' && isDeltaEvent(e));
const DELTA_CASTS = CONTROL.events.filter((e) => kindOf(e) === 'burstCast' && isDeltaEvent(e));
const FB_STARTS = CONTROL.events.filter((e) => kindOf(e) === 'fullBurstStart');

function expectSameTotals(a: Record<string, number>, b: Record<string, number>): void {
  expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
  for (const k of Object.keys(a)) expect(b[k]).toBe(a[k]);
}

/* -------------------------------------------------------------------- tests */

describe('delta — fixture is live (non-vacuity)', () => {
  it('the event tap fires and delta is attributable', () => {
    expect(CONTROL.events.length).toBeGreaterThan(0);
    expect(DELTA_BUFFS.length).toBeGreaterThan(0);
    expect(DELTA_IDX).not.toBeNull();
  });

  it('delta fires many full-charge shots and casts her burst at least once', () => {
    // 6 ammo / 60-frame charge / 111-frame reload over 180 s is ~100 shots; 20 is a safe floor.
    expect(DELTA_SHOTS.length).toBeGreaterThan(20);
    // A Burst II unit sharing the tier with crown must still get the slot sometimes, or every
    // burst-keyed assertion below would be testing nothing.
    expect(DELTA_CASTS.length).toBeGreaterThanOrEqual(1);
    expect(FB_STARTS.length).toBeGreaterThanOrEqual(1);
  });

  it('the fixture CAN detect an offensively-miscoded stat (sensitivity control)', () => {
    // Without this, the inertness assertions below could pass because the harness is blind.
    expect(BUFF_EFFECT_COUNT).toBeGreaterThan(0);
    expect(AS_ATK.totalsBySlug[SLUG]).toBeGreaterThan(CONTROL.totalsBySlug[SLUG]);
  });
});

describe('delta skill1 — Full Charge attack → self Max HP ▲ 8.82% for 10 sec', () => {
  it('is authored as ONE self-scoped Max-HP buff at the kit magnitude and duration', () => {
    const buffs = slotEffects(SHIPPED, 'skill1').filter((e) => e.kind === 'buff');
    expect(buffs.length).toBe(1);
    const buff = buffs[0];
    expect(MAXHP_STATS).toContain(String(buff?.stat));
    // Nearest-wrong: a pre-multiplied flat HP number, or an ATK-flavoured stat.
    expect(Number(buff?.value)).toBeCloseTo(S1_MAXHP_PCT, 5);
    expect(Number(buff?.durationSec)).toBe(S1_SEC);
    // Duration semantics: seconds, NOT rounds (taxonomy trap 2).
    expect(buff?.durationShots ?? null).toBeNull();
    for (const b of slotBlocks(SHIPPED, 'skill1')) {
      expect(String(b.target?.kind)).toBe('self');
    }
  });

  it('is keyed to the per-full-charge pull, not to a passive / burst / FB trigger', () => {
    for (const b of slotBlocks(SHIPPED, 'skill1')) {
      expect(FULL_CHARGE_TRIGGERS).toContain(String(b.trigger?.kind));
    }
    const applies = dominantByValue(maxHpApplies(CONTROL));
    // The discriminating count: one application per full-charge shot.
    expect(applies.length).toBe(DELTA_SHOTS.length);
    // …which is nothing like a burst-keyed reading of the same line.
    expect(applies.length).toBeGreaterThan(DELTA_CASTS.length * 3);
  });

  it('fails under the nearest-wrong passive reading', () => {
    const control = dominantByValue(maxHpApplies(CONTROL)).length;
    const passive = dominantByValue(maxHpApplies(S1_PASSIVE)).length;
    expect(passive).toBeLessThan(control);
  });

  it('grants a constant, positive Max HP for a 10-second window', () => {
    const applies = dominantByValue(maxHpApplies(CONTROL));
    expect(applies.length).toBeGreaterThan(0);
    const values = new Set(applies.map((e) => String(e.value)));
    expect(values.size).toBe(1);
    expect(Number(applies[0]?.value)).toBeGreaterThan(0);
    for (const ev of applies.slice(0, 5)) {
      const f = frameOf(ev);
      expect(f).not.toBeNull();
      const span = Number(ev.expiresFrame) - (f as number);
      // 600 frames = 10 s. Discriminates against the 20 s window and against a rounds encoding.
      expect(span).toBeGreaterThanOrEqual(S1_SEC * FPS - FRAME_TOL);
      expect(span).toBeLessThanOrEqual(S1_SEC * FPS + FRAME_TOL);
      expect(ev.durationShots ?? null).toBeNull();
    }
  });
});

describe('delta skill2 — using Burst Skills → self DEF ▲ 51.42% for 20 sec', () => {
  it('is authored as a self defPct buff at the kit magnitude and duration', () => {
    const buffs = slotEffects(SHIPPED, 'skill2').filter((e) => e.kind === 'buff');
    expect(buffs.length).toBe(1);
    const buff = buffs[0];
    // Nearest-wrong: 'DEF ▲' silently promoted to an offensive stat to make the unit do something.
    expect(String(buff?.stat)).toBe('defPct');
    expect(Number(buff?.value)).toBeCloseTo(S2_DEF_PCT, 5);
    expect(Number(buff?.durationSec)).toBe(S2_SEC);
    expect(buff?.durationShots ?? null).toBeNull();
    for (const b of slotBlocks(SHIPPED, 'skill2')) {
      expect(String(b.target?.kind)).toBe('self');
      // Trigger identity: 'when using Burst Skills' is the OWNER's cast, not team FB entry.
      expect(String(b.trigger?.kind)).toBe('burstCast');
    }
  });

  it('fires once per OWN burst cast — not once per team Full Burst', () => {
    const applies = defApplies(CONTROL);
    expect(applies.length).toBe(DELTA_CASTS.length);
    expect(applies.length).toBeGreaterThanOrEqual(1);
    for (const ev of applies) expect(Number(ev.value)).toBeCloseTo(S2_DEF_PCT, 5);
  });

  it('diverges from the nearest-wrong fullBurstEnter keying whenever the fixture separates them', () => {
    const control = defApplies(CONTROL).length;
    const fbKeyed = defApplies(S2_FB).length;
    if (DELTA_CASTS.length < FB_STARTS.length) {
      // delta shares Burst II with crown, so FB-keying over-credits — the whole point of the trap.
      expect(fbKeyed).toBeGreaterThan(control);
    } else {
      // delta took every rotation: the two readings coincide here and the fixture cannot separate
      // them. Recorded explicitly so a passing run is never mistaken for a discrimination.
      expect(fbKeyed).toBe(control);
    }
  });

  it('holds for a 20-second window', () => {
    const applies = defApplies(CONTROL);
    for (const ev of applies.slice(0, 5)) {
      const f = frameOf(ev);
      expect(f).not.toBeNull();
      const span = Number(ev.expiresFrame) - (f as number);
      expect(span).toBeGreaterThanOrEqual(S2_SEC * FPS - FRAME_TOL);
      expect(span).toBeLessThanOrEqual(S2_SEC * FPS + FRAME_TOL);
    }
  });
});

describe('delta burst — Decoy (91.68% of final Max HP, 10 s) + Attract (taunt, 10 s)', () => {
  it('records the Decoy either as a self shield at the kit magnitude, or as unmodeled text', () => {
    const shields = slotEffects(SHIPPED, 'burst').filter((e) => e.kind === 'shield');
    const unmodeled = unmodeledOf(SHIPPED, 'burst').join(' | ');
    if (shields.length > 0) {
      expect(shields.length).toBe(1);
      expect(Number(shields[0]?.maxHpPct)).toBeCloseTo(DECOY_MAXHP_PCT, 5);
      expect(Number(shields[0]?.durationSec)).toBe(DECOY_SEC);
    } else {
      // No decoy primitive exists — a silent drop is the failure mode this catches.
      expect(unmodeled).toMatch(/decoy|avatar/i);
    }
  });

  it('records the taunt as unmodeled — there is no aggro primitive', () => {
    const unmodeled = unmodeledOf(SHIPPED, 'burst').join(' | ');
    expect(unmodeled).toMatch(/taunt|attract/i);
    // A taunt is not a stun; encoding it as one would be a different mechanic.
    expect(slotEffects(SHIPPED, 'burst').filter((e) => e.kind === 'stun')).toEqual([]);
  });

  it('carries no damage effect in any slot', () => {
    for (const slot of SLOTS) {
      const offensive = slotEffects(SHIPPED, slot).filter((e) =>
        OFFENSIVE_EFFECT_KINDS.includes(String(e.kind)),
      );
      expect(offensive).toEqual([]);
    }
  });
});

describe('delta — scope + inertness (every kit line says \"Affects self\")', () => {
  it('no block in any slot targets allies', () => {
    for (const slot of SLOTS) {
      for (const b of slotBlocks(SHIPPED, slot)) {
        expect(ALLY_TARGET_KINDS).not.toContain(String(b.target?.kind));
      }
    }
  });

  it('emits no buff onto any teammate at runtime', () => {
    expect(DELTA_IDX).not.toBeNull();
    const leaked = buffApplies(CONTROL)
      .filter((e) => e.casterIdx === DELTA_IDX && e.targetSlug !== SLUG)
      .map((e) => `${String(e.stat)}→${String(e.targetSlug)}`);
    expect(leaked).toEqual([]);
  });

  it('moves ZERO damage — hers or anyone else\u2019s — when every block is removed', () => {
    // Max HP feeds only an atkOfMaxHpPct consumer (this kit has none); defPct is inert in v1;
    // decoy/taunt have no damage channel. Byte-identical totals is therefore the faithful result,
    // and the AS_ATK sensitivity control above proves this comparison is not blind.
    expectSameTotals(CONTROL.totalsBySlug, STRIPPED.totalsBySlug);
  });

  it('keeps teammates untouched even when her own buffs are made offensive', () => {
    for (const k of Object.keys(CONTROL.totalsBySlug)) {
      if (k === SLUG) continue;
      expect(AS_ATK.totalsBySlug[k]).toBe(CONTROL.totalsBySlug[k]);
    }
  });

  it.skip('Decoy absorbs boss damage / holds an HP pool — no primitive (boss deals no damage at scope lock)', () => {});

  it.skip('Attract redirects boss aggro — no aggro/targeting model in the sim', () => {});

  it.skip('DEF ▲ 51.42% changes survivability — defPct is inert in v1 by design (no incoming damage)', () => {});

  it.skip('self Max HP ▲ 8.82% feeds an HP→ATK conversion — delta carries no atkOfMaxHpPct consumer', () => {});
});
