# S7 RECONCILING-JUDGE PACKET — `aigis` (Aigis, SMG/Supporter/Iron/Burst II)

Built 2026-09-04 by scripts/kit-autonomy/build-judge-packet.ts. Sections: 1 contract · 2 mechanics SSOT · 3 ground truth · 4 S2b review(s) · 5 S5 blind test · 6 S6 blind override · 7 driver implementation · 8 S2d matrix + driver notes.

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

## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, verbatim)

```json
{
  "slug": "aigis",
  "name": "Aigis",
  "weapon": "SMG",
  "burst": "II",
  "class": "Supporter",
  "element": "Iron",
  "manufacturer": "Abnormal",
  "burstCooldownSec": 20,
  "ammo": 120,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 2,
  "normalAttackMultiplier": 10.12,
  "coreAttackMultiplier": 250,
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  }
}
```

### skill1

```text
■ Activates at the start of battle. Affects self.
Persona - Palladion: This effect is continuous and cannot be removed.
Function: Aigis strengthens herself using her Persona.
Effect 1: Tarukaja: ATK ▲ 21.12% continuously. This effect cannot be removed.
Effect 2: Rakukaja: DEF ▲ 21.12% continuously. This effect cannot be removed.
```

### skill2

```text
■ Activates when using Burst Skill as long as this unit is still alive.
Papillon Heart: This effect is continuous and cannot be removed.
Function: Aigis strengthens her allies.
Effect 1: Affects all allies. Matarukaja: ATK ▲ 21.12% of the skill user's ATK continuously. This effect cannot be removed.
Effect 2: Affects all allies. Marakukaja: DEF ▲ 21.12% of the skill user's DEF continuously. This effect cannot be removed.
Deactivation condition: When Full Burst ends.
```

### burst

```text
■ Affects all enemies.
Deals 396% of final ATK as distributed damage.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (kimi-code/k3, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "aigis",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle; self; ATK ▲21.12% continuous",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK buff (not normal-attack / crit scoped)",
      "durationSemantics": "continuous/permanent from frame 0 ('continuous and cannot be removed') — passive or battleStart with no lapse; NEVER a timed durationSec",
      "triggerIdentity": "battleStart (or passive) — fires once at frame 0; no re-trigger source exists in the kit",
      "targetSet": "self only",
      "nearestWrongModel": "encoded as a timed self buff (durationSec ~10) or as an allies-wide atkPct (carrying skill2's target onto skill1)",
      "distinguishingAssertion": "exactly one buffApply at frame ~0 with stat 'atkPct', value 21.12, casterIdx===targetIdx===aigis's index, expiresFrame ≥ fight end (or absent); no buffApply on any other unit for this key; no second application later in the fight",
      "inertness": "must not appear on allies; must not re-fire on her burstCast or fullBurstEnter",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Rakukaja: DEF ▲21.12% continuously (self)",
      "disposition": "FAITHFUL",
      "scope": "self DEF — offensively inert in v1 (defPct moves no damage) but kept per the keep-inert-stat rule",
      "durationSemantics": "continuous/permanent, same as the paired ATK line",
      "triggerIdentity": "battleStart/passive at frame 0",
      "targetSet": "self only",
      "nearestWrongModel": "dropped silently because defPct is inert; or mis-encoded as damageTakenPct on the boss (a very different, damage-bearing debuff)",
      "distinguishingAssertion": "buffApply at frame ~0 with stat 'defPct', value 21.12, target aigis; totals(res) unchanged vs an override without this block (pure inertness pin)",
      "inertness": "must not emit any boss-side debuff event (casterIdx===null buffApply) and must not move any unit's totalDamage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "on own Burst use; all allies; ATK ▲21.12% of caster ATK",
      "disposition": "FAITHFUL",
      "scope": "generic ally ATK grant, flat-resolved off the skill user's ATK",
      "durationSemantics": "'continuously… cannot be removed' BUT 'Deactivation condition: When Full Burst ends' — window = her burst cast → the ensuing Full Burst end. A durationSec ~10 stand-in is a ⚑ approximation of the FB window; permanent is WRONG, a short fixed seconds window that outlives or undershoots FB is WRONG",
      "triggerIdentity": "burstCast (stage 2) — 'when using Burst Skill' keyed to HER OWN cast; NOT fullBurstEnter (any team FB) and NOT stageCast-anyone. 'As long as this unit is still alive' is scope-trivial in v1 (no deaths)",
      "targetSet": "all allies INCLUDING self (no excludeSelf in the prose; she is an ally); value = 0.2112 × aigis.staticAtk flat at apply time, same flat number on every target",
      "nearestWrongModel": "fullBurstEnter trigger (over-credits on rotations where the OTHER B2 in the comp casts and aigis never bursts) and/or raw atkPct 21.12 instead of caster-scaled flat casterAtkPct; also excludeSelf:true",
      "distinguishingAssertion": "in a comp where a DIFFERENT Burst II unit casts every rotation (aigis benched from bursting): ZERO buffApply events with casterIdx===aigis and stat 'casterAtkPct' — red under a fullBurstEnter model. In a comp where aigis casts: buffApply keyed skill2 with stat 'casterAtkPct', value ≈ 0.2112×aigis.staticAtk (flat, NOT 21.12), one per ally including targetIdx===aigis, landing at the burstCast frame — strictly BEFORE the fullBurstStart frame; expiresFrame consistent with the FB-end deactivation (≈ fullBurstEnd frame), not infinite",
      "inertness": "must not fire on team Full Bursts she did not open; must not refresh/stack across her successive casts beyond one active instance per window; must not alter her skill1 self atkPct",
      "evidenceTier": "DATAMINED (magnitude) / CALIBRATED ⚑ (FB-window duration stand-in)",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Marakukaja: DEF ▲21.12% of caster DEF, allies",
      "disposition": "UNMODELED",
      "scope": "ally DEF grant scaled off caster DEF — schema has no caster-scaled DEF StatKey (defPct is self-only and inert); offensively inert in v1 regardless",
      "durationSemantics": "same burst→FB-end window as the paired ATK line",
      "triggerIdentity": "burstCast stage 2, same block as Matarukaja",
      "targetSet": "all allies including self",
      "nearestWrongModel": "encoded as defPct 21.12 on allies (wrong basis: that's %-of-target's-own-DEF, not of the caster's) or as a boss damageTakenPct debuff",
      "distinguishingAssertion": "no event-log assertion possible (no stat key); faithfulness pin is presence of the verbatim line in unmodeled.skill2 with a note — its ABSENCE from unmodeled while also absent from blocks is the failure",
      "inertness": "must not move any totalDamage; must not create a boss-held debuff event",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Affects all enemies; 396% final ATK distributed",
      "disposition": "FAITHFUL",
      "scope": "one instant burst-cast hit, distributed flavor; burstDesc 'allEnemies' tag for the burst-amp family",
      "durationSemantics": "n/a — instant damage on cast",
      "triggerIdentity": "burstCast stage 2 (her own cast). Burst-cast instant damage lands BEFORE the Full Burst window opens → FB-exempt (noFb / fbMajorApplied false); range bonus OFF on the rider",
      "targetSet": "enemy (all-enemies distributed; engine collapses to the single boss)",
      "nearestWrongModel": "allowed to take the +50% Full-Burst major (fbMajorApplied true) and/or the +30% range bonus; or flavor omitted so distributedDamagePct / burstSkillAoeDamagePct interactions can't resolve; or re-keyed to fullBurstEnter so it fires on FBs she didn't open and double-dips the window",
      "distinguishingAssertion": "exactly one damage event per aigis burstCast with bucket 'burst', srcSlot 'burst', mult 396, inFullBurst false AND fbMajorApplied false AND rangeApplied false; zero burst-bucket damage events from aigis in rotations where another B2 cast (red under fullBurstEnter keying)",
      "inertness": "must not generate repeated ticks (not a DoT), must not fire more than once per cast, must not move teammates' totals",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Tarukaja self atkPct 21.12 permanent",
    "skill2:Matarukaja casterAtkPct 21.12%-of-aigis-ATK to all allies, burstCast-gated, FB-end expiry",
    "burst:396% distributed flatDamage, FB-exempt, range-exempt"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Effect 2: Affects all allies. Marakukaja: DEF ▲ 21.12% of the skill user's DEF continuously. This effect cannot be removed."
    ],
    "burst": []
  },
  "notes": "Two shared-prior misreads are likely and must be reconciled: (1) skill2 trigger — 'Activates when using Burst Skill' is her OWN burstCast(stage 2), not fullBurstEnter; the controlComp B2 slot (crown) creates exactly the divergence case, so a test where aigis never casts but Full Bursts still happen is mandatory — under the wrong keying her skill2 fires every rotation. (2) Duration — the line says BOTH 'continuous, cannot be removed' AND 'Deactivation condition: When Full Burst ends'; a permanent buff (over-credit past the first window) and a generic durationSec:10 (decoupled from actual fullBurstEnd) are both wrong; whatever stand-in is used for the FB window is ⚑ CALIBRATED and should be asserted via expiresFrame ≈ fullBurstEnd frame since the engine emits no buffRemove on lapse. Also watch: Matarukaja is caster-scaled — buffApply value must be the flat 0.2112×staticAtk number, not 21.12 — and 'Affects all allies' includes self (no excludeSelf). Burst is a pre-FB cast hit: inFullBurst/fbMajorApplied must be false; Iron-vs-Fire boss gives no advantage so element ×1.10 is absent in the control fixture. Marakukaja (ally DEF of caster DEF) has no StatKey and belongs verbatim in unmodeled.skill2 — do NOT let it be silently dropped or proxied as defPct. If the driver marked any of the three load-bearing lines UNMODELED/non-load-bearing, that is a dispute to surface, not accept.",
  "model": "kimi-code/k3"
}
```

### 4b. Second S2b reviewer (claude-opus-5, blind — Tier-2 ×2 models)

