# S7 RECONCILING-JUDGE PACKET — `rapunzel-sanctuary` (Rapunzel: Sanctuary, RL/Supporter/Fire/Burst II)

Built 2026-10-29 by scripts/kit-autonomy/build-judge-packet.ts. Sections: 1 contract · 2 mechanics SSOT · 3 ground truth · 4 S2b review(s) · 5 S5 blind test · 6 S6 blind override · 7 driver implementation · 8 S2d matrix + driver notes.

## 1. YOUR CONTRACT (role template, verbatim)

# kit-autonomy — S7 RECONCILING JUDGE (binding go/no-go)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md` AND the mechanics
pack (`docs/data/damage-calculation.md` + `docs/data/game-mechanics.md`, or the `/context` pack). You are the
final gate of the autonomous gauntlet. You grade the driver's IMPLEMENTATION against ground truth — the real
kit text + the damage-formula SSOT + two INDEPENDENT blind re-derivations — and return a BINDING verdict.
You grade ARTIFACTS, not intent: you do NOT trust the driver's self-report (the artifacts embody the
reasoning; you are not "blind" to it, you simply don't take its word for it).

> **Content gate:** inspect kit prose STRUCTURALLY; quote ≤ ~40 chars; clinical output.

## You are given

1. **Ground truth:** the real kit prose (`data/characters.json → characters.<slug>.skills`) + base stats, and
   the damage-formula/mechanics SSOT (the multiplicative buckets; crit/core/FB majors; procs/DoT/flavors).
2. **Pre-op review (S2b):** the adversarial test-faithfulness reviewer's independent spec (per-line
   disposition + nearest-wrong model + distinguishing assertion + load-bearing set).
3. **Blind post-op test-writer (S5):** an independent `<slug>.test.ts` written from the prose alone (+ spec).
4. **Blind post-op override-writer (S6):** an independent `OverrideFile` written from the prose alone (+ audit + ⚑ list).
5. **The driver's implementation:** the driver's `<slug>.test.ts`, `src/skills/overrides/<slug>.json`, and any
   engine change. (Plus the S2d independent verification matrix if provided.)

## Method

> Section headings use roman numerals since 2026-08-03 — the old letter labels collided with a one-letter unit slug under the packet leak-check word-boundary regex.

**I. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**II. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:

- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**III. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**IV. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**V. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**VI. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
a gotcha unless it contradicts the prose's own number; tag each with its evidence tier.

## Also produce: `kitDescription`

A plain-English 3–6 sentence description of what the kit DOES in game terms (grounded in the real kit text,
not audit jargon) — for owner sanity-check. No gotcha subkinds, no citations, no severity.

## Return ONLY this JSON

```json
{
  "slug": "<exact slug>",
  "kitDescription": "<plain-English 3-6 sentences>",
  "convergence": {
    "s5TestsVsDriverOverride": "GREEN|RED",
    "redAssertions": ["<which S5 assertions fail vs the driver's override>"]
  },
  "lineFindings": {
    "skill1": [
      {
        "kitLine": "<≤40 chars>",
        "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR",
        "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null",
        "driverSaid": "...",
        "blindSaid": "...",
        "formulaCheck": "...",
        "fireRateOk": true,
        "explanation": "..."
      }
    ],
    "skill2": [],
    "burst": []
  },
  "gotchas": [
    {
      "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING",
      "slot": "...",
      "summary": "...",
      "evidence": "<real kit line + formula citation + driver vs blind>",
      "documentedByDriver": true,
      "severity": "high|med|low",
      "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>"
    }
  ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```

Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

## 2. MECHANICS SSOT (damage formula + game mechanics)

# Damage calculation — the exact math the sim computes

Companion source-of-truth to [game-mechanics.md](game-mechanics.md): that doc says what the game
does and how we know; this one walks the sim's implementation of it, formula by formula, in the
order the engine applies them, with every term mapped to its construct in `src/engine/sim.ts`.
The goal: a human can reconstruct any damage number the sim produces — and check it against a
real popup — without reading code. Worked examples at the end use popup-verified fights, so the
numbers are checkable against reality, not just against the code.

Kept current by the `/mechanics-doc-upkeep` skill; a stop-hook nudges when engine files change
without this doc. Evidence tiers (MEASURED / DATAMINED / COMMUNITY / CALIBRATED ⚑) are defined in
[../CONVENTIONS.md](../CONVENTIONS.md).

---

## 1. The per-instance formula

Every damage instance — one bullet, one pellet volley, one skill proc, one dot tick, one burst
hit — is computed independently at the frame it lands (`dealDamage()`):

```
damage = FinalATK × (rate% / 100) × Major × Element × Charge × DamageUp × seqMult × Taken × Distributed
```

Buffs _inside_ a bucket add; buckets _multiply_. `rate%` is the instance's skill/attack
multiplier (e.g. a normal attack's `normalAttackMultiplier`, a proc's "deals X% of final ATK"
value), after any per-unit override corrections. There is no separate Projectile bucket — the
Projectile Explosion ▲ / Attachment ▲ terms compose additively inside DamageUp (§1f); `seqMult`
is the sequential-attack TRUE multiplier (§1e).

For the inverse index — **every buff, stat, gear line and boss-side term mapped to the factor it
feeds**, with live per-stat carrier counts — see
[damage-bucket-matrix.md](damage-bucket-matrix.md).

### 1a. FinalATK

```
FinalATK = max(0, effectiveAtk − bossDef)                     // bossDef = 140 at scope lock (measured; owner "always on")

effectiveAtk = staticAtk × (1 + Σ ATK ▲ % / 100)
             + Σ (caster-ATK grants, as flat values)
             + (Σ ATK-of-Max-HP % / 100) × ownMaxHp
```

- `staticAtk` — the unit's out-of-combat attack: level-table base for its class × grade/core
  multipliers + gear (`src/stats.ts`). At scope lock (sync 400, 3★ core 7, no doll, **Base 5
  gear**) this is **Attackers 118,027 / Supporters 98,367 / Defenders 78,707**. (BASIS CORRECTED
  2026-07-14: scope lock uses the base manufacture gear set, NOT OL0 — the old OL0 values
  120,143 / 100,130 / 80,118 were ~1.76% high across the board. The prior popup "exact" matches
  against the OL0 numbers are flagged for re-check at the Base 5 basis. See DECISIONS.)

- Plain **ATK ▲ %** buffs sum into one multiplier on staticAtk (they dilute against each other).
- **"ATK ▲ X% of caster's ATK"** buffs convert at application time to a flat add of the caster's
  final ATK × X — they do not dilute (this is why high-ATK buffers are strong).
- **"ATK ▲ X% of Max HP"** conversions use the unit's OWN Max HP only — own-kit HP stacks count,
  ally-granted Max HP buffs do NOT feed the conversion (MEASURED: cinderella focus video; her
  full-burst proc popups match own-HP math within 2% early and late, and would read ~28% higher
  if ally grants fed it). "Live Max HP" here and below is the single engine reader `liveMaxHp`
  (base + own-kit maxHpFlat buffs, honoring expiry/stacks/ramp).
- **"ATK ▲ X% of the skill user's final Max HP"** granted to OTHERS (maxwell-ordinary-mechanic
  S2, `atkOfCasterMaxHpPct`) converts at application time to a FLAT add of the caster's live
  Max HP × X — uniform across all targets, one snapshot per application; the caster's own-kit
  Max HP stacks feed the basis (the e3 scope above), ally-granted Max HP on the caster does not
  (owner ruling 2026-08-04: the kit line is caster-scaled; the earlier target-own resolution was
  a misread).
- **"% of Max HP" damage terms** (stackedNuke hpPct — maiden-ice-rose's burst "10% of the skill
  user's FINAL Max HP") read live Max HP at cast, same e3 scope (2026-08-04; the base-Max-HP
  read was a documented residual, kit text says "final").

### 1b. Major bucket (crit, core, Full Burst, range — one additive bracket)

```
Major = 1 + FB + Range + Crit + Core

FB    = 0.5   if Full Burst is active AND the instance is not boundary-timed (see below); else 0
Range = 0.3   if the weapon is in its effective band vs the boss's current position; RL never;
              skill/proc instances never (noRange)
Crit  = critRate × critBonus         (expected-value mode)
      | critBonus or 0, Bernoulli(critRate)      (Monte Carlo mode, cfg.seed set)
        critRate  = (base crit rate + Crit Rate ▲ % + normal-only Crit Rate ▲ %) / 100,
                    clamped 0..1   (base 15%)
                    the normal-only term (`critRateNormalPct`) joins ONLY on normal-attack
                    instances — kit lines reading "Critical Rate of normal attacks ▲x%"
                    (helm S1). Skill procs and burst damage see the unscoped term alone.
        critBonus = (critDamage − 100)/100 + Crit Damage ▲ %/100           (base +50%)
Core  = coreExposure × ACR × coreBonus    (expected-value mode)
      | coreBonus or 0, Bernoulli(coreExposure × ACR)   (Monte Carlo mode)
        coreExposure = cfg.coreHitRate (1.0 on the scope-lock boss)
        ACR = acrForHR(weapon, band, hitRatePct) — the auto-aim core-hit fraction.
        LIVE MODEL — UNIGEO uniform-in-circle (default 'all', 2026-07-22; DECISIONS 2026-07-22),
              scope-lock (small) boss profile, accuracy-circle weapons (AR/SMG/SG):
                R(hr)   = (CIRCLE_PX_K · scale_w)/2 · (1 − hr/100) px      (linear to ZERO at HR 100;
                          CIRCLE_PX_K 0.648 measured, scale_w = datamined start_accuracy_circle_scale
                          {AR 75, SMG 110, SG 250}; MEASURED at 79.3/48.2 px for SG @ HR 0/38.91)
                SG:     ACR = min(1, (r_core(band)/R(hr))²) ÷ coverage(band, R(hr))   (per landed pellet)
                AR/SMG: ACR = lensOverlap(disc R_eff = f_bloom_w·R(hr), offset δ_w(hr), core r_core)
                              ÷ disc area                                              (per hit)
                        δ_w(hr) = δ0_w · max(0, 1 − hr/120)
              Pellet/shot placement inside the circle is UNIFORM PER AREA — MEASURED directly
              (101 machine-read pellet-marker positions; the previous centered Gaussian is refuted
              at KS 0.376 vs crit 0.135). r_core diameters: near 31 px MEASURED; mid/midfar/far
              20.9/15.8/12.7 px ⚑ FIT-SELECTED (UNIGEO_CORE_PX; an owner re-trace supersedes).
              ⚑ CALIBRATED per class: δ0 = AR 15.9 / SMG 17.9 px; f_bloom = AR 0.578 / SMG 0.728
              (SMG pair is a saturated 2-cell fit — flagged, see DECISIONS 2026-07-22). Rises
              steeply with Hit Rate; AR ≥▲80 is all-core geometrically (circle inside the core).
              MG/SR/RL → flat 0.95 (no accuracy circle; MG gated by its wind-up ramp).
              Engine: acrForHR → unigeoSgCorePerLanded / unigeoSingleCoreProb (src/engine/unigeo.ts).
        REVERT / FALLBACK ARMS: UNIGEO=off restores the pre-2026-07-22 engine byte-identically —
              the δ-offset ("Rician") Gaussian cone (offsetCoreProb, frozen params in sg-geometry.ts:
              δ0 = AR 18 / SMG 16 / SG 30 px, H 120, S_FLOOR 0.10, σ-shrink {AR .009, SMG .004,
              SG .009}, K_SIGMA 2.53), which itself falls back at CONE_DELTA=0 to the measured
              CORE_BY_WEAPON_BAND table × HRCORE lift (NEVER refit; Wilson CIs in
              docs/probe-data/coreband2-*.json). The cone also remains the LIVE path for
              medium/large bossPelletProfile fights (UNIGEO coverage tables are the scope-lock
              boss silhouette only).
              PER-SHOT OVERRIDE (`coreOverride`, bypasses the band table): some hit types have their
              OWN core rate independent of aim/range — a consolidated pellet bullet (dorothy-S,
              `coreRate`). These pass `coreOverride` so `acr` is that rate, not `acrFor(weapon,
              band)`. (Rapi: Red Hood's attached-rocket EXPLOSIONS consumed this path 2026-07-16
              (`storedHit.core` 0.33) but were re-ruled core-INELIGIBLE 2026-08-04 — skill damage;
              owner footage ruling, DECISIONS.)
        coreBonus = (coreAttackMultiplier − 100)/100 + Core Damage ▲ %/100   (base +100%)
```

**Full Burst timing rule (MEASURED, twice popup-verified + JP-corroborated):** damage dealt BY a
burst skill at its cast lands _before_ Full Burst begins — it gets neither the +0.5 nor any
"when entering Full Burst" aura. Buffs granted by earlier casts in the same rotation do apply to
it. Burst-originated damage that lands _during_ the window (dot ticks, stored-hit releases,
per-shot procs) gets both. Engine: `noFb` forced for burst-cast direct damage; burst-cast blocks
resolve before full-burst-entry triggers.

