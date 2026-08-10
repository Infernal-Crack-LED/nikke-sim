// lint-target-status.ts — roster-wide targetStatus producer/consumer census.
//
//   npx tsx scripts/lint-target-status.ts        # verify.sh gate
//
// The engine's requiresTargetStatus gate matches the status NAME exactly (case- and
// whitespace-sensitive), and a name with no producer silently never opens — the exact silent
// under-model the targetStatus primitive exists to prevent (docs/engine-modeling-gaps.md §1a;
// faithfulness audit F2.2). validate-overrides.ts is invoked per-slug, so this cross-slug check
// lives in its own sweep:
//   ERROR (exit 1) — a consumer that matches a producer only after case/trim normalization: a
//                    typo'd gate that looks wired and never fires.
//   WARN  (exit 0) — a consumer with no producer anywhere: legal (deliberately future-gated
//                    consumers stay authorable — rei-ayanami-tentative-name waits on an Eva-team
//                    applier by design), but each one should be documented in its unit's note.
import { readFileSync, readdirSync } from 'node:fs';
import { targetStatusCensus } from '../src/skills/validate-structural.js';

const OVERRIDES_DIR = new URL('../src/skills/overrides/', import.meta.url);

const overrides = new Map<string, any>();
for (const f of readdirSync(OVERRIDES_DIR)) {
  if (!f.endsWith('.json')) {
    continue;
  }
  overrides.set(
    f.replace(/\.json$/, ''),
    JSON.parse(readFileSync(new URL(f, OVERRIDES_DIR), 'utf8'))
  );
}

const { errors, warnings } = targetStatusCensus(overrides);
warnings.forEach((w) => console.log(`   ! ${w}`));
if (errors.length) {
  console.error('target-status census FAILED:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log(
  `target-status census OK (${overrides.size} overrides, ${warnings.length} unproduced-consumer warning(s))`
);
