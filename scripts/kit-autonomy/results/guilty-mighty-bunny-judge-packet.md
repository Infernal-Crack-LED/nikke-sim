# S7 RECONCILING-JUDGE PACKET — `guilty-mighty-bunny` (Guilty: Mighty Bunny, SR/Attacker/Water/Burst III)

Built 2026-10-02 by scripts/kit-autonomy/build-judge-packet.ts. Sections: 1 contract · 2 mechanics SSOT · 3 ground truth · 4 S2b review(s) · 5 S5 blind test · 6 S6 blind override · 7 driver implementation · 8 S2d matrix + driver notes.

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
  "slug": "guilty-mighty-bunny",
  "name": "Guilty: Mighty Bunny",
  "weapon": "SR",
  "burst": "III",
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Missilis",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "normalAttackMultiplier": 69.04,
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
■ Activates at the start of battle. Affects self.
ATK ▲ 20.1%. This effect is continuous.
■ Activates at the start of battle and when Full Charge is maintained for 1 or more seconds while this unit is not in the Mighty Stomp state. Affects self.
Initiates a new Bunny Mode based on the current mode.
Activates if this unit is in the Bunny Mode: Stance state.
Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.
Activates if this unit is not in the Bunny Mode: Stance state.
Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed.
■ Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state.
Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.
■ Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state.
Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed.
```

### skill2

```text
■ Activates only if this unit is in the Bunny Mode: Engage state.
Chain Release
Function: Changes some attacks' damage into true damage.
Effect 1: Affects self. Normal attacks deal true damage. This effect is continuous and cannot be removed.
Effect 2: Affects self. Mighty Stomp deals true damage. This effect is continuous and cannot be removed.
Effect 3: Activates when landing a Full Charge attack. Affects the target. Deals 370.08% of final ATK as true damage.
■ Activates only when this unit is in the Bunny Mode: Stance state.
Chain Enhance
Function: Enhances this unit's offensive capabilities.
Effect 1: Affects self. Attack Damage ▲ 20.45%. This effect is continuous and cannot be removed.
Effect 2: Affects self. Charge Damage ▲ 40%. This effect is continuous and cannot be removed.
Effect 3: Activates when landing a Full Charge attack. Affects the target. Deals 450.89% of final ATK as additional damage.
```

### burst

```text
■ Affects self.
Mighty Stomp: Changes the weapon in use
Charge Time: Fixed at 1.5 sec
Damage: 101.3% of final ATK
Full Charge Damage: 250%
Duration: 1 rounds
Additional Effect 1: Charge Damage ▲ 1400% for 1 rounds.
Additional Effect 2: Attack Damage ▲ 77.35% for 10 sec.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "guilty-mighty-bunny",
  "leakDetected": null,
  "notes_on_leak_check": "The effect schema's highestAllyAtkPct comment names base `guilty` ('Mind If I Borrow This?') and a targetDef example names `soda-twinkling-bunny` — both are OTHER units (base ≠ variant per rule 1), not leaks of this unit's answer. No magnitude or mechanic of guilty-mighty-bunny appears in the redacted methodology.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle … ATK ▲ 20.1%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK, unscoped (not normal/charge-only)",
      "durationSemantics": "permanent ('This effect is continuous')",
      "triggerIdentity": "battleStart (or passive — equivalent for a continuous self buff)",
      "targetSet": "self only",
      "nearestWrongModel": "targeted at allies, or given a finite durationSec",
      "distinguishingAssertion": "exactly one buffApply {stat:'atkPct', value:20.1} with casterIdx===targetIdx (guilty-mighty-bunny) and no finite expiry; zero atkPct-20.1 buffApply events with targetSlug !== 'guilty-mighty-bunny'",
      "inertness": "must not appear on liter/crown/helm; must not restack or refresh on any later trigger",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge maintained 1+ sec → new Bunny Mode",
      "disposition": "GAP",
      "scope": "self mode state machine: battle start → Stance (unit starts in neither, so the not-in-Stance branch fires); thereafter each toggle flips Stance ↔ Engage",
      "durationSemantics": "each mode 'continuous and cannot be removed' until the next toggle",
      "triggerIdentity": "battleStart, plus a MAINTAINED-full-charge-for-≥1s condition gated on NOT being in the Mighty Stomp (burst swap) state — i.e. swapGate:'unswapped' on any toggle block. This is NOT the fullCharge trigger: in-sim charge weapons release at full charge immediately, so a bare fullCharge trigger would toggle every pull, which the kit does not say",
      "targetSet": "self",
      "nearestWrongModel": "toggle keyed to fullCharge/shotFired so the mode flips every pull (alternating skill2 branches shot-by-shot), or a free/instant toggle that ignores the ≥1s hold's DPS time cost. The faithful cheap encoding is static user-selectable modes (top-level `modes`, Stance first/default since Stance is the battle-start state), with any dynamic toggle flagged ⚑ for the 1s-hold shot-economy cost",
      "distinguishingAssertion": "under one selected mode, every skill2-sourced event across the whole run belongs to ONE branch: e.g. in Stance mode, zero damage events with flavor true from srcSlot skill2 and zero 370.08-mult events; the per-shot rider mult is constant (never alternates 450.89/370.08 between consecutive full-charge pulls)",
      "inertness": "mode machinery itself grants no stats; toggling must not refill the magazine or emit damage",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "enters Engage → allies in Stance → Engage",
      "disposition": "UNMODELED",
      "scope": "cross-unit mode synchronization — affects only allies who are themselves in a Bunny Mode state",
      "durationSemantics": "continuous, cannot be removed",
      "triggerIdentity": "on this unit entering Bunny Mode: Engage",
      "targetSet": "all allies currently in Bunny Mode: Stance (i.e. other bunny-mode carriers only)",
      "nearestWrongModel": "encoding it as a generic ally buff — it is a mode write on OTHER bunny-mode units and is inert in any comp without a second Bunny Mode carrier (controlComp has none)",
      "distinguishingAssertion": "zero buffApply/selfStatus events targeting liter/crown/helm attributable to this line; totals(res) for every non-carry slug identical with the line present vs absent",
      "inertness": "must move nothing on the graded comp; document verbatim in unmodeled.skill1",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "enters Stance → allies in Engage → Stance",
      "disposition": "UNMODELED",
      "scope": "mirror of the Engage-sync line",
      "durationSemantics": "continuous, cannot be removed",
      "triggerIdentity": "on this unit entering Bunny Mode: Stance",
      "targetSet": "all allies currently in Bunny Mode: Engage",
      "nearestWrongModel": "same as the sibling line — any encoding that touches non-bunny allies",
      "distinguishingAssertion": "same inertness assertion as the Engage-sync line",
      "inertness": "no effect on the graded comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "[Engage] Normal attacks deal true damage",
      "disposition": "FAITHFUL",
      "scope": "normal attacks only — a damage FLAVOR change, not a damage amount",
      "durationSemantics": "continuous while in Engage mode",
      "triggerIdentity": "passive, mode-gated on Engage (trueNormalsModes:['engage'] or equivalent) — NOT a buff with a duration",
      "targetSet": "self",
      "nearestWrongModel": "encoded as a trueDamagePct damage buff (adds damage that doesn't exist), or applied unconditionally in both modes (hasTrueNormals static)",
      "distinguishingAssertion": "in Engage mode every normal-attack damage event is true-flavored; in Stance mode zero normal-attack events are true-flavored; total damage unchanged by the flavor alone absent any trueDamagePct ally buff",
      "inertness": "flavor change must add no damage by itself in controlComp (no ally grants trueDamagePct there)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Engage] Mighty Stomp deals true damage",
      "disposition": "FAITHFUL",
      "scope": "the burst weaponSwap shot only",
      "durationSemantics": "continuous while in Engage mode",
      "triggerIdentity": "passive, mode-gated on Engage; rides the swap (trueNormalsModes covers swap shots via the swap.trueNormals || hasTrueNormals read, so no separate swap flag needed)",
      "targetSet": "self",
      "nearestWrongModel": "setting weaponSwap.trueNormals unconditionally so the Stomp is true even in Stance mode",
      "distinguishingAssertion": "the swap-sourced Stomp shot's damage event is true-flavored in Engage mode and NOT true-flavored in Stance mode",
      "inertness": "no damage magnitude change from the tag alone",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Engage] Full Charge → 370.08% true dmg",
      "disposition": "FAITHFUL",
      "scope": "rider on LANDING a Full Charge attack; for an unswapped SR every pull is a full-charge release, so effectively per-pull while unswapped (landing residue is a documented caveat, not a model change)",
      "durationSemantics": "instant damage per trigger, no duration",
      "triggerIdentity": "fullCharge trigger, mode-gated Engage; rider conventions: FB by timing (noFb absent), noRange forced on riders, crits at caster rate, NO core (text lacks 'core strike')",
      "targetSet": "enemy (the target)",
      "nearestWrongModel": "folding it into chargeDamagePct (≈370.08/chargeMult additive points) — the fold cores and takes range, over-crediting every core hit; or leaving it mode-ungated so it stacks with the Stance 450.89% rider",
      "distinguishingAssertion": "in Engage mode each full-charge pull is followed by a damage event with mult 370.08, flavor true, srcSlot skill2, rangeApplied false; in Stance mode the count of 370.08-mult events is ZERO",
      "inertness": "must not fire during the Mighty Stomp swap unless the Stomp itself is a full-charge pull (it is — charge-weapon swap releases at full charge; verify one 370.08 rider accompanies the Stomp in Engage)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Stance] Attack Damage ▲ 20.45%",
      "disposition": "FAITHFUL",
      "scope": "generic Damage Up bucket (attackDamagePct), all own damage",
      "durationSemantics": "continuous while in Stance mode",
      "triggerIdentity": "passive, mode-gated Stance",
      "targetSet": "self",
      "nearestWrongModel": "active in both modes (double-dipping with Engage's true-damage branch), or scoped to normal attacks only",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:20.45} present on self in Stance mode, ABSENT in Engage mode",
      "inertness": "never applied to allies; never stacks with itself",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Stance] Charge Damage ▲ 40%",
      "disposition": "FAITHFUL",
      "scope": "charge bucket, additive percentage points (chargeDamagePct, NOT chargeDamageMultPct — text is plain 'Charge Damage ▲')",
      "durationSemantics": "continuous while in Stance mode",
      "triggerIdentity": "passive, mode-gated Stance",
      "targetSet": "self",
      "nearestWrongModel": "chargeDamageMultPct (scales by BASE charge damage — different arithmetic), or present in Engage mode",
      "distinguishingAssertion": "buffApply {stat:'chargeDamagePct', value:40} on self in Stance mode only; a Stance charge shot's charge-bucket term exceeds the Engage-mode equivalent by exactly the +40 additive points",
      "inertness": "no effect on the skill2 riders' own magnitudes (riders are flatDamage, not charge-bucket, unless charge:true is wrongly set)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Stance] Full Charge → 450.89% addl dmg",
      "disposition": "FAITHFUL",
      "scope": "rider on landing a Full Charge attack; 'additional damage', NOT true-flavored",
      "durationSemantics": "instant per trigger",
      "triggerIdentity": "fullCharge trigger, mode-gated Stance; same rider conventions (FB by timing, noRange, crit yes, core no)",
      "targetSet": "enemy",
      "nearestWrongModel": "flavor 'true' copied from the Engage sibling (would wrongly eat ally trueDamagePct and mislabel the bucket), or both riders live at once",
      "distinguishingAssertion": "in Stance mode each full-charge pull is followed by a damage event with mult 450.89, NOT true-flavored, rangeApplied false; zero 450.89 events in Engage mode; never both a 450.89 and a 370.08 event on the same pull in any mode",
      "inertness": "must not scale with the +40 chargeDamagePct (it is flatDamage off final ATK, not a charge-bucket hit)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Mighty Stomp: changes weapon, Dur 1 rounds",
      "disposition": "FAITHFUL",
      "scope": "weaponSwap on own burst cast: damagePct 101.3, chargeMultPct 250, chargeTimeClamp 1.5s; 'Duration: 1 rounds' is a SHOT budget — maxShots:1, ending right after the single Stomp shot",
      "durationSemantics": "uses-based (maxShots:1), NOT wall-clock. A durationSec:1 misread is fatal here: the fixed 1.5s charge exceeds 1s, so a 1-second swap would fire ZERO Stomp shots",
      "triggerIdentity": "burstCast (this unit's OWN burst block) — never fullBurstEnter; with helm as a second B3 in controlComp the two diverge whenever helm's rotation completes the chain",
      "targetSet": "self (weapon override)",
      "nearestWrongModel": "fullBurstEnter-keyed swap (fires on helm's rotations too — over-credits), or durationSec:1 (zero Stomp shots), or durationSec:10 (multiple Stomp shots)",
      "distinguishingAssertion": "exactly ONE swap-sourced shot per guilty-mighty-bunny burstCast event, with the charge-bucket math reflecting chargeMultPct 250 and a 1.5s (90-frame) charge; count(Stomp shots) === count(guilty's own burstCast events) and NOT count(fullBurstStart events)",
      "inertness": "the swap must not refill the base SR magazine beyond the real-weapon-change refill rule; the mode-toggle (skill1) must be gated OFF while swapped (not in Mighty Stomp state clause)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Charge Damage ▲ 1400% for 1 rounds",
      "disposition": "FAITHFUL",
      "scope": "charge bucket, additive points, self",
      "durationSemantics": "ROUND count — durationShots:1. The buff exists to supercharge the single Stomp shot and must lapse right after it; 'for 1 rounds' is never durationSec:1",
      "triggerIdentity": "burstCast, self, simultaneous with the swap so the Stomp (the next round fired) consumes it",
      "targetSet": "self",
      "nearestWrongModel": "durationSec:10 (or any time window) — the buff would then also feed the base SR's post-swap charge shots, a massive over-credit (1400 additive points on every charge shot for 10s)",
      "distinguishingAssertion": "buffApply {stat:'chargeDamagePct', value:1400, durationShots:1}; the Stomp shot's charge-bucket term includes the +1400; the FIRST base-weapon charge shot after the swap ends does NOT (its damage matches a no-1400 baseline)",
      "inertness": "must not apply to the skill2 flatDamage riders; must not refresh on full-burst entries guilty did not cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 77.35% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "generic Damage Up (attackDamagePct), all own damage incl. riders",
      "durationSemantics": "wall-clock 10 seconds (durationSec:10) — the one genuinely time-bound line in the kit",
      "triggerIdentity": "burstCast, self",
      "targetSet": "self",
      "nearestWrongModel": "durationShots:10 (symmetry error with Additional Effect 1 — would stretch across reloads far past 10s on a slow SR cadence), or allies-targeted",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:77.35} on self at each own burst cast with expiresFrame ≈ cast+10s and NO durationShots; a shot fired >10s after cast (pre-next-burst) shows no 77.35 term",
      "inertness": "self only; stacks additively with the Stance 20.45 while both live (two distinct keys), never merges into one 97.8 buff",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:atk-20.1-continuous",
    "skill1:bunny-mode-state-machine",
    "skill2:engage-true-normals",
    "skill2:engage-stomp-true",
    "skill2:engage-fullcharge-370.08-true-rider",
    "skill2:stance-attackDamage-20.45",
    "skill2:stance-chargeDamage-40",
    "skill2:stance-fullcharge-450.89-rider",
    "burst:mighty-stomp-weaponSwap-1-round",
    "burst:chargeDamage-1400-for-1-round",
    "burst:attackDamage-77.35-for-10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.",
      "Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state. Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Three places I expect a shared-prior misread the driver must reconcile. (1) THE MODE MACHINE: battle start puts the unit in Stance (she starts in neither state, so the not-in-Stance branch fires). The toggle condition is 'Full Charge MAINTAINED for 1 or more seconds' — holding past full charge, not releasing at it — so a bare fullCharge trigger that flips the mode every pull is wrong twice over (wrong trigger semantics, and it ignores the ~1s/toggle DPS time cost, which is a ⚑ shot-economy estimate if dynamic toggling is modeled at all). The clean encoding is static top-level `modes` with Stance as the battle-start default and Engage selectable; whichever the driver shipped, the two skill2 branches must be mutually exclusive — assert no run shows both a 20.45 attackDamagePct buffApply and a true-flavored skill2 rider. (2) BURST DURATIONS: 'Duration: 1 rounds' on the swap and 'Charge Damage ▲ 1400% for 1 rounds' are both ROUND counts (maxShots:1 / durationShots:1). The durationSec misreads fail in opposite directions — a 1s swap window fires ZERO Stomps (fixed 1.5s charge > 1s), while a 10s 1400% window feeds post-swap base charge shots. Both are cheap to assert from the event log. (3) BURST TRIGGER: the whole burst block is burstCast-keyed (self mode in her OWN burst block); controlComp includes helm as a second B3, so a fullBurstEnter misread fires on helm's rotations and over-credits — assert Stomp count equals guilty's own burstCast count. Secondary: the two full-charge riders are flatDamage off final ATK (not charge-bucket folds — a fold would core and take range), noRange, no core, mode-gated, and never co-fire on one pull. Element: Water carry vs the fixture's Fire boss means the clean ×1.10 applies; nothing in this kit carries an elemAdvantageDamagePct line. All magnitudes are literal kit text (DATAMINED); the only ⚑ items are the mode-toggle cadence/economy and the rider landing-vs-performing residue, both conventions rather than invented numbers. I could not save to scripts/kit-autonomy/reviews/guilty-mighty-bunny.test-review.json — this session has no tool access, so the JSON is returned inline only.",
  "model": "claude-fable-5"
}
```

### 4b. Second S2b reviewer (claude-fable-5-1, blind — Tier-2 ×2 models)

```json
{
  "slug": "guilty-mighty-bunny",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ start of battle. Affects self. ATK ▲ 20.1%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK stat (atkPct), not scoped to normals/charge",
      "durationSemantics": "continuous / whole fight — no durationSec, no durationShots",
      "triggerIdentity": "battleStart (or passive); no gate, no FB gate",
      "targetSet": "self only",
      "nearestWrongModel": "casterAtkPct (flat-resolved) or a timed battleStart with a durationSec; or applying it to allies",
      "distinguishingAssertion": "exactly one buffApply {stat:'atkPct', value:20.1, casterIdx===targetIdx===carryIdx} at frame 0 with no finite expiresFrame; the carry's final shot still carries it (totals unchanged if the buff is force-expired only after the last frame). Patching value→0 lowers totals(res)[slug] by ≈ 1/1.201 on the ATK-scaled share.",
      "inertness": "no buffApply of atkPct from this block on liter/crown/helm targetIdx; value must be the raw 20.1 (not a flat ATK number)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ Full Charge maintained ≥1 sec → new Bunny Mode",
      "disposition": "FAITHFUL",
      "scope": "self mode state machine: two exclusive states Stance / Engage; battle start → Stance (she is 'not in Stance' at t=0)",
      "durationSemantics": "continuous and cannot be removed — a mode persists until the player toggles; toggle requires over-holding a full charge ≥1 s (a DPS cost ⚑ unmodeled)",
      "triggerIdentity": "player-choice toggle, NOT a per-shot fullCharge trigger: the sim releases at full charge, so a fullCharge-keyed flip would toggle every pull. Model as top-level modes:['stance','engage'] with 'stance' FIRST (default = battle-start state)",
      "targetSet": "self",
      "nearestWrongModel": "(a) a fullCharge-triggered selfStatus flip (mode alternates every shot, so both S2 payloads interleave); (b) default mode 'engage' (kit's t=0 state is Stance); (c) modeling the 1 s hold as a chargeTime penalty applied every shot",
      "distinguishingAssertion": "with no mode selected, the event log shows ONLY Stance payloads for the whole fight (buffApply attackDamagePct 20.45 and chargeDamagePct 40 present; zero skill-bucket damage events with mult 370.08 / flavor 'true'); shot count equals the base SR cadence (6 rounds per 141f reload at 60f charge) with no extra 60f hold per pull. Selecting 'engage' flips those sets wholesale, never per-shot.",
      "inertness": "mode selection must not change the carry's shot count or charge frames; neither mode emits a selfStatus visible to other units",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ enters Engage. Affects all allies in Stance",
      "disposition": "UNMODELED",
      "scope": "cross-unit mode sync: allies who carry Bunny Mode follow this unit into Engage",
      "durationSemantics": "continuous, cannot be removed",
      "triggerIdentity": "on this unit's own mode change (self mode entry)",
      "targetSet": "allies in Bunny Mode: Stance (only other Bunny-Mode carriers qualify)",
      "nearestWrongModel": "encoding it as a buff on all allies, or as a selfStatus allies read; inert in controlComp (liter/crown/helm carry no Bunny Mode)",
      "distinguishingAssertion": "zero buffApply events with casterIdx===carryIdx and targetIdx!==carryIdx from skill1 in controlComp",
      "inertness": "must emit nothing on non-Bunny-Mode allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ enters Stance. Affects all allies in Engage",
      "disposition": "UNMODELED",
      "scope": "cross-unit mode sync (mirror of the line above)",
      "durationSemantics": "continuous, cannot be removed",
      "triggerIdentity": "on this unit's own mode change",
      "targetSet": "allies in Bunny Mode: Engage",
      "nearestWrongModel": "same as above",
      "distinguishingAssertion": "same as above — no ally-targeted skill1 buffApply in controlComp",
      "inertness": "must emit nothing on non-Bunny-Mode allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "[Engage] E1: Normal attacks deal true damage",
      "disposition": "FAITHFUL",
      "scope": "normal-attack flavor tag only (true); NOT a damage magnitude; in-engine only ally trueDamagePct buffs read it (DEF is unmodeled, so bypass-DEF value is uncredited ⚑ engine limitation)",
      "durationSemantics": "continuous, cannot be removed — whole fight while in Engage",
      "triggerIdentity": "mode gate only (mode:'engage' / top-level trueNormalsModes:['engage']); no trigger",
      "targetSet": "self",
      "nearestWrongModel": "a trueDamagePct magnitude buff, or hasTrueNormals:true (static, both modes), or a weaponSwap with trueNormals used to carry the flavor",
      "distinguishingAssertion": "in engage, every normal-bucket damage event carries flavor 'true'; in stance none do. With withPatchedOverride on crown adding a passive allies trueDamagePct buff, totals(res)[slug] rises in engage and is byte-identical in stance.",
      "inertness": "absent any trueDamagePct source, totals in engage with/without the tag are identical; stance normals must never read trueDamagePct",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Engage] E2: Mighty Stomp deals true damage",
      "disposition": "FAITHFUL",
      "scope": "flavor tag on the burst swap shot (true) while in Engage",
      "durationSemantics": "continuous, cannot be removed",
      "triggerIdentity": "mode gate; covered by trueNormalsModes (normal-fire path reads swap.trueNormals || hasTrueNormals) — no swap-level flag needed",
      "targetSet": "self",
      "nearestWrongModel": "weaponSwap.trueNormals:true unconditionally (Stomp true in stance too) or sameWeapon:true (breaks the real-weapon magazine rule)",
      "distinguishingAssertion": "the single swap-shot damage event per carry burstCast carries flavor 'true' in engage and not in stance",
      "inertness": "no change to Stomp magnitude absent trueDamagePct",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Engage] E3: landing Full Charge → 370.08% true",
      "disposition": "FAITHFUL",
      "scope": "per full-charge pull rider, skill bucket, flavor 'true'; crit at caster rate, no core, noRange (engine force-sets), FB by timing (lands in FB if the pull does)",
      "durationSemantics": "instant hit per trigger",
      "triggerIdentity": "fullCharge trigger (charged pull); SR releases only at full charge so byte-identical to shotFired on unswapped pulls. Literal reading: the Mighty Stomp is itself a Full Charge attack → NO swapGate, rider fires on the Stomp pull too (⚑ unmeasured; recipe: count popups on the Stomp frame)",
      "targetSet": "enemy",
      "nearestWrongModel": "(a) interval/hitCount trigger; (b) swapGate:'unswapped' silently dropping the Stomp proc; (c) firing in stance as well; (d) core:true or rangeApplied",
      "distinguishingAssertion": "in engage: count(skill-bucket damage events, mult 370.08, flavor 'true') === count(carry shot events) including the swap pull; each has rangeApplied===false, core rate 0; in stance that count is 0",
      "inertness": "must not fire for other units' pulls; must not read chargeDamagePct (not a charge hit)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Stance] E1: Attack Damage ▲ 20.45%",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket, additive with crown/burst 77.35)",
      "durationSemantics": "continuous, cannot be removed — passive while in stance",
      "triggerIdentity": "passive, mode:'stance'",
      "targetSet": "self",
      "nearestWrongModel": "atkPct 20.45 (ATK bucket, multiplicative vs Damage Up — over-credits), or applying in both modes",
      "distinguishingAssertion": "stance: buffApply {stat:'attackDamagePct', value:20.45, casterIdx===targetIdx===carryIdx} at frame 0, no finite expiry; engage: no such event",
      "inertness": "no atkPct buffApply of 20.45; nothing on allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Stance] E2: Charge Damage ▲ 40%",
      "disposition": "FAITHFUL",
      "scope": "chargeDamagePct (additive points in the charge bucket) — applies to base full-charge shots AND the Stomp (adds to 250+1400)",
      "durationSemantics": "continuous, cannot be removed",
      "triggerIdentity": "passive, mode:'stance'",
      "targetSet": "self",
      "nearestWrongModel": "chargeDamageMultPct 40 (scales base charge — different magnitude), or whileSwapped/swap-only, or present in engage",
      "distinguishingAssertion": "stance: buffApply {stat:'chargeDamagePct', value:40} self at frame 0; the Stomp event's charge mult in stance exceeds engage's by exactly 40 points; engage: no such buffApply",
      "inertness": "does not touch the 370.08/450.89 riders (flat riders are not charge hits)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "[Stance] E3: landing Full Charge → 450.89% add'l",
      "disposition": "FAITHFUL",
      "scope": "per full-charge pull rider, skill bucket, non-true; crit at caster rate, no core, noRange, FB by timing",
      "durationSemantics": "instant hit per trigger",
      "triggerIdentity": "fullCharge, mode:'stance', no swapGate (same Stomp-pull reading/⚑ as the engage rider)",
      "targetSet": "enemy",
      "nearestWrongModel": "same as engage E3 (interval, swapGate, both-mode, core)",
      "distinguishingAssertion": "stance: count(skill-bucket damage events, mult 450.89) === count(carry shot events) incl. the Stomp pull, rangeApplied false; engage: 0 such events. Never both 370.08 and 450.89 in one fight.",
      "inertness": "not a charge hit — unaffected by chargeDamagePct 1400/40",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Mighty Stomp: Changes the weapon in use",
      "disposition": "FAITHFUL",
      "scope": "weaponSwap: damagePct 101.3, chargeMultPct 250, chargeTimeClamp 1.5 (fixed — ignores chargeSpeedPct), maxShots 1 ('Duration: 1 rounds'), durationSec = a hard bound ≥ 2 s (⚑ estimate ~10)",
      "durationSemantics": "ROUNDS: exactly ONE swapped shot, then back to the base SR — not a 10 s window of stomps",
      "triggerIdentity": "burstCast (this unit's own cast), stage 3; not fullBurstEnter",
      "targetSet": "self (swap) / enemy (the hit)",
      "nearestWrongModel": "(a) durationSec:10 with no maxShots → ~5 stomps at 101.3×(250+…)% per burst (massive over-credit); (b) chargeTimeSec 1.5 scaled by charge-speed buffs; (c) keyed to fullBurstEnter so helm's rotations also stomp; (d) damagePct 101.3 as the whole full-charge total",
      "distinguishingAssertion": "per carry burstCast event: exactly ONE damage event whose mult ≈ 101.3×(250+1400+[40 if stance])/100, landing ≈90 frames (not 60) after the cast, followed by a base-mult (69.04-derived) shot; count(such events) === count(burstCast for carryIdx), which in controlComp (helm is also B3) is < count(fullBurstStart). With a patched allies chargeSpeedPct buff the 90-frame offset is unchanged.",
      "inertness": "helm's burst rotations produce no Stomp; the Stomp never cores at a rate above the SR auto-core path (⚑ default)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Add'l 1: Charge Damage ▲ 1400% for 1 rounds",
      "disposition": "FAITHFUL",
      "scope": "chargeDamagePct 1400 — additive points in the charge bucket, consumed by the Stomp shot",
      "durationSemantics": "ROUND count: durationShots:1, NO durationSec. The burst cast is not a pull, so the next round (the Stomp, ~1.5 s later) carries it and it drops right after",
      "triggerIdentity": "burstCast self",
      "targetSet": "self",
      "nearestWrongModel": "(a) durationSec:1 — the Stomp charges 1.5 s so a 1 s wall-clock buff EXPIRES before it fires → 0 credit; (b) durationSec:10 — also credits the 4–5 base full-charge shots after the Stomp → over-credit; (c) chargeDamageMultPct",
      "distinguishingAssertion": "buffApply {stat:'chargeDamagePct', value:1400, durationShots:1, casterIdx===targetIdx===carryIdx} on each carry burstCast; the Stomp damage event's charge mult includes +1400 even though it lands ≥90 frames post-cast; the very next carry shot's mult reverts to the base SR charge figure",
      "inertness": "no second shot in the same burst window carries the 1400; allies never receive it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Add'l 2: Attack Damage ▲ 77.35% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up, additive with stance 20.45 / crown)",
      "durationSemantics": "wall-clock durationSec:10 (this one IS seconds)",
      "triggerIdentity": "burstCast self — fires only on rotations the carry bursts",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter (over-credits helm's B3 rotations in controlComp), or durationShots, or atkPct",
      "distinguishingAssertion": "count(buffApply {stat:'attackDamagePct', value:77.35, expiresFrame === castFrame+600}) === count(burstCast events for carryIdx) and < count(fullBurstStart) in controlComp",
      "inertness": "no 77.35 buffApply on frames where helm (not the carry) cast; no ally targetIdx",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ATK ▲ 20.1% continuous",
    "skill1:Bunny Mode static mode gate (modes ['stance','engage'], default stance)",
    "skill2:[Engage] E1 true normals flavor",
    "skill2:[Engage] E2 true Stomp flavor",
    "skill2:[Engage] E3 370.08% true full-charge rider",
    "skill2:[Stance] E1 attackDamagePct 20.45",
    "skill2:[Stance] E2 chargeDamagePct 40",
    "skill2:[Stance] E3 450.89% full-charge rider",
    "burst:Mighty Stomp weaponSwap (1 round, 1.5s clamp, 250%)",
    "burst:Charge Damage ▲1400% durationShots 1",
    "burst:Attack Damage ▲77.35% durationSec 10"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "when Full Charge is maintained for 1 or more seconds while this unit is not in the Mighty Stomp state (the toggle's ≥1 s hold cost and the Mighty-Stomp exclusion — modes are static)",
      "Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage.",
      "Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state. Initiates Bunny Mode: Stance."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "SHARED-PRIOR RISKS, in order of expected damage: (1) 'Duration: 1 rounds' on the Stomp and 'for 1 rounds' on the 1400% are ROUND counts — maxShots:1 and durationShots:1. A durationSec:1 on the 1400% is the trap that silently ZEROES the burst (the Stomp charges 1.5 s); a durationSec:10 on either over-credits by ~5 stomps or ~5 boosted base shots. (2) Mode default must be STANCE (battle-start text initiates Stance); the toggle is a player over-hold, never a per-fullCharge flip. In-engine Stance should dominate Engage because DEF is unmodeled and 'true' is value-neutral absent ally trueDamagePct — say so in the override note rather than fudging a true-damage credit. (3) Two B3s in controlComp (carry + helm): burstCast-keyed Stomp/1400/77.35 must count fewer than fullBurstStart; a fullBurstEnter encoding passes a solo-B3 fixture and fails this one. (4) ⚑ ALWAYS-flag fields: swap shot economy (real weapon change → fresh magazine on entry / base gun handed back FULL on exit per the 2026-08-12 ruling = a free 141f reload per burst; measure the ammo counter around the Stomp), the swap's durationSec hard bound, whether the S2 full-charge riders proc on the Stomp pull (literal reading: yes, no swapGate), and Stomp core rate. (5) Charge-bucket arithmetic for the Stomp: 101.3 × (250 + 1400 + 40 stance)/100 ≈ 1712% (engage ≈ 1671%) under the engine's additive-points convention — assert the ratio between modes equals 1690/1650, which pins both the 40 and the 1400 landing in the same bucket. (6) Near-miss leak check: the schema comment names base `guilty` ('Mind If I Borrow This?'), `soda-twinkling-bunny`, `ade-agent-bunny` — all DIFFERENT units from `guilty-mighty-bunny`; nothing about this slug's magnitudes leaked. Do not borrow highestAllyAtkPct from base guilty; this kit has no such line.",
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
      "kitLine": "ATK ▲ 20.1%. continuous",
      "disposition": "FAITHFUL",
      "assertion": "buffApply stat==='atkPct' value 20.1 on self, no durationShots; zeroing it lowers ONLY the carry (all teammate totals byte-identical). Fails under casterAtkPct (re-emits a flat ATK number, never 20.1), under attackDamagePct (asserted absent at 20.1), and under an ally-scoped target (teammate totals would move)."
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates a new Bunny Mode (toggle)",
      "disposition": "GAP",
      "assertion": "it.skip — no primitive flips a binary state per sustained Full Charge: `mode` is a static user choice, `selfStatus` max-extends a timed window. The sim also releases at full charge, so \"maintained for 1+ sec\" is unobservable."
    },
    {
      "slot": "skill1",
      "kitLine": "not in Stance → Initiates Stance",
      "disposition": "FAITHFUL",
      "assertion": "At frame 0 she is in neither mode, so the battle-start branch resolves to STANCE: the base run must show attackDamagePct 20.45 AND chargeDamagePct 40 on self. Fails under an Engage-default encoding (neither buff is ever applied)."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects all allies in the other mode",
      "disposition": "UNMODELED",
      "assertion": "it.skip (no ally carries a Bunny Mode; the mode has no stat payload). Testable residue: no buffApply of 20.1 / 20.45 / 77.35 / 1400 ever lands on a non-carry target — fails if a mode-propagation block was mis-scoped to allies with a payload attached."
    },
    {
      "slot": "skill2",
      "kitLine": "Engage ⟂ Stance (branch gating)",
      "disposition": "FAITHFUL",
      "assertion": "Both branches present in the committed file (370.08 rider; 450.89/20.45 payload) and each block carries a gate key. Plus the behavioral exclusivity bound below. Fails under 'drop a branch' and under 'both branches ungated'."
    },
    {
      "slot": "skill2",
      "kitLine": "landing a Full Charge attack (rider)",
      "disposition": "FAITHFUL",
      "assertion": "skill2-srcSlot damage count ∈ [carryShots − bursts − 2, carryShots]. Upper bound fails if BOTH branches fire (~2× shots, the mode double-credit); lower bound fails under a burstCast / fullBurstEnter / every-N keying (count collapses to ~burst count). NOTE: fullCharge vs shotFired is NOT discriminated — for an unswapped SR they are byte-identical, as the schema itself states."
    },
    {
      "slot": "skill2",
      "kitLine": "370.08% of final ATK, true dmg",
      "disposition": "FAITHFUL (⚑ magnitude pinned structurally only)",
      "assertion": "Magnitude must appear as a flatDamage atkPct in the file; whichever rider is live is load-bearing (base − zeroed > 0) and exactly linear in atkPct (2× patch ⇒ 2.00 ± 0.04 × delta). Fails under a zero/stub rider or a payload actually sourced elsewhere. True-flavor itself is not asserted (no flavor on damage events)."
    },
    {
      "slot": "skill2",
      "kitLine": "Normal attacks deal true damage",
      "disposition": "GAP",
      "assertion": "it.skip — damage events carry no flavor field and the control comp has no trueDamagePct consumer, so the flag is damage-neutral and unobservable."
    },
    {
      "slot": "skill2",
      "kitLine": "Mighty Stomp deals true damage",
      "disposition": "GAP",
      "assertion": "it.skip — same unobservability; it would ride weaponSwap.trueNormals, which emits no event."
    },
    {
      "slot": "skill2",
      "kitLine": "Attack Damage ▲ 20.45%",
      "disposition": "FAITHFUL",
      "assertion": "Stat key is exactly attackDamagePct at 20.45 (Damage Up bucket). A totals counterfactual cannot separate bucket choices, so the key itself is the discriminator."
    },
    {
      "slot": "skill2",
      "kitLine": "Charge Damage ▲ 40%",
      "disposition": "FAITHFUL",
      "assertion": "Stat key chargeDamagePct at 40, and explicitly NOT attackDamagePct at 40. Fails under the common fold of a charge-scoped line into the generic Damage-Up bucket, which over-credits every non-charge instance."
    },
    {
      "slot": "burst",
      "kitLine": "Changes the weapon in use",
      "disposition": "FAITHFUL",
      "assertion": "A weaponSwap effect exists in the burst slot (≥1; a second mode-gated true-flavored variant is tolerated, but every swap must carry identical kit numbers)."
    },
    {
      "slot": "burst",
      "kitLine": "Charge Time: Fixed at 1.5 sec",
      "disposition": "FAITHFUL",
      "assertion": "chargeTimeSec OR chargeTimeClamp === 1.5 on each swap (either field expresses the fixed charge)."
    },
    {
      "slot": "burst",
      "kitLine": "Damage 101.3% / Full Charge 250%",
      "disposition": "FAITHFUL",
      "assertion": "swap.damagePct === 101.3 and swap.chargeMultPct === 250. Pins the swap's per-shot economy against a base-weapon carry-over."
    },
    {
      "slot": "burst",
      "kitLine": "Duration: 1 rounds",
      "disposition": "FIX (round-count, not seconds)",
      "assertion": "swap.maxShots === 1 — one stomp per burst. Corroborated independently by Add.1's own \"for 1 rounds\". Fails under the default 10s weapon-change window, which fires several stomps."
    },
    {
      "slot": "burst",
      "kitLine": "Charge Damage ▲1400% for 1 rounds",
      "disposition": "FAITHFUL",
      "assertion": "Every buffApply of chargeDamagePct 1400 has durationShots === 1 (≥2 applications over the fight ⇒ non-vacuous). Counterfactual: re-authored as durationSec 10 the buff outlives the swap and lands on her ordinary SR charge shots, so that run's total must be STRICTLY HIGHER than faithful — the duration-semantics trap made numeric."
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲77.35% for 10 sec",
      "disposition": "FAITHFUL",
      "assertion": "Mirror of the above: durationShots must be ABSENT, expiresFrame must be a finite number (bounded, not continuous), and the application count must equal the ▲1400% count (both ride the same cast, so once per burst). Shortening durationSec to 1 must lower the total, proving the window is load-bearing. Fails if seconds were encoded as rounds, or if the buff was made continuous."
    }
  ],
  "fixtures": "controlComp('guilty-mighty-bunny', true) for all 6 runs — B1 (liter) + B2 (crown) are mandatory because a lone Burst III carry produces ZERO Full Bursts, which would make every burst-slot assertion vacuous. The fixed B3 slot is deliberately KEPT rather than passing false: no assertion reads an absolute damage number, so a teammate's buffs cannot confound anything here — each magnitude claim is either a structural read of the committed override (captured non-destructively through withPatchedOverride's clone) or a self-referential counterfactual delta. Six hoisted runs: base; S1 atkPct 20.1→0; live Full-Charge rider ×0; rider ×2; burst ▲1400% re-authored as durationSec 10; burst ▲77.35% durationSec→1. All patches are VALUE patches, never block removals, so event counts and burst-gauge timing are identical across every run and the deltas are attributable. Note on the supplied methodology packet: it names the base unit `guilty` (highestAllyAtkPct, \"Mind If I Borrow This?\") — a DIFFERENT slug from guilty-mighty-bunny, carrying no information about this unit's answer, so this is not recorded as a leak.",
  "gaps": [
    "it.skip — S1-b toggle: Stance<->Engage flipping on a Full Charge maintained >=1s (while not in Mighty Stomp) has no engine primitive; `mode` is a static user-selected choice and `selfStatus` is a max-extending timed window, neither of which toggles. The sim also releases charge shots at full charge, so the \">=1 second maintained\" condition is itself unobservable. Consequence: whichever mode is selected is live for the entire fight, which over-credits that branch relative to real play where the player alternates.",
    "it.skip — S1-c/S1-d: converting allies in the opposite Bunny Mode. No roster ally carries a Bunny Mode and the mode has no stat payload, so the line is inert; only the no-leak assertion is testable.",
    "it.skip — S2 Engage Effect 1 (normal attacks deal true damage) and Effect 2 (Mighty Stomp deals true damage): damage events expose no flavor field and the control comp contains no trueDamagePct consumer, so true-flavor is damage-neutral and unobservable. Recipe: re-run with a True Damage ▲ buffer in the comp and read the totals delta.",
    "NOT asserted (acknowledged, not skipped): fullCharge vs shotFired trigger identity for the S2 riders — the schema states they are byte-identical for an unswapped SR, so no in-sim assertion can separate them.",
    "⚑ outside the input domain, intentionally left unasserted: the swap weapon's class/cadence (kit-silent — 'Mighty Stomp' names no weapon type), the swap's wall-clock durationSec alongside maxShots 1, and per-rider noFb/noRange/crit flags (measured-only; the kit text gives none of them)."
  ],
  "model": "claude-opus-5",
  "leakDetected": null
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
 * guilty-mighty-bunny (SR / Water / Attacker / Burst III, 6 ammo, 60f charge) — BLIND kit-spec test.
 *
 * Written from the kit prose ALONE (role S5): no sight of the driver's override, tests or reasoning.
 * Every claim below traces to one of these kit lines:
 *
 *   S1 a ■ battle start, self: "ATK ▲ 20.1%", continuous.
 *   S1 b ■ battle start AND a Full Charge maintained >=1s while NOT in Mighty Stomp: toggles
 *          Bunny Mode: Stance <-> Bunny Mode: Engage. At battle start the unit is NOT in Stance, so
 *          the start-of-battle branch resolves to STANCE => Stance is the DEFAULT state. The TOGGLE
 *          itself is player-driven and has no engine primitive (see the skipped test).
 *   S1 c/d ■ entering one mode converts allies in the opposite mode. No roster ally carries a Bunny
 *          Mode and the mode carries no stat payload => offensively inert, and it must not leak.
 *   S2 Engage ■ normal attacks + Mighty Stomp deal TRUE damage (flavor only); on landing a Full
 *          Charge: 370.08% of final ATK as true damage to the target.
 *   S2 Stance ■ "Attack Damage ▲ 20.45%" + "Charge Damage ▲ 40%" (continuous, self); on landing a
 *          Full Charge: 450.89% of final ATK as additional damage.
 *   Burst ■ "Mighty Stomp: Changes the weapon in use", charge time fixed 1.5s, 101.3% per shot,
 *          Full Charge Damage 250%, "Duration: 1 rounds"; Add.1 "Charge Damage ▲ 1400% for 1
 *          rounds"; Add.2 "Attack Damage ▲ 77.35% for 10 sec".
 *
 * FIXTURE: controlComp(SLUG, true). B1+B2 are REQUIRED — a lone Burst III unit makes zero Full
 * Bursts, which would make every burst-slot assertion vacuous. The fixed B3 slot is kept because NO
 * assertion here reads an absolute damage number: every magnitude claim is either a structural read
 * of the committed override or a self-referential counterfactual delta, both immune to a teammate's
 * buffs.
 *
 * SHAPE DEFENSE (blind): the two available descriptions of OverrideFile disagree on whether a slot
 * is `Block[]` or `{ blocks: Block[] }`, so slotBlocks() accepts both. The owner field on
 * damage/shot events is not pinned either, so ownerOf() tries the plausible names and the shot
 * assertion fails LOUDLY (shots > 20) rather than passing vacuously if none resolves.
 */

