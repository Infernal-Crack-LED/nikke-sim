# Manual review — poli (Poli (Treasure))

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 1 (plain buff/interval/shield encodings on established precedents; no scoped buffs, no round counts, no modeled status gate)

> Slug disambiguation: `poli` IS the Treasure variant (name "Poli (Treasure)", Elysion SG/Water
> Defender, Burst II, cd 40s, `treasure:true`, released 2022-11-04) — it is the ONLY `*poli*` slug
> in data/characters.json, and the slug-disambiguation lint returned clean. FROM-SCRATCH gauntlet:
> no shipped override existed before this run (`simSupported` was false); the override was authored
> as the faithful encoding under test (novel precedent) and every assertion pins a kit line GREEN
> vs it and RED vs the nearest-wrong counterfactual.

## Kit summary

Poli (Treasure) is a Water shotgun Defender on Burst II (cd 40s) whose kit is almost entirely team
protection built around the **Police Badge** — a self-shield equal to 100% of her final Max HP for
10s granted at battle start. Every 5 normal attacks (~3.3s at the SG class rate) she raises all
allies' ATK by 5.46% for 10s, which saturates to near-permanent uptime. Every 20s she raises her
own DEF and that of the 2 lowest-HP allies by 23.51% for 10s and shares damage taken with them
(both defensive; the v1 sim models no incoming damage). When the Badge ends she heals herself for
5% of final Max HP per second over 5s. Her burst grants all allies ATK ▲44.55% for 10s — her single
load-bearing damage line — plus a shared shield equal to 40% of her final Max HP protecting all
allies for 10s; the burst's badge-gated branch (Indomitability 5s, removes the Badge) is defensive
and structurally unreachable at scope lock (the Badge expires at t=10s while her 40s CD means her
first burst cannot cast before ~40s). In a damage sim with no incoming boss damage, only the two
ATK auras move the board; the shields/DEF/heal are event-only or inert, kept for kit completeness
and for shield-synergy wiring with teammates.

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1: after 5 normal attacks → all allies ATK ▲5.46%, 10s | FAITHFUL | `hitCount:50` → allies `atkPct 5.46 / 10s`. SG "normal attacks" = trigger pulls per the repo convention (guilty's "every 6 normal attacks" = hitCount:60): the engine's hit counter advances by `hitsPerShot` (10 pellets) per pull (sim.ts ~3607), so 5 attacks = count 50. Kth proc rides the 5k-th shot (pinned); pellet-count counterfactual (hitCount:5) goes RED in both directions. Buff proven LIVE: removal strictly lowers every unit total. |
| S1: at battle start → self Police Badge shield, 100% final Max HP, 10s | FAITHFUL (event-only) | `passive` → self `shield {maxHpPct:100, durationSec:10}` — fires at frame 0 exactly once; no HP pool in v1, so the shield is observable only via `shielded` triggers / `requiresShielded` windows (a 0.73-probe device pins it; badge removal silences exactly the frame-0 probe and moves no total — proves the KIND, not just presence). The badge's two in-kit consumers (burst Indomitability gate, S2 ending-heal anchor) are both documented gaps, so nothing load-bearing is lost. |
| S2: every 20s → self + 2 lowest-HP allies DEF ▲23.51%, 10s | FAITHFUL (inert) | TWO `interval:20` blocks — self + `alliesLowestHp count:2 excludeSelf` — `defPct 23.51 / 10s` each. The split encoding is the literal "self AND 2 other allies" (guarantees self; a bare leftmost-3 stand-in does not). `defPct` is damage-inert in v1 — proven byte-identical totals with BOTH blocks stripped. First fire t=20, strict 20s cadence, 3 holders per firing (pinned). |
| S2: Equally shares damage taken for 10 sec | DOCUMENTED_GAP | No damage-redistribution primitive; defensive (the v1 boss deals no damage). Verbatim in `unmodeled.skill2`; specifically NOT fudged into `damageTakenPct` (that stat is a boss debuff and would wrongly buff team damage — S2b's named trap). |
| S2: when Police Badge ends → self regen 5% final Max HP/s, 5s | DOCUMENTED_GAP (⚑1) | No own-shield-expiry trigger primitive. The heal amount is inert (no HP pool) and the recovery events are second-order: the heal is SELF-targeted, so its recovery events fire only poli's own (nonexistent) recovery triggers — damage-inert in every comp, not merely the fixture. Estimate: 5 recovery events over t≈10–14s, once per battle. Recipe: engine shield-expired trigger primitive; size it only if a poli+crown recording ever shows crown's recovery buff firing at ~10–15s. All four parties converged on this resolution (S6's interval:10 encoding was self-flagged as ~90 spurious re-fired events and its own flag offered UNMODELED as "the simplest correct move"). |
| Burst: when in Police Badge status → self Indomitability 5s, removes Police Badge | DOCUMENTED_GAP | No Indomitability primitive (blanc precedent) and no self-status gate; defensive anyway. The gate is structurally unsatisfiable at scope lock: badge expires t=10s, first burst ≥40s. Critical negative check PASSES: the gate did NOT bleed onto the 44.55% aura — poli's 2nd+ casts (badge long gone) still emit it (the kit's named trap, pinned by the driver's P8 suite). |
| Burst: shared Shield 40% final Max HP protecting all allies, 10s | FAITHFUL (event-only, ⚑2) | `burstCast` → allies `shield {maxHpPct:40, durationSec:10}` — one firing per poli cast, frame-exact, reaching every ally ("protects all allies" = team-wide shielded state; teammate-probe pinned). ⚑2 VALUE DISAGREEMENT: the prose says 40% but the same file's datamine `description_value_list` carries 22.27% at level 10 — shipped at the prose value; magnitude unobservable in v1 either way (no HP pool). Recipe: read the burst shield HP popup from a focus video. |
| Burst: all allies ATK ▲44.55%, 10s | FAITHFUL | `burstCast` → allies `atkPct 44.55 / 10s` — her headline damage line. Lands frame-exact on her stage-2 cast BEFORE the FB window opens (crust/novel burst-aura convention); UNGATED (the badge gate belongs to the Indomitability block only). Both nearest-wrong models pinned RED: `fullBurstEnter` keying moves every application off her cast frames; badge-gating would silence every cast after the first. Removal strictly lowers every unit total. |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independent spec
  converged on all 8 lines: hit-counted S1 ATK (rounds not pellets), passive frame-0 self badge,
  interval:20 DEF on self + 2 lowest-HP allies, damage-share UNMODELED (never `damageTakenPct`),
  badge-end heal as GAP (self-only, offensively inert), Indomitability UNMODELED with the badge
  gate bound to its own block only, burst shared shield on burstCast, and the 44.55% aura as
  burstCast-keyed + UNGATED. Pre-registered the fixture hazard the driver's design avoided: crown
  (B2, 20s CD) in the standard controlComp would take every stage-II cast and leave poli zero
  bursts — the driver fixture fields poli as SOLE B2 (liter/poli/modernia/helm).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Prose-only suite (21 tests) with
  shield-probe-free structural assertions and behavioral counterfactuals. **Vs the driver override:
  12 pass / 6 fail / 3 skip**, and every failure is blind-side (independently re-run and verified):
  F1/F2/F5/F6 are fixture bugs — `controlComp('poli', true)` is 4 units, not the 5 the assertions
  assume, and crown takes ALL 10 stage-II casts (measured: poli burstCasts = 0, crown = 10, FB = 5),
  making every poli-burst assertion vacuous; F3 is the block-shape divergence on S2 targeting (one
  `alliesLowestHp count:3` vs the driver's self + count-2 split — the driver's is the only one that
  guarantees "self AND 2 others"; damage-identical, defPct inert); F4 upholds the badge-end heal as
  UNMODELED — S5's own file skips its trigger as a GAP yet asserts the payload, and the self-target
  makes it inert in every comp.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on 6 of 10 lines (S1 ATK
  buff, badge shield, damage-share skip, burst ATK aura, Indomitability skip, effect magnitudes).
  The 4 divergences each resolved by code or kit text: (D1) `hitCount:5` vs the driver's 50 — S6's
  OWN flag said "If per-pellet, set count:50 … answerable from CODE alone," and the engine adds
  `hitsPerShot` per pull, so 50; (D2) single `alliesLowestHp count:3` vs the driver's guaranteed-self
  split; (D3) `interval:10` badge-end heal vs UNMODELED — S6's flag itself offered the driver's
  resolution as the pragmatic correct move; (D4) burst shield `target self` (under-credit) vs the
  driver's `allies` fan-out — the kit text "protects all allies" decides it. No divergence
  contradicts the prose's own numbers.
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**, `gotchas: []`,
  `discriminationOk: true`. All 8 lines FAITHFUL (5) or DOCUMENTED_GAP (3). The nominal RED S5
  convergence was classified entirely blind-side (4 fixture bugs, 1 block-shape divergence the
  driver wins, 1 upheld DOCUMENTED_GAP that S6's own flag endorses). Both of the kit's named traps
  verified avoided: the badge gate stayed bound to the Indomitability line only, and the burst aura
  is burstCast-keyed, not fullBurstEnter-keyed.

## Residual flags (owner spot-check cluster)

1. **⚑1 badge-end recovery (Tier 2 if ever material):** UNMODELED pending a shield-expired trigger
   primitive; inert in every comp today (self-targeted, no HP pool). Spot-check only if a poli+crown
   recording shows crown's recovery buff firing at ~10–15s.
2. **⚑2 shared-shield magnitude 40% (prose) vs 22.27% (datamine level-10 description value):**
   shipped at the prose value; inert until an HP pool exists. Spot-check via the burst shield HP
   popup in a focus video — becomes live the day a shield-consumer teammate (naga-type) joins a
   graded comp, together with the allies-vs-self fan-out choice.
3. **⚑3 cadence tuple (Tier 1):** SG class rate 1.5 pulls/s + datamined reloadFrames 111 are not
   focus-verified for poli; they drive the S1 proc cadence (~3.3s). The hitCount:50 encoding itself
   rests on the guilty SG convention + engine code, not a poli-specific measurement. Recipe:
   rounds/min + reload gap from any poli focus video.
4. **Interval first-fire phase:** S2 DEF fires first at t=20 (engine interval convention; ⚑,
   damage-inert regardless).
5. Still **MODEL_ONLY / untuned** — the gauntlet certifies structure, not magnitudes; no board
   reading exists yet (board: null).
