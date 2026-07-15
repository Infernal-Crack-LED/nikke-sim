# Exposed under-model audit — Assault-Rifle / Shotgun units after the range-dependent core table

**Date:** 2026-07-15
**Author:** diagnostic sub-agent (s4), diagnosis only — no engine value, override, or core table
was changed.

## Why this audit exists

We replaced the flat per-weapon auto-aim core-hit rate (Assault Rifle / Submachine Gun / Shotgun
all 0.85) with a **range-dependent per-(weapon, band) table** measured from solo scope-lock
recordings (`src/engine/sim.ts` around line 509):

| weapon | near | mid | mid-far | far |
|---|---|---|---|---|
| Assault Rifle | 0.40 | 0.30 | 0.03 | 0.00 |
| Submachine Gun | 0.28 | 0.244 | 0.076 | 0.059 |
| Shotgun | 0.072 | 0.00 | 0.0045 | 0.00 |

Assault-Rifle values are measured from **Scarlet only** (small samples: mid n=20, near n=36) and
are flagged **provisional** in the code and in open-questions A9. The Shotgun near value (0.072,
from Drake) is explicitly a **lower bound** pending closer-range research.

Dropping from a flat 0.85 to these much lower values removed a systematic hot bias but exposed
several Assault-Rifle / Shotgun units that now read cold. The old 0.85 was over-crediting their
cores, which **masked** whatever their true normal-attack model does. This audit asks, per unit:
is the coldness (A) a genuinely missing observed mechanic, (B) the expected consequence of the
Shotgun-near lower bound / provisional Assault-Rifle table (a *shared-table* refinement, not a
per-unit fix), (C) an honest documented approximation now un-masked, or (D) something needing new
focused footage to localize?

**No focused footage exists for any of the six units.** The only processed core-band probes are
Scarlet (Assault Rifle), Chisato (Submachine Gun), Drake (Shotgun). A **Moran Assault-Rifle
recording exists but was never processed** (`docs/probes/ar-sg-smg/moran ar.MP4`) — it is the
second Assault-Rifle anchor the table needs.

The governing rule is the accuracy-to-observed-mechanics invariant: **do not raise a core rate or
add a buff just to re-center the board.** Only faithful fixes backed by kit text or footage, or an
honest OPEN note.

## Ranked findings (highest leverage first)

Leverage = number of graded comps × distance from 1.0, weighted toward actionable class-A fixes and
toward units whose own damage is a large share of the board.

| rank | unit | weapon | comps | current cold ratio(s) | class |
|---|---|---|---|---|---|
| 1 | Dorothy: Serendipity | Shotgun | 2 | 0.76 (Fire boss), 0.61 (Electric boss) | **A** + B |
| 2 | Grave | Assault Rifle | 3 | 0.83–0.84 | **B (Assault-Rifle table)** |
| 3 | Noir | Shotgun | 2 | 0.73–0.74 | **B (Shotgun lower bound)** |
| 4 | Soda: Twinkling Bunny | Shotgun | 1 | 0.61 | **A** + B |
| 5 | Naga | Shotgun | 2 | 0.56 (with shielder), 0.71 (no shielder) | **B (Shotgun lower bound)** |
| 6 | Guillotine: Winter Slayer | Assault Rifle | 2 | 0.93–0.94 | **B (Assault-Rifle table) / C** |

---

### 1. Dorothy: Serendipity (Shotgun) — CLASS A (genuine missing mechanic) over a class-B base

**Cold in:** PH water B3s (Fire boss) 0.76; N9 redhood/elegg (Electric boss) 0.61. All damage in
the normal-attack bucket; she is never the camera focus in either comp.

