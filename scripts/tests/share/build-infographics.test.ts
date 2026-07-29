// Integration test for scripts/build-infographics.ts's manifest + content-hash
// logic. Runs the real script with --limit (unit cards only — the default test
// suite must NOT render the full ~208-image set, and the DPS/rank jobs need
// gitignored web/public artifacts a fresh worktree doesn't have) into a temp
// dir, then asserts:
//   - content-hashed filenames: <logical-key>.<sha256(bytes)[0:8]>.<ext>
//   - manifest.json schema: { generatedAt, images[key] = { file, hash, bytes,
//     width, height } } matching the bytes on disk
//   - notSimSupported: the deliberately-cardless slugs, disjoint from `images`
//   - determinism: a second run reproduces identical hashes
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const SCRIPT = new URL('../../build-infographics.ts', import.meta.url);

const LIMIT = 3;
// Unit cards emit WEBP (plan §12 — measured: q90 is ~86% smaller than PNG, the
// difference between a ~25 MB and a ~150 MB deploy artifact). Every other kind
// stays PNG.
const HASHED_NAME = /^unit\/.+\.[0-9a-f]{8}\.webp$/;

interface Manifest {
  generatedAt: string;
  images: Record<
    string,
    { file: string; hash: string; bytes: number; width: number; height: number }
  >;
  // Slugs deliberately given no card (unsupported B3/Λ) — a consumer contract,
  // see the test below.
  notSimSupported: string[];
}

async function build(outDir: string): Promise<Manifest> {
  await run('npx', [
    'tsx',
    SCRIPT.pathname,
    '--limit',
    String(LIMIT),
    '--out',
    outDir,
  ]);
  return JSON.parse(
    readFileSync(join(outDir, 'manifest.json'), 'utf8')
  ) as Manifest;
}

describe('build-infographics manifest + content hashing', () => {
  it('writes hashed WebP cards and a manifest that matches the bytes on disk', async () => {
    const out = mkdtempSync(join(tmpdir(), 'infographics-'));
    try {
      const manifest = await build(out);

      expect(manifest.generatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
      const keys = Object.keys(manifest.images);
      // TWO variants per unit (ruling 15): the 2:1 landscape `discord` card and
      // the 3:4 portrait `twitter` launch asset.
      expect(keys.length).toBe(LIMIT * 2);
      expect(keys.every((k) => k.startsWith('unit/'))).toBe(true);

      const onDisk = readdirSync(join(out, 'unit'));
      expect(onDisk.length).toBe(LIMIT * 2);
      // keys carry the variant — a shared key would serve the landscape card to
      // a portrait request out of an immutable cache
      expect(keys.filter((k) => k.endsWith('.discord')).length).toBe(LIMIT);
      expect(keys.filter((k) => k.endsWith('.twitter')).length).toBe(LIMIT);

      for (const [key, entry] of Object.entries(manifest.images)) {
        // filename embeds the content hash: <key>.<hash8>.webp
        expect(entry.file).toBe(`${key}.${entry.hash}.webp`);
        expect(entry.file).toMatch(HASHED_NAME);
        expect(onDisk).toContain(entry.file.split('/')[1]);

        const png = readFileSync(join(out, entry.file));
        // hash8 is genuinely content-addressed
        expect(entry.hash).toBe(
          createHash('sha256').update(png).digest('hex').slice(0, 8)
        );
        expect(entry.bytes).toBe(png.length);
        // RIFF....WEBP magic
        expect(png.subarray(0, 4).toString('ascii')).toBe('RIFF');
        expect(png.subarray(8, 12).toString('ascii')).toBe('WEBP');
        // Landscape renders at dpr 2 (2400x1200); portrait deliberately does
        // NOT — X shows it ~500-600px wide, so 1200x1600 is already ~2x the
        // display width and dpr 2 would buy pixels nothing consumes (§12).
        if (key.endsWith('.twitter')) {
          expect(entry.width).toBe(1200);
          expect(entry.height).toBe(1600);
        } else {
          expect(entry.width).toBe(2400);
          expect(entry.height).toBe(1200);
        }
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('lists the deliberately-cardless slugs, and never renders one', async () => {
    // bakery-bot's /nikke depends on this: a null card lookup is ambiguous
    // between "no card on purpose" and "no card yet" (manifest outage, or a
    // unit synced after the last deploy), and only the first should tell a user
    // the unit is not sim-supported.
    const out = mkdtempSync(join(tmpdir(), 'infographics-skip-'));
    try {
      const manifest = await build(out);
      expect(Array.isArray(manifest.notSimSupported)).toBe(true);
      expect(manifest.notSimSupported.length).toBeGreaterThan(0);
      // sorted, so the manifest stays diff-friendly
      expect(manifest.notSimSupported).toEqual(
        [...manifest.notSimSupported].sort()
      );
      // the two halves are disjoint by construction — a listed slug has no card
      for (const slug of manifest.notSimSupported) {
        expect(manifest.images[`unit/${slug}.discord`]).toBeUndefined();
        expect(manifest.images[`unit/${slug}.twitter`]).toBeUndefined();
      }
      // and each one is genuinely an unsupported B3/Λ, not an arbitrary drop
      const chars = (
        JSON.parse(
          readFileSync(
            fileURLToPath(new URL('../../../data/characters.json', import.meta.url)),
            'utf8'
          )
        ) as {
          characters: Record<
            string,
            { burst: string; simSupported?: boolean }
          >;
        }
      ).characters;
      for (const slug of manifest.notSimSupported) {
        const c = chars[slug];
        expect(c, slug).toBeTruthy();
        expect(['III', 'Λ'], slug).toContain(c.burst);
        expect(c.simSupported, slug).toBe(false);
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('is deterministic — re-running reproduces identical hashes', async () => {
    const outA = mkdtempSync(join(tmpdir(), 'infographics-a-'));
    const outB = mkdtempSync(join(tmpdir(), 'infographics-b-'));
    try {
      const [a, b] = [await build(outA), await build(outB)];
      const hashes = (m: Manifest) =>
        Object.fromEntries(
          Object.entries(m.images).map(([k, v]) => [k, v.hash])
        );
      expect(hashes(a)).toEqual(hashes(b));
    } finally {
      rmSync(outA, { recursive: true, force: true });
      rmSync(outB, { recursive: true, force: true });
    }
  });
});
