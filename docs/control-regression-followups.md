# Control-regression follow-ups (board-wide)

**Class: CURRENT-STATE** (backlog/ledger — freely rewritten; delete an item when it lands, after the
WHY is captured in `docs/DECISIONS.md`). Started 2026-07-23.

The control-regression suite (`npx tsx scripts/control-regression.ts`, source
`docs/probes/720-kit-audit/`) tunes the liter / crown / helm support core. Auditing those kits keeps
surfacing findings whose blast radius is **larger than the unit being tuned** — engine primitives with
other carriers, stale override prose, board-wide interactions. Per batch-and-stop those must NOT be
enacted mid-tune. They land here instead, so the tuning pass stays narrow and nothing is lost.

Anything in this file is **findings-only until separately gated**. Nothing here has been enacted.

---

## 1. `durationShots` — round-count buff duration (primitive)

**Status: LANDED for `helm` ONLY** 2026-07-23 (owner scope ruling → DECISIONS; live model
`docs/STATE.md` §5; functional test `scripts/tests/engine/duration-shots.test.ts` in verify.sh). Every other
carrier below is UNTOUCHED and unaudited — the primitive now exists, so wiring one is cheap, but each
still needs its own look before it moves a board number.

Kit lines reading *"for N round(s)"* are currently approximated as `durationSec`, or modeled as
permanent, or expressed through a bespoke per-unit state machine. Before this build the engine had **no
general round-count vocabulary**: `BuffInstance` (`src/engine/sim.ts`) expires only on `expiresFrame`,
and the sole non-time scope is `whileSwappedIdx` (swap-round).

Prior art, for the record — neither is reusable:

- `dorothy-serendipity` — a REAL round count (`consolidation.shots: 3` → `consolShotsLeft`), but it is a
  field of her bespoke pellet-consolidation state machine, reachable by nothing else.
- `jill` — kit says *"Magnum Ammo: Normal Attack Damage Multiplier ▲30% for 9 round(s)"*, modeled as a
  permanent passive `normalAttackPct: 30`. **That is correct for her and needs no change**: her magazine
  is exactly 9 rounds and the buff re-triggers on every reload-to-max, so 9 rounds = the whole mag =
  permanent. Do not "fix" this.

### Other simSupported carriers — NOT audited, NOT enacted

A round count only diverges from `durationSec` when the window's rounds span a **reload** or a fire-rate
change; a "1 round" line on a fast weapon is usually well approximated already. Each needs its own look:

| unit | kit line | current model | note |
|---|---|---|---|
| `ada` | burst: *decreases Charge Speed but increases Charge Damage for 1 round(s)* | `weaponSwap` w/ `chargeTimeSec 4`, `chargeMultPct 1750`, `durationSec 10` | the swap already scopes it; "1 round" may be the swap's own shot |
| `snow-white-heavy-arms` | skill2: *Charge Damage ▲528%* + *Sequential attack damage ▲158.4%*, both *for 1 round(s)* | `whileSwapped` per-swap-round buffs (MEASURED 2026-07-14) | **already round-scoped** by the swap mechanism — likely correct as-is |
| `miranda` | skill2: *Critical Rate ▲85.42% for 1 round(s)* | — | SMG, ammo 120: 1 round ≈ one trigger pull, sub-100ms |
| `zwei` | skill1: *Pierce Damage ▲20.13% / ▲24.99% ×3 for 1 round(s)* | — | pierce is inert vs the partless boss |
| `asuka-wille` | skill2: *Reload speed is **fixed at** a 60% increase for 1 rounds* | unmodeled | this is a **LOCK**, not a duration — belongs to the clamp primitive (`docs/engine-modeling-gaps.md` §1b), not here |
| `dorothy-serendipity` | skill1 ×5 *for 3 round(s)* | bespoke `consolidation.shots: 3` | a migration onto the general primitive is possible but moves a graded board unit — separate gated pass |
| `jill` | skill1 *for 9 round(s)* | permanent passive | **correct, do not touch** (see above) |

Not simSupported, listed for completeness when the roster expands: `emilia`, `eunhwa`, `harran`, `neve`,
`nihilister`, `phantom`, `vesti-tactical-upgrade`.

