// PER-UNIT KIT SPEC — `belorta-pumpkin-witch` (Belorta: Pumpkin Witch, aka "bpw"; RL / Supporter /
// Water / Tetra, Burst II, cd 40s, ammo 6, chargeFrames 60). NEW unit — a VARIANT of the base unit
// `belorta` (RL/Electric Attacker), an entirely different kit; this file is the variant only.
// Kit-autonomy gauntlet 2026-10-09. Tier 2 (positional "ally to the right" scope, a self-status
// gate, burstCast-vs-fullBurstEnter identity).
//
// One assertion group per KIT LINE (P1..P6), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters['belorta-pumpkin-witch'].skills, SL10):
//   S1 ■ entering Full Burst → self:
//        Ghost Costume: untargetable by single-target attacks 10s, removed on a direct hit   [P1]
//        Prank Preparation: Max HP ▲ 15.84% for 10 sec                                       [P2]
//      ■ entering Full Burst → the ally to the right: ATK ▲ 44.88% of the skill user's ATK 10s [P3]
//   S2 ■ landing a Full Charge attack WHILE in Ghost Costume → the target:
//        Ghostly Prank: Damage Taken ▲ 10.56% for 10 sec                                     [P4]
//      ■ performing a Full Charge attack → the ally to the right: Sustained Damage ▲ 19.97% 5s [P5]
//   BU ■ the ally to the right: ATK ▲ 47.52% of the skill user's ATK 10s;
//        Sustained Damage ▲ 27.23% 10s                                                        [P6]
//
// UNMODELED / ⚑ (documented in the override, not asserted):
//   - Ghost Costume's targeting immunity + "removed upon taking a direct hit": the v1 sim has no
//     incoming damage (the boss never attacks), so the immunity moves nothing and the removal never
//     fires — the status runs its full 10s (theme 2). Only its role as S2's GATE is modeled (P1/P4).
//   - "Landing" a Full Charge: the RL homing rocket is credited as landing on its full-charge pull.
//
// Why each assertion discriminates:
//   P1/P4 The Ghost Costume status opens ONLY at Full Burst entry for 10s, so Ghostly Prank (enemy
//        Damage Taken) applies ONLY on her full charges inside [FB start, FB start + 600f). The
//        nearest-wrong reading — dropping the gate (every full charge) — applies outside those
//        windows too; a self-status that never opens (gate on, producer missing) applies nothing.
//   P2   A self Max HP grant (targetMaxHpPct → maxHpFlat) on every FB entry, 10s; damage-INERT for
//        her (no HP-scaling ATK line): every total byte-identical without it. Counterfactual
//        silent-drop has no event.
//   P3   Keys to FULL BURST ENTRY (every FB, including the ones where crown — not she — cast stage
//        2), never to her own burst cast; lands on exactly ONE unit, the slot to her right
//        (scarlet), never herself or the left neighbour. Counterfactuals: burstCast keying (misses
//        the crown-cast FBs), `allies` scope (5 holders), target-scaled atkPct (a different stat).
//   P5   One application per full-charge pull, to the right ally only, 5s; counterfactual self
//        target / allies scope change the holder set.
//   P6   Keys to HER OWN burst cast (cast frame, before FB opens), right ally only, both effects 10s;
//        counterfactual fullBurstEnter keying fires on every FB including crown-cast ones.
//   EDGE In the rightmost slot she has NO ally to her right: P3/P5/P6 grant nothing to anyone (the
//        literal reading — ⚑ in the override); the self-side lines (P1/P2/P4) are unaffected.
//
// Fixture: liter (B1) / belorta-pumpkin-witch (B2, slot 1) / scarlet (B3, slot 2 = the ally to her
// right) / helm (B3) / crown (B2, slot 4 — covers stage 2 while her 40s cooldown is down, so some
// Full Bursts happen WITHOUT her cast). Boss Fire, focus scarlet. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'belorta-pumpkin-witch';
const FPS = 60;
const MAIN = ['liter', SLUG, 'scarlet', 'helm', 'crown'];
const EDGE = ['liter', 'crown', 'scarlet', 'helm', SLUG];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(slugs: string[], ov?: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'scarlet',
    overrides: ov ? { [SLUG]: ov } : {},
    cfg: { onEvent: (e) => events.push(e) },
  });
  const idx = slugs.indexOf(SLUG);
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  const casts = events
    .filter((e) => e.kind === 'burstCast' && e.slug === SLUG)
    .map((e) => e.frame);
  const charged = events
    .filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG && e.charged)
    .map((e) => e.frame);
  const mine = events.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === idx
  );
  return {
    events,
    idx,
    fbStarts,
    casts,
    charged,
    mine,
    totals: totals(res),
    staticAtk: unitOf(res, SLUG).staticAtk,
  };
}
type Run = ReturnType<typeof run>;

const bySlot = (r: Run, slot: string, stat: string) =>
  r.mine.filter((b) => b.key.split(':')[1] === slot && b.stat === stat);
const uniq = <T>(xs: T[]) => [...new Set(xs)].sort((a: any, b: any) => a - b);
const inGhost = (r: Run, f: number) =>
  r.fbStarts.some((s) => f >= s && f < s + 10 * FPS);
