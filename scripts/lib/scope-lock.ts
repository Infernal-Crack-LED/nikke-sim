// SINGLE SOURCE OF TRUTH for the scope-lock test basis.
//
// Every sim test/reconciliation harness MUST build its SimConfig via `scopeLockCfg`
// instead of hand-rolling one — a hand-rolled config silently drifts from the basis
// (e.g. copies:3 → core 0 instead of scope-lock core 7), which produced a bogus "ATK
// confound" on 2026-07-15. The ONLY per-test variable is the boss ELEMENT.
//
// The fixed basis (owner, 2026-07-15): sync 400 (level 400), Base-5 gear, 10/10/10
// skills, no cube/doll, core 7 (copies 10 → grade 3 + core 7), boss DEF 140, boss core
// exposure 100% (coreHitRate 1), range bonus on, 180 s.
import { readFileSync } from 'node:fs';
import { characterStat, gearAtk, copiesToGradeCore } from '../../src/stats.js';
import type { DataFile, LevelMultiplier, NikkeClass, SimConfig, Element } from '../../src/types.js';

/** The fixed scope-lock args — everything except the boss element and the units. */
export const SCOPE_LOCK = {
  bossDef: 140,        // measured; effect ~0.1%/hit but always on (owner 2026-07-15)
  level: 400,          // sync 400
  copies: 10,          // grade 3 + core 7 (scope-lock core level)
  doll: false,         // no cube
  ol: 'base5' as const, // Base-5 gear
  coreHitRate: 1,      // boss core 100% exposed
  rangeBonus: true,
  durationSec: 180,
} as const;

/** Build a scope-lock SimConfig. `bossElement` (null = forced-neutral / "none") is the ONLY variable. */
export function scopeLockCfg(
  slugs: string[],
  bossElement: Element | null,
  extra: Partial<SimConfig> = {},
): SimConfig {
  return { slugs, bossElement, ...SCOPE_LOCK, ...extra } as SimConfig;
}

// ---- reference anchors (config-drift detection) ----
// Computed scope-lock base ATK per class (core 7, base5, level 400). Same-class units
// are IDENTICAL — base stats are class-based, so a per-unit-varying "ATK" is NOT ATK.
// (The documented treasure-inclusive scope-lock ATK is ~1.8% higher — Attacker ~120,143;
// the sim does not add treasure ATK. That gap is a separate model question, NOT config drift.)
export const REFERENCE_ATK: Record<NikkeClass, number> = {
  Attacker: 118027,
  Supporter: 98367,
  Defender: 78707,
};

/**
 * Assert a sim result matches the scope-lock reference. Catches config drift (wrong core
 * level / gear) and the "per-unit ATK" misread. Returns a list of issues (empty = OK).
 */
export function sanityCheck(chars: any[], result: any): string[] {
  const issues: string[] = [];
  const byClass: Record<string, number[]> = {};
  result.units.forEach((u: any, i: number) => {
    const cls = chars[i].class as NikkeClass;
    const ref = REFERENCE_ATK[cls];
    const atk = u.staticAtk;
    if (ref && Math.abs(atk - ref) / ref > 0.02) {
      issues.push(`${chars[i].slug} (${cls}): staticAtk ${atk} vs scope-lock reference ${ref} (${((atk / ref - 1) * 100).toFixed(1)}%) — CONFIG DRIFT? (check core level / gear)`);
    }
    (byClass[cls] ??= []).push(atk);
  });
  for (const [cls, atks] of Object.entries(byClass)) {
    if (new Set(atks).size > 1) issues.push(`${cls}: same-class units have DIFFERENT staticAtk ${[...new Set(atks)]} — base stats are class-based, this should be impossible`);
  }
  return issues;
}

/** Load the character/level-multiplier data once (harness convenience). */
export function loadData(): { data: DataFile; mult: LevelMultiplier } {
  const data: DataFile = JSON.parse(readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'));
  const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../../data/level-multiplier.json', import.meta.url), 'utf8'));
  return { data, mult };
}

/** Recompute a class's scope-lock ATK from data (to refresh REFERENCE_ATK if the curve changes). */
export function computeClassAtk(baseStats: any, mult: LevelMultiplier, cls: NikkeClass): number {
  const { grade, core } = copiesToGradeCore(SCOPE_LOCK.copies);
  return characterStat(baseStats, mult, 'atk', SCOPE_LOCK.level, grade, core) + gearAtk(cls, SCOPE_LOCK.ol);
}
