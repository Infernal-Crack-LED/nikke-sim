# Manual review — rupee (Rupee)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate via resource-pool mirror; element-scoped buff; stack mechanics)

> Slug disambiguation: `rupee` is the BASE AR/Iron Attacker (Burst II, cd 20s, Tetra). It is NOT
> `rupee-winter-shopper` (AR/Electric Burst I Defender, aka rws — an entirely different kit).

## Kit summary

Rupee is an Iron-code AR Attacker whose own damage is her rifle spray plus a modest single-hit
burst nuke (274.28% of final ATK) on a 20-second Burst II. Every 30 landed shots she grants
herself one stack of **Mileage** — ATK ▲13.8%, up to 5 stacks (69% total), each proc refreshing
the 15-second timer — so under sustained fire the ramp completes in the opening ~13s and holds.
Every 100 landed shots she hands all Iron-code allies (including herself) 2.24% critical rate for
10s, and the same trigger also carries the roster-wide "Increases stack count of buffs by 1"
sentence — whose SELF slice is folded as +1 to her Mileage stack count (the cross-ally slice has
no engine primitive). Her burst has a rider: **when Mileage is at max stacks at cast time**, all
allies gain ATK ▲19.8% for 5s — so her first burst of a fight typically fires without the team
window and every later one carries it. The stack gate reads a `mileage` resource pool (the engine
has no buff-stack gate primitive), fed by both S1 and S2 procs.

## Line-by-line

| Line                                                        | Disposition            | Notes                                                                                                                                       |
| ----------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: hitCount 100 → Iron allies critRatePct 2.24/10s          | FAITHFUL               | UNSCOPED crit (no "of normal attacks" in prose — the inverse-helm read); Iron-scoped incl. self; R1 discriminates all-allies vs self-only |
| S1: "Increases stack count of buffs by 1"                    | DOCUMENTED_GAP (split) | SELF slice = +1 mileage pool on the same trigger (mica-snow-buddy/pepper majority); cross-ally slice out-of-domain; verbatim in unmodeled   |
| S2: hitCount 30 → self atkPct 13.8, maxStacks 5, 15s         | FAITHFUL               | Refresh-on-reapply ramp 1→5 (~13s), post-cap applies all refresh=true; flat +69% passive counterfactual strictly over-damages              |
| Burst: burstCast → enemy flatDamage 274.28%                  | FAITHFUL               | lv10 value (not lv1 150.85); FB-exempt (all nukes fbMajorApplied false; several casts fall outside any FB window entirely)                  |
| Burst: Mileage max stacks → all allies atkPct 19.8/5s        | FAITHFUL               | resourceGate{mileage≥5} on burstCast; gate load-bearing (cast 1 at f570 < earliest pool-max f699 — silent; casts 2-9 fire)                  |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All four load-bearing
  lines CONVERGED (unscoped critRatePct + Iron scope, 13.8×5 ramp + 15s refresh, 274.28 FB-exempt
  burstCast nuke, resourceGate-mileage burst rider). Opened with the FIXTURE TRAP warning (rupee is
  B2 — controlComp seats crown at B2; a competing same-cd B2 starves her of casts) — the driver
  fixture makes her the sole B2, later confirmed by measurement (crown takes 10/10 rotations on
  controlComp, rupee 0). The buff-stack sentence dispositioned GAP with the self-slice optionally
  expressible — matches the driver's partial encoding.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all kit lines with
  discriminating counterfactuals. Out-of-box vs the driver override: 12 pass / 8 fail / 1 skip.
  **All 8 failures were RECON_ERRORs**: (a) the blind chose controlComp('rupee', true), on which
  rupee casts ZERO bursts (measured — crown takes every stage-2 slot), vacuating the burst groups;
  (b) team-wide "no critRateNormalPct anywhere" hit helm's legitimate scoped-crit line (filter
  narrowed to rupee's casts); the rest were imagined-harness plumbing (onEvent location, `.blocks`
  accessor, srcSlot-as-index). Every kit-line assertion preserved verbatim in
  `blind/rupee.adapted.test.ts`: **20 pass / 1 skip (the documented GAP) / 0 fail**.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Architecture CONVERGES hard — same
  mileage pool 0→5, same triggers/targets/values on all four encoded lines, same resourceGate
  mirror. ONE structural divergence: the blind did NOT feed the pool from S1 (reads the buff-stack
  sentence as unmodelable and omits it from unmodeled entirely — a recon-side documentation lapse
  the judge noted). Behavioral consequence confined to the shot-120-vs-150 gate-opening window,
  into which no legal-fixture cast falls (casts ≥20s apart) — byte-identical sim output today.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, 0 gotchas.**
  All lines accounted (4 FAITHFUL + 1 DOCUMENTED_GAP), zero silent drops. Judge independently
  formula-checked every line against the damage SSOT (critRatePct in the unscoped Major crit term;
  atkPct in the (1+ΣATK%) self multiplier; flatDamage's final-ATK scaling with FB-exemption by
  cast timing) and ruled the sole S6 divergence "real but inert and fully recorded". Called the
  gated rider "the strongest line in the implementation".

## Residual flags for owner

1. **⚑ "Increases stack count of buffs by 1" interpretation (the spot-check cluster).** The driver
   followed the mica-snow-buddy/pepper **+1-grant majority** (self slice → mileage pool) over the
   alice-wonderland-bunny/diesel stack-cap-raise/unmodeled dissent. Inert in every legal fixture
   today (gate opens shot 120 vs 150; casts ≥20s apart), but it would shift gate timing if rotation
   fixtures change. One rupee-focus recording showing whether S1 visibly feeds the Mileage stack
   icon settles it; the encoding is one block (skill1[1]) away from the conservative reading.
2. **⚑ No-decay pool approximation (power/pepper precedent).** The mileage pool never decays while
   the Mileage buff lapses 15s after its last refresh; at sustained scope-lock cadence (procs ≈
   every 3.2s) they never disagree inside a sim fight. Diverges only if rupee stops firing >15s.
3. **⚑ Cadence tuple (always-⚑).** AR rate_of_fire 720 + reloadFrames 81 + ammo 60 are datamine;
   they drive both proc cadences and hence the gate-opening time. Recipe: rounds/min + reload gap
   from any rupee-focus video.
4. **Self-stack ATK component unrepresentable (⚑2 in override).** The mileage buff granted by the
   S1 stack-increment is NOT modeled (a skill1-slot buff would key separately and double-count
   stacks under the engine's caster+slot+stat+value instance rule) — rupee's own ATK is
   under-credited ≤13.8% during the opening ramp only (≤ first ~11s).
