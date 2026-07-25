# S7 JUDGE PACKET — `volume` (compact, answer-faithful compilation of the gauntlet artifacts)

Read this file ONCE, then return the JSON verdict. Do NOT read any other file. You grade ARTIFACTS vs
ground truth (the real kit text + the damage-formula/mechanics SSOT below + two independent blind re-derivations).
You do NOT trust the driver's self-report. Magnitudes are owner/measurement-gated and OUT OF SCOPE — do not
flag a magnitude unless it contradicts the prose's own number.

## 1. Ground truth — kit prose (data/characters.json → characters.volume.skills, structural)
Base: SMG / Wind / Attacker / Burst I, cd 20s, ammo 120, reloadFrames 111, chargeFrames 0, hitsPerShot 1,
normalAttackMultiplier 8.73, coreAttackMultiplier 200, critRate 15, critDamage 150.
- **S1** ■ Affects self when killing an enemy.
  - ATK ▲ 12.6% for 5 sec.
- **S2** ■ Activates when entering Full Burst. Affects all allies.
  - Effects vary according to the number of times entered. Each subsequent effect triggers all effects before it:
  - Once: Cooldown of Burst Skill ▼ 2.34 sec. / Twice: ▼ 2.7 sec. / Three times: ▼ 3.17 sec.
  - ■ Activates when using Burst Skill. Affects all allies.
  - Effects vary according to the number of uses. Each subsequent effect triggers all effects before it:
  - Once: Critical Damage ▲ 10.77% for 5 sec. / Twice: ▲ 12.46% for 5 sec. / Three times: ▲ 14.42% for 5 sec.
- **Burst** ■ Affects all allies.
  - Critical Rate ▲ 31.9% for 5 sec.

## 2. Damage-formula + mechanics SSOT (the facts the verdict turns on)
Damage = ATK × major (×1.10 element if advantaged) × charge × damageUp-bucket × taken × distributed.
**escalating effect (engine sim.ts:2056):** `const n = Math.min(activations, steps.length); steps.slice(0,n)
.forEach((step,si) => applyEffect(..., `${key}:s${si}`, ...))`. The Nth activation applies steps 1..N
(clamped); each step gets a DISTINCT buff key, so the steps COEXIST and SUM (no overwrite). "Each subsequent
effect triggers all effects before it" maps 1:1 to this — CUMULATIVE, not tier-replacement. So Volume's 3rd
FB-enter refunds 2.34+2.7+3.17 = 8.21s; her 3rd burst cast applies 10.77+12.46+14.42 = +37.65% crit damage
(as three coexisting buffs).
**burstCdr effect (engine sim.ts:2047):** `t.burstCdFrames = max(0, t.burstCdFrames - round(seconds*FPS))` —
directly refunds the target's burst cooldown frames and emits NO buffApply event. Observable ONLY indirectly,
via accelerated burst cadence (the target casts sooner / more often over the fight). "All allies" INCLUDES the
caster, so Volume shaving her own 20s B1 cooldown accelerates her own cadence — a clean observable.
**Trigger fidelity:** fullBurstEnter ("when entering Full Burst" = ANY team Full Burst entry) ≠ burstCast
("when using Burst Skill" = the unit's OWN burst casts). They diverge whenever another same-tier unit is in the
team, OR whenever not every cast completes a Full Burst chain (a sole-B1 unit can cast more often than the team
enters FB — e.g. Volume casts 10× while the team completes 5 FBs in the driver fixture). burstCast lands pre-FB
(at cast); fullBurstEnter lands at FB open.
**critRatePct vs critRateNormalPct:** plain "Critical Rate ▲" = generic critRatePct (lifts crit on EVERY bucket,
incl. skill/burst); "Critical Rate of normal attacks ▲" = scoped critRateNormalPct. Volume's burst says plain
"Critical Rate ▲" → generic.
**No kill trigger:** TriggerDef has NO on-kill / "when an enemy is killed" primitive. A "when killing an enemy"
line vs the immortal, partless, add-less scope-lock raid boss can NEVER fire → sanctioned UNMODELED (recording it
verbatim is correct; encoding a passive/shotFired ATK proxy would fabricate uptime the kit never grants — a
MEASURED>FUDGE violation).
**Gates available:** fbGate(inFb/outFb), swapGate, requiresTargetStatus (ENEMY status only), requiresCore,
everyN, resourceGate, formation/teamHas. (None are needed for Volume — her triggers are fullBurstEnter/burstCast.)

## 3. Driver's override (src/skills/overrides/volume.json, structural)
{
  "note": "Volume (`volume`) — Wind / SMG / Attacker / Burst I (20s); ammo 120, reloadFrames 111, chargeFrames 0, hitsPerShot 1, normalMult 8.73, coreMult 200; Tetra. Rotation-accelerator + crit support; personal damage is plain SMG fire (no riders/DoT/swap/charge). Kit-autonomy gauntlet 2026-07-24 (cross-family: S2b claude-fable-5, S5/S6/S7 claude-opus-4-8 converged). MODEL — S1: 'Affects self when killing an enemy. ATK ▲12.6% for 5s' is UNMODELED — kill-gated, and the scope-lock partless raid boss never dies mid-fight, so the trigger can NEVER fire (sanctioned skip; recorded verbatim in unmodeled.skill1, not approximated as a passive/shotFired ATK proxy — that would grant a +12.6% ATK the kit never gives vs an immortal boss; measured>fudge). S2 block A: 'entering Full Burst → all allies: Cooldown of Burst Skill ▼ 2.34/2.7/3.17s' = fullBurstEnter → allies → escalating burstCdr [2.34, 2.7, 3.17] — fires on ANY team FB entry (NOT burstCast); 'Each subsequent effect triggers all effects before it' = the engine's escalating semantics (Nth activation applies steps 1..N, clamped), so from the 3rd FB every entry refunds 2.34+2.7+3.17 = 8.21s off every ally's burst cooldown; 'all allies' INCLUDES Volume herself, and shaving her own 20s B1 cooldown is the mechanism that accelerates the whole rotation (a real rotation accelerator — changes team FB counts). burstCdr emits no buff event (sim.ts:2047 refunds burstCdFrames directly); observable as Volume's own accelerated burst cadence. S2 block B: 'using Burst Skill → all allies: Critical Damage ▲ 10.77/12.46/14.42% for 5s' = burstCast → allies → escalating critDamagePct [10.77, 12.46, 14.42] 5s — fires ONLY on rotations SHE casts (burstCast, NOT fullBurstEnter — the intra-slot trigger split vs block A is the kit's defining trap); each escalating step gets a DISTINCT buff key (sim.ts:2056), so from her 3rd cast all three coexist and SUM = +37.65% team crit damage for 5s per cast (no overwrite loss). BURST: 'all allies: Critical Rate ▲31.9% for 5s' = burstCast → allies → generic critRatePct 31.9 5s (plain 'Critical Rate' → generic, NOT scoped critRateNormalPct; lifts crit on skill/burst buckets too). BURST-ELIGIBILITY: all three modeled blocks are burst/FB-gated — in a team that cannot chain B1→B2→B3 her entire kit is inert and she contributes plain SMG fire only. ⚑ FLAGS: (1) cadence tuple (pullsPerSec / reloadFrames / rolling-reload) — fire rate/reload are unmeasured; engine SMG class default shipped, datamine rate_of_fire 1440rpm = 24/s (game-source authoritative); datamine reload_time 150 (~90f) vs synced reloadFrames 111 and reload_start_ammo 119 (possible rolling/partial-reload tell) still open on video; recipe = focused solo scope-lock video, count rounds per 10s window + the mag-empty→first-shot gap, watch whether the ammo counter refills partially while firing. Element ×1.10 clean vs Iron (no elemental-code buff); no Hit-Rate line, no HP-scaler, no multi-projectile (hitsPerShot 1).",
  "unmodeled": {
    "skill1": ["Affects self when killing an enemy.", "ATK ▲ 12.6% for 5 sec."],
    "skill2": [],
    "burst": []
  },
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            { "kind": "burstCdr", "seconds": 2.34 },
            { "kind": "burstCdr", "seconds": 2.7 },
            { "kind": "burstCdr", "seconds": 3.17 }
          ]
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            {
              "kind": "buff",
              "stat": "critDamagePct",
              "value": 10.77,
              "durationSec": 5
            },
            {
              "kind": "buff",
              "stat": "critDamagePct",
              "value": 12.46,
              "durationSec": 5
            },
            {
              "kind": "buff",
              "stat": "critDamagePct",
              "value": 14.42,
              "durationSec": 5
            }
          ]
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
          "stat": "critRatePct",
          "value": 31.9,
          "durationSec": 5
        }
      ]
    }
  ],
  "caveats": [
    "skill1: the kill-gated ATK ▲ 12.6% is UNMODELED — it can never trigger against the raid boss (the boss does not die mid-fight); recorded verbatim, not encoded as a passive/shotFired ATK proxy",
    "cadence: fire rate / reload are unmeasured estimates (engine SMG default shipped; datamine says 24 pulls/s, and reload_start_ammo 119 hints at a rolling reload) — verify on a focus video ⚑",
    "skill2/burst: escalating tiers reach full value only from her 3rd Full Burst / 3rd burst cast (burstCdr 8.21s/FB; critDamage +37.65%), and every modeled effect is burst/FB-gated — the whole kit is inert in a team that cannot chain Full Bursts"
  ]
}

