# Manual review — elegg (Elegg)

**Gauntlet date:** 2026-08-02
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate `requiresTargetStatus` on S2a; NA round-counts `hitCount` 100/60; scoped team buff `distributedDamagePct`; battle-start gauge fill `fillGauge`; meta-defining BOOM Install status)

> Slug disambiguation: `elegg` IS the base MG/Electric unit (data `weapon:"MG"`, `element:"Electric"`,
> `class:"Supporter"`, `burst:"II"`, manufacturer Missilis, name "Elegg"). It is explicitly NOT the
> Water variant `elegg-boom-and-shock` (a separate ghost-pool kit). Confirmed at S0 via the
> slug-disambiguation lint (the lint fires on the substring `elegg`, exit 0 — advisory only).

## Kit summary

Elegg is an Electric MG Supporter on Burst II whose whole damage kit keys off a self-inflicted enemy
status. Her burst does three things at once: it buffs the whole team's Distributed Damage by ~40% for
10s, lands a ~317%-of-ATK hit on the boss, and stamps the boss with a 10-second "BOOM Install" status
window (which also lowers boss DEF — a magnitude the sim cannot represent). While BOOM Install is up,
every 60 of her MG rounds that land grant all allies a flat ATK bonus scaled off her OWN attack for 5s.
Separately, every 100 MG rounds she fires off a ~159%-of-ATK distributed hit — the BOOM-Install wording
on that line only adds splash to two nearby enemies (inert against a single boss); it does NOT gate the
hit. At battle start she instantly fills the team's burst gauge once, yanking the first Full Burst to
the front of the fight. Her remaining passive (bonus damage against enemy projectiles) has no target in
this sim.

## Line-by-line

| Line                                                       | Disposition    | Notes                                                                                                                            |
| ---------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| S1a: start → vs enemy projectile ▲59.66%                   | DOCUMENTED_GAP | Out-of-domain: the sim models no enemy projectiles; inert to DPS. Verbatim in `unmodeled.skill1`; the team-damage-buff trap absent |
| S1b: 100 NA → 158.65% distributed                          | FAITHFUL       | `hitCount:100` → enemy `flatDamage 158.65` flavor `distributed`, **UNGATED** on status (the crux — see below); E1/E2 discriminate |
| S1b: "+2 surrounding if in BOOM Install"                   | DOCUMENTED_GAP | The BOOM conditional governs this SPREAD (Affects clause), inert vs the single partless boss; verbatim in `unmodeled.skill1`        |
| S2a: 60 NA on BOOM target → ATK ▲13.09% of user ATK /5s    | FAITHFUL       | `hitCount:60` + `requiresTargetStatus:"BOOM Install"` → allies `casterAtkPct 13.09 /5s` (gate IS in the activation clause); E3/E6  |
| S2b: stage target appears → fill Burst Gauge 100%, once    | FAITHFUL       | `passive` → allies `fillGauge 100` (battle-start, once); the kit's biggest board lever; asserted behaviorally (earlier first cast) |
| Burst: allies Distributed Damage dealt ▲39.74% /10s        | FAITHFUL       | `burstCast` (own casts) → allies `distributedDamagePct 39.74 /10s`; E4 proves it live+scoped (mult.distributed 1.3974 in / 1.0 out) |
| Burst: enemy 316.66% of final ATK as Burst Skill damage    | FAITHFUL       | `burstCast` → enemy `flatDamage 316.66`; FB-exempt by cast timing (cast resolves before the FB window — no +50% major); E5         |
| Burst: BOOM Install status window, 10s                     | FAITHFUL       | `burstCast` → enemy `targetStatus "BOOM Install" /10s`; the name-keyed gate S2a reads; E6 proves deletion zeroes S2a only          |
| Burst: DEF ▼35.64% for 10s                                 | DOCUMENTED_GAP | No enemy-DEF StatKey (defPct is self-scoped/inert; bossDef≈0 at scope lock). Deliberately NOT `damageTakenPct` (×1.3564 over-credit) |

## The crux — skill1 gate reading (ruled UNGATED)

