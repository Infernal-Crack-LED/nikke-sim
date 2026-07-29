// Presentational ranked-DPS bar chart (one infographic). Element-colored horizontal
// bars, sorted desc, with an optional compare-unit annotation row and share buttons.
// The shareable PNG is rendered separately via src/infographics/core/dpsChart.ts.
import { useState } from 'react';
import { ELEMENT_COLORS } from '../../../src/infographics/core/theme';
import { relScore } from '../../../src/infographics/core/dpsChart';
import { profileLabel } from '../../../src/infographics/core/rankTables';
import type { BarEntry } from '../dpschartData';
import { usePortraitThumbs } from '../usePortraitThumbs';

const PORTRAIT_CSS = 33; // must match .dpschart-portrait width/height in styles.css

const fmt = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

export interface DpsBarChartProps {
  title: string;
  subtitle?: string;
  bars: BarEntry[];
  compare?: (BarEntry & { total: number }) | null;
  // profile id → player-facing note, for the profile pill's tooltip (art.profiles).
  profiles?: Record<string, string>;
  // Resolve to whether the copy actually succeeded (link) or how it landed
  // (image — clipboard vs. a download fallback) so the chip's "copied" flash
  // reflects reality instead of firing blind.
  onShareImage?: () => Promise<'copied' | 'downloaded' | 'unsupported'>;
  onShareLink?: () => Promise<boolean>;
}

export function DpsBarChart({
  title,
  subtitle,
  bars,
  compare,
  profiles,
  onShareImage,
  onShareLink,
}: DpsBarChartProps) {
  const max = Math.max(...bars.map((b) => b.dps), 1);
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
    <div className="dpschart-card">
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
          {bars.map((b, i) => (
            <div
              className="dpschart-row ranks-row"
              key={`${b.slug}:${b.profile ?? ''}`}
            >
              <span className="dpschart-rank">{i + 1}</span>
              {b.imageUrl ? (
                <img
                  className="dpschart-portrait"
                  src={thumbs[b.imageUrl] ?? b.imageUrl}
                  alt={b.name}
                  loading="lazy"
                  title={`${b.name} · ${b.weapon} · ${b.element}`}
                />
              ) : (
                <span
                  className="dpschart-portrait ranks-no-portrait"
                  aria-hidden="true"
                />
              )}
              <span className="ranks-name">
                <span
                  className="dpschart-name"
                  title={`${b.name} · ${b.weapon} · ${b.element}`}
                >
                  {b.name}
                  {b.profile && (
                    <span
                      className="ranks-badge"
                      title={profiles?.[b.profile]}
                    >
                      {profileLabel(b.profile)}
                    </span>
                  )}
                </span>
              </span>
              <span className="dpschart-track">
                <span
                  className="dpschart-fill"
                  style={{
                    width: `${Math.max(2, (b.dps / max) * 100)}%`,
                    background: ELEMENT_COLORS[b.element] ?? '#9aa3b2',
                  }}
                />
              </span>
              <span className="dpschart-val" title={`${fmt(b.dps)} DPS`}>
                {relScore(b.dps, max)}
                <span className="dpschart-val-raw">{fmt(b.dps)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {compare && (
        <div className="dpschart-compare">
          <span className="dpschart-name">{compare.name}</span>
          <span className="dpschart-rankinfo">
            rank {compare.rank} / {compare.total}
          </span>
          <span className="dpschart-val" title={`${fmt(compare.dps)} DPS`}>
            {relScore(compare.dps, max)}
            <span className="dpschart-val-raw">{fmt(compare.dps)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
