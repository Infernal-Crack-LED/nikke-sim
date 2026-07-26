/**
 * blanc — kit-spec pin, written BLIND from the kit prose alone (no sight of the driver's
 * override, tests, or reasoning).
 *
 * KIT (Blanc — AR / Wind / Defender / Burst II, 60 ammo, hitsPerShot 1, cd 60s):
 *   S1  "Activates after 120 normal attack(s)" → shared Shield = 11.8% of the SKILL USER's
 *       final Max HP protecting ALL allies, 5 sec.
 *   S2a "Activates after Full Burst ends. Affects all allies." → recovers 3.68% of the user's
 *       final Max HP every 1 sec for 5 sec  (⇒ 5 recovery ticks, interval 1s).
 *   S2b "…when Full Burst ends with an ally from the same squad still on the battlefield.
 *       Affects self." → Cooldown of Burst Skill ▼ 40.76 sec.
 *   B   "Affects all allies" → recovers 3.84% user Max HP every 1 sec for 8 sec (8 ticks);
 *       "Affects 1 ally with the lowest remaining HP (except the skill user)" → Indomitability
 *       10 sec + Max HP ▲ 31.68% for 10 sec;
 *       "Affects all enemies" → Damage Taken ▲ 39.26% for 10 sec.
 *   There is NO damage line anywhere in the kit, and NO reload / ammo / fire-rate line — so
 *   "the override invents nothing offensive" is itself a testable claim (last describe).
 *
 * FIXTURE — controlComp('blanc', true) = liter B1 / crown B2 / blanc / helm B3, boss Fire.
 *   helm stays IN deliberately: both S2 lines key off Full Burst END, so the fixture must
 *   actually complete Full Bursts (a lone B3 — or here, a B2 carry with no B3 — makes ZERO).
 *   crown matters twice: (a) she is the control comp's on-recovery consumer, the ONLY
 *   damage-visible channel blanc's heal lines have (failure-mode 4: a heal inert in isolation
 *   still drives a teammate), and (b) she is a SECOND Burst II, so blanc contends for stage 2
 *   — hence the explicit non-vacuity guard before any burst-slot behavioural assertion.
 *
 * HOW THE ASSERTIONS DISCRIMINATE
 *   Shield/heal MAGNITUDES are unobservable in v1 (no HP pool; the boss deals no damage; and
 *   onEvent surfaces no shield/recovery event kind) — so trigger + target claims are read by
 *   INSTRUMENTATION: a marker buff on an engine-INERT stat ('partsDamagePct' — "parsed but
 *   inert in v1, no parts on the boss") is APPENDED to the COMMITTED block, leaving that
 *   block's trigger/target/gates untouched. The marker's buffApply stream therefore reports the
 *   committed trigger's real firing cadence and real target set. A totals-identity check proves
 *   the marker moves no damage, so the reading is uncontaminated.
 *   Blanc's own burst count is read off the boss-held Damage Taken ▲ 39.26% debuff
 *   (casterIdx === null && targetIdx === null), which is emitted once per cast.
 *   Every FAITHFUL/FIX line pairs a STRUCTURAL read of the committed override with a
 *   COUNTERFACTUAL (withPatchedOverride) that must move — or must NOT move — the reading.
 *
 * SHAPE NOTE: the packet documents two candidate OverrideFile shapes (slot → Block[] vs
 *   slot → { blocks: Block[] }). slotBlocks() accepts both and mutates the array in place, so
 *   the counterfactuals bite either way.
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

const SLUG = 'blanc';

/* ── kit magnitudes, verbatim from the prose ──────────────────────────────── */
const HIT_COUNT = 120;
const SHIELD_HP_PCT = 11.8;
const SHIELD_SEC = 5;
const S2_HEAL_TICKS = 5;
const CDR_SEC = 40.76;
const SQUAD_MATE = 'noir';
const BURST_HEAL_TICKS = 8;
const MAXHP_PCT = 31.68;
const WINDOW_SEC = 10;
const DT_PCT = 39.26;

/* ── instrumentation: inert-stat markers appended to committed blocks ─────── */
const MARK_STAT = 'partsDamagePct'; // inert in v1 (no parts on the boss) → damage-neutral
const MARK_S1 = 101.5; // non-integer so it can never collide with a kit magnitude
const MARK_S2 = 102.5;

type Slot = 'skill1' | 'skill2' | 'burst';
type AnyBlock = { trigger: any; target: any; effects: any[]; teamHas?: any; [k: string]: any };

