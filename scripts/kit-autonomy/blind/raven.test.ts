import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * raven - blind per-line kit spec, written from the kit prose ALONE (blind to the
 * committed override, to the driver's tests and to the driver's reasoning).
 *
 * KIT (RL / Iron / Attacker / Burst III; ammo 6, chargeFrames 60, reloadFrames 141,
 * normalAttackMultiplier 61.3, coreAttackMultiplier 200)
 *
 *   S1a  on a Full Charge attack -> enemy nearest the crosshair:
 *        68.46% of final ATK as sustained damage every 1 sec, stacks up to 10,
 *        lasts 5 sec.
 *        => dot { atkPct 68.46, intervalSec 1, durationSec 5, flavor sustained }
 *           on a per-full-charge-shot trigger. An RL pull IS a full charge
 *           (chargeFrames 60), so shot-keyed and charge-keyed encodings coincide
 *           here; what the spec pins is that ONE instance is appended PER SHOT and
 *           that instances OVERLAP for 5 sec (the engine never dedups DoTs), which
 *           is exactly what the kit's up-to-10-stacks wording describes.
 *
 *   S1b  on ENTERING FULL BURST -> self: ATK up 47.52% of the SKILL USER's ATK,
 *        10 sec.
 *        => casterAtkPct 47.52, durationSec 10, trigger fullBurstEnter, target self.
 *        Nearest-wrongs: (a) plain atkPct (target-scaled, emits the raw 47.52),
 *        (b) keying it to burstCast (under-fires whenever another B3 completes the
 *        chain), (c) a duration other than 10 sec.
 *
 *   S2a  at start of battle -> self: Vital Attack, Damage to Parts up 21.12%, 5 sec.
 *   S2b  on entering Full Burst -> self: the same 21.12%, 5 sec.
 *        => partsDamagePct is schema-inert in v1 (the scope-lock boss is PARTLESS).
 *        The spec claim is therefore: accounted for (encoded inert OR recorded in
 *        `unmodeled`), and NEVER laundered into a live damage stat.
 *
 *   S2c  when an ally or self DESTROYS AN ENEMY PART -> self, gated on not being in
 *        A.N. Mode: Single Point Attack, Sustained damage up 47.32%, 15 sec;
 *        removes Vital Attack.
 *        => GAP. There is no part-destruction trigger in the schema and the boss has
 *        no parts, so the line is unreachable. it.skip + an OVER-CREDIT GUARD below
 *        (it must not be smuggled in as a passive / FB-enter sustained buff, which
 *        would hand raven a permanent +47.32% on her dominant damage channel).
 *
 *   B1   all enemies (including parts): 492.3% of final ATK as Burst Skill damage.
 *        => flatDamage at burst cast. Burst-cast damage is FB-exempt (it lands
 *           before the Full Burst window opens).
 *   B2   self, A.N. Mode: Effect 1 removes Single Point Attack (moot - S2c is a GAP);
 *        Effect 2 Sustained damage up 89.44%, 10 sec.
 *        => burstCast self buff, sustainedDamagePct 89.44. This is the line that
 *           makes the S1a FLAVOR observable: zeroing it may only move damage if the
 *           DoT really is sustained-flavored.
 *
 * FIXTURE
 *   controlComp('raven', helm) - liter B1 + crown B2 supply the burst chain so the
 *   B3 carry actually casts (a lone B3 makes ZERO Full Bursts).
 *   BASE = helm=true (the standard control; helm is a second B3, so raven does NOT
 *          necessarily own every Full Burst -> this is the comp where FB-enter and
 *          burst-cast keying can diverge).
 *   SOLO = helm=false (raven is the ONLY B3 -> every Full Burst is hers, and
 *          srcSlot-filtered damage events are attributable to her: liter and crown
 *          carry no damage riders).
 *
 * DISCRIMINATION STYLE
 *   Counterfactuals mutate effect FIELDS in place (atkPct/value/durationSec -> 0 or
 *   x2) rather than deleting blocks, so shot counts, gauge generation and rotation
 *   timing stay byte-identical between control and counterfactual; only the damage
 *   attributable to the patched line moves. Every patch carries a hit counter and
 *   the test asserts the counter fired - a patch that silently matched NOTHING is a
 *   divergence in the encoding, not a passing test.
 */

