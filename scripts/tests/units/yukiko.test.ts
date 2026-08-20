// PER-UNIT KIT SPEC — `yukiko` (Yukiko, Attacker/MG/Fire, Burst III, cd 40s). NEW unit,
// no base counterpart; Persona-style kit ("1 More", "Persona state", Media/Mediarama).
// Kit-autonomy gauntlet 2026-08-19.
//
// One assertion group per KIT LINE (Y1..Y9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked
// by another unit's heal (crown's recovery consumer cannot attribute its firings to a source).
//
// Kit (blablalink prose, data/characters.json → characters.yukiko.skills, level-10 values):
//   S1 ■ Persona state wrapper (continuous, unremovable) — framework for the heal below     [Y1]
//      ■ every 3 sec → all allies: Media, restores 5.7% of the skill user's final Max HP    [Y1]
//      ■ battle start AND when Full Burst ends → self: ATK ▲ 65.37% for 15 sec              [Y2]
//      ■ when 1 More takes effect → all enemies: 400.31% of final ATK, distributed damage   [Y3]
//   S2 ■ battle start → self: Attack Damage ▲ 55.31% continuously                           [Y4]
//      ■ on Burst Skill use → Scarlet Flower state until Full Burst ends:
//          Effect 1: every 3 sec → all allies: Mediarama, restores 5.7% final Max HP        [Y5d]
//          Effect 2: self: Fire Amp — Distributed Damage ▲ 90.01% continuously              [Y5a-c]
//          Effect 3: self: damage taken from Water Code enemies ▼ 17.95%                    [UNMODELED]
//      ■ entering Burst Stage 3 → self: Elemental Advantage Attack Damage ▲ 48.15% 10 sec   [Y6]
//      ■ when 1 More takes effect → all standard B3 allies in Persona state (except self):
//          Follow Up: ATK ▲ 80.25% of the skill user's ATK for 25 sec                       [UNMODELED]
//   BU ■ all enemies: 1258.79% of final ATK as distributed damage                           [Y8]
//      ■ if a Wind Code enemy is present → self: 1 More: ATK ▲ 45.33% for 10 sec            [Y9]
//
// UNMODELED lines (documented, not asserted — see the override's `unmodeled`):
//   - S2 Effect 3 (Scarlet Protection, damage taken from Water Code enemies ▼ 17.95%): defensive;
//     the v1 engine models no incoming damage (nobody takes hits), so the line is offense-inert
//     and has no consumer. Kept verbatim in unmodeled.
//   - S2 Follow Up (ATK ▲ 80.25% of own ATK → "all standard Burst 3 allies in the Persona state",
//     25 sec): the engine has NO Persona-state primitive and the roster has NO Persona-state unit
//     (yukiko herself is excluded by the kit), so the target set is empty in every team the sim can
//     field today. Encoding it WITHOUT the Persona gate would wrongly grant the buff to any B3 ally
//     — actively wrong, not merely unfaithful. Recipe: when Persona-state units land, add a
//     persona-state tag + a matching target filter, then encode on the 1 More event
//     (burstCast + bossElementGate Wind) as casterAtkPct 80.25 / 25 sec.
//   - Heal MAGNITUDES (5.7% of final Max HP): no HP pool is modeled, so only the recovery EVENTS
//     are asserted (Y1/Y5d); the numbers are verbatim in unmodeled.
//
// "1 MORE" READ (the kit's own wiring): her burst's last line activates "if a Wind Code enemy is
// present" and grants "1 More" — Fire's elemental advantage over Wind is the weakness hit that
// triggers it. S1's 400.31% hit and S2's Follow Up both key to "when 1 More takes effect", so the
// 1 More event IS her burst cast against a Wind boss: modeled as burstCast + bossElementGate Wind.
//
// CAST-INSTANT SIMULTANEITY (engine block order = skill1 → skill2 → burst, sequential on the cast
// frame): the Scarlet Flower state (skill2) is granted BEFORE the burst-slot blocks resolve, so the
// Fire Amp covers her own nuke — the measured same-cast rule (U10: "Live buffs at cast DO apply").
// The S1 1 More hit (skill1) resolves BEFORE the state grant, so it does NOT take the amp; in game
// all three land on the same frame. Pinned as the documented engine order in Y3; a focus-video
// popup of the 400.31% hit vs a Wind boss would settle whether the amp should reach it.
//
// Why each assertion discriminates:
//   Y1   the heal is an event stream at HER 3s cadence — proven by exact 3s spacing of crown's
//        recovery consumer and by a burst-keyed counterfactual (once per cast) producing far fewer
//        firings. Isolated by patching helm's and crown's own heals out (precedent: helm.test.ts H8).
//   Y2   a battle-start-only counterfactual fires ONCE; shipped fires at t=0 and at every Full
//        Burst end — the set of application frames must equal {0} ∪ fullBurstEnd frames.
//   Y3   the hit exists ONLY vs the Wind boss (the gate), at the kit magnitude, once per cast;
//        removing it or ungating it are the two nearest wrong models.
//   Y4   removal moves her total; expiry must be null (continuously).
//   Y5   Fire Amp is a DISTRIBUTED-FLAVOR amp: the nuke's distributed multiplier is 1.9001 while
//        her NORMAL attacks are byte-identical with and without the amp. The unscoped
//        counterfactual (attackDamagePct) lifts the normals — the model this line must not be.
//        The state window is the kit's "until Full Burst ends" = 622 frames (cast → FB end).
//   Y6   elemAdvantageDamagePct sits in the ELEMENT bucket: removing it changes her damage vs the
//        Wind boss (advantaged) and changes NOTHING vs the Fire boss (not advantaged). An
//        attackDamagePct counterfactual moves the Fire-boss total — the placement this asserts
//        against.
//   Y8   kit magnitude, burst bucket, once per cast, distributed-flavored (×1.9001 with the amp
//        live), and NO +50% Full Burst major — the cast lands 22 frames before FB opens.
//   Y9   exists once per cast vs Wind, ABSENT vs Fire.
//
// Fixture: liter (B1) / crown (B2) / yukiko (B3) / helm (B3, alternating burst partner so the
// rotation sustains ~20s Full Burst cycles — yukiko alone on a 40s cd would stall every other
// chain), boss WIND (her 1 More + elemental-advantage lines live) with a FIRE-boss mirror run for
// the gate/placement discriminations. Crown's recovery consumer (attackDamagePct 20.99) is the
// observable for the heal lines. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CROWN = 1;
const YUKIKO = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  bossElement: 'Wind' | 'Fire',
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'crown', 'yukiko', 'helm'],
    bossElement,
    focusSlug: 'yukiko',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const yukikoCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'yukiko'
  );
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const yukikoDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'yukiko' && d.srcSlot === srcSlot);
const yukikoNormals = (evs: SimEvent[]) =>
  dmg(evs)
    .filter((d) => d.slug === 'yukiko' && d.bucket === 'normal')
    .map((d) => d.amount);
