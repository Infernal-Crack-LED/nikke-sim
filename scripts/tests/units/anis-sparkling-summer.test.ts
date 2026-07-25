// PER-UNIT KIT SPEC — `anis-sparkling-summer` (Anis: Sparkling Summer, Supporter/SG/Electric,
// Burst III, cd 40s, ammo 5, reloadFrames 141, hitsPerShot 10 pellets). Kit-autonomy gauntlet
// 2026-07-24 (driver-authored, test-first). EXACT SLUG: this is the Sparkling Summer VARIANT,
// NOT base `anis` (RL/Iron) nor `anis-star` (RL/Electric) — reason from the slug.
//
// One assertion group per KIT LINE (H1..H7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['anis-sparkling-summer'].skills):
//   S1 ■ entering Full Burst → all Electric Code allies:
//        ATK ▲ 55.31% OF THE SKILL USER'S ATK for 10 sec                              [H1]
//        Reload Speed ▲ 49.28% for 10 sec                                             [H2]
//   S2 ■ firing the last bullet → 2 highest-final-ATK enemies:
//        Deals 382.42% of final ATK as damage                                         [H3]
//      ■ firing the last bullet → self:
//        Damage to Interruption Parts ▲ 6.91% for 10 sec                              [H4]
//   BU ■ self (her OWN burst block):
//        Max Ammunition Capacity ▼ 73.92% for 10 sec                                  [H5]
//        Reload Speed ▲ 27.72% for 10 sec                                             [H6]
//        Elemental Advantage Attack Damage ▲ 42.24% for 10 sec                        [H7]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   H1  casterAtkPct = a FLAT add of HER (Supporter) ATK, never a % of the target's own ATK. The
//       target is element-scoped ("all Electric Code allies"): in this fixture anis is the ONLY
//       Electric unit, so the buff must reach her (targetIdx ANIS) and EXCLUDE liter/crown/helm
//       (Iron/Iron/Water). Proven two ways: shipped reaches {ANIS} only, and a generic `allies`
//       counterfactual reaches all four. NOTE on the flat-vs-self-% axis: for the SELF target the
//       two are damage-identical (caster===target ⇒ flat 0.5531×herATK == +55.31% of her own ATK),
//       so the mechanic is pinned by the buffApply `stat`/`key` (casterAtkPct, raw 55.31), not by a
//       damage delta — a non-self Electric ally would be needed to make it pay-different, and this
//       fixture has none. The encoding fidelity is what is asserted.
//   H2  reloadSpeedPct 49.28 rides the SAME element-scoped fullBurstEnter block; pinned by its own
//       key (distinct value from the burst's 27.72 reload line, which co-stacks on her).
//   H3  the named "last bullet" proc: fires EXACTLY when her magazine empties (ammo→0), including
//       the 1-round magazines her burst creates — so proc count == count of her shots that fired
//       dry (ammoAfter===0), NOT every shot and NOT once per burst. Magnitude 382.42, crit-eligible
//       (rider convention), NOT core-eligible (text "as damage", not "core strike damage"). The
//       "2 highest-final-ATK enemies" collapses to the single partless boss (one instance).
//   H4  partsDamagePct must be EXACTLY inert vs the partless scope-lock boss — byte-identical
//       totals for every unit when removed, not "small". Kept for kit fidelity (a future
//       parts-boss / parts-consumer would read it).
//   H5  maxAmmoPct ▼73.92 is the kit's ENGINE: engine floors ammo to max(1, round(5×0.2608)) = 1,
//       so every shot inside her 10s burst window is a last bullet → the H3 proc fires ~per shot.
//       Removing it restores 5-round magazines → strictly FEWER last-bullet procs and a different
//       total. burstCast-keyed (fires only on rotations SHE bursts), count == her burst casts.
//   H6  reloadSpeedPct 27.72 — the burst-window reload line, distinct key from S1's 49.28; both
//       co-stack on her during Full Burst. burstCast cadence.
//   H7  elemAdvantageDamagePct 42.24 lives in the element bucket and pays ONLY under real Electric
//       advantage (BEATS[Electric]=Water). Proven three ways: vs a Water boss removing it changes
//       her total (LIVE); vs an Iron boss (no advantage) removing it changes NOTHING (GATED,
//       byte-identical); and an ungated attackDamagePct counterfactual WOULD change the Iron-boss
//       total (over-credits) — i.e. the shipped gating is one the generic damage buff provably fails.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / anis-sparkling-summer B3 / helm B3),
// focus anis-sparkling-summer. anis needs a real B1→B2→B3 chain to cast her burst at all (a lone
// Burst III unit makes ZERO Full Bursts). Boss element varies per line: Water makes anis (Electric)
// the ONLY advantaged unit (isolates H7); Iron makes nobody advantaged (the H7 gating control).
// Deterministic (no seed). Inert UNMODELED stats: none — all 7 kit lines are block-modeled
// (unmodeled arrays empty); H4's partsDamagePct is modeled-but-engine-inert, not unmodeled.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'anis-sparkling-summer';
/** controlComp slot order: liter 0 / crown 1 / anis-sparkling-summer 2 / helm 3. */
const ANIS = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

