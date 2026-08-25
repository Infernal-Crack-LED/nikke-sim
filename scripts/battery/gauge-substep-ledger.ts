// gauge-substep-ledger.ts — decompose a unit's burst-gauge generation into its per-pull
// SUB-STEPS, the same observable the video reader (scripts/probe/gauge-fill.py) measures off
// the gauge bar. Findings-only instrument; it never edits the tree.
//
//   npx tsx scripts/battery/gauge-substep-ledger.ts                    # the maiden-ice-rose anchor
//   npx tsx scripts/battery/gauge-substep-ledger.ts --slugs=liberalio
//   npx tsx scripts/battery/gauge-substep-ledger.ts --census           # every rider carrier
//   npx tsx scripts/battery/gauge-substep-ledger.ts --json
//
// WHY THIS EXISTS. The engine credits burst gauge from two different call sites — `shotGauge()`
// once per trigger pull, and `skillGauge()` once per skill-damage instance (flatDamage proc,
// hitRepeat, DoT tick). A unit carrying a per-shot damage RIDER therefore gets TWO credits on
// the frame of one pull. That structure was logged on 2026-08-03 as a suspected
// "skillGauge fires twice per shot" double-crediting DEFECT (QUEUE, engine threads) and could
// not be reproduced by inspection on 2026-08-10 — the batched gauge-economy proposal
// (docs/handoffs/2026-08-10-gauge-economy-findings.md) requires it be REPRODUCED before any
// correction, because correcting an unreproduced defect is how a compensating error gets planted.
//
// This is the instrument for that question, and the repo already holds the labeled answer it is
// scored against: `maiden-ice-rose` fires an SR weapon shot plus a shotFired-triggered flatDamage
// rider, and her solo gauge bar was hand-read at 12.55%/pull IN TWO SUB-STEPS of +9.1% then
// +3.45% (docs/data/burst-gauge.md §6, 2026-07-13 — years before any of this tooling existed).
// The committed reader fixture scores the same footage independently
// (scripts/tests/gauge-fill-anchor.test.ts: rider sub-step 3.64 exact, weapon sub-step read
// ~10 — i.e. the reader puts the WEAPON step slightly above model, never the rider step).
// So the two credits per pull are MEASURED game behaviour, and what this ledger checks is
// whether the engine puts the right magnitude on each one.
//
// It also rebuilds, as committed tooling, the ad-hoc /tmp instrument that CLAUDE.md constraint 9
// names by its failure: the 2026-07-29 focus-charge-gauge landing cited a validated instrument
// "reproduces the maiden-ice-rose anchor's +9.1%/+3.45% sub-step pattern", but shipped no script
// and the driver was lost. `scripts/tests/gauge-substep-ledger.test.ts` pins this one's output.
//
// METHOD. Runs a scope-lock comp with `DBG_GAUGE=1` and parses the engine's own emission tap
// (`addGauge`, one line per credit, post-multiplier). Emissions landing on the same FRAME are
// one pull's sub-step group — which is also why sub-step ORDER is not a finding here: the two
// credits share a frame, so the order the footage renders them in cannot move a total.
//
// ⚑ LIMITATION, inherited from the tap: `DBG_GAUGE` prints only while `frame < 30*FPS`, so the
// ledger sees the first 30 SECONDS of the fight. That covers the anchor window (its footage is
// viable 0:06-0:17) and any opening-cadence question; it does NOT cover a full 180s rotation, and
// it stops at the first Full Burst for units that reach one (generation is locked during FB and
// the chain, so those frames legitimately emit nothing).
import { readdirSync, readFileSync } from 'node:fs';
import { runComp } from '../tests/lib/harness.js';
import type { Element } from '../../src/types.js';

/** One `addGauge` credit, as the DBG_GAUGE tap printed it. */
export interface Emission {
  sec: number;
  slug: string;
  /** Post-multiplier gauge percent added (pre-clamp). */
  delta: number;
  /** Bar level BEFORE this credit. */
  before: number;
}

/** All credits that landed on one frame for one unit — i.e. one pull's sub-steps. */
export interface PullGroup {
  sec: number;
  deltas: number[];
  total: number;
}

export interface UnitLedger {
  slug: string;
  emissions: Emission[];
  pulls: PullGroup[];
  /** Distinct credit magnitudes (2dp) → how many times each was emitted. */
  families: { delta: number; count: number }[];
  /** Sub-step count per pull → how many pulls had that many. */
  substepHistogram: Record<number, number>;
  meanPerPull: number;
  /**
   * Gaps between consecutive pull frames, seconds (NaN with fewer than 2 pulls). MEDIAN is the
   * within-magazine cadence — the reload pause is a single long outlier that drags a mean, which
   * is why the reader test scores the same series as "cadence vs the one reload gap" too.
   */
  medianPullGapSec: number;
  maxPullGapSec: number;
}

