# Manual review — himeno (Himeno)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped buffs ×2 — weapon-scoped S2 pool + single-target highest-final-ATK burst grant; `burstCast`-vs-`fullBurstEnter` keying; interval duty cycle)

> Slug disambiguation: `himeno` is the BASE unit (Himeno, SR/Wind/Supporter/Burst II, Abnormal,
> released 2023-02-22). No variant exists today; the slug-disambiguation lint ran clean on the
> full variant description at dispatch. SR-RARITY unit (original_rare SR) → the spec fixtures run
> her at the reachable ceiling (`unitLimits {stars:3, core:0}`, belorta precedent), not the
> SSR-encoded scope-lock ceiling.

## Kit summary

Himeno is a Wind Supporter sniper on Burst II whose entire kit is team support — she has zero
damage lines of her own. Skill 1 ("Weak Spot Attack") would shave the target's DEF by 6.94% for
3s on every full-charge hit, but the engine has no enemy-DEF channel (enemy debuffs other than
damageTakenPct/distributedDamagePct are dropped at dispatch; boss DEF is a flat constant no
debuff scales), so the line is recorded verbatim as a documented engine gap, pinned against
damageTakenPct-laundering. Skill 2 ("Invisible Hand") fires on her datamined 20s cooldown
(interval trigger, first fire t=20s) and grants every sniper-rifle ally — herself included —
ATK ▲10.98% and +2 max ammunition for 10s: a 50% duty-cycle double buff. The +2 is a FLAT round
count (`maxAmmoFlat`, the theme-14 primitive): in-window SR magazines refill to exactly 8 rounds;
the nearest-wrong percent reading (`maxAmmoPct` 2 → round(6×1.02) = 6) never extends a magazine.
Her burst ("Ghost") keys to HER OWN cast (`burstCast`, never `fullBurstEnter`) and grants the
single ally with the highest FINAL ATK — never herself (datamined `ExcludeSelf`; the prose omits
the clause) — Charge Damage ▲23.76% and Critical Rate ▲16.35% for 10s. The charge half is
recipient-gated: it only moves damage for a carrier that deals charge-bucket hits (inert-on-a-
non-charge-carrier is faithful, not an encoding gap); the crit half is GENERIC (plain
"Critical Rate" — the inverse of the helm `critRateNormalPct` trap).

## Line-by-line