type Boss = 'Water' | 'Iron';

/** Primary fixture: boss Water ⇒ anis (Electric) is the ONLY advantaged unit (BEATS Electric→Water;
 *  liter/crown Iron and helm Water are not). `Iron` is the no-advantage control for H7. */
function run(overrides: Record<string, any> = {}, bossElement: Boss = 'Water') {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);

/** H1 counterfactual: S1 re-targeted to ALL allies (drops the Electric element scope). */
const anisGenericAllies = withPatchedOverride(SLUG, (ov) => {
  let patched = 0;
  for (const b of ov.skill1) if (b.target?.kind === 'alliesOfElement') { b.target = { kind: 'allies' }; patched++; }
  if (!patched) throw new Error('anis S1 alliesOfElement target missing — fixture is stale');
});
/** H1 encoding reference: casterAtkPct → atkPct (self-scaling % instead of flat caster add). */
const anisAtkPct = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill1.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'casterAtkPct');
  if (!e) throw new Error('anis S1 casterAtkPct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** H3 encoding reference: the last-bullet rider made core-eligible (text says "as damage", not core). */
const anisCoreRider = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2.flatMap((b: any) => b.effects).find((x: any) => x.kind === 'flatDamage');
  if (!e) throw new Error('anis S2 flatDamage effect missing — fixture is stale');
  e.core = true;
});
/** H4 reference: her parts-damage line removed. */
const anisNoParts = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length === before) throw new Error('anis S2 partsDamagePct block missing — fixture is stale');
});
/** H5 reference: her burst max-ammo line removed (restores 5-round magazines in the window). */
const anisNoMaxAmmo = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'maxAmmoPct'));
  if (ov.burst.length === before) throw new Error('anis burst maxAmmoPct block missing — fixture is stale');
});
/** H7 reference: her burst elemental-advantage line removed. */
const anisNoElemAdv = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.flatMap((b: any) => b.effects).length;
  for (const b of ov.burst) b.effects = b.effects.filter((e: any) => e.stat !== 'elemAdvantageDamagePct');
  if (ov.burst.flatMap((b: any) => b.effects).length === before)
    throw new Error('anis burst elemAdvantageDamagePct effect missing — fixture is stale');
});
/** H7 counterfactual: the same line as an UNGATED Damage-Up buff (over-credits when not advantaged). */
const anisUngatedElemAdv = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e) throw new Error('anis burst elemAdvantageDamagePct effect missing — fixture is stale');
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();                                                       // boss Water, shipped
const genericAllies = run({ [SLUG]: anisGenericAllies });
const atkPct = run({ [SLUG]: anisAtkPct });
const coreRider = run({ [SLUG]: anisCoreRider });
const noParts = run({ [SLUG]: anisNoParts });
const noMaxAmmo = run({ [SLUG]: anisNoMaxAmmo });
const noElemAdv = run({ [SLUG]: anisNoElemAdv });
const baseIron = run({}, 'Iron');                                         // no advantage control
const noElemAdvIron = run({ [SLUG]: anisNoElemAdv }, 'Iron');
const ungatedElemAdvIron = run({ [SLUG]: anisUngatedElemAdv }, 'Iron');

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const anisDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const anisShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const anisBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs emitted by anis's own kit on the given stat. */
const anisBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === ANIS && b.stat === stat);
/** Distinct holder slot indices a given anis buff key reached. */
const holdersOf = (evs: SimEvent[], key: string): Set<number> =>
  new Set(buffs(evs).filter((b) => b.key === key).map((b) => b.targetIdx as number));

