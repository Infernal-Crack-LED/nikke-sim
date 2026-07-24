# kit-autonomy — decisions & methodology log

> Living doc for the **autonomous kit-faithfulness gauntlet** session (started 2026-07-23).
> Records scope, the hardening insight, the workflow design, every decision (append-only), and the
> live-run trace. Companion artifact: the `.claude/skills/kit-autonomy/` orchestration skill.
>
> **Path note:** the request named `doc/kit-autonomy-decisions.md`; this repo's convention is `docs/`
> (home of `DECISIONS.md`), so the doc lives at `docs/kit-autonomy-decisions.md`. Say the word to move it.
>
> **Worktree:** `.qwen/worktrees/kit-autonomy` · **branch:** `worktree-kit-autonomy` (off `main`).

---

## 1. Scope (locked with owner 2026-07-23)

| Question      | Decision                                                                                                                                                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deliverable   | **Plan + live run** — write the hardened methodology AND execute the full 7-step gauntlet end-to-end on one real unit, committing artifacts as we go.                                                                                                                                                    |
| Live target   | **Moderate, well-understood unit** with a shipped override + 1-2 non-trivial mechanics; driver proposes the slug (see §6).                                                                                                                                                                               |
| Artifact form | **Skill + doc**, reusing `scripts/blind-rebuild/` machinery + `scripts/tests/lib/harness.ts` (no rebuild).                                                                                                                                                                                               |
| No-go policy  | **Bounded loop, then escalate** — on a step-7 no-go, fix + re-run the gauntlet up to **2 retries**; if still no-go, or an irreversible/engine-core decision arises, pause and ping the owner via the `autonomous_session_webhook` in `.env`. **Faithfulness blocks are never overridden by the driver.** |

Owner also granted, for this exercise only: editing `src/skills/overrides/<slug>.json` and `src/engine/**`
**on the worktree branch only** (never `main`). Engine edits follow the isolated-worktree +
`/scientific-method` step-7 discipline from `kit-tdd` before any merge-back.

## 2. The central hardening insight (the trap to avoid)

