# S7 RECONCILING-JUDGE PACKET — anne-miracle-fairy (Anne: Miracle Fairy)

You are the BINDING reconciling judge for the kit-autonomy gauntlet on slug `anne-miracle-fairy`.
Follow the contract below, then grade the artifacts in the numbered sections. Return the single
JSON object your contract specifies — with `verdict` and `faithfulnessScore` as TOP-LEVEL keys.

---

## SECTION 0 — JUDGE CONTRACT

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

---

## SECTION I — MECHANICS SSOT (damage formula + game mechanics)

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
               + True Damage ▲ %           [only on true-flavored instances]
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

---

## SECTION II — GROUND TRUTH (kit prose + base stats, from data/characters.json)
```json
{
  "slug": "anne-miracle-fairy",
  "name": "Anne: Miracle Fairy",
  "weapon": "RL",
  "burst": "II",
  "burstCooldownSec": 60,
  "class": "Supporter",
  "element": "Wind",
  "manufacturer": "Missilis",
  "normalAttackMultiplier": 61.3,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "burstGaugePerShot": 1.4,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates after 3 normal attacks. Affects all Supporter allies.\nRestores HP equal to 6.07% of attack damage. Lasts for 5 sec.",
    "skill2": "■ Affects all allies. Activates when above 90% HP.\nIncoming Healing ▲ 23.46%.\n■ Activates when the last bullet hits the target while this unit's HP is at 90% or above. Affects all enemies.\nIncoming Healing ▼ 78.93% for 10 sec.",
    "burst": "■ Affects all Attacker allies.\nRestores HP equal to 38.61% of the skill user's final max HP.\nATK ▲ 77.22% for 10 sec.\n■ Affects 1 incapacitated Attacker ally unit(s) at random.\nRevives with 99% HP. Activates once per battle."
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 98,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 3000,
      "atk": 20,
      "def": 100,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1400,
    "critDamage": 150,
    "resourceId": 121
  }
}```

---

## SECTION III — S2b PRE-OP REVIEW (claude-fable-5, independent)
```json
{
  "slug": "anne-miracle-fairy",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Restores HP = 6.07% of attack damage",
      "disposition": "FAITHFUL",
      "scope": "Lifesteal-style recovery for Supporter allies; HP amounts are unmodeled (no HP pool), so the modeled surface is the heal-EVENT emission that fires recipients' 'recovery' triggers (tandem rule — never skip heal lines on isolation).",
      "durationSemantics": "'Lasts for 5 sec' = durationSec 5 wall-clock window (a lifesteal/HoT window, not rounds — the word 'sec' is literal). If encoded as a heal, ticks over the window (e.g. ticks with intervalSec 1) better preserves on-recovery refresh semantics than a single instant event.",
      "triggerIdentity": "hitCount count:3 — 'Activates after 3 normal attacks', repeating every 3. RL hitsPerShot 1 so rounds == trigger pulls (perPull moot). NOT interval, NOT once-only, NOT shotFired.",
      "targetSet": "alliesOfClass 'Supporter' (includes Anne herself — she is a Supporter). Crown (Defender) and any Attacker are EXCLUDED.",
      "nearestWrongModel": "Target flattened to 'allies' (all) — every 3-shot proc then emits a recovery event to crown (Defender, the roster's on-recovery consumer), lighting her recovery-gated team buffs and over-crediting the whole comp. Secondary misread: a once-only trigger instead of repeating every-3.",
      "distinguishingAssertion": "With crown in the comp, count crown's recovery-triggered buffApply events with the shipped override vs skill1 stripped via withPatchedOverride — the counts MUST be equal (green under Supporter-scoped target, red under an 'allies' misread). Structural: skill1 block has trigger {kind:'hitCount',count:3} and target {kind:'alliesOfClass',cls:'Supporter'}.",
      "inertness": "totals() for every unit unchanged when skill1 is stripped (no Supporter in a standard fixture consumes recovery); crown receives ZERO recovery events from Anne's skill1.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Incoming Healing ▲ 23.46%",
      "disposition": "UNMODELED",
      "scope": "Healing-received stat on allies; no StatKey exists for incoming healing and heal AMOUNTS are unmodeled, so the line has no consumer.",
      "durationSemantics": "Conditional passive — active while above 90% HP; at scope lock nobody takes damage so the gate is permanently satisfied (still inert).",
      "triggerIdentity": "HP-threshold passive ('Activates when above 90% HP') — always-true at scope; do NOT invent an HP-tracking primitive for it.",
      "targetSet": "All allies (including self).",
      "nearestWrongModel": "Pattern-matching the ▲ into some modeled stat (attackDamagePct or similar) or into a heal effect on an invented cadence — spurious buffApply / recovery traffic from a line that should emit nothing.",
      "distinguishingAssertion": "Event log contains NO buffApply and no recovery-consumer movement sourced from Anne's skill2 block A; totals identical with skill2 stripped via withPatchedOverride.",
      "inertness": "Zero damage movement, zero events. Verbatim line must appear in unmodeled.skill2.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Incoming Healing ▼ 78.93% for 10 sec",
      "disposition": "UNMODELED",
      "scope": "Debuff on healing RECEIVED by enemies; the boss never heals in this sim, so it is inert. There is also no incoming-healing StatKey.",
      "durationSemantics": "Would-be durationSec 10 — irrelevant while unmodeled.",
      "triggerIdentity": "lastBullet (per-magazine; ammo 6 → every 6th round / reload start), gated on OWN HP ≥ 90% (always true at scope — no incoming damage).",
      "targetSet": "All enemies (a boss-held debuff — would emit buffApply with casterIdx===null if it were modeled).",
      "nearestWrongModel": "The catastrophic pattern-match: '▼ on all enemies' encoded as damageTakenPct 78.93 boss debuff, refreshed every magazine — a massive team-wide over-credit. This is the single most dangerous misread in the kit.",
      "distinguishingAssertion": "NO buffApply with stat 'damageTakenPct' matching value 78.93 (casterIdx===null) appears at Anne's last-bullet cadence; totals for ALL FIVE units are identical with skill2 stripped (red by a huge margin under the damageTaken misread).",
      "inertness": "Entire comp's damage unmoved by skill2's existence.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Restores HP = 38.61% of user's max HP",
      "disposition": "FAITHFUL",
      "scope": "An instant HEAL ('Restores HP'), NOT a Max HP grant — must not be encoded as casterMaxHpPct/targetMaxHpPct. Modeled surface is the heal-event emission to Attacker allies (fires their 'recovery' triggers).",
      "durationSemantics": "Instant, one event per burst cast — no duration on the heal itself.",
      "triggerIdentity": "burstCast (Anne's OWN Burst II cast), NOT fullBurstEnter — burst-cast effects land before the Full Burst window opens.",
      "targetSet": "alliesOfClass 'Attacker' — excludes Anne (Supporter) by class, excludes crown (Defender) and liter (Supporter).",
      "nearestWrongModel": "(i) Encoded as a casterMaxHpPct Max-HP BUFF — emits spurious buffApply {stat:'maxHpFlat'} instead of a heal event; (ii) target flattened to 'allies', feeding crown's on-recovery trigger every rotation.",
      "distinguishingAssertion": "No buffApply with stat 'maxHpFlat' is sourced from Anne's burst; crown's recovery-triggered buffApply count is identical with this heal effect stripped. Structural: burst block carries {kind:'heal'} with target {kind:'alliesOfClass',cls:'Attacker'} on a burstCast trigger.",
      "inertness": "Crown receives zero recovery events from Anne's burst; zero maxHpFlat buffApply traffic from Anne.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 77.22% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK buff — atkPct (scales each TARGET's own ATK). No normal-attack / charge / crit scoping in the text.",
      "durationSemantics": "durationSec 10 — expiresFrame − applyFrame = 600 at 60fps. Not rounds, not stacks.",
      "triggerIdentity": "burstCast (stage 2, Anne's own cast). Buff applies PRE-Full-Burst — the apply frame precedes the following fullBurstStart by the measured chain gap (30f B2→B3 + 22f → FB), so the 10s window covers slightly different shots than a fullBurstEnter keying would.",
      "targetSet": "alliesOfClass 'Attacker' ONLY — Anne (Supporter), liter (Supporter), crown (Defender) must never hold it.",
      "nearestWrongModel": "(i) Target 'allies' — over-credits liter/crown/self; (ii) fullBurstEnter keying — window starts ~0.9s late AND fires on FBs Anne didn't burst into whenever another Burst II unit casts; (iii) casterAtkPct — a flat add off Anne's Supporter staticAtk (98,367) instead of scaling each Attacker's own ATK, which also changes the emitted buffApply value from raw 77.22 to a flat-resolved ATK number.",
      "distinguishingAssertion": "Every buffApply {stat:'atkPct', value:77.22} from Anne's burst has targetSlug in the Attacker-class set only; the apply frame is STRICTLY BEFORE the next fullBurstStart frame; expiresFrame − applyFrame === 600; the emitted value is the raw 77.22 (atkPct is a plain-percentage stat, not flat-resolved). Red under any of the three misreads.",
      "inertness": "liter, crown, and Anne herself receive no atkPct 77.22 buffApply; non-Attacker units' totals are unmoved by stripping this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Revives with 99% HP, once per battle",
      "disposition": "UNMODELED",
      "scope": "Revive of an incapacitated Attacker — no unit is ever incapacitated in this sim (the boss deals no damage), so the condition can never be met.",
      "durationSemantics": "Once per battle (would-be), conditional on an incapacitated ally existing at cast time.",
      "triggerIdentity": "Rides the burst cast, gated on an incapacitated-Attacker condition that is never satisfiable at scope.",
      "targetSet": "1 incapacitated Attacker ally at random.",
      "nearestWrongModel": "Emitting a heal/recovery event to a random Attacker on every burst while ignoring the incapacitated gate — spurious recovery traffic on top of burst line 1's legitimate heal.",
      "distinguishingAssertion": "Anne's burst emits exactly ONE heal-shaped effect (the 38.61% line) — no second recovery emission; the revive line appears verbatim in unmodeled.burst.",
      "inertness": "Zero events, zero damage from this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:Restores HP = 6.07% of attack damage",
    "burst:Restores HP = 38.61% of user's max HP",
    "burst:ATK ▲ 77.22% for 10 sec"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Incoming Healing ▲ 23.46%.",
      "Incoming Healing ▼ 78.93% for 10 sec."
    ],
    "burst": [
      "Revives with 99% HP. Activates once per battle."
    ]
  },
  "notes": "FIXTURE HAZARD (reconcile first): Anne is Burst II, and controlComp's fixed comp already carries crown in the B2 slot — a second B2 means only one casts per rotation, and if Anne never casts, BOTH burstCast-keyed load-bearing lines silently never fire and every test goes vacuously green. The driver must either build the comp so Anne is the casting B2 or assert burstCast events with her srcSlot before asserting anything downstream. OBSERVABILITY: cfg.onEvent has NO heal/recovery event kind (shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/fullBurstEnd), so heal emissions are observable only through a consumer's buffApply — the natural probe is crown (Defender, on-recovery consumer), and the sharp adversarial fact is that crown sits in NEITHER of Anne's class-scoped heal target sets (Supporter for S1, Attacker for burst), so the class scoping is damage-VISIBLE in the fixture: assert crown's recovery-driven buffApply count is invariant to Anne's presence/stripping. Expected shared-prior misreads, in order of damage: (1) 'Incoming Healing ▼ 78.93%' on all enemies pattern-matched into a damageTakenPct boss debuff — guard with a whole-comp totals-invariance assertion under a skill2 strip; (2) class-scoped 'all Attacker/Supporter allies' flattened to 'allies' — guarded via the crown probe; (3) the burst ATK buff keyed to fullBurstEnter instead of burstCast — guarded by the apply-frame < fullBurstStart assertion. HP gates ('above 90%' / '90% or above') are permanently satisfied at scope lock (no incoming damage) — encoding them as always-on is correct today; do not invent an HP-tracking primitive. All magnitudes are kit-text literals (DATAMINED); none of the ALWAYS-⚑ fields are implicated by these lines. Environment note: no tools were available, so this JSON could not be written to scripts/kit-autonomy/reviews/anne-miracle-fairy.test-review.json — the orchestrator must persist it.",
  "model": "claude-fable-5"
}
```

