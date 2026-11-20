# S7 RECONCILING-JUDGE PACKET — `sky` (Sky, SR/Supporter/Iron/Burst I)

Built 2026-11-20 by scripts/kit-autonomy/build-judge-packet.ts. Sections: 1 contract · 2 mechanics SSOT · 3 ground truth · 4 S2b review(s) · 5 S5 blind test · 6 S6 blind override · 7 driver implementation · 8 S2d matrix + driver notes.

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
  "slug": "sky",
  "name": "Sky",
  "weapon": "SR",
  "burst": "I",
  "class": "Supporter",
  "element": "Iron",
  "manufacturer": "Elysion",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 151,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "normalAttackMultiplier": 70.08,
  "coreAttackMultiplier": 200,
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  }
}
```

### skill1

```text
■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Defiant Spirit state. Affects all allies.
Defiant Spirit: Grants debuff immunity to 1 debuff(s) for 5 sec. Activates 3 time(s) per battle.
■ Activates when Full Charge is maintained for 1 or more seconds. Affects self.
Gains Pierce for 40 sec.
Pierce Damage ▲ 60% for 40 sec.
```

### skill2

```text
■ Activates when entering Full Burst. Affects all allies.
ATK ▲ 20% of the skill user's ATK for 10 sec.
■ Activates when High Tension is removed. Affects all allies.
Low Tension: ATK ▼ 10% of the skill user's ATK for 20 sec.
■ Activates only when in the Low Tension state. Affects self.
Low Energy: Stuns for 20 sec.
```

### burst

```text
■ Affects all allies.
High Tension: Pierce Damage ▲ 15% for 35 sec. Stacks up to 3 times.
■ Affects self.
ATK ▲ 50% for 35 sec.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "sky",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Defiant Spirit: debuff immunity 1, 5s",
      "disposition": "UNMODELED",
      "scope": "Ally-protective utility: immunity to 1 debuff per application, 5s window, 3 activations per battle, gated 'while not in Defiant Spirit' (self-cooldown re-arm).",
      "durationSemantics": "5 sec wall-clock per activation; hard cap 3 activations per battle (a battle-scoped charge count, not a duration).",
      "triggerIdentity": "fullCharge maintained >=1 sec, gated on NOT currently in Defiant Spirit (noRetriggerWhileActive shape). NOT shotFired; the 1s-hold clause is a charge-hold condition.",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "Skipping it with no audit trail — or, subtler, modeling Sky's own skill2 Low Tension ATK ▼ while ignoring that this immunity exists in-kit precisely to eat that debuff (tandem rule #4).",
      "distinguishingAssertion": "No block in the override emits any effect for this line; the override's unmodeled.skill1 carries it verbatim. No buffApply with an immunity-like stat exists (schema has no immunity primitive).",
      "inertness": "Must move NOTHING: no damage, no buffApply, no resource. Pure unmodeled record.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Gains Pierce for 40 sec",
      "disposition": "FAITHFUL",
      "scope": "Self attacks become Pierce-tagged for the window — this is what makes BOTH pierce-damage buffs (own 60%, burst 15%) live on her hits.",
      "durationSemantics": "40 sec wall-clock (durationSec:40 on a gainPierce effect), refreshed per qualifying full charge — near-permanent uptime given SR cadence (chargeFrames 60), but NOT whole-fight by construction.",
      "triggerIdentity": "fullCharge (proxy for 'Full Charge maintained 1+ sec'). ⚑ the 1s-hold residue is a convention the sim's release-at-full-charge model cannot literally express; recipe: footage of auto-play charge-hold cadence vs first proc time.",
      "targetSet": "self",
      "nearestWrongModel": "Top-level hasPierce:true (static whole-fight flag) instead of a gainPierce effect on the fullCharge block — the exact boolean-vs-step-gate trap the schema calls out.",
      "distinguishingAssertion": "gainPierce effect with durationSec 40 sits on a skill1 fullCharge-triggered block and override.hasPierce is falsy; damage events before the first full-charge pull resolves carry no pierce tag (pierceDamagePct contributes 0 to them), green under faithful, red under static hasPierce.",
      "inertness": "Allies' pierce state must not change — the grant is self-only.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Pierce Damage ▲ 60% for 40 sec",
      "disposition": "FAITHFUL",
      "scope": "pierceDamagePct — Damage-Up bucket entry read ONLY by Pierce-tagged hits; live on Sky's hits only inside the paired gainPierce window.",
      "durationSemantics": "40 sec wall-clock, refreshed per qualifying full charge; co-terminal with the pierce grant.",
      "triggerIdentity": "Same fullCharge block as the pierce grant (one ■ header, two effect lines).",
      "targetSet": "self",
      "nearestWrongModel": "Generic attackDamagePct 60 (unscoped Damage Up), or target allies — either over-credits: the buff must be dead weight on any non-pierce hit and on every teammate.",
      "distinguishingAssertion": "buffApply {stat:'pierceDamagePct', value:60, caster==target==Sky} after the first full charge; totals(res) for every OTHER slug is byte-identical when this effect is stripped via withPatchedOverride (allies unaffected), while Sky's own total drops.",
      "inertness": "Ally damage totals; Sky's damage during any frame where she is not pierce-tagged.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 20% of the skill user's ATK, 10s",
      "disposition": "FAITHFUL",
      "scope": "Caster-scaled flat ATK add to the whole team — the classic supporter line; generic (not attack-type-scoped).",
      "durationSemantics": "10 sec wall-clock per Full Burst entry.",
      "triggerIdentity": "fullBurstEnter — 'when entering Full Burst' fires on ANY team FB, not only rotations Sky bursts (burstCast would under-fire whenever another B1 completes the chain, and Sky's own 40s burst cd makes that divergence real).",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "stat atkPct 20 (each target's OWN ATK) instead of casterAtkPct — over-credits a high-ATK carry since the kit scales off Sky's supporter ATK; second-nearest: trigger burstCast, halving uptime.",
      "distinguishingAssertion": "At every fullBurstStart event a buffApply {stat:'casterAtkPct'} lands on each ally with value == 0.20 × Sky.staticAtk — the SAME flat number on every target (flat-resolved at apply). Under the atkPct misread the emitted stat/key differ and the carry's gain scales with its own ATK.",
      "inertness": "No application outside FB entries; value must not track targets' ATK.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Low Tension: ATK ▼ 10% of user's ATK 20s",
      "disposition": "FIX",
      "scope": "A team-wide MALUS (negative caster-scaled flat ATK) — damage-relevant in the wrong direction; also opens the named 'Low Tension' self-state the stun line gates on.",
      "durationSemantics": "20 sec wall-clock. Fires each time High Tension lapses: burst cd 40s vs High Tension 35s guarantees a lapse every cycle (steady-state: team ATK ▼ for ~20 of every ~40s).",
      "triggerIdentity": "selfStatusEnd {name:'High Tension'} — fires on the frame Sky's own burst-opened High Tension window lapses. NOT fullBurstEnd (FB ends ~10s after entry; High Tension ends 35s after her CAST — different frames), and NOT an interval.",
      "durationNote": "requires the burst to also author selfStatus 'High Tension' 35s on Sky, else this trigger can never fire",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "Omitting the line as 'defensive/edge-case flavor' (a debuff on your own team is easy to wave off), or keying it to fullBurstEnd — both erase/mistime a recurring ~10%-of-caster-ATK team-wide dip.",
      "distinguishingAssertion": "At t ≈ (Sky's burstCast frame + 35s) — NOT at any fullBurstEnd frame — a buffApply with stat 'casterAtkPct' and NEGATIVE value == -0.10 × Sky.staticAtk lands on all allies; team totals over the following 20s are lower than with the effect stripped.",
      "inertness": "Must not fire while High Tension is live (recast before lapse = window moved, no proc); must not scale off targets' own ATK.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Low Energy: Stuns for 20 sec",
      "disposition": "FIX",
      "scope": "SELF stun — no fire/charge/reload for 20s (bursting unaffected per engine). Zeroes Sky's own normal/charge output, her S1 re-triggering, and her gauge contribution for the window. Offensive-relevant despite 'stun' wording.",
      "durationSemantics": "20 sec wall-clock, coextensive with the Low Tension state. ⛑ Whether re-entering High Tension (her next burst at lapse+5s) cancels Low Tension and ends the stun early (effective ~5s, not 20s) is kit-silent — a ×4 swing on her downtime. Literal reading: full 20s. Recipe: footage of her fire resumption after the burst recast.",
      "triggerIdentity": "'Activates only when in the Low Tension state' = fires on Low Tension ENTRY — same frame as the selfStatusEnd('High Tension') block, authored either on that trigger or gated requiresSelfStatus:'Low Tension'.",
      "targetSet": "self",
      "nearestWrongModel": "Dropping the stun entirely as defensive flavor — over-credits Sky's personal output by up to ~50% uptime (20s stunned of every ~40s cycle under the literal reading).",
      "distinguishingAssertion": "Zero 'shot' events (and zero reload events) with srcSlot==Sky in [lapseFrame, lapseFrame+20s] via cfg.onEvent, while her burstCast at lapse+~5s still occurs; shots resume after the stun. Red under the dropped-stun model (shots continue through the window).",
      "inertness": "Allies' shot cadence; Sky's bursting.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "High Tension: Pierce Damage ▲ 15%, 35s ×3",
      "disposition": "FAITHFUL",
      "scope": "Team pierceDamagePct — only moves Pierce-tagged hits (Sky's own inside her S1 window; a pierce carry's always). Additive with Sky's own 60% in the same bucket.",
      "durationSemantics": "35 sec wall-clock, maxStacks 3 — but burst cd 40s > 35s duration means stacks can NEVER accumulate in practice: author maxStacks:3 with value 15, steady-state 1 stack. Also opens the 'High Tension' named self-status (selfStatus, 35s, on Sky) that skill2's removal trigger reads.",
      "triggerIdentity": "burstCast (her OWN burst block — fires only on rotations Sky casts), NOT fullBurstEnter. With another B1 in the comp they diverge; keying to fullBurstEnter over-credits.",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "value 45 pre-stacked (15×3 'stack-cap product' fudge) — triple-credits a cap the 40s cooldown makes unreachable; second-nearest: fullBurstEnter trigger; third: forgetting the paired selfStatus, which silently kills the entire Low Tension loop (skill2 blocks never fire — a conveniently flattering omission).",
      "distinguishingAssertion": "buffApply {stat:'pierceDamagePct', value:15, maxStacks:3, stacks:1} on each ally at Sky's burstCast frames only; stacks never exceed 1 across the whole run; AND a later selfStatusEnd-driven skill2 proc exists (proving the selfStatus was authored).",
      "inertness": "Non-pierce allies' totals must not move when this buff is stripped; no application on FBs Sky did not cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 50% for 35 sec (self)",
      "disposition": "FAITHFUL",
      "scope": "Plain self ATK percentage — scales her OWN ATK (stat atkPct), feeding her normals, charge damage, and any caster-ATK-scaled grants she emits (her skill2 casterAtkPct resolves off staticAtk at apply, so verify which basis the engine uses — buffApply values snapshot staticAtk per the harness note, so this does NOT inflate her team grant).",
      "durationSemantics": "35 sec wall-clock — near-full uptime vs the 40s cooldown (5s gap each cycle, coinciding with the Low Tension window).",
      "triggerIdentity": "burstCast (own burst block, self clause).",
      "targetSet": "self",
      "nearestWrongModel": "Target allies (bleeding a 50% ATK buff onto the carry — large over-credit), or casterAtkPct 50 (flat basis instead of percentage).",
      "distinguishingAssertion": "buffApply {stat:'atkPct', value:50, casterIdx==targetIdx==Sky} at her burstCast frames; stripping it via withPatchedOverride changes totals(res)['sky'] only — every other slug's total is unchanged.",
      "inertness": "All four teammates' totals.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:gainPierce-40s",
    "skill1:pierceDamagePct-60",
    "skill2:casterAtkPct-20-fullBurstEnter",
    "skill2:lowTension-casterAtkPct--10",
    "skill2:lowEnergy-stun-20s",
    "burst:highTension-pierceDamagePct-15",
    "burst:selfAtkPct-50"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Defiant Spirit: Grants debuff immunity to 1 debuff(s) for 5 sec. Activates 3 time(s) per battle."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in order of likelihood: (1) The tension loop silently missing — if the burst does not author selfStatus 'High Tension' (35s on self), skill2's selfStatusEnd trigger is structurally dead and BOTH the team ATK▼ and the 20s self-stun vanish, flattering Sky by a large margin; a passing suite that never asserts a post-lapse event would not catch it. Demand an assertion anchored at burstCast+35s. (2) Stun dropped as 'defensive'. (3) ATK lines mis-based: both skill2 lines are '% of the skill user's ATK' (casterAtkPct, flat-resolved, one negative) while the burst self line is plain atkPct — three different encodings, easy to homogenize. (4) burstCast vs fullBurstEnter: the burst blocks are her own cast; the skill2 team buff is 'entering Full Burst' — they are DIFFERENT triggers in the same kit, so a uniform choice is wrong on one side. Fixture hazard: Sky is Burst I with cd 40s — controlComp fixes liter at B1, so a faithful test needs a comp where Sky actually casts (replace liter or assert the alternation), else burstCast blocks fire zero times and the whole tension loop is untested. Measurement gates (⛑): (a) whether burst recast at lapse+5s cancels Low Tension/stun early (literal 20s vs effective 5s — biggest open swing on her own output); (b) the 'Full Charge maintained 1+ sec' hold convention for the S1 trigger (first-proc phase). Defiant Spirit immunity is unmodeled; HYPOTHESIS: its 3 charges (re-armed only by the 5s 'not in Defiant Spirit' gate) are exhausted in the opening ~20s, before the first High-Tension lapse at ~cast+35s, so NOT modeling the immunity should not reduce the Low Tension debuff's modeled uptime — the driver should state this reconciliation, not just skip the line.",
  "model": "claude-fable-5"
}
```

### 4b. Second S2b reviewer (claude-fable-5-1, blind — Tier-2 ×2 models)

```json
{
  "slug": "sky",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Defiant Spirit: debuff immunity x1, 5s",
      "disposition": "UNMODELED",
      "scope": "defensive — debuff immunity only; no damage, no weapon-state, no stat",
      "durationSemantics": "5 sec per activation; 3 activations per battle; gated on NOT already in Defiant Spirit",
      "triggerIdentity": "fullCharge held >=1s while not in Defiant Spirit (self-status gate); not a damage path",
      "targetSet": "all allies (incl. self)",
      "nearestWrongModel": "authoring a selfStatus 'Defiant Spirit' with some payload, or (worse) reading 'Activates 3 time(s) per battle' as a 3-use cap on the ADJACENT Pierce block",
      "distinguishingAssertion": "no buffApply from sky skill1 with any stat other than pierceDamagePct; the Pierce/pierceDamagePct skill1 applies are NOT capped at 3 per fight (count of skill1 pierceDamagePct applies over a 180s run >> 3)",
      "inertness": "must contribute zero blocks with stat/damage effects; must not cap or gate the Pierce block",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Gains Pierce for 40 sec",
      "disposition": "FAITHFUL",
      "scope": "self normal (full-charge) shots become Pierce-tagged — makes pierceDamagePct (own 60% + High Tension) live for her hits; no direct damage",
      "durationSemantics": "40 wall-clock sec from each proc (gainPierce durationSec 40); refreshed by each qualifying full-charge; NOT permanent, NOT rounds",
      "triggerIdentity": "fullCharge (charged pull) — ⚑ proxy: the kit requires the charge be HELD >=1 s past full (manual play), which the sim cannot express; in practice one hold per ~40s window suffices",
      "targetSet": "self",
      "nearestWrongModel": "top-level hasPierce:true (whole-fight tag from frame 0, no first-shot gap, no trigger) — or encoding the hold as nothing at all vs as a permanent fire-rate penalty",
      "distinguishingAssertion": "no gainPierce/pierce effect live at frame 0; the first pierce window opens at the first full-charge pull of sky's slot (first `shot` event frame >= chargeFrames), and the override uses a skill1 block with trigger fullCharge + effect kind gainPierce durationSec 40 (inspection), hasPierce absent/false",
      "inertness": "must not tag allies' shots as pierce; must not alter sky's cadence beyond the ⚑-documented hold cost (if a hold cost is modeled, it must be ≤ ~1 pull per 40s, never per-shot)",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Pierce Damage ▲ 60% for 40 sec",
      "disposition": "FAITHFUL",
      "scope": "pierceDamagePct — Damage Up bucket entry read ONLY by Pierce-tagged hits (hers, via the gainPierce window); additive with High Tension's 15%/stack and with any ally Damage Up",
      "durationSemantics": "40 sec, refreshed per qualifying full-charge pull (uptime ~100% after the first shot; sawtooth never lapses at SR cadence)",
      "triggerIdentity": "same fullCharge (held) trigger as the Pierce grant — same block",
      "targetSet": "self",
      "nearestWrongModel": "attackDamagePct 60 (generic Damage Up — would still move sky's total identically while she is pierce-tagged, but would also live outside the pierce window and breaks if gainPierce ever lapses/stun gap) — or a `passive` applying at frame 0",
      "distinguishingAssertion": "buffApply stat 'pierceDamagePct' value 60, targetSlug 'sky', casterIdx===targetIdx, first such event frame === the first sky `shot` frame (not frame 0), expiresFrame === applyFrame + 40*60; no buffApply stat 'attackDamagePct' from sky",
      "inertness": "zero pierceDamagePct-60 applies on liter/crown/helm; with the value patched to 0 via withPatchedOverride, totals of liter/crown/helm are byte-identical (they carry no pierce)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Entering Full Burst → ATK ▲ 20% of user",
      "disposition": "FAITHFUL",
      "scope": "generic ATK (flat add), all attack categories",
      "durationSemantics": "10 sec wall-clock (the FB window), re-applied every Full Burst",
      "triggerIdentity": "fullBurstEnter (ANY team Full Burst, incl. rotations where liter casts B1 and sky does not) — NOT burstCast",
      "targetSet": "all allies incl. self (5 targets)",
      "nearestWrongModel": "stat atkPct 20 (scales each TARGET's own ATK — over-credits the carry several-fold vs a Supporter-ATK-based flat add); or keying to burstCast (would skip rotations where liter takes the B1 cast)",
      "distinguishingAssertion": "per fullBurstStart event there are exactly 5 buffApply events stat 'casterAtkPct' key from sky skill2, value ≈ 0.20 × sky.staticAtk (flat, NOT 20), expiresFrame === fbStartFrame + 600; count of these apply groups === count of fullBurstStart events (even when sky's own burstCast count is lower)",
      "inertness": "no buffApply stat 'atkPct' value 20 from sky; value does not change when sky's own burst ATK ▲50% is live (engine resolves off staticAtk — see notes)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "High Tension removed → Low Tension ATK ▼",
      "disposition": "FAITHFUL",
      "scope": "generic ATK DEBUFF on the whole team (flat negative add of 10% of sky's ATK) — a damage-moving line, NOT flavor",
      "durationSemantics": "20 sec from the lapse of High Tension; High Tension is 35 s and sky's burst cd is 40 s, so WITHOUT burst-CDR the lapse happens every cycle at cast+35s; WITH enough CDR (effective cd < 35 s) it never fires",
      "triggerIdentity": "selfStatusEnd {name:'High Tension'} — fires ONCE when sky's own High Tension window lapses naturally; a re-cast that refreshes the window is NOT a removal. Requires the burst block to open selfStatus 'High Tension' 35 s on sky",
      "targetSet": "all allies incl. self; the Low Tension state itself is a self-status on sky (selfStatus 'Low Tension' 20 s) that gates the stun line",
      "nearestWrongModel": "(a) dropping the line as 'defensive/flavor' → omits a team-wide ATK ▼ and the stun chain; (b) atkPct -10 instead of casterAtkPct -10; (c) fullBurstEnd or interval{40} as the trigger; (d) firing once per ALLY whose High Tension lapses (5 stacked ▼ instead of 1); (e) using the boss-status channel (targetStatus/requiresTargetStatus) instead of selfStatus",
      "distinguishingAssertion": "in a fixture where sky actually casts and no CDR is present: for each sky burstCast at frame C, there are exactly 5 buffApply events stat 'casterAtkPct' value ≈ -0.10 × sky.staticAtk (negative flat) at frame C + 35*60 (±1 frame), one per unit, expiresFrame = that frame + 1200; zero such events between C and C+35*60; with a CDR source making effective cd < 35 s, zero such events for the whole run",
      "inertness": "must not fire on fullBurstEnd, on liter's B1 casts, or at battle start; must apply exactly once per lapse (5 events, not 25)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "In Low Tension → Low Energy: Stuns 20 sec",
      "disposition": "FAITHFUL",
      "scope": "self stun — sky fires/charges/reloads nothing for 20 s (her own DPS → 0 for that window; S1 fullCharge trigger cannot fire, so her 40 s pierce window must survive the gap on its last refresh)",
      "durationSemantics": "20 sec, coincident with the Low Tension window (both 20 s from the lapse)",
      "triggerIdentity": "conditional passive 'only when in Low Tension' ≡ fires at Low Tension onset: either a `stun durationSec 20` effect on the same selfStatusEnd block (self-targeted) or a block gated requiresSelfStatus 'Low Tension'. ⚑ ENGINE GAP: engine stun says 'bursting unaffected'; in-game a stunned Nikke cannot activate Burst — reported, not resolved (out of scope)",
      "targetSet": "self only",
      "nearestWrongModel": "omitting it (treating self-stun as non-damage) — it removes ~20 s of sky's own fire per 40 s cycle; or targeting allies; or treating it as a one-time effect",
      "distinguishingAssertion": "for each Low Tension onset frame L (= sky burstCast + 35*60): zero `shot` events from sky's slot in [L, L+1200), and sky `shot` events resume within one charge time after L+1200; the stun recurs on EVERY cycle without CDR. totals(res)['sky'] with the stun patched out is strictly greater than with it in",
      "inertness": "no shot gap on liter/crown/helm; sky's shot cadence outside stun windows is unchanged",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "High Tension: Pierce Dmg ▲ 15% 35s, x3",
      "disposition": "FAITHFUL",
      "scope": "pierceDamagePct — only Pierce-tagged attacks benefit (sky herself via S1; pierce-carrying allies; INERT on non-pierce allies such as liter/crown/helm)",
      "durationSemantics": "35 sec per application, maxStacks 3; a stack is added per sky burst cast. With cd 40 s > 35 s the window lapses before the next cast, so stacks stay at 1 without burst-CDR — 3 stacks (45%) is reachable ONLY when effective cd < 35 s. Must NOT be baked to a 45% steady state",
      "triggerIdentity": "burstCast (sky's OWN Burst I cast) — NOT fullBurstEnter; also opens selfStatus 'High Tension' 35 s on sky (the removal trigger's key)",
      "targetSet": "all allies incl. self",
      "nearestWrongModel": "(a) attackDamagePct 15 (generic Damage Up → credits every ally's non-pierce attacks); (b) fullBurstEnter trigger (fires on liter's B1 rotations too); (c) value authored at 45 (cap) or with rampSec as if stacks accrue; (d) forgetting the paired selfStatus so Low Tension never triggers",
      "distinguishingAssertion": "buffApply stat 'pierceDamagePct' value 15 maxStacks 3 from sky burst slot, 5 per sky burstCast event (count groups === sky burstCast count, NOT === fullBurstStart count), expiresFrame = castFrame + 35*60; in the no-CDR fixture every such apply has stacks === 1; with a CDR fixture (effective cd < 35 s) stacks climb 1→2→3 and never exceed 3",
      "inertness": "with the burst pierceDamagePct patched to 0 via withPatchedOverride('sky',…), totals of liter/crown/helm are byte-identical (no pierce tag on them); no buffApply stat 'attackDamagePct' from sky burst",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Affects self. ATK ▲ 50% for 35 sec",
      "disposition": "FAITHFUL",
      "scope": "generic ATK (percent of own ATK) on sky only",
      "durationSemantics": "35 sec from cast (lapses 5 s before the next 40 s cast without CDR)",
      "triggerIdentity": "burstCast (sky's own cast); NOT fullBurstEnter",
      "targetSet": "self only",
      "nearestWrongModel": "target allies (a team-wide 50% ATK — gross over-credit of the carry); or casterAtkPct 50 (flat add) instead of atkPct 50; or fullBurstEnter",
      "distinguishingAssertion": "exactly one buffApply stat 'atkPct' value 50 per sky burstCast event, targetSlug 'sky', casterIdx===targetIdx, expiresFrame = castFrame + 35*60; zero atkPct-50 applies on liter/crown/helm; zero such applies on fullBurstStart frames where sky did not cast",
      "inertness": "liter/crown/helm totals byte-identical when this value is patched to 0; sky's S2 casterAtkPct ally grant value does NOT change while this is live (staticAtk basis — see notes)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Gains Pierce for 40 sec",
    "skill1:Pierce Damage ▲ 60% for 40 sec",
    "skill2:Entering Full Burst → ATK ▲ 20% of user",
    "skill2:High Tension removed → Low Tension ATK ▼",
    "skill2:In Low Tension → Low Energy: Stuns 20 sec",
    "burst:High Tension: Pierce Dmg ▲ 15% 35s, x3",
    "burst:Affects self. ATK ▲ 50% for 35 sec"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Defiant Spirit state. Affects all allies. Defiant Spirit: Grants debuff immunity to 1 debuff(s) for 5 sec. Activates 3 time(s) per battle."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "FIXTURE HAZARD (must be reconciled first): controlComp(carry) seats liter in B1 and the carry in the B3 slot, but sky IS a Burst I unit — two B1 units compete for one cast per rotation and slot order likely gives it to liter every time (liter cd 20 s vs sky 40 s). Every burst-keyed assertion above is vacuous unless the test first proves `burstCast` events are emitted for sky's slot; if liter preempts, build a comp with sky as the sole B1 (or confirm the engine's B1 selection) before asserting. EXPECTED SHARED-PRIOR MISREADS: (1) dropping Low Tension + Low Energy as 'defensive flavor' — they are a 20 s team-wide ATK ▼ and a 20 s self-stun recurring EVERY cycle at cd 40 s > 35 s duration, i.e. the kit's built-in penalty; the test must pin that without burst-CDR the chain fires at cast+35 s each cycle and with effective cd < 35 s it never fires and High Tension stacks to 3. (2) Baking High Tension at 45% (3 stacks) — unreachable in the no-CDR fixture; stacks must be 1 there. (3) casterAtkPct vs atkPct on BOTH 'of the skill user's ATK' lines (S2 +20 and Low Tension -10); the emitted buffApply value is a flat ATK number — assert ≈ ±pct × sky.staticAtk, and confirm the engine accepts a NEGATIVE casterAtkPct (if it clamps at 0, that is a GAP the driver must declare, not silently drop). (4) burstCast vs fullBurstEnter: S2 +20% is fullBurstEnter (any FB); both burst lines are burstCast. (5) hasPierce:true static flag vs a fullCharge-triggered gainPierce 40 s + pierceDamagePct 60 — the static flag has no first-shot gap and no trigger; the 'maintained ≥1 s' hold is a ⚑ manual-play proxy (cost ≈ one delayed pull per 40 s; document in note, do not model per-shot). (6) High Tension / Low Tension must ride the selfStatus channel (per-unit, name-keyed), never targetStatus/requiresTargetStatus (boss channel). ⚑ ENGINE CONVENTIONS to report, not act on: stun is 'bursting unaffected' in-engine whereas in-game a stunned Nikke cannot activate Burst (would push sky's real cycle from 40 s to ~55 s and change where Low Tension lands); casterAtkPct resolves off staticAtk, so sky's own ATK ▲50% does not inflate her 20%-of-ATK ally grant — if the game uses final ATK the grant is ×1.5 for 35 of every 40 s. Cadence tuple (chargeFrames 60, reloadFrames 151, ammo 6) is datamine ⚑ per the always-⚑ list. Pierce Damage ▲ values (60 own + 15/stack) are Damage Up bucket, additive with Crown/other Damage Up — not a separate multiplier; a with/without-patch ratio must be < 1.60 whenever another Damage Up buff is live.",
  "model": "claude-fable-5-1"
}
```

## 5. S5 BLIND TEST-WRITER (claude-opus-5, blind — written from the prose alone)

### 5a. blind spec

```json
{
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Defiant Spirit: debuff immunity 5 sec",
      "disposition": "GAP",
      "assertion": "it.skip — no immunity primitive and no per-battle activation cap in the schema, and the fixture applies no ally debuff, so the line is unobservable. Live assertion only that the text is accounted for in the override (no silent drop)."
    },
    {
      "slot": "skill1",
      "kitLine": "Gains Pierce for 40 sec (self)",
      "disposition": "FAITHFUL",
      "assertion": "Stripping gainPierce drops her total (proves the tag gates her own Pierce Damage Up, and that the fullCharge trigger fires). Structural: exactly one gainPierce, durationSec 40, trigger fullCharge, target self, no durationShots; ov.hasPierce !== true. RED under: whole-fight hasPierce flag, a round-budget window, a shotFired/passive trigger, or an allies target."
    },
    {
      "slot": "skill1",
      "kitLine": "Pierce Damage ▲ 60% for 40 sec",
      "disposition": "FAITHFUL",
      "assertion": "Stripping the 60% drops only her total; teammate totals byte-identical in both pierce counterfactuals; tag-removal costs >= buff-removal; 60->120 lifts only her. Structural durationSec 40. RED under: an allies target that moves teammates, a missing/zero magnitude, or a value folded into another bucket (patch finds nothing, delta 0)."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 20% of skill user ATK, 10 sec",
      "disposition": "FAITHFUL",
      "assertion": "Counterfactual delta on casterAtkPct buffApply multiset = FB_STARTS × N_UNITS, with exactly one distinct flat value and value !== 20. RED under burstCast keying (0 applications — she is a second Burst I and never casts), excludeSelf (×(N−1)), or a raw atkPct encoding (emits 20). Self-scoping counterfactual lowers teammate sum while her own total stays exactly equal; 10->30 sec raises the team, proving the window is bounded."
    },
    {
      "slot": "skill2",
      "kitLine": "Low Tension: ATK ▼ 10%, 20 sec",
      "disposition": "FAITHFUL (fixture-unreachable)",
      "assertion": "Behaviourally asserted NEGATIVELY: zero negative ATK-family buffApply events in the control, since the chain needs her own burst. Structural: one block, trigger selfStatusEnd named /tension/i, target allies, casterAtkPct -10, durationSec 20. RED under fullBurstEnd/interval/battleStart keying (the team would eat a recurring ATK-down)."
    },
    {
      "slot": "skill2",
      "kitLine": "Low Energy: Stuns for 20 sec (self)",
      "disposition": "FAITHFUL (fixture-unreachable)",
      "assertion": "Positive control: an injected battleStart stun collapses her total to <5% of control, so the fixture would reveal a stun that fired — and the control shows none. Structural: stun durationSec 20, target self, gated (requiresSelfStatus or selfStatusEnd), trigger never passive/battleStart. RED under an ungated stun (her damage collapses)."
    },
    {
      "slot": "burst",
      "kitLine": "High Tension: Pierce Dmg ▲15%, 3 stacks",
      "disposition": "FAITHFUL (fixture-unreachable)",
      "assertion": "Structural: one burst block, target allies, pierceDamagePct 15, durationSec 35, maxStacks 3. RED under a folded 45 (3×15) single-stack encoding, a missing maxStacks, or a self target. Behavioural it.skip — her burst never casts in controlComp."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 50% for 35 sec (self)",
      "disposition": "FAITHFUL (fixture-unreachable)",
      "assertion": "Structural: a self-target burst buff value 50, stat atkPct (bare percentage — no 'of the skill user' clause), durationSec 35. RED under casterAtkPct (wrong scaling basis) or an allies target."
    },
    {
      "slot": "burst/skill2",
      "kitLine": "status machinery for the Tension chain",
      "disposition": "FIX-sensitive (spec-prescriptive)",
      "assertion": "selfStatus windows named /tension/i must exist at 35 sec (opened by the burst, read by selfStatusEnd) and 20 sec (the down-state the stun gates on). Without both, the S2b trigger can never fire and the S2c gate can never pass — the chain is dead rather than merely unreachable."
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge maintained 1+ sec",
      "disposition": "MEASUREMENT-GATED",
      "assertion": "⚑ Not asserted. chargeFrames 60 == 1.0 s and the engine has no 'hold past full charge' primitive; fullCharge is the kit-shaped trigger and is per-pull for an unswapped SR. The 1-second extra hold (and any resulting cadence loss) is unmodelled residue — a recording-derived pin, not a test."
    }
  ],
  "fixtures": "controlComp('sky', true) for all 8 runs (liter B1 / crown B2 / sky in the carry slot / fixed B3, boss Fire, focus sky), deterministic, no seed. The fixed B3 is kept because its buffs do not confound any assertion here — every magnitude claim is read as a DELTA between the control and a withPatchedOverride counterfactual, so shared team buffs cancel. Critical fixture fact: this unit is Burst I and controlComp always seats liter (Burst I), so liter takes Burst Stage 1 every rotation and this unit never casts her own burst — her burst slot, the status it opens, and the ATK-down/self-stun chain are unreachable, so they are covered negatively (chain must be inert, with an injected-stun positive control) plus structurally via the withPatchedOverride clone. Runs: control, no-gainPierce, no-pierceBuff, pierce-60->120, no-FB-ATK, FB-ATK-self-only, FB-ATK-10s->30s, injected-battleStart-stun.",
  "gaps": [
    "it.skip — S1a Defiant Spirit: debuff immunity (1 debuff, 5 sec, 3x per battle). No immunity effect kind and no per-battle activation-cap primitive in the schema; the fixture also applies no ally-side debuff, so the payload is unobservable.",
    "it.skip — S2b/S2c behavioural chain (status removal -> team ATK ▼10% for 20 sec -> self stun 20 sec). Fixture gap: requires her OWN Burst I cast, which controlComp cannot produce because liter occupies Burst Stage 1. Needs a comp with no other Burst I unit.",
    "it.skip — burst behavioural (allies Pierce Damage ▲15% up to 3 stacks + self ATK ▲50%). Same fixture gap: her burst never casts in controlComp; asserted structurally instead.",
    "⚑ Not asserted: the 'Full Charge maintained for 1 or more seconds' hold on both skill1 blocks. chargeFrames 60 == 1.0 s and no hold-past-full-charge primitive exists; fullCharge is used as the kit-shaped trigger. Recipe: a focus recording — count her pulls per magazine against the datamined cadence to see whether an extra 1 s hold is actually paid.",
    "Packet-internal contradiction on the OverrideFile shape (slot -> Block[] vs slot -> { blocks: Block[] }); blocksOf() accepts both so the test does not depend on the resolution, but the structural assertions silently read zero blocks if a THIRD shape is in use — each structural test therefore asserts a nonzero block count first.",
    "Duration windows are asserted structurally (durationSec) and, for the 10-sec team ATK buff, behaviourally via a 10->30 sec extension; no frame-level expiry assertion is made because the packet does not guarantee a frame field on SimEvent and the engine emits no buffRemove on natural lapse."
  ],
  "model": "claude-opus-5"
}
```

### 5b. blind test source (VERBATIM — mechanical defects preserved; see section 8 for the run against the driver's override)

```ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * sky — SR / Iron / Supporter / Burst I. ammo 6, chargeFrames 60, hitsPerShot 1.
 *
 * Written BLIND from the kit prose alone (no sight of the override, its author's notes, or any
 * other test for this unit). Each assertion states what the prose requires and names the
 * nearest-wrong model it goes RED under.
 *
 * KIT, line by line (scope / duration / trigger / target):
 *   S1a  full charge held 1s+ while NOT in the named state, allies: debuff immunity (1 debuff,
 *        5 sec, 3 activations per battle). No schema primitive exists for debuff immunity, nor
 *        for a per-battle activation cap, and the fixture has no debuff source => GAP (it.skip);
 *        the text must still be accounted for in the override (no silent drops).
 *   S1b  full charge held 1s+, SELF: 'Gains Pierce for 40 sec' => gainPierce{durationSec:40}
 *        (the timed-window EFFECT, NOT the whole-fight hasPierce FLAG), plus Pierce Damage up
 *        60% for 40 sec => buff pierceDamagePct 60 / durationSec 40, target self. Trigger is
 *        fullCharge (an unswapped SR releases only at full charge, so this is per-pull; the
 *        schema states the primitive exists precisely so the block shape matches this wording
 *        instead of riding the shotFired equivalence). The 'maintained for 1 or more seconds'
 *        hold has no primitive (chargeFrames 60 == 1.0 s) — MEASUREMENT-GATED residue, not
 *        asserted here.
 *   S2a  on entering Full Burst, allies: ATK up 20% OF THE SKILL USER'S ATK for 10 sec =>
 *        casterAtkPct 20, flat-resolved at apply time, target allies INCLUDING self, trigger
 *        fullBurstEnter (ANY team Full Burst) — NOT burstCast.
 *   S2b  when the burst-granted status is removed, allies: ATK down 10% of the skill user's ATK
 *        for 20 sec => selfStatusEnd trigger + buff casterAtkPct -10 / durationSec 20.
 *   S2c  only while in that down-state, SELF: stun for 20 sec => stun{durationSec:20}, GATED on
 *        the state. Ungated this line is catastrophic: she never fires at all.
 *   Bur  allies: Pierce Damage up 15% for 35 sec, up to 3 stacks; SELF: ATK up 50% for 35 sec
 *        (a plain percentage, so atkPct — not casterAtkPct).
 *
 * FIXTURE / REACHABILITY — the central fact about this unit in this harness:
 *   controlComp(carry) seats liter (Burst I) alongside the carry. This unit is ALSO Burst I, so
 *   liter takes Burst Stage 1 every rotation and this unit NEVER casts her own burst in the
 *   control comp. Her burst slot, the status it opens, and the whole removal -> team ATK-down ->
 *   self-stun chain are therefore fixture-UNREACHABLE. That is not a licence to skip them: the
 *   reachable half (S1b, S2a) is asserted behaviourally with withPatchedOverride
 *   counterfactuals; the unreachable half is asserted (a) NEGATIVELY — the chain must be
 *   observably inert in this fixture, with an injected battle-start stun as the positive control
 *   proving the fixture would show a stun if one fired — and (b) STRUCTURALLY, by reading the
 *   committed override through withPatchedOverride's clone. The structural assertions are
 *   deliberately spec-prescriptive: a divergence there is the payload, not a bug in the test.
 *
 * SHAPE NOTE: the packet documents the override file as slot -> Block[] in one place and as
 * slot -> { blocks: Block[] } in another. blocksOf() accepts either, so nothing below hinges on
 * which is true.
 *
 * 8 hoisted runs (each a full 180 s sim).
 */

