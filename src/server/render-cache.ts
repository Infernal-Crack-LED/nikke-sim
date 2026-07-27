// Content-addressed on-disk cache for dynamically rendered infographics
// (team/roster cards). Filenames carry a hash of the render inputs
// (`team.<hash16>.png`), so a cached file is valid FOREVER and is served
// immutable; the cache is bounded by bytes with LRU eviction by mtime.
import {
  mkdir,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

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
      return (await stat(this.pathFor(name))).isFile();
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

  // Evict oldest-by-mtime files until the cache fits. Runs on boot and after
  // every write — cheap at this scale (a 200 MB cap ≈ a few thousand PNGs).
  async sweep(): Promise<void> {
    let entries: { name: string; size: number; mtimeMs: number }[];
    try {
      const names = (await readdir(this.dir)).filter((n) => n.endsWith('.png'));
      entries = await Promise.all(
        names.map(async (name) => {
          const s = await stat(this.pathFor(name));
          return { name, size: s.size, mtimeMs: s.mtimeMs };
        })
      );
    } catch {
      return; // cache dir doesn't exist yet — nothing to sweep
    }
    let total = entries.reduce((sum, e) => sum + e.size, 0);
    entries.sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first
    for (const e of entries) {
      if (total <= this.maxBytes) {
        break;
      }
      await unlink(this.pathFor(e.name)).catch(() => {});
      total -= e.size;
    }
  }
}
