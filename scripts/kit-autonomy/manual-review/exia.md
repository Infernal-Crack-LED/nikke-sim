# Manual review — exia (Exia (Treasure))

**Gauntlet date:** 2026-07-27
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (resource-pool stack counter `hackingCode`; `resourceGate` status/max-stack gates; scoped `alliesOfElement` buff; conditional burst riders)

> Slug disambiguation: `exia` IS the Treasure variant (data `treasure:true`, name "Exia (Treasure)",
> SR/Electric/Supporter/Burst I). The datamined `skill1_detail`/`skill2_detail` templates in
> `role.skillDetails` are the UNTREASURED base kit and disagree with the top-level treasure prose on
> trigger/value/duration (base S2: last-bullet trigger, 16.8%, 15s; treasure S2: full-charge trigger,
> 28% self stacks + a 5.8%-of-caster Electric-ally share) — the same favorite-item sync shape as helm.
> Ground truth = the top-level prose.

## Kit summary

Exia (Treasure) is an Electric sniper Supporter on Burst I (20s). Every full-charge pull builds one
Collect Hacking Code stack (to 5); each stack raises her own ATK by 28% (live ramp: +0% on pull 1 to
+140% on pull 6, then held). When her magazine's last round lands while she holds a code, all Electric
Code allies — herself included — gain ATK equal to 5.8% of HER ATK per stack (to 5, 15s). On entering
any Full Burst her reload speed is fixed at +95% for 10s. Her last bullet also debuffs the target's
ATK and DEF by 13.77% for 5s (both gated on holding a code) — both inert in this sim (the boss deals
no damage and the basis is DEF=0) and recorded verbatim as unmodeled. Her burst hits the
highest-final-DEF enemies for 122.32% of final ATK with a 2.71% DEF shred (also inert/unmodeled), and
when cast at MAX code stacks it lands a second 122.32% hit and makes the targets take +18.04% damage
from the whole team for 10s.

## Line-by-line

