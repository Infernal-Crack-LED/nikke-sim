# Manual review — quency (Quency)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped buffs — S2 and the burst both resolve "2 ally unit(s) with the highest FINAL ATK" via `alliesTopAtk count:2 byFinalAtk:true`; and the burst's `burstCast`-vs-`fullBurstEnter` trigger identity is load-bearing and pinned by a dedicated contention arm)

> Slug disambiguation: `quency` IS the base SMG/Electric/Supporter/Burst II unit (Missilis, released
> 2023-01-12). A different unit shares the base name — `quency-escape-queen` (SMG/Water/Burst III,
> "qeq"). lint-slug-disambiguation fired the expected advisory on the shared base-name; the exact slug
> `quency` was confirmed and this run reasons from it throughout. Fresh build: no prior override,
> `simSupported false → true`, kit-status row seeded in the exact `--refresh` shape (no global
> `--refresh` — concurrent batches share the file) then flipped via `--gauntlet`.

## Kit summary

Quency is an Electric SMG Supporter with **zero damage lines** — her entire board value flows through
teammates' stats. Her Skill 1 fires after she lands 60 normal attacks and grants herself a temporary
HP buffer (12.42% of Max HP for 10s) — damage-inert, but observable and pinned. Her Skill 2 has no
printed activation clause and rides her 8s skill cooldown (datamined): it raises the ATK of the two
highest-final-ATK allies by 16.11% for 5s. Her Burst (Burst II, her own cast) grants those same two
highest-final-ATK allies +43.87% Max HP for 5s and +29.9% Critical Damage for 10s. The Max-HP rider is
damage-inert (ally-granted Max HP feeds no conversion); the Critical Damage rider is the one line that
moves damage. In practice her value is S2 ATK uptime plus the crit-damage rider landing on the team's
two carries each time she takes the Burst II slot.

## Line-by-line

| Line                                                                  | Disposition      | Notes                                                                                                                                    |
| --------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| S1: after 60 normal attacks → self, duplicates 12.42% of Max HP, 10s  | FAITHFUL (inert) | `hitCount count:60` self `casterMaxHpPct 12.42/10s` — a temporary self HP-buffer. Cross-family-converged on the self-Max-HP-buff reading (a shield reading was set aside; the sim consumes neither). Damage-INERT (no atkOfMaxHpPct consumer, no damage-taken) but OBSERVABLE — spec pins trigger/cadence/self-target/10s + byte-identical-totals inertness. ⚑ basis: kit source is the HIGHEST-Max-HP ally; no StatKey expresses an ally-scaled HP source, so it resolves to % of quency's OWN Max HP (exact only when she holds the team's highest Max HP; inert either way) |
| S2: 2 highest-final-ATK allies, ATK ▲16.11% for 5s (cd 8s)            | FAITHFUL         | `interval sec:8` + `alliesTopAtk count:2 byFinalAtk:true`, `atkPct 16.11/5s` (NOT casterAtkPct — no "of the skill user's ATK" wording). 8s cadence is DATAMINED (`skillCooldownsSec.skill2=8`), flagged ⚑. Spec pins 8s inter-application spacing, 300f windows, exactly 2 non-self targets, self-only-scope counterfactual, and a live damage drop when removed |
| Burst: 2 highest-final-ATK allies, Max HP ▲43.87% for 5s              | FAITHFUL (inert) | `targetMaxHpPct 43.87/5s` on the shared burstCast block. DAMAGE-INERT (ally-granted maxHpFlat is excluded from live Max HP and feeds atkOfMaxHpPct only when caster===target). Pinned present (ally maxHpFlat, 300f windows) and inert via the discriminator below |
| Burst: 2 highest-final-ATK allies, Critical Damage ▲29.9% for 10s     | FAITHFUL         | `critDamagePct 29.9/10s` on trigger `burstCast` (own B2). The only damage-moving line. Spec pins value/10s/2-targets/once-per-cast + live damage drop. Trigger identity (`burstCast` NOT `fullBurstEnter`) pinned by the crown-contention arm |
| Burst trigger identity (burstCast vs fullBurstEnter)                  | FAITHFUL         | Second fixture (liter/crown/quency/helm): crown out-prioritizes quency for the B2 cast → quency casts ZERO while 5 Full Bursts occur. Shipped `burstCast` fires 0 crit buffs there; a `fullBurstEnter` counterfactual fires 10 (5 FB × 2 targets). GREEN vs RED pinned |
| Whole-kit: no damage invented                                         | FAITHFUL         | No `flatDamage`/`dot`/`hitRepeat`/`storedHit`/`weaponSwap` anywhere; any sim damage attributed to quency beyond her SMG normals is a red flag. Burst inertness discriminator: stripping the WHOLE burst == stripping ONLY the crit line (the Max-HP rider contributes zero) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All three damage-relevant
  lines converge exactly with the driver: interval-at-skill-CD for S2, `atkPct` (not casterAtkPct),
  `byFinalAtk` targeting, `burstCast` own-cast, and the 5s/10s duration split. Two reconciliations:
  (1) fable correctly flagged that a single-B2 fixture cannot separate `burstCast` from
  `fullBurstEnter` — driver enacted a crown-contention arm; (2) fable's claim that `hitCount` "counts
  ROUNDS" is INCORRECT against the engine (sim.ts:3782 adds `hitsPerShot` per pull → counts HITS),
  driver verified and documented. Fable dispositioned S1 GAP/unmodeled (no highest-ally-HP primitive);
  driver converged S1 to the self-Max-HP-buff the S5/S6 blinds independently produced.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. 26 assertions written from prose alone.
  Vs the shipped override: RAW 18 pass / 5 fail / 3 skip; ADAPTED 23 pass / 3 skip (GREEN). The 5 raw
  failures are FIXTURE-ONLY: `controlComp('quency')` fields crown as a second B2 who out-prioritizes
  quency, so quency casts zero and every cast-needing assertion starves — a blind-author fixture
  RECON_ERROR, not an encoding divergence (judge concurred). Driver applied the sole-B2 fixture fix;
  every assertion is identical. All S1/S2/structural-burst assertions pass RAW once S1 converged.
