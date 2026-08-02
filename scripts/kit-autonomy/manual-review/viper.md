# Manual review — viper (Viper (Treasure))

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0 (10/10 kit lines: 8 FAITHFUL + 2 DOCUMENTED_GAP)
**Tier:** 2 (`reenterStage` meta-defining B2 re-entry; FB-gated scoped stacks `fbGate`+`maxStacks`; treasure-prose value resolution; Vamp-status gate)

> Slug disambiguation: `viper` IS the Treasure variant (data `treasure:true`, name "Viper (Treasure)",
> SG/Water/Attacker/Burst II). It is distinct from base Viper — the burst nuke uses the TREASURE prose
> value 1029.6%, NOT the datamine base-table 462.85% (the same prose-vs-base split as helm/phantom;
> DECISIONS 2026-07-17 roster-wide treasure ruling).

## Kit summary

Viper (Treasure) is a Water SG Attacker on Burst II whose identity is **Burst-II re-entry**: when she
uses her burst the chain re-opens Burst Stage 2, so a SECOND Burst-II ally also casts in the same
rotation (the Tia/Anis:Star `reenterStage` mechanic) — this is what lets her fire her burst every
rotation alongside another B2. At battle start she gives the whole team a 10-second ATK (+25.98%) and
Hit Rate (+11.13%) window (the "stage target appears" trigger collapses to a once-at-setup passive —
the boss is present from t=0; it lapses at 10s and never refires). On entering Full Burst she gains
Vamp status (untargetable by single-target attacks, removed on a direct hit, plus 1s invulnerable) —
a defensive line with no damage-side term in v1; only its OFFENSIVE consequence (the Vamp gate) is
modeled. While attacking in Vamp she builds self-stacking Sustained Damage (+4.4%) and Hit Rate
(+1.84%) buffs, each up to 10 stacks over 10s. Her burst deals a 1029.6%-of-final-ATK nuke to one
enemy (B2 cast lands BEFORE Full Burst opens → FB-exempt, plain flavor), and applies a
105.3%-of-ATK-per-second **sustained** DoT for 10s — the DoT being exactly what her Sustained Damage
stacks amplify (the load-bearing coupling). She also carries a permanent self Hit Rate +21.96% passive.
The burst's "DEF ▼19.83% for 10s" line is inert and unenactable (see below).

## Line-by-line

