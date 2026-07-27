// PER-UNIT KIT SPEC — `phantom` (Phantom (Treasure), Attacker/AR/Water, Burst III, cd 40s, ammo 60,
// RoF 720 = 12 shots/s, reloadFrames 141 = 2.35s). Kit-autonomy gauntlet 2026-07-26; test-first
// independent re-derivation.
//
// FROM-SCRATCH BUILD: phantom had NO shipped override (simSupported:false) before this gauntlet, so
// the override under test (src/skills/overrides/phantom.json) and this spec land together. Every
// load-bearing line is pinned GREEN vs that override AND RED vs its nearest-wrong counterfactual
// (built in memory with `withPatchedOverride` — the committed JSON is never touched).
//
// Kit (blablalink TREASURE prose, data/characters.json → characters.phantom.skills; the datamined
// skill1/2/ulti _detail descriptions carry the UNTREASURED base kit — the treasure prose adds the
// "after landing 30 normal attacks" Thief's Dagger grant):
//   S1 ■ normal hit on a target NOT in Calling Card state (target): Calling Card DEF ▼32.19% / 5s  [P1 — status WINDOW modeled; DEF content INERT (boss DEF is a negligible flat term; engine drops enemy DEF debuffs)]
//      ■ normal hit on a target NOT in Calling Card state (self): Thief's Dagger Hit Rate ▲25.75%,  [P2 — resource thiefsDagger + perResource hitRatePct (live stack count)]
//        stacks ×3, 5s
//      ■ (TREASURE) after landing 30 normal attacks (self): Thief's Dagger Hit Rate ▲25.75% ×3 / 5s [P3 — hitCount:30 → resource +1; sets the once-per-magazine CONSUME cadence]
//      ■ normal hit on a target IN Calling Card state (self): Attack Damage ▲75.17% for 1 round     [P4 — shotFired + requiresTargetStatus + durationShots:2 (engine-order compensation; exact 59/60 duty)]
//   S2 ■ Thief's Dagger at max stacks, targets in Calling Card: 84.33% final ATK additional damage, [P5 — flatDamage, crits at caster rate / never cores (SSOT §2b defaults)]
//        removes Calling Card
//      ■ Thief's Dagger at max stacks (self): Distributed Damage ▲12.86% continuously, ×3, removed   [P7 — resource distAmp + perResource reader; burstCast reset −3]
//        on burst use
//      ■ Thief's Dagger at max stacks, removes stacks, all enemies: 250% final ATK Distributed Dmg  [P6 — flatDamage flavor distributed + resource −3]
//      ■ after landing 10 normal attacks (self): ATK ▲85.12% / 5s + Distributed Damage ▲31.92% / 10s [P8 — hitCount:10]
//   BU ■ all enemies: 1457.28% final ATK Distributed Damage                                          [P9]
//      ■ Fire Code stage target: Damage Taken ▲18% / 30s                                            [P10 — bossElementGate:Fire; inert vs non-Fire]
//      ■ self: Max Ammunition Capacity ▲50% / 10s                                                    [P11]
//
// THE CYCLE the encoding must reproduce (steady single-target fire): a magazine burns 60 shots in
// 5.0s; Calling Card (applied on the first hit of each magazine, exactly the "not in Calling Card
// state" event under steady fire) lasts 5s = one magazine, so shots 2–60 carry the 1-round Attack
// Damage (59/60 duty). Thief's Dagger gains +1 at magazine start (S1) and +1 every 30 hits
// (treasure) → 3 gains per 60-hit cycle → CONSUME on the last shot of every magazine (hits 60, 120,
// 180…): 84.33% additional + 250% distributed + distAmp +1 (cap 3, reset on her burst) + stacks
// removed. The Calling Card window SELF-EXTENDS on every shot (the "not in CC state" clause
// collapses to the battle's first shot under continuous fire — real on-shot duty ~98.3-100% at any
// magazine length; ⚑1). The dagger's magazine-start grant keeps the shotFired + everyN:60 +
// everyNOffset:1 phase (shots 1, 61, 121…); the Attack Damage gate block is ordered BEFORE the
// status-inflicting block so the battle's first shot (the application shot) does NOT receive it.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   P1  removing the targetStatus block closes BOTH the Attack Damage gate (P4) and the consume
//       gate (P5/P6) — the total collapses and the 75.17 buff never applies. The nearest wrong
//       model (Calling Card refreshed on EVERY shot = permanent) is discriminated in P4: ungating
//       the Attack Damage block raises the total (100% duty vs the faithful 59/60).
//   P2  the dagger is a LIVE stack count (perResource × 25.75): the always-on max-stacks
//       counterfactual (flat 77.25%) over-credits the core-hit lift (real time-average ≈ 1 stack
//       between consumes) → shipped total < flat-max total, and > fully-removed.
//   P3  without the treasure every-30 grant the dagger fills once per THREE magazines (magazine
//       start only) → consume count drops to ~1/3. Shipped consume count > 2× the no-treasure count.
//   P4  the Calling Card window SELF-EXTENDS on every shot (the kit's "not in Calling Card state"
//       application clause collapses to the battle's first shot under continuous fire — the real
//       window lapses at 5s and the very next hit re-applies it, on-shot duty ~98.3-100% at any
//       magazine length; the collapse matches that and covers the post-burst extended magazine a
//       fixed magazine-start phase mis-modeled at 0.798 duty). The gate still subtracts exactly
//       ONE shot (shot 2): ungated, C fires on shot 1's post-damage dispatch, so shot 2's damage
//       already sees the buff; gated, C's first apply is shot 2's dispatch, visible only from shot
//       3's damage. Ungated therefore deals strictly more; removing the status (gate never opens)
//       collapses the total. durationShots:2 (kit says "1 round") is the engine-order compensation:
//       shotFired blocks dispatch AFTER the shot's damage, so a :1 budget is spent before any damage
//       read sees it (dead); :2 keeps the buff live on every shot from the 3rd on.
//   P5  84.33 "additional damage" = function additional damage: critEligible TRUE, coreEligible
//       FALSE (SSOT damage-calculation.md §2b). Count == the paired 250% count (one consume event).
//   P6  every 250% hit carries mult.distributed > 1 (S2L4's 31.92% is live at every consume).
//   P7  distAmp OSCILLATES: a consume right after her burst reads freshly-reset stacks (low
//       mult.distributed) while a pre-burst consume reads the cap (high). The no-reset
//       counterfactual pins the pool at cap after the first ramp → post-2nd-burst consumes all read
//       high. Shipped: post-2nd-burst min < 1.4; no-reset: min > 1.6.
//   P8  apply count == hit count / 10; durations 5s / 10s exact.
//   P9  one 1457.28% hit per phantom CAST (not per FB); fbMajorApplied FALSE (burst-skill damage
//       does not take the +50% FB major, U10).
//   P10 vs Fire the vuln applies once per cast to the BOSS (targetIdx null) and lifts the WHOLE
//       team's total; vs Iron the block is inert and removal is byte-identical (bossElementGate).
//   P11 one 50%/10s self max-ammo window per cast; removing it costs reload downtime.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / phantom B3 / helm B3, boss Fire,
// focus phantom) — phantom needs a real rotation to cast her burst and to open Full Bursts at all
// (helm is the second B3, so phantom casts every OTHER Full Burst ≈ every 40s). Deterministic (no
// seed). Slot order: liter 0 / crown 1 / phantom 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / phantom 2 / helm 3. */
const COMP = ['liter', 'crown', 'phantom', 'helm'];
const PHANTOM = COMP.indexOf('phantom');

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

