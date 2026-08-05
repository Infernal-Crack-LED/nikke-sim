# Manual review — brid (Brid)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (round-count 30-NA counter; status-gate "when at Max HP"; `burstCast`-vs-`fullBurstEnter` keying)

> Slug disambiguation: `brid` is the BASE unit (AR/Water/Attacker, Burst III, released 2022-11-04).
> It is distinct from `brid-silent-track` (the SG/Fire variant, gauntleted 2026-07-25). The S0 lint
> flagged the bare base name as ambiguous; the task explicitly named this slug and the AR/Water facts
> match `brid` exactly.

## Kit summary

Brid is a Water-element AR Attacker on Burst III (ammo 60, hitsPerShot 1, 720 rpm). Her kit is
compactly offensive — every line is either damage or a self-ATK buff feeding it. Skill 1 re-arms
every 30 rounds she fires and grants herself ATK ▲18.52% for 10 seconds; at AR cadence (12 rounds/s)
the counter re-arms every ~2.5s of firing, so once armed the buff refreshes near-continuously (the
10s window also bridges the ~1.65s reload). Skill 2 is a single-target 211.2%-of-final-ATK skill hit
against the highest-final-DEF enemy on a datamined 10-second cooldown (modeled as an `interval`
trigger, first fire t=10s — the snow-white S2a precedent for a visible-CD nuke). Her burst deals
1440% of final ATK as Burst Skill damage to the highest-final-DEF enemy (FB-exempt: the cast lands
before the Full Burst window opens), plus — per the kit line "Affects the same target when at Max
HP" — a second 1440% additional-damage instance. The Max-HP gate is read as the CASTER's HP and
modeled always-true: v1 models no incoming boss damage, so Max HP is the only reachable state. Both
"highest final DEF" selectors collapse to the sole partless scope-lock boss (documented, board-inert).

## Line-by-line

| Line                                                          | Disposition | Notes                                                                                                                                                                        |
| ------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: after 30 normal attacks (counter)                          | FAITHFUL    | `hitCount 30` — AR hitsPerShot 1 → 30 NAs = 30 hits (no pull-vs-pellet ambiguity); B3 pins exact application count floor(shots/30) + first-apply at/after the 30th shot |
| S1: affects self                                               | FAITHFUL    | target `self` only; B2 discriminates vs an all-ally model (4 holders per firing frame)                                                                                       |
| S1: ATK ▲18.52% for 10 sec                                     | FAITHFUL    | `atkPct 18.52 / durationSec 10` (wall-clock, refresh-not-stack); near-permanent steady-state uptime at AR cadence                                                             |
| S2: highest-final-DEF enemy (selector)                         | FAITHFUL    | Collapses to the sole partless boss; documented caveat (multi-enemy content would need a real selector)                                                                       |
| S2: 211.2% of final ATK as damage (CD 10s)                     | FAITHFUL    | `interval sec:10` → `flatDamage 211.2`; B5 pins exact wall-clock firing seconds [10,20,…,170]; crit-on/no-core/no-range rider defaults; ⚑ first-fire phase convention only |
| Burst: highest-final-DEF enemy (selector)                      | FAITHFUL    | Same documented selector collapse as S2                                                                                                                                        |
| Burst: 1440% of final ATK as Burst Skill damage                | FAITHFUL    | `burstCast` → enemy `flatDamage 1440`; own-cast-only (NOT fullBurstEnter — helm co-B3 in the fixture makes them genuinely divergent); FB-exempt cast-instant rule (B7)       |
| Burst: same target when at Max HP → additional 1440%           | FAITHFUL    | Second `burstCast flatDamage 1440` block; gate read as CASTER's HP → always-true at v1 scope lock; ADJUDICATED by binding soline precedent (identical wording, 2026-08-03)  |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. 3 of 4 spec lines
  FAITHFUL with matching discriminations (hitCount-30 + self + 10s refresh; interval-10s decoupled
  from fire rate; burstCast own-cast-only FB-exempt nuke). The one divergence: the reviewer read the
  Max-HP gate as the ENEMY's HP (boss leaves Max HP in the opening frames → line inert →
  unmodeled-verbatim). Resolved by ADJUDICATED PRECEDENT, not fiat: soline (GO 1.0, 2026-08-03)
  carries the identical wording and its binding record ruled caster-HP/always-true FAITHFUL while
  explicitly naming the boss-HP reading as the nearest-wrong model. Reviewer's three sharper
  discriminations were adopted into the driver tests (first-apply phase pin, range-pin, wall-clock
  pin).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the kit spec from
  prose alone. Vs the driver override: **10 pass / 2 fail / 1 skip** of 13 (adapted file: import
  path only, zero assertion edits). Both reds decompose exactly as the soline run's did:
  (1) `expect(b.durationShots).toBeUndefined()` vs the engine's `durationShots:null` for a
  time-bounded buff — a schema-literal artifact of writing blind against the event shape; the
  assertion's intent (wall-clock 10s, no round budget, finite expiresFrame) is satisfied by the
  driver model; (2) the contested Max-HP rider (blind pinned one 1440% instance per cast; driver
  fires two) — the payload of the adjudication, not an independent fault.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges identically on skill1
  (hitCount 30 / self / atkPct 18.52 / 10s), skill2 (interval 10s / enemy / flatDamage 211.2 — its
  own cadence ⚑ is superseded: the blind packet omitted the datamined skillCooldownsSec skill2=10,
  which the driver uses), and the burst main nuke (burstCast / enemy / flatDamage 1440). Diverges
  only on the Max-HP additional instance (SKIPPED, enemy-HP reading, recorded verbatim in its
  unmodeled.burst) — same adjudication.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, zero
  gotchas.** All 5 kit lines FAITHFUL — four by direct triple convergence, the fifth (Max-HP rider)
  by binding adjudicated precedent: "roster consistency requires identical wording to encode
  identically; reversing here on the same evidence base would fork the roster." The judge
  independently classified both S5 reds (schema artifact + the adjudicated divergence itself),
  superseded S6's cadence ⚑ with the datamined CD, and carried the same-model residual forward for
  owner spot-check.

## Residual flags (owner spot-check cluster)

1. **Max-HP gate reading (carried from soline, ⚑):** the caster-HP posture is same-model consensus
   — all agents in BOTH gauntlets share it and no popup measurement exists. The blind-side grammar
   argument (soline's S2 says "Only affects SELF at Max HP" when self-referential) is real but was
   available to the soline judge and did not carry. Recipe: a brid focus recording where she takes
   damage once — watch whether the second 1440% popup stops. If the enemy-HP reading is ever
   confirmed, remove the second burst block (tests B8/B9 pin the current posture and will go red to
   signal the change).
2. **S2 first-fire phase (⚑):** `interval sec:10` first fires at t=10s by engine convention; the
   period is datamined (skillCooldownsSec), the phase is not measured. Recipe: time the first
   211.2% popup in a brid focus video.
3. **No board data:** brid has no real-fight recordings — she does not appear on the accuracy board
   (board-read grades only units with probe data), and `generatorSupported:false` keeps her out of
   the generator pool. Her 157.0M solo reading (27.6% of the control comp) is a sim-side prediction
   until measured.
