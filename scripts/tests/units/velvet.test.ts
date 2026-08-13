// PER-UNIT KIT SPEC — `velvet` (Velvet, Supporter/SR/Wind, Burst II, cd 20s, ammo 6, chargeFrames 60,
// chargeMultiplier 250, hitsPerShot 1, normalMult 69.04 / coreMult 200).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (V1..V5), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.velvet.skills):
//   S1 ■ start of battle / entering Burst Stage 2 — Bullet Snatch: removes 5% ammo from all enemies;
//        fills own ammo pouch to 6000 (continuous, unremovable)                              (UNMODELED) [V1]
//      ■ Full Charge while NOT in Full Burst → self: ATK ▲30.5% / Attack Damage ▲30.5% for 3 sec        [V2]
//   S2 ■ Full Charge DURING Full Burst → all allies: ATK ▲25.2% of caster's ATK / Charge Damage ▲100.8%
//        for 3 sec continuously                                                                          [V3]
//      ■ after landing 50 normal attacks during Full Burst → self Attack Damage ▲15.03% / 5 sec +
//        target 400.92% of final ATK additional damage                                                   [V4]
//   BU ■ self: Changes the weapon in use (Damage 7% of final ATK, 10 sec) + Attack Damage ▲34.52% / 10s [V5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   V1  Bullet Snatch is RESOURCE/DEFENSIVE bookkeeping — the pouch is a build/consume stack resource, NOT
//       her magazine (owner ruling 2026-08-13). It is derivably NEVER-BINDING: worst-case drain per 20s
//       rotation ≈ 10 procs×300 + out-of-FB charges×100 ≈ 3.45k while bursting, ≈ 2.45k unswapped (in-FB
//       charges×300), both « the 6000 cap, which refills at every Burst-Stage-2 ENTRY — a team rotation
//       state that fires whenever the chain reaches stage 2, regardless of who casts (owner ruling
//       2026-08-13), so it refills every rotation even for a velvet who never bursts. Every ammo-gated
//       effect therefore fires at full uptime and
//       the pouch + the enemy bullet-steal are a sanctioned UNMODELED skip (recorded verbatim), NOT a
//       dynamic resource gate. PIN the absence: velvet emits ZERO maxAmmo buffs and forces ZERO ally reloads.
//       Nearest-wrong (fable S2b): a sign-flipped consumeAmmo on ALLIES (the "removes 5% ammo" mis-targeted)
//       — would force ally reloads and cut team damage. GREEN vs shipped (no such block → 0 ally reloads),
//       RED vs the consumeAmmo-on-allies counterfactual (ally reload events appear).
//   V2  "Full Charge while NOT in Full Burst" = shotFired + fbGate:'outFb' (the schema's canonical outFb
//       example is Velvet). For an SR in auto-play every trigger pull IS a full charge, so shotFired is the
//       faithful proxy for "Full Charge attack"; the outFb gate is the load-bearing clause. Two effects —
//       atkPct 30.5 (ATK bucket) AND attackDamagePct 30.5 (Damage-Up bucket) — NOT a collapsed atkPct 61.
//       Nearest-wrong (a): dropping the outFb gate (buff also refreshes on in-FB charges). Nearest-wrong (b):
//       collapsing both 30.5s into one doubled atkPct. Both discriminated (gate: 0 in-FB applies; collapse:
//       both distinct stats present at 30.5).
//   ⇒ TWO MODES (owner ruling 2026-08-13). Velvet is built to play as the OFF-B2, and her two S2
//     blocks are mutually exclusive: UNSWAPPED she full-charges through Full Burst and feeds the
//     V3 team buff; SWAPPED (her own burst) she holds a 60-round/sec machine gun that cannot
//     full-charge, so V3 is gated off (swapGate:'unswapped') and the V4 50-hit proc — unreachable
//     for an SR — becomes the payout instead. Two fixtures partition this: FIXTURE (sole-B2, she
//     casts every rotation) and FIXTURE_OFF (crown takes every stage-2 cast, she never swaps).
//   V3  "Full Charge DURING Full Burst" = shotFired + fbGate:'inFb' + swapGate:'unswapped' → all allies. "ATK ▲25.2% of the skill
//       user's ATK" = casterAtkPct — a FLAT add of 25.2% of VELVET's ATK (resolves to ~25133 at apply), NOT
//       atkPct (a 25.2% scaler on each ally's own ATK). "Charge Damage ▲100.8%" = chargeDamagePct (additive
//       points in the charge bucket), NOT chargeDamageMultPct (a base-charge multiplier). Nearest-wrong (a):
//       dropping the inFb gate (team buff up outside FB). (b) stat=atkPct (scales the carry's larger ATK →
//       big over-credit). (c) chargeDamageMultPct. All three discriminated. "All allies" INCLUDES velvet
//       herself (no "except self" clause) — reaches slots 0,1,2,3 of FIXTURE_OFF. The swapGate is the
//       second load-bearing clause: her MG cannot full-charge, so a bursting velvet stops feeding this
//       line entirely (asserted in FIXTURE, where it fires zero times inside her swap windows).
//   V4  "after landing 50 normal attacks during Full Burst" = hitCount:50 + fbGate:'inFb' → self
//       attackDamagePct 15.03/5s + target flatDamage 400.92. The MG is what makes this reachable: ~9.1s
//       of her 10s swap sits inside Full Burst at 60 rounds/sec, so it fires ~11× per window (55 in the
//       fixture) — the payout of her own burst. Unswapped her SR lands 36 in-FB shots in a whole fight,
//       under the threshold. Nearest-wrong (a): dropping the fbGate — her swap windows that never reach
//       Full Burst then pay out too (120 procs vs 55). Nearest-wrong (b): a lowered threshold. ⚑ the
//       engine's hitCount counter is CUMULATIVE over all normal attacks and only gates the FIRING, so it
//       diverges from the kit-literal in-FB-only reading at low volume (1 proc vs 0 in FIXTURE_OFF);
//       both counts are pinned below so the divergence cannot drift silently.
//   V5  Burst = burstCast → self weaponSwap (damagePct 7, 10s) + attackDamagePct 34.52 (10s). The swap
//       REPLACES her SR with a machine gun (owner ruling 2026-08-13): no wind-up, 60 rounds/sec, no ammo
//       and no reload, 10s from the cast instant — 600 shots per window at one per frame, at atkPct=7 vs
//       her 69.04 SR normal. "Additional Effect: Attack Damage ▲34.52% for 10 sec" = a self
//       attackDamagePct buff on BURST CAST (pre-FB), 600f. Nearest-wrong (a): fullBurstEnter keying —
//       fires on EVERY team FB (5×) including rotations a different B2 casts, not just velvet's own 10
//       casts. (b) duration ≠ 10s. (c) weaponSwap damagePct ≠ 7. (d) the MG spec stripped, so the swap
//       inherits her SR charge cycle and 6-round magazine (~9 shots/window, with reloads). All discriminated.
//
// Fixtures: TWO, because her kit has two mutually exclusive modes and no single comp exercises both.
//   FIXTURE     [liter(B1) / velvet(B2) / helm(B3)] — velvet is the SOLE Burst II, so she casts every
//               cycle (10 casts over 180s) while the team completes 5 Full Bursts. burstCast (10) ≠
//               fullBurstEnter (5) is what lets the V5 trigger-identity assertion discriminate by count.
//               This is the SWAPPED mode: V4's proc pays out, V3's team buff is gated off.
//   FIXTURE_OFF [liter(B1) / crown(B2) / velvet(B2) / helm(B3)] — crown is first ready at every stage-2
//               cast, so velvet casts ZERO bursts and never swaps. This is the UNSWAPPED mode she is
//               built for: V3's team buff fires, V4's proc cannot reach its threshold.
// Boss Iron in both (Velvet is Wind → clean ×1.10 advantaged; the others neutral — irrelevant, every
// assertion filters on her casterIdx). Focus Velvet. Deterministic (no seed).
// Slot order: FIXTURE liter 0 / velvet 1 / helm 2; FIXTURE_OFF liter 0 / crown 1 / velvet 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const VEL = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const FIXTURE = {
  slugs: ['liter', 'velvet', 'helm'] as string[],
  bossElement: 'Iron' as const,
  focusSlug: 'velvet',
};

