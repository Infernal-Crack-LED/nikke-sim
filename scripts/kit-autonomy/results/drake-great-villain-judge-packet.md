# S7 RECONCILING-JUDGE PACKET — `drake-great-villain` (Drake: Great Villain, SG/Defender/Wind/Burst III)

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
  "slug": "drake-great-villain",
  "name": "Drake: Great Villain",
  "weapon": "SG",
  "burst": "III",
  "class": "Defender",
  "element": "Wind",
  "manufacturer": "Missilis",
  "burstCooldownSec": 40,
  "ammo": 9,
  "reloadFrames": 111,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 10,
  "normalAttackMultiplier": 201.5,
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
■ Activates when entering Full Burst. Affects self.
Changes the weapon in use: Super Duper Overdrive
Charge Time: Fixed at 1.5 sec
Damage: 243.75% of final ATK
Pellet Count: 15
Full Charge Damage: 300%
Max Ammunition Capacity: 6
■ Activates when Super Duper Overdrive ends. Affects self.
Removes 100% of ammo.
```

### skill2

```text
■ Activates when Full Burst ends. Affects all allies.
Max HP ▲ 10.5% of the skill user's max HP (without restoring HP) continuously. Stacks up to 4 times.
■ Activates at the start of battle. Affects self.
Fashionably Late: ATK ▲ 6.23% of the skill user's final max HP continuously.
```

### burst

```text
■ Affects self.
Attack Damage ▲ 27.5% for 25 sec.
■ Affects all enemies.
Deals 1350% of final ATK as Burst Skill damage.
```

## 4. S2b TEST-FAITHFULNESS REVIEW (kimi-code/k3, blind — written BEFORE the driver's tests were shown to it)

```json
{
  "slug": "drake-great-villain",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Changes the weapon in use: Super Duper",
      "disposition": "FAITHFUL",
      "scope": "Replaces the normal-attack weapon for the Full Burst window; swap shots are the only shots fired while active. Swap shot = 15 pellets (SG path), full-shot damagePct 243.75, charge fixed 1.5s (chargeTimeClamp, NOT chargeTimeSec — additive charge-speed buffs must not move it), full-charge mult 300% (chargeMultPct), maxAmmo 6.",
      "durationSemantics": "From fullBurstEnter until Super Duper Overdrive ends (= Full Burst end; kit gives no seconds — the durationSec bound is the engine's FB window, ⚑-adjacent but structural). Not permanent, not round-count.",
      "triggerIdentity": "fullBurstEnter — kit literally says 'Activates when entering Full Burst', so it fires on ANY team Full Burst, including a rotation where helm (the other B3) casts and drake-great-villain does not. NOT burstCast.",
      "targetSet": "self (weapon swap is owner-only).",
      "nearestWrongModel": "Keying the swap to burstCast (fires only on own casts, missing helm-led FBs; also fires pre-FB and desyncs the window), or encoding pellets as a normalAttackPct proxy / per-pellet damagePct instead of weapon:'SG' + pelletCount 15 + full-shot damagePct 243.75, or using chargeTimeSec so charge-speed buffs shrink the fixed 1.5s.",
      "distinguishingAssertion": "In a rotation where helm casts B3 and drake-great-villain never casts: drake's shot events during the FB window still show the swap profile (mult consistent with 243.75 full-shot, 15-pellet SG landing, 6-round magazine, ~1 shot per 1.5s+release). RED under burstCast keying (base 201.5/10-pellet/9-ammo SG persists). Also: zero swap shots outside any FB window.",
      "inertness": "Base weapon stats (201.5 mult, 10 pellets, 9 ammo) unchanged outside FB; swap must not refill/persist past FB end; charge time must be immune to chargeSpeedPct buffs.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Removes 100% of ammo.",
      "disposition": "FAITHFUL",
      "scope": "Ammo economy of the weapon in hand at swap end — the engine hands the base weapon back FULL on a real swap exit, so this dumps that fresh 9-round mag and forces an immediate 111-frame reload. Real DPS-relevant downtime, not cosmetic.",
      "durationSemantics": "Instantaneous consumeAmmo {fraction:1} at swap end; no duration. Fires exactly once per swap.",
      "triggerIdentity": "'When Super Duper Overdrive ends' — coterminous with fullBurstEnd here (no maxShots early-exit on this swap), so fullBurstEnd is the faithful trigger; keyed to the swap's end, not to burstCast and not to FB enter.",
      "targetSet": "self.",
      "nearestWrongModel": "Omitting the block ('the swap hand-back gives a full mag anyway, so consume is a no-op') — wrong because the consume lands AFTER hand-back, forcing a real reload; or firing it at fullBurstEnter (dumping the swap's own 6-round mag instantly).",
      "distinguishingAssertion": "A reload event for drake-great-villain within a few frames after each fullBurstEnd, and zero drake shot events for ~111 frames post-FB. RED under the omitted model (she resumes firing the fresh base mag immediately) and under an enter-keyed model (reload event appears at FB start instead).",
      "inertness": "No reload/ammo events from this line at battle start or mid-FB; allies' ammo untouched; lastBullet-side effects only fire via the forced reload, not before.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Max HP ▲ 10.5% of the skill user's max",
      "disposition": "FAITHFUL",
      "scope": "Generic Max HP grant (maxHpFlat at emit), value = 0.105 × drake-great-villain's Max HP — caster-scaled (casterMaxHpPct), resolved off the CASTER's HP, identical flat value on every target.",
      "durationSemantics": "'continuously. Stacks up to 4 times' → permanent stacking buff, maxStacks 4, one stack added per fullBurstEnd, NO durationSec. Not round-count, not seconds.",
      "triggerIdentity": "fullBurstEnd — 'Activates when Full Burst ends'. Any team's FB ending adds a stack (helm-led rotations included). NOT fullBurstEnter, NOT burstCast.",
      "targetSet": "all allies INCLUDING self (no 'except self' clause). The self-stack is load-bearing: it feeds her own S2 Fashionably Late ATK conversion (atkOfMaxHpPct only feeds when caster === target). Ally-held stacks are offensively inert but must still be applied per taxonomy #7.",
      "nearestWrongModel": "excludeSelf targeting (drops the self-feed into her ATK — silently guts S2b's growth), targetMaxHpPct instead of casterMaxHpPct (value varies per ally instead of uniform 0.105×drake HP), a durationSec window, or an added heal ('without restoring HP' forbids any recovery event).",
      "distinguishingAssertion": "buffApply events with stat 'maxHpFlat' fire ONLY on fullBurstEnd (never on fullBurstEnter/burstCast), value ≈ 0.105 × drake's max HP, five targets per fire INCLUDING targetSlug drake-great-villain, stacks climbing to maxStacks 4 over four FBs; zero 'recovery'/heal events attributable to this line. RED under excludeSelf (no self-target event), under targetMaxHpPct (per-target values differ), under enter-keying (events at FB start).",
      "inertness": "Must not grant ATK directly; must not emit heals; ally-held stacks must not feed any ally's atkOfMaxHpPct; must not stack past 4.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Fashionably Late: ATK ▲ 6.23% of max HP",
      "disposition": "FAITHFUL",
      "scope": "Self ATK conversion off her OWN final Max HP (atkOfMaxHpPct) — re-reads her LIVE max HP every frame, so it grows as her own S2a stacks land. Ally-granted Max HP does NOT feed it (e3 rule).",
      "durationSemantics": "'continuously' → permanent from frame 0; battleStart trigger with no durationSec (battleStart respects durationSec, so authoring any duration would wrongly lapse it).",
      "triggerIdentity": "battleStart — 'Activates at the start of battle'. A passive is functionally equivalent for a permanent buff; either is faithful, a lapse is not.",
      "targetSet": "self only.",
      "nearestWrongModel": "atkPct 6.23 (ATK% of ATK — orders of magnitude off for a Defender HP pool), or atkOfCasterMaxHpPct (apply-time FLAT snapshot: the buff would never grow when S2a self-stacks land — this is the subtle shared-prior trap since self === caster here makes the two look interchangeable at t=0).",
      "distinguishingAssertion": "Drake's per-shot damage after her 3rd/4th S2a self-stack exceeds her damage with 0 stacks by the HP-fed ATK delta (0.0623 × 0.105 × stacks × her max HP, modulo bucket composition). RED under the apply-time-snapshot encoding (damage flat across stack count) and under atkPct (delta ~100× too small).",
      "inertness": "Must not scale off allies' max HP or ally-granted HP; must not buff allies; must not lapse mid-fight.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 27.5% for 25 sec.",
      "disposition": "FAITHFUL",
      "scope": "Generic Damage-Up-bucket buff (attackDamagePct) on all of drake-great-villain's damage — base shots AND swap shots — for 25s. With 40s CD this is ~62.5% uptime, and since it applies at cast it is live through the following FB window.",
      "durationSemantics": "Wall-clock durationSec 25 from her own cast frame. Not stacks, not rounds, not permanent.",
      "triggerIdentity": "burstCast — a self line in her OWN burst block with no other activation clause (taxonomy #3). Fires only on rotations SHE casts; NOT fullBurstEnter (which would over-credit on helm-led rotations and shift the window later).",
      "targetSet": "self only.",
      "nearestWrongModel": "fullBurstEnter keying (over-fires in multi-B3 comps and starts the 25s at FB start rather than at cast), or passive/100%-uptime encoding to match a calibrated total.",
      "distinguishingAssertion": "In a helm-cast rotation (drake never casts): ZERO buffApply events with stat 'attackDamagePct' and caster drake-great-villain. In a drake-cast rotation: exactly one such buffApply at the cast frame with value 27.5 and expiresFrame ≈ cast + 25s worth of frames. RED under fullBurstEnter (buff appears on helm-led FBs) and under passive (no buffApply cadence at all / permanent value).",
      "inertness": "Allies receive nothing; the buff must not extend past 25s on refresh-free rotations; it must not amplify teammates' damage.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1350% of final ATK as Burst Skill",
      "disposition": "FAITHFUL",
      "scope": "Single burst-slot flatDamage instance, atkPct 1350, scope tag burstDesc 'allEnemies' (the line sits under 'Affects all enemies') so burstSkillAoeDamagePct-family amps can feed it. Burst-cast instant damage: FB-EXEMPT by timing (cast lands before the FB window opens), no +30% range bonus (universal rider/burst rule), no core.",
      "durationSemantics": "Instant on cast; no duration, no DoT.",
      "triggerIdentity": "burstCast (stage 3). Exactly one damage instance per own cast.",
      "targetSet": "enemy (boss), all-enemies scope.",
      "nearestWrongModel": "Omitting burstDesc:'allEnemies' (inert until an amp teammate exists, but unfaithful), letting the hit take the +50% FB major (over-credit — the cast precedes the window), encoding as distributed/sustained flavor, or ordering it BEFORE the self attackDamagePct effect in the block so the nuke misses her own 27.5% (kit order is buff line first, damage line second — faithful order lets the nuke carry it).",
      "distinguishingAssertion": "The burst-slot damage event has mult consistent with 1350, inFullBurst=false / fbMajorApplied=false, rangeApplied=false, core bucket absent, and its magnitude reflects the +27.5% attackDamagePct applied earlier in the same cast. RED under FB-crediting (fbMajorApplied=true or +50% magnitude) and under reversed ordering (nuke 27.5% short).",
      "inertness": "No additional hits/ticks after the cast; no damage when she sits out the rotation; must not crit beyond the engine's burst-damage default (burst skill damage does not crit in-game).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:L1 (Super Duper Overdrive weaponSwap, fullBurstEnter)",
    "skill1:L2 (Removes 100% ammo at swap end → forced reload)",
    "skill2:L1 (casterMaxHpPct stacks, fullBurstEnd, all allies incl. self)",
    "skill2:L2 (atkOfMaxHpPct live HP→ATK conversion, battleStart)",
    "burst:L1 (attackDamagePct 27.5 / 25s, burstCast self)",
    "burst:L2 (1350% AoE nuke, burstCast, FB-exempt)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": ["(without restoring HP)"],
    "burst": []
  },
  "notes": "Leak check: the redacted methodology/schema names 'drake' (maxAmmoFlat theme-14 comment) — that is the BASE unit drake (SG/MG-line carrier, different slug), not drake-great-villain; no target slug or target magnitudes appear, so leakDetected=null. Shared-prior traps I expect the driver to have faced: (1) S1 swap keyed burstCast instead of fullBurstEnter — the controlComp fixture includes helm as a second B3, so the helm-cast rotation is the cheap discriminator and MUST be asserted; (2) S2b encoded as atkOfCasterMaxHpPct — looks identical at t=0 (self === caster) but never grows with her own S2a stacks, a calibration-invisible divergence unless a multi-FB run compares her damage at 0 vs 4 stacks; (3) S2a excludeSelf — same gutting of the HP→ATK loop from the other side; (4) S1-L2 omitted as a 'no-op' because the swap hand-back refills — the consume lands AFTER hand-back and forces a real 111f reload each FB exit (assert the post-FB reload event + shot silence); (5) burst buff keyed fullBurstEnter (over-credits helm-led rotations and shifts the 25s window); (6) swap charge time authored chargeTimeSec instead of chargeTimeClamp ('Fixed at 1.5 sec'). ⚑ flags the driver should carry: swap shot economy beyond the kit-stated 1.5s charge (release/inter-shot overhead frames are kit-silent — ALWAYS-⚑ #3, estimate optimistically and label), and the swap's durationSec bound being the engine FB window rather than kit-stated seconds. All kit-printed magnitudes (243.75/15/300/6/10.5/6.23/27.5/25/1350) are DATAMINED-tier; nothing here needs a CALIBRATED guess except the swap cadence residue.",
  "model": "kimi-code/k3"
}
```

### 4b. Second S2b reviewer (claude-opus-5, blind — Tier-2 ×2 models)

```json
{
  "slug": "drake-great-villain",
  "leakDetected": "Minor, non-answer-bearing: the REDACTED EFFECT SCHEMA block (types.ts `maxAmmoFlat` comment) names \"drake\" in its carrier list (\"grave/noir/tove/drake/trina\"). That is the BASE unit `drake`, not `drake-great-villain` — exact-slug rule applies, and this kit's \"Max Ammunition Capacity: 6\" is a weaponSwap field, not a maxAmmoFlat line, so nothing about this unit's answer leaked. The redacted methodology block itself is clean.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Enter Full Burst/self — weapon swap",
      "disposition": "FAITHFUL",
      "scope": "Self only; replaces the base SG (9 ammo / 10 pellets / 201.5% normal mult) with a charge-SG 'Super Duper Overdrive' for the window. A REAL weapon change (not sameWeapon: damagePct 243.75 ≠ her own normalAttackMultiplier 201.5), so it takes a fresh magazine on entry and hands the base weapon back FULL on exit (owner ruling 2026-08-12) — which is exactly what the second ■ block then dumps.",
      "durationSemantics": "Seconds — a weaponSwap.durationSec bounded by the Full Burst window it opens in. Not rounds, not stacks. See the separate 'swap window duration' row: the number itself is kit-silent.",
      "triggerIdentity": "fullBurstEnter — 'Activates when entering Full Burst' fires on ANY team Full Burst, not on her own burst cast. controlComp seats TWO Burst III units (carry + helm), so burstCast and fullBurstEnter genuinely diverge here: on rotations where helm completes the chain, a burstCast-keyed swap never opens.",
      "targetSet": "self",
      "nearestWrongModel": "Keying the swap to `burstCast` (or adding ownBurstGate:'cast'), reading 'entering Full Burst' as 'when she bursts'. In a single-B3 fixture this is byte-identical; in the two-B3 control comp it UNDER-fires (the swap is missing from every FB helm casts).",
      "distinguishingAssertion": "Collect fullBurstStart frames and drake's damage events. Assert the count of FB windows containing at least one drake damage event with mult.charge > 1 EQUALS the total fullBurstStart count (every FB, not a subset), and that zero drake damage events carry mult.charge > 1 outside a FB window.",
      "inertness": "Must NOT change any pre-FB or post-FB shot: outside the swap window drake fires the base SG at 201.5% with no charge multiplier and 9-round magazines.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Time: Fixed at 1.5 sec",
      "disposition": "FAITHFUL",
      "scope": "The swapped weapon only. Base chargeFrames is 0 — she is a non-charge SG outside the window, so this line CREATES her charge behaviour rather than modifying one.",
      "durationSemantics": "Not a duration — a per-shot charge time in seconds, live for the swap window.",
      "triggerIdentity": "Not a trigger; a field on the weaponSwap effect. The word 'Fixed at' is the clamp marker → weaponSwap.chargeTimeClamp 1.5 (charge-speed-buff-immune), distinct from a plain chargeTimeSec that ally chargeSpeedPct would shorten. The swap must also be charge-capable at 1.5 s, so both fields may be needed depending on how the engine derives swap charge frames.",
      "targetSet": "self",
      "nearestWrongModel": "Encoding only `chargeTimeSec: 1.5` and dropping the clamp — an ally charge-speed buff then shortens the shot and inflates in-FB shot count. (Secondary misread: forgetting the 22-frame release latency rides on top of the 1.5 s, so ~6 shots does NOT fit a 10 s window.)",
      "distinguishingAssertion": "Run the control comp twice: baseline, and with withPatchedOverride on a support (e.g. the B2) adding a chargeSpeedPct ▲100 allies buff. Assert drake's in-FB swapped shot COUNT and inter-shot frame gaps are byte-identical between runs. Green under the clamp, red under plain chargeTimeSec.",
      "inertness": "Must NOT alter base-weapon cadence outside the swap (she has no charge phase there).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Damage: 243.75% of final ATK",
      "disposition": "FAITHFUL",
      "scope": "Swapped normal attacks only. Per the schema, weaponSwap.damagePct is the FULL-SHOT total with all pellets landing — same convention as a real SG unit's normalAttackMultiplier.",
      "durationSemantics": "n/a (per-shot multiplier, live for the swap window).",
      "triggerIdentity": "Field on the weaponSwap effect; consumed per swapped trigger pull.",
      "targetSet": "self (her own weapon)",
      "nearestWrongModel": "Reading 243.75% as PER-PELLET and multiplying by the 15-pellet count (~3656% per shot, ~18× her base shot). Whole-picture check refutes it: her base full-shot mult is 201.5% across 10 pellets, so 243.75% across 15 is the same order of magnitude — a per-pellet reading would make one swapped shot worth an entire base magazine.",
      "distinguishingAssertion": "Compare drake's mean swapped-shot damage to her mean unswapped normal-attack damage in the same run. Assert the ratio sits near (243.75 × 3.00) / 201.5 ≈ 3.6× (times only the FB major / landing-fraction residue), and is BELOW 10×. Red under the per-pellet reading (~54×).",
      "inertness": "Must NOT change her base-weapon damage per shot.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Pellet Count: 15",
      "disposition": "FAITHFUL",
      "scope": "Swapped weapon only (base hitsPerShot is 10).",
      "durationSemantics": "n/a — a weapon stat for the swap window.",
      "triggerIdentity": "weaponSwap.pelletCount 15. Per the schema this field is read ONLY when weaponSwap.weapon === 'SG'; the base char is already SG, so an author who omits `weapon` may get a silent fallback to hitsPerShot 10, changing the per-pellet landing fraction and the per-landed-pellet gauge feed (owner ruling 2026-08-14: SG gauge credits per LANDED pellet).",
      "targetSet": "self",
      "nearestWrongModel": "Omitting `weapon:'SG'` on the swap so pelletCount:15 is never read and the swap silently keeps the 10-pellet base — damage looks right (damagePct is the full-shot total) while landing fraction and burst-gauge generation are wrong by 15/10.",
      "distinguishingAssertion": "Patch the override to pelletCount 10 vs 15 and assert drake's TOTAL differs between the two runs (via totals(res)['drake-great-villain']), then assert the shipped run matches the 15 arm. If the two arms are identical, the pellet count is not being read at all — that is the failure this assertion exists to catch.",
      "inertness": "Must NOT change base-weapon pellet count (10) outside the window, and must not pump gauge beyond the per-trigger energy rule.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge Damage: 300%",
      "disposition": "FAITHFUL",
      "scope": "Swapped weapon's full-charge multiplier → weaponSwap.chargeMultPct 300, routing swapped shots through the charge bucket.",
      "durationSemantics": "n/a (swap-window weapon stat).",
      "triggerIdentity": "Field on the weaponSwap; applies to every full-charge release while swapped (the sim releases charge weapons only at full charge).",
      "targetSet": "self",
      "nearestWrongModel": "Dropping chargeMultPct because the base weapon has chargeMultiplier 0 (non-charge SG), so swapped shots land at 243.75% flat — a 3× under-credit on her whole FB window. The inverse misread is adding a separate chargeDamagePct buff (additive bucket points) instead of the weapon's charge MULTIPLIER.",
      "distinguishingAssertion": "Assert every drake damage event inside the swap window carries mult.charge === 3.0 (not 1.0), and that no damage event outside the window carries mult.charge !== 1.",
      "inertness": "Must NOT add a chargeDamagePct entry to the Damage-Up/charge additive bucket for allies or for her base weapon.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Max Ammunition Capacity: 6",
      "disposition": "FAITHFUL",
      "scope": "Swapped weapon magazine = 6 (base is 9). A weapon-state modifier and therefore DAMAGE: it gates shots fired and reload timing inside the window.",
      "durationSemantics": "n/a — magazine size for the swap window.",
      "triggerIdentity": "weaponSwap.maxAmmo 6. NOT a maxAmmoFlat/maxAmmoPct buff (that would stack onto the base gun and persist outside the swap).",
      "targetSet": "self",
      "nearestWrongModel": "Encoding it as a maxAmmoFlat/maxAmmoPct buff on the unit instead of the swap's own magazine — the base 9-round gun then inherits the change outside FB, and the swap keeps 9 rounds inside it.",
      "distinguishingAssertion": "Count drake shot events between reloads: inside the swap window ≤ 6, outside it 9. Assert both, and assert no maxAmmoFlat/maxAmmoPct buffApply is ever emitted for her.",
      "inertness": "Base magazine outside the window stays 9; no ally ammo effects.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "swap window duration (kit-silent) ⚑",
      "disposition": "MEASUREMENT-GATED",
      "scope": "weaponSwap.durationSec is a REQUIRED field the kit text never states. The activation clause ('entering Full Burst') plus the end clause ('when Super Duper Overdrive ends') imply it runs the Full Burst window, i.e. the nominal 10 s.",
      "durationSemantics": "Seconds (or maxShots, if the swap ends on the 6-round magazine instead of the clock — also kit-silent). Estimate: 10 s. Shot-economy ⚑: 6 rounds × (1.5 s charge + ~22 f release latency ≈ 0.37 s) ≈ 11.2 s > a 10 s window, so ~5 charged shots land, NOT 6 — the magazine is deliberately just out of reach.",
      "triggerIdentity": "n/a (a field, not a trigger). Cross-check: a teammate with fullBurstExtend makes the real FB longer than 10 s while a hardcoded durationSec 10 ends the swap early — derive the window from the ACTUAL FB length, not the nominal.",
      "targetSet": "self",
      "nearestWrongModel": "Authoring a duration longer than the FB window (e.g. 15 s or 'until reload') so the Overdrive gun keeps firing after Full Burst ends — that both over-credits the 300% charge shots and desynchronises the swap-end ammo dump.",
      "distinguishingAssertion": "Assert the last swapped damage event (mult.charge > 1) precedes the matching fullBurstEnd frame, and that drake's first post-FB damage event carries mult.charge === 1. Also assert swapped shot count per window ≤ 6 and, at the shipped ⚑ estimate, ≈ 5 — and that the swap end frame tracks the observed fullBurstEnd rather than a hardcoded castFrame + 600.",
      "inertness": "No swapped shot may fall outside a FB window.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ Overdrive ends/self — Removes 100% ammo",
      "disposition": "GAP",
      "scope": "Self weapon state. This is NOT a skippable 'defensive' line — it is a shot-gating effect: the real weapon change hands the base SG back FULL on exit, and this line empties that magazine, forcing an immediate reload (111 frames of lost fire time) at the start of every post-FB stretch.",
      "durationSemantics": "Instant, one-shot per swap end. Not a duration.",
      "triggerIdentity": "GAP: TriggerDef has NO 'swap ends' primitive. The faithful proxy is `fullBurstEnd` + effect consumeAmmo{fraction:1}, which is exact ONLY if the swap's durationSec equals the FB window (see the row above). ORDERING IS LOAD-BEARING: the dump must resolve AFTER the swap ends, so it drains the restored BASE magazine, not the swap's.",
      "targetSet": "self",
      "nearestWrongModel": "Dropping the line as 'no damage / defensive' (the classic weapon-state misread) — she then exits FB with a free full 9-round magazine and fires immediately, over-crediting every post-FB stretch by ~111 frames of uptime plus a magazine. Secondary misread: keying it to fullBurstEnter, which would dump the swap's fresh magazine at the START of the window and gut her FB entirely.",
      "distinguishingAssertion": "For each fullBurstEnd frame F: assert a drake reload event occurs at/just after F, and that her next normal-attack damage event lands ≥ reloadFrames (111) after F. Red if a base-weapon damage event appears within ~111 frames of F (line dropped), and red if any reload lands near fullBurstStart instead (trigger inverted).",
      "inertness": "Must NOT fire lastBullet-style riders for other units, must not touch ally ammo, and must not fire more than once per swap window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ FB ends/allies — Max HP ▲ 10.5%",
      "disposition": "FAITHFUL",
      "scope": "Generic Max HP grant, no attack-type scope. '10.5% OF THE SKILL USER'S max HP' → casterMaxHpPct (resolved to a flat HP add off DRAKE's Max HP), never targetMaxHpPct. '(without restoring HP)' is a no-op at scope lock (no HP pool). Load-bearing because her own self-grant feeds her S2b HP→ATK conversion (own-kit maxHpFlat feeds; ally-granted does not).",
      "durationSemantics": "'continuously' = PERMANENT, no durationSec. 'Stacks up to 4 times' = maxStacks 4 — a stack ladder driven by FB-end count, capping at 42% of her Max HP after the 4th Full Burst. Not seconds, not rounds.",
      "triggerIdentity": "fullBurstEnd (team-wide; any FB, whoever casts). NOT fullBurstEnter, NOT burstCast. One application per FB end.",
      "targetSet": "all allies INCLUDING self (no 'except self' clause) — 5 buffApply events per FB end in the control comp.",
      "nearestWrongModel": "Encoding stat targetMaxHpPct ('Max HP ▲ 10.5%' read as % of each recipient's own HP). It is nearly invisible in totals — ally Max HP is offensively inert — but it silently changes HER self-grant magnitude, which IS live through Fashionably Late. Co-equal misread: keying it to fullBurstEnter, which lands the first stack a full FB window early and reaches cap one rotation sooner.",
      "distinguishingAssertion": "Filter buffApply for stat === 'maxHpFlat' from drake's casterIdx. (i) Assert all five per-FB-end applications carry the SAME value, equal to 0.105 × drake's static maxHp — red under targetMaxHpPct, where the five values differ by each unit's own HP. (ii) Assert the first such event's frame is > the first fullBurstEnd frame and ≤ a few frames after it — red under fullBurstEnter. (iii) Assert stacks progresses 1,2,3,4 and never exceeds maxStacks 4 across 180 s. (iv) Assert no expiresFrame inside the fight (continuous).",
      "inertness": "Must NOT restore/alter HP, must NOT feed any ALLY's atkOfMaxHpPct conversion (e3 rule — ally-granted Max HP is offensively inert), and must not stack past 4.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ battle start/self — ATK ▲ 6.23%",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK (not normal-attack-scoped), self only. 'of the skill user's final max HP' with target self → atkOfMaxHpPct 6.23 (the stat that re-reads the TARGET'S own LIVE Max HP each frame), NOT atkOfCasterMaxHpPct (which flat-resolves and snapshots at apply time).",
      "durationSemantics": "'continuously' from battle start = permanent. Trigger passive (or battleStart with no durationSec); no expiry, no stacks.",
      "triggerIdentity": "battleStart / passive, frame 0. No gate.",
      "targetSet": "self",
      "nearestWrongModel": "Any encoding that FREEZES the basis — atkOfCasterMaxHpPct (snapshotted flat ATK at apply), or a hand-baked atkPct computed from her static Max HP at t=0. All three look identical for the first ~15 s and then under-credit by up to 42% of her HP basis once the S2a stacks land. This is the coupling a blind author is most likely to miss because each line reads correct in isolation.",
      "distinguishingAssertion": "Bucket drake's UNSWAPPED base-weapon damage events by the fullBurstEnd frames and compare per-shot means: assert mean(after 1st FB end) < mean(after 2nd) < mean(after 3rd) < mean(after 4th), and mean(after 5th) ≈ mean(after 4th) (stack cap). Red under any snapshotted/baked basis, where every bucket's per-shot mean is equal.",
      "inertness": "Grants nothing to allies; ally-granted Max HP must NOT feed this conversion (only her own-kit maxHpFlat counts).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ self — Attack Damage ▲ 27.5% 25 sec",
      "disposition": "FAITHFUL",
      "scope": "'Attack Damage' = the additive Damage-Up bucket → attackDamagePct 27.5. Unscoped (applies to her normals, the swap shots and the burst rider alike), but SELF-ONLY.",
      "durationSemantics": "Wall-clock seconds: durationSec 25. With a 40 s burst cooldown it genuinely lapses for ~15 s each cycle — it is NOT effectively permanent, so omitting the duration is a live over-credit.",
      "triggerIdentity": "burstCast (HER OWN burst — the effect sits in her own burst block). NOT fullBurstEnter: in the two-B3 control comp she does not cast every rotation.",
      "targetSet": "self only ('Affects self'). No allies, no caster-slot ally overwrite.",
      "nearestWrongModel": "Target `allies` — 'Attack Damage ▲' on a support-shaped Defender reads like a team buff, and granting it to liter/crown/helm inflates the whole comp. Co-equal misread: dropping durationSec so the 27.5% never lapses (~+15 s uptime per 40 s cycle).",
      "distinguishingAssertion": "Filter buffApply for stat === 'attackDamagePct', value 27.5. Assert exactly ONE event per drake burstCast, targetIdx === targetIdx for drake only (never 5 events), and expiresFrame === applyFrame + 1500 (25 × 60). Red on ally targeting, red on a missing/oversized expiresFrame.",
      "inertness": "Must not fire on rotations where another Burst III casts; must not extend past 25 s.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ all enemies — 1350% Burst Skill dmg",
      "disposition": "FAITHFUL",
      "scope": "One instant burst-bucket hit, flatDamage atkPct 1350, target enemy, burstDesc 'allEnemies' (the kit's own 'Affects all enemies' clause — the tag the jackal/trina Burst-Skill-Damage amps read).",
      "durationSemantics": "Instant, once per burst cast. No duration, no DoT, no ticks.",
      "triggerIdentity": "burstCast (her own). Resolves at CAST, i.e. BEFORE Full Burst opens — a verified project fact: burst-cast damage lands pre-FB, with no +50% FB major and no entry auras.",
      "targetSet": "enemy",
      "nearestWrongModel": "Letting it take the Full Burst major and/or core — modeling it as a hit that lands inside the FB window (a +50% over-credit) or setting core:true because she is a shotgun (function-damage riders get NO core unless the text says 'core strike damage'). A third variant: giving it the +30% range bonus, which riders never take.",
      "distinguishingAssertion": "Filter drake damage events in the burst bucket with the 1350% signature. Assert exactly one per burstCast, and on each: inFullBurst === false, fbMajorApplied === false, rangeApplied === false, and no core component. Red under any FB/core/range crediting.",
      "inertness": "Must not repeat per pellet or per enemy, must not generate a DoT, must not be amplified by her own 27.5% only if the buff has not yet applied — order the self-buff before the hit so the cast-frame state is consistent and assert it explicitly.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:weaponSwap on fullBurstEnter (self)",
    "skill1:chargeTimeClamp 1.5 (Fixed at)",
    "skill1:damagePct 243.75 (full-shot total)",
    "skill1:pelletCount 15 (requires weapon:'SG')",
    "skill1:chargeMultPct 300",
    "skill1:maxAmmo 6",
    "skill1:swap durationSec ⚑ (FB window)",
    "skill1:consumeAmmo 100% at swap end",
    "skill2:casterMaxHpPct 10.5 x4 on fullBurstEnd, all allies",
    "skill2:atkOfMaxHpPct 6.23 passive self",
    "burst:attackDamagePct 27.5 / 25s self on burstCast",
    "burst:flatDamage 1350 enemy, burstDesc allEnemies"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "I am blind to the shipped override, so each 'disposition' states what the line MUST be, not a diff against what exists; FAITHFUL here means 'a primitive exists and the line is fully modelable'. Nothing in this kit is legitimately UNMODELED — the only clause with no damage consequence is '(without restoring HP)', a no-op at scope lock (no HP pool), and it belongs inside the modeled block rather than in `unmodeled`. Where I expect a SHARED-PRIOR MISREAD, in descending order of blast radius: (1) THE HP→ATK COUPLING. S2a (casterMaxHpPct, 4 stacks) and S2b (atkOfMaxHpPct 6.23) are correct in isolation under a snapshotting encoding, but her ATK is supposed to GROW ~42% of her HP basis over the first four FB ends. Any snapshot/bake (atkOfCasterMaxHpPct, or an atkPct computed at t=0) reads plausible line-by-line and silently flattens the ramp — the per-shot-mean-by-FB-bucket assertion is the only thing that catches it. (2) THE SWAP-END AMMO DUMP. 'Removes 100% of ammo' has no matching TriggerDef ('swap ends' does not exist) AND looks like a defensive/no-op line, so it is a double-jeopardy drop candidate. It only makes sense once you know a REAL weapon change returns the base weapon FULL (owner ruling 2026-08-12) — the kit line exists to cancel that refill, and dropping it hands her a free magazine plus ~111 frames of uptime after every Full Burst. The proxy (fullBurstEnd + consumeAmmo) is only exact if the swap's durationSec equals the FB window, so rows 7 and 8 must be authored together, and the dump must resolve AFTER the swap ends. (3) PELLET COUNT SILENTLY UNREAD. Because her base weapon is already SG, an author may omit weaponSwap.weapon:'SG'; the schema reads pelletCount ONLY under that flag, so 15 falls back to hitsPerShot 10 with no error — damage stays right (damagePct is the full-shot total) while landing fraction and the per-landed-pellet gauge feed are wrong by 15/10. The patch-to-10 A/B is designed to fail loudly if the field is inert. (4) TWO-B3 FIXTURE. controlComp seats carry AND helm as Burst III, so burstCast and fullBurstEnter really do diverge in this fixture — S1's swap must key to fullBurstEnter (fires on every FB), while the burst's 27.5% self-buff must key to burstCast (fires only on rotations she casts). Getting either backwards is invisible in a single-B3 test. (5) SHOT ECONOMY ⚑. 6 rounds x (1.5 s + ~22 f latency) ≈ 11.2 s against a ~10 s window means ~5 charged shots, not 6 — the magazine is deliberately out of reach, so any test asserting exactly 6 is pinning an optimistic estimate rather than the kit. Derive the window from the OBSERVED fullBurstEnd frame, not a hardcoded 600, or a teammate's fullBurstExtend desynchronises both the swap and the ammo dump. (6) The clamp-vs-plain charge-time fork is only observable with a charge-speed-granting ally; if the driver ships chargeTimeSec without the clamp, the test as written against the bare control comp will pass either way — the patched-support arm is what makes the distinction decidable.",
  "model": "claude-opus-5"
}
```

## 5. S5 BLIND TEST-WRITER (claude-opus-5, blind — written from the prose alone)

### 5a. blind spec

```json
{
  "slug": "drake-great-villain",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Activates when entering Full Burst",
      "disposition": "FAITHFUL",
      "assertion": "Block is trigger fullBurstEnter / target self with a weaponSwap (damagePct 243.75, chargeMultPct 300, maxAmmo 6, pelletCount 15, weapon SG, fixed 1.5s charge, not sameWeapon). Behaviorally: every charged damage instance in the comp is x3.0 exactly and lands inside Full Burst. Fails under the nearest-wrong readings: passive/battleStart swap (x3 shots leak outside FB), missing chargeMultPct (no x3 shots at all), missing weapon:'SG' (bypasses the pellet-landing model), and — in the two-Burst-III fixture — an ownBurstGate:'cast' reading, which loses the other B3's Full Burst windows."
    },
    {
      "slot": "skill1",
      "kitLine": "Max Ammunition Capacity: 6",
      "disposition": "FAITHFUL",
      "assertion": "maxAmmo 6 is a real shot economy: patching it to 1 forces mid-window reloads and lowers her total. Fails under a swap that inherits the base 9-round belt or drops maxAmmo."
    },
    {
      "slot": "skill1",
      "kitLine": "Removes 100% of ammo",
      "disposition": "FIX-RISK (commonly dropped as defensive)",
      "assertion": "A self-targeted consumeAmmo (fraction 1) keyed to fullBurstEnd. Removing it INCREASES drake's damage by >0.2% — the base gun is handed back full on swap exit and this line dumps it, costing a 111-frame reload every cycle. Fails under the MISSING reading (line skipped as non-damage). No teammate-inertness claim is made: this line changes her shot count, hence her gauge feed and the rotation."
    },
    {
      "slot": "skill2",
      "kitLine": "Max HP 10.5% of skill user, 4 stacks",
      "disposition": "FAITHFUL",
      "assertion": "casterMaxHpPct 10.5, maxStacks 4, no durationSec, trigger fullBurstEnd, target allies WITHOUT excludeSelf. Events: maxHpFlat applications ramp 1..4, never exceed 4, carry one uniform flat value, and cover self plus every ally. Counterfactual maxStacks 4->1 lowers drake's damage >1% while leaving teammates byte-identical. Fails under targetMaxHpPct (per-target own HP -> non-uniform values), excludeSelf (kills the ATK ramp entirely), or a missing/uncapped stack count."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK 6.23% of skill user max HP",
      "disposition": "FAITHFUL",
      "assertion": "atkOfMaxHpPct 6.23, self, battleStart/passive, continuous. Zeroing it drops her total >2% with teammates byte-identical, and with it zeroed the stack counterfactual becomes an exact no-op — proving this conversion is the sole path from the Max HP stacks to damage. Fails under atkOfCasterMaxHpPct, which snapshots at apply time and, applied at battle start, would freeze at frame-0 Max HP and silently delete her whole 4-stack ramp."
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage 27.5% for 25 sec",
      "disposition": "FAITHFUL",
      "assertion": "attackDamagePct 27.5, durationSec 25, trigger burstCast, target self, applied >=3 times. Stretching the duration to permanent ADDS damage (40s cooldown means 25s can never be full uptime), and in the two-Burst-III fixture re-keying it to fullBurstEnter over-credits. Fails under atkPct (wrong bucket), a dropped duration, a rounds reading, or a full-burst-enter trigger."
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1350% of final ATK",
      "disposition": "FAITHFUL",
      "assertion": "flatDamage atkPct 1350 on a burstCast/enemy block, burstDesc not 'singleEnemy', core falsy. Removing it costs >1% of her total; forcing noFb:true is a byte-identical no-op, confirming the hit already resolves pre-Full-Burst (no +50% major) per the repo's measured burst-cast timing. Fails if the hit rides the FB major or is tagged single-target."
    }
  ],
  "fixtures": "TWO. (1) soloB3 = controlComp('drake-great-villain', false) — liter B1 / crown B2 / drake B3: drake is the sole Burst III so she casts on every rotation, and excluding the fixed second B3 keeps its crit/charge buffs off every reading; it also leaves her swapped weapon as the ONLY charge weapon in the comp, which is what makes the unattributed `mult.charge > 1` event filter a clean Overdrive probe. Carries 10 of the 13 runs. (2) twoB3 = controlComp('drake-great-villain', true) — adds the fixed second Burst III so that some Full Bursts are not hers; this is the only fixture in which fullBurstEnter and burstCast/ownBurstGate diverge, so both trigger-identity counterfactuals live there behind an explicit non-vacuity assertion (her cast count strictly less than the Full Burst count). All runs deterministic (no seed), hoisted to module scope; 13 total.",
  "gaps": [
    "it.skip — GAP: no swapEnd trigger primitive exists, so 'when Super Duper Overdrive ends' is proxied by fullBurstEnd. With a teammate granting fullBurstExtend the weapon window closes before Full Burst ends and the ammo dump fires late; no extender is in either fixture, so the divergence is unobservable here.",
    "it.skip — FLAGGED (kit-silent, always-flag field #3, weapon-swap shot economy): the Overdrive durationSec is nowhere in the prose. Assumed to be the Full Burst window it is granted at; the test only asserts durationSec >= 10. Recipe: count Overdrive shots per Full Burst on a focus recording.",
    "it.skip — FLAGGED: burst-gauge economy of the 15-pellet swapped shotgun is unobservable from prose (per-trigger energy vs per-landed-pellet crediting at 15 rather than the base 10 pellets feeds back into her own rotation). Recipe: gauge-bar read on a focus recording.",
    "NOT TESTED (outside the prose's reach): Hit-Rate -> core magnitude for the swapped SG, and the pellet-landing fraction at the scope-lock range band — both measured-only.",
    "SHAPE AMBIGUITY handled defensively, not asserted: the packet describes the override slot as both a raw Block[] and a CharacterSkills carrying .blocks; blocksOf() reads either, so a shape mismatch cannot masquerade as a kit divergence."
  ],
  "model": "claude-opus-5"
}
```

### 5b. blind test source (VERBATIM — mechanical defects preserved; see section 8 for the run against the driver's override)

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * drake-great-villain — Drake: Great Villain (SG / Wind / Defender / Burst III)
 * BLIND kit spec test, written from the kit prose alone (no driver artifacts consulted).
 *
 * Base: ammo 9, reload 111f, hitsPerShot 10, normal mult 201.5, chargeFrames 0 —
 * the BASE gun does not charge, so any charge multiplier seen in this comp is the swap's.
 *
 * Kit lines under test
 *   S1-a  "when entering Full Burst" -> weapon change (charge fixed 1.5s, 243.75%, 15 pellets,
 *         full-charge 300%, max ammo 6). TEAM Full-Burst entry, NOT her own burst cast.
 *   S1-b  "when [the swap] ends" -> removes 100% of ammo (dumps the base gun handed back full,
 *         forcing a reload after every Full Burst — a shot-count / damage line, not a defensive one).
 *   S2-a  "when Full Burst ends", all allies -> Max HP up 10.5% of the SKILL USER's max HP,
 *         continuous, stacks to 4.
 *   S2-b  battle start, self -> ATK up 6.23% of the skill user's final max HP, continuous.
 *   B-a   self -> Attack Damage up 27.5% for 25 sec (fires on her OWN burst cast).
 *   B-b   all enemies -> 1350% of final ATK as Burst Skill damage.
 *
 * The load-bearing coupling: S2-a's SELF-granted Max HP feeds S2-b's own-Max-HP -> ATK conversion
 * (ally-granted Max HP does not feed a teammate's conversion), so her ATK RAMPS across the fight
 * (4 stacks = +42% Max HP). That makes the stat choice in S2-b discriminating: a snapshot-at-apply
 * conversion applied at battle start would freeze at frame-0 HP and never see a single stack.
 *
 * Fixtures
 *   soloB3 = controlComp(SLUG, false) — liter B1 / crown B2 / drake B3. Drake is the SOLE Burst III,
 *            so she casts every rotation and helm's crit/charge buffs never confound a reading.
 *   twoB3  = controlComp(SLUG, true)  — adds helm as a second Burst III, so some Full Bursts are NOT
 *            hers. That is the ONLY fixture where team-FB triggers and own-burst triggers diverge,
 *            so the trigger-identity counterfactuals live there behind an explicit non-vacuity check.
 *
 * Run budget: 13 full 180s sims, hoisted to module scope.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'drake-great-villain';

type Comp = ReturnType<typeof controlComp>;
type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';
type Found = { slot: Slot; block: any; effect: any };

const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

// The override FILE is slot-keyed; depending on the loader a slot is either a raw Block[] or a
// CharacterSkills carrying .blocks. Read both shapes so a shape mismatch is not mistaken for a
// kit divergence. Blocks are returned BY REFERENCE, so in-place mutation patches either shape.
function blocksOf(ov: any, slot: Slot): any[] {
  const raw = ov?.[slot];
  if (Array.isArray(raw)) return raw;
  return Array.isArray(raw?.blocks) ? raw.blocks : [];
}

function findEffect(
  ov: any,
  kind: string,
  pred?: (e: any) => boolean
): Found | null {
  for (const slot of SLOTS) {
    for (const block of blocksOf(ov, slot)) {
      for (const effect of block?.effects ?? []) {
        if (effect?.kind === kind && (!pred || pred(effect)))
          return { slot, block, effect };
      }
    }
  }
  return null;
}

// Fails LOUDLY with the kit line's name: an absent effect is itself the finding.
function mustFind(
  ov: any,
  kind: string,
  label: string,
  pred?: (e: any) => boolean
): Found {
  const hit = findEffect(ov, kind, pred);
  if (!hit)
    throw new Error(
      `[${SLUG}] no '${kind}' effect found for kit line: ${label}`
    );
  return hit;
}

const isMaxHpGrant = (e: any) =>
  e?.kind === 'buff' &&
  [
    'casterMaxHpPct',
    'targetMaxHpPct',
    'maxHpPct',
    'highestAllyMaxHpPct',
  ].includes(String(e.stat));
const isHpToAtk = (e: any) =>
  e?.kind === 'buff' && String(e.stat).startsWith('atkOf');
const isDamageUp = (e: any) =>
  e?.kind === 'buff' && String(e.stat) === 'attackDamagePct';

function run(opts: Comp): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const tapped = {
    ...(opts as any),
    cfg: {
      ...((opts as any).cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        events.push(ev as Ev);
      },
    },
  } as Comp;
  return { res: runComp(tapped), events };
}

function withOv(opts: Comp, ov: any): Comp {
  return {
    ...(opts as any),
    overrides: { ...((opts as any).overrides ?? {}), [SLUG]: ov },
  } as Comp;
}

const D = (res: any): number => totals(res)[SLUG];

// ---------------------------------------------------------------------------
// Shipped override (an unmutated clone, used for structural reads) + counterfactuals
// ---------------------------------------------------------------------------
const shipped: any = withPatchedOverride(SLUG, () => {});

const pNoSwap = withPatchedOverride(SLUG, (ov: any) => {
  const hit = mustFind(ov, 'weaponSwap', 'S1-a Super Duper Overdrive');
  hit.block.effects = hit.block.effects.filter(
    (e: any) => e.kind !== 'weaponSwap'
  );
});

const pSwapAmmo1 = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'weaponSwap', 'S1-a max ammo 6').effect.maxAmmo = 1;
});

const pNoAmmoDump = withPatchedOverride(SLUG, (ov: any) => {
  const hit = mustFind(ov, 'consumeAmmo', 'S1-b removes 100% of ammo');
  hit.block.effects = hit.block.effects.filter(
    (e: any) => e.kind !== 'consumeAmmo'
  );
});

const pStacks1 = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'buff', 'S2-a Max HP stacks', isMaxHpGrant).effect.maxStacks = 1;
});

const pNoHpToAtk = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'buff', 'S2-b Fashionably Late', isHpToAtk).effect.value = 0;
});

const pStacks1NoHpToAtk = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'buff', 'S2-a Max HP stacks', isMaxHpGrant).effect.maxStacks = 1;
  mustFind(ov, 'buff', 'S2-b Fashionably Late', isHpToAtk).effect.value = 0;
});

const pBurstBuffPermanent = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(
    ov,
    'buff',
    'B-a Attack Damage 25 sec',
    isDamageUp
  ).effect.durationSec = 900;
});

const pNoNuke = withPatchedOverride(SLUG, (ov: any) => {
  const hit = mustFind(ov, 'flatDamage', 'B-b 1350% burst damage');
  hit.block.effects = hit.block.effects.filter(
    (e: any) => e.kind !== 'flatDamage'
  );
});

const pNukeNoFb = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'flatDamage', 'B-b 1350% burst damage').effect.noFb = true;
});

const pSwapOwnGated = withPatchedOverride(SLUG, (ov: any) => {
  mustFind(ov, 'weaponSwap', 'S1-a trigger identity').block.ownBurstGate =
    'cast';
});

const pBurstBuffOnFbEnter = withPatchedOverride(SLUG, (ov: any) => {
  // The self Damage-Up and the enemy nuke can never share a block (target is a Block field),
  // so re-keying this block cannot accidentally re-key the 1350% hit.
  mustFind(ov, 'buff', 'B-a trigger identity', isDamageUp).block.trigger = {
    kind: 'fullBurstEnter',
  };
});

// ---------------------------------------------------------------------------
// Hoisted runs (13 full 180s sims)
// ---------------------------------------------------------------------------
const soloB3 = () => controlComp(SLUG, false);
const twoB3 = () => controlComp(SLUG, true);

const base = run(soloB3());
const rNoSwap = runComp(withOv(soloB3(), pNoSwap));
const rSwapAmmo1 = runComp(withOv(soloB3(), pSwapAmmo1));
const rNoAmmoDump = runComp(withOv(soloB3(), pNoAmmoDump));
const rStacks1 = runComp(withOv(soloB3(), pStacks1));
const rNoHpToAtk = runComp(withOv(soloB3(), pNoHpToAtk));
const rStacks1NoHpToAtk = runComp(withOv(soloB3(), pStacks1NoHpToAtk));
const rBurstPermanent = runComp(withOv(soloB3(), pBurstBuffPermanent));
const rNoNuke = runComp(withOv(soloB3(), pNoNuke));
const rNukeNoFb = runComp(withOv(soloB3(), pNukeNoFb));

const helmBase = run(twoB3());
const rHelmSwapOwnGated = runComp(withOv(twoB3(), pSwapOwnGated));
const rHelmBuffFbEnter = runComp(withOv(twoB3(), pBurstBuffOnFbEnter));

const ALLIES = Object.keys(totals(base.res)).filter((s) => s !== SLUG);

describe('drake-great-villain — fixture sanity', () => {
  it('the sole-Burst-III fixture actually bursts and reaches Full Burst repeatedly', () => {
    const fbStarts = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const fbEnds = base.events.filter((e) => e.kind === 'fullBurstEnd').length;
    // Non-vacuity for every FB-keyed line below, and for the 4-stack cap in particular:
    // fewer than 5 Full Burst ENDS could never demonstrate the cap binding.
    expect(fbStarts).toBeGreaterThanOrEqual(5);
    expect(fbEnds).toBeGreaterThanOrEqual(5);
    expect(D(base.res)).toBeGreaterThan(0);
    expect(ALLIES.length).toBeGreaterThanOrEqual(2);
  });
});

describe('S1-a — "entering Full Burst": Super Duper Overdrive weapon change', () => {
  it('encodes the datamined swap block verbatim (real weapon change, SG, 15 pellets)', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'weaponSwap',
      'S1-a Super Duper Overdrive'
    );
    expect(slot).toBe('skill1');
    // Trigger identity: "Activates when entering Full Burst" = ANY team Full Burst,
    // never burstCast (which fires pre-FB and would lose the FB window entirely).
    expect(block.trigger?.kind).toBe('fullBurstEnter');
    expect(block.target?.kind).toBe('self');
    expect(block.ownBurstGate).toBeUndefined();
    // "Damage: 243.75%" is the FULL-SHOT total (all pellets), same convention as a real SG's
    // normalAttackMultiplier — not a per-pellet value.
    expect(effect.damagePct).toBeCloseTo(243.75, 4);
    expect(effect.chargeMultPct).toBeCloseTo(300, 4); // "Full Charge Damage: 300%"
    expect(effect.maxAmmo).toBe(6); // "Max Ammunition Capacity: 6"
    expect(effect.pelletCount).toBe(15); // "Pellet Count: 15"
    // weapon:'SG' is load-bearing: it routes the swap through the accuracy-circle pellet-landing
    // model instead of 100%-guaranteed landing. Omitting it silently over-credits every shot.
    expect(effect.weapon).toBe('SG');
    // "Charge Time: Fixed at 1.5 sec" — either encoding of the fixed charge is faithful.
    expect(effect.chargeTimeClamp ?? effect.chargeTimeSec).toBeCloseTo(1.5, 4);
    // A real weapon CHANGE, not a re-flavor: sameWeapon would wrongly suppress the fresh magazine
    // on entry and the full base gun handed back on exit — which is exactly what S1-b then dumps.
    expect(effect.sameWeapon).toBeFalsy();
    // Kit-silent duration (FLAGGED): nothing in the prose bounds Overdrive. It must at minimum
    // cover the Full Burst window it is granted for.
    expect(effect.durationSec).toBeGreaterThanOrEqual(10);
  });

  it('the swap is the only charge weapon in the comp and fires at exactly x3.0 full-charge', () => {
    // liter (SMG) and crown (SG) do not charge and drake's BASE gun has chargeFrames 0, so every
    // charged damage instance in this comp is an Overdrive shot. Nearest-wrong: a swap authored
    // without chargeMultPct inherits the base SG's (absent) charge multiplier -> no x3 shots at all.
    const charged = base.events.filter(
      (e) => e.kind === 'damage' && Number(e.mult?.charge ?? 1) > 1
    );
    expect(charged.length).toBeGreaterThanOrEqual(4);
    const offSpec = charged.filter(
      (e) => Math.abs(Number(e.mult.charge) - 3) > 1e-6
    );
    expect(offSpec.length).toBe(0);
  });

  it('every Overdrive shot lands INSIDE Full Burst (window scoping)', () => {
    // Discriminates a swap keyed passive/battleStart, or given a duration that outlives the window
    // it was granted for: either leaks x3 charge shots outside Full Burst.
    const charged = base.events.filter(
      (e) => e.kind === 'damage' && Number(e.mult?.charge ?? 1) > 1
    );
    const leaked = charged.filter((e) => e.inFullBurst !== true);
    expect(leaked.length).toBe(0);
  });

  it('the weapon change materially moves drake damage (the line is not inert)', () => {
    const delta = Math.abs(D(rNoSwap) - D(base.res));
    expect(delta).toBeGreaterThan(0.005 * D(base.res));
  });

  it('the 6-round Overdrive magazine is a real shot economy', () => {
    // maxAmmo 6 vs 1: at a fixed 1.5s charge the 6-round belt does not force a mid-window reload,
    // a 1-round belt does. Nearest-wrong (maxAmmo dropped / inherited from the base 9-round gun)
    // changes the number of Overdrive shots the window can hold.
    expect(D(rSwapAmmo1)).toBeLessThan(D(base.res));
  });
});

describe('S1-b — "when Super Duper Overdrive ends": removes 100% of ammo', () => {
  it('encodes a self-targeted full-magazine dump keyed to the end of the window', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'consumeAmmo',
      'S1-b removes 100% of ammo'
    );
    expect(slot).toBe('skill1');
    expect(block.target?.kind).toBe('self');
    // "Removes 100%" — the whole belt (fraction defaults to 1 when omitted).
    expect(effect.fraction ?? 1).toBeCloseTo(1, 6);
    // No swapEnd primitive exists; fullBurstEnd is the faithful proxy for "when Overdrive ends"
    // because the swap is granted at FB entry for the FB window (see the it.skip gap below).
    expect(block.trigger?.kind).toBe('fullBurstEnd');
  });

  it('dropping the ammo dump OVER-credits drake (it costs her a reload every cycle)', () => {
    // The base gun is handed back FULL on swap exit; this line immediately empties it and forces a
    // 111-frame reload after every Full Burst. Modelling it as "defensive / no damage" (the MISSING
    // reading) gives her that magazine for free.
    expect(D(rNoAmmoDump)).toBeGreaterThan(D(base.res));
    expect(D(rNoAmmoDump) - D(base.res)).toBeGreaterThan(0.002 * D(base.res));
    // NOTE: deliberately no teammate-inertness assertion here — this line changes drake's SHOT
    // count, which changes her burst-gauge feed and can legitimately shift the whole rotation.
  });
});

describe('S2-a — "when Full Burst ends", all allies: Max HP 10.5% of the skill user, 4 stacks', () => {
  it('encodes a caster-scaled, continuous, 4-stack Max HP grant to all allies', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'buff',
      'S2-a Max HP stacks',
      isMaxHpGrant
    );
    expect(slot).toBe('skill2');
    expect(block.trigger?.kind).toBe('fullBurstEnd');
    expect(block.target?.kind).toBe('allies');
    // "Affects all allies" includes the skill user — and self-inclusion is load-bearing here,
    // because only the SELF-granted stacks feed her own Max-HP -> ATK conversion (S2-b).
    expect(block.target?.excludeSelf).toBeFalsy();
    // "...of the SKILL USER's max HP" — caster-scaled, not each target's own Max HP.
    expect(effect.stat).toBe('casterMaxHpPct');
    expect(effect.value).toBeCloseTo(10.5, 4);
    expect(effect.maxStacks).toBe(4);
    expect(effect.durationSec).toBeUndefined(); // "continuously"
  });

  it('applies at Full Burst END to every ally and caps at 4 stacks', () => {
    // casterMaxHpPct re-emits FLAT-resolved under stat 'maxHpFlat'; maxStacks===4 identifies this line.
    const applies = base.events.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'maxHpFlat' && e.maxStacks === 4
    );
    expect(applies.length).toBeGreaterThanOrEqual(6);
    const stacks = applies.map((e) => Number(e.stacks));
    expect(Math.min(...stacks)).toBe(1); // ramps from 1 (not instant-to-cap)
    expect(Math.max(...stacks)).toBe(4); // and the cap is REACHED, so the cap is non-vacuous
    expect(stacks.filter((s) => s > 4).length).toBe(0); // and never exceeded
    // Uniform caster-scaled flat value across every target (a per-target-own-HP encoding would
    // give the Defender caster and her teammates different numbers).
    const values = new Set(applies.map((e) => Number(e.value)));
    expect(values.size).toBe(1);
    expect([...values][0]).toBeGreaterThan(0);
    // Target set: self AND the rest of the team.
    const targets = new Set(applies.map((e) => String(e.targetSlug)));
    expect(targets.has(SLUG)).toBe(true);
    for (const ally of ALLIES) expect(targets.has(ally)).toBe(true);
  });

  it('the stacks raise drake own damage and are offensively inert on teammates', () => {
    // Capping at 1 stack instead of 4 removes 31.5% of her Max HP, which S2-b converts to ATK.
    expect(D(rStacks1)).toBeLessThan(D(base.res));
    expect(D(base.res) - D(rStacks1)).toBeGreaterThan(0.01 * D(base.res));
    // Inertness: ally-granted Max HP feeds no teammate conversion, and the patch changes no shot
    // count, so the rotation is untouched and teammates must be byte-identical.
    for (const ally of ALLIES)
      expect(totals(rStacks1)[ally]).toBe(totals(base.res)[ally]);
  });
});

describe('S2-b — battle start, self: ATK 6.23% of the skill user final Max HP', () => {
  it('encodes a LIVE own-Max-HP conversion (not a snapshot at apply time)', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'buff',
      'S2-b Fashionably Late',
      isHpToAtk
    );
    expect(slot).toBe('skill2');
    expect(['battleStart', 'passive']).toContain(block.trigger?.kind);
    expect(block.target?.kind).toBe('self');
    // atkOfMaxHpPct re-reads the target's OWN live Max HP every frame. The nearest-wrong,
    // atkOfCasterMaxHpPct, snapshots at APPLY time — applied at battle start it would freeze at
    // frame-0 Max HP and never see a single S2-a stack, silently deleting her whole ramp.
    expect(effect.stat).toBe('atkOfMaxHpPct');
    expect(effect.value).toBeCloseTo(6.23, 4);
    expect(effect.durationSec).toBeUndefined(); // "continuously"
  });

  it('the conversion is live and carries a large share of her damage', () => {
    expect(D(rNoHpToAtk)).toBeLessThan(D(base.res));
    expect(D(base.res) - D(rNoHpToAtk)).toBeGreaterThan(0.02 * D(base.res));
    for (const ally of ALLIES)
      expect(totals(rNoHpToAtk)[ally]).toBe(totals(base.res)[ally]);
  });

  it('this conversion is the ONLY path from the S2-a stacks to damage', () => {
    // Mechanism isolation: with the conversion zeroed, capping the stacks at 1 must become a
    // byte-identical no-op. If it still moves damage, the Max HP grant is reaching damage through
    // some other (unfaithful) route.
    expect(D(rStacks1NoHpToAtk)).toBe(D(rNoHpToAtk));
  });
});

describe('burst — self Attack Damage 27.5% for 25 sec', () => {
  it('encodes a 25-second self Damage-Up on her OWN burst cast', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'buff',
      'B-a Attack Damage 25 sec',
      isDamageUp
    );
    expect(slot).toBe('burst');
    expect(block.trigger?.kind).toBe('burstCast');
    expect(block.target?.kind).toBe('self');
    // "Attack Damage" is the additive Damage-Up bucket, NOT an ATK-bucket atkPct.
    expect(effect.stat).toBe('attackDamagePct');
    expect(effect.value).toBeCloseTo(27.5, 4);
    expect(effect.durationSec).toBeCloseTo(25, 6); // seconds — not rounds, not permanent
    expect(effect.durationShots).toBeUndefined();
  });

  it('is applied to drake once per burst cast', () => {
    const applies = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(Number(e.value) - 27.5) < 1e-6 &&
        e.targetSlug === SLUG
    );
    expect(applies.length).toBeGreaterThanOrEqual(3);
  });

  it('the 25-second window is a real duty cycle, not permanent uptime', () => {
    // Her burst cooldown is 40s, so 25s can never be full uptime; stretching it to permanent must
    // ADD damage. Nearest-wrong: durationSec dropped (continuous) or mis-read as rounds.
    expect(D(rBurstPermanent)).toBeGreaterThan(D(base.res));
    expect(D(rBurstPermanent) - D(base.res)).toBeGreaterThan(
      0.005 * D(base.res)
    );
    for (const ally of ALLIES)
      expect(totals(rBurstPermanent)[ally]).toBe(totals(base.res)[ally]);
  });
});

describe('burst — 1350% of final ATK to all enemies', () => {
  it('encodes a burst-slot enemy-targeted 1350% hit', () => {
    const { slot, block, effect } = mustFind(
      shipped,
      'flatDamage',
      'B-b 1350% burst damage'
    );
    expect(slot).toBe('burst');
    expect(block.target?.kind).toBe('enemy');
    expect(block.trigger?.kind).toBe('burstCast');
    expect(effect.atkPct).toBeCloseTo(1350, 4);
    // "Affects all enemies" — the AoE scope tag, never the single-target one.
    expect(effect.burstDesc).not.toBe('singleEnemy');
    // Burst Skill damage is not core-flavored and takes no range bonus in its own right.
    expect(effect.core).toBeFalsy();
  });

  it('the hit is live and a meaningful share of her total', () => {
    expect(D(rNoNuke)).toBeLessThan(D(base.res));
    expect(D(base.res) - D(rNoNuke)).toBeGreaterThan(0.01 * D(base.res));
  });

  it('already lands pre-Full-Burst, so an explicit noFb exemption is a no-op', () => {
    // Repo-measured: burst-cast damage resolves BEFORE the Full Burst window opens (no +50% major).
    // If forcing noFb changes the total, the 1350% hit is riding the FB major it should never see.
    expect(D(rNukeNoFb)).toBe(D(base.res));
  });
});

describe('trigger identity — team Full Burst vs her own burst (two-Burst-III fixture)', () => {
  it('the fixture is non-vacuous: some Full Bursts are not hers', () => {
    const fbStarts = helmBase.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const herCasts = helmBase.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(Number(e.value) - 27.5) < 1e-6 &&
        e.targetSlug === SLUG
    ).length;
    expect(fbStarts).toBeGreaterThanOrEqual(4);
    expect(herCasts).toBeGreaterThanOrEqual(1);
    // Strictly fewer casts than Full Bursts is what makes both counterfactuals below discriminating.
    expect(herCasts).toBeLessThan(fbStarts);
  });

  it('the weapon change fires on ANY team Full Burst, not only her own', () => {
    // Adding ownBurstGate:'cast' is the nearest-wrong reading of "when entering Full Burst".
    // It must LOSE her the Overdrive windows opened by the other Burst III.
    expect(D(rHelmSwapOwnGated)).toBeLessThan(D(helmBase.res));
    expect(D(helmBase.res) - D(rHelmSwapOwnGated)).toBeGreaterThan(
      0.005 * D(helmBase.res)
    );
  });

  it('the 27.5% Damage-Up fires only on her OWN cast, not on every Full Burst', () => {
    // Re-keying the self buff to fullBurstEnter is the nearest-wrong reading of a burst-slot self
    // line; in a two-Burst-III team it refreshes on Full Bursts she never paid a cast for.
    expect(D(rHelmBuffFbEnter)).toBeGreaterThan(D(helmBase.res));
  });
});

describe('documented gaps (not assertable from the kit prose)', () => {
  it.skip('GAP: no swapEnd trigger primitive — "when Overdrive ends" is proxied by fullBurstEnd. With a teammate granting fullBurstExtend the 10s weapon window closes BEFORE Full Burst ends, so the ammo dump fires late. No extender in this fixture, so the divergence is unobservable here.', () => {});

  it.skip('FLAGGED: the Overdrive duration is kit-silent — no prose bounds Super Duper Overdrive. Assumed to be the Full Burst window it is granted at; a measurement (count Overdrive shots per Full Burst on footage) is the only way to pin it.', () => {});

  it.skip('FLAGGED: burst-gauge economy of the 15-pellet swapped shotgun is unobservable from prose — per-trigger energy vs per-landed-pellet crediting at 15 rather than the base 10 pellets changes her own rotation feed. Needs a focus recording of the gauge bar.', () => {});
});
```

