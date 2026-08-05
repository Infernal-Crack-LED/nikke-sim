// PER-UNIT KIT SPEC — `sin` (Sin, Missilis AR Defender, Electric, Burst II, cd 20s, ammo 60,
// reloadFrames 81, normalMult 13.65 / coreMult 200, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-08-05; test-first line-by-line spec. Tier 2 encoding
// (scoped self-only buff windows, fullBurstEnd trigger identity, burstCast keying, and a
// resource-gated burst-usage escalation).
//
// GREENFIELD NOTE: sin shipped with NO override (simSupported:false) — before this gauntlet the
// unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the
// faithful encoding AND the nearest-wrong model (patched via withPatchedOverride) provably fails
// it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.sin.skills, lvl-10 values):
//   S1 "Full Stop" — ■ when firing the last bullet → self:
//      ■ Duplicate 15.03% Max HP of the ally with the highest Max HP, lasts 5 sec       [SN1]
//      ■ Attract: taunt all enemies for 5 sec                                            [SN2 UNMODELED]
//   S2 "Hurry Up"
//      ■ when Full Burst ends → self: Burst Gauge filling speed ▲16.17% for 5 sec        [SN3]
//      ■ when using Burst Skill → self, effects escalate with usage count (each later
//        effect triggers all before it):
//          Once:   recover 15.3% of attack damage as HP for 5 sec                        [SN4a — modeled, behaviorally silent]
//          Twice:  incoming healing ▲51% for 5 sec                                       [SN4b UNMODELED]
//          Thrice: DEF ▲43.2% for 5 sec                                                  [SN4c]
//   BU "Words can Kill"
//      ■ when enemy units (excluding Nikkes) are more than 4 → all enemies:
//        Damage Taken ▲12.23% for 5 sec                                                  [SN6 UNMODELED]
//      ■ enemies within attack range: 176.32% of final ATK as damage                     [SN5]
//
// UNMODELED lines (carried VERBATIM in the override's `unmodeled`; reasons here):
//   SN2  — Attract/taunt vs a partless boss that never attacks and has no ally-targeting AI:
//          zero in-domain surface (nero N7 / delta-ninja-thief Attract precedent). The engine has
//          no threat channel, so there is nothing to assert — no assertion here by construction.
//   SN4b — "incoming healing ▲" has NO StatKey in the effect schema (nero grumpy-cat ruling:
//          heals are event-only with no heal-scaling stat), so the step-2 payload cannot be
//          carried; its escalation GATE is still encoded (the resource pool advances on every
//          cast — steps 1 and 3 fire on exactly the casts the kit says they fire on).
//   SN6  — the "more than 4 enemy units" gate is NEVER satisfied at single-boss scope (1 enemy),
//          so the faithful single-boss behaviour is that the debuff never fires — unmodeled IS
//          the faithful encoding here, not a skip. The engine additionally has no enemy-count
//          gate primitive, and the nearest-wrong model (always-on damageTakenPct) would
//          over-credit the whole team by 12.23% for 5s per sin burst — the largest error this
//          kit can produce (S2b's named trap). The SN6 group pins its absence.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   SN1  nearest-wrong = the level-1 magnitude 7.94 (vs shipped 15.03). The engine converts
//        highestAllyMaxHpPct → maxHpFlat of (15.03/100) × the HIGHEST static Max HP in the team
//        (apply-time, static basis — quency S1 precedent; the StatKey names sin as the next
//        carrier). ROSTER-TIE PROOF: every Defender in the roster carries the identical
//        16500+3000+200 static-HP basis and no non-Defender reaches it, so sin is ALWAYS tied
//        for the team's highest static Max HP — a self-%-basis encoding (targetMaxHpPct) is
//        provably VALUE-IDENTICAL for every possible team. The selfRef patch below pins that
//        equivalence rather than pretending to discriminate it; the discrimination that remains
//        is the magnitude (7.94 vs 15.03), the lastBullet cadence, the 5s expiry, and the
//        inertness canary. In-game this line creates a SHIELD; the engine maps "Duplicate X%
//        Max HP" as a Max-HP grant (quency precedent — the shield primitive's maxHpPct basis is
//        caster-only and event-only). Both channels are offensively inert for sin (no HP→ATK
//        conversion, no 'shielded' trigger of her own), so the divergence moves no damage in v1.
//   SN3  nearest-wrong = fullBurstEnter keying (the window opens ~10s early) or a permanent
//        grant. The trigger IDENTITY is pinned frame-exactly against the fullBurstEnd events.
//        The buff is LIVE (her gaugeGenerated strictly rises) yet damage-INERT in this fixture:
//        the rotation is CD-limited (liter B1 20s / helm B3 40s cap the chain cadence; the
//        gauge caps before the next chain anyway), so byte-equal team totals under removal is
//        the honest canary, not a sign of dead encoding.
//   SN4  the escalation gate is a resource pool ('burstUses', +1 per own burstCast, gates read
//        the PRE-increment value — soda-twinkling slot-order precedent): cast 1 → step 1 only,
//        cast 2 → steps 1–2, cast 3+ → all three. Nearest-wrong models: INSTANT-MAX (all steps
//        from cast 1 — defPct on all 10 casts) and CAST-3-ONLY (the gate as an equality check —
//        defPct on exactly one cast). Step 1's lifesteal is modeled as a self heal-HoT
//        (ticks:5 — the helm burst-heal precedent for "Recover X% of attack damage as HP for N
//        sec") but is BEHAVIORALLY SILENT in this fixture: recovery events have no log kind and
//        no unit consumes sin's own recovery, so no assertion can read it — documented, not
//        asserted (asserting nothing is the honest state; the block's presence is pinned by the
//        validator + S5/S6 blind rebuilds).
//   SN5  nearest-wrong = the level-1 magnitude 88.16 (vs shipped 176.32), or folding the hit
//        under the preceding >4-enemies header (zeroing her burst bucket). The nuke fires on her
//        OWN cast (burstCast — "Affects enemies within attack range" is its own ■ block with no
//        activation clause; the single partless boss is trivially within attack range; helm H7 /
//        nero N6 precedent), and a burst CAST lands BEFORE the Full Burst window opens, so it
//        must never take the +50% FB major.
//
// Fixture (deterministic — no seed; event-log over totals): ['liter','sin','helm'] — liter
// (B1, 20s) opens the chain, sin is the SOLE B2 (casts on every chain = 10 casts / 180s; a
// crown-style competing B2 would starve her to zero casts — S2b fixture-validity warning,
// avoided by construction), helm (B3, 40s) closes every second chain (5 full Full Bursts).
// Boss Water (sin's ×1.1 Electric major), focus sin.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['liter', 'sin', 'helm'];
const SIN = 1; // sin's slot in COMP

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Water',
    focusSlug: 'sin',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const defBlock = (ov: any) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'defPct'));
  if (!b) {
    throw new Error('sin burst defPct block missing — fixture is stale');
  }
  return b;
};

