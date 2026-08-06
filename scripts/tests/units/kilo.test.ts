// PER-UNIT KIT SPEC — `kilo` (Kilo, Defender/MG/Fire, Burst III, cd 40s, ammo 300,
// hitsPerShot 1, rl3 3.55). Kit-autonomy gauntlet 2026-08-05.
// BASE UNIT — first modeling (no prior override; baseline was bare weapon, simSupported:false).
// SSR rarity (meta.original_rare SSR) → plain scope-lock ceiling, no unitLimits.
//
// One assertion group per KIT LINE (K1..K9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.kilo.skills):
//   S1 ■ at the start of battle → self: Nano Coating, a Shield equal to 21.12% of the skill
//        user's FINAL Max HP, continuously                                            [K1/K2]
//      ■ when using Burst Skill, if NOT in Nano Coating status → self: re-create the
//        same 21.12% shield                                                          [K3 — UNMODELED]
//   S2 ■ after 200 normal attacks while in Nano Coating status → self: Restores Shield HP
//        equal to 2.85% of final Max HP                                              [K4/K5 — UNMODELED]
//      ■ when using Burst Skill while NOT in Nano Coating status → self: escalating by
//        uses, Next Shield's HP ▲ 17.75% / 26.66% / 35.53% continuously              [K6 — UNMODELED]
//   BU ■ in Nano Coating status → all enemies: 1150.84% of the ATK "which is calculated
//        from 5% of final Max HP"                                                    [K7/K8]
//      ■ NOT in Nano Coating status → self: Max HP ▲ 48% for 20 sec                 [K9 — UNMODELED]
//
// THE SCOPE-DEAD REASONING (drives every UNMODELED disposition): Nano Coating is granted at
// battle start with NO duration ("continuously") and the v1 sim models no incoming boss damage,
// so NOTHING ever breaks the shield — sim.ts's own shield comment: "durationSec-less shields are
// permanent at scope". Kilo is therefore coated for the entire fight, which makes every
// "while NOT in Nano Coating status" branch (K3, K6, K9) unreachable at scope, and leaves the
// "in Nano Coating" burst branch (K7/K8) as the only burst behaviour. The uncoated branches are
// recorded VERBATIM in unmodeled rather than encoded behind a negated shield gate — the engine
// has no negated `requiresShielded` primitive, and encoding them ungated would fire them every
// burst (unfaithful over-firing).
//
// Dispositions:
//   K2  FAITHFUL (event-level) — shield {maxHpPct: 21.12} to self, passive trigger (battle
//       start), no durationSec ("continuously"). The shield effect is event-silent by engine
//       design (no HP pool in v1 — it opens the holder's shieldedUntilFrame window and would
//       fire 'shielded' triggers); its ONLY in-scope observable is the K7/K8 gate it opens.
//   K7  FAITHFUL — burstCast trigger with requiresShielded:true (the "in Nano Coating status"
//       activation clause, naga precedent). At scope the gate is always open, but the encoding
//       is structural fidelity: the counterfactual without the shield block (K2 removed) never
//       opens the gate and the nuke never fires.
//   K8  FAITHFUL multiplier / MEASUREMENT-GATED basis — flatDamage 1150.84% on her cast. The
//       clause "the ATK, which is calculated from 5% of final Max HP" says the nuke's ATK basis
//       is DERIVED from her Max HP; the engine has no basis-replacement primitive (effectiveAtk
//       is purely additive: staticAtk×(1+atkPct) + casterAtkPct + atkOfMaxHpPct×liveMaxHp —
//       verified in sim.ts), and stackedNuke.hpPct is Maiden:IR-specific (per-FB-sat-out stack,
//       not a cast nuke). Shipped at her own ATK basis with a documented undercount: on the
//       scope-lock basis 5% of her final Max HP ≈ 2.07× her ATK, so the nuke is undercounted by
//       up to ~52% (≈4% of her personal total, ≈1-2% of a team total). maiden-ice-rose
//       precedent — her HP-scaled burst portion shipped the same documented-under-model way.
//       Recipe: a focus recording reading her burst popup against the ATK×1150.84 prediction;
//       a popup ≈2× higher confirms the HP basis and calls for an engine primitive. SECOND
//       DOCUMENTED INFIDELITY of the ATK basis (S2b reviewer): the shipped nuke rides teammate
//       ATK buffs (liter/crown windows) that a true HP basis would ignore — both errors are
//       caveated on the override and collapse together when the basis is measured.
//   K3  UNMODELED, verbatim — dead at scope (never uncoated) + no negated-shield-gate primitive.
//   K4/K5 UNMODELED, verbatim — the 200-normal-attack shield-HP restore is defensive: there is
//       no shield HP pool to restore (v1 shields are events, not pools). Every candidate encoding
//       MISFIRES a teammate: a `heal` effect would fire crown's on-recovery consumer (the
//       shield≠heal trap — the S2b reviewer's own tripwire class), and a fresh `shield` effect on
//       hitCount would re-fire every 'shielded' trigger on naga-class consumers every 200 rounds
//       (the re-shield over-firing the reviewer warns about on K3). RECONCILED DISAGREEMENT: the
//       S2b reviewer (claude-fable-5) disposed this line FAITHFUL-as-hitCount-shield-event under
//       the heal/shield tandem-completeness rule; the driver holds UNMODELED because the kit line
//       RESTORES an existing shield's HP pool (no new shield is created in game), so neither event
//       encoding is faithful — a restore is neither a heal nor a shield application. No in-scope
//       observable; pinned by verbatim + absence.
//   K6  UNMODELED, verbatim — dead at scope (never uncoated) AND no "next shield's HP ▲"
//       primitive (shield-size modifiers do not exist; shields carry no HP pool).
//   K9  UNMODELED, verbatim — dead at scope (never uncoated). Even if it fired it is
//       damage-inert on her: her burst CD (40s) exceeds the buff's 20s window, and she carries
//       no atkOfMaxHpPct consumer the lifted Max HP could feed. The counterfactual below proves
//       the shipped override does NOT launder the dead branch into an unconditional maxHpPct
//       buff on every cast.
//   WEAPON: MG baseline (datamine cadence, 300-round belt, rl3 3.55, burstGaugePerShot 0.05 on
//       the default gauge path — no gauge-per-shot.json entry, same as emma/claire/mast). Her
//       MG normals dominate her damage (~95%); the kit adds only the K8 nuke.
//
// Fixture: the control comp (liter B1 / crown B2 / kilo B3 / helm B3, boss Fire, focus kilo —
// the harness default for "needs real burst casts"). Two 40s Burst-III casters alternate chains,
// so kilo casts ~6 times in 180s. Boss Fire is neutral for kilo (Fire vs Fire = no advantage);
// every assertion is on her own event stream.
// GATE FIXTURE C (liter B1 / delta B2 / kilo solo-B3, forced-neutral boss, focus kilo): exists
// because CROWN SHIELDS THE BURST CASTERS — the engine's shieldedUntilFrame window is not
// name-keyed (any shield opens it; naga convention), so in the control comp removing kilo's OWN
// shield still leaves the requiresShielded gate open via crown's grants. Kilo's kit gate names
// HER OWN Nano Coating status, so the gate discrimination (shield removed → nuke silent) must run
// where no teammate shields: liter/delta are verified shield-free. At scope the distinction is
// unobservable in damage (her own shield is permanent from t=0 either way) — C exists purely to
// prove the nuke is genuinely gated, not hardcoded.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const KILO = 'kilo';
/** controlComp slot order: liter 0 / crown 1 / kilo 2 / helm 3. */
const KILO_SLOT = 2;
const CROWN_SLOT = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(KILO),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
/** Gate fixture C: liter / delta / kilo — NO shielder on the team (see header). */
function runC(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['liter', 'delta', KILO],
    bossElement: null,
    focusSlug: KILO,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === KILO);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** Crown's recovery-consumer team buff firings (helm H2 pattern) — the shield≠heal tripwire. */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN_SLOT &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);
const kiloNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === KILO && d.srcSlot === 'burst');
const bucketTotal = (evs: SimEvent[], bucket: Damage['bucket']): number =>
  dmg(evs)
    .filter((d) => d.slug === KILO && d.bucket === bucket)
    .reduce((acc, d) => acc + d.amount, 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** K2 counterfactual: the shield block removed entirely — the nearest wrong model for BOTH the
 *  shield line and the gate: without Nano Coating the requiresShielded burst branch never opens
 *  and kilo is a bare weapon. */
const kiloNoShield = withPatchedOverride(KILO, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = [];
  if (before === 0) {
    throw new Error('kilo skill1 shield block missing — fixture is stale');
  }
});
/** K8 counterfactual: the nuke UNGATED (no requiresShielded) — the "in Nano Coating status"
 *  activation clause dropped. Behaviour-identical at scope (always coated), so this patch exists
 *  to be structurally compared against shipped, not to move totals. */
const kiloUngatedNuke = withPatchedOverride(KILO, (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!block || block.requiresShielded !== true) {
    throw new Error('kilo gated burst nuke missing — fixture is stale');
  }
  delete block.requiresShielded;
});
/** K9 counterfactual: laundering the dead uncoated branch into an unconditional burstCast
 *  Max HP ▲48%/20s self-buff (an always-fires encoding of a never-fires line). */