const SLUG = 'sky';

type Opts = ReturnType<typeof controlComp>;
type Res = ReturnType<typeof runComp>;

interface LooseEffect {
  kind?: string;
  stat?: string;
  name?: string;
  value?: number;
  durationSec?: number;
  maxStacks?: number;
  [k: string]: unknown;
}
interface LooseBlock {
  trigger?: { kind?: string; name?: string };
  target?: { kind?: string; excludeSelf?: boolean };
  effects?: LooseEffect[];
  requiresSelfStatus?: string;
  [k: string]: unknown;
}
interface LooseOverride {
  hasPierce?: boolean;
  [k: string]: unknown;
}

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

function blocksOf(
  ov: LooseOverride,
  slot: (typeof SLOTS)[number]
): LooseBlock[] {
  const s = ov[slot] as unknown;
  if (!s) return [];
  if (Array.isArray(s)) return s as LooseBlock[];
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as LooseBlock[]) : [];
}
function allBlocks(ov: LooseOverride): LooseBlock[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
function effectsOf(b: LooseBlock): LooseEffect[] {
  return b.effects ?? [];
}

// read-only view of the committed override (mutator is a no-op; the clone is discarded)
const OV = withPatchedOverride(SLUG, () => {}) as unknown as LooseOverride;

interface BuffEv {
  kind: string;
  stat?: string;
  value?: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
  expiresFrame?: number;
}
const kindOf = (ev: SimEvent): string =>
  (ev as unknown as { kind: string }).kind;
const buffsIn = (events: SimEvent[]): BuffEv[] =>
  events
    .filter((e) => kindOf(e) === 'buffApply')
    .map((e) => e as unknown as BuffEv);
const count = (events: SimEvent[], k: string): number =>
  events.filter((e) => kindOf(e) === k).length;

/** multiset of emitted values for one stat — lets a counterfactual DELTA isolate this unit's
 *  own applications without needing her caster index. */
function valueCounts(events: SimEvent[], stat: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const b of buffsIn(events)) {
    if (b.stat === stat && typeof b.value === 'number')
      m.set(b.value, (m.get(b.value) ?? 0) + 1);
  }
  return m;
}