| Line                                                   | Disposition    | Notes                                                                                                                                                                                                      |
| ------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: stage target → allies ATK ▲25.98% / HR ▲11.13% 10s | FAITHFUL       | Battle-start passive → all allies, `durationSec:10`, lapses, never refires; boss present from t=0 so the single-application read is faithful                                                               |
| S1: in Vamp → self Sustained Dmg ▲4.4% ×10 10s         | FAITHFUL       | `shotFired` → self `sustainedDamagePct 4.4 maxStacks10 dur10`, `fbGate:'inFb'`; sole consumer is the sustained burst DoT (sim.ts:1688); ⚑1 documents the Vamp-permanence residual                          |
| S1: in Vamp → self Hit Rate ▲1.84% ×10 10s             | FAITHFUL       | Same gated stacker; rides to cap each FB window; core-hit yield is derived (⚑2)                                                                                                                            |
| S2: self Hit Rate ▲21.96% continuously                 | FAITHFUL       | Passive → self `hitRatePct 21.96`, no expiry (`expiresFrame null`); removal test proves it is a distinct live line from the S1 grants                                                                      |
| S2: FB entry → Vamp + Invulnerable 1s                  | DOCUMENTED_GAP | Defensive — no HP pool / targeting model / boss damage in v1; verbatim in `unmodeled.skill2`; only its offensive gate (S1b) is modeled                                                                     |
| S2: using Burst → allies Re-enters Burst Stage 2       | FAITHFUL       | `burstCast` → allies `reenterStage stage 2` (META-DEFINING); probe: viper B2 f251 → crown B2 f281 (STAGE_CAST_GAP 30f) → helm B3 f311                                                                      |
| Burst: 1 enemy 1029.6% of final ATK                    | FAITHFUL       | `burstCast` → enemy `flatDamage 1029.6`, PLAIN flavor (no S1b double-dip), FB-exempt (`fbMajorApplied=false`); TREASURE prose, base 462.85 pinned as nearest-wrong                                         |
| Burst: DEF ▼19.83% 10s (stage target)                  | DOCUMENTED_GAP | INERT + UNENACTABLE: `cfg.bossDef` is a fixed config constant (sim.ts:1719), no debuff channel; ~0.01% at scope lock; explicitly NOT `damageTakenPct`; phantom/guilty/marciana precedent                   |
| Burst: 105.3% sustained every 1s for 10s               | FAITHFUL       | `burstCast` → enemy `dot 105.3 dur10 int1 flavor sustained`; exactly 10 ticks/cast; sustained-flavored so it is the sole S1b-stack consumer; stage-target condition collapses to always-true (single boss) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently re-derived the
  same 9-line load-bearing set + the nearest-wrong traps (sustained-flavor coupling, reentry invisible
  in single-B2 comps, nuke-not-sustained, Vamp gating, DEF▼-as-`damageTakenPct`). CONVERGED. Two
  divergences adjudicated vs ground truth: (1) DEF▼ held INERT/UNMODELED over the reviewer's
  "load-bearing boss debuff" framing (sim.ts:1719 `cfg.bossDef` fixed const, no debuff channel; SSOT
  negligible ~0.01%; reviewer agreed `damageTakenPct` is wrong); (2) Vamp gate held `fbGate:'inFb'`
  (no engine primitive for permanent-after-first-FB; S4 forbids engine edit; load-bearing sustained-DoT
  coupling fully captured; between-FB HR refresh refined to ⚑1 <~1%).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all kit lines. RAW vs
  driver override: 10 pass / 10 fail / 5 skip — but the blind's fixture put crown LEFT of viper, so
  viper cast 0 (crown wins the B2 tie), vacuating every burst claim. ADAPTED (`blind/viper.adapted.test.ts`,
  viper leftmost B2 = correct re-entry fixture): **15 pass / 5 fail / 5 skip.** The 15 passes include
  EVERY encoding-identity assertion (battle-start team ATK/HR window, self stacks capped + gated pre-FB,
  S2a permanent-self-no-expiry, `reenterStage2` on own burstCast + adds-casts, nuke 1029.6 pre-FB
  FB-exempt, DoT 105.3 sustained 10s, sustained-scoped-not-generic). The 5 fails: (a) Vamp-persists-after-FB
  = reconciled ⚑1; (b,c) DEF▼ boss-debuff ×2 = reconciled inert (sim.ts:1719); (d,e) S1b/S2a "moves NO
  teammate" `relDiff<1e-9` byte-identical tolerance catches a ~0.07% multi-unit coupling artifact — driver
  probe proves both LOAD-BEARING (S2a −7.2%, S1b −5.2%) and self-scoped (`targetIdx`). No driver infidelity.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges **byte-for-byte** on every
  load-bearing line (battle-start team window, `fbGate`-gated self stacks, continuous self HR,
  `burstCast reenterStage 2`, treasure-value 1029.6 nuke, sustained 105.3 DoT). Only diff: the cosmetic
  inert-encoding style of DEF▼19.83% (blind modeled it as inert-visible enemy `defPct`, guilty-style —
  both agree it is inert; neither uses `damageTakenPct`). Flags: passive+`durationSec` battle-start
  (same as driver); Vamp/invulnerable/stage-target gaps skipped.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0 (10/10), discriminationOk:true, gotchas:[].**
  Judge independently ruled BOTH contested dispositions to the DRIVER on ground truth: DEF▼ unenactable
  (sim.ts:1719, no enemy-DEF debuff channel) + negligible (~0.01%) + phantom/guilty/marciana precedent;
  and `fbGate:'inFb'` is the closest available Vamp primitive with the load-bearing sustained-DoT coupling
  fully captured and the <~1% between-FB hit-rate residual declared as ⚑1 with a recipe. The S6 blind
  override converges byte-for-byte on every load-bearing line. All 10 lines accounted (8 FAITHFUL + 2
  DOCUMENTED_GAP), zero silent drops.

