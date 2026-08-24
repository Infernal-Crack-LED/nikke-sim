# Kit-faithfulness audit — top-board sweep (2026-08-23)

**FINDINGS ONLY — nothing here was enacted.** Owner-requested audit of the top 5 Burst III units
per element on the DPS chart (8/12 investment cell, `solo.eleweak.c100.8of12`, deduped across
profile variants) plus the top 20 unique supports on the buffer ranked board (Generic sub-board).
45 units total; `privaty` appears on both boards. Nine parallel read-only agents each compared the
kit prose in `data/characters.json` line-by-line against the unit's override
(`src/skills/overrides/<slug>.json`: blocks + note/caveats/unmodeled), grepped the engine for
slug special-casing, and skimmed the unit's spec test. Hunted: (A) primitives that don't match the
kit's mechanic shape / workarounds, (B) fitted or recording-derived values conflicting with the
kit reading, (C) whether each divergence is disclosed in the override prose or hidden in the code.

## Headline

**The early-days fitted-fudge class is essentially purged from the audited slice.** No hidden
recording-tuned number conflicting with a kit-stated value was found on any of the 45 units. The
recording-derived values that remain are disclosed measured constants with provenance (see §4).
Several overrides explicitly record REMOVING old fudges (`cinderella` twin-instance ×2 and the
+45 charge-speed proxy; `mihara-bonding-chain` 12-stack average; `milk-blooming-bunny`
approximating mode; `miranda` 1.5s round proxy; `helm-aquamarine` hitCount:30 proxy), and several
notes explicitly refuse to fudge known-hot residuals closed (`eve`, `milk-blooming-bunny`,
`rapi-red-hood`, `privaty`).

What the audit did find: a small set of genuinely **hidden** divergences (§1), five units whose
models are **disclosed but approximation-dense** (§2), a set of disclosed-but-material open items
(§3), and recurring **engine-level patterns** that produce the same mismatch shape across many
units (§5). Note-prose drift — stale narration contradicting the shipped blocks — turned up on
~8 units and is its own hygiene item (§6).

## Verdict tally

- **CLEAN:** crown, miranda, liter, helm, ada, liberalio, ark-ranger-black, chisato
- **SIGNIFICANT (all major items disclosed):** prika, mast-romantic-maid, grave,
  dorothy-serendipity, asuka-wille
- **MINOR:** the remaining 32.

## 1. Hidden findings (not disclosed in note/caveats/unmodeled — the audit's primary target)

Ranked by severity:

1. **`mihara-bonding-chain` — burst mirror DoT hard-coded at the 20-stack cap (med).** Kit:
   "Mirrors the stack count of Ensnaring Chains on each target." Model ships a static 1001%/s
   (20 × 50.05) on every burst cast. At her FIRST burst the live pool is ~10 (the 40-normals
   block is gated `fbGate:'inFb'`), so the kit mirror would be ~500.5%/s — an over-ship of
   ~5005% ATK in the first window (~4–5% of her mirror-DoT damage). The note asserts cap-by-burst
   as if universal; the test pins `[1001]` for all bursts while its own comment admits the
   first-burst cap is a fixture property. Pushes the same direction as her disclosed 1.179 HOT
   residual. **Already tracked:** this is the QUEUE.md "faithfulness sweep residue" item
   localized 2026-08-17
   (`docs/probe-data/mihara-overmodel-localization-2026-08-17.json`) — the audit independently
   re-confirmed it (hidden in the override prose, open in the queue), and adds the first-burst
   arithmetic as a second, rotation-independent divergence of the same static-cap encoding.
2. **`flora` — `selfAndAdjacent sides: 2` widens "both adjacent allies" to up to 5 targets (med).**
   Kit reads self + 1 each side (3 units); `sides: 2` covers self + 2 each side. Widens the S2-3
   casterAtkPct 45.12 flat-ATK buff and the recovery-event feed (crown consumer). Technically
   disclosed as an open question (shared with `rouge`) but the shipped choice is the inflating one.
   The most enactable buffer-targeting item found.
