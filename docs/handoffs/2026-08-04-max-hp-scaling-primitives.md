# Max-HP-scaling engine primitives — scope (handoff)

**Status: LANDED on the branch (owner-directed 2026-08-04), PR pending.** 2026-08-04, owner
request: "scope an engine primitive for Max HP scaling … units like Rouge, Cinderella, Maiden:
Ice Rose, Maxwell: Ordinary Mechanic — one to track Max HP buffs and one to gain something
(usually ATK) based on Max HP." Same session, owner ruled the one open kit question — maxwell
S2-A is CASTER-basis ("maxwell doesn't actually use the target's HP, that was a misread") — and
directed the fix + P1. Branch `worktree-max-hp-scaling` (worktree `.qwen/worktrees/max-hp-scaling`,
based on `origin/main` @ 85d22560).

**OUTCOME (2026-08-04):** P1a (`liveMaxHp` extraction, byte-identical — commit f8055b46), P2
(`atkOfCasterMaxHpPct` + maxwell override fix, commit 9afac614) and P1b (`stackedNuke.hpPct`
live read, maiden r2 closed — this commit) all landed test-first on this branch. DECISIONS 2026-08-04
carries the ruling + blast radius. The scope text below is preserved as the design record;
resolved questions are marked inline. Still OPEN (non-goals by design, §4 out-list + §8): the
reporting-layer `UnitResult.maxHp` basis, grant re-derivation semantics, the cinderella G1
owner popup re-read (M3), and the branch's PR itself.

**Headline:** both primitive families ALREADY EXIST and are partly wired (theme-13 landing
2026-07-17, `docs/engine-modeling-gaps.md:586`; cinderella wiring 2026-07-17). The real scope is
two GAPs, not greenfield:

- **P1 — track Max HP buffs:** promote "live Max HP" from an inline local inside `effectiveAtk`
  to a first-class, queryable unit state with a defined feed scope (today only the own-kit
  HP→ATK conversion can see it; the burst HP-damage term, the result/sustain reporting, and any
  future consumer all read BASE Max HP).
- **P2 — gain a stat from Max HP:** add the CASTER-basis HP→ATK grant (maxwell-ordinary-mechanic
  flag-1 is the sole carrier pressure; the existing `atkOfMaxHpPct` resolves per-target OWN HP).

Both carry measurement-gated open semantics and tuned-unit blast radius — see §6.

---

## 1. What exists today (anchors verified on 85d22560)

| Channel | Meaning | Where / when resolved | Feeds damage? |
| --- | --- | --- | --- |
| `casterMaxHpPct` (StatKey) | grant flat Max HP = % of CASTER's Max HP | apply time → `maxHpFlat` buff, value `(v/100)×owner.maxHp` (STATIC) — `sim.ts:2303`, `sim.ts:2310` | only via e3 rule below |
| `targetMaxHpPct` (StatKey) | grant flat Max HP = % of TARGET's OWN Max HP | apply time per target, `(v/100)×t.maxHp` (STATIC) — `sim.ts:2327` | ditto |
| `maxHpPct` (StatKey) | self "Max HP ▲ %" (Vigor cube / extras) | unit init → self `maxHpFlat` — `sim.ts:917` | ditto |
| `maxHpFlat` (buff stat) | the tracked Max HP buff itself | buff carries `casterIdx`; expiry/stacks/ramp honored | **e3 rule:** feeds `liveMaxHp` in `effectiveAtk` ONLY when `casterIdx === self` — `sim.ts:1574-1600` |
| `atkOfMaxHpPct` (StatKey) | flat ATK = % of unit's OWN live Max HP | per-frame in `effectiveAtk`: `(stat/100)×liveMaxHp`, `liveMaxHp = u.maxHp + own-kit maxHpFlat` — `sim.ts:1596-1600` | yes |
| `stackedNuke.hpPct` | damage term = % of owner Max HP folded into the nuke as ATK-equivalent | cast time, reads BASE `owner.maxHp` — `sim.ts:2731-2735` | yes (forced non-crit/non-core) |
| `shield.maxHpPct` / heal magnitudes | % of caster final Max HP | EVENT-ONLY (no HP pool); recorded for the sustain analytic layer which reads BASE `UnitResult.maxHp` (`sim.ts:3972`, `src/ranks/sustain.ts:247`) | no |

