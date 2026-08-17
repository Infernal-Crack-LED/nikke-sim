# Pellet reader — SESSION-CLOSE judge handoff (2026-08-04)

> AI-facing. **Read this first; it supersedes the two 08-04 handoffs as the entry point.**
> **CONTINUES** [`2026-08-04-lifetime-cap-JUDGE-handoff.md`](2026-08-04-lifetime-cap-JUDGE-handoff.md)
> (whose §2 provenance ledger, §3 restructure explanation and §5 traps are still worth reading in
> full) → [`2026-08-04-pellet-reader-JUDGE-handoff.md`](2026-08-04-pellet-reader-JUDGE-handoff.md) →
> `2026-08-03` → `2026-08-02` → `2026-08-01-pellet-cascade`.
> **The graveyards and traps in all of them are live and binding.**
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`,
> `hitsPerShot: 10`.

---

## 0. The one-paragraph state

**The reader is measurably more faithful than it was this morning; the cold SG read is not
explained.** Four items closed, **three behaviour-touching landings** shipped, four hypotheses died,
and the owner confirmed the ground-truth reference. **But the largest defect found — a 16.9% mislock
rate — turned out to cost approximately nothing**, so §19's −1.40 pellets/shot residual now has no
identified cause.

⚑ **And nothing on the board has moved yet.** All three landings change **FUTURE reads only**; none
retroactively alters an existing dump. Every dump on disk still carries the values it was extracted
with and still replays the OLD pre-hybrid rule, so **no measurement re-derived from an existing dump
is current** until footage is re-extracted (§8.7).

Owner's framing, which set the priority order for the second half of the session: _"the goal is
chasing why shotguns are cold, but to do that at scale we need proper tooling. Anything that makes
our tooling more faithful is a win, even if it has nothing to do with the cold SG read."_

## 1. What this session settled — `docs/probe-runs.md` §14–§24

| §       | Question                                           | Outcome                                                                                                                                                                       |
| ------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **§14** | Does widening the lifetime band recover pellets?   | **YES.** `band_hi = 20` clears both mandatory out-of-sample gates — ceiling **3.1%** (reject > 6.2%), corridor **0.64–0.84**/event (reject > 2.00), 0 of 4 dumps failing.     |
| **§16** | Land it                                            | **LANDED.** Blast radius **declared before the edit** and held exactly: zero fixtures, zero pins. Cross-family post-op `ACCEPT`.                                              |
| **§17** | Is 60 fps localization fixable? (`run21`/`run21b`) | **NO — answered in the NEGATIVE.** Structural fixes the lock RATE (0% → 100%) but **~81% of those locks are HELD** vs 8.1% on a working far-band dump. Windows stay unusable. |
| **§18** | Is the 8.40 reference itself right?                | **YES — OWNER-CONFIRMED.** Nothing lands and fades before `t0+8`. ⇒ the cold bias is **real reader behaviour, not a bad target**.                                             |
| **§19** | What did the landing buy, on the production path?  | **+0.60 pellets/shot** (−2.00 → −1.40 mean per-shot error), and it **reconciles EXACTLY** with §9B's independently-recorded decomposition — **not cancellation**.             |
| **§20** | What fraction of production shots are mislocked?   | **16.9%** (137/811, 4 dumps, 4 units). Pre-committed band: **"> 10% ⇒ dominant channel"**.                                                                                    |
| **§21** | What does a mislock cost?                          | ⛔ **VOID** — the pre-committed falsification control fired (0.706 ≥ 0.50). Severity is **not derivable from the two locks alone**.                                           |
| **§22** | Cost, with owner ground truth                      | ⚑ **Production lock is bad on 70% of flagged shots (~11.8% of ALL), but severity is −0.30 ± 0.76 — INDISTINGUISHABLE FROM ZERO.**                                             |
| **§23** | `--dump-tracks` drops the `band` channel           | **FIXED.** Every dump had been replaying as pre-hybrid — a silent production/analysis divergence.                                                                             |
| **§24** | Backend-selector tie-break                         | **FIXED.** Two passenger channels, not one. Exactly **one** shot moved across 848, the pre-declared one.                                                                      |

## 2. ⚑ The four findings that matter most

### 2.1 A bad crosshair lock does NOT systematically cost pellets (§22C)

On the 10 shots where the owner established the production lock is **provably wrong**, the count
loss is `−1, −7, +2, 0, 0, 0, 0, +1, 0, +2` — **mean −0.30, sd 2.41, SE 0.76.** Five are exactly
zero and three are **positive**. One wrong lock even reported **11**, above the `hitsPerShot = 10`
physical ceiling.

⇒ **§20D's ≈ 0.85 pellets/shot estimate is REFUTED as stated.** It was `rate × ONE shot's severity`;
measured across ten, severity is consistent with zero. **The largest identified defect does not
explain §19's residual.**

