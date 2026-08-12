# Modeling priors — start new characters from the accumulated fit

Recurring correction patterns mined across all hand-tunes, so a fresh override starts close instead
of re-discovering the same fix. Maintained by the `/tuning-priors` skill. A **pattern** is the same
root-cause fix seen in **three or more units**; each names the game mechanic it comes from.

Two classes: **engine defaults** (a prior that held universally and was promoted to automatic engine
behavior) and **per-kit priors** (apply as a starting guess, then verify per unit — genuinely varies).

## Engine defaults (already automatic — no per-unit action)

- **Release latency** — snipers and rocket launchers carry a ~22-frame (~0.37 s) bolt-recovery gap
  between shots by default; autofire units are exempt (`charFixes.noBoltRecovery`). Graduated from
  Mint (1.21→0.91), Trina, Maiden, Helm.
  **MANDATORY ⚑ for a blind parse of any charge weapon (SR/RL, 2026-07-16, Liberalio batch):** whether
  the unit AUTOFIRES (→ `noBoltRecovery`) vs takes the 22f bolt gap is a **~15–20% shot-count swing** and
  is NOT derivable from kit text. NEVER set `charFixes.noBoltRecovery` unmeasured (that would be
  fudge-over-measured); ship the engine default (bolt gap ON) and emit a cadence ⚑: "verify autofire; if
  confirmed, `noBoltRecovery:true` — ~15–20% shot count." (Root: Liberalio's blind parse read 12–20% cold
  purely because she is an autofire SR whose `noBoltRecovery` is measured, not text-visible.)
- **Machine-gun wind-up ladder** — the measured ramp, applied to every machine gun (measured
  constant, never refit).
- **Focus gauge** — the camera-focused unit generates ×2.5 burst gauge **only on charge-weapon
  shots** (snipers/launchers). Focusing a non-charge weapon (machine gun, submachine gun, assault
  rifle, shotgun) adds essentially no gauge. So which unit holds the camera changes a fight only
  when that unit is a charge weapon.
- **Distributed damage** deals full value against a single target — never model a split penalty.
- **Stat basis** — scope lock uses **Base 5 gear** (corrected 2026-07-14, was OL0).

## Per-kit priors (apply as the starting guess, verify per unit)

