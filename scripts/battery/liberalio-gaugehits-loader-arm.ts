// RUNTIME OVERRIDE-LOADER ARM for the `liberalio` sub-hit gauge-credit test (2026-08-17).
//
// WHY THIS EXISTS. The scored A/B in scripts/battery/liberalio-gaugehits-ab.ts patches the
// override in memory through `run(comp, patch)`. The vitest battery
// (scripts/tests/battery/*.test.ts, scripts/tests/gauge-cycle-decomp.test.ts) cannot be driven
// that way: those fixtures call the instruments in scripts/battery/fb-count-matrix.ts, which read
// the SHIPPED override through `loadOverride` and expose no patch seam. Answering "which
// assertions go RED under the arm?" therefore needs the LOADER patched, not the file — the
// override JSON on disk is protected content and is never touched by this arm.
//
// HOW. `scripts/battery/liberalio-gaugehits.vitest.config.ts` aliases every import of
// `src/skills/overrides-node.js` to this module, which re-implements `loadOverride` (an 8-line
// fs read) and injects `gaugeHits` into `liberalio`'s S1 202.5 rider when the env arm is on:
//
//   # PASS-THROUGH (self-validation: must reproduce the unpatched suite exactly)
//   npx vitest run --config scripts/battery/liberalio-gaugehits.vitest.config.ts
//   # ARM
//   LIB_GAUGEHITS=5 npx vitest run --config scripts/battery/liberalio-gaugehits.vitest.config.ts
//
// SELF-VALIDATION IS MANDATORY: with `LIB_GAUGEHITS` unset this module must be behaviourally
// identical to src/skills/overrides-node.ts, so the pass-through suite has to match the plain
// `npx vitest run` result before any RED under the arm may be attributed to the arm. `--json`
// on the ab script prints the same arm's sizing so the two seams can be cross-checked.
import { existsSync, readFileSync } from 'node:fs';
import type { OverrideFile } from '../../src/skills/index.js';
import type { EffectDef } from '../../src/skills/types.js';

const ARM = process.env.LIB_GAUGEHITS
  ? Number(process.env.LIB_GAUGEHITS)
  : null;

if (ARM !== null && (!Number.isInteger(ARM) || ARM < 1)) {
  throw new Error(
    `LIB_GAUGEHITS must be a positive integer (got ${process.env.LIB_GAUGEHITS})`
  );
}

/** Same contract as src/skills/overrides-node.ts, plus the opt-in `liberalio` arm. */
export function loadOverride(slug: string): OverrideFile | undefined {
  const path = new URL(
    `../../src/skills/overrides/${slug}.json`,
    import.meta.url
  );
  if (!existsSync(path)) {
    return undefined;
  }
  const ov = JSON.parse(readFileSync(path, 'utf8')) as OverrideFile;
  if (ARM === null || slug !== 'liberalio') {
    return ov;
  }
  const e = (ov.skill1 ?? [])
    .flatMap((b) => b.effects as EffectDef[])
    .find(
      (x): x is Extract<EffectDef, { kind: 'flatDamage' }> =>
        x.kind === 'flatDamage' && x.atkPct === 202.5
    );
  if (!e) {
    throw new Error(
      'liberalio S1 202.5 rider missing — this arm is stale, re-derive it against the override'
    );
  }
  e.gaugeHits = ARM;
  return ov;
}