## 4. S2b pre-op adversarial review (claude-fable-5, cross-family) — leakDetected null
{
  "slug": "volume",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "self when killing an enemy: ATK ▲12.6%",
      "disposition": "UNMODELED",
      "scope": "generic self ATK buff (no normal/charge/crit scoping)",
      "durationSemantics": "durationSec 5 (wall-clock, refreshable per kill)",
      "triggerIdentity": "on-kill — the schema has NO kill trigger, and the v1 fight is a single immortal boss, so the trigger can NEVER fire; must be recorded verbatim in `unmodeled`, not approximated",
      "targetSet": "self only",
      "nearestWrongModel": "encoding it as a passive (always-on) or shotFired-triggered self atkPct 12.6 buff 'since kills are frequent in real content' — silently over-crediting a trigger that is unobservable vs the boss",
      "distinguishingAssertion": "event log for volume contains ZERO buffApply with stat atkPct value 12.6 across the whole run; withPatchedOverride deleting the skill1 block changes totals(res) by exactly 0",
      "inertness": "must move nothing — no damage delta, no buff events, no rotation change",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "entering Full Burst: Burst CD ▼ (escalating)",
      "disposition": "FAITHFUL",
      "scope": "not a stat buff — an instantaneous burst-cooldown shave (burstCdr), no damage scoping",
      "durationSemantics": "instantaneous per activation (seconds removed from current cooldowns), NOT a timed buff and NOT a permanent CD% stat; escalating count is 'times entered', clamped at three — every entry from the 3rd on applies steps 1..3 = 2.34+2.7+3.17 = 8.21s",
      "triggerIdentity": "fullBurstEnter — 'Activates when entering Full Burst' fires on ANY team FB, whether or not volume cast her own burst; encode as trigger fullBurstEnter + effect escalating[burstCdr 2.34, burstCdr 2.7, burstCdr 3.17]",
      "targetSet": "all allies INCLUDING self — self-inclusion is load-bearing: shaving volume's own 20s B1 cooldown is the mechanism that accelerates the whole rotation",
      "nearestWrongModel": "two plausible misreads: (a) keying to burstCast because the sibling block in the same slot is burst-cast-worded — under-fires on any rotation volume doesn't personally cast; (b) reading 'Each subsequent effect triggers all effects before it' as REPLACEMENT (only the Nth tier applies) instead of cumulative, giving 3.17s instead of 8.21s at cap",
      "distinguishingAssertion": "record fullBurstStart timestamps: with volume present the gap between consecutive fullBurstStart events after the 3rd FB is consistent with an 8.21s shave off the 20s chain (≈12s CD floor), RED if only 3.17s is applied; and in a comp where a DIFFERENT B1 casts the opening rotations, the CD shave still lands on every FB entry (burstCast keying would show unshaved 20s gaps)",
      "inertness": "must not apply any timed stat buff (no buffApply/buffRemove pair from this block); no effect before the first fullBurstStart",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "using Burst Skill: Crit Damage ▲ 5 sec (esc.)",
      "disposition": "FAITHFUL",
      "scope": "generic critDamagePct (unscoped — applies to all crit hits, not normal-only)",
      "durationSemantics": "durationSec 5, wall-clock — kit says 'for 5 sec', no round-count language; escalating count is 'number of uses' of HER burst, cumulative: 1st cast 10.77, 2nd 10.77+12.46=23.23, 3rd+ 37.65 percentage points",
      "triggerIdentity": "burstCast — 'Activates when using Burst Skill' fires ONLY on rotations volume herself casts (pre-FB timing), explicitly DIFFERENT from the sibling block's fullBurstEnter; this intra-slot trigger split is the kit's defining trap",
      "targetSet": "all allies including self",
      "nearestWrongModel": "keying to fullBurstEnter to match the sibling block — over-credits every FB in a comp where another Burst-I unit (e.g. liter in the control comp) takes the cast, and shifts the 5s window to FB open instead of cast time; secondary misread: non-cumulative tiers (14.42 at cap instead of 37.65)",
      "distinguishingAssertion": "critDamagePct buffApply events from volume occur if-and-only-if a burstCast event for volume precedes them in the same rotation (zero applications on rotations where the other B1 casts); the 2nd application's value is 23.23 not 12.46; buffRemove fires 5s after cast — i.e. the buff dies roughly mid-FB, so late-FB damage events show no volume critDamage contribution",
      "inertness": "must NOT fire on FBs entered off another B1's cast; must not persist past +5s (the back half of the 10s FB window is unbuffed)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "all allies: Critical Rate ▲ 31.9% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "generic critRatePct — NOT critRateNormalPct (no 'of normal attacks' scoping in the text)",
      "durationSemantics": "durationSec 5, wall-clock — half the 10s FB window, not the full window",
      "triggerIdentity": "burstCast (it IS her burst skill; applies at cast, pre-FB banner)",
      "targetSet": "all allies including self",
      "nearestWrongModel": "stretching durationSec to 10 'to cover the Full Burst window' — over-credits the back half of every FB she casts; secondary misread: scoping to normal attacks only, which would under-credit teammates' skill/burst crit",
      "distinguishingAssertion": "buffApply critRatePct 31.9 at volume's burstCast frame on all 5 units, matching buffRemove exactly 5s later; damage events between t_cast+5 and fullBurstEnd carry the base crit rate (RED if the elevated rate persists to FB end)",
      "inertness": "no application on rotations volume doesn't cast; crit-rate lift must not appear on any hit outside the 5s window",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill2:fullBurstEnter escalating burstCdr [2.34,2.7,3.17]",
    "skill2:burstCast escalating critDamagePct [10.77,12.46,14.42] 5s",
    "burst:critRatePct 31.9 allies 5s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "■ Affects self when killing an enemy. ATK ▲ 12.6% for 5 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to check the driver against: (1) the two skill2 blocks have DELIBERATELY different triggers — 'when entering Full Burst' (fullBurstEnter, any team FB) for the CDR block vs 'when using Burst Skill' (burstCast, her own casts only) for the crit-damage block; collapsing both onto either trigger is the single most likely shared error, and it only diverges when a second Burst-I unit is in the team (the control comp's liter is exactly that), so the distinguishing tests MUST use a comp where volume does not cast every rotation. (2) 'Each subsequent effect triggers all effects before it' is CUMULATIVE (engine `escalating`: Nth activation applies steps 1..N, clamped) — steady-state CDR is 8.21s per FB entry and steady-state crit damage is 37.65pp, not the top tier alone. (3) burstCdr is an instantaneous cooldown shave, not a timed buff and not a permanent CD% — the observable is fullBurstStart spacing compressing below the 20s chain floor, and 'all allies' includes volume herself (her own B1 CD is the rotation bottleneck this kit exists to break). (4) Both 5s buffs cover only the FRONT half of a 10s FB (crit-damage even starts pre-banner at cast) — a duration stretched to 10s is a plausible over-credit. (5) skill1 is on-kill: no kill trigger exists in the schema and the v1 boss is immortal — it must land verbatim in `unmodeled`, and any encoding of it (passive/shotFired proxy) is an invented mechanic violating MEASURED>FUDGE. All magnitudes are kit-literal (DATAMINED); nothing here is measurement-gated and no ALWAYS-⚑ field applies (no damage lines, no cadence claims, no stacks-with-ramp).",
  "model": "claude-fable-5"
}

## 5. S5 blind post-op test-writer (claude-opus-4-8, cross-family) — leakDetected null (spec + fixtures + gaps)
{
  "slug": "volume",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "kill: ATK ▲12.6% for 5s (self)",
      "disposition": "GAP",
      "assertion": "it.skip — the immortal partless v1 boss emits no kill events and the schema has no on-kill trigger primitive; there is no active vs inactive case to exercise, so any assertion would be vacuous."
    },
    {
      "slot": "skill2",
      "kitLine": "FB-enter: Burst CD ▼2.34/2.7/3.17s allies",
      "disposition": "FAITHFUL",
      "assertion": "Proves burstCdr is live: base Full-Burst count >= count with CDR zeroed (invariant CDR can only add/keep FBs). Nearest-wrong (CDR dropped/zeroed) fires FEWER FBs when the rotation is cooldown-bound. Escalating magnitude itself is not cleanly event-observable (directional test only)."
    },
    {
      "slot": "skill2",
      "kitLine": "burst-cast: Crit DMG ▲10.77/12.46/14.42% 5s",
      "disposition": "FAITHFUL",
      "assertion": "critDamagePct buffApply events show >=2 distinct magnitudes incl. 10.77 (escalation); flat-10.77 non-escalating nearest-wrong collapses to 1 magnitude → RED. Zeroing critDamagePct removes the buff + lowers team total (GREEN vs a crit-RATE mis-encoding, which would be inert on this channel). Trigger identity burstCast-vs-fullBurstEnter is NOT discriminated (volume sole B1)."
    },
    {
      "slot": "burst",
      "kitLine": "Crit Rate ▲31.9% for 5s (all allies)",
      "disposition": "FAITHFUL",
      "assertion": "critRatePct buffApply ≈31.9 on >=2 ally targets, constant (not escalating). Zeroing drops team total and is inert on critDamagePct — fails under the SCOPE nearest-wrong that encodes crit-rate as crit-damage, or the target nearest-wrong that scopes it self-only (single target)."
    }
  ],
  "fixtures": "controlComp('volume') (helm=true) — liter(B1)/crown(B2)/helm(B3) supply a completable burst chain with volume as focus. Deterministic, no seed. CAVEAT: volume is Burst I and competes with liter's B1 slot; the whole skill2b/burst analysis requires volume to actually cast, so a fixture-sanity `it` and a per-assertion non-vacuity guard (critDamagePct buffApply > 0) make the file fail loudly if she never bursts rather than pass silently. Counterfactuals via withPatchedOverride re-clone from committed JSON so patches never stack (base + 3 patched runs = 4 runs, well under the ~20 cap).",
  "gaps": [
    "skill1 (it.skip): 'when killing an enemy' ATK buff — no kill events on the immortal partless v1 boss and no on-kill trigger primitive in the schema; unmodelable/inert in v1.",
    "skill2b trigger identity: burstCast vs fullBurstEnter is indistinguishable on this fixture because volume is the sole B1 and therefore bursts on every Full Burst (the two triggers coincide). A second B1 in the comp would be needed to discriminate — not exercised here; only magnitude/escalation is tested.",
    "skill2a burst-CDR magnitude/escalation: burstCdr does not emit a buffApply, so the escalating tuple [2.34,2.7,3.17] and its per-entry growth cannot be read directly; only the directional Full-Burst-count invariant (base >= zeroed) is asserted, and equality (gauge-bound rotation) is reported as a finding, not a failure."
  ],
  "model": "claude-opus-4-8"
}

