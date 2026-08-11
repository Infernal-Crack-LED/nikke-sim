# 2026-08-10 — Faithfulness pass, phase-4 batch 4 (6 units)

> Six per-unit reviews against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4). Batch 4 is the **board-outlier** slice
> of the phase-4 ordering ("board outliers beyond ±5% first"): the six worst-ranked units on
> `scripts/board-read.ts` not already reviewed in batches 1–3 — `jill` (1.924 HOT),
> `ein` (0.725), `moran` (0.728), `maxwell` (1.252), `takina` (0.780),
> `elegg-boom-and-shock` (0.795). Slugs are exact: `maxwell` is the SR/Iron base (NOT
> `maxwell-ordinary-mechanic`), `elegg-boom-and-shock` is the Water variant (NOT base `elegg`),
> and the `asuka` / `eunhwa` / `d` named below are the base slugs, not their variants.
> Applied = the owner-ruled pattern classes only
> (`burstDesc` scope tags; falsified/stale prose). Everything else recorded here,
> findings-only.

## Applied this batch (per-unit specs green at each step; full `verify.sh` green)

- **`burstDesc` tags (scope-string ruling 2026-08-10) — 2 units, 20 damage instances.**
  - `ein` burst nuke 300.02% true → `'allEnemies'`. Clause: "Affects 10 enemy unit(s) with
    the highest final DEF" — the capped-multi form, identical in shape to the base-`eunhwa`
    precedent ("10 enemy unit(s) with the highest final ATK"). New E4 pin.
  - `elegg-boom-and-shock` — **all 19** burst hits (six in the ≠13 branch, thirteen in the
    =13 branch) → `'allEnemies'`. Clause: "Affects random enemy units", a plural form. Both
    branches tagged: the 13-hit branch is unreachable only on the graded rotation, not in
    general. New H3 pin asserting 19/19.
  - Both dormant (no `jackal`/`trina`-class amp shares their fixtures or comps) — damage
    byte-identical, board unmoved, no snapshot change.
  - **No DEF ▼ encodes this batch** — verified against kit text (the cocoa lesson): none of
    the six carries an enemy DEF ▼ line. `moran`'s DEF lines are self/ally ▲; `takina`'s
    enemy lines are Damage Taken ▲ (already live, allowlisted).
- **`jill` — falsified prose corrected + the defect below recorded.** Her note claimed
  "she now grades ~1.07–1.34" (actual: 0.92 / 2.39 / 2.46) and that her acid dot "joins the
  U1 exempt class (noFb)" — the override has no `noFb`, and a later sentence in the same note
  said the opposite. Her spec header claimed the reload clamp and the true-normals conversion
  were both UNMODELED and referred to a `J2b` group that no longer exists; all three are
  falsified by the shipped override (`reloadSpeedClamp` 99.96/10s, `weaponSwap.trueNormals`).
- **Drifted bare `sim.ts:<line>` citations fixed — 6, all of which had rotted** (verified by
  reading each cited line): `takina` ×3 (`1414` → charge-gauge code; `2842` ×2 → unlimitedAmmo
  code), `moran` ×3 (`types.ts:332` → a resource-scaled-DoT comment; `sim.ts:1684` → an opts
  type; `sim.ts:1844` → elemental-advantage code), `elegg-boom-and-shock` ×1 (`2169` → buff
  record fields). All replaced with named code blocks. The validator's citation lint now
  reports clean for all six.
- **History narration deleted (2026-07-22 current-state ruling), capture-first verified.**
  `moran`'s note was ~70% changelog (the refuted 24/s swap-cadence attempt, the gauntlet
  fix-narration, `[materialized]` provenance, a "judge gotcha closed" paragraph) — all of it
  already in DECISIONS 2026-07-17 / 2026-07-25, so it was deleted and the note re-based on the
  current model. Same class trimmed from `jill`, `ein`, `maxwell`, `takina`, and
  `elegg-boom-and-shock`'s reviewer-provenance opener. No measured value changed.
- Mirrors regenerated: `data/kit-status.json`, `docs/unmodeled-entries-review.md` (414
  entries, unchanged count — this batch retired none).

## Cross-cutting findings (STOP-AND-SURFACE — owner)

### 1. `jill` 1.924 HOT is a DEFECT, not a tuning residual: her burst swap discards her MEASURED fire cadence

The single biggest error on the board, and it is mechanical.

- **Cause.** The engine's swap fire-cadence branch reads
  `u.swap.pullsPerSec ?? PULLS_PER_SEC[u.swap.weapon ?? u.char.weapon]` and never falls back
  to `u.pullsPerSec` — which is where `charFixes.pullsPerSec` is stored. Her burst is a
  **same-weapon flavor swap** (the magnum never changes, only its damage flavor), and it
  restates no cadence, so for the 10s window she fires at the AR class default instead of her
  video-measured 2.5/s.
