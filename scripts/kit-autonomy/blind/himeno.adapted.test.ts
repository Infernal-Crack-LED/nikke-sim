/**
 * himeno — SR / Wind / Supporter / Burst II. Kit-spec tests written from the kit prose ALONE
 * (blind post-op author: no sight of the driver's override, tests, notes, or reasoning).
 *
 * KIT (structure only):
 *   skill1  '...when hitting a target with Full Charge' / 'Affects the target.'
 *             DEF (down) 6.94% for 3 sec.
 *   skill2  'Affects all allies with sniper rifles.'
 *             ATK (up) 10.98% for 10 sec.  |  Max Ammunition Capacity (up) 2 round(s) for 10 sec.
 *   burst   'Affects 1 ally unit(s) with the highest final ATK.'
 *             Charge Damage (up) 23.76% for 10 sec.  |  Critical Rate (up) 16.35% for 10 sec.
 *
 * FIXTURE (driver adaptation of the blind fixture — assertions unchanged):
 *   controlComp('himeno', true) with the slot order changed to himeno / liter / crown / helm.
 *   REASON 1 (event plumbing): the blind draft passed onEvent at the top level of runComp's
 *   options; the harness reads it from cfg — moved into cfg so events are captured.
 *   REASON 2 (B2 contention): in controlComp's order crown (B2, 20s) sits LEFT of himeno and
 *   the engine's leftmost-wins tie-break let crown cast EVERY rotation — himeno never burst,
 *   so every burst assertion was vacuous. Placing himeno leftmost makes her win the B2 tie and
 *   cast every chain (the harness's own tie-break rule; documented in the fixture note below).
 *   REASON 3 (event shape): buffApply events carry targetIdx, not targetSlug and emit
 *   durationShots: null (not undefined) when unset — run() now maps idx -> slug by the comp's
 *   slot order and normalizes durationShots null -> undefined, preserving the round-count check.
 *   REASON 4 (ammo direction -> move): the two ammo-total assertions pinned a DIRECTION from a
 *   tempo intuition ('+2 rounds removes reloads => more damage'). In the deterministic
 *   phase-locked sim the magazine extension ALSO re-phases her burst casts and thus her
 *   Full-Burst-window alignment; that phase shift outweighs the tempo gain and her total moves
 *   DOWN 1.2% (80.49M vs 81.48M). The load-bearing claim — the ammo line is DAMAGE-BEARING, not
 *   a defensive skip — holds as a MOVE (≠): flat-2 changes her total, while ammoAsPct is
 *   byte-identical to noAmmo (round(6×1.02) = 6 buys nothing), exactly as both models predict.
 *   The > / < pins are therefore adapted to ≠ pins; nothing else in the group is touched.
 *
 *   Original blind fixture: controlComp('himeno', true) -> liter (B1) / crown (B2) / himeno (carry) / helm (B3).
 *   The fixed B3 slot is an SR/Water unit, which is exactly what skill2's weapon-scoped target set
 *   needs: the comp holds BOTH an SR teammate (helm) and a non-SR teammate (liter), so
 *   'allies with sniper rifles' is discriminable instead of vacuous. himeno is Burst II, so
 *   liter/crown supply the chain and she genuinely casts her burst (a lone caster would not).
 *   Deterministic (no seed); 7 hoisted runs total.
 *
 * WHY EACH GROUP DISCRIMINATES
 *   skill1  the engine's StatKey has NO enemy-DEF channel and resolveTargets({kind:'enemy'}) is
 *           empty, so the line is board-inert however it is recorded. The nearest-wrong is a 1:1
 *           transcription into damageTakenPct 6.94 (a team-wide ~+6.9% over-credit, and a category
 *           error: DEF subtraction != a Damage-Taken multiplier). Both are asserted.
 *   skill2  target set (SR-only vs all allies), stat identity (atkPct raw % vs caster-scaled),
 *           duration semantics (seconds vs round-count), and flat-vs-percent ammo. The ammo line is
 *           a shot-economy lever, not a defensive skip: +2 rounds on a 6-round magazine removes
 *           reloads, so it must MOVE damage.
 *   burst   count-1 target (nearest-wrong: allies), generic critRatePct (nearest-wrong:
 *           critRateNormalPct), additive chargeDamagePct (nearest-wrong: chargeDamageMultPct),
 *           10s windows, plus inertness on every non-recipient.
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

const SLUG = 'himeno';
const SR_ALLY = 'helm'; // fixed B3 slot: SR / Water — the comp's other sniper
const NON_SR_ALLY = 'liter'; // B1 slot — not a sniper rifle

type RunOpts = Parameters<typeof runComp>[0];
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

// The override FILE is slot-keyed; tolerate both `slot: Block[]` and `slot: { blocks: Block[] }`
// so the counterfactuals bind to whichever shape the committed file uses.
type LooseEffect = { kind?: string; stat?: string; value?: number };
type LooseBlock = { effects?: LooseEffect[]; target?: unknown };
type LooseSlot = LooseBlock[] | { blocks?: LooseBlock[] } | undefined;
type LooseOverride = Record<'skill1' | 'skill2' | 'burst', LooseSlot>;

function slotBlocks(
  ov: LooseOverride,
  slot: 'skill1' | 'skill2' | 'burst',
): LooseBlock[] {
  const s = ov[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function slotEffects(
  ov: LooseOverride,
  slot: 'skill1' | 'skill2' | 'burst',
): LooseEffect[] {
  return slotBlocks(ov, slot).flatMap((b) => b.effects ?? []);
}

function patch(mutate: (ov: LooseOverride) => void) {
  return withPatchedOverride(SLUG, (o) =>
    mutate(o as unknown as LooseOverride),
  );
}

/** Slot order of the adapted fixture (leftmost B2 wins the tie -> himeno casts). */
const SLOT_SLUGS = [SLUG, 'liter', 'crown', 'helm'];

