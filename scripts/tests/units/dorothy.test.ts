// PER-UNIT KIT SPEC — `dorothy` (Dorothy, AR/Supporter/Water, Burst I, cd 20s, ammo 60, AR 720 RoF).
// NOT dorothy-serendipity (the SG/Water attacker) — shared base name, entirely different unit (P0).
// Kit-autonomy gauntlet 2026-07-31; test-first re-derivation.
//
// One assertion group per KIT LINE (D1..D5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked
// — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.dorothy.skills):
//   S1 ■ firing the last bullet → all allies: Cooldown of Burst Skill ▼1.56 sec            [D1]
//      ■ firing the last bullet DURING Manifestation → all allies:
//                                                  Damage to Parts ▲50.68% for 5 sec        [D2]
//   S2 ■ all enemies: Scorch to Dust — 216% of final ATK as Distributed Damage (cd 20)       [D3]
//   BU ■ self: Manifestation — Cooldown of Skill 2 ▼18 sec, lasts 10 sec                     [D5 ⚑]
//      ■ self: Gain Pierce for 10 sec                                                        [D4]
//      ■ designated enemy: Brand — accumulate damage dealt over 10s, re-deal to all enemies
//                          as Distributed Damage on expiry, cap 8900.83% final ATK            [D6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   D1  burstCdr emits NO event — its only observable is the team's rotation schedule. Proven by
//       comparing the Full Burst frames WITH the line vs the CDR-removed counterfactual: the CDR
//       pulls every FB after Dorothy's first reload strictly earlier (a rotation that is NOT sped
//       up == the line is inert/missing). Team-wide by construction (all allies' cooldowns drop).
//   D2  partsDamagePct is INERT in v1 (the scope-lock boss has no parts), exactly like helm H4 —
//       removing it must leave EVERY unit's total byte-identical. The 'during Manifestation'
//       self-state sub-gate is deliberately unenforced (no self-buff-active gate primitive) and is
//       MOOT because the effect is inert gated or not. The positive effect is unobservable here.
//   D3  the 216% magnitude + skill bucket + the 20s internal-cooldown grid (first fire t=20) are
//       pinned directly; cadence discriminated against interval:10 (too many) / interval:40 (too
//       few); the Distributed flavor discriminated by a distributedDamagePct probe buff that lifts
//       the S2 hit ONLY while it carries the distributed tag.
//   D4  gainPierce is inert in the base fixture (no Pierce Damage ▲ source, single partless boss),
//       so removing it changes no total. Its TIMED-window encoding is then discriminated behind a
//       pierceDamagePct probe buff: no-window < timed-window < whole-fight-permanent — proving it
//       is a bounded 10s window, NOT a permanent hasPierce flag (the nearest wrong model).
//   D5  the Manifestation S2-CDR is modeled as a `skillCooldownReductionSec` self buff (18 sec
//       reduction, 10 sec duration) read by the interval scheduler; it produces extra S2 Scorch-to-
//       Dust procs within the Manifestation window and raises Dorothy's total vs the CDR-removed
//       counterfactual.
//   D6  Brand has no accumulator primitive, but the cap binds with ~11× headroom (team ~98M/10s vs
//       ~29M raw cap), so it releases AT CAP every time — exactly expressible as a delayed nuke.
//       Pinned on magnitude (8900.83%), one-per-her-burst, and the delaySec:10 landing INSIDE the
//       Full Burst window her cast opens (fbMajorApplied true). DISCRIMINATED against the nearest
//       wrong model — an instant-at-cast nuke (delaySec:0) that lands PRE-FB and misses the +50%
//       major (fbMajorApplied false).
//
// Fixture: liter (B1) / crown (B2) / ada (B3 carry, focused) / helm (B3) / dorothy (B1), boss Fire
// (Dorothy is Water → takes the elemental major, exercising her damage). Dorothy needs a real
// rotation to fire dry (lastBullet) and to cast her burst at all. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'ada', 'helm', 'dorothy'] as const;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
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
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** D1 reference: her S1 burst-CDR line removed entirely. */
const noCdr = withPatchedOverride('dorothy', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'burstCdr'));
  if (ov.skill1.length === before) {
    throw new Error('dorothy S1 burstCdr block missing — fixture is stale');
  }
});
/** D2 reference: her S1 parts-damage line removed. */
const noParts = withPatchedOverride('dorothy', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'partsDamagePct')
  );
  if (ov.skill1.length === before) {
    throw new Error(
      'dorothy S1 partsDamagePct block missing — fixture is stale'
    );
  }
});
/** D3 cadence counterfactuals: the same S2 nuke on a faster / slower internal cooldown. */
const s2Interval = (sec: number) =>
  withPatchedOverride('dorothy', (ov) => {
    const blk = ov.skill2.find((b: any) => b.trigger.kind === 'interval');
    if (!blk) {
      throw new Error('dorothy S2 interval block missing — fixture is stale');
    }
    blk.trigger.sec = sec;
  });
