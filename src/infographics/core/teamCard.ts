// Shared summary-card renderer. Draws the result "share image" to any
// Canvas2D-compatible context, so the web app (browser canvas) and the bot
// (@napi-rs/canvas / node-canvas) produce a pixel-identical card. This module
// is DOM-free — the caller creates and sizes the canvas and hands us the ctx.
//
// Portraits: the caller may pass a pre-loaded, square-cropped portrait image per
// unit (`TeamCardUnit.img`) which is drawn (rounded-clipped) into the 60x60 slot;
// units without an image degrade to an element-tinted box + name initial. The bot
// has no CORS constraint, the browser loads CDN art with crossOrigin='anonymous'.
import {
  type Canvas2DLike,
  roundRect,
  fitText,
  barTrackX,
  drawAdvantageMark,
  ADVANTAGE_MARK_GAP,
  ADVANTAGE_MARK_W,
  BAR_LABEL_GAP,
} from './canvas2d.js';
import {
  FONT,
  ELEMENT_COLORS,
  drawBrandMark,
  drawFooterNote,
  footerNote,
  brandMarkIconRect,
} from './theme.js';

export interface TeamCardUnit {
  name: string;
  burst: string;
  weapon: string;
  element: string;
  advantaged: boolean;
  share: number; // 0..1
  totalDamage: number;
  // optional pre-loaded portrait (ideally an already square-cropped thumbnail);
  // a Canvas2D-drawable image. Omitted → placeholder box + initial.
  img?: unknown;
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
  icon?: unknown; // the nikkesim.app mark's icon, drawn top-right
  footer?: string; // the descriptor note; the mark itself is fixed (theme.ts)
}

// layout constants (logical px; caller scales for device pixel ratio)
export const CARD_W = 1040;
const PAD_X = 40;
const HEAD_H = 156;
const ROW_H = 84;
// Bottom pad. The mark moved to the title row, so all that can land here is the
// footer NOTE (theme.ts footerNote) — the sim caveats, or the "simmed <date>"
// stamp a stored-snapshot card carries (src/server/card-from-build.ts).
const FOOT_H = 30;
// The mark's icon y — hung so it reads level with a 30px title on baseline 56.
const MARK_TOP = 14;

// Ink-guard geometry, exported so every assertTitleInk caller (golden harness,
// build-infographics, the golden test's icon-immunity cases) derives from the
// same numbers a layout change would move — a hand-copied region can silently
// re-vacate the guard (it once passed on icon pixels alone, zero glyphs).
// TITLE_ICON is the mark's icon rect (top-right); TITLE_INK_REGION covers the
// title, which starts at padX, so the icon alone can never satisfy the guard.
export const TEAM_TITLE_ICON = brandMarkIconRect(CARD_W, PAD_X, MARK_TOP);
export const TEAM_TITLE_INK_REGION = {
  x: PAD_X, // title textX (30px title, baseline y 56)
  y: 26,
  w: 400,
  h: 40,
} as const;

// The four cards below draw the same title row: the mark hung top-right, the
// title at padX, fitted so it can never run under the mark.
function drawTeamTitle(
  ctx: Canvas2DLike,
  title: string,
  meta: TeamCardMeta,
  // The card's own default descriptor, used when the caller passes none. The
  // SIM cards state their assumptions; the composition cards have no sim behind
  // them and so have nothing to caveat.
  fallback: string
): string {
  const note = footerNote(meta.footer, fallback);
  const markLeft = drawBrandMark(ctx, {
    right: CARD_W - PAD_X,
    top: MARK_TOP,
    icon: meta.icon,
  });
  ctx.fillStyle = '#e7eaf0';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(fitText(ctx, title, markLeft - 16 - PAD_X), PAD_X, 56);
  return note;
}

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

