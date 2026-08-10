// Curated squad membership for the `teamHas.sameSquad` block gate (types.ts Block;
// evaluated at sim setup in sim.ts's block filter). Kit lines gated on "an ally from
// the same squad … on the battlefield" resolve membership HERE: characters.json carries
// NO squad axis (the blablalink role_meta snapshot has no squad field), so membership
// is hand-curated from the in-game unit-detail squad field and owner rulings.
//
// FAIL-CLOSED: a slug absent from this map has no squad — it neither satisfies another
// unit's sameSquad gate nor can own one (validate-overrides.ts rejects a sameSquad gate
// on an unmapped owner). Extend the map when another same-squad-gated unit adopts the
// primitive (migration list: docs/handoffs/QUEUE.md "same-squad primitive migrations").
//
// Provenance is per-squad in comments; squad KEYS are internal grouping labels — verify
// the exact in-game display name before surfacing one in player-facing copy.
// Pure module — no fs — runs in node (precompute) and the browser alike.

export const SQUAD_BY_SLUG: Record<string, string> = {
  // Owner-confirmed 2026-08-02, extending the 2026-07-20 noir ruling (DECISIONS.md:
  // noir's "ally from the same squad" burst gate is satisfied by blanc or rouge — and
  // ONLY those: the bunny/maid units are a DIFFERENT squad, a common misread).
  blanc: 'Blanc Noir Rouge',
  noir: 'Blanc Noir Rouge',
  rouge: 'Blanc Noir Rouge',
  // Synthetic Rouge stand-in for the buffer-rank `w/ Rouge` duo profile
  // (src/ranks/buffer.ts DUO_BUFFER_PROFILES): its presence satisfies blanc's
  // same-squad CDR gate so the profiled row shows the kit engine running.
  'noop-rouge-b1': 'Blanc Noir Rouge',

  // Owner-confirmed 2026-08-02. No same-squad gate consumes these yet — seeded so the
  // next gated unit in this squad (none today) resolves without a map edit.
  tia: 'M.M.R.',
  naga: 'M.M.R.',
  marciana: 'M.M.R.',

  // Owner-confirmed 2026-08-09 (in-game squad field): anchor-innocent-maid's squad
  // partner is mast-romantic-maid.
  'anchor-innocent-maid': 'Maid',
  'mast-romantic-maid': 'Maid',
};

export function squadOf(slug: string): string | undefined {
  return SQUAD_BY_SLUG[slug];
}
