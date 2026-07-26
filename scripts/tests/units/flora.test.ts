// PER-UNIT KIT SPEC — `flora` (Flora, MG / Supporter / Electric / Burst II, cd 40s, ammo 300).
// Kit-autonomy gauntlet 2026-07-26 (Tier 2). Test-first re-derivation; the override under test is
// src/skills/overrides/flora.json (authored this gauntlet — Flora had no prior override).
//
// Flora is a healer-buffer: her OWN MG damage is minor and her value is TEAM-WIDE. Her kit splits
// into a faithfully-modelable CORE (her BURST team buffs + her S1 HoT) and an HP-gated S2 that the
// v1 sim cannot represent (no HP pool — the boss deals no damage, so no ally ever drops below 100%
// HP and the S2 triggers never fire). The modelable lines are pinned below; the HP-gated / no-
// primitive lines are documented in the override's `unmodeled` + `caveats` (engine-core flags), NOT
// asserted here (there is nothing to assert against in a no-HP-pool sim — same precedent as liter's
// cover-HP NO-OP and the alliesLowestHp stand-in).
//
// Kit (blablalink prose, data/characters.json → characters.flora.skills; magnitudes = max level):
//   S1 ■ battle-start, self + both adjacent allies:
//        Peace of Mind — Restores HP = 1% of caster final Max HP every 1s continuously      [F4] (recovery cadence)
//        Incoming Healing ▲ 4% continuously, stacks 5x                                      [UNMODELED — no stat / no HP pool]
//      ■ after 100 normal attacks, all Electric allies: +1 stack to stackable buffs         [UNMODELED — no stack primitive ⚑ engine-core]
//      ■ entering Burst Stage 2, Peace-of-Mind allies: Max HP ▲ 15.01% of caster 2s         [UNMODELED — inert + target gate]
//   S2 ■ adjacent ally HP <= 90%: shield 10.22% caster final Max HP 10s (all allies)        [UNMODELED — HP threshold ⚑ engine-core]
//      ■ adjacent ally reaches max HP: True Damage ▲ 30.97% 10s (all allies)               [UNMODELED — HP transition ⚑ engine-core]
//      ■ shield placed in front of self: Peace-of-Mind allies ATK ▲ 45.12% of caster 10s    [UNMODELED — shield chain dead ⚑ engine-core]
//   BU ■ all allies: Restores HP = 10.45% of caster final Max HP                            [F3] (recovery event)
//      ■ all allies: True Damage ▲ 42.39% for 10 sec                                        [F2] (flavor-gated)
//      ■ all allies: ATK ▲ 85.86% of the skill user's ATK for 10 sec                        [F1] (caster-scaled, load-bearing)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   F1  casterAtkPct (85.86% of FLORA's ATK, resolved to a FLAT add identical for every ally) vs a
//       generic atkPct (85.86% of each target's OWN ATK). Proven two ways: the shipped buffApply
//       value is the flat resolution (0.8586 × Flora.staticAtk, a large number, identical across all
//       four targets), AND swapping the stat to atkPct MOVES the carry's total (Flora's ATK ≠ the
//       carry's, so the two scalings cannot coincide). Removing the buff entirely drops the carry.
//   F2  trueDamagePct is FLAVOR-GATED (sim.ts:1430): it benefits ONLY true-flavored damage. Proven
//       by contrast — removing it moves ada (true-flavored Flash Grenade dot) but leaves liter,
//       crown and flora BYTE-IDENTICAL (none deal true damage). An unscoped Damage-Up buff would
//       move every unit; the byte-identity of the three non-true units is the discriminator.
//   F3  the burst heal is a RECOVERY EVENT, not a number: with crown's own self-heal and Flora's
//       HoT both removed, crown's "when recovery takes effect" consumer fires exactly once per
//       Flora burst cast, aligned to the burst-cast frames — a cadence no other source produces.
//   F4  the S1 HoT keeps recovery consumers refreshed at ~1s cadence: with crown's self-heal
//       removed, crown's consumer fires on ~every second of the fight; removing the HoT collapses
//       that to the burst-heal-only count (the F3 cadence), isolating the HoT's contribution.
//
// Fixture: liter (B1) / flora (B2) / crown (B2) / ada (B3), boss Fire, focus ada. crown is the
// canonical recovery consumer (crown.test.ts / helm.test.ts pattern) and sits adjacent to flora
// (slot 2 ↔ slot 1) so Flora's selfAndAdjacent HoT reaches her; ada is the true-damage carry (her
// S2 Flash Grenade dot is flavor:'true') that makes the F2 flavor gate observable. The two B2s
// (flora/crown, both cd40) alternate casts deterministically — Flora casts 5 bursts in 180s.
// Deterministic (no seed); assertions read the event log + per-unit totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'flora', 'crown', 'ada'] as const;
const LITER = 0;
const FLORA = 1;
const CROWN = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

