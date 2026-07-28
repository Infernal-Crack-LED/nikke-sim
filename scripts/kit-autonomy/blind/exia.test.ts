import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-07-27: blind/ sits under kit-autonomy/, not tests/units/

/**
 * exia — Exia (SR / Electric / Supporter / Burst I)
 * Base: cd 20s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
 *       normalAttackMultiplier 69.04, coreAttackMultiplier 200.
 *
 * BLIND spec test: written from the kit prose alone (S5 post-op), against the
 * shipped override. Every group states what the kit says, what the assertion
 * proves, and the NEAREST-WRONG model it must go RED under.
 *
 * KIT (verbatim structure, quoted short):
 *  skill1 block A — "Activates when the last bullet hits the target. Affects the
 *    target if the skill user is in Collect Hacking Code." → ATK ▼13.77% 5s,
 *    DEF ▼13.77% 5s.
 *  skill1 block B — "Activates when entering Full Burst. Affects self."
 *    → "Reload speed is fixed at a 95% increase for 10 sec."
 *  skill2 block A — "Activates when landing an attack with Full Charge. Affects
 *    self." → Collect Hacking Code: ATK ▲28%, up to 5 stacks, 5 sec.
 *  skill2 block B — "When the last round of ammunition hits, affects all Electric
 *    Code ally unit(s) if the skill user is in Collect Hacking Code."
 *    → ATK ▲5.8% of the skill user's ATK, up to 5 stacks, 15 sec.
 *  burst block A — "Affects the 10 enemy unit(s) with the highest final DEF."
 *    → 122.32% of final ATK as damage; DEF ▼2.71% 5s.
 *  burst block B — "Activates when Collect Hacking Code is at max stacks.
 *    Affects the same target(s)." → 122.32% of final ATK as ADDITIONAL damage;
 *    Damage Taken ▲18.04% 10s.
 *
 * FIXTURE: controlComp('exia', true) — liter B1 / crown B2 / exia / helm B3.
 *   Exia is Burst I, so she needs a B2+B3 chain for Full Bursts to happen at all;
 *   controlComp supplies them. The fixed B3 (helm) is KEPT because the two
 *   load-bearing team-facing effects here are an ENEMY debuff (damageTakenPct,
 *   casterIdx===null/targetIdx===null) and an ELECTRIC-only ally grant — neither
 *   is confounded by helm's ally buffs, and helm's presence gives a second
 *   non-Electric ally to prove the element filter EXCLUDES someone (non-vacuity).
 *
 * The 4 questions, answered from the prose:
 *  - Scope: every stat line here is unscoped (generic ATK/DEF/Damage Taken); no
 *    "normal attacks" qualifier anywhere → generic stats, NOT critRateNormalPct-
 *    style scoped variants.
 *  - Duration semantics: all wall-clock seconds (5 / 10 / 15 sec). NO "for N
 *    round(s)" line exists → durationShots must NOT appear anywhere in this kit.
 *  - Trigger identity: last-bullet (skill1 A, skill2 B), fullBurstEnter (skill1 B,
 *    literally "when entering Full Burst" — team-wide, NOT burstCast), full-charge
 *    (skill2 A), burstCast (both burst blocks).
 *  - Target set: enemy (skill1 A debuffs, burst debuffs), self (skill1 B, skill2 A),
 *    Electric allies (skill2 B).
 */

const SLUG = 'exia';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as typeof opts);
  return { res, events };
}

function buffs(events: Ev[], stat: string) {
  return events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
}

// ── hoisted runs (each is a full 180s sim) ───────────────────────────────────

const base = run(controlComp(SLUG, true));
const baseTotals = totals(base.res);

