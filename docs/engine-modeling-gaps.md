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

## Highest-leverage engine fixes (ranked by blast radius)

These are systematic limitations, not per-unit fudge. Each would correct many units at once.

1. **Per-tick recovery-event emitter** (theme 2b) — heals collapsed to one event break Crown-type
   "on-recovery" consumer uptime. ~8 units: anchor-innocent-maid, blanc, prika, mint, naga, trina,
   anis-star, mana. (COLD for consumer uptime.)
2. **Honor `excludeSelf` on all typed-ally targets** (theme 11) — the "arcana-fortune-mate bug
   family": `alliesOfClass`/`alliesOfElement`/`alliesTopAtk` silently ignore `excludeSelf` → self
   inflation. maiden-ice-rose (1.13 HOT), brid-silent-track, soda-twinkling-bunny, miranda.
3. **Implement `hitRatePct` → core-hit-rate lift** (theme 8) — the stat exists but is engine-inert;
   ~10 units carry an inert Hit-Rate line that is a proven COLD lever (jill measured a ×1.45 core
   window).
4. **`{kind:fullBurstEnter, ownBurstOnly:true}` + `chainGate: selfCast/selfNotCast`** (theme 9) —
   own-burst-gated triggers over-fire on non-burst rotations. cinderella-crystal-wave,
   arcana-fortune-mate, mihara-bonding-chain; and the inverse COLD case diesel-winter-sweets
   (0.831 → ~0.92, stuck in the wrong Intro/Highlight branch).
5. **Load the swap weapon's own datamine spec during burst swaps** (theme 7) — two single-cause COLD
   engine bugs: moran (0.713 — swap fires at 24 pulls/s but sim uses base 12/s) and nayuta (0.637 —
   swap shots treated as base SMG, not the swap's SR class).
6. **`bossElementGate` trigger primitive** (theme 10) — unlocks element-advantage / element-coded
   lines for 6+ units on element-matched bosses (inert but correct today): brid-silent-track, eve,
   anis-sparkling-summer, guillotine-winter-slayer, helm-aquamarine, elegg-boom-and-shock.
7. **Timed / swap-scoped pierce primitive** (theme 5) — replace static `hasPierce` so timed "Gain
   Pierce for Ns" stops producing dead blocks (milk-blooming-bunny 0.70, grave, prika).
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
chain (Crown's "when recovery takes effect"). **Single-fix candidate #1.**
Units: anchor-innocent-maid, blanc, prika, mint, naga, trina, anis-star, mana.

### 3. Stack-ramp buffs baked to max, not time-averaged — ~13 units (HOT)
Per-shot/per-charge stacking frozen at cap from t=0 → over-credits opening seconds.
Units: ade-agent-bunny, arcana-fortune-mate (~+8–10%), chisato, cinderella, guilty, leona,
mast-romantic-maid, mihara-bonding-chain, laplace, soda-twinkling-bunny, red-hood, rouge,
sakura-bloom-in-summer.

### 4. Conditional / team-gated buffs modeled as always-satisfied — ~11 units (HOT)
Gate ("at max stacks", "while shielder present", "same-squad ally", "Wheel of Fortune") not encoded,
defaults to always-on.
Units: arcana, arcana-fortune-mate, asuka, naga (shield-gate fires unconditionally, 1.175 HOT),
guilty, leona, noir, anchor-innocent-maid.
#### 4b. Kit-silent trigger → invented 100%-uptime (HOT)
No "Activates when…" clause → author invented a proxy.
Units: helm-aquamarine, liter, mari, rosanna-chic-ocean (TOP flag; also removed a fabricated
permanent casterAtkPct), snow-white, isabel.

### 5. Pierce gating — static `hasPierce` only — ~14 units (usually COLD)
Timed / swap-scoped / HP-gated pierce inexpressible → dead blocks ("modeled ≠ working").
Units: alice, d-killer-wife, grave, mari, milk-blooming-bunny (dead block, 0.70 COLD), prika,
red-hood, snow-white, snow-white-heavy-arms, zwei, laplace, maxwell, naga, mana. Global
`PIERCE_CORE_DOUBLE=false`.

### 6. Parts / core branches inert on the partless v1 boss — ~11 units
Mostly correctly inert; one **live HOT bug**: d-killer-wife's parts branch `coreDamagePct 16.26`
stays LIVE in-sim (core hits exist on a partless boss) → over-credits every ally's core bucket.
Units: d-killer-wife (HOT bug), diesel-winter-sweets, laplace, raven, rosanna-chic-ocean,
sakura-bloom-in-summer, red-hood, snow-white-heavy-arms, mari, asuka, diesel.

### 7. Weapon-swap burst-window economy — ~12 units (mixed; two major COLD bugs)
Swap weapon's *different* datamine spec never loaded. moran (0.713 COLD, 24 pulls/s vs base 12) and
nayuta (0.637 COLD, swap shots rated as base SMG not swap SR-class) are single-cause. Others
optimistic/HOT: chisato, takina (~1.044), velvet (~1.068), red-hood, snow-white, laplace, maxwell,
zwei, volume.

### 8. `hitRatePct` modeled but engine-inert — ~10 units (COLD)
Real effect is a core-hit-rate lift (jill measured core 0.20→0.90). **Single-fix candidate #3.**
Units: anchor-innocent-maid, drake, leona, modernia, noir, quency-escape-queen, soda-twinkling-bunny,
jill, nayuta. Related: tove (crit-rate stale 3.32→10.08).

### 9. Own-burst-gated vs team-FB trigger (schema gap) — ~7 units (HOT in multi-B3)
"Entering Full Burst after this unit uses her own Burst" modeled as plain team `fullBurstEnter`.
Units: cinderella-crystal-wave (near-1.0 only because she's the burster in graded comps),
diesel-winter-sweets (inverse COLD 0.831), arcana-fortune-mate, mihara-bonding-chain (benign sole-B3),
mana, chisato. asuka-wille is the correctly-encoded reference (burstCast).

### 10. Boss-element-gated debuffs/buffs inert vs neutral scope-lock boss — ~8 units
`bossElement` can't compose with `fullBurstEnter`/`hitCount`. Big team-wide lever on matched bosses.
Units: anis-sparkling-summer, asuka, brid-silent-track, eve, guillotine-winter-slayer,
helm-aquamarine, elegg-boom-and-shock.

### 11. `excludeSelf` not honored on typed-ally targets — ~5 units (HOT)
"arcana-fortune-mate bug family". **Single-fix candidate #2.**
Units: maiden-ice-rose (1.13 HOT), brid-silent-track, soda-twinkling-bunny (alliesTopAtk incl. owner),
miranda, arcana-fortune-mate (original, fixed for `alliesOfWeapon`).

### 12. DoT / periodic / function damage does not crit — engine-global (COLD ~4–7%)
Ties to open-question U1. Units: isabel (~4% cold), neon-vision-eye (~7% cold), modernia. Also eve
Mk2 sequential-doubling caveat.

### 13. Max-HP-scaling grants with no stat key / no lowest-HP targeting — ~6 units
"Max HP ▲ X% of user's Max HP" and "affects lowest-remaining-HP ally" have no primitive. Matters only
on HP-scaling teammates. Units: anis-star, blanc, rouge (double-counted 44.5 vs 30.02, HOT), trina,
maiden-ice-rose, moran.

### 14. Flat-rounds Max-Ammo inexpressible (percent-only schema) — ~5 units
Units: grave (+3), noir (+5 all-allies → modeled self-only), tove (+2), drake, trina (+20).

### 15. Ammo-dump / forced-reload "Removes 100% of ammo" inexpressible — 3 units
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