function slotBlocks(ov: any, slot: Slot): AnyBlock[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as AnyBlock[];
  return Array.isArray(s.blocks) ? (s.blocks as AnyBlock[]) : [];
}
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];
const allBlocks = (ov: any) => SLOTS.flatMap((s) => slotBlocks(ov, s));
const effectsIn = (ov: any, slot?: Slot) =>
  (slot ? slotBlocks(ov, slot) : allBlocks(ov)).flatMap((b) => b.effects ?? []);
const hasEffect = (b: AnyBlock, kind: string) =>
  (b.effects ?? []).some((e: any) => e.kind === kind);

const shieldBlock = (ov: any) => slotBlocks(ov, 'skill1').find((b) => hasEffect(b, 'shield'));
const s2HealBlock = (ov: any) => slotBlocks(ov, 'skill2').find((b) => hasEffect(b, 'heal'));
const cdrBlock = (ov: any) => allBlocks(ov).find((b) => hasEffect(b, 'burstCdr'));
const burstHealBlock = (ov: any) => slotBlocks(ov, 'burst').find((b) => hasEffect(b, 'heal'));
const maxHpBlock = (ov: any) =>
  slotBlocks(ov, 'burst').find((b) =>
    (b.effects ?? []).some((e: any) => e.kind === 'buff' && /maxhp/i.test(String(e.stat))),
  );
const dtBlock = (ov: any) =>
  slotBlocks(ov, 'burst').find((b) =>
    (b.effects ?? []).some((e: any) => e.kind === 'buff' && e.stat === 'damageTakenPct'),
  );
const buffOf = (b: AnyBlock | undefined, re: RegExp) =>
  (b?.effects ?? []).find((e: any) => e.kind === 'buff' && re.test(String(e.stat)));

function stripEffects(ov: any, pred: (e: any) => boolean) {
  for (const b of allBlocks(ov)) b.effects = (b.effects ?? []).filter((e: any) => !pred(e));
}

/* ── run harness ─────────────────────────────────────────────────────────── */
interface BuffEv {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  refresh?: boolean;
  expiresFrame?: number;
}
interface RunOut {
  res: ReturnType<typeof runComp>;
  evs: SimEvent[];
  t: Record<string, number>;
  buffs: BuffEv[];
}

function run(mutate?: (ov: any) => void): RunOut {
  const evs: SimEvent[] = [];
  const opts: any = controlComp(SLUG, true);
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => { evs.push(ev); } };
  if (mutate) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate as any) };
  }
  const res = runComp(opts);
  return {
    res,
    evs,
    t: totals(res),
    buffs: evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[],
  };
}

const teamTotal = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);
const countKind = (evs: SimEvent[], kind: string) =>
  evs.filter((e) => (e as any).kind === kind).length;
const markerRows = (r: RunOut, v: number) =>
  r.buffs.filter((b) => b.stat === MARK_STAT && b.value === v);
const markerFires = (r: RunOut, v: number) =>
  markerRows(r, v).filter((b) => b.targetSlug === SLUG).length;
const markerTargets = (r: RunOut, v: number) =>
  new Set(markerRows(r, v).map((b) => b.targetSlug));
const dtRows = (r: RunOut) =>
  r.buffs.filter((b) => b.stat === 'damageTakenPct' && Math.abs(b.value - DT_PCT) < 1e-6);
const blancBursts = (r: RunOut) => dtRows(r).length;

function markerIndices(evs: SimEvent[], v: number): number[] {
  const out: number[] = [];
  evs.forEach((e, i) => {
    const b = e as unknown as BuffEv;
    if (b.kind === 'buffApply' && b.stat === MARK_STAT && b.value === v && b.targetSlug === SLUG) {
      out.push(i);
    }
  });
  return out;
}
function precedingFbBoundary(evs: SimEvent[], idx: number): string | null {
  for (let i = idx - 1; i >= 0; i--) {
    const k = (evs[i] as any).kind;
    if (k === 'fullBurstStart' || k === 'fullBurstEnd') return k;
  }
  return null;
}

/* ── committed override (read-only clone: committed JSON untouched) ───────── */
const OV: any = withPatchedOverride(SLUG, () => {});