⛔ **The caveat that keeps it alive:** §22D — the **20% of flagged shots where BOTH locks are wrong**
are excluded from that severity number _by construction_ (template is not a valid reference there),
and are probably the worst. **The estimate is biased toward zero; the true cost is ≥ what was
measured.** Sizing that population needs a method that does not use template as the reference.

### 2.2 The reference is confirmed, so the bias is real reader behaviour (§18)

Of 140 screened tracks only **11** were ever candidates for "lands and fades before the owner's
window" — nothing dying before `t0+8` exceeds life 5, against an owner-pellet minimum of 8. Shot 2
sitting at the `hitsPerShot` ceiling killed 5 by arithmetic. All 6 survivors adjudicated **not
pellets**: HUD ammo-bar segments at a fixed `dy ≈ −40`, and rising damage numbers.

⇒ **8.40 stands.** The block on ever stamping a bias verdict is lifted.

### 2.3 The reader counts UI artifacts as hit-markers (§24D) — NEW, unfixed

The event §24 flipped to `core = true` spans **f1565**, where §15 established opencv's `marker = 3`
is **1 genuine crosshair-attached marker + 2 red UI-banner glyphs**. `MARKER_MIN = 2`, so **banner
glyphs alone raise a core-hit flag.** The old array-order bug was accidentally masking this.

⚑ **The discriminator already exists** — §15's constant-crosshair-offset test separates attached
markers (constant `dx`/`dy` across frames) from single-frame glyphs.

### 2.4 The 112 abstentions are a CONCURRENCY gate, not absent tracks (§14F)

Two prior documents describe them as "no lifetime-band track in radius at all". That is true of
**3 of 112**. For **81 (72%)** a band track IS present and in radius; the event abstains because the
band series never reaches `MERGE_EVENT_MIN` (3) **concurrently**.

## 3. Graveyard — this session's additions. DO NOT RESURRECT.

