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
//   * `u.gaugeGenerated`  uncapped per-unit gauge fed to the bar, pre-100-clamp (sim.ts:1538)
//   * `gaugeBuildTimeSec` frames where stage===0 && !fbActive && gauge<100, i.e. exactly the
//                         REFILLING time — not wall-clock, and not time spent sitting at full
//                         (sim.ts:4745). Dividing the first by the second gives a true generation
//                         rate rather than a fight-average diluted by the ~60% of the fight that
//                         is Full Burst + chain, when generation is locked.
//   * `rotationLog`       the cast/Full-Burst timeline, for the per-cycle refills and end state.
//
// ROSTERS ARE READ FROM `scripts/experiment.ts`, never retyped here — the lab is authoritative for
// comp definitions, and slot order matters because it sets the camera focus, which sets the x2.5
// charge-gauge bonus. (Two rosters were wrong when this file's first draft transcribed them by
// hand; `resolve()` throws rather than silently simming a team nobody recorded.) The single
// deliberate exception is documented at its call site.

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { SimResult } from '../../src/engine/sim.js';
import type { EffectDef } from '../../src/skills/types.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import type { DataFile, SimEvent } from '../../src/types.js';
import { COMPS, run } from '../experiment.js';

const data: DataFile = JSON.parse(
  readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8')
);

const gaugeTable = JSON.parse(
  readFileSync(
    new URL('../../data/gauge-per-shot.json', import.meta.url),
    'utf8'
  )
) as Record<
  string,
  {
    targetPerTrigger?: number;
    flatPerTrigger?: number;
    fullChargeBonus?: number;
  }
>;

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

// ============================================================================
// NON-BULLET GAUGE-SOURCE CENSUS — item 2 of the 2026-08-13 burst-generation
// investigation plan (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
// Run it: npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources
//
// QUESTION: skill hits, DoT ticks and riders all feed the bar via `skillGauge()` — one
// target-base hit per impact. Is every source that generates in-game actually emitting,
// and is anything emitting that should not? The solo gauge anchors are both BULLET
// measurements on charge weapons, so a whole effect kind missing from the emission map is
// invisible to them and to damage tests (gauge and damage are separate channels). The
// 2026-08-13 U28 pass already fixed one such asymmetry (`extraHitDamagePct`) and bounded
// it board-inert; this census covers the REMAINING impact kinds.
//
// METHOD (field-form census, per the census-holes lesson — make unrecognised input LOUD):
//   PART 1 (static): `GAUGE_KIND_CENSUS` is a `Record<EffectDef['kind'], …>` — exhaustive
//   over the schema union at COMPILE time, so a new effect kind added to
//   `src/skills/types.ts` fails the typecheck here. Every override file is then walked at
//   RUNTIME and each encountered kind must resolve in the record, so unrecognised input
//   throws instead of passing silently. `ENGINE_IMPACT_PATHS` covers the impact paths that
//   are not effect kinds (weapon pulls, the Pierce double-hit, the extraHitDamagePct rider).
//   PART 2 (dynamic): each of the nine off-count comps runs with the event tap. Skill/burst
//   damage instances and buff applications are partitioned into UNLOCKED regions —
//   [0, first gauge-full) and each [FB-end, next gauge-full) refill window — vs the
//   chain + Full-Burst lock where `addGauge` swallows the emission. The partition is the
//   observable: a no-emission kind whose impacts can never land unlocked contributes exactly
//   zero, and any future engine change that leaks one out of the lock moves the pinned counts
//   (scripts/tests/battery/gauge-source-census.test.ts).
// ============================================================================

type GaugeEmission =
  | 'skillGauge-per-impact'
  | 'shotGauge-per-pull'
  | 'direct-gauge'
  | 'no-emission';

type GaugeRuling =
  'measured' | 'owner-ruling' | 'unmeasured-precedent' | 'unexamined' | 'n/a';

export interface KindCensusRow {
  /** the kind produces at least one damage impact on the boss */
  impact: boolean;
  emission: GaugeEmission;
  ruling: GaugeRuling;
  /** file:line anchors + the measurement / ruling behind the row */
  basis: string;
}

// Exhaustive over EffectDef['kind'] — a new kind in types.ts breaks this literal at
// typecheck (the LOUD half of the census). Line numbers verified 2026-08-16.
export const GAUGE_KIND_CENSUS: Record<EffectDef['kind'], KindCensusRow> = {
  flatDamage: {
    impact: true,
    emission: 'skillGauge-per-impact',
    ruling: 'measured',
    basis:
      'sim.ts:2859 (instant) + sim.ts:4177 (delaySec landing); when `gaugeHits: N` is present the effect credits skillGauge N times per impact — per-SUB-HIT credit for sequential volleys while damage stays one aggregated instance (measured swha-solo.mov, ENACTED 2026-08-15; carriers snow-white-heavy-arms 5/10, eve 3, little-mermaid 10); maiden-ice-rose rider anchor — 12.55%/pull = 910 weapon + 364 flat rider (burst-gauge.md §6); owner D4 2026-08-10',
  },
  hitRepeat: {
    impact: true,
    emission: 'skillGauge-per-impact',
    ruling: 'owner-ruling',
    basis:
      'sim.ts:2897; owner D4 2026-08-10 (a function-damage instance that lands SHOULD generate); ⚑ the %-of-hit repeat itself is UNMEASURED — the engine follows the function-damage precedent (types.ts kind note); sole carrier emilia, seats no off-count comp',
  },
  dot: {
    impact: true,
    emission: 'skillGauge-per-impact',
    ruling: 'measured',
    basis:
      'sim.ts:4204 on each tick; wiki3 Haran S1 DoT 290/tick ≈ her SR base (burst-gauge.md §5); emission is at TICK time, so a DoT started in-FB keeps feeding after FB end',
  },
  storedHit: {
    impact: true,
    emission: 'no-emission',
    ruling: 'owner-ruling',
    basis:
      'releases ONLY during Full Burst — the FB-entry batch (sim.ts:3443) and the instantInFb loop (sim.ts:4141), both commented under the owner 2026-08-04 ruling that in-FB generation is impossible; the attach itself is bookkeeping (its co-authored flatDamage is the emitting impact). Sole carrier rapi-red-hood',
  },
  stackedNuke: {
    impact: true,
    emission: 'no-emission',
    ruling: 'unexamined',
    basis:
      'sim.ts:3247 deals the impact with NO skillGauge and no ruling comment — but the contribution is zero by construction: its only trigger is burstCast ⇒ stage ≠ 0 ⇒ addGauge (sim.ts:1521) is locked. Sole carrier maiden-ice-rose; seats none of the nine off-count comps. FINDING per the plan decision rule — reported, not enacted',
  },
  weaponSwap: {
    impact: false,
    emission: 'shotGauge-per-pull',
    ruling: 'owner-ruling',
    basis:
      'no impact of its own — swap shots route through firePull → shotGauge (sim.ts:4461); a REAL weapon change generates NO gauge (owner 2026-08-13, the u.swap guard in shotGauge sim.ts:1558); same-weapon flavor swaps keep feeding',
  },
  fillGauge: {
    impact: false,
    emission: 'direct-gauge',
    ruling: 'owner-ruling',
    basis:
      'sim.ts:2975; discrete "Fills Burst Gauge X%" respects the same chain + FB lock as continuous generation (owner 2026-07-30; burst-gauge.md §5)',
  },
  buff: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'stat grant; no boss impact',
  },
  resource: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'owner resource-pool bookkeeping',
  },
  heal: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'recovery events only',
  },
  shield: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'shield events only',
  },
  targetStatus: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'boss status window only',
  },
  burstEligibility: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'rotation eligibility only',
  },
  burstFirst: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'cast-order only',
  },
  reenterStage: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'stage hold only',
  },
  advantageVs: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'element tag only',
  },
  burstCdr: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'cooldown reduction only',
  },
  escalating: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis:
      'wrapper — deals nothing itself; its steps are censused recursively by the runtime walk',
  },
  fullBurstExtend: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'Full-Burst duration only',
  },
  unlimitedAmmo: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'ammo economy only',
  },
  consumeAmmo: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'ammo economy only',
  },
  gainPierce: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'pierce tag only',
  },
  convertExcess: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'derived-stat conversion only',
  },
  addStack: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'stack bookkeeping only',
  },
  instantReload: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'ammo economy only',
  },
  stun: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis: 'no boss impact modeled',
  },
  ignored: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis:
      'offline-parser-only; validate-overrides rejects it in a shipped file',
  },
  unsupported: {
    impact: false,
    emission: 'no-emission',
    ruling: 'n/a',
    basis:
      'offline-parser-only; validate-overrides rejects it in a shipped file',
  },
};

// Impact paths that are NOT effect kinds — the rest of the emission map.
export const ENGINE_IMPACT_PATHS: {
  path: string;
  emission: GaugeEmission;
  ruling: GaugeRuling;
  basis: string;
}[] = [
  {
    path: 'normal weapon pull (firePull)',
    emission: 'shotGauge-per-pull',
    ruling: 'measured',
    basis:
      'sim.ts:4282; datamined CharacterShotTable + the two solo anchors (burst-gauge.md §6); the SG hitFraction question belongs to plan item 4',
  },
  {
    path: 'Pierce double-hit (second instance of the same pull)',
    emission: 'no-emission',
    ruling: 'measured',
    basis:
      'sim.ts:4272; gauge is per TRIGGER PULL (burst-gauge.md §1), validated at roster scale by the rl3 cross-check (§7) — one pull, one emission',
  },
  {
    path: 'extraHitDamagePct rider (summed stat, one impact per pull)',
    emission: 'skillGauge-per-impact',
    ruling: 'measured',
    basis:
      'sim.ts:4333; U28 encoded 2026-08-13 under the maiden anchor equivalence; board-inert BY MECHANISM per carrier (u28-gauge-ab.ts --lock-census)',
  },
];

/** The `skillGauge()` value for one impact of this unit — mirrors sim.ts:1528 exactly. */
export function skillImpactGauge(slug: string): number {
  const c = data.characters[slug];
  const row = gaugeTable[slug];
  const per =
    (row?.targetPerTrigger ?? CENSUS_GAUGE_MODAL_BY_WEAPON[c.weapon] ?? 40) /
    100;
  return per / (c.weapon === 'SG' ? 10 : c.hitsPerShot || 1);
}

// mirror of sim.ts's fallback table (no-row units take their weapon-class modal)
const CENSUS_GAUGE_MODAL_BY_WEAPON: Record<string, number> = {
  AR: 40,
  SMG: 20,
  SG: 400,
  SR: 560,
  RL: 280,
  MG: 10,
};

/** Impact kinds that produce a boss impact but emit NO gauge. */
export const NO_EMIT_KINDS: EffectDef['kind'][] = ['storedHit', 'stackedNuke'];
/** Impact kinds that emit but whose specific mechanic never had its own measurement. */
export const UNMEASURED_EMIT_KINDS: EffectDef['kind'][] = ['hitRepeat'];

