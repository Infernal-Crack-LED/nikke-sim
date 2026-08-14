// FULL-BURST-COUNT MATRIX — every graded comp whose sim full-burst count is off its measured
// truth, decomposed into the quantities that decide that count.
//
//   npx tsx scripts/battery/fb-count-matrix.ts            # table
//   npx tsx scripts/battery/fb-count-matrix.ts --json     # machine-readable
//
// WHY: as of 2026-08-13 the sim's burst CYCLE is measured ~1.65s/cycle slower than the game's
// (docs/probe-runs.md), and the whole gap sits in the gauge-refill window — the cast ladder is
// frame-exact. This table is the per-team view of that window: who generates the gauge, how fast,
// how long a bar therefore takes, and where in the cycle the 180s fight actually stops. A team can
// be off by one Full Burst either because its refill is too slow OR because the fight ends just
// short of a burst it would otherwise have reached, and those two look identical in a count alone.
//
// SOURCES — everything here is read from the engine's own exposed results; nothing is re-derived:
//   * `u.gaugeGenerated`  uncapped per-unit gauge fed to the bar, pre-100-clamp (sim.ts:1475)
//   * `gaugeBuildTimeSec` frames where stage===0 && !fbActive && gauge<100, i.e. exactly the
//                         REFILLING time — not wall-clock, and not time spent sitting at full
//                         (sim.ts:3347). Dividing the first by the second gives a true generation
//                         rate rather than a fight-average diluted by the ~60% of the fight that
//                         is Full Burst + chain, when generation is locked.
//   * `rotationLog`       the cast/Full-Burst timeline, for the per-cycle refills and end state.
//
// ROSTERS ARE READ FROM `scripts/experiment.ts`, never retyped here — the lab is authoritative for
// comp definitions, and slot order matters because it sets the camera focus, which sets the x2.5
// charge-gauge bonus. (Two rosters were wrong when this file's first draft transcribed them by
// hand; `resolve()` throws rather than silently simming a team nobody recorded.) The single
// deliberate exception is documented at its call site.

import { readFileSync } from 'node:fs';

import type { SimResult } from '../../src/engine/sim.js';
import type { DataFile, SimEvent } from '../../src/types.js';
import { COMPS, run } from '../experiment.js';

const data: DataFile = JSON.parse(
  readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8')
);

const FIGHT_SEC = 180;
/** gauge-full -> B1 cast (`PRE_B1_GAP_FRAMES`, 30f). Subtracted to recover the refill's true end. */
const PRE_B1_SEC = 0.5;

type Status = 'disabled' | 'pinned-to-sim' | 'unpinned' | 'omitted';

interface OffComp {
  /** label used in the report */
  name: string;
  /** EXACT comp name in scripts/experiment.ts — the roster is READ from there, never retyped.
   *  Transcribing rosters by hand is a P0 slug hazard (two were wrong on the first draft of this
   *  file), so the only roster literal permitted below is the deliberate run-G footage override. */
  from: string;
  /** deliberate roster override, with the reason — used ONLY where the recorded team differs */
  slugsOverride?: string[];
  focusOverride?: string;
  /** measured truth (video-counted) */
  measured: number | [number, number];
  /** filmed steady-state cycle period, where one exists (docs/probe-runs.md 2026-08-13). Only these
   *  comps can be converted into a generation requirement — the rest have no measured cycle. */
  measuredPeriodSec?: number;
  /** how the gate currently absorbs the divergence */
  status: Status;
  note: string;
}

