// "Include Healer" must field a healer that can actually HEAL in the team the
// generator builds — not merely a healer-TAGGED unit.
//
// Root cause (user report, 2026-08-25): the healer tag is prose-derived and
// condition-blind. anis-star is tagged 'healer' but her heal is formation-gated
// on a SECOND Burst I ally (`formation: hasB1`), and the search never fields
// double Burst I (the shape is excluded from enumeration) — so she satisfied
// the requiredAny constraint while her heal stayed dormant in every team the
// generator can produce. delta-ninja-thief's heal likewise needs a Defender
// ally. Both are excluded in web/src/healerSlugs.ts.
//
// The list under test is the REAL one (imported, not reconstructed); the calc
// is built via makeCalc with the same `requiredAny: [{ label: 'healer', anyOf:
// HEALER_SLUGS }]` shape buildGenCalc passes (buildGenCalc itself is vite-only
// — import.meta.glob — so it can't be imported under the root tsconfig; its
// one-line healerNeeded wiring is covered by review, not this test).
import { describe, expect, it } from 'vitest';
import { makeCalc } from '../../../src/teamcalc.js';
import {
  CONDITIONAL_HEALERS,
  HEALER_SLUGS,
} from '../../../web/src/healerSlugs.js';
import { fastCfg } from '../lib/fast-cfg.js';
import { archetypeTags, deps, generatorPool, mult } from '../lib/harness.js';

const { chars, overrides } = generatorPool();

// The reporting account's 27-unit generator pool (openid …96007, synced
// 2026-08-25). Its only healer-tagged Burst I is anis-star, which is what made
// the dormant-heal satisfaction visible: with her allowed, a team "had a
// healer" that could not heal.
const POOL = new Set(
  (
    'anis-star little-mermaid moran crown nayuta mast-romantic-maid ' +
    'anchor-innocent-maid mint trina red-hood cinderella-crystal-wave scarlet ' +
    'rapi-red-hood helm ada cinderella snow-white-heavy-arms ' +
    'anis-sparkling-summer liberalio scarlet-black-shadow diesel-winter-sweets ' +
    'maiden-ice-rose mihara-bonding-chain neon-vision-eye ' +
    'marciana-marine-study privaty laplace'
  ).split(' ')
);

describe('HEALER_SLUGS excludes condition-dormant healers', () => {
  it('drops anis-star and delta-ninja-thief, keeps unconditional healers', () => {
    expect(HEALER_SLUGS).not.toContain('anis-star');
    expect(HEALER_SLUGS).not.toContain('delta-ninja-thief');
    for (const s of ['helm', 'anchor-innocent-maid', 'mint', 'trina', 'ada']) {
      expect(HEALER_SLUGS).toContain(s);
    }
    // the filter only ever narrows: every entry is still healer-tagged, and
    // every tagged healer is either in the list or a named exclusion
    for (const s of HEALER_SLUGS) {
      expect(archetypeTags[s]).toContain('healer');
    }
    const tagged = Object.entries(archetypeTags)
      .filter(([, t]) => t.includes('healer'))
      .map(([s]) => s);
    for (const s of tagged) {
      expect(HEALER_SLUGS.includes(s) || CONDITIONAL_HEALERS.has(s)).toBe(true);
    }
  });
});

describe('Include Healer on the reporting pool', () => {
  it('every generated team fields a healer that can heal', async () => {
    const calc = makeCalc({
      chars: chars as any,
      mult,
      deps: { overrides, ...deps },
      cfg: fastCfg([], 'Fire') as any,
      loadout: {},
      blocked: Object.keys(chars).filter((s) => !POOL.has(s)),
      requireElement: 'Fire',
      constraints: {
        requiredAny: [{ label: 'healer', anyOf: HEALER_SLUGS }],
      },
    });
    const teams = await calc.topTeams(5);
    expect(teams.length).toBeGreaterThan(0);
    for (const t of teams) {
      const healers = t.slugs.filter((s) => HEALER_SLUGS.includes(s));
      expect(
        healers.length,
        `team [${t.slugs.join(', ')}] has no usable healer`
      ).toBeGreaterThan(0);
    }
  }, 180000);
});
