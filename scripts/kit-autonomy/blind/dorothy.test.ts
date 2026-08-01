/**
 * dorothy — Dorothy (AR / Water / Supporter / Burst I, 60 ammo, 81f reload) — kit spec test.
 *
 * WHAT THE KIT SAYS (structure only)
 *   S1a  trigger "firing the last bullet" / all allies / Cooldown of Burst Skill ▼1.56 sec
 *   S1b  same trigger, additionally gated "during Manifestation" / all allies /
 *        Damage to Parts ▲50.68% for 5 sec
 *   S2   NO activation clause / all enemies / 216% of final ATK as Distributed Damage
 *   Ba   self / "Manifestation": Cooldown of Skill 2 ▼18 sec, lasts 10 sec
 *   Bb   self / Gain Pierce for 10 sec
 *   Bc   designated enemy / "Brand": accumulates damage over 10 sec, released as Distributed
 *        Damage at window end, max 8900.83% of the skill user's final ATK
 *
 * FIXTURE
 *   controlComp('dorothy', true) — liter B1 / crown B2 / dorothy (carry slot) / helm B3.
 *   dorothy is BURST I and therefore shares the B1 stage with liter, so the stock rotation can
 *   hand every B1 cast to liter and leave her burst blocks unexercised. Every burst-slot
 *   assertion therefore runs on a fixture that pushes a damage-free { burstFirst } block onto her
 *   burst slot: that only changes WHO wins the B1 slot — it adds no damage, no buff, no trigger —
 *   so the burst lines are non-vacuous by construction. skill1/skill2 lines use the stock comp.
 *
 * WHY EACH ASSERTION DISCRIMINATES
 *   - The burst-CDR line is proved by FULL BURST COUNT, not by totals: strip the burstCdr effect
 *     and the long-cooldown B2/B3 slots gate the rotation, so the fight loses full bursts.
 *     Re-scoping it to self (the nearest-wrong target set) recovers only a sliver, because the
 *     chain also needs liter/crown/helm off cooldown.
 *   - The parts buff is damage-inert on the partless scope-lock boss, so it is proved
 *     STRUCTURALLY (stat / value / duration / target) plus a gate-bite run: clearing the
 *     Manifestation gate makes it fire on EVERY magazine, so the gated model must emit strictly
 *     fewer applications — and more than zero. Its damage inertness is asserted directly.
 *   - S2 is proved by linearity: doubling atkPct must add exactly the contribution that removing
 *     it takes away. That fails under any model where the block is not the sole S2 damage source,
 *     or where the 216% is not applied once per proc.
 *   - Brand is proved the same way (half the cap → half the delta), plus structural delaySec ≈ 10:
 *     the payload lands when the 10s window ENDS, so its Full-Burst exposure must be a TIMING
 *     outcome, never a hardcoded noFb exemption.
 *
 * FLAGGED (⚑) — outside the input domain, asserted structurally only:
 *   - S2 has no activation clause and no stated cooldown; its cadence is the datamined skill CD
 *     (interval trigger). The test pins the TRIGGER KIND, never the seconds.
 *   - Brand's 8900.83% is a CAP on accumulated damage, not a fixed payload; the engine can only
 *     deal the cap, so a low-damage window is over-credited (see the skipped test).
 */
import { describe, expect, it } from 'vitest';
import type { Block, EffectDef } from '../../../src/skills/types.js';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'dorothy';

type AnyEv = SimEvent & Record<string, unknown>;

interface OvShape {
  skill1?: Block[];
  skill2?: Block[];
  burst?: Block[];
  hasPierce?: boolean;
}

/** committed override, untouched clone — the structural source of truth for shape assertions */
const shipped = withPatchedOverride(SLUG, () => {}) as unknown as OvShape;

function patched(mutate: (ov: OvShape) => void) {
  return withPatchedOverride(SLUG, (o) => {
    mutate(o as unknown as OvShape);
  });
}

function run(ov?: ReturnType<typeof withPatchedOverride>) {
  const events: AnyEv[] = [];
  const opts = controlComp(SLUG, true);
  if (ov) {
    opts.overrides = { ...opts.overrides, [SLUG]: ov } as typeof opts.overrides;
  }
  opts.cfg = {
    ...opts.cfg,
    onEvent: (ev: SimEvent) => {
      events.push(ev as AnyEv);
    },
  } as typeof opts.cfg;
  const res = runComp(opts);
  const t = totals(res);
  return { events, t, dmg: t[SLUG] ?? 0 };
}

