# Manual review — yuni (Yuni)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (fullBurstEnter-vs-burstCast identity on both the S1 window and the sole-B2 nuke, flat-round weapon-state modifier, recovery-window encoding, one out-of-domain ⚑ cluster)

> Slug disambiguation: `yuni` is the BASE unit (Yuni, RL/Fire/Defender/Burst II, cd 20s,
> ammo 6, SSR, released 2022-11-04). She has NO variant twin — lint-slug-disambiguation
> passes clean on the full kit summary, so no disambiguation note is required (unlike the
> mica/mica-snow-buddy family). This was a FROM-SCRATCH build: no prior override, no
> kit-status row, `simSupported: false` (baseline was bare weapon) until this gauntlet
> flipped it.

## Kit summary

Yuni is a Fire RL Defender holding the Burst II slot on a 20s cooldown. On every team
Full Burst entry she grants ALL allies (herself included) Charge Speed ▲8.97% for 10s —
the engine's subtractive charge channel (her 90-frame RL charge shortens to 82f
in-window), a timing-only lever that raises every charge-weapon ally's shot count. Every
full-charge pull of her own — for an RL that is every pull — hands the whole team three
riders at once: DEF ▲2.77% for 10s (faithful but damage-inert in v1), a 10-second
lifesteal window (2.77% of attack damage as HP — no HP pool is modeled; only the recovery
channel is, via 10 recovery ticks per window), and +1 round of magazine capacity for 5s
(maxAmmoFlat — the kit's one load-bearing damage lever: fewer reloads, more firing
uptime). Her Burst deals 348.73% of final ATK to enemies in attack range on her OWN cast
(FB-exempt by timing — the cast lands before the window opens), plus a 5s immobilize that
is honestly UNMODELED: the v1 boss never acts, so boss CC has no damage channel.

## Line-by-line