| Line                                                        | Disposition    | Notes                                                                                                                                        |
| ----------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: full-charge hit → target DEF ▼6.94% for 3s              | DOCUMENTED_GAP | No enemy-DEF channel: sim.ts consumes enemyBuffs through damageTakenPct/distributedDamagePct ONLY; cfg.bossDef is a flat constant. Verbatim in `unmodeled.skill1`; zero-boss-debuff pin + laundering counterfactual (a damageTakenPct 6.94 launder emits boss debuffs AND lifts team totals — shipped does neither). In game ≈ small team lift at near-continuous SR uptime; on the constant-bossDef basis the payload is worth 0 |
| S2: interval:20 → SR allies atkPct 10.98/10s                | FAITHFUL       | CD-driven skill, no activation clause → interval:20 (poli precedent; 20s = datamined skillCooldownsSec.skill2, pinned via apply-frame spacing: first at t=20s, period 1200f). Scope `alliesOfWeapon SR` with NO excludeSelf (she is an SR and the kit never says "except self") — discriminated 2-of-4 in fixture A (liter SMG / ada RL excluded). Passive-always-on and all-allies counterfactuals both RED |
| S2: interval:20 → SR allies maxAmmoFlat 2/10s               | FAITHFUL       | Same block; FLAT rounds (theme-14), not a round-count duration — the S2b-flagged "most damaging misread" (`durationShots:2`) is excluded by the wall-clock expiry pin. Functional: an in-window refill loads exactly 6+2 rounds (first-shot ammoAfter 7); `maxAmmoPct` 2 computes round(6×1.02)=6 → never extends (byte-identical totals to the removed run). liter's own maxAmmoPct 45.17/5s grant extends some magazines in EVERY variant — contamination controlled via the ammoAfter-7 observable |
| Burst: burstCast → top-1 final-ATK ally chargeDamagePct 23.76/10s | FAITHFUL | `alliesTopAtk{1, excludeSelf, byFinalAtk}` — "highest FINAL ATK" is kit-literal (live ranking); ExcludeSelf is datamined (ulti `prefer_target_condition`), pinned at the encoding level (both bases rank the same top candidate in the fixtures). Keyed to HER casts: applications land on her cast frames, never on FB-start frames (two-B2 fixture where delta leads the cycles). Functional: recipient's charge mult lifts by exactly +0.2376 (2.5 → 2.7376, ratio 1.09504) on a charge-weapon recipient (ada's RL is a charge weapon) |
| Burst: same target critRatePct 16.35/10s                    | FAITHFUL       | GENERIC critRatePct (plain "Critical Rate", no normal-attacks scoping — inverse helm trap; zero critRateNormalPct events pinned). Rides the same single target frame-by-frame; recipient's crit rate moves by exactly +0.1635 in-window and reverts out of it |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 5 lines marked
  load-bearing. CONVERGED on 4 FAITHFUL encodings (interval CD trigger for the clause-less S2,
  SR-only scope including self, flat-round ammo parse, burstCast keying, byFinalAtk, generic
  crit). Marked S1 GAP **with an explicit upgrade condition and contingency**: "if the engine
  truly has no consumer the line belongs in unmodeled with the gap surfaced, not silently
  dropped." The driver verified the condition false directly in sim.ts (enemyBuffs consumed only
  via damageTakenPct/distributedDamagePct; bossDef a flat constant) and reconciled to
  UNMODELED-verbatim per the contingency. The reviewer also independently named the
  burstCast-vs-fullBurstEnter discrimination ("a comp where [the other B2] bursts instead is
  exactly the fixture that separates them"), the controlComp B2 fixture hazard, the
  durationShots:2 misparse as "the single most damaging plausible error on this kit", and the
  datamined-CD-as-input flag.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the full spec,
  including the flat-vs-percent ammo split, the single-recipient burst, the additive-not-
  multiplier charge stat, and the generic crit — and skipped the S1 enactment as a GAP with the
  same reasoning ("no engine primitive for enemy DEF reduction"). As-written it was not runnable:
  four documented driver adaptations (`blind/himeno.adapted.test.ts`, raw kept verbatim):
  (a) `onEvent` moved into `cfg` (harness plumbing — the raw draft captured zero events);
  (b) fixture slot order himeno/liter/crown/helm so himeno wins the leftmost-B2 tie-break and
  actually casts (in controlComp's order crown cast every rotation and all burst assertions were
  vacuous — the exact fixture hazard S2b pre-registered); (c) `buffApply` targetIdx→targetSlug
  mapping + `durationShots` null→undefined normalization; (d) two ammo-total assertions adapted
  from direction pins to MOVE pins — deterministic FB-phase re-alignment outweighs the tempo gain
  (flat-2 moves her total DOWN 1.2%), while `ammoAsPct` is byte-identical to no-ammo, proving the
  pct reading is the inert one. Adapted result: **GREEN — 23 passed / 2 skipped / 0 failed** vs
  the driver override (the 2 skips are the blind author's own S1-GAP and CD-cadence-flag items).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. CONVERGENCE: `alliesOfWeapon SR`
  with no excludeSelf; `atkPct 10.98` + `maxAmmoFlat 2` (the flat parse converged BLIND) in one
  block, both 10s; `burstCast`-keyed `alliesTopAtk{1, byFinalAtk:true}` with `chargeDamagePct
  23.76` + `critRatePct 16.35`, both 10s. DIVERGENCES — all three information-asymmetric, all
  flagged: (1) S1 encoded as an enemy-targeted `defPct -6.94` block that the engine drops at
  dispatch (board-inert — its own S5 test pins board-inertness; same observable board as the
  driver's verbatim-unmodeled record, different bookkeeping); (2) `interval sec:10` — the prose
  carries NO cooldown; the blind author flagged it as the dominant ⚑ ("chose sec:10 for
  continuous cover rather than invent a datamined cooldown I was not given; realistic
  alternative (a) a longer skill cooldown → duty cycle below 100%") — the driver's sec:20 is the
  datamined skillCooldownsSec.skill2; (3) `excludeSelf` omitted because the prose omits the
  clause — the driver's true is the datamined `prefer_target_condition: ExcludeSelf`.
- **S7 (kimi-code/k3, binding reconciling judge):** verdict **GO**, faithfulness **1.0**,
  `gotchas: []`, `discriminationOk: true`. All five lines FAITHFUL or DOCUMENTED_GAP; the three
  S6 divergences ruled "pure information asymmetry resolved in the driver's favor by ground
  truth"; every nearest-wrong model named by S2b (passive-always-on, all-allies scope ×2,
  maxAmmoPct-2, durationShots, chargeDamageMultPct, critRateNormalPct, fullBurstEnter keying,
  damageTakenPct laundering) confirmed failing under the shipped tests. Judge's spot-check
  recipe for the owner: one focused recording — watch an SR ally's ammo counter flip 6→8 and
  timestamp the flips against FB banners; that pins S2 trigger identity, phase, and duty cycle
  in a single video.

## Residual flags (measurement-gated / engine-native conventions)

1. **S2 interval phase** — first fire at t=CD is the engine-native interval convention, matching
   in-game CD skills (first cast on cooldown completion); unmeasured. The judge's ammo-counter
   recording above pins it.
2. **Burst ExcludeSelf** — datamined (`prefer_target_condition`), prose-silent; if footage ever
   showed a self-grant this flips, but the datamine is the ground truth per the schema's
   alliesTopAtk convention.
3. **byFinalAtk live re-ranking** — the single target is re-ranked LIVE at each cast; the
   fixtures rank the same top candidate on both bases, so the live-vs-static distinction is
   pinned only at the encoding level.
4. **S1 DEF▼ payload** — game-real, worth 0 on the constant-bossDef sim basis; if a future
   debuff-scalable boss-DEF channel lands, the line enacts as an enemy debuff (NEVER as
   damageTakenPct — the laundering counterfactual is pinned).

## Artifacts

- Driver: `scripts/tests/units/himeno.test.ts` (20/20 green) · `src/skills/overrides/himeno.json`
- Cross-family: `scripts/kit-autonomy/reviews/himeno.test-review.json` (S2b) ·
  `scripts/kit-autonomy/blind/himeno.test.ts` + `himeno.adapted.test.ts` (S5) ·
  `scripts/kit-autonomy/blind/himeno.override.json` (S6) ·
  `scripts/kit-autonomy/results/himeno.json` (S7 binding verdict) ·
  `scripts/kit-autonomy/cross-family/himeno/*.json` (raw dispatch results)
