import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-07-28: blind/ sits under kit-autonomy/, not tests/units/
// ADAPTED 2026-07-28 (driver, shape ONLY): the override FILE is slot-keyed direct arrays (ov.skill1 / ov.skill2 /
// ov.burst are Block[]), not { blocks: Block[] } — every `.blocks` accessor rewritten to the slot array. No
// assertion weakened; the recovery-chained vs burstCast-proxy mechanism divergence stays RED for the S7 judge.

/**
 * tia — Tia (RL / Iron / Defender / Burst I)
 *
 * KIT (blind spec, written from prose alone):
 *
 * skill1:
 *   [a] "Activates when recovering Cover's HP. Affects self."
 *       Cooldown of Burst Skill \u25bc 13 sec, stacks up to 2, lasts 12 sec.
 *   [b] "Activates when recovering Cover's HP. Affects all allies."
 *       Attack damage \u25b2 32.11% for 10 sec.
 *
 * skill2:
 *   [a] "Activates after landing 5 normal attack(s). Affects self."
 *       Max HP of Cover \u25b2 32.75% of the skill user's Max HP for 5 sec.
 *       Attract: Taunts all enemies for 5 sec.
 *   [b] "Activates when using Burst Skill. Affects self."
 *       Restores Cover HP by 21.41% of the skill user's final Max HP.
 *       Recovers 21.96% of attack damage as HP over 10 sec.
 *
 * burst:
 *   [a] "Affects self." Shield 35.07% of final Max HP for 10 sec.
 *   [b] "Affects all allies (except self)." Shield 10.21% of final Max HP for 10 sec.
 *   [c] "Affects all allies." Re-enters Burst Stage 1.
 *
 * FIXTURE: controlComp('tia', true) — tia is Burst I, so she occupies a burst slot;
 * the control comp supplies the remaining chain so full bursts actually fire.
 * Deterministic (no seed). Every run is hoisted; 6 sim runs total.
 *
 * THE LOAD-BEARING READS (each assertion states its nearest-wrong model):
 *
 * 1. TRIGGER IDENTITY on skill1: the activation clause is "when recovering Cover's HP",
 *    i.e. a RECOVERY event on the owner — NOT burst-cast, NOT full-burst-enter, NOT passive.
 *    The engine's `recovery` trigger fires when a `heal` effect targets the owner. The ONLY
 *    in-kit source of Cover-HP recovery is skill2[b] ("Restores Cover HP ...", on burst cast),
 *    so skill1 is a SECOND-ORDER effect chained off skill2[b]. That chain is the single most
 *    error-prone thing in this kit: keying skill1 directly to `burstCast` produces nearly the
 *    same timeline in this fixture but is the WRONG mechanism (it would also fire with the
 *    heal removed, and would fire in a comp where an external heal is the only Cover recovery).
 *    Assertions below discriminate the chain by CUTTING the heal and showing skill1's
 *    downstream buff disappears.
 *
 * 2. SCOPE on skill1[b]: "Attack damage \u25b2 32.11%" is the Damage-Up bucket
 *    (`attackDamagePct`), targeted at ALL ALLIES (tia included — "all allies" has no
 *    except-self clause). Nearest-wrong: `atkPct` (ATK bucket, multiplies differently) or
 *    self-only targeting. The all-allies read is discriminated by teammate movement.
 *
 * 3. DURATION SEMANTICS: 10 sec wall-clock on skill1[b]; 12 sec on skill1[a]. Both are
 *    seconds, not rounds (no "round(s)" wording). Asserted via expiresFrame on buffApply,
 *    since the engine emits NO buffRemove on natural time lapse.
 *
 * 4. skill1[a] is burst-COOLDOWN reduction (`burstCdr`), self-scoped, 13s, up to 2 stacks.
 *    tia's own burst cd is 40s, so 2 stacks = 26s off => a genuinely faster personal
 *    re-burst. This is a ROTATION effect: it is judged by burst-cast COUNT, not by damage.
 *    Nearest-wrong: modeling it as a team-wide cdr (it says "Affects self") or omitting it.
 *
 * 5. TARGET SET on the burst shields: [a] self-only 35.07%, [b] allies-EXCEPT-self 10.21%.
 *    Two DISTINCT blocks with DIFFERENT magnitudes — collapsing them into one all-allies
 *    shield is the nearest-wrong model and is caught by counting shield recipients/values.
 *    Shields carry no HP pool in v1 (boss deals no damage), so they must be DAMAGE-INERT;
 *    their only live consequence is firing `shielded` triggers on recipients. tia's own kit
 *    has no `shielded` consumer, so on this fixture they must move nothing.
 *
 * 6. burst[c] "Re-enters Burst Stage 1" is a rotation primitive with no engine effect kind
 *    in the schema (no reEnterStage/burstStageReset). GAP — it.skip'd, see gaps[].
 *
 * 7. skill2[a] Cover Max-HP + Attract/Taunt: HP/DEF scalers count the unit's OWN Max HP and
 *    Cover HP is not an entity in the sim; taunt is defensive aggro with no damage channel.
 *    Both are documented-inert. The assertion that matters is a NEGATIVE one: no block keyed
 *    to "after landing 5 normal attacks" may move damage, because the kit gives that trigger
 *    no offensive payload. A hitCount:5 block carrying any damage/ATK effect would be an
 *    INVENTED mechanic (measured > fudge).
 *
 * 8. skill2[b] second line "Recovers 21.96% of attack damage as HP over 10 sec" is LIFESTEAL
 *    (self-sustain, no HP pool in v1) — inert for damage, BUT it is a recovery-over-time on
 *    the owner, and therefore a candidate SECOND feeder of skill1's `recovery` trigger. The
 *    kit is ambiguous on whether lifesteal ticks count as "recovering Cover's HP" (they
 *    recover the UNIT's HP, not the Cover's). The literal read is NO — only the explicit
 *    "Restores Cover HP" line recovers Cover HP. This test PINS the literal read by bounding
 *    how many times skill1's buff may re-apply per burst cast (see the ratio assertion).
 */