const SLUG = 'guilty-mighty-bunny';

type Ev = SimEvent & Record<string, any>;

const near = (a: unknown, b: number, tol = 0.5): boolean =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

/* ---------- override-shape helpers (tolerant of Block[] vs { blocks: Block[] }) ---------- */
type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

function slotBlocks(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
const effectsOf = (b: any): any[] =>
  Array.isArray(b?.effects) ? b.effects : [];
const allBlocks = (ov: any): any[] => SLOTS.flatMap((s) => slotBlocks(ov, s));
const allEffects = (ov: any): any[] => allBlocks(ov).flatMap(effectsOf);
const slotEffects = (ov: any, slot: Slot): any[] =>
  slotBlocks(ov, slot).flatMap(effectsOf);

/** the committed override, READ (never mutated) through the clone withPatchedOverride hands us */
const COMMITTED: any = (() => {
  let snap: any = null;
  withPatchedOverride(SLUG, (ov: any) => {
    snap = JSON.parse(JSON.stringify(ov));
  });
  return snap;
})();

/* ---------- run helpers ---------- */
function withOv(ov: any) {
  const cfg: any = controlComp(SLUG, true);
  cfg.overrides = { ...(cfg.overrides ?? {}), [SLUG]: ov };
  return cfg;
}
function run(cfg: any) {
  const evs: Ev[] = [];
  cfg.onEvent = (ev: SimEvent) => {
    evs.push(ev as Ev);
  };
  const res = runComp(cfg);
  const t = totals(res) as Record<string, number>;
  return { res, evs, t, total: t[SLUG] };
}

const ownerOf = (ev: any): string | undefined =>
  ev.slug ??
  ev.unitSlug ??
  ev.srcSlug ??
  ev.sourceSlug ??
  ev.casterSlug ??
  ev.owner ??
  ev.unit;
const maybeCarry = (ev: any): boolean => {
  const o = ownerOf(ev);
  return o === undefined || o === SLUG;
};
const isCarry = (ev: any): boolean => ownerOf(ev) === SLUG;

const buffApplies = (evs: Ev[], stat: string, value: number, tol = 0.5): Ev[] =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' && e.stat === stat && near(e.value, value, tol)
  );

