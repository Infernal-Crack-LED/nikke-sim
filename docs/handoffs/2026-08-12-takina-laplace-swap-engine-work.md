# 2026-08-12 — `takina` + `laplace`: the two phase-3 rulings that need ENGINE work

> **Status: SPEC'D, NOT BUILT.** Both answers are OWNER-RULED and settled — nothing here is an open
> modeling question, and neither needs footage. What is missing is engine EXPRESSIVENESS. Both
> units carry the ruling in their spec file as a documented `it.skip`, so the truth is already in
> the tree; un-skip each together with its fix.
>
> Everything else from the phase-3 question round landed on branch `audit/phase-3-owner-rulings`
> (`maxwell` (SR/Iron, not `maxwell-ordinary-mechanic`), `milk-blooming-bunny`, plus prose-only
> confirmations for `laplace` Q7/Q8 and `prika` Q10). `velvet` is a separate open question — owner
> said "I'll need more info", see §4.

---

## 1. `takina` — the burst swap is a CUSTOM WEAPON (owner spec, 2026-08-12)

**The ruling, verbatim in substance:** the swapped weapon has the normal damage listed in her kit,
**no ammo and no reload**, and a **1.2 shots/sec** fire rate — 12 shots across the 10s window. When
the swap ends she returns to the sniper **with its magazine restored to full**. The consequence the
owner called out: she then **never needs to reload**, because she cannot land 6 full-charge sniper
shots between bursts in most comps.

**What ships today:** `{ damagePct: 200.64, durationSec: 10, trueNormals: true }` — and the engine
gives her **7 shots per window** (3 shots, a ~3.5s reload, then 4), because the swap inherits her
SR charge cycle and her SR magazine. Board: **0.780 COLD**, her own file's largest named lever.

### The three blockers share ONE root cause

`trueNormals` is overloaded. It is authored as a DAMAGE FLAVOR ("normal attacks deal true damage"),
but the engine also reads it as the marker for "this is a same-weapon FLAVOR swap, not a different
gun" and gates the swap's whole ammo economy on it:

| #   | Needed                          | Blocker (verified in `src/engine/sim.ts`)                                                                                                                                                                                                                                                                       |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | swap does not charge            | `chargeFrames = u.swap?.chargeFrames ?? u.char.chargeFrames` — an omitted `chargeTimeSec` inherits the BASE unit's charge, so the charge branch wins and the swap's `pullsPerSec` is never read. Authoring `chargeTimeSec: 0` does not help: it is read with a FALSY check (`e.chargeTimeSec ? … : undefined`). |
| 2   | no ammo / no reload             | swap ENTRY refill is `if (!e.trueNormals) owner.ammo = maxAmmo(...)`, so she keeps her partially-spent SR magazine and reloads mid-window.                                                                                                                                                                      |
| 3   | sniper restored to full on exit | swap EXIT refill is gated the same way — `const wasFlavorSwap = u.swap.trueNormals; … if (!wasFlavorSwap) u.ammo = maxAmmo(u, frame)`.                                                                                                                                                                          |

