// Reusable team share-card image pipeline for the browser: load each unit's real
// portrait, render the isomorphic drawTeamCard (same code the bot uses) to a PNG,
// and copy/download it. Shared by the Sim tab AND the Team/Roster generators so
// the "Copy image" behaviour (and now real portraits) live in exactly one place.
import {
  CARD_W,
  cardHeight,
  drawTeamCard,
  drawRosterCard,
  rosterCardHeight,
  type Canvas2DLike,
  type TeamCardMeta,
  type TeamCardUnit,
} from '../../src/share/teamCard';
import { portraitThumb } from './portraitThumb';
import { manifestThumbUrl } from './portraitManifest';

// One share-card unit as the callers know it: the drawn fields (minus the loaded
// `img`, which this module fills in) plus the slug used to find its portrait.
export type ShareUnit = Omit<TeamCardUnit, 'img'> & { slug: string };
export interface ShareTeamData {
  teamDamage: number;
  teamDps: number;
  fullBursts: number;
  fullBurstUptime: number;
  units: ShareUnit[];
}

// Load a portrait for the share canvas. Prefers the generated local thumbnail
// (same-origin, pre-cropped — no canvas work and no taint risk); falls back to
// the runtime downscale of the raw CDN art (via portraitThumb — stepped halving
// avoids the outline aliasing a single big drawImage reduction causes), then to
// the raw cross-origin image. The CDN sends `access-control-allow-origin: *`,
// so `crossOrigin='anonymous'` keeps the canvas untainted (toBlob/clipboard
// allowed). Resolves null on any failure so a missing portrait degrades to a
// placeholder.
export function loadPortrait(url: string): Promise<HTMLImageElement | null> {
  const load = (src: string, crossOrigin: boolean) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  return (async () => {
    const local = manifestThumbUrl(url, 120); // crisp square, comfortably above draw size
    if (local) {
      const img = await load(local, false);
      if (img) return img;
    }
    const thumb = await portraitThumb(url, 120);
    return load(thumb ?? url, true);
  })();
}

// Render a team's summary card (with real portraits) to a PNG blob. Portraits are
// resolved per unit via imageUrlFor(slug); a missing one degrades to the
// element-tinted placeholder. Returns null where canvas is unavailable (JSDOM).
export async function buildTeamCardBlob(
  data: ShareTeamData,
  meta: TeamCardMeta,
  imageUrlFor: (slug: string) => string | undefined,
): Promise<Blob | null> {
  const imgs = await Promise.all(
    data.units.map(async (u) => {
      const url = imageUrlFor(u.slug);
      return url ? await loadPortrait(url) : null;
    }),
  );
  const units: TeamCardUnit[] = data.units.map((u, i) => ({
    name: u.name,
    burst: u.burst,
    weapon: u.weapon,
    element: u.element,
    advantaged: u.advantaged,
    share: u.share,
    totalDamage: u.totalDamage,
    img: imgs[i] ?? undefined,
  }));

  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = CARD_W * dpr;
  cv.height = cardHeight(units.length) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) return null; // jsdom / no canvas support
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high'; // crisp portrait downscale
  drawTeamCard(
    ctx as unknown as Canvas2DLike,
    {
      teamDamage: data.teamDamage,
      teamDps: data.teamDps,
      fullBursts: data.fullBursts,
      fullBurstUptime: data.fullBurstUptime,
      units,
    },
    meta,
  );
  return new Promise((resolve) => cv.toBlob((b) => resolve(b), 'image/png'));
}

// Copy a PNG blob to the clipboard, falling back to a download where the async
// clipboard image API isn't available (e.g. Firefox).
export async function copyOrDownloadPng(
  blob: Blob,
  filename: string,
): Promise<'copied' | 'downloaded'> {
  const nav = navigator as any;
  try {
    if (nav.clipboard?.write && (window as any).ClipboardItem) {
      await nav.clipboard.write([
        new (window as any).ClipboardItem({ 'image/png': blob }),
      ]);
      return 'copied';
    }
  } catch {
    /* clipboard image write blocked/unsupported — download instead */
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return 'downloaded';
}

// Build + copy/download in one call (the common case). 'unsupported' when the
// card couldn't be rendered at all.
export async function shareTeamCard(
  data: ShareTeamData,
  meta: TeamCardMeta,
  imageUrlFor: (slug: string) => string | undefined,
  filename = 'nikke-team.png',
): Promise<'copied' | 'downloaded' | 'unsupported'> {
  const blob = await buildTeamCardBlob(data, meta, imageUrlFor);
  if (!blob) return 'unsupported';
  return copyOrDownloadPng(blob, filename);
}

// ---- roster (5-team) share card -------------------------------------------

export interface ShareRosterTeam {
  teamDamage: number;
  units: { slug: string; name: string; element: string }[];
  bossLabel?: string;
}
export interface ShareRosterData {
  totalDamage: number;
  teams: ShareRosterTeam[];
  title?: string;
}

// Render the roster summary card (real portraits) to a PNG blob. Portraits for
// every unit across every team are loaded up front and reused.
export async function buildRosterCardBlob(
  data: ShareRosterData,
  meta: TeamCardMeta,
  imageUrlFor: (slug: string) => string | undefined,
): Promise<Blob | null> {
  // dedupe portrait loads across teams (roster teams share no units, but this is
  // cheap and future-proofs a mode that does)
  const cache = new Map<string, Promise<HTMLImageElement | null>>();
  const load = (slug: string) => {
    const url = imageUrlFor(slug);
    if (!url) return Promise.resolve(null);
    if (!cache.has(slug)) cache.set(slug, loadPortrait(url));
    return cache.get(slug)!;
  };
  const teams = await Promise.all(
    data.teams.map(async (t) => ({
      teamDamage: t.teamDamage,
      bossLabel: t.bossLabel,
      units: await Promise.all(
        t.units.map(async (u) => ({
          name: u.name,
          element: u.element,
          img: (await load(u.slug)) ?? undefined,
        })),
      ),
    })),
  );

  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = CARD_W * dpr;
  cv.height = rosterCardHeight(teams.length) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawRosterCard(
    ctx as unknown as Canvas2DLike,
    { totalDamage: data.totalDamage, teams, title: data.title },
    meta,
  );
  return new Promise((resolve) => cv.toBlob((b) => resolve(b), 'image/png'));
}

export async function shareRosterCard(
  data: ShareRosterData,
  meta: TeamCardMeta,
  imageUrlFor: (slug: string) => string | undefined,
  filename = 'nikke-roster.png',
): Promise<'copied' | 'downloaded' | 'unsupported'> {
  const blob = await buildRosterCardBlob(data, meta, imageUrlFor);
  if (!blob) return 'unsupported';
  return copyOrDownloadPng(blob, filename);
}
