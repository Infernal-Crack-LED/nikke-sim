// Per-character identity card renderer — portrait, name, and the unit's key
// identity fields (element, class, weapon, burst stage) from
// data/characters.json. Draws to any Canvas2D-compatible context; DOM-free like
// the other core renderers (the web app and the Node pre-generation script both
// host it). Visual style mirrors dpsChart.ts / teamCard.ts: dark bg, blue
// accent, Roboto, mandatory watermark footer.
import { type Canvas2DLike, roundRect, PORTRAIT_CROP_TOP } from './canvas2d.js';
import {
  FONT,
  ELEMENT_COLORS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DIM,
  drawWatermark,
} from './theme.js';

export interface UnitCardData {
  name: string;
  element: string; // Fire | Water | Wind | Electric | Iron
  weapon: string; // AR | MG | RL | SG | SMG | SR
  burst: string; // 'I' | 'II' | 'III' | 'Λ' (Λ = operates as any stage)
  class: string; // Attacker | Defender | Supporter
  manufacturer: string;
  burstCooldownSec: number | null;
  // optional pre-loaded portrait (Canvas2D-drawable). Omitted → placeholder
  // box + initial, same degrade path as teamCard.
  img?: unknown;
  footer?: string; // descriptor added to the watermark footer (theme.ts)
}

// Sized for Discord embeds: 1.28:1 at logical px, 1280×960 at scale 2 — the
// same width family as the table card (720) and DPS chart (900).
export const UNIT_CARD_W = 640;
export const UNIT_CARD_H = 480;

const PAD = 36;
const PORTRAIT = 240;
const PORTRAIT_Y = 124;

// Fit the name to the card width: step down through sizes, then truncate.
// Longest roster names today are ~24 chars and fit at 32px; the fallback
// protects future longer names.
function fitName(ctx: Canvas2DLike, name: string, maxW: number): string {
  for (const size of [32, 28, 24]) {
    ctx.font = `700 ${size}px ${FONT}`;
    if (ctx.measureText(name).width <= maxW) {
      return name;
    }
  }
  let s = name;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) {
    s = s.slice(0, -1);
  }
  return s.trimEnd() + '…';
}

// Draw the card at logical (unscaled) coordinates. The caller must have
// created a canvas of UNIT_CARD_W × UNIT_CARD_H (times dpr) and pre-scaled ctx.
export function drawUnitCard(ctx: Canvas2DLike, data: UnitCardData): void {
  const W = UNIT_CARD_W;
  const H = UNIT_CARD_H;
  const col = ELEMENT_COLORS[data.element] ?? '#9aa3b2';

  // background + accent bar
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  // name + subtitle (class · manufacturer)
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const name = fitName(ctx, data.name, W - PAD * 2);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(name, PAD, 64); // font set by fitName
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 16px ${FONT}`;
  ctx.fillText(`${data.class} · ${data.manufacturer}`, PAD, 92);

  // portrait: element-tinted ring, then the square-cropped art (anchored
  // PORTRAIT_CROP_TOP down from the top — the same framing as every other
  // card and the site's CSS object-position).
  ctx.fillStyle = col;
  roundRect(ctx, PAD - 4, PORTRAIT_Y - 4, PORTRAIT + 8, PORTRAIT + 8, 14);
  ctx.fill();
  ctx.save();
  roundRect(ctx, PAD, PORTRAIT_Y, PORTRAIT, PORTRAIT, 12);
  ctx.clip();
  ctx.fillStyle = '#1f232d';
  ctx.fillRect(PAD, PORTRAIT_Y, PORTRAIT, PORTRAIT);
  if (data.img) {
    const im = data.img as {
      naturalWidth?: number;
      naturalHeight?: number;
      width?: number;
      height?: number;
    };
    const iw = im.naturalWidth ?? im.width ?? PORTRAIT;
    const ih = im.naturalHeight ?? im.height ?? PORTRAIT;
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2;
    const sy = (ih - side) * PORTRAIT_CROP_TOP;
    ctx.drawImage(
      data.img,
      sx,
      sy,
      side,
      side,
      PAD,
      PORTRAIT_Y,
      PORTRAIT,
      PORTRAIT
    );
  } else {
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(PAD, PORTRAIT_Y, PORTRAIT, PORTRAIT);
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.font = `700 64px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      (data.name[0] ?? '?').toUpperCase(),
      PAD + PORTRAIT / 2,
      PORTRAIT_Y + PORTRAIT / 2 + 22
    );
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // right column: element chip, then burst + weapon stat blocks
  const colX = PAD + PORTRAIT + 44;

  // element chip (filled pill, dark text)
  const chipY = 148;
  const chipH = 40;
  ctx.font = `700 18px ${FONT}`;
  const chipW = ctx.measureText(data.element).width + 40;
  ctx.fillStyle = col;
  roundRect(ctx, colX, chipY, chipW, chipH, 20);
  ctx.fill();
  ctx.fillStyle = '#101216';
  ctx.fillText(data.element, colX + 20, chipY + 27);

  // burst block — B1/B2/B3 convention (teamCard's `B${burst}`), with cooldown
  const burstY = 244;
  ctx.fillStyle = TEXT_DIM;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('BURST', colX, burstY);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `600 20px ${FONT}`;
  const cd =
    data.burstCooldownSec != null ? ` · ${data.burstCooldownSec}s CD` : '';
  ctx.fillText(`B${data.burst}${cd}`, colX, burstY + 28);

  // weapon block
  const weaponY = 324;
  ctx.fillStyle = TEXT_DIM;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('WEAPON', colX, weaponY);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(data.weapon, colX, weaponY + 28);

  // footer — the mandatory watermark final pass (theme.ts): `footer` only adds
  // a descriptor; it can never remove or replace the nikkesim.app mark.
  drawWatermark(ctx, PAD, H - 18, 12, data.footer, 'nikke-sim unit card');
}