function run(opts: Opts): { res: Res; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const res = runComp({
    ...(opts as object),
    onEvent: (ev: SimEvent) => events.push(ev),
  } as Opts);
  return { res, events };
}

function skyOpts(mutate: (ov: LooseOverride) => void): Opts {
  const patched = withPatchedOverride(SLUG, (ov) =>
    mutate(ov as unknown as LooseOverride)
  );
  const base = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  return {
    ...base,
    overrides: { ...((base.overrides as object) ?? {}), [SLUG]: patched },
  } as unknown as Opts;
}

const isSelfPierceBuff = (e: LooseEffect): boolean =>
  e.kind === 'buff' && e.stat === 'pierceDamagePct' && e.value === 60;
const isFbAtkBuff = (e: LooseEffect): boolean =>
  e.kind === 'buff' && e.stat === 'casterAtkPct' && e.value === 20;
const isFbAtkBlock = (b: LooseBlock): boolean =>
  b.trigger?.kind === 'fullBurstEnter' && effectsOf(b).some(isFbAtkBuff);

// ---------------------------------------------------------------- hoisted runs

const CONTROL = run(controlComp(SLUG, true));

let nGainPierce = 0;
const NO_GAIN_PIERCE = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      const before = effectsOf(b).length;
      b.effects = effectsOf(b).filter((e) => e.kind !== 'gainPierce');
      nGainPierce += before - b.effects.length;
    }
  })
);