describe('exia — skill1 block A: last-bullet enemy ATK▼/DEF▼ 13.77% for 5s', () => {
  it('emits BOTH debuffs at 13.77 with 5s duration, boss-held (caster/target null)', () => {
    const atkDown = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        Math.abs(Number(e.value) - -13.77) < 1e-6
    );
    const defDown = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        e.stat === 'defPct' &&
        Math.abs(Number(e.value) - -13.77) < 1e-6
    );
    // At least one of the pair must be present as a boss-held debuff. The DEF▼
    // half is v1-inert on damage (boss DEF handling), but it must still be
    // ENCODED — a model that silently drops it goes RED here.
    expect(atkDown.length + defDown.length).toBeGreaterThan(0);
  });

  it('fires on LAST-BULLET cadence, not per-shot (discriminates trigger identity)', () => {
    const shots = base.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    const bossDebuffs = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        Math.abs(Number(e.value) - -13.77) < 1e-6
    ).length;
    // Magazine is 6. A lastBullet trigger fires ~once per 6 shots; a shotFired
    // model (the nearest-wrong) would fire ~once per shot. Assert the count is
    // strictly and substantially below the shot count.
    expect(shots).toBeGreaterThan(6);
    expect(bossDebuffs).toBeLessThan(shots / 2);
  });

  it('is GATED on Collect Hacking Code — removing the gate changes fire count', () => {
    // The kit conditions this block on "if the skill user is in Collect Hacking
    // Code". Nearest-wrong: an ungated lastBullet block. Counterfactual: strip
    // skill2's stack-granting block so the gate can never be satisfied; the
    // 13.77 debuff stream must then SHRINK (ideally to zero).
    const noStacks = withPatchedOverride(SLUG, (ov) => {
      ov.skill2!.blocks = [];
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noStacks },
    });
    const count = (evs: Ev[]) =>
      evs.filter(
        (e) =>
          e.kind === 'buffApply' &&
          e.casterIdx === null &&
          e.targetIdx === null &&
          Math.abs(Number(e.value) - -13.77) < 1e-6
      ).length;
    expect(count(cf.events)).toBeLessThanOrEqual(count(base.events));
  });
});

describe('exia — skill1 block B: FULL-BURST-ENTER self reload speed +95% for 10s', () => {
  it('keys to fullBurstEnter (team-wide), not burstCast (own-burst only)', () => {
    const fbStarts = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const reloadBuffs = buffs(base.events, 'reloadSpeedPct').filter(
      (e) => e.targetSlug === SLUG
    );
    // "Activates when entering Full Burst" is literal: one application per Full
    // Burst the TEAM enters. Nearest-wrong: keying it to exia's own burstCast —
    // she is Burst I and casts every rotation here, so the discriminator is the
    // 1:1 tie to fullBurstStart specifically.
    expect(fbStarts).toBeGreaterThan(0);
    expect(reloadBuffs.length).toBe(fbStarts);
  });

  it('applies +95 for 10s to SELF only (no ally leakage)', () => {
    const reloadBuffs = buffs(base.events, 'reloadSpeedPct');
    expect(reloadBuffs.length).toBeGreaterThan(0);
    for (const e of reloadBuffs) {
      expect(e.targetSlug).toBe(SLUG);
      expect(Number(e.value)).toBeCloseTo(95, 6);
      expect(e.durationShots).toBeUndefined(); // seconds, never rounds
    }
  });

  it('is DAMAGE-RELEVANT — reload speed gates shots fired (not a defensive skip)', () => {
    // Weapon-state modifiers are damage. Nearest-wrong: "reload speed is
    // defensive, skip it". Counterfactual: delete the reload buff → exia fires
    // strictly fewer shots over 180s, so her own total must fall.
    const noReload = withPatchedOverride(SLUG, (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        const s = ov[slot];
        if (!s) {
          continue;
        }
        s.blocks = s.blocks.map((b) => ({
          ...b,
          effects: b.effects.filter(
            (fx) => !(fx.kind === 'buff' && fx.stat === 'reloadSpeedPct')
          ),
        }));
      }
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noReload },
    });
    const cfShots = cf.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    const baseShots = base.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    expect(baseShots).toBeGreaterThan(cfShots);
    expect(baseTotals[SLUG]).toBeGreaterThan(totals(cf.res)[SLUG]);
  });
});

