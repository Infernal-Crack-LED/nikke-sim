// Generates data/gauge-per-shot.json from the datamined WeaponTable rows that already live in
// data/characters.json (`role.weapon.shot_detail`), so the burst-gauge table stops being a
// hand-maintained file that drifts from its own source.
//
// WHY THIS EXISTS (2026-08-18). `data/gauge-per-shot.json` had no generator: rows were added one
// unit at a time as somebody happened to investigate that unit, and every unit without a row fell
// back to a weapon class modal in `GAUGE_MODAL_BY_WEAPON` (`src/engine/sim.ts`). The datamined
// values were present in `characters.json` the whole time — 75 sim-supported units had no row while
// their `target_burst_energy_pershot` sat right there unread, and for 23 of them the class modal was
// simply the wrong number. Worst offenders, by exact slug (base units, NOT their variants):
// `anis` (RL/Iron — not `anis-star`/`anis-sparkling-summer`) and `jackal` at 710 vs 280;
// `maiden` (SG/Electric — not `maiden-ice-rose`), `neon` (SG/Fire — not `neon-blue-ocean`/
// `neon-vision-eye`) and `pepper` at 900 vs 400.
// The same defect had already been found and fixed for exactly ONE unit — commit `0de5ba51`,
// "sugar's burst-gauge-per-shot data was never read from her datamine" — and never swept.
//
// THE CONVERSION, validated against every row that was already datamined before this landed:
//   value = raw / 100 × (weapon === 'SG' ? shot_count : 1) × muzzle_count
// The `/100` is the energy→percent scale (gauge max 10,000 energy = 100%). Shotgun table values are
// PER PELLET, so a trigger pull is × `shot_count` (docs/data/burst-gauge.md §1). Multi-muzzle rows
// fire every muzzle per pull. Both factors compose: `zwei` (SG, shot_count 5, muzzle_count 2) stores
// 700 = 70 × 5 × 2, which is the case that pins the compound rule.
//
// MERGE, NOT REBUILD. Regenerating blindly would destroy hand-authored values that are deliberately
// NOT the datamine, and fields the datamine has no column for. Both are declared below and win over
// the derived value; everything else is derived. Each numeric override pins the datamined baseline
// it was chosen against, so a future sync that moves the underlying datamine FAILS LOUDLY instead of
// letting a stale override silently mask a real game change.
import type { WeaponShotDetail } from './weapon-fields.js';

export interface GaugeRow {
  basePerTrigger: number;
  targetPerTrigger: number;
  fullChargeBonus: number;
  /** Per-shot kit generation the weapon table has no column for. Override-only. */
  flatPerTrigger?: number;
  /** Measured probability of an extra base credit on a focused charge shot. Override-only. */
  baseGaugeProb?: number;
  source: string;
}

/**
 * Structural view of a characters.json entry. `role` is deliberately loose: upstream types it as a
 * RoleSnapshot whose `weapon` is `unknown` (it is a raw DB blob), so this reads it defensively
 * rather than asserting a shape the type system cannot vouch for.
 */
interface CharacterLike {
  weapon?: string;
  role?: { weapon?: unknown };
}

/** The subset of the datamined row this generator reads. */
export type ShotDetailLike = Partial<
  Pick<
    WeaponShotDetail,
    | 'shot_count'
    | 'muzzle_count'
    | 'burst_energy_pershot'
    | 'target_burst_energy_pershot'
    | 'full_charge_burst_energy'
  >
>;

/** Safely pull `role.weapon.shot_detail` out of the raw blob. */
export function shotDetailOf(c: CharacterLike): ShotDetailLike | undefined {
  const weapon = c.role?.weapon;
  if (typeof weapon !== 'object' || weapon === null) {
    return undefined;
  }
  const sd = (weapon as { shot_detail?: unknown }).shot_detail;
  return typeof sd === 'object' && sd !== null
    ? (sd as ShotDetailLike)
    : undefined;
}

/**
 * Hand-authored values that deliberately DISAGREE with the datamine, each pinned to the datamined
 * baseline it was chosen against. If `baseline` stops matching `characters.json`, the generator
 * throws — the override is then either stale or the game changed, and both need a human.
 */
export const VALUE_OVERRIDES: Record<
  string,
  {
    fields: Partial<Pick<GaugeRow, 'basePerTrigger' | 'targetPerTrigger'>>;
    baseline: {
      burst_energy_pershot: number;
      target_burst_energy_pershot: number;
    };
    source: string;
  }
> = {
  // 4× the datamine on both columns, preserving the universal target = 2 × base relationship.
  // The datamine reads base 75 / target 150; the synergy arena calculator's per-shot 3.0 (= base
  // 300) is corroborated and was adopted instead. This is the ONLY unit in the roster whose stored
  // gauge values contradict its own datamine — verified by a full round-trip census 2026-08-18.
  'neon-vision-eye': {
    fields: { basePerTrigger: 300.0, targetPerTrigger: 600.0 },
    baseline: {
      burst_energy_pershot: 7500,
      target_burst_energy_pershot: 15000,
    },
    source:
      'synergy-arena-corroborated (per-shot 3.0 = base 300; was class-modal 280)',
  },
};

