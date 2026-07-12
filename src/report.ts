import type { SimResult } from './engine/sim.js';

const fmt = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0);

export function printReport(r: SimResult, showRotation: boolean) {
  const c = r.config;
  console.log(
    `\nNIKKE solo raid sim — ${c.durationSec}s | lvl ${c.level}, ${c.copies} copies | boss element: ${c.bossElement ?? 'none'}${c.bossDef ? ` | boss DEF ${c.bossDef}` : ''} | core rate ${(c.coreHitRate * 100).toFixed(0)}%${c.rangeBonus ? '' : ' | no range bonus'} | gear/doll per unit (see loadout)`
  );
  console.log(
    `full bursts: ${r.fullBursts}  |  full burst uptime: ${(r.fullBurstUptime * 100).toFixed(0)}%  |  rotation stalled: ${r.rotationStallSec.toFixed(1)}s\n`
  );

  const header = ['#', 'nikke', 'B', 'wpn', 'elem', 'ATK', 'damage', 'DPS', 'share', 'normal/skill/burst', 'bursts'];
  const rows = r.units.map((u) => [
    String(u.position),
    u.name,
    u.burst,
    u.weapon,
    u.advantaged ? `${u.element}*` : u.element,
    fmt(u.staticAtk),
    fmt(u.totalDamage),
    fmt(u.dps),
    `${(u.share * 100).toFixed(1)}%`,
    `${fmt(u.breakdown.normal)}/${fmt(u.breakdown.skill)}/${fmt(u.breakdown.burst)}`,
    String(u.burstCasts),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((v, i) => v.padEnd(widths[i])).join('  ');
  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  rows.forEach((row) => console.log(line(row)));
  console.log(line(['', 'TEAM', '', '', '', '', fmt(r.teamDamage), fmt(r.teamDps), '100%', '', '']));

  if (r.units.some((u) => u.loadout.length)) {
    console.log('\nloadout:');
    for (const u of r.units) {
      if (u.loadout.length) console.log(`  ${u.name}: ${u.loadout.join(' | ')}`);
    }
  }

  const flagged = r.units.filter((u) => u.warnings.length || u.skillSource !== 'override');
  if (flagged.length) {
    console.log('\nmodeling notes:');
    for (const u of r.units) {
      const notes = [...u.warnings];
      if (u.skillSource === 'parser') notes.unshift('skills auto-parsed (not hand-verified)');
      else if (u.skillSource === 'parser+override') notes.unshift('skills partially hand-verified');
      if (notes.length) console.log(`  ${u.name}: ${notes.join(' | ')}`);
    }
  }

  if (showRotation) {
    console.log('\nrotation log:');
    r.rotationLog.forEach((l) => console.log('  ' + l));
  }
  console.log();
}
