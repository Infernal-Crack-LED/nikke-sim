# Open mechanics questions

Running record of game-mechanics questions affecting sim accuracy, reorganized 2026-07-13.
Unanswered items are what's left to research; answered items keep their resolution and where
it was implemented. ⚑ = calibrated-and-applied but mechanism unconfirmed (flagged for review).

---

## UNANSWERED

### U1 — What rule separates the two proc classes? ⚑ (calibration applied; NARROWED 2026-07-13)
UPDATE: per user, riders in general never get the +30% range bonus (now an engine-wide rule) and
never core — so the open question narrows to: which riders ALSO lose the +50% FB bonus (noFb)?
Current noFb set: privaty, liberalio, LM sequentials, SBS proc set, maiden. Full-FB set: helm,
anis-star, neon-VE, ein feathers.
Two empirically distinct classes of skill-proc damage:
- **Full-majors class** (validates ~1.0 WITH the +50% FB and +30% range bonuses): on-hit
  "additional damage" procs — helm 178.98%, anis-star 120.13%, neon-VE 437.98/262.79%.
- **Exempt class** (validates ~1.0 only WITHOUT both majors, the ×0.59 factor): privaty
  last-bullet 256.17% + Designated 1687%, liberalio 202.5% core-hit ×5, little-mermaid
  sequentials (253.44%/s + 850% barrage), maiden 547.62% (partial — see U2).
Per user decision the exemptions are calibrated in via noRange+noFb effect flags. The
underlying rule is unknown (user: optimal range is unreliable to test — the practice boss
moves fore/aft). Data point: Prydwen documents Ein's Near Feathers as FB-boosted but
range-exempt, so per-skill exemptions officially exist.

### U2 — Maiden: Ice Rose residual (now 1.60 hot)
547.62% procs on every full-charged normal attack (user-confirmed; shotFired + no core/range/FB
— all rider exemptions applied). Still hot, and projExpl-on-RL-normals warmed her normals
further (1.37 → 1.60). Whatever remains is value/cadence: an internal cooldown, a smaller
effective value, or twin-rocket semantics. Probe run F reads her cleanly (no burst).

### U3 — CCW residual (1.32 → 1.18 after the universal rider-range rule) — mostly resolved
User's ".59-family" hunch confirmed: her riders losing the range bonus took her to 1.18. The
last ~18% may be the 833.79% core-strike bucket or the 900%/5s cadence; park unless a probe
run says otherwise.

### ~~U4~~ — ADOPTED 2026-07-13: projExpl DOES buff regular RL normals
User's masking hypothesis confirmed empirically: with projExplOnRlNormals ON (now default) AND
the universal rider-range exemption, anis-star and RRH stay centered (their projectile riders
lose range while their RL normals gain projExpl — the two errors had been cancelling). SBS
needed her proc set moved to the noFb class (1.30 → 1.14), consistent with U1's taxonomy.

### ~~U5~~ — SUPERSEDED by the measured range-band model (2026-07-13, later)
User measured the test boss's movement: range bands mid/near/far/mid-far on a fixed timeline,
+30% bonus only for weapon classes inside their effective range per band (near=SG, mid=SMG+AR,
mid-far=MG+SR, far=SR), and RL NEVER receives it. Implemented as BOSS_RANGE_SCRIPT +
RANGE_ELIGIBLE (engine); the earlier blanket MG range-exemption is subsumed (MG gets the bonus
only in mid-far, ~23% of the fight). Wind-up no-core estimate (first 18 rounds) stands ⚑.
Also implemented: 1s unhittable windows at each band transition; units whose EFFECTIVE reload
is <=1s snap-refill during the window, others keep their mag; in-progress reloads continue.
RECALIBRATED under the new model: SR bolt recovery 30f -> 20f (helm 0.97-0.98 clean fights;
velvet 1.13 flagged); nayuta SR-swap cycle 2.3 -> 2.13s.

### U6 — Fight-level warm spots (largely dissolved by the 2026-07-13 rules)
Clarified: "T2-style" meant the specific T2 SAMPLE run read uniformly warm vs the same units
in other fights — sample variance or comp-specific modeling, not an archetype. After the
rider-range + projExpl + MG rules, the per-fight spreads mostly closed (board 0.89-1.18
except maiden). Revisit only if probe runs reopen it.

### U7 — Unvalidated new models → PROBE PLAN GENERATED (docs/probe-runs.md)
9 runs (A-I) covering 27 probe units with validated anchors in every run, honoring the paired
comps (mint+prika duet, emma+eunhwa duo, tia→naga shielder, rouge→cindy, trina→elec).

---

## ANSWERED

