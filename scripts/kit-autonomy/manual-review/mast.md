# Manual review — mast (Mast)

**Gauntlet date:** 2026-08-02
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped-buff `alliesTopAtk`/`byFinalAtk`; stack/round-count Sea Breeze mirror; `requiresTargetStatus` gate; meta-defining Storm stack-mirror DoT)

> Slug disambiguation: `mast` IS the base SMG/Electric Supporter (resource_id 350, Burst II, Elysion,
> "Pirate's Grit"/"Pirate's Sight"/"Sail Through the Tempest!"). It is distinct from
> `mast-romantic-maid` (MG/Water, aka "mrm"/"mmast"/"maids (with anchor)"). The slug-disambiguation
> lint flags the bare base name "Mast" as shared; the extract + kit prose confirm this is the SMG/Electric one.

## Kit summary

Mast is an Electric SMG Supporter on Burst II (cd 20s). Her identity is a crit-driven stack engine:
landing 2 normal-attack critical hits applies a stack of **Sea Breeze** to the boss — a DEF-reduction
debuff scaled off her own DEF (1.9% per stack, up to 50 stacks, 3s refresh). Her burst **Storm** then
*mirrors the Sea Breeze stack count* as damage: 4.52% of final ATK per stack, ticking every 1s for 7s
on any Sea-Breeze-afflicted target. Layered on top is team crit support: at battle start she grants
herself and her 2 highest-final-ATK allies +23.56% Critical Rate for 30s; while her HP is below 70%
she grants the same trio +50.94% Critical Damage continuously; and her burst gives that trio a 7s
Max HP increase (86.2% of her own Max HP, *without healing*) plus +25.19% Critical Damage for 7s.

The whole kit hangs on the Sea Breeze → Storm loop. Two mechanics the engine cannot represent
literally — a dynamic enemy-DEF-reduction debuff, and a crit-gated stack counter — are handled with
the documented steady-state conventions established by `mihara-bonding-chain` (stack-mirror DoT as
steady-state throughput) and `soda-twinkling-bunny` (scoped "self + N highest-final-ATK" targeting).

## Line-by-line