- **Asymmetry that hid it:** `charFixes.reloadFrames` IS patched onto the char record and so
  survives a swap; only `pullsPerSec` is routed through the separate field the swap branch
  skips. An F2-class silent failure — no error, no warning.
- **Three independent confirmations.** (a) the code read above; (b) a direct shot count on
  her control fixture — **9.28 shots/sec inside the swap vs 1.98 outside**, a 4.7× step a
  same-weapon swap cannot produce; (c) the board: restating `pullsPerSec: 2.5` on her swap
  moves her **1.924 → 0.983 (0.92 / 1.00 / 1.03)**, MAD 0.978 → 0.038, board within-±5%
  14 → 15, within-±8% 23 → 24, worse 22 → 21, her seedSD unchanged at 0.7%.
- **Blast radius is exactly one unit today.** A census of all 67 overrides finds `jill` is the
  ONLY unit carrying both a `charFixes.pullsPerSec` and a `weaponSwap`.
- **Not enacted** (board-moving, wants the `/scientific-method` gate + owner). Two candidate
  fixes: unit-local (restate 2.5 on her swap) or engine-level (make the swap branch fall back
  to `u.pullsPerSec`) — the engine fix is behaviour-identical for every other carrier today
  and closes the class for future ones.
- **Committed instrument:** `scripts/tests/units/jill.test.ts` group **J8**, which measures the
  in-swap/out-of-swap cadence ratio and is written to go RED when the fix lands (flip it to
  assert parity then).
- ⚠️ This displaces the QUEUE's standing hypothesis for her HOT ("read the in-burst normal
  popup value tier — true-flavored normals bypass DEF"). At the graded `bossDef = 140` basis a
  DEF bypass is worth ~0.02%, nowhere near 2.4×. The popup read is still worth having, but it
  is not the explanation.

### 2. A recovery-emit "gap" that is real as consistency and NIL as fit — checked, not assumed

`moran`'s burst lifesteal ("Recovers 36.14% of attack damage as HP for 10 sec") emits no
recovery event, and she shares the N9 comp with `crown`, whose S2 grants all allies
`attackDamagePct` 20.99/7s on recovery — which looked like a live COLD explanation.

It is not. The heal effect fires recovery only at its **own block's targets**, and a
`recovery`-triggered consumer fires only when ITS unit receives one; her lifesteal is
**self**-scoped, so it can never reach an ally-side consumer. A probe adding a
`shotFired` + `swapGate:'swapped'` self-heal emit to her burst moved the board by **exactly
zero**. Recorded in her caveats as a consistency item, not a fit item.

The roster-level split is still real and wants ONE ruling rather than 13 unit-local calls:
of the 13 kits with "Recovers X% of attack damage as HP", **8 emit a recovery event and 5 do
not** (`d`, `moran`, `red-hood`, `rem`, `tia`). Whether a self-scoped lifesteal should emit is
the decidable question; today it only matters for a unit with its own self-recovery consumer
(`asuka` is the sole such consumer on the roster).

Incidental measurement from the same probe, offered without a claim attached: `crown`'s
on-recovery buff runs at **23.3% uptime** in N9 (30 applications) — she is not saturated
there, so emit decisions in her comps are not automatically inert.

### 3. Swap economy is the common thread across four of the six outliers

`jill` (finding 1), `moran` (throughput ~1.3× cold, footage-blocked), `takina` (swap restates
neither weapon class nor `pullsPerSec`, so an SR-based unit fires the swap at the SR class
default with no charge time — her largest unmeasured lever), `maxwell` (kit-literal swap, HOT
1.252, pending the run-G/N6 popup read). Four of the six worst outliers are weapon-swap units
and every one of them turns on **swap-window shot economy** (F8). Finding 1 shows the engine's
swap model silently drops a per-unit cadence; the same code path is what the other three
estimate through. A single focused pass on "what does a weapon swap inherit, and from where"
would touch all four.

## Recorded, not applied (per-unit)

- **`ein` (0.725 COLD):** her ⚑3 is honest and points the right way — the 34-feather
  `burstCast` lump resolves at cast-instant, BEFORE her own True Damage ▲55.3% and teammates'
  FB-entry auras, so it is under-credited ~×1.553 (removing the true-damage buff costs her only
  ~0.7%). Both ⚑2 (Prydwen feather cadence) and ⚑3 are gated on the same U8 ein-focus
  recording. No new finding; the flags carry their recipes.
- **`maxwell` (1.252 HOT):** clean beyond prose. The `byFinalAtk` residual is correctly HELD
  (switching top-2 ranking from static to live-final-ATK drifts 7 pinned MEASURED anchors by
  up to 19.95%); the pending measurement is the run-G/N6 burst-window popup read.
- **`takina` (0.780 COLD):** her S2 15s cooldown is COMMUNITY-sourced (Prydwen) and the two
  uptime-averaged permanents (3.36 / 93.66) are scaled by it — the single ⚑ most worth
  measuring for her. Second: the swap-economy point in finding 3, now written into her caveat.
  Her "true swap normals still crit" engine-fidelity observation survives review as accurate.
