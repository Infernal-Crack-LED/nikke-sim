# Engine modeling gaps — cross-unit thread inventory

> **Status: OPEN INVESTIGATION** (opened 2026-07-17). AI-facing catalog.
> Derived by reading every unit's `unmodeled` + `caveats` in `data/kit-status.json` (74 units) and
> grouping the recurring gaps. This is NOT a decision log — it is a triage map of where the same
> modeling limitation recurs across many units, so a single engine fix can move a whole cluster at
> once instead of chasing per-unit residuals.
>
> Source of truth for any individual unit stays `data/kit-status.json` (findings/unmodeled/caveats)
> and its override. Settled WHY lives in `docs/DECISIONS.md`; genuinely-unresolved research lives in
> `docs/open-questions.md`. This doc is the connective tissue: "these N units share one root cause."
>
> **Ratio direction (see docs/CONVENTIONS.md):** board = `sim/real`. **HOT ▲ = sim over-credits**
> (ratio > 1); **COLD ▼ = sim under-credits** (ratio < 1).

## Status dashboard — at a glance

> Every theme bucketed by implementation state (verified against the live tree 2026-07-17). Jump to the
> numbered theme below for detail. **Nearly every discrete engine-primitive gap has now been built** — what
> remains is per-unit *enactment* of built primitives (board-moving → measurement-gated) plus inherent-v1
> limitations and measurement backlogs.

### ✅ A. Completely done — primitive wired AND fix enacted/board-verified
| Theme | Capability | Enacted on |
|---|---|---|
| 2b. Recovery-event emitter | `heal.ticks`/`recoveryEmitters` | anchor-innocent-maid, blanc *(HoT backfill tail: prika/trina/mint/naga/mana/anis-star)* |
| 6. Parts-branch HOT fix | SKIPPED-CONDITIONAL | d-killer-wife (1.055→0.998), takina |
| 6/10. `bossElementGate` | block gate composes w/ any trigger | helm-aquamarine, brid-silent-track |
| 8. `hitRatePct` → core lift | `HRCORE` (live default) | roster-wide *(refinements: asuka bracket, quency)* |
| 9. Own-burst-gated FB | `ownBurstGate:'cast'/'notCast'` | cinderella-crystal-wave (T8 1.062→1.001) |
| 11. `excludeSelf` on typed allies | resolveTargets honors it | maiden-ice-rose (1.55→1.03), brid/miranda/soda |
| 12. Per-DoT crit | `dot.crit` opt-in (global gate stays off — recal deferred) | isabel |
| 13. Max-HP grants | `targetMaxHpPct` + `alliesLowestHp` | maiden-ice-rose (self-fed, 0.76→0.85) + completeness |
| 16. Treasure SSOT | sync favorite-item prose | helm (0.591→1.014), laplace/moran/miranda/drake |

### ⚙️ B. Wired but NOT enacted / disabled pending verification — capability exists, opt-in is board-moving
| Theme | Capability (inert until opt-in) | State |
|---|---|---|
| 3. Stack-ramp | `buff.rampSec` | ENACTED cinderella + arcana-fortune-mate; rest (chisato/leona/guilty/…) measurement-gated |
| 4. Team-composition gate | `teamHas:{element/class/weapon/burst}` | **0 enactments**; arcana deferred (no board data + WoF gate unmodeled) |
| 5. Timed pierce | `gainPierce`/`pierceUntilFrame` | grave ENABLED (0.83→1.18, faithful>fit, U19); milk/prika deferred |
| 7. Weapon-swap spec | `weaponSwap.weapon`/`pullsPerSec` | nayuta FIXED; moran throughput + chisato/takina/velvet pending |
| 14. Flat Max-Ammo | `maxAmmoFlat` StatKey | **0 enactments**; grave/noir/tove/drake/trina approximate as % |
| 15. Ammo-dump | `consumeAmmo` effect | **0 enactments**; grave/asuka-wille/jill need trigger authoring |

### ❌ C. Unwired / inherent-v1 limitation / measurement-only — no discrete primitive to build
| Theme | Why it's here |
|---|---|
| 1. Cadence tuple (~22 units) | measurement backlog (video plan), not an engine gap |
| 2. Defensive/heal/shield (~25 units) | no HP pool in v1 (immortal boss) → inert by design |
| 17. User-selected modes (8 units) | config/owner-review, not a primitive |
| 18. Kill-gated effects (~4 units) | inherent (immortal solo boss) |
| 19. SG pull-vs-pellet + per-unit landing | measurement/calibration (open-questions U17) |
| 12-tail. eve Mk2 sequential-doubling | open sub-caveat, no primitive yet |

---

## Highest-leverage engine fixes (ranked by blast radius)

These are systematic limitations, not per-unit fudge. Each would correct many units at once.