- **S6 (claude-opus-5, blind override):** `leakDetected:null` (non-substantive ambient-slug note only).
  skill1 and burst are BYTE-IDENTICAL to the driver (S1 = self `casterMaxHpPct 12.42/10s` hitCount 60;
  burst = `burstCast` + `alliesTopAtk count:2 byFinalAtk` + `targetMaxHpPct 43.87/5s` +
  `critDamagePct 29.9/10s`). The one divergence: S2 `interval sec:20` — the blind mis-sourced the burst
  cooldown; the driver keeps the datamined `interval sec:8` (corroborated by fable), so the blind
  override was NOT copied.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[]**,
  convergence `GREEN` with zero red assertions. Every line FAITHFUL or DOCUMENTED_GAP; the S1 basis is
  the sole DOCUMENTED_GAP (missing highest-ally-HP primitive, flagged, provably damage-inert). Blind-side
  errors were correctly NOT propagated (S6's 20s interval rejected; fable's hitCount-contract claim
  refuted). Judge: the genuinely contestable identity (`burstCast` vs `fullBurstEnter`) is discriminated
  by a fixture designed to separate them, GREEN on shipped / RED on counterfactual.

## Residual flags for owner

1. **S1 HP basis (missing-primitive ⚑).** The kit's S1 source is "the Nikke with the highest Max HP";
   no StatKey expresses an ally-scaled HP source, so `casterMaxHpPct` resolves to % of quency's OWN Max
   HP — exact only when she holds the team's highest Max HP. Damage-inert either way (no atkOfMaxHpPct
   consumer, v1 models no damage-taken), so this is a completeness gap, not an accuracy one.
2. **"60 normal attacks" hits-vs-pulls.** The engine `hitCount` counts HITS (adds `hitsPerShot` per
   pull), so count 60 = 60 hits = 30 pulls on this 2-hit SMG; if the kit means 60 SHOTS the threshold is
   120. Flagged by all parties; inert (S1 moves no damage). A frame-read of a real quency fight would
   settle it.
3. **S2 8s cadence is datamined, not prose.** The clause-less S2 rides `interval sec:8` from
   `skillCooldownsSec.skill2=8`. This is the one number a frame-read of a real quency fight could still
   overturn (first-fire phase is the engine's t=sec convention, opening-ramp only).
4. **S1 self-HP-buff vs shield interpretation.** Three same-family passes converged on the self-Max-HP-buff
   reading precisely because the sim can consume neither alternative — convergence here proves stability,
   not correctness. The line moves no damage either way.
5. **No graded comps.** All magnitudes are datamine-literal (MODEL_ONLY); no real quency fight has been
   recorded. First recording should sanity-check the S2 ATK-uptime cadence and confirm the crit-damage
   rider lands on the two carries.
