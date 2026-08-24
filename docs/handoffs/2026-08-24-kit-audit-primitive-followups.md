# Kit-audit primitive follow-ups — remaining investigations (2026-08-24)

Owner-directed follow-up to `docs/kit-faithfulness-audit-2026-08-23.md` ("start work on the
missing primitives and the note prose drift"). This doc records what LANDED on the
`worktree-kit-audit-followups` branch and every thread that remains OPEN in this area, with what
would settle each. AI-facing.

## Landed on this branch (see the branch commits for detail)

1. **`fullCharge` trigger primitive** — fires only on charged pulls; migrated the 25 blocks across
   14 audited-slice units whose kit line says "Full Charge" off the bare `shotFired` proxy.
   Inert by mechanism for them (charge weapons release only at full charge); regression
   byte-identical; the trigger-kinds matrix pins both the equivalence and the MG-silence.
2. **`selfStatus` effect + `requiresSelfStatus` gate** — per-(unit, name) status windows; migrated
   `asuka-wille`'s Annihilation State off the boss-`targetStatus` side channel (her caveat's
   "judge gotcha 3"). Behavior-identical (her 28-pin suite unchanged); both isolation directions
   pinned in `scripts/tests/engine/self-status.test.ts`; the names census now errors on a
   same-unit-unproduced `requiresSelfStatus`.
3. **Note-prose drift deletions** (audit §6) on `anchor-innocent-maid`, `phantom`,
   `mihara-bonding-chain`, `drake`, `flora`, `ada`, `asuka-wille`, plus proxy-caveat rewrites on
   the 11 migrated fullCharge carriers. Kit-status mirrors re-synced per-unit (`--sync-mirrors`,
   never global). STATE.md / engine-modeling-gaps census synced.

## Open threads — mechanical (no new evidence needed, just careful per-line work)

- **fullCharge roster tail.** ~20 further overrides carry `shotFired` blocks AND "Full Charge"
  kit text outside the audited slice: `a2`, `delta`, `emilia`, `exia`, `frima`, `harran`,
  `himeno`, `laplace`, `n102`, `nihilister`, `rapunzel`, `rapunzel-pure-grace`, `raven`,
  `velvet`, `vesti-tactical-upgrade`, `yan`, `yuni`, `zwei` (+ `mari`, whose S2 blocks are
  kit-SILENT — an estimated trigger, NOT a migration candidate; and `cinderella`, done).
  Per unit: match each `shotFired` block to its kit clause (only full-charge-worded lines
  migrate), then A/B. ⚠ `zwei` is SG — on a non-charge weapon a migrated block goes SILENT, which
  is a behavior CHANGE, not an identity; her full-charge lines need an actual read of how her kit
  charges before touching (she is also outside the owned roster). The migration recipe is the
  slice-1 commit; the per-line verification step is the whole job.
- **`rei-ayanami-tentative-name` + `rem` selfStatus migrations.** Both still carry the retired
  boss-`targetStatus` self-mode proxy (rei's 'Attack State', rem's 'Demon's Breath') — the same
  cross-unit-readable side channel the `asuka-wille` migration removed, flagged by the
  cross-family review. Mechanically identical to the asuka-wille migration and
  behavior-identical for both (only their own gates read the names, per their notes); their
  notes now name the migration path.
- **Parser-baseline drift** (cross-family review, unexercised-scope): `scripts/lib/kit-parser.ts`
  now emits `fullCharge` for full-charge-worded lines, so committed parser baselines under
  `overrides-baselines/` that carry `shotFired` will differ from a fresh
  `materialize-overrides.ts` run. No verify.sh gate compares regenerated baselines to committed
  ones; reconcile on the next baseline regeneration rather than ad hoc.
- **selfStatus census two-tier split**: the same-unit missing-producer check is a hard ERROR
  today (correct — no cross-unit self-status grant ships). If an "allies enter <Mode>" kit ever
  lands, downgrade to the boss-channel census's ERROR/WARN split (comment in
  `validate-structural.ts` records the recipe).
- **Note palimpsests** (audit §6 tail): `neon-vision-eye` and `maiden-ice-rose` notes carry long
  superseded-narrative chains. Deferred here because they need wholesale current-state rewrites
  with capture-first checks against DECISIONS (higher-risk prose surgery than the targeted
  contradiction deletions this branch shipped). No model change involved.

