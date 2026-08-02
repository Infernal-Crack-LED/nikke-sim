# Pellet reader — the missing-shot channel: test plan

> AI-facing. Written **2026-08-01, BEFORE the measurement runs**, deliberately — §3's decision rule
> only has force because it is on disk before the numbers exist. Third in the series after
> [`2026-08-01-pellet-cascade-JUDGE-handoff.md`](2026-08-01-pellet-cascade-JUDGE-handoff.md) and
> [`2026-08-01-pellet-centering-test-plan.md`](2026-08-01-pellet-centering-test-plan.md).
>
> **Slug:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`); **not**
> `marciana-marine-study` (AR/Iron). Also referenced: `noir`, `guilty`, `isabel`.

---

## 1. Why this is the last live lead

Everything else has been eliminated this week, each recorded in `docs/probe-runs.md`:

| candidate                                     | outcome                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| filter thresholds (`min_area` / `min_circ`)   | real pellets survive at 94.6%; both filters near-inert (2.45% / 0.61%) |
| counting-window size                          | radius widening ELIMINATED on three signals                            |
| SG landing model (centre-weighted vs uniform) | settled + enacted 2026-07-22 (UNIGEO); not a reader issue              |
| per-shot crop centring                        | offsets are within centroid noise; pooled mean t = (0.08, 0.24)        |
| stale locks reaching counting frames          | no decision-rule row fires; A/B 1.1 SE from zero                       |

The counter's cold bias — **0.8–1.6 pellets/10 against a ±0.25 budget** — is unmoved by all of it.

The stale-lock measurement found the reason its own answer was not reassuring: **shot detection is
downstream of the crosshair lock.** `build_tracks_and_counts` windows counts to `cross_positions`, so
`P(frame clears event_min | stale)` is 4.5–12.0% versus 31–34% given a good lock. Stale% by offset from
`t0` shows a deep trough exactly at the counting window — `t0+8: 4.5%`, `t0+9: 3.1%`, `t0+11: 4.2%` —
rebounding to `t0+20: 19.7%`, `t0+40: 27.2%`, `t0+60: 31.8%` against a 20.01% unconditional rate. That
is a **selection** signature: shots a stale lock destroys never become detected shots, so they are
invisible to any measurement conditioned on detected shots.

**A missing shot is a pure cold bias.** That channel is unmeasured, and it is the only live lead.

### The fixture already hints at its size

`groundtruth-f8-11.json` records `t0` = 1060 / 1096 / 1140 / 1289 / 1369 (60fps). `marciana`'s datamined
`rate_of_fire` is **90 rpm = 1.5 shots/s = exactly 40 frames** at 60fps — and the fixture's own adjacent
gaps validate that cadence from its own data:

| gap (frames) | seconds  | ÷ 40-frame cadence | implied shots in gap          |
| ------------ | -------- | ------------------ | ----------------------------- |
| 36           | 0.60     | 0.90               | 1 (adjacent)                  |
| 44           | 0.73     | 1.10               | 1 (adjacent)                  |
| **149**      | **2.48** | **3.73**           | **~4 — or a reload**          |
| **80**       | **1.33** | **2.00**           | **2 — i.e. one shot MISSING** |

The 80-frame gap sitting at **exactly 2.00** cadence periods is hard to explain as anything but one
undetected shot; a reload would not land on an integer multiple. If both gaps are real misses, ~4 shots
went undetected among 5 detected in this span. **That is a hypothesis from spacing arithmetic, not a
measurement** — §3 is what tests it.

## 2. The instrument, and its one real weakness

**The ammo counter.** `count-pellets.py:561+` already reads it: it segments the glyphs inside the
located ammo box, matches a fixed-font digit atlas, and **ABSTAINS rather than guesses** on a poor
match. Deterministic, and it declines instead of confabulating — the right property for an arbiter.
Precedent: the 2026-07-30 raven measurement used ammo decrements for shot timestamps.

**Weakness — it is not fully independent.** `analyze-pellet-tracks.py:425` records that
`cross_positions[i] − cross_rawloc[i]` is a fixed constant (`tw//2 + ammo_offset`): **the crosshair is
DERIVED from the ammo box**, so both share one lock. During a stale run the digit read will likely
abstain too.

**Why the method survives that.** A decrement is recoverable ACROSS a gap. Ammo 7 before a stale run
and 5 after means two shots fired while zero were detected. Abstention leaves a hole with known
endpoints, which is all this needs. It does mean the result is a **LOWER BOUND** — see §5.

## 3. PRE-COMMITTED decision rule — do not edit after seeing the numbers

### 3a. GATE — validate the instrument first. Nothing downstream counts until this passes.

The 6-shot `marciana` groundtruth window (`at=15 dur=30 fps=60 zoom=2`) has an owner-confirmed shot
structure: 6 detected events, **shot 0 confirmed a FALSE POSITIVE**, so **5 real shots**, at the `t0`
values above. Reconstruct shots from the ammo series over that span and compare.

| Gate result                                                                               | Action                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ammo reconstruction finds **5 decrements aligned to the 5 known `t0` values (±3 frames)** | Instrument VALIDATED. Proceed.                                                                                                                                                                                                              |
| Finds 5 decrements but misaligned, or 4–6 with a clear explanation                        | Report the discrepancy, proceed only if the explanation is measured, not assumed.                                                                                                                                                           |
| Anything else                                                                             | **STOP.** The instrument is not admissible. Report it and ask the owner for a hand shot-count on one clip (~5 min) to tell whether the reader is broken or the label span is wrong. **Do not proceed to §3b on an unvalidated instrument.** |