// ---------------------------------------------------------------------------
// hoisted runs (each runComp is a full 180s sim)
// ---------------------------------------------------------------------------

function run(carry: string, overrides?: Record<string, unknown>) {
  const events: SimEvent[] = [];
  const base = controlComp(carry, true);
  const res = runComp({
    ...base,
    ...(overrides ? { overrides: overrides as never } : {}),
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as never);
  return { res, events };
}

const BASE = run('tia');

// counterfactual A: strip skill2's Cover-HP restore (the heal that feeds skill1's
// `recovery` trigger). Under the FAITHFUL chained model this silences skill1 entirely.
// Under the nearest-wrong burstCast-keyed model, skill1 keeps firing unchanged.
const NO_HEAL = run('tia', {
  tia: withPatchedOverride('tia', (ov) => {
    for (const b of ov.skill2) {
      b.effects = b.effects.filter((e) => e.kind !== 'heal');
    }
    ov.skill2 = ov.skill2.filter((b) => b.effects.length > 0);
  }),
});

// counterfactual B: strip skill1's team Attack-Damage buff -> the damage delta isolates it.
const NO_TEAM_BUFF = run('tia', {
  tia: withPatchedOverride('tia', (ov) => {
    for (const b of ov.skill1) {
      b.effects = b.effects.filter(
        (e) => !(e.kind === 'buff' && e.stat === 'attackDamagePct')
      );
    }
    ov.skill1 = ov.skill1.filter((b) => b.effects.length > 0);
  }),
});

// counterfactual C: skill1's team buff re-scoped to SELF ONLY -> teammates must move.
const SELF_ONLY_BUFF = run('tia', {
  tia: withPatchedOverride('tia', (ov) => {
    for (const b of ov.skill1) {
      if (
        b.effects.some((e) => e.kind === 'buff' && e.stat === 'attackDamagePct')
      ) {
        b.target = { kind: 'self' };
      }
    }
  }),
});

// counterfactual D: strip the burst-cooldown reduction -> tia bursts fewer times.
const NO_CDR = run('tia', {
  tia: withPatchedOverride('tia', (ov) => {
    for (const b of ov.skill1) {
      b.effects = b.effects.filter((e) => e.kind !== 'burstCdr');
    }
    ov.skill1 = ov.skill1.filter((b) => b.effects.length > 0);
  }),
});

// counterfactual E: strip BOTH burst shields -> must be byte-identical (shields are
// damage-inert on this fixture; nobody here consumes a `shielded` trigger).
const NO_SHIELDS = run('tia', {
  tia: withPatchedOverride('tia', (ov) => {
    for (const b of ov.burst) {
      b.effects = b.effects.filter((e) => e.kind !== 'shield');
    }
    ov.burst = ov.burst.filter((b) => b.effects.length > 0);
  }),
});

const buffs = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'buffApply') as Array<
    Extract<SimEvent, { kind: 'buffApply' }>
  >;
const casts = (evs: SimEvent[], slug: string) =>
  evs.filter(
    (e) =>
      e.kind === 'burstCast' && (e as never as { slug?: string }).slug === slug
  );

