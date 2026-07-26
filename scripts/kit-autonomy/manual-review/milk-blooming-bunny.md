# Manual review — `milk-blooming-bunny` (Milk: Blooming Bunny)

**Gauntlet:** kit-autonomy 2026-07-25 · driver Qwen · cross-family blinds claude-fable-5 (S2b) / claude-opus-5 (S5/S6/S7).
**Binding verdict (S7 opus reconciling judge):** **GO · faithfulness 1.0** · discriminationOk=true · all 11 kit lines FAITHFUL or DOCUMENTED_GAP · **0 REAL-GOTCHA, 0 RECON_ERROR** · 4 gotchas, all `documentedByDriver:true`.
**Tier:** 2 (auto/manual mode-split + Embarrassment status-gate + meta-defining held-charge cycle).
**Board:** 1.225 HOT ▲ (1.22–1.22, ±2.0% ⚠) — unchanged this pass (no value edits; the HOT is the deliberate pierce overshoot, see caveat U23).
**Exact slug:** `milk-blooming-bunny` (SR/Iron, "mbb"/"bmilk") — NOT base `milk` (SR/Water). The slug-disambiguation lint trips on the "Milk:" substring of her full name; the variant is confirmed.

## What was verified (and how)

Driver test `scripts/tests/units/milk-blooming-bunny.test.ts` (17 assertions, GREEN vs shipped + RED vs every
named counterfactual) pins, on the control fixture `liter (B1) / crown (B2) / mbb (B3) / helm (B3)`, boss Fire,
focus mbb (slot 2):

- **MBB1 — S1 "Gain Pierce for 6s"** (both modes): `gainPierce` emits no event — it sets `pierceUntilFrame`
  (sim.ts:1400), the ONLY thing that makes her burst `pierceDamagePct` live (no static `hasPierce`). PIN: the
  117.64 buff is applied once per cast AND removing `gainPierce` reduces her damage (pierce was live). RED vs
  the pre-2026-07-20 dead-pierce-block bug (the buff still APPLIES but contributes nothing).
- **MBB2 — burst "Pierce Damage ▲117.64% / 10s"**: datamined 117.64, 10s (600f), self-scoped, once per cast.
  **Own-cast-only** discrimination: buff frames coincide exactly with mbb's 6 burstCast frames and NEVER with
  the helm co-B3's 6 Full-Burst frames (a `fullBurstEnter` encoding would leak onto helm-led bursts).
- **MBB3 — burst "ATK ▲220% / 10s"**: L10 magnitude 220 (not L1 130), 10s, self, once per cast; load-bearing
  (removal collapses burst-window damage); own-cast-only vs helm.
- **MBB4 — S2 Overconfident DoT 447.7% / 2s / 10s**: exactly **5 ticks per full burst window** (not 1-instant
  nor 10-at-1s), magnitude 447.7, skill bucket; ticks fall only inside mbb's OWN burst windows, none after a
  helm-led burst. RED vs removal. (Distributed `flavor` is not assertable — the dot primitive carries no flavor
  field; vs a single partless boss distributed deals full value and she has no distributedDamagePct.)
- **MBB5 — the Tier-2 mode gate**: in default **AUTO** mode the manual Embarrassment blocks are inert —
  stripping them is **byte-identical** to shipped (engine mode gate sim.ts:663); no 290% proc, no ATK 118.7,
  no maxAmmoPct. In **MANUAL** mode the package activates (ATK 118.7, maxAmmoPct −100, reloadSpeedPct −50, 290%
  proc once per shot, collapsed cadence). The two modes produce different totals.

Cross-family convergence: **S2b (fable-5)** re-derived all damage-relevant lines FAITHFUL with matching
magnitudes and flagged the same residuals (status-gated 64.7, reload-clamp, Embarrassment state-duration,
immunity). **S6 (opus)** reproduced the faithful core from prose alone (gainPierce 6s, burst pierce 117.64 +
atk 220 / 10s burstCast-self, S2 447.7 DoT, 290 rider). **S5 (opus)** blind test run against the shipped
override: **11/22 pass**; the judge traced all 8 failures to the mode-split (4 — the manual package is off in
the default auto basis) or the deliberately-unmodeled 64.7% (2) or documented limitations (dot flavor; pierce
bucket-count granularity) — **none exposes an encoding error** — and the blind's structural check for the 290%
rider PASSES (the mode-gated block is still authored), independently confirming the driver's failure account.

