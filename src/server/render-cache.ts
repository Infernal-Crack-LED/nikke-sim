// Content-addressed on-disk cache for dynamically rendered infographics
// (team/roster cards). Filenames carry a hash of the render inputs
// (`team.<hash16>.png`), so a cached file is valid FOREVER and is served
// immutable; the cache is bounded by bytes with LRU eviction by mtime.
// LRU recency is maintained by READS (has() touches mtime), so a hot card
// never evicts ahead of a cold one — eviction is by last-READ, not last-write.
//
// Byte accounting: the total is tracked IN MEMORY (adjusted on every put and
// eviction); the expensive readdir+stat pass runs only when the tracked total
// crosses maxBytes, and on boot (the explicit sweep() in app.ts) to reconcile
// the tracked total with whatever the dir actually holds.
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
  // null = not yet reconciled with the dir (first put or explicit sweep fixes
  // it). Only this process writes the dir, so the tracked total stays exact
  // between reconciliations.
  private trackedBytes: number | null = null;

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
  // then an LRU sweep ONLY when the tracked byte total crosses the cap (or has
  // never been reconciled) — the O(cache size) readdir no longer runs per put.
  async put(name: string, body: Buffer): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    // A same-name put replaces the file: charge the tracker the DELTA so
    // repeat renders of one card don't grow the total forever.
    const prev = await stat(this.pathFor(name))
      .then((s) => (s.isFile() ? s.size : 0))
      .catch(() => 0);
    const tmp = join(this.dir, `.${name}.${process.pid}.${Date.now()}.tmp`);
    await writeFile(tmp, body);
    await rename(tmp, this.pathFor(name));
    if (this.trackedBytes !== null) {
      this.trackedBytes += body.length - prev;
    }
    if (this.trackedBytes === null || this.trackedBytes > this.maxBytes) {
      await this.sweep();
    }
  }

  // Evict least-recently-READ files until the cache fits, reap orphaned .tmp
  // files, and reconcile the in-memory byte total with the dir. Runs on boot
  // (app.ts) and whenever put() crosses the cap.
  async sweep(): Promise<void> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      this.trackedBytes = 0; // cache dir doesn't exist yet — it holds nothing
      return;
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
    this.trackedBytes = total;
  }
}