```json
{
  "slug": "aigis",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Activates at start of battle; self",
      "disposition": "FAITHFUL",
      "scope": "Whole-fight, unscoped (not normal-attack/charge/crit scoped). Self only.",
      "durationSemantics": "Permanent/continuous — no durationSec, no stacks, no round count. 'cannot be removed' is flavor (no dispel model in sim).",
      "triggerIdentity": "battleStart (fires once at frame 0) or passive — byte-equivalent here because there is no durationSec. No gate.",
      "targetSet": "self",
      "nearestWrongModel": "Authoring battleStart WITH a durationSec (e.g. 10s or 60s), so the 'continuously' buff lapses mid-fight; or widening 'Affects self' to allies because skill2 grants the same 21.12% team-wide (the two lines are twins in magnitude, one self, one team).",
      "distinguishingAssertion": "Collect buffApply where targetSlug==='aigis' && stat==='atkPct' && value===21.12: exactly ONE, at frame 0, with expiresFrame >= the sim's final frame (or undefined/Infinity). Assert no ally (liter/crown/helm) ever receives a buffApply with stat==='atkPct' && value===21.12.",
      "inertness": "Must not fire again on any burstCast/fullBurstStart; must not touch any non-aigis targetIdx; must not create a second stack.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Rakukaja: DEF ▲21.12% continuously",
      "disposition": "FAITHFUL",
      "scope": "Self DEF, unscoped. Damage-inert in v1 (defPct is a declared no-op stat) but must still be ENCODED — taxonomy rule 7 (keep the stat for future consumers/scalers) and no-silent-drops.",
      "durationSemantics": "Permanent/continuous, same block as Tarukaja.",
      "triggerIdentity": "Same battleStart/passive self block as Effect 1 — one block, two buff effects.",
      "targetSet": "self",
      "nearestWrongModel": "Dropped entirely as 'defensive, no damage' (the recurring skip-defensive misread) — leaving no record and no future scaler feed; or routed to maxHpPct/atkOfMaxHpPct as if DEF converted to offense (it does not, nothing in this kit reads DEF).",
      "distinguishingAssertion": "Assert a buffApply exists with targetSlug==='aigis' && stat==='defPct' && value===21.12 at frame 0. Separately assert damage inertness: totals(res) is byte-identical with and without that effect via withPatchedOverride (proving it is encoded-but-inert, not encoded-and-leaking).",
      "inertness": "Must move ZERO damage for any unit; must not be encoded as any offensive stat.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ when using Burst Skill (self alive)",
      "disposition": "FAITHFUL",
      "scope": "Activation clause only — fires on AIGIS'S OWN burst cast. She is Burst II, so this is her stage-2 cast, which PRECEDES Full Burst by the chain gap (B2 cast → 30f → B3 cast → 22f → FB start ≈ 52f / 0.87s).",
      "durationSemantics": "Trigger-level: instantaneous fire per own cast (once per rotation she bursts).",
      "triggerIdentity": "trigger {kind:'burstCast'} — NOT fullBurstEnter, NOT stageCast{stage:2} (any ally's stage-2 cast), NOT stageEnter{stage:2}. 'as long as this unit is still alive' is scope-trivial (nobody dies at scope lock).",
      "targetSet": "Block target {kind:'allies'} — 'all allies' includes self (no 'except self' clause).",
      "nearestWrongModel": "Keying to fullBurstEnter (or ownBurstGate:'cast' + fullBurstEnter). This is the single highest-probability shared misread: it looks equivalent in a comp where she is the only B2, but it (a) starts the buff ~0.87s LATE, so every burst-cast damage instance that lands pre-FB (the B3 carry's own burst nuke, which is FB-exempt and lands before the window opens) misses the ATK buff, and (b) over-fires on any team Full Burst she did not complete.",
      "distinguishingAssertion": "Record the frame of the burstCast event with srcSlot/slug 'aigis' (fBC) and the frame of fullBurstStart (fFB). Assert every buffApply with casterIdx===aigis's index && stat==='casterAtkPct' has frame === fBC and frame < fFB (strictly BEFORE full burst starts). Under the fullBurstEnter misread the apply frame equals fFB — RED.",
      "inertness": "No apply at frame 0; no apply on a Full Burst in a rotation where aigis did not cast; exactly one apply per own cast per target.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "all allies: ATK ▲21.12% of user's ATK",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK (not normal-attack/charge scoped). CASTER-SCALED: '21.12% OF THE SKILL USER'S ATK' — a flat add derived from aigis's ATK, uniform across targets.",
      "durationSemantics": "'continuously' + 'Deactivation condition: When Full Burst ends' → a window, not permanent and not a round count. See the deactivation row.",
      "triggerIdentity": "burstCast (own cast) — inherits the block trigger above.",
      "targetSet": "allies including self (5 buffApply events per cast: aigis + 4).",
      "nearestWrongModel": "stat 'atkPct' 21.12 (scales each TARGET'S own ATK) instead of 'casterAtkPct'. Aigis is a Supporter (static ATK 98,367); the carry is typically an Attacker (118,027). atkPct over-credits the Attacker by ~(118,027−98,367)×0.2112 ≈ 4,152 ATK and under-credits a lower-ATK ally — a silent per-unit magnitude error that a total-damage eyeball will not catch.",
      "distinguishingAssertion": "Assert each buffApply for this line has stat==='casterAtkPct' and value === closeTo(0.2112 × aigis.staticAtk, ~1e-6) — i.e. a FLAT ATK number in the ~20.8k range, NOT the raw 21.12 (harness rule: caster-scaled values are flat-resolved at apply time). Assert the SAME value is emitted for every targetIdx (uniform), which the atkPct misread cannot produce. Assert exactly 5 targets (self included) per cast.",
      "inertness": "Must not also emit an atkPct 21.12 to allies (double-book with skill1's self line); the self-target instance must be a SECOND, distinct buff key from skill1's self atkPct, not a refresh of it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "all allies: DEF ▲21.12% of user's DEF",
      "disposition": "GAP",
      "scope": "Caster-DEF-scaled team DEF grant. The StatKey union has NO casterDefPct — only plain 'defPct' (declared inert in v1). There is no faithful primitive for '% of the skill user's DEF' granted to allies.",
      "durationSemantics": "Same FB-end-bounded window as the ATK twin.",
      "triggerIdentity": "burstCast (own cast), same block.",
      "targetSet": "allies including self.",
      "nearestWrongModel": "Either (a) silently dropped as defensive, leaving no audit record, or (b) 'approximated' by mapping it onto an OFFENSIVE stat because the ATK twin next to it is offensive. Also plausible: encoding it as casterAtkPct by copy-paste from the line above — which would DOUBLE the team ATK grant.",
      "distinguishingAssertion": "Assert the count of buffApply with stat==='casterAtkPct' && casterIdx===aigis is exactly 5 per own cast (one per ally), NOT 10 — this catches the copy-paste double-book. If encoded as defPct 21.12 to allies, assert damage inertness by withPatchedOverride removal (totals byte-identical); otherwise it must appear verbatim in unmodeled.skill2.",
      "inertness": "Zero damage movement for any unit under any encoding choice.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Deactivation: When Full Burst ends",
      "disposition": "GAP",
      "scope": "Window bound on the whole Papillon Heart block. The engine has a fullBurstEnd TRIGGER but no 'remove this buff at FB end' effect, so the window must be approximated by durationSec measured FROM HER CAST FRAME.",
      "durationSemantics": "NOT permanent, NOT 'continuously'-as-whole-fight, NOT round-scoped. Live span = (own B2 cast → FB start) + FB length ≈ 0.87s + 10s ≈ 10.87s at nominal chain timing. A flat durationSec:10 truncates the last ~52 frames of Full Burst.",
      "triggerIdentity": "Applied on burstCast; expiry is an authored durationSec ⚑, not a real deactivation hook.",
      "targetSet": "allies (all five instances share the window).",
      "nearestWrongModel": "Two symmetric misreads: (1) reading 'continuously / cannot be removed' as PERMANENT and omitting durationSec entirely — the team ATK buff then persists through the whole ~20s cooldown gap, roughly doubling its uptime; (2) durationSec:10 taken from the nominal FB length, which starts the clock at the CAST rather than at FB start and so clips ~0.87s off the end of the FB window (the highest-value slice of the fight).",
      "distinguishingAssertion": "From the buffApply, read expiresFrame; capture fullBurstEnd's frame (fEnd). Assert expiresFrame >= fEnd AND expiresFrame <= fEnd + ~10 frames — green only for a duration that spans cast→FB-end. The permanent misread gives expiresFrame >= final frame (or undefined) — RED; the durationSec:10 misread gives expiresFrame ≈ fEnd − 52 — RED. Also assert the buff is NOT active at a probe frame midway between fEnd and the next burstCast.",
      "inertness": "Must be inert during the post-FB cooldown gap; must not extend past the FB it belongs to.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ Affects all enemies",
      "disposition": "FAITHFUL",
      "scope": "Target clause for the burst damage line.",
      "durationSemantics": "Instantaneous — no window.",
      "triggerIdentity": "burstCast, burst slot (the burst block's own cast).",
      "targetSet": "enemy (single boss at scope lock, so 'distributed across all enemies' resolves to the full amount on one target).",
      "nearestWrongModel": "Tagging burstDesc:'allEnemies' reflexively — that tag exists ONLY to feed the jackal/trina Burst-Skill-Damage amplifier family; adding it here is harmless in the control comp but is a live over-credit the moment such an amp is present, and it is not what the clause means.",
      "distinguishingAssertion": "Assert the burst damage event carries bucket 'burst' and that the override's burst flatDamage has no burstDesc field (inspection) — or, behaviourally, that totals are unchanged when the tag is stripped in the control comp (proving no amp present) while the encoding stays untagged.",
      "inertness": "No ally-facing effect from this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "396% of final ATK, distributed damage",
      "disposition": "FAITHFUL",
      "scope": "One instant hit at cast, % of aigis's FINAL ATK (so it reads her own skill1 +21.12% and any team buffs live at cast). 'distributed' flavor → reads distributedDamagePct amps.",
      "durationSemantics": "Instantaneous.",
      "triggerIdentity": "burstCast, target enemy; lands PRE-Full-Burst (burst-cast damage always resolves before the FB window opens — no +50% FB major, no entry auras).",
      "targetSet": "enemy",
      "nearestWrongModel": "Authoring core:true and/or crit:true and/or letting it take the +30% range bonus, on the intuition that a big burst nuke should core — the kit says nothing about core strike, so it gets no core; and the FB-exempt/pre-FB timing is easy to lose by attaching the damage to a fullBurstEnter block instead, which would silently hand it the +50% Full-Burst major.",
      "distinguishingAssertion": "On the burst damage event assert: bucket==='burst', inFullBurst===false && fbMajorApplied===false (pre-FB resolution), core rate contribution 0 (no core bucket), rangeApplied===false, mult.charge===1, and flavor 'distributed'. Assert atkPct===396 by inspection with levelScale/levelConst handled. The fullBurstEnter misread flips fbMajorApplied to true — RED.",
      "inertness": "Must fire exactly once per rotation in which aigis casts, never on a rotation where another B2 takes stage 2.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Tarukaja ATK ▲21.12% self, battleStart, permanent, stat atkPct",
    "skill1:Rakukaja DEF ▲21.12% self, encoded-but-damage-inert (defPct)",
    "skill2:trigger identity = own burstCast (pre-FB), NOT fullBurstEnter",
    "skill2:Matarukaja = casterAtkPct 21.12 (flat-resolved off aigis's ATK), allies incl. self, 5 applies",
    "skill2:window = own cast → Full Burst end (durationSec ≈ 10.87s ⚑), not permanent, not 10.0s",
    "burst:396% final ATK, distributed flavor, pre-FB (no FB major), no core, no range",
    "burst:Affects all enemies — untagged (no burstDesc amp scope)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Persona - Palladion: This effect is continuous and cannot be removed.",
      "Function: Aigis strengthens herself using her Persona.",
      "This effect cannot be removed. (no dispel/cleanse mechanic exists in the sim)"
    ],
    "skill2": [
      "Papillon Heart: This effect is continuous and cannot be removed.",
      "Function: Aigis strengthens her allies.",
      "as long as this unit is still alive (scope-trivial — nobody dies at scope lock)",
      "Marakukaja: DEF ▲ 21.12% of the skill user's DEF continuously. (no casterDefPct StatKey exists; damage-inert either way)"
    ],
    "burst": []
  },
  "notes": "HARNESS HAZARD — READ BEFORE TRUSTING ANY GREEN: aigis is BURST II, and controlComp is liter B1 / crown B2 / carry B3 / helm B3. Passing aigis as the `carry` puts a Burst-II unit in a Burst-III slot, and crown already occupies stage 2 — so aigis may cast her burst on NO rotation at all. Every skill2 and burst assertion above then passes vacuously against an empty event set (or fails for the wrong reason). The test MUST first assert `events.filter(e => e.kind==='burstCast' && <slug is aigis>).length >= 2` as a guard, and the fixture must remove/replace the competing B2 (patch crown out, or use a comp where aigis is the sole stage-2 caster). This is the same failure shape as the standing 'a lone B3 makes ZERO full bursts' rule, one tier up: a SECOND same-tier unit silently steals the cast. I expect this to be the driver's likeliest structural miss, ahead of any per-line misread.\n\nSHARED-PRIOR MISREADS I expect the driver to make: (1) fullBurstEnter for skill2 — the two triggers coincide in a single-B2 comp on damage TOTALS but diverge by ~52 frames, and that gap is exactly where the B3's FB-exempt burst-cast damage lands, so the error hides behind an aggregate ratio; (2) atkPct instead of casterAtkPct — the kit's 'of the skill user's ATK' is easy to skim past when skill1's self line one paragraph earlier IS a plain atkPct with the identical 21.12 magnitude; the two lines being twins in number is the trap. (3) 'continuously ... cannot be removed' read as permanent, with the 'Deactivation condition: When Full Burst ends' line — which sits BELOW the effects and reverses them — dropped as boilerplate. Any two of these three compound: a permanent fullBurstEnter-keyed atkPct grant would inflate the whole team for the entire fight while still looking like a plausible support kit.\n\nGAPS the driver must reconcile explicitly rather than paper over: (a) no casterDefPct primitive for Marakukaja; (b) no 'remove at Full Burst end' effect, so the window is a ⚑ CALIBRATED durationSec measured from her CAST frame, and it is composition-sensitive — any teammate with fullBurstExtend (or a boss transition shifting the chain) lengthens the real FB and a fixed durationSec then under-runs. State the ⚑ with the derivation (chain gap 52f + FB 10s ≈ 10.87s) and the recipe (read her buff's live span off a focus recording, or assert against fullBurstEnd in the test) rather than shipping a bare 10.\n\nEVIDENCE: every magnitude here (21.12, 21.12, 396) is literal kit prose — DATAMINED, no measurement gate. The only ⚑ in the unit is the FB-end window duration. Nothing in this kit touches weapon state, ammo, fire rate, DoT, stacks, pierce, or core, so the cadence/⚑ families in the methodology are all inapplicable — do NOT invent a hitCount or interval rider; there is no untriggered damage line anywhere in this kit.",
  "model": "claude-opus-5"
}
```

