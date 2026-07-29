// Loads every artifact the unit card joins, and turns (sources, slug) into
// render-ready UnitCardData — portrait and icons attached.
//
// ONE loader shared by the pre-render pipeline (scripts/build-infographics.ts)
// and the dev preview (scripts/render-unit-card.ts), so a card you LOOK at
// during layout work is built from exactly the same inputs as the card that
// ships. The alternative — each script assembling its own sources — is how a
// preview quietly stops representing the artifact.
//
// Node-only: it reads the filesystem and rasterizes icons through sharp. The
// browser host (web/src/BuilderPage.tsx) does its own loading and calls the same
// core renderer.
import { existsSync, readFileSync } from 'node:fs';
import {
  loadPortrait,
  loadIcon,
  iconNameForElement,
  iconNameForBurst,
  iconNameForClass,
  iconNameForWeapon,
  iconNameForManufacturer,
  decodeToCanvas,
  buildUnitCardData,
  neighbourRowsFor,
  unitCardSize,
  type Canvas,
  type UnitCardData,
  type UnitCardVariant,
  type UnitCardCharacter,
  type DpsArtifactLike,
} from '../../src/infographics/node/render.js';
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
} from '../../src/ranks/types.js';
import type { TsareenaBuildFile } from '../../src/types.js';

// Icon strip pixel size per variant, matched to core/unitCard.ts's ICON_SIZE /
// ICON_SIZE_P and multiplied by the variant's dpr — icons are rasterized at
// their PHYSICAL size so a vector source lands crisp instead of being scaled up
// by the canvas transform.
const ICON_PX: Record<UnitCardVariant, number> = { discord: 44 * 2, twitter: 60 };

const url = (rel: string): URL => new URL(`../../${rel}`, import.meta.url);
const readJson = <T>(rel: string): T | null => {
  const u = url(rel);
  return existsSync(u) ? (JSON.parse(readFileSync(u, 'utf8')) as T) : null;
};

export interface UnitCardSourceSet {
  characters: Record<string, UnitCardCharacter>;
  dpschart: DpsArtifactLike | null;
  burstgen: BurstGenArtifact | null;
  bufferchart: BufferChartArtifact | null;
  sustain: SustainArtifact | null;
  burstcdr: BurstCdrArtifact | null;
  tags: Record<string, string[]>;
  tagLabels: Record<string, { label: string }>;
  olOptimal: Record<string, { type: string; count: number }[]>;
  tsareena: Record<string, TsareenaBuildFile['units'][string]>;
  missing: string[]; // board artifacts that weren't on disk
}

// The five board artifacts are GITIGNORED build outputs (npm run dpschart &&
// ranks:all). A missing one is not fatal — every field is nullable and the card
// draws an absent-state — but it silently thins every card, so the names are
// collected for the caller to report rather than swallowed.
export function loadUnitCardSources(): UnitCardSourceSet {
  const missing: string[] = [];
  const board = <T>(rel: string): T | null => {
    const v = readJson<T>(rel);
    if (!v) {
      missing.push(rel);
    }
    return v;
  };

  const characters =
    readJson<{ characters: Record<string, UnitCardCharacter> }>(
      'data/characters.json'
    )?.characters ?? {};
  const archetype = readJson<{
    tags: Record<string, string[]>;
    vocabulary: Record<string, { label: string }>;
  }>('data/archetype-tags.json');
  const ol = readJson<{
    units: Record<string, { type: string; count: number }[]>;
  }>('data/ol-optimal.json');
  const tsareena = readJson<TsareenaBuildFile>('data/tsareena-build.json');

  return {
    characters,
    dpschart: board<DpsArtifactLike>('web/public/dpschart.json'),
    burstgen: board<BurstGenArtifact>('web/public/burstgen.json'),
    bufferchart: board<BufferChartArtifact>('web/public/bufferchart.json'),
    sustain: board<SustainArtifact>('web/public/sustain.json'),
    burstcdr: board<BurstCdrArtifact>('web/public/burstcdr.json'),
    tags: archetype?.tags ?? {},
    tagLabels: archetype?.vocabulary ?? {},
    olOptimal: ol?.units ?? {},
    tsareena: tsareena?.units ?? {},
    missing,
  };
}

const SITE_ICON = new URL(
  '../../src/infographics/assets/nikkesim-icon.png',
  import.meta.url
);
let siteIcon: Promise<Canvas | null> | null = null;
const loadSiteIcon = (): Promise<Canvas | null> => {
  siteIcon ??= decodeToCanvas(SITE_ICON);
  return siteIcon;
};

// Build the model and attach every image the renderer needs. A null image is
// always fine: the card degrades to a drawn placeholder (portrait) or simply
// omits the mark (icon) without reflowing.
export async function buildUnitCardRender(
  src: UnitCardSourceSet,
  slug: string,
  variant: UnitCardVariant
): Promise<UnitCardData> {
  const character = src.characters[slug];
  if (!character) {
    throw new Error(`unit-card: no character '${slug}' in data/characters.json`);
  }
  const model = buildUnitCardData({
    character,
    dpschart: src.dpschart,
    burstgen: src.burstgen,
    bufferchart: src.bufferchart,
    sustain: src.sustain,
    burstcdr: src.burstcdr,
    tags: src.tags[slug] ?? null,
    tagLabels: src.tagLabels,
    olOptimal: src.olOptimal[slug] ?? null,
    tsareena: src.tsareena[slug] ?? null,
    neighbourRows: neighbourRowsFor(variant),
  });

  const px = ICON_PX[variant];
  const pick = (name: string | null): Promise<Canvas | null> =>
    name ? loadIcon(name, px) : Promise.resolve(null);
  const [portrait, element, burst, cls, weapon, manufacturer, site] =
    await Promise.all([
      loadPortrait(slug),
      pick(iconNameForElement(model.element)),
      pick(iconNameForBurst(model.burst)),
      pick(iconNameForClass(model.class)),
      pick(iconNameForWeapon(model.weapon)),
      pick(model.manufacturer ? iconNameForManufacturer(model.manufacturer) : null),
      loadSiteIcon(),
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
    siteIcon: site ?? undefined,
    footer: 'nikkesim.app',
  };
}

export { unitCardSize };