// Every comp known to be off its measured full-burst count. The first four are the `disabled: true`
// set; the rest are off by exactly the same class of error but were absorbed by pinning the sim's
// count or dropping the assertion, which is why "only 4 comps are affected" understates it.
const OFF: OffComp[] = [
  {
    name: 'iron sweep (run G)',
    from: 'PG iron sweep (boss Electric)',
    // The ONLY roster literal in this file, and it is deliberate: the regression comp stores the
    // slot order of run 1 (its damage basis) but its full-burst count comes from a RE-RUN with a
    // different slot order (docs/probes/u8/u8 g dmg.png). Slot order sets the camera focus, so the
    // recorded fight focused `maxwell` (SR/Iron), not the comp's `milk-blooming-bunny` (SR/Iron).
    slugsOverride: [
      'd-killer-wife',
      'milk-blooming-bunny',
      'maxwell',
      'takina',
      'liberalio',
    ],
    measured: [13, 14],
    measuredPeriodSec: 14.388,
    status: 'disabled',
    note: 'FOOTAGE slot order, not the regression roster. CV re-scan 2026-08-13 reads 13.',
  },
  {
    name: 'T5 wind-weak',
    from: 'T5 wind-weak probe (boss Iron)',
    measured: 13,
    measuredPeriodSec: 13.808,
    status: 'disabled',
    note: '13/13 splash-counted, caster order exact; in the scanner labeled 8/8 set. Real cycle measured 13.808s vs sim 15.457s.',
  },
  {
    name: 'T1 wind-weak',
    from: 'T1 wind-weak (boss Iron)',
    measured: 13,
    status: 'disabled',
    note: 'recording had scarlet-black-shadow middle-slot; sim predicts 13 either way (verified 2026-07-14).',
  },
  {
    name: 'N3 scarlet/liberalio iron',
    from: 'N3 scarlet/liberalio iron (boss Iron)',
    measured: 10,
    status: 'disabled',
    note: 'seats soda-twinkling-bunny, the one fullBurstExtend carrier in the disabled set (+5s on stage-3 entry).',
  },
  {
    name: 'misc B3s (run I order)',
    from: 'PI2 misc B3s RERUN w/ video (boss Water)',
    measured: 13,
    status: 'pinned-to-sim',
    note: 'LIBERALIO-FREE. simFullBursts:12 pin — the gate stays green and prints KNOWN SHORTFALL.',
  },
  {
    name: 'N1 rapi/quency wind',
    from: 'N1 rapi/quency wind (boss Wind)',
    measured: 13,
    status: 'unpinned',
    note: 'LIBERALIO-FREE. Assertion commented out 2026-07-22 when jill\u2019s kit-faithful reload removed the one marginal seed that had been passing.',
  },
  {
    name: 'soda-tb control (neutral)',
    from: 'soda-tb control (neutral, focus soda-twinkling-bunny)',
    measured: 10,
    status: 'unpinned',
    note: 'LIBERALIO-FREE, 4 units. Measured off the on-screen Full-Burst countdown. soda-twinkling-bunny extends her own Full Burst (+2/+5 ladder), so cycles run longer than 10s.',
  },
  {
    name: 'N2 modernia wind',
    from: 'N2 modernia wind (boss Wind)',
    measured: 10,
    status: 'omitted',
    note: 'LIBERALIO-FREE. Recorded as real >=10 vs sim 8 — the largest known under-count.',
  },
  {
    name: 'N5 snowwhite-HA fire',
    from: 'N5 snowwhite-HA fire (boss Fire)',
    measured: 12,
    status: 'omitted',
    note: 'LIBERALIO-FREE. Recorded as real 12 vs sim 11.',
  },
];

/** Resolve a comp's roster from scripts/experiment.ts, applying any deliberate override. */
function resolve(off: OffComp) {
  const base = COMPS.find((c) => c.name === off.from);
  if (!base) {
    throw new Error(
      `fb-count-matrix: no comp named "${off.from}" in scripts/experiment.ts — ` +
        'the lab is authoritative for rosters; fix the name rather than retyping slugs here.'
    );
  }
  return {
    ...base,
    slugs: off.slugsOverride ?? base.slugs,
    focus: off.focusOverride ?? (off.slugsOverride ? undefined : base.focus),
  };
}

/** Parse the rotation log into per-cycle Full Burst windows and chain-stage casts. */
function parseRotation(log: string[]) {
  const fbs: { start: number; end: number }[] = [];
  const stages: { t: number; stage: 1 | 2 | 3 }[] = [];
  for (const line of log) {
    const t = parseFloat(line);
    if (line.includes('FULL BURST')) {
      const m = line.match(/until ([\d.]+)s/);
      fbs.push({ start: t, end: m ? parseFloat(m[1]) : NaN });
    } else if (/\bBIII\b/.test(line)) {
      stages.push({ t, stage: 3 });
    } else if (/\bBII\b/.test(line)) {
      stages.push({ t, stage: 2 });
    } else if (/\bBI\b/.test(line)) {
      stages.push({ t, stage: 1 });
    }
  }
  return { fbs, stages };
}

/**
 * Where the 180s fight stops, in cycle terms. Three states, mirroring the engine's own:
 * inside a Full Burst, inside the burst chain (which stage), or refilling the gauge.
 */