// Flora's burst is ONE block carrying three effects (heal + trueDamagePct + casterAtkPct), so the
// per-line counterfactuals strip the single named EFFECT from within the block — filtering whole
// blocks would take the other two effects down with it and pollute the isolation.
const stripBurstEffect = (slug: string, stat: string) =>
  withPatchedOverride(slug, (ov) => {
    for (const b of ov.burst) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.stat !== stat);
      if (b.effects.length !== before) return;
    }
    throw new Error(`flora burst ${stat} effect missing — fixture is stale`);
  });
/** F1 reference: Flora's burst ATK line removed (heal + trueDamagePct kept). */
const floraNoBurstAtk = stripBurstEffect('flora', 'casterAtkPct');
/** F1 counterfactual: the same line as a GENERIC (target-own-ATK) atkPct buff. */
const floraBurstAtkSelf = withPatchedOverride('flora', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error(
      'flora burst casterAtkPct effect missing — fixture is stale',
    );
  e.stat = 'atkPct';
});
/** F2 reference: Flora's burst True Damage line removed (heal + casterAtkPct kept). */
const floraNoBurstTrueDmg = stripBurstEffect('flora', 'trueDamagePct');
/** F4 isolation: remove crown's OWN Relax self-heal so Flora is the only recovery source. */
const crownNoSelfHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before)
    throw new Error('crown S2 self-heal block missing — fixture is stale');
});
/** F3 isolation: also remove Flora's S1 HoT, leaving ONLY the burst heal as a recovery source. */
const floraNoHoT = withPatchedOverride('flora', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before)
    throw new Error('flora S1 HoT block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noBurstAtk = run({ flora: floraNoBurstAtk });
const burstAtkSelf = run({ flora: floraBurstAtkSelf });
const noBurstTrueDmg = run({ flora: floraNoBurstTrueDmg });
const isoHoT = run({ crown: crownNoSelfHeal });
const isoBurstHeal = run({ crown: crownNoSelfHeal, flora: floraNoHoT });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const floraBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'flora',
  );
/** Frames crown's recovery consumer fired (+20.99% Attack Damage), deduped per frame. */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            Math.abs(b.value - 20.99) < 0.01,
        )
        .map((b) => b.frame),
    ),
  ].sort((a, b) => a - b);