/* ── mutators ────────────────────────────────────────────────────────────── */
function instrument(ov: any) {
  const s1 = shieldBlock(ov);
  if (s1) s1.effects.push({ kind: 'buff', stat: MARK_STAT, value: MARK_S1, durationSec: 1 });
  const s2 = s2HealBlock(ov);
  if (s2) s2.effects.push({ kind: 'buff', stat: MARK_STAT, value: MARK_S2, durationSec: 1 });
}

/* ── hoisted runs (11 × 180 s sims) ──────────────────────────────────────── */
const BASE = run();
const INSTR = run(instrument);
const INSTR60 = run((ov) => {
  instrument(ov);
  const b = shieldBlock(ov);
  if (b && typeof b.trigger?.count === 'number') b.trigger.count = HIT_COUNT / 2;
});
const NO_SHIELD = run((ov) => stripEffects(ov, (e) => e.kind === 'shield'));
const NO_HEAL = run((ov) => stripEffects(ov, (e) => e.kind === 'heal'));
const ONE_TICK = run((ov) => {
  for (const b of allBlocks(ov)) for (const e of b.effects ?? []) if (e.kind === 'heal') e.ticks = 1;
});
const NO_CDR = run((ov) => stripEffects(ov, (e) => e.kind === 'burstCdr'));
const NO_GATE = run((ov) => {
  const b = cdrBlock(ov);
  if (b) { delete b.teamHas; delete b.formation; }
});
const NO_DT = run((ov) =>
  stripEffects(ov, (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'),
);
const DT_LONG = run((ov) => {
  const e = buffOf(dtBlock(ov), /^damageTakenPct$/);
  if (e) e.durationSec = 120;
});
const NO_MAXHP = run((ov) =>
  stripEffects(ov, (e) => e.kind === 'buff' && /maxhp/i.test(String(e.stat))),
);

const ROSTER = Object.keys(BASE.t);

/* ════════════════════════════════════════════════════════════════════════ */

describe('blanc — fixture sanity', () => {
  it('the control comp is a 4-unit chain that actually completes Full Bursts', () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(3);
    expect(ROSTER).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // blanc's two S2 lines are Full-Burst-END keyed: with zero FBs they'd be vacuous.
    expect(countKind(BASE.evs, 'fullBurstEnd')).toBeGreaterThanOrEqual(2);
  });
});

describe('blanc S1 — shared shield after 120 normal attacks (all allies, 5 s)', () => {
  it('encodes hitCount:120 → target allies (incl. self), shield 11.8% of caster Max HP, 5 s', () => {
    const b = shieldBlock(OV);
    expect(b, 'skill1 must carry a block whose effects include a shield').toBeTruthy();
    // Trigger identity: "Activates after 120 normal attack(s)" is a hit-count trigger.
    // Nearest-wrong: lastBullet (per-magazine, 60 ammo → 2× as often) or an interval.
    expect(b!.trigger.kind).toBe('hitCount');
    expect(b!.trigger.count).toBe(HIT_COUNT);
    // The kit states no in-Full-Burst variant, so countInFb must not be invented.
    expect(b!.trigger.countInFb).toBeUndefined();
    // Target set: "protects ALL allies" — a shared shield, self included.
    expect(b!.target.kind).toBe('allies');
    expect(b!.target.excludeSelf ?? false).toBe(false);
    const sh = (b!.effects ?? []).find((e: any) => e.kind === 'shield');
    // 11.8% is % of the CASTER's final Max HP → the shield effect's maxHpPct field.
    expect(sh.maxHpPct).toBeCloseTo(SHIELD_HP_PCT, 6);
    expect(sh.durationSec).toBe(SHIELD_SEC);
    // Exactly one shield channel — a duplicated shield would double the 'shielded' triggers.
    expect(effectsIn(OV).filter((e: any) => e.kind === 'shield')).toHaveLength(1);
  });

  it('the committed trigger really fires on the 120-round cadence and covers the whole team', () => {
    // Instrumentation neutrality: the inert marker must not move a single number.
    expect(INSTR.t, 'partsDamagePct marker must be damage-neutral').toEqual(BASE.t);
    const fires = markerFires(INSTR, MARK_S1);
    // Non-vacuity: blanc fires ~1.5k rounds in 180 s → the 120-round gate must trip repeatedly.
    expect(fires).toBeGreaterThanOrEqual(3);
    // Target set, read from the live engine rather than the JSON: every comp member is shielded.
    const tg = markerTargets(INSTR, MARK_S1);
    expect(tg.size).toBe(ROSTER.length);
    for (const s of ROSTER) expect(tg.has(s)).toBe(true);
    // Discriminator: halving the threshold must roughly double the fires. RED under a
    // lastBullet / interval / hitCount:60 encoding, where the patch changes nothing.
    const ratio = markerFires(INSTR60, MARK_S1) / Math.max(1, fires);
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.3);
  });

  it('the shield is damage-inert here (no shield-consumer in the comp) and leaks no damage', () => {
    // v1 boss deals no damage and nobody in liter/crown/helm carries a `shielded` trigger,
    // so removing the shield must be byte-identical. RED if the shield were mis-wired to a
    // damage effect, or if a comp member silently consumed it.
    expect(NO_SHIELD.t).toEqual(BASE.t);
  });
});

