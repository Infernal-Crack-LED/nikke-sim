# NIKKE Machine Gun — fire-rate model for damage sim

Empirically derived from three 60 fps screen recordings (R-rarity MG, Cinderella: Crystal Wave, Crown), six full 300-round magazines. All six produced the **identical** frame-interval sequence, so wind-up is treated as a weapon-class constant, not a per-unit stat.

Measurement method: the on-screen cumulative damage counter increments exactly once per landed round and updates on the engine's frame grid. Counting frames with a nonzero damage delta yields exact shot timestamps. Validation: 599/600 and 598/600 events across the mag pairs (the shortfall is 1–2 frames where two rounds landed in the same frame).

---

## 1. Core constants

```
FPS_SIM        = 60          // engine tick; ROF is frame-quantized
MAG_SIZE       = 300         // rounds, base (before Max Ammo)
ROF_MAX        = 60          // rounds/sec == 1 round per frame
RAMP_FRAMES    = 142         // 2.3667 s from first bullet to max ROF
RAMP_ROUNDS    = 35          // rounds fired during (and including) the ramp
MAG_FRAMES     = 407         // 6.7833 s to empty a 300-round mag from cold
```

Derivation: `MAG_FRAMES = RAMP_FRAMES + (MAG_SIZE - RAMP_ROUNDS) = 142 + 265 = 407`.

Reload is **not** part of this model and does vary per unit. Measured gap from last bullet of mag N to first bullet of mag N+1 (includes reload animation + target reacquisition):

| Unit | Measured gap |
|---|---|
| R-rarity MG | 3.02 s |
| Cinderella: Crystal Wave | 2.85 s |
| Crown | 2.85 s |

Treat reload as a separate per-unit stat modified by Reload Speed. Reload Speed does **not** shorten the wind-up ladder itself — but it shortens the idle time between magazines, which under the §7 wind-down model determines how much spin carries over.

---

## 2. The ramp — ground truth

The gun fires on a fixed ladder of frame intervals. Shot 1 is the reference (t = 0).

**Interval ladder (frames between consecutive shots, shots 1→35):**

```
23, 14, 10, 8, 7, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 3, 3,
2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
```
(= 11 descending intervals, then 6×3, then 17×2 — sums to 142 frames.)

From shot 35 onward the interval is **1 frame** for every remaining round.

**Absolute shot schedule (frame index, 0 = first bullet):**

| Shot | Frame | Shot | Frame | Shot | Frame | Shot | Frame |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 11 | 86 | 21 | 114 | 31 | 134 |
| 2 | 23 | 12 | 90 | 22 | 116 | 32 | 136 |
| 3 | 37 | 13 | 93 | 23 | 118 | 33 | 138 |
| 4 | 47 | 14 | 96 | 24 | 120 | 34 | 140 |
| 5 | 55 | 15 | 99 | 25 | 122 | 35 | 142 |
| 6 | 62 | 16 | 102 | 26 | 124 | 36+ | 142 + (n − 35) |
| 7 | 68 | 17 | 105 | 27 | 126 | … | … |
| 8 | 73 | 18 | 108 | 28 | 128 | 300 | 407 |
| 9 | 78 | 19 | 110 | 29 | 130 | | |
| 10 | 82 | 20 | 112 | 30 | 132 | | |

This table **is** the model. Use it directly — do not fit a curve if you need exactness.

---

## 3. Closed-form approximation (if you need a continuous model)

The underlying rate is exponential, floored to the frame grid. Fitting cumulative round count over the ramp (RMS error 0.43 rounds):

```
ROF(t) ≈ min(60, 4.35 · e^(1.181 · t))     // t in seconds since first bullet
```

- Doubling time ≈ 0.59 s
- Uncapped ROF crosses 60/s at t ≈ 2.22 s (vs. observed frame-quantized 2.367 s)

Cumulative rounds:

```
N(t) = (a/b)·(e^(b·t) − 1)                     for t < t_c
N(t) = (a/b)·(e^(b·t_c) − 1) + 60·(t − t_c)    for t ≥ t_c
where a = 4.35, b = 1.181, t_c = ln(60/a)/b ≈ 2.22
```

Prefer the discrete ladder in §2 for a sim. Use this only for analytic DPS derivations.

