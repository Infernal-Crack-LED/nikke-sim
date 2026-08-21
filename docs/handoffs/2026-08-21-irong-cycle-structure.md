# iron sweep (run G) cycle-structure findings + ammo-counter check (2026-08-21)

**Status: OPEN** — the footage check below is partial (one full gap read cleanly). Created
2026-08-21 after the fill-trace re-run (probe-runs.md 2026-08-21 entry) localized the run-G
full-burst-count miss (sim 12 vs measured 13–14) to cycle STRUCTURE: with the credit schedule
endpoint-exact, the sim's refill-window generation rate is at parity with the video (rho 0.974),
so the miss lives in window timing, not gauge magnitude.

**Instruments (all committed):**

- `npx tsx scripts/battery/interburst-window-dump.ts "iron sweep (run G)"` — per-0.5s bucket
  anatomy of every inter-FB window (gauge per unit per bucket, casts, debuff applications,
  reloads, bar-full instant). Runs the comp in the FOOTAGE slot order
  (d-killer-wife · milk-blooming-bunny · maxwell · takina · liberalio — maxwell focused),
  deterministic EV. Gauge numbers come from the endpoint-exact credit schedule (2026-08-21
  builder fix). ⚠ Slow: ~6 min (creditScheduleFor cost).
- Video side: `docs/probe-data/tempo-cycle-u8-g-iron-sweep.json` (scan.ts cycle table) for
  full-burst windows + chain stage timestamps in video time; ammo labels read by eye off
  extracted frames (see "HUD notes" — read-ammo.ts reads 0 frames on this HUD).

## Sim side — the numbers

Weapon cadence (all five SR, from data/characters.json): ammo 6, reloadFrames 141 (2.35s).
chargeFrames: 60 (1.00s) for d-killer-wife / milk-blooming-bunny / maxwell / takina, 90 (1.50s)
for liberalio. Maxwell is the camera focus (×2.5 charge-gauge bonus: 14.0/pull vs 5.6).

Gauge decode per credit: +5.6 = one uncharged SR shot / one applicationGauge credit;
MAX +14.0 = focused full charge; LIB +33.6 = one pull (shot 5.6 + gaugeHits:5 rider 5×5.6).

**Inter-FB spans (s), FB-end → next FB-start, in fight order:**
4.50 · 5.37 · 4.63 · 3.68 · 4.82 · 3.97 · 5.90 · 4.13 · 4.50 · 4.00 · 5.93 · 3.57 (last is the
truncated tail — the 13th fill completes at t=179.6s, B1 would cast at 180.1s, 8 frames past the
fight end; that is the missing 13th Full Burst).

Sim FB-end times (fight s): 15.00, 29.50, 44.87, 59.50, 73.18, 88.00, 101.97, 117.87, 132.00,
146.50, 160.50, 176.43. Chain-to-chain late-fight ≈ 16.0s vs the measured real period 14.388s.

### Shortest complete window — 3.68s (FB end 59.50 → FB start 63.18)

| bucket    | gauge | by unit                             | events                                        |
| --------- | ----- | ----------------------------------- | --------------------------------------------- |
| +0.0–0.5s | +30.8 | DKW 5.6, MBB 5.6, MAX 14.0, TAK 5.6 | FB ends                                       |
| +0.5–1.0s | +5.6  | TAK 5.6                             | TAK S2 debuff applies (+5.6 applicationGauge) |
| +1.0–1.5s | +39.2 | TAK 5.6, LIB 33.6                   |                                               |
| +1.5–2.0s | +25.2 | DKW 5.6, MBB 5.6, MAX 14.0          | BAR FULL → chain opens                        |
| +2.0–2.5s | —     |                                     | B1 DKW                                        |
| +2.5–3.0s | —     |                                     | B2 TAK                                        |
| +3.0–3.5s | —     |                                     | B3 MBB                                        |

Refill 1.9s. No reloads inside the refill.

### Longest window — 5.93s (FB end 160.50 → FB start 166.43)