const yukikoBuff = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === YUKIKO && b.stat === stat && b.value === value
  );
/** Distributed multiplier, rounded past float noise (1 + 90.01/100 = 1.9001000000000001). */
const dist = (d: Damage) => Number(d.mult.distributed.toFixed(6));
/** Crown's recovery consumer firings — one recovery event source frame per distinct frame. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

// ---- isolation / counterfactual patches -------------------------------------------------------
/** helm heals (S1 full-charge + burst lifesteal) and crown's own hitCount heal all drive crown's
 *  recovery consumer; removing them leaves yukiko's heals as the ONLY recovery sources
 *  (same isolation pattern as helm.test.ts H8). */
const helmNoHeal = withPatchedOverride('helm', (ov) => {
  const before = JSON.stringify(ov);
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    ov[slot] = ov[slot]
      .map((b: any) => ({
        ...b,
        effects: b.effects.filter((e: any) => e.kind !== 'heal'),
      }))
      .filter((b: any) => b.effects.length > 0);
  }
  if (JSON.stringify(ov) === before) {
    throw new Error('helm heal blocks missing — fixture is stale');
  }
});
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    b.effects.every((e: any) => e.kind !== 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown heal block missing — fixture is stale');
  }
});
const HEAL_ISOLATION = { helm: helmNoHeal, crown: crownNoHeal };

const stripYukiko = (mutate: (ov: any) => void) =>
  withPatchedOverride('yukiko', mutate);

