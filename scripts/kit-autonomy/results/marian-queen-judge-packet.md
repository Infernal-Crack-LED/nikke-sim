# S7 RECONCILING-JUDGE PACKET — `marian-queen` (Marian: Queen, MG/Attacker/Fire/Burst III)

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
  "slug": "marian-queen",
  "name": "Marian: Queen",
  "weapon": "MG",
  "burst": "III",
  "class": "Attacker",
  "element": "Fire",
  "manufacturer": "Pilgrim",
  "burstCooldownSec": 40,
  "ammo": 300,
  "reloadFrames": 171,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "normalAttackMultiplier": 5.57,
  "coreAttackMultiplier": 200
}
```

### skill1

```text
■ Activates at the start of battle. Affects self.
Into the Fray: Sharpened Resolve
Function: Launches Dark Matter spears at random enemies.
Effect 1: Affects random enemies. Dark Matter Spear: Deals 125.51% of final ATK as damage. Attacks sequentially 7 times.
Effect 2: Activates when landing a hit with a Dark Matter spear. Affects the target. Open Wounds: Damage Taken ▲ 5.05%. This effect is continuous and cannot be removed.
Recurring interval: 4 sec
■ Activates when using Burst Skill. Affects all enemies.
Open Wounds: Damage Taken ▲ 5.05%. This effect is continuous and cannot be removed.
```

### skill2

```text
■ Activates when using Burst Skill. Affects self.
Into the Fray: Penetrant Wish
Function: Deals core damage to all enemies in the Open Wounds state.
Effect 1: Activates after performing 2 normal attacks. Affects all enemies in the Open Wounds state. Deals 14.06% of final ATK as core strike damage.
Effect 2: Affects self. Recurring interval of Into the Fray: Sharpened Resolve ▼ 2 sec.
Duration: 10 sec
■ Activates when entering Full Burst while not in the Into the Fray: Penetrant Wish state. Affects self.
Sequential Attack Damage ▲ 85.17% for 10 sec.
■ Activates when entering Full Burst while in the Into the Fray: Penetrant Wish state. Affects self.
Core Damage ▲ 24.64% for 10 sec.
```

### burst

```text
■ Affects self.
Reloads 100% of ammo.
Machine Gun Ramp-Up Speed ▲ 100% for 10 sec.
ATK ▲ 78.4% for 10 sec.
Attack Damage ▲ 78.14% for 10 sec.
■ Affects all enemies.
Deals 1346.4% of final ATK as Burst Skill damage.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "marian-queen",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Dark Matter Spear: 125.51% x7 sequential",
      "disposition": "FAITHFUL",
      "scope": "Skill function damage — 7 sequential spear hits of 125.51% final ATK each, aimed at 'random enemies' (single boss ⇒ all 7 land on the boss). Must carry flavor:'sequential' so Sequential Attack Damage ▲ feeds it; NOT normal-attack-scoped.",
      "durationSemantics": "Instantaneous volley per activation; no duration. Cadence is the kit-stated 'Recurring interval: 4 sec', dynamically shortened to 2s while skill2's CDR buff is live (skillCooldownReductionSec). First-fire phase (t=0 'start of battle' vs t=4) is a ⚑ convention.",
      "triggerIdentity": "interval (sec:4). 'Activates at the start of battle' opens the recurring loop — it is not a one-shot battleStart volley.",
      "targetSet": "enemy (boss). The ■ header's 'Affects self' is the mode-holder; Effect 1's own clause 'Affects random enemies' is the damage target.",
      "nearestWrongModel": "A single aggregated 878.57% hit (losing sequential flavor + 7 gauge impacts), or an untagged flavor so the 85.17% Sequential buff is dead, or an interval frozen at 4s that ignores skill2's '▼ 2 sec' rider.",
      "distinguishingAssertion": "onEvent damage: skill1-slot events arrive in volleys of 7 instances (or gaugeHits:7 on one instance) at ~4s spacing outside Penetrant Wish and ~2s spacing inside the 10s post-own-burst window; per-hit mult grows by exactly the sequentialDamagePct term (85.17 additive in Damage Up) on FBs where the Sequential buff applied and not otherwise.",
      "inertness": "Her MG normal-attack damage per round must NOT move when Sequential Attack Damage ▲ is active (normals are not sequential-flavored).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Open Wounds: Damage Taken ▲ 5.05%",
      "disposition": "FAITHFUL",
      "scope": "Boss DEBUFF (team-wide benefit, taxonomy #4) + a kit-NAMED enemy status window. Needs BOTH a damageTakenPct 5.05 buff on the boss AND a targetStatus 'Open Wounds' (the name is read by skill2's 'all enemies in the Open Wounds state' gate).",
      "durationSemantics": "'continuous and cannot be removed' = permanent (durationSec ≥ fight length / absent). NOT a finite window, NOT round-count.",
      "triggerIdentity": "On-HIT rider of the spear ('when landing a hit with a Dark Matter spear'), i.e. fires with each spear landing; no FB gate.",
      "targetSet": "the target (enemy/boss) — explicitly NOT a self buff.",
      "nearestWrongModel": "Stacking: 7 fresh stacks per 4s volley compounding damageTakenPct without bound (~315 stacks over 180s) — the kit has no 'stacks up to N' wording, so re-application REFRESHES one permanent instance. Second misread: encoding only the stat and omitting the named targetStatus, silently killing skill2's status gate.",
      "distinguishingAssertion": "boss-held buffApply (casterIdx===null && targetIdx===null) with stat 'damageTakenPct', value 5.05, stacks 1; team totals in the back half of the fight scale by a CONSTANT ×1.0505 damage-taken term, not a growing one — assert late-fight per-hit mult equals early-fight per-hit mult.",
      "inertness": "A second/seventh spear hit must NOT raise the boss's damage-taken term above one 5.05% instance.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Burst: Open Wounds all enemies",
      "disposition": "FAITHFUL",
      "scope": "Same Open Wounds payload (damageTakenPct 5.05 + targetStatus 'Open Wounds', permanent), applied as a blanket on burst cast.",
      "durationSemantics": "Permanent ('continuous and cannot be removed').",
      "triggerIdentity": "burstCast — 'Activates when using Burst Skill' is HER OWN burst, never fullBurstEnter (methodology #3).",
      "targetSet": "all enemies (boss).",
      "nearestWrongModel": "fullBurstEnter keying (fires on ANY team FB — over-credits timing in multi-B3 comps), or treating it as an additional second damageTakenPct instance stacking with the spear-applied one.",
      "distinguishingAssertion": "A boss-held damageTakenPct 5.05 buffApply coincides with her burstCast event frame; the total boss damage-taken term after her burst is still exactly one 5.05% instance (refresh, not stack).",
      "inertness": "Damage totals barely move when this block is disabled (spears already applied Open Wounds by ~t≤4s) — the assertion is structural, not magnitude.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Penetrant Wish mode, Duration: 10 sec",
      "disposition": "FAITHFUL",
      "scope": "A named SELF mode (selfStatus 'Into the Fray: Penetrant Wish', 10s) opened on burst cast; both skill2 riders and both skill2 FB-enter branches key off being in/out of it.",
      "durationSemantics": "durationSec 10 — wall-clock, refreshed only by her next burst cast (40s cd ⇒ no overlap).",
      "triggerIdentity": "burstCast ('Activates when using Burst Skill. Affects self.') — fires ONLY on rotations where marian-queen herself bursts. burstCast ≠ fullBurstEnter is THE central trap of this kit.",
      "targetSet": "self.",
      "nearestWrongModel": "fullBurstEnter keying: the mode (and its every-2-rounds core strikes + interval CDR) would run on EVERY team Full Burst, including rotations where the other B3 bursts — a large over-credit in any 2×B3 comp (controlComp includes helm B3).",
      "distinguishingAssertion": "In controlComp (helm co-B3 present): on FB rotations where marian did NOT cast her burst, ZERO skill2 core-strike damage events and the spear interval stays 4s; on her own-burst rotations, the mode's riders run for exactly the 10s window.",
      "inertness": "Teammate bursts must NOT open the mode.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "every 2 normal attacks: 14.06% core strike",
      "disposition": "FAITHFUL",
      "scope": "flatDamage 14.06% final ATK with core:true — the text says 'core strike damage', so it receives the core bucket (coreAttackMultiplier 200) scaled by core rate; it is NOT a plain non-core proc. Gated on target being in Open Wounds (requiresTargetStatus 'Open Wounds') AND on the self mode (requiresSelfStatus).",
      "durationSemantics": "Lives only inside the 10s Penetrant Wish window.",
      "triggerIdentity": "hitCount count:2 — counts ROUNDS (MG hitsPerShot 1 ⇒ 1 per pull, so pull-vs-pellet is degenerate here). Counting scope: the wording 'Activates after performing 2 normal attacks' sits INSIDE the 10s mode, so accrual should be gated to the window (countScope:'gated' semantics) — out-of-window rounds must not pre-charge or spend the counter.",
      "targetSet": "all enemies in the Open Wounds state (boss).",
      "nearestWrongModel": "core:false (dropping the 'core strike' tag — roughly halves-plus this rider given the 200% core mult and coreDamagePct 24.64 co-active in the same window), or an ungated counter that accrues across the whole fight, or the whole rider keyed to fullBurstEnter so it fires in every FB.",
      "distinguishingAssertion": "During her own-burst 10s window: one 14.06% damage event per 2 MG rounds fired, each event carrying the core-rate-scaled core term (mult includes core bucket AND the 24.64 coreDamagePct); zero such events during FBs she did not cast and zero outside the 10s window.",
      "inertness": "Rounds fired OUTSIDE the window must not advance the counter (no core strike on the 1st in-window round).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Sharpened Resolve interval ▼ 2 sec",
      "disposition": "FAITHFUL",
      "scope": "skillCooldownReductionSec 2 on SELF — dynamically shortens skill1's interval timer 4s → 2s while active. A weapon/cadence-adjacent line that IS damage (it ~doubles spear volleys and Open Wounds refreshes inside the window).",
      "durationSemantics": "10s (the mode's Duration applies to both Effect lines).",
      "triggerIdentity": "burstCast (rider of the Penetrant Wish block).",
      "targetSet": "self.",
      "nearestWrongModel": "Permanent interval rewrite to 2s (over-credits ~2× spear damage all fight), or dropped as non-damage utility, or ▼2 read as 'interval = 2 sec from battle start'.",
      "distinguishingAssertion": "Spear volley timestamps: ~2s apart only inside the 10s post-own-burst window (≈5 volleys), reverting to ~4s after expiry; a fight with her burst disabled shows uniform 4s spacing throughout.",
      "inertness": "Interval outside the window must stay 4s; teammate FBs must not shorten it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter, NOT in state: Seq Dmg ▲85.17%",
      "disposition": "FAITHFUL",
      "scope": "sequentialDamagePct 85.17 — ADDITIVE in the Damage Up bucket, feeding ONLY sequential-flavored damage (her Dark Matter spears). Emphatically NOT attackDamagePct and NOT a buff to MG normals.",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "fullBurstEnter ('when entering Full Burst') + a NOT-in-Penetrant-Wish gate. The schema has no negated requiresSelfStatus; ownBurstGate:'notCast' is the faithful proxy (she is in the state at FB entry iff she cast this rotation — burstCast leads FB entry by the chain gap). The two FB-enter branches are MUTUALLY EXCLUSIVE per rotation.",
      "targetSet": "self.",
      "nearestWrongModel": "Applying it on EVERY FB alongside the Core Damage branch (double-dipping both branches every rotation), or encoding as attackDamagePct / sequentialMultPct (wrong bucket: attackDamagePct boosts her whole MG output; sequentialMultPct is an undiluted true multiplier — both over-credit).",
      "distinguishingAssertion": "On an FB entered via the OTHER B3's burst: buffApply stat 'sequentialDamagePct' value 85.17 on self, and spear hits inside that window carry it in their Damage-Up term; on her own-burst FBs this buffApply is ABSENT and coreDamagePct 24.64 appears instead — never both.",
      "inertness": "MG normal rounds and the burst nuke must NOT move when this buff is live.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter, IN state: Core Damage ▲24.64%",
      "disposition": "FAITHFUL",
      "scope": "coreDamagePct 24.64 self — boosts core-bucket damage: her MG's core hits AND the 14.06% core strikes running in the same window.",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "fullBurstEnter + IN-Penetrant-Wish gate (requiresSelfStatus, or ownBurstGate:'cast'). Fires at FB ENTRY (gets the FB-window context), not at burst cast.",
      "targetSet": "self.",
      "nearestWrongModel": "Keying to burstCast directly (loses the FB-entry timing and fires even if the chain stalls), or applying every FB regardless of state, or scoping it to allies.",
      "distinguishingAssertion": "buffApply stat 'coreDamagePct' value 24.64 targeting self occurs ONLY on FB entries of rotations marian herself burst; the 14.06% core strikes' mult inside that window includes the 24.64 term.",
      "inertness": "FBs entered off the other B3's cast must show no coreDamagePct 24.64 application.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Reloads 100% of ammo",
      "disposition": "FAITHFUL",
      "scope": "instantReload fraction 1 (self). Weapon-STATE line that IS damage (taxonomy #6): refills the 300-round belt and skips a 171-frame reload — extra rounds fired over the fight.",
      "durationSemantics": "Instant, on cast.",
      "triggerIdentity": "burstCast.",
      "targetSet": "self.",
      "nearestWrongModel": "Dropped as QoL/'defensive' utility — shot-count under-credit; or modeled as a reload-SPEED buff.",
      "distinguishingAssertion": "Reload events: a run with her burst shows measurably fewer/later reload events (belt snapped to 300 at cast) and a higher total round count than the same run with this effect stripped via withPatchedOverride.",
      "inertness": "Teammates' magazines must not refill.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "MG Ramp-Up Speed ▲ 100% for 10 sec",
      "disposition": "GAP",
      "scope": "MG wind-up (spin-up to max fire rate) acceleration — a weapon-state line that IS damage if the engine models MG ramp-up. The StatKey enum has no ramp-up key; fireRatePct is a different mechanic (sustained rate, not wind-up slope).",
      "durationSemantics": "durationSec 10, on cast.",
      "triggerIdentity": "burstCast, self.",
      "targetSet": "self.",
      "nearestWrongModel": "Proxying as fireRatePct +100 (doubles sustained MG cadence for 10s — a massive over-credit; ramp-up only trims the wind-up phase, and her burst just refilled the belt mid-spin so the wind-up may not even reset), or silently dropping it with no unmodeled record.",
      "distinguishingAssertion": "If UNMODELED: the verbatim line appears in override.unmodeled.burst AND her per-round MG damage/cadence is IDENTICAL in the 10s post-burst window vs outside it. If the engine does model wind-up: pin the wind-up curve halving, not sustained rate.",
      "inertness": "Sustained (post-wind-up) fire rate must NOT change.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 78.4% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "atkPct 78.4 — scales her own ATK (self-target, so atkPct vs casterAtkPct is degenerate; atkPct is the literal encoding). Feeds everything ATK-scaled in the window: MG rounds, spears, 14.06% strikes, and the 1346.4% nuke if the nuke snapshots post-buff.",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "burstCast, self.",
      "targetSet": "self only — NOT allies.",
      "nearestWrongModel": "Ally-wide targeting, or conflation/merging with the separate Attack Damage ▲ 78.14 line into one stat (they live in different buckets: ATK base vs Damage Up — folding them under- or over-credits depending on dilution).",
      "distinguishingAssertion": "buffApply stat 'atkPct' value 78.4, targetIdx === marian's own index, at her burst cast; no corresponding buffApply on any ally index.",
      "inertness": "Ally damage must not move from this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 78.14% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct 78.14 — additive Damage Up bucket, self. Distinct line from (and diluting with) the 85.17 sequentialDamagePct when both are live; distinct bucket from the 78.4 atkPct.",
      "durationSemantics": "durationSec 10.",
      "triggerIdentity": "burstCast, self.",
      "targetSet": "self.",
      "nearestWrongModel": "Multiplying it with atkPct as one 78%-ish 'damage buff' twice, or routing to damageTakenPct, or granting to allies.",
      "distinguishingAssertion": "buffApply stat 'attackDamagePct' value 78.14 on self at cast; a window hit's Damage-Up term shows 78.14 ADDING with any co-active Damage-Up entries (dilution), not multiplying.",
      "inertness": "Ally damage unmoved; outside the 10s window her Damage-Up term drops back.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "1346.4% final ATK Burst Skill damage",
      "disposition": "FAITHFUL",
      "scope": "flatDamage atkPct 1346.4 in the burst slot, all enemies (boss). Burst-cast instant damage is FB-EXEMPT by timing (methodology #9: the cast lands before the FB window opens) ⇒ noFb; no core unless stated (not stated) ⇒ core:false; crits at caster rate per burst-damage convention. burstDesc:'allEnemies' tag is the structural match should an amp carrier ever join the comp.",
      "durationSemantics": "Instant, once per cast.",
      "triggerIdentity": "burstCast.",
      "targetSet": "all enemies (boss).",
      "nearestWrongModel": "Applying the +50% Full-Burst major to it (pre-FB landing — over-credit), or giving it core eligibility, or landing it AFTER the self-buffs so snapshot order silently differs from the engine's cast convention (order of same-cast buff-then-nuke is a convention worth pinning either way).",
      "distinguishingAssertion": "The burst-slot damage event at her cast has fbMajorApplied === false (inFullBurst false / FB-exempt) and no core term; its mult decomposes to 1346.4% × her buff state at cast.",
      "inertness": "It must not receive the +50% FB major even when the FB banner follows within the same rotation.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:spear-interval-7x125.51-sequential",
    "skill1:open-wounds-on-hit-damageTaken-5.05-permanent+status",
    "skill1:open-wounds-on-burst-all-enemies",
    "skill2:penetrant-wish-mode-burstCast-10s",
    "skill2:every-2-rounds-14.06-core-strike-gated",
    "skill2:sharpened-resolve-interval-minus-2s",
    "skill2:fb-enter-notCast-sequentialDamagePct-85.17",
    "skill2:fb-enter-cast-coreDamagePct-24.64",
    "burst:instant-reload-100",
    "burst:atkPct-78.4-self-10s",
    "burst:attackDamagePct-78.14-self-10s",
    "burst:nuke-1346.4-noFb"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": ["Machine Gun Ramp-Up Speed ▲ 100% for 10 sec."]
  },
  "notes": "Expected shared-prior misreads, in descending severity: (1) burstCast vs fullBurstEnter on the Penetrant Wish mode — the fixture's helm co-B3 makes this diverge every other rotation; a fullBurstEnter keying runs the every-2-rounds core strikes + 2s spear interval in FBs marian never cast. (2) The two FB-enter branches are state-exclusive — a model that applies BOTH (or always the Sequential one) every FB is wrong; since the schema lacks a negated requiresSelfStatus, ownBurstGate 'notCast'/'cast' is the expected faithful encoding and the driver must justify whichever they chose. (3) Sequential Attack Damage ▲85.17 feeds ONLY the spears (sequentialDamagePct, additive Damage Up) — encoding as attackDamagePct boosts her whole MG output, and sequentialMultPct would be an undiluted multiplier; both over-credit. (4) Open Wounds: no stack wording ⇒ ONE permanent refreshed damageTakenPct 5.05 instance, never 7-stacks-per-volley compounding; it must ALSO exist as targetStatus 'Open Wounds' or skill2's status gate is structurally dead. (5) 'core strike damage' on the 14.06% rider ⇒ core:true composing with coreDamagePct 24.64 in the same window — dropping core roughly halves the rider. (6) The 1346.4% nuke is FB-exempt (noFb) by the burst-cast-lands-pre-FB rule. ⚑ flags: MG cadence (rounds/s) sets the proc rate of the every-2-rounds strike and is datamine-unreliable (ALWAYS-⚑ #1) — the test should pin whatever cadence the engine uses rather than assert an absolute proc count; spear first-fire phase (t=0 vs t=4) is an interval convention ⚑; buff-before-nuke ordering within the burst cast is a convention to pin. MG Ramp-Up Speed has no StatKey — honest unmodeled entry beats a fireRatePct fudge; if the engine turns out to model MG wind-up, reclassify as FIX.",
  "model": "claude-fable-5"
}
```

### 4b. Second S2b reviewer (claude-fable-5-1, blind — Tier-2 ×2 models)

```json
{
  "slug": "marian-queen",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Activates at the start of battle. Affects self.",
      "disposition": "FAITHFUL",
      "scope": "Self mode 'Sharpened Resolve' (Dark Matter spears) — a permanent interval-driven function-damage mode; no normal-attack/charge/crit scoping.",
      "durationSemantics": "Permanent (battle start, never ends); its cadence is 'Recurring interval: 4 sec' → an `interval` trigger with sec:4 (shortened to 2 while S2's Penetrant Wish is live).",
      "triggerIdentity": "interval sec:4 (NOT battleStart-once, NOT hitCount). ⚑ first-fire phase: engine convention fires first at t=4; kit's 'start of battle' could mean t=0 — ±1 volley over the fight.",
      "targetSet": "self (mode holder); the spears themselves target enemies (next line).",
      "nearestWrongModel": "battleStart trigger with durationSec (fires once / expires) — or a passive that fires nothing.",
      "distinguishingAssertion": "Count damage events with srcSlot skill1 from marian-queen over a 60s window outside any burst: volleys occur at ~4s cadence (≈15 volley-sets, allowing ±1 for phase), not 1.",
      "inertness": "Does not refresh/stack anything on self; no self stat moves.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Dark Matter Spear: 125.51% … sequentially 7 times",
      "disposition": "FAITHFUL",
      "scope": "Function (skill) damage: 7 sequential hits × 125.51% final ATK per 4s volley = 878.57% per volley. Flavor MUST be 'sequential' (S2's Sequential Attack Damage ▲ reads it). Crit at caster rate; NO core (text says plain 'damage'); noRange; FB by timing (default).",
      "durationSemantics": "Instant per volley; no duration.",
      "triggerIdentity": "interval sec:4 (same block as the mode). 'random enemies' vs a single boss → all 7 land on the boss (deterministic, not a ⚑).",
      "targetSet": "enemy.",
      "nearestWrongModel": "A single 125.51% hit per volley (1/7 of the damage), OR flavor omitted/‘sustained’ so the 85.17% Sequential buff is inert, OR a stored/DoT encoding.",
      "distinguishingAssertion": "Per volley, the skill1-bucket damage sums to 7×125.51%×finalATK×(crit/DU/DT factors) — i.e. atkPct-equivalent 878.57 (one flatDamage 878.57 with gaugeHits:7 + levelScale {value:[125.51]}, or 7 effects of 125.51). AND under withPatchedOverride adding a self sequentialDamagePct buff, these events' mult rises while normal-attack events' mult does not.",
      "inertness": "Normal-attack damage events must not move; no core bucket on spear hits.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Open Wounds: Damage Taken ▲ 5.05% (on spear hit)",
      "disposition": "FAITHFUL",
      "scope": "Boss DEBUFF (benefits the whole team, taxonomy #4) — damageTakenPct 5.05 on the enemy, plus a kit-NAMED status 'Open Wounds' (targetStatus) that S2's core-strike rider gates on.",
      "durationSemantics": "'continuous and cannot be removed' → PERMANENT (durationSec ≥ fight length / omitted). NOT 4s refreshed per volley. No 'stack' wording → single instance, no maxStacks.",
      "triggerIdentity": "On spear landing — in the same interval block as the spear damage (single boss: every volley re-applies/refreshes the same key).",
      "targetSet": "enemy (buffApply emits casterIdx null / targetIdx null — filter by stat+value).",
      "nearestWrongModel": "Stacking ×7 per volley (maxStacks ≥ 7 → 35%+), OR a 4s durationSec that lapses between volleys, OR encoded as a self buff.",
      "distinguishingAssertion": "buffApply events with stat damageTakenPct value 5.05: first at/after the first volley; stacks never > 1; expiresFrame ≥ fight end (or absent). Helm's per-hit damage after first volley is ×1.0505 vs a withPatchedOverride that removes this effect (the whole team benefits).",
      "inertness": "Never >5.05 total from marian-queen on the boss at any frame.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ Activates when using Burst Skill. Affects all enemies. Open Wounds",
      "disposition": "FAITHFUL",
      "scope": "Same named debuff (Open Wounds, Damage Taken ▲ 5.05%, permanent) applied to all enemies on her OWN burst cast — a guarantee line, not a second stack.",
      "durationSemantics": "Permanent.",
      "triggerIdentity": "burstCast (this unit's own cast) — NOT fullBurstEnter.",
      "targetSet": "enemy (all).",
      "nearestWrongModel": "A second, separately-keyed instance (e.g. authored in the burst slot, or a different value) so the boss carries 10.1% after the first cast.",
      "distinguishingAssertion": "On the frame of marian-queen's first burstCast a damageTakenPct 5.05 buffApply (refresh:true if already present) occurs, AND at castFrame+60 the sum of active marian-queen damageTakenPct on the boss is still exactly 5.05 — never 10.1. Zero such buffApply on helm's burstCast frames.",
      "inertness": "Must not add a stack; must not fire on team FB entry without her cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ Activates when using Burst Skill. Affects self. Penetrant Wish … Duration: 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Self mode window 'Penetrant Wish' — a selfStatus of 10s that the rider (Effect 1), the interval cut (Effect 2) and the two FB-enter branches read.",
      "durationSemantics": "10 s wall-clock from the CAST frame (not from FB entry — it ends ~30f before the FB window does).",
      "triggerIdentity": "burstCast — fires only on rotations marian-queen herself bursts (40s cd → every other rotation if helm B3 alternates).",
      "targetSet": "self.",
      "nearestWrongModel": "fullBurstEnter / fbGate:'inFb' as the mode window → fires on helm's rotations too (≈2× over-credit of the rider + interval cut).",
      "distinguishingAssertion": "A selfStatus/buff window opens only on frames with a marian-queen burstCast event; count(windows) == count(marian burstCast) and < count(fullBurstStart) when helm also bursts.",
      "inertness": "No window on rotations where only helm casts B3.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 1: after 2 normal attacks … 14.06% … core strike damage",
      "disposition": "FAITHFUL",
      "scope": "Function damage rider: flatDamage atkPct 14.06 with core:true (kit says 'core strike damage' → a GUARANTEED core hit, coreAttackMultiplier 200 + coreDamagePct bucket), crit at caster rate, noRange, FB by timing (lands inside FB → +50%).",
      "durationSemantics": "Only while Penetrant Wish is live (10 s from cast).",
      "triggerIdentity": "hitCount count:2 (MG hitsPerShot 1 → pull == round), gated requiresSelfStatus 'Penetrant Wish' AND requiresTargetStatus 'Open Wounds'. countScope: kit wording is 'after performing 2 normal attacks' inside the state — 'gated' is the literal read; 'always' differs by ≤1 round of phase (negligible, but author it).",
      "targetSet": "enemy (all enemies in Open Wounds = the boss).",
      "nearestWrongModel": "Ungated/fbGate:'inFb' (fires on helm rotations) OR core rate taken from the MG aim/core table instead of 1.0 OR a per-hit buff instead of damage.",
      "distinguishingAssertion": "Damage events srcSlot skill2 bucket skill with mult-base 14.06 occur ONLY within [castFrame, castFrame+600] of marian-queen burstCast frames; count ≈ (pulls fired in that window)/2; each carries core rate 1.0 and inFullBurst true for those landing after fullBurstStart. Zero such events in windows after helm's burstCast.",
      "inertness": "Zero procs outside Penetrant Wish; zero procs before the boss carries Open Wounds (practically never, first volley ≤4s).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 2: Recurring interval of … Sharpened Resolve ▼ 2 sec",
      "disposition": "FAITHFUL",
      "scope": "Cooldown cut on her OWN S1 interval: 4s → 2s while Penetrant Wish is live → skillCooldownReductionSec value 2, durationSec 10, self (the only interval-trigger block she has).",
      "durationSemantics": "10 s from cast (same window).",
      "triggerIdentity": "burstCast (the Penetrant Wish block).",
      "targetSet": "self.",
      "nearestWrongModel": "Skipped as non-damage ('a cooldown line'), OR keyed fullBurstEnter, OR modeled as a fireRate/attackSpeed buff.",
      "distinguishingAssertion": "In the 10s after marian-queen's burstCast, skill1 spear volleys occur ≈5 times (2s cadence) vs ≈2–3 in a 10s window with no cast; buffApply stat skillCooldownReductionSec value 2 targetIdx==marian on the cast frame only.",
      "inertness": "Normal-attack cadence (shot events/sec) unchanged; S1 cadence returns to 4s after the window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ entering Full Burst while NOT in … Penetrant Wish",
      "disposition": "FAITHFUL",
      "scope": "Self buff sequentialDamagePct 85.17 (ADDITIVE Damage-Up bucket per schema — not sequentialMultPct) for 10s — lifts her S1 spear volleys on rotations she did NOT burst.",
      "durationSemantics": "10 s from FB entry.",
      "triggerIdentity": "fullBurstEnter + the NEGATED self-status gate. Schema has no 'requiresNotSelfStatus'; the exact proxy is ownBurstGate:'notCast' (Penetrant Wish is only ever granted by her own cast, 40s cd ≫ 10s, so 'not in state at FB entry' ⇔ 'did not cast this rotation').",
      "targetSet": "self.",
      "nearestWrongModel": "Ungated fullBurstEnter (fires on EVERY FB including her own rotations — both branches live together), OR sequentialMultPct (true multiplier ×1.85 instead of diluted additive), OR skipped as inert because her normals aren't sequential.",
      "distinguishingAssertion": "On fullBurstStart frames NOT preceded (≤60f) by a marian-queen burstCast: buffApply stat sequentialDamagePct value 85.17 targetIdx==marian; on frames that ARE preceded by her cast: none. Spear damage events inside that window carry a higher mult than spear events outside any window; normal-attack mult unchanged.",
      "inertness": "Normal attacks and the 14.06% core rider (not sequential-flavored) must not move; must not apply on her own-burst rotations.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ entering Full Burst while IN … Penetrant Wish: Core Damage ▲ 24.64%",
      "disposition": "FAITHFUL",
      "scope": "Self coreDamagePct 24.64 for 10s — lifts the 14.06% core-strike riders and any MG core hits during her own-burst FB.",
      "durationSemantics": "10 s from FB entry (outlives Penetrant Wish by ~30f).",
      "triggerIdentity": "fullBurstEnter + requiresSelfStatus 'Penetrant Wish' (or ownBurstGate:'cast' — equivalent here). NOT burstCast (would miss the FB-entry timing by 30f; minor) and NOT ungated.",
      "targetSet": "self.",
      "nearestWrongModel": "Ungated fullBurstEnter (fires on helm's rotations → over-credits her MG core hits there), OR applied as critDamagePct/attackDamagePct.",
      "distinguishingAssertion": "Exactly ONE of {coreDamagePct 24.64, sequentialDamagePct 85.17} buffApply (targetIdx==marian) per fullBurstStart frame; the core one iff a marian burstCast occurred ≤60f earlier. 14.06% rider events inside her window show the core bucket raised vs a patched override removing this buff.",
      "inertness": "No coreDamagePct apply on helm-cast rotations; no stacking across rotations.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Reloads 100% of ammo.",
      "disposition": "FAITHFUL",
      "scope": "Weapon-state → damage (taxonomy #6): instantReload fraction 1 on a 300-round belt (reloadFrames 171 ≈ 2.85s saved whenever the belt is partly spent).",
      "durationSemantics": "Instant.",
      "triggerIdentity": "burstCast.",
      "targetSet": "self.",
      "nearestWrongModel": "Skipped as 'not damage', OR a reloadSpeedPct buff, OR unlimitedAmmo.",
      "distinguishingAssertion": "Ammo reads 300 immediately after each marian-queen burstCast frame with no reload-gap in shot events; total shot count over the fight > the same comp with this effect removed via withPatchedOverride. ⚑ whether the refill resets MG ramp-up is kit-silent (see unmodeled ramp line).",
      "inertness": "No reload-time gap introduced; no change to helm's ammo.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Machine Gun Ramp-Up Speed ▲ 100% for 10 sec.",
      "disposition": "GAP",
      "scope": "MG fire-rate ramp (spin-up after start/reload) reaches max twice as fast — only matters if the engine models an MG ramp at all; no StatKey exists for it (fireRatePct is the wrong primitive: it would raise the steady-state cadence, over-crediting).",
      "durationSemantics": "10 s from cast.",
      "triggerIdentity": "burstCast.",
      "targetSet": "self.",
      "nearestWrongModel": "Encoded as fireRatePct/attackSpeedPct 100 (doubles steady-state MG cadence for 10s — a large invention).",
      "distinguishingAssertion": "No fireRatePct/attackSpeedPct buffApply from marian-queen anywhere; shot-event cadence inside her window equals cadence outside it. Line recorded verbatim in unmodeled.burst.",
      "inertness": "Steady-state shots/sec must NOT move.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 78.4% for 10 sec.",
      "disposition": "FAITHFUL",
      "scope": "Generic self ATK buff (atkPct 78.4) — feeds normals, spears, riders and the nuke (literal listing order: buffs precede the damage line).",
      "durationSemantics": "10 s from cast.",
      "triggerIdentity": "burstCast only.",
      "targetSet": "self.",
      "nearestWrongModel": "fullBurstEnter (fires on helm rotations), OR allies target.",
      "distinguishingAssertion": "buffApply stat atkPct value 78.4 with casterIdx==targetIdx==marian on each marian burstCast frame; count == marian burstCast count; none with targetIdx==helm.",
      "inertness": "Helm's ATK unchanged; no apply on helm-only rotations.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 78.14% for 10 sec.",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct 78.14 (additive Damage-Up bucket) self, 10s — distinct from the ATK line; both must exist.",
      "durationSemantics": "10 s from cast.",
      "triggerIdentity": "burstCast only.",
      "targetSet": "self.",
      "nearestWrongModel": "Folded into atkPct (156.54 or ×1.784×1.7814 multiplicative in the wrong bucket), OR dropped as a duplicate of the ATK line.",
      "distinguishingAssertion": "buffApply stat attackDamagePct value 78.14 targetIdx==marian on each marian burstCast frame, alongside (not instead of) the atkPct 78.4 apply; the two are separate stats.",
      "inertness": "Helm untouched; no apply on helm rotations.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1346.4% of final ATK as Burst Skill damage.",
      "disposition": "FAITHFUL",
      "scope": "burst-slot flatDamage atkPct 1346.4, target enemy, burstDesc 'allEnemies' (inert unless a jackal/trina amp is present), crit at caster rate, no core, noRange, FB-exempt BY TIMING (cast lands pre-FB — taxonomy #9).",
      "durationSemantics": "Instant.",
      "triggerIdentity": "burstCast.",
      "targetSet": "enemy.",
      "nearestWrongModel": "fbMajorApplied true (+50%) via a fullBurstEnter key, OR nuke resolved BEFORE the same cast's ATK ▲78.4 / Attack Damage ▲78.14 (⚑ ordering is measurement-gated; the literal listing puts buffs first).",
      "distinguishingAssertion": "One burst-bucket damage event per marian burstCast with mult-base 1346.4, inFullBurst false / fbMajorApplied false, rangeApplied false; its mult reflects the Open Wounds 5.05% DT. ⚑ Also assert (and label the expectation) whether the event's ATK factor includes ×1.784 — pin from a withPatchedOverride that strips the ATK buff.",
      "inertness": "No +50% FB major; no core bucket; nothing on helm's cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:interval-4s-mode",
    "skill1:spear-volley-7x125.51-sequential",
    "skill1:open-wounds-5.05-permanent-nonstacking",
    "skill1:burstCast-open-wounds-no-second-stack",
    "skill2:penetrant-wish-selfStatus-10s-burstCast",
    "skill2:every-2-normals-14.06-core-strike-gated",
    "skill2:interval-cut-2s-skillCooldownReductionSec",
    "skill2:fbEnter-notCast-sequentialDamagePct-85.17",
    "skill2:fbEnter-cast-coreDamagePct-24.64",
    "burst:instantReload-100",
    "burst:atkPct-78.4",
    "burst:attackDamagePct-78.14",
    "burst:nuke-1346.4-fbExempt"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Function: Launches Dark Matter spears at random enemies. (descriptive; single boss ⇒ all 7 spears land on it)"
    ],
    "skill2": [
      "Function: Deals core damage to all enemies in the Open Wounds state. (descriptive header for Effect 1)"
    ],
    "burst": [
      "Machine Gun Ramp-Up Speed ▲ 100% for 10 sec. (no engine primitive for MG spin-up; must NOT be proxied as fireRatePct/attackSpeedPct)"
    ]
  },
  "notes": "Could not save to scripts/kit-autonomy/reviews/marian-queen.test-review.json (no tools in this run) — orchestrator must write it. Expected shared-prior misreads to reconcile: (1) BOTH S2 FB-enter branches keyed to a plain fullBurstEnter — they are mutually exclusive by self-status; with helm as a second B3 in controlComp the ungated form double-fires on every FB. The schema has no negated self-status gate, so the 'not in state' branch must use ownBurstGate:'notCast' (equivalence holds because Penetrant Wish is only ever granted by her own cast and 40s cd ≫ 10s). (2) Open Wounds authored twice with different keys (e.g. the burst-cast line placed in the burst slot) → 10.1% on the boss; both lines are ONE named status/one 5.05 key. (3) Spear volley flavor must be 'sequential' or the 85.17% line is silently inert; sequentialDamagePct is additive Damage-Up, not sequentialMultPct. (4) 'core strike damage' on the 14.06% rider means a guaranteed core hit — the driver must confirm the engine's flatDamage core:true resolves at rate 1.0, not the MG aim/core table; assert on the emitted core rate. (5) Interval ▼2s is skillCooldownReductionSec 2 for 10s — a damage line (≈2.5 extra 878.57% volleys per own burst), not a skippable cooldown note. ⚑ fields: MG pull cadence (datamine-unreliable; drives the every-2-normals proc count), S1 first-fire phase (t=0 vs t=4), nuke-vs-same-cast-buff ordering, and whether the burst refill resets MG ramp-up (ramp line itself is GAP). Element: Fire vs the fixture's Fire boss ⇒ no advantage factor — any 1.10 in a spear/nuke mult is wrong.",
  "model": "claude-fable-5-1"
}
```

## 5. S5 BLIND TEST-WRITER (claude-opus-5, blind — written from the prose alone)

### 5a. blind spec

```json
{
  "slug": "marian-queen",
  "model": "claude-opus-5",
  "note": "No tools were available in this invocation, so the two files could NOT be written to disk. Save `testSource` verbatim to scripts/kit-autonomy/blind/marian-queen.test.ts and this JSON to scripts/kit-autonomy/blind/marian-queen.test-spec.json. Dispositions below are 'what a faithful model REQUIRES' — blind, I never saw the driver's override, so they are not a diff against it.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Recurring interval: 4 sec (battleStart)",
      "disposition": "FAITHFUL (interval trigger; first-fire phase is a FLAG)",
      "assertion": "skill1-slot damage events recur 40..500 times over 180s, and the CDR counterfactual proves the cadence is a live timer. Nearest-wrong {kind:'passive'} / a one-shot battleStart yields 1 volley; the t=0-vs-t=4s phase is NOT pinned (blind convention)."
    },
    {
      "slot": "skill1",
      "kitLine": "125.51% ATK, 7x sequential",
      "disposition": "FAITHFUL + FLAG (fold vs 7 instances, gaugeHits)",
      "assertion": "Volley existence is asserted by bounds only; the flavor is proved INDIRECTLY and much more strongly by the S2-b test (ungating the 85.17% Sequential buff must raise damage, which is only possible if these spears carry flavor:'sequential'). Riders take noRange:true and crit at her rate, no core (text says no core here)."
    },
    {
      "slot": "skill1",
      "kitLine": "Open Wounds: Damage Taken 5.05%",
      "disposition": "FAITHFUL on scope / MEASUREMENT-GATED on stacking",
      "assertion": "Proves it is a BOSS debuff (casterIdx===null && targetIdx===null) and never a self buff: deleting it drops BOTH her damage and teamSum. Nearest-wrong (self/allies target) leaves teammates byte-identical. The stack ceiling is deliberately NOT asserted — kit states no cap (it.skip + recipe)."
    },
    {
      "slot": "skill1",
      "kitLine": "when using Burst Skill -> all enemies",
      "disposition": "FAITHFUL (burstCast, not fullBurstEnter)",
      "assertion": "Order-based: a burst-cast application is logged before the first fullBurstStart, so countBeforeFirstFb(faithful) > countBeforeFirstFb(re-keyed-to-fullBurstEnter). The nearest-wrong also over-fires on helm's Full Bursts in any 2xB3 comp."
    },
    {
      "slot": "skill2",
      "kitLine": "Duration: 10 sec (Penetrant Wish)",
      "disposition": "FIX — needs selfStatus + requiresSelfStatus (no 'within 10s of own cast' gate otherwise)",
      "assertion": "Opening every gate on the rider block must multiply its proc count by >1.8x (whole fight vs <=~50s of windows). Non-vacuity: the faithful run must ALSO have procs (>=20), so both the active and inactive case are exercised."
    },
    {
      "slot": "skill2",
      "kitLine": "after 2 normal attacks -> 14.06% core",
      "disposition": "FAITHFUL (hitCount count:2; core:true)",
      "assertion": "Recurrence: procs >= 20 (a once-per-window model gives ~4) and procs <= shots/2 + 12 (counts ROUNDS, not frames). Core-ness: setting core:false lowers her damage while leaving teammates byte-identical (coreAttackMultiplier 200 makes this unmissable)."
    },
    {
      "slot": "skill2",
      "kitLine": "Recurring interval of ITSR -2 sec",
      "disposition": "FAITHFUL (skillCooldownReductionSec, self, 10s)",
      "assertion": "Deleting the buff must cost at least 3 spear volleys (4s->2s over a 10s window is +2.5 fires per burst, 3+ bursts in 180s) and lower her total. Nearest-wrong is omitting the line entirely (a very easy miss) or encoding it as a burst-cooldown reduction, which moves no volleys."
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter while NOT in state -> Seq +85.17%",
      "disposition": "FIX — ownBurstGate:'notCast' stands in for the missing negated self-status gate",
      "assertion": "In base (2xB3) #seq + #core === #fullBurstStart exactly; in solo (sole B3, always in state) #seq === 0. Nearest-wrong (no gate) doubles the sum; both-on-burstCast drops it below fbs. Ungating it must RAISE damage, proving the buff is not inert, and must leave teammates byte-identical (self scope)."
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter while IN state -> Core +24.64%",
      "disposition": "FIX — ownBurstGate:'cast' (same reason)",
      "assertion": "solo: #core === #fullBurstStart exactly (she bursts every rotation, so the state is always open at FB entry). Deleting the buff lowers her damage and nothing else — proves it is live (she has core damage from MG core hits plus the core rider) and self-scoped."
    },
    {
      "slot": "burst",
      "kitLine": "Reloads 100% of ammo",
      "disposition": "FAITHFUL (instantReload) — weapon-state = damage",
      "assertion": "Removing it reduces total shots fired (300-round belt, 171-frame reload: a mid-belt refill deletes reload downtime). Flagged in-file as the most cadence-sensitive assertion (ties if every burst lands on a full belt)."
    },
    {
      "slot": "burst",
      "kitLine": "MG Ramp-Up Speed 100% for 10 sec",
      "disposition": "GAP (no schema primitive for MG spin-up)",
      "assertion": "it.skip with a measurement recipe, PLUS an active anti-fudge pin: no self fireRatePct/attackSpeedPct buffApply with value exactly 100. A literal 1:1 transcription doubles her cadence for 10s; a measured haircut proxy still passes."
    },
    {
      "slot": "burst",
      "kitLine": "ATK 78.4% / Attack Dmg 78.14% 10s",
      "disposition": "FAITHFUL (atkPct + attackDamagePct, self, burstCast)",
      "assertion": "Self-granted application count === fullBurstStart count (+1 horizon slack) and the two stats agree; value < 1000 proves atkPct kept its RAW percentage rather than being emitted flat-resolved as casterAtkPct (the documented harness trap)."
    },
    {
      "slot": "burst",
      "kitLine": "1346.4% ATK as Burst Skill damage",
      "disposition": "FAITHFUL (+ FLAG: burstDesc tag untestable)",
      "assertion": "burst-srcSlot damage instances number <= her cast count (one per cast) and every one has fbMajorApplied falsy — the burst cast resolves before the FB window opens, so the +50% FB major must not apply. Nearest-wrong (FB-major credited) is the classic burst over-credit."
    }
  ],
  "fixtures": "TWO comps, 10 hoisted 180s runs total. (1) controlComp('marian-queen', true) = liter/crown/marian-queen/helm — kept BECAUSE the fixed helm slot is a second Burst III, the only way a Full Burst can be completed on a rotation she did not burst, which is what makes the S2-b 'not in state' branch reachable; used for the (#sequential + #core) === #fullBurstStart invariant. (2) controlComp('marian-queen', false) = liter/crown/marian-queen — she is the SOLE B3, so she casts every rotation and is therefore always in Penetrant Wish at FB entry: the branch split becomes deterministic (#core === #fbStarts, #sequential === 0) and her own burst count === #fbStarts. All eight counterfactuals run on (2) for that determinism. Both fixtures include B1+B2 so bursts actually cast. No seed (deterministic). Every patch is built with withPatchedOverride and located by BLOCK SHAPE (trigger.kind / effect.kind / effect.stat), never by index, and each test asserts its patch actually touched something so no counterfactual can be a vacuous no-op.",
  "gaps": [
    "it.skip — FLAG: volley fold (one 878.57% instance vs seven 125.51%), Open-Wounds stacks-per-volley, and the stack CEILING are unobservable blind; the kit states no cap and uncapped (5.05% x 7 x ~55 volleys) is ~+1900% Damage Taken, which cannot be right. Recipe: popup-read a focus recording for per-volley stack gain and watch the debuff icon for a cap.",
    "it.skip — FLAG: interval first-fire phase (t=4s vs t=0) is an authoring convention, so volley counts are asserted as bounds and relative comparisons only, never exact.",
    "it.skip — 'all enemies in the Open Wounds state' is scope-trivial in every fixture (the boss carries Open Wounds from t~4s and from her own cast), so a requiresTargetStatus:'Open Wounds' gate on the core rider is unobservable; authoring it is more faithful but its absence cannot be detected here.",
    "it.skip — GAP: 'Machine Gun Ramp-Up Speed 100%' has no schema primitive (no MG spin-up stat; fireRatePct/attackSpeedPct are a different mechanic). Belongs in unmodeled. Recipe: MG focus recording, time-to-max-RPM with and without her burst window.",
    "it.skip — FLAG: burstDesc:'allEnemies' on the 1346.4% nuke is untestable without a burstSkillAoeDamagePct carrier (jackal/trina) in the comp.",
    "NOT TESTED (documented here, no assertion): gaugeHits on the folded 7-spear volley (7 gauge impacts vs 1). A patch from 7->1 only weakly perturbs full-burst count, so any assertion would be near-vacuous; recommended as an authoring FIX, not a pin.",
    "NOT TESTED: countScope ('always' vs 'gated') on the every-2-normal-attacks counter. With MG cadence the difference is a proc or two per window — below the resolution of any bound I can derive blind."
  ]
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
 * marian-queen — BLIND per-unit kit-spec test (role s5).
 *
 * Written from the kit prose ALONE. No driver test / override / reasoning / truth file was read.
 * Because this file was authored WITHOUT running the sim, every assertion is either
 * (a) kit-arithmetic derivable, (b) a LOOSE bound, or (c) a RELATIVE counterfactual (faithful vs
 * nearest-wrong, built with withPatchedOverride). No exact damage or proc magnitudes are pinned —
 * blind, an exact number would be a guess, not a spec.
 *
 * KIT (paraphrased; quotes kept short):
 *  S1-a  battleStart, self, 'Recurring interval: 4 sec' — 7 sequential Dark Matter spears at
 *        125.51% final ATK each, at random enemies (one boss => all 7 land on the boss).
 *        Each landing spear applies Open Wounds = Damage Taken +5.05%, continuous, unremovable
 *        => a BOSS DEBUFF the whole team eats, NOT a self buff (taxonomy #4).
 *  S1-b  'when using Burst Skill', all enemies — the same Open Wounds debuff (burst-CAST identity).
 *  S2-a  'when using Burst Skill', self, 10 sec window (Penetrant Wish):
 *          e1 every 2 normal attacks -> 14.06% final ATK as CORE STRIKE damage to all enemies
 *             in the Open Wounds state;
 *          e2 self — S1 recurring interval -2 sec (4s -> 2s) for the window
 *             (skillCooldownReductionSec: the schema says it shortens interval-trigger timers).
 *  S2-b  'entering Full Burst while NOT in Penetrant Wish' -> Sequential Atk Dmg +85.17% / 10s.
 *  S2-c  'entering Full Burst while IN Penetrant Wish'     -> Core Damage +24.64% / 10s.
 *  BURST self: reload 100% ammo; MG Ramp-Up Speed +100% / 10s; ATK +78.4% / 10s;
 *        Attack Damage +78.14% / 10s.   BURST enemies: 1346.4% final ATK as burst damage.
 *
 * FIXTURES (2 base + 8 patched = 10 runs; each is a full 180s sim):
 *  base = controlComp('marian-queen', true)  — liter/crown/carry/helm: TWO Burst-III units, so a
 *         Full Burst can be completed by helm on a rotation she did NOT burst, which is the only
 *         way S2-b's branch can ever be reached.
 *  solo = controlComp('marian-queen', false) — liter/crown/carry: she is the ONLY B3, so she casts
 *         on EVERY rotation and is therefore ALWAYS in Penetrant Wish at FB entry. That makes the
 *         S2-b/S2-c pair deterministic (core branch = every FB, sequential branch = never), which
 *         is why nearly every counterfactual below runs on `solo`.
 *
 * WHY THE S2-b/S2-c PAIR IS THE CENTREPIECE: the schema has `requiresSelfStatus` but NO negated
 * self-status gate, so 'while NOT in <own state>' has to be expressed another way. Her own burst
 * cast is what opens the state and always precedes FB entry, so the faithful pair is
 * ownBurstGate 'notCast' (sequential) / 'cast' (core). ANY faithful encoding fires EXACTLY ONE of
 * the two per Full Burst => (#sequential + #core) === #fullBurstStart. The nearest-wrong (no gate)
 * fires BOTH every FB and doubles that sum; re-keying both to burstCast drops it below the FB count.
 *
 * EVENT-FIELD DISCIPLINE: only documented fields are used — buffApply {stat,value,casterIdx,
 * targetIdx,targetSlug}, damage {srcSlot,fbMajorApplied}, kinds shot/damage/buffApply/reload/
 * burstCast/fullBurstStart. Self-granted buffs are isolated as casterIdx===targetIdx &&
 * targetSlug===SLUG (level-PROOF: no magnitude filter needed, so a non-max skill level cannot
 * false-RED these); boss-held debuffs as casterIdx===null && targetIdx===null per the harness note.
 * One assertion that WOULD need a frame field is expressed order-based instead (countBeforeFirstFb).
 */

type Ev = SimEvent & Record<string, any>;

const SLUG = 'marian-queen';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

// ---------- event helpers (documented fields only) ----------
const OWNER_KEYS = ['slug', 'unitSlug', 'srcSlug', 'ownerSlug', 'owner'];
function ownerOf(e: Ev): string | undefined {
  for (const k of OWNER_KEYS)
    if (typeof (e as any)[k] === 'string') return (e as any)[k] as string;
  return undefined;
}
// damage/shot events: keep hers. If the log carries no owner key at all we keep everything —
// every count assertion below is either a loose bound or a faithful-vs-patched comparison, where
// a constant teammate term cancels.
const mine = (e: Ev) => {
  const o = ownerOf(e);
  return o === undefined || o === SLUG;
};

const selfApplies = (evs: Ev[], stat: string) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      e.targetSlug === SLUG &&
      e.casterIdx != null &&
      e.casterIdx === e.targetIdx
  );
const bossDebuffs = (evs: Ev[], stat: string) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      e.casterIdx == null &&
      e.targetIdx == null
  );