## 5. S5 BLIND TEST-WRITER (claude-opus-5, blind — written from the prose alone)

### 5a. blind spec

```json
{
  "slug": "aigis",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Activates at the start of battle / self",
      "disposition": "FAITHFUL",
      "assertion": "Every 21.12-valued atkPct/defPct application targets aigis and only aigis; zeroing the ATK line drops her total and leaves teammates byte-identical. Fails under an allies-scoped S1 (teammates would move)."
    },
    {
      "slot": "skill1",
      "kitLine": "Tarukaja: ATK ▲ 21.12%",
      "disposition": "FAITHFUL",
      "assertion": "buffApply stat atkPct value 21.12 on aigis, and the counterfactual zeroing it strictly lowers her damage. Fails under a caster-scaled or dead encoding (no 21.12 percentage emitted, or no damage delta)."
    },
    {
      "slot": "skill1",
      "kitLine": "Rakukaja: DEF ▲ 21.12%",
      "disposition": "FAITHFUL (inert)",
      "assertion": "defPct 21.12 recorded on self for kit completeness AND zeroing every defPct leaves all five totals identical. Fails under a dropped DEF line (no event) or a DEF line wired to a damage path (totals move)."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when using Burst Skill",
      "disposition": "FAITHFUL",
      "assertion": "The grant appears in the event stream before the first fullBurstStart (a cast precedes FB entry by the chain gap); the patched fullBurstEnter build lands it AFTER, proving the probe discriminates. Fails under full-burst-enter keying, which over-credits rotations another unit completes."
    },
    {
      "slot": "skill2",
      "kitLine": "Affects all allies. Matarukaja",
      "disposition": "FAITHFUL",
      "assertion": "One uniform-valued application per ally per cast, target set == the whole comp and includes aigis. Fails under self-only, allies-except-self, or a top-ATK-ally target set (set size / membership wrong)."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲21.12% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "assertion": "Emitted under stat casterAtkPct with a FLAT-resolved value (>1000, never 21.12), identical across targets. Fails under target-scaled atkPct 21.12 (wrong stat, and each ally would scale off its own ATK)."
    },
    {
      "slot": "skill2",
      "kitLine": "Deactivation: when Full Burst ends",
      "disposition": "MEASUREMENT-GATED (⚑ duration)",
      "assertion": "Two-sided bound: a permanent (999s) variant strictly beats the shipped model and a 0.5s variant strictly loses to it, so the window is finite and non-trivial. Fails under the 'continuously / cannot be removed' misreading as whole-fight permanence. ⚑ The exact seconds are not in the kit — the faithful window is her stage-2 cast → FB end (chain gap + 22f + the 10s FB), so the authored durationSec is an estimate, not a kit value."
    },
    {
      "slot": "skill2",
      "kitLine": "Marakukaja: DEF of skill user",
      "disposition": "GAP",
      "assertion": "it.skip — no casterDefPct StatKey exists (defPct is target-scaled and offensively inert), so an ally DEF grant scaled off the caster's DEF is inexpressible and damage-neutral at scope."
    },
    {
      "slot": "skill2",
      "kitLine": "as long as this unit is still alive",
      "disposition": "UNMODELED (scope-trivial)",
      "assertion": "No assertion — the v1 boss deals no damage, so nobody dies and the clause is unconditionally satisfied."
    },
    {
      "slot": "burst",
      "kitLine": "Deals 396% of final ATK",
      "disposition": "FAITHFUL",
      "assertion": "zero / shipped / doubled atkPct are linear ((2x - 1x)/(1x - 0x) == 1), so the hit is a plain percent-of-final-ATK instance with no extra term, and doubling it moves no teammate. Fails under a folded/bucketed encoding carrying additional multipliers."
    },
    {
      "slot": "burst",
      "kitLine": "as distributed damage",
      "disposition": "FAITHFUL",
      "assertion": "Injecting a self-only distributedDamagePct buff lifts aigis's total and nobody else's — only possible if the burst hit carries the distributed flavor. Fails under an untagged flatDamage (no delta)."
    },
    {
      "slot": "burst",
      "kitLine": "Affects all enemies",
      "disposition": "UNMODELED (scope-trivial)",
      "assertion": "Single partless boss in v1 — AoE vs single-target is unobservable; recorded only as the burstDesc-style scope tag, no damage consequence."
    },
    {
      "slot": "burst",
      "kitLine": "burst-cast timing (pre-FB)",
      "disposition": "FAITHFUL",
      "assertion": "Every burst-bucket damage event carries inFullBurst false, matching the verified fact that burst-cast damage lands before the FB window opens (no +50% major, no entry auras). Fails if the burst hit were scheduled at/after FB start."
    }
  ],
  "fixtures": "controlComp('aigis', true) only — liter B1 / crown B2 / aigis / helm B3. aigis is a Burst II, so the fixed B3 slot is REQUIRED for the chain to reach Full Burst at all, and crown (also B2) means aigis takes stage 2 only on rotations crown is on cooldown — hence the explicit non-vacuity gate asserting her S2 actually fired and a Full Burst actually happened before any S2 claim is judged. 9 hoisted 180s runs: base, S1-ATK-zeroed, all-defPct-zeroed, S2 permanent (999s), S2 short (0.5s), S2 re-triggered to fullBurstEnter, burst atkPct zeroed, burst atkPct doubled, and a self-only distributedDamagePct probe.",
  "gaps": [
    "it.skip — skill2 Marakukaja 'DEF ▲21.12% of the skill user's DEF': no caster-scaled DEF primitive exists (no casterDefPct StatKey; defPct is target-scaled and offensively inert in v1), so the line cannot be encoded faithfully and moves no damage either way.",
    "No assertion for skill2's 'as long as this unit is still alive' — no HP pool / no boss damage at scope lock, so the clause is unconditionally true and unobservable.",
    "No assertion for the burst's 'Affects all enemies' AoE scope — single partless boss, unobservable in v1.",
    "The S2 window length is a ⚑: the kit gives a deactivation EVENT ('when Full Burst ends'), not a duration, and the engine has no full-burst-end removal primitive — the test bounds the window on both sides rather than pinning seconds."
  ],
  "model": "claude-opus-5"
}
```

### 5b. blind test source (VERBATIM — mechanical defects preserved; see section 8 for the run against the driver's override)