// OFF-B2 FIXTURE — the mode Velvet is actually built for (owner ruling 2026-08-13). Adding crown
// as a second Burst II hands her every stage-2 cast — same 20s cooldown, but the first-ready reduce
// keeps the LEFTMOST unit on ties (crown slot 1 < velvet slot 2), and velvet's cooldown never starts
// because she never casts: velvet casts ZERO bursts here, never swaps, and full-charges her SR through
// every Full Burst. That is the ONLY state in which S2 block 1 (the team buff) can fire, so the
// two fixtures partition her kit — FIXTURE proves the swapped half, FIXTURE_OFF the unswapped one.
const FIXTURE_OFF = {
  slugs: ['liter', 'crown', 'velvet', 'helm'] as string[],
  bossElement: 'Iron' as const,
  focusSlug: 'velvet',
};
const VEL_OFF = 2; // velvet's slot in FIXTURE_OFF

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

function runOff(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE_OFF,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const velBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === VEL &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const perTarget = (bs: BuffApply[], tgt: number) =>
  bs.filter((b) => b.targetIdx === tgt);
const velBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'velvet'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const velDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'velvet');
// buff reader for FIXTURE_OFF, where velvet is slot 2 rather than slot 1 (buffApply carries slot
// indices, so this one MUST be re-slotted; the damage readers key on slug and need no variant).
const offVelBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === VEL_OFF &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );

