// Pull-odds math for NIKKE recruitment — the numbers behind the /pull tool
// page, the Pull Calculator card, and the bot's /pull command.
//
// PURE (no I/O, no clock, no DOM, no canvas) like resourcesData.ts, so the web
// page, the Node render host and the tests all share ONE implementation.
//
// Each pull is an independent trial, so the number of copies of a given unit
// across `n` pulls is Binomial(n, rate). We report CUMULATIVE odds ("at least
// k copies") because that's what players plan around — copies map to limit
// breaks, and 4 copies is a max limit break (MLB).
//
// The model is the per-pull rates only. Gem/voucher costs and mileage-spark
// mechanics vary by shop and event, so they are not part of these numbers.
//
// PARITY: bakery-bot's apps/bot/src/lib/gacha/pull.ts is the same math, kept
// as that bot's text fallback for when this card fails to render. The rates
// below are the game's published values; if one ever changes, both move.

/** NIKKE base rate for ANY SSR (per pull). */
export const NIKKE_SSR_RATE = 0.04;
/** Featured rate-up SSR on a normal banner (per pull). */
export const NIKKE_BANNER_SSR_RATE = 0.02;
/** Featured Pilgrim on a Pilgrim banner (per pull). */
export const NIKKE_BANNER_PILGRIM_RATE = 0.01;
/** Copies of one unit that make a max limit break (0 stars to 3 stars). */
export const MAX_LIMIT_BREAK_COPIES = 4;

/** Probability of AT LEAST ONE success across `pulls` at per-pull `rate`. */
export function probAtLeastOne(pulls: number, rate: number): number {
  const n = asPullCount(pulls);
  if (n <= 0) {
    return 0;
  }
  return 1 - Math.pow(1 - clampRate(rate), n);
}

/** Expected number of successes across `pulls` at per-pull `rate` (n*p). */
export function expectedCount(pulls: number, rate: number): number {
  const n = asPullCount(pulls);
  return n <= 0 ? 0 : n * clampRate(rate);
}

/**
 * Binomial probability of EXACTLY `copies` successes in `pulls` trials at
 * per-pull `rate`. Computed as C(n,k)*p^k*(1-p)^(n-k); for the small `k` here
 * (copies up to MLB) the coefficient is built by an exact running product, so
 * there is no factorial overflow.
 */
export function binomExactly(
  pulls: number,
  copies: number,
  rate: number
): number {
  const n = asPullCount(pulls);
  const k = Math.trunc(copies);
  if (k < 0 || k > n) {
    return 0;
  }
  const p = clampRate(rate);
  let coeff = 1;
  for (let i = 0; i < k; i++) {
    coeff = (coeff * (n - i)) / (i + 1);
  }
  return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/**
 * Cumulative probability of AT LEAST `copies` successes in `pulls` trials.
 * `copies` <= 0 is always certain (1). Computed as 1 minus the tail below `k`.
 */
export function probAtLeast(
  pulls: number,
  copies: number,
  rate: number
): number {
  const k = Math.trunc(copies);
  if (k <= 0) {
    return 1;
  }
  let below = 0;
  for (let j = 0; j < k; j++) {
    below += binomExactly(pulls, j, rate);
  }
  return Math.max(0, 1 - below);
}

/** A pool whose copy odds the calculator reports. */
export interface PullPool {
  /** Short key used by consumers that need a stable id (e.g. 'rate-up'). */
  key: string;
  /** Display label used in the table (e.g. 'Rate-up SSR'). */
  label: string;
  /** Per-pull rate for landing one copy from this pool. */
  rate: number;
  /** One-line explanation of what the pool is, shown under the table. */
  blurb: string;
}

/**
 * The three pools every surface reports, in card/table row order: the whole
 * SSR pool first (that's what a pull "hits"), then the two featured rates.
 */
export const PULL_POOLS: PullPool[] = [
  {
    key: 'any-ssr',
    label: 'Any SSR',
    rate: NIKKE_SSR_RATE,
    blurb: 'any SSR at all, featured or not',
  },
  {
    key: 'rate-up',
    label: 'Rate-up SSR',
    rate: NIKKE_BANNER_SSR_RATE,
    blurb: 'the featured unit on a standard rate-up banner',
  },
  {
    key: 'pilgrim',
    label: 'Pilgrim',
    rate: NIKKE_BANNER_PILGRIM_RATE,
    blurb: 'the featured unit on a Pilgrim banner',
  },
];

/** Cumulative copy odds for one pool over a planned number of pulls. */
export interface PoolOdds {
  key: string;
  label: string;
  rate: number;
  blurb: string;
  /** Expected copies over the pulls (n*rate). */
  expected: number;
  /** atLeast[i] = P(at least i+1 copies); length === maxCopies. */
  atLeast: number[];
}

/** Options for {@link summarizePull}; all optional with NIKKE defaults. */
export interface PullOptions {
  /** Pools to report (default {@link PULL_POOLS}). */
  pools?: PullPool[];
  /** Highest copy count to report (default {@link MAX_LIMIT_BREAK_COPIES}). */
  maxCopies?: number;
}

/** A ready-to-render summary of what a planned number of pulls yields. */
export interface PullSummary {
  pulls: number;
  maxCopies: number;
  pools: PoolOdds[];
}

/**
 * Summarize a planned number of pulls: expected copies plus the cumulative
 * copy odds (1 copy up to maxCopies) for each pool. Negative/NaN `pulls` are
 * treated as 0.
 */
export function summarizePull(
  pulls: number,
  opts: PullOptions = {}
): PullSummary {
  const n = asPullCount(pulls);
  const pools = opts.pools ?? PULL_POOLS;
  const maxCopies = Math.max(
    1,
    Math.trunc(opts.maxCopies ?? MAX_LIMIT_BREAK_COPIES)
  );
  return {
    pulls: n,
    maxCopies,
    pools: pools.map((pool) => {
      const rate = clampRate(pool.rate);
      const atLeast: number[] = [];
      for (let k = 1; k <= maxCopies; k++) {
        atLeast.push(probAtLeast(n, k, rate));
      }
      return { ...pool, rate, expected: expectedCount(n, rate), atLeast };
    }),
  };
}

/**
 * The smallest pull count whose chance of at least one copy reaches `target`
 * at per-pull `rate` — the "how many pulls do I need" direction of the same
 * model. Closed form: n = ceil(ln(1-target) / ln(1-rate)). Returns null when
 * the target is unreachable (rate 0, or a target of 1, which needs infinite
 * pulls).
 */
export function pullsForChance(target: number, rate: number): number | null {
  const p = clampRate(rate);
  const t = clampRate(target);
  if (p <= 0 || t >= 1) {
    return null;
  }
  if (t <= 0) {
    return 0;
  }
  return Math.ceil(Math.log(1 - t) / Math.log(1 - p));
}

/** Coerce a pull count to a non-negative integer; non-finite/negative to 0. */
function asPullCount(pulls: number): number {
  return Number.isFinite(pulls) && pulls > 0 ? Math.floor(pulls) : 0;
}

/** Clamp a probability into [0, 1]; non-finite to 0. */
function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) {
    return 0;
  }
  return Math.max(0, Math.min(1, rate));
}
