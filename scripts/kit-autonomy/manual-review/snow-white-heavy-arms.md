# snow-white-heavy-arms — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Snow White: Heavy Arms (`snow-white-heavy-arms`, nickname `swha`) — Water · SR · Attacker · Burst III ·
40s CD · ammo 6 · reloadFrames 141 · chargeFrames 72 (=1.2s) · chargeMultiplier 250 · hitsPerShot 1 ·
normalMult 69.04 / coreMult 200 · critRate 15 / critDamage 150 · Pilgrim/Overspec.
**P0:** a COMPLETELY DIFFERENT unit from base `snow-white` (AR/Iron) — no base-snow-white data cited or reused.

**Verdict:** 🟢 **GO** · faithfulness **1.0** (every kit line FAITHFUL or documented UNMODELED/GAP; 0 real gotchas in
the override encoding surviving grading — the single judge gotcha is a documented ENGINE plumbing residual, low
severity, out of gauntlet scope) · **cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`;
driver Qwen. Both blind re-derivations independently reproduced the driver's load-bearing structure (the S6 blind
INDEPENDENTLY derived the 41.9 + 527.95 = 105.59×5 sequential lump and the 4.2% boss debuff). NOTE: swha is
`MEASURED` / `tuned: true` (fight-validated; validated vs two real scope-lock T4 runs 1.31→0.99; board mean 0.942
COLD, range 0.91–0.98 over 4 recordings); the gauntlet certifies STRUCTURE only and deliberately leaves
`tier: MEASURED` / `tuned: true` untouched (there is no GAUNTLET tier). **The gauntlet made NO encoding change** —
the shipped override is faithful as-is; S3 appended only the gauntlet provenance marker + a residual summary to the
`note`.

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

The normalized `skills` prose is the SSOT the sim reads.

- **S1 (Seven Dwarves V+VI)**
  - ■ every 0.2s while charging, nearest non-Lock-On enemy: **Lock-On** (max 5; off on normal attack / cover).
  - ■ every 0.2s while charging, self: **Auto Fire Ready** — loads Seven Dwarves ammo (max 5) + **DEF ▲42.24% continuously**.
  - ■ every 0.2s while charging, all Lock-On enemies: **Damage Taken ▲4.2% for 4 sec**.
  - ■ on Full Charge (Auto Fire): **Effect 1** 41.9% of final ATK to ALL enemies; **Effect 2** 105.59% of final ATK to
    Lock-On targets, **attacks sequentially based on ammo loaded by Auto Fire Ready**.
  - ■ on Full Charge while Fully Active: **uses ▼1**. ■ on normal attack while not in Full Burst: **removes Fully Active**.
- **S2 (Shades of White)**
  - ■ at battle start: **fixes charge time at 1.2s continuously**.
  - ■ during Full Charge: **Gains Pierce 5s** + **ATK ▲46.84% 5s** + **Damage to Parts ▲62.64% 5s**.
  - ■ entering Burst Stage 3: **ATK ▲73.92% for 10 sec**.
  - ■ at Full Charge only while Fully Active: **Charge Damage ▲528% for 1 round(s)** + **Sequential attack damage ▲158.4% for 1 round(s)**.
- **Burst (Seven Dwarves Fully Active)**
  - ■ self: **Attack Damage ▲84.48% for 10 sec**.
  - ■ self: **Seven Dwarves Fully Active** — Number of uses: 2; charge time fixed 3.2s; Max Lock-On ▲10; Max ammo ▲10; deactivates at 0 uses.
  - ■ all destructible projectiles: **41.9% of final ATK**.

---

## 2. What the code does (the faithful override, line by line)

swha is a charge-loop SR whose damage is the **Seven Dwarves auto-fire** piggybacked on every full-charge shot, plus a
burst **Fully Active** swap mode (2 uses) that swells the auto-fire volley from 5 to 15 ammo. The auto-fire is modeled
as `shotFired` flat-damage riders; the Fully Active extra is a `swapGate:'swapped'` rider riding only the two swapped
full-charge shots.

- **S1 Lock-On targeting (max 5)** — **UNMODELED** (single-boss targeting bookkeeping; `resolveTargets(enemy)` has one
  entity). Documented in `unmodeled.skill1`.
- **S1 Auto Fire Ready DEF ▲42.24% + ammo loading** — **UNMODELED** (DEF is damage-inert; the ammo COUNT is folded into
  the volley magnitudes below). Documented.
- **S1 Damage Taken ▲4.2%/4s ⇒ boss damageTakenPct 4.2 (passive permanent)** `passive → enemy → damageTakenPct 4.2`.
  Re-fired every 0.2s while charging ≡ permanent uptime on the boss; boss debuff (casterIdx/targetIdx null, key
  `2:skill1:damageTakenPct:4.2`), team-wide benefit. **W4** discriminates target (`self` → debuffs swha, boss debuff gone).
- **S1 Auto Fire Effect 1 — 41.9% AoE** `shotFired → enemy → flatDamage 41.9`, once per full charge (×84). **W5**
  discriminates presence (removed → 0).
- **S1 Auto Fire Effect 2 — 105.59% × 5 ammo = 527.95% sequential baseline volley** `shotFired → enemy → flatDamage
  527.95 flavor:sequential`, once per full charge (×84). **W6** discriminates magnitude (single ammo 105.59 → 0 of 527.95).
- **S1 Fully Active EXTRA volley — 105.59% × 10 = 1055.9% sequential, swapGate:'swapped'** `shotFired, swapGate:swapped →
  enemy → flatDamage 1055.9 flavor:sequential`. THE FIX LINE (2026-07-13 volley-placement): in Fully Active the ammo cap
  rises 5→15, so a swap shot's volley is 105.59×15 = 1583.85%; the EXTRA over the 527.95 baseline is 1055.9%, riding ONLY
  the two swapped full-charge shots inside the FB window (COMMUNITY twice-confirmed: gamewith JP + prydwen 7→15-hit
  structure). **W7** fires exactly 2×/burst (10 total), all inside [burstCast,+10s] swap windows; discriminates the FIX
  (remove weaponSwap → 0) and UNGATED (strip swapGate → ~84, many out-of-window).
- **S1 uses ▼1 / normal-attack removal** — **UNMODELED** (bookkeeping; the mode is consumed via `maxShots:2` within the
  FB window; sim always full-charges). Documented.
- **S2 charge-time fix 1.2s** — **UNMODELED** (base chargeFrames 72 = 1.2s already; sim uses fixed cadence). Documented.
- **S2 during Full Charge — ATK ▲46.84%/5s (self)** `shotFired → self → atkPct 46.84 (5s)`, near-permanent uptime
  (0.2s-refreshed). **W12** discriminates target (`allies` → all 3 slots).
- **S2 during Full Charge — Parts Damage ▲62.64%/5s (self, INERT)** `shotFired → self → partsDamagePct 62.64 (5s)`.
  Faithfully encoded but inert vs the partless scope-lock boss. **W13** PINS inertness (effect-only removal → byte-identical
  totals) AND that the encoding still fires. (Pierce 5s is **UNMODELED** — inert, no live Pierce-Damage consumer; documented.)
- **S2 entering Burst Stage 3 — ATK ▲73.92%/10s (self)** `stageEnter:3 → self → atkPct 73.92 (10s)`, fires on her burstCast
  frames (entering stage 3 = casting her B3). **W14** discriminates duration (5s vs 10s). (Residual (a): trigger identity
  stageEnter:3 vs burstCast is frame-indiscriminable in a sole-B3 fixture.)
- **S2 at Full Charge while Fully Active — Charge Damage ▲528% (whileSwapped)** `burstCast → self → chargeDamagePct 528
  (10s, whileSwapped)`. APPLIED: swap-weapon normals carry charge mult **7.78** (= 2.5 base + 5.28 additive charge points),
  base normals 2.5. **W15** discriminates presence (removed → no 7.78 normals).
- **S2 at Full Charge while Fully Active — Sequential Damage ▲158.4% (whileSwapped)** `burstCast → self →
  sequentialDamagePct 158.4 (10s, whileSwapped)`. **W16** PINS the encoding (emitted on burstCast). **RESIDUAL (c):** the
  buff is encoded faithfully but INERT on the 527.95/1055.9 riders — the engine flatDamage path does not route
  `flavor:'sequential'` into the seqMult bucket (measured seqMult=1 with/without whileSwapped/flavor). See §3.
- **Burst Attack Damage ▲84.48%/10s (self)** `burstCast → self → attackDamagePct 84.48 (10s)`. **W17** discriminates
  trigger (`fullBurstEnter` fires on FB-START frames, strictly after the cast frames) and target (`allies` → all 3 slots).
- **Burst Seven Dwarves Fully Active — weaponSwap** `burstCast → self → weaponSwap damagePct 69.04, chargeTimeSec 3.2,
  durationSec 10, maxShots 2`. The 3.2s-charge swap mode; `maxShots:2` terminates after the 2nd swapped shot (uses-based,
  NOT a naive 10s window — a 10s window would admit a 3rd 3.2s shot at ~9.6s). Observable via the W7 1055.9 riders + the
  W15 charge-7.78 normals. **W18** removing the swap removes BOTH; swha deals ZERO burst-bucket damage (the W20 projectile
  41.9% is skipped, not mis-encoded as a boss nuke).
- **Burst Max Lock-On/ammo ▲10 + 41.9% to destructible projectiles** — **UNMODELED** (caps folded into the volley
  magnitudes; no destructible projectiles vs the single boss). Documented.

---

## 3. Residuals for owner spot-check (NOT faithfulness failures)

The judge graded faithfulness **1.0** with these three documented residuals (all flagged in the override `note`):

- **(a) W14 trigger identity — `stageEnter:3` vs `burstCast`.** The override encodes the literal prose trigger
  ("entering Burst Stage 3" = `stageEnter:3`). In the sole-B3 fixture this coincides frame-wise with `burstCast`, so it
  is not behaviorally discriminable here. **Spot-check:** run a comp with a co-B3 (e.g. helm) where swha's 40s cd forces
  alternation — `stageEnter:3` fires on the co-B3's casts too, `burstCast` would not.
- **(b) W15/W16 duration representation — `burstCast`+`whileSwapped`+`durationSec:10` vs literal per-swap-full-charge
  `durationShots:1`.** Damage-equivalent: both buff EXACTLY the two swap shots (charge 7.78 probe-verified on both). The
  S6 blind independently chose `durationShots:2` (same equivalence class). **Spot-check:** confirm both swap shots carry
  the 528 charge boost in a focus recording (popup delta on the 2 post-burst charges).
- **(c) W16 `sequentialDamagePct 158.4` inert-on-riders (ENGINE).** Encoded faithfully per prose, but the engine's
  flatDamage path does not route `flavor:'sequential'` into the seqMult bucket — measured `seqMult=1` on both the 527.95
  baseline and the 1055.9 lump regardless of `whileSwapped`/flavor. This is **src/engine/** plumbing, OUT of gauntlet
  scope (the gauntlet must not edit the engine). The 158.4 is a small support-diluted contribution; the model is
  graded/validated in this state. **Spot-check / possible engine follow-up:** route flatDamage `flavor:'sequential'`
  riders into seqMult if the sequential-damage bucket should apply to them. (The S2b fable-5 reviewer assumed the 158.4
  feeds the volley per INTENT — correct about intent; the engine doesn't consume it for flatDamage.)

---

## 4. Cross-family convergence

- **S2b (claude-fable-5, pre-op adversarial test-faithfulness):** CONVERGED on every line. Declared a leak (schema
  comments name the "SWHA" abbreviation; the slug-filter missed it) and explicitly re-derived from prose arithmetic
  ("Number of uses: 2", "uses ▼1", "for 1 round(s)") → valid, uncontaminated. Confirmed the uses-based 2-shot mode
  (maxShots, NOT a 10s window) and the sequential flavor requirement.
- **S5 (claude-opus-4-8, blind test-writer):** intent converges (atkPct 73.92/46.84, attackDamagePct 84.48, chargeDamagePct
  528 Fully-Active-gated, sequential 158.4). Literal API mismatches (`ov.blocks` accessor, 3-arg `withPatchedOverride`,
  `.total` field) classified RECON_ERROR by the judge (schema-blindness, not divergence).
- **S6 (claude-opus-4-8, blind override-writer):** INDEPENDENTLY derived 41.9 + 527.95 (105.59×5) + 4.2 boss debuff +
  46.84/62.64/73.92/528/158.4/84.48. Did NOT model the weaponSwap/1055.9 fifteen-ammo volley — **the driver is MORE
  complete**. Stat-key divergence (`sequentialMultPct` vs driver's engine-real `sequentialDamagePct`) resolves in the
  driver's favor; both inert-on-riders per residual (c).
- **S7 (claude-opus-4-8, binding judge):** **GO**, faithfulness **1.0**, discriminationOk **true**, convergence **GREEN**.
  One gotcha = ENGINE `sequentialDamagePct` inert-on-riders (documentedByDriver, severity low, out of scope). No REAL-GOTCHA.
- **Same-model caveat:** S5/S6/S7 are all `claude-opus-4-8` (S2b is `fable-5`); convergence proves stability more than
  independent correctness — hence the §3 owner spot-checks.

---

## 5. Board status

`board-read` (note-only override change ⇒ unchanged before/after): **rank 15, 4 teams, mean 0.942 COLD, range 0.91–0.98,
MAD 0.058**, recordings 0.91 / 0.93 / 0.95 / 0.98. Well-calibrated; the gauntlet made no numerical change.

## 6. Artifacts

- Override: `src/skills/overrides/snow-white-heavy-arms.json` (note += gauntlet marker + residual summary; structure unchanged).
- Driver test: `scripts/tests/units/snow-white-heavy-arms.test.ts` (30 assertions, 30/30 GREEN; S2d `reviews/snow-white-heavy-arms.verify.txt`).
- S2b review: `reviews/snow-white-heavy-arms.test-review.json` · cross-family packets/results: `cross-family/snow-white-heavy-arms/`.
- Blind: `blind/snow-white-heavy-arms.{test.ts,test-spec.json,override.json,audit.json}`.
- Judge verdict: `results/snow-white-heavy-arms.json`.
