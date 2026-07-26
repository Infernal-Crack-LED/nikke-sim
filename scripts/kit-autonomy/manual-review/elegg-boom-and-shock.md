# Manual review — `elegg-boom-and-shock` (Elegg: Boom and Shock)

**Verdict:** GO (cross-family corroborated) · **faithfulness 1.0** (S7 judge claude-opus-5, final pass) · **Tier 2** · 2026-07-25

Water MG Attacker, Burst III (cd 40s). The Water **variant** — not the base Electric `elegg` (P0 slug discipline).
A ghost-currency kit: the team captures ghosts (100 cumulative team hits, recurring every 6s, cap 13); the ghost
count gates two Water-ally auras (≥1: ATK ▲16.2% of her ATK; ≥4: Elemental Advantage Attack Damage ▲35%), a
self +40% ATK on burst, an 1100% at-capacity nuke, and switches her burst between a 6-hit and a 13-hit branch.

## What the gauntlet changed

The shipped override was a `parser-baseline` HYPOTHESIS that approximated the ghost economy with **user-selectable
modes** (auto/rotation/no-burst) and a flat uptime haircut (Elemental Advantage shipped at 17.5% = 35×0.5). Its
default mode (`auto` = `modes[0]`) had **no Elemental Advantage block at all**, so any harness that did not select a
mode silently dropped the ≥4-ghost tier and read her artificially COLD — the defect this gauntlet fixes.