// Draw the card at logical (unscaled) coordinates. The caller must have created
// a canvas of CARD_W x cardHeight(units.length) (times dpr) and pre-scaled ctx.
export function drawTeamCard(
  ctx: Canvas2DLike,
  data: TeamCardData,
  meta: TeamCardMeta
) {
  const W = CARD_W;
  const padX = PAD_X;
  const H = cardHeight(data.units.length);

  // background + accent bar
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  // mark + title + summary
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const note = drawTeamTitle(
    ctx,
    'NIKKE Solo Raid Sim',
    meta,
    'nikke-sim · expected-value crits · always in range · 0 enemy debuffs'
  );
  ctx.fillStyle = '#e7eaf0';
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
    102
  );
  ctx.fillText(
    `${meta.weakness ? `${meta.weakness}-weak boss` : 'no element'}  ·  lvl ${
      meta.level
    }  ·  ${meta.coreLabel}  ·  180s`,
    padX,
    136
  );

  const maxShare = Math.max(...data.units.map((u) => u.share), 0.0001);
  // The share bar starts after the LONGEST unit label + BAR_LABEL_GAP, never
  // at a fixed x a long NIKKE name can overrun (canvas2d.ts barTrackX — the
  // same rule dpsChart.ts uses). 430 is the designed minimum, so a card of
  // short names is unchanged; 620 caps it so the bars stay readable and a
  // longer name ellipsizes instead.
  const NAME_X = padX + 78;
  // the advantage marker is a drawn triangle (canvas2d.ts), so it costs a
  // fixed gap + width rather than measuring as text
  const markW = (u: { advantaged: boolean }): number =>
    u.advantaged ? ADVANTAGE_MARK_GAP + ADVANTAGE_MARK_W : 0;
  ctx.font = `600 20px ${FONT}`;
  const nameEnd = Math.max(
    ...data.units.map((u) => NAME_X + ctx.measureText(u.name).width + markW(u)),
    0
  );
  const barX = barTrackX(nameEnd, 430, 620);
  const barW = W - barX - 250;
  const nameMaxW = barX - NAME_X - BAR_LABEL_GAP;
  data.units.forEach((u, i) => {
    const y = HEAD_H + i * ROW_H;
    const col = ELEMENT_COLORS[u.element] ?? '#9aa3b2';
    if (u.img) {
      // real portrait: draw the (square) art clipped into a rounded square. A
      // thin element-tinted ring keeps the element legible at a glance.
      ctx.save();
      roundRect(ctx, padX, y + 10, 60, 60, 10);
      ctx.clip();
      ctx.fillStyle = '#1f232d';
      ctx.fillRect(padX, y + 10, 60, 60); // backdrop for any transparency
      ctx.drawImage(u.img, padX, y + 10, 60, 60);
      ctx.restore();
    } else {
      // placeholder portrait: element-tinted rounded square with initial
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
    }

    // name + tag
    ctx.fillStyle = '#e7eaf0';
    ctx.font = `600 20px ${FONT}`;
    const name = fitText(ctx, u.name, nameMaxW - markW(u));
    ctx.fillText(name, NAME_X, y + 36);
    if (u.advantaged) {
      drawAdvantageMark(
        ctx,
        NAME_X + ctx.measureText(name).width + ADVANTAGE_MARK_GAP,
        y + 36
      );
    }
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(
      fitText(ctx, `B${u.burst} · ${u.weapon} · ${u.element}`, nameMaxW),
      NAME_X,
      y + 58
    );

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

  // footer — the descriptor's NOTE only; the mandatory mark is in the title row
  // (theme.ts drawBrandMark).
  drawFooterNote(ctx, padX, H - 11, 13, note);
}

// ---------------------------------------------------------------------------
// Team COMPOSITION card — the /teambuilder + bot `/teams` card. A team builder
// output has no sim behind it, so this card states only what the user actually
// chose: the 5 portraits in one row with their names, and the boss/level/core
// line. Deliberately NO damage, DPS, full-burst or share numbers (owner ruling
// 2026-07-28) — drawTeamCard above keeps those, because the SIM RESULTS share
// card on the web genuinely has them.
// ---------------------------------------------------------------------------
const C_HEAD_H = 132;
const C_PS = 160; // portrait square — 5 across CARD_W
const C_GAP = 40;
const C_NAME_H = 62; // name + tag block under each portrait
const C_FOOT_H = 30; // bottom pad — see FOOT_H

export const compositionCardHeight = (): number =>
  C_HEAD_H + C_PS + C_NAME_H + C_FOOT_H;

export function drawTeamCompositionCard(
  ctx: Canvas2DLike,
  data: { units: TeamCardUnit[] },
  meta: TeamCardMeta
): void {
  const W = CARD_W;
  const padX = PAD_X;
  const H = compositionCardHeight();

  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  // title + the settings line (what was SELECTED — not a result)
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const note = drawTeamTitle(ctx, 'NIKKE Solo Raid Sim', meta, 'nikke-sim');
  ctx.fillStyle = '#8b93a3';
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText(
    `${meta.weakness ? `${meta.weakness}-weak boss` : 'no element'}  ·  lvl ${
      meta.level
    }  ·  ${meta.coreLabel}`,
    padX,
    94
  );

  // one row of up to 5 portraits, centred as a group
  const n = Math.min(data.units.length, 5);
  const stripW = n * C_PS + Math.max(0, n - 1) * C_GAP;
  const startX = Math.max(padX, (W - stripW) / 2);
  data.units.slice(0, 5).forEach((u, i) => {
    const x = startX + i * (C_PS + C_GAP);
    const y = C_HEAD_H;
    const col = ELEMENT_COLORS[u.element] ?? '#9aa3b2';
    if (u.img) {
      ctx.save();
      roundRect(ctx, x, y, C_PS, C_PS, 16);
      ctx.clip();
      ctx.fillStyle = '#1f232d';
      ctx.fillRect(x, y, C_PS, C_PS);
      ctx.drawImage(u.img, x, y, C_PS, C_PS);
      ctx.restore();
    } else {
      ctx.fillStyle = '#1f232d';
      roundRect(ctx, x, y, C_PS, C_PS, 16);
      ctx.fill();
      ctx.fillStyle = col;
      roundRect(ctx, x, y, C_PS, C_PS, 16);
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.font = `700 56px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(
        (u.name[0] ?? '?').toUpperCase(),
        x + C_PS / 2,
        y + C_PS / 2 + 20
      );
      ctx.textAlign = 'left';
    }
    // element strip under the portrait, then name + tag, all centred on it
    ctx.fillStyle = col;
    ctx.fillRect(x, y + C_PS - 4, C_PS, 4);

    ctx.textAlign = 'center';
    const mid = x + C_PS / 2;
    ctx.fillStyle = '#e7eaf0';
    ctx.font = `600 18px ${FONT}`;
    // the advantage marker is drawn, so it takes room out of the name's box
    const mark = u.advantaged ? ADVANTAGE_MARK_GAP + ADVANTAGE_MARK_W : 0;
    const name = fitText(ctx, u.name, C_PS + C_GAP - 12 - mark);
    const nameW = ctx.measureText(name).width;
    ctx.fillText(name, mid - mark / 2, y + C_PS + 30);
    if (u.advantaged) {
      drawAdvantageMark(
        ctx,
        mid - mark / 2 + nameW / 2 + ADVANTAGE_MARK_GAP,
        y + C_PS + 30
      );
    }
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(
      `B${u.burst} · ${u.weapon} · ${u.element}`,
      mid,
      y + C_PS + 52
    );
    ctx.textAlign = 'left';
  });

  drawFooterNote(ctx, padX, H - 11, 13, note);
}

// ---------------------------------------------------------------------------
// Roster card — a simplified 5-team summary (Solo-Raid Roster Generator). Per
// team: the 5 portraits + a total-team-damage bar. No per-unit rows, no DPS/FB.
// ---------------------------------------------------------------------------
export interface RosterCardUnit {
  name: string;
  element: string;
  img?: unknown; // optional pre-loaded portrait (see TeamCardUnit.img)
}
export interface RosterCardTeam {
  teamDamage: number;
  units: RosterCardUnit[];
  // per-team boss options line (union raid); rendered beside the team label
  bossLabel?: string;
}
export interface RosterCardData {
  totalDamage: number; // sum across all teams
  teams: RosterCardTeam[];
  // card title override (defaults to "NIKKE Solo Raid Sim · Roster Generator")
  title?: string;
}

const R_HEAD_H = 156;
const R_ROW_H = 96;
const R_FOOT_H = 30; // bottom pad — see FOOT_H
const R_PS = 58; // portrait square
const R_GAP = 7;

export const rosterCardHeight = (teamCount: number) =>
  R_HEAD_H + teamCount * R_ROW_H + R_FOOT_H;

// Draw the roster summary card at logical (unscaled) coordinates. The caller must
// have created a canvas of CARD_W x rosterCardHeight(teams.length) (times dpr) and
// pre-scaled ctx (mirrors drawTeamCard's contract).
export function drawRosterCard(
  ctx: Canvas2DLike,
  data: RosterCardData,
  meta: TeamCardMeta
) {
  const W = CARD_W;
  const padX = PAD_X;
  const H = rosterCardHeight(data.teams.length);
  const hasBossLabels = data.teams.some((t) => t.bossLabel);

  // background + accent bar
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  // mark + title + summary (total only — no DPS/FB, per the roster card spec)
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const note = drawTeamTitle(
    ctx,
    data.title ?? 'NIKKE Solo Raid Sim · Roster Generator',
    meta,
    'nikke-sim · expected-value crits · always in range · 0 enemy debuffs'
  );
  ctx.fillStyle = '#e7eaf0';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(fmt(data.totalDamage), padX, 108);
  const bigW = ctx.measureText(fmt(data.totalDamage)).width;
  ctx.font = `400 18px ${FONT}`;
  ctx.fillStyle = '#8b93a3';
  ctx.fillText(
    `total damage across all ${data.teams.length} teams`,
    padX + bigW + 24,
    102
  );
  // global meta line — omitted when per-team boss labels carry the options
  if (!hasBossLabels) {
    ctx.fillText(
      `${meta.weakness ? `${meta.weakness}-weak boss` : 'no element'}  ·  lvl ${
        meta.level
      }  ·  ${meta.coreLabel}  ·  180s`,
      padX,
      136
    );
  } else {
    ctx.fillText(`lvl ${meta.level}  ·  180s`, padX, 136);
  }

  // one row per team: portraits then a total-damage bar scaled to the top team.
  const stripW = data.teams[0]
    ? data.teams[0].units.length * R_PS +
      (data.teams[0].units.length - 1) * R_GAP
    : 0;
  const barX = padX + stripW + 28;
  const barW = W - barX - 200;
  const maxDmg = Math.max(...data.teams.map((t) => t.teamDamage), 1);
  data.teams.forEach((t, i) => {
    const y = R_HEAD_H + i * R_ROW_H;
    const py = y + (R_ROW_H - R_PS) / 2;
    // portraits
    t.units.forEach((u, j) => {
      const px = padX + j * (R_PS + R_GAP);
      const col = ELEMENT_COLORS[u.element] ?? '#9aa3b2';
      if (u.img) {
        ctx.save();
        roundRect(ctx, px, py, R_PS, R_PS, 9);
        ctx.clip();
        ctx.fillStyle = '#1f232d';
        ctx.fillRect(px, py, R_PS, R_PS);
        ctx.drawImage(u.img, px, py, R_PS, R_PS);
        ctx.restore();
      } else {
        ctx.fillStyle = '#1f232d';
        roundRect(ctx, px, py, R_PS, R_PS, 9);
        ctx.fill();
        ctx.fillStyle = col;
        roundRect(ctx, px, py, R_PS, R_PS, 9);
        ctx.globalAlpha = 0.22;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.font = `700 24px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(
          (u.name[0] ?? '?').toUpperCase(),
          px + R_PS / 2,
          py + R_PS / 2 + 8
        );
        ctx.textAlign = 'left';
      }
    });
    // team label (+ per-team boss options when present)
    ctx.fillStyle = '#8b93a3';
    ctx.font = `600 13px ${FONT}`;
    const label = t.bossLabel
      ? `team ${i + 1}  ·  ${t.bossLabel}`
      : `team ${i + 1}`;
    ctx.fillText(label, padX, py - 6);
    // damage bar (scaled to the strongest team)
    const barY = y + R_ROW_H / 2 - 11;
    ctx.fillStyle = '#2a2f3b';
    roundRect(ctx, barX, barY, barW, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#5b9dff';
    roundRect(
      ctx,
      barX,
      barY,
      Math.max(2, (t.teamDamage / maxDmg) * barW),
      22,
      11
    );
    ctx.fill();
    // value (right aligned)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e7eaf0';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(fmt(t.teamDamage), W - padX, y + R_ROW_H / 2 + 6);
    ctx.textAlign = 'left';
  });

  // footer — the descriptor's NOTE only; the mandatory mark is in the title row
  // (theme.ts drawBrandMark).
  drawFooterNote(ctx, padX, H - 11, 13, note);
}

