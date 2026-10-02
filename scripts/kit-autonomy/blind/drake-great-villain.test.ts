/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * drake-great-villain — Drake: Great Villain (SG / Wind / Defender / Burst III)
 * BLIND kit spec test, written from the kit prose alone (no driver artifacts consulted).
 *
 * Base: ammo 9, reload 111f, hitsPerShot 10, normal mult 201.5, chargeFrames 0 —
 * the BASE gun does not charge, so any charge multiplier seen in this comp is the swap's.
 *
 * Kit lines under test
 *   S1-a  "when entering Full Burst" -> weapon change (charge fixed 1.5s, 243.75%, 15 pellets,
 *         full-charge 300%, max ammo 6). TEAM Full-Burst entry, NOT her own burst cast.
 *   S1-b  "when [the swap] ends" -> removes 100% of ammo (dumps the base gun handed back full,
 *         forcing a reload after every Full Burst — a shot-count / damage line, not a defensive one).
 *   S2-a  "when Full Burst ends", all allies -> Max HP up 10.5% of the SKILL USER's max HP,
 *         continuous, stacks to 4.
 *   S2-b  battle start, self -> ATK up 6.23% of the skill user's final max HP, continuous.
 *   B-a   self -> Attack Damage up 27.5% for 25 sec (fires on her OWN burst cast).
 *   B-b   all enemies -> 1350% of final ATK as Burst Skill damage.
 *
 * The load-bearing coupling: S2-a's SELF-granted Max HP feeds S2-b's own-Max-HP -> ATK conversion
 * (ally-granted Max HP does not feed a teammate's conversion), so her ATK RAMPS across the fight
 * (4 stacks = +42% Max HP). That makes the stat choice in S2-b discriminating: a snapshot-at-apply
 * conversion applied at battle start would freeze at frame-0 HP and never see a single stack.
 *
 * Fixtures
 *   soloB3 = controlComp(SLUG, false) — liter B1 / crown B2 / drake B3. Drake is the SOLE Burst III,
 *            so she casts every rotation and helm's crit/charge buffs never confound a reading.
 *   twoB3  = controlComp(SLUG, true)  — adds helm as a second Burst III, so some Full Bursts are NOT
 *            hers. That is the ONLY fixture where team-FB triggers and own-burst triggers diverge,
 *            so the trigger-identity counterfactuals live there behind an explicit non-vacuity check.
 *
 * Run budget: 13 full 180s sims, hoisted to module scope.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'drake-great-villain';

type Comp = ReturnType<typeof controlComp>;
type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';
type Found = { slot: Slot; block: any; effect: any };

const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

// The override FILE is slot-keyed; depending on the loader a slot is either a raw Block[] or a
// CharacterSkills carrying .blocks. Read both shapes so a shape mismatch is not mistaken for a
// kit divergence. Blocks are returned BY REFERENCE, so in-place mutation patches either shape.
function blocksOf(ov: any, slot: Slot): any[] {
  const raw = ov?.[slot];
  if (Array.isArray(raw)) return raw;
  return Array.isArray(raw?.blocks) ? raw.blocks : [];
}

function findEffect(
  ov: any,
  kind: string,
  pred?: (e: any) => boolean,
): Found | null {
  for (const slot of SLOTS) {
    for (const block of blocksOf(ov, slot)) {
      for (const effect of block?.effects ?? []) {
        if (effect?.kind === kind && (!pred || pred(effect)))
          return { slot, block, effect };
      }
    }
  }
  return null;
}

// Fails LOUDLY with the kit line's name: an absent effect is itself the finding.
function mustFind(
  ov: any,
  kind: string,
  label: string,
  pred?: (e: any) => boolean,
): Found {
  const hit = findEffect(ov, kind, pred);
  if (!hit)
    throw new Error(
      `[${SLUG}] no '${kind}' effect found for kit line: ${label}`,
    );
  return hit;
}

const isMaxHpGrant = (e: any) =>
  e?.kind === 'buff' &&
  ['casterMaxHpPct', 'targetMaxHpPct', 'maxHpPct', 'highestAllyMaxHpPct'].includes(
    String(e.stat),
  );
const isHpToAtk = (e: any) =>
  e?.kind === 'buff' && String(e.stat).startsWith('atkOf');
const isDamageUp = (e: any) =>
  e?.kind === 'buff' && String(e.stat) === 'attackDamagePct';

function run(opts: Comp): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const tapped = {
    ...(opts as any),
    cfg: {
      ...((opts as any).cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        events.push(ev as Ev);
      },
    },
  } as Comp;
  return { res: runComp(tapped), events };
}

