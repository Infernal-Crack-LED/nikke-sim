// Shared summary-card renderer. Draws the result "share image" to any
// Canvas2D-compatible context, so the web app (browser canvas) and the bot
// (@napi-rs/canvas / node-canvas) produce a pixel-identical card. This module
// is DOM-free — the caller creates and sizes the canvas and hands us the ctx.
//
// Portraits are placeholders (element-tinted box + initial). Real art can be
// drawn by the caller into the 60x60 slot once available; the bot has no CORS
// constraint, the browser does.

// Structural subset of CanvasRenderingContext2D we use — keeps this compilable
// without the DOM lib (root tsconfig) and works with node canvas contexts.
export interface Canvas2DLike {
  fillStyle: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  beginPath(): void;
  moveTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  closePath(): void;
  fill(): void;
}

export const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
export const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#e0603a',
  Water: '#3a8fe0',
  Wind: '#4ecb71',
  Electric: '#e0c14b',
  Iron: '#9aa3b2',
};

export interface TeamCardUnit {
  name: string;
  burst: string;
  weapon: string;
  element: string;
  advantaged: boolean;
  share: number; // 0..1
  totalDamage: number;
}
export interface TeamCardData {
  teamDamage: number;
  teamDps: number;
  fullBursts: number;
  fullBurstUptime: number; // 0..1
  units: TeamCardUnit[];
}
export interface TeamCardMeta {
  weakness: string | null; // boss weakness element
  level: number; // synchro
  coreLabel: string; // e.g. "100% core"
}

// layout constants (logical px; caller scales for device pixel ratio)
export const CARD_W = 1040;
const PAD_X = 40;
const HEAD_H = 156;
const ROW_H = 84;
const FOOT_H = 58;

export const cardHeight = (unitCount: number) =>
  HEAD_H + unitCount * ROW_H + FOOT_H;

const fmt = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

export function roundRect(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw the card at logical (unscaled) coordinates. The caller must have created
// a canvas of CARD_W x cardHeight(units.length) (times dpr) and pre-scaled ctx.
export function drawTeamCard(
  ctx: Canvas2DLike,
  data: TeamCardData,
  meta: TeamCardMeta,
) {
  const W = CARD_W;
  const padX = PAD_X;
  const H = cardHeight(data.units.length);

  // background + accent bar
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  // title + summary
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e7eaf0';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText('NIKKE Solo Raid Sim', padX, 56);
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(fmt(data.teamDamage), padX, 108);
  const bigW = ctx.measureText(fmt(data.teamDamage)).width;
  ctx.font = `400 18px ${FONT}`;
  ctx.fillStyle = '#8b93a3';
  ctx.fillText(
    `${fmt(data.teamDps)} DPS  ·  ${data.fullBursts} full bursts  ·  ${(
      data.fullBurstUptime * 100
    ).toFixed(0)}% FB uptime`,
    padX + bigW + 24,
    102,
  );
  ctx.fillText(
    `${meta.weakness ? `${meta.weakness}-weak boss` : 'no element'}  ·  lvl ${
      meta.level
    }  ·  ${meta.coreLabel}  ·  180s`,
    padX,
    136,
  );

  const maxShare = Math.max(...data.units.map((u) => u.share), 0.0001);
  const barX = 430;
  const barW = W - barX - 250;
  data.units.forEach((u, i) => {
    const y = HEAD_H + i * ROW_H;
    // placeholder portrait: element-tinted rounded square with initial
    const col = ELEMENT_COLORS[u.element] ?? '#9aa3b2';
    ctx.fillStyle = '#1f232d';
    roundRect(ctx, padX, y + 10, 60, 60, 10);
    ctx.fill();
    ctx.fillStyle = col;
    roundRect(ctx, padX, y + 10, 60, 60, 10);
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText((u.name[0] ?? '?').toUpperCase(), padX + 30, y + 49);
    ctx.textAlign = 'left';

    // name + tag
    ctx.fillStyle = '#e7eaf0';
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(u.name + (u.advantaged ? '  ▲' : ''), padX + 78, y + 36);
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(`B${u.burst} · ${u.weapon} · ${u.element}`, padX + 78, y + 58);

    // share bar
    ctx.fillStyle = '#2a2f3b';
    roundRect(ctx, barX, y + 30, barW, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#5b9dff';
    roundRect(ctx, barX, y + 30, (u.share / maxShare) * barW, 16, 8);
    ctx.fill();

    // share % + damage (right aligned)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#5b9dff';
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText(`${(u.share * 100).toFixed(1)}%`, W - padX, y + 34);
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(fmt(u.totalDamage), W - padX, y + 56);
    ctx.textAlign = 'left';
  });

  // footer
  ctx.fillStyle = '#8b93a3';
  ctx.font = `400 13px ${FONT}`;
  ctx.fillText(
    'nikke-sim · expected-value crits · always in range · 0 enemy debuffs',
    padX,
    H - 22,
  );
}