```ts
/**
 * aigis — per-unit kit spec, authored BLIND from the kit prose alone (S5 cross-family).
 *
 * KIT (prose, L10):
 *   S1 Persona - Palladion — 'Activates at the start of battle. Affects self.' Continuous, cannot
 *     be removed. Tarukaja: ATK ▲21.12%. Rakukaja: DEF ▲21.12%.
 *   S2 Papillon Heart — 'Activates when using Burst Skill as long as this unit is still alive.'
 *     Affects ALL ALLIES: Matarukaja ATK ▲21.12% OF THE SKILL USER'S ATK; Marakukaja DEF ▲21.12%
 *     of the skill user's DEF. Deactivation condition: when Full Burst ends.
 *   Burst — Affects all enemies. Deals 396% of final ATK as distributed damage.
 *   Base: SMG/Iron/Supporter/Burst II, cd 20s, ammo 120, hitsPerShot 2.
 *
 * FIXTURE: controlComp('aigis', true) — liter B1 / crown B2 / aigis / helm B3, so the chain
 * completes and aigis (a Burst II) actually gets stage-2 casts. A lone B3 (or a chain with no B3)
 * makes ZERO Full Bursts and every S2 assertion here would be vacuous, so the first test asserts
 * the fixture really exercises both her burst cast AND a Full Burst before anything else runs.
 *
 * WHY EACH ASSERTION DISCRIMINATES (nearest-wrong model in brackets):
 *  - S1 scope: every atkPct/defPct application at 21.12 must land on aigis ONLY [allies-scoped S1].
 *  - S1 liveness + basis: zeroing her S1 ATK drops HER damage and leaves every teammate
 *    byte-identical — which also pins the S2 caster-scaling to STATIC ATK [effective-ATK basis,
 *    where an S1 change would ripple into the team grant].
 *  - S2 stat identity: 'of the skill user's ATK' must emit as casterAtkPct, FLAT-resolved
 *    (a large ATK number), not the raw 21.12 percentage [target-scaled atkPct 21.12].
 *  - S2 trigger identity: her grant must appear in the event stream BEFORE the first
 *    fullBurstStart, because a burst CAST precedes FB entry by the chain gap. The same probe is
 *    run against a patched fullBurstEnter build to prove it has discriminating power (there the
 *    grant lands AFTER the FB opens) [full-burst-enter keying, which over-credits every rotation
 *    some OTHER unit completes the chain].
 *  - S2 duration: 'Deactivation condition: when Full Burst ends' bounds the window on BOTH sides —
 *    a permanent variant must beat the shipped model and a 0.5s variant must lose to it
 *    [the 'continuously / cannot be removed' wording read as whole-fight permanence].
 *  - Burst: zero / shipped / doubled atkPct must be linear, so the 396% is a plain
 *    percent-of-final-ATK instance with no extra term; its hits must resolve OUTSIDE Full Burst
 *    (burst-cast damage lands before the FB window opens, so no +50% major); and a
 *    distributedDamagePct probe injected on her own S1 must lift it, which only happens if the
 *    hit carries the distributed flavor [untagged flatDamage].
 *
 * SHAPE NOTE: the packet documents the override file two ways (slot arrays of Block vs slots as
 * CharacterSkills carrying .blocks). blocksOf() handles both by reference, so the counterfactual
 * patches work under either shape rather than silently mutating nothing.
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

const SLUG = 'aigis';
const KIT_PCT = 21.12;

type Comp = ReturnType<typeof controlComp>;

interface Ev {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  targetSlug?: string;
  casterIdx?: number | null;
  targetIdx?: number | null;
  expiresFrame?: number;
  bucket?: string;
  inFullBurst?: boolean;
}

interface LooseEffect {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
}

interface LooseBlock {
  slot?: string;
  trigger?: { kind: string; stage?: number };
  target?: { kind: string };
  effects?: LooseEffect[];
}

function blocksOf(ov: unknown, slot: 'skill1' | 'skill2' | 'burst'): LooseBlock[] {
  const s = (ov as Record<string, unknown>)[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as LooseBlock[];
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as LooseBlock[]) : [];
}

function effectsOf(bs: LooseBlock[]): LooseEffect[] {
  return bs.flatMap((b) => b.effects ?? []);
}

function withOv(patched: unknown): Comp {
  const opts = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  opts.overrides = {
    ...((opts.overrides as Record<string, unknown>) ?? {}),
    [SLUG]: patched,
  };
  return opts as unknown as Comp;
}

function collect(opts: Comp) {
  const events: Ev[] = [];
  const o = opts as unknown as Record<string, unknown>;
  o.cfg = {
    ...((o.cfg as Record<string, unknown>) ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as unknown as Ev);
    },
  };
  const res = runComp(o as unknown as Comp);
  return { res, events, t: totals(res) };
}

const allySum = (t: Record<string, number>) =>
  Object.entries(t)
    .filter(([k]) => k !== SLUG)
    .reduce((a, [, v]) => a + v, 0);

// The S2 team grant: 'x% of the skill user's ATK' must ride the caster-scaled stat, which the
// engine emits FLAT-resolved. No other unit in the control comp grants casterAtkPct, and the
// value-uniformity assertion below would catch it if one did.
const casterAtk = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct');

// ---- hoisted runs (9 x 180s sims) ------------------------------------------------------------
const base = collect(controlComp(SLUG, true));

const s1AtkOff = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'skill1'))) {
        if (e.stat === 'atkPct') e.value = 0;
      }
    }),
  ),
);

const defOff = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const e of effectsOf(blocksOf(ov, slot))) {
          if (e.stat === 'defPct') e.value = 0;
        }
      }
    }),
  ),
);

const s2Permanent = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'skill2'))) {
        if (e.kind === 'buff') e.durationSec = 999;
      }
    }),
  ),
);

const s2Short = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'skill2'))) {
        if (e.kind === 'buff') e.durationSec = 0.5;
      }
    }),
  ),
);

const s2FbEnter = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const b of blocksOf(ov, 'skill2')) b.trigger = { kind: 'fullBurstEnter' };
    }),
  ),
);

const burstOff = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'burst'))) {
        if (e.kind === 'flatDamage') e.atkPct = 0;
      }
    }),
  ),
);

const burstDouble = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      for (const e of effectsOf(blocksOf(ov, 'burst'))) {
        if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= 2;
      }
    }),
  ),
);

// Distributed-flavor probe: a self-only Distributed Damage buff can only move her total if the
// burst hit is flavored 'distributed'.
const distProbe = collect(
  withOv(
    withPatchedOverride(SLUG, (ov) => {
      blocksOf(ov, 'skill1').push({
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'self' },
        effects: [{ kind: 'buff', stat: 'distributedDamagePct', value: 100 }],
      });
    }),
  ),
);

describe('aigis — fixture', () => {
  it('exercises BOTH her own burst cast and a Full Burst (non-vacuity gate)', () => {
    expect(base.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    // S2 fires only on her own cast, so its presence proves the fixture gives her stage 2.
    expect(casterAtk(base.events).length).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBe(base.t[SLUG]);
  });
});

describe('aigis — skill1 Persona - Palladion (battle start, self)', () => {
  it('Tarukaja ATK ▲21.12% lands on aigis and on NO teammate', () => {
    const hits = base.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'atkPct' && e.value === KIT_PCT,
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(new Set(hits.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
  });

  it('Tarukaja is LIVE for her own damage and inert for the team (static caster basis)', () => {
    expect(s1AtkOff.t[SLUG]).toBeLessThan(base.t[SLUG]);
    for (const [slug, v] of Object.entries(base.t)) {
      if (slug !== SLUG) expect(s1AtkOff.t[slug]).toBe(v);
    }
  });

  it('Rakukaja DEF ▲21.12% is recorded on self and moves no damage', () => {
    const hits = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'defPct' &&
        e.value === KIT_PCT &&
        e.targetSlug === SLUG,
    );
    expect(hits.length).toBeGreaterThan(0);
    for (const [slug, v] of Object.entries(base.t)) expect(defOff.t[slug]).toBe(v);
  });
});

describe('aigis — skill2 Papillon Heart (own burst cast, all allies)', () => {
  it('grants ATK of the SKILL USER to every ally including self, flat-resolved', () => {
    const g = casterAtk(base.events);
    const slugs = new Set(g.map((e) => e.targetSlug));
    expect(slugs.has(SLUG)).toBe(true);
    expect(slugs.size).toBe(Object.keys(base.t).length);
    expect(g.length % slugs.size).toBe(0);
    const values = new Set(g.map((e) => e.value));
    expect(values.size).toBe(1);
    const v = g[0].value as number;
    // 21.12% OF THE CASTER'S ATK — a flat ATK add (~2.08e4 at a scope-lock Supporter sheet),
    // never the raw percentage a target-scaled atkPct encoding would emit.
    expect(v).not.toBe(KIT_PCT);
    expect(v).toBeGreaterThan(1000);
  });

  it('is keyed to her OWN burst cast, not Full Burst entry', () => {
    const iBuff = base.events.findIndex(
      (e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct',
    );
    const iFb = base.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(iBuff).toBeGreaterThanOrEqual(0);
    expect(iFb).toBeGreaterThanOrEqual(0);
    expect(iBuff).toBeLessThan(iFb);

    // the same probe run against the nearest-wrong build: it lands AFTER the FB opens there,
    // which is what makes the ordering above a real discriminator rather than a tautology.
    const jBuff = s2FbEnter.events.findIndex(
      (e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct',
    );
    const jFb = s2FbEnter.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(jBuff).toBeGreaterThan(jFb);
  });

  it('the window is BOUNDED (deactivates when Full Burst ends), not whole-fight', () => {
    expect(allySum(s2Permanent.t)).toBeGreaterThan(allySum(base.t));
    expect(allySum(s2Short.t)).toBeLessThan(allySum(base.t));
  });

  it.skip('Marakukaja: DEF ▲21.12% of the skill user's DEF — GAP: no caster-scaled DEF primitive (no casterDefPct StatKey; defPct is target-scaled and offensively inert), so the ally DEF grant is not expressible and is damage-neutral at scope', () => {});
});

describe('aigis — burst (all enemies, 396% of final ATK, distributed)', () => {
  it('is a linear percent-of-final-ATK instance', () => {
    const zero = burstOff.t[SLUG];
    const one = base.t[SLUG];
    const two = burstDouble.t[SLUG];
    expect(one).toBeGreaterThan(zero);
    expect((two - one) / (one - zero)).toBeCloseTo(1, 2);
  });

  it('moves only aigis (no team-side coupling)', () => {
    for (const [slug, v] of Object.entries(base.t)) {
      if (slug !== SLUG) expect(burstDouble.t[slug]).toBe(v);
    }
  });

  it('resolves BEFORE Full Burst opens (no +50% full-burst major)', () => {
    const hits = base.events.filter((e) => e.kind === 'damage' && e.bucket === 'burst');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.inFullBurst === false)).toBe(true);
  });

  it('is Distributed-flavored (a Distributed Damage ▲ buff feeds it)', () => {
    expect(distProbe.t[SLUG]).toBeGreaterThan(base.t[SLUG]);
    for (const [slug, v] of Object.entries(base.t)) {
      if (slug !== SLUG) expect(distProbe.t[slug]).toBe(v);
    }
  });
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "aigis",
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
          "value": 21.12
        },
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 21.12
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 21.12,
          "durationSec": 11
        },
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 21.12,
          "durationSec": 11
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 396,
          "flavor": "distributed",
          "crit": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ skill2 durationSec 11 is an UNMEASURED stand-in for the kit's event condition 'Deactivation condition: When Full Burst ends'. The engine has no until-event buff removal, so the window is derived from rotation arithmetic: her Burst-II cast → 30f chain gap to the B3 cast → 22f to Full Burst start → 10s Full Burst ≈ 10.87s. Wrong on any rotation where the chain stalls or a Full Burst is extended (fullBurstExtend carriers), and it does NOT self-truncate if the chain breaks after her cast.",
    "⚑ skill2 Effect 2 basis mismatch: the kit grants DEF as a percentage of the SKILL USER'S DEF, but the schema has no caster-scaled DEF StatKey (only defPct = % of the target's own DEF). Encoded as defPct 21.12 to preserve the line rather than drop it; defPct is damage-inert in v1, so the mismatch moves no damage today, but it is NOT a faithful basis and would become wrong the moment a DEF consumer/scaler lands.",
    "⚑ Base cadence (SMG, 120 ammo, reloadFrames 81, hitsPerShot 2, rate_of_fire) is datamined and in the known-unreliable field family — unverified against footage for this unit.",
    "⚑ Burst damage crit eligibility (crit:true) is a convention, not kit text: the kit line states no crit behaviour and the schema default is crit-off for flatDamage.",
    "Burst damage is left FB-eligible-by-timing (no noFb): the cast resolves before the Full Burst window opens, so the engine's own timing should exempt it. noFb is measured-only and is deliberately NOT set.",
    "'Deals 396% of final ATK as distributed damage': distributed damage splits across enemy units in-game; the scope-lock fight is a single partless boss, so the full 396% is modeled as landing. Untested against a multi-target fight.",
    "skill2's 'as long as this unit is still alive' clause is scope-trivial (nothing dies at scope lock) and is therefore not encoded as a gate.",
    "skill1 uses `passive` rather than `battleStart`: the kit says 'continuous and cannot be removed' with no duration, and passive is always-on with no expiry semantics to get wrong."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. aigis is an SMG/Iron/Supporter/Burst II with a mechanically simple kit: S1 is a permanent unremovable self ATK/DEF pair (21.12% each, own-stat basis); S2 fires on HER OWN burst cast (kit wording 'Activates when using Burst Skill' — burstCast, NOT fullBurstEnter, so it does not fire on rotations another Burst II casts) and grants all allies a caster-scaled ATK add (casterAtkPct 21.12, i.e. 21.12% of aigis's own ATK as a flat add to every ally) plus the DEF counterpart, both ending when Full Burst ends. Burst is a single 396%-of-final-ATK distributed-damage instance on cast. There are no stacks, no weapon swap, no Hit-Rate line, no DoT, no gauge line, no core-strike wording, and no conditional/recurring riders — so the only real modeling choices are the S2 window length and the caster-DEF basis, both flagged above. The whole kit's damage contribution to a team is the S2 team ATK flat-add plus one burst nuke; her own SMG output rides only S1's 21.12% self ATK."
}
```