**The e3 rule (MEASURED — never relax without ≥same-tier evidence):** "ATK ▲ X% of Max HP"
conversions count the consumer's OWN Max HP incl. own-kit stacks; ally-granted Max HP buffs do
NOT feed. Source: cinderella focus video (FB-proc popups fit own-HP math within 2% early AND
late; ~28% higher if rouge's grants fed). SSOT: `docs/data/damage-calculation.md:103-107`.

## 2. Roster census (structural scan of `src/skills/overrides/*.json`, 85d22560)

Per-stat carrier tables live in `docs/engine-modeling-gaps.md:34/44/110` — the authoritative
census. Summary: `atkOfMaxHpPct` 5 carriers; `casterMaxHpPct` 12; `targetMaxHpPct` 11;
shield `maxHpPct` ~12 (event-only).

`atkOfMaxHpPct` consumers: **2b** (self passive 6.16), **cinderella** (self stageEnter 2.71/10s),
**laplace-ultimate-hero** (self passive 4.05), **maiden-ice-rose** (self burstCast 3.2/10s),
**maxwell-ordinary-mechanic** (burstCast → ALLIES 1%/15s — the ONLY ally-targeted carrier).

## 3. The four named units → what each needs

### rouge (grant side; CALIBRATED, graded)
All Max HP lines are `casterMaxHpPct` ALLY grants: S1 hitCount:8 → allies 5%/5s (encoded);
S2 burstCast everyN:5 → allies 15.08 (encoded); the three coin-tier burst riders
(10.15/20.1/30.02) are `unmodeled` (coin-state-gated, no coin-state engine primitive). All
offensively INERT via e3 — proven zero-damage in her gauntlet; the unit test asserts the
inertness. She is the measured grant-side of the e3 rule. **Needs from P1: nothing for damage —
her grants become *queryable* (reporting/sustain completeness) but MUST stay damage-inert.**
Her real residuals (coin exclusivity, Shield-Coin heal asymmetry) are trigger-fidelity, not
Max-HP-primitive, problems.

### cinderella (consumer side; MEASURED, graded — the anchor unit)
Self `casterMaxHpPct 19.2 rampSec 36` (Beautiful) feeds her own `atkOfMaxHpPct 2.71` — modeled
+ popup-validated (early/late FB-proc growth reproduced). Her e3 focus video IS the rule in §1.
Open (orthogonal but same machinery): **G1 same-cast snapshot** — with
`burstSnapshotsPreFb:false` her nuke snapshots her own same-cast stage-3 conversion; contradicts
the historical e3 timing read; owner popup re-read settles it (kit-status `residual`). Any P1
refactor must keep her numbers byte-identical or go through the gated pass.

### maiden-ice-rose (both sides; MEASURED, graded)
- Self `targetMaxHpPct 6.34 ×10, hitCount:6, 15s` feeds her own `atkOfMaxHpPct 3.2` — the ONE
  offensively-live self-fed grant on the roster (board-verified +11.6% on N6 Wind, theme 13).
- Burst `stackedNuke {atkPct 1372.8, hpPct 137.28}` — kit: "1372.8% of (10% of Max HP + ATK)"
  per MP. **Residual r2:** `hpEquivPct` reads BASE `owner.maxHp` (`sim.ts:2733`), so her own S1
  Max-HP stacks do NOT feed the HP portion (they do feed her 3.2% consumer). Kit says "final
  Max HP" → live is the faithful reading. Estimate ≤1% of burst damage (1–2 stacks ≈ +6–13%
  Max HP × the 10% HP share). Recipe: `liveMaxHp` in the hpEquivPct term. This is exactly P1's
  first consumer beyond `effectiveAtk`.