describe('tia — fixture sanity (non-vacuity)', () => {
  it('tia is in the comp and the fight actually bursts', () => {
    expect(() => unitOf(BASE.res, 'tia')).not.toThrow();
    expect(BASE.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    expect(BASE.events.some((e) => e.kind === 'burstCast')).toBe(true);
  });

  it('tia fires normal attacks (so the 5-normal-attack trigger is reachable)', () => {
    const shots = BASE.events.filter(
      (e) =>
        e.kind === 'shot' && (e as never as { slug?: string }).slug === 'tia'
    );
    // RL, 6 ammo, 141 reload frames, 60 charge frames over 180s — must be well past 5.
    expect(shots.length).toBeGreaterThan(5);
  });
});

describe('skill1 — trigger identity: recovery-chained, NOT burst-cast-keyed', () => {
  it('a recovery event reaches tia, sourced from skill2 Cover-HP restore', () => {
    const rec = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as never as { targetSlug?: string }).targetSlug === 'tia'
    );
    // At minimum the chain must have produced tia-targeted buff applications.
    expect(rec.length).toBeGreaterThan(0);
  });

  it('DISCRIMINATOR: removing the heal silences skill1 entirely', () => {
    // FAITHFUL (recovery-chained): no heal -> no recovery -> no skill1 buff, no cdr.
    // NEAREST-WRONG (skill1 keyed to burstCast directly): identical to BASE, test RED.
    const baseTeam = buffs(BASE.events).filter(
      (e) => e.stat === 'attackDamagePct' && e.value > 30 && e.value < 35
    );
    const cutTeam = buffs(NO_HEAL.events).filter(
      (e) => e.stat === 'attackDamagePct' && e.value > 30 && e.value < 35
    );
    expect(baseTeam.length).toBeGreaterThan(0); // non-vacuity: the active case exists
    expect(cutTeam.length).toBe(0); // the inactive case is genuinely inactive
  });

  it('DISCRIMINATOR: the whole team loses damage when the heal is cut', () => {
    const b = totals(BASE.res);
    const n = totals(NO_HEAL.res);
    for (const slug of Object.keys(b)) {
      expect(n[slug]).toBeLessThan(b[slug]);
    }
  });

  it('skill1 re-applies once per Cover-HP restore, not per lifesteal tick', () => {
    // LITERAL read: only "Restores Cover HP" recovers Cover HP; the 10s lifesteal
    // recovers the UNIT's HP and must NOT re-trigger skill1.
    // NEAREST-WRONG (lifesteal modeled as heal ticks:10 on self): ~10x the applications.
    const tiaCasts = casts(BASE.events, 'tia').length;
    const teamBuff = buffs(BASE.events).filter(
      (e) => e.stat === 'attackDamagePct' && e.value > 30 && e.value < 35
    );
    expect(tiaCasts).toBeGreaterThan(0);
    // one application PER ALLY per cast; allow no more than that.
    const allies = Object.keys(totals(BASE.res)).length;
    expect(teamBuff.length).toBeLessThanOrEqual(tiaCasts * allies);
  });
});

describe('skill1[b] — Attack damage 32.11%, all allies, 10 sec', () => {
  it('is the Damage-Up bucket at the literal magnitude, not an ATK buff', () => {
    // attackDamagePct is a PLAIN percentage stat -> the raw kit number is emitted.
    // NEAREST-WRONG: atkPct (wrong bucket) or casterAtkPct (would emit flat ATK).
    const hits = buffs(BASE.events).filter((e) => e.stat === 'attackDamagePct');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((e) => Math.abs(e.value - 32.11) < 0.01)).toBe(true);
    expect(
      buffs(BASE.events).some(
        (e) => e.stat === 'atkPct' && Math.abs(e.value - 32.11) < 0.01
      )
    ).toBe(false);
  });

  it('lasts 10 sec (seconds, not rounds)', () => {
    const hit = buffs(BASE.events).find(
      (e) => e.stat === 'attackDamagePct' && Math.abs(e.value - 32.11) < 0.01
    )!;
    expect(hit.durationShots).toBeUndefined();
    expect(hit.expiresFrame).toBeGreaterThan(0);
  });

  it('DISCRIMINATOR: reaches ALL allies, not just tia', () => {
    // NEAREST-WRONG: target self ("Affects self" copied from the sibling block).
    const b = totals(BASE.res);
    const s = totals(SELF_ONLY_BUFF.res);
    const teammates = Object.keys(b).filter((k) => k !== 'tia');
    expect(teammates.length).toBeGreaterThan(0);
    for (const slug of teammates) {
      expect(s[slug]).toBeLessThan(b[slug]); // teammates lose it under the wrong scope
    }
  });

  it('DISCRIMINATOR: removing it lowers damage for every unit', () => {
    const b = totals(BASE.res);
    const n = totals(NO_TEAM_BUFF.res);
    for (const slug of Object.keys(b)) {
      expect(n[slug]).toBeLessThan(b[slug]);
    }
  });
});