| bucket    | gauge | by unit                    | events                                 |
| --------- | ----- | -------------------------- | -------------------------------------- |
| +0.0–0.5s | +5.6  | TAK 5.6                    | FB ends                                |
| +1.0–1.5s | +44.8 | DKW 5.6, MBB 5.6, LIB 33.6 | MAX reload starts (completes +1.0–1.5) |
| +1.5–2.0s | +5.6  | TAK 5.6                    |                                        |
| +2.5–3.0s | +25.2 | MBB 5.6, MAX 14.0, TAK 5.6 |                                        |
| +3.5–4.0s | +5.6  | MBB 5.6                    | LIB + DKW reloads complete here        |
| +4.0–4.5s | +14.0 | MAX 14.0                   | BAR FULL → chain opens                 |
| +4.5–5.0s | —     |                            | TAK S2 debuff (locked); B1 DKW         |
| +5.0–5.5s | —     |                            | B2 TAK                                 |
| +5.5–5.9s | —     |                            | B3 MAX                                 |

Refill 4.4s. Empty buckets are reload dead time.

### Reload overlap per window (s of reload inside the window; one reload = 2.35s)

| window        | 0    | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    | 9    | 10   | 11   |
| ------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| span (s)      | 4.50 | 5.37 | 4.63 | 3.68 | 4.82 | 3.97 | 5.90 | 4.13 | 4.50 | 4.00 | 5.93 | 3.57 |
| d-killer-wife | 0.70 | 2.35 | 0    | 0.58 | 2.35 | 0    | 0.47 | 2.35 | 0    | 0    | 2.35 | 0    |
| milk-bb       | 1.00 | 1.75 | 0    | 1.73 | 2.02 | 0    | 2.35 | 0    | 0.37 | 2.35 | 0    | 0    |
| maxwell       | 0    | 2.35 | 0    | 1.75 | 1.50 | 1.87 | 0.38 | 1.87 | 0.38 | 0.93 | 1.32 | 0    |
| takina        | 0    | 0    | 0    | 0    | 0    | 0    | 0    | 0    | 0    | 0    | 0    | 0    |
| liberalio     | 0    | 2.35 | 1.25 | 0    | 0    | 1.20 | 2.35 | 0    | 0    | 0.23 | 2.35 | 0    |
| **total**     | 1.70 | 8.80 | 1.25 | 4.06 | 5.87 | 3.07 | 5.55 | 4.22 | 0.75 | 3.28 | 6.02 | 0    |

**The three longest complete windows (w1 5.37s, w6 5.90s, w10 5.93s) stack 5.6–8.8s of combined
reload dead time** — the short windows have ≤ 1.7s. The fill stretches exactly when reloads
cluster inside it. Liberalio's magazine cycle is near-metronomic: 6 shots × 1.5s + 2.35s reload
≈ 11.4s, vs the ~14.4s real cycle — slightly off-commensurate, so the reload phase drifts slowly
and lands inside the refill every other cycle or so. **takina never reloads at all** — her burst
swap hands her base SR a full magazine back each cycle (999-mag swap on entry), and the ~4.4s
refill is only 4–5 shots, so her mag never empties.

Sim reload-completion times (fight s):
liberalio: 11.62 23.12 34.62 46.12 57.62 69.12 81.62 93.12 104.62 117.12 128.62 140.12 152.62
164.12 175.62 (gaps ≈ 11.5s, metronomic)
maxwell: 10.05 23.98 34.15 44.05 53.62 63.78 74.68 82.28 92.45 102.35 112.32 122.48 132.38
140.62 151.92 161.82 170.78 (irregular — she bursts on alternating chains, interrupting cadence)
d-killer-wife: 10.45 21.15 31.85 43.55 54.25 64.95 76.65 87.35 98.05 109.75 120.45 131.15 141.85
153.55 164.25 174.95 (metronomic ≈ 10.7s)
milk-blooming-bunny: 10.30 20.85 31.25 42.70 53.30 63.80 75.20 85.70 96.25 106.75 117.38 127.93
138.48 149.93 160.33 170.93 (≈ 10.5s, drifting later than DKW by design of her B3 bursts)