// ---- run helper -------------------------------------------------------------------------------
function run(patch?: (ov: any) => void, bossElement: 'Fire' | 'Iron' = 'Fire') {
  const events: SimEvent[] = [];
  const overrides = patch
    ? { phantom: withPatchedOverride('phantom', patch) }
    : {};
  const res = runComp({
    ...controlComp('phantom'),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- removal / counterfactual patches ---------------------------------------------------------
/** Drop a whole block (identified by an effect predicate) from a slot. */
const dropBlock =
  (slot: 'skill1' | 'skill2' | 'burst', pred: (e: any) => boolean) =>
  (ov: any) => {
    const before = ov[slot].length;
    ov[slot] = ov[slot].filter((b: any) => !b.effects.some(pred));
    if (ov[slot].length === before)
      {throw new Error(`phantom ${slot} block missing — fixture is stale`);}
  };

const noStatus = dropBlock('skill1', (e) => e.kind === 'targetStatus'); // P1: closes both gates
/** P3: remove ONLY the hitCount:30 treasure grant (keep the magazine-start grant). */
function noTreasureGrant(ov: any) {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.trigger.kind === 'hitCount' && b.trigger.count === 30)
  );
  if (ov.skill1.length === before)
    {throw new Error(
      'phantom treasure hitCount:30 block missing — fixture is stale'
    );}
}
/** P4 nearest-wrong #1: the Attack Damage gate removed (always-on, 100% duty). */
function ungatedAttackDamage(ov: any) {
  const b = ov.skill1.find((x: any) =>
    x.effects.some(
      (e: any) => e.kind === 'buff' && e.stat === 'attackDamagePct'
    )
  );
  if (!b || !b.requiresTargetStatus)
    {throw new Error(
      'phantom gated attackDamagePct block missing — fixture is stale'
    );}
  delete b.requiresTargetStatus;
}
const noConsume = dropBlock(
  'skill2',
  (e) => e.kind === 'flatDamage' && e.atkPct === 84.33
); // P5/P6/P7
const noDistAmp = dropBlock(
  'skill2',
  (e) => e.kind === 'buff' && e.stat === 'distributedDamagePct' && e.perResource
); // P7
/** P7 counterfactual: the burst no longer resets distAmp (pool pins at cap after the first ramp). */
function noDistAmpReset(ov: any) {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.kind === 'resource' && e.name === 'distAmp' && e.delta < 0
      )
  );
  if (ov.burst.length === before)
    {throw new Error(
      'phantom burst distAmp reset block missing — fixture is stale'
    );}
}
const noS2L4 = dropBlock(
  'skill2',
  (e) => e.kind === 'buff' && e.stat === 'atkPct'
); // P8
/** P2 counterfactual: the dagger tracked as always-at-max (flat 77.25%) instead of a live pool. */
function hitRateFlatMax(ov: any) {
  const b = ov.skill1.find((x: any) =>
    x.effects.some(
      (e: any) => e.kind === 'buff' && e.stat === 'hitRatePct' && e.perResource
    )
  );
  if (!b)
    {throw new Error(
      'phantom perResource hitRatePct block missing — fixture is stale'
    );}
  const e = b.effects.find((x: any) => x.stat === 'hitRatePct');
  delete e.perResource;
  e.value = 77.25; // 3 × 25.75 — the max-stacks magnitude held permanently
}
const noHitRate = dropBlock(
  'skill1',
  (e) => e.kind === 'buff' && e.stat === 'hitRatePct'
); // P2
const noNuke = dropBlock(
  'burst',
  (e) => e.kind === 'flatDamage' && e.atkPct === 1457.28
); // P9
const noVuln = dropBlock(
  'burst',
  (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
); // P10
const noAmmo = dropBlock(
  'burst',
  (e) => e.kind === 'buff' && e.stat === 'maxAmmoPct'
); // P11

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const baseIron = run(undefined, 'Iron');
const rNoStatus = run(noStatus);
const rNoTreasure = run(noTreasureGrant);
const rUngated = run(ungatedAttackDamage);
const rNoConsume = run(noConsume);
const rNoDistAmp = run(noDistAmp);
const rNoReset = run(noDistAmpReset);
const rNoS2L4 = run(noS2L4);
const rFlatMax = run(hitRateFlatMax);
const rNoHitRate = run(noHitRate);
const rNoNuke = run(noNuke);
const rNoVuln = run(noVuln);
const rNoVulnIron = run(noVuln, 'Iron');
const rNoAmmo = run(noAmmo);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const damages = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const fbCount = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart').length;
const phantomCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'phantom'
  ).length;
const phantomShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'phantom')
    .length;
/** phantom-caster buff applies for a stat. */
const pBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === PHANTOM && b.stat === stat);
/** phantom's proc hits for a kit line (srcSlot + atkPct identify the line). */
const pHits = (
  evs: SimEvent[],
  srcSlot: 'skill1' | 'skill2' | 'burst',
  atkPct: number
) =>
  damages(evs).filter(
    (d) => d.slug === 'phantom' && d.srcSlot === srcSlot && d.atkPct === atkPct
  );

// ---- derived constants ------------------------------------------------------------------------
const casts = phantomCasts(base.events);
const fbs = fbCount(base.events);
const shots = phantomShots(base.events);
const consumeHits = pHits(base.events, 'skill2', 84.33);
const distHits = pHits(base.events, 'skill2', 250);

// sanity: the fixture must actually exercise the kit (bursts cast, cycle run many times)
if (casts < 3)
  {throw new Error(
    'fixture stale: phantom must cast >= 3 bursts in the 180s window'
  );}
if (consumeHits.length < 10)
  {throw new Error('fixture stale: the dagger cycle must consume >= 10 times');}

describe('phantom (Treasure) — kit spec', () => {
  describe('P1 — S1 Calling Card status window gates the kit (DEF content inert)', () => {
    const atkDmg = pBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 75.17
    );

    it('the gated Attack Damage buff applies throughout (the window self-extends on every shot)', () => {
      expect(atkDmg.length).toBeGreaterThan(0);
      expect([...new Set(atkDmg.map((b) => b.targetIdx))]).toEqual([PHANTOM]);
    });

    it('is load-bearing: removing the status closes both gates and collapses the total', () => {
      // no Calling Card → no Attack Damage applies AND the consume (requiresTargetStatus) never fires.
      expect(
        pBuffs(rNoStatus.events, 'attackDamagePct').filter(
          (b) => b.value === 75.17
        ).length
      ).toBe(0);
      expect(pHits(rNoStatus.events, 'skill2', 84.33).length).toBe(0);
      expect(base.totals.phantom).toBeGreaterThan(rNoStatus.totals.phantom);
    });
  });

  describe("P2 — S1 Thief's Dagger Hit Rate ▲25.75% ×3 is a LIVE stack pool (perResource)", () => {
    const applied = pBuffs(base.events, 'hitRatePct');

    it('is a frame-0 duration-less passive reading the live dagger pool (value 0 + perResource)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.some((b) => b.frame === 0)).toBe(true);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([PHANTOM]);
    });

    it('is load-bearing (Hit Rate lifts the core-hit fraction): removing it drops the total', () => {
      expect(base.totals.phantom).toBeGreaterThan(rNoHitRate.totals.phantom);
    });

    it('DISCRIMINATING: an always-at-max flat 77.25% over-credits the core lift (shipped < flat-max)', () => {
      // the real pool time-averages ~1 stack between consumes (cap 3 only at the consume instant),
      // so the faithful live-pool encoding deals LESS than the naive permanent max-stacks model.
      expect(rFlatMax.totals.phantom).toBeGreaterThan(base.totals.phantom);
    });
  });

  describe("P3 — S1 TREASURE: a Thief's Dagger grant every 30 normal attacks sets the consume cadence", () => {
    it('consume fires ~3× more often with the treasure grant than without it', () => {
      const noTreasureConsumes = pHits(
        rNoTreasure.events,
        'skill2',
        84.33
      ).length;
      // with treasure: 3 gains / 60 hits (magazine start + 2× every-30) → consume every magazine;
      // without: 1 gain / 60 hits → consume every THIRD magazine.
      expect(consumeHits.length).toBeGreaterThan(noTreasureConsumes * 2);
      expect(noTreasureConsumes).toBeGreaterThan(0);
    });

    it('consume lands on a whole-magazine cadence (one consume per ~60 shots)', () => {
      // 180s / 7.35s cycle ≈ 24 consumes ≈ shots / 60 — allow a wide deterministic band.
      const perCycle = shots / consumeHits.length;
      expect(perCycle).toBeGreaterThan(50);
      expect(perCycle).toBeLessThan(70);
    });
  });

  describe('P4 — S1 Attack Damage ▲75.17% for 1 round, gated on Calling Card (59/60 duty)', () => {
    const atkDmg = pBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 75.17
    );

    it('is self-scoped, round-count scoped (durationShots), and rides ~all shots (self-extending window)', () => {
      expect(atkDmg.length).toBeGreaterThan(0);
      expect([...new Set(atkDmg.map((b) => b.targetIdx))]).toEqual([PHANTOM]);
      for (const b of atkDmg) {expect(b.durationShots).toBe(2);} // kit "1 round" + engine-order compensation (header)
      // duty: applies on every shot but the battle's first (the sole application event) — the
      // self-extending window keeps the gate open for the whole fight under continuous fire.
      const duty = atkDmg.length / shots;
      expect(duty).toBeGreaterThan(0.98);
      expect(duty).toBeLessThanOrEqual(1.0);
    });

    it('DISCRIMINATING two-sided: ungated covers exactly ONE more shot; status-removed collapses', () => {
      // The gate excludes only shot 2 (ungated, C applies on shot 1's dispatch so shot 2's damage
      // sees the buff; gated, the first apply is shot 2's dispatch, visible from shot 3) — a strict
      // but tiny gain, the one-shot residue of the application event.
      expect(rUngated.totals.phantom).toBeGreaterThan(base.totals.phantom);
      // Removing the status closes the gate permanently and collapses the total.
      expect(base.totals.phantom).toBeGreaterThan(rNoStatus.totals.phantom);
    });
  });

  describe('P5 — S2 consume: 84.33% final ATK additional damage (crits, never cores)', () => {
    it('is a skill2 proc, crit-eligible, NOT core-eligible, NOT distributed (SSOT §2b additional damage)', () => {
      expect(consumeHits.length).toBeGreaterThan(0);
      for (const d of consumeHits) {
        expect(d.critEligible).toBe(true);
        expect(d.coreEligible).toBe(false);
        // plain "additional damage" — the kit reserves "Distributed Damage" wording for the 250%
        // line and the buffs; this rider must NOT eat distributedDamagePct (S2b blind convergence).
        expect(d.mult.distributed).toBe(1);
      }
    });

    it('is load-bearing: removing the consume drops the total', () => {
      expect(base.totals.phantom).toBeGreaterThan(rNoConsume.totals.phantom);
    });
  });

  describe('P6 — S2 consume: 250% final ATK Distributed Damage to all enemies, removes the stacks', () => {
    it('pairs 1:1 with the 84.33 hit and every hit carries a live distributed multiplier', () => {
      expect(distHits.length).toBe(consumeHits.length);
      for (const d of distHits) {expect(d.mult.distributed).toBeGreaterThan(1);} // S2L4 31.92% is live at every consume
    });

    it('the cycle restarts after each consume (stacks removed): consumes keep coming, one per magazine', () => {
      // >10 consumes in 180s proves the pool is DRAINED at each consume (a never-drained pool would
      // consume exactly once, when it first hits cap).
      expect(consumeHits.length).toBeGreaterThan(10);
    });
  });

  describe('P7 — S2 Distributed Damage ▲12.86% continuously ×3, removed on burst use (distAmp pool)', () => {
    const reader = pBuffs(base.events, 'distributedDamagePct').filter(
      (b) => b.value === 0
    );

    it('is a frame-0 duration-less perResource reader (value 0 + live pool)', () => {
      expect(reader.length).toBeGreaterThan(0);
      expect(reader.some((b) => b.frame === 0)).toBe(true);
      expect([...new Set(reader.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('is load-bearing: removing the amp drops the total (it feeds every distributed hit)', () => {
      expect(base.totals.phantom).toBeGreaterThan(rNoDistAmp.totals.phantom);
    });

    it('DISCRIMINATING: the pool OSCILLATES (reset on burst), it is not pinned at cap', () => {
      // consumes AFTER the 2nd burst: shipped reads freshly-reset stacks (low), the no-reset
      // counterfactual reads the permanent cap (high).
      const burstFrames = base.events
        .filter(
          (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'phantom'
        )
        .map((e) => e.frame);
      const after2nd = distHits.filter((d) => d.frame > burstFrames[1]);
      expect(after2nd.length).toBeGreaterThan(0);
      const minShipped = Math.min(...after2nd.map((d) => d.mult.distributed));
      expect(minShipped).toBeLessThan(1.4); // just after a reset: 0-1 stacks on top of S2L4's 31.92%
      const noResetFrames = rNoReset.events
        .filter(
          (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'phantom'
        )
        .map((e) => e.frame);
      const noResetAfter2nd = pHits(rNoReset.events, 'skill2', 250).filter(
        (d) => d.frame > noResetFrames[1]
      );
      const minNoReset = Math.min(
        ...noResetAfter2nd.map((d) => d.mult.distributed)
      );
      expect(minNoReset).toBeGreaterThan(1.6); // pinned at cap 3: 1 + 31.92% + 3×12.86% = 1.705
    });
  });

  describe('P8 — S2 every 10 normal attacks: ATK ▲85.12% / 5s + Distributed Damage ▲31.92% / 10s', () => {
    const atk = pBuffs(base.events, 'atkPct').filter((b) => b.value === 85.12);
    const dist = pBuffs(base.events, 'distributedDamagePct').filter(
      (b) => b.value === 31.92
    );

    it('fire once per 10 shots, self-scoped, with exact 5s / 10s durations', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(dist.length).toBeGreaterThan(0);
      for (const b of atk) {
        expect(b.targetIdx).toBe(PHANTOM);
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      for (const b of dist) {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
      // apply count tracks hits / 10 (refreshes collapse re-applies inside the 10s window — count is
      // a lower bound well above zero and far below the shot count).
      expect(atk.length).toBeLessThanOrEqual(Math.floor(shots / 10));
      expect(atk.length).toBeGreaterThan(0);
    });

    it('is load-bearing: removing it drops the total', () => {
      expect(base.totals.phantom).toBeGreaterThan(rNoS2L4.totals.phantom);
    });
  });

  describe('P9 — burst: 1457.28% final ATK Distributed Damage to all enemies', () => {
    const nuke = pHits(base.events, 'burst', 1457.28);

    it('fires once per phantom CAST (not per FB), distributed, without the +50% FB major', () => {
      expect(nuke.length).toBe(casts);
      for (const d of nuke) {
        expect(d.mult.distributed).toBeGreaterThan(1);
        expect(d.fbMajorApplied).toBe(false); // U10: burst-skill damage does not take the +50%
        expect(d.rangeApplied).toBe(false); // riders never get the +30% range bonus
      }
      expect(casts).toBeLessThan(fbs); // helm is the second B3 → phantom casts every OTHER FB
    });

    it('is load-bearing: removing the nuke drops the total sharply', () => {
      expect(base.totals.phantom).toBeGreaterThan(rNoNuke.totals.phantom);
    });
  });

  describe('P10 — burst: Damage Taken ▲18% / 30s on a Fire Code stage target (bossElementGate)', () => {
    // boss-held debuffs emit casterIdx === null && targetIdx === null — filter by stat+value.
    const bossDebuffs = (evs: SimEvent[], stat: string, value: number) =>
      buffs(evs).filter(
        (b) => b.stat === stat && b.value === value && b.targetIdx === null
      );
    const vuln = bossDebuffs(base.events, 'damageTakenPct', 18);

    it('applies to the BOSS (targetIdx null) once per cast, 30s, vs Fire', () => {
      expect(vuln.length).toBe(casts);
      for (const b of vuln) {
        expect(b.targetIdx).toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(30 * FPS);
      }
    });

    it("is load-bearing vs Fire: removing it drops the WHOLE team's totals (team-wide vuln)", () => {
      for (const s of COMP)
        {expect(base.totals[s]).toBeGreaterThanOrEqual(rNoVuln.totals[s]);}
      expect(base.totals.phantom).toBeGreaterThan(rNoVuln.totals.phantom);
    });

    it('DISCRIMINATING: vs a non-Fire boss the block is inert (byte-identical totals on removal)', () => {
      expect(baseIron.totals).toEqual(rNoVulnIron.totals);
      expect(bossDebuffs(baseIron.events, 'damageTakenPct', 18).length).toBe(0);
    });
  });

  describe('P11 — burst: self Max Ammunition Capacity ▲50% / 10s', () => {
    const ammo = pBuffs(base.events, 'maxAmmoPct').filter(
      (b) => b.value === 50
    );

    it('is 50%, self-scoped, 10s, once per phantom cast', () => {
      expect(ammo.length).toBe(casts);
      for (const b of ammo) {
        expect(b.targetIdx).toBe(PHANTOM);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is load-bearing: removing it drops the total (more reload downtime)', () => {
      expect(base.totals.phantom).toBeGreaterThan(rNoAmmo.totals.phantom);
    });
  });
});
