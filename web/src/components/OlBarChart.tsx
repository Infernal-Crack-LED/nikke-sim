// Ranked overload-loadout chart for the Overload Calc tab. Each row is one way to
// spend the four free OL lines: a label (the line mix), a bar sized by its % gain
// over the 8/12 baseline, the carry's damage, and that % delta. Sorted desc by the
// caller. Styled with the shared .dpschart-* classes so it matches the DPS charts.
import { ELEMENT_COLORS } from '../../../src/share/teamCard';

const fmt = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

export interface OlChartBar {
  label: string;
  damage: number;
  gainPct: number;
}

export function OlBarChart({
  title,
  subtitle,
  element,
  bars,
}: {
  title: string;
  subtitle?: string;
  element?: string;
  bars: OlChartBar[];
}) {
  // scale bar width by % gain (the differentiator) — damages sit in a narrow band
  const maxGain = Math.max(...bars.map((b) => b.gainPct), 0.01);
  const color = (element && ELEMENT_COLORS[element]) || '#9aa3b2';
  return (
    <div className='dpschart-card'>
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
          {bars.map((b, i) => (
            <div className='dpschart-row ol-row' key={b.label}>
              <span className='dpschart-rank'>{i + 1}</span>
              <span className='dpschart-name ol-lines' title={b.label}>{b.label}</span>
              <span className='dpschart-track'>
                <span
                  className='dpschart-fill'
                  style={{ width: `${Math.max(2, (b.gainPct / maxGain) * 100)}%`, background: color }}
                />
              </span>
              <span className='dpschart-val ol-val'>
                {fmt(b.damage)}
                <span className='ol-gain'>+{b.gainPct.toFixed(1)}%</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