`docs/handoffs/2026-07-23-tdd-transition-plan.md` (today's plan-of-record) **demoted** audit-kit /
blind-rebuild from the build path to _post-validation sampling_, for a precise reason:

> they "generate and check at the **same altitude (prose → JSON)**, so a plausible-but-wrong reading
> survives both."

The thing that actually gates faithfulness is the **unit test**, because writing it is a forcing
function: `expect(buff active on rounds 1..10 spanning the reload, gone on round 11)` is **unwritable
from a vague reading** of the kit. The board gates _fit_; nothing automated gates _faithfulness_ except
tests, which are stat-independent and footage-independent.

**Consequence for this design:** an autonomous gauntlet that triangulates prose→JSON agents (blind
rebuild + sighted review + judge) **cannot by itself catch a plausible misread** — the author and the
blind rebuilder are both reading the same prose at the same altitude. The autonomous substitute for the
owner-driven line-by-line spec must therefore be **independent re-derivation of the discriminating
assertions from the prose** (the requested steps 2 and 5: write tests first; a blind agent re-writes
tests from the prose alone). If two independent agents, given only the kit text, both converge on
`expect(gone on round 11)`, that is strong evidence the reading is _forced by the text_ rather than a
plausible misread. The blind/sighted/judge triangulation (steps 6–7) is then a **secondary sampler over
the code**, not the primary faithfulness gate.

So the workflow is **test-centric, not prose-triangulation-centric.** Tests are the gate; triangulation
is the audit.

## 3. The 7-step gauntlet (as requested) → mapping to existing machinery

| #   | Requested step                                                                                                              | Existing machinery reused                                                                                                                                                                                         | Faithfulness role                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Read the `characters.json` entry                                                                                            | `data/characters.json` → `characters.<slug>` (blablalink prose = SSOT); `scripts/lint-slug-disambiguation.ts` for the P0 slug gate                                                                                | Establish ground truth + exact slug                                                                             |
| 2   | Write unit tests FIRST; independent reviewer reviews the tests for kit faithfulness; green-light                            | `scripts/tests/units/<slug>.test.ts` via `scripts/tests/lib/harness.ts` (`controlComp`, `runComp`, `cfg.onEvent`); test-reviewer subagent applies the `kit-tdd` disposition vocabulary + the 4 per-line questions | **Primary gate** — tests written RED against the shipped override; must discriminate vs the nearest-wrong model |
| 3   | Create the override (100% faithful, no fudging)                                                                             | `src/skills/overrides/<slug>.json` (`OverrideFile` schema); `kit-parse` hard rules + ALWAYS-⚑ taxonomy; `validate-overrides.ts`                                                                                   | Faithful encoding; measured>fudge; ⚑ anything outside the input domain                                          |
| 4   | Implement engine updates for faithfulness                                                                                   | `src/engine/**` via isolated worktree + `/scientific-method` step-7; `cfg.onEvent` payload follow-ups if a spec needs a new event                                                                                 | Only when a primitive is genuinely missing (a GAP); never to simplify the kit                                   |
| 5   | Blind post-op reviewer writes its OWN unit tests from `characters.json`                                                     | blind test-writer subagent (sees prose + harness + schema only; NOT the driver's tests/override/reasoning)                                                                                                        | **Independent re-derivation** — convergence with step-2 tests is the faithfulness signal                        |
| 6   | Blind post-op reviewer writes an override from `characters.json`                                                            | `kit-parse` skill in BLIND-STUDY mode (sees prose + methodology only)                                                                                                                                             | Second independent prose→JSON read; diff vs driver's override surfaces encoding divergence                      |
| 7   | Reconciling judge: sees `characters.json` + pre-op review + both post-op reviews + driver's implementation → final go/no-go | `audit-kit` RECONCILE pattern + damage-formula SSOT (`docs/data/damage-calculation.md`)                                                                                                                           | Classifies every divergence: faithful / documented gap / real gotcha; **go/no-go is binding**                   |

**Blindness is load-bearing** (from `audit-kit`): the step-5 and step-6 agents must be separate subagents
that never see the driver's tests, override, or reasoning, or the gauntlet degrades to the same-altitude
trap of §2. `build-packet.ts`'s leak assertion is the model for what "blind" must guarantee.

## 4. No-go / escalation policy

- Step-7 judge returns one of: **GO** · **NO-GO (faithfulness)** · **NO-GO (engine-core/irreversible)**.
- On **NO-GO (faithfulness)**: the driver fixes the specific cited divergence and re-runs from the
  earliest affected step (test or override). **Bound: 2 retries.** The driver may NOT weaken an assertion
  or re-introduce an unfaithful encoding to reach GO (the kit-tdd anti-pattern).
- After 2 failed retries, OR on **NO-GO (engine-core/irreversible)**: **stop and escalate** via the
  `autonomous_session_webhook` (`.env`), with the judge's cited divergences + the driver's recommendation.
- A clean GO from the gauntlet is **evidence against idiosyncratic error + a forcing-function check that
  every line was read precisely — NOT proof of faithfulness** (the same-model limit, §14.1: systematic
  shared-prior errors can survive a clean GO and require a different model or the owner). Value-claim
  downgraded per the red-team review (D9); §14 is authoritative.

## 5. Lessons learned (to harden into the workflow)

_Synthesized by the main agent from the four skills (`kit-tdd`/`kit-parse`/`audit-kit`/`tuning-priors`),
the TDD transition plan, `docs/CONVENTIONS.md`, and `docs/modeling-priors.md` (the docs-survey subagent
died with `LOOP_DETECTED`, D6)._

### 5.1 Evidence tiers — how every claim/assertion/value is graded (`CONVENTIONS.md`)

`MEASURED > DATAMINED > COMMUNITY > CALIBRATED ⚑`. A claim's tier determines what it takes to change it;
`CALIBRATED ⚑` values are standing refit candidates (listed in `open-questions.md`). **The gauntlet must
tag each assertion and each override value with its tier.** **Ratio direction (do NOT conflate):** board
tools (`board-read`/`experiment`) report `sim/real` — `>1` = HOT ▲ (over-model, REMOVE damage); solo
probe-data reports `realOverSim = real/sim` (the inverse). A HOT unit read as COLD gets "fixed" by adding
damage and worsens (boolean-inversion bug; the arcana/naga root case).

### 5.2 Recurring failure-mode taxonomy (class → root cause → fix/prior → example)

1. **Cadence / rate-of-fire** — the #1 cause of uniform heat; datamined `rate_of_fire` is wrong, the value
   is right and the frequency is wrong. Fix: ALWAYS ⚑ the cadence+reload tuple when authoring blind;
   escalate on text tells (low-ammo mag empties <1s at class rate; "Magnum"/"per-N-round" flavor). Jill 2.2× over-fire.
2. **Scope (normal-attacks-only vs generic)** — a generic crit buff shipped for a "Critical Rate _of normal
   attacks_" line. Fix: scoped `critRateNormalPct`; assert charge/burst damage UNMOVED while normals move. (helm S1)
3. **Duration semantics (seconds vs ROUNDS vs stacks vs until-reload)** — "for 10 round(s)" faked as
   `durationSec 13`. Fix: `durationShots`; assert the round count _beats_ `durationSec` because it survives
   the reload. (helm burst)
4. **Trigger identity** (`burstCast` vs `fullBurstEnter` vs `lastBullet` vs `hitCount` vs `shotFired` vs
   `interval`) — a boolean-inversion trap; they coincide only when the unit is the sole burster of its tier.
   Fix: read the activation text literally; `burstCast` fires only on rotations THIS unit bursts. (arcana MM
   keyed to `fullBurstEnter` over-credited multi-B2 teams; **privaty** = `lastBullet` + `targetStatus` gate.)
5. **Tandem / cross-unit effects** — a heal inert alone drives a teammate's "on recovery" damage buff. Fix:
   wire the `heal` event + `recovery` trigger; never skip heal/shield/DEF/HP/lifesteal/gauge lines. (Helm
   heal → Crown ATK 20.99% near-permanent; dropping it left teams ~15% cold.)
6. **DoT encoding (append-not-refresh)** — the engine appends an independent DoT per fire and never dedups;
   a dur-60 DoT on a ~16s trigger ≈ 3.7× over. Fix: a continuous/maintained DoT = ONE `passive` instance with
   `durationSec` ≥ fight length; repeating-trigger encoding only if the kit says it genuinely STACKS. (Mihara)
7. **Weapon-state modifiers ARE damage** — reload/ammo/fire-rate/charge-speed gate shot count. Fix: model
   them (`charFixes.reloadFrames` etc.); ask "does this change shots fired?" before ever writing "defensive."
   (Grave reload-ratio dropped → ~30% over-fire.)
8. **Weapon-swap shot economy** — in-burst swap windows run fire-rate-gated, effectively reload-free, and
   instant-charge at ≥100% charge speed; the blind default under-counts 2-3× and this class DOMINATES the
   unit. ⚑ TOP, estimate optimistically. (Red Hood)
9. **HP/DEF scalers** — HP-scaling counts the unit's OWN Max HP only; ally grants don't feed the conversion.
   Keep the stat buff even where the engine treats it inert (a future consumer/scaler). (Cinderella)
10. **Hit-Rate → core-rate** — proven, magnitude unknown. Model `hitRatePct` + ⚑ the core-lift recipe; never delete.
11. **Multi-projectile split vs merge** — per-unit, video-verify. (Cinderella twins split, Maiden merge.)
12. **noFb / range / core exemptions** — function-damage riders take Full Burst by TIMING (default ON; set
    `noFb` only with measured FB-OFF evidence); the +30% range bonus is UNIVERSALLY off (`noRange` is
    auto-set, redundant to write); burst-cast/instant damage is always FB-exempt; riders CRIT at caster rate
    but get NO core unless the text literally says "core strike damage" (text-fidelity). The old `noFb`
    default was a calibration relic masking cadence over-models. (privaty, Ein, Liberalio, CCW)
13. **Base-stat / gear basis** — Base 5 gear (not OL0); non-SSR units need rarity ceilings (scope lock encodes an SSR ceiling).
14. **Stack / currency → steady-state + ramp haircut** — derivable-currency: when start+consume+rebuild are
    kit-stated, DERIVE the trajectory (continuous level-scaling = time-average respecting the stated START,
    never a ramp-from-0; threshold-gated = check the PRE-consume count; sawtooth = ~cap/2). (Soda, Mihara)

### 5.3 The ALWAYS-⚑ taxonomy (`kit-parse`) — fields outside the input domain, never shipped silently

A value not literally in the kit text, OR from a known-unreliable datamine field (`rate_of_fire`,
`reloadFrames`), MUST be a ⚑ with an initial estimate + a measurement recipe. The seven: **(1)** cadence
tuple (datamine-unreliable); **(2)** a damage line the text gives NO trigger for (invented trigger+cadence —
Snow White S2 144.73%); **(3)** weapon-swap shot economy (kit-silent; estimate optimistically); **(4)**
stack/currency steady-state + ramp haircut (derive if stated); **(5)** multi-projectile split-vs-merge
(kit-silent — read popups); **(6)** `noFb` per-kit (default OFF; measured-only); **(7)** Hit-Rate→core
magnitude (measured-only). A blind parser that honestly flags what it can't know is CORRECT; one that
guesses a precise ⚑ value is WRONG.

### 5.4 Primitive census (`engine-modeling-gaps.md`, generated; blast-radius order)

`flatDamage 46 · hitsPerShot 34 · hitCount 31 · burstCdr 14 · hitRatePct 11 · …` **Backfilled WITH tests
(step-2):** flat-damage, hit-count-trigger, hits-per-shot, burst-cdr, buff-application/overwrite,
block-gates (`fbGate`/`everyN`/`requiresCore`/`bossElementGate`). **NOT yet backfilled:** `hitRatePct`,
`instantReload`/`consumeAmmo`, the trigger-kind matrix (`lastBullet`/`shotFired`/`interval`/`stageEnter`/
`fullBurstEnter`/`End`), `weaponSwap`/`swapGate`, `escalating`, `mode`/`modes`, gauge suppression.
**Event-log payload gaps:** `buffApply` can't express `perResource`/`rampFrames`/`whileSwappedIdx`; no
weapon-swap / `targetStatus` / resource / stack events; `shot` carries no hit count; cube/OL permanent
stats bypass `applyBuff`. (A spec that needs one of these extends the emit via the isolated-worktree flow.)

### 5.5 The three meta-lessons (the WHY behind the gauntlet design)

- **(a) "Modeled ≠ working" + offsetting errors.** A unit graded ~1.0 can still be wrong — its value
  calibrated to _absorb_ a missing shared buff. Run-validate that each block FIRES at the right rate; DBG can
  lie (a `DBG_N` cap hides late procs; `fillGauge` logs no line) — count the WHOLE fight and confirm the
  side-effect (gauge/damage), not just a log line. ⇒ the gauntlet's step-2 tests assert **events**, not just totals.
- **(b) The same-altitude trap** (TDD plan, §2). prose→JSON triangulation cannot catch a plausible misread;
  the unit test is the forcing function. ⇒ **test-centric** gauntlet; blind/sighted/judge triangulation is the
  secondary sampler.
- **(c) Faithful > fit, measured > fudge.** Never fabricate a value to hit a number. A board move AWAY from
  1.0 after a faithful fix is **fit-exposure** (the old wrong encoding was absorbing a calibration) — a
  separate per-unit localization thread, **never** a reason to weaken the assertion or restore the unfaithful
  encoding. ⇒ the no-go policy (§4) forbids the driver from re-adding `noFb` or shaving datamined coefficients to reach GO.

### 5.6 Open gaps the workflow must respect

- `hitRatePct` core-lift geometry has no fixture reaching the HR→core path yet.
- The gauge pipeline emits no events → gauge-suppression lines are untestable from the log (a GAP, `it.skip` + reason).
- `lastBullet` / `targetStatus` interaction gets its first pin from **privaty** in this run.
- **MEASUREMENT-GATED** lines go to `open-questions.md` UNANSWERED — never a guessed number in a test.

## 6. Target unit — `privaty` (Privaty, AR/Water/Attacker/Burst III)

**Picked 2026-07-23 (D5).** Stats: ammo 60, reloadFrames 81, hitsPerShot 1, burstCooldownSec 40,
treasure. `kit-status`: **tier MEASURED, tuned=true**, focus video (u7 @ 15.503s) + popup reads; the two
S2 rider majors were measured from first principles **today** (DECISIONS 2026-07-23, probe-runs
2026-07-23). Board readings exist (T4 1.216 / T4b 1.175 / N5 0.961, mean 1.117) for the outer A/B loop.

**Why this unit (over the alternatives):**

- _Moderate_ — AR, `hitsPerShot 1`; no SG pellets / charge / consolidation / weapon-swap machinery.
- _Well-understood_ — MEASURED + tuned with fresh owner-signed evidence (not a hypothesis).
- _Sharp discriminating + inertness assertions_ (below) across four distinct mechanics.
- _Faithful shipped override_ (`src/skills/overrides/privaty.json`, "LIVE MODEL, all three slots") with a
  **documented do-NOT-touch HOT residual** — the residual is the over-model the _removed_ `noFb`
  calibration had been hiding, NOT the encoding. Ideal for demonstrating faithful>fit (§4: the driver may
  not re-add `noFb` or shave the datamined 256.17 / 1687 / 1407.64 to reach GO).
- _Exercises fresh, not-yet-test-backfilled primitives_ — `lastBullet` trigger and the
  `targetStatus`/`requiresTargetStatus` state channel (the wipeOut→targetStatus migration landed
  2026-07-23). The gauntlet's tests are the FIRST pins for these.

**Rejected candidates:** `arcana-fortune-mate` (MODEL_ONLY/untuned, 1.88 HOT, complex SG
pellets/phase-stacks/ramp/weapon-targets, `control:false` — well-documented but not moderate/validated);
`dorothy-serendipity` (CALIBRATED but built on a bespoke `consolidation` config block outside the block
schema + an SG-spray under-model + an unresolved measurement conflict — too special-cased). **Backups:**
`ein` (VALIDATED, clean `flatDamage` crit/noRange rider), `mihara-bonding-chain` (CALIBRATED, `dot`
perResource).

### 6a. Line-by-line spec seed (dispositions per `kit-tdd`)

| #   | Slot   | Kit line (structural)                                                                 | Model                                                                                  | Disposition                                            |
| --- | ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| S1a | skill1 | FB-enter → all allies: ATK ▲23.61% 10s                                                | `atkPct 23.61`                                                                         | FAITHFUL                                               |
| S1b | skill1 | Reload Speed ▲51.16% 10s                                                              | `reloadSpeedPct 51.16`                                                                 | FAITHFUL (weapon-state, hard rule 1)                   |
| S1c | skill1 | Max Ammunition ▼50.66% 10s                                                            | `maxAmmoPct -50.66`                                                                    | FAITHFUL (tandem: raises last-bullet rate in FB)       |
| S1d | skill1 | Attack Damage ▲20.16% 10s                                                             | `attackDamagePct 20.16`                                                                | FAITHFUL                                               |
| S2a | skill2 | last bullet → enemy: Damage Taken ▲10.01% 10s + 256.17% additional (noRange), ungated | `damageTakenPct 10.01` + `flatDamage 256.17 noRange` on `lastBullet`                   | FAITHFUL (MEASURED)                                    |
| S2b | skill2 | last bullet **in Designated Target status** → enemy: 1687% additional (noRange)       | `flatDamage 1687 noRange` on `lastBullet` + `requiresTargetStatus:"Designated Target"` | FAITHFUL (MEASURED)                                    |
| B1  | burst  | self: Superior Elemental Code Attack Damage ▲130% 10s                                 | `elemAdvantageDamagePct 130` on `burstCast`                                            | FAITHFUL                                               |
| B2  | burst  | enemy: 1407.64% Burst Skill damage                                                    | `flatDamage 1407.64` on `burstCast`                                                    | FAITHFUL                                               |
| B3  | burst  | enemy: Designated Target (status, 10s) — gates S2b                                    | `targetStatus "Designated Target" 10s`                                                 | FAITHFUL                                               |
| B4  | burst  | Stuns for 3 sec                                                                       | —                                                                                      | UNMODELED (v1 boss never acts)                         |
| B5  | burst  | Designated Target: ATK ▼5.02% (status content)                                        | —                                                                                      | UNMODELED (inert; the status itself is modeled via B3) |

### 6b. Discriminating-assertion plan (each must FAIL under the nearest-wrong model)

> **⚠ Corrected by §14.6:** D3 (noRange) is reclassified to an engine-invariant SANITY CHECK (a tautology —
> the engine force-sets noRange on all riders); D4 discriminates for the **256.17 rider only** (the 1687
> rider has no out-of-FB baseline); D2 needs the **non-vacuity guard** and reconstructs its window from
> `burstCast`. Honest net: ~2.5 sharp discriminators + 1 sanity check, not "four sharp."

- **D1 — lastBullet cadence:** the 256.17% rider lands **once per magazine/reload cycle** → count of
  `lastBullet`-sourced `flatDamage` instances ≈ number of reloads. Fails under "never fires", "fires per
  shot", "fires per hit". (Event-log over totals.)
- **D2 — targetStatus gate:** the 1687% rider fires **only on last bullets inside the 10s Designated
  Target window** after her burst → assert ≥1 in-window instance AND **zero** out-of-window. Fails under
  "ungated" (fires every last bullet) and "never". This is the state-machine payload.
- **D3 — noRange inertness:** neither rider carries the +30% range major → rider damage at full range
  equals the no-range value (no +0.3 term in the multiplier decomposition).
- **D4 — FB-major-by-landing (faithful>fit):** both riders take the **+50% Full Burst major by landing
  time** → a rider landing inside FB is ×~1.5 vs one outside (measured 1.5015× for 256.17). Fails under
  the removed `noFb` encoding. **This assertion certifies the faithful model against the fit-fudge.**
- **D5 — S1 max-ammo tandem (advanced):** during FB magazines halve → last-bullet density rises; assert
  proc density is higher in-window than out.
- **Inertness:** S2 riders are enemy-targeted → teammate damage byte-identical across the ladder; burst
  nuke is one instant hit.

**Fixture:** `controlComp('privaty', true)` = liter(B1)/crown(B2)/privaty(B3)/helm(B3), boss Fire, focus
privaty — the chain completes so privaty actually casts (a lone B3 makes ZERO Full Bursts). Use
`helm=false` if helm's buffs confound a reading. **Element note:** privaty is Water vs the Fire boss —
verify elemental advantage for the B1 `elemAdvantageDamagePct` line; if inert in this comp, test B1
separately (adjust boss element). The core lastBullet/targetStatus mechanics (D1–D4) are element-independent.

### 6c. Fixture probe — empirical validation (2026-07-23, read-only sim)

Probed `controlComp('privaty', helm)` with `cfg.onEvent` (run from the main checkout, which has
`node_modules`; worktree code is byte-identical, branched off clean main). Damage events carry:
`frame, sec, slug, bucket, srcSlot, amount, atkPct, baseAtk, critEligible, coreEligible, critRate,
coreRate, inFullBurst, fbMajorApplied, rangeApplied, mult`.

| signal                       | helm=true   | helm=false |
| ---------------------------- | ----------- | ---------- |
| privaty burstCasts           | 6           | 5          |
| reloads                      | 43          | 30         |
| 256.17 riders (S2a)          | 39          | 29         |
| 1687 riders (S2b)            | 12          | 8          |
| 256.17 with `fbMajorApplied` | 27 / 39     | 8 / 29     |
| 1687 inside burst+10s window | **12 / 12** | **8 / 8**  |

**Conclusions (de-risk the test design):**

- **D1 observable:** 256.17 fires ~once per magazine (39 ≈ 43 reloads, far below the ~hundreds of shots) —
  assert count ≈ reloads and ≪ shot count; a `shotFired`/`hitCount:1` counterfactual fires far more.
- **D2 observable + sharp:** ALL 12 (resp. 8) 1687 riders fall inside a privaty burst+10s window — assert
  every 1687 is in-window AND count(1687) < count(256.17); removing `requiresTargetStatus` (counterfactual)
  fires 1687 on every last bullet (≈ the 256.17 count, many out-of-window).
- **D3 observable:** `rangeApplied` is a damage field — assert all S2 riders have `rangeApplied === false`.
- **D4 observable:** both FB populations exist (27 in-FB / 12 out-of-FB at helm=true) — assert in-FB riders
  carry `fbMajorApplied === true` (≈1.5× the out-of-FB `mult`) and a `noFb:true` counterfactual yields ZERO
  `fbMajorApplied` riders. Certifies the faithful FB-by-timing model against the removed `noFb` fudge.
- **S4 (engine) expected NO-OP for privaty:** `lastBullet`, `targetStatus`/`requiresTargetStatus`,
  `flatDamage.noRange`, and FB-by-timing all already exist AND are observable from the event log — no
  engine primitive or payload extension is needed. The gauntlet's step 4 should not fire for this unit.
- **Fixture choice:** `controlComp('privaty', true)` is primary (richer signals: 6 bursts, 27/39 in-FB
  riders for D4); `helm=false` is a sensitivity check. privaty shares the B3 slot with helm, but her own
  `burstCast` events (`slug==='privaty'`) cleanly mark her casts + Designated-Target windows.

## 7. Structural contracts (override / characters.json / harness)

**`OverrideFile`** (`src/skills/index.ts`): `{ slug?, skill1: Block[], skill2: Block[], burst: Block[],
note?, unmodeled?: { skill1: string[], skill2: string[], burst: string[] }, caveats?: string[],
kitDescription? }` — all three slots always present (empty array only for a genuinely effect-free slot);
`unmodeled` carries every skipped kit line VERBATIM. Special mechanics may add `charFixes` /
`consolidation` / `resources` (privaty uses none).

**`Block`** (`src/skills/types.ts`): `{ slot, trigger: TriggerDef, target: TargetDef, effects: EffectDef[],

- optional gates: requiresTargetStatus?, fbGate?, everyN?/everyNOffset?, requiresCore?, formation?, mode?,
  swapGate?, bossElementGate? }`. Gates run BEFORE the everyN counter.

**`TriggerDef` kinds:** `passive · burstCast(stage?) · fullBurstEnter · fullBurstEnd · hitCount(count,
countInFb?) · chargeCounter · teamAmmo(count) · shotFired · lastBullet · recovery · shielded ·
interval(sec) · stageEnter(stage) · bossElement(element) · unsupported`.

**`TargetDef` kinds:** `self · allies(excludeSelf?) · enemy · burstCasters · nonBurstCasters ·
alliesTopAtk(count,…) · alliesLowestAtk(count,…) · alliesOfElement · alliesOfClass · alliesOfWeapon ·
alliesOfElementWeapon · selfAndAdjacent · alliesLowestHp`.

**`EffectDef` kinds:** `buff(stat,value,durationSec?,durationShots?,maxStacks?,rampSec?,whileSwapped?,
perResource?,removeOnReload?) · resource(name,delta) · flatDamage(atkPct,flavor?,core?,crit?,noRange?,
noFb?,delaySec?,charge?,requiresPulls?,rampSec?) · dot(atkPct,durationSec,intervalSec?,crit?,perResource?)
· weaponSwap · fillGauge · heal(ticks?,intervalSec?) · shield · targetStatus(name,durationSec) · storedHit
· burstEligibility · burstFirst · reenterStage · advantageVs · burstCdr · escalating · fullBurstExtend ·
unlimitedAmmo · consumeAmmo · gainPierce · instantReload · stun · stackedNuke`. (`ignored`/`unsupported`
are offline-parser-only — the validator REJECTS them in an override JSON.)

**`StatKey` (highlights):** `atkPct · casterAtkPct · highestAllyAtkPct · atkOfMaxHpPct · critRatePct ·
critRateNormalPct · critDamagePct · coreDamagePct · elementDamagePct · chargeDamagePct · attackDamagePct ·
sustainedDamagePct · sequentialDamagePct · normalAttackPct · pelletCountFlat · elemAdvantageDamagePct ·
maxAmmoPct · maxAmmoFlat · reloadSpeedPct · attackSpeedPct · fireRatePct · extraHitDamagePct ·
damageTakenPct · hitRatePct · defPct · maxHpPct`.

**`characters.json` entry** (per-unit; `data/characters.json` → `characters.<slug>`; small extracts in
`scripts/blind-rebuild/char-extracts/<slug>.json`): `{ slug, name, weapon, burst, burstCooldownSec, class,
element, manufacturer, normalAttackMultiplier, coreAttackMultiplier, ammo, reloadFrames, chargeFrames,
chargeMultiplier, hitsPerShot, burstGaugePerShot, treasure, nicknames[], skills: { skill1, skill2, burst }
(■-header prose: each ■ = trigger+target, each following sentence = one effect line), role (datamine blob
— excluded from blind packets), generatorSupported, simSupported, baseStats }`.

**Harness** (`scripts/tests/lib/harness.ts`): `controlComp(carry, helm?=true)` → `CompOptions`
(liter/crown core, boss Fire, focus = carry); `runComp(opts)` → `SimResult` (**deterministic, no seed** →
byte-stable totals → equality assertions legal); `totals(res)`; `unitOf(res, slug)`;
`withPatchedOverride(slug, mutate)` (in-memory clone — committed JSON untouched, no protected-path prompt).
Event log via `cfg.onEvent: (ev) => …` — kinds `shot / damage / buffApply / buffRemove / reload /
burstCast / fullBurstStart / fullBurstEnd`; `damage` carries bucket, `srcSlot`, resolved crit/core RATES
and the full multiplier decomposition. Tests live in `scripts/tests/units/<slug>.test.ts`, **never** under
`src/engine/` (protected; content guard).

## 8. Decisions log (append-only)

- **2026-07-23 · D1 ·** Scope locked (see §1): plan + live run; moderate well-understood unit (driver
  proposes); skill + doc reusing blind-rebuild + harness; bounded no-go loop (2 retries) → webhook.
- **2026-07-23 · D2 ·** Workflow is **test-centric, not prose-triangulation-centric** (§2). The unit test
  is the primary faithfulness gate; blind/sighted/judge triangulation is the secondary sampler. Rationale:
  the TDD transition plan's same-altitude finding.
- **2026-07-23 · D3 ·** Doc lives at `docs/kit-autonomy-decisions.md` (repo convention) not `doc/` — see
  path note above.
- **2026-07-23 · D4 ·** Engine + override edits authorized **on the worktree branch only** for this
  exercise; engine changes follow isolated-worktree + `/scientific-method` step-7 before any merge-back.
- **2026-07-23 · D5 ·** **Target unit = `privaty`** (AR/Water/Attacker/BIII; MEASURED + tuned, fresh
  owner-signed evidence). Chosen for: moderate complexity, four sharp discriminating/inertness assertions
  (lastBullet cadence, targetStatus-gated 1687 rider, noRange, FB-major-by-landing), a faithful shipped
  override with a documented do-NOT-touch HOT residual (faithful>fit demo), and fresh not-yet-backfilled
  primitives (`lastBullet`, `targetStatus`/`requiresTargetStatus`). Rejected arcana-fortune-mate
  (MODEL_ONLY/complex SG) and dorothy-serendipity (bespoke `consolidation` block). See §6.
- **2026-07-23 · D6 ·** Subagent discipline: the structure-survey subagent died with `LOOP_DETECTED`
  (qwen3.8 re-reads a truncated large file). Recovery = do large-file reads in the main agent with
  progressive `offset/limit` (never re-read a path from line 0); subagents get only small files
  (char-extracts, not the 97K `characters.json`) and a one-read-per-path rule. Background agents write
  full findings to `/tmp` (the foreground parallel path returned no model-visible output).
- **2026-07-23 · D7 ·** The worktree has no `node_modules` (gitignored, not copied). Phase-3 test runs
  need `ln -s /Users/maxwellsutton/nikke-sim/node_modules <worktree>/node_modules` before `npx vitest` in
  the worktree (the symlink is gitignored → no commit pollution). The §6c probe sims ran from the main
  checkout (byte-identical code) to avoid this for read-only exploration.
- **2026-07-23 · D8 ·** **S4 (engine) is expected to be a NO-OP for privaty** — the §6c probe confirmed
  `lastBullet`, `targetStatus`/`requiresTargetStatus`, `flatDamage.noRange`, and FB-by-timing all already
  exist and are observable from the event log. All four discriminating assertions (D1–D4) are expressible
  with the current payload; no engine primitive or event-payload extension is needed for this unit.
- **2026-07-23 · D9 ·** **Red-team revisions adopted (§14, AUTHORITATIVE).** An independent red-team
  subagent found the methodology "structurally sound but NOT enactable as-is." Adopted must-fixes: **R2**
  de-contaminate the blind packet + automated leak assertion; **R3** FAITHFUL lines are GREEN-vs-shipped
  pins (RED-vs-shipped is for FIX/MISSING only); **R4** an independent execution gate verifies
  GREEN-vs-shipped + RED-vs-counterfactual (no self-reported RED); **R1/R6** same-model convergence ≠
  correctness — GO-claim downgraded, blind agents made adversarial, model diversity noted as UNAVAILABLE
  here (no `model` param on the Qwen agent tool); **R5/R7** convergence operationalized (run S5 blind tests
  vs the shipped override; GREEN = convergence); **R8** D3 reclassified to a sanity check; **R9–R13**
  magnitude out of scope, fire-rate check added, ⚑-before-board, board A/B stage, judge reframed. The skill
  (Phase 2) is written from §14.
- **2026-07-23 · D10 ·** **Live-run engine findings from S2a (privaty spec, 15 assertions GREEN).** The
  test-first gate surfaced: **(1)** `noFb` in an override is **INERT under the default FB-by-`timing` rule
  and REJECTED by `validate-overrides`** (`sim.ts:98`, `skillNoFb`; only burst-cast damage is auto-FB-exempt)
  — so the "noFb" counterfactual is NOT constructible; **P4 pins FB-by-timing** via the fixture's natural
  in-FB (`fbMajorApplied=true`) / out-of-FB (`false`) rider populations, discriminating timing-gated from
  "always"/"never". **(2)** Boss-held debuffs emit `buffApply` with **`casterIdx===null`** (TDD plan §1d #3)
  — so **P7 pins `damageTakenPct 10.01` by stat+value**, not caster (privaty is the fixture's only source).
  **(3)** privaty's S2 `damageTakenPct 10.01` is a **boss debuff (team-wide benefit)** — removing S2 lowers
  teammates' damage, so S2 is NOT team-inert; the inertness assertion was revised to rider ATTRIBUTION
  (every 256.17/1687 rider is `slug==='privaty'`). All three are faithful-modeling facts the gauntlet correctly
  exposed (not encoding bugs); the override needed NO change (S3 is minimal/none, as predicted for a faithful unit).
- **2026-07-23 · D11 ·** **S2c reconciliation + S2d green-light (privaty).** The S2b adversarial reviewer
  (blind to the driver) **converged on 9/11 lines** (skill1 all FAITHFUL; 256.17 last-bullet cadence;
  damageTaken boss debuff; elemAdvantage self/`burstCast`; 1407.64 FB-exempt nuke; Stun UNMODELED). The one
  divergence — the 1687 gate + Designated-Target status labeled MEASUREMENT-GATED — was **driven by a stale
  leak (D12)** and **resolved to FAITHFUL**: the override enacts `requiresTargetStatus:"Designated Target"`,
  the probe confirms the 1687 rider fires only in-window (12/12), and S2b's OWN proposed assertion ("1687 only
  within 10s of burst, zero outside") is identical to the driver's P2 pin — the disagreement was the LABEL,
  not the assertion. **Adopted S2b's two adversarial catches** as new discriminating assertions: **P5b** (Max
  Ammo ▼50.66% tandem — removing it REDUCES the last-bullet count; S2b's highest-risk misread) and **P5c**
  (S1 fires once per `fullBurstStart` frame → `fullBurstEnter`, not `burstCast`). Test is now **17 assertions,
  all GREEN**. **S2d** recorded the objective verification matrix to `scripts/kit-autonomy/reviews/privaty.verify.txt`
  (17/17; the DISCRIMINATING assertions run their counterfactuals and assert divergence — no self-reported RED).
  **GREEN-LIGHT** to S3 (no override change) and Phase 3c (S5/S6/S7).
- **2026-07-23 · D12 ·** **Leak found + methodology refinement.** `src/skills/types.ts` (the effect schema,
  legitimately handed to blind roles as vocabulary) carries a comment at the `targetStatus` kind naming
  "privaty" + "Designated Target" + "NOT enacted, still measurement-gated." This leaked the unit's answer to
  S2b (and would to S5/S6) and biased the 1687 disposition toward MEASUREMENT-GATED. S2b DECLARED it (the
  template's `leakDetected` field worked) and the divergence was resolved by driver evidence (D11), so the
  outcome was not corrupted. The comment is also **stale doc-drift** (the gate IS enacted; re-encode landed
  2026-07-23, `sim.ts:96`). **Refinement to §14.2:** the redaction procedure must ALSO strip per-unit example
  comments from the SCHEMA handed to blind roles (not just the methodology excerpt), and the leak assertion
  must scan every FILE the blind role reads (schema included) for the target's slug + answer tokens — not just
  the assembled prompt. (Stale-comment fix is out of scope this session; noted for `/doc-drift`.)
- **2026-07-23 · D13 ·** **S7 verdict: GO (faithfulnessScore 1.0, 0 REAL-GOTCHA) — Phase 4 complete.** The
  reconciling judge (a loop-safe retry after the first judge LOOP*DETECTED on the large multi-file read) ruled
  **GO**: 9 FAITHFUL + 2 DOCUMENTED_GAP (3s stun; boss ATK▼5.02 — the load-bearing Designated-Target \_status* IS
  modeled via `targetStatus`). The 1 mechanical RED (S5 P5) = **RECON_ERROR** — the `casterIdx=null` trap,
  **empirically confirmed** (the `damageTakenPct 10.01` boss debuff emits `casterIdx=null` AND `targetIdx=null`,
  count 39 ≈ reloads, 10s). S6 blind-override diff = **no functional divergence** (`crit:true`/`noRange`
  redundant; inert ATK▼ stat vs `unmodeled`). **Board A/B (non-gating):** privaty reads **HOT** (mean 1.099,
  N=3, range 0.96–1.19, ±15% band, seedSD ±3.2%⚠) — **fit-exposure, NOT encoding** (the over-model the removed
  `noFb` calibration had been hiding, per the override note); faithful>fit ⇒ do NOT revert; a separate per-unit
  localization thread. **verify.sh GREEN** (175 passed | 1 skipped). The gauntlet's value claim held within the
  same-model limit (§14.1): both blind re-derivations converged leak-free and the one mechanical RED was a test
  artifact, not a misread. **Owner spot-check recommended** for the 1687 gate + Max-Ammo▼ tandem (highest-risk
  same-model reads) and the measurement-gated magnitudes.
- **2026-07-23 · D14 ·** **Stage 9 added — per-unit manual-review doc** (`scripts/kit-autonomy/manual-review/<slug>.md`):
  the owner's short-form review consolidating the real kit + the **blind code-only reconstruction** (what the sim
  implements, independent of intent — the best short-form manual-review artifact) + the driver's executive summary
  - owner spot-checks. **LOOP_DETECTED limitation:** generating the blind code-reconstruction via subagent failed
    5× in this environment even with the loop-safe `sim.ts`/`types.ts` split (`scripts/blind-rebuild/code-bundle-now/`)
    — the Qwen loop-detector kills subagents that read many engine files. **Fallback used for privaty:** the Jul-20
    cached blind reconstruction (`scripts/blind-rebuild/reconstructions/privaty.json`) with a clearly-marked DRIVER
    ANNOTATION correcting the one Jul-23 re-encoded line (the 1687 rider: was burstCast→DoT, now `lastBullet`→
    `flatDamage` gated on `requiresTargetStatus:"Designated Target"`), the rest verified against the current code +
    event-log probe. Documented as a known limitation in the skill (Stage 9); a fresh blind reconstruction needs an
    environment without the aggressive loop-detector.

## 9. Open questions / residual risks

- **Same-model shared-prior risk (R1, residual).** All reviewing agents are the same Qwen model; a clean GO
  does NOT rule out a systematic misread the model's prior favors (scope / duration / trigger-identity —
  the §5.2 #2/#3/#4 classes). Mitigations: adversarial blind agents, de-contaminated packets, the
  independent execution gate, the judge's formula check. **Owner spot-check is recommended** for those
  systematic-prior-prone lines before trusting a GO. Model diversity (a different model for the blind roles)
  is the real fix but is **unavailable in this environment** (no `model` param on the agent tool).
- **Magnitude faithfulness is out of scope (R9).** The autonomous gate certifies structure, not numbers; a
  plausible-wrong magnitude would GO cleanly. Moot for privaty (all MEASURED); real for future units.
- **D2 window is reconstructed from `burstCast`** (no `targetStatus` event, §5.4) — works for privaty
  (probe-confirmed) but a future unit whose status window ≠ burst+Ns would need an S4 event-payload extension.

---

# PART II — THE OPERATIONAL METHODOLOGY (the hardened gauntlet)

The reusable form of Part II lives in `.claude/skills/kit-autonomy/SKILL.md` (Phase 2); the full agent
prompts live there too. Part II here records the DESIGN + the decisions behind it.

## 10. Stage protocol (S1–S7)

Five distinct agent **roles**; blindness is enforced by what each role is handed (mirroring
`build-packet.ts`'s leak assertion). "Blind" = blind to the driver's _implementation + reasoning_, never
to the kit prose (every role reads `characters.json`).

> **⚠ The S2 protocol below is corrected by §14.3** (read it with the table): for a FAITHFUL line on an
> already-faithful override the test is a **GREEN-vs-shipped pin that is RED-vs-counterfactual** — "RED vs
> the shipped override" applies ONLY to FIX/MISSING lines. S2b is **adversarial** and receives a **redacted**
> packet (§14.2); **S2d** is an independent execution gate (no self-reported RED). Blind roles also propose
> the nearest-wrong model + the load-bearing set, and convergence is mechanical (§14.4).

| Stage                                                            | Role                                     | Sees                                                                                                                                                           | Blind to                                                                                    | Output                                                                                                                                                                                                        | Gate to proceed                                                                                                                                     |
| ---------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** Read + slug gate                                          | driver (sighted)                         | `characters.json` entry; shipped override (full); `kit-status` row; `engine-modeling-gaps` hits; board reading                                                 | —                                                                                           | line inventory (■ = trigger+target, each sentence = one effect line) + current model + tier + board                                                                                                           | exact slug stated (lint-slug-disambiguation); every line enumerated                                                                                 |
| **S2a** Write tests FIRST                                        | driver                                   | S1 + harness + schema + disposition vocab + §5 lessons                                                                                                         | —                                                                                           | `scripts/tests/units/<slug>.test.ts` **RED vs the shipped override**: one discriminating assertion per FAITHFUL/FIX/MISSING line + inertness assertions; header carries the evidence                          | every line has a disposition; every assertion FAILS under the nearest-wrong model; tests confirmed RED                                              |
| **S2b** Independent test-faithfulness review                     | reviewer subagent                        | kit prose + harness + schema + disposition vocab + 4 per-line questions + §5                                                                                   | the driver's tests, dispositions, reasoning                                                 | its OWN line-by-line spec table + the discriminating assertions each line demands + evidence-tier tags                                                                                                        | (feeds S2c)                                                                                                                                         |
| **S2c** Reconcile specs → green-light                            | driver                                   | its spec + the reviewer's spec                                                                                                                                 | —                                                                                           | converged spec; divergences resolved **toward the prose-faithful reading** (not toward the shipped override) + recorded                                                                                       | the two specs converge on dispositions + load-bearing assertions, OR divergences are resolved+recorded                                              |
| **S3** Faithful override                                         | driver                                   | converged spec + tests                                                                                                                                         | —                                                                                           | minimum `src/skills/overrides/<slug>.json` change to turn tests GREEN; `validate-overrides` passes; skipped lines VERBATIM in `unmodeled`; ⚑ on anything outside the input domain; prose = current-state only | tests GREEN; validator passes; no `ignored` blocks; no fudge                                                                                        |
| **S4** Engine updates (only if a primitive is genuinely missing) | driver in **isolated worktree**          | the GAP test + engine                                                                                                                                          | —                                                                                           | engine primitive / event-payload extension; `/scientific-method` step-7 review; `verify.sh` there; merge back to branch; GAP entry in `engine-modeling-gaps.md`                                               | the GAP test un-skips + goes green; whole-board A/B byte-identical except the intended change; engine serves faithfulness, never simplifies the kit |
| **S5** Blind post-op test-writer                                 | blind subagent                           | kit prose + harness + schema + disposition vocab + §5                                                                                                          | driver's tests / override / reasoning; truth file                                           | its OWN `<slug>.test.ts` from the prose alone + its spec table                                                                                                                                                | (feeds S7)                                                                                                                                          |
| **S6** Blind post-op override-writer                             | blind subagent (`kit-parse` BLIND-STUDY) | kit prose + `types.ts` schema + `modeling-priors` + kit-parse hard rules + ALWAYS-⚑ + a DIFFERENT unit's override as style                                     | this unit's override; driver's tests/reasoning; DECISIONS/handoffs/probe-data/git history   | its OWN override JSON + per-line audit table + ⚑ list                                                                                                                                                         | (feeds S7)                                                                                                                                          |
| **S7** Reconciling judge → go/no-go                              | judge subagent                           | kit prose; S2b pre-op review; S5 blind tests; S6 blind override; driver's tests + override + engine change; `docs/data/damage-calculation.md` + mechanics pack | the driver's chain-of-thought/reasoning (adjudicates ARTIFACTS vs ground truth, not intent) | ranked gotchas + `kitDescription` + verdict **GO / NO-GO(faithfulness) / NO-GO(engine-core)**                                                                                                                 | verdict is BINDING (§11)                                                                                                                            |

**Per-line disposition vocabulary** (`kit-tdd`): FAITHFUL · FIX · MISSING · GAP · UNMODELED ·
MEASUREMENT-GATED. **The 4 questions per line** (the errors calibration hides): (1) scope (normal-attacks
vs charge vs crit-only); (2) duration semantics (seconds vs ROUNDS vs stacks vs until-reload); (3) trigger
identity (`lastBullet`/`shotFired`/`hitCount`/`interval`/`fullBurstEnter`/`burstCast`, on-cast vs on-hit,
gates); (4) target set (self / allies / all-including-self / enemy / caster-slot overwrite).

## 11. The go/no-go rubric (S7)

The judge classifies every divergence between the driver's implementation and (prose + blind
re-derivations + damage formula):

- **FAITHFUL** — encoding matches prose + formula. (no action)
- **DOCUMENTED-GAP** — deliberately `unmodeled` (with reason in `note`), a `GAP` (missing primitive,
  `it.skip` + reason), or a `⚑` (estimate + recipe, tier-tagged). (acceptable; the decision is recorded)
- **REAL-GOTCHA** — encoding/engine/fidelity/silent-drop divergence from the prose+formula that is NOT
  documented. Ranked SILENT_DROP → ENGINE/FIDELITY → ENCODING. (blocks GO)

**GO requires ALL of:**

1. Every kit line accounted for — FAITHFUL or a documented UNMODELED/GAP/⚑ (no silent drops; the audit
   table's SKIPPED rows ↔ the `unmodeled` field 1:1).
2. No REAL-GOTCHA: the driver's encoding does not diverge from prose+formula on any load-bearing line.
3. **Independent convergence:** the blind re-derivations (S5 tests, S6 override) agree with the driver's
   implementation on the load-bearing lines. A divergence the blind agents caught and the driver did NOT
   document, confirmed against the formula, is the payload → NO-GO.
4. Every ⚑ has an initial estimate + a measurement recipe + an evidence tier; no value outside the input
   domain was shipped silently.
5. The tests DISCRIMINATE — each fails under the nearest-wrong model (rounds-vs-seconds, scoped-vs-generic,
   burstCast-vs-fullBurstEnter, gated-vs-ungated, FB-by-timing-vs-noFb) and the inertness assertions hold.

**Verdict types:** `GO` · `NO-GO(faithfulness)` (a REAL-GOTCHA or a failed convergence — fixable by the
driver) · `NO-GO(engine-core/irreversible)` (the fix needs an engine change with broad blast radius, or an
irreversible decision — escalates to the owner).

## 12. Autonomy safeguards — how the gauntlet replaces the owner-driven spec

`kit-tdd` insists the owner disposition every line because "a test written from a wrong reading passes
wrongly and certifies the misread forever," and forbids autonomous override/engine edits. This gauntlet is
the autonomous, editing-authorized form; it substitutes the owner gate with:

1. **Independent re-derivation at two altitudes.** S2b (prose→spec, blind to driver reasoning), S5
   (prose→tests, blind), S6 (prose→override, blind). When independent agents, given only the kit text,
   converge on the same dispositions AND the same discriminating assertions, the reading is _forced by the
   text_ — not a plausible misread. This is the direct answer to the same-altitude trap (§2/§5.5b): test
   derivation (prose→assertion) is a different altitude than override authoring (prose→JSON), and the test
   is the forcing function.
2. **Tests are the gate; triangulation is the sampler.** The binding instrument is the unit test
   (stat/footage-independent); the blind/sighted/judge triangulation (S5/S6/S7) is a secondary code sampler,
   subordinated so a prose→JSON agreement can never override a test disagreement.
3. **Anti-fudge invariants enforced at every stage:** faithful > fit, measured > fudge; no weakening an
   assertion or re-adding an unfaithful encoding to reach GO (the kit-tdd anti-pattern); ⚑ for anything
   outside the input domain; a board move away from 1.0 after a faithful fix is fit-exposure (a separate
   localization thread), never a reason to revert.
4. **Evidence-tier tagging** on every assertion and every override value, so a `CALIBRATED ⚑` is never
   mistaken for `MEASURED` (§5.1).
5. **Bounded loop + escalation:** on NO-GO(faithfulness) the driver fixes the cited divergence and re-runs
   from the earliest affected stage, **≤2 retries**; on NO-GO(engine-core/irreversible) or 2 failed retries
   it stops and pings the owner via the `autonomous_session_webhook` (`.env`) with the judge's cited
   divergences + its recommendation. The driver never makes an irreversible/engine-core decision alone.
6. **Blindness boundaries are load-bearing** and enforced by construction (what each subagent is handed);
   if a blind role ever sees the driver's tests/override/reasoning or the truth file, that stage is void.

## 13. Hardening deltas vs the existing skills

- **vs `kit-tdd`:** kit-tdd is owner-driven + autonomous-no-edit (append-to-queue). This gauntlet is
  autonomous + editing-authorized (on the branch), replacing the owner spec gate with independent
  re-derivation (S2b/S5) + a binding judge (S7). It inherits kit-tdd's test-writing discipline verbatim
  (shipped-override assertions vs `withPatchedOverride` counterfactuals, event-log over totals,
  discriminating + inertness assertions, protected-path routing for the fix).
- **vs `audit-kit`:** audit-kit's blind/sighted/judge triangulation is RE-PURPOSED from post-validation
  sampling into the build path's secondary check (S5/S6/S7) — but SUBORDINATED to the test gate (S2) so the
  same-altitude trap cannot decide faithfulness.
- **vs `kit-parse`:** kit-parse's blind override authoring becomes S6 (the blind post-op override-writer),
  hard rules + ALWAYS-⚑ taxonomy intact.
- **NEW roles:** the test-faithfulness reviewer (S2b) and the blind test-writer (S5) — test-_derivation_
  agents that did not exist before; they are the autonomous substitute for the owner's line-by-line spec
  review. NEW: the binding go/no-go judge with the faithful>fit invariants + bounded loop + webhook escalation.
- **Fold-back (Phase 4):** once validated on privaty, the reusable lessons land in the skills themselves
  (`/skill-maintenance`): the test-derivation roles + the go/no-go rubric become a documented autonomous
  path alongside kit-tdd's owner-driven path.

## 14. Red-team revisions (2026-07-23) — AUTHORITATIVE; supersedes conflicting text above

An independent red-team subagent stress-tested Part II (full report: `/tmp/kit-autonomy-methodology-review.md`).
Verdict: "structurally sound, but NOT enactable as-is." The must-fix items below are adopted and
**supersede** the conflicting parts of §2/§6b/§10/§11/§12. The skill (Phase 2) is written from §14.

### 14.1 The same-model limit (R1 + R6) — the central value-claim, downgraded honestly

Independent re-derivation by the blind agents decorrelates **idiosyncratic** (random) error but does
**NOT** remove **shared-prior** bias: every reviewing agent here is the _same underlying model_ (the Qwen
`agent` tool has **no `model` parameter**, so audit-kit's Opus-pinning is unavailable in this environment).
A plausible-but-wrong reading the model's prior _favors_ — and the repo's taxonomy says the dominant errors
are exactly these SYSTEMATIC ones: scope-collapse, duration-semantics, trigger-identity (§5.2 #2/#3/#4) —
will be produced identically by driver and blind agent; they converge, and the convergence is **false
confidence**. **Therefore the GO-claim is downgraded:** a clean gauntlet GO is _evidence against
idiosyncratic error + a forcing-function check that every line was read precisely_, **NOT** proof of
faithfulness; systematic shared-prior errors require a **different model or the owner**. Mitigations baked
into the protocol: (a) **adversarial** blind agents that generate the nearest-wrong reading, not just
re-derive (§14.3 S2b); (b) true information asymmetry (blindness-by-construction, de-contaminated per
§14.2); (c) the **independent execution gate** (§14.3 S2d) — even a same-model misread must produce a test
that _provably discriminates_; (d) the judge's independent formula check; (e) **owner spot-check
recommended** for the systematic-prior-prone lines (scope / duration / trigger-identity).

### 14.2 Blind-packet de-contamination (R2) — enforced before dispatching S2b/S5/S6 for unit X

The blind roles read the **kit prose** (legitimate input — it names the mechanic; that is what is being
derived) and the **schema vocabulary** (`types.ts` — the language). They must NOT receive any methodology
text that _states X's answer_. Before dispatch, build a **REDACTED methodology packet**: strip X's
name/slug, its trigger/gate/magnitudes, and any worked example naming X — concretely, for privaty, redact
§5.2#4 ("privaty = lastBullet + targetStatus gate"), §5.6 ("…first pin from privaty"), and kit-parse
hard-rule #5's "Privaty S2 … 256.17% … last bullet" example (substitute a _different_ unit's example if one
is needed). **Automated leak assertion (mirrors `build-packet.ts`):** grep the assembled blind prompt for
X's slug + key magnitudes (`256.17` / `1687` / `1407.64`) + answer tokens (`Designated Target`) **outside
the prose block**; fail loudly if any appear. The new test-writer roles previously had no such guard — the
"mirrors build-packet.ts" claim (§10) is now actually honored.

### 14.3 Corrected test-first protocol (supersedes §10 S2a–S2c; adds S2d)

- **S2a (driver):** for each line, disposition + the 4 questions, and name the **nearest-wrong
  counterfactual** explicitly. **For a FAITHFUL line on an already-faithful override** (privaty's case):
  write a PIN assertion that is **GREEN vs the shipped override AND RED vs the named counterfactual**
  (`withPatchedOverride`). **"RED vs the shipped override" applies ONLY to FIX/MISSING lines on an
  unfaithful override** (then implemented to green in S3). This fixes R3 (the old "RED vs shipped" gate
  contradicted D4 for a faithful override).
- **S2b (independent test-faithfulness reviewer — ADVERSARIAL):** handed the **redacted** packet (§14.2) +
  kit prose + harness + schema + disposition vocab + the 4 questions. Blind to the driver's
  tests/dispositions/reasoning. Task: independently re-derive the spec table AND, **for each line, generate
  the NEAREST-WONG reading + the assertion that distinguishes it** (adversarial — surfaces the shared prior
  per R1/R5); propose the **load-bearing set** objectively (every FAITHFUL/FIX/MISSING line that is not
  UNMODELED). Returns spec + per-line nearest-wrong + distinguishing assertion + load-bearing set + tier tags.
- **S2c (reconcile):** driver compares its spec / counterfactuals / load-bearing set against S2b's.
  Convergence = green-light. **A divergence on the nearest-wrong model OR on load-bearing-ness is itself a
  divergence**, resolved toward the prose-faithful reading + recorded; unresolved ones go to the judge (R5).
- **S2d (INDEPENDENT VERIFICATION GATE — R4):** a **separate** subagent (or an automated `vitest` run the
  driver does not author) executes the S2a tests against (i) the **unmodified shipped override** — expect
  GREEN for every FAITHFUL pin — and (ii) **each named counterfactual** — expect RED, and records the full
  pass/fail matrix as an artifact. **Self-reported discrimination is not acceptable.** A test that is GREEN
  under BOTH shipped and counterfactual (asserts nothing) FAILS this gate. This is the autonomous form of
  kit-tdd's "confirm RED before implementing."

### 14.4 Operationalized S7 rubric amendments (R5/R7/R9/R10/R13)

- **Convergence (GO #3) is mechanical (R7):** run the **S5 blind tests, UNMODIFIED, against the driver's
  shipped override. GREEN = convergence; any RED = a divergence the judge classifies.** (A divergence the
  blind caught is the real signal; mere same-model agreement is weak — §14.1.)
- The blind agents' independently-proposed **nearest-wrong models + load-bearing set** are judge inputs;
  driver↔blind divergence on either is reconciled (R5).
- **Magnitude faithfulness is OUT OF SCOPE for the autonomous gate (R9):** tests are stat-independent by
  design, so the pipeline certifies **STRUCTURE** (trigger / scope / duration / target / gating), not
  numbers. Every magnitude carries its evidence tier; a plausible-wrong magnitude would GO cleanly and that
  is a declared limitation (moot for privaty — all MEASURED).
- **Fire-rate / "modeled≠working" check added (R10):** each FAITHFUL block's fire count over the 180s fight
  must match the prose-implied cadence, confirmed from the event log (the DBG side-effect check), not just
  structural presence.
- **S7 is NOT "blind to reasoning" (R13):** it sees the driver's artifacts (which embody the reasoning).
  Reframe: the judge **grades ARTIFACTS vs ground truth** (prose + formula + blind re-derivations) and does
  **not trust the author's self-report**.
- **Non-gating BOARD A/B report stage added (R13):** run `board-read | grep <slug>` before/after, report
  both numbers + classify movement (toward 1.0 = the misencoding was the error; away = fit-exposure, a
  separate localization thread, never a reason to revert). Unit tests pin _faithful_; the board pins
  _accurate_; report both.

### 14.5 ⚑-before-board (R11, general pipeline)

Commit ⚑ estimates **before** consulting the board reading (or have a blind agent re-derive each estimate
and compare), so estimates cannot be back-fit. Moot for privaty (no ⚑ — all MEASURED).

### 14.6 Corrected privaty assertions (R8 + R12; supersedes §6b D1–D4 wording)

- **D1 (lastBullet cadence) — discriminates:** ≈reloads (39≈43) vs `shotFired` (≈shots, far more). Note:
  "fires per hit" is **degenerate** for privaty (`hitsPerShot 1` ⇒ shot==hit) — not a distinct nearest-wrong.
  Attribution is **by magnitude** (256.17 is distinct) — works for privaty, fragile generally (state the reliance).
- **D2 (targetStatus-gated 1687) — discriminates; window from `burstCast`:** the Designated-Target window is
  reconstructed from privaty's `burstCast` frames + 10s (the probe confirmed this; **no S4 event extension
  needed** despite §5.4 having no `targetStatus` event). **Non-vacuity precondition:** assert ≥1 last bullet
  IN-window (1687 fires) AND ≥1 last bullet OUT-of-window (1687 does NOT fire) — the probe shows 12 in-window
  / 27 out-of-window last bullets, satisfied. Counterfactual: remove `requiresTargetStatus` → 1687 fires on
  every last bullet (≈ the 256.17 count, many out-of-window).
- **D3 (noRange) — RECLESSED to an ENGINE-INVARIANT SANITY CHECK:** the engine force-sets `noRange` on all
  riders (§5.2#12), so it holds for ANY override — it discriminates nothing about privaty. Still asserted
  (`rangeApplied === false` on S2 riders) but **not counted as a faithfulness discriminator**.
- **D4 (FB-major-by-landing) — discriminates for the 256.17 rider ONLY:** it has in-FB (27) and out-of-FB
  (12) instances; in-FB `mult` ≈ 1.5× out-of-FB; a `noFb:true` counterfactual yields ZERO `fbMajorApplied`
  riders. The **1687 rider fires only in-window/in-FB → no out-of-FB baseline → its FB-major is NOT
  independently discriminable.** The "both riders" claim is withdrawn.
- **Honest net:** privaty has **2 clean discriminators (D1, D4-for-256.17) + D2 (discriminates, window-from
  -burstCast, non-vacuity guard) + D3 (sanity check)** — "~2.5 sharp + 1 tautology," not "four sharp."

---

# PART III — THE LIVE RUN: `privaty` (2026-07-23)

## 15. Result

**Verdict: GO** · faithfulnessScore **1.0** (11/11 lines FAITHFUL or DOCUMENTED_GAP) · **0 REAL-GOTCHA**.

| Stage | Output                                                  | Result                                                         |
| ----- | ------------------------------------------------------- | -------------------------------------------------------------- |
| S1    | line inventory (11 lines) + tier MEASURED               | done                                                           |
| S2a   | `scripts/tests/units/privaty.test.ts` (17 assertions)   | GREEN vs shipped                                               |
| S2b   | `reviews/privaty.test-review.json` (adversarial, blind) | converged 9/11; 1687→FAITHFUL (leak-influenced label resolved) |
| S2c   | reconcile                                               | adopted P5b (Max-Ammo tandem) + P5c (fullBurstEnter cadence)   |
| S2d   | `reviews/privaty.verify.txt`                            | 17/17 GREEN (objective matrix)                                 |
| S3    | override                                                | NO CHANGE (already faithful; validates clean)                  |
| S4    | engine                                                  | NO-OP (all primitives exist + are observable)                  |
| S5    | `blind/privaty.test.ts` (independent, no leak)          | 24/27 GREEN vs shipped (1 RECON_ERROR, 2 skipped)              |
| S6    | `blind/privaty.override.json` (independent, no leak)    | no functional divergence; the gate converged from prose        |
| S7    | `results/privaty.json` (binding judge)                  | **GO**, score 1.0, 0 gotchas                                   |

## 16. What the gauntlet caught / confirmed

- **Confirmed faithful (independently):** S1 `fullBurstEnter` team buffs; S2 `lastBullet` 256.17 cadence; the
  1687 `requiresTargetStatus` gate (**converged from the prose, leak-free**); `damageTakenPct` boss debuff;
  `elemAdvantageDamagePct 130` self/`burstCast`; 1407.64 FB-exempt nuke; stun/ATK▼ unmodeled.
- **Engine findings surfaced by the test-first gate:** `noFb` is INERT under FB-by-timing + rejected by
  `validate-overrides` (D10); boss debuffs emit `casterIdx=null` AND `targetIdx=null` (empirically confirmed);
  the `damageTakenPct` debuff makes S2 team-relevant (not team-inert).
- **Methodology findings:** the `types.ts` schema leaked privaty's answer via a stale comment (D12) → redaction
  must strip per-unit comments from the schema + scan every file the blind role reads; the same-model limit (R1)
  means a clean GO is evidence against idiosyncratic error, not proof of faithfulness.

## 17. Board A/B (non-gating) + honest residual

privaty reads **HOT** (mean 1.099, N=3, range 0.96–1.19, MAD 0.124, ±15% band, seedSD ±3.2%⚠). This is
**fit-exposure, not encoding** — the override is faithful (GO, 1.0); the HOT is the over-model the removed
`noFb` calibration had been hiding (override note). Faithful>fit ⇒ the encoding is NOT reverted; the residual is
a separate per-unit localization thread (§5.5c). **Owner spot-check recommended** for the 1687 gate + Max-Ammo▼
tandem (highest-risk same-model reads) and the measurement-gated magnitudes.

## 18. Deliverables

- **Methodology + decisions:** `docs/kit-autonomy-decisions.md` (this doc; §14 authoritative).
- **Skill:** `.claude/skills/kit-autonomy/SKILL.md` (live, gitignored — consistent with the other methodology skills).
- **Tracked templates + run artifacts:** `scripts/kit-autonomy/` (TEST-FAITHFULNESS-REVIEW / BLIND-TEST-WRITER /
  BLIND-OVERRIDE-WRITER / RECONCILING-JUDGE / README + `reviews/` + `blind/` + `results/`).
- **The faithful, fully-unit-tested kit:** `scripts/tests/units/privaty.test.ts` (17 assertions, GREEN).
- **Per-unit manual-review doc:** `scripts/kit-autonomy/manual-review/privaty.md` (real kit + blind code-only
  reconstruction + driver executive summary + owner spot-checks — the owner's short-form review; Stage 9).
