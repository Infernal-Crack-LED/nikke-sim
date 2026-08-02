/**
 * sakura — Sakura (SR / Fire / Supporter / Burst I; 40s burst CD, 6 ammo, 121f reload,
 * 60f charge, 1 hit/shot, normal 67% / core 200%). BLIND kit-spec tests, written from the
 * kit prose alone.
 *
 * KIT (structural read of the prose):
 *   S1  "Activates after 3 normal attack(s). Affects all allies."
 *       Cherry Blossom Tea: 8.15% of DEF, up to 10 stacks, 15 sec.
 *       -> hitCount:3 -> allies; a STACKING DEFENSIVE grant.
 *       (flag) The line names no offensive stat before a triangle marker: "8.15% of DEF" is read as a
 *       DEF grant (defPct). A "converts DEF into ATK" reading has NO primitive (there is no
 *       atkOfDefPct StatKey), so it is recorded as a GAP rather than guessed. The assertions
 *       below therefore bind to the MAGNITUDE + stack shape + target set, and separately
 *       assert the stat is not an offensive one — that holds under either encoding.
 *   S2a "When attacking an enemy projectile, damage to that projectile up 7.74% continuously."
 *       -> GAP: the sim models no enemy projectiles. Must be inert AND must not leak into a
 *          generic damage stat.
 *   S2b "Activates when entering Full Burst. Affects all allies.
 *        Cooldown of Burst Skill down 4.84 sec."
 *       -> fullBurstEnter -> allies, burstCdr 4.84s, on EVERY full burst (no once-per-battle).
 *          This is the ONLY sakura line that moves damage in v1, and it moves it through
 *          ROTATION (full-burst count), not through a damage bucket.
 *   B1  "Damage dealt by Wind Code enemies down 90.72% for 30 sec. Activates 1 time(s) per battle."
 *       -> defensive (INCOMING damage). UNMODELED. Nearest-wrong is encoding it as a boss
 *          damageTakenPct, which would inflate the whole team.
 *   B2  "ATK up 23.76% of the skill user's ATK for 10 sec." (burst block, all allies)
 *       -> burstCast -> allies, casterAtkPct 23.76, durationSec 10. Caster-scaled buffs are
 *          FLAT-resolved at apply time, so every ally must receive the SAME flat number.
 *   B3  "Activates when Cherry Blossom Tea is at max stacks. Affects all allies.
 *        Damage to Interruption Parts up 23.54% for 30 sec."
 *       -> partsDamagePct (inert in v1: the scope-lock boss is partless). The max-stacks gate
 *          has no primitive (there is no stack-count block gate) — and is arithmetically
 *          unreachable anyway: a charged SR shot costs ~60f charge + ~22f release ~= 1.37s, so
 *          3 shots ~= 4.1s per stack against a 15s stack life => ~3-4 stacks steady state,
 *          never 10. Recorded as a GAP.
 *
 * FIXTURE: controlComp('sakura', true) — liter (B1) / crown (B2) / sakura / helm (B3).
 *   The fixed B3 is REQUIRED: sakura is Burst I and a comp with no Burst III makes ZERO full
 *   bursts, which would make every assertion here vacuous.
 *   (flag) liter is ALSO Burst I. If the engine's first-ready-in-window selection always prefers
 *   her, sakura's own burst never casts and B1/B2/B3 go unexercised. That is caught by an
 *   explicit FIXTURE PRECONDITION test (and the dependent assertions skipIf) so it surfaces as
 *   a named fixture limitation instead of masquerading as a faithfulness divergence.
 *
 * COUNTERFACTUAL STYLE: patches are located by MAGNITUDE (8.15 / 4.84 / 23.76 / 23.54), never by
 * slot index or trigger shape, so they bind to the modelled line however the override arranges
 * it. Every patch records how many effects/blocks it matched and the test asserts that count is
 * non-zero — a patch that silently matched nothing would make its own counterfactual vacuous.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed: blind/ sits under kit-autonomy/, not tests/units/

const SLUG = 'sakura';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const EPS = 1e-6;
const near = (a: number | undefined, b: number): boolean =>
  typeof a === 'number' && Math.abs(a - b) < EPS;

/** Offensive StatKeys — the Cherry Blossom Tea grant must be none of these. */
const OFFENSIVE_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
  'critRatePct',
  'critRateNormalPct',
  'critDamagePct',
  'coreDamagePct',
  'elementDamagePct',
  'chargeDamagePct',
  'chargeDamageMultPct',
  'chargeSpeedPct',
  'attackDamagePct',
  'sustainedDamagePct',
  'sequentialDamagePct',
  'sequentialMultPct',
  'trueDamagePct',
  'damageTakenPct',
  'extraHitDamagePct',
  'normalAttackPct',
  'elemAdvantageDamagePct',
  'projectileExplosionPct',
  'distributedDamagePct',
  'projectileAttachmentPct',
  'pierceDamagePct',
  'hitRatePct',
  'burstGenPct',
  'maxAmmoPct',
  'maxAmmoFlat',
  'fireRatePct',
  'attackSpeedPct',
  'reloadSpeedPct',
  'pelletCountFlat',
]);