## Open threads — gated on a measurement or an owner ruling (do NOT enact without one)

- **Status-end trigger** (`selfStatusEnd`-shaped): would replace `asuka-wille`'s Emergency-Repair
  `fullBurstEnd` proxy (~1s late vs state-end) and is the missing half of "while in state X"
  gating for kits whose mode ENDS mid-fight. Consumers in waiting: `grave` Heat Emission
  off-window gating (parked as open-questions U19 — the note computes the faithful durations;
  owner decision + measurement gate the enactment), `crust` stance machine (structural owner
  ruling on the sim's always-full-charge basis). Building the primitive is cheap; every consumer
  enactment moves a board number, so each rides its own gate.
- **`consumeStatus` / remove-target-buff effect**: `asuka-wille` ⚑6 — Anti A.T. Field is consumed
  instantly at state end in-game; the model's gradual 9s-per-stack expiry over-credits the team
  amp tail (~34% vs ~22.5% uptime). Tier 2, recipe in her note. Unmeasured unit — measurement
  first.
- **Stack-mirror cast-snapshot** ("mirrors the live stack count"): `mihara-bonding-chain`'s burst
  DoT at the static 20-cap is ALREADY the tracked QUEUE.md faithfulness-residue item (localized
  2026-08-17, `docs/probe-data/mihara-overmodel-localization-2026-08-17.json`; settling =
  popup-read of Ensnaring DoT ticks or an owner ruling on pool-reaches-20). `asuka-wille`'s
  finisher 30-cap (⚑4/⚑5, 3× spread vs the blind rebuild's 10) is the second consumer. The
  engine gap: `perResource` reads the pool at tick time, but these kits ZERO the pool at cast, so
  the primitive needed is a pre-spend snapshot read at cast — ordering-sensitive, build alongside
  the first measured consumer.
- **Status-linked durations (retire the `9999` sentinels)**: `prika` ×3 (Effect 3 team Attack
  Damage / Pierce / Charge Damage — but the load-bearing question is the duet Encore WINDOW
  itself, the ⚑ OPEN in her note with the measured 0.890→1.064 ladder; a duration primitive alone
  settles nothing), `cinderella-crystal-wave` mode-swap `100000` (blocked on the Snipe
  entry/exit state machine, audit §2). Primitive design only makes sense after those windows are
  measured/ruled.
- **`flora` `sides: 2` vs `sides: 1`** — "both adjacent allies" read as up to 5 targets vs 3
  (audit §1.2, shared with `rouge`, filed in docs/open-questions.md). One owner reading settles
  it; the shipped choice is the inflating one and widens a 45.12% caster-ATK buff plus the
  recovery-event feed.
- **`mint` duet t=0 Singing gate** (audit §1.3): with `selfStatus` now in the engine, Singing
  entry could be modeled honestly (status opened at her first burst) — but `mint` is HELD
  (QUEUE.md M12); owner disposition first.
- **`cinderella` G1 same-cast snapshot** — the audit's largest open faithfulness risk (~20-25%
  nuke swing); her override already carries the "OWNER RESOLUTION REQUIRED" ⚑ with the one-popup
  recipe (docs/probes/u8 e3 footage). Nothing to build; needs the measurement.
- **Hit-Rate→core conversion magnitude** (shared engine ⚑): one measurement de-risks `miranda`,
  `anchor-innocent-maid`, `drake`, `phantom`, `jill`, `chisato` at once, and breaks the
  `jill`-cell circularity in the sg-geometry slope (audit §3/§5.9).
- **Rider `extraHitDamagePct` gauge omission** — engine-wide, owner-bounded
  (`scripts/battery/u28-gauge-ab.ts`), deliberately deferred to the batched gauge cluster
  (compensating-errors rule). Unchanged by this branch; listed for completeness.

## Pre-existing census warnings noticed in passing (not this branch's scope)

- `rei-ayanami-tentative-name` gates on boss status "Anti A.T. Field" that no override produces
  (deliberately future-gated per the census warning) — note that `asuka-wille`'s Anti A.T. Field
  is a damageTakenPct BUFF, not a named status, so these two never interacted even before the
  selfStatus migration; if an Eva-team applier ever lands, decide then whether the shared name is
  intended to couple them.
