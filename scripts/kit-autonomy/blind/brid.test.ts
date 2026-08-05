/**
 * brid — BLIND per-unit kit spec test.
 *
 * Written from the kit prose ALONE (S5 cross-family blind post-op). No driver test, override,
 * reasoning or truth file was consulted; every counterfactual below is built by MUTATING the
 * shipped override in memory (withPatchedOverride), never by reading its authoring choices.
 *
 * KIT (AR / Water / Attacker / Burst III, cd 40s, ammo 60, hitsPerShot 1):
 *   skill1  "Activates after 30 normal attacks. Affects self."  ATK ▲18.52% for 10 sec.
 *   skill2  "Affects the enemy with the highest final DEF."      Deals 211.2% of final ATK.
 *   burst   "Affects the enemy with the highest final DEF."      Deals 1440% of final ATK.
 *           "Affects the same target when at Max HP."            Deals 1440% additional damage.
 *
 * FIXTURE: controlComp('brid') — liter (B1) / crown (B2) / brid (B3) / helm (B3), boss Fire,
 * focus brid. brid is a lone Burst III without B1+B2, and a lone B3 makes ZERO Full Bursts, so
 * the control core is REQUIRED for her burst slot to be exercised at all.
 *
 * THE FOUR QUESTIONS, per line, and why each assertion discriminates:
 *
 * skill1 — scope: plain "ATK ▲", NOT scoped to normal attacks ⇒ generic `atkPct` (a self-scaling
 *   percentage, not `casterAtkPct`). Duration: "for 10 sec" is WALL-CLOCK, not "for N round(s)"
 *   ⇒ a finite expiresFrame and NO durationShots. Trigger: "after 30 normal attacks" is a ROUND
 *   counter, so applications must track brid's own rounds fired / 30 — nearest-wrong is keying it
 *   to her burst (or to Full Burst entry), which collapses ~30+ applications to a handful.
 *   Target: "Affects self" ⇒ teammates must never receive it; nearest-wrong is `allies`, which
 *   moves liter's total.
 *   NON-VACUITY: extending the window (×6) must RAISE brid's damage and shortening it must LOWER
 *   it. Extension only helps if base uptime is < 100%, i.e. the fixture genuinely exercises both
 *   the buffed and the unbuffed state — that pair of assertions IS the non-vacuity proof.
 *
 * skill2 — the prose gives NO activation clause, so the trigger is ⚑ INVENTED (the ALWAYS-⚑
 *   "damage line with no stated trigger" case). A blind spec must NOT assert a specific cadence;
 *   it asserts the line CONTRIBUTES, and that it is neither per-shot nor Full-Burst-keyed —
 *   the two nearest-wrong readings a silent trigger invites. Per-shot on a 60-round AR would
 *   dwarf her whole damage profile; FB-keyed would make patching the trigger TO fullBurstEnter
 *   a no-op.
 *
 * burst — the first 1440% is unconditional. The second is gated on "the same target … at Max HP":
 *   the target is the enemy (highest final DEF), and a 180s raid boss is below max HP from the
 *   first second of the fight, while brid's earliest cast is many seconds in. The faithful model
 *   therefore credits ONE 1440% instance, not two.
 *   ⚑ FORK, flagged rather than hidden: if the clause is instead read as gating on the CASTER's
 *   HP, then at scope lock (immortal boss, nobody takes damage) brid is always at max HP and the
 *   branch would ALWAYS apply — a ×2 burst difference. The prose's subject is "the same target",
 *   so this spec takes the enemy reading; the assertion below is deliberately the one that goes
 *   RED if the shipped model took the other fork, because that divergence is the payload.
 *   Discrimination: duplicating the burst's flatDamage must exactly DOUBLE the burst's damage
 *   contribution (ratio 2.00). Under a two-instance model the same patch yields 3 instances and
 *   the ratio is 1.50.
 *
 * INERTNESS: brid's kit grants nothing outside herself — no buff she casts may land on a teammate.
 *
 * Runs are hoisted (10 full 180s sims, deterministic — no seed).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

/** Structural view of an event — the union's per-kind fields, all optional. */
interface EvAny {
  kind: string;
  stat?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
  srcSlot?: number;
  slot?: number | string;
  idx?: number;
  slug?: string;
  bucket?: string;
}
const asEv = (e: SimEvent): EvAny => e as unknown as EvAny;

const FIXTURE = controlComp('brid');
const BRID = FIXTURE.slugs.indexOf('brid');

type Ov = ReturnType<typeof withPatchedOverride>;

function run(ov?: Ov) {
  const evs: EvAny[] = [];
  const res = runComp({
    ...FIXTURE,
    ...(ov ? { overrides: { brid: ov } } : {}),
    cfg: { onEvent: (e: SimEvent) => evs.push(asEv(e)) },
  });
  return { evs, t: totals(res) };
}

