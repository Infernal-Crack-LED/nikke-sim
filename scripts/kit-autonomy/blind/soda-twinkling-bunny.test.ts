import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

/**
 * soda-twinkling-bunny — SG / Iron / Attacker / Burst III (cd 40s, ammo 9, hitsPerShot 10)
 * BLIND kit-spec test (S5). Authored from kit prose ALONE.
 *
 * KIT (structural quotes ≤~40 chars):
 *   S1a  "Golden Chip stacks ▲ 50" @ battle start, self.
 *   S1b  every "3 normal attack(s) during Full Burst" -> self
 *        "Critical Damage ▲ 1.32%" "stacks up to 50" "continuously".
 *   S1c  same trigger -> self + "1 ally ... highest final ATK (except" self)
 *        "Attack Damage ▲ 10.51% for 2 sec".
 *   S2a  "entering Burst Stage 3" -> all allies, Golden-Chip-gated FB extend:
 *        >=10 -> +2s (Time Extension I); >=20 -> +3s more (Time Extension II, cumulative +5s).
 *   S2b  "normal attack during Full Burst" -> nearest enemy, gated on Time-Extension state:
 *        TE I -> 52.04% ATK; TE II -> +85.02% ATK (cumulative = 137.06%).
 *   BURST "Onward, Soda!" (own burstCast); "Golden Chip stacks ▼ 17" after:
 *        S1 all enemies 628.7% burst dmg; S2 (>=20 stacks) self Hit Rate ▲ 38.91% 15s;
 *        S3 (>=30 stacks) self ATK ▲ 65.25% 15s.
 *
 * INTERPRETATION (HYPOTHESIS): Golden Chip is ONE currency. Start 50 (cap 50); each stack
 *   = 1.32% crit-dmg (live perResource); burst consumes 17; rebuilds +1 per 3 FB normal
 *   attacks. The 10/20/30 gates read the LIVE stack count (pre-consume at cast). The
 *   alternative reading (crit-dmg is a SEPARATE stacking buff from the gating pool) would
 *   start crit-dmg at 0 and never let the burst gates decay — tests below discriminate.
 *
 * FIXTURE: controlComp('soda-twinkling-bunny', true) — liter B1 / crown B2 / soda B3
 *   carry / helm B3. Supplies a burst chain so FB opens (a lone B3 = ZERO Full Bursts) and
 *   a teammate pool so the highest-final-ATK-ally target of S1c is discriminable.
 *
 * FIELD-NAME ASSUMPTIONS (align with harness.ts if they differ): unit objects expose .idx
 *   and .total; SimResult exposes .units[]; damage events carry {srcSlot|casterIdx, bucket,
 *   mult, inFullBurst, crit, core}; buffApply carries {stat, value, durationSec, casterIdx,
 *   targetIdx}; fullBurstStart/End carry a time field (.t or .time). Semantic assertions are
 *   written to survive minor accessor drift; behavioral (total up/down) ones are primary.
 */

const SLUG = 'soda-twinkling-bunny';
const near = (a: number, b: number, eps = 0.6) => Math.abs(a - b) <= eps;
const tOf = (e: any) => e.t ?? e.time ?? e.sec ?? 0;

function collect(opts: any) {
  const evs: any[] = [];
  const o = {
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (e: any) => evs.push(e) },
  };
  const res = runComp(o);
  return { res, evs };
}
const dmg = (res: any, slug: string) => unitOf(res, slug)?.total ?? 0;
function sodaIdxOf(res: any) {
  return unitOf(res, SLUG)?.idx;
}
function allySlugs(res: any) {
  return (res.units ?? [])
    .map((u: any) => u.slug)
    .filter((s: string) => s !== SLUG);
}

// ---- hoisted runs (each is a full 180s deterministic sim) ------------------
const base = collect(controlComp(SLUG, true));
const sodaIdx = sodaIdxOf(base.res);

// counterfactual overrides located by SEMANTIC content (blind to block order)
const noStartChip = collect(
  controlComp(
    withPatchedOverride(SLUG, (o: any) => {
      const gc = (o.resources ?? []).find((r: any) => /chip/i.test(r.name));
      if (gc) {gc.initial = 0;}
    }) as any,
    true
  )
);