## Video side — anchoring (tempo-cycle fixture, video seconds)

FB windows: #1 13.67–22.07 · #2 27.05–35.70 · #3 41.02–50.42 · #4 55.27–63.95 · #5 69.73–77.97 ·
#6 83.55–92.25 · #7 98.88–107.53 · #8 113.52–122.22 · #9 127.75–136.48 · #10 141.97–150.92 ·
#11 156.12–164.37 · #12 169.50–178.12 · #13 186.20–190.45 (truncated, fight end).
Real cycle period (FB-start to FB-start) ≈ 13.4–15.3s, mean 14.388s.
Chain stage times (video s) live in the fixture's `burstChains` (stage1/2/3 per chain).

Video↔fight offset at FB#1 ≈ 8.67s (video 13.67 = sim FB#1 start 5.00); the sim drifts ~5.6s
late by FB#12 (that drift IS the finding). Compare within a cycle, anchored at the FB end —
never by absolute time.

## HUD notes (for future ammo reads on this recording)

- This HUD renders a small text ammo label `≡ N/6` above each bottom-bar portrait (the
  "text-label HUD" `read-ammo.ts` cannot lock — 1/300 frames on this video).
- Labels are readable by eye at native res with crop y≈1005–1065. Positions (orig px, 2622×1206
  video): DKW ~1050, MBB ~1200, TAK ~1440–1470, LIB ~1620–1665. **The focused unit's (maxwell)
  label is occluded by her own raised portrait** — her mag state is not directly readable; only a
  `RELOADING` banner at her position would show (none seen in the gap read).
- A reloading unit's label becomes a `RELOADING` text + progress bar.
- **takina's burst-swap magazine renders as `N/99`** (her maxAmmo-999 swap, 2-digit field) — a
  free swap-window read: the counter decrements at her swap cadence (~1.2 pulls/s) and the flip
  back to `6/6` marks the swap's end.

## Ammo-counter check — gap after FB#2 (video 35.70 → 41.02, 5.32s) vs sim window 1 (5.37s)

Read off frames at 4fps (extraction: `ffmpeg -ss <t> -i "docs/probes/u8/u8 g vid.mov"
-frames:v 1 -vf "crop=850:60:950:1005,scale=iw*2:ih*2"`).

| video t              | DKW       | MBB        | TAK                          | LIB |
| -------------------- | --------- | ---------- | ---------------------------- | --- |
| 35.8 (+0.1)          | 2/6       | 2/6        | 81/99 (swap)                 | 5/6 |
| 36.6 (+0.9)          | 2/6       | 2/6        | 80/99 (swap)                 | 5/6 |
| 37.4–38.2 (+1.7–2.5) | 1/6       | 1/6        | 6/6 (swap ended ~36.7) → 5/6 | 4/6 |
| 39.0–39.8 (+3.3–4.1) | RELOADING | RELOADING  | 4/6                          | 3/6 |
| 40.6–41.0 (+4.9–5.3) | RELOADING | 6/6 (done) | B2 cast 40.17 → swap 98/99   | 2/6 |

Sim window 1 (fight 29.50 → 34.87) predicted: MBB reload completes +1.5–2.0, DKW +2.0–2.5,
maxwell +4.65 (in chain), liberalio +5.0–5.4 (in chain); takina's swap ends right AT the FB end.

**Mismatches found:**

1. **MBB/DKW reload phasing is ~2–3s later in the video.** The sim empties their magazines right
   at the FB end (reloads complete +1.5–2.5 into the refill); in the video they empty ~+2.7 and
   reload +3.0 → +5.3 (late refill into the chain). Same comp, same cadence data — the sim's mag
   phase runs ahead of the real fight's.
