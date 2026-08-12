// lint-target-status.ts — roster-wide producer/consumer censuses over the override set.
//
//   npx tsx scripts/lint-target-status.ts                      # verify.sh gate (cross-slug names)
//   npx tsx scripts/lint-target-status.ts --block-order        # print the same-slot ORDER census
//   npx tsx scripts/lint-target-status.ts --update-block-order # rewrite the pinned fixture
//
// Two censuses, both cross-slug and both about a gate that can silently fail:
//
// 1. NAMES (default, the verify.sh gate). The engine's requiresTargetStatus gate matches the
//    status NAME exactly (case- and whitespace-sensitive), and a name with no producer silently
//    never opens — the exact silent under-model the targetStatus primitive exists to prevent
//    (docs/engine-modeling-gaps.md §1a; faithfulness audit F2.2). validate-overrides.ts is invoked
//    per-slug, so this cross-slug check lives in its own sweep:
//      ERROR (exit 1) — a consumer that matches a producer only after case/trim normalization: a
//                       typo'd gate that looks wired and never fires.
//      WARN  (exit 0) — a consumer with no producer anywhere: legal (deliberately future-gated
//                       consumers stay authorable — rei-ayanami-tentative-name waits on an Eva-team
//                       applier by design), but each one should be documented in its unit's note.
//
// 2. ORDER (--block-order / --update-block-order, faithfulness audit F2.5). Where a unit both
//    WRITES and READS the same status or resource inside ONE slot array, the two blocks resolve by
//    array position on a shared frame, so a reorder flips behaviour with nothing failing. This mode
//    dumps that census; scripts/tests/block-order-guard.test.ts pins the result, which is what
//    actually makes a reorder loud. --update-block-order is the ONLY way that fixture is written:
//    regenerate deliberately, and re-verify the affected unit before accepting the new order.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import {
  blockOrderCensus,
  targetStatusCensus,
} from '../src/skills/validate-structural.js';

const OVERRIDES_DIR = new URL('../src/skills/overrides/', import.meta.url);
// The test reads the same path; it does NOT import it from here, because this module runs a census
// on import — a script stays a script.
const BLOCK_ORDER_FIXTURE = new URL(
  './tests/fixtures/block-order-pairs.json',
  import.meta.url
);

const MODES = ['--block-order', '--update-block-order'] as const;
const args = process.argv.slice(2);
const unknown = args.filter((a) => !(MODES as readonly string[]).includes(a));
if (unknown.length) {
  console.error(
    `lint-target-status: unrecognized argument(s) ${unknown.join(', ')} (expected: <none> | ${MODES.join(' | ')})`
  );
  process.exit(2);
}

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

if (args.includes('--block-order') || args.includes('--update-block-order')) {
  const census = blockOrderCensus(overrides);
  const entries = Object.entries(census);
  const total = entries.reduce((n, [, p]) => n + p.length, 0);
  for (const [slug, pairs] of entries) {
    for (const p of pairs) {
      console.log(
        `${slug.padEnd(28)} ${p.family.padEnd(8)} ${p.order.padEnd(14)} ${p.slot}[${p.producer}] writes / ${p.slot}[${p.consumer}] reads  "${p.name}"`
      );
    }
  }
  console.log(
    `\nblock-order census: ${total} same-slot pair(s) across ${entries.length} unit(s) of ${overrides.size}`
  );
  if (args.includes('--update-block-order')) {
    writeFileSync(
      BLOCK_ORDER_FIXTURE,
      JSON.stringify(
        {
          _README:
            'PINNED same-slot producer/consumer ORDER per unit (faithfulness audit F2.5). Same-frame block order is load-bearing and the engine cannot notice a swap, so this fixture is the guard: scripts/tests/block-order-guard.test.ts fails when a shipped override reorders one of these pairs. A diff here is NEVER incidental — re-verify the unit before regenerating with `npx tsx scripts/lint-target-status.ts --update-block-order`.',
          pairs: census,
        },
        null,
        2
      ) + '\n'
    );
    console.log(`wrote ${BLOCK_ORDER_FIXTURE.pathname}`);
  }
  process.exit(0);
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