---

## SECTION IV — S5 BLIND TEST (claude-opus-5, written from prose alone)
```typescript
/**
 * anne-miracle-fairy (Anne: Miracle Fairy) — RL/Wind/Supporter/Burst II — BLIND kit spec test.
 * Written from the kit prose ALONE (no sight of the shipped override, the driver's tests, or any
 * truth file). Structural assertions read the SHIPPED override via an unmutated withPatchedOverride
 * clone; behavioural assertions discriminate by counterfactual.
 *
 * KIT SHAPE (magnitudes only):
 *   S1  ■ after 3 normal attacks | all Supporter allies -> heal 6.07% of attack damage, 5 sec
 *   S2a ■ all allies, while HP above 90%      -> Incoming Healing ▲ 23.46%
 *   S2b ■ last bullet hits while HP >= 90% | all enemies -> Incoming Healing ▼ 78.93% for 10 sec
 *   B   ■ all Attacker allies -> heal 38.61% of the skill user's final Max HP; ATK ▲ 77.22% for 10 sec
 *       ■ 1 random incapacitated Attacker ally -> revive at 99% HP, once per battle
 *
 * THE WHOLE KIT CONTAINS ZERO DAMAGE LINES. Her only damage-relevant payload is the burst ATK buff;
 * everything else is heal-channel (tandem-only) or has no StatKey at all. So the spec is mostly
 * about what must NOT have been invented: no damage rider, no Max-HP grant standing in for the
 * burst heal, and no "Incoming Healing" line silently re-encoded as a damage stat.
 *
 * FIXTURE: controlComp('anne-miracle-fairy', true) — liter (B1) / crown (B2) / anne / helm (B3).
 * She is a Burst II sharing the stage with the fixture's own B2, which is DELIBERATE: it makes
 * burst-cast keying distinguishable from full-burst-enter keying (she does not cast on every FB).
 * The fixed B3 is kept so the chain completes and Full Bursts actually happen.
 *
 * WHY THE HEAL PAIR DISCRIMINATES: the fixture's B2 is the on-recovery consumer of the control
 * comp. Under the faithful class scopes (Supporter for S1, Attacker for B) her heals never reach
 * it, so stripping every heal must be byte-identical; widening those same blocks to all allies must
 * NOT be. Under the nearest-wrong model (heals scoped to `allies`) both assertions invert.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import type { Block, EffectDef } from '../../../src/skills/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const SLUG = 'anne-miracle-fairy';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

const BURST_ATK_PCT = 77.22;
const BURST_HEAL_PCT = 38.61;
const INC_HEAL_UP = 23.46;
const INC_HEAL_DOWN = 78.93;
const S1_HEAL_PCT = 6.07;

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// The mutate-callback's argument type, lifted straight off the harness signature so the patch
// helpers stay type-safe without importing an OverrideFile type name.
type Ov = Parameters<Parameters<typeof withPatchedOverride>[1]>[0];
type Opts = ReturnType<typeof controlComp>;

/**
 * The override FILE is slot-keyed. Both documented slot shapes (slot -> Block[] and
 * slot -> { blocks: Block[] }) are handled, so every patch below is shape-agnostic and mutates the
 * block array IN PLACE (splice / field assignment) — never by reassigning the slot.
 */
function blocksOf(ov: Ov, slot: Slot): Block[] {
  const s = (ov as unknown as Record<Slot, unknown>)[slot];
  if (Array.isArray(s)) return s as Block[];
  const inner = (s as { blocks?: Block[] } | null | undefined)?.blocks;
  return Array.isArray(inner) ? inner : [];
}
function allBlocks(ov: Ov): Block[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
function unmodeledText(ov: Ov): string {
  const u = (ov as unknown as { unmodeled?: Record<string, string[]> }).unmodeled ?? {};
  return Object.values(u).flat().join('\n');
}

type AnyEffect = EffectDef & { stat?: string; value?: number; durationSec?: number; atkPct?: number };
const eff = (e: EffectDef) => e as AnyEffect;
const isHeal = (e: EffectDef) => e.kind === 'heal';
const isBurstAtkBuff = (e: EffectDef) =>
  eff(e).kind === 'buff' && eff(e).stat === 'atkPct' && near(eff(e).value ?? -1, BURST_ATK_PCT);

function stripEffects(ov: Ov, pred: (e: EffectDef) => boolean): void {
  for (const b of allBlocks(ov)) {
    const keep = b.effects.filter((e) => !pred(e));
    b.effects.splice(0, b.effects.length, ...keep);
  }
}
function retargetBlocksWith(ov: Ov, pred: (e: EffectDef) => boolean): void {
  for (const b of allBlocks(ov)) if (b.effects.some(pred)) b.target = { kind: 'allies' };
}

interface Run {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}
function run(opts: Opts): Run {
  const events: SimEvent[] = [];
  const tapped = {
    ...(opts as object),
    cfg: {
      ...((opts as { cfg?: Record<string, unknown> }).cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as Opts;
  return { res: runComp(tapped), events };
}
function patchedRun(mutate: (ov: Ov) => void): Run {
  const base = controlComp(SLUG, true);
  const opts = {
    ...(base as object),
    overrides: { [SLUG]: withPatchedOverride(SLUG, mutate) },
  } as Opts;
  return run(opts);
}

interface BuffEv {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
}
const buffApplies = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

// ---- hoisted runs (6 full 180 s sims) -------------------------------------------------------
const SHIPPED = withPatchedOverride(SLUG, () => undefined); // read-only clone, nothing mutated

const BASE = run(controlComp(SLUG, true));
const NO_HEALS = patchedRun((ov) => stripEffects(ov, isHeal));
const WIDE_HEALS = patchedRun((ov) => retargetBlocksWith(ov, isHeal));
const WIDE_ATK = patchedRun((ov) => retargetBlocksWith(ov, isBurstAtkBuff));
const SHORT_ATK = patchedRun((ov) => {
  for (const b of allBlocks(ov)) for (const e of b.effects) if (isBurstAtkBuff(e)) eff(e).durationSec = 2;
});
const FB_TRIGGER = patchedRun((ov) => {
  for (const b of allBlocks(ov)) if (b.effects.some(isBurstAtkBuff)) b.trigger = { kind: 'fullBurstEnter' };
});

const BASE_BUFFS = buffApplies(BASE.events);
const ATK_APPLIES = BASE_BUFFS.filter((b) => near(b.value, BURST_ATK_PCT));
const BENEFICIARIES = [...new Set(ATK_APPLIES.map((b) => b.targetSlug).filter(Boolean))] as string[];

describe('anne-miracle-fairy — fixture non-vacuity', () => {
  it('the control comp reaches Full Burst and she casts her own burst at least once', () => {
    // Without both of these every burst-slot assertion below is vacuous.
    expect(BASE.events.filter((e) => e.kind === 'fullBurstStart').length).toBeGreaterThan(0);
    expect(ATK_APPLIES.length).toBeGreaterThan(0);
  });
});

describe('anne-miracle-fairy — burst: ATK ▲ 77.22% for 10 sec, all Attacker allies', () => {
  it('is a raw-percentage atkPct buff, not a caster-scaled flat ATK add', () => {
    // Discriminates atkPct ("ATK ▲ x%", scales the TARGET's own ATK — emitted as the raw 77.22)
    // from casterAtkPct / atkOfCasterMaxHpPct, which flat-resolve at apply time and would emit a
    // five-figure ATK number instead. Fails under either nearest-wrong stat choice.
    expect(ATK_APPLIES.every((b) => b.stat === 'atkPct')).toBe(true);
    expect(BASE_BUFFS.filter((b) => b.stat === 'casterAtkPct' && b.value > 1000).length).toBe(0);
  });

  it('is class-scoped to Attacker allies — never the caster, who is a Supporter', () => {
    expect(BENEFICIARIES.length).toBeGreaterThan(0);
    expect(BENEFICIARIES).not.toContain(SLUG);

    const t = allBlocks(SHIPPED).find((b) => b.effects.some(isBurstAtkBuff))?.target as {
      kind: string;
      cls?: string;
    };
    expect(t.kind).toBe('alliesOfClass');
    expect(/attack/i.test(t.cls ?? '')).toBe(true);
  });

  it('widening the buff to all allies moves damage (the class scope is load-bearing here)', () => {
    // Non-vacuity for the scope assertion above: the fixture contains at least one non-Attacker
    // ally whose damage would move if the kit's "all Attacker allies" clause were read as "allies".
    expect(totals(WIDE_ATK.res)).not.toEqual(totals(BASE.res));
  });

  it('the 10 sec window is real — shortening it costs every beneficiary damage', () => {
    // Duration SEMANTICS: seconds, not rounds/stacks. Under a 2 s window the buff lapses inside
    // the same Full Burst it was cast for, so each Attacker beneficiary strictly loses damage.
    for (const slug of BENEFICIARIES) {
      expect(totals(SHORT_ATK.res)[slug]).toBeLessThan(totals(BASE.res)[slug]);
    }
  });

  it('is keyed to HER OWN burst cast, not to team full-burst entry', () => {
    // TRIGGER IDENTITY. She is a Burst II sharing the stage with the fixture's B2, so she does not
    // cast on every rotation: re-keying the same block to fullBurstEnter over-credits the buff on
    // rotations the other B2 completed. If this comes back equal, the fixture (not the model) is
    // the problem — she cast on every Full Burst and the two keyings coincide.
    expect(totals(FB_TRIGGER.res)).not.toEqual(totals(BASE.res));

    const b = allBlocks(SHIPPED).find((blk) => blk.effects.some(isBurstAtkBuff))!;
    expect(b.trigger.kind).toBe('burstCast');
  });

  it('the 38.61% Max-HP line is a HEAL, never a Max HP grant', () => {
    // Nearest-wrong: reading "Restores HP equal to 38.61% of the skill user's final Max HP" as
    // casterMaxHpPct / targetMaxHpPct / atkOfCasterMaxHpPct. Those are Max-HP or ATK GRANTS that
    // feed HP-scaling ATK consumers; the kit line is a one-shot restore with no stat payload.
    const burstBlocks = blocksOf(SHIPPED, 'burst');
    expect(burstBlocks.some((b) => b.effects.some(isHeal))).toBe(true);

    const hpStats = ['casterMaxHpPct', 'targetMaxHpPct', 'atkOfCasterMaxHpPct', 'maxHpPct', 'maxHpFlat'];
    const badGrant = allBlocks(SHIPPED).flatMap((b) => b.effects).filter(
      (e) => eff(e).kind === 'buff' && hpStats.includes(eff(e).stat ?? ''),
    );
    expect(badGrant.length).toBe(0);
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => near(eff(e).value ?? -1, BURST_HEAL_PCT)).length,
    ).toBe(0);
  });

  it.skip('revive of 1 random incapacitated Attacker ally at 99% HP, once per battle — GAP: no death/HP model at scope lock', () => {
    // Nobody is ever incapacitated in the v1 fight, and the engine has no revive primitive.
    // Recorded as unmodeled text instead (asserted in the kit-wide block below).
  });
});

describe('anne-miracle-fairy — skill1: after 3 normal attacks, Supporter allies, 5 sec', () => {
  it('is modeled on a 3-hit trigger, class-scoped to Supporters, paying out through the heal channel', () => {
    // Trigger identity: "Activates after 3 normal attacks" is hitCount:3 (rounds, hitsPerShot 1 on
    // this RL) — NOT shotFired, NOT an interval. Target set is the Supporter class, which INCLUDES
    // the caster. The payload is a heal so that on-recovery consumers fire; dropping it entirely
    // (the "heals are defensive, skip them" failure mode) would silence that channel.
    const healBlocks = blocksOf(SHIPPED, 'skill1').filter((b) => b.effects.some(isHeal));
    expect(healBlocks.length).toBeGreaterThan(0);

    const b = healBlocks[0];
    expect(b.trigger.kind).toBe('hitCount');
    expect((b.trigger as { count?: number }).count).toBe(3);

    const t = b.target as { kind: string; cls?: string };
    expect(t.kind).toBe('alliesOfClass');
    expect(/support/i.test(t.cls ?? '')).toBe(true);
  });

  it('both heals are damage-inert at this fixture, and would NOT be if they were scoped to all allies', () => {
    // The discriminating PAIR. Faithful class scopes -> the control comp's on-recovery consumer is
    // outside both scopes, so removing every heal changes nothing; widening those same blocks to
    // `allies` reaches it and moves damage. Under the nearest-wrong model (heals targeting all
    // allies) BOTH assertions invert, so a mis-scoped heal cannot pass this pair.
    expect(totals(NO_HEALS.res)).toEqual(totals(BASE.res));
    expect(totals(WIDE_HEALS.res)).not.toEqual(totals(BASE.res));
  });

  it.skip('6.07%-of-attack-damage lifesteal sustained across the 5 sec window — GAP: no HP pool, and the heal AMOUNT is unmodeled by design', () => {
    // ⚑ The number of recovery events emitted across the 5 s window (single pulse vs ticks) is an
    // authoring choice the kit text does not settle and no event carries an HP amount, so nothing
    // here is assertable without a measurement of an on-recovery consumer's proc count.
  });
});

describe('anne-miracle-fairy — skill2: the two Incoming Healing lines', () => {
  it('Incoming Healing ▲ 23.46% is not re-encoded as any damage-bearing stat', () => {
    // There is no Incoming-Healing StatKey. The failure mode is parking the magnitude on whatever
    // stat is nearest to hand (atkPct / attackDamagePct), which would silently buff the whole team.
    expect(BASE_BUFFS.filter((b) => near(b.value, INC_HEAL_UP)).length).toBe(0);
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => near(eff(e).value ?? -1, INC_HEAL_UP) || near(eff(e).atkPct ?? -1, INC_HEAL_UP)).length,
    ).toBe(0);
  });

  it('Incoming Healing ▼ 78.93% is not re-encoded as a boss damageTaken debuff', () => {
    // The expensive nearest-wrong: an "affects all enemies, ▼78.93%" line read as damageTakenPct is
    // a ~79% team-wide damage amplifier. Boss-held debuffs arrive with casterIdx === targetIdx ===
    // null, so they are filtered by stat+value here.
    const bossHeld = BASE_BUFFS.filter((b) => b.casterIdx === null && b.targetIdx === null);
    expect(bossHeld.filter((b) => near(b.value, INC_HEAL_DOWN)).length).toBe(0);
    expect(BASE_BUFFS.filter((b) => near(b.value, INC_HEAL_DOWN)).length).toBe(0);
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => eff(e).stat === 'damageTakenPct').length,
    ).toBe(0);
  });

  it('no silent drops — both Incoming Healing lines and the revive line are recorded verbatim in unmodeled', () => {
    const txt = unmodeledText(SHIPPED);
    expect(txt).toMatch(/incoming healing/i);
    expect(txt).toContain(String(INC_HEAL_UP));
    expect(txt).toContain(String(INC_HEAL_DOWN));
    expect(txt).toMatch(/reviv/i);
  });

  it.skip('last-bullet + HP >= 90% gating on the ▼ line — GAP: unobservable payload', () => {
    // Even correctly triggered, the effect has no StatKey and the boss never heals, so trigger
    // identity (lastBullet) and the HP gate carry no observable consequence to assert against.
  });

  it.skip('the "above 90% HP" self-gate on the ▲ line — GAP: no HP pool, the gate is trivially always true', () => {
    // The v1 boss deals no damage, so HP is pinned at 100% for the whole fight.
  });
});

describe('anne-miracle-fairy — kit-wide invariants', () => {
  it('adds no damage of its own — the kit contains zero damage lines', () => {
    // She is a pure heal/ATK-buff Supporter: no rider, no DoT, no %-of-hit repeat, no stored hit.
    // This is the guard against a fabricated damage source filling in for the unmodellable heals.
    const damageKinds = ['flatDamage', 'dot', 'hitRepeat', 'storedHit', 'stackedNuke'];
    const invented = allBlocks(SHIPPED)
      .flatMap((b) => b.effects)
      .filter((e) => damageKinds.includes(e.kind));
    expect(invented).toEqual([]);
  });

  it('the S1 magnitude is not smuggled in as a stat buff', () => {
    expect(
      allBlocks(SHIPPED)
        .flatMap((b) => b.effects)
        .filter((e) => eff(e).kind === 'buff' && near(eff(e).value ?? -1, S1_HEAL_PCT)).length,
    ).toBe(0);
  });

  it('teammates outside the buff scope are byte-identical when the heals are removed', () => {
    // Inertness in the strict sense: removing a channel that should reach nobody here must not
    // perturb ANY unit's total, not merely the team aggregate.
    for (const slug of Object.keys(totals(BASE.res))) {
      expect(totals(NO_HEALS.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
  });
});
```

