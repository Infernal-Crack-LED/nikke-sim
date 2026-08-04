// PER-UNIT KIT SPEC — `sakura-suzuhara` (Sakura Suzuhara, Supporter/SMG/Water, Burst I,
// cd 40s, ammo 120, hitsPerShot 1, RL 5.7). Kit-autonomy gauntlet 2026-08-04, test-first.
// NOT base `sakura` (SR/Fire) and NOT `sakura-bloom-in-summer` (AR/Wind) — distinct units.
//
// One assertion group per KIT LINE (L1..L4 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) and to ISOLATE a fixture line that
// would otherwise pollute attribution — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['sakura-suzuhara'].skills):
//   S1 ■ 120 normal attacks landed → the target: Damage Taken ▲17.18% for 5 sec          [L1]
//   S2 ■  60 normal attacks landed → 2 lowest-HP allies: Incoming healing ▲15.18% / 10s  [L2]
//      ■ 120 normal attacks landed → 2 lowest-HP allies: Damage Taken ▼14.97% / 10s      [L3]
//   BU → 2 lowest-HP allies: recovers 10.03% of the skill user's final Max HP
//        every 1 sec for 10 sec                                                           [L4]
//
// Line dispositions:
//   L1 ENACTED — the engine's ONLY damageTakenPct channel is the boss debuff (positive =
//      boss takes MORE; sim.ts dmgTakenSum → `taken` multiplier), and the kit's 'Damage
//      Taken ▲ on the target' is exactly that. LOAD-BEARING: amplifies ALL team damage
//      while up. hitCount:120 = her full magazine (ammo 120, hitsPerShot 1), so the debuff
//      lands once per mag dump (~5.0s fire + 81f reload ≈ 6.35s cycle) and its 5s duration
//      lapses before each refresh (~79% uptime) — the cadence is pinned against her own
//      shot count, not a magic number.
//   L2 UNMODELED — 'Incoming healing ▲' has nothing to amplify: v1's 'heal' effect carries
//      no HP amount and there is no healing-received stat (validate-overrides STATS list).
//      Damage-neutral; pinned only by the negative assertions (nothing may come out of her
//      skill2 slot).
//   L3 UNMODELED + ⚑ — ally 'Damage Taken ▼' is received-damage mitigation; v1 models no
//      ally HP pool and no incoming damage (noise precedent). The boss-facing
//      damageTakenPct channel is the WRONG direction/target — encoding it would manufacture
//      a phantom team damage gain. Pinned by the negative assertions.
//   L4 ENACTED (damage-inert, observable) — 'heal' ticks:10 intervalSec:1 = the documented
//      HoT encoding ('Recovers X% every 1 sec for N sec', types.ts heal comment; helm H2
//      precedent 'a heal is an event, not a number'). Emits 10 recovery events per cast to
//      each of the 2 targets, driving on-recovery consumers. The 10.03%-of-final-Max-HP
//      MAGNITUDE is not numerically modeled (no HP pool) — only the cadence/shape is.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   L1  nearest-wrong = (a) treat the whole kit as inert support (S1 removed): team damage
//       must DROP without the debuff; (b) a PASSIVE always-on debuff (no hitCount gate):
//       applies exactly ONCE at t=0 with 100% uptime, so both the per-mag cadence count and
//       the team total must differ from shipped; (c) wrong channel (ally-held damageTakenPct
//       or self ATK buff): the negative pin + target pin rule it out.
//   L4  nearest-wrong = (a) burst removed: zero recovery-driven crown buffs; (b) a single
//       INSTANT heal (ticks:1) instead of the 10-tick HoT: exactly 1/10 the recovery events
//       and zero intra-cast spread. Crown is the fixture's recovery consumer (her S2
//       'recovery → all allies attackDamagePct 20.99/7s' — value-distinct from her own
//       burst's 36.24 grant, so attribution is clean).
//
// Fixture: [sakura-suzuhara (B1/40s), crown (B2/20s), ada (B3/40s)] boss Fire — one caster
// per burst stage so the chain runs and her Burst I casts (a lone B1 can never open a Full
// Burst). Crown's own hitCount:860 self-heal would ALSO emit recovery events once her MG
// cadence accrues 860 hits (~60s in), so it is patched out (helm-test crownNoHeal pattern) —
// every 20.99 buffApply in the log is then attributable to Sakura's burst heal. Deterministic
// (no seed); assertions are event-log based, not total-based (except the damage-movement
// arms, which compare totals between shipped and a counterfactual).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const SLUG = 'sakura-suzuhara';
const SAKURA = 0;
const CROWN = 1;
const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