### 6b. blind audit + flags

```json
{
  "slug": "aigis",
  "leakDetected": null,
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates at the start of battle.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'passive'} — 'continuous and cannot be removed' with no duration; passive is always-on. battleStart would be equivalent here but carries duration semantics the kit does not use."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'self'}"
    },
    {
      "slot": "skill1",
      "kitLine": "Tarukaja: ATK ▲ 21.12% continuously",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 21.12, no durationSec (permanent). Own-ATK basis — the line says plain 'ATK ▲ x%', not '% of the skill user's ATK', so atkPct not casterAtkPct."
    },
    {
      "slot": "skill1",
      "kitLine": "Rakukaja: DEF ▲ 21.12% continuously",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff defPct 21.12, no durationSec. Inert in v1 (self DEF does not affect own damage) but retained per the no-skip rule on DEF lines / future consumer."
    },
    {
      "slot": "skill1",
      "kitLine": "cannot be removed (both effects)",
      "status": "IMPLEMENTED",
      "effectOrReason": "Expressed as absence of durationSec + a passive trigger; the engine has no removal channel that would strip these, so no extra encoding is needed."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when using Burst Skill",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'burstCast'} — literal 'when using Burst Skill' = the OWNER casts. Keying this to fullBurstEnter would over-credit on any rotation where a different Burst II unit completes stage 2."
    },
    {
      "slot": "skill2",
      "kitLine": "as long as this unit is still alive",
      "status": "SKIPPED-AS-TRIVIAL",
      "effectOrReason": "No death model at scope lock (boss deals no damage), so the condition is always true; encoding a gate would be inert-by-construction. Recorded as a caveat, not as a dropped mechanic — no `unmodeled` row because the effect it guards IS modeled."
    },
    {
      "slot": "skill2",
      "kitLine": "Affects all allies. (both effects)",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'allies'} — 'all allies' includes self, so excludeSelf is NOT set."
    },
    {
      "slot": "skill2",
      "kitLine": "Matarukaja: ATK ▲ 21.12% of user's ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterAtkPct 21.12 — 'of the skill user's ATK' is the caster-scaled flat-add basis, resolved at apply time to (21.12/100)×aigis.staticAtk for every ally."
    },
    {
      "slot": "skill2",
      "kitLine": "Marakukaja: DEF ▲ 21.12% of user's DEF",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff defPct 21.12 (BASIS APPROXIMATION — no caster-scaled DEF StatKey exists; defPct reads the target's own DEF). Damage-inert in v1; kept rather than dropped per the DEF-not-skippable rule."
    },
    {
      "slot": "skill2",
      "kitLine": "Deactivation cond.: When Full Burst ends",
      "status": "IMPLEMENTED",
      "effectOrReason": "durationSec 11 (⚑ derived stand-in) on both buffs — see flags. No engine primitive removes a buff on a fullBurstEnd event, so the event condition is converted to a wall-clock window."
    },
    {
      "slot": "skill2",
      "kitLine": "continuous and cannot be removed",
      "status": "IMPLEMENTED",
      "effectOrReason": "Read as 'not strippable by cleanse', subordinate to the explicit deactivation condition; expressed as a plain non-stacking buff with the derived window."
    },
    {
      "slot": "burst",
      "kitLine": "Affects all enemies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'enemy'} on the damage block (authoring convention for damage effects; single partless boss at scope lock)."
    },
    {
      "slot": "burst",
      "kitLine": "396% of final ATK as distributed dmg",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage atkPct 396, flavor 'distributed', crit true (⚑ convention), trigger burstCast. No core (the text says no 'core strike'), no noFb (cast resolves pre-FB by timing), no noRange (engine-automatic on riders)."
    }
  ],
  "flags": [
    {
      "field": "override.skill2[0].effects[*].durationSec",
      "estimate": "11 sec (range 10.9–11.0 on a clean chain; longer with any fullBurstExtend carrier in the team)",
      "reasoning": "The kit states an EVENT deactivation ('When Full Burst ends'), not a duration, and the engine has no until-event buff removal. Derived from her Burst-II cast frame forward using the measured chain timing: 30f stage-2→stage-3 gap + 22f stage-3→Full-Burst start ≈ 0.87s, then a 10s Full Burst = 10.87s, rounded to 11. This is the ALWAYS-⚑ 'kit-silent value' class: it is arithmetic from other constants, not a kit number. It over-runs if the chain breaks after her cast and under-runs behind any Full-Burst extender.",
      "recipe": "Focus-record a comp where aigis bursts, and read a teammate's damage popups (or the buff banner) across the Full-Burst boundary: the last frame carrying the elevated ATK relative to the Full-Burst-end frame gives the true window. Cheaper cross-check: run the comp in-sim with cfg.onEvent, capture the buffApply expiresFrame for stat 'casterAtkPct' casterIdx=aigis and the following fullBurstEnd event, and confirm they coincide within a frame; if they don't, retune durationSec to the measured chain rather than the nominal one. If the engine later grows a removeOnFullBurstEnd primitive, this whole flag retires."
    },
    {
      "field": "override.skill2[0].effects[1].stat (defPct as caster-DEF proxy)",
      "estimate": "defPct 21.12 (target's own DEF basis) standing in for '21.12% of the skill user's DEF'",
      "reasoning": "The StatKey list has casterAtkPct / atkOfCasterMaxHpPct but no caster-scaled DEF analogue. Dropping the line would violate the DEF-not-skippable rule; encoding it as defPct preserves the audit trail at the cost of a wrong basis. Zero damage consequence today (defPct is explicitly inert in v1), so this is a fidelity flag, not a magnitude flag.",
      "recipe": "No measurement needed — this is a schema gap, not an unknown. Resolve by either (a) adding a casterDefPct StatKey when a DEF consumer first exists, or (b) leaving it and re-checking this override the moment DEF stops being inert. Grep the roster for other 'X% of the skill user's DEF' lines first: if aigis is not the only carrier, the schema addition is the right call rather than a per-unit proxy."
    },
    {
      "field": "base cadence (rate_of_fire, reloadFrames 81, hitsPerShot 2, ammo 120)",
      "estimate": "as datamined: SMG, 120 rounds, 81-frame reload, 2 hits/shot, normalAttackMultiplier 10.12",
      "reasoning": "ALWAYS-⚑ #1: the datamined cadence fields are in the known-unreliable family, and a nominal rate_of_fire is not the effective rate (the game fires on 60fps boundaries, so effective = 60/ceil(60/nominal)). Nothing in aigis's kit modifies fire rate, reload, or ammo, so her shot economy is entirely inherited from these unverified numbers — every point of her own normal-attack damage rides on them.",
      "recipe": "Count her trigger pulls between two reloads in a focus recording and compare against 120/hitsPerShot; time a reload from the last shot to the first shot of the next magazine and compare against 81 frames (1.35s). Reuse before deriving: check whether an existing SMG unit's pinned cadence fixture in scripts/tests/** already validates the shared SMG shot spec — if it does, that IS the independent method and no new footage is needed."
    },
    {
      "field": "override.burst[0].effects[0].crit",
      "estimate": "true (crits at aigis's sheet rate)",
      "reasoning": "The kit line carries no crit wording either way. The methodology's rider convention is that function-damage riders crit at the caster's rate but take no core, which argues for true; the schema default for flatDamage is crit-off, which argues for omitting it. I set it explicitly rather than riding a default, so the choice is visible to the judge instead of silent. If the engine's shipped convention for burst-slot flatDamage is crit-off, this over-credits her burst by roughly the crit-expectation factor.",
      "recipe": "Read her burst popup colour in a focus recording across several rotations — orange + crit icon vs plain white settles it directly (a burst nuke that never shows orange across ~5 casts is crit-ineligible). Cheaper: check what the other distributed-damage burst carriers in src/skills/overrides/ set, since a roster-wide convention outranks a per-unit guess here."
    },
    {
      "field": "override.burst[0].effects[0].flavor 'distributed' (split-vs-merge)",
      "estimate": "full 396% lands on the single boss (no split)",
      "reasoning": "ALWAYS-⚑ #5, the split-vs-merge class: 'distributed damage' is kit-silent about how the 396% divides when there are multiple targets. The scope-lock fight is one partless boss, so the question is unobservable at scope and the full value lands. The flavor tag is retained because distributedDamagePct buffs from teammates key off it.",
      "recipe": "Not resolvable at scope lock and not worth resolving there — flag only. It becomes live if multi-target or multi-part bosses ever enter scope (both are currently out of scope); at that point read the per-target popups on a burst cast against a known ATK."
    }
  ],
  "model": "claude-opus-5"
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 0 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"battleStart"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":21.12},{"kind":"buff","stat":"defPct","value":21.12}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"passive"},"target":{"kind":"self"},"effects":[{"kind":"buff","stat":"atkPct","value":21.12},{"kind":"buff","stat":"defPct","value":21.12}],"gates":{}}

### skill2: 0 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"allies"},"effects":[{"kind":"buff","stat":"casterAtkPct","value":21.12,"durationSec":10.867}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"allies"},"effects":[{"kind":"buff","stat":"casterAtkPct","value":21.12,"durationSec":11},{"kind":"buff","stat":"defPct","value":21.12,"durationSec":11}],"gates":{}}

### burst: 0 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":396,"flavor":"distributed","burstDesc":"allEnemies"}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"burstCast"},"target":{"kind":"enemy"},"effects":[{"kind":"flatDamage","atkPct":396,"flavor":"distributed","crit":true}],"gates":{}}

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/aigis.json

```json
{
  "note": "NEW unit (no base counterpart) — Persona-style kit (Persona - Palladion / Papillon Heart), SMG/Supporter/Iron, Burst II (cd 20s). SKILL1: battle-start self ATK ▲ 21.12% (atkPct) + DEF ▲ 21.12% (defPct), both PERMANENT — 'continuously' with no deactivation condition, so battleStart with no durationSec. The DEF line is kept as its exact stat buff (the target's own DEF %) even though DEF has no consumer in v1 (no incoming damage), per the keep-the-stat rule. SKILL2: 'Activates when using Burst Skill' = her OWN burst cast (burstCast — NOT fullBurstEnter: a different Burst II ally completing the chain does not activate Papillon Heart, and the two diverge exactly when another Burst II is fielded). Matarukaja = ATK ▲ 21.12% of the SKILL USER'S ATK to ALL allies, self included (casterAtkPct — resolved at apply time to a flat add of 21.12% of her static ATK, uniform across the team). The window is the kit's own deactivation condition, 'When Full Burst ends': for a Burst II cast that is cast → stage-3 cast (30f chain gap) → Full Burst entry (22f pre-FB delay) → FB end (10s) = 652f ≈ 10.87s, encoded as durationSec 10.867 — DERIVED from the engine's measured chain timing, not a kit number. Marakukaja (DEF ▲ 21.12% of the skill user's DEF to all allies) is UNMODELED: the effect schema has no caster-DEF-scaled stat key (defPct scales the TARGET'S own DEF, a different quantity), and DEF has no consumer in v1, so the line is offense-inert with nothing to encode it faithfully against. BURST: 396% of final ATK as distributed damage to all enemies — cast-instant (lands 22f before Full Burst opens, so no +50% Full Burst major), crit-eligible, TAGGED burstDesc 'allEnemies' (her clause is the literal string trina's Burst-Skill-Damage amp quotes; literal-only per owner ruling 2026-08-10). Kit-autonomy gauntlet 2026-09-03.",
  "unmodeled": {
    "skill1": [
      "Persona - Palladion: This effect is continuous and cannot be removed. — named state container: the engine has no Persona-state primitive. Both effects it wraps ARE modeled (the battleStart atkPct + defPct self buffs); the state NAME / undispellable flag is display-only at scope (nothing dispels).",
      "Function: Aigis strengthens herself using her Persona. — same state wrapper; the two stat buffs are the modeled function."
    ],
    "skill2": [
      "Papillon Heart: This effect is continuous and cannot be removed. Function: Aigis strengthens her allies. — named state container; its ATK effect and its cast→Full-Burst-end window ARE modeled (burstCast block, 652f window). 'Continuous and cannot be removed' reads UNDISPELLABLE, not unending — the kit's own deactivation condition ('When Full Burst ends') ends it.",
      "Effect 2: Affects all allies. Marakukaja: DEF ▲ 21.12% of the skill user's DEF continuously. This effect cannot be removed. — no caster-DEF-scaled stat key exists in the schema (defPct is the target's OWN DEF %, a different basis), and DEF has no consumer in the v1 engine (the boss deals no damage), so the line is offense-inert. Recipe if a DEF consumer ever lands: add a casterDefPct StatKey resolved like casterAtkPct (flat add of 21.12% of her static DEF) and encode it in the same burstCast block, same 652f window."
    ],
    "burst": []
  },
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
          "value": 21.12
        },
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 21.12
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 21.12,
          "durationSec": 10.867
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 396,
          "flavor": "distributed",
          "burstDesc": "allEnemies"
        }
      ]
    }
  ],
  "caveats": [
    "skill2: the Papillon Heart window is encoded as durationSec 10.867 (652 frames) — DERIVED from the engine's measured chain timing for a Burst II cast (30f stage gap + 22f pre-FB delay + 10s Full Burst), not from a kit number; the kit gives only the deactivation condition ('When Full Burst ends'). A Full Burst extension from another unit would not stretch this window (no 'until FB end' duration primitive); the spec test pins the expiry to the actual Full-Burst-end frame on the plain rotation.",
    "skill2: 'Activates when using Burst Skill' is keyed to HER OWN cast (burstCast). In a team with another Burst II unit that wins the stage-2 slot, Papillon Heart never activates — faithful to the kit; a fullBurstEnter encoding would wrongly grant the team ATK on every Full Burst regardless of who cast.",
    "skill1/skill2: both DEF lines are offense-inert in v1 (no incoming-damage model, no DEF consumer). The self DEF ▲ 21.12% is kept as a defPct buff (exact semantics); the team 'DEF ▲ 21.12% of the skill user's DEF' has no matching stat key and is verbatim in unmodeled.",
    "burst: the 396% nuke is TAGGED burstDesc 'allEnemies' — her clause is the literal string trina's amp quotes ('Burst Skill damage of skills with \"Affects all enemies\"', owner ruling 2026-08-10: literal-only), so the nuke is amp-eligible whenever such an amp is live. Enforced roster-wide by scripts/tests/census-burst-amp-scope.test.ts."
  ]
}
```

### 7b. scripts/tests/units/aigis.test.ts

```ts
// PER-UNIT KIT SPEC — `aigis` (Aigis, Supporter/SMG/Iron, Burst II, cd 20s, ammo 120). NEW unit,
// no base counterpart; Persona-style kit (Persona - Palladion / Papillon Heart).
// Kit-autonomy gauntlet 2026-09-03. Tier 2 (burstCast-vs-fullBurstEnter; FB-end-bounded window).
//
// One assertion group per KIT LINE (A1..A4 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters.aigis.skills, level-10 values):
//   S1 ■ battle start → self: Persona - Palladion state wrapper (continuous, unremovable) [wrapper]
//        Effect 1: Tarukaja: ATK ▲ 21.12% continuously                                   [A1]
//        Effect 2: Rakukaja: DEF ▲ 21.12% continuously                                   [A2]
//   S2 ■ when using Burst Skill (while alive) → Papillon Heart, until Full Burst ends:
//        Effect 1: all allies: Matarukaja: ATK ▲ 21.12% of the skill user's ATK           [A3]
//        Effect 2: all allies: Marakukaja: DEF ▲ 21.12% of the skill user's DEF           [UNMODELED]
//   BU ■ all enemies: 396% of final ATK as distributed damage                             [A4]
//
// UNMODELED lines (documented, not asserted — see the override's `unmodeled`):
//   - S1/S2 Persona state wrappers ("continuous and cannot be removed"): named state containers
//     with no engine primitive; every effect they wrap IS modeled. "Cannot be removed" reads
//     UNDISPELLABLE, not unending — S2's own deactivation condition ends it.
//   - S2 Effect 2 Marakukaja (DEF ▲ 21.12% of the skill user's DEF, all allies): the schema has no
//     caster-DEF-scaled stat key (defPct is the TARGET'S own DEF %, a different basis) and DEF has
//     no consumer in the v1 engine, so the line is verbatim in unmodeled with a recipe.
//
// Why each assertion discriminates:
//   A1   applies ONCE at t=0 with NO expiry; a "for 10 sec" counterfactual carries an expiry, and
//        removal moves her total.
//   A2   the DEF buff must EXIST as its exact stat (silent-drop counterfactual has no event) and be
//        inert: totals byte-identical with/without it. Inert BY MECHANISM — no engine reader
//        consumes defPct (types.ts: "inert in v1"), so there is no enabling teammate to seat.
//   A3   the team ATK grant keys to HER OWN cast: on the main fixture she casts every rotation and
//        every application lands on the cast frame; on the BENCHED fixture (crown holds the slot
//        ahead of her — both 20s cd, first-ready → slot order) she NEVER casts and the grant never
//        fires, while the fullBurstEnter counterfactual fires on every Full Burst there. The value
//        is a FLAT add of 21.12% of HER static ATK (casterAtkPct re-emits flat), uniform across all
//        four targets, SELF INCLUDED; the window ends exactly on the Full-Burst-end frame (652f
//        after a Burst II cast on the plain rotation). Counterfactuals: self-only / excludeSelf
//        (target set), permanent (no expiry), target-scaled atkPct (helm's own ATK ≠ aigis's).
//   A4   kit magnitude, burst bucket, once per cast, distributed-flavored, crit-eligible, and NO
//        +50% Full Burst major — the cast lands 22f before FB opens; a fullBurstEnter-keyed nuke
//        would take the major.
//
// Fixture (main): liter (B1) / aigis (B2) / scarlet (B3) / helm (B3, alternating burst partner so
// every ~20s rotation completes a Full Burst — a lone 40s-cd B3 leaves every other chain without
// one), boss Fire (neutral for Iron), focus scarlet. Fixture (benched): liter / crown / aigis / helm
// — crown wins every stage-2 cast. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const WINDOW_FRAMES = 30 + 22 + 10 * FPS; // B2 cast → B3 cast → FB entry → FB end = 652

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const MAIN = ['liter', 'aigis', 'scarlet', 'helm'];
const BENCHED = ['liter', 'crown', 'aigis', 'helm'];