## 6. S6 BLIND OVERRIDE-WRITER (claude-opus-5, blind — kit-parse BLIND-STUDY)

### 6a. blind override

```json
{
  "slug": "drake-great-villain",
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
          "kind": "weaponSwap",
          "damagePct": 243.75,
          "chargeTimeSec": 1.5,
          "chargeTimeClamp": 1.5,
          "chargeMultPct": 300,
          "maxAmmo": 6,
          "weapon": "SG",
          "pelletCount": 15,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "consumeAmmo",
          "fraction": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 10.5,
          "maxStacks": 4
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "battleStart"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkOfMaxHpPct",
          "value": 6.23
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
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 27.5,
          "durationSec": 25
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
          "atkPct": 1350,
          "burstDesc": "allEnemies"
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
    "⚑ Swap window length is kit-silent: 'Super Duper Overdrive' has no stated duration, only an 'ends' clause. Authored durationSec 10 = the nominal Full Burst window; a fullBurstExtend granter (e.g. a 15s FB) would desync the swap from FB and from the ammo-dump proxy below.",
    "⚑ 'Activates when Super Duper Overdrive ends' has no swap-end trigger primitive; proxied to fullBurstEnd, which is exact only while the swap window equals the FB window.",
    "⚑ damagePct 243.75 is authored as the FULL-SHOT total across all 15 pellets (base-SG convention: normalAttackMultiplier 201.5 spans 10 pellets). If the kit line is per-pellet the shot is ~15× larger — split-vs-merge is unread.",
    "⚑ 'Charge Time: Fixed at 1.5 sec' authored as chargeTimeSec 1.5 + chargeTimeClamp 1.5 (the base weapon has chargeFrames 0, so the swap must both INTRODUCE a charge and pin it against charge-speed buffs). Whether the in-game 'fixed' also blocks charge-speed buffs from the FIRE-RATE side is unverified.",
    "⚑ Base cadence tuple (rate_of_fire, reloadFrames 111, ammo 9) is datamined and known-unreliable; the swap's own pulls/s is not stated at all and inherits the base SG cadence.",
    "S2a Max HP is granted to ALL allies including self, so the self-share feeds her own atkOfMaxHpPct conversion (e3 rule: caster===target) — her ATK ramps ~+42% of Max-HP-derived ATK after 4 Full Bursts. Ally-side grants are offensively inert but kept for kit completeness / future consumers.",
    "Burst flatDamage left at engine-default crit/core handling (no core: the text says plain Burst Skill damage) and no noFb — a burst cast resolves before the FB window opens, which is timing, not a per-unit exemption."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Drake: Great Villain (SG/Wind/Defender/Burst III). S1 replaces her shotgun with a 1.5s-fixed-charge 15-pellet SG (6 ammo, ×3 full charge) on every Full Burst entry, and dumps her whole magazine when that window closes (forcing a reload into the post-FB lull). S2 is an HP-to-ATK engine: a 4-stack team Max HP grant that ticks up at every Full Burst END, plus a permanent self ATK ▲ 6.23% of her own final Max HP, so her own share of the stacks compounds into her damage over the fight. Burst is a self Attack Damage ▲27.5%/25s plus a 1350% AoE nuke. No kit line is skipped (all three unmodeled arrays are empty).",
  "hasPierce": false
}
```