/* ---------- counterfactual overrides (value patches only: the effect instance survives, so burst
   gauge / shot counts / event counts are identical across every run below) ---------- */
const OV_S1_ATK_ZERO = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of allEffects(ov)) {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 20.1, 0.05))
      e.value = 0;
  }
});
const riderScaled = (scale: number) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const e of allEffects(ov)) {
      if (
        e.kind === 'flatDamage' &&
        (near(e.atkPct, 370.08) || near(e.atkPct, 450.89))
      ) {
        e.atkPct = e.atkPct * scale;
      }
    }
  });
const OV_RIDER_ZERO = riderScaled(0);
const OV_RIDER_DOUBLE = riderScaled(2);
const OV_1400_AS_SECONDS = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of slotEffects(ov, 'burst')) {
    if (
      e.kind === 'buff' &&
      e.stat === 'chargeDamagePct' &&
      typeof e.value === 'number' &&
      e.value >= 1000
    ) {
      delete e.durationShots;
      e.durationSec = 10;
    }
  }
});
const OV_7735_SHORT = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of slotEffects(ov, 'burst')) {
    if (
      e.kind === 'buff' &&
      e.stat === 'attackDamagePct' &&
      near(e.value, 77.35, 0.05)
    ) {
      delete e.durationShots;
      e.durationSec = 1;
    }
  }
});

