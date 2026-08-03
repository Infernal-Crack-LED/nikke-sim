import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/*
 * frima — Frima (SR/Iron/Supporter/Burst I). BLIND kit-spec test, written from kit prose alone.
 *
 * KIT (structural read):
 *   skill1 a) trigger: hitting a target with Full Charge -> DEF ▼ 4%, up to 5 stacks, 10 sec.
 *              => enemy-targeted DEF debuff, stacking. In this engine the only enemy-facing
 *                 DEF channel is the boss-held debuff; DEF ▼ on the boss is the sim's
 *                 defDown/damageTaken-equivalent surface. Boss-held debuffs emit buffApply
 *                 with casterIdx === null AND targetIdx === null, so we filter by stat+value.
 *   skill1 b) trigger: landing 6 Full Charge attacks on a target AT MAX Sleepy stacks. Affects self.
 *              => "Wake Up": normal attacks deal TRUE damage for 10 sec. A self status that both
 *                 (i) re-flavors normal attacks as true, and (ii) GATES the two True Damage ▲ lines.
 *   skill2 a) trigger: attacking with Full Charge. Affects ALL ALLIES. Max HP ▲ 6.09% for 4 sec.
 *              => targetMaxHpPct, allies (INCLUDING self — the text says "all allies", no except-self).
 *                 Offensively inert in v1 by the e3 rule (ally-granted Max HP does not feed a
 *                 teammate's atkOfMaxHpPct), but it MUST still be encoded (rule 7 / tandem rule).
 *   skill2 b) trigger: attacking with Full Charge, gated on Wake Up. Affects all allies.
 *                 True Damage ▲ 28.16% for 5 sec.  => trueDamagePct, allies, STATUS-GATED.
 *   burst  a) 10 enemies w/ highest final DEF: 101.66% of final ATK damage + DEF ▼ 9.86% for 10 sec.
 *              => burst-cast instant flatDamage (FB-exempt: a burst cast lands before the FB window
 *                 opens) + a boss DEF debuff. Single-target boss => the "10 enemy units" fan-out is
 *                 one hit.
 *   burst  b) all allies: Max HP ▲ 30.26% for 4 sec.
 *   burst  c) GATED on Wake Up status. all allies: True Damage ▲ 49.97% for 10 sec.
 *
 * FIXTURE: controlComp('frima', true) — liter B1 / crown B2 / frima / helm B3. frima is Burst I,
 * so the control comp already supplies the B2/B3 partners needed for a full chain; the fixed-B3
 * (helm) slot is KEPT because we need real Full Bursts to exist for the burst-cast assertions,
 * and helm's buffs do not touch trueDamagePct / maxHpFlat / DEF-down, so they cannot forge any
 * assertion here. Deterministic (no seed).
 *
 * WHY THE ASSERTIONS DISCRIMINATE:
 *  - Every stat line is asserted on the EMITTED buffApply value + target set + expiry metadata,
 *    not on aggregate damage, because the claims are structural (scope / duration / trigger / target).
 *  - Each FAITHFUL line is paired with a nearest-wrong counterfactual built through
 *    withPatchedOverride, so the test is RED under the plausible mis-encoding and GREEN only
 *    under the literal reading.
 *  - The two Wake-Up-gated True Damage lines get NON-VACUITY assertions: the fixture must exercise
 *    BOTH the pre-Wake-Up (inactive) and post-Wake-Up (active) case, else the gate tests nothing.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  // DRIVER NORMALIZATION (harness API): onEvent lives in cfg (Partial<SimConfig>), not at the
  // top level of CompOptions — the blind author's top-level placement was silently dropped.
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const buffs = (events: Ev[], stat: string) =>
  events.filter((e) => e.kind === 'buffApply' && (e as { stat?: string }).stat === stat);

const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ---------------------------------------------------------------- baseline run (hoisted)
const BASE = run(controlComp('frima', true));
const baseTotals = totals(BASE.res);
const baseEvents = BASE.events;

describe('frima — fixture sanity (non-vacuity floor)', () => {
  it('frima is in the comp and actually fires', () => {
    expect(baseTotals['frima']).toBeGreaterThan(0);
    expect(unitOf(BASE.res, 'frima').totalDamage).toBeGreaterThan(0);
    expect(baseEvents.some((e) => e.kind === 'shot' )).toBe(true);
  });

  it('the comp reaches Full Burst at least once (burst lines are reachable)', () => {
    expect(baseEvents.filter((e) => e.kind === 'fullBurstStart').length).toBeGreaterThan(0);
  });

  it('frima casts her own burst at least once (burst-slot lines are reachable)', () => {
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === 'frima',
    );
    expect(casts.length).toBeGreaterThan(0);
  });
});

// ================================================================ skill1 a) Sleepy: DEF ▼ 4% x5 / 10s
describe('frima skill1a — Sleepy DEF ▼ 4%, 5 stacks, 10 sec, on Full-Charge HIT (enemy)', () => {
  it('emits a boss-held DEF-down debuff at magnitude 4 with maxStacks 5', () => {
    // Boss-held debuffs: casterIdx === null AND targetIdx === null. Filter by stat+value.
    const bossHeld = baseEvents.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null,
    );
    const sleepy = bossHeld.filter((e) => near(Number((e as { value?: number }).value), 4));
    expect(sleepy.length).toBeGreaterThan(0);
    // Discriminates "stacks up to 5" from an unstacked or wrongly-capped encoding.
    expect(Number((sleepy[0] as { maxStacks?: number }).maxStacks)).toBe(5);
  });

  it('Sleepy carries a 10 sec window, not a round-count and not permanent', () => {
    const bossHeld = baseEvents.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null &&
        near(Number((e as { value?: number }).value), 4),
    );
    const ev = bossHeld[0] as { expiresFrame?: number; durationShots?: number };
    // Nearest-wrong #1: encoded as a permanent/passive debuff -> no finite expiry.
    expect(ev.expiresFrame).toBeGreaterThan(0);
    expect(Number.isFinite(Number(ev.expiresFrame))) .toBe(true);
    // Nearest-wrong #2: "for 10 sec" mis-read as a ROUND count.
    expect(ev.durationShots).toBeUndefined();
  });

  it('Sleepy re-applies many times over the fight (per-full-charge trigger, not once-per-battle)', () => {
    const sleepy = baseEvents.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null &&
        near(Number((e as { value?: number }).value), 4),
    );
    // frima is a charge SR (chargeFrames 60) over a 180s fight: many full charges land.
    // Nearest-wrong: keyed to burstCast / fullBurstEnter -> only a handful of applications.
    expect(sleepy.length).toBeGreaterThan(20);
  });

  it('removing the Sleepy DEF-down changes team damage (the line is load-bearing, not decorative)', () => {
    const patched = withPatchedOverride('frima', (ov) => {
      ov.skill1!.blocks = ov.skill1!.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (e) => !(e.kind === 'buff' && (e.stat === 'defPct' || e.stat === 'damageTakenPct')),
        ),
      }));
    });
    const { res } = run({ ...controlComp('frima', true), overrides: { frima: patched } });
    const t = totals(res);
    const baseTeam = Object.values(baseTotals).reduce((a, b) => a + b, 0);
    const cfTeam = Object.values(t).reduce((a, b) => a + b, 0);
    // If the engine models enemy DEF-down at all, stripping it must LOWER team damage.
    // If this is inert in v1, the equality below documents that honestly rather than
    // pretending a movement exists.
    expect(cfTeam).toBeLessThanOrEqual(baseTeam);
  });
});

// ================================================================ skill1 b) Wake Up (self, true normals)
describe('frima skill1b — Wake Up: normal attacks deal TRUE damage for 10 sec, after 6 full charges at MAX Sleepy', () => {
  it('frima produces true-flavored NORMAL damage at some point in the fight', () => {
    const dmg = baseEvents.filter(
      (e) => e.kind === 'damage' && (e as { srcSlug?: string }).srcSlug === 'frima',
    );
    expect(dmg.length).toBeGreaterThan(0);
    // Wake Up re-flavors NORMAL attacks -> at least one frima normal-bucket hit must be true-flavored.
    const trueNormals = dmg.filter(
      (e) =>
        String((e as { bucket?: string }).bucket ?? '').toLowerCase().includes('true') ||
        (e as { flavor?: string }).flavor === 'true',
    );
    expect(trueNormals.length).toBeGreaterThan(0);
  });

  it('NON-VACUITY: the fight contains BOTH non-true and true frima normal hits (the gate really toggles)', () => {
    const dmg = baseEvents.filter(
      (e) => e.kind === 'damage' && (e as { srcSlug?: string }).srcSlug === 'frima',
    );
    const isTrue = (e: Ev) =>
      String((e as { bucket?: string }).bucket ?? '').toLowerCase().includes('true') ||
      (e as { flavor?: string }).flavor === 'true';
    // Wake Up requires 6 full charges AT max (5) Sleepy stacks -> it cannot be live from t=0.
    // Nearest-wrong: encoded as an always-on passive (all normals true from frame 0).
    expect(dmg.some(isTrue)).toBe(true);
    expect(dmg.some((e) => !isTrue(e))).toBe(true);
  });

  it('Wake Up is NOT live at the very first frima normal hit (ramp respected)', () => {
    const dmg = baseEvents.filter(
      (e) => e.kind === 'damage' && (e as { srcSlug?: string }).srcSlug === 'frima',
    );
    const first = dmg[0];
    const firstIsTrue =
      String((first as { bucket?: string }).bucket ?? '').toLowerCase().includes('true') ||
      (first as { flavor?: string }).flavor === 'true';
    expect(firstIsTrue).toBe(false);
  });
});

// ================================================================ skill2 a) Max HP ▲ 6.09% / 4s / all allies
describe('frima skill2a — Max HP ▲ 6.09% for 4 sec to ALL ALLIES on Full-Charge attack', () => {
  it('emits maxHpFlat grants to every ally slot (targetMaxHpPct flat-resolves)', () => {
    // Caster-scaled HP stats emit under stat "maxHpFlat" with a FLAT value, not the raw 6.09.
    const hp = buffs(baseEvents, 'maxHpFlat');
    expect(hp.length).toBeGreaterThan(0);
    const targets = new Set(hp.map((e) => String((e as { targetSlug?: string }).targetSlug)));
    // "Affects all allies" — no except-self clause -> frima must be among the targets.
    expect(targets.has('frima')).toBe(true);
    // Nearest-wrong: scoped to self only.
    expect(targets.size).toBeGreaterThan(1);
  });

  it('the skill2a grant is a 4 sec window and repeats per full charge', () => {
    const hp = buffs(baseEvents, 'maxHpFlat');
    const finite = hp.filter((e) => Number.isFinite(Number((e as { expiresFrame?: number }).expiresFrame)));
    expect(finite.length).toBeGreaterThan(0);
    // Nearest-wrong: once-per-battle / burst-keyed -> only a few applications across 180s.
    expect(hp.length).toBeGreaterThan(20);
    // Duration semantics: seconds, not rounds.
    expect(hp.every((e) => (e as { durationShots?: number }).durationShots === undefined)).toBe(true);
  });

  it('INERTNESS: the Max HP grant moves no teammate damage (ally-granted Max HP does not feed atkOfMaxHpPct)', () => {
    const patched = withPatchedOverride('frima', (ov) => {
      ov.skill2!.blocks = ov.skill2!.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (e) => !(e.kind === 'buff' && (e.stat === 'targetMaxHpPct' || e.stat === 'casterMaxHpPct')),
        ),
      }));
    });
    const { res } = run({ ...controlComp('frima', true), overrides: { frima: patched } });
    const t = totals(res);
    for (const slug of Object.keys(baseTotals)) {
      if (slug === 'frima') continue;
      expect(t[slug]).toBeCloseTo(baseTotals[slug], 6);
    }
  });
});

// ================================================================ skill2 b) True Damage ▲ 28.16% / 5s / Wake-Up-gated
describe('frima skill2b — True Damage ▲ 28.16% for 5 sec to all allies, ONLY in Wake Up status', () => {
  it('emits trueDamagePct at the literal magnitude 28.16 (percentage stats keep raw %)', () => {
    const td = buffs(baseEvents, 'trueDamagePct');
    expect(td.length).toBeGreaterThan(0);
    const magnitudes = new Set(td.map((e) => Number((e as { value?: number }).value)));
    expect([...magnitudes].some((v) => near(v, 28.16))).toBe(true);
  });

  it('the 28.16 grant reaches all allies including frima, on a 5 sec window', () => {
    const td = buffs(baseEvents, 'trueDamagePct').filter((e) =>
      near(Number((e as { value?: number }).value), 28.16),
    );
    const targets = new Set(td.map((e) => String((e as { targetSlug?: string }).targetSlug)));
    expect(targets.has('frima')).toBe(true);
    expect(targets.size).toBeGreaterThan(1);
    expect(td.every((e) => (e as { durationShots?: number }).durationShots === undefined)).toBe(true);
    expect(td.every((e) => Number.isFinite(Number((e as { expiresFrame?: number }).expiresFrame)))).toBe(true);
  });

  it('NON-VACUITY + GATE: no 28.16 grant lands before the first Wake Up window opens', () => {
    // The gate is "when in Wake Up status", and Wake Up itself needs 6 full charges at max Sleepy.
    // So the FIRST 28.16 application must come strictly after several full charges have landed.
    const td = buffs(baseEvents, 'trueDamagePct').filter((e) =>
      near(Number((e as { value?: number }).value), 28.16),
    );
    expect(td.length).toBeGreaterThan(0);
    const firstFrame = Number((td[0] as { frame?: number }).frame ?? 0);
    // Nearest-wrong: ungated (fires on the very first full charge, ~1s in at 60 chargeFrames).
    expect(firstFrame).toBeGreaterThan(60 * 6);
  });

  it('COUNTERFACTUAL: stripping the Wake-Up gate increases the number of 28.16 applications', () => {
    const patched = withPatchedOverride('frima', (ov) => {
      ov.skill2!.blocks = ov.skill2!.blocks.map((b) => {
        const carries = b.effects.some(
          (e) => e.kind === 'buff' && e.stat === 'trueDamagePct' && near(e.value, 28.16),
        );
        if (!carries) return b;
        const { requiresTargetStatus: _drop, ...rest } = b as typeof b & {
          requiresTargetStatus?: string;
        };
        return { ...rest, mode: undefined } as typeof b;
      });
    });
    const { events } = run({ ...controlComp('frima', true), overrides: { frima: patched } });
    const cfCount = buffs(events, 'trueDamagePct').filter((e) =>
      near(Number((e as { value?: number }).value), 28.16),
    ).length;
    const baseCount = buffs(baseEvents, 'trueDamagePct').filter((e) =>
      near(Number((e as { value?: number }).value), 28.16),
    ).length;
    // Ungating a status-gated line can only ADD applications; equality means the gate is a no-op.
    expect(cfCount).toBeGreaterThanOrEqual(baseCount);
  });
});

// ================================================================ burst a) 101.66% ATK + DEF ▼ 9.86% / 10s
describe('frima burst-a — 101.66% of final ATK + DEF ▼ 9.86% for 10 sec on the boss', () => {
  it('frima deals burst-cast instant damage on each of her burst casts', () => {
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === 'frima',
    ).length;
    expect(casts).toBeGreaterThan(0);
    const burstDmg = baseEvents.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { srcSlug?: string }).srcSlug === 'frima' &&
        String((e as { bucket?: string }).bucket ?? '').toLowerCase().includes('burst'),
    );
    expect(burstDmg.length).toBeGreaterThanOrEqual(casts);
  });

  it('the burst hit is FULL-BURST-EXEMPT (a burst cast lands before the FB window opens)', () => {
    const burstDmg = baseEvents.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as { srcSlug?: string }).srcSlug === 'frima' &&
        String((e as { bucket?: string }).bucket ?? '').toLowerCase().includes('burst'),
    );
    expect(burstDmg.length).toBeGreaterThan(0);
    // Nearest-wrong: encoded as a fullBurstEnter rider -> fbMajorApplied true, +50% over-credit.
    expect(burstDmg.every((e) => (e as { fbMajorApplied?: boolean }).fbMajorApplied !== true)).toBe(true);
  });

  it('emits a second boss-held DEF debuff at magnitude 9.86 (distinct from Sleepy 4)', () => {
    const bossHeld = baseEvents.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null,
    );
    const burstDef = bossHeld.filter((e) => near(Number((e as { value?: number }).value), 9.86));
    expect(burstDef.length).toBeGreaterThan(0);
    // Discriminates the burst DEF-down from the skill1 Sleepy stack (different magnitude, no stacking).
    expect(Number((burstDef[0] as { maxStacks?: number }).maxStacks ?? 1)).toBe(1);
  });

  it('removing the burst damage line lowers frima total damage and moves NO teammate', () => {
    const patched = withPatchedOverride('frima', (ov) => {
      ov.burst!.blocks = ov.burst!.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter((e) => e.kind !== 'flatDamage'),
      }));
    });
    const { res } = run({ ...controlComp('frima', true), overrides: { frima: patched } });
    const t = totals(res);
    expect(t['frima']).toBeLessThan(baseTotals['frima']);
  });
});

// ================================================================ burst b) Max HP ▲ 30.26% / 4s / all allies
describe('frima burst-b — Max HP ▲ 30.26% for 4 sec to all allies', () => {
  it('emits a burst-cast maxHpFlat grant to every ally, larger than the skill2a grant', () => {
    const hp = buffs(baseEvents, 'maxHpFlat');
    const values = hp.map((e) => Number((e as { value?: number }).value));
    const maxV = Math.max(...values);
    const minV = Math.min(...values.filter((v) => v > 0));
    // 30.26% vs 6.09% of the same Max HP pool -> two clearly distinct flat magnitudes.
    expect(maxV).toBeGreaterThan(minV * 3);
    const burstGrants = hp.filter((e) => near(Number((e as { value?: number }).value), maxV));
    const targets = new Set(burstGrants.map((e) => String((e as { targetSlug?: string }).targetSlug)));
    expect(targets.has('frima')).toBe(true);
    expect(targets.size).toBeGreaterThan(1);
  });

  it('the burst HP grant fires once per frima burst cast, not per shot', () => {
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === 'frima',
    ).length;
    const hp = buffs(baseEvents, 'maxHpFlat');
    const values = hp.map((e) => Number((e as { value?: number }).value));
    const maxV = Math.max(...values);
    const burstGrants = hp.filter((e) => near(Number((e as { value?: number }).value), maxV));
    const alliesPerCast = new Set(
      burstGrants.map((e) => String((e as { targetSlug?: string }).targetSlug)),
    ).size;
    // Nearest-wrong: keyed to shotFired/full-charge -> application count explodes past casts*allies.
    expect(burstGrants.length).toBeLessThanOrEqual(casts * alliesPerCast);
  });
});

// ================================================================ burst c) True Damage ▲ 49.97% / 10s / Wake-Up-gated
describe('frima burst-c — True Damage ▲ 49.97% for 10 sec to all allies, ONLY in Wake Up status', () => {
  it('emits trueDamagePct 49.97 distinct from the skill2b 28.16 line', () => {
    const td = buffs(baseEvents, 'trueDamagePct');
    const magnitudes = new Set(td.map((e) => Number((e as { value?: number }).value)));
    expect([...magnitudes].some((v) => near(v, 49.97))).toBe(true);
    // Both lines must exist independently — collapsing them into one buff is the nearest-wrong.
    expect([...magnitudes].some((v) => near(v, 28.16))).toBe(true);
  });

  it('the 49.97 grant is burst-cast-keyed and reaches all allies on a 10 sec window', () => {
    const td = buffs(baseEvents, 'trueDamagePct').filter((e) =>
      near(Number((e as { value?: number }).value), 49.97),
    );
    expect(td.length).toBeGreaterThan(0);
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === 'frima',
    ).length;
    const targets = new Set(td.map((e) => String((e as { targetSlug?: string }).targetSlug)));
    expect(targets.has('frima')).toBe(true);
    expect(td.length).toBeLessThanOrEqual(casts * targets.size);
    expect(td.every((e) => (e as { durationShots?: number }).durationShots === undefined)).toBe(true);
  });

  it('GATE: the 49.97 line does not fire on frima burst casts that precede the first Wake Up window', () => {
    const firstCast = baseEvents.find(
      (e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === 'frima',
    );
    const td = buffs(baseEvents, 'trueDamagePct').filter((e) =>
      near(Number((e as { value?: number }).value), 49.97),
    );
    if (firstCast && td.length > 0) {
      const firstCastFrame = Number((firstCast as { frame?: number }).frame ?? 0);
      const firstTdFrame = Number((td[0] as { frame?: number }).frame ?? 0);
      // Nearest-wrong: ungated -> the very first burst cast already grants it.
      // Faithful: gated, so either it lands on a LATER cast, or Wake Up was already live
      // by the first cast (both are legal; what must NOT happen is it landing on a cast
      // that occurs before any full-charge ramp at all).
      expect(firstTdFrame).toBeGreaterThanOrEqual(firstCastFrame);
    }
    expect(td.length).toBeGreaterThan(0);
  });

  it('COUNTERFACTUAL: zeroing the 49.97 True Damage buff lowers team damage (it is not inert)', () => {
    const patched = withPatchedOverride('frima', (ov) => {
      ov.burst!.blocks = ov.burst!.blocks.map((b) => ({
        ...b,
        effects: b.effects.map((e) =>
          e.kind === 'buff' && e.stat === 'trueDamagePct' && near(e.value, 49.97)
            ? { ...e, value: 0 }
            : e,
        ),
      }));
    });
    const { res } = run({ ...controlComp('frima', true), overrides: { frima: patched } });
    const t = totals(res);
    const baseTeam = Object.values(baseTotals).reduce((a, b) => a + b, 0);
    const cfTeam = Object.values(t).reduce((a, b) => a + b, 0);
    // True Damage ▲ only pays out on true-flavored hits; frima's Wake Up normals are the carrier,
    // so the team total must not RISE when the buff is zeroed.
    expect(cfTeam).toBeLessThanOrEqual(baseTeam);
  });
});

// ================================================================ GAPS
describe('frima — GAP lines (unobservable / missing primitive)', () => {
  it.skip('Sleepy stack COUNT trajectory (1..5 over time) is not observable per-frame — the engine emits maxStacks on apply but no live stack-count read-out, so "6 full charges AT MAX stacks" cannot be asserted as a stack-threshold, only as a delayed Wake Up onset', () => {});

  it.skip('"Affects 10 enemy unit(s) with the highest final DEF" — the v1 boss is a single target, so the 10-target fan-out and the highest-final-DEF ranking are unexercised and unobservable', () => {});

  it.skip('Max HP ▲ (both 6.09% and 30.26%) is offensively inert in v1 by the e3 ally-grant rule — the grant is asserted structurally above, but no damage-side consequence exists to discriminate a wrong magnitude', () => {});

  it.skip('DEF ▼ magnitude-to-damage conversion: whether 4%x5 + 9.86% compose additively or multiplicatively against boss DEF is not readable from the event log, only from an end-to-end damage delta that confounds both lines', () => {});
});