The gauntlet **replaced the modes/haircut model with a live ghost resource pool** (the engine resource-counter
primitive — same family as soda-twinkling-bunny's Golden Chip). The whole ghost trajectory is now EMERGENT:

- `ghost` pool {initial 0, min 0, max 13}; **accrual +1/6s** (`interval:6` — the kit's "Recurring interval: 6 sec"
  capture CAP; pool peaks ~7 while bursting on cooldown, ramps 0→13 by t≈78 in a never-burst context).
- ≥1 tier: `casterAtkPct` 16.2 to Water allies, `resourceGate ghost≥1` (≈permanent from t≈6).
- ≥4 tier: `elemAdvantageDamagePct` 35 to Water allies, `resourceGate ghost≥4` (partial-uptime while bursting as the
  pool sawtooths 1→~7; ≈permanent from t≈24 never-burst).
- S2: self `atkPct` 40 on `burstCast`/10s; 1100% nuke `resourceGate ghost≥13` (0× while bursting, fires from t≈78 never-burst).
- Burst: ≠13 branch (six discrete 800% sequential + `resource −6`, gated `max:12`) / =13 branch (thirteen discrete
  800% sequential + `resource −9`, gated `min:13`); spend ordered after the gated damage, ≠13 block first.

### Encoding subtlety the owner should know (why the pool-checks are `teamAmmo`, not `interval`)

The pool **accrual** is `interval:6` (the faithful 6s cap). But the pool-**threshold** buffs and the at-cap nuke are
gated on the live pool via a `teamAmmo:100` trigger (a frequent pool-CHECK), **not** an `interval` trigger. Reason:
threshold-gated `interval` blocks perturb the team-generator beam-search invariant
(`scripts/tests/generators/burst-cooldown-coverage.ts`, `topTeams(5)` double-support shape) **even at byte-identical
damage** — proven structural, not a damage regression (a permanent ≥1 tier gives ebs damage identical to the prior
override yet the `topTeams(5)` output still changes; a single `interval:6` accrual block is tolerated, a second
interval block re-perturbs). So the accrual stays `interval:6` and only the pool-checks are event-driven (`teamAmmo`),
which lands the generator invariant cleanly. The `teamAmmo` trigger is a pool-CHECK mechanism, not the accrual cadence.

## Cross-family convergence

- **S2b (claude-fable-5)** independently re-derived the ghost resource pool and the same load-bearing lines, and
  specified the two-sided nuke treatment (zero in the standard rotation + an engineered reachability proof). Fable
  erred on one fixture fact (claimed helm is non-Water; the probe shows the ≥1 tier targets {ebs, helm}, both Water).
- **S6 (claude-opus-5)** blind override is **structurally identical**: same pool {0..13}, same `resourceGate`
  min:1/4/13, same burstCast self +40%/10s, same at-cap 1100% nuke, same two mutually-exclusive discrete-800% branches
  with the spend after the gate and the ≠13 block first. S6 used `teamAmmo:100` for accrual too (the blind-convergent
  reading); the driver chose the `interval:6` 6s-cap accrual (faithful to "Recurring interval: 6 sec", realistic board
  damage) — see ⚑1.
- **S5 (claude-opus-5)** blind test vs the driver override: **22 passed / 1 failed / 3 skipped.** The sole failure is
  a **RECON_ERROR** the S7 judge ruled in the driver's favor: it asserts the 1100% nuke _fires in the bursting control
  comp_, which encodes the S5 author's unverified premise that accrual outruns the 6–9 ghost/burst spend. Under the
  faithful 6s cap the pool peaks ~7 while bursting, so the nuke fires 0× there; the driver proves reachability instead
  via the engineered pool=13 13-hit-branch test (H3) and the never-burst nuke-from-t≈78 test (H5) — exactly the
  two-sided treatment S2b demanded.
- **S7 (claude-opus-5)** reconciling judge (final pass on the hybrid): **GO, faithfulness 1.0, discrimination ok, no
  blocking gotchas** (13/13 lines FAITHFUL or DOCUMENTED_GAP, no silent drop).

## Residuals for the owner to spot-check (all documented, none GO-blocking)

1. **⚑1 CAPTURE CADENCE (TOP).** Accrual is `interval:6` (the "Recurring interval: 6 sec" capture CAP). The
   blind-convergent ALTERNATIVE is `teamAmmo:100` accrual (treat the 100-hit gate as binding, no 6s cap) — but that
   pins the pool near 13, makes the burst mostly the 13-hit branch and the nuke frequent, and reads **~1.7× HOT** on
   the board (a clear over-credit), so the driver chose the 6s cap. **Recipe:** read the ghost-counter UI delta in a
   focus video — time-to-13 in a never-burst solo (≈78s ⇒ the 6s cap binds; ≪78s ⇒ teamAmmo binds) and the per-burst
   sawtooth floor. Note the blind convergence on teamAmmo is same-family (Claude) and therefore weak; the prose shape
   ("possession lasts 6 sec" + "recurring interval 6 sec") leans toward the 6s cap.
2. **≥4-tier 6s linger (med).** The polled `durationSec:6` lets the ≥4 aura linger up to ~6s past the burst spend that
   should close its gate, and that stale window can sit inside Full Burst. A shorter duration (S6 used ≤2s) reduces
   this but risks gaps for slow teams; the driver kept 6s for robustness. Tune the duration if a focus read shows the
   aura closing tighter to the spend.
3. **Nuke per-pool-check over-fire (med, 0 board impact).** The at-cap nuke fires per `teamAmmo` pool-check (~6×
   over-fire vs strict per-capture) wherever it is reachable; provably 0× in the shipped (bursting) comp. The FIRST
   never-burst nuke at t≈78 is correct; the count is cadence-dependent.
4. **Post-add off-by-one (low, 0 board impact).** The min:13 gate reads the POST-add pool, so the capture that takes
   the pool 12→13 may fire one nuke the strict "captured WHILE AT maximum capacity" wording does not grant. Needs a
   pre-add gate primitive to fix exactly. Independently caught by S6.
5. **"Maintains at least 1 ghost" floor (low, inexpressible).** The pool clamps at min 0 (a min:1 would wrongly light
   the ≥1 tier at frame 0); an early burst from ≤6 ghosts leaves 0 not 1, briefly dropping the ≥1 tier (self-cancelling
   within the 6s refresh). Needs a spend-only floor primitive (`resource{delta:-6, floor:1}`).
6. **Rider crit default (low, repo-wide).** The burst riders + nuke ship `crit` unset; the SSOT states function-type
   damage crits at the caster's rate by default. Verify the engine's flatDamage default and align repo-wide before
   changing (not resolved unit-locally).
7. **MG cadence tuple (mandatory ⚑).** `pullsPerSec` / `reloadFrames 171` datamine-unverified; feeds her own hit
   contribution to the 100-hit gate + her normal damage.

## Board

Before: row 41, n=1, ratio **0.795 COLD** (parser-baseline). After: the hybrid keeps a realistic ~209M solo damage
(the 6s cap), so the single board point (comp boss **Electric** — her Elemental Advantage tier is inert there) is
dominated by the MG cadence uncertainty, not the gauntlet's structural change. The gauntlet certifies STRUCTURE
(faithfulness 1.0), not magnitudes; tier stays `MODEL_ONLY` until a real fight validates the numbers. Re-grade after
⚑1 is pinned from footage, ideally on a Water-advantaged (Fire-boss) comp where the ≥4 tier is live.