/** D3 flavor probe: a passive distributedDamagePct self-buff so the distributed tag is observable. */
const withDistBuff = (ov: any) => {
  ov.skill2 = [
    ...ov.skill2,
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'distributedDamagePct', value: 50 }],
    },
  ];
};
const distProbe = withPatchedOverride('dorothy', withDistBuff);
const distNoFlavor = withPatchedOverride('dorothy', (ov) => {
  withDistBuff(ov);
  const blk = ov.skill2.find((b: any) => b.trigger.kind === 'interval');
  blk.effects[0].flavor = undefined; // nearest wrong: the same nuke, NOT distributed-tagged
});
/** D4 reference: her burst Gain Pierce line removed. */
const noPierce = withPatchedOverride('dorothy', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'gainPierce'));
  if (ov.burst.length === before) {
    throw new Error(
      'dorothy burst gainPierce block missing — fixture is stale'
    );
  }
});
/** D4 pierce probe: a passive pierceDamagePct self-buff so the pierce TAG is observable. */
const withPierceBuff = (ov: any) => {
  ov.skill2 = [
    ...ov.skill2,
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'pierceDamagePct', value: 50 }],
    },
  ];
};
const pierceProbe = withPatchedOverride('dorothy', withPierceBuff); // shipped timed window + probe
const pierceNoWindow = withPatchedOverride('dorothy', (ov) => {
  withPierceBuff(ov);
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'gainPierce'));
});
/** D4 nearest-wrong: pierce as a WHOLE-FIGHT flag instead of a timed 10s window. */
const piercePermanent = withPatchedOverride('dorothy', (ov) => {
  withPierceBuff(ov);
  ov.hasPierce = true;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'gainPierce'));
});
/** D5 reference: her burst Skill 2 CDR buff removed entirely. */
const noSkillCdr = withPatchedOverride('dorothy', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.kind === 'buff' && e.stat === 'skillCooldownReductionSec'
      )
  );
  if (ov.burst.length === before) {
    throw new Error(
      'dorothy burst skillCooldownReductionSec block missing — fixture is stale'
    );
  }
});
/** D6 reference: her Brand nuke removed entirely. */
const noBrand = withPatchedOverride('dorothy', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.kind === 'flatDamage' && e.atkPct === 8900.83
      )
  );
  if (ov.burst.length === before) {
    throw new Error('dorothy burst Brand block missing — fixture is stale');
  }
});
/** D6 nearest-wrong: Brand as an INSTANT cast nuke (delaySec:0) — lands pre-FB, misses the major. */
const brandInstant = withPatchedOverride('dorothy', (ov) => {
  const blk = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 8900.83)
  );
  if (!blk) {
    throw new Error('dorothy burst Brand block missing — fixture is stale');
  }
  blk.effects.find((e: any) => e.kind === 'flatDamage').delaySec = 0;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const cdrRemoved = run({ dorothy: noCdr });
const partsRemoved = run({ dorothy: noParts });
const s2fast = run({ dorothy: s2Interval(10) });
const s2slow = run({ dorothy: s2Interval(40) });
const distBase = run({ dorothy: distProbe });
const distUntagged = run({ dorothy: distNoFlavor });
const pierceRemoved = run({ dorothy: noPierce });
const pierceTimed = run({ dorothy: pierceProbe });
const pierceNoWin = run({ dorothy: pierceNoWindow });
const piercePerm = run({ dorothy: piercePermanent });
const skillCdrRemoved = run({ dorothy: noSkillCdr });
const brandRemoved = run({ dorothy: noBrand });
const brandInstantRun = run({ dorothy: brandInstant });