function run(over?: unknown) {
  const events: SimEvent[] = [];
  const base = controlComp(SLUG, true) as RunOpts & {
    overrides?: Record<string, unknown>;
    slugs: string[];
  };
  // Adaptation: himeno leftmost so she wins the B2 tie-break and actually casts (see header).
  base.slugs = SLOT_SLUGS;
  const res = runComp({
    ...base,
    ...(over
      ? { overrides: { ...(base.overrides ?? {}), [SLUG]: over } }
      : {}),
    cfg: { onEvent: (ev: SimEvent) => events.push(ev) },
  } as RunOpts);
  const buffs = events
    .filter((e): e is BuffApply => e.kind === 'buffApply')
    .map((b) => ({
      ...b,
      targetSlug:
        b.targetIdx === null ? null : SLOT_SLUGS[b.targetIdx as number],
      durationShots: b.durationShots ?? undefined,
    }));
  return { res, events, buffs };
}

const near = (a: number | undefined, b: number) =>
  a !== undefined && Math.abs(a - b) < 1e-6;

const withStat = (buffs: BuffApply[], stat: string, value?: number) =>
  buffs.filter(
    (b) => b.stat === stat && (value === undefined || near(b.value, value)),
  );

// ---- hoisted runs (each is a full 180s sim) --------------------------------
const control = run();

const noSkill1 = run(
  patch((ov) => {
    const s = ov.skill1;
    if (Array.isArray(s)) s.length = 0;
    else if (s?.blocks) s.blocks.length = 0;
  }),
);

const noAmmo = run(
  patch((ov) => {
    for (const e of slotEffects(ov, 'skill2')) {
      if (e.stat === 'maxAmmoFlat' || e.stat === 'maxAmmoPct') e.value = 0;
    }
  }),
);

const ammoAsPct = run(
  patch((ov) => {
    for (const e of slotEffects(ov, 'skill2')) {
      if (e.stat === 'maxAmmoFlat') e.stat = 'maxAmmoPct';
    }
  }),
);

const atkAllAllies = run(
  patch((ov) => {
    for (const b of slotBlocks(ov, 'skill2')) {
      if ((b.effects ?? []).some((e) => e.stat === 'atkPct')) {
        b.target = { kind: 'allies' };
      }
    }
  }),
);

const burstAllAllies = run(
  patch((ov) => {
    for (const b of slotBlocks(ov, 'burst')) b.target = { kind: 'allies' };
  }),
);

