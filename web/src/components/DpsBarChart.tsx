// Presentational ranked-DPS bar chart (one infographic). Element-colored horizontal
// bars, sorted desc, with an optional compare-unit annotation row and share buttons.
// The shareable PNG is rendered separately via src/infographics/core/dpsChart.ts.
import { useLayoutEffect, useRef, useState } from 'react';
import { ELEMENT_COLORS } from '../../../src/infographics/core/theme';
import { relScore } from '../../../src/infographics/core/dpsChart';
import { profileLabel } from '../../../src/infographics/core/rankTables';
import type { BarEntry } from '../dpschartData';
import { usePortraitThumbs } from '../usePortraitThumbs';
import { onSpaLinkClick } from '../router';
import { ChartModal } from './ChartModal';

const PORTRAIT_CSS = 33; // must match .dpschart-portrait width/height in styles.css

const fmt = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

// The ranked-rows list, factored out so the compact inline chart and the
// expanded modal (which may show a larger population — see `fullBars`) can
// each size their own name column against whatever they're actually showing.
function DpsBarsList({
  bars,
  max,
  thumbs,
  profiles,
}: {
  bars: BarEntry[];
  max: number;
  thumbs: Record<string, string>;
  profiles?: Record<string, string>;
}) {
  // Size the name column to the longest BARE name in this list (e.g. "Snow
  // White: Heavy Arms") so every plain row shows in full; a profiled row's
  // pill then eats into that same budget, truncating the name instead of
  // growing the row. Character count is a poor proxy for rendered width
  // (capital-heavy short names can render wider than longer ones), so measure
  // the real pixel width against the name span's own computed font — falls
  // back to a `ch` estimate for the first paint, before layout is known.
  const firstNameRef = useRef<HTMLAnchorElement | null>(null);
  const [maxNamePx, setMaxNamePx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = firstNameRef.current;
    const ctx = el && document.createElement('canvas').getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.font = getComputedStyle(el).font;
    setMaxNamePx(Math.max(...bars.map((b) => ctx.measureText(b.name).width)));
  }, [bars]);
  const nameColWidth =
    maxNamePx != null
      ? `${Math.ceil(maxNamePx) + 1}px`
      : `${Math.max(...bars.map((b) => b.name.length), 1)}ch`;

  if (bars.length === 0) {
    return <div className="dpschart-empty">no data</div>;
  }
  return (
    <div className="dpschart-bars">
      {bars.map((b, i) => {
        const tooltip = `${b.name} · ${b.weapon} · ${b.element}`;
        const portraitImg = b.imageUrl ? (
          <img
            className="dpschart-portrait"
            src={thumbs[b.imageUrl] ?? b.imageUrl}
            alt={b.name}
            title={tooltip}
            loading="lazy"
          />
        ) : (
          <span
            className="dpschart-portrait ranks-no-portrait"
            title={tooltip}
            aria-hidden="true"
          />
        );
        return (
          <div
            className="dpschart-row ranks-row"
            style={{
              gridTemplateColumns: `18px 33px ${nameColWidth} minmax(0, 1fr) auto`,
            }}
            key={`${b.slug}:${b.profile ?? ''}`}
          >
            <span className="dpschart-rank">{i + 1}</span>
            {b.known ? (
              <a
                className="dpschart-portrait-link"
                href={`/unit/${b.slug}`}
                onClick={onSpaLinkClick(`/unit/${b.slug}`)}
                aria-hidden="true"
                tabIndex={-1}
              >
                {portraitImg}
              </a>
            ) : (
              portraitImg
            )}
            <span className="ranks-name dpschart-name-row">
              {b.known ? (
                <a
                  className="dpschart-name"
                  ref={i === 0 ? firstNameRef : undefined}
                  href={`/unit/${b.slug}`}
                  onClick={onSpaLinkClick(`/unit/${b.slug}`)}
                  title={tooltip}
                >
                  {b.name}
                </a>
              ) : (
                <span
                  className="dpschart-name"
                  ref={i === 0 ? firstNameRef : undefined}
                  title={tooltip}
                >
                  {b.name}
                </span>
              )}
              {b.profile && (
                <span className="ranks-badge" title={profiles?.[b.profile]}>
                  {profileLabel(b.profile)}
                </span>
              )}
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
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface DpsBarChartProps {
  title: string;
  subtitle?: string;
  bars: BarEntry[];
  // The full ranked population behind this chart, when the inline `bars` is a
  // windowed subset (e.g. the DPS Rankings top-10 cards) — the expand modal
  // shows this instead of the window. Defaults to `bars` (expand just
  // enlarges) when the chart already shows everything.
  fullBars?: BarEntry[];
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
  fullBars,
  compare,
  profiles,
  onShareImage,
  onShareLink,
}: DpsBarChartProps) {
  const expandBars = fullBars ?? bars;
  const max = Math.max(...bars.map((b) => b.dps), 1);
  const expandMax = Math.max(...expandBars.map((b) => b.dps), 1);
  const thumbs = usePortraitThumbs(
    expandBars.map((b) => b.imageUrl),
    PORTRAIT_CSS
  );
  const [expanded, setExpanded] = useState(false);
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
  const compareRow = compare && (
    <div className="dpschart-compare">
      <span className="dpschart-name">{compare.name}</span>
      <span className="dpschart-rankinfo">
        rank {compare.rank} / {compare.total}
      </span>
      <span className="dpschart-val" title={`${fmt(compare.dps)} DPS`}>
        {relScore(compare.dps, expandMax)}
      </span>
    </div>
  );
  return (
    <div className="dpschart-card">
      <div className="dpschart-head">
        <div>
          <div className="dpschart-title">{title}</div>
          {subtitle && <div className="dpschart-sub">{subtitle}</div>}
        </div>
        <div className="dpschart-share">
          <button
            className="chip"
            title="expand full chart"
            onClick={() => setExpanded(true)}
          >
            ⛶
          </button>
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
      </div>

      <DpsBarsList bars={bars} max={max} thumbs={thumbs} profiles={profiles} />
      {compareRow}

      {expanded && (
        <ChartModal title={title} onClose={() => setExpanded(false)}>
          <DpsBarsList
            bars={expandBars}
            max={expandMax}
            thumbs={thumbs}
            profiles={profiles}
          />
          {compareRow}
        </ChartModal>
      )}
    </div>
  );
}
