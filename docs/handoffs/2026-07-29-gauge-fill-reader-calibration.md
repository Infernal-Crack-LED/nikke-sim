# Gauge-fill reader calibration — the shared blocker for `maiden-ice-rose`, `alice`, `cinderella`

**Status:** OPEN. Nothing enacted. Engine untouched.
**Branch/worktree:** `focus-charge-gauge-per-unit` @ `../nikke-sim-wt-focus-charge-gauge` (parked,
unmerged, unpushed, behind `main`).
**Audience:** AI-facing handoff. Shorthand OK.

> **Terminology:** "anchor" below always means the CALIBRATION REFERENCE (the labeled
> `maiden-ice-rose` measurement). It never refers to the unit `anchor` (RL/Wind) or
> `anchor-innocent-maid` (RL/Water), neither of which appears in this work.

> **⚠ READ THIS FIRST — NO MEASURED VALUES FROM THE 2026-07-29 SESSION APPEAR IN THIS DOC, BY
> OWNER RULING.** That session produced several mutually-inconsistent per-shot numbers for
> `alice` and built explanatory narratives around each before verifying it. All of them are
> withdrawn. Do NOT go dig them out of the chat log, the commit messages, or `/tmp` and carry
> them in as premises — they are exactly the kind of unverified prior-result reuse the premise
> gate exists to catch. **Re-derive everything below from primary sources.**

---

## 0. What is already committed (reuse it, don't rebuild it)

- `scripts/probe/gauge-fill.py` — CV worker reading burst-gauge fill per frame. Self-calibrates
  the bar's extent from its own dark border row; measures the **dark unfilled track** (the fill
  and the raid-boss sky are not separable by a brightness floor); detects the **green full/ready
  state** explicitly instead of scoring it as 0%. Its header carries the full why.
- `scripts/tests/fixtures/gauge-fill-maiden-ice-rose-30fps.json` — committed 30fps series over
  the anchor recording.
- `scripts/tests/gauge-fill-anchor.test.ts` — 6 assertions pinning the reader against that
  fixture. **The large-step assertion is deliberately loose and is there to detect DRIFT, not to
  bless a value.** If this test's expectations get tightened, that is a finding, not a cleanup.

Do not modify `scripts/probe/scan-frames.py`'s `bar_frame()` — it answers a different question
(Full-Burst counts) and is validated on 8 team recordings.

---

## 1. The open question

The reader is scored against the repo's own labeled anchor: the 2026-07-13 hand pixel read in
`docs/data/burst-gauge.md` §6 for `maiden-ice-rose`, which records a per-pull total **and its two
sub-steps** — a weapon-shot contribution (focus-boosted) and a flat kit rider (no focus bonus).
That read predates every script here, so scoring against it is a genuinely independent check.

**QUESTION: is the reader's error UNIFORM across step sizes, or does it depend on step size?**

- If uniform → it is an ordinary scale error, correctable by one factor, and every downstream
  magnitude can be fixed by dividing.
- If step-size-dependent → **no scale factor can absorb it**, and any large-step magnitude the
  reader produces is untrustworthy until the mechanism is understood.

The anchor is the right instrument for this precisely because it delivers a **small** sub-step
and a **large** sub-step, with independently known values, in a single recording. Measure the
error on each separately and the answer falls out.

Two candidate explanations to discriminate:

- **(a) REAL** — the large sub-step genuinely generates more than the modelled value, i.e. a
  documented measured constant is wrong. This is a DECISIONS-tier claim and needs the full
  `/scientific-method` harness, not a quick landing.
- **(b) ARTEFACT** — a large jump's rise is inflated by rendering/sampling. The two sub-steps
  land close together in time, and UI bars commonly animate/overshoot toward a new value rather
  than snapping. A big jump caught mid-animation, or bleed from the adjacent sub-step, would
  inflate large steps while leaving small isolated ones accurate.

---