| Line                                                                 | Disposition    | Notes                                                                                                                            |
| -------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| S1: lastBullet (code-held) → target ATK ▼ 13.77%/5s                  | DOCUMENTED_GAP | Verbatim in `unmodeled`: no enemy-ATK▼ channel — boss deals no damage; engine drops enemy ATK▼/DEF▼ at dispatch (DEF=0 basis)    |
| S1: lastBullet (code-held) → target DEF ▼ 13.77%/5s                  | DOCUMENTED_GAP | Verbatim in `unmodeled`: enemy DEF▼ dropped at dispatch on the DEF=0 basis; re-arms automatically if a DEF basis is ever modeled |
| S1: fullBurstEnter → self reloadSpeedPct 95/10s                      | FAITHFUL       | One application per FB start (count == fullBurstStart count); load-bearing (fewer shots with it removed); ⚑ "fixed" clamp inert  |
| S2: full charge → self Collect Hacking Code ATK ▲28% ×5, 5s          | FAITHFUL       | Resource pool [0..5] +1/shotFired + passive `perResource` atkPct; ramp pinned behaviourally (2.4× shot-6/shot-1 ratio, plateau)  |
| S2: lastBullet (code-held) → Electric allies casterAtkPct 5.8 ×5/15s | FAITHFUL       | `alliesOfElement:Electric` self-inclusive; `resourceGate{min:1}`; flat-resolved value (0.058×staticAtk) pinned; cap 5 reached    |
| Burst: burstCast → enemy flatDamage 122.32%                          | FAITHFUL       | "10 highest-final-DEF enemies" collapses to the single boss; FB-exempt (cast precedes the window)                                |
| Burst: DEF ▼ 2.71%/5s                                                | DOCUMENTED_GAP | Verbatim in `unmodeled`: same missing enemy-DEF▼ channel as S1                                                                   |
| Burst: max stacks → enemy flatDamage 122.32% (additional)            | FAITHFUL       | `resourceGate{min:5}`; fixture proves the gate: opener casts at 4.37s PRE-max (1 hit), every later cast lands 2                  |
| Burst: max stacks → enemy damageTakenPct 18.04/10s                   | FAITHFUL       | Same gate (same ■ block); boss-held (null target); load-bearing — team total drops with it removed                               |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on all six
  enactable lines (triggers: fullBurstEnter / full-charge / lastBullet / burstCast; Electric-only
  scope; max-stack gating). Reviewer listed the DEF▼ lines as load-bearing (game-semantically
  correct) — reconciled to DOCUMENTED_GAP: the lever is real in game but unenactable at the DEF=0
  basis (no enemy-DEF▼ channel; sim.ts drops them at dispatch). Reviewer also caught a real test
  bug: `casterAtkPct` flat-resolves at apply time, so the emitted value is 0.058×staticAtk, not
  5.8 — assertion fixed before S2d.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 9 kit lines
  (incl. the max-stack gate, the Electric-only scope, the FB-exempt burst). Out-of-box vs the driver
  override: 7 pass / 13 fail / 2 skip. **All 13 failures are blind-side artifacts** (judge-confirmed):
  2 engine-channel (demanding buffApply events the enemy-debuff path never emits under ANY encoding —
  the blind's own 2 skips corroborate), 2 encoding-shape (blind models CHC as an atkPct maxStacks-5
  buff; driver uses a resource pool + perResource — semantically identical, different event shape),
  3 no-op counterfactuals (blind patches mutate `ov[slot].blocks`, but slots are flat arrays, so the
  patch never reaches the engine), 4 fixture contamination (no caster filter: liter's reloadSpeedPct,
  crown's casterAtkPct 64.51, helm's durationShots all leak into the assertions), 2 two-B1 fixture
  dynamics (liter contests the B1 slot: exia's casts halve, and her opener lands post-max so the
  gate-closure the blind hunts for cannot appear — the driver fixture, exia sole B1, exposes it).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on triggers, the
  Electric-only scope, the CHC stack mechanic, the FB-entry reload, and the unmodeled enemy-debuff
  dispositions (identical reasoning). Diverges where the DRIVER is right: S6 shipped the burst rider
  and Damage Taken UNGATED, while the prose gates the whole second ■ block on "Collect Hacking Code
  at max stacks" — the judge ruled this a real divergence in the driver's favour.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  All 9 lines accounted (6 FAITHFUL + 3 DOCUMENTED_GAP), zero silent drops. Judge independently
  verified every one of the 13 blind reds as a blind-side artifact (accepting the driver's
  classification in full), reconciled S2b's DEF▼ load-bearing call to DOCUMENTED_GAP, and flagged
  the S6 ungated-rider divergence as running in the driver's favour.

## Residual flags (owner spot-check cluster)

- **Stack-duration semantics ⚑** — the engine refreshes the whole buffer on re-application, so CHC
  caps at 5 in sustained fire; if the game runs independent per-stack timers the real steady state
  is ~2 stacks (a ~−11% ATK delta on exia herself, and her ally share at ~2 stacks). Board A/B
  against an exia recording is the outer check.
- **"Reload speed FIXED at 95%" ⚑** — encoded as an additive `reloadSpeedPct` buff; the clamp
  ("fixed") semantics need a stat-clamp primitive the engine lacks (engine-modeling-gaps §1b).
  Identical to the clamp on any team without a second reload buffer.
- **shotFired-as-full-charge ⚑** — "landing an attack with Full Charge" read as `shotFired` (every
  SR pull is one full charge — helm/liberalio precedent); verify against an exia focus video.
- **Enemy ATK▼/DEF▼ (13.77/13.77/2.71)** — game-real, unenactable at DEF=0; carried verbatim in
  `unmodeled` so a future DEF basis re-arms them without re-reading the kit.
- **10-target selection** — "the 10 enemy unit(s) with the highest final DEF" is out of domain for
  the single-target sim; collapses to the boss.