## S5 BLIND TEST — RUN RESULT vs THE DRIVER OVERRIDE + DRIVER ADJUDICATION EVIDENCE

Run: `npx vitest run` on the adapted blind test (import-path fix only — the pristine packet output is
above) against the driver's committed override. Result: **10 pass / 5 RED / 4 self-documented skips.**

The driver probe-verified every RED against the engine (probe output below each). All five are fixture
artifacts of the blind test's comp choice (controlComp = liter/crown/anne/helm with crown, the fixture's
own Burst II, present), NOT divergences of the driver's encoding:

1. `fixture non-vacuity > she casts her own burst at least once` — RED: anne casts 0 bursts in
   controlComp. PROBE: burstCasts by slug = {"liter":10,"crown":10,"helm":5} — crown (B2, cd 40s)
   out-rotates anne (B2, cd 60s) and takes EVERY stage-2 slot. This is the documented single-B2-slot
   contest hazard; the driver's spec deliberately fields anne as the SOLE B2.
2. `raw-percentage atkPct, not a caster-scaled flat ATK add` — RED: the blind `casterAtkPct`-with-large-
   value filter matched 23 buffs. PROBE: all 23 are casterIdx 1 = CROWN (her kit grants caster-ATK flats);
   anne emits none (she never casts in that comp). The assertion's exclusion premise was wrong for the
   fixture, not for the encoding.