/** Y1 counterfactual: S1's every-3s heal removed (state heal stays). */
const noS1Heal = stripYukiko((ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'interval');
  if (ov.skill1.length === before) {
    throw new Error('yukiko S1 interval heal missing — fixture is stale');
  }
});
/** Y5d isolation: the state's Mediarama heal effect removed (S1's Media stays). */
const noStateHeal = stripYukiko((ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const n = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    removed += n - b.effects.length;
  }
  ov.skill2 = ov.skill2.filter((b: any) => b.effects.length > 0);
  if (!removed) {
    throw new Error('yukiko state heal missing — fixture is stale');
  }
});
/** Both heals removed — nothing may drive crown's consumer then. */
const noHeals = stripYukiko((ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    ov[slot] = ov[slot]
      .map((b: any) => ({
        ...b,
        effects: b.effects.filter((e: any) => e.kind !== 'heal'),
      }))
      .filter((b: any) => b.effects.length > 0);
  }
});
/** Y2 counterfactual: the Full-Burst-end re-trigger removed (battle start only). */
const noFbEndAtk = stripYukiko((ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => b.trigger.kind !== 'fullBurstEnd'
  );
  if (ov.skill1.length === before) {
    throw new Error('yukiko S1 fullBurstEnd ATK block missing — fixture is stale');
  }
});
/** Y3/Y9 counterfactual: the whole 1 More cluster removed (S1 hit + burst ATK grant). */
const noOneMore = stripYukiko((ov) => {
  const before = JSON.stringify(ov);
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    ov[slot] = ov[slot].filter((b: any) => b.bossElementGate !== 'Wind');
  }
  if (JSON.stringify(ov) === before) {
    throw new Error('yukiko Wind-gated 1 More blocks missing — fixture is stale');
  }
});
/** Y5 counterfactual: Fire Amp removed entirely. */
const noAmp = stripYukiko((ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    b.effects.every((e: any) => e.stat !== 'distributedDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('yukiko Fire Amp block missing — fixture is stale');
  }
});
/** Y5 counterfactual: the UNMODELED Fire Amp as an unscoped Attack Damage buff. */
const ampAsAttackDamage = stripYukiko((ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'distributedDamagePct');
  if (!e) {throw new Error('yukiko Fire Amp effect missing — fixture is stale');}
  e.stat = 'attackDamagePct';
});
/** Y6 counterfactual: Elemental Advantage line removed. */
const noElemAdv = stripYukiko((ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    b.effects.every((e: any) => e.stat !== 'elemAdvantageDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('yukiko elemAdvantage block missing — fixture is stale');
  }
});
/** Y6 counterfactual: the line misplaced into the Damage Up bucket. */
const elemAdvAsAttackDamage = stripYukiko((ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e) {
    throw new Error('yukiko elemAdvantage effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const wind = run('Wind');
const fire = run('Fire');
const windNoS1Heal = run('Wind', { ...HEAL_ISOLATION, yukiko: noS1Heal });
const windNoStateHeal = run('Wind', { ...HEAL_ISOLATION, yukiko: noStateHeal });
const windNoHeals = run('Wind', { ...HEAL_ISOLATION, yukiko: noHeals });
const windNoFbEndAtk = run('Wind', { yukiko: noFbEndAtk });
const windNoOneMore = run('Wind', { yukiko: noOneMore });
const windNoAmp = run('Wind', { yukiko: noAmp });
const windAmpWrong = run('Wind', { yukiko: ampAsAttackDamage });
const windNoElemAdv = run('Wind', { yukiko: noElemAdv });
const windElemAdvWrong = run('Wind', { yukiko: elemAdvAsAttackDamage });
const fireNoElemAdv = run('Fire', { yukiko: noElemAdv });
const fireElemAdvWrong = run('Fire', { yukiko: elemAdvAsAttackDamage });

const casts = yukikoCasts(wind.events);

describe('yukiko — kit spec', () => {
  it('fixture sanity: she casts her burst repeatedly in the 180s fight', () => {
    expect(casts.length).toBeGreaterThanOrEqual(3);
    expect(casts.every((c) => c.stage === 3)).toBe(true);
  });

  describe('Y1 — S1 Media: recovery takes effect on all allies every 3 sec', () => {
    it('fires on a strict 3s cadence across the whole fight (S1 heal isolated)', () => {
      const frames = recoveryFrames(windNoStateHeal.events);
      expect(frames.length).toBeGreaterThanOrEqual(58);
      expect(frames[0]).toBe(3 * FPS); // interval first-fire at t=sec
      for (const f of frames) {
        expect(f % (3 * FPS)).toBe(0);
      }
    });

    it('DISCRIMINATING: a burst-keyed heal would produce far fewer firings', () => {
      // nearest wrong model: the every-3s line re-keyed to her burst cast. The shipped cadence
      // produces ~60 firings; one per cast produces ~4-5.
      const frames = recoveryFrames(windNoStateHeal.events).length;
      expect(frames).toBeGreaterThan(3 * casts.length);
    });

    it('is yukiko-heal-driven: removing BOTH her heals zeroes the recovery stream', () => {
      expect(recoveryFrames(windNoHeals.events)).toEqual([]);
    });

    it('the isolated stream comes from yukiko alone (no other recovery source leaks in)', () => {
      // with only her S1 heal live, every firing is on the 3s grid — nothing aperiodic sneaks in.
      const frames = recoveryFrames(windNoStateHeal.events);
      expect(frames.every((f) => f % (3 * FPS) === 0)).toBe(true);
    });
  });

  describe('Y2 — S1 ATK ▲ 65.37% for 15 sec at battle start and when Full Burst ends', () => {
    const applied = yukikoBuff(wind.events, 'atkPct', 65.37);

    it('applies at t=0 and at EXACTLY every Full Burst end', () => {
      const frames = new Set(applied.map((b) => b.frame));
      expect(frames.has(0)).toBe(true);
      expect([...frames].filter((f) => f !== 0).sort((a, b) => a - b)).toEqual(
        fbEndFrames(wind.events).sort((a, b) => a - b)
      );
    });

    it('lasts 15 sec and is self-held', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('DISCRIMINATING: battle-start-only fires exactly once', () => {
      expect(
        yukikoBuff(windNoFbEndAtk.events, 'atkPct', 65.37).length
      ).toBe(1);
      expect(wind.totals.yukiko).not.toBe(windNoFbEndAtk.totals.yukiko);
    });
  });

  describe('Y3 — S1: when 1 More takes effect, 400.31% of final ATK distributed to all enemies', () => {
    const hits = yukikoDamage(wind.events, 'skill1');

    it('lands once per burst cast at the kit magnitude, Wind boss only', () => {
      expect(hits.length).toBe(casts.length);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([400.31]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(yukikoDamage(fire.events, 'skill1')).toEqual([]);
    });

    it('is distributed-flavored; slot order keeps the same-cast Fire Amp OFF it (documented)', () => {
      // The state is granted by skill2, AFTER skill1 resolves on the cast frame — the engine's
      // sequential order stands in for the in-game same-frame simultaneity (see header).
      expect([...new Set(hits.map(dist))]).toEqual([1]);
    });

    it('DISCRIMINATING: removing the 1 More cluster zeroes the hit vs Wind', () => {
      expect(yukikoDamage(windNoOneMore.events, 'skill1')).toEqual([]);
    });
  });

  describe('Y4 — S2 Attack Damage ▲ 55.31% continuously from battle start', () => {
    const applied = yukikoBuff(wind.events, 'attackDamagePct', 55.31);

    it('applies once at t=0 with NO expiry, self-held', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].expiresFrame).toBeNull();
      expect(applied[0].targetIdx).toBe(YUKIKO);
    });
  });

  describe('Y5 — Scarlet Flower state on Burst Skill use (until Full Burst ends)', () => {
    const amps = yukikoBuff(wind.events, 'distributedDamagePct', 90.01);

    it('Fire Amp grants 90.01% once per cast, self-held', () => {
      expect(amps.length).toBe(casts.length);
      for (const b of amps) {
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('the window is cast → Full Burst end (622 frames = 22f pre-delay + 10s FB)', () => {
      for (const b of amps) {
        expect(b.expiresFrame! - b.frame).toBe(622);
      }
    });

    it('IS LOAD-BEARING: the burst nuke takes the ×1.9001 distributed multiplier', () => {
      const nukes = yukikoDamage(wind.events, 'burst');
      expect([...new Set(nukes.map(dist))]).toEqual([1.9001]);
      const nukesNoAmp = yukikoDamage(windNoAmp.events, 'burst');
      expect([...new Set(nukesNoAmp.map(dist))]).toEqual([1]);
      expect(wind.totals.yukiko).toBeGreaterThan(windNoAmp.totals.yukiko);
    });

    it('IS FLAVOR-SCOPED: her normal attacks are untouched by the amp', () => {
      expect(yukikoNormals(wind.events)).toEqual(
        yukikoNormals(windNoAmp.events)
      );
    });

    it('DISCRIMINATING: an unscoped Attack Damage buff would lift the normals too', () => {
      expect(yukikoNormals(windAmpWrong.events)).not.toEqual(
        yukikoNormals(wind.events)
      );
    });

    it('state Mediarama: three recovery firings per cast at +3/+6/+9 sec (S1 heal isolated)', () => {
      const frames = recoveryFrames(windNoS1Heal.events);
      const FIGHT_FRAMES = 180 * FPS;
      const measurable = casts.filter((c) => c.frame + 9 * FPS <= FIGHT_FRAMES);
      expect(measurable.length).toBeGreaterThan(0);
      for (const c of measurable) {
        for (const off of [3, 6, 9]) {
          expect(
            frames,
            `no state-heal firing at cast(${c.sec.toFixed(1)}s)+${off}s`
          ).toContain(c.frame + off * FPS);
        }
      }
      // and nothing else: every firing belongs to some cast window.
      const windows = measurable.flatMap((c) =>
        [3, 6, 9].map((off) => c.frame + off * FPS)
      );
      for (const f of frames) {
        expect(windows).toContain(f);
      }
    });
  });

  describe('Y6 — S2 Elemental Advantage Attack Damage ▲ 48.15% for 10 sec on Burst Stage 3 entry', () => {
    const applied = yukikoBuff(wind.events, 'elemAdvantageDamagePct', 48.15);

    it('fires on stage-3 entry — 30f ahead of each of her casts — for 10 sec', () => {
      expect(applied.length).toBeGreaterThanOrEqual(casts.length);
      for (const c of casts) {
        expect(
          applied.some(
            (b) => b.frame <= c.frame && c.frame - b.frame <= 30
          ),
          `no stageEnter-3 grant within 30f before cast at ${c.sec.toFixed(1)}s`
        ).toBe(true);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('IS ELEMENT-BUCKET: removal moves her damage vs Wind…', () => {
      expect(wind.totals.yukiko).not.toBe(windNoElemAdv.totals.yukiko);
    });

    it('…and is exactly INERT vs a boss she is not advantaged against', () => {
      expect(fire.totals.yukiko).toBe(fireNoElemAdv.totals.yukiko);
    });

    it('DISCRIMINATING: a Damage-Up placement would move the Fire-boss total', () => {
      expect(fireElemAdvWrong.totals.yukiko).not.toBe(fire.totals.yukiko);
      expect(windElemAdvWrong.totals.yukiko).not.toBe(wind.totals.yukiko);
    });
  });

  describe('Y8 — burst Maragidyne: 1258.79% of final ATK distributed damage to all enemies', () => {
    const nukes = yukikoDamage(wind.events, 'burst');

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts.length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1258.79]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('casts BEFORE the Full Burst window opens: no +50% major, FB not yet live', () => {
      expect([...new Set(nukes.map((d) => d.fbMajorApplied))]).toEqual([false]);
      expect([...new Set(nukes.map((d) => d.inFullBurst))]).toEqual([false]);
    });

    it('is crit-eligible (engine rider convention) and distributed-flavored', () => {
      expect([...new Set(nukes.map((d) => d.critEligible))]).toEqual([true]);
      // Fire Amp live on the Wind-boss run (granted same-cast, skill2 before burst)
      expect([...new Set(nukes.map(dist))]).toEqual([1.9001]);
    });

    it("is TAGGED 'allEnemies' — her clause is trina's literal amp string", () => {
      // Owner ruling 2026-08-10: the Burst-Skill-Damage amps are LITERAL-ONLY, and yukiko's burst
      // clause is exactly "Affects all enemies" — so the nuke is amp-eligible whenever such an amp
      // is live. The skill1 1 More hit stays untagged: the amps amplify Burst Skill damage only,
      // never skill procs. Enforced roster-wide by scripts/tests/census-burst-amp-scope.test.ts.
      const ov = loadOverride('yukiko') as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.burstDesc).toBe('allEnemies');
    });
  });

  describe('Y9 — burst 1 More: ATK ▲ 45.33% for 10 sec, only if a Wind Code enemy is present', () => {
    it('grants once per cast vs Wind, self-held, 10 sec', () => {
      const applied = yukikoBuff(wind.events, 'atkPct', 45.33);
      expect(applied.length).toBe(casts.length);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
        expect(b.targetIdx).toBe(YUKIKO);
      }
    });

    it('is ABSENT vs a non-Wind boss', () => {
      expect(yukikoBuff(fire.events, 'atkPct', 45.33)).toEqual([]);
    });

    it('DISCRIMINATING: removing the 1 More cluster zeroes it vs Wind', () => {
      expect(yukikoBuff(windNoOneMore.events, 'atkPct', 45.33)).toEqual([]);
      expect(wind.totals.yukiko).not.toBe(windNoOneMore.totals.yukiko);
    });
  });
});