Note the gate is also a check on the pellet detector: it found 6 events where 5 were real.

### 3b. THE MEASUREMENT — only if 3a passes

Over each full video with a dump on disk, reconstruct total shots fired from the ammo series
(decrements + reload resets) and compare against the count of pellet-detected shot events.

```
MISSED = shots_from_ammo − shots_detected_by_pellets
```

| Result                             | Reading                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **MISSED ≥ 8% of shots_from_ammo** | The missing-shot channel is large enough to carry the whole cold bias. It becomes the leading explanation and the guard work is justified.     |
| **MISSED ≤ 2%**                    | Channel is real but too small to explain a 0.8–1.6/10 bias. Record it; the cold bias stays unexplained and this document closes without a fix. |
| **Between**                        | Report as-is. **Do not force it into a bucket.** State what would decide it.                                                                   |

Separately and independently: report **MISSED restricted to gaps that are integer multiples of the
40-frame cadence** (the cleanest sub-case, no reload ambiguity), and the fixture-span result from §1's
table — did the 80-frame gap contain a shot, and did the 149-frame gap contain a reload or ~3 shots?

The 8% threshold is derived, and the derivation is recorded here so it can be checked rather than
trusted: a missed shot contributes its full ~8.4 landed pellets to the deficit, so a bias of 0.8–1.6
pellets per 10 pellets ≈ 0.8–1.6 per ~1.2 shots needs roughly 8–16% of shots to vanish. **If your
measured mean landed-pellets-per-shot differs materially from 8.4, recompute the threshold from YOUR
number and say so** — do not silently keep 8%.

## 4. Method notes

- **Reload semantics must be DERIVED, not assumed.** `marciana` is `max_ammo 9`,
  `reload_start_ammo 8`. Establish from the ammo series itself what value the counter resets to and
  when. A gap spanning a reload is genuinely ambiguous (`3 → 7` = reload-only or reload-plus-two), so
  classify gaps as reload-spanning or not, and report the two populations separately.
- **Reuse, do not rebuild.** `extract-ammo-template.py` builds per-video templates;
  `count-pellets.py`'s ammo reader is already written. The existing `tracks.json` dumps carry NO ammo
  series (keys are `params` / `frame_files` / `cross_positions` / `cross_confs` / `cross_rawloc` /
  `frame_counts` / `tracks`), so this needs a RUN, not new machinery. Extend an existing script with a
  flag (constraint 9); commit the instrument and pair it with a fixture.
- **Frame indices never cross dumps.** Each dump has its own clip window.
- **`rate_of_fire` is a NOMINAL datamined value.** The game fires on 60fps frame boundaries, so
  effective = `60/ceil(60/nominal)`. For 90 rpm that is exactly 40 frames, so nominal = effective
  here — but state that check rather than assuming it for any other unit.

## 5. Confounds — give each an explicit verdict

1. **LOWER BOUND, not an exact count.** Shots hidden entirely inside a reload-spanning abstention gap
   are unrecoverable. If MISSED comes back near zero that is **weaker evidence than it looks** — say
   so rather than declaring the channel closed.
2. **Shared lock.** The ammo read is not independent of the crosshair lock (§2). Quantify how much of
   the series abstains, and whether abstention correlates with the stale runs already characterised.
3. **The 8% threshold depends on landed-pellets-per-shot** (~8.4). Measure it; recompute if different.
4. **Cadence is not guaranteed constant** — buffs, burst windows and reloads change it. Do not treat
   "gap ÷ 40" as ground truth; it generates hypotheses, the ammo series tests them.
5. **Over-detection exists too.** The fixture's shot 0 is a confirmed false positive, so the pellet
   detector both misses and fabricates. Report MISSED and SPURIOUS separately; a net figure hides both.
6. **n and scope** — how many videos, which units. `marciana` is the only one with owner ground truth.

## 6. Evidence discipline

**RECORDS a measurement.** May not, in the same motion: change any guard, gate, threshold or constant;
add an enforced gate to the live path; edit `docs/DECISIONS.md`; rewrite a plan's direction; or stamp
VALIDATED / REFUTED / SUPERSEDED. Even the strongest result leaves the fix to a separate gated pass.

Reader/tooling work, so `/scientific-method` does not apply (`CLAUDE.md` §sufficiency); `verify.sh` +
`pellet-selftest.sh` + the committed fixtures are the gate.

## 7. Traps

- **`cmd | tail; echo $?` reports TAIL's exit status.** Two false readings in this thread already.
- **NEVER `git restore` / `checkout --` / `reset --hard`** — shared worktree. Restore via
  `git show HEAD:<path> >`; undo your own edits with `git stash` or a surgical Edit.
- **Do not `rm -rf` anywhere in the worktree** — a safety hook blocks it, correctly.
  `scratchpad/pellets/_centering_tmp/` holds ~2.1 GB from a prior run; leave it.
- **"Not flagged broken" ≠ sound.** Read the underlying numbers, not a pass/fail banner.
- **Headless:** never background a shell command; foreground with an explicit timeout, split if long.