### 5b. CONVERGENCE — S5 blind tests run against the driver's shipped override
The blind test as written had TWO mechanical artifacts of blindness (it never saw the override or the repo's
test conventions): (a) it omitted the `import { describe, expect, it } from 'vitest'` line (the repo's
vitest.config.ts has no `globals: true`); (b) its counterfactual helpers iterated `ov.blocks`, but the real
OverrideFile uses `skill1`/`skill2`/`burst` slot arrays. With ONLY those two mechanical corrections applied
(assertions UNCHANGED), run vs the driver's shipped override:
**Result: 4 passed / 2 failed / 1 skipped (7 total).**
- PASSED (the 4 load-bearing assertions): fixture sanity (FB>0 AND volume casts — critDamagePct buffApply>0);
  skill2b escalation (critDamagePct shows >=2 distinct magnitudes incl. 10.77 — the escalating ladder); burst
  critRate (critRatePct ≈31.9, constant, on >=2 ally targets); skill2a CDR directional invariant (FB count base
  >= FB count with CDR zeroed).
- SKIPPED: skill1 on-kill ATK (it.skip — no kill events on the immortal boss, no on-kill trigger primitive) —
  CONVERGES on the driver's UNMODELED disposition.
- FAILED ×2 (classify): both are the blind's "zeroing removes the buff" counterfactuals — `zeroStat` sets the
  buff `value = 0` but the assertion expects the buffApply count to be 0 (absent). A 0-value buff STILL emits a
  buffApply event (stat unchanged, value 0), so the count is 20, not 0 → the assertion fails on the blind's OWN
  mechanics (value-0 ≠ buff-absent), NOT on the driver's encoding. The companion assertion the blind cared about
  (zeroing lowers the team total) holds. Classify both as RECON_ERROR (blind counterfactual conflates value-0
  with absent), not a faithfulness gotcha.
