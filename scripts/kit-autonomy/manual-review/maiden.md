# Manual review — maiden (Maiden)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (self-status gate cluster — the Revenge mechanic; `burstCast`-vs-`fullBurstEnter` lever; out-of-domain ⚑ cluster)

> Slug disambiguation: `maiden` IS the SG/Electric base unit (name "Maiden", Elysion, Burst III).
> It is distinct from `maiden-ice-rose` (RL/Electric "Maiden: Ice Rose", aka "mir"/"xmaiden").
> The S0 slug-disambiguation lint passes clean on the disambiguated full form.

## Kit summary

Maiden is an Electric shotgun Burst-III attacker (9 shells, 10 pellets each) whose kit is built
around a 'Revenge' self-status she earns by being ATTACKED 20 times — in-game her Skill 2 taunt
(10s per 30s) pulls enemy fire onto her to feed that counter. Once Revenge opens, her ATK rises
26.66% for 20s and her burst DOUBLES (an additional 457.87%-of-final-ATK hit fires on the same
targets while Revenge is active — the identical kit archetype to yulha's 'Calm', same burst
numbers). Skill 2 also grants her +152.84% Critical Damage for 10s (her biggest single damage
lever at her 15% sheet crit rate), and her burst's unconditional half deals 457.87% of final ATK
to all enemies. In the sim's scope-lock fight the boss never acts: there is no incoming-damage
model, no attacked-count trigger, and no self-status gate, so Revenge can never be earned — the
faithful encoding models the two unconditional lines and documents the entire Revenge cluster +
the taunt as UNMODELED (yulha / helm-aquamarine precedent: a gate that cannot fire on the
scope-lock basis is a faithful omission, not a fudge). Her board number therefore honestly
reflects HALF her theoretical burst.

## Line-by-line

| Line                                                          | Disposition    | Notes                                                                                                                      |
| ------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| S1: attacked 20× → Revenge: self ATK ▲26.66%/20s              | DOCUMENTED_GAP | Trigger is an incoming-attack counter; no primitive, boss never acts. Absence pinned (M3 + S5 phantom arm)                 |
| S2: taunt all enemies 10s                                     | DOCUMENTED_GAP | No aggro primitive; single partless boss already takes everyone's attacks; in-game feeds the attacked-counter (⚑1 recipe)  |
| S2: self Critical Damage ▲152.84%/10s on the datamined 30s CD | FAITHFUL       | interval:30 → self → critDamagePct 152.84/10s, first fire t=30, unscoped; 5 pins (value/scope/window/cadence/live)         |
| Burst: 457.87% of final ATK to all enemies                    | FAITHFUL       | burstCast → enemy → flatDamage 457.87; pre-FB (fbMajorApplied false), crit-eligible, one hit per own cast                  |
| Burst: +457.87% additional damage when in Revenge status      | DOCUMENTED_GAP | Gated on the untriggerable Revenge self-status; omission pinned by the one-hit-per-cast identity (M2c + S5 algebraic test) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on both
  FAITHFUL lines (self-scoped unscoped critDamagePct 152.84/10s on interval:30 with expiry — the
  reviewer independently named the passive/permanent encoding as the nearest-wrong trap; burstCast
  pre-FB 457.87 one-hit-per-own-cast with helm co-B3 as the fullBurstEnter ~2× divergence probe)
  and on the taunt omission (never a boss damageTakenPct debuff). One posture split: the reviewer
  sketched an approximated-cadence encoding for the Revenge cluster under an explicit ⚑ while
  conceding the trigger cadence is "outside the input domain" and "the prose gives no attack rate"
  — resolved to faithful omission per measured>fudge + the landed yulha precedent. No REAL-GOTCHA.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same
  dispositions from kit prose alone; its load-bearing algebraic identity
  (base−burstZero ≡ burstDup−base ⇒ exactly one burst hit per cast) plus the zero-atkPct-26.66
  assertion pin the Revenge omissions from the positive side. Materialized with two driver
  adaptations (blind onEvent wiring assumed a cfg object `controlComp` does not provide; the
  no-invented-mechanics probe was restricted to maiden-cast buffs after it caught liter's
  legitimate maxAmmoPct kit line): **12 pass / 2 deliberate GAP skips / 0 fail vs the driver
  override**.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. skill2 and burst line 1 are
  byte-equivalent to the driver (interval:30 / self / 152.84 / 10s; burstCast / enemy / 457.87 —
  S6's explicit `crit:true` equals the engine default), and the taunt disposition converges
  (verbatim-unmodeled, noted as the attacked-counter's in-game feed). Diverges ONLY on the
  Revenge-cluster posture: implements S1 as an interval:20 approximation + the rider ungated
  (assumed ~100% uptime), explicitly flagged by the blind as an invented cadence. That flagged
  branch is the one the judge rejected.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas
  [].** All 5 lines accounted (2 FAITHFUL + 3 DOCUMENTED_GAP, zero silent drops). The judge ruled
  the S6-vs-driver divergence "a posture question on lines outside the sim's input domain …
  resolved for the driver's faithful omission by measured>fudge and the landed yulha precedent —
  S6's own flags concede its cadence is invented," and verified each omission is actively pinned
  (not a silent drop).

## Residual flags for owner

1. **Revenge-omission posture (meta-defining, ⚑1 — out-of-domain, Tier 2).** Her board reading
   reflects HALF her theoretical burst (no +457.87% rider) and no S1 ATK buff. In real fights her
   taunt feeds the attacked-counter, so Revenge uptime is high — if the owner ever wants the
   optimistic reading it must come from a MEASURED Revenge uptime (boss attack cadence × her taunt
   share), never from S6's assumed 100%. Recipe: an incoming-damage / attacked-count trigger
   primitive + a self-status gate (engine-core), then popup-read the Revenge icon on/off frames in
   a focus video.
2. **interval:30 S2 cadence (⚑ cadence tuple).** The 30s period is the datamined
   `skillCooldownsSec.skill2`; the kit prose carries no number. Recipe: popup-read the crit-damage
   buff icon cadence in any focus video.
3. **SG cadence tuple (⚑ mandatory, datamine-unreliable).** rate_of_fire 90 / reloadFrames 142 /
   10 pellets per volley shipped as-is (no charFixes). Recipe: read pellet-volley cadence + reload
   gap from a focused maiden video (~15–20% shot-count swing).
4. **Spot-check cluster (judge's same-model residuals):** burst popup count per cast (1 × 457.87,
   not 2) + Revenge icon on/off frames + crit-damage icon cadence — one focus video covers all
   three.
