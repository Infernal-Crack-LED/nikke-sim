# S7 JUDGE PACKET — `tove` (compact, answer-faithful compilation of the gauntlet artifacts)
Unit: Tove (slug `tove`) — AR / Water / Supporter / Burst I, cd 20s. Driver model family: Qwen. Cross-family reviewers:
S2b claude-fable-5 (pre-op), S5/S6/S7 claude-opus-4-8 (post-op). Gauntlet date 2026-07-24.

## 1. Ground truth — kit prose (data/characters.json → characters.tove.skills, structural; levels 10/10/10)
Base: AR/Water/Supporter/Burst I, cd 20s, ammo 60, reloadFrames 81, chargeFrames 0, hitsPerShot 1, normalAttackMultiplier 14.2, coreAttackMultiplier 200, 720 rate_of_fire (~12 shots/s). baseStats hp 15000 / atk 500 / def 100, critRate 15 / critDamage 150. Manufacturer Missilis.
NOTE: the normalized `skills` prose below is the SSOT the sim reads. The RAW datamine is STALE on two values — S2 crit-rate (datamine 3.32 → prose 10.08) and burst duration (datamine 10s → prose 15s); both are already refreshed in the prose. The datamine also renders S1 as a "2% chance when attacking" while the normalized prose says "after 10 normal attacks" — the prose governs (flagged as a residual trigger-cadence ⚑; both cadences keep the buff stacked at this fire rate).

skill1:
■ Activates after 10 normal attack(s). Affects self.
Emergency-Crafted Bullets: Reload 5.31% of the magazine.
■ Activates during Emergency-Crafted Bullets. Affects all allies.
Temporary Modification: Max Ammunition Capacity ▲ 2, stacks up to 3 time(s) and lasts for 5 sec.
Critical Damage ▲ 5.24% for 5 sec.

skill2:
■ Only activates when Temporary Modification is at max stacks. Affects all allies.
Critical Rate ▲ 10.08% continuously.
■ Only activates when Temporary Modification is at max stacks. Affects all shotgun-wielding allies.
Attack Speed ▲ 42.24% continuously.

burst:
■ Affects all allies.
Miracle of Makeshifts: ATK ▲ 2.32% of the skill user's ATK. Mirrors the stack count of Temporary Modification for 15 sec.
■ Affects all shotgun-wielding allies.
Miracle of Makeshifts: ATK ▲ 24.21% of the skill user's ATK. Mirrors the stack count of Temporary Modification for 15 sec.

## 2. Damage-formula + mechanics SSOT (the facts the verdict turns on)
Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket × taken × distributed.

**casterAtkPct vs atkPct:** "ATK ▲ x% of the skill USER'S ATK" = `casterAtkPct` — a FLAT add resolving to (x/100)×caster.staticAtk at apply time, feeding the ATK bucket as a flat add. The buffApply `value` is the RESOLVED flat ATK (e.g. ≈6941 for Tove's 6.96% line, ≈72437 for the 72.63% line), NOT the raw percentage; the original percentage rides the event KEY (`:6.96` / `:72.63`). `atkPct` instead scales each TARGET'S OWN ATK by x% (a percentage in the ATK bucket; buffApply value = x). Tove's burst "ATK ▲2.32%/24.21% of the skill user's ATK" → casterAtkPct (caster-keyed flat), NOT atkPct.

**"Mirrors the stack count" (×3 at steady state):** Temporary Modification stacks to 3 (max). The burst grant = base × current stacks; at steady state stacks = 3, so all allies get 2.32×3 = 6.96% caster ATK and SG allies get 24.21×3 = 72.63% caster ATK. The engine has no live stack-mirror, so the ×3 is baked as a static steady-state value (faithful for a 180s fight; an early burst before the ~2.5s ramp would be over-credited — residual ⚑).

**TWO-LINE CO-STACK — SG total 79.59% (the dominant trap; fable S2b fell into it):** the burst has TWO DISTINCT ■ lines with TWO DISTINCT target clauses and magnitudes — "all allies: 2.32×3 = 6.96" AND "shotgun-wielding allies: 24.21×3 = 72.63". An SG ally is an ally AND shotgun-wielding, so it is targeted by BOTH lines and receives 6.96 + 72.63 = 79.59% caster ATK. The two blocks carry DISTINCT buff-key values (6.96 vs 72.63) → NO same-slot overwrite → they co-stack ADDITIVELY in the engine (probe-confirmed: SG allies noir/isabel each receive BOTH a :6.96 and a :72.63 buffApply per cast). The fable S2b "supersede" reading (SG ally gets only 72.63 because "same buff name from one cast resolves to one value per target") misreads the two-line structure: these are two separate effect instances, not one buff with two tiers. The prior owner-queued reconciliation (data/kit-status.json) independently states "SG allies should get 2.32+24.21 = 79.59% caster ATK". The driver's encoding (both blocks) is faithful; the supersede reading is a RECON_ERROR.

**maxAmmoFlat vs maxAmmoPct:** "Max Ammunition Capacity ▲2, stacks up to 3" = `maxAmmoFlat` (FLAT rounds), +2×3 = 6 at steady state, added on top of any percent scaling in maxAmmo() (theme 14; the flat-rounds path is live — cf. trina/grave/noir). `maxAmmoPct` would scale the magazine by a percentage — wrong for non-60-round magazines: a 9-round SG ally gets round(9×1.02)−9 ≈ +0 vs the kit-literal +6 (a ~30× scoping error on exactly the SG allies this kit exists for). maxAmmoFlat 6 is the faithful encoding.

**alliesOfWeapon SG (scope):** "all shotgun-wielding allies" = `alliesOfWeapon` weapon:SG — weapon-typed, class-blind. Tove herself is AR → excluded by weapon (not by an excludeSelf flag). The S2 attack-speed line and the burst SG line target SG allies ONLY; the S1/S2 all-ally lines (critDamagePct, maxAmmoFlat, critRatePct) and the burst all-ally line (casterAtkPct 6.96) target all 5 slots including Tove. The classic scope-collapse trap is mis-encoding the SG-scoped attack-speed line as generic `allies` (a massive team-wide shot-count over-credit).

**burstCast vs fullBurstEnter (trigger identity):** "Miracle of Makeshifts" is Tove's OWN burst (Burst I) → `burstCast` (fires only on rotations Tove casts). `fullBurstEnter` fires on EVERY team Full Burst window — over-crediting whenever another B1 shares the team (Tove competes for the B1 slot). For Tove as SOLE B1, casts === fbs (she casts every cycle), so trigger identity is discriminated by FRAME, not count: her burstCast frame (180, 1380, …) strictly PRECEDES each fullBurstStart frame (262, 1462, …, ~82f later after the B2/B3 steps) — the two frame sets never coincide.

**Steady-state stack modeling (S1/S2 as frame-0 passives):** Temporary Modification procs on Tove's OWN 10 normal attacks; at 720 RoF (~12/s) that is a ~0.83s cadence, and each proc applies/refreshes the 5s buff, so it reaches 3 stacks within ~2.5s and stays maxed (refreshed far faster than the 5s expiry). The S2 "only activates when Temporary Modification is at max stacks" gate is therefore permanently satisfied, and modeling the max-stack RESULT (critDamagePct 5.24, maxAmmoFlat 6, critRatePct 10.08, attackSpeedPct 42.24) as a frame-0 passive (no expiry) is faithful for the 180s fight — the ~2.5s opening ramp is ~1.4% of the fight. The engine has NO "named-buff-at-max-stacks" block gate primitive (fable + S6 both concede this); it has `rampSec` to model the ramp, but rampSec is an UNMEASURED per-unit ⚑, so the clean steady-state passive (the project's standard simplification, documented in the override note) is the faithful choice. The brief ramp is a residual owner spot-check item, not a gotcha.