/** Full-burst windows [startFrame, endFrame] from the event stream. */
function fbWindows(evs: SimEvent[]): [number, number][] {
  const wins: [number, number][] = [];
  let start: number | null = null;
  for (const e of evs) {
    if (e.kind === 'fullBurstStart') {
      start = e.frame;
    }
    if (e.kind === 'fullBurstEnd' && start != null) {
      wins.push([start, e.frame]);
      start = null;
    }
  }
  return wins;
}
const countInFb = (bs: BuffApply[], wins: [number, number][]) =>
  bs.filter((b) => wins.some(([a, z]) => b.frame >= a && b.frame <= z)).length;

/** The 400.92% additional-damage rider (V4 proc). */
const procHits = (evs: SimEvent[]) =>
  velDamage(evs).filter((d) => d.srcSlot === 'skill2' && d.atkPct > 100);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** V1 inertness: strip Velvet's entire skill1 slot (the pouch + bullet-steal + self buff are all gone). */
const cfNoSkill1 = withPatchedOverride('velvet', (ov: any) => {
  ov.skill1 = [];
});
/** V1 nearest-wrong: the "removes 5% ammo" sign-flipped onto ALLIES (consumeAmmo on the team). */
const cfConsumeAllies = withPatchedOverride('velvet', (ov: any) => {
  ov.skill1 = [
    ...ov.skill1,
    {
      slot: 'skill1',
      trigger: { kind: 'shotFired' },
      target: { kind: 'allies' },
      effects: [{ kind: 'consumeAmmo', fraction: 0.05 }],
    },
  ];
});
/** The skill1 outFb self-buff block (V2 under test). */
const isS1SelfBuff = (b: any) =>
  b.trigger?.kind === 'shotFired' &&
  b.fbGate === 'outFb' &&
  b.effects?.some((e: any) => e.stat === 'atkPct' && e.value === 30.5);
/** V2 nearest-wrong (gate): drop the outFb gate (buff also refreshes on in-FB charges). */
const cfS1NoGate = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill1) {
    if (isS1SelfBuff(b)) {
      delete b.fbGate;
      hit++;
    }
  }
  if (!hit) {
    throw new Error(
      'velvet S1 outFb self-buff block missing — fixture is stale'
    );
  }
});
/** The skill2 inFb team-buff block (V3 under test). */
const isS2TeamBuff = (b: any) =>
  b.trigger?.kind === 'shotFired' &&
  b.fbGate === 'inFb' &&
  b.effects?.some((e: any) => e.stat === 'casterAtkPct');
/** V3 nearest-wrong (swap gate): drop swapGate — the MG's 60/s shots then feed the team buff. */
const cfS2NoSwapGate = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2TeamBuff(b)) {
      delete b.swapGate;
      hit++;
    }
  }
  if (!hit) {
    throw new Error(
      'velvet S2 inFb team-buff block missing — fixture is stale'
    );
  }
});
/** V3 nearest-wrong (gate): drop the inFb gate (team buff up outside FB). */
const cfS2NoGate = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2TeamBuff(b)) {
      delete b.fbGate;
      hit++;
    }
  }
  if (!hit) {
    throw new Error(
      'velvet S2 inFb team-buff block missing — fixture is stale'
    );
  }
});
/** V3 nearest-wrong (stat): casterAtkPct → atkPct (a 25.2% scaler on each ally's OWN ATK). */
const cfS2AtkPct = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.skill2.find((x: any) => isS2TeamBuff(x));
  if (!b) {
    throw new Error(
      'velvet S2 inFb team-buff block missing — fixture is stale'
    );
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});
/** V3 nearest-wrong (stat): chargeDamagePct → chargeDamageMultPct (a base-charge multiplier). */
const cfS2ChargeMult = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.skill2.find((x: any) => isS2TeamBuff(x));
  if (!b) {
    throw new Error(
      'velvet S2 inFb team-buff block missing — fixture is stale'
    );
  }
  b.effects.find((e: any) => e.stat === 'chargeDamagePct').stat =
    'chargeDamageMultPct';
});
/** The skill2 hitCount proc blocks (V4 under test — the rider + the self buff share the trigger). */
const isS2Proc = (b: any) => b.trigger?.kind === 'hitCount';
/** V4 nearest-wrong (gate): drop the inFb gate — the 50-hit threshold crosses OUT of FB and procs. */
const cfProcNoGate = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2Proc(b)) {
      delete b.fbGate;
      hit++;
    }
  }
  if (!hit) {
    throw new Error('velvet S2 hitCount proc block missing — fixture is stale');
  }
});
/** V4 count-SCOPE counterfactual: drop `countScope:'gated'` so the counter accrues over ALL normal
 *  attacks again and only the FIRING is gated — the pre-2026-08-13 engine semantics. In FIXTURE_OFF
 *  that leaks one proc her kit never grants ("landing 50 normal attack(s) DURING Full Burst"). */
