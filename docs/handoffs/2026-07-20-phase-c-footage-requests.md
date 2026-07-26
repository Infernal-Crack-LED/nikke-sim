# Phase C — footage requests (recordings needed to unblock the measurement-gated kit-audit items)

> Source: the Phase C sweep (`2026-07-20-kit-audit-implementation-plan.md` → "Phase C SWEEP STATUS"). Every
> item below is a kit-audit gotcha whose faithful fix is understood but whose value/trigger is UNMEASURED,
> and for which the current footage library can't isolate the mechanic. Each entry = what to record, the exact
> read recipe, and what landing it unblocks. **Standard basis unless noted:** scope-lock (10/10/10, no cube,
> Base 5 gear, core 7, sync 400, treasure, partless boss), the focus unit in the middle slot (popups render
> focus-only), full-fight video + the end-of-fight damage screenshot.
>
> **Priority key:** P1 = high board impact + tractable (do first); P2 = real but lower-impact or board-OK unit;
> P3 = hard/engine-owned/low-value. **Ownership:** flagged where a unit may be unowned (skip if so).

## Priority summary

| P   | unit (slug)                       | board                       | mechanic to measure                                                              | recording                                                                            | done |
| --- | --------------------------------- | --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---- |
| P1  | chisato                           | HOT 1.202                   | true-normal window: core retained? + DPS share                                   | chisato-focus comp where she bursts                                                  | yes  |
| P1  | moran                             | COLD 0.706                  | swap-window throughput (shots/hits)                                              | **isolated moran-solo**                                                              |
| P1  | scarlet-black-shadow              | HOT 1.042                   | in-burst per-phase proc count (848% popups)                                      | **isolated single SBS burst**                                                        | yes  |
| P1  | diesel-winter-sweets              | COLD 0.824                  | Intro vs Highlight (bursts-first vs second)                                      | comp where she bursts SECOND                                                         | yes  |
| P1  | red-hood                          | COLD 0.867                  | excess-Charge-Speed → Charge-Damage conversion                                   | red-hood-focus w/ a CS buffer                                                        | yes  |
| P1  | cinderella                        | COLD 0.937                  | unique-RL: rockets-per-prime K, reload, 3-popups/pull divisor (target ~315/180s) | **isolated cinderella-solo** — see `2026-07-21-cinderella-rl-firepattern-handoff.md` | yes  |
| P2  | soda-twinkling-bunny              | OK 1.021                    | FB-ext pre/post-consume gate + Hit-Rate core lift                                | soda-focus (confirm the queued chip-tier)                                            | yes  |
| P2  | maiden-ice-rose                   | OK 0.97                     | MP-at-cast → burst nuke count                                                    | full comp incl. her burst cast                                                       | yes  |
| P2  | ada                               | COLD 0.902                  | Special Modification uses-cap (1 round)                                          | ada-focus burst window                                                               | yes  |
| P2  | trina                             | HOT 1.151                   | ally Hit-Rate → core lift (Electric-AR ally)                                     | Electric-AR ally focus in trina's burst                                              | yes  |
| P2  | arcana-fortune-mate               | HOT 1.132                   | Precious Moments stack count at FB end                                           | arcana-fortune-mate-focus                                                            | yes  |
| P2  | modernia                          | COLD 0.868 (0.834 post-dkw) | Destroy-Mode 2.24% stream: does it crit? MG core in FB                           | modernia-focus                                                                       |
| P2  | maxwell                           | COLD 0.925 (hi var)         | burst railgun charge multiplier                                                  | maxwell-focus burst (run-G style)                                                    |
| P2  | prika / mint                      | COLD 0.691 / 0.776          | Performance/Encore/Sing-Along/Singing states                                     | MiKa (Mint+Prika) focus fight                                                        |
| P2  | milk-blooming-bunny               | HOT 1.301 (U23)             | Embarrassment 0.5s-hold trigger + auto burst mag                                 | milk-blooming-bunny-focus                                                            |
| P2  | jill                              | HOT 1.041                   | true-damage-window DPS share (U24 core confirmed)                                | jill-focus burst window                                                              |
| P3  | elegg-boom-and-shock              | COLD 0.825                  | ≥4-ghost tier uptime                                                             | elegg-focus, track ghost counter                                                     |
| P3  | privaty                           | OK 0.971                    | Designated-Target gate condition                                                 | cross-comp (T4 vs u7)                                                                |
| P3  | dorothy-serendipity               | HOT 1.115                   | burst pellet-count +5 (SG)                                                       | engine-owned; deprioritize                                                           |
| P3  | nayuta                            | COLD 0.897                  | self Hit-Rate stack (SMG)                                                        | near-inert (SMG cone); low value                                                     |
| P3  | ada/mana/raven/rosanna-chic-ocean | mixed                       | DoT ticks crit? (~47% signature)                                                 | any focus w/ visible DoT ticks (feeds U13)                                           |

