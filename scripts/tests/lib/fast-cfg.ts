// Shared fast-test configuration for generator integration tests.
//
// The generator integration tests exercise `makeCalc().bestTeam()` / `topTeams()`,
// which run many full-fight sims. These tests assert legality, locks, counts,
// constraints, cache semantics, or path-vs-path parity — none of which depend on
// the canonical 180s fight length — so they can use a shorter duration to stay
// fast without weakening their assertions. Files that deliberately keep the
// canonical 180s basis say so in a comment at their `scopeLockCfg` call site.
import { scopeLockCfg } from '../../lib/scope-lock.js';
import type { Element, SimConfig } from '../../../src/types.js';

/** Fast-test fight duration in seconds. */
export const FAST_FIGHT_SEC = 30;

/** `scopeLockCfg` extras that may be forwarded, except `durationSec` (owned by this helper). */
type FastCfgExtra = Omit<
  NonNullable<Parameters<typeof scopeLockCfg>[2]>,
  'durationSec'
>;

/**
 * Build a scope-lock config for fast generator tests. `slugs` and `bossElement`
 * are the same as `scopeLockCfg`; `extra` is forwarded so tests can still set
 * fields like `bossDef` for shared-cache bundle isolation. `durationSec` cannot
 * be passed and is always `FAST_FIGHT_SEC`.
 */
export function fastCfg(
  slugs: string[],
  bossElement: Element | null,
  extra: FastCfgExtra = {}
): SimConfig {
  return scopeLockCfg(slugs, bossElement, {
    ...extra,
    durationSec: FAST_FIGHT_SEC,
  });
}