const SLUG = 'raven';

// --- shape-tolerant override access ---------------------------------------
// The packet describes the override file two ways (slot -> Block[] vs slot ->
// CharacterSkills{blocks}). Both are handled so the spec tests the SEMANTICS, not
// the container.
function blocksOf(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) {return [];}
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function eachEffect(ov: any, fn: (e: any, b: any, slot: string) => void): void {
  for (const slot of ['skill1', 'skill2', 'burst']) {
    for (const b of blocksOf(ov, slot)) {
      for (const e of b.effects ?? []) {fn(e, b, slot);}
    }
  }
}

function patch(mutate: (ov: any) => void): any {
  return { [SLUG]: withPatchedOverride(SLUG, mutate as any) };
}

function run(overrides?: any, helm = true): { res: any; events: any[] } {
  const events: SimEvent[] = [];
  const base: any = controlComp(SLUG, helm);
  const res = runComp({
    ...base,
    ...(overrides ? { overrides } : {}),
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as any);
  return { res, events: events as any[] };
}

const rav = (r: { res: any }): number => totals(r.res)[SLUG];

// --- hoisted runs (each is a full 180s sim) --------------------------------
let nDotZero = 0;
let nDotDouble = 0;
let nDotShort = 0;
let nBurstSust = 0;
let nAtkZero = 0;
let nAtkShort = 0;
let nNukeZero = 0;
let nParts = 0;

const BASE = run();
const SOLO = run(undefined, false);

// S1a magnitude: 68.46 -> 0 and 68.46 -> 136.92 (linearity of the DoT channel).
const DOT_ZERO = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'dot') {
        e.atkPct = 0;
        nDotZero++;
      }
    })
  )
);
const DOT_DOUBLE = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'dot') {
        e.atkPct = e.atkPct * 2;
        nDotDouble++;
      }
    })
  )
);
// S1a duration/stacking: 5 sec -> 1 sec collapses the overlap to (at most) one
// live instance at a time.
const DOT_SHORT = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'dot') {
        e.durationSec = 1;
        nDotShort++;
      }
    })
  )
);
// B2 magnitude (also the S1a FLAVOR probe).
const BURST_SUST_ZERO = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === 'sustainedDamagePct') {
        e.value = 0;
        nBurstSust++;
      }
    })
  )
);
// S1b magnitude + duration.
const ATK_ZERO = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        e.value = 0;
        nAtkZero++;
      }
    })
  )
);
const ATK_SHORT = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        e.durationSec = 2;
        nAtkShort++;
      }
    })
  )
);
// B1 magnitude.
const NUKE_ZERO = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'flatDamage') {
        e.atkPct = 0;
        nNukeZero++;
      }
    })
  )
);
// S2a/S2b inertness.
const PARTS_ZERO = run(
  patch((ov) =>
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === 'partsDamagePct') {
        e.value = 0;
        nParts++;
      }
    })
  )
);

// --- event slices ----------------------------------------------------------
const baseEv = BASE.events;
const soloEv = SOLO.events;
const fbStartsBase = baseEv.filter((e) => e.kind === 'fullBurstStart');
const fbStartsSolo = soloEv.filter((e) => e.kind === 'fullBurstStart');

// SELF-cast caster-scaled ATK grants only: crown also hands out casterAtkPct, so
// the self filter is casterIdx === targetIdx (both non-null).
const selfAtkBase = baseEv.filter(
  (e) =>
    e.kind === 'buffApply' &&
    e.stat === 'casterAtkPct' &&
    e.targetSlug === SLUG &&
    e.casterIdx !== null &&
    e.casterIdx === e.targetIdx
);
const selfAtkShort = ATK_SHORT.events.filter(
  (e) =>
    e.kind === 'buffApply' &&
    e.stat === 'casterAtkPct' &&
    e.targetSlug === SLUG &&
    e.casterIdx !== null &&
    e.casterIdx === e.targetIdx
);

const sustBase = baseEv.filter(
  (e) =>
    e.kind === 'buffApply' &&
    e.stat === 'sustainedDamagePct' &&
    e.targetSlug === SLUG &&
    e.value === 89.44
);
const sustSolo = soloEv.filter(
  (e) =>
    e.kind === 'buffApply' &&
    e.stat === 'sustainedDamagePct' &&
    e.targetSlug === SLUG &&
    e.value === 89.44
);