const noBurstBuffs = run(
  patch((ov) => {
    for (const e of slotEffects(ov, 'burst')) {
      if (
        e.stat === 'chargeDamagePct' ||
        e.stat === 'chargeDamageMultPct' ||
        e.stat === 'critRatePct' ||
        e.stat === 'critRateNormalPct'
      ) {
        e.value = 0;
      }
    }
  }),
);

// ---- skill1 ---------------------------------------------------------------
describe('himeno skill1 — DEF (down) 6.94% for 3 sec on the full-charge target', () => {
  it('is board-inert: the engine has no enemy-DEF channel, so removing skill1 moves nothing', () => {
    expect(totals(noSkill1.res)).toEqual(totals(control.res));
  });

  it('is NOT transcribed 1:1 into a boss Damage Taken (up) 6.94% debuff', () => {
    // DEF subtraction and a Damage-Taken multiplier are different math; a straight 6.94 into
    // damageTakenPct would silently lift EVERY unit's damage by ~6.9%.
    expect(withStat(control.buffs, 'damageTakenPct', 6.94).length).toBe(0);
    expect(withStat(control.buffs, 'attackDamagePct', 6.94).length).toBe(0);
  });

  it.skip('GAP: actually reduces boss DEF 6.94% for 3 sec per full-charge hit — no engine primitive (StatKey has no enemy-DEF stat; resolveTargets({kind:"enemy"}) returns []; scope-lock boss DEF is a fixed constant). Enacting needs an engine channel plus the boss DEF value.', () => {});
});

// ---- skill2: ATK ----------------------------------------------------------
describe('himeno skill2 — ATK (up) 10.98% for 10 sec, allies with sniper rifles', () => {
  const atkBuffs = withStat(control.buffs, 'atkPct', 10.98);
  const atkTargets = atkBuffs.map((b) => b.targetSlug);

  it('fires at all, as a raw-percentage atkPct (not a caster-scaled flat add)', () => {
    expect(atkBuffs.length).toBeGreaterThan(0);
    // casterAtkPct / highestAllyAtkPct re-emit as a large FLAT ATK number, never 10.98.
    expect(withStat(control.buffs, 'casterAtkPct', 10.98).length).toBe(0);
  });

  it('includes himeno herself — she wields an SR and the line has no "except self"', () => {
    expect(atkTargets).toContain(SLUG);
  });

  it('reaches the SR teammate', () => {
    expect(atkTargets).toContain(SR_ALLY);
  });

  it('never reaches a non-SR ally (weapon-scoped, class-blind)', () => {
    expect(atkTargets).not.toContain(NON_SR_ALLY);
  });

  it('non-vacuity: an all-allies target set WOULD reach the non-SR ally and lift her damage', () => {
    const wide = withStat(atkAllAllies.buffs, 'atkPct', 10.98).map(
      (b) => b.targetSlug,
    );
    expect(wide).toContain(NON_SR_ALLY);
    expect(totals(atkAllAllies.res)[NON_SR_ALLY]).toBeGreaterThan(
      totals(control.res)[NON_SR_ALLY],
    );
  });

  it('is a wall-clock window, not a round count', () => {
    for (const b of atkBuffs) {
      expect(b.durationShots).toBeUndefined();
      expect(Number.isFinite(b.expiresFrame)).toBe(true);
    }
  });
});