function withOv(opts: Comp, ov: any): Comp {
  return {
    ...(opts as any),
    overrides: { ...((opts as any).overrides ?? {}), [SLUG]: ov },
  } as Comp;
}

const D = (res: any): number => totals(res)[SLUG];

// ---------------------------------------------------------------------------
// Shipped override (an unmutated clone, used for structural reads) + counterfactuals
// ---------------------------------------------------------------------------
const shipped: any = withPatchedOverride(SLUG, () => {});

const pNoSwap = withPatchedOverride(SLUG, (ov: any) => {
  const hit = mustFind(ov, 'weaponSwap', 'S1-a Super Duper Overdrive');
  hit.block.effects = hit.block.effects.filter(
    (e: any) => e.kind !== 'weaponSwap',
  );
});

const pSwapAmmo1 = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'weaponSwap', 'S1-a max ammo 6').effect.maxAmmo = 1;
});

const pNoAmmoDump = withPatchedOverride(SLUG, (ov: any) => {
  const hit = mustFind(ov, 'consumeAmmo', 'S1-b removes 100% of ammo');
  hit.block.effects = hit.block.effects.filter(
    (e: any) => e.kind !== 'consumeAmmo',
  );
});

const pStacks1 = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'buff', 'S2-a Max HP stacks', isMaxHpGrant).effect.maxStacks = 1;
});

const pNoHpToAtk = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'buff', 'S2-b Fashionably Late', isHpToAtk).effect.value = 0;
});

const pStacks1NoHpToAtk = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'buff', 'S2-a Max HP stacks', isMaxHpGrant).effect.maxStacks = 1;
  mustFind(ov, 'buff', 'S2-b Fashionably Late', isHpToAtk).effect.value = 0;
});

const pBurstBuffPermanent = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'buff', 'B-a Attack Damage 25 sec', isDamageUp).effect.durationSec = 900;
});

const pNoNuke = withPatchedOverride(SLUG, (ov: any) => {
  const hit = mustFind(ov, 'flatDamage', 'B-b 1350% burst damage');
  hit.block.effects = hit.block.effects.filter(
    (e: any) => e.kind !== 'flatDamage',
  );
});

const pNukeNoFb = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'flatDamage', 'B-b 1350% burst damage').effect.noFb = true;
});

const pSwapOwnGated = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'weaponSwap', 'S1-a trigger identity').block.ownBurstGate = 'cast';
});

const pBurstBuffOnFbEnter = withPatchedOverride(SLUG, (ov: any) => {
  // The self Damage-Up and the enemy nuke can never share a block (target is a Block field),
  // so re-keying this block cannot accidentally re-key the 1350% hit.
  mustFind(ov, 'buff', 'B-a trigger identity', isDamageUp).block.trigger = {
    kind: 'fullBurstEnter',
  };
});

// ---------------------------------------------------------------------------
// Hoisted runs (13 full 180s sims)
// ---------------------------------------------------------------------------
const soloB3 = () => controlComp(SLUG, false);
const twoB3 = () => controlComp(SLUG, true);

const base = run(soloB3());
const rNoSwap = runComp(withOv(soloB3(), pNoSwap));
const rSwapAmmo1 = runComp(withOv(soloB3(), pSwapAmmo1));
const rNoAmmoDump = runComp(withOv(soloB3(), pNoAmmoDump));
const rStacks1 = runComp(withOv(soloB3(), pStacks1));
const rNoHpToAtk = runComp(withOv(soloB3(), pNoHpToAtk));
const rStacks1NoHpToAtk = runComp(withOv(soloB3(), pStacks1NoHpToAtk));
const rBurstPermanent = runComp(withOv(soloB3(), pBurstBuffPermanent));
const rNoNuke = runComp(withOv(soloB3(), pNoNuke));
const rNukeNoFb = runComp(withOv(soloB3(), pNukeNoFb));