function walkEffects(
  effects: EffectDef[],
  visit: (kind: EffectDef['kind']) => void
) {
  for (const e of effects) {
    visit(e.kind);
    if (e.kind === 'escalating') {
      walkEffects(e.steps, visit);
    }
  }
}

const OVERRIDE_SLOTS = ['skill1', 'skill2', 'burst'] as const;

/** Visit every effect kind in an override file (all slots, escalating recursed). */
function walkOverride(
  o: NonNullable<ReturnType<typeof loadOverride>>,
  visit: (kind: EffectDef['kind']) => void
) {
  for (const slot of OVERRIDE_SLOTS) {
    for (const b of o[slot] ?? []) {
      walkEffects(b.effects ?? [], visit);
    }
  }
}

export interface KindUsage {
  kind: EffectDef['kind'];
  /** carriers across src/skills/overrides/ (sorted slugs) */
  slugs: string[];
}

/**
 * Runtime half of the field-form census: walk EVERY override file and require each
 * encountered effect kind to resolve in GAUGE_KIND_CENSUS — unrecognised input throws
 * instead of passing silently. Returns the kind → carrier map.
 */
export function censusOverrideKinds(): KindUsage[] {
  const dir = new URL('../../src/skills/overrides/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('gauge-source census: no override files found');
  }
  const usage = new Map<EffectDef['kind'], Set<string>>();
  for (const f of files) {
    const slug = f.replace(/\.json$/, '');
    const o = loadOverride(slug);
    if (!o) {
      throw new Error(`gauge-source census: ${slug} did not load`);
    }
    walkOverride(o, (kind) => {
      if (!(kind in GAUGE_KIND_CENSUS)) {
        throw new Error(
          `gauge-source census: effect kind "${kind}" (${slug}) has no classification — ` +
            'add it to GAUGE_KIND_CENSUS before anything else reads this file'
        );
      }
      if (!usage.has(kind)) {
        usage.set(kind, new Set());
      }
      usage.get(kind)!.add(slug);
    });
  }
  return [...usage.entries()]
    .map(([kind, slugs]) => ({ kind, slugs: [...slugs].sort() }))
    .sort((a, b) => a.kind.localeCompare(b.kind));
}

export interface DivisorExposure {
  slug: string;
  weapon: string;
  /** the live skillGauge divisor: hitsPerShot (10 for SG) */
  divisor: number;
  unlockedImpacts: number;
  /** gauge shipped: impacts × per/divisor */
  gaugeShipped: number;
  /** gauge under the divisor-1 hypothesis (the U28-residual upper bound) */
  gaugeIfDivisorOne: number;
}

export interface GaugeSourceCompReport {
  comp: string;
  slugs: string[];
  /** steady-state refill windows (excludes the fight-opening first fill) */
  steadyWindows: number;
  /** skill/burst damage instances landing UNLOCKED — one skillGauge each, reaching the bar */
  unlockedImpacts: number;
  /** skill/burst instances inside the chain + FB lock — emitted, swallowed by addGauge */
  lockedImpacts: number;
  perUnitUnlockedImpacts: Record<string, number>;
  /** seated carriers of the no-emission impact kinds (storedHit / stackedNuke) */
  noEmitCarriers: { slug: string; kinds: EffectDef['kind'][] }[];
  /** seated carriers of unmeasured-emission kinds (hitRepeat) */
  unmeasuredEmitCarriers: { slug: string; kinds: EffectDef['kind'][] }[];
  /** hitsPerShot > 1 carriers with unlocked skill impacts — the skillGauge divisor question */
  divisor: DivisorExposure[];
  /** buff applications inside the steady refill windows (proxy for non-damage skill applications) */
  buffAppliesSteadyAll: number;
  buffAppliesSteadyFresh: number;
  /** buff applications in the fight-opening first fill (reported, not per-cycled) */
  buffAppliesFirstFill: number;
  /** buff applications with no caster (item/doll-origin — excluded from the gauge estimate) */
  buffAppliesNullCaster: number;
  /**
   * Estimated gauge per steady cycle if every non-damage skill APPLICATION generated the
   * caster's flat per-impact value (burst-gauge.md §5, note.com/_trick_, MEDIUM confidence,
   * unmodeled). lower = fresh applications only; upper = all incl. refreshes. Proxy biases
   * documented at print: heal/shield/status applications uncounted (low), stack refreshes
   * overcount (high).
   */
  nonDmgAppGaugePerCycle: { lower: number; upper: number };
  /** filmed comps only: the measured generation shortfall these estimates are held against */
  shortfallRateGaugePerSec: number | null;
  shortfallPerCycleGauge: number | null;
}

/**
 * Run the non-bullet gauge-source census over ALL NINE off-count comps. Exported so the
 * vitest fixture can pin the decision quantities without shelling out.
 */
export function auditGaugeSources(): GaugeSourceCompReport[] {
  const rows = buildRows();
  return OFF.map((off) => {
    const comp = resolve(off);
    const events: SimEvent[] = [];
    const res = run(comp, {}, undefined, (ev) => events.push(ev));

    // ---- unlocked regions: [0, first gauge-full) + each [FB end, next gauge-full).
    const fbEnds: number[] = [];
    const b1Casts: number[] = [];
    for (const ev of events) {
      if (ev.kind === 'fullBurstEnd') {
        fbEnds.push(ev.sec);
      } else if (ev.kind === 'burstCast' && ev.stage === 1) {
        b1Casts.push(ev.sec);
      }
    }
    interface Region {
      start: number;
      end: number;
      firstFill: boolean;
    }
    const regions: Region[] = [];
    if (b1Casts.length) {
      regions.push({ start: 0, end: b1Casts[0] - PRE_B1_SEC, firstFill: true });
    }
    for (const s of fbEnds) {
      const b1 = b1Casts.find((t) => t > s);
      const end = b1 !== undefined ? b1 - PRE_B1_SEC : FIGHT_SEC;
      if (end > s) {
        regions.push({ start: s, end, firstFill: false });
      }
    }
    const steadyWindows = regions.filter((r) => !r.firstFill).length;
    let ri = 0;
    const regionAt = (sec: number): number => {
      while (ri < regions.length && regions[ri].end <= sec) {
        ri++;
      }
      return ri < regions.length && sec >= regions[ri].start ? ri : -1;
    };

    // ---- single fold over the frame-ordered stream (pointer stays monotonic)
    const perUnitUnlockedImpacts: Record<string, number> = {};
    for (const s of comp.slugs) {
      perUnitUnlockedImpacts[s] = 0;
    }
    const divisorHits = new Map<string, number>();
    let unlockedImpacts = 0;
    let lockedImpacts = 0;
    let baSteadyAll = 0;
    let baSteadyFresh = 0;
    let baFirstFill = 0;
    let baNullCaster = 0;
    let steadyGaugeAll = 0;
    let steadyGaugeFresh = 0;
    for (const ev of events) {
      if (
        ev.kind === 'damage' &&
        (ev.bucket === 'skill' || ev.bucket === 'burst')
      ) {
        if (regionAt(ev.sec) >= 0) {
          unlockedImpacts++;
          perUnitUnlockedImpacts[ev.slug] =
            (perUnitUnlockedImpacts[ev.slug] ?? 0) + 1;
          const c = data.characters[ev.slug];
          if ((c.hitsPerShot ?? 1) > 1) {
            divisorHits.set(ev.slug, (divisorHits.get(ev.slug) ?? 0) + 1);
          }
        } else {
          lockedImpacts++;
        }
      } else if (ev.kind === 'buffApply') {
        const k = regionAt(ev.sec);
        if (k < 0) {
          continue;
        }
        if (ev.casterIdx == null) {
          baNullCaster++;
          continue;
        }
        const caster = res.units[ev.casterIdx];
        const gv = caster ? skillImpactGauge(caster.slug) : 0;
        if (regions[k].firstFill) {
          baFirstFill++;
        } else {
          baSteadyAll++;
          steadyGaugeAll += gv;
          if (!ev.refresh) {
            baSteadyFresh++;
            steadyGaugeFresh += gv;
          }
        }
      }
    }

    // ---- seated carriers of the special kinds
    const carriersOf = (
      wanted: EffectDef['kind'][]
    ): { slug: string; kinds: EffectDef['kind'][] }[] => {
      const out: { slug: string; kinds: EffectDef['kind'][] }[] = [];
      for (const slug of comp.slugs) {
        const o = loadOverride(slug);
        const found = new Set<EffectDef['kind']>();
        if (o) {
          walkOverride(o, (kind) => {
            if (wanted.includes(kind)) {
              found.add(kind);
            }
          });
        }
        if (found.size) {
          out.push({ slug, kinds: [...found].sort() });
        }
      }
      return out;
    };

    const divisor: DivisorExposure[] = [...divisorHits.entries()]
      .map(([slug, n]) => {
        const c = data.characters[slug];
        const row = gaugeTable[slug];
        const per =
          (row?.targetPerTrigger ??
            CENSUS_GAUGE_MODAL_BY_WEAPON[c.weapon] ??
            40) / 100;
        const div = c.weapon === 'SG' ? 10 : c.hitsPerShot || 1;
        return {
          slug,
          weapon: c.weapon,
          divisor: div,
          unlockedImpacts: n,
          gaugeShipped: n * (per / div),
          gaugeIfDivisorOne: n * per,
        };
      })
      .sort((a, b) => b.unlockedImpacts - a.unlockedImpacts);

    const row = rows.find((r) => r.off.name === off.name);
    const shortfallRateGaugePerSec = row?.required
      ? row.required.realRate - row.required.simRate
      : null;
    const shortfallPerCycleGauge = row?.required
      ? (row.required.realRate - row.required.simRate) * row.required.realRefill
      : null;

    return {
      comp: off.name,
      slugs: comp.slugs,
      steadyWindows,
      unlockedImpacts,
      lockedImpacts,
      perUnitUnlockedImpacts,
      noEmitCarriers: carriersOf(NO_EMIT_KINDS),
      unmeasuredEmitCarriers: carriersOf(UNMEASURED_EMIT_KINDS),
      divisor,
      buffAppliesSteadyAll: baSteadyAll,
      buffAppliesSteadyFresh: baSteadyFresh,
      buffAppliesFirstFill: baFirstFill,
      buffAppliesNullCaster: baNullCaster,
      nonDmgAppGaugePerCycle: {
        lower: steadyWindows > 0 ? steadyGaugeFresh / steadyWindows : 0,
        upper: steadyWindows > 0 ? steadyGaugeAll / steadyWindows : 0,
      },
      shortfallRateGaugePerSec,
      shortfallPerCycleGauge,
    };
  });
}

