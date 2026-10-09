# S7 RECONCILING-JUDGE PACKET — `belorta-pumpkin-witch` (Belorta: Pumpkin Witch, RL/Supporter/Water/Burst II)

Built 2026-10-09 by scripts/kit-autonomy/build-judge-packet.ts. Sections: 1 contract · 2 mechanics SSOT · 3 ground truth · 4 S2b review(s) · 5 S5 blind test · 6 S6 blind override · 7 driver implementation · 8 S2d matrix + driver notes.

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
  "slug": "belorta-pumpkin-witch",
  "name": "Belorta: Pumpkin Witch",
  "weapon": "RL",
  "burst": "II",
  "class": "Supporter",
  "element": "Water",
  "manufacturer": "Tetra",
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
■ Activates when entering Full Burst. Affects self.
Ghost Costume: Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit.
Prank Preparation: Max HP ▲ 15.84% for 10 sec.
■ Activates when entering Full Burst. Affects the ally to the right of this unit.
ATK ▲ 44.88% of the skill user's ATK for 10 sec.
```

### skill2

```text
■ Activates when landing a Full Charge attack while in the Ghost Costume state. Affects the target.
Ghostly Prank: Damage Taken ▲ 10.56% for 10 sec.
■ Activates when performing a Full Charge attack. Affects the ally to the right  of this unit.
Sustained Damage ▲ 19.97% for 5 sec.
```

### burst

```text
■ Affects the ally to the right of this unit.
 ATK ▲ 47.52% of the skill user's ATK for 10 sec.
