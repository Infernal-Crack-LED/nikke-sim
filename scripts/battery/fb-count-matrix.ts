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

import type { DataFile } from '../../src/types.js';
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
    status: 'disabled',
    note: 'FOOTAGE slot order, not the regression roster. CV re-scan 2026-08-13 reads 13.',
  },
  {
    name: 'T5 wind-weak',
    from: 'T5 wind-weak probe (boss Iron)',
    measured: 13,
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
function endState(
  log: string[],
  extendedLog: string[]
): { state: string; detail: string; shortBySec: number } {
  const { fbs, stages } = parseRotation(log);
  const lastFb = fbs[fbs.length - 1];

  // How far short the fight actually ended, MEASURED by re-running past the buzzer (DURATION=) and
  // reading when the next chain would have opened — NOT estimated from the mean refill.
  //
  // ⚑ An earlier version of this script estimated it as `meanRefill − elapsedRefill`, and was wrong
  // by up to 4x (iron sweep read "short by 1.32s"; it is actually 0.30s). Two reasons, both fatal to
  // the estimate: the FINAL refill is not the mean one — per-cycle refills vary with boss
  // transitions, buff state and reload phase — and gauge does not accrue linearly in time anyway
  // (charge weapons deliver it in lumps, MG wind-up ramps, reloads pause it). For the same reason
  // this reports TIME, never "the bar is N% full": the gauge level at the buzzer is not exposed by
  // the engine, and elapsed-refill-fraction is not a proxy for it.
  const ext = parseRotation(extendedLog);
  const nextFb = ext.fbs.find((f) => f.start > FIGHT_SEC);
  const lastEnd = lastFb ? lastFb.end : 0;
  const nextB1 = ext.stages.find((s) => s.stage === 1 && s.t > lastEnd);
  const gaugeFullAt = nextB1 ? nextB1.t - PRE_B1_SEC : NaN;
  const shortBySec = nextFb ? nextFb.start - FIGHT_SEC : NaN;
  const nextTxt = nextFb
    ? ` — next Full Burst would start ${nextFb.start.toFixed(1)}s, i.e. ${shortBySec.toFixed(2)}s past the buzzer`
    : '';

  if (lastFb && lastFb.end > FIGHT_SEC && lastFb.start <= FIGHT_SEC) {
    return {
      state: 'MID-FULL-BURST',
      detail: `${(lastFb.end - FIGHT_SEC).toFixed(2)}s of Full Burst left (started ${lastFb.start.toFixed(1)}s, would end ${lastFb.end.toFixed(1)}s)${nextTxt}`,
      shortBySec,
    };
  }

  // a chain cast after the last Full Burst ended means the chain is still climbing at the buzzer
  const openChain = stages.filter((s) => s.t > lastEnd && s.t <= FIGHT_SEC);
  if (openChain.length) {
    const top = openChain[openChain.length - 1];
    return {
      state: 'MID-CHAIN',
      detail: `B${'I'.repeat(top.stage)} cast at ${top.t.toFixed(1)}s was the last step${nextTxt}`,
      shortBySec,
    };
  }

  return {
    state: 'GAUGE FILLING',
    detail:
      `refilling for ${(FIGHT_SEC - lastEnd).toFixed(2)}s (since the ${lastEnd.toFixed(1)}s Full Burst ended); ` +
      `the bar would fill at ${gaugeFullAt.toFixed(1)}s — ${Math.max(0, gaugeFullAt - FIGHT_SEC).toFixed(2)}s short of full${nextTxt}`,
    shortBySec,
  };
}

/** The measured tempo gap: real cycle minus sim cycle, docs/probe-runs.md 2026-08-13. */
const MEASURED_GAP_SEC = 1.65;

const rows = OFF.map((off) => {
  const comp = resolve(off);
  const res = run(comp, {}, undefined);
  // Second run PAST the buzzer, purely to read when the next chain/Full Burst would have landed.
  // Diagnostic only — see the DURATION note in scripts/experiment.ts.
  process.env.DURATION = '215';
  const ext = run(comp, {}, undefined);
  delete process.env.DURATION;
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
    end: endState(res.rotationLog, ext.rotationLog),
    fbDur: fbs.length ? fbs[0].end - fbs[0].start : NaN,
    // COUNTERFACTUAL, NOT A PREDICTION: what the count becomes if the measured tempo gap is applied
    // as a FLAT per-cycle subtraction. This is an extrapolation from the two comps that were
    // actually filmed onto seven that were not; where it misses, the MISS is the interesting part.
    period,
    counterfactual:
      1 + Math.floor((FIGHT_SEC - firstFb) / (period - MEASURED_GAP_SEC)),
  };
});

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
    const mNum = Array.isArray(r.off.measured)
      ? r.off.measured[0]
      : r.off.measured;
    console.log(
      `  COUNTERFACTUAL      : period ${r.period.toFixed(2)}s − 1.65s = ${(r.period - 1.65).toFixed(2)}s  =>  ${r.counterfactual} FBs vs measured ${mNum}` +
        `  ${r.counterfactual === mNum ? '[MATCH]' : r.counterfactual > mNum ? '[OVERSHOOTS]' : '[still short]'}`
    );
  }
  console.log(
    `\n${'='.repeat(96)}\n` +
      'Read the buzzer line against the shortfall: a team ending MID-CHAIN or late in a refill was\n' +
      'close to one more Full Burst, so a faster refill recovers the missing count directly. A team\n' +
      'ending early in a refill is short by more than one cycle of error.\n'
  );
}