### 6b. blind audit + flags

```json
{
  "slug": "drake-great-villain",
  "leakDetected": null,
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates when entering Full Burst",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter (team-wide FB entry, NOT burstCast — the clause names Full Burst entry, so it fires on any team FB, incl. rotations she does not cast)"
    },
    {
      "slot": "skill1",
      "kitLine": "Changes the weapon in use: Super Duper",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap (real weapon change — NOT sameWeapon: the gun is replaced, so fresh magazine on entry / base weapon returned full on exit)"
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Time: Fixed at 1.5 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.chargeTimeSec 1.5 + chargeTimeClamp 1.5 (base chargeFrames 0 — the swap introduces the charge and pins it)"
    },
    {
      "slot": "skill1",
      "kitLine": "Damage: 243.75% of final ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.damagePct 243.75 (⚑ read as full-shot total, base-SG convention)"
    },
    {
      "slot": "skill1",
      "kitLine": "Pellet Count: 15",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.weapon 'SG' + pelletCount 15 (routes swap shots through the SG landing/gauge path; base hitsPerShot 10)"
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge Damage: 300%",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.chargeMultPct 300"
    },
    {
      "slot": "skill1",
      "kitLine": "Max Ammunition Capacity: 6",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.maxAmmo 6 (weapon-state modifier = damage: caps shots per window at 6 before a reload)"
    },
    {
      "slot": "skill1",
      "kitLine": "Activates when Super Duper Overdrive ends",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnd as a ⚑ proxy — no swap-end trigger primitive exists; exact only while swap duration == FB window"
    },
    {
      "slot": "skill1",
      "kitLine": "Removes 100% of ammo.",
      "status": "IMPLEMENTED",
      "effectOrReason": "consumeAmmo fraction 1 (empties the returned magazine and forces an immediate reload — a real damage cost, not a flavor line)"
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when Full Burst ends. All allies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnd, target allies (includes self — no excludeSelf in the text)"
    },
    {
      "slot": "skill2",
      "kitLine": "Max HP ▲10.5% of skill user's max HP",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterMaxHpPct 10.5, maxStacks 4, no durationSec ('continuously'); self-share feeds her own atkOfMaxHpPct"
    },
    {
      "slot": "skill2",
      "kitLine": "(without restoring HP). Stacks up to 4 times",
      "status": "IMPLEMENTED",
      "effectOrReason": "maxStacks 4; the no-restore parenthetical is a no-op at scope (no HP pool modeled), not a dropped mechanic"
    },
    {
      "slot": "skill2",
      "kitLine": "Activates at the start of battle. Self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger battleStart (literal wording; no durationSec = continuous, equivalent to passive here)"
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲6.23% of user's final max HP",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkOfMaxHpPct 6.23 — re-reads her LIVE Max HP each frame, so it tracks her own S2a stacks up"
    },
    {
      "slot": "burst",
      "kitLine": "Affects self. Attack Damage ▲27.5% 25s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast trigger, buff attackDamagePct 27.5 durationSec 25 (Damage Up bucket; 25s > her 40s CD window is NOT full uptime)"
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1350% of final ATK, all enemies",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast trigger, target enemy, flatDamage atkPct 1350, burstDesc 'allEnemies' (jackal/trina amp scope tag); no core (text says plain Burst Skill damage)"
    }
  ],
  "flags": [
    {
      "field": "skill1[0].effects[0].durationSec",
      "estimate": "10 sec (the nominal Full Burst window)",
      "reasoning": "The kit gives the swap an entry clause and an 'ends' clause but NO duration. The only stated boundary in the text is Full Burst itself, and the 6-round magazine at a 1.5s fixed charge spends ~9-10s, which is self-consistent with an FB-length window. Anything longer would let the overdrive weapon fire outside FB, which the text does not authorize.",
      "recipe": "Focus recording of a Drake: Great Villain FB: mark the frame the weapon model changes and the frame it reverts; compare against the FB banner end. Repeat once with a fullBurstExtend granter (e.g. modernia) in the team — if the swap tracks the extended FB, it is FB-bound; if it reverts at 10s regardless, it is a fixed timer."
    },
    {
      "field": "skill1[1].trigger",
      "estimate": "fullBurstEnd as a proxy for 'when Super Duper Overdrive ends'",
      "reasoning": "There is no swap-end trigger primitive in the schema. Keying to fullBurstEnd is exact ONLY under the assumption above (swap window == FB window). If the swap is a fixed timer shorter/longer than FB, or ends early on ammo-out, the ammo dump fires at the wrong frame and mis-times the following reload.",
      "recipe": "Same recording: count her post-FB shots. If she reloads immediately at FB end she was dumped on schedule; if she fires a partial base magazine first, the swap ended at a different time than FB."
    },
    {
      "field": "skill1[0].effects[0].damagePct",
      "estimate": "243.75 = FULL-SHOT total across all 15 pellets",
      "reasoning": "Base SG convention in this schema: a real SG unit's normalAttackMultiplier is the whole-shot total (hers is 201.5 across 10 pellets), and weaponSwap.damagePct is documented as the full-shot total, not per-pellet. The kit prints the damage and pellet count as two lines of one weapon spec, which reads the same way. But split-vs-merge is always kit-silent and the 15-vs-10 pellet change makes the error mode a clean ×15.",
      "recipe": "Read overdrive popups off a focus recording: count DISTINCT damage numbers per trigger pull (merged = 1 popup, split = up to 15) and check the summed value against 243.75% × final ATK × 3 (full charge)."
    },
    {
      "field": "skill1[0].effects[0].chargeTimeClamp / chargeTimeSec",
      "estimate": "both 1.5 sec",
      "reasoning": "'Fixed at' is the clamp wording, but her base weapon has chargeFrames 0, so a clamp alone may have nothing to clamp — the swap has to establish a 1.5s charge AND pin it against ally charge-speed buffs. Authoring both is the conservative reading; if the engine's clamp path alone suffices, chargeTimeSec is redundant but harmless.",
      "recipe": "Sim-side: run her with and without a charge-speed granter (e.g. an ally ▲ chargeSpeedPct) and assert the swapped shot interval is identical. Game-side: time charge-to-release in overdrive with a charge-speed buffer in team."
    },
    {
      "field": "base cadence / reload tuple",
      "estimate": "datamined ammo 9 / reloadFrames 111 / rate_of_fire as given",
      "reasoning": "ALWAYS-⚑: rate_of_fire and reloadFrames are known-unreliable datamine fields, and the swap does not state its own cadence so it inherits the base SG's. Her post-FB forced reload makes the reload figure load-bearing for total shots in a way it is not for most units.",
      "recipe": "Frame-count one base-weapon magazine (first shot to reload-complete) off a focus recording; compare shots-per-magazine and reload duration against the datamined tuple."
    },
    {
      "field": "skill2[0] stack accrual",
      "estimate": "1 stack per Full Burst END, cap 4 — no ramp haircut authored",
      "reasoning": "Unlike a fitted steady-state, the trajectory here is fully kit-stated: stacks accrue on an observable trigger the engine already fires, so the engine's own accrual IS the ramp (0 stacks before the first FB ends, cap reached after 4). No time-average is needed and one would be wrong at both ends. Flagged only because the resulting ATK curve — via the self-share feeding atkOfMaxHpPct — makes her damage strongly back-loaded and sensitive to full-burst COUNT.",
      "recipe": "Sim: assert buffApply events for stat 'maxHpFlat' fire exactly once per fullBurstEnd and stop at 4; cross-check her per-FB damage is monotonically increasing across the fight."
    }
  ],
  "model": "claude-opus-5"
}
```