const committed: any = withPatchedOverride(SLUG, () => {});
const partsEffects: any[] = [];
eachEffect(committed, (e) => {
  if (e.kind === 'buff' && e.stat === 'partsDamagePct') {partsEffects.push(e);}
});
const unmodeledBlob = JSON.stringify(committed?.unmodeled ?? {});

const teammates = Object.keys(totals(BASE.res)).filter((s) => s !== SLUG);

describe('raven S1a - full-charge sustained DoT (68.46%/sec, 5 sec)', () => {
  it('is encoded as a DoT and is load-bearing', () => {
    // A patch that matched nothing would make every DoT assertion below vacuous.
    expect(nDotZero).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // 68.46%/sec x several overlapping instances dwarfs an RL normal (61.3% at
    // roughly one charged shot per second), so a faithful model is far above the
    // DoT-less counterfactual. RED if the line is missing or encoded as a single
    // one-shot rider.
    expect(rav(BASE)).toBeGreaterThan(rav(DOT_ZERO) * 1.25);
  });

  it('scales linearly in atkPct, pinning 68.46 as the live per-tick magnitude', () => {
    expect(nDotDouble).toBeGreaterThan(0);
    const oneX = rav(BASE) - rav(DOT_ZERO);
    const twoX = rav(DOT_DOUBLE) - rav(DOT_ZERO);
    expect(oneX).toBeGreaterThan(0);
    // RED under any model where the DoT channel is entangled with a second
    // (mis-flavoured or duplicated) damage source, or where the magnitude is
    // sourced from something other than this atkPct field.
    expect(twoX / oneX).toBeGreaterThan(1.98);
    expect(twoX / oneX).toBeLessThan(2.02);
  });

  it('instances STACK: the 5 sec window overlaps several full-charge shots', () => {
    expect(nDotShort).toBeGreaterThan(0);
    const stacked = rav(BASE) - rav(DOT_ZERO);
    const unstacked = rav(DOT_SHORT) - rav(DOT_ZERO);
    expect(stacked).toBeGreaterThan(0);
    // Raven charges roughly one shot per second (chargeFrames 60) between 6-round
    // magazines, so a 5 sec window holds ~3-4 concurrent instances. RED under the
    // nearest-wrong REFRESH model (one instance whose duration is merely reset per
    // shot), which would leave the two runs nearly equal.
    expect(stacked).toBeGreaterThan(unstacked * 2.0);
  });

  it('carries the SUSTAINED flavor (the burst buff must reach it)', () => {
    expect(nBurstSust).toBeGreaterThan(0);
    // The only sustained-flavored damage raven owns is this DoT. Zeroing the burst's
    // Sustained damage up 89.44% must therefore LOWER her total. RED if the DoT is
    // flavor-less / true-flavored / sequential (the buff would then be inert and the
    // two runs identical), and RED if the burst buff is missing.
    expect(rav(BURST_SUST_ZERO)).toBeLessThan(rav(BASE));
  });

  it('ticks both inside and outside Full Burst (non-vacuity of the FB timing rule)', () => {
    // SOLO comp: liter/crown carry no damage riders, so skill1-sourced damage is
    // raven's DoT. A DoT gated to one FB state would fail one of these.
    const ticks = soloEv.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'skill1'
    );
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.filter((e) => e.inFullBurst === true).length).toBeGreaterThan(
      0
    );
    expect(ticks.filter((e) => e.inFullBurst === false).length).toBeGreaterThan(
      0
    );
  });

  it.skip('stacks up to 10 - the CAP is non-binding at RL cadence (GAP)', () => {
    // The engine appends one DoT instance per fire and has no per-DoT stack cap.
    // At ~1 charged shot/sec with a 5 sec window (and a 141-frame reload every 6
    // rounds) the live instance count peaks around 4, so a cap-enforcing model and
    // a cap-free model are INDISTINGUISHABLE in this fixture. Enforcing the cap
    // would need either a stack primitive on `dot` or a fixture that fires >10
    // charges inside 5 sec (raven cannot). Flagged, not faked.
  });

  it.skip('DoT crit gating is MEASUREMENT-GATED (default OFF)', () => {
    // The global DOT_CRIT gate is default-off and per-DoT crit:true is opt-in ONLY
    // where measured (isabel). No raven footage is cited in this packet, so the
    // faithful blind reading leaves crit unset. Needs a popup read (orange bodies
    // on the 68.46% ticks) to settle. Same for a per-kit noFb exemption: default
    // OFF, measured-only.
  });
});