const helmBase = run(twoB3());
const rHelmSwapOwnGated = runComp(withOv(twoB3(), pSwapOwnGated));
const rHelmBuffFbEnter = runComp(withOv(twoB3(), pBurstBuffOnFbEnter));

const ALLIES = Object.keys(totals(base.res)).filter((s) => s !== SLUG);

describe('drake-great-villain — fixture sanity', () => {
  it('the sole-Burst-III fixture actually bursts and reaches Full Burst repeatedly', () => {
    const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;
    const fbEnds = base.events.filter((e) => e.kind === 'fullBurstEnd').length;
    // Non-vacuity for every FB-keyed line below, and for the 4-stack cap in particular:
    // fewer than 5 Full Burst ENDS could never demonstrate the cap binding.
    expect(fbStarts).toBeGreaterThanOrEqual(5);
    expect(fbEnds).toBeGreaterThanOrEqual(5);
    expect(D(base.res)).toBeGreaterThan(0);
    expect(ALLIES.length).toBeGreaterThanOrEqual(2);
  });
});

describe('S1-a — "entering Full Burst": Super Duper Overdrive weapon change', () => {
  it('encodes the datamined swap block verbatim (real weapon change, SG, 15 pellets)', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'weaponSwap',
      'S1-a Super Duper Overdrive',
    );
    expect(slot).toBe('skill1');
    // Trigger identity: "Activates when entering Full Burst" = ANY team Full Burst,
    // never burstCast (which fires pre-FB and would lose the FB window entirely).
    expect(block.trigger?.kind).toBe('fullBurstEnter');
    expect(block.target?.kind).toBe('self');
    expect(block.ownBurstGate).toBeUndefined();
    // "Damage: 243.75%" is the FULL-SHOT total (all pellets), same convention as a real SG's
    // normalAttackMultiplier — not a per-pellet value.
    expect(effect.damagePct).toBeCloseTo(243.75, 4);
    expect(effect.chargeMultPct).toBeCloseTo(300, 4); // "Full Charge Damage: 300%"
    expect(effect.maxAmmo).toBe(6); // "Max Ammunition Capacity: 6"
    expect(effect.pelletCount).toBe(15); // "Pellet Count: 15"
    // weapon:'SG' is load-bearing: it routes the swap through the accuracy-circle pellet-landing
    // model instead of 100%-guaranteed landing. Omitting it silently over-credits every shot.
    expect(effect.weapon).toBe('SG');
    // "Charge Time: Fixed at 1.5 sec" — either encoding of the fixed charge is faithful.
    expect(effect.chargeTimeClamp ?? effect.chargeTimeSec).toBeCloseTo(1.5, 4);
    // A real weapon CHANGE, not a re-flavor: sameWeapon would wrongly suppress the fresh magazine
    // on entry and the full base gun handed back on exit — which is exactly what S1-b then dumps.
    expect(effect.sameWeapon).toBeFalsy();
    // Kit-silent duration (FLAGGED): nothing in the prose bounds Overdrive. It must at minimum
    // cover the Full Burst window it is granted for.
    expect(effect.durationSec).toBeGreaterThanOrEqual(10);
  });

  it('the swap is the only charge weapon in the comp and fires at exactly x3.0 full-charge', () => {
    // liter (SMG) and crown (SG) do not charge and drake's BASE gun has chargeFrames 0, so every
    // charged damage instance in this comp is an Overdrive shot. Nearest-wrong: a swap authored
    // without chargeMultPct inherits the base SG's (absent) charge multiplier -> no x3 shots at all.
    const charged = base.events.filter(
      (e) => e.kind === 'damage' && Number(e.mult?.charge ?? 1) > 1,
    );
    expect(charged.length).toBeGreaterThanOrEqual(4);
    const offSpec = charged.filter(
      (e) => Math.abs(Number(e.mult.charge) - 3) > 1e-6,
    );
    expect(offSpec.length).toBe(0);
  });

  it('every Overdrive shot lands INSIDE Full Burst (window scoping)', () => {
    // Discriminates a swap keyed passive/battleStart, or given a duration that outlives the window
    // it was granted for: either leaks x3 charge shots outside Full Burst.
    const charged = base.events.filter(
      (e) => e.kind === 'damage' && Number(e.mult?.charge ?? 1) > 1,
    );
    const leaked = charged.filter((e) => e.inFullBurst !== true);
    expect(leaked.length).toBe(0);
  });

  it('the weapon change materially moves drake damage (the line is not inert)', () => {
    const delta = Math.abs(D(rNoSwap) - D(base.res));
    expect(delta).toBeGreaterThan(0.005 * D(base.res));
  });

  it('the 6-round Overdrive magazine is a real shot economy', () => {
    // maxAmmo 6 vs 1: at a fixed 1.5s charge the 6-round belt does not force a mid-window reload,
    // a 1-round belt does. Nearest-wrong (maxAmmo dropped / inherited from the base 9-round gun)
    // changes the number of Overdrive shots the window can hold.
    expect(D(rSwapAmmo1)).toBeLessThan(D(base.res));
  });
});

