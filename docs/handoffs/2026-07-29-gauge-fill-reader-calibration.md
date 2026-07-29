# Gauge-fill reader calibration — the shared blocker for `maiden-ice-rose`, `alice`, `cinderella`

**Status:** PARTIALLY SUPERSEDED by §OWNER-RULINGS (2026-07-29, third pass — read it first).
The owner (1) REJECTED hypothesis (a)'s overcharge mechanism outright — the datamined charge cap
is correct, there is no overcharge — and (2) bounded tb2-test-3 footage viability to **0:06–0:17**,
which WITHDRAWS the shot-counting anchor exclusion (its endpoint evidence sits at t≈17.2–18.8,
outside the bound). Reader: shape + small-step magnitude settled; large-step magnitude UNRESOLVED.
`alice`/`cinderella` un-paused on the surviving basis (§OWNER-RULINGS consequence 3).
Engine untouched.
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
- **The documented crop (`400:160:2350:430`) mis-locks on TEAM-HUD recordings (2026-07-29,
  `docs/probes/burst tests/alice focused.MP4`).** The team HUD's charging bar is ~185px wide at a
  different offset than the solo anchors' 138px bar; run against the documented crop the reader
  self-calibrated to a 128px sub-region and produced stuck ~44-57% reads that did not track the
  gauge at all (one such read was reported as "the bar is ~40% full after the first shot" — owner
  correction: the true first-shot fill is ~10% at most; the 40% was the mis-lock, not the gauge).
  A tight crop on the actual bar (`200:60:2405:475`, self-cal 177px) produced a coherent curve:
  widget in at t≈9.93 with 23.5% TOTAL team gauge (SMG/MG trickle + Alice's opener, NOT one
  shot — teammate ramp between snaps measures ≈11.7%/s), one clean Alice snap +15.8-16.9% at
  t≈13.17 (scope HUD read CHARGE 329% just before — an early release vs the 350% cap), green/full
  at t≈14.90 (stage hexagon visually confirmed 15.2). §2 counting stays the primary instrument;
  on any non-solo recording, CHECK the reported bar width against the true bar before trusting
  any fill percentage, and treat "first plateau" as team-sum, never as one unit's shot.

---

## §RESULT (2026-07-29, second session — Kimi driver)

The discriminating test and all three supporting checks are DONE. Everything below was re-derived
from primary sources (the recording, the ammo counter, the engine), per the owner ruling — no
2026-07-29-session values were carried in.

### Premise verification (§5) — all CONFIRM, with corrections

- **Anchor trace (§5.1, driver-verified):** documented values live in `docs/data/burst-gauge.md` §6
  and originate in `docs/probe-runs.md` (test-3 entry, 2026-07-13) + answered-questions A22. The doc
  is internally inconsistent on the rider: observed "+3.45%" vs modeled "364 — exact" (3.64%);
  open-questions U13 already flags that residual. **How the hand read established the bar's 0%/100%
  reference points is NOT documented anywhere** — that provenance gap is itself now load-bearing
  (see verdict).
- **`cinderella` rider (§5.2, premise-verifier, code + DBG_GAUGE):** S1 `shotFired` → `flatDamage`
  → `skillGauge()` = flat `targetPerTrigger` 45 per rocket, NO focus bonus (`src/engine/sim.ts`
  1398-1410, 2275). Weapon term pinned to flat 2.5× via `u.magDumpRof` (`sim.ts:1349`) — NOT
  `PENDING_TEAM_ISOLATION` (that set is `{alice, vesti-tactical-upgrade}` only, `sim.ts:1283`).
  Per pull focused today: 112.5 + 45 = 157.5 energy. ⚠ TRAP: `scripts/sim/<element>.ts` runners
  build `prepared` by hand and DROP `magDumpRof` (0.90/0.45 at 1 shot/s instead) — only the
  `prepareTeam` pipeline exercises the pinned path.