function printGaugeSources(reports: GaugeSourceCompReport[]) {
  console.log(
    '\n===== NON-BULLET GAUGE-SOURCE CENSUS — investigation-plan item 2 =====\n' +
      'PART 1 — field-form census of effect kinds vs the gauge emission map.\n' +
      'GAUGE_KIND_CENSUS is exhaustive over EffectDef at compile time; the override walk\n' +
      'below throws on any kind it does not classify (unrecognised input is LOUD).\n'
  );
  const usage = censusOverrideKinds();
  const byKind = new Map(usage.map((u) => [u.kind, u.slugs]));
  const kinds = Object.keys(GAUGE_KIND_CENSUS) as EffectDef['kind'][];
  for (const kind of kinds) {
    const row = GAUGE_KIND_CENSUS[kind];
    const carriers = byKind.get(kind) ?? [];
    if (!row.impact && row.emission === 'no-emission' && !carriers.length) {
      continue; // inert-and-unused kinds stay out of the print; the record still covers them
    }
    console.log(
      `  ${kind.padEnd(18)} ${'impact:' + (row.impact ? 'YES' : 'no').padEnd(4)} ` +
        `${row.emission.padEnd(22)} ${row.ruling.padEnd(21)} carriers=${carriers.length}`
    );
    console.log(`      ${row.basis}`);
  }
  console.log('\n  Impact paths that are not effect kinds:');
  for (const p of ENGINE_IMPACT_PATHS) {
    console.log(`  ${p.path.padEnd(48)} ${p.emission.padEnd(22)} ${p.ruling}`);
    console.log(`      ${p.basis}`);
  }

  console.log(
    '\nPART 2 — dynamic census: nine off-count comps, skill/burst impacts + buff applications\n' +
      'partitioned into UNLOCKED regions ([0, first gauge-full) + each post-FB refill window)\n' +
      'vs the chain + Full-Burst lock. unlocked = emission reaches the bar; locked = swallowed.\n'
  );
  for (const r of reports) {
    console.log(
      `\n${'='.repeat(96)}\n${r.comp} — ${r.steadyWindows} steady refill windows`
    );
    console.log(
      `  skill/burst impacts: ${r.unlockedImpacts} unlocked (each one skillGauge, reaching the bar) | ${r.lockedImpacts} locked`
    );
    for (const [slug, n] of Object.entries(r.perUnitUnlockedImpacts)) {
      if (n > 0) {
        console.log(
          `      ${slug.padEnd(26)} ${String(n).padStart(5)} unlocked impacts × ${skillImpactGauge(slug).toFixed(3)} gauge`
        );
      }
    }
    if (r.noEmitCarriers.length) {
      for (const c of r.noEmitCarriers) {
        console.log(
          `  NO-EMIT KIND SEATED: ${c.slug} (${c.kinds.join(', ')}) — releases are FB-locked by construction; zero contribution`
        );
      }
    } else {
      console.log('  no seated carrier of a no-emission impact kind');
    }
    if (r.unmeasuredEmitCarriers.length) {
      for (const c of r.unmeasuredEmitCarriers) {
        console.log(
          `  UNMEASURED-EMIT KIND SEATED: ${c.slug} (${c.kinds.join(', ')})`
        );
      }
    }
    if (r.divisor.length) {
      for (const d of r.divisor) {
        console.log(
          `  DIVISOR EXPOSURE (U28 residual): ${d.slug} (${d.weapon}, ÷${d.divisor}) — ${d.unlockedImpacts} unlocked impacts; ` +
            `shipped ${d.gaugeShipped.toFixed(1)} gauge vs ${d.gaugeIfDivisorOne.toFixed(1)} if the divisor were 1 ` +
            `(+${(d.gaugeIfDivisorOne - d.gaugeShipped).toFixed(1)} over the fight)`
        );
      }
    }
    console.log(
      `  non-damage skill APPLICATIONS (proxy: buff applies, unlocked): ` +
        `${r.buffAppliesSteadyFresh} fresh / ${r.buffAppliesSteadyAll} incl. refreshes across ${r.steadyWindows} steady windows` +
        ` (+${r.buffAppliesFirstFill} in the first fill, ${r.buffAppliesNullCaster} null-caster excluded)`
    );
    console.log(
      `    estimate if each generated the caster's per-impact value: ` +
        `${r.nonDmgAppGaugePerCycle.lower.toFixed(1)}–${r.nonDmgAppGaugePerCycle.upper.toFixed(1)} gauge/cycle` +
        (r.shortfallPerCycleGauge !== null
          ? `   vs the measured shortfall ${r.shortfallPerCycleGauge.toFixed(1)} gauge/cycle ` +
            `(${r.shortfallRateGaugePerSec!.toFixed(1)} gauge/s of refill)`
          : '   (no filmed cycle — no shortfall figure for this comp)')
    );
  }
}

// ============================================================================
// MULTI-HIT CREDITING AUDIT — item 4 of the 2026-08-13 burst-generation
// investigation plan (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
// Run it: npx tsx scripts/battery/fb-count-matrix.ts --multihit-crediting
//
// QUESTION: do multi-hit weapons credit gauge per LANDED hit or per TRIGGER? The engine feeds
// SG gauge by the landed-pellet fraction (`shotGauge(u, frame, sgGaugeFrac)` in firePull —
// "missed pellets generate nothing" is the live DEFAULT ASSUMPTION, carried into the gauge
// channel by the 2026-07-13 damage-falloff calibration, never ruled or measured for gauge),
// while MG rounds and every single-bullet weapon credit full per-trigger gauge. The primary
// sources never distinguished the two (the datamine column is per-trigger; its per-pellet ×
// shot_count split is table structure, not a miss test; the "fill counts HITS, not damage"
// lineage is gauge-vs-damage, not hits-vs-misses; no SG solo gauge-bar recording has ever been
// read — both solo anchors are charge weapons). So this audit does NOT settle the question —
// it SIZES it: an A/B between the live per-landed feed and the per-trigger arm
// (`SGGAUGE=trigger`, src/engine/sim.ts), default OFF, gauge-only (damage keeps the landed
// fraction, rng streams identical).
//
// METHOD: the baseline arm runs in-process; the trigger arm runs in a CHILD PROCESS because
// sim.ts reads ENV at module load. Both arms snapshot the same panel — the nine off-count
// comps plus the two dorothy-serendipity comps (the plan's designated SG-spray regression
// anchor: her 80-pellet → 3-big-shot consolidation amplifies pellet errors into large swings).
// The decision quantities are the Full-Burst counts + team generation rates under each arm.
// Comps with NO SG carrier are the scoping sanity check — non-SG paths pass hitFraction = 1 by
// construction, so they must be byte-identical between arms (and this audit pins that). Per
// the plan's decision rule, a board move here LOCALIZES the lever; it does not license landing
// anything — "does a missed pellet generate?" is an owner ruling or a footage measurement.
// ============================================================================

export type MultihitArm = 'baseline' | 'trigger';

/** The plan's SG-spray regression anchor comps (dorothy-serendipity seats both). */
export const MULTIHIT_ANCHOR_COMPS = [
  'PH water B3s (boss Fire)',
  'N9 redhood/elegg electric (boss Electric)',
] as const;

export interface MultihitUnitSnapshot {
  slug: string;
  gaugeGenerated: number;
  totalDamage: number;
  pulls: number;
}

export interface MultihitCompSnapshot {
  name: string;
  fullBursts: number;
  teamRate: number;
  buildSec: number;
  units: MultihitUnitSnapshot[];
}

interface MultihitPanelEntry {
  label: string;
  comp: (typeof COMPS)[number];
  measured: number | [number, number] | null;
  status: Status | 'anchor';
}

/** The audit panel: nine off-count comps + the two dorothy anchor comps. */
function multihitPanel(): MultihitPanelEntry[] {
  const anchors = MULTIHIT_ANCHOR_COMPS.map((name) => {
    const c = COMPS.find((x) => x.name === name);
    if (!c) {
      throw new Error(
        `multihit-crediting audit: no comp named "${name}" in scripts/experiment.ts`
      );
    }
    return {
      label: name,
      comp: c,
      measured: null,
      status: 'anchor' as const,
    };
  });
  return [
    ...OFF.map((off) => ({
      label: off.name,
      comp: resolve(off),
      measured: off.measured,
      status: off.status,
    })),
    ...anchors,
  ];
}

/**
 * One-arm snapshot of the whole panel (deterministic EV runs). This is also the child-process
 * entry point (`--multihit-arm-snapshot`): the arm is selected entirely by the caller's env.
 */
export function multihitSnapshot(): MultihitCompSnapshot[] {
  return multihitPanel().map(({ label, comp }) => {
    const res = run(comp, {}, undefined);
    const buildSec = res.gaugeBuildTimeSec;
    const units = res.units.map((u) => ({
      slug: u.slug,
      gaugeGenerated: u.gaugeGenerated,
      totalDamage: u.totalDamage,
      pulls: u.pulls,
    }));
    const teamRate = units.reduce(
      (a, u) => a + (buildSec > 0 ? u.gaugeGenerated / buildSec : 0),
      0
    );
    return {
      name: label,
      fullBursts: res.fullBursts,
      teamRate,
      buildSec,
      units,
    };
  });
}

function hasSgSwapEffect(effects: EffectDef[]): boolean {
  return effects.some(
    (e) =>
      (e.kind === 'weaponSwap' && e.weapon === 'SG') ||
      (e.kind === 'escalating' && hasSgSwapEffect(e.steps))
  );
}

/**
 * How a unit feeds the SG pellet path: its char weapon is SG, or an override declares a
 * weaponSwap with weapon 'SG' (k's burst shotgun — the only swap carrier today; her gauge feed
 * is inert by the FB lock, but the census stays engine-shaped rather than char-static).
 */
export function sgCarrierVia(slug: string): 'weapon' | 'swap' | null {
  if (data.characters[slug]?.weapon === 'SG') {
    return 'weapon';
  }
  const o = loadOverride(slug);
  if (o) {
    for (const slot of OVERRIDE_SLOTS) {
      for (const b of o[slot] ?? []) {
        if (hasSgSwapEffect(b.effects ?? [])) {
          return 'swap';
        }
      }
    }
  }
  return null;
}

export interface MultihitCarrierRow {
  slug: string;
  via: 'weapon' | 'swap';
  /** gauge per 60f of refilling, each arm */
  basePer60: number;
  trigPer60: number;
  /** uncapped gaugeGenerated, each arm */
  baseTotal: number;
  trigTotal: number;
  /** total damage, each arm (rotation collateral — the arm itself touches gauge only) */
  baseDamage: number;
  trigDamage: number;
}

export interface MultihitCreditingReport {
  comp: string;
  status: Status | 'anchor';
  measured: number | [number, number] | null;
  hasSgCarrier: boolean;
  baseFb: number;
  trigFb: number;
  baseTeamRate: number;
  trigTeamRate: number;
  carriers: MultihitCarrierRow[];
}