3. `class-scoped to Attacker allies — never the caster` — RED: zero beneficiaries. Downstream of RED 1
   (anne never casts ⇒ no applications to inspect).
4. `widening the buff to all allies moves damage` — RED: totals identical. Downstream of RED 1 (anne never
   casts ⇒ widening her never-fired buff changes nothing).
5. `both heals are damage-inert … and would NOT be if scoped to all allies` — RED: widening the S1 heal to
   all allies moved no totals. PROBE: crown's on-recovery consumer is SATURATED in this comp — helm's
   every-full-charge all-allies heal fires it 161 distinct frames over 180s (≈1127s of 7s-window
   coverage), so anne's widened Supporter heal adds zero marginal uptime. This is exactly the saturation-
   masking hazard helm.test.ts H8 isolates; the driver's spec instead probes through asuka (whose recovery
   consumer is NOT saturated in the driver's fixture) and pins the class scope both ways there.

Probe transcript (controlComp, boss Fire, focus anne):
  burstCasts by slug: {"liter":10,"crown":10,"helm":5}
  casterAtkPct applies: 23 by casterIdx: {"1":23}
  crown 20.99 distinct firing frames: 161 (≈1127s coverage of 180s => saturated)

Note the 4 self-documented skips in the blind test are the unmodelable lines (S2 both, revive) — the blind
writer skipped them for the same reason the driver unmodeled them.

---

