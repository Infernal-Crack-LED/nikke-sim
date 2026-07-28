// Content-addressed on-disk cache for dynamically rendered infographics
// (team/roster cards). Filenames carry a hash of the render inputs
// (`team.<hash16>.png`), so a cached file is valid FOREVER and is served
// immutable; the cache is bounded by bytes with LRU eviction by mtime.
// LRU recency is maintained by READS (has() touches mtime), so a hot card
// never evicts ahead of a cold one — eviction is by last-READ, not last-write.
import {
  mkdir,
  readdir,
  rename,
  stat,
  unlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

// Orphaned `.tmp` files (a crash between writeFile and rename) are reaped once
// they are clearly not an in-flight write.
const TMP_MAX_AGE_MS = 10 * 60 * 1000;

export class RenderCache {
  constructor(
    readonly dir: string,
    readonly maxBytes: number
  ) {}

  pathFor(name: string): string {
    return join(this.dir, name);
  }

  async has(name: string): Promise<boolean> {
    try {
      const p = this.pathFor(name);
      if (!(await stat(p)).isFile()) {
        return false;
      }
      // LRU recency: a read refreshes mtime, which is sweep()'s eviction key.
      // Best-effort — a failed touch must not 404 a cached card.
      const now = new Date();
      await utimes(p, now, now).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  // Atomic write (tmp + rename — a concurrent reader never sees a partial PNG),
  // then an LRU sweep so the cache stays under its byte cap.
  async put(name: string, body: Buffer): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const tmp = join(this.dir, `.${name}.${process.pid}.${Date.now()}.tmp`);
    await writeFile(tmp, body);
    await rename(tmp, this.pathFor(name));
    await this.sweep();
  }

  // Evict least-recently-READ files until the cache fits, and reap orphaned
  // .tmp files. Runs on boot and after every write — cheap at this scale (a
  // 200 MB cap ≈ a few thousand PNGs).
  async sweep(): Promise<void> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return; // cache dir doesn't exist yet — nothing to sweep
    }
    // Per-entry stat is FALLIBLE: a concurrent put() can rename its .tmp away
    // (or an eviction unlink a .png) between our readdir and stat. One stale
    // entry must not abort the whole sweep — under load that correlates with
    // .tmp churn, skipping eviction exactly when the byte cap matters.
    const entries = (
      await Promise.all(
        names.map(async (name) => {
          const s = await stat(this.pathFor(name)).catch(() => null);
          return s?.isFile()
            ? { name, size: s.size, mtimeMs: s.mtimeMs }
            : null;
        })
      )
    ).filter((e): e is NonNullable<typeof e> => e !== null);
    const now = Date.now();
    const pngs: typeof entries = [];
    for (const e of entries) {
      if (e.name.endsWith('.png')) {
        pngs.push(e);
      } else if (e.name.endsWith('.tmp') && now - e.mtimeMs > TMP_MAX_AGE_MS) {
        await unlink(this.pathFor(e.name)).catch(() => {}); // orphaned write
      }
    }
    let total = pngs.reduce((sum, e) => sum + e.size, 0);
    pngs.sort((a, b) => a.mtimeMs - b.mtimeMs); // least-recently-read first
    for (const e of pngs) {
      if (total <= this.maxBytes) {
        break;
      }
      await unlink(this.pathFor(e.name)).catch(() => {});
      total -= e.size;
    }
  }
}
