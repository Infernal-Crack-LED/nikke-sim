// kit-status-mirrors.ts — the AUTO-mirror freshness comparison shared by every consumer of
// data/kit-status.json.
//
// kit-status.json mirrors each override's `unmodeled` and `caveats` so downstream tooling can
// read the whole roster from one file instead of 183 of them. Those mirrors only move on
// `kit-status.ts --refresh` / `--set` / `--sync-mirrors`, so an override edit silently strands
// them — which is why `kit-status.ts --check` gates them in verify.sh.
//
// This lives here because kit-status.ts is NOT importable: it dispatches on process.argv at the
// top level, so importing it would run it. Any script that derives an artifact FROM the mirrors
// (gen-unmodeled-review.ts) must be able to assert their freshness before it trusts them —
// otherwise it regenerates confidently from stale input, which reads as a successful refresh.
import { readFileSync } from 'node:fs';

const CHARACTERS_URL = new URL('../../data/characters.json', import.meta.url);
const KIT_STATUS_URL = new URL('../../data/kit-status.json', import.meta.url);
const OVERRIDE_URL = (slug: string) =>
  new URL(`../../src/skills/overrides/${slug}.json`, import.meta.url);

const EMPTY_UNMODELED = { skill1: [], skill2: [], burst: [] };

interface Mirrored {
  unmodeled?: unknown;
  caveats?: unknown;
}

/** The per-unit mirror comparison. Returns one message per stale mirror, [] when fresh.
 *  Message text is load-bearing — `kit-status.ts --check` has emitted these strings since
 *  2026-07-23 and sessions grep for them. */
export function mirrorStaleness(
  slug: string,
  docUnit: Mirrored,
  override: Mirrored
): string[] {
  const errors: string[] = [];
  if (
    JSON.stringify(docUnit.unmodeled) !==
    JSON.stringify(override.unmodeled ?? EMPTY_UNMODELED)
  ) {
    errors.push(`${slug}: unmodeled mirror stale (run --refresh)`);
  }
  if (
    JSON.stringify(docUnit.caveats ?? null) !==
    JSON.stringify(override.caveats ?? null)
  ) {
    errors.push(`${slug}: caveats mirror stale (run --refresh)`);
  }
  return errors;
}

/** Whole-roster sweep: every simSupported unit's mirrors vs its override on disk. [] when the
 *  mirrors are fresh. Reads from disk on each call — callers are one-shot scripts. */
export function staleMirrors(): string[] {
  const characters = JSON.parse(
    readFileSync(CHARACTERS_URL, 'utf8')
  ).characters;
  const units = JSON.parse(readFileSync(KIT_STATUS_URL, 'utf8')).units;
  const errors: string[] = [];
  for (const slug of Object.keys(characters).filter(
    (s) => characters[s].simSupported
  )) {
    const docUnit = units[slug];
    if (!docUnit) {
      errors.push(`${slug}: missing from kit-status.json (run --refresh)`);
      continue;
    }
    errors.push(
      ...mirrorStaleness(
        slug,
        docUnit,
        JSON.parse(readFileSync(OVERRIDE_URL(slug), 'utf8'))
      )
    );
  }
  return errors;
}