## SECTION V — S6 BLIND OVERRIDE (claude-opus-5, written from prose alone)
```json
{
  "slug": "anne-miracle-fairy",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 3
      },
      "target": {
        "kind": "alliesOfClass",
        "cls": "Supporter"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": []
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": []
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfClass",
        "cls": "Attacker"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 1
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 77.22,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfClass",
        "cls": "Attacker"
      },
      "effects": []
    }
  ],
  "unmodeled": {
    "skill1": [
      "Restores HP equal to 6.07% of attack damage. Lasts for 5 sec. — HP AMOUNT unmodeled (no HP pool at scope lock); the recovery EVENT is emitted so on-recovery consumers (e.g. crown) fire."
    ],
    "skill2": [
      "Incoming Healing ▲ 23.46%. — no incomingHealingPct StatKey; heal magnitudes are unmodeled, so this scales nothing. Recorded, not enacted.",
      "Activates when above 90% HP. — HP-state gate; no HP pool at scope lock (boss deals no damage), so the condition is trivially TRUE and the block is authored ungated.",
      "Incoming Healing ▼ 78.93% for 10 sec (all enemies). — enemy incoming-healing debuff; the boss is not healed in v1 and there is no stat for it. Fully inert."
    ],
    "burst": [
      "Restores HP equal to 38.61% of the skill user's final max HP. — HP AMOUNT unmodeled; the recovery EVENT is emitted.",
      "Affects 1 incapacitated Attacker ally unit(s) at random. Revives with 99% HP. Activates once per battle. — no death/incapacitation model at scope lock; nobody is ever incapacitated, so the revive can never fire."
    ]
  },
  "caveats": [
    "⚑ skill1 trigger threshold: 'after 3 normal attacks' encoded as hitCount count:3 counting LANDED rounds (perPull omitted). She is RL/hitsPerShot 1, so pulls == rounds and the reading is unambiguous for THIS unit.",
    "⚑ skill1 'Lasts for 5 sec' is NOT a heal duration in this model — the 6.07%-of-attack-damage lifesteal window is unmodeled (no HP pool); the block emits ONE recovery event per 3rd attack. If a teammate's on-recovery consumer proves to need per-second refresh, re-encode as heal.ticks with intervalSec.",
    "⚑ burst is authored on burstCast (her OWN cast, Burst II) per the trigger-fidelity rule: the block sits in HER burst slot. In a comp where another Burst II casts instead, this correctly does not fire.",
    "This unit is a pure Supporter with ZERO damage effects of her own. Her entire measurable contribution is the burst ATK ▲77.22% to Attacker allies plus recovery events; everything else in the kit is healing-magnitude or HP-state text that scope lock cannot express. Board movement will be ~0 on any comp with no Attacker."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Anne: Miracle Fairy (RL/Wind/Supporter/Burst II) is a healer-buffer: the only stat-bearing line in the whole kit is the burst's ATK ▲77.22%/10s to Attacker allies. Heals are emitted as recovery EVENTS (no HP amount — v1 models no HP pool) specifically so heal-synergy consumers still fire; the Incoming Healing ▲/▼ pair and the once-per-battle revive have no engine surface at scope lock and are recorded verbatim in `unmodeled`. Both HP-state gates ('above 90% HP') are trivially satisfied at scope lock (the boss deals no damage) and are therefore authored ungated rather than dropped."
}
```

## S6 BLIND OVERRIDE — SHORT DIFF vs THE DRIVER OVERRIDE

Load-bearing encodings CONVERGE 3/3: skill1 = hitCount{count:3} → alliesOfClass{cls:'Supporter'} → heal;
burst = burstCast → alliesOfClass{cls:'Attacker'} → heal AND atkPct 77.22 / durationSec 10. Both writers
key the burst lines to burstCast (never fullBurstEnter), both scope by class, both keep heal magnitudes
out of the engine, and both leave S2 + the revive un-enacted.

Presentational divergences (4), for the judge to weigh:
1. skill1 heal — BLIND ticks:1 (single event per proc) vs DRIVER ticks:5 intervalSec:1 (one event per
   second across the kit's 5-sec window ≈ the kit's per-attack healing at the ~1-shot/sec RL cadence).
   Both are event-only and presently inert (no Supporter-class recovery consumer exists in the roster);
   the driver's ⚑ documents the tick granularity as an estimate; the blind writer argued the window
   "has nothing to bound" while magnitudes are unmodeled.
2. skill2 — BLIND encodes two EMPTY-EFFECTS placeholder blocks (passive→allies, lastBullet→enemy) as a
   no-drop record; DRIVER leaves skill2 empty and carries both lines verbatim in `unmodeled` (the
   marciana/rapunzel repo convention for unrepresentable lines).
3. burst block shape — BLIND fuses heal + atkPct buff into ONE block (same trigger + target) and adds an
   empty-effects placeholder block for the revive line; DRIVER uses two blocks (heal; buff) and carries the
   revive verbatim in `unmodeled` with the ⚑ meta-defining flag + estimate + recipe + tier.
4. Neither divergence changes any sim behaviour today: empty-effects blocks emit nothing, the fused block
   applies the same two effects on the same frame to the same targets, and ticks:1 vs ticks:5 is
   unobservable without a Supporter recovery consumer.

---

## SECTION VI — DRIVER IMPLEMENTATION UNDER TEST