let nPierceBuff = 0;
const NO_PIERCE_BUFF = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      const before = effectsOf(b).length;
      b.effects = effectsOf(b).filter((e) => !isSelfPierceBuff(e));
      nPierceBuff += before - b.effects.length;
    }
  })
);

let nPierceDoubled = 0;
const PIERCE_DOUBLED = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      for (const e of effectsOf(b)) {
        if (isSelfPierceBuff(e)) {
          e.value = 120;
          nPierceDoubled += 1;
        }
      }
    }
  })
);

let nFbAtk = 0;
const NO_FB_ATK = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      if (b.trigger?.kind !== 'fullBurstEnter') continue;
      const before = effectsOf(b).length;
      b.effects = effectsOf(b).filter((e) => !isFbAtkBuff(e));
      nFbAtk += before - b.effects.length;
    }
  })
);

let nFbAtkSelf = 0;
const FB_ATK_SELF = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      if (!isFbAtkBlock(b)) continue;
      b.target = { kind: 'self' };
      nFbAtkSelf += 1;
    }
  })
);

let nFbAtkLong = 0;
const FB_ATK_LONG = run(
  skyOpts((ov) => {
    for (const b of allBlocks(ov)) {
      if (b.trigger?.kind !== 'fullBurstEnter') continue;
      for (const e of effectsOf(b)) {
        if (isFbAtkBuff(e)) {
          e.durationSec = 30;
          nFbAtkLong += 1;
        }
      }
    }
  })
);

// positive control for the stun: an INJECTED battle-start self-stun. Independent of how (or
// whether) the driver encoded the kit's own stun, so it can prove the fixture would reveal a
// stun that actually fired.
const STUN_INJECTED = run(
  skyOpts((ov) => {
    const slot = SLOTS.find((s) => blocksOf(ov, s).length > 0);
    if (!slot) throw new Error('override exposes no blocks in any slot');
    blocksOf(ov, slot).push({
      slot,
      trigger: { kind: 'battleStart' },
      target: { kind: 'self' },
      effects: [{ kind: 'stun', durationSec: 300 }],
    } as LooseBlock);
  })
);

// ---------------------------------------------------------------- derived

const T_BASE = totals(CONTROL.res);
const ALL_SLUGS = Object.keys(T_BASE);
const TEAMMATES = ALL_SLUGS.filter((s) => s !== SLUG);
const N_UNITS = ALL_SLUGS.length;
const FB_STARTS = count(CONTROL.events, 'fullBurstStart');
const SKY_BASE = unitOf(CONTROL.res, SLUG).totalDamage;
const teamSum = (res: Res): number =>
  Object.values(totals(res)).reduce((a, b) => a + b, 0);
const mateSum = (res: Res): number => {
  const t = totals(res);
  return TEAMMATES.reduce((a, s) => a + t[s], 0);
};

// ---------------------------------------------------------------- tests

describe('sky — fixture sanity / non-vacuity', () => {
  it('runs the unit and actually produces Full Bursts', () => {
    expect(SKY_BASE).toBeGreaterThan(0);
    expect(FB_STARTS).toBeGreaterThan(0);
    expect(count(CONTROL.events, 'burstCast')).toBeGreaterThan(0);
    expect(N_UNITS).toBeGreaterThanOrEqual(3);
    expect(TEAMMATES.length).toBeGreaterThanOrEqual(2);
  });
});

describe('S1b — self Pierce window + Pierce Damage up 60% (self, 40 sec)', () => {
  it('the Pierce grant exists and is load-bearing', () => {
    // patch bit: if this is 0 the grant is absent or encoded as something other than gainPierce
    expect(nGainPierce).toBeGreaterThanOrEqual(1);
    // nearest-wrong: no pierce tag at all -> her own Pierce Damage up cannot feed Damage Up
    expect(unitOf(NO_GAIN_PIERCE.res, SLUG).totalDamage).toBeLessThan(SKY_BASE);
    // a nonzero delta also proves the fullCharge trigger really fires in this fixture
  });

  it('Pierce is a TRIGGERED 40-sec self window, not the whole-fight hasPierce flag', () => {
    // nearest-wrong: hasPierce:true (pierce-tagged from frame 0, before any full charge)
    expect(OV.hasPierce).not.toBe(true);
    const grants = allBlocks(OV).filter((b) =>
      effectsOf(b).some((e) => e.kind === 'gainPierce')
    );
    expect(grants.length).toBe(1);
    for (const b of grants) {
      expect(b.trigger?.kind).toBe('fullCharge');
      expect(b.target?.kind).toBe('self');
      for (const e of effectsOf(b).filter((x) => x.kind === 'gainPierce')) {
        expect(e.durationSec).toBe(40);
        expect(e.durationShots).toBeUndefined(); // 'for 40 sec' is wall-clock, not a round budget
      }
    }
  });

  it('Pierce Damage up 60% is load-bearing and moves nobody else', () => {
    expect(nPierceBuff).toBeGreaterThanOrEqual(1);
    const sky = unitOf(NO_PIERCE_BUFF.res, SLUG).totalDamage;
    expect(sky).toBeLessThan(SKY_BASE);
    // removing the TAG must cost at least as much as removing her own 60% Damage-Up entry
    expect(unitOf(NO_GAIN_PIERCE.res, SLUG).totalDamage).toBeLessThanOrEqual(
      sky + 1e-6
    );
    // inertness: 'Affects self' — a teammate total must not budge in either counterfactual
    for (const s of TEAMMATES) {
      expect(totals(NO_PIERCE_BUFF.res)[s]).toBe(T_BASE[s]);
      expect(totals(NO_GAIN_PIERCE.res)[s]).toBe(T_BASE[s]);
    }
  });

  it('the 60% magnitude is load-bearing (60 -> 120 lifts only her)', () => {
    expect(nPierceDoubled).toBeGreaterThanOrEqual(1);
    expect(unitOf(PIERCE_DOUBLED.res, SLUG).totalDamage).toBeGreaterThan(
      SKY_BASE
    );
    for (const s of TEAMMATES)
      expect(totals(PIERCE_DOUBLED.res)[s]).toBe(T_BASE[s]);
  });

  it('the 60% buff carries the 40-sec window', () => {
    const es = allBlocks(OV).flatMap(effectsOf).filter(isSelfPierceBuff);
    expect(es.length).toBe(1);
    expect(es[0].durationSec).toBe(40);
  });
});

describe('S2a — Full Burst entry: allies ATK up 20% of the skill user ATK, 10 sec', () => {
  it('is authored as a caster-scaled ATK buff on a fullBurstEnter block, all allies, 10 sec', () => {
    expect(nFbAtk).toBeGreaterThanOrEqual(1);
    const blocks = allBlocks(OV).filter(isFbAtkBlock);
    expect(blocks.length).toBe(1);
    expect(blocks[0].target?.kind).toBe('allies');
    expect(blocks[0].target?.excludeSelf).not.toBe(true); // 'all allies' includes self
    const e = effectsOf(blocks[0]).find(isFbAtkBuff);
    expect(e?.durationSec).toBe(10);
  });

  it('fires once per TEAM Full Burst and reaches every ally incl. self, flat-resolved', () => {
    // removing the effect must not move the Full Burst cadence (gauge is per-impact, not damage)
    expect(count(NO_FB_ATK.events, 'fullBurstStart')).toBe(FB_STARTS);
    const before = valueCounts(CONTROL.events, 'casterAtkPct');
    const after = valueCounts(NO_FB_ATK.events, 'casterAtkPct');
    const deltas = [...before.entries()]
      .map(([v, c]) => [v, c - (after.get(v) ?? 0)] as const)
      .filter(([, d]) => d > 0);
    // exactly ONE distinct flat value: her static ATK is constant, so every application
    // snapshots the same number across all targets and all windows
    expect(deltas.length).toBe(1);
    const [value, delta] = deltas[0];
    // nearest-wrong A: burstCast keying -> 0 applications here (she is a 2nd Burst I and never
    // casts in this comp). nearest-wrong B: excludeSelf -> FB_STARTS * (N_UNITS - 1).
    expect(delta).toBe(FB_STARTS * N_UNITS);
    // nearest-wrong C: a plain atkPct encoding would emit the raw kit percentage 20
    expect(value).not.toBe(20);
    expect(value).toBeGreaterThan(20);
  });

  it('is a TEAM buff: scoping it to self costs the teammates and only them', () => {
    expect(nFbAtkSelf).toBeGreaterThanOrEqual(1);
    const t = totals(FB_ATK_SELF.res);
    expect(mateSum(FB_ATK_SELF.res)).toBeLessThan(mateSum(CONTROL.res));
    for (const s of TEAMMATES) expect(t[s]).toBeLessThanOrEqual(T_BASE[s]);
    // she still receives it as self, so her own total is untouched
    expect(unitOf(FB_ATK_SELF.res, SLUG).totalDamage).toBe(SKY_BASE);
    const before = valueCounts(CONTROL.events, 'casterAtkPct');
    const after = valueCounts(FB_ATK_SELF.events, 'casterAtkPct');
    const deltas = [...before.entries()]
      .map(([v, c]) => [v, c - (after.get(v) ?? 0)] as const)
      .filter(([, d]) => d > 0);
    expect(deltas.length).toBe(1);
    expect(deltas[0][1]).toBe(FB_STARTS * (N_UNITS - 1));
  });

  it('the 10-sec window is bounded, not effectively permanent', () => {
    // nearest-wrong: a longer/absent duration. If 10 s were already covering the whole fight,
    // stretching it to 30 s could not add damage.
    expect(nFbAtkLong).toBeGreaterThanOrEqual(1);
    expect(teamSum(FB_ATK_LONG.res)).toBeGreaterThan(teamSum(CONTROL.res));
    expect(unitOf(FB_ATK_LONG.res, SLUG).totalDamage).toBeGreaterThan(SKY_BASE);
  });
});

describe('S2b / S2c — the ATK-down and the self-stun must stay INERT when she never bursts', () => {
  it('no ATK-down is ever applied in the control fixture', () => {
    // The down-buff and the stun share one trigger, so the absence of any negative ATK
    // application is ALSO the evidence that the stun never fired.
    // nearest-wrong: keying the removal to fullBurstEnd, an interval, or battleStart-opened
    // status -> the whole team eats a recurring ATK-down and she eats a 20 s stun.
    const negatives = buffsIn(CONTROL.events).filter(
      (b) =>
        (b.stat === 'casterAtkPct' ||
          b.stat === 'atkPct' ||
          b.stat === 'highestAllyAtkPct') &&
        typeof b.value === 'number' &&
        b.value < 0
    );
    expect(negatives).toEqual([]);
  });

  it('she is never stunned here — positive control: an injected stun collapses her damage', () => {
    const stunned = unitOf(STUN_INJECTED.res, SLUG).totalDamage;
    expect(stunned).toBeLessThan(SKY_BASE * 0.05); // the fixture WOULD show a stun...
    expect(SKY_BASE).toBeGreaterThan(0); // ...and it shows none
  });

  it('the self-stun is 20 sec, self-targeted, and GATED — never unconditional', () => {
    const stunBlocks = allBlocks(OV).filter((b) =>
      effectsOf(b).some((e) => e.kind === 'stun')
    );
    expect(stunBlocks.length).toBe(1);
    for (const b of stunBlocks) {
      for (const e of effectsOf(b).filter((x) => x.kind === 'stun')) {
        expect(e.durationSec).toBe(20);
      }
      expect(b.target?.kind).toBe('self');
      const gated =
        typeof b.requiresSelfStatus === 'string' ||
        b.trigger?.kind === 'selfStatusEnd';
      expect(gated).toBe(true);
      expect(b.trigger?.kind).not.toBe('passive');
      expect(b.trigger?.kind).not.toBe('battleStart');
    }
  });

  it('the ATK-down 10% is caster-scaled, 20 sec, team-wide, keyed to status removal', () => {
    const blocks = allBlocks(OV).filter((b) =>
      effectsOf(b).some(
        (e) => e.kind === 'buff' && e.stat === 'casterAtkPct' && e.value === -10
      )
    );
    expect(blocks.length).toBe(1);
    expect(blocks[0].trigger?.kind).toBe('selfStatusEnd');
    expect(String(blocks[0].trigger?.name ?? '')).toMatch(/tension/i);
    expect(blocks[0].target?.kind).toBe('allies');
    const e = effectsOf(blocks[0]).find((x) => x.value === -10);
    expect(e?.durationSec).toBe(20);
  });

  it.skip('BEHAVIOURAL: status removal -> team ATK-down 20 s -> self-stun 20 s. GAP (fixture): needs her OWN Burst I cast, but controlComp seats liter at Burst Stage 1, so this Burst I unit never casts and the status never opens. Requires a comp fixture with no other Burst I unit.', () => {});
});