/* ---------- hoisted runs: 6 full 180s sims ---------- */
const BASE = run(controlComp(SLUG, true));
const NO_S1_ATK = run(withOv(OV_S1_ATK_ZERO));
const RIDER_0 = run(withOv(OV_RIDER_ZERO));
const RIDER_2X = run(withOv(OV_RIDER_DOUBLE));
const CHG_AS_TIME = run(withOv(OV_1400_AS_SECONDS));
const ADPCT_SHORT = run(withOv(OV_7735_SHORT));

describe('guilty-mighty-bunny — skill1', () => {
  // Discriminates the SCOPE trap: a caster-scaled encoding (casterAtkPct) re-emits a FLAT ATK
  // number, never 20.1, and a Damage-Up encoding would surface under attackDamagePct.
  it('S1-a: ATK ▲20.1% is a plain self atkPct buff, continuous', () => {
    const ap = buffApplies(BASE.evs, 'atkPct', 20.1, 0.05).filter(
      (e) => e.targetSlug === SLUG
    );
    expect(ap.length).toBeGreaterThan(0);
    expect(buffApplies(BASE.evs, 'attackDamagePct', 20.1, 0.05).length).toBe(0);
    for (const e of ap) expect(e.durationShots ?? undefined).toBeUndefined();
  });

  // Non-vacuity + inertness: the buff moves the carry and NOTHING else. A value patch cannot change
  // event counts, so any teammate movement would mean the buff was mis-targeted at allies.
  it('S1-a is load-bearing on the carry and inert on every teammate', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(NO_S1_ATK.total).toBeLessThan(BASE.total);
    for (const slug of Object.keys(BASE.t)) {
      if (slug === SLUG) continue;
      expect(NO_S1_ATK.t[slug]).toBeCloseTo(BASE.t[slug], 3);
    }
  });

  // The kit's battle-start branch reads: "Activates if this unit is NOT in the Bunny Mode: Stance
  // state -> Initiates Bunny Mode: Stance." At frame 0 she is in neither mode, so the opening state
  // is STANCE and Chain Enhance (not Chain Release) is the live S2 branch. Nearest-wrong: defaulting
  // to Engage because it is the flashier branch — that run carries neither buff below.
  it('S1-b: the battle-start resolution is Bunny Mode: Stance (Chain Enhance live by default)', () => {
    const ad = buffApplies(BASE.evs, 'attackDamagePct', 20.45, 0.05).filter(
      (e) => e.targetSlug === SLUG
    );
    const cd = buffApplies(BASE.evs, 'chargeDamagePct', 40, 0.05).filter(
      (e) => e.targetSlug === SLUG
    );
    expect(ad.length).toBeGreaterThan(0);
    expect(cd.length).toBeGreaterThan(0);
  });

  // TARGET-SET inertness for S1-c/d: the mode-conversion lines touch allies, but they carry no stat
  // payload, so none of this unit's self-only magnitudes may ever land on a teammate.
  it('S1 leaks none of its self-only magnitudes onto a teammate', () => {
    const leaks = BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== undefined &&
        e.targetSlug !== SLUG &&
        ((e.stat === 'atkPct' && near(e.value, 20.1, 0.05)) ||
          (e.stat === 'attackDamagePct' &&
            (near(e.value, 20.45, 0.05) || near(e.value, 77.35, 0.05))) ||
          (e.stat === 'chargeDamagePct' && near(e.value, 1400, 0.5)))
    );
    expect(leaks).toEqual([]);
  });

  it.skip('S1-b GAP: the Stance<->Engage TOGGLE (Full Charge held >=1s, not during Mighty Stomp) has no engine primitive — `mode` is a static user choice, `selfStatus` is a max-extending timed window, and neither can flip a binary state per sustained charge; the sim also releases charge shots at full charge, so the ">=1 second maintained" condition is itself unobservable', () => {});

  it.skip('S1-c/S1-d GAP: converting allies in the opposite Bunny Mode — no roster ally carries a Bunny Mode and the mode itself has no stat payload, so the line is unobservable (its only testable residue is the no-leak assertion above)', () => {});
});

describe('guilty-mighty-bunny — skill2 (Chain Release / Chain Enhance)', () => {
  // Neither branch may be silently dropped, and neither may be unconditionally live: the kit makes
  // them mutually exclusive states. Nearest-wrong: authoring both ungated (double-credit) or keeping
  // only Stance (the Engage rider vanishes).
  it('S2: BOTH Bunny-Mode branches are authored, and each is gated', () => {
    const gateKeys = [
      'mode',
      'requiresSelfStatus',
      'requiresTargetStatus',
      'resourceGate',
      'fbGate',
      'swapGate',
      'ownBurstGate',
      'teamHas',
      'formation',
      'everyN',
    ];
    const gated = (b: any) => gateKeys.some((k) => b[k] !== undefined);
    const blocks = slotBlocks(COMMITTED, 'skill2');
    const engage = blocks.filter((b) =>
      effectsOf(b).some(
        (e) => e.kind === 'flatDamage' && near(e.atkPct, 370.08)
      )
    );
    const stance = blocks.filter((b) =>
      effectsOf(b).some(
        (e) =>
          (e.kind === 'flatDamage' && near(e.atkPct, 450.89)) ||
          (e.kind === 'buff' &&
            e.stat === 'attackDamagePct' &&
            near(e.value, 20.45, 0.05))
      )
    );
    expect(engage.length).toBeGreaterThan(0);
    expect(stance.length).toBeGreaterThan(0);
    for (const b of [...engage, ...stance]) expect(gated(b)).toBe(true);
  });

  // TRIGGER IDENTITY + exclusivity in one count. One rider per charged pull (she is an SR: every
  // pull is a full charge, so fullCharge and shotFired are byte-identical here and this assertion
  // deliberately does NOT claim to separate them — see the spec note). Upper bound <= shots rules
  // out BOTH branches firing (that would be ~2x shots); the lower bound rules out a burst-cast /
  // full-burst-enter / every-N keying, which would collapse the count to roughly the burst count.
  it('S2: exactly ONE Full-Charge rider fires, once per charged pull', () => {
    const shots = BASE.evs.filter((e) => e.kind === 'shot' && isCarry(e));
    expect(shots.length).toBeGreaterThan(20);
    const bursts = buffApplies(BASE.evs, 'chargeDamagePct', 1400, 0.5).length;
    const riders = BASE.evs.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'skill2' && maybeCarry(e)
    );
    expect(riders.length).toBeGreaterThan(bursts * 5);
    expect(riders.length).toBeLessThanOrEqual(shots.length);
    expect(riders.length).toBeGreaterThanOrEqual(shots.length - bursts - 2);
  });

  // The rider is real damage, and its payload genuinely rides atkPct (doubling the field doubles the
  // delta). Nearest-wrong: a rider authored as an inert/zero stub, or one whose damage actually
  // comes from somewhere else. Both kit magnitudes must be present in the file.
  it('S2: the live Full-Charge rider carries real damage and is linear in its atkPct', () => {
    const d1 = BASE.total - RIDER_0.total;
    const d2 = RIDER_2X.total - RIDER_0.total;
    expect(d1).toBeGreaterThan(0);
    expect(d2 / d1).toBeGreaterThan(1.96);
    expect(d2 / d1).toBeLessThan(2.04);
    const pcts = allEffects(COMMITTED)
      .filter((e) => e.kind === 'flatDamage')
      .map((e) => e.atkPct);
    expect(pcts.some((p: any) => near(p, 370.08))).toBe(true);
    expect(pcts.some((p: any) => near(p, 450.89))).toBe(true);
  });

  // BUCKET SCOPE. "Charge Damage ▲40%" is charge-bucket additive, not a generic Damage-Up term; a
  // totals counterfactual cannot tell the two apart (both raise damage), only the stat key can.
  it('S2 Stance: ▲20.45% is attackDamagePct and ▲40% is chargeDamagePct', () => {
    const effs = slotEffects(COMMITTED, 'skill2').filter(
      (e) => e.kind === 'buff'
    );
    expect(
      effs.some(
        (e) => e.stat === 'attackDamagePct' && near(e.value, 20.45, 0.05)
      )
    ).toBe(true);
    expect(
      effs.some((e) => e.stat === 'chargeDamagePct' && near(e.value, 40, 0.05))
    ).toBe(true);
    expect(
      effs.some((e) => e.stat === 'attackDamagePct' && near(e.value, 40, 0.05))
    ).toBe(false);
  });

  it.skip('S2 Engage E1/E2 GAP: "normal attacks deal true damage" / "Mighty Stomp deals true damage" — damage events carry no flavor field, and the control comp has no trueDamagePct consumer, so the flavor is damage-neutral and unobservable here. Recipe: a comp containing a True Damage ▲ buffer would make it readable as a totals delta', () => {});
});