2. **takina's swap tail extends ~1.0s into the refill in the video** (ends ~36.7, i.e. +1.0);
   the sim's ends essentially at the FB end. (Her swap shots generate no gauge either way — a
   real weapon change — so this moves her base-SR contribution, not a gauge source.)
3. liberalio fires straight through the refill (5/6 → 2/6, ~1.6s/shot, no reload) — matches the
   sim for this window (her reload lands in the chain in both).

## Ammo-counter check — gap after FB#11 (video 164.37 → 169.50, 5.13s) vs sim window 10 (4.00s)

Same method, 4fps. Bar fills ~168.1 (chain stage-1 hexagon, fixture `burstChains[12]`), takina's
B2 cast 168.65, FB#12 starts 169.50.

| video t                | DKW       | MBB                 | TAK                     | LIB             |
| ---------------------- | --------- | ------------------- | ----------------------- | --------------- |
| 164.2–165.0 (+0.0–0.6) | 3/6       | 6/6 (just reloaded) | 77/99 → 75/99 (swap)    | 3/6             |
| 165.2–166.7 (+0.8–2.3) | 2/6       | 5/6                 | 6/6 (swap ended ~165.1) | 3/6 → 2/6       |
| 167.0–167.9 (+2.6–3.6) | 1/6 → 0/6 | 4/6 → 3/6           | 5/6 → 4/6               | 2/6 → 1/6       |
| 168.2–168.9 (+3.8–4.6) | RELOADING | 3/6                 | 4/6                     | 1/6 → RELOADING |
| 169.0–169.5 (+4.6–5.1) | RELOADING | 3/6 → 2/6           | 99/99 (B2 cast → swap)  | RELOADING       |

**Replications and what they mean:**

1. **takina's swap tail replicates**: swap ends +0.7s into the refill here (was +1.0s in gap
   2→3). Both reads also show her swap cadence directly (81→80 and 77→75 over ~1s ≈ the modeled
   1.2 pulls/s) and her swap mag rendering as `N/99`.
2. **liberalio never reloads mid-refill in EITHER observed real gap** — she empties at +4.3s here
   (after the bar filled at +3.7) and her reload runs inside the chain. The sim's metronome
   (full reload inside refill windows 1/6/10) does not match the real phasing; the real fight
   clusters reloads at/after bar-fill, where they cost no generation time.
3. **DKW's reload straddles the real fill** (0/6 at +3.6, bar full +3.7) — even in the real fight
   a late reload can cost refill time, but it costs ~0.1–0.3s there, not the 2.35s full-reload
   stalls the sim schedules inside windows 1/6/10.
4. Sim window 10 predicted liberalio's reload starting at +3.77 (0.23s overlap) — close to the
   real +4.3; the sim's w10 is NOT one of the pathological ones. The mismatch is concentrated in
   the sim's w1/w6 (and the w11 4.07s stretch).

**Net:** the sim's gauge SOURCES and per-window totals are right (fill-trace parity), but its
magazine phasing against the burst cycle drifts from the real fight's — real reloads fall
at/after the fill, sim reloads fall inside the refill, and that is what stretches the sim's
late-fight windows (w11 refill 4.07s vs real ~2.0–2.5s typical). The one-frame-level suspect list:
(a) cadence tuples (chargeFrames/reloadFrames are datamined, ⚑ per the usual), (b) the sim
unlocking generation exactly at FB-end while the real refill visibly starts after the ~1.3s
drain + paint — shots still consume ammo during the drain, so real mags enter the refill one
shot emptier than the sim's; (c) FB cadence phasing of who bursts (maxwell/mbb alternating B3
changes who fires when).

**Settled by this check:** the MBB/DKW phase offset is REAL and replicates (not a one-window
fluke); takina's swap tail is REAL (~0.7–1.0s, both gaps) and her swap cadence matches the model.

**Still open:** whether (a)/(b)/(c) above, enacted, close the sim's 12 vs measured 13–14 FB count
— that is an enactment question for a `/scientific-method` pass, not this doc. Maxwell's mag
state stays unreadable on this HUD (occluded label).