### 6c. block-level diff — DRIVER vs BLIND override

### skill1: 1 identical block(s); 1 driver-only; 1 blind-only

- DRIVER ONLY: {"trigger":{"kind":"fullBurstEnd"},"target":{"kind":"self"},"effects":[{"kind":"instantReload"},{"kind":"consumeAmmo","fraction":1}],"gates":{}}
- BLIND ONLY: {"trigger":{"kind":"fullBurstEnd"},"target":{"kind":"self"},"effects":[{"kind":"consumeAmmo","fraction":1}],"gates":{}}

### skill2: 2 identical block(s); 0 driver-only; 0 blind-only

### burst: 2 identical block(s); 0 driver-only; 0 blind-only

## 7. THE DRIVER'S IMPLEMENTATION

### 7a. src/skills/overrides/drake-great-villain.json

```json
{
  "note": "VARIANT of base drake (Drake (Treasure) — SG/Attacker/Fire/Burst III); this is Drake: Great Villain — SG/Defender/Wind/Burst III (cd 40s), an entirely different unit. SKILL1: 'Activates when entering Full Burst' = ANY team Full Burst entry (fullBurstEnter — including rotations another Burst III completes; NOT burstCast, which would fire only on her own casts). The swap is encoded literally: weaponSwap damagePct 243.75 (the kit's 'Damage' line, read as the FULL-SHOT total across all pellets — the same convention as a real SG unit's normalAttackMultiplier), chargeTimeSec 1.5 + chargeTimeClamp 1.5 ('Charge Time: Fixed at 1.5 sec' — a fixed charge, so charge-speed buffs do not shorten it), chargeMultPct 300 ('Full Charge Damage: 300%'), maxAmmo 6, weapon 'SG' + pelletCount 15 (the swap is a real shotgun, so its shots take the SG pellet-landing / range-band / auto-core routing with a 15-pellet spread), durationSec 10 (the swap lives exactly as long as the Full Burst that summoned it). 'Activates when Super Duper Overdrive ends → Removes 100% of ammo' is keyed to fullBurstEnd (the swap's own end frame: it expires the frame Full Burst ends) as instantReload THEN consumeAmmo fraction 1: the instantReload stands in for the weapon change itself — the swap gun vanishes and the base shotgun comes back with a full magazine (owner ruling 2026-08-12 on real weapon swaps; the engine applies that same refill one step later in the frame) — and it matters because her 6 swap rounds are spent by ~9s into the window, so at Full Burst end she is mid-way through the swap gun's own reload, which the weapon change abandons; without the reset the ammo dump would find her already reloading and skip the fresh base-weapon reload the kit charges. The net effect is one full base-weapon reload starting at every Full Burst end, which is the kit's stated cost. SKILL2: 'when Full Burst ends → all allies: Max HP ▲ 10.5% of the skill user's max HP, stacks up to 4' = fullBurstEnd, allies (self included), casterMaxHpPct 10.5, maxStacks 4, no expiry ('continuously'). Her OWN stacks feed her Fashionably Late conversion (own-kit Max HP counts, ally-granted does not — the e3 rule), so her ATK steps up after each of the first four Full Bursts; allies' copies are offense-inert. 'Fashionably Late: ATK ▲ 6.23% of the skill user's final max HP continuously' = battleStart, self, atkOfMaxHpPct 6.23 (re-reads her LIVE Max HP every frame, so it tracks the stacks up — an apply-time snapshot would miss them). BURST: self Attack Damage ▲ 27.5% for 25 sec (attackDamagePct, own casts only) + 1350% of final ATK as Burst Skill damage to all enemies — cast-instant (no +50% Full Burst major), crit-eligible, unflavored, TAGGED burstDesc 'allEnemies' (literal-only amp rule, owner 2026-08-10). Kit-autonomy gauntlet 2026-09-03.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
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
          "kind": "weaponSwap",
          "damagePct": 243.75,
          "chargeTimeSec": 1.5,
          "chargeTimeClamp": 1.5,
          "chargeMultPct": 300,
          "maxAmmo": 6,
          "weapon": "SG",
          "pelletCount": 15,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "instantReload"
        },
        {
          "kind": "consumeAmmo",
          "fraction": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 10.5,
          "maxStacks": 4
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "battleStart"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkOfMaxHpPct",
          "value": 6.23
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
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 27.5,
          "durationSec": 25
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
          "atkPct": 1350,
          "burstDesc": "allEnemies"
        }
      ]
    }
  ],
  "caveats": [
    "skill1: the Super Duper Overdrive swap's SHOT ECONOMY is kit-silent beyond the stated 1.5s fixed charge and 6-round magazine — the engine fires one full-charge shot per 90 frames with no extra recovery animation, so a 10s window yields exactly 6 charged shots with no in-window reload. ⚑ estimate = 6 shots/window; recipe = count her charged-shot popups inside one Full Burst window in a focus video (any fewer means a per-shot recovery gap the datamine does not carry); tier = MEASUREMENT-GATED.",
    "skill1: 'Damage: 243.75% of final ATK' with 'Pellet Count: 15' is read as the FULL-SHOT total (15 pellets × 16.25% each), the convention every implemented SG unit's normalAttackMultiplier follows; the swap has no shot_detail record in data/characters.json to confirm the split. ⚑ estimate = 243.75% per full shot; recipe = read one charged-shot popup spread in a focus video (expect ~16.25% of final ATK × 3.0 per pellet, not one 243.75% hit); tier = MEASUREMENT-GATED.",
    "skill1: the FB-end ammo dump is keyed to fullBurstEnd rather than a swap-end trigger (none exists) — exact here because the swap's durationSec 10 ends on the same frame Full Burst does. A Full Burst extension from an ally would stretch the FB window past the swap's 10s (the dump would then fire at the extended end, after she has already resumed the base shotgun — up to one extra base reload).",
    "skill2: '(without restoring HP)' is honored by construction — the stack grant is a bare Max HP buff and emits NO recovery event, so on-recovery consumers (crown) never see it.",
    "skill2: the Max HP stacks are ally-wide but only HER copies move damage (own-kit Max HP feeds atkOfMaxHpPct; ally-granted does not — e3 rule), through Fashionably Late; the +10.5%-per-stack basis is her STATIC Max HP at apply time (casterMaxHpPct reads owner.maxHp), not her stacked live Max HP, so four stacks = +42% of base Max HP exactly rather than compounding.",
    "burst: the 1350% nuke is TAGGED burstDesc 'allEnemies' — her clause is the literal string trina's amp quotes ('Burst Skill damage of skills with \"Affects all enemies\"', owner ruling 2026-08-10: literal-only), so the nuke is amp-eligible whenever such an amp is live. Enforced roster-wide by scripts/tests/census-burst-amp-scope.test.ts."
  ]
}
```

