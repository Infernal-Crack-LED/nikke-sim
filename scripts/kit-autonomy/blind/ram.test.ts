/**
 * ram (Ram) — SR / Fire / Defender / Burst I — BLIND cross-family kit spec test.
 * Written from the kit prose alone; the driver's override, tests and reasoning were not consulted.
 *
 * KIT LINES (structure only)
 *   S1-a  trigger 'after landing 5 normal attack(s)' -> the target(s): ATK down 7.95%, 5 sec
 *   S1-b  trigger 'when Full Burst ends' + a same-squad ally present -> self: Burst CD down 20.16 sec
 *   S2-a  no activation clause -> self: Max HP up 40.72% (explicitly without restoring HP), 10 sec
 *   S2-b  no activation clause -> the 2 allies with the lowest remaining HP:
 *         DEF up 11.34% of the skill user's DEF, 5 sec
 *   B     on burst -> all allies: Shield = 10.08% of the skill user's final Max HP, 10 sec
 *
 * FIXTURE — controlComp('ram', true): liter (B1) / crown (B2) / ram / helm (B3).
 *   The fixed B3 is MANDATORY here: S1-b keys off Full Burst END, which only ever happens if the
 *   team completes a I -> II -> III chain. Ram is herself Burst I, so she SHARES stage 1 with liter
 *   and is not guaranteed to be the selected caster in any rotation. Every rotation assertion is
 *   therefore written DIRECTIONALLY (a burst-cooldown reduction can only make full bursts come
 *   sooner or leave them unchanged, never later), and S1-b's trigger identity / squad gate /
 *   magnitude are pinned STRUCTURALLY off the override clone, which is deterministic regardless of
 *   who wins stage 1. A purely behavioural pin on S1-b would be vacuous if liter always casts.
 *
 * WHY EACH GROUP DISCRIMINATES
 *   S1-a  the debuff is on the BOSS. The engine has no enemy entity, so the faithful model is
 *         damage-inert. The nearest-wrong models are (i) re-badging it as damageTakenPct, which
 *         WOULD raise the whole team's damage, and (ii) flipping the sign or the scope onto allies.
 *         Both are asserted absent, structurally and in the event log.
 *   S1-b  the only line in this kit that can move damage at all — it accelerates the rotation.
 *         Nearest-wrong: fullBurstEnter / burstCast keying (fires at the wrong edge, and on any
 *         team burst), target allies (team-wide CDR), a dropped sameSquad gate (fires with no
 *         squadmate present), oncePerBattle, or a wrong seconds value.
 *   S2-a  Max HP is offensively inert for ram — she has no HP-to-ATK conversion — but it is kept
 *         for kit completeness and because her own burst shield scales off her final Max HP.
 *         Nearest-wrong: routing it into ATK (atkOfMaxHpPct), caught by the byte-identical totals
 *         assertion; or granting it to allies, caught by the maxHpFlat target counts.
 *   S2-b  'of the skill user's DEF' has no StatKey in the schema and defPct is inert in v1, so
 *         either encoding must be damage-neutral and must never surface as an ATK grant.
 *   B     no shield event is exposed on cfg.onEvent and no unit in the control comp carries a
 *         shielded trigger, so the payload is pinned structurally and shown damage-inert here.
 *
 * RUNS: 7 (base + 6 counterfactuals), all hoisted at module scope.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- the override JSON and the SimEvent union are
   read structurally in this blind spec test; it must not assume field names it cannot see. */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-08-05 (driver, mechanical): blind/ sits under kit-autonomy/, not tests/units/ — no assertion changed

const SLUG = 'ram';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type AnyRec = Record<string, any>;
type AnyEv = SimEvent & AnyRec;

const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

/** The override file is slot-keyed; tolerate both `slot: Block[]` and `slot: { blocks: Block[] }`. */
function blocksOf(ov: AnyRec, slot: string): AnyRec[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s as AnyRec[];
  if (s && Array.isArray(s.blocks)) return s.blocks as AnyRec[];
  return [];
}
const effectsOf = (b: AnyRec): AnyRec[] => (Array.isArray(b?.effects) ? b.effects : []);
const allBlocks = (ov: AnyRec): AnyRec[] => SLOTS.flatMap((s) => blocksOf(ov, s));
const allEffects = (ov: AnyRec): AnyRec[] => allBlocks(ov).flatMap(effectsOf);

function unmodeledOf(ov: AnyRec, slot: string): string[] {
  const top = ov?.unmodeled?.[slot];
  const nested = ov?.[slot]?.unmodeled?.[slot];
  return [
    ...(Array.isArray(top) ? (top as string[]) : []),
    ...(Array.isArray(nested) ? (nested as string[]) : []),
  ];
}