1. **Cadence / rate-of-fire is the #1 cause of uniform heat.** When a unit reads uniformly hot or
   cold across a fight, suspect the datamined `rate_of_fire` / proc cadence BEFORE touching damage
   values — the value is usually right and the frequency is wrong. Fixed this way: Jill
   (1.67→1.02, real 150 rounds/min), Cinderella (1.67 was cadence), Scarlet: Black Shadow (proc
   blend every 6→10 shots), Maiden (×0.68 was cadence, not value).
   **Blind-safe fallback (2026-07-15, held-out zero-shot):** the "uniform hot/cold" tell is a
   POST-grade diagnostic — you don't have it when authoring a baseline blind. So ALWAYS emit a
   needs-measurement ⚑ for the cadence + reload tuple (`pullsPerSec`, `reloadFrames`, rolling-reload)
   with the datamine as the estimate. TEXT-VISIBLE ESCALATION (catchable without video): a low-ammo
   weapon whose magazine would empty in <1s at the class-default rate, or "Magnum"/revolver/"per-N-
   round" flavor, is almost certainly NOT firing at the class default — escalate to probably-wrong.
   (Jill's datamined rate over-fired a blind parse 2.2×; her real 2.5 pulls/s is video-only.)

2. **Function-damage riders: Full-Burst is a TIMING gate (default ON); range is universally OFF.**
   A non-burst-cast rider / proc / DoT that LANDS during the Full-Burst window SHOULD get the +50%
   — do **NOT** set `noFb` by default. (The old "riders are FB-exempt" default was a calibration
   RELIC masking cadence over-models; the engine's end-state default is `'timing'` — see
   `skillNoFb` in sim.ts + DECISIONS/open-questions U14.) Set `noFb:true` ONLY with per-kit
   MEASURED FB-OFF evidence. Measured ground truth: Ein feathers FB-ON, Liberalio proc FB-ON
   (×1.3333), Scarlet: Black Shadow procs FB-OFF, all burst-cast nukes FB-OFF. **Burst-cast /
   instant damage is ALWAYS FB-exempt** — the engine auto-handles it (snapshots pre-FB), so you
   never set `noFb` for a burst-cast line. The **+30% range bonus is UNIVERSALLY off for every
   rider** (the engine force-sets `noRange` at the deal site, sim.ts) — writing `noRange:true` is
   redundant, never required, and never the thing to flag.
   **CORE on riders — text-fidelity rule (2026-07-16, CCW batch, U1):** function-type additional-damage
   riders CRIT (at the caster's rate) but get NO core by default — EXCEPT when the kit text EXPLICITLY
   labels the damage as core (e.g. "Deals X% … as **core strike damage**"), in which case FOLLOW THE TEXT
   (`core:true` / the coreOverride path) and ⚑ it. (Root: Cinderella: Crystal Wave's FB-enter "833.79% …
   core strike damage" proc — the hand-tune wrongly stripped core AND set a pre-FB `burstCast` trigger,
   reading ~13% cold; the text-faithful rider [core + FB-by-timing] reconciles it to ~1.0 vs real. Never
   guess core presence — read the text.)

3. **The parser drops sustained damage-over-time lines and unsupported triggers → undercounts.**
   (The parser is now offline-only — 2026-07-16 prose-free runtime — so this applies when reviewing a
   materialized baseline or an offline parse draft; the dropped lines appear verbatim in the override's
   `unmodeled` field.) Scan a new parse for missing burst/DoT lines and rebuild them as real-interval
   DoTs. Fixed:
   Modernia (a per-hit stack read as 1/s), Milk: Blooming Bunny (S2 burst DoT dropped), and many
   "parser skipped …" notes.
   **DoT-OVERLAP encoding (2026-07-16, Mihara batch, Fable-confirmed in-engine):** the engine APPENDS
   a new independent DoT instance every time a `dot` block fires and NEVER refreshes/dedups/replaces
   (sim.ts `dots.push`, ticks independently to each instance's own `endFrame` at 1583-1597). So a
   long-`durationSec` DoT on a REPEATING trigger MULTIPLIES: a dur-60 DoT re-applied every ~16s accrues
   ~3.7 concurrent instances → ~3.7× over-count. To model a CONTINUOUS / maintained sustained DoT at
   steady-state, encode it as ONE `passive` instance with `durationSec` ≥ the fight length (or ensure any
   repeating-trigger DoT has `durationSec` ≤ its trigger interval). CARVE-OUT: if the kit text says the
   DoT genuinely STACKS (independent accumulating instances), the repeating-trigger encoding IS the
   faithful one — this rule targets steady-state approximations of a single maintained DoT, not real
   stacking DoTs. (Root: Mihara's Ensnaring dur-60 on fullBurstEnd = ~2× over; the hand-tune uses one
   passive dur-999 instance.)

4. **Stack / currency mechanics → model as steady-state throughput with a ramp haircut.** The
   average stack level over the fight is the calibration knob. Fixed: Mihara (stacks 10.8→12),
   Cinderella (the Beautiful ramp), Soda: Twinkling Bunny (Golden Chip economy). Guillotine: Winter
   Slayer (Hero Level) is the current open case in this family.
   **DERIVABLE-CURRENCY refinement (2026-07-16, Soda SG zero-shot, Fable-approved):** when a currency
   has a kit-STATED start + consume + rebuild, its trajectory is DERIVABLE — compute it; never default
   to cap-tier, a bare steady-state guess, or worst-case. Three sub-rules:
   - **Continuous level-scaling effects** ("X% per stack, up to N"): model at the derived TIME-AVERAGE
     level, RESPECTING the stated START. A currency that starts at cap means the effect starts near cap.
     **NEVER model it as a ramp-from-0 keyed to the rebuild trigger** — the rebuild trigger is how the
     currency is GAINED, not the effect's stack count. (Root bug: a currency that STARTS at its cap had
     its per-stack crit-damage mis-modeled as a slow ramp built via the in-FB rebuild trigger → reached
     a handful of stacks when the pool actually starts full and stays high; the popup on the very first
     shot, before any rebuild casts, already carried the near-cap crit multiplier — arithmetic proof
     that the effect tracks the pool level, not a from-0 ramp.)
   - **Threshold-gated effects** ("activates when ≥ X"): evaluate EACH activation against the derived
     currency value AT THAT MOMENT, honoring the stated CONSUME ORDERING. Text "stacks ▼K after the
     effect applied" means the gate checks the PRE-consume count — so a burst that consumes on cast
     clears its own threshold at the higher pre-consume value. Ship the derived activation count
     (all-bursts, or an `everyN` pattern), NOT the cap-tier and NOT a naive post-consume trace.
     (Root bug: a burst ATK buff gated "@≥high-threshold" fires on EVERY burst when the pre-consume
     pool clears the gate each time — mis-read as first-burst-only by tracing the POST-consume pool,
     the classic isolated-shard error.)
   - **SAWTOOTH currencies** (build toward a cap, then a trigger RESETS/CANCELS them to 0 — e.g. "the
     burst cancels the stacks"): the time-average is ≈ HALF the typical PEAK, default **cap/2** absent
     cadence info (if the reset fires before the cap is reached, it's half the actual peak, below cap/2).
     Ship cap/2 as the estimate — NOT near-cap. The ⚑ must name the RESET trigger + its interval so the
     hand-tuner can refine. (Trusted hand-tunes for sawtooth stacks sit ~0.55–0.7×cap, so cap/2 runs
     slightly cold — the correct conservative direction for a ⚑. Root: Mihara's Ensnaring/Dragging chains
     modeled near-cap 15/20 blind vs the hand-tune's ~cap/2 10.8/14.)
   - Keep both the average level and the activation count as ⚑ (the rebuild rate is cadence-dependent),
     but the ESTIMATE is the DERIVED trajectory, not the cap.

5. **Multi-projectile weapons either split into N damage instances or merge into one — per-unit,
   video-verify.** Cinderella's twin rockets are two separate instances; Maiden's twins merge into
   one; Vesti fires a volley. Don't assume; read the popups.

6. **HP-scaling kits count the unit's OWN Max HP only** — ally Max-HP grants do not feed the
   conversion. Fixed: Cinderella.

7. **Element advantage is a clean ×1.10 on the total UNLESS the kit carries an elemental-advantage
   damage buff** (Superior Elemental Code and similar) — then it exceeds ×1.10 and must be modeled.
   Confirmed ×1.1000 exact for the four control anchors (Little Mermaid, Crown, Helm, Snow White —
   no kit element interaction), which is why they can be recorded neutral and multiplied.

8. **Heals are NOT always defensive — some kits trigger damage buffs on recovery.** The parser
   blanket-drops everything matching `heal / recover / restore / potency` as out-of-scope, which is
   wrong when a teammate keys a damage buff off "when recovery takes effect." Root example: Helm's
   0.59% full-charge heal (~every 1.5 s) drives **Crown's team ATK ▲ 20.99% on recovery** to
   near-permanent uptime — dropping the heal left every Crown+Helm team ~15% cold. Engine support:
   the `heal` effect (event-only) + `recovery` trigger (2026-07-14). When auditing a healer OR a
   unit with an "on recovery / when healed" clause, wire the heal→buff pair.

9. **Weapon-state modifiers — reload speed, ammo, attack/charge speed — ARE damage mechanics; never
   drop them as "defensive."** They gate SHOT COUNT, and shot count gates damage. Classifying one
   "defensive, no damage" requires PROVING it doesn't change shots fired. Root example (2026-07-15):
   Grave's S1 "Heat Emission: Reload Ratio ▼50%" was dropped as defensive — but her measured reload
   is 3.35s/201f vs the datamined 81f, over-firing her by ~30% (solo 1.277). Modeled via
   `charFixes.reloadFrames` (a MEASURED effective-reload override that composes with real reload-speed
   buffs — NOT a fake `reloadSpeedPct`, which breaks composition). This is the **2nd time a shot-count
   channel was mispriced** (SG pellet landing was the 1st) — the audit for it: for every reload /
   ammo / unlimited-ammo / fire-rate / charge-speed line, ask "does this change shots fired?" before
   ever writing "defensive." See DECISIONS 2026-07-15 (grave) + [[reload-speed-affects-damage]].

10. **`burstCast` vs `fullBurstEnter` — trigger fidelity (a boolean-inversion trap).** They coincide
    ONLY when the unit is the sole burster of its tier and diverge in any team with another same-tier
    unit. Read the activation text literally: **"when using Burst Skill" / a self mode granted in the
    unit's OWN Burst block / "entering Full Burst AFTER this unit uses her Burst Skill"** → `burstCast`
    (fires only on the rotations THIS unit bursts). **"when entering Full Burst" / "during Full Burst"**
    → `fullBurstEnter` (fires for the unit on team-FB entry regardless of who bursted — correct even for
    a self buff worded this way). **"when Full Burst ends"** → `fullBurstEnd`. Keying a burst-cast-gated
    effect to `fullBurstEnter` OVER-CREDITS: it then fires on FBs a DIFFERENT same-tier unit produced.
    A burst-gained self MODE removed at FB end (arcana-fortune-mate Making Memories) is `burstCast` +
    `durationSec` spanning burst→FB-exit. `fbGate` only checks FB-state at trigger time — it does not
    window a duration'd buff. (Root 2026-07-16: arcana MM keyed to `fullBurstEnter` over-credited every
    multi-B2 team; audit also flagged cinderella-crystal-wave's burst nuke, same class.)

11. **Healing SCOPE decides whether a heal is inert — read the target, not the magnitude (owner
    ruling 2026-08-10).** The sim has no HP pool, so a heal's only reachable consequence is firing a
    `recovery`-triggered block — and `fireRecovery` fires the blocks of the unit that RECEIVED the
    heal, nobody else. So: an **ally/team-scoped** heal is LIVE (it can reach a teammate's
    on-recovery consumer — crown's "when recovery takes effect → team Attack Damage ▲" is the
    canonical one) and must be encoded, while a **self-scoped** lifesteal ("Recovers X% of attack
    damage as HP") reaches a consumer only if the CARRIER itself owns a `recovery` block. **Prior for
    a new unit: record self-scoped lifesteal in `unmodeled` and emit NO `heal`** — but check the
    carrier's own kit for an on-recovery line first, because that flips it. `asuka` (AR/Fire, the
    BASE unit — not `asuka-wille`) is the live counterexample: her S1 is
    `recovery → self atkPct 96.98 / 25s`, so a self-heal on HER is worth ~97% ATK, not zero. Do not
    read "self-scoped, therefore inert" as a property of lifesteal; it is a property of the pairing.
    A second reason to withhold the emit: lifesteal is a per-hit line, so emitting turns it into a
    hit-cadence event stream, and that cadence is unmeasured. Roster when this landed: 8 of 13
    carriers emit, 5 do not — `d` (SMG/Wind, not `d-killer-wife`), `moran`, `red-hood` (SR/Iron, not
    `rapi-red-hood`), `rem`, `tia` — and none of the five owns a `recovery` block, so all five are
    inert today and stay recorded-only. The two consumers roster-wide: `asuka` (self) and `crown`
    (allies, fired when `crown` herself is healed).

12. **STACKS REFRESH — the whole stack, not the oldest one — unless a kit says otherwise (OWNER
    RULING 2026-08-11).** This is a GAME-WIDE rule, not a per-unit finding: when a stacking buff
    re-triggers, the existing stacks' duration is refreshed rather than each application expiring
    individually. Model a stacking line as "ratchets up while the trigger keeps firing, and lapses
    only when the whole window goes cold" — which is what the engine already does (`applyBuff`
    refreshes the instance's expiry on every re-application, and `maxStacks` caps the count).
    **Why it matters: the failure mode it rules out is a gate that never opens.** If stacks expired
    individually, a slow trigger would plateau below its cap and any "at max stacks" gate would be
    dead code — you would model a kit line, watch it never fire, and go looking for the bug in the
    gate. Concrete case: `ade-agent-bunny`'s Spy Lens (10 stacks) gates her S2 Pierce package; under
    per-application expiry she would plateau at ~3–5 and the whole package would be unreachable. It
    reaches the cap, so the gate is live and the package is real. Same reasoning underwrites `leona`
    and `guilty`, whose steady-state stack level the engine COMPUTES from cadence rather than baking
    (see the F7 verification in the faithfulness audit).
    **The exception is the kit text itself** — a line that spells out per-application expiry, or a
    "cannot be refreshed"/"does not refresh" clause, overrides this. Absent such wording, assume
    refresh, and do NOT spend a recording establishing it.

## The offsetting-errors principle (why bare-frame + firing-validation matter)

A unit graded ~1.0 in normal (buffed, advantaged) teams can still be **wrong** — its value calibrated
to _absorb_ a missing shared buff. The minimal-variable neutral **control-frame** test (see
`scripts/battery/ref-calibration.ts`) strips buffs/advantage and exposes the base truth; the four
control anchors read 0.85–0.97 bare while grading ~1.0 in the board. Corollary: **"modeled" is not
"working."** Crown's team ATK buff was a fixed self-cadence proxy (~27% uptime) instead of
heal-triggered (near-permanent via Helm), and Helm's "defensive" heal — the trigger — was dropped
entirely. Always **run-validate** that a modeled block fires at the right rate (DBG taps), don't
trust its presence in the override.

**But run-validation itself needs care — DBG can lie.** While chasing the above I twice mis-read
the DBG: `DBG_N=200` capped the instance dump so a barrage that fires 20× looked like it fired
"once," and `fillGauge` writes gauge directly with no `[g]` log line so a firing effect looked like
it "never fired." Count over the WHOLE fight with no cap, and confirm the effect's side-effect
(gauge/damage), not just a log line. LM's `teamAmmo` gauge-fill + barrage are in fact working
(20 fires) — there was no bug there.

## A datamined NOMINAL rate is not the EFFECTIVE rate — check frame quantization

**The game fires on 60 fps frame boundaries, so a datamined `rate_of_fire` only survives intact if
it divides evenly into 60.** Before trusting any per-second cadence taken from the weapon table,
compute `60 / (rate_of_fire / 60)` and ask whether it is a whole number of frames. If it is not, the
engine cannot hit the nominal rate — it rounds the interval UP, and the effective rate is
`60 / ceil(frames)`.

Census of the whole roster (2026-07-23): **SMG is the only weapon this bites.** AR 720→5f and 150→24f
(`jill`), MG 3600→1f, RL 60/90/120/180/300→60/40/30/20/12f, SG 90→40f, SR 60/200→60/18f are all exact.
SMG's 1440 rpm = 24/s = **2.5 frames** → `ceil` to 3 → **20.0/s**, which is exactly what the ammo
counter measures. That single 20% over-count is why SMG was the only weapon class whose board mean sat
above 1.0 (`liter` 1.208, `chisato` 1.154, `quency-escape-queen` 1.174 — all collapse to ~1.0 under
the corrected rate).

**The generalizable lesson: a "the game source is authoritative" adoption can be right about the
NOMINAL quantity and wrong about the EFFECTIVE one.** The 2026-07-17 SMG 20→24 change was made on
exactly that reasoning, using FB counts as its only instrument — but **FB counts measure gauge/second
while the ammo counter measures shots/second**, so they could not discriminate the two. When a
datamined value and a board reading disagree, find the instrument that measures the disputed quantity
_directly_ rather than the one that is merely downstream of it.

**A "▼N% Attack speed" line on a weapon-swap burst must scale the swap weapon's OWN nominal rate, not
the base weapon's already-quantized effective rate (2026-08-03, `k`).** `k`'s burst swaps to a slower
weapon kit-texted "Attack speed ▼90%"; the first pass computed this as `20.0/s (the base SMG's
frame-quantized effective rate) × 0.10 = 2.0/s`, silently compounding the base weapon's own
quantization loss into the swap's cadence. The correct order of operations is `1440 rpm (the base
weapon's NOMINAL rate_of_fire) × 0.10 = 144 rpm = 2.4/s nominal`, THEN frame-quantize that fresh
(`quantizeToFrames`) — which for 144 rpm lands on an exact 25-frame interval (2.4/s, no rounding loss)
and is 20% higher than the wrong order gives. Percentage modifiers always apply to a NOMINAL rate;
quantization is the LAST step, never something to chain twice.

## "Damage X% ... Pelletcount N" is the FULL-SHOT total, never per-pellet

A kit line shaped "Damage: X% of the final ATK / Pelletcount: N" (shotguns, and any weapon-swap into
a shotgun-like weapon) states the TOTAL of the whole shot assuming every pellet lands — each pellet
individually carries `X/N`% — the same convention every SG-class unit's `normalAttackMultiplier`
already uses in this engine (confirmed against MEASURED popup data: `dorothy-serendipity`'s "Damage
201.5%, Pelletcount 10" matches her measured one-full-shot total to within 2%; a per-pellet reading
predicts 10× too high). **The tell that this was misread once already (`k`, 2026-08-02→2026-08-03):**
the value was encoded as `X × N` (one collapsed hit worth the WHOLE multiplied total) instead of `X`
(the shot's already-total value, to be split across landed pellets). If a future SG/pellet kit line
reads suspiciously large relative to a comparable already-implemented SG unit's multiplier, check this
first before assuming a new mechanic. This also means any weapon-swap into a pellet weapon should be
declared `weapon: "SG"` (with a `pelletCount`) so it inherits the real accuracy-circle pellet-landing
model and near-band-only range eligibility, not a flat 100%-landing shortcut — no other primitive in
the engine currently grants a swap that model unless the override explicitly asks for it.

## Measuring fire cadence: two frames beat a whole session

The cheapest high-value read in the toolkit. The ammo counter is the designated shot clock, so
**two frames 0.5 s apart give the cadence outright** — no OCR, no popup attribution, no lattice:

1. Find a window where the focus unit is firing and no reload intervenes.
2. Extract frames at `t` and `t+0.5` and read the counter (`076` → `066` = 10 rounds = 20/s).
3. Repeat in a DIFFERENT range band — a rate that holds across bands is the weapon's, not an artifact.

Gotcha that costs the most time: **the ammo box is anchored to the crosshair and moves across the
frame with the boss's range band.** A fixed ffmpeg crop that worked at t=60 will be empty at t=100 and
read as "no data" rather than "wrong crop". Relocate it per sample, or crop a full-width band.

## New-character starting checklist

Apply before the first sim of a fresh override, in order:

1. Gear basis = Base 5 (scope lock); release latency on unless autofire-confirmed.
2. Sanity-check the datamined cadence / rate-of-fire against reality (prior 1); if reality is
   unavailable (blind baseline), ALWAYS emit the cadence + reload ⚑, and escalate on the text tells.
3. Scan the parse for dropped burst / DoT lines and unsupported triggers → rebuild (prior 3); the
   override's `unmodeled` field lists exactly what the offline parse dropped — start there.
4. Identify stack / currency mechanics → steady-state with a ramp haircut (prior 4).
5. Identify function-damage riders → FB-by-timing DEFAULT (do NOT set `noFb`); `noRange` is
   automatic/universal (don't set it); set `noFb` only with measured FB-OFF evidence (prior 2).
6. Check for multi-projectile weapons → decide split vs merge from video (prior 5).
7. Check for HP-scaling → own Max HP only (prior 6).
8. Element advantage → default ×1.10 unless a Superior-Elemental-Code-style buff (prior 7).
9. Scan for weapon-state lines (reload/ammo/unlimited-ammo/fire-rate/charge-speed) → they gate shot
   count = damage; never drop as "defensive" without proving shots are unchanged (prior 9).

## Exceptions log

When a fresh tune contradicts a prior, record it here (it usually means the pattern is per-kit, not
universal). None recorded yet beyond the per-kit caveats already noted in priors 2 and 5.