function endState(log: string[]): { state: string; detail: string } {
  const { fbs, stages } = parseRotation(log);
  const lastFb = fbs[fbs.length - 1];

  // ⚑ THE FIGHT ENDS AT 180s. Nothing here reasons about what "would have happened" afterwards —
  // there is no after. This reports only the state the fight actually ended in.
  //
  // It also does NOT report a gauge percentage. The gauge level is not exposed by the engine, and
  // elapsed-refill-time is not a proxy for it: generation counts HITS, and hits do not arrive
  // uniformly (charge weapons fire in discrete shots, MG wind-up ramps, reloads pause the feed).
  if (lastFb && lastFb.end > FIGHT_SEC && lastFb.start <= FIGHT_SEC) {
    return {
      state: 'MID-FULL-BURST',
      detail: `Full Burst opened ${lastFb.start.toFixed(1)}s and was still live at the buzzer (${(FIGHT_SEC - lastFb.start).toFixed(2)}s of it inside the fight)`,
    };
  }

  const lastEnd = lastFb ? lastFb.end : 0;
  const openChain = stages.filter((s2) => s2.t > lastEnd && s2.t <= FIGHT_SEC);
  if (openChain.length) {
    const top = openChain[openChain.length - 1];
    return {
      state: 'MID-CHAIN',
      detail: `B${'I'.repeat(top.stage)} cast at ${top.t.toFixed(1)}s was the last chain step of the fight`,
    };
  }

  return {
    state: 'GAUGE FILLING',
    detail: `refilling for the final ${(FIGHT_SEC - lastEnd).toFixed(2)}s (last Full Burst ended ${lastEnd.toFixed(1)}s); the bar never filled`,
  };
}

// ============================================================================
// REFILL-WINDOW STARVATION AUDIT — item 1 of the 2026-08-13 burst-generation
// investigation plan (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
// Run it: npx tsx scripts/battery/fb-count-matrix.ts --refill-starvation
//
// QUESTION: the gauge-refill window opens the instant Full Burst ends — the moment units are most
// likely to be mid-reload or mid-charge after firing for 10s straight. Does the sim under-feed the
// bar specifically in the first second(s) after FB end, while its fight-average generation rate
// still looks right? Every prior gauge validation is a RATE or PER-SHOT check, which a boundary
// defect leaves intact by construction.
//
// OBSERVABLE: burst gauge is generated per HIT and by nothing else (owner ruling; CLAUDE.md
// verified facts), and per-hit gauge is stationary across a refill window for the filmed comps
// (no time-varying burstGenPct carrier, no SG hitFraction, focus multiplier constant), so hits
// bucketed by time-since-FB-end ARE the gauge delivery profile. A starved window shows as a hit
// rate that RAMPS from the boundary; a clean window is flat from the first frame.
//
// ATTRIBUTION (per-unit gauge is not emitted as an event; this is the reconstruction):
//   * Normal channel — one `shot` event = one trigger pull = one shotGauge emission (firePull).
//   * Skill channel — one `damage` instance in bucket 'skill'/'burst' = one skillGauge emission
//     (the skillGauge call sites: flatDamage procs, DoT ticks, flighted landings,
//     extraHitDamagePct).
//   * `gaugeGenerated` is spread proportionally over the unit's build-window hits (INCLUDING the
//     fight-opening first fill, which generates gauge but is not a steady-state cycle). Bounded
//     residuals, both documented so a reader knows which way they push:
//     (a) over-cap gauge (addGauge counts pre-clamp) rides the gauge-full frame at a window's
//         END — never the early buckets — so delivery ratios are biased slightly DOWN
//         (conservative for a starvation finding);
//     (b) a real weapon swap generates NO gauge, so swap pulls inside a window would dilute the
//         timing signal — none of the filmed comps' swap windows reach a refill window today
//         (they all end before FB end); the per-unit first-hit latencies would expose one.
// ============================================================================

/** Time-since-Full-Burst-end buckets for the refill profile (the plan's named bins). */
export const REFILL_BUCKETS = [
  { label: '0-0.5s', lo: 0, hi: 0.5 },
  { label: '0.5-1s', lo: 0.5, hi: 1 },
  { label: '1-2s', lo: 1, hi: 2 },
  { label: '2s+', lo: 2, hi: Infinity },
] as const;

export interface RefillUnitProfile {
  slug: string;
  /** gauge-eligible hits per bucket, summed over every refill window */
  hits: number[];
  /** hits/s in the tail region [1s, window end) — the unit's steady-state reference rate */
  tailRate: number;
  /** hits in 0-1s ÷ (tailRate × 0-1s exposure); < 1 = the unit ramps from the boundary */
  first1sRatio: number;
  /** gaugeGenerated spread over the unit's build-window hits (attribution weight, see header) */
  gaugePerHit: number;
  /** gauge attributed to the first 1s (proportional attribution, see header) */
  first1sGauge: number;
  /** gauge the unit's tail rate would have delivered over the same first-1s exposure */
  first1sGaugeExpected: number;
  /** fbEnd → first gauge-eligible hit (s), one entry per window */
  firstHitLatencySec: number[];
  /** windows whose first hit landed ≤0.1s after one of the unit's own reload completions */
  reloadBoundFirsts: number;
  /** windows whose first hit came >1s after FB end */
  lateFirsts: number;
}

