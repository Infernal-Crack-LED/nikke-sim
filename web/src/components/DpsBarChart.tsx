// Presentational ranked-DPS bar chart (one infographic). Element-colored horizontal
// bars, sorted desc, with an optional compare-unit annotation row and share buttons.
// The shareable PNG is rendered separately via src/share/dpsChart.ts.
import { useEffect, useState } from 'react';
import { ELEMENT_COLORS } from '../../../src/share/teamCard';
import type { BarEntry } from '../dpschartData';
import { portraitThumb } from '../portraitThumb';

const PORTRAIT_CSS = 33; // must match .dpschart-portrait width/height in styles.css

// Resolve each bar's portrait to a crisp, high-quality-downscaled square thumbnail
// (data URL), keyed by slug. Falls back to the raw imageUrl until ready. Sized to
// the display's device pixels so the browser does no further (aliasing) downscale.
function usePortraitThumbs(bars: BarEntry[]): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const size = Math.round(PORTRAIT_CSS * dpr);
    for (const b of bars) {
      if (!b.imageUrl) continue;
      void portraitThumb(b.imageUrl, size).then((data) => {
        if (alive && data) setThumbs((prev) => (prev[b.slug] ? prev : { ...prev, [b.slug]: data }));
      });
    }
    return () => {
      alive = false;
    };
  }, [bars]);
  return thumbs;
}

const fmt = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

export interface DpsBarChartProps {
  title: string;
  subtitle?: string;
  bars: BarEntry[];
  compare?: (BarEntry & { total: number }) | null;
  onShareImage?: () => void;
  onShareLink?: () => void;
}

export function DpsBarChart({ title, subtitle, bars, compare, onShareImage, onShareLink }: DpsBarChartProps) {
  const max = Math.max(...bars.map((b) => b.dps), 1);
  const thumbs = usePortraitThumbs(bars);
  return (
    <div className='dpschart-card'>
      <div className='dpschart-head'>
        <div>
          <div className='dpschart-title'>{title}</div>
          {subtitle && <div className='dpschart-sub'>{subtitle}</div>}
        </div>
        {(onShareLink || onShareImage) && (
          <div className='dpschart-share'>
            {onShareLink && (
              <button className='chip' title='copy link to this chart' onClick={onShareLink}>🔗</button>
            )}
            {onShareImage && (
              <button className='chip' title='copy chart image' onClick={onShareImage}>🖼</button>
            )}
          </div>
        )}
      </div>

      {bars.length === 0 ? (
        <div className='dpschart-empty'>no data</div>
      ) : (
        <div className='dpschart-bars'>
          {bars.map((b, i) => (
            <div className='dpschart-row' key={b.slug}>
              <span className='dpschart-rank'>{i + 1}</span>
              {b.imageUrl ? (
                <img
                  className='dpschart-portrait'
                  src={thumbs[b.slug] ?? b.imageUrl}
                  alt={b.name}
                  loading='lazy'
                  title={`${b.name} · ${b.tier} · ${b.weapon} · ${b.element}`}
                />
              ) : (
                <span className='dpschart-name' title={`${b.name} · ${b.tier} · ${b.weapon} · ${b.element}`}>{b.name}</span>
              )}
              <span className='dpschart-track'>
                <span
                  className='dpschart-fill'
                  style={{ width: `${Math.max(2, (b.dps / max) * 100)}%`, background: ELEMENT_COLORS[b.element] ?? '#9aa3b2' }}
                />
              </span>
              <span className='dpschart-val'>{fmt(b.dps)}</span>
            </div>
          ))}
        </div>
      )}

      {compare && (
        <div className='dpschart-compare'>
          <span className='dpschart-name'>{compare.name}</span>
          <span className='dpschart-rankinfo'>rank {compare.rank} / {compare.total}</span>
          <span className='dpschart-val'>{fmt(compare.dps)}</span>
        </div>
      )}
    </div>
  );
}