const cfProcCumulative = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2Proc(b)) {
      delete b.trigger.countScope;
      hit++;
    }
  }
  if (!hit) {
    throw new Error('velvet S2 hitCount countScope missing — fixture is stale');
  }
});
/** V4 nearest-wrong (threshold/effect): lower hitCount 50 → 5 so the proc fires in-FB (proves the encoding). */
const cfProcCount5 = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2Proc(b)) {
      b.trigger.count = 5;
      hit++;
    }
  }
  if (!hit) {
    throw new Error('velvet S2 hitCount proc block missing — fixture is stale');
  }
});
/** V5 nearest-wrong (trigger): burst attackDamage re-keyed burstCast → fullBurstEnter (5× not 10×). */
const cfBurstFbEnter = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some(
      (e: any) => e.stat === 'attackDamagePct' && e.value === 34.52
    )
  );
  if (!b) {
    throw new Error(
      'velvet burst attackDamage block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** V5 nearest-wrong (duration): the 34.52% Attack Damage window shortened 10s → 3s. */
const cfBurstDur3 = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some(
      (e: any) => e.stat === 'attackDamagePct' && e.value === 34.52
    )
  );
  if (!b) {
    throw new Error(
      'velvet burst attackDamage block missing — fixture is stale'
    );
  }
  b.effects.find(
    (e: any) => e.stat === 'attackDamagePct' && e.value === 34.52
  ).durationSec = 3;
});
/** V5 nearest-wrong (swap mult): weaponSwap damagePct 7 → 70 (swap shots at the wrong multiplier). */
const cfSwap70 = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some((e: any) => e.kind === 'weaponSwap')
  );
  if (!b) {
    throw new Error('velvet burst weaponSwap block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.kind === 'weaponSwap').damagePct = 70;
});

/** V5 nearest-wrong (economy): strip the MG spec so the swap inherits her SR charge + 6-round mag. */
const cfSwapInheritsSr = withPatchedOverride('velvet', (ov: any) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects ?? [])
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e) {
    throw new Error('velvet burst weaponSwap block missing — fixture is stale');
  }
  delete e.weapon;
  delete e.pullsPerSec;
  delete e.chargeTimeSec;
  delete e.maxAmmo;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const off = runOff();
const offNoGate = runOff({ velvet: cfS2NoGate });
const offAtkPct = runOff({ velvet: cfS2AtkPct });
const offChargeMult = runOff({ velvet: cfS2ChargeMult });
const s2NoSwapGate = run({ velvet: cfS2NoSwapGate });
const swapInheritsSr = run({ velvet: cfSwapInheritsSr });
const noSkill1 = run({ velvet: cfNoSkill1 });
const consumeAllies = run({ velvet: cfConsumeAllies });
const s1NoGate = run({ velvet: cfS1NoGate });
// the three V3 counterfactuals run on FIXTURE_OFF (see offNoGate/offAtkPct/offChargeMult above):
// the team buff cannot fire at all in the sole-B2 fixture, so a counterfactual run there would be
// vacuously zero for both the shipped encoding and the nearest-wrong reading.
const procNoGate = run({ velvet: cfProcNoGate });
const procCumulative = runOff({ velvet: cfProcCumulative });
const procCount5 = run({ velvet: cfProcCount5 });
const burstFbEnter = run({ velvet: cfBurstFbEnter });
const burstDur3 = run({ velvet: cfBurstDur3 });
const swap70 = run({ velvet: cfSwap70 });