### VIa. Driver spec test (scripts/tests/units/anne-miracle-fairy.test.ts) — 22/22 GREEN vs the shipped override
```typescript
// PER-UNIT KIT SPEC — `anne-miracle-fairy` (Anne: Miracle Fairy, RL/Wind/Supporter, Burst II,
// cd 60s, ammo 6, chargeFrames 60, reloadFrames 141, Missilis). Kit-autonomy gauntlet
// 2026-08-19 — FROM-SCRATCH unit (no prior override; simSupported false until S9).
// Cross-family: S2b claude-fable-5 review; S5/S6 claude-opus-5 blind roles; S7 kimi-code/k3
// binding judge (results: scripts/kit-autonomy/results/anne-miracle-fairy.json).
//
// Anne is a PURE sustain/support kit and a Burst-II class-scoper: every line is either a
// RECOVERY EVENT (the engine models a heal as an event that fires teammates' on-recovery
// consumers, NOT a number — there is no HP pool / survivability sim), one CLASS-SCOPED ATK buff,
// or an unmodelable sustain line. She has NO damage line of her own.
//
// Kit (blablalink prose, data/characters.json → characters['anne-miracle-fairy'].skills, SL10):
//   S1 ■ after 3 normal attacks → all SUPPORTER allies:
//        Restores HP equal to 6.07% of attack damage. Lasts for 5 sec                [A2 — heal window]
//   S2 ■ all allies, activates when above 90% HP:
//        Incoming Healing ▲ 23.46%                                                     [UNMODELED — HP gate + no StatKey]
//      ■ last bullet hits while own HP ≥ 90% → all enemies:
//        Incoming Healing ▼ 78.93% for 10 sec                                          [UNMODELED — HP gate + no enemy-heal model]
//   BU ■ all ATTACKER allies:
//        Restores HP equal to 38.61% of the skill user's final max HP                  [A3 — heal event]
//        ATK ▲ 77.22% for 10 sec                                                       [A4 — the load-bearing line]
//      ■ 1 incapacitated Attacker ally at random:
//        Revives with 99% HP. Activates once per battle.                               [UNMODELED ⚑ meta-defining]
//
// One assertion group per kit line (A0..A6), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) and to ISOLATE a line — never to supply the encoding
// under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (a test that cannot fail under the nearest wrong model gates
// nothing — and almost all of anne's lines are offensively inert, so TOTALS alone cannot
// discriminate; the load-bearing evidence is the EVENT LOG, read through class scoping and the
// recovery CONSUMERS):
//   A1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME comp), and
//       removing the burst ATK line MOVES the two Attackers — so the inertness is live, not a
//       vacuous "nothing happens".
//   A2  the S1 heal is SUPPORTER-scoped: it never feeds an Attacker recovery probe (asuka), while
//       an all-allies counterfactual demonstrably does — the class exclusion is real, not a drop.
//       No Supporter on-recovery consumer exists in the roster, so the channel is faithfully
//       encoded but presently inert (biscuit B7 mirror). The every-3-normals trigger and the
//       5-sec window (ticks:5/intervalSec:1 ≈ one event per RL pull inside the window) are
//       pinned structurally (⚑ the per-second tick spacing approximates the kit's per-ATTACK
//       healing at the ~1-shot/sec RL cadence; no consumer exists to observe it behaviourally).
//   A3  the burst heal is an ATTACKER-scoped recovery event keyed to her OWN burst cast: with
//       asuka as the probe, the recovery delta is exactly one landing per anne burstCast.
//   A4  the burst ATK is class-scoped (the two Attackers only, never the two Supporters),
//       burstCast-keyed (the applications land on her CAST frames — fullBurstEnter would shift
//       them to the FB-window start; the #1 trap for a Burst-II unit), 10-sec timed, and LIVE:
//       removing it drops both Attackers' totals and moves nobody else's.
//   A5  the three unmodelable sustain lines (incoming-healing ▲23.46% HP-gate, enemy
//       incoming-healing ▼78.93%, the 99% revive) live verbatim in `unmodeled`, never an
//       `ignored` drop; none of their magnitudes appears as any buff; atkPct is the ONLY buff
//       stat anne originates.
//   A6  the liter-trap guard (biscuit precedent): neither heal feeds a DEFENDER recovery consumer
//       (crown) — anne's heals are class-scoped away from Defenders, so they cannot spuriously
//       inflate the team via crown.
//
// FIXTURES (all deterministic — no seed; event-log over totals). Anne is B2, so she must be the
// SOLE Burst II in every comp that asserts her burst lines (a second B2 contests the single B2
// slot → 0 burst casts → vacuous burst assertions):
//   MAIN  liter(Sup,B1) / anne(Sup,B2) / asuka(Atk,B3) / ada(Atk,B3), boss Fire, focus ada — two
//         Supporters + two Attackers make both class exclusions observable, and asuka doubles as
//         the Attacker recovery probe ("when recovery takes effect" → self ATK ▲96.98%). liter
//         emits no recovery (her S2 is a cover-HP NO-OP). asuka's own burst lifesteal self-feed
//         cancels in every delta assertion.
//   GUARD liter / crown(Def,B2 recovery consumer) / anne / asuka / ada — the Defender-consumer
//         negative. crown out-rotates anne at B2 here, which is fine: the assertion is that anne
//         contributes ZERO to crown's recovery count either way.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';
import type { CompOptions } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'anne-miracle-fairy';

/** MAIN fixture slot order: liter 0 / anne 1 / asuka 2 / ada 3. */
const LITER = 0;
const ANNE = 1;
const ASUKA = 2;
const ADA = 3;
const TEAM_SIZE = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const mainComp: CompOptions = {
  slugs: ['liter', SLUG, 'asuka', 'ada'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};

function runMain(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...mainComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- counterfactual / isolation patches (nearest-wrong models) --------------------------------
const stripHeal = (ov: any, slot: 'skill1' | 'burst') => {
  const before = ov[slot].reduce(
    (n: number, b: any) =>
      n + b.effects.filter((e: any) => e.kind === 'heal').length,
    0
  );
  ov[slot].forEach((b: any) => {
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
  });
  if (before === 0) {
    throw new Error(`anne ${slot} heal effect missing — fixture is stale`);
  }
};

/** A2 isolation: S1 removed entirely (burst lines kept). */
const anneNoS1 = withPatchedOverride(SLUG, (ov) => {
  if (!ov.skill1?.length) {
    throw new Error('anne skill1 missing — fixture is stale');
  }
  ov.skill1 = [];
});
/** A2 counterfactual (class-axis): the S1 heal targeting ALL allies, not Supporters only. */
const anneS1Allies = withPatchedOverride(SLUG, (ov) => {
  const b = (ov.skill1 ?? []).find((x: any) =>
    x.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('anne S1 heal block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** A3 isolation: burst heal removed (ATK line kept). */
const anneNoBurstHeal = withPatchedOverride(SLUG, (ov) =>
  stripHeal(ov, 'burst')
);
/** A4 reference: the burst ATK line removed entirely. */
const anneNoAtk = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (ov.burst.length === before) {
    throw new Error('anne burst atkPct block missing — fixture is stale');
  }
});
/** A4 counterfactual (class-axis): the burst ATK targeting ALL allies, not Attackers only. */
const anneAlliesAtk = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (!b) {
    throw new Error('anne burst atk block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** A4 counterfactual (trigger-axis): burst blocks keyed to fullBurstEnter, not her own cast. */
const anneFBEnter = withPatchedOverride(SLUG, (ov) => {
  if (!ov.burst?.length) {
    throw new Error('anne burst missing — fixture is stale');
  }
  for (const b of ov.burst) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
/** A6 guard: BOTH heals removed (S1 + burst). */
const anneNoHeals = withPatchedOverride(SLUG, (ov) => {
  stripHeal(ov, 'skill1');
  stripHeal(ov, 'burst');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runMain();
const noS1 = runMain({ [SLUG]: anneNoS1 });
const s1Allies = runMain({ [SLUG]: anneS1Allies });
const noBurstHeal = runMain({ [SLUG]: anneNoBurstHeal });
const noAtk = runMain({ [SLUG]: anneNoAtk });
const alliesAtk = runMain({ [SLUG]: anneAlliesAtk });
const fbEnter = runMain({ [SLUG]: anneFBEnter });
const bareInTeam = runMain({ [SLUG]: bareWeaponOverride(SLUG) });

const GUARD = ['liter', 'crown', SLUG, 'asuka', 'ada']; // crown = slot 1
function runGuard(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: GUARD,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
const guardBase = runGuard();
const guardNoHeals = runGuard({ [SLUG]: anneNoHeals });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** anne's own buffApply events for a stat (isolates her lines from liter's/asuka's same-stat buffs). */
const anneBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === ANNE && b.stat === stat);

/** The distinct holder slots a set of buffApply events reached, per firing frame. */
function holdersPerFrame(applied: BuffApply[]): Map<number, Set<number>> {
  const perFrame = new Map<number, Set<number>>();
  for (const b of applied) {
    if (b.targetIdx == null) {
      continue;
    }
    (
      perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
}

/** asuka's 'on-recovery → self ATK ▲96.98%' buff count — the Attacker recovery probe observable. */
const asukaRecovery = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.targetSlug === 'asuka' &&
      b.stat === 'atkPct' &&
      Math.abs(b.value - 96.98) < 0.01
  ).length;

/** crown's 'when recovery takes effect → team ATK ▲20.99%' buff count (crown = caster slot 1 in GUARD). */
const crownRecovery = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === 1 &&
      b.stat === 'attackDamagePct' &&
      Math.abs(b.value - 20.99) < 0.01
  ).length;

const anneBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === SLUG);
const anneShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && e.slug === SLUG);

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride(SLUG) as any;
if (!shipped) {
  throw new Error('anne-miracle-fairy has no override on disk — fixture is stale');
}

describe('anne-miracle-fairy — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: anne casts her Burst II and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: anne is the SOLE B2, so a comp that
    // never completes a chain would make zero Full Bursts and let A3/A4 pass on empty sets.
    expect(anneBursts(base.events).length).toBeGreaterThan(0);
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });

  it('anne fires enough normals for multiple S1 procs and deals weapon damage', () => {
    // 6-shot RL over 180s ⇒ many pulls; every 3 of them is an S1 proc. If this were <3 the A2
    // scoping discrimination would be untestable.
    expect(anneShots(base.events).length).toBeGreaterThanOrEqual(9);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('A1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // Anne has no damage line: with her kit swapped for the empty kit, her own total must not move
    // a point (the in-team bare run keeps liter/asuka/ada identical, so this isolates anne's own
    // contribution rather than comparing solo vs team).
    expect(unitOf(base.res, SLUG).totalDamage).toBe(
      unitOf(bareInTeam.res, SLUG).totalDamage
    );
  });

  it('DISCRIMINATING: removing the burst ATK line MOVES both Attackers (the team channel is live)', () => {
    // Proves the A1 inertness is not a vacuous "nothing happens": the burst ATK grant is a real
    // damage channel into the Attacker class, and stripping it must change their totals.
    expect(noAtk.totals.asuka).not.toEqual(base.totals.asuka);
    expect(noAtk.totals.ada).not.toEqual(base.totals.ada);
  });
});

describe('A2 — S1 every-3-normals heal is a SUPPORTER-scoped recovery window', () => {
  it('does NOT feed the Attacker recovery probe (asuka) — it is Supporter-scoped', () => {
    // The biscuit-B7 mirror: removing the S1 heal leaves asuka's recovery count unchanged, so the
    // S1 channel is not an Attacker recovery source. (No Supporter on-recovery consumer exists in
    // the roster, so the positive Supporter channel is faithfully encoded but presently inert.)
    expect(asukaRecovery(noS1.events)).toBe(asukaRecovery(base.events));
  });

  it('DISCRIMINATING (class): an all-allies S1 heal WOULD feed the Attacker probe', () => {
    // The nearest wrong reading — team-wide Fairy Dance — must measurably inflate asuka's recovery
    // count (every proc's window lands on her), i.e. the shipped class exclusion is one that the
    // generic model provably fails.
    expect(asukaRecovery(s1Allies.events)).toBeGreaterThan(
      asukaRecovery(base.events)
    );
  });

  it('stripping S1 leaves every total unchanged (event-only, no consumer to move)', () => {
    expect(noS1.totals).toEqual(base.totals);
  });

  it('structural pin: hitCount 3 → alliesOfClass Supporter → 5-tick/1s window', () => {
    // Behaviourally unobservable today (no Supporter recovery consumer exists), so the encoding's
    // shape is pinned statically: the every-3-normals trigger, the Supporter class scope, and the
    // 5-sec window approximated as one recovery event per second (⚑ the kit heals per ATTACK
    // inside the window; at the ~1-shot/sec RL cadence the two coincide).
    const s1 = shipped.skill1 ?? [];
    expect(s1.length).toBe(1);
    expect(s1[0].trigger).toEqual({ kind: 'hitCount', count: 3 });
    expect(s1[0].target).toEqual({ kind: 'alliesOfClass', cls: 'Supporter' });
    const heal = s1[0].effects.find((e: any) => e.kind === 'heal');
    expect(heal).toBeDefined();
    expect(heal.ticks).toBe(5);
    expect(heal.intervalSec).toBe(1);
  });
});

describe('A3 — burst heal is an ATTACKER-scoped recovery event on her OWN burst cast', () => {
  it('feeds the Attacker probe exactly one recovery landing per anne burstCast', () => {
    // With S1 scoped away from Attackers, the ONLY anne-sourced recovery asuka can receive is the
    // burst heal (one instant event per cast — the kit's burst line carries no "for N sec"
    // clause), so the delta against the heal-removed run is exactly the cast count.
    const delta =
      asukaRecovery(base.events) - asukaRecovery(noBurstHeal.events);
    const casts = anneBursts(base.events).length;
    expect(casts).toBeGreaterThan(0);
    expect(
      delta,
      `${delta} recovery landings vs ${casts} casts — a windowed/mistargeted heal diverges`
    ).toBe(casts);
  });

  it('structural pin: burstCast → alliesOfClass Attacker → single heal event', () => {
    const healBlocks = (shipped.burst ?? []).filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(healBlocks.length).toBe(1);
    expect(healBlocks[0].trigger).toEqual({ kind: 'burstCast' });
    expect(healBlocks[0].target).toEqual({
      kind: 'alliesOfClass',
      cls: 'Attacker',
    });
  });
});

describe('A4 — burst ATK ▲77.22% for 10s is Attacker-scoped and own-cast keyed', () => {
  const applied = anneBuffs(base.events, 'atkPct').filter(
    (b) => b.value === 77.22
  );

  it('is 77.22% with a 10-sec timed expiry, fired by her burst casts', () => {
    expect(
      applied.length,
      'no anne burst atkPct buff was applied'
    ).toBeGreaterThan(0);
    // One FIRING per own cast, each reaching both Attackers — so the distinct firing frames are
    // exactly the cast frames (holders-per-frame is asserted below).
    expect([...new Set(applied.map((b) => b.frame))].length).toBe(
      anneBursts(base.events).length
    );
    for (const b of applied) {
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(b.durationShots).toBeNull();
    }
  });

  it('reaches ONLY the Attacker allies (asuka + ada), never the Supporters', () => {
    for (const [, holders] of holdersPerFrame(applied)) {
      expect([...holders].sort(), 'a firing reached a non-Attacker').toEqual([
        ASUKA,
        ADA,
      ]);
    }
  });

  it('lands on her CAST frames (burstCast, not fullBurstEnter)', () => {
    // The Burst-II trap: fullBurstEnter would shift the applications to the FB-window start (after
    // the stage-3 cast). Every application frame must be one of anne's burstCast frames.
    const castFrames = new Set(anneBursts(base.events).map((c: any) => c.frame));
    for (const b of applied) {
      expect(
        castFrames.has(b.frame),
        `atkPct application at frame ${b.frame} is not an anne cast frame`
      ).toBe(true);
    }
  });

  it('DISCRIMINATING (class): an all-allies target would reach the whole team', () => {
    const generic = anneBuffs(alliesAtk.events, 'atkPct').filter(
      (b) => b.value === 77.22
    );
    const reached = new Set<number>();
    for (const b of generic) {
      if (b.targetIdx != null) {
        reached.add(b.targetIdx);
      }
    }
    expect(
      reached.size,
      'all-allies counterfactual must reach more than the 2 Attackers'
    ).toBe(TEAM_SIZE);
  });

  it('DISCRIMINATING (trigger): fullBurstEnter applications do NOT land on her cast frames', () => {
    const castFrames = new Set(anneBursts(base.events).map((c: any) => c.frame));
    const generic = anneBuffs(fbEnter.events, 'atkPct').filter(
      (b) => b.value === 77.22
    );
    expect(generic.length).toBeGreaterThan(0);
    const offFrames = generic.filter((b) => !castFrames.has(b.frame));
    expect(
      offFrames.length,
      'a fullBurstEnter keying must shift the application frames off the casts'
    ).toBeGreaterThan(0);
  });

  it('is live and cleanly scoped: removing it drops ONLY the two Attackers', () => {
    expect(noAtk.totals.asuka).not.toEqual(base.totals.asuka);
    expect(noAtk.totals.ada).not.toEqual(base.totals.ada);
    expect(noAtk.totals.liter).toEqual(base.totals.liter);
    expect(noAtk.totals[SLUG]).toEqual(base.totals[SLUG]);
  });
});

describe('A5 — the unmodelable sustain lines are documented, not dropped or fabricated', () => {
  it('the only buff stat anne originates is atkPct (no sustain stat is invented)', () => {
    // Her kit text carries two Incoming-Healing lines and a revive; none is representable in v1,
    // so atkPct is the ONLY buff she should ever emit.
    expect([...new Set(anneBuffsAll(base.events).map((b) => b.stat))]).toEqual([
      'atkPct',
    ]);
  });

  it('23.46 / 78.93 (incoming healing) never appear as any buff value', () => {
    expect(buffs(base.events).some((b) => b.value === 23.46)).toBe(false);
    expect(buffs(base.events).some((b) => b.value === 78.93)).toBe(false);
  });

  it('all gap lines live verbatim in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill2?.length).toBe(2);
    expect(shipped.unmodeled.skill2.join(' ')).toContain('23.46');
    expect(shipped.unmodeled.skill2.join(' ')).toContain('78.93');
    expect(shipped.unmodeled.burst.join(' ')).toContain('Revives with 99% HP');
    expect(shipped.unmodeled.burst.join(' ')).toContain('38.61');
    expect(shipped.unmodeled.skill1.join(' ')).toContain('6.07');
    expect((shipped as any).ignored).toBeUndefined();
  });
});

describe('A6 — liter-trap guard: no anne heal feeds a DEFENDER recovery consumer', () => {
  it("crown's recovery buff count is identical with anne's heals present vs removed", () => {
    // crown (a Defender) IS fed in this comp — her own hitCount heal self-feeds her consumer — so
    // the equality below is not vacuous; anne's class-scoped heals simply never reach a Defender.
    expect(crownRecovery(guardBase)).toBeGreaterThan(0);
    expect(crownRecovery(guardBase)).toBe(crownRecovery(guardNoHeals));
  });
});

describe('structural B2 pins (S2b-pre-registered traps)', () => {
  it('every burst block is keyed to burstCast, never fullBurstEnter', () => {
    // The load-bearing trap for a Burst-II unit beside another B2: fullBurstEnter would over-fire
    // on rotations another Burst II took. Asserted statically so it holds regardless of fixture.
    for (const b of shipped.burst ?? []) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });

  it('no `shield` effect anywhere — no sustain line is laundered into shielded events', () => {
    // A shield would emit shielded events and falsely satisfy teammates' requiresShielded gates
    // (e.g. asuka's S2). Anne's kit grants no shield; the sustain lines are heals or unmodeled.
    const kinds = [
      ...(shipped.skill1 ?? []),
      ...(shipped.skill2 ?? []),
      ...(shipped.burst ?? []),
    ].flatMap((b: any) => b.effects.map((e: any) => e.kind));
    expect(kinds).not.toContain('shield');
  });
});

/** All of anne's buffApply events (any stat). */
function anneBuffsAll(evs: SimEvent[]) {
  return buffs(evs).filter((b) => b.casterIdx === ANNE);
}
```