const S1_ATK_KEY = `${ANIS}:skill1:casterAtkPct:55.31`;
const S1_RELOAD_KEY = `${ANIS}:skill1:reloadSpeedPct:49.28`;
const BU_MAXAMMO_KEY = `${ANIS}:burst:maxAmmoPct:-73.92`;
const BU_RELOAD_KEY = `${ANIS}:burst:reloadSpeedPct:27.72`;
const BU_ELEMADV_KEY = `${ANIS}:burst:elemAdvantageDamagePct:42.24`;

describe('anis-sparkling-summer — kit spec', () => {
  it('fixture sanity: anis actually casts her burst (needs the B1→B2→B3 chain)', () => {
    expect(anisBursts(base.events).length, 'no anis burst was cast — fixture cannot exercise burst lines').toBeGreaterThan(0);
  });

  describe('H1 — S1 ATK ▲55.31% of HER ATK, fullBurstEnter, scoped to Electric allies', () => {
    const applied = buffs(base.events).filter((b) => b.key === S1_ATK_KEY);

    it('is casterAtkPct (flat add of the skill user\'s ATK), magnitude 55.31, for 10 sec', () => {
      expect(applied.length, 'no FB-entry casterAtkPct buff was applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual(['casterAtkPct']);
      // the key carries the RAW kit value (55.31); the event `value` is the resolved flat ATK.
      for (const b of applied) expect(b.key).toBe(S1_ATK_KEY);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('reaches the Electric ally (herself) and EXCLUDES every non-Electric ally', () => {
      expect([...holdersOf(base.events, S1_ATK_KEY)].sort()).toEqual([ANIS]);
    });

    it('DISCRIMINATING: a generic `allies` target would reach all four units', () => {
      expect([...holdersOf(genericAllies.events, S1_ATK_KEY)].sort()).toEqual([0, 1, ANIS, 3]);
    });

    it('ENCODING: shipped logs casterAtkPct, the atkPct counterfactual logs atkPct (distinct mechanic)', () => {
      // For the self-only Electric target the two are damage-identical (caster===target), so the
      // mechanic is pinned by the buffApply stat field, not a damage delta (see header note).
      expect(anisBuffs(base.events, 'casterAtkPct').length).toBeGreaterThan(0);
      expect(anisBuffs(atkPct.events, 'casterAtkPct').filter((b) => b.key.startsWith(`${ANIS}:skill1:`)).length).toBe(0);
      expect(anisBuffs(atkPct.events, 'atkPct').length).toBeGreaterThan(0);
    });
  });

  describe('H2 — S1 Reload Speed ▲49.28%, fullBurstEnter, scoped to Electric allies', () => {
    const applied = buffs(base.events).filter((b) => b.key === S1_RELOAD_KEY);

    it('is 49.28% for 10 sec, reaching only the Electric ally', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([49.28]);
      expect([...holdersOf(base.events, S1_RELOAD_KEY)].sort()).toEqual([ANIS]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a generic `allies` target would reach all four units', () => {
      expect([...holdersOf(genericAllies.events, S1_RELOAD_KEY)].sort()).toEqual([0, 1, ANIS, 3]);
    });
  });

  describe('H3 — S2 last-bullet rider: 382.42% of final ATK, fires exactly when the mag empties', () => {
    const riders = anisDamage(base.events, 'skill2');
    const lastBullets = anisShots(base.events).filter((s) => s.ammoAfter === 0 && !s.unlimitedAmmo).length;

    it('lands once per last bullet (ammo→0), incl. the 1-round burst-window magazines', () => {
      expect(riders.length, 'no last-bullet rider landed').toBeGreaterThan(0);
      expect(
        riders.length,
        `${riders.length} riders vs ${lastBullets} dry-firing shots — a last-bullet proc is 1:1 with mag-empty`,
      ).toBe(lastBullets);
    });

    it('is NOT once-per-burst and NOT every-shot (it is last-bullet-keyed)', () => {
      expect(riders.length).toBeGreaterThan(anisBursts(base.events).length);
      expect(riders.length).toBeLessThan(anisShots(base.events).length);
    });

    it('is the kit magnitude, crit-eligible, NOT core-eligible, in the skill bucket', () => {
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([382.42]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: a core:true rider would become core-eligible (text says "as damage")', () => {
      expect(anisDamage(coreRider.events, 'skill2').every((d) => d.coreEligible)).toBe(true);
    });
  });

  describe('H4 — S2 interruption-parts damage is exactly inert vs the partless boss', () => {
    it('removing it changes NO unit\'s total by a single point', () => {
      expect(base.totals).toEqual(noParts.totals);
    });
  });

  describe('H5 — burst Max Ammo ▼73.92% floors her to 1-round magazines (the proc engine)', () => {
    const applied = buffs(base.events).filter((b) => b.key === BU_MAXAMMO_KEY);
    const baseProcs = anisDamage(base.events, 'skill2').length;
    const noMaxAmmoProcs = anisDamage(noMaxAmmo.events, 'skill2').length;

    it('is -73.92% on herself, fired once per burst cast (burstCast-keyed)', () => {
      expect(applied.length, 'no burst maxAmmoPct buff was applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([-73.92]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ANIS]);
      expect(applied.length).toBe(anisBursts(base.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is LIVE: 1-round mags produce strictly MORE last-bullet procs than 5-round mags', () => {
      expect(baseProcs).toBeGreaterThan(noMaxAmmoProcs);
    });

    it('removing it changes her total (the window economy is not inert)', () => {
      expect(base.totals[SLUG]).not.toEqual(noMaxAmmo.totals[SLUG]);
    });
  });

  describe('H6 — burst Reload Speed ▲27.72% (distinct from S1\'s 49.28, co-stacks on her)', () => {
    const applied = buffs(base.events).filter((b) => b.key === BU_RELOAD_KEY);

    it('is 27.72% for 10 sec on herself, once per burst cast', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([27.72]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ANIS]);
      expect(applied.length).toBe(anisBursts(base.events).length);
    });

    it('co-exists with S1\'s 49.28 line (two distinct reload buffs on her)', () => {
      expect(buffs(base.events).filter((b) => b.key === S1_RELOAD_KEY).length).toBeGreaterThan(0);
      expect(buffs(base.events).filter((b) => b.key === BU_RELOAD_KEY).length).toBeGreaterThan(0);
    });
  });

  describe('H7 — burst Elemental Advantage Attack Damage ▲42.24%, gated on real advantage', () => {
    const applied = buffs(base.events).filter((b) => b.key === BU_ELEMADV_KEY);

    it('is 42.24% for 10 sec on herself, once per burst cast', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([42.24]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ANIS]);
      expect(applied.length).toBe(anisBursts(base.events).length);
    });

    it('is LIVE under Electric advantage (Water boss): removing it changes her total', () => {
      expect(base.totals[SLUG]).not.toEqual(noElemAdv.totals[SLUG]);
    });

    it('is GATED with no advantage (Iron boss): removing it changes NOTHING (byte-identical)', () => {
      expect(baseIron.totals).toEqual(noElemAdvIron.totals);
    });

    it('DISCRIMINATING: an ungated Damage-Up buff WOULD change the no-advantage total', () => {
      // Proves the shipped gating is one the generic damage buff provably fails.
      expect(baseIron.totals[SLUG]).not.toEqual(ungatedElemAdvIron.totals[SLUG]);
    });
  });
});
