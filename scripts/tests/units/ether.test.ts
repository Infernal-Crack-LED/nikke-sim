// PER-UNIT KIT SPEC — `ether` (Ether — SG / Defender / Electric / Burst I, cd 40s, ammo 9,
// hitsPerShot 10, reloadFrames 141, normalAttackMultiplier 214.3, burstGaugePerShot 2,
// Missilis, original_rare SR, released 2022-11-04). Kit-autonomy gauntlet 2026-08-05
// (test-first re-derivation). ⚠ EXACT SLUG: `ether` — the base Missilis SG Defender;
// NOT a variant (no other unit carries her name — the slug-disambiguation lint passes clean).
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/ether.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (jackal/novel precedent).
//
// Kit (blablalink prose, data/characters.json → characters.ether.skills, lvl 10):
//   S1 "Corrosive Bullets" (cd 15s)
//      ■ 1 ally, lowest remaining HP:
//        Damage Taken ▼52.5% for 5 sec                                       [UNMODELED — E3]
//   S2 "Prognostic Response Experiment" (cd 13s)
//      ■ 3 enemies with the highest final DEF (NO activation clause):
//        Deals 56.32% of final ATK as damage                                  [FAITHFUL — E1]
//      ■ same enemies. Activates during Full Burst:
//        DEF ▼9.38% for 6 sec                                                [MODELED — E4]
//   BU "Colossal Single Cell" (B1, cd 40s)
//      ■ 3 allies, lowest remaining HP:
//        Shield = 96% of the skill user's final Max HP for 5 sec              [FAITHFUL — E2]
//
// ETHER IS A TANK/SHIELDER; HER KIT IS MOSTLY OUT-OF-DOMAIN FOR A DAMAGE SIM. Two of the
// four kit lines are modeled; the other two are documented omissions:
//
//   • E1 (S2a) is her ONLY damage line: a 56.32%-of-final-ATK skill hit on a 13s auto-cast.
//     TRIGGER IDENTITY = interval:13. The damage block's ■ header carries NO activation
//     clause and the datamined skillCooldownsSec.skill2 = 13 — the CD-bearing auto-cast
//     shape the schema's interval guidance exists for ('kit lines that "just happen" on an
//     internal cooldown with no visible activation clause'; novel's interval:10 precedent).
//     Two structural facts settle it against a fullBurstEnter (whole-slot) reading:
//       (a) PROSE CONVENTION — an activation clause attaches to the ■ block whose header
//           carries it. ada's S2 heads its FB-keyed block with 'Activates during Full Burst'
//           (shipped fullBurstEnter) and kurumi's likewise; ether's FB clause sits in the
//           SECOND block's header ('■ Affects the same enemy unit(s). Activates during Full
//           Burst.'), governing the DEF▼ line alone.
//       (b) THE DATAMINED CD — ada/kurumi, whose skill2s ARE purely FB-keyed, have CD null.
//           An FB cycle is >=20s, so ether's 13s CD is meaningful ONLY on a CD-driven
//           activation path. (The driver's initial fullBurstEnter derivation was overturned
//           by these facts + the convergent cross-family blind re-derivations — S2b fable-5,
//           S5/S6 opus-5 all independently read interval.)
//     First-fire phase t=13 (vs t=0) is the engine interval convention (⚑ in the override;
//     neve/snow-white/novel precedent). The '3 enemies with the highest final DEF' targeting
//     clause collapses to the single scope-lock boss ({kind:'enemy'} documented stand-in —
//     v1 fields one immortal enemy; novel precedent); it is a multi-target SPREAD, NOT a ×3
//     hit multiplier (pinned by the two-point magnitude probe). Bare flatDamage rider
//     defaults: crit-eligible, no core, skill bucket, FB-major by landing timing (the
//     interval activations land both in and out of the FB window — both states pinned).
//   • E2 (burst) is a shield event + window: no shield HP pool is modeled (v1 boss deals no
//     damage), exactly like snow-crane's FB shield — the encoded substance is the SHIELDED
//     event + each target's shield-state window (shieldedUntilFrame), which fire teammates'
//     'shielded' triggers / requiresShielded gates. maxHpPct 96 is %-of-CASTER final Max HP
//     (the schema's documented reading of 'of the skill user's final Max HP'). Target is
//     alliesLowestHp count:3 — v1 has no HP pool, so 'lowest remaining HP' resolves to the
//     leftmost-3 documented stand-in (types.ts TargetDef comment; ⚑ in the override).
//     Trigger identity is burstCast (HER cast — she is Burst I, so the cast opens the chain
//     and the shield is up ~1-2s later when Full Burst begins; a fullBurstEnter keying would
//     over-cover rotations led by ANOTHER Burst I — pinned in fixture B).
//   • E3 (S1) is ally-side damage mitigation — out-of-domain: v1 models no ally HP pool and
//     no incoming boss damage, so it can never move anything (sakura-suzuhara S2 is the
//     identical kit line and the binding precedent). The boss-facing damageTakenPct channel
//     is the WRONG direction AND target — encoding it there (as +52.5 or −52.5) would
//     manufacture a phantom team damage change on S1's 15s cadence, so it is NOT used; the
//     nearest-wrong +52.5 amp counterfactual is pinned RED below.
//   • E4 (S2b) is an enemy DEF reduction — the engine has no dynamic enemy-DEF-reduction
//     primitive (applyBuff ignores enemy ATK▼/DEF▼; cfg.bossDef is a fixed per-hit
//     subtraction; damageTakenPct is a separate bucket — novel/mast Sea-Breeze precedent).
//     At the 140-DEF scope-lock boss this is 9.38% × 140 ≈ 13.1 flat DEF ≈ ~0.03% team
//     damage — minor, not load-bearing. The nearest-wrong damageTakenPct +9.38 misread is
//     pinned RED below (it would lift team totals on every FB entry).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   E1  the rider fires 13× per 180s battle, on the 13s interval frames (t = 13k), at 56.32
//       (the lvl-1 24.64 is wrong), bucket 'skill', srcSlot 'skill2', with FB-major applied
//       exactly to the instances landing inside an FB window. A fullBurstEnter keying fires
//       only on FB-start frames (~4× — it loses every out-of-FB CD activation and makes the
//       13s CD meaningless); a burstCast keying lands on her cast frames; a two-point
//       magnitude probe recovers the shipped percentage outright, refuting the ×3 fold.
//   E2  shape pin (burstCast / alliesLowestHp:3 / shield 96%/5s) + inertia pin (removal is
//       byte-identical: a shield moves no damage in v1) + BEHAVIORAL trigger/scope pins via
//       asuka's requiresShielded FB-enter probe (fixtures B/C): burstCast keying shields only
//       the FBs ether cast INTO (gate-passes == her cast count, strictly fewer than the FB
//       count under a second Burst I); fullBurstEnter keying shields every FB (gate-passes ==
//       FB count). Scope: count:3 leaves a slot-4 asuka UNSHIELDED (0 gate passes) where an
//       all-allies encoding shields her (gate-passes == ether's cast count).
//   E3  zero buffs originate from ether at baseline; the +52.5 boss-channel misread applies
//       the debuff on a 15s cadence and lifts team totals — the shipped zero is a choice.
//   E4  zero boss debuffs are applied at baseline; the +9.38 damageTakenPct misread applies
//       per FB entry and lifts team totals — the shipped zero is a choice.
//
// FIXTURES. Deterministic (no seed); event-log over totals (totals only in the
// damage-movement arms). Boss Fire in all three (Electric vs Fire is neutral).
//   A (MAIN): [ether, crown, ada, helm], focus ether. One caster per burst stage; ether is
//      the SOLE B1 (40s CD — the chain waits for her, so Full Bursts run every ~40s and she
//      casts every one of them; alice-wonderland-bunny/sakura-suzuhara precedent for the
//      40s-solo-B1 cadence). The interval rider is comp-independent (battle-time keyed), so
//      its cadence pins hold on any fixture.
//   B (shield TRIGGER identity): [ether, liter, asuka, admi, ada]. Two Burst Is — ether
//      (40s, slot 0) alternates with liter (20s, slot 1), so the comp makes ~2× more Full
//      Bursts than ether casts (emma's double-B1 precedent). asuka sits INSIDE the leftmost-3
//      shield scope (slot 2): her S2-1 is an FB-enter self elemAdvantageDamagePct-30.02 with
//      requiresShielded, so counting those buffApply events reads the shield state at every
//      FB entry (snow-crane's M3 probe). admi is the recovery-silent, shield-less B2; ada
//      alternates B3 with asuka. liter/admi/ada/helm carry NO shield effects (crown — the
//      only fixture regular with one — is deliberately excluded).
//   C (shield SCOPE): [ether, liter, admi, ada, asuka] — same chain support, but asuka is
//      slot 4, OUTSIDE the leftmost-3: never shielded at baseline (0 gate passes), shielded
//      by the all-allies counterfactual.
// SR CEILING NOTE: ether is original_rare SR, but the fixture runs her on the plain
// scope-lock basis (copies:10 ⇒ 3★/core 7) — the sakura-suzuhara precedent (SR, gauntlet
// 2026-08-04, no unitLimits). Her assertions are event-structural, not magnitude ratios,
// so the SSR-ceiling stats move no verdict.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'ether';
/** datamined skillCooldownsSec.skill2 — the interval period. */
const S2_CD_SEC = 13;
const S2_FIRES_180S = Math.floor(180 / S2_CD_SEC); // 13 fires: t = 13, 26, …, 169