Sustained Damage ▲ 27.23% for 10 sec.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "belorta-pumpkin-witch",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Ghost Costume: Prevents being targeted",
      "disposition": "FAITHFUL",
      "scope": "Self-only named status window; the untargetability payload is defensive (UNMODELED), but the window itself is load-bearing because skill2's Ghostly Prank is gated on 'while in the Ghost Costume state' — model as selfStatus {name:'Ghost Costume', durationSec:10} so requiresSelfStatus can read it.",
      "durationSemantics": "10 wall-clock seconds ('for 10 sec'); the 'removed upon taking a direct hit' early-termination clause is inert in v1 (boss deals no damage, nobody is hit), so in-sim the window always runs the full 10s — a sim-vs-game optimism to note, not to fudge.",
      "triggerIdentity": "'Activates when entering Full Burst' = fullBurstEnter (ANY team Full Burst), NOT burstCast — she is Burst II with a 40s cd, so on rotations where another B2 completes the chain (or her cd isn't up) a burstCast keying would wrongly skip the window.",
      "targetSet": "self",
      "nearestWrongModel": "Dropping the line entirely as 'defensive/unmodeled' (no selfStatus opened), which silently kills skill2's Ghostly Prank gate — the boss debuff then never fires; or keying it to burstCast so the costume only exists on her own burst rotations.",
      "distinguishingAssertion": "With the committed override, buffApply events for damageTakenPct value 10.56 exist (the gate is satisfiable) and every one of them falls within 10s of a fullBurstStart event; under the dropped-status misread there are ZERO damageTakenPct 10.56 buffApply events in the whole run.",
      "inertness": "The untargetability itself must move no damage: patching the selfStatus name (breaking only the status, with skill2's gate also renamed to match) vs removing both must differ only via the skill2 debuff — no direct damage or stat from this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Prank Preparation: Max HP ▲ 15.84%",
      "disposition": "FAITHFUL",
      "scope": "Plain self Max HP buff — taxonomy rule 7: keep the stat even though it is offensively inert here (her kit has no atkOfMaxHpPct / HP-scaling consumer, and ally-granted HP never feeds a teammate's conversion anyway — self-grant, so it WOULD feed a future self consumer).",
      "durationSemantics": "10 wall-clock seconds.",
      "triggerIdentity": "fullBurstEnter (same '■ Activates when entering Full Burst. Affects self.' header as Ghost Costume).",
      "targetSet": "self (targetMaxHpPct — '% of the target's OWN Max HP' wording 'Max HP ▲ 15.84%', not casterMaxHpPct phrasing).",
      "nearestWrongModel": "Silently dropping it as inert (no buffApply at all), or encoding as casterMaxHpPct — numerically identical for a self-grant but the wrong primitive, which diverges the day a consumer reads the distinction.",
      "distinguishingAssertion": "On each fullBurstStart, a buffApply with stat 'maxHpFlat' lands on belorta's own index (casterIdx === targetIdx === belorta) with value ≈ 0.1584 × her static maxHp; under the drop-misread no such event exists.",
      "inertness": "totals(res) for every unit must be IDENTICAL with this effect removed via withPatchedOverride — it is a pure bookkeeping buff; any damage delta means it leaked into an ATK conversion it shouldn't feed.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 44.88% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "Caster-scaled flat ATK grant (casterAtkPct), unscoped by attack type.",
      "durationSemantics": "10 wall-clock seconds.",
      "triggerIdentity": "fullBurstEnter — second '■ Activates when entering Full Burst' header; fires on EVERY team Full Burst regardless of whether belorta cast her own burst that rotation (contrast with her burst block below).",
      "targetSet": "adjacentAlly side:'right' — exactly the ONE unit in slot index belorta+1; nobody if she is rightmost; never self, never all allies.",
      "nearestWrongModel": "stat atkPct 44.88 (scales the TARGET's own ATK instead of granting 44.88% of BELORTA's ATK — wrong whenever the right ally's ATK ≠ hers, i.e. always for a supporter buffing a carry), or target 'allies' instead of the single right-neighbour slot.",
      "distinguishingAssertion": "On each fullBurstStart, exactly ONE buffApply with stat 'casterAtkPct' value ≈ 0.4488 × belorta.staticAtk (a FLAT ATK number, not 44.88), casterIdx = belorta, targetIdx = belorta+1; under atkPct-misread the stat key differs and the value is the raw 44.88; under allies-misread the event count per FB exceeds 1.",
      "inertness": "Units at index ≠ belorta+1 (including belorta herself) receive no skill1 casterAtkPct buffApply; with belorta placed in the rightmost slot the effect applies to nobody and moves zero damage.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Ghostly Prank: Damage Taken ▲ 10.56%",
      "disposition": "FAITHFUL",
      "scope": "Boss DEBUFF ('Affects the target' = the enemy her full-charge shot hits) — damageTakenPct benefits the WHOLE team's damage into the boss, not a self/ally buff (taxonomy rule 4).",
      "durationSemantics": "10 wall-clock seconds, refreshed per qualifying full-charge landing.",
      "triggerIdentity": "fullCharge trigger ('when landing a Full Charge attack') GATED on requiresSelfStatus:'Ghost Costume' — only live during the 10s post-FB-enter costume window. 'Landing' (vs 'performing') carries the usual landing-residue caveat; in-sim RL full charges land, so fullCharge is the faithful primitive.",
      "targetSet": "enemy (block authored target 'enemy'; harness emits the buffApply with casterIdx === null AND targetIdx === null — filter by stat+value).",
      "nearestWrongModel": "Dropping the Ghost Costume gate so the debuff fires on EVERY full charge all fight — massive over-credit, since ungated she fires full charges continuously (chargeFrames 60, ammo 6) but the costume is only ~10s per FB; second-nearest: encoding Damage Taken ▲ as a self or ally buff.",
      "distinguishingAssertion": "Filter buffApply events with stat 'damageTakenPct' value 10.56 (casterIdx null): every one occurs within 10s after a fullBurstStart, and NONE occur before the first fullBurstStart (she fires full charges pre-FB, so the ungated misread produces an event before the first FB — RED); team totals drop when the effect is removed (it is team-wide, GREEN that it's a boss debuff not a self stat).",
      "inertness": "Full-charge pulls OUTSIDE the costume window (between FBs, after the 10s lapse) must emit no damageTakenPct buffApply; belorta's own listed stats are unchanged by this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Sustained Damage ▲ 19.97% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "sustainedDamagePct buff — additive Damage-Up read only by sustained-FLAVORED damage on the holder; inert on a right-ally with no sustained-flavor hits, which is a comp-dependence the test fixture must handle (assert on buffApply, and/or choose assertions that don't require the carry to carry sustained damage).",
      "durationSemantics": "5 wall-clock seconds — note reloadFrames 141 ≈ 2.35s < 5s, so the buff persists across her reload and has near-continuous uptime while she keeps firing; that is kit-faithful, not a bug.",
      "triggerIdentity": "fullCharge trigger ('when performing a Full Charge attack') with NO status gate — this is a SEPARATE ■ header from Ghostly Prank; it fires on every full-charge pull all fight, in and out of the costume window. For an unswapped RL, fullCharge ≡ every trigger pull.",
      "targetSet": "adjacentAlly side:'right' (the double space in 'right  of this unit' is a prose typo, same target as the other right-ally lines).",
      "nearestWrongModel": "Inheriting the previous header's gate — requiresSelfStatus:'Ghost Costume' on this block too, so it only fires during FB windows (under-credits all out-of-FB uptime); second-nearest: target 'enemy' by contamination from the line above.",
      "distinguishingAssertion": "buffApply events with stat 'sustainedDamagePct' value 19.97 onto targetIdx = belorta+1 occur BEFORE the first fullBurstStart (her pre-FB full charges trigger it) — GREEN faithful, RED under the gate-contamination misread which produces none until the first FB.",
      "inertness": "No damageTakenPct and no enemy-targeted event from this block; belorta herself never holds the 19.97 buff.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 47.52% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "Caster-scaled flat ATK grant, unscoped by attack type.",
      "durationSemantics": "10 wall-clock seconds.",
      "triggerIdentity": "burstCast — this sits in her OWN burst block with no activation clause, so it fires only on rotations SHE casts Burst II (cd 40s means roughly every other FB rotation), never on FBs completed by a different B2. burstCast ≠ fullBurstEnter is THE divergence to pin.",
      "targetSet": "adjacentAlly side:'right'.",
      "nearestWrongModel": "fullBurstEnter keying — over-credits by firing on every team FB including rotations her 40s cd sat out; distinguishable in any comp with a second Burst-II-capable unit (the control fixture has crown at B2).",
      "distinguishingAssertion": "Count belorta's burstCast events and buffApply events with stat 'casterAtkPct' value ≈ 0.4752 × belorta.staticAtk: the counts match 1:1 and each buffApply frame coincides with HER burstCast, not with fullBurstStart events she didn't cast into — RED under fullBurstEnter whenever #fullBursts > #her-bursts. (Value 0.4752×staticAtk also distinguishes this from the skill1 0.4488×staticAtk grant on the same target.)",
      "inertness": "Full Bursts entered via another B2's cast produce NO 47.52-sourced buffApply; no unit other than slot belorta+1 ever receives it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Sustained Damage ▲ 27.23% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "sustainedDamagePct — same consumer caveat as the skill2 line; the 27.23 (burst) and 19.97 (skill2) instances are distinct keys that can co-stack on the right ally and must both be visible in the event log.",
      "durationSemantics": "10 wall-clock seconds.",
      "triggerIdentity": "burstCast (same own-burst block as the ATK line — both effects on one trigger).",
      "targetSet": "adjacentAlly side:'right'.",
      "nearestWrongModel": "fullBurstEnter keying (same over-credit as the ATK line), or merging with the skill2 19.97 into one value because both are 'Sustained Damage on the right ally'.",
      "distinguishingAssertion": "buffApply events with stat 'sustainedDamagePct' value 27.23 appear ONLY on her burstCast frames, 1:1 with her casts, onto targetIdx = belorta+1 — while value-19.97 events keep appearing on non-burst full-charge pulls, proving the two lines were NOT folded.",
      "inertness": "The 27.23 value never applies outside her own burst rotations; belorta never self-holds it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Ghost Costume selfStatus (gate for skill2 Ghostly Prank)",
    "skill1:Prank Preparation Max HP ▲ 15.84% self (inert bookkeeping, still asserted)",
    "skill1:ATK ▲ 44.88% casterAtkPct → right ally on fullBurstEnter",
    "skill2:Ghostly Prank Damage Taken ▲ 10.56% boss debuff, fullCharge + Ghost Costume gate",
    "skill2:Sustained Damage ▲ 19.97% → right ally on fullCharge, UNGATED",
    "burst:ATK ▲ 47.52% casterAtkPct → right ally on burstCast",
    "burst:Sustained Damage ▲ 27.23% → right ally on burstCast"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Ghost Costume: Prevents being targeted by single-target attacks for 10 sec.",
      "This effect is removed upon taking a direct hit."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in order of likelihood: (1) TRIGGER SPLIT — her two right-ally ATK grants look symmetric but are NOT: skill1's 44.88% keys to fullBurstEnter (any team FB) while the burst's 47.52% keys to burstCast (her own 40s-cd casts only); a driver that keys both the same way over- or under-credits every rotation she sits out, and the control fixture's crown-at-B2 makes the divergence live. (2) GATE CONTAMINATION in skill2 — the two ■ headers differ ('landing a Full Charge attack WHILE IN THE GHOST COSTUME STATE' vs plain 'performing a Full Charge attack'); only the Ghostly Prank boss debuff is costume-gated, the 19.97 sustained buff is not. (3) Ghostly Prank is a BOSS DEBUFF (damageTakenPct, team-wide benefit, buffApply with null caster/target indices), not a self buff. (4) The costume gate requires the driver to have modeled Ghost Costume as a selfStatus at all — dropping it as 'defensive flavor' silently zeroes the debuff; tests must assert the debuff fires, and ONLY inside 10s post-FB-enter windows. (5) 'Removed upon taking a direct hit' is inert in v1 (immortal boss, no incoming damage), so in-sim costume uptime is the full 10s — an optimism vs live play worth a note line, not a fudge. (6) adjacentAlly 'right' = slot index + 1, exactly one unit, nobody if she's rightmost — tests should pin targetIdx, and sustainedDamagePct assertions should be event-level (buffApply) since the buff is damage-inert unless the right ally deals sustained-flavored damage. (7) All seven magnitudes are literal kit text (DATAMINED); nothing here is MEASUREMENT-GATED and none of the ALWAYS-⚑ fields apply — her cadence comes from base stats (chargeFrames 60, ammo 6, reloadFrames 141) and no kit line needs an invented trigger. Verified: dispositions and assertions derived from prose + schema only; no driver artifacts were consulted.",
  "model": "claude-fable-5"
}
```

### 4b. Second S2b reviewer (claude-fable-5-1, blind — Tier-2 ×2 models)

```json
{
  "slug": "belorta-pumpkin-witch",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ entering Full Burst. Affects self / Ghost Costume",
      "disposition": "FAITHFUL",
      "scope": "Named self status window; the targeting-immunity payload is defensive and unmodeled, but the WINDOW is load-bearing because skill2's Ghostly Prank is gated on it.",
      "durationSemantics": "durationSec 10 from each FB entry; 'removed upon taking a direct hit' never fires in v1 (boss deals no damage), so the window always runs the full 10s — optimistic vs live play.",
      "triggerIdentity": "fullBurstEnter (any team Full Burst, NOT burstCast — she is B2 and may not be the caster). No gate.",
      "targetSet": "self (selfStatus keyed per (belorta, 'Ghost Costume')).",
      "nearestWrongModel": "Omitting the status entirely and gating skill2 on fbGate:'inFb' (byte-identical in a fixture with no FB extender), or keying it to burstCast so it opens only on rotations she bursts.",
      "distinguishingAssertion": "A selfStatus named 'Ghost Costume' opens on EVERY fullBurstStart event (including rotations where crown, not belorta, casts B2); skill2's damageTakenPct 10.56 buffApply events occur only at frames within [fbStart, fbStart+600f] of some fullBurstStart. Under burstCast-keying, a crown-cast rotation would show zero damageTakenPct applies — must be non-zero.",
      "inertness": "The status itself emits no stat buffApply and moves no unit's totals; removing it must change belorta's/allies' damage ONLY via the loss of the skill2 debuff.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Prank Preparation: Max HP ▲ 15.84% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Self Max HP % (targetMaxHpPct 15.84). Belorta has no atkOfMaxHpPct scaler, so offensively inert; keep as a stat per taxonomy #7.",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "fullBurstEnter, no gate.",
      "targetSet": "self.",
      "nearestWrongModel": "casterMaxHpPct or granting it to the right ally (copy of the neighbouring ■ block's target); or maxHpPct (the cube-style key).",
      "distinguishingAssertion": "Per fullBurstStart exactly one buffApply with stat 'maxHpFlat', casterIdx===targetIdx===belorta's index, value === 0.1584 × belorta.staticMaxHp, expiresFrame − applyFrame === 600. No maxHpFlat apply on any other targetIdx from belorta's skill1.",
      "inertness": "totals(res) for every slug identical with and without this effect (withPatchedOverride stripping it) — ally-granted/self Max HP feeds no ATK conversion in this comp.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ entering Full Burst. Affects ally to the right / ATK ▲ 44.88% of user's ATK",
      "disposition": "FAITHFUL",
      "scope": "Generic flat ATK add to ONE ally (casterAtkPct 44.88, resolved to a flat ATK number at apply time).",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "fullBurstEnter (fires on any team FB, including crown-cast rotations). No gate.",
      "targetSet": "adjacentAlly side:'right' — exactly slot idx+1; nobody if belorta is rightmost. Never self.",
      "nearestWrongModel": "target 'allies' (whole team) or alliesTopAtk count:1; or atkPct 44.88 (scales the ally's OWN ATK instead of a flat add of belorta's).",
      "distinguishingAssertion": "Per fullBurstStart exactly ONE buffApply with stat 'casterAtkPct' from belorta's skill1, targetIdx === belortaIdx+1, value === 0.4488 × belorta.staticAtk (a flat number, not 44.88). Zero such applies to any other targetIdx. With controlComp(belorta, false) (belorta rightmost) → zero casterAtkPct applies from skill1 and belorta's own totals unchanged.",
      "inertness": "Belorta's own damage must not move (self excluded); liter/crown totals unchanged.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ landing Full Charge while in Ghost Costume. Affects target / Damage Taken ▲ 10.56%",
      "disposition": "FAITHFUL",
      "scope": "Boss DEBUFF (damageTakenPct 10.56) — benefits the whole team's damage (taxonomy #4), not a self buff.",
      "durationSemantics": "durationSec 10, refreshed on every qualifying full charge; uptime ≈ (last in-window full charge + 10s), so it outlives the Ghost Costume window by up to ~10s.",
      "triggerIdentity": "fullCharge (every RL pull in-sim) + requiresSelfStatus:'Ghost Costume'. 'Landing' residue (RL flight time) is a per-unit caveat, not a different trigger.",
      "targetSet": "enemy (boss) — buffApply carries casterIdx===null && targetIdx===null; filter by stat+value.",
      "nearestWrongModel": "UNGATED fullCharge (debuff refreshed on every pull all fight → ~100% uptime); second-nearest: fbGate:'inFb' proxy (identical in this fixture, diverges under FB extension or if the status is stripped).",
      "distinguishingAssertion": "Zero damageTakenPct 10.56 buffApply events before the first fullBurstStart (belorta fires full charges from ~t=1s, well before the first FB). Every such apply's frame lies within [fbStart, fbStart+600f] of a fullBurstStart. Count per FB window ≈ belorta's shot events in that window (~6 + post-reload shots), NOT her total shot count. Removing the line lowers liter/crown/helm totals (team-wide), proving boss-debuff scope.",
      "inertness": "Must not emit any buffApply with a non-null targetIdx; must not alter belorta's shot cadence.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ performing Full Charge. Affects ally to the right / Sustained Damage ▲ 19.97% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "sustainedDamagePct — flavor-SCOPED Damage-Up term that only feeds the target's 'sustained'-flavored damage instances. NOT generic Damage Up.",
      "durationSemantics": "durationSec 5 (300f), refreshed every pull → near-continuous while she fires, lapses across her ~2.35s reload only if the gap exceeds 5s (it does not).",
      "triggerIdentity": "fullCharge, NO status gate (this ■ block has no 'while in Ghost Costume' clause — do not inherit the gate from the sibling block). No fbGate.",
      "targetSet": "adjacentAlly right (slot idx+1).",
      "nearestWrongModel": "attackDamagePct 19.97 (generic Damage Up → over-credits any neighbour); durationSec 10 (copied from the burst line); gating it on Ghost Costume like its sibling; trigger fullBurstEnter.",
      "distinguishingAssertion": "buffApply count with stat 'sustainedDamagePct' value 19.97 from belorta's skill2 === belorta's shot-event count (every pull, in and out of FB, from t≈1s), each with targetIdx === belortaIdx+1 and expiresFrame − applyFrame === 300. With helm as the right ally (no sustained-flavored damage) totals(res)['helm'] is bit-identical with the effect stripped via withPatchedOverride. Positive side: patch the right ally with a flavor:'sustained' flatDamage rider → that rider's damage-event mult rises by the additive Damage-Up contribution of 19.97 pts while other buckets are unchanged.",
      "inertness": "Helm's (non-sustained) damage and belorta's own damage must not move.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects ally to the right / ATK ▲ 47.52% of user's ATK for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Flat ATK add (casterAtkPct 47.52) to one ally; a DISTINCT buff key from skill1's 44.88 (different slot) so both stack when concurrent.",
      "durationSemantics": "durationSec 10 from the cast frame (cast precedes FB entry by the chain gap, so it lapses ~0.5s before FB end).",
      "triggerIdentity": "burstCast (belorta's OWN B2 cast, cd 40s) — NOT fullBurstEnter. Fires only on rotations she is the B2 caster.",
      "targetSet": "adjacentAlly right.",
      "nearestWrongModel": "fullBurstEnter (fires on every team FB even when crown casts B2 — over-credits in any comp with another B2); or merging with skill1's casterAtkPct so only one applies.",
      "distinguishingAssertion": "In controlComp (crown B2 at slot 1 ahead of belorta) belorta never casts → ZERO burst-slot buffApply events from her, while fullBurstStart events are non-zero. In a fixture where she is the sole/first B2, each of her burstCast events (spaced ≥40s) is followed on that frame by one buffApply stat 'casterAtkPct' value === 0.4752 × belorta.staticAtk, targetIdx === belortaIdx+1, duration 600f; and during the overlap with skill1's FB-enter buff the right ally carries BOTH flat adds (0.4488+0.4752)×staticAtk.",
      "inertness": "No apply on crown-cast rotations; no apply to self or to any non-adjacent ally.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Sustained Damage ▲ 27.23% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "sustainedDamagePct 27.23 — flavor-scoped, same bucket as skill2's 19.97 (additive with it in Damage Up, so a sustained neighbour sees 47.20 pts during overlap, diluted by other Damage-Up buffs).",
      "durationSemantics": "durationSec 10 from cast.",
      "triggerIdentity": "burstCast, no gate.",
      "targetSet": "adjacentAlly right.",
      "nearestWrongModel": "attackDamagePct (generic); fullBurstEnter trigger; target 'allies'.",
      "distinguishingAssertion": "Zero burst-slot sustainedDamagePct applies in controlComp (crown bursts); in a sole-B2 fixture one apply per belorta burstCast with value 27.23, targetIdx belortaIdx+1, 600f. Helm's totals unchanged when stripped (helm has no sustained flavor).",
      "inertness": "Helm/liter/crown/self damage unchanged in the default fixture.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ghost-costume-selfStatus",
    "skill1:prank-preparation-maxHp",
    "skill1:right-ally-casterAtk-44.88",
    "skill2:ghostly-prank-damageTaken-10.56",
    "skill2:right-ally-sustained-19.97",
    "burst:right-ally-casterAtk-47.52",
    "burst:right-ally-sustained-27.23"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Prevents being targeted by single-target attacks for 10 sec.",
      "This effect is removed upon taking a direct hit."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "1) FIXTURE HAZARD: belorta is Burst II with a 40s cd. controlComp puts crown (B2, slot 1) ahead of her, so she likely NEVER casts there — the burst slot's positive assertions need a fixture where she is the sole or first-eligible B2 (and expect casts spaced ≥40s, i.e. not every rotation). The default fixture is still the sharp NEGATIVE test: burstCast-keyed lines must emit nothing while fullBurstEnter-keyed skill1 lines fire every FB. 2) controlComp(belorta, true) gives helm at slot idx+1 — the right ally; with helm=false she is rightmost and every 'ally to the right' line must be inert (good target discriminator). 3) Expected shared-prior misread: skill2 Ghostly Prank gated with fbGate:'inFb' instead of selfStatus/requiresSelfStatus. Byte-identical in this fixture (no FB extender, no boss damage), so if the driver chose the proxy it must be documented in the note; the selfStatus primitive exists and is the faithful shape. 4) The 'removed upon direct hit' clause makes live uptime of the Damage Taken debuff SHORTER than modeled (⚑ measurement-gated; recipe: count Ghost Costume lapses in boss footage with AoE attacks). 5) Sustained Damage lines are flavor-scoped: do not accept attackDamagePct; with helm as neighbour they must be provably inert. 6) Only the skill2-a block carries the Ghost Costume gate; skill2-b (Sustained 19.97%) is ungated and fires every full charge all fight. 7) All magnitudes are literal kit text (DATAMINED); cadence (chargeFrames 60 / reloadFrames 141) is base-stat ⚑ but not a kit line.",
  "model": "claude-fable-5-1"
}
```

## 5. S5 BLIND TEST-WRITER (claude-opus-5, blind — written from the prose alone)

### 5a. blind spec

```json
{
  "slug": "belorta-pumpkin-witch",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Ghost Costume: untargetable 10 sec",
      "disposition": "FAITHFUL (state) + UNMODELED (payload)",
      "assertion": "The untargetable payload is unobservable (boss deals no damage) BUT the named state is load-bearing: skill2's debuff block gates on it. Proof is indirect and two-sided - deleting the selfStatus effect must take the Damage Taken debuff count to exactly 0, while deleting the gates must make it fire on every full charge. RED under the nearest-wrong models: an omitted state (base count would already equal the full-charge count) or an fbGate/requiresTargetStatus proxy (deleting the selfStatus would change nothing)."
    },
    {
      "slot": "skill1",
      "kitLine": "removed upon taking a direct hit",
      "disposition": "GAP (scope-trivial, over-credits)",
      "assertion": "it.skip. Nothing damages the team at scope, so the Ghost window never breaks early and Ghostly Prank uptime is an UPPER BOUND. Flagged rather than silently accepted."
    },
    {
      "slot": "skill1",
      "kitLine": "Prank Preparation: Max HP 15.84%",
      "disposition": "FAITHFUL (offensively inert)",
      "assertion": "One self grant per fullBurstStart, emitted FLAT under stat maxHpFlat (value > 100, not the raw 15.84), targetSlug === the owner, and sharing an expiresFrame with the co-frame ally ATK grant (10s == 10s, frame-rate free). Fails if authored as a raw percentage stat, at a 5s/15s duration, keyed to a different trigger, or targeted at anyone else. Separately: removing it must leave ALL totals byte-identical - RED would mean the grant leaked into an ATK path (she carries no atkOfMaxHpPct, and ally-granted Max HP feeds nothing)."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK 44.88% of user ATK, right ally",
      "disposition": "FAITHFUL",
      "assertion": "Trigger: apply count === fullBurstStart count (any team Full Burst). Re-keyed to burstCast it can only drop in count or land strictly earlier than the window it opens - a burst-cast-keyed model is therefore RED either way, which matters because she is a contested Burst II. Target: the slug set is exactly size 1, excludes the owner and both left-hand allies, and is the right-hand neighbour; patched to `allies` the set widens and includes the owner. Magnitude: flat (not 44.88), and ratio-pinned against the burst line at 47.52/44.88. Inertness: removing it drops only the right ally; owner and both left allies byte-identical."
    },
    {
      "slot": "skill2",
      "kitLine": "Ghostly Prank: Dmg Taken 10.56%",
      "disposition": "FAITHFUL",
      "assertion": "Boss-held debuff (casterIdx === null AND targetIdx === null), value 10.56. Non-vacuity is two-sided: applies > 0 (gate active) AND strictly fewer than the ungated ally-sustained applies on the same trigger (gate inactive on out-of-window pulls). Gate-removed counterfactual makes the count equal the sustained count WITHIN THE SAME RUN - a comparison immune to how the engine emits refreshes. Team-wide effect proven at totals level: removing it drops the left allies and the right ally too, so it cannot have been modeled as a self buff (taxonomy #4)."
    },
    {
      "slot": "skill2",
      "kitLine": "Sustained Damage 19.97% for 5 sec",
      "disposition": "FAITHFUL",
      "assertion": "Event-level, because the right-hand ally may have no sustained-flavored damage to move. Trigger: count > 2x the Full Burst count (per-pull, not per-FB); re-keyed to fullBurstEnter the count collapses to exactly the Full Burst count. Scope: it fires on pulls the Ghost-gated debuff does not, proving the Ghost gate did not leak onto this second line. Target set exactly the right-hand neighbour. Duration: an INERT 10s partsDamagePct buff is co-applied by the same block, so the pairwise expiresFrame DIFFERENCE must be 300 frames - and the probe is verified damage-neutral (totals byte-identical to base)."
    },
    {
      "slot": "burst",
      "kitLine": "ATK 47.52% of user ATK, right ally",
      "disposition": "FAITHFUL (fixture-gated)",
      "assertion": "Fires on her own burst cast, target the right-hand neighbour, flat caster-scaled value ratio-pinned at 47.52/44.88 against the skill1 line (exact, ATK-sheet free - fails if the two magnitudes were swapped or if the line were authored as a plain atkPct). Removing the burst blocks drops only the right ally. Preceded by an explicit non-vacuity test: she is Burst II in a comp whose fixed B2 is also Burst II."
    },
    {
      "slot": "burst",
      "kitLine": "Sustained Damage 27.23% for 10 sec",
      "disposition": "FAITHFUL",
      "assertion": "Raw percentage 27.23 (plain stat, not flat-resolved), same count and same target as the burst ATK line, and identical expiresFrame to it - both are 10s on the same cast frame, so a 5s authoring on either is RED, frame-rate free. The clean 19.97/27.23 partition of all owner sustained applies additionally proves the skill2 and burst magnitudes did not drift into each other."
    },
    {
      "slot": "fixture",
      "kitLine": "(fixture, not a kit line)",
      "disposition": "MEASUREMENT-GATED",
      "assertion": "controlComp(slug, true) puts her at slot 2 with the fixed B3 to her right, which is mandatory - with the B3 slot empty she is rightmost and all five adjacentAlly{right} lines target nobody, making the file vacuous. The residual risk (contested Burst Stage 2 against the fixed B2) is asserted, not assumed, and a burstFirst probe localizes a RED to the fixture rather than the override."
    }
  ],
  "fixtures": "Single fixture, controlComp('belorta-pumpkin-witch', true) - liter(0)/crown(1)/owner(2)/helm(3), boss Fire, deterministic, 12 hoisted runs (1 base + 11 counterfactuals). The fixed B3 slot is kept ON for two independent reasons: (a) a Full Burst needs the B1+B2+B3 chain at all, and (b) only with that slot filled does the owner at index 2 HAVE a right-hand neighbour - five of her six kit lines target `the ally to the right`, so with the slot empty they would all target nobody and every assertion would pass vacuously. Owner index is DERIVED from her self Max HP grant (the only buff with casterIdx === targetIdx on her slug) instead of hardcoded. Known residual fixture risk, asserted explicitly rather than assumed: she is Burst II and so is the fixed B2, so Burst Stage 2 is contested and she may never cast - a RED on the burst non-vacuity test is a fixture finding, and the burstFirst probe run distinguishes that from an override defect.",
  "gaps": [
    "it.skip - Ghost Costume untargetable payload: the v1 boss deals no damage, so single-target immunity has no observable consequence. Only the named STATE is modeled, because skill2's debuff gates on it.",
    "it.skip - 'removed upon taking a direct hit': nothing damages the team at scope, so the 10 sec Ghost window never breaks early. Ghostly Prank uptime in-sim is an UPPER BOUND vs live play (over-credit flag for the driver).",
    "it.skip - targetMaxHpPct vs casterMaxHpPct is unobservable for a self-only Max HP line (caster === target; both re-emit the same maxHpFlat). The plain 'Max HP 15.84%' wording matches the target-own-Max-HP family, but this fixture cannot discriminate.",
    "it.skip - 'LANDING a Full Charge attack' vs 'performing' one: the engine fires fullCharge at RELEASE, so RL projectile flight time before the Ghost-gated debuff applies is unmodeled (debuff lands a few frames early, and a shot that would miss still procs).",
    "Not asserted (outside the kit text): burst cooldown 40s, burst-gauge contribution, and the datamine-unreliable cadence tuple (reloadFrames 141 / chargeFrames 60) - the file never pins an absolute apply frame, and the single frame-rate assumption (FPS 60) is used only on a difference between two buffs applied on the same frame."
  ],
  "model": "claude-opus-5"
}
```

### 5b. blind test source (VERBATIM — mechanical defects preserved; see section 8 for the run against the driver's override)

```ts
/**
 * belorta-pumpkin-witch - RL/Water/Supporter/Burst II (cd 40s, ammo 6, chargeFrames 60).
 * A PURE buffer: every kit line is a buff / enemy debuff / self state. No damage effect anywhere,
 * so almost every claim here is STRUCTURAL and is read off the event log, not off totals.
 *
 * WHAT THE KIT SAYS (short quotes only)
 *   skill1 [header] on entering Full Burst, affects self:
 *      - Ghost Costume: untargetable 10 sec, plus 'removed upon taking a direct hit'
 *      - Prank Preparation: 'Max HP 15.84% for 10 sec'
 *   skill1 [header] on entering Full Burst, affects the ally to the RIGHT:
 *      - 'ATK 44.88% of the skill user ATK' for 10 sec
 *   skill2 [header] on a Full Charge attack WHILE in the Ghost Costume state, affects the target:
 *      - Ghostly Prank: 'Damage Taken 10.56% for 10 sec'
 *   skill2 [header] on a Full Charge attack, affects the ally to the RIGHT:
 *      - 'Sustained Damage 19.97% for 5 sec'
 *   burst [header] affects the ally to the RIGHT:
 *      - 'ATK 47.52% of the skill user ATK' for 10 sec
 *      - 'Sustained Damage 27.23% for 10 sec'
 *
 * FIXTURE - controlComp(SLUG, true): liter(0) / crown(1) / owner(2) / helm(3), boss Fire.
 *   The fixed B3 slot is REQUIRED here for two independent reasons:
 *     (a) a burst chain needs B1+B2+B3 for any Full Burst to happen at all, and
 *     (b) at slot 2 the owner HAS a right-hand neighbour (the fixed B3). With that slot empty she
 *         is the rightmost unit, every adjacentAlly{side:'right'} block targets NOBODY, and five
 *         of the six kit lines become vacuously inert - the fixture would test nothing.
 *   FLAG - FIXTURE RISK, tested rather than assumed: the owner is Burst II and so is the fixed B2,
 *   so Burst Stage 2 is CONTESTED. If the engine awards stage 2 to the other B2 by slot order, the
 *   owner never casts and her burst slot is unobservable in this comp. The non-vacuity test in the
 *   burst group asserts that explicitly: a RED there is a FIXTURE finding (re-fixture with an
 *   uncontested stage 2), NOT an override defect, and the burstFirst probe test localizes it.
 *
 * WHY EACH ASSERTION DISCRIMINATES (nearest-wrong model built with withPatchedOverride)
 *   trigger identity - skill1 keys on 'entering Full Burst' = fullBurstEnter (ANY team Full Burst),
 *                      not burstCast: base apply-count === fullBurstStart count. Re-keyed to
 *                      burstCast the grant either disappears (she loses the contested stage) or
 *                      lands STRICTLY EARLIER, because a cast precedes the window it opens.
 *   target set       - adjacentAlly right, not allies/self: the target-slug SET is exactly one slug,
 *                      is not the owner and not either left-hand ally. Patched to allies the set
 *                      blows up and includes the owner.
 *   duration         - same-frame buff pairs must share expiresFrame (10s == 10s, frame-rate free).
 *                      The lone 5s line is read against an INERT 10s buff co-applied on the SAME
 *                      full-charge frame, so only the 300-frame DIFFERENCE is ever asserted.
 *   the Ghost state  - Ghostly Prank is gated on being in the Ghost Costume state, so it must fire
 *                      on only SOME full-charge pulls (both the active and the inactive case are
 *                      therefore exercised: strictly fewer debuff applies than ally-sustained
 *                      applies). Deleting the selfStatus effect must silence it ENTIRELY; deleting
 *                      the gates must make it fire on EVERY pull. An fbGate proxy, or an ungated
 *                      block, fails exactly one of those two.
 *   enemy vs self    - Damage Taken is a BOSS debuff that lifts the WHOLE team (taxonomy #4):
 *                      removing it must drop teammates' totals, not just the owner's.
 *   inertness        - the self Max HP grant has no consumer in this kit (she carries no
 *                      atkOfMaxHpPct), so removing it must leave ALL totals byte-identical;
 *                      removing an ally-right grant must move ONLY that one ally.
 *
 * CASTER-SCALED MAGNITUDES: casterAtkPct re-emits FLAT ((kit%/100) x caster.staticAtk), so the two
 * ATK lines are pinned by their RATIO 47.52/44.88 - exact, and independent of her ATK sheet.
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

const SLUG = 'belorta-pumpkin-witch';
// control fixture slot order: liter(0) / crown(1) / carry(2) / helm(3)
const RIGHT = 'helm';
const LEFTS = ['liter', 'crown'];
// Engine frame rate. Used ONLY on a difference between two buffs applied on the same frame, so an
// absolute-timing mistake cannot smear into any assertion below.
const FPS = 60;

type Ev = any;
type Run = { res: ReturnType<typeof runComp>; evs: SimEvent[] };

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) < tol;
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((acc, v) => acc + v, 0);

function runWith(patched?: unknown): Run {
  const opts = controlComp(SLUG, true) as any;
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  const evs: SimEvent[] = [];
  opts.onEvent = (ev: SimEvent) => {
    evs.push(ev);
  };
  return { res: runComp(opts), evs };
}

function of(r: Run, kind: string): Ev[] {
  return (r.evs as Ev[]).filter((e) => e.kind === kind);
}

/**
 * A slot of the committed override is a Block[]; a { blocks: Block[] } wrapper is accepted too.
 * Anything else THROWS - a shape drift must be a loud failure, never a patch that silently mutates
 * nothing (which would make every counterfactual below green by accident).
 */
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): Ev[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  throw new Error(
    `[${SLUG}] override slot ${slot} is neither Block[] nor { blocks: Block[] }`
  );
}

