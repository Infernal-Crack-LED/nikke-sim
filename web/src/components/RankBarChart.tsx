// Ranked bar chart for the four rank boards (/ranks). Follows the OlBarChart
// precedent: reuses the shared .dpschart-* classes (card/head/row/track/fill/
// portrait/val) so it matches the DPS charts, with .ranks-* additions for what
// DpsBarChart can't do — profile badges, muted sub-lines, sustain split bars,
// and NEGATIVE bars extending left of a zero axis (buffer board).
// Presentational only: the page maps each board's typed rows into RankChartBar.
import { useState } from 'react';
import { ELEMENT_COLORS } from '../../../src/infographics/core/theme';
import type { RankChartBar } from '../../../src/infographics/core/rankChart';
import { usePortraitThumbs } from '../usePortraitThumbs';

const PORTRAIT_CSS = 33; // must match .dpschart-portrait width/height in styles.css

// RankChartBar is defined in core/rankChart.ts (the Card Builder's canvas
// twin of this component) so web/src/rankChartBars.ts's mapping feeds both
// hosts from one shape — re-exported here so existing `import { ...,
// type RankChartBar } from './RankBarChart'` call sites keep working.
export type { RankChartBar };

export function RankBarChart({
  title,
  subtitle,
  bars,
  onShareImage,
  onShareLink,
}: {
  title: string;
  subtitle?: string;
  bars: RankChartBar[];
  // Resolve to whether the copy actually succeeded (link) or how it landed
  // (image — clipboard vs. a download fallback), same UX as DpsBarChart.
  onShareImage?: () => Promise<'copied' | 'downloaded' | 'unsupported'>;
  onShareLink?: () => Promise<boolean>;
}) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  const min = Math.min(...bars.map((b) => b.value), 0);
  const span = max - min || 1;
  // zero-axis position (% from the left) — only meaningful when min < 0
  const thumbs = usePortraitThumbs(
    bars.map((b) => b.imageUrl),
    PORTRAIT_CSS
  );
  const [linkFlash, setLinkFlash] = useState(false);
  const [imgFlash, setImgFlash] = useState<'copied' | 'downloaded' | null>(
    null
  );
  const handleShareLink = async () => {
    if (!onShareLink) {
      return;
    }
    if (await onShareLink()) {
      setLinkFlash(true);
      setTimeout(() => setLinkFlash(false), 1500);
    }
  };
  const handleShareImage = async () => {
    if (!onShareImage) {
      return;
    }
    const result = await onShareImage();
    if (result === 'unsupported') {
      return;
    }
    setImgFlash(result);
    setTimeout(() => setImgFlash(null), 1500);
  };
  return (
    <div className="dpschart-card ranks-card">
      <div className="dpschart-head">
        <div>
          <div className="dpschart-title">{title}</div>
          {subtitle && <div className="dpschart-sub">{subtitle}</div>}
        </div>
        {(onShareLink || onShareImage) && (
          <div className="dpschart-share">
            {onShareLink && (
              <button
                className={'chip' + (linkFlash ? ' copied' : '')}
                title="copy link to this chart"
                onClick={handleShareLink}
              >
                {linkFlash ? '✓ Copied' : '🔗'}
              </button>
            )}
            {onShareImage && (
              <button
                className={'chip' + (imgFlash ? ' copied' : '')}
                title="copy chart image"
                onClick={handleShareImage}
              >
                {imgFlash === 'copied'
                  ? '✓ Copied'
                  : imgFlash === 'downloaded'
                    ? '⬇ Saved'
                    : '🖼'}
              </button>
            )}
          </div>
        )}
      </div>
      {bars.length === 0 ? (
        <div className="dpschart-empty">no data</div>
      ) : (
        <div className="dpschart-bars">
          {bars.map((b) => {
            const color = ELEMENT_COLORS[b.element] ?? '#9aa3b2';
            // bar geometry: all-positive boards fill 0→value from the left;
            // boards with negatives span value↔0 on either side of the axis
            const leftPct =
              min < 0 ? ((Math.min(b.value, 0) - min) / span) * 100 : 0;
            const widthPct =
              min < 0
                ? (Math.abs(b.value) / span) * 100
                : (b.value / span) * 100;
            const [heal, shield, steal] = b.split ?? [0, 0, 0];
            return (
              <div className="dpschart-row ranks-row" key={b.key}>
                <span className="dpschart-rank">{b.rank}</span>
                {b.imageUrl ? (
                  <img
                    className="dpschart-portrait"
                    src={thumbs[b.imageUrl] ?? b.imageUrl}
                    alt={b.name}
                    loading="lazy"
                    title={`${b.name} · ${b.burst} · ${b.weapon} · ${b.element}`}
                  />
                ) : (
                  <span
                    className="dpschart-portrait ranks-no-portrait"
                    aria-hidden="true"
                  />
                )}
                <span className="ranks-name">
                  <span className="dpschart-name" title={b.name}>
                    {b.name}
                    {b.badge && (
                      <span className="ranks-badge" title={b.badgeTitle}>
                        {b.badge}
                      </span>
                    )}
                    {b.condition && (
                      <span className="ranks-cond" title={b.condition}>
                        *
                      </span>
                    )}
                    {b.info && (
                      <span className="ranks-info" title={b.info}>
                        ⓘ
                      </span>
                    )}
                  </span>
                  {b.sub && <span className="ranks-sub">{b.sub}</span>}
                </span>
                <span
                  className="dpschart-track ranks-track"
                  title={b.splitTitle}
                >
                  <span
                    className="dpschart-fill"
                    style={{
                      marginLeft: `${leftPct}%`,
                      width: `${Math.max(min < 0 ? 0.5 : 2, widthPct)}%`,
                      background: b.split ? 'transparent' : color,
                    }}
                  >
                    {b.split && (
                      <>
                        <span
                          className="ranks-seg ranks-seg-heal"
                          style={{ width: `${heal * 100}%` }}
                        />
                        <span
                          className="ranks-seg ranks-seg-shield"
                          style={{ width: `${shield * 100}%` }}
                        />
                        <span
                          className="ranks-seg ranks-seg-steal"
                          style={{ width: `${steal * 100}%` }}
                        />
                      </>
                    )}
                  </span>
                </span>
                <span className="dpschart-val ranks-val" title={b.valueTitle}>
                  {b.valueText}
                  {b.valueSub && (
                    <span className="ranks-val-sub">{b.valueSub}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
