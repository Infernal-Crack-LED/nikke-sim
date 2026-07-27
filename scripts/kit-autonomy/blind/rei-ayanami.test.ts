/**
 * rei-ayanami — BLIND per-unit kit spec test (written from the kit prose alone).
 *
 * KIT (MG / Fire / Attacker / Burst III, ammo 300, normalMult 5.57, coreMult 200):
 *  S1a  'Activates after 100 normal attack(s)' / self -> Elemental Advantage Attack Damage +30.23% for 3 sec
 *  S1b  'Activates after landing 100 normal attack(s)' / nearest enemy -> 112.37% of final ATK
 *  S2a  'Activates at the start of battle' / self -> Damage dealt to Shield +700.5% continuously   [GAP]
 *  S2b  'Activates when entering Burst stage 3' / all Fire Code allies -> ATK +25.03% OF THE SKILL
 *       USER'S ATK for 10 sec
 *  Ba   burst / all Fire Code allies -> Shield = 13.44% of caster final Max HP for 10 sec  [tandem-inert here]
 *  Bb   burst / all Fire Code allies -> Attack Damage +48.02% for 10 sec
 *  Bc   burst / all enemies -> 990.2% of final ATK
 *
 * FIXTURE: controlComp('rei-ayanami', true) = liter B1 / crown B2 / rei B3 / helm B3 vs the Fire boss.
 *   - B1+B2 are mandatory: a lone Burst III unit casts nothing and the fight makes ZERO Full Bursts.
 *   - helm=true deliberately keeps a SECOND Burst III in the team. That is what makes 'entering Burst
 *     stage 3' (fires on ANY stage-3 entry) separable from 'when this unit bursts' (only her own
 *     rotations) — the trigger-identity trap for S2b.
 *   - helm=false is used ONLY where damage events are attributed by srcSlot (helm's burst also emits
 *     srcSlot 'burst'; liter's and crown's bursts carry no damage effects).
 *   - rei is Fire and the control boss is Fire, so she has NO elemental advantage in this fixture and
 *     S1a's MAGNITUDE is unobservable. That is turned into a discriminator: a faithful
 *     elemAdvantageDamagePct encoding must be damage-INERT when scaled 10x, whereas the nearest-wrong
 *     encoding (a generic attackDamagePct / elementDamagePct) would move damage.
 *
 * Counterfactuals use withPatchedOverride (committed JSON untouched). Every patch helper THROWS when
 * it cannot find the kit line it is supposed to mutate, so a MISSING line surfaces as ok===false on a
 * named variant instead of as a silently passing assertion.
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

const SLUG = 'rei-ayanami';
const FPS = 60;

type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

interface RunOut {
  ok: boolean;
  error: string | null;
  total: number;
  team: Record<string, number>;
  events: Ev[];
}

// The override FILE is slot-keyed; each slot is either a raw Block[] or a CharacterSkills carrying
// its own blocks[]. Accept both shapes so the test pins the KIT, not the container.
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s;
  }
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function needFx(ov: any, slot: Slot, what: string, pred: (e: any) => boolean) {
  for (const b of blocksOf(ov, slot)) {
    const fx: any[] = b.effects ?? [];
    const i = fx.findIndex(pred);
    if (i >= 0) {
      return { block: b, effect: fx[i] };
    }
  }
  throw new Error(
    `MISSING kit line: ${slot} carries no effect matching ${what}`
  );
}

function dropFx(
  ov: any,
  slot: Slot,
  what: string,
  pred: (e: any) => boolean
): void {
  const hit = needFx(ov, slot, what, pred);
  hit.block.effects = (hit.block.effects as any[]).filter(
    (e) => e !== hit.effect
  );
}

const isRider = (e: any) =>
  e.kind === 'flatDamage' && Math.abs(e.atkPct - 112.37) < 0.5;
const isElem = (e: any) =>
  e.kind === 'buff' && e.stat === 'elemAdvantageDamagePct';
const isS2Atk = (e: any) =>
  e.kind === 'buff' &&
  e.stat === 'casterAtkPct' &&
  Math.abs(e.value - 25.03) < 0.5;
const isBurstAd = (e: any) =>
  e.kind === 'buff' &&
  e.stat === 'attackDamagePct' &&
  Math.abs(e.value - 48.02) < 0.5;
const isNuke = (e: any) =>
  e.kind === 'flatDamage' && Math.abs(e.atkPct - 990.2) < 1;
const isShield = (e: any) => e.kind === 'shield';

function doRun(over: Record<string, any> | null, helm: boolean) {
  const opts: any = controlComp(SLUG, helm);
  const events: Ev[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as Ev);
    },
  };
  if (over) {
    opts.overrides = { ...(opts.overrides ?? {}), ...over };
  }
  const res = runComp(opts);
  const t = totals(res);
  const team: Record<string, number> = {};
  for (const k of Object.keys(t)) {
    if (k !== SLUG) {
      team[k] = t[k];
    }
  }
  const row: any = unitOf(res, SLUG);
  return { total: (row?.totalDamage as number) ?? t[SLUG], team, events };
}

function variant(mutate: (ov: any) => void, helm = true): RunOut {
  try {
    const patched = withPatchedOverride(SLUG, mutate as any);
    return { ok: true, error: null, ...doRun({ [SLUG]: patched }, helm) };
  } catch (e: any) {
    return {
      ok: false,
      error: String(e?.message ?? e),
      total: NaN,
      team: {},
      events: [],
    };
  }
}

const buffApplies = (evs: Ev[], stat: string) =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === stat);
const fullBursts = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;
const dmgFromSlot = (evs: Ev[], slot: string) =>
  evs.filter((e) => e.kind === 'damage' && e.srcSlot === slot);
const sum = (m: Record<string, number>) =>
  Object.values(m).reduce((a, b) => a + b, 0);

// ---- hoisted runs (each is a full 180s sim) ------------------------------------------------
const base = doRun(null, true);
const baseNoHelm = doRun(null, false);

const noRider = variant((ov) =>
  dropFx(ov, 'skill1', 'flatDamage 112.37%', isRider)
);
const riderEveryShot = variant((ov) => {
  needFx(ov, 'skill1', 'flatDamage 112.37%', isRider).block.trigger = {
    kind: 'shotFired',
  };
});
const riderNoCrit = variant((ov) => {
  needFx(ov, 'skill1', 'flatDamage 112.37%', isRider).effect.crit = false;
});
const riderCore = variant((ov) => {
  needFx(ov, 'skill1', 'flatDamage 112.37%', isRider).effect.core = true;
});
const elemBig = variant((ov) => {
  needFx(ov, 'skill1', 'elemAdvantageDamagePct buff', isElem).effect.value =
    302.3;
});

const noS2Atk = variant((ov) =>
  dropFx(ov, 'skill2', 'casterAtkPct 25.03 buff', isS2Atk)
);
const s2AtkBurstCast = variant((ov) => {
  needFx(ov, 'skill2', 'casterAtkPct 25.03 buff', isS2Atk).block.trigger = {
    kind: 'burstCast',
  };
});
const s2AtkAllAllies = variant((ov) => {
  needFx(ov, 'skill2', 'casterAtkPct 25.03 buff', isS2Atk).block.target = {
    kind: 'allies',
  };
});
const s2AtkLong = variant((ov) => {
  needFx(ov, 'skill2', 'casterAtkPct 25.03 buff', isS2Atk).effect.durationSec =
    60;
});

const noBurstAd = variant((ov) =>
  dropFx(ov, 'burst', 'attackDamagePct 48.02 buff', isBurstAd)
);
const burstAdAllAllies = variant((ov) => {
  needFx(ov, 'burst', 'attackDamagePct 48.02 buff', isBurstAd).block.target = {
    kind: 'allies',
  };
});
const burstAdLong = variant((ov) => {
  needFx(
    ov,
    'burst',
    'attackDamagePct 48.02 buff',
    isBurstAd
  ).effect.durationSec = 60;
});
const noBurstNuke = variant((ov) =>
  dropFx(ov, 'burst', 'flatDamage 990.2%', isNuke)
);
const noShield = variant((ov) =>
  dropFx(ov, 'burst', 'shield effect', isShield)
);

describe('rei-ayanami — kit spec', () => {
  it('fixture is non-vacuous: she fires, and the team actually chains Full Bursts', () => {
    expect(base.total).toBeGreaterThan(0);
    // A lone B3 makes ZERO full bursts; liter+crown are what make every burst-keyed line testable.
    expect(fullBursts(base.events)).toBeGreaterThanOrEqual(2);
    expect(Object.keys(base.team).length).toBeGreaterThanOrEqual(3);
  });

  // ---- S1a: Elemental Advantage Attack Damage +30.23% for 3 sec, self, every 100 normal attacks --
  it('S1a: self-scoped, 30.23, TIMED (3s) and REPEATING on the 100-hit counter', () => {
    const evs = buffApplies(base.events, 'elemAdvantageDamagePct');
    // Fails under MISSING (line dropped) and under a mis-stat (attackDamagePct / elementDamagePct).
    expect(evs.length).toBeGreaterThan(0);
    // Target set: 'Affects self' — never the allies broadcast the burst block uses.
    expect(new Set(evs.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    for (const e of evs) {
      expect(e.value).toBeCloseTo(30.23, 2);
    }
    // Trigger identity: a hit counter re-arms, so a 180s MG fight must re-apply it many times.
    // Fails under a `passive` / start-of-battle mis-read (which would apply exactly once).
    expect(evs.length).toBeGreaterThanOrEqual(5);
    // Duration semantics: 'for 3 sec' is a SHORT timed window, not 'continuously'.
    for (const e of evs) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
      const start = (e as any).frame ?? (e as any).tFrame ?? (e as any).t;
      if (typeof start === 'number' && typeof e.expiresFrame === 'number') {
        const w = e.expiresFrame - start;
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(6 * FPS); // 3s, nowhere near the 180s fight
      }
    }
  });

  it('S1a: the buff is ELEMENT-GATED — scaling it 10x is damage-inert vs the same-element boss', () => {
    // rei is Fire, the control boss is Fire => no elemental advantage => elemAdvantageDamagePct is
    // consumed by nothing. GREEN only under the faithful elemAdvantageDamagePct encoding; RED under
    // the nearest-wrong generic attackDamagePct/elementDamagePct (which would raise her damage), and
    // RED if the engine ever leaks the elem-advantage bucket onto a non-advantaged fight.
    expect(elemBig.ok).toBe(true);
    expect(elemBig.total).toBe(base.total);
    expect(elemBig.team).toEqual(base.team); // self-scoped: teammates byte-identical
  });

  // ---- S1b: 112.37% of final ATK on the enemy, every 100 landed normal attacks -------------------
  it('S1b: the 112.37% rider is live and gated on a 100-hit counter (not per shot)', () => {
    expect(noRider.ok).toBe(true);
    expect(noRider.total).toBeLessThan(base.total);
    expect((base.total - noRider.total) / base.total).toBeGreaterThan(0.01);
    // Nearest-wrong trigger identity: `shotFired` instead of hitCount:100 over-credits ~100x.
    expect(riderEveryShot.ok).toBe(true);
    expect(riderEveryShot.total).toBeGreaterThan(base.total * 2);
    // Inertness: her own rider must not move a teammate's number.
    expect(noRider.team).toEqual(base.team);
  });

  it('S1b: rider CRITS at the caster rate but takes NO core, and no +30% range bonus', () => {
    // crit:true is the repo convention for flat-damage riders — forcing crit:false must LOSE damage.
    expect(riderNoCrit.ok).toBe(true);
    expect(riderNoCrit.total).toBeLessThan(base.total);
    // The kit text says nothing about a core strike, so the faithful rider is core-free —
    // forcing core:true must GAIN damage (equality here would mean the driver shipped core:true).
    expect(riderCore.ok).toBe(true);
    expect(riderCore.total).toBeGreaterThan(base.total);
    // Structural: rider hits are excluded from the full-range bonus (helm=false so srcSlot
    // 'skill1' damage is attributable to rei; liter/crown carry no skill1 damage effects).
    const procs = dmgFromSlot(baseNoHelm.events, 'skill1');
    expect(procs.length).toBeGreaterThanOrEqual(3);
    for (const e of procs) {
      expect(!!e.rangeApplied).toBe(false);
    }
  });

  // ---- S2a: Damage dealt to Shield +700.5% continuously ------------------------------------------
  it.skip('S2a: Damage dealt to Shield +700.5% — GAP: no shield-damage StatKey and the v1 boss has no shield pool', () => {
    // No primitive exists (StatKey has no shieldDamagePct) and the scope-lock boss carries no shield,
    // so the line is unobservable end-to-end. Belongs in the override `unmodeled` record, not a block.
  });

  // ---- S2b: ATK +25.03% OF THE SKILL USER'S ATK, all Fire allies, 10s, on entering Burst stage 3 --
  it('S2b: caster-SCALED (flat-resolved) ATK grant, fired on EVERY stage-3 entry', () => {
    expect(noS2Atk.ok).toBe(true);
    const R = fullBursts(base.events);
    // Isolate rei's own applications by differencing against the run with the effect removed —
    // teammate supports also emit casterAtkPct, so a bare stat filter would be contaminated.
    const valsBase = buffApplies(base.events, 'casterAtkPct').map(
      (e) => e.value
    );
    const valsNone = new Set(
      buffApplies(noS2Atk.events, 'casterAtkPct').map((e) => e.value)
    );
    const mineVals = [...new Set(valsBase)].filter((v) => !valsNone.has(v));
    // Exactly one new value appears; RED under the classic 'ATK +25.03%' -> atkPct mis-encoding
    // (which would emit no casterAtkPct at all).
    expect(mineVals.length).toBe(1);
    const V = mineVals[0];
    // Caster-scaled buffs are FLAT-resolved at apply time: assert the flat ATK number, not 25.03.
    expect(V).toBeGreaterThan(100);
    expect(Math.abs(V - 25.03)).toBeGreaterThan(1);
    const mine = base.events.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.value === V
    );
    // Trigger identity: 'when entering Burst stage 3' fires on ANY stage-3 entry — one per rotation.
    expect(mine.length).toBe(R);
    // Target set: 'all Fire Code allies' — rei is the only Fire unit in this comp.
    expect(new Set(mine.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    // Nearest-wrong: keying it to her OWN burst cast can only fire on the rotations she casts,
    // never on every stage-3 entry, whenever the second Burst III takes a turn.
    expect(s2AtkBurstCast.ok).toBe(true);
    const own = s2AtkBurstCast.events.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.value === V
    ).length;
    expect(own).toBeGreaterThanOrEqual(1);
    expect(own).toBeLessThanOrEqual(R);
  });

  it('S2b: element scoping and the 10s window are both load-bearing', () => {
    // Broadening 'all Fire Code allies' -> all allies must move the (non-Fire) teammates: proves the
    // faithful scope is genuinely restricting a buff that would otherwise over-credit the team.
    expect(s2AtkAllAllies.ok).toBe(true);
    expect(sum(s2AtkAllAllies.team)).toBeGreaterThan(sum(base.team));
    // Duration semantics: 'for 10 sec' is a real window — stretching it to 60s must ADD damage.
    // RED under a permanent/continuous mis-encoding (where a 60s cap would remove uptime instead).
    expect(s2AtkLong.ok).toBe(true);
    expect(s2AtkLong.total).toBeGreaterThan(base.total);
  });

  // ---- Burst: Attack Damage +48.02% for 10s, all Fire allies -------------------------------------
  it('burst: Attack Damage +48.02% is Fire-scoped, own-burst keyed, and a real 10s window', () => {
    const ad = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(e.value - 48.02) < 0.01
    );
    expect(ad.length).toBeGreaterThanOrEqual(1);
    // Plain percentage stats keep their raw kit value (unlike the caster-scaled S2b line above).
    for (const e of ad) {
      expect(e.value).toBeCloseTo(48.02, 2);
    }
    expect(new Set(ad.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    // A burst-slot block fires only when SHE casts — never more often than stage-3 entries happen.
    expect(ad.length).toBeLessThanOrEqual(fullBursts(base.events));
    expect(noBurstAd.ok).toBe(true);
    expect(noBurstAd.total).toBeLessThan(base.total);
    expect(burstAdLong.ok).toBe(true);
    expect(burstAdLong.total).toBeGreaterThan(base.total); // 10s window, not permanent
    expect(burstAdAllAllies.ok).toBe(true);
    expect(sum(burstAdAllAllies.team)).toBeGreaterThan(sum(base.team)); // Fire scoping is load-bearing
  });

  // ---- Burst: Shield = 13.44% of caster final Max HP for 10s -------------------------------------
  it('burst: the shield is MODELLED but tandem-inert in this fixture', () => {
    // ok===true asserts the line exists as a `shield` effect on the burst slot (no silent drop).
    expect(noShield.ok).toBe(true);
    // v1 models no HP pool and no ally here carries a `shielded` trigger, so removing it must be a
    // perfect no-op. RED if the shield were mis-encoded as an offensive stat grant.
    expect(noShield.total).toBe(base.total);
    expect(noShield.team).toEqual(base.team);
  });

  it.skip('burst: shield MAGNITUDE (13.44% of caster final Max HP) — GAP: no HP pool, no shield-synergy consumer in the control comp', () => {
    // Observable only against a teammate with a `shielded` trigger; recorded for kit completeness.
  });

  // ---- Burst: 990.2% of final ATK to all enemies -------------------------------------------------
  it('burst: the 990.2% nuke lands, is FB-major-exempt, and takes no range bonus', () => {
    expect(noBurstNuke.ok).toBe(true);
    expect(noBurstNuke.total).toBeLessThan(base.total);
    expect((base.total - noBurstNuke.total) / base.total).toBeGreaterThan(0.01);
    // helm=false so srcSlot 'burst' damage is attributable to rei (liter/crown bursts deal none).
    const hits = dmgFromSlot(baseNoHelm.events, 'burst');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.length).toBeLessThanOrEqual(fullBursts(baseNoHelm.events));
    for (const e of hits) {
      // A burst cast resolves before the Full Burst window opens: no +50% major, no +30% range.
      expect(!!e.fbMajorApplied).toBe(false);
      expect(!!e.rangeApplied).toBe(false);
    }
  });
});
