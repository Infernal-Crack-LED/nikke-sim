// Unit tests for web/src/builderSpec.ts — the /builder page's state → hosting
// mapping. The manifest keys it emits mirror scripts/build-infographics.ts's
// job keys (the pre-rendered head set), and the RenderSpecs it emits are the
// exact bodies POST /api/v1/img/render accepts (scripts/tests/share/
// render-spec.test.ts pins their parse) — this test pins the MAPPING so the
// page can never offer a manifest URL for a card the manifest doesn't hold,
// or a spec for a card the manifest already covers.
import { describe, expect, it } from 'vitest';
import {
  HEADLINE_CELL_IDS,
  manifestKeyFor,
  renderSpecFor,
  OL_DEFAULT_LINES,
  OL_DEFAULT_TIER,
  type BuilderState,
} from '../../../web/src/builderSpec.js';

const BASE: BuilderState = {
  card: 'dps',
  cell: 'solo.eleweak.c100.8of12',
  element: null,
  dpsMode: 'top',
  unit: '',
  units: [],
  board: 'burstgen',
  bufferBoard: 'generic',
  burstGenBoard: 'unfocused',
  olLines: OL_DEFAULT_LINES,
  olTier: OL_DEFAULT_TIER,
  unitVariant: 'discord',
};

describe('manifestKeyFor — pre-rendered head set only', () => {
  it('maps a headline-cell top-10 dps chart, per element filter', () => {
    expect(manifestKeyFor(BASE)).toBe('dps/solo.eleweak.c100.8of12.all');
    expect(manifestKeyFor({ ...BASE, element: 'fire' })).toBe(
      'dps/solo.eleweak.c100.8of12.fire'
    );
    expect(manifestKeyFor({ ...BASE, cell: 'solo.neutral.c100.8of12' })).toBe(
      'dps/solo.neutral.c100.8of12.all'
    );
  });

  it('never maps a windowed / comparison / non-headline dps chart', () => {
    expect(
      manifestKeyFor({ ...BASE, dpsMode: 'window', unit: 'alice' })
    ).toBeNull();
    expect(
      manifestKeyFor({ ...BASE, dpsMode: 'compare', units: ['alice'] })
    ).toBeNull();
    expect(
      manifestKeyFor({ ...BASE, cell: 'solo.neutral.c0.8of12' })
    ).toBeNull();
  });

  it("never maps a rank board — the Builder card (portrait bar chart, with a sub-mode) is a different image than the manifest's plain-text/unfocused/generic one", () => {
    for (const board of [
      'burstgen',
      'burstcdr',
      'sustain',
      'buffer',
    ] as const) {
      expect(manifestKeyFor({ ...BASE, card: 'rank', board })).toBeNull();
    }
  });

  it('maps unit cards and the static tables', () => {
    // Unit-card keys carry the VARIANT: the landscape and portrait cards are
    // different images of the same unit, and a shared key would serve one to a
    // request for the other out of an immutable cache.
    expect(manifestKeyFor({ ...BASE, card: 'unit', unit: 'liter' })).toBe(
      'unit/liter.discord'
    );
    expect(
      manifestKeyFor({
        ...BASE,
        card: 'unit',
        unit: 'liter',
        unitVariant: 'twitter',
      })
    ).toBe('unit/liter.twitter');
    expect(manifestKeyFor({ ...BASE, card: 'charge' })).toBe(
      'table/charge-speed'
    );
  });

  it('maps ol ONLY at the exact default combo the manifest was built at', () => {
    expect(manifestKeyFor({ ...BASE, card: 'ol' })).toBe('table/ol');
    expect(
      manifestKeyFor({ ...BASE, card: 'ol', olLines: '4of12' })
    ).toBeNull();
    expect(manifestKeyFor({ ...BASE, card: 'ol', olTier: 10 })).toBeNull();
  });

  it('never maps per-unit or unchosen cards', () => {
    expect(
      manifestKeyFor({ ...BASE, card: 'charge', unit: 'alice' })
    ).toBeNull();
    expect(manifestKeyFor({ ...BASE, card: 'ammo', unit: 'alice' })).toBeNull();
    expect(manifestKeyFor({ ...BASE, card: 'unit', unit: '' })).toBeNull();
  });
});

