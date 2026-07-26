// Burst-CDR ranking board — the 15 `burst-cdr`-tagged units, ranked by NOMINAL
// team burst-cooldown reduction per 40 seconds of fight. No full-team sim needed:
// FB-triggered values are kit constants, and the four shot-triggered units get
// their trigger cadence from a solo bursts-disabled run (UnitResult.pulls — the
// engine's own fire model, so cadence quirks like SR bolt recovery come free).
//
// Methodology (2026-07-26, owner: "read from skills / simple script"):
//   - FB-triggered CDR fires once per Full Burst; the board assumes a STANDARD
//     20s full-burst cycle (the sim's own rotations run ~17-22s), i.e. 2 procs
//     per 40s: cdrPer40s = 2 × per-FB value.
//   - Escalating ladders ("each subsequent effect triggers all before it") are
//     cumulative: liter cycle 1/2/3+ = 2.34 / 5.04 / 8.21 per FB. The board
//     ranks on the CAPPED value and carries the ramp alongside.
//   - Shot-triggered CDR (dorothy last-bullet; d-killer-wife/rouge per 8 Full
//     Charge shots; milk per 10) scales with the unit's own datamined cadence:
//     procs per 40s = (solo pulls × 40/180) ÷ shots-per-proc.
//   - NOMINAL, not effective: the engine wastes CDR landing on a target already
//     off cooldown, so real rotations capture less. Gated lines (formation,
//     own-burst, status) are noted in `condition`, not deducted.
//   - Self-only CDR (rapi-red-hood/moran/milk self ▼20) is a note column, never
//     part of the ranked team value.
//
// Kit values verified against data/characters.json prose 2026-07-26 (all 15).
import type { SimConfig } from '../types.js';
import { prepareTeam, type UnitOptions } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import type { RanksCtx } from './burstgen.js';

// Standard full-burst cycle assumption (sec) → procs per 40s for FB-triggered CDR.
export const FB_CYCLE_SEC = 20;
const FB_PROCS_PER_40 = 40 / FB_CYCLE_SEC; // 2

type CdrSource =
  | { kind: 'perFb'; perFb: number; ramp?: number[] }      // per Full Burst (ramp = cumulative per-entry values)
  | { kind: 'perShots'; cdr: number; shots: number };      // CDR per N charged/trigger shots

interface CdrRow {
  source: CdrSource;
  condition?: string; // gate that must hold for the line to fire
  selfCdr?: number;   // self-only CDR component (sec) — note column
  kit: string;        // one-line kit reference
}

// The 15 burst-cdr-tagged units. Values = L10 prose (scope lock runs 10/10/10).
export const CDR_TABLE: Record<string, CdrRow> = {
  liter: {
    source: { kind: 'perFb', perFb: 8.21, ramp: [2.34, 5.04, 8.21] },
    kit: 'S1: entering Full Burst, team ▼2.34/2.7/3.17 escalating',
  },
  volume: {
    source: { kind: 'perFb', perFb: 8.21, ramp: [2.34, 5.04, 8.21] },
    kit: 'S2: entering Full Burst, team ▼2.34/2.7/3.17 escalating',
  },
  'little-mermaid': {
    source: { kind: 'perFb', perFb: 7.48 },
    kit: 'S1: when Full Burst ends, team ▼7.48',
  },
  'anis-star': {
    source: { kind: 'perFb', perFb: 7.48 },
    condition: 'only if no other Burst 1 ally (also fires at battle start)',
    kit: 'S1: battle start + when Full Burst ends, team ▼7.48',
  },
  'rapi-red-hood': {
    source: { kind: 'perFb', perFb: 7.48 },
    condition: 'only while in Combat Assist (no Burst 1 ally)',
    selfCdr: 20, // burst stage-1 cast: self ▼20
    kit: 'S1: entering Full Burst in Combat Assist, team ▼7.48',
  },
  moran: {
    source: { kind: 'perFb', perFb: 7.48 },
    condition: 'only while in Fervor (her normal state)',
    selfCdr: 20, // S1 Fervor: self ▼20 continuously
    kit: 'S2: entering Full Burst in Fervor, team ▼7.48',
  },
  'soline-frost-ticket': {
    source: { kind: 'perFb', perFb: 7.48 },
    kit: 'S1: entering Full Burst, team ▼7.48',
  },
  arcana: {
    source: { kind: 'perFb', perFb: 6 },
    condition: 'when Full Burst ends, only in Wheel of Fortune (rotations where she bursts)',
    kit: 'S2 Death: when Full Burst ends in Wheel of Fortune, team ▼6',
  },
  sakura: {
    source: { kind: 'perFb', perFb: 4.84 },
    kit: 'S2: entering Full Burst, team ▼4.84',
  },
  dolla: {
    source: { kind: 'perFb', perFb: 6.62, ramp: [1.82, 4.02, 6.62] },
    kit: 'S2: entering Full Burst, team ▼1.82/2.2/2.6 escalating',
  },
  'helm-aquamarine': {
    source: { kind: 'perFb', perFb: 6.62, ramp: [1.82, 4.02, 6.62] },
    kit: 'S1: entering Full Burst, team ▼1.82/2.2/2.6 escalating',
  },
  dorothy: {
    source: { kind: 'perShots', cdr: 1.56, shots: 60 }, // last bullet of her 60-round AR mag
    kit: 'S1: firing the last bullet, team ▼1.56',
  },
  'd-killer-wife': {
    source: { kind: 'perShots', cdr: 7, shots: 8 },
    kit: 'S2: after 8 Full Charge attacks, team ▼7',
  },
  rouge: {
    source: { kind: 'perShots', cdr: 7, shots: 8 },
    kit: 'S1: after 8 Full Charge attacks, team ▼7',
  },
  milk: {
    source: { kind: 'perShots', cdr: 2.83, shots: 10 },
    selfCdr: 20, // S1: self ▼20 continuously (40s → 20s)
    kit: 'S2: after 10 Full Charge attacks, team ▼2.83',
  },
};