/** Fixture A slot order: ether 0 / crown 1 / ada 2 / helm 3. */
const SLUGS_A = [SLUG, 'crown', 'ada', 'helm'] as const;
const ETHER_A = 0;
/** Fixture B slot order: ether 0 / liter 1 / asuka 2 / admi 3 / ada 4. */
const SLUGS_B = [SLUG, 'liter', 'asuka', 'admi', 'ada'] as const;
const ASUKA_B = 2;
/** Fixture C slot order: ether 0 / liter 1 / admi 2 / ada 3 / asuka 4. */
const SLUGS_C = [SLUG, 'liter', 'admi', 'ada', 'asuka'] as const;
const ASUKA_C = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

function runA(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS_A],
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
function runProbe(
  slugs: readonly string[],
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [...slugs],
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

const sum = (t: Record<string, number>, slugs: readonly string[]) =>
  slugs.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** E1 nearest-wrong trigger: fullBurstEnter (the whole-slot FB reading — fires only on
 *  FB-start frames, losing every out-of-FB CD activation; the 13s CD becomes meaningless). */
const e1OnFbEnter = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].trigger = { kind: 'fullBurstEnter' };
});
/** E1 wrong trigger: burstCast (her own cast frames) instead of the interval auto-cast. */
const e1OnBurstCast = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].trigger = { kind: 'burstCast' };
});
/** E1 wrong magnitude: the lvl-1 value 24.64 instead of the lvl-10 56.32. */
const e1Weak = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].effects[0].atkPct = 24.64;
});
/** E1 ×3 fold misread: the '3 enemy unit(s)' header counted as a hit MULTIPLIER on the
 *  single boss (168.96 per activation instead of one 56.32 instance). */