### 7b. scripts/tests/units/drake-great-villain.test.ts

```ts
// PER-UNIT KIT SPEC — `drake-great-villain` (Drake: Great Villain, Defender/SG/Wind, Burst III,
// cd 40s, ammo 9, 10 pellets). VARIANT of base `drake` (Drake (Treasure) — SG/Attacker/Fire),
// an entirely different unit. Kit-autonomy gauntlet 2026-09-03. Tier 2 (fullBurstEnter swap on
// ANY team Full Burst; FB-end forced ammo dump; stacking caster-Max-HP grant feeding her own
// Max-HP→ATK conversion).
//
// One assertion group per KIT LINE (D1..D6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS.
//
// Kit (blablalink prose, data/characters.json → characters['drake-great-villain'].skills, L10):
//   S1 ■ when entering Full Burst → self: weapon swap "Super Duper Overdrive" — charge time fixed
//        1.5 sec, 243.75% of final ATK, 15 pellets, full-charge damage 300%, 6 rounds          [D1]
//      ■ when Super Duper Overdrive ends → self: removes 100% of ammo                          [D2]
//   S2 ■ when Full Burst ends → all allies: Max HP ▲ 10.5% of the skill user's max HP
//        (without restoring HP) continuously, stacks up to 4                                  [D3]
//      ■ battle start → self: Fashionably Late: ATK ▲ 6.23% of own final max HP continuously  [D4]
//   BU ■ self: Attack Damage ▲ 27.5% for 25 sec                                               [D5]
//      ■ all enemies: 1350% of final ATK as Burst Skill damage                                 [D6]
//
// Every line is modeled; the override's `unmodeled` is empty on all three slots.
//
// Why each assertion discriminates:
//   D1   the swap fires on EVERY Full Burst entry, including the rotations helm completes (the
//        control comp seats two B3s, so FB count > her cast count) — a burstCast reading only
//        swaps on her own rotations. Inside a window her shots are CHARGED, spaced by the 90f fixed
//        charge, exactly 6 per window (the magazine), at 243.75% × the same pellet-landing fraction
//        her base shotgun takes (weapon:'SG' routes the swap through the SG landing model), with
//        the ×3.0 full-charge multiplier and the +50% FB major (they land inside FB). Engine
//        gotcha pinned: a clamp-only encoding (no chargeTimeSec) never charges at all.
//   D2   at every Full-Burst-end frame she starts a FRESH base-weapon reload: her first post-FB
//        shot waits a full reload gap and a magazine reload lands in between. "No dump" resumes
//        firing within a shotgun cadence of FB end; a dump WITHOUT the weapon-change reset finds
//        her already mid-way through the swap gun's own reload and completes far too early.
//   D3   Max HP stacks land at every FB END (not entry), on all four allies, at 10.5% of her
//        static Max HP, capped at 4 (11 FB ends in the fixture), permanent. LOAD-BEARING through
//        her own conversion only (e3 rule): her out-of-FB shots' ATK basis rises by exactly
//        6.23% × 4 × 10.5% × maxHp after four stacks, while the allies' totals are byte-identical
//        with and without the grant (inert by mechanism: liveMaxHp reads only own-kit Max HP —
//        the fixture seats crown and helm, neither of which carries a Max-HP→ATK conversion).
//   D4   applies once at t=0, self, permanent; its FLAT contribution at t=0 is 6.23% × maxHp
//        (vs the no-line counterfactual); it re-reads LIVE Max HP so the D3 stacks feed it — the
//        apply-time-snapshot counterfactual (atkOfCasterMaxHpPct) matches at t=0 and diverges
//        after the stacks; a plain atkPct 6.23 is a different stat and total.
//   D5   self-only, once per HER cast, 25s; an all-allies reading lands on four targets and lifts
//        helm; a 10s reading carries a shorter expiry.
//   D6   kit magnitude, burst bucket, once per cast, crit-eligible, unflavored, NO +50% major (the
//        cast lands 22f before FB opens); a fullBurstEnter-keyed nuke would take the major.
//
// Fixture: controlComp — liter (B1) / crown (B2) / drake-great-villain (B3, focus) / helm (B3,
// alternating burst partner), boss Fire (neutral for Wind). Solo-B3 mirror: the same without helm
// (every Full Burst is hers). Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'drake-great-villain';
const DGV = 2;
const BASE_MULT = 201.5; // datamined full-shot normalAttackMultiplier (10 pellets)
const SWAP_MULT = 243.75; // kit "Damage" line (15-pellet full shot)
const SWAP_CHARGE_FRAMES = 90; // "Charge Time: Fixed at 1.5 sec"
const SWAP_AMMO = 6;

type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}, helm = true) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, helm),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  const u = unitOf(res, SLUG);
  return {
    events,
    totals: totals(res),
    staticAtk: u.staticAtk,
    maxHp: u.maxHp,
  };
}
type Run = ReturnType<typeof run>;

// ---- readers ----------------------------------------------------------------------------------
const uniq = <T>(xs: T[]) => [...new Set(xs)].sort();
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
const normals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.srcSlot === 'normal');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ownBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === DGV && b.stat === stat);
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const reloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === SLUG);
const fbWindows = (evs: SimEvent[]) =>
  evs
    .filter((e): e is FbStart => e.kind === 'fullBurstStart')
    .map((f) => ({ start: f.frame, end: f.endFrame }));
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);
const inWindow = <T extends { frame: number }>(
  xs: T[],
  w: { start: number; end: number }
) => xs.filter((x) => x.frame >= w.start && x.frame < w.end);
/** Windows in which at least one of her shots was CHARGED (= the swap was live). */
const swapWindows = (r: Run) =>
  fbWindows(r.events).filter((w) =>
    inWindow(shots(r.events), w).some((s) => s.charged)
  );
const firstShotAfter = (r: Run, frame: number) =>
  shots(r.events).find((s) => s.frame > frame);
/** Her out-of-FB normal shots keyed by frame (cadence is identical across the D3/D4 runs). */
const normalsByFrame = (r: Run) =>
  new Map(
    normals(r.events)
      .filter((d) => !d.inFullBurst)
      .map((d) => [d.frame, d])
  );

// ---- counterfactual patches -------------------------------------------------------------------
const patch = (mutate: (ov: any) => void) => withPatchedOverride(SLUG, mutate);
const swapBlock = (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (!b) {
    throw new Error(`${SLUG} swap block missing — fixture is stale`);
  }
  return b;
};
const swapEffect = (ov: any) =>
  swapBlock(ov).effects.find((e: any) => e.kind === 'weaponSwap');
const dumpBlock = (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'consumeAmmo')
  );
  if (!b) {
    throw new Error(`${SLUG} ammo-dump block missing — fixture is stale`);
  }
  return b;
};
const stackBlock = (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterMaxHpPct')
  );
  if (!b) {
    throw new Error(`${SLUG} Max HP stack block missing — fixture is stale`);
  }
  return b;
};
const flBlock = (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkOfMaxHpPct')
  );
  if (!b) {
    throw new Error(
      `${SLUG} Fashionably Late block missing — fixture is stale`
    );
  }
  return b;
};
const adBlock = (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b) {
    throw new Error(
      `${SLUG} burst Attack Damage block missing — fixture is stale`
    );
  }
  return b;
};
const nukeBlock = (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error(`${SLUG} burst nuke block missing — fixture is stale`);
  }
  return b;
};

/** D1: swap keyed to her OWN cast instead of any Full Burst entry. */
const swapAsBurstCast = patch((ov) => {
  swapBlock(ov).trigger = { kind: 'burstCast' };
});
/** D1: "Charge Time: Fixed at 1.5 sec" encoded as the clamp ALONE (engine gotcha: never charges). */
const swapClampOnly = patch((ov) => {
  delete swapEffect(ov).chargeTimeSec;
});
/** D1: the 300% full-charge multiplier dropped. */
const swapNoChargeMult = patch((ov) => {
  delete swapEffect(ov).chargeMultPct;
});
/** D1: the swap not declared a shotgun (no pellet-landing routing). */
const swapNotSg = patch((ov) => {
  delete swapEffect(ov).weapon;
  delete swapEffect(ov).pelletCount;
});
/** D2: the ammo dump dropped. */
const noDump = patch((ov) => {
  dumpBlock(ov);
  ov.skill1 = ov.skill1.filter(
    (x: any) => !x.effects.some((e: any) => e.kind === 'consumeAmmo')
  );
});
/** D2: the dump WITHOUT the weapon-change refill/reset in front of it. */
const dumpNoReset = patch((ov) => {
  dumpBlock(ov).effects = dumpBlock(ov).effects.filter(
    (e: any) => e.kind !== 'instantReload'
  );
});
/** D3: stacks keyed to Full Burst ENTRY. */
const stacksAsFbEnter = patch((ov) => {
  stackBlock(ov).trigger = { kind: 'fullBurstEnter' };
});
/** D3: "continuously" read as a 10s buff. */
const stacksTimed = patch((ov) => {
  stackBlock(ov).effects[0].durationSec = 10;
});
/** D3: "Stacks up to 4 times" dropped — the buff merely refreshes on each re-application. */
const stacksNoStacking = patch((ov) => {
  delete stackBlock(ov).effects[0].maxStacks;
});
/** D3: "all allies" collapsed to self. */
const stacksSelfOnly = patch((ov) => {
  stackBlock(ov).target = { kind: 'self' };
});
/** D3: the stack line dropped. */
const noStacks = patch((ov) => {
  stackBlock(ov);
  ov.skill2 = ov.skill2.filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'casterMaxHpPct')
  );
});
/** D4: Fashionably Late dropped. */
const noFl = patch((ov) => {
  flBlock(ov);
  ov.skill2 = ov.skill2.filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'atkOfMaxHpPct')
  );
});
/** D4: the conversion snapshotted at apply time (does not track her later stacks). */
const flSnapshot = patch((ov) => {
  flBlock(ov).effects[0].stat = 'atkOfCasterMaxHpPct';
});
/** D4: "% of final max HP" misread as a plain ATK %. */
const flAsAtkPct = patch((ov) => {
  flBlock(ov).effects[0].stat = 'atkPct';
});
/** D5: the self Attack Damage read as a team buff. */
const adAllies = patch((ov) => {
  adBlock(ov).target = { kind: 'allies' };
});
/** D5/D6: the self Attack Damage line dropped (the nuke must lose its same-cast +27.5%). */
const noAd = patch((ov) => {
  adBlock(ov);
  ov.burst = ov.burst.filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
});
/** D5: 25 sec read as the usual 10s window. */
const adShort = patch((ov) => {
  adBlock(ov).effects[0].durationSec = 10;
});
/** D6: the nuke keyed to Full Burst entry (would take the +50% major). */
const nukeAsFbEnter = patch((ov) => {
  nukeBlock(ov).trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const ctrl = run();
const solo = run({}, false);
const ctrlSwapBurstCast = run({ [SLUG]: swapAsBurstCast });
const ctrlSwapClampOnly = run({ [SLUG]: swapClampOnly });
const ctrlSwapNoMult = run({ [SLUG]: swapNoChargeMult });
const ctrlSwapNotSg = run({ [SLUG]: swapNotSg });
const ctrlNoDump = run({ [SLUG]: noDump });
const ctrlDumpNoReset = run({ [SLUG]: dumpNoReset });
const ctrlStacksFbEnter = run({ [SLUG]: stacksAsFbEnter });
const ctrlStacksTimed = run({ [SLUG]: stacksTimed });
const ctrlStacksNoStacking = run({ [SLUG]: stacksNoStacking });
const ctrlStacksSelfOnly = run({ [SLUG]: stacksSelfOnly });
const ctrlNoStacks = run({ [SLUG]: noStacks });
const ctrlNoFl = run({ [SLUG]: noFl });
const ctrlFlSnapshot = run({ [SLUG]: flSnapshot });
const ctrlFlAsAtkPct = run({ [SLUG]: flAsAtkPct });
const ctrlAdAllies = run({ [SLUG]: adAllies });
const ctrlAdShort = run({ [SLUG]: adShort });
const ctrlNoAd = run({ [SLUG]: noAd });
const ctrlNukeFbEnter = run({ [SLUG]: nukeAsFbEnter });

const ownCasts = casts(ctrl.events);
const windows = fbWindows(ctrl.events);
const ends = fbEnds(ctrl.events);
const STACK_VALUE = (10.5 / 100) * ctrl.maxHp;

describe('drake-great-villain — kit spec', () => {
  it('fixture sanity: two B3s alternate, so Full Bursts outnumber her own casts; solo-B3 they coincide', () => {
    expect(ownCasts.length).toBeGreaterThanOrEqual(5);
    expect(ownCasts.every((c) => c.stage === 3)).toBe(true);
    expect(windows.length).toBeGreaterThan(ownCasts.length);
    expect(ends.length).toBe(windows.length);
    expect(ends.length).toBeGreaterThanOrEqual(5);
    expect(fbWindows(solo.events).length).toBe(casts(solo.events).length);
  });

  describe('D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry', () => {
    it('is live in every Full Burst window, including the ones helm completes', () => {
      expect(swapWindows(ctrl).length).toBe(windows.length);
    });

    it('fires exactly 6 CHARGED shots per window on the 90f fixed charge, emptying the 6-round magazine', () => {
      let promptWindows = 0;
      for (const w of windows) {
        const ws = inWindow(shots(ctrl.events), w);
        expect(ws.length).toBe(SWAP_AMMO);
        expect(ws.every((s) => s.charged)).toBe(true);
        expect(ws.map((s) => s.ammoAfter)).toEqual([5, 4, 3, 2, 1, 0]);
        // never before one full charge has elapsed from the swap frame…
        expect(ws[0].frame - w.start).toBeGreaterThanOrEqual(
          SWAP_CHARGE_FRAMES - 1
        );
        if (ws[0].frame - w.start === SWAP_CHARGE_FRAMES - 1) {
          promptWindows++;
        }
        for (let i = 1; i < ws.length; i++) {
          expect(ws[i].frame - ws[i - 1].frame).toBe(SWAP_CHARGE_FRAMES);
        }
      }
      // …and exactly one charge after it in every window except where a scripted boss range
      // transition idles the team across the swap frame (at most one such window in this fight).
      expect(promptWindows).toBeGreaterThanOrEqual(windows.length - 1);
    });

    it('swap shots deal 243.75% × the SAME pellet-landing fraction her base shotgun takes, ×3.0 charge, +50% FB', () => {
      const shotByFrame = new Map(shots(ctrl.events).map((s) => [s.frame, s]));
      for (const w of windows) {
        const ds = inWindow(normals(ctrl.events), w);
        expect(ds.length).toBe(SWAP_AMMO);
        for (const d of ds) {
          const landed = shotByFrame.get(d.frame)!.hitFraction;
          expect(landed).toBeLessThan(1);
          expect(d.atkPct).toBeCloseTo(SWAP_MULT * landed, 6);
          expect(d.mult.charge).toBeCloseTo(3, 6);
          expect(d.fbMajorApplied).toBe(true);
        }
      }
      // ...and her base shots outside the window carry the base multiplier on the same routing.
      const outside = normals(ctrl.events).filter((d) => !d.inFullBurst);
      expect(outside.length).toBeGreaterThan(50);
      for (const d of outside) {
        expect(d.atkPct).toBeCloseTo(
          BASE_MULT * shotByFrame.get(d.frame)!.hitFraction,
          6
        );
        expect(d.mult.charge).toBe(1);
      }
    });

    it('IS LOAD-BEARING: the swap window is where most of her damage lands', () => {
      const inFb = normals(ctrl.events).filter((d) => d.inFullBurst);
      const sumIn = inFb.reduce((s, d) => s + d.amount, 0);
      const sumOut = normals(ctrl.events)
        .filter((d) => !d.inFullBurst)
        .reduce((s, d) => s + d.amount, 0);
      expect(sumIn).toBeGreaterThan(sumOut);
    });

    it('DISCRIMINATING: a burstCast reading swaps only on her own rotations', () => {
      const cf = swapWindows(ctrlSwapBurstCast);
      expect(cf.length).toBe(casts(ctrlSwapBurstCast.events).length);
      expect(cf.length).toBeLessThan(windows.length);
    });

    it('DISCRIMINATING (engine gotcha): a clamp-only swap never charges — no charged shot at all', () => {
      expect(shots(ctrlSwapClampOnly.events).some((s) => s.charged)).toBe(
        false
      );
      expect(ctrlSwapClampOnly.totals[SLUG]).not.toBe(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: without the 300% full-charge line the swap shots lose the ×3', () => {
      const ds = windows.flatMap((w) =>
        inWindow(normals(ctrlSwapNoMult.events), w)
      );
      expect(ds.length).toBe(SWAP_AMMO * windows.length);
      expect(uniq(ds.map((d) => d.mult.charge))).toEqual([1]);
    });

    it('DISCRIMINATING: a non-shotgun swap skips the pellet-landing fraction (full 243.75% every shot)', () => {
      const ds = windows.flatMap((w) =>
        inWindow(normals(ctrlSwapNotSg.events), w)
      );
      expect(ds.length).toBeGreaterThan(0);
      expect(uniq(ds.map((d) => d.atkPct))).toEqual([SWAP_MULT]);
    });
  });

  describe('D2 — S1 when Super Duper Overdrive ends: removes 100% of ammo (forced base reload)', () => {
    /** Frame gap from each Full Burst end to the first reload that completes after it. */
    const reloadGapsAfterEnds = (r: Run) =>
      fbEnds(r.events)
        .map((e) => reloads(r.events).find((x) => x.frame > e))
        .filter((x): x is Reload => x !== undefined)
        .map((x, i) => x.frame - fbEnds(r.events)[i]);

    // In this comp her 9-round base magazine runs dry just as the next Full Burst opens (the swap
    // entry cancels that reload), so the fight holds no clean natural base reload to read a gap off.
    // The forced reload is therefore pinned on its own terms: it starts ON the Full-Burst-end frame
    // and takes one full effective reload (base 111f, shortened by crown's reload-speed buff) —
    // the same constant after every window, with no shot inside it.
    it('starts a FRESH base-weapon reload at every Full Burst end: one full effective reload, no shot inside it', () => {
      const gaps = reloadGapsAfterEnds(ctrl);
      expect(gaps.length).toBeGreaterThanOrEqual(ends.length - 1);
      expect(uniq(gaps).length).toBe(1);
      const gap = gaps[0];
      expect(gap).toBeGreaterThanOrEqual(60);
      for (const e of ends) {
        const first = firstShotAfter(ctrl, e);
        if (!first) {
          continue; // the fight ended inside the reload
        }
        expect(first.frame - e).toBeGreaterThan(gap);
        expect(first.ammoAfter).toBe(8); // a fresh 9-round base magazine
      }
    });

    it('DISCRIMINATING: without the dump, the swap gun’s half-done reload just completes — she is firing again within a shotgun cadence', () => {
      // Judged on the TYPICAL window (median): where a boss transition delays the swap's first shot,
      // the 6th round leaves the swap gun only frames before FB end and its leftover reload is
      // nearly a full one — a rotation accident, not the dump.
      const median = (xs: number[]) =>
        [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
      const gaps = reloadGapsAfterEnds(ctrlNoDump);
      expect(gaps.length).toBeGreaterThanOrEqual(5);
      expect(median(gaps)).toBeLessThan(30);
      const resumed = fbEnds(ctrlNoDump.events)
        .map((e) => firstShotAfter(ctrlNoDump, e))
        .filter((s): s is Shot => s !== undefined)
        .map((s, i) => s.frame - fbEnds(ctrlNoDump.events)[i]);
      expect(median(resumed)).toBeLessThan(60);
      // …whereas the shipped model NEVER lets her resume that fast.
      expect(Math.min(...reloadGapsAfterEnds(ctrl))).toBeGreaterThanOrEqual(60);
      expect(ctrlNoDump.totals[SLUG]).toBeGreaterThan(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: a dump WITHOUT the weapon-change reset finds her already reloading and changes nothing', () => {
      expect(reloadGapsAfterEnds(ctrlDumpNoReset)).toEqual(
        reloadGapsAfterEnds(ctrlNoDump)
      );
      expect(ctrlDumpNoReset.totals[SLUG]).toBe(ctrlNoDump.totals[SLUG]);
    });
  });

  describe('D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent', () => {
    const applied = ownBuff(ctrl.events, 'maxHpFlat');

    it('lands on every Full-Burst-END frame, on all four allies, at 10.5% of her static Max HP, no expiry', () => {
      expect(uniq(applied.map((b) => b.frame))).toEqual(uniq(ends));
      for (const e of ends) {
        expect(
          uniq(applied.filter((b) => b.frame === e).map((b) => b.targetIdx))
        ).toEqual([0, 1, 2, 3]);
      }
      for (const b of applied) {
        expect(b.value).toBeCloseTo(STACK_VALUE, 1);
        expect(b.expiresFrame).toBeNull();
        expect(b.maxStacks).toBe(4);
      }
    });

    it('stacks 1,2,3,4 on the first four ends and holds at 4 thereafter', () => {
      const own = applied.filter((b) => b.targetIdx === DGV);
      expect(own.map((b) => b.stacks)).toEqual(
        ends.map((_, i) => Math.min(i + 1, 4))
      );
    });

    it('IS LOAD-BEARING through her OWN conversion: after four stacks her ATK basis is +6.23% × 4 × 10.5% × maxHp', () => {
      const a = normalsByFrame(ctrl);
      const b = normalsByFrame(ctrlNoStacks);
      const before = [...a.keys()].filter((f) => f < ends[0]);
      const after = [...a.keys()].filter((f) => f > ends[3]);
      expect(before.length).toBeGreaterThan(0);
      expect(after.length).toBeGreaterThan(0);
      for (const f of before) {
        expect(b.get(f)?.baseAtk).toBe(a.get(f)!.baseAtk);
      }
      const expectedLift = (6.23 / 100) * 4 * STACK_VALUE;
      for (const f of after) {
        expect(a.get(f)!.baseAtk - b.get(f)!.baseAtk).toBeCloseTo(
          expectedLift,
          0
        );
      }
    });

    it('is inert on the allies (e3 rule): liter/crown/helm totals byte-identical with and without the grant', () => {
      for (const s of ['liter', 'crown', 'helm']) {
        expect(ctrlNoStacks.totals[s]).toBe(ctrl.totals[s]);
      }
      expect(ctrlNoStacks.totals[SLUG]).toBeLessThan(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: an FB-ENTRY reading lands on the start frames, not the end frames', () => {
      const cf = ownBuff(ctrlStacksFbEnter.events, 'maxHpFlat');
      expect(uniq(cf.map((b) => b.frame))).toEqual(
        uniq(fbWindows(ctrlStacksFbEnter.events).map((w) => w.start))
      );
    });

    it('DISCRIMINATING: a timed reading expires; a non-stacking reading only refreshes; self-only skips the allies', () => {
      expect(
        uniq(
          ownBuff(ctrlStacksTimed.events, 'maxHpFlat').map(
            (b) => b.expiresFrame !== null
          )
        )
      ).toEqual([true]);
      // "Stacks up to 4 times" dropped → every re-application refreshes the single instance
      expect(
        Math.max(
          ...ownBuff(ctrlStacksNoStacking.events, 'maxHpFlat').map(
            (b) => b.stacks
          )
        )
      ).toBe(1);
      expect(ctrlStacksNoStacking.totals[SLUG]).toBeLessThan(ctrl.totals[SLUG]);
      expect(
        uniq(
          ownBuff(ctrlStacksSelfOnly.events, 'maxHpFlat').map(
            (b) => b.targetIdx
          )
        )
      ).toEqual([DGV]);
    });
  });

  describe('D4 — S2 Fashionably Late: ATK ▲ 6.23% of her final max HP continuously, from battle start', () => {
    const applied = ownBuff(ctrl.events, 'atkOfMaxHpPct');

    it('applies once at t=0, self, no expiry', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].value).toBe(6.23);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].targetIdx).toBe(DGV);
      expect(applied[0].expiresFrame).toBeNull();
    });

    it('IS LOAD-BEARING: at t=0 it is worth exactly 6.23% of her Max HP in flat ATK', () => {
      const a = normalsByFrame(ctrl);
      const b = normalsByFrame(ctrlNoFl);
      const first = Math.min(...a.keys());
      expect(a.get(first)!.baseAtk - b.get(first)!.baseAtk).toBeCloseTo(
        (6.23 / 100) * ctrl.maxHp,
        0
      );
      expect(ctrlNoFl.totals[SLUG]).toBeLessThan(ctrl.totals[SLUG]);
    });

    it('DISCRIMINATING: an apply-time snapshot matches at t=0 but misses the later stacks', () => {
      const a = normalsByFrame(ctrl);
      const b = normalsByFrame(ctrlFlSnapshot);
      const first = Math.min(...a.keys());
      expect(b.get(first)!.baseAtk).toBeCloseTo(a.get(first)!.baseAtk, 0);
      const expectedLift = (6.23 / 100) * 4 * STACK_VALUE;
      for (const f of [...a.keys()].filter((x) => x > ends[3])) {
        expect(a.get(f)!.baseAtk - b.get(f)!.baseAtk).toBeCloseTo(
          expectedLift,
          0
        );
      }
    });

    it('DISCRIMINATING: a plain ATK % is a different stat and total', () => {
      expect(ownBuff(ctrlFlAsAtkPct.events, 'atkOfMaxHpPct')).toEqual([]);
      expect(ctrlFlAsAtkPct.totals[SLUG]).not.toBe(ctrl.totals[SLUG]);
    });
  });

  describe('D5 — burst: self Attack Damage ▲ 27.5% for 25 sec', () => {
    const applied = ownBuff(ctrl.events, 'attackDamagePct').filter(
      (b) => b.value === 27.5
    );

    it('grants once per HER cast, self only, 25 sec', () => {
      expect(applied.length).toBe(ownCasts.length);
      expect(uniq(applied.map((b) => b.frame))).toEqual(
        uniq(ownCasts.map((c) => c.frame))
      );
      for (const b of applied) {
        expect(b.targetIdx).toBe(DGV);
        expect(b.expiresFrame! - b.frame).toBe(25 * 60);
      }
    });

    it('DISCRIMINATING: an all-allies reading lands on four targets and lifts helm; a 10s reading expires early', () => {
      const cf = ownBuff(ctrlAdAllies.events, 'attackDamagePct').filter(
        (b) => b.value === 27.5
      );
      expect(cf.length).toBe(4 * casts(ctrlAdAllies.events).length);
      expect(ctrlAdAllies.totals.helm).toBeGreaterThan(ctrl.totals.helm);
      const short = ownBuff(ctrlAdShort.events, 'attackDamagePct').filter(
        (b) => b.value === 27.5
      );
      expect(uniq(short.map((b) => b.expiresFrame! - b.frame))).toEqual([600]);
    });
  });

  describe('D6 — burst: 1350% of final ATK as Burst Skill damage to all enemies', () => {
    const nukes = dmg(ctrl.events).filter((d) => d.srcSlot === 'burst');

    it('fires once per cast at the kit magnitude, in the burst bucket, crit-eligible, unflavored', () => {
      expect(nukes.length).toBe(ownCasts.length);
      expect(uniq(nukes.map((d) => d.frame))).toEqual(
        uniq(ownCasts.map((c) => c.frame))
      );
      expect(uniq(nukes.map((d) => d.atkPct))).toEqual([1350]);
      expect(uniq(nukes.map((d) => d.bucket))).toEqual(['burst']);
      expect(uniq(nukes.map((d) => d.critEligible))).toEqual([true]);
      expect(uniq(nukes.map((d) => d.mult.distributed))).toEqual([1]);
    });

    it('casts BEFORE the Full Burst window opens: no +50% major, FB not yet live, no range bonus', () => {
      expect(uniq(nukes.map((d) => d.fbMajorApplied))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.inFullBurst))).toEqual([false]);
      expect(uniq(nukes.map((d) => d.rangeApplied))).toEqual([false]);
    });

    it('carries her OWN same-cast Attack Damage ▲ 27.5% (the buff line precedes the damage line)', () => {
      const cf = dmg(ctrlNoAd.events).filter((d) => d.srcSlot === 'burst');
      expect(cf.length).toBe(nukes.length);
      for (let i = 0; i < nukes.length; i++) {
        expect(nukes[i].mult.dmgUp - cf[i].mult.dmgUp).toBeCloseTo(0.275, 6);
      }
    });

    it("is TAGGED 'allEnemies' (trina's literal amp string) and carries no flavor", () => {
      const ov = loadOverride(SLUG) as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.burstDesc).toBe('allEnemies');
      expect(nuke.flavor).toBeUndefined();
    });

    it('DISCRIMINATING: a Full-Burst-entry-keyed nuke would take the +50% major inside FB', () => {
      const cf = dmg(ctrlNukeFbEnter.events).filter(
        (d) => d.srcSlot === 'burst'
      );
      expect(cf.length).toBeGreaterThan(0);
      expect(uniq(cf.map((d) => d.fbMajorApplied))).toEqual([true]);
    });
  });
});
```

## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES

### 8a. S2d matrix (scripts/kit-autonomy/reviews/drake-great-villain.verify.txt)

```text
S2d INDEPENDENT VERIFICATION MATRIX — drake-great-villain — kit-autonomy gauntlet 2026-09-03
Command: npx vitest run scripts/tests/units/drake-great-villain.test.ts --reporter=verbose (shipped override on disk; every DISCRIMINATING case runs the named nearest-wrong counterfactual via withPatchedOverride in the same file and asserts it diverges — GREEN-vs-shipped and RED-vs-counterfactual are both inside the listed assertions).

 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > fixture sanity: two B3s alternate, so Full Bursts outnumber her own casts; solo-B3 they coincide
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > is live in every Full Burst window, including the ones helm completes
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > fires exactly 6 CHARGED shots per window on the 90f fixed charge, emptying the 6-round magazine
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > swap shots deal 243.75% × the SAME pellet-landing fraction her base shotgun takes, ×3.0 charge, +50% FB
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > IS LOAD-BEARING: the swap window is where most of her damage lands
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > DISCRIMINATING: a burstCast reading swaps only on her own rotations
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > DISCRIMINATING (engine gotcha): a clamp-only swap never charges — no charged shot at all
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > DISCRIMINATING: without the 300% full-charge line the swap shots lose the ×3
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D1 — S1 Super Duper Overdrive: weapon swap on EVERY Full Burst entry > DISCRIMINATING: a non-shotgun swap skips the pellet-landing fraction (full 243.75% every shot)
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D2 — S1 when Super Duper Overdrive ends: removes 100% of ammo (forced base reload) > starts a FRESH base-weapon reload at every Full Burst end: one full effective reload, no shot inside it
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D2 — S1 when Super Duper Overdrive ends: removes 100% of ammo (forced base reload) > DISCRIMINATING: without the dump, the swap gun’s half-done reload just completes — she is firing again within a shotgun cadence
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D2 — S1 when Super Duper Overdrive ends: removes 100% of ammo (forced base reload) > DISCRIMINATING: a dump WITHOUT the weapon-change reset finds her already reloading and changes nothing
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent > lands on every Full-Burst-END frame, on all four allies, at 10.5% of her static Max HP, no expiry
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent > stacks 1,2,3,4 on the first four ends and holds at 4 thereafter
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent > IS LOAD-BEARING through her OWN conversion: after four stacks her ATK basis is +6.23% × 4 × 10.5% × maxHp
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent > is inert on the allies (e3 rule): liter/crown/helm totals byte-identical with and without the grant
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent > DISCRIMINATING: an FB-ENTRY reading lands on the start frames, not the end frames
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D3 — S2 on Full Burst end: all allies Max HP ▲ 10.5% of her max HP, stacks to 4, permanent > DISCRIMINATING: a timed reading expires; a non-stacking reading only refreshes; self-only skips the allies
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D4 — S2 Fashionably Late: ATK ▲ 6.23% of her final max HP continuously, from battle start > applies once at t=0, self, no expiry
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D4 — S2 Fashionably Late: ATK ▲ 6.23% of her final max HP continuously, from battle start > IS LOAD-BEARING: at t=0 it is worth exactly 6.23% of her Max HP in flat ATK
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D4 — S2 Fashionably Late: ATK ▲ 6.23% of her final max HP continuously, from battle start > DISCRIMINATING: an apply-time snapshot matches at t=0 but misses the later stacks
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D4 — S2 Fashionably Late: ATK ▲ 6.23% of her final max HP continuously, from battle start > DISCRIMINATING: a plain ATK % is a different stat and total
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D5 — burst: self Attack Damage ▲ 27.5% for 25 sec > grants once per HER cast, self only, 25 sec
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D5 — burst: self Attack Damage ▲ 27.5% for 25 sec > DISCRIMINATING: an all-allies reading lands on four targets and lifts helm; a 10s reading expires early
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D6 — burst: 1350% of final ATK as Burst Skill damage to all enemies > fires once per cast at the kit magnitude, in the burst bucket, crit-eligible, unflavored
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D6 — burst: 1350% of final ATK as Burst Skill damage to all enemies > casts BEFORE the Full Burst window opens: no +50% major, FB not yet live, no range bonus
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D6 — burst: 1350% of final ATK as Burst Skill damage to all enemies > carries her OWN same-cast Attack Damage ▲ 27.5% (the buff line precedes the damage line)
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D6 — burst: 1350% of final ATK as Burst Skill damage to all enemies > is TAGGED 'allEnemies' (trina's literal amp string) and carries no flavor
 ✓ scripts/tests/units/drake-great-villain.test.ts > drake-great-villain — kit spec > D6 — burst: 1350% of final ATK as Burst Skill damage to all enemies > DISCRIMINATING: a Full-Burst-entry-keyed nuke would take the +50% major inside FB

assertions passed: 29
```

