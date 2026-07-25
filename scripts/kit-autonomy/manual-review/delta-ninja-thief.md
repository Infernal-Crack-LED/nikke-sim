# delta-ninja-thief (Delta: Ninja Thief) — kit-autonomy gauntlet manual review

**Date:** 2026-07-25 · **Verdict:** GO (cross-family corroborated) · **Faithfulness:** 0.93 (binding judge, claude-opus-5) · **Tier:** 2

**Unit:** Delta: Ninja Thief — MG / Defender / Water / Burst II, cd 40s, ammo 300, reloadFrames 171.
**VARIANT** — its base counterpart is `delta` (SR / Wind). Never conflate. Approved nickname: `dnt`.

## What she does (damage-relevant)

Offense is almost entirely support-shaped. Her own damage = MG normals + one burst distributed nuke.

| Line | Trigger | Target | Effect | Disposition |
| --- | --- | --- | --- | --- |
| S1 Ninjutsu Acid Bomb | `fullBurstEnter` | boss (enemy) | Damage Taken ▲12% / 15s | FAITHFUL (team-wide) |
| S1 (self) | `burstCast` | self | ATK ▲15.04% / 10s | FAITHFUL (self-scoped) |
| S1 Ninjutsu Hyper Acid Bomb | `burstCast` | boss (enemy) | Damage Taken ▲8% / 10s | FAITHFUL (co-stacks with the 12%) |
| Burst (allies) | `burstCast` | all allies | Distributed Damage ▲20% + casterAtkPct 15 (flat %-of-caster-ATK) / 10s | FAITHFUL |
| Burst (nuke) | `burstCast` | boss (enemy) | 170% final ATK distributed, FB-exempt | FAITHFUL |

skill2 is a Defender-count formation fork (solo-defender: taunt + self-shields; with-defender: Camouflage + Injection lifesteal + the Ninjutsu-IFAK all-ally heal). **All of skill2 is event-only / damage-inert** on the partless scope-lock boss — the engine has no shield/heal HP pool and emits no SimEvent for them; taunt/camouflage don't affect a partless boss. The shield-size and IFAK-accumulation ▲20.13% burst riders scale those unmodeled magnitudes, so they are inert too. All six inert lines are carried VERBATIM in `unmodeled`.

## What was verified (and how it discriminates)

Driver kit spec `scripts/tests/units/delta-ninja-thief.test.ts` (16 tests, GREEN vs shipped). Fixture: **liter (B1) / dnt (sole B2) / helm (B3)**, boss Fire (Water ×1.10), so dnt casts every Full Burst cycle. Each line PINs value + duration + scope AND discriminates the nearest-wrong counterfactual:

- **fullBurstEnter vs burstCast (the crux):** the 12% debuff lands on the FB-START frame (344…), the 8% on her CAST frame (292…) — 52 frames apart. Re-keying the 12% to burstCast moves it off the FB-start frames; the test asserts the frame identity directly.
- **Co-stacking 12 vs 8:** both boss-held debuffs coexist (no merged 20); stripping the 8% collapses the nuke's `mult.taken` 1.08→1.00 (the cast lands before FB opens, so the nuke sees the 8% but NOT the 12%).
- **atkPct vs casterAtkPct:** the burst ATK grant emits a single flat magnitude (~11970 = 15% of her ATK) identical across all allies under stat `casterAtkPct`; no `atkPct`=15 event exists. Rewriting it to `atkPct` moves a teammate's total.
- **Distributed nuke:** 170%, burst bucket, once per cast, `fbMajorApplied` never true (FB-exempt by measurement, not by an omitted flag); `mult.distributed`=1.20 (picks up her own +20% same cast), collapsing to 1.00 when the buff or the distributed flavor is removed.
- **Self-scope:** removing the 15.04% self ATK leaves liter/helm byte-identical.

## Cross-family corroboration

