// census-mg-swap-carriers.ts — every override that pairs a weapon class with a `weaponSwap`,
// and which of them the MG wind-up ladder governs.
//
//   npx tsx scripts/census-mg-swap-carriers.ts
//
// This is the consumer sweep behind the `swapLeavesMgLadder` gate in src/engine/sim.ts. The MG
// branch of the fire loop is keyed on the unit's BASE weapon class, so for an MG-base unit the
// ladder used to govern the swapped gun too — silently discarding the swap's `pullsPerSec` and
// `weapon`. The gate now diverts such a swap to the flat-cadence path.
//
// The inertness claim that gate rests on is BY MECHANISM, not by fixture: the gate can only change
// a unit's cadence if that unit reaches the MG branch of the fire loop AND its swap declares
// `pullsPerSec` or a non-MG `weapon`. This script is what makes that checkable — re-run it whenever
// a swap carrier is added.
//
// It reproduces the engine's full if-chain, because the MG-base set alone is not the answer:
// `cinderella-crystal-wave` is MG-base with a swap too, but her swap carries `chargeTimeSec`, so
// she is routed by the CHARGE branch that precedes the MG branch and never reaches the gate at all.
//
// Exits non-zero if any MG-base carrier the gate actually diverts is not in EXPECTED_DIVERTED, so
// the claim cannot go stale silently.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DataFile } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';

// MG-base carriers the `swapLeavesMgLadder` gate actually diverts off the wind-up ladder.
const EXPECTED_DIVERTED = ['neon-blue-ocean'];

const data: DataFile = JSON.parse(
  readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
);
const overrideDir = fileURLToPath(
  new URL('../src/skills/overrides/', import.meta.url)
);
const slugs = readdirSync(overrideDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -'.json'.length))
  .sort();

interface Row {
  slug: string;
  base: string;
  slot: string;
  pullsPerSec?: number;
  weapon?: string;
  sameWeapon?: boolean;
  damagePct?: number;
  chargeTimeSec?: number;
}

const rows: Row[] = [];
for (const slug of slugs) {
  const o = loadOverride(slug);
  const base = data.characters[slug]?.weapon;
  if (!o || !base) {
    continue;
  }
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of (o as unknown as Record<string, unknown[]>)[slot] ?? []) {
      const effects = (b as { effects?: Record<string, unknown>[] }).effects;
      for (const e of effects ?? []) {
        if (e.kind !== 'weaponSwap') {
          continue;
        }
        rows.push({
          slug,
          base,
          slot,
          pullsPerSec: e.pullsPerSec as number | undefined,
          weapon: e.weapon as string | undefined,
          sameWeapon: e.sameWeapon as boolean | undefined,
          damagePct: e.damagePct as number | undefined,
          chargeTimeSec: e.chargeTimeSec as number | undefined,
        });
      }
    }
  }
}

// mirrors src/engine/sim.ts `swapLeavesMgLadder`
const leavesLadder = (r: Row) =>
  r.pullsPerSec != null || (r.weapon != null && r.weapon !== 'MG');

// the engine's if-chain, in order: charge branch → MG ladder branch → flat-cadence branch
function route(r: Row): string {
  if (r.chargeTimeSec != null && r.chargeTimeSec > 0) {
    return 'charge branch (never reaches the gate)';
  }
  if (r.base !== 'MG') {
    return 'flat cadence (not MG-base — always read the swap)';
  }
  return leavesLadder(r)
    ? 'DIVERTED by the gate → flat cadence'
    : 'MG wind-up ladder (swap declares no cadence)';
}

console.log(
  `\nweaponSwap carriers: ${rows.length} blocks over ${new Set(rows.map((r) => r.slug)).size} units\n`
);
console.log(
  `${'slug'.padEnd(28)} ${'base'.padEnd(5)} ${'slot'.padEnd(7)} ${'dmg%'.padStart(7)} ${'pps'.padStart(5)} ${'wpn'.padEnd(4)} ${'chg'.padStart(4)}  routed by`
);
for (const r of rows) {
  console.log(
    `${r.slug.padEnd(28)} ${r.base.padEnd(5)} ${r.slot.padEnd(7)} ${String(r.damagePct ?? '').padStart(7)} ${String(r.pullsPerSec ?? '').padStart(5)} ${(r.weapon ?? '').padEnd(4)} ${String(r.chargeTimeSec ?? '').padStart(4)}  ${route(r)}`
  );
}

const mgCarriers = [
  ...new Set(rows.filter((r) => r.base === 'MG').map((r) => r.slug)),
].sort();
const diverted = [
  ...new Set(
    rows
      .filter((r) => route(r).startsWith('DIVERTED'))
      .map((r) => r.slug)
      .sort()
  ),
];
console.log(
  `\nMG-base weaponSwap carriers: ${mgCarriers.join(', ') || '(none)'}`
);
console.log(`  of which the gate diverts: ${diverted.join(', ') || '(none)'}`);

const unexpected = diverted.filter((s) => !EXPECTED_DIVERTED.includes(s));
if (unexpected.length > 0) {
  console.error(
    `\nFAIL: the gate diverts a carrier the engine comment does not name: ${unexpected.join(', ')}.\n` +
      `src/engine/sim.ts (swapLeavesMgLadder) claims inertness for everyone but ${EXPECTED_DIVERTED.join(', ')} —\n` +
      `re-check that unit's swap and update the comment + this expectation together.`
  );
  process.exit(1);
}
console.log(
  `OK — matches the set named in src/engine/sim.ts (swapLeavesMgLadder): ${EXPECTED_DIVERTED.join(', ')}\n`
);