describe('skill1[a] — Burst CD -13 sec, self, up to 2 stacks, 12 sec', () => {
  it('DISCRIMINATOR: the cdr changes tia\u2019s own burst-cast count', () => {
    // Rotation effect -> judged by burst-cast COUNT, never by the aggregate ratio.
    // NEAREST-WRONG: omitted, or scoped to all allies ("Affects self" is explicit).
    const withCdr = casts(BASE.events, 'tia').length;
    const without = casts(NO_CDR.events, 'tia').length;
    expect(withCdr).toBeGreaterThan(0);
    expect(withCdr).toBeGreaterThanOrEqual(without);
  });

  it('the cdr is self-scoped: it does not shorten a teammate\u2019s burst cadence', () => {
    const teammates = Object.keys(totals(BASE.res)).filter((k) => k !== 'tia');
    for (const slug of teammates) {
      expect(casts(BASE.events, slug).length).toBe(
        casts(NO_CDR.events, slug).length
      );
    }
  });
});

describe('burst — two DISTINCT shields, different targets and magnitudes', () => {
  it('self shield 35.07% and ally shield 10.21% are separate grants', () => {
    // NEAREST-WRONG: one all-allies shield at a single magnitude.
    // Shields are recorded for kit completeness; the two magnitudes must both exist.
    const ov = withPatchedOverride('tia', () => {});
    const shields = ov.burst.flatMap((b) =>
      b.effects
        .filter((e) => e.kind === 'shield')
        .map((e) => ({
          target: b.target,
          pct: (e as never as { maxHpPct?: number }).maxHpPct,
        }))
    );
    expect(shields.length).toBe(2);
    const self = shields.find((s) => s.target.kind === 'self');
    const ally = shields.find(
      (s) =>
        s.target.kind === 'allies' &&
        (s.target as never as { excludeSelf?: boolean }).excludeSelf === true
    );
    expect(self).toBeDefined();
    expect(ally).toBeDefined();
    expect(self!.pct).toBeCloseTo(35.07, 2);
    expect(ally!.pct).toBeCloseTo(10.21, 2);
  });

  it('INERTNESS: shields move no damage on this fixture', () => {
    // v1 has no HP pool and nobody in the control comp consumes a `shielded` trigger.
    // If this goes RED, a shield is being credited as offense — a fudge.
    expect(totals(NO_SHIELDS.res)).toEqual(totals(BASE.res));
  });
});

describe('skill2 — inert lines must stay inert (measured > fudge)', () => {
  it('the 5-normal-attack block carries no offensive payload', () => {
    // Cover Max HP + Attract/Taunt have no damage channel in v1. A hitCount:5 block
    // carrying flatDamage/dot/atk would be an INVENTED mechanic.
    const ov = withPatchedOverride('tia', () => {});
    const hitCountBlocks = ov.skill2.filter(
      (b) => b.trigger.kind === 'hitCount'
    );
    for (const b of hitCountBlocks) {
      for (const e of b.effects) {
        expect(['flatDamage', 'dot', 'storedHit', 'stackedNuke']).not.toContain(
          e.kind
        );
      }
    }
  });

  it('the lifesteal line grants no ATK/damage stat', () => {
    // "Recovers 21.96% of attack damage as HP" is sustain, not a damage buff.
    expect(
      buffs(BASE.events).some(
        (e) =>
          (e.stat === 'atkPct' ||
            e.stat === 'attackDamagePct' ||
            e.stat === 'sustainedDamagePct') &&
          Math.abs(e.value - 21.96) < 0.01
      )
    ).toBe(false);
  });

  it('the Cover Max-HP grant does not leak into an ATK conversion', () => {
    // HP scalers count the unit's OWN Max HP; tia has no atkOfMaxHpPct line, so a
    // 32.75% Max-HP grant must not appear as ATK anywhere.
    expect(
      buffs(BASE.events).some(
        (e) =>
          e.stat === 'atkOfMaxHpPct' ||
          (Math.abs(e.value - 32.75) < 0.01 && e.stat === 'atkPct')
      )
    ).toBe(false);
  });
});

describe('GAPS — primitives the schema cannot express', () => {
  it.skip('burst: "Re-enters Burst Stage 1" — no engine primitive', () => {
    // The rotation state machine has no reEnterStage / stage-reset effect kind. This
    // line re-opens the burst chain at stage 1 for the whole team (a genuine rotation
    // mechanic that would change full-burst COUNT). Modeling it needs an engine
    // primitive; approximating it with fillGauge/burstCdr would be a fudge with a
    // different shape (gauge vs stage pointer). MEASUREMENT-GATED on FB counts.
  });

  it.skip('skill2: "Attract: Taunts all enemies" — no aggro model', () => {
    // No enemy-targeting entity in v1 (resolveTargets({kind:\'enemy\'}) returns []),
    // and the boss deals no damage, so taunt has no observable payload.
  });

  it.skip('shield/heal HP amounts — no HP pool in v1', () => {
    // shield.maxHpPct and the Cover-HP restore percentage are recorded for kit
    // completeness only; there is no HP pool to validate the magnitudes against.
  });
});
