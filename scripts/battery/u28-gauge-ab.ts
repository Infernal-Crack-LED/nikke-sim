// u28-gauge-ab.ts — size the U28 gauge asymmetry (faithfulness-pass phase 2d, findings-only).
//
//   npx tsx scripts/battery/u28-gauge-ab.ts
//
// U28 (docs/open-questions.md): an `extraHitDamagePct` per-pull rider emits NO burst gauge,
// while an equivalent `flatDamage` rider emits `skillGauge` per proc — so the two encodings of
// the same kit line differ in gauge economy, and the one measured function rider DOES generate
// gauge (probable under-generation on every extraHitDamagePct carrier).
//
// Method — AN UPPER-BOUND ARM, NOT AN EQUIVALENCE ARM: each carrier's extraHitDamagePct buff
// is converted in memory to a PERMANENT per-pull flatDamage rider. This deliberately drops the
// buff's window gating (nayuta's rider is swap-scoped, modernia's Destroy-Mode-scoped …), so
// the converted arm EXAGGERATES both the damage and — the point — the skillGauge emission: it
// emits gauge on every pull all fight, an overestimate of the true U28 asymmetry by roughly the
// inverse of the rider's real uptime. The DAMAGE columns are therefore artifacts (ignore them);
// the FULL-BURST columns are the finding: if even this exaggerated arm cannot move a comp's FB
// count, the true asymmetry cannot either (in that comp shape). Print-only; the QUEUE U28
// thread owns the eventual fix, bundled with the other gauge corrections per the
// compensating-errors rule (interacting directions land together).
//
// 2026-08-10 reading (this control-comp shape, all 4 carriers): FB counts UNCHANGED under the
// exaggerated arm (modernia 10=10, nayuta 5=5, neon-blue-ocean 11=11, neon-vision-eye 13=13) —
// the U28 gauge half is FB-count-neutral here. ⚑ Comp-shape-dependent: the refill-bound
// charge-B3 comps of the tempo thread (the 4 disabled regression comps) are the shape where
// gauge deltas bind; re-run this arm there before generalizing.
import { readFileSync } from 'node:fs';
import { loadOverride } from '../../src/skills/overrides-node.js';

// reuse the vitest harness runner — it is plain importable code
import { runComp } from '../tests/lib/harness.js';

const CARRIERS = ['modernia', 'nayuta', 'neon-blue-ocean', 'neon-vision-eye'];
const data = JSON.parse(
  readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8')
).characters;

function convert(slug: string) {
  const base = loadOverride(slug);
  if (!base) {
    throw new Error(`${slug}: no override`);
  }
  const clone = JSON.parse(JSON.stringify(base));
  const hits = data[slug].hitsPerShot ?? 1;
  let converted = 0;
  for (const slot of ['skill1', 'skill2', 'burst']) {
    for (const b of clone[slot] ?? []) {
      for (let i = 0; i < (b.effects ?? []).length; i++) {
        const e = b.effects[i];
        if (e.kind === 'buff' && e.stat === 'extraHitDamagePct') {
          // the engine deals extraPerHit × hitsPerShot per pull; mirror that as a per-pull
          // flatDamage rider gated to the same window by keeping the block's own trigger
          // (the buff's window scoping is approximated by durationSec-less conversion — good
          // enough for a gauge-direction A/B, NOT a damage-accuracy encoding)
          clone[slot].push({
            slot,
            trigger: { kind: 'shotFired' },
            target: { kind: 'enemy' },
            effects: [{ kind: 'flatDamage', atkPct: e.value * hits }],
          });
          b.effects.splice(i, 1);
          i--;
          converted++;
        }
      }
    }
  }
  return { clone, converted };
}

console.log(
  'U28 gauge A/B — shipped extraHitDamagePct (no gauge) vs flatDamage-equivalent (skillGauge per pull)'
);
console.log(
  'NOTE: direction/size instrument only — the flavor window scoping is approximate.\n'
);
for (const slug of CARRIERS) {
  if (!data[slug]?.simSupported) {
    console.log(`${slug}: not simSupported, skipped`);
    continue;
  }
  const { clone, converted } = convert(slug);
  if (!converted) {
    console.log(`${slug}: no extraHitDamagePct buff found, skipped`);
    continue;
  }
  const comp = {
    slugs: ['liter', 'crown', slug, 'helm'],
    bossElement: 'Fire' as const,
    focusSlug: slug,
  };
  const shipped = runComp(comp);
  const flat = runComp({ ...comp, overrides: { [slug]: clone } });
  const fb = (r: any) => r.fullBursts ?? r.units[0].fullBursts ?? '?';
  const u = (r: any) => r.units.find((x: any) => x.slug === slug);
  console.log(
    `${slug.padEnd(18)} riders converted: ${converted} | FB shipped ${fb(shipped)} vs flat-encoded ${fb(flat)} | ` +
      `carrier dmg ${(u(shipped).totalDamage / 1e6).toFixed(1)}M → ${(u(flat).totalDamage / 1e6).toFixed(1)}M | ` +
      `team dmg ${(shipped.units.reduce((a: number, x: any) => a + x.totalDamage, 0) / 1e6).toFixed(1)}M → ${(
        flat.units.reduce((a: number, x: any) => a + x.totalDamage, 0) / 1e6
      ).toFixed(1)}M`
  );
}