- **`elegg-boom-and-shock` (0.795 COLD):** clean beyond the tags + citation. Her ⚑1 capture
  cadence remains the top residual (interval:6 cap vs the teamAmmo:100 accrual reading, ~1.7×
  HOT apart) and is footage-resolvable from the ghost-counter UI.
- **`moran` (0.728 COLD):** COLD is throughput, footage-blocked, unchanged. Her ally-side
  Damage Taken ▼35.14% was re-verified genuinely inert (the engine reads `damageTakenPct` only
  off the boss's buff list) — she never fell into the F10 sign-and-target inversion trap.
- **Held-primitive carriers logged (F11), not proposed as builds:** `moran` S1 "DEF ▲3.51% per
  1% HP lost" (HP-scaling family, inert without an HP pool); `maxwell` S2 ">5 enemy units"
  (enemy-count gate, out-of-domain solo).

## Remainder sweep — the 4 units batches 1–3 queued (`belorta`, `jackal`, `quiry`, `ram`)

Run immediately after batch 4, same discipline. These were queued by name, not by board rank.

- **`belorta` — the DEF ▼ carrier list is now EMPTY, and she is its second false positive.**
  QUEUE carried her as "the sole override-carrying remainder (S2 −3.52/5s), encodes at her own
  review". She does not encode: her S2 is gated on **"an attack hits more than 4 enemy
  unit(s)"**, which a single partless boss can never satisfy, so the DEF ▼ _and_ the paired
  14.96% additional damage are out-of-domain inert. Her override already disposed it exactly
  that way and pins zero skill-bucket damage against both nearest-wrong readings (gate dropped /
  re-read as a hit-count trigger) — no change needed. **New census failure mode:** after the
  `cocoa` over-count (prose-grep) and the batch-2 under-count (list-keyed), the batch-3 remedy
  was "grep the kit text". That still over-counts, because a kit-text grep finds the LINE but
  not its GATE. A carrier census needs line + trigger + gate.
  - Applied: `burstDesc: 'allEnemies'` on her 192% burst nuke ("Affects enemies within attack
    range" — `signal`'s applied precedent, same clause). New B1 pin. Dormant.
- **`jackal` — her note described a unit that no longer exists.** The F3 Burst-Skill-Damage amp
  landed 2026-08-10 (`burstSkillSingleDamagePct` 38.91, all allies, 15s, on her burstCast) and
  her S1 Damage-Taken half was encoded 2026-08-09 — but the note still ran ~600 words of "⚑2
  ENGINE GAP: the engine has no Burst-Skill-Damage bucket / no description-text scope", the
  first caveat still opened "is NOT modeled", and the note claimed "SKILL1 is UNMODELED IN FULL
  (all three verbatim lines in unmodeled.skill1)" when only the ATK ▼ line is there. Two of her
  five caveats flatly contradicted a third. Note and caveats rewritten to the shipped model; the
  amp's genuinely-open item (unmeasured additive Damage-Up placement) kept as the new ⚑2, with
  a popup-read recipe. Also fixed: the "immortal DEF=0 boss" phrase and the deleted
  crow-precedent wording batch 3 flagged.
- **`quiry` / `ram` — the extinct engine-comment quote, in both override AND spec.** Both cited
  `"other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0", sim.ts` as the reason
  their enemy ATK ▼ lines are unmodeled. That comment no longer exists, the DEF ▼ half is false
  since the channel landed, and the DEF=0 basis was superseded by the bossDef-140 ruling — while
  the CONCLUSION (enemy ATK ▼ is inert) stays correct for a different reason: the v1 boss deals
  no damage, so an ATK debuff on it has nothing to scale. Re-based on that reason in 4 places
  (2 overrides, 2 spec headers), with an explicit "enemy DEF ▼ is NOT the same case" line so the
  next reader does not re-derive the distinction. No encoding changed; nothing else in either
  unit needed a fix.
- **The sweep list was incomplete a third time — two units nobody had listed.** A
  whitespace-normalized grep across all 67 overrides _and_ all 184 unit spec files (not just the
  named remainder) found the base-`eunhwa` spec (×3) and the `phantom` spec (×1) still asserting in
  their headers that their DEF ▼ lines are UNMODELED / "pinned by ABSENCE" — both were ENCODED
  in batches 3 and 1 respectively, by the same passes that wrote those very groups. Their own
  `describe` titles say "encoded 2026-08-10"; only the headers lagged. Fixed. **The grep now
  returns zero across both trees** — verified, not asserted.

## Batch stats

6 units reviewed / 20 `burstDesc` tags on 2 units + 0 DEF ▼ encodes (none carry the line) +
6 drifted citations fixed + falsified-prose corrections in 6 overrides and 2 specs + 1 new
committed defect instrument (jill J8) / 3 cross-cutting + 6 per-unit findings recorded.
Nothing board-moving enacted; board byte-identical to the pre-batch read.