describe('burst — allies Pierce Damage up 15% (3 stacks, 35 s) + self ATK up 50% (35 s)', () => {
  it('the ally pierce-damage buff is 15 / 35 sec / 3 stacks on all allies', () => {
    const blocks = blocksOf(OV, 'burst').filter((b) =>
      effectsOf(b).some((e) => e.stat === 'pierceDamagePct')
    );
    expect(blocks.length).toBe(1);
    expect(blocks[0].target?.kind).toBe('allies');
    const e = effectsOf(blocks[0]).find((x) => x.stat === 'pierceDamagePct');
    expect(e?.value).toBe(15);
    expect(e?.durationSec).toBe(35);
    expect(e?.maxStacks).toBe(3);
  });

  it('the self ATK up 50% is a plain self-scaling atkPct, not caster-scaled', () => {
    const es = blocksOf(OV, 'burst')
      .filter((b) => b.target?.kind === 'self')
      .flatMap(effectsOf)
      .filter((e) => e.kind === 'buff' && e.value === 50);
    expect(es.length).toBe(1);
    expect(es[0].stat).toBe('atkPct'); // kit says a bare 'ATK up 50%', with no 'of the skill user'
    expect(es[0].durationSec).toBe(35);
  });

  it('the burst opens the named status the S2 removal trigger reads (35 s), and the down-state window (20 s) exists', () => {
    const statuses = [...blocksOf(OV, 'burst'), ...blocksOf(OV, 'skill2')]
      .flatMap(effectsOf)
      .filter((e) => e.kind === 'selfStatus');
    expect(statuses.length).toBeGreaterThanOrEqual(2);
    expect(statuses.some((e) => e.durationSec === 35)).toBe(true);
    expect(statuses.some((e) => e.durationSec === 20)).toBe(true);
    for (const e of statuses) expect(String(e.name ?? '')).toMatch(/tension/i);
  });

  it.skip('BEHAVIOURAL: burst pierce stacks (3x15%) + self ATK up 50%. GAP (fixture): her burst never casts in controlComp — see the header fixture note.', () => {});
});

describe('S1a — Defiant Spirit debuff immunity (GAP)', () => {
  it('the un-modelable line is still accounted for somewhere in the override', () => {
    expect(JSON.stringify(OV).toLowerCase()).toContain('defiant');
  });

  it.skip('debuff immunity for 1 debuff / 5 sec, 3 activations per battle. GAP: no schema primitive for immunity and none for a per-battle activation cap; the fixture also applies no ally-side debuff, so the line is unobservable even if modeled.', () => {});
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "sky",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 40
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 60,
          "durationSec": 40
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 20,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "selfStatusEnd",
        "name": "High Tension"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": -10,
          "durationSec": 20,
          "levelScale": {
            "value": [10]
          }
        },
        {
          "kind": "selfStatus",
          "name": "Low Tension",
          "durationSec": 20
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "selfStatusEnd",
        "name": "High Tension"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "stun",
          "durationSec": 20
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
          "stat": "pierceDamagePct",
          "value": 15,
          "durationSec": 35,
          "maxStacks": 3
        },
        {
          "kind": "selfStatus",
          "name": "High Tension",
          "durationSec": 35
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 50,
          "durationSec": 35
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Defiant Spirit state. Affects all allies.",
      "Defiant Spirit: Grants debuff immunity to 1 debuff(s) for 5 sec. Activates 3 time(s) per battle."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ skill1 trigger fidelity: the kit requires Full Charge to be HELD for 1+ sec; charge weapons release at full charge in-sim, so the hold is modeled as a plain `fullCharge` pull (over-fires vs a tap-firing player, matches a hold-firing one).",
    "⚑ The Low Tension branch (ATK▼ to allies + 20s self-stun) is keyed to the lapse of the burst-side 'High Tension' selfStatus window (35s, max-extended per cast). With a 40s burst cooldown and per-rotation casting it is expected DORMANT in graded comps; it only pays out if bursting stops for >35s.",
    "⚑ High Tension reaches its 3-stack cap (45% Pierce Damage) only from this unit's THIRD burst cast onward; no rampSec authored because per-cast stacking is the ramp.",
    "Defiant Spirit (debuff immunity, 3×/battle) is unmodeled: no debuff-immunity primitive exists and the v1 boss applies no ally debuffs — inert at scope, not a damage skip.",
    "Pierce Damage ▲ granted to allies is inert for allies carrying no Pierce tag (kit-correct: this unit self-tags via skill1's gainPierce and buffs whoever else is Pierce-tagged).",
    "Self-stun modeled as `stun` 20s on self; per schema a stun blocks firing/charging/reloading but NOT bursting, so the unit's own burst chain is unaffected — unverified against footage."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Supporter kit, three real levers: (1) skill1 self-Pierce window + Pierce Damage ▲60% on a per-full-charge trigger — authored as a `gainPierce` EFFECT (40s window), never the whole-fight `hasPierce` flag, because pierce here is trigger-gated and absent before the first charge; (2) skill2 FB-enter caster-scaled ATK ▲20% to all allies for 10s (flat-resolved at apply time); (3) burst High Tension Pierce Damage ▲15% ×3 stacks to allies + self ATK ▲50%, both 35s on burstCast (Burst I ⇒ one cast per rotation). The kit's PENALTY half is modeled, not dropped: 'when High Tension is removed' is armed by a burst-side `selfStatus` window so the ATK▼10% and the 20s self-stun fire on a real lapse. The 'only when in the Low Tension state' gate is folded into the co-timed trigger rather than authored as `requiresSelfStatus` — Low Tension opens on exactly the lapse frame, so the two encodings are behaviourally identical while the fold does not depend on intra-slot block ordering (gate-vs-effect evaluation order is unverified). Negative casterAtkPct carries levelScale anchor [10] so the derived −10 still scales with skill level."
}
```

### 6b. blind audit + flags

```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "■ Activates when Full Charge is maintai",
      "status": "SKIPPED",
      "effectOrReason": "Header of the Defiant Spirit block (all allies, gated on NOT being in that state). Skipped with its payload — no debuff-immunity primitive; verbatim in unmodeled.skill1."
    },
    {
      "slot": "skill1",
      "kitLine": "Defiant Spirit: Grants debuff immunity",
      "status": "SKIPPED",
      "effectOrReason": "No EffectDef for debuff immunity; the v1 boss applies no ally debuffs, so the line is inert at scope. 3×/battle limiter moot. Verbatim in unmodeled.skill1."
    },
    {
      "slot": "skill1",
      "kitLine": "■ Activates when Full Charge is maintai",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'fullCharge'}, target {kind:'self'} — 'Affects self'. ⚑ the '1 or more seconds' HOLD is unrepresentable (engine releases at full charge)."
    },
    {
      "slot": "skill1",
      "kitLine": "Gains Pierce for 40 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "gainPierce durationSec 40 (timed window, NOT the top-level hasPierce flag — pierce is off until the first full charge)."
    },
    {
      "slot": "skill1",
      "kitLine": "Pierce Damage ▲ 60% for 40 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff pierceDamagePct 60, durationSec 40, self. Damage-Up bucket; live because the sibling gainPierce tags her shots."
    },
    {
      "slot": "skill2",
      "kitLine": "■ Activates when entering Full Burst.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'fullBurstEnter'} (team FB entry, not burstCast — the text says 'entering Full Burst'), target {kind:'allies'} incl. self."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 20% of the skill user's ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterAtkPct 20, durationSec 10 — caster-scaled flat ATK add, resolved at apply time."
    },
    {
      "slot": "skill2",
      "kitLine": "■ Activates when High Tension is remove",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'selfStatusEnd', name:'High Tension'}, armed by the burst block's selfStatus('High Tension',35s) which also targets this unit. target allies."
    },
    {
      "slot": "skill2",
      "kitLine": "Low Tension: ATK ▼ 10% of the skill use",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterAtkPct -10, durationSec 20 (levelScale anchor [10]) + selfStatus('Low Tension',20) to open the named state the next line reads. A real team-wide PENALTY — faithful, not skipped."
    },
    {
      "slot": "skill2",
      "kitLine": "■ Activates only when in the Low Tensio",
      "status": "IMPLEMENTED",
      "effectOrReason": "Gate folded into the same selfStatusEnd('High Tension') trigger on a separate self-targeted block: Low Tension opens on exactly that frame, so co-timing == requiresSelfStatus without depending on gate/effect ordering."
    },
    {
      "slot": "skill2",
      "kitLine": "Low Energy: Stuns for 20 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "stun durationSec 20, target self — blocks firing/charging/reloading (bursting unaffected per schema)."
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects all allies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'burstCast'} (own burst block, no activation clause), target {kind:'allies'} incl. self. Burst I ⇒ stage omitted."
    },
    {
      "slot": "burst",
      "kitLine": "High Tension: Pierce Damage ▲ 15%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff pierceDamagePct 15, durationSec 35, maxStacks 3 (one stack per own cast) + selfStatus('High Tension',35) to arm skill2's removal trigger."
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "second burst block, trigger burstCast, target {kind:'self'}."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 50% for 35 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 50, durationSec 35 — unscoped self ATK (scales her OWN ATK; no 'of the skill user's ATK' clause, so atkPct not casterAtkPct)."
    }
  ],
  "flags": [
    {
      "field": "skill1[0].trigger",
      "estimate": "{kind:'fullCharge'} — every charged pull (SR, chargeFrames 60 ⇒ ~1 pull/charge cycle)",
      "reasoning": "The kit gates on Full Charge being MAINTAINED for ≥1 sec after reaching full charge. The engine releases charge weapons exactly at full charge, so no hold state exists; `fullCharge` is the closest primitive and fires on every charged pull. Against a player who holds, this is exact; against one who releases immediately, it over-fires. Since both effects are 40s windows on a ~1-2s cadence, uptime saturates either way — the error is confined to the first seconds of the fight.",
      "recipe": "Focus recording: time the Pierce-icon appearance relative to the first shot. If the buff icon appears ~1s AFTER the first full charge rather than on release, the hold is real and the block needs a block-level delaySec ~1 (or an interval stand-in) instead."
    },
    {
      "field": "skill2[1].trigger / burst[0].effects[1] (selfStatus 'High Tension')",
      "estimate": "Window 35s, max-extended per own burst cast ⇒ with cd 40s the lapse fires at most once late in a 180s fight; expected ZERO firings in graded comps",
      "reasoning": "The kit gives no activation event for 'High Tension is removed' other than its own expiry, and `selfStatusEnd` requires a `selfStatus` effect to arm it. Pairing the burst's named buff with a same-named 35s selfStatus is the only way to express the kit's penalty loop. Whether the game ALSO removes High Tension on some other condition (stack consumption, overwrite by another Tension source) is unknown; if it does, the ATK▼/stun pair would fire far more often and this baseline under-credits the penalty.",
      "recipe": "Record a fight where the unit stops bursting for >35s: confirm (a) an ATK▼ popup on all allies, (b) a self-stun immediately after, (c) the 20s durations. Then confirm the inverse — burst every rotation and verify the penalty NEVER appears."
    },
    {
      "field": "burst[0].effects[0].maxStacks",
      "estimate": "3 stacks, +1 per own burst cast; steady state 3 from the 3rd rotation on (time-average over a 180s fight ≈ 2.5 stacks ⇒ ~37% of the 45% ceiling-equivalent)",
      "reasoning": "The kit states the cap but not the accrual rule. One-stack-per-cast is the default reading for a burst-applied stacking buff, and the 35s duration exceeds the 40s cooldown only marginally — so whether stacks SURVIVE to the next cast is itself uncertain (35s duration vs 40s cd suggests a 5s gap where a stack could lapse, which would pin the kit at 1 stack forever unless FB cadence is faster than cd). No rampSec authored: per-cast stacking already ramps, and layering rampSec on top would double-haircut.",
      "recipe": "Popup/icon read across three consecutive bursts: count the stack pips on the ally buff icon at each cast. Critically, check the pip count IMMEDIATELY BEFORE the 2nd and 3rd cast — if it has dropped to 0, the 35s window genuinely lapses under a 40s cooldown and the buff never exceeds 1 stack."
    },
    {
      "field": "skill2[1].effects[0].value (sign) + levelScale",
      "estimate": "casterAtkPct -10 with levelScale {value:[10]}",
      "reasoning": "A team-wide ATK ▼ scaled off the caster's ATK has no dedicated debuff StatKey; a negative casterAtkPct is the arithmetic equivalent on the flat-ATK path. The derived negative will not match index 9 of the level table, hence the [10] anchor. UNVERIFIED that the engine accepts a negative flat-ATK contribution without clamping at 0.",
      "recipe": "Harness: force the lapse (patch the selfStatus durationSec down via withPatchedOverride), capture buffApply events with stat 'casterAtkPct', and assert the emitted value is negative and that the target's effectiveAtk actually drops by (10/100)×caster.staticAtk."
    },
    {
      "field": "skill2[2].effects[0] (stun self 20s)",
      "estimate": "stun durationSec 20 — zero shots fired for 20s, burst chain unaffected",
      "reasoning": "Per the schema a stun blocks firing/charging/reloading but not bursting. For a Supporter this costs little damage directly, but it also stops the skill1 `fullCharge` trigger, so Pierce + Pierce Damage ▲60% lapse 40s after the last charge during a long stun — a second-order loss the kit text does not spell out.",
      "recipe": "Same forced-lapse harness run: count shot events in the 20s after the lapse frame (expect 0) and confirm a burstCast still occurs inside the window if the gauge fills."
    },
    {
      "field": "base cadence tuple (chargeFrames 60 / reloadFrames 151 / hitsPerShot 1)",
      "estimate": "as datamined",
      "reasoning": "ALWAYS-⚑: datamine cadence fields are known-unreliable, and here they set how often the skill1 pierce window refreshes and how often full charges land. A wrong charge time changes trigger frequency, not magnitudes, so the 40s windows absorb most of the error.",
      "recipe": "Frame-count one magazine (6 rounds) of unbuffed fire from a focus recording: derive pulls/s and reload frames, compare against 60/151."
    },
    {
      "field": "skill1 Defiant Spirit (unmodeled)",
      "estimate": "inert — 0 damage contribution",
      "reasoning": "Debuff immunity has no primitive and the v1 boss applies no ally debuffs, so modeling it could not move damage. Recorded verbatim in unmodeled.skill1 rather than silently dropped. Flagged because its activation clause shares the skill1 trigger — if a future debuff-immunity primitive lands, the block shape is already known.",
      "recipe": "None needed at v1 scope; revisit only if the engine gains ally-debuff modeling."
    },
    {
      "field": "noFb / noRange",
      "estimate": "neither set",
      "reasoning": "Per the hard rules: FB-by-timing defaults ON and noRange is engine-automatic. This kit has NO flatDamage/dot/hitRepeat riders at all — it is pure buffs plus one stun — so there is nothing for either field to attach to.",
      "recipe": "N/A (no function-damage instances in this kit)."
    }
  ],
  "model": "claude-opus-5"
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 1 identical block(s); 0 driver-only; 0 blind-only