export interface RefillStarvationReport {
  comp: string;
  /** steady-state refill windows analyzed (post-FB-end → gauge-full) */
  windows: number;
  skipped: number;
  meanWindowSec: number;
  /** sanity: Σ window lengths + first fill vs the engine's gaugeBuildTimeSec (should be ~0) */
  buildTimeCheckSec: number;
  teamHits: number[];
  teamExposure: number[];
  /** team hits/s per bucket — the ramp shape, flat = clean */
  teamRate: number[];
  /** TEAM first-1s delivery ratio — the decision quantity (≥0.8 clean, <0.5 starved) */
  first1sRatio: number;
  verdict: 'NOT-STARVED' | 'CONTRIBUTING' | 'STARVED';
  /** gauge missing from the first 1s per cycle (signed; negative = early over-delivery) */
  first1sGaugeDeficitPerCycle: number;
  /** refill-time equivalent of that deficit at the team's tail gauge rate (s/cycle) */
  first1sDeficitDelaySec: number;
  /** windows containing a ≥0.9s team-wide hit gap — the unhittable-transition proxy */
  silenceWindows: number;
  /** fight time (s) of each silence window's start — provenance for the gap scan */
  silenceAtSec: number[];
  perUnit: RefillUnitProfile[];
}

const REFILL_VERDICT_OF = (r: number): RefillStarvationReport['verdict'] =>
  r >= 0.8 ? 'NOT-STARVED' : r < 0.5 ? 'STARVED' : 'CONTRIBUTING';

