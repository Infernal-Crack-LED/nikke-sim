// Resolves a character's skill Blocks from its hand-written/materialized
// override, then scales values to the requested skill levels. The engine NEVER
// parses skill prose at runtime: every roster unit's override is the complete
// description of its kit (all three slots), produced offline by the kit parser
// (scripts/lib/kit-parser.ts via scripts/materialize-overrides.ts) or authored
// via /kit-parse. Pure — no filesystem access, so it runs in the browser too.
// Node callers get overrides from ./overrides-node.ts; the web app bundles them
// via import.meta.glob.
import type { CharacterData } from '../types.js';
import { scaleBlocks, type SkillLevels, type SlotLevelArrays } from './scale.js';
import type { Block, CharacterSkills, ConsolidationConfig, SkillSlot, UnmodeledText } from './types.js';

const SLOTS: SkillSlot[] = ['skill1', 'skill2', 'burst'];

export interface OverrideFile {
  note?: string;
  // Verbatim kit-text lines NOT represented in blocks (all three keys present,
  // empty arrays OK). The auditable "no silent drops" record; reasons/audit
  // stay in `note`. Hand-authored slots predating 2026-07-16 may still have
  // empty arrays with skips documented in `note` only (backfill pending).
  unmodeled?: UnmodeledText;
  // Display-only modeling caveats surfaced as runtime warnings (replaces the
  // old runtime-parser warnings channel). Convention: "<slot>: <message>".
  caveats?: string[];
  modes?: string[]; // user-selectable kit modes (first = default)
  // this unit's attacks are Pierce-tagged (kit says so), so Pierce Damage ▲
  // buffs feed its Damage Up bucket (Q10). Set only on kit-confirmed carriers.
  hasPierce?: boolean; // always pierce (e.g. red-hood)
  pierceModes?: string[]; // pierce only in these modes (e.g. CCW: ["Snipe"])
  // hand-measured corrections to DB weapon data (e.g. real SR fire cycle =
  // charge + bolt recovery, where the DB only records the charge time)
  charFixes?: { chargeFrames?: number; reloadFrames?: number; burstCooldownSec?: number; noBoltRecovery?: boolean; pullsPerSec?: number };
  // Pellet-consolidation mode (dorothy-S: "after landing N pellets, for K rounds → pellet count fixed at 1
  // + high core + Pierce + attack-dmg"). Range-gated to near (where the boss affords the trigger). MEASURED
  // gate; the "80 landed on the small core" story is interpretive. See open-questions A26.
  consolidation?: ConsolidationConfig;
  // named live resource pools (soda-twinkling-bunny's Golden Chip) — see CharacterSkills.resources
  resources?: { name: string; initial: number; min?: number; max?: number }[];
  burstSnapshotsPreFb?: boolean;
  // All three slots are REQUIRED for roster units (validated by
  // scripts/validate-overrides.ts); typed optional only so partially-built
  // objects can be handled during materialization.
  skill1?: Block[];
  skill2?: Block[];
  burst?: Block[];
}

export const MAX_SKILL_LEVELS: SkillLevels = { skill1: 10, skill2: 10, burst: 10 };

export function resolveSkills(
  char: CharacterData,
  override?: OverrideFile,
  scaling?: { arrays: SlotLevelArrays; levels: SkillLevels }
): CharacterSkills {
  if (!override) {
    // Synthetic units with a genuinely empty kit (e.g. the dpschart no-op
    // controls) have no override file and no prose — zero blocks by design.
    if (SLOTS.every((s) => !char.skills[s]?.trim())) {
      return { blocks: [], warnings: [] };
    }
    throw new Error(
      `no skill override for "${char.slug}" — the engine does not parse skill prose at runtime; ` +
        `run \`npx tsx scripts/materialize-overrides.ts --write ${char.slug}\` or author one via /kit-parse`
    );
  }

  const warnings: string[] = [...(override.caveats ?? [])];
  const bySlot: Record<SkillSlot, Block[]> = { skill1: [], skill2: [], burst: [] };
  for (const slot of SLOTS) {
    const defined = override[slot];
    if (!Array.isArray(defined)) {
      throw new Error(
        `override for "${char.slug}" is missing "${slot}" — overrides must define all three skill ` +
          `slots (re-run \`npx tsx scripts/materialize-overrides.ts --write ${char.slug}\`)`
      );
    }
    bySlot[slot] = defined.map((b) => ({ ...b, slot }));
  }

  let blocks = SLOTS.flatMap((s) => bySlot[s]);
  if (scaling && SLOTS.some((s) => scaling.levels[s] < 10)) {
    blocks = scaleBlocks(blocks, scaling.arrays, scaling.levels, warnings);
  }

  return {
    blocks,
    warnings,
    unmodeled: override.unmodeled,
    modes: override.modes,
    hasPierce: override.hasPierce,
    burstSnapshotsPreFb: override.burstSnapshotsPreFb,
    pierceModes: override.pierceModes,
    consolidation: override.consolidation,
    resources: override.resources,
  };
}