describe('S1-b — "when Super Duper Overdrive ends": removes 100% of ammo', () => {
  it('encodes a self-targeted full-magazine dump keyed to the end of the window', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'consumeAmmo',
      'S1-b removes 100% of ammo',
    );
    expect(slot).toBe('skill1');
    expect(block.target?.kind).toBe('self');
    // "Removes 100%" — the whole belt (fraction defaults to 1 when omitted).
    expect(effect.fraction ?? 1).toBeCloseTo(1, 6);
    // No swapEnd primitive exists; fullBurstEnd is the faithful proxy for "when Overdrive ends"
    // because the swap is granted at FB entry for the FB window (see the it.skip gap below).
    expect(block.trigger?.kind).toBe('fullBurstEnd');
  });

  it('dropping the ammo dump OVER-credits drake (it costs her a reload every cycle)', () => {
    // The base gun is handed back FULL on swap exit; this line immediately empties it and forces a
    // 111-frame reload after every Full Burst. Modelling it as "defensive / no damage" (the MISSING
    // reading) gives her that magazine for free.
    expect(D(rNoAmmoDump)).toBeGreaterThan(D(base.res));
    expect(D(rNoAmmoDump) - D(base.res)).toBeGreaterThan(0.002 * D(base.res));
    // NOTE: deliberately no teammate-inertness assertion here — this line changes drake's SHOT
    // count, which changes her burst-gauge feed and can legitimately shift the whole rotation.
  });
});

describe('S2-a — "when Full Burst ends", all allies: Max HP 10.5% of the skill user, 4 stacks', () => {
  it('encodes a caster-scaled, continuous, 4-stack Max HP grant to all allies', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'buff',
      'S2-a Max HP stacks',
      isMaxHpGrant,
    );
    expect(slot).toBe('skill2');
    expect(block.trigger?.kind).toBe('fullBurstEnd');
    expect(block.target?.kind).toBe('allies');
    // "Affects all allies" includes the skill user — and self-inclusion is load-bearing here,
    // because only the SELF-granted stacks feed her own Max-HP -> ATK conversion (S2-b).
    expect(block.target?.excludeSelf).toBeFalsy();
    // "...of the SKILL USER's max HP" — caster-scaled, not each target's own Max HP.
    expect(effect.stat).toBe('casterMaxHpPct');
    expect(effect.value).toBeCloseTo(10.5, 4);
    expect(effect.maxStacks).toBe(4);
    expect(effect.durationSec).toBeUndefined(); // "continuously"
  });

  it('applies at Full Burst END to every ally and caps at 4 stacks', () => {
    // casterMaxHpPct re-emits FLAT-resolved under stat 'maxHpFlat'; maxStacks===4 identifies this line.
    const applies = base.events.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'maxHpFlat' && e.maxStacks === 4,
    );
    expect(applies.length).toBeGreaterThanOrEqual(6);
    const stacks = applies.map((e) => Number(e.stacks));
    expect(Math.min(...stacks)).toBe(1); // ramps from 1 (not instant-to-cap)
    expect(Math.max(...stacks)).toBe(4); // and the cap is REACHED, so the cap is non-vacuous
    expect(stacks.filter((s) => s > 4).length).toBe(0); // and never exceeded
    // Uniform caster-scaled flat value across every target (a per-target-own-HP encoding would
    // give the Defender caster and her teammates different numbers).
    const values = new Set(applies.map((e) => Number(e.value)));
    expect(values.size).toBe(1);
    expect([...values][0]).toBeGreaterThan(0);
    // Target set: self AND the rest of the team.
    const targets = new Set(applies.map((e) => String(e.targetSlug)));
    expect(targets.has(SLUG)).toBe(true);
    for (const ally of ALLIES) expect(targets.has(ally)).toBe(true);
  });

  it('the stacks raise drake own damage and are offensively inert on teammates', () => {
    // Capping at 1 stack instead of 4 removes 31.5% of her Max HP, which S2-b converts to ATK.
    expect(D(rStacks1)).toBeLessThan(D(base.res));
    expect(D(base.res) - D(rStacks1)).toBeGreaterThan(0.01 * D(base.res));
    // Inertness: ally-granted Max HP feeds no teammate conversion, and the patch changes no shot
    // count, so the rotation is untouched and teammates must be byte-identical.
    for (const ally of ALLIES)
      expect(totals(rStacks1)[ally]).toBe(totals(base.res)[ally]);
  });
});