export interface MultihitCreditingAudit {
  /** always 'trigger' — the arm this audit sizes against the live baseline */
  arm: MultihitArm;
  reports: MultihitCreditingReport[];
}

export function auditMultihitCrediting(): MultihitCreditingAudit {
  if (process.env.SGGAUGE !== undefined) {
    throw new Error(
      `multihit-crediting audit: SGGAUGE is set (${process.env.SGGAUGE}) — the baseline arm ` +
        'must run on the live engine; unset SGGAUGE and re-run'
    );
  }
  const baseline = multihitSnapshot();
  // sim.ts reads ENV at module load, so the trigger arm runs in a child process. Spawn THIS
  // file by absolute path so the child's isMain check holds from any cwd.
  const raw = execFileSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), '--multihit-arm-snapshot'],
    {
      encoding: 'utf8',
      maxBuffer: 1 << 26,
      env: { ...process.env, SGGAUGE: 'trigger' },
    }
  );
  const trigger = JSON.parse(raw) as MultihitCompSnapshot[];
  const trigByName = new Map(trigger.map((c) => [c.name, c]));
  const panel = multihitPanel();

  const reports: MultihitCreditingReport[] = baseline.map((b) => {
    const entry = panel.find((p) => p.label === b.name);
    if (!entry) {
      throw new Error(
        `multihit-crediting audit: ${b.name} dropped from the panel`
      );
    }
    const t = trigByName.get(b.name);
    if (!t) {
      throw new Error(
        `multihit-crediting audit: trigger arm produced no snapshot for ${b.name}`
      );
    }
    const carriers: MultihitCarrierRow[] = b.units
      .filter((u) => sgCarrierVia(u.slug) !== null)
      .map((u) => {
        const tu = t.units.find((x) => x.slug === u.slug);
        if (!tu) {
          throw new Error(
            `multihit-crediting audit: ${u.slug} missing from the trigger arm of ${b.name}`
          );
        }
        return {
          slug: u.slug,
          via: sgCarrierVia(u.slug)!,
          basePer60: b.buildSec > 0 ? u.gaugeGenerated / b.buildSec : NaN,
          trigPer60: t.buildSec > 0 ? tu.gaugeGenerated / t.buildSec : NaN,
          baseTotal: u.gaugeGenerated,
          trigTotal: tu.gaugeGenerated,
          baseDamage: u.totalDamage,
          trigDamage: tu.totalDamage,
        };
      });
    return {
      comp: b.name,
      status: entry.status,
      measured: entry.measured,
      hasSgCarrier: carriers.length > 0,
      baseFb: b.fullBursts,
      trigFb: t.fullBursts,
      baseTeamRate: b.teamRate,
      trigTeamRate: t.teamRate,
      carriers,
    };
  });
  return { arm: 'trigger', reports };
}

function printMultihitCrediting(audit: MultihitCreditingAudit) {
  console.log(
    '\n===== MULTI-HIT CREDITING — SG gauge per LANDED pellet (live) vs per TRIGGER (SGGAUGE=trigger) =====\n' +
      'Deterministic EV runs, gauge-only arm (damage keeps the landed fraction). FB = Full Bursts.\n' +
      'The game-behaviour question is OPEN — these numbers size it for the owner ruling.\n'
  );
  for (const r of audit.reports) {
    const m =
      r.measured === null
        ? '(anchor comp — no measured count)'
        : Array.isArray(r.measured)
          ? `measured ${r.measured.join('-')}`
          : `measured ${r.measured}`;
    const tag = r.hasSgCarrier ? 'SG-SEATED' : 'SG-FREE (sanity)';
    console.log(
      `\n${'='.repeat(96)}\n${r.comp}  [${tag}]  —  FB ${r.baseFb} → ${r.trigFb}  (${m}, ${r.status})`
    );
    console.log(
      `  team generation  ${r.baseTeamRate.toFixed(2)} → ${r.trigTeamRate.toFixed(2)} gauge/60f` +
        (r.baseTeamRate > 0
          ? `  (+${(((r.trigTeamRate - r.baseTeamRate) / r.baseTeamRate) * 100).toFixed(1)}%)`
          : '')
    );
    for (const c of r.carriers) {
      console.log(
        `  ${c.slug.padEnd(26)} via ${c.via.padEnd(6)}  gauge ${c.basePer60.toFixed(2)} → ${c.trigPer60.toFixed(2)}/60f` +
          `   total ${c.baseTotal.toFixed(0)} → ${c.trigTotal.toFixed(0)}` +
          `   dmg ${(c.baseDamage / 1e6).toFixed(1)}M → ${(c.trigDamage / 1e6).toFixed(1)}M`
      );
    }
    if (!r.hasSgCarrier) {
      console.log(
        r.baseFb === r.trigFb && r.baseTeamRate === r.trigTeamRate
          ? '  byte-identical between arms — the arm is SG-scoped (non-SG hitFraction = 1 by construction)'
          : '  ⚠ MOVED DESPITE NO SG CARRIER — the arm is leaking past the SG path'
      );
    }
  }
}

// ============================================================================
// FOCUS-COLUMN AUDIT — item 3 of the 2026-08-13 burst-generation investigation
// plan (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
// Run it: npx tsx scripts/battery/fb-count-matrix.ts --focus-columns
//
// QUESTION: the focused charge unit's gauge multiplier is sourced per unit — the engine ladder
// (gaugePerShot(), src/engine/sim.ts): charFixes.focusChargeMult → magDumpRof /
// PENDING_TEAM_ISOLATION pin (flat 2.5) → characters.json chargeMultiplier (>0) →
// gauge-per-shot.json fullChargeBonus (>0) → 250. Does every off-count comp's focused charge
// unit resolve to a MEASURED or OWNER-CONFIRMED column?
//
// The audit is a DATA read, not a sim behaviour question: it re-walks the ladder against the
// data files + override charFixes, grades the resolved column against the column record
// (docs/data/burst-gauge.md §4; DECISIONS 2026-07-29 — the per-unit landing, the
// alice/cinderella follow-up, and the SUPERSEDES entry), and sizes how much of each filmed
// comp's shortfall a wrong column could account for. buildRows() supplies the rates.
// ============================================================================

export type FocusColumnStatus =
  'measured' | 'owner-confirmed' | 'unmeasured' | 'n/a';

export type FocusMultSource =
  | 'charFixes.focusChargeMult'
  | 'magDumpRof pin (flat 2.5)'
  | 'PENDING_TEAM_ISOLATION pin (flat 2.5)'
  | 'characters.json chargeMultiplier'
  | 'gauge-per-shot.json fullChargeBonus'
  | 'default 250';

/** The column record under audit, at COLUMN granularity (the 200 column is per-unit, below). */
const FOCUS_COLUMN_BASIS: Record<
  number,
  { status: FocusColumnStatus; basis: string }
> = {
  250: {
    status: 'measured',
    basis:
      'modal family — both solo anchors are 250-column units, pixel-exact: maiden-ice-rose 364×2.5=910(+364 rider), takina 560×2.5=1400 (burst-gauge.md §4/§6)',
  },
  350: {
    status: 'measured',
    basis:
      'alice solo shot-count bound [16.67%, 20.0%) contains the 3.5× prediction 19.6%/shot and excludes flat 2.5× (DECISIONS 2026-07-29 follow-up); the other 350 carriers (belorta/n102/yan/yuni) ride the same datamined column + owner-confirmed rule and seat no comp',
  },
  150: {
    status: 'measured',
    basis:
      'scarlet-black-shadow — solo per-shot ~1.42× (5% match) AND a team 11-FB count outside the flat-2.5× model (DECISIONS 2026-07-29 landing)',
  },
};

/** The 200 column, graded per-unit — the only column where the unit, not the number, decides. */
const FOCUS_200_BASIS: Record<
  string,
  { status: FocusColumnStatus; basis: string }
> = {
  cinderella: {
    status: 'owner-confirmed',
    basis:
      'charFixes.focusChargeMult 2.0; focusChargeMult = chargeMultiplier/100 confirmed TRUE for her, the ~2.2–3.1× reads RETRACTED as reading errors (DECISIONS 2026-07-29 SUPERSEDES entry)',
  },
  'vesti-tactical-upgrade': {
    status: 'unmeasured',
    basis:
      'pinned flat 2.5× by PENDING_TEAM_ISOLATION until a focused solo recording isolates her own column (her kit build ⚑3 carries the recipe)',
  },
};

function focusColumnStatus(
  slug: string,
  column: number
): { status: FocusColumnStatus; basis: string } {
  if (column === 200) {
    return (
      FOCUS_200_BASIS[slug] ?? {
        status: 'unmeasured',
        basis: 'unknown 200-column unit — no record',
      }
    );
  }
  return (
    FOCUS_COLUMN_BASIS[column] ?? {
      status: 'unmeasured',
      basis: `column ${column} has no record — unrecognised column is LOUD`,
    }
  );
}

/**
 * Mirror of the engine's pin set (PENDING_TEAM_ISOLATION in src/engine/sim.ts — not exported,
 * and this audit reads data files, not engine state). The fixture pins the only consequence
 * that matters here: no seated focus unit is a member, so the pin list cannot alter any row.
 */
export const PENDING_TEAM_ISOLATION_MIRROR = new Set([
  'vesti-tactical-upgrade',
]);
const FOCUS_CHARGE_GEN_FLAT = 2.5; // src/engine/sim.ts FOCUS_CHARGE_GEN — the pin's value
/** Largest live column — the most extreme upward error a wrong column could carry. */
const MAX_LIVE_FOCUS_COLUMN = 350;

export interface FocusColumnReport {
  comp: string;
  focusSlug: string;
  weapon: string;
  /** SR/RL base weapon — the only weapons the focus bonus applies to (gaugePerShot's isCharge) */
  isChargeFocus: boolean;
  /** null when the focus bonus does not apply (non-charge focus) */
  resolvedMult: number | null;
  source: FocusMultSource | null;
  columnStatus: FocusColumnStatus;
  /** the focused unit's gauge/60f (per second of refilling) and the team's rate */
  focusPer60: number;
  teamRate: number;
  /**
   * Filmed comps only: CEILING on how much of the measured generation shortfall a wrong column
   * could explain — the focused unit's whole rate scaled from its resolved column to the largest
   * live column (350). A ceiling because skill-gen does not scale with the focus multiplier.
   * null without a filmed cycle.
   */
  maxAltUpsideGaugePerSec: number | null;
  shortfallRateGaugePerSec: number | null;
  maxAltUpsideCoverPct: number | null;
}