**Full kit audit (override present):**
- Skill 1 "hit target with 80 pellets → Attack Damage +72%, Hit Rate +98.18%, **pellet count
  fixed at 1**, **gains Pierce**, for 3 rounds" — **PARTIALLY IMPLEMENTED.** Attack Damage +72%
  is modeled (hitCount 80 → re-triggers ~every 8 shots, effectively permanent). **The
  pellet-count-fixed-at-1 + Pierce + 98% hit-rate consolidation is NOT modeled** (note: "flagged
  uncertain… net effect on a lone boss is roughly a wash but genuinely unclear").
- Skill 1 second block "160 pellets → expand Pierce range 200%" — SKIPPED (Pierce inert on a
  partless boss; correct).
- Skill 2 passive Pierce Damage +55.08% — IMPLEMENTED but inert (Pierce bonus does nothing on a
  single target; correct-inert).
- Skill 2 Full-Burst ATK +75.24%, Hit Rate +40.68% — IMPLEMENTED (ATK on full-burst-enter; hit
  rate inert-fidelity).
- Burst Attack Speed +65%, ATK +88.12%, **pellet count +5 for 15 s** — the pellet buff is
  approximated as normal-attack +50% (5 extra pellets on a base of 10). IMPLEMENTED as an
  approximation.

**Classification — A.** The Shotgun-spray core rate (0.072 near, ~0 elsewhere) was measured from
**Drake's 10-pellet spray**. Dorothy's Skill 1 puts her into a **single consolidated pellet with
98% hit rate and Pierce for 3 of every ~8 shots** — i.e. ~35–40% of her shots are fired as one
accurate bullet, which cores far more like an Assault Rifle (0.30–0.40 near/mid) than a shotgun
spray (0.072). The engine fires a fixed 10 hits/shot at the shotgun-spray core rate for the whole
fight, so it never captures her precision-core windows. This is an **observed, damage-relevant
mechanic being dropped**, and it is the single best explanation for her being colder than the
other shotguns.

**Faithful-fix HYPOTHESIS (do not implement without validation):** model the Skill 1 window as a
consolidated single-pellet mode — during the 3-round window, treat her shots as 1 hit/shot at an
Assault-Rifle-class core rate for the current band, instead of 10 pellets at the shotgun rate.
Total per-shot base damage should be conserved (all pellet coefficient folded into the one hit),
so the change is a **core-rate uplift on ~35–40% of her shots, not a damage inflation**. This
needs an engine notion of "consolidated-pellet state" (currently absent) and, ideally, a focused
Dorothy: Serendipity recording to confirm her in-window core rate before landing. Underneath this
class-A effect she also carries the class-B shotgun-near lower bound on her out-of-window shots.

---

### 2. Grave (Assault Rifle) — CLASS B (shared Assault-Rifle table), no per-unit missing mechanic

**Cold in:** PI2 0.84, PI 0.84, N1 0.83. Uniform across three comps; **100% of her damage is the
normal-attack bucket** (no skill riders, no damage-relevant burst).

**Full kit audit (override present):**
- Skill 1 team Burst-Gauge speed +38.96% + Pierce Damage +48.4% — IMPLEMENTED as passive (Pierce
  bonus inert on one target; gauge speed correct). Self-heal / "remove bullets / reload-ratio"
  dropped as non-damage (correct).
- Skill 2 Overheat I ATK +15.48% (15 hits) — IMPLEMENTED, approximated as sustained (ignores the
  per-reload reset → slight **over**count). Overheat II +20.66% / III +30.8% require Prediction
  (burst) and ramp over 30/60 hits — modeled as full-window uptime tied to burst → slight
  **over**count. Both approximations run *hot*, so they are not the cold source.
- Burst: unlimited ammo, self Crit Rate +85.19% + Pierce, team Attack Damage +48.2% + Pierce +
  max ammo — IMPLEMENTED faithfully. HP-drain self-cost dropped (correct).

**Classification — B (Assault-Rifle table refinement), not a per-unit fix.** Grave is almost a
pure normal-attack Assault Rifle, so she is the **cleanest possible probe of the Assault-Rifle
normal-attack model** — and she reads 0.83 cold. Note the tension: **Scarlet grades hot (~1.13)**
with this same table, but Scarlet's total is dominated by her skill riders (large skill bucket),
which *mask* her normal-attack bucket; Grave has no riders, so she *exposes* it. This is the exact
"exposed under-model" pattern: the provisional, small-sample (mid n=20 / near n=36),
Scarlet-derived Assault-Rifle near/mid values may be **slightly low**, and a rider-free unit shows
it. The two Assault-Rifle units here are cold in a *correlated, damage-mix-explained* way (Grave
100% normals → 0.83; Guillotine ~65% normals + 35% damage-over-time → milder 0.93), which points at
the **shared table**, not per-unit mechanics.

**Action (not a per-unit tune):** process the existing **Moran Assault-Rifle footage**
(`docs/probes/ar-sg-smg/moran ar.MP4`) to give the Assault-Rifle core table a second independent
anchor, and consider a focused Grave recording. If the second anchor confirms higher Assault-Rifle
near/mid, that is a faithful *shared-table* correction (open-question A9), and Grave/Guillotine move
toward 1.0 for free. Do **not** add a Grave-specific core rate or buff.

---

### 3. Noir (Shotgun) — CLASS B (shotgun-near lower bound), pure, no per-unit issue

**Cold in:** PI2 0.73, PI 0.74. All damage in the normal-attack bucket. **No override — parser
output only.**

**Full kit audit (parser only):**
- Skill 1 "above 70% HP → team ATK +14.08% of caster ATK" — IMPLEMENTED (passive caster-ATK aura).
- Skill 2 full-burst-enter team max-ammo +5 + reload 39.88% — IMPLEMENTED.
- Burst: 351.64% nuke (flatDamage), shotgun-ally hit-rate / interrupt-part buffs — IMPLEMENTED.

**On the zero burst bucket:** Noir's 351.64% burst nuke shows `b 0` because the comp runs **three
Burst-III units** (Jill, Chisato, Noir) and only one Burst-III fires per rotation; the leftmost
waiting unit (Jill) wins the slot, so Noir never casts. This is **correct** rotation behavior and
matches her small real total (~163M = chip damage from normals only).

**Classification — B.** With her burst inert, Noir's entire output is 10-pellet shotgun spray
governed by the shotgun-near lower bound (0.072). Her 0.73 sits right alongside the other pure-
normal shotguns — this is the lower-bound, **not** a per-unit under-model. She is the cleanest
data point for "how cold does the shotgun-near lower bound make a pure-normal shotgun." Fix comes
from the shotgun-near close-range research (raising the shared shotgun-near value), never a Noir
change.

---

### 4. Soda: Twinkling Bunny (Shotgun) — CLASS A (skipped Golden Chip buffs) over a class-B base

**Cold in:** N3 scarlet/liberalio (Iron boss) 0.61. Damage split normal-attack (55) + skill flat
(29); no burst bucket (single Burst-III cast goes to the rotation, her nuke is modeled as flat).

**Full kit audit (override present):**
- Skill 1 "start with 50 Golden Chips" — represented only as a note; the chip economy is
  time-averaged in prose, not tracked.
- Skill 1 "after 3 normal casts during Full Burst → **Golden Chip: Critical Damage +1.32%,
  stacks up to 50**" — **SKIPPED** (parser marks the trigger unsupported). At the cap this is
  **+66% crit damage** to self.
- Skill 1 "after 3 normal casts during Full Burst → self + top-ATK ally **Attack Damage +10.51%**
  for 2 s" — **SKIPPED** (unsupported trigger).
- Skill 2 full-burst extension (+2/+3 s) and the per-Full-Burst-cast flat damage (52.04/85.02%,
  averaged to 100%) — IMPLEMENTED (averaged approximations).
- Burst 628.7% nuke + first-burst-only ATK +65.25% — IMPLEMENTED. Reload padding modeled
  (`charFixes.reloadFrames 182`, measured).

**Classification — A (with B underneath).** The crit-damage stacking is a **real observed damage
mechanic** and the engine already supports crit-damage buffs (`critDamagePct`, sim.ts line 686) —
it is being dropped purely because the parser can't read the "3 normal casts during Full Burst"
trigger. At 50 stacks (+66% crit damage) with her base 15% crit rate plus her hit-rate buffs, the
expected-value uplift is modest but genuine (roughly +8–10% on the crit portion of her normals),
plus the +10.51% attack-damage window. This is a faithful fix, not a fudge.

**Faithful-fix HYPOTHESIS (do not implement without validation):** model the Golden Chip
crit-damage stack as a `critDamagePct` buff that ramps under Full Burst (3 normal casts per stack,
cap 50 = +66%), and the +10.51% attack-damage pulse to self + top-ATK ally. Both are keyed to
"normal cast during Full Burst," so a Full-Burst-gated stacking buff is the right shape. **Her
class-B base remains:** most of her normal damage is shotgun spray at the near lower bound, so even
with Golden Chip modeled she will stay somewhat cold until the shotgun-near value is researched.

---

### 5. Naga (Shotgun) — CLASS B (shotgun-near lower bound), supporter, tiny own damage

**Cold in:** PC shields (with shielder) 0.56; N2 modernia (no shielder) 0.71. All in the
normal-attack bucket; she is a Supporter and her own damage (~97M / 48M) is a small share of the
board.

**Full kit audit (override present):**
- Skill 1 shield-gated team Core-Damage +85.17% — IMPLEMENTED via the "with shielder" mode
  (full-burst-enter, full uptime); the engine has no shield tracking, so the mode is the faithful
  proxy for her always-run-with-a-shielder identity. This buff **helps her teammates' cores, not
  her own damage.**
- Skill 2 5-hit Core-Damage +40.07% to top-ATK allies — IMPLEMENTED (parser-faithful).
- Burst caster-ATK +16.18% (+31.02% with shielder) team auras — IMPLEMENTED. Heals / cover
  restore dropped (non-damage; correct).

**Classification — B.** Naga's *own* output is pure 10-pellet shotgun spray at the near lower
bound; that is why her personal ratio is low. Her value to the board is her ally buffs (correctly
modeled). The with-shielder 0.56 vs no-shielder 0.71 gap is a small absolute swing on a supporter,
not a mechanic gap. No per-unit under-model — she rides the shotgun-near lower bound. Low leverage
(her own damage barely moves the board).

---

### 6. Guillotine: Winter Slayer (Assault Rifle) — CLASS B / C, mild, no meaningful missing mechanic

**Cold in:** PH water B3s (Fire boss) 0.93; N8 emma/eunhwa (Fire boss) 0.94. Damage is
normal-attack plus a damage-over-time bucket (~35% of her total), which dilutes core-rate
sensitivity — hence she is only mildly cold.

**Full kit audit (override present):**
- Skill 1 Hero-Level system (max level 11) → Water-ally Elemental-Advantage +12.76% and caster-ATK
  +10.01%, self Elemental-Advantage +7.46% — IMPLEMENTED as steady-state level-11 auras with a
  slight ramp haircut. Level-up reload reward IMPLEMENTED (hitCount 30 instant reload).
- Skill 2 EXP ATK-stack **from 6 non-core hits** (+1.81%, cap 100) — IMPLEMENTED (hitCount 6,
  maxStacks 100). **The parallel "hit core 3 times → EXP stack" path is SKIPPED (unsupported
  trigger).** This is **not** a real under-model: both paths feed the **same 100-stack cap**, and
  the non-core path alone saturates the cap for most of a 180 s fight, so the dropped core path is
  redundant at steady state (correct-skipped).
- Burst Water-ally Attack Damage +10.14% / Elemental-Advantage +18.75%, plus the 20.87% × Hero
  Level per-second damage-over-time → 229.57%/s for 10 s — IMPLEMENTED.

**Classification — B (Assault-Rifle table) / C (honest approximation).** Same provisional
Scarlet-derived Assault-Rifle table as Grave; her damage-over-time bucket dilutes the effect so she
lands at 0.93, comfortably inside noise for a partly-rider unit. No per-unit missing mechanic. Any
movement toward 1.0 comes from the shared Assault-Rifle table refinement (process Moran footage),
not a Guillotine change. Lowest leverage of the six.

---

## Cross-cutting conclusions

- **Two of six are genuine per-unit missing mechanics (class A):** Dorothy: Serendipity's
  single-pellet consolidation (Skill 1) and Soda: Twinkling Bunny's skipped Golden Chip
  crit-damage + attack-damage buffs. Both are observed in kit text, both are faithful fixes (not
  board-fitting fudges), and both still sit on a class-B shotgun base underneath.
- **The shotgun coldness (Noir, Naga, and the residual on Dorothy/Soda) is the shotgun-near lower
  bound (class B).** It is fixed by the pending close-range shotgun core-rate research raising the
  **shared** shotgun-near value — never by per-unit changes.
- **The Assault-Rifle coldness (Grave, Guillotine) is the provisional, small-sample,
  Scarlet-derived Assault-Rifle table (class B for Assault Rifle).** Grave — a rider-free
  Assault Rifle — is the sharpest evidence the shared Assault-Rifle near/mid values may be slightly
  low, masked on Scarlet by her skill riders. **The Moran Assault-Rifle footage already exists and
  should be processed** to give the table a second anchor (open-question A9).
- **No fudge is warranted anywhere.** Every cold reading traces to either a faithful missing
  mechanic (fix the mechanic) or a provisional/lower-bound shared core-rate value (refine the
  shared measurement). None calls for tuning a number to re-center the board.

## RECONCILIATION with s1 (SG research) — added 2026-07-15 after both subagents returned

This audit ran in PARALLEL with the SG-core online research (s1) and assumed the shotgun-near value
0.072 was a raisable LOWER BOUND. **s1 REFUTES that premise:** ore-game verify-memo measures SG
front-row core ~6% (auto, base accuracy), converging with our 0.072 — SG near is CORRECT, not low,
and must NOT be raised (`docs/probe-data/sg-core-research.md`). Consequences for this audit:
- **Noir / Naga (pure-SG "class B, fixed by raising shotgun-near"): premise INVALID.** Their coldness
  is NOT fixed by a higher SG core rate. It is a genuine EXPOSED under-model in their non-core (body)
  damage — the old flat 0.85 core over-credit was masking it. Most likely the near-range **pellet-body
  hit-rate / hitsPerShot crediting** (s1's flagged candidate) or an honest SG-cadence under. Reclassify
  Noir/Naga: **OPEN exposed under-model (needs SG focused footage or a pellet-landing model), NOT a
  core-rate fix.** Naga is a supporter with tiny own damage → low priority; Noir is parser-only.
- **Dorothy / Soda (class A) UNCHANGED** — real per-unit missing mechanics, independent of the SG-near
  question (Dorothy's fix is a pellet-CONSOLIDATION that raises her to an AR-class rate; Soda's is a
  crit/attack-damage buff). Both stand as faithful-fix candidates.
- **Grave / Guillotine (class-B AR): s2 RESULT REFRAMES THIS.** Moran CONFIRMS AR near = 0.40 (two
  methods agree exactly; matches Scarlet) — the AR table is NOT too low, so it does NOT explain grave's
  0.83 coldness. Like noir/naga on the SG side, grave (rider-free, 100% normal bucket) has a SEPARATE
  exposed under-model in her non-core normal damage (cadence / uptime / ATK) that the old flat 0.85 core
  over-credit was masking. Reclassify: **OPEN exposed under-model, NOT an AR-table fix.** Guillotine is
  the same, diluted by her DoT bucket (milder). Needs grave focused footage to diagnose the non-core gap.
- **Net:** the shotgun "shared research fixes it" line above is SUPERSEDED for the core rate — the SG
  research is DONE and says 0.072 stands. Remaining SG work is per-unit (Dorothy/Soda mechanics) or a
  separate pellet-body-hit investigation (Noir/Naga), not a core-table change.