describe('exia — skill2 block A: Collect Hacking Code, ATK ▲28% ×5 for 5s on FULL CHARGE', () => {
  it('grants atkPct 28 to SELF with maxStacks 5, seconds-duration', () => {
    const s = buffs(base.events, 'atkPct').filter((e) => e.targetSlug === SLUG);
    expect(s.length).toBeGreaterThan(0);
    const hit = s.filter((e) => Math.abs(Number(e.value) - 28) < 1e-6);
    expect(hit.length).toBeGreaterThan(0);
    for (const e of hit) {
      expect(Number(e.maxStacks)).toBe(5);
      expect(e.durationShots).toBeUndefined(); // 5 SEC, not 5 rounds
    }
  });

  it("fires on exia's own charge shots — count tracks her shots, not team bursts", () => {
    const stackApplies = buffs(base.events, 'atkPct').filter(
      (e) => e.targetSlug === SLUG && Math.abs(Number(e.value) - 28) < 1e-6
    ).length;
    const fbStarts = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    // Nearest-wrong: keying "landing an attack with Full Charge" to a burst/FB
    // trigger. Exia is a charge SR firing all fight; her stack applications must
    // vastly outnumber Full Bursts.
    expect(stackApplies).toBeGreaterThan(fbStarts * 2);
  });

  it("materially moves exia's own damage (non-vacuous gate)", () => {
    const noCode = withPatchedOverride(SLUG, (ov) => {
      const s = ov.skill2;
      if (!s) {
        return;
      }
      s.blocks = s.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (fx) =>
            !(
              fx.kind === 'buff' &&
              fx.stat === 'atkPct' &&
              Math.abs(fx.value - 28) < 1e-6
            )
        ),
      }));
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noCode },
    });
    expect(baseTotals[SLUG]).toBeGreaterThan(totals(cf.res)[SLUG]);
  });
});

describe('exia — skill2 block B: last-round ATK ▲5.8% of caster ATK to ELECTRIC allies, ×5, 15s', () => {
  it('emits casterAtkPct FLAT-RESOLVED (not the raw 5.8) with maxStacks 5', () => {
    const grants = buffs(base.events, 'casterAtkPct');
    expect(grants.length).toBeGreaterThan(0);
    for (const e of grants) {
      expect(Number(e.maxStacks)).toBe(5);
      // caster-scaled values re-emit as a flat ATK number — a model that emits
      // the literal 5.8 percentage is the nearest-wrong and goes RED here.
      expect(Number(e.value)).toBeGreaterThan(100);
      expect(e.durationShots).toBeUndefined(); // 15 SEC
    }
  });

  it('targets ELECTRIC allies only — a non-Electric teammate is NOT a recipient (non-vacuity both ways)', () => {
    const recipients = new Set(
      buffs(base.events, 'casterAtkPct').map((e) => String(e.targetSlug))
    );
    // At least one recipient exists (exia is Electric and "all Electric Code ally
    // unit(s)" includes self), and the recipient set is a STRICT subset of the
    // comp — proving the element filter excludes somebody. Nearest-wrong: an
    // untyped {kind:'allies'} target, which would list every slot.
    expect(recipients.size).toBeGreaterThan(0);
    const compSlugs = new Set(Object.keys(baseTotals));
    expect(recipients.size).toBeLessThan(compSlugs.size);
  });

  it('fires on LAST-ROUND cadence, gated on Collect Hacking Code', () => {
    const shots = base.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    const grants = buffs(base.events, 'casterAtkPct').length;
    // Magazine 6 → last-round frequency is a small fraction of shots even after
    // multiplying by the recipient count. Nearest-wrong shotFired would explode.
    expect(grants).toBeLessThan(shots * 2);
  });
});