export function auditFocusColumns(): FocusColumnReport[] {
  const rows = buildRows();
  return rows.map((r) => {
    const focus = r.focusSlug;
    const c = data.characters[focus];
    const weapon = c?.weapon ?? '?';
    const isChargeFocus = weapon === 'SR' || weapon === 'RL';
    const focusPer60 = r.per.find((u) => u.slug === focus)?.per60 ?? NaN;
    const teamRate = r.teamRate;
    const shortfallRate = r.required
      ? r.required.realRate - r.required.simRate
      : null;

    if (!isChargeFocus) {
      return {
        comp: r.off.name,
        focusSlug: focus,
        weapon,
        isChargeFocus,
        resolvedMult: null,
        source: null,
        columnStatus: 'n/a' as const,
        focusPer60,
        teamRate,
        maxAltUpsideGaugePerSec: null,
        shortfallRateGaugePerSec: shortfallRate,
        maxAltUpsideCoverPct: null,
      };
    }

    // The engine ladder, walked against the data files + override charFixes.
    const fixes = loadOverride(focus)?.charFixes;
    let resolvedMult: number;
    let source: FocusMultSource;
    if (fixes?.focusChargeMult !== undefined) {
      resolvedMult = fixes.focusChargeMult;
      source = 'charFixes.focusChargeMult';
    } else if (fixes?.magDumpRof) {
      resolvedMult = FOCUS_CHARGE_GEN_FLAT;
      source = 'magDumpRof pin (flat 2.5)';
    } else if (PENDING_TEAM_ISOLATION_MIRROR.has(focus)) {
      resolvedMult = FOCUS_CHARGE_GEN_FLAT;
      source = 'PENDING_TEAM_ISOLATION pin (flat 2.5)';
    } else {
      const charMult = c?.chargeMultiplier ?? 0;
      const fcb = gaugeTable[focus]?.fullChargeBonus;
      if (charMult > 0) {
        resolvedMult = charMult / 100;
        source = 'characters.json chargeMultiplier';
      } else if (fcb && fcb > 0) {
        resolvedMult = fcb / 100;
        source = 'gauge-per-shot.json fullChargeBonus';
      } else {
        resolvedMult = 2.5;
        source = 'default 250';
      }
    }

    const { status } = focusColumnStatus(focus, Math.round(resolvedMult * 100));
    const upside =
      focusPer60 * (MAX_LIVE_FOCUS_COLUMN / 100 / resolvedMult - 1);
    return {
      comp: r.off.name,
      focusSlug: focus,
      weapon,
      isChargeFocus,
      resolvedMult,
      source,
      columnStatus: status,
      focusPer60,
      teamRate,
      maxAltUpsideGaugePerSec: upside,
      shortfallRateGaugePerSec: shortfallRate,
      maxAltUpsideCoverPct:
        shortfallRate !== null && shortfallRate > 0
          ? (upside / shortfallRate) * 100
          : null,
    };
  });
}

export interface FocusColumnCensusRow {
  slug: string;
  weapon: string;
  /** characters.json chargeMultiplier (0 = the non-charge marker) */
  charMult: number;
  /** gauge-per-shot.json fullChargeBonus, null when the unit has no row */
  fcb: number | null;
  /** the engine ladder's data-level column, pins aside */
  resolvedColumn: number;
  status: FocusColumnStatus;
  seatedInOffComps: boolean;
}

/** Roster-wide column census: every SR/RL unit's data-level resolution + record status. */
export function focusColumnCensus(): FocusColumnCensusRow[] {
  const seated = new Set(OFF.flatMap((o) => resolve(o).slugs));
  const rows: FocusColumnCensusRow[] = [];
  for (const [slug, c] of Object.entries(data.characters)) {
    if (c.weapon !== 'SR' && c.weapon !== 'RL') {
      continue;
    }
    const charMult = c.chargeMultiplier ?? 0;
    const fcb = gaugeTable[slug]?.fullChargeBonus ?? null;
    const resolvedColumn =
      charMult > 0 ? charMult : fcb !== null && fcb > 0 ? fcb : 250;
    rows.push({
      slug,
      weapon: c.weapon,
      charMult,
      fcb,
      resolvedColumn,
      status: focusColumnStatus(slug, resolvedColumn).status,
      seatedInOffComps: seated.has(slug),
    });
  }
  return rows.sort((a, b) => a.slug.localeCompare(b.slug));
}

function printFocusColumns(
  reports: FocusColumnReport[],
  census: FocusColumnCensusRow[]
) {
  console.log(
    '\n===== FOCUS-COLUMN AUDIT — investigation-plan item 3 =====\n' +
      'Per comp: who holds the camera focus, whether the focus bonus applies (SR/RL only),\n' +
      'which column the engine ladder resolves, and the record behind that column\n' +
      "(burst-gauge.md §4, DECISIONS 2026-07-29). Decision rule: every off-count comp's focused\n" +
      'charge unit on a measured or owner-confirmed column ⇒ the item cannot explain the shortfall.\n'
  );
  for (const r of reports) {
    if (!r.isChargeFocus) {
      console.log(
        `  ${r.comp.padEnd(28)} focus=${r.focusSlug.padEnd(24)} ${r.weapon} — no focus path (non-charge weapon)`
      );
      continue;
    }
    console.log(
      `  ${r.comp.padEnd(28)} focus=${r.focusSlug.padEnd(24)} ${r.weapon} → ×${r.resolvedMult?.toFixed(1)} via ${r.source} — column ${r.columnStatus.toUpperCase()}`
    );
    if (r.maxAltUpsideCoverPct !== null) {
      console.log(
        `      wrong-column ceiling: +${r.maxAltUpsideGaugePerSec!.toFixed(2)} gauge/s at the most extreme live column (350)` +
          ` vs the measured shortfall ${r.shortfallRateGaugePerSec!.toFixed(2)} gauge/s ⇒ covers ≤${r.maxAltUpsideCoverPct.toFixed(1)}%`
      );
    }
  }
  console.log(
    "\nROSTER CENSUS — every SR/RL unit's data-level column (characters.json chargeMultiplier,\n" +
      'gauge-per-shot.json fullChargeBonus fallback, 250 default), graded against the record.\n' +
      'Non-250 columns and source disagreements only:\n'
  );
  for (const row of census) {
    const outlier = row.resolvedColumn !== 250;
    const mismatch = row.fcb !== null && row.charMult !== row.fcb;
    if (!outlier && !mismatch) {
      continue;
    }
    console.log(
      `  ${row.slug.padEnd(28)} ${row.weapon}  charMult=${row.charMult} fcb=${row.fcb ?? '—'} → column ${row.resolvedColumn} ${row.status.toUpperCase()}${row.seatedInOffComps ? '  [SEATED in an off-count comp]' : ''}${mismatch ? '  [SOURCES DISAGREE]' : ''}`
    );
  }
}

// ============================================================================
// PER-FRAME GAUGE-CREDIT SCHEDULE — the sim-side credit timeline.
// Run it: npx tsx scripts/battery/fb-count-matrix.ts --credit-schedule [--json]
//         [--comp="T5 wind-weak"] [--exact-samples=N]
//
// WHAT IT PRODUCES: for every UNLOCKED region of a comp — the fight-opening first fill and each
// [Full-Burst-end, gauge-full) refill window, the only frames where `addGauge` is not swallowed —
// the ordered list of (frame, unit slug, credited amount, source kind). That is the quantity a
// real fill trace can be compared against frame-for-frame; the existing --refill-starvation audit
// deliberately spreads a unit's WHOLE-FIGHT `gaugeGenerated` uniformly over its window hits, which
// is fine for a delivery-ratio but cannot say what the bar was fed on any given frame.
//
// WHY IT IS A RECONSTRUCTION: the event tap (`cfg.onEvent`) carries no gauge amounts — only that a
// `shot` or `damage` instance happened, with unit and frame. So the amounts are rebuilt from the
// same inputs the engine reads (data/gauge-per-shot.json, the weapon-class modal fallback, the
// camera-focus charge multiplier, the live `burstGenPct` buff sum, the skillGauge divisor), and
// `fillGauge` — which BYPASSES `addGauge` entirely and is invisible to every tap and to DBG_GAUGE —
// is rebuilt from its trigger (team ammo spend). A reconstruction is only worth as much as its
// checks, so the driver self-reports THREE independent ones and refuses to be quietly wrong:
//
//   (a) ENDPOINT — each unit's schedule must sum to the engine's own uncapped
//       `SimResult.units[].gaugeGenerated`. Catches a missed source, a wrong amount, a wrong
//       lock mask. Residuals are reported per unit, not hidden behind a boolean.
//   (b) DBG_GAUGE — `src/engine/sim.ts` logs every `addGauge`-routed credit as
//       `[g] t=… slug +X gauge=Y` for the first 30s. sim.ts reads ENV at MODULE LOAD, so the arm
//       runs in a CHILD PROCESS (same pattern as --multihit-crediting), and every logged line is
//       matched against the schedule within print rounding. This is engine truth for the shot and
//       skill channels; it is structurally blind to fillGauge, which is what (c) is for.
//   (c) TRUNCATED-RUN — `cfg.durationSec` only bounds the frame loop, so a shorter run is a strict
//       prefix of a longer one. Diffing per-unit `gaugeGenerated` across durationSec = f/60 and
//       (f+1)/60 reads the engine's ACTUAL credit at frame f — including fillGauge. Sampled at
//       `exactSamples` credit frames (fill credits sampled first, since they are the only ones the
//       other two checks cannot see). The prefix property is itself asserted, not assumed.
//
// Anything the reconstruction cannot do exactly is pushed onto `unreconstructed` and printed
// LOUD — never silently approximated.
// ============================================================================

/** Where a credit came from. `fill` bypasses addGauge (no DBG_GAUGE line, no event). */
export type GaugeCreditKind = 'shot' | 'skill' | 'fill';

export interface GaugeCredit {
  frame: number;
  sec: number;
  slug: string;
  unitIdx: number;
  kind: GaugeCreditKind;
  /** gauge percent fed to the team bar (100 = one full bar), pre-clamp */
  amount: number;
  /** index into `windows` */
  window: number;
}

export interface CreditWindow {
  index: number;
  /** the fight-opening fill is NOT a steady-state cycle; it is kept and labeled */
  kind: 'first-fill' | 'refill';
  startFrame: number;
  endFrame: number;
  startSec: number;
  endSec: number;
  /** the 180s buzzer cut this window short (the bar never filled) */
  truncated: boolean;
  credits: number;
  gauge: number;
}

export interface CreditScheduleChecks {
  endpoint: {
    slug: string;
    scheduled: number;
    engine: number;
    residual: number;
  }[];
  endpointMaxAbsResidual: number;
  endpointOk: boolean;
  dbgGauge: {
    /** `[g]` lines the engine printed (first 30s of fight time) */
    lines: number;
    matched: number;
    /** engine lines with no matching scheduled credit */
    unmatchedEngine: string[];
    /** scheduled addGauge-routed credits in the first 30s with no engine line */
    unmatchedSchedule: string[];
    ok: boolean;
  };
  prefixDeterminism: {
    ok: boolean;
    detail: string;
  };
  truncated: {
    frame: number;
    slug: string;
    /** every source kind the schedule placed on this (frame, unit) */
    kinds: GaugeCreditKind[];
    scheduled: number;
    engineStep: number;
    ok: boolean;
  }[];
  truncatedSamples: number;
  truncatedOk: boolean;
}

