// Guards a failure mode that has now bitten this card set TWICE: a character the
// bundled Roboto has no glyph for renders as a TOFU BOX (□) on the Node host,
// while a browser silently falls back to a system face. Two hosts, two pictures
// — the exact thing the isomorphic renderers exist to prevent — and it ships
// inside an immutable, content-hashed image that nothing will re-render.
//
// Both instances were found by LOOKING at a rendered card, not by a test:
// the archetype tag labels' '▲' (U+25B2), and the burst-CDR ramp footnote's
// '→' (U+2192).
//
// "Just use ASCII" is the wrong rule and would make the cards worse: '·', '—',
// '×', '…', '−' and 'Λ' are all present in Roboto and all load-bearing here
// (Λ IS a burst stage). So this pins the actual font capability instead.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createCanvas,
  assertFontsLive,
} from '../../../src/infographics/node/render.js';

// Render one character and fingerprint its ink. A codepoint in the Private Use
// Area is guaranteed absent from any real font, so its ink IS the host's tofu
// glyph — any character matching it exactly is unrenderable.
function inkSignature(ch: string): string {
  const canvas = createCanvas(60, 60);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 60, 60);
  ctx.fillStyle = '#fff';
  ctx.font = '40px Roboto';
  ctx.fillText(ch, 5, 45);
  const d = ctx.getImageData(0, 0, 60, 60).data;
  let sig = '';
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 40) {
      sig += `${i / 4},`;
    }
  }
  return sig;
}

const TOFU = inkSignature(''); // Private Use Area — never in a real font

// Characters the unit card actually draws. Each must render as a real glyph.
const REQUIRED = [
  '·', // separator in 'Attacker · Pilgrim'
  '—', // 'Buffer — team DMG', and the unranked tile's em dash
  '×', // '4× Charge DMG'
  '…', // fitText's ellipsis
  '−', // negative buffer values (U+2212, NOT a hyphen)
  'Λ', // a burst stage in its own right (red-hood)
];

// Characters that LOOK reasonable, are absent from Roboto, and must therefore
// never reach a draw call. canvas2d.ts's drawAdvantageMark exists precisely
// because ▲ is on this list.
const FORBIDDEN = ['→', '▲', '▼', '⚔', '✓'];

// EVERY module that can put a string on a card canvas, whether it draws the
// string or only formats it. A card whose source is missing from this list is
// not guarded at all — the check reports a clean pass over the files it happens
// to know about, which reads as "the card set is safe".
const SOURCES = [
  'src/infographics/core/unitCard.ts',
  'src/infographics/core/unitCardData.ts',
  'src/infographics/core/rankTables.ts',
  'src/infographics/core/dollCard.ts',
  'src/infographics/core/resourcesCard.ts',
  'src/infographics/core/resourcesData.ts',
  'src/infographics/core/pullCard.ts',
  // Not a renderer, but it authors the pool labels the pull card draws.
  'src/infographics/core/pullData.ts',
  'src/infographics/core/tableData.ts',
  // Not a renderer, but it authors every string the doll card draws.
  'src/doll/card.ts',
];

describe('bundled Roboto covers every glyph the unit card draws', () => {
  it('registers fonts at all', () => {
    expect(() => assertFontsLive()).not.toThrow();
  });

  it('has a real glyph for every required character', () => {
    for (const ch of REQUIRED) {
      const sig = inkSignature(ch);
      const cp = `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
      expect(sig, `${ch} (${cp}) rendered NOTHING`).not.toBe('');
      expect(sig, `${ch} (${cp}) rendered as a TOFU BOX`).not.toBe(TOFU);
    }
  });

  it('confirms the forbidden characters really are tofu (the list is not stale)', () => {
    // If Roboto is ever swapped for a face that HAS these, this fails and the
    // restriction can be relaxed deliberately rather than lingering as folklore.
    for (const ch of FORBIDDEN) {
      expect(
        inkSignature(ch),
        `${ch} now renders — the FORBIDDEN list can be revisited`
      ).toBe(TOFU);
    }
  });

  it('no card source emits a forbidden character', () => {
    // COMMENTS ARE EXEMPT — prose about the problem (this very restriction is
    // documented with the characters it names) never reaches a draw call. Only
    // code can put a glyph on a canvas, so comments are stripped first.
    const stripComments = (src: string): string[] =>
      src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''));

    for (const rel of SOURCES) {
      const src = readFileSync(
        new URL(`../../../${rel}`, import.meta.url),
        'utf8'
      );
      const code = stripComments(src);
      for (const ch of FORBIDDEN) {
        // The ▲/▼ in unitCardData.ts's normalizer are the one legitimate use in
        // code: a .replace() that REMOVES them. Anything else is a draw.
        const offending = code.filter(
          (l) => l.includes(ch) && !l.includes('.replace(')
        );
        expect(
          offending,
          `${rel} emits ${ch}: ${offending.join(' | ')}`
        ).toEqual([]);
      }
    }
  });
});