const slotDamage = (evs: Ev[], slot: string) =>
  evs.filter((e) => e.kind === 'damage' && e.srcSlot === slot && mine(e));
const shots = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'shot' && mine(e)).length;
const fbStarts = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;
// order-based, so no `frame` field is required
function countBeforeFirstFb(evs: Ev[], pred: (e: Ev) => boolean): number {
  const i = evs.findIndex((e) => e.kind === 'fullBurstStart');
  return (i < 0 ? evs : evs.slice(0, i)).filter(pred).length;
}
const teammates = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).filter(([s]) => s !== SLUG));
const teamSum = (t: Record<string, number>) =>
  Object.entries(t).reduce((a, [s, v]) => (s === SLUG ? a : a + v), 0);

// ---------- run / patch helpers ----------
function run(opts: any) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    onEvent: (ev: SimEvent) => events.push(ev as Ev),
  });
  return { res, events, own: totals(res)[SLUG] ?? 0, all: totals(res) };
}
function withOv(cfg: any, ov: any) {
  return { ...cfg, overrides: { ...(cfg.overrides ?? {}), [SLUG]: ov } };
}
function blocksOf(ov: any): any[] {
  return SLOTS.flatMap((s) => (Array.isArray(ov[s]) ? (ov[s] as any[]) : []));
}
const effectsOf = (b: any): any[] =>
  Array.isArray(b.effects) ? b.effects : [];