/** Crown's S2 hitCount:860 self-heal removed — see file header (isolation, helm pattern). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [SLUG, 'crown', 'ada'],
    bossElement: 'Fire',
    overrides: { crown: crownNoHeal, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const shotsOf = (events: SimEvent[]): Shot[] =>
  events.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
/** L1 channel pin: sakura-cast boss debuffs. Enemy-buff buffApply events carry
 *  casterIdx null (the enemy applyBuff call passes none) — owner attribution rides on
 *  `key` = `${ownerIdx}:${slot}:${stat}:${value}`, and targetIdx null = the boss. */
const sakuraTakenDebuffs = (events: SimEvent[]): BuffApply[] =>
  events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.stat === 'damageTakenPct' &&
      e.targetIdx === null &&
      e.key.startsWith(`${SAKURA}:skill1:`)
  );
/** L3 negative pin: damageTakenPct held by ANY ally (wrong direction/target). */
const allyTakenBuffs = (events: SimEvent[]): BuffApply[] =>
  events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.stat === 'damageTakenPct' &&
      e.targetIdx !== null
  );
/** L2/L3 negative pin: anything at all coming out of sakura's skill2 slot. */
const sakuraSkill2Buffs = (events: SimEvent[]): BuffApply[] =>
  events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.key.startsWith(`${SAKURA}:skill2:`)
  );
/** L4 observable: crown's recovery-triggered team ATK buff (value-distinct 20.99). */
const crownRecoveryBuffs = (events: SimEvent[]): BuffApply[] =>
  events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.stat === 'attackDamagePct' &&
      e.value === 20.99 &&
      e.casterIdx === CROWN
  );
const sakuraCasts = (events: SimEvent[]): BurstCast[] =>
  events.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.unitIdx === SAKURA
  );

// Counterfactuals on sakura's OWN override are lazy — before S3 there is no override on
// disk, so every test must fail on its own assertion (a module-load throw would collapse
// the whole suite into one error and hide the per-line RED state).
const sakuraPatch = (mutate: (ov: any) => void) => () =>
  withPatchedOverride(SLUG, mutate);

/** L1 reference: her S1 debuff line removed entirely (nearest-wrong: pure inert support). */
const sakuraNoS1 = sakuraPatch((ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.kind === 'buff' && e.stat === 'damageTakenPct'
      )
  );
  if (ov.skill1.length === before) {
    throw new Error(
      'sakura-suzuhara S1 damageTakenPct block missing — fixture is stale'
    );
  }
});
/** L1 counterfactual: the same debuff as a PASSIVE always-on grant (no hitCount gate). */
const sakuraPassiveS1 = sakuraPatch((ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'buff' && e.stat === 'damageTakenPct')
  );
  if (!b) {
    throw new Error(
      'sakura-suzuhara S1 damageTakenPct block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'passive' };
});
/** L4 reference: her burst heal line removed. */
const sakuraNoHeal = sakuraPatch((ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.burst.length === before) {
    throw new Error(
      'sakura-suzuhara burst heal block missing — fixture is stale'
    );
  }
});
/** L4 counterfactual: the HoT collapsed to a single instant heal (ticks dropped). */
const sakuraInstantHeal = sakuraPatch((ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'heal');
  if (!e) {
    throw new Error(
      'sakura-suzuhara burst heal effect missing — fixture is stale'
    );
  }
  delete e.ticks;
  delete e.intervalSec;
});

