// sim.ts lines 1418-1766: applyEffect (buff/resource/flatDamage/dot/weaponSwap/heal/shield/storedHit/etc)

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