/** Fields with no datamined column at all — kit- or measurement-derived, merged onto the row. */
export const EXTRA_FIELDS: Record<string, Partial<GaugeRow>> = {
  helm: { flatPerTrigger: 1431 },
  'maxwell-ordinary-mechanic': { flatPerTrigger: 715 },
  'anis-star': { baseGaugeProb: 0.25 },
};

/**
 * `source` prose that carries evidence a plain "datamined" label would throw away — measurement
 * provenance, corrected misreads, the bug that motivated a row. Preserved verbatim; every other
 * derived row gets the plain label.
 */
export const SOURCE_NOTES: Record<string, string> = {
  'anis-star':
    'MEASURED (battery 3 A3 solo, 2026-07-13): ~10.7-11.3%/pull = 280x2.5 focused shot + 280 proc skill-gen x her +6% aura. The synergy 16.8 is a folded aggregate (user hypothesis confirmed); the 840 estimate was wrong. baseGaugeProb 0.25 (2026-08-18): game credits extra basePerTrigger×focus×aura on ~25% of focused charge shots (anomaly A=3.71%, E4 PASS; owner ruling ≥11.11%/pull).',
  eunhwa:
    'datamined (target_burst_energy_pershot 58000 → 580.0; differs from SR class-modal 560)',
  helm: 'datamined; flatPerTrigger 1431 = her S2 per-shot generation (synergy fixed_add 14.31 AND rl3 arithmetic 59.73 = 8.4 + 3x14.31, two independent confirmations)',
  liberalio:
    'datamined; target_burst_energy_pershot 56000 / 100 = 5.6% per shot (was 3360 due to a misread of rl3 as x6 volley hits; weapon has hitsPerShot=1 and burstGaugePerShot=2.8)',
  ludmilla:
    'datamined (target_burst_energy_pershot 3000 → 30.0; differs from SMG class-modal 20)',
  'maxwell-ordinary-mechanic':
    "datamined; flatPerTrigger 715 = her S2 'Fills Burst Gauge by 7.15%' per Full Charge attack (skill2_detail description_value_07 = 7.15 at level 10)",
  sugar:
    'datamined; characters.json role.weapon.shot_detail.burst_energy_pershot=4500 / target_burst_energy_pershot=9000 (identical to drake/noir; rl3=27 also identical to both) were already present but this row fell back to the SG class-modal value instead of reading them',
};

/**
 * Rows for units that do not exist in `characters.json` — the no-op controls and standard carries
 * of `src/ranks/synthetics.ts` / `src/dpschart/noop.ts`. Nothing can derive these from a datamine;
 * dropping them would silently break every rank board's control team.
 */
export const SYNTHETIC_ROWS: Record<string, GaugeRow> = {
  'carry-ar': {
    basePerTrigger: 20.0,
    targetPerTrigger: 40.0,
    fullChargeBonus: 0.0,
    source:
      'class-modal-AR (synthetic standard carry, src/ranks/synthetics.ts)',
  },
  'carry-mg': {
    basePerTrigger: 5.0,
    targetPerTrigger: 10.0,
    fullChargeBonus: 0.0,
    source:
      'class-modal-MG (synthetic standard carry, src/ranks/synthetics.ts)',
  },
  'carry-rl': {
    basePerTrigger: 140.0,
    targetPerTrigger: 280.0,
    fullChargeBonus: 250.0,
    source:
      'class-modal-RL (synthetic standard carry, src/ranks/synthetics.ts)',
  },
  'carry-sg': {
    basePerTrigger: 200.0,
    targetPerTrigger: 400.0,
    fullChargeBonus: 0.0,
    source:
      'class-modal-SG (synthetic standard carry, src/ranks/synthetics.ts)',
  },
  'carry-smg': {
    basePerTrigger: 10.0,
    targetPerTrigger: 20.0,
    fullChargeBonus: 0.0,
    source:
      'class-modal-SMG (synthetic standard carry, src/ranks/synthetics.ts)',
  },
  'carry-sr': {
    basePerTrigger: 280.0,
    targetPerTrigger: 560.0,
    fullChargeBonus: 250.0,
    source:
      'class-modal-SR (synthetic standard carry, src/ranks/synthetics.ts)',
  },
  'noop-b1-ar': {
    basePerTrigger: 20.0,
    targetPerTrigger: 40.0,
    fullChargeBonus: 0.0,
    source: 'class-modal-AR (synthetic Solo-framework no-op control)',
  },
  'noop-b2-sr': {
    basePerTrigger: 280.0,
    targetPerTrigger: 560.0,
    fullChargeBonus: 250.0,
    source: 'class-modal-SR (synthetic Solo-framework no-op control)',
  },
  'noop-b3-mg': {
    basePerTrigger: 5.0,
    targetPerTrigger: 10.0,
    fullChargeBonus: 0.0,
    source: 'class-modal-MG (synthetic Solo-framework no-op control)',
  },
  'noop-b3-rl': {
    basePerTrigger: 140.0,
    targetPerTrigger: 280.0,
    fullChargeBonus: 250.0,
    source: 'class-modal-RL (synthetic Solo-framework no-op control)',
  },
  'noop-mg': {
    basePerTrigger: 5.0,
    targetPerTrigger: 10.0,
    fullChargeBonus: 0.0,
    source:
      'class-modal-MG (synthetic ammo-burn partner, src/ranks/synthetics.ts)',
  },
};

