# velvet — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Velvet (`velvet`) — Wind · SR · Supporter · Burst II · 20s CD · ammo 6 · reloadFrames 141 ·
chargeFrames 60 · chargeMultiplier 250 · hitsPerShot 1 · normalMult 69.04 / coreMult 200 · critRate 15 /
critDamage 150 · Tetra.

**Verdict:** 🟢 **GO** · faithfulness **0.95** (every kit line FAITHFUL or documented UNMODELED/GAP; 0 real
gotchas) · **cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. Score
docked 1.0→0.95 for the three measurement-gated ⚑ items (hitCount in-FB counting fidelity; weaponSwap shot
cadence; "Full Charge" identity of swap shots — all owner/footage-gated; structure is certified, magnitudes are
not). NOTE: Velvet is fight-VALIDATED + tuned (T5 wind-weak recording, 1.50→1.05, board 1.017); the gauntlet
certifies STRUCTURE only and deliberately leaves `tier: VALIDATED` / `tuned: true` untouched.

---

## 1. Real kit (data/characters.json — ground truth)

- **S1** ■ Start of battle + entering Burst Stage 2 (Bullet Snatch): Effect 1 all enemies — removes 5% ammo;
  Effect 2 self — fills the ammo pouch to 6000 (max 6000, continuous, unremovable).
  - ■ Attacking with Full Charge while NOT in Full Burst (self): expend 100 pouch ammo; ATK ▲ 30.5% / 3s;
    Attack Damage ▲ 30.5% / 3s.
- **S2** ■ Attacking with Full Charge during Full Burst: Effect 1 self — expend 300 pouch ammo; Effect 2 all
  allies — ATK ▲ 25.2% of the skill user's ATK / 3s continuously; Effect 3 all allies — Charge Damage ▲ 100.8% / 3s.
  - ■ After landing 50 normal attacks during Full Burst: Effect 1 self — expend 300 pouch ammo; Effect 2 self —
    Attack Damage ▲ 15.03% / 5s; Effect 3 target — 400.92% of final ATK as additional damage.
- **Burst** ■ Self — Changes the weapon in use: Damage 7% of final ATK, 10s. Additional Effect: Attack Damage
  ▲ 34.52% / 10s.

---

## 2. What the code does (the faithful override, line by line)

- **S1 Bullet Snatch (pouch fill + enemy ammo removal)** **UNMODELED** (documented verbatim in `unmodeled.skill1`
  + note). The ammo pouch is derivably **NEVER-BINDING**: max drain per 20s rotation ≈ 7 outFb charges×100 + 7
  inFb charges×300 + ≤1 proc×300 ≈ 3.1k « the 6000 cap, refilled to cap at every Burst-Stage-2 entry — so every
  ammo-gated effect fires at full uptime and the pouch bookkeeping is dropped (model-or-omit is damage-neutral).
  The enemy bullet-steal is inert in v1 (no enemy entity — `resolveTargets({enemy})` is empty). **V1 actively PINS
  the inertness** (Velvet emits ZERO maxAmmo buffs; stripping her whole skill1 leaves liter/helm totals
  byte-identical) and discriminates the nearest-wrong (a sign-flipped `consumeAmmo` on ALLIES forces ally reloads,
  53>33). NOT a silent drop, NOT a bare `it.skip`. All four agents converged (driver, fable UNMODELED, opus S5
  `it.skip`/GAP, opus S6 — which modeled the pouch explicitly with gates but its OWN ⚑#1 says delete-if-continuous,
  converging on the drop).
- **S1 out-of-FB self buff** `shotFired → self → atkPct 30.5 + attackDamagePct 30.5 (3s), fbGate:outFb` — "Full
  Charge while NOT in Full Burst". For an SR in auto-play every trigger pull IS a full charge, so `shotFired` is
  the faithful proxy for "Full Charge attack"; the `outFb` gate is the load-bearing clause (the schema's canonical
  outFb example is Velvet). TWO distinct stats — `atkPct` (ATK bucket) AND `attackDamagePct` (Damage-Up bucket),
  NOT a collapsed `atkPct 61`. The override note records this as a CORRECTION vs an earlier draft that leaked the
  buff through FB windows (~72% uptime, where the +50% FB major lives). V2 discriminates BOTH the gate (0 in-FB
  applies; dropping outFb lets it refresh in-FB) and the collapse (atkPct 61 = 0).
