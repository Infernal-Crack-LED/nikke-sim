# Manual review — kurumi (Kurumi)

**Gauntlet date:** 2026-08-02
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (named-status gate `requiresTargetStatus 'Hacked'`; hit-count `hitCount:36`; `burstCast`-vs-`fullBurstEnter`; meta-defining team damage-taken debuff)

> Slug disambiguation: `kurumi` is the Abnormal-manufacturer Iron AR Supporter (Burst I, cd 20s,
> resource_id 862, released 2026-02-12). No treasure/alternate variant; the slug is unambiguous
> (lint clean). This was a FROM-SCRATCH model — no shipped override existed before this gauntlet, so
> every kit line below is a MISSING-line assertion (RED against the absent override, GREEN once
> `src/skills/overrides/kurumi.json` landed).

## Kit summary

Kurumi is an Iron AR Supporter on Burst I whose kit revolves around inflicting a named **Hacked**
status on the boss. Every 36 normal attacks she hacks her target (S1-A), and she also hacks all
enemies whenever she casts her own Burst Skill (S1-B); each hack deals 52.24% of her final ATK as
sustained damage every 1s for 5s (a 5-tick DoT) and opens a 5s Hacked status window. While the boss
is Hacked and the team is in Full Burst, every further 36 normal attacks trigger an extra
86.17%-of-final-ATK rider on the target (S2) — triply gated by the 36-hit counter, the Full Burst
window (`fbGate inFb`), and the Hacked status (`requiresTargetStatus`). Her Burst Skill itself deals
NO damage: it makes all enemies take 18.06% more damage for 10s (`damageTakenPct` on the boss → the
engine's Taken bucket amplifies the WHOLE team's output while active). In practice she is a Burst-I
debuffer whose personal damage comes from the repeating Hacked DoT and the Full-Burst rider it
enables, and whose team value is the damage-taken debuff.

## Line-by-line

| Line                                                            | Disposition | Notes                                                                                                                                  |
| --------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| S1-A: after 36 normal attacks → enemy Hacked DoT 52.24/1s/5s    | FAITHFUL    | `hitCount:36` (rounds; AR hitsPerShot 1) → `targetStatus 'Hacked' 5s` + `dot 52.24 sustained 1s/5s`; K2 proves it is the dominant DoT source |
| S1-B: on burst cast → all enemies Hacked DoT 52.24/1s/5s        | FAITHFUL    | `burstCast` (own cast, NOT `fullBurstEnter`); K3 proves removing it drops ticks by exactly 5 per burst                                  |
| S2: in FB, after 36 hits, while Hacked → enemy 86.17% addl dmg  | FAITHFUL    | `hitCount:36` + `fbGate inFb` + `requiresTargetStatus 'Hacked'` + `flatDamage 86.17`; crit-eligible rider, never cores; all 3 gates load-bearing (K5) |
| Burst: burstCast → all enemies Damage Taken ▲18.06%/10s         | FAITHFUL    | `damageTakenPct` on the boss (Taken bucket, team-wide); NO damage; K1 proves one buff per cast (value 18.06, 600f) and that removing it lowers all 4 units' totals |

No `ignored` blocks; `unmodeled` is empty for all three slots (every kit line is modeled).

## Cross-family corroboration