| Line | Disposition | Notes |
| ---- | ----------- | ----- |
| S1 trigger/scope: "Affects all allies. Activates when entering Full Burst." | FAITHFUL | `fullBurstEnter` → `allies` (self included — no exclusion clause). Team-event keyed: fires on ANY team Full Burst. Probe 2026-08-05: fullBurstEnter buffs land exactly ON the fullBurstStart frames while stage casts precede the window by 22–52 frames — the burstCast mis-keying counterfactual lands every application off the window frame-set (pinned RED). Scope pinned: per-firing holder set == all four allies; self-only counterfactual reaches one |
| S1 line: Charge Speed ▲8.97% for 10s | FAITHFUL | `chargeSpeedPct 8.97 / durationSec 10` — the engine-native SUBTRACTIVE charge formula (needed = round(chargeFrames×(1−cs/100)) → 90f→82f; anis-star precedent). A TIMING channel, not a damage bucket: removing S1 moves team totals while her weapon-hit atkPct magnitude set (RL charge shots ride the normal bucket) stays byte-identical (pinned both directions — the S2b reviewer's shared-prior misread was folding Charge Speed into a charge-damage stat). No durationShots |
| S2 trigger/scope: "Activates when attacking with Full Charge. Affects all allies." | FAITHFUL | `shotFired` → `allies` — for a charge weapon every trigger pull IS a full charge (helm/cinderella precedent for full-charge riders keying per shot). S2 activation frames == yuni's shot frames (≥60 / 180s, pinned); a burst-keyed counterfactual fires ~once per rotation (starves ≪ shot count). First application after t=0 (not a passive) |
| S2 line: DEF ▲2.77% for 10s | FAITHFUL (inert) | `defPct 2.77 / durationSec 10` on the same block as its siblings (one ■ header, one block, three effects — co-fires on identical frames, pinned). defPct is declared inert in v1 → pinned damage-neutral BOTH directions: removing ONLY this effect leaves every unit byte-identical; an atkPct misread moves totals (novel/poli/crust/sakura/diesel/jackal/mica precedent) |
| S2 line: Restores 2.77% of attack damage as HP over 10s | FAITHFUL (recovery channel only) | `heal ticks:10 / intervalSec:1` per full-charge pull — the engine models NO HP amount; a heal emits recovery events to its targets (helm H8 precedent for the "OVER/FOR 10 SEC" window shape). The 10s WINDOW is kit-literal; the intra-window tick cadence is the engine-native 1s approximation (⚑2). Observable only through on-recovery consumers: the spec observes it through crown's "when recovery takes effect" block in a dedicated isolation fixture (crown's own hitCount self-heal patched out; liter/ada carry no heal effects) — recovery fires continuously from her first pull, spanning ≥80% of the fight; removing ONLY the heal zeroes every firing; a burst-keyed heal starves to zero under B2 starvation |
| S2 line: Max Ammunition Capacity ▲1 round(s) for 5s | FAITHFUL (LOAD-BEARING) | Theme-14 flat-round primitive: `maxAmmoFlat 1 / durationSec 5` — "▲ 1 round(s)" is a MAGNITUDE in flat rounds, not a durationShots window and not a percent (mica M4 precedent). `maxAmmo() = round(base×(1+pct/100)) + flat`, so the nearest-wrong `maxAmmoPct 1` computes round(6×1.01) = 6 and never extends a magazine (pinned RED). The 5s window is deliberately SHORTER than its siblings' 10s (pinned: expiresFrame−frame = 300f, durationShots null). Functional pins: in-window refills load exactly 6+1 rounds (first shot leaves ammoAfter 6, 7-round magazines) for yuni+helm, and the ammo-6 holders' totals rise vs S2-removed (with the DEF half proven inert and the heal invisible in fixture A — the delta is the ammo channel alone). ada receives the grant but is excluded from the magazine-shape pins: her burst weaponSwap phase dominates her firing (12–17-shot swap magazines) |
| Burst line 1: 348.73% of final ATK as damage to enemies within attack range | FAITHFUL | ONE `burstCast` → `enemy` → `flatDamage atkPct 348.73` block ("enemies within attack range" collapses to the single partless boss at scope lock). HER OWN cast, never fullBurstEnter: as the sole B2 of fixture A both keyings fire equal COUNTS, so the discrimination is TIMING — nukes land on her cast frames with `fbMajorApplied === false` (the fullBurstEnter counterfactual lands inside the window, takes the +50% major, off the cast frames, and changes totals; milk K5/harran/mica precedent). Lvl-1 magnitude 172.4 pinned RED. Burst bucket, crit-eligible by flatDamage convention, no core (no core-strike wording) |
| Burst line 2: Immobilizes the target(s) for 5s | DOCUMENTED_GAP | There is NO boss-CC channel: the v1 boss never acts (no enemy-action model), so a boss-targeted immobilize moves nothing; the schema's `stun` primitive describes a NIKKE unable to fire/charge/reload, not a boss freeze. The nearest-wrong — laundering the CC into a boss damageTakenPct debuff — is pinned RED by absence proofs (zero boss-held buffApply in base; the counterfactual emits debuffs and lifts totals). Verbatim in `unmodeled.burst` (⚑1) |

## Cross-family corroboration