/** Is this event attributable to brid? (kind-dependent field naming, so accept any of them.) */
const isBrid = (e: EvAny): boolean =>
  e.srcSlot === BRID || e.slot === BRID || e.idx === BRID || e.slug === 'brid';

/** brid's rounds fired: shot events if the engine emits them, else her normal-bucket hits. */
function bridRounds(evs: EvAny[]): number {
  const shots = evs.filter((e) => e.kind === 'shot' && isBrid(e)).length;
  if (shots > 0) {
    return shots;
  }
  return evs.filter(
    (e) =>
      e.kind === 'damage' &&
      isBrid(e) &&
      String(e.bucket ?? '')
        .toLowerCase()
        .includes('normal')
  ).length;
}

/** Buffs brid herself casts. */
const bridBuffs = (evs: EvAny[]): EvAny[] =>
  evs.filter((e) => e.kind === 'buffApply' && e.casterIdx === BRID);

// ---- counterfactual overrides --------------------------------------------------------
// Each mutates the WHOLE slot generically (never a hand-picked block index), so the patch is
// independent of how the shipped override happens to be laid out.

const s1AlliesOv = withPatchedOverride('brid', (ov) => {
  for (const b of ov.skill1 ?? []) {
    b.target = { kind: 'allies' };
  }
});

const s1BurstOv = withPatchedOverride('brid', (ov) => {
  for (const b of ov.skill1 ?? []) {
    b.trigger = { kind: 'burstCast' };
  }
});

const scaleS1Duration = (factor: number) =>
  withPatchedOverride('brid', (ov) => {
    let touched = 0;
    for (const b of ov.skill1 ?? []) {
      for (const e of b.effects ?? []) {
        if (e.kind === 'buff' && typeof e.durationSec === 'number') {
          e.durationSec = e.durationSec * factor;
          touched++;
        }
      }
    }
    if (touched === 0) {
      throw new Error(
        'brid skill1: no time-bounded buff to scale — the kit says "for 10 sec"'
      );
    }
  });

const s1LongOv = scaleS1Duration(6);
const s1ShortOv = scaleS1Duration(0.05);

const s2ShotOv = withPatchedOverride('brid', (ov) => {
  for (const b of ov.skill2 ?? []) {
    b.trigger = { kind: 'shotFired' };
  }
});

const s2FbOv = withPatchedOverride('brid', (ov) => {
  for (const b of ov.skill2 ?? []) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});

const s2NoneOv = withPatchedOverride('brid', (ov) => {
  ov.skill2 = [];
});

const burstNoneOv = withPatchedOverride('brid', (ov) => {
  ov.burst = [];
});

const burstDoubleOv = withPatchedOverride('brid', (ov) => {
  for (const b of ov.burst ?? []) {
    const fd = (b.effects ?? []).find(
      (e: { kind: string }) => e.kind === 'flatDamage'
    );
    if (fd) {
      b.effects.push(JSON.parse(JSON.stringify(fd)));
      return;
    }
  }
  throw new Error(
    'brid burst: no flatDamage effect — the kit deals 1440% of final ATK'
  );
});

// ---- hoisted runs --------------------------------------------------------------------

const base = run();
const s1Allies = run(s1AlliesOv);
const s1Burst = run(s1BurstOv);
const s1Long = run(s1LongOv);
const s1Short = run(s1ShortOv);
const s2Shot = run(s2ShotOv);
const s2Fb = run(s2FbOv);
const s2None = run(s2NoneOv);
const burstNone = run(burstNoneOv);
const burstDouble = run(burstDoubleOv);

describe('brid — fixture sanity', () => {
  it('brid sits in the control comp and fires a real AR magazine cycle', () => {
    expect(BRID).toBeGreaterThanOrEqual(0);
    expect(base.t.brid).toBeGreaterThan(0);
    // If this is 0 the event shape changed and every round-count assertion below is void.
    expect(bridRounds(base.evs)).toBeGreaterThan(300);
  });
});

