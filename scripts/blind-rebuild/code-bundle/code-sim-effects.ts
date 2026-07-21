// sim.ts lines 1701-end: applyEffect continued, fireTriggered, maxAmmo, firePull
// Extracted from src/engine/sim.ts

          if (fbEndFrame > frame) fbEndFrame += Math.round(e.seconds * FPS);
          else pendingFbExtendSec += e.seconds;
          break;
        case 'unlimitedAmmo':
          for (const t of resolveTargets(block.target, ownerIdx)) {
            applyBuff(t.buffs, key, 'unlimitedAmmo', 1, e.durationSec, 1, frame);
          }
          break;
        case 'gainPierce':
          // timed "Gain Pierce for N sec": mark the target Pierce-tagged for the window
          // so its (and teammates') Pierce Damage ▲ buffs go live only during it.
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.pierceUntilFrame = Math.max(
              t.pierceUntilFrame,
              frame + Math.round(e.durationSec * FPS)
            );
          }
          break;
        case 'stackedNuke': {
          const stacks = Math.min(owner.fbMissedSinceBurst, e.maxStacks ?? 12);
          if (stacks > 0) {
            const eff = Math.max(1, effectiveAtk(owner, frame));
            const hpEquivPct = e.hpPct ? ((e.hpPct / 100) * owner.maxHp * 100) / eff : 0;
            dealDamage(owner, (e.atkPct + hpEquivPct) * stacks, frame, {
              crit: false, core: false, charge: false, category,
            noRange: true,
            });
          }
          break;
        }
        case 'stun':
          for (const t of resolveTargets(block.target, ownerIdx)) {
            t.stunnedUntilFrame = Math.max(
              t.stunnedUntilFrame,
              frame + Math.round(e.durationSec * FPS)
            );
          }
          break;
        case 'instantReload':
          for (const t of resolveTargets(block.target, ownerIdx)) {
            const max = maxAmmo(t, frame);
            t.ammo = Math.min(max, t.ammo + Math.round(max * (e.fraction ?? 1)));
            if (t.ammo > 0) {
              t.reloading = false;
              t.reloadProgress = 0;
            }
          }
          break;
        case 'consumeAmmo':
          // "Removes N% of ammunition" / forced reload (theme 15): drain the belt by a fraction of
          // MAX capacity (default 1 = the whole magazine); if it empties, force a reload just as if
          // the unit had fired dry (fires lastBullet triggers). The inverse of instantReload.
          for (const t of resolveTargets(block.target, ownerIdx)) {
            const max = maxAmmo(t, frame);
            t.ammo = Math.max(0, t.ammo - Math.round(max * (e.fraction ?? 1)));
            if (t.ammo <= 0 && !t.reloading) {
              fireTriggered(t, 'lastBullet', frame);
              t.reloading = true;
              t.reloadProgress = 0;
            }
          }
          break;
      }
    }
  }

  function fireTriggered(u: UnitState, kind: 'fullBurstEnter' | 'fullBurstEnd' | 'lastBullet', frame: number) {
    u.blocks.forEach((b, bi) => {
      if (b.trigger.kind === kind) applyBlock(u.idx, b, bi, frame);
    });
  }

  function maxAmmo(u: UnitState, frame: number): number {
    const base = u.swap?.maxAmmo ?? u.char.ammo;
    if (u.swap?.maxAmmo !== undefined) return u.swap.maxAmmo; // swapped weapons use their spec directly
    const pct = (u.doll.maxAmmoPct ?? 0) + stat(u, 'maxAmmoPct', frame);
    // flat "▲ N round(s)" grants add on top of the percent scaling (theme 14)
    const flat = stat(u, 'maxAmmoFlat', frame);
    return Math.max(1, Math.round(base * (1 + pct / 100)) + flat);
  }

  units.forEach((u) =>
    u.blocks.forEach((b, bi) => {
      if (b.trigger.kind === 'teamAmmo') teamAmmoBlocks.push({ unitIdx: u.idx, block: b, bi, residual: 0 });
    })
  );

  // passives on at frame 0 (boss-element conditionals count when the element matches)
  units.forEach((u) =>
    u.blocks.forEach((b, bi) => {
      if (
        b.trigger.kind === 'passive' ||
        (b.trigger.kind === 'bossElement' && b.trigger.element === cfg.bossElement)
      ) {
        applyBlock(u.idx, b, bi, 0);
      }
    })
  );

  const romanStage: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };

  for (let frame = 0; frame < totalFrames; frame++) {
    const fbActive = fbEndFrame > frame;
    if (fbActive) fbFrames++;

    // ---- full burst end ----
    if (fbEndFrame === frame) {
      units.forEach((u) => fireTriggered(u, 'fullBurstEnd', frame));
      // units that sat this rotation out accrue a missed-burst stack (MP)
      units.forEach((u) => {
        if (!rotationCasters.includes(u.idx)) u.fbMissedSinceBurst++;
      });
      rotationCasters = [];
      stage = 0;
      // MEASURED (run-I bar anatomy, 2026-07-13): the next chain cannot open until
      // ~3s after full burst ends (chain glow at FB-end +3.0s even with the gauge
      // full at +1.2s and the Burst-1 cooldown ready at +1.5s) — the post-full-burst
      // camera/re-engage window. Generation keeps running during it.
      // ENV.ROTMODEL='refill': experiment arm removing the fixed post-FB block (chain opens
      // on gauge-full; SWHA 13-window bar traces). HELD — floor removal breaks the pinned
      // wind-weak 13s until the T5/T1 refill over-speed is measured (see cycle-rework design
      // in experiment-harness-ai.md). Default 'floor' = current measured-constant behavior.
      chainBlockedUntil =
        ENV.ROTMODEL === 'refill' ? frame : frame + POST_FB_CHAIN_DELAY_FRAMES;
    }

    // ---- burst rotation ----
    // the gauge only builds OUTSIDE full burst; during FB it is locked
    // gauge accrues via shotGauge() on each pull (see firePull)
    if (stageGapFrames > 0) stageGapFrames--;
    if (!fbActive && stage === 0 && gauge >= 100 && frame >= chainBlockedUntil) {
      gauge = 0; // the chain consumes the gauge (refill required if it collapses)
      stage = 1;
      stageExpireFrame = Infinity;
    }
    if (!fbActive && stage >= 2 && frame >= stageExpireFrame) {
      rotationLog.push(`${(frame / FPS).toFixed(1)}s  CHAIN EXPIRED at stage ${stage} (refill)`);
      stage = 0;
      stageExpireFrame = Infinity;
    }
    // Burst casts are BLOCKED while the boss is off-screen during a range transition
    // (user, 2026-07-13): if a transition lands mid-chain, the next cast waits out the
    // ~1s unhittable window. This is the real source of knife-edge full-burst-count
    // variance between otherwise identical runs — a chain-vs-transition collision
    // depends on the boss's timing jitter. The stage window keeps ticking while blocked.
    if (!fbActive && stage >= 1 && stageGapFrames === 0 && !bossUnhittable(frame)) {
      const want = romanStage[stage];
      const fillsStage = (u: UnitState) => {
        if (u.char.burst === 'Λ') {
          // pinned Λ (e.g. "Red Hood operates as B2") only fills its chosen stage
          return u.lambdaStage === null || u.lambdaStage === stage;
        }
        return u.char.burst === want || u.extraStages.has(stage);
      };
      // syncWithFocus gate (Mast in the DPS-chart Hyper Carry frameworks): a gated
      // unit may only take its stage while the focus/tested unit is itself off cooldown
      // and about to complete the chain — so Mast bursts iff the tested B3 does this
      // rotation, never coincidentally alongside a Helm-completed chain. AND she sits
      // out the full burst after every 3rd of her bursts (Mast's Hangover cycle): when
      // this stage's focus burst would be the 4th/8th/… she skips it (Crown fills in).
      const gatePasses = (u: UnitState) => {
        if (u.burstGate === 'syncWithFocus') {
          return units[focusIdx].burstCdFrames === 0 && (focusBurstCount + 1) % 4 !== 0;
        }
        // everyOther (Solo framework): a gated unit never takes stage 3 twice in a
        // row — it sits out the full burst right after one it cast, letting the
        // next stage-filling unit (the no-op B3) alternate in.
        if (u.burstGate === 'everyOther' && stage === 3) return lastStage3Caster !== u.idx;
        return true;
      };
      const eligible = (u: UnitState) =>
        u.burstCdFrames === 0 && fillsStage(u) && gatePasses(u);
      // burst-order overrides: a pending burstFirst unit (Prika duet opener) outranks
      // everything; then max-MP priority (Maiden, opt-in for manual-play comps); then
      // slot-order priority WITH waiting: inside a timed stage window the chain WAITS
      // for the leftmost stage-filling unit whose cooldown ends before the window
      // closes, rather than instantly handing the cast to a lower-priority ready unit.
      // (User ruling 2026-07-13: a 3rd-from-left Burst 3 like Maiden in the elec-weak
      // fight NEVER bursts on auto — no comp has enough CDR for the leftmost two to
      // both sit out a whole window. Without the wait, rotation jitter occasionally
      // let her in, bifurcating her damage across Monte Carlo seeds. A least-recently-
      // burst round-robin was tried earlier the same day and rejected: bench B3s cast
      // where real fights never pick them.)
      const inWindow = stage >= 2 && stageExpireFrame !== Infinity;
      const next = inWindow
        ? units.find((u) => fillsStage(u) && gatePasses(u) && frame + u.burstCdFrames < stageExpireFrame)
        : units.find(eligible);
      const cand =
        units.find((u) => u.burstFirstPending && eligible(u)) ??
        units.find((u) => u.mpPriority && u.fbMissedSinceBurst >= u.mpThreshold && eligible(u)) ??
        (next && next.burstCdFrames === 0 ? next : undefined);
      if (cand) {
        if (ENV.DBG_CD) {
          console.log(`[cd] t=${(frame / FPS).toFixed(2)} stage=${stage} cast=${cand.char.slug} cdWas=${cand.burstCdFrames} cdSec=${cand.char.burstCooldownSec}`);
        }
        cand.burstFirstPending = false;
        cand.burstCasts++;
        cand.lastBurstCastFrame = frame;
        cand.burstCdFrames = Math.round(cand.char.burstCooldownSec * FPS);
        rotationCasters.push(cand.idx);
        rotationLog.push(`${(frame / FPS).toFixed(1)}s  B${want} ${cand.char.name}`);
        const castStage = stage;
        // PER-UNIT BURST TIMING (video-measured 2026-07-13, U10): most nukes land with
        // FB active (frame-0 rule: +50% FB, entry auras, same-cast stage buffs — e.g.
        // rapi-RH, validated across five fights). Units flagged burstSnapshotsPreFb
        // (cinderella, via her e3 focus video) resolve their burst damage BEFORE full
        // burst and same-frame stage buffs register — the JP/einkk use-time snapshot.
        if (cand.burstSnapshotsPreFb) {
          cand.blocks.forEach((b, bi) => {
            if (b.trigger.kind === 'burstCast' && (b.trigger.stage ?? castStage) === castStage) {
              applyBlock(cand.idx, b, bi, frame);
            }
          });
        }
        if (stage === 3) {
          fbEndFrame = frame + FULL_BURST_FRAMES + Math.round(pendingFbExtendSec * FPS);
          pendingFbExtendSec = 0;
          gauge = 0;
          fullBursts++;
          lastStage3Caster = cand.idx;
          if (cand.idx === focusIdx) focusBurstCount++;
        }
        units.forEach((u) =>
          u.blocks.forEach((b, bi) => {
            if (b.trigger.kind === 'stageEnter' && b.trigger.stage === castStage) {
              applyBlock(u.idx, b, bi, frame);
            }
          })
        );
        // Burst-cast blocks resolve BEFORE full-burst-entry triggers (measured, test
        // battery 2 test 2, 2026-07-13): cinderella's nuke popup carried trina's
        // cast-granted attack damage but NOT anis-star's full-burst-entry aura (neither
        // its flat-ATK grant nor its attack damage) — with the aura the prediction is
        // 34-49% hot, without it the match is 0.99 on two separate casts. One physical
        // rule covers this and the noFb exemption: at the B3-cast instant Full Burst
        // has not begun, so the +50% major and every "during Full Burst" buff are
        // equally absent from cast-instant burst damage. Stored-hit releases stay
        // AFTER the entry triggers (they detonate inside the window and keep auras).
        if (!cand.burstSnapshotsPreFb) cand.blocks.forEach((b, bi) => {
          if (b.trigger.kind === 'burstCast' && (b.trigger.stage ?? castStage) === castStage) {
            applyBlock(cand.idx, b, bi, frame);
          }
        });
        if (castStage === 3) {
          units.forEach((u) => fireTriggered(u, 'fullBurstEnter', frame));
          // release stored hits (e.g. Rapi:RH's attached projectiles exploding)
          // AFTER enter-buffs so FB auras apply to them; charges added this
          // frame (from the stage-3 cast itself) wait for the next full burst
          for (const u of units) {
            for (const entry of u.storedHits.values()) {
              if (entry.freshFrame < frame) {
                entry.releasable += entry.fresh;
                entry.fresh = 0;
                entry.freshFrame = frame;
              }
              if (entry.releasable > 0) {
                dealDamage(u, entry.atkPct * entry.releasable, frame, {
                  crit: entry.critRoll || DOT_CRIT || XCRIT.has(u.char.slug),
                  // per-entry core RATE (RRH explosions ~1/3) via the coreOverride path —
                  // aim/range-independent; falls back to the env XCORE gate when unset
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
          rotationLog.push(`${(frame / FPS).toFixed(1)}s  FULL BURST (until ${(fbEndFrame / FPS).toFixed(1)}s)`);
        }
        cand.fbMissedSinceBurst = 0; // MP spent (blocks above already read it)
        if (castStage !== 3) {
          // "Re-enters Burst Stage N": hold the stage so a second eligible unit
          // can also cast this rotation (Tia + Anis:Star pairing)
          const reenters = cand.blocks.some(
            (b) =>
              b.trigger.kind === 'burstCast' &&
              (b.trigger.stage ?? castStage) === castStage &&
              b.effects.some((e) => e.kind === 'reenterStage' && e.stage === castStage)
          );
          const chainGap = rng
            ? STAGE_CAST_GAP_FRAMES + Math.round((rng() - 0.5) * 18)
            : STAGE_CAST_GAP_FRAMES;
          if (reenters && units.some((u) => u.idx !== cand.idx && eligible(u))) {
            stageGapFrames = chainGap; // stage stays; next pick is another unit
          } else {
            stage = (stage + 1) as 1 | 2 | 3;
            stageGapFrames = chainGap;
            stageExpireFrame = frame + STAGE_WINDOW_FRAMES;
          }
        }
      } else {
        stallFrames++;
      }
    }

    // ---- boss unhittable windows (range transitions) ----
    const unhittable = bossUnhittable(frame);
    if (unhittable && transitionFrames.includes(frame)) {
      // window start: fast reloaders (effective reload <= 1s) snap-refill their mag
      for (const u of units) {
        const effReload = reloadFramesNeeded(u.char.reloadFrames ?? 0, stat(u, 'reloadSpeedPct', frame));
        if (effReload <= FPS && !u.reloading) u.ammo = maxAmmo(u, frame);
      }
    }

    // ---- per-unit weapon FSM ----
    for (const u of units) {
      if (u.burstCdFrames > 0) u.burstCdFrames--;

      if (u.swap && frame >= u.swap.untilFrame) {
        u.swap = null;
        u.ammo = maxAmmo(u, frame);
        u.chargeProgress = 0;
      }

      if (frame < u.stunnedUntilFrame) {
        u.mgIdleFrames++; // MG spin winds down while stunned (decay applied on resume)
        continue;
      }

      if (u.reloading) {
        u.mgIdleFrames++; // spin winds down during the reload (decay applied on resume)
        u.reloadProgress += 1;
        if (u.reloadProgress >= reloadFramesNeeded(u.char.reloadFrames, stat(u, 'reloadSpeedPct', frame))) {
          u.reloading = false;
          u.reloadProgress = 0;
          u.ammo = maxAmmo(u, frame);
        }
        continue;
      }

      // boss unhittable (range transition): hold fire; in-progress reloads
      // (handled above) still advance through the window
      if (unhittable) {
        u.mgIdleFrames++;
        continue;
      }

      const unlimited = sum(u.buffs, 'unlimitedAmmo', frame) > 0;

      const chargeFrames = u.swap?.chargeFrames ?? u.char.chargeFrames;
      if (chargeFrames > 0) {
        // RL/SR (or swapped charge weapon): charge → fire full-charge shot → recharge.
        // Standard SRs insert a bolt-cycle recovery (not charge-speed-scaled) after
        // each shot; swap states and noBoltRecovery units are exempt.
        if (u.boltRecoveryFrames > 0) {
          u.boltRecoveryFrames--;
        } else {
          // Charge Speed is SUBTRACTIVE on charge time (decoded game data + einkk:
          // effective time = base x (1 - sumCS), floored at 1 frame; StatChargeTime is
          // a negative % on charge TIME). Excess past 100% does nothing except for kits
          // with an explicit conversion (Red Hood S1). Evaluated live each frame so CS
          // buffs mid-charge shorten the remaining charge.
          u.chargeProgress += 1;
          // Swap states with an explicit cadence are fire-rate-gated (decoded: Red Wolf
          // rate_of_fire 200rpm; eunhwa/nayuta/maxwell cycles hand-measured) — charge
          // speed does not shorten them.
          const cs =
            u.swap?.chargeFrames != null
              ? 0
              : Math.min(100, Math.max(0, stat(u, 'chargeSpeedPct', frame)));
          const needed = Math.max(1, Math.round(chargeFrames * (1 - cs / 100)));
          if (u.chargeProgress >= needed) {
            u.chargeProgress = 0;
            firePull(u, frame, true, unlimited);
            // Release latency applies to ALL release-fired charge weapons (SR + RL). New-style
            // AUTOFIRE units (datamined input_type === 'DOWN_Charge') are exempt — resolved from
            // the weapon table, not per-unit flags. charFixes.noBoltRecovery is a dormant manual
            // hand-tune hook (no active override sets it today); swaps exempt too.
            if (
              (u.char.weapon === 'SR' || u.char.weapon === 'RL') &&
              !u.swap &&
              !u.noBoltRecovery &&
              !isAutofireCharge(u.char)
            ) {
              u.boltRecoveryFrames = SR_BOLT_RECOVERY_FRAMES;
            }
          }
        }
      } else if (u.char.weapon === 'MG') {
        if (u.mgIdleFrames > 0) {
          // wind-down: retrace the ladder at MG_WINDDOWN_DECAY x after the grace period
          const lost = MG_WINDDOWN_DECAY * Math.max(0, u.mgIdleFrames - MG_WINDDOWN_GRACE_FRAMES);
          if (lost > 0) {
            const pos = Math.max(0, MG_LADDER_CUM[Math.min(u.mgRampRound, MG_RAMP_INTERVALS.length)] - lost);
            let round = 0;
            while (round < MG_RAMP_INTERVALS.length && MG_LADDER_CUM[round + 1] <= pos) round++;
            u.mgRampRound = round;
            u.mgCooldown = 0;
          }
          u.mgIdleFrames = 0;
        }
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