**Stored-hit accumulate-then-detonate (Rapi: Red Hood rockets, 2026-07-16):** a `storedHit` effect
accrues charges that release as one consolidated hit. Rapi: Red Hood's rocket meter (`hitCount`
every 120 normal attacks, `countInFb` 60 in her Full Burst — fills 2× faster in FB) attaches a
rocket at each meter-full; rockets attached OUTSIDE Full Burst do NOT explode until FB begins, so
they ACCUMULATE and the FIRST explosion of each FB is a BATCH of everything banked (this stack
overlap is why explosions can't be visually counted). A rocket attached DURING FB explodes
INSTANTLY (`storedHit.instantInFb` → the in-FB per-frame release path). The explosion is
aim/range-independent, does NOT core (skill damage — owner footage ruling 2026-08-04 overturning the
2026-07-16 ~1/3 read), and crits at the caster's sheet rate
(`storedHit.crit` — removes the stored-hit path's default crit-OFF exemption so the release crits like
every other hit; consistency, DECISIONS 2026-07-16). The rocket ATTACH is launchWeapon delivery:
it CORES at the band-table rate, crits, and generates burst gauge like any skill hit — so the
in-FB cadence subtly shifts Full Burst timing (a second-order coupling, DECISIONS 2026-07-16).
Two 2026-08-04 owner rulings: the ▼60 in-window threshold is scoped to the 10s window of her OWN
Stage-3 cast (`countInFbStage`, not any FB window), and her Stage-3 cast self-buffs Projectile
Attachment Damage ▲421.2% for 10s (restored — the 2026-07-14 measured-inert verdict overturned;
DECISIONS ATTACHMENT REWORK).

**Flighted damage (2026-07-14):** some burst skills are projectiles with real flight time —
Rapi: Red Hood's 2808% nuke lands ~0.4 seconds AFTER her banner, inside her own window, and
snapshots everything (attack, buffs, the +50%, even Crown's flicker phase) at the LANDING
instant (MEASURED: the landed value matches the full in-window recipe at +0.02% in the
fire-weak read). Engine: `delaySec` on a flat-damage effect queues the hit for landing-time
resolution; the cast-instant no-Full-Burst rule does not apply to flighted damage. Her nuke is
also charge-gated (`requiresPulls` 120 — it fired at every banner where she had 120+ shots
banked and skipped the one banner where she did not).

**Delayed BLOCKS, distinct from flighted damage (2026-08-03):** a separate `delaySec` sits on the
BLOCK rather than on a flat-damage effect, and delays the whole block — every effect kind, buffs
included. It exists for kit lines whose activation condition is only satisfied a fixed time after
the observable event that causes it: Flora's "when either adjacent ally reaches max HP" fires 2
seconds after Burst Stage 2 entry, because her own skill 1 hands those allies a 2-second Max HP
grant there and they return to max HP when it expires (DECISIONS 2026-08-03). The block's gates and
its `everyN` counter are evaluated when the TRIGGER fires — that is the state the kit line's
activation clause reads — while targets and effect values resolve at LANDING; a landing frame past
the end of the fight never applies, and an absent or zero value is a strict no-op.

**Scope clarification (2026-07-13):** the measured rule (and the engine's forced `noFb`) governs
BURST-slot casts — the burst button's own damage, which is what the Cinderella popups measured.
A skill-slot block that happens to trigger on a burst cast resolves after the window opens and
DOES receive the +0.5 (engine ordering: `fbEndFrame` is set before skill-slot blocks run),
though it still misses same-cast self-buffs and entry auras. This distinction surfaced in the
Snow White: Heavy Arms rework below — no unit currently relies on a skill-slot cast-instant
damage lump.

**Popup math note:** an on-screen popup is a single resolved instance — non-crit body, non-crit
core, crit body, or crit core — so to compare a popup against the sim, recompute Major with the
crit/core _outcomes_ (0 or the full bonus), not the expectations. A crit popup is ×1.5 of its
non-crit sibling at base crit damage; a core popup adds the full coreBonus.

### 1c. Element bucket

```
Element = 1.1 + (Element Damage ▲ % + Superior-element Damage ▲ %)/100   with elemental advantage
        = 1.0                                                             without
```

Wheel: Fire→Wind→Iron→Electric→Water→Fire. "Superior element" damage buffs
(`elemAdvantageDamagePct` — Privaty's 130, Maiden: Ice Rose's aura, Guillotine's passives) live
HERE as part of the element multiplier, and apply only with advantage. MEASURED (2026-07-14,
test battery 5): Privaty's popup ratio between windows with and without her 130-point line read
2.8244 — the element-placement prediction to four digits ((1.1+1.3)/1.1 arithmetic); the
alternative DamageUp-additive placement predicts 1.995 and is excluded on three band pairs plus
two independent corroborating classes. Matches the decoded reference simulator.
~~They sit in DamageUp~~ SUPERSEDED (2026-07-14) — the old DamageUp placement was unsourced and
is retired (restorable via ENV.ELEMADV='damageup' for A/B comparison only).

### 1d. Charge bucket (charge shots only)

```
Charge = chargeMult/100
       + (chargeMult/100) × (doll charge % + Charge-Damage-multiplier buffs %) / 100
       + Charge Damage ▲ %/100
```

`chargeMult` is the per-unit full-charge multiplier (SR typically 250, Alice 350, cinderella 200;
weapon-swap states can override it, and a `flatDamage` hit may supply its own via `chargeMultPct`
when there is no swap to source it — Snow White `snow-white`'s cannon, dealt as a delayed
full-charge hit while her AR keeps firing rather than a weaponSwap that would halt it). Ordinary
Charge Damage ▲ buffs add flat percentage points; "multiplies base charge damage"-class effects
(Helm's burst, collection items) scale the base term. Auto play always releases at full charge
(early releases ≈ 2% of shots, unmodeled). Non-charge instances use Charge = 1.

### 1e. DamageUp bucket

```
DamageUp = 1 + ( Attack Damage ▲ %
               + Sustained Damage ▲ %      [only on sustained-flavored instances (dots)]
               + Sequential Damage ▲ %     [only on sequential-flavored instances]
               + True Damage ▲ %           [only on true-flavored instances: flavor:"true"
                                            skill hits, and normal attacks while the unit is
                                            static hasTrueNormals, in a trueNormalsModes mode,
                                            or firing a weaponSwap.trueNormals swap — the first
                                            two also cover the unit's own swap shots]
               + Pierce Damage ▲ %         [only for Pierce-tagged shots: static hasPierce,
                                            a live gainPierce window (seconds) or unspent round
                                            budget (gainPierce.durationShots), or a swap-scoped
                                            weaponSwap.hasPierce shot (snow-white cannon)]
               + Projectile Explosion ▲ %  [explosion-flavored hits, plus RL NORMAL attacks — see 1f]
               + Projectile Attachment ▲ % [attachment-flavored hits — see 1f]
               ) / 100
```

The flavor gates mean a "Sustained Damage ▲" buff does nothing for a unit with no dot, etc.

**`seqMult` — the sequential-attack TRUE multiplier, its own bucket.** Kit wording "Damage
multiplier of sequential attacks is scaled by x%" (eve's Exospine Mk2, ×2) is a genuine multiplier
on a sequential-flavored instance, so it gets its own factor (`1 + sequentialMultPct/100`) rather
than diluting inside DamageUp. This is a DIFFERENT mechanic from "Sequential Attack Damage ▲x%"
(`sequentialDamagePct`, Snow White: Heavy Arms), which is an ordinary additive DamageUp member.
Both are `1` / inert for every instance that is not sequential-flavored.

### 1f. Projectile flavor routing (DamageUp addition)

Projectile Explosion ▲ % / Projectile Attachment ▲ % compose ADDITIVELY into the DamageUp
bucket (1e), flavor-scoped: an attachment hit reads ONLY Projectile Attachment ▲, an explosion
hit ONLY Projectile Explosion ▲. Applies to explosion/attachment-_flavored_ hits (Rapi: Red
Hood's projectiles, Anis: Star's stars). For plain rocket-launcher NORMAL attacks the Projectile
Explosion buff applies too (also DamageUp) — MEASURED exactly (the buff-independent
rocket/proc popup ratio test, 1.2491 = prediction to four digits). Owner popup ruling
2026-08-04: a non-crit CORE Rapi:RH attach during her B3 window hit 5,057,974 in the
control+carry recording — the additive composition reproduces it (−0.24%/+1.1% across buff
states); the prior own-multiplicative-bucket model over-credited ~×1.6 (her hot read). This
OVERTURNS the validation-era own-bucket rule. The event `projFactor` field is now a flavor
MARKER (1 = unflavored), not a factor in the damage product.

### 1g. Taken and Distributed buckets (boss-side)

```
Taken       = 1 + (Σ Damage Taken ▲ on the boss
                   + Σ Distributed-damage Taken ▲ [distributed instances only, and only
                                                   while a Damage Taken ▲ is active]) / 100
Distributed = 1 + Distributed Damage ▲ %/100     [distributed instances only]
```

Distributed damage deals the same TOTAL against one target as against many (owner-verified) —
never model a split penalty.

---

## 2. What creates damage instances

### 2a. Normal attacks

Per trigger pull, at the weapon's cadence, 60 fps frame-quantized:

- **AR 12/s · SMG 20/s · SG 1.5/s (10 pellets/trigger) · Pistol 4/s** — class defaults; the
  datamined `rate_of_fire` is per-unit and some units deviate (Jill: 150 rpm = 2.5/s, MEASURED —
  engine `charFixes.pullsPerSec`).
- **MG**: the measured wind-up ladder (35 rounds over 142 frames, then 1 round/frame = 60/s),
  with wind-DOWN on idle (grace ~0.27s, then the ladder retraces at ~2.8× climb speed; a >100%
  reload-speed buff's ~0.2s effective reload sits inside the grace = the measured "skip").
  Details: [nikke-mg-windup-model.md](nikke-mg-windup-model.md).
- **Charge weapons (SR/RL)**: charge for `chargeFrames × (1 − Σ Charge Speed %)` (SUBTRACTIVE,
  floor 1 frame, cap +100%). The sum only ever contains buffs the unit was actually allowed to
  receive: a unit listing a stat in `charFixes.statImmunities` (`liberalio`, Charge Speed) never
  has that stat placed on it by an in-battle buff in the first place — cube/Overload Charge Speed
  still counts, per the owner ruling that the immunity covers buff effects, not gear. See
  [game-mechanics.md](game-mechanics.md) §11. Then — for release-fired units — a 22-frame release latency
  (MEASURED). Autofire units skip the latency (`charFixes.noBoltRecovery`, sparse list).
  Details: [charge-weapons.md](charge-weapons.md). **Whole-magazine dump (cinderella,
  `charFixes.magDumpRof`)**: one charge feeds the whole magazine — after the first charge she
  autofires all 24 rounds at the datamined `rate_of_fire` without recharging, then reloads and
  charges once again (MEASURED 2026-07-21 by ammo-counter frame read; ≈390 pulls/180s). Charge
  Speed shortens only the once-per-mag prime charge. See [charge-weapons.md](charge-weapons.md) §2a.
- **Reload**: `round(displayed × 0.975 × (1 − Reload Speed ▲)) + 13 frames` (SUBTRACTIVE; the
  13-frame tail is what a ~100% buff leaves — corroborated by ore-game's 0.2s measurement).
  Rolling reloads exist (`reload_start_ammo` — Jill tops up while firing, zero downtime).
- Core/crit/range/FB per §1b; charge bucket per 1d.
- Firing pauses during the boss's 1-second off-screen transition windows; units whose effective
  reload is ≤1s get a free refill during them.

### 2b. Skill damage ("deals X% of final ATK as additional damage")

Function-type instances (DATAMINED rules, table in
[nikke-damage-formula.md](nikke-damage-formula.md) §3):

- CRIT at the caster's rate (default on), NEVER core, NEVER range (`noRange`), Full Burst by
  actual landing time, no charge bucket.
- launchWeapon deliveries (real projectiles: Anis: Star's stars, Rapi: Red Hood's attachments)
  DO core+crit and take the Projectile bucket.
- Full-charge-gated procs count only full-charge releases (auto ≈ every shot).
- Per-shot procs can be state-gated: by Full-Burst state (engine `fbGate`, e.g. Velvet), by
  every-Nth activation (`everyN`), by core exposure (`requiresCore`), and by weapon-swap state
  (`swapGate`, 2026-07-13): Snow White: Heavy Arms's Fully Active extra volley (+1,055.9%
  sequential per shot, critting) rides ONLY her two swapped 3.2-second full-charge shots inside
  the Full Burst window — COMMUNITY twice-confirmed placement (gamewith JP holds her Fully
  Active buffs per fully-charged shot; Prydwen's 5→15 lock-on structure), replacing an older
  cast-instant lump model that stranded the volley outside the window's buffs.
- Weapon swaps can end on USES rather than time (`maxShots`, MEASURED 2026-07-14): Snow White:
  Heavy Arms's Fully Active ends right after her second swapped shot fires — at a variable
  instant, observed +6.2 to +7.7 seconds — bounded by her burst window; a shot lost to fight
  end delivers nothing. Buffs "held per swap round" (her +528 Charge Damage and +158.4
  Sequential) are modeled with the `whileSwapped` buff gate: they count only while the swap is
  live, so they never leak onto baseline shots in the window tail. Base Snow White
  (`snow-white`) uses `maxShots: 1` — OWNER-ruled 2026-07-20: exactly one cannon shot per
  burst, then she returns to her AR for the window's remainder. A swap can also carry
  swap-scoped Pierce (`weaponSwap.hasPierce`, 2026-07-20): its shots are Pierce-tagged for
  the DamageUp Pierce term without the unit being statically Pierce.
- Internal-cooldown skills (`interval` trigger, 2026-07-20): a kit line with no printed
  activation clause that "just happens" every N seconds of battle (owner-stated mechanic;
  snow-white S2a 144.73%, N=15 /owner). Fires first at t=N (⚑ phase convention — pin from a
  popup-cadence read).
- Shield-state gates (2026-07-20, owner-ruled default-off): "when a Shield is set" lines ride
  the `shielded` event trigger (fires when an ally's `shield` effect targets the unit);
  "if a Shield is set" lines use `requiresShielded` — active only while a shield window
  (the emitter's stated duration) covers the unit (`shieldedUntilFrame`). Naga (`naga`).
- Static team-composition gates (`teamHas`) can also match SPECIFIC units (`slugs`,
  2026-07-20): noir's same-squad burst line requires `blanc` or `rouge` in the team
  (owner-confirmed the gate is real). The same-squad primitive is `teamHas.sameSquad`
  (2026-08-02): some OTHER ally shares the owner's squad per the curated map
  `src/data/squads.ts`; fails closed for unmapped owners. Blanc's (`blanc`) S2
  burst-CDR is gated on it (squad = noir+rouge; noir's `.slugs` spelling predates the
  primitive and migrates to it).

### 2c. Damage over time

Sustained-flavored function damage on a tick timer; ticks reference CURRENT buffs (no snapshot),
never core/range; **tick-crit ON by default** (`DOT_CRIT`, U13 2026-07-21 — ginmy + our footage
confirmed). **`flavor:"true"` (true-damage) dots crit too** (owner ruling 2026-07-25, in-game
confirmed; reverses the 2026-07-21 "true damage cannot crit" ruling — recorded but never implemented:
there is no `crit && !trueFlavor` guard; ada's grenade DoT crits at the caster rate). A dot's
ticks land during whatever window they land in (Full Burst rules by timing).

### 2d. Stored hits

Attach-then-detonate kits (Rapi: Red Hood): charges accumulate per shot and release at the next
Full Burst start, AFTER entry buffs apply (they detonate inside the window and keep auras —
unlike burst-cast direct damage).

---

## 3. When damage happens: the rotation

Full model in [burst-gauge.md](burst-gauge.md); the engine's state machine in one paragraph:

The gauge (10,000 energy) fills from hits — per trigger vs the boss each unit contributes its
datamined target value ([burst-gauge.md](burst-gauge.md) §2), ×2.5 if it is the camera-focused
unit with a charge weapon (focus-only, MEASURED both ways); skill hits and dot ticks contribute
the flat target value; per-unit kit quirks add on top (helm, liberalio, ein, jill — MEASURED via
the rl3 cross-validation). Generation is locked during Full Burst and during the chain. When the
gauge fills, the chain opens (consuming the gauge): **gauge-full → 30f → Burst 1 → 30f → Burst 2 →
30f → Burst 3 → 22f → Full Burst** (frame-perfect MEASURED 2026-07-21; DECISIONS). Each stage opens a
10-second window for the next (DATAMINED `burst_duration`); in-window selection is FIRST-READY (the
stage-filler whose cooldown ends soonest, tie→leftmost — owner ruling 2026-07-21); an expired window
collapses the chain back to a full refill. The Full Burst countdown starts 22f AFTER the Burst-3 cast
(so instant burst-cast attacks land before it — no +50%). After it ends, generation unlocks IMMEDIATELY
and the next chain opens the moment the refilled gauge is full — there is NO post-FB chain-open lock
(owner ruling 2026-08-04, overturning the earlier fixed ~2.5-3s `POST_FB_CHAIN_DELAY_FRAMES` block: the
observed gap was natural refill-from-zero, ~3-4s for a good team, compounded by video-offset confound;
`ROTMODEL=floor` keeps the old block as an opt-in A/B arm). Casts are
blocked while the boss is off-screen in a range transition — the one real
source of run-to-run full-burst-count variance. Everything else is cooldown arithmetic, which is
why full-burst counts are deterministic and pinned as regression asserts.

---

## 4. Monte Carlo mode

`cfg.seed` switches crit and core from expectation folding (§1b) to per-instance Bernoulli rolls,
jitters each boss range-transition time by up to ±2s, and jitters chain cast gaps — mirroring the
two real variance sources (crits, boss movement timing). Means are unchanged; the seed spread
gives the error bar a single real run should be judged against, and real runs are compared
against the seed stratum matching their observed full-burst count. Unset seed = the deterministic
expected-value path, byte-identical to the web UI's.

---

## 5. Worked examples (popup-verified anchors)

### 5a. Jill's opening magazine (run I order, electric-weak boss — all four classes measured 99.7%)

FinalATK = 137,059 (staticAtk 120,143 Attacker × her passive ATK stack at fight start).
⚠ **Pre-correction OL0 basis**: this example uses the old OL0 `staticAtk` value and no boss-DEF
subtraction. After the 2026-07-14 basis correction, scope-lock Attackers use Base 5 gear =
118,027, and the live basis subtracts the measured boss DEF 140 (~0.1% of FinalATK); the popup
match here is flagged for re-check at the corrected basis (see §1a).
rate% = 92.4 (71.09 base × her Magnum-Ammo 1.3 multiplier). Element = 1.1. Charge = 1.
DamageUp = 1.0 pre-buffs. AR in range at mid band → Range 0.3.

| popup class                          | Major           | formula result | measured popup |
| ------------------------------------ | --------------- | -------------- | -------------- |
| non-crit body                        | 1 + 0.3 = 1.3   | 181,131        | 180,633        |
| non-crit core                        | 1.3 + 1.0 = 2.3 | 320,464        | 319,582        |
| crit body                            | 1.3 + 0.5 = 1.8 | 250,796        | 250,107        |
| acid tick (192%, no core/range/crit) | 1.0             | 289,469        | 288,662        |

### 5b. Cinderella's nuke (the Full Burst boundary rule)

Instance: burst-cast damage, 1,400.6% per sequential hit, FinalATK 187,102 at cast (her own
cast-granted HP→ATK conversion included; anis-star's full-burst-ENTRY flat-ATK grant excluded —
boundary rule), DamageUp 1.209 (trina's cast-granted +20.9% applies; anis-star's entry-aura +34%
does not), Element 1.1, Major = 1.0 non-crit (no FB, no range for burst damage, no core ever):

```
187,102 × 14.006 × 1.0 × 1.1 × 1.209 = 3,485,150   →  measured 3,448,659 (98.9%)
crit: × 1.5                = 5,227,725              →  measured (other fight) ×1.5 pair exact
```

With the +50% (the rejected branch) the prediction is 34% hot — this single popup pair is what
settled the boundary rule.

### 5c. Maiden: Ice Rose gauge fill (solo vs the raid boss)

Weapon shot: target 364 × 2.5 (solo = focused charge weapon) = 910 energy = 9.1% of the gauge —
measured as the exact per-shot bar step. Her rider proc adds the flat 364 (3.64%) as a separate
visible sub-step. Full in ~8 pulls including one reload pause.

---

## 6. Known open items that bound this doc's precision

The board's standing residuals and every CALIBRATED ⚑ value are tracked in
[../open-questions.md](../open-questions.md) — headline items: the UNIGEO ⚑ set (fit-selected long-band
core diameters; the saturated SMG δ0/f_bloom pair) and the SG-override calibration debt awaiting the
re-tune pass (DECISIONS 2026-07-22), the N5 fire comp's real-12-vs-sim-10 Full Burst shortfall (U29), the ~7%
uniform damage-side deficit under the corrected rotation model, per-unit kit-generation quirks
not yet modeled (U11c), and the four kit-level outliers (ein, eunhwa-TU, quency-EQ,
guillotine-WS).

# NIKKE combat mechanics — single source of truth (2026-07-13)

Every game mechanic the simulator's logic references, with where it's implemented and how we
know it. **Companion source of truth: [damage-calculation.md](damage-calculation.md)** — the
exact math the sim computes, formula by formula, with popup-verified worked examples. Detail
docs live alongside this file; per-unit modeling decisions live in `src/skills/overrides/*.json`
notes; unresolved items live in `docs/open-questions.md`; settled tradeoffs in
`../DECISIONS.md` (do not re-litigate).

**Skill resolution (2026-07-16):** the engine never parses skill description text at runtime.
Each unit's override JSON is the complete description of its kit — all three skill slots as
structured blocks, plus an `unmodeled` field listing (verbatim) every kit-text line the model
deliberately does not represent, and optional `caveats` shown as modeling warnings. The offline
kit parser (`scripts/lib/kit-parser.ts`, run by `scripts/materialize-overrides.ts` and the
kit-parse authoring skill) is an authoring aid only.

**Evidence tiers** used throughout (highest to lowest):

- **MEASURED** — frame-counted from our own recordings/tests under scope lock. Never refit.
- **DATAMINED** — decoded game tables (github.com/rcasdzxc/SD, coolguydlm123/nikkecsvlibrary)
  or the frame-accurate reference sim github.com/d34d633f/nikke-einkk.
- **COMMUNITY** — independently verified by multiple community testers (JP: note.com,
  ore-game.com, wiki3.jp; KR: namu.wiki, Arca, DC Inside, Inven; EN: nikke.gg, Prydwen).
- **CALIBRATED ⚑** — value fitted against our validated real fights; mechanism known or
  suspected but the number is ours. Every ⚑ is a standing refit candidate.

Validation basis for all calibrations: scope lock (no cube, no doll, Base 5 gear [not OL0 —
corrected 2026-07-14], 3★ core 7,
sync 400, 10/10/10, treasure on, partless boss, 100% core exposure, full auto, 180s).
Real-run repeatability is 0.5–3.5% per unit (measured by running the same water-weak
validation fight twice), so simulation-vs-real deltas under ~5% are noise.

---

## 1. Damage formula

Damage is a product of independent **buckets**; buffs _inside_ a bucket are additive,
buckets _multiply_. DATAMINED + COMMUNITY, cross-validated by our board.

```
damage = FinalATK_term × rate% × Major × Element × Charge × DamageUp × seqMult × Taken × Distributed
```

Major bucket = `1 + 0.5·FB + 0.3·range + critTerm + coreExposure·ACR·coreBonus` —
crit, core (+100% base), Full Burst (+50%), and effective range (+30%) all share ONE
additive bracket. The +50% applies by TIMING: burst-cast damage lands before the window
opens and never gets it (§8). `coreExposure` is `cfg.coreHitRate`; `ACR` is the accuracy-
derived core fraction from §7. `seqMult` is the separate sequential-attack multiplier
bucket. Full structure, per-bucket membership, and the skill-proc ("additional damage")
rules: **[nikke-damage-formula.md](nikke-damage-formula.md)**.
Engine: `dealDamage()` in `src/engine/sim.ts`.

## 2. Weapon fire cadence

Per trigger pull, 60 fps frame-quantized (COMMUNITY base rates, MEASURED refinements):

| Weapon | Cadence                                                | Notes                                 |
| ------ | ------------------------------------------------------ | ------------------------------------- |
| AR     | 12/s                                                   | 5 frames exactly                      |
| SMG    | 20/s ⚠ datamined nominal 24/s, frame-quantized to 20/s | see the frame-quantization note below |
| SG     | 1.5/s                                                  | 10 pellets/shot; 40 frames exactly    |
| MG     | 60 rounds/s cap                                        | after wind-up ladder — §3             |
| Pistol | 4/s                                                    |                                       |
| SR     | charge cycle + 22f bolt                                | §4                                    |
| RL     | charge cycle                                           | no bolt recovery                      |

**⚠ SMG CADENCE IS CONTESTED — the sim ships 24/s, but a direct measurement says 20.0/s
(2026-07-23).** The ammo counter (the shot clock) on
`docs/probes/clean-weapons/emma-claire-idollocean.MP4` with `idoll-ocean` focused reads
`076→066→056→046→036` (t=60.0–62.0, mid band) and `020→010` (t=145.0–145.5, far band) — exactly
10 rounds per 0.5 s, dead linear, in two separate range bands.
**The mechanism is this section's own "frame-quantized" premise.** 1440 rpm = 24/s = **2.5 frames per
shot**, and a census of every datamined `rate_of_fire` in the roster shows **SMG is the only weapon
that is not a whole number of frames** (AR 720→5f, AR 150→24f `jill`, MG 3600→1f,
RL 60/90/120/180/300→60/40/30/20/12f, SG 90→40f, SR 60/200→60/18f). `ceil(2.5) = 3` frames →
exactly 20.0/s. So the table's "24/s" and the "frame-quantized" claim above it are mutually
inconsistent, and the measurement resolves them in favour of 20.
**This CONFLICTS with the ore-game community figure (~24/s) cited below** — that source's other rates
carry ~2% slop (its AR ~11.79/s vs an exact 12/s), which cannot absorb a 20% gap, so the two are
genuinely at odds rather than reconcilable. Our reading is a direct integer count of an in-game
counter, which is the higher-tier instrument.
Engine: SMG frame quantization is **DEFAULT-ON** (flipped 2026-07-23, DECISIONS); `SMGRATE=24` is the
documented revert / A-B arm (`SMGRATE=<n>` pins any rate). Evidence + whole-board A/B:
`docs/probe-runs.md` § "SMG CADENCE".

Base rates: [ore-game measured rates](https://ore-game.com/nikke/post/verify-memo/)
(AR ~11.79/s, SMG ~24/s, SG ~1.50/s at 60fps) + decoded shot tables
([rcasdzxc/SD](https://github.com/rcasdzxc/SD)). The class rate is a DEFAULT — the
datamined `rate_of_fire` column is per-unit and some units deviate wildly (Jill: 150 rpm
= 2.5/s on an "AR", video-confirmed; engine `charFixes.pullsPerSec`). **CHUNKED (multi-part)
RELOADS:** some units empty the magazine and then refill it **in parts**, so the reload
takes N× as long — the datamined `reload_bullet` is `1/chunks` (`10000` = whole mag, 177
units; `3300` = 3 chunks, 14 units — 9 SGs + 5 RLs; `5000` = 2 chunks, `grave`), and
`reload_time` is the PER-CHUNK duration. This is already live: shipped `reloadFrames`
equals `reload_time × chunks × 0.6 + 21` for 190 of 192 units. Firing does NOT resume
between chunks (measured on `grave` and `noir`). `reload_start_ammo` is NOT this signal —
it is `max_ammo − 1` on all 192 rows and identifies nobody. `grave` is the one carrier
shipped un-multiplied → open-questions **U30**. Reload durations are per-unit DB values
(`reloadFrames`). Reload duration is SUBTRACTIVE like charge speed
(IMPLEMENTED 2026-07-13): actual reload = displayed × 0.975 × (1−buff) + 0.21s tail —
buffs past 100% only remove the scaled part
([ore-game reload-limit](https://ore-game.com/nikke/post/reload-limit/); engine
`reloadFramesNeeded`). Known-but-NOT-implemented refinements: post-reload attack locks
(SG 0.47s, AR/SMG/MG ~0.18s).

## 3. MG wind-up

MEASURED frame ladder: 35 rounds over 142 frames, then 1 round/frame (60/s). While not
firing (reload/stun/unhittable) the spin WINDS DOWN: a ~0.27s grace, then the ladder
retraces at ~2.8× climb speed — fully gone after ~1.1s idle (linear fit through ore-game's
two recovery measurements; its endpoints reproduce both prior rules: "no recovery below
~70% reload buff" and our measured ">100% buff = full skip", the latter because the
subtractive reload formula leaves only its 0.21s tail, inside the grace). First 18 rounds
of each wind-up don't land on core (CALIBRATED ⚑, bloom estimate). Full ladder +
derivation:
**[nikke-mg-windup-model.md](nikke-mg-windup-model.md)**. Engine: `MG_RAMP_INTERVALS`,
`MG_NO_CORE_RAMP_ROUNDS`. Corroborating community analyses:
[note.com/tt00771 MG analysis](https://note.com/tt00771/n/nce4d6818b73c),
[ore-game MG heat-up](https://ore-game.com/nikke/post/verify-mg-heatup/) (which also
documents partial wind-up recovery from reload buffs ≥ ~70% — our MEASURED skip threshold
of >100% takes precedence).

## 4. Charge weapons (SR/RL)

- **Charge Speed is SUBTRACTIVE on charge time**: `effective = base × (1 − ΣCS%)`, floored
  at 1 frame, hard-capped at +100% (DATAMINED; StatChargeTime is a negative % on time).
  It is NOT `base / (1+CS)`. A unit whose kit grants immunity to Increase/Decrease Charge
  Speed effects contributes nothing to that sum from external sources — see §11.
- **SR bolt cycle**: +22 frames after each shot (MEASURED: helm recording, 1.37s cycle =
  60f charge + 22f). Weapon-swap states and `charFixes.noBoltRecovery` units are exempt.
  Reload starts immediately after the final shot.
- **Whole-magazine dump** (`charFixes.magDumpRof`): `cinderella` charges ONCE per magazine, then
  autofires all 24 rounds at her datamined `rate_of_fire` without recharging, then reloads and
  re-charges (MEASURED 2026-07-21, ammo-counter frame read; ≈390 pulls/180s). Charge Speed
  shortens only the once-per-mag prime charge. Details: [charge-weapons.md](charge-weapons.md) §2a.
- **Auto always full-charges** (DATAMINED, einkk `NikkeFullChargeMode.always`) — but
  full-charge-GATED procs miss on ~32% of auto releases (§7).
- Full-charge multiplier is per-weapon-per-unit (SR typ. 250%, Alice 350%); ordinary Charge
  Damage ▲ buffs add flat points inside the charge bucket; `chargeDamageMultPct`-class buffs
  (Helm burst, collection items) multiply BASE charge damage.
- Excess charge speed past the +100% cap is wasted, except explicit kit conversions
  (Red Hood S1: excess × 2.4 → Charge Damage).
  Details + decoded examples (Red Wolf's 200rpm fire-rate-gated window):
  **[charge-weapons.md](charge-weapons.md)**. Engine: charge block in the per-frame loop.

## 5. Effective range & the test boss

+30% damage when the target sits in the weapon's effective band; **RL never gets it**;
the bonus lives in the Major bucket. Test-boss movement is a fixed script (MEASURED):
mid 0–33s → near 33–70 → far 70–106 → midfar 106–144 → near 144–176 → midfar 176–180,
with band eligibility near=SG, mid=SMG+AR, mfar=SR, **mid-far=SR+MG**. Each transition has a 1s
unhittable window; units whose EFFECTIVE reload is ≤1s get a free full reload during it.
The machine-gun row is MEASURED (2026-07-14, the crown solo recording): popup class ratios
read the bonus present in the far band ONLY — mid, near, and mid-far all read the no-bonus
signatures (~~the old table granted machine guns the mid-far band~~ SUPERSEDED 2026-07-14).
The same recording showed the bonus flips track the boss's physical walk, leading/lagging the
scripted boundaries by ~4–6 seconds — the real trigger is instantaneous distance crossing the
weapon's optimal ring, and the band table approximates it. Raw measurements:
**[range-data.md](range-data.md)** (user, 2026-07-13) + probe u7 battery 4 (2026-07-14). The
+30%/RL-never rule is community-verified ([nikke.gg damage formula](https://nikke.gg/damage-formula/),
[ore-game verify-memo](https://ore-game.com/nikke/post/verify-memo/)); the band timeline and
weapon-band eligibility are OUR boss-specific measurements. Engine: `BOSS_RANGE_SCRIPT`,
`RANGE_ELIGIBLE`, `UNHITTABLE_FRAMES`.

## 6. Burst gauge generation

Gauge = 10,000 energy; fill counts HITS, not damage. Per trigger pull vs the boss the
gauge gains the unit's DATAMINED `target_burst_energy_pershot` (universally exactly 2×
the non-target base — the "boss ×2" is a table column, not a rule; per-unit values in
`data/gauge-per-shot.json`, e.g. standard launcher 280, sniper 560, Trina's famous
battery 720). The CAMERA-FOCUSED unit's charge weapon generates ×(1 + 1.5×charge) = ×2.5
at full charge; unfocused charge units generate flat ×1.0 — both sides MEASURED (two solo
recordings plus a paired two-unit experiment with only the focus changed). Focus defaults
to the middle slot (owner convention; recordings with a different focus perturb the fight
they record). Skill
hits and DoT ticks generate the caster's flat target value (no charge bonus); a sequential
multi-hit skill rider credits once per sub-hit via `flatDamage.gaugeHits` while keeping its
damage aggregated. Non-damage ENEMY-debuff applications — including periodic
re-applications/refreshes — generate the caster's full per-trigger value once per application,
by default for every trigger shape except per-shot on-bullet riders and the explicitly-known
non-generating skills (owner rulings 2026-08-16: `jackal` S1 owner-confirmed; the refresh half
rests on community-expert testimony the owner ruled trusted; scope ruled generate-by-default —
see burst-gauge.md §5; engine: `applicationGauge`). Ally/self-targeted pure buffs, heals, and
shields generate nothing.
**Gauge is generated in exactly ONE window per cycle: after a Full Burst ENDS and before the
next burst chain STARTS** (owner ruling, re-confirmed 2026-08-13 — settled, do not re-measure).
Opening the chain CONSUMES the gauge, and during the chain (stages 1-3) or Full Burst NOTHING
generates it — not bullets, skill hits, DoT ticks, riders, or "Gain Burst Gauge X%" effects. No auto-play efficiency factor exists (the old 0.7 ⚑ compensated for the chain
mechanics, now modeled directly). Full model + sources + the two solo measurements:
**[burst-gauge.md](burst-gauge.md)**. Engine: `gaugePerShot`/`addGauge`/`skillGauge`.

## 7. Auto behaviors

All of §7 exists because scope-lock runs are full auto — manual play changes these numbers.
Details: **[auto-play.md](auto-play.md)**.

- **Core rate for accuracy-circle weapons (AR/SMG/SG) = UNIFORM-IN-CIRCLE geometry ("UNIGEO",
  LIVE default `'all'` 2026-07-22; DECISIONS 2026-07-22).** Shots/pellets land **uniform per area**
  inside the aim circle, whose on-screen radius is **R(hr) = (0.648 × the unit's datamined
  `start_accuracy_circle_scale` ÷ 2) · (1 − Hit Rate/100) px** — the circle shrinks LINEARLY to zero
  at Hit Rate 100 (MEASURED: two owner-traced native-resolution frames, 79.3 px at HR 0 / 48.2 px at
  HR 38.91, weapon-matched shotgun pair; cross-validated by machine circle-fits and the bloom-peak
  px calibration). A hit cores iff it falls in the boss-core disc:
  **SG** core-per-landed-pellet = (r_core(band)/R(hr))² ÷ coverage; **AR/SMG** core-per-hit =
  the lens overlap of a uniform disc of radius f_bloom·R(hr), centered δ(hr) = δ0·(1−hr/120) px off
  the core, with the core disc (⚑ CALIBRATED per class: δ0 = AR 15.9 / SMG 17.9 px, f_bloom =
  AR 0.578 / SMG 0.728 — the SMG pair is a saturated 2-cell fit, flagged). Core diameters: near
  31 px MEASURED; mid/midfar/far = 20.9/15.8/12.7 px **⚑ FIT-SELECTED** (owner re-trace supersedes).
  The uniform distribution is MEASURED directly — 101 machine-read per-pellet marker positions
  refute the previous Gaussian at KS 0.376 (crit 0.135) — and the drawn reticle remains decorative.
  Effect rises steeply with Hit Rate (the shrinking circle concentrates onto the core; AR at ▲80 is
  all-core geometrically because the circle fits inside the core). **MG/SR/RL keep the flat 0.95
  base rate** (no accuracy circle). **The prior δ-offset ("Rician") Gaussian cone survives on two
  paths only** — `UNIGEO=off` (byte-identical revert arm) and medium/large `bossPelletProfile`
  fights (the coverage tables are the scope-lock boss silhouette) — with its frozen params in
  `sg-geometry.ts`, never refit. Evidence: the owner's 728-pellet hand count (18 cells, 4 bands ×
  Hit-Rate on/off) reproduced by the engine untuned; a pre-registered replication; the marker-position
  read. Engine: `src/engine/unigeo.ts` (+ `unigeo-coverage.ts`); full record
  `docs/handoffs/2026-07-22-sg-geometry-handoff.md` + DECISIONS 2026-07-22.
- **Early charge releases are rare (~2% of shots**, user-observed ~3/fight from boss
  interruptions) — auto effectively always full-charges, and full-charge-gated proc counters
  fire on essentially every shot. Maiden:IR's former ×0.68 proc factor is RESOLVED as her
  release-latency cadence, video-measured (open-questions A12; [auto-play.md](auto-play.md) §2a).
- **Burst-chain timing** (frame-perfect MEASURED 2026-07-21, chisato.mov; DECISIONS 2026-07-21
  coherent rotation model): the chain runs **`gauge-full → 30f → B1 → 30f → B2 → 30f → B3 → 22f →
FB countdown (10s)`**. So gauge-full → FB-start ≈ 112f (~1.87s), not the old ~0.9s. Constants:
  a **30f delay before B1** (`PRE_B1_GAP_FRAMES`), **30f between stages** (`STAGE_CAST_GAP_FRAMES`,
  0.5s), and a **22f delay between the B3 cast and the FB countdown** (`FB_PRE_DELAY_FRAMES`) — that
  gap is why instant burst-cast attacks land before Full Burst begins (no +50%). After FB ends there
  is NO chain-open lock (owner ruling 2026-08-04, overturning the earlier "~2.5-3s post-FB block"
  read): gauge generation is locked during FB and unlocks immediately at FB-end, and the next chain
  opens the moment the refilled bar is full — good teams take ~3-4s of natural generation to rebuild
  from zero, which is what the old bar-anatomy reads mistook for a fixed delay (the recordings also
  start before the 3:00 clock, so video timestamps ≠ fight time). The fixed block survives only as
  the opt-in `ROTMODEL=floor` A/B arm (`POST_FB_CHAIN_DELAY_FRAMES` = 150f). **Fight start:** ~8f (`FIGHT_DELAY_FRAMES`
  0.133s) before the first bullet (bullet lands at 0.133s; the earlier 1s was a timer-framing confound —
  the 3:00 timer reads 2:59:999 at elapsed 0; there is NO multi-second opening phase — the boss is
  hittable from 3:00). The chain timing + natural gauge refill pace high-generation teams.
- **Casts are blocked while the boss is off-screen** during a range transition (~1s,
  owner-confirmed) — the only genuine source of run-to-run full-burst-count variance
  (a transition colliding with a chain). Everywhere else, **full-burst counts are
  cooldown/chain arithmetic and deterministic run-to-run** — the graded comps are pinned
  as exact asserts in `scripts/regression.ts`.
- **SG pellet landing = 0.96 × coverage(band, R(hr))** (LIVE with UNIGEO, 2026-07-22) — the fraction
  of the Hit-Rate-state aim circle covered by the boss silhouette (owner-traced, range-scaled
  px ∝ 1/distance at band distances 20.7/30.7/40.7/50.7), times a MEASURED 0.96 tracking-wander
  loss (the auto-aim circle sits slightly off the moving boss at times — owner-ruled real).
  **Landing is Hit-Rate-dependent** (the shrinking circle pulls pellets onto the body): at HR 0 ≈
  near .813 / mid .712 / midfar .657 / far .607; at ▲38.91 ≈ .960/.873/.725/.710 — matching the
  owner's 728-pellet hand count (near-OFF measured 0.780, near-ON 0.931, etc.). Landing scales SG
  shot damage AND per-pellet burst-gauge generation (`unigeoSgLanding` → the gauge feed — the
  per-LANDED-pellet gauge crediting is owner-CONFIRMED 2026-08-14: a missed pellet generates
  nothing, U40); seeded
  runs draw whole landed-pellet counts as before. The boss silhouette is non-convex (hourglass +
  wide shoulders), which is why coverage stays nearly flat with range while the core shrinks 45% —
  the old "flat per-band table" (near 0.888 / mid 0.986 / far 0.74 / midfar 0.888, HR-blind,
  counter-reconciled against the old flat-core model) sat 12–24% ABOVE the directly-counted landing
  and survives only on the `UNIGEO=off` revert path. Scope-lock boss only — medium/large
  `bossPelletProfile` fights fall through to the cone path. → DECISIONS 2026-07-22;
  `docs/probe-data/soda-tb-sg-core-hr-windows.json` (the count of record).
- Auto burst priority is **first-ready, with waiting** (owner ruling 2026-07-21,
  DECISIONS): inside a timed stage window the chain waits for the stage-filling unit
  whose cooldown ends SOONEST (tie → leftmost) rather than handing the cast to a
  lower-priority ready unit. This replaced the old strict-leftmost wait, which let the
  leftmost slot MONOPOLIZE equal-cooldown alternation (a 40-team random battery: ~1/3 of
  comps differed, all first-ready correcting a leftmost monopoly/skip; graded board
  byte-neutral). `B3_LEFTMOST=1` restores the old strict-leftmost pick. (A round-robin
  was tried earlier and rejected — bench B3s cast where real fights never pick them.)
- **Focus-sync burst gate** (`burstGate: 'syncWithFocus'`, `PreparedUnit`/`UnitState`): an
  opt-in per-unit flag — used by the DPS-chart Hyper Carry frameworks for Mast — that lets a
  unit take its burst stage only while the focus (tested) unit is off cooldown (so it bursts
  with the carry, never in a Helm-only chain) AND makes it sit out the full burst after every
  3rd of its own bursts (Mast's Hangover 10s self-stun): the gate skips it on every 4th of the
  focus unit's bursts, and Crown fills that Burst-2 slot. Not a measured value — a modeling
  switch (see [DECISIONS](../DECISIONS.md)).
- **Every-other burst gate** (`burstGate: 'everyOther'`): an opt-in per-unit flag — used by
  the DPS-chart Solo framework on the tested unit — that forbids a unit from taking the
  stage-3 cast in two consecutive Full Bursts, so it strictly alternates with the other
  Burst-3 unit. Needed because a Full-Burst-extending kit (e.g. Modernia's 15-second Full
  Burst) can bring the unit's cooldown inside the next stage window, where the
  first-ready-with-waiting rule would stall the chain and hand it consecutive casts. Not a
  measured value — a framework modeling switch; no real comp sets it.

## 8. Burst rotation rules

**What Full Burst itself does (owner ruling 2026-07-22): the +50% damage multiplier, and nothing
else.** Full Burst carries no inherent change to accuracy, aim, spread, cover behaviour or fire
rhythm — any such effect in a fight comes from a unit's kit firing on Full-Burst entry, never from
the state itself. **How to apply when reading footage:** an in-Full-Burst vs out-of-Full-Burst
comparison of a geometry quantity (pellet landing, core-hit fraction, hit rate) is NOT confounded by
the Full Burst state, so such a split may be used directly as a control for whatever kit buff is
being isolated. Only damage magnitudes need the +50% removed.

Full Burst = 10s; rotation = FB + chain + gauge refill, gated by burst cooldowns. A
Burst-1/2 cast opens the next stage for 10 seconds (DATAMINED `burst_duration`; 5s/15s/
20s variants exist — the same column encodes short-Full-Burst units); if the window
expires with no ready caster the chain collapses and the gauge must fully refill
(measured: the 3-unit battery fight's 40s rotation). Auto-burst picks the FIRST-READY
unit of the wanted stage — inside a timed stage window the filler whose cooldown ends
soonest (tie → leftmost); `B3_LEFTMOST=1` restores the old strict-leftmost pick
(DECISIONS 2026-07-21). Burst cooldowns
(20s/40s per unit; DB errors exist — Tia's real CD is 20s, fixed via
`charFixes.burstCooldownSec`; Cinderella's 40s was re-verified correct by nuke-storm
counting after a cut-in-artifact misread). Λ (all-stage) units count as NO burst type for formation
checks; Tia is a "B1+" (re-entry B1; the Tia+Anis:Star interaction is deliberately
unmodeled). `reenterStage` (Tia, Anis Everyone's Star) re-opens stage 1 mid-rotation;
`burstFirst` (Prika duet) claims the first burst of its stage; once-per-battle CD refunds
exist (Red Hood B1/B2). Burst-cast damage timing (MEASURED 2026-07-13, popup-verified on Cinderella's nuke
across two fights): burst-skill damage dealt at cast lands BEFORE Full Burst begins — it
receives neither the +50% Full Burst multiplier NOR "when entering Full Burst" auras
(one rule covers both; independently corroborated by the JP DayWrite formula article).
Buffs granted by earlier casts in the same rotation (a Burst-2's team buff) DO apply.
Burst-originated damage landing DURING the window (DoT ticks, stored hits, per-shot
procs) still gets the +50% and the entry auras. Engine ordering: burst-cast blocks
resolve before full-burst-entry triggers; stored-hit releases after. Scope note
(2026-07-13): the measured rule governs the burst button's OWN cast damage; a skill-slot
effect that merely triggers on a burst cast resolves after the window opens and does get
the +50% (though not same-cast self-buffs or entry auras) — this distinction is why Snow
White: Heavy Arms's Fully Active volley was re-modeled onto her in-window full-charge
shots (see damage-calculation.md §2b), where the community sources place it. Sources: leftmost priority
([Inven](https://m.inven.co.kr/webzine/wznews.php?site=nikke&p=2&idx=303197),
[nikke.gg](https://nikke.gg/mastering-burst-chains-the-core-combat-mechanic-every-nikke-player-needs-to-understand/)),
chain timing ([nikke-synergy](https://nikke-synergy.com/arena-guide_en)), Λ/B1+/CD rulings
(user, 2026-07-13), Red Wolf CD refunds (decoded,
[rcasdzxc/SD](https://github.com/rcasdzxc/SD)).

## 9. Skill procs, DoTs, and damage flavors

"Deals X% of final ATK as additional damage" lines are FUNCTION-type skill damage
(DATAMINED): they **crit at the caster's rate, never core, never get range, take the FB
+50% only when they land during Full Burst**, use the Element and Damage-Up buckets, and
never take charge multipliers. Weapon-based deliveries (launchWeapon: Anis:Star's stars,
Rapi:RH's projectiles) DO core+crit but still no range. DoTs are Sustained-flavored
function damage whose ticks reference CURRENT buffs (not snapshots); tick-crit is
ON by default (`DOT_CRIT`, U13 2026-07-21). **TRUE DAMAGE CAN CRIT** (owner ruling 2026-07-25,
in-game confirmed; reverses the 2026-07-21 "true damage never crits" ruling — which was recorded
but never implemented in the engine: there is no `crit && !trueFlavor` guard, `dealDamage` gates crit on
`opts.crit` alone. So `flavor:"true"` dots/flatDamage + `trueNormals` windows crit at the caster's rate
like any other hit. Sustained/True/Sequential Damage ▲ buffs gate on hit flavor.
Full rules table: **[nikke-damage-formula.md](nikke-damage-formula.md)** §3.

Some kit lines with NO printed "Activates when…" clause are **internal-cooldown skills**:
the effect just fires every N seconds of battle (OWNER-stated mechanic 2026-07-20; first
example: Snow White `snow-white`'s Skill-2 144.73% area damage, cooldown 15 s /owner).
Engine: the `interval` trigger fires every N sec, first at t=N — the first-fire phase
(t=N vs t=0) is a ⚑ convention pending a popup-cadence read.

Shield-gated kit lines ("when/if a Shield is set in front of this unit" — Naga `naga`)
follow the REAL shield machinery (owner-ruled default-off 2026-07-20): "when a Shield is
set" lines fire on the shield-application EVENT (`shielded` trigger); "if a Shield is set"
lines check the live shield-state WINDOW at their own trigger time (`requiresShielded`,
window = the emitting shield's stated duration). No shielder in the team ⇒ the lines are
inert. Same-squad gates ("with an ally from the same squad on the battlefield") are
static team-composition checks, exact at scope lock where no ally ever dies. The
primitive is `teamHas.sameSquad`: squad membership is curated in `src/data/squads.ts`
(characters.json has no squad axis) and the gate fails closed for unmapped owners.
Squad of Blanc `blanc` / Noir `noir` / Rouge `rouge` — owner-confirmed 2026-08-02
(extending the 2026-07-20 Noir ruling; the bunny/maid units are a DIFFERENT squad, a
common misread): Blanc's S2 burst-CDR is gated on it. Noir's same-squad burst line
still uses the older `teamHas.slugs:['blanc','rouge']` spelling (same extension,
migration pending). M.M.R. (Tia `tia` / Naga `naga` / Marciana `marciana`,
owner-confirmed 2026-08-02) is seeded in the map; no gate consumes it yet.

## 10. Elemental advantage

×(1.1 + Element Damage ▲ sources + Superior-element Damage ▲ sources) as its own bucket,
only with advantage; both `elementDamagePct` and `elemAdvantageDamagePct` live here. Wheel:
Fire→Wind→Iron→Electric→Water→Fire. No hidden bonus beyond the base 1.1
([nikke.gg](https://nikke.gg/damage-formula/),
[ore-game](https://ore-game.com/nikke/post/verify-memo/),
[official @NIKKE_en stacking clarification](https://x.com/NIKKE_en/status/1678710452862472193)).

## 11. Buff stacking & targeting rules

- Same buff name + same application scope: re-application REFRESHES (overwrites), never
  co-stacks; same effect from different scopes stacks (KR consensus:
  [arca.live/b/nikketgv/129255162](https://arca.live/b/nikketgv/129255162); official:
  [@NIKKE_en](https://x.com/NIKKE_en/status/1678710452862472193)). IMPLEMENTED 2026-07-13:
  the engine dedupes same (caster, skill slot, stat, value) across trigger blocks — found
  live on Crown's two S1 "Reloading Speed ▲ 44.35%" lines, which the old engine stacked to
  88.7%. (Namu confirms her kit actually targets disjoint groups — burst casters vs
  non-casters — so no unit legitimately receives both lines; the dedupe matches real kit
  structure.)
- **A unit can be IMMUNE to a stat on the receiving side.** Kit lines shaped "Gains immunity to
  Increase/Decrease `<stat>` effects" (`liberalio` skill 2, Charge Speed) are enforced where the
  buff is APPLIED, not where the stat is read: the immune stat is stripped out of the incoming
  buff for that unit only. The strip is per stat and per target — a different stat bundled in the
  same buff block still lands on her (`maxwell`'s skill 1 grants Charge Speed and ATK in one cast:
  the ATK applies, the Charge Speed does not), and every other target of that same cast is
  unaffected. Direction-blind (an increase and a decrease are both stripped) and source-blind
  among kits. **The immunity blocks IN-BATTLE BUFF EFFECTS ONLY — cube and Overload gear stats
  still apply to the holder (owner ruling 2026-08-14)**, which is why enforcing it at buff
  application is the faithful model rather than an approximation: gear stats are resolved into the
  unit at construction and never pass through that path. Encoded as the per-unit
  `charFixes.statImmunities` list (2026-08-14).
- Buff windows come in TWO kinds and they are not interchangeable. Most are **timed** (a
  seconds duration). Kit lines reading "**for N round(s)**" are **round-scoped**: they end
  after the holder fires N bullets, so the window stretches across a reload and shrinks if the
  unit is given attack-speed support. IMPLEMENTED 2026-07-23 as `durationShots` (a round = one
  bullet, `hitsPerShot` for an MG, spent right after the shot so the Nth shot still benefits).
  A round count can be genuinely inexpressible as a duration — helm's burst runs 10 rounds on a
  6-round magazine, so it necessarily spans a reload. NB a "reload speed is **fixed at** x for N
  rounds" line is a stat CLAMP, a different mechanic, still unmodeled.
- A Critical Rate buff may be scoped to **normal attacks only** ("Critical Rate of normal
  attacks ▲x%", helm S1) — it never lifts crit on skill procs or burst damage, even when the
  buff targets the whole team. Distinct from an unscoped "Critical Rate ▲x%".
- "ATK ▲ X% of caster's ATK" adds the CASTER's final ATK × X as a flat term (strong from
  high-ATK buffers); plain ATK ▲ dilutes into the (1+ATK%) sum
  ([nikke.gg damage formula](https://nikke.gg/damage-formula/)).
- Damage Taken ▲ debuffs from different sources stack; no cap found
  ([ginmy.net bracket test](https://ginmy.net/nikke_atkdamagebuff_test)).
- Max Ammunition ▼ clips the CURRENT belt when it lands (MEASURED/user); max-ammo sources
  stack additively. Increases never clip.
- Distributed damage deals the same TOTAL against 1 target as against many (user-verified).
- **Charge Speed above 100% does nothing to charge TIME** (the engine caps it at 100 when it
  computes the charge, `sim.ts`), which is why kits that push past 100 pair it with a conversion
  line: `red-hood`'s "Convert excess value over 100% of Charge Speed to Charge Damage ▲240% of the
  excess" is modeled as the `convertExcess` DERIVED-stat primitive (2026-08-11) — Charge Damage is
  recomputed from her live Charge Speed on every read, so it ramps with her stacks (1.92 at zero →
  93.36 at ten) instead of being baked to an average.
- Pierce Damage ▲ is a **Damage-Up-bucket** entry that benefits any Pierce-damage-type unit —
  static (`hasPierce`/`pierceModes`), during a timed "Gain Pierce for N sec" window
  (`gainPierce` → `pierceUntilFrame`, 2026-07-17), while a **"Gain Pierce for N round(s)" budget is
  unspent** (`gainPierce.durationShots` → `pierceShotsLeft`, 2026-08-11 — a ROUND count, spent by
  firing rather than by the clock, so it survives reloads and lulls; one round per pull,
  `hitsPerShot` per pull for a machine gun, and the granting round never spends it), OR — swap-scoped — on the shots of a burst
  weapon-swap whose "Additional Effect: Pierce" belongs to the swapped weapon only
  (`weaponSwap.hasPierce` → per-shot tag, 2026-07-20, owner-ruled; Snow White `snow-white`'s
  cannon). It **applies on the partless boss** (it is ordinary damage-up, not the double-hit
  below — do not conflate the two).
- Pierce core+body double-hits are a MULTI-PART-boss mechanic
  ([nikke.gg index](https://nikke.gg/index/); TV Tropes corroboration); on the partless
  test boss there is no doubling (OUR A/B test vs run A, 2026-07-13; engine
  `PIERCE_CORE_DOUBLE = false` switch retained).

## 12. Environment & data-source caveats

- Everything assumes 60 fps with the "Min Firing Rounds Adjustment" setting ON; MG/SMG/AR
  DPS is strongly FPS-dependent below that (COMMUNITY).
- blablalink (official) skill data LAGS balance patches — the 2026-07-02
  distributed-damage compensation (SBS +13%, Elegg reworks;
  [@NIKKE_en](https://x.com/NIKKE_en/status/2069084116591796521),
  [nikke.gg patch notes](https://nikke.gg/july-2-patch-notes/),
  [ruliweb notice](https://bbs.ruliweb.com/news/board/320108/read/2290922)) was still
  absent on 2026-07-13; post-patch values are pinned in the affected overrides. Re-verify
  after each sync. Historical DPS-affecting bug catalog:
  [nikke.gg/bug-guide](https://nikke.gg/bug-guide/) (incl. the live Ark Ranger Black DoT
  timing bug).
- Solo-raid displayed per-unit damage totals include all damage the unit dealt to all
  targets (DoTs attributed to their caster).
- **On-screen damage popups belong ONLY to the currently FOCUSED unit** (the unit whose
  third-person camera is active) — user-confirmed 2026-07-13. Popup-based analysis of a
  recording measures one unit's hits, not the team's; the top damage counter still
  aggregates everyone. Record which unit holds focus when capturing footage.
- Shooting-range (사격장) numbers do NOT transfer to solo raid (different core/distance/
  element) — never calibrate against them
  ([arca.live/b/nikketgv/79367873](https://arca.live/b/nikketgv/79367873),
  [dcinside 3902276](https://gall.dcinside.com/mgallery/board/view/?id=gov&no=3902276)).

## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, verbatim)

```json
{
  "slug": "rapunzel-sanctuary",
  "name": "Rapunzel: Sanctuary",
  "weapon": "RL",
  "burst": "II",
  "class": "Supporter",
  "element": "Fire",
  "manufacturer": "Pilgrim",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200
}
```

### skill1

```text
■ Activates when performing a Full Charge attack. Affects all allies.
Restores HP equal to 3.9% of the skill user's final max HP.
■ Activates when entering Full Burst. Affects self and all allies in the Into the Fray state.
Attack Damage ▲ 27.45% for 10 sec.
■ Activates when using Nanoparticle Injection. Affects self.
Cooldown of Burst Skill ▲ 40 sec. This effect cannot be removed.
Nanoparticle Consumption: DEF ▲ 10%. This effect is continuous and cannot be removed. Effect persists after revival.
■ Activates only when at Full Charge during a Full Charge attack. Affects self.
Gains immunity to effects that increase charge speed. This effect is continuous.
Gains immunity to effects that decrease charge speed. This effect is continuous.
```

### skill2

```text
■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Goddess Blessing state. Affects self.
Creates a shared shield with HP equal to 7.39% of the skill user's final max HP that protects all allies from damage. This shield is removed when charging ends.
■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Goddess Blessing state. Affects all allies.
Goddess Blessing: DEF ▲ 42.24% of the skill user's DEF for 10 sec.
■ Activates when entering Full Burst. Affects self and all allies in the Into the Fray state.
ATK ▲ 29.17% of the skill user's ATK for 10 sec.
■ Activates when performing a Full Charge attack. Affects the enemy nearest to the crosshair.
Deals 220.7% of final ATK as additional damage.
```

### burst

```text
■ Activates when this unit is not in the Nanoparticle Consumption state.
Effects vary according to the number of incapacitated allies. Only one set of effects is applied.
Activates if 3 or more allies are incapacitated. Affects all incapacitated allies.
Nanoparticle Injection: Revives with 96% HP. Activates once per battle.
ATK ▲ 101.37% of the skill user's ATK for 10 sec. Activates once per battle.
DEF ▲ 221.76% of the skill user's DEF for 10 sec. Activates once per battle.

Activates if 2 or fewer allies are incapacitated. Affects all allies.
ATK ▲ 34.84% of the skill user's ATK for 10 sec.

■ Activates when this unit is in the Nanoparticle Consumption state. Affects all allies.
ATK ▲ 34.84% of the skill user's ATK for 10 sec.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "rapunzel-sanctuary",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Full Charge attack → allies: HP 3.9%",
      "disposition": "FAITHFUL",
      "scope": "Fires on every full-charge pull (RL releases only at full charge in-sim, so every shot); heal amount is % of CASTER's final max HP, no HP pool modeled",
      "durationSemantics": "Instant event per activation, no duration",
      "triggerIdentity": "fullCharge (kit: 'when performing a Full Charge attack') — for an unswapped RL byte-identical to shotFired, but the block shape must be fullCharge",
      "targetSet": "allies (all allies; kit says 'Affects all allies')",
      "nearestWrongModel": "Dropping the heal as inert because no HP pool exists — missing that a heal effect emits recovery events that fire teammates' 'recovery' triggers (taxonomy #4 tandem rule)",
      "distinguishingAssertion": "In a comp containing an on-recovery consumer, that consumer's recovery-keyed buffApply count tracks rapunzel-sanctuary's shot-event count (one recovery wave per pull); removing the heal effect via withPatchedOverride drops those buffApplies to the consumer's own-heal baseline",
      "inertness": "Must produce zero damage events and zero stat buffApplies itself; teammates' totals move ONLY via their own recovery-triggered kit lines",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter: Attack Damage ▲ 27.45% 10s",
      "disposition": "FAITHFUL",
      "scope": "Generic Attack Damage (Damage-Up bucket, attackDamagePct) on ALL the holder's damage — not normal-scoped, not atkPct",
      "durationSemantics": "durationSec 10 (literal seconds; no 'round(s)' wording anywhere in this kit)",
      "triggerIdentity": "fullBurstEnter — 'when entering Full Burst' = any team FB, NOT burstCast",
      "targetSet": "alliesInStatus { statusPrefix: 'Into the Fray', includeSelf: true } — self unconditionally; allies ONLY while in the kit-named 'Into the Fray' state, which nothing in THIS kit opens, so in any comp without an external Fray-state carrier the target set is exactly {self}",
      "nearestWrongModel": "Reading 'Affects self and all allies in the Into the Fray state' as plain self-and-all-allies, over-crediting the whole team's Damage-Up every rotation",
      "distinguishingAssertion": "At each fullBurstStart, exactly ONE buffApply with stat 'attackDamagePct' value 27.45 whose targetIdx is rapunzel-sanctuary's own slot; zero such buffApplies land on carry/helm/liter in the standard fixture",
      "inertness": "Teammates' totals(res) must be identical with this block present vs stripped (no Fray carrier in fixture)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Nanoparticle Inj.: Burst CD ▲ 40 sec",
      "disposition": "UNMODELED",
      "scope": "Self rider fired only 'when using Nanoparticle Injection' — the burst's ≥3-incapacitated revive, unreachable in v1 (nobody dies)",
      "durationSemantics": "Permanent once applied ('cannot be removed'); never applied in-sim",
      "triggerIdentity": "Gated on the once-per-battle Nanoparticle Injection activation, NOT a passive",
      "targetSet": "self",
      "nearestWrongModel": "Applying the +40s burst-cooldown penalty passively/unconditionally — her cd 40s becomes 80s, halving burst casts and every downstream 10s buff window",
      "distinguishingAssertion": "Count her burstCast events over the sim: one per normal B2 rotation at the base 40s cooldown cadence; any encoding that stretches inter-cast gaps toward 80s is RED",
      "inertness": "No cooldown modification and no defPct buffApply may ever appear; the companion 'Nanoparticle Consumption: DEF ▲ 10%' line is doubly inert (unreachable + self-DEF inert)",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Immunity to charge speed ▲/▼ effects",
      "disposition": "FIX",
      "scope": "Receiving-side immunity to BOTH directions of charge-speed effects — exactly the charFixes.statImmunities: ['chargeSpeedPct'] primitive (in-battle buff effects only, cube/OL stats unaffected)",
      "durationSemantics": "Continuous; kit arms it on first full-charge attack but 'continuous' from her first pull (~1s) ≈ whole-fight; whole-fight statImmunities is the faithful encoding",
      "triggerIdentity": "Nominally fullCharge-armed, effectively permanent — a top-level charFix, not a block",
      "targetSet": "self (strips incoming chargeSpeedPct applications to her only; other targets of the same cast unaffected)",
      "nearestWrongModel": "Omitting the immunity — an ally's chargeSpeedPct grant shortens her 60-frame charge, inflating her pull count, her 220.7% rider count, and her per-pull heal cadence",
      "distinguishingAssertion": "withPatchedOverride a teammate to grant allies chargeSpeedPct: rapunzel-sanctuary's shot-event count and totals(res)['rapunzel-sanctuary'] are unchanged vs baseline while other recipients' cadence shifts",
      "inertness": "In the standard fixture with no charge-speed granter, encoding vs omitting must be a strict no-op",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Hold Full Charge 1s: shield 7.39% maxHP",
      "disposition": "UNMODELED",
      "scope": "Shared shield, % of CASTER final max HP, protecting all allies; gated on NOT being in Goddess Blessing (self-status duty cycle); removed when charging ends",
      "durationSemantics": "While-charging window, ended by charge release — no durationSec",
      "triggerIdentity": "'Full Charge MAINTAINED for 1+ sec' — a hold-past-full-charge mechanic; the engine's fullCharge trigger fires on RELEASE and the sim auto-releases at full charge, so this trigger has no primitive and never fires in-sim",
      "targetSet": "self (shield entity) protecting all allies",
      "nearestWrongModel": "Proxying it onto fullCharge or an interval trigger — fabricates shield events every pull, spuriously firing any teammate's 'shielded' trigger and requiresShielded gate every second",
      "distinguishingAssertion": "Zero shield events from rapunzel-sanctuary in the event log; a shield-gated teammate (naga-style) shows identical totals with her present vs absent",
      "inertness": "⚑ TANDEM FLAG: in a real comp with a shielded-trigger consumer this line is NOT nothing — document in unmodeled with the tandem caveat rather than silently dropping; recipe: footage of hold-charge uptime to decide if an interval approximation is ever warranted",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Goddess Blessing: DEF ▲ 42.24% 10s",
      "disposition": "UNMODELED",
      "scope": "DEF ▲ as % of CASTER's DEF to all allies — offensively inert in v1 (defPct has no damage consumer), and its trigger is the same unmodeled 1s-hold",
      "durationSemantics": "durationSec 10; the Goddess Blessing STATUS is the self-gate that prevents re-proc of both skill2 hold lines (noRetriggerWhileActive-shaped duty cycle)",
      "triggerIdentity": "Same hold-1s trigger as the shield line, gated 'while NOT in Goddess Blessing'",
      "targetSet": "all allies",
      "nearestWrongModel": "Encoding the DEF grant on a reachable trigger 'for completeness' — harmless today but it would misrepresent the duty cycle if a DEF consumer ever ships",
      "distinguishingAssertion": "No defPct buffApply from her skill2 in the log; if ever modeled, consecutive applications must be ≥10s apart (the Blessing window blocks re-proc)",
      "inertness": "Must move no damage total for any unit",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter: ATK ▲ 29.17% of caster ATK 10s",
      "disposition": "FAITHFUL",
      "scope": "casterAtkPct — flat ATK add resolved from the CASTER's staticAtk at apply time, NOT the target's own atkPct",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "fullBurstEnter (any team FB) — same clause shape as the skill1 FB line",
      "targetSet": "alliesInStatus { statusPrefix: 'Into the Fray', includeSelf: true } — effectively self-only absent an external Fray carrier",
      "nearestWrongModel": "Two-headed: (a) stat atkPct 29.17 (scales each target's own ATK — wrong basis), or (b) dropping the Fray gate and granting the flat add team-wide",
      "distinguishingAssertion": "At each fullBurstStart, exactly one buffApply with stat 'casterAtkPct' whose emitted value ≈ 0.2917 × her staticAtk (a FLAT number, not 29.17), targetIdx = her slot only; carry's total is unchanged when the block is stripped",
      "inertness": "No buffApply under stat 'atkPct' from this line; no application to non-Fray teammates",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge atk: 220.7% ATK add'l dmg",
      "disposition": "FAITHFUL",
      "scope": "Instant flatDamage rider per full-charge pull, % of HER final ATK, single enemy — her main personal damage line",
      "durationSemantics": "Instant per activation",
      "triggerIdentity": "fullCharge, target enemy — every pull for an unswapped RL (ammo 6 → 6 riders per magazine, continuing across reloads)",
      "targetSet": "enemy ('the enemy nearest to the crosshair' = the single boss)",
      "nearestWrongModel": "Granting the rider core eligibility (tempting next to her 200 coreAttackMultiplier) and/or the +30% range bonus — riders crit at caster rate but get NO core and are force-noRange; secondary misread: folding it into chargeDamagePct, which would wrongly core+range it",
      "distinguishingAssertion": "One skill-bucket damage event (srcSlot skill2) per shot event, mult = 220.7% of final ATK with rangeApplied === false and zero core component, taking FB by landing timing; event count == her pull count",
      "inertness": "Must not appear in the charge or burst buckets; must not scale with coreDamagePct buffs",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "≥3 incap: revive 96% / ATK ▲101.37%",
      "disposition": "UNMODELED",
      "scope": "Once-per-battle revive branch (Nanoparticle Injection) + casterAtkPct 101.37 + casterDefPct 221.76, all targeting INCAPACITATED allies only — unreachable in v1 (immortal roster, 0 incapacitated always)",
      "durationSemantics": "10s buffs, once per battle",
      "triggerIdentity": "burstCast branch selected by incapacitated-ally count, gated 'only one set of effects is applied'",
      "targetSet": "all incapacitated allies (empty set in-sim)",
      "nearestWrongModel": "Applying the 101.37% caster-ATK buff on every cast (or first cast) — a ~3× over-credit of her burst's ATK payload vs the live 34.84 branch",
      "distinguishingAssertion": "No buffApply whose flat value ≈ 1.0137 × her staticAtk ever appears in the log; the only burst-sourced ATK buffApply value is ≈ 0.3484 × staticAtk",
      "inertness": "Zero events from this branch, ever",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "≤2 incap: ATK ▲ 34.84% caster ATK 10s",
      "disposition": "FAITHFUL",
      "scope": "casterAtkPct flat add, team-wide — the always-live branch (0 incapacitated always ≤2) and her main support payload",
      "durationSemantics": "durationSec 10 — only ~25% uptime on a 40s-cd burst; must expire by expiresFrame, not persist",
      "triggerIdentity": "burstCast (stage 2) — HER OWN burst skill's body, NOT fullBurstEnter; diverges whenever another Burst-II unit shares the team, and applies pre-FB-window by cast timing",
      "targetSet": "allies (all allies including self; no 'except self' clause)",
      "nearestWrongModel": "Keying to fullBurstEnter (over-fires in multi-B2 comps and shifts apply timing to FB entry), or stat atkPct 34.84 scaling each target's own ATK instead of a uniform flat add from HER staticAtk",
      "distinguishingAssertion": "One buffApply per unit slot (casterIdx = her idx) with stat 'casterAtkPct', value ≈ 0.3484 × HER staticAtk (identical across all targets), on the frame of her burstCast event — strictly BEFORE that rotation's fullBurstStart; expiresFrame ≈ cast + 10s",
      "inertness": "No application on a rotation where she does not cast (single-B2 fixture: she casts every rotation, so pin the cast-frame coincidence instead)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "In Nanoparticle state: ATK ▲ 34.84%",
      "disposition": "UNMODELED",
      "scope": "Alternate burst body while IN Nanoparticle Consumption — state unreachable in v1, but its payload is IDENTICAL to the ≤2-incap branch (same stat, magnitude, targets, duration), so collapsing the burst to one unconditional 34.84 block is behaviorally exact",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast, gated on the Nanoparticle Consumption self-status",
      "targetSet": "all allies",
      "nearestWrongModel": "Encoding BOTH branches on reachable gates so both fire — double-applying (refresh makes this damage-neutral, but it pollutes event-count assertions) ",
      "distinguishingAssertion": "Exactly one burst-sourced casterAtkPct buffApply per target per cast — never two",
      "inertness": "No distinct second buff key from the burst slot",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:fullCharge-heal-3.9pct-recovery-tandem",
    "skill1:fullBurstEnter-attackDamagePct-27.45-self+fray",
    "skill1:chargeSpeed-statImmunity-both-directions",
    "skill2:fullBurstEnter-casterAtkPct-29.17-self+fray",
    "skill2:fullCharge-rider-220.7pct-enemy",
    "burst:burstCast-casterAtkPct-34.84-all-allies-10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Cooldown of Burst Skill ▲ 40 sec",
      "Nanoparticle Consumption: DEF ▲ 10%"
    ],
    "skill2": [
      "shared shield, 7.39% of caster max HP",
      "Goddess Blessing: DEF ▲ 42.24% 10 sec"
    ],
    "burst": [
      "Revives with 96% HP, once per battle",
      "ATK ▲ 101.37% (≥3 incapacitated branch)",
      "DEF ▲ 221.76% (≥3 incapacitated branch)",
      "in Nanoparticle state: ATK ▲ 34.84%"
    ]
  },
  "notes": "FIXTURE: she is Burst II — controlComp's crown occupies B2, so tests need a comp with a B1 + B3 and HER as the B2 (a lone-B2 check is moot; the chain concern mirrors the harness's B3 warning). Expected shared-prior misreads, in order of damage: (1) 'self and all allies in the Into the Fray state' (both FB-enter lines) misread as plain team-wide — nothing in HER kit opens 'Into the Fray', so in isolation both FB buffs are SELF-ONLY; a team-wide encoding over-credits the carry's Damage-Up and flat ATK every rotation. Encode alliesInStatus{statusPrefix:'Into the Fray', includeSelf:true}, never plain allies. (2) burst keyed to fullBurstEnter instead of burstCast — identical in a single-B2 fixture (she casts every rotation), so ONLY a cast-frame-vs-fullBurstStart-frame assertion distinguishes them; demand it. (3) the skill1 'Burst CD ▲ 40 sec' penalty applied passively (cd 40→80s) — it is gated on the unreachable Nanoparticle Injection; assert normal cast cadence. (4) rider defaults on the 220.7% line: no core, no range, FB by timing, crit at sheet rate. (5) Both reachable burst branches grant the identical 34.84 — one unconditional block is exact; branch-gating machinery (selfStatus for a state that can never open) is over-modeling. (6) The heal and shield lines are tandem channels, not damage: the heal IS modelable (fullCharge heal → recovery events, per-pull cadence ≈ 1/s is an unusually fast recovery pump — valuable with on-recovery consumers); the shield is NOT (hold-charge-1s has no engine primitive; the sim auto-releases at full charge) and must go to unmodeled with a tandem caveat, not get a proxy trigger. (7) charge-speed immunity → charFixes.statImmunities:['chargeSpeedPct'], a top-level fix a block-only driver will miss; it covers both ▲ and ▼ directions. All magnitudes are kit-literal (DATAMINED); no CALIBRATED ⚑ values are needed anywhere — a precise invented value should be treated as a red flag. Every duration in this kit is literal seconds; no round-count lines exist.",
  "model": "claude-fable-5"
}
```

### 4b. Second S2b reviewer (claude-fable-5-1, blind — Tier-2 ×2 models)

```json
{
  "slug": "rapunzel-sanctuary",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Full Charge attack → all allies: HP 3.9%",
      "disposition": "FAITHFUL",
      "scope": "Every charged pull (unswapped RL releases only at full charge, so fullCharge ≡ one fire per shot). Heal only; no damage.",
      "durationSemantics": "Instant, one recovery event per shot (ticks:1).",
      "triggerIdentity": "fullCharge (NOT interval, NOT lastBullet). Byte-identical to shotFired for this unit but the block shape must be fullCharge.",
      "targetSet": "allies (all allies, self included per NIKKE 'all allies' convention; excludeSelf must be absent).",
      "nearestWrongModel": "Dropped as 'defensive/inert' (no damage) — or keyed to lastBullet (one heal per 6-shot magazine instead of per shot). Both starve a teammate's 'recovery' trigger (crown).",
      "distinguishingAssertion": "In controlComp(carry): count crown's recovery-keyed buffApply events (casterIdx === crown idx) with the shipped override vs withPatchedOverride('rapunzel-sanctuary', o => o.skill1 = o.skill1.filter(b => !b.effects.some(e => e.kind==='heal'))). Shipped count must exceed the stripped count, and heal-driven refreshes must track her shot cadence (~1 per shot event), not ~1 per reload event.",
      "inertness": "No damage event from this block; totals(res)['rapunzel-sanctuary'] unchanged when the heal block is stripped (heal is damage-inert for the caster herself). Self-inclusion is not observable in the fixture (she has no recovery trigger) — note, do not fabricate an assertion for it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ entering Full Burst: Attack Damage ▲ 27.45% 10s",
      "disposition": "FAITHFUL",
      "scope": "Generic Damage-Up bucket (attackDamagePct) on all of the holder's damage incl. the skill2 rider. Not charge-scoped, not crit-scoped.",
      "durationSemantics": "durationSec 10 (wall-clock). No stacks.",
      "triggerIdentity": "fullBurstEnter (ANY team Full Burst, incl. rotations where crown casts B2 instead of her). NOT burstCast.",
      "targetSet": "alliesInStatus { statusPrefix: 'Into the Fray', includeSelf: true } — self unconditionally; allies only while THEIR kit-named 'Into the Fray' selfStatus window is open. No fixture unit opens that status, so in controlComp the recipient set is exactly {self}.",
      "nearestWrongModel": "target 'allies' (whole team unconditionally) — over-credits liter/crown/helm by +27.45 Damage Up every FB. Second-nearest: keyed to burstCast (under-fires on rotations where crown takes B2).",
      "distinguishingAssertion": "Filter buffApply stat==='attackDamagePct' && value===27.45 && casterIdx===rapunzel idx: count === number of fullBurstStart events (not her burstCast count), and every such event has targetIdx===casterIdx (self only). Then withPatchedOverride on a fixture ally (e.g. helm: add a battleStart block {kind:'selfStatus', name:'Into the Fray', durationSec: 9999} target self) and assert helm NOW also receives the 27.45 attackDamagePct buffApply — proves alliesInStatus rather than a bare 'self' target.",
      "inertness": "In the unpatched fixture no buffApply attackDamagePct 27.45 lands on liter/crown/helm; helm's totals unchanged vs a run with this block stripped.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ using Nanoparticle Injection: Burst CD ▲ 40 sec",
      "disposition": "UNMODELED",
      "scope": "Self burst-cooldown penalty riding the revive branch.",
      "durationSemantics": "Permanent ('cannot be removed').",
      "triggerIdentity": "Fires only when the burst's ≥3-incapacitated branch (Nanoparticle Injection) activates. v1 has no HP pool / no deaths, so the branch never activates and this never fires.",
      "targetSet": "self.",
      "nearestWrongModel": "Encoded as a passive/battleStart self burstCdr of -40 (cooldown 40s → 80s), halving her burst cadence; or as a 'burstCast' rider so every cast lengthens her CD.",
      "distinguishingAssertion": "Her burstCast events are spaced consistent with the base 40s cooldown over a long fight (interval between consecutive own casts never ≥ 80s solely due to CD); no burstCdr effect on her self in the override; no buffApply with stat 'defPct' value 10 from her casterIdx.",
      "inertness": "Must not move her cast count or anything else; belongs verbatim in unmodeled.skill1.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Nanoparticle Consumption: DEF ▲ 10% continuous",
      "disposition": "UNMODELED",
      "scope": "Self DEF (inert stat) + a named self state that re-routes the burst's branch selection.",
      "durationSemantics": "Permanent; persists after revival.",
      "triggerIdentity": "Same Nanoparticle Injection gate — unreachable in v1.",
      "targetSet": "self.",
      "nearestWrongModel": "A passive selfStatus 'Nanoparticle Consumption' from frame 0 so the burst's Consumption branch is the one that fires — observationally the same 34.84% payload, but if the driver ALSO keeps the ≤2 branch unconditional the burst double-applies.",
      "distinguishingAssertion": "Exactly one casterAtkPct buffApply per target per her burst cast (see burst line); no defPct value-10 buffApply from her.",
      "inertness": "No stat movement at all; verbatim in unmodeled.skill1.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ at Full Charge: immunity to charge speed ▲/▼",
      "disposition": "FAITHFUL",
      "scope": "RECEIVE-side immunity to chargeSpeedPct buff effects in both directions — a weapon-state line (charge speed gates her shot count), not a skip. Schema home: top-level charFixes.statImmunities: ['chargeSpeedPct'].",
      "durationSemantics": "'Continuous' from her first full charge (~1s in) → whole-fight approximation is faithful.",
      "triggerIdentity": "Not a block trigger — a static charFixes field. If authored as a block it would be a fullCharge trigger with no engine payload, which is wrong.",
      "targetSet": "self only; allies' charge speed unaffected.",
      "nearestWrongModel": "Omitted entirely (she accepts ally chargeSpeedPct and over-counts shots in comps with alice/other charge-speed granters) — invisible in controlComp because no fixture ally grants charge speed.",
      "distinguishingAssertion": "withPatchedOverride on a fixture ally (e.g. liter: add battleStart block target allies, buff chargeSpeedPct 50 durationSec 9999). Assert rapunzel-sanctuary's shot-event count and totals equal the unpatched baseline (immunity holds), while helm's shot count does NOT change either (AR/non-charge — pick a second patched check on a charge ally if available) — minimally: her shot count is invariant under the injected charge-speed buff.",
      "inertness": "Must not strip any other stat from her (the FB-enter ATK/attackDamage buffs still land on her). Cube/OL stats are out of scope of the immunity.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ Full Charge held ≥1s, not in Goddess Blessing: shield 7.39%",
      "disposition": "UNMODELED",
      "scope": "Shared team shield (tandem feed for 'shielded' triggers) created only by HOLDING a full charge for ≥1s without releasing.",
      "durationSemantics": "Until charging ends (release).",
      "triggerIdentity": "Charge-HOLD condition. The engine has no hold state: a charge weapon releases at full charge every pull, so the condition is never met under auto-release. A faithful v1 therefore emits NO shield from this line.",
      "targetSet": "self (shield protects all allies).",
      "nearestWrongModel": "Encoded on fullCharge (a shield every ~1–2s all fight) — fires any 'shielded'-trigger / requiresShielded consumer on every shot. Second-nearest: a 1s interval shield.",
      "distinguishingAssertion": "No 'shield' effect in the shipped skill2 blocks (inspect override); in a comp patched with a shielded-trigger consumer, zero shield-driven buffApply from that consumer. Verbatim text present in unmodeled.skill2.",
      "inertness": "Must not move anyone's damage; must not open a 'Goddess Blessing' selfStatus.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Goddess Blessing: DEF ▲ 42.24% caster DEF 10s",
      "disposition": "UNMODELED",
      "scope": "Ally DEF from caster DEF — no StatKey exists for caster-DEF-scaled DEF, and DEF is inert in v1.",
      "durationSecantics_note": "durationSec 10 if it ever fired; same unreachable hold-charge trigger.",
      "durationSemantics": "durationSec 10; unreachable trigger.",
      "triggerIdentity": "Same charge-hold condition as the shield line.",
      "targetSet": "allies.",
      "nearestWrongModel": "A defPct 42.24 buff on fullCharge (wrong trigger AND wrong scaler: 42.24% OF CASTER DEF, not 42.24% of target DEF).",
      "distinguishingAssertion": "No buffApply stat 'defPct' from her casterIdx in the fixture run.",
      "inertness": "Zero damage movement; verbatim in unmodeled.skill2.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "■ entering Full Burst: ATK ▲ 29.17% of caster ATK 10s",
      "disposition": "FAITHFUL",
      "scope": "Flat ATK add scaled by HER staticAtk (casterAtkPct 29.17), not the recipient's own ATK.",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "fullBurstEnter (any team FB). NOT burstCast.",
      "targetSet": "alliesInStatus { statusPrefix: 'Into the Fray', includeSelf: true } — self only in controlComp.",
      "nearestWrongModel": "stat 'atkPct' 29.17 (scales each target's own ATK — over-credits the carry) and/or target 'allies'.",
      "distinguishingAssertion": "buffApply stat==='casterAtkPct' from her casterIdx with value ≈ 0.2917 × unitOf(res,'rapunzel-sanctuary').staticAtk (flat ATK, within rounding) once per fullBurstStart, targetIdx===casterIdx only. No buffApply stat 'atkPct' value 29.17 from her. Same helm-selfStatus patch as the skill1 FB line flips helm into the recipient set.",
      "inertness": "Unpatched fixture: liter/crown/helm receive no casterAtkPct 29.17-derived buff from her; counts track fullBurstStart, not her burstCast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ Full Charge attack → nearest enemy: 220.7% final ATK",
      "disposition": "FAITHFUL",
      "scope": "Function-damage rider, one instance per charged pull. Skill bucket (srcSlot skill2). Crits at caster rate (rider default), NO core (text lacks 'core strike'), NO +30% range (engine forces noRange on riders), FB by landing timing (noFb default off ⚑ convention).",
      "durationSemantics": "Instant; no duration.",
      "triggerIdentity": "fullCharge, target enemy. Byte-identical cadence to shotFired for this unit but authored as fullCharge.",
      "targetSet": "enemy (single target; splash irrelevant vs one boss).",
      "nearestWrongModel": "Routed through the charge bucket (charge:true / chargeMultPct) or core:true because the kit says 'Full Charge attack' — over-credits via charge multiplier, core rate and range. Second-nearest: interval or hitCount trigger decoupled from her shots.",
      "distinguishingAssertion": "Count damage events with srcSlot==='skill2' from her === count of her shot events, one per shot frame; each has bucket 'skill' (not 'charge'), rangeApplied===false, core rate 0, and mult consistent with 220.7% of her final ATK (no charge multiplier applied). Stripping the block via withPatchedOverride drops totals(res)['rapunzel-sanctuary'] by roughly the ratio 220.7 : (61.3 × RL charge multiplier) share — the rider must be a MAJORITY of her personal damage.",
      "inertness": "No extra damage events on reload frames or FB-start frames; per-event count never exceeds shot count.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "≥3 incapacitated: revive 96% / ATK 101.37 / DEF 221.76",
      "disposition": "UNMODELED",
      "scope": "Revive + once-per-battle caster-scaled ATK/DEF to incapacitated allies.",
      "durationSemantics": "10s, once per battle.",
      "triggerIdentity": "burstCast gated on ≥3 incapacitated allies — unreachable (no deaths in v1).",
      "targetSet": "incapacitated allies (empty set in v1).",
      "nearestWrongModel": "Treating 101.37% as the burst's live ATK payload (or stacking it with the 34.84) — ~3× over-credit of her burst buff.",
      "distinguishingAssertion": "No buffApply from her casterIdx whose casterAtkPct value ≈ 1.0137 × her staticAtk; only the 0.3484 × staticAtk value appears.",
      "inertness": "Zero events; verbatim in unmodeled.burst.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "≤2 incapacitated → all allies: ATK ▲ 34.84% caster ATK 10s",
      "disposition": "FAITHFUL",
      "scope": "Flat ATK add = 34.84% of HER staticAtk to every unit incl. self. This is the branch that ALWAYS fires in v1 (0 incapacitated).",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "burstCast (stage 2) — HER OWN cast only. NOT fullBurstEnter: in any comp with a second B2 (controlComp has crown at B2) fullBurstEnter would fire on rotations she did not cast.",
      "targetSet": "allies (all 5 incl. self).",
      "nearestWrongModel": "fullBurstEnter trigger (fires every FB regardless of who cast B2) — over-credits whenever crown takes the B2 slot. Second: stat 'atkPct' 34.84 instead of casterAtkPct.",
      "distinguishingAssertion": "buffApply stat==='casterAtkPct' with value ≈ 0.3484 × her staticAtk, casterIdx===her idx: emitted only on frames carrying a burstCast event by HER (never on a fullBurstStart frame where crown cast B2), and on each such frame exactly one apply per unit (5 targets). Total count === 5 × her burstCast count.",
      "inertness": "Exactly ONE 34.84-derived apply per target per cast — guards against the Consumption-branch duplicate. No 'atkPct' 34.84 from her.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ in Nanoparticle Consumption → all allies: ATK ▲ 34.84%",
      "disposition": "UNMODELED",
      "scope": "Identical payload to the ≤2 branch, reachable only after a revive event.",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "burstCast gated on an unreachable self state.",
      "targetSet": "allies.",
      "nearestWrongModel": "A second unconditional burstCast block duplicating the 34.84 buff (double-stack when the buff keys differ, e.g. different slot ordering). 'Only one set of effects is applied' forbids this.",
      "distinguishingAssertion": "Per her cast, casterAtkPct 0.3484×staticAtk buffApply count === 5 (one per unit), never 10. Acceptable encoding: a single unconditional block with a note that both branches collapse to the same payload.",
      "inertness": "No extra apply; text verbatim in unmodeled.burst (or the collapse documented in note).",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:fullCharge-heal-3.9pct-allies",
    "skill1:fullBurstEnter-attackDamagePct-27.45-alliesInStatus-IntoTheFray-includeSelf",
    "skill1:charFixes.statImmunities-chargeSpeedPct",
    "skill2:fullBurstEnter-casterAtkPct-29.17-alliesInStatus-IntoTheFray-includeSelf",
    "skill2:fullCharge-flatDamage-220.7-enemy",
    "burst:burstCast-casterAtkPct-34.84-allies"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "■ Activates when using Nanoparticle Injection. Affects self. Cooldown of Burst Skill ▲ 40 sec. This effect cannot be removed.",
      "Nanoparticle Consumption: DEF ▲ 10%. This effect is continuous and cannot be removed. Effect persists after revival."
    ],
    "skill2": [
      "■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Goddess Blessing state. Affects self. Creates a shared shield with HP equal to 7.39% of the skill user's final max HP that protects all allies from damage. This shield is removed when charging ends.",
      "■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Goddess Blessing state. Affects all allies. Goddess Blessing: DEF ▲ 42.24% of the skill user's DEF for 10 sec."
    ],
    "burst": [
      "Activates if 3 or more allies are incapacitated. Affects all incapacitated allies. Nanoparticle Injection: Revives with 96% HP. Activates once per battle. ATK ▲ 101.37% of the skill user's ATK for 10 sec. Activates once per battle. DEF ▲ 221.76% of the skill user's DEF for 10 sec. Activates once per battle.",
      "■ Activates when this unit is in the Nanoparticle Consumption state. Affects all allies. ATK ▲ 34.84% of the skill user's ATK for 10 sec."
    ]
  },
  "notes": "FIXTURE HAZARD (reconcile first): rapunzel-sanctuary is Burst II, and controlComp fixes crown at B2 while placing the carry in the B3 slot. If the engine lets crown take every stage-2 cast, her burstCast never fires and every burst assertion is vacuously zero — the driver must either confirm she casts in controlComp (assert ≥1 burstCast event with her casterIdx) or build a custom runComp fixture with B1 + her as the only B2 + a B3, and assert the burst line there. A two-B2 fixture is ALSO the only place the burstCast-vs-fullBurstEnter misread is visible, so keep one such run. SHARED-PRIOR MISREADS I expect: (1) the charge-HOLD shield/Goddess Blessing encoded on fullCharge — faithful v1 emits nothing from those two lines (auto-release never holds); (2) burst keyed to fullBurstEnter; (3) 'X% of the skill user's ATK' encoded as atkPct instead of casterAtkPct — the emitted buffApply value is a flat ATK (kit%/100 × her staticAtk), assert on that; (4) 'Into the Fray' targets widened to 'allies' — the status is kit-external (no fixture unit opens it), so in controlComp the recipient set is exactly {self}; a bare 'self' target is indistinguishable there, so patch a fixture ally with a selfStatus named 'Into the Fray' to separate alliesInStatus from self; (5) the 220.7% rider routed through the charge bucket / core because the trigger text says 'Full Charge attack'; (6) both 34.84 branches shipped as two unconditional blocks (double-apply). ALWAYS-⚑: cadence tuple (chargeFrames 60 / reloadFrames 141 are datamine-unreliable) and the rider's noFb default-off are conventions, not measurements — must be flagged in the override note, not asserted as fact. Element: controlComp boss is Fire and she is Fire, so no advantage multiplier enters any ratio check. Nothing in the redacted methodology named this unit or its magnitudes.",
  "model": "claude-fable-5-1"
}
```

## 5. S5 BLIND TEST-WRITER (claude-opus-5, blind — written from the prose alone)

### 5a. blind spec

```json
{
  "slug": "rapunzel-sanctuary",
  "model": "claude-opus-5",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Restores HP equal to 3.9% of ... max HP",
      "disposition": "FAITHFUL",
      "assertion": "Plants a synthetic {kind:'recovery'} consumer on crown; her heal must fire it, and stripping the heal must collapse the count by >20. Proves the heal exists, reaches ALL allies, and fires per full charge. RED under the nearest-wrong 'defensive line, skip it' (consumer never fires) and under a once-per-battle/battleStart keying (delta ≤ 1)."
    },
    {
      "slot": "skill1",
      "kitLine": "Attack Damage ▲ 27.45% for 10 sec",
      "disposition": "FAITHFUL",
      "assertion": "Applications == fullBurstStart count, all targetSlug === her (no Into-the-Fray ally in the comp), raw value 27.45, durationShots null. RED under target {kind:'allies'} (counterfactual gives TEAM× the applications), under burstCast keying (count would drop below FB count), and under a round-count duration."
    },
    {
      "slot": "skill1",
      "kitLine": "Cooldown of Burst Skill ▲ 40 sec",
      "disposition": "GAP",
      "assertion": "it.skip — gated on Nanoparticle Injection (her own revive); v1 has no HP pool / no incapacitation, so the trigger is unreachable. Also asserted negatively: no defPct 10 (Nanoparticle Consumption) ever appears."
    },
    {
      "slot": "skill1",
      "kitLine": "Nanoparticle Consumption: DEF ▲ 10%",
      "disposition": "GAP",
      "assertion": "Same unreachable trigger; defPct is inert in v1 anyway. Negative assertion: zero defPct applies at value 10 in the control run, so a mis-keyed always-on encoding would go RED."
    },
    {
      "slot": "skill1",
      "kitLine": "immunity to charge speed ▲/▼",
      "disposition": "FAITHFUL",
      "assertion": "Injects a chargeSpeedPct ▲60 that can reach only her (alliesOfWeapon 'RL' — she is the sole RL); every unit's total must stay byte-identical. Non-vacuity + nearest-wrong: deleting charFixes.statImmunities with the same injection must raise her damage. RED if the immunity is unmodeled (control run already shifts) or if statImmunities omits chargeSpeedPct."
    },
    {
      "slot": "skill2",
      "kitLine": "shared shield 7.39% of ... max HP",
      "disposition": "UNMODELED",
      "assertion": "A shield effect must exist (strip hits > 0) and removing it must leave every unit's total identical — documents the line as a tandem-only channel with no consumer in this comp. RED if the shield were folded into a damage term."
    },
    {
      "slot": "skill2",
      "kitLine": "Goddess Blessing: DEF ▲ 42.24%",
      "disposition": "FIX",
      "assertion": "No caster-DEF StatKey exists, so defPct 42.24 to all allies is the faithful approximation; target set == TEAM, value 42.24, and 6–24 applications per ally over 180 s (a ~10 s duty cycle from the 'while not in Goddess Blessing' gate). RED under the nearest-wrong ungated encoding — the counterfactual that deletes noRetriggerWhileActive must give >2× the applications (≈ one per pull)."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 29.17% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "assertion": "casterAtkPct FLAT-resolved (value >> 29.17, basis recovered as min(her caster-ATK values)/0.2917), applications == FB count, self-only, durationShots null. RED under plain atkPct (no casterAtkPct event at all), under target allies (teammates appear), and under a raw-percentage emission."
    },
    {
      "slot": "skill2",
      "kitLine": "Deals 220.7% of final ATK",
      "disposition": "FAITHFUL",
      "assertion": "Strip-the-rider delta is >15% of her total; then one axis at a time — core:true must ADD (so faithful is no-core, the kit never says 'core strike'), crit:false must LOSE (riders crit at the caster's rate), noFb:true must LOSE (FB by timing), and re-keying to hitCount:2 must cost 30–70% of the rider's share (so the faithful cadence is one per PULL). Each is RED under exactly the opposite encoding."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 34.84% of ... ATK for 10 sec",
      "disposition": "FAITHFUL",
      "assertion": "Re-keying her burstCast blocks to fullBurstEnter must yield exactly fbStarts × TEAM applications at the 34.84-derived flat value (proves the block exists, the magnitude, and the all-ally target set), while the control run must have STRICTLY FEWER — she is the second Burst-II unit behind crown, so her own casts cannot match the team's FB count. RED under FB-enter keying (control == counterfactual) and under a self-only target set."
    },
    {
      "slot": "burst",
      "kitLine": "Nanoparticle Injection: Revives 96% HP",
      "disposition": "GAP",
      "assertion": "it.skip — '3 or more allies are incapacitated' is unsatisfiable in v1 (no HP pool). Backed by a positive test that the revive branch's 101.37% ATK and 221.76% DEF magnitudes never appear, so a mis-modeled always-on branch would go RED."
    },
    {
      "slot": "burst",
      "kitLine": "Only one set of effects is applied",
      "disposition": "FAITHFUL",
      "assertion": "At most ONE distinct caster-scaled ATK magnitude may appear from her burst slot — the ≤2-incapacitated branch and the Nanoparticle-Consumption branch carry the identical 34.84% payload, so stacking both (a plausible double-encode of the two ■ headers) would show two magnitudes or double the applications and go RED."
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge maintained for 1+ sec",
      "disposition": "GAP",
      "assertion": "it.skip — no primitive for HOLDING at full charge (the sim releases on reaching it) and no inverse-of-requiresSelfStatus gate; documented as the fullCharge proxy plus the buff-level duty cycle, which the shield cannot share."
    }
  ],
  "fixtures": "controlComp('rapunzel-sanctuary', true) for every run — liter (B1) / crown (B2) / her / helm (B3), boss Fire, focus on her. fixedB3 is left TRUE because the alternative (false) leaves liter B1 + crown B2 + her B2 and NO Burst III, which makes zero Full Bursts and kills every FB-enter line; helm's buffs do not confound any assertion here because all of them are either event-filtered to her own casterIdx or read as a control-vs-counterfactual delta. Three override channels are injected: (a) a synthetic {kind:'recovery'} consumer on crown to make the event-less heal observable, (b) a passive chargeSpeedPct ▲60 on liter targeted alliesOfWeapon 'RL' — she is the only RL in the comp, so the probe cannot perturb anyone else — and (c) withPatchedOverride clones of her own file for the nearest-wrong counterfactuals. 14 hoisted runs (one 180 s sim each). Every patch carries a hit counter that is asserted > 0, so a patch that silently matched nothing fails loudly instead of passing vacuously; all count claims are ratios or wide bands because her cadence derives from the datamine-unreliable chargeFrames/reloadFrames pair. NOTE: this session had no filesystem tools, so scripts/kit-autonomy/blind/rapunzel-sanctuary.test.ts and .test-spec.json could NOT be written — the full source is inline in testSource above and must be saved by the orchestrator.",
  "gaps": [
    "S1-c (it.skip): 'Activates when using Nanoparticle Injection' — burst-cooldown ▲40 s and the continuous Nanoparticle Consumption DEF ▲10% are gated on her own revive; v1 models no HP pool and no incapacitation, so the trigger is unreachable (and defPct is inert regardless).",
    "B-a (it.skip): the ≥3-incapacitated revive branch (96% HP revive, once-per-battle ATK ▲101.37% / DEF ▲221.76%) is unsatisfiable for the same reason; only the ≤2-incapacitated / Nanoparticle-Consumption ATK ▲34.84% branch is ever live.",
    "S2-a/S2-b trigger fidelity (it.skip): 'Full Charge is maintained for 1 or more seconds' has no primitive (the sim releases at full charge rather than holding), and 'while this unit is not in the Goddess Blessing state' has no inverse-of-requiresSelfStatus gate — the duty cycle can only ride the buff's own noRetriggerWhileActive, which the shield effect cannot share, so the shield is expected to over-fire.",
    "Shield and heal payloads are unobservable directly (no shield/heal event kind; the heal models no HP amount and the shield no HP pool) — both are reachable only through a planted consumer or an inertness delta.",
    "'Into the Fray' and 'Goddess Blessing' state MEMBERSHIP has no event channel, so the alliesInStatus target set can only be verified negatively (no teammate here carries either state).",
    "fullCharge vs shotFired is NOT discriminable for an unswapped RL (every pull is a full charge), so the S1-a / S2-b / S2-d trigger identity is asserted at cadence level only."
  ]
}
```

### 5b. blind test source (VERBATIM — mechanical defects preserved; see section 8 for the run against the driver's override)

```ts
/**
 * rapunzel-sanctuary — RL/Fire/Supporter/Burst II (cd 40 s, ammo 6, charge 60 f, reload 141 f,
 * normalMult 61.3, coreMult 200). BLIND per-unit kit spec: written from the kit prose alone, with
 * no sight of the driver's override, tests or reasoning.
 *
 * WHAT THE KIT SAYS (structural read: ■ header + "Affects …" clause + the stat before ▲/▼)
 *   S1-a  on a Full Charge attack / all allies ...... restores HP "3.9% of the skill user's" max HP
 *   S1-b  on entering Full Burst / self + allies in the "Into the Fray" state ... Attack Damage ▲27.45%, 10 s
 *   S1-c  on using Nanoparticle Injection / self ... Burst-Skill cooldown ▲40 s (unremovable) +
 *                                                   Nanoparticle Consumption: DEF ▲10% (continuous)
 *   S1-d  only when AT Full Charge during a Full Charge attack / self ... immunity to charge-speed
 *                                                   INCREASE and DECREASE effects, continuous
 *   S2-a  Full Charge held ≥1 s while NOT in Goddess Blessing / self ... shared shield 7.39% of max HP,
 *                                                   removed when charging ends
 *   S2-b  same trigger / all allies ................ Goddess Blessing: DEF ▲42.24% OF THE CASTER'S DEF, 10 s
 *   S2-c  on entering Full Burst / self + "Into the Fray" allies ... ATK ▲29.17% OF THE CASTER'S ATK, 10 s
 *   S2-d  on a Full Charge attack / enemy nearest the crosshair ... 220.7% of final ATK as additional damage
 *   B-a   not in Nanoparticle Consumption, ≥3 allies incapacitated ... revive 96% + ATK ▲101.37% +
 *                                                   DEF ▲221.76%, once per battle
 *   B-b   not in Nanoparticle Consumption, ≤2 incapacitated / all allies ... ATK ▲34.84% of caster ATK, 10 s
 *   B-c   in Nanoparticle Consumption / all allies ... ATK ▲34.84% of caster ATK, 10 s (same payload as B-b)
 *
 * FIXTURE — controlComp(SLUG, true) = liter (B1) / crown (B2) / rapunzel-sanctuary / helm (B3).
 *   • She is a BURST II unit occupying the carry slot BEHIND crown, who is also Burst II, so stage 2
 *     is expected to go to crown by slot order and her OWN burst may never cast in this comp. Every
 *     burst-slot claim is therefore proven by a TRIGGER COUNTERFACTUAL (re-key B-b's burstCast to
 *     fullBurstEnter) — and the control-vs-counterfactual INEQUALITY is exactly what separates
 *     own-burst-cast keying from FB-enter keying (an FB-enter encoding would already fire on every
 *     team Full Burst, making the two runs equal → RED).
 *   • No teammate here carries an "Into the Fray" state, so S1-b and S2-c must land on HER ONLY.
 *     That is the discriminator against the nearest-wrong target {kind:'allies'}.
 *   • crown is the on-recovery consumer: the engine emits no heal/shield event, so S1-a is observed
 *     by PLANTING a synthetic {kind:'recovery'} probe block on crown and watching it fire.
 *   • Only she wields an RL here (liter SMG, crown AR, helm SR), so an injected
 *     alliesOfWeapon:'RL' chargeSpeedPct buff reaches her and nobody else — a clean probe for the
 *     S1-d receiving-side immunity.
 *
 * ⚑ FLAGS (outside the input domain — estimated, not invented values)
 *   • Her pull cadence (ammo 6 / charge 60 f / reload 141 f ⇒ ~8.4 s per magazine ⇒ ~125 pulls in
 *     180 s) comes from datamine-unreliable fields, so every count assertion below is written as a
 *     RATIO or a wide band, never as a pinned shot count.
 *   • "Full Charge maintained for 1 or more seconds" has no primitive (the sim releases at full
 *     charge); fullCharge is the only available proxy, so the 1-second hold is UNMODELED and the
 *     duty cycle is carried by the 10 s Goddess Blessing window instead.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'rapunzel-sanctuary';
const CROWN = 'crown';
const LITER = 'liter';

const AD_PCT = 27.45; // S1-b — a plain percentage stat: raw value in the event
const DEF_PCT = 42.24; // S2-b — no caster-DEF StatKey exists, so defPct carries the raw number
const S2_ATK_PCT = 29.17; // S2-c — caster-scaled: FLAT-resolved in the event
const B_ATK_PCT = 34.84; // B-b / B-c — caster-scaled: FLAT-resolved in the event
const RIDER_PCT = 220.7; // S2-d
const PROBE_ATK = 50; // synthetic on-recovery consumer planted on crown

type AnyEv = SimEvent & Record<string, any>;
interface Run {
  res: any;
  events: AnyEv[];
}

function near(a: number, b: number, tol = 1e-3): boolean {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
}

function go(mutate?: (opts: any) => void): Run {
  const opts: any = controlComp(SLUG, true);
  mutate?.(opts);
  const events: AnyEv[] = [];
  const chained = opts.onEvent;
  opts.onEvent = (ev: AnyEv) => {
    chained?.(ev);
    events.push(ev);
  };
  return { res: runComp(opts), events };
}

function applies(r: Run, stat: string): AnyEv[] {
  return r.events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
}
function fbStarts(r: Run): number {
  return r.events.filter((e) => e.kind === 'fullBurstStart').length;
}
function dmgOf(r: Run): number {
  return unitOf(r.res, SLUG).totalDamage as number;
}
function withOv(o: any, map: Record<string, unknown>): void {
  o.overrides = { ...(o.overrides ?? {}), ...map };
}
function eachBlock(ov: any, fn: (b: any, slot: string) => void): void {
  for (const slot of ['skill1', 'skill2', 'burst']) {
    for (const b of ov[slot] ?? []) fn(b, slot);
  }
}
function countBy(
  evs: AnyEv[],
  key: (e: AnyEv) => string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of evs) out[key(e)] = (out[key(e)] ?? 0) + 1;
  return out;
}

/* ------------------------------------------------------------------ *
 * Hoisted runs — each one is a full 180 s sim. 14 runs total.
 * ------------------------------------------------------------------ */

const CONTROL = go();

// S1-a — the heal emits no event, so plant a consumer that does.
function crownProbe(o: any): void {
  withOv(o, {
    [CROWN]: withPatchedOverride(CROWN, (ov: any) => {
      ov.skill1 = [
        ...(ov.skill1 ?? []),
        {
          slot: 'skill1',
          trigger: { kind: 'recovery' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'atkPct', value: PROBE_ATK, durationSec: 2 },
          ],
        },
      ];
    }),
  });
}
let healStripHits = 0;
function stripHeal(o: any): void {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        const n = (b.effects ?? []).length;
        b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'heal');
        healStripHits += n - b.effects.length;
      });
    }),
  });
}
const PROBE = go((o) => crownProbe(o));
const PROBE_NO_HEAL = go((o) => {
  crownProbe(o);
  stripHeal(o);
});

// S2-a — shield inertness.
let shieldStripHits = 0;
const NO_SHIELD = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        const n = (b.effects ?? []).length;
        b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'shield');
        shieldStripHits += n - b.effects.length;
      });
    }),
  });
});

// S1-b nearest-wrong — the FB-enter Attack Damage buff scoped to ALL allies.
let adTargetHits = 0;
const S1_ALL = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of ov.skill1 ?? []) {
        if (
          (b.effects ?? []).some(
            (e: any) => e.kind === 'buff' && e.stat === 'attackDamagePct'
          )
        ) {
          b.target = { kind: 'allies' };
          adTargetHits += 1;
        }
      }
    }),
  });
});

// B-b nearest-wrong — her own-cast ATK grant re-keyed to team Full-Burst entry.
let burstRekeyHits = 0;
const FB_BURST = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of ov.burst ?? []) {
        if (b.trigger?.kind === 'burstCast') {
          b.trigger = { kind: 'fullBurstEnter' };
          burstRekeyHits += 1;
        }
      }
    }),
  });
});

// S2-b nearest-wrong — Goddess Blessing free to re-arm on every full charge
// (i.e. the "while not in Goddess Blessing" duty cycle dropped).
let gbFlagHits = 0;
const GB_RETRIGGER = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        for (const e of b.effects ?? []) {
          if (e.kind === 'buff' && e.noRetriggerWhileActive) {
            delete e.noRetriggerWhileActive;
            gbFlagHits += 1;
          }
        }
      });
    }),
  });
});

// S2-d — the 220.7% rider: strip it, then bend it one axis at a time.
let riderStripHits = 0;
const NO_RIDER = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        const n = (b.effects ?? []).length;
        b.effects = (b.effects ?? []).filter(
          (e: any) => !(e.kind === 'flatDamage' && near(e.atkPct, RIDER_PCT))
        );
        riderStripHits += n - b.effects.length;
      });
    }),
  });
});
function riderPatch(mut: (e: any) => void): { file: unknown; hits: number } {
  let hits = 0;
  const file = withPatchedOverride(SLUG, (ov: any) => {
    eachBlock(ov, (b) => {
      for (const e of b.effects ?? []) {
        if (e.kind === 'flatDamage' && near(e.atkPct, RIDER_PCT)) {
          mut(e);
          hits += 1;
        }
      }
    });
  });
  return { file, hits };
}
const riderCore = riderPatch((e) => {
  e.core = true;
});
const RIDER_CORE = go((o) => withOv(o, { [SLUG]: riderCore.file }));
const riderNoCrit = riderPatch((e) => {
  e.crit = false;
});
const RIDER_NOCRIT = go((o) => withOv(o, { [SLUG]: riderNoCrit.file }));
const riderNoFb = riderPatch((e) => {
  e.noFb = true;
});
const RIDER_NOFB = go((o) => withOv(o, { [SLUG]: riderNoFb.file }));

let riderEvery2Hits = 0;
const RIDER_EVERY2 = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        if (
          (b.effects ?? []).some(
            (e: any) => e.kind === 'flatDamage' && near(e.atkPct, RIDER_PCT)
          )
        ) {
          b.trigger = { kind: 'hitCount', count: 2 };
          riderEvery2Hits += 1;
        }
      });
    }),
  });
});

// S1-d — inject a charge-speed buff that can only reach HER, then re-run with the immunity removed.
function injectChargeSpeed(o: any): void {
  withOv(o, {
    [LITER]: withPatchedOverride(LITER, (ov: any) => {
      ov.skill1 = [
        ...(ov.skill1 ?? []),
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'alliesOfWeapon', weapon: 'RL' },
          effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 60 }],
        },
      ];
    }),
  });
}
const CS_IMMUNE = go((o) => injectChargeSpeed(o));
let immunityHits = 0;
const CS_OPEN = go((o) => {
  injectChargeSpeed(o);
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      const imm: string[] = ov.charFixes?.statImmunities ?? [];
      immunityHits = imm.filter((s) => s === 'chargeSpeedPct').length;
      if (ov.charFixes) delete ov.charFixes.statImmunities;
    }),
  });
});

/* ------------------------------------------------------------------ *
 * Derived fixture facts
 * ------------------------------------------------------------------ */

const TEAM = Object.keys(totals(CONTROL.res)).length;
const FB = fbStarts(CONTROL);
// Her caster index is identified by a magnitude only SHE can emit (27.45 Attack Damage).
const SELF_EV = applies(CONTROL, 'attackDamagePct').find((e) =>
  near(e.value, AD_PCT)
);
const SELF_IDX = SELF_EV?.casterIdx;
const MY_CASTER_ATK = applies(CONTROL, 'casterAtkPct').filter(
  (e) => e.casterIdx === SELF_IDX
);
// Flat-resolved caster-ATK basis, recovered from the SMALLER of her two caster-scaled magnitudes
// (S2-c 29.17% < B-b 34.84%), so no knowledge of her stat sheet is needed.
const ATK_BASIS = MY_CASTER_ATK.length
  ? Math.min(...MY_CASTER_ATK.map((e) => e.value)) / (S2_ATK_PCT / 100)
  : 0;
const S2_FLAT = (ATK_BASIS * S2_ATK_PCT) / 100;
const B_FLAT = (ATK_BASIS * B_ATK_PCT) / 100;

describe('rapunzel-sanctuary — fixture sanity', () => {
  it('the comp actually full-bursts and she is identifiable as a caster', () => {
    expect(TEAM, 'controlComp must seat 4 units').toBe(4);
    expect(
      FB,
      'a lone B3 makes zero Full Bursts — the fixture must produce some'
    ).toBeGreaterThan(0);
    expect(
      SELF_EV,
      'S1-b Attack Damage ▲27.45% must be emitted by her'
    ).toBeTruthy();
    expect(
      ATK_BASIS,
      'S2-c must emit a caster-scaled (flat) ATK value'
    ).toBeGreaterThan(0);
  });
});

describe('rapunzel-sanctuary — skill1', () => {
  it('S1-a: the Full-Charge heal reaches ALL allies, once per pull (tandem channel)', () => {
    expect(healStripHits, 'a heal effect must exist to strip').toBeGreaterThan(
      0
    );
    const probed = applies(PROBE, 'atkPct').filter(
      (e) => near(e.value, PROBE_ATK) && e.targetSlug === CROWN
    );
    const stripped = applies(PROBE_NO_HEAL, 'atkPct').filter(
      (e) => near(e.value, PROBE_ATK) && e.targetSlug === CROWN
    );
    // Non-vacuity: the planted on-recovery consumer fires at all.
    expect(
      probed.length,
      'planted recovery consumer must fire'
    ).toBeGreaterThan(0);
    // Discriminating: her heal is a large share of those recoveries (≈1 per pull, ~125 pulls),
    // so removing it must collapse the count. RED under "heal skipped as defensive/inert".
    expect(stripped.length).toBeLessThan(probed.length);
    expect(
      probed.length - stripped.length,
      'heal must fire per full charge, not once'
    ).toBeGreaterThan(20);
  });

  it('S1-b: Attack Damage ▲27.45% fires on FB ENTRY and lands on HER ONLY (no Into-the-Fray ally here)', () => {
    const mine = applies(CONTROL, 'attackDamagePct').filter(
      (e) => e.casterIdx === SELF_IDX
    );
    expect(mine.length, 'one application per Full Burst entry').toBe(FB);
    expect(
      mine.every((e) => near(e.value, AD_PCT)),
      'plain pct stat keeps its raw value'
    ).toBe(true);
    expect(new Set(mine.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    // Duration semantics: "for 10 sec" is wall-clock, never a round budget.
    expect(mine.every((e) => e.durationShots == null)).toBe(true);
    // Inertness: no teammate may carry this buff.
    expect(
      applies(CONTROL, 'attackDamagePct').filter(
        (e) => near(e.value, AD_PCT) && e.targetSlug !== SLUG
      )
    ).toHaveLength(0);
    // Nearest-wrong (target {kind:'allies'}) → TEAM× the applications.
    expect(adTargetHits, 'the patch must have found the block').toBeGreaterThan(
      0
    );
    const all = applies(S1_ALL, 'attackDamagePct').filter((e) =>
      near(e.value, AD_PCT)
    );
    expect(all.length).toBe(fbStarts(S1_ALL) * TEAM);
  });

  it.skip('S1-c: Nanoparticle Injection (burst CD ▲40 s + Nanoparticle Consumption DEF ▲10%) — GAP', () => {
    // GAP: the trigger is her own revive, and v1 models no HP pool / no incapacitation, so
    // Nanoparticle Injection can never occur. The cooldown INCREASE (a negative burstCdr) and the
    // continuous DEF ▲10% (defPct, inert in v1) are therefore unobservable in any fixture.
  });

  it('S1-d: she is immune to charge-speed buffs in BOTH directions', () => {
    // An injected alliesOfWeapon:'RL' chargeSpeedPct ▲60 can reach only her in this comp.
    expect(
      totals(CS_IMMUNE.res),
      'the immunity must make the injected buff a complete no-op'
    ).toEqual(totals(CONTROL.res));
    // Non-vacuity + nearest-wrong: with the immunity removed the same injection MUST speed her up.
    expect(
      immunityHits,
      "statImmunities must list 'chargeSpeedPct'"
    ).toBeGreaterThan(0);
    expect(dmgOf(CS_OPEN)).toBeGreaterThan(dmgOf(CONTROL));
  });
});

describe('rapunzel-sanctuary — skill2', () => {
  it('S2-a: the shared shield is damage-inert here (no shield consumer in the comp)', () => {
    expect(
      shieldStripHits,
      'a shield effect must exist to strip'
    ).toBeGreaterThan(0);
    expect(totals(NO_SHIELD.res)).toEqual(totals(CONTROL.res));
  });

  it('S2-b: Goddess Blessing DEF reaches all allies on a ~10 s duty cycle, not every full charge', () => {
    const def = applies(CONTROL, 'defPct').filter(
      (e) => e.casterIdx === SELF_IDX
    );
    expect(
      def.length,
      'the Goddess Blessing DEF grant must be emitted'
    ).toBeGreaterThan(0);
    expect(
      def.every((e) => near(e.value, DEF_PCT)),
      'caster-scaled DEF has no StatKey → defPct 42.24'
    ).toBe(true);
    expect(
      new Set(def.map((e) => e.targetSlug)).size,
      'Affects ALL allies'
    ).toBe(TEAM);
    const per = countBy(def, (e) => String(e.targetSlug));
    // 180 s / a 10 s window ⇒ ~18 per ally. ⚑ band, not a pin.
    for (const [slug, n] of Object.entries(per)) {
      expect(n, `${slug}: one grant per ~10 s window`).toBeGreaterThanOrEqual(
        6
      );
      expect(n, `${slug}: must NOT re-arm on every pull`).toBeLessThanOrEqual(
        24
      );
    }
    // Nearest-wrong: drop the "while not in Goddess Blessing" self-gate and it re-applies per pull.
    expect(
      gbFlagHits,
      'the duty cycle must be encoded (noRetriggerWhileActive)'
    ).toBeGreaterThan(0);
    const loose = applies(GB_RETRIGGER, 'defPct').filter((e) =>
      near(e.value, DEF_PCT)
    );
    expect(loose.length).toBeGreaterThan(def.length * 2);
  });

  it('S2-c: ATK ▲29.17% of caster ATK is FLAT-resolved, FB-enter keyed, and self-only here', () => {
    const s2 = MY_CASTER_ATK.filter((e) => near(e.value, S2_FLAT));
    expect(s2.length, 'one application per Full Burst entry').toBe(FB);
    expect(new Set(s2.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    // Flat resolution, not the raw kit percentage (the classic blind-read error).
    expect(s2[0].value).toBeGreaterThan(S2_ATK_PCT * 5);
    expect(s2.every((e) => e.durationShots == null)).toBe(true);
    // Inertness: no teammate is in an Into-the-Fray state, so none may receive it.
    expect(
      applies(CONTROL, 'casterAtkPct').filter(
        (e) =>
          e.casterIdx === SELF_IDX &&
          near(e.value, S2_FLAT) &&
          e.targetSlug !== SLUG
      )
    ).toHaveLength(0);
  });

  it('S2-d: the 220.7% rider fires once per full charge, crits, takes Full Burst, and does NOT core', () => {
    expect(
      riderStripHits,
      'the 220.7% flatDamage rider must exist'
    ).toBeGreaterThan(0);
    const base = dmgOf(CONTROL);
    const share = base - dmgOf(NO_RIDER);
    expect(share, 'the rider must contribute damage').toBeGreaterThan(0);
    expect(
      share / base,
      '220.7% per pull vs a 61.3% normal — a large share'
    ).toBeGreaterThan(0.15);
    // core: the kit never says "core strike", so the faithful rider takes NO core bucket.
    expect(riderCore.hits).toBeGreaterThan(0);
    expect(
      dmgOf(RIDER_CORE),
      'nearest-wrong core:true must ADD damage'
    ).toBeGreaterThan(base);
    // crit: riders crit at the caster's sheet rate.
    expect(riderNoCrit.hits).toBeGreaterThan(0);
    expect(
      dmgOf(RIDER_NOCRIT),
      'nearest-wrong crit:false must LOSE damage'
    ).toBeLessThan(base);
    // Full Burst by TIMING (default ON for a function-damage rider).
    expect(riderNoFb.hits).toBeGreaterThan(0);
    expect(
      dmgOf(RIDER_NOFB),
      'nearest-wrong noFb:true must LOSE damage'
    ).toBeLessThan(base);
    // Cadence: one per PULL. Nearest-wrong "every 2nd hit" must halve the rider's contribution —
    // asserted as a ratio so no datamine-derived shot count is pinned.
    expect(riderEvery2Hits).toBeGreaterThan(0);
    const lost = base - dmgOf(RIDER_EVERY2);
    expect(lost).toBeGreaterThan(share * 0.3);
    expect(lost).toBeLessThan(share * 0.7);
  });
});

describe('rapunzel-sanctuary — burst', () => {
  it('B-b/B-c: ATK ▲34.84% of caster ATK is keyed to HER OWN cast, not to team Full Burst, and hits all allies', () => {
    expect(
      burstRekeyHits,
      'the burst payload must be burstCast-keyed'
    ).toBeGreaterThan(0);
    const ctl = MY_CASTER_ATK.filter((e) => near(e.value, B_FLAT));
    const rekeyed = applies(FB_BURST, 'casterAtkPct').filter((e) =>
      near(e.value, B_FLAT)
    );
    // Under the nearest-wrong FB-enter keying the grant lands on every ally on every Full Burst.
    expect(rekeyed.length).toBe(fbStarts(FB_BURST) * TEAM);
    expect(
      new Set(rekeyed.map((e) => e.targetSlug)).size,
      'Affects all allies'
    ).toBe(TEAM);
    // Trigger identity: she is the 2nd Burst-II unit in this comp (crown precedes her), so her own
    // casts are strictly fewer than the team's Full Bursts. An FB-enter encoding makes these equal.
    expect(ctl.length).toBeLessThan(rekeyed.length);
    // Whatever casts do happen must land as COMPLETE all-ally sets.
    expect(ctl.length % TEAM).toBe(0);
    // The ≤2-incapacitated branch and the Nanoparticle-Consumption branch carry the SAME payload,
    // so exactly one magnitude may appear — never both stacked.
    const distinct = new Set(ctl.map((e) => Math.round(e.value)));
    expect(distinct.size).toBeLessThanOrEqual(1);
  });

  it('burst: only ONE branch applies — no revive-branch ATK/DEF magnitudes may ever appear', () => {
    // 101.37% / 221.76% belong to the ≥3-incapacitated branch, which cannot trigger in v1.
    const revATK = (ATK_BASIS * 101.37) / 100;
    expect(
      applies(CONTROL, 'casterAtkPct').filter((e) => near(e.value, revATK))
    ).toHaveLength(0);
    expect(
      applies(CONTROL, 'defPct').filter((e) => near(e.value, 221.76))
    ).toHaveLength(0);
    expect(
      applies(CONTROL, 'defPct').filter((e) => near(e.value, 10))
    ).toHaveLength(0);
  });

  it.skip('B-a: Nanoparticle Injection revive (96% HP, once per battle) — GAP', () => {
    // GAP: no HP pool and no incapacitation in v1, so "3 or more allies are incapacitated" is never
    // satisfied and the revive + its once-per-battle ATK/DEF riders are unreachable.
  });

  it.skip('S2-a/S2-b trigger fidelity: "Full Charge maintained for 1+ sec" — GAP', () => {
    // GAP: no primitive for HOLDING at full charge (the sim releases on reaching it). fullCharge is
    // the only proxy; the 1-second hold requirement is unmodeled, and the "while not in Goddess
    // Blessing" gate has no inverse-of-requiresSelfStatus primitive — it is approximated by the
    // buff's own noRetriggerWhileActive duty cycle, which the shield cannot share.
  });
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "rapunzel-sanctuary",
  "charFixes": {
    "statImmunities": ["chargeSpeedPct"]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesInStatus",
        "statusPrefix": "Into the Fray",
        "includeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 27.45,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 7.39,
          "durationSec": 1
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 42.24,
          "durationSec": 10,
          "noRetriggerWhileActive": true
        },
        {
          "kind": "selfStatus",
          "name": "Goddess Blessing",
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesInStatus",
        "statusPrefix": "Into the Fray",
        "includeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 29.17,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 220.7,
          "crit": true
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 34.84,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "■ Activates when using Nanoparticle Injection. Affects self.",
      "Cooldown of Burst Skill ▲ 40 sec. This effect cannot be removed.",
      "Nanoparticle Consumption: DEF ▲ 10%. This effect is continuous and cannot be removed. Effect persists after revival."
    ],
    "skill2": [],
    "burst": [
      "Activates if 3 or more allies are incapacitated. Affects all incapacitated allies.",
      "Nanoparticle Injection: Revives with 96% HP. Activates once per battle.",
      "ATK ▲ 101.37% of the skill user's ATK for 10 sec. Activates once per battle.",
      "DEF ▲ 221.76% of the skill user's DEF for 10 sec. Activates once per battle.",
      "■ Activates when this unit is in the Nanoparticle Consumption state. Affects all allies.",
      "ATK ▲ 34.84% of the skill user's ATK for 10 sec."
    ]
  },
  "caveats": [
    "⚑ ENTIRE NANOPARTICLE CHAIN IS UNREACHABLE AT SCOPE, NOT SKIPPED ON POLICY: 'Nanoparticle Injection' only fires from the burst's 3+-incapacitated branch, and v1 has no HP pool / no incapacitation, so she can never enter 'Nanoparticle Consumption'. Consequently the skill1 burst-cooldown +40s penalty and the continuous DEF ▲10% never apply, and her burst deterministically resolves to the ≤2-incapacitated branch every rotation. This is a REACHABILITY skip of DEF/HP lines, explicitly not the auto-skip the hard rules forbid.",
    "⚑ The NC-branch ATK line (burst, unmodeled list, last entry) is numerically IDENTICAL to the modeled ≤2-incapacitated line (34.84% casterAtkPct / 10 sec / all allies), so the single modeled burst block is magnitude-correct under BOTH branches — nothing is lost by the branch collapse. It is listed as unmodeled only because that specific textual instance sits under the unreachable NC header.",
    "⚑ 'Full Charge is maintained for 1 or more seconds' has no engine primitive — in-sim charge weapons release instantly at full charge. Proxied by `fullCharge`; the real kit's ~1s hold ALSO lengthens her true per-shot cycle, which the cadence tuple does not contain (see flags).",
    "⚑ The 'while not in the Goddess Blessing state' gate is a NEGATED self-status gate; no such block gate exists. The DEF block's duty cycle is reproduced with `noRetriggerWhileActive` on the Goddess Blessing buff itself (re-trigger suppressed until the 10s window lapses). The shield block has NO equivalent flag on a `shield` effect, so it re-emits on every full charge instead of once per ~10s cycle — over-firing ally `shielded` triggers / `requiresShielded` gates by roughly the charge count per 10s.",
    "⚑ Goddess Blessing is '42.24% of the SKILL USER'S DEF'. The schema has no casterDefPct StatKey; encoded as `defPct` 42.24 (target-relative semantics, not caster-relative). `defPct` is documented inert in v1, so this is a completeness record for a future consumer, not a damage claim.",
    "⚑ `selfStatus 'Goddess Blessing'` is authored purely to make the kit-NAMED state visible/queryable (statuses carry no stats). It is NOT load-bearing: the gate that reads it is negated and therefore implemented via `noRetriggerWhileActive` instead. Drop it if the judge prefers zero non-mechanical effects.",
    "⚑ The shared shield's header says 'Affects self' but the body says it 'protects all allies'. Targeted at `allies` so cross-unit shield-synergy consumers see it; a strict header read would be `self`. Only matters for other kits' shield gates — no self damage delta.",
    "⚑ 'Into the Fray' is a CROSS-UNIT status this kit never grants. Both FB-enter buffs use `alliesInStatus` + `includeSelf:true`, so in an isolation/control comp they land on SELF ONLY. Her headline team ATK/Damage-Up output is therefore composition-gated, not a flat team buff — do not read the solo number as her support value.",
    "⚑ Charge-speed immunity is modeled as whole-fight `charFixes.statImmunities:['chargeSpeedPct']` (both directions, as the kit lists both). Kit wording scopes the activation to 'only when at Full Charge during a Full Charge attack' but calls the effect continuous; whole-fight is the closest primitive and is slightly over-scoped. This is DAMAGE-RELEVANT: she rejects ally charge-speed buffs, so her shot count must not be modeled as benefiting from them.",
    "⚑ skill2's 220.7% rider: `crit:true` (riders crit at the caster's sheet rate), no `core` (text does not say core strike), `noFb` NOT set (FB-by-timing default ON), `noRange` not set (engine-automatic).",
    "⚑ The 3.9% max-HP heal fires on EVERY full charge (kit-literal). The engine models no HP amount, so its only live consequence is pumping ally on-`recovery` consumers at her full-charge cadence — a cadence that is itself ⚑ (see flags)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the prose only. Scope-reachable kit = a per-full-charge 220.7% rider + per-full-charge team heal, a shared shield + Goddess Blessing DEF on a ~10s duty cycle, two FB-enter buffs scoped to the cross-unit 'Into the Fray' status (SELF-ONLY in isolation), and a burst that collapses deterministically to all-allies casterAtkPct 34.84%/10s because v1 has no incapacitation. Charge-speed immunity is modeled and is the main non-obvious damage term."
}
```

### 6b. blind audit + flags

```json
{
  "slug": "rapunzel-sanctuary",
  "model": "claude-opus-5",
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "■ when performing Full Charge attack; all",
      "status": "IMPLEMENTED",
      "effectOrReason": "Block trigger fullCharge, target allies (NIKKE 'all allies' includes self)."
    },
    {
      "slot": "skill1",
      "kitLine": "Restores HP equal to 3.9% of final max HP",
      "status": "IMPLEMENTED",
      "effectOrReason": "heal (ticks default 1) — emits a recovery event per full charge; HP amount unmodeled by the engine. Heal lines are never skipped on isolation (tandem rule)."
    },
    {
      "slot": "skill1",
      "kitLine": "■ when entering Full Burst; self + Into…",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter (ANY team Full Burst, per trigger-identity rule — not burstCast), target alliesInStatus{statusPrefix:'Into the Fray', includeSelf:true}."
    },
    {
      "slot": "skill1",
      "kitLine": "Attack Damage ▲ 27.45% for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 27.45 durationSec 10 (Damage-Up bucket; 'Attack Damage' keyword, generic scope — no normal/charge/crit scoping in the text)."
    },
    {
      "slot": "skill1",
      "kitLine": "■ when using Nanoparticle Injection; self",
      "status": "SKIPPED",
      "effectOrReason": "Trigger is the burst's 3+-incapacitated revive, which cannot occur at v1 scope (no HP pool, nobody is incapacitated). No reachable trigger primitive; verbatim in unmodeled.skill1."
    },
    {
      "slot": "skill1",
      "kitLine": "Cooldown of Burst Skill ▲ 40 sec",
      "status": "SKIPPED",
      "effectOrReason": "A burst-cooldown PENALTY (expressible only as burstCdr seconds:-40, levelConst), but it hangs off the unreachable Nanoparticle Injection trigger — modeling it would apply a penalty the fight can never earn. Verbatim in unmodeled.skill1."
    },
    {
      "slot": "skill1",
      "kitLine": "Nanoparticle Consumption: DEF ▲ 10%",
      "status": "SKIPPED",
      "effectOrReason": "Continuous DEF buff whose state is entered only via the unreachable revive. Skipped for REACHABILITY, not because it is a DEF line. Verbatim in unmodeled.skill1."
    },
    {
      "slot": "skill1",
      "kitLine": "■ only when at Full Charge during a FC atk",
      "status": "IMPLEMENTED",
      "effectOrReason": "Realized as charFixes.statImmunities (whole-fight receiving-side immunity) rather than a block; header scope is slightly narrower than the primitive."
    },
    {
      "slot": "skill1",
      "kitLine": "immunity to increase charge speed (cont.)",
      "status": "IMPLEMENTED",
      "effectOrReason": "charFixes.statImmunities:['chargeSpeedPct'] — strips incoming chargeSpeedPct buffs for this unit only."
    },
    {
      "slot": "skill1",
      "kitLine": "immunity to decrease charge speed (cont.)",
      "status": "IMPLEMENTED",
      "effectOrReason": "Same entry — statImmunities strips the stat in BOTH directions, so one entry covers both lines."
    },
    {
      "slot": "skill2",
      "kitLine": "■ FC maintained 1s+ while not Goddess…self",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullCharge (⚑ proxy for 'maintained 1+ sec'); negated 'not in Goddess Blessing' gate inexpressible as a block gate — shield block is therefore UNGATED (⚑)."
    },
    {
      "slot": "skill2",
      "kitLine": "shared shield 7.39% of final max HP",
      "status": "IMPLEMENTED",
      "effectOrReason": "shield{maxHpPct:7.39, durationSec:1}; target allies (shared shield 'protects all allies') to feed cross-unit shielded triggers / requiresShielded. durationSec 1 ⚑ = 'removed when charging ends'."
    },
    {
      "slot": "skill2",
      "kitLine": "■ FC maintained 1s+ … ; all allies",
      "status": "IMPLEMENTED",
      "effectOrReason": "Second block, same fullCharge trigger, target allies; duty cycle carried by noRetriggerWhileActive on the buff."
    },
    {
      "slot": "skill2",
      "kitLine": "Goddess Blessing: DEF ▲ 42.24% of user DEF",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff defPct 42.24 durationSec 10 + noRetriggerWhileActive:true (implements the 'while not in Goddess Blessing' self-gate as a lapse-then-reapply duty cycle), plus selfStatus 'Goddess Blessing' 10s to record the named state. ⚑ no casterDefPct StatKey exists."
    },
    {
      "slot": "skill2",
      "kitLine": "■ when entering Full Burst; self + Into…",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter, target alliesInStatus{'Into the Fray', includeSelf:true} — same scoping as the skill1 FB-enter line."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 29.17% of the skill user's ATK, 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterAtkPct 29.17 durationSec 10 (caster-scaled → flat ATK add resolved at apply time)."
    },
    {
      "slot": "skill2",
      "kitLine": "■ when performing FC attack; nearest enemy",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullCharge, target enemy."
    },
    {
      "slot": "skill2",
      "kitLine": "Deals 220.7% of final ATK as addl damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage atkPct 220.7, crit:true, no core (no 'core strike' wording), noFb unset (FB by timing, default ON), noRange unset (engine-automatic). Her only kit damage line."
    },
    {
      "slot": "burst",
      "kitLine": "■ when not in Nanoparticle Consumption",
      "status": "IMPLEMENTED",
      "effectOrReason": "Gate resolves permanently TRUE at v1 scope (the NC state is unreachable), so no gate primitive is authored — the single burst block IS this branch."
    },
    {
      "slot": "burst",
      "kitLine": "Effects vary by incapacitated allies count",
      "status": "IMPLEMENTED",
      "effectOrReason": "Branch selector resolved statically: 0 allies are ever incapacitated → the '2 or fewer' set is the only one applied ('Only one set of effects is applied')."
    },
    {
      "slot": "burst",
      "kitLine": "Activates if 3+ allies incapacitated",
      "status": "SKIPPED",
      "effectOrReason": "Unreachable branch header (no incapacitation at v1 scope). Verbatim in unmodeled.burst."
    },
    {
      "slot": "burst",
      "kitLine": "Nanoparticle Injection: Revives with 96% HP",
      "status": "SKIPPED",
      "effectOrReason": "No revive/HP-pool channel in the engine and the branch is unreachable. Verbatim in unmodeled.burst."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 101.37% of user ATK 10s, once/battle",
      "status": "SKIPPED",
      "effectOrReason": "Revive-branch-only, once per battle, targets 'all incapacitated allies' — an empty target set at scope. Verbatim in unmodeled.burst."
    },
    {
      "slot": "burst",
      "kitLine": "DEF ▲ 221.76% of user DEF 10s, once/battle",
      "status": "SKIPPED",
      "effectOrReason": "Same unreachable revive branch / empty target set. Verbatim in unmodeled.burst."
    },
    {
      "slot": "burst",
      "kitLine": "Activates if 2 or fewer incapacitated; all",
      "status": "IMPLEMENTED",
      "effectOrReason": "The live branch — trigger burstCast (her OWN burst, Burst II, cd 40s), target allies."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 34.84% of the skill user's ATK, 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterAtkPct 34.84 durationSec 10 — the one modeled burst effect."
    },
    {
      "slot": "burst",
      "kitLine": "■ when in Nanoparticle Consumption; all",
      "status": "SKIPPED",
      "effectOrReason": "Unreachable branch header (NC state requires the revive). Verbatim in unmodeled.burst."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 34.84% … (NC-branch instance)",
      "status": "SKIPPED",
      "effectOrReason": "Textual duplicate under the unreachable NC header; magnitude/target/duration are IDENTICAL to the modeled ≤2-incapacitated line, so the collapse loses no damage. Verbatim in unmodeled.burst (last entry)."
    }
  ],
  "flags": [
    {
      "field": "charFixes.chargeFrames / reloadFrames / pullsPerSec (cadence tuple)",
      "estimate": "Leave the datamined chargeFrames 60 / reloadFrames 141 / ammo 6 as-is, but expect her REAL per-shot cycle to be ~1s LONGER than the sim's (the kit's own 'Full Charge maintained for 1 or more seconds' gate implies she holds full charge ~1s before releasing, which an instant-release charge model does not have). First estimate: effective cycle ≈ charge 1.0s + hold ~1.0s + release, i.e. ~6 pulls per 12-13s + 2.35s reload, vs ~6 pulls per 6-7s + reload unmodeled.",
      "reasoning": "ALWAYS-⚑ #1: rate_of_fire/reloadFrames are known-unreliable datamine fields, and here a second, kit-internal signal contradicts the instant-release assumption. This is load-bearing in BOTH directions: every one of her three per-pull effects (the 220.7% rider, the team heal, the shield/Goddess Blessing duty cycle) scales directly with pull count, so a cycle that is 2x too fast roughly doubles her modeled skill damage and heal cadence.",
      "recipe": "Frame-count a focus recording of rapunzel-sanctuary firing a full magazine out of Full Burst: measure (a) charge-start → muzzle-flash, (b) flash → next charge-start, (c) dry → first shot of the next magazine. Cross-check against the arithmetic total (shots x 220.7% rider popups per 10s window) and against the Goddess Blessing re-apply interval — the three must agree."
    },
    {
      "field": "skill2[0].trigger / skill2[1].trigger (kit-silent 'maintained 1+ sec' primitive)",
      "estimate": "fullCharge as the proxy trigger; one activation per charged pull, with the DEF side throttled to one per 10s by noRetriggerWhileActive.",
      "reasoning": "ALWAYS-⚑ #2-adjacent: 'Full Charge is maintained for 1 or more seconds' is not an engine trigger. fullCharge is the nearest kit-shaped primitive (a charged release, which in-sim happens only at full charge). The real line can also fire WITHOUT a shot (holding charge and releasing aim), which the proxy cannot express — if she is played hold-and-release, the real activation rate can exceed the shot rate.",
      "recipe": "Record a hold-without-firing sequence: does the Goddess Blessing DEF icon / shield appear while she holds charge and never fires? If yes, the correct primitive is a time-in-charge trigger (none exists) and the proxy under-counts; pin the observed re-apply period and encode it as an interval block instead."
    },
    {
      "field": "skill2[0] (shield block) — missing negated Goddess Blessing gate",
      "estimate": "Shield re-emits on every full charge (≈6 per magazine) where the kit emits it ≈once per 10s. Over-emission factor ⚑ ≈ 4-6x on ally `shielded` triggers; zero effect on her own damage.",
      "reasoning": "`shield` has no noRetriggerWhileActive and there is no requiresNotSelfStatus gate, so only the DEF buff could be throttled. I deliberately did NOT fudge an everyN to hide this (an everyN would also drift as her cadence changes) — the cadence error is visible and flagged instead of silently baked in.",
      "recipe": "Run her with a shield-synergy consumer (a `shielded`-trigger or requiresShielded kit) and compare that consumer's proc count against footage of the same pair; if the sim over-procs, add everyN to the shield block set to the MEASURED charges-per-Goddess-Blessing-cycle, or extend the schema with a negated self-status gate."
    },
    {
      "field": "skill2[0].effects[0].durationSec (shield 'removed when charging ends')",
      "estimate": "1.0 sec",
      "reasoning": "The shield exists only while she holds full charge; the kit's own gate says that hold is '1 or more seconds'. 1s is the stated floor, not a measurement. A long duration here would be the classic duration-semantics error (it would leave allies permanently shielded and flip every requiresShielded gate permanently on).",
      "recipe": "Same focus recording as the cadence flag: time the shield bar's appearance → disappearance across several charges and take the median hold."
    },
    {
      "field": "skill1[1].target / skill2[2].target ('Into the Fray' cross-unit status)",
      "estimate": "alliesInStatus{statusPrefix:'Into the Fray', includeSelf:true} — in an isolation/control comp this resolves to SELF ONLY, so her modeled team contribution from these two lines is ~1/5 of her real one on a comp that supplies the status.",
      "reasoning": "This kit never grants 'Into the Fray'; it is granted elsewhere on the roster, so the status-prefix match (exact name, and which units open it) is outside this blind input domain. Keying these blocks to plain `allies` instead would OVER-CREDIT every comp that lacks the status provider — the over-credit direction is worse than the under-credit, so the gated form is the correct default.",
      "recipe": "Grep the tree for `selfStatus` effects whose `name` starts with 'Into the Fray' to confirm the exact prefix and the granting unit(s); then grade her once in a comp containing a granter and once without, and confirm the buffApply targetSlug set widens from {self} to the full squad."
    },
    {
      "field": "skill2[1].effects[0].stat (Goddess Blessing DEF, caster-scaled)",
      "estimate": "defPct 42.24 (inert in v1)",
      "reasoning": "The kit says '42.24% of the SKILL USER'S DEF', which is a caster-scaled grant; the StatKey enum has casterAtkPct / atkOfCasterMaxHpPct / casterMaxHpPct but no caster-scaled DEF. Encoding it as defPct preserves the magnitude and the audit trail while mis-stating the basis (target's own DEF). Zero damage consequence today — defPct is documented inert — so this is a completeness record, not a number to trust.",
      "recipe": "No in-sim check is possible while defPct is inert. When a DEF consumer lands (a DEF-scaling ATK conversion or boss damage), add a casterDefPct StatKey and re-author; until then assert only that the buffApply fires on all allies with the 10s duty cycle."
    },
    {
      "field": "charFixes.statImmunities (scope)",
      "estimate": "['chargeSpeedPct'], active whole-fight",
      "reasoning": "The kit calls the immunity continuous but scopes the activation clause to 'only when at Full Charge during a Full Charge attack'; statImmunities is whole-fight and cannot express the narrower scope. Because she is a charge weapon that is essentially always charging, whole-fight is the right approximation — and it is DAMAGE-RELEVANT in the conservative direction (she refuses ally charge-speed buffs, lowering her shot count vs an un-immune model).",
      "recipe": "Grade her in a comp with a chargeSpeedPct granter (e.g. an Alice/Liter-style charge-speed buffer) and confirm no chargeSpeedPct buffApply survives on her, and that her shot count is unchanged vs the same comp without the granter."
    },
    {
      "field": "skill1[0].effects[0] (heal cadence) + target set",
      "estimate": "One recovery event per full charge, to all allies including self.",
      "reasoning": "Kit-literal per-pull cadence, but its only live consequence is driving ally on-`recovery` consumers, whose proc count therefore inherits the full cadence ⚑ above. 'Affects all allies' is read as including self per the NIKKE convention.",
      "recipe": "Pair her with an on-recovery consumer and compare its proc count per 10s window against footage; if the sim over-procs by a constant factor, the error is the cadence tuple, not the heal."
    },
    {
      "field": "burst[*] / skill1 Nanoparticle chain (branch reachability)",
      "estimate": "Burst collapses to exactly one effect: allies casterAtkPct 34.84 / 10s on every own-burst cast. The revive branch, the +40s burst-cooldown penalty, the continuous DEF ▲10%, and the 101.37%/221.76% once-per-battle grants all contribute ZERO at v1 scope.",
      "reasoning": "v1 has an immortal boss and no HP pool, so no ally is ever incapacitated; 'Nanoparticle Injection' can never fire, so 'Nanoparticle Consumption' can never be entered. Both reachable readings of her burst grant the SAME 34.84% line, which is what makes the collapse safe rather than a guess. The real-fight behaviour (a revive comp where she eats a +40s cooldown) is a different unit entirely and must not be inferred from this model.",
      "recipe": "Assert the collapse directly: count buffApply events with stat 'casterAtkPct' and the flat value (34.84/100 x caster staticAtk) — expect exactly one per burstCast per ally, and ZERO buffApply for the 101.37/221.76 magnitudes. If an HP/incapacitation model ever lands, re-author the burst as two branches plus the skill1 NC chain and re-grade; her burst cadence will change (40s cd + 40s penalty) and that is the dominant effect, not the buff magnitudes."
    },
    {
      "field": "skill2[3].noFb (per-kit Full-Burst exemption)",
      "estimate": "NOT set — the 220.7% rider takes the +50% Full Burst major by landing timing (default ON).",
      "reasoning": "ALWAYS-⚑ #6: noFb is measured-only and defaults OFF. Her rider is a per-pull function-damage hit, not burst-cast/instant damage, so the FB-exemption precedent does not apply. If it is in fact exempt, her modeled skill bucket is over-credited by up to 1.5x inside FB windows.",
      "recipe": "Compare two 220.7% popups from the same focus recording — one inside Full Burst, one outside — at the same buff state; a ratio of 1.0 means noFb:true, ~1.5 means the default is right."
    },
    {
      "field": "hitRatePct (core-hit lift)",
      "estimate": "N/A — not flagged, this kit has NO Hit Rate line.",
      "reasoning": "Recorded explicitly so the judge can distinguish 'absent from the kit' from 'dropped by the parser'. Her only core-relevant datum is the base coreAttackMultiplier 200 on normal attacks; the 220.7% rider is authored core-ineligible (no 'core strike damage' wording).",
      "recipe": "None required. If a future reading shows the rider coring, that is a schema/authoring change (core:true), not a hitRatePct derivation."
    }
  ]
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 2 identical block(s); 0 driver-only; 0 blind-only

### skill2: 1 identical block(s); 1 driver-only; 3 blind-only

- DRIVER ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":220.7}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"allies"},"effects":[{"kind":"shield","maxHpPct":7.39,"durationSec":1}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"allies"},"effects":[{"kind":"buff","stat":"defPct","value":42.24,"durationSec":10,"noRetriggerWhileActive":true},{"kind":"selfStatus","name":"Goddess Blessing","durationSec":10}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":220.7,"crit":true}],"gates":{}}

### burst: 1 identical block(s); 0 driver-only; 0 blind-only

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/rapunzel-sanctuary.json

```json
{
  "note": "Rapunzel: Sanctuary (`rapunzel-sanctuary`; NOT the base `rapunzel` RL/Iron nor `rapunzel-pure-grace` SR/Iron). RL / Supporter / Fire / Pilgrim, Burst II (cd 40s), ammo 6, chargeFrames 60, chargeMult 250, normalMult 61.3, coreMult 200 — weapon cycle carried by characters.json. Kit-autonomy gauntlet 2026-10-29 — test-first, pinned by scripts/tests/units/rapunzel-sanctuary.test.ts (L1–L11). No real-fight recording yet: structure is test-pinned, magnitudes are SL10 kit-text literals (DATAMINED). v1 has no HP pool, so no ally is ever incapacitated: the burst's ≥3-incapacitated Nanoparticle Injection branch never activates, and with it the +40s burst-cooldown rider and the Nanoparticle Consumption state never happen — the burst is always the '2 or fewer incapacitated' branch, and the in-Consumption branch carries the same grant, so one burstCast block is the burst in every reachable state. SKILL1: (a) Full Charge attack → all allies: heal (recovery EVENT per full-charge shot — an RL releases only at full charge, so one per shot; the 3.9%-of-caster-Max-HP amount has no engine consumer); (b) entering Full Burst → target alliesInStatus {statusPrefix 'Into the Fray', includeSelf} → attackDamagePct 27.45 for 10s (self always; an ally only while it holds an open selfStatus named 'Into the Fray: <Mode>'); (c) charge-speed immunity both directions → charFixes.statImmunities ['chargeSpeedPct'] (in-battle buff effects stripped for her only; cube/Overload stats still apply). SKILL2: (a) entering Full Burst → same alliesInStatus target → casterAtkPct 29.17 for 10s (% of HER ATK, a flat add); (b) Full Charge attack → enemy flatDamage 220.7 (plain additional damage: skill bucket, engine rider defaults — crit at her rate, not core-eligible, no range bonus). BURST (burstCast, her own cast — lands before the Full Burst it opens): all allies casterAtkPct 34.84 for 10s. ⚑ LIST: [⚑1] Into the Fray allies: the alliesInStatus target selects an ally only if that ally's override emits a selfStatus whose name starts with 'Into the Fray'. No shipped override does today (marian-queen's burst mode status is named 'Penetrant Wish' and her battle-start Sharpened Resolve mode carries no status; scarlet-goddeath has no override), so in every current comp both Full-Burst-entry grants reach only her. ESTIMATE: an Into the Fray ally (marian-queen / scarlet-goddeath are in a battle-start Into the Fray mode all fight) gains Attack Damage ▲27.45% + 29.17% of her ATK for 10s at every Full Burst. RECIPE: those overrides emit a battle-start selfStatus 'Into the Fray: <Mode>' (999s) and name their burst modes in full; the target then picks them up with no change here. TIER: kit-literal target; ally-side status naming pending. [⚑2] The charge-speed immunity is armed in-game at her first full-charge attack (~1s in); statImmunities is whole-fight. ESTIMATE: differs only for a charge-speed buff applied in the first second that persists. RECIPE: none needed unless such an ally lands. TIER: convention. [⚑3] The two 'Full Charge maintained for 1 or more seconds' lines (shared shield, Goddess Blessing DEF) never fire: the sim releases at full charge and never holds (rapunzel-pure-grace / guilty-mighty-bunny precedent). Both are defensive; the shield would additionally emit 'shielded' events for shield-synergy allies if a player held the charge. ESTIMATE: zero damage under auto-release. RECIPE: a focus recording with a shield-synergy ally, checking for the shield icon between shots. TIER: engine convention (no charge-hold state).",
  "charFixes": {
    "statImmunities": ["chargeSpeedPct"]
  },
  "unmodeled": {
    "skill1": [
      "Restores HP equal to 3.9% of the skill user's final max HP. — magnitude only: the HP amount has no engine consumer (no HP pool); the recovery EVENT is modeled (heal, skill1), which is the board-relevant half.",
      "■ Activates when using Nanoparticle Injection. Affects self.\nCooldown of Burst Skill ▲ 40 sec. This effect cannot be removed.\nNanoparticle Consumption: DEF ▲ 10%. This effect is continuous and cannot be removed. Effect persists after revival. — unreachable: Nanoparticle Injection is the burst's ≥3-incapacitated branch, and v1 has no incapacitation (no HP pool)."
    ],
    "skill2": [
      "■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Goddess Blessing state. Affects self.\nCreates a shared shield with HP equal to 7.39% of the skill user's final max HP that protects all allies from damage. This shield is removed when charging ends. — the sim releases at full charge and never holds it (⚑3); defensive.",
      "■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Goddess Blessing state. Affects all allies.\nGoddess Blessing: DEF ▲ 42.24% of the skill user's DEF for 10 sec. — same unreachable charge-hold trigger (⚑3); DEF is damage-inert."
    ],
    "burst": [
      "Activates if 3 or more allies are incapacitated. Affects all incapacitated allies.\nNanoparticle Injection: Revives with 96% HP. Activates once per battle.\nATK ▲ 101.37% of the skill user's ATK for 10 sec. Activates once per battle.\nDEF ▲ 221.76% of the skill user's DEF for 10 sec. Activates once per battle. — unreachable: v1 has no incapacitation (no HP pool), so the burst is always the '2 or fewer' branch.",
      "■ Activates when this unit is in the Nanoparticle Consumption state. Affects all allies.\nATK ▲ 34.84% of the skill user's ATK for 10 sec. — the Consumption state is unreachable; the grant is identical to the encoded '2 or fewer incapacitated' branch, which is the burst's behaviour in every reachable state."
    ]
  },
  "caveats": [
    "skill1/skill2: the Full-Burst-entry grants reach Into the Fray allies only through an ally selfStatus named 'Into the Fray: <Mode>'; no shipped override emits one yet, so today they land on her alone (⚑1).",
    "skill1: charge-speed immunity is whole-fight (statImmunities), armed in-game at her first full-charge attack (⚑2).",
    "skill2: the shared shield and Goddess Blessing DEF need Full Charge held ≥1s, which the sim never does (⚑3)."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesInStatus",
        "statusPrefix": "Into the Fray",
        "includeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 27.45,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesInStatus",
        "statusPrefix": "Into the Fray",
        "includeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 29.17,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 220.7
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 34.84,
          "durationSec": 10
        }
      ]
    }
  ]
}
```

### 7b. scripts/tests/units/rapunzel-sanctuary.test.ts

```ts
// PER-UNIT KIT SPEC — `rapunzel-sanctuary` (Rapunzel: Sanctuary; RL / Supporter / Fire / Pilgrim,
// Burst II, cd 40s, ammo 6, chargeFrames 60, chargeMult 250, normalMult 61.3). NOT the base
// `rapunzel` (RL/Iron) nor `rapunzel-pure-grace` (SR/Iron). Kit-autonomy gauntlet 2026-10-29.
// Tier 2 (burstCast-vs-fullBurstEnter identity; a status-scoped target "self and all allies in the
// Into the Fray state"; a receiving-side stat immunity).
//
// One assertion group per KIT LINE (L1..L11), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` on rapunzel-sanctuary appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters['rapunzel-sanctuary'].skills, SL10):
//   S1 ■ Full Charge attack → all allies: Restores HP equal to 3.9% of the user's final max HP   [L1]
//      ■ entering Full Burst → self and all allies in the Into the Fray state:
//        Attack Damage ▲ 27.45% for 10 sec                                                     [L2]
//      ■ using Nanoparticle Injection → self: Cooldown of Burst Skill ▲ 40 sec; Nanoparticle
//        Consumption: DEF ▲ 10% (continuous)                                         [L3 UNMODELED]
//      ■ only when at Full Charge during a Full Charge attack → self: immunity to effects that
//        increase / decrease charge speed (continuous)                                        [L4]
//   S2 ■ Full Charge maintained ≥ 1 sec while not in Goddess Blessing → self: shared shield
//        7.39% of the user's final max HP for all allies, removed when charging ends  [L5 UNMODELED]
//      ■ same trigger → all allies: Goddess Blessing: DEF ▲ 42.24% of the user's DEF 10s
//                                                                                  [L6 UNMODELED]
//      ■ entering Full Burst → self and all allies in the Into the Fray state:
//        ATK ▲ 29.17% of the skill user's ATK for 10 sec                                       [L7]
//      ■ Full Charge attack → the enemy nearest the crosshair: 220.7% of final ATK as
//        additional damage                                                                    [L8]
//   BU ■ when NOT in Nanoparticle Consumption: (≥ 3 allies incapacitated → incapacitated allies:
//        Nanoparticle Injection revive 96% HP + ATK ▲ 101.37% / DEF ▲ 221.76% of the user's,
//        once per battle [L10 UNMODELED]) | (≤ 2 incapacitated → all allies: ATK ▲ 34.84% of the
//        skill user's ATK 10s [L9])
//      ■ when IN Nanoparticle Consumption → all allies: ATK ▲ 34.84% of the user's ATK 10s [L11]
//
// Unreachable branches (v1 has no HP pool: the boss deals no damage, nobody is ever incapacitated):
// the ≥3-incapacitated revive branch never activates, so Nanoparticle Injection — and with it the
// +40s burst cooldown and the Nanoparticle Consumption state — never happen; her burst is ALWAYS
// the "≤2 incapacitated" branch. L11 (in Consumption) carries the SAME grant as L9, so the one
// encoded burst block is the burst's behaviour in every reachable state.
//
// "Into the Fray" is a FAMILY of named self-states ("Into the Fray: <Mode>" — marian-queen's
// Sharpened Resolve / Penetrant Wish, scarlet-goddeath's Serene Mind / At One With the Sword).
// The target is the engine `alliesInStatus` selector (statusPrefix "Into the Fray", includeSelf):
// it reads ally `selfStatus` windows by prefix. The fixture gives marian-queen a battle-start
// "Into the Fray: Sharpened Resolve" status (her S1 mode, active from the start of battle) via a
// fixture patch, so the ally half is exercised independently of how her own override names it.
//
// Why each assertion discriminates:
//   L1  Every full-charge shot of hers fires a recovery event on an ALLY (folkwang's probe consumer
//       fires once per shot frame). Counterfactuals: heal block dropped (0 firings); target self
//       (the ally probe never fires).
//   L2  At EVERY Full Burst start (including chains she did not cast in), Attack Damage 27.45 lands
//       on exactly {self, the Into the Fray ally}, expiring 600f later. Counterfactuals: target all
//       allies (liter/folkwang also buffed); target self (the ally missed); burstCast keying (frames
//       land on her cast frames, not FB starts — and miss FBs she did not cast in).
//   L4  An ally-wide charge-speed buff (folkwang probe) lands on every ally but her.
//       Counterfactual: statImmunities removed (she receives it).
//   L7  Same set / frames / duration as L2 for the caster-ATK 29.17 grant. Counterfactuals as L2,
//       plus atkPct (own-ATK) instead of casterAtkPct.
//   L8  Exactly one skill2 220.7% hit per shot of hers, on the shot frame, skill bucket, not
//       core-eligible. Counterfactuals: dropped; doubled; core-flagged.
//   L9  On EACH of her burst casts, caster-ATK 34.84 lands on all four allies on the CAST frame
//       (before Full Burst), expiring 600f later, exactly one grant per ally per cast.
//       Counterfactuals: fullBurstEnter keying (frame shift); target self only; both 34.84 branches
//       encoded unconditionally (double grant).
//   L3/L5/L6/L10/L11 inertness: no shield events, no DEF/101.37 grants, burst cooldown never grows.
//
// Fixture: liter (B1) / rapunzel-sanctuary (B2, focus) / marian-queen (B3, +Into the Fray status) /
// folkwang (B2, bare weapon + synthetic probe blocks: a 'recovery' consumer, a 'shielded' consumer),
// boss Fire. folkwang never takes a stage-2 cast here, so the fullBurstEnter-vs-burstCast check on
// Full Bursts she sat out uses a second fixture with two B2s (twoB2, below). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  bareWeaponOverride,
  runComp,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'rapunzel-sanctuary';
const TEAM = ['liter', SLUG, 'marian-queen', 'folkwang'];
const LITER = 0;
const RAP = 1;
const MARIAN = 2;
const FOLK = 3;
const WIN = 600; // 10 s
const ITF = 'Into the Fray: Sharpened Resolve';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Dmg = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const REC_MARK = 0.0123; // folkwang's recovery-probe marker value
const SHIELD_MARK = 0.0456; // folkwang's shielded-probe marker value
const CSPD_MARK = 7.89; // the ally-wide charge-speed probe

function folkwangProbe(chargeSpeed: boolean) {
  const ov = bareWeaponOverride('folkwang') as any;
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'recovery' },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'atkPct', value: REC_MARK, durationSec: 1 },
      ],
    },
    {
      slot: 'skill1',
      trigger: { kind: 'shielded' },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'atkPct', value: SHIELD_MARK, durationSec: 1 },
      ],
    },
  ];
  if (chargeSpeed) {
    ov.skill2 = [
      {
        slot: 'skill2',
        trigger: { kind: 'battleStart' },
        target: { kind: 'allies' },
        effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: CSPD_MARK }],
      },
    ];
  }
  return ov;
}

const marianInFray = () =>
  withPatchedOverride('marian-queen', (ov) => {
    ov.skill1 = [
      {
        slot: 'skill1',
        trigger: { kind: 'battleStart' },
        target: { kind: 'self' },
        effects: [{ kind: 'selfStatus', name: ITF, durationSec: 999 }],
      },
      ...ov.skill1,
    ];
  });

function run(ov?: any, opts: { chargeSpeed?: boolean } = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: TEAM,
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides: {
      ...(ov ? { [SLUG]: ov } : {}),
      'marian-queen': marianInFray(),
      folkwang: folkwangProbe(!!opts.chargeSpeed),
    },
    cfg: { onEvent: (e) => events.push(e) },
  });
  const buffs = events.filter((e): e is BuffApply => e.kind === 'buffApply');
  const shots = events.filter(
    (e): e is Shot => e.kind === 'shot' && e.unitIdx === RAP
  );
  const dmg = events.filter(
    (e): e is Dmg => e.kind === 'damage' && e.unitIdx === RAP
  );
  const casts = events
    .filter((e) => e.kind === 'burstCast' && e.unitIdx === RAP)
    .map((e) => e.frame);
  const allCasts = events.filter((e) => e.kind === 'burstCast');
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  /** her grants of one authored value (buff key `<caster>:<slot>:<stat>:<value>`) */
  const mine = (stat: string, value: number) =>
    buffs.filter(
      (b) =>
        b.casterIdx === RAP &&
        b.stat === stat &&
        b.key.endsWith(`:${stat}:${value}`)
    );
  const probe = (value: number) =>
    buffs.filter(
      (b) => b.targetIdx === FOLK && b.stat === 'atkPct' && b.value === value
    );
  return { events, buffs, shots, dmg, casts, allCasts, fbStarts, mine, probe };
}
type Run = ReturnType<typeof run>;

/** frame → sorted holder set, for one grant */
function byFrame(bs: BuffApply[]): Map<number, number[]> {
  const m = new Map<number, number[]>();
  for (const b of bs) {
    m.set(b.frame, [...(m.get(b.frame) ?? []), b.targetIdx as number]);
  }
  for (const [f, v] of m) {
    m.set(
      f,
      [...new Set(v)].sort((a, b) => a - b)
    );
  }
  return m;
}

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const blocksWith = (ov: any, pred: (e: any) => boolean) =>
  (['skill1', 'skill2', 'burst'] as const).flatMap((s) =>
    (ov[s] as any[]).filter((b) => (b.effects ?? []).some(pred))
  );
const isGrant = (stat: string, value: number) => (e: any) =>
  e.kind === 'buff' && e.stat === stat && e.value === value;
const retarget = (stat: string, value: number, target: any) =>
  patch((ov) => {
    for (const b of blocksWith(ov, isGrant(stat, value))) {
      b.target = target;
    }
  });
const retrigger = (stat: string, value: number, trigger: any) =>
  patch((ov) => {
    for (const b of blocksWith(ov, isGrant(stat, value))) {
      b.trigger = trigger;
    }
  });
const dropEffect = (pred: (e: any) => boolean) =>
  patch((ov) => {
    for (const s of ['skill1', 'skill2', 'burst'] as const) {
      ov[s] = (ov[s] as any[])
        .map((b) => ({
          ...b,
          effects: (b.effects ?? []).filter((e: any) => !pred(e)),
        }))
        .filter((b) => b.effects.length > 0);
    }
  });

/** Second fixture — liter (B1) / crown (B2) / rapunzel-sanctuary (B2) / marian-queen (B3, +Into the
 *  Fray status) / helm (B3, the SR/Water Helm — NOT helm-aquamarine), boss Fire: crown sits before
 *  her in slot order, so some chains are cast by crown and she sits those Full Bursts out. */
let TWO_B2: ReturnType<typeof twoB2Run> | undefined;
function twoB2Run() {
  const team = ['liter', 'crown', SLUG, 'marian-queen', 'helm'];
  const rap = team.indexOf(SLUG);
  const events: SimEvent[] = [];
  runComp({
    slugs: team,
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides: { 'marian-queen': marianInFray() },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return {
    casts: events
      .filter((e) => e.kind === 'burstCast' && e.unitIdx === rap)
      .map((e) => e.frame),
    fbStarts: events
      .filter((e) => e.kind === 'fullBurstStart')
      .map((e) => e.frame),
    mine: (stat: string, value: number) =>
      events.filter(
        (e): e is BuffApply =>
          e.kind === 'buffApply' &&
          e.casterIdx === rap &&
          e.stat === stat &&
          e.key.endsWith(`:${stat}:${value}`)
      ),
  };
}
const twoB2 = () => (TWO_B2 ??= twoB2Run());

let BASE: Run | undefined;
const base = () => (BASE ??= run());

// ---- fixture sanity ---------------------------------------------------------------------------
describe('fixture', () => {
  it('she shoots, casts her burst in several rotations, and Full Bursts happen', () => {
    const r = base();
    expect(r.shots.length).toBeGreaterThan(50);
    expect(r.casts.length).toBeGreaterThanOrEqual(3);
    expect(r.fbStarts.length).toBeGreaterThanOrEqual(3);
  });
});

// ---- L1: S1 full-charge heal to all allies -----------------------------------------------------
describe('L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled)', () => {
  it('the ally recovery probe fires on every one of her shot frames', () => {
    const r = base();
    const shotFrames = new Set(r.shots.map((s) => s.frame));
    const probeFrames = new Set(r.probe(REC_MARK).map((b) => b.frame));
    expect(shotFrames.size).toBeGreaterThan(50);
    for (const f of shotFrames) {
      expect(probeFrames.has(f), `no ally recovery at shot frame ${f}`).toBe(
        true
      );
    }
    // she is the fixture's only recovery source
    expect([...probeFrames].every((f) => shotFrames.has(f))).toBe(true);
  });

  it('COUNTERFACTUAL heal targets self only → the ally probe never fires', () => {
    const cf = run(
      patch((ov) => {
        for (const b of blocksWith(ov, (e) => e.kind === 'heal')) {
          b.target = { kind: 'self' };
        }
      })
    );
    expect(cf.probe(REC_MARK)).toHaveLength(0);
  });

  it('COUNTERFACTUAL heal dropped → the ally probe never fires', () => {
    const cf = run(dropEffect((e) => e.kind === 'heal'));
    expect(cf.probe(REC_MARK)).toHaveLength(0);
  });
});

// ---- L2 / L7: Full-Burst-entry grants to self + Into the Fray allies --------------------------
const FB_GRANTS: [string, string, number][] = [
  ['L2', 'attackDamagePct', 27.45],
  ['L7', 'casterAtkPct', 29.17],
];

for (const [id, stat, value] of FB_GRANTS) {
  describe(`${id} — entering Full Burst → self + Into the Fray allies: ${stat} ${value} for 10s`, () => {
    it('lands at EVERY Full Burst start on exactly {self, the Into the Fray ally}, 600f', () => {
      const r = base();
      const grants = r.mine(stat, value);
      const frames = byFrame(grants);
      expect([...frames.keys()].sort((a, b) => a - b)).toEqual(r.fbStarts);
      for (const holders of frames.values()) {
        expect(holders).toEqual([RAP, MARIAN]);
      }
      for (const g of grants) {
        expect(g.expiresFrame).toBe(g.frame + WIN);
      }
    });

    it('includes Full Bursts whose chain she did NOT cast in (a fullBurstEnter line, not burstCast)', () => {
      // two-B2 fixture: crown (slot before her) takes the stage-2 cast whenever it is ready
      const r = twoB2();
      const withoutHer = r.fbStarts.filter(
        (s) => !r.casts.some((c) => c <= s && s - c <= 120)
      );
      // the fixture must contain such Full Bursts, else this assertion is vacuous
      expect(withoutHer.length).toBeGreaterThan(0);
      const frames = new Set(r.mine(stat, value).map((g) => g.frame));
      for (const s of r.fbStarts) {
        expect(frames.has(s)).toBe(true);
      }
    });

    it('COUNTERFACTUAL target all allies → liter and folkwang also buffed', () => {
      const cf = run(retarget(stat, value, { kind: 'allies' }));
      const holders = new Set(cf.mine(stat, value).map((g) => g.targetIdx));
      expect(holders.has(LITER) || holders.has(FOLK)).toBe(true);
    });

    it('COUNTERFACTUAL target self → the Into the Fray ally is missed', () => {
      const cf = run(retarget(stat, value, { kind: 'self' }));
      const holders = new Set(cf.mine(stat, value).map((g) => g.targetIdx));
      expect(holders.has(MARIAN)).toBe(false);
    });

    it('COUNTERFACTUAL burstCast keying → grant frames are not the Full Burst starts', () => {
      const cf = run(retrigger(stat, value, { kind: 'burstCast' }));
      const frames = [...byFrame(cf.mine(stat, value)).keys()].sort(
        (a, b) => a - b
      );
      expect(frames).not.toEqual(cf.fbStarts);
    });
  });
}

describe('L7 — the grant is % of the SKILL USER’s ATK (casterAtkPct), not the target’s own ATK', () => {
  it('no atkPct 29.17 grant exists; COUNTERFACTUAL atkPct is distinguishable', () => {
    const r = base();
    expect(r.mine('atkPct', 29.17)).toHaveLength(0);
    const cf = run(
      patch((ov) => {
        for (const b of blocksWith(ov, isGrant('casterAtkPct', 29.17))) {
          for (const e of b.effects) {
            if (isGrant('casterAtkPct', 29.17)(e)) {
              e.stat = 'atkPct';
            }
          }
        }
      })
    );
    expect(cf.mine('casterAtkPct', 29.17)).toHaveLength(0);
  });
});

// ---- L4: charge-speed immunity -----------------------------------------------------------------
describe('L4 — immunity to charge-speed increase/decrease effects', () => {
  it('an ally-wide charge-speed buff lands on every ally but her', () => {
    const r = run(undefined, { chargeSpeed: true });
    const holders = new Set(
      r.buffs
        .filter((b) => b.stat === 'chargeSpeedPct' && b.value === CSPD_MARK)
        .map((b) => b.targetIdx)
    );
    expect(holders.has(LITER)).toBe(true);
    expect(holders.has(MARIAN)).toBe(true);
    expect(holders.has(RAP)).toBe(false);
  });

  it('COUNTERFACTUAL immunity removed → she receives it', () => {
    const cf = run(
      patch((ov) => {
        delete ov.charFixes;
      }),
      { chargeSpeed: true }
    );
    const holders = new Set(
      cf.buffs
        .filter((b) => b.stat === 'chargeSpeedPct' && b.value === CSPD_MARK)
        .map((b) => b.targetIdx)
    );
    expect(holders.has(RAP)).toBe(true);
  });
});

// ---- L8: full-charge additional damage ---------------------------------------------------------
describe('L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage', () => {
  it('exactly one skill2 220.7% hit per shot, on the shot frame', () => {
    const r = base();
    const hits = r.dmg.filter((d) => d.srcSlot === 'skill2');
    expect(hits.length).toBe(r.shots.length);
    for (const h of hits) {
      expect(h.atkPct).toBeCloseTo(220.7, 6);
      expect(h.bucket).toBe('skill');
      // plain "additional damage" — no core-strike wording, so not core-eligible
      expect(h.coreEligible).toBe(false);
    }
    expect(hits.map((h) => h.frame)).toEqual(r.shots.map((s) => s.frame));
  });

  it('engine rider defaults: crit-eligible at her rate; inside Full Burst it takes the +50%', () => {
    const r = base();
    const hits = r.dmg.filter((d) => d.srcSlot === 'skill2');
    expect(hits.every((h) => h.critEligible)).toBe(true);
    const inFb = hits.filter((h) => h.inFullBurst);
    expect(inFb.length).toBeGreaterThan(0);
    expect(inFb.every((h) => h.fbMajorApplied)).toBe(true);
  });

  it('COUNTERFACTUAL core-strike reading (core:true) → the rider becomes core-eligible', () => {
    const cf = run(
      patch((ov) => {
        for (const b of blocksWith(ov, (e) => e.kind === 'flatDamage')) {
          for (const e of b.effects) {
            e.core = true;
          }
        }
      })
    );
    const hits = cf.dmg.filter((d) => d.srcSlot === 'skill2');
    expect(hits.some((h) => h.coreEligible)).toBe(true);
  });

  it('COUNTERFACTUAL dropped → no skill2 damage', () => {
    const cf = run(dropEffect((e) => e.kind === 'flatDamage'));
    expect(cf.dmg.filter((d) => d.srcSlot === 'skill2')).toHaveLength(0);
  });
});

// ---- L9 / L11: burst caster-ATK to all allies --------------------------------------------------
describe('L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s', () => {
  it('lands on all four allies on EACH of her cast frames, 600f', () => {
    const r = base();
    const grants = r.mine('casterAtkPct', 34.84);
    const frames = byFrame(grants);
    expect([...frames.keys()].sort((a, b) => a - b)).toEqual(r.casts);
    for (const holders of frames.values()) {
      expect(holders).toEqual([LITER, RAP, MARIAN, FOLK]);
    }
    for (const g of grants) {
      expect(g.expiresFrame).toBe(g.frame + WIN);
    }
    // "Only one set of effects is applied": one grant per ally per cast, never a second branch
    expect(grants).toHaveLength(4 * r.casts.length);
  });

  it('the grant precedes the Full Burst it opens (cast frame < FB start)', () => {
    const r = base();
    for (const c of r.casts) {
      const fb = r.fbStarts.find((s) => s >= c);
      if (fb !== undefined) {
        expect(c).toBeLessThan(fb);
      }
    }
  });

  it('COUNTERFACTUAL fullBurstEnter keying → frames shift off her casts', () => {
    const cf = run(
      retrigger('casterAtkPct', 34.84, { kind: 'fullBurstEnter' })
    );
    const frames = [...byFrame(cf.mine('casterAtkPct', 34.84)).keys()];
    expect(frames.some((f) => cf.casts.includes(f))).toBe(false);
  });

  it('COUNTERFACTUAL both 34.84 branches encoded unconditionally → a second grant per ally per cast', () => {
    const cf = run(
      patch((ov) => {
        const b = blocksWith(ov, isGrant('casterAtkPct', 34.84))[0];
        ov.skill1 = [...ov.skill1, { ...b, slot: 'skill1' }];
      })
    );
    const all = cf.buffs.filter(
      (b) => b.casterIdx === RAP && b.key.endsWith(':casterAtkPct:34.84')
    );
    expect(all.length).toBeGreaterThan(4 * cf.casts.length);
  });

  it('COUNTERFACTUAL target self → allies not buffed', () => {
    const cf = run(retarget('casterAtkPct', 34.84, { kind: 'self' }));
    const holders = new Set(
      cf.mine('casterAtkPct', 34.84).map((g) => g.targetIdx)
    );
    expect([...holders]).toEqual([RAP]);
  });
});

// ---- L3 / L5 / L6 / L10: unreachable or defensive lines stay inert -----------------------------
describe('L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines', () => {
  it('L5: no shield event from her (the sim releases at full charge — never holds 1s)', () => {
    expect(base().probe(SHIELD_MARK)).toHaveLength(0);
  });

  it('COUNTERFACTUAL L5 shield keyed on fullCharge → the ally shielded probe fires', () => {
    const cf = run(
      patch((ov) => {
        ov.skill2 = [
          ...ov.skill2,
          {
            slot: 'skill2',
            trigger: { kind: 'fullCharge' },
            target: { kind: 'allies' },
            effects: [{ kind: 'shield', maxHpPct: 7.39 }],
          },
        ];
      })
    );
    expect(cf.probe(SHIELD_MARK).length).toBeGreaterThan(0);
  });

  it('L6/L10: no DEF grant and no once-per-battle 101.37% revive grant from her', () => {
    const r = base();
    const hers = r.buffs.filter((b) => b.casterIdx === RAP);
    expect(hers.some((b) => /def/i.test(b.stat))).toBe(false);
    expect(hers.some((b) => b.key.endsWith(':101.37'))).toBe(false);
  });

  it('L3: her burst cooldown never grows by 40s (consecutive casts < 80s apart)', () => {
    // liter (B1) shortens burst cooldowns, so even an 80s cooldown would land a little under 80s —
    // the discriminating arm is the cast-count counterfactual below
    const r = base();
    for (let i = 1; i < r.casts.length; i++) {
      expect(r.casts[i] - r.casts[i - 1]).toBeLessThan(80 * 60);
    }
  });

  it('COUNTERFACTUAL L3 +40s burst cooldown applied unconditionally → she casts fewer bursts', () => {
    // (liter's burst-cooldown reduction shortens both arms, so compare cast COUNTS, not gaps)
    const cf = run(
      patch((ov) => {
        ov.charFixes = { ...(ov.charFixes ?? {}), burstCooldownSec: 80 };
      })
    );
    expect(cf.casts.length).toBeLessThan(base().casts.length);
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/rapunzel-sanctuary.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — rapunzel-sanctuary — kit-autonomy gauntlet 2026-10-29
Arm 1 (pre-S3, NO override on disk — the new unit's starting state; commit 09f031a0): RED as required:
    26 failed (26) — Error: no skill override for "rapunzel-sanctuary" — the engine does not parse skill prose at runtime …
    (counterfactual builders: Error: rapunzel-sanctuary: no override on disk — fixture is stale)
Arm 2 (shipped override, commit d621d81d): npx vitest run scripts/tests/units/rapunzel-sanctuary.test.ts --reporter=verbose — every COUNTERFACTUAL case runs the named nearest-wrong encoding via withPatchedOverride in the same file and asserts it diverges, so GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions. Lines with a GREEN-only pin and their counterfactual arm: L1 (self-target, dropped), L2/L7 (allies, self, burstCast), L7 (atkPct basis), L4 (immunity removed), L8 (core:true, dropped), L9/L11 (fullBurstEnter, self, double branch), L5 (shield on fullCharge), L3 (unconditional +40s cooldown → fewer casts). L6/L10 are absence pins (no DEF / no 101.37 grant) — inert-by-construction, documented UNMODELED.

 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > fixture > she shoots, casts her burst in several rotations, and Full Bursts happen 50ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled) > the ally recovery probe fires on every one of her shot frames 1ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled) > COUNTERFACTUAL heal targets self only → the ally probe never fires 42ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled) > COUNTERFACTUAL heal dropped → the ally probe never fires 36ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > lands at EVERY Full Burst start on exactly {self, the Into the Fray ally}, 600f 1ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > includes Full Bursts whose chain she did NOT cast in (a fullBurstEnter line, not burstCast) 64ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > COUNTERFACTUAL target all allies → liter and folkwang also buffed 33ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > COUNTERFACTUAL target self → the Into the Fray ally is missed 30ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > COUNTERFACTUAL burstCast keying → grant frames are not the Full Burst starts 36ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > lands at EVERY Full Burst start on exactly {self, the Into the Fray ally}, 600f 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > includes Full Bursts whose chain she did NOT cast in (a fullBurstEnter line, not burstCast) 1ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > COUNTERFACTUAL target all allies → liter and folkwang also buffed 37ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > COUNTERFACTUAL target self → the Into the Fray ally is missed 27ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > COUNTERFACTUAL burstCast keying → grant frames are not the Full Burst starts 33ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — the grant is % of the SKILL USER’s ATK (casterAtkPct), not the target’s own ATK > no atkPct 29.17 grant exists; COUNTERFACTUAL atkPct is distinguishable 24ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L4 — immunity to charge-speed increase/decrease effects > an ally-wide charge-speed buff lands on every ally but her 34ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L4 — immunity to charge-speed increase/decrease effects > COUNTERFACTUAL immunity removed → she receives it 35ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage > exactly one skill2 220.7% hit per shot, on the shot frame 2ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage > COUNTERFACTUAL core-strike reading (core:true) → the rider becomes core-eligible 27ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage > COUNTERFACTUAL dropped → no skill2 damage 25ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > lands on all four allies on EACH of her cast frames, 600f 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > the grant precedes the Full Burst it opens (cast frame < FB start) 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > COUNTERFACTUAL fullBurstEnter keying → frames shift off her casts 23ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > COUNTERFACTUAL both 34.84 branches encoded unconditionally → a second grant per ally per cast 23ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > COUNTERFACTUAL target self → allies not buffed 22ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > L5: no shield event from her (the sim releases at full charge — never holds 1s) 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > COUNTERFACTUAL L5 shield keyed on fullCharge → the ally shielded probe fires 41ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > L6/L10: no DEF grant and no once-per-battle 101.37% revive grant from her 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > L3: her burst cooldown never grows by 40s (consecutive casts < 80s apart) 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > COUNTERFACTUAL L3 +40s burst cooldown applied unconditionally → she casts fewer bursts 26ms
      Tests  30 passed (30)
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > fixture > she shoots, casts her burst in several rotations, and Full Bursts happen 54ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled) > the ally recovery probe fires on every one of her shot frames 1ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled) > COUNTERFACTUAL heal targets self only → the ally probe never fires 42ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L1 — Full Charge attack → all allies: HP recovery (event; magnitude unmodeled) > COUNTERFACTUAL heal dropped → the ally probe never fires 37ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > lands at EVERY Full Burst start on exactly {self, the Into the Fray ally}, 600f 1ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > includes Full Bursts whose chain she did NOT cast in (a fullBurstEnter line, not burstCast) 63ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > COUNTERFACTUAL target all allies → liter and folkwang also buffed 33ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > COUNTERFACTUAL target self → the Into the Fray ally is missed 30ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L2 — entering Full Burst → self + Into the Fray allies: attackDamagePct 27.45 for 10s > COUNTERFACTUAL burstCast keying → grant frames are not the Full Burst starts 33ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > lands at EVERY Full Burst start on exactly {self, the Into the Fray ally}, 600f 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > includes Full Bursts whose chain she did NOT cast in (a fullBurstEnter line, not burstCast) 1ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > COUNTERFACTUAL target all allies → liter and folkwang also buffed 36ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > COUNTERFACTUAL target self → the Into the Fray ally is missed 28ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — entering Full Burst → self + Into the Fray allies: casterAtkPct 29.17 for 10s > COUNTERFACTUAL burstCast keying → grant frames are not the Full Burst starts 32ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L7 — the grant is % of the SKILL USER’s ATK (casterAtkPct), not the target’s own ATK > no atkPct 29.17 grant exists; COUNTERFACTUAL atkPct is distinguishable 24ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L4 — immunity to charge-speed increase/decrease effects > an ally-wide charge-speed buff lands on every ally but her 33ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L4 — immunity to charge-speed increase/decrease effects > COUNTERFACTUAL immunity removed → she receives it 34ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage > exactly one skill2 220.7% hit per shot, on the shot frame 2ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage > engine rider defaults: crit-eligible at her rate; inside Full Burst it takes the +50% 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage > COUNTERFACTUAL core-strike reading (core:true) → the rider becomes core-eligible 26ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L8 — Full Charge attack → enemy: 220.7% of final ATK as additional damage > COUNTERFACTUAL dropped → no skill2 damage 24ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > lands on all four allies on EACH of her cast frames, 600f 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > the grant precedes the Full Burst it opens (cast frame < FB start) 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > COUNTERFACTUAL fullBurstEnter keying → frames shift off her casts 22ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > COUNTERFACTUAL both 34.84 branches encoded unconditionally → a second grant per ally per cast 22ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L9/L11 — burst → all allies: ATK ▲ 34.84% of the skill user’s ATK for 10s > COUNTERFACTUAL target self → allies not buffed 21ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > L5: no shield event from her (the sim releases at full charge — never holds 1s) 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > COUNTERFACTUAL L5 shield keyed on fullCharge → the ally shielded probe fires 41ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > L6/L10: no DEF grant and no once-per-battle 101.37% revive grant from her 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > L3: her burst cooldown never grows by 40s (consecutive casts < 80s apart) 0ms
 ✓ scripts/tests/units/rapunzel-sanctuary.test.ts > L3/L5/L6/L10 — unreachable (no incapacitation, no held charge) / defensive lines > COUNTERFACTUAL L3 +40s burst cooldown applied unconditionally → she casts fewer bursts 23ms
      Tests  31 passed (31)
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — rapunzel-sanctuary (Rapunzel: Sanctuary) — kit-autonomy gauntlet 2026-10-29

Driver: Claude Opus 5.5. NOT the base `rapunzel` (RL/Iron) nor `rapunzel-pure-grace` (SR/Iron).
Tier 2 (burstCast-vs-fullBurstEnter identity: two Full-Burst-entry grants vs one burst-cast grant;
a status-scoped target "self and all allies in the Into the Fray state"; a receiving-side stat
immunity). Claude-only routing (owner 2026-10-02): S2b claude-fable-5 + claude-fable-5-1, S5/S6
claude-opus-5, S7 claude-fable-5-1 (binding) + claude-fable-5 — same-family evidence only.

## Engine change (commit 535abade + review fix a2f5bcfe)

New opt-in target `{kind:'alliesInStatus', statusPrefix, includeSelf?}`: allies whose kit-named
self-status window (`selfStatus` effect → `unit.selfStatuses`, the channel `requiresSelfStatus`
reads) is open at the apply frame and whose name starts with the prefix; `includeSelf` adds the
owner unconditionally. "Into the Fray" is a FAMILY of named modes in the roster
(marian-queen: "Into the Fray: Sharpened Resolve" from battle start, "Into the Fray: Penetrant Wish"
on burst; scarlet-goddeath: "Into the Fray: Serene Mind" from battle start, "Into the Fray: At One
With the Sword" on burst), so a prefix match is the literal reading. `scripts/regression.ts` output
was byte-identical with and without the engine commit. Code review: claude-fable-5-1,
FIX-BEFORE-MERGE → fixed (cross-slug producer census WARN in validate-structural; rank-builder
burstCdr enabler guard). Pinned by scripts/tests/engine/allies-in-status.test.ts.

Known dependency (⚑1 in the override): no shipped override emits an "Into the Fray: …" selfStatus
yet (marian-queen names its burst mode "Penetrant Wish" and gives its battle-start mode no status;
scarlet-goddeath has no override), so in every current comp both Full-Burst-entry grants reach only
her. The unit test exercises the ally half by patching marian-queen in the fixture with a battle-start
"Into the Fray: Sharpened Resolve" status. Editing marian-queen's override is outside this run's
authority — proposed in the summary.

## S2c reconciliation (driver vs the two S2b reviewers)

Converged on every line: dispositions, trigger identities (fullCharge for the heal and the 220.7%
rider; fullBurstEnter for the 27.45 / 29.17 grants; burstCast for the 34.84 burst grant), targets
(allies / alliesInStatus+includeSelf / enemy / allies), stat basis (attackDamagePct; casterAtkPct for
both "of the skill user's ATK" lines), the charFixes.statImmunities ['chargeSpeedPct'] home for the
immunity, the UNMODELED set (Nanoparticle Injection branch + its +40s cooldown and Consumption DEF;
the charge-hold shield and Goddess Blessing DEF; the ≥3-incapacitated revive branch; the duplicate
in-Consumption 34.84 branch), and the 6-line load-bearing set. Additions taken from their
nearest-wrong lists: the rider is not core-eligible (+ core:true counterfactual); exactly one burst
grant per ally per cast (+ double-branch counterfactual); a two-B2 fixture so the Full-Burst-entry
grants are shown to fire on Full Bursts she sat out (fable-5-1's fixture hazard).

## Convergence run — S5 blind tests vs the driver's override

The verbatim S5 file wires `opts.onEvent` (the harness reads `opts.cfg.onEvent`), so it collects no
events and every test fails on its fixture check. `blind/rapunzel-sanctuary.adapted.test.ts` changes
ONLY that wiring. Adapted run vs the shipped override: 7 pass / 3 fail / 3 skip.

- S2-a (shield must exist) and S2-b (Goddess Blessing DEF must be emitted): RED by design. S5 and S6
  (both opus-5) proxied "Full Charge is maintained for 1 or more seconds" onto `fullCharge`. Both S2b
  reviewers named exactly that as the nearest-wrong reading; three shipped overrides carry the same
  clause UNMODELED for the same reason (rapunzel-pure-grace, guilty-mighty-bunny, sin-swift-bunny —
  "the sim releases at full charge, so it never holds"). `fullCharge` fires on every RL shot (~every
  1.4s); a 1-second hold past full charge never happens under auto-release. Driver keeps both lines
  UNMODELED (⚑3). Both are defensive (shield HP / DEF); the shield would additionally emit `shielded`
  events, which no fixture unit consumes.
- S2-d: its `noFb: true` counterfactual arm expects the rider to lose damage, but `noFb` on an override
  effect is engine-inert under the default (src/engine/sim.ts header: "noFb in an override is now
  INERT under the default"; validate-overrides rejects it). The driver's unit test pins the rider
  defaults directly (L8 "engine rider defaults": every rider hit crit-eligible; every rider hit inside
  a Full Burst has fbMajorApplied). A blind-test defect, not a divergence;
  the arm's premise (the rider takes the Full-Burst +50% by landing time) holds in the driver's model.
- The verbatim fixture is controlComp (liter / crown / her / helm): crown takes every stage-2 cast
  by slot order, so she casts 0 bursts there; the blind burst assertion proves the block by re-keying
  it to fullBurstEnter, which passes.

## S6 blind override vs the driver override

Identical on every damage-bearing line (heal, both alliesInStatus FB-entry grants with the same
prefix + includeSelf, the 220.7 rider, the burst grant, statImmunities). Differs only on: (1) the two
charge-hold lines encoded on fullCharge (shield 1s + defPct 42.24 with noRetriggerWhileActive and a
"Goddess Blessing" selfStatus) — see above; (2) `crit: true` on the rider — redundant: flat-damage
riders are crit-eligible by default (pinned in the driver's L8 group).