const evOf = (evs: AnyEv[], kind: string) => evs.filter((e) => e.kind === kind);
const fbCount = (evs: AnyEv[]) => evOf(evs, 'fullBurstStart').length;
const partsApplies = (evs: AnyEv[]) =>
  evOf(evs, 'buffApply').filter((e) => String(e.stat) === 'partsDamagePct');

const atkPctOf = (e: EffectDef): number | undefined =>
  (e as unknown as { atkPct?: number }).atkPct;

const isBurstCdr = (e: EffectDef) => e.kind === 'burstCdr';
const isPartsBuff = (e: EffectDef) =>
  e.kind === 'buff' && e.stat === 'partsDamagePct';
const isPierce = (e: EffectDef) => e.kind === 'gainPierce';
const isDamage = (e: EffectDef) =>
  e.kind === 'flatDamage' || e.kind === 'dot' || e.kind === 'storedHit';
/** locator for the Brand payload — nothing else in this kit is anywhere near 1000% of ATK */
const isBig = (e: EffectDef) => (atkPctOf(e) ?? 0) > 1000;

function stripEffect(
  blocks: Block[] | undefined,
  pred: (e: EffectDef) => boolean
): void {
  for (const b of blocks ?? []) {
    b.effects = b.effects.filter((e) => !pred(e));
  }
}

function scaleEffect(
  blocks: Block[] | undefined,
  pred: (e: EffectDef) => boolean,
  factor: number
): void {
  for (const b of blocks ?? []) {
    for (const e of b.effects) {
      if (!pred(e)) {
        continue;
      }
      const v = atkPctOf(e);
      if (v !== undefined) {
        (e as unknown as { atkPct: number }).atkPct = v * factor;
      }
    }
  }
}

const GATE_KEYS = [
  'fbGate',
  'ownBurstGate',
  'mode',
  'resourceGate',
  'requiresTargetStatus',
  'swapGate',
  'requiresShielded',
  'bossElementGate',
  'everyN',
  'teamHas',
  'formation',
  'requiresCore',
] as const;

function gatesOn(b: Block): string[] {
  const rec = b as unknown as Record<string, unknown>;
  return GATE_KEYS.filter((k) => rec[k] !== undefined);
}

function clearGates(
  blocks: Block[] | undefined,
  pred: (b: Block) => boolean
): void {
  for (const b of blocks ?? []) {
    if (!pred(b)) {
      continue;
    }
    const rec = b as unknown as Record<string, unknown>;
    for (const k of GATE_KEYS) {
      delete rec[k];
    }
  }
}

/** damage-free rotation fixture: makes dorothy (a Burst I sharing the stage with liter) cast */
const burstFirstBlock = (): Block =>
  ({
    slot: 'burst',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstFirst' }],
  }) as unknown as Block;

function withBurstFirst(extra?: (ov: OvShape) => void) {
  return patched((ov) => {
    (ov.burst ??= []).push(burstFirstBlock());
    extra?.(ov);
  });
}

// ---- hoisted runs (each is a full 180s sim) --------------------------------------------------
const base = run();
const noCdr = run(patched((ov) => stripEffect(ov.skill1, isBurstCdr)));
const cdrSelfOnly = run(
  patched((ov) => {
    for (const b of ov.skill1 ?? []) {
      if (b.effects.some(isBurstCdr)) {
        b.target = { kind: 'self' };
      }
    }
  })
);
const noS2 = run(patched((ov) => stripEffect(ov.skill2, isDamage)));
const s2Doubled = run(patched((ov) => scaleEffect(ov.skill2, isDamage, 2)));

const bf = run(withBurstFirst());
const bfNoParts = run(
  withBurstFirst((ov) => stripEffect(ov.skill1, isPartsBuff))
);
const bfPartsUngated = run(
  withBurstFirst((ov) =>
    clearGates(ov.skill1, (b) => b.effects.some(isPartsBuff))
  )
);
const bfNoPierce = run(withBurstFirst((ov) => stripEffect(ov.burst, isPierce)));
const bfNoBrand = run(withBurstFirst((ov) => scaleEffect(ov.burst, isBig, 0)));
const bfHalfBrand = run(
  withBurstFirst((ov) => scaleEffect(ov.burst, isBig, 0.5))
);