function carries(b: Ev, stat: string): boolean {
  return (b.effects ?? []).some(
    (e: Ev) => e.kind === 'buff' && e.stat === stat
  );
}

function dropEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (e: Ev) => boolean
): number {
  let n = 0;
  for (const b of blocksOf(ov, slot)) {
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e: Ev) => !pred(e));
    n += before - b.effects.length;
  }
  return n;
}

// ---------------------------------------------------------------------------
// counterfactual overrides (in-memory clones; committed JSON untouched). Each patch records how
// many edits it actually made, and every test asserts that count > 0 first - a no-op patch would
// otherwise prove nothing.
// ---------------------------------------------------------------------------
let nS1Atk = 0;
const pNoS1Atk = withPatchedOverride(SLUG, (ov: any) => {
  nS1Atk = dropEffects(
    ov,
    'skill1',
    (e) => e.kind === 'buff' && e.stat === 'casterAtkPct'
  );
});

let nSelfHp = 0;
const pNoSelfHp = withPatchedOverride(SLUG, (ov: any) => {
  nSelfHp = dropEffects(
    ov,
    'skill1',
    (e) => e.kind === 'buff' && /maxhp/i.test(String(e.stat))
  );
});

let nReKey = 0;
const pS1OnBurstCast = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) {
    if (b.trigger?.kind === 'fullBurstEnter') {
      b.trigger = { kind: 'burstCast' };
      nReKey++;
    }
  }
});

