// Shared artifact types for the four ranking boards — the single source both
// the builders (scripts/build-{burstgen,burstcdr,sustain,bufferchart}.ts) and
// the web frontend (web/src/rankBoardsData.ts) import, so the emitted JSON and
// the consuming UI can't drift. Rows are TUPLES of fixed arity (profile is
// always the LAST element); keep tuple index access in the web data module.
// Methodology of record: docs/data/rank-boards.md.

// Per-unit display metadata (same shape as dpschart's units minus tier/chartPop,
// which are dpschart-only).
export interface RankUnitMeta {
  name: string;
  element: string;
  elements?: string[]; // own code + any the kit grants; absent in older artifacts
  weapon: string;
  burst: string; // 'I' | 'II' | 'III' | 'Λ'
  imageUrl: string | null;
}

// [slug, gaugeTotal, profile] — sorted desc by gaugeTotal; 100 = one full bar.
export type BurstGenRow = [
  slug: string,
  gaugeTotal: number,
  profile: string | null,
];
export interface BurstGenArtifact {
  generatedAt: string;
  methodology: string;
  units: Record<string, RankUnitMeta>;
  profiles: Record<string, string>; // profile id → player-facing note
  entries: BurstGenRow[];
}

// [slug, cdrPer40s, ramp, condition, selfCdr, profile] — fixed arity 6 (pad
// with nulls). ramp = per-cycle values for escalating ladders; condition =
// conditional-CDR caveat; selfCdr = self-only CDR note (seconds).
export type BurstCdrRow = [
  slug: string,
  cdrPer40s: number,
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