/** SN5 reference: her burst nuke removed entirely (proves the line is live). */
const sinNoNuke = withPatchedOverride('sin', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('sin burst flatDamage block missing — fixture is stale');
  }
});

/** SN5 nearest-wrong: the level-1 magnitude 88.16 instead of 176.32. */
const sinWrongNuke = withPatchedOverride('sin', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('sin burst flatDamage effect missing — fixture is stale');
  }
  e.atkPct = 88.16;
});

/** SN1 reference: her Duplicate-Max-HP line removed entirely (independent STATIC-Max-HP basis
 *  + inertness canary). */
const sinNoDup = withPatchedOverride('sin', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'highestAllyMaxHpPct'));
  if (ov.skill1.length === before) {
    throw new Error(
      'sin S1 highestAllyMaxHpPct block missing — fixture is stale'
    );
  }
});

/** SN1 nearest-wrong: the level-1 magnitude 7.94 instead of 15.03. */
const sinWrongDup = withPatchedOverride('sin', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'highestAllyMaxHpPct');
  if (!e) {
    throw new Error(
      'sin S1 highestAllyMaxHpPct effect missing — fixture is stale'
    );
  }
  e.value = 7.94;
});

/** SN1 roster-tie proof: a self-% basis (targetMaxHpPct) is VALUE-IDENTICAL for every possible
 *  team — sin is always tied for the roster's highest static Max HP (all Defenders share the
 *  16500+3000+200 basis; no non-Defender reaches it). Asserted EQUIVALENT below, not
 *  discriminated — see the SN1 header. */
const sinSelfRefDup = withPatchedOverride('sin', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'highestAllyMaxHpPct');
  if (!e) {
    throw new Error(
      'sin S1 highestAllyMaxHpPct effect missing — fixture is stale'
    );
  }
  e.stat = 'targetMaxHpPct';
});

/** SN3 reference: her gauge-filling-speed window removed entirely (inertness canary +
 *  gaugeGenerated contrast). */
const sinNoGauge = withPatchedOverride('sin', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'burstGenPct'));
  if (ov.skill2.length === before) {
    throw new Error('sin S2 burstGenPct block missing — fixture is stale');
  }
});