## 2. ⇒ THE PRIMARY INSTRUMENT IS SHOT-COUNTING, NOT PIXEL READING (owner ruling 2026-07-29)

**This supersedes pixel measurement as the first-line method and should be used before, and to
bound, any reader output.**

For a unit that fills the gauge from empty, the number of shots to reach full **bounds per-shot
generation arithmetically, with no pixel reading at all**:

> if N shots fill the bar and N−1 do not, then per-shot ∈ [100/N, 100/(N−1))

That is a counting measurement. It is robust to every failure mode that wrecked the pixel
approach — bar geometry, brightness thresholds, render states, animation, sampling rate. Its only
inputs are the shot count and the frame where the bar goes green.

**Use it as a hard sanity bound on everything else.** The owner applied exactly this check to
`alice` and it immediately excluded per-shot values the reader had produced. Any reader output
falling outside the counting bound is wrong, full stop — do not rationalise it, fix the reader.

Practical notes:

- The **full/ready transition is unambiguous and easy to time**: the bar turns GREEN and the
  "BURST" label is replaced by a stage hexagon. `gauge-fill.py` reports this as state `full`.
  Read the transition frame, not a percentage.
- Shot count comes from the unit's own firing structure (magazine size, cadence) cross-checked
  against the footage — verify it, don't assume the override's prose.
- Watch for a **partial opening shot**: the first shot of a fight may not be at full charge, and
  charge level scales the focus bonus. If so it contributes less than a steady-state shot and
  must not be counted as a full one. Establish this per unit rather than assuming.

---

## 3. The discriminating test

**Sampling-rate ladder on the anchor.** Source recordings are 60fps. Re-read
`docs/probes/tb2/tb2 3 maiden.MP4` with `scripts/probe/gauge-fill.py` at increasing `--fps`
(e.g. 5 → 15 → 30 → 60) and measure BOTH sub-steps against their documented values at each rate.

Pre-committed decision rule:

- **Large-step error shrinks monotonically as fps rises, converging on the documented value, while
  small-step error stays flat near zero → (b) ARTEFACT.** The reader is sound; adopt the highest
  practical sampling rate, note the minimum safe fps in the script header, tighten the vitest, and
  the large-step magnitudes become usable.
- **Large-step error is flat across sampling rates → (b) is not supported.** Escalate to (a) as a
  hypothesis about a real constant, which then runs the full `/scientific-method` pipeline on its
  own. Do NOT let it ride along with a unit-multiplier landing.
- **Both sub-steps err by the same ratio at every rate → ordinary scale error after all.** Derive
  the factor, apply it in one place, document it, done.

Supporting checks, cheap and worth doing in the same pass:

1. **Frame-level look at one large jump.** Step through consecutive 60fps frames across a single
   large sub-step and observe whether the bar snaps or animates/overshoots. This answers (b)
   directly by observation rather than by inference from aggregates.
2. **Counting cross-check on the anchor itself.** Apply §2 to `maiden-ice-rose` — pulls-to-full
   bounds her per-pull total independently of both the reader and the 2026-07-13 hand read. If
   that bound disagrees with the documented value, the anchor itself is in question and
   everything resting on it must pause.
3. **Sub-step ORDER.** Confirm which sub-step fires first from the footage. Do not assume the
   documented ordering; a mis-paired sub-step sequence would mis-attribute contributions between
   pulls and could by itself produce an apparent large-step inflation.

---

## 4. How this resolves each open unit

All three currently sit behind this one question.

### `maiden-ice-rose` — the anchor
Not a unit question. Under (a) her documented weapon sub-step is wrong and a measured constant
moves; under (b) nothing about her changes. Either way she stays the calibration reference.

### `alice` (SR/Fire — NOT `alice-wonderland-bunny`)
- Datamined `chargeMultiplier` / `fullChargeBonus` agree with each other; under the per-unit model
  (`fullChargeBonus/100`) they imply a specific multiplier. Verify from `data/characters.json` +
  `data/gauge-per-shot.json`, don't take it from memory.