export interface CreditScheduleReport {
  comp: string;
  slugs: string[];
  focusSlug: string;
  fightSec: number;
  windows: CreditWindow[];
  credits: GaugeCredit[];
  perUnitScheduled: Record<string, number>;
  /** LOUD: every credit path this reconstruction could NOT rebuild exactly on this comp */
  unreconstructed: string[];
  checks: CreditScheduleChecks;
}

/** The comps the schedule is emitted for: the two with a filmed steady-state cycle. */
export const CREDIT_SCHEDULE_COMPS = ['iron sweep (run G)', 'T5 wind-weak'];

/** gauge-full -> B1 cast, in FRAMES (`PRE_B1_GAP_FRAMES`). The lock closes at gauge-full. */
const PRE_B1_FRAMES = 30;
const FIGHT_FRAMES = FIGHT_SEC * 60;
/** DBG_GAUGE's hard cap (`frame < 30 * FPS` in addGauge). */
const DBG_GAUGE_FRAME_CAP = 30 * 60;
/** addGauge prints with toFixed(2); a match must survive that rounding. */
const DBG_PRINT_EPS = 0.005 + 1e-9;
/** Floating-point slack for a sum of a few thousand doubles. */
const SUM_EPS = 1e-6;

interface RawBlock {
  slot: string;
  mode?: string;
  formation?: string;
  teamHas?: unknown;
  delaySec?: number;
  trigger: { kind: string; count?: number };
  effects: EffectDef[];
}

/** The blocks the ENGINE would run for this unit in this comp: mode-selected, ungated. */
function activeRawBlocks(
  slug: string,
  selectedMode: string | undefined,
  warn: (s: string) => void
): RawBlock[] {
  const ov = loadOverride(slug) as unknown as
    (Record<string, unknown> & { modes?: string[] }) | undefined;
  if (!ov) {
    return [];
  }
  const mode = selectedMode ?? ov.modes?.[0];
  const out: RawBlock[] = [];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of (ov[slot] ?? []) as RawBlock[]) {
      const carriesGaugePath = (b.effects ?? []).some(
        (e) => e.kind === 'weaponSwap' || e.kind === 'fillGauge'
      );
      if (!carriesGaugePath) {
        continue;
      }
      // The engine's activeBlocks filter is mode + formation + teamHas (sim.ts). Across the whole
      // override roster exactly ONE gauge-path block carries any of them, and it is `mode`
      // (cinderella-crystal-wave's Snipe weaponSwap) — so mode is implemented and the other two
      // throw a LOUD flag rather than being silently assumed inactive.
      if (b.formation !== undefined || b.teamHas !== undefined) {
        warn(
          `${slug}: gauge-path block in ${slot} carries a formation/teamHas gate this ` +
            'reconstruction does not evaluate — swap/fill timing may be wrong'
        );
      }
      if (b.delaySec !== undefined) {
        warn(
          `${slug}: gauge-path block in ${slot} carries delaySec=${b.delaySec}, ` +
            'which this reconstruction does not offset'
        );
      }
      if (b.mode !== undefined && b.mode !== mode) {
        continue;
      }
      out.push(b);
    }
  }
  return out;
}

interface SwapWindow {
  from: number;
  to: number;
  sameWeapon: boolean;
  maxShots?: number;
}

/**
 * Build the schedule for one off-count comp and run all three validation checks.
 *
 * `exactSamples` = how many credit frames the truncated-run check re-derives from the engine
 * (2 extra 180s-bounded sims each). 0 skips it; the vitest fixture runs a small N.
 */