describe('blanc S2a — Full-Burst-END team heal-over-time (5 ticks × 1 s)', () => {
  it('encodes fullBurstEnd → all allies, heal ticks:5 intervalSec:1', () => {
    const b = s2HealBlock(OV);
    expect(b, 'skill2 must carry a heal block').toBeTruthy();
    // Trigger identity: "Activates AFTER Full Burst ends" — not fullBurstEnter, not burstCast.
    expect(b!.trigger.kind).toBe('fullBurstEnd');
    expect(b!.everyN ?? 1).toBe(1); // the kit states no every-Nth cadence
    expect(b!.target.kind).toBe('allies');
    expect(b!.target.excludeSelf ?? false).toBe(false);
    const h = (b!.effects ?? []).find((e: any) => e.kind === 'heal');
    // Duration semantics: "every 1 sec for 5 sec" = 5 recovery emissions, NOT one instant heal.
    expect(h.ticks).toBe(S2_HEAL_TICKS);
    expect(h.intervalSec ?? 1).toBe(1);
  });

  it('fires at Full-Burst END (not entry) and on every FB, to the whole team', () => {
    const idxs = markerIndices(INSTR.evs, MARK_S2);
    expect(idxs.length).toBeGreaterThanOrEqual(2);
    // One activation per completed Full Burst.
    expect(idxs.length).toBe(countKind(INSTR.evs, 'fullBurstEnd'));
    // Stream-order discriminator: each activation must sit after a fullBurstEnd, never after a
    // fullBurstStart. RED under a fullBurstEnter keying, whose per-fight COUNT is identical.
    for (const i of idxs) expect(precedingFbBoundary(INSTR.evs, i)).toBe('fullBurstEnd');
    const tg = markerTargets(INSTR, MARK_S2);
    expect(tg.size).toBe(ROSTER.length);
    for (const s of ROSTER) expect(tg.has(s)).toBe(true);
  });

  it('blanc\u2019s heals are NOT damage-inert: they drive the comp\u2019s on-recovery consumer', () => {
    // Failure-mode 4 (tandem): a heal that does nothing in isolation still fires teammates'
    // `recovery` triggers. crown is the control comp's on-recovery carrier, so stripping every
    // heal must reduce the buffApply traffic. If this fails with crown absent from ROSTER the
    // finding is "fixture has no recovery consumer", NOT "heal lines are missing".
    expect(ROSTER, 'tandem channel requires crown in the comp').toContain('crown');
    expect(BASE.buffs.length).toBeGreaterThan(NO_HEAL.buffs.length);
    expect(teamTotal(NO_HEAL.t)).toBeLessThanOrEqual(teamTotal(BASE.t));
  });

  it('the tick COUNT is load-bearing — collapsing 5+8 ticks to 1 loses recovery events', () => {
    // Nearest-wrong: heal modeled as a single instant event (ticks omitted → default 1).
    expect(ONE_TICK.buffs.length).toBeLessThan(BASE.buffs.length);
  });
});