describe('flora — kit spec', () => {
  describe("F1 — burst ATK ▲ 85.86% of FLORA's ATK (caster-scaled flat add) to all allies, 10s", () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === FLORA && b.stat === 'casterAtkPct',
    );
    const floraStaticAtk = unitOf(base.res, 'flora').staticAtk;

    it("is the flat resolution of 85.86% of Flora's static ATK, identical for every ally", () => {
      expect(
        applied.length,
        'no burst casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      const expected = (85.86 / 100) * floraStaticAtk;
      for (const b of applied) expect(b.value).toBeCloseTo(expected, 3);
      // Caster-scaled => the SAME flat add lands on every target (not % of each target's own ATK).
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        LITER,
        FLORA,
        CROWN,
        3,
      ]);
      expect(
        new Set(applied.map((b) => b.value)).size,
        'flat add must be identical across targets',
      ).toBe(1);
    });

    it('reaches all four allies for exactly 10 sec per burst cast', () => {
      expect(applied.length).toBe(floraBursts(base.events).length * 4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a generic atkPct (target-own-ATK) moves the carry differently', () => {
      // Flora's ATK ≠ ada's, so caster-scaled flat add ≠ 85.86% of ada's own ATK.
      expect(base.totals.ada).not.toBeCloseTo(burstAtkSelf.totals.ada, 0);
    });

    it('removing the buff drops the carry (the buff is live, not inert)', () => {
      expect(base.totals.ada).toBeGreaterThan(noBurstAtk.totals.ada);
    });
  });

  describe('F2 — burst True Damage ▲ 42.39% to all allies, 10s, FLAVOR-GATED to true damage', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === FLORA && b.stat === 'trueDamagePct',
    );

    it('is 42.39% for 10 sec, reaching all four allies per burst cast', () => {
      expect(applied.length).toBe(floraBursts(base.events).length * 4);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([42.39]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('moves ada (true-flavored grenades) when removed', () => {
      expect(base.totals.ada).not.toBeCloseTo(noBurstTrueDmg.totals.ada, 0);
    });

    it('DISCRIMINATING: leaves every non-true-damage unit BYTE-IDENTICAL (the flavor gate)', () => {
      // liter / crown / flora deal no true damage, so an inert trueDamagePct must not move them.
      expect(base.totals.liter).toBe(noBurstTrueDmg.totals.liter);
      expect(base.totals.crown).toBe(noBurstTrueDmg.totals.crown);
      expect(base.totals.flora).toBe(noBurstTrueDmg.totals.flora);
    });
  });

  describe("F3 — burst heal emits a recovery event to all allies (drives crown's consumer)", () => {
    // Isolated: crown's own self-heal AND Flora's HoT removed, so the burst heal is the ONLY
    // recovery source. Crown's +20.99% consumer must fire exactly once per Flora burst cast.
    const bursts = floraBursts(isoBurstHeal.events);
    const frames = crownRecoveryFrames(isoBurstHeal.events);

    it('has Flora bursts to measure', () => {
      expect(bursts.length).toBeGreaterThan(0);
    });

    it("fires crown's recovery consumer once per Flora burst, aligned to the cast frames", () => {
      const burstFrames = bursts.map((b) => b.frame);
      expect(
        frames.length,
        `${frames.length} recovery firings vs ${burstFrames.length} Flora bursts`,
      ).toBe(burstFrames.length);
      for (const f of burstFrames) {
        expect(
          frames,
          `no recovery firing at Flora burst frame ${f}`,
        ).toContain(f);
      }
    });
  });

  describe('F4 — S1 Peace-of-Mind HoT keeps recovery consumers refreshed at ~1s cadence', () => {
    // Isolated: crown's self-heal removed, Flora's HoT live. Crown is adjacent to Flora (slot 2 ↔
    // slot 1) so the selfAndAdjacent HoT reaches her every second.
    const FIGHT_SEC = 180;
    const hotFrames = crownRecoveryFrames(isoHoT.events).length;
    const burstOnlyFrames = crownRecoveryFrames(isoBurstHeal.events).length;

    it("fires crown's consumer on ~every second of the fight (near-permanent)", () => {
      expect(
        hotFrames,
        `${hotFrames} distinct recovery frames over ${FIGHT_SEC}s — a 1s HoT yields ~${FIGHT_SEC}`,
      ).toBeGreaterThanOrEqual(Math.floor(FIGHT_SEC * 0.8));
    });

    it('DISCRIMINATING: removing the HoT collapses the cadence to burst-heal-only', () => {
      expect(hotFrames).toBeGreaterThan(burstOnlyFrames * 3);
    });
  });
});