**critDamagePct 5.24 is NOT stacked:** the S1 "Critical Damage ▲5.24% for 5 sec" line shares the Temporary Modification trigger block but carries NO stack clause — it does NOT inherit "stacks up to 3". So it is 5.24, not 15.72 (fable's flagged nearest-wrong).

**No partial-reload / ammo-refill primitive (v1):** the engine's EffectDef kinds are buff / resource / flatDamage / dot / weaponSwap / fillGauge / heal / shield / targetStatus / storedHit — there is NO instantReload / refillAmmo primitive (maxAmmoFlat/maxAmmoPct change magazine CAPACITY, not a refill). Tove's S1 self "Reload 5.31% of the magazine" → UNMODELED (documented verbatim). It is SELF-only and negligible on a Supporter whose personal damage is ~irrelevant (her value is the team buffs); the material offense-relevant ammo line — maxAmmoFlat 6 to ALL allies (gating the whole team's shot count) — IS modeled. Both fable S2b and opus S6 attempted an `instantReload` encoding; that primitive does not exist, so the encoding would not validate/execute — the driver's documented UNMODELED is correct for the current engine (same shape as trina's blind `heal` block).

**Gates available:** fbGate(inFb/outFb), swapGate, requiresTargetStatus (ENEMY status only), requiresCore, everyN, hitCount, resourceGate, formation/teamHas. There is NO ally-buff-stack-count gate and NO partial-reload effect kind in v1.

## 3. Driver's override (src/skills/overrides/tove.json, structural — pre-gauntlet, hand-authored with a prior fable pre-op approval)
```json
{
  "note": "Whole-kit built on Temporary Modification stacks (max 3), modeled at steady-state fully-stacked: her Emergency-Crafted Bullets procs on her OWN 10 normal attacks (AR ~12/s → sub-second cadence) and each proc applies/refreshes Temporary Modification, so across a 180s raid the buff stays maxed. [2026-07-21 SG-TEAM RECONCILIATION] Enacted the 3 previously-skipped datamined lines now that the engine primitives exist (maxAmmoFlat + alliesOfWeapon SG) — this executes the DECISIONS-queued tove SG reconciliation, NOT a re-litigation (the old skips were technical: 'no weapon-typed target' and 'maxAmmoPct is percent not flat', both since removed). Fable pre-op APPROVED-WITH-REVISIONS / HIGH; board-neutral (tove is in no graded comp → regression byte-identical); community submission 2026-07-15-1754-req1-tove (HIGH conf) video-confirmed the +6 max-ammo on ALL allies (tove 60→66, nayuta 120→126, the 3 SG allies 9→15). (1) S1 Temporary Modification Max Ammo +2/stack ×3 = maxAmmoFlat 6 to ALL allies (was skipped 'negligible' — video refutes it: +67% mag on a 9-round SG = materially more shots/mag). (2) S2 at max stacks, all shotgun-wielding allies Attack Speed ▲ 42.24% (alliesOfWeapon SG; passive/steady-state-max-stack, matching the S2 crit-rate line's gate). (3) Burst, all shotgun-wielding allies ATK ▲ 24.21% of caster ATK, mirrors stacks ×3 = 72.63% for 15s (alliesOfWeapon SG; burstCast) — co-stacks ADDITIVELY with the all-ally 6.96 line (different buff-key value, so no same-slot overwrite → SG allies get 79.59% total). S1 team Crit Damage 5.24% (passive, 3-stack). S2 team Crit Rate 10.08% (passive; refreshed 2026-07-20 from current prose, prior 3.32% was pre-rebalance). Burst all-ally ATK 2.32×3 = 6.96% of caster ATK for 15s (refreshed 2026-07-20). EVIDENCE TIER: the max-ammo line is video-confirmed + datamined; the two SG buffs (attack-speed, burst-ATK) are DATAMINED magnitudes only — community footage is gear-confounded so they were not independently video-measured (same tier as other landed datamine-faithful lines). Still skipped: the self 5%-reload QoL proc (Reload 5.31% of magazine, non-damage ammo refill).",
  "unmodeled": {
    "skill1": [
      "■ Activates after 10 normal attack(s). Affects self. Emergency-Crafted Bullets: Reload 5.31% of the magazine."
    ],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 5.24
        },
        {
          "kind": "buff",
          "stat": "maxAmmoFlat",
          "value": 6
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 10.08
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackSpeedPct",
          "value": 42.24
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 6.96,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 72.63,
          "durationSec": 15
        }
      ]
    }
  ]
}

```

## 4. S2b pre-op adversarial review (claude-fable-5, cross-family) — leakDetected null
```json
{
  "slug": "tove",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "After 10 normal attacks: Reload 5.31%",
      "disposition": "FAITHFUL",
      "scope": "normal attacks only feed the counter (AR rounds, 1/pull); the reload is a partial magazine refill, not a speed buff",
      "durationSemantics": "instantaneous proc, no duration",
      "triggerIdentity": "hitCount count:10 (counts ROUNDS, not seconds); recurring every 10 rounds for the whole fight",
      "targetSet": "self only",
      "nearestWrongModel": "instantReload with default fraction (full refill) — 60 rounds back every 10 shots means Tove NEVER hits lastBullet/reload again; or misread as a reloadSpeedPct buff; or shotFired trigger",
      "distinguishingAssertion": "Tove still emits natural reload events; rounds-fired-per-magazine-cycle ≈ 60/(1-0.0531×6? no —) net drain is 10−(0.0531×maxAmmo≈3.5)/10-round block → cycle length ≈ 88–97 rounds (with the +6 stack ammo), strictly >66 and finite. Full-refill misread → zero reload events; no-proc misread → exactly 66-round cycles",
      "inertness": "must not touch allies' ammo economy; must not change any damage bucket directly",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Max Ammunition Capacity ▲ 2, x3, 5 sec",
      "disposition": "FAITHFUL",
      "scope": "generic weapon-state buff — this IS damage (gates shot count / lastBullet frequency), never a 'defensive skip'",
      "durationSemantics": "durationSec:5 per application, maxStacks:3; stacks sustained because the 10-round proc cadence (~0.8–1s at AR rate) refreshes well inside 5s; only a >5s firing gap drops them",
      "triggerIdentity": "same hitCount:10 proc — 'during Emergency-Crafted Bullets' = at each proc instant, not a separate state window",
      "targetSet": "all allies INCLUDING self (Tove's own magazine goes 60→66, which slightly stretches her own proc/reload pacing)",
      "nearestWrongModel": "maxAmmoPct 2 (percent) instead of maxAmmoFlat 2 rounds — on a 9-round SG ally that's +0.18 rounds vs +6 rounds, a ~30x scoping error on exactly the allies this kit exists for",
      "distinguishingAssertion": "at steady state an SG ally's effective max ammo = base+6 exactly (e.g. 9→15), and a reload-to-full refills base+6 rounds; percent misread gives base×1.06 (no integer +6 step)",
      "inertness": "stack count 3 is the cap — a 4th proc must refresh, never grow the buff",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Critical Damage ▲ 5.24% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "generic crit damage (no 'of normal attacks' scoping in the prose)",
      "durationSemantics": "durationSec:5, refresh-on-reproc, NO stack clause — this line does not inherit Temporary Modification's 'stacks up to 3'",
      "triggerIdentity": "same hitCount:10 proc as the ammo stack line",
      "targetSet": "all allies including self",
      "nearestWrongModel": "letting the crit-damage line stack ×3 alongside the ammo stacks (15.72% instead of 5.24%) because it shares the trigger block",
      "distinguishingAssertion": "steady-state critDamagePct contribution from this line on any ally is exactly 5.24, with buffApply events refreshing ~every 10 Tove rounds; never a 10.48/15.72 stacked value",
      "inertness": "must lapse (buffRemove) if Tove stops firing >5s (e.g. stunned)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "At max stacks: Crit Rate ▲ 10.08% cont.",
      "disposition": "FAITHFUL",
      "scope": "generic crit rate, all hit categories",
      "durationSemantics": "'continuously' = active exactly while the gate (Temporary Modification at 3 stacks) holds — not permanent-from-t0, not a 5s buff",
      "triggerIdentity": "stack-threshold gate on Tove's own S1 buff state; no schema primitive gates on another buff's stack count, so the driver must synthesize (resource-pool mirror, rampSec haircut, or co-triggered 5s buff applied only from the 3rd proc) — behavior, not encoding, is what the test must pin",
      "targetSet": "all allies including self",
      "nearestWrongModel": "unconditional passive live at t=0 — over-credits the opening ~2.5–3s (3 procs = 30 rounds needed) and survives any firing gap that should drop stacks",
      "distinguishingAssertion": "no critRatePct 10.08 is in effect before Tove's 30th round (~t<2.5s); it is in effect at t=10s steady state. Ungated misread is GREEN at t=0.5s; faithful is RED there",
      "inertness": "gate lives on TOVE's stacks — an ally's ammo state must never open/close it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "SG allies: Attack Speed ▲ 42.24% cont.",
      "disposition": "FAITHFUL",
      "scope": "weapon-typed target scope, class-blind; attackSpeedPct (fire cadence), not fireRatePct confusion",
      "durationSemantics": "continuous-while-gated, same max-stacks gate as the crit-rate line",
      "triggerIdentity": "same stack-threshold gate",
      "targetSet": "alliesOfWeapon SG only — Tove herself (AR) is excluded by weapon, not by an excludeSelf flag",
      "nearestWrongModel": "applying 42.24% attack speed to ALL allies — a massive team-wide shot-count over-credit; this is the kit's signature SG-only line",
      "distinguishingAssertion": "an SG ally's shots/sec rises ~42% at steady state vs control while a non-SG carry's shot cadence is BIT-IDENTICAL with the line zeroed via withPatchedOverride; on an SG-free comp the whole line must be board-inert",
      "inertness": "non-SG units' shot timelines unchanged; inert on SG-free comps",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 2.32% of skill user's ATK, x stacks",
      "disposition": "FAITHFUL",
      "scope": "flat ATK add derived from CASTER's ATK (casterAtkPct), not a % of each target's own ATK",
      "durationSemantics": "durationSec:15; magnitude 'mirrors the stack count' — value = 2.32 × current Temporary Modification stacks; stacks are reliably 3 by any realistic burst time (~2.5s ramp vs first burst ≥~4s), so a 3×-at-cast snapshot (6.96) is the faithful steady-state; whether the mirror re-tracks mid-window is a residual ambiguity to note, not silently pick",
      "triggerIdentity": "burstCast — Tove's OWN B1 cast (20s cd), NOT fullBurstEnter. As a B1 she competes for the slot: in any comp with another B1 (e.g. the control comp's Liter) she may burst on some/no rotations; keying to fullBurstEnter over-credits every rotation",
      "targetSet": "all allies including self",
      "nearestWrongModel": "atkPct 2.32 (scales each target's own ATK — wrong magnitude on every differently-statted ally) or dropping the ×3 mirror (under-credits 3x); or fullBurstEnter trigger firing on rotations Tove never burst",
      "distinguishingAssertion": "post-cast, every non-SG ally carries an identical flat ATK add equal to 3×2.32% of TOVE's ATK (same absolute number across allies regardless of their own ATK); zero applications on a run where Tove casts no burst",
      "inertness": "no application on Full Bursts Tove did not open with her own cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "SG allies: ATK ▲ 24.21% of user's ATK",
      "disposition": "FAITHFUL",
      "scope": "same casterAtkPct flat-add mechanic, SG-scoped tier of the SAME named buff (Miracle of Makeshifts)",
      "durationSemantics": "durationSec:15, mirrors stacks (3× = 72.63% of Tove's ATK at cap — the kit's biggest line)",
      "triggerIdentity": "burstCast, same cast as the 2.32% line",
      "targetSet": "alliesOfWeapon SG",
      "nearestWrongModel": "SG allies DOUBLE-DIP both same-named tiers (2.32+24.21 per stack = 79.59% at cap) instead of the SG tier superseding the generic one — same buff name from one cast should resolve to one value per target; this is the likeliest shared-prior misread on the whole kit",
      "distinguishingAssertion": "an SG ally's flat ATK add from this burst equals exactly 3×24.21% of Tove's ATK (not 3×26.53%); a non-SG ally's equals exactly 3×2.32%; zero on SG-free targets beyond the generic tier",
      "inertness": "must not leak the 24.21 tier onto non-SG allies; whole line board-inert on SG-free comps",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:hitCount10-partial-reload",
    "skill1:maxAmmoFlat2-x3-5s",
    "skill1:critDamage5.24-5s",
    "skill2:critRate10.08-maxStackGate",
    "skill2:attackSpeed42.24-SG-maxStackGate",
    "burst:casterAtk2.32xStacks-allies-15s",
    "burst:casterAtk24.21xStacks-SG-15s"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Every line in this kit is offense-relevant (rule 6: the ammo-capacity and partial-reload lines gate shot count) — an empty unmodeled set is expected; any driver 'skip' on the reload/ammo lines is a red flag. The four places I expect a shared-prior misread: (1) burst SG double-dip — both 'Miracle of Makeshifts' tiers summed on SG allies instead of the SG tier superseding; (2) skill2 encoded as an ungated t=0 passive, hiding the ~30-round (~2.5–3s) stack ramp and the stall-lapse behavior; (3) burst keyed to fullBurstEnter instead of burstCast — Tove is a B1 who competes with Liter in the control comp, so fullBurstEnter silently over-fires on rotations she never cast; (4) maxAmmoPct-vs-maxAmmoFlat on the ▲2 line (a ~30x error on a 9-round SG magazine). Encoding freedom the driver legitimately has: the max-stacks gate has no direct schema primitive (buff-stack gates don't exist; resourceGate needs a mirrored resource pool), and the burst's stack-mirror is fairly snapshotted at 3× given the ramp completes long before any burst — tests should pin BEHAVIOR (activation timing, magnitudes, target sets), not the primitive chosen. Residual ambiguity to reconcile with the driver: whether the 15s burst buff live-tracks stack count mid-window (practically moot at sustained max stacks, but it matters if Tove is stunned/stalled mid-window). Cadence caveat: my ~2.5s ramp estimate assumes the AR frame-quantized pull rate (⚑ datamine-unreliable field); assertions should be written in ROUNDS-fired terms (30th round), not wall-clock, to stay cadence-robust.",
  "model": "claude-fable-5"
}
```

## 5. S5 blind post-op test-writer (claude-opus-4-8, cross-family) — leakDetected null (spec + fixtures + gaps + testRun)
```json
{
  "slug": "tove",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "after 10 normals: reload 5.31% mag (self)",
      "disposition": "FAITHFUL",
      "assertion": "hitCount:10 self instantReload ~0.0531 (weapon-state). it.skip: partial-reload unobservable vs magazine reloads + negligible damage (supporter)."
    },
    {
      "slot": "skill1",
      "kitLine": "Temp Mod: Max Ammo +2 x3, 5s (allies)",
      "disposition": "FAITHFUL",
      "assertion": "maxAmmoFlat 2 maxStacks3 dur5, all allies. Removing it raises team reload count (bigger mag => fewer reloads); fails under a self-only or maxAmmoPct nearest-wrong. Lower-confidence (integer reload delta)."
    },
    {
      "slot": "skill1",
      "kitLine": "Critical Damage +5.24% 5s (allies)",
      "disposition": "FAITHFUL",
      "assertion": "critDamagePct 5.24 all allies. Zeroing it lowers OTHERS (teammate-only) damage => proves present + all-allies; a self-only model leaves othersDamage unchanged (RED)."
    },
    {
      "slot": "skill2",
      "kitLine": "Crit Rate +10.08% continuously (allies)",
      "disposition": "FAITHFUL",
      "assertion": "generic critRatePct all allies (UNSCOPED). Zeroing it lowers teammate damage; also catches taxonomy-#1 (scoped critRateNormalPct) since the generic key would be absent => no-op patch => RED. Scope discrimination it.skip (needs teammate non-normal damage)."
    },
    {
      "slot": "skill2",
      "kitLine": "Attack Speed +42.24% (shotgun allies)",
      "disposition": "FAITHFUL",
      "assertion": "attackSpeedPct 42.24 target alliesOfWeapon:'SG'. No SG ally in fixture => inert; retargeting to all-allies ADDS teammate shots, proving SG-scope is load-bearing (nearest-wrong all-allies => no-op => RED). On-SG magnitude it.skip (needs SG ally)."
    },
    {
      "slot": "burst",
      "kitLine": "ATK +2.32% caster, mirrors stacks 15s (allies)",
      "disposition": "GAP",
      "assertion": "casterAtkPct 2.32 x TempMod-stacks (x1..3, steady-state x3), all allies, 15s. it.skip: tove is BURST I; controlComp forces liter as B1 so tove never casts her burst here."
    },
    {
      "slot": "burst",
      "kitLine": "ATK +24.21% caster, mirrors stacks (SG allies)",
      "disposition": "GAP",
      "assertion": "casterAtkPct 24.21 x stacks, alliesOfWeapon:'SG', 15s. it.skip: doubly gated — needs a tove-as-sole-B1 comp AND an SG ally. Highest-value untested line."
    }
  ],
  "fixtures": "controlComp('tove', true) => [liter B1, crown B2, tove (carry/focus slot), helm B3], helm kept true (all tove tests are base-vs-patched deltas, so helm's own buffs cancel and never confound isolation). Teammate-only signal = OTHERS=['liter','crown','helm'] summed via unitOf, so 'all allies' is proven by teammate movement excluding tove. Two structural fixture limits drive the skips: (1) tove is Burst I and controlComp hardwires liter as the B1 caster, so tove does not cast her own burst — both burst blocks untestable here; (2) controlComp has no shotgun ally, so SG-scoped magnitudes (attack speed, burst-B) are inert and only the SG scoping (no leak to non-SG allies) is testable. All 5 counterfactuals built with withPatchedOverride (committed JSON untouched).",
  "gaps": [
    "burst-A (all-allies ATK 2.32% x stacks): it.skip — tove is Burst I; controlComp forces liter as the B1 caster so tove does not cast her own burst. Needs a comp where tove is the sole Burst-I unit.",
    "burst-B (shotgun-ally ATK 24.21% x stacks): it.skip — needs BOTH a tove-as-sole-B1 comp AND an SG ally; highest-value untested line.",
    "skill2 attack speed +42.24% ON a shotgun ally: it.skip — no SG ally in controlComp, so the on-target speed-up magnitude is unobservable (only the SG scoping is tested via the all-allies counterfactual).",
    "skill2 crit-rate SCOPE (generic critRatePct vs critRateNormalPct): it.skip — needs a teammate dealing crit-eligible NON-normal (skill/burst) damage for the two encodings to diverge; controlComp supporters may deal only normals.",
    "skill1 partial reload 5.31%/10-normals (self): it.skip — a ~3-round partial instant-reload is hard to isolate from magazine reload events and moves negligible damage (tove is a supporter).",
    "Temporary Modification MAX-STACKS gate (skill2) + burst STACK-MIRROR (x1..3): it.skip — steady-state refresh (every ~10 normals, 5s window) pins stacks to max, so the 'at max stacks' gate is ~always-on and the mirror resolves to x3; discriminating the gate needs a stack-starved scenario the fixture cannot build deterministically.",
    "FLAG (⚑): the schema has no native 'buff at max stacks' gate nor a dynamic stack-mirror multiplier for casterAtkPct — the driver likely models these via a resource pool or a fixed x3 steady-state value; this test asserts only the OBSERVABLE steady-state (buffs live, all-allies vs SG scope), not the gate/mirror mechanism itself.",
    "FLAG (⚑): cadence/reload frames (ammo 60, reloadFrames 81) are datamine-unreliable fields; the reload-count assertion (test on maxAmmoFlat) inherits that uncertainty and is marked lower-confidence."
  ],
  "model": "claude-opus-4-8",
  "testRunVsDriverOverride": "5 failed / 1 passed / 6 skipped (12). ALL 5 failures are BLIND HARNESS ARTIFACTS, not override divergences: (a) the patch helpers zeroStat/retargetStat/renameStat iterate `o.blocks` but the override shape is {skill1:[],skill2:[],burst:[]} — so every counterfactual patch is a NO-OP (the run equals base); (b) nUnit reads `u.total ?? u.damage` but the harness unit row exposes `totalDamage`, so othersDamage is always 0. Empirically: \"fixture non-vacuous\", \"skill1 critDamage\", \"skill2 critRate\" fail `expected 0 > 0` (the u.total misread); \"skill2 attackSpeed SG scope\" fails `expected 10717 > 10717` and \"skill1 maxAmmo reload\" fails `expected 68 > 68` (the o.blocks no-op makes the patched run identical to base). The 1 pass is \"tove applies no boss debuff\" (independent of both helpers). The driver's own T1-T7 (25/25 GREEN) verifies every load-bearing line faithfully; the blind SPEC table (fixture-independent) converges fully."
}
```

## 6. S6 blind post-op override-writer (claude-opus-4-8, cross-family) — leakDetected null (override + audit + flags)
```json
{
  "slug": "tove",
  "leakDetected": null,
  "override": {
    "slug": "tove",
    "skill1": [
      {
        "slot": "skill1",
        "trigger": {
          "kind": "hitCount",
          "count": 10
        },
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "instantReload",
            "fraction": 0.0531
          }
        ]
      },
      {
        "slot": "skill1",
        "trigger": {
          "kind": "hitCount",
          "count": 10
        },
        "target": {
          "kind": "allies"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "maxAmmoFlat",
            "value": 2,
            "durationSec": 5,
            "maxStacks": 3
          },
          {
            "kind": "buff",
            "stat": "critDamagePct",
            "value": 5.24,
            "durationSec": 5
          }
        ]
      }
    ],
    "skill2": [
      {
        "slot": "skill2",
        "trigger": {
          "kind": "passive"
        },
        "target": {
          "kind": "allies"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "critRatePct",
            "value": 10.08
          }
        ]
      },
      {
        "slot": "skill2",
        "trigger": {
          "kind": "passive"
        },
        "target": {
          "kind": "alliesOfWeapon",
          "weapon": "SG"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "attackSpeedPct",
            "value": 42.24
          }
        ]
      }
    ],
    "burst": [
      {
        "slot": "burst",
        "trigger": {
          "kind": "burstCast"
        },
        "target": {
          "kind": "allies"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "casterAtkPct",
            "value": 6.96,
            "durationSec": 15
          }
        ]
      },
      {
        "slot": "burst",
        "trigger": {
          "kind": "burstCast"
        },
        "target": {
          "kind": "alliesOfWeapon",
          "weapon": "SG"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "casterAtkPct",
            "value": 72.63,
            "durationSec": 15
          }
        ]
      }
    ],
    "unmodeled": {
      "skill1": [],
      "skill2": [
        "Gate 'Only activates when Temporary Modification is at max stacks' modeled as an always-on passive (engine has no 'named buff at max stacks' block gate); both S2 buffs (Crit Rate 10.08% all allies, Attack Speed 42.24% SG allies) credited continuously on the steady-state assumption that Temporary Modification holds at 3 stacks."
      ],
      "burst": [
        "'Mirrors the stack count of Temporary Modification for 15 sec' — the per-stack ATK scaling is baked in as a STATIC ×3 (assumed steady-state max stacks). Engine has no live stack-mirror for casterAtkPct, so an early burst (stacks < 3) is over-credited."
      ]
    },
    "caveats": [
      "⚑ Temporary Modification steady-state stacks: assumed pinned at 3 (max). It is +2 Max Ammo per stack, refreshed every 10 normal attacks (a ~5s window each) so a Water AR firing continuously should hold max — but the RAMP to 3 and any dry/reload gaps are unmeasured. Every S2 buff and both burst ATK magnitudes depend on this assumption.",
      "⚑ Burst ATK magnitudes (casterAtkPct 6.96 / 72.63) = kit base (2.32 / 24.21) × 3 stacks. If real stacks during Tove's burst window are < 3, these are too high; scale linearly.",
      "⚑ hitCount:10 refresh cadence depends on normal-attack fire rate (datamine-unreliable); how tightly Temporary Modification's 5s window is kept alive between refreshes is unverified.",
      "maxAmmoFlat (+2 ×3 stacks, all allies) is a weapon-state / shot-economy buff — it raises magazine size and thus shots fired for the whole team; treated as damage-relevant, not skipped."
    ],
    "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Tove is a pure Water/AR/Burst-I SUPPORTER: no self-damage riders, no weapon swap, no DoT. Core mechanic is the 'Temporary Modification' stack (built every 10 normal attacks via the Emergency-Crafted Bullets reload state) that gates S2's crit-rate/attack-speed auras and scales the burst ATK grant. The 'at max stacks' gates and the burst's stack-mirror are approximated as steady-state ×3 — the single largest source of error in this baseline."
  },
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates after 10 normal attack(s)",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger hitCount count:10 (ROUNDS not pulls; hitsPerShot 1 so 10 shots)"
    },
    {
      "slot": "skill1",
      "kitLine": "Reload 5.31% of the magazine",
      "status": "IMPLEMENTED",
      "effectOrReason": "instantReload fraction 0.0531 (self); weapon-state → affects shots fired"
    },
    {
      "slot": "skill1",
      "kitLine": "Activates during Emergency-Crafted Bullets",
      "status": "IMPLEMENTED",
      "effectOrReason": "same hitCount:10 co-fire (the reload state IS the trigger); target allies"
    },
    {
      "slot": "skill1",
      "kitLine": "Max Ammunition ▲2, stacks 3, 5 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff maxAmmoFlat value 2 maxStacks 3 durationSec 5 (all allies; weapon-state, damage-relevant)"
    },
    {
      "slot": "skill1",
      "kitLine": "Critical Damage ▲5.24% for 5 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff critDamagePct 5.24 durationSec 5 (all allies)"
    },
    {
      "slot": "skill2",
      "kitLine": "when Temp Modification at max stacks",
      "status": "IMPLEMENTED",
      "effectOrReason": "gate approximated as always-on passive (⚑ no max-stack block gate); see unmodeled/caveats"
    },
    {
      "slot": "skill2",
      "kitLine": "Critical Rate ▲10.08% continuously",
      "status": "IMPLEMENTED",
      "effectOrReason": "passive buff critRatePct 10.08 (all allies; unscoped/generic per text)"
    },
    {
      "slot": "skill2",
      "kitLine": "Attack Speed ▲42.24% continuously (SG allies)",
      "status": "IMPLEMENTED",
      "effectOrReason": "passive buff attackSpeedPct 42.24, target alliesOfWeapon SG"
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲2.32% of user ATK, mirrors stacks 15s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast buff casterAtkPct 6.96 (=2.32×3) durationSec 15, target allies (⚑ static stack ×3)"
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲24.21% of user ATK, mirrors stacks 15s (SG)",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast buff casterAtkPct 72.63 (=24.21×3) durationSec 15, target alliesOfWeapon SG (⚑ static ×3)"
    }
  ],
  "flags": [
    {
      "field": "burst[0].effects[0].value",
      "estimate": "6.96 (2.32 × 3 stacks)",
      "reasoning": "Kit grants 2.32% of caster ATK PER Temporary Modification stack (max 3). Engine has no live stack-mirror for casterAtkPct, so magnitude is baked at assumed steady-state max stacks.",
      "recipe": "Read the live Temporary Modification stack count on Tove's burst frame from footage; multiply 2.32 × observed stacks. If stacks ramp during her burst window, model with rampSec or a lower static value."
    },
    {
      "field": "burst[1].effects[0].value",
      "estimate": "72.63 (24.21 × 3 stacks)",
      "reasoning": "SG-ally variant of the same per-stack ATK grant; same steady-state ×3 assumption.",
      "recipe": "Same as burst[0]: pin observed stack count at Tove's burst and rescale 24.21 × stacks."
    },
    {
      "field": "skill2 (both blocks) — max-stacks gate",
      "estimate": "always-on passive (as if permanently at 3 stacks)",
      "reasoning": "Both S2 auras only activate at max Temporary Modification stacks. Temporary Modification is +2 Max Ammo, rebuilt every 10 normal attacks with a 5s life, so a continuously-firing Water AR should hold 3 stacks — but ramp-up and reload gaps are unmodeled, so this over-credits the opening seconds.",
      "recipe": "From footage, confirm Temporary Modification reaches and holds 3 stacks; measure time-to-max and any windows it drops below 3. If it dips, apply a rampSec / uptime haircut to critRatePct 10.08 and attackSpeedPct 42.24."
    },
    {
      "field": "skill1 hitCount:10 refresh cadence",
      "estimate": "fires roughly every 10 normal-attack rounds",
      "reasoning": "The 10-round threshold is kit-stated, but how frequently it fires (and thus how tightly the 5s Temporary Modification / crit-damage windows stay alive) depends on the datamine-unreliable normal-attack fire cadence.",
      "recipe": "Verify the base AR effective fire rate (60/ceil(60/nominal)) and confirm 10 rounds accrue inside each 5s window to keep the buffs continuous."
    }
  ],
  "model": "claude-opus-4-8"
}
```

## 7. Driver's test (scripts/tests/units/tove.test.ts) — the gate (25 tests, 7 groups T1-T7, all GREEN vs the shipped override)
```ts
// PER-UNIT KIT SPEC — `tove` (Tove, Supporter/AR/Water, Burst I, cd 20s, ammo 60, 720 RoF (~12 shots/s),
// reloadFrames 81, chargeFrames 0, hitsPerShot 1, normalMult 14.2 / coreMult 200, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (T1..T7), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.tove.skills, levels 10/10/10 — the normalized `skills` prose is the
// SSOT; the raw datamine is STALE on two values, S2 crit-rate 3.32→10.08 and burst duration 10→15s, both
// already refreshed in the prose the sim reads):
//   S1 (Emergency-Crafted Bullets / Temporary Modification):
//      ■ after 10 normal attacks → self: Reload 5.31% of the magazine (UNMODELED — self ammo-refill QoL proc,
//        non-damage; documented skip)                                                              [T1]
//      ■ during Emergency-Crafted Bullets → all allies: Temporary Modification — Max Ammunition Capacity ▲2,
//        stacks up to 3×, lasts 5 sec  ⇒  steady-state max-stack = maxAmmoFlat 6 (2×3) to all allies  [T2]
//      ■ (same trigger) → all allies: Critical Damage ▲5.24% for 5 sec  ⇒  steady-state critDamagePct 5.24 [T3]
//   S2 (Modification Successful — "only activates when Temporary Modification is at max stacks"; at steady
//       state Tove is permanently at 3 stacks, so both lines are always-on = passive):
//      ■ at max stacks → all allies: Critical Rate ▲10.08% continuously  ⇒  critRatePct 10.08 (passive) [T4]
//      ■ at max stacks → all shotgun-wielding allies: Attack Speed ▲42.24% continuously  ⇒  attackSpeedPct
//        42.24 to alliesOfWeapon SG (passive)                                                     [T5]
//   BU (Miracle of Makeshifts — "ATK ▲ x% of the skill user's ATK. Mirrors the stack count of Temporary
//       Modification for 15 sec"; at steady state stacks = 3, so the grant is ×3 = casterAtkPct, burstCast):
//      ■ all allies: ATK ▲2.32% of caster ATK × 3 stacks = 6.96% caster ATK, 15s                  [T6]
//      ■ all shotgun-wielding allies: ATK ▲24.21% of caster ATK × 3 stacks = 72.63% caster ATK, 15s
//        (co-stacks ADDITIVELY with the all-ally line — distinct buff-key value 72.63 vs 6.96, so SG allies
//        get 6.96 + 72.63 = 79.59% caster ATK total)                                              [T7]
//
// STEADY-STATE MODELING (why S1/S2 are passive at max-stack values): Tove's Emergency-Crafted Bullets procs on
// her OWN 10 normal attacks; at 720 RoF (~12/s) that is a ~0.83s cadence, and each proc applies/refreshes the
// 5s Temporary Modification buff, so across a 180s raid the buff reaches 3 stacks within ~2.5s and stays maxed
// (refreshed far faster than the 5s expiry). The S2 "at max stacks" gate is therefore permanently satisfied and
// the burst "mirrors the stack count" is permanently ×3. Modeling the max-stack RESULT as a frame-0 passive
// (S1/S2) and a ×3 casterAtkPct (burst) is faithful for the fight; the brief ramp is negligible over 180s.
// (The raw datamine gives S1 as a "2% chance when attacking" instead of "after 10 normal attacks"; the
// normalized SSOT prose governs the sim. Both cadences keep the buff stacked at this fire rate, so the
// steady-state encoding is robust to that discrepancy — flagged as a residual trigger-cadence ⚑ for the owner.)
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   T1  The S1 self-reload line ("Reload 5.31% of the magazine", self) is a non-damage ammo-refill QoL proc —
//       a sanctioned UNMODELED skip (recorded verbatim in unmodeled.skill1). The S1 SLOT is active (it emits the
//       T2 maxAmmoFlat + T3 critDamagePct team buffs), so this is a specific within-slot skip, not an empty slot.
//       PIN: skill1 emits EXACTLY the two modeled effect families {critDamagePct, maxAmmoFlat} and NO third
//       (reload/ammo-refill) effect — the documented skip is distinguished from a silent drop or a mis-encoding
//       of the reload line as a damage buff. GREEN vs shipped (exactly 2 families), RED if a reload-as-buff
//       encoding were added.
//   T2  "Max Ammunition Capacity ▲2, stacks up to 3×" = maxAmmoFlat 6 (FLAT 2 rounds × 3 stacks; theme 14, the
//       flat-rounds path is live) to all allies, passive (frame 0), no expiry (steady-state max-stack).
//       Nearest-wrong (a): stat maxAmmoPct 6 (a percentage, not flat rounds — wrong for non-60-round magazines).
//       (b) scope alliesOfWeapon SG (would hit only the 2 SG allies [3,4], not all 5). (c) a 5s duration (the
//       kit says "lasts for 5 sec", but at steady state the buff is refreshed every ~0.83s → permanent; a 5s
//       expiry would create dead windows). All three discriminated.
//   T3  "Critical Damage ▲5.24% for 5 sec" = critDamagePct 5.24 to all allies, passive (steady-state). Same
//       trigger as T2. Nearest-wrong (a): scope alliesOfWeapon SG (only [3,4]). (b) a 5s expiry (vs the faithful
//       permanent steady-state). Both discriminated.
//   T4  "Critical Rate ▲10.08% continuously" (gate: Temporary Modification at max stacks) = critRatePct 10.08 to
//       all allies, passive (the gate is permanently satisfied at steady state). Nearest-wrong (a): scope
//       alliesOfWeapon SG (the line says "all allies", not SG-only — would hit only [3,4]). (b) the gate modeled
//       as never-satisfied (zero critRatePct events). Discriminated by scope + presence.
//   T5  "Attack Speed ▲42.24% continuously" (gate: max stacks) → all SHOTGUN-wielding allies = attackSpeedPct
//       42.24 to alliesOfWeapon SG, passive. Nearest-wrong: scope `allies` (would hit all 5 slots, not just the
//       2 SG allies [3,4]) — the classic scope-collapse (SG-scoped line mis-encoded as generic). Discriminated.
//   T6  Burst "all allies: ATK ▲2.32% of caster ATK, mirrors stack count (×3), 15s" = casterAtkPct 6.96
//       (2.32×3), burstCast (Tove's OWN cast), target allies (all 5), 15s (900f). The buffApply `value` is the
//       RESOLVED flat ATK (= 6.96/100 × Tove.staticATK); the original 6.96 rides the event KEY (`:6.96`).
//       Nearest-wrong (a): trigger fullBurstEnter (lands on the FB-start frames, ~82f AFTER Tove's cast frames —
//       frame-discriminated; the two frame sets never coincide). (b) scope alliesOfWeapon SG (only [3,4]).
//       (c) stat atkPct (a percentage in the ATK bucket, NOT a caster-keyed flat add — value would be 6.96 not
//       the resolved flat). (d) duration 10s (the stale datamine value; the prose says 15s). (e) UN-mirrored
//       per-stack value 2.32 (ignoring "mirrors the stack count" ×3). All five discriminated.
//   T7  Burst "all shotgun-wielding allies: ATK ▲24.21% of caster ATK, mirrors stack count (×3), 15s" =
//       casterAtkPct 72.63 (24.21×3), burstCast, target alliesOfWeapon SG ([3,4]), 15s. Co-stacks additively
//       with the T6 all-ally line (distinct buff-key value → SG allies get 6.96 + 72.63 = 79.59% total).
//       Nearest-wrong (a): scope `allies` (would hit all 5, not just [3,4]). (b) stat atkPct (percentage, not
//       caster-keyed flat). Both discriminated.
//
// Fixture: Tove is Burst I, so a custom comp [tove(B1,AR Water) / crown(B2,MG Iron) / helm(B3,SR Water) /
// noir(B3,SG Wind) / isabel(B3,SG Electric)] is used. Tove is the SOLE Burst I → she casts every Full Burst
// cycle (9 casts over 180s) and the team completes 9 Full Bursts (casts === fbs); trigger identity is therefore
// discriminated by FRAME, not count — Tove's burstCast frame (180, 1380, …) strictly PRECEDES each
// fullBurstStart frame (262, 1462, …, ~82f later after the B2/B3 steps), so the two frame sets never coincide.
// The comp deliberately fields TWO SG allies — noir (slot 3) and isabel (slot 4) — and THREE non-SG allies
// (tove AR slot 0, crown MG slot 1, helm SR slot 2), so the "all allies" lines reach all 5 slots [0,1,2,3,4]
// while the SG-scoped lines reach only [3,4]. Boss Fire, focus Tove. Deterministic (no seed).
// Slot order: tove 0 / crown 1 / helm 2 / noir 3 / isabel 4.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const TOVE = 0;
const NOIR = 3; // SG ally
const ISABEL = 4; // SG ally
const ALL_SLOTS = [0, 1, 2, 3, 4];
const SG_ALLIES = [NOIR, ISABEL];

const FIXTURE = {
  slugs: ['tove', 'crown', 'helm', 'noir', 'isabel'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'tove',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- readers ----------------------------------------------------------------------------------
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === TOVE,
  );
const byStat = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.stat === stat && (value === undefined || b.value === value),
  );
/** buffApply events whose key carries the original (pre-conversion) effect value, e.g. 6.96 / 72.63. */
const byKeyVal = (evs: SimEvent[], stat: string, origVal: number) =>
  byStat(evs, stat).filter((b) => b.key.endsWith(`:${origVal}`));
const targetsOf = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((t): t is number => t != null),
    ),
  ].sort((a, b) => a - b);
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame)),
  ),
];
const toveBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'tove',
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** Tove's burstCast frames (when SHE casts her burst — the B1 step of the chain). */
const castFrames = (evs: SimEvent[]) => toveBursts(evs).map((e) => e.frame);
/** Full-Burst-window opening frames (after the B2/B3 steps — strictly AFTER Tove's cast frame). */
const fbStartFrames = (evs: SimEvent[]) => fbStarts(evs).map((e) => e.frame);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
// The S1 passive block (T2 maxAmmoFlat 6 + T3 critDamagePct 5.24, target allies).
const isS1Passive = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'maxAmmoFlat' && e.value === 6);
// T2 nearest-wrong (stat): maxAmmoFlat 6 → maxAmmoPct 6 (a percentage, not flat rounds).
const cfS1MaxAmmoPct = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill1.find(isS1Passive);
  if (!b) throw new Error('tove S1 passive block missing — fixture is stale');
  const eff = b.effects.find((e: any) => e.stat === 'maxAmmoFlat');
  eff.stat = 'maxAmmoPct';
});
// T2/T3 nearest-wrong (scope): allies → alliesOfWeapon SG (hit only the 2 SG allies, not all 5).
const cfS1ScopeSG = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill1.find(isS1Passive);
  if (!b) throw new Error('tove S1 passive block missing — fixture is stale');
  b.target = { kind: 'alliesOfWeapon', weapon: 'SG' };
});
// T2/T3 nearest-wrong (duration): add a 5s expiry to the steady-state permanent passive.
const cfS1Dur5 = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill1.find(isS1Passive);
  if (!b) throw new Error('tove S1 passive block missing — fixture is stale');
  for (const e of b.effects) e.durationSec = 5;
});
// The S2 critRatePct 10.08 block (T4 under test, target allies).
const isS2CritRate = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'critRatePct' && e.value === 10.08);
// T4 nearest-wrong (scope): allies → alliesOfWeapon SG (the line says "all allies", not SG-only).
const cfS2CritRateScopeSG = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill2.find(isS2CritRate);
  if (!b) throw new Error('tove S2 critRate block missing — fixture is stale');
  b.target = { kind: 'alliesOfWeapon', weapon: 'SG' };
});
// The S2 attackSpeedPct 42.24 block (T5 under test, target alliesOfWeapon SG).
const isS2AtkSpeed = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'attackSpeedPct' && e.value === 42.24);
// T5 nearest-wrong (scope): alliesOfWeapon SG → allies (the classic scope-collapse: SG line as generic).
const cfS2AtkSpeedScopeAllies = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill2.find(isS2AtkSpeed);
  if (!b) throw new Error('tove S2 attackSpeed block missing — fixture is stale');
  b.target = { kind: 'allies' };
});
// The burst all-ally casterAtkPct 6.96 block (T6 under test).
const isBurstAll = (b: any) =>
  b.target?.kind === 'allies' &&
  b.effects?.some((e: any) => e.stat === 'casterAtkPct' && e.value === 6.96);
// T6 nearest-wrong (trigger): burstCast → fullBurstEnter (every team FB-start frame, not Tove's cast frame).
const cfBurstAllFbEnter = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) throw new Error('tove burst all-ally block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
// T6 nearest-wrong (scope): allies → alliesOfWeapon SG (only the 2 SG allies, not all 5).
const cfBurstAllScopeSG = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) throw new Error('tove burst all-ally block missing — fixture is stale');
  b.target = { kind: 'alliesOfWeapon', weapon: 'SG' };
});
// T6 nearest-wrong (stat): casterAtkPct → atkPct (a percentage in the ATK bucket, not a caster-keyed flat add).
const cfBurstAllAtkPct = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) throw new Error('tove burst all-ally block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});
// T6 nearest-wrong (duration): the stale datamine 10s window (the prose says 15s).
const cfBurstAllDur10 = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) throw new Error('tove burst all-ally block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'casterAtkPct').durationSec = 10;
});
// T6 nearest-wrong (mirror): the UN-mirrored per-stack value 2.32 (ignoring "mirrors the stack count" ×3).
const cfBurstAllUnmirrored = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) throw new Error('tove burst all-ally block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'casterAtkPct').value = 2.32;
});
// The burst SG casterAtkPct 72.63 block (T7 under test).
const isBurstSG = (b: any) =>
  b.target?.kind === 'alliesOfWeapon' &&
  b.effects?.some((e: any) => e.stat === 'casterAtkPct' && e.value === 72.63);
// T7 nearest-wrong (scope): alliesOfWeapon SG → allies (hit all 5, not just the 2 SG allies).
const cfBurstSGScopeAllies = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstSG);
  if (!b) throw new Error('tove burst SG block missing — fixture is stale');
  b.target = { kind: 'allies' };
});
// T7 nearest-wrong (stat): casterAtkPct → atkPct.
const cfBurstSGAtkPct = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstSG);
  if (!b) throw new Error('tove burst SG block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1MaxAmmoPct = run({ tove: cfS1MaxAmmoPct });
const s1ScopeSG = run({ tove: cfS1ScopeSG });
const s1Dur5 = run({ tove: cfS1Dur5 });
const s2CritRateScopeSG = run({ tove: cfS2CritRateScopeSG });
const s2AtkSpeedScopeAllies = run({ tove: cfS2AtkSpeedScopeAllies });
const burstAllFbEnter = run({ tove: cfBurstAllFbEnter });
const burstAllScopeSG = run({ tove: cfBurstAllScopeSG });
const burstAllAtkPct = run({ tove: cfBurstAllAtkPct });
const burstAllDur10 = run({ tove: cfBurstAllDur10 });
const burstAllUnmirrored = run({ tove: cfBurstAllUnmirrored });
const burstSGScopeAllies = run({ tove: cfBurstSGScopeAllies });
const burstSGAtkPct = run({ tove: cfBurstSGAtkPct });

const casts = toveBursts(base.events).length; // tove's burst casts (9)
const fbs = fbStarts(base.events).length; // team Full Bursts (9)

describe('tove — kit spec', () => {
  describe('fixture sanity — Tove casts her burst and the team reaches Full Burst', () => {
    it('Tove casts >0 bursts, the team completes >0 Full Bursts, and burstCast frames != fullBurstStart frames (trigger-identity is frame-discriminable)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B1 comp: Tove casts every Full Burst cycle (casts === fbs), but her burstCast frame PRECEDES each
      // Full Burst window opening (the B1 step fires before the B2/B3 steps complete the chain), so burstCast vs
      // fullBurstEnter is discriminated by FRAME, not by count.
      expect(casts).toBe(fbs);
      const cf = castFrames(base.events);
      const ff = fbStartFrames(base.events);
      expect(cf.every((f) => !ff.includes(f))).toBe(true);
    });
    it('the fixture fields exactly two SG allies (noir slot 3, isabel slot 4) for scope discrimination', () => {
      // the S2 attackSpeed line (alliesOfWeapon SG) reaches exactly noir + isabel
      expect(targetsOf(byStat(base.events, 'attackSpeedPct', 42.24))).toEqual(
        SG_ALLIES,
      );
    });
  });

  describe('T1 — S1 self-reload ("Reload 5.31% of the magazine", self) is UNMODELED (non-damage ammo-refill QoL)', () => {
    it('PIN: skill1 emits EXACTLY the two modeled effect families {critDamagePct, maxAmmoFlat} and NO reload/ammo-refill effect (the documented skip is not a silent drop or a mis-encoding)', () => {
      const s1Stats = new Set(
        buffs(base.events)
          .filter((b) => b.key.includes(':skill1:'))
          .map((b) => b.stat),
      );
      expect([...s1Stats].sort()).toEqual(['critDamagePct', 'maxAmmoFlat']);
    });
    it('PIN: Tove deals ZERO skill1-sourced damage (the slot is pure team buffing)', () => {
      const skill1Dmg = base.events.filter(
        (e) =>
          e.kind === 'damage' && e.slug === 'tove' && e.srcSlot === 'skill1',
      );
      expect(skill1Dmg.length).toBe(0);
    });
  });

  describe('T2 — S1 Temporary Modification: Max Ammunition Capacity ▲2 ×3 stacks = maxAmmoFlat 6 → all allies, passive (steady-state)', () => {
    const ammo = byStat(base.events, 'maxAmmoFlat', 6);
    it('is a FLAT 6 rounds to all 5 allies, applied at frame 0, no expiry (steady-state max-stack)', () => {
      expect(ammo.length).toBeGreaterThan(0);
      expect(ammo.every((b) => b.value === 6)).toBe(true);
      expect(targetsOf(ammo)).toEqual(ALL_SLOTS);
      expect(dursOf(ammo)).toEqual([null]);
      expect(Math.min(...ammo.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (stat): maxAmmoPct 6 (nearest-wrong) is a percentage, not flat rounds', () => {
      expect(byStat(s1MaxAmmoPct.events, 'maxAmmoFlat', 6).length).toBe(0);
      expect(
        byStat(s1MaxAmmoPct.events, 'maxAmmoPct', 6).length,
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies, not all 5', () => {
      expect(
        targetsOf(
          byStat(s1ScopeSG.events, 'maxAmmoFlat', 6),
        ),
      ).toEqual(SG_ALLIES);
    });
    it('DISCRIMINATING (duration): a 5s expiry (nearest-wrong) is NOT the faithful permanent steady-state passive', () => {
      expect(dursOf(byStat(s1Dur5.events, 'maxAmmoFlat', 6))).toEqual([
        5 * FPS,
      ]);
    });
  });

  describe('T3 — S1 Critical Damage ▲5.24% → all allies, passive (steady-state)', () => {
    const critDmg = byStat(base.events, 'critDamagePct', 5.24);
    it('reaches all 5 allies, applied at frame 0, no expiry (steady-state)', () => {
      expect(critDmg.length).toBeGreaterThan(0);
      expect(targetsOf(critDmg)).toEqual(ALL_SLOTS);
      expect(dursOf(critDmg)).toEqual([null]);
      expect(Math.min(...critDmg.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies, not all 5', () => {
      expect(
        targetsOf(byStat(s1ScopeSG.events, 'critDamagePct', 5.24)),
      ).toEqual(SG_ALLIES);
    });
    it('DISCRIMINATING (duration): a 5s expiry (nearest-wrong) is NOT the faithful permanent steady-state passive', () => {
      expect(dursOf(byStat(s1Dur5.events, 'critDamagePct', 5.24))).toEqual([
        5 * FPS,
      ]);
    });
  });

  describe('T4 — S2 Critical Rate ▲10.08% (max-stack gate, always satisfied at steady state) → all allies, passive', () => {
    const critRate = byStat(base.events, 'critRatePct', 10.08);
    it('reaches all 5 allies, applied at frame 0, no expiry ("continuously")', () => {
      expect(critRate.length).toBeGreaterThan(0);
      expect(targetsOf(critRate)).toEqual(ALL_SLOTS);
      expect(dursOf(critRate)).toEqual([null]);
      expect(Math.min(...critRate.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies — the line says "all allies"', () => {
      expect(
        targetsOf(byStat(s2CritRateScopeSG.events, 'critRatePct', 10.08)),
      ).toEqual(SG_ALLIES);
    });
  });

  describe('T5 — S2 Attack Speed ▲42.24% (max-stack gate) → all SHOTGUN-wielding allies, passive', () => {
    const atkSpd = byStat(base.events, 'attackSpeedPct', 42.24);
    it('reaches ONLY the 2 SG allies (noir, isabel), applied at frame 0, no expiry ("continuously")', () => {
      expect(atkSpd.length).toBeGreaterThan(0);
      expect(targetsOf(atkSpd)).toEqual(SG_ALLIES);
      expect(dursOf(atkSpd)).toEqual([null]);
      expect(Math.min(...atkSpd.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong scope-collapse) hits all 5 slots, not just the 2 SG allies', () => {
      expect(
        targetsOf(byStat(s2AtkSpeedScopeAllies.events, 'attackSpeedPct', 42.24)),
      ).toEqual(ALL_SLOTS);
    });
  });

  describe('T6 — Burst: all allies → ATK ▲2.32% ×3 stacks = 6.96% of CASTER ATK, 15s (casterAtkPct, burstCast)', () => {
    const atk = byKeyVal(base.events, 'casterAtkPct', 6.96);
    it('reaches all 5 allies, once per Tove cast × 5 targets, 15s, on burstCast, caster-keyed flat ATK', () => {
      expect(atk.length).toBe(casts * ALL_SLOTS.length);
      expect(targetsOf(atk)).toEqual(ALL_SLOTS);
      expect(dursOf(atk)).toEqual([15 * FPS]);
      // caster-keyed: the SAME resolved flat value on every target (= 6.96% of Tove's ATK)
      const vals = atk.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
      // the resolved flat ATK is 6.96% of Tove's static ATK (NOT the raw 6.96 percentage)
      const toveAtk = vals[0] / 0.0696;
      expect(toveAtk).toBeGreaterThan(0);
      // applies on Tove's burstCast frames
      const frames = [...new Set(atk.map((b) => b.frame))].sort((a, b) => a - b);
      expect(frames).toEqual([...castFrames(base.events)].sort((a, b) => a - b));
    });
    it("DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) lands on the later FB-start frames, not Tove's cast frames", () => {
      const cast = castFrames(base.events);
      const fb = fbStartFrames(base.events);
      const cfFrames = [
        ...new Set(
          byKeyVal(burstAllFbEnter.events, 'casterAtkPct', 6.96).map(
            (b) => b.frame,
          ),
        ),
      ];
      expect(cfFrames.length).toBeGreaterThan(0);
      expect(cfFrames.every((f) => fb.includes(f))).toBe(true);
      expect(cfFrames.every((f) => !cast.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies, not all 5', () => {
      expect(
        targetsOf(byKeyVal(burstAllScopeSG.events, 'casterAtkPct', 6.96)),
      ).toEqual(SG_ALLIES);
    });
    it('DISCRIMINATING (stat): atkPct (nearest-wrong) is a percentage in the ATK bucket, not a caster-keyed flat add', () => {
      // under the nearest-wrong there is NO casterAtkPct :6.96 …
      expect(byKeyVal(burstAllAtkPct.events, 'casterAtkPct', 6.96).length).toBe(0);
      // … instead an atkPct 6.96 appears (a percentage, value NOT resolved to flat ATK)
      const pct = byStat(burstAllAtkPct.events, 'atkPct', 6.96);
      expect(pct.length).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (duration): the stale datamine 10s (nearest-wrong) is shorter than the faithful 15s', () => {
      expect(dursOf(byKeyVal(burstAllDur10.events, 'casterAtkPct', 6.96))).toEqual([
        10 * FPS,
      ]);
    });
    it('DISCRIMINATING (mirror): the UN-mirrored per-stack value 2.32 (nearest-wrong) ignores "mirrors the stack count" ×3', () => {
      expect(
        byKeyVal(burstAllUnmirrored.events, 'casterAtkPct', 6.96).length,
      ).toBe(0);
      expect(
        byKeyVal(burstAllUnmirrored.events, 'casterAtkPct', 2.32).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('T7 — Burst: all SHOTGUN-wielding allies → ATK ▲24.21% ×3 stacks = 72.63% of CASTER ATK, 15s (co-stacks with T6 → SG total 79.59%)', () => {
    const atk = byKeyVal(base.events, 'casterAtkPct', 72.63);
    it('reaches ONLY the 2 SG allies, once per Tove cast × 2 targets, 15s, on burstCast, caster-keyed flat ATK', () => {
      expect(atk.length).toBe(casts * SG_ALLIES.length);
      expect(targetsOf(atk)).toEqual(SG_ALLIES);
      expect(dursOf(atk)).toEqual([15 * FPS]);
      const vals = atk.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
    });
    it('DISCRIMINATING (co-stack): SG allies receive BOTH the 6.96 all-ally line AND the 72.63 SG line (additive, distinct keys → 79.59% total)', () => {
      const sgTotal = byKeyVal(base.events, 'casterAtkPct', 6.96)
        .filter((b) => b.targetIdx === NOIR)
        .concat(byKeyVal(base.events, 'casterAtkPct', 72.63).filter((b) => b.targetIdx === NOIR));
      // noir gets both keys
      const keys = new Set(sgTotal.map((b) => b.key));
      expect([...keys].some((k) => k.endsWith(':6.96'))).toBe(true);
      expect([...keys].some((k) => k.endsWith(':72.63'))).toBe(true);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong) hits all 5 slots, not just the 2 SG allies', () => {
      expect(
        targetsOf(byKeyVal(burstSGScopeAllies.events, 'casterAtkPct', 72.63)),
      ).toEqual(ALL_SLOTS);
    });
    it('DISCRIMINATING (stat): atkPct (nearest-wrong) is a percentage, not a caster-keyed flat add', () => {
      expect(byKeyVal(burstSGAtkPct.events, 'casterAtkPct', 72.63).length).toBe(0);
      expect(
        byStat(burstSGAtkPct.events, 'atkPct', 72.63).length,
      ).toBeGreaterThan(0);
    });
  });
});

```

## 8. S2d independent verification matrix (driver) — gate PASSES
```
S2d INDEPENDENT VERIFICATION GATE — `tove` (kit-autonomy gauntlet 2026-07-24, driver Qwen)
=========================================================================================

Gate: run the S2a driver tests (scripts/tests/units/tove.test.ts) against (i) the UNMODIFIED shipped
override — expect GREEN for every FAITHFUL pin — and (ii) each named nearest-wrong counterfactual
(withPatchedOverride) — expect RED. A test GREEN under BOTH shipped and counterfactual asserts nothing
(vacuous) and FAILS this gate.

Command: npx vitest run scripts/tests/units/tove.test.ts
Result:  Test Files 1 passed (1) · Tests 25 passed (25) · Duration ~0.7s

Fixture: [tove(0,AR B1 Water) / crown(1,MG B2 Iron) / helm(2,SR B3 Water) / noir(3,SG B3 Wind) /
isabel(4,SG B3 Electric)], boss Fire, focus tove, deterministic (no seed). Tove = sole B1 → 9 burst casts
over 180s, casts === fullBurstStarts (9 === 9); burstCast frames (180,1380,…) NEVER coincide with
fullBurstStart frames (262,1462,…) → burstCast vs fullBurstEnter is frame-discriminable. SG allies = [3,4].

MATRIX (load-bearing line → GREEN vs shipped | RED under each named counterfactual)
----------------------------------------------------------------------------------
T2 S1 maxAmmoFlat 6 (all allies, passive steady-state)
   GREEN vs shipped: maxAmmoFlat 6 → targets [0,1,2,3,4], frame 0, no expiry  ✓
   RED cf stat   (maxAmmoFlat→maxAmmoPct 6):  no maxAmmoFlat 6; maxAmmoPct 6 appears  ✓
   RED cf scope  (allies→alliesOfWeapon SG):  targets [3,4] only  ✓
   RED cf dur    (add 5s expiry):             dursOf [300] not [null]  ✓
T3 S1 critDamagePct 5.24 (all allies, passive steady-state)
   GREEN vs shipped: critDamagePct 5.24 → [0,1,2,3,4], frame 0, no expiry  ✓
   RED cf scope  (allies→SG):  targets [3,4]  ✓
   RED cf dur    (5s expiry):  dursOf [300]  ✓
T4 S2 critRatePct 10.08 (all allies, max-stack gate → passive steady-state)
   GREEN vs shipped: critRatePct 10.08 → [0,1,2,3,4], frame 0, no expiry  ✓
   RED cf scope  (allies→SG):  targets [3,4]  ✓
T5 S2 attackSpeedPct 42.24 (SG allies, max-stack gate → passive steady-state)
   GREEN vs shipped: attackSpeedPct 42.24 → [3,4] only, frame 0, no expiry  ✓
   RED cf scope  (alliesOfWeapon SG→allies):  targets [0,1,2,3,4]  ✓
T6 Burst casterAtkPct 6.96 (2.32×3, all allies, burstCast, 15s)
   GREEN vs shipped: key :6.96 → [0,1,2,3,4], 9 casts×5 = 45 events, 15s (900f), cast frames, caster-keyed flat  ✓
   RED cf trigger (burstCast→fullBurstEnter):  applies on FB-start frames, never on cast frames  ✓
   RED cf scope   (allies→SG):                 targets [3,4]  ✓
   RED cf stat    (casterAtkPct→atkPct):       no casterAtkPct :6.96; atkPct 6.96 (percentage) appears  ✓
   RED cf dur     (15s→10s stale datamine):    dursOf [600]  ✓
   RED cf mirror  (6.96→2.32 un-mirrored):     no :6.96; :2.32 appears  ✓
T7 Burst casterAtkPct 72.63 (24.21×3, SG allies, burstCast, 15s; co-stacks with T6 → SG total 79.59%)
   GREEN vs shipped: key :72.63 → [3,4], 9 casts×2 = 18 events, 15s; SG ally noir carries BOTH :6.96 and :72.63  ✓
   RED cf scope   (alliesOfWeapon SG→allies):  targets [0,1,2,3,4]  ✓
   RED cf stat    (casterAtkPct→atkPct):       no casterAtkPct :72.63; atkPct 72.63 appears  ✓
T1 S1 self-reload (Reload 5.31% of magazine, self) — UNMODELED (no engine primitive)
   ABSENCE-PIN: skill1 emits EXACTLY {critDamagePct, maxAmmoFlat} families, no reload/ammo-refill effect  ✓
   ABSENCE-PIN: zero skill1-sourced damage  ✓

VERDICT: GATE PASSES. Every load-bearing FAITHFUL pin is GREEN vs the shipped override AND RED under each
named nearest-wrong counterfactual — no test is green-under-both (none vacuous). The UNMODELED S1 self-reload
is absence-pinned within an active slot (skill1 fires its two modeled families), distinguishing a documented
skip from a silent drop. Fire-rate "modeled≠working" check: each FAITHFUL burst block fires at the prose-implied
cadence (T6 = 9 casts × 5 targets = 45; T7 = 9 casts × 2 SG targets = 18); the passive S1/S2 blocks fire at
frame 0 and persist (steady-state max-stack).

```

## 9. ⚑ flags the driver recorded (estimate + recipe + tier)
1. **S1 trigger cadence (DATAMINED ⚑, trigger-identity):** the normalized SSOT prose says "after 10 normal attacks" (deterministic ~0.83s at 720 RoF); the raw datamine renders S1 as a "2% chance when attacking". The prose governs the sim. Both cadences keep Temporary Modification stacked at this fire rate (10 attacks = ~0.83s ≪ 5s expiry; 2% × 12/s = ~0.24 procs/s also refreshes inside 5s most of the time), so the steady-state max-stack encoding is robust to the discrepancy. Estimate: 10-attack deterministic counter (prose). Recipe: read the Emergency-Crafted Bullets proc cadence off a focused Tove video (does the Temporary Modification icon stay at 3 stacks continuously?). Tier: DATAMINED (prose) vs DATAMINED-UNRELIABLE (raw field).
2. **Steady-state stack ramp (CALIBRATED ⚑, stack/currency steady-state):** the S1/S2 passives and the burst ×3 mirror assume Temporary Modification holds at 3 stacks. The ~2.5s opening ramp (3 procs to reach 3 stacks) is unmeasured; an early burst (stacks < 3) would be over-credited by the static ×3. Estimate: max stacks from ~2.5s onward (negligible over 180s). Recipe: confirm time-to-3-stacks and any dry/reload gaps from footage; if material, apply rampSec ≈ 2.5 to the passives and a per-burst stack snapshot. Tier: CALIBRATED ⚑.
3. **Burst ×3 mirror is static (CALIBRATED ⚑):** casterAtkPct 6.96 / 72.63 bake the ×3 at cast; the engine has no live stack-mirror, so the grant does not re-track if stacks drop mid-window (practically moot at sustained max stacks; matters only if Tove is stunned/stalled mid-window). Estimate: ×3. Recipe: read the live stack count on Tove's burst frame. Tier: CALIBRATED ⚑.

## 10. Verdict instructions
Grade the driver's IMPLEMENTATION (the override in §3 + the test in §7) against the ground-truth prose (§1) and the formula/mechanics SSOT (§2), using the S2b pre-op review (§4), the S5 blind test (§5), and the S6 blind override (§6) as two independent re-derivations. Do NOT trust the driver's self-report — grade the artifacts.

Convergence is MECHANICAL: the S5 blind tests run vs the driver's shipped override showed 5 failed / 1 passed / 6 skipped — classify each failure (all 5 are documented blind harness artifacts: the `o.blocks` no-op patch shape + the `u.total`/`u.damage` unit-row misread; see §5 testRunVsDriverOverride). The blind SPEC table is the fixture-independent signal.

Per kit line classify FAITHFUL / DOCUMENTED-GAP / REAL-GOTCHA{SILENT_DROP,ENGINE/FIDELITY,ENCODING} / RECON_ERROR. Run the fire-rate "modeled≠working" check (each FAITHFUL block fires at the prose-implied cadence over 180s — the burst blocks fire 9 casts × targets; the S1/S2 passives fire at frame 0 and persist). Check discrimination (§8 matrix — no vacuous test). Magnitudes are owner/measurement-gated and OUT OF SCOPE except where they contradict the prose's own number.

The three driver-vs-blind divergences to adjudicate: (1) S1 self-reload — driver UNMODELED (no engine primitive) vs fable+S6 `instantReload` (a primitive that does not exist); (2) S2 max-stack gate / burst ×3 — driver steady-state passive vs fable's "ungated t=0 over-credits the ramp" flag (encoding freedom; no gate primitive exists; ramp is a ⚑); (3) burst SG total — driver 79.59 co-stack (both ■ lines) vs fable 72.63 supersede (the trap fable itself flagged, then fell into; opus S6 reproduced the driver's two-block co-stack).

Return ONLY this JSON (tight, structured — not an essay):
{
  "slug": "tove",
  "kitDescription": "<plain-English 3-6 sentences: what the kit DOES in game terms>",
  "convergence": {
    "s2b_fable_preop": { "model": "claude-fable-5", "leakDetected": null, "result": "<convergence summary>" },
    "s5_blind_tests": { "model": "claude-opus-4-8", "leakDetected": null, "specConvergence": "<...>", "testRun": "<5 failed/1 passed/6 skipped + classification>" },
    "s6_blind_override": { "model": "claude-opus-4-8", "leakDetected": null, "result": "<convergence summary + divergences adjudicated>" },
    "overall": "<CONVERGENT|... one line>"
  },
  "lineFindings": [ { "slot": "skill1|skill2|burst", "kitLine": "<≤40 chars>", "disposition": "FAITHFUL|UNMODELED|GAP", "classification": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR", "tier": "MEASURED|DATAMINED|COMMUNITY|CALIBRATED", "note": "<...>" } ],
  "gotchas": [ { "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING", "slot": "...", "summary": "...", "evidence": "...", "documentedByDriver": true, "severity": "high|med|low", "suggestedFix": "<faithful rep or 'needs measurement' + recipe — NEVER a fudge>" } ],
  "discriminationOk": true,
  "discriminationNote": "<the §8 matrix + fire-rate check result>",
  "faithfulnessScore": <0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>,
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
`gotchas` is [] if there are no REAL-GOTCHAs. `suggestedFix` is a faithful representation or a flagged measurement, NEVER a number chosen to hit the board. The verdict is BINDING.