### skill2: 2 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"selfStatusEnd","name":"High Tension"},"target":{"kind":"allies"},"effects":[{"kind":"buff","stat":"casterAtkPct","value":-10,"durationSec":20},{"kind":"selfStatus","name":"Low Tension","durationSec":20}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"selfStatusEnd","name":"High Tension"},"target":{"kind":"allies"},"effects":[{"kind":"buff","stat":"casterAtkPct","value":-10,"durationSec":20,"levelScale":{"value":[10]}},{"kind":"selfStatus","name":"Low Tension","durationSec":20}],"gates":{}}

### burst: 0 identical block(s); 2 driver-only; 2 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"allies"},"effects":[{"kind":"buff","stat":"pierceDamagePct","value":15,"durationSec":35,"maxStacks":3}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"selfStatus","name":"High Tension","durationSec":35},{"kind":"buff","stat":"atkPct","value":50,"durationSec":35}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"allies"},"effects":[{"kind":"buff","stat":"pierceDamagePct","value":15,"durationSec":35,"maxStacks":3},{"kind":"selfStatus","name":"High Tension","durationSec":35}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":50,"durationSec":35}],"gates":{}}

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/sky.json

```json
{
  "note": "Sky (slug sky) — SR/Supporter/Iron/Elysion, Burst I cd 40s, ammo 6, charge 1s, full charge 250%. Kit-autonomy gauntlet 2026-11-20. HOLD-FULL-CHARGE is a user-selectable kit mode: modes ['Hold','Release'], Hold first. The Skill 1 self line activates when Full Charge is MAINTAINED for 1 or more seconds; the sim releases at full charge and never holds, so the mode carries the play-style choice. Hold (default) = a player who holds on her full charges: every full charge counts as a qualifying hold → self Gains Pierce for 40 sec (gainPierce durationSec 40) + Pierce Damage ▲ 60% for 40 sec, refreshed per full charge, so both are up from her first shot (the rapunzel-pure-grace precedent: a hold-gated line runs at real-play uptime). Release = the literal never-hold reading: the line never fires, her shots are not Pierce-tagged. SKILL2: fullBurstEnter → all allies ATK ▲ 20% of the skill user's ATK (casterAtkPct 20) for 10 sec, on every Full Burst whether or not she cast. 'When High Tension is removed' = trigger selfStatusEnd 'High Tension' — the lapse of her own High Tension window, which her burst opens for 35 sec and a re-cast inside the window extends — → all allies Low Tension: ATK ▼ 10% of the skill user's ATK (casterAtkPct -10) for 20 sec, plus the Low Tension status window (selfStatus, 20 sec); Low Energy ('only when in the Low Tension state', self) = the same trigger gated requiresSelfStatus 'Low Tension' → self stun for 20 sec. BURST: all allies High Tension: Pierce Damage ▲ 15% for 35 sec, stacking to 3 (each cast adds a stack and refreshes the duration; a cast after a lapse restarts at 1); self High Tension status window 35 sec (the window the Low Tension trigger reads); self ATK ▲ 50% for 35 sec. Every magnitude is kit-text literal at skill level 10 (DATAMINED).",
  "modes": ["Hold", "Release"],
  "unmodeled": {
    "skill1": [
      "■ Activates when Full Charge is maintained for 1 or more seconds while this unit is not in the Defiant Spirit state. Affects all allies. Defiant Spirit: Grants debuff immunity to 1 debuff(s) for 5 sec. Activates 3 time(s) per battle."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1 HOLD MODE (⚑ user-selected): the in-game trigger needs Full Charge held for 1 or more seconds, which the sim never does. Hold (default) credits every full charge as a hold, so Pierce and Pierce Damage ▲ 60% are up from her first full charge; Release = neither fires. The cost of holding (up to about 1 second of delayed fire per hold) is not charged. ⚑ estimate: Hold is the manual-play upper bound on Pierce uptime, Release the auto-play floor; recipe: a sky focus recording — check whether the Pierce buff icon is up and how her shot cadence compares with 1 shot per charge cycle; tier: MEASUREMENT-GATED.",
    "skill1 DEFIANT SPIRIT (unmodeled): debuff immunity is a defensive effect with no incoming-damage counterpart in the sim, but it can also absorb her own Low Tension debuff on the allies it covers if a hold lands within 5 seconds before High Tension lapses (3 times per battle). Low Tension and the Low Energy stun always apply here. ⚑ estimate: in Hold mode a timed hold could cancel up to 3 of the Low Tension windows (and, if it covers her, the stun); recipe: a manual-play recording timing a hold just before High Tension lapses — does the Low Tension icon appear; tier: MEASUREMENT-GATED.",
    "skill2 LOW ENERGY stun: the engine's stun stops firing, charging and reloading but not burst casting, so she can still cast her burst while stunned (the mast-romantic-maid convention), and a re-cast during Low Tension does not end Low Tension or the stun early (the kit states no early exit). ⚑ estimate: if a stunned unit cannot cast in-game, a cast that comes up during the 20-second stun waits until it ends; if re-entering High Tension clears Low Tension, the stun shortens to about 5 seconds per cycle; recipe: a recording where her cooldown returns during Low Energy — does she cast, and when does she resume firing; tier: MEASUREMENT-GATED.",
    "burst HIGH TENSION lapse: 'removed' is read as the end of her own High Tension window (35 sec after her latest cast). Nothing in the sim cleanses a buff early, so the timed lapse is the only removal. With a 40-second cooldown the window lapses between casts unless burst cooldown reduction brings her next cast inside 35 seconds."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "self"
      },
      "mode": "Hold",
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 40
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 60,
          "durationSec": 40
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 20,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "selfStatusEnd",
        "name": "High Tension"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": -10,
          "durationSec": 20
        },
        {
          "kind": "selfStatus",
          "name": "Low Tension",
          "durationSec": 20
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "selfStatusEnd",
        "name": "High Tension"
      },
      "target": {
        "kind": "self"
      },
      "requiresSelfStatus": "Low Tension",
      "effects": [
        {
          "kind": "stun",
          "durationSec": 20
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
          "stat": "pierceDamagePct",
          "value": 15,
          "durationSec": 35,
          "maxStacks": 3
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "selfStatus",
          "name": "High Tension",
          "durationSec": 35
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 50,
          "durationSec": 35
        }
      ]
    }
  ]
}
```

### 7b. scripts/tests/units/sky.test.ts

