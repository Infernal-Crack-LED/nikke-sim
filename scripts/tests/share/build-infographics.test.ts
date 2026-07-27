// Integration test for scripts/build-infographics.ts's manifest + content-hash
// logic. Runs the real script with --limit (unit cards only — the default test
// suite must NOT render the full ~208-image set, and the DPS/rank jobs need
// gitignored web/public artifacts a fresh worktree doesn't have) into a temp
// dir, then asserts:
//   - content-hashed filenames: <logical-key>.<sha256(png)[0:8]>.png
//   - manifest.json schema: { generatedAt, images[key] = { file, hash, bytes,
//     width, height } } matching the bytes on disk
//   - determinism: a second run reproduces identical hashes
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);
const SCRIPT = new URL('../../build-infographics.ts', import.meta.url);

const LIMIT = 3;
const HASHED_NAME = /^unit\/.+\.[0-9a-f]{8}\.png$/;

interface Manifest {
  generatedAt: string;
  images: Record<
    string,
    { file: string; hash: string; bytes: number; width: number; height: number }
  >;
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
  it('writes hashed PNGs and a manifest that matches the bytes on disk', async () => {
    const out = mkdtempSync(join(tmpdir(), 'infographics-'));
    try {
      const manifest = await build(out);

      expect(manifest.generatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
      const keys = Object.keys(manifest.images);
      expect(keys.length).toBe(LIMIT);
      expect(keys.every((k) => k.startsWith('unit/'))).toBe(true);

      const onDisk = readdirSync(join(out, 'unit'));
      expect(onDisk.length).toBe(LIMIT);

      for (const [key, entry] of Object.entries(manifest.images)) {
        // filename embeds the content hash: <key>.<hash8>.png
        expect(entry.file).toBe(`${key}.${entry.hash}.png`);
        expect(entry.file).toMatch(HASHED_NAME);
        expect(onDisk).toContain(entry.file.split('/')[1]);

        const png = readFileSync(join(out, entry.file));
        // hash8 is genuinely content-addressed
        expect(entry.hash).toBe(
          createHash('sha256').update(png).digest('hex').slice(0, 8)
        );
        expect(entry.bytes).toBe(png.length);
        // PNG magic bytes
        expect(png.subarray(0, 4).toString('hex')).toBe('89504e47');
        // scale-2 unit card
        expect(entry.width).toBe(1280);
        expect(entry.height).toBe(960);
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
