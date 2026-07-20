// Daily solo-raid resource drops (datamined stage breakdown), one drop table
// per boss family. All values are PER RUN; you get RUNS_PER_DAY runs per boss
// per day, so daily income = per-run × 3.
//
// Custom modules roll in two steps: each run has `moduleDropRate` chance to
// drop a module at all, and `moduleBreakdown` is the quantity distribution
// CONDITIONAL on a drop occurring (the ×1/×2/×3 split). The module roll is
// identical for every boss — what differs is the side drops: Kraken pays
// custom-module fragments and more locks; other bosses drop T10 fragments and
// a chance at a T10 gear piece instead.

export const RUNS_PER_DAY = 3;

export type ModuleBoss = 'kraken' | 'other';

export interface StageDrops {
  stage: number;
  locks: number;
  xpFodder: number;
  fragments: number; // guaranteed — 100% drop rate every run
  gearRate: number | null; // T10 gear: chance of 1 piece per run (null = this boss never drops it)
  moduleDropRate: number; // 0..1, chance the run drops a module at all
  moduleBreakdown: { qty: number; p: number }[]; // conditional on a drop; p sums to 1
}

export interface BossTable {
  key: ModuleBoss;
  label: string; // pill label
  fullName: string; // used in prose ("Daily income — Kraken, Tier 9")
  fragmentLabel: string; // which fragment this boss pays
  stages: StageDrops[];
}

