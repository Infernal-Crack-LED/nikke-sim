# Manual review — `eve` (EVE) — kit-autonomy gauntlet 2026-07-25

**Verdict: GO (cross-family corroborated)** · faithfulness **1.0** · **Tier 2** · discriminationOk **true** · 0 REAL-GOTCHA.

EVE — AR / Attacker / Iron / Burst III, cd 40s, ammo 60, no charge. Not a variant.

## What ran

| Stage | Role | Model | Outcome |
| --- | --- | --- | --- |
| S0 | slug lint + line inventory | driver | clean (no AMBIGUOUS); 8 effect-lines, all FAITHFUL (3 with documented proxy-⚑) |
| S2a | driver test (test-first) | driver | `scripts/tests/units/eve.test.ts`, 21 assertions, 8 groups (E1–E8), 7 sim runs |
| S2b | test-faithfulness review | **claude-fable-5** | independently converged on all 10 load-bearing lines; leakDetected null |
| S2c/S2d | reconcile + verify | driver | 21/21 green vs shipped (`reviews/eve.verify.txt`) |
| S3 | minimum faithful edit | driver | note provenance + 2 judge caveats (G1/G3); no encoding change (already faithful) |
| S5 | blind test writer | **claude-opus-5** | 20 pass / 4 fail / 2 skip vs driver override — all 4 fails ruled RECON_ERROR by the judge |
| S6 | blind override writer | **claude-opus-5** | near-identical override; independently derived hitCount 59, casterAtkPct, instantReload 0.04, Mk2 riders |
| S7 | reconciling judge (binding) | **claude-opus-5** | **GO**, faithfulness 1.0, 0 REAL-GOTCHA (`results/eve.json`) |

## Line-by-line (judge `lineFindings`, all FAITHFUL / DOCUMENTED_GAP)

- **S1 Critical Rate ▲60%** — FAITHFUL. Unscoped `critRatePct` (kit says "Critical Rate", not "of normal attacks"); permanent self. E1 pins normal critRate 0.75 shipped vs 0.15 deleted; S5 blind confirmed load-bearing + self-only + unscoped-by-hit-type.
- **S1 Unstable Energy (44 crits → 240%×3 sequential)** — FAITHFUL. Crit-count proxy `hitCount 59 = ceil(44/0.75)`, derived **identically by all three families** (driver, S2b/fable, S6/opus). Consolidated to one 720% event (damage-equivalent). E2 bounds cadence to ÷59 (literal-÷44 fails) + magnitude 720 vs 240 counterfactual.
- **S1 Damage Taken ▲10% (Electric)** — DOCUMENTED_GAP. `bossElement` trigger → boss `damageTakenPct 10`; modeled permanent-while-Electric (kit: 10s per proc; ~100% uptime after first proc ~4.9s, so only the opening ~0.27% of team damage is over-credited, and only on Electric bosses — which no graded comp uses). E3 discriminates the gate both ways (Electric: mult.taken 1.1; Iron: 1.0).
- **S2 "previous effects trigger repeatedly"** — FAITHFUL (inherent: the hitCount counter re-arms; ~30 procs/fight excludes once-per-battle).
- **S2 ATK ▲50% of caster ATK** — FAITHFUL. `casterAtkPct 50` (flat-resolved to 59,833.5 = 0.5 × 119,667 scope-lock ATK), NOT `atkPct`. E4 pins the resolved value; S5 atkZero confirmed load-bearing + self-only.
- **S2 Max Ammunition ▲25%** — FAITHFUL. `maxAmmoPct 25` (mag 60→75); a weapon-state modifier ⇒ IS damage. S5 ammoZero confirmed removing it raises reload count + lowers damage.
- **S2 Reloads 3 / 10 hits (Electric)** — FAITHFUL. `hitCount 10` + `bossElementGate Electric` + `instantReload 0.04` (0.04 × 75 = exactly 3). E5: live vs Electric (fewer reloads), inert vs Iron (identical to deleted).
- **Burst 457.14%×6** — FAITHFUL. `burstCast` → 2742.84% consolidated, **unflavored**, `fbMajorApplied` never set (cast lands before FB opens). E6 pins magnitude + bucket + FB-exempt + seqMult 1.
- **Burst Mk2 — Unstable Energy ×2** — FAITHFUL. `sequentialMultPct 100` for 10s — a TRUE ×2 in its own multiplicative bucket (not the additive `sequentialDamagePct`). E7: procs read seqMult exactly 2.0 inside / 1.0 outside; the additive counterfactual leaves seqMult 1 (assertion flips).
- **Burst Mk2 — Eagle Eye ×2** — FAITHFUL. Timed `casterAtkPct 50` for 10s (re-grants the same 50%-of-ATK ⇒ Eagle Eye ATK runs ×2); ammo half deliberately not doubled (capacity, not a "damage multiplier"). E8: timed grant equals the permanent passive, 600-frame expiry. Driver + S2b + S6 all landed on this encoding; S5 conservatively skipped.

