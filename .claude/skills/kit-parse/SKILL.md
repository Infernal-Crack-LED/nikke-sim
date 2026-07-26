# kit-parse — baseline override authoring from raw kit text

## When to use
- Producing the **baseline override** for a new or untuned unit from its raw skill text, so hand-tuning
  starts from ~80% instead of zero.
- Invoked by `scripts/kit-parse/parse.ts`, which spawns an **Opus subagent** running THIS skill against
  one unit's raw kit text.
- Also used as the unit-under-test in the blind parser-validation study (see
  `docs/handoffs/2026-07-15-parser-skill-plan.md`).
- **The roster-wide kit-parse rollout** (2026-07-16, `docs/handoffs/2026-07-16-kit-parse-rollout.md`):
  every unit gets a pass in one of two PRODUCTION MODES — the invoking prompt says which:
  - **AUTHOR mode** (parser-origin slots): the full flow below. Inputs additionally include the staged
    `src/skills/overrides-baselines/<slug>.json` where one exists (MERGE its reviewed hypotheses + ⚑
    list — it is a prior kit-parse product, not a constraint) and the current override's HAND-AUTHORED
    slots, which you preserve VERBATIM (never regenerate a hand-authored slot).
  - **AUDIT mode** (hand-authored/validated slots): full-kit LINE-BY-LINE audit AGAINST the current
    override + the official (blablalink) prose. Deliverables: (1) `unmodeled` backfill for the audited
    slots (verbatim skipped lines); (2) a structured FINDINGS list — kit lines missing from the model,
    values disagreeing with the official prose, suspect triggers/targets — each as
    `slot | kit line | current model | discrepancy | suggested fix`; (3) NO block edits to validated
    slots — pure `unmodeled`/note additions are allowed, anything touching numbers/blocks/triggers is a
    FINDING for owner-approved reconciliation, not an edit.
  - **Production I/O rule**: write your candidate + findings ONLY to the staging dir the prompt gives
    you (`<scratchpad>/kit-parse-wave-<n>/<slug>.json` + `<slug>.findings.md`) — the DRIVER promotes to
    `src/skills/overrides/` and runs validators, serially (non-negotiable 3).
  - **VALUES-WITHHELD (production non-negotiable)**: do NOT read `scripts/kit-parse/grade.ts`,
    `scripts/kit-parse/sweep-grade.ts`, `scripts/experiment.ts`, board-read output, or other units'
    `docs/probe-data/*` real totals — you must not be able to fit to the board. Your OWN unit's
    measured values (its override note, its probe-data files) ARE legitimate input in AUDIT mode.

You produce the SAME artifact hand-tuning produces: an `src/skills/overrides/<slug>.json`. You do NOT
change the engine. NOTE (2026-07-16): the engine NEVER parses skill prose at runtime — the override you
write is the COMPLETE description of the unit's kit. ALL THREE slots (`skill1`/`skill2`/`burst`) must be
present (an empty array only if a slot genuinely has zero modelable effects — and then its lines are in
`unmodeled`), plus the `unmodeled` field (see the output contract).

## Non-negotiables (procedural — read `.claude/subagent-non-negotiables.md`)
Before anything: (1) refer to the unit by its EXACT slug — never conflate a base with a variant (`snow-white`
AR/Iron ≠ `snow-white-heavy-arms` SR/Water; P0 failure). (2) NO `ignored`/`unsupported`-effect blocks (the
validator rejects them) — every skipped line goes VERBATIM into the `unmodeled` field (per slot) with the
reason in the `note`. (3) During a PARALLEL batch, do NOT write to
`src/skills/overrides/` or run `validate-overrides` there (it corrupts sibling agents) — validate by
inspection; leave no scratch. (4) Return a tight structured findings block, not a prose essay.

## The prime directive (never violate)
Model REAL OBSERVED mechanics. **Faithful > fit. Measured > fudge.** NEVER fabricate a calibrated value
to hit a target number — if a value isn't derivable from the kit text, FLAG it for measurement WITH an
initial best-guess estimate and a measurement recipe (see "Needs-measurement protocol"). A blind parser
that honestly flags what it can't know is CORRECT; one that guesses a precise ⚑ value is WRONG.