- Engine currently pins her to the flat constant via `PENDING_TEAM_ISOLATION` (`src/engine/sim.ts`).
- Her kit generates NO gauge solo (S1 is `fullBurstEnter`, burst is `burstCast`, neither reachable
  with no Full Burst; skill2 empty) — so her solo per-shot gauge is unconfounded. **Confirm this
  from the override + a `DBG_GAUGE` run rather than trusting this sentence.**
- **The 2026-07-29 "isolating team-context gauge read" task was a CATEGORY ERROR and is retired.**
  `docs/probes/burst tests/alice focused.MP4` is an FB-COUNT recording; gauge reading is done on
  the solo video. There is no team gauge measurement to take. Do not re-file it.
- Her solo recording is short and contains only a handful of shots — that is the whole dataset;
  no rescan enlarges it. This makes §2 counting especially attractive for her, since counting
  needs only the shot tally and the green transition.
- **Resolution path:** counting bound (§2) + reader magnitude once trusted. If the two agree, her
  multiplier is settled at the same evidence tier that `scarlet-black-shadow` already landed on.

### `cinderella` (RL/Electric — NOT `cinderella-crystal-wave`)
- Pinned to the flat constant via the `magDumpRof` predicate in `gaugePerShot`.
- **Confounded in a way `alice` is not:** her S1 rider contributes gauge through `skillGauge`,
  which receives NO focus bonus. So her per-pull generation is `base × focusMult + rider`, and the
  rider term must be established before any multiplier can be backed out. Different assumptions
  about that rider give wildly different multipliers from the SAME measurement — verify it against
  the engine (`DBG_GAUGE`) rather than reasoning about it.
- Her magazine size is **not** a fixed constant: it is `round(ammo × (1 + maxAmmoPct/100)) +
  maxAmmoFlat` evaluated at each reload. It equals the datamined value only when no max-ammo buff
  is live — true solo, false in the graded control comp. Solo reads are therefore fine; do not
  reuse the assumption in team context.
- Her solo recording is long, but only the pre-full portion carries accumulation. **Once the gauge
  is full it stays full** — solo she is a lone Burst III, cannot cast, and nothing consumes it.
  A prior session misread the reader's post-full output as a gauge "consume"; it is the green
  full-state rendering. Scanning past the fill point yields nothing.
- **Resolution path:** rider term verified against the engine → counting bound (§2) on pulls-to-full
  → reader magnitude once trusted.

---

## 5. Premises to re-verify before planning (do not inherit)

Spawn `premise-verifier` agents per `/scientific-method` step 0. At minimum:

1. The documented anchor sub-step values and per-pull total, **quoted from
   `docs/data/burst-gauge.md` and traced to their `docs/probe-runs.md` origin** — including how
   the 2026-07-13 hand read established the bar's 0% and 100% reference points, since that is
   precisely what the reader also has to get right.
2. `cinderella`'s rider gauge contribution and whether it receives the focus bonus — from the
   engine, empirically.
3. Each unit's per-shot/per-pull firing structure and whether the opening shot is full-charge.
4. Both units' datamined values and current engine pin state.

## 6. Known traps

- **A sim/real divergence is live and out of scope here:** at gauge-full the engine opens the
  chain, zeroes the gauge and halts generation even with no Burst I present, while the real bar
  holds full. Damage-inert for a lone-Burst-III solo run (nothing casts either way), so it does
  not affect these measurements — but it must not be "fixed" as a side-effect of this work, and
  it should be filed separately.
- **Evidence proportionality:** settling the reader is TOOLING and runs the cheap lane —
  `verify.sh` plus the committed fixture are its gate. The unit MULTIPLIERS it then feeds are
  damage-model values and require the full pipeline. Do not let a tooling fix carry an engine
  constant change along with it in the same motion.
- **Do not invent a calibration constant to make a number come out right.** A factor that fixes
  the large step while breaking the currently-exact small step is a fudge, not a calibration.
