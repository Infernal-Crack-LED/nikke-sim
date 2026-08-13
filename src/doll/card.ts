// The doll-leveling PLAN behind the /doll card — the one place that turns the
// two data files into "which kit to feed at each phase, and what it costs".
//
// The web page (web/src/App.tsx, doll tab), the render API and the build-time
// pre-render all go through here, because the sequence matters and is easy to
// get subtly wrong: buildModel → calibrateWeights('SR') → solveDp → monteCarlo,
// where the calibration MUTATES model.kitWeight and solveDp's answer depends on
// that mutation having happened. Calibrating is also always done against SR
// regardless of the doll being planned (the shadow prices describe the kit
// ECONOMY, not one doll's journey), which is not something a caller would
// guess. One function, one order, so the three surfaces cannot disagree.
//
// Deterministic: the Monte Carlo runs a fixed trial count under a fixed seed,
// so the same inputs always produce the same card — which is what lets the
// pre-rendered image and an on-demand render be byte-identical.
import { buildModel, type Rarity, type ToolboxTier } from './model.js';
import { calibrateWeights, monteCarlo, solveDp } from './policy.js';
import type { DollCardData } from '../infographics/core/dollCard.js';

// Same trials/seed the web page passes (App.tsx runDollCalc) — the card must
// show the numbers the page shows.
const TRIALS = 20_000;
const SEED = 20260715;

export const DOLL_TIER_LABEL: Record<ToolboxTier, string> = {
  R: 'Blue (R)',
  SR: 'Purple (SR)',
  SSR: 'Gold (SSR)',
};

/** One phase step and the kit tier the optimal one-tier-per-phase plan feeds. */
export interface DollPlanStep {
  from: number;
  to: number;
  tier: ToolboxTier;
}

export interface DollPlan {
  rarity: Rarity;
  /** Starting phase; the plan always runs to the max phase (15). */
  from: number;
  steps: DollPlanStep[];
  /** Mean kits of each tier consumed getting there. */
  byTier: Record<ToolboxTier, number>;
  /** Mean total kits — NOT the sum of byTier rounded, it is its own statistic. */
  feedsTotal: number;
}

// The parsed data/doll-economy.json + data/doll-super-success.json. Typed as
// the loose shape buildModel accepts; callers read the files (this module stays
// filesystem-free, and the web bundles them as imports).
type EconomyFile = Parameters<typeof buildModel>[0];
type ProcFile = Parameters<typeof buildModel>[1];

/** Both data files together — what a caller has to carry to plan anything. */
export interface DollData {
  economy: EconomyFile;
  proc: ProcFile;
}

export function buildDollPlan(
  economy: EconomyFile,
  proc: ProcFile,
  rarity: Rarity,
  from: number
): DollPlan {
  const model = buildModel(economy, proc);
  // Shadow prices first: solveDp optimizes against model.kitWeight, and
  // calibrateWeights is what replaces the initial 1/supply guess with the
  // prices that make the policy consume kits in the ratio they actually drop.
  model.kitWeight = calibrateWeights(model, 'SR').weights;
  const dp = solveDp(model, rarity);
  const mc = monteCarlo(model, dp, rarity, from, 0, {
    trials: TRIALS,
    seed: SEED,
  });
  const steps: DollPlanStep[] = [];
  for (let L = from; L < model.maxPhase; L++) {
    // tier[L][0] = the choice at zero carried XP, which is the "simple
    // one-tier-per-phase" reading of the full state-dependent policy.
    steps.push({ from: L, to: L + 1, tier: dp.tier[L]?.[0] ?? 'R' });
  }
  return {
    rarity,
    from,
    steps,
    byTier: mc.byTier,
    feedsTotal: mc.feeds.mean,
  };
}

/**
 * A solved plan as card data — the copy and rounding the /doll page shows,
 * decided here rather than in the renderer so the card and the page can't
 * word or round the same numbers differently.
 */
export function dollCardData(plan: DollPlan): DollCardData {
  return {
    // The title spells the range out; the grid cells, where the same range
    // repeats 15 times and space is tight, use the ASCII '->' the ramp
    // footnotes already use. NOT '→' (U+2192) in either: the bundled Roboto has
    // no arrow glyph, so one drawn on the Node host is a tofu box — and the ink
    // gate can't catch it, because a tofu box HAS ink. See
    // scripts/tests/share/font-glyphs.test.ts, which scans this file for it.
    title: `Doll Leveling — ${plan.rarity} doll, phase ${plan.from} to 15`,
    subtitle:
      'Which kit to feed at each phase — the simple one-tier-per-phase guide',
    steps: plan.steps.map((s) => ({
      label: `${s.from} -> ${s.to}`,
      tier: DOLL_TIER_LABEL[s.tier],
      kind: s.tier,
    })),
    cost: {
      lead: 'Expected kits to finish:',
      kits:
        `Blue ${plan.byTier.R.toFixed(1)} · ` +
        `Purple ${plan.byTier.SR.toFixed(1)} · ` +
        `Gold ${plan.byTier.SSR.toFixed(1)}`,
      total: `(${plan.feedsTotal.toFixed(0)} kits total)`,
    },
    footer: 'nikkesim.app/doll',
  };
}