// ---------------------------------------------------------------------------
// Roster COMPOSITION card — the no-sim-behind-it variant of drawRosterCard,
// for a roster build code rendered without a results snapshot. Mirrors
// drawTeamCompositionCard's reasoning: show what was PICKED (teams +
// portraits + per-team boss labels), never a zeroed damage bar or a "0 total
// damage across all N teams" headline (owner ruling 2026-07-28, extended to
// the roster card).
// ---------------------------------------------------------------------------
export interface RosterCompositionTeam {
  units: RosterCardUnit[];
  bossLabel?: string;
}
export interface RosterCompositionData {
  teams: RosterCompositionTeam[];
  title?: string;
}

const RC_HEAD_H = 118;

export const rosterCompositionCardHeight = (teamCount: number) =>
  RC_HEAD_H + teamCount * R_ROW_H + R_FOOT_H;

export function drawRosterCompositionCard(
  ctx: Canvas2DLike,
  data: RosterCompositionData,
  meta: TeamCardMeta
): void {
  const W = CARD_W;
  const padX = PAD_X;
  const H = rosterCompositionCardHeight(data.teams.length);
  const hasBossLabels = data.teams.some((t) => t.bossLabel);

  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const note = drawTeamTitle(
    ctx,
    data.title ?? 'NIKKE Solo Raid Sim · Roster Generator',
    meta,
    'nikke-sim'
  );
  ctx.fillStyle = '#8b93a3';
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText(
    hasBossLabels
      ? `${data.teams.length} teams  ·  lvl ${meta.level}`
      : `${data.teams.length} teams  ·  ${
          meta.weakness ? `${meta.weakness}-weak boss` : 'no element'
        }  ·  lvl ${meta.level}  ·  ${meta.coreLabel}`,
    padX,
    94
  );

  // one row per team: just the portraits + the team/boss label, no bar
  data.teams.forEach((t, i) => {
    const y = RC_HEAD_H + i * R_ROW_H;
    const py = y + (R_ROW_H - R_PS) / 2;
    t.units.forEach((u, j) => {
      const px = padX + j * (R_PS + R_GAP);
      const col = ELEMENT_COLORS[u.element] ?? '#9aa3b2';
      if (u.img) {
        ctx.save();
        roundRect(ctx, px, py, R_PS, R_PS, 9);
        ctx.clip();
        ctx.fillStyle = '#1f232d';
        ctx.fillRect(px, py, R_PS, R_PS);
        ctx.drawImage(u.img, px, py, R_PS, R_PS);
        ctx.restore();
      } else {
        ctx.fillStyle = '#1f232d';
        roundRect(ctx, px, py, R_PS, R_PS, 9);
        ctx.fill();
        ctx.fillStyle = col;
        roundRect(ctx, px, py, R_PS, R_PS, 9);
        ctx.globalAlpha = 0.22;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.font = `700 24px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(
          (u.name[0] ?? '?').toUpperCase(),
          px + R_PS / 2,
          py + R_PS / 2 + 8
        );
        ctx.textAlign = 'left';
      }
    });
    ctx.fillStyle = '#8b93a3';
    ctx.font = `600 13px ${FONT}`;
    const label = t.bossLabel
      ? `team ${i + 1}  ·  ${t.bossLabel}`
      : `team ${i + 1}`;
    ctx.fillText(label, padX, py - 6);
  });

  drawFooterNote(ctx, padX, H - 11, 13, note);
}
