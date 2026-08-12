# 2026-08-11 — Faithfulness phase-4 TAIL: entry doc + census method

> **Purpose.** The entry doc QUEUE.md asked for. The faithfulness sweep's phase-4 GRADED slice is
> complete (batches 1–8 cover all 45 board-graded units); what remains is **the tail** — the 138
> override files with no board reading. QUEUE's scoping note called for "a GENERATED-CENSUS
> approach … rather than per-unit reads", and this doc is that method, plus the first axis built,
> calibrated, run and fully dispositioned.
>
> **Status: FINDINGS-ONLY.** Nothing here edits an override, the engine, or a shared artifact
> (CLAUDE.md batch-and-stop). Axis 1 produced ONE batched proposal for the owner (§5) and zero
> engine changes. Tooling + its fixture are committed (constraint 9).

---

## 1. What the tail is, and why per-unit reads are the wrong instrument for it

183 overrides carry kit text (185 files − the 2 synthetic `noop-*` fixtures). 45 are board-graded;
**138 are the tail.** The graded slice's per-unit read had two things the tail does not:

- **a ratio to explain** — a hot/cold board reading that says _something_ is wrong before you open
  the file, and
- **a comp to check inertness against** — a way to prove a line is board-inert rather than assume it.

A tail unit offers neither, so the same read costs the same and buys much less. What a tail unit
CAN still be caught on, with no board at all, is structural: **a kit line the model never actually
encodes.** That is a mechanical question, so it gets a mechanical instrument.

**Method rule adopted here — every census is scored against the graded 45 before its tail output is
trusted.** Those units were read line-by-line by batches 1–8, so they are an existing labeled set
(the SUFFICIENCY rule: no new ground truth needs generating). A census that fires on units that
slice already cleared is measuring its own noise. This is the cheapest possible validation and it
is available for free on every axis below.

---

## 2. Axis 1 — kit magnitudes vs the override (BUILT, RUN, DISPOSITIONED)

**Instrument:** `scripts/census-kit-numbers.ts` · fixture `scripts/tests/census-kit-numbers.test.ts`

It asks one deliberately narrow question per kit line: _where does the digit string the kit prints
appear in the override file?_ Two tiers:

| Tier           | Meaning                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| **SILENT**     | nowhere in the file — not encoded, not in `unmodeled`, not in prose         |
| **PROSE-ONLY** | only in `note`/`caveats` — reasoned about, then never recorded structurally |

**Calibration (graded 45):** the SILENT tier fires on exactly one line roster-wide — `crown`'s heal
magnitude, inert by design. 44 of 45 clean agrees with the hand sweep, so a tail hit is worth
opening a file for.

**Historical positive control:** `red-hood`'s Red Wolf "Charge Speed ▲ 100.8%" was found BY HAND in
the M8 pass and had never been modelled. Replayed against her pre-fix override
(`git show 94de2eb2^`), this census puts her in **PROSE-ONLY** — 100.8 appears exactly once, inside
a note sentence. So the one known defect of this class sits in the prose-only tier, which is why
that tier — not the louder SILENT one — is the worklist.

### 2a. Result

| Tier                   | Units | Lines | Disposition                                     |
| ---------------------- | ----- | ----- | ----------------------------------------------- |
| SILENT (graded)        | 1     | 1     | `crown` — inert heal magnitude                  |
| SILENT (tail)          | 3     | 4     | `power` false positive; `biscuit`×2/`sin` heals |
| PROSE-ONLY, HP-restore | 28    | 42    | inert by design (no HP pool) — see §5           |
| **PROSE-ONLY, other**  | 15    | 21    | **the worklist — all 15 read, see 2b**          |

**All 15 were read and dispositioned this session. Zero new defects.** Fourteen are legitimate,
prose-documented transformations; one (`kilo`) is an acknowledged gap that the structured record
does not carry.

### 2b. The transformation vocabulary this produced

The reason a correctly-modelled magnitude goes missing from the blocks. Worth having as a named
list — every future axis and every reviewer hits these:

| Class                         | Carriers found                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| percent → fraction            | `power` (100% → `instantReload.fraction 1`), `asuka-wille` (21 → 0.21), `diesel` (86.62 → 0.8662), `tove` (5.31 → 0.0531)                                                           |
| per-hit × count consolidation | `eve` (240 × 3 → `atkPct 720`), `sakura-bloom-in-summer` (35.16 × 10 → 351.6), `mast` (4.52 × 50 → 226), `tove` (2.32/24.21 × 3)                                                    |
| expectation / probability     | `julia` (100% crit-gated rider → EV 22.23, `crit:false`), `harran` (25% proc → `everyN 4`)                                                                                          |
| unit conversion               | `bready` (Charge Speed ▼20% → `charFixes.chargeFrames 72`), `k` (Attack speed ▼90% → `pullsPerSec 2.4`)                                                                             |
| static basis substitution     | `emilia` (2.01 × base ammo 6 → 12.06), `soline-frost-ticket` (10% × 2 tickets → `casterMaxHpPct 20`)                                                                                |
| duplicate-instance scaling    | `emma-tactical-upgrade` — burst "Damage taken multiplier … scaled by 100%" encoded as a SECOND `damageTakenPct 3.9` instance, which doubles it under additive Damage-Up composition |
| carried outside the override  | `maxwell-ordinary-mechanic` — "Fills Burst Gauge by 7.15%" lives in `data/gauge-per-shot.json` as `flatPerTrigger 715` (the `helm` S2 convention)                                   |

The last row is a genuine structural blind spot: a kit line can be faithfully modelled in a **data
file** rather than the override, and no override-only census can see it.

**Roster delta from the round-1 review fix, recorded so the numbers above stay reconcilable:**
treating the structured side as a deny-list of prose fields (rather than an allow-list of the three
slot arrays + `unmodeled`) cleared exactly one false positive roster-wide — `dorothy-serendipity`'s
"Attack damage ▲ 72% for 3 round(s)", which is genuinely encoded as `consolidation.attackDamagePct:
72`, a field the allow-list never read. She was a graded, sweep-reviewed unit, which is precisely
where a false positive is most expensive. Both worklists and the graded calibration are otherwise
unchanged.

---

## 3. What axis 1 cannot see

Printed by `--skipped`, never silently swallowed:

- **Non-percent quantities** — durations, round/shot counts, stack caps, ammo counts. An entire
  real defect class (`d-killer-wife`'s round-count Pierce, resolved 2026-08-11) is invisible here.
- **Qualitative lines** — "Gain Pierce", "Pellet count is fixed at 1", mode swaps.
- **Wrongness that is present but incorrect** — a number on the wrong stat, target or duration
  reads as clean. This census can only falsify "the model never saw this line".
- **Coincidental digit matches** — `emma-tactical-upgrade`'s "100" matched a `/100` in an unrelated
  prose sentence, downgrading her from SILENT to PROSE-ONLY. A collision in the STRUCTURED half is
  worse than a severity downgrade: it removes the finding entirely.
- **INTEGER magnitudes, very nearly as a class.** 282 of 1259 kit magnitudes print no decimal
  point, and 281 of them appear as a bare digit token somewhere in their override — collided with a
  duration, a stack cap, a trigger count. An integer magnitude is therefore effectively auto-clean,
  and this axis's discriminative power sits almost entirely on DECIMAL magnitudes. The one integer
  that survives roster-wide is `power`'s "100". This is the axis's single biggest limitation; the
  worklist happens to be decimal-heavy, which is why the calibration still holds. Restated by
  `--skipped` on every run.

---

## 4. Proposed further axes (NOT built — ordered by expected yield per hour)

Each is a generated census, each scored against the graded 45 first.

1. ~~**A2 — `unmodeled` entries that match no kit line.**~~ **BUILT, RUN, DISPOSITIONED
   (2026-08-11) — see §4b.** The scoping probe's "roughly a fifth" was re-derived and came out at
   **2.2%**, an order of magnitude lower, which is exactly why it was marked not-evidence.
2. ~~**A3 — non-percent quantity accounting.**~~ **BUILT AND DECLINED (2026-08-11) — see §4b3.**
   Its stated justification ("the tier that held the `d-killer-wife` defect") turned out to be
   false.
3. ~~**A4 — "fixed at" lines vs the clamp StatKeys**~~ **BUILT, RUN, CLEAN (2026-08-11) — §4b4.**
4. ~~**A5 — held-primitive carrier scan** (F11).~~ **BUILT, RUN (2026-08-11) — §4b5.** It found a
   documented "gap" that had shipped months earlier.
5. ~~**A6 — recovery emit/consume**~~ **READ, and made decidable (2026-08-11) — §4b6.**

**Carried follow-up on axis 1 itself:** tighten the integer-magnitude case (§3) rather than only
disclosing it — e.g. require `%`-adjacency when matching an integer in prose, and treat a bare
integer token inside a structured block as WEAK evidence that still surfaces at low severity
instead of clearing the line. Raised by the cross-family review (`kimi-code/k3`, 2026-08-11) as a
FOLLOW-UP; not done here because it changes matcher semantics and would want its own
graded-45 re-calibration.

---

## 4b. Axis 2 — `unmodeled` entries vs the kit (BUILT, RUN, DISPOSITIONED)

**Instrument:** `scripts/census-unmodeled-entries.ts` · fixture
`scripts/tests/census-unmodeled-entries.test.ts`

The converse of axis 1. Axis 1 asks whether every kit magnitude reaches the override; this asks
whether every `unmodeled` entry still quotes a line the kit actually prints. It matters because the
2026-08-11 owner ruling made `unmodeled` the authoritative index of what the model skips — so an
entry describing a line the kit no longer prints reads as a live gap forever, and costs a
verification pass every time it is re-encountered.

`unmodeled` is **slot-keyed** (`{skill1, skill2, burst}`), which buys a second question for free:
an entry can be filed under the wrong skill.

| Tier                | Meaning                                                              |
| ------------------- | -------------------------------------------------------------------- |
| **UNMATCHED**       | no kit line in the unit's whole kit resembles the entry              |
| **MAGNITUDE DRIFT** | the entry quotes the line but not the number the kit now prints      |
| **MISFILED**        | the entry matches a kit line in a DIFFERENT slot than it is filed in |
| NEAR                | matched by token overlap only — paraphrase, advisory, not a finding  |

### 4b.1 Result — 460 entries, 143 units, 10 findings across 4 units

| Tier                     | Findings       | Disposition                                                     |
| ------------------------ | -------------- | --------------------------------------------------------------- |
| UNMATCHED                | 8              | `moran` 1, `neon-vision-eye` 3, `zwei` 4 — all read, all benign |
| MAGNITUDE DRIFT          | 2              | `sugar` — see below                                             |
| MISFILED                 | 0              | —                                                               |
| exact / contained / near | 116 / 289 / 45 | clean                                                           |

**Zero stale entries of the class the axis predicted.** No entry describes a kit line that was
rebalanced away. What the residue actually is:

- **Kit-text SOURCE DRIFT (`moran`, `zwei`, 5 findings)** — the entries quote blablalink prose (the
  objective SSOT) and `data/characters.json` (synergy API) does not print those lines. Verified
  per-unit rather than assumed: `laplace` (RL/Iron, not `laplace-ultimate-hero`) files the _same_
  "Note: Unable to take cover." entry and it MATCHES, because her API text carries the line while
  `moran`'s does not. The entries are faithful to the SSOT; the census can only see the API text.
- **Hand-written bookkeeping (`neon-vision-eye`, 3 findings)** — Firepower-Gauge arithmetic that was
  never a kit line. One is worth a reviewer's attention on its own terms: an entry filed under
  `unmodeled` that states the behaviour **is MODELED** ("enacted 2026-08-09, owner faithfulness
  ruling … as two everyN:3 self burstGenPct blocks"), plus two more marked "ABSORBED into the everyN
  3 alternation". That is modelled behaviour recorded in the index of unmodelled behaviour. Logged,
  not enacted — moving it is prose surgery on a graded unit and belongs to her own review.
- **`sugar` magnitude drift (2 findings)** — both cover-attacked entries quote a "(20% chance)" proc
  that today's kit text does not print. Unresolved between stale-vs-source-drift, and **board-inert
  either way**: the v1 boss never attacks, so the trigger never fires. Recorded, not enacted.

### 4b.2 What running it taught — three matcher defects, each a false-positive class

Worth stating because every future axis will hit them:

1. **Kit text is written in BLOCKS, and entries quote blocks.** A `■` header carries the trigger and
   target clause; the effect lines beneath it belong to it. `naga` files "Activates after 12 normal
   attack(s). Affects all allies. Restores 14.57% of Cover HP." — a header plus the line under it,
   and `tia` files a three-line block as one newline-joined entry. Scoring those against individual
   LINES can never match, so this was a structural blind spot, not a threshold to tune (23 findings
   → 8).
2. **There are two annotation conventions**, not one: ` — reason` (122 entries) and a trailing
   parenthetical (`takina`, `ark-ranger-black`, `tia`, `velvet`). Scoring the reason as quoted text
   sank all four below any sane floor.
3. **A containment floor must bind the CONTAINED side**, whichever it is. Both first-run MISFILED
   findings were a long entry "containing" the line "Affects self." — a clause in nearly every kit
   in the game — and scoring a perfect match against the wrong slot.

And the one that changed the instrument's shape: **token coverage cannot see a rebalance.** An entry
quoting a line whose number changed scores 10/11, because a magnitude counts for exactly as much as
the word "the". Magnitudes are therefore gated separately from words and get their own tier — the
single most likely way a genuinely stale entry would ever appear.

### 4b.3 Calibration + what it cannot see

Scored against the graded 45 per the method rule of §1: **3.2% of graded entries vs 1.8% of tail** —
comparable, so the tail output is not the census's own noise. The first run failed this badly (17
graded vs 6 tail); the matcher was fixed, not the roster.

`--skipped` restates the limits on every run. The load-bearing one: **an entry quoting a real kit
line, in the right slot, describing behaviour that is in fact MODELLED, is clean here.** This axis
falsifies "the kit backs this entry as filed"; only the per-unit read falsifies "this line is really
unmodelled" — which is precisely the `neon-vision-eye` case above, found only because her wording
happened not to match.

**Not wired into `verify.sh`.** `--check` exists and works, but gating would mean listing the 10 live
findings in `ACCEPTED` — and two of them (`sugar`, `neon-vision-eye`) are open questions, not
matcher blind spots. Writing those into an allowlist would be silencing, which is the one thing that
list must never be for. The fixture is the guard instead: it pins the worklist to its known 4 slugs
and runs in `verify.sh` via the vitest glob, so a NEW unit going stale goes red while nothing
asserts the current 10 are correct.

---

## 4b3. Axis 3 — non-percent quantities (BUILT, TESTED, **DECLINED**)

**Instrument:** `scripts/census-kit-quantities.ts` · fixture `scripts/tests/census-kit-quantities.test.ts`

Built TYPED, because a presence check is worthless here: axis 1 measured that 281 of 282 integer
magnitudes already collide with some duration or count elsewhere in the file, and non-percent
quantities are small integers almost by definition. So a duration must land in `durationSec`, a
round count in `durationShots`, a stack cap in `maxStacks`, a trigger count in the `hitCount`
trigger. 924 quantities parsed across 181 units, 36 unaccounted.

**Declined as a worklist generator.** Three reasons, in increasing order of how decisive:

1. **It fails the §1 calibration rule** — 8.0% of graded-slice quantities read unaccounted vs 2.2%
   of tail. Firing ~3× harder on the units the sweep read line-by-line means it is measuring
   authoring style: consolidation and time-averaging are what a careful review PRODUCES.
   `dorothy-serendipity`'s five "for 3 round(s)" lines fold into one `consolidation` block;
   `nayuta` folds two riders into one. Both read as missing.
2. **Recall is poor** — 456 numeric kit lines match no pattern at all. A worklist from a matcher
   with that coverage cannot support a claim in either direction.
3. **THE PREMISE WAS WRONG.** §4 justified this axis as "the tier that held the `d-killer-wife`
   round-count defect". Replaying the census against her pre-fix override (`git show ae0010d6^`)
   reads **clean** — the "Gain Pierce for 1 shot" line was correctly filed under `unmodeled` the
   entire time, with a reasoned annotation. The 2026-08-11 change was a **disposition change**, not
   a repaired omission: the Pierce tag turned out to feed the Damage-Up bucket, so a line that
   looked inert became worth modeling. The quantity was accounted for before AND after.

That third point generalizes, and it is the most useful thing this axis produced: **the defect
class the tail keeps hoping to mechanize is a modeling JUDGEMENT — "this line looks inert but
isn't" — and no accounting census can reach it.** Only the per-unit read can. Every axis here can
check that a kit line is _represented_; none can check that the representation is _right_.

## 4b4. Axis 4 — "fixed at" lines vs the clamp StatKeys (BUILT, RUN, CLEAN)

**Instrument:** `scripts/census-fixed-at-clamps.ts` · fixture `scripts/tests/census-fixed-at-clamps.test.ts`

Phase-4 checklist item 7. A fixing line OVERRIDES the additive stack rather than adding to it, so
encoding one as an ordinary buff reads correct at the nominal value and drifts the moment anything
else touches the same stat. **18 fixing lines across 11 units, all accounted — zero findings.**

Three things it had to learn first, all worth carrying:

- **Accepted encodings are per-FAMILY, not one key.** A weapon-swap that sets its own charge time is
  already buff-immune (`sim.ts:3711-3714` forces `chargeSpeedPct` to 0 when `u.swap.chargeFrames`
  is set), so `maxwell-ordinary-mechanic`'s five Overcurrent-staged `chargeTimeSec` values are
  correct without a clamp — while `nayuta` needs both fields precisely because hers differ (swap
  charges in 2.13s, kit fixes 1.8).
- **The subject comes from the block.** Kit text names it once then enumerates ("Charge Time is
  fixed." then five bare "Stage 3: Fixed at 2 sec." lines).
- **`unmodeled` counts as accounted.** `liberalio`'s "Gentle Current: Fixes charge time at 1 sec"
  fires only against a Rapture that is NOT the stage target — impossible on a single boss.

It ships a **RECALL CHECK** that is not decoration: the clamp carriers are an INDEPENDENT list of
units that must have a fixing line, so running the matcher against them measures recall directly.
It immediately caught that the first regex missed the verb form entirely — `snow-white-heavy-arms`
writes "**Fixes** charge time at 3.2 sec", not "is fixed at" — and widening for it then surfaced
`liberalio`, invisible for the same reason. **A census cannot validate its own recall; give every
future axis an independent list to score against.**

## 4b5. Axis 5 — held primitives (BUILT, RUN — one real finding)

**Instrument:** `scripts/census-held-primitives.ts` · fixture `scripts/tests/census-held-primitives.test.ts`

**`addStack` was documented as an unbuilt ENGINE PRIMITIVE GAP in QUEUE** — "two carriers is not
yet a mandate; log a third before building. Not authorized" — while the effect had already shipped
(`42a642de`), was implemented at `sim.ts` `case 'addStack'`, and had **seven** carriers, including
the very `flora` S1 the entry named as blocked. The stale entry is removed.

This drift is worth a permanent guard because it is self-perpetuating in the expensive direction: a
reviewer hits a kit line, looks the primitive up, reads "not built", and files the line as
unmodelable — without re-checking the tree. **A stale gap manufactures `unmodeled` entries forever,
and every one of them looks correctly dispositioned.**

The four zero-carrier StatKeys (`hasTrueNormals`, `whileSwapped`, `fireRatePct`,
`elementDamagePct`) are confirmed still uncarried, so their collapse-or-keep decision is genuinely
open. The census names its own blind spot: primitives with no schema key — `pascal`'s DEF-ranked
ally selector, `grave`'s empty-magazine effect, `trony`'s windowed accumulator, the MG
wind-up-speed modifier — cannot be carrier-counted and still need the per-unit read.

## 4b6. Axis 6 — recovery emit/consume (READ, and made decidable)

**Instrument:** `scripts/census-synergy-events.ts --pairing` · fixture
`scripts/tests/census-synergy-events.test.ts`

§4 said to READ this instrument rather than rebuild it. Reading the tables alone cannot answer F9's
question — "does this unit emit exactly the recovery events its kit grants" — because that is a
claim about the kit TEXT, which the tables never look at. `--pairing` is the cross-check.

**Zero false emits roster-wide** — nothing emits a recovery event its kit does not grant, which is
the board-relevant direction (a spurious emit feeds `crown`/`asuka` in every comp — the `liter`
cover-HP trap). The 17 non-emitters split 3 ally-scoped / 14 self-scoped; the self-scoped ones are
inert by MECHANISM (`fireRecovery` fires only the receiver's own blocks and no carrier owns a
recovery block), which is the 2026-08-10 ruling's reasoning now checked rather than assumed.

All three ally-scoped are recorded, and they are **not** the same case: `biscuit` and `emma`
(MG/Fire) have triggers that can never fire on the immortal, never-attacking v1 boss, but
**`pascal`'s "after firing 10 time(s)" is LIVE** — his heal is unmodeled only because the
DEF-ranked ally selector is a held primitive. **That is the finding: holding that primitive also
suppresses a recovery event that would feed `crown`,** so it is not the purely cosmetic hold the
F11 list implies.

---

## 5. The batched proposal — RULED AND ENACTED (owner, 2026-08-11)

> **OWNER RULING:** _"We should record all unmodeled behavior as unmodeled rather than leaving it in
> prose."_ Enacted in this pass. `unmodeled` is now the complete index the field was always read as.
>
> **What was filed:** the 50 heal-magnitude lines below across 34 units
> (`scripts/backfill-unmodeled-heal-magnitudes.ts`, idempotent, re-runnable after a roster sync),
> and nothing else. Each entry records
> what is missing (the amount) and what is not (the recovery event), in the `ada` wording, so nobody
> later "fixes" a filed line by adding a second emitter.
>
> **`kilo` was drafted and then DROPPED — one reading left open for the owner.** Her burst nuke IS
> modelled; only the kit's "ATK … calculated from 5% of final Max HP" BASIS is not, and that lives
> in her `caveats` with an estimate and a measurement recipe. Filing it would have asserted the nuke is unmodelled,
> which is false — but the ruling's plain text arguably covers a basis clause sitting in prose.
> Shipped: not filed. Full statement of both readings in DECISIONS (2026-08-11).
>
> **What else was deliberately NOT filed, and why that is not a loophole:** every remaining PROSE-ONLY
> line was checked, and all of them are magnitudes that ARE modelled, in transformed form (§2b) —
> `nayuta` folds 150 + 380.46 into one 530.46 rider, `takina` uptime-averages 140.49 × 10/15 = 93.66,
> `mihara-bonding-chain` ships 12 × 25.08, `soda-twinkling-bunny` sums 52.04 + 85.02. Filing those
> under `unmodeled` would assert something false. The ruling covers unmodeled BEHAVIOUR, and a
> transformed encoding is modelled behaviour.
>
> **The guard:** `census-kit-numbers.ts --check` now runs in `verify.sh`. A kit magnitude that
> appears nowhere in its override fails the gate, so the class cannot grow back silently. The one
> accepted exception is `power`'s "Reloads 100% of the magazine" (encoded as `instantReload
fraction: 1` — a percent stored as a fraction is invisible to a digit matcher), recorded with its
> reason in `ACCEPTED_SILENT` and pinned by a test that fails if it ever stops firing.

### What the split looked like before the ruling

The structured record of inert heal magnitudes was about half-populated, and the split was
per-LINE, not per-unit — the same override often filed one heal line and left its others
unrecorded, so it could never be read as "these units are tidy and those are not". That shape is
why the ruling was worth asking for: no per-unit heuristic would have found the gaps.

Method (reproducible from the committed instrument, not a hand grep): the population is every kit
line that both restores HP (`HEAL_LINE`) and prints a percent magnitude; the tiers come from
`npx tsx scripts/census-kit-numbers.ts --json`.

| Heal-magnitude kit lines                       | Lines  | Units |
| ---------------------------------------------- | ------ | ----- |
| **total**                                      | **92** | 62    |
| structurally recorded (encoded or `unmodeled`) | 42     | —     |
| in `note`/`caveats` prose only                 | 46     | 31    |
| absent from the override entirely (SILENT)     | 4      | 3     |

`ada` is the model wording for the recorded half: _"Recovers 10% of the damage dealt as HP for 10
sec. — magnitude only: the 10s recovery-event WINDOW is modeled …; the HP amount has no engine
consumer (no HP pool)"_. `biscuit` is why the per-unit framing misleads: she files her skill2 heal
in exactly that style, while her skill1 (1.53%) and burst (55.44%) heals are silent. `crown` and
`sin` are silent on their one heal line each.

Nothing about damage changes either way — heal amounts have no engine consumer, and the recovery
EVENT (the board-relevant half, audit F9) is modelled independently of this. What changes is
whether `unmodeled` is a **complete index**: `gen-unmodeled-review.ts`, `kit-status.json` and every
reviewer's grep read that field, so a half-populated one quietly under-reports what the model
skips. `kilo` is the same shape outside the heal class — her burst's "calculated from 5% of final
Max HP" basis gap is fully documented in prose, with an estimate and a measurement recipe, and appears
nowhere in her structured record.

The backfill was exactly that population: the 46 prose-only lines in 31 units plus the 4 silent
lines in 3 more, no unit in both sets — 50 lines, 34 units, prose-only edits, zero board movement
(the regression snapshot is untouched, which is the proof).

---

## 6. Stop rule

The tail is DONE when each axis above is either built-and-dispositioned or explicitly declined,
**not** when 138 files have been opened. **Axes 1 and 2 are closed** — instrument committed, fixture
pins the matcher and the worklist, every finding read. Both ship `--explain <slug>`, which gives
everything a disposition needs without opening the file (axis 1: the kit line, the prose mentioning
the magnitude, the slot's encoded values; axis 2: the entry, its quoted head, the best-matching kit
line, and the entry tokens that line lacks).

**ALL SIX AXES ARE NOW CLOSED (2026-08-11): 1, 2, 4, 5, 6 built-and-dispositioned; 3 explicitly
declined with its evidence committed.** By this doc's own stop rule, the tail is DONE — and it is
done without opening 138 files.

### What six axes actually produced

| Axis | Population                  | Enacted changes             | Findings left open                       |
| ---- | --------------------------- | --------------------------- | ---------------------------------------- |
| A1   | 1,259 kit magnitudes        | 50 filed lines              | 0                                        |
| A2   | 460 `unmodeled` entries     | 0                           | `sugar`, `neon-vision-eye`               |
| A3   | 924 quantities              | 0 — declined                | 0                                        |
| A4   | 18 fixing lines             | 0                           | 0                                        |
| A5   | 5 keyed primitives          | 1 stale QUEUE entry removed | 0                                        |
| A6   | 92 heal lines / 45 emitters | 0                           | `pascal` (F11 has a synergy consequence) |

**The tail's structured record is in good shape, and that is the result.** Not one axis found a
defect in what the overrides encode. What they found instead were defects in the DOCS ABOUT the
overrides — a QUEUE entry calling a shipped primitive unbuilt (A5), a plan premise that
misremembered why a unit was fixed (A3) — plus a handful of open per-unit questions.

### The four lessons, for whoever builds a census here next

1. **Score against the graded 45 FIRST.** Every axis whose first run fired hardest on the
   already-read slice had a broken matcher (A1, A2), except A3 — where it was the axis itself that
   was broken. Four out of four times, the check was decisive. It costs one flag.
2. **A census cannot validate its own RECALL.** A phrasing the matcher misses is indistinguishable
   from a clean roster. Give every axis an INDEPENDENT list to score against — A4's clamp carriers
   caught that its regex missed the verb form entirely, which was hiding two units.
3. **"Accounted for" must mean the same thing in every axis** — encoded, encoded-equivalently, or
   filed under `unmodeled`. A4 and A3 both had to learn this; without it two censuses reach
   opposite verdicts on the same unit.
4. **The class none of this reaches is the modeling JUDGEMENT** — "this line looks inert but
   isn't". That is what the `d-killer-wife` fix actually was (A3), and it is only reachable by the
   per-unit read. Mechanical censuses check that a kit line is REPRESENTED; they cannot check that
   the representation is RIGHT. Do not inflate an axis to justify having built it.

`census-kit-numbers.ts --check` now runs in `verify.sh` (§5): a kit magnitude that appears nowhere
in its override fails the gate. The PROSE-ONLY tier stays advisory on purpose — a magnitude living
only in prose is usually a legitimate transformation, so gating it would demand `unmodeled` entries
for lines that are modelled.
