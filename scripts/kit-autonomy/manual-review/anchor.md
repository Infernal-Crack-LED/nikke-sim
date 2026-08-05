# Manual review — anchor (Anchor)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (burstCast-vs-fullBurstEnter discrimination; inert-stat event pin on a per-magazine trigger; single-boss multi-target collapse; engine-core ⚑ for the anti-projectile scope)

> Slug disambiguation: `anchor` is Anchor — RL / Defender / Wind / Burst I, Elysion SR, released
> 2023-08-03. The disambiguation lint fired on the shared base name (AMBIGUOUS BASE "Anchor"):
> resolved explicitly to slug `anchor` (RL/Wind base unit), NOT `anchor-innocent-maid` (RL/Water
> Supporter Burst-II variant, already gauntleted 2026-07-24). FROM-SCRATCH build: no override
> existed before this gauntlet (`simSupported` was false).

## Kit summary

Anchor is a Wind rocket-launcher Defender whose kit is almost entirely defensive (judge's
wording, independently converged by every role). Each time she fires the last round of her
6-shot magazine she taunts the enemy for 5 seconds and gains a 5-second 23.82% DEF buff on
herself. From battle start she permanently deals 25.6% more damage to enemy projectiles
(missile interception) — a situation that never arises against the scope-lock boss. Her Burst I
(20s cooldown) is a single instant hit on all enemies for 304.45% of her final ATK. Offensively
she is just her weapon plus this one modest burst nuke; the DEF grant and the taunt move no
damage in v1 (the former is event-pinned rather than dropped; the latter has no engine surface).

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1: last bullet hits → target Taunt for 5 sec | DOCUMENTED_GAP | verbatim in `unmodeled.skill1`: no taunt/aggro primitive; the sim has no enemy-behaviour model (the scope-lock boss deals no damage and follows a measured fixed range script) — offensively inert by construction (soda 1-sec-stun precedent). S5 additionally asserts no stun/targetStatus fabrication stands in for it and the word is carried verbatim |
| S1: last bullet hits → self DEF ▲23.82% for 5 sec | FAITHFUL (inert) | `lastBullet` → self `defPct 23.82` `durationSec 5`. defPct is inert-in-v1 by engine design (self DEF never feeds own damage — Endurance-cube channel), so the line is EVENT-pinned: one application per engine `reload` event (robust to liter's escalating maxAmmoPct 45.17% stretching her magazine 6 → 8–9 rounds during its uptime), value 23.82, 300-frame wall-clock duration, self-scope, byte-identical totals when removed; shotFired counterfactual discriminates (per-shot ≠ per-magazine). Seconds, not rounds |
| S2: battle start → +25.6% damage dealt to enemy projectiles, continuously | DOCUMENTED_GAP (⚑ engine-core) | verbatim in `unmodeled.skill2`: the sim fields no enemy-projectile entities, so the scoped modifier has no target domain. ESTIMATE zero in every fight the sim can run; RECIPE: enemy-projectile entity model + per-source conditional modifier keyed on target kind; TIER out-of-domain (engine-core). The nearest-wrong model — a generic passive attackDamagePct/partsDamagePct/projectileExplosionPct 25.6 that would silently over-credit ALL of anchor's boss damage — was named by S2b and independently refused by both opus blinds; S5's sensitivity probe proves the fixture would have caught it |
| Burst: all enemies, 304.45% of final ATK | FAITHFUL | `burstCast` → enemy `flatDamage 304.45`, ONE instance — "all enemies" collapses onto the lone partless scope-lock boss (anis-sparkling-summer / privaty-unkind-maid / soda precedent). burstCast-keyed so it lands BEFORE the Full Burst window and never takes the +50% major (B1 casts at stage 1; helm H7 precedent); flatDamage procs crit by engine default. Pinned: once-per-own-cast (4 in the main fixture / 8 as sole B1), magnitude, burst bucket, fbMajorApplied never set, inFullBurst always false; doubled-block counterfactual pins the single-instance reading; dedicated SOLO-B1 fixture splits burstCast-vs-fullBurstEnter 8-vs-4 (the main fixture's 4-casts=4-FBs coincidence is diagnosed, not passed along) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on all four
  lines: taunt UNMODELED (no mechanical surface), DEF grant FAITHFUL (`lastBullet`, self, 23.82,
  wall-clock 5s, event-present/damage-inert), S2 UNMODELED with an explicit SCOPE-TRAP warning
  (generic +25.6% Damage-Up is the calibration-hiding misread on a low-scrutiny Defender), burst
  FAITHFUL (burstCast-keyed, FB-exempt, one instance). Pre-registered three flags the driver
  absorbed: the B1-starvation fixture trap (empirically refuted — anchor casts 4x in the main
  fixture), the lastBullet cadence must derive from base stats, not an invented interval (the
  driver keys on engine reload events), and burstCast-nonnegativity before discrimination
  (sanity assert). One dispatch, first try, ~1 min.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently chose a DIFFERENT
  fixture (controlComp('anchor', true) = liter/crown/anchor/helm) and a different discrimination
  style (total-based: the fullBurstEnter-keyed nuke takes the +50% FB major so its total is
  strictly higher even where instance counts tie; a ×2/×½ scaling pair isolates the burst
  instance with a non-vacuity guard; a +25.6 attackDamagePct sensitivity probe proves the
  skill2-inertness check is a real constraint). First dispatch hit max_turns (tool-use attempt
  under disabled tools); retry succeeded. Adapted copy (mechanical only — harness import path
  re-rooted + durationShots null-tolerance; zero assertion changes) runs GREEN vs the shipped
  driver override: **16 pass / 2 skip** (the skips are the blind author's own GAP annotations
  for taunt and the anti-projectile scope).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. BYTE-IDENTICAL semantics on every
  load-bearing block: skill1 `lastBullet`/self/defPct/23.82/durationSec 5; skill2 EMPTY; burst
  `burstCast`/enemy/flatDamage/304.45 single instance. Independently refused the 25.6%
  scope-trap with the same rationale ("encoding it generically would over-credit every hit")
  and independently left noFb unset (FB-exemption is engine cast-timing, not a per-kit flag).
  Presentation-only deltas: PARSER-BASELINE banner, "slug" key, ⚑ caveats (RL cadence tuple
  unverified; taunt-boss-position assumption). One dispatch, first try.
- **S7 (kimi-code/k3, binding judge):** verdict **GO**, faithfulness **1.0**, 0 REAL-GOTCHAs,
  discriminationOk true, s5TestsVsDriverOverride GREEN. All four lines accounted (2 FAITHFUL /
  2 DOCUMENTED_GAP with verbatim carry + estimate + recipe + tier). Judge's wording: the two
  blind re-derivations "converged mechanically, not just rhetorically"; nothing must change for
  GO; simSupported may flip.

## Residual flags (owner spot-check cluster, from the judge)

1. The standing "last bullet hits" = engine `lastBullet`-at-depletion reading is
   precedent-based (anis-sparkling-summer), never popup-verified for anchor — low value at
   stake since defPct is damage-inert.
2. The burst's 304.45% live-ATK magnitude has no popup anchor (magnitudes are
   owner/measurement-gated regardless).
3. The taunt-is-positionally-inert assumption rests on the measured fixed boss range script —
   if a taunt can ever move the boss, the omission becomes damage-relevant.

## Artifacts

- Driver spec: `scripts/tests/units/anchor.test.ts` (9/9 GREEN; main fixture liter/crown/ada/anchor boss-Fire + SOLO-B1 discriminator fixture anchor/crown/ada)
- RED-phase capture: `scripts/kit-autonomy/reviews/anchor.verify.txt` (7 failed / 2 vacuous-green vs the empty skeleton)
- Override: `src/skills/overrides/anchor.json`
- S2b review: `scripts/kit-autonomy/reviews/anchor.test-review.json` (+ packet/result under `scripts/kit-autonomy/cross-family/anchor/`)
- S5 blind test: `scripts/kit-autonomy/blind/anchor.test.ts` (+ `anchor.adapted.test.ts`)
- S6 blind override: `scripts/kit-autonomy/blind/anchor.override.json`
- Judge result: `scripts/kit-autonomy/results/anchor.json` (+ `cross-family/anchor/s7-packet.md`)
