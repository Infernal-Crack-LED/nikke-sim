# Burst-generation investigation — four sessions, one item each

> **AI-facing plan. One item per session, in the order below.** Each item is self-contained: it names
> its own question, the premises to re-derive before starting, the method, the pre-committed decision
> rule, and which lane it runs in. Do NOT bundle them — they have different evidence bars, and three
> of the four can be answered without new footage.

## The frame (read this first — it constrains all four)

**Burst gauge is generated per HIT, and by nothing else.** There is no "gain X gauge per second" and
no timer that opens a chain regardless of gauge (owner ruling 2026-08-13, pinned in `CLAUDE.md`
verified facts and `docs/data/burst-gauge.md` §1). Generation happens in exactly ONE window per
cycle: after a Full Burst ends, before the next chain starts.

**The chain and Full Burst timings are settled and frame-verified.** The real cast ladder measures
1.383–1.400s against the engine's 30f+30f+22f = 82f = 1.3667s (`docs/probe-runs.md` 2026-08-13). So
the only place a full-burst count can go wrong is **how much gauge the team feeds the bar**.

⛔ **Do not chase the cycle-time difference.** A "the cycle is ~1.65s too long" figure describes a
symptom in units the game does not have — there is no time constant to change, and treating a
seconds-per-cycle number as the target is chasing a coincidence (owner ruling 2026-08-13). Converted
into the quantity that can actually be wrong, on the two comps whose cycles were filmed:

| comp               | real refill | fight needs  | sim feeds    | sim generates       |
| ------------------ | ----------- | ------------ | ------------ | ------------------- |
| iron sweep (run G) | 2.59s       | 38.6 gauge/s | 23.7 gauge/s | **61%** of required |
| T5 wind-weak       | 1.91s       | 52.4 gauge/s | 26.4 gauge/s | **50%** of required |

("sim feeds" = 100 ÷ the sim's own OBSERVED refill from its rotation log — not the matrix's
per-team "team rate" column (25.57/26.81), which is `gaugeGenerated ÷ gaugeBuildTimeSec`. Both are
sim figures; they are different quantities.)

**The sim feeds the bar roughly half to two-thirds of what the fight requires.** That is a large,
findable modeling error, not a timing subtlety. It is robust to the Full-Burst-duration uncertainty
(at a 9.4s real Full Burst the two read 74%/61%); the exact percentage is not. Per-team detail:
[docs/fb-count-matrix.md](../fb-count-matrix.md).

### What is ALREADY settled — do not re-open any of these

- **Generation is locked during the chain and Full Burst.** Owner ruling, re-confirmed 2026-08-13.
- **The unfocused charge multiplier is 1.0, MEASURED.** `UNFOCUSED_CHARGE_GEN` (sim.ts:1374) rests on
  the 2026-07-13 A1/A2 paired battery: `takina` unfocused steps +5.6–6.5%/shot (her flat 560 target),
  focused steps +14–15% (560 × 2.5). **The comment records that the additive
  `full_charge_burst_energy` hypothesis is explicitly EXCLUDED — it would have read +8.1%.** Do not
  send a session after "unfocused charge units should get the full-charge bonus"; it is refuted.
- **A real weapon swap generates NO gauge** (owner ruling 2026-08-13, sim.ts:1493). Same-weapon
  flavor swaps keep feeding.
- **Per-shot values fit the datamine exactly for two charge weapons**, solo: Maiden: Ice Rose (RL) and
  `takina` (SR), per-shot with visible sub-steps (`docs/data/burst-gauge.md` §6).
