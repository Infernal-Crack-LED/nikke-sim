// u28-gauge-ab.ts — size the U28 gauge asymmetry (faithfulness-pass phase 2d).
//
//   npx tsx scripts/battery/u28-gauge-ab.ts                 # the original encoding-swap A/B
//   npx tsx scripts/battery/u28-gauge-ab.ts --lock-census   # where the emissions actually land
//
// U28 GAUGE HALF LANDED 2026-08-13: `extraHitDamagePct` now emits `skillGauge` per impact, same as
// the equivalent `flatDamage` rider (src/engine/sim.ts, firePull). `--lock-census` is the instrument
// that showed the landing to be board-inert and WHY — see its own header below. The encoding-swap
// A/B above is kept as the original sizing arm (its damage columns were always artifacts).
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
//
// 2026-08-13, --lock-census: that "re-run it in the refill-bound shape" caveat is now ANSWERED, and
// by a sharper instrument than the exaggerated arm. The census taps the emission site itself
// (DBG_RIDERGAUGE) and asks where each emission LANDS rather than what it moves. Every carrier is
// INERT BY MECHANISM — but the argument is PER-CARRIER and turns on the unit's BURST STAGE, so do
// not compress it into one sentence (the first draft of this header did, and was wrong for nayuta):
//   * neon-vision-eye (10s), neon-blue-ocean (7s) — Burst III, so the cast granting the rider IS the
//     cast that opens a 10s Full Burst 22f later; the window cannot outlive it.
//   * modernia (15s) — Burst III, and the apparent exception. She is not one: the SAME burstCast
//     grants `fullBurstExtend: 5`, so HER Full Burst runs 15.37s from the cast and her 15s window
//     closes inside it. Do not reason about her against a 10s Full Burst — the flat 15.0s emission
//     windows this census measures ARE her extended FB, not a rider spilling past one.
//   * nayuta (10s) — Burst II. Her cast opens the STAGE-3 window, NOT a Full Burst, so what covers
//     her is the `stage !== 0` half of the lock. Chain completes ⇒ locked through FB; chain COLLAPSES
//     ⇒ `stageExpireFrame` (cast + CHAIN_TIMEOUT_FRAMES 600f) coincides exactly with her rider's
//     600f expiry, and buffs die on `expiresFrame <= frame` while stage resets on
//     `frame >= stageExpireFrame`, so the hole is ZERO frames. ⚑ Default-only: under CHAIN_TIMEOUT=120
//     the chain dies 8s before her rider does and she WOULD generate. She is also dormant in the
//     control shape (crown takes every B2 cast — the census prints "no carrier fires" for her row),
//     so T5 wind-weak is her only empirical coverage here.
// The census numbers (0 unlocked emissions, every comp) confirm the mechanism; they are not the
// argument for it. What would actually expose the emission: a rider window that outlives the Full
// Burst its own cast opens, or a chain that expires while a window is still live.
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