### VIb. Driver override (src/skills/overrides/anne-miracle-fairy.json)
```json
{
  "slug": "anne-miracle-fairy",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 3 },
      "target": { "kind": "alliesOfClass", "cls": "Supporter" },
      "effects": [{ "kind": "heal", "ticks": 5, "intervalSec": 1 }]
    }
  ],
  "skill2": [],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "alliesOfClass", "cls": "Attacker" },
      "effects": [{ "kind": "heal" }]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "alliesOfClass", "cls": "Attacker" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 77.22, "durationSec": 10 }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Restores HP equal to 6.07% of attack damage. — magnitude only: the HP amount has no engine consumer (no HP pool), so the number is unmodeled; the recovery EVENT is modeled (heal, skill1 slot), which is the board-relevant half — on-recovery consumers read the event, never the amount."
    ],
    "skill2": [
      "■ Affects all allies. Activates when above 90% HP.\nIncoming Healing ▲ 23.46%. — doubly unrepresentable: the self-HP gate has no HP pool to read, and there is no incoming-healing StatKey nor any HP pool for it to amplify. Inert at v1 scope (healing has no engine model).",
      "■ Activates when the last bullet hits the target while this unit's HP is at 90% or above. Affects all enemies.\nIncoming Healing ▼ 78.93% for 10 sec. — unrepresentable: the self-HP gate has no HP pool to read, and there is no enemy-incoming-healing model (the boss never heals — no enemy healing mechanic exists). Inert at v1 scope. NOT pattern-matchable into a damageTakenPct boss debuff — that is a DIFFERENT mechanic and would wrongly credit the whole team (cross-family S2b flagged this as the kit's most dangerous misread)."
    ],
    "burst": [
      "Restores HP equal to 38.61% of the skill user's final max HP. — magnitude only: the HP amount has no engine consumer (no HP pool), so the number is unmodeled; the recovery EVENT is modeled (heal, burst slot), which is the board-relevant half — on-recovery consumers read the event, never the amount.",
      "■ Affects 1 incapacitated Attacker ally unit(s) at random.\nRevives with 99% HP. Activates once per battle. — ⚑ UNMODELED, meta-defining: the v1 engine has no death/revive/HP-pool primitive (immortal boss, no ally is ever incapacitated), so the condition can never fire. Offensively inert at scope; in real play this line is the reason Anne is fielded. Estimate: zero damage impact — the entire raid value of the kit is unmodeled. Recipe: needs an HP pool + a death/revive model before it can be enacted. Tier: meta-defining (rapunzel resurrect precedent)."
    ]
  },
  "caveats": [
    "skill1: the 5-sec Fairy Dance window is approximated as one recovery event per second (ticks:5 intervalSec:1) — the kit heals per ATTACK inside the window ('6.07% of attack damage'); at the ~1-shot/sec RL cadence (chargeFrames 60) the two coincide, so the per-window event count tracks the kit while the cadence is datamine-estimated. ⚑ presently inert: no Supporter-class on-recovery consumer exists in the roster, so nothing reads these events today (biscuit's Supporter-lifesteal precedent class).",
    "skill1/burst: cadence tuple (mandatory ⚑, datamine-unreliable): RL pullsPerSec / reloadFrames 141 / chargeFrames 60 — drives the every-3-normals S1 proc cadence and gauge fill; NOT escalated (6-shot RL at class charge rate — quiry precedent). Recipe: rounds/min + reload gap from any anne-miracle-fairy focus video.",
    "burst: both lines key to her OWN burst cast (burstCast, not fullBurstEnter — the Burst-II trap); the ATK buff therefore applies ~0.9s BEFORE the Full Burst window opens (the stage-3 cast + FB-start lag rides inside its 10s window), which is the kit-faithful coverage, not an approximation.",
    "skill2: the 'above 90% HP' / '90% or above' gates would be permanently satisfied at scope lock (nobody takes damage), but both lines are unmodeled regardless (no incoming-healing StatKey, no enemy-healing model), so the gate representation is moot."
  ],
  "note": "No real-fight recording yet — every ⚑ below is an unmeasured estimate. Structure is test-pinned (scripts/tests/units/anne-miracle-fairy.test.ts). anne-miracle-fairy (Anne: Miracle Fairy) — RL/Wind/Supporter/Burst II, cd 60s, ammo 6, chargeFrames 60, reloadFrames 141, Missilis. NEW unit (no base counterpart) — a PURE sustain/support kit: no damage effect, no DoT, no weapon swap, no ammo/reload/fire-rate modifier, no gauge line. MODELED TODAY: (1) skill1 Fairy Dance — every 3 normal attacks (hitCount 3; hitsPerShot 1 so hits == pulls) opens a 5-sec healing window for all SUPPORTER-class allies (includes Anne herself): encoded as a heal effect with ticks:5 intervalSec:1 (one recovery event per second across the window ≈ the kit's per-attack healing at the ~1-shot/sec RL cadence; ⚑ granularity estimate). The 6.07%-of-attack-damage MAGNITUDE rides in unmodeled (no HP pool) — the block exists for its TANDEM value (it would fire Supporter-class teammates' 'recovery' triggers); no Supporter on-recovery consumer exists in the roster today, so the channel is faithfully encoded but presently inert. (2) burst line 1 — all ATTACKER-class allies: heal on her own burstCast (one recovery event per cast; the 38.61%-of-caster-final-max-HP magnitude unmodeled, event-only like every heal). (3) burst line 2 — all ATTACKER-class allies: ATK ▲ 77.22% for 10s (atkPct, plain target-% stat; the kit's only damage-relevant line), keyed to her OWN burstCast — the Burst-II trap (fullBurstEnter would shift the window ~0.9s late and mis-attribute rotations another Burst II took) is pinned structurally and by frame identity in the spec. DELIBERATELY UNMODELED (verbatim in `unmodeled`): both skill2 lines — the allies' Incoming Healing ▲ 23.46% (self-HP >90% gate + no incoming-healing StatKey + no HP pool: doubly unrepresentable, inert) and the enemies' Incoming Healing ▼ 78.93%/10s on last-bullet-with-own-HP≥90% (HP gate + no enemy-healing model — the boss never heals; explicitly NOT a damageTakenPct debuff, which would be the catastrophic pattern-match); and the burst RESURRECT of 1 incapacitated Attacker at 99% HP once per battle (⚑ meta-defining: no death/revive/HP-pool primitive — rapunzel precedent; zero damage impact, the entire real-play value of the kit unmodeled, recipe recorded). EVIDENCE TIER: all live values are kit-text-literal (3 / 5-sec / 77.22 / 10s — DATAMINED L10); the only estimates are the S1 tick granularity and the cadence tuple. FAITHFULNESS CORE: damage-neutrality for her OWN damage — she sims byte-identical to the bare weapon for her own total (proven in the spec, group A1); her board footprint is entirely cross-unit: the Attacker-class ATK grant (live) plus two class-scoped recovery channels (tandem-only). TIER 2 (class-scoped buffs ×3 lines, burstCast-vs-fullBurstEnter trigger identity, meta-defining revive ⚑). Kit-autonomy gauntlet 2026-08-19."
}
```

### VIc. S2d verification
```

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m22 passed[39m[22m[90m (22)[39m
[2m   Start at [22m 22:10:04
[2m   Duration [22m 385ms[2m (transform 89ms, setup 0ms, import 328ms, tests 7ms, environment 0ms)[22m

```
