// Fetches per-skill-level values from blablalink roledata (one-time, cached to
// data/skill-levels.json). Each skill's description has {description_value_NN}
// placeholders with a 10-entry array (index = skill level - 1) — real per-level
// numbers, no approximation. We store the arrays; the loader matches parsed
// prose values against index 9 (max level) to scale them down.
import { readFileSync, writeFileSync } from 'node:fs';
// @ts-ignore — plain .mjs helper
import { getRoleData } from '../../scripts/blablalink-stats.mjs';
import type { DataFile } from '../types.js';

type SlotArrays = number[][]; // one 10-entry array per placeholder that varies or not
export interface SkillLevelData {
  [slug: string]: { skill1: SlotArrays; skill2: SlotArrays; burst: SlotArrays };
}

function extractArrays(detail: any): SlotArrays {
  const out: SlotArrays = [];
  for (const entry of detail?.description_value_list ?? []) {
    const vals = entry?.description_value;
    if (Array.isArray(vals) && vals.length === 10) {
      const nums = vals.map((v: string) => Number(v));
      if (nums.every((n) => Number.isFinite(n))) out.push(nums);
    }
  }
  return out;
}

async function main() {
  const data: DataFile = JSON.parse(
    readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8')
  );
  const chars = Object.values(data.characters).filter((c: any) => c.baseStats?.resourceId);
  const out: SkillLevelData = {};
  let failed = 0;
  const queue = [...chars];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        try {
          const role = await getRoleData((c as any).baseStats.resourceId);
          out[c.slug] = {
            skill1: extractArrays(role.skill1_detail),
            skill2: extractArrays(role.skill2_detail),
            burst: extractArrays(role.ulti_skill_detail),
          };
        } catch (e) {
          failed++;
          console.error(`${c.slug}: ${(e as Error).message}`);
        }
      }
    })
  );
  writeFileSync(
    new URL('../../data/skill-levels.json', import.meta.url),
    JSON.stringify(out)
  );
  console.log(`skill-level data for ${Object.keys(out).length} characters (${failed} failed)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