describe('sakura-suzuhara kit spec', () => {
  // ---- L1: S1 'after 120 normal attacks → target Damage Taken ▲17.18% / 5s' ----

  it('L1 debuff lands on the BOSS with the exact kit numbers', () => {
    const { events } = run();
    const debuffs = sakuraTakenDebuffs(events);
    expect(debuffs.length).toBeGreaterThan(0);
    // accrues to the 120th landed round (~6s of SMG fire) — never a t=0 passive grant.
    expect(debuffs[0].frame).toBeGreaterThan(0);
    for (const d of debuffs) {
      expect(d.value).toBe(17.18); // kit-text literal (Lv.10)
      expect(d.expiresFrame).not.toBeNull();
      expect(d.expiresFrame! - d.frame).toBe(5 * FPS); // 'for 5 sec'
    }
  });

  it('L1 cadence: exactly once per 120 landed hits (her full magazine)', () => {
    const { events } = run();
    const nShots = shotsOf(events).length;
    expect(nShots).toBeGreaterThan(120); // SMG cadence sanity (180s fight)
    expect(sakuraTakenDebuffs(events).length).toBe(Math.floor(nShots / 120));
  });

  it('L1 is load-bearing: team damage drops with the debuff removed', () => {
    const shipped = run();
    const noS1 = run({ [SLUG]: sakuraNoS1() });
    expect(sakuraTakenDebuffs(noS1.events).length).toBe(0);
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(shipped.totals)).toBeGreaterThan(sum(noS1.totals));
  });

  it('L1 discriminates vs a passive always-on debuff (the gate is observable)', () => {
    const shipped = run();
    const passive = run({ [SLUG]: sakuraPassiveS1() });
    // passive applies ONCE at t=0 (refreshes never expire-and-reapply within the fight),
    // shipped re-applies once per mag dump — the counts cannot match.
    expect(sakuraTakenDebuffs(passive.events).length).toBe(1);
    expect(sakuraTakenDebuffs(shipped.events).length).toBeGreaterThan(1);
    // 100% uptime vs ~79% uptime: the passive CF must move the team total.
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(passive.totals)).not.toBeCloseTo(sum(shipped.totals), 0);
  });

  // ---- L4: burst 'recovers 10.03% of final Max HP every 1s for 10s' (2 lowest-HP allies) ----

  it('L4 she casts her Burst I and it drives crown recovery consumer', () => {
    const { events } = run();
    const casts = sakuraCasts(events).length;
    expect(casts).toBeGreaterThanOrEqual(3); // 40s CD over 180s
    // every cast emits 10 recovery ticks to crown (one of the leftmost-2 = heal targets);
    // each tick fires crown's recovery block, which buffs all 3 allies.
    expect(crownRecoveryBuffs(events).length).toBe(casts * 10 * 3);
  });

  it('L4 ticks are 1s apart across the 10s window (HoT, not an instant heal)', () => {
    const { events } = run();
    const casts = sakuraCasts(events);
    expect(casts.length).toBeGreaterThan(0);
    for (const cast of casts) {
      const inWindow = crownRecoveryBuffs(events).filter(
        (b) => b.frame >= cast.frame && b.frame <= cast.frame + 9 * FPS
      );
      // 10 ticks × 3 allies within the 10s HoT window of this cast.
      expect(inWindow.length).toBe(30);
      // first tick lands with the cast, last tick 9 intervals later.
      const frames = inWindow.map((b) => b.frame);
      expect(Math.max(...frames) - Math.min(...frames)).toBe(9 * FPS);
    }
  });

  it('L4 discriminates vs burst-removed and instant-heal counterfactuals', () => {
    const shipped = run();
    const noHeal = run({ [SLUG]: sakuraNoHeal() });
    expect(crownRecoveryBuffs(noHeal.events).length).toBe(0);

    const instant = run({ [SLUG]: sakuraInstantHeal() });
    const casts = sakuraCasts(instant.events).length;
    // 1 tick instead of 10 → exactly 1/10 the recovery events.
    expect(crownRecoveryBuffs(instant.events).length).toBe(casts * 1 * 3);
    expect(crownRecoveryBuffs(instant.events).length).toBeLessThan(
      crownRecoveryBuffs(shipped.events).length
    );
  });

  // ---- L2/L3 negative pins: the UNMODELED skill2 lines must produce NOTHING ----

  it('L3 no ally-held damageTakenPct (wrong direction/target is never encoded)', () => {
    const { events } = run();
    expect(allyTakenBuffs(events).length).toBe(0);
  });

  it('L2/L3 nothing comes out of her skill2 slot at all', () => {
    const { events } = run();
    expect(sakuraSkill2Buffs(events).length).toBe(0);
  });

  // ---- B1-contention arm: burstCast vs fullBurstEnter identity (rumani/helm-aquamarine
  //      pattern) — with a second Burst I in the team, some Full Bursts are opened by
  //      liter, and her heal must NOT fire on those rotations. ----

  const LITER = 2; // [sakura, crown, liter, ada] — crown stays slot 1 (leftmost-2 heal target)

  function runContention(overrides: Record<string, any> = {}) {
    const events: SimEvent[] = [];
    const res = runComp({
      slugs: [SLUG, 'crown', 'liter', 'ada'],
      bossElement: 'Fire',
      overrides: { crown: crownNoHeal, ...overrides },
      cfg: { onEvent: (e) => events.push(e) },
    });
    return { events, totals: totals(res) };
  }
  const literCasts = (events: SimEvent[]) =>
    events.filter(
      (e): e is BurstCast => e.kind === 'burstCast' && e.unitIdx === LITER
    ).length;

  // With two B1s the rotation is messy ON PURPOSE: chains break (a B1 cast with no B2/B3
  // follow-up never opens a Full Burst) and liter opens FBs sakura-suzuhara did not cast.
  // burstCast must anchor the heal to HER casts — including broken-chain casts — while
  // fullBurstEnter would anchor it to the team's FB windows (most of them liter-opened).
  const N_ALLIES = 4; // fixture size: one buffApply per tick per ally
  /** Each FB, tagged with whether HER cast opened it (her stage-1 cast lands ~82f prior). */
  const openedBy = (events: SimEvent[]) => {
    const casts = sakuraCasts(events);
    return events
      .filter((e) => e.kind === 'fullBurstStart')
      .map((fb) => ({
        frame: fb.frame,
        hers: casts.some(
          (c) => fb.frame - c.frame >= 0 && fb.frame - c.frame <= 120
        ),
      }));
  };
  const inWindow = (events: SimEvent[], anchor: number) =>
    crownRecoveryBuffs(events).filter(
      (b) => b.frame >= anchor && b.frame <= anchor + 9 * FPS
    ).length;
  const fullWindow = (anchor: number) => anchor + 9 * FPS <= 180 * FPS;

  it('contention: heal anchors to HER casts (even broken-chain ones), never to liter-opened FBs', () => {
    const { events } = runContention();
    const casts = sakuraCasts(events);
    expect(casts.length).toBeGreaterThanOrEqual(1);
    expect(literCasts(events)).toBeGreaterThanOrEqual(1);
    // every cast whose full 10s window fits the fight emits 10 ticks × 4 allies.
    const complete = casts.filter((c) => fullWindow(c.frame));
    expect(complete.length).toBeGreaterThanOrEqual(3);
    for (const c of complete) {
      expect(inWindow(events, c.frame)).toBe(10 * N_ALLIES);
    }
    // she has casts that never became a Full Burst (broken chain) — the heal fired anyway.
    expect(casts.length).toBeGreaterThan(
      openedBy(events).filter((f) => f.hers).length
    );
    // no recovery stream inside any liter-opened FB window.
    const literOpened = openedBy(events).filter((f) => !f.hers);
    expect(literOpened.length).toBeGreaterThanOrEqual(1);
    for (const fb of literOpened) {
      expect(inWindow(events, fb.frame)).toBe(0);
    }
  });

  it('contention: fullBurstEnter counterfactual heals on liter-opened rotations instead', () => {
    const shipped = runContention();
    const cf = runContention({
      [SLUG]: withPatchedOverride(SLUG, (ov) => {
        const b = ov.burst.find((x: any) =>
          x.effects.some((e: any) => e.kind === 'heal')
        );
        if (!b) {
          throw new Error(
            'sakura-suzuhara burst heal block missing — fixture is stale'
          );
        }
        b.trigger = { kind: 'fullBurstEnter' };
      }),
    });
    // keyed to every team FB window (most liter-opened) — 10 ticks × 4 allies per window.
    const fbs = openedBy(cf.events).filter((f) => fullWindow(f.frame));
    expect(fbs.length).toBeGreaterThanOrEqual(3);
    for (const fb of fbs) {
      expect(inWindow(cf.events, fb.frame)).toBe(10 * N_ALLIES);
    }
    // recovery streams land on liter-opened rotations where shipped has NONE.
    const literOpened = fbs.filter((f) => !f.hers);
    expect(literOpened.length).toBeGreaterThanOrEqual(1);
    for (const fb of literOpened) {
      expect(inWindow(shipped.events, fb.frame)).toBe(0);
    }
    expect(crownRecoveryBuffs(cf.events).length).not.toBe(
      crownRecoveryBuffs(shipped.events).length
    );
  });
});