## Inputs you are given
- The unit's **raw skill text** (skill1 / skill2 / burst) + base stats (weapon, class, burst tier,
  element, ammo, reloadFrames, chargeFrames, multipliers, hitsPerShot).
- Read freely for METHODOLOGY: `src/skills/types.ts` (the effect schema — your vocabulary),
  `docs/modeling-priors.md` (the 9 priors), `docs/CONVENTIONS.md` (evidence tiers), and existing
  overrides as STYLE examples of a DIFFERENT unit.
- **BLIND-STUDY MODE (if the invoking prompt says so):** you may NOT read this unit's own
  `overrides/<slug>.json`, `docs/DECISIONS.md`, `docs/handoffs/*`, `docs/probe-*`, or git history.
  Work from the kit text + methodology only.

## Step 1 — Full-kit audit (REQUIRED; "modeled ≠ working")
Enumerate EVERY line of every skill. For each, decide IMPLEMENTED or SKIPPED and record the reason. No
line may be silently dropped. Produce a per-line audit table (see Output). For each IMPLEMENTED line,
after writing the override you MUST sim + DBG that it actually fires (Step 5) — a modeled line that
doesn't activate is a bug, not a model.

## Step 2 — Classify each line: model vs skip
Use the effect schema in `src/skills/types.ts` as your vocabulary (StatKey buffs, TriggerDef,
TargetDef, EffectDef, and the Block gates: `formation` / `mode` / `everyN` / `requiresCore` / `fbGate`
/ `swapGate`).

### HARD RULES — these are NEVER auto-skippable as "defensive" (each burned us before):
1. **Weapon-state modifiers ARE damage (prior 9).** Reload speed/ratio ▲▼, partial/instant reload,
   ammo capacity ▲▼ (ammo DOWN = fewer shots), unlimited ammo, fire rate, charge speed, AND
   **weapon swap** ("Changes the weapon in use") — they gate SHOT COUNT and the fire profile, which
   gate damage. Before writing "skip", answer: *does this change shots fired or the weapon?* If yes,
   model it (`charFixes.reloadFrames` for reload-speed, `instantReload{fraction}` for partial refill,
   `unlimitedAmmo`, `maxAmmoPct`, `pullsPerSec`, `chargeSpeedPct`, `weaponSwap`). Root case: Grave's
   "Heat Emission: Reload Ratio ▼50%" wrongly dropped; Moran/Nayuta/SBS burst weapon swaps.
2. **Seemingly no-op effects may work IN TANDEM WITH OTHER UNITS — never skip on isolation.** When you
   parse ONE kit you cannot see the CONSUMER, which often lives in a DIFFERENT unit's kit. Heals,
   shields, DEF ▲▼, Max HP, lifesteal, gauge, buffs "on recovery/when healed/on shield" all look inert
   alone but drive damage in a team (root case: Helm's full-charge HEAL is inert by itself → it procs
   Crown's team ATK ▲ 20.99% "when recovery takes effect", near-permanent — dropping the heal left every
   Crown+Helm team ~15% cold). RULE: model the effect/event so the synergy works when the consumer is
   present — wire heals as a `heal` event (fires `recovery` triggers), keep DEF/HP/shield buffs as their
   stat buffs. Do NOT emit `ignored` for any heal/shield/DEF/HP/lifesteal/gauge line.
3. **DEF / HP / lifesteal are NOT skippable — units SCALE damage off them.** HP-scaling kits convert
   own Max HP → ATK (`atkOfMaxHpPct`/`casterMaxHpPct`, prior 6); DEF/HP buffs may feed a scaler or a
   cross-unit trigger you can't see. Keep the stat buff (`defPct`/`casterMaxHpPct`/etc.) even where the
   engine currently treats it inert — deleting it destroys a future consumer/scaler; leaving it is free.
4. **"Hit Rate ▲" raises the CORE-HIT rate — PROVEN; magnitude unknown.** Do NOT say "may". Model it as
   `hitRatePct` (currently inert in the engine) AND put it in needs-measurement with an initial estimate
   of the core-rate lift + a measurement recipe (Hit-Rate-on vs off core fraction). Never delete it.