/** SN3 nearest-wrong: the window keyed to fullBurstEnter (~10s early) instead of fullBurstEnd. */
const sinWrongGaugeTrigger = withPatchedOverride('sin', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'burstGenPct'));
  if (!b) {
    throw new Error('sin S2 burstGenPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

/** SN4 nearest-wrong (instant-max): the escalation gate stripped — DEF from cast 1. */
const sinInstantMax = withPatchedOverride('sin', (ov) => {
  const b = defBlock(ov);
  if (!b.resourceGate) {
    throw new Error('sin burst defPct resourceGate missing — fixture is stale');
  }
  delete b.resourceGate;
});

/** SN4 nearest-wrong (cast-3-only): the cumulative gate misread as an equality check. */
const sinCast3Only = withPatchedOverride('sin', (ov) => {
  const b = defBlock(ov);
  if (!b.resourceGate) {
    throw new Error('sin burst defPct resourceGate missing — fixture is stale');
  }
  b.resourceGate = { ...b.resourceGate, max: 2 };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noNuke = run({ sin: sinNoNuke });
const wrongNuke = run({ sin: sinWrongNuke });
const noDup = run({ sin: sinNoDup });
const wrongDup = run({ sin: sinWrongDup });
const selfRefDup = run({ sin: sinSelfRefDup });
const noGauge = run({ sin: sinNoGauge });
const wrongGaugeTrigger = run({ sin: sinWrongGaugeTrigger });
const instantMax = run({ sin: sinInstantMax });
const cast3Only = run({ sin: sinCast3Only });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const sinBursts = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'sin')
    .sort((a, b) => a.frame - b.frame);
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd');
const sinDef = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === SIN && b.stat === 'defPct');

/** STATIC Max HP — the block-removed run carries no maxHpFlat buff from sin, so the result
 *  rows' Max HP is the static basis for the flat-grant arithmetic below. */
const STATIC_MAX_HP = Math.max(...noDup.res.units.map((u) => u.maxHp));

describe('sin — kit spec', () => {
  it('fixture sanity: sin is element-advantaged and casts on every chain as sole B2', () => {
    expect(unitOf(base.res, 'sin').advantaged).toBe(true);
    const sinCasts = unitOf(base.res, 'sin').burstCasts;
    expect(
      sinCasts,
      'sole B2 on a ~20s chain — sin should cast every chain'
    ).toBeGreaterThanOrEqual(5);
    expect(sinCasts).toBe(unitOf(base.res, 'liter').burstCasts);
  });

  describe('SN5 — burst deals 176.32% of final ATK in attack range, once per own cast', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'sin' && d.srcSlot === 'burst'
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = sinBursts(base.events).length;
      expect(nukes.length).toBe(casts);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([176.32]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: the level-1 magnitude 88.16 is NOT what ships, and the nuke is live', () => {
      expect(base.totals).not.toEqual(wrongNuke.totals);
      expect(base.totals).not.toEqual(noNuke.totals);
    });
  });

  describe('SN1 — S1 duplicates 15.03% of the highest static Max HP onto herself per magazine', () => {
    // Engine convention: highestAllyMaxHpPct → maxHpFlat, value = (15.03/100) × max(static
    // maxHp over the team) snapshotted at apply time (sim.ts applyBuff path — mirrored below).
    const applied = buffs(base.events).filter(
      (b) =>
        b.stat === 'maxHpFlat' && b.casterIdx === SIN && b.targetIdx === SIN
    );

    it('applies on every magazine-empty (lastBullet cadence), for 5 sec each', () => {
      // Magazine empties are read off the engine's own reload events, NOT pulls/60: liter's
      // escalating team maxAmmoPct 45.17% (5s window per liter cast) stretches sin's magazine
      // live, so no pulls÷ammo arithmetic holds in this comp. Each empty starts one 'magazine'
      // reload; at most one empty (the fight's last) can lack its completion event inside the
      // 180s window.
      const reloads = base.events.filter(
        (e) => e.kind === 'reload' && e.slug === 'sin'
      ).length;
      expect(reloads).toBeGreaterThan(0);
      expect(
        applied.length,
        `${applied.length} grants vs ${reloads} completed magazine reloads`
      ).toBeGreaterThanOrEqual(reloads);
      expect(applied.length).toBeLessThanOrEqual(reloads + 1);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '"lasts for 5 sec"'
      ).toEqual([5 * FPS]);
    });

    it('grants exactly 15.03% of the highest STATIC Max HP in the team', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        (15.03 / 100) * STATIC_MAX_HP,
      ]);
    });

    it('is SELF-scoped: no maxHpFlat grant touches any other unit', () => {
      const all = buffs(base.events).filter((b) => b.stat === 'maxHpFlat');
      expect(all.length).toBeGreaterThan(0);
      expect(
        all.every((b) => b.casterIdx === SIN && b.targetIdx === SIN)
      ).toBe(true);
    });

    it('is offensively inert (no HP→ATK conversion in her kit): byte-equal team totals', () => {
      expect(base.totals).toEqual(noDup.totals);
    });

    it('DISCRIMINATING: the level-1 magnitude 7.94 grants strictly less Max HP', () => {
      const wrong = buffs(wrongDup.events).filter(
        (b) =>
          b.stat === 'maxHpFlat' && b.casterIdx === SIN && b.targetIdx === SIN
      );
      expect(wrong.length).toBeGreaterThan(0);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([
        (7.94 / 100) * STATIC_MAX_HP,
      ]);
    });

    it('ROSTER-TIE PROOF: a self-% basis is value-identical (sin is always the maxHp max)', () => {
      // All Defenders share the identical static-HP basis and no non-Defender reaches it, so
      // (15.03% of the team max) === (15.03% of her own) for ANY team — the basis is
      // structurally undecidable in v1, and the selfRef counterfactual must be EQUIVALENT.
      const selfRef = buffs(selfRefDup.events).filter(
        (b) =>
          b.stat === 'maxHpFlat' && b.casterIdx === SIN && b.targetIdx === SIN
      );
      expect([...new Set(selfRef.map((b) => b.value))]).toEqual([
        (15.03 / 100) * STATIC_MAX_HP,
      ]);
      expect(selfRefDup.totals).toEqual(base.totals);
    });
  });

  describe('SN3 — S2 grants herself Burst Gauge filling speed ▲16.17% when Full Burst ENDS', () => {
    const applied = buffs(base.events).filter(
      (b) => b.stat === 'burstGenPct' && b.casterIdx === SIN
    );
    const endFrames = fbEnds(base.events)
      .map((e) => e.frame)
      .sort((a, b) => a - b);

    it('fires once per Full Burst END — frame-exactly on the fullBurstEnd events', () => {
      expect(endFrames.length).toBeGreaterThan(0);
      expect(applied.length).toBe(endFrames.length);
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        endFrames
      );
    });

    it('is 16.17% for 5 sec, held by sin alone', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([16.17]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))]
      ).toEqual([5 * FPS]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SIN]);
    });

    it('is LIVE: her gauge generation strictly rises with the window', () => {
      expect(unitOf(base.res, 'sin').gaugeGenerated).toBeGreaterThan(
        unitOf(noGauge.res, 'sin').gaugeGenerated
      );
    });

    it('is damage-INERT here: the rotation is CD-limited (byte-equal team totals)', () => {
      expect(base.totals).toEqual(noGauge.totals);
    });

    it('DISCRIMINATING: fullBurstEnter keying shifts the window ~10s early', () => {
      const wrong = buffs(wrongGaugeTrigger.events).filter(
        (b) => b.stat === 'burstGenPct' && b.casterIdx === SIN
      );
      expect(wrong.length).toBe(endFrames.length);
      expect(
        wrong.map((b) => b.frame).sort((a, b) => a - b),
        'a fullBurstEnter-keyed window cannot land on the fullBurstEnd frames'
      ).not.toEqual(endFrames);
    });
  });

  describe('SN4 — burst-usage escalation: DEF ▲43.2% from the 3rd cast on, cumulative', () => {
    // The escalation is a resource pool ('burstUses', +1 per own burstCast, blocks gated on the
    // PRE-increment value — soda-twinkling slot-order precedent): defPct carries
    // resourceGate {min: 2}, so casts 1–2 do NOT grant it and every cast from the 3rd does.
    const casts = sinBursts(base.events);
    const applied = sinDef(base.events);

    it('escalates: no DEF on casts 1–2, DEF on EVERY cast from the 3rd (cumulative)', () => {
      expect(casts.length).toBeGreaterThanOrEqual(3);
      expect(applied.length).toBe(casts.length - 2);
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        casts.slice(2).map((c) => c.frame)
      );
    });

    it('is 43.2% for 5 sec, held by sin alone', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([43.2]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))]
      ).toEqual([5 * FPS]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SIN]);
    });

    it('is offensively inert (v1 DEF never feeds own damage): byte-equal team totals', () => {
      expect(base.totals).toEqual(instantMax.totals);
    });

    it('DISCRIMINATING: instant-max grants DEF on ALL casts; cast-3-only on exactly ONE', () => {
      expect(sinDef(instantMax.events).length).toBe(casts.length);
      expect(sinDef(cast3Only.events).length).toBe(1);
    });
  });

  describe('SN6 — the enemies>4 Damage Taken debuff is faithfully never-on at single-boss scope', () => {
    it('ABSENCE CANARY: no damageTakenPct application from sin (the gate cannot be met)', () => {
      expect(
        buffs(base.events).filter(
          (b) => b.casterIdx === SIN && b.stat === 'damageTakenPct'
        )
      ).toEqual([]);
    });
  });
});
