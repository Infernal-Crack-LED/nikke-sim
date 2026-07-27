// Unit tests for the RenderCache eviction policy: LRU by last READ (not
// FIFO-by-write — a hot card must never evict ahead of a cold one) and
// orphaned .tmp reaping.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { utimes } from 'node:fs/promises';
import { RenderCache } from '../../../src/server/render-cache.js';

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'render-cache-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const body = (n: number) => Buffer.alloc(n, 7);

describe('RenderCache', () => {
  it('evicts the least-recently-READ file, not the oldest-written', async () => {
    // three 100 B files, cap 250 B — one must go on the next put
    const cache = new RenderCache(dir, 250);
    await cache.put('team.aaaaaaaaaaaaaaaa.png', body(100));
    await cache.put('team.bbbbbbbbbbbbbbbb.png', body(100));
    // age the second file so mtime order is deterministic, then READ the
    // first — the read must make it the survivor
    const old = new Date(Date.now() - 60_000);
    await utimes(join(dir, 'team.bbbbbbbbbbbbbbbb.png'), old, old);
    expect(await cache.has('team.aaaaaaaaaaaaaaaa.png')).toBe(true);

    await cache.put('team.cccccccccccccccc.png', body(100));

    expect(existsSync(join(dir, 'team.aaaaaaaaaaaaaaaa.png'))).toBe(true); // hot
    expect(existsSync(join(dir, 'team.bbbbbbbbbbbbbbbb.png'))).toBe(false); // cold
    expect(existsSync(join(dir, 'team.cccccccccccccccc.png'))).toBe(true);
  });

  it('reaps orphaned .tmp files but leaves fresh ones alone', async () => {
    const cache = new RenderCache(dir, 1 << 20);
    const stale = join(dir, '.team.x.1.1.tmp');
    const fresh = join(dir, '.team.y.1.2.tmp');
    writeFileSync(stale, body(10));
    writeFileSync(fresh, body(10));
    const old = new Date(Date.now() - 60 * 60 * 1000);
    await utimes(stale, old, old);

    await cache.sweep();

    expect(existsSync(stale)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
    rmSync(fresh, { force: true });
  });
});