- Residuals r1/r3/r4/r6 (MP init, forced non-crit, trigger fold, threshold) are stackedNuke
  semantics, NOT Max-HP-tracking — do not bundle.

### maxwell-ordinary-mechanic (both sides; MODEL_ONLY, untuned)
- S1-A: `shotFired` → allies `casterMaxHpPct 1` ×30 stacks, continuous. Ally side inert (e3);
  her OWN stacks feed her own S2-A conversion (caster===target is the one case e3 admits) —
  this is her only S1 damage path.
- S2-A: `burstCast` → allies `atkOfMaxHpPct 1` /15s. **Flag-1 (the P2 driver):** kit reads
  "ATK up 1% of the SKILL USER'S final max HP" (caster-basis, equal flat add to every ally),
  but the engine resolves per TARGET'S OWN live Max HP. Exact for Maxwell herself; per-ally
  error ≈ 1% × (allyMaxHp − casterMaxHp) — second-order, does not move Maxwell's own damage.
  Recipe: focus popup-read an ally's ATK-buff magnitude next to Maxwell's Max HP.
- Interaction trap: today her self-granted S2 buff on HERSELF re-reads her live Max HP every
  frame, so her S1 stacks feed her own S2 continuously. A caster-basis flat resolved at GRANT
  time would snapshot her stack count at cast — a behavior change on her own damage even if
  flag-1 resolves "caster-basis". The enactment must choose and pin this (§5, Q2).

## 4. P1 — track Max HP buffs (live Max HP as first-class state)

**Shape:** extract the own-kit Max-HP summation out of `effectiveAtk` into a single helper
(`liveMaxHp(u, frame)` — base + own-kit `maxHpFlat`, honoring expiry/stacks/ramp, exactly the
`sim.ts:1582-1596` loop) and point every Max-HP reader at it:

1. `effectiveAtk` (no behavior change — same value, one code path).
2. `stackedNuke.hpPct` (maiden r2 — base → live; measurement-gated, §6 M2).
3. Future consumers get ONE documented entry point instead of re-deriving the e3 scope.

**Deliberately OUT of P1 (each needs its own ruling, none is free):**

- **Ally-grant inclusion.** e3 forbids ally grants from feeding damage conversions. If a future
  non-damage consumer wants total Max HP incl. ally grants (e.g. a shield/decoy size read), it
  gets an explicit opt-in scope flag — the default stays own-kit.
- **Reporting layer.** `UnitResult.maxHp` exposes BASE (`sim.ts:3972`) and `src/ranks/sustain.ts`
  ranks heal/shield magnitudes against it. Exposing a live value there shifts sustain ranks —
  separate owner call, not a silent change.