describe('brid skill1 — "ATK ▲18.52% for 10 sec", after 30 normal attacks, self', () => {
  it('applies a generic 18.52% atkPct buff to herself, repeatedly', () => {
    const buffs = bridBuffs(base.evs);
    expect(buffs.length).toBeGreaterThan(1);
    // SCOPE: plain "ATK ▲" is the self-scaling percentage stat, not a caster-scaled flat add
    // (which would emit as casterAtkPct with a flat ATK value) and not a normal-attack-scoped
    // stat. Her kit carries exactly one buff line, so every buff she casts must be this one.
    expect(buffs.every((e) => e.stat === 'atkPct')).toBe(true);
    expect(buffs[0].value).toBeCloseTo(18.52, 2);
  });

  it('is ROUND-triggered every 30 rounds — not keyed to her burst', () => {
    const rounds = bridRounds(base.evs);
    const applies = bridBuffs(base.evs).length;
    const expected = Math.floor(rounds / 30);
    // "after 30 normal attacks" counts ROUNDS (1 per pull at hitsPerShot 1), spanning reloads.
    expect(applies).toBeGreaterThanOrEqual(expected - 2);
    expect(applies).toBeLessThanOrEqual(expected + 2);
    // NEAREST-WRONG: keyed to her own burst cast. She bursts a handful of times in 180s, so a
    // burst-keyed model cannot reach the round-driven application count.
    expect(s1Burst.evs.filter((e) => e.kind === 'buffApply' && e.casterIdx === BRID).length).toBeLessThan(15);
    expect(applies).toBeGreaterThan(
      3 * bridBuffs(s1Burst.evs).length
    );
  });

  it('is time-bounded at 10 sec — not permanent, not a round-count window', () => {
    const b = bridBuffs(base.evs)[0];
    // "for 10 sec" is wall-clock. A "for N round(s)" line would carry durationShots instead.
    expect(b.durationShots).toBeUndefined();
    expect(typeof b.expiresFrame).toBe('number');
    expect(Number.isFinite(b.expiresFrame)).toBe(true);
    // NON-VACUITY + duration is load-bearing in BOTH directions: extending the window can only
    // add damage if base uptime is under 100% (so the fixture exercises the unbuffed state too),
    // and collapsing it must cost damage (so the buff is actually live some of the time).
    expect(s1Long.t.brid).toBeGreaterThan(base.t.brid);
    expect(s1Short.t.brid).toBeLessThan(base.t.brid);
  });

  it('is SELF-scoped — no teammate ever receives it', () => {
    const leaked = bridBuffs(base.evs).filter((e) => e.targetSlug !== 'brid');
    expect(leaked).toEqual([]);
    // NEAREST-WRONG: "Affects self" mis-encoded as allies. It moves the team, which self cannot.
    expect(s1Allies.t.liter).not.toBe(base.t.liter);
    expect(s1Allies.t.crown).not.toBe(base.t.crown);
  });
});

describe('brid skill2 — "Deals 211.2% of final ATK" (⚑ no stated trigger)', () => {
  it('contributes recurring damage of its own', () => {
    expect(base.t.brid).toBeGreaterThan(s2None.t.brid);
  });

  it('is NOT a per-shot rider', () => {
    // A 211.2%-of-ATK hit on every pull of a 60-round AR would be the dominant damage source.
    // If the shipped model were already per-shot, this patch would be a no-op (ratio 1.0).
    expect(s2Shot.t.brid).toBeGreaterThan(2 * base.t.brid);
  });

  it('is NOT keyed to Full Burst entry', () => {
    // The prose carries no activation clause at all; "during Full Burst" is a distinct, absent
    // wording. If the shipped model were FB-keyed this patch would be a no-op.
    expect(s2Fb.t.brid).not.toBe(base.t.brid);
  });

  it.skip('⚑ exact cadence of the 211.2% line is UNKNOWABLE from the prose — the kit states no trigger, so any specific period (interval seconds / hit count) is an invented value and must be flagged, not asserted. Recipe: read the datamined skill cooldown, or count the 211.2%-tier popups per magazine on a focus recording.', () => {
    // intentionally unimplemented
  });
});

describe('brid burst — 1440%, plus a 1440% rider gated on the target being at Max HP', () => {
  it('casts and lands burst damage', () => {
    expect(base.evs.some((e) => e.kind === 'burstCast')).toBe(true);
    expect(base.t.brid).toBeGreaterThan(burstNone.t.brid);
  });

  it('credits exactly ONE 1440% instance — the Max-HP branch is inert against the raid boss', () => {
    const oneInstance = base.t.brid - burstNone.t.brid;
    const twoInstances = burstDouble.t.brid - burstNone.t.brid;
    expect(oneInstance).toBeGreaterThan(0);
    // Duplicating the burst's flatDamage must exactly double the burst's contribution. Under the
    // nearest-wrong model (both 1440% lines always active) the patch adds a THIRD instance and
    // the ratio is 1.50, not 2.00.
    expect(twoInstances / oneInstance).toBeGreaterThan(1.95);
    expect(twoInstances / oneInstance).toBeLessThan(2.05);
  });
});

describe('brid — inertness', () => {
  it('grants nothing to anyone but herself', () => {
    const outward = bridBuffs(base.evs).filter((e) => e.targetSlug !== 'brid');
    expect(outward).toEqual([]);
  });

  it('the two damage lines move brid only — patching them out leaves her kit\u2019s buff scope intact', () => {
    // Removing skill2 must not turn her self-buff into a team buff or vice versa.
    expect(bridBuffs(s2None.evs).every((e) => e.targetSlug === 'brid')).toBe(true);
    expect(bridBuffs(burstNone.evs).every((e) => e.targetSlug === 'brid')).toBe(true);
  });
});
