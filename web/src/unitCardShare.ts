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
  type UnitCardCharacter,
  type DpsArtifactLike,
} from '../../src/infographics/core/unitCardData';
import type { UnitCardData } from '../../src/infographics/core/unitCard';
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

const characters = (charactersJson as { characters: Record<string, UnitCardCharacter> })
  .characters;
const archetype = archetypeJson as {
  tags: Record<string, string[]>;
  vocabulary: Record<string, { label: string }>;
};
const olUnits = (olOptimalJson as { units: Record<string, { type: string; count: number }[]> })
  .units;
const tsareenaUnits = (tsareenaJson as unknown as TsareenaBuildFile).units;

// Icons are tracked assets under web/public/nikke-icons/, served at the root.
// SVG-first for the same reason the Node loader prefers it — the browser scales
// a vector cleanly to whatever the canvas draws it at, where a 25px class_*
// raster visibly softens.
const ICON_EXT = ['svg', 'png', 'webp'];

const iconCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadOne(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Try each extension in order; a name with no variant resolves to null and the
// card simply omits that mark rather than drawing a broken image.
export function loadIconImage(name: string | null): Promise<HTMLImageElement | null> {
  if (!name) {
    return Promise.resolve(null);
  }
  let hit = iconCache.get(name);
  if (!hit) {
    hit = (async () => {
      for (const ext of ICON_EXT) {
        const img = await loadOne(`/nikke-icons/${name}.${ext}`);
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
  siteIcon?: unknown
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
  });

  const [element, burst, cls, weapon, manufacturer] = await Promise.all([
    loadIconImage(ICON_BY_ELEMENT[model.element] ?? null),
    loadIconImage(ICON_BY_BURST[model.burst] ?? null),
    loadIconImage(ICON_BY_CLASS[model.class] ?? null),
    loadIconImage(iconNameForWeapon(model.weapon)),
    loadIconImage(
      model.manufacturer ? iconNameForManufacturer(model.manufacturer) : null
    ),
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
    siteIcon,
    footer: 'nikkesim.app',
  };
}