5. **Recurring conditional-damage triggers are real — rebuild them (prior 3).** Covers ALL of: "over
   time" / "X% of final ATK as sustained/additional damage /s" (`dot` at the real interval); "after
   landing N normal attack(s)" / "every N hits" / "consecutive hit" (`hitCount` / stack build-up); and
   **"on last bullet fired" / "when the last bullet hits"** (`lastBullet`) — a per-magazine additional-
   damage proc that fires EVERY reload cycle. EXACT wording to recognize: Privaty S2 "Activates when the
   last bullet hits the target … Deals 256.17% … additional damage"; Anis: Sparkling Summer S2
   "Activates when firing the last bullet … Deals 382.42% … as damage". These recur ~every reload — big
   cumulative damage; never let them vanish.
   **DoT ENCODING (prior 3, Mihara batch): the engine APPENDS a new independent DoT instance per fire and
   NEVER refreshes/dedups (sim.ts:1026).** So a CONTINUOUS/maintained sustained DoT must be ONE `passive`
   instance with `durationSec` ≥ fight length — a long-`durationSec` DoT on a REPEATING trigger overlaps
   and MULTIPLIES (dur-60 on a ~16s trigger ≈ 3.7× over). Carve-out: only encode as repeating-trigger if
   the kit says the DoT genuinely STACKS.

6. **`burstCast` vs `fullBurstEnter` — TRIGGER FIDELITY (read the activation text literally).** These
   coincide ONLY when the unit is the sole burster of its tier, and diverge the moment a team has
   another same-tier unit — so never substitute one for the other:
   - **"when using Burst Skill" / a self mode/buff granted in the unit's OWN Burst block** ("Burst:
     [Mode] … self …") → **`burstCast`**. It fires ONLY on the rotations THIS unit bursts. Keying it to
     `fullBurstEnter` OVER-CREDITS: `fullBurstEnter` fires on EVERY team Full Burst, including rotations
     where a DIFFERENT same-tier unit bursted and this one did not (so it never actually gained the buff).
   - **"when entering Full Burst"** → **`fullBurstEnter`** (fires for the unit on team-FB entry regardless
     of who bursted — correct even for a self buff worded this way).
   - **"when Full Burst ends"** → **`fullBurstEnd`** (removal/cleanup, unconditional at FB exit).
   A burst-gained self MODE (arcana-fortune-mate "Making Memories", removed at FB end) is `burstCast` +
   `durationSec` spanning the unit's burst→FB-exit, NOT `fullBurstEnter`. (Root 2026-07-16: arcana MM
   keyed to `fullBurstEnter` over-credited her in any multi-B2 team.) The `fbGate` block flag only checks
   FB-state AT trigger time — it does not continuously window a duration'd buff.

### Genuinely skippable (truly no damage vs a single partless boss):
ONLY: taunt / attract / aggro, invulnerability, cover, camouflage / concealment, dodge, debuff-immunity
/ cleanse, "when this unit is hit / dies", "when an enemy is neutralized / destroyed" (the boss never
dies), and parts / Interruption-Part / AoE-radius damage (no parts on the partless boss). Record each such
line VERBATIM in the override's `unmodeled.<slot>` array (never as an `ignored` block — the validator
rejects those) with the skip reason in the `note`, so the audit shows you SAW it and chose to skip. **If it is a heal,
shield, DEF, HP, lifesteal, gauge, reload, ammo, or ANY buff/stat line, it does NOT belong here** — see
hard rules 1–3.

