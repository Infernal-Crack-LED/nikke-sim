// ENGINE PRIMITIVE SPEC — the burst chain's TWO independent clocks (owner ruling 2026-08-13).
//
// A chain that opens but cannot finish has two deadlines that a single constant used to conflate:
//
//   RESERVE  (STAGE_RESERVE_FRAMES, 120f/2s) — how long the auto WAITS at stage 2/3 for a filler to
//            come off cooldown before it stops considering them. The auto's inter-activation grace,
//            calibrated across the graded FB comps (DECISIONS 2026-07-21: 600f here over-allocated
//            the leftmost of two alternating B3s, sakura-bloom-in-summer 6/4 vs the footage's 5/5).
//   TIMEOUT  (CHAIN_TIMEOUT_FRAMES, 600f/10s) — how long the CHAIN ITSELF survives unfinished before
//            it collapses and the gauge must refill from zero. A property of the game, not of the
//            auto's patience (owner ruling 2026-08-13).
//
// Before the split, expiry inherited the reserve's 2s, so a stalled chain died 8s early and the bar
// began refilling 8s early. THIS FILE PINS THE TIMEOUT ONLY — see the note above the third test for
// why the reserve's own value is not covered here (and is currently not covered anywhere).
//
// Fixture: liter (B1) / maxwell-ordinary-mechanic (B2) / ada (B3). ada's 40s cooldown means the
// SECOND chain reaches stage 3 with no Burst III available — the stall this spec exists to pin.
// Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import { runComp } from '../lib/harness.js';

const FIXTURE = {
  slugs: ['liter', 'maxwell-ordinary-mechanic', 'ada'],
  bossElement: 'Iron' as const,
  focusSlug: 'maxwell-ordinary-mechanic',
};

/** `<seconds>s  CHAIN EXPIRED at stage N` → the seconds, in order. */
const expirySecs = (log: string[]) =>
  log
    .filter((l) => l.includes('CHAIN EXPIRED'))
    .map((l) => Number(l.trim().split('s')[0]));

/** `<seconds>s  BII <name>` → the seconds of every stage-2 cast, in order. */
const stage2Secs = (log: string[]) =>
  log.filter((l) => / BII /.test(l)).map((l) => Number(l.trim().split('s')[0]));

const res = runComp(FIXTURE);
const log = res.rotationLog;

describe('burst chain — reserve horizon and collapse timeout are INDEPENDENT clocks', () => {
  it('a chain that reaches a stage with no filler available survives the full 10s TIMEOUT', () => {
    const expiries = expirySecs(log);
    const casts = stage2Secs(log);
    expect(
      expiries.length,
      'fixture never stalls — spec is vacuous'
    ).toBeGreaterThan(0);
    // every expiry is 10s after the stage-2 cast that advanced the chain into the stalled stage
    for (const e of expiries) {
      const opener = [...casts].reverse().find((c) => c < e);
      expect(
        opener,
        `no stage-2 cast precedes the expiry at ${e}s`
      ).toBeDefined();
      expect(
        +(e - opener!).toFixed(2),
        `chain at ${e}s collapsed ${(e - opener!).toFixed(1)}s after its stage-2 cast, not 10s`
      ).toBe(10);
    }
  });

  it('DISCRIMINATING: the collapse is NOT the 2s reserve horizon (the pre-split behaviour)', () => {
    for (const e of expirySecs(log)) {
      const opener = [...stage2Secs(log)].reverse().find((c) => c < e)!;
      expect(e - opener).toBeGreaterThan(2);
    }
  });

  // ⚠ NOT PINNED HERE — the RESERVE horizon's own value. Widening it to 10s (STAGE_WINDOW=600,
  // the pre-2026-07-21 mistake) leaves every assertion in this file AND every graded FB count
  // green: ada is ~22s out, so she is refused under either horizon. The calibration case that
  // actually discriminates it — two alternating 40s B3s where a 10s horizon double-casts the
  // leftmost (DECISIONS 2026-07-21, sakura-bloom-in-summer 6/4 vs the footage's 5/5) — is not in
  // any committed comp, so that measured truth currently has NO automated pin. Filed in QUEUE.md;
  // do not read this file's green as covering it.
  it('the timeout does not manufacture Full Bursts: the count is unchanged, the stall just lasts longer', () => {
    // ada's 40s cooldown is the binding constraint here, not the chain clock — so a longer-lived
    // chain must NOT turn into an extra Full Burst. This is the arm that would catch a timeout so
    // long that stalled chains start absorbing casts they should not.
    const fbs = log.filter((l) => l.includes('FULL BURST')).length;
    expect(fbs).toBe(5);
  });

  // GUARD (structural, not discriminating): holds under either timeout value. Kept because it is
  // the invariant the timeout GOVERNS — a longer-lived chain must keep the bar locked, not let a
  // second chain open behind it.
  it('PIN: the gauge stays LOCKED for the whole stalled window (no chain opens while one hangs)', () => {
    // The timeout governs how much generation a failed chain costs the team: while a chain hangs,
    // addGauge's `stage !== 0` guard blocks every contribution. Pinned via the observable proxy —
    // no new chain may open before the previous one has collapsed.
    const expiries = expirySecs(log);
    const b1s = log
      .filter((l) => / BI /.test(l))
      .map((l) => Number(l.trim().split('s')[0]));
    for (const e of expiries) {
      const opener = [...stage2Secs(log)].reverse().find((c) => c < e)!;
      expect(
        b1s.filter((b) => b > opener && b < e),
        `a chain opened at ${opener}s-${e}s while the previous one was still hanging`
      ).toEqual([]);
    }
  });
});