- **S2 in-FB team buff** `shotFired → allies → casterAtkPct 25.2 + chargeDamagePct 100.8 (3s), fbGate:inFb` —
  "Full Charge during Full Burst". "ATK ▲25.2% of the skill user's ATK" = `casterAtkPct` (a FLAT add of Velvet's
  ATK, resolving to ~25133 at apply), correctly NOT `atkPct` (a 25.2% scaler on each ally's own ATK). "Charge
  Damage ▲100.8%" = `chargeDamagePct` (additive points in the charge bucket), correctly NOT `chargeDamageMultPct`
  (a base-charge multiplier). "All allies" INCLUDES Velvet herself (no "except self" clause — reaches slots
  0/1/2). V3 discriminates all three nearest-wrongs (drop-inFb → applies outside FB; atkPct → value 25.2 scaler +
  casterAtkPct absent; chargeDamageMultPct). **Documented caveat (not asserted):** the team buff is kept alive by
  SWAPPED shots during Velvet's own 10s burst weapon-swap — `shotFired` fires on swap shots; whether the 7% swap
  weapon satisfies "Full Charge" is measurement-gated (⚑, needs footage).
- **S2 50-hit proc** `hitCount:50 → self attackDamagePct 15.03/5s + enemy flatDamage 400.92, fbGate:inFb` — "after
  landing 50 normal attacks during Full Burst". An SR lands ~10 hits per FB window, so 50 in-FB hits is unreachable
  in a 180s fight: the faithful encoding fires **ZERO procs** here — a NON-VACUOUS absence (both counterfactuals
  fire: drop-inFb → 2 out-of-FB procs as the cumulative 50th hit lands outside FB; hitCount 5 → 10 in-FB procs at
  atkPct=400.92 + self 15.03/5s). The flatDamage is bucket 'skill', no core/crit/range clause stated (none
  granted), and lands in FB by timing (so the +50% major applies). ⚑ The engine `hitCount` counts ALL cumulative
  hits and `fbGate` gates fire-time only — true in-FB-only counting / per-FB reset is inexpressible; both readings
  converge on 0 procs in this fixture, so the choice is inert/damage-neutral here (DOCUMENTED-GAP fidelity
  hypothesis, NOT a modeled≠working silent drop).
- **Burst** `burstCast → self → weaponSwap damagePct 7 (10s) + attackDamagePct 34.52 (10s)` — "Changes the weapon
  in use: Damage 7% of final ATK, 10s. Additional Effect: Attack Damage ▲34.52% / 10s". The weaponSwap REPLACES her
  SR: during each 10s burst window Velvet fires swap shots at atkPct=7 (vs her 69.04 SR normal outside it). The
  34.52% self Attack-Damage buff is keyed to HER `burstCast` (pre-FB), NOT `fullBurstEnter` — discriminable in the
  sole-B2 fixture (burstCast 10 ≠ fullBurstEnter 5). V5 discriminates trigger (fullBurstEnter → 5× not 10×),
  duration (3s → 180f ≠ 600f), and swap mult (damagePct 70 → swap shots atkPct=70). ⚑ The swap weapon's
  cadence/ammo/weapon-class are kit-silent (ALWAYS-⚑ #3); the engine fires a default ~10 shots/10s (60f cycle, no
  bolt gap), each carrying her SR charge bucket on top of the 7% multiplier — a documented parser estimate, not a
  fabricated precision.

Velvet's personal damage is plain SR charge fire (hitsPerShot 1) plus the swap shots during her burst windows and
the rare 400.92% proc; her support value is the in-FB team casterAtkPct + chargeDamagePct. In a team that cannot
chain B1→B2→B3 her burst-gated kit is inert.

---

## 3. Handled forks (the judge's three gotchas — none is a REAL-GOTCHA)

- **Swap-shot "Full Charge" identity (HANDLED — ⚑ measurement-gated).** The S2 ally support (casterAtkPct 25.2 +
  chargeDamagePct 100.8) rides SWAPPED shots during Velvet's own 10s burst-weapon window — `shotFired` fires on
  swap shots. Whether the 7% swap weapon satisfies the kit's "Full Charge" clause is unverified; if it does NOT
  full-charge, the in-FB team buff collapses to only non-Velvet-burst (e.g. crown-cast) FBs. Documented caveat in
  the override; not a divergence in the test fixture; a footage spot-check item. All four agents flagged it
  (fable "THE BIG ONE"; S6 ⚑#3; driver caveat).
- **hitCount:50 in-FB-only counting (HANDLED — DOCUMENTED-GAP).** The engine counts all cumulative hits and gates
  fire-time only; "50 normal attacks during Full Burst" ideally counts in-FB hits only / resets per FB.
  Inexpressible; inert here (0 procs both readings); would matter only if a fixture reached the threshold. Owner
  spot-check via the 400.92% popup cadence. Fable's S2b FIX flag + S6 ⚑#4 agree.
- **Blind S5 fixture artifact (HANDLED — NOT a faithfulness signal).** The opus S5 blind chose
  `controlComp('velvet', true)` = [liter/crown/velvet/helm], where crown (a second Burst II) out-prioritizes
  Velvet for the B2 cast (measured: crown 10 casts, Velvet 0), vacating its own burst/FB non-vacuity guard. The
  driver's viable sole-B2 comp [liter/velvet/helm] (Velvet 10 casts, 5 team FBs) is the correct discriminating
  fixture; the blind's SPEC table (the real signal) is fixture-independent and converges fully.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **Swap-shot "Full Charge" identity (§3)** — the load-bearing support question: confirm on video that the ally
   Charge-Damage / ATK buff icons apply DURING Velvet's own burst (i.e. her 7% swap shots satisfy "Full Charge
   during Full Burst"). If they do not, the S2 team buff is crown-cast-FB-only and her support value is lower than
   modeled. (trigger-identity / scope)
2. **hitCount:50 in-FB counting (§3)** — confirm how often the 400.92% additional-damage popup fires (per-FB vs
   per-N-FBs); the engine's cumulative counting + fire-time gate is a proxy for "during Full Burst" counting.
   (trigger-identity / duration semantics)
3. **weaponSwap shot cadence (§2 burst)** — the sole ALWAYS-⚑ field, CALIBRATED. Engine default ~10 shots/10s
   shipped; the swap weapon's true fire rate / magazine / class are kit-silent. Recipe: datamine the burst swap
   shot_id (fire rate, magazine, class) OR count her shots per burst window on video. (cadence)

Magnitudes (30.5 / 25.2 / 100.8 / 15.03 / 400.92 / 34.52 / 7) are all kit-literal (DATAMINED) and were
hand-validated against the T5 wind-weak recording (1.50→1.05); the gauntlet re-certified the STRUCTURE around
them, not the numbers.

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): converged on every line — S1 pouch UNMODELED (derivably never-binding,
  ~3.1k drain « 6000 cap), S1 outFb self ATK+AttackDamage 30.5 (two distinct stats, the schema's canonical outFb
  example), S2 inFb casterAtkPct 25.2 (flat, NOT atkPct) + chargeDamagePct 100.8 (NOT chargeDamageMultPct), S2
  hitCount:50+inFb proc (flagged the cumulative-vs-in-FB counting nuance), burst weaponSwap 7%/10s + attackDamagePct
  34.52 on burstCast (flagged the swap cadence ⚑ + the swap-shot Full-Charge identity). Same load-bearing set +
  nearest-wrong models as the driver; `leakDetected: null`.
- **S5** (opus, blind test): **12/12 load-bearing assertions converge** vs the shipped override once only the
  mechanical blindness artifacts are corrected (harness import path; `o.blocks`→skill1/skill2/burst slot arrays;
  `.total`→`.totalDamage`; `srcSlot` numeric→`e.slug==='velvet'`), assertions unchanged — S1b self-scope +
  teammate inertness, S2a casterAtkPct≠atkPct + chargeDamagePct≠chargeDamageMultPct + ally-scope, S2b
  fires-iff-≥50-FB-normals + monotone, burst 34.52 keyed to Velvet's own cast + swap changes shot economy. The
  blind's as-written `controlComp` fixture (crown out-prioritizes Velvet for B2 → Velvet 0 casts) is a documented
  FIXTURE artifact, classified by the judge, not a faithfulness divergence. The verbatim blind source is preserved
  in `cross-family/velvet/s5-result.json` (`testSource`) and `blind/velvet.test.ts`; like the other blind
  re-derivation artifacts, `scripts/kit-autonomy/blind/**` is excluded from the production typecheck (evidence
  trail, not run by vitest).
- **S6** (opus, blind override): **independently reproduced the identical load-bearing encoding from prose alone**
  — shotFired+outFb self atkPct 30.5 + attackDamagePct 30.5; shotFired+inFb allies casterAtkPct 25.2 +
  chargeDamagePct 100.8; hitCount:50+inFb self attackDamagePct 15.03/5s + enemy flatDamage 400.92; burstCast self
  weaponSwap damagePct 7/10s + attackDamagePct 34.52/10s; S1 enemy-ammo-removal unmodeled (no enemy entity). Its
  only structural difference (an explicit ammoPouch resource + gates) is acknowledged in its own ⚑#1 to be
  deletable-if-continuous — converging on the driver's drop. Its 4 ⚑ flags map exactly onto the driver's caveats +
  fable's two FIX flags. `leakDetected: null`.
- **S7** (opus, judge): **GO 0.95**, discrimination OK, fire-rate check passes, no REAL-GOTCHA; the three gotchas
  all HANDLED (swap-shot Full-Charge identity ⚑; hitCount in-FB counting DOCUMENTED-GAP; blind S5 fixture artifact).

## 6. Board / fit note (non-gating)

Velvet is fight-VALIDATED (T5 wind-weak probe, board ratio 1.017, ±3% ✓). The gauntlet left the ENCODING
**byte-identical** — only the override `note` gained the `Kit-autonomy gauntlet 2026-07-24` provenance marker
(the skill1/skill2/burst blocks, unmodeled, and caveats are unchanged from the hand-validated state). So there is
**NO board movement** to classify (before = after = 1.017): the unit tests pin faithful; the existing recording
pins accurate. `tier: VALIDATED` / `tuned: true` are deliberately preserved (the gauntlet certifies STRUCTURE, not
tuning; there is no GAUNTLET tier).