---

## 4. Reference implementation (TypeScript)

```ts
export const MG = {
  fps: 60,
  magSize: 300,
  rofMax: 60,
  rampFrames: 142,
  rampRounds: 35,
  /** frames between shot i and shot i+1, for i = 1..34 (1-indexed shots) */
  rampIntervals: [
    23, 14, 10, 8, 7, 6, 5, 5, 4, 4, 4,
    3, 3, 3, 3, 3, 3,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  ] as const,
} as const;

/** Absolute frame offsets of every shot in one magazine, relative to first bullet. */
export function shotFrames(magSize: number = MG.magSize): number[] {
  const out: number[] = [0];
  let f = 0;
  for (const iv of MG.rampIntervals) {
    if (out.length >= magSize) return out;
    f += iv;
    out.push(f);
  }
  // steady state: 1 round per frame
  while (out.length < magSize) out.push(++f);
  return out;
}

/** Frames to empty a magazine from a cold start. */
export function magDurationFrames(magSize: number = MG.magSize): number {
  return magSize <= MG.rampRounds
    ? shotFrames(magSize).at(-1)!
    : MG.rampFrames + (magSize - MG.rampRounds);
}

/** Instantaneous ROF (rounds/sec) at frame f since first bullet. */
export function rofAtFrame(f: number): number {
  const frames = shotFrames();
  if (f >= MG.rampFrames) return MG.rofMax;
  for (let i = frames.length - 1; i > 0; i--) {
    if (frames[i] <= f) return MG.fps / (frames[i] - frames[i - 1]);
  }
  return 0;
}
```

**Full-cycle scheduling.** A firing cycle is `magDurationFrames(magSize)` + `reloadFrames(unit)`. ~~Wind-up resets to zero on every reload — the gun always restarts from the top of the ladder. There is no partial retention.~~ **Superseded 2026-07-13:** full reset is only the long-idle limit of the wind-DOWN model in §7 — it holds whenever the gun idles ≥ ~1.1s (true for every unbuffed reload, which is what these captures measured), but short idles retain partial spin.

```ts
function* cycleShotFrames(magSize: number, reloadFrames: number, cycles: number) {
  const period = magDurationFrames(magSize) + reloadFrames;
  const base = shotFrames(magSize);
  for (let c = 0; c < cycles; c++) for (const f of base) yield c * period + f;
}
```

---

## 5. Derived DPS numbers

With `d` = damage per round (post-crit-expectation), base 300-round mag:

```
DPS_theoretical  = 60 · d                                  // if wind-up ignored
DPS_no_reload    = 300 · d / 6.7833 s  = 44.23 · d         // wind-up only  (−26.3%)
DPS_full_cycle   = 300 · d / (6.7833 + reload_s)
```