const flatCrit = collect(
  controlComp(
    withPatchedOverride(SLUG, (o: any) => {
      for (const b of o.blocks)
        {for (const e of b.effects ?? [])
          {if (e.kind === 'buff' && e.stat === 'critDamagePct') {
            delete e.perResource;
            e.value = 1.32;
            e.maxStacks = 1;
          }}}
    }) as any,
    true
  )
);

const noAtkDmg = collect(
  controlComp(
    withPatchedOverride(SLUG, (o: any) => {
      for (const b of o.blocks)
        {b.effects = (b.effects ?? []).filter(
          (e: any) =>
            !(
              e.kind === 'buff' &&
              e.stat === 'attackDamagePct' &&
              near(e.value, 10.51)
            )
        );}
    }) as any,
    true
  )
);

const noFbExtend = collect(
  controlComp(
    withPatchedOverride(SLUG, (o: any) => {
      for (const b of o.blocks)
        {b.effects = (b.effects ?? []).filter(
          (e: any) => e.kind !== 'fullBurstExtend'
        );}
    }) as any,
    true
  )
);

const noRider = collect(
  controlComp(
    withPatchedOverride(SLUG, (o: any) => {
      for (const b of o.blocks)
        {b.effects = (b.effects ?? []).filter(
          (e: any) =>
            !(
              e.kind === 'flatDamage' &&
              (near(e.atkPct, 52.04) || near(e.atkPct, 85.02))
            )
        );}
    }) as any,
    true
  )
);

const noBurstBuffs = collect(
  controlComp(
    withPatchedOverride(SLUG, (o: any) => {
      for (const b of o.blocks)
        {b.effects = (b.effects ?? []).filter(
          (e: any) =>
            !(
              e.kind === 'buff' &&
              ((e.stat === 'hitRatePct' && near(e.value, 38.91)) ||
                (e.stat === 'atkPct' && near(e.value, 65.25)))
            )
        );}
    }) as any,
    true
  )
);

// helper extractors on base
const sodaDmg = (evs: any[]) =>
  evs.filter(
    (e) =>
      e.kind === 'damage' && (e.srcSlot === sodaIdx || e.casterIdx === sodaIdx)
  );
const buffApplies = (evs: any[], stat: string, val: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, val)
  );
const fbWindows = (evs: any[]) => {
  const out: number[] = [];
  let start: number | null = null;
  for (const e of evs) {
    if (e.kind === 'fullBurstStart') {start = tOf(e);}
    else if (e.kind === 'fullBurstEnd' && start != null) {
      out.push(tOf(e) - start);
      start = null;
    }
  }
  return out;
};