function run(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: slugs.includes('scarlet') ? 'scarlet' : 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return {
    events,
    totals: totals(res),
    aigisIdx: slugs.indexOf('aigis'),
    aigisStaticAtk: unitOf(res, 'aigis').staticAtk,
  };
}
type Run = ReturnType<typeof run>;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const aigisCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'aigis'
  );
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const fbEndFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const aigisBuff = (r: Run, stat: string) =>
  buffs(r.events).filter((b) => b.casterIdx === r.aigisIdx && b.stat === stat);
const aigisNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'aigis' && d.srcSlot === 'burst');
const uniq = <T>(xs: T[]) => [...new Set(xs)].sort();

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) =>
  withPatchedOverride('aigis', mutate);
const s1Effect = (ov: any, stat: string) => {
  const e = ov.skill1[0].effects.find((x: any) => x.stat === stat);
  if (!e) {
    throw new Error(`aigis S1 ${stat} effect missing — fixture is stale`);
  }
  return e;
};
const s2Block = (ov: any) => {
  const b = ov.skill2[0];
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error('aigis S2 burstCast block missing — fixture is stale');
  }
  return b;
};
const burstBlock = (ov: any) => {
  const b = ov.burst[0];
  if (!b || !b.effects.some((e: any) => e.kind === 'flatDamage')) {
    throw new Error('aigis burst nuke block missing — fixture is stale');
  }
  return b;
};

