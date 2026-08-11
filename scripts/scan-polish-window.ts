/**
 * Re-scan the cross-team-polish fixture's pool window.
 *
 * WHY THIS EXISTS. `scripts/tests/generators/cross-team-polish.test.ts` demonstrates a greedy
 * stall: on a 20-unit pool, greedy topTeams stalls at THREE teams where the polish pass finds
 * FOUR. That scenario is calibrated to EXACT pool membership, so ANY damage-model change to a
 * pool unit can un-stall greedy and turn the fixture red — the test's own header says so
 * ("the next damage-model change to a pool unit re-opens it"). It has been re-scanned by hand
 * on 2026-07-27, 2026-08-04, 2026-08-09, 2026-08-10 and 2026-08-11; each of those recalibration
 * notes CITES a measurement ("b3@15 measures greedy=3 / polished=4 / ratio 1.1494"), and until
 * now no committed instrument produced it (CLAUDE.md constraint 9). This is that instrument.
 *
 * USAGE
 *   npx tsx scripts/scan-polish-window.ts              # scan b3 starts 10..25 (the usual knob)
 *   npx tsx scripts/scan-polish-window.ts --b3 13      # score one window
 *   npx tsx scripts/scan-polish-window.ts --b1 1 --b2 2 --b3-range 5:30
 *
 * A window QUALIFIES when greedy === 3, polished === 4 and ratio > 1.09 — the three assertions
 * the fixture makes. Pick the qualifying window with the most headroom over the 1.09 floor, put
 * it in the test's slice, and paste this script's line into a new RECALIBRATED note.
 */
import { makeCalc } from '../src/teamcalc.js';
import { scopeLockCfg } from './lib/scope-lock.js';
import { deps, generatorPool, mult } from './tests/lib/harness.js';

const N = 4;
const RATIO_FLOOR = 1.09;

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

/** `--bN x` pins one value; `--bN-range lo:hi` sweeps. Every combination is scored. */
function starts(name: 'b1' | 'b2' | 'b3', dflt: number): number[] {
  const one = flag(`--${name}`);
  if (one != null) {
    return [Number(one)];
  }
  const range = flag(`--${name}-range`);
  if (range == null) {
    return [dflt];
  }
  const [lo, hi] = range.split(':').map(Number);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

const b1Starts = starts('b1', 1);
const b2Starts = starts('b2', 2);
const b3Starts = starts('b3', 15);

const { genChars, chars, overrides } = generatorPool();
const byBurst = (b: string) =>
  genChars.filter((c) => c.burst === b).map((c) => c.slug);

/** The fixture's pool construction, kept in lockstep with the test file. */
function poolFor(
  b1Start: number,
  b2Start: number,
  b3Start: number
): Set<string> {
  return new Set([
    ...byBurst('I')
      .filter((s) => s !== 'emma-tactical-upgrade')
      .slice(b1Start, b1Start + 4),
    ...byBurst('II').slice(b2Start, b2Start + 6),
    ...byBurst('III')
      .filter((s) => s !== 'e-h')
      .slice(b3Start, b3Start + 10),
  ]);
}

const total = (teams: { teamDamage: number }[]) =>
  teams.reduce((a, t) => a + t.teamDamage, 0);

async function score(b1Start: number, b2Start: number, b3Start: number) {
  const pool = poolFor(b1Start, b2Start, b3Start);
  const calc = makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    blocked: Object.keys(chars).filter((s) => !pool.has(s)),
  });
  const greedy = await calc.topTeams(N, { polishPasses: 0 });
  const polished = await calc.topTeams(N);
  const ratio = total(polished) / total(greedy);
  return {
    b1Start,
    b2Start,
    b3Start,
    greedy: greedy.length,
    polished: polished.length,
    ratio,
  };
}

const rows: Awaited<ReturnType<typeof score>>[] = [];
for (const b1 of b1Starts) {
  for (const b2 of b2Starts) {
    for (const b3 of b3Starts) {
      rows.push(await score(b1, b2, b3));
    }
  }
}

console.log(`N=${N}, ratio floor ${RATIO_FLOOR}\n`);
console.log('  b1  b2  b3   greedy  polished    ratio   qualifies');
for (const r of rows) {
  const ok = r.greedy === 3 && r.polished === 4 && r.ratio > RATIO_FLOOR;
  console.log(
    `  ${String(r.b1Start).padStart(2)}  ${String(r.b2Start).padStart(2)}  ${String(
      r.b3Start
    ).padStart(2)}   ${String(r.greedy).padStart(6)}  ${String(
      r.polished
    ).padStart(8)}   ${r.ratio.toFixed(4)}   ${ok ? '✓ YES' : ''}`
  );
}

const qualifying = rows.filter(
  (r) => r.greedy === 3 && r.polished === 4 && r.ratio > RATIO_FLOOR
);
if (qualifying.length === 0) {
  console.log(
    `\nNO qualifying window in this range — widen it with --b3-range, or the greedy stall this ` +
      `fixture demonstrates may no longer exist on the current roster (that is a real finding, ` +
      `not a scan failure: report it rather than loosening the assertions).`
  );
} else {
  const best = qualifying.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  console.log(
    `\nBEST: b1@${best.b1Start}/b2@${best.b2Start}/b3@${best.b3Start} measures greedy=${best.greedy} / ` +
      `polished=${best.polished} / ratio ${best.ratio.toFixed(4)} (>${RATIO_FLOOR} floor)`
  );
}