// Patches are written SHAPE-FIRST (find by trigger.kind / effect.kind / effect.stat), never by
// index, because blind I do not know the driver's block order. `touched` is asserted > 0 in every
// test so no counterfactual can silently become a no-op (a vacuous GREEN).
function patch(mutate: (ov: any) => number) {
  let touched = 0;
  const ov = withPatchedOverride(SLUG, (o: any) => {
    touched = mutate(o);
  });
  return { ov, touched };
}
function dropEffects(ov: any, pred: (e: any) => boolean): number {
  let n = 0;
  for (const b of blocksOf(ov)) {
    b.effects = effectsOf(b).filter((e) => {
      const hit = pred(e);
      if (hit) n += 1;
      return !hit;
    });
  }
  return n;
}
const GATES = [
  'requiresSelfStatus',
  'requiresTargetStatus',
  'ownBurstGate',
  'fbGate',
  'everyN',
  'everyNOffset',
  'resourceGate',
  'swapGate',
  'requiresShielded',
  'mode',
  'teamHas',
  'formation',
  'delaySec',
];
function openGates(b: any): number {
  let n = 0;
  for (const g of GATES)
    if (b[g] !== undefined) {
      delete b[g];
      n += 1;
    }
  if (b.trigger && b.trigger.countScope === 'gated') {
    b.trigger.countScope = 'always';
    n += 1;
  }
  return n;
}