describe('guilty-mighty-bunny — burst (Mighty Stomp)', () => {
  // Every stated burst number, pinned structurally. maxShots 1 is the "Duration: 1 rounds" reading
  // (corroborated by Add.1's own "for 1 rounds"); nearest-wrong is a standard 10s weapon-change
  // window, which would fire several stomps. Two swap effects are tolerated (a mode-gated
  // true-flavored variant for the Engage branch is a legitimate encoding), but all must agree.
  it('burst: Mighty Stomp is a weaponSwap carrying 101.3% / 250% / 1.5s and ONE round', () => {
    const swaps = slotEffects(COMMITTED, 'burst').filter(
      (e) => e.kind === 'weaponSwap'
    );
    expect(swaps.length).toBeGreaterThan(0);
    for (const s of swaps) {
      expect(near(s.damagePct, 101.3)).toBe(true);
      expect(near(s.chargeMultPct, 250)).toBe(true);
      expect(
        near(s.chargeTimeSec, 1.5, 0.01) || near(s.chargeTimeClamp, 1.5, 0.01)
      ).toBe(true);
      expect(s.maxShots).toBe(1);
    }
  });

  // DURATION SEMANTICS, the headline trap on this kit. "for 1 rounds" is a ROUND budget spent by
  // firing, not a clock. Under the nearest-wrong (a 10s window) the ▲1400% charge damage survives
  // the swap and lands on her ordinary SR charge shots, so the counterfactual total must be HIGHER.
  it('burst Add.1: Charge Damage ▲1400% is ROUND-scoped (1 round), not a timed window', () => {
    const a = buffApplies(BASE.evs, 'chargeDamagePct', 1400, 0.5);
    expect(a.length).toBeGreaterThanOrEqual(2);
    for (const e of a) expect(e.durationShots).toBe(1);
    expect(CHG_AS_TIME.total).toBeGreaterThan(BASE.total);
  });

  // The mirror-image semantics check: Add.2 is stated in SECONDS, so it must NOT be round-scoped,
  // must be bounded (not continuous), and must re-arm exactly once per burst cast — same count as
  // the ▲1400% buff, which rides the same cast. Shortening the window must cost damage.
  it('burst Add.2: Attack Damage ▲77.35% is TIME-scoped (10 sec), once per burst', () => {
    const a = buffApplies(BASE.evs, 'attackDamagePct', 77.35, 0.05);
    const c = buffApplies(BASE.evs, 'chargeDamagePct', 1400, 0.5);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.length).toBe(c.length);
    for (const e of a) {
      expect(e.durationShots ?? undefined).toBeUndefined();
      expect(typeof e.expiresFrame).toBe('number');
    }
    expect(ADPCT_SHORT.total).toBeLessThan(BASE.total);
  });
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "guilty-mighty-bunny",
  "modes": ["stance", "engage"],
  "trueNormalsModes": ["engage"],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 20.1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "mode": "stance",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 20.45
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 40
        }
      ]
    },
    {
      "slot": "skill2",
      "mode": "stance",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 450.89,
          "crit": true
        }
      ]
    },
    {
      "slot": "skill2",
      "mode": "engage",
      "trigger": {
        "kind": "fullCharge"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 370.08,
          "flavor": "true",
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 101.3,
          "chargeTimeSec": 1.5,
          "chargeTimeClamp": 1.5,
          "chargeMultPct": 250,
          "durationSec": 10,
          "maxShots": 1,
          "levelConst": ["chargeTimeSec", "chargeTimeClamp", "maxShots"]
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 1400,
          "durationShots": 1,
          "levelConst": ["durationShots"]
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 77.35,
          "durationSec": 10,
          "levelConst": ["durationSec"]
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "■ Activates at the start of battle and when Full Charge is maintained for 1 or more seconds while this unit is not in the Mighty Stomp state. Affects self.",
      "Initiates a new Bunny Mode based on the current mode.",
      "Activates if this unit is in the Bunny Mode: Stance state.",
      "Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.",
      "Activates if this unit is not in the Bunny Mode: Stance state.",
      "Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed.",
      "■ Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state.",
      "Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.",
      "■ Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state.",
      "Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed."
    ],
    "skill2": [
      "Function: Changes some attacks' damage into true damage.",
      "Function: Enhances this unit's offensive capabilities."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ MODE TOGGLE IS THE WHOLE KIT. S1's second block alternates Stance ⇄ Engage on each full charge HELD ≥1s (start of battle = not in Stance ⇒ Stance). The engine has no alternating-mode primitive, so this is encoded as a static top-level `modes: [stance, engage]` selection with `mode` gates on the S2 branches. This is defensible because the toggle requires a deliberate 1s HOLD — an SR firing at full charge without holding never toggles, so parking in one mode is a real play pattern — but a player who alternates gets a blend of BOTH branches that no single mode selection reproduces. Default is `stance` (the kit-stated t=0 state).",
    "⚑ Reaching `engage` costs one ≥1s full-charge hold (and one more to return), i.e. a real opening-DPS tax, plus a toggle risk on every subsequent full charge. The static mode gate models neither — `engage` is credited from frame 0.",
    "⚑ S2 Effect 3 (both branches) is keyed `fullCharge`, so it ALSO fires on the burst Mighty Stomp shot (the stomp is a fixed-1.5s full-charge attack with its own Full Charge Damage line). Left ungated (no `swapGate`) as the kit gives no exclusion — if footage shows the riders do not proc off the stomp, add `swapGate: 'unswapped'`.",
    "Both riders are \"when LANDING a Full Charge attack\" — landing/range residue is not modeled; they are instant flatDamage (engine force-sets no-range), take Full Burst by timing (`noFb` left OFF, unmeasured), crit at the caster's sheet rate, and never core.",
    "S1's two ally-side blocks (pull all allies in the opposite Bunny Mode into this unit's mode) are inert at scope: no other roster unit carries a Bunny Mode status, so there is no consumer. They are recorded in `unmodeled`, not dropped, and would need real modeling only if a second Bunny-Mode carrier ships.",
    "Mighty Stomp is a REAL weapon change (damagePct 101.3 ≠ normalAttackMultiplier 69.04, so `sameWeapon` is correctly unset) ⇒ the engine grants a fresh magazine on entry and hands the base SR back FULL on exit. That free reload is a genuine damage gain riding on the swap and is engine-automatic, not authored here.",
    "`weapon` is deliberately unset on the swap: the kit never names Mighty Stomp's weapon class, so the swap inherits the base SR class (range band + auto-core rate). If the stomp is in fact a different class, core rate and band eligibility are both wrong."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no driver test/override/reasoning consulted). Structure: S1 = one continuous self ATK buff + the Stance⇄Engage toggle, which is approximated by a static top-level `modes` selection because the engine has no alternating-mode primitive — the single largest modeling liberty in this file. S2 is two mutually exclusive mode branches: `stance` = Attack Damage ▲20.45 + Charge Damage ▲40 + a 450.89% additional-damage full-charge rider; `engage` = true-flavored normals AND true-flavored Mighty Stomp (both carried by the single top-level `trueNormalsModes: ['engage']`, which the schema states also covers swap shots) + a 370.08% TRUE full-charge rider. Burst = a real weapon change (damagePct 101.3, charge fixed 1.5s, Full Charge Damage 250%) bounded by `maxShots: 1` for the kit's \"Duration: 1 rounds\", with a ⚑ 10s `durationSec` stand-in since the kit gives no wall-clock bound; the ▲1400% Charge Damage is round-scoped (`durationShots: 1`, so the one stomp shot still benefits) and the ▲77.35% Attack Damage is the stated 10 sec. No `ignored` blocks; all SKIPPED kit lines appear verbatim in `unmodeled`."
}
```

### 6b. blind audit + flags

```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "■ Activates at the start of battle. Af",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill1[0] trigger `passive` + target `self`. Encoded as passive rather than `battleStart` because the payload is continuous with no durationSec — the two are uptime-identical here and passive carries no duration semantics to get wrong."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 20.1%. This effect is continuous",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 20.1, no durationSec (continuous)."
    },
    {
      "slot": "skill1",
      "kitLine": "■ Activates at the start of battle and",
      "status": "SKIPPED",
      "effectOrReason": "Toggle activation clause (battle start OR full charge maintained ≥1s while NOT in Mighty Stomp). No engine trigger expresses \"full charge HELD for 1s\" (the `fullCharge` primitive fires on RELEASE of any charged pull, which is NOT the same event), and no primitive alternates a self mode. Approximated by the static top-level `modes` selection; the \"not in Mighty Stomp\" sub-gate is moot once the toggle is static."
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates a new Bunny Mode based on th",
      "status": "SKIPPED",
      "effectOrReason": "The alternation itself. `modes` is a static user selection, not a runtime toggle."
    },
    {
      "slot": "skill1",
      "kitLine": "Activates if this unit is in the Bunny",
      "status": "SKIPPED",
      "effectOrReason": "Toggle branch condition (in Stance ⇒ go Engage). Subsumed by the static mode selection."
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates Bunny Mode: Engage. This eff",
      "status": "SKIPPED",
      "effectOrReason": "Self mode entry (Engage). Represented as `mode: 'engage'` on the S2 branch + `trueNormalsModes: ['engage']`, not as a runtime state change."
    },
    {
      "slot": "skill1",
      "kitLine": "Activates if this unit is not in the B",
      "status": "SKIPPED",
      "effectOrReason": "Toggle branch condition (not in Stance ⇒ go Stance). This is the branch that fires at battle start, which is why `stance` is the default mode."
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates Bunny Mode: Stance. This eff",
      "status": "SKIPPED",
      "effectOrReason": "Self mode entry (Stance). Represented as `mode: 'stance'` on the S2 branches."
    },
    {
      "slot": "skill1",
      "kitLine": "■ Activates when this unit enters the",
      "status": "SKIPPED",
      "effectOrReason": "Ally-side mode sync (on entering Engage, affects all allies in Stance). No other roster unit carries a Bunny Mode status, so there is no consumer and nothing to grant — inert at scope, recorded not dropped."
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates Bunny Mode: Engage. (ally)",
      "status": "SKIPPED",
      "effectOrReason": "Payload of the ally mode-sync block above. Cross-unit mode state has no engine channel (selfStatus is keyed per-unit by design and cannot be written to another unit)."
    },
    {
      "slot": "skill1",
      "kitLine": "■ Activates when this unit enters the",
      "status": "SKIPPED",
      "effectOrReason": "Ally-side mode sync (on entering Stance, affects all allies in Engage). Same reason: no second Bunny-Mode carrier exists."
    },
    {
      "slot": "skill1",
      "kitLine": "Initiates Bunny Mode: Stance. (ally)",
      "status": "SKIPPED",
      "effectOrReason": "Payload of the ally mode-sync block above."
    },
    {
      "slot": "skill2",
      "kitLine": "■ Activates only if this unit is in th",
      "status": "IMPLEMENTED",
      "effectOrReason": "`mode: 'engage'` gate on skill2[2] (and on the top-level `trueNormalsModes` entry)."
    },
    {
      "slot": "skill2",
      "kitLine": "Chain Release",
      "status": "IMPLEMENTED",
      "effectOrReason": "Branch name, no mechanic of its own; realized by the `mode: 'engage'` encoding."
    },
    {
      "slot": "skill2",
      "kitLine": "Function: Changes some attacks' damage",
      "status": "SKIPPED",
      "effectOrReason": "Descriptive summary line restating Effects 1–3; no independent mechanic. Verbatim in `unmodeled.skill2`."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 1: ... Normal attacks deal true",
      "status": "IMPLEMENTED",
      "effectOrReason": "Top-level `trueNormalsModes: ['engage']` — the mode-scoped sibling of hasTrueNormals, resolved once at setup from the selected mode. Makes ally True Damage ▲ feed her normals in Engage only."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 2: ... Mighty Stomp deals true",
      "status": "IMPLEMENTED",
      "effectOrReason": "Covered by the SAME `trueNormalsModes` entry — the schema states the normal-fire path reads `swap.trueNormals || hasTrueNormals`, so a swap weapon that is also true in that mode needs no swap-level flag. Deliberately NOT also set as `weaponSwap.trueNormals`, which would double-book one kit line."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 3: ... 370.08% ... true damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill2[2]: trigger `fullCharge`, target `enemy`, flatDamage atkPct 370.08, flavor 'true', crit true (rider crit convention), core omitted (kit says no core strike), noRange engine-automatic, noFb left OFF (FB by landing timing)."
    },
    {
      "slot": "skill2",
      "kitLine": "■ Activates only when this unit is in",
      "status": "IMPLEMENTED",
      "effectOrReason": "`mode: 'stance'` gate on skill2[0] and skill2[1]."
    },
    {
      "slot": "skill2",
      "kitLine": "Chain Enhance",
      "status": "IMPLEMENTED",
      "effectOrReason": "Branch name, no mechanic; realized by the `mode: 'stance'` encoding."
    },
    {
      "slot": "skill2",
      "kitLine": "Function: Enhances this unit's offensi",
      "status": "SKIPPED",
      "effectOrReason": "Descriptive summary line; no independent mechanic. Verbatim in `unmodeled.skill2`."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 1: ... Attack Damage ▲ 20.45%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 20.45, passive, self, no duration (continuous). Generic Damage-Up bucket — the kit scopes it to nothing narrower."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 2: ... Charge Damage ▲ 40%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff chargeDamagePct 40 (additive percentage points in the charge bucket, not chargeDamageMultPct — the kit says plain \"Charge Damage ▲\"), passive, self, continuous. Also lifts the burst stomp shot, which the kit's \"continuous\" wording supports."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 3: ... 450.89% ... additional d",
      "status": "IMPLEMENTED",
      "effectOrReason": "skill2[1]: trigger `fullCharge`, target `enemy`, flatDamage atkPct 450.89, crit true, no flavor (\"additional damage\" = plain function damage, NOT true), core omitted, noFb OFF."
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "burst[0] target `self`, trigger `burstCast` (a self weapon-mode line in the unit's OWN burst block ⇒ burst-cast, never fullBurstEnter)."
    },
    {
      "slot": "burst",
      "kitLine": "Mighty Stomp: Changes the weapon in us",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap. `sameWeapon` deliberately UNSET: damagePct 101.3 ≠ normalAttackMultiplier 69.04, the stated same-weapon diagnostic, so this is a real weapon change (fresh magazine in, base SR returned full on exit)."
    },
    {
      "slot": "burst",
      "kitLine": "Charge Time: Fixed at 1.5 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "chargeTimeSec 1.5 (the swap weapon's charge time) AND chargeTimeClamp 1.5 (the literal \"Fixed at\" wording ⇒ immune to charge-speed buffs). Set equal so the clamp cannot disagree with the base value."
    },
    {
      "slot": "burst",
      "kitLine": "Damage: 101.3% of final ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.damagePct 101.3 — per-shot full-shot total while swapped."
    },
    {
      "slot": "burst",
      "kitLine": "Full Charge Damage: 250%",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.chargeMultPct 250."
    },
    {
      "slot": "burst",
      "kitLine": "Duration: 1 rounds",
      "status": "IMPLEMENTED",
      "effectOrReason": "maxShots 1 — a ROUND count, read as the uses-based end (swap terminates right after the 1st swapped shot); hitsPerShot 1 makes rounds and shots identical here. durationSec 10 is a ⚑ stand-in because weaponSwap.durationSec is a required field and the kit states no wall-clock bound."
    },
    {
      "slot": "burst",
      "kitLine": "Additional Effect 1: Charge Damage ▲ 1",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff chargeDamagePct 1400 with durationShots 1 — \"for 1 rounds\" is a round count, never seconds. Decremented after the shot's blocks dispatch, so the single stomp shot does benefit."
    },
    {
      "slot": "burst",
      "kitLine": "Additional Effect 2: Attack Damage ▲ 7",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 77.35, durationSec 10 (kit-stated wall-clock, distinct from Effect 1's round count)."
    }
  ],
  "flags": [
    {
      "field": "override.modes / skill2[*].mode / trueNormalsModes",
      "estimate": "Static two-mode selection, default 'stance'; whichever mode is selected is credited for the entire fight from frame 0.",
      "reasoning": "S1's toggle alternates Stance ⇄ Engage on each full charge HELD ≥1s while not in Mighty Stomp. The engine has no alternating-self-mode primitive and no \"charge held for N sec\" trigger, so the only expressible encoding is the static `modes` gate. It is not purely a fudge — the hold is deliberate, so an SR that fires on release never toggles and camping one mode is a real pattern — but it cannot represent (a) the opening-Stance ramp before a player switches to Engage, (b) the ≥1s hold cost per switch, or (c) a player who intentionally alternates to collect both branches. A judge diff that disagrees here most likely disagrees about WHICH branch to treat as canonical, not about the magnitudes.",
      "recipe": "Focus recording of her solo: count full-charge releases vs mode-swap VFX over 60s to get the real duty cycle, and time the hold (release-to-release delta on a toggling charge vs a non-toggling one) to price the switch. If alternation turns out to be the real play, replace the mode gate with a `chargeCounter`-driven pair of blocks (or two authored comps, one per mode, graded separately) and weight by the measured duty cycle."
    },
    {
      "field": "burst[0].effects[0].durationSec",
      "estimate": "10 (seconds)",
      "reasoning": "The kit bounds Mighty Stomp ONLY by \"Duration: 1 rounds\" — there is no wall-clock figure anywhere in the burst block, but weaponSwap.durationSec is a required field. 10s is chosen as the Full Burst window length so the time bound never cuts the swap short before its single shot: with charge fixed at 1.5s the stomp fires ~1.5s into the window, so maxShots:1 is what actually ends the swap and durationSec is inert as written. It is still ⚑ because any value below ~1.5s would silently delete the whole burst and any value is unverified. Left out of `levelConst` on purpose so the level scaler keeps warning about it.",
      "recipe": "Recording of her burst: timestamp the cast banner → the stomp impact → the frame the base SR reappears in hand. If the weapon is handed back immediately after the single shot, durationSec is confirmed inert and can be pinned to ~2s; if she holds the stomp weapon for a fixed window after firing, author the measured value and drop maxShots."
    },
    {
      "field": "burst[0].effects[0] (shot economy: maxShots / chargeTimeClamp / weapon / pelletCount)",
      "estimate": "Exactly ONE stomp shot per burst: 1.5s fixed charge, 1 round, single damage instance of 101.3% × 250% full-charge, swap weapon class inherited from the base SR.",
      "reasoning": "Weapon-swap shot economy is kit-silent by the ALWAYS-⚑ taxonomy and this swap is unusually tight — a 1-round budget means the entire burst payload rides one hit, so every swap-economy assumption is load-bearing rather than marginal. Unknowns: (1) whether the engine's cast→swap→charge sequencing actually lands the shot inside Full Burst (if the 1.5s charge pushes impact past the FB window the ▲1400% charge buff and the +50% FB major could land on different sides of the boundary); (2) the swap weapon's CLASS, unstated, which sets range band and auto-core rate — a stomp is plausibly not SR-cored at all; (3) split-vs-merge — \"Damage: 101.3%\" is read as one merged instance (hitsPerShot inherited 1), which is also the burst-gauge assumption. Estimated optimistically per the taxonomy (shot lands in-window, inherits SR core).",
      "recipe": "Burst recording: count damage popups on the stomp (one vs several ⇒ merge vs split), check popup color/size for core vs body to infer the swap's core rate, and read the FB banner timer against the impact frame to confirm the shot is inside the window. If the stomp is core-ineligible, add `weapon` to the swap or model it as a non-coring flatDamage instead."
    },
    {
      "field": "base cadence tuple (ammo 6 / reloadFrames 141 / chargeFrames 60 / hitsPerShot 1)",
      "estimate": "Taken as given from the datamine.",
      "reasoning": "Mandatory ⚑ — the cadence fields are a known-unreliable datamine source, and this unit is unusually cadence-sensitive in two directions at once: BOTH S2 riders (370.08% / 450.89%) are keyed to `fullCharge`, so rider throughput is exactly her charged-pull rate, and the mode toggle is itself driven by charge behaviour. A 10% error in chargeFrames or reloadFrames moves her entire skill-slot output proportionally, with no offsetting term anywhere in the kit.",
      "recipe": "Count her charged pulls and reload cycles over a fixed 30s window on a focus recording and back out pulls/s and reload time; compare against chargeFrames 60 (1.0s) + reloadFrames 141 (2.35s) + ammo 6."
    },
    {
      "field": "skill2[1].effects[0].crit / skill2[2].effects[0].crit (and both riders' noFb)",
      "estimate": "crit: true on both riders; noFb left OFF (riders take the +50% Full Burst major by landing timing); core omitted.",
      "reasoning": "Convention, not measurement. The hard rules state function-damage riders crit at the caster's sheet rate, get NO core unless the text says \"core strike damage\" (it does not), are force-set no-range by the engine, and take Full Burst by timing with noFb measured-only and defaulted OFF. All three choices are therefore the documented defaults rather than anything this kit asserts — and because the riders are 370.08%/450.89% per full charge, they are the dominant non-burst term, so a wrong crit or FB ruling misses by a large margin in exactly the place it matters most.",
      "recipe": "Popup read on a focus recording: orange/large popups on the rider ⇒ crit-eligible (confirm ratio ≈ ×1.5 against non-crit instances); compare in-FB vs out-of-FB rider popups for the ×1.5 FB step to settle noFb; check for core-flavored popups to confirm core stays off."
    }
  ],
  "model": "claude-opus-5",
  "leakDetected": null
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 0 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"battleStart"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":20.1}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"passive"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":20.1}],"gates":{}}