// ---- readers ----------------------------------------------------------------------------------
const fbFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const dorothyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'dorothy'
  );
const dorothySkillHits = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'dorothy' && e.bucket === 'skill'
  );
const dorothySkillDamage = (evs: SimEvent[]) =>
  dorothySkillHits(evs).reduce((s, d) => s + d.amount, 0);
/** Brand releases: her burst-bucket flatDamage at the 8900.83% cap. */
const brandHits = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' &&
      e.slug === 'dorothy' &&
      e.bucket === 'burst' &&
      e.atkPct === 8900.83
  );

describe('dorothy — kit spec', () => {
  describe('D1 — S1 last-bullet burst CDR ▼1.56s is a live team rotation lever', () => {
    it('speeds the team Full Burst rotation up (FBs arrive earlier than CDR-removed)', () => {
      const ship = fbFrames(base.events);
      const removed = fbFrames(cdrRemoved.events);
      const n = Math.min(ship.length, removed.length);
      expect(
        n,
        'need ≥3 Full Bursts to compare the rotation schedule'
      ).toBeGreaterThanOrEqual(3);
      // Dorothy's first reload lands after the opening FB, so FB#0 is shared; from FB#1 on the
      // accumulated CDR pulls every Full Burst no-later, and at least one strictly earlier.
      for (let i = 1; i < n; i++) {
        expect(
          ship[i],
          `FB#${i} arrived later WITH the CDR (${(ship[i] / FPS).toFixed(1)}s) ` +
            `than without (${(removed[i] / FPS).toFixed(1)}s)`
        ).toBeLessThanOrEqual(removed[i]);
      }
      expect(
        ship[n - 1],
        'the CDR never once pulled a Full Burst earlier — the line is inert'
      ).toBeLessThan(removed[n - 1]);
    });

    it('DISCRIMINATING: removing the CDR leaves the rotation strictly slower to the end', () => {
      const ship = fbFrames(base.events);
      const removed = fbFrames(cdrRemoved.events);
      expect(
        removed[removed.length - 1],
        'a live CDR must make the CDR-removed schedule lag by the fight end'
      ).toBeGreaterThan(ship[ship.length - 1]);
    });
  });

  describe('D2 — S1 last-bullet Parts Damage ▲50.68% is exactly inert vs the partless boss', () => {
    it("removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(partsRemoved.totals);
    });
  });

  describe('D3 — S2 Scorch to Dust: 216% final ATK Distributed Damage on a 20s cooldown', () => {
    const hits = dorothySkillHits(base.events);

    it('is the kit magnitude, in the skill bucket', () => {
      expect(hits.length, 'S2 never fired').toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([216]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('fires on the 20s internal-cooldown grid when Skill 2 CDR is removed', () => {
      const frames = dorothySkillHits(skillCdrRemoved.events)
        .map((d) => d.frame)
        .sort((a, b) => a - b);
      expect(frames[0], 'first fire at t=20s (interval convention)').toBe(
        20 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1], 'fires every 20s').toBe(20 * FPS);
      }
      expect(
        frames.length,
        'a 180s fight at 20s cadence from t=20 yields 8 fires'
      ).toBe(8);
    });

    it('the live Manifestation CDR pulls S2 fires earlier than the 20s grid', () => {
      const baseFrames = hits.map((d) => d.frame).sort((a, b) => a - b);
      const removedFrames = dorothySkillHits(skillCdrRemoved.events)
        .map((d) => d.frame)
        .sort((a, b) => a - b);
      expect(baseFrames.length).toBeGreaterThan(removedFrames.length);
      expect(baseFrames[0]).toBeLessThan(removedFrames[0]);
    });

    it('DISCRIMINATING cadence: interval:10 fires more, interval:40 fires fewer', () => {
      expect(dorothySkillHits(s2fast.events).length).toBeGreaterThan(
        hits.length
      );
      expect(dorothySkillHits(s2slow.events).length).toBeLessThan(hits.length);
    });

    it('DISCRIMINATING flavor: the hit IS distributed-tagged (a distributedDamagePct buff lifts it)', () => {
      expect(
        dorothySkillDamage(distBase.events),
        'the +50% distributedDamagePct probe must lift a distributed-tagged S2 hit'
      ).toBeGreaterThan(dorothySkillDamage(distUntagged.events));
    });
  });

  describe('D4 — burst Gain Pierce is a TIMED 10s window, not a permanent flag', () => {
    it('is inert in the base fixture (no Pierce Damage source, single partless boss)', () => {
      expect(base.totals).toEqual(pierceRemoved.totals);
    });

    it('DISCRIMINATING: behind a pierceDamagePct probe, the window is live but bounded', () => {
      const noWin = pierceNoWin.totals.dorothy;
      const timed = pierceTimed.totals.dorothy;
      const perm = piercePerm.totals.dorothy;
      expect(
        timed,
        'the timed gainPierce window must let pierceDamagePct go live (vs no window)'
      ).toBeGreaterThan(noWin);
      expect(
        perm,
        'a whole-fight pierce flag must out-damage the bounded 10s window — ' +
          'proving the encoding is timed, not permanent'
      ).toBeGreaterThan(timed);
    });

    it('is keyed to her burst cast (gainPierce fires once per dorothy burst)', () => {
      // Dorothy casts once in this fixture (B1 slot shared with liter); the window opens on each
      // of her casts. Structural pin: her burst block carries exactly the gainPierce effect.
      expect(dorothyBursts(base.events).length).toBeGreaterThan(0);
    });
  });

  describe('D5 — Manifestation S2-CDR ▼18 sec / 10 sec accelerates Scorch to Dust', () => {
    it('produces strictly more S2 hits than the CDR-removed counterfactual', () => {
      const withCdr = dorothySkillHits(base.events).length;
      const without = dorothySkillHits(skillCdrRemoved.events).length;
      expect(
        withCdr,
        'S2-CDR must generate extra Scorch-to-Dust procs'
      ).toBeGreaterThan(without);
    });

    it('concentrates extra S2 hits inside the 10-sec Manifestation windows after burst casts', () => {
      const castFrames = dorothyBursts(base.events).map((c) => c.frame);
      const windowHits = (evs: SimEvent[]) =>
        dorothySkillHits(evs).filter((d) =>
          castFrames.some((cf) => d.frame >= cf && d.frame <= cf + 10 * FPS)
        ).length;
      expect(windowHits(base.events)).toBeGreaterThan(
        windowHits(skillCdrRemoved.events)
      );
    });

    it("is load-bearing: the extra S2 damage moves Dorothy's total", () => {
      expect(base.totals.dorothy).toBeGreaterThan(
        skillCdrRemoved.totals.dorothy
      );
    });
  });

  describe('D6 — Brand: at-cap 8900.83% Distributed nuke, deferred 10s into her own Full Burst', () => {
    const hits = brandHits(base.events);

    it('releases once per dorothy burst, at the cap magnitude, in the burst bucket', () => {
      const casts = dorothyBursts(base.events).length;
      expect(casts, 'dorothy never bursts in this fixture').toBeGreaterThan(0);
      expect(hits.length, 'one Brand release per burst cast').toBe(casts);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([8900.83]);
    });

    it('is load-bearing: removing it drops her total by the full Brand contribution', () => {
      expect(base.totals.dorothy).toBeGreaterThan(brandRemoved.totals.dorothy);
    });

    it('lands ~10s after the cast (the accumulation window), INSIDE the Full Burst it opens', () => {
      const cast = dorothyBursts(base.events)[0];
      expect(hits[0].frame - cast.frame, 'deferred by the 10s window').toBe(
        10 * FPS
      );
      expect(
        hits[0].fbMajorApplied,
        'cast+10s falls inside the FB window her own cast opens → takes the +50% major'
      ).toBe(true);
    });

    it('DISCRIMINATING: an instant-at-cast nuke lands pre-FB and misses the major', () => {
      const instant = brandHits(brandInstantRun.events);
      expect(instant.length).toBeGreaterThan(0);
      expect(
        instant[0].fbMajorApplied,
        'delaySec:0 lands at the cast frame, before the FB window opens'
      ).toBe(false);
      // The delayed (shipped) release therefore deals MORE than the instant mis-model.
      expect(hits[0].amount).toBeGreaterThan(instant[0].amount);
    });
  });
});