let nWiden = 0;
const pS1AtkToAllies = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) {
    if (carries(b, 'casterAtkPct')) {
      b.target = { kind: 'allies' };
      nWiden++;
    }
  }
});

let nGates = 0;
const pNoGhostGate = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (!carries(b, 'damageTakenPct')) continue;
    for (const g of [
      'requiresSelfStatus',
      'requiresTargetStatus',
      'fbGate',
      'requiresCore',
    ]) {
      if (b[g] !== undefined) {
        delete b[g];
        nGates++;
      }
    }
  }
});

let nStatus = 0;
const pNoGhostStatus = withPatchedOverride(SLUG, (ov: any) => {
  nStatus = dropEffects(ov, 'skill1', (e) => e.kind === 'selfStatus');
});

let nDT = 0;
const pNoDamageTaken = withPatchedOverride(SLUG, (ov: any) => {
  nDT = dropEffects(
    ov,
    'skill2',
    (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'
  );
});

let nSustReKey = 0;
const pSustOnFbEnter = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (carries(b, 'sustainedDamagePct')) {
      b.trigger = { kind: 'fullBurstEnter' };
      nSustReKey++;
    }
  }
});

// A 10s buff on a stat that is parsed-but-inert at scope (no parts on the boss), co-applied by the
// SAME block as the 5s sustained line, so the two share an apply frame and their expiresFrame
// difference IS the 5s window - with no need for an absolute apply frame.
let nCoapply = 0;
const pCoapply10s = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (!carries(b, 'sustainedDamagePct')) continue;
    b.effects.push({
      kind: 'buff',
      stat: 'partsDamagePct',
      value: 1,
      durationSec: 10,
    });
    nCoapply++;
  }
});

let nBurstBlocks = 0;
const pNoBurst = withPatchedOverride(SLUG, (ov: any) => {
  const arr = blocksOf(ov, 'burst');
  nBurstBlocks = arr.length;
  arr.splice(0, arr.length);
});