describe('renderSpecFor — the on-demand tail', () => {
  it('returns null for every manifest-covered state (no POST needed)', () => {
    expect(renderSpecFor(BASE)).toBeNull();
    expect(renderSpecFor({ ...BASE, card: 'rank' })).toBeNull();
    expect(renderSpecFor({ ...BASE, card: 'unit', unit: 'liter' })).toBeNull();
    expect(renderSpecFor({ ...BASE, card: 'ol' })).toBeNull();
    expect(renderSpecFor({ ...BASE, card: 'charge' })).toBeNull();
  });

  it('builds dps specs per mode (window / compare / non-headline top)', () => {
    expect(
      renderSpecFor({ ...BASE, dpsMode: 'window', unit: 'alice' })
    ).toEqual({ kind: 'dps', cell: BASE.cell, unit: 'alice' });
    expect(
      renderSpecFor({
        ...BASE,
        element: 'fire',
        dpsMode: 'compare',
        units: ['alice', 'modernia'],
      })
    ).toEqual({
      kind: 'dps',
      cell: BASE.cell,
      element: 'fire',
      units: ['alice', 'modernia'],
    });
    expect(renderSpecFor({ ...BASE, cell: 'solo.neutral.c0.8of12' })).toEqual({
      kind: 'dps',
      cell: 'solo.neutral.c0.8of12',
    });
    // a window mode with no unit picked falls back to the plain top-10 spec
    expect(renderSpecFor({ ...BASE, dpsMode: 'window', unit: '' })).toEqual({
      kind: 'dps',
      cell: BASE.cell,
    });
    // …but a compare mode with no picks has no renderable request
    expect(
      renderSpecFor({ ...BASE, dpsMode: 'compare', units: [] })
    ).toBeNull();
  });

  it('builds the per-unit table specs', () => {
    expect(renderSpecFor({ ...BASE, card: 'charge', unit: 'alice' })).toEqual({
      kind: 'table',
      table: 'charge-speed',
      unit: 'alice',
    });
    expect(renderSpecFor({ ...BASE, card: 'ammo', unit: 'alice' })).toEqual({
      kind: 'table',
      table: 'max-ammo',
      unit: 'alice',
    });
    expect(renderSpecFor({ ...BASE, card: 'ammo', unit: '' })).toBeNull();
  });

  it('the two mappings never both fire for the same state', () => {
    const states: BuilderState[] = [
      BASE,
      { ...BASE, element: 'iron' },
      { ...BASE, dpsMode: 'window', unit: 'alice' },
      { ...BASE, dpsMode: 'compare', units: ['alice'] },
      { ...BASE, cell: 'solo.neutral.c0.8of12' },
      { ...BASE, card: 'rank', board: 'buffer' },
      { ...BASE, card: 'unit', unit: 'liter' },
      { ...BASE, card: 'ol' },
      { ...BASE, card: 'ol', olLines: '4of12' },
      { ...BASE, card: 'charge' },
      { ...BASE, card: 'charge', unit: 'alice' },
      { ...BASE, card: 'ammo', unit: 'alice' },
    ];
    for (const s of states) {
      expect(
        manifestKeyFor(s) !== null && renderSpecFor(s) !== null,
        JSON.stringify(s)
      ).toBe(false);
    }
  });

  // 'rank' and a non-default 'ol' combo are the two "neither" states — no
  // pre-rendered manifest image, and no server RenderSpec support to render
  // one on demand. onGetUrl falls through to its "use Copy image instead"
  // message for these (see BuilderPage.tsx); Copy image still works for
  // both, since it draws through the live client-side canvas, not this path.
  it('leaves rank and a non-default ol combo hosted nowhere yet', () => {
    for (const s of [
      { ...BASE, card: 'rank' as const, board: 'buffer' as const },
      { ...BASE, card: 'ol' as const, olLines: '4of12' as const },
    ]) {
      expect(manifestKeyFor(s)).toBeNull();
      expect(renderSpecFor(s)).toBeNull();
    }
  });

  it('HEADLINE_CELL_IDS pins the same two cells build-infographics pre-renders', () => {
    expect([...HEADLINE_CELL_IDS].sort()).toEqual([
      'solo.eleweak.c100.8of12',
      'solo.neutral.c100.8of12',
    ]);
  });
});