## Residual flags for owner

1. **⚑1 — Vamp permanence (low, derived).** The kit's Vamp is granted on FB entry and "removed upon
   taking a direct hit"; v1 has no boss damage, so once granted it is PERMANENT for the rest of the
   fight. Strictly, S1b stacks should accrue on every shot after the first FB, not only inside FB
   windows. The engine has no "permanent-after-first-FB" block gate (`fbGate` is inFb/outFb only; S4
   forbids an engine change here), so `fbGate:'inFb'` is the closest available primitive. It is faithful
   where it matters: the LOAD-BEARING coupling — `sustainedDamagePct` boosting the sustained burst DoT —
   is fully captured (the DoT's 10s post-cast window lies inside FB + the stacks' own 10s persistence;
   probe: FB DoT tick damage drops when S1b is removed). What it conservatively UNDER-credits is the
   1.84%×10 hit-rate stack refresh on NORMAL attacks during the ~10s between-FB gap after the buff
   persistence lapses — a second-order effect routing through the derived `hrCoreMult` (⚑2).
   **Estimate:** <~1% of total. **Recipe:** a focus video reading Vamp-icon uptime (expected ~100% after
   first FB) and the between-FB SG core-hit fraction; a "permanent-after-first-FB" block gate would enact
   it exactly. The ungated alternative (stacks from t=0) was rejected — it over-credits the pre-first-FB
   opening (no Vamp yet), the opposite error.
2. **⚑2 — Hit Rate core yield (derived).** The three hitRate lines (11.13 team / 21.96 self / 1.84×10
   self) are kit-stated magnitudes, but their damage YIELD flows through sim.ts `hrCoreMult` — a DERIVED
   reticle-shrink → core-fraction estimate (LIVE by default, `HRCORE=0` disables), not a measured
   per-unit number (phantom ⚑4 class). **Recipe:** a viper focus video reading the in-window SG core-hit
   fraction.
3. **⚑3 — SG cadence tuple (standard).** ammo 9 / reloadFrames 122 / hitsPerShot 10 / RoF 90 are the
   datamine (unverified for this unit); the S1b stack ramp/hold derives from this cadence. **Recipe:**
   read fire cadence + the reload gap from any focus video.
4. **Pellets-vs-pulls S1b accrual convention (moot).** Whether each SG PULL or each PELLET accrues an S1b
   stack is cadence-derived (⚑3). Behaviorally moot: the cap (10) binds inside the 10s FB window either
   way (probe: ramp f367→f806, caps in ~7s), so the end state is identical; only the ramp profile differs.
5. **Shared unmeasured convention.** All three agents share the "stage target appears = one t=0
   application" read for the S1a team window — stable and conservative (single-boss scope makes any
   transition-refire moot), but unmeasured.
6. **Reviewer prose slip (not an encoding issue).** The S2b convergence record's side-remark "DoT crit
   default OFF" contradicts the SSOT — DOT_CRIT is ON by default (SSOT 2026-07-21) and the override sets
   no crit override, so shipped behavior follows the SSOT default. The prose is wrong; the encoding is
   correct.
7. **No board reading.** Viper (Treasure) has no real-fight probe data, so it does not appear on the
   accuracy board; it stays `tier:MODEL_ONLY tuned:false` until a recorded fight validates the numbers
   (the gauntlet certifies structure/faithfulness, not magnitudes).