1. **Per-tick recovery-event emitter** (theme 2b) — ✅ **CAPABILITY LANDED 2026-07-17.** The `heal`
   effect now carries optional `ticks` + `intervalSec` (default `ticks:1` = instant, back-compatible):
   a per-second heal-over-time ("Recovers X% every 1 sec for N sec") sets `ticks:N` so the engine emits
   the first recovery event immediately and schedules the remaining N-1 on a `recoveryEmitters` queue,
   keeping Crown-type "when recovery takes effect" consumers refreshed across the whole window instead of
   one proc per activation (sim.ts `fireRecovery` + the heal-over-time loop). **Opted in per kit prose:**
   anchor-innocent-maid S1 (`ticks:8`, "every 1 sec for 8 sec"), blanc S2 (`ticks:5`) + burst (`ticks:8`).
   Inert across all graded comps (no graded comp pairs a recovery consumer with a HoT emitter — Crown+Helm
   in T4 already refreshes every full-charge shot), so the gate stayed green with snapshots stable.
   Independently verified end-to-end on a Crown + anchor-innocent-maid team: team damage 766.97M →
   790.32M (+3.0%, every unit lifts) when the anchor HoT went 1→8 ticks — the expected COLD correction.
   **Still UNMODELED (heals currently not `heal` blocks): prika (burst 25-tick HoT), trina (S1 5-tick),
   mint (3-tick — no heal block yet); naga/mana heals are instant (not HoTs); anis-star heals dropped.**
   Fill these in the `unmodeled` backfill when each unit is touched.
2. **Honor `excludeSelf` on all typed-ally targets** (theme 11) — ✅ **LANDED 2026-07-17.** The
   "arcana-fortune-mate bug family": `alliesOfClass`/`alliesOfElement`/`alliesTopAtk`/`allies`
   silently ignored `excludeSelf` → self inflation. Engine now honors `excludeSelf` on all four
   kinds (applied to the candidate pool BEFORE any top-N slice); the four affected overrides opted
   in per verified kit prose ("except self"). Result: **maiden-ice-rose** T2 elec-weak comp
   1.55 HOT → 1.03, board MAD 0.253 → 0.098 (the map's "1.13 HOT" was the mean of 0.81/1.03/1.55;
   the 1.55 was pure elemAdvantage self-inflation on the Electric-advantaged Water boss). brid-silent-track
   / miranda / soda-twinkling-bunny: faithful but currently board-neutral (brid/miranda not
   board-measured; soda's self-block already covers her + she isn't top-ATK in N3). Residual maiden
   0.76 on the Wind comp is her SEPARATE documented burst Max-HP under-model, deliberately NOT masked.
3. **`hitRatePct` → core-hit-rate lift** (theme 8) — ✅ **LIVE BY DEFAULT 2026-07-17** (`HRCORE`,
   sim.ts:830 — `ENV.HRCORE=0/off` disables for A/B). The Hit-Rate line is no longer inert: a live
   Hit Rate shrinks the reticle → higher core fraction (⚑ derived slope; jill measured a ×1.45 core
   window). OPEN refinements only: asuka's saturation bracket, quency-escape-queen's cadence + the
   +1.04 overshoot, and a measurement (e.g. `soda-tb-control`) to validate the derived slope.
4. **Own-burst-gated FB trigger** (theme 9) — ✅ **LANDED 2026-07-17.** A block gate
   `ownBurstGate: 'cast' | 'notCast'` (types.ts Block; evaluated in sim.ts `applyBlock`
   against `rotationCasters`) COMPOSES with a `fullBurstEnter` trigger to express "Entering
   Full Burst AFTER this unit uses her own Burst" (`'cast'`) vs "…WITHOUT using own Burst"
   (`'notCast'`) — the plain team `fullBurstEnter` over-fired the rider on FBs a DIFFERENT B3
   completed. Unlike re-keying to `burstCast` (fires PRE-FB, loses the +50% FB major + FB
   auras), the gate keeps the block AT FB-entry. **Opted in: cinderella-crystal-wave** (both
   FB-enter core-strike riders → `'cast'`; kit text is explicit). The kit-status finding's
   "sole-B3 → graded movement ZERO" premise was WRONG — she alternates stage-3 with a co-B3 in
   BOTH graded comps (Liberalio in T5, Rapi:RH in T8), so the gate is board-MOVING and it
   **IMPROVES fit**: T8 iron-weak 1.062 HOT → 1.001 (the over-fire was masking a multi-B3
   over-credit), T5 wind-weak 1.009 → 0.978 (both now within ±3%; board MAD 0.036 → 0.012).
   Regression snapshot updated for the T5 ccw total (understood). The other theme-9 units are
   already correct as-is: arcana-fortune-mate / mana / asuka-wille use `burstCast` for their
   duration self-buffs (the pre-FB shift is acceptable there — no FB-entry instant to preserve),
   mihara-bonding-chain is a benign sole-B3, chisato has no FB-enter own-burst line. The inverse
   COLD case **diesel-winter-sweets** (`'notCast'`, Highlight sustained) is now EXPRESSIBLE but
   stays owner-deferred (document-only, CLAUDE.md web-TODO — her full Highlight state machine +
   no-op-B3-drives-FB path is the larger unmodeled piece).
