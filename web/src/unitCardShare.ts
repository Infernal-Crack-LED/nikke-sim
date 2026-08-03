// Browser host for the unit card — the mirror of scripts/lib/unit-card-sources.ts.
//
// Both hosts feed the SAME core renderer (core/unitCard.ts) from the SAME data
// builder (core/unitCardData.ts); only the image loading differs, because core/
// is platform-free and takes images ALREADY LOADED. Node rasterizes icons with
// sharp; here they are ordinary <img> loads out of web/public/nikke-icons/,
// which Vite serves at /nikke-icons/.
//
// The browser deliberately does NOT reimplement icon selection: the
// iconNameFor* mappers are imported from the node-free half of the icon module
// so a card can't pick a different manufacturer icon on the two hosts.
import charactersJson from '../../data/characters.json';
import archetypeJson from '../../data/archetype-tags.json';
import olOptimalJson from '../../data/ol-optimal.json';
import tsareenaJson from '../../data/tsareena-build.json';
import {
  buildUnitCardData,
  neighbourRowsFor,
  type UnitCardCharacter,
  type DpsArtifactLike,
} from '../../src/infographics/core/unitCardData';
import type {
  UnitCardData,
  UnitCardVariant,
} from '../../src/infographics/core/unitCard';
import {
  ICON_BY_ELEMENT,
  ICON_BY_BURST,
  ICON_BY_CLASS,
  iconNameForWeapon,
  iconNameForManufacturer,
} from '../../src/infographics/core/iconNames';
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
} from '../../src/ranks/types';
import type { TsareenaBuildFile } from '../../src/types';
import { loadSiteIcon } from './siteIcon';

const characters = (
  charactersJson as { characters: Record<string, UnitCardCharacter> }
).characters;
const archetype = archetypeJson as {
  tags: Record<string, string[]>;
  vocabulary: Record<string, { label: string }>;
};
const olUnits = (
  olOptimalJson as { units: Record<string, { type: string; count: number }[]> }
).units;
const tsareenaUnits = (tsareenaJson as unknown as TsareenaBuildFile).units;

// Icons are tracked assets under web/public/nikke-icons/, served at the root.
// SVG-first for the same reason the Node loader prefers it — the browser scales
// a vector cleanly to whatever the canvas draws it at, where a 25px class_*
// raster visibly softens.
const ICON_EXT = ['svg', 'png', 'webp'];

const iconCache = new Map<string, Promise<CanvasImageSource | null>>();

function loadOne(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// An SVG with a viewBox but NO width/height has no intrinsic size, and Chromium
// reports a 150x150 default for it. That breaks the card renderer two ways: the
// aspect is wrong (code_electric's viewBox is 73x73, not 150x150), and — the
// visible symptom — core/unitCard.ts drawContained() uses the NINE-argument
// drawImage(img, sx, sy, sw, sh, ...) source-rect form, which Chromium silently
// declines to draw for an intrinsic-less SVG. The five-arg form draws it fine.
//
// That is why the element code icon was missing from every browser-rendered unit
// card (the Card Builder preview and its "Copy image" output included) while the
// Node-rendered PNGs had it: sharp reads the viewBox and rasterizes correctly.
//
// So: rasterize here, at the viewBox's aspect, via the five-arg form, and hand
// the renderer a CANVAS. A canvas has a real width/height, so the source-rect
// draw downstream is well-defined.
const SVG_RASTER_H = 256; // ~3x the largest size any card draws an icon at

function viewBoxAspect(svg: string): number {
  const m = /viewBox\s*=\s*["']([-\d.\s]+)["']/.exec(svg);
  const p = m?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return p?.length === 4 && p[2] > 0 && p[3] > 0 ? p[2] / p[3] : 1;
}

// True when the canvas has ANY non-transparent pixel. Guards the case where the
// browser "loads" the SVG but draws nothing — returning a blank canvas would
// reintroduce the invisible-icon bug while looking like a success.
function hasInk(cv: HTMLCanvasElement): boolean {
  try {
    const ctx = cv.getContext('2d');
    if (!ctx) {
      return false;
    }
    const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false; // tainted or no 2d context — treat as a miss, fall to the raster
  }
}

async function rasterizeSvg(src: string): Promise<HTMLCanvasElement | null> {
  let aspect: number;
  try {
    const res = await fetch(src);
    if (!res.ok) {
      return null;
    }
    aspect = viewBoxAspect(await res.text());
  } catch {
    return null;
  }
  const img = await loadOne(src);
  if (!img) {
    return null;
  }
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(SVG_RASTER_H * aspect));
  cv.height = SVG_RASTER_H;
  const ctx = cv.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cv.width, cv.height); // five-arg — see above
  return hasInk(cv) ? cv : null;
}

