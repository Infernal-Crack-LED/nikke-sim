# Manual review — sugar (Sugar)

**Gauntlet date:** 2026-07-26
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped team buffs `alliesOfWeapon`/`alliesOfElementWeapon`; `fullBurstEnter`-vs-`burstCast` trigger split; `advantageVs` element gate; cover-intact status gate; meta-defining SG max-ammo buffer)

> Slug/role: `sugar` IS Sugar (Treasure) (data `treasure:true`, name "Sugar") — SG / Attacker / Iron /
> Burst III (Tetra; cd 40s; 9-round magazine; 10 pellets/shot; reloadFrames 142). This was a
> FROM-SCRATCH build: sugar had NO shipped override before this gauntlet (`simSupported:false`,
> flipped `true` on landing), so the override under test and the 26-assertion spec landed together.
>
> **Cross-family routing override:** Claude quota was exhausted on the run date, so all four blind
> roles ran on **Kimi** models (a separate model family from the Qwen driver) instead of the canonical
> Claude roles — S2b/S7 on `kimi-code/k3`, S5/S6 on `kimi-code/kimi-for-coding`. Cross-family
> separation (driver ≠ blind) is preserved; the owner accepted this routing. The `data/kit-status.json`
> evidence row records the S5/S6 model under the shorthand "kimi-k2.7".

## Kit summary

Sugar (Treasure) is an Iron-code shotgun Burst-III Attacker. Iron is natively advantaged only vs
Electric, NOT vs Fire — so her battle-start Fire conversion is the line that makes her (and her own
Elemental-Advantage team buffs) pay out on a Fire boss. Passively she keeps a cover-intact Attack
Damage ▲19.98% aura running (modeled always-on under the v1 immortal-boss premise — the boss deals no
damage, so cover never breaks) and converts her own damage to Elemental Advantage vs Fire Code
enemies from battle start (self-gating: live vs Fire, byte-identical-inert vs any other boss). Every
time the team enters Full Burst she raises her OWN Critical Rate ▲13.02% and ATK ▲25.01% for 10s,
stretches every shotgun ally's magazine by ▲83.8% for 15s (a real shot-economy channel — 9→~16 rounds
cuts reload frequency), and grants Water/Iron shotgun allies Elemental Advantage Attack Damage
▲40.02% for 15s. When she casts her OWN burst she gains Attack Speed ▲66%, Hit Rate ▲33% and ATK
▲20% for 15s, plus a stronger Elemental Advantage Attack Damage ▲60.01% to Water/Iron shotgun allies
for 15s. Her treasure kit's cover-ATTACKED Critical Damage ▲16.39% / Reload Speed ▲12.12% procs (20%
chance) and the Cover HP restore (1.5% final Max HP) are defensive/cover-state effects with no sim
representation and are recorded verbatim as unmodeled.

## Line-by-line