// Fixture probe only: lets the owner take the first eligible burst of her stage regardless of slot
// order, so her burst slot is observable even if the other Burst II unit otherwise wins stage 2.
const pBurstFirst = withPatchedOverride(SLUG, (ov: any) => {
  blocksOf(ov, 'skill1').push({
    slot: 'skill1',
    trigger: { kind: 'battleStart' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstFirst' }],
  });
});

// --------------------------- hoisted runs (12 x 180s) ----------------------
const base = runWith();
const rNoS1Atk = runWith(pNoS1Atk);
const rNoSelfHp = runWith(pNoSelfHp);
const rS1OnBurstCast = runWith(pS1OnBurstCast);
const rS1AtkToAllies = runWith(pS1AtkToAllies);
const rNoGhostGate = runWith(pNoGhostGate);
const rNoGhostStatus = runWith(pNoGhostStatus);
const rNoDamageTaken = runWith(pNoDamageTaken);
const rSustOnFbEnter = runWith(pSustOnFbEnter);
const rCoapply10s = runWith(pCoapply10s);
const rNoBurst = runWith(pNoBurst);
const rBurstFirst = runWith(pBurstFirst);

const fbStarts = of(base, 'fullBurstStart').length;

// The owner index is DERIVED, not hardcoded: her own Max HP line is a self-grant, the only buff in
// this comp with casterIdx === targetIdx on her slug. -1 if absent, reported by the sanity test
// rather than thrown at module scope (a throw there would fail every test and localize nothing).
const OWNER_IDX: number = (() => {
  const self = of(base, 'buffApply').filter(
    (b) =>
      b.targetSlug === SLUG &&
      b.casterIdx !== null &&
      b.casterIdx === b.targetIdx &&
      /maxhp/i.test(String(b.stat))
  );
  return self.length ? (self[0].casterIdx as number) : -1;
})();

function ownerBuffs(r: Run, stat: string): Ev[] {
  return of(r, 'buffApply').filter(
    (b) => b.casterIdx === OWNER_IDX && b.stat === stat
  );
}

function selfHp(r: Run): Ev[] {
  return of(r, 'buffApply').filter(
    (b) =>
      b.targetSlug === SLUG &&
      b.casterIdx === OWNER_IDX &&
      /maxhp/i.test(String(b.stat))
  );
}

// A boss-held debuff emits casterIdx === null AND targetIdx === null, so it is filtered by stat and
// then its VALUE is asserted (a value-filter would hide a magnitude error instead of failing on it).
function bossDT(r: Run): Ev[] {
  return of(r, 'buffApply').filter(
    (b) =>
      b.stat === 'damageTakenPct' &&
      b.casterIdx === null &&
      b.targetIdx === null
  );
}

// Her two caster-scaled ATK lines resolve to two distinct FLAT magnitudes; split them by value.
const atkAll = ownerBuffs(base, 'casterAtkPct');
const atkVals = [...new Set(atkAll.map((b) => b.value as number))].sort(
  (a, b) => a - b
);
const S1_ATK_V = atkVals[0];
const BURST_ATK_V = atkVals[atkVals.length - 1];
const s1Atk = atkAll.filter((b) => near(b.value, S1_ATK_V));
const burstAtk =
  atkVals.length > 1 ? atkAll.filter((b) => near(b.value, BURST_ATK_V)) : [];

// Sustained Damage is a plain percentage stat, so the raw kit magnitudes survive to the event.
const sustAll = ownerBuffs(base, 'sustainedDamagePct');
const sust5 = sustAll.filter((b) => near(b.value, 19.97));
const sust10 = sustAll.filter((b) => near(b.value, 27.23));

describe('belorta-pumpkin-witch - fixture sanity', () => {
  it('resolves the owner index, a right-hand neighbour that deals damage, and real Full Bursts', () => {
    expect(OWNER_IDX).toBeGreaterThanOrEqual(0);
    expect(fbStarts).toBeGreaterThan(0);
    // both are preconditions for the totals-level inertness tests below to mean anything
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(unitOf(base.res, RIGHT).totalDamage).toBeGreaterThan(0);
  });
});

describe('belorta-pumpkin-witch - skill1 (Full Burst entry: self state + self Max HP + ally ATK)', () => {
  it('Prank Preparation: one flat-resolved self Max HP grant per Full Burst entry, 10 sec', () => {
    expect(nSelfHp).toBeGreaterThan(0);
    const hp = selfHp(base);
    expect(hp.length).toBe(fbStarts);
    for (const b of hp) {
      // caster/targetMaxHpPct re-emit as FLAT HP; asserting the raw 15.84 here would be the
      // classic percentage-vs-flat blind error
      expect(b.stat).toBe('maxHpFlat');
      expect(b.value).toBeGreaterThan(100);
      expect(b.targetSlug).toBe(SLUG);
    }
    // 10s == 10s, frame-rate free: the self grant and the ally ATK grant ride the SAME
    // fullBurstEnter frame, so equal durations imply identical expiresFrame. RED if either line
    // were authored at 5s/15s, or if one were keyed to a different trigger.
    expect(s1Atk.length).toBe(hp.length);
    for (let i = 0; i < hp.length; i++) {
      expect(hp[i].expiresFrame).toBe(s1Atk[i].expiresFrame);
    }
  });

  it('the self Max HP grant moves no damage at scope - it is kept for a future HP scaler', () => {
    expect(nSelfHp).toBeGreaterThan(0);
    // she carries no atkOfMaxHpPct and ally-granted Max HP feeds nobody, so this must be a strict
    // no-op on every unit. RED would mean the grant leaked into an ATK path it should not feed.
    expect(totals(rNoSelfHp.res)).toEqual(totals(base.res));
  });

  it('skill1 ATK 44.88% of caster ATK lands on exactly ONE ally - the right-hand neighbour', () => {
    expect(s1Atk.length).toBeGreaterThan(0);
    const set = new Set(s1Atk.map((b) => b.targetSlug));
    expect(set.size).toBe(1);
    expect(set.has(SLUG)).toBe(false);
    for (const l of LEFTS) expect(set.has(l)).toBe(false);
    expect([...set][0]).toBe(RIGHT);
    for (const b of s1Atk) {
      expect(b.value).toBeGreaterThan(100);
      expect(near(b.value, 44.88)).toBe(false);
    }
    // nearest-wrong target set: allies. Under it the set is wider AND includes the owner.
    expect(nWiden).toBeGreaterThan(0);
    const wide = ownerBuffs(rS1AtkToAllies, 'casterAtkPct').filter((b) =>
      near(b.value, S1_ATK_V)
    );
    const wideSet = new Set(wide.map((b) => b.targetSlug));
    expect(wideSet.size).toBeGreaterThan(1);
    expect(wideSet.has(SLUG)).toBe(true);
  });

  it('skill1 fires on ANY team Full Burst entry, not on a burst cast by the owner', () => {
    expect(s1Atk.length).toBe(fbStarts);
    expect(nReKey).toBeGreaterThan(0);
    const re = ownerBuffs(rS1OnBurstCast, 'casterAtkPct').filter((b) =>
      near(b.value, S1_ATK_V)
    );
    // burst-cast keying can only ever fire on rotations this unit casts, and it fires BEFORE the
    // window it opens - so either the count drops or the first grant lands strictly earlier.
    expect(re.length).toBeLessThanOrEqual(s1Atk.length);
    if (re.length > 0) {
      expect(re[0].expiresFrame).toBeLessThan(s1Atk[0].expiresFrame);
    }
  });

  it('skill1 ally ATK moves ONLY the right-hand ally (teammates byte-identical)', () => {
    expect(nS1Atk).toBeGreaterThan(0);
    const b = totals(base.res);
    const p = totals(rNoS1Atk.res);
    expect(p[RIGHT]).toBeLessThan(b[RIGHT]);
    expect(p[SLUG]).toBe(b[SLUG]);
    for (const l of LEFTS) expect(p[l]).toBe(b[l]);
  });
});

describe('belorta-pumpkin-witch - skill2 (full charge: Ghost-gated boss debuff + ally sustained)', () => {
  it('Ghostly Prank Damage Taken is GATED on the Ghost Costume state', () => {
    const dt = bossDT(base);
    expect(dt.length).toBeGreaterThan(0); // the ACTIVE case is exercised
    for (const b of dt) expect(b.value).toBeCloseTo(10.56, 2);
    // ...and so is the INACTIVE case: the ungated ally-sustained line rides the same full-charge
    // trigger, so strictly more applies there means some pulls happened outside the Ghost window.
    expect(sust5.length).toBeGreaterThan(0);
    expect(dt.length).toBeLessThan(sust5.length);
    // the STATE is load-bearing: delete the selfStatus and the debuff must vanish entirely.
    // An fbGate/requiresTargetStatus proxy, or no gate at all, fails this.
    expect(nStatus).toBeGreaterThan(0);
    expect(bossDT(rNoGhostStatus).length).toBe(0);
    // and with every gate stripped it must fire on EVERY full charge - i.e. exactly as often as
    // the ungated sustained line WITHIN THAT SAME RUN (same trigger, same refresh semantics, so
    // the comparison is immune to how the engine emits refreshes)
    expect(nGates).toBeGreaterThan(0);
    const ungated = bossDT(rNoGhostGate).length;
    const ungatedSust = ownerBuffs(rNoGhostGate, 'sustainedDamagePct').filter(
      (b) => near(b.value, 19.97)
    ).length;
    expect(ungated).toBe(ungatedSust);
    expect(ungated).toBeGreaterThan(dt.length);
  });

  it('Damage Taken is an ENEMY debuff - removing it drops the WHOLE team, not just the owner', () => {
    expect(nDT).toBeGreaterThan(0);
    const b = totals(base.res);
    const p = totals(rNoDamageTaken.res);
    expect(sum(p)).toBeLessThan(sum(b));
    expect(p[RIGHT]).toBeLessThan(b[RIGHT]);
    expect(p[SLUG]).toBeLessThan(b[SLUG]);
    // nearest-wrong: modeled as a self buff (or on an ally target), which would leave every
    // teammate untouched
    for (const l of LEFTS) if (b[l] > 0) expect(p[l]).toBeLessThan(b[l]);
  });

  it('skill2 Sustained 19.97% - right ally, every full charge, NOT Ghost-gated', () => {
    // a clean partition proves neither magnitude drifted into the other
    expect(sust5.length + sust10.length).toBe(sustAll.length);
    expect(new Set(sust5.map((b) => b.targetSlug))).toEqual(new Set([RIGHT]));
    // per-pull cadence, not per-Full-Burst: far more applies than there are Full Bursts
    expect(sust5.length).toBeGreaterThan(fbStarts * 2);
    // it fires on pulls the Ghost-gated debuff does NOT - the gate did not leak onto this line
    expect(sust5.length).toBeGreaterThan(bossDT(base).length);
    // nearest-wrong trigger: fullBurstEnter collapses the count to one per Full Burst
    expect(nSustReKey).toBeGreaterThan(0);
    const fb = ownerBuffs(rSustOnFbEnter, 'sustainedDamagePct').filter((b) =>
      near(b.value, 19.97)
    );
    expect(fb.length).toBe(fbStarts);
    expect(sust5.length).toBeGreaterThan(fb.length);
  });

  it('skill2 Sustained window is 5 sec - half of every 10 sec line in the kit', () => {
    // exactly one skill2 block carries the line (RED here would mean it was split across blocks)
    expect(nCoapply).toBe(1);
    const five = ownerBuffs(rCoapply10s, 'sustainedDamagePct').filter((b) =>
      near(b.value, 19.97)
    );
    const ten = ownerBuffs(rCoapply10s, 'partsDamagePct');
    expect(five.length).toBeGreaterThan(0);
    expect(ten.length).toBe(five.length);
    for (let i = 0; i < five.length; i++) {
      // same block, same apply frame: only the DIFFERENCE is asserted, so no absolute apply frame
      // and no absolute-timing assumption is needed. 10s - 5s = 300 frames.
      expect(ten[i].expiresFrame - five[i].expiresFrame).toBeCloseTo(
        5 * FPS,
        0
      );
    }
    // and the probe buff is itself damage-inert, so the duration reading perturbs nothing
    expect(totals(rCoapply10s.res)).toEqual(totals(base.res));
  });
});

describe('belorta-pumpkin-witch - burst (ally to the right: ATK + Sustained, both 10 sec)', () => {
  it('NON-VACUITY: the owner actually wins Burst Stage 2 in the control fixture', () => {
    // RED HERE IS A FIXTURE FINDING, NOT AN OVERRIDE DEFECT: she is Burst II and so is the fixed
    // B2 in controlComp, so stage 2 is contested. If she never casts, her burst slot is simply
    // unobservable in this comp and the orchestrator must re-fixture with an uncontested stage 2;
    // the burstFirst probe below says whether the burst BLOCKS themselves are correct.
    expect(atkVals.length).toBe(2); // the 44.88% and 47.52% flat magnitudes both present
    expect(burstAtk.length).toBeGreaterThan(0);
    expect(sust10.length).toBeGreaterThan(0);
  });

  it('burst grants ATK 47.52% of caster ATK and Sustained 27.23% to the right ally for 10 sec', () => {
    expect(new Set(burstAtk.map((b) => b.targetSlug))).toEqual(
      new Set([RIGHT])
    );
    expect(new Set(sust10.map((b) => b.targetSlug))).toEqual(new Set([RIGHT]));
    expect(sust10.length).toBe(burstAtk.length);
    for (const b of sust10) expect(b.value).toBeCloseTo(27.23, 2);
    // magnitude pin for the caster-scaled pair with no knowledge of her ATK sheet: casterAtkPct
    // resolves against STATIC ATK, so the ratio of the two flat values is exactly 47.52/44.88.
    // RED if either line were authored at the other line magnitude, or as a plain atkPct.
    expect(BURST_ATK_V / S1_ATK_V).toBeCloseTo(47.52 / 44.88, 4);
    // both lines are 10 sec and ride the SAME cast frame -> identical expiresFrame (frame-rate free)
    for (let i = 0; i < burstAtk.length; i++) {
      expect(sust10[i].expiresFrame).toBe(burstAtk[i].expiresFrame);
    }
  });

  it('burst grants move ONLY the right-hand ally (teammates byte-identical)', () => {
    expect(nBurstBlocks).toBeGreaterThan(0);
    const b = totals(base.res);
    const p = totals(rNoBurst.res);
    expect(p[RIGHT]).toBeLessThan(b[RIGHT]);
    expect(p[SLUG]).toBe(b[SLUG]);
    for (const l of LEFTS) expect(p[l]).toBe(b[l]);
    expect(
      ownerBuffs(rNoBurst, 'casterAtkPct').filter(
        (x) => !near(x.value, S1_ATK_V)
      ).length
    ).toBe(0);
  });

  it('FIXTURE PROBE: forcing the owner to take stage 2 first leaves the grant SHAPE unchanged', () => {
    const atk = ownerBuffs(rBurstFirst, 'casterAtkPct').filter(
      (b) => !near(b.value, S1_ATK_V)
    );
    const sus = ownerBuffs(rBurstFirst, 'sustainedDamagePct').filter((b) =>
      near(b.value, 27.23)
    );
    expect(atk.length).toBeGreaterThanOrEqual(burstAtk.length);
    expect(sus.length).toBe(atk.length);
    if (atk.length > 0) {
      expect(new Set(atk.map((b) => b.targetSlug))).toEqual(new Set([RIGHT]));
    }
  });
});

describe('belorta-pumpkin-witch - GAPS (unobservable at this scope)', () => {
  it.skip('GAP: Ghost Costume untargetable payload - the v1 boss deals no damage, so single-target immunity has no observable consequence. Only the STATE is modeled, because skill2 gates on it.', () => {});

  it.skip('GAP: removed upon taking a direct hit - nothing damages the team at scope, so the 10 sec Ghost window NEVER breaks early. Ghostly Prank uptime is therefore an UPPER BOUND (flag for the driver).', () => {});

  it.skip('GAP: targetMaxHpPct vs casterMaxHpPct is unobservable for a self-only Max HP line (caster === target, both re-emit the same maxHpFlat). The Max HP 15.84% wording matches the target-own-Max-HP family.', () => {});

  it.skip('GAP: LANDING a Full Charge attack vs PERFORMING one - the engine fires fullCharge at RELEASE, so the RL projectile flight time before the Ghost-gated debuff applies is unmodeled (a few frames early, and a missed shot would still proc).', () => {});
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "belorta-pumpkin-witch",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "selfStatus",
          "name": "Ghost Costume",
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 15.84,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "adjacentAlly",
        "side": "right"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 44.88,
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
        "kind": "enemy"
      },
      "requiresSelfStatus": "Ghost Costume",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 10.56,
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
        "kind": "adjacentAlly",
        "side": "right"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "sustainedDamagePct",
          "value": 19.97,
          "durationSec": 5
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
        "kind": "adjacentAlly",
        "side": "right"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 47.52,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "sustainedDamagePct",
          "value": 27.23,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ CADENCE: chargeFrames 60 / reloadFrames 141 / ammo 6 are datamine fields taken as-is. Her whole skill2 output (boss Damage Taken ▲ + the right-hand ally's Sustained Damage ▲) is per-full-charge, so proc count and uptime scale directly with this unmeasured tuple.",
    "⚑ GHOST COSTUME UPTIME: the status is modeled as a full 10 sec window per Full Burst entry. The kit's 'removed upon taking a direct hit' early-removal is unmodeled (the v1 boss deals no damage), so skill2's status gate passes for the whole window — an OPTIMISTIC assumption; real uptime in a fight that targets her is shorter and would cut Ghostly Prank procs.",
    "⚑ 'LANDING' vs 'PERFORMING': skill2's Damage Taken line says 'landing a Full Charge attack'; the fullCharge trigger fires at release. For an unswapped RL with 100% landing this is treated as equivalent, but projectile flight time / a miss would delay or drop the debuff application.",
    "TARGET SET: both ally blocks use adjacentAlly side 'right' per the literal kit text. If she occupies the rightmost slot, every ally block applies to NOBODY and her only live effect is the boss Damage Taken ▲ — her value is slot-position-dependent by design, not a modeling choice.",
    "Prank Preparation (self Max HP ▲ 15.84%) is offensively INERT here: the kit carries no HP→ATK scaler, and a self Max HP grant only feeds the holder's own atkOfMaxHpPct. Kept per the never-skip-HP-lines rule as a future consumer/scaler feed.",
    "No function-damage effects exist anywhere in this kit (no flatDamage / dot / storedHit / hitRepeat), so per-kit noFb, noRange and core-eligibility are NOT APPLICABLE and are deliberately unset rather than flagged.",
    "Burst trigger is burstCast (a burst-slot block with no activation clause), so the two 10 sec ally buffs are applied PRE-Full-Burst at cast and cover the subsequent FB window by duration, not by FB-enter keying."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only. Belorta: Pumpkin Witch is a pure positional supporter: every offensive line targets the single ally to her RIGHT (casterAtkPct 44.88 at FB enter, 47.52 on burst; sustainedDamagePct 19.97 per full charge, 27.23 on burst) plus one boss debuff (damageTakenPct 10.56 per full charge). Ghost Costume is modeled as a selfStatus window purely because skill2's own activation clause gates on it ('while in the Ghost Costume state'); its defensive single-target-untargetability and its taking-a-hit removal are unmodeled and recorded verbatim in unmodeled.skill1."
}
```

### 6b. blind audit + flags

```json
{
  "slug": "belorta-pumpkin-witch",
  "leakDetected": null,
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates when entering Full Burst",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger { kind: 'fullBurstEnter' } — literal 'entering Full Burst' wording, so it fires on ANY team Full Burst, not only rotations she bursts. No ownBurstGate (the text carries no 'after this unit uses her own Burst' clause)."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target { kind: 'self' } on block 1."
    },
    {
      "slot": "skill1",
      "kitLine": "Ghost Costume: ... for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "selfStatus { name: 'Ghost Costume', durationSec: 10 } — the named status WINDOW only, which exists so skill2's requiresSelfStatus gate can read it. Keyed per (unit,name), so no cross-unit status leakage."
    },
    {
      "slot": "skill1",
      "kitLine": "Prevents being targeted by single-tar",
      "status": "SKIPPED",
      "effectOrReason": "Defensive targeting-avoidance + the 'removed upon taking a direct hit' early-removal clause. The v1 boss deals no damage and no unit is targeted, so both are mechanically inert; recorded verbatim in unmodeled.skill1. The status window itself IS modeled (row above)."
    },
    {
      "slot": "skill1",
      "kitLine": "Prank Preparation: Max HP ▲ 15.84%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff { stat: 'targetMaxHpPct', value: 15.84, durationSec: 10 } on self. 'Max HP ▲ X%' with no 'of the skill user's' qualifier = target's OWN Max HP → targetMaxHpPct, not casterMaxHpPct. Offensively inert (no HP scaler in kit) but never skipped per the HP/DEF/heal/shield rule."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects the ally to the right of this",
      "status": "IMPLEMENTED",
      "effectOrReason": "target { kind: 'adjacentAlly', side: 'right' } on block 2 — the ONE neighbouring slot, never self; empty target set if she is rightmost."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 44.88% of the skill user's ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff { stat: 'casterAtkPct', value: 44.88, durationSec: 10 } — 'of the skill user's ATK' is the casterAtkPct flat-add path, NOT atkPct."
    },
    {
      "slot": "skill2",
      "kitLine": "landing a Full Charge attack while in",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger { kind: 'fullCharge' } + requiresSelfStatus 'Ghost Costume' — the kit's own self-status gate, satisfied only inside the 10 sec window skill1 opens at each Full Burst entry."
    },
    {
      "slot": "skill2",
      "kitLine": "Affects the target.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target { kind: 'enemy' } — the boss."
    },
    {
      "slot": "skill2",
      "kitLine": "Ghostly Prank: Damage Taken ▲ 10.56%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff { stat: 'damageTakenPct', value: 10.56, durationSec: 10 } on the enemy — a boss DEBUFF benefiting the whole team, not a self buff. Re-applied (refreshed) every gated full charge."
    },
    {
      "slot": "skill2",
      "kitLine": "performing a Full Charge attack",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger { kind: 'fullCharge' } on block 2, UNGATED — this line has no Ghost Costume clause, so it fires on every full charge for the whole fight (deliberately a separate block from the gated one)."
    },
    {
      "slot": "skill2",
      "kitLine": "Sustained Damage ▲ 19.97% for 5 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff { stat: 'sustainedDamagePct', value: 19.97, durationSec: 5 } on adjacentAlly right. 5 sec on a per-charge trigger ⇒ near-continuous while she fires, lapsing across reloads."
    },
    {
      "slot": "burst",
      "kitLine": "Affects the ally to the right of this",
      "status": "IMPLEMENTED",
      "effectOrReason": "target { kind: 'adjacentAlly', side: 'right' }; trigger burstCast (burst slot, no activation clause)."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 47.52% of the skill user's ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff { stat: 'casterAtkPct', value: 47.52, durationSec: 10 }. Stacks additively in the flat-ATK path with the skill1 44.88% grant to the same ally when both windows overlap (different slot ⇒ different buff key)."
    },
    {
      "slot": "burst",
      "kitLine": "Sustained Damage ▲ 27.23% for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff { stat: 'sustainedDamagePct', value: 27.23, durationSec: 10 } — separate key from the skill2 19.97% line, so the two are additive in the Damage Up bucket while co-active."
    }
  ],
  "flags": [
    {
      "field": "base stats (chargeFrames 60 / reloadFrames 141 / ammo 6) — cadence tuple",
      "estimate": "Use the datamined values as given: ~60f charge + ~141f reload on a 6-round RL magazine ⇒ roughly 6 full charges per ~8 sec of firing before a ~2.35 sec reload.",
      "reasoning": "ALWAYS-⚑: rate_of_fire / reloadFrames are known-unreliable datamine fields, and this unit is unusually cadence-sensitive — BOTH skill2 lines are per-full-charge, so her Damage Taken ▲ uptime on the boss and the Sustained Damage ▲ uptime on her right-hand ally are a direct function of charges landed per 10 sec window. A 15% cadence error moves her whole support contribution.",
      "recipe": "Frame-count a focus recording of her solo-firing: mark each charge-release frame over a 20 sec stretch, count releases per magazine and the release→next-release gap across a reload, then solve for actual chargeFrames and reloadFrames and compare against 60/141."
    },
    {
      "field": "override.skill1[0].effects[0].durationSec (Ghost Costume window) → gates override.skill2[0]",
      "estimate": "Full 10 sec per Full Burst entry (no early removal).",
      "reasoning": "The kit removes Ghost Costume 'upon taking a direct hit', a condition the v1 immortal-boss scope cannot express (nobody is attacked). Modeling the full 10 sec is the optimistic bound and is what makes Ghostly Prank's Damage Taken ▲ 10.56% effectively cover every charge inside the FB window. In a real fight where the boss hits her, some charges fall outside the status and the debuff's uptime drops.",
      "recipe": "Record a stage where she is actively targeted; time the Ghost Costume icon from FB entry to its disappearance across several rotations, and count how many of her full charges land while it is up vs down. The ratio is the haircut to apply to the gated block."
    },
    {
      "field": "override.skill2[0].trigger ('landing' vs 'performing' a Full Charge attack)",
      "estimate": "Treat landing as equivalent to release: trigger { kind: 'fullCharge' }, no landing/flight delay, 100% landing fraction.",
      "reasoning": "The Damage Taken line says 'landing', the Sustained line says 'performing' — the kit distinguishes them, but the schema's fullCharge primitive fires at charge release. For an unswapped RL every pull is a full charge and the projectile is assumed to connect, so the two wordings collapse; if her rocket has meaningful flight time the boss debuff is applied slightly early each proc, and a genuine miss would apply it with no hit at all.",
      "recipe": "Frame-compare the Ghostly Prank debuff popup/icon appearance against her charge-release frame in a focus recording; a consistent non-zero offset is the flight time and should become a block-level delaySec."
    },
    {
      "field": "override.burst[0].trigger (burstCast vs fullBurstEnter)",
      "estimate": "burstCast — the burst block carries no activation clause, so it resolves at her own cast, ~pre-Full-Burst, with both 10 sec buffs carrying through the FB window by duration.",
      "reasoning": "Default per the trigger-identity rule for an effect-clause-free burst slot. It is load-bearing only for the first ~fraction of a second of each window (a buff applied at cast is live slightly before FB opens vs one keyed to FB entry), and for Burst II she always casts before the FB window regardless — but it is kit-silent, so it is declared rather than asserted.",
      "recipe": "Read a buffApply event trace for the casterAtkPct 47.52 grant and compare its frame against the fullBurstStart frame in the same rotation; a cast-frame application confirms burstCast."
    }
  ],
  "model": "claude-opus-5"
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 2 identical block(s); 0 driver-only; 0 blind-only

### skill2: 2 identical block(s); 0 driver-only; 0 blind-only

### burst: 1 identical block(s); 0 driver-only; 0 blind-only

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/belorta-pumpkin-witch.json

```json
{
  "note": "Belorta: Pumpkin Witch (`belorta-pumpkin-witch`, aka bpw — the VARIANT; the base unit `belorta` is an RL/Electric Attacker with an unrelated kit). RL / Supporter / Water / Tetra, Burst II (cd 40s), ammo 6, chargeFrames 60, chargeMult 250, normalMult 61.3 — weapon cycle carried by characters.json, no charFixes. Kit-autonomy gauntlet 2026-10-09 — test-first, pinned by scripts/tests/units/belorta-pumpkin-witch.test.ts (P1–P6 + the rightmost-slot edge). A positional single-ally buffer: every ally-facing line targets 'the ally to the right of this unit' = target adjacentAlly{side:'right'} (the ONE slot to her right, never self; nobody when she sits rightmost). SKILL1 'Playful Little Witch' (two ■ headers, both 'Activates when entering Full Burst' = fullBurstEnter, so they fire on EVERY Full Burst, including ones where another Burst II unit cast stage 2): (a) self — Ghost Costume = selfStatus 'Ghost Costume' 10s (the state S2's first line gates on) + Prank Preparation 'Max HP ▲ 15.84% for 10 sec' = targetMaxHpPct 15.84 / 10s (damage-INERT: she has no HP-scaling ATK line; kept as its exact stat); (b) the ally to the right — 'ATK ▲ 44.88% of the skill user's ATK for 10 sec' = casterAtkPct 44.88 / 10s (a flat add of her ATK, uniform for any holder). SKILL2 'Trick or Treat!': (a) 'landing a Full Charge attack while in the Ghost Costume state' → the target (the boss): Ghostly Prank 'Damage Taken ▲ 10.56% for 10 sec' = fullCharge trigger + requiresSelfStatus 'Ghost Costume', enemy damageTakenPct 10.56 / 10s (same-caster-slot refresh, no stacking clause) — live only on her full charges inside the 10s after each Full Burst entry; (b) 'performing a Full Charge attack' (NO costume gate — a separate ■ header) → the ally to the right: sustainedDamagePct 19.97 / 5s on every full-charge pull. BURST 'Happy Halloween!' (burstCast — HER OWN cast, on the cast frame before Full Burst opens; not fullBurstEnter) → the ally to the right: casterAtkPct 47.52 / 10s + sustainedDamagePct 27.23 / 10s. Sustained Damage ▲ reaches only sustained-flavored damage of the holder (DoTs / sustained riders); on a holder with none it is applied and moves nothing. EVIDENCE TIER: every magnitude and duration is SL10 kit-text literal (DATAMINED). ⚑ LIST: [⚑1] Ghost Costume's 'removed upon taking a direct hit' — the v1 sim has no incoming damage, so the status always runs its full 10s and Ghostly Prank's gate stays open for the whole window. ESTIMATE: the modeled window is the UPPER bound; she is untargetable by single-target attacks while it lasts, so only area/direct boss hits can end it early. RECIPE: a fight recording with her in Full Burst against a boss area attack — check whether Ghostly Prank stops refreshing after the hit. TIER: out-of-domain for v1 (incoming-damage theme). [⚑2] Rightmost slot — 'the ally to the right' resolves to NOBODY when she is in the last slot (literal reading; no wrap-around). ESTIMATE: her three ally-facing lines contribute nothing from slot 5. RECIPE: one recording with her in slot 5 — check slot 1/slot 4 buff icons after her burst. TIER: kit-literal, unmeasured. [⚑3] 'Landing' a Full Charge — the RL rocket is credited as landing on its full-charge pull frame (engine fullCharge convention; flight time and misses are not modeled). TIER: engine convention.",
  "unmodeled": {
    "skill1": [
      "Ghost Costume: Prevents being targeted by single-target attacks for 10 sec. — the targeting immunity is defensive: the v1 sim has no boss targeting or incoming damage, so it moves no damage. The status itself IS modeled (selfStatus 'Ghost Costume' 10s) because Skill 2's Ghostly Prank gates on it.",
      "This effect is removed upon taking a direct hit. — the v1 sim has no incoming damage, so the removal never fires and the status runs its full 10s (⚑1 in the note)."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill2: Ghostly Prank's gate window is the full 10s Ghost Costume status from each Full Burst entry — an upper bound, since the direct-hit removal is out of domain (⚑1).",
    "all ally-facing lines: 'the ally to the right of this unit' resolves to the next slot; from the rightmost slot the lines apply to nobody (⚑2)."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "selfStatus",
          "name": "Ghost Costume",
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 15.84,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "adjacentAlly",
        "side": "right"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 44.88,
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
      "requiresSelfStatus": "Ghost Costume",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 10.56,
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
        "kind": "adjacentAlly",
        "side": "right"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "sustainedDamagePct",
          "value": 19.97,
          "durationSec": 5
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
        "kind": "adjacentAlly",
        "side": "right"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 47.52,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "sustainedDamagePct",
          "value": 27.23,
          "durationSec": 10
        }
      ]
    }
  ]
}
```

### 7b. scripts/tests/units/belorta-pumpkin-witch.test.ts

```ts
// PER-UNIT KIT SPEC — `belorta-pumpkin-witch` (Belorta: Pumpkin Witch, aka "bpw"; RL / Supporter /
// Water / Tetra, Burst II, cd 40s, ammo 6, chargeFrames 60). NEW unit — a VARIANT of the base unit
// `belorta` (RL/Electric Attacker), an entirely different kit; this file is the variant only.
// Kit-autonomy gauntlet 2026-10-09. Tier 2 (positional "ally to the right" scope, a self-status
// gate, burstCast-vs-fullBurstEnter identity).
//
// One assertion group per KIT LINE (P1..P6), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters['belorta-pumpkin-witch'].skills, SL10):
//   S1 ■ entering Full Burst → self:
//        Ghost Costume: untargetable by single-target attacks 10s, removed on a direct hit   [P1]
//        Prank Preparation: Max HP ▲ 15.84% for 10 sec                                       [P2]
//      ■ entering Full Burst → the ally to the right: ATK ▲ 44.88% of the skill user's ATK 10s [P3]
//   S2 ■ landing a Full Charge attack WHILE in Ghost Costume → the target:
//        Ghostly Prank: Damage Taken ▲ 10.56% for 10 sec                                     [P4]
//      ■ performing a Full Charge attack → the ally to the right: Sustained Damage ▲ 19.97% 5s [P5]
//   BU ■ the ally to the right: ATK ▲ 47.52% of the skill user's ATK 10s;
//        Sustained Damage ▲ 27.23% 10s                                                        [P6]
//
// UNMODELED / ⚑ (documented in the override, not asserted):
//   - Ghost Costume's targeting immunity + "removed upon taking a direct hit": the v1 sim has no
//     incoming damage (the boss never attacks), so the immunity moves nothing and the removal never
//     fires — the status runs its full 10s (theme 2). Only its role as S2's GATE is modeled (P1/P4).
//   - "Landing" a Full Charge: the RL homing rocket is credited as landing on its full-charge pull.
//
// Why each assertion discriminates:
//   P1/P4 The Ghost Costume status opens ONLY at Full Burst entry for 10s, so Ghostly Prank (enemy
//        Damage Taken) applies ONLY on her full charges inside [FB start, FB start + 600f). The
//        nearest-wrong reading — dropping the gate (every full charge) — applies outside those
//        windows too; a self-status that never opens (gate on, producer missing) applies nothing.
//   P2   A self Max HP grant (targetMaxHpPct → maxHpFlat) on every FB entry, 10s; damage-INERT for
//        her (no HP-scaling ATK line): every total byte-identical without it. Counterfactual
//        silent-drop has no event.
//   P3   Keys to FULL BURST ENTRY (every FB, including the ones where crown — not she — cast stage
//        2), never to her own burst cast; lands on exactly ONE unit, the slot to her right
//        (scarlet), never herself or the left neighbour. Counterfactuals: burstCast keying (misses
//        the crown-cast FBs), `allies` scope (5 holders), target-scaled atkPct (a different stat).
//   P5   One application per full-charge pull, to the right ally only, 5s; counterfactual self
//        target / allies scope change the holder set.
//   P6   Keys to HER OWN burst cast (cast frame, before FB opens), right ally only, both effects 10s;
//        counterfactual fullBurstEnter keying fires on every FB including crown-cast ones.
//   EDGE In the rightmost slot she has NO ally to her right: P3/P5/P6 grant nothing to anyone (the
//        literal reading — ⚑ in the override); the self-side lines (P1/P2/P4) are unaffected.
//
// Fixture: liter (B1) / belorta-pumpkin-witch (B2, slot 1) / scarlet (B3, slot 2 = the ally to her
// right) / helm (B3) / crown (B2, slot 4 — covers stage 2 while her 40s cooldown is down, so some
// Full Bursts happen WITHOUT her cast). Boss Fire, focus scarlet. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'belorta-pumpkin-witch';
const FPS = 60;
const MAIN = ['liter', SLUG, 'scarlet', 'helm', 'crown'];
const EDGE = ['liter', 'crown', 'scarlet', 'helm', SLUG];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(slugs: string[], ov?: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'scarlet',
    overrides: ov ? { [SLUG]: ov } : {},
    cfg: { onEvent: (e) => events.push(e) },
  });
  const idx = slugs.indexOf(SLUG);
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  const casts = events
    .filter((e) => e.kind === 'burstCast' && e.slug === SLUG)
    .map((e) => e.frame);
  const charged = events
    .filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG && e.charged)
    .map((e) => e.frame);
  // boss debuffs carry no casterIdx — attribute them by the `<ownerIdx>:<slot>:…` key prefix
  const mine = events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      (e.casterIdx === idx ||
        (e.targetIdx === null && e.key.startsWith(`${idx}:`)))
  );
  return {
    events,
    idx,
    fbStarts,
    casts,
    charged,
    mine,
    totals: totals(res),
    staticAtk: unitOf(res, SLUG).staticAtk,
  };
}
type Run = ReturnType<typeof run>;

const bySlot = (r: Run, slot: string, stat: string) =>
  r.mine.filter((b) => b.key.split(':')[1] === slot && b.stat === stat);
const uniq = <T>(xs: T[]) => [...new Set(xs)].sort((a: any, b: any) => a - b);
const inGhost = (r: Run, f: number) =>
  r.fbStarts.some((s) => f >= s && f < s + 10 * FPS);
/** FB starts NOT preceded by her own stage-2 cast in the same chain (crown cast instead). */
const fbWithoutHerCast = (r: Run) =>
  r.fbStarts.filter((s) => !r.casts.some((c) => c < s && s - c <= 120));

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const findBlock = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) {
    throw new Error(`${SLUG} ${slot} block missing — fixture is stale`);
  }
  return b;
};
const hasStat = (stat: string) => (b: any) =>
  b.effects.some((e: any) => e.stat === stat);
const isStatus = (b: any) =>
  b.effects.some((e: any) => e.kind === 'selfStatus');

const main = run(MAIN);
const edge = run(EDGE);
const RIGHT = main.idx + 1;

describe(`${SLUG} — fixture`, () => {
  it('she is slot 1, scarlet is the ally to her right, crown backs up stage 2', () => {
    expect(main.idx).toBe(1);
    expect(MAIN[RIGHT]).toBe('scarlet');
  });
  it('she casts her burst, and some Full Bursts happen without her cast', () => {
    expect(main.casts.length).toBeGreaterThanOrEqual(2);
    expect(fbWithoutHerCast(main).length).toBeGreaterThanOrEqual(1);
    expect(main.charged.length).toBeGreaterThan(20);
  });
});

describe('P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s', () => {
  const prank = bySlot(main, 'skill2', 'damageTakenPct');

  it('the Ghost Costume self-status block is FB-entry keyed, self, 10s', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    const b = findBlock(ov, 'skill1', isStatus);
    expect(b.trigger.kind).toBe('fullBurstEnter');
    expect(b.target.kind).toBe('self');
    const st = b.effects.find((e: any) => e.kind === 'selfStatus');
    expect(st.name).toBe('Ghost Costume');
    expect(st.durationSec).toBe(10);
  });

  it('Ghostly Prank lands on the BOSS, value 10.56, 10s, on full-charge frames only', () => {
    expect(prank.length).toBeGreaterThan(0);
    for (const b of prank) {
      expect(b.targetIdx).toBeNull();
      expect(b.value).toBe(10.56);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(main.charged).toContain(b.frame);
    }
  });

  it('applies ONLY while Ghost Costume is up (inside 10s of an FB entry), on EVERY such charge', () => {
    for (const b of prank) {
      expect(inGhost(main, b.frame)).toBe(true);
    }
    const gatedCharges = main.charged.filter((f) => inGhost(main, f));
    expect(uniq(prank.map((b) => b.frame))).toEqual(uniq(gatedCharges));
  });

  it('DISCRIMINATING: dropping the gate applies it on full charges OUTSIDE Ghost Costume', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        delete findBlock(ov, 'skill2', hasStat('damageTakenPct'))
          .requiresSelfStatus;
      })
    );
    const out = bySlot(cf, 'skill2', 'damageTakenPct').filter(
      (b) => !inGhost(cf, b.frame)
    );
    expect(out.length).toBeGreaterThan(0);
    expect(cf.totals.scarlet).toBeGreaterThan(main.totals.scarlet);
  });

  it('DISCRIMINATING: without the Ghost Costume producer the gate never opens', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        ov.skill1 = ov.skill1.filter((b: any) => !isStatus(b));
      })
    );
    expect(bySlot(cf, 'skill2', 'damageTakenPct')).toEqual([]);
  });

  it('IS LOAD-BEARING: the team deals more with Ghostly Prank than without it', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        ov.skill2 = ov.skill2.filter((b: any) => !hasStat('damageTakenPct')(b));
      })
    );
    expect(main.totals.helm).toBeGreaterThan(cf.totals.helm);
  });
});

describe('P2 — Prank Preparation: self Max HP ▲ 15.84% for 10s on FB entry (damage-inert)', () => {
  const hp = bySlot(main, 'skill1', 'maxHpFlat');

  it('applies on every FB entry, to herself only, 10s', () => {
    expect(uniq(hp.map((b) => b.frame))).toEqual(uniq(main.fbStarts));
    for (const b of hp) {
      expect(b.targetIdx).toBe(main.idx);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
  });

  it('is inert: every total byte-identical without it', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        for (const b of ov.skill1) {
          b.effects = b.effects.filter((e: any) => e.stat !== 'targetMaxHpPct');
        }
        ov.skill1 = ov.skill1.filter((b: any) => b.effects.length);
      })
    );
    expect(bySlot(cf, 'skill1', 'maxHpFlat')).toEqual([]);
    expect(cf.totals).toEqual(main.totals);
  });
});

describe('P3 — FB entry: the ally to the right gets ATK ▲ 44.88% of her ATK for 10s', () => {
  const atk = bySlot(main, 'skill1', 'casterAtkPct');

  it('fires on EVERY Full Burst entry (crown-cast ones too), to exactly the right ally', () => {
    expect(atk.length).toBe(main.fbStarts.length);
    expect(uniq(atk.map((b) => b.frame))).toEqual(uniq(main.fbStarts));
    expect(uniq(atk.map((b) => b.targetIdx))).toEqual([RIGHT]);
  });

  it('is a flat 44.88% of HER static ATK, 10s', () => {
    for (const b of atk) {
      expect(b.value).toBeCloseTo((44.88 / 100) * main.staticAtk, 1);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
  });

  it('DISCRIMINATING: a burstCast keying misses the Full Bursts she did not cast', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'skill1', hasStat('casterAtkPct')).trigger = {
          kind: 'burstCast',
        };
      })
    );
    const frames = bySlot(cf, 'skill1', 'casterAtkPct').map((b) => b.frame);
    for (const f of fbWithoutHerCast(main)) {
      expect(frames).not.toContain(f);
    }
    expect(frames.length).toBeLessThan(atk.length);
  });

  it('DISCRIMINATING: an all-allies scope grants five holders, not one', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'skill1', hasStat('casterAtkPct')).target = {
          kind: 'allies',
        };
      })
    );
    expect(
      uniq(bySlot(cf, 'skill1', 'casterAtkPct').map((b) => b.targetIdx))
    ).toEqual([0, 1, 2, 3, 4]);
    expect(cf.totals.helm).toBeGreaterThan(main.totals.helm);
  });

  it('IS LOAD-BEARING for the right ally: scarlet deals more with it', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        ov.skill1 = ov.skill1.filter((b: any) => !hasStat('casterAtkPct')(b));
      })
    );
    expect(main.totals.scarlet).toBeGreaterThan(cf.totals.scarlet);
    expect(cf.totals.helm).toBe(main.totals.helm);
  });
});

describe('P5 — full charge: the ally to the right gets Sustained Damage ▲ 19.97% for 5s', () => {
  const sus = bySlot(main, 'skill2', 'sustainedDamagePct');

  it('one application per full-charge pull, to the right ally only, 19.97, 5s', () => {
    expect(uniq(sus.map((b) => b.frame))).toEqual(uniq(main.charged));
    expect(sus.length).toBe(main.charged.length);
    for (const b of sus) {
      expect(b.targetIdx).toBe(RIGHT);
      expect(b.value).toBe(19.97);
      expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
    }
  });

  it('DISCRIMINATING: a self-target reading changes the holder', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'skill2', hasStat('sustainedDamagePct')).target = {
          kind: 'self',
        };
      })
    );
    expect(
      uniq(bySlot(cf, 'skill2', 'sustainedDamagePct').map((b) => b.targetIdx))
    ).toEqual([main.idx]);
  });

  it('is NOT gated on Ghost Costume (applies outside FB windows too)', () => {
    expect(sus.some((b) => !inGhost(main, b.frame))).toBe(true);
  });
});

describe('P6 — burst: the ally to the right gets ATK ▲ 47.52% of her ATK + Sustained Damage ▲ 27.23%, 10s', () => {
  const atk = bySlot(main, 'burst', 'casterAtkPct');
  const sus = bySlot(main, 'burst', 'sustainedDamagePct');

  it('both effects land on HER cast frames only, right ally only, 10s', () => {
    expect(uniq(atk.map((b) => b.frame))).toEqual(uniq(main.casts));
    expect(uniq(sus.map((b) => b.frame))).toEqual(uniq(main.casts));
    expect(atk.length).toBe(main.casts.length);
    expect(sus.length).toBe(main.casts.length);
    for (const b of [...atk, ...sus]) {
      expect(b.targetIdx).toBe(RIGHT);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
    for (const b of atk) {
      expect(b.value).toBeCloseTo((47.52 / 100) * main.staticAtk, 1);
    }
    for (const b of sus) {
      expect(b.value).toBe(27.23);
    }
  });

  it('DISCRIMINATING: a fullBurstEnter keying fires on the Full Bursts she did not cast', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        findBlock(ov, 'burst', hasStat('casterAtkPct')).trigger = {
          kind: 'fullBurstEnter',
        };
      })
    );
    const frames = bySlot(cf, 'burst', 'casterAtkPct').map((b) => b.frame);
    for (const f of fbWithoutHerCast(main)) {
      expect(frames).toContain(f);
    }
  });

  it('IS LOAD-BEARING for the right ally: scarlet deals more with the burst ATK grant', () => {
    const cf = run(
      MAIN,
      patch((ov) => {
        for (const b of ov.burst) {
          b.effects = b.effects.filter((e: any) => e.stat !== 'casterAtkPct');
        }
      })
    );
    expect(main.totals.scarlet).toBeGreaterThan(cf.totals.scarlet);
  });
});

describe('EDGE — rightmost slot: no ally to her right', () => {
  it('no ally-side grant from her reaches anyone but herself', () => {
    expect(edge.idx).toBe(4);
    const allyGrants = edge.mine.filter(
      (b) => b.targetIdx !== null && b.targetIdx !== edge.idx
    );
    expect(allyGrants).toEqual([]);
  });
  it('the self-side lines still work (Ghost Costume gate + Max HP)', () => {
    expect(bySlot(edge, 'skill1', 'maxHpFlat').length).toBe(
      edge.fbStarts.length
    );
    expect(bySlot(edge, 'skill2', 'damageTakenPct').length).toBeGreaterThan(0);
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/belorta-pumpkin-witch.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — belorta-pumpkin-witch — kit-autonomy gauntlet 2026-10-09
Arm 1 (pre-S3, NO override on disk — the new unit's starting state; commit c879c521): RED as required:
    Error: no skill override for "belorta-pumpkin-witch" — the engine does not parse skill prose at runtime
          Tests  no tests
Arm 2 (shipped override): npx vitest run scripts/tests/units/belorta-pumpkin-witch.test.ts --reporter=verbose — every DISCRIMINATING case runs the named nearest-wrong encoding via withPatchedOverride in the same file and asserts it diverges, so GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions.

 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > belorta-pumpkin-witch — fixture > she is slot 1, scarlet is the ally to her right, crown backs up stage 2
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > belorta-pumpkin-witch — fixture > she casts her burst, and some Full Bursts happen without her cast
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s > the Ghost Costume self-status block is FB-entry keyed, self, 10s
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s > Ghostly Prank lands on the BOSS, value 10.56, 10s, on full-charge frames only
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s > applies ONLY while Ghost Costume is up (inside 10s of an FB entry), on EVERY such charge
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s > DISCRIMINATING: dropping the gate applies it on full charges OUTSIDE Ghost Costume
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s > DISCRIMINATING: without the Ghost Costume producer the gate never opens
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P1/P4 — Ghost Costume (FB entry, 10s) gates Ghostly Prank: Damage Taken ▲ 10.56% 10s > IS LOAD-BEARING: the team deals more with Ghostly Prank than without it
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P2 — Prank Preparation: self Max HP ▲ 15.84% for 10s on FB entry (damage-inert) > applies on every FB entry, to herself only, 10s
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P2 — Prank Preparation: self Max HP ▲ 15.84% for 10s on FB entry (damage-inert) > is inert: every total byte-identical without it
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P3 — FB entry: the ally to the right gets ATK ▲ 44.88% of her ATK for 10s > fires on EVERY Full Burst entry (crown-cast ones too), to exactly the right ally
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P3 — FB entry: the ally to the right gets ATK ▲ 44.88% of her ATK for 10s > is a flat 44.88% of HER static ATK, 10s
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P3 — FB entry: the ally to the right gets ATK ▲ 44.88% of her ATK for 10s > DISCRIMINATING: a burstCast keying misses the Full Bursts she did not cast
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P3 — FB entry: the ally to the right gets ATK ▲ 44.88% of her ATK for 10s > DISCRIMINATING: an all-allies scope grants five holders, not one
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P3 — FB entry: the ally to the right gets ATK ▲ 44.88% of her ATK for 10s > IS LOAD-BEARING for the right ally: scarlet deals more with it
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P5 — full charge: the ally to the right gets Sustained Damage ▲ 19.97% for 5s > one application per full-charge pull, to the right ally only, 19.97, 5s
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P5 — full charge: the ally to the right gets Sustained Damage ▲ 19.97% for 5s > DISCRIMINATING: a self-target reading changes the holder
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P5 — full charge: the ally to the right gets Sustained Damage ▲ 19.97% for 5s > is NOT gated on Ghost Costume (applies outside FB windows too)
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P6 — burst: the ally to the right gets ATK ▲ 47.52% of her ATK + Sustained Damage ▲ 27.23%, 10s > both effects land on HER cast frames only, right ally only, 10s
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P6 — burst: the ally to the right gets ATK ▲ 47.52% of her ATK + Sustained Damage ▲ 27.23%, 10s > DISCRIMINATING: a fullBurstEnter keying fires on the Full Bursts she did not cast
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > P6 — burst: the ally to the right gets ATK ▲ 47.52% of her ATK + Sustained Damage ▲ 27.23%, 10s > IS LOAD-BEARING for the right ally: scarlet deals more with the burst ATK grant
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > EDGE — rightmost slot: no ally to her right > no ally-side grant from her reaches anyone but herself
 ✓ scripts/tests/units/belorta-pumpkin-witch.test.ts > EDGE — rightmost slot: no ally to her right > the self-side lines still work (Ghost Costume gate + Max HP)
      Tests  23 passed (23)

Coverage note: the fbGate:'inFb' proxy for the Ghost Costume gate (flagged by the claude-fable-5-1 S2b reviewer) is byte-identical to the selfStatus gate on any fixture without a Full Burst extender (both windows = 600f from FB entry); it is discriminated by the STRUCTURE pin 'the Ghost Costume self-status block is FB-entry keyed, self, 10s' + the producer-removal counterfactual, not by a damage observable.
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — belorta-pumpkin-witch (Belorta: Pumpkin Witch) — kit-autonomy gauntlet 2026-10-09

Driver: Claude Opus 5.5. Tier 2 (positional "ally to the right" scope, Ghost Costume self-status gate,
burstCast-vs-fullBurstEnter identity). Claude-only routing (owner 2026-10-02): S2b claude-fable-5 +
claude-fable-5-1, S5/S6 claude-opus-5, S7 claude-fable-5-1 (binding) + claude-fable-5 — same-family
evidence only.

## Engine change (for the judge to grade — commit cb191d32)

New target kind `{ kind: 'adjacentAlly'; side: 'left' | 'right' }` (src/skills/types.ts), resolved in
`resolveTargets` (src/engine/sim.ts) as:

```ts
case 'adjacentAlly': {
  // the single neighbouring slot on that side; none at the team's edge
  const want = ownerIdx + (t.side === 'right' ? 1 : -1);
  return units.filter((u) => u.idx === want);
}
```

`units[]` is slot order, leftmost first (`idx` = position in the team array). Validator rejects a
missing/unknown `side`; web targetLabel names it. Pinned by scripts/tests/engine/adjacent-ally.test.ts
(right = slot+1 only, left = slot-1 only, edge → nobody, contrast with selfAndAdjacent, validator).
Board-inert: `npx tsx scripts/regression.ts` passed unchanged before the override landed. Code review
on claude-fable-5-1: CLEAN (3 notes: STATE.md row to add at Land; the ranks/buffer.ts enabler predicate
ignores positional targets — inert, she carries no burstCdr; redaction path confirmed).

No existing primitive could express "the ally to the right": `selfAndAdjacent` always includes self
and both sides; no other target is positional.

## S2c reconcile

Both S2b reviewers' spec tables and load-bearing sets (7 lines) match the driver's: S1 Ghost Costume
selfStatus (gate) + self Max HP (inert) + right-ally casterAtkPct on fullBurstEnter; S2 Ghostly Prank
enemy damageTakenPct on fullCharge gated by the Ghost Costume status; S2 right-ally sustainedDamagePct
on every fullCharge (UNGATED); burst right-ally casterAtkPct + sustainedDamagePct on burstCast. Both
flag the direct-hit removal as an out-of-domain upper bound (⚑1) and the rightmost-slot edge.
claude-fable-5-1 flagged the `fbGate:'inFb'` proxy as byte-identical on a non-extending fixture — the
driver encoded the faithful selfStatus shape and pins it structurally (verify.txt coverage note).

## S6 convergence

The S6 blind override (claude-opus-5) is BLOCK-IDENTICAL to the driver's: same five blocks, triggers,
targets, gates, stats, values, durations and slot order. Its `unmodeled` holds the Ghost Costume
immunity + direct-hit removal text verbatim (the driver splits the same text into two entries). S6's
⚑ list adds a cadence-tuple flag — retired by owner ruling 2026-07-25, so not carried.

## S5 convergence run (blind test UNMODIFIED except one wiring line)

- Unmodified: 8 RED / 6 green / 4 skipped, all 8 from one cause: the blind file assigns `opts.onEvent`
  on CompOptions; `runComp` reads `onEvent` only from `opts.cfg`, so the event log is EMPTY (harness
  wiring defect — the same one-line fix the sin-swift-bunny run needed).
- Adapted (`scripts/kit-autonomy/blind/belorta-pumpkin-witch.adapted.test.ts` — `onEvent` moved into
  `opts.cfg`, no assertion touched): **11 green / 3 RED / 4 skipped.**
- The 3 RED are ALL in the burst group — a FIXTURE finding the blind writer predicted in its own
  header: `controlComp(slug, true)` seats crown (Burst II, cd 20s) in slot 1 AHEAD of her (Burst II,
  cd 40s, slot 2), so crown wins every stage-2 cast and she casts ZERO bursts there (probe: casts=0,
  burst grants=0). Its NON-VACUITY test fails by design; the other two compare an empty set. The blind
  file's own FIXTURE PROBE (a `burstFirst` opener lets her take stage 2 once) is GREEN and non-vacuous:
  casts=1, grants=2, both on frame 292 to `helm` (the ally to her right there), stats casterAtkPct +
  sustainedDamagePct.
- The driver's spec test seats her ahead of crown (liter / bpw / scarlet / helm / crown) so she casts
  ≥2 bursts and some Full Bursts happen without her cast; P6 pins the burst grants there.

## Out of scope

- Board A/B: she is a new unit on no graded comp — no board row to move (S8 non-gating).
