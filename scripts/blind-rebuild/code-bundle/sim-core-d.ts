// sim.ts lines 2101-end: firePull, SG pellet logic, burst rotation

        // Measured wind-up ladder: round n+1 lands MG_RAMP_INTERVALS[n] frames after
        // round n (then 1/frame at steady state). Attack-speed compresses the ladder.
        const speedMult =
          1 + (stat(u, 'attackSpeedPct', frame) + stat(u, 'fireRatePct', frame)) / 100;
        u.mgCooldown -= speedMult;
        while (u.mgCooldown <= 0 && !u.reloading) {
          // one belt round; a "pull" (damage event) lands every hitsPerShot rounds
          u.fireAcc += 1;
          if (u.fireAcc >= u.char.hitsPerShot) {
            u.fireAcc -= u.char.hitsPerShot;
            firePull(u, frame, false, unlimited);
          }
          const iv =
            u.mgRampRound < MG_RAMP_INTERVALS.length ? MG_RAMP_INTERVALS[u.mgRampRound] : 1;
          u.mgRampRound++;
          u.mgCooldown += iv;
        }
      } else {
        const speedMult =
          1 + (stat(u, 'attackSpeedPct', frame) + stat(u, 'fireRatePct', frame)) / 100;
        // During a weapon swap the swap's OWN cadence governs (moran: 24/s vs base AR 12/s):
        // explicit swap pullsPerSec wins, else the swap weapon-class default, else base behavior.
        const basePps = u.swap
          ? (u.swap.pullsPerSec ?? PULLS_PER_SEC[u.swap.weapon ?? u.char.weapon])
          : (u.pullsPerSec ?? PULLS_PER_SEC[u.char.weapon]);
        const rate = (basePps ?? 4) / FPS;
        u.fireAcc += rate * speedMult;
        while (u.fireAcc >= 1 && !u.reloading) {
          u.fireAcc -= 1;
          firePull(u, frame, false, unlimited);
        }
      }
    }

    // ---- in-FB instant stored-hit release: a rocket that ATTACHES during Full Burst
    // detonates immediately in the same window (RRH), instead of only batch-releasing at the
    // next FB start. Per-entry `instantInFb` (RRH S2 explosion) drives it permanently;
    // ENV.XINSTEXPL forces it on for experiments. Same core/flavor treatment as the FB-start batch. ----
    if (fbEndFrame > frame) {
      for (const u of units) {
        const envForce = XINSTEXPL.has(u.char.slug);
        for (const entry of u.storedHits.values()) {
          if (!envForce && !entry.instantInFb) continue;
          if (entry.freshFrame < frame) {
            entry.releasable += entry.fresh;
            entry.fresh = 0;
            entry.freshFrame = frame;
          }
          if (entry.releasable > 0) {
            dealDamage(u, entry.atkPct * entry.releasable, frame, {
              crit: entry.critRoll || DOT_CRIT || XCRIT.has(u.char.slug),
              core: entry.coreRate != null || XCORE.has(u.char.slug),
              coreOverride: entry.coreRate,
              charge: false,
              category: entry.category,
              distributed: entry.distributed,
              sustained: entry.sustained,
              sequential: entry.sequential,
              trueFlavor: entry.trueFlavor,
              noRange: true,
              projFlavor: entry.projFlavor,
            });
            entry.releasable = 0;
          }
        }
      }
    }

    // ---- flighted skill hits (flatDamage delaySec) — resolve at landing state ----
    for (let i = pendingHits.length - 1; i >= 0; i--) {
      const p = pendingHits[i];
      if (frame >= p.resolveFrame) {
        skillGauge(units[p.ownerIdx], frame); // gauge at landing (locked in-FB as usual)
        dealDamage(units[p.ownerIdx], p.atkPct, frame, {
          crit: p.crit,
          core: p.core,
          charge: false,
          noRange: true,
          category: p.category,
          distributed: p.distributed,
          sustained: p.sustained,
          sequential: p.sequential,
          trueFlavor: p.trueFlavor,
          projFlavor: p.projFlavor,
        });
        pendingHits.splice(i, 1);
      }
    }

    // ---- dots ----
    for (const d of dots) {
      if (frame === d.nextTickFrame && frame <= d.endFrame) {
        skillGauge(units[d.ownerIdx], frame); // dot ticks generate (wiki3: Haran 290/tick)
        // live resource-scaled DoT: this tick's atkPct tracks the owner's pool (mihara Ensnaring)
        const tickAtkPct = d.perResource
          ? (units[d.ownerIdx].resources.get(d.perResource.name) ?? 0) * d.perResource.mult
          : d.atkPct;
        dealDamage(units[d.ownerIdx], tickAtkPct, frame, {
          crit: d.crit ?? (DOT_CRIT || XCRIT.has(units[d.ownerIdx].char.slug)),
          core: XCORE.has(units[d.ownerIdx].char.slug),
          charge: false, category: d.category,
          distributed: d.distributed, sustained: d.sustained, sequential: d.sequential,
          trueFlavor: d.trueFlavor, noRange: true, noFb: d.noFb,
          projFlavor: d.projFlavor,
        });
        d.nextTickFrame += d.intervalFrames;
      }
    }

    // ---- heal-over-time recovery ticks ----
    for (let i = recoveryEmitters.length - 1; i >= 0; i--) {
      const em = recoveryEmitters[i];
      if (frame === em.nextTickFrame) {
        for (const idx of em.targetIdxs) fireRecovery(idx, frame);
        em.ticksRemaining--;
        em.nextTickFrame += em.intervalFrames;
        if (em.ticksRemaining <= 0) recoveryEmitters.splice(i, 1);
      }
    }
  }

  function firePull(u: UnitState, frame: number, charged: boolean, unlimited: boolean) {
    const band = bandAt(frame);
    const bandSgFalloff =
      u.char.weapon === 'SG' && !u.swap
        ? CONE_DELTA
          ? // δ-cone landing (implementation-plan §1.5): the SAME σ(hr) as the core path drives SG
            // landing — a centred Rayleigh overlap of the σ-cone with the boss body (δ negligible vs
            // the body radius, so landing stays centre-aimed). Bernoulli per pellet under a seed.
            (() => {
              const sig = coneSigmaFor('SG', stat(u, 'hitRatePct', frame))!;
              const prof =
                cfg.bossPelletProfile === 'large' ? 8 : cfg.bossPelletProfile === 'medium' ? 1.3 : 1;
              const mean = pelletLandFrac(BAND_SG_HIT_FRAC[band], sig, prof);
              if (!rng) return mean;
              let k = 0;
              for (let i = 0; i < u.char.hitsPerShot; i++) if (rng() < mean) k++;
              return k / u.char.hitsPerShot;
            })()
          : PELLET_GAUSS
            ? // ⚑ center-weighted Gaussian cone (spec §2): landing = Rayleigh overlap of the σ-cone with
              // the boss body; each pellet lands ~Bernoulli(mean) under a seed, else the expected mean.
              (() => {
                const sig = pelletSigmaFor('SG', stat(u, 'hitRatePct', frame))!;
                const prof =
                  cfg.bossPelletProfile === 'large' ? 8 : cfg.bossPelletProfile === 'medium' ? 1.3 : 1;
                const mean = pelletLandFrac(BAND_SG_HIT_FRAC[band], sig, prof);
                if (!rng) return mean;
                let k = 0;
                for (let i = 0; i < u.char.hitsPerShot; i++) if (rng() < mean) k++;
                return k / u.char.hitsPerShot;
              })()
            : rng
              ? sgLandedPellets(band, u.char.hitsPerShot, rng, cfg.bossPelletProfile) /
                u.char.hitsPerShot
              : SG_LANDING_BY_BAND[band]
        : 1;
    // Pellet-consolidation mode (dorothy-S, open-questions A26): "after hitting the target with 80
    // pellets, for 3 rounds pellet count is fixed at 1" + Pierce + 98% hit + Attack-dmg. MEASURED
    // (exact-counter re-read, dorothy-solo-reanalysis.json + owner): "3 rounds" = 3 SHOTS/episode (the
    // ammo counter drops by 3), NOT 3 magazines; and it fires the WHOLE fight at ALL bands (the 98% hit
    // rate lands the single bullet even at range) — NOT near-only. The trigger accrues fired pellets
    // (10/shot on a large boss "hits the target" with ~all pellets) → 80 = ~8 spray shots/episode →
    // ~30% of shots consolidate, matching the read. Each consolidation shot carries the FULL shot's
    // damage in one aligned bullet (pelletFraction 1.0), reliably cores (coreRate), Pierce, no range.
    const consol = u.consolidation;
    let consolidating = false;
    if (consol) {
      if (u.consolShotsLeft > 0) consolidating = true;
      else {
        u.landedAcc += u.char.hitsPerShot;
        if (u.landedAcc >= consol.triggerLandedPellets) {
          u.landedAcc = 0;
          u.consolShotsLeft = consol.shots;
          consolidating = true;
        }
      }
    }
    const normalScale = consolidating
      ? 1
      : 1 + ((u.doll.normalAttackPct ?? 0) + stat(u, 'normalAttackPct', frame)) / 100;
    const baseMult = u.swap?.damagePct ?? u.char.normalAttackMultiplier;
    const isMg = u.char.weapon === 'MG' && !u.swap;
    const sgFalloff = consolidating && consol ? consol.pelletFraction : bandSgFalloff;
    dealDamage(u, baseMult * normalScale * sgFalloff, frame, {
      crit: true,
      core: !(isMg && u.mgRampRound < MG_NO_CORE_RAMP_ROUNDS),
      charge: charged,
      category: 'normal',
      trueFlavor: !!u.swap?.trueNormals,
      // The consolidation single bullet is one ALIGNED 98%-hit bullet, NOT spray — so it keeps its
      // measured reliable-core value (consol.coreRate) under the δ-cone too, treated like a regular
      // single bullet rather than routed through the SG pellet-spray cone (owner ruling 2026-07-19;
      // supersedes implementation-plan §1.5's fold-in). Only dorothy's ordinary spray shots take the cone.
      coreOverride: consolidating && consol ? consol.coreRate : undefined,
      extraDmgUpPct: consolidating && consol ? consol.attackDamagePct : undefined,
      pierceActive: consolidating && consol ? consol.pierce : undefined,
      // the consolidated single bullet takes NO effective-range bonus (MEASURED: its non-core
      // value = full-shot base × dmgUp with major ≈ 1.0, not 1.3 — dorothy-solo-reanalysis.json)
      noRange: consolidating || undefined,
    });
    if (consolidating) u.consolShotsLeft--;
    // Pierce double-hit (2026-07-13 research): a Pierce-tagged shot passes through the
    // core and hits the body behind it — two hits per shot on a core-exposed boss
    // (community-verified; the reason Alice/Red Hood overperform). Second hit: same
    // shot, no core bonus. Non-SG only (pellets don't line up core+body per pellet).
    if (PIERCE_CORE_DOUBLE && u.hasPierce && u.char.weapon !== 'SG') {
      dealDamage(u, baseMult * normalScale, frame, {
        crit: true,
        core: false,
        charge: charged,
        category: 'normal',
        trueFlavor: !!u.swap?.trueNormals,
      });
    }
    u.pulls++;
    shotGauge(u, frame, sgFalloff); // out-of-near SG pellets that miss generate nothing

    const extraPerHit = stat(u, 'extraHitDamagePct', frame);
    if (extraPerHit > 0) {
      dealDamage(u, extraPerHit * u.char.hitsPerShot, frame, {
        crit: false, core: false, charge: false, category: 'burst', noRange: true,
      });
    }

    // hit-count and per-shot skill triggers
    u.blocks.forEach((b, bi) => {
      if (b.trigger.kind === 'shotFired') applyBlock(u.idx, b, bi, frame);
      else if (b.trigger.kind === 'hitCount') {
        const key = `hc:${bi}`;
        // RRH rocket meter fills 2× faster in her Full Burst: threshold 120 → countInFb (60)
        // while in FB. The counter carries over across the boundary (no reset) — the faster
        // threshold just consumes the accrued fill, so a near-full meter fires on FB entry.
        const threshold =
          fbEndFrame > frame && b.trigger.countInFb != null ? b.trigger.countInFb : b.trigger.count;
        let c = (u.hitCounters.get(key) ?? 0) + u.char.hitsPerShot;
        while (c >= threshold) {
          c -= threshold;
          applyBlock(u.idx, b, bi, frame);
        }
        u.hitCounters.set(key, c);
      }
      // chargeCounter: cycling per-full-charge phase counter (only full charges advance it).
      // Fires ONE phase (block.effects[phase], in order) when its threshold accrues — `count`
      // charges/phase outside Full Burst, `countInFb` (default 1) inside — so procs cluster into
      // the FB window (SBS 3/6/9 → 1/2/3). The +50% FB is applied per-proc by dealDamage's timing.
      else if (b.trigger.kind === 'chargeCounter' && charged) {
        const pk = `cc${bi}p`, ck = `cc${bi}c`;
        let phase = u.hitCounters.get(pk) ?? 0;
        let charges = (u.hitCounters.get(ck) ?? 0) + 1;
        // the lowered thresholds are a 10s SELF-buff from the owner's OWN burst cast
        // (SBS burst: "Changes Full Charge attack count required for Skill 1 to 1/2/3 for 10s"),
        // NOT the team Full Burst window — she doesn't burst every full burst.
        const inBurst = u.lastBurstCastFrame >= 0 && frame - u.lastBurstCastFrame < 10 * FPS;
        // per-phase thresholds (datamined "attack count required to N times" is per-phase); a scalar
        // means the same threshold every phase (back-compat). phase P uses reqs[P].
        const reqs = inBurst ? (b.trigger.countInFb ?? 1) : b.trigger.count;
        const thr = Array.isArray(reqs) ? (reqs[phase] ?? reqs[reqs.length - 1]) : reqs;
        if (charges >= thr) {
          charges = 0;
          const bKey = `${u.idx}:${b.slot}:${bi}`;
          const activations = (u.blockActivations.get(bKey) ?? 0) + 1;
          u.blockActivations.set(bKey, activations);
          applyEffect(u.idx, b, b.effects[phase], `${bKey}:${phase}`, activations, frame);
          phase = (phase + 1) % b.effects.length;
        }
        u.hitCounters.set(pk, phase);
        u.hitCounters.set(ck, charges);
      }
    });

    // uses-based weapon-swap termination (MEASURED 2026-07-14): the swap ends right after
    // its Nth shot fires — checked AFTER block dispatch so swapGate effects ride this shot
    if (u.swap?.maxShots != null) {
      u.swap.shotsFired = (u.swap.shotsFired ?? 0) + 1;
      if (u.swap.shotsFired >= u.swap.maxShots) u.swap = null;
    }

    if (!unlimited) {
      // MEASURED 2026-07-17 (owner): a dual-muzzle trigger fires 2 bullets (2 hitsplats) but still
      // consumes ONE ammo — muzzle_count does NOT enter the ammo/teamAmmo economy (quency-escape-queen
      // visibly spends her full 120-round mag as 120, not 60). So muzzle doubles DAMAGE only
      // (deriveWeaponFields folds it into normalMult); ammo stays 1/pull. MG burns hitsPerShot rounds.
      const consumed = u.char.weapon === 'MG' ? u.char.hitsPerShot : 1;
      u.ammo -= consumed;
      for (const t of teamAmmoBlocks) {
        t.residual += consumed;
        const need = (t.block.trigger as { kind: 'teamAmmo'; count: number }).count;
        while (t.residual >= need) {
          t.residual -= need;
          applyBlock(t.unitIdx, t.block, t.bi, frame);
        }
      }
      // Bastion: N bullets refunded per 10 fired
      if (u.ammoRefundPer10 > 0) {
        u.bulletsSinceRefund += consumed;
        while (u.bulletsSinceRefund >= 10) {
          u.bulletsSinceRefund -= 10;
          u.ammo = Math.min(maxAmmo(u, frame), u.ammo + u.ammoRefundPer10);
        }
      }
      if (u.ammo <= 0) {
        fireTriggered(u, 'lastBullet', frame);
        u.reloading = true;
        u.reloadProgress = 0;
      }
    }
  }

  // ---- results ----
  const totals = units.map((u) => u.damage.normal + u.damage.skill + u.damage.burst);
  const teamDamage = totals.reduce((a, b) => a + b, 0);
  const results: UnitResult[] = units.map((u, i) => ({
    slug: u.char.slug,
    name: u.char.name,
    position: i + 1,
    burst: u.char.burst,
    weapon: u.char.weapon,
    element: u.char.element,
    advantaged: advantaged(u),
    staticAtk: u.staticAtk,
    totalDamage: totals[i],
    dps: totals[i] / cfg.durationSec,
    share: teamDamage ? totals[i] / teamDamage : 0,
    breakdown: u.damage,
    pulls: u.pulls,
    burstCasts: u.burstCasts,
      maxHp: u.maxHp,
    warnings: [
      ...u.warnings,
      ...(u.char.rl3 == null ? ['no rl3 burst-gen stat — team gauge estimate uses a default'] : []),
      ...(u.char.weapon === 'Pistol' ? ['Pistol cadence is a 4/s estimate; no doll data'] : []),
    ],
    loadout: prepared?.[i]?.loadout ?? [],
  }));

  return {
    config: cfg,
    units: results,
    teamDamage,
    teamDps: teamDamage / cfg.durationSec,
    fullBursts,
    fullBurstUptime: fbFrames / totalFrames,
    rotationStallSec: stallFrames / FPS,
    rotationLog,
  };
}