| Line | Disposition | Notes |
|------|-------------|-------|
| S1: cover intact → self Attack Damage ▲19.98% cont. | FAITHFUL | Passive `attackDamagePct 19.98`, frame 0 / NO expiry (G1). Cover-intact STATUS GATE collapses to always-on under the immortal-boss premise (documented, not a fudge); removal −11.27%; ⚑1 |
| S1: battle start → convert damage to Elem. Advantage vs Fire (self, perm.) | FAITHFUL | Passive `advantageVs:Fire` (Rapi:RH second-code primitive). Self-gating: LIVE vs Fire (+89.59% total) AND byte-identical totals vs an Iron boss (G2 double-state pin proves Fire-specific, not a generic element buff) |
| S1: cover attacked (20%) → self Critical Damage ▲16.39%/10s | DOCUMENTED_GAP | Verbatim in `unmodeled.skill1`; no cover-attacked trigger primitive (v1 boss never attacks → no firing event); S2b-sanctioned honest inert handling, zero fabricated cadence; ⚑2 |
| S1: cover attacked (20%) → self Reload Speed ▲12.12%/10s | DOCUMENTED_GAP | Verbatim in `unmodeled.skill1`; same missing cover-attacked trigger; base reload cadence (142f) left untouched; ⚑2 |
| S1: cover attacked → restore Cover HP 1.5% final Max HP | DOCUMENTED_GAP | Verbatim in `unmodeled.skill1`; defensive, offensively inert on the immortal-boss basis (no damage bucket touched) |
| S2: entering Full Burst → self Critical Rate ▲13.02%/10s | FAITHFUL | `fullBurstEnter`/self generic `critRatePct` (NOT `critRateNormalPct`, NOT `burstCast`); apply-count == FB count (11) > her cast count (6); G3 burstCast counterfactual RED; removal −3.21% |
| S2: entering Full Burst → self ATK ▲25.01%/10s | FAITHFUL | Same `fullBurstEnter` self block as the crit line; `atkPct` in the (1+ΣATK%) bucket; G4 pins value/scope/duration/cadence; removal drops total |
| S2: entering Full Burst → all SG allies Max Ammunition ▲83.8%/15s | FAITHFUL | `fullBurstEnter`/`alliesOfWeapon:SG` `maxAmmoPct 83.8`/15s (TREASURE duration; base datamine is 10s — see corroboration). Incl. self; holder set derived dynamically = {sugar} in fixture; G5 unscoped-allies counterfactual RED; removal −10.21% |
| S2: entering Full Burst → Water/Iron SG allies Elem. Adv. Attack Damage ▲40.02%/15s | FAITHFUL | TWO `alliesOfElementWeapon` blocks (Water/SG + Iron/SG, `count:99`) `elemAdvantageDamagePct 40.02`/15s — union idiom (target carries one element; no unit is both codes). Element bucket, pays only when advantaged; G6 holder-set + vs-Fire removal −24.79% |
| Burst: self Attack Speed ▲66%/15s | FAITHFUL | `burstCast`/self `attackSpeedPct 66`/15s (mirror-image trigger — fires on HER casts only); apply-count == cast count (6) < FB count (11); G7 fullBurstEnter counterfactual over-fires RED; removal −36.90% |
| Burst: self Hit Rate ▲33%/15s | FAITHFUL | `burstCast`/self `hitRatePct 33`/15s, live `hrCoreMult` core-yield path; G8 removal −12.10%; the 33 is kit-stated, the core-fraction YIELD is engine-derived; ⚑3 |
| Burst: self ATK ▲20%/15s | FAITHFUL | Same `burstCast` self block; `atkPct`; G9 pins value/duration/cadence; removal −8.20% |
| Burst: Water/Iron SG allies Elem. Adv. Attack Damage ▲60.01%/15s | FAITHFUL | `burstCast`, TWO `alliesOfElementWeapon` blocks (Water/SG + Iron/SG, `count:99`) `elemAdvantageDamagePct 60.01`/15s — same documented union idiom as the S2 twin; G10 holder-set + cadence pinned, vs-Fire removal −28.39% |

## Cross-family corroboration

> Claude quota exhausted on the run date — all blind roles ran on Kimi (a separate family from the
> Qwen driver), so cross-family separation is preserved even though the canonical Claude model names
> were not used. `leakDetected:null` on every blind artifact.

- **S2b (`kimi-code/k3`, test-faithfulness review):** `leakDetected:null`. Independently re-derived
  the four highest-risk lines FAITHFUL with matching discriminations — S2 crit-rate on `fullBurstEnter`
  (generic `critRatePct`, not `burstCast`), SG-scoped max-ammo INCLUDING self, burst attack-speed on
  `burstCast`, and burst hit-rate on `burstCast` with a mandatory ⚑ on the core-yield conversion —
  plus the honest UNMODELED cover-attacked proc pair (GAP, not load-bearing). CONVERGED with the driver
  on all four. Two reviewer misreads reconciled as RECON_ERRORs (driver correct): it read the SG
  max-ammo duration as **10s** (the base-kit datamine value) where the treasure prose — explicitly the
  SSOT per the characters.json note — says **15s**; and it expected `helm` to co-receive the SG buff,
  but helm is **SR not SG**, so the recipient set is {sugar} alone (the driver's dynamically-derived
  holder set handles this robustly). The reviewer's ⚑ on the derived hit-rate core yield was adopted
  verbatim as the driver's ⚑3.