### skill2: 1 identical block(s); 2 driver-only; 2 blind-only

- DRIVER ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":370.08,"flavor":"true"}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":450.89}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":450.89,"crit":true}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"fullCharge"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":370.08,"flavor":"true","crit":true}],"gates":{}}

### burst: 0 identical block(s); 2 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"weaponSwap","damagePct":101.3,"chargeTimeSec":1.5,"chargeTimeClamp":1.5,"chargeMultPct":250,"maxShots":1,"durationSec":180}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"chargeDamagePct","value":1400,"durationShots":1},{"kind":"buff","stat":"attackDamagePct","value":77.35,"durationSec":10}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"weaponSwap","damagePct":101.3,"chargeTimeSec":1.5,"chargeTimeClamp":1.5,"chargeMultPct":250,"durationSec":10,"maxShots":1,"levelConst":["chargeTimeSec","chargeTimeClamp","maxShots"]},{"kind":"buff","stat":"chargeDamagePct","value":1400,"durationShots":1,"levelConst":["durationShots"]},{"kind":"buff","stat":"attackDamagePct","value":77.35,"durationSec":10,"levelConst":["durationSec"]}],"gates":{}}

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/guilty-mighty-bunny.json

```json
{
  "note": "Guilty: Mighty Bunny (slug guilty-mighty-bunny) — SR/Attacker/Water/Missilis, Burst III cd 40s, ammo 6, charge 1s, full charge 250%. VARIANT of the base unit `guilty` (SG/Wind) — a different unit and kit. Kit-autonomy gauntlet 2026-10-02. BUNNY MODE is modeled as a user-selectable kit mode: modes ['Stance','Engage'], Stance first because the kit's battle-start line puts a unit that is not in Stance INTO Stance, so a fight opens in Stance and stays there unless the player deliberately holds Full Charge for 1 second (the sim releases at full charge, so it never holds — the rapunzel-pure-grace precedent for the 'Full Charge maintained for 1 or more seconds' clause). Selecting Engage models a player who toggled once at the opening and stayed there; in-fight re-toggling is unmodeled. SKILL1: battleStart self ATK ▲ 20.1% (continuous). SKILL2 'Chain Release' (mode Engage): trueNormalsModes ['Engage'] makes her normal attacks True-flavored — the base weapon (Effect 1) and the Mighty Stomp swap shot (Effect 2) — so ally True Damage ▲ buffs feed them; fullCharge → enemy flatDamage 370.08% flavor true (Effect 3, a skill hit: crits at her rate, never cores — the 2026-08-13 true-damage ruling). SKILL2 'Chain Enhance' (mode Stance): self Attack Damage ▲ 20.45% and Charge Damage ▲ 40% (both continuous, passive), and fullCharge → enemy flatDamage 450.89% plain additional damage. Both fullCharge riders also fire on the Mighty Stomp shot (it is a full-charge attack). BURST 'I'm Finally Free...!' (burstCast, self): weaponSwap Mighty Stomp — damagePct 101.3 ('Damage: 101.3% of final ATK'), chargeTimeSec 1.5 + chargeTimeClamp 1.5 ('Charge Time: Fixed at 1.5 sec'; the engine charges a swap only when it declares its own charge frames), chargeMultPct 250, maxShots 1 ('Duration: 1 rounds' — the swap ends right after its one shot), durationSec 180 as a fight-length bound only. Chain Release Effect 2 (Mighty Stomp deals true damage in Engage) needs no swap-level flag: the engine applies the unit's static true-normal flavor (trueNormalsModes) to swap shots as well, so the Stomp is True exactly in Engage. Additional Effect 1 = self chargeDamagePct 1400 durationShots 1 granted at the cast, so its one round is the Stomp shot. Additional Effect 2 = self attackDamagePct 77.35 for 10 sec.",
  "modes": ["Stance", "Engage"],
  "trueNormalsModes": ["Engage"],
  "unmodeled": {
    "skill1": [
      "■ Activates at the start of battle and when Full Charge is maintained for 1 or more seconds while this unit is not in the Mighty Stomp state. Affects self. Initiates a new Bunny Mode based on the current mode. Activates if this unit is in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed. Activates if this unit is not in the Bunny Mode: Stance state. Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed.",
      "■ Activates when this unit enters the Bunny Mode: Engage state. Affects all allies in the Bunny Mode: Stance state. Initiates Bunny Mode: Engage. This effect is continuous and cannot be removed.",
      "■ Activates when this unit enters the Bunny Mode: Stance state. Affects all allies in the Bunny Mode: Engage state. Initiates Bunny Mode: Stance. This effect is continuous and cannot be removed."
    ],
    "skill2": [
      "Chain Release Function: Changes some attacks' damage into true damage. — named state wrapper; its three effects ARE modeled (trueNormalsModes ['Engage'] for normals and the Mighty Stomp, the Engage fullCharge 370.08% true rider).",
      "Chain Enhance Function: Enhances this unit's offensive capabilities. — named state wrapper; its three effects ARE modeled (Stance Attack Damage ▲ 20.45%, Charge Damage ▲ 40%, the Stance fullCharge 450.89% rider)."
    ],
    "burst": []
  },
  "caveats": [
    "skill1 Bunny Mode TOGGLE (unmodeled as a live mechanic): the mode is a static per-fight selection (modes, Stance default). The in-game switch needs Full Charge held for 1 or more seconds outside Mighty Stomp, which the sim never does (it releases at full charge). Engage is the player-choice mode; the cost of the one opening hold (about 1 second of delayed fire) is not charged. Repeated toggling mid-fight is not modeled.",
    "skill1 ALLY MODE SYNC (unmodeled): entering Engage or Stance pulls every ally in the opposite Bunny Mode along with her, so on a team with Sin: Swift Bunny (sin-swift-bunny) both units are always in the SAME mode. Nothing enforces that here — select the same mode for both.",
    "burst Mighty Stomp ammo: the kit gives the swap no magazine; the engine's real-weapon swap entry refills to her current maximum magazine and, because the swap ends by use (maxShots 1), hands the base weapon back with that magazine less the Stomp round — one short of the full base magazine the 2026-08-12 real-weapon-change ruling describes for a swap's exit, and not her pre-cast count. ⚑ estimate = a full magazine less one after each Stomp; recipe = count her shots between the Stomp and the next reload in a focus video; tier = MEASUREMENT-GATED.",
    "burst durationSec 180 is a fight-length bound, not a kit value: the kit's duration is '1 rounds' (maxShots 1)."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "battleStart"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 20.1
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
      "mode": "Engage",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 370.08,
          "flavor": "true"
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "mode": "Stance",
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 20.45
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 40
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
      "mode": "Stance",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 450.89
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 101.3,
          "chargeTimeSec": 1.5,
          "chargeTimeClamp": 1.5,
          "chargeMultPct": 250,
          "maxShots": 1,
          "durationSec": 180
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
          "stat": "chargeDamagePct",
          "value": 1400,
          "durationShots": 1
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 77.35,
          "durationSec": 10
        }
      ]
    }
  ]
}
```