const isMaxHpBuff = (e: AnyRec) =>
  e.kind === 'buff' && /maxhp/i.test(String(e.stat)) && near(Number(e.value), 40.72, 0.2);
const isDefBuff = (e: AnyRec) => e.kind === 'buff' && /def/i.test(String(e.stat));
const isAtkStat = (e: AnyRec) => e.kind === 'buff' && /atk/i.test(String(e.stat));
const isDamageEffect = (e: AnyRec) =>
  ['flatDamage', 'dot', 'hitRepeat', 'storedHit', 'stackedNuke'].includes(String(e.kind));

const pristine = () => withPatchedOverride(SLUG, () => {}) as unknown as AnyRec;
const patched = (mutate: (ov: AnyRec) => void) =>
  withPatchedOverride(SLUG, mutate as any);

function dropEffects(ov: AnyRec, slot: string, pred: (e: AnyRec) => boolean) {
  for (const b of blocksOf(ov, slot)) b.effects = effectsOf(b).filter((e) => !pred(e));
}

function run(override?: unknown) {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true) as unknown as AnyRec;
  const onEvent = (e: SimEvent) => events.push(e);
  opts.cfg = { ...(opts.cfg ?? {}), onEvent };
  if (override !== undefined) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: override };
  }
  const res = runComp(opts as any);
  return { res, events, tot: totals(res) };
}
type Run = ReturnType<typeof run>;

const buffApplies = (r: Run) => r.events.filter((e) => e.kind === 'buffApply') as AnyEv[];
const countKind = (r: Run, kind: string) => r.events.filter((e) => e.kind === kind).length;
const maxHpFlatTo = (r: Run, want: (slug: string) => boolean) =>
  buffApplies(r).filter(
    (e) => String(e.stat) === 'maxHpFlat' && want(String(e.targetSlug ?? '')),
  ).length;

// ---- hoisted runs (7 full 180s sims) ------------------------------------------------------
const OV = pristine();
const base = run();
const noCdr = run(patched((ov) => dropEffects(ov, 'skill1', (e) => e.kind === 'burstCdr')));
const cdrUngated = run(
  patched((ov) => {
    for (const b of blocksOf(ov, 'skill1')) {
      if (effectsOf(b).some((e) => e.kind === 'burstCdr')) delete b.teamHas;
    }
  }),
);
const noMaxHp = run(patched((ov) => dropEffects(ov, 'skill2', isMaxHpBuff)));
const maxHpToAllies = run(
  patched((ov) => {
    for (const b of blocksOf(ov, 'skill2')) {
      if (effectsOf(b).some(isMaxHpBuff)) b.target = { kind: 'allies' };
    }
  }),
);
const noDef = run(patched((ov) => dropEffects(ov, 'skill2', isDefBuff)));
const noShield = run(patched((ov) => dropEffects(ov, 'burst', (e) => e.kind === 'shield')));

describe('ram — fixture sanity', () => {
  it('ram fires and the comp actually reaches Full Burst (non-vacuity for every gated line)', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // S1-b keys off Full Burst END; if the fixture never entered/left a Full Burst the whole
    // rotation group below would be testing nothing.
    expect(countKind(base, 'fullBurstStart')).toBeGreaterThan(0);
    expect(countKind(base, 'fullBurstEnd')).toBeGreaterThan(0);
  });
});

