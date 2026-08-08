/**
 * mihara (AR / Water / Attacker / Burst III, ammo 60) — BLIND kit spec test.
 * Written from kit prose alone: no sight of the shipped override, the driver tests, or any
 * truth file. Every counterfactual below is built with withPatchedOverride, so the committed
 * JSON on disk is never touched.
 *
 * KIT AS READ (structural reading of the prose):
 *   S1  header 'when the last bullet hits' + 'Affects self'
 *       Critical Damage 18.7% for 10 sec
 *       => trigger lastBullet (per magazine; ammo 60 so it repeats all fight), target self,
 *          buff critDamagePct 18.7 durationSec 10. SECONDS, not rounds. Generic crit damage —
 *          the text carries no 'of normal attacks' scope, so it is NOT a scoped stat.
 *   S2  header 'when using Burst Skill' + 'Affects self' + Once/Twice escalation
 *       Once : ATK 15.56% for 45 sec           (Highway to Hell 1)
 *       Twice: Critical Rate 11.28% for 45 sec  (Highway to Hell 2)
 *       => trigger burstCast (HER OWN cast — NOT fullBurstEnter, which would over-credit in any
 *          comp where another Burst III completes the chain), target self,
 *          effects: escalating[ atkPct 15.56/45s, critRatePct 11.28/45s ].
 *          Escalating semantics (Nth activation applies steps 1..N) =>
 *          crit-rate applications === atk applications - 1. That identity is the whole test.
 *   BRS 'Affects all allies' + 'Full Burst Duration' down 5 sec => fullBurstExtend seconds:-5
 *       'Affects all enemies' 399.6% of final ATK as Burst Skill damage => flatDamage 399.6, enemy
 *       'while in Highway to Hell 2 status' 266.4% additional damage => flatDamage 266.4, enemy,
 *          GATED on the S2 escalation having reached step 2 (so it cannot fire on cast #1).
 *
 * FIXTURE: controlComp('mihara', false) for everything except one run. Dropping the fixed second
 * Burst III makes mihara the SOLE B3, so she casts on every rotation — required for the S2
 * escalation count identity to be readable, and liter(B1)+crown(B2) still supply the chain (a lone
 * B3 with no enablers makes ZERO full bursts). controlComp('mihara', true) is used once, to check
 * the S2 buffs stay keyed to her own cast when a second B3 can take rotations.
 *
 * SHAPE-AGNOSTIC PATCHING: blocksOf() accepts both readings of the OverrideFile slot (a bare
 * Block[] or a CharacterSkills carrying .blocks) and every mutation is in place on the Block
 * object, so these counterfactuals discriminate the MODEL, never the encoding style.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'mihara';

type Opts = ReturnType<typeof controlComp>;
type Res = ReturnType<typeof runComp>;
type AnyEffect = {
  kind?: string;
  atkPct?: number;
  seconds?: number;
  steps?: AnyEffect[];
};
type AnyBlock = { effects?: AnyEffect[]; [k: string]: unknown };
type BuffApplyEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  targetSlug?: string;
  casterIdx: number | null;
  targetIdx: number | null;
  expiresFrame?: number;
  durationShots?: number;
};
type DamageEv = {
  kind: 'damage';
  bucket: string;
  inFullBurst?: boolean;
  fbMajorApplied?: boolean;
};

const GATE_KEYS = [
  'resourceGate',
  'requiresTargetStatus',
  'ownBurstGate',
  'fbGate',
  'everyN',
  'everyNOffset',
  'mode',
  'teamHas',
  'swapGate',
  'requiresCore',
  'bossElementGate',
  'formation',
  'requiresShielded',
] as const;

function blocksOf(ov: unknown, slot: 'skill1' | 'skill2' | 'burst'): AnyBlock[] {
  const s = (ov as Record<string, unknown>)[slot];
  if (Array.isArray(s)) return s as AnyBlock[];
  return ((s as { blocks?: AnyBlock[] } | undefined)?.blocks ?? []) as AnyBlock[];
}

function allEffects(b: AnyBlock): AnyEffect[] {
  const out: AnyEffect[] = [];
  for (const e of b.effects ?? []) {
    out.push(e);
    if (Array.isArray(e.steps)) out.push(...e.steps);
  }
  return out;
}

function stripEffects(b: AnyBlock, pred: (e: AnyEffect) => boolean): void {
  if (!b.effects) return;
  b.effects = b.effects
    .filter((e) => !pred(e))
    .map((e) =>
      Array.isArray(e.steps) ? { ...e, steps: e.steps.filter((s) => !pred(s)) } : e,
    );
}

function run(opts: Opts): { res: Res; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const cfg = {
    ...((opts as { cfg?: Record<string, unknown> }).cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  const res = runComp({ ...opts, cfg } as Opts);
  return { res, events };
}

function withOv(patched: unknown, helm = false): Opts {
  const o = controlComp(SLUG, helm) as Opts & { overrides?: Record<string, unknown> };
  o.overrides = { ...(o.overrides ?? {}), [SLUG]: patched };
  return o as Opts;
}

const buffApplies = (events: SimEvent[]): BuffApplyEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];
const damages = (events: SimEvent[]): DamageEv[] =>
  events.filter((e) => e.kind === 'damage') as unknown as DamageEv[];
const countKind = (events: SimEvent[], kind: string): number =>
  events.filter((e) => e.kind === kind).length;
const teamSum = (res: Res): number =>
  Object.values(totals(res)).reduce((a, b) => a + b, 0);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

// ---- counterfactual clones (structural facts captured while cloning) ----
let s1BuffEffects = 0;
const noSkill1 = withPatchedOverride(SLUG, (ov) => {
  for (const b of blocksOf(ov, 'skill1')) {
    s1BuffEffects += allEffects(b).filter((e) => e.kind === 'buff').length;
    b.effects = [];
  }
});

const fbExtendSeconds: number[] = [];
const noFbShorten = withPatchedOverride(SLUG, (ov) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of blocksOf(ov, slot)) {
      for (const e of allEffects(b)) {
        if (e.kind === 'fullBurstExtend' && typeof e.seconds === 'number') {
          fbExtendSeconds.push(e.seconds);
        }
      }
      stripEffects(b, (e) => e.kind === 'fullBurstExtend');
    }
  }
});

let mainHitEffects = 0;
let riderEffects = 0;
const noRider = withPatchedOverride(SLUG, (ov) => {
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of allEffects(b)) {
      if (e.kind !== 'flatDamage') continue;
      if (near(e.atkPct ?? 0, 399.6)) mainHitEffects++;
      if (near(e.atkPct ?? 0, 266.4)) riderEffects++;
    }
    stripEffects(b, (e) => e.kind === 'flatDamage' && near(e.atkPct ?? 0, 266.4));
  }
});

let riderBlocks = 0;
let gatedRiderBlocks = 0;
const ungatedRider = withPatchedOverride(SLUG, (ov) => {
  for (const b of blocksOf(ov, 'burst')) {
    if (!allEffects(b).some((e) => e.kind === 'flatDamage' && near(e.atkPct ?? 0, 266.4))) {
      continue;
    }
    riderBlocks++;
    if (GATE_KEYS.some((k) => b[k] !== undefined)) gatedRiderBlocks++;
    for (const k of GATE_KEYS) delete b[k];
  }
});

// ---- hoisted runs (each is a full 180s sim) ----
const base = run(controlComp(SLUG, false));
const noS1 = run(withOv(noSkill1));
const noFb = run(withOv(noFbShorten));
const noRid = run(withOv(noRider));
const unGated = run(withOv(ungatedRider));
const helmRun = run(controlComp(SLUG, true));

const baseBuffs = buffApplies(base.events);
const critDmg = baseBuffs.filter((b) => b.stat === 'critDamagePct' && near(b.value, 18.7));
const atkApplies = baseBuffs.filter((b) => b.stat === 'atkPct' && near(b.value, 15.56));
const critRateApplies = baseBuffs.filter(
  (b) => b.stat === 'critRatePct' && near(b.value, 11.28),
);
const otherSlugs = Object.keys(totals(base.res)).filter((s) => s !== SLUG);

describe('mihara — fixture sanity (non-vacuity)', () => {
  it('the sole-B3 fixture actually bursts and deals damage', () => {
    // Without B1+B2 a lone Burst III makes ZERO full bursts; every assertion below would be vacuous.
    expect(countKind(base.events, 'fullBurstStart')).toBeGreaterThanOrEqual(2);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(totals(base.res)[SLUG]).toBe(unitOf(base.res, SLUG).totalDamage);
    expect(otherSlugs.length).toBeGreaterThanOrEqual(2);
  });
});

describe('mihara S1 — last bullet: Critical Damage 18.7% for 10 sec (self)', () => {
  it('applies critDamagePct 18.7 to herself, repeatedly (lastBullet, not a passive)', () => {
    // Discriminates: a passive/always-on encoding applies ONCE at frame 0; a per-magazine
    // lastBullet trigger re-applies every reload cycle (ammo 60), so many applications.
    expect(critDmg.length).toBeGreaterThanOrEqual(5);
    for (const b of critDmg) expect(b.targetSlug).toBe(SLUG);
    expect(s1BuffEffects).toBeGreaterThanOrEqual(1);
  });

  it('is Critical DAMAGE, not Critical RATE (stat-swap guard)', () => {
    // Nearest-wrong: 18.7 booked as critRatePct — a far larger and differently-shaped gain.
    expect(baseBuffs.some((b) => b.stat === 'critRatePct' && near(b.value, 18.7))).toBe(false);
    // and not a scoped normal-attack crit stat: the kit line carries no scope clause.
    expect(baseBuffs.some((b) => b.stat === 'critRateNormalPct')).toBe(false);
  });

  it('lasts SECONDS, not rounds', () => {
    // Nearest-wrong: durationShots (the 'for N round(s)' primitive). The kit says 10 sec.
    for (const b of critDmg) {
      expect(b.durationShots ?? undefined).toBeUndefined();
      expect(typeof b.expiresFrame).toBe('number');
      expect(b.expiresFrame as number).toBeGreaterThan(0);
    }
  });

  it('is load-bearing on her damage and INERT on teammates', () => {
    expect(totals(base.res)[SLUG]).toBeGreaterThan(totals(noS1.res)[SLUG]);
    // Crit damage changes no shot count and no gauge, so allies must be byte-identical.
    for (const s of otherSlugs) {
      expect(totals(noS1.res)[s]).toBe(totals(base.res)[s]);
    }
  });
});

describe('mihara S2 — burst cast: escalating ATK 15.56% then Crit Rate 11.28% (45 sec, self)', () => {
  it('applies both steps to herself only', () => {
    expect(atkApplies.length).toBeGreaterThanOrEqual(2);
    expect(critRateApplies.length).toBeGreaterThanOrEqual(1);
    for (const b of [...atkApplies, ...critRateApplies]) expect(b.targetSlug).toBe(SLUG);
  });

  it('ESCALATES: crit-rate applications === ATK applications - 1', () => {
    // The identity that proves Once/Twice is modeled: step 1 fires on every cast, step 2 only
    // from the second cast on. Nearest-wrong (both steps granted on every cast, i.e. the
    // escalation dropped) makes the two counts EQUAL and fails here.
    expect(critRateApplies.length).toBe(atkApplies.length - 1);
  });

  it('both steps last seconds, not rounds', () => {
    for (const b of [...atkApplies, ...critRateApplies]) {
      expect(b.durationShots ?? undefined).toBeUndefined();
      expect(typeof b.expiresFrame).toBe('number');
    }
  });

  it('is keyed to HER OWN burst cast, not to team full-burst entry', () => {
    // With a second Burst III present, some rotations are completed by the other B3. A
    // fullBurstEnter keying would fire on EVERY full burst (count === fullBurstStart count);
    // burstCast keying can never exceed the number of full-burst windows.
    const helmBuffs = buffApplies(helmRun.events);
    const helmAtk = helmBuffs.filter((b) => b.stat === 'atkPct' && near(b.value, 15.56));
    const helmCrit = helmBuffs.filter((b) => b.stat === 'critRatePct' && near(b.value, 11.28));
    const helmFb = countKind(helmRun.events, 'fullBurstStart');
    expect(helmFb).toBeGreaterThanOrEqual(2);
    expect(helmAtk.length).toBeGreaterThanOrEqual(1);
    expect(helmAtk.length).toBeLessThanOrEqual(helmFb);
    expect(helmCrit.length).toBe(helmAtk.length - 1);
    for (const b of [...helmAtk, ...helmCrit]) expect(b.targetSlug).toBe(SLUG);
  });
});

describe('mihara burst — Full Burst Duration reduced 5 sec (all allies)', () => {
  it('is modeled as a NEGATIVE full-burst duration change', () => {
    // Structural: the sign is the whole line. A +5 extend is the nearest-wrong model and
    // would be a large damage GAIN rather than the loss the kit describes.
    expect(fbExtendSeconds.length).toBeGreaterThanOrEqual(1);
    for (const s of fbExtendSeconds) expect(s).toBeLessThan(0);
    expect(fbExtendSeconds.some((s) => near(s, -5))).toBe(true);
  });

  it('shortens the full-burst window: removing it RAISES team damage', () => {
    // A shorter window means fewer hits take the Full Burst major, so the faithful model must
    // score BELOW the same comp with the reduction stripped out.
    expect(teamSum(base.res)).toBeLessThan(teamSum(noFb.res));
    const inFbBase = damages(base.events).filter((d) => d.inFullBurst).length;
    const inFbNoFb = damages(noFb.events).filter((d) => d.inFullBurst).length;
    expect(inFbBase).toBeLessThan(inFbNoFb);
  });
});

describe('mihara burst — 399.6% burst-skill damage + gated 266.4% rider', () => {
  it('carries the 399.6% burst hit', () => {
    expect(mainHitEffects).toBeGreaterThanOrEqual(1);
  });

  it('burst-cast damage is Full-Burst-exempt (it lands before the window opens)', () => {
    for (const d of damages(base.events)) {
      if (d.bucket !== 'burst') continue;
      expect(d.fbMajorApplied ?? false).toBe(false);
    }
  });

  it('carries the 266.4% rider as ENEMY damage, not an ally buff', () => {
    expect(riderEffects).toBeGreaterThanOrEqual(1);
    expect(baseBuffs.some((b) => near(b.value, 266.4) || near(b.value, 399.6))).toBe(false);
  });

  it('the rider is GATED on Highway to Hell 2 — it cannot fire on the first burst cast', () => {
    // Discriminating pair. riderBlocks/gatedRiderBlocks prove a gate exists structurally; the
    // run proves the gate is live: stripping every gate field can only ADD firings (the rider
    // then also lands on cast #1), so the ungated clone must strictly out-damage the faithful
    // model. Nearest-wrong (rider ungated, firing on every cast) collapses the two totals.
    expect(riderBlocks).toBeGreaterThanOrEqual(1);
    expect(gatedRiderBlocks).toBe(riderBlocks);
    expect(totals(unGated.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
  });

  it('the rider actually contributes damage', () => {
    expect(totals(noRid.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
    // and it is the smaller of the two burst components (266.4 < 399.6), so removing it must
    // not swing her total more than the main hit is worth.
    expect(totals(base.res)[SLUG] - totals(noRid.res)[SLUG]).toBeGreaterThan(0);
  });
});

describe('mihara — measurement-gated / unobservable', () => {
  it.skip('rider on burst cast #2 exactly: pre- vs post-increment ordering is kit-ambiguous', () => {
    // The kit grants Highway to Hell 2 ON the second cast and the rider activates WHILE in that
    // status. Whether the status is live for that same cast (rider fires on casts 2..N) or only
    // from the next one (casts 3..N) is not decidable from the prose; it is an ordering choice
    // inside the burst slot. Needs footage of a second burst to pin. Flagged, not guessed.
  });

  it.skip('exact lastBullet count over 180s — cadence is a datamine-unreliable input', () => {
    // Applications per fight follow pulls/sec + reloadFrames 121, both flagged fields; the test
    // above asserts the SHAPE (repeating, self, seconds) and deliberately not the count.
  });

  it.skip('the -5 sec duration change as an observable ally-visible event', () => {
    // There is no buffApply/event channel for a full-burst duration change, so the reduction is
    // only observable through the window it produces (asserted above via inFullBurst damage).
  });
});