export function creditScheduleFor(
  offName: string,
  opts: { exactSamples?: number; dbgGauge?: boolean } = {}
): CreditScheduleReport {
  const off = OFF.find((o) => o.name === offName);
  if (!off) {
    throw new Error(
      `credit-schedule: no comp named "${offName}" — known: ${OFF.map((o) => o.name).join(', ')}`
    );
  }
  const comp = resolve(off);
  const events: SimEvent[] = [];
  const res = run(comp, {}, undefined, (ev) => events.push(ev));
  const slugs = comp.slugs;
  const unreconstructed: string[] = [];
  const warn = (s: string) => {
    if (!unreconstructed.includes(s)) {
      unreconstructed.push(s);
    }
  };

  const focusIdx =
    comp.focus !== undefined
      ? Math.max(0, slugs.indexOf(comp.focus))
      : Math.min(2, slugs.length - 1);
  const focusSlug = slugs[focusIdx];

  // ---- UNLOCKED regions, frame-exact.
  // addGauge is locked while `fbEndFrame > frame || stage !== 0`. `stage` leaves 0 on the
  // gauge-full frame, which is PRE_B1_GAP_FRAMES (30f) BEFORE the B1 cast the tap reports, and
  // returns to 0 on the `fullBurstEnd` frame itself (sim.ts sets stage = 0 in that same block,
  // before any unit fires). A chain that EXPIRES also returns stage to 0; that path is not an
  // event, so it is read off the rotation log and flagged, since the log's 0.1s precision cannot
  // place it to the frame.
  const fbEndFrames: number[] = [];
  const b1Frames: number[] = [];
  for (const ev of events) {
    if (ev.kind === 'fullBurstEnd') {
      fbEndFrames.push(ev.frame);
    } else if (ev.kind === 'burstCast' && ev.stage === 1) {
      b1Frames.push(ev.frame);
    }
  }
  for (const line of res.rotationLog) {
    if (line.includes('CHAIN EXPIRED')) {
      warn(
        `chain expiry at ${line.trim()} — the refill restarts mid-cycle and the rotation log ` +
          'only carries 0.1s precision, so this window boundary is +/-3 frames'
      );
    }
  }
  const lockFrames = b1Frames
    .map((f) => f - PRE_B1_FRAMES)
    .sort((a, b) => a - b);
  const unlockFrames = [0, ...fbEndFrames].sort((a, b) => a - b);
  const windows: CreditWindow[] = unlockFrames.map((start, i) => {
    const end = lockFrames.find((x) => x > start) ?? FIGHT_FRAMES;
    return {
      index: i,
      kind: i === 0 ? ('first-fill' as const) : ('refill' as const),
      startFrame: start,
      endFrame: end,
      startSec: start / 60,
      endSec: end / 60,
      truncated: end >= FIGHT_FRAMES,
      credits: 0,
      gauge: 0,
    };
  });
  let wi = 0;
  const windowAt = (frame: number): number => {
    while (wi < windows.length && windows[wi].endFrame <= frame) {
      wi++;
    }
    return wi < windows.length && frame >= windows[wi].startFrame ? wi : -1;
  };

  // ---- weapon-swap windows. A REAL weapon change generates NO shot gauge (owner ruling
  // 2026-08-13) and also switches gaugePerShot off the charge path, so the schedule needs the
  // swap's live span. Reconstructed from the unit's OWN swap-granting block + the tap's burstCast
  // events; the uses-based (`maxShots`) exit is applied by counting the unit's shots in the span.
  const swapWindows: Record<string, SwapWindow[]> = {};
  const shotFramesBy: Record<string, number[]> = {};
  for (const s of slugs) {
    swapWindows[s] = [];
    shotFramesBy[s] = [];
  }
  for (const ev of events) {
    if (ev.kind === 'shot') {
      shotFramesBy[ev.slug]?.push(ev.frame);
    }
  }
  const fillBlocks: { slug: string; count: number; pct: number }[] = [];
  for (const s of slugs) {
    for (const b of activeRawBlocks(s, comp.modes?.[s], warn)) {
      for (const e of b.effects) {
        if (e.kind === 'weaponSwap') {
          const dur = Math.round((e.durationSec ?? 0) * 60);
          const sameWeapon = e.sameWeapon === true;
          if (
            b.trigger.kind === 'passive' ||
            b.trigger.kind === 'battleStart'
          ) {
            swapWindows[s].push({
              from: 0,
              to: dur,
              sameWeapon,
              maxShots: e.maxShots,
            });
          } else if (b.trigger.kind === 'burstCast') {
            for (const ev of events) {
              if (ev.kind === 'burstCast' && ev.slug === s) {
                swapWindows[s].push({
                  from: ev.frame,
                  to: ev.frame + dur,
                  sameWeapon,
                  maxShots: e.maxShots,
                });
              }
            }
          } else {
            warn(
              `${s}: weaponSwap on a "${b.trigger.kind}" trigger — this reconstruction only ` +
                'places passive/battleStart/burstCast swaps, so its shot credits may be wrong'
            );
          }
        } else if (e.kind === 'fillGauge') {
          if (b.trigger.kind === 'teamAmmo' && b.trigger.count !== undefined) {
            fillBlocks.push({ slug: s, count: b.trigger.count, pct: e.pct });
          } else {
            warn(
              `${s}: fillGauge on a "${b.trigger.kind}" trigger — this reconstruction only ` +
                'places teamAmmo-triggered fills, so its fill credits are MISSING'
            );
          }
        }
      }
    }
  }
  for (const s of slugs) {
    for (const w of swapWindows[s]) {
      if (w.maxShots == null) {
        continue;
      }
      const inside = shotFramesBy[s].filter((f) => f >= w.from && f < w.to);
      if (inside.length >= w.maxShots) {
        // the uses-based exit fires right AFTER the Nth shot (sim.ts firePull)
        w.to = inside[w.maxShots - 1] + 1;
      }
    }
  }
  const swapAt = (s: string, frame: number): SwapWindow | undefined =>
    swapWindows[s].find((w) => frame >= w.from && frame < w.to);

  // ---- live burstGenPct, per unit. addGauge multiplies every credit by
  // `burstGenMult * (1 + stat(burstGenPct)/100)`; the static half is folded into the engine's
  // burstGenMult from `extraStats` (cube/OL/doll), the dynamic half is a buff, and buff grants ARE
  // on the tap. Reconstructed by replaying buffApply keyed exactly as the engine does (one entry
  // per key, value * stacks, live while expiresFrame is null or in the future).
  interface LiveBuff {
    value: number;
    stacks: number;
    expiresFrame: number | null;
  }
  const bgLive: Record<string, Map<string, LiveBuff>> = {};
  for (const s of slugs) {
    bgLive[s] = new Map();
  }
  const bgApplies = events.filter(
    (e): e is Extract<SimEvent, { kind: 'buffApply' }> =>
      e.kind === 'buffApply' &&
      e.stat === 'burstGenPct' &&
      e.targetSlug !== null
  );
  if (bgApplies.length) {
    for (const s of slugs) {
      for (const b of activeRawBlocksAll(s, comp.modes?.[s])) {
        for (const e of b.effects) {
          if (
            e.kind === 'buff' &&
            e.stat === 'burstGenPct' &&
            (e.rampSec !== undefined || e.whileSwapped !== undefined)
          ) {
            warn(
              `${s}: a burstGenPct buff carries rampSec/whileSwapped, which the buffApply event ` +
                'does not expose — the live multiplier may be wrong'
            );
          }
        }
      }
    }
  }
  let bgPtr = 0;
  const burstGenPctAt = (slug: string, frame: number): number => {
    while (bgPtr < bgApplies.length && bgApplies[bgPtr].frame <= frame) {
      const b = bgApplies[bgPtr];
      bgLive[b.targetSlug!]?.set(b.key, {
        value: b.value,
        stacks: b.stacks,
        expiresFrame: b.expiresFrame,
      });
      bgPtr++;
    }
    let sum = 0;
    for (const v of bgLive[slug]?.values() ?? []) {
      if (v.expiresFrame === null || v.expiresFrame > frame) {
        sum += v.value * v.stacks;
      }
    }
    return sum;
  };

  // ---- gaugePerShot: the engine's own ladder (sim.ts), sourced from the same two data files.
  const gaugePerShot = (
    slug: string,
    idx: number,
    swapped: boolean
  ): number => {
    const c = data.characters[slug];
    const row = gaugeTable[slug];
    const per =
      (row?.targetPerTrigger ?? CENSUS_GAUGE_MODAL_BY_WEAPON[c.weapon] ?? 40) /
      100;
    const flat = (row?.flatPerTrigger ?? 0) / 100;
    const isCharge = (c.weapon === 'SR' || c.weapon === 'RL') && !swapped;
    if (!isCharge) {
      return per + flat;
    }
    const ov = loadOverride(slug) as unknown as
      | { charFixes?: { focusChargeMult?: number; magDumpRof?: boolean } }
      | undefined;
    const charMult = c.chargeMultiplier ?? 0;
    const fcb = row?.fullChargeBonus;
    const focusMult =
      ov?.charFixes?.focusChargeMult ??
      (ov?.charFixes?.magDumpRof || slug === 'vesti-tactical-upgrade'
        ? 2.5 // FOCUS_CHARGE_GEN
        : (charMult > 0 ? charMult : fcb && fcb > 0 ? fcb : 250) / 100);
    // UNFOCUSED_CHARGE_GEN = 1.0 (measured, battery 3 A1/A2)
    return per * (idx === focusIdx ? focusMult : 1.0) + flat;
  };

  for (const s of slugs) {
    for (const b of activeRawBlocksAll(s, comp.modes?.[s])) {
      for (const e of b.effects) {
        if (e.kind === 'storedHit' || e.kind === 'stackedNuke') {
          warn(
            `${s}: carries a ${e.kind} impact, which produces a damage event but emits NO gauge — ` +
              'if one lands unlocked the schedule over-credits it (the endpoint check is the arbiter)'
          );
        }
      }
    }
  }

  // ---- fold the frame-ordered event stream into the schedule.
  const credits: GaugeCredit[] = [];
  const perUnitScheduled: Record<string, number> = {};
  for (const s of slugs) {
    perUnitScheduled[s] = 0;
  }
  const push = (
    frame: number,
    slug: string,
    unitIdx: number,
    kind: GaugeCreditKind,
    amount: number
  ) => {
    const w = windowAt(frame);
    if (w < 0) {
      return; // locked: addGauge/fillGauge both swallow it
    }
    credits.push({
      frame,
      sec: frame / 60,
      slug,
      unitIdx,
      kind,
      amount,
      window: w,
    });
    perUnitScheduled[slug] += amount;
    windows[w].credits++;
    windows[w].gauge += amount;
  };
  const teamAmmoResidual = new Map<number, number>(
    fillBlocks.map((_, i) => [i, 0])
  );
  for (const ev of events) {
    if (ev.kind === 'shot') {
      const c = data.characters[ev.slug];
      const sw = swapAt(ev.slug, ev.frame);
      // shotGauge: a REAL weapon change emits nothing at all; a same-weapon flavor swap still
      // feeds the bar (and off the non-charge branch, since `isCharge` reads `!u.swap`).
      if (!(sw && !sw.sameWeapon)) {
        const rounds = c.weapon === 'MG' ? c.hitsPerShot : 1;
        const energy =
          gaugePerShot(ev.slug, ev.unitIdx, sw !== undefined) *
          rounds *
          ev.hitFraction;
        push(
          ev.frame,
          ev.slug,
          ev.unitIdx,
          'shot',
          energy * (1 + burstGenPctAt(ev.slug, ev.frame) / 100)
        );
      }
      // teamAmmo accrual: every non-unlimited pull spends `consumed` rounds off the BASE weapon's
      // economy, and every teamAmmo block on the team counts them (sim.ts firePull).
      if (!ev.unlimitedAmmo && fillBlocks.length) {
        const consumed = c.weapon === 'MG' ? c.hitsPerShot : 1;
        fillBlocks.forEach((fb, i) => {
          let r = (teamAmmoResidual.get(i) ?? 0) + consumed;
          while (r >= fb.count) {
            r -= fb.count;
            const idx = slugs.indexOf(fb.slug);
            push(ev.frame, fb.slug, idx, 'fill', fb.pct);
          }
          teamAmmoResidual.set(i, r);
        });
      }
    } else if (
      ev.kind === 'damage' &&
      (ev.bucket === 'skill' || ev.bucket === 'burst')
    ) {
      // skillGauge: one target-base impact per skill/burst damage instance (flatDamage procs,
      // hitRepeat, flighted landings, DoT ticks, the extraHitDamagePct rider).
      push(
        ev.frame,
        ev.slug,
        ev.unitIdx,
        'skill',
        skillImpactGauge(ev.slug) * (1 + burstGenPctAt(ev.slug, ev.frame) / 100)
      );
    }
  }

  // ================= CHECK (a): endpoint =================
  const endpoint = res.units.map((u) => ({
    slug: u.slug,
    scheduled: perUnitScheduled[u.slug] ?? 0,
    engine: u.gaugeGenerated,
    residual: (perUnitScheduled[u.slug] ?? 0) - u.gaugeGenerated,
  }));
  const endpointMaxAbsResidual = endpoint.reduce(
    (m, e) => Math.max(m, Math.abs(e.residual)),
    0
  );

  // ================= CHECK (b): DBG_GAUGE first 30s =================
  const dbg =
    opts.dbgGauge === false
      ? {
          lines: 0,
          matched: 0,
          unmatchedEngine: [],
          unmatchedSchedule: [],
          ok: true,
        }
      : matchDbgGauge(off.name, credits);

  // ================= CHECK (c): truncated-run =================
  const nSamples = opts.exactSamples ?? 20;
  /**
   * Per-unit cumulative `gaugeGenerated` over frames [0, frame-1], read from a truncated run.
   *
   * The half-frame offset is load-bearing: the engine's loop bound is `cfg.durationSec * FPS`, and
   * `frame / 60 * 60` is not exactly `frame` in binary floating point — 1939/60*60 rounds UP, so a
   * naive `durationSec = frame/60` silently runs ONE FRAME TOO MANY and reports a credit as
   * already-counted (observed on T5 wind-weak, frame 1939). Landing the bound half a frame short
   * makes the truncation unambiguous.
   */
  const gaugeThrough = (frame: number): Record<string, number> => {
    const r = run(comp, {}, undefined, undefined, {
      durationSec: (frame - 0.5) / 60,
    });
    return Object.fromEntries(r.units.map((u) => [u.slug, u.gaugeGenerated]));
  };
  const truncated: CreditScheduleChecks['truncated'] = [];
  let prefixOk = true;
  let prefixDetail = 'not run (exactSamples = 0)';
  if (nSamples > 0 && credits.length) {
    // The prefix property itself: a durationSec = 180 run must reproduce the default run exactly
    // (nothing but the loop bound reads it), and the cumulative must be monotone across the
    // sampled boundaries.
    const full = Object.fromEntries(
      run(comp, {}, undefined, undefined, { durationSec: FIGHT_SEC }).units.map(
        (u) => [u.slug, u.gaugeGenerated]
      )
    );
    const mismatched = res.units.filter(
      (u) => Math.abs(full[u.slug] - u.gaugeGenerated) > SUM_EPS
    );
    prefixOk = mismatched.length === 0;
    prefixDetail = prefixOk
      ? 'durationSec=180 reproduces the default run per-unit exactly; cumulative monotone across sampled boundaries'
      : `durationSec=180 diverges from the default run for ${mismatched.map((u) => u.slug).join(', ')}`;

    // Sample fill credits FIRST — they are the only kind neither (a) nor (b) can localize.
    const byPriority = [
      ...credits.filter((c) => c.kind === 'fill'),
      ...credits.filter((c) => c.kind !== 'fill'),
    ];
    const fills = credits.filter((c) => c.kind === 'fill').length;
    const picked: GaugeCredit[] = [];
    const seenFrames = new Set<number>();
    const stride = Math.max(1, Math.floor(byPriority.length / nSamples));
    for (let i = 0; i < byPriority.length && picked.length < nSamples; i += 1) {
      const c = byPriority[i];
      if (seenFrames.has(c.frame)) {
        continue;
      }
      // dense-sample the fills, stride-sample the rest
      if (i >= fills && (i - fills) % stride !== 0) {
        continue;
      }
      seenFrames.add(c.frame);
      picked.push(c);
    }
    const cache = new Map<number, Record<string, number>>();
    const at = (f: number) => {
      let v = cache.get(f);
      if (!v) {
        v = gaugeThrough(f);
        cache.set(f, v);
      }
      return v;
    };
    let prevFrame = -1;
    let prevSum = -1;
    for (const c of picked.sort((a, b) => a.frame - b.frame)) {
      const before = at(c.frame);
      const after = at(c.frame + 1);
      const sumBefore = Object.values(before).reduce((a, b) => a + b, 0);
      if (prevFrame >= 0 && sumBefore + SUM_EPS < prevSum) {
        prefixOk = false;
        prefixDetail = `cumulative gauge DROPPED between frame ${prevFrame} and ${c.frame} — durationSec is not a strict prefix`;
      }
      prevFrame = c.frame;
      prevSum = sumBefore;
      // every unit's step at this frame, against everything the schedule placed there
      for (const s of slugs) {
        const step = (after[s] ?? 0) - (before[s] ?? 0);
        const here = credits.filter((x) => x.frame === c.frame && x.slug === s);
        const sched = here.reduce((a, x) => a + x.amount, 0);
        if (Math.abs(step) < SUM_EPS && Math.abs(sched) < SUM_EPS) {
          continue;
        }
        truncated.push({
          frame: c.frame,
          slug: s,
          // every kind the schedule placed on this (frame, unit) — a frame can carry a pull, its
          // rider and a fill at once, so this is a list rather than one guessed label
          kinds: [...new Set(here.map((x) => x.kind))].sort(),
          scheduled: sched,
          engineStep: step,
          ok: Math.abs(step - sched) < 1e-6,
        });
      }
    }
  }

  const checks: CreditScheduleChecks = {
    endpoint,
    endpointMaxAbsResidual,
    endpointOk: endpointMaxAbsResidual < SUM_EPS,
    dbgGauge: dbg,
    prefixDeterminism: { ok: prefixOk, detail: prefixDetail },
    truncated,
    truncatedSamples: new Set(truncated.map((t) => t.frame)).size,
    truncatedOk: truncated.every((t) => t.ok),
  };

  return {
    comp: off.name,
    slugs,
    focusSlug,
    fightSec: FIGHT_SEC,
    windows,
    credits,
    perUnitScheduled,
    unreconstructed,
    checks,
  };
}