## Step 3 — Apply the priors as starting guesses (`docs/modeling-priors.md`, priors 1–9)
Salient ones: (1) cadence / rate-of-fire — see the MANDATORY cadence ⚑ rule below (a blind parse
has no hot/cold signal, so you MUST flag it, and escalate on the text-visible tells); (2) **function-damage riders get Full Burst by TIMING (default ON — do NOT set
`noFb`); the +30% range bonus is universally off (the engine force-sets `noRange`, so never set or
flag it). Set `noFb:true` ONLY with per-kit MEASURED FB-OFF evidence; burst-cast/instant damage is
auto-FB-exempt.** (4) stack / currency mechanics → steady-state average with a ramp haircut (a ⚑ —
flag it); (5) multi-projectile → split vs merge, flag for video; (6) HP-scaling counts the unit's OWN
Max HP only; (7) element advantage is a clean ×1.10 unless a Superior-Elemental-Code-style buff. Follow the new-character checklist at the
bottom of `modeling-priors.md`.

## Step 4 — Scope-lock context (the sim basis you're modeling for)
Boss is partless, DEF 140, 100% core exposure, 180s, moving on the fixed range-band timeline. Combat
ATK by class at scope lock: Attacker 118,027 / Supporter 98,367 / Defender 78,707. A unit can only
Full-Burst if the team completes a B1→B2→B3 chain — a lone/enabler-less unit makes ZERO full bursts
(so its burst-gated lines never fire). Assume the standard control team context unless told otherwise.

## Step 5 — Self-validate (mandatory before you finish)
Write the candidate override to `src/skills/overrides/<slug>.json`, then:
- `npx tsx scripts/validate-overrides.ts <slug>` — must pass (requires all three slots + `unmodeled`).
- NOTE: since the engine never falls back to prose, a blind-prepped unit (its override moved aside)
  THROWS in any sim until your candidate file is written — write-before-sim is mandatory, not optional.
- Sim it and read the per-line DBG to confirm EACH implemented block fires over the whole fight (no
  `DBG_N` cap that hides late procs; confirm the side-effect — gauge/damage — not just a log line).
  Use the battery/experiment harness (see `scripts/battery/lib.ts` `runOnce`, or `scripts/experiment.ts`
  with `DBG_UNIT=<slug> DBG_BUFFS=1`).
- Report the resulting ratio(s) if a graded comp / control team exists for the unit.

## Step 6 — New-unit review gate (there is NO automated grade for a genuinely-unmodeled unit)
`scripts/kit-parse/grade.ts` only grades units that appear in one of the recorded reference teams
(rrh/moran/jill controls). For a **genuinely new/unmodeled unit there is NO grade case at all** — the only
automated checks are `validate-overrides` + a self-sim (does it run, do blocks fire). Sim-vs-sim grading
also can HIDE board blast radius (a candidate once graded ~1.006 in its control team while moving the whole
board +13.76%). So the accuracy check is NOT automated — a human (or a Fable review) MUST run
**mechanism-capture** on the parse before it's used. Deliver this checklist with the output so the reviewer
can run it:
- [ ] **Every kit line is accounted for** in the audit table (IMPLEMENTED or SKIPPED-with-reason) — no silent drops.
- [ ] **Every HARD-RULE class present in the kit is modeled** (weapon-state / heal-shield-DEF-HP-lifesteal-gauge / Hit-Rate / recurring-conditional-trigger) — none parked in `unmodeled`.
- [ ] **Every IMPLEMENTED block fires in the DBG** over the whole fight (side-effect confirmed, not just presence).
- [ ] **Every ALWAYS-⚑ field is flagged** with estimate + recipe (cadence tuple, kit-silent trigger, swap economy, stack haircut, split-vs-merge, per-kit noFb, Hit-Rate magnitude).
- [ ] **Blast-radius sanity**: if the unit is a team buffer/enabler, note which teammates its buffs touch (a `/sim-battery` diff is the real check before any board-level claim).
- [ ] **The hypothesis banner is present** in the note and every ⚑ is still open.
Escalation: a genuinely new unit's baseline is a HYPOTHESIS to hand-tune against a recording, NOT a
finished model — the checklist gates whether it's a SOUND hypothesis, not whether it's accurate.

