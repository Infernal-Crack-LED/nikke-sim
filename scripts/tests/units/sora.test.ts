// PER-UNIT KIT SPEC — `sora` (Sora, RL/Supporter/Wind/Burst I, Elysion, cd 40s, ammo 6,
// chargeFrames 60, reloadFrames 141). Kit-autonomy gauntlet 2026-08-04. BASE unit (no variant).
// FROM-SCRATCH build: no prior override, simSupported false -> true.
//
// Sora is a pure healer/supporter — exactly ONE of her kit lines has any expression in a
// damage-dealt sim: the burst's team heal, and only as a RECOVERY EVENT (the engine models no
// HP amounts — sim.ts `case 'heal'` — so the 52.27%-of-final-Max-HP magnitude is unrecordable;
// the heal's observable is the on-recovery consumers it feeds). Everything else is
// out-of-domain, documented verbatim in `unmodeled`:
//
// Kit (data/characters.json → characters.sora.skills, SL10):
//   S1 ■ start of battle → self: Outgoing healing ▲35.2% continuously                  [K1 gap]
//   S2 ■ when an ally or self destroys an enemy's part → all allies:
//        Storage: stores excess healing received, ≤5.36% Max HP per stack, ≤5 stacks,
//        lasts 15 sec                                                                   [K2 gap]
//        ATK ▲23.74% of the skill user's ATK for 15 sec                                 [K2 gap]
//   BU ■ all allies: Recovers 52.27% of the skill user's final Max HP as HP            [K3 ✓]
//      ■ all allies: Removes 1 debuff(s)                                               [K4 gap]
//
// WHY EACH UNMODELED LINE IS UNMODELED (each has a nearest-wrong encoding the assertions must
// discriminate against):
//   K1  heal AMOUNTS do not exist in the sim (heal = valueless recovery event), so an
//       "outgoing healing ▲" multiplier has nothing to scale — no stat, no channel. Nearest
//       wrong: inflating her burst-heal magnitude by ×1.352 — impossible to express AND a
//       fudge (the engine carries no heal number anywhere).
//   K2  the S2 trigger is PART DESTRUCTION: the v1 boss is partless (sim.ts: "partless test
//       boss … kept as a switch for part-ed boss support later") and the engine emits no
//       part-destroyed event, so the line can never fire in scope — exactly as in game, where
//       part-gated kits do nothing vs partless targets. diesel-winter-sweets / ark-ranger-black
//       precedent: verbatim unmodeled + ⚑ recipe, NOT a proxy trigger. Nearest wrong:
//       MATERIALIZING the ATK line as a passive/permanent casterAtkPct 23.74 team buff — a
//       +ATK the kit never grants vs a partless boss. The overheal-storage line additionally
//       needs an HP/overheal pool that v1 does not model.
//   K4  debuff cleanse — the sim has no ally-debuff model (v1 boss deals no damage, applies no
//       debuffs; cocoa precedent), so there is nothing to remove; no primitive exists.
//
// WHY THE K3 ASSERTIONS DISCRIMINATE (the line is offensively inert, so TOTALS alone cannot
// discriminate — the evidence is the EVENT LOG read through a consumer):
//   K3a the burst heal fires a recovery landing on asuka's S1 consumer ("when recovery takes
//       effect" → self atkPct 96.98/25s) at EVERY sora burst cast, on the CAST frame — an
//       instant (ticks-1) heal. A heal-removed counterfactual zeros the consumer (the block is
//       live, not vacuous); a SELF-only target counterfactual also zeros it (asuka never
//       receives it — the kit says "Affects all allies"); a fullBurstEnter counterfactual moves
//       every landing from the cast frame to the FB-start frame (+82f, after the chain
//       completes — the cast precedes the window, helm H7 fact); a HoT/ticks>1 mis-encoding
//       would add landings BEYOND one per cast (count equality catches it).
//   K3b self-damage-neutrality: sora's own total is byte-identical with her kit zeroed
//       (bare weapon) — a healer's kit contributes nothing to her OWN damage. snow-crane M1 /
//       marciana CW1 shape. And the heal is live: it MOVES the consumer's total (asuka's
//       recovery self-buff lifts her own damage ~1.8×) — the inertness is hers alone.
//   K3c absence pin (anti-fabrication for K1/K2/K4): sora originates ZERO buffApply events —
//       every buff-granting line of her kit is unmodeled for cause. The counterfactual
//       materializing S2's ATK line as a passive casterAtkPct 23.74 team buff emits buffs and
//       moves team totals — the shipped absence is a real, falsifiable claim.
//   K3d structure + documentation: skill1/skill2 are EMPTY by construction (not by omission);
//       the burst is exactly one burstCast/allies/heal block; every unmodeled entry is VERBATIM
//       prose from characters.json (checked dynamically — never an `ignored` drop).
//
// FIXTURE. sora (B1, the SOLE Burst I) / folkwang (B2, forced BARE — her shipped override
// carries shields/heals that would contaminate the recovery channel) / asuka (B3, burst
// lifesteal patched OUT so sora is the SOLE recovery source). Boss Iron (Wind/Iron ×1.10 clean
// edge for sora, volume precedent), focus sora (×2.5 charge-weapon gauge → she is CD-limited:
// 5 casts over 180s, exactly every 40s; the chain holds ~30f per stage so FB-start lands +82f
// after her cast — probed, deterministic, no seed). asuka's S1 is a SELF-targeted consumer —
// exactly one buffApply per recovery landing on her (no per-holder multiplicity).
// Slot order: sora 0 / folkwang 1 / asuka 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['sora', 'folkwang', 'asuka'];
/** Slot order: sora 0 / folkwang 1 / asuka 2. */
const SORA = 0;
const ASUKA = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

