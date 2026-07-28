// Sidecar store: cache filename → the RenderSpec that produced it.
//
// Why it exists: /api/v1/img/cache/<type>.<hash>.png is the SHORT, content-
// addressed URL (~45 chars) that the 302s and POST /render hand out, and it is
// the only form of these URLs that fits Discord's 2048-char embed limit — a
// populated roster's `?b=<code>` URL is ~3.3 KB (reported by the bakery-bot
// integration 2026-07-28). But the PNG cache is byte-bounded with LRU
// eviction, so an embedded cache URL would eventually 404 and break an old
// Discord post. With the spec remembered, a miss RE-RENDERS instead of 404ing:
// the short URL becomes as durable as the long one, and the bot can go back to
// referencing a URL rather than uploading the bytes with every message.
//
// The specs are tiny next to the PNGs they describe (a few hundred bytes vs
// ~350 KB), so they are stored in their own subdir with a COUNT cap rather
// than joining the byte-bounded LRU — 20k of them is a few MB, and the PNG
// cache holds ~570 cards at the 200 MB default. RenderCache.sweep() skips this
// directory: it stats every entry and keeps only files.
import {
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_MAX_ENTRIES = 20_000;

export class SpecStore {
  // null = not yet reconciled with the dir; the first remember() counts it.
  private tracked: number | null = null;

  constructor(
    readonly dir: string,
    readonly maxEntries: number = DEFAULT_MAX_ENTRIES
  ) {}

  private pathFor(file: string): string {
    return join(this.dir, `${file}.json`);
  }

  // Remember the spec behind a cache filename. Best-effort: a failure here
  // costs durability, never correctness (a miss then 404s exactly as before),
  // so it must not fail the render that triggered it.
  async remember(file: string, spec: unknown): Promise<void> {
    try {
      // Content-addressed: a filename's spec never changes, so an existing
      // sidecar is already correct. ensureCached calls this on every request
      // (not just on a render) so entries written before this store existed
      // pick one up on their next hit — a stat is the cheap way to keep that
      // idempotent instead of rewriting a hot card's sidecar every time.
      if (await stat(this.pathFor(file)).catch(() => null)) {
        return;
      }
      await mkdir(this.dir, { recursive: true });
      const tmp = join(this.dir, `.${file}.${process.pid}.tmp`);
      await writeFile(tmp, JSON.stringify(spec));
      await rename(tmp, this.pathFor(file));
      if (this.tracked !== null) {
        this.tracked++;
      }
      if (this.tracked === null || this.tracked > this.maxEntries) {
        await this.prune();
      }
    } catch {
      /* durability is best-effort — see the method comment */
    }
  }

  // The spec behind a cache filename, or null when it isn't remembered (an
  // entry written before this store existed, a pruned one, or a corrupt file).
  async recall(file: string): Promise<unknown | null> {
    try {
      return JSON.parse(await readFile(this.pathFor(file), 'utf8')) as unknown;
    } catch {
      return null;
    }
  }

  // Drop the oldest entries down to the cap, and reconcile the tracked count.
  // Same shape as RenderCache.sweep: per-entry stat is fallible (a concurrent
  // remember() can rename its .tmp away), so one bad entry can't abort it.
  async prune(): Promise<void> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      this.tracked = 0; // no dir yet — it holds nothing
      return;
    }
    const entries = (
      await Promise.all(
        names
          .filter((n) => n.endsWith('.json'))
          .map(async (name) => {
            const s = await stat(join(this.dir, name)).catch(() => null);
            return s?.isFile() ? { name, mtimeMs: s.mtimeMs } : null;
          })
      )
    ).filter((e): e is NonNullable<typeof e> => e !== null);
    entries.sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first
    const excess = entries.length - this.maxEntries;
    for (let i = 0; i < excess; i++) {
      await unlink(join(this.dir, entries[i].name)).catch(() => {});
    }
    this.tracked = Math.min(entries.length, this.maxEntries);
  }
}