// ---------------------------------------------------------------------------
// structural helpers — tolerant of the override file being slot -> Block[] OR
// slot -> CharacterSkills{blocks}. Neither shape is assumed.
// ---------------------------------------------------------------------------
type AnyEffect = {
  kind?: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  seconds?: number;
  durationSec?: number;
  oncePerBattle?: boolean;
  maxStacks?: number;
};
type AnyBlock = {
  trigger?: { kind: string };
  target?: { kind: string; excludeSelf?: boolean };
  effects?: AnyEffect[];
};

function blocksOf(ov: unknown): AnyBlock[] {
  const rec = (ov ?? {}) as Record<string, unknown>;
  const out: AnyBlock[] = [];
  for (const slot of SLOTS) {
    const raw = rec[slot];
    if (!raw) {
      continue;
    }
    if (Array.isArray(raw)) {
      out.push(...(raw as AnyBlock[]));
    } else {
      const inner = (raw as { blocks?: unknown }).blocks;
      if (Array.isArray(inner)) {
        out.push(...(inner as AnyBlock[]));
      }
    }
  }
  return out;
}

function patchEffects(
  ov: unknown,
  pred: (e: AnyEffect) => boolean,
  mut: (e: AnyEffect) => void
): number {
  let n = 0;
  for (const b of blocksOf(ov)) {
    for (const e of b.effects ?? []) {
      if (pred(e)) {
        mut(e);
        n += 1;
      }
    }
  }
  return n;
}

function patchBlocks(
  ov: unknown,
  pred: (e: AnyEffect) => boolean,
  mut: (b: AnyBlock) => void
): number {
  let n = 0;
  for (const b of blocksOf(ov)) {
    if ((b.effects ?? []).some(pred)) {
      mut(b);
      n += 1;
    }
  }
  return n;
}

const isTea = (e: AnyEffect): boolean => near(e.value, 8.15);
const isCdr = (e: AnyEffect): boolean =>
  e.kind === 'burstCdr' || near(e.seconds, 4.84);
const isBurstAtk = (e: AnyEffect): boolean => near(e.value, 23.76);
const isParts = (e: AnyEffect): boolean => near(e.value, 23.54);

// ---------------------------------------------------------------------------
// run harness
// ---------------------------------------------------------------------------
type BuffEv = {
  kind: string;
  stat: string;
  key?: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  refresh?: boolean;
  expiresFrame?: number;
  durationShots?: number;
};

function run(mutate?: (ov: unknown) => void) {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true);
  if (mutate) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate),
    };
  }
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  const res = runComp(opts);
  const dmg = totals(res);
  const buffs = events.filter(
    (e) => e.kind === 'buffApply'
  ) as unknown as BuffEv[];
  const fb = events.filter((e) => e.kind === 'fullBurstStart').length;
  const team = Object.values(dmg).reduce((a, b) => a + b, 0);
  return { res, events, dmg, buffs, fb, team };
}

// ---- hoisted runs (10 total; each is a full 180s sim) ----------------------
const base = run();

let teaZeroHits = 0;
const teaZero = run((ov) => {
  teaZeroHits = patchEffects(ov, isTea, (e) => {
    e.value = 0;
  });
});

let teaShotHits = 0;
const teaPerShot = run((ov) => {
  teaShotHits = patchBlocks(ov, isTea, (b) => {
    b.trigger = { kind: 'shotFired' };
  });
});

let cdrZeroHits = 0;
const cdrZero = run((ov) => {
  cdrZeroHits = patchEffects(ov, isCdr, (e) => {
    e.seconds = 0;
  });
});

let cdrOnceHits = 0;
const cdrOnce = run((ov) => {
  cdrOnceHits = patchEffects(ov, isCdr, (e) => {
    e.oncePerBattle = true;
  });
});

let cdrSelfHits = 0;
const cdrSelf = run((ov) => {
  cdrSelfHits = patchBlocks(ov, isCdr, (b) => {
    b.target = { kind: 'self' };
  });
});

