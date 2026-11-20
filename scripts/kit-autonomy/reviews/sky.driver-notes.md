# Driver notes — sky (Sky) — kit-autonomy gauntlet 2026-11-20

Driver: Claude Opus 5.5. Tier 2 (a hold-charge trigger the sim cannot perform, a status-REMOVAL
trigger, a self-status gate, burstCast-vs-fullBurstEnter identity across the same kit). Claude-only
routing (owner 2026-10-02): S2b claude-fable-5 + claude-fable-5-1, S5/S6 claude-opus-5, S7
claude-fable-5-1 (binding) + claude-fable-5 — same-family evidence only.

## Engine change (for the judge to grade — commits 9da670e4 + 875591dc)

New trigger kind `{ kind: 'selfStatusEnd'; name: string }` (src/skills/types.ts). Dispatch in the
frame loop of src/engine/sim.ts, at the top of the frame right after the delayed-block resolution:

```ts
for (const sb of selfStatusEndBlocks) {
  if (units[sb.unitIdx].selfStatuses.get(sb.name) === frame) {
    applyBlock(sb.unitIdx, sb.block, sb.bi, frame);
  }
}
```

`selfStatuses` is the existing per-(unit, name) window map written by the `selfStatus` effect
(max-extended on re-application) and read by the `requiresSelfStatus` gate, which treats the window as
closed when `expiry <= frame` — so the lapse IS the expiry frame. A re-cast inside the window extends
it and the trigger moves with it; a cast after a lapse opens a new window that lapses (and fires)
again. `selfStatusEndBlocks` is built only from blocks that author the trigger, so the loop is empty
for every other unit. Validator: TRIGGERS set, non-empty name, and the same-unit producer census errors
on a selfStatusEnd name with no selfStatus producer. Web triggerLabel names it. Pinned by
scripts/tests/engine/self-status-end.test.ts (6 cases; the two DISCRIMINATING ones verified RED with
the dispatch disabled). Board-inert: `npx tsx scripts/regression.ts` output BYTE-IDENTICAL with and
without the sim.ts change. Code review on claude-fable-5-1: CLEAN (notes applied: same-frame order
comment, two-lapse pin; follow-ups: STATE.md row, asuka-wille's open handoff names this primitive).

Why a new primitive: no existing trigger reads a status LAPSE. The nearest stand-in, `burstCast` +
block `delaySec: 35`, fires 35s after EVERY cast — wrong whenever burst-cooldown reduction brings her
next cast inside 35s (21 roster overrides carry `burstCdr`, dorothy and liter among the common B1
partners). In that case High Tension is refreshed, never removed, so Low Tension must NOT fire; the
spec's fixture B (dorothy) pins exactly this (2 Low Tensions, not 4).

## S2c reconcile

Both S2b reviewers' spec tables match the driver on six lines: S2 FB-entry casterAtkPct 20 all allies
10s on fullBurstEnter (not burstCast); Low Tension = selfStatusEnd 'High Tension' → all allies
casterAtkPct -10 20s; Low Energy = self stun 20s on Low Tension entry; burst High Tension all allies
pierceDamagePct 15 35s maxStacks 3 on burstCast + a 35s self High Tension window; burst self atkPct
50 35s; Defiant Spirit UNMODELED (debuff immunity, defensive). Both name the stun's "bursting
unaffected" engine convention and the possibility that a re-cast ends Low Tension early as
measurement-gated (both now ⚑ caveats). claude-fable-5's claim that "stacks can never accumulate"
(cd 40 > 35) is wrong with burst-cooldown reduction — claude-fable-5-1 says so, and K6 pins stacking.

**The one divergence — the hold-gated self Pierce line (S1 ■2).** The driver's first encoding defaulted
to the literal never-hold reading (the sim releases at full charge; the guilty-mighty-bunny /
sin-swift-bunny DECISIONS precedent leaves a hold-toggle unfired by default) with Hold opt-in. Both S2b
reviewers, the S6 blind override and the S5 blind tests ALL encode the line as a `fullCharge`-keyed
self gainPierce 40s + Pierce Damage ▲ 60% 40s — every full charge counted as a hold, so the window is
effectively always up (the rapunzel-pure-grace precedent: a hold-gated line runs at real-play uptime).
Resolved toward that convergent reading: mode Hold (default) carries exactly that block; mode Release
keeps the literal never-hold reading selectable. The mode default is a play-style question the kit
does not answer — the #1 owner spot-check.

## Convergence run (S5 blind tests vs the shipped override)

Unmodified: 3 RED, all from a harness wiring defect (it passes `onEvent` at the top level of the
runComp options instead of `cfg.onEvent`, so it records zero events and its FB count is 0). Adapted
copy (that one line only — scripts/kit-autonomy/blind/sky.adapted.test.ts): 17 green / 1 RED / 3
skipped. The 1 RED, "no ATK-down is ever applied in the control fixture", rests on the blind file's
fixture premise that sky never casts in `controlComp` (liter is also Burst I). That premise is false:
she casts at 18.3s, 74.4s, 107.0s, 141.0s and 175.5s (whenever liter's 20s cooldown is down at the
chain), and the four ATK-down applications it sees at 53.3s are exactly 18.3 + 35 — the kit-correct
Low Tension after the first window lapses (every later re-cast lands inside 35s, so no further lapse).
Its own structural assertions on the same line (caster-scaled, 20s, team-wide, keyed to status
removal) are green.

## Fire-rate / modeled≠working

Fixture A (sole Burst I): casts every 40s; High Tension buffApply on each cast (5 holders, 35s);
Low Tension + stun at cast + 35s each cycle (4 in 180s); she fires nothing in each 20s stun window.
Fixture B (dorothy): 5 casts, two inside 35s of the previous (stacks 2), Low Tension only at the 2
real lapses. FB-entry +20% on every Full Burst start (11 in fixture B, vs 5 of her casts).