| Hypothesis                                                              | What killed it                                                                                                          |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **"Raise `max_pellet_frames` from 13 to 20"**                           | The cap gates `pellet_ids` → all four channels **and segmentation**. Wrong lever; superseded by the decoupled `band_hi` |
| **"`band_hi = 20` is FORCED by the `.5`-rounding hazard"**              | `round(9.5) == 10` in **both** languages. Only 21 desyncs. 19 is equally safe ⇒ the choice is a margin judgment         |
| **"19 and 21 are sensitivity arms showing value-robustness"**           | All three scale to `band_hi = 10` at 30 fps ⇒ **one measurement, not three** on every out-of-sample dump                |
| **"The 112 abstentions have no band track in radius"** (2 docs said so) | True of 3 of 112. The gate is **concurrency**, not existence                                                            |
| **"§2.1's categorical check is the PRIMARY evidence"**                  | **Tautological** — the corridor is derived from the population the check re-reads. Cannot fail                          |
| **"opencv's `marker = 3` at f1565 might be a true core hit"**           | Two of three are single-frame components on a red UI banner line (§15)                                                  |
| **"60 fps localization is broken"**                                     | 4 of 6 60 fps dumps lock 100%, including a far-band one. `run21`/`run21b` are template-mode extractions nobody redid    |
| **"Mislocks are the dominant undercount channel"** (§20D's 0.85/shot)   | ⚑ **§22C: severity is −0.30 ± 0.76, indistinguishable from zero.** Rate high, cost ~nil                                 |
| **"Severity is derivable from the two locks"**                          | §21's own control fired: counting is sensitive to lock shifts far below the 160 px threshold                            |

## 4. Traps — new this session

1. ⚑ **Python `round()` is banker's; JS `Math.round()` is half-up — and they have ALREADY diverged
   here.** `round(6.5)` is 6 in Python but the dumps store **7**, because `read-pellets.ts` computes
   the cap. **Never recompute a stored cap.**
2. ⚑ **A categorical check derived from the population it scores is TAUTOLOGICAL.** Ask: could this
   have come out any other way? Different failure from mean-matching; the pre-commit design did not
   catch it, the gate did.
3. ⚑ **`band` is NO LONGER a subset of `white`** (post-`band_hi`). Any assert or docstring assuming
   it is, is wrong.
4. ⚑ **DO NOT relate `avgTotal` to the ~1.08 cold bias — different bases.** `avgTotal` is per-EVENT
   pooled over 852 unlabelled events; the deficit is per-SHOT against an f8–11 window reference.
5. ⚑ **NARROW BEFORE YOU QUOTE.** §24's raw exposure was 1,018 frames; narrowed to what can actually
   change an answer it is **0**. Quoting the raw number would have been the §20D trap. **Always ask
   "can this change an answer?" before reporting a count.**
6. ⚑ **Gate packets live in the GITIGNORED `scratchpad/`** and were **LOST** when the worktree was
   deleted (§7). Quote a gate's substance into a committed doc **at the time you receive it**.
7. **`cmd | tail; echo $?` reports TAIL's exit status.** Caught the orchestrator again this session.
8. **A git worktree normally runs NO pre-commit hooks** — but a worktree restored with
   `npm install` **does** (it regenerates `.husky/_`). Do not assume either way; check.
9. ⚑ **Only NEWLY-written dumps carry `band`.** Every dump on disk still replays the OLD pre-hybrid
   rule, so **any measurement re-derived from an existing dump is not current.**

## 5. Method notes — three patterns, not incidents

- ⚑ **The cross-family pre-op gate caught TWO landing plans that would have been silent no-ops.**
  The `band_hi` restructure (`band_ids` built as a subset of `pellet_ids`, so raising the bound alone
  changes nothing) and the backend-selector fix (activity keyed on `white + red > 0`, false for every
  backend on exactly the frames the defect fires). **Both plans were confident about a mechanism
  without checking that the mechanism fires.** That is now a named failure mode of this driver.
- ⚑ **A pre-committed control fired and voided a result that would otherwise have been believed**
  (§21). Without it the pass would have reported a tidy `cost ≈ −0.21 pellets/shot`, landed it in the
  "§20D refuted" band, and been wrong.
- ⚑ **Derivation shrank the owner ask twice.** §9A estimated a full re-labelling pass at the plateau
  frame; a pre-screen plus ceiling arithmetic reduced it to **6 images**, then driver adjudication of
  4 reduced it to **2**. Before asking for owner time, ask what is derivable.

## 6. Landed state

**Branch `fix/pellet-reader`, PUSHED to `origin` (owner-authorised 2026-08-04).** Read the count
live: `git rev-list --count origin/fix/pellet-reader..HEAD`. ⛔ **`main` is still held**, and it
lands via **PR, never a local merge** (constraint 8).

**Behaviour-touching landings: THREE.** `band_hi = 20` (`count-pellets.py` + `read-pellets.ts`);
`--dump-tracks` carries `band`; the backend-selector passenger-channel fix. **Across all three,
exactly ONE shot changed** — §24's pre-declared `core_hit` flip — and **zero fixtures moved**.

**Instruments landed, each with a committed self-validating fixture and a selftest arm:**
`--cap-score`, `--marker-geometry`, `--fade-screen` (+ `--fade-screen-crops`), `--mislock-rate`,
`--lock-adjudication`. `pellet-selftest.sh` is now **25 arms**; `verify.sh` green.

## 7. ⚠ The worktree was deleted mid-session — what survived and what did not

A stray `git worktree remove` deleted `/Users/maxwellsutton/nikke-sim-wt-pellet`.

- ✅ **All commits survived.** Worktrees share the main repo's object store and the branch ref was
  intact. Restored with one `git worktree add` + `npm install`.
- ✅ The tree was **clean** at deletion, so nothing uncommitted was lost.
- ❌ **The gitignored `scratchpad/gates/` was lost** — the raw pre-op/post-op packets and verdict
  JSONs for all four cross-family gate runs. Four docs cited those paths; each now states plainly
  that the artifact is lost and names what survives (the verdicts are quoted verbatim in the §8
  revision tables, §14J, §20F and §24E). **No conclusion depends on the lost packets.**

## 8. Open, in priority order

0. **⚑ THE COLD BIAS IS OPEN AND ITS CAUSE IS LESS CLEAR THAN THIS MORNING.** §19 left **−1.40
   pellets/shot** after the `band_hi` landing and attributed it to localization. §20 + §22 then
   showed localization is **common but not costly**. **No identified defect explains the residual.**
1. **⚑ SIZE THE BOTH-WRONG POPULATION (§22D).** 20% of flagged shots have **both** locks wrong; they
   are excluded from the severity measurement by construction and are probably the worst. Needs a
   method that does **not** use template as the reference. **This is the live thread on the cold read.**
2. **⚑ MARKER SEMANTICS (§24D) — NEW.** `MARKER_MIN = 2` is met by red UI-banner glyphs, so the
   reader raises core-hit flags on UI artifacts. **The discriminator already exists** (§15's
   constant-offset test). Concrete, bounded, pure faithfulness; changes `core_hit`, so needs its own
   blast-radius pass.
3. **The 112 → 96 abstentions.** What the 81 `in_band_no_concurrency` events are, and what the 16
   that become banded at `band_hi = 20` share. Committed fixtures only, no owner time.
4. **Track fragmentation** — 70% of tracks dead by frame 2 at 30 fps, 64.3% at 60. Plausibly the
   same root as item 3; treat together.
5. **The missing-shot channel — which BASIS carries the bias.** Aggregate 3.9–6.8% vs per-event
   16.7%/17.4%. `guilty` **f1787** still mechanistically unexplained (n=1 — do not manufacture a cause).
6. **`debounce_shots` SEGMENTATION — ⛔ OWNER-GATED.** Biggest measured win available: `cap_cadence`
   (~3 LOC) + `resplit` (~10 LOC) cut pooled MISSED **7.0% → 4.2%/4.5%**. ⚠ **`cap_cadence = 35` is
   NOT reproducible** (the literal 0.9× gives 37/11/−0.019) — sort that constant's provenance before
   landing. ⛔ `candA` is REFUTED; do not re-propose.
7. **⚑ RE-EXTRACTION — the gate on everything above.** All three landings reach **new extractions
   only**. Frames for all 5 dumps are on disk (~24,700), so this is a re-run of the production path,
   not a video re-extraction. **Until it happens, today's gains have not moved the board and no
   re-derived measurement is current.**
8. **The generator's radial envelope; Phase 2 steps 4–6** — blocked on the owner's Decision 1 and
   outstanding `/logic-gate` pre-op revisions.
9. **Doc hygiene owed:** `/patch-notes` + `/doc-maintenance` before **`main`** (both hooks nudged on
   the branch push; neither is due for a feature-branch push, both are due before `main`).
10. **§22F — a generation defect for any re-run of the adjudication set:** tight crops were **clipped
    at the frame boundary** when a candidate sits near an edge (owner flagged case 9). Pad or shift
    edge-adjacent crops rather than clipping.