let cdrCastHits = 0;
const cdrOnCast = run((ov) => {
  cdrCastHits = patchBlocks(ov, isCdr, (b) => {
    b.trigger = { kind: 'burstCast' };
  });
});

let atkDblHits = 0;
const atkDoubled = run((ov) => {
  atkDblHits = patchEffects(ov, isBurstAtk, (e) => {
    e.value = 47.52;
  });
});

let atkLongHits = 0;
const atkLong = run((ov) => {
  atkLongHits = patchEffects(ov, isBurstAtk, (e) => {
    e.durationSec = 30;
  });
});

let partsZeroHits = 0;
const partsZero = run((ov) => {
  partsZeroHits = patchEffects(ov, isParts, (e) => {
    e.value = 0;
  });
});

// sakura's slot index is derived from any buff TARGETING her (liter/crown/helm all buff
// allies), so it does not depend on sakura's own override modelling anything.
const sakuraIdx =
  base.buffs.find(
    (b) => b.targetSlug === SLUG && typeof b.targetIdx === 'number'
  )?.targetIdx ?? -1;
const fromSakura = (b: BuffEv): boolean => b.casterIdx === sakuraIdx;

function evSlugOf(e: SimEvent): string | undefined {
  const r = e as unknown as Record<string, unknown>;
  for (const k of ['slug', 'unitSlug', 'srcSlug', 'caster', 'targetSlug']) {
    const v = r[k];
    if (typeof v === 'string') {
      return v;
    }
  }
  return undefined;
}
function evIdxOf(e: SimEvent): number | undefined {
  const r = e as unknown as Record<string, unknown>;
  for (const k of ['srcSlot', 'slot', 'idx', 'unitIdx', 'casterIdx']) {
    const v = r[k];
    if (typeof v === 'number') {
      return v;
    }
  }
  return undefined;
}
const sakuraBurstCasts = base.events.filter(
  (e) =>
    e.kind === 'burstCast' && (evSlugOf(e) === SLUG || evIdxOf(e) === sakuraIdx)
);
const bursted = sakuraBurstCasts.length > 0;

// ---------------------------------------------------------------------------
describe('sakura — fixture sanity', () => {
  it('the control comp contains sakura, she fires, and the team full-bursts', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(sakuraIdx).toBeGreaterThanOrEqual(0);
    // sakura is Burst I: without the fixed Burst III slot this would be 0 and every
    // burst/rotation assertion below would be vacuous.
    expect(base.fb).toBeGreaterThan(0);
  });
});

describe('S1 — Cherry Blossom Tea: 8.15% of DEF, 10 stacks, 15s, every 3 normal attacks, all allies', () => {
  const tea = base.buffs.filter((b) => fromSakura(b) && near(b.value, 8.15));

  it('reaches ALL allies including herself (nearest-wrong: self-only / top-ATK slice)', () => {
    expect(tea.length).toBeGreaterThan(0);
    const targets = new Set(tea.map((b) => b.targetSlug));
    expect(targets.has(SLUG)).toBe(true);
    expect(targets.size).toBeGreaterThanOrEqual(3);
  });

  it('caps at 10 stacks (nearest-wrong: unstacked, or an uncapped/other cap)', () => {
    expect(tea.every((b) => b.maxStacks === 10)).toBe(true);
    expect(Math.max(...tea.map((b) => b.stacks ?? 1))).toBeLessThanOrEqual(10);
  });

  it('is a DEFENSIVE grant — the prose names no offensive stat before the buff marker', () => {
    for (const b of tea) {
      expect(OFFENSIVE_STATS.has(b.stat)).toBe(false);
    }
  });

  it('fires every 3rd normal attack, not on every shot (nearest-wrong: shotFired / hitCount:1)', () => {
    expect(teaShotHits).toBeGreaterThan(0);
    const perShot = teaPerShot.buffs.filter(
      (b) => b.casterIdx === sakuraIdx && near(b.value, 8.15)
    ).length;
    // hitCount:3 with hitsPerShot 1 => a per-shot trigger must apply ~3x as often.
    expect(perShot).toBeGreaterThanOrEqual(tea.length * 2);
  });

  it('moves no damage in v1 (DEF does not feed the damage formula) — whole board byte-identical', () => {
    expect(teaZeroHits).toBeGreaterThan(0);
    expect(teaZero.dmg).toEqual(base.dmg);
  });
});

describe('S2a — damage to enemy projectiles up 7.74% continuously', () => {
  it('does not leak into a generic damage/stat buff', () => {
    expect(
      base.buffs.filter((b) => fromSakura(b) && near(b.value, 7.74))
    ).toHaveLength(0);
  });

  it.skip('projectile-scoped damage up 7.74% — GAP: the sim models no enemy projectiles, so the payload is unobservable', () => {
    /* no primitive; recorded, not modelled */
  });
});

