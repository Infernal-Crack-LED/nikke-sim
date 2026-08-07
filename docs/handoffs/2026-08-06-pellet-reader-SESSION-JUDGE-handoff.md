# Pellet reader — SESSION-CLOSE judge handoff (2026-08-06)

> AI-facing. **Read this first; it is the entry point.**
> **CONTINUES** [`2026-08-04-pellet-reader-SESSION-JUDGE-handoff.md`](2026-08-04-pellet-reader-SESSION-JUDGE-handoff.md)
> → `2026-08-04-lifetime-cap` → `2026-08-03` → `2026-08-02` → `2026-08-01-pellet-cascade`.
> **The graveyards and traps in all of them are live and binding.**
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`,
> `hitsPerShot: 10`. `h4-*` / `g2-*` / `groundtruth-f811-*` / `*-tmplloc` are DUMP slugs, not units.

---

## 0. The one-paragraph state

**This was a JUDGE session and its main product is corrections, not new capability.** It landed
`docs/probe-runs.md` **§36–§43** and 35 commits. The reader is measurably more trustworthy: the
audit that scores it now reads the **shipped** channel, `−1.40` has a committed instrument for the
first time, and the mislock channel went from "closed at ≈0" to a measured mechanism. ⛔ **The cold
SG read is still unexplained and the reader is still ~1.4 pellets/shot cold.**

⚑ **Get your bearings before doing anything:** the reader exists to diagnose the **sim's 15.7% SG gap**
(`marciana` SG/Iron, NO override, sim/real **0.843**, `docs/probe-runs.md` "BASE-WEAPON BASIS"
2026-07-23). This session began by wrongly telling the owner those were separate threads. They are
not — the reader is the instrument for splitting that gap between the landing term and the
core-per-landed term, and **a reader that is itself ~17% cold would push the sim the wrong way.**

## 1. What this session settled — §36–§43

| §       | Outcome                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **§36** | ⛔ The composition audit is **VOID** — `--representative-audit` could not score the shipped path; its own control fired. **The owner's labels and the `band` channel had never met.** |
| **§37** | ✅ **FIXED via Route C** (reuse `_hla_production_band`). Composition answered **AGAINST** the hypothesis: **35 = 31 owner + 4 non-owner (88%)**, vs the legacy arm's 12/35 (34%).     |
| **§38** | ✅ §19's A/B **rebuilt as `--residual-ab`** and **REPRODUCED to ±0.0000** (−2.00 → −1.40, Δ +0.60).                                                                                   |
| **§39** | ✅ Mislock **mechanism measured**: `J_mis` 0.29–0.60 vs `J_ok` **0.95–1.00**; several shots at **zero overlap**. Pre-committed band **row 4** fired.                                  |
| **§40** | ⛔ **40.1% of flagged mislocks are a STUCK TEMPLATE** (frozen reference). §20's 16.9% measures **disagreement**, not structural mislock rate.                                         |
| **§41** | ⛔ The lock-offset lead **FAILS its own rule** (P2: `dy` sd 109 vs 100). But **P3 is decisive**: 584 normal shots agree to **3 px / 1 px** ⇒ **bimodal**.                             |
| **§42** | ⚑ The mislock is **ASYMMETRIC** — structural jumps **UP 265 px**, template stays put (30 px). Matches a failure `make-groundtruth-f811.py:168` already documented AND measured.       |
| **§43** | ⛔ The decoy pixel test **FAILS P3 by ONE SHOT** (79.3% vs 80%). Structural demonstrably **leaves the box** (0.633 → 0.245), but template is **also degraded** (0.515 vs 0.587).      |

## 2. ⚑ The four findings that matter most

### 2.1 The instrument was scoring a channel production stopped using (§36 → §37)

`--representative-audit` was pre-hybrid **three ways** — `is_pellet`, the `_merge_events` rep frame,
and `_rep_slim_labelled`'s 3-wide rows making `has_band` false **by construction**. ⇒ Its
`12 / 35` was never a property of the shipped reader. **The same total, 35, decomposes as 12 owner
pellets on the legacy channel and 31 on the shipped one.** ⚑ The purest compensating-error case this
branch has produced: the right total made of the wrong objects.

### 2.2 COUNT is the wrong observable for a lock defect (§37B → §39 → §22C)

A mislocked count is **refilled by non-pellet tracks**, so §22C's count-based "mislocks cost ≈0"
is structurally blind. §39 measured it: on mislocked shots the two locks count **different pellets**
(zero overlap on several), against a control where they agree essentially exactly.
⇒ **Any future lock/gate severity measurement must score pellet IDENTITY, not count.**
⛔ This does **not** overturn §22C — it localizes it to its sample and its observable.

### 2.3 §19's `−1.40` had NO committed instrument (sweep §1)

The denominator of the whole cold-SG accounting — §27C's "3.4%", §31D's "3%", §35D's "32%" are all
fractions of it — and none of the ~40 arms produced it. **Second occurrence of the constraint-9
failure the 2026-07-29 gauge instrument caused.** It hid because §19E _reads_ like a reproduction
section while naming only inputs. Now `--residual-ab`, reproducing exactly.

### 2.4 The mislock is one-sided, and it was already written down (§42)

Structural jumps **up 265 px** onto the floating damage numbers; template holds. `make-groundtruth-f811.py:168-175`
already described this decoy failure **and recorded that it was measured**. §40C/§41 re-derived its
signature without connecting it to the comment that named it. ⚑ **Grep the code comments before
treating a signature as new.**

## 3. Graveyard — this session's additions. DO NOT RESURRECT.

| Hypothesis                                                 | What killed it                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| "The reader's count is mostly non-pellet material (12/35)" | §37B — that was the LEGACY channel; the shipped one reads 31/35                             |
| "The composition defect is the top item"                   | §37 — answered AGAINST; the defect was in the instrument, never the reader                  |
| "§35's radius gate is the largest channel (≈0.45/shot)"    | The judge verdict — 2–3 distinct pellets, and the 2026-08-01 sweep chose H_centre           |
| "Widen `_rep_slim_labelled`'s rows to carry `band`"        | No committed band-carrying source; a re-dump bundles `8d500ff9`'s precision change. Route C |
| "One fixed HUD offset explains the mislocks" (§40C)        | §41 — `dy` sd 109 vs a committed 100; 40% CV is a direction, not a constant                 |
| "The structural lock leaves ⇒ use the template lock"       | §43 — template is ALSO degraded on mislocks (0.515 vs 0.587); ~21% neither is on the box    |
| "§20's 16.9% is the structural mislock rate"               | §40A — 40.1% of it is a STUCK TEMPLATE, i.e. a reference failure                            |

## 4. Traps — new this session

1. ⚑ **A pre-commit that fails by a hair is a FAIL.** Twice today: §41's P2 (109 vs 100) and §43's
   P3 (79.3% vs 80%, one shot). Both times the pressure to say "essentially passed" was real and
   both times the rule was written specifically to stop it. **Do not move a committed threshold.**
2. ⚑ **A null result from an instrument that fails its own POSITIVE CONTROL is not evidence.** §43A:
   the first pixel run scored 0.221 where the answer must be high. Cause: the crosshair is the ammo
   box centre **offset by** `ammo_offset_x` / `ammo_offset_y`, which these dumps carry as
   **(125, −11)** — so the patch sat 125 px off the box. Fixing an instrument after its positive
   control fails is legitimate; **declare it**.
3. ⚑ **`verify.sh` does NOT run `pellet-selftest.sh`.** The (now 34) pellet arms are **outside the
   push gate**. Run it explicitly; "verify green" has never covered them.
4. ⚑ **Prettier reformats AFTER you write** (lint-staged). A markdown banner containing `+ ` or `- `
   near a wrap point gets mangled into a list item — invisible unless you re-read. Bit twice today.
5. **The fixture regeneration recipe was a TRAP** — `representative-audit-slice.json`'s `_note`
   omitted `--representative-audit-fps 60 30 30 30 30`, which defaults to 30 for a 60 fps dump and
   **silently rewrites ~45 `_expected` values**. Now documented; check for the same shape elsewhere.
6. **Worktree husky hooks DO run here** (`.husky/_` present). The memory saying otherwise was
   over-broad and is corrected — `ls .husky/_` once per session.
7. ⚑ **Beware re-cutting a sample using a failed test's output** (§43D). It is how a selection
   effect gets built in. If the ask is re-stratified on the pixel score, that needs its own pre-commit.

## 5. Method notes

- ⚑ **Pre-commits earned their keep four times**: they voided §36's composition verdict, fenced
  §38's expected-match as weak evidence, failed §41 and failed §43. **A rule written after the
  numbers would have passed all four.**
- ⚑ **Split adversarial passes.** The sweep ran arm-classification and citation-cataloguing as two
  agents that could not see each other's output; the join was the finding. Neither half alone would
  have found that `−1.40` had no instrument.
- ⚑ **Judge your own fresh results.** §40B went looking for a confound in §39 (landed an hour
  earlier) and quantified it — it moved nothing, but that was checked, not assumed.
- ⚑ **The owner corrected a load-bearing framing** (the "two separate colds"). Re-read
  "BASE-WEAPON BASIS" before reasoning about why the reader matters.

## 6. Landed state

**Branch `fix/pellet-reader`. 35 commits this session, ALL UNPUSHED.** `verify.sh` PASS,
`pellet-selftest.sh` **34 arms**, `doc-drift` ok, tree clean.

**New arms:** `--residual-ab`, `--mislock-identity`, `--mislock-crops` (+ selftests + fixtures).
**Behaviour-touching:** `--representative-audit` now scores the shipped channel (§37);
`_hla_production_band` honours `band_hi`; `_rep_slim_labelled`'s params whitelist keeps `band_hi`.
**Exactly one existing fixture moved** (`representative-audit-slice.json`), by its declared keys only.

⚑ **`stash@{0}`** holds an unintended prettier reformat of 4 out-of-scope pellet fixtures
(JSON-equal, reverted deliberately). Drop it or apply it; it is not load-bearing.

## 7. ⛔ Open, in priority order

0. **THE COLD SG READ IS STILL UNEXPLAINED**, and the reader is still ~1.4/shot cold. Every channel
   is closed, sized small, or unmeasured-in-magnitude. ⚑ **Closing a candidate is not identifying a cause.**
1. **⚑ THE OWNER ASK — MAGNITUDE.** `docs/handoffs/2026-08-06-OWNER-ASK-mislock-labels.md`, 10 shots
   / 40 crops at `scratchpad/pellets/mislock-labels/`. **Reworked to MARK-THE-PELLETS** (the owner
   marks pellets + the reticle; the tool does all window arithmetic) after the owner correctly
   pointed out the count-inside-a-bare-coordinate task was impossible. **This is the only route to
   magnitude and it needs owner time.**
2. **Sweep item 4 — `_ps_band`'s `band_hi`.** 8 of 9 call sites omit it. **NOT provably inert** (two
   fixtures carry decoupled dump-level `band_hi`), and `_ps_band` feeds §12D's load-bearing 740/112
   assert. ⛔ **Fix BEFORE any re-dump of the labelled block at production parameters.**
3. **Sweep item 6 (half).** The five fixtures now carry a population `_note`, but the **WRITERS do
   not emit them**, so a regeneration drops them.
4. **The `--representative-audit` DUMPS half** still scores the pre-hybrid channel (correct by design
   for a policy comparison, now marked on stdout). Only the labelled half speaks for production.
5. **`center_exclude` 36 → 24** — an already-measured, unclaimed win (+4 TP, **0** FP, bias −0.375 →
   −0.208). Needs a blast-radius pass and the owner.
6. **§43D's triage** — the informative labelling target is the ~17 shots where template does NOT
   outscore structural. ⛔ Own pre-commit required (trap 7).
7. **DECISIONS.md has a SEVEN-landing gap.** `STATE.md` and the ruling text are now arm-attributed
   (§7 of the sweep), but the entries themselves are still unwritten.
8. **`/patch-notes` + `/doc-maintenance`** owed before `main`.