### 8b. Driver notes (convergence run + findings the blind roles could not see)

# Driver notes — `drake-great-villain` (Drake: Great Villain) — kit-autonomy gauntlet 2026-09-03

Driver: Claude Fable 5.1 (this harness). Routing (owner instruction for this run): the roles the
protocol pins to `claude-fable-5` went to `kimi-code/k3`; S5/S6 stayed on `claude-opus-5`; Tier-2 second
S2b reviewer `claude-opus-5`; S7 judge `kimi-code/k3` (+ `claude-opus-5` as the Tier-2 second judge).

Exact slug: `drake-great-villain` (Drake: Great Villain — SG / Defender / Wind / Burst III) is a VARIANT of
base `drake` (Drake (Treasure) — SG / Attacker / Fire / Burst III); entirely different kit.

## Convergence run — S5 blind test vs the driver's shipped override (UNMODIFIED file)

`blind/drake-great-villain.test.ts` compiles and runs as-is: **22 passed / 1 failed / 3 skipped** (the skips are
the blind author's own documented gaps: swap-end trigger proxy, swap duration ⚑, swap gauge economy ⚑).

The one RED: _"dropping the ammo dump OVER-credits drake (it costs her a reload every cycle)"_ — asserted
on the blind author's **solo-B3 fixture** (liter / crown / drake-great-villain). Removing the dump there
LOWERS her total (334.4M vs 348.3M) even though she fires MORE shots (179 vs 173). Cause: **rotation
sensitivity, not faithfulness** — the extra post-FB shots change her burst-gauge feed, the chain timing
shifts, and two of the five Full Bursts land later (FB starts 761/3357/6074/**8843**/10751 vs
761/3377/6266/**8174**/10082), costing more window damage than the extra base shots add. On the driver's
control fixture (liter / crown / drake-great-villain / helm, 11 Full Bursts pinned by the alternating
partner) the same counterfactual moves her the expected way: +14.3M (688.2M vs 673.8M), and the driver test
pins that direction. The blind author's claim is right in mechanism (the dump costs a full base reload per
window) and wrong only in the fixture it chose to prove it on.