// --lock-census: where do the emissions LAND? Runs the carrier control comps, the four refill-bound
// comps that `scripts/regression.ts` carries as `disabled: true`, and N2 from `scripts/experiment.ts`
// (that file is the source of truth for the disabled four; it has no main-guard so it cannot be
// imported, hence the copies here —
// the runner asserts every slug still resolves, so a rename fails loudly instead of silently
// censusing a stale roster).
const CENSUS_COMPS: {
  name: string;
  slugs: string[];
  bossElement: 'Fire' | 'Water' | 'Wind' | 'Electric' | 'Iron';
  focusSlug?: string;
}[] = [
  {
    name: 'iron sweep (run G) [disabled]',
    slugs: [
      'd-killer-wife',
      'takina',
      'milk-blooming-bunny',
      'maxwell',
      'liberalio',
    ],
    bossElement: 'Electric',
  },
  {
    name: 'T5 wind-weak [disabled]',
    slugs: [
      'nayuta',
      'cinderella-crystal-wave',
      'anis-star',
      'liberalio',
      'velvet',
    ],
    bossElement: 'Iron',
  },
  {
    name: 'T1 wind-weak [disabled]',
    slugs: [
      'mast-romantic-maid',
      'scarlet-black-shadow',
      'anis-star',
      'liberalio',
      'crown',
    ],
    bossElement: 'Iron',
  },
  {
    name: 'N3 scarlet/liberalio iron [disabled]',
    slugs: [
      'rouge',
      'trina',
      'scarlet-black-shadow',
      'liberalio',
      'soda-twinkling-bunny',
    ],
    bossElement: 'Iron',
    focusSlug: 'scarlet-black-shadow',
  },
  // N2 from scripts/experiment.ts — modernia's SECOND shape, seating neither liter nor crown. Here
  // because the docs cite her N2 numbers: without this row the census could not reproduce them, and
  // a cited figure a reader cannot re-derive from the named instrument is exactly what constraint 9
  // forbids. This deterministic run reads 2001 emissions; experiment.ts's default 25-seed MC wrapper
  // reads 50,795 for the same comp (`DBG_RIDERGAUGE=1 ONLY="N2 modernia wind" npx tsx
  // scripts/experiment.ts`) — same fight, 25x the samples, so quote whichever with its command.
  {
    name: 'N2 modernia wind [experiment.ts]',
    slugs: ['d-killer-wife', 'naga', 'modernia', 'chisato', 'ein'],
    bossElement: 'Wind',
    focusSlug: 'modernia',
  },
];

function lockCensus() {
  process.env.DBG_RIDERGAUGE = '1';
  const emits: string[] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => {
    const line = String(args[0] ?? '');
    if (line.startsWith('[u28] ')) {
      emits.push(line);
    } else {
      realError(...args);
    }
  };
  try {
    censusRuns();
  } finally {
    // restore even if a comp throws — otherwise the failure message itself is swallowed by the
    // very patch that was collecting emissions, and the thrown error prints nothing useful
    console.error = realError;
    delete process.env.DBG_RIDERGAUGE;
  }

  function censusRuns() {
    const rows: string[] = [];
    const comps = [
      ...CARRIERS.filter((s) => data[s]?.simSupported).map((s) => ({
        name: `control (focus ${s})`,
        slugs: ['liter', 'crown', s, 'helm'],
        bossElement: 'Fire' as const,
        focusSlug: s,
      })),
      ...CENSUS_COMPS,
    ];
    for (const comp of comps) {
      for (const s of comp.slugs) {
        if (!data[s]) {
          throw new Error(
            `${comp.name}: slug "${s}" is not in characters.json — census roster is stale`
          );
        }
      }
      emits.length = 0;
      runComp(comp);
      const perCarrier = new Map<string, { locked: number; free: number }>();
      for (const line of emits) {
        const [, slug, , lockedTok] = line.split(' ');
        const tally = perCarrier.get(slug) ?? { locked: 0, free: 0 };
        if (lockedTok === 'locked=true') {
          tally.locked++;
        } else {
          tally.free++;
        }
        perCarrier.set(slug, tally);
      }
      if (perCarrier.size === 0) {
        rows.push(
          `${comp.name.padEnd(34)} (no extraHitDamagePct carrier fires)`
        );
        continue;
      }
      for (const [slug, t] of perCarrier) {
        const total = t.locked + t.free;
        rows.push(
          `${comp.name.padEnd(34)} ${slug.padEnd(18)} emissions ${String(total).padStart(6)} | ` +
            `gauge-locked ${String(t.locked).padStart(6)} (${((100 * t.locked) / total).toFixed(1)}%) | reaching the bar ${t.free}`
        );
      }
    }
    console.log(
      'U28 lock census — where each `extraHitDamagePct` gauge emission lands\n' +
        '(locked = swallowed by addGauge\'s burst-chain + Full-Burst lock; "reaching the bar" is the\n' +
        ' only part that can move a rotation)\n'
    );
    console.log(rows.join('\n'));
  }
}

if (process.argv.includes('--lock-census')) {
  lockCensus();
  process.exit(0);
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