## 2. `critRateNormalPct` — normal-attack-scoped Critical Rate

**Status: LANDED** 2026-07-23 (owner directive → DECISIONS; live model `docs/STATE.md` §5).

Roster census of *"Critical Rate of normal attack(s)"* kit lines: **`helm` is the only simSupported
carrier.** The only other is `biscuit`, which is not simSupported — wire her when she is.

Board-wide note: helm's is an **allies** buff, so before the fix it was lifting crit on the whole team's
skill procs and burst nukes, not just normals. That over-credit grew when `RIDERCRIT` landed ON
(2026-07-22) and flat-damage riders became crit-eligible. Any unit sharing a comp with `helm` therefore
carried some of this error.

### ⇒ FIT-EXPOSURE RE-TUNE WORKLIST (open)

Landing it moved **10 of 45 board units**, every one a `helm` comp-mate, all cold-direction. Those
overrides were partly calibrated against the inflated crit, so this is fit-exposure, not a fix error —
**re-tune them individually; never re-fudge the crit scoping back.** MAD buckets went ±3%: 6 → 5,
±5%: 12 → 9. Deltas (board mean, before → after):

| unit | n | before | after | Δ |
|---|---|---|---|---|
| `privaty` | 3 | 1.118 | 1.099 | −0.019 |
| `snow-white-heavy-arms` | 4 | 0.960 | 0.943 | −0.017 |
| `snow-white` | 4 | 0.956 | 0.939 | −0.017 |
| `little-mermaid` | 9 | 1.052 | 1.042 | −0.010 |
| `cinderella-crystal-wave` | 2 | 0.974 | 0.966 | −0.008 |
| `mihara-bonding-chain` | 2 | 1.061 | 1.053 | −0.008 |
| `rapi-red-hood` | 5 | 0.935 | 0.929 | −0.006 |
| `soda-twinkling-bunny` | 2 | 0.816 | 0.810 | −0.006 |
| `anis-star` | 12 | 0.965 | 0.961 | −0.004 |
| `helm` | 10 | 0.961 | 0.953 | −0.008 (then → 0.973 with `durationShots`) |

`privaty` and `little-mermaid` moved TOWARD 1.0 (they were hot); the rest moved away. `snow-white` and
`snow-white-heavy-arms` are the two worst-affected and the natural first re-tunes.

## 3. Override prose drift found during the audit

- `helm.json` `note` asserted `shotFired -> allies fillGauge 14.31`, a block the file does **not**
  contain. The 14.31% Burst Gauge fill is real but lives in `data/gauge-per-shot.json`
  (`helm.flatPerTrigger: 1431`, datamined, two independent confirmations), consumed in `gaugePerShot()`.
  Prose that describes a block which isn't in the file reads as a live claim to every future agent.
  **Worth a sweep**: are there other override notes describing gauge behaviour as if it were an override
  block, when it is actually carried by the gauge table?

## 4. Open board questions raised by the control suite itself

- **`helm` is carry-SPREAD, not flat-offset**: 0.946 (soda-twinkling-bunny) → 1.086
  (scarlet-black-shadow) across the four control comps, mean 1.027. A flat kit retune cannot fix a
  spread — do not tune her to the mean until the spread is explained. Both fixes in §1/§2 change her
  level, not obviously her spread; re-read the spread after they land.
- **`liter` 1.208, tightly clustered** (1.174 / 1.183 / 1.222 / 1.252 across four different carries) ⇒
  carry-independent ⇒ her own kit. Largest single residual on the suite; her kit has not been audited yet.
- **`crown` 1.051**, same clustered shape (1.040–1.062).
- The four slot-3 carries are **n=1 each** and not actionable alone: `maiden-ice-rose` 0.852,
  `scarlet-black-shadow` 1.123, `soda-twinkling-bunny` 0.914, `ada` 0.986.
- **Full-burst counts are ungraded on this suite** — none has been video-counted off these four
  recordings. The sim currently reads 11-12 / 12 / 12 / 9. If a count is ever measured, pin it then.
- `crown` and `helm` also carry many readings on the main board (`scripts/experiment.ts`), so any
  retune of either must be A/B'd on `scripts/board-read.ts`, not only on the control suite.