The flavor-only rule is itself CORRECT and must not be deleted — it comes from the `chisato`
kit-audit (#2): a same-weapon flavor swap grants no free reload at either end. The defect is using
`trueNormals` to detect that case.

### Proposed shape (not built — the next session decides)

1. **Cheap and byte-neutral first:** relax the `chargeTimeSec` falsy check to a null check so
   `chargeTimeSec: 0` means "does not charge". **No override sets 0 today** (censused across all 25
   `weaponSwap` carriers), so this moves nothing on its own.
2. **Separate flavor from economy.** Either derive "same-weapon flavor swap" from whether the swap
   declares its own economy (`maxAmmo` / `pullsPerSec` / `weapon` / a `damagePct` differing from the
   unit's own normal multiplier), or add an explicit marker and leave `trueNormals` a pure flavor
   flag. ⚑ **Blast radius:** the other two swaps declaring BOTH `trueNormals` and their own
   magazine are `laplace` (RL/Iron, not `laplace-ultimate-hero`; `maxAmmo` 999) and
   `eunhwa-tactical-upgrade` (`maxAmmo` 1). Any rule keyed on "declares a magazine" moves them, so
   A/B both — `laplace`'s 999 is itself a no-reload hack that a real "unlimited ammo" flag would
   replace.
3. **Her final spec** once expressible: `pullsPerSec: 1.2`, no charge, unlimited ammo for the
   window, base magazine refilled on exit. Expect ~12 shots/window vs today's 7.

**The spec is already written:** `scripts/tests/units/takina.test.ts`, the skipped
`fires 12 swap shots per window with NO reload gap`. It asserts the count AND that no inter-shot gap
exceeds 1.5s (a reload shows up as a multi-second gap). Un-skip it as the acceptance test.

---

## 2. `laplace` — Hero Vision's "at max stacks" gate

**Two owner rulings, and the second RETIRED most of the work this section originally proposed.**

- (Q6, corrected by the owner) Hero Vision stacks build from **Full Charge attacks**, not from
  full-burst shots. Her burst weapon does not charge, so she gains **zero** stacks during the 10s
  window and enters it with whatever she built.
- (2026-08-12) **Stacks REFRESH as a whole set on each new stack** unless a kit expressly states
  they expire individually. This is the game-wide rule already recorded as
  [`docs/modeling-priors.md`](../modeling-priors.md) prior 12 (owner ruling 2026-08-11).

**⇒ The feared engine-wide stack rework is NOT needed. The engine already conforms:** `applyBuff`
resets `expiresFrame` on every re-application and `maxStacks` caps the count — refresh-the-whole-set,
exactly the game rule. Verified in the tree; do not re-open it.

**So the over-credit is much smaller than first written.** Her 15s stack clock is refreshed by her
last pre-burst full-charge shot and outlasts the 10s window, so once the gate is open it holds for
the whole window. The only real error is a burst cast **before** she has landed 5 full-charge shots
— at 1.37s/shot (60f charge + 22f bolt recovery) that is realistically **the fight's first burst
only**. (An earlier estimate in this thread claimed the gate lapses ~2s into every window under
per-stack expiry. That is REFUTED by the refresh rule; her override prose is corrected.)

### What is still missing

The kit gates BOTH true-damage clauses on `"when Hero Vision is at max stacks"` — the beam's true
flavour and the 11.9% rider. That is a **binary gate on the COUNT of a stacked buff**, and no such
gate exists: the engine's gates are `fbGate` / `swapGate` / `requiresCore` / `requiresShielded` /
`bossElementGate` / `ownBurstGate` / `resourceGate` / `teamHas` / `everyN`, of which only
`resourceGate` counts anything — and a `resource` never expires, so it cannot model a lapsing stack.
Hero Vision itself is entirely unmodeled today (its Explosion Radius ▲3.57% is inert vs a partless
boss), so nothing tracks the count at all.

**Full build:** model Hero Vision as a stacking self buff (maxStacks 5, 15s, on base full-charge
shots — i.e. `swapGate: 'unswapped'`), add a stack-count gate primitive, and put the beam's
`trueNormals` + the 11.9% rider behind it. **Worth roughly one burst window of true-damage
conversion per fight**, so weigh it against building a primitive for a single carrier (F11
discipline says log the carrier against the gap, don't build for one). She has **no recorded fight**
either — she is on the B3 rank audit's recording-ask list.

---

## 3. Why these were not landed in the phase-3 batch

Batch-and-stop: a cross-cutting engine change surfaced mid-batch is a STOP-and-propose, not an
enactment. `takina`'s fix moves two other units through a shared rule; `laplace`'s needs a new gate
primitive. Both are owner-answered, so the `/scientific-method` pipeline does not apply — they are
encode-and-review work, gated only on the engine change (CLAUDE.md: known answer ⇒ encode +
`/code-review`).

## 4. `velvet` — OPEN, owner wants more info

Not an engine gap; a modeling contradiction. Her S2 team buff activates "when attacking with Full
Charge during Full Burst", and the owner ruled her burst swap does **not** full-charge. Encoding
that (`swapGate: 'unswapped'` beside the shipped `fbGate: 'inFb'`) takes the line from 135
applications to **zero** in her control fixture: she casts B2 every rotation, her 10s swap opens
~1s BEFORE Full Burst and covers essentially all of it, and the ~1s unswapped tail is shorter than
one charge cycle. Her signature support line becomes dead code in every comp she is built for.

The question for the owner is which premise is wrong — the swap/FB alignment, or the assumption that
she must be the one bursting (a teammate-opened Full Burst she is not swapped for would feed it
fine). Board-inert on the graded slice either way: `T5 wind-weak` reads byte-identical with and
without the gate, because she never casts there at all — which is also why the board cannot settle
it. Parked as a skipped assertion in `scripts/tests/units/velvet.test.ts`.