export interface CdrEntry {
  slug: string;
  cdrPer40s: number;    // nominal team CDR seconds per 40s (capped for escalating)
  ramp?: number[];      // escalating: per-40s value by entry count (1st / 2nd / 3rd+)
  condition?: string;
  selfCdr?: number;
  kit: string;
  rank: number;
}

// Solo pulls over 180s (bursts disabled — pure weapon cadence) for the
// shot-triggered rows. Deterministic expected-value run.
function soloPulls(slug: string, ctx: RanksCtx): number {
  const char = ctx.characters[slug];
  const unitOpts: UnitOptions[] = [{ ol: 'base5', stars: 3, core: 7 }];
  const cfg: SimConfig = {
    slugs: [slug],
    bossElement: null,
    bossDef: 0,
    level: 400,
    copies: 0,
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: slug,
    disableBursts: true,
  };
  const prepared = prepareTeam([char], unitOpts, {
    ...ctx.deps,
    overrides: {
      ...ctx.deps.overrides,
      // Units without an override (dorothy, sakura, dolla, milk) get a bare empty
      // kit — only their fire cadence is read here, never their skills.
      [slug]:
        ctx.deps.overrides[slug] ??
        ({ slug, skill1: [], skill2: [], burst: [] } as any),
    },
  });
  const r = runSim([char], ctx.mult, cfg, prepared);
  return r.units[0].pulls;
}

export function cdrFor(slug: string, ctx: RanksCtx): CdrEntry {
  const row = CDR_TABLE[slug];
  if (!row) throw new Error(`${slug}: not on the burst-CDR board (no burst-cdr tag row)`);
  let cdrPer40s: number;
  let ramp: number[] | undefined;
  if (row.source.kind === 'perFb') {
    cdrPer40s = row.source.perFb * FB_PROCS_PER_40;
    ramp = row.source.ramp?.map((v) => v * FB_PROCS_PER_40);
  } else {
    const pullsPer40 = (soloPulls(slug, ctx) * 40) / 180;
    cdrPer40s = (pullsPer40 / row.source.shots) * row.source.cdr;
  }
  return {
    slug,
    cdrPer40s,
    ...(ramp ? { ramp } : {}),
    ...(row.condition ? { condition: row.condition } : {}),
    ...(row.selfCdr ? { selfCdr: row.selfCdr } : {}),
    kit: row.kit,
    rank: 0, // filled by rankCdr
  };
}

export function rankCdr(population: string[], ctx: RanksCtx): CdrEntry[] {
  const entries = population.map((slug) => cdrFor(slug, ctx));
  entries.sort((a, b) => b.cdrPer40s - a.cdrPer40s);
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}