describe('S2-b — battle start, self: ATK 6.23% of the skill user final Max HP', () => {
  it('encodes a LIVE own-Max-HP conversion (not a snapshot at apply time)', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'buff',
      'S2-b Fashionably Late',
      isHpToAtk,
    );
    expect(slot).toBe('skill2');
    expect(['battleStart', 'passive']).toContain(block.trigger?.kind);
    expect(block.target?.kind).toBe('self');
    // atkOfMaxHpPct re-reads the target's OWN live Max HP every frame. The nearest-wrong,
    // atkOfCasterMaxHpPct, snapshots at APPLY time — applied at battle start it would freeze at
    // frame-0 Max HP and never see a single S2-a stack, silently deleting her whole ramp.
    expect(effect.stat).toBe('atkOfMaxHpPct');
    expect(effect.value).toBeCloseTo(6.23, 4);
    expect(effect.durationSec).toBeUndefined(); // "continuously"
  });

  it('the conversion is live and carries a large share of her damage', () => {
    expect(D(rNoHpToAtk)).toBeLessThan(D(base.res));
    expect(D(base.res) - D(rNoHpToAtk)).toBeGreaterThan(0.02 * D(base.res));
    for (const ally of ALLIES)
      expect(totals(rNoHpToAtk)[ally]).toBe(totals(base.res)[ally]);
  });

  it('this conversion is the ONLY path from the S2-a stacks to damage', () => {
    // Mechanism isolation: with the conversion zeroed, capping the stacks at 1 must become a
    // byte-identical no-op. If it still moves damage, the Max HP grant is reaching damage through
    // some other (unfaithful) route.
    expect(D(rStacks1NoHpToAtk)).toBe(D(rNoHpToAtk));
  });
});

describe('burst — self Attack Damage 27.5% for 25 sec', () => {
  it('encodes a 25-second self Damage-Up on her OWN burst cast', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'buff',
      'B-a Attack Damage 25 sec',
      isDamageUp,
    );
    expect(slot).toBe('burst');
    expect(block.trigger?.kind).toBe('burstCast');
    expect(block.target?.kind).toBe('self');
    // "Attack Damage" is the additive Damage-Up bucket, NOT an ATK-bucket atkPct.
    expect(effect.stat).toBe('attackDamagePct');
    expect(effect.value).toBeCloseTo(27.5, 4);
    expect(effect.durationSec).toBeCloseTo(25, 6); // seconds — not rounds, not permanent
    expect(effect.durationShots).toBeUndefined();
  });

  it('is applied to drake once per burst cast', () => {
    const applies = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(Number(e.value) - 27.5) < 1e-6 &&
        e.targetSlug === SLUG,
    );
    expect(applies.length).toBeGreaterThanOrEqual(3);
  });

  it('the 25-second window is a real duty cycle, not permanent uptime', () => {
    // Her burst cooldown is 40s, so 25s can never be full uptime; stretching it to permanent must
    // ADD damage. Nearest-wrong: durationSec dropped (continuous) or mis-read as rounds.
    expect(D(rBurstPermanent)).toBeGreaterThan(D(base.res));
    expect(D(rBurstPermanent) - D(base.res)).toBeGreaterThan(0.005 * D(base.res));
    for (const ally of ALLIES)
      expect(totals(rBurstPermanent)[ally]).toBe(totals(base.res)[ally]);
  });
});