// ---------- hoisted runs ----------
const base = run(controlComp(SLUG, true));
const solo = run(controlComp(SLUG, false));

// P1 — delete the 'recurring interval -2 sec' buff
const pNoCdr = patch((ov) =>
  dropEffects(
    ov,
    (e) => e?.kind === 'buff' && e.stat === 'skillCooldownReductionSec'
  )
);
const rNoCdr = run(withOv(controlComp(SLUG, false), pNoCdr.ov));

// P2 — open every gate on the skill2 core-strike rider (10s window -> whole fight)
const pRiderOpen = patch((ov) => {
  let n = 0;
  for (const b of Array.isArray(ov.skill2) ? ov.skill2 : []) {
    if (effectsOf(b).some((e: any) => e?.kind === 'flatDamage'))
      n += openGates(b);
  }
  return n;
});
const rRiderOpen = run(withOv(controlComp(SLUG, false), pRiderOpen.ov));

// P3 — delete EVERY Open Wounds application (both sources)
const pNoOw = patch((ov) =>
  dropEffects(ov, (e) => e?.kind === 'buff' && e.stat === 'damageTakenPct')
);
const rNoOw = run(withOv(controlComp(SLUG, false), pNoOw.ov));

// P4 — re-key the burst-CAST Open Wounds block to fullBurstEnter (the nearest-wrong trigger)
const pOwFb = patch((ov) => {
  let n = 0;
  for (const b of blocksOf(ov)) {
    if (
      b.trigger?.kind === 'burstCast' &&
      effectsOf(b).some(
        (e: any) => e?.kind === 'buff' && e.stat === 'damageTakenPct'
      )
    ) {
      b.trigger = { kind: 'fullBurstEnter' };
      n += 1;
    }
  }
  return n;
});
const rOwFb = run(withOv(controlComp(SLUG, false), pOwFb.ov));

// P5 — open the gates on the Sequential-Attack-Damage block so it fires on EVERY FB
const pSeqOpen = patch((ov) => {
  let n = 0;
  for (const b of blocksOf(ov))
    if (
      effectsOf(b).some(
        (e: any) => e?.kind === 'buff' && e.stat === 'sequentialDamagePct'
      )
    )
      n += openGates(b);
  return n;
});
const rSeqOpen = run(withOv(controlComp(SLUG, false), pSeqOpen.ov));

// P6 — delete the Core Damage buff
const pNoCoreBuff = patch((ov) =>
  dropEffects(ov, (e) => e?.kind === 'buff' && e.stat === 'coreDamagePct')
);
const rNoCoreBuff = run(withOv(controlComp(SLUG, false), pNoCoreBuff.ov));

// P7 — delete the burst's 100%-ammo reload
const pNoReload = patch((ov) =>
  dropEffects(ov, (e) => e?.kind === 'instantReload')
);
const rNoReload = run(withOv(controlComp(SLUG, false), pNoReload.ov));

// P8 — strip core:true from the skill2 rider (nearest-wrong: a plain body-damage rider)
const pRiderBody = patch((ov) => {
  let n = 0;
  for (const b of blocksOf(ov))
    for (const e of effectsOf(b)) {
      if (e?.kind === 'flatDamage' && e.core === true) {
        e.core = false;
        n += 1;
      }
    }
  return n;
});
const rRiderBody = run(withOv(controlComp(SLUG, false), pRiderBody.ov));

describe('marian-queen S1 — Dark Matter spears + Open Wounds', () => {
  it('spear volleys land as skill1 function damage and recur all fight', () => {
    expect(unitOf(solo.res, SLUG).totalDamage).toBeGreaterThan(0);
    const volleys = slotDamage(solo.events, 'skill1');
    // 180s on a 4s interval (2s inside her burst windows) => dozens of fires. BOUNDS only: the
    // fold (one 878.57% instance vs seven 125.51% instances) is a blind flag, and it scales this
    // count by 7, so an exact pin here would be a guess.
    expect(volleys.length).toBeGreaterThanOrEqual(40);
    expect(volleys.length).toBeLessThanOrEqual(500);
  });

  it('Open Wounds is a BOSS debuff — deleting it costs the TEAM damage, not just hers', () => {
    expect(pNoOw.touched).toBeGreaterThanOrEqual(1);
    expect(bossDebuffs(solo.events, 'damageTakenPct').length).toBeGreaterThan(
      0
    );
    // inertness / nearest-wrong: it must NOT be a self buff on her
    expect(selfApplies(solo.events, 'damageTakenPct')).toHaveLength(0);
    expect(rNoOw.own).toBeLessThan(solo.own);
    // the discriminator against a self-scoped mis-encoding: teammates MUST lose damage too
    expect(teamSum(rNoOw.all)).toBeLessThan(teamSum(solo.all));
  });

  it('the second Open Wounds source is BURST CAST, not Full Burst entry', () => {
    // RED here means the block was already keyed to FB entry — the divergence this test exists for
    expect(pOwFb.touched).toBeGreaterThanOrEqual(1);
    const isOw = (e: Ev) =>
      e.kind === 'buffApply' &&
      e.stat === 'damageTakenPct' &&
      e.casterIdx == null &&
      e.targetIdx == null;
    // her cast completes the chain, so a burst-CAST application is logged BEFORE the first
    // fullBurstStart; the fullBurstEnter nearest-wrong moves it after (and over-fires on helm's
    // Full Bursts in any 2×B3 comp). Order-based, so no frame field is needed.
    expect(countBeforeFirstFb(solo.events, isOw)).toBeGreaterThan(
      countBeforeFirstFb(rOwFb.events, isOw)
    );
  });

  it.skip('FLAG: volley fold (1×878.57 vs 7×125.51), Open-Wounds stacks-per-volley and its stack CEILING, plus the interval phase (first fire t=4s vs t=0) are all unobservable blind. The kit states no cap, and the fold decides how many times the per-hit rider can fire (1 vs 7) — uncapped 5.05% × 7 × ~55 volleys is +1900% Damage Taken, which cannot be right. Recipe: popup-read a focus recording for the per-volley stack gain and watch the debuff icon for a cap.', () => {});
});

describe('marian-queen S2 — the Penetrant Wish window', () => {
  it('core rider recurs every 2 normal attacks and is confined to the 10s window', () => {
    expect(pRiderOpen.touched).toBeGreaterThanOrEqual(1); // RED = the window was never gated
    const procs = slotDamage(solo.events, 'skill2').length;
    expect(procs).toBeGreaterThanOrEqual(20); // recurring, not once-per-window
    expect(procs).toBeLessThanOrEqual(shots(solo.events) / 2 + 12); // at most 1 per 2 rounds
    // non-vacuity of the gate (both cases exercised): ungated it fires across all 180s instead of
    // the <=~50s her windows cover
    expect(slotDamage(rRiderOpen.events, 'skill2').length).toBeGreaterThan(
      procs * 1.8
    );
  });

  it('the rider is CORE STRIKE damage', () => {
    expect(pRiderBody.touched).toBeGreaterThanOrEqual(1); // RED = core:true never authored
    expect(rRiderBody.own).toBeLessThan(solo.own);
    expect(teammates(rRiderBody.all)).toEqual(teammates(solo.all)); // her own hit only
  });

  it('the interval -2 sec line genuinely accelerates S1', () => {
    expect(pNoCdr.touched).toBeGreaterThanOrEqual(1);
    const withCdr = slotDamage(solo.events, 'skill1').length;
    const without = slotDamage(rNoCdr.events, 'skill1').length;
    // 4s -> 2s over a 10s window is +2.5 fires per burst, and 180s guarantees 3+ bursts
    expect(withCdr).toBeGreaterThanOrEqual(without + 3);
    expect(solo.own).toBeGreaterThan(rNoCdr.own);
  });

  it.skip("FLAG: 'all enemies in the Open Wounds state' is scope-trivial in every fixture — the boss carries Open Wounds from the first volley (t~4s) and again from her own burst cast, so a requiresTargetStatus gate on the rider is unobservable. Authoring it is harmless and more faithful; its absence is not detectable here.", () => {});
});

describe('marian-queen S2 — the two FB-entry branches', () => {
  it('exactly ONE branch fires per Full Burst', () => {
    const seq = selfApplies(base.events, 'sequentialDamagePct').length;
    const core = selfApplies(base.events, 'coreDamagePct').length;
    const fbs = fbStarts(base.events);
    expect(fbs).toBeGreaterThanOrEqual(3);
    // nearest-wrong (no own-burst gate) fires both every FB => 2×fbs; keying both to burstCast
    // instead => fewer than fbs
    expect(seq + core).toBe(fbs);
  });

  it('solo (she is the only B3): core branch every FB, sequential branch never', () => {
    expect(selfApplies(solo.events, 'coreDamagePct').length).toBe(
      fbStarts(solo.events)
    );
    expect(selfApplies(solo.events, 'sequentialDamagePct')).toHaveLength(0);
  });

  it('the Sequential buff is wired to real sequential-flavored damage', () => {
    expect(pSeqOpen.touched).toBeGreaterThanOrEqual(1); // RED = the block carries no gate at all
    // Ungated it fires at every FB. Her ONLY sequential-flavored damage is the 7-spear volley
    // ('Attacks sequentially 7 times'), so damage MUST rise. No rise => either the spears were not
    // flavored 'sequential' or the stat is mis-chosen, and the 85.17% buff is 100% inert — the
    // whole-picture cross-check between S1's volley and S2's buff.
    expect(rSeqOpen.own).toBeGreaterThan(solo.own);
    expect(teammates(rSeqOpen.all)).toEqual(teammates(solo.all)); // self-scoped: teammates frozen
  });

  it('the Core Damage buff moves damage and is self-scoped', () => {
    expect(pNoCoreBuff.touched).toBeGreaterThanOrEqual(1);
    expect(rNoCoreBuff.own).toBeLessThan(solo.own);
    expect(teammates(rNoCoreBuff.all)).toEqual(teammates(solo.all));
  });
});

