// Pin the fast-test helper's contract: it always returns a 30 s config and
// forwards non-duration extras like `bossDef` for cache-bundle isolation.
import { describe, expect, it } from 'vitest';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { fastCfg, FAST_FIGHT_SEC } from './fast-cfg.js';

describe('fastCfg helper', () => {
  it('defaults to FAST_FIGHT_SEC', () => {
    const cfg = fastCfg([], null);
    expect(cfg.durationSec).toBe(FAST_FIGHT_SEC);
  });

  it('forwards bossDef while keeping duration authoritative', () => {
    const cfg = fastCfg([], null, { bossDef: 1234 });
    expect(cfg.bossDef).toBe(1234);
    expect(cfg.durationSec).toBe(FAST_FIGHT_SEC);
  });

  it('owns durationSec even if extra tries to set it (pins the spread order)', () => {
    const cfg = fastCfg([], null, { durationSec: 90 } as any);
    expect(cfg.durationSec).toBe(FAST_FIGHT_SEC);
  });

  it('differs from the 180s basis ONLY in durationSec (slugs + bossElement forward)', () => {
    expect(fastCfg(['alice'], 'Fire')).toEqual({
      ...scopeLockCfg(['alice'], 'Fire'),
      durationSec: FAST_FIGHT_SEC,
    });
  });
});