describe('burst — 1350% of final ATK to all enemies', () => {
  it('encodes a burst-slot enemy-targeted 1350% hit', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'flatDamage',
      'B-b 1350% burst damage',
    );
    expect(slot).toBe('burst');
    expect(block.target?.kind).toBe('enemy');
    expect(block.trigger?.kind).toBe('burstCast');
    expect(effect.atkPct).toBeCloseTo(1350, 4);
    // "Affects all enemies" — the AoE scope tag, never the single-target one.
    expect(effect.burstDesc).not.toBe('singleEnemy');
    // Burst Skill damage is not core-flavored and takes no range bonus in its own right.
    expect(effect.core).toBeFalsy();
  });

  it('the hit is live and a meaningful share of her total', () => {
    expect(D(rNoNuke)).toBeLessThan(D(base.res));
    expect(D(base.res) - D(rNoNuke)).toBeGreaterThan(0.01 * D(base.res));
  });

  it('already lands pre-Full-Burst, so an explicit noFb exemption is a no-op', () => {
    // Repo-measured: burst-cast damage resolves BEFORE the Full Burst window opens (no +50% major).
    // If forcing noFb changes the total, the 1350% hit is riding the FB major it should never see.
    expect(D(rNukeNoFb)).toBe(D(base.res));
  });
});

describe('trigger identity — team Full Burst vs her own burst (two-Burst-III fixture)', () => {
  it('the fixture is non-vacuous: some Full Bursts are not hers', () => {
    const fbStarts = helmBase.events.filter(
      (e) => e.kind === 'fullBurstStart',
    ).length;
    const herCasts = helmBase.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(Number(e.value) - 27.5) < 1e-6 &&
        e.targetSlug === SLUG,
    ).length;
    expect(fbStarts).toBeGreaterThanOrEqual(4);
    expect(herCasts).toBeGreaterThanOrEqual(1);
    // Strictly fewer casts than Full Bursts is what makes both counterfactuals below discriminating.
    expect(herCasts).toBeLessThan(fbStarts);
  });

  it('the weapon change fires on ANY team Full Burst, not only her own', () => {
    // Adding ownBurstGate:'cast' is the nearest-wrong reading of "when entering Full Burst".
    // It must LOSE her the Overdrive windows opened by the other Burst III.
    expect(D(rHelmSwapOwnGated)).toBeLessThan(D(helmBase.res));
    expect(D(helmBase.res) - D(rHelmSwapOwnGated)).toBeGreaterThan(
      0.005 * D(helmBase.res),
    );
  });

  it('the 27.5% Damage-Up fires only on her OWN cast, not on every Full Burst', () => {
    // Re-keying the self buff to fullBurstEnter is the nearest-wrong reading of a burst-slot self
    // line; in a two-Burst-III team it refreshes on Full Bursts she never paid a cast for.
    expect(D(rHelmBuffFbEnter)).toBeGreaterThan(D(helmBase.res));
  });
});

describe('documented gaps (not assertable from the kit prose)', () => {
  it.skip('GAP: no swapEnd trigger primitive — "when Overdrive ends" is proxied by fullBurstEnd. With a teammate granting fullBurstExtend the 10s weapon window closes BEFORE Full Burst ends, so the ammo dump fires late. No extender in this fixture, so the divergence is unobservable here.', () => {});

  it.skip('FLAGGED: the Overdrive duration is kit-silent — no prose bounds Super Duper Overdrive. Assumed to be the Full Burst window it is granted at; a measurement (count Overdrive shots per Full Burst on footage) is the only way to pin it.', () => {});

  it.skip('FLAGGED: burst-gauge economy of the 15-pellet swapped shotgun is unobservable from prose — per-trigger energy vs per-landed-pellet crediting at 15 rather than the base 10 pellets changes her own rotation feed. Needs a focus recording of the gauge bar.', () => {});
});