/** Every block the engine would run for this unit, mode-filtered — used for the LOUD scans. */
function activeRawBlocksAll(
  slug: string,
  selectedMode: string | undefined
): RawBlock[] {
  const ov = loadOverride(slug) as unknown as
    (Record<string, unknown> & { modes?: string[] }) | undefined;
  if (!ov) {
    return [];
  }
  const mode = selectedMode ?? ov.modes?.[0];
  const out: RawBlock[] = [];
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of (ov[slot] ?? []) as RawBlock[]) {
      if (b.mode !== undefined && b.mode !== mode) {
        continue;
      }
      out.push(b);
    }
  }
  return out;
}

/**
 * CHECK (b). sim.ts reads its debug env at MODULE LOAD, so DBG_GAUGE cannot be toggled in
 * process — the arm runs in a child, exactly like the --multihit-crediting trigger arm. Every
 * `[g]` line the engine printed (fight time < 30s) is matched against the schedule's
 * addGauge-routed credits at the same frame and unit, within the log's toFixed(2) rounding.
 * `fill` credits are excluded BY CONSTRUCTION: fillGauge bypasses addGauge and prints nothing.
 */
function matchDbgGauge(
  offName: string,
  credits: GaugeCredit[]
): CreditScheduleChecks['dbgGauge'] {
  const raw = execFileSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), `--credit-schedule-dbg=${offName}`],
    {
      encoding: 'utf8',
      maxBuffer: 1 << 26,
      env: { ...process.env, DBG_GAUGE: '1' },
    }
  );
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('[g] '));
  // pool the schedule's addGauge-routed credits by frame+slug, so several credits on one frame
  // (a pull plus its rider) are matched as a multiset rather than by position
  const pool = new Map<string, number[]>();
  for (const c of credits) {
    if (c.kind === 'fill' || c.frame >= DBG_GAUGE_FRAME_CAP) {
      continue;
    }
    const k = `${c.frame}|${c.slug}`;
    const arr = pool.get(k) ?? [];
    arr.push(c.amount);
    pool.set(k, arr);
  }
  let matched = 0;
  const unmatchedEngine: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\[g\] t=([\d.]+) (\S+) \+(-?[\d.]+) gauge=/);
    if (!m) {
      unmatchedEngine.push(`${line}  (unparseable)`);
      continue;
    }
    const frame = Math.round(parseFloat(m[1]) * 60);
    const k = `${frame}|${m[2]}`;
    const arr = pool.get(k);
    const want = parseFloat(m[3]);
    const at = arr?.findIndex((a) => Math.abs(a - want) <= DBG_PRINT_EPS) ?? -1;
    if (arr && at >= 0) {
      arr.splice(at, 1);
      matched++;
    } else {
      unmatchedEngine.push(line);
    }
  }
  const unmatchedSchedule: string[] = [];
  for (const [k, arr] of pool) {
    for (const a of arr) {
      unmatchedSchedule.push(`${k} +${a.toFixed(2)}`);
    }
  }
  return {
    lines: lines.length,
    matched,
    unmatchedEngine,
    unmatchedSchedule,
    ok: unmatchedEngine.length === 0 && unmatchedSchedule.length === 0,
  };
}

/** Child-process entry point for CHECK (b): run the comp so addGauge's `[g]` lines hit stdout. */
function emitDbgGauge(offName: string) {
  const off = OFF.find((o) => o.name === offName);
  if (!off) {
    throw new Error(`credit-schedule-dbg: no comp named "${offName}"`);
  }
  run(resolve(off), {}, undefined);
}

/** Schedule + checks for both filmed comps. Exported so the vitest fixture can pin them. */
export function auditCreditSchedule(
  opts: { exactSamples?: number; dbgGauge?: boolean; comps?: string[] } = {}
): CreditScheduleReport[] {
  return (opts.comps ?? CREDIT_SCHEDULE_COMPS).map((n) =>
    creditScheduleFor(n, opts)
  );
}

function printCreditSchedule(reports: CreditScheduleReport[]) {
  console.log(
    '\n===== PER-FRAME GAUGE-CREDIT SCHEDULE =====\n' +
      'Every gauge credit the sim feeds the bar, by frame, unit, amount and source, over the\n' +
      'UNLOCKED regions only (the fight-opening first fill + each [FB-end, gauge-full) refill).\n' +
      'kinds: shot = one trigger pull (shotGauge) | skill = one skill/burst impact (skillGauge)\n' +
      '       fill = a "Fills Burst Gauge X%" effect, which BYPASSES addGauge (no log, no event).\n'
  );
  for (const r of reports) {
    console.log(
      `\n${'='.repeat(96)}\n${r.comp} — focus ${r.focusSlug} — ${r.windows.length} unlocked regions, ${r.credits.length} credits`
    );
    if (r.unreconstructed.length) {
      console.log('\n  ⚑ NOT RECONSTRUCTED EXACTLY:');
      for (const u of r.unreconstructed) {
        console.log(`      - ${u}`);
      }
    }
    console.log('\n  VALIDATION');
    console.log(
      `    (a) endpoint      : ${r.checks.endpointOk ? 'PASS' : 'FAIL'} — max |schedule - engine gaugeGenerated| = ${r.checks.endpointMaxAbsResidual.toExponential(2)}`
    );
    for (const e of r.checks.endpoint) {
      console.log(
        `          ${e.slug.padEnd(26)} scheduled ${e.scheduled.toFixed(4).padStart(11)}  engine ${e.engine.toFixed(4).padStart(11)}  residual ${e.residual.toExponential(2)}`
      );
    }
    console.log(
      `    (b) DBG_GAUGE     : ${r.checks.dbgGauge.ok ? 'PASS' : 'FAIL'} — ${r.checks.dbgGauge.matched}/${r.checks.dbgGauge.lines} engine [g] lines matched (first 30s; fillGauge is invisible here by construction)`
    );
    for (const l of r.checks.dbgGauge.unmatchedEngine.slice(0, 8)) {
      console.log(`          unmatched engine line: ${l}`);
    }
    for (const l of r.checks.dbgGauge.unmatchedSchedule.slice(0, 8)) {
      console.log(`          unmatched scheduled  : ${l}`);
    }
    console.log(
      `    (c) truncated run : ${r.checks.truncatedOk ? 'PASS' : 'FAIL'} — ${r.checks.truncated.filter((t) => t.ok).length}/${r.checks.truncated.length} per-unit steps over ${r.checks.truncatedSamples} sampled frames`
    );
    for (const t of r.checks.truncated.filter((x) => !x.ok).slice(0, 8)) {
      console.log(
        `          f=${t.frame} ${t.slug}: scheduled ${t.scheduled.toFixed(4)} vs engine step ${t.engineStep.toFixed(4)}`
      );
    }
    console.log(
      `        prefix determinism: ${r.checks.prefixDeterminism.ok ? 'HELD' : 'BROKEN'} — ${r.checks.prefixDeterminism.detail}`
    );

    console.log(
      `\n  ${'window'.padEnd(7)} ${'span (s)'.padEnd(17)} ${'len'.padStart(6)} ${'credits'.padStart(8)} ${'gauge'.padStart(8)}  per-unit gauge`
    );
    for (const w of r.windows) {
      const per = r.slugs
        .map((s) => {
          const g = r.credits
            .filter((c) => c.window === w.index && c.slug === s)
            .reduce((a, c) => a + c.amount, 0);
          return g > 0 ? `${s} ${g.toFixed(1)}` : null;
        })
        .filter(Boolean)
        .join(', ');
      console.log(
        `  ${String(w.index).padEnd(7)} ${`${w.startSec.toFixed(2)}-${w.endSec.toFixed(2)}`.padEnd(17)} ${(w.endFrame - w.startFrame + 'f').padStart(6)} ${String(w.credits).padStart(8)} ${w.gauge.toFixed(1).padStart(8)}  ${per}${w.truncated ? '   [truncated at the buzzer]' : ''}`
      );
    }
  }
  console.log(
    `\n${'='.repeat(96)}\n` +
      'Use --json for the full (frame, slug, amount, kind) list per window. This instrument makes\n' +
      'NO claim about the game — it reports what the SIM credits, for a measurement to be held\n' +
      'against.\n'
  );
}

// The matrix + audits run only on direct CLI invocation — vitest imports the audit functions
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
  } else if (process.argv.includes('--gauge-sources')) {
    const reports = auditGaugeSources();
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(reports, null, 2));
    } else {
      printGaugeSources(reports);
    }
  } else if (process.argv.includes('--focus-columns')) {
    const reports = auditFocusColumns();
    if (process.argv.includes('--json')) {
      console.log(
        JSON.stringify({ reports, census: focusColumnCensus() }, null, 2)
      );
    } else {
      printFocusColumns(reports, focusColumnCensus());
    }
  } else if (process.argv.includes('--multihit-crediting')) {
    const audit = auditMultihitCrediting();
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(audit, null, 2));
    } else {
      printMultihitCrediting(audit);
    }
  } else if (process.argv.includes('--multihit-arm-snapshot')) {
    // child-process entry point for the audit's trigger arm (arm = caller's env)
    console.log(JSON.stringify(multihitSnapshot()));
  } else if (process.argv.some((a) => a.startsWith('--credit-schedule-dbg='))) {
    // child-process entry point for the schedule's DBG_GAUGE arm (env = caller's)
    emitDbgGauge(
      process.argv
        .find((a) => a.startsWith('--credit-schedule-dbg='))!
        .split('=')
        .slice(1)
        .join('=')
    );
  } else if (process.argv.includes('--credit-schedule')) {
    const compArg = process.argv.find((a) => a.startsWith('--comp='));
    const samplesArg = process.argv.find((a) =>
      a.startsWith('--exact-samples=')
    );
    const reports = auditCreditSchedule({
      comps: compArg ? [compArg.slice('--comp='.length)] : undefined,
      exactSamples: samplesArg
        ? Number(samplesArg.slice('--exact-samples='.length))
        : undefined,
    });
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(reports, null, 2));
    } else {
      printCreditSchedule(reports);
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
