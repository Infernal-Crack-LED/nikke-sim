# Manual review — `sora` (Sora)

Kit-autonomy gauntlet 2026-08-04 — **GO, faithfulness 1.0** (binding judge kimi-code/k3;
cross-family S2b claude-fable-5 / S5 claude-opus-5 / S6 claude-opus-5 converged).
FROM-SCRATCH build: no prior override, `simSupported` false → true. Tier 2.

## Kit summary

Sora — RL / Supporter / Wind / Burst I (cd 40s), Elysion, ammo 6, chargeFrames 60,
reloadFrames 141. A pure healer/supporter whose kit is almost entirely out-of-domain for a
damage-dealt sim: exactly ONE line has any expression — the burst's team heal, and only as a
RECOVERY EVENT (the engine models no HP amounts; `heal` emits valueless recovery events that
fire teammates' on-recovery consumers). Her in-game team contribution (the part-destroy-gated
ATK buff) cannot fire in the sim: the engine has no part-destroyed event and the scope boss is
partless — exactly as in game vs partless targets.

- S1 "Boarding Procedure": start of battle, self — Outgoing healing ▲35.2% continuously.
- S2 "Secret Carry-On": when an ally or self destroys an enemy's part, all allies —
  Storage: stores excess healing received (≤5.36% Max HP per stack, ≤5 stacks, 15s);
  ATK ▲23.74% of the skill user's ATK for 15s.
- Burst "Closely Carried Secret" (B1, 40s): all allies — Recovers 52.27% of the skill user's
  final Max HP as HP; Removes 1 debuff(s).

## Encoding

ONE block: `burst → burstCast → allies → heal` (ticks 1, instant). Keyed burstCast, not
fullBurstEnter: she is the Burst I opener, the cast precedes the Full Burst window (+82f in
the fixture), and FB-entry keying would misattribute team FBs another B1 opened. The 52.27%
magnitude is unrecordable by construction (event-only heals) and is pinned absent from the
encoding by the spec test.

## Line-by-line dispositions