// ---- S1a: last bullet -> Cooldown of Burst Skill ▼1.56 sec, all allies -----------------------
describe('dorothy S1a — last bullet: burst cooldown ▼1.56s to all allies', () => {
  const blocks = (shipped.skill1 ?? []).filter((b) =>
    b.effects.some(isBurstCdr)
  );

  it('is ONE ungated lastBullet block granting 1.56s of burst CDR to all allies', () => {
    expect(blocks).toHaveLength(1);
    const b = blocks[0] as Block;
    expect(b.trigger.kind).toBe('lastBullet');
    expect(b.target.kind).toBe('allies');
    expect(
      (b.target as unknown as { excludeSelf?: boolean }).excludeSelf
    ).toBeFalsy();
    // this line carries NO "during Manifestation" clause — merging it with S1b would gate it
    expect(gatesOn(b)).toEqual([]);
    const cdr = b.effects.find(isBurstCdr) as unknown as {
      seconds: number;
      oncePerBattle?: boolean;
    };
    expect(cdr.seconds).toBeCloseTo(1.56, 3);
    expect(cdr.oncePerBattle).toBeFalsy();
  });

  it('drives the rotation: stripping it costs full bursts', () => {
    expect(fbCount(base.events)).toBeGreaterThan(0);
    expect(fbCount(base.events)).toBeGreaterThan(fbCount(noCdr.events));
  });

  it('is ALLY-wide, not self-only (the nearest-wrong target set loses full bursts)', () => {
    expect(fbCount(base.events)).toBeGreaterThan(fbCount(cdrSelfOnly.events));
    expect(fbCount(cdrSelfOnly.events)).toBeGreaterThanOrEqual(
      fbCount(noCdr.events)
    );
  });
});

// ---- S1b: last bullet during Manifestation -> Damage to Parts ▲50.68% / 5s -------------------
describe('dorothy S1b — last bullet during Manifestation: Damage to Parts ▲50.68% for 5s', () => {
  const blocks = (shipped.skill1 ?? []).filter((b) =>
    b.effects.some(isPartsBuff)
  );

  it('is a GATED lastBullet block granting partsDamagePct 50.68 for 5s to all allies', () => {
    expect(blocks).toHaveLength(1);
    const b = blocks[0] as Block;
    expect(b.trigger.kind).toBe('lastBullet');
    expect(b.target.kind).toBe('allies');
    const buff = b.effects.find(isPartsBuff) as unknown as {
      value: number;
      durationSec?: number;
    };
    expect(buff.value).toBeCloseTo(50.68, 2);
    expect(buff.durationSec).toBe(5);
    // "during Manifestation" is a WINDOW gate; the ungated model fires on every magazine
    expect(gatesOn(b).length).toBeGreaterThan(0);
  });

  it('the Manifestation gate bites: >0 applications, strictly fewer than the ungated model', () => {
    const gated = partsApplies(bf.events).length;
    const ungated = partsApplies(bfPartsUngated.events).length;
    expect(gated).toBeGreaterThan(0);
    expect(gated).toBeLessThan(ungated);
  });

  it('is damage-INERT on the partless scope-lock boss (encoded for kit completeness)', () => {
    expect(bfNoParts.t).toEqual(bf.t);
  });
});