export function refillStarvation(
  compName: string,
  res: SimResult,
  events: SimEvent[]
): RefillStarvationReport {
  const nb = REFILL_BUCKETS.length;
  const slugs = res.units.map((u) => u.slug);

  // ---- windows: [FB end, gauge-full), gauge-full = next B1 cast − the measured 30f pre-B1 gap.
  const fbEnds: number[] = [];
  const b1Casts: number[] = [];
  for (const ev of events) {
    if (ev.kind === 'fullBurstEnd') {
      fbEnds.push(ev.sec);
    } else if (ev.kind === 'burstCast' && ev.stage === 1) {
      b1Casts.push(ev.sec);
    }
  }
  interface RefillWindow {
    start: number;
    end: number;
    truncated: boolean;
  }
  const windows: RefillWindow[] = [];
  let skipped = 0;
  for (const s of fbEnds) {
    const b1 = b1Casts.find((t) => t > s);
    if (b1 === undefined) {
      // the fight ended mid-refill — keep the partial window, truncated at the buzzer
      if (FIGHT_SEC > s) {
        windows.push({ start: s, end: FIGHT_SEC, truncated: true });
      } else {
        skipped++;
      }
      continue;
    }
    const gaugeFull = b1 - PRE_B1_SEC;
    if (gaugeFull <= s) {
      skipped++;
      continue;
    }
    windows.push({ start: s, end: gaugeFull, truncated: false });
  }

  // ---- the fight-opening first fill ([0, first gauge-full)) generates gauge too; it is NOT a
  // steady-state cycle, so it is excluded from the buckets but included in the per-hit gauge
  // attribution below (gaugeGenerated covers it).
  const firstFillEnd = b1Casts.length ? b1Casts[0] - PRE_B1_SEC : NaN;

  // ---- per-bucket exposure (window-level: identical for every unit)
  const teamExposure = new Array<number>(nb).fill(0);
  let windowSecSum = 0;
  for (const w of windows) {
    const len = w.end - w.start;
    windowSecSum += len;
    REFILL_BUCKETS.forEach((b, i) => {
      teamExposure[i] += Math.max(0, Math.min(b.hi, len) - b.lo);
    });
  }
  const tailExposure = windows.reduce(
    (a, w) => a + Math.max(0, w.end - w.start - 1),
    0
  );
  const exposure01 = teamExposure[0] + teamExposure[1];

  // ---- fold events into the windows. Events arrive in frame order, so a single forward pointer
  // suffices. `windowFor` returns the window index containing `sec`, else -1.
  const hits = new Map<string, number[]>(
    slugs.map((s) => [s, new Array<number>(nb).fill(0)])
  );
  const firstFillHits = new Map<string, number>(slugs.map((s) => [s, 0]));
  // per-unit, per-window RELATIVE second of the first gauge-eligible hit; NaN = the unit
  // produced nothing in that window (its "latency" is then the whole window length).
  const firstHitSec = new Map<string, number[]>(
    slugs.map((s) => [s, new Array<number>(windows.length).fill(NaN)])
  );
  const reloadSec = new Map<string, number[]>(slugs.map((s) => [s, []]));
  const windowHitTimes: number[][] = windows.map(() => []);
  const bucketOf = (rel: number) =>
    REFILL_BUCKETS.findIndex((b) => rel >= b.lo && rel < b.hi);

  let wi = 0;
  const windowFor = (sec: number): number => {
    while (wi < windows.length && windows[wi].end <= sec) {
      wi++;
    }
    return wi < windows.length && sec >= windows[wi].start ? wi : -1;
  };

  for (const ev of events) {
    if (ev.kind === 'reload') {
      reloadSec.get(ev.slug)?.push(ev.sec);
      continue;
    }
    let slug: string;
    if (ev.kind === 'shot') {
      slug = ev.slug;
    } else if (
      ev.kind === 'damage' &&
      (ev.bucket === 'skill' || ev.bucket === 'burst')
    ) {
      slug = ev.slug;
    } else {
      continue;
    }
    const k = windowFor(ev.sec);
    if (k >= 0) {
      const rel = ev.sec - windows[k].start;
      const b = bucketOf(rel);
      if (b >= 0) {
        hits.get(slug)![b]++;
      }
      windowHitTimes[k].push(ev.sec);
      const arr = firstHitSec.get(slug)!;
      if (isNaN(arr[k])) {
        arr[k] = rel; // keep the FIRST hit of the window
      }
    } else if (isFinite(firstFillEnd) && ev.sec < firstFillEnd) {
      firstFillHits.set(slug, (firstFillHits.get(slug) ?? 0) + 1);
    }
  }

  // ---- per-unit profiles
  const perUnit: RefillUnitProfile[] = res.units.map((u) => {
    const h = hits.get(u.slug)!;
    const totalWindowHits = h.reduce((a, b) => a + b, 0);
    const tailHits = h[2] + h[3];
    const tailRate = tailExposure > 0 ? tailHits / tailExposure : 0;
    const hits01 = h[0] + h[1];
    const expected01 = tailRate * exposure01;
    // gauge attribution: spread the unit's gaugeGenerated over ALL its build-window hits
    const denom = totalWindowHits + (firstFillHits.get(u.slug) ?? 0);
    const gaugePerHit = denom > 0 ? u.gaugeGenerated / denom : 0;
    // latencies: a window with NO hit from this unit records the whole window length
    const rawFirst = firstHitSec.get(u.slug)!;
    const latencies = windows.map((w, k) =>
      isNaN(rawFirst[k]) ? w.end - w.start : rawFirst[k]
    );
    const reloads = reloadSec.get(u.slug)!;
    let reloadBoundFirsts = 0;
    let lateFirsts = 0;
    windows.forEach((w, k) => {
      // skip windows the unit never hit — it has no "first hit" to attribute there
      if (isNaN(rawFirst[k])) {
        return;
      }
      const firstAbs = w.start + rawFirst[k];
      if (reloads.some((r) => firstAbs - r >= 0 && firstAbs - r <= 0.1)) {
        reloadBoundFirsts++;
      }
      if (rawFirst[k] > 1) {
        lateFirsts++;
      }
    });
    return {
      slug: u.slug,
      hits: h,
      tailRate,
      first1sRatio: expected01 > 0 ? hits01 / expected01 : hits01 > 0 ? NaN : 1,
      gaugePerHit,
      first1sGauge: hits01 * gaugePerHit,
      first1sGaugeExpected: expected01 * gaugePerHit,
      firstHitLatencySec: latencies,
      reloadBoundFirsts,
      lateFirsts,
    };
  });

  // ---- team rollup + decision quantity
  const teamHits = REFILL_BUCKETS.map((_, i) =>
    perUnit.reduce((a, u) => a + u.hits[i], 0)
  );
  const teamRate = teamHits.map((h, i) =>
    teamExposure[i] > 0 ? h / teamExposure[i] : NaN
  );
  const hits01 = teamHits[0] + teamHits[1];
  const expected01 = perUnit.reduce((a, u) => a + u.tailRate * exposure01, 0);
  const first1sRatio = expected01 > 0 ? hits01 / expected01 : NaN;
  const first1sGaugeDeficitPerCycle = perUnit.reduce(
    (a, u) => a + (u.first1sGaugeExpected - u.first1sGauge),
    0
  );
  // Team gauge rate in the tail region (gauge/s) — converts a first-1s gauge deficit into the
  // refill-time it costs: a deficit D at generation rate R delays the gauge-full moment by D/R.
  const teamTailGaugeRate = perUnit.reduce(
    (a, u) => a + u.tailRate * u.gaugePerHit,
    0
  );
  const first1sDeficitDelaySec =
    first1sGaugeDeficitPerCycle > 0 && teamTailGaugeRate > 0
      ? first1sGaugeDeficitPerCycle / teamTailGaugeRate
      : 0;

  // silence scan: a ≥0.9s team-wide gap inside a window is the unhittable-transition proxy
  // (UNHITTABLE_FRAMES = 60f = 1.0s; natural team gaps are far smaller on these comps)
  let silenceWindows = 0;
  const silenceAtSec: number[] = [];
  windowHitTimes.forEach((times, k) => {
    const t = [...times].sort((a, b) => a - b);
    for (let i = 1; i < t.length; i++) {
      if (t[i] - t[i - 1] > 0.9) {
        silenceWindows++;
        silenceAtSec.push(windows[k].start);
        break;
      }
    }
  });

  const buildTimeCheckSec =
    windowSecSum +
    (isFinite(firstFillEnd) ? firstFillEnd : 0) -
    res.gaugeBuildTimeSec;

  return {
    comp: compName,
    windows: windows.length,
    skipped,
    meanWindowSec: windows.length ? windowSecSum / windows.length : NaN,
    buildTimeCheckSec,
    teamHits,
    teamExposure,
    teamRate,
    first1sRatio,
    verdict: REFILL_VERDICT_OF(first1sRatio),
    first1sGaugeDeficitPerCycle,
    first1sDeficitDelaySec,
    silenceWindows,
    silenceAtSec,
    perUnit,
  };
}

