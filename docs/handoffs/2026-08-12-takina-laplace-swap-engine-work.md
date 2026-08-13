# 2026-08-12 — `takina` + `laplace`: the two phase-3 rulings that needed ENGINE work

> **Status: §1 and §2 LANDED** (branch `engine/swap-economy`; the WHY is in
> [DECISIONS.md](../DECISIONS.md), the landed state in [STATE.md](../STATE.md)). **§4 `velvet` is
> still OPEN and is an OWNER question, not session work** — it is the only thing left in this doc.
>
> Both engine answers were OWNER-RULED and settled, so neither went through `/scientific-method`;
> they were encode-and-`/code-review` work per the 2026-08-11 owner ruling.

---

## 1. `takina` — the burst swap is a CUSTOM WEAPON ✅ LANDED

**The ruling:** the swapped weapon has the normal damage listed in her kit (200.64%), **no ammo and
no reload**, and a **1.2 shots/sec** fire rate — 12 shots across the 10s window. When the swap ends
she returns to the sniper **with its magazine restored to full**, and the consequence the owner
called out is that she then never needs to reload, because she cannot land 6 full-charge sniper
shots between bursts in most comps.

**What it took.** The three blockers shared one root cause: `trueNormals` was doing double duty as
a damage FLAVOR and as the "same-weapon swap, no magazine refill" marker (the `chisato` kit-audit
#2 rule, which is itself correct). Landed:

- **`weaponSwap.sameWeapon`** — "the gun is not replaced" — is now the sole marker gating the
  refill at swap entry AND exit. `trueNormals` is a pure damage flavor again.
- **`chargeTimeSec` is null-checked**, so an authored `0` means "does not charge" instead of
  collapsing to `undefined` and inheriting the base unit's charge frames.
- Her swap declares `chargeTimeSec: 0` / `pullsPerSec: 1.2` / `maxAmmo: 999` and no `sameWeapon`.
- The four genuine flavor swaps declare `sameWeapon: true`: `chisato`, `clay`, `jill`, `frima`.
  The tree independently confirms that partition — each of those four sets `damagePct` exactly
  equal to its own `normalAttackMultiplier`; none of the three real swaps does.
- `scripts/tests/units/takina.test.ts`: the parked acceptance test is un-skipped and its documented
  coverage gap closed (the restored magazine is read off the ammo counter, not inferred).

**⚠ READ THIS BEFORE PLANNING OFF HER BOARD NUMBER — the fix made her COLDER.** This doc originally
predicted the opposite. Her 7 estimated shots inherited the SR charge cycle and therefore the ×2.5
`chargeMultiplier` (~3511% ATK per window) where the ruling gives 12 × 200.64 = ~2408%. Measured:
her total drops ~30% and her single graded reading moves **0.786 → 0.579 COLD**. So the swap
economy was never the explanation for her coldness — see the open item in
[QUEUE.md](QUEUE.md).

---

## 2. `laplace` (RL/Iron, not `laplace-ultimate-hero`) — Hero Vision's "at max stacks" gate ✅ LANDED

**Landed with NO new engine primitive.** This doc proposed building a stack-count block gate and,
per F11, weighed that against logging the carrier. Neither was needed: the gate is expressible with
today's primitives, exactly as `engine-modeling-gaps.md` theme 4 already says for `guilty`'s
identical "at max stacks" rider.

- A `heroVision` pool (initial 0, max 5), **+1 per BASE full-charge pull**
  (`shotFired` + `swapGate: 'unswapped'` — her beam does not charge, so it grants none), read by
  `resourceGate`. The `soda-twinkling-bunny` precedent.
- The beam splits into two mutually-exclusive `burstCast` branches — `resourceGate min: 5` carrying
  `trueNormals`, and `max: 4` identical but plain — so a below-max cast still fires the beam as
  normal damage, which is what the kit says. The 11.9% true rider gains `resourceGate min: 5`
  beside its `swapGate`.
- **The approximation, stated:** a resource never expires, so the pool is monotone. That matches the
  whole-set stack refresh (owner ruling 2026-08-11 = `modeling-priors.md` prior 12) at scope lock,
  where she fires continuously and the 15s clock never lapses; it diverges only across a >15s firing
  pause, which the continuous fight does not contain.
- Worth **−1.00%** on her total in the 720-kit-audit control comp, teammates byte-identical (both
  gated clauses are self-scoped). She is in no graded comp, so the board is unchanged.

The feared engine-wide stack rework was never needed either: `applyBuff` already resets
`expiresFrame` on every re-application and `maxStacks` caps the count — refresh-the-whole-set,
exactly the game rule. Do not re-open it.

---

## 3. Why these were not landed in the phase-3 batch

Batch-and-stop: a cross-cutting engine change surfaced mid-batch is a STOP-and-propose, not an
enactment. That proposal is what this doc was, and it has now been enacted as its own branch.

---

## 4. `velvet` — OPEN, and the only thing left in this doc

Not an engine gap; a modeling contradiction, and the owner has said they need more info.

Her S2 team buff activates "when attacking with Full Charge during Full Burst", and the owner ruled
her burst swap does **not** full-charge. Encoding that (`swapGate: 'unswapped'` beside the shipped
`fbGate: 'inFb'`) takes the line from 135 applications to **zero** in her control fixture: she casts
B2 every rotation, her 10s swap opens ~1s BEFORE Full Burst and covers essentially all of it, and
the ~1s unswapped tail is shorter than one charge cycle. Her signature support line becomes dead
code in every comp she is built for.

**The question for the owner** is which premise is wrong — the swap/FB alignment, or the assumption
that she must be the one bursting (a teammate-opened Full Burst she is not swapped for would feed it
fine). Board-inert on the graded slice either way: `T5 wind-weak` reads byte-identical with and
without the gate, because she never casts there at all — which is also why the board cannot settle
it. Parked as a skipped assertion in `scripts/tests/units/velvet.test.ts`.

**Next session: do not enact this without an owner answer.** There is no measurement that resolves
it — both readings are internally consistent — so the productive move is to put the question to the
owner as an either/or, not to run a test.