## Owner spot-checks (ranked — the S7 judge's gotchas; all documented in the override note + test header)

### 1. The auto-mode PREMISE (med, FIDELITY) — the residual to spot-check

The entire graded basis rests on one **COMMUNITY-tier premise**: full-auto never holds a completed charge for
0.5s, so Embarrassment never fires (Prydwen game-knowledge, NOT in the kit text). All three blind agents
assumed the cycle runs, so this premise has **zero cross-family corroboration**. The unit's standing **COLD**
kit-status (0.56–0.73, sim below real) is directionally consistent with the premise being WRONG (real auto-play
may enter Embarrassment partially). The mode default is the right call for a full-auto validation basis IF the
premise holds; no fudge either way.
**Recipe:** one scope-lock full-auto recording with mbb focused; read two independent observables — (a) any
290%-class Distributed popup (~staticAtk × 2.9 × buckets), and (b) the ammo counter collapsing to a
1-round-per-reload cadence (vs her 6-round magazine). Either settles it alone; both are decisive. If
Embarrassment DOES fire on auto, the default mode must flip and the ⚑1 manual-cycle approximations become
load-bearing for the board.

### 2. Engine pierce-tags the 447.7% Distributed rider (med, ENGINE) — measurement-gated

`sim.ts:1400` applies `pierceDamagePct` to ALL of a Pierce-tagged unit's damage, so the 447.7% Distributed S2
rider inherits the burst's +117.64% Pierce (measured 10.96M → 6.70M per tick when `gainPierce` is removed —
~64% of each tick). The S2b reviewer reads the kit as "Pierce feeds weapon attacks only"; the judge notes
game-mechanics §11's wording ("benefits any Pierce-damage-type unit") is **unit-scoped and therefore consistent
with the engine**, so the reviewer's reading is a hypothesis, not established. Excluding a rider from the unit's
pierce tag would be an **engine-core** change (per-hit pierce flavor), not an override edit.
**Recipe:** a mbb-focus recording; compare a 447.7 Distributed popup inside her burst window (Pierce live) vs
one where her 6s gainPierce window has lapsed — the ratio distinguishes rider-inherits-Pierce (~1.65×) from
rider-exempt (1.00×).

### 3. Manual mode is internally inconsistent (low, FIDELITY) — not the graded basis

Manual mode models Embarrassment as a PERMANENT state yet omits the +64.7% Pierce Damage that state grants and
ignores the burst's 10s immunity that would suspend the cycle. The two omissions push opposite ways (−64.7%
Pierce under-credit; missing immunity over-credit inside the burst window). Changes no board number today
(manual is not the graded basis). When the ⚑1 recording lands, rebuild manual as a real cycle rather than
adding 64.7% to the permanent model in isolation (which would deepen the inconsistency).

### 4. The 447.7% dot has no `flavor` field (low, FIDELITY) — inert on the control comp

The S2 rider is authored as a `dot` (no flavor field), so it is not tagged 'distributed' and routes through the
sustained/DoT path. Inert on the control comp (single partless boss, no distributedDamagePct, no Sustained
Damage ▲ source). Becomes real only in a comp carrying Sustained/Distributed Damage ▲; the fix is an engine one
(accept flavor on the dot effect), to be landed with a board A/B, not a silent override edit.

## Disposition

GO — the default (auto) basis encoding is faithful and cross-family corroborated; no value edits this pass.
The HOT board ratio is the previously-enacted deliberate pierce overshoot (caveat U23), not a new finding. The
two med residuals (auto-mode premise; rider pierce-tagging) are measurement-gated and need recordings, not
override changes.