- DOCUMENTED BLIND GAP: the blind used controlComp('volume') (which adds liter as a second B1) and explicitly
  documented that it CANNOT discriminate burstCast vs fullBurstEnter trigger identity there (the two coincide
  for volume). The DRIVER's sole-B1 fixture [volume/crown/helm] DOES discriminate it by count (burstCast 10×/
  target vs fullBurstEnter 5×/target) — the driver test is strictly more discriminating on trigger identity.

## 6. S6 blind post-op override-writer (claude-opus-4-8, cross-family) — leakDetected null (override + audit + flags)
{
  "slug": "volume",
  "leakDetected": null,
  "override": {
    "slug": "volume",
    "skill1": [],
    "skill2": [
      {
        "slot": "skill2",
        "trigger": {
          "kind": "fullBurstEnter"
        },
        "target": {
          "kind": "allies"
        },
        "effects": [
          {
            "kind": "escalating",
            "steps": [
              {
                "kind": "burstCdr",
                "seconds": 2.34
              },
              {
                "kind": "burstCdr",
                "seconds": 2.7
              },
              {
                "kind": "burstCdr",
                "seconds": 3.17
              }
            ]
          }
        ]
      },
      {
        "slot": "skill2",
        "trigger": {
          "kind": "burstCast"
        },
        "target": {
          "kind": "allies"
        },
        "effects": [
          {
            "kind": "escalating",
            "steps": [
              {
                "kind": "buff",
                "stat": "critDamagePct",
                "value": 10.77,
                "durationSec": 5
              },
              {
                "kind": "buff",
                "stat": "critDamagePct",
                "value": 12.46,
                "durationSec": 5
              },
              {
                "kind": "buff",
                "stat": "critDamagePct",
                "value": 14.42,
                "durationSec": 5
              }
            ]
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
            "stat": "critRatePct",
            "value": 31.9,
            "durationSec": 5
          }
        ]
      }
    ],
    "unmodeled": {
      "skill1": [
        "Affects self when killing an enemy. ATK ▲ 12.6% for 5 sec. — kill-triggered; raid boss is immortal and the scope-lock fight has no adds, so it never fires. No 'kill' trigger primitive exists in TriggerDef; modeled as inert rather than fabricating a proxy cadence."
      ],
      "skill2": [],
      "burst": []
    },
    "caveats": [
      "⛑ skill1 (ATK ▲12.6%/5s on kill) is INERT in the solo-raid sim (immortal boss, no adds) — zero board impact. Left out of blocks; recorded verbatim in unmodeled. Only matters in a hypothetical add-spawning fight.",
      "Both skill2 branches use `escalating` per the kit's literal 'Each subsequent effect triggers all effects before it' — the Nth activation applies steps 1..N CUMULATIVELY (not tier-replacement). So the 3rd FB enter grants 2.34+2.7+3.17=8.21s Burst-CD reduction, and the 3rd own-burst cast grants 10.77+12.46+14.42=37.65% Crit DMG. If a real fight shows tier-REPLACEMENT instead, swap escalating for a per-count magnitude — measure before trusting.",
      "TRIGGER SPLIT is deliberate: skill2a 'entering Full Burst' = fullBurstEnter (fires on ANY team FB); skill2b 'using Burst Skill' = burstCast (fires only on rotations Volume herself bursts). As a B1 she typically bursts every rotation, so in graded comps the two co-fire, but the primitives differ.",
      "burst Crit Rate 31.9%/5s targets {allies} (includes self). It is a stat buff (not damage), so noFb/range/core exemptions are irrelevant."
    ],
    "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⛑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Volume is a pure buff-support SMG/Wind/B1 with NO damage riders, weapon swaps, stacks, DoTs, or Hit-Rate lines — so no cadence tuple / split-vs-merge / noFb flags apply (her only damage is base normal-attack fire the engine handles). The only judgment calls are: (1) skill1's kill-trigger is inert in the immortal-boss raid sim (dropped to unmodeled, no fabricated proxy); (2) both skill2 branches read as CUMULATIVE `escalating` per the explicit 'each subsequent effect triggers all effects before it' clause; (3) skill2a keys fullBurstEnter vs skill2b keys burstCast — they diverge in multi-B1 comps. All magnitudes are kit-literal; none invented."
  },
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Kill: ATK ▲12.6% for 5 sec",
      "status": "SKIPPED",
      "effectOrReason": "Kill trigger; immortal boss + no adds = never fires. No 'kill' TriggerDef primitive. → unmodeled.skill1 (verbatim)."
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter (all allies): escalating hdr",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter, target allies, effects[escalating]."
    },
    {
      "slot": "skill2",
      "kitLine": "Once: Burst CD ▼ 2.34 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "escalating step1 burstCdr 2.34."
    },
    {
      "slot": "skill2",
      "kitLine": "Twice: Burst CD ▼ 2.7 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "escalating step2 burstCdr 2.7 (cumulative)."
    },
    {
      "slot": "skill2",
      "kitLine": "Three times: Burst CD ▼ 3.17 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "escalating step3 burstCdr 3.17 (cumulative)."
    },
    {
      "slot": "skill2",
      "kitLine": "Burst use (all allies): escalating hdr",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast, target allies, effects[escalating]."
    },
    {
      "slot": "skill2",
      "kitLine": "Once: Crit DMG ▲ 10.77% 5s",
      "status": "IMPLEMENTED",
      "effectOrReason": "escalating step1 buff critDamagePct 10.77 durSec 5."
    },
    {
      "slot": "skill2",
      "kitLine": "Twice: Crit DMG ▲ 12.46% 5s",
      "status": "IMPLEMENTED",
      "effectOrReason": "escalating step2 buff critDamagePct 12.46 durSec 5 (cumulative)."
    },
    {
      "slot": "skill2",
      "kitLine": "Three times: Crit DMG ▲ 14.42% 5s",
      "status": "IMPLEMENTED",
      "effectOrReason": "escalating step3 buff critDamagePct 14.42 durSec 5 (cumulative)."
    },
    {
      "slot": "burst",
      "kitLine": "All allies: Crit Rate ▲ 31.9% 5s",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast, target allies, buff critRatePct 31.9 durSec 5."
    }
  ],
  "flags": [
    {
      "field": "override.skill1",
      "estimate": "inert (0 buff/damage in the solo-raid sim)",
      "reasoning": "'Affects self when killing an enemy' — the scope-lock raid boss is immortal and the fight has no adds, so a kill never occurs. There is no 'kill' TriggerDef primitive to key it to. Guessing a proxy trigger/cadence would fabricate uptime the unit never earns, so the faithful call is to leave skill1 empty and record the line verbatim in unmodeled.",
      "recipe": "If an add-spawning / killable-target fight is ever modeled, add an on-kill trigger and apply buff atkPct 12.6 durationSec 5 target self; otherwise it stays inert."
    },
    {
      "field": "override.skill2 (both escalating blocks)",
      "estimate": "CUMULATIVE escalating (Nth activation = sum of tiers 1..N)",
      "reasoning": "Kit states 'Each subsequent effect triggers all effects before it', which maps 1:1 to the `escalating` primitive (Nth activation applies steps 1..N). Alternative reading = tier-REPLACEMENT (Nth activation applies ONLY tier N). The literal clause favors cumulative, but I cannot verify which the engine/game actually does without a fight.",
      "recipe": "Watch a graded fight where Volume enters FB ≥3 times: measure total Burst-CD shaved per FB (cumulative → ~8.21s on the 3rd, replacement → 3.17s) and Crit DMG applied on her 3rd burst cast (cumulative → 37.65%, replacement → 14.42%). Swap escalating for per-count magnitudes if replacement is observed."
    }
  ],
  "model": "claude-opus-4-8"
}

