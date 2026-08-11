// baseline-banner.ts — the durability guard for /kit-parse's provenance banner.
//
// `/kit-parse` writes `PARSER BASELINE (HYPOTHESIS — NOT a validated model) …` into a new
// baseline's note. That is ACCURATE the day it is written, for a genuinely untuned unit. The
// staleness comes from the OTHER end: nothing removes the banner once the unit gains spec tests,
// a gauntlet pass, or a real fight — which is exactly how 19 carriers ended up asserting the
// opposite of the tree until the 2026-08-10 Tier 0 sweep (docs/DECISIONS.md, D1). All 19 held
// spec tests of 11–29 cases; all 19 already classified `gauntlet` by kit-status `provenance()`,
// so the banner's own classifier branch had been dead code for every one of them.
//
// A banner is a claim about the tree, and the tree can be read — so the claim is checkable.
// Two arms, one class:
//   A. the HYPOTHESIS banner beside a spec test or a gauntlet pass (the wording D1 deleted), and
//   B. the reworded `No real-fight recording yet` beside board readings or graded fights (the
//      wording D1 KEPT, which goes stale the same way the first time a recording lands).
// Arm B is silent on the committed tree today — all 18 carriers have zero board readings — and
// exists so the surviving wording cannot repeat the failure it was rewritten out of.
//
// Lives here, not in kit-status.ts, for the same reason as kit-status-mirrors.ts: kit-status.ts
// dispatches on process.argv at the top level, so importing it would run it.
import { existsSync, readFileSync } from 'node:fs';

const CHARACTERS_URL = new URL('../../data/characters.json', import.meta.url);
const KIT_STATUS_URL = new URL('../../data/kit-status.json', import.meta.url);
const OVERRIDE_URL = (slug: string) =>
  new URL(`../../src/skills/overrides/${slug}.json`, import.meta.url);
const SPEC_TEST_URL = (slug: string) =>
  new URL(`../tests/units/${slug}.test.ts`, import.meta.url);

/** The /kit-parse banner marker — also the string kit-status `provenance()` reads as
 *  'parser-baseline'. Match the prefix only: the em-dash tail has been reworded before. */
export const BASELINE_BANNER = 'PARSER BASELINE (HYPOTHESIS';
/** The part of the banner D1 kept, because it was the part still true. */
export const NO_RECORDING_CLAIM = 'No real-fight recording yet';
/** The marker the kit-autonomy gauntlet's Land step writes into the note (kit-status.ts S3). */
const GAUNTLET_MARKER = 'Kit-autonomy gauntlet';

/** What the tree says about a unit, independent of what its note claims. */
export interface TreeEvidence {
  /** scripts/tests/units/<slug>.test.ts exists */
  hasSpecTest: boolean;
  /** recorded board readings for this unit (kit-status `board.n`) */
  boardReadings: number;
  /** graded real fights (kit-status `graded.teams`) */
  gradedTeams: number;
}

/** The per-unit banner check. Returns one message per stale claim, [] when the note's
 *  provenance claims match the tree. Message text is load-bearing — sessions grep for it. */
export function bannerStaleness(
  slug: string,
  note: string,
  evidence: TreeEvidence
): string[] {
  const errors: string[] = [];
  const validated: string[] = [];
  if (evidence.hasSpecTest) {
    validated.push(`spec test scripts/tests/units/${slug}.test.ts`);
  }
  if (note.includes(GAUNTLET_MARKER)) {
    validated.push('a kit-autonomy gauntlet pass');
  }
  if (note.includes(BASELINE_BANNER) && validated.length) {
    errors.push(
      `${slug}: note carries the /kit-parse baseline banner ("${BASELINE_BANNER}…") but the unit has ` +
        `${validated.join(' and ')} — the banner asserts the opposite of the tree. Keep only the part ` +
        `still true ("${NO_RECORDING_CLAIM} — every ⚑ below is an unmeasured estimate. Structure is ` +
        `test-pinned (…)"), or delete it outright if the unit is also graded ` +
        `(docs/DECISIONS.md 2026-08-10 Tier 0, D1), then run --sync-mirrors.`
    );
  }

  const fights: string[] = [];
  if (evidence.boardReadings > 0) {
    fights.push(`${evidence.boardReadings} board reading(s)`);
  }
  if (evidence.gradedTeams > 0) {
    fights.push(`${evidence.gradedTeams} graded team(s)`);
  }
  if (note.includes(NO_RECORDING_CLAIM) && fights.length) {
    errors.push(
      `${slug}: note claims "${NO_RECORDING_CLAIM}" but the unit has ${fights.join(' and ')} — ` +
        `rewrite the note to the measured state (docs/DECISIONS.md 2026-08-10 Tier 0, D1), then ` +
        `run --sync-mirrors.`
    );
  }
  return errors;
}

/** Whole-roster sweep: every simSupported unit's note vs the tree. [] when no claim is stale.
 *  Reads from disk on each call — callers are one-shot scripts. */
export function staleBanners(): string[] {
  const characters = JSON.parse(
    readFileSync(CHARACTERS_URL, 'utf8')
  ).characters;
  const units = JSON.parse(readFileSync(KIT_STATUS_URL, 'utf8')).units;
  const errors: string[] = [];
  for (const slug of Object.keys(characters).filter(
    (s) => characters[s].simSupported
  )) {
    const note: string =
      JSON.parse(readFileSync(OVERRIDE_URL(slug), 'utf8')).note ?? '';
    const docUnit = units[slug];
    errors.push(
      ...bannerStaleness(slug, note, {
        hasSpecTest: existsSync(SPEC_TEST_URL(slug)),
        // board/graded are AUTO mirrors refreshed globally, so this arm can fire LATE (never
        // falsely): a fresh recording is caught at the next --refresh, not before it.
        boardReadings: docUnit?.board?.n ?? 0,
        gradedTeams: docUnit?.graded?.teams ?? 0,
      })
    );
  }
  return errors;
}