describe('marian-queen burst', () => {
  it('self ATK / Attack Damage: raw percentages, once per own burst', () => {
    const atk = selfApplies(solo.events, 'atkPct');
    const adm = selfApplies(solo.events, 'attackDamagePct');
    const fbs = fbStarts(solo.events);
    expect(atk.length).toBeGreaterThanOrEqual(3);
    // sole B3: one cast per rotation, so one application per Full Burst (+1 if a late cast's FB
    // is clipped by the 180s horizon)
    expect(atk.length).toBeGreaterThanOrEqual(fbs);
    expect(atk.length).toBeLessThanOrEqual(fbs + 1);
    expect(adm.length).toBe(atk.length); // same block, same cast
    // atkPct keeps its RAW percentage; a casterAtkPct mis-encoding would emit FLAT ATK (1e3-1e5)
    for (const e of atk) expect(Number(e.value)).toBeLessThan(1000);
  });

  it('burst nuke: burst-slot instances, Full-Burst-major exempt', () => {
    const nukes = slotDamage(solo.events, 'burst');
    const casts = selfApplies(solo.events, 'atkPct').length;
    expect(nukes.length).toBeGreaterThanOrEqual(3);
    expect(nukes.length).toBeLessThanOrEqual(casts); // one 1346.4% instance per cast, at most
    // a burst cast lands before the FB window opens, so burst damage is always FB-exempt
    for (const e of nukes) expect(e.fbMajorApplied).toBeFalsy();
  });

  it('the 100%-ammo reload is modeled — removing it costs rounds fired', () => {
    expect(pNoReload.touched).toBeGreaterThanOrEqual(1);
    // 300-round belt / 171-frame reload: a free refill mid-belt removes reload downtime, so she
    // fires strictly more rounds. CADENCE-SENSITIVE: if every burst happened to land on a full
    // belt this would tie — the one assertion here most likely to be a soft RED.
    expect(shots(solo.events)).toBeGreaterThan(shots(rNoReload.events));
  });

  it('MG Ramp-Up Speed is not fudged as a 1:1 +100 fire-rate / attack-speed buff', () => {
    const fudge = solo.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e.stat === 'fireRatePct' || e.stat === 'attackSpeedPct') &&
        e.targetSlug === SLUG &&
        Math.abs(Number(e.value) - 100) < 0.01
    );
    // Transcribing 'Ramp-Up Speed +100%' as fire rate +100% doubles her cadence for 10s — a
    // different mechanic (spin-up time, not the rate cap) and a large invented gain. A MEASURED
    // haircut proxy passes this; only the literal 1:1 fudge fails.
    expect(fudge).toHaveLength(0);
  });

  it.skip("FLAG: 'Machine Gun Ramp-Up Speed +100%' has NO schema primitive — there is no MG spin-up stat, and fireRatePct / attackSpeedPct are a different mechanic. Belongs in unmodeled with a recipe: MG focus recording, time-to-max-RPM with and without her burst window, then model as the spin-up curve (or a measured fireRatePct equivalent over the ramp only).", () => {});

  it.skip("FLAG: burstDesc:'allEnemies' on the 1346.4% nuke (its clause is 'Affects all enemies') is unobservable without a burstSkillAoeDamagePct carrier (jackal / trina) in the fixture; authorable and recommended, but untestable in controlComp.", () => {});
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "marian-queen",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 4
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 878.57,
          "flavor": "sequential",
          "crit": true,
          "gaugeHits": 7,
          "levelScale": {
            "atkPct": [125.51]
          }
        },
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.05
        },
        {
          "kind": "targetStatus",
          "name": "Open Wounds",
          "durationSec": 999
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.05
        },
        {
          "kind": "targetStatus",
          "name": "Open Wounds",
          "durationSec": 999
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "selfStatus",
          "name": "Into the Fray: Penetrant Wish",
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "skillCooldownReductionSec",
          "value": 2,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 2,
        "perPull": true,
        "countScope": "gated"
      },
      "target": {
        "kind": "enemy"
      },
      "requiresSelfStatus": "Into the Fray: Penetrant Wish",
      "requiresTargetStatus": "Open Wounds",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 14.06,
          "core": true,
          "crit": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "ownBurstGate": "notCast",
      "effects": [
        {
          "kind": "buff",
          "stat": "sequentialDamagePct",
          "value": 85.17,
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
        "kind": "self"
      },
      "ownBurstGate": "cast",
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 24.64,
          "durationSec": 10
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
          "kind": "instantReload",
          "fraction": 1
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 78.4,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 78.14,
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1346.4,
          "crit": true,
          "burstDesc": "allEnemies"
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": ["Function: Launches Dark Matter spears at random enemies."],
    "skill2": [
      "Function: Deals core damage to all enemies in the Open Wounds state."
    ],
    "burst": ["Machine Gun Ramp-Up Speed ▲ 100% for 10 sec."]
  },
  "caveats": [
    "⚑ SPEAR SPLIT-VS-MERGE: the 7 sequential 125.51% spears are MERGED into one 878.57% instance with gaugeHits:7 (kit-silent on split; popup-read required). If the engine's sequential/Damage-Up interaction or any per-hit gate ever needs per-hit granularity, split into 7 effects of 125.51%.",
    "⚑ INTERVAL PHASE: 'Activates at the start of battle' + 'Recurring interval: 4 sec' is encoded as interval{sec:4}, which first fires at t=4. If the opening volley actually launches at t=0 the model loses one volley per fight (~1 of ~N volleys).",
    "⚑ OPEN WOUNDS IS A STATE, NOT A STACK: Damage Taken ▲5.05% is modeled as ONE continuous instance (no maxStacks), because skill2 refers to 'the Open Wounds state' (a named status) and the kit gives no stack count. If it stacks per spear hit (up to 7 per volley, permanent, 'cannot be removed'), the team-wide debuff is grossly under-credited — this is the single largest value risk in the file.",
    "DOUBLE-BOOK WATCH: both skill1 blocks grant damageTakenPct 5.05 (interval volley + burst-cast AoE). They are the SAME in-game status and must refresh, not sum to 10.1 — the shared caster+slot+stat+value buff key should handle it; verify with a buffApply filter on stat damageTakenPct.",
    "FB-ENTER PAIR IS A PROXY: 'entering Full Burst while [not] in Into the Fray: Penetrant Wish' is encoded as ownBurstGate notCast/cast rather than a self-status gate, because the schema has no NEGATED requiresSelfStatus. Exact while her own burst cast is what opens the 10s window (she is Burst III, so her cast immediately precedes FB entry); it diverges only if a Full Burst begins within 10s of her cast without her casting.",
    "'Affects random enemies' is scope-trivial at v1 (single boss) — all 7 spears land on the one target. On a multi-enemy scope the merge and the Open Wounds application would both need re-reading.",
    "The skill2 14.06% core rider is a DIRECT core strike (core:true), not an auto-core-rate hit — the kit says 'core strike damage'. Its proc count is purely cadence-driven (see the cadence ⚑)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read from kit prose only. Shape: S1 = a battle-start 4s recurring sequential spear volley (7×125.51%, merged) that paints a permanent team-wide Open Wounds Damage Taken ▲5.05% debuff, plus a burst-cast AoE re-application of the same status. S2 = her own burst opens a 10s 'Into the Fray: Penetrant Wish' self-status that (a) adds an every-2-normal-attacks 14.06% direct CORE strike gated on Open Wounds and (b) cuts the S1 volley interval by 2s (4s → 2s) via skillCooldownReductionSec; the FB-enter pair is an either/or duty cycle — Sequential Attack Damage ▲85.17% on a Full Burst she did NOT burst into, Core Damage ▲24.64% on one she did. Burst = self ATK ▲78.4 / Attack Damage ▲78.14 / full reload + a 1346.4% AoE nuke. MG Ramp-Up Speed ▲100% is a REAL shot-count gain with no StatKey to express it and is flagged, not silently dropped."
}
```

### 6b. blind audit + flags

```json
{
  "slug": "marian-queen",
  "model": "claude-opus-5",
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "■ Activates at start of battle. Self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "Block header; combined with 'Recurring interval: 4 sec' into trigger interval{sec:4} on an enemy-targeted block (the payload is enemy-facing; 'Affects self' is the mode-entry wrapper)."
    },
    {
      "slot": "skill1",
      "kitLine": "Into the Fray: Sharpened Resolve",
      "status": "IMPLEMENTED",
      "effectOrReason": "Named skill label — load-bearing: it is the interval that skill2 Effect 2 reduces by 2 sec (skillCooldownReductionSec)."
    },
    {
      "slot": "skill1",
      "kitLine": "Function: Launches Dark Matter spears",
      "status": "SKIPPED",
      "effectOrReason": "Descriptive Function summary of Effect 1; no independent mechanic. Verbatim in unmodeled.skill1."
    },
    {
      "slot": "skill1",
      "kitLine": "Effect 1: 125.51% ATK, 7 sequential",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage atkPct 878.57 (=125.51×7, levelScale anchor [125.51]), flavor 'sequential' (S2's Sequential Attack Damage ▲ is the matching consumer), crit:true, gaugeHits:7. No core (text says plain 'damage'); noRange left to the engine; FB by timing (noFb unset)."
    },
    {
      "slot": "skill1",
      "kitLine": "Effect 2: Open Wounds: Dmg Taken ▲5.05%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff damageTakenPct 5.05 with NO durationSec (continuous/cannot be removed) + targetStatus 'Open Wounds' durationSec 999 so skill2's requiresTargetStatus gate opens. Boss debuff = whole-team benefit, not a self buff."
    },
    {
      "slot": "skill1",
      "kitLine": "Recurring interval: 4 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger interval{sec:4} (first fire t=4 — see phase ⚑)."
    },
    {
      "slot": "skill1",
      "kitLine": "■ When using Burst Skill. All enemies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast (her OWN cast — literal 'when using Burst Skill', NOT fullBurstEnter), target enemy. No stage set (Burst III, not Λ)."
    },
    {
      "slot": "skill1",
      "kitLine": "Open Wounds: Damage Taken ▲ 5.05%",
      "status": "IMPLEMENTED",
      "effectOrReason": "Same pair as Effect 2 (damageTakenPct 5.05 continuous + targetStatus 'Open Wounds'); must REFRESH the same status, not sum — see double-book caveat."
    },
    {
      "slot": "skill2",
      "kitLine": "■ When using Burst Skill. Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast, target self — opens the Penetrant Wish window."
    },
    {
      "slot": "skill2",
      "kitLine": "Into the Fray: Penetrant Wish",
      "status": "IMPLEMENTED",
      "effectOrReason": "selfStatus name 'Into the Fray: Penetrant Wish' (durationSec 10), read by the core-rider's requiresSelfStatus gate."
    },
    {
      "slot": "skill2",
      "kitLine": "Function: Deals core damage to all...",
      "status": "SKIPPED",
      "effectOrReason": "Descriptive Function summary of Effect 1. Verbatim in unmodeled.skill2."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 1: after 2 normal atks, 14.06% core",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger hitCount{count:2, perPull:true, countScope:'gated'} (MG hitsPerShot 1 so perPull is byte-equal, authored for fidelity; 'gated' because the counting lives inside the 10s window), target enemy, requiresSelfStatus 'Into the Fray: Penetrant Wish' + requiresTargetStatus 'Open Wounds', flatDamage 14.06 core:true crit:true."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect 2: Recurring interval ▼ 2 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff skillCooldownReductionSec 2 durationSec 10 on self — the schema's documented consumer 'dynamically shortens interval-trigger timers while active', i.e. S1's 4s volley becomes 2s for the window (~2× volleys + 2× Open Wounds reapplications)."
    },
    {
      "slot": "skill2",
      "kitLine": "Duration: 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "durationSec 10 on both the selfStatus and the skillCooldownReductionSec buff."
    },
    {
      "slot": "skill2",
      "kitLine": "■ FB enter while NOT in Penetrant Wish",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter + ownBurstGate 'notCast' (no negated requiresSelfStatus exists; her own burst is what grants the status, so 'not in it at FB entry' == she did not cast this rotation)."
    },
    {
      "slot": "skill2",
      "kitLine": "Sequential Atk Damage ▲85.17% 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff sequentialDamagePct 85.17 durationSec 10, self — ADDITIVE Damage-Up term; feeds her 'sequential'-flavored spear volley only."
    },
    {
      "slot": "skill2",
      "kitLine": "■ FB enter while IN Penetrant Wish",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter + ownBurstGate 'cast' — exact complement of the block above."
    },
    {
      "slot": "skill2",
      "kitLine": "Core Damage ▲ 24.64% for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff coreDamagePct 24.64 durationSec 10, self — pairs with the 14.06% core rider and her 200 coreAttackMultiplier normals."
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast, target self for the three self lines."
    },
    {
      "slot": "burst",
      "kitLine": "Reloads 100% of ammo.",
      "status": "IMPLEMENTED",
      "effectOrReason": "instantReload fraction 1 — weapon-state/shot-economy line, NOT skippable (300-round MG belt refilled on cast)."
    },
    {
      "slot": "burst",
      "kitLine": "MG Ramp-Up Speed ▲ 100% for 10 sec",
      "status": "SKIPPED",
      "effectOrReason": "No StatKey expresses MG ramp-up (the rate at which an MG reaches max RPM); the engine's cadence is a flat pulls/s with no ramp phase, so there is nothing to shorten. Encoding it as fireRatePct/attackSpeedPct would over-credit SUSTAINED RPM, which this line does not raise — a fudge. Verbatim in unmodeled.burst and ⚑-flagged as a real, unmodeled shot-count gain."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 78.4% for 10 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 78.4 durationSec 10, self (scales her own ATK; self-only per the '■ Affects self' header)."
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 78.14% for 10 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 78.14 durationSec 10, self — additive Damage-Up bucket."
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects all enemies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "Second burst block, target enemy; drives burstDesc 'allEnemies' on the nuke."
    },
    {
      "slot": "burst",
      "kitLine": "1346.4% of final ATK as Burst Skill dmg",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage atkPct 1346.4, crit:true, burstDesc:'allEnemies' (so a jackal/trina burstSkillAoeDamagePct amp can read it). No core (no 'core strike' wording). See the FB-exemption ⚑."
    }
  ],
  "flags": [
    {
      "field": "(base stats) cadence tuple — rate_of_fire / reloadFrames 171 / ammo 300",
      "estimate": "Datamined MG cadence as given; reloadFrames 171 (~2.85s) and the 300-round belt taken at face value.",
      "reasoning": "ALWAYS-⚑ #1: rate_of_fire and reloadFrames are known-unreliable datamine fields, and this unit is UNUSUALLY cadence-sensitive — the skill2 core rider fires every 2 normal attacks, so an MG RPM error propagates linearly into proc count across the whole 10s window, and the burst's 100% ammo refill only matters at the true belt/reload numbers.",
      "recipe": "Focus recording: count trigger pulls over a fixed 10s non-FB window to get pulls/s, and time one dry-fire→full-belt reload for the real reload frames. Then count the 14.06% core popups inside one Penetrant Wish window and check it equals floor(pulls_in_window / 2)."
    },
    {
      "field": "skill1[0].effects[0].atkPct (878.57 merged)",
      "estimate": "ONE merged instance of 878.57% with gaugeHits:7, rather than 7× 125.51%.",
      "reasoning": "ALWAYS-⚑ #5 split-vs-merge is kit-silent. Merge is damage-neutral for a flat multiplier stack and keeps the gauge right via gaugeHits, but it is wrong if any per-hit effect (a per-hit Open Wounds stack, a per-hit crit roll with non-linear consumers, a per-hit cap) exists.",
      "recipe": "Read the damage popups on one volley in a focus recording: 7 distinct numbers = split (author 7 effects); one aggregated number = merge confirmed. The same recording settles whether each spear hit re-applies Open Wounds separately."
    },
    {
      "field": "skill1[0].effects[1].value / maxStacks (Open Wounds 5.05%)",
      "estimate": "5.05% as a SINGLE continuous instance, no maxStacks.",
      "reasoning": "Read as a named STATE (skill2 gates on 'the Open Wounds state'), and the kit gives no stack count — guessing a precise stack cap would be the forbidden fudge. But 'landing a hit with a Dark Matter spear' is a per-hit trigger firing 7× every 4s permanently, which is exactly the shape a stacking debuff takes; if it stacks, a team-wide Damage Taken ▲ is under-credited by up to ~7×.",
      "recipe": "Watch the boss debuff icon in a focus recording for a stack counter and whether the number climbs over the first ~12s (3 volleys). Cross-check arithmetically: compare a teammate's identical normal-attack hit at t≈2s vs t≈20s — the ratio IS the accumulated Damage Taken, independent of any parse."
    },
    {
      "field": "skill1[0].trigger (interval first-fire phase)",
      "estimate": "interval{sec:4}, first volley at t=4s.",
      "reasoning": "ALWAYS-⚑ convention: 'Activates at the start of battle' argues for a t=0 opening volley, while the engine's interval primitive fires first at t=sec. One volley (878.57% + the first Open Wounds application ~4s earlier) rides on this.",
      "recipe": "Timestamp the first Dark Matter spear popup from battle start in a focus recording; if it is ~0s, prepend a battleStart-triggered copy of the damage block (and keep interval for the rest)."
    },
    {
      "field": "skill2[1].trigger (hitCount count 2 — recurring vs once)",
      "estimate": "RECURRING every 2 normal attacks inside the 10s window (hitCount{count:2}).",
      "reasoning": "'Activates after performing 2 normal attacks' under a 'Duration: 10 sec' header reads as the standard recurring per-N-attacks rider, and a one-shot reading would make a 14.06% core strike a rounding error on a Burst-III attacker's kit. Still a trigger-identity HYPOTHESIS, and it is the highest-leverage one in the file: on an MG the difference is ~1 proc vs tens.",
      "recipe": "Count the 14.06% core popups in one Penetrant Wish window in a focus recording. Also pins countScope: if popups keep appearing on attacks after the status lapses, the counting is 'always', not 'gated'."
    },
    {
      "field": "burst[1].effects[0].noFb / top-level burstSnapshotsPreFb",
      "estimate": "noFb NOT set and burstSnapshotsPreFb NOT set — the 1346.4% nuke is left to the engine's burst-cast timing.",
      "reasoning": "ALWAYS-⚑ #6: per-kit noFb is measured-only and defaults off, yet HARD RULE 9 states burst-cast/instant damage is always FB-exempt because the cast lands before the FB window opens. I cannot tell blind whether the engine already applies that for a burst-slot instance or whether this unit needs burstSnapshotsPreFb. If it needs it and does not have it, the nuke is over-credited by ×1.5.",
      "recipe": "Run the committed file in the harness with cfg.onEvent and read inFullBurst / fbMajorApplied on the burst-bucket damage event for marian-queen; if fbMajorApplied is true, set burstSnapshotsPreFb (preferred) per her observed cast→FB frame gap. Cross-check against the banner-to-popup timing in a focus recording."
    },
    {
      "field": "unmodeled.burst — 'Machine Gun Ramp-Up Speed ▲ 100% for 10 sec.'",
      "estimate": "Unmodeled (zero credit). A faithful ceiling would be roughly the rounds lost to the spin-up each magazine — plausibly a low-single-digit % of shots inside the 10s window, NOT a 100% fire-rate gain.",
      "reasoning": "HARD RULE 6 says weapon-state modifiers ARE damage, and this one genuinely gates shots fired — but no StatKey expresses ramp-up and the engine has no ramp phase to shorten, so there is nothing faithful to write. Mapping it onto fireRatePct would invent sustained RPM the kit never grants; a blind honest skip is correct here.",
      "recipe": "Frame-count her shot intervals from first pull after a reload to steady state, with and without the burst buff, to measure the real rounds gained. If it is material, the fix is an engine ramp model (an engine-modeling-gaps entry), not an override value."
    },
    {
      "field": "skill2[2].ownBurstGate / skill2[3].ownBurstGate (FB-enter duty cycle)",
      "estimate": "notCast → Sequential ▲85.17; cast → Core ▲24.64.",
      "reasoning": "PROXY, not the literal gate: the kit keys both on her own Penetrant Wish self-status, which the schema can only test positively. The mapping holds because her burst cast is the sole source of that status and she is Burst III (cast immediately precedes FB entry), but it diverges if a Full Burst begins within 10s of her cast without her casting, and the two blocks could in principle both fire or both miss on a timing race.",
      "recipe": "Harness: assert exactly one of the two buffApply events (sequentialDamagePct 85.17 / coreDamagePct 24.64) per fullBurstStart across a multi-rotation comp with a second Burst III present. If the engine supports it, prefer requiresSelfStatus on the 'cast' block once the complement can be expressed."
    }
  ]
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 1 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"interval","sec":4},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":125.51,"flavor":"sequential"},{"kind":"buff","stat":"damageTakenPct","value":5.05},{"kind":"targetStatus","name":"Open Wounds","durationSec":999},{"kind":"flatDamage","atkPct":125.51,"flavor":"sequential"},{"kind":"flatDamage","atkPct":125.51,"flavor":"sequential"},{"kind":"flatDamage","atkPct":125.51,"flavor":"sequential"},{"kind":"flatDamage","atkPct":125.51,"flavor":"sequential"},{"kind":"flatDamage","atkPct":125.51,"flavor":"sequential"},{"kind":"flatDamage","atkPct":125.51,"flavor":"sequential"}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"interval","sec":4},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":878.57,"flavor":"sequential","crit":true,"gaugeHits":7,"levelScale":{"atkPct":[125.51]}},{"kind":"buff","stat":"damageTakenPct","value":5.05},{"kind":"targetStatus","name":"Open Wounds","durationSec":999}],"gates":{}}