describe('blanc S2b — Burst-Skill CD \u25bc 40.76 s (self, same-squad-ally gated)', () => {
  it('encodes fullBurstEnd → self burstCdr 40.76 s, repeating, gated on a squad-mate', () => {
    const b = cdrBlock(OV);
    expect(b, 'a burstCdr block must exist').toBeTruthy();
    expect(b!.trigger.kind).toBe('fullBurstEnd');
    // "Affects self" — nearest-wrong: allies, which would slash the WHOLE team's cooldowns.
    expect(b!.target.kind).toBe('self');
    const e = (b!.effects ?? []).find((x: any) => x.kind === 'burstCdr');
    expect(e.seconds).toBeCloseTo(CDR_SEC, 6);
    // The kit states no once-per-battle limit.
    expect(e.oncePerBattle ?? false).toBe(false);
    // "with an ally from the SAME SQUAD still on the battlefield": the data has no squad axis,
    // so the sanctioned encoding is teamHas.slugs naming the squad-mate. An UNGATED block
    // over-credits every comp that has no squad-mate at all.
    expect(b!.teamHas, 'the same-squad clause must be gated, not dropped').toBeTruthy();
    expect(b!.teamHas.slugs ?? []).toContain(SQUAD_MATE);
  });

  it('the gate holds it inert without the squad-mate, yet the CDR is live once opened', () => {
    // Inertness: with no squad-mate in the comp, removing the CDR entirely must change nothing.
    expect(blancBursts(NO_CDR)).toBe(blancBursts(BASE));
    expect(NO_CDR.t).toEqual(BASE.t);
    // Non-vacuity: dropping the gate must let the 40.76 s CDR fire, raising blanc's cast count.
    // RED both ways under an ungated encoding (assertion 1 would move, this one would not).
    expect(blancBursts(NO_GATE)).toBeGreaterThan(blancBursts(BASE));
  });
});

describe('blanc burst — team HoT, lowest-HP ally grant, boss Damage Taken \u25b2', () => {
  it('NON-VACUITY: blanc actually casts her burst in the control comp', () => {
    // blanc is Burst II and crown (also Burst II) sits to her left in controlComp, so stage-2
    // contention could starve her. A failure here is a FIXTURE finding (needs a comp where
    // blanc is the sole B2), not an override defect — every assertion below depends on it.
    expect(blancBursts(BASE)).toBeGreaterThanOrEqual(1);
  });

  it('burst heal: all allies, 8 ticks × 1 s', () => {
    const b = burstHealBlock(OV);
    expect(b, 'burst must carry a heal block').toBeTruthy();
    expect(b!.target.kind).toBe('allies');
    expect(b!.target.excludeSelf ?? false).toBe(false);
    const h = (b!.effects ?? []).find((e: any) => e.kind === 'heal');
    expect(h.ticks).toBe(BURST_HEAL_TICKS);
    expect(h.intervalSec ?? 1).toBe(1);
  });

  it('lowest-HP branch: 1 ally EXCEPT self, Max HP \u25b2 31.68% for 10 s, Indomitability recorded', () => {
    const b = maxHpBlock(OV);
    expect(b, 'burst must carry the Max HP \u25b2 grant').toBeTruthy();
    expect(b!.target.kind).toBe('alliesLowestHp');
    expect(b!.target.count).toBe(1);
    // "(except the skill user)" — nearest-wrong: excludeSelf omitted, so blanc can self-target.
    expect(b!.target.excludeSelf).toBe(true);
    const e = buffOf(b, /maxhp/i);
    // "Max HP \u25b2 31.68%" scales the TARGET's own Max HP → plain maxHpPct. Nearest-wrong:
    // casterMaxHpPct ("% of the skill user's Max HP"), which the engine flat-resolves.
    expect(e.stat).toBe('maxHpPct');
    expect(e.value).toBeCloseTo(MAXHP_PCT, 6);
    expect(e.durationSec).toBe(WINDOW_SEC);
    // Indomitability has no engine primitive → it must be recorded, not silently dropped.
    const un = (OV.unmodeled?.burst ?? []).join(' | ');
    expect(un.toLowerCase()).toContain('indomitab');
  });

  it('the Max HP grant lands on exactly one NON-self ally per cast, as a raw percentage', () => {
    const rows = BASE.buffs.filter((b) => b.stat === 'maxHpPct' && Math.abs(b.value - MAXHP_PCT) < 1e-6);
    // One target per cast (count:1). RED if the target were `allies` (4 rows per cast).
    expect(rows.length).toBe(blancBursts(BASE));
    for (const r of rows) expect(r.targetSlug).not.toBe(SLUG); // excludeSelf, read live
    // Raw-percentage emission also rules out a casterMaxHpPct encoding (emits stat maxHpFlat).
    expect(BASE.buffs.some((b) => b.stat === 'maxHpFlat')).toBe(false);
  });

  it('the ally Max HP grant is offensively inert (never wired as an ATK scaler)', () => {
    // e3 rule: ally-granted Max HP does not feed a teammate's atkOfMaxHpPct conversion.
    expect(NO_MAXHP.t).toEqual(BASE.t);
  });

  it('Damage Taken \u25b2 39.26% for 10 s is a boss-held debuff, not a self/ally buff', () => {
    const b = dtBlock(OV);
    expect(b, 'burst must carry the Damage Taken \u25b2 debuff').toBeTruthy();
    expect(b!.target.kind).toBe('enemy');
    const e = buffOf(b, /^damageTakenPct$/);
    expect(e.value).toBeCloseTo(DT_PCT, 6);
    expect(e.durationSec).toBe(WINDOW_SEC);
    const rows = dtRows(BASE);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Boss-held debuffs carry BOTH indices null; an ally-scoped mis-encoding would not.
    for (const r of rows) {
      expect(r.casterIdx).toBeNull();
      expect(r.targetIdx).toBeNull();
    }
  });

  it('the debuff is live team-wide AND its 10 s window is load-bearing', () => {
    // Live: removing it must cost the whole team damage (it is the kit's only offensive line).
    expect(teamTotal(NO_DT.t)).toBeLessThan(teamTotal(BASE.t));
    // Window: stretching 10 s → 120 s must GAIN damage. RED under a permanent/no-duration
    // encoding, where the patch is a no-op — the classic duration-semantics over-credit.
    expect(teamTotal(DT_LONG.t)).toBeGreaterThan(teamTotal(BASE.t));
  });
});