5. **Load the swap weapon's own datamine spec during burst swaps** (theme 7) — ✅ **CAPABILITY LANDED
   2026-07-17** (`weaponSwap.weapon` + `pullsPerSec`; `effWeapon = swap.weapon ?? char.weapon`, sim.ts:1075).
   **nayuta FIXED** (0.637 → 0.894 — swap re-classed base SMG → SR "Memory Incineration", MAD 0.342→0.106).
   **moran** swap-ROF 24/s was REFUTED by the board then MEASURED at base ~12/s — her residual coldness is a
   THROUGHPUT follow-up needing isolated footage, NOT a per-shot fix (see theme 7). Others (chisato/takina/
   velvet/…) still HOT-unaddressed.
6. **`bossElementGate` block gate** (theme 10) — ✅ **LANDED 2026-07-17.** A block-level gate
   (`bossElementGate: <element>`, evaluated in sim.ts `applyBlock` alongside fbGate/swapGate) that
   COMPOSES element-gating with any real trigger — the schema previously could only express a *permanent*
   element-gated passive (`bossElement` TRIGGER), never "when entering FB / after N hits / on burst cast
   **against a [element] boss**." Inert vs a non-matching (incl. the neutral scope-lock) boss, so it never
   disturbs graded comps. **Opted in per verified prose:** helm-aquamarine burst "when attacking an Electric
   Code target → +164.83% additional" (burstCast + Electric gate; was UNMODELED) and brid-silent-track's two
   Wind-Code team debuffs (S1 fullBurstEnter + Wind → enemy DamageTaken ▲15.12%; S2 hitCount 100 + Wind →
   ▲12.12%; were SKIPPED-CONDITIONAL). Verified: both inert on neutral (identical to pre-change); on the
   matched boss the gate ALONE adds brid +32.2M (Wind team-wide debuff, isolated from ×1.1) / helm-aquamarine
   +4.9M (Electric burst rider). **NOT needed for the element-advantage BUFFS** (anis-sparkling-summer,
   guillotine-winter-slayer, elegg-boom-and-shock, asuka): `elemAdvantageDamagePct` is already auto-gated by
   `advantaged(u)` in the damage math (sim.ts:899/942), so those lines are correctly inert on non-matched
   bosses without any gate — their remaining gaps (asuka's shield-status gate, etc.) are separate themes.
   eve's element-coded lines already use the permanent `bossElement` trigger (fine as-is).
7. **Timed / swap-scoped pierce primitive** (theme 5) — ✅ **CAPABILITY LANDED 2026-07-17** (engine
   `gainPierce` effect + per-unit `pierceUntilFrame` window; the damage formula's pierce gate is now
   `hasPierce || pierceUntilFrame > frame || opts.pierceActive`). A timed "Gain Pierce for N sec" sets
   the window on the block's target(s), so its (and teammates') Pierce Damage ▲ buffs go live only
   during it — no more static-`hasPierce`-or-nothing. **Pierce Damage ▲ is a real Damage-Up-bucket entry
   that DOES apply on the partless boss** (owner-confirmed 2026-07-17 — it applies to any pierce-damage-type
   unit; only the separate pierce CORE+BODY DOUBLE-HIT is multipart-only, `PIERCE_CORE_DOUBLE=false` — do
   not conflate the two). **grave is OPTED IN (enabled):** burst → self `gainPierce` 10s, the faithful
   +92.78 pierce Damage Up (S1's 48.4 excludeSelf'd), which moves her three comps 0.836/0.831/0.800 COLD →
   **1.178/1.171/1.219 HOT** — kept ON PURPOSE (faithful > fit). Because the pierce is genuinely real, the
   overshoot is diagnostic: grave's 0.836 COLD was a **NET of two errors** — the missing pierce (COLD) was
   *masking* a compensating over-model in her burst window (HOT = her documented "AR-carry burst-window
   residual"). Modeling the mechanic isolates that single residual (tracked as open-questions **U19**:
   trim the burst-window over-model with a measurement) instead of leaving pierce off (a fit-fudge) + a
   forgettable TODO. Snapshot regenerated grave-only (teammates verified stable). milk-blooming-bunny
   (0.70, mode confounds) / prika (measurement-held) stay deferred.
8. **Cadence-tuple measurement** (theme 1) — the largest population (~22 units) but a *measurement*
   backlog, not an engine change; owned by the full-sweep video plan.

## Full theme catalog (ranked by unit count)

### 1. Cadence-tuple datamine estimates — ~22 units
Class-default fire rate / `reloadFrames` / charge frames / SR-RL 22-frame bolt-gap shipped
unverified on every non-focus-recorded unit ("⚑ cadence tuple"). Direction unknown per unit but
empirically large: guillotine-winter-slayer ~26% HOT on normal fire; jill 1.67→1.02 was pure
cadence. Sub-flags: SR/SMG autofire-vs-bolt-gap unknown (ade-agent-bunny, mari, red-hood, velvet);
rolling-reload (`reload_start_ammo`) unmodeled (modernia, volume).
Units: ade-agent-bunny, anchor-innocent-maid, anis-sparkling-summer, arcana, asuka, asuka-wille,
bready, elegg-boom-and-shock, guillotine-winter-slayer, helm-aquamarine, laplace, liter,
ludmilla-winter-owner, mana, mari, modernia, quency-escape-queen, raven, sakura-bloom-in-summer,
scarlet, soline-frost-ticket, volume.

