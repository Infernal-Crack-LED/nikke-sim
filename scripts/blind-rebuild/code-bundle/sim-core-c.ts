// sim.ts lines 1767-2100: fireTriggered, maxAmmo, main loop trigger scheduling, consolidation

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
