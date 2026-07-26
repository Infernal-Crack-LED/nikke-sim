// Ranked bar chart for the four rank boards (/ranks). Follows the OlBarChart
// precedent: reuses the shared .dpschart-* classes (card/head/row/track/fill/
// portrait/val) so it matches the DPS charts, with .ranks-* additions for what
// DpsBarChart can't do — profile badges, muted sub-lines, sustain split bars,
// and NEGATIVE bars extending left of a zero axis (buffer board).
// Presentational only: the page maps each board's typed rows into RankChartBar.
import { ELEMENT_COLORS } from '../../../src/share/teamCard';
import { usePortraitThumbs } from '../usePortraitThumbs';

const PORTRAIT_CSS = 33; // must match .dpschart-portrait width/height in styles.css

export interface RankChartBar {
  key: string; // slug + profile (a profiled unit appears twice on one board)
  slug: string;
  name: string;
  element: string;
  weapon: string;
  burst: string;
  imageUrl: string | null;
  rank: number; // 1-based over the full entry list (profiles included)
  value: number; // signed bar magnitude (negative → left of the zero axis)
  valueText: string; // primary value label ("12.3 bars", "+12.3M")
  valueSub?: string | null; // muted secondary under the value (raw gauge, carry DPS)
  valueTitle?: string; // tooltip on the value block
  badge?: string | null; // profile chip label ("w/ 2 MG")
  badgeTitle?: string; // profile note tooltip
  sub?: string | null; // muted sub-line under the name (CDR ramp, split %…)
  condition?: string | null; // conditional caveat → asterisk with tooltip
  // sustain: heal/shield/lifesteal split as a stacked mini-bar inside the track
  // (three segment widths as fractions of the bar's own width, summing to ≤1)
  split?: [heal: number, shield: number, lifesteal: number] | null;
  splitTitle?: string; // exact split breakdown tooltip
  info?: string | null; // buffer typed rules → ⓘ tooltip ("why did the carries change?")
}

export function RankBarChart({
  title,
  subtitle,
  bars,
}: {
  title: string;
  subtitle?: string;
  bars: RankChartBar[];
}) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  const min = Math.min(...bars.map((b) => b.value), 0);
  const span = max - min || 1;
  // zero-axis position (% from the left) — only meaningful when min < 0
  const zeroPct = min < 0 ? (max / span) * 100 : 0;
  const thumbs = usePortraitThumbs(
    bars.map((b) => b.imageUrl),
    PORTRAIT_CSS,
  );
  return (
    <div className='dpschart-card ranks-card'>
      <div className='dpschart-head'>
        <div>
          <div className='dpschart-title'>{title}</div>
          {subtitle && <div className='dpschart-sub'>{subtitle}</div>}
        </div>
      </div>
      {bars.length === 0 ? (
        <div className='dpschart-empty'>no data</div>
      ) : (
        <div className='dpschart-bars'>
          {bars.map((b) => {
            const color = ELEMENT_COLORS[b.element] ?? '#9aa3b2';
            // bar geometry: all-positive boards fill 0→value from the left;
            // boards with negatives span value↔0 on either side of the axis
            const leftPct = min < 0 ? (Math.min(b.value, 0) - min) / span * 100 : 0;
            const widthPct =
              min < 0 ? (Math.abs(b.value) / span) * 100 : (b.value / span) * 100;
            const [heal, shield, steal] = b.split ?? [0, 0, 0];
            return (
              <div className='dpschart-row ranks-row' key={b.key}>
                <span className='dpschart-rank'>{b.rank}</span>
                {b.imageUrl ? (
                  <img
                    className='dpschart-portrait'
                    src={thumbs[b.imageUrl] ?? b.imageUrl}
                    alt={b.name}
                    loading='lazy'
                    title={`${b.name} · ${b.burst} · ${b.weapon} · ${b.element}`}
                  />
                ) : (
                  <span className='dpschart-portrait ranks-no-portrait' aria-hidden='true' />
                )}
                <span className='ranks-name'>
                  <span className='dpschart-name' title={b.name}>
                    {b.name}
                    {b.badge && (
                      <span className='ranks-badge' title={b.badgeTitle}>
                        {b.badge}
                      </span>
                    )}
                    {b.condition && (
                      <span className='ranks-cond' title={b.condition}>
                        *
                      </span>
                    )}
                    {b.info && (
                      <span className='ranks-info' title={b.info}>
                        ⓘ
                      </span>
                    )}
                  </span>
                  {b.sub && <span className='ranks-sub'>{b.sub}</span>}
                </span>
                <span className='dpschart-track ranks-track' title={b.splitTitle}>
                  {min < 0 && (
                    <span className='ranks-zero' style={{ left: `${zeroPct}%` }} />
                  )}
                  <span
                    className='dpschart-fill'
                    style={{
                      marginLeft: `${leftPct}%`,
                      width: `${Math.max(min < 0 ? 0.5 : 2, widthPct)}%`,
                      background: b.split ? 'transparent' : color,
                    }}
                  >
                    {b.split && (
                      <>
                        <span
                          className='ranks-seg ranks-seg-heal'
                          style={{ width: `${heal * 100}%` }}
                        />
                        <span
                          className='ranks-seg ranks-seg-shield'
                          style={{ width: `${shield * 100}%` }}
                        />
                        <span
                          className='ranks-seg ranks-seg-steal'
                          style={{ width: `${steal * 100}%` }}
                        />
                      </>
                    )}
                  </span>
                </span>
                <span className='dpschart-val ranks-val' title={b.valueTitle}>
                  {b.valueText}
                  {b.valueSub && <span className='ranks-val-sub'>{b.valueSub}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