- **Firing structures (§5.3, premise-verifier):** `maiden-ice-rose` (RL/**Electric** — not Water)
  mag 6, 82f ≈ 1.37s/pull cycle, rider procs per full-charged shot; engine has no partial-charge
  path but REAL footage can open partial (confirmed, below). `alice` mag 6, 112f ≈ 1.87s/pull,
  NO gauge-generating skill even with Full Burst (S1/burst are buff-only, S2 empty) — her solo
  gauge is unconfounded. `cinderella` mag = `round(24 × (1+maxAmmoPct/100)) + maxAmmoFlat` per
  reload; dump cadence 20f (3 rockets/s) after one 60f prime.
- **Datamined + pins (§5.4, premise-verifier):** `alice` 560 target, `fullChargeBonus` 350 →
  un-pinned 19.6%/shot, pinned 14.0%/shot. `cinderella` 45 target, fcb 200 → un-pinned 0.90%/shot,
  pinned 1.125%/shot. `maiden-ice-rose` 364/250 → 9.1% weapon (un-pinned; family value).
  `scarlet-black-shadow` 250/150 → 3.75% enacted.

### The ladder (§3 discriminating test) — (b) NOT SUPPORTED

Cropped gauge-region frames (crop=400:160:2350:430, self-calibrated bar 138px) at 5/15/30/60fps;
my 30fps run reproduces the committed fixture BYTE-IDENTICALLY (450/450 reads). Weapon sub-step by
rate — 5fps: {9.4, 11.6, 10.1, 10.1} + two merged smears; 15fps: mean 10.07; 30fps: mean 10.10;
60fps: mean 9.98. **Flat across all rates, never converging on 9.1.** Rider sub-step: 3.6 at every
rate (matches model 3.64; the hand read's 3.45 is a quarter-column below the 5-column quantisation
floor). Per the pre-committed decision rule: large-step error flat ⇒ (b) is not supported.

### Supporting check 1 — frame-level: the bar SNAPS

Every weapon jump lands in EXACTLY ONE 60fps frame (e.g. t=12.650→12.670: 50.0→60.1; t=11.270→
11.280: 37.7→47.1). No multi-frame rise, no overshoot, no intermediate values. (b) is refuted by
direct observation, not just by the ladder aggregate.

### Supporting check 2 — counting cross-check (§2 owner instrument): the ANCHOR fails the bound

**8 shots fill the bar.** Ammo counter verified visually on full frames: `005` at t=7.00 (shot 1
fired), `000` at t=13.90 (mag 1 empty → the 14.03-17.20 reload), `004` at t=18.72 (2 shots into
mag 2). Full crosses at t=18.73, 0.16s after shot 8's rider sub-step — the exact rider→weapon
spacing of every other pull — with shot 8's rocket visibly exploding and its rider popup (437,296,
her documented non-crit rider value) on screen. Shot 1 was a PARTIAL-charge opener: weapon-only
+2.9% (~364 energy, c≈0), NO rider proc — consistent with her rider being gated to full-charged
shots (override note).

Bound (§2): 7 steady pulls P + partial E ≈ 3.6 ≥ 100 and 6P + E < 100 ⇒ **P ∈ [~13.6, ~16.0)**.
The documented 12.55%/pull — and the 910+364 model's 12.74% — are EXCLUDED. Under the model the
bar would sit at ~93% after shot 8's weapon and need a 9th shot; the footage fills on the 8th.
The reader's 13.73%/pull (3.63 + 10.1) closes the account: 7 × 13.73 + 3.6 = 99.7 ≈ 100.

§3.2's pause clause FIRES: the anchor's documented value disagrees with the counting bound, so
everything resting on the anchor is in question (see pause list below).

### Supporting check 3 — sub-step ORDER is rider-first

At every rate the small (rider) step precedes the large (weapon) step by 0.15-0.17s — the
documented "+9.1% then +3.45%" ordering is inverted in the footage. Consistent with rider proc on
FIRE, weapon gauge on rocket HIT. Order does not change per-pull totals at ≥15fps (both sub-steps
fully resolve); it matters only at 5fps, where a pull smears into one merged step.

### Verdict

- **The reader is NOT miscalibrated.** Rider exact vs model; weapon/per-pull corroborated by
  shot-counting (an instrument with no pixels in it); full-state detection correct; 30fps ==
  60fps. Adopted as trustworthy for shape AND magnitude at ≥15fps, 30fps practical default,
  ±1 column (0.72%) residual. Script header updated; a stderr warning now fires when
  self-calibration lands on the MIN/MAX bound (the whole-video intro-fade mis-lock found this
  session). The vitest's loose large-step pin stays as a drift detector — it is NOT a blessing of
  10.1 as game truth.
- **Hypothesis (a) ESCALATED — the weapon sub-step genuinely generates ~10.1% (~1010 energy vs the
  modelled 910), varying per shot (9.4-10.8%).** Candidate mechanism (a HYPOTHESIS, not measured):
  real charge-at-release EXCEEDS 1.0 (the override note independently records real auto
  overcharging) and the focus formula ×(1+1.5c) extends past c=1; the six observed steps fit
  c ∈ [1.07, 1.32]. This is DECISIONS-tier: it moves a 2026-07-13 measured anchor (910, and the
  c=1.0 cap underneath the whole 250-family ×2.5 rule, takina's 1400 included) and re-colors the
  scarlet-black-shadow 1.5× landing and the alice/cinderella reads. It runs the full
  /scientific-method pipeline on its own — cross-family gates need the owner's explicit request,
  so this is filed as an owner action item, NOT started.
- **PAUSED pending (a) (§3.2):** `alice` and `cinderella` multiplier resolution (both their
  "reader magnitude once trusted" paths and the meaning of their datamined multipliers depend on
  whether real charge > 1.0 scales gauge). Note the counting bounds are anchor-independent and
  survive any (a) outcome: alice's own solo footage (~5 shots to ~99.3%, 6th fills, per QUEUE)
  bounds her per-shot to [16.67%, 20%) = [2.98×, 3.57×) — which EXCLUDES the withdrawn
  3.68-3.9× session values and CONTAINS her datamined 3.5× (19.6%). That is recorded here as
  arithmetic, not as a landing.
- **Filed separately (§6 known trap):** the sim/real divergence at gauge-full for a lone Burst III
  (engine opens the chain, zeroes the gauge and halts generation with no Burst I present; the real
  bar holds full) — damage-inert solo, must not be "fixed" as a side-effect of this work. QUEUE
  carries it as its own item.

### Evidence package

`scratchpad/gauge-ladder/` (worktree, gitignored): `series-{5,15,30,60}fps.json` (full-video
reader runs), `montage-intro.png` (the t≈4.3 event is the intro FADE, not a gauge event),
`montage-pull1.png`, `montage-full.png` (full-state transition anatomy), `full/t*.png` (ammo-
counter frames). Frames are re-derivable: `ffmpeg -i "docs/probes/tb2/tb2 3 maiden.MP4" -vf
"fps=N,crop=400:160:2350:430" f_%05d.png` (video lives in the MAIN checkout — gitignored — not
the worktree).

---

## §OWNER-RULINGS (2026-07-29, third pass — Kimi driver)

Two owner rulings landed on the §RESULT above. **This section is the current state**; §RESULT is
kept as the evidence record, with the supersessions below.

### Ruling 1 — "Charge cap as datamined is correct, there's no overcharge" → hypothesis (a)'s mechanism REJECTED

The escalated candidate mechanism — real charge-at-release > 1.0, the ×(1+1.5c) focus formula
extending past c=1 (the c ∈ [1.07, 1.32] fit) — is ruled OUT. No pipeline, no engine change, no
constant moves: the mechanic does not exist. The maiden override note's "real auto overcharging"
phrase (the 156–212% charge-meter display during the auto hold) is a RENDER observation, not a
mechanic — it must not be cited as support for c>1 gauge/damage effects, as §RESULT's (a)
paragraph did. (The same phrase in `docs/data/charge-weapons.md` §2 and answered-questions A12 is
likewise display-description only.)

What remains unexplained: the reader's large (weapon) sub-step reads ~1.0–1.3% absolute ABOVE the
per-unit model on BOTH tb2-test-3 solos (maiden ~10.1 vs 9.1; takina 14.5–16.7 vs 14.0), while
the small (rider) sub-step is exact (3.6–3.7 vs 3.64). With overcharge ruled out and the counting
bound withdrawn (ruling 2), that residual is an open **reader** question, not a game-mechanics
one — suspect class not yet discriminated (per-snap read bias at the hit instant — fire-time
rider steps are exact, hit-time weapon steps are hot — vs a real per-unit table gap). Do not
quote the reader's large-step magnitude as game truth, and do not open a mechanics pipeline on it.

### Ruling 2 — "For tb2 test 3, only 0:06–0:17 is viable footage" → audit of every §RESULT claim

Both recordings (`tb2 3 maiden.MP4` 73.7s, `tb2 3 tak.MP4` 44.3s) share one timeline: intro-fade
artefacts through ~5.8s, gauge live from ~6.0s, six pulls land 7.2–14.0, reload ~14.0–17.2, and
at ~17.4–18.7 the player takes MANUAL aim (the tak footage shows the sniper scope + CHARGE% HUD
from t≈18) — consistent with the owner's cutoff: past 0:17 is no longer clean auto footage.
(Verified this pass: fresh 30fps reader run on the tak video + full-frame views at t=8/12/16/
17.5/18.7/25; the two videos' fill events land at the same timestamps to the frame.)

| §RESULT claim | Evidence timestamps | Inside 0:06–0:17? |
| --- | --- | --- |
| Ladder weapon sub-steps 9.4–10.8 (×5) | 8.57 / 9.93 / 11.30 / 12.67 / 14.03 | YES |
| Ladder rider sub-steps 3.6–3.7 (×5) | 8.40 / 9.77 / 11.13 / 12.50 / 13.87 | YES |
| Frame-snap check (single-frame jumps) | 11.27→11.28, 12.65→12.67 | YES |
| Shot-1 partial opener +2.9, no rider | 7.20 (ammo `005` at 7.00) | YES |
| Mag-1 empty after 6 shots | ammo `000` at 13.90 | YES |
| Rider-first sub-step order | the above step pairs | YES |
| Takina per-shot steps 14.5–16.7 (×5) | 8.57–14.03 (same cadence) | YES |
| Shot 7 (rider +3.7 / weapon +10.1) | 17.20 / 17.37 | **NO** |
| Shot 8 + full-cross | 18.57 / 18.73 / 18.77 | **NO** |
| Ammo `004` corroboration | 18.72 | **NO** |

**Consequence 1 — the shot-counting anchor exclusion is WITHDRAWN.** "8 shots fill the bar, full
crosses at t=18.73" — the evidence that excluded the documented 12.55%/pull anchor and closed the
energy account for the reader's 13.73%/pull — sits ENTIRELY outside the viable window (shots 7–8,
the full-cross, and the corroborating ammo read all land at t ≥ 17.2). Inside the bound, six
pulls (1 partial + 5 full) take maiden's bar ~0 → 74.6 and takina's ~0 → 81.9 (raw reads), which
does NOT discriminate the documented model from the reader's hotter per-pull. §3.2's pause-clause
basis is gone.

**Consequence 2 — reader verdict revised.** SETTLED: shape (plateaus, cadence, single-frame
snaps, rider-first order, full-state detection) and SMALL-step magnitude (rider exact at every
sampling rate). UNRESOLVED: LARGE-step magnitude (~1.0–1.3% absolute hot on both solos; the
`RAW_OVER_TRUE` 1.064 constant is anchor-derived metadata, never applied to output, and not
validated). Callers: ≥15fps (30fps default) for shape and small steps; do not enact constants
from large-step magnitudes.

**Consequence 3 — `alice`/`cinderella` un-paused, on the surviving basis.** The pause had two
legs — hypothesis (a) and the anchor exclusion — and both are gone (rejected / withdrawn). What
stands for alice is the anchor-independent counting arithmetic on HER OWN solo footage (5 shots
to ~99.3%, the 6th fills → per-shot ∈ [16.67%, 20%) = [2.98×, 3.57×), containing her datamined
3.5× and excluding the withdrawn 3.68–3.9× session values) — untouched by everything withdrawn
here. Both units STAY PINNED regardless: no confirming measurement exists at the landing bar —
the reader's large-step magnitude is unresolved, and any future counting-bound endpoint must be
re-established inside an explicitly viability-bounded window (define the viable span BEFORE
reading, per this ruling).

---

## §CINDERELLA-RESULT (2026-07-29, fourth pass — Kimi driver, cindy solo footage re-review)

The §4 cinderella resolution path is COMPLETE: rider term (already engine-verified §RESULT) →
counting bound on pulls-to-full → closing account. The reader's unresolved large-step magnitude
turned out NOT to be needed — the measurement rests on shot counts, the bar's own 0–100 geometry,
and the (exact) rider sub-steps. Recording: `docs/probes/720-kit-audit/cindy solo neutral.MP4`
(198.6s, 60fps, 2622×1206; video lives in the MAIN checkout, gitignored).

**Viable window (defined BEFORE reading, per owner ruling):** gauge widget live ~t=5.5 (intro
fade artefacts 5.9–7.4 excluded — a 55%-in-one-frame spike + crash is the fade, not gauge);
full-auto solo throughout; fight ends into a loading screen ~t≈190. The gauge accumulates only
over t≈5.5–44.57 (lone Burst III: once full it holds green; nothing casts, nothing consumes).
All measurement below sits inside t=5.5–44.57. One anomaly INSIDE the window: a boss-dash /
camera-pan phase ~t=35.5–38.1 hides the ammo widget (HUD off-crop) — the gauge stays on-screen
and the staircase carries that span.

### Shot count to full: N = 76 (ammo-counter verified)

- Mag 1 = 24 (022@9.00 → 000@16.25; 2 shots pre-9.0, first fire ~8.4 — damage counter is 0 at
  t=8.5). Reload 16.2→19.75 (~3.5s).
- Mag 2 = 24 (024@~19.75 → 000@~27.3). Reload → ~30.7.
- Mag 3 = 24 (022@31.05 → ~008@35.3, fire pause 35.5–38.1 during the camera pan, resumes 38.17,
  last shots ~40.2). Reload 40.2→43.5 (~3.3s).
- Mag 4: steps at 43.53 / 43.87 / 44.20 / 44.53 — **bar goes GREEN (state full) at t=44.57 on
  the 4th shot of mag 4 = global shot 76.** Green is sustained to video end (not a blip).
- 30fps and 60fps reader runs agree to the frame (green 44.57 both; identical landmarks).

### Opener anomaly (NEW BEHAVIOR, mechanism unresolved — filed, not settled)

Shots 1–8 (~t=8.4–11.08) generate **NO gauge at all**: the bar sits at its 2.2% border floor for
111 consecutive 30fps frames — no weapon steps AND no rider steps (the rider is the reader-exact
fire-instant small step, so this is shape, not magnitude). Yet the shots deal full damage: rider
popups land (109,806 = her documented 136.6% × ATK rider value) and the damage counter climbs
from ~9.0. From shot 9 (t≈11.1) gauge steps arrive every shot, 1:1 with the 3/s cadence. The gap
is fight-start-only — mag 2/3/4 resume stepping immediately after each reload (rider step +0.7 at
19.77 etc.). maiden-ice-rose got gauge from her very first (partial) shot in tb2-test-3, so this
is cinderella-specific. The sim currently credits those 8 shots with full per-shot gauge.

### Steady-state per-shot: 1.45%/shot ⇒ focus multiplier ≈ 2.2

Shots 9–75 (67 shots) carry the bar 2.2 → 99.3 (+97.1, ±1 col = 0.72 at each endpoint):
**P = 1.450 [1.428, 1.471]** — interior slopes agree (shots 24→72: 68.1/48 = 1.419; shots 24→75:
72.5/51 = 1.422; quantization bands all intersect ~1.42–1.45). Per-shot sub-steps separate at
range into rider +0.45 (fire-instant, reader-exact) + weapon ~1.00 (hit-instant). With the
engine-verified rider (skillGauge = targetPerTrigger 45, no focus bonus, sim.ts:1398):

> weapon = 1.45 − 0.45 = **1.00%/shot** ⇒ focus multiplier = 1.00/0.45 = **2.22 [2.17, 2.27]**
> (±2 cols/endpoint widens it to [2.13, 2.32] — still excludes both table neighbours).

The mag-boundary checkpoints close to ±1–2 cols at every mag (predicted vs observed: 25.0 vs
26.8 end-mag-1; 59.6 vs 60.9 end-mag-2; 95.5 vs 94.5 end-mag-3; green at shot 76) — the
one-opener + uniform-steady model reproduces the entire curve.

### Verdicts on the three candidates

- **Flat 2.5× pin — EXCLUDED, robustly.** 1.575%/shot fills by shot ~64 (mid-mag-3); mag 4 was
  observed firing. Slopes read COLD vs 1.575, against the reader's known bias direction. No
  dependence on any magnitude correction.
- **1.0× exemption (owner's kit-mechanical hypothesis) — EXCLUDED.** 0.90%/shot needs ~112 shots
  (~2 more mags than observed).
- **Datamined 2.0× (`fullChargeBonus` 200) — EXCLUDED by this footage, at ~3σ of the reading
  band.** 1.35%/shot × 67 steady shots + ~0 opener = ~90.5 at shot 75 — the green at shot 76
  refutes it. Note the direction: the reader's documented weapon-step bias (+10.7% relative on
  both tb2 anchors) would make a true-1.35 climb read as 0.45+0.90×1.107 = 1.446 — matching the
  rendered 1.45 almost exactly. **But that correction breaks the closing account** (true total
  90.5 < 100 at green, and no third gauge source exists in her kit — S2 Decoy is defensive and
  unmodeled, burst unreachable solo). The only self-consistent reading of THIS footage is
  bias-absent: **multiplier ≈ 2.2**, i.e. the einkk ×(1+1.5c) shape at an effective
  chargePercent ≈ 0.8 (vs the table-implied 0.667) — consistent with the owner's argument that
  her dump-fire does not perform the full hold-charge/release cycle, but NOT with c as low as
  the table's 0.667 and NOT with the flat 2.5×.
- The earlier rough read (≈2.6–3.1×, aliased 0.2s CV sampling, cited in QUEUE) is superseded.

### What this does and does not unblock

- Her pin (flat 2.5× via `magDumpRof` in `gaugePerShot`) is now MEASURED-WRONG, ~12–14% hot on
  her focused gauge (1.575 vs 1.45 per shot) plus the opener over-credit. Enactment is the
  owner's call via `/scientific-method` — the measured value (≈2.2) matches no table entry, so
  this lands as a measured constant, not a datamine lookup. If a 2.2 constant is enacted, the
  opener anomaly (~8 gaugeless shots at fight start) is a separate, smaller modeling gap worth
  its own line (worth ~8 × 1.45 ≈ 11.6% of one gauge cycle).
- **Residual alias risk (flagged, not resolved):** if her unmodeled Decoy (or anything else)
  generates gauge in the real game, some of the "weapon" term could be decoy gauge and the true
  focus multiplier would be lower (toward 2.0). No evidence for this in the footage (steps are
  1:1 with HER shots at 3/s including through the camera pan), but the Decoy is unmodeled, so it
  cannot be positively excluded from a solo read. A team recording where her FB cadence is
  observable would settle it — the FB-count route Fable already ruled non-isolating for alice
  does not apply to this question, since here the unknown is a per-shot value with a directly
  observed staircase.
- **For the reader-calibration question itself:** the +10.7% weapon-step bias did NOT reproduce
  on this video (if it had, the closing account fails) — a third data point for the unresolved
  large-step question, suggesting the bias is video/exposure-dependent (her small rapid rocket
  hits vs the anchors' large single-hit flashes), not a fixed reader property. Do not tighten
  the anchor vitest on this — one contradictory video is a finding, not a blessing.

### Evidence package

`scratchpad/cindy-focus-gauge/` (worktree, gitignored): `series-30fps.json`, `series-60fps.json`
(full reader runs), `m02.png`/`m03.png` (mag-1 ammo montages), `q01.png`/`q02.png` (mag-3 ammo
montages), `a8.5.png` (damage counter 0 pre-first-shot), `a10.5.png` (rider popups + AMMO 018).
Re-derive: reader frames `ffmpeg -ss 5 -t 41 -i "<video>" -vf "fps=60,crop=400:160:2350:430"`;
ammo montages `fps=4,crop=260:80:1580:655` (widget position drifts with the camera — verify per
segment; it is off-crop entirely 35.5–38.1 and during the end-of-fight pan).