describe('raven S1b - Full-Burst-enter self ATK (47.52% of skill user ATK, 10 sec)', () => {
  it('is CASTER-scaled and flat-resolved, not a target-scaled atkPct', () => {
    expect(nAtkZero).toBeGreaterThan(0);
    expect(selfAtkBase.length).toBeGreaterThan(0);
    for (const ev of selfAtkBase) {
      // casterAtkPct re-emits as FLAT ATK at apply time. A plain atkPct model emits
      // the raw 47.52 under a different stat, so this is RED for the nearest-wrong.
      expect(ev.value).toBeGreaterThan(1000);
      expect(ev.value).not.toBe(47.52);
    }
    // Resolved against the caster's STATIC ATK, so every application is identical -
    // RED under a final-ATK (buff-compounding) model.
    const distinct = new Set(selfAtkBase.map((e) => e.value));
    expect(distinct.size).toBe(1);
    expect(rav(ATK_ZERO)).toBeLessThan(rav(BASE));
  });

  it('is SELF-scoped (no teammate receives it)', () => {
    const strays = baseEv.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'casterAtkPct' &&
        e.casterIdx !== null &&
        e.casterIdx === e.targetIdx &&
        e.targetSlug !== SLUG
    );
    // Only raven self-casts a caster-scaled ATK grant in this comp; crown's grants
    // are cross-unit (casterIdx !== targetIdx) and are excluded by the filter.
    expect(strays.length).toBe(selfAtkBase.length - selfAtkBase.length);
  });

  it('fires on FULL-BURST ENTRY, i.e. once per team Full Burst', () => {
    expect(fbStartsBase.length).toBeGreaterThan(0);
    // helm is a second Burst III in the BASE comp, so any rotation helm completes is
    // a Full Burst raven did not cast. Keying this line to burstCast (the nearest
    // wrong for a self buff) under-fires there; keying it to fullBurstEnter gives
    // exactly one application per Full Burst.
    expect(selfAtkBase.length).toBe(fbStartsBase.length);
  });

  it('lasts exactly 10 sec', () => {
    expect(nAtkShort).toBeGreaterThan(0);
    expect(selfAtkShort.length).toBeGreaterThan(0);
    // Same deterministic run, same first application frame; only durationSec moved
    // 10 -> 2, so the expiry must shift by exactly 8 sec of frames. RED for 5s/15s
    // or a round-count reading.
    expect(selfAtkBase[0].expiresFrame - selfAtkShort[0].expiresFrame).toBe(
      8 * 60
    );
  });
});