/** raw energy → the engine's per-TRIGGER percent value. Returns null when the column is absent. */
export function convert(
  raw: number | undefined,
  weapon: string | undefined,
  shot: ShotDetailLike | undefined
): number | null {
  if (typeof raw !== 'number' || raw <= 0) {
    return null;
  }
  const shotCount = shot?.shot_count ?? 1;
  const muzzles = shot?.muzzle_count ?? 1;
  let v = raw / 100;
  if (weapon === 'SG') {
    // A shotgun row carries its gauge PER PELLET, so shot_count is load-bearing. An earlier
    // version substituted 10 when it was missing or 0 — that invented a 10× on a data hole,
    // which is exactly the MEASURED>FUDGE failure this generator exists to remove. No SG unit is
    // in that state today; if one ever appears, it is a broken datamine and must be loud.
    if (shotCount <= 0) {
      throw new Error(
        `gauge-per-shot: SG row has shot_count=${shotCount}, so its per-pellet value cannot be ` +
          `converted to a per-trigger one. Fix the datamine rather than assuming 10 pellets.`
      );
    }
    v *= shotCount;
  }
  if (muzzles > 1) {
    v *= muzzles;
  }
  return v;
}

/**
 * Build the whole table. Pure: same characters.json in, same object out — which is what lets the
 * fixture assert the committed file is exactly what a sync would produce.
 */
export function buildGaugePerShot(
  characters: Record<string, CharacterLike>
): Record<string, GaugeRow> {
  const out: Record<string, GaugeRow> = {};

  for (const [slug, c] of Object.entries(characters)) {
    const shot = shotDetailOf(c);
    const target = convert(shot?.target_burst_energy_pershot, c.weapon, shot);
    if (target === null) {
      // No datamined gauge column: the engine's weapon class modal still covers this unit, and
      // inventing a row here would be worse than the documented fallback.
      continue;
    }
    const base = convert(shot?.burst_energy_pershot, c.weapon, shot) ?? 0;
    // full_charge_burst_energy is a plain /100 scale — it is a multiplier percent (25000 → 250 =
    // ×2.5), NOT a per-trigger energy value, so the pellet/muzzle factors must NOT apply to it.
    const fcbRaw = shot?.full_charge_burst_energy;
    const fullChargeBonus =
      typeof fcbRaw === 'number' && fcbRaw > 0 ? fcbRaw / 100 : 0;

    const row: GaugeRow = {
      basePerTrigger: base,
      targetPerTrigger: target,
      fullChargeBonus,
      source: SOURCE_NOTES[slug] ?? 'datamined',
    };

    const ov = VALUE_OVERRIDES[slug];
    if (ov) {
      const actualBase = shot?.burst_energy_pershot;
      const actualTarget = shot?.target_burst_energy_pershot;
      if (
        actualBase !== ov.baseline.burst_energy_pershot ||
        actualTarget !== ov.baseline.target_burst_energy_pershot
      ) {
        throw new Error(
          `gauge-per-shot: the datamine moved under the ${slug} override — pinned baseline ` +
            `burst_energy_pershot=${ov.baseline.burst_energy_pershot}/` +
            `target_burst_energy_pershot=${ov.baseline.target_burst_energy_pershot}, ` +
            `characters.json now says ${actualBase}/${actualTarget}. Re-derive the override ` +
            `against the new datamine (src/data/gauge-per-shot-gen.ts VALUE_OVERRIDES) rather ` +
            `than bumping the baseline — a real game change must not hide behind a stale override.`
        );
      }
      Object.assign(row, ov.fields);
      row.source = ov.source;
    }
    Object.assign(row, EXTRA_FIELDS[slug] ?? {});
    out[slug] = row;
  }

  for (const [slug, row] of Object.entries(SYNTHETIC_ROWS)) {
    out[slug] = { ...row };
  }

  // Sorted so a regeneration diffs by what changed, not by key order.
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );
}
