import { useMemo, useState } from 'react';
import {
  MAX_LIMIT_BREAK_COPIES,
  PULL_POOLS,
  pullsForChance,
  summarizePull,
} from '../../src/infographics/core/pullData';
import {
  buildPullCard,
  copyHeaders,
} from '../../src/infographics/core/pullCard';
import {
  DEFAULT_PULL_COUNT,
  PULL_COUNT_MAX,
  PULL_COUNT_MIN,
  PULL_PRERENDER_COUNTS,
} from '../../src/infographics/spec';
import { copyPullCardImage } from './pullShare';
import { CopyFlashButton } from './components/CopyFlashButton';

// Recruitment pull-odds calculator. Hosted as a tool tab inside App
// (addressable at /pull). App provides the .app chrome and the "Pull
// Calculator" h1; this supplies the pull-count picker, the odds, and the
// shareable card.
//
// Every number here comes from src/infographics/core/pullData.ts — the same
// module the card renderer and the API use, so the page and the image it
// exports can never disagree.

// The quick picks: the pre-rendered counts (spec.ts), which are the counts a
// banner plan is usually sized around.
const PRESETS = PULL_PRERENDER_COUNTS;

// The chance thresholds the "pulls needed" table answers for.
const TARGETS = [0.5, 0.75, 0.9, 0.99];

const pctOdds = (p: number): string => {
  if (p >= 0.9995) {
    return '>99.9%';
  }
  if (p > 0 && p < 0.001) {
    return '<0.1%';
  }
  return `${(p * 100).toFixed(1)}%`;
};

const pctRate = (rate: number): string => {
  const v = rate * 100;
  return `${Number.isInteger(v) ? v.toString() : v.toFixed(1)}%`;
};

const clampPulls = (n: number): number =>
  Math.min(PULL_COUNT_MAX, Math.max(PULL_COUNT_MIN, Math.floor(n)));

export function PullPage() {
  // The field keeps its own string so the input can be empty mid-edit; `pulls`
  // is the clamped number everything else reads.
  const [raw, setRaw] = useState(String(DEFAULT_PULL_COUNT));
  const parsed = Number(raw);
  const pulls = Number.isFinite(parsed) && parsed > 0 ? clampPulls(parsed) : 0;

  const summary = useMemo(() => summarizePull(pulls), [pulls]);
  const headers = copyHeaders(summary.maxCopies);
  const [anySsr, ...featured] = summary.pools;

  const onCopyImage = () => copyPullCardImage(buildPullCard(pulls));

  return (
    <section className="calc-tab">
      <p className="muted">
        Cumulative odds for a planned number of Advanced Recruit pulls — how
        many SSRs to expect, and the chance of landing enough copies of a
        featured unit to limit break her.
      </p>

      <div className="res-controls">
        <label className="res-tier">
          Pulls
          <input
            className="pull-input"
            type="number"
            min={PULL_COUNT_MIN}
            max={PULL_COUNT_MAX}
            step={10}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={() => setRaw(String(pulls || DEFAULT_PULL_COUNT))}
          />
        </label>
        <div className="pills">
          {PRESETS.map((n) => (
            <button
              key={n}
              className={pulls === n ? 'on' : ''}
              onClick={() => setRaw(String(n))}
            >
              {n}
            </button>
          ))}
        </div>
        <CopyFlashButton
          label="🖼 Copy image"
          title="copy these odds as an image"
          onCopy={onCopyImage}
        />
      </div>

      <h3 className="res-heading">
        {pulls} {pulls === 1 ? 'pull' : 'pulls'}
        <span className="muted"> · Advanced Recruit</span>
      </h3>
      {/* the shared stat-tile classes (styles.css) — the same tiles the
          Resource Calculator uses. Keyed on the count so they replay their
          entrance whenever the numbers change. */}
      <div className="res-stats" key={pulls}>
        <div className="res-stat main">
          <div className="res-stat-label">{anySsr.label}</div>
          <div className="res-stat-value">
            <span>{anySsr.expected.toFixed(1)}</span>
          </div>
          <div className="res-stat-sub">
            expected · {pctOdds(anySsr.atLeast[0])} chance of at least one
          </div>
        </div>
        {featured.map((pool) => (
          <div className="res-stat" key={pool.key}>
            <div className="res-stat-label">{pool.label}</div>
            <div className="res-stat-value">
              <span>{pctOdds(pool.atLeast[0])}</span>
            </div>
            <div className="res-stat-sub">
              chance of at least one · {pool.expected.toFixed(1)} expected
            </div>
          </div>
        ))}
      </div>

      <p className="res-detail">
        Every pull rolls on its own, so copies of one unit follow a binomial
        distribution. <b>MLB</b> is {MAX_LIMIT_BREAK_COPIES} copies of the same
        featured unit (max limit break); the <b>Any SSR</b> row counts SSRs of
        any kind, featured or not.
      </p>

      <div className="res-ladder pull-ladder">
        <table className="breakpoint-table">
          <thead>
            <tr>
              <th>Pool</th>
              <th>Per pull</th>
              <th>Expected</th>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.pools.map((pool, i) => (
              <tr key={pool.key} style={{ ['--row' as string]: i }}>
                <td>
                  <b>{pool.label}</b>
                </td>
                <td className="r">{pctRate(pool.rate)}</td>
                <td className="r">{pool.expected.toFixed(2)}</td>
                {pool.atLeast.map((p, k) => (
                  <td className="r" key={k}>
                    {pctOdds(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="res-heading">
        Pulls needed
        <span className="muted"> · for at least one copy</span>
      </h3>
      <p className="res-detail">
        The same model read the other way: the smallest number of pulls whose
        chance of landing at least one copy reaches each threshold.
      </p>
      <div className="res-ladder pull-ladder">
        <table className="breakpoint-table">
          <thead>
            <tr>
              <th>Pool</th>
              {TARGETS.map((t) => (
                <th key={t}>{Math.round(t * 100)}% chance</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PULL_POOLS.map((pool, i) => (
              <tr key={pool.key} style={{ ['--row' as string]: i }}>
                <td>
                  <b>{pool.label}</b>
                </td>
                {TARGETS.map((t) => {
                  const n = pullsForChance(t, pool.rate);
                  return (
                    <td className="r" key={t}>
                      {n === null ? '—' : n.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notes">
        <b>How to read this</b>
        <ul>
          <li>
            Rates are <b>per pull</b>:{' '}
            {PULL_POOLS.map((p, i) => (
              <span key={p.key}>
                {i > 0 && ', '}
                <b>{pctRate(p.rate)}</b> for {p.blurb}
              </span>
            ))}
            .
          </li>
          <li>
            The columns are <b>cumulative</b> — “2+” is the chance of two{' '}
            <i>or more</i> copies, not exactly two.
          </li>
          <li>
            Expected copies is just rate × pulls. It is an average, not a
            promise: at 200 pulls a 2% rate-up averages 4 copies, and roughly
            one player in fifty still ends with none.
          </li>
          <li>
            Pulls also earn mileage tickets, which buy a guaranteed copy in the
            mileage shop once you have enough. That is a floor the odds above
            don’t carry — a long banner plan lands its copy even on the tail end
            of these numbers.
          </li>
        </ul>
      </div>
    </section>
  );
}
