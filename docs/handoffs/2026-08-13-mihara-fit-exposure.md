# `mihara-bonding-chain` — localize the over-model the 12-stack average was hiding

**Status: OPEN.** Created 2026-08-13, when the live Ensnaring pool landed (`ffb10b6c`) and exposed
her. This doc is the follow-up, not the landing — the landing is done and is not to be reverted.

## The one-line problem

Her Ensnaring baseline used to be a **fitted** 301.0%/s (a 12-stack rebuild average). The owner
ruled it out — model the stacks, don't average them — so it is now a live `resources.ensnaring`
[0..20] pool driving a `perResource` DoT. The kit's own generation produces a **~13.4-stack**
time-average, i.e. the retired fit sat **below** what the kit actually generates. Removing it moved
her **1.034 → 1.179 HOT** on her 2 graded comps.

That gap is a real over-model somewhere else in her kit. The fitted number was absorbing it. Find it.

## What is already established — do not re-derive

| Fact                                                                          | Where it came from                                                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Full-burst count is **unchanged**: 11 sim vs 11 measured                      | `scripts/regression.ts` N6 assert, still green                                                                                |
| So the residual is **magnitude, not rotation**                                | follows from the above — do not go hunting in the rotation model                                                              |
| Exactly ONE snapshot leaf moved: N6 total 781,520,119 → 895,910,403 (+14.64%) | semantic leaf-diff of `scripts/regression-snapshot.json`                                                                      |
| Pool time-average ≈ **13.39** stacks; 107 stack-gains per fight               | `DBG_UNIT=mihara-bonding-chain npx tsx scripts/experiment.ts ONLY=1`, integrating the `[res …]` trace over the FIRST run only |
| Her pool is **cap-bound** — the 20 ceiling absorbs over-generation            | the `countScope` fix cut gains 127 → 107 but moved the time-average only 13.55 → 13.39                                        |
| The `hitCount` count-scope defect is **NOT** the explanation                  | same measurement: fixing it moved her 1.182 → 1.179                                                                           |

⚠ **The trace resets `t` per run.** `experiment.ts` emits ~50 runs into one stream; integrating
across all of them yields a nonsense time-average of 154 stacks on a pool capped at 20. Split on
`t` decreasing and take run 1. This bit me once already.

## Candidate carriers, in the order worth checking

None of these is yet evidence — this is a ranked list of where a ~14% over-credit could hide.

1. **The 25.08 %/s-per-stack coefficient itself.** It is kit-literal, so it is the _least_ likely to
   be wrong, but everything downstream multiplies it. Confirm against the datamine before touching
   anything else, so the rest of the search rests on a checked premise.
2. **`sustainedDamagePct` +59.98%/10s (S2, stage-3 entry).** Her DoTs inherit it through the
   Damage-Up bucket. Check the number of stage-3 ENTRIES per fight — entries outnumber her own
   bursts, because a chain that reaches stage 3 and then expires still entered it. If it is applying
   more often than the kit grants, it multiplies the whole Ensnaring channel.
3. **The Restraint dump cadence.** The dump timing is kit-silent ("at a specific timing") and is
   modeled at battle start + each `fullBurstEnd` — an authored guess, flagged ⚑ in her caveats. It
   feeds BOTH the 500.6% flatDamage hits AND +10 stacks each, so an over-firing dump inflates the
   pool and the burst damage together.
4. **The multi-B3 `fullBurstEnd` over-fire.** Her kit gates the dump on "if this unit has just used
   her Burst Skill", which the engine cannot express; it is exact only when she is the sole B3.
   Already recorded as a kit-status finding. **Check whether N6 seats a second B3** — if it does,
   this is live on a graded comp rather than benign, and it compounds with (3).
5. **MG cadence tuple.** Drives in-FB normal count → stack generation. Datamine-unreliable per the
   usual ⚑.

## Per-channel split (2026-08-16, N6 comp, `scripts/mihara-channel-split.ts`)

| Channel                | Hits | Damage (M) | Share | Notes                                                        |
| ---------------------- | ---- | ---------- | ----- | ------------------------------------------------------------ |
| Burst (Dragging Chain) | 56   | 414.7      | 46.3% | 1001%/s fixed, `flavor: "sustained"`, inherits sustDmg% buff |
| Ensnaring DoT          | 179  | 269.9      | 30.1% | avg 13.27 stacks, `flavor: "sustained"`, inherits sustDmg%   |
| Normal weapon fire     | 5611 | 201.4      | 22.5% | MG cadence                                                   |
| Restraint dumps        | 11   | 9.2        | 1.0%  | 1 passive + 10 FB ends — correct count                       |