/** FB starts NOT preceded by her own stage-2 cast in the same chain (crown cast instead). */
const fbWithoutHerCast = (r: Run) =>
  r.fbStarts.filter((s) => !r.casts.some((c) => c < s && s - c <= 120));

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const findBlock = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) {
    throw new Error(`${SLUG} ${slot} block missing — fixture is stale`);
  }
  return b;
};
const hasStat = (stat: string) => (b: any) =>
  b.effects.some((e: any) => e.stat === stat);
const isStatus = (b: any) =>
  b.effects.some((e: any) => e.kind === 'selfStatus');

const main = run(MAIN);
const edge = run(EDGE);
const RIGHT = main.idx + 1;

describe(`${SLUG} — fixture`, () => {
  it('she is slot 1, scarlet is the ally to her right, crown backs up stage 2', () => {
    expect(main.idx).toBe(1);
    expect(MAIN[RIGHT]).toBe('scarlet');
  });
  it('she casts her burst, and some Full Bursts happen without her cast', () => {
    expect(main.casts.length).toBeGreaterThanOrEqual(2);
    expect(fbWithoutHerCast(main).length).toBeGreaterThanOrEqual(1);
    expect(main.charged.length).toBeGreaterThan(20);
  });
});

describe('P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s', () => {
  const prank = bySlot(main, 'skill2', 'damageTakenPct');

  it('the Ghost Costume self-status block is FB-entry keyed, self, 10s', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    const b = findBlock(ov, 'skill1', isStatus);
    expect(b.trigger.kind).toBe('fullBurstEnter');
    expect(b.target.kind).toBe('self');
    const st = b.effects.find((e: any) => e.kind === 'selfStatus');
    expect(st.name).toBe('Ghost Costume');
    expect(st.durationSec).toBe(10);
  });

  it('Ghostly Prank lands on the BOSS, value 10.56, 10s, on full-charge frames only', () => {
    expect(prank.length).toBeGreaterThan(0);
    for (const b of prank) {
      expect(b.targetIdx).toBeNull();
      expect(b.value).toBe(10.56);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(main.charged).toContain(b.frame);
    }
  });

  it('applies ONLY while Ghost Costume is up (inside 10s of an FB entry), on EVERY such charge', () => {
    for (const b of prank) {
      expect(inGhost(main, b.frame)).toBe(true);
    }
    const gatedCharges = main.charged.filter((f) => inGhost(main, f));
    expect(uniq(prank.map((b) => b.frame))).toEqual(uniq(gatedCharges));
  });

  it('DISCRIMINATING: dropping the gate applies it on full charges OUTSIDE Ghost Costume', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        delete findBlock(ov, 'skill2', hasStat('damageTakenPct'))
          .requiresSelfStatus;
      })
    );
    const out = bySlot(cf, 'skill2', 'damageTakenPct').filter(
      (b) => !inGhost(cf, b.frame)
    );
    expect(out.length).toBeGreaterThan(0);
    expect(cf.totals.scarlet).toBeGreaterThan(main.totals.scarlet);
  });

  it('DISCRIMINATING: without the Ghost Costume producer the gate never opens', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        ov.skill1 = ov.skill1.filter((b: any) => !isStatus(b));
      })
    );
    expect(bySlot(cf, 'skill2', 'damageTakenPct')).toEqual([]);
  });

  it('IS LOAD-BEARING: the team deals more with Ghostly Prank than without it', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        ov.skill2 = ov.skill2.filter((b: any) => !hasStat('damageTakenPct')(b));
      })
    );
    expect(main.totals.helm).toBeGreaterThan(cf.totals.helm);
  });
});

describe('P2 — Prank Preparation: self Max HP ▲ 15.84% for 10s on FB entry (damage-inert)', () => {
  const hp = bySlot(main, 'skill1', 'maxHpFlat');

  it('applies on every FB entry, to herself only, 10s', () => {
    expect(uniq(hp.map((b) => b.frame))).toEqual(uniq(main.fbStarts));
    for (const b of hp) {
      expect(b.targetIdx).toBe(main.idx);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
  });

  it('is inert: every total byte-identical without it', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        for (const b of ov.skill1) {
          b.effects = b.effects.filter((e: any) => e.stat !== 'targetMaxHpPct');
        }
        ov.skill1 = ov.skill1.filter((b: any) => b.effects.length);
      })
    );
    expect(bySlot(cf, 'skill1', 'maxHpFlat')).toEqual([]);
    expect(cf.totals).toEqual(main.totals);
  });
});

