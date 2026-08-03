import type { B1B2DpsCell } from './b1b2-cells.js';

// Shared artifact types for the ranking boards — the single source both
// the builders (scripts/build-*.ts) and the web frontend (web/src/rankBoardsData.ts)
// import, so the emitted JSON and the consuming UI can't drift. Rows are TUPLES
// of fixed arity (profile is always the LAST element); keep tuple index access
// in the web data module. Methodology of record: docs/data/rank-boards.md.

// Per-unit display metadata (same shape as dpschart's units minus tier,
// which is dpschart-only).
export interface RankUnitMeta {
  name: string;
  element: string;
  elements?: string[]; // own code + any the kit grants; absent in older artifacts
  weapon: string;
  burst: string; // 'I' | 'II' | 'III' | 'Λ'
  imageUrl: string | null;
}

// [slug, gaugePerSec, gaugeTotal, fullBursts, profile] — sorted desc by gaugePerSec;
// 100 = one full bar.
export type BurstGenRow = [
  slug: string,
  gaugePerSec: number,
  gaugeTotal: number,
  fullBursts: number,
  profile: string | null,
];
export interface BurstGenArtifact {
  generatedAt: string;
  methodology: string;
  focusedMethodology: string; // methodology note for `focusedEntries` (the unit as its team's designated burst-gen carry)
  units: Record<string, RankUnitMeta>;
  profiles: Record<string, string>; // profile id → player-facing note
  entries: BurstGenRow[]; // unfocused — the fair, nobody-favored baseline (unchanged shape/meaning)
  focusedEntries: BurstGenRow[]; // the unit itself holds camera focus (its realistic ceiling as a team's designated carry)
}

// [slug, cdrPer20s, ramp, condition, selfCdr, profile] — fixed arity 6 (pad
// with nulls). cdrPer20s = average team CDR seconds per 20s Full Burst over a
// 180s fight. ramp = per-FB cumulative values for escalating ladders; condition
// = conditional-CDR caveat; selfCdr = self-only CDR note (seconds).
export type BurstCdrRow = [
  slug: string,
  cdrPer20s: number,
  ramp: number[] | null,
  condition: string | null,
  selfCdr: number | null,
  profile: string | null,
];
export interface BurstCdrArtifact {
  generatedAt: string;
  methodology: string;
  units: Record<string, RankUnitMeta>;
  profiles: Record<string, string>;
  entries: BurstCdrRow[];
}

// [slug, totalHp, totalPct, healPct, shieldPct, lifestealPct, profile] — fixed
// arity 7; the three *Pct columns split totalPct by sustain kind (of max HP).
export type SustainRow = [
  slug: string,
  totalHp: number,
  totalPct: number,
  healPct: number,
  shieldPct: number,
  lifestealPct: number,
  profile: string | null,
];
export interface SustainArtifact {
  generatedAt: string;
  methodology: string;
  units: Record<string, RankUnitMeta>;
  profiles: Record<string, string>;
  entries: SustainRow[];
}

// [slug, addedPct, rules, profile] — fixed arity 4 (rules serialized as null
// when absent). addedPct is the total % team damage increase vs the no-op
// baseline and can be NEGATIVE (soline-frost-ticket was the precedent). The
// chart needs a zero axis. rules (typed board) = derivation audit strings.
export type BufferRow = [
  slug: string,
  addedPct: number,
  rules: string[] | null,
  profile: string | null,
];
export interface BufferChartArtifact {
  generatedAt: string;
  methodology: string;
  units: Record<string, RankUnitMeta>;
  profiles: Record<string, string>;
  cells: { generic: BufferRow[]; typed: BufferRow[] };
}

// [slug, dps, profile, template] — fixed arity 4; profile null = plain Solo row.
// template marks the control-team template used, so rows are comparable within the same group.
export type B1B2DpsRow = [
  slug: string,
  dps: number,
  profile: string | null,
  template: 'b1-20s' | 'b1-40s' | 'b2',
];
export interface B1B2DpsArtifact {
  generatedAt: string;
  methodology: string;
  units: Record<string, RankUnitMeta>;
  profiles: Record<string, string>;
  cells: Record<B1B2DpsCell, B1B2DpsRow[]>;
}