| Line                                                              | Disposition      | Notes                                                                                                                       |
| ----------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| S1: after 2 normal crits → Sea Breeze DEF▼ 1.9%-of-user-DEF, ≤50, 3s | DOCUMENTED_GAP | The DEF▼ *effect* has no engine primitive (cfg.bossDef is a fixed subtraction; `damageTakenPct` is a different bucket). ~81.7 flat DEF off the 140-DEF boss at 50 stacks ≈ 0.16% team damage — minor, not load-bearing. Verbatim in `unmodeled`. The stack *count* feeds Storm; the affliction is a passive always-present `targetStatus` gating Storm. |
| S1: HP < 70% → self+2 critDamagePct 50.94, continuously           | DOCUMENTED_GAP   | Modeled passive always-on (self + `alliesTopAtk{2,excludeSelf,byFinalAtk}`, no expiry — "continuously"). v1 has no HP pool; a squishy Supporter sits <70% from boss damage whether or not she bursts. ⚑ measurement-gated (see residuals). |
| S2: start of battle → self+2 critRatePct 23.56, 30s               | FAITHFUL         | Fused passive (live from t=0, `expiresFrame-frame = 1800`), scoped self + 2 byFinalAtk — exactly 3 of 4 units. Four-way cross-family agreement. |
| Burst: self+2 casterMaxHpPct 86.2, 7s ("without restoring HP")    | FAITHFUL (inert) | `casterMaxHpPct` → single flat `maxHpFlat` shared by all 3 targets; 7s. Offensively inert (e3 rule: ally-granted Max HP never feeds `atkOfMaxHpPct`; Mast has no self HP-scaling ATK). M4 proves byte-identical totals on removal. |
| Burst: self+2 critDamagePct 25.19, 7s                             | FAITHFUL         | `burstCast` (NOT `fullBurstEnter` — Mast is B2; FB-enter would fire on other B2s' rotations), 3 targets, exactly 7s, once per cast. |
| Burst: Storm 4.52% ATK, mirrors Sea Breeze stacks, 1s×7s, gated   | DOCUMENTED_GAP   | `burstCast` DoT, `requiresTargetStatus 'Sea Breeze'`, 7 ticks/cast, crit-eligible (DOT_CRIT default ON), never cores, burst bucket. Magnitude = 4.52% × 50-stack cap = 226%/tick (⚑ — see residuals). Gate proven load-bearing (M6: removing the status → 0 Storm ticks). |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Identified the same 6-line
  load-bearing set, the scoped `byFinalAtk` targeting, `burstCast` (not `fullBurstEnter`), and the
  Sea Breeze DEF▼ as an unmodelable GAP. **Caught a real mechanism the driver's first pass missed:**
  the HP<70% condition is *self-tripped* by the burst's un-restoring Max-HP grant (Max HP ▲86.2% with
  current HP unchanged drops her HP ratio to 1/1.862 ≈ 53.7% < 70%). The driver adopted then
  superseded this (see residuals). Also proposed a live `perResource` Storm mirror.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the kit from prose,
  including the SAME B2 fixture hazard the driver hit (crown occupies the B2 slot ahead of mast in the
  controlComp → mast casts zero bursts), solved via a `burstEligibility:3` accommodation. **Vs the
  driver override: 14 pass / 1 fail / 3 skip.** The 1 fail is a **RECON_ERROR** (the S7 judge's ruling):
  the assertion `expiresFrame < 10000` — intended to prove the 25.19 buff is a bounded 7s window, not
  permanent — is a brittle bound; the blind test's own `burstEligibility:3` accommodation fires mast's
  burst late (frame ~9873) so the window ends ~10293 > 10000. The shipped buff is exactly 420 frames
  (7s); the sibling per-burst-cadence, 3-target, and caster-scaled-MaxHP assertions all PASS. The 3
  skips are the blind writer's own acknowledged gaps (Storm per-source damage attribution; Sea Breeze
  stack tracking is unverifiable blind). Independently derived the S1 HP-gate as **passive/always-on**
  (converged with the driver's final encoding) and read the Sea Breeze steady state as ~14 stacks.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. **Byte-identical** to the driver on
  skill2 (critRate 23.56/30s passive self + `alliesTopAtk{2,excludeSelf,byFinalAtk}`), both burst buff
  blocks (Max HP 86.2 + critDamage 25.19, /7s, burstCast, self + alliesTopAtk), the Storm gate/cadence
  (`dot` durationSec 7 intervalSec 1 `requiresTargetStatus 'Sea Breeze'`), and the Sea Breeze DEF▼ GAP.
  Diverges on two measurement-gated calls: left the S1 HP<70% crit-damage **unmodeled** (conservative
  "passive = fudge"), and read the Storm steady state as **~5 stacks** (rotation-weighted base-crit) →
  22.6%/tick.
- **S7 (kimi-code/k3, reconciling judge — binding):** **GO, faithfulness 1.0, `discriminationOk:true`,
  NO REAL-GOTCHA.** Ruled skill2 / burst Max HP / burst critDamage FAITHFUL; Sea Breeze DEF▼, S1 HP<70%,
  and Storm as DOCUMENTED_GAP (every divergence documented with a ⚑ + measurement recipe; no silent
  drop). Classified the single S5 RED as RECON_ERROR (fixture artifact). Two FIDELITY-class gotchas
  (both `documentedByDriver:true`, severity med, measurement-gated — do not block GO).

## Residual flags (owner spot-check — both measurement-gated)

1. **Storm stack-mirror magnitude (~10× spread).** The driver encodes the 50-stack **cap-bind** reading
   (shared-refresh: applications land every ~0.2s, far faster than the 3s expiry, so stacks pile to the
   cap and bind; "stacks up to 50" implies the cap is reachable; stack-building is Mast's design
   identity) → 4.52% × 50 = **226%/tick**. The blind roles read turnover steady states: S5 ≈ **14**
   (per-stack 3s expiry) → 63%/tick; S6 ≈ **5** (rotation-weighted base-crit) → 22.6%/tick. The hinge is
   whether "lasts for 3 sec" refreshes the whole debuff (cap binds) or expires per stack (turnover).
   **Recipe:** Mast-focus recording — read one Storm tick popup, `stacks = tick% / 4.52%`; confirm
   early-vs-late asymmetry (first burst inside the S2 crit window vs after t=60s). Re-pin `atkPct` from
   the measured stack count. (The engine also lacks a crit-count trigger, so a live `perResource` mirror
   is not faithfully drivable today — the fixed steady-state DoT follows the mihara precedent.)
2. **S1 HP<70% crit-damage uptime.** Driver = passive always-on (real-game: a Supporter sits <70% from
   boss damage regardless of bursting; "continuously" = no expiry). S2b = burstCast-self-trigger, 7s
   window (the literal in-sim trip via the Max-HP grant). S6 = unmodeled. **Recipe:** Mast-focus
   recording in a real sustained fight — observe whether the +50.94% crit-damage buff is continuous from
   early boss damage or pulses with her burst window; settle passive vs condition-held (and latch-vs-release).

Both residuals are confined to magnitude/uptime; the kit's *structure* (gate, cadence, crit/core
routing, scoped targeting, the inert Max-HP grant) is four-way corroborated and discriminating. The S7
judge additionally notes the blind roles are all one model family (claude), so the shared-refresh
cap-bind reading and the "Supporter sits below 70% HP" intuition are exactly the comfortable priors a
Mast-focus recording should confirm before these numbers feed any board grade.