const e1TripleFold = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].effects[0].atkPct = 56.32 * 3;
});
/** E1 reference: the rider removed entirely (her own skill-damage contribution). */
const e1Removed = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('ether skill2 rider missing — fixture is stale');
  }
});
/** E3 nearest-wrong: the S1 ally mitigation mis-encoded on the boss-facing damageTakenPct
 *  channel (+52.5 = boss takes MORE — a phantom team amp on S1's 15s cadence). */
const e3BossChannel = withPatchedOverride(SLUG, (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'interval', sec: 15 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 52.5, durationSec: 5 },
    ],
  });
});
/** E4 nearest-wrong: the S2b enemy DEF▼ mis-encoded as the boss-facing damageTakenPct debuff
 *  (+9.38 per Full Burst entry). */
const e4BossChannel = withPatchedOverride(SLUG, (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'fullBurstEnter' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 9.38, durationSec: 6 },
    ],
  });
});
/** E2 reference: the shield block removed entirely (inertia proof — a shield moves no damage
 *  in v1). */
const e2Removed = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = [];
  if (before === 0) {
    throw new Error('ether burst shield block missing — fixture is stale');
  }
});
/** E2 wrong trigger: fullBurstEnter (lands at every chain completion, including FBs led by
 *  another Burst I) instead of burstCast (HER cast only). */