describe('ram — skill1-a: ATK down 7.95% on the target after 5 landed normals', () => {
  it('is enemy-scoped with a negative value on a 5-hit counter, or is explicitly unmodeled', () => {
    const atkDownBlocks = allBlocks(OV).filter((b) =>
      effectsOf(b).some(
        (e) => isAtkStat(e) && near(Math.abs(Number(e.value)), 7.95, 0.1),
      ),
    );
    if (atkDownBlocks.length > 0) {
      // Faithful: a debuff on the boss, fired every 5 ROUNDS (ram is 1 hit/shot), 5 sec window.
      // Nearest-wrong it fails under: ally/self scope, positive sign, a shotFired/interval trigger.
      for (const b of atkDownBlocks) {
        expect(b.target?.kind).toBe('enemy');
        expect(b.trigger?.kind).toBe('hitCount');
        expect(Number(b.trigger?.count)).toBe(5);
        for (const e of effectsOf(b).filter(isAtkStat)) {
          expect(Number(e.value)).toBeLessThan(0);
          expect(Number(e.durationSec)).toBeCloseTo(5, 3);
        }
      }
    } else {
      // The engine resolves an enemy target to nobody, so skipping is defensible — but only if
      // the drop is recorded verbatim rather than silent.
      expect(unmodeledOf(OV, 'skill1').join(' ').includes('7.95')).toBe(true);
    }
  });

  it('never becomes team damage: no Damage Taken debuff and no ally-facing ATK grant anywhere', () => {
    // Ram's kit contains ZERO ATK grants and ZERO Damage Taken lines. Re-badging her boss ATK
    // debuff as damageTakenPct is the one mis-model that would silently inflate the whole team.
    expect(
      allEffects(OV).filter((e) => e.kind === 'buff' && String(e.stat) === 'damageTakenPct'),
    ).toHaveLength(0);
    const allyAtkBlocks = allBlocks(OV).filter(
      (b) => b.target?.kind !== 'enemy' && effectsOf(b).some(isAtkStat),
    );
    expect(allyAtkBlocks).toHaveLength(0);
    // Boss-held debuffs emit with casterIdx === null AND targetIdx === null, so filter by stat+value.
    const badBoss = buffApplies(base).filter(
      (e) => String(e.stat) === 'damageTakenPct' && near(Number(e.value), 7.95, 0.2),
    );
    expect(badBoss).toHaveLength(0);
  });

  it.skip('the boss-side ATK reduction itself is unobservable — v1 models no enemy entity and no incoming damage', () => {
    // GAP: resolveTargets({kind:enemy}) returns []; there is no boss ATK, HP pool or player damage
    // taken in the sim, so the payload has no observable channel. Only its ABSENCE from the ally
    // side (asserted above) is testable.
  });
});

describe('ram — skill1-b: Burst CD down 20.16 sec at Full Burst end, same-squad gated', () => {
  it('is keyed to fullBurstEnd, self-targeted, squad-gated, repeatable, at 20.16 sec', () => {
    const cdrBlocks = allBlocks(OV).filter((b) =>
      effectsOf(b).some((e) => e.kind === 'burstCdr'),
    );
    expect(cdrBlocks).toHaveLength(1);
    const b = cdrBlocks[0];
    expect(b.slot === undefined || b.slot === 'skill1').toBe(true);
    // Trigger identity — 'when Full Burst ends' is neither fullBurstEnter nor burstCast.
    expect(b.trigger?.kind).toBe('fullBurstEnd');
    // Target set — 'Affects self'; an allies target would CDR the entire team.
    expect(b.target?.kind).toBe('self');
    // 'with an ally from the same squad still on the battlefield' is the composition gate; the
    // schema's own primitive for that wording is teamHas.sameSquad (never an enumerated slug list).
    expect(b.teamHas?.sameSquad).toBe(true);
    const cdr = effectsOf(b).find((e) => e.kind === 'burstCdr') as AnyRec;
    expect(Number(cdr.seconds)).toBeCloseTo(20.16, 2);
    // The kit puts no once-per-battle or every-Nth limiter on the line.
    expect(cdr.oncePerBattle).toBeFalsy();
    expect(Number(b.everyN ?? 1)).toBe(1);
  });

  it('a cooldown reduction can only pull full bursts forward, never delay them', () => {
    // Directional by construction: ram is Burst I sharing stage 1 with liter, so she is not
    // guaranteed to be the selected caster. Removing the CDR must never INCREASE the full-burst
    // count; removing the squad gate (which the control comp cannot satisfy — liter/crown/helm are
    // not ram's squad) must never DECREASE it. A model that keys the CDR to the wrong edge or
    // hands it to the team breaks the second inequality.
    expect(countKind(base, 'fullBurstStart')).toBeGreaterThanOrEqual(
      countKind(noCdr, 'fullBurstStart'),
    );
    expect(countKind(cdrUngated, 'fullBurstStart')).toBeGreaterThanOrEqual(
      countKind(base, 'fullBurstStart'),
    );
  });
});

