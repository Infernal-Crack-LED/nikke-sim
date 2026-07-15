// Shared scope-lock runner for the per-element scripts (scripts/sim/{fire,water,...,neutral}.ts).
// The per-element wrappers call `runScopeLock(<element>, slugs)`; the ONLY thing that varies
// between them is the boss element. Everything else comes from the scope-lock SSOT
// (scripts/lib/scope-lock.ts): DEF 140, core 100%, core 7, base5, sync 400, 180s.
//
//   npx tsx scripts/sim/fire.ts <slug> [slug...]     # boss Fire
//   npx tsx scripts/sim/neutral.ts <slug> [slug...]  # forced neutral ("none")
//   FOCUS=<slug> npx tsx scripts/sim/iron.ts a b c d e
//
// Runs a --sanity self-check by default (staticAtk vs the scope-lock reference + same-class
// uniformity); a mismatch prints a loud CONFIG-DRIFT FAIL. Set NOSANITY=1 to skip.
import { runSim } from '../../src/engine/sim.js';
import { resolveSkills } from '../../src/skills/index.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import type { Element } from '../../src/types.js';
import { scopeLockCfg, sanityCheck, loadData } from '../lib/scope-lock.js';

export function runScopeLock(bossElement: Element | null, slugs: string[]): void {
  if (!slugs.length) {
    console.error('usage: npx tsx scripts/sim/<element>.ts <slug> [slug...]');
    process.exit(1);
  }
  const { data, mult } = loadData();
  const chars: any[] = slugs.map((s) => {
    const c = data.characters[s];
    if (!c) { console.error(`unknown slug: ${s}`); process.exit(1); }
    return c;
  });
  const focus = process.env.FOCUS ?? slugs[Math.floor((slugs.length - 1) / 2)]; // middle slot
  const cfg = scopeLockCfg(slugs, bossElement, { focusSlug: focus } as any);
  const prepared = chars.map((ch) => ({
    skills: resolveSkills(ch, loadOverride(ch.slug)),
    extraStats: [] as any[],
    loadout: [] as any[],
  }));
  const r: any = runSim(chars, mult, cfg, prepared);

  const label = bossElement ?? 'neutral (none)';
  console.log(`\n=== scope-lock · boss ${label} · DEF ${cfg.bossDef} · core 100% · ${cfg.durationSec}s ===`);
  if (!process.env.NOSANITY) {
    const issues = sanityCheck(chars, r);
    if (issues.length) { console.log('  ⚠ SANITY FAIL (config drift?):'); issues.forEach((i) => console.log('   ✗ ' + i)); }
    else console.log('  ✓ sanity: staticAtk matches scope-lock reference; same-class ATK uniform');
  }
  console.log(`  full bursts: ${r.fullBursts ?? r.fullBurstCount ?? 'n/a'}`);
  r.units.forEach((u: any, i: number) => {
    console.log(`  ${slugs[i].padEnd(26)} ${(u.totalDamage / 1e6).toFixed(1).padStart(7)}M  share ${(u.share * 100).toFixed(1)}%  bursts ${u.burstCasts}  ATK ${u.staticAtk}`);
  });
}