// Try each extension in order; a name with no usable variant resolves to null and
// the card simply omits that mark rather than drawing a broken image. An SVG that
// can't be rasterized falls through to its raster twin (every code_* icon ships a
// .png), so a browser quirk costs sharpness, never the icon.
export function loadIconImage(
  name: string | null
): Promise<CanvasImageSource | null> {
  if (!name) {
    return Promise.resolve(null);
  }
  let hit = iconCache.get(name);
  if (!hit) {
    hit = (async () => {
      for (const ext of ICON_EXT) {
        const src = `/nikke-icons/${name}.${ext}`;
        const img =
          ext === 'svg' ? await rasterizeSvg(src) : await loadOne(src);
        if (img) {
          return img;
        }
      }
      return null;
    })();
    iconCache.set(name, hit);
  }
  return hit;
}

export interface UnitCardBoards {
  dpschart?: DpsArtifactLike | null;
  burstgen?: BurstGenArtifact | null;
  bufferchart?: BufferChartArtifact | null;
  sustain?: SustainArtifact | null;
  burstcdr?: BurstCdrArtifact | null;
}

// Build the full render payload for a slug. Boards are passed in because the
// page already loads them lazily for its other cards — re-fetching here would
// double the network for no gain.
export async function buildUnitCardShare(
  slug: string,
  boards: UnitCardBoards,
  portrait: HTMLImageElement | null,
  // Undefined (the common case — no caller currently has one already loaded)
  // falls back to the site icon; pass null explicitly to force no icon.
  siteIcon?: unknown,
  // Portrait draws a wider neighbourhood, so the browser preview has to know
  // which variant it is building or it renders a different card than the
  // pre-rendered one for the same unit.
  variant: UnitCardVariant = 'discord'
): Promise<UnitCardData | null> {
  const character = characters[slug];
  if (!character) {
    return null;
  }
  const model = buildUnitCardData({
    character,
    dpschart: boards.dpschart ?? null,
    burstgen: boards.burstgen ?? null,
    bufferchart: boards.bufferchart ?? null,
    sustain: boards.sustain ?? null,
    burstcdr: boards.burstcdr ?? null,
    tags: archetype.tags[slug] ?? null,
    tagLabels: archetype.vocabulary,
    olOptimal: olUnits[slug] ?? null,
    tsareena: tsareenaUnits[slug] ?? null,
    neighbourRows: neighbourRowsFor(variant),
  });

  const [element, burst, cls, weapon, manufacturer, resolvedSiteIcon] =
    await Promise.all([
      loadIconImage(ICON_BY_ELEMENT[model.element] ?? null),
      loadIconImage(ICON_BY_BURST[model.burst] ?? null),
      loadIconImage(ICON_BY_CLASS[model.class] ?? null),
      loadIconImage(iconNameForWeapon(model.weapon)),
      loadIconImage(
        model.manufacturer ? iconNameForManufacturer(model.manufacturer) : null
      ),
      siteIcon === undefined ? loadSiteIcon() : Promise.resolve(siteIcon),
    ]);

  return {
    model,
    portrait: portrait ?? undefined,
    icons: {
      element: element ?? undefined,
      burst: burst ?? undefined,
      class: cls ?? undefined,
      weapon: weapon ?? undefined,
      manufacturer: manufacturer ?? undefined,
    },
    siteIcon: resolvedSiteIcon,
    footer: 'nikkesim.app',
  };
}
