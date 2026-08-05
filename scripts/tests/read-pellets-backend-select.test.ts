/**
 * Unit tests for the backend-selector passenger-channel fix
 * (docs/handoffs/2026-08-04-backend-selector-LANDING-PLAN.md §3, criterion 6).
 *
 * `read-pellets.ts` is a CLI entry point (parses argv and exits if no video is given — see
 * read-pellets-ammo-offset.test.ts), so it cannot be imported directly. The channel-selection
 * logic it now delegates to lives in the small pure module `pellet-backend-select.ts`
 * (no side effects, safe to import), following the same extraction pattern as `hit-bands.ts`
 * (imported by `read-popups-vlm.ts` / `hit-values.ts`).
 */
import { describe, expect, it } from 'vitest';
import { selectPassengerChannel } from '../probe/pellet-backend-select.js';

describe('selectPassengerChannel', () => {
  it('emits opencv values when white+red==0 on every backend but opencv has marker/band > 0', () => {
    // The exact defect frame: `best` (chosen upstream on white+red, all zero, ties resolve to
    // array order) lands on numpy, whose marker/band are zero-filled. opencv actually observed a
    // marker and a band value.
    const numpy = { white: 0, red: 0, marker: 0, band: 0 };
    const pil = { white: 0, red: 0, marker: 0, band: 0 };
    const opencv = { white: 0, red: 0, marker: 2, band: 4 };
    const backendEntries = [numpy, pil, opencv];
    const best = numpy; // what the existing white/red/total selection would land on

    expect(selectPassengerChannel(backendEntries, best, 'marker')).toBe(2);
    expect(selectPassengerChannel(backendEntries, best, 'band')).toBe(4);
  });

  it('emits opencv marker only, band still falls through to best (0), when only marker is set', () => {
    const numpy = { white: 0, red: 0, marker: 0, band: 0 };
    const pil = { white: 0, red: 0, marker: 0, band: 0 };
    const opencv = { white: 0, red: 0, marker: 3, band: 0 };
    const backendEntries = [numpy, pil, opencv];
    const best = numpy;

    expect(selectPassengerChannel(backendEntries, best, 'marker')).toBe(3);
    expect(selectPassengerChannel(backendEntries, best, 'band')).toBe(0);
  });

  it('single-backend identity: every emitted channel equals the sole active backend, over many synthetic frames', () => {
    // Mirrors production: one backend runs for real, the other two are zero-filled by
    // count-pellets.py. Sweep a range of marker/band values (including 0) on the active backend
    // and assert the emitted channel always equals that backend's own value, regardless of which
    // slot (numpy/pil/opencv) is "active" or which one `best` happens to be.
    const zero = { white: 0, red: 0, marker: 0, band: 0 };
    const activeSlots: Array<'numpy' | 'pil' | 'opencv'> = [
      'numpy',
      'pil',
      'opencv',
    ];

    for (const slot of activeSlots) {
      for (let marker = 0; marker <= 5; marker++) {
        for (let band = 0; band <= 5; band++) {
          const active = { white: 7, red: 1, marker, band };
          const numpy = slot === 'numpy' ? active : zero;
          const pil = slot === 'pil' ? active : zero;
          const opencv = slot === 'opencv' ? active : zero;
          const backendEntries = [numpy, pil, opencv];
          // `best` in production is whichever backend the white+red comparison lands on; in
          // single-backend mode that is always the active one (the zero-filled backends never
          // beat it), so use `active` here — matching read-pellets.ts's real `best` selection.
          const best = active;

          expect(selectPassengerChannel(backendEntries, best, 'marker')).toBe(
            marker
          );
          expect(selectPassengerChannel(backendEntries, best, 'band')).toBe(
            band
          );
        }
      }
    }
  });
});
