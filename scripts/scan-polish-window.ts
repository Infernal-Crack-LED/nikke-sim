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
 *   npx tsx scripts/scan-polish-window.ts              # verify the CURRENT PIN, then sweep b3
 *   npx tsx scripts/scan-polish-window.ts --b3 13      # score one window
 *   npx tsx scripts/scan-polish-window.ts --b1-range 0:3 --b2-range 0:4 --b3-range 12:18
 *
 * The bare run first re-scores the window the fixture pins TODAY (`PIN` below) and says whether it
 * still reproduces, because "the pin broke" and "no window anywhere works" are different problems
 * and only the second is a roster-level finding. It then sweeps b3 around the pin.
 *
 * A window QUALIFIES when greedy === 3, polished === 4 and ratio > 1.09 — the three assertions
 * the fixture makes. Pick the qualifying window with the most headroom over the 1.09 floor, put
 * it in the test's slice, update `PIN`, and paste this script's line into a new RECALIBRATED note.
 *
 * ⚠ KEEP `PIN` IN LOCKSTEP WITH THE TEST'S SLICES (b1/b2/b3 starts = the first argument of each
 * `.slice()` there). If it drifts, the bare run reports a spurious `BROKEN ✗` for a window nobody
 * uses and sends you re-scanning for nothing. Drift the other way — test moved, `PIN` stale — turns
 * the fixture red in CI, so neither direction fails silently.
 */
import { makeCalc } from '../src/teamcalc.js';
import { scopeLockCfg } from './lib/scope-lock.js';
import { deps, generatorPool, mult } from './tests/lib/harness.js';

const N = 4;
const RATIO_FLOOR = 1.09;

const argv = process.argv.slice(2);
/** argv slots consumed by recognized flags — anything left over is a typo, see the check below. */
let consumed = 0;
const flag = (name: string) => {
  const i = argv.indexOf(name);
  if (i < 0) {
    return undefined;
  }
  consumed += 2; // the flag and its value
  return argv[i + 1];
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

/**
 * The window `scripts/tests/generators/cross-team-polish.test.ts` pins TODAY. Update this together
 * with the test's slices — see the ⚠ in the header for what drift costs.
 */
const PIN = { b1: 1, b2: 1, b3: 12 };
/** Bare invocation = no flags at all: verify the pin, then sweep b3 around it. */
const bare = argv.length === 0;

const b1Starts = starts('b1', PIN.b1);
const b2Starts = starts('b2', PIN.b2);
const b3Starts = bare
  ? Array.from({ length: 21 }, (_, i) => 8 + i)
  : starts('b3', PIN.b3);

// HARD-FAIL on anything unrecognized. Without this, a typo (`--b3-rang 10:20`) silently opts out
// of the bare pin-check-then-sweep path AND matches no flag, so it scores one point at the pin and
// prints a confident "BEST:" — a run that looks successful while doing neither documented mode.
// Hard-fail rather than warn: this is a calibration instrument whose output gets pasted into a
// RECALIBRATED note, so a silently-wrong run is worse than no run.
if (consumed !== argv.length) {
  const recognized = ['b1', 'b2', 'b3'].flatMap((b) => [
    `--${b}`,
    `--${b}-range`,
  ]);
  console.error(
    `unrecognized or malformed arguments: ${argv.join(' ')}\n` +
      `recognized flags: ${recognized.join(' ')} (each takes a value; ` +
      `--bN <int>, --bN-range <lo:hi>)\n` +
      `bare (no arguments) = verify the current pin, then sweep b3.`
  );
  process.exit(2);
}

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

const qualifies = (r: { greedy: number; polished: number; ratio: number }) =>
  r.greedy === 3 && r.polished === 4 && r.ratio > RATIO_FLOOR;

// Bare run: re-score the pinned window FIRST. "the pin broke" and "no window anywhere works" are
// different problems, and only the second is a roster-level finding worth reporting.
// Note this re-scores the pin, which the sweep below also covers (b3 8..28 includes PIN.b3) — one
// redundant sim pair out of 22. Kept deliberately: printing the verdict BEFORE the sweep table is
// the whole point, and ~5% of an already multi-minute run is not worth the splice.
if (bare) {
  const p = await score(PIN.b1, PIN.b2, PIN.b3);
  console.log(
    `current pin b1@${PIN.b1}/b2@${PIN.b2}/b3@${PIN.b3}: greedy=${p.greedy} polished=${p.polished} ` +
      `ratio ${p.ratio.toFixed(4)} — ${qualifies(p) ? 'REPRODUCES ✓' : 'BROKEN ✗ (re-scan below)'}\n`
  );
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
  const ok = qualifies(r);
  console.log(
    `  ${String(r.b1Start).padStart(2)}  ${String(r.b2Start).padStart(2)}  ${String(
      r.b3Start
    ).padStart(2)}   ${String(r.greedy).padStart(6)}  ${String(
      r.polished
    ).padStart(8)}   ${r.ratio.toFixed(4)}   ${ok ? '✓ YES' : ''}`
  );
}

const qualifying = rows.filter(qualifies);
if (qualifying.length === 0) {
  console.log(
    `\nNO qualifying window IN THE RANGE SCANNED. That is not yet a finding — widen it first ` +
      `(--b1-range / --b2-range / --b3-range; the b3 knob alone was not enough on 2026-08-11, ` +
      `when a Burst-I pool unit moved and un-stalled greedy across all of b3 8..27). Only if a ` +
      `WIDE sweep finds nothing does the greedy stall this fixture demonstrates genuinely no ` +
      `longer exist on the current roster — report that, do not loosen the assertions.`
  );
} else {
  const best = qualifying.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  console.log(
    `\nBEST: b1@${best.b1Start}/b2@${best.b2Start}/b3@${best.b3Start} measures greedy=${best.greedy} / ` +
      `polished=${best.polished} / ratio ${best.ratio.toFixed(4)} (>${RATIO_FLOOR} floor)`
  );
}