3. **`mint` — duet mode Singing values ungated from t=0 (low-med).** Singing cannot exist before
   her first burst (~rotation 2 via prika's Encore), but the duet-mode S1 casterAtkPct 45.02 fires
   from the first shot and the S2 stage-3 trio fires at the first stage-3 entry. ~20–25s of
   opening over-credit on her graded comp; caveats cover solo covariance and mode selection but
   not this.
4. **`snow-white-heavy-arms` — leftover `durationShots` charge on a displaced swap shot (low).**
   If only one Fully-Active swap shot fits the window, the S2 buff still holds one unspent charge
   that lands 528% chargeDamagePct on the next baseline 1.2s shot. Needs a displaced-shot
   scenario (cf. open U39).
5. **`phantom` — Thief's Dagger `everyN: 60` counter drift (low).** The magazine-start equivalence
   is derived at steady cadence; during the post-burst maxAmmo+50% magazine (90 shots/7.5s) the
   real re-application event decouples from shot multiples of 60. The Calling-Card window duty is
   ⚑-covered; the dagger grant alignment is not.
6. **`marciana-marine-study` — three quiet interpretation choices (low).** (a) `hitCount: 20` with
   default `countScope` ('always') where "landing 20 normal attacks against a target in the
   High-Risk Target state" arguably wants `countScope: 'gated'`; (b) the caveat misdescribes the
   engine ("counts ALL hits" — the counter increments only on normal shots, i.e. the disclosure
   overstates the divergence in the conservative direction); (c) Whistle "stacks ▲ 4" encoded as
   `initial: 4` without noting the 5-at-t=0 alternative (~32.73% ATK delta for the first 5s).
7. **`nayuta` — bolt-recovery arithmetic mismatch inside the note (low).** The tier-audit paragraph
   says "cycle 2.3s (+0.5s SR bolt recovery)" while the shipped value is `chargeTimeSec: 2.13`
   (= 1.8 + 0.33); the 0.17s discrepancy is unexplained anywhere. The pinned cadence records the
   shipped count, not a kit-literal certification.
8. **`ada` — note overstates the grenade-stream interleave (low, damage-identical).** Note claims
   the two 2s dot streams interleave to "exactly 1/s"; engine first-tick semantics + the ~22f
   burstCast/fullBurstEnter skew produce pairs ~0.37s apart every 2s. Tick count and total damage
   match the kit exactly.
9. **`mari` — two near-inert scope items (low).** The core-proc Pierce line triggers on any attack
   in-kit but is keyed to `shotFired` only (burst nuke doesn't feed it); engine `requiresCore` is
   a deterministic gate, not a per-shot probability roll (fires whenever `cfg.coreHitRate > 0`).
10. **`anis-star` — dropped "at the start of battle" CDR activation instance (inert).** A
    battle-start burst CDR is a no-op (bursts are gauge-gated at open), so zero board effect.
11. **`prika` — "Full Charge attack" → bare `shotFired` proxy disclosed only in the test header,**
    not in the override caveats (the identical proxy IS in `mint`'s caveats) — a disclosure-parity
    gap, not a model gap.

## 2. SIGNIFICANT-verdict units (disclosed, but the model diverges heavily in shape)

- **`prika`** — three `durationSec: 9999` sentinels where the kit prints 10s / 25s /
  "while in Performance" (Effect 3 team Attack Damage 25.01%, Pierce, Charge Damage 25%), plus a
  `burstFirst` + `burstCdr -9999` self-lockout that encodes the owner-confirmed PLAYER rotation
  with no kit basis. The Effect-3 window alone is a measured ~+0.15 sim/real lever on her only
  graded comp (reads 1.065 HOT). The override itself names the open question — highest
  board-weight premise-held item in the audit.
- **`mast-romantic-maid`** — every "× stacks" magnitude baked to a static ×2 cycle average, every
  "while Drunken" gate dropped to always-on, Hit Rate ▼20%×stacks emulated as `normalAttackPct
-40` on self (a different channel; validated n=1 at ~6% error), Hangover re-based from FB-end to
  her own cast count. All owner-ruled and candid in caveats with bias directions; she reads 0.951
  COLD. A live `resource`-based Drunken counter (mint-style) is the obvious faithful upgrade path.
- **`grave`** — three same-direction HOT flattenings: Heat-Emission team grants always-on (kit:
  off during 10s Prediction windows; the pierceDamagePct 48.4 overcounts exactly during allies'
  strongest window), Overheat I sustained forever (kit: removed on each full-mag reload — ~2×
  real uptime), Overheat II/III instant-on (kit: 30/60-attack ramps ≈ 2.5s/5s). Deliberately
  parked as open-questions U19 with the faithful durations computed in the note; she grades
  ~1.17–1.22 HOT by owner direction (faithful > fit). The historically-dropped "Reload Ratio
  ▼50%" line is definitively no longer dropped — encoded as measured `reloadFrames: 193` (n=19).
- **`dorothy-serendipity`** — three load-bearing recording-derived values carry kit lines
  (consolidation `coreRate 0.9`; `pelletFraction 1.0`; the landed-pellet band fractions), all
  disclosed, one carrying an owner-accepted OPEN calibration conflict: the 80-pellet accrual was
  calibrated all-pellets-land but now accrues landed pellets → the solo consolidation count reads
  LOW, needs solo re-validation. Kit "Hit Rate ▲98.18%" is not modeled as a stat at all — its
  effect is carried by the measured consolidation config (the clearest "mechanic emulated via
  another knob" in the sweep, owner-sanctioned). Under-disclosed edge: "Activates only DURING
  Full Burst" flattened to a fixed 10s timer — diverges under FB-extend comps (e.g. modernia 15s).
- **`asuka-wille`** — proxy-heavy and wholly unmeasured (no recording): Annihilation self-mode
  encoded as a BOSS `targetStatus` (a name-keyed side channel any other unit's
  `requiresTargetStatus` could falsely read); Anti A.T. Field 30s/consume-on-trigger rewritten to
  9s gradual expiry (team amp ~34% vs true ~22.5% uptime); the stack-mirror finisher fixed at the
  30-stack cap (3× spread vs the blind rebuild's 10-stack assumption); "MG heating up speed ▼100%"
  (a wind-up/fire-rate line, damage-relevant) unmodeled. Every one ⚑-flagged with recipes.

## 3. Disclosed-but-material open items worth owner attention

- **`cinderella` G1 — burst nuke same-cast ATK snapshot (med, owner resolution already requested
  in the override).** `burstSnapshotsPreFb: false` lets the nuke (~45% of her fight damage)
  snapshot her same-cast stage-3 `atkOfMaxHpPct 2.71` conversion; the note's own [HISTORICAL]
  e3-video reading says the nuke must LOSE that stack, and was never listed in the 2026-07-21
  SUPERSEDES set. ~20–25% nuke swing. The caveat flags it "⚑ OWNER RESOLUTION REQUIRED"; the test
  pins shipped behavior, not correctness. Largest open faithfulness risk found.
- **`scarlet-black-shadow`** — in-burst proc cadence (scalar `chargeCounter` vs per-phase
  [3,6,9]/[1,2,3] reading): an N3 video re-read found the 848% proc ABSENT from a confirmed burst
  window and she grades ~1.18 HOT there. Correctly parked behind a queued isolated-burst
  measurement rather than re-fudged.
- **`eunhwa-tactical-upgrade`** — kit-silent burst cannon window defaulted to 10s (~6 shots);
  roughly a 2× lever on her own burst damage, ⚑-flagged. Also her camouflage true-damage flavor
  on SR normals is dropped (an UNDER-count, measurement-gated).
- **`drake`** — "after 10/5 normal attacks" read as trigger PULLS, anchored on a different unit's
  chassis measurement (`brid-silent-track`); if it means pellets the nukes are 10× hotter. Largest
  single lever on an unrecorded unit, disclosed.
- **`bready`** — "Aftertaste Effect ▲349.8%" routed additive in Damage-Up; a multiplicative
  DoT-magnitude reading would be ~41% hotter. Unmeasured, ⚑-flagged, no recording exists.
- **`milk-blooming-bunny`** — engine pierce-tagging applies the burst's `pierceDamagePct 117.64`
  to her S2 447.7% rider, which the kit types as Distributed Damage, not pierce (measured
  10.96M→6.70M per tick without gainPierce). Engine-scope, disclosed ⚑, she grades COLD so it
  masks nothing.
- **`mari`** — the whole S2 (all three blocks incl. the 30.78% caster-ATK team grant, her
  board-relevant surface) rides an ESTIMATED `shotFired` trigger for a kit-silent activation;
  loudly ⚑-flagged as the top per-unit uncertainty; a CD-interval alternative would heavily cut
  out-of-FB uptime.
- **`jill`** — the HR→core geometry slope in `src/engine/sg-geometry.ts` is calibrated to
  saturate at jill's own ▲80 Hit Rate cell: circularity risk if her cell is later used to
  validate the slope. Disclosed ⚑ at the engine level.

## 4. Recording/measured values standing in for kit values (all disclosed — inventory, not defects)

- `grave` `charFixes.reloadFrames: 193` (n=19; refutes all three literal readings of "Reload
  Ratio ▼50%").
- `dorothy-serendipity` consolidation `coreRate 0.9`, `pelletFraction 1.0`, landed-pellet band
  fractions (owner-ruled decomposition ±2%; one OPEN re-validation flagged, see §2).
- `rapi-red-hood` `requiresPulls: 120`, `delaySec: 0.4`, attachment core:true / explosion
  no-core — all owner-measured/footage-ruled with named probes.
- `neon-vision-eye` `burstGenPct 330` embeds a ⚑ ESTIMATED in-window normal-attack count — the
  one override-level non-kit, non-datamine number in the Electric batch (gauge-gen only).
- `privaty` `elemAdvantageDamagePct 130` bucket placement (measured popup ratio 2.8244).
- `anis-star` gauge row is measured (battery 3 + 2026-08-18 owner ruling) rather than datamined.
- `helm-aquamarine` S2 `interval: 4` from datamine (kit prose is trigger-silent) — datamine, not
  recording; first-fire phase unpinned ⚑.

## 5. Systemic engine-level patterns (batched observation — a cross-cutting signal, NOT enacted)

1. **No "landing a Full Charge attack" trigger primitive** → bare `shotFired` proxy on at least
   8 units (mari, maxwell-ordinary-mechanic, ade-agent-bunny, prika, mint, helm,
   milk-blooming-bunny, diesel-winter-sweets). One engine gap expressed as N per-unit caveats;
   sound only while the sim's charge weapons always full-charge.
2. **No self-status / status-end primitive** → "while in state X" is the dominant mismatch shape:
   conditionals flattened to always-on or fixed timers (grave, label, crust, asuka-wille,
   dorothy-serendipity, yukiko, eunhwa-tactical-upgrade, jill, eve). The flattenings mostly err
   HOT; grave's note names the missing primitive verbatim.
3. **No general resource pool** → resource kits folded into rotation-keyed cadences
   (neon-vision-eye Firepower Gauge → everyN 3; maiden-ice-rose MP → `fbMissedSinceBurst` fold;
   ark-ranger-black battery → fixed 10s). Owner-specified and disclosed; all break under unusual
   rotations (multi-B3 phase drift).
4. **Sentinel durations (`9999`/`100000`) stand in for "until status ends"** (prika ×3,
   cinderella-crystal-wave mode swap). A "linked to named status" duration primitive would retire
   the pattern.
5. **Stack mirrors/ramps flattened to static caps or time-averages** — hidden on
   mihara-bonding-chain (§1.1), disclosed on asuka-wille (30-cap), mast-romantic-maid (×2 bakes),
   nayuta (time-averaged gates — now inconsistent beside the `rampSec` primitive its sibling Hit
   Rate line received), cinderella (Beautiful → rampSec 36).
6. **Scope-lock-justified drops are correct for the graded board but the web UI runs the same
   engine on arbitrary comps** — the most likely to mis-model there: mana's all-allies 18%
   chargeSpeedPct stand-in for "0.18 sec to the 1 longest-charge ally" (percent≠seconds off a
   1.0s base), asuka-wille's boss-status side channel, dorothy-serendipity's fixed 10s FB gate
   under FB-extend, jill's permanent Magnum/Acid under partial-reload mechanics.
7. **~22-frame burstCast vs fullBurstEnter skew** is a recurring sub-1% micro-divergence
   (neon-vision-eye 35.05 rider, ada's stream pairing).
8. **Rider `extraHitDamagePct` generates no burst gauge** — engine-wide sole omission in the
   gauge-credit family; owner-bounded via `scripts/battery/u28-gauge-ab.ts` (FB counts hold),
   deferred to the batched gauge cluster.
9. **Shared derived ⚑: the Hit-Rate→core conversion** (`acrForHR` / sg-geometry slope) carries
   miranda, anchor-innocent-maid, drake, phantom, jill, chisato — one measurement would de-risk
   several boards at once; plus the jill-cell circularity (§3).

## 6. Note-prose drift (violations of the 2026-07-22 "override prose describes the model as it is

today" ruling — each manufactures phantom findings for machine reads)

- `anchor-innocent-maid` — ⚑(4) still claims the regen is "collapsed to ONE heal event" vs the
  shipped `ticks: 8` block.
- `asuka-wille` — note says the reloadSpeedClamp was "left unenacted" while the JSON ships it.
- `phantom` — ⚑2 narrates the superseded `durationShots: 2` encoding vs the shipped `: 1`.
- `mihara-bonding-chain` — note says the 40-normals generation "is FOLDED into the 12-stack
  average" while the file ships a discrete `hitCount: 40` block + live pool; header board figure
  (1.034) contradicts the caveat (1.179).
- `drake` — mid-note still carries pre-treasure values (hitRatePct 11.85 vs shipped 20.09;
  hitCount 100 vs shipped 10 perPull; flatDamage 1254 vs shipped 3009.6).
- `flora` — UNMODELED paragraph claims the S1 stack-bump "has no engine primitive" while the
  `addStack` block is shipped and the caveat says so.
- `ada` — "exactly 1/s" interleave claim (see §1.8).
- `neon-vision-eye` / `maiden-ice-rose` — long superseded-narrative palimpsests; a reader must
  reach the final gauntlet paragraph to learn which earlier claims are dead.

## Method note

Cell selection: "the 8/12" per owner instruction 2026-08-23 = the 8/12 investment tier of the DPS
chart; ranking cell `solo.eleweak.c100.8of12` (the Team Builder's canonical cell,
`web/src/BuilderPage.tsx:233`). Buffer board: `web/public/bufferchart.json` `cells.generic`,
deduped to first appearance per slug. Agents: 9 × 5 units, read-only, each seeded with
`.claude/subagent-non-negotiables.md`. No files were edited by the audit itself; this document is
its only artifact.
