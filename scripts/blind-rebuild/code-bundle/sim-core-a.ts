// sim.ts lines 1069-1417: effectiveAtk, dealDamage, resolveTargets, applyBuff, fireRecovery, applyBlock

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

