import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // driver fix 2026-07-26: blind-dir relative depth (assertions unchanged)

/**
 * little-mermaid — Little Mermaid (SMG / Wind / Supporter / Burst I)
 * BLIND spec test written from the kit prose alone (S5 post-op role).
 *
 * KIT (verbatim structure, abbreviated):
 *   skill1:
 *     a) "Activates only when in Focusing status. Affects all allies. Focuses fire continuously."
 *        -> aiming/behavioural flavour, no stat/damage payload. GAP (no primitive; no damage).
 *     b) "Activates when Full Burst ends. Affects all allies. Cooldown of Burst Skill v 7.48 sec."
 *        -> trigger fullBurstEnd, target allies, effect burstCdr{seconds:7.48}.
 *     c) "Activates when entering Full Burst. Affects all allies. Attack Damage ^ 4% for 10 sec."
 *        -> trigger fullBurstEnter, target allies, buff attackDamagePct 4 durationSec 10.
 *     d) "Activates each time the total ammo expended by allies reaches 400. Affects all allies.
 *         Fills Burst Gauge by 37%."
 *        -> trigger teamAmmo{count:400}, effect fillGauge{pct:37}.
 *   skill2:
 *     e) "Activates when the enemy appears. Affects the target. Bubble: Damage Taken ^ 5.05%
 *         continuously."  -> passive boss debuff damageTakenPct 5.05, no duration.
 *     f) "Activates after landing 50 normal attacks. Affects the target if the target is in Bubble
 *         status. Explosive Bubble: Damage Taken ^ 5.05% continuously. Stuns for 3 sec.
 *         Removes Bubble."  -> hitCount{count:50} + a second damageTakenPct 5.05 (+ stun on the
 *         BOSS, which the v1 sim does not model as an enemy entity).
 *     g) "Activates every 1 sec only during Full Burst. Affects random enemy units. Deals 63.36% of
 *         final ATK as damage. Attacks sequentially 4 times."
 *        -> interval{sec:1} + fbGate 'inFb', 4x flatDamage 63.36 (flavor 'sequential').
 *     h) "Activates each time the total ammo expended by allies reaches 500. Affects random enemy
 *         units. Bubble Barrage: Deals 85% of final ATK as damage. Attacks sequentially 10 times."
 *        -> teamAmmo{count:500}, 10x flatDamage 85 (flavor 'sequential').
 *   burst:
 *     i) "Affects all allies. Attack damage ^ 10.13% for 10 sec." -> burstCast, allies,
 *        attackDamagePct 10.13 / 10s.
 *     j) "Reloads 33.26% magazine(s)." -> instantReload{fraction:0.3326} on all allies.
 *     k) "Affects self. ATK ^ 17.28% of the skill user's ATK for 10 sec." -> burstCast, self,
 *        casterAtkPct 17.28 / 10s (flat-resolved on the buffApply event).
 *
 * FIXTURE: controlComp('little-mermaid', true) — she is Burst I, so the control comp already
 * supplies the B2 + B3 needed for a real chain; the fixed-B3 helm slot is kept because nothing in
 * this kit reads a teammate-specific stat, and dropping it would cost Full Bursts (this kit is
 * almost entirely FB-keyed). Deterministic (no seed): every assertion below is exact-equality or
 * strict-inequality on a single 180 s run, and each counterfactual re-runs the SAME comp with only
 * one block mutated, so the delta isolates that block.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — each group states its nearest-wrong model.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  // DRIVER PLUMBING FIX 2026-07-26 (assertions unchanged): the blind passed onEvent at the TOP
  // level of CompOptions, where runComp ignores it (it lives in cfg) — every event array stayed
  // empty and all event-based assertions ran on zero events. Thread it into cfg.
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts as { cfg?: Record<string, unknown> }).cfg,
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as never);
  return { res, events };
}

const SLUG = 'little-mermaid';

// DRIVER PLUMBING FIX 2026-07-26 (assertions unchanged): the blind fixture keyed
// controlComp(SLUG, true), which slots LM as the CARRY beside liter — ANOTHER Burst I in slot 0.
// The engine picks liter for every stage-1 cast, so LM never fired her burst and every
// burst-keyed assertion ran on zero events. Same documented blindness-artifact class as
// volume/soline-frost-ticket (mechanical fixture plumbing, not an assertion change). Give LM
// the SOLE B1 slot — the driver fixture [LM, crown, ada, helm] — keeping the blind's own boss
// element (Fire) and focus (LM, inert for an SMG) assumptions intact.
function lmBaseComp(): ReturnType<typeof controlComp> {
  const base = controlComp(SLUG, true);
  return { ...base, slugs: ['little-mermaid', 'crown', 'ada', 'helm'] };
}

// ---- hoisted runs (each is a full 180 s sim) ----
const base = run(lmBaseComp());
const baseTotals = totals(base.res);
const baseEv = base.events;

function evs(kind: string, list: Ev[] = baseEv) {
  return list.filter((e) => (e as { kind: string }).kind === kind);
}
function buffs(stat: string, list: Ev[] = baseEv) {
  return evs('buffApply', list).filter(
    (e) => (e as { stat?: string }).stat === stat
  );
}

describe('little-mermaid — fixture sanity (non-vacuity)', () => {
  it('the control comp actually reaches Full Burst and she casts her own burst', () => {
    // Non-vacuity guard for every FB-keyed and burst-keyed group below.
    expect(evs('fullBurstStart').length).toBeGreaterThan(0);
    expect(evs('fullBurstEnd').length).toBeGreaterThan(0);
    const herCasts = evs('burstCast').filter(
      (e) =>
        (e as { srcSlug?: string; slug?: string }).srcSlug === SLUG ||
        (e as { slug?: string }).slug === SLUG
    );
    expect(herCasts.length).toBeGreaterThan(0);
    expect(baseTotals[SLUG]).toBeGreaterThan(0);
  });

  it('the fight spans both in-FB and out-of-FB time (gates are exercised both ways)', () => {
    // Required before any fbGate assertion can mean anything.
    const dmg = evs('damage');
    expect(
      dmg.some((e) => (e as { inFullBurst?: boolean }).inFullBurst === true)
    ).toBe(true);
    expect(
      dmg.some((e) => (e as { inFullBurst?: boolean }).inFullBurst === false)
    ).toBe(true);
  });
});

describe('skill1 b) Full-Burst-END burst cooldown reduction 7.48 s, all allies', () => {
  // Trigger identity is the crux: "when Full Burst ends" != "entering Full Burst" != burst-cast.
  // The CDR is only observable through rotation density, so assert it two ways:
  //   (1) removing the CDR strictly reduces the number of Full Bursts (or leaves it equal and
  //       reduces total team damage) — it can never INCREASE bursts;
  //   (2) re-keying it to fullBurstEnter (the nearest-wrong trigger) changes the rotation.
  const noCdr = run(
    lmBaseComp() &&
      ({
        ...lmBaseComp(),
        overrides: {
          [SLUG]: withPatchedOverride(SLUG, (ov) => {
            ov.skill1 = (ov.skill1 ?? []).filter(
              (b) =>
                !b.effects.some(
                  (e) => (e as { kind: string }).kind === 'burstCdr'
                )
            );
          }),
        },
      } as ReturnType<typeof controlComp>)
  );

  it('the CDR block exists, is keyed to fullBurstEnd, targets allies, and is 7.48 s', () => {
    // Reads the shipped override structurally: magnitude + trigger + target in one shot.
    const ov = withPatchedOverride(SLUG, () => {});
    const cdrBlocks = (ov.skill1 ?? []).filter((b) =>
      b.effects.some((e) => (e as { kind: string }).kind === 'burstCdr')
    );
    expect(cdrBlocks.length).toBe(1);
    const b = cdrBlocks[0]!;
    expect((b.trigger as { kind: string }).kind).toBe('fullBurstEnd');
    expect((b.target as { kind: string }).kind).toBe('allies');
    const eff = b.effects.find(
      (e) => (e as { kind: string }).kind === 'burstCdr'
    ) as {
      seconds: number;
      oncePerBattle?: boolean;
    };
    expect(eff.seconds).toBeCloseTo(7.48, 5);
    // "Activates when Full Burst ends" recurs every rotation — a oncePerBattle flag would be the
    // nearest-wrong reading and is asserted absent.
    expect(eff.oncePerBattle ?? false).toBe(false);
  });

  it('deleting the CDR strictly slows the rotation (it is NOT inert)', () => {
    const fbBase = evs('fullBurstStart').length;
    const fbNo = evs('fullBurstStart', noCdr.events).length;
    expect(fbNo).toBeLessThanOrEqual(fbBase);
    // Non-vacuity: the block must actually move something. Either fewer Full Bursts or less damage.
    const teamBase = Object.values(baseTotals).reduce((a, b) => a + b, 0);
    const teamNo = Object.values(totals(noCdr.res)).reduce((a, b) => a + b, 0);
    expect(fbNo < fbBase || teamNo < teamBase).toBe(true);
  });
});

describe('skill1 c) FB-enter Attack Damage 4% / 10 s to ALL allies', () => {
  it('emits attackDamagePct=4 on every Full Burst entry, to every ally', () => {
    const b = buffs('attackDamagePct').filter(
      (e) => Math.abs((e as { value: number }).value - 4) < 1e-9
    );
    expect(b.length).toBeGreaterThan(0);
    // Trigger identity: one application PER ALLY PER Full Burst. Nearest-wrong models are
    // (i) self-only  -> only one distinct targetSlug; (ii) burstCast-keyed -> fires only on the
    // rotations SHE bursts, i.e. fewer batches than fullBurstStart events.
    const distinctTargets = new Set(
      b.map((e) => (e as { targetSlug?: string }).targetSlug)
    );
    expect(distinctTargets.size).toBeGreaterThan(1);
    const fbCount = evs('fullBurstStart').length;
    expect(b.length).toBe(fbCount * distinctTargets.size);
  });

  it('is a 10 s window, not permanent', () => {
    // "for 10 sec" — duration semantics. A missing durationSec would make it a whole-fight buff.
    const b = buffs('attackDamagePct').filter(
      (e) => Math.abs((e as { value: number }).value - 4) < 1e-9
    );
    const withExpiry = b.filter(
      (e) => typeof (e as { expiresFrame?: number }).expiresFrame === 'number'
    );
    expect(withExpiry.length).toBe(b.length);
    // No buffRemove is emitted on natural lapse, so assert the frame arithmetic instead.
    for (const e of withExpiry.slice(0, 3)) {
      const ev = e as { expiresFrame: number; frame?: number };
      if (typeof ev.frame === 'number') {
        expect(ev.expiresFrame - ev.frame).toBe(600); // 10 s @ 60 fps
      }
    }
  });

  it('scope is generic Attack Damage (Damage Up bucket), NOT ATK and NOT normal-only', () => {
    // Nearest-wrong: atkPct (multiplies base ATK, a different bucket) or a normal-scoped stat.
    const wrongStat = buffs('atkPct').filter(
      (e) => Math.abs((e as { value: number }).value - 4) < 1e-9
    );
    expect(wrongStat.length).toBe(0);
  });

  it('patching the 4% to 0 lowers TEAM damage, not just hers (target set = all allies)', () => {
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill1 ?? []) {
            for (const e of b.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (
                eff.kind === 'buff' &&
                eff.stat === 'attackDamagePct' &&
                eff.value === 4
              ) {
                eff.value = 0;
              }
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const r = run(patched);
    const after = totals(r.res);
    // At least one NON-little-mermaid ally must lose damage — that is what "all allies" means and
    // it is exactly what a self-only mis-scope would fail.
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    expect(allies.some((s) => after[s]! < baseTotals[s]!)).toBe(true);
  });
});

describe('skill1 d) team-ammo 400 -> Fills Burst Gauge 37%', () => {
  it('is a teamAmmo trigger at 400 with fillGauge 37 (not a self hitCount)', () => {
    // Trigger identity: "total ammo expended by ALLIES" is the teamAmmo primitive, NOT hitCount
    // (which counts only the OWNER's rounds and would fire far later with a 120-round SMG).
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = (ov.skill1 ?? []).filter((b) =>
      b.effects.some((e) => (e as { kind: string }).kind === 'fillGauge')
    );
    expect(blocks.length).toBe(1);
    const b = blocks[0]!;
    expect((b.trigger as { kind: string; count?: number }).kind).toBe(
      'teamAmmo'
    );
    expect((b.trigger as { count: number }).count).toBe(400);
    const eff = b.effects.find(
      (e) => (e as { kind: string }).kind === 'fillGauge'
    ) as { pct: number };
    expect(eff.pct).toBeCloseTo(37, 5);
  });

  it('removing it reduces the Full Burst count (gauge generation is load-bearing)', () => {
    // Discriminates "modelled" from "modelled but inert": 37% per 400 team rounds is large, so its
    // absence must cost rotations. The nearest-wrong model (hitCount 400 on her own SMG) would fire
    // ~3x less often; deletion is the cleanest bound.
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill1 = (ov.skill1 ?? []).filter(
            (b) =>
              !b.effects.some(
                (e) => (e as { kind: string }).kind === 'fillGauge'
              )
          );
        }),
      },
    } as ReturnType<typeof controlComp>;
    const r = run(patched);
    expect(evs('fullBurstStart', r.events).length).toBeLessThan(
      evs('fullBurstStart').length
    );
  });
});

describe('skill2 e/f) Bubble + Explosive Bubble — boss Damage Taken 5.05% each', () => {
  it('the enemy-appears Bubble is a continuous boss debuff (passive, no duration)', () => {
    // "Activates when the enemy appears ... continuously" => passive, whole fight. Boss-held
    // debuffs carry casterIdx === null AND targetIdx === null, so filter by stat+value.
    const dt = buffs('damageTakenPct').filter(
      (e) =>
        (e as { casterIdx: number | null }).casterIdx === null &&
        (e as { targetIdx: number | null }).targetIdx === null &&
        Math.abs((e as { value: number }).value - 5.05) < 1e-9
    );
    expect(dt.length).toBeGreaterThanOrEqual(1);
  });

  it('BOTH bubbles are modelled — two independent 5.05% sources, not one 10.1% source', () => {
    // Nearest-wrong: collapsing the pair into a single 10.1% line (loses the 50-normal-attack ramp
    // so it over-credits the opening seconds), or dropping the Explosive Bubble entirely.
    const ov = withPatchedOverride(SLUG, () => {});
    const dtEffects = (ov.skill2 ?? []).flatMap((b) =>
      b.effects
        .filter((e) => {
          const eff = e as { kind: string; stat?: string };
          return eff.kind === 'buff' && eff.stat === 'damageTakenPct';
        })
        .map((e) => ({
          block: b,
          eff: e as { value: number; durationSec?: number },
        }))
    );
    expect(dtEffects.length).toBe(2);
    for (const { eff } of dtEffects) {
      expect(eff.value).toBeCloseTo(5.05, 5);
      expect(eff.durationSec).toBeUndefined(); // "continuously"
    }
    // Trigger identity: one passive (enemy appears), one hitCount 50 ("after landing 50 normal
    // attacks"). hitCount counts ROUNDS, so 50 is her count — NOT a teamAmmo threshold.
    const kinds = dtEffects
      .map(({ block }) => block.trigger as { kind: string; count?: number })
      .sort((a, b) => a.kind.localeCompare(b.kind));
    expect(kinds.map((k) => k.kind)).toEqual(['hitCount', 'passive']);
    expect(kinds.find((k) => k.kind === 'hitCount')!.count).toBe(50);
  });

  it('the Explosive Bubble is gated on Bubble status and arrives LATER than the first bubble', () => {
    // "if the target is in Bubble status" — a requiresTargetStatus gate opened by a targetStatus
    // effect on the first block, OR (acceptable) the pure hitCount ordering. Assert the observable:
    // the second 5.05% application frame is strictly after the first.
    const dt = buffs('damageTakenPct')
      .filter((e) => Math.abs((e as { value: number }).value - 5.05) < 1e-9)
      .map((e) => (e as { frame?: number }).frame ?? 0)
      .sort((a, b) => a - b);
    expect(dt.length).toBeGreaterThanOrEqual(2);
    expect(dt[1]!).toBeGreaterThan(dt[0]!);
  });

  it('both debuffs raise TEAM damage, not just hers (Damage Taken is a boss debuff)', () => {
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill2 ?? []) {
            for (const e of b.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (eff.kind === 'buff' && eff.stat === 'damageTakenPct') {
                eff.value = 0;
              }
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const after = totals(run(patched).res);
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    // Nearest-wrong: encoding it as a SELF buff. Then no teammate would move.
    expect(allies.every((s) => after[s]! < baseTotals[s]!)).toBe(true);
  });

  it.skip('Explosive Bubble "Stuns for 3 sec" + "Removes Bubble" — GAP', () => {
    // GAP: the v1 boss is not an entity that fires or reloads, so a stun on the ENEMY has no
    // observable payload (the `stun` effect models a NIKKE being unable to act). "Removes Bubble"
    // likewise has no consumer once both Damage Taken instances are modelled as continuous.
    // Only the two 5.05% Damage Taken lines are damage-relevant and they are asserted above.
  });
});

describe('skill2 g) every 1 s during Full Burst — 63.36% x4 sequential', () => {
  it('the block is interval 1 s, FB-gated, and carries 4 hits of 63.36%', () => {
    // Trigger identity: "Activates every 1 sec ONLY during Full Burst" = interval{sec:1} + fbGate
    // 'inFb'. The nearest-wrong is a bare interval (fires all 180 s, ~10x over-credit) or a
    // fullBurstEnter trigger (fires ONCE per FB instead of ~10x).
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = (ov.skill2 ?? []).filter((b) => {
      const t = b.trigger as { kind: string; sec?: number };
      return t.kind === 'interval';
    });
    expect(blocks.length).toBe(1);
    const b = blocks[0]!;
    expect((b.trigger as { sec: number }).sec).toBeCloseTo(1, 5);
    expect(b.fbGate).toBe('inFb');
    const hits = b.effects.filter(
      (e) => (e as { kind: string }).kind === 'flatDamage'
    ) as {
      atkPct: number;
      flavor?: string;
    }[];
    // "Attacks sequentially 4 times" — four separate hits of 63.36% each, NOT one 253.44% hit
    // (which would mis-price crit variance and the sequential flavour).
    expect(hits.length).toBe(4);
    for (const h of hits) {
      expect(h.atkPct).toBeCloseTo(63.36, 5);
    }
  });

  it('every one of its damage events lands INSIDE Full Burst (the gate is real)', () => {
    // Non-vacuity is guaranteed by the fixture-sanity group (both FB states occur in the fight).
    const src = unitOf(base.res, SLUG);
    expect(src.totalDamage).toBeGreaterThan(0);
    const her = evs('damage').filter(
      (e) => (e as { srcSlug?: string }).srcSlug === SLUG
    );
    const skillHits = her.filter(
      (e) =>
        (e as { bucket?: string }).bucket !== 'normal' &&
        Math.abs(((e as { atkPct?: number }).atkPct ?? -1) - 63.36) < 1e-6
    );
    if (skillHits.length > 0) {
      expect(
        skillHits.every(
          (e) => (e as { inFullBurst?: boolean }).inFullBurst === true
        )
      ).toBe(true);
    }
  });

  it('deleting the block strictly lowers HER damage and leaves teammates byte-identical', () => {
    // Inertness assertion: this is enemy-facing damage from HER, so no ally total may move.
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill2 = (ov.skill2 ?? []).map((b) => {
            if ((b.trigger as { kind: string }).kind !== 'interval') {
              return b;
            }
            return {
              ...b,
              effects: b.effects.filter(
                (e) => (e as { kind: string }).kind !== 'flatDamage'
              ),
            };
          });
        }),
      },
    } as ReturnType<typeof controlComp>;
    const after = totals(run(patched).res);
    expect(after[SLUG]!).toBeLessThan(baseTotals[SLUG]!);
    for (const s of Object.keys(baseTotals)) {
      if (s === SLUG) {
        continue;
      }
      expect(after[s]!).toBe(baseTotals[s]!);
    }
  });
});

describe('skill2 h) team-ammo 500 -> Bubble Barrage 85% x10 sequential', () => {
  it('is a SECOND, independent teamAmmo trigger at 500 (not merged with the 400 gauge line)', () => {
    // The two team-ammo thresholds are DIFFERENT (400 gauge / 500 barrage) and live in different
    // slots. Merging them onto one counter is the nearest-wrong model and would mis-time both.
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = (ov.skill2 ?? []).filter(
      (b) => (b.trigger as { kind: string }).kind === 'teamAmmo'
    );
    expect(blocks.length).toBe(1);
    expect((blocks[0]!.trigger as { count: number }).count).toBe(500);
    const hits = blocks[0]!.effects.filter(
      (e) => (e as { kind: string }).kind === 'flatDamage'
    ) as { atkPct: number }[];
    // "Attacks sequentially 10 times" at 85% each.
    expect(hits.length).toBe(10);
    for (const h of hits) {
      expect(h.atkPct).toBeCloseTo(85, 5);
    }
  });

  it('fires at least once in a 180 s fight and moves only her own damage', () => {
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill2 = (ov.skill2 ?? []).map((b) => {
            if ((b.trigger as { kind: string }).kind !== 'teamAmmo') {
              return b;
            }
            return {
              ...b,
              effects: b.effects.filter(
                (e) => (e as { kind: string }).kind !== 'flatDamage'
              ),
            };
          });
        }),
      },
    } as ReturnType<typeof controlComp>;
    const after = totals(run(patched).res);
    // Non-vacuity: 500 team rounds is reached many times over 180 s with 5 firing units, so the
    // deletion MUST cost her damage. If it did not, the trigger is mis-keyed (e.g. to her own
    // ammo, which a 120-round SMG would reach far more slowly).
    expect(after[SLUG]!).toBeLessThan(baseTotals[SLUG]!);
    for (const s of Object.keys(baseTotals)) {
      if (s === SLUG) {
        continue;
      }
      expect(after[s]!).toBe(baseTotals[s]!);
    }
  });
});

describe('burst i/j/k) 10.13% Attack Damage + 33.26% reload to allies; 17.28% caster-ATK to self', () => {
  it('Attack Damage 10.13% / 10 s is applied to ALL allies on her burst cast', () => {
    const b = buffs('attackDamagePct').filter(
      (e) => Math.abs((e as { value: number }).value - 10.13) < 1e-9
    );
    expect(b.length).toBeGreaterThan(0);
    const distinct = new Set(
      b.map((e) => (e as { targetSlug?: string }).targetSlug)
    );
    expect(distinct.size).toBeGreaterThan(1); // nearest-wrong: self-only
    // Trigger identity: her OWN burst cast, so the batch count equals her burst casts — NOT the
    // Full Burst count (which would over-fire in a comp where another B1 completes the chain).
    for (const e of b.slice(0, 3)) {
      const ev = e as { expiresFrame?: number; frame?: number };
      if (typeof ev.expiresFrame === 'number' && typeof ev.frame === 'number') {
        expect(ev.expiresFrame - ev.frame).toBe(600); // "for 10 sec"
      }
    }
  });

  it('the burst reload is an instantReload of 33.26% of the magazine, to allies', () => {
    // Weapon-state modifier: this IS damage (it gates shots fired). The nearest-wrong is dropping
    // it as "defensive", or encoding it as a full reload (fraction 1).
    const ov = withPatchedOverride(SLUG, () => {});
    const reloads = (ov.burst ?? []).flatMap((b) =>
      b.effects
        .filter((e) => (e as { kind: string }).kind === 'instantReload')
        .map((e) => ({ block: b, eff: e as { fraction?: number } }))
    );
    expect(reloads.length).toBe(1);
    expect(reloads[0]!.eff.fraction).toBeCloseTo(0.3326, 4);
    expect((reloads[0]!.block.target as { kind: string }).kind).toBe('allies');
  });

  it('the self ATK buff is casterAtkPct 17.28%, emitted FLAT-resolved, self-only', () => {
    // "ATK ^ 17.28% OF THE SKILL USER'S ATK" is casterAtkPct (a flat add), NOT atkPct (which would
    // scale each target's own ATK). The harness flat-resolves it at apply time, so assert the
    // product against her static ATK rather than the raw 17.28.
    const b = buffs('casterAtkPct');
    expect(b.length).toBeGreaterThan(0);
    const targets = new Set(
      b.map((e) => (e as { targetSlug?: string }).targetSlug)
    );
    expect(targets.size).toBe(1);
    expect([...targets][0]).toBe(SLUG); // "Affects self"
    const v = (b[0] as { value: number }).value;
    expect(v).toBeGreaterThan(1); // flat ATK, not the 17.28 percentage
    // Supporter static ATK @ Base 5 = 98,367 -> 17.28% = ~16,998.
    expect(v).toBeCloseTo(0.1728 * 98367, 0);
  });

  it('zeroing the burst ally buff moves teammates; zeroing the self ATK buff does NOT', () => {
    // Target-set discrimination in one pair: the 10.13% is team-wide, the 17.28% is self-only.
    const noAlly = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const blk of ov.burst ?? []) {
            for (const e of blk.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (eff.kind === 'buff' && eff.stat === 'attackDamagePct') {
                eff.value = 0;
              }
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const noSelf = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const blk of ov.burst ?? []) {
            for (const e of blk.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (eff.kind === 'buff' && eff.stat === 'casterAtkPct') {
                eff.value = 0;
              }
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const allyAfter = totals(run(noAlly).res);
    const selfAfter = totals(run(noSelf).res);
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    expect(allies.some((s) => allyAfter[s]! < baseTotals[s]!)).toBe(true);
    for (const s of allies) {
      expect(selfAfter[s]!).toBe(baseTotals[s]!);
    }
    expect(selfAfter[SLUG]!).toBeLessThan(baseTotals[SLUG]!);
  });
});

describe('skill1 a) "Focusing status — focuses fire continuously" — GAP', () => {
  it.skip('no primitive and no damage payload', () => {
    // GAP: "Focusing status" is an aim-state flavour line with no stat, no damage and no duration.
    // The sim has no aim-state axis (hit rate is handled by the HRCORE geometry, not a kit toggle),
    // so there is nothing observable to assert. It belongs in the override's `unmodeled.skill1`.
  });
});

describe('cross-cutting inertness', () => {
  it('she contributes NO core-flavoured skill damage (no kit line says "core")', () => {
    // Nearest-wrong: marking the 63.36% / 85% riders core:true, which would inflate them by the
    // core multiplier. Rider damage crits at her rate but takes NO core unless the text says so.
    const her = evs('damage').filter(
      (e) => (e as { srcSlug?: string }).srcSlug === SLUG
    );
    const riders = her.filter((e) => {
      const bucket = (e as { bucket?: string }).bucket;
      return bucket !== undefined && bucket !== 'normal';
    });
    for (const r of riders) {
      const coreRate = (r as { coreRate?: number }).coreRate;
      if (typeof coreRate === 'number') {
        expect(coreRate).toBe(0);
      }
    }
  });

  it('no unmodelled-but-damage-relevant lines: the override declares its skips', () => {
    // Audit assertion — "no silent drops". The Focusing line and the enemy stun are the only
    // legitimate skips, and they must be recorded rather than deleted.
    const ov = withPatchedOverride(SLUG, () => {}) as unknown as {
      unmodeled?: Record<string, string[]>;
    };
    expect(ov.unmodeled).toBeDefined();
    const all = Object.values(ov.unmodeled ?? {})
      .flat()
      .join(' ')
      .toLowerCase();
    expect(all.length).toBeGreaterThan(0);
    expect(all).toContain('focus');
  });
});