**Structural counts:** 10 FB ends, 6 mihara burst casts, 11 stage-3 entries (sustainedDamagePct
applies), 0 mihara FB starts (she's a B3 — her burst IS the chain's B3 cast).

**N6 seats 3 B3s** (mihara, maiden-ice-rose, maxwell) — the sole-B3 gate is NOT exact on this
comp. But the Restraint dump count (11 = 1 + 10 FB ends) is correct regardless: the fullBurstEnd
trigger fires on every FB end, and the dump fires with it. No over-fire.

### Ruled out

- **Restraint dump cadence (candidate 3):** 11 dumps is correct (1 passive + 10 FB ends). Not the
  carrier.
- **Multi-B3 over-fire (candidate 4):** dump count is correct despite 3 B3s. Not the carrier.
- **25.08 coefficient (candidate 1):** kit-literal, unchanged. Not the carrier.

### Narrowed to

The over-model sits in the **burst DoT + Ensnaring DoT interaction with the stage-3
sustainedDamagePct buff**:

- Both channels carry `flavor: "sustained"` and inherit the +59.98% buff through the Damage-Up
  bucket.
- 11 stage-3 entries × 10s = **110s of buff uptime** in a 180s fight (61%).
- The burst DoT (46.3% of total) runs ~9.5s of its 10s window within the buff (stage-3 entry leads
  B3 cast by 30f = 0.5s).
- The Ensnaring DoT (30.1% of total) has ~61% of its ticks buffed.
- The 11th stage-3 entry (10 FBs → 10 expected entries; the 11th is from a stalled chain) adds
  ~10s of extra buff — load-bearing check: ~10 extra buffed Ensnaring ticks ≈ 4.7M ≈ 0.5% of
  total. **Not load-bearing.**

**The over-model is NOT in any single channel being wrong.** It is in the combined magnitude of
the burst DoT (1001%/s fixed, kit-literal) + the sustainedDamagePct buff (59.98%, kit-literal) +
the Ensnaring live pool (13.27 avg stacks, kit-faithful). Each piece is individually correct;
their product is 17.9% above the measured value.

### Next steps (needs owner input)

The residual may be a **kit interpretation question** rather than an encoding defect:

- Does the burst DoT "mirror" the CURRENT stack count (perResource-scaled) or always ship 1001%/s
  (assuming 20 stacks)? The pool IS at 20 when the burst fires (rebuilt from previous cycle's
  Restraint dump + hitCount), so both readings converge to 1001 — but a perResource encoding would
  be more faithful and would catch any future cycle where the pool doesn't reach 20.
- Does the sustainedDamagePct buff apply to the burst DoT? The kit says "Sustained Damage ▲59.98%"
  and the burst DoT has `flavor: "sustained"`, so the engine applies it. But if the game's
  "Sustained Damage" stat does NOT apply to burst skills, the buff should be scoped to non-burst
  sustained damage only.

## How to test without re-fitting

The trap here is obvious and worth naming: her one fitted number was just removed, and the fastest
way to make the board green again is to invent a new one. Don't.

- The discriminator is **per-channel**, not total: use `DBG_UNIT` / the event log to split her damage
  into Restraint dumps / Ensnaring ticks / Dragging Chain / normals, and compare each against the
  measured popup classes in her recordings. A 14% total gap sitting in ONE channel names the bug; a
  14% gap spread evenly across all of them means the cadence or a global buff is the carrier.
- Her recordings already exist (2 graded comps, n=2). **Reuse before deriving** — check
  `docs/VALIDATION-INDEX.md` before generating any new ground truth.
- If a candidate is confirmed, it is an ordinary encode + `/code-review`. If it needs a
  _measurement_ to settle, it is `/scientific-method`.

## Explicitly out of scope

- **Do not restore the 12-stack average**, or introduce any new fitted stack number. The owner ruled
  on this; a re-fit would re-hide whatever this exposed.
- **Do not touch the rotation model.** FB count is measured-exact at 11 and must stay that way — it
  is the invariant that says this residual is magnitude.
- **Do not revert the count scope.** `countScope:'gated'` is the kit-literal reading of "+1 per 40
  normals during Full Burst" and is independently correct; it is simply not the explanation here.

## Related

- QUEUE item 1 (the `mihara-bonding-chain` bullet) points here.
- QUEUE item 5, `snow-white-heavy-arms`, is the **same class** — a faithful fix exposing a fit that
  was standing on the bug. Whatever method localizes one may well localize the other; consider doing
  them in one session.
- DECISIONS 2026-08-13 (the live-pool ruling); `scripts/tests/units/mihara-bonding-chain.test.ts`
  (M2/M3 pin the live pool and the burst cancel, with the flat-301 and static-20 counterfactuals).