## The driver-only finding — engine ordering at the Full-Burst-end frame

All four blind roles encode "when Super Duper Overdrive ends → removes 100% of ammo" as `fullBurstEnd` +
`consumeAmmo{fraction:1}` (the S6 override is otherwise block-identical to the driver's). **In this
engine that bare encoding is inert:** her 6 swap rounds are spent by ~9 s into the window, so at the
Full-Burst-end frame she is already mid-way through the swap gun's own reload. `consumeAmmo` only forces
a reload when the target is NOT already reloading (`!t.reloading` guard, sim.ts `consumeAmmo`), and the
Full-Burst-end triggers resolve BEFORE the same-frame swap expiry hands the base shotgun back full
(sim.ts: the `fbEndFrame === frame` section runs ahead of the per-unit FSM's `frame >= swap.untilFrame`
check). Net: the swap-gun reload completes ~12 f after FB end with a full base magazine — she pays no
reload at all. Probe evidence (control fixture, first window): FB end 944 → reload event at **956**.

The driver's encoding is `instantReload` THEN `consumeAmmo` on the same `fullBurstEnd` block: the
instantReload stands in for the weapon change (the swap gun vanishes, the base gun returns full —
owner ruling 2026-08-12 on real weapon swaps — which the engine applies one step later in the frame
anyway) and, by clearing `reloading`, lets the dump start a FRESH base reload on the Full-Burst-end frame:
reload event at **1016** (= 944 + 72 f, the effective base reload under crown's reload-speed buff), first
post-FB shot at 1040 with a fresh 9-round magazine. The driver test's `dumpNoReset` counterfactual (bare
`consumeAmmo`) is pinned byte-identical to `noDump`.

## Divergences the driver reconciled (S2c)

1. **Shot count per window.** The opus S2b reviewer expected ~5 charged shots (1.5 s + the 22 f release
   latency). In this engine the bolt-recovery latency applies only to SR/RL BASE weapons and never while
   swapped (`sim.ts`: `(weapon === 'SR' || 'RL') && !u.swap`), so the engine fires exactly 6 at a 90 f
   cadence. The driver carries this as the shot-economy ⚑ (recipe: count charged-shot popups in one window).
2. **`chargeTimeClamp` vs `chargeTimeSec`.** Both reviewers asked for the clamp ("Fixed at"). The driver
   ships BOTH: the engine enters the charge branch only when the swap declares `chargeTimeSec` (a clamp
   alone inherits the base shotgun's `chargeFrames 0` and never charges — the `swapClampOnly` counterfactual
   pins that gotcha), and the clamp pins the 1.5 s against ally charge-speed buffs.
3. **Nuke crit.** kimi S2b: "burst skill damage does not crit in-game". The engine's roster-wide rider
   convention is crit-eligible at the caster's rate (yukiko's nuke pinned `critEligible === true`,
   2026-08-19); not a per-unit question — reported, not changed.
4. **Same-cast +27.5% on the nuke** (kimi): the buff block precedes the damage block; pinned
   (`nukes[i].mult.dmgUp − noAd == 0.275`).
5. **"(without restoring HP)"**: kimi listed it as unmodeled-verbatim, opus said it belongs inside the
   modeled block. The stack grant emits no recovery event, so the parenthetical is honored by construction;
   recorded as a caveat, `unmodeled` stays empty.
6. **First swap shot offset.** One of the 11 windows fires its first charged shot 149 f after the swap
   frame instead of 89 f (a scripted boss range transition idles the team across the swap frame); the
   test allows at most one such window per fight.