describe('ram — skill2-a: self Max HP up 40.72% for 10 sec', () => {
  it('is a self-scoped Max HP buff at 40.72% with a 10 sec window', () => {
    const hpBlocks = blocksOf(OV, 'skill2').filter((b) => effectsOf(b).some(isMaxHpBuff));
    expect(hpBlocks).toHaveLength(1);
    const b = hpBlocks[0];
    expect(b.target?.kind).toBe('self');
    const e = effectsOf(b).filter(isMaxHpBuff)[0];
    // targetMaxHpPct (own Max HP) or the maxHpPct self path — never casterMaxHpPct handed outward.
    expect(['targetMaxHpPct', 'maxHpPct']).toContain(String(e.stat));
    expect(Number(e.durationSec)).toBeCloseTo(10, 3);
    // 'for 10 sec' is wall-clock, not a round count.
    expect(e.durationShots).toBeUndefined();
  });

  it('grants Max HP to ram and to nobody else', () => {
    // caster/target-scaled Max HP is flat-resolved on buffApply under stat maxHpFlat.
    const toRam = maxHpFlatTo(base, (s) => s === SLUG);
    const toRamWithout = maxHpFlatTo(noMaxHp, (s) => s === SLUG);
    expect(toRam).toBeGreaterThan(0);
    expect(toRam).toBeGreaterThan(toRamWithout); // proves these events are ram's own line
    // Scope: re-targeting the same block to allies must reach units it does not reach today.
    expect(maxHpFlatTo(maxHpToAllies, (s) => s !== SLUG)).toBeGreaterThan(
      maxHpFlatTo(base, (s) => s !== SLUG),
    );
  });

  it('moves zero damage — ram has no HP-to-ATK conversion', () => {
    // RED under the nearest-wrong model that routes Max HP into ATK (atkOfMaxHpPct /
    // atkOfCasterMaxHpPct), which would change ram's own total.
    expect(noMaxHp.tot).toEqual(base.tot);
  });
});

describe('ram — skill2-b: DEF up 11.34% of the user DEF to the 2 lowest-HP allies', () => {
  it('is either an alliesLowestHp DEF grant or explicitly unmodeled, and never an ATK grant', () => {
    const defBlocks = blocksOf(OV, 'skill2').filter((b) => effectsOf(b).some(isDefBuff));
    if (defBlocks.length > 0) {
      for (const b of defBlocks) {
        expect(b.target?.kind).toBe('alliesLowestHp');
        expect(Number(b.target?.count)).toBe(2);
        for (const e of effectsOf(b).filter(isDefBuff)) {
          expect(Number(e.durationSec)).toBeCloseTo(5, 3);
        }
      }
    } else {
      // The schema has no 'percent of the caster DEF' stat and defPct is inert in v1, so recording
      // the line verbatim is acceptable — going silent is not.
      expect(unmodeledOf(OV, 'skill2').join(' ').includes('11.34')).toBe(true);
    }
    // Whatever the encoding, a DEF line must never surface as offence.
    const atk1134 = allEffects(OV).filter(
      (e) => isAtkStat(e) && near(Math.abs(Number(e.value)), 11.34, 0.1),
    );
    expect(atk1134).toHaveLength(0);
  });

  it('moves zero damage — DEF is inert in v1', () => {
    expect(noDef.tot).toEqual(base.tot);
  });
});

describe('ram — burst: shield for all allies at 10.08% of her final Max HP, 10 sec', () => {
  it('is a shield effect on all allies at 10.08% for 10 sec, with no damage rider', () => {
    const shieldBlocks = blocksOf(OV, 'burst').filter((b) =>
      effectsOf(b).some((e) => e.kind === 'shield'),
    );
    expect(shieldBlocks).toHaveLength(1);
    const b = shieldBlocks[0];
    expect(b.trigger?.kind).toBe('burstCast');
    // 'all allies' includes ram herself — excludeSelf would drop her own shield.
    expect(b.target?.kind).toBe('allies');
    expect(b.target?.excludeSelf).toBeFalsy();
    const e = effectsOf(b).find((x) => x.kind === 'shield') as AnyRec;
    expect(Number(e.maxHpPct)).toBeCloseTo(10.08, 2);
    expect(Number(e.durationSec)).toBeCloseTo(10, 3);
    // Her burst has no damage line at all; any damage effect in this slot is invented.
    expect(blocksOf(OV, 'burst').flatMap(effectsOf).filter(isDamageEffect)).toHaveLength(0);
  });

  it('is damage-inert in the control comp — its value is tandem-only', () => {
    // liter / crown / helm carry no shielded-trigger or requiresShielded block, so the shield must
    // not move any total here. A difference means a shield consumer exists in this fixture and the
    // inertness claim has to be re-scoped, not that the shield is wrong.
    expect(unitOf(noShield.res, SLUG).totalDamage).toBe(unitOf(base.res, SLUG).totalDamage);
    expect(noShield.tot).toEqual(base.tot);
  });

  it.skip('the shield application itself is not directly observable — cfg.onEvent exposes no shield event', () => {
    // GAP: the event kinds are shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/
    // fullBurstEnd. Proving the shield reaches all four allies needs a shielded-trigger consumer
    // (e.g. a naga-style requiresShielded block) in the comp, which controlComp cannot supply.
  });
});