// ---- S2: Scorch to Dust ----------------------------------------------------------------------
describe('dorothy S2 — Scorch to Dust: 216% of final ATK as Distributed Damage', () => {
  const blocks = (shipped.skill2 ?? []).filter((b) => b.effects.some(isDamage));

  it('is ONE enemy-targeted interval block: flatDamage 216%, distributed, no core, no noFb', () => {
    expect(blocks).toHaveLength(1);
    const b = blocks[0] as Block;
    expect(b.target.kind).toBe('enemy');
    // no activation clause in the kit line -> interval cadence (⚑ the SECONDS are datamined)
    expect(b.trigger.kind).toBe('interval');
    const dmg = b.effects.filter(isDamage);
    expect(dmg).toHaveLength(1);
    const e = dmg[0] as unknown as {
      kind: string;
      atkPct: number;
      flavor?: string;
      core?: boolean;
      noFb?: boolean;
    };
    expect(e.kind).toBe('flatDamage');
    expect(e.atkPct).toBeCloseTo(216, 2);
    expect(e.flavor).toBe('distributed');
    expect(e.core).toBeFalsy();
    // riders take Full Burst by TIMING; a per-kit noFb exemption is measured-only
    expect(e.noFb).toBeFalsy();
  });

  it('contributes damage and scales linearly with atkPct', () => {
    const contribution = base.dmg - noS2.dmg;
    expect(contribution).toBeGreaterThan(0);
    const doubled = s2Doubled.dmg - base.dmg;
    expect(doubled / contribution).toBeGreaterThan(0.9);
    expect(doubled / contribution).toBeLessThan(1.1);
  });

  it('fires on a skill cadence, not per shot or per hit', () => {
    const s2Hits = evOf(base.events, 'damage').filter(
      (e) => String(e.srcSlot) === 'skill2'
    );
    expect(s2Hits.length).toBeGreaterThan(2);
    expect(s2Hits.length).toBeLessThan(200);
  });

  it('moves nobody else: teammate totals are byte-identical when it is stripped', () => {
    for (const slug of Object.keys(base.t)) {
      if (slug === SLUG) {
        continue;
      }
      expect(noS2.t[slug]).toBe(base.t[slug]);
    }
  });

  it.skip('⚑ the interval SECONDS are a datamined skill cooldown, not kit text — unpinned until measured', () => {});
});

// ---- burst: Manifestation / Pierce / Brand ----------------------------------------------------
describe('dorothy burst — Manifestation, Gain Pierce 10s, Brand', () => {
  it('Gain Pierce is a TIMED 10s effect, not the whole-fight hasPierce flag', () => {
    expect(shipped.hasPierce).not.toBe(true);
    const pierce = (shipped.burst ?? [])
      .flatMap((b) => b.effects)
      .filter(isPierce);
    expect(pierce).toHaveLength(1);
    expect((pierce[0] as unknown as { durationSec?: number }).durationSec).toBe(
      10
    );
  });

  it('the pierce window is damage-inert in this comp (no Pierce Damage ▲ consumer present)', () => {
    expect(bfNoPierce.t).toEqual(bf.t);
  });

  it('Brand is ONE delayed distributed payload at 8900.83% of final ATK, released at window end', () => {
    const big = (shipped.burst ?? []).flatMap((b) => b.effects).filter(isBig);
    expect(big).toHaveLength(1);
    const e = big[0] as unknown as {
      kind: string;
      atkPct: number;
      flavor?: string;
      delaySec?: number;
      core?: boolean;
      noFb?: boolean;
    };
    expect(e.kind).toBe('flatDamage');
    expect(e.atkPct).toBeCloseTo(8900.83, 2);
    expect(e.flavor).toBe('distributed');
    // "once the duration ends" -> lands 10s after the cast; FB exposure is a timing outcome,
    // so a hardcoded noFb exemption is the nearest-wrong encoding
    expect(e.delaySec).toBeCloseTo(10, 3);
    expect(e.noFb).toBeFalsy();
    expect(e.core).toBeFalsy();
    const holder = (shipped.burst ?? []).find((b) =>
      b.effects.some(isBig)
    ) as Block;
    expect(holder.trigger.kind).toBe('burstCast');
    expect(holder.target.kind).toBe('enemy');
  });

  it('Brand actually lands, and its payload scales linearly with the cap', () => {
    const full = bf.dmg - bfNoBrand.dmg;
    const half = bfHalfBrand.dmg - bfNoBrand.dmg;
    expect(full).toBeGreaterThan(0);
    expect(half / full).toBeGreaterThan(0.45);
    expect(half / full).toBeLessThan(0.55);
  });

  it.skip('GAP — Manifestation "Cooldown of Skill 2 ▼18 sec for 10 sec": no primitive shortens an interval trigger for a window (burstCdr covers BURST cooldowns only), so the extra S2 procs the burst is supposed to buy are either hand-authored as separate effects or silently missing', () => {});

  it.skip('GAP/⚑ — Brand accumulates damage up to a CAP: the engine has no damage-accumulation channel, so the payload is always dealt at the 8900.83% maximum and any window that deals less than the cap is over-credited', () => {});
});