function buildRows() {
  return OFF.map((off) => {
    const comp = resolve(off);
    const res = run(comp, {}, undefined);
    const { fbs, stages } = parseRotation(res.rotationLog);

    const buildSec = res.gaugeBuildTimeSec;
    const per = res.units.map((u) => {
      const c = data.characters[u.slug];
      return {
        slug: u.slug,
        name: c?.name ?? u.slug,
        weapon: c?.weapon ?? '?',
        burst: c?.burst ?? '?',
        // gauge fed per SECOND OF REFILLING (60 frames), not per second of fight — generation is
        // locked during Full Burst and the chain, so a wall-clock rate would understate everyone.
        per60: buildSec > 0 ? u.gaugeGenerated / buildSec : NaN,
        total: u.gaugeGenerated,
      };
    });
    const teamRate = per.reduce(
      (a, u) => a + (isFinite(u.per60) ? u.per60 : 0),
      0
    );

    // observed refill per cycle: gauge-full is PRE_B1_SEC before the B1 cast, and the refill began
    // when the previous Full Burst ended (no post-FB lock).
    const refills: number[] = [];
    for (let i = 1; i < fbs.length; i++) {
      const b1 = stages.find((s) => s.stage === 1 && s.t > fbs[i - 1].end);
      if (b1) {
        refills.push(b1.t - PRE_B1_SEC - fbs[i - 1].end);
      }
    }
    const meanRefill = refills.length
      ? refills.reduce((a, b) => a + b, 0) / refills.length
      : NaN;

    const firstFb = fbs.length ? fbs[0].start : NaN;
    const fbDur0 = fbs.length ? fbs[0].end - fbs[0].start : NaN;
    // median chain span = FIRST stage cast of the chain -> Full Burst start (the definition
    // decomposeCycles() uses). It must anchor to the chain's OPENING cast, not merely the last stage
    // before the burst — that is the B3 cast, 22 frames out, and using it under-states the floor by
    // ~1s and silently inflates the derived refill.
    const spans = fbs
      .map((f, i) => {
        const prevEnd = i > 0 ? fbs[i - 1].end : 0;
        const opening = stages.find((x) => x.t > prevEnd && x.t < f.start);
        return opening ? f.start - opening.t : NaN;
      })
      .filter((x) => !isNaN(x));
    const chainSpan = spans.length
      ? [...spans].sort((a, b) => a - b)[Math.floor(spans.length / 2)]
      : NaN;
    const lo = Math.floor(fbs.length * 0.2);
    const hi = Math.ceil(fbs.length * 0.8);
    const periods: number[] = [];
    for (let i = lo + 1; i < hi; i++) {
      periods.push(fbs[i].start - fbs[i - 1].start);
    }
    const period = periods.length
      ? periods.reduce((a, b) => a + b, 0) / periods.length
      : NaN;

    const focusSlug =
      comp.focus ?? comp.slugs[Math.min(2, comp.slugs.length - 1)];

    return {
      off,
      comp,
      per,
      teamRate,
      projectedFillSec: teamRate > 0 ? 100 / teamRate : NaN,
      meanRefill,
      simFb: res.fullBursts,
      focusSlug,
      stallSec: res.rotationStallSec,
      buildSec,
      end: endState(res.rotationLog),
      fbDur: fbs.length ? fbs[0].end - fbs[0].start : NaN,
      period,
      firstFb,
      // GENERATION SHORTFALL — only computable where the real cycle was actually filmed.
      // Burst gauge is generated per HIT; there is no per-second mechanic and no timer that opens a
      // chain. So a cycle-time difference is a SYMPTOM, and the quantity that can actually be wrong is
      // how much gauge the team feeds the bar. Converting: the real refill is the filmed period minus
      // the mechanical floor, and the required rate is one bar over that.
      required: off.measuredPeriodSec
        ? (() => {
            const floor = fbDur0 + PRE_B1_SEC + chainSpan;
            const realRefill = off.measuredPeriodSec - floor;
            return {
              floor,
              realRefill,
              simRate: 100 / meanRefill,
              realRate: 100 / realRefill,
              ratio: meanRefill / realRefill,
            };
          })()
        : null,
    };
  });
}