---

## Batch 1 — the P1 board-movers (record these first)

### chisato — true-normal window core retention + DPS share (HOT 1.202)

- **Why:** her `coreMult 250` on SMG true-flavored normals is a large HOT lever. jill's U24 already showed true
  AR normals RETAIN core; chisato is the SMG confirmation. If SMG true normals also retain core, her HOT is NOT
  this (it's her Extrasensory-gate decay model) → close the gotcha; if they FORFEIT core, strip core (big cool).
- **Record:** a comp where chisato actually casts her Burst (her true-window is `burstCast`-gated — a solo clip
  won't show it; she needs the B1→B2→B3 chain to fire). Focus chisato. PI2-style team is fine.
- **Read:** in her post-burst true-damage window (S2 weapon-swap, ~10s), do her normal-attack popups show the
  red **"CORE HIT"** label? Also estimate the fraction of her total damage that lands in that window.

### moran — swap-window throughput (COLD 0.706, the worst COLD on the board)

- **Why:** the dominant driver of her 0.71. Real fight lands ~1.3× more hits than the sim during her 10s
  unlimited-ammo swap; the mechanism (faster swap fire-rate vs >1 bullet/pull) can't be read from comp footage
  (electric muzzle bloom + occluded ammo + overlapping popups — already tried on `moran control.mov`).
- **Record:** an **isolated moran-SOLO** fight (just moran, so no overlapping popups/bloom). Full video +
  the ammo counter visible.
- **Read:** during her burst swap window, count shots fired (ammo-counter drops) and popups per pull → shots/s
  and bullets/pull. _(Alternative that skips footage entirely: the datamined `shot_count`/`muzzle_count` for
  shot_id `1028102`.)_ Do NOT model as a per-shot change — it's measured-refuted; this is a throughput count.

### scarlet-black-shadow — in-burst per-phase proc count (HOT 1.042)

- **Why:** the in-burst Skill-1 threshold is a scalar `countInFb=1` (fires once/phase) but the real per-phase
  count is 1/2/3 — over-fires the 848% rider. The truth is between the two.
- **Record:** a **clean isolated SBS burst** — a fight (or clip) where a SINGLE scarlet-black-shadow burst
  window is un-occluded (the `sbs control.MP4` had overlapping popups). Focus scarlet-black-shadow.
- **Read:** count the **848%-class popups in one burst window**, per burst phase if distinguishable.
- **Second (same footage):** charge-cycle timing — video-measure her full charge cycle toward ~42f/0.70s (sim
  runs ~40f, ~2f fast); keep the 18f charge portion CS-scalable, recovery fixed.

### diesel-winter-sweets — Intro vs Highlight branch (COLD 0.824)

- **Why:** the override hard-codes the Intro branch (Sustained +60.19%, bursts-FIRST). When she does NOT cast
  her own burst she's in Highlight (Sustained +235.03%, but loses her burst DoTs + the team Damage-Taken ▲25%).
  The two branches are mutually exclusive and burst-order-coupled — a big COLD swing.
- **Record:** a comp where diesel-winter-sweets **bursts SECOND** (does NOT cast her own burst that rotation) —
  and, ideally, a sibling comp where she bursts first, to A/B the two states.
- **Read:** her Sustained-damage buff icon value (60.19 vs 235.03) + whether her burst DoTs + the team's ▲25%
  Damage-Taken are present.

### red-hood — excess-Charge-Speed → Charge-Damage conversion (COLD 0.867)

- **Why:** her S1 "Charge Damage ▲ 240% of the excess over 100% CS, continuously" is modeled as a STATIC
  chargeDamagePct 90 average. Faithful = `2.4 × max(0, liveCS − 100)`, live. Her COLD residual lives here.
- **Slug:** base `red-hood` (SR/Iron/Λ), NOT `rapi-red-hood`.
- **Record:** a red-hood-focus fight **with a team Charge-Speed buffer** (so her live CS exceeds 100% by a
  varying margin) — outside her Red Wolf window.
- **Read:** her charge-damage popup value at known CS levels → confirm the 2.4×(CS−100) slope.

---

## Batch 2 — P2 (real, but board-OK units or narrower impact)

- **soda-twinkling-bunny** (OK 1.021) — a **soda-focus** recording to confirm the QUEUED FB-extension chip-tier
  enactment: does the tier gate read her chips PRE- or POST- her own −17 burst spend? (the n=1 `soda tb control`
  read leaned post-consume). Same footage: Hit-Rate ▲38.91% core lift (in vs out of the ≥20-chip window).
- **maiden-ice-rose** (OK 0.97) — a **full** comp recording that INCLUDES her burst cast (the `tb2 3 maiden`
  clip was a partial ~70s capture; she never bursts in it). Read MP-at-cast + count the 1372.8% nuke instances.
  Sibling `tb2 1/2/4/5` clips are candidates to check first.
- **ada** (COLD 0.902) — ada-focus burst: does Special Modification end after the FIRST swapped shot ("for 1
  round")? Count special-charge shots in the swap window (should be 1, sim over-fires ~2).
- **trina** (HOT 1.151) — needs an **Electric-AR ally** focus during trina's 10s burst window: read that ally's
  core-hit fraction with vs without trina's +45.3% Hit-Rate. (Hard — measures an ALLY, not the focus unit.)
- **arcana-fortune-mate** (HOT 1.132) — arcana-fortune-mate-focus: count Precious Moments stacks at FB end
  (expected ~2 at ~1.5 pulls/s SG cadence; the override bakes 3). Confirms the 13%×stacks team-ATK.
- **modernia** (COLD, cooled to 0.834 post-d-killer-wife) — modernia-focus: (a) does the Destroy-Mode 2.24%
  per-hit stream show a ×1.5 crit signature? (b) CORE-HIT fraction inside vs outside the 15s post-FB window at
  matched MG spin-state (first 18 wind-up rounds never core). Feeds both her gotcha and the U13 question.
- **maxwell** (COLD 0.925, high variance) — maxwell-focus burst: popup-read the railgun hit; reconstruct
  `FinalATK × 8.1342 × charge(3.0) × …` to confirm it's a full-charged Pierce railgun, not the uncharged
  813.42% flat nuke. (run-G-style footage.)
- **prika + mint** (COLD 0.691 / 0.776) — a **MiKa (Mint + Prika)** focus fight: confirm (a) the PA-MiKa board
  comp includes Prika (mint duet vs solo mode — a big COLD lever), (b) Prika's Performance duration + whether a
  Sing-Along caster is present, (c) the Singing/Dancing toggle cadence. Record both mint-focus and prika-focus.
- **milk-blooming-bunny** (now HOT 1.301, U23) — milk-blooming-bunny-focus: (a) does full-auto ever satisfy
  "Full Charge lasts ≥0.5s" (the Embarrassment trigger — is 0.5s an extra hold beyond full charge?); (b) the
  auto-mode burst-window DPS share (to attribute the U23 overshoot: burst atkPct-220 / S2 DoT magnitudes).
- **jill** (HOT 1.041) — jill-focus: her true-damage-window DPS share (U24 already confirmed AR true normals
  retain core; this sizes how much the pending trueNormals enactment would add, before landing it on a HOT unit).

---

## Batch 3 — P3 (hard, engine-owned, low-value, or unowned)

- **elegg-boom-and-shock** (COLD 0.825) — elegg-focus, track the on-screen ghost counter → the ≥4-ghost tier
  uptime under real FB cadence (the 35% tier is shipped at 17.5% = a 0.5 time-average).
- **privaty** (OK 0.971) — cross-comp read: what satisfies the Designated-Target gate in the T4/T4b calibration
  comps but NOT in u7 (both partless Fire boss)? Needs the two comps side by side, not one recording.
- **dorothy-serendipity** (HOT 1.115) — burst pellet-count +5 is engine-owned (SG landing bands); deprioritize
  vs the cone model. A `doro s.MP4` solo exists but pellet-count isn't cleanly isolable.
- **nayuta** (COLD 0.897) — self Hit-Rate stack (▲1.4%×30). LOW value: the SMG cone is near-inert to Hit-Rate
  (cone-freeze), so even the faithful add barely moves core rate. `nayuta solo.MP4` exists if ever wanted.
- **DoT-crit batch (U13):** `ada`, `mana`, `raven`, `rosanna-chic-ocean` — any focus footage with visible DoT
  ticks: do the ticks show the orange **crit** starburst (~47% at elem advantage)? Confirms the U13 engine flip
  (do NOT flip without also de-crediting the calibrated DoT bases). Owner/engine item — footage is the trigger.

## Unowned / out-of-scope (skip unless acquired)

`asuka-wille`, `mari`, `laplace` — no-data parser baselines; and per the owner roster, several standing/collab
units aren't owned. `tove`, `arcana`, `rouge`, `velvet`, `bready`, `mast-romantic-maid` are no-data — record
only opportunistically if they enter a real comp.

---

## How to batch the sessions (fewest recordings)

1. **True-damage session:** chisato (+ jill DPS-share) — one comp where both burst.
2. **Isolated-solo session:** moran-solo, scarlet-black-shadow isolated burst — no teammates to occlude popups.
3. **MiKa session:** mint + prika (+ diesel-winter-sweets if in a Fire comp bursting second).
4. **SG/Hit-Rate session:** soda-focus, arcana-fortune-mate-focus (+ trina if an Electric-AR ally is available).
5. **Focus-burst session:** ada, maxwell, maiden-ice-rose (full), modernia, milk-blooming-bunny — one focus each.