## MANDATORY cadence + reload ⚑ (never skip — a blind parse cannot verify these)
The datamined rate-of-fire and reload timing are the #1 cause of a unit being 2×-off, and they are
NOT derivable from kit text — so you MUST ALWAYS emit a needs-measurement ⚑ for the **full cadence
tuple**: `pullsPerSec` (rate of fire), `reloadFrames` (reload time), AND any rolling-reload /
`reload_start_ammo` behavior. Ship the datamined value as the initial estimate; recipe = "read
rounds/min + the reload gap from any focus video." This is unconditional — prior 1's "uniform
hot/cold" tell is a POST-grade diagnostic you don't have while parsing blind, so the flag is the
fallback. (Root case: Jill's datamined fire-rate is 1.6× too fast → a blind parse over-fired her
2.2×; her real 2.5 pulls/s + reloadFrames 0 are video-only.)

**ESCALATE the cadence ⚑ to TOP priority (likely-wrong, not just unverified) when the TEXT betrays a
non-class fire mode** — you can catch these WITHOUT video:
- **Implausible mag-empty time**: compute ammo ÷ class-default rate; if the magazine empties in
  well under ~1s (e.g. a low-ammo AR/SR firing at the class rate), the datamined cadence is almost
  certainly a per-shot/charge weapon mis-tagged — flag it as probably-wrong.
- **Kit flavor implying a special fire mode**: "Magnum" / revolver-style / "per N rounds" mechanics
  on low ammo, charge/burst-fire language, etc. — these rarely fire at the weapon-class default.
- **Charge weapons (SR/RL) — autofire vs bolt gap (Mihara/Liberalio batch):** whether a charge weapon
  AUTOFIRES (→ `charFixes.noBoltRecovery`) or takes the default 22-frame bolt-recovery gap is a
  ~15–20% shot-count swing and is NOT text-derivable. NEVER set `noBoltRecovery` unmeasured — ship the
  default (gap ON) and ⚑ it ("verify autofire; if confirmed `noBoltRecovery:true`").

## ALWAYS-⚑ taxonomy — fields outside the input domain (never ship silently)
The held-out study (2026-07-15) proved every parser miss is the SAME class: a value that is NOT in
your input domain — either the **datamine field is known-unreliable**, or the **kit text is silent**
and you had to invent it. Your job is to FLAG that uncertainty with an estimate, never hide it behind
a plausible-looking default. These are ALWAYS a ⚑ (with initial estimate + recipe), every unit:

1. **Cadence tuple** — rate-of-fire / `reloadFrames` / rolling-reload. *Datamine-unreliable.* (see the
   MANDATORY cadence rule above; escalate on the ammo-empty-time / fire-mode-flavor text tells.)