function median(xs: number[]): number {
  if (!xs.length) {
    return NaN;
  }
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function printRefillStarvation(reports: RefillStarvationReport[]) {
  console.log(
    '\n===== REFILL-WINDOW STARVATION AUDIT — investigation-plan item 1 =====\n' +
      'Gauge-eligible hits bucketed by time since Full Burst END, over every steady-state refill\n' +
      'window. Decision quantity: first-1s delivery vs the window-tail rate (the pre-committed\n' +
      'rule: >=80% NOT-STARVED / 50-80% CONTRIBUTING / <50% STARVED).\n'
  );
  for (const r of reports) {
    console.log(
      `\n${'='.repeat(96)}\n${r.comp} — ${r.windows} refill windows, mean ${r.meanWindowSec.toFixed(2)}s (skipped ${r.skipped})`
    );
    console.log(
      `  reconstruction check (windows + first fill − gaugeBuildTimeSec): ${r.buildTimeCheckSec >= 0 ? '+' : ''}${r.buildTimeCheckSec.toFixed(2)}s` +
        `   |   windows with a >=0.9s team-wide silence: ${r.silenceWindows}` +
        (r.silenceAtSec.length
          ? ` (windows opening at ${r.silenceAtSec.map((s) => s.toFixed(1) + 's').join(', ')})`
          : '')
    );
    console.log(
      `\n  ${'bucket'.padEnd(8)} ${'hits'.padStart(7)} ${'exposure'.padStart(9)} ${'hits/s'.padStart(8)}`
    );
    REFILL_BUCKETS.forEach((b, i) => {
      const rate = r.teamRate[i];
      console.log(
        `  ${b.label.padEnd(8)} ${String(r.teamHits[i]).padStart(7)} ${(r.teamExposure[i].toFixed(2) + 's').padStart(9)} ${(isFinite(rate) ? rate.toFixed(2) : '-').padStart(8)}`
      );
    });
    console.log(
      `\n  ${'unit'.padEnd(26)} ${'tail hits/s'.padStart(11)} ${'1st-1s deliv'.padStart(12)} ${'med 1st-hit'.padStart(12)} ${'reload-bound'.padStart(13)} ${'>1s late'.padStart(9)}`
    );
    for (const u of r.perUnit) {
      const ratio = isFinite(u.first1sRatio)
        ? `${(100 * u.first1sRatio).toFixed(0)}%`
        : 'n/a';
      console.log(
        `  ${u.slug.padEnd(26)} ${u.tailRate.toFixed(2).padStart(11)} ${ratio.padStart(12)} ${(median(u.firstHitLatencySec).toFixed(2) + 's').padStart(12)} ${`${u.reloadBoundFirsts}/${r.windows}`.padStart(13)} ${`${u.lateFirsts}/${r.windows}`.padStart(9)}`
      );
    }
    console.log(
      `\n  TEAM first-1s delivery: ${(100 * r.first1sRatio).toFixed(1)}% of the steady-state tail rate` +
        (r.first1sGaugeDeficitPerCycle > 0
          ? `   |   deficit ${r.first1sGaugeDeficitPerCycle.toFixed(1)} gauge/cycle ≈ +${r.first1sDeficitDelaySec.toFixed(2)}s refill per cycle`
          : '   |   no first-1s deficit')
    );
    console.log(`  VERDICT: ${r.verdict}`);
  }
}

/**
 * Run the refill-window starvation audit over the comps that carry a filmed steady-state
 * cycle (`measuredPeriodSec`) — the ONLY comps whose refill can be converted into a generation
 * requirement, and therefore the audit's scope. Exported so the vitest fixture can pin the
 * decision quantities without shelling out.
 */
export function auditRefillStarvation(): RefillStarvationReport[] {
  return OFF.filter((o) => o.measuredPeriodSec !== undefined).map((off) => {
    const comp = resolve(off);
    const events: SimEvent[] = [];
    const res = run(comp, {}, undefined, (ev) => {
      events.push(ev);
    });
    return refillStarvation(off.name, res, events);
  });
}

// The matrix + audit run only on direct CLI invocation — vitest imports `refillStarvation`
// without paying for nine 180s sims (the experiment.ts isMain pattern).
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  if (process.argv.includes('--refill-starvation')) {
    const reports = auditRefillStarvation();
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(reports, null, 2));
    } else {
      printRefillStarvation(reports);
    }
  } else {
    const rows = buildRows();
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(rows, null, 2));
    } else {
      console.log(
        '\n===== FULL-BURST-COUNT MATRIX — comps off their measured count =====\n' +
          'gauge/60f = uncapped gauge fed per SECOND OF REFILLING (generation is locked during FB + chain,\n' +
          'so this is rate while actually generating, not a fight average). 100 = one full bar.\n'
      );
      for (const r of rows) {
        const m = Array.isArray(r.off.measured)
          ? r.off.measured.join('-')
          : String(r.off.measured);
        console.log(
          `\n${'='.repeat(96)}\n${r.off.name}  [boss ${r.comp.boss ?? 'neutral'}]  —  sim ${r.simFb} vs measured ${m}  (${r.off.status})`
        );
        console.log(`  ${r.off.note}`);
        console.log(
          `\n  ${'unit'.padEnd(26)} ${'wpn'.padEnd(4)} ${'B'.padEnd(3)} ${'gauge/60f'.padStart(10)} ${'share'.padStart(7)}  focus`
        );
        for (const u of r.per) {
          const share = r.teamRate > 0 ? (u.per60 / r.teamRate) * 100 : NaN;
          console.log(
            `  ${u.name.padEnd(26)} ${u.weapon.padEnd(4)} ${String(u.burst).padEnd(3)} ${u.per60.toFixed(2).padStart(10)} ${share.toFixed(1).padStart(6)}%  ${u.slug === r.focusSlug ? '<-- FOCUS' : ''}`
          );
        }
        console.log(
          `  ${'TEAM'.padEnd(26)} ${''.padEnd(4)} ${''.padEnd(3)} ${r.teamRate.toFixed(2).padStart(10)}`
        );
        console.log(
          `\n  time to fill from 0 : ${r.projectedFillSec.toFixed(2)}s projected (100 / team rate)` +
            `   |   ${r.meanRefill.toFixed(2)}s observed mean` +
            (isFinite(r.meanRefill) && isFinite(r.projectedFillSec)
              ? `   [over-cap waste + rate variation = ${(r.meanRefill - r.projectedFillSec).toFixed(2)}s]`
              : '')
        );
        console.log(
          `  Full Burst length   : ${r.fbDur.toFixed(2)}s   |  refilling for ${r.buildSec.toFixed(1)}s of the 180s fight   |  chain stall ${r.stallSec.toFixed(2)}s`
        );
        console.log(`  AT THE 180s BUZZER  : ${r.end.state} — ${r.end.detail}`);
        if (r.required) {
          const q = r.required;
          console.log(
            `  GENERATION SHORTFALL: filmed cycle ${r.off.measuredPeriodSec!.toFixed(2)}s − floor ${q.floor.toFixed(2)}s = ${q.realRefill.toFixed(2)}s of real refill`
          );
          console.log(
            `                        fight needs ${q.realRate.toFixed(1)} gauge/s · sim feeds ${q.simRate.toFixed(1)} gauge/s` +
              `  =>  sim generates ${(100 / q.ratio).toFixed(0)}% of what is required`
          );
        }
      }
      console.log(
        `\n${'='.repeat(96)}\n` +
          'Burst gauge is generated per HIT — there is no per-second gain and no timer that opens a\n' +
          'chain. So the actionable quantity is the GENERATION SHORTFALL line, not any cycle-time\n' +
          'difference: the question is whether the sim feeds the bar the right amount, not whether a\n' +
          'ending early in a refill is short by more than one cycle of error.\n'
      );
    }
  }
}