| line | disposition | treatment |
|---|---|---|
| K1 S1 outgoing healing ▲35.2% | UNMODELED (inert) | heal AMOUNTS do not exist in the sim — no stat, no channel; heal magnitude is irrelevant to on-recovery consumers (events, not amounts). Verbatim in unmodeled; nearest-wrong (park 35.2 on a damage stat) pinned absent by the zero-buffApply assertion + S5 structural check. |
| K2a S2 part-destroy trigger | UNMODELED (no primitive + partless boss) | no part-destroyed event in the engine (sim.ts: "partless test boss … kept as a switch for part-ed boss support later"); the trigger can never fire at scope — as in game vs partless targets. diesel-winter-sweets / ark-ranger-black precedent. |
| K2b S2 Storage (overheal ≤5.36% Max HP ×5, 15s) | UNMODELED (out of domain) | no HP pool / overheal representation; prose names no damage consumer. Nearest-wrong (encode as a shield, opening phantom shielded/requiresShielded channels) pinned absent by S5. |
| K2c S2 ATK ▲23.74% of caster ATK / 15s | UNMODELED (trigger-gated) | inert at scope via K2a. Correct shape recorded if ever modeled: casterAtkPct (flat add of 23.74% of SORA's ATK), NOT atkPct per target. Nearest-wrong (materialized passive) is the spec test's counterfactual and moves the board. |
| K3 burst heal 52.27% final Max HP, all allies | **FAITHFUL — MODELED** | burstCast/allies/heal (event-only). Fires 5×/180s in the fixture (CD-limited 40s), one recovery landing per cast on the cast frame; live: moves the consumer's total ~1.8×. |
| K4 burst cleanse 1 debuff | UNMODELED (inert) | v1 models no ally debuffs (boss deals no damage, applies none); nothing to remove (cocoa precedent). Boss-debuff misread absent. |

## Test evidence (scripts/tests/units/sora.test.ts — 12/12 GREEN)

Fixture: sora (B1, sole) / folkwang (B2, forced BARE) / asuka (B3, burst lifesteal stripped) —
sora is the SOLE recovery source; asuka's self-targeted S1 consumer reads exactly one buffApply
per landing. Boss Iron, focus sora. Deterministic (no seed).

- K3: one recovery landing per sora cast on the CAST frame (5 casts: frames 508/2908/5308/
  7708/10108); heal-removed zeros the consumer; self-only never reaches asuka; fullBurstEnter
  re-key shifts every landing to the FB-start frame (+82f).
- Self-damage-neutrality: sora's own total 35,668,354.89 byte-identical across shipped /
  bare-weapon / heal-removed / FBE / self-only variants; the heal MOVES asuka's total.
- Absence pin: zero sora-originated buffApply; materializing K2c as a passive casterAtkPct
  grant emits buffs and moves team totals (non-vacuous).
- Structure: skill1/skill2 empty by construction; one heal block; unmodeled verbatim
  (dynamic containment vs characters.json prose); no `ignored`; no fabricated magnitude.
- RED phase (skeleton, pre-S3): 6 failed / 6 passed — exactly the K3 modeled-line assertions
  RED (reviews/sora.verify.txt).

## Cross-family corroboration

- **S2b (claude-fable-5)** — converged 6/6 lines: identical dispositions; independently named
  the same nearest-wrongs (substitute-trigger materialization; heal-as-shield phantom channel;
  taxonomy-#4 trap of skipping the burst heal). Fixture divergence ruled driver-side: the
  driver's asuka-self-consumer fixture subsumes fable's crown-based design with stricter
  source isolation (crown is itself a recovery consumer with a self-heal).
- **S5 (claude-opus-5)** — prose-only blind suite: 12 passed / 2 skipped GREEN vs the shipped
  override after one mechanical import-path fix; the 2 skips are the blind model's OWN declared
  GAPs (= driver's UNMODELED K1/K4). Its tandem assertions ran in a controlComp fixture WITH
  liter as a competing B1 — tracer confirmed sora still casts and the crown-injected recovery
  sensor saw one landing per cast.
- **S6 (claude-opus-5)** — blind override converged: skill1 identical ([]), burst semantically
  identical (burstCast/allies/heal, explicit ticks:1 = engine default). ONE divergence: skill2
  encoded as an `unsupported`-trigger block (behaviorally identical — `unsupported` never fires;
  boss partless) vs the driver's empty-slot + verbatim-unmodeled. Ruled blind-side style: the
  driver form is the repo convention (diesel-winter-sweets / ark-ranger-black / cocoa) and is
  structurally pinned; the blind model's own flag agrees the line is inert at scope and any
  firing trigger would fabricate uptime.
- **S7 (kimi-code/k3, binding judge)** — GO, faithfulness 1.0, gotchas [], discriminationOk
  true. Noted one same-model residual for owner spot-check: every agent shares the prior that
  part-gated kits are truly inert vs partless targets and that heal magnitude never matters to
  on-recovery consumers — both rest on repo precedent, not a fresh measurement of Sora; a single
  parted-fight footage read of her S2 uptime would independently confirm R1's premise.

## Residual flags (estimate / recipe / tier)

- **R1 partDestroyed trigger primitive** (K2 trigger/ATK/storage): estimate = Sora's entire
  in-game team contribution in PARTED fights (15s team ATK buff of 23.74% of her Supporter-tier
  ATK per part destroy — a few % of team damage across windows), zero vs partless (zero at
  scope today). Recipe: part-destroyed event in sim.ts + parted scope-boss fixture, then encode
  S2 as partDestroyed → allies → casterAtkPct 23.74 / 15s (+ storage once R2 lands); popup
  footage of one parted fight pins trigger count. Tier 2.
- **R2 overheal-storage resource** (K2b): estimate = damage-neutral as worded (prose names no
  consumption — stores only; survivability utility). Recipe: HP-amount modeling + overheal
  detection + per-caster storage pool; also unlocks K1's outgoing-healing amplifier (which only
  has something to scale once heal amounts exist). Tier 2.
- **R3 debuff cleanse** (K4): estimate = zero (v1 allies never debuffed). Recipe: an
  ally-debuff model first (none planned while the boss deals no damage). Tier 2.
- Gauge: no gauge-per-shot.json row — RL modal fallback (280 energy/trigger × focus charge
  mult); rescales nothing kit-side (no kit line keys off her shots).

## Board

Not on the board before (simSupported false); no graded teams after — tier MODEL_ONLY until a
real fight validates magnitudes (the gauntlet certifies structure, not tuning).
