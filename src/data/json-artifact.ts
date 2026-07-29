// json-artifact.ts — the ONE writer for every generated JSON artifact in the repo.
//
// WHY THIS EXISTS. Generated JSON used to be written with a hand-picked JSON.stringify indent —
// `null, 1` in sync.ts and build-archetype-tags.ts, `null, 2` in kit-status.ts, no indent at all in
// sync-skill-levels.ts — and then lint-staged's `prettier --write` reformatted it on the way into
// the commit. The generator and the commit hook never agreed, so a regenerated artifact committed as
// a whole-file rewrite: `npm run sync` on 2026-07-28 produced a 194,406-line diff on
// data/characters.json for TWO real field changes. That churn is not cosmetic — it buries the actual
// data delta, so nobody can review what a sync changed, and it makes `git log -S`/blame on a data
// value useless.
//
// Formatting with prettier AT WRITE TIME makes the generator's output byte-identical to what the
// commit hook would produce, so a regenerated artifact diffs by exactly what changed inside it.
// Verified 2026-07-28: prettier(JSON.stringify(characters, null, 2)) reproduces the committed
// data/characters.json byte-for-byte, in ~350ms for its 3.2 MB.
//
// The indent-2 input matters. Prettier preserves an object's expanded/collapsed shape from its input
// (the "first line break" rule) and only re-wraps arrays, so feeding it MINIFIED JSON yields
// collapsed objects — a different file. Always hand it the indent-2 form.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, getFileInfo, resolveConfig } from 'prettier';

const IGNORE_PATH = fileURLToPath(new URL('../../.prettierignore', import.meta.url));

/**
 * The exact text `writeJsonArtifact` would write for `value` at `target`. Exported so the format
 * invariant can be tested without writing to a tracked artifact
 * (scripts/tests/data-artifact-format.test.ts).
 *
 * A path listed in .prettierignore gets the plain indent-2 form instead — the commit hook will not
 * touch it either, so generator and repo still agree.
 */
export async function formatJsonArtifact(
  target: string | URL,
  value: unknown
): Promise<string> {
  const path = typeof target === 'string' ? target : fileURLToPath(target);
  const indented = JSON.stringify(value, null, 2) + '\n';
  const { ignored } = await getFileInfo(path, { ignorePath: IGNORE_PATH });
  return ignored
    ? indented
    : format(indented, {
        ...(await resolveConfig(path)),
        filepath: path,
        parser: 'json',
      });
}

/**
 * Write `value` as JSON to `target`, formatted exactly as prettier (and therefore the pre-commit
 * hook) would format it. Async because prettier 3 has no synchronous format().
 */
export async function writeJsonArtifact(
  target: string | URL,
  value: unknown
): Promise<void> {
  const path = typeof target === 'string' ? target : fileURLToPath(target);
  const text = await formatJsonArtifact(path, value);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