describe('S2b — Burst Skill cooldown down 4.84s on entering Full Burst, all allies', () => {
  it('is live: removing it costs full bursts over the 180s fight', () => {
    expect(cdrZeroHits).toBeGreaterThan(0);
    expect(base.fb).toBeGreaterThan(cdrZero.fb);
  });

  it('fires on EVERY full burst, not once per battle (nearest-wrong: oncePerBattle)', () => {
    expect(cdrOnceHits).toBeGreaterThan(0);
    expect(base.fb).toBeGreaterThan(cdrOnce.fb);
  });

  it('reaches all allies, not just sakura (nearest-wrong: target self)', () => {
    expect(cdrSelfHits).toBeGreaterThan(0);
    expect(base.fb).toBeGreaterThan(cdrSelf.fb);
  });

  it('keys to full-burst ENTRY, so it can never fire less often than own-burst-cast would', () => {
    // directional: in this comp liter contests the Burst I slot, so a burstCast keying can
    // only lose activations relative to the faithful fullBurstEnter keying.
    expect(cdrCastHits).toBeGreaterThan(0);
    expect(cdrOnCast.fb).toBeLessThanOrEqual(base.fb);
  });

  it('its damage effect is entirely rotational — fewer full bursts means less team damage', () => {
    expect(cdrZero.fb).toBeLessThan(base.fb);
    expect(cdrZero.team).toBeLessThan(base.team);
  });
});

describe('Burst — all allies', () => {
  const atk = base.buffs.filter(
    (b) => fromSakura(b) && b.stat === 'casterAtkPct'
  );

  it('FIXTURE PRECONDITION: sakura casts her own Burst I (liter is also Burst I in this comp)', () => {
    // If this is the only RED in the file, the burst block was never exercised by the
    // fixture — that is a fixture limitation, NOT a faithfulness divergence.
    expect(sakuraBurstCasts.length).toBeGreaterThan(0);
  });

  it.skipIf(!bursted)(
    "grants ATK scaled by the SKILL USER's ATK — flat-resolved, the same value for every ally",
    () => {
      expect(atk.length).toBeGreaterThan(0);
      const vals = new Set(atk.map((b) => b.value));
      // caster-scaled => ONE flat number regardless of the recipient's own ATK.
      // nearest-wrong: stat atkPct (scales the TARGET's ATK) would emit the raw 23.76.
      expect(vals.size).toBe(1);
      const v = [...vals][0];
      expect(v).toBeGreaterThan(100);
      expect(Math.abs(v - 23.76)).toBeGreaterThan(1);
      const targets = new Set(atk.map((b) => b.targetSlug));
      expect(targets.has(SLUG)).toBe(true);
      expect(targets.size).toBeGreaterThanOrEqual(3);
    }
  );

  it.skipIf(!bursted)(
    'the 23.76 magnitude is live (doubling it raises team damage)',
    () => {
      expect(atkDblHits).toBeGreaterThan(0);
      expect(atkDoubled.team).toBeGreaterThan(base.team);
    }
  );

  it.skipIf(!bursted)(
    'lasts 10 sec, not the whole fight (extending it to 30s raises team damage)',
    () => {
      expect(atkLongHits).toBeGreaterThan(0);
      expect(atkLong.team).toBeGreaterThan(base.team);
    }
  );

  it('the Wind-Code damage-reduction line is defensive and unmodelled', () => {
    // nearest-wrong: encoded as a boss damageTakenPct (an enormous team-wide damage gain)
    // or as any other 90.72-magnitude buff.
    expect(
      base.buffs.filter((b) => near(Math.abs(b.value), 90.72))
    ).toHaveLength(0);
  });

  it('Interruption-Parts up 23.54% is not encoded as a generic damage stat', () => {
    const leak = base.buffs.filter(
      (b) =>
        fromSakura(b) && near(b.value, 23.54) && b.stat !== 'partsDamagePct'
    );
    expect(leak).toHaveLength(0);
  });

  it.skipIf(partsZeroHits === 0)(
    'Interruption-Parts up 23.54%, where modelled, moves no damage (the v1 boss is partless)',
    () => {
      expect(partsZero.dmg).toEqual(base.dmg);
    }
  );

  it.skip('gate "when Cherry Blossom Tea is at max stacks" — GAP: no stack-count block gate exists, and 10 stacks are arithmetically unreachable (~4.1s per stack vs a 15s stack life)', () => {
    /* no primitive; the payload is inert regardless */
  });
});