const kiloMaxHpLaundered = withPatchedOverride(KILO, (ov) => {
  ov.burst = [
    ...ov.burst,
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'maxHpPct', value: 48, durationSec: 20 }],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noShield = run({ [KILO]: kiloNoShield });
const laundered = run({ [KILO]: kiloMaxHpLaundered });
const baseC = runC();
const noShieldC = runC({ [KILO]: kiloNoShield });

describe('kilo — kit spec', () => {
  describe('K1/K2 — S1 Nano Coating: 21.12%-final-Max-HP shield at battle start, continuous', () => {
    it('is a single passive self-shield at 21.12% of final Max HP with NO duration', () => {
      const ov = loadOverride(KILO) as any;
      expect(ov.skill1).toEqual([
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [{ kind: 'shield', maxHpPct: 21.12 }],
        },
      ]);
    });

    it('FUNCTIONAL: the shield is the gate-foundation — her burst nukes land in the base run', () => {
      // The shield effect is event-silent by engine design (no HP pool in v1); its in-scope
      // observable is the requiresShielded window it opens, through which every nuke passes.
      expect(casts(base).length).toBeGreaterThan(2);
      expect(kiloNukes(base).length).toBe(casts(base).length);
    });

    it('DISCRIMINATING: without the shield the gate never opens and the nuke never fires (fixture C — no team shielder)', () => {
      // In the control comp crown's burst shields all allies, which would keep the (not
      // name-keyed) shielded window open even with kilo's own shield removed — so the gate
      // discrimination runs on the shield-free team. Her OWN shield is the only possible gate
      // opener there: remove it and every nuke must disappear.
      expect(casts(baseC).length).toBeGreaterThan(2);
      expect(kiloNukes(baseC).length).toBe(casts(baseC).length);
      expect(kiloNukes(noShieldC)).toEqual([]);
      expect(bucketTotal(noShieldC, 'burst')).toBe(0);
    });

    it('tread-lightly: the shield line moves NOTHING about her MG weapon totals', () => {
      expect(bucketTotal(noShieldC, 'normal')).toBe(bucketTotal(baseC, 'normal'));
      expect(bucketTotal(noShieldC, 'skill')).toBe(bucketTotal(baseC, 'skill'));
      expect(bucketTotal(noShield, 'normal')).toBe(bucketTotal(base, 'normal'));
      expect(bucketTotal(noShield, 'skill')).toBe(bucketTotal(base, 'skill'));
    });

    it('SHIELD ≠ HEAL tripwire (S2b reviewer): crown’s recovery consumer is untouched by kilo', () => {
      // Crown sits at the control comp's B2 slot with an on-recovery block. A heal-flavored
      // shield encoding would add recovery events and move her firing frames; the shield effect
      // must not. Identical frames with the shield present and removed (kilo is never a
      // recovery source either way).
      const frames = crownRecoveryFrames(base);
      expect(
        frames.length,
        'the tripwire must be live — helm heals, crown consumes'
      ).toBeGreaterThan(0);
      expect(frames).toEqual(crownRecoveryFrames(noShield));
    });
  });

  describe('K3 — S1 re-shield on burst while UNCOATED is UNMODELED (dead at scope)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride(KILO) as any;
      expect(ov.unmodeled.skill1.join('\n')).toContain(
        '■ Activates when using Burst Skill. Affects self if not in Nano Coating status.'
      );
      expect(ov.unmodeled.skill1.join('\n')).toContain(
        'Creates a Shield equal to 21.12% of the skill user’s final Max HP continuously.'.replace(
          '’',
          "'"
        )
      );
    });

    it('enacts NOTHING: skill1 is exactly the one battle-start shield block (no burstCast block)', () => {
      const ov = loadOverride(KILO) as any;
      expect(
        ov.skill1.filter((b: any) => b.trigger.kind !== 'passive')
      ).toEqual([]);
    });
  });

  describe('K4/K5 — S2 200-attack shield-HP restore is UNMODELED (no shield HP pool in v1)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride(KILO) as any;
      expect(ov.unmodeled.skill2.join('\n')).toContain(
        '■ Activates after performing 200 normal attacks while in Nano Coating status. Affects self.'
      );
      expect(ov.unmodeled.skill2.join('\n')).toContain(
        "Restores Shield HP equal to 2.85% the skill user's final Max HP."
      );
    });

    it('enacts NOTHING: skill2 is empty — no hitCount block, no skill2-sourced events', () => {
      const ov = loadOverride(KILO) as any;
      expect(ov.skill2).toEqual([]);
      expect(dmg(base).filter((d) => d.slug === KILO && d.srcSlot === 'skill2')).toEqual([]);
    });
  });

  describe('K6 — S2 escalating Next-Shield-HP buff is UNMODELED (dead at scope + no primitive)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride(KILO) as any;
      const text = ov.unmodeled.skill2.join('\n');
      expect(text).toContain(
        '■ Activates when using Burst Skill while not in Nano Coating status. Affects self.'
      );
      expect(text).toContain('Once: Next Shield’s HP ▲ 17.75% continuously.'.replace('’', "'"));
      expect(text).toContain('Twice: Next Shield’s HP ▲ 26.66% continuously.'.replace('’', "'"));
      expect(text).toContain(
        'Three times: Next Shield’s HP ▲ 35.53% continuously.'.replace('’', "'")
      );
    });

    it('enacts NOTHING: no escalating block anywhere in the override', () => {
      const ov = loadOverride(KILO) as any;
      const all = [...ov.skill1, ...ov.skill2, ...ov.burst];
      expect(
        all.filter((b: any) =>
          b.effects.some((e: any) => e.kind === 'escalating')
        )
      ).toEqual([]);
    });
  });

  describe('K7/K8 — burst nuke: 1150.84% gated on Nano Coating, once per cast, pre-FB', () => {
    it('fires once per HER burst cast at the kit magnitude, in the burst bucket', () => {
      const nukes = kiloNukes(base);
      expect(nukes.length).toBe(casts(base).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1150.84]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = kiloNukes(base).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: keyed to HER burstCast, not fullBurstEnter (helm is a co-B3 here)', () => {
      // With two 40s Burst-III casters the team makes MORE Full Bursts than kilo casts — a
      // fullBurstEnter keying would fire the nuke on helm's rotations too.
      expect(casts(base).length).toBeGreaterThan(0);
      expect(fbStarts(base).length).toBeGreaterThan(casts(base).length);
      expect(kiloNukes(base).length).toBe(casts(base).length);
    });

    it('is encoded behind requiresShielded — the "in Nano Coating status" clause', () => {
      // Behaviour-identical to ungated at scope (always coated) — pinned structurally.
      const ov = loadOverride(KILO) as any;
      const block = ov.burst.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'flatDamage')
      );
      expect(block.requiresShielded).toBe(true);
      expect(block.trigger).toEqual({ kind: 'burstCast' });
      expect(block.target).toEqual({ kind: 'enemy' });
    });

    it('basis pin: shipped at her own ATK basis (the HP basis is ⚑ measurement-gated, see header K8)', () => {
      // The undercount direction is pinned functionally: the ungated counterfactual patch is a
      // no-op at scope, so any future basis change MUST come through this file's K8 assertions.
      const gated = kiloNukes(base);
      const ungated = kiloNukes(run({ [KILO]: kiloUngatedNuke }));
      expect(ungated.length).toBe(gated.length);
      expect(
        ungated.map((d) => d.amount),
        'gate state cannot move the nuke at scope — the shield never breaks'
      ).toEqual(gated.map((d) => d.amount));
    });
  });

  describe('K9 — burst Max HP ▲48%/20s uncoated branch is UNMODELED (dead at scope)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride(KILO) as any;
      expect(ov.unmodeled.burst.join('\n')).toContain(
        '■ Activates when not in Nano Coating status. Affects self.'
      );
      expect(ov.unmodeled.burst.join('\n')).toContain(
        'Max HP ▲ 48% for 20 sec.'
      );
    });

    it('enacts NOTHING: no maxHp buffApply from kilo anywhere in the base run', () => {
      expect(
        buffs(base).filter(
          (b) =>
            b.casterIdx === KILO_SLOT &&
            (b.stat === 'maxHpPct' || b.stat === 'maxHpFlat')
        ),
        'the dead uncoated branch must not fire as an unconditional buff'
      ).toEqual([]);
    });

    it('DISCRIMINATING: laundering the branch into an unconditional maxHpPct buff would emit it', () => {
      const emitted = buffs(laundered).filter(
        (b) => b.casterIdx === KILO_SLOT && b.stat === 'maxHpPct'
      );
      expect(
        emitted.length,
        'the laundered model emits Max HP buffs every cast — the shipped model must not'
      ).toBe(casts(laundered).length);
      expect([...new Set(emitted.map((b) => b.value))]).toEqual([48]);
    });

    it('leak pin: even laundered, the dead branch cannot feed the nuke under the shipped encoding', () => {
      // kilo carries no atkOfMaxHpPct consumer, so a leaked Max HP grant has nothing to feed —
      // the nuke per cast is byte-identical with the laundered buff present.
      expect(kiloNukes(laundered).map((d) => d.amount)).toEqual(
        kiloNukes(base).map((d) => d.amount)
      );
    });
  });
});