- **Grant re-derivation.** Grants snapshot the grantor's STATIC Max HP at apply time
  (`owner.maxHp` / `t.maxHp`); a later Max HP buff on the grantor does NOT retroactively grow
  already-granted flats. Probably-correct snapshot semantics, UNMEASURED — flag, don't change
  (cinderella's Beautiful ramp works via buff `rampFrames`, not re-derivation).
- **Coin-state / conditional grant fidelity** (rouge) — trigger layer, separate gap.

**Blast radius:** cinderella + maiden-ice-rose are MEASURED/graded; any P1 enactment that moves
their numbers is a `/scientific-method` gated pass, not a refactor. A pure extract-helper P1
(step 1 only) should be byte-identical across the board — that is its landing contract
(regression snapshot unchanged).

## 5. P2 — gain a stat from Max HP

**Exists:** `atkOfMaxHpPct` (own-basis, per-frame recompute in `effectiveAtk`) + `stackedNuke`
hp-damage term. Roster consumers are ATK-only — "usually ATK" is "always ATK" today; do NOT
build DEF/other-stat variants without a carrier (two-carriers-is-not-a-mandate precedent).

**Gap — caster-basis ATK grant.** New StatKey (shape): `atkOfCasterMaxHpPct` — "ATK ▲ X% of the
SKILL USER'S final Max HP" granted to others, resolved to a FLAT add at apply time, the same
pattern as `casterAtkPct` (`(v/100)×owner.staticAtk`, `sim.ts:2299`) — i.e.
`(v/100)×<caster Max HP>` as a flat `casterAtkPct`-routed buff. Carrier: maxwell-ordinary-mechanic
S2-A (sole). Open semantics, in dependency order (ALL RESOLVED 2026-08-04, owner-directed):

- **Q1 — whose HP? RESOLVED (owner ruling):** the kit says "the skill user's final max HP" —
  caster-basis. The shipped target-own resolution was a misread; the primitive was built.
- **Q2 — static vs live caster Max HP at grant time. RESOLVED:** LIVE at apply time — "final"
  is kit-literal for buffed; her own S1 stacks feed the basis (snapshot per cast, pinned by the
  spec's per-cast value + growth assertions).
- **Q3 — does e3 generalize? RESOLVED:** yes, same scope — the caster's OWN-kit Max HP buffs
  feed the basis; ally-granted Max HP on the caster does not (liveMaxHp reader, no new rule).

**Not a P2 item:** the `stackedNuke` hp-term live-read belongs to P1 (it is a tracking read, not
a grant); maiden r3's forced non-crit is a separate stackedNuke semantics question.

## 6. Measurement + authorization checklist

| # | Question | Status |
| --- | --- | --- |
| M1 | maxwell S2-A caster- vs own-HP basis (Q1) | RESOLVED — owner ruling 2026-08-04 (misread; caster-basis). No popup needed |
| M2 | maiden burst "final Max HP" = live? (r2) | RESOLVED — kit text literally says "final Max HP"; enacted kit-literal, pinned by the spec's doubling discriminator. Landed N6 +5.52% / CTRL +3.88%, FB counts unchanged |
| M3 | cinderella G1 same-cast snapshot | STILL OPEN (orthogonal, owner popup re-read; kit-status `residual` has the recipe) |

**Authorization status: owner-directed 2026-08-04** (ruling + "make the fix, then proceed with
p1"). Landed test-first in this isolated worktree per CLAUDE.md constraint 8; the branch goes to
`origin/main` via PR (owner-gated), never onto local `main`. All four carriers' spec tests pin
the new behavior; regression snapshots re-simmed with the change.

## 7. Landing checklist — DONE (2026-08-04)

1. ✅ P1 step 1 (extract `liveMaxHp`) landed FIRST, alone, byte-identical (f8055b46).
2. ✅ P2 (`atkOfCasterMaxHpPct` + maxwell override/spec, 9afac614) and P1 step 2 (stackedNuke
   live read + maiden spec/snapshots, this commit) landed as separate slices, each RED→GREEN.
3. ✅ Updated on landing: `docs/data/damage-calculation.md` §1 Max-HP bullets, `docs/STATE.md`
   §5 primitive row, the `engine-modeling-gaps.md` census (doc-drift --update), both carrier
   overrides' notes, both kit-status residuals, DECISIONS 2026-08-04, QUEUE pointer.
4. ✅ Mechanics docs synced with the `sim.ts` changes (same commit).

## 8. Adjacent-but-distinct (do not fold in)

- **HP pool + HP-threshold triggers** (QUEUE "ENGINE PRIMITIVE GAP" entry) — CURRENT-HP domain
  (damage intake, "HP ≤ X%", heal magnitudes). Shares the "no HP pool" note; different surface.
- **rouge coin-state machine** — trigger fidelity; her Max HP lines are inert regardless.
- **Sustain-rank heal/shield magnitudes** (`src/ranks/sustain.ts`) — reporting layer, base-HP
  basis is its own decision (§4 out-list).
- **`addStack` / windowed-damage-accumulator gaps** — unrelated primitive families in the same
  queue section.
