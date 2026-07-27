// PER-UNIT KIT SPEC — `d-killer-wife` (D: Killer Wife, Supporter/SR/Fire, Burst I, cd 20s, ammo 6,
// chargeFrames 60, hitsPerShot 1, normalMult 69.04 / coreMult 200 / chargeMult 250, critRate 15 /
// critDamage 150). The SR/Fire VARIANT of the SMG/Wind base unit `d` — a wholly different kit; the
// two slugs are never conflated (lint: full name "D: Killer Wife" passes NO AMBIGUOUS; the only hit
// is a false-positive on the canonical slug's "d-" prefix).
//
// Kit-autonomy gauntlet 2026-07-25 (driver-authored S2a; tests FIRST; reconciled vs blind S2b
// claude-fable-5). The override under test is the VALIDATED, tuned encoding (kit-status tier
// VALIDATED, evidence "Run G: 0.98-1.11"); this spec pins its faithfulness line-by-line and guards
// the two documented regression fixes (the S2 hitCount parser-bug and the burst parts-branch removal).
//
// One assertion group per KIT LINE (W1..W7 below), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters['d-killer-wife'].skills, levels 10/10/10 — the normalized
// `skills` prose is the SSOT):
//   S1 ■ Full Charge x3 → self: Gain Pierce for 1 shot                                          [W1 UNMODELED]
//      ■ entering Full Burst → all allies with a Sniper Rifle: Pierce Damage ▲13.55% for 10 sec  [W2]
//   S2 ■ Full Charge x8 → all allies: Cooldown of Burst Skill ▼ 7 sec                           [W3]
//      ■ Full Charge x5 → all allies: Attack damage ▲ 5.06% for 10 sec                          [W4]
//   BU ■ nearest enemy: 269.28% of final ATK as additional damage + inflicts Wipe Out 10 sec     [W5]
//      ■ allies' normal attack hits a Wipe-Out area → allies, by area hit:
//          hit parts: Damage dealt when attacking core ▲ 16.26% for 10 sec                      [W6 UNMODELED / skipped-conditional]
//          hit body:  ATK ▲ 12.19% of the skill user's ATK for 10 sec                            [W7]
//
// WHY EACH LINE IS DISPOSITIONED AS IT IS:
//   W1 UNMODELED (inert, documented): "Gain Pierce for 1 shot" every 3 full charges is a SELF pierce
//      TAG (engine `gainPierce` sets pierceUntilFrame, emits NO buffApply). On the partless single-
//      target boss the Pierce tag adds no extra targets; its only effect would be to make a tagged
//      shot eligible for the W2 Pierce Damage ▲ during Full Burst (a small own-damage undercount).
//      The override leaves it out; the S1 SLOT is still active (it emits W2), so this is a specific
//      within-slot skip. PIN: the skill1 slot emits EXACTLY {pierceDamagePct} and no self-tag/damage
//      stat — the documented skip, distinguished from a silent drop or a mis-encoding of the tag.
//   W2 FAITHFUL: fullBurstEnter → alliesOfWeapon SR → pierceDamagePct 13.55/10s. alliesOfWeapon has
//      no excludeSelf, so the SR caster (herself SR) is included. Nearest-wrong: the pre-2026-07-20
//      encoding targeted ALL allies (reached the non-SR ally). The pierceDamagePct buff is APPLIED on
//      FB entry regardless of pierce tags; translating to DAMAGE additionally needs a pierce tag
//      (W1's domain, unmodeled) — so this line is pinned at the buffApply event, not at damage.
//   W3 FAITHFUL (no event — observed via team Full-Burst cadence): hitCount 8 → all allies → burstCdr
//      7s. `burstCdr` directly lowers burstCdFrames and emits NO event, so it is only observable
//      downstream. The 2026-07-16 PARSER-BUG FIX: this line previously parsed as shotFired → the 7s
//      team CDR fired on EVERY shot (~105×/fight), FLOODING cooldowns. Now hitCount 8 → ~floor(shots/8)
//      firings. PIN: the shipped model completes a bounded team FB cadence; the every-shot parser-bug
//      counterfactual completes STRICTLY MORE Full Bursts (flooded). hitCount counts the unit's OWN
//      shots; an SR full-charges every pull, so hitCount 8 ≈ every 8 full charges (matches the kit).
//   W4 FAITHFUL: hitCount 5 → all allies → attackDamagePct 5.06/10s. Fires floor(shots/5)× over the
//      fight, each firing reaching all 3 allies (the buff refreshes its 10s window). Nearest-wrong:
//      hitCount 1 (≈ the same parser-bug class) → fires every shot. PIN: distinct firing frames ===
//      floor(shots/5); the hitCount-1 counterfactual fires far more.
//   W5 FAITHFUL: burstCast → enemy → flatDamage 269.28 (the lv10 magnitude, not the lv1 159.12) +
//      targetStatus "Wipe Out" 10s. The nuke lands once per cast in the burst bucket BEFORE the Full
//      Burst window opens, so it never takes the +50% FB major (verified engine convention). The Wipe
//      Out status emits NO event but is the gate that opens W7 (block order is load-bearing: the
//      status-inflicting burst block precedes the W7 gated block, both fire on the same burstCast
//      frame, so the gate reads a status written earlier that frame).
//   W6 UNMODELED / skipped-conditional (out-of-domain): the PARTS branch "coreDamagePct ▲16.26%" is
//      parts-gated — on the partless v1 scope-lock boss no ally can hit parts, so it can never be
//      earned. It was previously modeled as an UNGATED all-ally coreDamagePct buff, which OVER-CREDITED
//      every ally's core bucket (core hits DO exist on a partless boss's core). The 2026-07-17 fix
//      REMOVED it (repo convention for v1-partless-inert lines, cf. brid's Wind-Code debuffs). PIN: the
//      burst slot emits NO coreDamagePct; re-adding the ungated parts branch (counterfactual) makes
//      coreDamagePct appear and lifts every ally's total — i.e. the shipped encoding is the one that
//      does NOT over-credit. Re-enable only for a boss with destructible parts (OUT OF SCOPE for v1);
//      ⚑ needs a parts-hit trigger + destructible-part modeling (estimate: small own-comp core bucket;
//      recipe: requiresTargetStatus 'Wipe Out' + parts-hit trigger; tier: out-of-domain/v1-partless).
//   W7 FAITHFUL (gated): burstCast → all allies → casterAtkPct 12.19 (% of caster ATK), gated on
//      requiresTargetStatus "Wipe Out" ONLY. casterAtkPct resolves to flat ATK = (12.19/100)×caster.
//      staticAtk. Fires once per cast (the Wipe Out gate is satisfied same-frame by W5's status block),
//      reaching all 3 allies for 10s. [2026-07-25 reconciling-judge REAL-GOTCHA fix] this block previously
//      ALSO carried requiresCore:true — a STRANDED parts→core proxy gate left behind when the parts branch
//      was deleted (2026-07-17). That inverted the kit: "Allies that hit the BODY" = non-core on the
//      partless boss, so the body branch must be MAXIMALLY live at coreHitRate 0 (every hit is a body
//      hit), NOT gated out. requiresCore was REMOVED; the gate is now Wipe Out alone, so the body branch
//      fires IDENTICALLY at coreHitRate 0 and 1 — pinned below. (The requiresCore proxy now belongs only
//      on the parked W6 parts branch, where it will gate the parts→core mapping once parts are modeled.)
//      The requiresTargetStatus gate is FAITHFUL but in-fixture-neutral (her burst ALWAYS inflicts Wipe Out
//      same-frame, so removing the gate changes nothing here); it matters for the future W6 parts wiring
//      and for comps where the status could be absent — documented, not asserted as a damage discriminator.
//
// FIXTURE: d-killer-wife is BURST I, so the B3-carry controlComp does not apply. Custom 3-unit chain
// d-killer-wife(B1,SR slot 0) / crown(B2,MG slot 1) / helm(B3,SR slot 2), boss Fire (d-killer-wife Fire
// is neutral vs Fire — clean), focus d-killer-wife (×2.5 charge gauge so she casts often). One unit per
// burst stage → a clean B1→B2→B3 chain that completes Full Bursts. The weapon split is deliberate: SR
// allies = {d-killer-wife slot 0, helm slot 2}, non-SR ally = {crown slot 1 (MG)} — exactly what the W2
// SR-scoping discrimination needs. Deterministic (no seed → EV pass, byte-stable totals). Measured base:
// d-killer-wife 105 shots / 13 casts, team 6 Full Bursts.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: d-killer-wife 0 / crown 1 / helm 2. */
const DKW = 0;
const CROWN = 1;
const HELM = 2;
const SR_ALLIES = [DKW, HELM]; // SR wielders in the fixture
const ALL_ALLIES = [DKW, CROWN, HELM];