- **S5 (`kimi-code/kimi-for-coding`, blind test):** `leakDetected:null`. Independently wrote a 4-line
  kit spec (S2 crit-rate, SG max-ammo, burst attack-speed + hit-rate) plus an `it.skip` on the
  unsupported cover-attacked proc. Convergence vs the shipped driver override is **GREEN — 4/4 kit-line
  assertions pass** (plus the blind's own self-skip); the only edits needed were harness-API glue, with
  every assertion preserved. No kit-line disagreement.
- **S6 (`kimi-code/kimi-for-coding`, blind override):** `leakDetected:null`. A PARTIAL reconstruction
  that converges with the driver on every line it DID rebuild — S2 `fullBurstEnter`/self `critRatePct
  13.02`/10s, `fullBurstEnter`/`alliesOfWeapon:SG` `maxAmmoPct 83.8` (incl. self), and burst
  `burstCast`/self `attackSpeedPct 66` + `hitRatePct 33`/15s — with **no contradiction** of the driver
  on any shared decision. It under-reconstructed the rest (dropped all of skill1 — the cover-intact
  Attack Damage and the Fire conversion — plus the S2/burst ATK lines and both Elemental-Advantage team
  buffs). It carries the same two RECON_ERRORs as S2b (max-ammo 10s vs the treasure 15s) and the same
  hit-rate ⚑ caveat.
- **S7 (`kimi-code/k3`, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, 0 gotchas,
  convergence GREEN.** All 13 kit lines accounted — 10 FAITHFUL + 3 DOCUMENTED_GAP (the cover-attacked
  proc pair + the cover-HP restore, verbatim in `unmodeled` with ⚑ recipes — the S2b-sanctioned honest
  handling, no fabricated cadence anywhere). The judge independently ruled the two blind-side 10s/15s
  and helm-SG misreads as recon notes, NOT driver defects (driver's 15s and {sugar} holder set are
  correct per ground truth), and flagged the same-model residual the owner should spot-check (⚑1
  cover-intact→always-on collapse + the `count:99` `alliesOfElementWeapon` union idiom).

## Residual flags for owner

1. **⚑1 (low) — cover-intact Attack Damage modeled always-on.** The 19.98% Attack Damage line is gated
   on "cover still intact" in kit, but the v1 sim's boss deals no damage, so cover is never destroyed
   and the buff is up for the whole fight — modeled as a duration-less passive (frame 0, no expiry).
   This is a documented premise consequence, not a fudge (G1 beats the part-time Full-Burst-gated
   counterfactual), but it is the single shared premise every agent inherited. **Owner spot-check:** a
   fresh-eyes read of this collapse is the cheap residual check. Recipe to re-gate: a cover-destruction
   model + a recording where the cover breaks mid-fight.
2. **⚑2 (standard) — cover-attacked procs unmodeled.** The Critical Damage ▲16.39% + Reload Speed
   ▲12.12% procs (20% chance on cover-attacked) and the Cover HP restore have no honest encoding — the
   engine has no cover-attacked trigger primitive (the v1 boss never attacks, so the proc has no firing
   event to key on) and the sim is deterministic (no seed for the 20% chance). Recorded verbatim in
   `unmodeled.skill1` rather than inventing a cadence. On a real fight with cover damage they would add
   bounded self uptime. Recipe: a cover-attacked event primitive + a focus video measuring proc uptime.
3. **⚑3 (derived) — hit-rate core yield.** The burst Hit Rate ▲33% is kit-stated and faithfully
   encoded, but its damage YIELD flows through `sim.ts hrCoreMult` — a DERIVED reticle-shrink →
   core-fraction estimate (LIVE by default, `HRCORE=0` disables), not a measured per-unit number. Both
   S2b and S6 independently insisted on this ⚑. Recipe: a sugar focus video reading the in-window
   core-hit fraction with/without the burst.
4. **Owner spot-check cluster (from the S7 judge).** Beyond ⚑1, the judge named the `count:99`
   `alliesOfElementWeapon` Water/Iron-SG **union idiom** as the second convention a fresh-eyes reviewer
   should confirm (the schema target carries a single element, so the "Water AND Iron" union is encoded
   as two blocks; no unit is both codes, so there is no double-application). Both are documented
   conventions; neither blocks GO.
