// ENGINE PRIMITIVE SPEC — how long an unfinished burst chain survives (owner ruling 2026-08-13).
//
// CHAIN_TIMEOUT_FRAMES (600f/10s) is how long a chain that has opened but cannot finish lives before
// it collapses and the gauge must refill from zero. The gauge stays LOCKED (`stage !== 0`) for that
// whole time, so this constant governs what a failed chain costs the team in generation.
//
// It used to be `STAGE_WINDOW_FRAMES` = 120f — a value calibrated for a DIFFERENT question (how long
// the auto waits for a not-yet-ready filler, DECISIONS 2026-07-21) that expiry silently inherited, so
// a stalled chain died 8s early. Splitting the two is what revealed that the filler-wait horizon is
// itself unreachable once a ready unit may always fill a live chain: a not-ready unit can never cast,
// so admitting or refusing it as a candidate changes nothing. That horizon was therefore DELETED, not
// re-tuned — see the note at `windowFits` in sim.ts. There is consequently only ONE clock left to pin,
// and this file pins it.
//
// Fixture: liter (B1) / maxwell-ordinary-mechanic (B2) / ada (B3). ada's 40s cooldown means most
// chains reach stage 3 with no Burst III available and never get one inside the 10s window — the
// stall this spec exists to pin. Deterministic (no seed).
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

  // ⚠ WHAT THIS FILE DOES NOT COVER: nothing pins the DELETED filler-wait horizon, because there is
  // nothing left to pin — it has no observable effect (proven by deleting the clause and finding
  // every graded FB count, every damage total and four probe comps' rotations byte-identical at
  // horizons of 1f, 120f and 600f, on both the default first-ready path and the legacy B3_LEFTMOST
  // one). The measured truth it was calibrated against — two alternating 40s B3s allocating 5/5
  // rather than 6/4 (DECISIONS 2026-07-21) — is now protected by the first-ready selection rule
  // instead, and is NOT reproduced by any committed comp. That gap is real and is NOT filed
  // anywhere: if a future change makes a waiting horizon observable again, this suite will not
  // notice.
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
