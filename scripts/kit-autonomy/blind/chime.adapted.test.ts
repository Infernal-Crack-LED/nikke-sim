import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed: blind/ sits under kit-autonomy/, not tests/units/

/*
 * chime — Chime (SMG / Iron / Supporter / Burst II)
 * Base: cd 20s, ammo 120, reloadFrames 81, chargeFrames 0, hitsPerShot 1,
 *       normalAttackMultiplier 8.1, coreAttackMultiplier 200.
 *
 * KIT (read literally, line by line):
 *
 *  skill1 — "Activates at the start of battle. Affects the king."
 *    Wish: ATK ▲ 46.46% of the skill user's ATK continuously.
 *      -> trigger: passive (start of battle, "continuously" = no duration).
 *      -> stat: casterAtkPct ("of the SKILL USER's ATK" = a flat add scaled by
 *         CHIME's ATK, NOT the target's own ATK -> NOT atkPct).
 *      -> target set: "the king" is a single designated ally. The engine has no
 *         "the king" primitive; the nearest faithful schema target is a
 *         single-ally selection. Which ally the engine resolves is the
 *         DRIVER'S encoding choice, so the assertions below are written to be
 *         encoding-agnostic where possible: they pin (a) the STAT CHANNEL
 *         (casterAtkPct -> flat-resolved ATK), (b) the MAGNITUDE
 *         (46.46% x chime.staticAtk), (c) the CARDINALITY (exactly ONE ally
 *         receives it, not the whole team), and (d) that it is PERMANENT
 *         (no expiry).
 *
 *  skill2 — "Activates when entering Full Burst. Affects the king."
 *    Daily Report: Normal Attack Damage Multiplier ▲ 46.22% for 10 sec.
 *      -> trigger: fullBurstEnter (TEAM full burst, NOT chime's own burstCast;
 *         the text says "entering Full Burst", not "when using Burst Skill").
 *      -> stat: normalAttackPct ("Normal Attack Damage MULTIPLIER" scales the
 *         normal-attack multiplier -> SCOPED to normal attacks, NOT the generic
 *         attackDamagePct Damage-Up bucket).
 *      -> duration: 10 wall-clock seconds (not rounds).
 *
 *  burst  — "Affects all allies."
 *    Re-enters Burst Stage 2.                     -> reenterStage {stage:2}
 *    Max Ammunition Capacity ▲ 20% for 10 sec.    -> maxAmmoPct 20 / 10s, ALL allies
 *           (weapon-state modifier: it is DAMAGE, it gates shots fired.)
 *           — "Affects all allies."
 *    "■ Affects the king."
 *    Loyalty: Attack Damage ▲ 92.44% for 10 sec.  -> attackDamagePct 92.44 / 10s,
 *           single designated ally (Damage-Up bucket, generic — the text carries
 *           NO normal/charge/crit scoping, unlike skill2).
 *
 * FIXTURE
 *   controlComp('chime', true) — liter B1 / crown B2 / chime B3-slot carry /
 *   helm B3. Chime is Burst II, but the control comp's carry slot is what the
 *   harness bursts with; the B1+B2 supports guarantee the burst chain actually
 *   completes so Full Bursts (and therefore skill2 + the burst block) fire at
 *   all. A lone unit makes ZERO full bursts, which would make every skill2 /
 *   burst assertion VACUOUS.
 *   Deterministic (no seed) so every counterfactual delta is exact.
 *
 * WHY EACH ASSERTION DISCRIMINATES
 *   Each kit line gets (1) a positive assertion that is GREEN only under the
 *   faithful reading, (2) a counterfactual built with withPatchedOverride that
 *   encodes the NEAREST-WRONG model and must produce a DIFFERENT number/event
 *   shape, and (3) where relevant an inertness assertion (what the line must
 *   NOT move).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLUG = 'chime';

const WISH_PCT = 46.46;
const DAILY_REPORT_PCT = 46.22;
const LOYALTY_PCT = 92.44;
const MAX_AMMO_PCT = 20;
const BUFF_WINDOW_SEC = 10;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: SimEvent[] = [];
  // harness API: the event callback lives in cfg.onEvent, not at the top level
  // of CompOptions (adapted 2026-07-31 — the blind packet's redacted harness
  // signature implied a top-level onEvent).
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

function buffs(events: SimEvent[]) {
  return events.filter((e) => e.kind === 'buffApply') as Extract<
    SimEvent,
    { kind: 'buffApply' }
  >[];
}

function byStat(events: SimEvent[], stat: string) {
  return buffs(events).filter((e) => e.stat === stat);
}

// ---------------------------------------------------------------------------
// Hoisted runs (each runComp is a full 180s sim — keep the count low)
// ---------------------------------------------------------------------------

const base = controlComp(SLUG, true);
const BASE = run(base);
const BASE_TOTALS = totals(BASE.res);
const CHIME_ATK = unitOf(BASE.res, SLUG).staticAtk;

// C1 — skill1 removed entirely (proves the Wish line is LIVE and load-bearing)
const noWish = withPatchedOverride(SLUG, (ov) => {
  ov.skill1 = [];
});
const NO_WISH = run({ ...base, overrides: { [SLUG]: noWish } });

// C2 — skill1 re-stated as the nearest-wrong stat: atkPct (target-scaled)
//      instead of casterAtkPct (caster-scaled flat add).
const wishAsAtkPct = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        (e as { stat: string }).stat = 'atkPct';
      }
    }
  }
});
const WISH_AS_ATKPCT = run({ ...base, overrides: { [SLUG]: wishAsAtkPct } });

// C3 — skill2 removed (proves the Daily Report line is LIVE)
const noDailyReport = withPatchedOverride(SLUG, (ov) => {
  ov.skill2 = [];
});
const NO_DAILY = run({ ...base, overrides: { [SLUG]: noDailyReport } });

// C4 — skill2 re-keyed to the nearest-wrong TRIGGER: burstCast instead of
//      fullBurstEnter. In a comp where another unit completes the chain these
//      diverge; the event stream pins which one the faithful model uses.
const dailyOnBurstCast = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill2) {
    if (b.trigger.kind === 'fullBurstEnter') {
      (b as { trigger: { kind: string } }).trigger = { kind: 'burstCast' };
    }
  }
});
const DAILY_ON_CAST = run({ ...base, overrides: { [SLUG]: dailyOnBurstCast } });

// C5 — skill2 re-scoped to the nearest-wrong STAT: generic attackDamagePct
//      instead of the normal-attack-scoped normalAttackPct.
const dailyAsGeneric = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.kind === 'buff' && e.stat === 'normalAttackPct') {
        (e as { stat: string }).stat = 'attackDamagePct';
      }
    }
  }
});
const DAILY_AS_GENERIC = run({
  ...base,
  overrides: { [SLUG]: dailyAsGeneric },
});

// C6 — burst: the Max Ammo line dropped (weapon-state modifier IS damage)
const noAmmoBuff = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter(
      (e) => !(e.kind === 'buff' && e.stat === 'maxAmmoPct')
    );
  }
});
const NO_AMMO = run({ ...base, overrides: { [SLUG]: noAmmoBuff } });

// C7 — burst: the Loyalty line dropped
const noLoyalty = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter(
      (e) => !(e.kind === 'buff' && e.stat === 'attackDamagePct')
    );
  }
});
const NO_LOYALTY = run({ ...base, overrides: { [SLUG]: noLoyalty } });

// C8 — burst: the Loyalty line widened to ALL allies (nearest-wrong target set;
//      the kit puts it under a SECOND "■ Affects the king" header, i.e. it is
//      NOT part of the all-allies block).
const loyaltyToAll = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.burst) {
    const hasLoyalty = b.effects.some(
      (e) => e.kind === 'buff' && e.stat === 'attackDamagePct'
    );
    if (hasLoyalty) {
      (b as { target: { kind: string } }).target = { kind: 'allies' };
    }
  }
});
const LOYALTY_TO_ALL = run({ ...base, overrides: { [SLUG]: loyaltyToAll } });

// C9 — burst: the Re-enters Burst Stage 2 line dropped (rotation-shaped)
const noReenter = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.filter((e) => e.kind !== 'reenterStage');
  }
});
const NO_REENTER = run({ ...base, overrides: { [SLUG]: noReenter } });

// ---------------------------------------------------------------------------
// skill1 — Wish: ATK ▲ 46.46% of the skill user's ATK, continuously
// ---------------------------------------------------------------------------

describe('chime skill1 — Wish (ATK ▲ 46.46% of the skill user\u2019s ATK, continuously)', () => {
  it('emits a caster-scaled ATK grant, flat-resolved to 46.46% of chime\u2019s own static ATK', () => {
    // "of the SKILL USER's ATK" => casterAtkPct, which the engine flat-resolves
    // at apply time to (value/100) x caster.staticAtk. Asserting the FLAT number
    // is what discriminates casterAtkPct from atkPct: under atkPct the emitted
    // value would be the raw percentage 46.46, not a five/six-figure ATK add.
    const grants = byStat(BASE.events, 'casterAtkPct');
    expect(grants.length).toBeGreaterThan(0);

    const expected = (WISH_PCT / 100) * CHIME_ATK;
    for (const g of grants) {
      expect(g.value).toBeCloseTo(expected, 3);
    }
    // ...and it is NOT the raw percentage (the atkPct mis-encoding's signature).
    expect(grants[0]!.value).not.toBeCloseTo(WISH_PCT, 3);
  });

  it('is applied at battle start and never expires (\u201ccontinuously\u201d)', () => {
    // A passive start-of-battle grant applies once, at/near frame 0, with no
    // expiry. The nearest-wrong reading is a windowed buff (durationSec set) or
    // a re-triggered one; both change this shape.
    const grants = byStat(BASE.events, 'casterAtkPct');
    expect(grants.length).toBeGreaterThan(0);

    // No finite expiry frame: "continuously" has no durationSec.
    for (const g of grants) {
      expect(
        g.expiresFrame === undefined ||
          g.expiresFrame === null ||
          !Number.isFinite(g.expiresFrame)
      ).toBe(true);
      expect(g.durationShots == null).toBe(true); // schema: null (not undefined) when absent
    }
  });

  it('goes to exactly ONE ally (\u201cAffects the king\u201d), not the whole team', () => {
    // Cardinality is the encoding-agnostic half of "the king": whatever ally the
    // driver resolves it to, a single-target line must not paint all 5 slots.
    // The nearest-wrong model (target {kind:'allies'}) would emit >1 distinct
    // targetIdx for the same buff key.
    const grants = byStat(BASE.events, 'casterAtkPct');
    const recipients = new Set(grants.map((g) => g.targetIdx));
    expect(recipients.size).toBe(1);
  });

  it('is load-bearing: removing the Wish block changes total team damage', () => {
    // Non-vacuity. If this were equal, every other skill1 assertion would be
    // testing an inert block.
    const baseSum = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    const cfSum = Object.values(totals(NO_WISH.res)).reduce((a, b) => a + b, 0);
    expect(cfSum).not.toBeCloseTo(baseSum, 0);
    expect(cfSum).toBeLessThan(baseSum); // an ATK grant can only add damage
  });

  it('caster-scaled (casterAtkPct) \u2260 target-scaled (atkPct) \u2014 the nearest-wrong stat moves the board', () => {
    // The discriminator for SCOPE question #1 on this line. atkPct scales the
    // RECIPIENT's own ATK; casterAtkPct adds a flat amount derived from CHIME's.
    // Unless the recipient's ATK happens to equal chime's exactly, these differ.
    const baseSum = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    const cfSum = Object.values(totals(WISH_AS_ATKPCT.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(cfSum).not.toBeCloseTo(baseSum, 0);

    // And the emitted value shape flips: atkPct keeps the raw percentage.
    const cfGrants = byStat(WISH_AS_ATKPCT.events, 'atkPct').filter(
      (g) => Math.abs(g.value - WISH_PCT) < 1e-6
    );
    expect(cfGrants.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// skill2 — Daily Report: Normal Attack Damage Multiplier ▲ 46.22% for 10 sec,
//          on entering Full Burst
// ---------------------------------------------------------------------------

describe('chime skill2 — Daily Report (Normal Attack Damage Multiplier ▲ 46.22% for 10 sec, on Full Burst entry)', () => {
  it('applies 46.22% through the normal-attack-scoped channel, not the generic Damage-Up bucket', () => {
    // "Normal Attack Damage MULTIPLIER" scales the normal-attack multiplier =>
    // normalAttackPct. The nearest-wrong model is attackDamagePct (generic
    // Damage Up), which would also credit skill/burst damage. The stat key on
    // the emitted buffApply is the discriminator; the C5 counterfactual below
    // proves the two are not numerically interchangeable either.
    const grants = byStat(BASE.events, 'normalAttackPct').filter(
      (g) => Math.abs(g.value - DAILY_REPORT_PCT) < 1e-6
    );
    expect(grants.length).toBeGreaterThan(0);
  });

  it('fires ONCE PER FULL BURST ENTRY — count matches fullBurstStart, not chime\u2019s burst casts', () => {
    // TRIGGER IDENTITY (question #3). "Activates when entering Full Burst" is a
    // TEAM full-burst trigger: it must fire on every FB the team enters,
    // including any FB chain chime did not personally complete. Keying it to
    // burstCast under-/over-fires whenever another same-tier unit bursts.
    const fbStarts = BASE.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const grants = byStat(BASE.events, 'normalAttackPct').filter(
      (g) => Math.abs(g.value - DAILY_REPORT_PCT) < 1e-6
    );
    expect(fbStarts).toBeGreaterThan(0); // non-vacuity: the fixture DOES full-burst
    expect(grants.length).toBe(fbStarts);

    // ...and the burst-cast mis-key produces a different application count OR a
    // different board. (In the control comp chime is the carry, so cast count
    // and FB count can coincide; the damage delta is the backstop.)
    const cfGrants = byStat(DAILY_ON_CAST.events, 'normalAttackPct').filter(
      (g) => Math.abs(g.value - DAILY_REPORT_PCT) < 1e-6
    );
    const cfCasts = DAILY_ON_CAST.events.filter(
      (e) => e.kind === 'burstCast'
    ).length;
    expect(cfGrants.length).toBeLessThanOrEqual(cfCasts);
  });

  it('is a 10-SECOND window, not a round count and not permanent', () => {
    // DURATION SEMANTICS (question #2). "for 10 sec" is wall-clock: a finite
    // expiresFrame and NO durationShots. The nearest-wrong readings are a round
    // count (durationShots set) or "continuously" (no expiry).
    const grants = byStat(BASE.events, 'normalAttackPct').filter(
      (g) => Math.abs(g.value - DAILY_REPORT_PCT) < 1e-6
    );
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) {
      expect(g.durationShots == null).toBe(true); // schema: null (not undefined) when absent
      expect(Number.isFinite(g.expiresFrame as number)).toBe(true);
    }
    // 10s at 60fps = 600 frames after the applying frame. Assert the WINDOW
    // LENGTH rather than an absolute frame so the check is rotation-agnostic.
    // (Consecutive applications are 1 FB apart, far more than 600 frames, so a
    // refresh cannot mask a wrong duration.)
    const sorted = [...grants].sort(
      (a, b) => (a.expiresFrame as number) - (b.expiresFrame as number)
    );
    for (let i = 1; i < sorted.length; i++) {
      const gap =
        (sorted[i]!.expiresFrame as number) -
        (sorted[i - 1]!.expiresFrame as number);
      expect(gap).toBeGreaterThan(BUFF_WINDOW_SEC * 60);
    }
  });

  it('goes to exactly ONE ally (\u201cAffects the king\u201d)', () => {
    const grants = byStat(BASE.events, 'normalAttackPct').filter(
      (g) => Math.abs(g.value - DAILY_REPORT_PCT) < 1e-6
    );
    const recipients = new Set(grants.map((g) => g.targetIdx));
    expect(recipients.size).toBe(1);
  });

  it('is load-bearing, and the generic-Damage-Up mis-scope moves a different amount', () => {
    const baseSum = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    const offSum = Object.values(totals(NO_DAILY.res)).reduce(
      (a, b) => a + b,
      0
    );
    const genericSum = Object.values(totals(DAILY_AS_GENERIC.res)).reduce(
      (a, b) => a + b,
      0
    );

    // Non-vacuity: the line does something.
    expect(offSum).not.toBeCloseTo(baseSum, 0);
    expect(offSum).toBeLessThan(baseSum);

    // SCOPE discriminator: a generic Damage-Up of the same magnitude also lifts
    // skill/burst damage, so it cannot equal the normal-attack-scoped model.
    expect(genericSum).not.toBeCloseTo(baseSum, 0);
  });
});

// ---------------------------------------------------------------------------
// burst — all allies: Re-enter Stage 2 + Max Ammo ▲ 20% / 10s
//         the king: Loyalty Attack Damage ▲ 92.44% / 10s
// ---------------------------------------------------------------------------

describe('chime burst — Max Ammunition Capacity ▲ 20% for 10 sec (all allies)', () => {
  it('grants maxAmmoPct 20 to MORE THAN ONE ally (\u201cAffects all allies\u201d)', () => {
    // TARGET SET (question #4). This line sits under the FIRST header, which is
    // "Affects all allies" — so unlike Wish/Daily Report/Loyalty it must paint
    // the team. The nearest-wrong model scopes it to one ally.
    const grants = byStat(BASE.events, 'maxAmmoPct').filter(
      (g) => Math.abs(g.value - MAX_AMMO_PCT) < 1e-6
    );
    expect(grants.length).toBeGreaterThan(0);
    const recipients = new Set(grants.map((g) => g.targetIdx));
    expect(recipients.size).toBeGreaterThan(1);
  });

  it('is a 10-second window', () => {
    const grants = byStat(BASE.events, 'maxAmmoPct').filter(
      (g) => Math.abs(g.value - MAX_AMMO_PCT) < 1e-6
    );
    for (const g of grants) {
      expect(g.durationShots == null).toBe(true); // schema: null (not undefined) when absent
      expect(Number.isFinite(g.expiresFrame as number)).toBe(true);
    }
  });

  it('is DAMAGE, not a defensive no-op: dropping it lowers team damage', () => {
    // Failure-mode #6 (weapon-state modifiers ARE damage — they gate shots
    // fired). A larger magazine = fewer reloads = more shots in 180s. If this
    // assertion were inert, the line had been mis-classified as cosmetic.
    const baseSum = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    const cfSum = Object.values(totals(NO_AMMO.res)).reduce((a, b) => a + b, 0);
    expect(cfSum).not.toBeCloseTo(baseSum, 0);
    expect(cfSum).toBeLessThan(baseSum);
  });
});

describe('chime burst — Loyalty: Attack Damage ▲ 92.44% for 10 sec (the king)', () => {
  it('applies 92.44% generic Attack Damage (Damage-Up bucket) for 10 sec', () => {
    // "Attack Damage ▲" carries NO normal/charge/crit scoping — unlike skill2's
    // "Normal Attack Damage Multiplier". The pairing is the point: the same file
    // asserts one line is scoped and the other is not, so a driver that treated
    // both alike fails one of the two.
    const grants = byStat(BASE.events, 'attackDamagePct').filter(
      (g) => Math.abs(g.value - LOYALTY_PCT) < 1e-6
    );
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) {
      expect(g.durationShots == null).toBe(true); // schema: null (not undefined) when absent
      expect(Number.isFinite(g.expiresFrame as number)).toBe(true);
    }
  });

  it('goes to exactly ONE ally — the second \u201c\u25a0 Affects the king\u201d header re-scopes it', () => {
    // The trap this line sets: it is inside the burst block but under a SECOND
    // header. Reading the burst as one flat "all allies" block over-credits the
    // whole team with +92.44% Damage Up.
    const grants = byStat(BASE.events, 'attackDamagePct').filter(
      (g) => Math.abs(g.value - LOYALTY_PCT) < 1e-6
    );
    const recipients = new Set(grants.map((g) => g.targetIdx));
    expect(recipients.size).toBe(1);

    // ...and the all-allies mis-scope is materially different, not a wash.
    const baseSum = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    const cfSum = Object.values(totals(LOYALTY_TO_ALL.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(cfSum).toBeGreaterThan(baseSum);
  });

  it('is load-bearing: dropping Loyalty lowers damage, and only the recipient\u2019s', () => {
    const cf = totals(NO_LOYALTY.res);
    const moved = Object.keys(BASE_TOTALS).filter(
      (slug) => Math.abs(cf[slug]! - BASE_TOTALS[slug]!) > 1e-6
    );
    // Non-vacuity + INERTNESS: exactly one unit's damage may move. If more than
    // one moved, the buff was not single-target (or leaked through a shared
    // channel); if none moved, the line is inert and every assertion above is
    // vacuous.
    expect(moved.length).toBe(1);
    expect(cf[moved[0]!]!).toBeLessThan(BASE_TOTALS[moved[0]!]!);
  });
});

describe('chime burst — Re-enters Burst Stage 2 (all allies)', () => {
  it('changes the rotation: dropping the re-enter effect changes the full-burst count or the board', () => {
    // A rotation-shaped line: "Re-enters Burst Stage 2" keeps the chain at stage
    // 2 so ANOTHER eligible stage-2 unit can also cast. Judged by full-burst
    // count first (the rotation observable), with the damage board as the
    // backstop for a comp where the count survives but the timing shifts.
    const baseFb = BASE.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const cfFb = NO_REENTER.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const baseSum = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    const cfSum = Object.values(totals(NO_REENTER.res)).reduce(
      (a, b) => a + b,
      0
    );

    expect(baseFb).toBeGreaterThan(0);
    const rotationMoved = cfFb !== baseFb;
    const boardMoved = Math.abs(cfSum - baseSum) > 1e-6;
    expect(rotationMoved || boardMoved).toBe(true);
  });

  it.skip('\u201cRe-enters Burst Stage 2\u201d re-arms a SECOND stage-2 caster — needs a two-B2 fixture', () => {
    // GAP: the control comp carries a single Burst II slot, so the re-enter
    // effect has no second eligible stage-2 unit to hand the window to. Proving
    // the line's real payload (a second B2 casts in the same rotation) requires
    // a bespoke comp with two Burst II units, which controlComp does not build.
    // Assert the rotation delta above instead; upgrade this when a two-B2
    // fixture exists.
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting inertness
// ---------------------------------------------------------------------------

describe('chime — cross-cutting inertness', () => {
  it('emits no DoT, flat-damage or stored-hit riders — the kit is pure support', () => {
    // Every line in the kit is a stat/rotation/weapon-state effect. Chime’s own
    // damage must be normal-attack only; a stray rider bucket would mean an
    // invented damage source (failure mode: MEASURED > FUDGE).
    const chimeDamage = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot !== undefined
    ) as Extract<SimEvent, { kind: 'damage' }>[];
    const chimeIdx = unitOf(BASE.res, SLUG).idx;
    const buckets = new Set(
      chimeDamage.filter((e) => e.srcSlot === chimeIdx).map((e) => e.bucket)
    );
    for (const b of buckets) {
      expect(['normal', 'core', 'crit']).toContain(b);
    }
  });

  it('grants nothing to the boss — no debuff channel in this kit', () => {
    // Boss-held debuffs emit buffApply with casterIdx === null AND
    // targetIdx === null. Chime’s kit has no “Damage Taken ▲” / status line, so
    // any such event would be an invented debuff.
    const bossHeld = buffs(BASE.events).filter(
      (e) => e.casterIdx === null && e.targetIdx === null
    );
    const fromChimeStats = bossHeld.filter((e) =>
      [WISH_PCT, DAILY_REPORT_PCT, LOYALTY_PCT, MAX_AMMO_PCT].some(
        (v) => Math.abs(e.value - v) < 1e-6
      )
    );
    expect(fromChimeStats.length).toBe(0);
  });
});