const LINE = /^\[g] t=([\d.]+) (\S+) \+([\d.]+) gauge=([\d.]+)$/;

/** Parse the DBG_GAUGE tap's lines. Anything else on stdout is ignored. */
export function parseEmissions(lines: string[]): Emission[] {
  const out: Emission[] = [];
  for (const line of lines) {
    const m = LINE.exec(line.trim());
    if (m) {
      out.push({
        sec: Number(m[1]),
        slug: m[2],
        delta: Number(m[3]),
        before: Number(m[4]),
      });
    }
  }
  return out;
}

export function ledgerFor(slug: string, emissions: Emission[]): UnitLedger {
  const mine = emissions.filter((e) => e.slug === slug);
  const byFrame = new Map<string, number[]>();
  for (const e of mine) {
    const key = e.sec.toFixed(2);
    byFrame.set(key, [...(byFrame.get(key) ?? []), e.delta]);
  }
  const pulls: PullGroup[] = [...byFrame.entries()]
    .map(([sec, deltas]) => ({
      sec: Number(sec),
      deltas,
      total: deltas.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.sec - b.sec);

  const counts = new Map<number, number>();
  for (const e of mine) {
    const d = Number(e.delta.toFixed(2));
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const families = [...counts.entries()]
    .map(([delta, count]) => ({ delta, count }))
    .sort((a, b) => b.delta - a.delta);

  const substepHistogram: Record<number, number> = {};
  for (const p of pulls) {
    substepHistogram[p.deltas.length] =
      (substepHistogram[p.deltas.length] ?? 0) + 1;
  }

  const gaps = pulls
    .slice(1)
    .map((p, i) => p.sec - pulls[i].sec)
    .sort((a, b) => a - b);
  return {
    slug,
    emissions: mine,
    pulls,
    families,
    substepHistogram,
    meanPerPull: pulls.length
      ? pulls.reduce((a, p) => a + p.total, 0) / pulls.length
      : 0,
    medianPullGapSec: gaps.length
      ? gaps[Math.floor((gaps.length - 1) / 2)]
      : NaN,
    maxPullGapSec: gaps.length ? gaps[gaps.length - 1] : NaN,
  };
}

export interface LedgerOptions {
  slugs: string[];
  bossElement?: Element | null;
  focusSlug?: string;
}

/**
 * Run one comp under the DBG_GAUGE tap and return a per-unit sub-step ledger.
 *
 * `DBG_GAUGE` is read per CALL inside `addGauge` (`ENV` aliases `process.env` rather than
 * snapshotting it), so setting it here is enough — no separate process needed. It is restored
 * afterwards so a caller running several comps in one process is unaffected.
 */
export function gaugeSubstepLedger(opts: LedgerOptions): UnitLedger[] {
  const prevEnv = process.env.DBG_GAUGE;
  const prevLog = console.log;
  const captured: string[] = [];
  process.env.DBG_GAUGE = '1';
  console.log = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '));
  };
  try {
    runComp({
      slugs: opts.slugs,
      bossElement: opts.bossElement ?? null,
      focusSlug: opts.focusSlug,
    });
  } finally {
    console.log = prevLog;
    if (prevEnv === undefined) {
      delete process.env.DBG_GAUGE;
    } else {
      process.env.DBG_GAUGE = prevEnv;
    }
  }
  const emissions = parseEmissions(captured);
  return opts.slugs.map((s) => ledgerFor(s, emissions));
}

/**
 * The labeled anchor this instrument is scored against: `maiden-ice-rose` solo, hand-read off
 * the gauge bar on 2026-07-13 (docs/data/burst-gauge.md §6).
 */
export const MAIDEN_ANCHOR = {
  slug: 'maiden-ice-rose',
  /** Weapon shot: her flat 364 target value x the 2.5 focus-charge bonus (a solo unit is focused). */
  weaponSubstep: 9.1,
  /** shotFired flatDamage rider: her flat 364, no focus/charge bonus. */
  riderSubstep: 3.64,
  /** Hand read; the model's 9.10 + 3.64 = 12.74 sits 0.19 above it, inside the bar's ~0.7% column. */
  handReadPerPull: 12.55,
} as const;

/** Every override block that pairs a per-pull trigger with a flatDamage effect. */
export function riderCarriers(): { slug: string; slot: string }[] {
  const dir = new URL('../../src/skills/overrides/', import.meta.url);
  const out: { slug: string; slot: string }[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const ov = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Record<
      string,
      { trigger?: { kind?: string }; effects?: { kind?: string }[] }[]
    >;
    for (const slot of ['skill1', 'skill2', 'burst']) {
      for (const b of ov[slot] ?? []) {
        if (
          (b.trigger?.kind === 'shotFired' ||
            b.trigger?.kind === 'fullCharge') &&
          (b.effects ?? []).some((e) => e.kind === 'flatDamage')
        ) {
          out.push({ slug: f.replace(/\.json$/, ''), slot });
        }
      }
    }
  }
  return out;
}

function fmt(n: number, dp = 2): string {
  return Number.isFinite(n) ? n.toFixed(dp) : '—';
}

function printLedger(l: UnitLedger): void {
  const hist = Object.entries(l.substepHistogram)
    .map(([n, c]) => `${n}x:${c}`)
    .join(' ');
  console.log(
    `\n${l.slug} — ${l.emissions.length} credits over ${l.pulls.length} frames ` +
      `(sub-steps per frame ${hist || 'none'})`
  );
  if (!l.emissions.length) {
    console.log(
      '  no gauge credited in the tap window (first 30s) — charge/burst-locked or silent opener'
    );
    return;
  }
  console.log(
    `  magnitudes: ${l.families.map((f) => `${fmt(f.delta)} x${f.count}`).join(', ')}`
  );
  console.log(
    `  mean per pull-frame ${fmt(l.meanPerPull)}%  |  cadence ${fmt(l.medianPullGapSec)}s ` +
      `(longest gap ${fmt(l.maxPullGapSec)}s)`
  );
}

function main(): void {
  const args = process.argv.slice(2);
  const arg = (name: string): string | undefined =>
    args
      .find((a) => a.startsWith(`--${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');
  const asJson = args.includes('--json');
  const census = args.includes('--census');
  const unknown = args.filter(
    (a) =>
      !['--json', '--census'].includes(a) && !/^--(slugs|boss|focus)=/.test(a)
  );
  if (unknown.length) {
    console.error(`unrecognized argument(s): ${unknown.join(' ')}`);
    process.exit(2);
  }

  const bossArg = arg('boss');
  const bossElement =
    bossArg && bossArg !== 'none' ? (bossArg as Element) : null;

  if (census) {
    // Every shotFired-flatDamage carrier, run SOLO, to show the per-pull sub-step structure is
    // uniform across the class rather than a property of the one anchored unit.
    const carriers = riderCarriers();
    const results: UnitLedger[] = [];
    console.log(
      `shotFired+flatDamage rider carriers: ${carriers.length} block(s) across ` +
        `${new Set(carriers.map((c) => c.slug)).size} unit(s); running each solo\n`
    );
    for (const slug of [...new Set(carriers.map((c) => c.slug))].sort()) {
      const [l] = gaugeSubstepLedger({ slugs: [slug], bossElement });
      results.push(l);
      if (!asJson) {
        printLedger(l);
      }
    }
    if (asJson) {
      console.log(
        JSON.stringify(
          results.map((r) => ({ ...r, emissions: undefined })),
          null,
          2
        )
      );
    }
    return;
  }

  const slugs = (arg('slugs') ?? MAIDEN_ANCHOR.slug).split(',');
  const ledgers = gaugeSubstepLedger({
    slugs,
    bossElement,
    focusSlug: arg('focus'),
  });
  if (asJson) {
    console.log(
      JSON.stringify(
        ledgers.map((r) => ({ ...r, emissions: undefined })),
        null,
        2
      )
    );
    return;
  }
  for (const l of ledgers) {
    printLedger(l);
  }
  const anchor = ledgers.find((l) => l.slug === MAIDEN_ANCHOR.slug);
  if (anchor && anchor.pulls.length) {
    const weapon = anchor.families.find(
      (f) => Math.abs(f.delta - MAIDEN_ANCHOR.weaponSubstep) < 0.05
    );
    const rider = anchor.families.find(
      (f) => Math.abs(f.delta - MAIDEN_ANCHOR.riderSubstep) < 0.05
    );
    console.log(
      `\nvs the labeled anchor (docs/data/burst-gauge.md §6, hand-read 2026-07-13):\n` +
        `  weapon sub-step  model ${fmt(MAIDEN_ANCHOR.weaponSubstep)}  sim ${weapon ? fmt(weapon.delta) : 'ABSENT'}\n` +
        `  rider  sub-step  model ${fmt(MAIDEN_ANCHOR.riderSubstep)}  sim ${rider ? fmt(rider.delta) : 'ABSENT'}\n` +
        `  per pull         hand ${fmt(MAIDEN_ANCHOR.handReadPerPull)}  sim ${fmt(anchor.meanPerPull)}`
    );
  }
}

// Node ESM entry check: only run the CLI when invoked directly, never on import.
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  main();
}
