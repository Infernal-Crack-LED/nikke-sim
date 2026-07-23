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
- A clean GO from a _blind_ gauntlet is **real evidence** of faithfulness (not the author agreeing with
  themselves) — that is the deliverable's value claim.

## 5. Lessons learned (to harden into the workflow)

> _TODO — populated from the docs survey (`/tmp/kit-autonomy-lessons.md`): the recurring failure-mode
> taxonomy, evidence tiers, primitive census, ALWAYS-⚑ taxonomy, and open gaps._

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

## 9. Open questions

- (none yet — will be populated as the live run surfaces them; high-priority ones go to the webhook.)
