// sim.ts lines 851-1700: effectiveAtk, dealDamage, resolveTargets, applyBuff, applyBlock, applyEffect
// Extracted from src/engine/sim.ts

  //                  steep; units cancel in SAT/reticle0), '1' → 1 (TricK ~1px manual convergence; shallow).
  //   MG/SR/RL (no circle row) and zero-base bands (SG mid/far core_base=0 ⇒ M×0=0) return the base unchanged.
  // ⚑ UNVALIDATED (R8): stat() sums multiple HR buffs additive-in-percentage-points — the composition rule is
  //   an untested hypothesis this phase; a board-MAE gain must NOT be cited as confirming it.
  const HRCORE = ENV.HRCORE !== '0' && ENV.HRCORE !== 'off'; // LIVE by default (owner 2026-07-17); HRCORE=0 disables for A/B
  const HR_RETICLE_SLOPE = 1.4285 / 168.3931;            // 0.008483 /pt
  const HR_RETICLE_FLOOR_FRAC = 1 - HR_RETICLE_SLOPE * 100;
  const HR_CORE_CIRCLE: Record<string, number> = { AR: 75, SMG: 110, SG: 250 };
  const HR_CORE_SAT = ENV.HR_CORE_SAT === '1' ? 1 : 10;  // default circle10 (steep, data-leaning)
  const hrCoreExp = (weapon: string): number => {
    const c0 = HR_CORE_CIRCLE[weapon];
    const base = CORE_BY_WEAPON_BAND[weapon]?.near;
    if (c0 === undefined || base === undefined || base <= 0) return 0; // MG/SR/RL or zero-base → no lift
    return Math.log(base) / Math.log(HR_CORE_SAT / c0);
  };
  const hrCoreMult = (weapon: string, hr: number): number => {
    if (!HRCORE || hr <= 0) return 1;
    const p = hrCoreExp(weapon);
    if (p === 0) return 1;
    const frac = Math.max(HR_RETICLE_FLOOR_FRAC, 1 - HR_RETICLE_SLOPE * hr);
    return Math.pow(1 / frac, p);
  };
  // ── Workstream B (⚑ EXPERIMENT ARM, ENV.HRCORE_GEO, sub-flag under HRCORE, default off) ──────
  // Geometry-derived HR→core multiplier: HR shrinks the accuracy circle (same fractional shrink as
  // the exponent model), so the core covers a larger area fraction. M = coreFracGeo(hr)/coreFracGeo(0)
  // (docs/data/sg-calc/ workstream B). Band-DEPENDENT (per-band core size does NOT cancel here, unlike
  // the exponent model) — applied to that band's base. This grounds the HR_CORE_SAT free parameter in
  // real geometry: saturation is simply where the shrunk circle reaches the core diameter.
  // BOARD STATUS (2026-07-17, after the 48px peak-anchored recalibration): NOT rescued. The prior
  // "no AR lift" was NOT the old 29px px bug — it is board COVERAGE: HRCORE=0 leaves every AR board
  // comp byte-identical, i.e. no AR fight carries live Hit Rate to exercise this path at all. Only
  // chisato/quency-escape-queen (SMG) are HR-active, and geo-B over-lifts them (quency 1.040→1.322).
  // Testing B for AR needs an HR-active AR comp (e.g. jill's pre-registered +80.78% scenario), absent here.
  const hrCoreMultGeo = (weapon: string, band: string, hr: number): number => {
    const scale = ACCURACY_CIRCLE_SCALE[weapon];
    const coreD = BAND_CORE_PX[band];
    if (scale === undefined || coreD === undefined) return 1; // MG/SR/RL → no lift
    const base0 = coreFracGeo(coreD, circleDpx(scale));
    if (base0 <= 0) return 1;
    const atHr = coreFracGeo(coreD, circleDpxAtHr(scale, hr, HR_RETICLE_SLOPE, HR_RETICLE_FLOOR_FRAC));
    return atHr / base0; // ≥1, monotone in hr, capped where the circle reaches the core
  };
  // ── Center-weighted pellet model (ENV.PELLET_GAUSS; LIVE by default 2026-07-17, PELLET_GAUSS=0 off for A/B) ──
  // Unifies core-hit + SG landing: a 2D Gaussian pellet cone (σ from the accuracy circle + HR) read at
  // the core radius (here) or the boss-body radius (SG landing, in firePull). Reproduces the measured
  // near-core cells (AR 0.40 / SMG 0.25 / SG 0.06) and the recon SG landing (MAE 0.044) from one σ.
  // Frame-measured on noir sg.MP4 (all bands center-weighted). Spec: docs/data/sg-calc/CENTER-WEIGHTED-PELLET-SPEC.md.
  // Owner-enabled as the live model 2026-07-17 (re-evaluate the band-shape overshoot later); the prior
  // measured CORE_BY_WEAPON_BAND / SG_LANDING tables become the PELLET_GAUSS=0 A/B fallback.
  const PELLET_GAUSS = ENV.PELLET_GAUSS !== '0' && ENV.PELLET_GAUSS !== 'off';
  const pelletSigmaFor = (weapon: string, hr: number): number | null => {
    const scale = ACCURACY_CIRCLE_SCALE[weapon];
    if (scale === undefined) return null; // MG/SR/RL: no accuracy-circle model
    return pelletSigma(scale, hr, HR_RETICLE_SLOPE, HR_RETICLE_FLOOR_FRAC);
  };
  // ── δ-offset cone (ENV.CONE_DELTA; LIVE by default 2026-07-19, CONE_DELTA=0 disables for A/B) ──
  // The core-hit model for accuracy-circle weapons: replaces the two confirmed bugs of the old path —
  // the flat CORE_AUTOAIM=0.55 cap + the fractional reticle floor — with an off-centre Rician cone
  // (sg-geometry offsetCoreProb). PRE-EMPTS both PELLET_GAUSS and HRCORE for AR/SMG/SG; those two
  // become the CONE_DELTA=0 fallback (the measured CORE_BY_WEAPON_BAND / SG_LANDING tables are the
  // deep fallback, never refit). MG/SR/RL fall through to the base table either way. Parameters frozen
  // + Fable-approved (docs/handoffs/2026-07-19-cone-param-freeze-prereg.md; DECISIONS 2026-07-19);
  // per-weapon σ-shrink decouples SG-▲98 saturation from SMG mid-HR. Flipped LIVE after the full-board
  // A/B (net board mean|ratio−1| 0.0972→0.0964) + owner sign-off. CONE_DELTA=0 restores the prior engine.
  const CONE_DELTA = ENV.CONE_DELTA !== '0' && ENV.CONE_DELTA !== 'off';
  const coneSigmaFor = (weapon: string, hr: number): number | null => {
    const scale = ACCURACY_CIRCLE_SCALE[weapon];
    if (scale === undefined) return null; // MG/SR/RL: no accuracy-circle model
    return coneSigma(scale, hr, CONE_SIGMA_SHRINK[weapon] ?? 0.009);
  };
  const acrForHR = (weapon: string, band: 'near' | 'mid' | 'midfar' | 'far', hr: number): number => {
    if (CONE_DELTA) {
      const sig = coneSigmaFor(weapon, hr);
      if (sig !== null)
        return Math.min(1, offsetCoreProb(BAND_CORE_PX[band] / 2, sig, coneDelta(weapon, hr)));
      // MG/SR/RL fall through to the base table below
    } else if (PELLET_GAUSS) {
      const sig = pelletSigmaFor(weapon, hr);
      if (sig !== null) return Math.min(1, pelletCoreFrac(BAND_CORE_PX[band], sig)); // unified geometric core
      // MG/SR/RL fall through to the base table below
    }
    const base = acrFor(weapon, band);
    if (!HRCORE || hr <= 0) return base;                 // OFF ⇒ acrFor unchanged (regression byte-stable)
    const mult = ENV.HRCORE_GEO ? hrCoreMultGeo(weapon, band, hr) : hrCoreMult(weapon, hr);
    return Math.min(1, base * mult);
  };
  // Pierce core+body double-hit: community evidence is for MULTI-PART bosses; on the
  // partless test boss the A/B against run A says NO doubling (alice/RH overheat with it
  // once the decoded cadences are in). Kept as a switch for part-ed boss support later.
  const PIERCE_CORE_DOUBLE = false;
  // charge weapons on the CAMERA-FOCUSED unit generate x(1 + 1.5xcharge) = x2.5 at
  // full charge (einkk positionBurstBonus, datamined). Both solo gauge recordings
  // fit this exactly (a solo unit is always focused: maiden 364x2.5=910, takina
  // 560x2.5=1400); the TB2T2 3-unit rotation (40s real) requires trina (unfocused,
  // cinderella held camera) to generate FLAT 720 — the bonus is focus-gated, not
  // weapon-class-wide. Default focus = formation slot 3 (index min(2, n-1));
  // recorded runs pass cfg.focusSlug for the user-selected camera unit.
  const FOCUS_CHARGE_GEN = 2.5;
  // UNFOCUSED_CHARGE_GEN — MEASURED 1.0 (test battery 3 A1/A2 pair, 2026-07-13):
  // takina UNfocused in a 2-unit fight steps the gauge +5.6-6.5%/shot (her flat 560
  // target; even the additive full_charge_burst_energy hypothesis is excluded — that
  // would read +8.1%), while the paired control with her focused steps +14-15%
  // (560x2.5, same as her solo). The focus bonus is focus-ONLY. The old x2.2 ⚑ was
  // compensating for per-unit skill-generation quirks and the (then-wrong) anis-star
  // shot row, both now modeled from measurements.
  const UNFOCUSED_CHARGE_GEN = 1.0;
  const focusIdx =
    cfg.focusSlug !== undefined
      ? Math.max(0, chars.findIndex((c) => c.slug === cfg.focusSlug))
      : Math.min(2, chars.length - 1);
  // per-trigger gen vs the stage target, in gauge-percent units (JSON is energy/100).
  // flatPerTrigger = per-unit kit generation per shot (helm's S2 +14.31: synergy
  // fixed_add + rl3 arithmetic, twice-confirmed) — flat, no boss doubling, no focus.
  const gaugePerShot = (u: UnitState) => {
    const entry = (gaugeTable as Record<string, { targetPerTrigger?: number; flatPerTrigger?: number }>)[
      u.char.slug
    ];
    const per = (entry?.targetPerTrigger ?? 40) / 100;
    const flat = (entry?.flatPerTrigger ?? 0) / 100;
    const isCharge = (u.char.weapon === 'SR' || u.char.weapon === 'RL') && !u.swap;
    if (!isCharge) return per + flat;
    return per * (u.idx === focusIdx ? FOCUS_CHARGE_GEN : UNFOCUSED_CHARGE_GEN) + flat;
  };
  const addGauge = (u: UnitState, frame: number, energyPct: number) => {
    // Generation is LOCKED during Full Burst (user-confirmed 2026-07-13, correcting an
    // over-read of the bar anatomy: the fast post-FB refill is charge units releasing
    // held full charges a split second after FB ends + normal team rates — with the
    // measured ~3s post-FB chain-open delay, high-generation comps finish refilling
    // before the chain can open anyway, so rotations stay cooldown/chain-bound).
    // Also no generation during the chain itself (stages 1-3, einkk).
    if (fbEndFrame > frame || stage !== 0) return;
    if (ENV.DBG_GAUGE && frame < 30 * FPS) {
      console.log(`[g] t=${(frame / FPS).toFixed(2)} ${u.char.slug} +${(energyPct * u.burstGenMult * (1 + stat(u, 'burstGenPct', frame) / 100)).toFixed(2)} gauge=${gauge.toFixed(1)}`);
    }
    gauge = Math.min(
      100,
      gauge + energyPct * u.burstGenMult * (1 + stat(u, 'burstGenPct', frame) / 100)
    );
  };
  const shotGauge = (u: UnitState, frame: number, hitFraction = 1) => {
    const rounds = u.char.weapon === 'MG' ? u.char.hitsPerShot : 1;
    addGauge(u, frame, gaugePerShot(u) * rounds * hitFraction);
  };
  // one skill-damage impact (flatDamage proc, dot tick) = one target-base hit of gen
  // (maiden's rider measured exactly her target per-shot value, 364, no focus bonus)
  const skillGauge = (u: UnitState, frame: number) => {
    const entry = (gaugeTable as Record<string, { targetPerTrigger?: number }>)[u.char.slug];
    const per = (entry?.targetPerTrigger ?? 40) / 100;
    addGauge(u, frame, per / (u.char.weapon === 'SG' ? 10 : u.char.hitsPerShot || 1));
  };

  const transitionFrames = rangeScript.slice(1).map((r) => Math.round(r.fromSec * FPS));
  const bandAt = (frame: number): 'near' | 'mid' | 'midfar' | 'far' => {
    let band = rangeScript[0].band;
    for (const r of rangeScript) if (frame >= r.fromSec * FPS) band = r.band;
    return band;
  };
  const bossUnhittable = (frame: number) =>
    transitionFrames.some((t) => frame >= t && frame < t + UNHITTABLE_FRAMES);

  let gauge = 0;
  // 0 = filling (gauge builds); 1..3 = burst chain stages. Opening the chain
  // CONSUMES the gauge (einkk zeroes the meter when stage 1 opens); hits during the
  // chain and during full burst generate nothing (einkk: gen only at stage 0). B1/B2
  // casts open the next stage with a 10s window (datamined burst_duration 1000 =
  // 10.00s); if the window expires without a cast the chain COLLAPSES back to
  // filling and a full refill is needed — this is what stretches rotations when no
  // Burst 3 is off cooldown (TB2T2 measured 40s: fill ~8s -> chain -> stage-3 window
  // expires (cindy still on CD) -> refill -> second chain completes at her CD).
  let stage: 0 | 1 | 2 | 3 = 0;
  let stageGapFrames = 0;
  // full bursts the focus (tested) unit has cast — drives the syncWithFocus skip cadence
  // (a gated unit sits out the full burst after every 3rd of the focus unit's bursts).
  let focusBurstCount = 0;
  // stage-3 caster of the most recent full burst — drives the everyOther gate
  let lastStage3Caster = -1;
  let chainBlockedUntil = 0; // post-full-burst chain-open block (measured ~3s)
  const POST_FB_CHAIN_DELAY_FRAMES = 180;
  let stageExpireFrame = Infinity; // stage-2/3 window deadline (stage 1 never expires)
  const STAGE_WINDOW_FRAMES = 600; // burst_duration 1000 (=10s) standard
  let fbEndFrame = -1;
  let pendingFbExtendSec = 0;
  let rotationCasters: number[] = [];
  let fullBursts = 0;
  let fbFrames = 0;
  let stallFrames = 0;

  const sum = (list: BuffInstance[], stat: string, frame: number) =>
    list.reduce((s, b) => {
      if (
        b.stat !== stat ||
        (b.expiresFrame !== null && b.expiresFrame <= frame) ||
        (b.whileSwappedIdx !== undefined && units[b.whileSwappedIdx].swap == null)
      )
        return s;
      // live resource-scaled buff (soda's Golden-Chip crit): value = caster.resources[name]×mult,
      // re-read each frame from the caster's pool (ignores the static `value`).
      let contrib: number;
      if (b.perResource && b.casterIdx !== undefined) {
        const rv = units[b.casterIdx].resources.get(b.perResource.name) ?? 0;
        contrib = rv * b.perResource.mult * b.stacks;
      } else {
        contrib = b.value * b.stacks;
      }
      // stack-ramp (theme 3): scale 0 → full linearly over rampFrames from first application,
      // then hold at cap. Absent (undefined/0) → instant-to-max, identical to the prior sum.
      if (b.rampFrames && b.startFrame !== undefined) {
        contrib *= Math.min(1, Math.max(0, (frame - b.startFrame) / b.rampFrames));
      }
      return s + contrib;
    }, 0);

  const stat = (u: UnitState, key: StatKey, frame: number) => sum(u.buffs, key, frame);

  const advantaged = (u: UnitState) =>
    cfg.bossElement !== null &&
    (BEATS[u.char.element] === cfg.bossElement || u.advantageVs.has(cfg.bossElement));

  function effectiveAtk(u: UnitState, frame: number): number {
    // casterMaxHpPct buffs arrive as flat Max HP (converted at apply time)
    // VIDEO-MEASURED (cindy e3, 2026-07-13): "ATK = % of final Max HP" conversions count
    // the unit's OWN Max HP (incl. own-kit stacks) but NOT ally-granted Max HP buffs —
    // FB proc popups match own-HP math within 2% early AND late, and would be ~28% higher
    // if rouge's grants fed the conversion. So live Max HP = static base + OWN-kit maxHpFlat
    // buffs only (casterIdx === u.idx); ally-granted maxHpFlat (casterIdx !== u.idx) is excluded.
    // Honors rampFrames (cinderella's Beautiful +1.6%×12 ramping over ~36s reproduces the
    // measured early/late FB-proc growth 633.7k→667.0k).
    let ownMaxHpFlat = 0;
    for (const b of u.buffs) {
      if (b.stat !== 'maxHpFlat' || b.casterIdx !== u.idx) continue;
      if (b.expiresFrame !== null && b.expiresFrame <= frame) continue;
      let c = b.value * b.stacks;
      if (b.rampFrames && b.startFrame !== undefined) {
        c *= Math.min(1, Math.max(0, (frame - b.startFrame) / b.rampFrames));
      }
      ownMaxHpFlat += c;
    }
    const liveMaxHp = u.maxHp + ownMaxHpFlat;
    return (
      u.staticAtk * (1 + stat(u, 'atkPct', frame) / 100) +
      stat(u, 'casterAtkPct', frame) +
      (stat(u, 'atkOfMaxHpPct', frame) / 100) * liveMaxHp
    );
  }

  function dealDamage(
    u: UnitState,
    atkPct: number,
    frame: number,
    opts: {
      crit: boolean;
      core: boolean;
      charge: boolean;
      category: 'normal' | 'skill' | 'burst';
      distributed?: boolean;
      sustained?: boolean;
      sequential?: boolean;
      trueFlavor?: boolean;
      noRange?: boolean;
      noFb?: boolean;
      projFlavor?: 'attachment' | 'explosion';
      coreOverride?: number;   // per-shot core rate override (pellet-consolidation single bullet) — bypasses acrFor
      extraDmgUpPct?: number;  // per-shot Damage-Up addition (consolidation's window-only Attack Damage ▲%)
      pierceActive?: boolean;  // per-shot Pierce-tag (consolidation bullet) → pierceDamagePct goes live (dmg only, no double-hit)
    }
  ) {
    const fb = fbEndFrame > frame;
    // During a weapon swap that overrides the weapon class, range/core banding follows the SWAP
    // weapon (nayuta: SMG base → SR "Memory Incineration" mode gains SR range eligibility + HI core).
    const effWeapon = u.swap?.weapon ?? u.char.weapon;
    // +30% effective-range bonus: band-gated per weapon class (test-boss movement script);
    // riders (noRange) and RLs never receive it.
    const inRange =
      cfg.rangeBonus &&
      !opts.noRange &&
      effWeapon !== 'RL' &&
      (effWeapon === 'MG' && MG_RANGE_MODE !== undefined
        ? MG_RANGE_MODE === 'always'
        : RANGE_ELIGIBLE[bandAt(frame)].has(effWeapon));
    let major = 1 + (fb && !opts.noFb ? 0.5 : 0) + (inRange ? 0.3 : 0);
    if (opts.crit) {
      const critRate = Math.min(1, Math.max(0, (u.critRate + stat(u, 'critRatePct', frame)) / 100));
      const critBonus = (u.critDamage - 100) / 100 + stat(u, 'critDamagePct', frame) / 100;
      // seeded: Bernoulli roll, full bonus or nothing (mean is identical; the roll
      // reproduces real-run variance and any future on-crit trigger coupling)
      major += rng ? (rng() < critRate ? critBonus : 0) : critRate * critBonus;
    }
    if (opts.core && cfg.coreHitRate > 0) {
      // AUTO_CORE_RATE ⚑ (2026-07-13): auto-aim never converges on the core — measured
      // reticle floor ~12.5px vs ~1px manual (JP frame analysis), ~18-20% effective
      // accuracy loss on auto. Even at "100% core exposure" a fraction of auto shots
      // land off-core. Calibrated against the validated-fight anchors.
      const coreBonus =
        (u.char.coreAttackMultiplier - 100) / 100 +
        (stat(u, 'coreDamagePct', frame) + (u.doll.coreDamagePct ?? 0)) / 100;
      // ⚑ HRCORE: live Hit Rate shrinks the reticle → higher core fraction (derived; LIVE by default, HRCORE=0 off).
      // stat() already sums the unit's live hitRatePct buffs; additive-in-pp composition is UNVALIDATED (R8).
      const hr = HRCORE || PELLET_GAUSS || CONE_DELTA ? stat(u, 'hitRatePct', frame) : 0;
      const acr = opts.coreOverride ?? acrForHR(effWeapon, bandAt(frame), hr);
      major += rng
        ? (rng() < cfg.coreHitRate * acr ? coreBonus : 0)
        : cfg.coreHitRate * acr * coreBonus;
    }
    // elemAdvantageDamagePct lives in the ELEMENT bucket (MEASURED 2026-07-14, battery 5:
    // privaty popup ratio 2.8244 vs Element-model 2.821 / DamageUp-model 1.995, three band
    // pairs + proc + nuke classes; matches the einkk reference). ENV.ELEMADV='damageup'
    // restores the legacy additive placement for A/B comparison only.
    const elemAdvInElement = ENV.ELEMADV !== 'damageup';
    const elem = advantaged(u)
      ? 1.1 +
        (stat(u, 'elementDamagePct', frame) +
          (elemAdvInElement ? stat(u, 'elemAdvantageDamagePct', frame) : 0)) /
          100
      : 1;
    const chargeMult = u.swap?.chargeMultPct ?? u.char.chargeMultiplier;
    // Collection items and Helm-style burst buffs scale by BASE charge damage
    // (chargeMult × pct); ordinary charge-damage buffs add flat percentage points.
    const baseCharge = chargeMult / 100;
    const charge =
      opts.charge && chargeMult > 0
        ? baseCharge +
          (baseCharge *
            ((u.doll.chargeDamagePct ?? 0) + stat(u, 'chargeDamageMultPct', frame))) /
            100 +
          stat(u, 'chargeDamagePct', frame) / 100
        : 1;
    // Projectile Attachment/Explosion Damage is its OWN multiplier bucket on
    // the flavored hit (multiplicative with Damage Up), not additive within it.
    // It applies ONLY to explosion/attachment-flavored hits (RRH's projectiles,
    // Anis: Star's stars) — normal attacks, RL included, never benefit.
    const projExplosion =
      opts.projFlavor === 'explosion' ? stat(u, 'projectileExplosionPct', frame) : 0;
    const projAttachment =
      opts.projFlavor === 'attachment' ? stat(u, 'projectileAttachmentPct', frame) : 0;
    const projFactor = 1 + (projExplosion + projAttachment) / 100;
    // Q10: Pierce Damage ▲ empowers Pierce-tagged units' attacks — a Damage Up
    // bucket addition, only while the unit's attacks are Pierce-tagged: static kit
    // pierce (hasPierce), a live timed "Gain Pierce for N sec" window
    // (pierceUntilFrame), or the per-shot consolidation-bullet tag (opts.pierceActive).
    const pierceTagged = u.hasPierce || u.pierceUntilFrame > frame || opts.pierceActive;
    const pierce = pierceTagged ? stat(u, 'pierceDamagePct', frame) : 0;
    // Q9 A/B: Prydwen says projExpl also hits regular RL normal attacks
    // "as ATK DMG on the base multiplier". Off by default (our validated rule is
    // flavored-hits-only); on → RL normals get projExpl in the Damage Up bucket.
    const rlNormalProjExpl =
      (cfg.projExplOnRlNormals ?? true) && u.char.weapon === 'RL' && opts.category === 'normal'
        ? stat(u, 'projectileExplosionPct', frame)
        : 0;
    const dmgUp =
      1 +
      (stat(u, 'attackDamagePct', frame) +
        (opts.sustained ? stat(u, 'sustainedDamagePct', frame) : 0) +
        (opts.sequential ? stat(u, 'sequentialDamagePct', frame) : 0) +
        (opts.trueFlavor ? stat(u, 'trueDamagePct', frame) : 0) +
        (advantaged(u) && !elemAdvInElement ? stat(u, 'elemAdvantageDamagePct', frame) : 0) +
        pierce +
        (opts.extraDmgUpPct ?? 0) +
        rlNormalProjExpl) /
        100;
    // Distributed Damage debuffs share the taken bucket, but only affect
    // distributed sources and only while a Damage Taken ▲ is active on the boss
    const dmgTakenSum = sum(enemyBuffs, 'damageTakenPct', frame);
    const distDebuff =
      opts.distributed && dmgTakenSum > 0 ? sum(enemyBuffs, 'distributedDamagePct', frame) : 0;
    const taken = 1 + (dmgTakenSum + distDebuff) / 100;
    const distributed = opts.distributed ? 1 + stat(u, 'distributedDamagePct', frame) / 100 : 1;

    const baseAtk = Math.max(0, effectiveAtk(u, frame) - cfg.bossDef);
    const dmg =
      baseAtk * (atkPct / 100) * major * elem * charge * dmgUp * projFactor * taken * distributed;
    // DBG_UNIT=<slug> [DBG_N=<count>]: log per-instance bucket decomposition (video
    // popup reconciliation — popups show single non-crit/crit instances, so compare
    // against major recomputed without the crit expectation)
    if (ENV.DBG_UNIT === u.char.slug && (u as any).__dbgN !== -1) {
      (u as any).__dbgN = ((u as any).__dbgN ?? 0) + 1;
      const lim = Number(ENV.DBG_N ?? 30);
      if ((u as any).__dbgN <= lim) {
        console.log(
          `[dbg ${u.char.slug}] t=${(frame / FPS).toFixed(2)} ${opts.category} atkPct=${atkPct.toFixed(1)} ` +
          `baseAtk=${baseAtk.toFixed(0)} major=${major.toFixed(3)} elem=${elem.toFixed(3)} charge=${charge.toFixed(3)} ` +
          `dmgUp=${dmgUp.toFixed(4)} taken=${taken.toFixed(3)} dmg=${dmg.toFixed(0)}`
        );
        // DBG_BUFFS=1: dump the unit's live buff entries with each logged instance
        if (ENV.DBG_BUFFS) {
          for (const b of u.buffs) {
            if (b.expiresFrame === null || b.expiresFrame > frame) {
              console.log(
                `    [buff] ${b.key} stat=${b.stat} val=${b.value} stacks=${b.stacks} ` +
                `ends=${b.expiresFrame === null ? 'inf' : (b.expiresFrame / FPS).toFixed(2)}`
              );
            }
          }
        }
      } else (u as any).__dbgN = -1;
    }
    u.damage[opts.category] += dmg;
  }

  function resolveTargets(t: TargetDef, ownerIdx: number): UnitState[] {
    switch (t.kind) {
      case 'self': return [units[ownerIdx]];
      case 'allies':
        return t.excludeSelf ? units.filter((u) => u.idx !== ownerIdx) : units;
      case 'burstCasters': {
        const casters = rotationCasters.map((i) => units[i]);
        // optional stage filter (Ada S1: "all BURST 3 allies who previously used their
        // Burst Skill" — B1/B2 casters excluded)
        const byElement = t.element ? casters.filter((u) => u.char.element === t.element) : casters;
        if (t.stage === undefined) return byElement;
        return byElement.filter(
          (u) =>
            (t.stage === 3 && (u.char.burst === 'III' || u.lambdaStage === 3)) ||
            (t.stage === 2 && u.char.burst === 'II') ||
            (t.stage === 1 && u.char.burst === 'I')
        );
      }
      case 'nonBurstCasters': return units.filter((u) => !rotationCasters.includes(u.idx));
      case 'alliesTopAtk':
        // excludeSelf filters the candidate pool BEFORE the top-N slice ("N highest-ATK
        // ally except the skill user"); a 5-unit team always leaves ≥4 others ≥ count.
        return [...units]
          .filter((u) => !t.excludeSelf || u.idx !== ownerIdx)
          .sort((a, b) => b.staticAtk - a.staticAtk)
          .slice(0, t.count);
      case 'alliesLowestAtk':
        return units
          .filter((u) => !t.burst || u.char.burst === t.burst || u.char.burst === 'Λ')
          .filter((u) => !t.excludeSelf || u.idx !== ownerIdx)
          .sort((a, b) => a.staticAtk - b.staticAtk)
          .slice(0, t.count);
      case 'alliesOfElement':
        return units.filter(
          (u) => u.char.element === t.element && (!t.excludeSelf || u.idx !== ownerIdx)
        );
      case 'alliesOfClass':
        return units.filter(
          (u) => u.char.class === t.cls && (!t.excludeSelf || u.idx !== ownerIdx)
        );
      case 'alliesOfWeapon': // weapon-typed, class-blind ("all shotgun-wielding allies")
        return units.filter(
          (u) => u.char.weapon === t.weapon && (!t.excludeSelf || u.idx !== ownerIdx)
        );
      case 'alliesOfElementWeapon':
        return units
          .filter((u) => u.char.element === t.element && u.char.weapon === t.weapon)
          .slice(0, t.count ?? 1); // units[] is slot order: leftmost first
      case 'selfAndAdjacent':
        return units.filter((u) => Math.abs(u.idx - ownerIdx) <= t.sides);
      case 'alliesLowestHp':
        // No HP pool in v1 (immortal boss, nobody takes damage) → "lowest remaining HP" is
        // indeterminate; resolved deterministically to the leftmost `count` allies as a documented
        // stand-in. The Max-HP grants these lines carry are offensively inert (ally-granted Max HP
        // does not feed a teammate's atkOfMaxHpPct conversion — e3 rule), so the choice moves no damage.
        return units
          .filter((u) => !t.excludeSelf || u.idx !== ownerIdx)
          .slice(0, t.count); // units[] is slot order: leftmost first
      case 'enemy': return [];
    }
  }

  function applyBuff(
    list: BuffInstance[],
    key: string,
    stat: BuffInstance['stat'],
    value: number,
    durationSec: number | undefined,
    maxStacks: number,
    frame: number,
    whileSwappedIdx?: number,
    rampFrames?: number,
    casterIdx?: number,
    perResource?: { name: string; mult: number }
  ) {
    const expiresFrame = durationSec != null ? frame + Math.round(durationSec * FPS) : null;
    const existing = list.find((b) => b.key === key);
    if (existing) {
      if (existing.expiresFrame !== null && existing.expiresFrame <= frame) {
        existing.stacks = 0;
        // a buff that FULLY lapsed and re-triggers restarts its ramp clock (per-window stack
        // ramps: arcana-fortune-mate's Making Memories rebuild 2/4/6 hits fresh each FB window).
        // A refresh BEFORE expiry keeps the original startFrame (a continuous, never-dropped ramp).
        existing.startFrame = frame;
      }
      existing.stacks = Math.min(existing.stacks + 1, maxStacks);
      existing.expiresFrame = expiresFrame;
      existing.value = value;
      existing.whileSwappedIdx = whileSwappedIdx;
      // ramp clock is the FIRST application (startFrame preserved across pre-expiry refreshes)
      existing.rampFrames = rampFrames;
      existing.casterIdx = casterIdx;
      existing.perResource = perResource;
    } else {
      list.push({
        key, stat, value, stacks: 1, maxStacks, expiresFrame, whileSwappedIdx,
        rampFrames, startFrame: frame, casterIdx, perResource,
      });
    }
  }

  // fire the target unit's 'recovery'-triggered blocks (shared by the instant heal event and the
  // scheduled heal-over-time emitter ticks)
  function fireRecovery(targetIdx: number, frame: number) {
    units[targetIdx].blocks.forEach((rb, ri) => {
      if (rb.trigger.kind === 'recovery') applyBlock(targetIdx, rb, ri, frame);
    });
  }

  function applyBlock(ownerIdx: number, block: Block, blockIdx: number, frame: number) {
    const owner = units[ownerIdx];
    const bKey = `${ownerIdx}:${block.slot}:${blockIdx}`;
    // Abort-gates are evaluated BEFORE the everyN activation counter, so `everyN`
    // counts only activations that actually pass the gates — e.g. soda's "after casting
    // 3 normal attacks DURING Full Burst": out-of-FB casts must NOT advance the counter.
    // (No override combines everyN with these gates today — verified — so this is
    // behavior-neutral for every existing unit; the regression snapshot is the control.)
    // core-gated blocks never fire in zero-core fights
    if (block.requiresCore && cfg.coreHitRate <= 0) return;
    // full-burst-state gate ('inFb' / 'outFb'), evaluated when the trigger fires
    if (block.fbGate) {
      const fbActive = fbEndFrame > frame;
      if ((block.fbGate === 'inFb') !== fbActive) return;
    }
    // weapon-swap-state gate: block fires only while the owner's kit weaponSwap
    // is (or is not) active — e.g. SWHA's Fully Active extra volley rides only
    // her two swapped full-charge shots (gamewith JP: buffs held per full-charge
    // shot, 1発間維持)
    if (block.swapGate) {
      const swapped = owner.swap != null && owner.swap.untilFrame > frame;
      if ((block.swapGate === 'swapped') !== swapped) return;
    }
    // boss-element gate: an element-coded line ("when attacking an Electric Code
    // target", "all Wind Code enemies") fires only when the boss element matches.
    // Composes with the block's real trigger; inert vs a non-matching / neutral boss.
    if (block.bossElementGate && cfg.bossElement !== block.bossElementGate) return;
    // own-burst gate: block fires only when the owner DID ('cast') or did NOT ('notCast')
    // cast their own burst in the rotation leading into this Full Burst. Composes with a
    // `fullBurstEnter` trigger so "Entering Full Burst AFTER this unit uses her own Burst"
    // fires only on rotations she completes — a plain team `fullBurstEnter` over-fires when a
    // DIFFERENT B3 bursts in a multi-B3 comp (cinderella-crystal-wave's FB-enter core-strike).
    // rotationCasters holds this rotation's burst casters (reset at FB-end, accumulated as the
    // chain casts), so at fullBurstEnter it is the exact set; inert on graded comps where the
    // unit is the sole/actual burster (owner is in the set → 'cast' always passes).
    if (block.ownBurstGate) {
      const cast = rotationCasters.includes(ownerIdx);
      if ((block.ownBurstGate === 'cast') !== cast) return;
    }
    // resource-pool gate: block fires only while a named resource is within [min,max] at trigger
    // time (soda's burst ATK ▲65.25% only at ≥30 Golden Chips). Evaluated with the other abort
    // gates (before the activation counter), so a gated-out activation does not advance everyN.
    if (block.resourceGate) {
      const rv = owner.resources.get(block.resourceGate.name) ?? 0;
      if (rv < (block.resourceGate.min ?? -Infinity) || rv > (block.resourceGate.max ?? Infinity))
        return;
    }
    const activations = (owner.blockActivations.get(bKey) ?? 0) + 1;
    owner.blockActivations.set(bKey, activations);
    // everyN gate: effects land only on every Nth trigger activation
    // (everyNOffset shifts the phase: fire when activations ≡ offset mod N)
    if (block.everyN) {
      const off = block.everyNOffset ?? 0;
      if (activations < Math.max(off, 1) || (activations - off) % block.everyN !== 0) return;
    }
    block.effects.forEach((e: EffectDef, ei) =>
      applyEffect(ownerIdx, block, e, `${bKey}:${ei}`, activations, frame)
    );
  }

  function applyEffect(
    ownerIdx: number,
    block: Block,
    e: EffectDef,
    key: string,
    activations: number,
    frame: number
  ) {
    const owner = units[ownerIdx];
    const category = block.slot === 'burst' ? 'burst' : 'skill';
    {
      switch (e.kind) {
        case 'buff': {
          if (block.target.kind === 'enemy') {
            if (
              (e.stat === 'damageTakenPct' || e.stat === 'distributedDamagePct') &&
              e.value > 0
            ) {
              // KR stacking rule: same buff (stat+value) from the same skill slot of the
              // same caster OVERWRITES/refreshes across trigger blocks, never co-stacks
              applyBuff(
                enemyBuffs,
                `${ownerIdx}:${block.slot}:${e.stat}:${e.value}`,
                e.stat, e.value, e.durationSec, e.maxStacks ?? 1, frame
              );
            }
            // other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0
            break;
          }
          const value =
            e.stat === 'casterAtkPct' ? (e.value / 100) * owner.staticAtk
            : e.stat === 'casterMaxHpPct' ? (e.value / 100) * owner.maxHp
            : e.value;
          // casterMaxHpPct ("% of the skill user's Max HP") and targetMaxHpPct ("Max HP ▲ X%",
          // the target's OWN %) both grant flat Max HP; targetMaxHpPct's value is per-target
          // (computed inside the loop). effectiveAtk's e3 rule (casterIdx === self only) then
          // decides whether it feeds an atkOfMaxHpPct consumer.
          const statKey =
            e.stat === 'casterMaxHpPct' || e.stat === 'targetMaxHpPct'
              ? ('maxHpFlat' as StatKey)
              : e.stat;
          // always-on triggers keep their buffs up regardless of listed duration
          // passive/bossElement buffs are permanent UNLESS the effect declares an explicit
          // durationSec — a "fused passive" that is live from battle start (frame 0) but
          // expires after durationSec, modeling a battle-start-charged resource that DECAYS
          // (chisato's Extrasensory gates: on at t=0, off at 60/90/150s unless her own burst
          // re-applies them). Duration-less passives stay always-on exactly as before.
          const alwaysOn =
            (block.trigger.kind === 'passive' || block.trigger.kind === 'bossElement') &&
            e.durationSec == null;
          for (const t of resolveTargets(block.target, ownerIdx)) {
            // targetMaxHpPct is "% of the TARGET's own Max HP" → value differs per target.
            const appliedValue =
              e.stat === 'targetMaxHpPct' ? (e.value / 100) * t.maxHp : value;
            // KR stacking rule (game-mechanics.md §11): the same buff (stat+value) from
            // the same skill slot of the same caster overwrites/refreshes across trigger
            // blocks instead of co-stacking (e.g. Crown's two S1 "Reloading Speed ▲
            // 44.35%" lines). Different skills / different casters still stack.
            applyBuff(
              t.buffs, `${ownerIdx}:${block.slot}:${statKey}:${e.value}`, statKey, appliedValue,
              alwaysOn ? undefined : e.durationSec,
              e.maxStacks ?? 1, frame,
              e.whileSwapped ? ownerIdx : undefined,
              e.rampSec != null ? Math.round(e.rampSec * FPS) : undefined,
              ownerIdx,
              e.perResource
            );
            // Max Ammo ▼ clips the CURRENT belt when it lands (user-confirmed);
            // increases never clip. Stacking stays additive inside maxAmmo().
            if (e.stat === 'maxAmmoPct' && e.value < 0) {
              t.ammo = Math.min(t.ammo, maxAmmo(t, frame));
            }
          }
          break;
        }
        case 'resource': {
          // adjust the OWNER's named pool by delta, clamped to its declared [min,max]
          const cfg = owner.resourceCfg.find((r) => r.name === e.name);
          const cur = owner.resources.get(e.name) ?? cfg?.initial ?? 0;
          const next = Math.min(cfg?.max ?? Infinity, Math.max(cfg?.min ?? 0, cur + e.delta));
          owner.resources.set(e.name, next);
          if (ENV.DBG_UNIT === owner.char.slug && e.delta !== 0)
            console.log(
              `[res ${owner.char.slug}] t=${(frame / FPS).toFixed(2)} ${e.name} ` +
              `${cur}${e.delta > 0 ? '+' : ''}${e.delta} → ${next}`
            );
          break;
        }
        case 'flatDamage': {
          // pull-count gate (MEASURED 2026-07-14): rapi-red-hood's burst nuke fires only
          // with >=1 sticky charge banked (>=120 shots at cast — her fire-weak banner 1 at
          // ~68 shots had NO nuke; all >=120 banners did)
          if (e.requiresPulls != null && owner.pulls < e.requiresPulls) break;
          // per-battle-elapsed ramp: a burst component that scales with a stack resource
          // accruing from battle start (cinderella's Beautiful-mirror). Snapshotted at cast.
          const fdRampMul =
            e.rampSec != null ? Math.min(1, frame / Math.round(e.rampSec * FPS)) : 1;
          const fdAtkPct = e.atkPct * fdRampMul;
          const flavorOpts = {
            crit: e.crit !== false,
            core: e.core === true,
            category: category as 'skill' | 'burst',
            distributed: e.flavor === 'distributed',
            sustained: e.flavor === 'sustained',
            sequential: e.flavor === 'sequential',
            trueFlavor: e.flavor === 'true',
            projFlavor:
              e.flavor === 'projectileAttachment'
                ? ('attachment' as const)
                : e.flavor === 'projectileExplosion'
                  ? ('explosion' as const)
                  : undefined,
          };
          // flighted damage (delaySec): lands later, snapshots buffs/FB at LANDING — the
          // cast-instant no-FB rule below does NOT apply (FB by actual landing time)
          if (e.delaySec != null) {
            pendingHits.push({
              ownerIdx,
              atkPct: fdAtkPct,
              resolveFrame: frame + Math.round(e.delaySec * FPS),
              ...flavorOpts,
            });
            break;
          }
          skillGauge(owner, frame); // skill-damage hits generate weapon-base gauge
          // U10 ANSWERED (Test Battery 2 Test 1, 2026-07-13): burst-skill damage does NOT
          // get the +50% full-burst major. Cinderella's nuke popup (run-B order, cindy
          // focus) read non-crit 4,066,936 / crit 6,100,403 (×1.5) — 98.7% of the no-FB
          // branch (4,120,347 / 6,180,521) and a 34% miss for the FB branch (6,180,521
          // non-crit). Live buffs at cast DO apply (trina's +20.9% attack damage was in
          // the measured value). Skill 1/2 procs get FB by actual timing (the per-unit
          // noFb flags cover the verified exceptions).
          // U1 ANSWERED (2026-07-13, datamined FunctionTable + Prydwen + JP verification):
          // function-type "additional damage" CRITS at the caster's rate, never cores,
          // never gets range; FB applies by actual proc timing. Crit is on by default
          // (set crit:false only for verified non-critting sources).
          dealDamage(owner, fdAtkPct, frame, {
            ...flavorOpts,
            charge: false,
            noRange: true, // riders never get the +30% range bonus (user rule, 2026-07-13)
            noFb: skillNoFb(e.noFb === true, block.slot === 'burst' && block.trigger.kind === 'burstCast', e.flavor),
          });
          break;
        }
        case 'dot': {
          const intervalFrames = Math.round((e.intervalSec ?? 1) * FPS);
          dots.push({
            ownerIdx,
            atkPct: e.atkPct,
            endFrame: frame + Math.round(e.durationSec * FPS),
            nextTickFrame: frame + intervalFrames,
            intervalFrames,
            category,
            distributed: e.flavor === 'distributed',
            sustained: e.flavor === 'sustained',
            sequential: e.flavor === 'sequential',
            trueFlavor: e.flavor === 'true',
            noRange: e.noRange === true,
            crit: e.crit,
            // dots preserve original burst-cast handling (FB by e.noFb + timing, no auto-exempt) so
            // 'perkit' is byte-identical; the heuristic rules still apply via the non-burst branch.
            noFb: skillNoFb(e.noFb === true, false, e.flavor ?? 'dot'),
            projFlavor:
              e.flavor === 'projectileAttachment'
                ? 'attachment'
                : e.flavor === 'projectileExplosion'
                  ? 'explosion'
                  : undefined,
            perResource: e.perResource,
          });
          break;
        }
        case 'weaponSwap':
          owner.swap = {
            untilFrame: frame + Math.round(e.durationSec * FPS),
            damagePct: e.damagePct,
            chargeFrames: e.chargeTimeSec ? Math.round(e.chargeTimeSec * FPS) : undefined,
            chargeMultPct: e.chargeMultPct,
            maxAmmo: e.maxAmmo,
            pullsPerSec: e.pullsPerSec,
            weapon: e.weapon,
            trueNormals: e.trueNormals,
            maxShots: e.maxShots,
            shotsFired: 0,
          };
          owner.chargeProgress = 0;
          owner.reloading = false;
          owner.reloadProgress = 0;
          owner.ammo = maxAmmo(owner, frame);
          break;
        case 'fillGauge':
          // gauge is locked during full burst — fills landing then are wasted
          if (fbEndFrame <= frame) gauge = Math.min(100, gauge + e.pct);
          break;
        case 'heal': {
          // a heal has no modeled HP value; it emits a RECOVERY event to its targets,
          // firing their 'recovery'-triggered blocks (heal-synergy kits — Helm's
          // full-charge heal drives Crown's "when recovery takes effect → team ATK ▲").
          const healTargets = resolveTargets(block.target, ownerIdx);
          for (const t of healTargets) fireRecovery(t.idx, frame);
          // heal-over-time: "Recovers X% every 1 sec for N sec" = N ticks. The first tick fired
          // above; schedule the remaining N-1 so on-recovery consumers stay refreshed across the
          // whole window (default ticks 1 → no scheduling, back-compatible with instant heals).
          const ticks = e.ticks ?? 1;
          if (ticks > 1) {
            const intervalFrames = Math.max(1, Math.round((e.intervalSec ?? 1) * FPS));
            recoveryEmitters.push({
              targetIdxs: healTargets.map((t) => t.idx),
              nextTickFrame: frame + intervalFrames,
              intervalFrames,
              ticksRemaining: ticks - 1,
            });
          }
          break;
        }
        case 'shield':
          // no shield HP pool is modeled (v1 boss deals no damage); like 'heal', it
          // emits a SHIELDED event to its targets, firing their 'shielded'-triggered
          // blocks (shield-synergy kits — e.g. naga's shield-gated lines).
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.blocks.forEach((rb, ri) => {
              if (rb.trigger.kind === 'shielded') applyBlock(t.idx, rb, ri, frame);
            });
          }
          break;
        case 'storedHit': {
          const entry = owner.storedHits.get(key) ?? {
            atkPct: e.atkPct,
            category,
            distributed: e.flavor === 'distributed',
            sustained: e.flavor === 'sustained',
            sequential: e.flavor === 'sequential',
            trueFlavor: e.flavor === 'true',
            projFlavor:
              e.flavor === 'projectileAttachment'
                ? ('attachment' as const)
                : e.flavor === 'projectileExplosion'
                  ? ('explosion' as const)
                  : undefined,
            coreRate: e.core,
            critRoll: e.crit,
            instantInFb: e.instantInFb,
            releasable: 0,
            fresh: 0,
            freshFrame: frame,
          };
          if (entry.freshFrame !== frame) {
            entry.releasable += entry.fresh;
            entry.fresh = 0;
            entry.freshFrame = frame;
          }
          entry.fresh += e.charges ?? 1;
          owner.storedHits.set(key, entry);
          break;
        }
        case 'burstEligibility':
          for (const t of resolveTargets(block.target, ownerIdx)) t.extraStages.add(e.stage);
          break;
        case 'burstFirst':
          for (const t of resolveTargets(block.target, ownerIdx)) t.burstFirstPending = true;
          break;
        case 'reenterStage':
          break; // handled by the rotation (stage hold) after the cast resolves
        case 'advantageVs':
          for (const t of resolveTargets(block.target, ownerIdx)) t.advantageVs.add(e.element);
          break;
        case 'burstCdr':
          if (e.oncePerBattle) {
            if (usedOncePerBattle.has(key)) break;
            usedOncePerBattle.add(key);
          }
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.burstCdFrames = Math.max(0, t.burstCdFrames - Math.round(e.seconds * FPS));
          }
          break;
        case 'escalating': {
          const n = Math.min(activations, e.steps.length);
          e.steps
            .slice(0, n)
            .forEach((step, si) => applyEffect(ownerIdx, block, step, `${key}:s${si}`, activations, frame));
          break;
        }
        case 'fullBurstExtend':