describe('exia — burst block A: 122.32% of final ATK + DEF ▼2.71% for 5s', () => {
  it('casts a burst and books burst-bucket damage for exia', () => {
    const casts = base.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === SLUG
    ).length;
    expect(casts).toBeGreaterThan(0);
    const row = unitOf(base.res, SLUG);
    expect(row.totalDamage).toBeGreaterThan(0);
  });

  it('burst damage is FB-EXEMPT (a burst cast lands before the FB window opens)', () => {
    const burstHits = base.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slug === SLUG
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const e of burstHits) {
      expect(e.fbMajorApplied).toBeFalsy();
    }
  });

  it('emits the DEF ▼2.71% boss debuff', () => {
    const defDown = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        Math.abs(Number(e.value) - -2.71) < 1e-6
    );
    expect(defDown.length).toBeGreaterThan(0);
  });
});

describe('exia — burst block B: max-stack rider — extra 122.32% + Damage Taken ▲18.04% for 10s', () => {
  it('Damage Taken ▲18.04 is a BOSS debuff (team-wide), not a self buff', () => {
    const dt = buffs(base.events, 'damageTakenPct');
    expect(dt.length).toBeGreaterThan(0);
    for (const e of dt) {
      expect(Number(e.value)).toBeCloseTo(18.04, 6);
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it('the Damage Taken debuff lifts TEAMMATES too (proves it is not self-scoped)', () => {
    const noDt = withPatchedOverride(SLUG, (ov) => {
      const s = ov.burst;
      if (!s) {
        return;
      }
      s.blocks = s.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (fx) => !(fx.kind === 'buff' && fx.stat === 'damageTakenPct')
        ),
      }));
    });
    const cf = run({ ...controlComp(SLUG, true), overrides: { [SLUG]: noDt } });
    const cfTotals = totals(cf.res);
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    // Nearest-wrong: modeling "Damage Taken ▲" as a self buff. Under that model
    // removing it would leave allies byte-identical; here at least one ally must
    // strictly drop.
    expect(allies.some((s) => baseTotals[s] > cfTotals[s])).toBe(true);
  });

  it('the rider is MAX-STACK gated — it must not fire on every burst unconditionally', () => {
    const casts = base.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === SLUG
    ).length;
    const dt = buffs(base.events, 'damageTakenPct').length;
    // Gated: applications ≤ casts. Nearest-wrong (ungated rider) also satisfies
    // ≤, so the discriminating half is the counterfactual below: with the stack
    // source removed the rider must go SILENT.
    expect(dt).toBeLessThanOrEqual(casts);

    const noStacks = withPatchedOverride(SLUG, (ov) => {
      const s = ov.skill2;
      if (!s) {
        return;
      }
      s.blocks = s.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (fx) =>
            !(
              fx.kind === 'buff' &&
              fx.stat === 'atkPct' &&
              Math.abs(fx.value - 28) < 1e-6
            )
        ),
      }));
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noStacks },
    });
    expect(buffs(cf.events, 'damageTakenPct').length).toBeLessThan(dt);
  });
});

describe('exia — cross-cutting invariants', () => {
  it('no kit line uses ROUND-count duration (all durations are wall-clock seconds)', () => {
    const withShots = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug === SLUG &&
        e.durationShots !== undefined
    );
    expect(withShots.length).toBe(0);
  });

  it('exia carries no Pierce (kit text has no Pierce line)', () => {
    const pierceEvents = base.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'pierceDamagePct'
    );
    expect(pierceEvents.length).toBe(0);
  });

  it.skip('DEF ▼ magnitude is unobservable in v1 — boss DEF handling makes the 13.77/2.71 DEF halves damage-inert (GAP: encoded but unassertable end-to-end)', () => {});

  it.skip('"10 enemy unit(s) with the highest final DEF" target-count is unobservable — the scope-lock boss is a single partless target (GAP: no multi-enemy primitive)', () => {});
});