- **S2b test-faithfulness review — model: claude-fable-5.** Independently re-derived the
  kit and converged on: the fullBurstEnter S1 trigger identity, shotFired for "attacking
  with Full Charge" on an RL, the defPct-inert ruling, the flat-round ammo parse
  ("'round(s)' IS A MAGNITUDE, NOT A DURATION" — including the durationShots trap and the
  percent-over-grant trap for large-magazine allies), the burstCast pre-FB nuke, the
  Immobilize UNMODELED ruling, and — independently of the driver — the two-fixture design
  forced by B2 starvation ("the two requirements are in direct tension and cannot be
  satisfied by one comp"). TWO divergences, both reconciled: (1) heal cadence — fable
  recommended ONE recovery emission per charge, calling ticks:10 on a ~1.5s trigger an
  over-firing nearest-wrong; the driver kept ticks:10 per the helm-H8 precedent for
  window-shaped recovery lines (window length kit-literal, tick cadence the engine-native
  approximation, ⚑2 with a measurement recipe) — the S7 judge ruled this a low-severity
  DOCUMENTED_GAP, not a gotcha, and the #1 owner spot-check item; (2) a "no charge-speed
  StatKey" GAP belief — a redacted-schema false positive; the live engine has
  chargeSpeedPct (sim.ts subtractive charge formula).
- **S5 blind test writer — model: claude-opus-5.** 21 assertions (19 live + 2 GAP skips)
  written blind from the kit prose. Adapted copy (structural-only fixes, banner
  documented: harness path; SOLE-B2 fixture fix because the blind author's
  controlComp(yuni) seats crown beside yuni and B2 starvation would fail the blind
  suite's own non-vacuity check; array override slots; stat-keyed buffApply filters;
  crown-bearing recovery comp) ran vs the driver override: **17 GREEN / 2 RED / 2
  skipped**. Both REDs are the same redacted-schema artifact — the blind suite filters
  `stat === 'maxAmmoPct'` where the shipped override (and the S6 blind override,
  independently) uses the theme-14 `maxAmmoFlat`; the blind author's OWN percent model is
  self-contradictory (maxAmmoPct 1 → round(6×1.01) = 6 → the line never extends any
  magazine, so its own "stripping it moves damage" assertion could never pass under it).
  Both skipped GAP notes (Immobilize unobservable — agrees with driver; "no chargeSpeedPct
  StatKey" — redacted-schema artifact) match the driver's positions.
- **S6 blind override writer — model: claude-opus-5.** Structurally IDENTICAL to the
  driver override on skill2 (shotFired → allies → [defPct 2.77/10s, heal ticks:10
  intervalSec:1, maxAmmoFlat 1/5s] — including the flat-vs-percent reasoning and the
  chargeCounter round-robin rejection), burst (burstCast → enemy → flatDamage 348.73,
  FB-exempt by timing), and unmodeled.burst (Immobilize verbatim). ONE divergence: skill1
  stat key — blind `attackSpeedPct` 8.97/10s vs driver `chargeSpeedPct` 8.97/10s,
  self-flagged by the blind author ("if attackSpeedPct does not shorten chargeFrames in
  the engine, this line is effectively inert") — adjudicated to the driver: chargeSpeedPct
  is the engine-native subtractive charge channel the SSOT describes.
- **S7 binding judge — model: kimi-code/k3.** Verdict **GO, faithfulness 1.0**,
  discriminationOk true. All six kit lines accounted for (4 FAITHFUL + 2
  DOCUMENTED_GAP); zero REAL-GOTCHAs. The 2 S5 REDs ruled redacted-schema RECON_ERRORs
  corroborated by S6's independent convergence on maxAmmoFlat; the attackSpeedPct
  divergence ruled a self-flagged blind artifact. One low-severity FIDELITY note carried
  as the residual: the lifesteal tick cadence (driver + S6, same model family, converged
  on ticks:10; the independent S2b reviewer argued one-emission-per-charge; §11
  refresh-not-stack semantics mean the real consumer-visible cadence is a measurement
  question — ⚑2 recipe names the read).

## Residual flags

1. **[⚑2 — owner spot-check #1, per the judge] S2 lifesteal tick cadence.**
   `ticks:10 / intervalSec:1` on a trigger that re-fires every ~1.5s produces overlapping
   recovery chains; under game-mechanics §11 (re-application REFRESHES, never co-stacks)
   the real lifesteal window likely refreshes per charge rather than stacking tick chains.
   Consumer-visible outcome (an on-recovery teammate held continuously refreshed) is
   qualitatively right either way, and the HP amount itself is out of domain — but if a
   popup-read of crown's on-recovery proc cadence in a yuni+crown focus video shows one
   proc per refresh window, re-encode as a single emission per full charge (the S2b
   model). Estimate: zero damage impact at scope lock today (no recovery consumer sits in
   yuni's validated fixtures); only matters in comps fielding an on-recovery consumer.
2. **[⚑1] Burst Immobilize-for-5s unmodeled.** Zero damage impact at scope lock and in
   game (CC modifies neither boss DEF nor damage-taken); recipe = an enemy-action/boss-
   behaviour subsystem (engine-core); never launder into damageTakenPct or an ally-side
   stun (both pinned RED).
3. **[fixture note] ada's weaponSwap interaction.** ada receives the +1-round grant but
   her burst weaponSwap phase dominates her magazine structure; the magazine-shape pins
   use yuni+helm. If a future yuni comp grades ada, re-examine.
4. **[cadence tuple] datamine as-is** (chargeFrames 90 / reloadFrames 141 / ammo 6) — the
   cadence-tuple ⚑ was retired by owner ruling 2026-07-25 (datamine tuple reliable); no
   charFixes.