describe('blanc — no-invention pins (the kit has no damage and no weapon-state line)', () => {
  it('carries no damage effect in any slot', () => {
    const bad = effectsIn(OV).filter((e: any) =>
      ['flatDamage', 'dot', 'storedHit', 'stackedNuke', 'weaponSwap'].includes(e.kind),
    );
    expect(bad, 'blanc\u2019s kit deals no skill/burst damage').toEqual([]);
  });

  it('grants no offensive or weapon-state stat the kit never mentions', () => {
    const FORBIDDEN = [
      'atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'atkOfMaxHpPct', 'critRatePct',
      'critRateNormalPct', 'critDamagePct', 'coreDamagePct', 'elementDamagePct',
      'attackDamagePct', 'sustainedDamagePct', 'sequentialDamagePct', 'trueDamagePct',
      'reloadSpeedPct', 'attackSpeedPct', 'fireRatePct', 'chargeSpeedPct', 'maxAmmoPct',
      'maxAmmoFlat', 'hitRatePct', 'burstGenPct', 'normalAttackPct', 'extraHitDamagePct',
    ];
    const found = effectsIn(OV)
      .filter((e: any) => e.kind === 'buff' && FORBIDDEN.includes(String(e.stat)))
      .map((e: any) => e.stat);
    expect(found).toEqual([]);
    // …and no ammo/reload plumbing either (no such kit line to justify it).
    const plumbing = effectsIn(OV).filter((e: any) =>
      ['instantReload', 'consumeAmmo', 'unlimitedAmmo', 'fillGauge', 'gainPierce', 'stun'].includes(e.kind),
    );
    expect(plumbing).toEqual([]);
    expect(OV.hasPierce ?? false).toBe(false);
  });

  it('every slot is populated (a roster unit needs all three)', () => {
    for (const s of SLOTS) expect(slotBlocks(OV, s).length, `${s} must be authored`).toBeGreaterThan(0);
  });
});

/* ── GAPS: unobservable in v1 ────────────────────────────────────────────── */
describe('blanc — measurement/observability gaps', () => {
  it.skip('shield magnitude 11.8% of caster Max HP — no HP pool, no shield-break, and onEvent exposes no shield kind; only a shield-CONSUMER (e.g. naga) could read it, and the control comp has none', () => {});
  it.skip('heal magnitudes 3.68% / 3.84% of caster Max HP — the heal effect has no amount field at all (recovery events carry no HP), so the percentages are unrepresentable in v1 and belong in `unmodeled`', () => {});
  it.skip('Indomitability — no engine primitive (defensive immunity); recorded in unmodeled.burst only', () => {});
  it.skip('hitCount counting ROUNDS vs trigger pulls is indistinguishable for blanc (hitsPerShot 1), so the 120 threshold cannot be attributed to either reading from this unit alone', () => {});
  it.skip('\u201cstill on the battlefield\u201d half of the squad-mate clause — nobody dies in v1, so only the squad-MEMBERSHIP half is gateable', () => {});
  it.skip('\u201clowest remaining HP\u201d ally selection — no HP pool, so the engine\u2019s leftmost stand-in cannot be validated against real HP ranking (documented as damage-neutral because the grant is offensively inert)', () => {});
});