describe('raven S2a/S2b - Vital Attack, Damage to Parts up 21.12% for 5 sec', () => {
  it('is accounted for, not silently dropped', () => {
    // Two independent applications exist in the kit (start of battle + FB entry).
    // Either they are encoded on the schema-inert partsDamagePct stat, or the lines
    // are recorded verbatim in `unmodeled`. Silence in both places is a drop.
    const accounted =
      partsEffects.length >= 2 ||
      /[Pp]art/.test(unmodeledBlob) ||
      /Vital/.test(unmodeledBlob);
    expect(accounted).toBe(true);
    for (const e of partsEffects) {
      expect(e.value).toBe(21.12);
      expect(e.durationSec).toBe(5);
    }
  });

  it('moves NO damage (the scope-lock boss is partless)', () => {
    // Byte-identical totals for every unit: parts damage is inert in v1.
    for (const slug of Object.keys(totals(BASE.res))) {
      expect(totals(PARTS_ZERO.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
  });

  it('is not laundered into a live damage stat (over-credit guard)', () => {
    // The nearest wrong is encoding 21.12% as attackDamagePct / sustainedDamagePct
    // so the line stops being inert. Nothing raven-targeted may carry 21.12 on a
    // stat other than partsDamagePct.
    const laundered = baseEv.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug === SLUG &&
        e.value === 21.12 &&
        e.stat !== 'partsDamagePct'
    );
    expect(laundered).toHaveLength(0);
  });
});

describe('raven S2c - Single Point Attack (sustained up 47.32%, 15 sec)', () => {
  it('is NOT modeled as a live buff (over-credit guard)', () => {
    // The trigger is an ally/self destroying an enemy PART. The scope-lock boss has
    // no parts and the schema has no part-destruction trigger, so the line can never
    // fire. Encoding it as passive / fullBurstEnter would hand raven a near-permanent
    // +47.32% on her dominant (sustained) channel - the single largest over-credit
    // available in this kit. RED if any 47.32 sustained grant reaches her.
    const smuggled = baseEv.filter(
      (e) =>
        e.kind === 'buffApply' && e.targetSlug === SLUG && e.value === 47.32
    );
    expect(smuggled).toHaveLength(0);
  });

  it.skip('sustained up 47.32% for 15 sec on part destruction (GAP)', () => {
    // Missing primitive: no part-destruction trigger, and the v1 boss is partless.
    // The A.N. Mode exclusion gate (self only if NOT in A.N. Mode) and the burst's
    // Effect 1 (removes Single Point Attack) are moot while the grant is unreachable
    // - a mode gate over a buff that never exists is untestable. Both belong in the
    // override's `unmodeled` record.
  });
});

describe('raven burst - 492.3% nuke + A.N. Mode sustained up 89.44% (10 sec)', () => {
  it('the 492.3% burst hit exists and is load-bearing', () => {
    expect(nNukeZero).toBeGreaterThan(0);
    expect(rav(NUKE_ZERO)).toBeLessThan(rav(BASE));
  });

  it('burst-cast damage takes no Full Burst major', () => {
    // A burst cast lands before the Full Burst window opens, so the +50% FB major
    // must not be stamped on it. SOLO comp keeps burst-sourced damage attributable
    // (liter/crown deal no burst damage).
    const burstHits = soloEv.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst'
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const h of burstHits) {expect(h.fbMajorApplied).not.toBe(true);}
  });

  it('A.N. Mode sustained buff is self-scoped, 89.44, and burst-CAST keyed', () => {
    expect(sustSolo.length).toBeGreaterThan(0);
    for (const e of sustSolo) {expect(e.targetSlug).toBe(SLUG);}
    // SOLO: raven is the only Burst III, so she casts on every Full Burst and the
    // counts coincide (non-vacuity - the buff really does fire every rotation).
    expect(sustSolo.length).toBe(fbStartsSolo.length);
    // BASE: helm is a second Burst III. A self mode declared in raven's OWN burst
    // block is burst-cast keyed, so it can only ever fire on a SUBSET of team Full
    // Bursts. RED if it were keyed to fullBurstEnter and helm ever completes a
    // rotation raven sat out.
    expect(sustBase.length).toBeLessThanOrEqual(fbStartsBase.length);
    expect(sustBase.length).toBeGreaterThan(0);
  });

  it('lasts long enough to cover a Full Burst window (10 sec)', () => {
    // expiresFrame is a hard frame stamp; the window must be 10 sec of frames past
    // the cast. Read structurally off the committed effect so a 5s/15s mis-read is
    // caught even though the engine emits no lapse event.
    const sustEffects: any[] = [];
    eachEffect(committed, (e) => {
      if (
        e.kind === 'buff' &&
        e.stat === 'sustainedDamagePct' &&
        e.value === 89.44
      ) {
        sustEffects.push(e);
      }
    });
    expect(sustEffects.length).toBeGreaterThan(0);
    for (const e of sustEffects) {expect(e.durationSec).toBe(10);}
  });
});

describe('raven - inertness on teammates', () => {
  it('none of raven damage lines move an ally total', () => {
    // Raven's kit is entirely self-scoped: a DoT on the enemy, a self ATK grant, a
    // self sustained grant and a burst nuke. Every counterfactual zeroes a MAGNITUDE
    // (never a block), so shot counts and gauge generation are untouched and each
    // teammate total must be byte-identical. RED if any of these lines were mis-scoped
    // to allies or perturbed the rotation.
    for (const mate of teammates) {
      expect(totals(DOT_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
      expect(totals(ATK_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
      expect(totals(NUKE_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
      expect(totals(BURST_SUST_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
    }
  });
});