describe('P3 — FB entry: the ally to the right gets ATK ▲ 44.88% of her ATK for 10s', () => {
  const atk = bySlot(main, 'skill1', 'casterAtkPct');

  it('fires on EVERY Full Burst entry (crown-cast ones too), to exactly the right ally', () => {
    expect(atk.length).toBe(main.fbStarts.length);
    expect(uniq(atk.map((b) => b.frame))).toEqual(uniq(main.fbStarts));
    expect(uniq(atk.map((b) => b.targetIdx))).toEqual([RIGHT]);
  });

  it('is a flat 44.88% of HER static ATK, 10s', () => {
    for (const b of atk) {
      expect(b.value).toBeCloseTo((44.88 / 100) * main.staticAtk, 1);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
  });

  it('DISCRIMINATING: a burstCast keying misses the Full Bursts she did not cast', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'skill1', hasStat('casterAtkPct')).trigger = {
          kind: 'burstCast',
        };
      })
    );
    const frames = bySlot(cf, 'skill1', 'casterAtkPct').map((b) => b.frame);
    for (const f of fbWithoutHerCast(main)) {
      expect(frames).not.toContain(f);
    }
    expect(frames.length).toBeLessThan(atk.length);
  });

  it('DISCRIMINATING: an all-allies scope grants five holders, not one', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'skill1', hasStat('casterAtkPct')).target = {
          kind: 'allies',
        };
      })
    );
    expect(
      uniq(bySlot(cf, 'skill1', 'casterAtkPct').map((b) => b.targetIdx))
    ).toEqual([0, 1, 2, 3, 4]);
    expect(cf.totals.helm).toBeGreaterThan(main.totals.helm);
  });

  it('IS LOAD-BEARING for the right ally: scarlet deals more with it', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        ov.skill1 = ov.skill1.filter((b: any) => !hasStat('casterAtkPct')(b));
      })
    );
    expect(main.totals.scarlet).toBeGreaterThan(cf.totals.scarlet);
    expect(cf.totals.helm).toBe(main.totals.helm);
  });
});

describe('P5 — full charge: the ally to the right gets Sustained Damage ▲ 19.97% for 5s', () => {
  const sus = bySlot(main, 'skill2', 'sustainedDamagePct');

  it('one application per full-charge pull, to the right ally only, 19.97, 5s', () => {
    expect(uniq(sus.map((b) => b.frame))).toEqual(uniq(main.charged));
    expect(sus.length).toBe(main.charged.length);
    for (const b of sus) {
      expect(b.targetIdx).toBe(RIGHT);
      expect(b.value).toBe(19.97);
      expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
    }
  });

  it('DISCRIMINATING: a self-target reading changes the holder', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'skill2', hasStat('sustainedDamagePct')).target = {
          kind: 'self',
        };
      })
    );
    expect(
      uniq(bySlot(cf, 'skill2', 'sustainedDamagePct').map((b) => b.targetIdx))
    ).toEqual([main.idx]);
  });

  it('is NOT gated on Ghost Costume (applies outside FB windows too)', () => {
    expect(sus.some((b) => !inGhost(main, b.frame))).toBe(true);
  });
});

describe('P6 — burst: the ally to the right gets ATK ▲ 47.52% of her ATK + Sustained Damage ▲ 27.23%, 10s', () => {
  const atk = bySlot(main, 'burst', 'casterAtkPct');
  const sus = bySlot(main, 'burst', 'sustainedDamagePct');

  it('both effects land on HER cast frames only, right ally only, 10s', () => {
    expect(uniq(atk.map((b) => b.frame))).toEqual(uniq(main.casts));
    expect(uniq(sus.map((b) => b.frame))).toEqual(uniq(main.casts));
    expect(atk.length).toBe(main.casts.length);
    expect(sus.length).toBe(main.casts.length);
    for (const b of [...atk, ...sus]) {
      expect(b.targetIdx).toBe(RIGHT);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
    for (const b of atk) {
      expect(b.value).toBeCloseTo((47.52 / 100) * main.staticAtk, 1);
    }
    for (const b of sus) {
      expect(b.value).toBe(27.23);
    }
  });

  it('DISCRIMINATING: a fullBurstEnter keying fires on the Full Bursts she did not cast', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'burst', hasStat('casterAtkPct')).trigger = {
          kind: 'fullBurstEnter',
        };
      })
    );
    const frames = bySlot(cf, 'burst', 'casterAtkPct').map((b) => b.frame);
    for (const f of fbWithoutHerCast(main)) {
      expect(frames).toContain(f);
    }
  });

  it('IS LOAD-BEARING for the right ally: scarlet deals more with the burst ATK grant', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        for (const b of ov.burst) {
          b.effects = b.effects.filter((e: any) => e.stat !== 'casterAtkPct');
        }
      })
    );
    expect(main.totals.scarlet).toBeGreaterThan(cf.totals.scarlet);
  });
});

describe('EDGE — rightmost slot: no ally to her right', () => {
  it('no ally-side grant from her reaches anyone but herself', () => {
    expect(edge.idx).toBe(4);
    const allyGrants = edge.mine.filter(
      (b) => b.targetIdx !== null && b.targetIdx !== edge.idx
    );
    expect(allyGrants).toEqual([]);
  });
  it('the self-side lines still work (Ghost Costume gate + Max HP)', () => {
    expect(bySlot(edge, 'skill1', 'maxHpFlat').length).toBe(
      edge.fbStarts.length
    );
    expect(bySlot(edge, 'skill2', 'damageTakenPct').length).toBeGreaterThan(0);
  });
});