### skill2: 1 identical block(s); 3 driver-only; 3 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"selfStatus","name":"Penetrant Wish","durationSec":10},{"kind":"buff","stat":"skillCooldownReductionSec","value":2,"durationSec":10}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"hitCount","count":2,"countScope":"gated"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":14.06,"core":true}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"fullBurstEnter"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"coreDamagePct","value":24.64,"durationSec":10}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"selfStatus","name":"Into the Fray: Penetrant Wish","durationSec":10},{"kind":"buff","stat":"skillCooldownReductionSec","value":2,"durationSec":10}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"hitCount","count":2,"perPull":true,"countScope":"gated"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":14.06,"core":true,"crit":true}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"fullBurstEnter"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"coreDamagePct","value":24.64,"durationSec":10}],"gates":{"ownBurstGate":"cast"}}

### burst: 0 identical block(s); 2 driver-only; 2 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"instantReload"},{"kind":"buff","stat":"atkPct","value":78.4,"durationSec":10},{"kind":"buff","stat":"attackDamagePct","value":78.14,"durationSec":10}],"gates":{}}
- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":1346.4,"burstDesc":"allEnemies"}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"self"},"effects":[{"kind":"instantReload","fraction":1},{"kind":"buff","stat":"atkPct","value":78.4,"durationSec":10},{"kind":"buff","stat":"attackDamagePct","value":78.14,"durationSec":10}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":1346.4,"crit":true,"burstDesc":"allEnemies"}],"gates":{}}

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/marian-queen.json

```json
{
  "note": "Marian: Queen (`marian-queen`; no base `marian` exists in the roster). MG / Attacker / Fire / Pilgrim, Burst III (cd 40s), ammo 300, reloadFrames 171, normalMult 5.57, coreMult 200 — weapon cycle carried by characters.json, no charFixes. Kit-autonomy gauntlet 2026-10-29 — test-first, pinned by scripts/tests/units/marian-queen.test.ts (P1–P7; P8 GAP). No real-fight recording yet: structure is test-pinned, magnitudes are SL10 kit-text literals (DATAMINED). SKILL1 'Sharpened Resolve': the Into the Fray: Sharpened Resolve mode runs from battle start for the whole fight → one interval:4 block on the enemy — 7 sequential-flavored flatDamage 125.51% hits per volley ('Attacks sequentially 7 times'; single boss, so all 7 random-enemy spears land on it) + Open Wounds on the first landed spear: damageTakenPct 5.05 with NO duration ('continuous and cannot be removed') + targetStatus 'Open Wounds' 999s (the named status Skill 2's core strike gates on). Re-applications refresh the one S1-keyed debuff, never stack (no stack wording). Second ■ header 'Activates when using Burst Skill → all enemies: Open Wounds' = a burstCast block (HER OWN cast) with the same damageTakenPct 5.05 + status in the skill1 slot, so it shares the key and never co-stacks. SKILL2 'Synthetic World': on her burstCast → selfStatus 'Penetrant Wish' 10s + skillCooldownReductionSec 2 for 10s (Sharpened Resolve's recurring interval 4s → 2s inside the window; she has no other interval block). Effect 1 'after performing 2 normal attacks → all enemies in Open Wounds: 14.06% of final ATK as core strike damage' = hitCount count 2, countScope gated (the count is part of the Penetrant Wish state, so only rounds fired while in the state accrue; MG hitsPerShot 1, so rounds = pulls) gated requiresSelfStatus 'Penetrant Wish' + requiresTargetStatus 'Open Wounds' → flatDamage 14.06 core:true (text-fidelity: 'core strike damage'). Full-Burst entry branches on the state: IN Penetrant Wish → requiresSelfStatus 'Penetrant Wish' → self coreDamagePct 24.64 10s; NOT in Penetrant Wish → ownBurstGate 'notCast' → self sequentialDamagePct 85.17 10s (additive Damage Up, reaches only the sequential spears). ownBurstGate is the exact negation here: Penetrant Wish opens only on her own cast, 22f before that rotation's Full Burst, and lasts 10s against a 40s cooldown, so she is in the state at Full Burst entry iff she cast in that rotation. BURST 'Distant New World' (burstCast): self instantReload (100%), atkPct 78.4 10s, attackDamagePct 78.14 10s; enemy flatDamage 1346.4 burstDesc allEnemies (burst-cast damage lands before Full Burst — no +50%). ⚑ LIST: [⚑1] MG Ramp-Up Speed ▲ 100% for 10s is UNMODELED — the engine runs the measured MG wind-up ladder but has no wind-up-speed modifier (docs/engine-modeling-gaps.md, the MG ramp-up speed entry). ESTIMATE: small and positive — only the spin-up after a reload inside her 10s window is shortened; the burst refill itself does not stop her firing. RECIPE: a focus recording of her post-burst reload inside the window — count rounds in the first second after the reload vs outside the window. TIER: engine gap. [⚑2] Sharpened Resolve first-volley phase: the engine interval convention fires the first volley at t=4s, not at battle start (t=0). ESTIMATE: at most one extra 7×125.51% volley over 180s if the game fires at t=0. RECIPE: read the first spear popups after the 03:00 timer frame. TIER: engine convention. [⚑3] 'Core strike damage' is encoded core:true, which resolves at the engine's MG core rate × core exposure (the same path as every core-labelled rider), not a guaranteed 100% core hit. ESTIMATE: if every strike is a guaranteed core, the strikes run cold by the factor 1/coreRate. RECIPE: popup colour of the 14.06% strikes in a Penetrant Wish window (red CORE HIT on every strike = guaranteed). TIER: text-literal, rate unmeasured.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Machine Gun Ramp-Up Speed ▲ 100% for 10 sec. — no MG wind-up-speed modifier exists in the engine (the measured wind-up ladder is fixed); see ⚑1 in the note and docs/engine-modeling-gaps.md."
    ]
  },
  "caveats": [
    "burst: MG Ramp-Up Speed ▲ 100% is unmodeled (⚑1) — her post-reload spin-up inside the 10s burst window runs at the normal ladder.",
    "skill1: the first spear volley fires at t=4s by the engine interval convention (⚑2).",
    "skill2: the 14.06% core strikes use the engine's MG core rate, not a guaranteed core hit (⚑3)."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 4
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 125.51,
          "flavor": "sequential"
        },
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.05
        },
        {
          "kind": "targetStatus",
          "name": "Open Wounds",
          "durationSec": 999
        },
        {
          "kind": "flatDamage",
          "atkPct": 125.51,
          "flavor": "sequential"
        },
        {
          "kind": "flatDamage",
          "atkPct": 125.51,
          "flavor": "sequential"
        },
        {
          "kind": "flatDamage",
          "atkPct": 125.51,
          "flavor": "sequential"
        },
        {
          "kind": "flatDamage",
          "atkPct": 125.51,
          "flavor": "sequential"
        },
        {
          "kind": "flatDamage",
          "atkPct": 125.51,
          "flavor": "sequential"
        },
        {
          "kind": "flatDamage",
          "atkPct": 125.51,
          "flavor": "sequential"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.05
        },
        {
          "kind": "targetStatus",
          "name": "Open Wounds",
          "durationSec": 999
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "selfStatus",
          "name": "Penetrant Wish",
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "skillCooldownReductionSec",
          "value": 2,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 2,
        "countScope": "gated"
      },
      "requiresSelfStatus": "Penetrant Wish",
      "requiresTargetStatus": "Open Wounds",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 14.06,
          "core": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "ownBurstGate": "notCast",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "sequentialDamagePct",
          "value": 85.17,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "requiresSelfStatus": "Penetrant Wish",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 24.64,
          "durationSec": 10
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
          "kind": "instantReload"
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 78.4,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 78.14,
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1346.4,
          "burstDesc": "allEnemies"
        }
      ]
    }
  ]
}
```

### 7b. scripts/tests/units/marian-queen.test.ts