S1b ("after landing 100 normal attack(s). Affects the target and 2 surrounding enemy unit(s) **if the
target is in BOOM Install**") and S2a ("after landing 60 normal attacks **on a target in BOOM Install
status**") phrase their BOOM conditionals differently. The driver reads the S1b conditional as sitting
in the **Affects clause** (it widens the target set to +2 surrounding enemies — inert vs one boss), so
the 158.65% proc fires every 100 NA **ungated**; whereas S2a puts its gate in the **activation clause**,
so S2a is dead outside the BOOM windows. Three of four independent readers converged on UNGATED (driver,
S2b reviewer, S5 blind test-writer); the S6 blind override-writer was the lone dissent (gated), and
itself flagged that reading as an unmeasured ⚑ with the alternate stated. The binding S7 judge ruled
UNGATED correct on the structural ground that NIKKE kit prose is rigid about the Affects-vs-Activation
distinction, and classified S6's gated encoding as a RECON_ERROR. The reading is load-bearing: S2d
measured the wrong-gate cost at ~7.5% team total (the ~22 out-of-window procs).

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived the
  same 7-line load-bearing set + the sole-B2 fixture concern, and independently caught BOTH the S1b
  gate misread ("the clause sits in the AFFECTS clause and widens the target set") AND the
  DEF▼→`damageTakenPct` trap. CONVERGED.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 9 kit lines from
  the prose, including the S1b-ungated discriminator (`dmg(S1_STATUS_GATED) < dmg(BASE)`), the
  sentinel-attributed `casterAtkPct` flat grant, the FB-exempt nuke probe, and the distributed-scoping
  inertness checks. As written it used `controlComp`, which fields crown (a second Burst II) — so elegg
  never won the B2 slot and never cast, making every burst/S2a counterfactual vacuous (10 fail / 5 pass
  / 2 skip). This is an **S5-side fixture defect** (the sole-B2 hazard S2b had predicted), classified
  RECON_ERROR, not a driver divergence. After adapting ONLY the fixture to a sole-B2 comp
  (`blind/elegg.adapted.test.ts`, assertions preserved verbatim): **15 pass / 2 skip** (the two
  documented GAP skips) — every non-skipped blind assertion GREEN vs the driver override.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on 6 of 7 load-bearing lines
  (S2a gated `casterAtkPct`, `fillGauge` once, `distributedDamagePct` scoped, 316.66 FB-exempt nuke,
  BOOM Install `targetStatus`, and both GAPs — independently refusing the `damageTakenPct` substitution).
  Diverges ONLY on the S1b gate (gated via `requiresTargetStatus`), self-flagged ⚑ UNMEASURED → ruled
  RECON_ERROR by S7. Other differences are cosmetic (burst block split, `maxStacks:1`, unmodeled verbosity).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, convergence
  GREEN, zero gotchas.** All 9 lines accounted (7 FAITHFUL + 2 DOCUMENTED_GAP). Ruled the S1b gate
  UNGATED for the driver; classified the S6 gated reading and the S5 fixture bug as RECON_ERRORs.
  Confirmed the distributed buff is modeled-and-working (in/out-window discrimination), the nuke is
  FB-exempt, and the cross-slot BOOM coupling is tested in both suites.

## Residual flags for owner

1. **S1b UNGATED gate — prose-structural, footage-unconfirmed (the one residual worth a real-fight
   glance).** The ruling is structurally strong (two differently-phrased conditionals in one kit, triply
   converged) but is still a prose inference never confirmed against footage. A single popup read of an
   S1b distributed proc landing BEFORE Elegg's first burst cast would settle it empirically. Materiality
   if wrong: ~7.5% team total (S2d).
2. **⚑1 MG cadence tuple (MEASUREMENT-GATED, mandatory).** `pullsPerSec` / `reloadFrames 171` are
   datamine-unverified; they drive the S1b/S2a `hitCount` crossing cadence and thus proc counts. Recipe:
   read rounds/min + reload gap from an Elegg focus video (ammo-counter read).
3. **⚑2 S2a hitCount accrual phasing (low).** The engine accrues the 60-counter always with a fire-time
   gate, vs the literal window-scoped-accrual reading; proc COUNT differs but each fired proc is the exact
   kit coefficient.
4. **Documented schema GAPs (near-inert at scope lock).** S1a anti-projectile (no enemy projectiles) and
   the burst DEF▼35.64% magnitude (no enemy-DEF StatKey; bossDef≈0) are recorded verbatim in `unmodeled`,
   deliberately NOT encoded as `damageTakenPct`. The DEF term is worth ≤0.12% board shift at scope lock.
5. **Gauge fill not event-asserted.** The gauge pipeline emits no event, so S2b is asserted behaviorally
   (strictly-earlier first burstCast with the fill than without), not via a gauge-jump event.