## Judge gotchas (all non-blocking; resolved)

- **G1 (low, FIDELITY)** — the consolidated UE proc feeds the skill-hit **burst gauge** once instead of 3× (gauge counts hits, not damage). Small, conservative (under-generation), ~60 missing skill-hit contributions/fight. **Resolved:** documented as a caveat (judge offered "split or caveat"; the consolidation is damage-faithful, so caveat chosen over encoding churn). The burst nuke's 6→1 merge is strictly inert (casts land inside the chain, gauge locked).
- **G2 (low, FIDELITY, documented)** — the deliberately unflavored nuke also forfeits a genuine ally **Sequential Damage ▲** buff. Currently inert (the only carrier, snow-white-heavy-arms, grants it to herself). **Action:** re-check the moment a team-wide Sequential Damage ▲ source enters the roster; long-term fix is a per-slot seqMult scope.
- **G3 (med, FIDELITY) — SETTLED read-only.** Crit-eligibility of the 720% proc + 2742.84% nuke rested on an unstated engine default the judge couldn't resolve by inspection. **Driver verified:** `sim.ts` dealDamage uses `crit: e.crit !== false` ⇒ flatDamage crits **ON** by default. Both instances crit at eve's 75% sheet rate (faithful per damage-calculation §2b). No encoding change; documented as a caveat. S2b's "defaults off" was incorrect; S6's explicit `crit:true` is redundant.

## Owner spot-check cluster

1. **G3 crit default** — settled (crit-ON, faithful); caveat added. Lowest priority now.
2. **G1 gauge under-feed** — if a future grade is sensitive to eve's burst uptime, consider splitting the proc to 3×240 (strictly more faithful on gauge; would also turn the S5 blind's group-of-3 assertions green). Currently a documented conservative residual.
3. **Documentation hygiene** (judge note): the historical `note` still contains the superseded "S2's reload-3-per-10-hits-on-Electric skipped" alongside the later "ADDED the missed 3-rounds-per-10th-hit refund", and "She grades ~1.14 (over)" vs caveat "eve is ungraded". The `caveats` array is the authoritative current state; the `note` is a historical palimpsest left intact (tread-lightly).

## Tooling note (shared infra)

`scripts/kit-autonomy/prepare-cross-family-packet.ts` matched the slug as a raw substring, so the 3-letter slug `eve` false-positived the leak check on `event`/`level`/`never`/`every` and would have gutted the redacted schema. Fixed to match the slug on a **word boundary** (tokens stay substring-matched). Strictly more correct for all slugs; required to run the gauntlet on any short-slug unit.

## Artifacts

- driver test: `scripts/tests/units/eve.test.ts` (21/21 green)
- driver override: `src/skills/overrides/eve.json`
- S2b review: `scripts/kit-autonomy/reviews/eve.test-review.json` · verify: `reviews/eve.verify.txt`
- S5 blind test: `scripts/kit-autonomy/blind/eve.test.ts` (20/4/2 vs driver; 4 = RECON_ERROR)
- S6 blind override: `scripts/kit-autonomy/blind/eve.override.json`
- judge verdict: `scripts/kit-autonomy/results/eve.json`
- packets + results: `scripts/kit-autonomy/cross-family/eve/`
