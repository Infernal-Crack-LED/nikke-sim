// The team/roster cache key hashes a render-relevant PROJECTION of the build,
// not the raw code (spec.ts renderRelevantBuild). This test pins the
// projection against the RENDERERS themselves, in both directions, because
// both directions are load-bearing:
//
//   dropped field  → the PNG must be byte-identical (else we would be
//                    fragmenting the cache on something invisible — the bug
//                    the bakery-bot integration reported: two `blocked` values,
//                    two content addresses, one picture)
//   kept field     → the PNG must CHANGE (else the projection is too coarse
//                    and two different cards would collide on one address and
//                    serve the wrong picture — the dangerous direction)
//
// The renders are real @napi-rs/canvas renders through the same functions the
// API calls, so the test can't drift from the renderers by construction.
import { describe, expect, it } from 'vitest';
import { specCacheKey } from '../../../src/infographics/spec.js';
import { encodeBuild, type Build } from '../../../src/share/build-code.js';
import {
  renderTeamCardPng,
  renderRosterCardPng,
  type CardCharacter,
} from '../../../src/server/card-from-build.js';

const CHARS: Record<string, CardCharacter> = Object.fromEntries(
  ['liter', 'crown', 'naga', 'modernia', 'alice'].map((slug) => [
    slug,
    {
      slug,
      name: slug[0].toUpperCase() + slug.slice(1),
      element: 'Iron' as const,
      weapon: 'SMG',
      burst: 'I',
    },
  ])
);

const BASE: Build = {
  v: 1,
  g: {
    weakness: 'Iron',
    bossDef: '0',
    core: 1,
    coreCustom: false,
    coreCustomVal: '10',
    level: '400',
  },
  s: ['liter', 'crown', 'naga', 'modernia', 'alice'].map((slug) => ({
    slug,
    cubeId: 'resilience',
    cubeLevel: 7,
    ol: 5 as const,
    doll: true,
    stars: 3,
    core: 0,
    skill1: 10,
    skill2: 10,
    burst: 10,
  })),
  roster: [
    ['liter', 'crown', 'naga', 'modernia', 'alice'],
    ['crown', 'naga', 'modernia', 'alice', 'liter'],
  ],
};

const key = (b: Build, kind: 'team' | 'roster') =>
  specCacheKey({ kind, build: encodeBuild(b) });
const png = (b: Build, kind: 'team' | 'roster') =>
  kind === 'team'
    ? renderTeamCardPng(b, CHARS, null)
    : renderRosterCardPng(b, CHARS, null);

// Apply a mutation to a deep copy, so the cases can't leak into each other.
const withChange = (mutate: (b: Build) => void): Build => {
  const copy = JSON.parse(JSON.stringify(BASE)) as Build;
  mutate(copy);
  return copy;
};

// Fields the renderers demonstrably ignore, per kind.
const IGNORED: {
  what: string;
  kinds: ('team' | 'roster')[];
  mutate: (b: Build) => void;
}[] = [
  {
    what: 'blocked (the don’t-own list)',
    kinds: ['team', 'roster'],
    mutate: (b) => {
      b.blocked = ['modernia', 'alice'];
    },
  },
  {
    what: 'g.bossDef',
    kinds: ['team', 'roster'],
    mutate: (b) => {
      b.g.bossDef = '140';
    },
  },
  {
    what: 'g.bossRange',
    kinds: ['team', 'roster'],
    mutate: (b) => {
      b.g.bossRange = 'far';
    },
  },
  {
    what: 'per-slot loadout (cube / OL / doll / stars / skills)',
    kinds: ['team', 'roster'],
    mutate: (b) => {
      b.s = b.s.map((s) => ({
        ...s,
        cubeId: 'bastion',
        cubeLevel: 1,
        ol: 0,
        doll: false,
        stars: 0,
        skill1: 1,
        skill2: 1,
        burst: 1,
      }));
    },
  },
  {
    // the roster card draws `roster`, never the shared loadout slots
    what: 'the whole `s` slot list (roster card only)',
    kinds: ['roster'],
    mutate: (b) => {
      b.s = b.s.map((s) => ({ ...s, slug: null }));
    },
  },
  {
    // …and the team card draws `s`, never the roster grid
    what: 'the whole `roster` grid (team card only)',
    kinds: ['team'],
    mutate: (b) => {
      b.roster = [['alice', 'alice', 'alice', 'alice', 'alice']];
    },
  },
];

// Fields the renderers DO draw.
const DRAWN: {
  what: string;
  kinds: ('team' | 'roster')[];
  mutate: (b: Build) => void;
}[] = [
  {
    what: 'a slot slug',
    kinds: ['team'],
    mutate: (b) => {
      b.s[0].slug = 'modernia';
    },
  },
  {
    what: 'a roster team slug',
    kinds: ['roster'],
    mutate: (b) => {
      b.roster![0][0] = 'modernia';
    },
  },
  {
    what: 'g.weakness (the element marker + meta line)',
    kinds: ['team', 'roster'],
    mutate: (b) => {
      b.g.weakness = 'Water';
    },
  },
  {
    what: 'g.level',
    kinds: ['team', 'roster'],
    mutate: (b) => {
      b.g.level = '801';
    },
  },
  {
    what: 'the coreLabel inputs',
    kinds: ['team', 'roster'],
    mutate: (b) => {
      b.g.coreCustom = true;
      b.g.coreCustomVal = '42';
    },
  },
  {
    what: 'rosterMode union (title + per-team boss labels)',
    kinds: ['roster'],
    mutate: (b) => {
      b.rosterMode = 'union';
      b.unionBoss = [
        {
          weakness: 'Fire',
          bossDef: '140',
          core: 1,
          coreCustom: false,
          coreCustomVal: '10',
        },
        {
          weakness: 'Water',
          bossDef: '0',
          core: 0.5,
          coreCustom: false,
          coreCustomVal: '10',
        },
      ];
    },
  },
];

describe('team/roster cache key ↔ what the renderers actually draw', () => {
  for (const kind of ['team', 'roster'] as const) {
    for (const c of IGNORED.filter((c) => c.kinds.includes(kind))) {
      it(`${kind}: ${c.what} changes neither the pixels nor the key`, async () => {
        const changed = withChange(c.mutate);
        // the premise: this field really is invisible to the renderer
        expect((await png(changed, kind)).equals(await png(BASE, kind))).toBe(
          true
        );
        // …so it must not fork the content address
        expect(key(changed, kind)).toBe(key(BASE, kind));
      });
    }
    for (const c of DRAWN.filter((c) => c.kinds.includes(kind))) {
      it(`${kind}: ${c.what} changes the pixels AND the key`, async () => {
        const changed = withChange(c.mutate);
        expect((await png(changed, kind)).equals(await png(BASE, kind))).toBe(
          false
        );
        expect(key(changed, kind)).not.toBe(key(BASE, kind));
      });
    }
  }

  it('re-encoding the same build is one address (no raw-string sensitivity)', () => {
    // Same build, re-encoded from a structurally identical object: hashing the
    // raw code made this an accident of key order; the projection makes it one
    // content address by construction.
    const clone = JSON.parse(JSON.stringify(BASE)) as Build;
    expect(key(clone, 'team')).toBe(key(BASE, 'team'));
    expect(key(clone, 'roster')).toBe(key(BASE, 'roster'));
  });

  it('an undecodable code falls back to the raw string, never throws', () => {
    expect(specCacheKey({ kind: 'team', build: 'not-a-build' })).toBe(
      'v2|team|not-a-build'
    );
  });
});