Driver model family: **Qwen**. Because the driver is Qwen and every blind/reviewer role ran on a
different family, the convergence below is cross-family (stronger than same-model agreement).

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 4 load-bearing lines
  FAITHFUL. CONVERGED with the driver encoding on every decision — `hitCount:36` rounds, `burstCast`
  (explicitly NOT `fullBurstEnter`), `fbGate inFb` + `requiresTargetStatus 'Hacked'` both load-bearing,
  `damageTakenPct` boss debuff with `casterIdx/targetIdx null`. Raised two honest measurement-gated
  flags (DoT re-application stacking; S2 counter cumulative-vs-per-FB) — folded into the override note
  as residual ⚑s.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the identical
  encoding (hitCount:36 / burstCast / fbGate inFb / requiresTargetStatus 'Hacked' / damageTakenPct
  18.06-10s / dot 52.24-1s-5s-sustained / enemy targets). Out-of-box vs the driver override: **13 pass
  / 2 fail / 2 skip (17).** Both failures are **RECON_ERRORs in the blind test itself, not encoding
  defects**: (A) the blind `run()` helper wires `onEvent` at the TOP LEVEL of the `runComp` argument
  instead of inside `cfg`, so its event log is empty and every event-count assertion reads 0 — a
  correctly-wired probe of the SAME fixture finds 6 `damageTakenPct` applies on 6 kurumi casts; (B) the
  blind fixture `controlComp('kurumi')` seats TWO Burst-I units (liter + kurumi), so DoT-tick gauge
  feed shifts B1 slot contention and perturbs teammate totals ~0.04%, violating the blind's
  byte-identity assumption (a faithful engine interaction). The 2 skips are measurement-gated (exact
  Hacked window length; hits-landed-vs-fired with no miss model).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on every load-bearing
  decision — skill1 = two blocks (hitCount:36 + burstCast) each [targetStatus 'Hacked' 5s, dot
  52.24/1s/5s sustained]; skill2 = hitCount:36 + fbGate inFb + requiresTargetStatus 'Hacked' +
  flatDamage 86.17; burst = burstCast + damageTakenPct 18.06/10s on enemy. The ONLY encoding delta: the
  blind sets `crit:true` explicitly on the S2 flatDamage while the driver relies on the engine's
  rider-crit default (RIDER_CRIT) — behaviorally IDENTICAL (both crit-eligible, never core). Blind ⚑s
  match the driver's.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  All 4 lines FAITHFUL, zero silent drops. The judge independently verified each of the 2 blind reds is
  a RECON_ERROR (harness miswiring / two-B1 byte-identity coupling) with hard evidence, not a
  behavioural divergence, and noted the driver-Qwen / blinds-Claude agreement is cross-family. Ruled
  the masked `requiresTargetStatus`-gate-removal case (inert in the driver fixture because burstCast
  keeps Hacked up through most FB windows) correctly re-routed through status-APPLICATION removal, which
  cleanly zeroes S2. "What must change for GO: nothing."

## Residual flags (owner spot-check cluster — all documented ⚑s, none blocking)

1. **DoT re-application stacking:** S1-A re-fires every 36 rounds (~3s of AR fire) with a 5s duration,
   so the engine appends OVERLAPPING independent DoT instances. Whether in-game Hacked REFRESHES (one
   live instance) or STACKS (multiplying) is kit-silent — the engine-native independent-instance reading
   is shipped. Both blinds and the driver share this reading, so agreement here proves nothing; a Hacked
   popup-count in an overlap window settles it (2 ticks/s = stack, 1 tick/s = refresh).
2. **Hacked status window = 5s (inferred):** the kit names the status but states no independent duration
   — only the DoT's "for 5 sec". The minimal faithful read co-terminates the status with the DoT. If the
   real status outlives the DoT, S2's gate opens wider and S2 is under-credited. Pin from footage.
3. **S2 counter = cumulative-with-gate (assumption):** the 36-hit counter is read as accruing across the
   whole fight with the FB + Hacked gates checked at fire time (engine-native default). Whether the real
   counter resets per Full Burst is a prose ambiguity; note as assumption, not measured.
4. **Cadence tuple (ammo 60 / reloadFrames 81 / AR pulls-per-sec):** datamine-sourced and known-unreliable;
   it drives how often the 36-hit threshold is reached, so it gates both S1 and S2 proc counts roughly
   linearly. Read the ammo counter frame-by-frame from a recording to pin shots/sec directly.
5. **S2 proc COUNT (25 in the driver fixture) is timing-sensitive** (a 36-hit multiple must land inside a
   FB window while Hacked is up) and is not footage-pinned; the magnitude (86.17) and the three gate
   encodings are faithful to prose.