- **S2b (claude-fable-5, pre-op test-faithfulness review):** independently re-derived every line; same dispositions; flagged the crown-is-a-Defender fixture trap and the casterAtkPct-vs-atkPct scope. Converged.
- **S5 (claude-opus-5, blind test):** independent re-derivation, GREEN vs driver override (22 passed / 5 documented-inert GAP skips / 0 failed). The blind draft shipped with 4 plumbing/fixture bugs the driver repaired **without touching its assertions** (harness import path; `onEvent` into `cfg`; `ov.skillN.blocks` → direct-array OverrideFile shape; and a fixture where crown — itself a Burst II Defender — out-competed dnt for the B2 slot so dnt never cast → swapped to liter/dnt/helm sole-B2, the blind draft's OWN stated intent).
- **S6 (claude-opus-5, blind override):** byte-identical on all of skill1; behaviorally identical on the entire burst slot (blind adds explicit `noFb`/`crit`, driver uses engine auto-FB-exemption + default rider-crit — same numbers). Differences confined to inert skill2 event channels + cosmetic mode naming.
- **S7 (claude-opus-5, binding judge):** GO, faithfulness 0.93, `discriminationOk: true`, all 9 load-bearing lines converge across two model families.

## Gotcha found + resolved

The judge's one REAL-GOTCHA (low severity, non-gating): the IFAK all-ally heal was encoded as a `hitCount 200` proxy for the kit's explicit "every 4 sec", defended by a note claim that **no timed-interval trigger exists — which is false**. The engine has `{kind:'interval', sec:N}` (game-mechanics.md §9 / damage-calculation.md §2b; carried by snow-white S2a and helm-aquamarine `sec:4`), and the S6 blind override reached for it unprompted. **Resolved post-verdict:** swapped the IFAK trigger to `{kind:'interval', sec:4}` (first fire t=4), corrected the note + caveat to flag only the genuinely-unmeasured part (whether the stored heal releases on the 4s boundary or re-arms after a gap). Re-validated; both tests still green. skill2 remains damage-inert, so this changes no damage number — it fixes the encoding + a misleading note for the next author.

## Residuals for owner spot-check

1. **Trigger split is discriminated by FRAME, not COUNT.** The driver fixture makes dnt the SOLE B2, so she casts in every FB — the 12%-vs-8% fullBurstEnter/burstCast split is proven by frame (cast 292 vs FB-start 344) but never by count. S2b's sharper test — her 40s cd producing FB rotations she does NOT cast, where only the 12% should appear — is not exercised. A two-B2 fixture would close that gap (crown competes for the slot, so it needs a non-Defender second B2).
2. **Default mode is solo-defender**, which is the WRONG formation branch in any comp containing a second Defender (crown, the stock control-comp B2, is one). Damage-inert today (skill2 has no pool) and flagged ⚑3, but needs per-comp mode selection the moment shields/heals gain a pool.
3. **Cadence tuple ⚑ [mandatory]:** MG rate-of-fire wind-up ladder + reloadFrames 171 + rolling-reload — datamine estimate shipped; recipe = rounds/min + reload gap from a focused dnt video.
4. **Blast radius:** her team-facing levers (boss Damage Taken 12+8, allies casterAtkPct 15 + distributedDamagePct 20, IFAK heal→recovery events) touch the WHOLE team — run a /sim-battery diff before any board-level claim.

## Artifacts

- Driver test: `scripts/tests/units/delta-ninja-thief.test.ts`
- Override: `src/skills/overrides/delta-ninja-thief.json`
- Binding verdict: `scripts/kit-autonomy/results/delta-ninja-thief.json` (+ `results/delta-ninja-thief-judge-packet.md`)
- Cross-family packets/results: `scripts/kit-autonomy/cross-family/delta-ninja-thief/` (s2b fable; s5/s6/s7 opus)
- Blind re-derivations: `scripts/kit-autonomy/blind/delta-ninja-thief.{test.ts,override.json}`
- S2b review: `scripts/kit-autonomy/reviews/delta-ninja-thief.test-review.json` (+ `.verify.txt`)