const comp = {
  slugs: ['d-killer-wife', 'crown', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'd-killer-wife',
};

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  cfg: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e), ...cfg },
  });
  return { events, totals: totals(res), res };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dkwShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'd-killer-wife');
const dkwCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'd-killer-wife'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const castFrames = (evs: SimEvent[]) =>
  dkwCasts(evs)
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbFrames = (evs: SimEvent[]) =>
  fbStarts(evs)
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** d-killer-wife-caster buffs, optionally filtered to a slot (via the buff key `<caster>:<slot>:…`). */
const dkwBuffs = (evs: SimEvent[], slot?: 'skill1' | 'skill2' | 'burst') =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === DKW &&
      (slot == null || b.key.startsWith(`${DKW}:${slot}:`))
  );
const distinctFrames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1)
  );
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame))
  ),
];

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** W2 nearest-wrong: the pre-2026-07-20 encoding — Pierce Damage to ALL allies (reaches the MG). */
const cfPierceAll = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'pierceDamagePct')
  );
  if (!b) {
    throw new Error(
      'd-killer-wife S1 pierceDamagePct block missing — fixture is stale'
    );
  }
  b.target = { kind: 'allies' };
});
/** W3 nearest-wrong: the 2026-07-16 parser bug — team Burst CDR firing on EVERY shot (shotFired). */
const cfCdrEveryShot = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (!b) {
    throw new Error(
      'd-killer-wife S2 burstCdr block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'shotFired' };
});
/** W4 nearest-wrong: the same parser-bug class — Attack Damage firing every shot (hitCount 5 → 1). */
const cfAtkEveryShot = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.skill2.find(
    (x: any) =>
      x.trigger?.kind === 'hitCount' &&
      x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b) {
    throw new Error(
      'd-killer-wife S2 attackDamagePct block missing — fixture is stale'
    );
  }
  b.trigger.count = 1;
});
/** W5 nearest-wrong: the lv1 burst magnitude 159.12 instead of the lv10 269.28. */
const cfNukeLv1 = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error(
      'd-killer-wife burst flatDamage block missing — fixture is stale'
    );
  }
  b.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 159.12;
});
/** W6 nearest-wrong: re-add the REMOVED ungated parts branch (all-ally coreDamagePct 16.26) — the
 *  pre-2026-07-17 over-credit. */