### A1 (Q2) — MG wind-up & the Privaty ammo-cut paradox — RESOLVED 2026-07-13
(a) Wind-up is skipped when total reload-speed buffs exceed 100% at reload (the reload still
happens, just fast) — implemented; crown-under-Privaty went 0.71 → 1.00. (b) The 3.75s cubic
wind-up was stale community lore: the user measured the exact frame ladder
(docs/nikke_mg_windup_model.md — 35 rounds / 142 frames, then 60/s; hard reset per
reload/stun, no partial retention) — implemented verbatim as MG_RAMP_INTERVALS; the
mgWindupSec/mgWindupExp knobs and A/B harness were removed. Also: Max Ammo ▼ clips the
current belt; max-ammo sources stack ADDITIVELY (important for future OL ammo lines).

### A2 (Q4) — Maiden 547.62% trigger — ANSWERED 2026-07-13
Procs on every normal attack where she full charged = every shot under sim conditions.
Implemented as shotFired (twin rockets are one attack). Residual → U2.

### A3 (Q5) — Mast:RM split readings — RESOLVED 2026-07-13
Correction from user: she WAS bursting (leftmost B2). Two fixes: Hangover stun re-gated from
every-3rd-global-FB-end to every 3rd of HER OWN bursts (the sim was stunning her sober), plus
the corrected MG wind-up. Now 1.03/1.10.

### A4 (Q6) — Little Mermaid Bubble Barrage — ANSWERED 2026-07-13
Per-hit confirmed: barrage 85%×10 = 850%, FB attack 63.36%×4; this damage never cores.
Driven by the new teamAmmo trigger (total ally ammo consumed; infinite ammo doesn't count —
engine's consumption path matches the in-game rule naturally). With the U1 exemption: 1.03-1.07.

### A5 (Q7) — Nayuta — RESOLVED (1.03 in T5)
530.46%/shot stage rider (150 full-screen + 380.46 stage extra DO stack), ramp-averaged
Memory-Absorption gates, 2.3s SR-mode cycle (bolt recovery).

### A6 (Q8) — SR bolt recovery — ANSWERED 2026-07-13
All standard SRs pause ~0.5s after each full-charge shot. Only exception: weapon-swap states —
which covers Red Hood's own post-B3 10s window exactly (her Red Wolf swap), plus SWHA Fully
Active and Nayuta SR mode. Units whose DB chargeFrames already bake the cycle in (SWHA
kit-fixed 1.2s, liberalio 90f) are exempt via charFixes.noBoltRecovery. Engine-wide
(SR_BOLT_RECOVERY_FRAMES = 30).

### A7 (Q10) — Pierce Damage ▲ — ANSWERED 2026-07-13
Boosts pierce-TAGGED units' hits regardless of pierce surfaces existing. Only kit-confirmed
pierce qualifies: red-hood permanent (hasPierce: true), CCW Snipe mode only (pierceModes),
base Cinderella none (was wrongly assumed). Implemented: hasPierce/pierceModes on OverrideFile;
pierceDamagePct joins the Damage Up bucket for tagged units.

### A8 (Q3) — CCW review — PROVIDED 2026-07-13
User supplied the full review; mechanics reconciled (334.2%/s basic verified, swap semantics,
nuke lands on FB-enter-after-her-burst which matches engine ordering, pierce Snipe-only).
Residual heat → U3.

### A9 (Q11) — MG class heat after the measured ladder — CALIBRATED 2026-07-13 ⚑
User estimates implemented (confirmation ask in U5): wind-up rounds before the 2-frame ladder
portion don't core; MG normals get no range bonus. MG class centered (crown 1.18 → 1.04 avg).

### A10 — Resolved during the original validation passes (2026-07-12)
- Distributed damage deals the same TOTAL vs 1 target as vs many — never model a split.
- Frame-0 rule: all full-burst buffs apply before any burst damage — burst nukes get the +50%
  multiplier, FB-entry auras, and same-cast stage buffs (engine reordered; independently
  confirmed by Prydwen's liberalio nuke math and Ein's S1 note). Fixed cinderella 0.55 → 1.09.
- Sustained/True/Sequential Damage ▲ gate on hit flavor, not globally.
- Cinderella is genuinely a Defender (DB correct); only her normal attacks core.
- The advantaged-Anis anomaly was a loadout-basis artifact; the elemental bucket is fine.
- Collection-item / Helm-burst charge buffs multiply BASE charge damage (chargeDamageMultPct).
- Scope-lock validation basis: no cube, no doll, OL0, 3★ core 7, sync 400, 10/10/10, treasure
  on, partless boss, 100% core exposure, full auto.