```ts
// PER-UNIT KIT SPEC — `marian-queen` (Marian: Queen; MG / Attacker / Fire / Pilgrim, Burst III,
// cd 40s, ammo 300, reloadFrames 171, normalMult 5.57, coreMult 200). NEW unit — no base `marian`
// exists in the roster. Kit-autonomy gauntlet 2026-10-29. Tier 2 (a self-status gate — Penetrant
// Wish — splits the Full-Burst-entry line into two branches; burstCast-vs-fullBurstEnter identity;
// a boss status — Open Wounds — gates the core-strike proc).
//
// One assertion group per KIT LINE (P1..P8), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters['marian-queen'].skills, SL10):
//   S1 ■ start of battle → self: Into the Fray: Sharpened Resolve — launches Dark Matter spears:
//        Effect 1: 125.51% of final ATK, "Attacks sequentially 7 times"; Recurring interval 4 sec  [P1]
//        Effect 2: on a spear hit → the target: Open Wounds: Damage Taken ▲ 5.05%, continuous,
//                  cannot be removed                                                           [P2]
//      ■ using Burst Skill → all enemies: Open Wounds (same 5.05%, continuous)                  [P3]
//   S2 ■ using Burst Skill → self: Into the Fray: Penetrant Wish, Duration 10 sec:
//        Effect 1: after performing 2 normal attacks → all enemies in Open Wounds: 14.06% of final
//                  ATK as core strike damage                                                   [P4]
//        Effect 2: Recurring interval of Sharpened Resolve ▼ 2 sec                              [P5]
//      ■ entering Full Burst while NOT in Penetrant Wish → self: Sequential Attack Damage ▲ 85.17% 10s
//      ■ entering Full Burst while IN Penetrant Wish → self: Core Damage ▲ 24.64% 10s           [P6]
//   BU ■ self: Reloads 100% of ammo; MG Ramp-Up Speed ▲ 100% 10s [P8 GAP]; ATK ▲ 78.4% 10s;
//        Attack Damage ▲ 78.14% 10s                                                            [P7]
//      ■ all enemies: 1346.4% of final ATK as Burst Skill damage                               [P7]
//
// UNMODELED / ⚑ (documented in the override, not asserted):
//   - MG Ramp-Up Speed ▲ 100%: the engine models the measured MG wind-up ladder but has no
//     wind-up-speed modifier (engine-modeling-gaps; same line as rei-ayanami-tentative-name /
//     asuka-wille) → P8 it.skip.
//   - Sharpened Resolve first-volley phase: engine `interval` convention (first volley at t=4s,
//     not t=0) ⚑.
//
// Why each assertion discriminates:
//   P1  Volleys of EXACTLY 7 sequential hits at 125.51%, every 240f outside the P5 window.
//       Counterfactuals: one aggregated hit (1 event / volley), a single 125.51% hit (7× under),
//       flavor dropped (P6 Sequential Attack Damage can no longer reach the spears).
//   P2  Damage Taken 5.05 on the BOSS, first applied on the first volley, NO expiry, never stacks.
//       Counterfactuals: a 10s duration (expires), stacking per volley (stacks > 1).
//   P3  A separate burstCast-keyed application of the same debuff (refresh on her cast frames) —
//       shares the S1 key, so it never co-stacks with P2. Counterfactual: block dropped.
//   P4  Core strikes (14.06%, core-eligible, skill2) ONLY inside the 10s Penetrant Wish window
//       after each of her casts, one per 2 of her shots there. Counterfactuals: gate dropped
//       (strikes outside the window), core flag dropped, count 1 (twice as many), Open Wounds
//       producer removed (the boss-status gate never opens → no strikes).
//   P5  Inside the window the volley period is 120f (4s − 2s); outside, 240f. Counterfactual:
//       the reduction buff dropped → 240f everywhere.
//   P6  At Full Bursts entered after HER cast → Core Damage ▲ 24.64% (10s) and NO Sequential buff;
//       at Full Bursts another B3 (helm) completed → Sequential Attack Damage ▲ 85.17% (10s) and NO
//       Core buff. Counterfactuals: either gate dropped (the buff appears in the other branch);
//       the sequential buff observably lifts the spears' Damage-Up term by 0.8517.
//   P7  Her burst: nuke 1346.4% on the cast frame (burst bucket, no Full-Burst +50%), self ATK
//       ▲ 78.4% + Attack Damage ▲ 78.14% for 10s, magazine refilled to full.
//       Counterfactuals: fullBurstEnter keying (frame shift), instantReload dropped.
//
// Fixture: the control comp — liter (B1) / crown (B2) / marian-queen (B3) / helm (B3, the SR/Water
// Helm — NOT helm-aquamarine), boss Fire, focus marian-queen. Two B3s, so some Full Bursts are
// completed by helm while her 40s cooldown is down (the NOT-in-Penetrant-Wish branch). Deterministic.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'marian-queen';
const FPS = 60;
const WIN = 10 * FPS; // Penetrant Wish / burst-buff duration

type Dmg = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(ov?: any) {
  const events: SimEvent[] = [];
  const base = controlComp(SLUG);
  const res = runComp({
    ...base,
    overrides: ov ? { [SLUG]: ov } : {},
    cfg: { onEvent: (e) => events.push(e) },
  });
  const idx = base.slugs.indexOf(SLUG);
  const dmg = events.filter(
    (e): e is Dmg => e.kind === 'damage' && e.slug === SLUG
  );
  const shots = events.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === SLUG
  );
  const casts = events
    .filter((e) => e.kind === 'burstCast' && e.slug === SLUG)
    .map((e) => e.frame);
  const fbStarts = events
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame);
  // boss debuffs carry targetIdx null — attribute them by the `<ownerIdx>:<slot>:…` key prefix
  const mine = events.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      (e.casterIdx === idx ||
        (e.targetIdx === null && e.key.startsWith(`${idx}:`)))
  );
  const spears = dmg.filter((d) => d.srcSlot === 'skill1');
  const volleys = [...new Set(spears.map((d) => d.frame))].sort(
    (a, b) => a - b
  );
  return {
    events,
    idx,
    dmg,
    shots,
    casts,
    fbStarts,
    mine,
    spears,
    volleys,
    strikes: dmg.filter((d) => d.srcSlot === 'skill2'),
    totals: totals(res),
  };
}
type Run = ReturnType<typeof run>;

const inWish = (r: Run, f: number) =>
  r.casts.some((c) => f >= c && f <= c + WIN);
/** Full Bursts whose chain SHE completed (her cast within 2s before the FB start). */
const fbAfterHerCast = (r: Run) =>
  r.fbStarts.filter((s) => r.casts.some((c) => c <= s && s - c <= 120));
const fbWithoutHerCast = (r: Run) =>
  r.fbStarts.filter((s) => !fbAfterHerCast(r).includes(s));
const inFbWindow = (starts: number[], f: number) =>
  starts.some((s) => f >= s && f < s + WIN);
const selfBuffs = (r: Run, stat: string) =>
  r.mine.filter((b) => b.stat === stat && b.targetIdx === r.idx);
const bossBuffs = (r: Run, stat: string) =>
  r.mine.filter((b) => b.stat === stat && b.targetIdx === null);

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
const isInterval = (b: any) => b.trigger.kind === 'interval';
const isStrike = (b: any) => b.trigger.kind === 'hitCount';

const main = run();

describe(`${SLUG} — fixture`, () => {
  it('she casts her burst, and helm completes some Full Bursts without her', () => {
    expect(main.casts.length).toBeGreaterThanOrEqual(2);
    expect(fbAfterHerCast(main).length).toBeGreaterThanOrEqual(2);
    expect(fbWithoutHerCast(main).length).toBeGreaterThanOrEqual(1);
  });
});

describe('P1 — Sharpened Resolve: 7 sequential Dark Matter spears × 125.51%, every 4 sec', () => {
  it('every volley is exactly 7 hits at 125.51% of final ATK on the boss', () => {
    expect(main.volleys.length).toBeGreaterThan(40);
    for (const v of main.volleys) {
      const hits = main.spears.filter((d) => d.frame === v);
      expect(hits.length).toBe(7);
      for (const h of hits) {
        expect(h.atkPct).toBe(125.51);
        expect(h.bucket).toBe('skill');
      }
    }
  });

  it('the first volley lands at t=4s (interval convention) and outside the burst window every 240f', () => {
    expect(main.volleys[0]).toBe(4 * FPS);
    for (let i = 1; i < main.volleys.length; i++) {
      const v = main.volleys[i];
      if (!inWish(main, v)) {
        expect(v - main.volleys[i - 1]).toBe(4 * FPS);
      }
    }
  });

  it('the spears are sequential-flavored (static block shape)', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    const b = findBlock(ov, 'skill1', isInterval);
    expect(b.trigger.sec).toBe(4);
    const hits = b.effects.filter((e: any) => e.kind === 'flatDamage');
    expect(hits.length).toBe(7);
    for (const e of hits) {
      expect(e.flavor).toBe('sequential');
      expect(e.atkPct).toBe(125.51);
    }
  });

  it('DISCRIMINATING: a single 125.51% hit per volley deals 1/7 of the spear damage', () => {
    const cf = run(
      patch((ov) => {
        const b = findBlock(ov, 'skill1', isInterval);
        let kept = false;
        b.effects = b.effects.filter((e: any) => {
          if (e.kind !== 'flatDamage') {
            return true;
          }
          if (kept) {
            return false;
          }
          kept = true;
          return true;
        });
      })
    );
    expect(cf.spears.length).toBe(cf.volleys.length);
    expect(cf.spears.length).toBeLessThan(main.spears.length / 6);
  });
});

describe('P2 — Open Wounds: boss Damage Taken ▲ 5.05%, continuous, non-stacking', () => {
  const ow = bossBuffs(main, 'damageTakenPct');

  it('first applied on the first spear volley, on the BOSS, value 5.05, with NO expiry', () => {
    expect(ow.length).toBeGreaterThan(0);
    expect(Math.min(...ow.map((b) => b.frame))).toBe(main.volleys[0]);
    for (const b of ow) {
      expect(b.value).toBe(5.05);
      expect(b.expiresFrame).toBeNull();
      expect(b.key.split(':')[1]).toBe('skill1');
    }
  });

  it('never stacks: one entry, stacks 1, across every volley and burst cast', () => {
    for (const b of ow) {
      expect(b.stacks).toBe(1);
    }
    expect(new Set(ow.map((b) => b.key)).size).toBe(1);
  });

  it('DISCRIMINATING: a stacking reading (maxStacks 7) accumulates stacks', () => {
    const cf = run(
      patch((ov) => {
        const b = findBlock(ov, 'skill1', isInterval);
        b.effects.find((e: any) => e.stat === 'damageTakenPct').maxStacks = 7;
      })
    );
    expect(
      Math.max(...bossBuffs(cf, 'damageTakenPct').map((b) => b.stacks))
    ).toBeGreaterThan(1);
  });

  it('DISCRIMINATING: a timed (10s) reading carries an expiry', () => {
    const cf = run(
      patch((ov) => {
        const b = findBlock(ov, 'skill1', isInterval);
        b.effects.find((e: any) => e.stat === 'damageTakenPct').durationSec =
          10;
      })
    );
    expect(
      bossBuffs(cf, 'damageTakenPct').some((b) => b.expiresFrame !== null)
    ).toBe(true);
  });

  it('it amplifies the whole team (an ally deals less without it)', () => {
    const cf = run(
      patch((ov) => {
        for (const slot of ['skill1', 'burst']) {
          for (const b of ov[slot]) {
            b.effects = b.effects.filter(
              (e: any) => e.stat !== 'damageTakenPct'
            );
          }
        }
      })
    );
    expect(cf.totals.liter).toBeLessThan(main.totals.liter);
  });
});

describe('P3 — burst use re-applies Open Wounds to all enemies (same debuff, no co-stack)', () => {
  it('an Open Wounds application lands on each of her burst-cast frames', () => {
    const ow = bossBuffs(main, 'damageTakenPct');
    for (const c of main.casts) {
      expect(ow.some((b) => b.frame === c)).toBe(true);
    }
  });

  it('the burst-use block is burstCast-keyed, enemy-targeted, and shares the S1 slot key', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    const b = ov.skill1.find(
      (x: any) => x.trigger.kind === 'burstCast' && hasStat('damageTakenPct')(x)
    );
    expect(b).toBeDefined();
    expect(b.target.kind).toBe('enemy');
  });

  it('DISCRIMINATING: without the burst-use block, no application lands on a cast frame between volleys', () => {
    const cf = run(
      patch((ov) => {
        ov.skill1 = ov.skill1.filter(
          (x: any) => !(x.trigger.kind === 'burstCast')
        );
      })
    );
    const ow = bossBuffs(cf, 'damageTakenPct');
    const offVolley = cf.casts.filter((c) => !cf.volleys.includes(c));
    expect(offVolley.length).toBeGreaterThan(0);
    for (const c of offVolley) {
      expect(ow.some((b) => b.frame === c)).toBe(false);
    }
  });
});

describe('P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike', () => {
  it('core strikes are 14.06%, core-eligible, skill damage', () => {
    expect(main.strikes.length).toBeGreaterThan(0);
    for (const s of main.strikes) {
      expect(s.atkPct).toBe(14.06);
      expect(s.coreEligible).toBe(true);
      expect(s.bucket).toBe('skill');
    }
  });

  it('they occur ONLY inside the 10s window after each of her casts, on her shot frames', () => {
    const shotFrames = new Set(main.shots.map((s) => s.frame));
    for (const s of main.strikes) {
      expect(inWish(main, s.frame)).toBe(true);
      expect(shotFrames.has(s.frame)).toBe(true);
    }
  });

  it('one strike per 2 of her shots inside each window', () => {
    for (const c of main.casts) {
      const n = main.shots.filter(
        (s) => s.frame > c && s.frame < c + WIN
      ).length;
      const k = main.strikes.filter(
        (s) => s.frame > c && s.frame < c + WIN
      ).length;
      expect(n).toBeGreaterThan(100);
      expect(Math.abs(k - n / 2)).toBeLessThanOrEqual(1);
    }
  });

  // countScope 'gated': only rounds fired WHILE in Penetrant Wish advance the count, so after
  // every window the cumulative strikes are exactly half the cumulative in-window rounds.
  const cumulativeExact = (r: Run) => {
    let n = 0;
    return r.casts.every((c) => {
      n += r.shots.filter((s) => s.frame >= c && s.frame < c + WIN).length;
      const k = r.strikes.filter((s) => s.frame < c + WIN).length;
      return k === Math.floor(n / 2);
    });
  };

  it('only rounds fired inside Penetrant Wish count toward the 2 (cumulative strikes = ⌊in-window rounds / 2⌋)', () => {
    expect(cumulativeExact(main)).toBe(true);
  });

  it('DISCRIMINATING: an ungated counter is pre-charged by rounds fired outside the window', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', isStrike).trigger.countScope;
      })
    );
    expect(cumulativeExact(cf)).toBe(false);
  });

  it('the Penetrant Wish status is opened by her burst, self, 10s', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    const b = ov.skill2.find((x: any) =>
      x.effects.some((e: any) => e.kind === 'selfStatus')
    );
    expect(b.trigger.kind).toBe('burstCast');
    expect(b.target.kind).toBe('self');
    const st = b.effects.find((e: any) => e.kind === 'selfStatus');
    expect(st.name).toBe('Penetrant Wish');
    expect(st.durationSec).toBe(10);
  });

  it('DISCRIMINATING: dropping the Penetrant Wish gate fires strikes outside the window', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', isStrike).requiresSelfStatus;
      })
    );
    expect(cf.strikes.some((s) => !inWish(cf, s.frame))).toBe(true);
  });

  it('DISCRIMINATING: a fullBurstEnter-keyed Penetrant Wish opens the window on helm’s Full Bursts too', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'skill2', (b: any) =>
          b.effects.some((e: any) => e.kind === 'selfStatus')
        ).trigger = { kind: 'fullBurstEnter' };
      })
    );
    const other = fbWithoutHerCast(cf);
    expect(cf.strikes.some((s) => inFbWindow(other, s.frame))).toBe(true);
    expect(main.strikes.some((s) => inFbWindow(other, s.frame))).toBe(false);
  });

  it('DISCRIMINATING: every normal attack (count 1) doubles the strikes', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'skill2', isStrike).trigger.count = 1;
      })
    );
    expect(cf.strikes.length).toBeGreaterThan(main.strikes.length * 1.8);
  });

  it('DISCRIMINATING: a plain (non-core) hit is not core-eligible', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'skill2', isStrike).effects[0].core = false;
      })
    );
    expect(cf.strikes.every((s) => !s.coreEligible)).toBe(true);
  });

  it('DISCRIMINATING: with no Open Wounds status on the boss the strikes never fire', () => {
    const cf = run(
      patch((ov) => {
        for (const b of ov.skill1) {
          b.effects = b.effects.filter((e: any) => e.kind !== 'targetStatus');
        }
      })
    );
    expect(cf.strikes).toEqual([]);
  });
});

describe('P5 — Penetrant Wish: Sharpened Resolve recurring interval ▼ 2 sec (4s → 2s)', () => {
  const gapsInWindow = (r: Run) => {
    const out: number[] = [];
    for (let i = 1; i < r.volleys.length; i++) {
      const v = r.volleys[i];
      if (r.casts.some((c) => v >= c + 121 && v < c + WIN)) {
        out.push(v - r.volleys[i - 1]);
      }
    }
    return out;
  };

  it('inside the window the volley period is 120f', () => {
    const g = gapsInWindow(main);
    expect(g.length).toBeGreaterThanOrEqual(main.casts.length * 3);
    expect(g.every((x) => x === 2 * FPS)).toBe(true);
  });

  it('the reduction is a self skillCooldownReductionSec 2 for 10s on each cast', () => {
    const red = selfBuffs(main, 'skillCooldownReductionSec');
    expect(red.map((b) => b.frame)).toEqual(main.casts);
    for (const b of red) {
      expect(b.value).toBe(2);
      expect(b.expiresFrame! - b.frame).toBe(WIN);
    }
  });

  it('DISCRIMINATING: without the reduction every in-window gap stays 240f', () => {
    const cf = run(
      patch((ov) => {
        for (const b of ov.skill2) {
          b.effects = b.effects.filter(
            (e: any) => e.stat !== 'skillCooldownReductionSec'
          );
        }
      })
    );
    expect(gapsInWindow(cf).every((x) => x === 4 * FPS)).toBe(true);
    expect(cf.volleys.length).toBeLessThan(main.volleys.length);
  });
});

describe('P6 — Full Burst entry branches on the Penetrant Wish state', () => {
  const core = selfBuffs(main, 'coreDamagePct');
  const seq = selfBuffs(main, 'sequentialDamagePct');

  it('IN Penetrant Wish (FB after her cast) → Core Damage ▲ 24.64% 10s, no Sequential buff', () => {
    const mineFb = fbAfterHerCast(main);
    expect(core.map((b) => b.frame)).toEqual(mineFb);
    for (const b of core) {
      expect(b.value).toBe(24.64);
      expect(b.expiresFrame! - b.frame).toBe(WIN);
    }
    for (const f of mineFb) {
      expect(seq.some((b) => b.frame === f)).toBe(false);
    }
  });

  it('NOT in Penetrant Wish (FB helm completed) → Sequential Attack Damage ▲ 85.17% 10s, no Core buff', () => {
    const other = fbWithoutHerCast(main);
    expect(seq.map((b) => b.frame)).toEqual(other);
    for (const b of seq) {
      expect(b.value).toBe(85.17);
      expect(b.expiresFrame! - b.frame).toBe(WIN);
    }
    for (const f of other) {
      expect(core.some((b) => b.frame === f)).toBe(false);
    }
  });

  it('the Sequential buff lifts the spears’ Damage-Up term by 0.8517 in those Full Bursts', () => {
    const cf = run(
      patch((ov) => {
        ov.skill2 = ov.skill2.filter(
          (b: any) => !hasStat('sequentialDamagePct')(b)
        );
      })
    );
    const other = fbWithoutHerCast(main);
    const lifted = main.spears.filter((d) => inFbWindow(other, d.frame));
    expect(lifted.length).toBeGreaterThan(0);
    for (const d of lifted) {
      const twin = cf.spears.find((x) => x.frame === d.frame)!;
      expect(d.mult.dmgUp - twin.mult.dmgUp).toBeCloseTo(0.8517, 6);
    }
  });

  it('DISCRIMINATING: dropping the NOT-state gate grants the Sequential buff after her cast too', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', hasStat('sequentialDamagePct'))
          .ownBurstGate;
      })
    );
    const s = selfBuffs(cf, 'sequentialDamagePct').map((b) => b.frame);
    expect(fbAfterHerCast(cf).some((f) => s.includes(f))).toBe(true);
  });

  it('DISCRIMINATING: dropping the IN-state gate grants Core Damage on helm’s Full Bursts too', () => {
    const cf = run(
      patch((ov) => {
        delete findBlock(ov, 'skill2', hasStat('coreDamagePct'))
          .requiresSelfStatus;
      })
    );
    const c = selfBuffs(cf, 'coreDamagePct').map((b) => b.frame);
    expect(fbWithoutHerCast(cf).some((f) => c.includes(f))).toBe(true);
  });
});

describe('P7 — burst: self ATK / Attack Damage 10s, 100% reload, 1346.4% nuke', () => {
  it('the nuke lands on each cast frame: 1346.4%, burst bucket, no Full-Burst +50%', () => {
    const nukes = main.dmg.filter((d) => d.srcSlot === 'burst');
    expect(nukes.map((d) => d.frame)).toEqual(main.casts);
    for (const d of nukes) {
      expect(d.atkPct).toBe(1346.4);
      expect(d.bucket).toBe('burst');
      expect(d.fbMajorApplied).toBe(false);
    }
  });

  it('self ATK ▲ 78.4% and Attack Damage ▲ 78.14% for 10s on each cast', () => {
    for (const [stat, v] of [
      ['atkPct', 78.4],
      ['attackDamagePct', 78.14],
    ] as const) {
      const bs = selfBuffs(main, stat).filter(
        (b) => b.key.split(':')[1] === 'burst'
      );
      expect(bs.map((b) => b.frame)).toEqual(main.casts);
      for (const b of bs) {
        expect(b.value).toBe(v);
        expect(b.expiresFrame! - b.frame).toBe(WIN);
      }
    }
  });

  it('the magazine is full again right after each cast', () => {
    for (const c of main.casts) {
      const next = main.shots.find((s) => s.frame > c)!;
      expect(next.ammoAfter).toBeGreaterThanOrEqual(298);
    }
  });

  it('DISCRIMINATING: without the reload the first post-cast shot is not from a full magazine', () => {
    const cf = run(
      patch((ov) => {
        for (const b of ov.burst) {
          b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
        }
      })
    );
    expect(
      cf.casts.some((c) => cf.shots.find((s) => s.frame > c)!.ammoAfter < 298)
    ).toBe(true);
  });

  it('DISCRIMINATING: fullBurstEnter keying moves the nuke off the cast frame', () => {
    const cf = run(
      patch((ov) => {
        findBlock(ov, 'burst', (b: any) =>
          b.effects.some((e: any) => e.atkPct === 1346.4)
        ).trigger = { kind: 'fullBurstEnter' };
      })
    );
    const nukes = cf.dmg.filter((d) => d.srcSlot === 'burst');
    expect(nukes.some((d) => cf.casts.includes(d.frame))).toBe(false);
  });
});

describe('P8 — burst: Machine Gun Ramp-Up Speed ▲ 100% for 10 sec', () => {
  it.skip('GAP: no MG wind-up-speed modifier exists in the engine (docs/engine-modeling-gaps.md — MG ramp-up speed); the line is in `unmodeled`', () => {});

  it('the line is recorded verbatim in unmodeled.burst', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});
    expect(
      ov.unmodeled.burst.some((l: string) =>
        l.includes('Machine Gun Ramp-Up Speed ▲ 100% for 10 sec')
      )
    ).toBe(true);
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/marian-queen.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — marian-queen — kit-autonomy gauntlet 2026-10-29
Arm 1 (pre-S3, NO override on disk — the new unit's starting state; commit 62693a87): RED as required:
    Error: no skill override for "marian-queen" — the engine does not parse skill prose at runtime; run `npx tsx scripts/materialize-overrides.ts --write marian-queen` or author one via /kit-parse
          Tests  no tests
Arm 2 (shipped override): npx vitest run scripts/tests/units/marian-queen.test.ts --reporter=verbose — every DISCRIMINATING case runs the named nearest-wrong encoding via withPatchedOverride in the same file and asserts it diverges, so GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions.

 ✓ scripts/tests/units/marian-queen.test.ts > marian-queen — fixture > she casts her burst, and helm completes some Full Bursts without her
 ✓ scripts/tests/units/marian-queen.test.ts > P1 — Sharpened Resolve: 7 sequential Dark Matter spears × 125.51%, every 4 sec > every volley is exactly 7 hits at 125.51% of final ATK on the boss
 ✓ scripts/tests/units/marian-queen.test.ts > P1 — Sharpened Resolve: 7 sequential Dark Matter spears × 125.51%, every 4 sec > the first volley lands at t=4s (interval convention) and outside the burst window every 240f
 ✓ scripts/tests/units/marian-queen.test.ts > P1 — Sharpened Resolve: 7 sequential Dark Matter spears × 125.51%, every 4 sec > the spears are sequential-flavored (static block shape)
 ✓ scripts/tests/units/marian-queen.test.ts > P1 — Sharpened Resolve: 7 sequential Dark Matter spears × 125.51%, every 4 sec > DISCRIMINATING: a single 125.51% hit per volley deals 1/7 of the spear damage
 ✓ scripts/tests/units/marian-queen.test.ts > P2 — Open Wounds: boss Damage Taken ▲ 5.05%, continuous, non-stacking > first applied on the first spear volley, on the BOSS, value 5.05, with NO expiry
 ✓ scripts/tests/units/marian-queen.test.ts > P2 — Open Wounds: boss Damage Taken ▲ 5.05%, continuous, non-stacking > never stacks: one entry, stacks 1, across every volley and burst cast
 ✓ scripts/tests/units/marian-queen.test.ts > P2 — Open Wounds: boss Damage Taken ▲ 5.05%, continuous, non-stacking > DISCRIMINATING: a stacking reading (maxStacks 7) accumulates stacks
 ✓ scripts/tests/units/marian-queen.test.ts > P2 — Open Wounds: boss Damage Taken ▲ 5.05%, continuous, non-stacking > DISCRIMINATING: a timed (10s) reading carries an expiry
 ✓ scripts/tests/units/marian-queen.test.ts > P2 — Open Wounds: boss Damage Taken ▲ 5.05%, continuous, non-stacking > it amplifies the whole team (an ally deals less without it)
 ✓ scripts/tests/units/marian-queen.test.ts > P3 — burst use re-applies Open Wounds to all enemies (same debuff, no co-stack) > an Open Wounds application lands on each of her burst-cast frames
 ✓ scripts/tests/units/marian-queen.test.ts > P3 — burst use re-applies Open Wounds to all enemies (same debuff, no co-stack) > the burst-use block is burstCast-keyed, enemy-targeted, and shares the S1 slot key
 ✓ scripts/tests/units/marian-queen.test.ts > P3 — burst use re-applies Open Wounds to all enemies (same debuff, no co-stack) > DISCRIMINATING: without the burst-use block, no application lands on a cast frame between volleys
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > core strikes are 14.06%, core-eligible, skill damage
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > they occur ONLY inside the 10s window after each of her casts, on her shot frames
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > one strike per 2 of her shots inside each window
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > only rounds fired inside Penetrant Wish count toward the 2 (cumulative strikes = ⌊in-window rounds / 2⌋)
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > DISCRIMINATING: an ungated counter is pre-charged by rounds fired outside the window
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > the Penetrant Wish status is opened by her burst, self, 10s
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > DISCRIMINATING: dropping the Penetrant Wish gate fires strikes outside the window
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > DISCRIMINATING: a fullBurstEnter-keyed Penetrant Wish opens the window on helm’s Full Bursts too
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > DISCRIMINATING: every normal attack (count 1) doubles the strikes
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > DISCRIMINATING: a plain (non-core) hit is not core-eligible
 ✓ scripts/tests/units/marian-queen.test.ts > P4 — Penetrant Wish (10s after her burst): every 2 normal attacks → 14.06% core strike > DISCRIMINATING: with no Open Wounds status on the boss the strikes never fire
 ✓ scripts/tests/units/marian-queen.test.ts > P5 — Penetrant Wish: Sharpened Resolve recurring interval ▼ 2 sec (4s → 2s) > inside the window the volley period is 120f
 ✓ scripts/tests/units/marian-queen.test.ts > P5 — Penetrant Wish: Sharpened Resolve recurring interval ▼ 2 sec (4s → 2s) > the reduction is a self skillCooldownReductionSec 2 for 10s on each cast
 ✓ scripts/tests/units/marian-queen.test.ts > P5 — Penetrant Wish: Sharpened Resolve recurring interval ▼ 2 sec (4s → 2s) > DISCRIMINATING: without the reduction every in-window gap stays 240f
 ✓ scripts/tests/units/marian-queen.test.ts > P6 — Full Burst entry branches on the Penetrant Wish state > IN Penetrant Wish (FB after her cast) → Core Damage ▲ 24.64% 10s, no Sequential buff
 ✓ scripts/tests/units/marian-queen.test.ts > P6 — Full Burst entry branches on the Penetrant Wish state > NOT in Penetrant Wish (FB helm completed) → Sequential Attack Damage ▲ 85.17% 10s, no Core buff
 ✓ scripts/tests/units/marian-queen.test.ts > P6 — Full Burst entry branches on the Penetrant Wish state > the Sequential buff lifts the spears’ Damage-Up term by 0.8517 in those Full Bursts
 ✓ scripts/tests/units/marian-queen.test.ts > P6 — Full Burst entry branches on the Penetrant Wish state > DISCRIMINATING: dropping the NOT-state gate grants the Sequential buff after her cast too
 ✓ scripts/tests/units/marian-queen.test.ts > P6 — Full Burst entry branches on the Penetrant Wish state > DISCRIMINATING: dropping the IN-state gate grants Core Damage on helm’s Full Bursts too
 ✓ scripts/tests/units/marian-queen.test.ts > P7 — burst: self ATK / Attack Damage 10s, 100% reload, 1346.4% nuke > the nuke lands on each cast frame: 1346.4%, burst bucket, no Full-Burst +50%
 ✓ scripts/tests/units/marian-queen.test.ts > P7 — burst: self ATK / Attack Damage 10s, 100% reload, 1346.4% nuke > self ATK ▲ 78.4% and Attack Damage ▲ 78.14% for 10s on each cast
 ✓ scripts/tests/units/marian-queen.test.ts > P7 — burst: self ATK / Attack Damage 10s, 100% reload, 1346.4% nuke > the magazine is full again right after each cast
 ✓ scripts/tests/units/marian-queen.test.ts > P7 — burst: self ATK / Attack Damage 10s, 100% reload, 1346.4% nuke > DISCRIMINATING: without the reload the first post-cast shot is not from a full magazine
 ✓ scripts/tests/units/marian-queen.test.ts > P7 — burst: self ATK / Attack Damage 10s, 100% reload, 1346.4% nuke > DISCRIMINATING: fullBurstEnter keying moves the nuke off the cast frame
 ↓ scripts/tests/units/marian-queen.test.ts > P8 — burst: Machine Gun Ramp-Up Speed ▲ 100% for 10 sec > GAP: no MG wind-up-speed modifier exists in the engine (docs/engine-modeling-gaps.md — MG ramp-up speed); the line is in `unmodeled`
 ✓ scripts/tests/units/marian-queen.test.ts > P8 — burst: Machine Gun Ramp-Up Speed ▲ 100% for 10 sec > the line is recorded verbatim in unmodeled.burst
      Tests  38 passed | 1 skipped (39)

Coverage note: the ownBurstGate:'notCast' proxy for 'while NOT in Penetrant Wish' and the requiresSelfStatus gate for 'while IN' are exact complements on this fixture (Penetrant Wish opens 22f before her own rotation's Full Burst and lasts 10s against a 40s cooldown); both directions are discriminated by the gate-removal counterfactuals in P6. The skipped case is the P8 GAP (MG Ramp-Up Speed — no engine wind-up-speed modifier).

S7 CONVERGENCE (S5 blind tests, claude-opus-5, run UNMODIFIED except the one-line onEvent→cfg wiring fix, against the shipped override):
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S1 — Dark Matter spears + Open Wounds > spear volleys land as skill1 function damage and recur all fight
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S1 — Dark Matter spears + Open Wounds > Open Wounds is a BOSS debuff — deleting it costs the TEAM damage, not just hers
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S1 — Dark Matter spears + Open Wounds > the second Open Wounds source is BURST CAST, not Full Burst entry
 ↓ blind/marian-queen.adapted.test.ts > marian-queen S1 — Dark Matter spears + Open Wounds > FLAG: volley fold (1×878.57 vs 7×125.51), Open-Wounds stacks-per-volley and its stack CEILING, plus the interval phase (first fire t=4s vs t=0) are all unobservable blind. The kit states no cap, and the fold decides how many times the per-hit rider can fire (1 vs 7) — uncapped 5.05% × 7 × ~55 volleys is +1900% Damage Taken, which cannot be right. Recipe: popup-read a focus recording for the per-volley stack gain and watch the debuff icon for a cap.
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the Penetrant Wish window > core rider recurs every 2 normal attacks and is confined to the 10s window
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the Penetrant Wish window > the rider is CORE STRIKE damage
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the Penetrant Wish window > the interval -2 sec line genuinely accelerates S1
 ↓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the Penetrant Wish window > FLAG: 'all enemies in the Open Wounds state' is scope-trivial in every fixture — the boss carries Open Wounds from the first volley (t~4s) and again from her own burst cast, so a requiresTargetStatus gate on the rider is unobservable. Authoring it is harmless and more faithful; its absence is not detectable here.
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the two FB-entry branches > exactly ONE branch fires per Full Burst
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the two FB-entry branches > solo (she is the only B3): core branch every FB, sequential branch never
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the two FB-entry branches > the Sequential buff is wired to real sequential-flavored damage
 ✓ blind/marian-queen.adapted.test.ts > marian-queen S2 — the two FB-entry branches > the Core Damage buff moves damage and is self-scoped
 ✓ blind/marian-queen.adapted.test.ts > marian-queen burst > self ATK / Attack Damage: raw percentages, once per own burst
 ✓ blind/marian-queen.adapted.test.ts > marian-queen burst > burst nuke: burst-slot instances, Full-Burst-major exempt
 ✓ blind/marian-queen.adapted.test.ts > marian-queen burst > the 100%-ammo reload is modeled — removing it costs rounds fired
 ✓ blind/marian-queen.adapted.test.ts > marian-queen burst > MG Ramp-Up Speed is not fudged as a 1:1 +100 fire-rate / attack-speed buff
 ↓ blind/marian-queen.adapted.test.ts > marian-queen burst > FLAG: 'Machine Gun Ramp-Up Speed +100%' has NO schema primitive — there is no MG spin-up stat, and fireRatePct / attackSpeedPct are a different mechanic. Belongs in unmodeled with a recipe: MG focus recording, time-to-max-RPM with and without her burst window, then model as the spin-up curve (or a measured fireRatePct equivalent over the ramp only).
 ↓ blind/marian-queen.adapted.test.ts > marian-queen burst > FLAG: burstDesc:'allEnemies' on the 1346.4% nuke (its clause is 'Affects all enemies') is unobservable without a burstSkillAoeDamagePct carrier (jackal / trina) in the fixture; authorable and recommended, but untestable in controlComp.
      Tests  14 passed | 4 skipped (18)
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — marian-queen (Marian: Queen) — kit-autonomy gauntlet 2026-10-29

Driver: Claude Opus 5.5. Tier 2 (Penetrant Wish self-status gate splitting the Full-Burst-entry line
into two state branches; burstCast-vs-fullBurstEnter identity on Penetrant Wish and the burst-use
Open Wounds; a boss status gating the core strike). Claude-only routing (owner 2026-10-02): S2b
claude-fable-5 + claude-fable-5-1, S5/S6 claude-opus-5, S7 claude-fable-5-1 (binding) + claude-fable-5
— same-family evidence only.

## Engine change

None. Every line except MG Ramp-Up Speed maps onto an existing primitive:
`interval` + `skillCooldownReductionSec` (dorothy's Manifestation precedent — the reduction applies to
all of the owner's interval blocks; she has exactly one), `targetStatus` + `requiresTargetStatus`,
`selfStatus` + `requiresSelfStatus`, `hitCount` with `countScope: 'gated'`, `ownBurstGate: 'notCast'`,
`instantReload`, `flatDamage core:true` (the cinderella-crystal-wave "core strike damage" precedent).

## S2c reconciliation (driver vs the two S2b reviewers)

- Converged on every disposition, every trigger identity and the load-bearing set (12/13 lines; the
  MG Ramp-Up Speed line is the shared GAP).
- **Divergence 1 — counting scope of "Activates after performing 2 normal attacks".** Both S2b
  reviewers (and later S6) read it as a count belonging to the Penetrant Wish state (`countScope:
'gated'`); the driver's first override had the default ungated counter. Resolved toward the prose:
  `countScope: 'gated'` landed (commit cda7986b) and is pinned by the cumulative ⌊in-window rounds/2⌋
  assertion + the ungated-counter counterfactual.
- **Divergence 2 — "core strike damage" rate.** claude-fable-5-1 reads it as a guaranteed core hit
  (rate 1.0); the engine's `flatDamage core:true` resolves at the weapon's core rate × core exposure
  (0.95 for her MG on the control comp). Kept on the repo precedent (docs/modeling-priors.md #2,
  cinderella-crystal-wave) and carried as ⚑3 in the override with an estimate + recipe — `flatDamage`
  has no guaranteed-core field, and adding one is a damage-formula engine change outside this run's
  scope.

## S6 blind override vs the driver override

Structurally identical except:

- spears: one merged `flatDamage 878.57 gaugeHits 7` vs seven `125.51` hits — damage-identical in the
  deterministic sim (expected-value crit), identical gauge credit (7). The driver's split form is the
  literal "Attacks sequentially 7 times" and places the Open Wounds application after the first landed
  spear (only the first volley of the fight is affected).
- IN-state branch: S6 `ownBurstGate: 'cast'`, driver `requiresSelfStatus: 'Penetrant Wish'` — the same
  frames on every fixture (her cast leads her own Full Burst by 22f; the window is 10s; cooldown 40s).
- S6 adds `perPull: true` (degenerate: MG hitsPerShot 1) and `fraction: 1` on instantReload (the
  default) and names the status "Into the Fray: Penetrant Wish" (name only).

## Convergence (mechanical)

S5 blind tests (claude-opus-5) run against the shipped override after a one-line harness wiring fix
(`onEvent` moved into `cfg`, which `runComp` reads — no assertion changed): **14 passed / 4 FLAG
skips**. Saved as scripts/kit-autonomy/blind/marian-queen.adapted.test.ts; output in
reviews/marian-queen.verify.txt.

## Fire-rate / modeled≠working observations (control comp liter / crown / marian-queen / helm, boss Fire)

- 6 own casts (frames 322, 2374, 4367, 6277, 8157, 10068); helm completes the other 5 Full Bursts.
- Spear volleys: first at frame 240, every 240f outside Penetrant Wish, every 120f inside it (P1/P5).
- Core strikes: 1317 over the fight, ~220 per window = ⌊in-window rounds/2⌋ (P4), coreRate 0.95.
- Damage split: normals ≈ 500M, spears ≈ 443M, core strikes ≈ 431M, burst nuke ≈ 67M; unit total
  ≈ 1.44B. No recording exists, so magnitude is unvalidated (out of scope for the gauntlet).