### 2. Defensive / heal / shield with no engine vocabulary — ~25 units
No HP pool → lifesteal, shields, overheal buffers, taunt, invuln, Indomitability are inert/dropped.
Mostly neutral for the unit itself (v1 boss deals no damage).
Units: ada, alice, anchor-innocent-maid, asuka, asuka-wille, blanc, crown, delta-ninja-thief, grave,
little-mermaid, maiden-ice-rose, mana, moran, naga, nayuta, neon-vision-eye, prika, red-hood, rouge,
soline-frost-ticket, trina, zwei, mihara-bonding-chain, mint, anis-star.

#### 2b. Per-tick heals collapsed to one event → breaks on-recovery consumers (COLD uptime)
A repeated "hard rule 2" violation: dropping/collapsing a heal breaks the recovery-trigger synergy
chain (Crown's "when recovery takes effect"). **Single-fix candidate #1 — ✅ CAPABILITY LANDED
2026-07-17** (`heal.ticks`/`intervalSec` + `recoveryEmitters` queue; see ranked fix #1 above). Opted
in: anchor-innocent-maid (ticks:8), blanc (ticks:5 / ticks:8). Remaining units carry their HoT heals
as UNMODELED (prika/trina) or no heal block (mint) or instant heals (naga/mana) or dropped (anis-star)
— convert per-unit when touched.
Units: anchor-innocent-maid ✅, blanc ✅, prika, mint, naga, trina, anis-star, mana.

### 3. Stack-ramp buffs baked to max, not time-averaged — ~13 units (HOT) — ⚙️ ENGINE CAPABILITY LANDED 2026-07-17
Per-shot/per-charge stacking frozen at cap from t=0 → over-credits opening seconds.
Units: ade-agent-bunny, arcana-fortune-mate (~+8–10%), chisato, cinderella, guilty, leona,
mast-romantic-maid, mihara-bonding-chain, laplace, soda-twinkling-bunny, red-hood, rouge,
sakura-bloom-in-summer.

**Capability:** the `buff` effect now carries optional `rampSec` (types.ts). When a buff's value is
authored at its MAX-stacks magnitude but the real stacks accrue over the opening seconds, `rampSec`
linearly ramps its contribution `0 → full` over `rampSec` from the buff's FIRST application, then holds
at cap (sim.ts `sum()` chokepoint scales `value*stacks` by `min(1, (frame-startFrame)/rampFrames)`).
The ramp clock is the first-apply frame (frame 0 for a `passive`, the cast frame for a burstCast-keyed
self-buff) and is NOT reset by refreshes. Omit → instant-to-max (back-compatible). **NOW ENACTED on 2
units (2026-07-17) — no longer inert/byte-identical:** **cinderella** (`casterMaxHpPct 19.2, rampSec 36`
for her battle-start Beautiful Max-HP + the `flatDamage 346.8, rampSec 36` Beautiful-mirror split; steady
state t≥36s byte-identical to the old bake, pre-36s bursts now credit partial Beautiful — this is the
source of the current cinderella regression-snapshot drift, understood/documented in her caveats) and
**arcana-fortune-mate** (3× `rampSec 11` on her Making-Memories stack buffs — the 2/4/6-shot phase counter
caps at ~11s ≥ the window, so each ramps 0→full and resets per window). Verified end-to-end earlier:
injecting a temporary `rampSec:8` on red-hood's 10s burst ATK ▲71.42% moved her PA-MiKa total 799M→786M
(0.936→0.921), the expected opening-seconds de-credit.
**NOT auto-enacted:** each unit's `rampSec` is a ⚑ per-unit estimate — enacting moves the board (these are
HOT), so it is measurement/Fable-gated per unit (scientific-method harness). **Do NOT double-correct the
units that already hand-average their ramp in the override note** — cinderella (Beautiful baked `2.71×1.192`
steady-state), soda-twinkling-bunny (Golden-Chip time-average, measured against `soda tb control.mov`), and
arcana-fortune-mate (Making-Memories phases baked to max within her FB window, which resets per window — a
plain continuous ramp is the WRONG shape for her). The clean first candidates are the battle-long monotonic
ramps (chisato/leona/guilty/mast-romantic-maid/red-hood charge-stack/sakura-bloom-in-summer). The faithful
alternative for any unit whose accrual is cleanly one-stack-per-shot stays re-authoring the buff with its
real incremental trigger (`shotFired`/`hitCount`/`chargeCounter` + `maxStacks`) — the engine already ramps
stacks for those; `rampSec` is the time-average approximation for when per-shot authoring is impractical.

### 4. Conditional / team-gated buffs modeled as always-satisfied — ~11 units (HOT) — ⚙️ TEAM-COMP GATE CAPABILITY LANDED 2026-07-17
Gate ("at max stacks", "while shielder present", "same-squad ally", "Wheel of Fortune") not encoded,
defaults to always-on.
Units: arcana, arcana-fortune-mate, asuka, naga (shield-gate fires unconditionally, 1.175 HOT),
guilty, leona, noir, anchor-innocent-maid.
#### 4b. Kit-silent trigger → invented 100%-uptime (HOT)
No "Activates when…" clause → author invented a proxy.
Units: helm-aquamarine, liter, mari, rosanna-chic-ocean (TOP flag; also removed a fabricated
permanent casterAtkPct), snow-white, isabel.

**PREMISE CORRECTION (2026-07-17) — this theme is a RECONCILIATION backlog, not one missing primitive.**
Reading every unit's `kit-status.json` finding + override showed the gates here are MOSTLY ALREADY
EXPRESSIBLE, and several units are already fixed: **asuka** (fires-only-with-a-healer → already the
`recovery` trigger), **snow-white** (already `shotFired`+`swapGate`), **rosanna-chic-ocean** (fabricated
permanent `casterAtkPct` already removed; residual = 1 invented-uptime S2 trigger), **naga**
("while shielder present" → the `{kind:shielded}` trigger + 3 live emitters blanc/crown/delta-ninja-thief
already exist; her over-credit is currently neutralized by the `auto` mode default, theme 17). **guilty's**
"at max stacks" rider is expressible via `resourceGate` once her stacks are modeled as a resource.
The residual work is per-unit override reconciliation that is BOARD-MOVING (HOT) with an open magnitude
question, so it is measurement/Fable-gated — NOT an autonomous inert-landing like themes 3/5/6/7. Routed
to the kit-parse owner-reconciliation backlog.

**The one genuinely-inexpressible gate WAS the team-composition predicate** ("dead without a Burst-III
Electric caster present" — the `arcana` RL/Electric override; NOT arcana-fortune-mate). ✅ **CAPABILITY
LANDED 2026-07-17:** a static block gate `teamHas:{element?/class?/weapon?/burst?}` (types.ts Block;
evaluated at sim setup in the sim.ts block filter alongside `formation`/`mode`). Facets AND together;
the block is active only when SOME OTHER ally matches ALL of them (owner never counts, same rule as
`formation`; burst matches literally so a Λ unit ≠ 'III'). Omit = always active → **inert until an
override opts in** (regression byte-identical, verified by a stash A/B of the two touched files against
the pre-existing working-tree snapshot). Verified end-to-end by injecting a `teamHas`-gated +100% ATK
self-buff on a focus unit: fires with a matching present ally (Water/Electric/B3 → +57%), correctly
inert when absent (Wind → 0%), correctly inert when only self would match (owner excluded → 0%).
**No override opts in yet** — enacting arcana is deferred (MODEL_ONLY, no board data; owner currently
grades her "mono-Electric comp only", and her separate Wheel-of-Fortune status gate is still unmodeled).

### 5. Pierce gating — static `hasPierce` only — ~14 units (usually COLD)
Timed / swap-scoped / HP-gated pierce was inexpressible → dead blocks ("modeled ≠ working"). **✅ TIMED
pierce now expressible (`gainPierce`, 2026-07-17 — see ranked fix #7).** Pierce Damage ▲ is a real
Damage-Up-bucket entry that applies to any pierce-damage-type unit, on the partless boss too (only the
pierce CORE+BODY DOUBLE-HIT is multipart-only — `PIERCE_CORE_DOUBLE=false`; don't conflate). grave is
ENABLED with faithful pierce (0.83→1.18 HOT kept on purpose, faithful>fit); the residual HOT is a separate
burst-window over-model, now cleanly isolated as open-questions U19. Units: alice, d-killer-wife,
grave (ENABLED; residual = burst-window over-model, U19), mari, milk-blooming-bunny (dead block, 0.70 COLD),
prika, red-hood, snow-white, snow-white-heavy-arms, zwei, laplace, maxwell, naga, mana.

### 6. Parts / core branches inert on the partless v1 boss — ~11 units
Mostly correctly inert; the one **live HOT bug** — d-killer-wife's parts branch `coreDamagePct 16.26`
staying LIVE in-sim (core hits exist on a partless boss) → over-crediting every ally's core bucket —
✅ **FIXED 2026-07-17**: removed as SKIPPED-CONDITIONAL (kit "Allies that hit parts…", parts-gated,
unearnable on the partless boss); body branch `casterAtkPct 12.19` kept. d-killer-wife 1.055 HOT → 0.998,
takina 1.047 → 0.988; board within-±3% 5→6 (DECISIONS 2026-07-17).
Units: d-killer-wife (HOT bug — FIXED), diesel-winter-sweets, laplace, raven, rosanna-chic-ocean,
sakura-bloom-in-summer, red-hood, snow-white-heavy-arms, mari, asuka, diesel.

### 7. Weapon-swap burst-window economy — ~12 units (mixed) — ⚙️ ENGINE CAPABILITY LANDED 2026-07-17
The `weaponSwap` effect now carries per-swap `pullsPerSec` (fire cadence) + `weapon` (class) overrides
so a swap can load its OWN datamine spec (fix #5). `effWeapon = swap.weapon ?? char.weapon` drives
range-band + auto-core; a swap `pullsPerSec` governs the non-charge fire cadence. Both inert until an
override opts in.
- **nayuta ✅ FIXED (0.637 → 0.894):** swap shots were range/core-banded as base **SMG**; set
  `weapon:'SR'` (Memory Incineration is an SR mode) → +30% range in midfar/far + HI core, the bands
  the finding flagged. MAD 0.342→0.106 (DECISIONS 2026-07-17).
- **moran ⛔ REFUTED then MEASURED — stays base 12/s; coldness is a THROUGHPUT follow-up (footage-blocked):**
  the datamined swap ROF 1440 = 24 pulls/s was applied but the board REFUTED it (0.712 → 1.325 HOT). Backed
  out, then MEASURED (`moran control.mov`, 60fps): swap fires base ~12/s. The "1440" was an unlabeled
  `skill_value`. Coldness DIAGNOSED as throughput, not per-shot: her measured popup reconciles EXACTLY to
  14.7% × Crown/Helm-buffed final ATK (recon 30,478 = 14.71% × 131,441 × 1.5723, 0.3%) — per-shot faithful,
  buffs modeled. But sim 217M vs real 288M ⇒ ~1.3× more HITS than modeled (~1.5× throughput in the swap
  window) — faster swap fire-rate OR >1 bullet/pull, NOT isolable from the comp footage. ⇒ FOLLOW-UP: needs
  an isolated moran-solo recording or the swap weapon's `shot_count` datamine (DECISIONS 2026-07-17).
Others still optimistic/HOT (unaddressed): chisato, takina (~1.044), velvet (~1.068), red-hood,
snow-white, laplace, maxwell, zwei, volume.

### 8. `hitRatePct` → core-hit-rate lift — ✅ LIVE BY DEFAULT 2026-07-17
Was engine-inert; now a live core-hit-rate lift (`HRCORE`, sim.ts:830 — a live Hit Rate shrinks the
reticle → higher core fraction; `ENV.HRCORE=0/off` disables for A/B). jill measured core 0.20→0.90.
OPEN refinements only (not a capability gap): asuka's saturation bracket, quency-escape-queen's cadence +
the +1.04 overshoot, slope validation via a measurement (e.g. `soda-tb-control`). Related still-open:
tove (crit-rate stale 3.32→10.08) is a separate crit-rate fix, not hitRatePct.
Units affected: anchor-innocent-maid, drake, leona, modernia, noir, quency-escape-queen,
soda-twinkling-bunny, jill, nayuta.

### 9. Own-burst-gated vs team-FB trigger (schema gap) — ~7 units (HOT in multi-B3) — ✅ CAPABILITY LANDED 2026-07-17
"Entering Full Burst after this unit uses her own Burst" was modeled as plain team `fullBurstEnter`.
**RESOLVED** via the `ownBurstGate: 'cast' | 'notCast'` block gate (see ranked fix #4). Opted in:
cinderella-crystal-wave (both FB-enter core-strike riders → `'cast'`; T8 1.062→1.001, T5 1.009→0.978,
NOT the sole-B3-inert the finding assumed — she alternates stage-3 with a co-B3 in both graded comps,
so the gate is board-moving and IMPROVES fit). arcana-fortune-mate / mana / asuka-wille (the reference)
already correctly use `burstCast` for their duration self-buffs (no FB-entry instant to preserve);
mihara-bonding-chain is a benign sole-B3; chisato has no FB-enter own-burst line. The inverse COLD case
diesel-winter-sweets (0.831, `'notCast'` Highlight sustained) is now EXPRESSIBLE but owner-deferred
(document-only; her full Highlight state machine + no-op-B3-drives-FB path is the larger unmodeled piece).

### 10. Boss-element-gated debuffs/buffs inert vs neutral scope-lock boss — ~8 units
`bossElement` couldn't compose with `fullBurstEnter`/`hitCount`/`burstCast`. Big team-wide lever on
matched bosses. **✅ RESOLVED for the element-CODED triggered lines 2026-07-17** (`bossElementGate`
block gate — see ranked fix #6): helm-aquamarine (Electric burst rider) + brid-silent-track (two Wind
team debuffs) opted in. The element-ADVANTAGE buffs (anis-sparkling-summer, guillotine-winter-slayer,
elegg-boom-and-shock, asuka) never needed it — `elemAdvantageDamagePct` is already advantage-gated in
the damage math. eve keeps the permanent `bossElement` trigger.
Units: anis-sparkling-summer, asuka, brid-silent-track ✅, eve, guillotine-winter-slayer,
helm-aquamarine ✅, elegg-boom-and-shock.

### 11. `excludeSelf` not honored on typed-ally targets — ✅ LANDED 2026-07-17
"arcana-fortune-mate bug family". **Single-fix candidate #2 — DONE.** Engine now honors `excludeSelf`
on `allies`/`alliesTopAtk`/`alliesOfElement`/`alliesOfClass` (sim.ts:resolveTargets; the pool is
filtered BEFORE any top-N slice). Overrides opted in against verified `data/characters.json` prose:
maiden-ice-rose (alliesOfElement Electric "except for self" → 1.55 HOT collapsed to 1.03, MAD 0.253→0.098),
brid-silent-track (burst `allies` "except self"), miranda (2× alliesTopAtk "except the skill user"),
soda-twinkling-bunny (alliesTopAtk "except the skill user"; self covered by its own self-block).
arcana-fortune-mate was already fixed for `alliesOfWeapon`. False positives ruled out: blanc/mana carry
"except self" on lowest-HP / incapacitated targets (unmodeled theme-13/18 lines, not these kinds).
Verify: full gate green; regression snapshot updated (2 maiden comps, both understood).

### 12. DoT / periodic damage crit — PER-DoT, evidence-gated (isabel ✅ LANDED 2026-07-17)
Ties to open-question U1. **Resolution: NOT a global flip.** A universal DOT_CRIT default-on was
MEASURED-REFUTED — a board sweep (DOTCRIT off→on) is a wash (±3%: 8→8) and breaks units whose DoTs
are *validated non-crit*: jill's acid tick is video-confirmed 99.7% NON-crit, mihara-bonding-chain's
Ensnaring is validated at 1.03 non-crit, little-mermaid's FB dot/barrage carry no crit evidence. So
DoT crit is now a **per-DoT `crit:true` opt-in** (types.ts dot effect + `Dot.crit`; the tick site
falls back to the still-OFF global DOT_CRIT gate when unset) — enabled ONLY where measured.
- **isabel ✅ LANDED** — her ~14.7s periodic rider crits in-game (MEASURED: 3 crits / 11 resolved
  fires; crit 308,564 = non-crit 205,709 ×1.5 exactly, `docs/probe-data/isabel-sg-band.json`
  riderFinding). `crit:true` on her skill2 dot; rider now rolls at her sheet rate (solo recon warms
  the right direction, ~50.9M→53.1M vs real 55.3M). Zero board blast radius (solo-only unit; per-DoT
  field leaves every other unit byte-identical). DECISIONS 2026-07-17.
- **neon-vision-eye** — the "~7% cold" claim is STALE: she reads +8% HOT on the current board and is
  UNAFFECTED by DOT_CRIT (no critting DoT in her kit). NOT a theme-12 unit; her heat belongs elsewhere.
- **modernia** — her cold is NOT DoT-crit: her S1 flatDamage rider already crits (U1), and the open
  piece is the burst Destroy-Mode `extraHitDamagePct` rider modeled crit-OFF (her override ⚑4 finding),
  not a DoT tick. Route to that finding, not here.
- eve Mk2 sequential-doubling caveat still open (separate).

### 13. Max-HP-scaling grants with no stat key / no lowest-HP targeting — ~6 units ✅ LANDED 2026-07-17
"Max HP ▲ X% of user's Max HP" and "affects lowest-remaining-HP ally" have no primitive. Matters only
on HP-scaling teammates. Units: anis-star, blanc, rouge (double-counted 44.5 vs 30.02, HOT), trina,
maiden-ice-rose, moran.

**LANDED (kit-completeness sweep):** two primitives added — `targetMaxHpPct` StatKey ("Max HP ▲ X%",
target's OWN %, distinct from the existing `casterMaxHpPct` = "% of the skill user's Max HP") and the
`alliesLowestHp` TargetDef (count/excludeSelf; no HP pool in v1 → resolves to the leftmost `count` allies
as a documented deterministic stand-in). Both honor the e3 rule (ally-granted Max HP feeds a consumer's
`atkOfMaxHpPct` ONLY when caster === target, i.e. self). Per-unit: **maiden-ice-rose** self "Max HP ▲6.34%
×10, every 6 full charges" now modeled (targetMaxHpPct on self, hitCount 6, maxStacks 10, 15s) — the ONE
offensively-live grant (self-fed): her N6 Wind comp 0.76→0.85 (board-verified, +11.6% her total; snapshot
updated maiden-N6 only). anis-star (burst 15.02% all-allies, hasB1), trina (S2 44.98% Electric-AR allies +
burst 20.14% all-allies), blanc (burst 31.68% lowest-HP ally) — all ally-facing, **offensively INERT**
(e3), modeled for kit-SSOT completeness (proven 0.000% board delta on all teammates incl. cinderella).
rouge already had casterMaxHpPct grants. moran's Max-HP lines are HP<20%-gated (theme 18, never fire) —
intentionally left as skips. See DECISIONS 2026-07-17.

### 14. Flat-rounds Max-Ammo inexpressible (percent-only schema) — ~5 units — ✅ CAPABILITY LANDED 2026-07-17
A new `maxAmmoFlat` StatKey (types.ts) expresses "Max Ammunition ▲ N round(s)" as a flat round count,
added on top of the `maxAmmoPct` scaling in `maxAmmo()` (`round(base*(1+pct/100)) + flat`). Applied as
a plain `buff` (usually `passive` → self, or an all-allies target for the team grants), so it composes
with triggers/targets like any other stat. **Inert until an override opts in** (no unit sets it →
`stat(u,'maxAmmoFlat')` sums 0 → byte-identical `maxAmmo()`; verified by an isolated A/B of the
`maxAmmo()` edit against the working tree: regression totals identical). Functional check: injecting a
temporary `maxAmmoFlat 200` passive on a low-mag AR lifted pulls 1099→1908 (fewer reloads → more shots,
+65% total), the expected direction. **NOT auto-enacted:** the listed units currently APPROXIMATE the flat
grant as a percent (noir `maxAmmoPct 55.56` self-only for +5 all-allies; trina `maxAmmoPct 33.3` for +20
assuming a 60-round base; grave +3, tove +2, drake), and converting to the faithful flat form is
board-MOVING (noir's +5 becomes team-wide; the others change the exact round count) → measurement/owner-gated
per unit, routed to the kit-parse reconciliation backlog.
Units: grave (+3), noir (+5 all-allies → modeled self-only), tove (+2), drake, trina (+20).

### 15. Ammo-dump / forced-reload "Removes 100% of ammo" inexpressible — 3 units — ✅ CAPABILITY LANDED 2026-07-17
A new `consumeAmmo` effect (types.ts; the inverse of `instantReload`) drains the target's belt by
`fraction` of MAX capacity (default 1 = the whole magazine) and, if it empties, forces an immediate reload
— firing the target's `lastBullet` triggers exactly as if it had fired dry (sim.ts `applyEffect`).
**Inert until an override opts in** (no unit references it → regression byte-identical). Functional check:
injecting a temporary per-shot `consumeAmmo` collapsed pulls 1099→96 (constant forced reloads eat fire time,
−89% total), the expected direction. **NOT auto-enacted:** the three units need per-unit trigger authoring
(grave = Prediction/burst-window END forced reload, the documented comp-COLD cause; asuka-wille + jill on
their own kit triggers) + board verification → deferred to the reconciliation backlog.
Units: asuka-wille, grave (Prediction-end forced reload, comp-cold cause), jill.

### 16. TREASURE-phase prose SSOT gap — 5 units (RESOLVED 2026-07-17)
Sync carried no favorite-item prose → materialize froze untreasured base kit. helm anchor
0.591→1.014. Units: helm, laplace, moran, miranda, drake. Watch on any newly-synced treasure unit.

### 17. User-selected modes vs auto-detection — 8 units (config-driven board misreads)
Team-comp branches via a manual `modes` field (first entry = default) → board misreads that look like
model bugs but are config bugs (mint 0.768 was a config default, not a model error). The 8 `modes`
overrides: bready, cinderella-crystal-wave, delta-ninja-thief, elegg-boom-and-shock, milk-blooming-bunny,
mint, naga, prika. **Triage note: check the selected mode against the recorded comp before counting one
of these as a modeling defect.**

**2026-07-17 — `auto` no-op default added to 4 units** (bready, delta-ninja-thief, elegg-boom-and-shock,
naga): a new first-entry `auto` mode that no block is tagged to, so it applies NO mode-custom kit config
(only untagged blocks fire). This makes the default a neutral baseline instead of silently applying an
unverified branch — e.g. naga's default was `with shielder` (fires `coreDamagePct 85.17` + burst
`casterAtkPct`); `auto` drops both (72.1M → 63.3M unpinned, neutralizing the 1.175 HOT over-credit).
verify.sh stayed green (board/regression comps pin their mode explicitly). Still branch-default (owner
review pending): cinderella-crystal-wave (`MG`*/`Snipe`, pierce only in Snipe), the mint↔prika duet pair
(`solo`*/`duet` — mutually referencing, flip both together), milk-blooming-bunny (`auto (no Embarrassment)`*
already a no-op-style default). Full action item + per-unit mode inventory: CLAUDE.md NEXT INCREMENT
backlog (new item 6).

### 18. Kill-gated / revive / boss-death effects that never fire — ~4 units
Immortal solo boss. Units: volume (kill-gated ATK ▲12.6% can never trigger), mana, mihara-bonding-chain,
moran.

### 19. SG pull-vs-pellet `hitCount` 10× lever + per-unit SG landing — SG cluster
"After N attacks" ambiguous between pulls and pellets (10× proc-cadence swing); per-unit pellet
landing not captured by the class table. Units: drake (explicit 10× lever), soline-frost-ticket, noir,
arcana-fortune-mate, isabel (per-unit SG landing residuals). See open-questions U17.