/** asuka's burst lifesteal removed → sora is the only recovery source in the fight. */
const asukaSoleConsumer = withPatchedOverride('asuka', (ov) => {
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length === before) {
      throw new Error('asuka burst heal missing — fixture is stale');
    }
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Iron',
    focusSlug: 'sora',
    overrides: {
      folkwang: bareWeaponOverride('folkwang'), // bare basis cell — no shields/heals
      asuka: asukaSoleConsumer,
      ...overrides,
    },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- counterfactuals (nearest-wrong encodings) ------------------------------------------------
/** K3a counterfactual: the heal removed entirely (a vacuous burst). Guard throws only once
 *  burst blocks exist (post-S3) but none carries the heal — during the RED phase the skeleton
 *  burst is empty and the strip is a documented no-op (the paired base>0 assertion still REDs). */
const soraNoHeal = withPatchedOverride('sora', (ov) => {
  const before = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  ov.burst = (ov.burst ?? []).map((b: any) => ({
    ...b,
    effects: b.effects.filter((e: any) => e.kind !== 'heal'),
  }));
  const after = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  if (before > 0 && after !== before - 1) {
    throw new Error('sora burst heal missing — fixture is stale');
  }
});
/** K3a counterfactual: the heal keyed to Full Burst entry instead of her own burst cast. */
const soraHealOnFbe = withPatchedOverride('sora', (ov) => {
  for (const b of ov.burst ?? []) {
    if (b.trigger?.kind === 'burstCast') {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
/** K3a counterfactual: the heal scoped to SELF instead of all allies. */
const soraHealSelfOnly = withPatchedOverride('sora', (ov) => {
  for (const b of ov.burst ?? []) {
    if (b.effects.some((e: any) => e.kind === 'heal')) {
      b.target = { kind: 'self' };
    }
  }
});
/** K3c counterfactual: S2's part-gated ATK line MATERIALIZED as a passive team buff — the
 *  naive-parser misread (a +ATK the kit never grants vs a partless boss). */
const soraMaterializedAtk = withPatchedOverride('sora', (ov) => {
  if (ov.skill2?.length) {
    throw new Error('sora skill2 must be empty — fixture is stale');
  }
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [
        { kind: 'buff', stat: 'casterAtkPct', value: 23.74, durationSec: 15 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const bare = run({ sora: bareWeaponOverride('sora') });
const noHeal = run({ sora: soraNoHeal });
const fbeHeal = run({ sora: soraHealOnFbe });
const selfHeal = run({ sora: soraHealSelfOnly });
const materialized = run({ sora: soraMaterializedAtk });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const soraCasts = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'sora')
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbStarts = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** asuka's S1 consumer landings — exactly one buffApply per recovery landing on her. */
const recoveryLandings = (evs: SimEvent[]) =>
  buffs(evs)
    .filter(
      (b) =>
        b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);
const soraOriginatedBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === SORA);

describe('sora — kit spec', () => {
  describe('K3 — the burst heals all allies (modeled as a recovery event)', () => {
    it('fixture sanity: sora casts her Burst I ≥4 times and every chain completes', () => {
      const casts = soraCasts(base.events);
      expect(casts.length).toBeGreaterThanOrEqual(4);
      expect(fbStarts(base.events).length).toBe(casts.length);
    });

    it('fires exactly one recovery landing on asuka per sora cast, on the CAST frame', () => {
      const casts = soraCasts(base.events);
      const landings = recoveryLandings(base.events);
      expect(landings.length).toBe(casts.length);
      expect(landings).toEqual(casts);
    });

    it('is live, not vacuous: removing the heal zeros the consumer', () => {
      expect(recoveryLandings(base.events).length).toBeGreaterThan(0);
      expect(recoveryLandings(noHeal.events)).toEqual([]);
    });

    it('targets ALL allies: a self-only heal never reaches asuka', () => {
      expect(recoveryLandings(selfHeal.events)).toEqual([]);
    });

    it('is keyed to burstCast, not fullBurstEnter (the cast precedes the FB window)', () => {
      const casts = soraCasts(base.events);
      const fbeLandings = recoveryLandings(fbeHeal.events);
      expect(fbeLandings.length).toBe(casts.length);
      expect(fbeLandings).not.toEqual(casts);
      expect(fbeLandings).toEqual(fbStarts(fbeHeal.events));
    });
  });

  describe('K3b — the kit is self-damage-neutral AND live on the consumer', () => {
    it("sora's own total is byte-identical with her kit zeroed (bare weapon)", () => {
      expect(base.totals.sora).toEqual(bare.totals.sora);
    });

    it("the heal MOVES the consumer's total (asuka's recovery self-buff)", () => {
      expect(base.totals.asuka).toBeGreaterThan(noHeal.totals.asuka);
    });
  });

  describe('K1/K2/K4 — absence pin: every buff line is unmodeled for cause', () => {
    it('sora originates ZERO buffApply events in the base fight', () => {
      expect(soraOriginatedBuffs(base.events)).toEqual([]);
    });

    it('DISCRIMINATING: materializing S2 ATK as a passive emits buffs and moves totals', () => {
      expect(soraOriginatedBuffs(materialized.events).length).toBeGreaterThan(
        0
      );
      expect(materialized.totals.asuka).not.toEqual(base.totals.asuka);
      expect(materialized.totals.folkwang).not.toEqual(base.totals.folkwang);
    });
  });

  describe('K3d — structure + verbatim documentation', () => {
    const ov = loadOverride('sora')!;
    const prose = data.characters.sora.skills;

    it('skill1/skill2 are empty by construction; burst is one heal block', () => {
      expect(ov.skill1).toEqual([]);
      expect(ov.skill2).toEqual([]);
      expect(ov.burst).toHaveLength(1);
      const b: any = (ov.burst ?? [])[0];
      expect(b.trigger).toEqual({ kind: 'burstCast' });
      expect(b.target).toEqual({ kind: 'allies' });
      expect(b.effects).toEqual([{ kind: 'heal' }]);
    });

    it('every unmodeled entry is VERBATIM prose of its own slot', () => {
      const un = (ov as any).unmodeled as Record<string, string[]>;
      expect(un.skill1.length).toBeGreaterThanOrEqual(1);
      expect(un.skill2.length).toBeGreaterThanOrEqual(1);
      expect(un.burst.length).toBeGreaterThanOrEqual(1);
      for (const line of un.skill1) {
        expect(prose.skill1).toContain(line);
      }
      for (const line of un.skill2) {
        expect(prose.skill2).toContain(line);
      }
      for (const line of un.burst) {
        expect(prose.burst).toContain(line);
      }
    });

    it('no `ignored` block anywhere; no heal magnitude fabricated in the ENCODING', () => {
      expect(JSON.stringify(ov)).not.toContain('"ignored"');
      // the 52.27% magnitude is unrecordable (heal = event-only) — it must not appear as an
      // encoded value on any block (the note/caveats may CITE it as documentation).
      const blocks = JSON.stringify([ov.skill1, ov.skill2, ov.burst]);
      expect(blocks).not.toContain('52.27');
      expect(blocks).not.toContain('"value"');
    });
  });
});
