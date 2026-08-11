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

1. **A2 — `unmodeled` entries that match no kit line.** Entries are mostly verbatim kit lines, some
   annotated ("… — magnitude only: …"); the residue would be entries describing lines the kit no
   longer prints, which read as live gaps forever. Cheap, and it cleans an input every other pass
   reads. ⚑ A throwaway scoping probe put the non-verbatim residue at roughly a fifth of ~410
   entries, but that number came from an ad-hoc matcher that was never committed and is NOT
   evidence — re-derive it as the first step of building A2, don't plan on it.
2. **A3 — non-percent quantity accounting.** The complement of axis 1: durations, round counts,
   stack caps. Higher noise, but it is the tier that held the `d-killer-wife` defect.
3. **A4 — "fixed at" lines vs the clamp StatKeys** (phase-4 checklist item 7). `reloadSpeedClamp` /
   `reloadTimeClamp` / `chargeTimeClamp` exist and 8 units carry them; a kit-text census of "is
   fixed at" phrasings against clamp usage is a small, decisive check.
4. **A5 — held-primitive carrier scan** (F11). Grep the tail's kit text for the shapes of primitives
   held for want of carriers (`addStack`, DEF-ranked selectors, empty-magazine effects). Logs new
   carriers against the gap; does not propose builds.
5. **A6 — recovery emit/consume**, already served by `scripts/census-synergy-events.ts`. The tail's
   job is to READ it, not rebuild it.

**Carried follow-up on axis 1 itself:** tighten the integer-magnitude case (§3) rather than only
disclosing it — e.g. require `%`-adjacency when matching an integer in prose, and treat a bare
integer token inside a structured block as WEAK evidence that still surfaces at low severity
instead of clearing the line. Raised by the cross-family review (`kimi-code/k3`, 2026-08-11) as a
FOLLOW-UP; not done here because it changes matcher semantics and would want its own
graded-45 re-calibration.

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
> in her `caveats` with a ⚑ and a recipe. Filing it would have asserted the nuke is unmodelled,
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
Max HP" basis gap is fully documented in prose, with a ⚑ and a measurement recipe, and appears
nowhere in her structured record.

The backfill was exactly that population: the 46 prose-only lines in 31 units plus the 4 silent
lines in 3 more, no unit in both sets — 50 lines, 34 units, prose-only edits, zero board movement
(the regression snapshot is untouched, which is the proof).

---

## 6. Stop rule

The tail is DONE when each axis above is either built-and-dispositioned or explicitly declined,
**not** when 138 files have been opened. Axis 1 is closed: instrument committed, fixture pins the
matcher and the worklist, every finding read. If a future axis fires on a unit, `--explain <slug>`
gives the kit line, the prose that mentions the magnitude, and the slot's encoded values — which is
everything the disposition needs.

`census-kit-numbers.ts --check` now runs in `verify.sh` (§5): a kit magnitude that appears nowhere
in its override fails the gate. The PROSE-ONLY tier stays advisory on purpose — a magnitude living
only in prose is usually a legitimate transformation, so gating it would demand `unmodeled` entries
for lines that are modelled.