### 7b. scripts/tests/units/guilty-mighty-bunny.test.ts

```ts
// PER-UNIT KIT SPEC — `guilty-mighty-bunny` (Guilty: Mighty Bunny, SR/Attacker/Water/Missilis,
// Burst III cd 40s, ammo 6, charge 1s). VARIANT of the base unit `guilty` (SG/Wind) — a different
// unit and kit. Kit-autonomy gauntlet 2026-10-02, tier 2 (a self-mode system with mode-gated true
// damage, a round-count burst buff, a uses-bounded burst weapon swap).
//
// One assertion group per KIT LINE, against the SHIPPED override; `withPatchedOverride` only builds
// the named nearest-wrong COUNTERFACTUALS, each of which must flip the assertion.
//
// Kit (data/characters.json → characters['guilty-mighty-bunny'].skills, L10):
//   S1 ■ battle start → self: ATK ▲ 20.1%, continuous                                          [G1]
//      ■ battle start / Full Charge held ≥1s outside Mighty Stomp → toggle Bunny Mode
//        (Stance ⇄ Engage); allies in the opposite mode follow                     [UNMODELED]
//   S2 ■ Engage — Chain Release: normals deal true damage (E1), Mighty Stomp deals true damage
//        (E2), on landing a Full Charge attack: 370.08% of final ATK as true damage (E3)     [G3–G5]
//      ■ Stance — Chain Enhance: Attack Damage ▲ 20.45% (E1), Charge Damage ▲ 40% (E2), on
//        landing a Full Charge attack: 450.89% of final ATK as additional damage (E3)        [G2–G3]
//   BU ■ self: Mighty Stomp weapon change — charge fixed 1.5s, 101.3% of final ATK, full charge
//        250%, 1 round; Charge Damage ▲ 1400% for 1 round; Attack Damage ▲ 77.35% for 10 sec [G6–G8]
//
// Bunny Mode is a static user-selected kit mode (modes ['Stance','Engage'], Stance default — the
// kit's battle-start line puts her INTO Stance; only a 1s Full Charge hold, which the sim never
// performs, switches it). Why each assertion discriminates:
//   G1  one self grant at frame 0, no expiry, value 20.1.
//   G2  the default selection IS Stance: Chain Enhance's two buffs exist from frame 0 and Chain
//       Release's rider never fires; Engage swaps both sides. A mode-blind encoding (both branches
//       always on) fires both riders.
//   G3  the full-charge rider fires once per CHARGED shot INCLUDING the Mighty Stomp shot (it is a
//       full-charge attack) — an unswapped-only reading drops the 6 Stomp riders.
//   G4  Engage's rider is TRUE: a self True Damage ▲ buff lands in its dmgUp, which a plain rider
//       ignores; it never cores (a skill hit — the 2026-08-13 true-damage ruling).
//   G5  Engage makes her normals true (trueNormalsModes), Stance does not — the base weapon AND the
//       Stomp shot (the engine applies the unit's static true-normal flavor to swap shots too, which
//       is exactly Chain Release E2), so one swap block serves both modes.
//   G6  exactly one Stomp shot per cast (maxShots 1 — "Duration: 1 rounds"), charged, at 101.3%,
//       ≥ 89 frames after the cast (the 90-frame fixed charge counts the cast frame); without maxShots the swap
//       keeps firing Stomps for its whole durationSec.
//   G7  the 1400% Charge Damage rides exactly ONE round — the Stomp: the Stomp's charge multiplier
//       is 2.5 + 14.0 (+0.4 Stance), and the next base shot is back to 2.5 (+0.4).
//   G8  Attack Damage 77.35% is self-only, granted at each cast, expiring 600 frames later.
//
// Fixture: controlComp — liter (B1) / crown (B2) / guilty-mighty-bunny (B3, focus) / `helm`
// (SR/Water Helm, B3), boss Fire. Deterministic; event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'guilty-mighty-bunny';
const IDX = 2;
const BASE_MULT = 69.04;
const STOMP_MULT = 101.3;
const ENGAGE_RIDER = 370.08;
const STANCE_RIDER = 450.89;
const TRUE_BUFF = 100; // synthetic self True Damage ▲ used only to OBSERVE true flavor

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(mode?: string, override?: unknown) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    modes: mode ? { [SLUG]: mode } : undefined,
    overrides: override ? { [SLUG]: override as never } : undefined,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, total: unitOf(res, SLUG).totalDamage };
}
type Run = ReturnType<typeof run>;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (r: Run) =>
  r.events.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
const normals = (r: Run) => dmg(r).filter((d) => d.srcSlot === 'normal');
const baseShots = (r: Run) =>
  normals(r).filter((d) => d.atkPct.toFixed(2) === BASE_MULT.toFixed(2));
const stomps = (r: Run) =>
  normals(r).filter((d) => d.atkPct.toFixed(2) === STOMP_MULT.toFixed(2));
const riders = (r: Run) => dmg(r).filter((d) => d.srcSlot === 'skill2');
const shots = (r: Run) =>
  r.events.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const casts = (r: Run) =>
  r.events
    .filter(
      (e) => e.kind === 'burstCast' && (e as { slug: string }).slug === SLUG
    )
    .map((e) => e.frame);
const ownBuffs = (r: Run, stat: string) =>
  r.events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === IDX && e.stat === stat
  );
const uniqAtk = (xs: Damage[]) =>
  [...new Set(xs.map((d) => +d.atkPct.toFixed(2)))].sort();
const dmgUpAt = (xs: Damage[]) =>
  new Map(xs.map((d) => [d.frame, d.mult.dmgUp]));

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const withTrueBuff = (ov: any) =>
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'trueDamagePct', value: TRUE_BUFF }],
  });
const rider = (ov: any, mode: string) =>
  ov.skill2.find(
    (b: any) => b.mode === mode && b.trigger.kind === 'fullCharge'
  );
const swapEffects = (ov: any) =>
  ov.burst
    .filter((b: any) => b.effects.some((e: any) => e.kind === 'weaponSwap'))
    .map((b: any) => b.effects.find((e: any) => e.kind === 'weaponSwap'));
const burstBuffs = (ov: any) =>
  ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );

const modeBlind = patch((ov) => {
  for (const s of ['skill1', 'skill2', 'burst']) {
    for (const b of ov[s]) delete b.mode;
  }
});
const riderUnswappedOnly = patch((ov) => {
  rider(ov, 'Stance').swapGate = 'unswapped';
});
const trueBuffed = patch(withTrueBuff);
const trueBuffedPlainRider = patch((ov) => {
  withTrueBuff(ov);
  delete rider(ov, 'Engage').effects[0].flavor;
});
const trueBuffedNoModeNormals = patch((ov) => {
  withTrueBuff(ov);
  delete ov.trueNormalsModes;
});
const noMaxShots = patch((ov) => {
  for (const e of swapEffects(ov)) delete e.maxShots;
});
const fasterStomp = patch((ov) => {
  for (const e of swapEffects(ov)) {
    e.chargeTimeSec = 1;
    e.chargeTimeClamp = 1;
  }
});
const twoRoundChargeBuff = patch((ov) => {
  burstBuffs(ov).effects.find(
    (e: any) => e.stat === 'chargeDamagePct'
  ).durationShots = 2;
});
const adAllAllies = patch((ov) => {
  const b = burstBuffs(ov);
  const ad = b.effects.find((e: any) => e.stat === 'attackDamagePct');
  b.effects = b.effects.filter((e: any) => e !== ad);
  ov.burst.push({ ...b, target: { kind: 'allies' }, effects: [ad] });
});

const stance = run('Stance');
const engage = run('Engage');
const byDefault = run();

describe('G1 — S1 battle-start ATK ▲ 20.1% (self, continuous)', () => {
  it('one self grant at frame 0, no expiry', () => {
    const g = ownBuffs(stance, 'atkPct');
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      frame: 0,
      value: 20.1,
      targetSlug: SLUG,
      expiresFrame: null,
    });
  });
});

describe('G2 — Bunny Mode is a kit mode, Stance by default', () => {
  it('the default selection behaves exactly as Stance', () => {
    expect(byDefault.total).toBe(stance.total);
  });
  it('Stance: Chain Enhance buffs from frame 0, only the 450.89% rider', () => {
    expect(
      ownBuffs(stance, 'attackDamagePct').filter((b) => b.value === 20.45)
    ).toMatchObject([{ frame: 0, expiresFrame: null, targetSlug: SLUG }]);
    expect(
      ownBuffs(stance, 'chargeDamagePct').filter((b) => b.value === 40)
    ).toMatchObject([{ frame: 0, expiresFrame: null, targetSlug: SLUG }]);
    expect(uniqAtk(riders(stance))).toEqual([STANCE_RIDER]);
  });
  it('Engage: no Chain Enhance buffs, only the 370.08% rider', () => {
    expect(
      ownBuffs(engage, 'attackDamagePct').filter((b) => b.value === 20.45)
    ).toEqual([]);
    expect(
      ownBuffs(engage, 'chargeDamagePct').filter((b) => b.value === 40)
    ).toEqual([]);
    expect(uniqAtk(riders(engage))).toEqual([ENGAGE_RIDER]);
  });
  it('COUNTERFACTUAL: a mode-blind encoding fires both riders', () => {
    expect(uniqAtk(riders(run('Stance', modeBlind)))).toEqual([
      ENGAGE_RIDER,
      STANCE_RIDER,
    ]);
  });
});

describe('G3 — the full-charge rider fires on every charged shot, the Stomp included', () => {
  it('one rider per charged shot, frame-locked to it', () => {
    for (const r of [stance, engage]) {
      const charged = shots(r)
        .filter((s) => s.charged)
        .map((s) => s.frame);
      expect(charged.length).toBeGreaterThan(50);
      expect(riders(r).map((d) => d.frame)).toEqual(charged);
    }
  });
  it('the Stomp shots carry a rider', () => {
    const riderFrames = new Set(riders(stance).map((d) => d.frame));
    expect(stomps(stance).length).toBeGreaterThan(0);
    for (const s of stomps(stance)) expect(riderFrames.has(s.frame)).toBe(true);
  });
  it('COUNTERFACTUAL: an unswapped-only rider drops the Stomp riders', () => {
    const cf = run('Stance', riderUnswappedOnly);
    expect(riders(cf).length).toBe(
      riders(stance).length - stomps(stance).length
    );
  });
});

describe('G4 — Engage rider (Chain Release E3) is true damage from a skill', () => {
  const buffed = run('Engage', trueBuffed);
  const plain = run('Engage', trueBuffedPlainRider);
  it('a True Damage ▲ buff lands in its dmgUp; a plain rider ignores it', () => {
    const a = riders(buffed)[0];
    const b = riders(plain)[0];
    expect(a.frame).toBe(b.frame);
    expect(a.mult.dmgUp - b.mult.dmgUp).toBeCloseTo(TRUE_BUFF / 100, 6);
  });
  it('never cores (skill-sourced)', () => {
    expect(riders(engage).every((d) => !d.coreEligible)).toBe(true);
  });
});

describe('G5 — true-flavored normals and Stomp only in Engage', () => {
  const buffed = run('Engage', trueBuffed);
  it('Engage base-weapon normals take the True Damage ▲ buff (trueNormalsModes)', () => {
    const cf = dmgUpAt(baseShots(run('Engage', trueBuffedNoModeNormals)));
    const live = baseShots(buffed);
    expect(live.length).toBeGreaterThan(50);
    for (const d of live) {
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
    }
  });
  it('Stance base-weapon normals do not', () => {
    const plain = dmgUpAt(baseShots(stance));
    for (const d of baseShots(run('Stance', trueBuffed))) {
      expect(d.mult.dmgUp).toBeCloseTo(plain.get(d.frame)!, 9);
    }
  });
  it('the Engage Stomp is true (trueNormalsModes covers swap shots); without the field it is not', () => {
    const cf = dmgUpAt(stomps(run('Engage', trueBuffedNoModeNormals)));
    for (const d of stomps(buffed)) {
      expect(d.mult.dmgUp - cf.get(d.frame)!).toBeCloseTo(TRUE_BUFF / 100, 6);
    }
  });
  it('the Stance Stomp is not true', () => {
    const plain = dmgUpAt(stomps(stance));
    for (const d of stomps(run('Stance', trueBuffed))) {
      expect(d.mult.dmgUp).toBeCloseTo(plain.get(d.frame)!, 9);
    }
  });
});

describe('G6 — Mighty Stomp: one 1.5s-charge shot per cast', () => {
  it('exactly one Stomp per cast, charged, the first shot after the cast, ≥ 90 frames later', () => {
    for (const r of [stance, engage]) {
      const cs = casts(r);
      expect(cs.length).toBeGreaterThanOrEqual(5);
      const st = stomps(r);
      expect(st).toHaveLength(cs.length);
      cs.forEach((c, i) => {
        const first = shots(r).find((s) => s.frame > c)!;
        expect(first.frame).toBe(st[i].frame);
        expect(first.charged).toBe(true);
        // 90-frame fixed charge, counted from the cast frame inclusive
        expect(st[i].frame - c).toBeGreaterThanOrEqual(89);
      });
    }
  });
  it('the Stomp lands inside Full Burst and takes the +50% major (it fires ~1.5s after the cast)', () => {
    expect(stomps(stance).every((d) => d.inFullBurst && d.fbMajorApplied)).toBe(
      true
    );
  });
  it('COUNTERFACTUAL: without maxShots the swap keeps firing Stomps', () => {
    expect(stomps(run('Stance', noMaxShots)).length).toBeGreaterThan(
      casts(stance).length
    );
  });
  it('COUNTERFACTUAL: a 1.0s charge fires the Stomp earlier', () => {
    const cf = stomps(run('Stance', fasterStomp));
    expect(cf[0].frame).toBeLessThan(stomps(stance)[0].frame);
  });
});

describe('G7 — Charge Damage ▲ 1400% for exactly one round (the Stomp)', () => {
  it('Stomp charge multiplier = 2.5 + 14.0 (+0.4 Stance); the next base shot is back to base', () => {
    for (const [r, extra] of [
      [stance, 0.4],
      [engage, 0],
    ] as const) {
      for (const s of stomps(r)) {
        expect(s.mult.charge).toBeCloseTo(2.5 + 14 + extra, 6);
        const next = normals(r).find((d) => d.frame > s.frame)!;
        expect(next.mult.charge).toBeCloseTo(2.5 + extra, 6);
      }
    }
  });
  it('granted at each cast as a 1-round buff', () => {
    expect(
      ownBuffs(stance, 'chargeDamagePct')
        .filter((b) => b.value === 1400)
        .map((b) => [b.frame, b.durationShots])
    ).toEqual(casts(stance).map((c) => [c, 1]));
  });
  it('COUNTERFACTUAL: a 2-round buff also lifts the shot after the Stomp', () => {
    const cf = run('Stance', twoRoundChargeBuff);
    const s = stomps(cf)[0];
    const next = normals(cf).find((d) => d.frame > s.frame)!;
    expect(next.mult.charge).toBeCloseTo(2.5 + 14 + 0.4, 6);
  });
});

describe('G8 — Attack Damage ▲ 77.35% for 10 sec (self)', () => {
  it('self-only, once per cast, 600 frames', () => {
    const g = ownBuffs(stance, 'attackDamagePct').filter(
      (b) => b.value === 77.35
    );
    expect(g.map((b) => [b.frame, b.expiresFrame, b.targetSlug])).toEqual(
      casts(stance).map((c) => [c, c + 600, SLUG])
    );
  });
  it('COUNTERFACTUAL: an all-allies reading lands on four targets', () => {
    const g = ownBuffs(run('Stance', adAllAllies), 'attackDamagePct').filter(
      (b) => b.value === 77.35
    );
    expect(new Set(g.map((b) => b.targetSlug)).size).toBe(4);
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/guilty-mighty-bunny.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — guilty-mighty-bunny — kit-autonomy gauntlet 2026-10-02
Arm 1 (pre-S3, NO override on disk — the new unit's starting state): RED as required:
    Error: guilty-mighty-bunny: no override on disk — fixture is stale
          Tests  no tests
Arm 2 (shipped override): npx vitest run scripts/tests/units/guilty-mighty-bunny.test.ts --reporter=verbose — every COUNTERFACTUAL case runs the named nearest-wrong encoding via withPatchedOverride in the same file and asserts it diverges, so GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions.

 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G1 — S1 battle-start ATK ▲ 20.1% (self, continuous) > one self grant at frame 0, no expiry 2ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G2 — Bunny Mode is a kit mode, Stance by default > the default selection behaves exactly as Stance 0ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G2 — Bunny Mode is a kit mode, Stance by default > Stance: Chain Enhance buffs from frame 0, only the 450.89% rider 1ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G2 — Bunny Mode is a kit mode, Stance by default > Engage: no Chain Enhance buffs, only the 370.08% rider 1ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G2 — Bunny Mode is a kit mode, Stance by default > COUNTERFACTUAL: a mode-blind encoding fires both riders 33ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G3 — the full-charge rider fires on every charged shot, the Stomp included > one rider per charged shot, frame-locked to it 2ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G3 — the full-charge rider fires on every charged shot, the Stomp included > the Stomp shots carry a rider 1ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G3 — the full-charge rider fires on every charged shot, the Stomp included > COUNTERFACTUAL: an unswapped-only rider drops the Stomp riders 33ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G4 — Engage rider (Chain Release E3) is true damage from a skill > a True Damage ▲ buff lands in its dmgUp; a plain rider ignores it 1ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G4 — Engage rider (Chain Release E3) is true damage from a skill > never cores (skill-sourced) 1ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G5 — true-flavored normals and Stomp only in Engage > Engage base-weapon normals take the True Damage ▲ buff (trueNormalsModes) 30ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G5 — true-flavored normals and Stomp only in Engage > Stance base-weapon normals do not 29ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G5 — true-flavored normals and Stomp only in Engage > the Engage Stomp is true (trueNormalsModes covers swap shots); without the field it is not 27ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G5 — true-flavored normals and Stomp only in Engage > the Stance Stomp is not true 30ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G6 — Mighty Stomp: one 1.5s-charge shot per cast > exactly one Stomp per cast, charged, the first shot after the cast, ≥ 90 frames later 5ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G6 — Mighty Stomp: one 1.5s-charge shot per cast > the Stomp lands inside Full Burst and takes the +50% major (it fires ~1.5s after the cast) 0ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G6 — Mighty Stomp: one 1.5s-charge shot per cast > COUNTERFACTUAL: without maxShots the swap keeps firing Stomps 29ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G6 — Mighty Stomp: one 1.5s-charge shot per cast > COUNTERFACTUAL: a 1.0s charge fires the Stomp earlier 27ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G7 — Charge Damage ▲ 1400% for exactly one round (the Stomp) > Stomp charge multiplier = 2.5 + 14.0 (+0.4 Stance); the next base shot is back to base 3ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G7 — Charge Damage ▲ 1400% for exactly one round (the Stomp) > granted at each cast as a 1-round buff 0ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G7 — Charge Damage ▲ 1400% for exactly one round (the Stomp) > COUNTERFACTUAL: a 2-round buff also lifts the shot after the Stomp 20ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G8 — Attack Damage ▲ 77.35% for 10 sec (self) > self-only, once per cast, 600 frames 1ms
 ✓ scripts/tests/units/guilty-mighty-bunny.test.ts > G8 — Attack Damage ▲ 77.35% for 10 sec (self) > COUNTERFACTUAL: an all-allies reading lands on four targets 19ms

      Tests  23 passed (23)
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — guilty-mighty-bunny (Guilty: Mighty Bunny), kit-autonomy gauntlet 2026-10-02

Driver: Claude Opus 5.5. Routing (Claude-only, owner 2026-10-02): S2b `claude-fable-5` + `claude-fable-5-1`
(tier 2), S5/S6 `claude-opus-5`, S7 `claude-fable-5-1` + `claude-fable-5`. All blind roles were dispatched
from an empty temp dir after the 2026-10-02 bridge fix (the first batch, dispatched from the repo cwd,
saw the driver's recent commit subjects and was discarded — see DECISIONS 2026-10-02).

## Tier

Tier 2: a self-mode system with mode-gated true damage, a round-count burst buff (`durationShots: 1`), a
uses-bounded burst weapon swap (`maxShots: 1`).

## Engine facts the blind roles could not see (verified by run)

1. **`trueNormalsModes` also flavors swap shots.** The normal-fire path reads
   `swap.trueNormals || hasTrueNormals`, and `trueNormalsModes` sets `hasTrueNormals` from the selected
   mode at setup. So in Engage the Mighty Stomp shot is already True — the mode-gated swap copy with
   `trueNormals` that both S2b reviewers proposed is behaviour-identical and was collapsed to ONE swap
   block. Pinned: G5 "the Engage Stomp is true … without the field it is not".
2. **Stomp timing.** The Stomp fires 89–103 frames after each cast (the 90-frame fixed charge counts the
   cast frame), inside Full Burst, taking the +50% major. Pinned G6.
3. **Charge bucket.** `chargeDamagePct` is additive points on the charge multiplier: Stomp = 2.5 + 14.0
   (+0.4 in Stance); the next base shot is back to 2.5 (+0.4). Pinned G7.
4. **Stomp ammo.** A real-weapon swap's entry refills to her current max magazine (9 in the control comp,
   ammo buffs included); the uses-based end (maxShots) hands the base weapon back with that magazine
   less the Stomp round — not the full magazine the 2026-08-12 ruling describes for a timed exit. ⚑
   caveat with a footage recipe.

## S2c reconciliation (driver spec vs both S2b reviews)

Converged on every line: Stance default (battle-start branch), static `modes` with the toggle + ally
sync UNMODELED, `trueNormalsModes` for Engage normals, both riders on `fullCharge` incl. the Stomp,
Stance AD 20.45 / CD 40 as `attackDamagePct` / `chargeDamagePct`, `maxShots: 1` and `durationShots: 1`
as round counts beside the genuine 10 s Attack Damage. Divergences, resolved toward the prose:

- Stomp true-flavor carrier (reviewers: mode-gated swap `trueNormals`; driver: `trueNormalsModes`) —
  behaviour-identical, see engine fact 1.
- `durationSec` bound on the swap: reviewers 10, driver 180 — never binds (maxShots ends it first);
  recorded as a bound, not a kit value.
  Adopted from the reviews: the Stomp-inside-FB pin, the 1400-not-on-next-shot pin, mutual exclusion.

## S5 convergence run (blind test vs the driver's shipped override)

The verbatim blind file (`scripts/kit-autonomy/blind/guilty-mighty-bunny.test.ts`, claude-opus-5, leakDetected null)
sets `onEvent` on the CompOptions top level, where `runComp` never reads it (the harness takes it under
`cfg`), so verbatim it captures no events and every event-reading assertion sees 0 — a harness
RECON error, not a model divergence. With ONLY that wiring routed through `cfg`
(`scripts/kit-autonomy/blind/guilty-mighty-bunny.adapted.test.ts`, one line, marked ADAPTED) it runs against the driver's
override: **11 passed / 0 failed / 3 skipped (its own declared GAPs: the mode toggle, the ally sync, the Engage true flavor it judged unobservable without a True Damage ▲ consumer)**.
The S6 blind override (claude-opus-5, leakDetected null) is block-equivalent to the driver's; the
differences are cosmetic (passive vs battleStart for the frame-0 ATK, stage:3 on a Burst III burstCast,
mode label text) or non-binding (swap durationSec bound).
