# Driver notes — belorta-pumpkin-witch (Belorta: Pumpkin Witch) — kit-autonomy gauntlet 2026-10-09

Driver: Claude Opus 5.5. Tier 2 (positional "ally to the right" scope, Ghost Costume self-status gate,
burstCast-vs-fullBurstEnter identity). Claude-only routing (owner 2026-10-02): S2b claude-fable-5 +
claude-fable-5-1, S5/S6 claude-opus-5, S7 claude-fable-5-1 (binding) + claude-fable-5 — same-family
evidence only.

## Engine change (for the judge to grade — commit cb191d32)

New target kind `{ kind: 'adjacentAlly'; side: 'left' | 'right' }` (src/skills/types.ts), resolved in
`resolveTargets` (src/engine/sim.ts) as:

```ts
case 'adjacentAlly': {
  // the single neighbouring slot on that side; none at the team's edge
  const want = ownerIdx + (t.side === 'right' ? 1 : -1);
  return units.filter((u) => u.idx === want);
}
```

`units[]` is slot order, leftmost first (`idx` = position in the team array). Validator rejects a
missing/unknown `side`; web targetLabel names it. Pinned by scripts/tests/engine/adjacent-ally.test.ts
(right = slot+1 only, left = slot-1 only, edge → nobody, contrast with selfAndAdjacent, validator).
Board-inert: `npx tsx scripts/regression.ts` passed unchanged before the override landed. Code review
on claude-fable-5-1: CLEAN (3 notes: STATE.md row to add at Land; the ranks/buffer.ts enabler predicate
ignores positional targets — inert, she carries no burstCdr; redaction path confirmed).

No existing primitive could express "the ally to the right": `selfAndAdjacent` always includes self
and both sides; no other target is positional.

## S2c reconcile

Both S2b reviewers' spec tables and load-bearing sets (7 lines) match the driver's: S1 Ghost Costume
selfStatus (gate) + self Max HP (inert) + right-ally casterAtkPct on fullBurstEnter; S2 Ghostly Prank
enemy damageTakenPct on fullCharge gated by the Ghost Costume status; S2 right-ally sustainedDamagePct
on every fullCharge (UNGATED); burst right-ally casterAtkPct + sustainedDamagePct on burstCast. Both
flag the direct-hit removal as an out-of-domain upper bound (⚑1) and the rightmost-slot edge.
claude-fable-5-1 flagged the `fbGate:'inFb'` proxy as byte-identical on a non-extending fixture — the
driver encoded the faithful selfStatus shape and pins it structurally (verify.txt coverage note).

## S6 convergence

The S6 blind override (claude-opus-5) is BLOCK-IDENTICAL to the driver's: same five blocks, triggers,
targets, gates, stats, values, durations and slot order. Its `unmodeled` holds the Ghost Costume
immunity + direct-hit removal text verbatim (the driver splits the same text into two entries). S6's
⚑ list adds a cadence-tuple flag — retired by owner ruling 2026-07-25, so not carried.

## S5 convergence run (blind test UNMODIFIED except one wiring line)

- Unmodified: 8 RED / 6 green / 4 skipped, all 8 from one cause: the blind file assigns `opts.onEvent`
  on CompOptions; `runComp` reads `onEvent` only from `opts.cfg`, so the event log is EMPTY (harness
  wiring defect — the same one-line fix the sin-swift-bunny run needed).
- Adapted (`scripts/kit-autonomy/blind/belorta-pumpkin-witch.adapted.test.ts` — `onEvent` moved into
  `opts.cfg`, no assertion touched): **11 green / 3 RED / 4 skipped.**
- The 3 RED are ALL in the burst group — a FIXTURE finding the blind writer predicted in its own
  header: `controlComp(slug, true)` seats crown (Burst II, cd 20s) in slot 1 AHEAD of her (Burst II,
  cd 40s, slot 2), so crown wins every stage-2 cast and she casts ZERO bursts there (probe: casts=0,
  burst grants=0). Its NON-VACUITY test fails by design; the other two compare an empty set. The blind
  file's own FIXTURE PROBE (a `burstFirst` opener lets her take stage 2 once) is GREEN and non-vacuous:
  casts=1, grants=2, both on frame 292 to `helm` (the ally to her right there), stats casterAtkPct +
  sustainedDamagePct.
- The driver's spec test seats her ahead of crown (liter / bpw / scarlet / helm / crown) so she casts
  ≥2 bursts and some Full Bursts happen without her cast; P6 pins the burst grants there.

## Out of scope

- Board A/B: she is a new unit on no graded comp — no board row to move (S8 non-gating).