const cfPartsReadded = withPatchedOverride('d-killer-wife', (ov: any) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'allies' },
    effects: [
      { kind: 'buff', stat: 'coreDamagePct', value: 16.26, durationSec: 10 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const pierceAll = run({ 'd-killer-wife': cfPierceAll });
const cdrEveryShot = run({ 'd-killer-wife': cfCdrEveryShot });
const atkEveryShot = run({ 'd-killer-wife': cfAtkEveryShot });
const nukeLv1 = run({ 'd-killer-wife': cfNukeLv1 });
const partsReadded = run({ 'd-killer-wife': cfPartsReadded });
// W7 gate-DIRECTION probe: OFF-BASIS coreHitRate 0 (the scope-lock basis is coreHitRate 1). The body
// branch is gated on Wipe Out ONLY (no requiresCore — that stranded proxy was removed 2026-07-25), so
// it must fire IDENTICALLY at coreHitRate 0 and 1: "hit the body" = non-core, maximally live when no
// core hits exist. A regression that re-adds requiresCore would gate it out here (0 apps) — caught.
const core0 = run({}, { coreHitRate: 0 });

const shots = dkwShots(base.events).length;
const casts = dkwCasts(base.events).length;
const fbs = fbStarts(base.events).length;
const dkwStaticAtk = base.res.units[DKW].staticAtk;

describe('d-killer-wife — kit spec', () => {
  describe('fixture sanity — she casts, the team completes Full Bursts, a cast precedes the FB it opens', () => {
    it('d-killer-wife casts >0 bursts and the team completes >0 Full Bursts', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
    });
    it('her cast frames are distinct from Full-Burst-start frames (a cast lands before the FB it opens)', () => {
      const cf = castFrames(base.events);
      const fs = fbFrames(base.events);
      expect(cf.every((f) => !fs.includes(f))).toBe(true);
    });
  });

  describe('W1 — S1 "Gain Pierce for 1 shot" (self, every 3 full charges) is UNMODELED (inert on partless boss)', () => {
    it('PIN: the skill1 slot emits EXACTLY {pierceDamagePct} — no self pierce-tag / damage stat', () => {
      const stats = [
        ...new Set(dkwBuffs(base.events, 'skill1').map((b) => b.stat)),
      ].sort();
      expect(stats).toEqual(['pierceDamagePct']);
    });
  });

  describe('W2 — S1 entering Full Burst → SR allies: Pierce Damage ▲13.55% for 10 sec', () => {
    const pierce = dkwBuffs(base.events, 'skill1').filter(
      (b) => b.stat === 'pierceDamagePct'
    );
    it('is 13.55%, fires on every Full Burst entry, for 10 sec', () => {
      expect(pierce.length).toBeGreaterThan(0);
      expect([...new Set(pierce.map((b) => b.value))]).toEqual([13.55]);
      expect(distinctFrames(pierce)).toEqual(fbFrames(base.events)); // once per FB entry
      expect(dursOf(pierce)).toEqual([10 * FPS]);
    });
    it('reaches ONLY the Sniper-Rifle allies (herself + helm), never the MG', () => {
      expect(targetsOf(pierce)).toEqual(SR_ALLIES);
      expect(targetsOf(pierce)).not.toContain(CROWN);
    });
    it('DISCRIMINATING: the all-allies encoding (pre-2026-07-20) would reach the MG too', () => {
      const cf = dkwBuffs(pierceAll.events, 'skill1').filter(
        (b) => b.stat === 'pierceDamagePct'
      );
      expect(targetsOf(cf)).toEqual(ALL_ALLIES);
      expect(targetsOf(cf)).toContain(CROWN);
    });
  });

  describe('W3 — S2 Full Charge x8 → all allies: Burst CDR ▼7 sec (no event; observed via FB cadence)', () => {
    it('the shipped hitCount-8 model completes a bounded team Full-Burst cadence', () => {
      expect(fbs).toBe(6); // measured: hitCount 8 → ~floor(105/8) CDR firings, 6 team FBs
    });
    it('DISCRIMINATING: the every-shot parser bug FLOODS cooldowns → strictly more Full Bursts', () => {
      const cfFbs = fbStarts(cdrEveryShot.events).length;
      expect(cfFbs).toBeGreaterThan(fbs);
    });
  });

  describe('W4 — S2 Full Charge x5 → all allies: Attack damage ▲5.06% for 10 sec', () => {
    const atk = dkwBuffs(base.events, 'skill2').filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 5.06
    );
    it('fires floor(shots/5)× (every 5 of her own full charges), reaching all 3 allies for 10 sec', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(distinctFrames(atk).length).toBe(Math.floor(shots / 5));
      // every firing reaches all three allies
      for (const f of distinctFrames(atk)) {
        expect(atk.filter((b) => b.frame === f).length).toBe(3);
      }
      expect(targetsOf(atk)).toEqual(ALL_ALLIES);
      expect(dursOf(atk)).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING: hitCount 1 (parser-bug class) fires every shot — far more firings', () => {
      const cf = dkwBuffs(atkEveryShot.events, 'skill2').filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 5.06
      );
      expect(distinctFrames(cf).length).toBeGreaterThan(
        distinctFrames(atk).length
      );
    });
  });

  describe('W5 — Burst: 269.28% of final ATK additional damage + inflicts Wipe Out 10 sec', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'd-killer-wife' && d.srcSlot === 'burst'
    );
    it('lands once per cast at the lv10 magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([269.28]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });
    it('never takes the +50% Full Burst major (the cast lands before the FB window opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
    it('DISCRIMINATING: the lv1 magnitude 159.12 is NOT the shipped value', () => {
      const cf = dmg(nukeLv1.events).filter(
        (d) => d.slug === 'd-killer-wife' && d.srcSlot === 'burst'
      );
      expect([...new Set(cf.map((d) => d.atkPct))]).toEqual([159.12]);
      expect([...new Set(nukes.map((d) => d.atkPct))]).not.toEqual([159.12]);
    });
  });

  describe('W6 — Burst parts branch "coreDamagePct ▲16.26%" is UNMODELED (skipped-conditional, out-of-domain)', () => {
    it('PIN: the burst slot emits NO coreDamagePct (the ungated over-credit was removed 2026-07-17)', () => {
      const burstStats = [
        ...new Set(dkwBuffs(base.events, 'burst').map((b) => b.stat)),
      ].sort();
      expect(burstStats).not.toContain('coreDamagePct');
      expect(burstStats).toEqual(['casterAtkPct']); // body branch (W7) is the only burst buff
    });
    it('DISCRIMINATING: re-adding the ungated parts branch makes coreDamagePct appear and lifts every total', () => {
      const cfCore = buffs(partsReadded.events).filter(
        (b) => b.stat === 'coreDamagePct'
      );
      expect(cfCore.length).toBeGreaterThan(0);
      for (const s of comp.slugs) {
        expect(partsReadded.totals[s]).toBeGreaterThan(base.totals[s]);
      }
    });
  });

  describe('W7 — Burst body branch → all allies: ATK ▲12.19% of caster ATK for 10 sec (gated)', () => {
    const body = dkwBuffs(base.events, 'burst').filter(
      (b) => b.stat === 'casterAtkPct'
    );
    it('fires once per cast, reaching all 3 allies for 10 sec, on her cast frames', () => {
      expect(body.length).toBeGreaterThan(0);
      expect(distinctFrames(body)).toEqual(castFrames(base.events)); // once per own cast
      expect(targetsOf(body)).toEqual(ALL_ALLIES);
      expect(dursOf(body)).toEqual([10 * FPS]);
    });
    it("is 12.19% of the caster's ATK (casterAtkPct resolves to flat ATK)", () => {
      const expected = (12.19 / 100) * dkwStaticAtk;
      for (const b of body) {
        expect(b.value).toBeCloseTo(expected, 6);
      }
    });
    it('GATE DIRECTION: NOT core-gated — fires identically at coreHitRate 0 and 1 (body = non-core)', () => {
      // "Allies that hit the body" = non-core on the partless boss, so the body branch is MAXIMALLY
      // live at coreHitRate 0 (every hit is a body hit). The gate is Wipe Out alone. A regression that
      // re-adds the stranded requiresCore proxy would gate it OUT at coreHitRate 0 — this catches it
      // (the S7 reconciling-judge REAL-GOTCHA: requiresCore inverts the kit's body condition).
      const atCore0 = dkwBuffs(core0.events, 'burst').filter(
        (b) => b.stat === 'casterAtkPct'
      );
      expect(atCore0.length).toBeGreaterThan(0);
      expect(atCore0.length).toBe(body.length); // unchanged by core exposure → gate is Wipe Out, not core
    });
  });
});