## 7. Driver's test (scripts/tests/units/volume.test.ts) — the gate (12 tests, all GREEN vs shipped)
// PER-UNIT KIT SPEC — `volume` (Volume, Attacker/SMG/Wind, Burst I, cd 20s, ammo 120, hitsPerShot 1).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b fable).
//
// One assertion group per KIT LINE (V1..V4), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.volume.skills):
//   S1 ■ Affects self when killing an enemy: ATK ▲12.6% for 5 sec                  (UNMODELED)  [V1]
//   S2 ■ entering Full Burst → all allies: Cooldown of Burst Skill ▼ 2.34 / 2.7 / 3.17 sec      [V2]
//         (escalating — "Each subsequent effect triggers all effects before it")
//      ■ using Burst Skill → all allies: Critical Damage ▲ 10.77 / 12.46 / 14.42% for 5 sec     [V3]
//         (escalating — same "triggers all before it" ladder)
//   BU ■ Affects all allies: Critical Rate ▲31.9% for 5 sec                                      [V4]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   V1  "when killing an enemy" is KILL-GATED — the scope-lock partless raid boss NEVER dies mid-fight,
//       so the trigger can never fire and the line is a sanctioned UNMODELED skip (not a passive ATK the
//       kit never grants). PIN the absence: ZERO atkPct buffApply from Volume in the base run. Nearest-wrong:
//       the pre-gauntlet materialized misread — a PASSIVE permanent self atkPct 12.6 (a +12.6% ATK the kit
//       does not give vs an immortal boss). GREEN vs shipped (skill1 empty → 0 buffs), RED vs the passive
//       counterfactual (1 permanent self buff) — so the absence is a real, non-vacuous claim.
//   V2  "Cooldown of Burst Skill ▼" is a `burstCdr` effect (sim.ts:2047) — it directly refunds ally burst
//       cooldown frames and emits NO buffApply event, so it is observable only through its EFFECT: the team
//       (Volume is an ally target of her own CDR) bursts SOONER. fullBurstEnter trigger (fires on every TEAM
//       FB entry = 5×) vs nearest-wrong burstCast (fires on Volume's OWN 10 casts). Two discriminations:
//       (a) FIRE-RATE / modeled≠working — removing the block drops Volume's own cast count (10 → 9): the block
//           is present AND working, not an inert encoding. (b) TRIGGER IDENTITY — re-keying it to burstCast
//           over-applies the refund (10 activations vs 5) and over-accelerates her cadence (10 → 13 casts):
//           the cadence under fullBurstEnter is provably distinct from burstCast. The escalating ladder
//           (2.34 → +2.7 → +3.17, "triggers all before it") is the engine's `escalating` case (sim.ts:2056,
//           steps.slice(0, activations)); the per-tier refund magnitude is a CDR value taken from the prose's
//           own numbers (DATAMINED) — the fire-rate check proves the block activates and targets allies.
//   V3  burstCast → allies → ESCALATING critDamagePct [10.77, 12.46, 14.42], 5s. The escalating semantics are
//       exact and observable: step i applies from the (i+1)th activation, so per target the counts are
//       casts / casts-1 / casts-2 (10 / 9 / 8 here) — "each subsequent effect triggers all before it", each
//       step a DISTINCT buff key (sim.ts:2056 `${key}:sN`) so from the 3rd cast all three coexist and SUM
//       (+37.65% team crit damage), no overwrite. Nearest-wrong (a): a NON-escalating "always max" encoding
//       (single 14.42 buff) — then 10.77/12.46 never appear and 14.42 fires every cast. Nearest-wrong (b):
//       fullBurstEnter trigger (5×/target) instead of burstCast (10×/target). Both discriminated.
//   V4  burstCast → allies → generic critRatePct 31.9, 5s. Plain "Critical Rate ▲" = generic critRatePct
//       (lifts crit on EVERY bucket), NOT the scoped critRateNormalPct. Nearest-wrong (a): fullBurstEnter
//       trigger (5×/target) instead of burstCast (10×/target). Nearest-wrong (b): scoped critRateNormalPct —
//       leaves the team's skill/burst bucket crit rates UNCHANGED while the generic model lifts them. Both
//       discriminated; the buff also never lands on the boss (ally buff, targetIdx != null).
//
// Fixture: Volume is Burst I, so a custom sole-B1 comp [volume(B1) / crown(B2) / helm(B3)] is used (NOT
// controlComp, which would add liter as a second B1). Volume is the sole Burst I → she casts every Full Burst
// cycle (10 casts over 180s) while the team completes 5 Full Bursts — so burstCast (10) ≠ fullBurstEnter (5),
// which is what lets the trigger-identity assertions discriminate by count. Boss Iron (Volume is Wind → clean
// ×1.10 advantaged; crown/helm neutral — irrelevant, every assertion filters on casterIdx === VOLUME). Focus
// Volume. Deterministic (no seed). Slot order: volume 0 / crown 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const VOL = 0;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIXTURE = {
  slugs: ['volume', 'crown', 'helm'] as string[],
  bossElement: 'Iron' as const,
  focusSlug: 'volume',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...FIXTURE, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const volBuffs = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter((b) => b.casterIdx === VOL && b.stat === stat && b.value === value);