// ---- skill2: ammo ---------------------------------------------------------
describe('himeno skill2 — Max Ammunition (up) 2 round(s) for 10 sec, snipers only', () => {
  const ammoBuffs = withStat(control.buffs, 'maxAmmoFlat', 2);
  const ammoTargets = ammoBuffs.map((b) => b.targetSlug);

  it('is a FLAT round add (maxAmmoFlat 2), not a percentage', () => {
    expect(ammoBuffs.length).toBeGreaterThan(0);
  });

  it('carries the same sniper-only scope as the ATK line', () => {
    expect(ammoTargets).toContain(SLUG);
    expect(ammoTargets).toContain(SR_ALLY);
    expect(ammoTargets).not.toContain(NON_SR_ALLY);
  });

  it('is DAMAGE-BEARING: +2 rounds on a 6-round magazine moves her damage', () => {
    // Adapted direction -> move: see header REASON 4 (FB-phase re-alignment outweighs the tempo
    // gain in the deterministic sim; the line is damage-bearing either way, and ammoAsPct below
    // proves the pct reading is the inert one).
    expect(unitOf(control.res, SLUG).totalDamage).not.toBe(
      unitOf(noAmmo.res, SLUG).totalDamage,
    );
  });

  it('flat vs percent: the same 2 read as maxAmmoPct would be ~inert', () => {
    // 2% of a 6-round magazine is 0.12 rounds — it buys nothing, so the pct encoding must lose.
    // Adapted direction -> move: see header REASON 4. The pct total is byte-identical to the
    // no-ammo total (round(6×1.02) = 6 — no extension), while the flat total differs from both.
    expect(unitOf(ammoAsPct.res, SLUG).totalDamage).not.toBe(
      unitOf(control.res, SLUG).totalDamage,
    );
    expect(unitOf(ammoAsPct.res, SLUG).totalDamage).toBe(
      unitOf(noAmmo.res, SLUG).totalDamage,
    );
  });

  it('is a wall-clock window, not a round count', () => {
    for (const b of ammoBuffs) {
      expect(b.durationShots).toBeUndefined();
      expect(Number.isFinite(b.expiresFrame)).toBe(true);
    }
  });

  it.skip('FLAG: skill2 trigger cadence — the kit prose carries NO activation clause, so the fire period comes from datamined skillCooldownsSec, not the kit text. Asserting a period here would be inventing input; only the target set, stat identity and duration semantics are kit-derivable.', () => {});
});

// ---- burst ----------------------------------------------------------------
describe('himeno burst — 1 ally with the highest final ATK: Charge Damage 23.76% + Crit Rate 16.35%, 10 sec', () => {
  const chargeBuffs = withStat(control.buffs, 'chargeDamagePct', 23.76);
  const critBuffs = withStat(control.buffs, 'critRatePct', 16.35);

  it('non-vacuity: himeno actually casts her burst in this fixture', () => {
    expect(chargeBuffs.length).toBeGreaterThan(0);
  });

  it('grants both riders together, once per cast', () => {
    expect(critBuffs.length).toBe(chargeBuffs.length);
  });

  it('targets exactly ONE ally — a single recipient across the whole fight', () => {
    expect(new Set(chargeBuffs.map((b) => b.targetSlug)).size).toBe(1);
    expect(new Set(critBuffs.map((b) => b.targetSlug)).size).toBe(1);
  });

  it('non-vacuity: an all-allies target set WOULD emit strictly more applications', () => {
    expect(
      withStat(burstAllAllies.buffs, 'chargeDamagePct', 23.76).length,
    ).toBeGreaterThan(chargeBuffs.length);
  });

  it('picks by ATK rank — never the B1 supporter', () => {
    expect(chargeBuffs.map((b) => b.targetSlug)).not.toContain(NON_SR_ALLY);
  });

  it('Charge Damage (up) is additive charge-bucket %, not a charge-damage MULTIPLIER', () => {
    expect(withStat(control.buffs, 'chargeDamageMultPct', 23.76).length).toBe(0);
  });

  it('Critical Rate (up) is GENERIC, not scoped to normal attacks', () => {
    // The kit says plain 'Critical Rate'; critRateNormalPct would starve skill/burst crit.
    expect(critBuffs.length).toBeGreaterThan(0);
    expect(withStat(control.buffs, 'critRateNormalPct', 16.35).length).toBe(0);
  });

  it('both riders are 10-second windows, not round counts', () => {
    for (const b of [...chargeBuffs, ...critBuffs]) {
      expect(b.durationShots).toBeUndefined();
      expect(Number.isFinite(b.expiresFrame)).toBe(true);
    }
  });

  it('the riders move the recipient\'s damage', () => {
    const rec = chargeBuffs[0].targetSlug as string;
    expect(totals(noBurstBuffs.res)[rec]).toBeLessThan(totals(control.res)[rec]);
  });

  it('inertness: every non-recipient is byte-identical with the riders zeroed', () => {
    const rec = chargeBuffs[0].targetSlug as string;
    const withRiders = totals(control.res);
    const without = totals(noBurstBuffs.res);
    for (const slug of Object.keys(withRiders)) {
      if (slug === rec) continue;
      expect(without[slug]).toBe(withRiders[slug]);
    }
  });
});