- **The 22f / 30f / 30f chain ladder.** Frame-measured; footage-confirmed (real ladder 1.383–1.400s
  vs the engine's 82f = 1.3667s). The **10s Full Burst** is the modeled/datamined value, NOT
  footage-confirmed: real FB duration is only bounded at ≥8.87s (`docs/probe-runs.md` 2026-08-13),
  and a real-FB-duration read is that entry's named next measurement. The frame above already treats
  it as uncertain — do not cite this list to settle it.

---

## Item 1 — Is the refill window starved by post-Full-Burst reload state?

**Run this one first.** It is the only candidate that is invisible to every existing check by
construction, and it needs no footage.

**QUESTION.** The refill window is short (~2–4s) and opens the _instant_ Full Burst ends — the moment
units are most likely to be mid-reload or empty, having just fired for 10s straight. Does the sim
under-feed the bar specifically in that window, while its fight-average generation rate still looks
correct?

**WHY IT CAN HIDE.** Every existing gauge validation is a _rate_ or a _per-shot_ check: the two solo
recordings measure per-shot steps, and `u.gaugeGenerated / gaugeBuildTimeSec` is an average. A defect
that costs shots only in the first ~1–2s after Full Burst ends would leave both intact and still
lengthen every cycle. Note this cuts both ways — if the sim over-models reload downtime there, it
under-generates; the item is the timing of ammo/reload state across the Full-Burst boundary, not
reload speed in general.

**PREMISES TO RE-DERIVE (step 0, one verifier each).**

1. What ammo/reload state does each unit actually hold at the FB-end frame, and is that state
   _carried across_ the boundary or reset? (Primary: `src/engine/sim.ts` reload + `firePull` paths.)
2. Do any units get infinite ammo / no-reload _during_ Full Burst, and if so what happens to their
   ammo counter at FB end?
3. Is `gaugeBuildTimeSec` (stage 0, not in FB, gauge < 100) actually the same window units are firing
   in — i.e. does anything else gate shots there?

**METHOD.** Sim-only, no footage. Instrument the per-unit gauge contribution **as a function of time
since FB end** (0–0.5s, 0.5–1s, 1–2s, 2s+) across every cycle of the two filmed comps, and compare
against each unit's steady-state rate. A starved window shows as a rate that ramps rather than being
flat from the first frame. Cross-check against the `reload` events already on the `onEvent` tap.
Extend `scripts/battery/fb-count-matrix.ts` rather than writing a new script.

**DECISION RULE (pre-commit before running).** If the first 1s after FB end delivers ≥80% of the
unit's steady-state rate on both comps, reload state is NOT the cause — record and close. If it
delivers <50%, quantify how much of the 39–50% shortfall it accounts for and hand that to a separate
gated enactment pass. Between 50–80%: contributing but not sufficient; report the share and continue
to item 2 rather than enacting.

**LANE.** Cheap lane — this is a sim-internal audit against exposed state, not a new game measurement.
`verify.sh` + a fixture is the gate. Escalate to `/scientific-method` ONLY if it ends in changing a
constant.

**DO NOT.** Do not change reload constants. Reload frames are datamined and several are measured; a
generation shortfall is not licence to retune them.

---

## Item 2 — Is any non-bullet gauge source missing or mis-scoped?

**QUESTION.** Skill hits, DoT ticks and riders all feed the bar via `skillGauge` (sim.ts:1522, one
target-base hit per impact). Is every source that generates in-game actually emitting, and is
anything emitting that should not?

**WHY IT CAN HIDE.** The solo anchors are both _bullet_ measurements on charge weapons. A missing
`skillGauge` emission on a whole effect kind is invisible to them and invisible to damage tests
(gauge and damage are separate channels). The 2026-08-13 U28 pass already found one such asymmetry —
`extraHitDamagePct` was not emitting `skillGauge` per impact — and fixed it; that is existence proof
for the class, not evidence the class is now empty. That fixed instance also carries an existing
BOUND: the committed `scripts/battery/u28-gauge-ab.ts` shows all four carriers hold their
full-burst counts exactly on support-core comps (the refill-bound charge-B3 arm is flagged
unmeasured there) — so this session's job is the REMAINING impact kinds, not re-measuring the one
already closed and bounded.

**PREMISES TO RE-DERIVE.**

1. Enumerate every call site of `skillGauge` and every effect kind that produces a damage impact.
   Which impact-producing kinds do NOT emit? (Field-form census, not a prose grep — see the
   census-holes lesson: make unrecognised input LOUD.)
2. For each non-emitting kind, is the omission an owner ruling / measured, or unexamined?

**METHOD.** Census `src/skills/types.ts` effect kinds against `skillGauge` call sites, then a
per-comp census of which of the nine off-count teams carry carriers of any non-emitting kind. Compare
the estimated contribution against each team's shortfall. `scripts/battery/` is the home.

**DECISION RULE.** Any impact-producing effect kind that does not emit and has no ruling behind it is
a FINDING, reported with its carrier list and estimated gauge contribution — **not enacted in the
same session** (measurement ≠ enactment). If the census is clean, say so and close the item.

**LANE.** Cheap lane / findings-only audit. Any resulting encode goes through `/code-review`, or
`/scientific-method` if the answer is genuinely unknown rather than merely unencoded.

---

## Item 3 — Is the FOCUSED charge multiplier's per-unit sourcing right?

⚠ **Re-scoped.** The obvious version of this item — "unfocused charge units are missing the
full-charge bonus" — is **already refuted by measurement** (see the settled list above). Do not run
that. What remains is the _focused_ side's per-unit value — and a 2026-08-13 review found even that
premise stale: every live non-250 column was settled 2026-07-29 (see WHY below), so what remains is
a verification audit expected to CLOSE the item, not open a measurement.

**QUESTION.** The focus multiplier is sourced from `characters.json` `chargeMultiplier` (250 → ×2.5),
falling back to `gauge-per-shot.json` `fullChargeBonus` when that column reads 0, with a per-unit pin
list overriding both (sim.ts:1440-1456). Are the non-250 columns correct?

**WHY IT MATTERS AND WHY IT CAN HIDE.** The ×2.5 (250 column) is measured twice over (maiden,
takina). **Every other live column is also settled** (`docs/data/burst-gauge.md` §4, DECISIONS
2026-07-29): alice 350 MEASURED + enacted, scarlet-black-shadow 150 MEASURED + enacted, cinderella
200 enacted with the per-unit rule owner-confirmed TRUE — the ~2.2–3.1× reads that once appeared to
contradict the 200 column were RETRACTED as reading errors ("no open dispute on this value"). An
earlier version of this item claimed the 200/350 columns were unmeasured by quoting the engine's
`PENDING_TEAM_ISOLATION` comment; that comment was stale (refreshed 2026-08-13) and is not a source.
The ONE genuinely unmeasured column is `vesti-tactical-upgrade`'s 200: she is sim-supported
(2026-08-01) and the pin holds her at flat 2.5× until it is measured (her kit build's ⚑3 carries
the recipe). The focused unit is the top generator on 5 of 9 off-count teams (~30% of team
generation), so an error here is large for exactly one unit per team — and invisible on any team
whose focus is a non-charge weapon.

**PREMISES TO RE-DERIVE.**

1. Which units in the nine off-count comps are focused AND carry a charge weapon, and what column
   does each resolve to (250 / enacted outlier column / pinned)? Read the resolution off
   `characters.json` `chargeMultiplier` + `gaugePerShot()`; do not re-measure any column.
2. Confirm the column record is as stated in WHY — `docs/data/burst-gauge.md` §4 and DECISIONS
   2026-07-29 (the SUPERSEDES entry) closed the 350/200/150 columns. If that record stands, the
   only unmeasured column is `vesti-tactical-upgrade`'s pinned 200, and no off-count comp seats her.

**METHOD.** Resolve the multiplier per focused unit across the nine comps and compute how much of
each team's shortfall a wrong column could account for. If any off-count team's focus resolves to an
unmeasured column, that is a concrete, footage-answerable question — the per-shot sub-steps are
directly readable off a solo recording, the same method that measured the 250 column.

**DECISION RULE.** If every off-count team's focused charge unit resolves to a **measured or
owner-confirmed column** — 250, or an enacted outlier like scarlet-black-shadow's 1.5× — this item
cannot explain the shortfall: close it and say so. If any resolve to an unmeasured column (today
that can only be `vesti-tactical-upgrade`'s pinned 200, and she seats in no comp), the deliverable
is a recording request, not a value change. Expectation from current data: maxwell 250, anis-star
250 (two teams), scarlet-black-shadow 150 — the item closes.

**LANE.** Audit first (cheap). Any value change is `/scientific-method` with footage — this is a
damage-model constant and the fitting-to-data risk is maximal here.

---

## Item 4 — Do multi-hit weapons credit gauge per LANDED hit or per trigger?

**QUESTION.** `shotGauge(u, frame, hitFraction)` scales gauge by a hit fraction (sim.ts:1483-1500),
and shotguns feed it per pellet while MGs credit `hitsPerShot` rounds per pull. Does the game credit
gauge for pellets/rounds that MISS?

**WHY IT MATTERS.** This is the largest single lever in the set. `noir` (SG) generates **12.93
gauge/s** — the highest figure in the whole matrix — and SG pellet landing is a modeled,
probabilistic quantity (UNIGEO). If the sim withholds gauge for missed pellets and the game credits
per trigger, SG-seated teams under-generate by whatever fraction misses; if the reverse, they
over-generate. Same question for MG belt rounds. Five of the nine off-count comps seat an SG
(`soda-twinkling-bunny` on TWO — N3 and soda-tb control — plus `noir` in misc B3s, `naga` in N2,
`arcana-fortune-mate` in N5), and MG carriers appear in five (six carrier slots — `crown` twice).

**PREMISES TO RE-DERIVE.**

1. What is `hitFraction` actually fed at each `shotGauge` call site — landed pellets over total, or
   something else? Is it 1 for AR/SMG/SR/RL?
2. Does the "fill counts HITS, not damage" rule in `docs/data/burst-gauge.md` §1 have a primary
   source that distinguishes _hits landed_ from _trigger pulls_, or has that distinction never been
   stated?
3. Is `hitsPerShot` for MG the belt-round count, and does each round count as a hit for gauge?

**METHOD.** Start with the source question (2) — if the primary sources never distinguished the two,
that is the finding, and it is an owner question before it is a measurement. Then A/B the sim with
`hitFraction` forced to 1 for SG and measure the board + FB-count movement, ENV-gated and default
OFF. **`dorothy-serendipity` is the designated SG-spray regression anchor** — her 80-hit → 3-big-shot
consolidation amplifies pellet errors into large swings.

**DECISION RULE.** If forcing `hitFraction = 1` closes a material share of the 39–50% shortfall on
the SG-seated comps, that localizes it. The size of the move is the signal; the SG-free comps are a
scoping sanity check, not a discriminator — non-SG paths already pass `hitFraction = 1` by
construction, so "moves nothing there" is true by definition. It still does **not**
license landing the change — the game-behaviour question ("does a missed pellet generate?") is an
owner ruling or a footage measurement, not something the board can settle. A board improvement here
would be exactly the fit-to-data failure the harness exists to stop.

**LANE.** `/scientific-method` if it becomes a value change; the initial census and A/B are cheap
lane. **Ask the owner question first** — two of this session's items dissolved on being asked rather
than measured, and "does a missed pellet generate burst gauge" is likely one of them.

---

## Sequencing and stop conditions

1. **Item 1** (refill starvation) — sim-only, no footage, largest blind spot.
2. **Item 4** (multi-hit crediting) — largest single lever; open with the owner question.
3. **Item 2** (non-bullet sources) — census, cheap.
4. **Item 3** (focus column) — likely closes: every focused charge unit resolves to a measured or
   owner-confirmed column (250 for maxwell/anis-star ×2, scarlet-black-shadow's enacted 1.5×).

**Stop condition for the whole thread:** if items 1–4 together account for well under the measured
39–50% shortfall, the remainder is NOT in generation and the frame above is wrong — that is a real
result and it goes back to the owner rather than into a fifth speculative item.

**Every item is findings-only.** None of them changes an engine constant, an override, or a snapshot
in the session that discovers it. Enactment is a separate gated pass with fresh context — the
measurement ≠ enactment rule, which this thread has already had to invoke once.
