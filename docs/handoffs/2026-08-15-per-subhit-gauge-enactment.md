# Enactment plan — per-sub-hit burst-gauge credit on multi-hit (sequential) `flatDamage` riders

> **Status: PLANNED, owner-gated, NOT enacted.** Measurement basis is landed (probe-runs
> 2026-08-15, commit `e64e0432`). This doc is the pickup packet for the enactment session.
> Lane: engine + schema touch on a worktree, then `/code-review`; the measurement that motivates
> it is already done, so this is NOT a `/scientific-method` pass — unless the owner wants the
> eve/little-mermaid hit counts measured rather than kit-read first.

## The measured premise (do not re-derive)

`docs/probes/solo/swha-solo.mov` (2026-08-15, `gauge-fill.py --bar 489:501:2474:2612`; full record
in `docs/probe-runs.md` → "2026-08-15 — Solo gauge-bar reads ×3"):

- `snow-white-heavy-arms`' Seven Dwarves volley credits burst gauge **PER HIT**: +5.8–7.2 raw bar
  steps at an exact 0.20s spacing (the 5-hit sequential volley unrolling), each ≈ her 560 target
  value; bar 0→full in 3.2s on ~3 pulls.
- Closure refutes the sim's model: per-effect credit caps 3 pulls at 75.6% of bar (< 100,
  impossible — the bar filled); per-hit gives 142.8 and fills mid-third-volley ✓.
- Engine today: `skillGauge` fires **once per `flatDamage` effect** (`applyEffect()`'s
  `flatDamage` case in `src/engine/sim.ts`; once per flighted hit on the landing path). Her 5-hit
  volley earns 1 event, not 5 → under-credit **4 × 560 = 2,240 energy = 22.4% of bar per pull**.

## The implementation wrinkle (this is why it's a packet, not a drive-by)

`sequential` is only a damage-bucket flag. The engine does NOT expand a sequential effect into N
damage instances — it deals one instance at the aggregate `atkPct` (`sequentialDamagePct` /
`sequentialMultPct` are bucket terms on that single instance). **The sub-hit count is represented
nowhere**, so it cannot be derived in the engine — it must be authored.

Suggested shape (minimal, gauge-only):

- New optional effect field, e.g. `gaugeHits: number` (schema: `src/skills/types.ts` +
  validator), meaning "this effect is N physical hits for burst-gauge purposes".
- In `applyEffect()`'s `flatDamage` case (and the flighted `delaySec` landing path), fire
  `skillGauge` `gaugeHits ?? 1` times. Damage path untouched — totals are tuned to the aggregate.
- Author it per unit from the kit prose: `snow-white-heavy-arms` S1(b) = 5 (Auto Fire Ready
  loads 5; the Fully-Active swapGate block (c) = 10 extra — 15 total minus the baseline 5 — but
  that block fires only inside FB, gauge-locked, so authoring it is correct-but-inert; author for
  fidelity anyway), `eve` S1 and `little-mermaid` S2 per their kit hit counts (⚑ confirm from
  prose/footage before authoring — see Verification).

Do NOT instead expand sequential into real damage sub-instances: that re-rolls crit/core per hit
and moves every tuned damage total. Gauge-only, one new field, one loop.

## Blast radius (censused 2026-08-15, this exact shape)

Six roster units carry `flatDamage` + `flavor:'sequential'`; only the three whose trigger fires
**outside the FB/chain gauge lock** are gauge-relevant:

| unit                     | block                                 | gauge-relevant?                                 |
| ------------------------ | ------------------------------------- | ----------------------------------------------- |
| `snow-white-heavy-arms`  | S1 ungated `shotFired` (527.95% seq)  | **YES — measured case**, +22.4% of bar/pull     |
| `eve`                    | S1 `hitCount` (720% seq, ungated)     | **YES** — fires in refill windows               |
| `little-mermaid`         | S2 `teamAmmo` (850% seq)              | **YES** — timing-gated, lands in refill windows |
| `cinderella`             | burst `burstCast` (13,659% seq)       | no — chain/FB-locked, inert                     |
| `elegg-boom-and-shock`   | burst `burstCast` ×19 (800% seq each) | no — chain/FB-locked, inert                     |
| `sakura-bloom-in-summer` | burst `burstCast` ×10 (457% seq each) | no — chain/FB-locked, inert                     |

**Zero carriers are seated in iron sweep (run G), T5 wind-weak, or misc B3s** (all thirteen
slugs checked) — this enactment does NOT move the three filmed shortfall comps and is not a
candidate for the 1.6–1.9× in-window elevation. Say so in the PR so nobody reads it as one.

## The N5 tension and the cap-waste resolution (state both in the PR)

- Naive per-pull arithmetic moves N5 snowwhite-HA fire from sim 11 to **~13** full bursts vs
  **12 measured** — at first glance an overshoot as bad as the current undershoot.
- The resolution: **cap waste**. The solo clip shows the bar filling mid-volley and her remaining
  hits generating into a full/locked bar. In a 5-unit comp the bar fills faster, so MORE of her
  late-volley hits land after gauge-full and are wasted; the naive arithmetic ignores this, the
  engine's chain-open lock doesn't. Per-hit enactment plausibly lands N5 at 12 exactly.
- Judge the enactment by **measured FB counts** (`scripts/regression.ts` asserts), never the
  aggregate board ratio.

## Verification plan

1. `scripts/regression.ts` — N5 (snowwhite-HA fire) FB-count assert is the primary gate: 11 →
   target 12 measured. Also every comp seating `eve` or `little-mermaid`.
2. `npx vitest run` full suite + `bash scripts/verify.sh` — snapshot leaves WILL move for the
   three gauge-relevant carriers (and any comp seating them); leaf-diff the snapshot and account
   for every moved leaf before landing.
3. sim-battery blast-radius pass (`/sim-battery`) — the census says 3 units, but run the roster
   diff anyway; the census has been wrong before by trusting memory over code.
4. ⚑ `eve` / `little-mermaid` hit counts: author from kit prose; if the prose is ambiguous,
   that's a measurement question (same solo-bar method as swha — 0.20s-spaced step clusters) —
   STOP and flag rather than guessing a count.
5. Pin the behavior: a unit test on swha's override asserting 5 gauge events per S1(b) volley
   (cf. `scripts/tests/units/snow-white-heavy-arms.test.ts`).

## Explicitly out of scope

- Do not touch the per-shot gauge table (`data/gauge-per-shot.json`) — SMG/MG rows were
  bar-validated the same day (nayuta 0.2, ccw class-modal 0.1, both within reader bias).
- Do not expand sequential into damage sub-instances (see the wrinkle).
- Do not present this as a fix for the filmed-comp generation shortfall — see the census result.
- Do not re-open U39 (volley delivered by uses vs time) here — that's a damage-delivery question,
  unaffected by gauge credit.

## Related

- Measurement: `docs/probe-runs.md` 2026-08-15 solo-reads entry; commits `e1351549` (reader
  `--bar` hatch), `e64e0432` (records).
- QUEUE item 2 residue ledger carries the short pointer; this doc is the plan of record.
- `docs/data/burst-gauge.md` §2 — the retired "~24 generating hits per 3s" annotation.