2. **A damage line the text gives NO trigger for** — if you had to INVENT the activation (e.g. a bare
   "Deals X% as damage" with no "when …"), flag the invented trigger + cadence. *Kit-silent.*
   (Root: Snow White's 144.73% S2 line — no trigger in the datamine; the guess is a ⚑.)
3. **Weapon-swap shot economy** — shots-fired per burst / `maxShots` vs `durationSec` for a
   `weaponSwap`. The text rarely states how many swapped shots actually land. *Kit-silent.*
   (Root: Snow White's burst charge-cannon — 1 vs 2 shots is a big lever.)
   **BIAS CORRECTION (2026-07-16, Red-Hood/RRH, n=2): in-burst swap windows run FIRE-RATE-GATED and
   effectively RELOAD-FREE, and if the swap grants ≥100% charge speed the charge is EFFECTIVELY INSTANT.**
   So estimate the window shot count OPTIMISTICALLY = window_seconds ÷ fire_period (not charge-limited,
   not reload-interrupted) — the blind default (bolt gap + reloads + partial charge) systematically
   UNDER-counts these windows ~2-3× and this class DOMINATES the unit's damage. Ship the optimistic
   estimate, ⚑ TOP-priority. (Root: Red Hood's Red Wolf window read 45% cold blind purely from a
   charge-limited + reloaded swap estimate; the real economy is unlimited-ammo + instant-charge.)
4. **Stack / currency steady-state average + ramp haircut** (prior 4). *Measured-only* for the exact
   rebuild rate — but if the kit STATES start + consume + rebuild, the trajectory is DERIVABLE, so
   DERIVE it (don't ship cap-tier): continuous level-scaling effects → derived TIME-AVERAGE anchored at
   the stated START (never a ramp-from-0 keyed to the rebuild trigger); threshold-gated effects → count
   activations that clear the threshold at the derived value, honoring consume ORDERING ("▼K after the
   effect applied" ⇒ the gate checks PRE-consume). The ⚑ estimate is the DERIVED trajectory. (prior 4
   Derivable-currency refinement — the Soda Golden-Chip crit-dmg + ATK-threshold bugs.)
5. **Multi-projectile split-vs-merge** (prior 5). *Kit-silent — read popups.*
6. **`noFb` per-kit** — default OFF (FB by timing, prior 2); set ONLY with measured FB-OFF evidence.
7. **Hit-Rate → core-rate magnitude** (hard rule 4). *Measured-only.*

META-RULE: a value that is not literally in the kit text, OR comes from a datamine field with a
track record of being wrong (`rate_of_fire`, `reloadFrames`), MUST be a ⚑ — a plausible datamine
number shipped silently is the failure mode this whole taxonomy exists to prevent.

## Needs-measurement protocol (⚑) — the directional-tuning contract
For ANY value you cannot derive from the kit text alone (ramp/uptime haircut, landing/pellet fraction,
proc blend cadence, a calibrated core rate, a per-kit noFb/noRange decision, a split-vs-merge call),
you MUST output an entry with ALL of:
- **field** — where it lives in the override (path).
- **initial estimate** — your best-guess value to ship in the baseline (so the unit sims NOW).
- **reasoning** — why that guess (which prior, what analogous unit, what arithmetic).
- **measurement recipe** — exactly what to record/read to pin it (e.g. "focused solo, per-magazine
  counter deltas → landing fraction"; "isolated slow-mo of one burst → instances/FB").
The estimate ships in the override so nothing is left un-simmable; the flag + recipe let us measure
real-vs-estimate and correct the prior DIRECTIONALLY. Never omit the estimate, never omit the flag.

**Close the loop — log the delta when a ⚑ resolves.** The estimate-vs-measured feedback is the pipeline's
only self-correction mechanism, and it only works if it's recorded. When a ⚑ is later pinned by a
measurement or a landed hand-tune, append a row to `docs/handoffs/kit-parse-flag-deltas.md`
(unit / field / prior / estimate / measured / delta / direction). Once any single prior accumulates ≥3
rows sharing a sign, that prior's default guess is biased — correct the prior. (The hand-tuner who
resolves the ⚑ owns the log entry; the parser subagent just ships the estimate + recipe that make it
measurable.)

## Output contract (return ALL of these)
1. **The override JSON** — valid against `types.ts`, written to `src/skills/overrides/<slug>.json`.
   ALL THREE slots present (empty array only for a genuinely effect-free slot), PLUS:
   - **`unmodeled`** (REQUIRED): `{ "skill1": [...], "skill2": [...], "burst": [...] }` — every kit-text
     line NOT represented as a block, VERBATIM (the machine-checkable twin of the audit table's SKIPPED
     rows; reasons stay in the `note`).
   - **`caveats`** (optional): display-only warning strings (`"<slot>: <message>"`) surfaced in the web
     ⚠️ tooltip/modeling notes — use for ⚑-estimate visibility (e.g. "skill2: swap shot economy is an
     unmeasured estimate").
2. **Per-line audit table** — every kit line → IMPLEMENTED (which effect) or SKIPPED (reason). SKIPPED
   rows and the `unmodeled` field must correspond 1:1.
3. **Needs-measurement list** — each entry per the ⚑ protocol above (field / estimate / reasoning / recipe).
4. **Self-sim result** — validate-overrides pass + the sim ratio(s) + confirmation each block fires.
5. **A `note` field in the JSON** summarizing the model + every skip reason + the ⚑ list (AI-facing
   shorthand OK), matching the existing override note style. **The note MUST BEGIN with the hypothesis
   banner** (verbatim, so the un-measured state is visible in the artifact itself):
   `PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned.`
   This banner is a STATE MARKER: its presence means "raw parser baseline, no recording yet." Whoever
   later hand-tunes the unit against a recording removes the banner (and logs the ⚑ deltas — see below).