const e2OnFbEnter = withPatchedOverride(SLUG, (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
/** E2 wrong scope: all allies instead of the 3 allies with the lowest remaining HP. */
const e2AllAllies = withPatchedOverride(SLUG, (ov) => {
  ov.burst[0].target = { kind: 'allies' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const baseA = runA();
const a1OnFbEnter = runA({ [SLUG]: e1OnFbEnter });
const a1OnBurstCast = runA({ [SLUG]: e1OnBurstCast });
const a1Weak = runA({ [SLUG]: e1Weak });
const a1Triple = runA({ [SLUG]: e1TripleFold });
const a1Removed = runA({ [SLUG]: e1Removed });
const a3BossChannel = runA({ [SLUG]: e3BossChannel });
const a4BossChannel = runA({ [SLUG]: e4BossChannel });
const a2Removed = runA({ [SLUG]: e2Removed });

const baseB = runProbe(SLUGS_B);
const bFbEnter = runProbe(SLUGS_B, { [SLUG]: e2OnFbEnter });

const baseC = runProbe(SLUGS_C);
const cAllAllies = runProbe(SLUGS_C, { [SLUG]: e2AllAllies });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const damages = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const fbCount = (evs: SimEvent[]) => fbStartFrames(evs).length;
const etherCasts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === SLUG);
/** the S2a rider's damage instances. */
const rider = (evs: SimEvent[]) =>
  damages(evs).filter((d) => d.slug === SLUG && d.srcSlot === 'skill2');
/** buffs originating from ether (any holder, including the boss = targetIdx null). */
const etherBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === ETHER_A);
/** asuka's shield-gate passes = her FB-enter elemAdvantageDamagePct-30.02 buff applications
 *  (snow-crane's M3 reader). */
const shieldGatePasses = (evs: SimEvent[], asuka: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === asuka &&
      b.stat === 'elemAdvantageDamagePct' &&
      b.value === 30.02
  ).length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride(SLUG) as any;

describe('ether — kit spec', () => {
  describe('E0 — fixture sanity: the B1 chain actually runs', () => {
    it('ether is the sole B1 and casts every Full Burst (>= 3 casts / 180s)', () => {
      expect(etherCasts(baseA.events).length).toBeGreaterThanOrEqual(3);
      expect(etherCasts(baseA.events).length).toBe(fbCount(baseA.events));
    });
    it('her SG weapon deals damage', () => {
      expect(baseA.totals.ether).toBeGreaterThan(0);
    });
  });

  describe('E1 — S2a: 56.32% final ATK skill hit on the 13s auto-cast (interval)', () => {
    it('fires on the 13s interval frames (t = 13k), once per activation', () => {
      const hits = rider(baseA.events);
      expect(hits.length).toBe(S2_FIRES_180S); // 13 fires in 180s
      const frames = [...new Set(hits.map((h) => h.frame))];
      expect(frames.length).toBe(hits.length); // one instance per activation, NOT a ×3 fold
      expect(frames).toEqual(
        Array.from(
          { length: S2_FIRES_180S },
          (_, i) => (i + 1) * S2_CD_SEC * FPS
        )
      );
    });
    it('the cadence is the datamined CD, decoupled from the FB count and her shot count', () => {
      expect(rider(baseA.events).length).not.toBe(fbCount(baseA.events));
      // interval (13) vs FB cycle (~40s sole-B1): strictly more rider fires than FBs.
      expect(rider(baseA.events).length).toBeGreaterThan(fbCount(baseA.events));
    });
    it('carries the lvl-10 magnitude in the skill bucket (not the lvl-1 24.64)', () => {
      const hits = rider(baseA.events);
      expect([...new Set(hits.map((h) => h.atkPct))]).toEqual([56.32]);
      expect([...new Set(hits.map((h) => h.bucket))]).toEqual(['skill']);
      expect(
        [...new Set(rider(a1Weak.events).map((h) => h.atkPct))],
        'the lvl-1 counterfactual must change the magnitude'
      ).toEqual([24.64]);
    });
    it('FB-major by landing timing: in-FB instances take the +50%, out-of-FB do not', () => {
      // The 13s interval lands both inside and outside the ~10s FB windows — both states
      // must exist (a fullBurstEnter keying would have ZERO out-of-FB instances).
      const hits = rider(baseA.events);
      const inFb = hits.filter((h) => h.inFullBurst);
      const outFb = hits.filter((h) => !h.inFullBurst);
      expect(inFb.length).toBeGreaterThan(0);
      expect(outFb.length).toBeGreaterThan(0);
      expect([...new Set(inFb.map((h) => h.fbMajorApplied))]).toEqual([true]);
      expect([...new Set(outFb.map((h) => h.fbMajorApplied))]).toEqual([false]);
    });
    it('DISCRIMINATING: fullBurstEnter keying fires only on FB-start frames (~4×, not 13×)', () => {
      const hits = rider(a1OnFbEnter.events);
      const starts = new Set(fbStartFrames(a1OnFbEnter.events));
      expect(hits.length).toBe(fbCount(a1OnFbEnter.events));
      expect(hits.length).not.toBe(S2_FIRES_180S);
      expect(hits.every((h) => starts.has(h.frame))).toBe(true);
    });
    it('DISCRIMINATING: burstCast keying lands on the cast frames, not the interval frames', () => {
      const castFrames = new Set(
        etherCasts(a1OnBurstCast.events).map((c) => c.frame)
      );
      const hits = rider(a1OnBurstCast.events);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.length).not.toBe(S2_FIRES_180S);
      for (const h of hits) {
        expect(castFrames.has(h.frame)).toBe(true);
      }
    });
    it('DISCRIMINATING: the ×3 fold moves her total by exactly the extra 2×56.32 instances', () => {
      // Same instance COUNT as shipped (the fold is a per-instance magnitude misread here),
      // so the totals differ while the rotation stays byte-identical.
      expect(rider(a1Triple.events).length).toBe(rider(baseA.events).length);
      expect(a1Triple.totals.ether).toBeGreaterThan(baseA.totals.ether);
    });
    it("is load-bearing: removing the rider drops ether's own damage", () => {
      expect(a1Removed.totals.ether).toBeLessThan(baseA.totals.ether);
    });
  });

  describe('E2 — burst: shield (96% caster final Max HP, 5s) on the 3 lowest-HP allies, own cast', () => {
    it('shape pin: burstCast → alliesLowestHp count:3 → shield maxHpPct 96 / durationSec 5', () => {
      const blocks = shipped.burst;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].trigger).toEqual({ kind: 'burstCast' });
      expect(blocks[0].target).toEqual({ kind: 'alliesLowestHp', count: 3 });
      expect(blocks[0].effects).toEqual([
        { kind: 'shield', maxHpPct: 96, durationSec: 5 },
      ]);
    });
    it('is damage-INERT in v1: removal leaves EVERY unit byte-identical', () => {
      for (const s of SLUGS_A) {
        expect(
          a2Removed.totals[s],
          `${s} total with the shield removed`
        ).toEqual(baseA.totals[s]);
      }
    });
    it('TRIGGER identity (fixture B): shields only the FBs ether cast INTO, not every FB', () => {
      const casts = etherCasts(baseB).length;
      const fbs = fbCount(baseB);
      // The double-B1 comp makes strictly more Full Bursts than ether casts (liter takes the rest).
      expect(casts).toBeGreaterThanOrEqual(2);
      expect(casts).toBeLessThan(fbs);
      // burstCast keying: asuka (slot 2, inside the leftmost-3 scope) is shielded exactly at
      // the FBs ether cast into — the 5s window from her stage-1 cast still covers FB entry.
      expect(shieldGatePasses(baseB, ASUKA_B)).toBe(casts);
      // fullBurstEnter keying shields EVERY chain completion — over-credit by exactly liter's rotations.
      expect(shieldGatePasses(bFbEnter, ASUKA_B)).toBe(fbs);
    });
    it('SCOPE (fixture C): count:3 leaves a slot-4 ally unshielded; all-allies would shield her', () => {
      expect(etherCasts(baseC).length).toBeGreaterThanOrEqual(2);
      expect(shieldGatePasses(baseC, ASUKA_C)).toBe(0);
      expect(shieldGatePasses(cAllAllies, ASUKA_C)).toBe(
        etherCasts(baseC).length
      );
    });
  });

  describe('E3 — S1 (1 lowest-HP ally: Damage Taken ▼52.5%/5s) is genuinely unmodeled', () => {
    it('ether originates ZERO buffs at baseline — no phantom boss channel', () => {
      expect(etherBuffs(baseA.events)).toHaveLength(0);
      // Boss-held debuffs carry casterIdx null (the enemy-branch applyBuff passes no caster —
      // sakura-suzuhara precedent), so the channel read is stat-keyed: no damageTakenPct anywhere.
      expect(
        buffs(baseA.events).filter((b) => b.stat === 'damageTakenPct')
      ).toHaveLength(0);
    });
    it('the omission is a choice: the boss-channel misread applies the debuff and lifts team totals', () => {
      const applied = buffs(a3BossChannel.events).filter(
        (b) =>
          b.targetIdx === null &&
          b.stat === 'damageTakenPct' &&
          b.value === 52.5
      );
      expect(applied.length).toBeGreaterThan(0);
      expect(sum(a3BossChannel.totals, SLUGS_A)).toBeGreaterThan(
        sum(baseA.totals, SLUGS_A)
      );
    });
  });

  describe('E4 — S2b DEF ▼9.38%/6s rides the interval clock gated inFb, on the enemy defPct channel (encoded 2026-08-10)', () => {
    it('no boss damageTakenPct is applied at baseline (the laundering trap stays pinned absent)', () => {
      expect(
        buffs(baseA.events).filter(
          (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
        )
      ).toHaveLength(0);
    });

    it('shave frames are exactly the IN-FB S2a activation frames (the fbGate bites), 6s window', () => {
      // channel damage math owned by scripts/tests/engine/enemy-def-debuff.test.ts
      // (reuse-before-derive) — this pins only her magnitude, gate, cadence, and window.
      const shaves = buffs(baseA.events).filter(
        (b) => b.targetIdx === null && b.stat === 'defPct' && b.value === -9.38
      );
      const inFbFrames = rider(baseA.events)
        .filter((h) => h.inFullBurst)
        .map((h) => h.frame);
      const allFrames = rider(baseA.events).map((h) => h.frame);
      expect(shaves.map((b) => b.frame)).toEqual(inFbFrames);
      expect(shaves.length).toBeGreaterThan(0);
      expect(shaves.length).toBeLessThan(allFrames.length); // proper subset — the gate bites
      for (const b of shaves) {
        expect(b.key.startsWith(`${ETHER_A}:skill2:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(6 * 60);
      }
    });

    it('the omission is a choice: the damageTakenPct misread applies per FB entry and lifts team totals', () => {
      const applied = buffs(a4BossChannel.events).filter(
        (b) =>
          b.targetIdx === null &&
          b.stat === 'damageTakenPct' &&
          b.value === 9.38
      );
      expect(applied.length).toBeGreaterThan(0);
      expect(sum(a4BossChannel.totals, SLUGS_A)).toBeGreaterThan(
        sum(baseA.totals, SLUGS_A)
      );
    });
  });

  describe('E5 — static pins: unmodeled lines verbatim, no silent drops', () => {
    it('skill1 is entirely unmodeled (the only S1 line is ally mitigation)', () => {
      expect(shipped.skill1).toEqual([]);
      expect(shipped.unmodeled.skill1).toEqual([
        '■ Affects 1 allies with the lowest remaining HP. \nDamage Taken ▼ 52.5% for 5 sec.',
      ]);
    });
    it('the S2b DEF▼ line is encoded (unmodeled.skill2 empty)', () => {
      expect(shipped.unmodeled.skill2).toEqual([]);
      expect(shipped.unmodeled.burst).toEqual([]);
    });
    it('skill2 is the interval:13 damage block + the inFb-gated defPct sibling (kit order)', () => {
      expect(shipped.skill2).toHaveLength(2);
      expect(shipped.skill2[0].trigger).toEqual({ kind: 'interval', sec: 13 });
      expect(shipped.skill2[0].effects).toEqual([
        { kind: 'flatDamage', atkPct: 56.32 },
      ]);
      expect(shipped.skill2[1].trigger).toEqual({ kind: 'interval', sec: 13 });
      expect(shipped.skill2[1].fbGate).toBe('inFb');
      expect(shipped.skill2[1].effects).toEqual([
        { kind: 'buff', stat: 'defPct', value: -9.38, durationSec: 6 },
      ]);
    });
    it('no ignored blocks anywhere', () => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const b of shipped[slot] ?? []) {
          for (const e of b.effects ?? []) {
            expect(e.kind).not.toBe('ignored');
          }
        }
      }
    });
  });
});