const casts = velBursts(base.events).length; // Velvet's burst casts (10)
const fbs = fbStarts(base.events).length; // team Full Bursts (5)
const wins = fbWindows(base.events);
const offWins = fbWindows(off.events);

describe('velvet — kit spec', () => {
  describe('fixture sanity — Velvet casts her burst and the team reaches Full Burst', () => {
    it('Velvet casts >0 bursts and the team completes >0 Full Bursts (burst/FB-gated lines are not vacuous)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B2 comp: Velvet casts every cycle, so she casts at least as often as the team FBs
      expect(casts).toBeGreaterThanOrEqual(fbs);
    });
  });

  describe('V1 — S1 Bullet Snatch (pouch fill + enemy ammo removal) is UNMODELED and inert', () => {
    it('PIN: Velvet emits ZERO maxAmmo buffs (the pouch is never modeled as a binding resource)', () => {
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === VEL &&
            (b.stat === 'maxAmmoFlat' || b.stat === 'maxAmmoPct')
        ).length
      ).toBe(0);
    });
    it("PIN (inertness): stripping Velvet's whole skill1 leaves ALLY totals byte-identical (pouch never binds; bullet-steal moves nothing on the team)", () => {
      const b = totals(base.res);
      const n = totals(noSkill1.res);
      expect(n.liter).toBe(b.liter);
      expect(n.helm).toBe(b.helm);
    });
    it('DISCRIMINATING: a sign-flipped consumeAmmo on ALLIES (nearest-wrong) WOULD force extra ally reloads', () => {
      const baseReloads = base.events.filter(
        (e) => e.kind === 'reload' && e.slug !== 'velvet'
      ).length;
      const cfReloads = consumeAllies.events.filter(
        (e) => e.kind === 'reload' && e.slug !== 'velvet'
      ).length;
      expect(cfReloads).toBeGreaterThan(baseReloads);
    });
  });

  describe('V2 — S1 Full-Charge-outFb self ATK ▲30.5% + Attack Damage ▲30.5% for 3 sec (two distinct stats)', () => {
    const atk = velBuffs(base.events, 'atkPct', 30.5);
    const atkDmg = velBuffs(base.events, 'attackDamagePct', 30.5);
    it('fires per out-of-FB charge shot on Velvet only, 3s refresh, and NEVER inside Full Burst (outFb gate)', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(atkDmg.length).toBeGreaterThan(0);
      // self-only
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([VEL]);
      expect([...new Set(atkDmg.map((b) => b.targetIdx))]).toEqual([VEL]);
      // 3-second wall-clock window, refreshed per shot
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        3 * FPS,
      ]);
      // outFb gate: ZERO applications land inside any Full Burst window
      expect(countInFb(atk, wins)).toBe(0);
      expect(countInFb(atkDmg, wins)).toBe(0);
    });
    it('DISCRIMINATING (gate): dropping outFb lets the buff refresh on in-FB charges (applications appear inside FB)', () => {
      expect(
        countInFb(
          velBuffs(s1NoGate.events, 'atkPct', 30.5),
          fbWindows(s1NoGate.events)
        )
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (collapse): the two 30.5s are DISTINCT stats (atkPct + attackDamagePct), not a single atkPct 61', () => {
      expect(velBuffs(base.events, 'atkPct', 61).length).toBe(0);
      expect(atk.length).toBeGreaterThan(0);
      expect(atkDmg.length).toBeGreaterThan(0);
    });
  });

  describe('V3 — S2 Full-Charge-inFb team buff: casterAtkPct 25.2 (flat) + chargeDamagePct 100.8, all allies, 3s', () => {
    const casterAtk = offVelBuffs(off.events, 'casterAtkPct');
    const chargeDmg = offVelBuffs(off.events, 'chargeDamagePct', 100.8);
    // OWNER RULING 2026-08-13: her burst swap is a machine gun that does NOT full-charge, so
    // "Activates when attacking with Full Charge during Full Burst" cannot fire while she is
    // swapped — swapGate:'unswapped' beside the shipped fbGate:'inFb'. The two gates are mutually
    // exclusive for a BURSTING velvet (her 10s swap opens ~0.9s before Full Burst and covers all
    // but the last ~0.9s of it, shorter than one 1.5s charge cycle), so this line is dead in the
    // sole-B2 fixture BY DESIGN: she is built to play as the off-B2, where it fires freely
    // (FIXTURE_OFF below) and her burst instead pays out through the V4 proc.
    it('the Full-Charge team buff CANNOT fire while she is swapped (the MG does not charge)', () => {
      const swapWindows = velBursts(base.events).map(
        (c) => [c.frame, c.frame + 10 * FPS] as [number, number]
      );
      expect(swapWindows.length).toBeGreaterThan(0); // non-vacuous: she really does swap here
      const inSwap = velBuffs(base.events, 'casterAtkPct').filter((b) =>
        swapWindows.some(([s, e]) => b.frame >= s && b.frame <= e)
      );
      expect(
        inSwap.length,
        `${inSwap.length} team-buff applications landed inside her own swap window, where she cannot full-charge`
      ).toBe(0);
    });
    it('DISCRIMINATING (gate): without swapGate the MG shots feed the team buff ~600x per window', () => {
      const cf = velBuffs(s2NoSwapGate.events, 'casterAtkPct');
      const swapWindows = velBursts(s2NoSwapGate.events).map(
        (c) => [c.frame, c.frame + 10 * FPS] as [number, number]
      );
      expect(
        cf.filter((b) =>
          swapWindows.some(([s, e]) => b.frame >= s && b.frame <= e)
        ).length
      ).toBeGreaterThan(0);
    });
    it('FIXTURE_OFF sanity: with crown taking every stage-2 cast, velvet never bursts and never swaps', () => {
      expect(velBursts(off.events).length).toBe(0);
      expect(
        velDamage(off.events).filter(
          (d) => d.srcSlot === 'normal' && d.atkPct === 7
        ).length
      ).toBe(0);
      expect(fbStarts(off.events).length).toBeGreaterThan(0);
    });

    it("casterAtkPct is a FLAT add of Velvet's ATK (value >> a percentage), in FB only, reaching all four allies", () => {
      expect(casterAtk.length).toBeGreaterThan(0);
      // flat ATK add (≈25.2% of Velvet's ATK ≈ 25133), NOT a 25.2 percentage scaler
      expect(casterAtk.every((b) => b.value > 1000)).toBe(true);
      // inFb gate: every application lands inside a Full Burst window, none outside
      expect(countInFb(casterAtk, offWins)).toBe(casterAtk.length);
      // all allies including self (slots 0,1,2,3)
      for (const tgt of [0, 1, 2, 3]) {
        expect(perTarget(casterAtk, tgt).length).toBeGreaterThan(0);
      }
    });
    it('chargeDamagePct 100.8 is the additive charge bucket, in FB only, reaching all four allies, 3s', () => {
      expect(chargeDmg.length).toBeGreaterThan(0);
      expect(countInFb(chargeDmg, offWins)).toBe(chargeDmg.length);
      expect([
        ...new Set(chargeDmg.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([3 * FPS]);
      for (const tgt of [0, 1, 2, 3]) {
        expect(perTarget(chargeDmg, tgt).length).toBeGreaterThan(0);
      }
    });
    it('DISCRIMINATING (gate): dropping inFb lets the team buff apply OUTSIDE Full Burst', () => {
      const cf = offVelBuffs(offNoGate.events, 'casterAtkPct');
      const cfWins = fbWindows(offNoGate.events);
      expect(cf.length - countInFb(cf, cfWins)).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (stat): atkPct (nearest-wrong) reports a 25.2 percentage, not a flat ATK add', () => {
      const cf = offVelBuffs(offAtkPct.events, 'atkPct', 25.2);
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.every((b) => b.value === 25.2)).toBe(true); // a scaler, value < 100
      expect(offVelBuffs(offAtkPct.events, 'casterAtkPct').length).toBe(0);
    });
    it('DISCRIMINATING (stat): chargeDamageMultPct (nearest-wrong) is a different stat than the additive chargeDamagePct', () => {
      expect(
        offVelBuffs(offChargeMult.events, 'chargeDamagePct', 100.8).length
      ).toBe(0);
      expect(
        offVelBuffs(offChargeMult.events, 'chargeDamageMultPct', 100.8).length
      ).toBeGreaterThan(0);
    });
  });

  describe('V4 — S2 "50 normal attacks during FB" proc: self Attack Damage ▲15.03%/5s + target 400.92% flatDamage', () => {
    // The MG is what makes this line reachable (owner ruling 2026-08-13): at 60 rounds/sec, ~9.1s
    // of her 10s swap sits inside Full Burst, so the 50-hit threshold is crossed ~11x per window.
    // This IS the payout of her own burst — the mode where the V3 team buff is gated off.
    it('the proc fires ~1 per 50 in-FB swap shots, every one of them INSIDE Full Burst', () => {
      const hits = procHits(base.events);
      const inFbShots = velDamage(base.events).filter(
        (d) =>
          d.srcSlot === 'normal' &&
          wins.some(([a, z]) => d.frame >= a && d.frame <= z)
      ).length;
      expect(hits.length).toBeGreaterThan(0);
      // every proc lands in FB (the gate), and the count tracks in-FB shots ÷ 50 within one window's rounding
      expect(
        hits.filter((d) => wins.some(([a, z]) => d.frame >= a && d.frame <= z))
          .length
      ).toBe(hits.length);
      expect(
        Math.abs(hits.length - Math.floor(inFbShots / 50))
      ).toBeLessThanOrEqual(fbs);
      expect(hits.every((d) => d.atkPct === 400.92)).toBe(true);
      // the companion self Attack Damage ▲15.03% / 5s buff fires with each proc, on velvet only
      const selfBuffs = velBuffs(base.events, 'attackDamagePct', 15.03);
      expect(selfBuffs.length).toBe(hits.length);
      expect([...new Set(selfBuffs.map((b) => b.targetIdx))]).toEqual([VEL]);
      expect([
        ...new Set(selfBuffs.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });
    // off-B2 mode, and the sharpest test of the count SCOPE. Her SR lands 36 in-FB shots across the
    // fight (7.2 per window), so the kit-literal reading of "landing 50 normal attack(s) DURING
    // Full Burst" — only in-FB attacks count — never reaches 50 and fires ZERO procs.
    // Her trigger carries `countScope:'gated'`, so that is what ships (engine item 6, 2026-08-13).
    // This assertion previously pinned ONE proc: the counter used to accrue over ALL normal
    // attacks and gate only the FIRING, so her 100th overall shot crossed 50 while a Full Burst
    // happened to be live and paid out. That leak is the defect the count scope fixes, and this
    // fixture is where it was visible — the two readings converge when swap shots dominate
    // (55 vs 54 in the sole-B2 fixture) and diverge only at low volume like this.
    it('the kit-literal scope fires ZERO procs — her SR never lands 50 attacks inside Full Burst', () => {
      const inFbShots = velDamage(off.events).filter(
        (d) =>
          d.srcSlot === 'normal' &&
          offWins.some(([a, z]) => d.frame >= a && d.frame <= z)
      ).length;
      expect(inFbShots).toBeLessThan(50);
      const hits = velDamage(off.events).filter(
        (d) => d.srcSlot === 'skill2' && d.atkPct > 100
      );
      expect(hits.length).toBe(0);
      expect(offVelBuffs(off.events, 'attackDamagePct', 15.03).length).toBe(0);
    });
    // DISCRIMINATING: the pre-fix semantics as an explicit counterfactual, so the ZERO above is
    // provably the count SCOPE's doing and not just a quiet fixture.
    it('DISCRIMINATING: cumulative counting (countScope dropped) leaks exactly one proc here', () => {
      const hits = velDamage(procCumulative.events).filter(
        (d) => d.srcSlot === 'skill2' && d.atkPct > 100
      );
      expect(hits.length).toBe(1);
    });
    it('DISCRIMINATING (gate): dropping inFb lets the threshold proc OUT of FB too — the gate suppresses those', () => {
      const hits = procHits(procNoGate.events);
      const ngWins = fbWindows(procNoGate.events);
      const outOfFb = hits.filter(
        (d) => !ngWins.some(([a, z]) => d.frame >= a && d.frame <= z)
      );
      // ungated, her swap windows that never reach Full Burst also pay out — strictly more procs
      expect(outOfFb.length).toBeGreaterThan(0);
      expect(hits.length).toBeGreaterThan(procHits(base.events).length);
    });
    it('DISCRIMINATING (threshold+effect): lowering the count to 5 makes the proc fire IN FB — 400.92 flatDamage + self 15.03 buff', () => {
      const hits = procHits(procCount5.events);
      expect(hits.length).toBeGreaterThan(0);
      // each proc is 400.92% of final ATK (bucket skill), landing inside Full Burst
      expect(hits.every((d) => d.atkPct === 400.92)).toBe(true);
      const c5Wins = fbWindows(procCount5.events);
      expect(
        hits.filter((d) =>
          c5Wins.some(([a, z]) => d.frame >= a && d.frame <= z)
        ).length
      ).toBe(hits.length);
      // the companion self Attack Damage ▲15.03% / 5s buff fires with each proc
      const selfBuffs = velBuffs(procCount5.events, 'attackDamagePct', 15.03);
      expect(selfBuffs.length).toBeGreaterThan(0);
      expect([
        ...new Set(selfBuffs.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });
  });

  describe('V5 — Burst: self weaponSwap (7% / 10s) + Attack Damage ▲34.52% for 10s, on BURST CAST', () => {
    const applied = velBuffs(base.events, 'attackDamagePct', 34.52);
    it('Attack Damage 34.52 is a self buff, once per Velvet cast, 10s (600f), on burstCast (not fullBurstEnter)', () => {
      expect(applied.length).toBe(casts);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([VEL]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });
    it('the weaponSwap REPLACES the SR: swap shots inside the burst window fire at atkPct=7 (vs 69.04 normals)', () => {
      const burstFrames = velBursts(base.events).map((e) => e.frame);
      const inSwap = (f: number) =>
        burstFrames.some((bf) => f >= bf && f <= bf + 10 * FPS);
      const normals = velDamage(base.events).filter(
        (d) => d.srcSlot === 'normal'
      );
      const swapShots = normals.filter(
        (d) => inSwap(d.frame) && d.atkPct === 7
      );
      const baseShots = normals.filter((d) => !inSwap(d.frame));
      expect(swapShots.length).toBeGreaterThan(0); // the swap weapon fires
      expect(baseShots.every((d) => d.atkPct === 69.04)).toBe(true); // her SR normal mult outside the swap
    });
    // OWNER RULING 2026-08-13: the swap weapon is a machine gun with no wind-up — 60 rounds/sec for
    // the full 10s, no ammo and no reload. 600 shots per window, one per frame, no gap anywhere.
    it('the MG fires 600 rounds per 10s window at one per frame, with NO reload gap', () => {
      const swapShots = velDamage(base.events).filter(
        (d) => d.srcSlot === 'normal' && d.atkPct === 7
      );
      expect(swapShots.length).toBe(casts * 600);
      // velvet never reloads: the swap carries its own magazine and hands the SR back full
      expect(
        base.events.filter((e) => e.kind === 'reload' && e.slug === 'velvet')
          .length
      ).toBe(0);
      // no gap inside a window exceeds a single frame (a reload or a charge cycle would show up here)
      const w0 = velBursts(base.events)[0].frame;
      const inW0 = swapShots
        .filter((d) => d.frame >= w0 && d.frame <= w0 + 10 * FPS)
        .map((d) => d.frame);
      expect(inW0.length).toBe(600);
      expect(inW0[0]).toBe(w0); // first round lands on the cast frame — no wind-up
      const maxGap = Math.max(...inW0.slice(1).map((f, i) => f - inW0[i]));
      expect(maxGap).toBe(1);
    });
    it('DISCRIMINATING (economy): without the MG spec the swap inherits her SR charge + 6-round mag (~9 shots, with reloads)', () => {
      const cfShots = velDamage(swapInheritsSr.events).filter(
        (d) => d.srcSlot === 'normal' && d.atkPct === 7
      );
      expect(cfShots.length).toBeLessThan(casts * 20); // ~9/window, not 600
      expect(
        swapInheritsSr.events.filter(
          (e) => e.kind === 'reload' && e.slug === 'velvet'
        ).length
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires on every team FB (fbs), not every Velvet cast (casts)', () => {
      expect(
        velBuffs(burstFbEnter.events, 'attackDamagePct', 34.52).length
      ).toBe(fbs);
      expect(
        velBuffs(burstFbEnter.events, 'attackDamagePct', 34.52).length
      ).not.toBe(casts);
    });
    it('DISCRIMINATING (duration): a 3s window (nearest-wrong) is shorter than the faithful 10s', () => {
      expect([
        ...new Set(
          velBuffs(burstDur3.events, 'attackDamagePct', 34.52).map(
            (b) => b.expiresFrame! - b.frame
          )
        ),
      ]).toEqual([3 * FPS]);
    });
    it('DISCRIMINATING (swap mult): damagePct 70 (nearest-wrong) puts swap shots at atkPct=70, not 7', () => {
      const burstFrames = velBursts(swap70.events).map((e) => e.frame);
      const inSwap = (f: number) =>
        burstFrames.some((bf) => f >= bf && f <= bf + 10 * FPS);
      const swap70Shots = velDamage(swap70.events).filter(
        (d) => d.srcSlot === 'normal' && inSwap(d.frame) && d.atkPct === 70
      );
      expect(swap70Shots.length).toBeGreaterThan(0);
      expect(
        velDamage(swap70.events).filter(
          (d) => d.srcSlot === 'normal' && inSwap(d.frame) && d.atkPct === 7
        ).length
      ).toBe(0);
    });
  });
});
