# Driver notes — rapunzel-sanctuary (Rapunzel: Sanctuary) — kit-autonomy gauntlet 2026-10-29

Driver: Claude Opus 5.5. NOT the base `rapunzel` (RL/Iron) nor `rapunzel-pure-grace` (SR/Iron).
Tier 2 (burstCast-vs-fullBurstEnter identity: two Full-Burst-entry grants vs one burst-cast grant;
a status-scoped target "self and all allies in the Into the Fray state"; a receiving-side stat
immunity). Claude-only routing (owner 2026-10-02): S2b claude-fable-5 + claude-fable-5-1, S5/S6
claude-opus-5, S7 claude-fable-5-1 (binding) + claude-fable-5 — same-family evidence only.

## Engine change (commit 535abade + review fix a2f5bcfe)

New opt-in target `{kind:'alliesInStatus', statusPrefix, includeSelf?}`: allies whose kit-named
self-status window (`selfStatus` effect → `unit.selfStatuses`, the channel `requiresSelfStatus`
reads) is open at the apply frame and whose name starts with the prefix; `includeSelf` adds the
owner unconditionally. "Into the Fray" is a FAMILY of named modes in the roster
(marian-queen: "Into the Fray: Sharpened Resolve" from battle start, "Into the Fray: Penetrant Wish"
on burst; scarlet-goddeath: "Into the Fray: Serene Mind" from battle start, "Into the Fray: At One
With the Sword" on burst), so a prefix match is the literal reading. `scripts/regression.ts` output
was byte-identical with and without the engine commit. Code review: claude-fable-5-1,
FIX-BEFORE-MERGE → fixed (cross-slug producer census WARN in validate-structural; rank-builder
burstCdr enabler guard). Pinned by scripts/tests/engine/allies-in-status.test.ts.

Known dependency (⚑1 in the override): no shipped override emits an "Into the Fray: …" selfStatus
yet (marian-queen names its burst mode "Penetrant Wish" and gives its battle-start mode no status;
scarlet-goddeath has no override), so in every current comp both Full-Burst-entry grants reach only
her. The unit test exercises the ally half by patching marian-queen in the fixture with a battle-start
"Into the Fray: Sharpened Resolve" status. Editing marian-queen's override is outside this run's
authority — proposed in the summary.

## S2c reconciliation (driver vs the two S2b reviewers)

Converged on every line: dispositions, trigger identities (fullCharge for the heal and the 220.7%
rider; fullBurstEnter for the 27.45 / 29.17 grants; burstCast for the 34.84 burst grant), targets
(allies / alliesInStatus+includeSelf / enemy / allies), stat basis (attackDamagePct; casterAtkPct for
both "of the skill user's ATK" lines), the charFixes.statImmunities ['chargeSpeedPct'] home for the
immunity, the UNMODELED set (Nanoparticle Injection branch + its +40s cooldown and Consumption DEF;
the charge-hold shield and Goddess Blessing DEF; the ≥3-incapacitated revive branch; the duplicate
in-Consumption 34.84 branch), and the 6-line load-bearing set. Additions taken from their
nearest-wrong lists: the rider is not core-eligible (+ core:true counterfactual); exactly one burst
grant per ally per cast (+ double-branch counterfactual); a two-B2 fixture so the Full-Burst-entry
grants are shown to fire on Full Bursts she sat out (fable-5-1's fixture hazard).

## Convergence run — S5 blind tests vs the driver's override

The verbatim S5 file wires `opts.onEvent` (the harness reads `opts.cfg.onEvent`), so it collects no
events and every test fails on its fixture check. `blind/rapunzel-sanctuary.adapted.test.ts` changes
ONLY that wiring. Adapted run vs the shipped override: 7 pass / 3 fail / 3 skip.

- S2-a (shield must exist) and S2-b (Goddess Blessing DEF must be emitted): RED by design. S5 and S6
  (both opus-5) proxied "Full Charge is maintained for 1 or more seconds" onto `fullCharge`. Both S2b
  reviewers named exactly that as the nearest-wrong reading; three shipped overrides carry the same
  clause UNMODELED for the same reason (rapunzel-pure-grace, guilty-mighty-bunny, sin-swift-bunny —
  "the sim releases at full charge, so it never holds"). `fullCharge` fires on every RL shot (~every
  1.4s); a 1-second hold past full charge never happens under auto-release. Driver keeps both lines
  UNMODELED (⚑3). Both are defensive (shield HP / DEF); the shield would additionally emit `shielded`
  events, which no fixture unit consumes.
- S2-d: its `noFb: true` counterfactual arm expects the rider to lose damage, but `noFb` on an override
  effect is engine-inert under the default (src/engine/sim.ts header: "noFb in an override is now
  INERT under the default"; validate-overrides rejects it). The driver's unit test pins the rider
  defaults directly (L8 "engine rider defaults": every rider hit crit-eligible; every rider hit inside
  a Full Burst has fbMajorApplied). A blind-test defect, not a divergence;
  the arm's premise (the rider takes the Full-Burst +50% by landing time) holds in the driver's model.
- The verbatim fixture is controlComp (liter / crown / her / helm): crown takes every stage-2 cast
  by slot order, so she casts 0 bursts there; the blind burst assertion proves the block by re-keying
  it to fullBurstEnter, which passes.

## S6 blind override vs the driver override

Identical on every damage-bearing line (heal, both alliesInStatus FB-entry grants with the same
prefix + includeSelf, the 220.7 rider, the burst grant, statImmunities). Differs only on: (1) the two
charge-hold lines encoded on fullCharge (shield 1s + defPct 42.24 with noRetriggerWhileActive and a
"Goddess Blessing" selfStatus) — see above; (2) `crit: true` on the rider — redundant: flat-damage
riders are crit-eligible by default (pinned in the driver's L8 group).