Example at reload = 2.85 s: `DPS_full_cycle = 300·d / 9.633 = 31.14 · d` — i.e. **48.1 %** of the naive 60/s figure. The wind-up alone costs the equivalent of ~1.78 s of max-rate fire per magazine (107 rounds' worth).

**Max Ammo scaling is superlinear.** Every extra round is fired at the full 60/s rate, so wind-up overhead amortizes:

| Mag size | Frames to empty | Effective ROF |
|---|---|---|
| 300 | 407 | 44.2 /s |
| 360 (+20 %) | 467 | 46.3 /s |
| 450 (+50 %) | 557 | 48.5 /s |
| 600 (+100 %) | 707 | 50.9 /s |

Similarly, Bastion / Wingman (more shots per reload) beat Resilience (faster reload) for MGs, because Resilience shortens the reload but never the wind-up.

---

## 6. Caveats and open items

1. **30 fps.** ROF is frame-quantized, so at 30 fps the steady-state cap halves to 30/s and the ladder's frame counts presumably map differently. This model is **60 fps only**. Do not use it for PvP or Coop, which are capped at 30 fps.
2. **`Min Firing Rounds Adjustment`** (in-game setting) decouples MG fire-rate calculation from FPS. State of this toggle during capture is unknown — flag it as an assumption. It is also required for attack-speed buffs to apply consistently.
3. **Stale community figures.** Widely-cited numbers (3.75 s wind-up, 45 rounds, 8 s to empty) do **not** match current behaviour. Measurements here supersede them for the current patch, but re-verify after balance updates.
4. **Attack-speed buffs** were not isolated in these captures. If a unit or teammate grants attack speed, the ladder may compress — untested.
5. **Damage per round is not constant** across a fight (buff stacking observed: 4,614 → 9,228 → 9,993 per round in one capture; crits are a clean ×1.25 on top). Model damage separately from the shot schedule; the schedule itself is buff-independent in these captures.
6. Reload gaps in §1 include target reacquisition, so they are an **upper bound** on true reload time (likely ~0.3–0.5 s high vs. the raw stat).

---

## 7. Wind-DOWN — spin retention across short idles (added 2026-07-13)

The §4 "hard reset on every reload" rule and the community ">100% reload buff = wind-up
skip" rule are both limits of one continuous mechanism: **while the gun is not firing
(reload, stun, boss-unhittable window), the spin holds for a short grace period and then
decays back down the §2 ladder — faster than it climbed.** On resume, the gun re-enters
the ladder wherever the decay left it.

### 7.1 The model

```
idle          = consecutive non-firing frames (reload + stun + unhittable)
GRACE         = 16 frames  (~0.27 s)   // spin holds, no decay
DECAY         = 2.78                   // ladder-frames lost per idle frame past GRACE
pos_retained  = max(0, pos_at_stop − DECAY · max(0, idle − GRACE))
```

where `pos` is the cumulative-frame position on the §2 ladder (0…142). Full decay from the
top takes `GRACE + 142/DECAY ≈ 67 frames ≈ 1.1 s` of idle.

### 7.2 The fit — four independent observations, one line

The two quantitative points are ore-game's recovery measurements
(https://ore-game.com/nikke/post/verify-mg-heatup/), converted from reload-buff % to idle
time via the subtractive reload formula `actual = displayed × 0.975 × (1 − buff) + 0.21 s`
(https://ore-game.com/nikke/post/reload-limit/), using a Crown-class 2.85 s displayed
reload. "Benefit" = rounds of max-rate fire recovered vs a cold restart (max ≈ 107).

| Observation | Idle time | Model retains | Model benefit | Observed |
|---|---|---|---|---|
| >100% reload buff (our measured "skip") | ~0.21 s | 142f (in grace) | ~107 rounds | full skip |
| 90% reload buff (ore-game) | ~0.49 s | 106f → round 16 | ~90 rounds | ~90 rounds |
| 74% reload buff (ore-game) | ~0.93 s | 31f → round 1 | ~30 rounds | ~30 rounds |
| ≤70% reload buff (ore-game threshold) | ≥1.04 s | ≤13f → round 0 | ≤13 rounds | ~none |

Both boundary "rules" fall out naturally: above +100% reload speed only the fixed ~0.21 s
reload tail remains, which sits inside the grace window (→ apparent binary skip, which is
what our original measurement found); below ~70% the idle exceeds full decay (→ apparent
hard reset, which is what §4's captures at 0% buff measured).

### 7.3 Consequences

- The middle band (roughly +70–100% reload speed) is where MGs partially keep their spin —
  rare under scope lock (no cubes, Base 5 gear) but reachable with kit reload buffs, which is why
  neither original measurement sampled it.
- Because the decay retraces the ladder, retention benefit is nonlinear in idle time: the
  cheap 2-frame-interval top of the ladder drains first (little loss per idle frame), the
  expensive 23/14/10-frame bottom drains last.
- The 1 s boss-unhittable windows (range transitions) cost `2.78 × (60−16) ≈ 122` ladder
  frames — a near-full re-windup even though no reload happened.
- Engine: `MG_WINDDOWN_GRACE_FRAMES`, `MG_WINDDOWN_DECAY`, `mgIdleFrames` in
  `src/engine/sim.ts`; reload duration via `reloadFramesNeeded()` (subtractive).

### 7.4 Confidence

The GRACE/DECAY constants are a two-parameter linear fit through two measured points with
two boundary constraints — the functional form (linear ladder retrace after a grace) is the
simplest one consistent with all four, not itself frame-measured. A recording of an MG with
a +70–100% reload buff would pin the curve directly; deviations would show up as the resume
round differing from §7.1's prediction.