/** A1 counterfactual: the self ATK line removed. */
const noS1Atk = patch((ov) => {
  s1Effect(ov, 'atkPct');
  ov.skill1[0].effects = ov.skill1[0].effects.filter(
    (e: any) => e.stat !== 'atkPct'
  );
});
/** A1 counterfactual: "continuously" misread as a 10s buff. */
const s1Timed = patch((ov) => {
  s1Effect(ov, 'atkPct').durationSec = 10;
});
/** A2 counterfactual: the DEF line silently dropped. */
const noS1Def = patch((ov) => {
  s1Effect(ov, 'defPct');
  ov.skill1[0].effects = ov.skill1[0].effects.filter(
    (e: any) => e.stat !== 'defPct'
  );
});
/** A3 counterfactual: Papillon Heart keyed to ANY team Full Burst instead of her own cast. */
const s2AsFbEnter = patch((ov) => {
  s2Block(ov).trigger = { kind: 'fullBurstEnter' };
});
/** A3 counterfactual: "all allies" collapsed to self. */
const s2SelfOnly = patch((ov) => {
  s2Block(ov).target = { kind: 'self' };
});
/** A3 counterfactual: "all allies" read as allies-except-self. */
const s2ExcludeSelf = patch((ov) => {
  s2Block(ov).target = { kind: 'allies', excludeSelf: true };
});
/** A3 counterfactual: "continuous / cannot be removed" read as permanent (no deactivation). */
const s2Permanent = patch((ov) => {
  delete s2Block(ov).effects[0].durationSec;
});
/** A3 counterfactual: "of the skill user's ATK" misread as each target's own ATK %. */
const s2OwnAtk = patch((ov) => {
  s2Block(ov).effects[0].stat = 'atkPct';
});
/** A4 counterfactual: the nuke keyed to Full Burst entry (would take the +50% major). */
const nukeAsFbEnter = patch((ov) => {
  burstBlock(ov).trigger = { kind: 'fullBurstEnter' };
});
/** A4 counterfactual: the nuke dropped. */
const noNuke = patch((ov) => {
  burstBlock(ov);
  ov.burst = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const main = run(MAIN);
const benched = run(BENCHED);
const mainNoS1Atk = run(MAIN, { aigis: noS1Atk });
const mainS1Timed = run(MAIN, { aigis: s1Timed });
const mainNoS1Def = run(MAIN, { aigis: noS1Def });
const benchedFbEnter = run(BENCHED, { aigis: s2AsFbEnter });
const mainSelfOnly = run(MAIN, { aigis: s2SelfOnly });
const mainExcludeSelf = run(MAIN, { aigis: s2ExcludeSelf });
const mainPermanent = run(MAIN, { aigis: s2Permanent });
const mainOwnAtk = run(MAIN, { aigis: s2OwnAtk });
const mainNukeFbEnter = run(MAIN, { aigis: nukeAsFbEnter });
const mainNoNuke = run(MAIN, { aigis: noNuke });

const casts = aigisCasts(main.events);
const castFrames = casts.map((c) => c.frame);
const AIGIS = main.aigisIdx;

describe('aigis — kit spec', () => {
  it('fixture sanity: she casts at stage 2 on every rotation and every rotation reaches Full Burst', () => {
    expect(casts.length).toBeGreaterThanOrEqual(10);
    expect(casts.every((c) => c.stage === 2)).toBe(true);
    expect(fbStartFrames(main.events).length).toBe(casts.length);
    // the last rotation's Full Burst runs past the 180s mark, so it has no end event
    expect(fbEndFrames(main.events).length).toBeGreaterThanOrEqual(
      casts.length - 1
    );
  });

  it('benched fixture sanity: crown wins every stage-2 cast, aigis never casts', () => {
    expect(aigisCasts(benched.events)).toEqual([]);
    expect(
      benched.events.filter((e) => e.kind === 'burstCast' && e.slug === 'crown')
        .length
    ).toBeGreaterThanOrEqual(5);
    expect(fbStartFrames(benched.events).length).toBeGreaterThanOrEqual(5);
  });

  describe('A1 — S1 Tarukaja: ATK ▲ 21.12% continuously, self, from battle start', () => {
    const applied = aigisBuff(main, 'atkPct').filter((b) => b.value === 21.12);

    it('applies once at t=0, self-held, with NO expiry', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].targetIdx).toBe(AIGIS);
      expect(applied[0].expiresFrame).toBeNull();
    });

    it('IS LOAD-BEARING: removing it moves her total', () => {
      expect(main.totals.aigis).toBeGreaterThan(mainNoS1Atk.totals.aigis);
    });

    it('DISCRIMINATING: a timed ("for 10 sec") reading would carry an expiry', () => {
      const cf = aigisBuff(mainS1Timed, 'atkPct').filter(
        (b) => b.value === 21.12
      );
      expect(cf.length).toBe(1);
      expect(cf[0].expiresFrame).toBe(10 * FPS);
      expect(mainS1Timed.totals.aigis).toBeLessThan(main.totals.aigis);
    });
  });

  describe('A2 — S1 Rakukaja: DEF ▲ 21.12% continuously, self (kept as its stat; inert in v1)', () => {
    const applied = aigisBuff(main, 'defPct');

    it('exists as an exact defPct buff: once at t=0, self, no expiry', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].value).toBe(21.12);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].targetIdx).toBe(AIGIS);
      expect(applied[0].expiresFrame).toBeNull();
    });

    it('DISCRIMINATING vs a silent drop: the dropped model emits no DEF event at all', () => {
      expect(aigisBuff(mainNoS1Def, 'defPct')).toEqual([]);
    });

    it('is inert BY MECHANISM (no engine reader consumes defPct): all four totals byte-identical', () => {
      expect(mainNoS1Def.totals).toEqual(main.totals);
    });
  });

  describe('A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends', () => {
    const applied = aigisBuff(main, 'casterAtkPct');

    it('fires on every one of her casts, on the cast frame, to all four allies (self included)', () => {
      expect(applied.length).toBe(4 * casts.length);
      expect(uniq(applied.map((b) => b.frame))).toEqual(uniq(castFrames));
      for (const f of castFrames) {
        expect(
          uniq(applied.filter((b) => b.frame === f).map((b) => b.targetIdx))
        ).toEqual([0, 1, 2, 3]);
      }
    });

    it('is a FLAT add of 21.12% of HER static ATK, uniform across targets', () => {
      const expected = (21.12 / 100) * main.aigisStaticAtk;
      for (const b of applied) {
        expect(b.value).toBeCloseTo(expected, 1);
      }
    });

    it('the window ends exactly on the Full-Burst-end frame (652f after a Burst II cast)', () => {
      const ends = fbEndFrames(main.events);
      let pinned = 0;
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        const nextEnd = ends.find((e) => e > b.frame);
        if (nextEnd === undefined) {
          // the final rotation's Full Burst ends after the fight — no end event to pin against
          expect(b.expiresFrame).toBeGreaterThan(FIGHT_FRAMES);
          continue;
        }
        expect(b.expiresFrame).toBe(nextEnd);
        pinned++;
      }
      expect(pinned).toBeGreaterThanOrEqual(4 * (casts.length - 1));
    });

    it('IS LOAD-BEARING for the team: the allies deal more with the grant than without it', () => {
      expect(main.totals.helm).toBeGreaterThan(mainSelfOnly.totals.helm);
      expect(main.totals.scarlet).toBeGreaterThan(mainSelfOnly.totals.scarlet);
    });

    it('keys to HER OWN cast: benched behind crown she never casts, so it never fires', () => {
      expect(aigisBuff(benched, 'casterAtkPct')).toEqual([]);
    });

    it('DISCRIMINATING: a fullBurstEnter reading fires on every Full Burst even when benched', () => {
      const cf = aigisBuff(benchedFbEnter, 'casterAtkPct');
      expect(cf.length).toBe(4 * fbStartFrames(benched.events).length);
      expect(uniq(cf.map((b) => b.frame))).toEqual(
        uniq(fbStartFrames(benchedFbEnter.events))
      );
      expect(benchedFbEnter.totals.helm).toBeGreaterThan(benched.totals.helm);
    });

    it('DISCRIMINATING: self-only / allies-except-self readings change the target set', () => {
      for (const f of castFrames) {
        expect(
          uniq(
            aigisBuff(mainSelfOnly, 'casterAtkPct')
              .filter((b) => b.frame === f)
              .map((b) => b.targetIdx)
          )
        ).toEqual([AIGIS]);
        expect(
          uniq(
            aigisBuff(mainExcludeSelf, 'casterAtkPct')
              .filter((b) => b.frame === f)
              .map((b) => b.targetIdx)
          )
        ).toEqual([0, 2, 3]);
      }
      expect(mainExcludeSelf.totals.aigis).toBeLessThan(main.totals.aigis);
    });

    it('DISCRIMINATING: a permanent reading has no expiry', () => {
      const cf = aigisBuff(mainPermanent, 'casterAtkPct');
      expect(cf.length).toBe(applied.length);
      expect(uniq(cf.map((b) => b.expiresFrame))).toEqual([null]);
      expect(mainPermanent.totals.helm).toBeGreaterThan(main.totals.helm);
    });

    it("DISCRIMINATING: a target-scaled ATK % (each ally's own ATK) is a different stat and moves helm", () => {
      expect(aigisBuff(mainOwnAtk, 'casterAtkPct')).toEqual([]);
      expect(
        aigisBuff(mainOwnAtk, 'atkPct').filter(
          (b) => b.value === 21.12 && b.frame > 0
        ).length
      ).toBe(4 * casts.length);
      expect(mainOwnAtk.totals.helm).not.toBe(main.totals.helm);
    });
  });

  describe('A4 — burst: 396% of final ATK as distributed damage to all enemies', () => {
    const nukes = aigisNukes(main.events);

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts.length);
      expect(uniq(nukes.map((d) => d.frame))).toEqual(uniq(castFrames));
      expect(uniq(nukes.map((d) => d.atkPct))).toEqual([396]);
      expect(uniq(nukes.map((d) => d.bucket))).toEqual(['burst']);
    });

    it('casts BEFORE the Full Burst window opens: no +50% major, FB not yet live', () => {
      expect(uniq(nukes.map((d) => d.fbMajorApplied))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.inFullBurst))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.rangeApplied))).toEqual([false]);
    });

    it('is crit-eligible (engine rider convention); distributed multiplier 1 with no amp seated', () => {
      expect(uniq(nukes.map((d) => d.critEligible))).toEqual([true]);
      expect(uniq(nukes.map((d) => d.mult.distributed))).toEqual([1]);
    });

    it("is distributed-flavored and TAGGED 'allEnemies' — her clause is trina's literal amp string", () => {
      const ov = loadOverride('aigis') as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.flavor).toBe('distributed');
      expect(nuke.burstDesc).toBe('allEnemies');
    });

    it('DISCRIMINATING: a Full-Burst-entry-keyed nuke would take the +50% major inside FB', () => {
      const cf = aigisNukes(mainNukeFbEnter.events);
      expect(cf.length).toBeGreaterThan(0);
      expect(uniq(cf.map((d) => d.fbMajorApplied))).toEqual([true]);
      expect(uniq(cf.map((d) => d.inFullBurst))).toEqual([true]);
    });

    it('DISCRIMINATING: dropping the nuke zeroes the burst slot and lowers her total', () => {
      expect(aigisNukes(mainNoNuke.events)).toEqual([]);
      expect(mainNoNuke.totals.aigis).toBeLessThan(main.totals.aigis);
    });
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/aigis.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — aigis — kit-autonomy gauntlet 2026-09-03
Command: npx vitest run scripts/tests/units/aigis.test.ts --reporter=verbose (shipped override on disk; every DISCRIMINATING case runs the named nearest-wrong counterfactual via withPatchedOverride in the same file and asserts it diverges — GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions).

 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > fixture sanity: she casts at stage 2 on every rotation and every rotation reaches Full Burst
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > benched fixture sanity: crown wins every stage-2 cast, aigis never casts
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A1 — S1 Tarukaja: ATK ▲ 21.12% continuously, self, from battle start > applies once at t=0, self-held, with NO expiry
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A1 — S1 Tarukaja: ATK ▲ 21.12% continuously, self, from battle start > IS LOAD-BEARING: removing it moves her total
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A1 — S1 Tarukaja: ATK ▲ 21.12% continuously, self, from battle start > DISCRIMINATING: a timed ("for 10 sec") reading would carry an expiry
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A2 — S1 Rakukaja: DEF ▲ 21.12% continuously, self (kept as its stat; inert in v1) > exists as an exact defPct buff: once at t=0, self, no expiry
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A2 — S1 Rakukaja: DEF ▲ 21.12% continuously, self (kept as its stat; inert in v1) > DISCRIMINATING vs a silent drop: the dropped model emits no DEF event at all
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A2 — S1 Rakukaja: DEF ▲ 21.12% continuously, self (kept as its stat; inert in v1) > is inert BY MECHANISM (no engine reader consumes defPct): all four totals byte-identical
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > fires on every one of her casts, on the cast frame, to all four allies (self included)
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > is a FLAT add of 21.12% of HER static ATK, uniform across targets
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > the window ends exactly on the Full-Burst-end frame (652f after a Burst II cast)
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > IS LOAD-BEARING for the team: the allies deal more with the grant than without it
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > keys to HER OWN cast: benched behind crown she never casts, so it never fires
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > DISCRIMINATING: a fullBurstEnter reading fires on every Full Burst even when benched
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > DISCRIMINATING: self-only / allies-except-self readings change the target set
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > DISCRIMINATING: a permanent reading has no expiry
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A3 — S2 Papillon Heart on HER burst cast: all allies ATK ▲ 21.12% of her ATK until Full Burst ends > DISCRIMINATING: a target-scaled ATK % (each ally's own ATK) is a different stat and moves helm
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A4 — burst: 396% of final ATK as distributed damage to all enemies > fires once per cast at the kit magnitude, in the burst bucket
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A4 — burst: 396% of final ATK as distributed damage to all enemies > casts BEFORE the Full Burst window opens: no +50% major, FB not yet live
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A4 — burst: 396% of final ATK as distributed damage to all enemies > is crit-eligible (engine rider convention); distributed multiplier 1 with no amp seated
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A4 — burst: 396% of final ATK as distributed damage to all enemies > is distributed-flavored and TAGGED 'allEnemies' — her clause is trina's literal amp string
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A4 — burst: 396% of final ATK as distributed damage to all enemies > DISCRIMINATING: a Full-Burst-entry-keyed nuke would take the +50% major inside FB
 ✓ scripts/tests/units/aigis.test.ts > aigis — kit spec > A4 — burst: 396% of final ATK as distributed damage to all enemies > DISCRIMINATING: dropping the nuke zeroes the burst slot and lowers her total

assertions passed: 23
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — `aigis` (Aigis) — kit-autonomy gauntlet 2026-09-03

Driver: Claude Fable 5.1 (this harness). Routing (owner instruction for this run): the roles the
protocol pins to `claude-fable-5` went to `kimi-code/k3`; S5/S6 stayed on `claude-opus-5`; Tier-2 second
S2b reviewer `claude-opus-5`; S7 judge `kimi-code/k3` (+ `claude-opus-5` as the Tier-2 second judge).

## Convergence run — S5 blind test vs the driver's shipped override

- **Unmodified blind file (`blind/aigis.test.ts`): does not compile** — one unescaped apostrophe inside a
  single-quoted `it.skip` title ("the skill user's DEF"). Mechanical defect, preserved verbatim.
- **Adapted copy (`blind/aigis.adapted.test.ts`), two changes only:** (1) that quote; (2) the FIXTURE. The
  blind author used `controlComp('aigis', true)` = liter / crown / aigis / helm, which seats **crown ahead of
  aigis in the stage-2 slot** — both on a 20s cooldown, first-ready → slot order — so aigis **never casts**
  and every S2/burst assertion runs against an empty event set (its own non-vacuity gate is satisfied by
  liter's casterAtkPct grant, not hers). With the quote fixed but the fixture unchanged the file runs
  **6 passed / 5 failed / 1 skipped**, every failure downstream of the empty cast set (the second S2b
  reviewer predicted exactly this hazard). With the fixture swapped to liter / aigis / scarlet / helm (she is
  the sole Burst II; two alternating Burst IIIs so every rotation reaches Full Burst) the adapted file runs
  **11 passed / 1 skipped / 0 failed** — the skip is the blind author's own Marakukaja GAP.
- Verdict from the driver's side: convergence GREEN once the fixture lets her cast; the 5 unmodified
  failures are RECON/fixture errors, not divergences.

## Divergences the driver reconciled (S2c)

1. **Marakukaja (DEF ▲ 21.12% of the skill user's DEF, all allies).** Driver + kimi S2b + opus S2b + S5:
   UNMODELED/GAP (no caster-DEF-scaled StatKey; DEF has no consumer in v1). S6 blind override instead ships
   `defPct 21.12` on allies as a labeled basis approximation. Resolved toward the prose: `defPct` scales the
   TARGET'S own DEF, a different quantity; the line is verbatim in `unmodeled.skill2` with a recipe.
2. **`burstDesc: 'allEnemies'` on the nuke.** The opus S2b reviewer called tagging "reflexive". The repo
   rule is the owner ruling 2026-08-10 (literal-only): her clause is exactly "■ Affects all enemies.", and
   `scripts/tests/census-burst-amp-scope.test.ts` ENFORCES the tag roster-wide (an existing labeled fixture).
   Kept.
3. **Window length.** S6 authored 11 s; the driver's 652 f (10.867 s) is frame-exact for a Burst II cast
   (30 f stage gap + 22 f pre-FB delay + 600 f) and the spec test pins every expiry to the actual
   `fullBurstEnd` frame. Both reviewers flagged the value as a derived ⚑ — it is, and the caveat says so.
4. **`crit: true` on the nuke (S6).** Equivalent: the engine's rider convention makes burst-slot flatDamage
   crit-eligible by default (the driver test pins `critEligible === true`).
5. **`rangeApplied === false` on the nuke** (kimi/opus asked for it): added to the driver test.

## Engine facts the blind roles could not see

- The engine has no "until Full Burst ends" duration primitive; the durationSec stand-in is the documented
  precedent (yukiko's 622 f Burst-III window, 2026-08-19).
- `defPct` has no reader anywhere in the engine (types.ts: "inert in v1"), so the S1 Rakukaja pin is an
  inertness pin by mechanism, not by fixture.