describe('soda-twinkling-bunny — blind kit spec', () => {
  // S1a — start-of-battle Golden Chip 50 -> crit-dmg live from t=0 AND burst gates open.
  it('S1a: battle-start Golden Chip 50 raises soda total (removing the grant strictly lowers it)', () => {
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(noStartChip.res, SLUG));
  });

  // S1b — crit damage is LIVE-scaled off the Golden Chip pool (perResource), not a fixed single stack.
  it('S1b: crit damage scales with the Golden Chip pool (>> a fixed 1-stack model)', () => {
    // 50 stacks * 1.32% = ~66% crit-dmg early; a single fixed 1.32% stack is negligible.
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(flatCrit.res, SLUG) * 1.02);
    expect(dmg(flatCrit.res, SLUG)).not.toEqual(dmg(base.res, SLUG)); // non-vacuous
  });

  // S1c — Attack Damage 10.51%/2s to SELF + exactly ONE other ally (highest final ATK), not all.
  it('S1c: attackDamagePct 10.51 hits self + exactly one other ally (NOT all allies)', () => {
    const applies = buffApplies(base.evs, 'attackDamagePct', 10.51);
    expect(applies.length).toBeGreaterThan(0);
    const targets = new Set(applies.map((e) => e.targetIdx));
    expect(targets.has(sodaIdx)).toBe(true); // self is a target
    const others = [...targets].filter((t) => t !== sodaIdx);
    expect(others.length).toBe(1); // exactly ONE ally besides self
    expect(others.length).toBeLessThan(allySlugs(base.res).length); // discriminates "all allies"
    const dur = applies[0].durationSec;
    if (dur != null) {expect(near(dur, 2, 0.05)).toBe(true);} // 2s, not rounds/permanent
  });

  it('S1c inertness: removing it leaves the NON-buffed teammates byte-identical', () => {
    const applies = buffApplies(base.evs, 'attackDamagePct', 10.51);
    const buffed = new Set(applies.map((e) => e.targetIdx));
    for (const s of allySlugs(base.res)) {
      const idx = unitOf(base.res, s)?.idx;
      if (idx === sodaIdx || buffed.has(idx)) {continue;} // soda + the top-ATK ally legitimately move
      expect(dmg(noAtkDmg.res, s)).toEqual(dmg(base.res, s)); // everyone else unchanged
    }
  });

  // S2a — FB duration extension gated by Golden Chip (Time Extension I/II).
  it('S2a: soda extends Full Burst beyond the 10s default (removing the extend shortens it)', () => {
    const w = fbWindows(base.evs),
      wn = fbWindows(noFbExtend.evs);
    expect(w.length).toBeGreaterThan(0);
    expect(Math.max(...w)).toBeGreaterThan(Math.max(...wn) + 0.5); // strictly longer than un-extended
    expect(Math.max(...w)).toBeGreaterThan(11); // >=10 stacks -> +2s at minimum
  });

  // S2b — per-normal-attack enemy rider during FB (TE-gated). Behavioral discriminator.
  it('S2b: the in-FB enemy rider adds soda damage (removing it lowers soda total)', () => {
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(noRider.res, SLUG));
  });

  it.skip('S2b: exact rider magnitude 52.04 / 85.02 / 137.06 gated on TE state (mult/gating field-shape MEASUREMENT-GATED)', () => {
    // Requires knowing how the driver keys "Time Extension state" (resourceGate proxy vs a real
    // TE status) and how flatDamage atkPct surfaces on the damage event. Verify by inspection.
  });

  // BURST S1 — 628.7% burst-skill damage, FB-exempt (lands pre-FB).
  it('BURST S1: soda emits a ~628.7% burst-bucket hit', () => {
    const burstHits = sodaDmg(base.evs).filter((e) => e.bucket === 'burst');
    expect(burstHits.length).toBeGreaterThan(0);
    expect(burstHits.some((e) => near(e.mult, 628.7, 5))).toBe(true);
    // burst cast lands before the FB window opens
    expect(burstHits.some((e) => e.inFullBurst === false)).toBe(true);
  });

  // BURST S2/S3 — self Hit Rate 38.91% + ATK 65.25%, each 15s, stack-gated (>=20 / >=30).
  it('BURST S2/S3: self Hit-Rate 38.91 and ATK 65.25 buffs apply (15s, self-scoped)', () => {
    const hr = buffApplies(base.evs, 'hitRatePct', 38.91);
    const atk = buffApplies(base.evs, 'atkPct', 65.25);
    expect(hr.length).toBeGreaterThan(0);
    expect(atk.length).toBeGreaterThan(0);
    for (const e of [...hr, ...atk]) {
      expect(e.targetIdx).toBe(sodaIdx); // self only
      if (e.durationSec != null)
        {expect(near(e.durationSec, 15, 0.1)).toBe(true);}
    }
  });

  it('BURST S3 inertness+lever: removing the two self burst-buffs lowers soda total, teammates identical', () => {
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(noBurstBuffs.res, SLUG));
    for (const s of allySlugs(base.res))
      {expect(dmg(noBurstBuffs.res, s)).toEqual(dmg(base.res, s));}
  });

  // NON-VACUITY for the >=20 / >=30 stack GATES: because burst consumes 17 and rebuild is slow,
  // later bursts should FALL BELOW the ATK gate — so the 65.25 ATK buff must NOT apply on every
  // burst. If the driver never lets the pool decay, this goes RED (the intended divergence payload).
  it('BURST gating bites: ATK 65.25 applies on FEWER bursts than the number of soda burst casts (⛑ stack trajectory)', () => {
    const casts = base.evs.filter(
      (e) =>
        e.kind === 'burstCast' &&
        (e.casterIdx === sodaIdx || e.srcSlot === sodaIdx)
    );
    const atk = buffApplies(base.evs, 'atkPct', 65.25);
    if (casts.length < 3) {return;} // guard: need enough rotations for the pool to draw down
    expect(atk.length).toBeLessThan(casts.length); // the >=30 gate must exclude at least one late burst
  });

  it.skip('S1b rebuild rate: +1 Golden Chip per 3 FB normal attacks (GAP: "3 normal attacks" = 3 PULLS; engine hitCount counts pellet-HITS — encoding ⛑, verify by inspection)', () => {});
});