const perTarget = (bs: BuffApply[], tgt: number) => bs.filter((b) => b.targetIdx === tgt);
const volBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'volume');
const fbStarts = (evs: SimEvent[]) => evs.filter((e) => e.kind === 'fullBurstStart');

/** Distinct crit rates seen per unit on the given buckets — the V4 scope discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][],
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of evs.filter((e): e is Damage => e.kind === 'damage')) {
    if (!buckets.includes(d.bucket)) continue;
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')]),
  );
}

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** V1 nearest-wrong: the kill-gated ATK as a PASSIVE permanent self atkPct 12.6 (the pre-gauntlet misread). */
const cfS1Passive = withPatchedOverride('volume', (ov: any) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 12.6 }],
    },
  ];
});
/** The skill2 fullBurstEnter escalating-burstCdr block (V2 under test). */
const isCdrBlock = (b: any) =>
  b.trigger?.kind === 'fullBurstEnter' &&
  b.effects?.some(
    (e: any) => e.kind === 'escalating' && e.steps?.some((s: any) => s.kind === 'burstCdr'),
  );
/** V2 nearest-wrong (fire-rate): the burstCdr block removed entirely (an inert/absent encoding). */
const cfNoCdr = withPatchedOverride('volume', (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isCdrBlock(b));
  if (ov.skill2.length === before)
    throw new Error('volume S2 burstCdr block missing — fixture is stale');
});
/** V2 nearest-wrong (trigger): the burstCdr block re-keyed fullBurstEnter → burstCast (over-applies the refund). */
const cfCdrBurstCast = withPatchedOverride('volume', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) if (isCdrBlock(b)) (b.trigger = { kind: 'burstCast' }), hit++;
  if (!hit) throw new Error('volume S2 burstCdr block missing — fixture is stale');
});
/** The skill2 burstCast escalating-critDamage block (V3 under test). */
const isCdBlock = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects?.some(
    (e: any) => e.kind === 'escalating' && e.steps?.some((s: any) => s.stat === 'critDamagePct'),
  );