```ts
// PER-UNIT KIT SPEC — `sky` (Sky; SR / Supporter / Iron / Elysion, Burst I, cd 40s, ammo 6,
// chargeFrames 60). NEW unit. Kit-autonomy gauntlet 2026-11-20. Tier 2 (a hold-charge trigger the
// sim cannot perform → a user-selected mode; a status-REMOVAL trigger; a self-stun; stacking).
//
// One assertion group per KIT LINE (K1..K7), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters.sky.skills, SL10):
//   S1 ■ Full Charge maintained ≥1s while not in Defiant Spirit → all allies:
//        Defiant Spirit: debuff immunity ×1 for 5 sec, 3 times per battle               [K1 UNMODELED]
//      ■ Full Charge maintained ≥1s → self: Gains Pierce 40 sec; Pierce Damage ▲ 60% 40s [K2 mode]
//   S2 ■ entering Full Burst → all allies: ATK ▲ 20% of the skill user's ATK for 10 sec  [K3]
//      ■ High Tension is removed → all allies: Low Tension: ATK ▼ 10% of skill user's ATK 20s [K4]
//      ■ only when in Low Tension → self: Low Energy: Stuns for 20 sec                    [K5]
//   BU ■ all allies: High Tension: Pierce Damage ▲ 15% for 35 sec, stacks up to 3          [K6]
//      ■ self: ATK ▲ 50% for 35 sec                                                       [K7]
//
// The sim releases at full charge and never HOLDS it, so the two "Full Charge maintained for 1 or
// more seconds" lines cannot fire in-engine (the rapunzel-pure-grace / sin-swift-bunny precedent).
// K2 is a user-selected mode: 'Hold' (default — every full charge counts as a qualifying hold:
// fullCharge → self gainPierce 40s + Pierce Damage ▲ 60% 40s, refreshed per full charge) vs
// 'Release' (the literal never-hold reading — the line never fires). K1 (debuff immunity) is
// defensive and hold-gated → recorded `unmodeled` verbatim.
//
// Why each assertion discriminates:
//   K2   Hold: the 60% lands on her full-charge frames, self only, 40s, and from then on every shot
//        of hers is Pierce-tagged and carries it (+≥0.6 Damage Up vs Release at the same frame).
//        Release: no grant, her shots are not Pierce-tagged (High Tension never reaches them).
//        Counterfactuals: the mode gate dropped (live in Release), allies scope (4 holders),
//        a whole-fight pierce flag instead of the timed gainPierce window (structure pin).
//   K3   Keys to FULL BURST ENTRY — every FB, including the many where she did not cast (fixture B,
//        dorothy covers stage 1) — all 5 allies, 20% of HER static ATK as flat ATK, 10s.
//        Counterfactual: burstCast keying (only her casts).
//   K4   Keys to the LAPSE of her own High Tension window (35s after her latest cast). In fixture B
//        dorothy's burst-cooldown reduction brings two of her casts back INSIDE 35s, which refreshes
//        High Tension (no removal) — so Low Tension lands exactly twice, at cast+35s of the casts
//        NOT followed by an in-window re-cast. Counterfactual: burstCast + delaySec 35 (fires after
//        EVERY cast, 4×). All 5 allies, −10% of her ATK, 20s; counterfactual self scope (1 holder).
//   K5   She fires NOTHING for 20s from each lapse, fires before and after; allies keep firing.
//        The stun is gated on her Low Tension status (opened by the K4 block, 20s).
//        Counterfactuals: stun dropped (she fires inside the window); Low Tension status producer
//        dropped (the gate never opens → no stun).
//   K6   Each cast: 5 holders, Pierce Damage 15, 35s; a re-cast inside 35s STACKS (2) and refreshes,
//        a cast after a lapse restarts at 1. Feeds a Pierce-tagged ally (alice): removing it lowers
//        alice's total. Counterfactual maxStacks 1 (never 2).
//   K7   Self only, ATK 50, 35s, on each cast; counterfactual allies scope.
//
// Fixtures (deterministic, no seed; boss Fire, focus alice — a Pierce-tagged SR):
//   A: sky (sole B1) / crown (B2) / alice, helm (B3) — she casts every 40s, every window lapses.
//   B: sky / dorothy (B1 + per-reload burst-cooldown reduction to all allies) / crown / alice / helm.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const SLUG = 'sky';
const FPS = 60;
const A = [SLUG, 'crown', 'alice', 'helm'];
const B = [SLUG, 'dorothy', 'crown', 'alice', 'helm'];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Dmg = Extract<SimEvent, { kind: 'damage' }>;

function run(slugs: string[], ov?: any, mode?: string) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'alice',
    overrides: ov ? { [SLUG]: ov } : {},
    modes: mode ? { [SLUG]: mode } : undefined,
    cfg: { onEvent: (e) => events.push(e) },
  });
  const idx = slugs.indexOf(SLUG);
  const casts = events
    .filter((e) => e.kind === 'burstCast' && (e as any).slug === SLUG)
    .map((e) => e.frame);
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  const mine = events.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === idx
  );
  const shots = (slug: string) =>
    events
      .filter((e): e is Shot => e.kind === 'shot' && e.slug === slug)
      .map((e) => e.frame);
  const normals = events.filter(
    (e): e is Dmg =>
      e.kind === 'damage' && e.slug === SLUG && e.srcSlot === 'normal'
  );
  const staticAtk = (res as any).units.find((u: any) => u.slug === SLUG)
    .staticAtk as number;
  return {
    events,
    idx,
    casts,
    fbStarts,
    mine,
    shots,
    normals,
    staticAtk,
    totals: totals(res),
  };
}
type Run = ReturnType<typeof run>;

const bySlot = (r: Run, slot: string, stat: string) =>
  r.mine.filter((b) => b.key.split(':')[1] === slot && b.stat === stat);
const frames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const holdersAt = (bs: BuffApply[], f: number) =>
  bs
    .filter((b) => b.frame === f)
    .map((b) => b.targetIdx)
    .sort();
/** Expected High Tension lapses: cast + 35s for every cast NOT followed by a re-cast inside 35s. */
const lapses = (r: Run) =>
  r.casts
    .filter((c, i) => {
      const next = r.casts[i + 1];
      return next === undefined || next - c >= 35 * FPS;
    })
    .map((c) => c + 35 * FPS)
    .filter((f) => f < 180 * FPS);

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const find = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) {
    throw new Error(`${SLUG} ${slot} block missing — fixture is stale`);
  }
  return b;
};
const hasStat = (stat: string, value?: number) => (b: any) =>
  b.effects.some(
    (e: any) => e.stat === stat && (value === undefined || e.value === value)
  );
const hasKind = (kind: string) => (b: any) =>
  b.effects.some((e: any) => e.kind === kind);

const a = run(A);
const b = run(B);
const aRel = run(A, undefined, 'Release');

describe(`${SLUG} — fixture`, () => {
  it('A: she is the sole Burst I and casts every ~40s', () => {
    expect(a.casts.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < a.casts.length; i++) {
      expect(a.casts[i] - a.casts[i - 1]).toBeGreaterThanOrEqual(35 * FPS);
    }
  });
  it('B: dorothy covers stage 1 too, and at least one of her re-casts lands inside 35s', () => {
    const gaps = b.casts.slice(1).map((c, i) => c - b.casts[i]);
    expect(gaps.some((g) => g < 35 * FPS)).toBe(true);
    expect(gaps.some((g) => g >= 35 * FPS)).toBe(true);
    expect(b.fbStarts.length).toBeGreaterThan(b.casts.length);
  });
});

describe('K1 — Defiant Spirit (hold-gated debuff immunity) is recorded unmodeled', () => {
  it('verbatim in unmodeled.skill1, and no block carries it', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    expect(
      ov.unmodeled!.skill1.some((l: string) => l.includes('Defiant Spirit'))
    ).toBe(true);
    expect(JSON.stringify(ov.skill1)).not.toContain('Defiant');
  });
});

describe('K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default)', () => {
  const g = bySlot(a, 'skill1', 'pierceDamagePct');
  const charged = a.events
    .filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG && e.charged)
    .map((e) => e.frame);

  it('the block: fullCharge-keyed, self, mode Hold, gainPierce 40s + pierceDamagePct 60 40s', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    expect(ov.modes).toEqual(['Hold', 'Release']);
    expect((ov as any).hasPierce).toBeUndefined();
    const b = find(ov, 'skill1', hasStat('pierceDamagePct', 60));
    expect(b.trigger.kind).toBe('fullCharge');
    expect(b.target.kind).toBe('self');
    expect(b.mode).toBe('Hold');
    const gp = b.effects.find((e: any) => e.kind === 'gainPierce');
    expect(gp.durationSec).toBe(40);
  });

  it('Hold: the 60% lands on her full-charge frames, on her alone, 40s', () => {
    expect(g.length).toBeGreaterThan(0);
    // every full charge is a qualifying hold → one (re)application per full-charge pull
    expect(frames(g)).toEqual([...new Set(charged)]);
    for (const x of g) {
      expect(x.targetIdx).toBe(a.idx);
      expect(x.value).toBe(60);
      expect(x.expiresFrame! - x.frame).toBe(40 * FPS);
    }
  });

  it('Hold vs Release: same shot frames; after her first full charge every shot gains ≥ 0.6 Damage Up', () => {
    expect(bySlot(aRel, 'skill1', 'pierceDamagePct')).toEqual([]);
    expect(a.normals.map((d) => d.frame)).toEqual(
      aRel.normals.map((d) => d.frame)
    );
    const diffs = a.normals
      .map((d, i) => [d.frame, d.mult.dmgUp - aRel.normals[i].mult.dmgUp])
      .filter(([f]) => f > charged[0]);
    expect(diffs.length).toBeGreaterThan(20);
    for (const [, x] of diffs) {
      expect(x).toBeGreaterThanOrEqual(0.6 - 1e-9);
    }
    // the 15/stack High Tension reaches her too while it is up, now that she pierces
    expect(diffs.some(([, x]) => x > 0.6 + 1e-9)).toBe(true);
    expect(a.totals[SLUG]).toBeGreaterThan(aRel.totals[SLUG]);
  });

  it('Release: her shots are not Pierce-tagged (removing High Tension leaves them unchanged)', () => {
    const noHt = run(
      A,
      patch((ov) => {
        ov.burst = ov.burst.filter(
          (blk: any) => !hasStat('pierceDamagePct')(blk)
        );
      }),
      'Release'
    );
    expect(noHt.normals.map((d) => [d.frame, d.mult.dmgUp])).toEqual(
      aRel.normals.map((d) => [d.frame, d.mult.dmgUp])
    );
  });

  it('DISCRIMINATING: dropping the mode gate makes it live in Release', () => {
    const cf = run(
      A,
      patch((ov) => {
        delete find(ov, 'skill1', hasStat('pierceDamagePct', 60)).mode;
      }),
      'Release'
    );
    expect(bySlot(cf, 'skill1', 'pierceDamagePct').length).toBeGreaterThan(0);
  });

  it('DISCRIMINATING: allies scope would hand the 60% to all four', () => {
    const cf = run(
      A,
      patch((ov) => {
        find(ov, 'skill1', hasStat('pierceDamagePct', 60)).target = {
          kind: 'allies',
        };
      })
    );
    const cg = bySlot(cf, 'skill1', 'pierceDamagePct');
    expect(holdersAt(cg, frames(cg)[0])).toEqual([0, 1, 2, 3]);
  });

  it('DISCRIMINATING: without the gainPierce tag the 60% never reaches her shots', () => {
    const cf = run(
      A,
      patch((ov) => {
        const b = find(ov, 'skill1', hasStat('pierceDamagePct', 60));
        b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
      })
    );
    expect(cf.totals[SLUG]).toBeLessThan(a.totals[SLUG]);
  });
});

describe('K3 — entering Full Burst → all allies ATK ▲ 20% of her ATK, 10s', () => {
  const g = bySlot(b, 'skill2', 'casterAtkPct').filter((x) => x.value > 0);

  it('on EVERY Full Burst start (incl. ones she did not cast), all 5, +20% of her ATK, 10s', () => {
    expect(frames(g)).toEqual(b.fbStarts);
    for (const f of b.fbStarts) {
      expect(holdersAt(g, f)).toEqual([0, 1, 2, 3, 4]);
    }
    for (const x of g) {
      expect(x.value).toBeCloseTo(0.2 * b.staticAtk, 3);
      expect(x.expiresFrame! - x.frame).toBe(10 * FPS);
    }
  });

  it('DISCRIMINATING: burstCast keying fires only on her casts', () => {
    const cf = run(
      B,
      patch((ov) => {
        find(ov, 'skill2', hasStat('casterAtkPct', 20)).trigger = {
          kind: 'burstCast',
        };
      })
    );
    const cg = bySlot(cf, 'skill2', 'casterAtkPct').filter((x) => x.value > 0);
    expect(frames(cg).length).toBe(cf.casts.length);
    expect(frames(cg).length).toBeLessThan(b.fbStarts.length);
  });
});

describe('K4 — High Tension removed → all allies Low Tension: ATK ▼ 10% of her ATK, 20s', () => {
  const lowB = bySlot(b, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);
  const lowA = bySlot(a, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);

  it('A: lands 35s after every cast (each window lapses before her next cast)', () => {
    expect(frames(lowA)).toEqual(lapses(a));
    expect(frames(lowA)).toEqual(
      a.casts.map((c) => c + 35 * FPS).filter((f) => f < 180 * FPS)
    );
  });

  it('B: lands ONLY at real lapses — an in-window re-cast refreshes High Tension, no Low Tension', () => {
    expect(lapses(b).length).toBeGreaterThan(0);
    expect(frames(lowB)).toEqual(lapses(b));
    expect(frames(lowB).length).toBeLessThan(
      b.casts.filter((c) => c + 35 * FPS < 180 * FPS).length
    );
  });

  it('all 5 allies, −10% of her static ATK as flat ATK, 20s', () => {
    for (const f of frames(lowB)) {
      expect(holdersAt(lowB, f)).toEqual([0, 1, 2, 3, 4]);
    }
    for (const x of lowB) {
      expect(x.value).toBeCloseTo(-0.1 * b.staticAtk, 3);
      expect(x.expiresFrame! - x.frame).toBe(20 * FPS);
    }
  });

  it('DISCRIMINATING: a burstCast + 35s delay stand-in fires after EVERY cast', () => {
    const cf = run(
      B,
      patch((ov) => {
        for (const blk of ov.skill2) {
          if (blk.trigger.kind === 'selfStatusEnd') {
            blk.trigger = { kind: 'burstCast' };
            blk.delaySec = 35;
          }
        }
      })
    );
    const cl = bySlot(cf, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);
    expect(frames(cl).length).toBeGreaterThan(frames(lowB).length);
  });

  it('DISCRIMINATING: self scope would debuff only her', () => {
    const cf = run(
      B,
      patch((ov) => {
        find(ov, 'skill2', hasStat('casterAtkPct', -10)).target = {
          kind: 'self',
        };
      })
    );
    const cl = bySlot(cf, 'skill2', 'casterAtkPct').filter((x) => x.value < 0);
    for (const f of frames(cl)) {
      expect(holdersAt(cl, f)).toEqual([cf.idx]);
    }
  });
});

describe('K5 — Low Energy: she is stunned for 20s on entering Low Tension', () => {
  const inStun = (r: Run, f: number) =>
    lapses(r).some((l) => f >= l && f < l + 20 * FPS);

  it('she fires nothing inside any stun window, but fires before and after', () => {
    for (const r of [a, b]) {
      const mine = r.shots(SLUG);
      expect(mine.filter((f) => inStun(r, f))).toEqual([]);
      const l0 = lapses(r)[0];
      expect(mine.some((f) => f < l0)).toBe(true);
      expect(mine.some((f) => f >= l0 + 20 * FPS)).toBe(true);
    }
  });

  it('allies are not stunned (alice fires inside her stun window)', () => {
    expect(a.shots('alice').some((f) => inStun(a, f))).toBe(true);
  });

  it('DISCRIMINATING: without the Low Tension status the gate never opens — no stun', () => {
    const cf = run(
      A,
      patch((ov) => {
        for (const blk of ov.skill2) {
          blk.effects = blk.effects.filter(
            (e: any) => !(e.kind === 'selfStatus' && e.name === 'Low Tension')
          );
        }
      })
    );
    expect(cf.shots(SLUG).some((f) => inStun(a, f))).toBe(true);
  });

  it('DISCRIMINATING: without the stun she fires inside the window', () => {
    const cf = run(
      A,
      patch((ov) => {
        ov.skill2 = ov.skill2.filter((blk: any) => !hasKind('stun')(blk));
      })
    );
    expect(cf.shots(SLUG).some((f) => inStun(a, f))).toBe(true);
  });
});

describe('K6 — burst → all allies High Tension: Pierce Damage ▲ 15%, 35s, stacks to 3', () => {
  const g = bySlot(b, 'burst', 'pierceDamagePct');

  it('each cast: all 5, 15 per stack, 35s', () => {
    expect(frames(g)).toEqual(b.casts);
    for (const c of b.casts) {
      expect(holdersAt(g, c)).toEqual([0, 1, 2, 3, 4]);
    }
    for (const x of g) {
      expect(x.value).toBe(15);
      expect(x.expiresFrame! - x.frame).toBe(35 * FPS);
      expect(x.maxStacks).toBe(3);
    }
  });

  it('an in-window re-cast stacks; a cast after a lapse restarts at 1', () => {
    const own = g.filter((x) => x.targetIdx === b.idx);
    const stacks = own.map((x) => x.stacks);
    expect(stacks[0]).toBe(1);
    expect(Math.max(...stacks)).toBeGreaterThanOrEqual(2);
    b.casts.forEach((c, i) => {
      if (i > 0 && c - b.casts[i - 1] >= 35 * FPS) {
        expect(own[i].stacks).toBe(1);
      }
    });
  });

  it('feeds a Pierce-tagged ally: removing it lowers alice', () => {
    const cf = run(
      B,
      patch((ov) => {
        ov.burst = ov.burst.filter(
          (blk: any) => !hasStat('pierceDamagePct')(blk)
        );
      })
    );
    expect(cf.totals.alice).toBeLessThan(b.totals.alice);
  });

  it('DISCRIMINATING: maxStacks 1 never reaches 2', () => {
    const cf = run(
      B,
      patch((ov) => {
        delete find(ov, 'burst', hasStat('pierceDamagePct')).effects[0]
          .maxStacks;
      })
    );
    const st = bySlot(cf, 'burst', 'pierceDamagePct').map((x) => x.stacks);
    expect(Math.max(...st)).toBe(1);
  });
});

describe('K7 — burst → self ATK ▲ 50%, 35s', () => {
  const g = bySlot(a, 'burst', 'atkPct');

  it('each cast, her alone, 50, 35s', () => {
    expect(frames(g)).toEqual(a.casts);
    for (const x of g) {
      expect(x.targetIdx).toBe(a.idx);
      expect(x.value).toBe(50);
      expect(x.expiresFrame! - x.frame).toBe(35 * FPS);
    }
  });

  it('DISCRIMINATING: allies scope reaches all four', () => {
    const cf = run(
      A,
      patch((ov) => {
        find(ov, 'burst', hasStat('atkPct', 50)).target = { kind: 'allies' };
      })
    );
    const cg = bySlot(cf, 'burst', 'atkPct');
    expect(holdersAt(cg, cf.casts[0])).toEqual([0, 1, 2, 3]);
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/sky.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — sky — kit-autonomy gauntlet 2026-11-20
Arm 1 (pre-S3, NO override on disk — the new unit's starting state; commit b9cf194c): RED as required:
    Error: no skill override for "sky" — the engine does not parse skill prose at runtime
          Tests  no tests
Arm 2 (shipped override): npx vitest run scripts/tests/units/sky.test.ts --reporter=verbose — every DISCRIMINATING case runs the named nearest-wrong encoding via withPatchedOverride in the same file and asserts it diverges, so GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions.

✓ scripts/tests/units/sky.test.ts > sky — fixture > A: she is the sole Burst I and casts every ~40s 1ms
✓ scripts/tests/units/sky.test.ts > sky — fixture > B: dorothy covers stage 1 too, and at least one of her re-casts lands inside 35s 0ms
✓ scripts/tests/units/sky.test.ts > K1 — Defiant Spirit (hold-gated debuff immunity) is recorded unmodeled > verbatim in unmodeled.skill1, and no block carries it 0ms
✓ scripts/tests/units/sky.test.ts > K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default) > the block: fullCharge-keyed, self, mode Hold, gainPierce 40s + pierceDamagePct 60 40s 0ms
✓ scripts/tests/units/sky.test.ts > K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default) > Hold: the 60% lands on her full-charge frames, on her alone, 40s 1ms
✓ scripts/tests/units/sky.test.ts > K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default) > Hold vs Release: same shot frames; after her first full charge every shot gains ≥ 0.6 Damage Up 1ms
✓ scripts/tests/units/sky.test.ts > K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default) > Release: her shots are not Pierce-tagged (removing High Tension leaves them unchanged) 22ms
✓ scripts/tests/units/sky.test.ts > K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default) > DISCRIMINATING: dropping the mode gate makes it live in Release 25ms
✓ scripts/tests/units/sky.test.ts > K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default) > DISCRIMINATING: allies scope would hand the 60% to all four 17ms
✓ scripts/tests/units/sky.test.ts > K2 — hold Full Charge 1s → self Pierce + Pierce Damage ▲ 60%, 40s (mode Hold, default) > DISCRIMINATING: without the gainPierce tag the 60% never reaches her shots 15ms
✓ scripts/tests/units/sky.test.ts > K3 — entering Full Burst → all allies ATK ▲ 20% of her ATK, 10s > on EVERY Full Burst start (incl. ones she did not cast), all 5, +20% of her ATK, 10s 1ms
✓ scripts/tests/units/sky.test.ts > K3 — entering Full Burst → all allies ATK ▲ 20% of her ATK, 10s > DISCRIMINATING: burstCast keying fires only on her casts 39ms
✓ scripts/tests/units/sky.test.ts > K4 — High Tension removed → all allies Low Tension: ATK ▼ 10% of her ATK, 20s > A: lands 35s after every cast (each window lapses before her next cast) 0ms
✓ scripts/tests/units/sky.test.ts > K4 — High Tension removed → all allies Low Tension: ATK ▼ 10% of her ATK, 20s > B: lands ONLY at real lapses — an in-window re-cast refreshes High Tension, no Low Tension 0ms
✓ scripts/tests/units/sky.test.ts > K4 — High Tension removed → all allies Low Tension: ATK ▼ 10% of her ATK, 20s > all 5 allies, −10% of her static ATK as flat ATK, 20s 0ms
✓ scripts/tests/units/sky.test.ts > K4 — High Tension removed → all allies Low Tension: ATK ▼ 10% of her ATK, 20s > DISCRIMINATING: a burstCast + 35s delay stand-in fires after EVERY cast 35ms
✓ scripts/tests/units/sky.test.ts > K4 — High Tension removed → all allies Low Tension: ATK ▼ 10% of her ATK, 20s > DISCRIMINATING: self scope would debuff only her 33ms
✓ scripts/tests/units/sky.test.ts > K5 — Low Energy: she is stunned for 20s on entering Low Tension > she fires nothing inside any stun window, but fires before and after 1ms
✓ scripts/tests/units/sky.test.ts > K5 — Low Energy: she is stunned for 20s on entering Low Tension > allies are not stunned (alice fires inside her stun window) 0ms
✓ scripts/tests/units/sky.test.ts > K5 — Low Energy: she is stunned for 20s on entering Low Tension > DISCRIMINATING: without the Low Tension status the gate never opens — no stun 23ms
✓ scripts/tests/units/sky.test.ts > K5 — Low Energy: she is stunned for 20s on entering Low Tension > DISCRIMINATING: without the stun she fires inside the window 24ms
✓ scripts/tests/units/sky.test.ts > K6 — burst → all allies High Tension: Pierce Damage ▲ 15%, 35s, stacks to 3 > each cast: all 5, 15 per stack, 35s 1ms
✓ scripts/tests/units/sky.test.ts > K6 — burst → all allies High Tension: Pierce Damage ▲ 15%, 35s, stacks to 3 > an in-window re-cast stacks; a cast after a lapse restarts at 1 0ms
✓ scripts/tests/units/sky.test.ts > K6 — burst → all allies High Tension: Pierce Damage ▲ 15%, 35s, stacks to 3 > feeds a Pierce-tagged ally: removing it lowers alice 32ms
✓ scripts/tests/units/sky.test.ts > K6 — burst → all allies High Tension: Pierce Damage ▲ 15%, 35s, stacks to 3 > DISCRIMINATING: maxStacks 1 never reaches 2 32ms
✓ scripts/tests/units/sky.test.ts > K7 — burst → self ATK ▲ 50%, 35s > each cast, her alone, 50, 35s 0ms
✓ scripts/tests/units/sky.test.ts > K7 — burst → self ATK ▲ 50%, 35s > DISCRIMINATING: allies scope reaches all four 24ms
Tests  27 passed (27)

Engine pin (selfStatusEnd): npx vitest run scripts/tests/engine/self-status-end.test.ts — 6/6 green; the two DISCRIMINATING cases verified RED with the sim.ts dispatch disabled (commit 9da670e4).

Coverage note: the selfStatusEnd-vs-(burstCast + delaySec 35) discrimination needs a re-cast INSIDE 35s, which only burst-cooldown reduction produces (fixture B, dorothy). In fixture A (no CDR) the two encodings are byte-identical — the K4 'B:' case and its counterfactual carry the discrimination.
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — sky (Sky) — kit-autonomy gauntlet 2026-11-20

Driver: Claude Opus 5.5. Tier 2 (a hold-charge trigger the sim cannot perform, a status-REMOVAL
trigger, a self-status gate, burstCast-vs-fullBurstEnter identity across the same kit). Claude-only
routing (owner 2026-10-02): S2b claude-fable-5 + claude-fable-5-1, S5/S6 claude-opus-5, S7
claude-fable-5-1 (binding) + claude-fable-5 — same-family evidence only.

## Engine change (for the judge to grade — commits 9da670e4 + 875591dc)

New trigger kind `{ kind: 'selfStatusEnd'; name: string }` (src/skills/types.ts). Dispatch in the
frame loop of src/engine/sim.ts, at the top of the frame right after the delayed-block resolution:

```ts
for (const sb of selfStatusEndBlocks) {
  if (units[sb.unitIdx].selfStatuses.get(sb.name) === frame) {
    applyBlock(sb.unitIdx, sb.block, sb.bi, frame);
  }
}
```

`selfStatuses` is the existing per-(unit, name) window map written by the `selfStatus` effect
(max-extended on re-application) and read by the `requiresSelfStatus` gate, which treats the window as
closed when `expiry <= frame` — so the lapse IS the expiry frame. A re-cast inside the window extends
it and the trigger moves with it; a cast after a lapse opens a new window that lapses (and fires)
again. `selfStatusEndBlocks` is built only from blocks that author the trigger, so the loop is empty
for every other unit. Validator: TRIGGERS set, non-empty name, and the same-unit producer census errors
on a selfStatusEnd name with no selfStatus producer. Web triggerLabel names it. Pinned by
scripts/tests/engine/self-status-end.test.ts (6 cases; the two DISCRIMINATING ones verified RED with
the dispatch disabled). Board-inert: `npx tsx scripts/regression.ts` output BYTE-IDENTICAL with and
without the sim.ts change. Code review on claude-fable-5-1: CLEAN (notes applied: same-frame order
comment, two-lapse pin; follow-ups: STATE.md row, asuka-wille's open handoff names this primitive).

Why a new primitive: no existing trigger reads a status LAPSE. The nearest stand-in, `burstCast` +
block `delaySec: 35`, fires 35s after EVERY cast — wrong whenever burst-cooldown reduction brings her
next cast inside 35s (21 roster overrides carry `burstCdr`, dorothy and liter among the common B1
partners). In that case High Tension is refreshed, never removed, so Low Tension must NOT fire; the
spec's fixture B (dorothy) pins exactly this (2 Low Tensions, not 4).

## S2c reconcile

Both S2b reviewers' spec tables match the driver on six lines: S2 FB-entry casterAtkPct 20 all allies
10s on fullBurstEnter (not burstCast); Low Tension = selfStatusEnd 'High Tension' → all allies
casterAtkPct -10 20s; Low Energy = self stun 20s on Low Tension entry; burst High Tension all allies
pierceDamagePct 15 35s maxStacks 3 on burstCast + a 35s self High Tension window; burst self atkPct
50 35s; Defiant Spirit UNMODELED (debuff immunity, defensive). Both name the stun's "bursting
unaffected" engine convention and the possibility that a re-cast ends Low Tension early as
measurement-gated (both now ⚑ caveats). claude-fable-5's claim that "stacks can never accumulate"
(cd 40 > 35) is wrong with burst-cooldown reduction — claude-fable-5-1 says so, and K6 pins stacking.

**The one divergence — the hold-gated self Pierce line (S1 ■2).** The driver's first encoding defaulted
to the literal never-hold reading (the sim releases at full charge; the guilty-mighty-bunny /
sin-swift-bunny DECISIONS precedent leaves a hold-toggle unfired by default) with Hold opt-in. Both S2b
reviewers, the S6 blind override and the S5 blind tests ALL encode the line as a `fullCharge`-keyed
self gainPierce 40s + Pierce Damage ▲ 60% 40s — every full charge counted as a hold, so the window is
effectively always up (the rapunzel-pure-grace precedent: a hold-gated line runs at real-play uptime).
Resolved toward that convergent reading: mode Hold (default) carries exactly that block; mode Release
keeps the literal never-hold reading selectable. The mode default is a play-style question the kit
does not answer — the #1 owner spot-check.

## Convergence run (S5 blind tests vs the shipped override)

Unmodified: 3 RED, all from a harness wiring defect (it passes `onEvent` at the top level of the
runComp options instead of `cfg.onEvent`, so it records zero events and its FB count is 0). Adapted
copy (that one line only — scripts/kit-autonomy/blind/sky.adapted.test.ts): 17 green / 1 RED / 3
skipped. The 1 RED, "no ATK-down is ever applied in the control fixture", rests on the blind file's
fixture premise that sky never casts in `controlComp` (liter is also Burst I). That premise is false:
she casts at 18.3s, 74.4s, 107.0s, 141.0s and 175.5s (whenever liter's 20s cooldown is down at the
chain), and the four ATK-down applications it sees at 53.3s are exactly 18.3 + 35 — the kit-correct
Low Tension after the first window lapses (every later re-cast lands inside 35s, so no further lapse).
Its own structural assertions on the same line (caster-scaled, 20s, team-wide, keyed to status
removal) are green.

## Fire-rate / modeled≠working

Fixture A (sole Burst I): casts every 40s; High Tension buffApply on each cast (5 holders, 35s);
Low Tension + stun at cast + 35s each cycle (4 in 180s); she fires nothing in each 20s stun window.
Fixture B (dorothy): 5 casts, two inside 35s of the previous (stacks 2), Low Tension only at the 2
real lapses. FB-entry +20% on every Full Burst start (11 in fixture B, vs 5 of her casts).