export const BOSS_TABLES: BossTable[] = [
  {
    key: 'kraken',
    label: 'Kraken',
    fullName: 'Kraken',
    fragmentLabel: 'Module fragments',
    stages: [
      {
        stage: 1,
        locks: 2,
        xpFodder: 7,
        fragments: 20,
        gearRate: null,
        moduleDropRate: 0.38,
        moduleBreakdown: [
          { qty: 1, p: 0.9409 },
          { qty: 2, p: 0.0591 },
        ],
      },
      {
        stage: 2,
        locks: 2,
        xpFodder: 7,
        fragments: 21,
        gearRate: null,
        moduleDropRate: 0.39,
        moduleBreakdown: [
          { qty: 1, p: 0.909871 },
          { qty: 2, p: 0.090129 },
        ],
      },
      {
        stage: 3,
        locks: 4,
        xpFodder: 7,
        fragments: 28,
        gearRate: null,
        moduleDropRate: 0.49,
        moduleBreakdown: [
          { qty: 1, p: 0.77857 },
          { qty: 2, p: 0.22143 },
        ],
      },
      {
        stage: 4,
        locks: 4,
        xpFodder: 7,
        fragments: 29,
        gearRate: null,
        moduleDropRate: 0.5,
        moduleBreakdown: [
          { qty: 1, p: 0.75926 },
          { qty: 2, p: 0.24074 },
        ],
      },
      {
        stage: 5,
        locks: 4,
        xpFodder: 7,
        fragments: 30,
        gearRate: null,
        moduleDropRate: 0.51,
        moduleBreakdown: [
          { qty: 1, p: 0.74082 },
          { qty: 2, p: 0.25918 },
        ],
      },
      {
        stage: 6,
        locks: 6,
        xpFodder: 7,
        fragments: 42,
        gearRate: null,
        moduleDropRate: 0.62,
        moduleBreakdown: [
          { qty: 1, p: 0.7275 },
          { qty: 2, p: 0.2625 },
          { qty: 3, p: 0.01 },
        ],
      },
      {
        stage: 7,
        locks: 6,
        xpFodder: 7,
        fragments: 45,
        gearRate: null,
        moduleDropRate: 0.65,
        moduleBreakdown: [
          { qty: 1, p: 0.700963 },
          { qty: 2, p: 0.289037 },
          { qty: 3, p: 0.01 },
        ],
      },
      {
        stage: 8,
        locks: 6,
        xpFodder: 7,
        fragments: 47,
        gearRate: null,
        moduleDropRate: 0.67,
        moduleBreakdown: [
          { qty: 1, p: 0.700963 },
          { qty: 2, p: 0.289037 },
          { qty: 3, p: 0.01 },
        ],
      },
      {
        stage: 9,
        locks: 6,
        xpFodder: 7,
        fragments: 50,
        gearRate: null,
        moduleDropRate: 0.69,
        moduleBreakdown: [
          { qty: 1, p: 0.700963 },
          { qty: 2, p: 0.289037 },
          { qty: 3, p: 0.01 },
        ],
      },
    ],
  },
  {
    key: 'other',
    label: 'Other',
    fullName: 'Other bosses',
    fragmentLabel: 'T10 fragments',
    stages: [
      {
        stage: 1,
        locks: 1,
        xpFodder: 7,
        fragments: 20,
        gearRate: 0.35,
        moduleDropRate: 0.38,
        moduleBreakdown: [
          { qty: 1, p: 0.9409 },
          { qty: 2, p: 0.0591 },
        ],
      },
      {
        stage: 2,
        locks: 1,
        xpFodder: 7,
        fragments: 21,
        gearRate: 0.365,
        moduleDropRate: 0.39,
        moduleBreakdown: [
          { qty: 1, p: 0.909871 },
          { qty: 2, p: 0.090129 },
        ],
      },
      {
        stage: 3,
        locks: 3,
        xpFodder: 7,
        fragments: 26,
        gearRate: 0.51,
        moduleDropRate: 0.49,
        moduleBreakdown: [
          { qty: 1, p: 0.77857 },
          { qty: 2, p: 0.22143 },
        ],
      },
      {
        stage: 4,
        locks: 3,
        xpFodder: 7,
        fragments: 27,
        gearRate: 0.53,
        moduleDropRate: 0.5,
        moduleBreakdown: [
          { qty: 1, p: 0.75926 },
          { qty: 2, p: 0.24074 },
        ],
      },
      {
        stage: 5,
        locks: 3,
        xpFodder: 7,
        fragments: 28,
        gearRate: 0.55,
        moduleDropRate: 0.51,
        moduleBreakdown: [
          { qty: 1, p: 0.74082 },
          { qty: 2, p: 0.25918 },
        ],
      },
      {
        stage: 6,
        locks: 4,
        xpFodder: 7,
        fragments: 33,
        gearRate: 0.7,
        moduleDropRate: 0.62,
        moduleBreakdown: [
          { qty: 1, p: 0.7275 },
          { qty: 2, p: 0.2625 },
          { qty: 3, p: 0.01 },
        ],
      },
      {
        stage: 7,
        locks: 4,
        xpFodder: 7,
        fragments: 34,
        gearRate: 0.85,
        moduleDropRate: 0.65,
        moduleBreakdown: [
          { qty: 1, p: 0.700963 },
          { qty: 2, p: 0.289037 },
          { qty: 3, p: 0.01 },
        ],
      },
      {
        stage: 8,
        locks: 4,
        xpFodder: 7,
        fragments: 34,
        gearRate: 0.9,
        moduleDropRate: 0.67,
        moduleBreakdown: [
          { qty: 1, p: 0.700963 },
          { qty: 2, p: 0.289037 },
          { qty: 3, p: 0.01 },
        ],
      },
      {
        stage: 9,
        locks: 4,
        xpFodder: 7,
        fragments: 34,
        gearRate: 1,
        moduleDropRate: 0.69,
        moduleBreakdown: [
          { qty: 1, p: 0.700963 },
          { qty: 2, p: 0.289037 },
          { qty: 3, p: 0.01 },
        ],
      },
    ],
  },
];

export function avgModuleQtyPerDrop(s: StageDrops): number {
  return s.moduleBreakdown.reduce((sum, b) => sum + b.qty * b.p, 0);
}

export function expectedModulesPerRun(s: StageDrops): number {
  return s.moduleDropRate * avgModuleQtyPerDrop(s);
}