/** V3 nearest-wrong (trigger): the critDamage ladder re-keyed burstCast → fullBurstEnter (5×/target not 10×). */
const cfCdFbEnter = withPatchedOverride('volume', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) if (isCdBlock(b)) (b.trigger = { kind: 'fullBurstEnter' }), hit++;
  if (!hit) throw new Error('volume S2 critDamage block missing — fixture is stale');
});
/** V3 nearest-wrong (escalating): the ladder collapsed to a single "always max" 14.42% buff. */
const cfCdNoEscalate = withPatchedOverride('volume', (ov: any) => {
  const b = ov.skill2.find((x: any) => isCdBlock(x));
  if (!b) throw new Error('volume S2 critDamage block missing — fixture is stale');
  b.effects = [{ kind: 'buff', stat: 'critDamagePct', value: 14.42, durationSec: 5 }];
});
/** V4 nearest-wrong (trigger): the burst critRate re-keyed burstCast → fullBurstEnter (5×/target not 10×). */
const cfCrFbEnter = withPatchedOverride('volume', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some((e: any) => e.stat === 'critRatePct' && e.value === 31.9),
  );
  if (!b) throw new Error('volume burst critRate block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
/** V4 nearest-wrong (scope): the 31.9% crit as scoped critRateNormalPct (normal attacks only). */
const cfCrScoped = withPatchedOverride('volume', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some((e: any) => e.stat === 'critRatePct' && e.value === 31.9),
  );
  if (!b) throw new Error('volume burst critRate block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'critRatePct' && e.value === 31.9).stat =
    'critRateNormalPct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Passive = run({ volume: cfS1Passive });
const noCdr = run({ volume: cfNoCdr });
const cdrBurstCast = run({ volume: cfCdrBurstCast });
const cdFbEnter = run({ volume: cfCdFbEnter });
const cdNoEscalate = run({ volume: cfCdNoEscalate });
const crFbEnter = run({ volume: cfCrFbEnter });
const crScoped = run({ volume: cfCrScoped });

const casts = volBursts(base.events).length; // Volume's burst casts (10)
const fbs = fbStarts(base.events).length; // team Full Bursts (5)

describe('volume — kit spec', () => {
  describe('fixture sanity — Volume casts her burst and the team reaches Full Burst', () => {
    it('Volume casts >0 bursts and the team completes >0 Full Bursts (burst-gated lines are not vacuous)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B1 comp: Volume casts every cycle, so she casts at least as often as the team FBs
      expect(casts).toBeGreaterThanOrEqual(fbs);
    });
  });

  describe('V1 — S1 kill-gated ATK ▲12.6% is UNMODELED (the boss never dies; no self ATK buff ever fires)', () => {
    it('PIN: Volume applies ZERO atkPct buffs (the kill-gated line can never fire vs the partless boss)', () => {
      expect(volBuffs(base.events, 'atkPct', 12.6).length).toBe(0);
      // no atkPct buff of ANY value from Volume — her kit grants no ATK against an immortal boss
      expect(buffs(base.events).filter((b) => b.casterIdx === VOL && b.stat === 'atkPct').length).toBe(0);
    });
    it('DISCRIMINATING: a passive permanent self ATK 12.6 (nearest-wrong) WOULD apply a buff', () => {
      const cf = volBuffs(s1Passive.events, 'atkPct', 12.6);
      expect(cf.length).toBeGreaterThan(0);
      // the misread is a PERMANENT self buff (no expiry) on Volume herself (targetIdx 0)
      expect([...new Set(cf.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(cf.map((b) => b.targetIdx))]).toEqual([VOL]);
    });
  });

  describe('V2 — S2 FB-enter Cooldown of Burst Skill ▼ 2.34/2.7/3.17 sec (escalating burstCdr), all allies', () => {
    it('FIRE-RATE: the burstCdr block is present AND working — removing it slows Volume\'s own burst cadence', () => {
      // burstCdr emits no event; observe its effect: Volume is an ally target of her own CDR, so with the
      // block she casts more often over 180s than without it (deterministic: 10 vs 9).
      expect(volBursts(base.events).length).toBeGreaterThan(volBursts(noCdr.events).length);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (5 activations) ≠ burstCast (10) — burstCast over-accelerates', () => {
      // re-keying the refund to burstCast applies it twice as often → strictly more Volume casts than the
      // faithful fullBurstEnter keying, so the two triggers are provably distinct.
      expect(volBursts(cdrBurstCast.events).length).toBeGreaterThan(volBursts(base.events).length);
      expect(volBursts(cdrBurstCast.events).length).not.toBe(volBursts(base.events).length);
    });
  });

  describe('V3 — S2 burst-cast Critical Damage ▲ 10.77/12.46/14.42% for 5 sec (escalating), all allies', () => {
    const c10 = volBuffs(base.events, 'critDamagePct', 10.77);
    const c12 = volBuffs(base.events, 'critDamagePct', 12.46);
    const c14 = volBuffs(base.events, 'critDamagePct', 14.42);
    it('escalating ladder: step i applies from the (i+1)th cast → per-target counts casts / casts-1 / casts-2', () => {
      // "Each subsequent effect triggers all effects before it": 10.77 fires every cast, 12.46 from the 2nd,
      // 14.42 from the 3rd. Exact, derived from the escalating semantics (sim.ts:2056), not hard-coded.
      expect(perTarget(c10, VOL).length).toBe(casts);
      expect(perTarget(c12, VOL).length).toBe(casts - 1);
      expect(perTarget(c14, VOL).length).toBe(casts - 2);
    });
    it('each step is a distinct 5-second buff reaching all three allies (they coexist + sum, no overwrite)', () => {
      for (const c of [c10, c12, c14]) {
        expect(c.length).toBeGreaterThan(0);
        expect([...new Set(c.map((b) => b.expiresFrame! - b.frame))]).toEqual([5 * FPS]);
        for (const tgt of [0, 1, 2]) expect(perTarget(c, tgt).length).toBeGreaterThan(0);
      }
      // distinct buff keys → the three steps stack rather than overwrite one another
      expect(new Set([...c10, ...c12, ...c14].map((b) => b.key)).size).toBe(3);
    });
    it('DISCRIMINATING (escalating): a non-escalating "always max 14.42" encoding drops the 10.77/12.46 steps', () => {
      expect(volBuffs(cdNoEscalate.events, 'critDamagePct', 10.77).length).toBe(0);
      expect(volBuffs(cdNoEscalate.events, 'critDamagePct', 12.46).length).toBe(0);
      // …and fires 14.42 on EVERY cast (no ramp), unlike the faithful 8×/target
      expect(perTarget(volBuffs(cdNoEscalate.events, 'critDamagePct', 14.42), VOL).length).toBe(casts);
    });
    it('DISCRIMINATING (trigger): keyed to burstCast (casts/target), NOT fullBurstEnter (fbs/target)', () => {
      expect(perTarget(volBuffs(cdFbEnter.events, 'critDamagePct', 10.77), VOL).length).toBe(fbs);
      expect(perTarget(volBuffs(cdFbEnter.events, 'critDamagePct', 10.77), VOL).length).not.toBe(casts);
    });
  });

  describe('V4 — burst Critical Rate ▲31.9% for 5 sec is GENERIC (unscoped), all allies, on BURST CAST', () => {
    const applied = volBuffs(base.events, 'critRatePct', 31.9);
    it('is the generic critRatePct stat, 5s, once per Volume burst cast, reaching all three allies (never the boss)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual(['critRatePct']);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([5 * FPS]);
      expect(perTarget(applied, VOL).length).toBe(casts);
      for (const tgt of [0, 1, 2]) expect(perTarget(applied, tgt).length).toBe(casts);
      // ally buff, never a boss debuff
      expect(applied.every((b) => b.targetIdx != null)).toBe(true);
    });
    it('DISCRIMINATING (trigger): keyed to burstCast (casts/target), NOT fullBurstEnter (fbs/target)', () => {
      expect(perTarget(volBuffs(crFbEnter.events, 'critRatePct', 31.9), VOL).length).toBe(fbs);
      expect(perTarget(volBuffs(crFbEnter.events, 'critRatePct', 31.9), VOL).length).not.toBe(casts);
    });
    it('DISCRIMINATING (scope): a scoped critRateNormalPct would leave skill/burst bucket crit UNCHANGED', () => {
      expect(critRatesByUnit(base.events, ['skill', 'burst'])).not.toEqual(
        critRatesByUnit(crScoped.events, ['skill', 'burst']),
      );
      expect(volBuffs(crScoped.events, 'critRatePct', 31.9).length).toBe(0);
    });
  });
});

## 8. S2d independent verification matrix (driver) — gate PASSES
Every FAITHFUL pin GREEN vs the shipped override AND RED under its named nearest-wrong counterfactual (no test
green-under-both → none vacuous). Fixture [volume(B1)/crown(B2)/helm(B3)], boss Iron, deterministic; base run
Volume casts=10, team FB=5.
- V1 kill-gated ATK UNMODELED: shipped atkPct-from-volume=0 (GREEN); nearest-wrong passive permanent self
  atkPct 12.6 = 1 buff (RED). Absence actively pinned, not a silent drop, not an it.skip.
- V2 burstCdr FIRE-RATE: base Volume casts 10 > no-block 9 (the refund accelerates her own cadence; GREEN);
  block absent → 9>9 false (RED). burstCdr emits no event (sim.ts:2047) so this is the modeled≠working check.
- V2 burstCdr TRIGGER: burstCast-trigger counterfactual casts 13 > base 10 (burstCast over-applies the 5-activation
  refund; fullBurstEnter ≠ burstCast, RED).
- V3 critDamage ESCALATING: per-target counts 10.77=10(=casts), 12.46=9(=casts-1), 14.42=8(=casts-2) — the exact
  escalating ladder (GREEN); always-max counterfactual → 10.77=0, 14.42=10 (RED).
- V3 critDamage TRIGGER: base 10.77/tgt=10(=casts) (GREEN); fullBurstEnter counterfactual =5(=fbs) (RED).
- V4 critRate GENERIC+burstCast: critRatePct 31.9/tgt=10(=casts), 5s, all 3 allies, never the boss (GREEN);
  fullBurstEnter counterfactual =5(=fbs) (RED).
- V4 critRate SCOPE: generic critRatePct 31.9 total=30 lifts skill/burst bucket crit (GREEN); scoped
  critRateNormalPct counterfactual → critRatePct=0 / critRateNormalPct=30, skill/burst crit unchanged (RED).

Now grade per the RECONCILING-JUDGE method (A convergence mechanical; B per-line classify; C fire-rate check;
D discrimination; E cross-check blind agents; F magnitude scope) and return ONLY the verdict JSON.

## 9. ⚑ flags the driver recorded (estimate + recipe + tier)
(1) cadence tuple (pullsPerSec / reloadFrames / rolling-reload) — fire rate/reload unmeasured; engine SMG class
default shipped, datamine rate_of_fire 1440rpm = 24/s (game-source authoritative); datamine reload_time 150 (~90f)
vs synced reloadFrames 111 and reload_start_ammo 119 (possible rolling/partial-reload tell) open on video; recipe =
focused solo scope-lock video, count rounds/10s + mag-empty→first-shot gap, watch for partial refill while firing
(CALIBRATED ⚑). No other ALWAYS-⚑ field applies: Volume has no damage riders, no weapon swap, no stacks-with-ramp,
no DoT, no Hit-Rate line, no HP-scaler, no multi-projectile (hitsPerShot 1) — her only personal damage is plain SMG
fire the engine handles. skill1's kill-trigger is documented UNMODELED (not a ⚑ estimate — a sanctioned skip).

## 10. Verdict instructions
Return ONLY the JSON per the RECONCILING-JUDGE.md contract:
{slug, kitDescription, convergence:{s5TestsVsDriverOverride, redAssertions[]}, lineFindings:{skill1[],skill2[],burst[]},
gotchas[], discriminationOk, faithfulnessScore, verdict (GO|NO-GO(faithfulness)|NO-GO(engine-core)), verdictRationale, model}.
GO requires: every kit line accounted for (FAITHFUL or documented UNMODELED/GAP/⚑, no silent drops; audit SKIPPED ↔
unmodeled 1:1); no REAL-GOTCHA; the S5 blind tests run green vs the driver's override (convergence) — classify any RED;
every ⚑ has estimate+recipe+tier; the tests discriminate (S2d matrix); the fire-rate check passes (each FAITHFUL block
fires at its prose-implied cadence over 180s). The verdict is BINDING.
