// sweep-line-citations.ts — replace bare `<file>:<line>` code citations with SYMBOL citations
// (faithfulness audit F1 / phase 0.3).
//
//   npx tsx scripts/sweep-line-citations.ts            # report only (exit 1 if anything unmapped)
//   npx tsx scripts/sweep-line-citations.ts --check    # verify.sh gate: exit 1 on ANY citation in scope
//   npx tsx scripts/sweep-line-citations.ts --write    # apply
//
// WHY. A citation like `sim.ts:2568` rots on the next engine edit and then actively misleads: at the
// time of this sweep, of the 40 distinct sim.ts lines cited across the override prose, nearly all
// pointed at unrelated code — `2568` ("flatDamage generates gauge") had become a `const fdRampMul`,
// `1727` ("the hit counter adds hitsPerShot") had become the burstDesc amp comment. Every reader who
// follows one pays a verification pass to discover it is wrong. A symbol survives the edit that
// moves it, so the convention is: name the CODE BLOCK or symbol, never the line.
//
// SCOPE. Override prose + CURRENT-STATE docs. CHANGELOG-class docs are deliberately excluded
// (`docs/DECISIONS.md`, `docs/answered-questions.md`, `docs/probe-runs.md`, the `closed/` archives):
// they are append-only records of what was believed on a date, and rewriting a dated entry's
// citation edits history rather than fixing a pointer. `docs/unmodeled-entries-review.md` is
// excluded because it is GENERATED from override prose — it fixes itself once the overrides do
// (`npx tsx scripts/gen-unmodeled-review.ts --update`).
//
// SAFETY. Replacement is literal text substitution on the raw file bytes — overrides are never
// JSON.parse'd and re-serialized, which would reformat every file and destroy the diff.
//
// The map below is the reviewable artifact. Each entry was resolved by finding what the prose
// DESCRIBES in today's engine, not by trusting the stale line number.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

/**
 * cited `<basename>:<line>` → the phrase that replaces the `:<line>` suffix.
 * The filename itself (and any path prefix — `src/engine/sim.ts:224` vs `sim.ts:224`) is preserved,
 * so a value of " `foo()`" turns "sim.ts:224" into "sim.ts `foo()`".
 */
const MAP: Record<string, string> = {
  // ── src/engine/sim.ts ────────────────────────────────────────────────────────────────────────
  'sim.ts:224': ' `quantizeToFrames()`',
  'sim.ts:801': ' `dealDamage()`, the additive Damage-Up bucket',
  'sim.ts:887':
    "'s cube/OL extra-stat setup, the `maxHpPct` → `maxHpFlat` conversion",
  'sim.ts:900-910': ' `applyBuff()`',
  'sim.ts:1402': ' `dealDamage()`, the `pierceTagged` term',
  'sim.ts:1412': ' `dealDamage()`, the flavor-scoped Damage-Up terms',
  'sim.ts:1472-1498': ' `liveMaxHp()` + `effectiveAtk()`',
  'sim.ts:1483': ' `sum()`, the `perResource` branch',
  'sim.ts:1513': ' `liveMaxHp()`',
  'sim.ts:1522': "'s charge-progress step, the `chargeSpeedPct` clamp",
  'sim.ts:1523': "'s charge-progress step",
  'sim.ts:1525': ' `liveMaxHp()`',
  'sim.ts:1586': ' `dealDamage()`, the `critRateNormalPct` normal-attack scope',
  'sim.ts:1606': ' — see `TriggerDef` in `src/skills/types.ts`, which',
  'sim.ts:1642': ' `dealDamage()`, the `chargeMultPct` fallback chain',
  'sim.ts:1662/1683': ' `dealDamage()`, the flavor-scoped Damage-Up terms',
  'sim.ts:1677': ' `firePull()`, the `hitCounters` increment',
  'sim.ts:1690': ' `dealDamage()`, `opts.trueFlavor`',
  'sim.ts:1706': ' `blockGatesPass()`',
  'sim.ts:1727': ' `firePull()`, the `hitCounters` increment',
  'sim.ts:1772': ' `applyEffect()`, the `casterMaxHpPct` → flat conversion',
  'sim.ts:1818': ' `applyEffect()`, the `escalating` case',
  'sim.ts:1922': ' `applyBuff()`',
  'sim.ts:2030': ' `blockGatesPass()`',
  'sim.ts:2047': ' `applyEffect()`, the `burstCdr` case',
  'sim.ts:2056': ' `applyBuff()`, the per-step buff key',
  'sim.ts:2078': ' `blockGatesPass()`',
  'sim.ts:2488': ' `applyEffect()`, the `escalating` case',
  'sim.ts:2568': ' `applyEffect()`, the `flatDamage` case',
  'sim.ts:2605': ' `applyEffect()`, the `hitRepeat` case',
  'sim.ts:2651': "'s battle-start dispatch, the `passive` trigger",
  'sim.ts:2955': ' `firePull()`, the `shotsLeft` decrement',
  'sim.ts:3121': "'s charge-release path, `isAutofireCharge`",
  'sim.ts:3505':
    ' `firePull()`, the weaponSwap `damagePct` base-multiplier path',
  'sim.ts:3566-3573': "'s bolt-recovery step, `SR_BOLT_RECOVERY_FRAMES`",
  'sim.ts:3585': ' `firePull()`, the `hitCounters` increment',
  'sim.ts:3585-3590': ' `firePull()`, the `hitCounters` threshold consume',
  'sim.ts:3600-3604':
    ' `firePull()`, the `chargeCounter` phase/charge counters',
  'sim.ts:3782': ' `firePull()`, the `hitCounters` increment',
  'sim.ts:3803': "'s DoT tick loop",
  'sim.ts:4053': ' `firePull()`, the `extraHitDamagePct` rider path',
  // ── src/skills/types.ts ─────────────────────────────────────────────────────────────────────
  'types.ts:195': ' `maxStacks`',
  'types.ts:274': " the `gainPierce` effect's field docs",
  'types.ts:368': " `Block.ownBurstGate`'s field docs",
  // ── durable current-state docs (the prose already names the symbol in most of these, so the
  //    line number is pure rot and the fix is to delete it) ────────────────────────────────────
  'sim.ts:37': '',
  'sim.ts:155': '',
  'sim.ts:830': '',
  'sim.ts:96': ' `skillNoFb()`',
  'sim.ts:98': '',
  'sim.ts:723-724': ' `copiesToGradeCore()`',
  'sim.ts:997-1011': '',
  'sim.ts:1026': '',
  'sim.ts:1681': ' `effectiveAtk()`',
  'sim.ts:2393': ' `applyEffect()`, the `flatDamage` case',
  'sim.ts:2658': ' `firePull()`, the SG per-pellet `gauge` fraction',
  'sim.ts:3303': "'s DoT tick loop",
};

/**
 * Literal fixes for citations the `<file>:<line>` regex CANNOT see: a sentence that cites one line
 * with the filename and then continues with bare numbers — "flatDamage (sim.ts:2568), hitRepeat
 * (2605) and DoT ticks (3803)". Sweeping only the first leaves two orphaned line numbers that read
 * as live pointers. Applied after the regex pass; each is a no-op once already rewritten.
 */
const LITERAL: [string, string][] = [
  [
    'hitRepeat (2605) and DoT ticks (3803)',
    'hitRepeat (the `hitRepeat` case) and DoT ticks (the DoT tick loop)',
  ],
];

/**
 * Citations that MUST survive: prose whose subject IS a bare line citation. Rewriting the example
 * in "write `sim.ts` `bossDefNow()`, not `sim.ts:1694`" would delete the thing it is teaching.
 * Keyed by file basename → the exact tokens to leave alone.
 */
const KEEP: Record<string, Set<string>> = {
  'QUEUE.md': new Set(['sim.ts:1694']),
  'CONVENTIONS.md': new Set(['sim.ts:2295', 'sim.ts:1694']),
};

// Ranges use a hyphen or an en dash in the wild; both must be consumed whole, or the replacement
// leaves a "–1011" orphan behind.
const CITATION =
  /\b((?:[\w./-]*\/)?(?:sim|types|index)\.tsx?):(\d+(?:[-–]\d+)?(?:\/\d+)?)/g;

function targets(): string[] {
  const out: string[] = [];
  const overrides = new URL('../src/skills/overrides/', import.meta.url)
    .pathname;
  for (const f of readdirSync(overrides)) {
    if (f.endsWith('.json')) {
      out.push(overrides + f);
    }
  }
  // CURRENT-STATE docs only. CHANGELOG docs and generated docs are excluded by design (header),
  // and so is any DATED session record (`docs/handoffs/2026-08-10-…`): a findings doc's citations
  // describe the tree on the day it was written, exactly like a DECISIONS entry's. Skipped files
  // are COUNTED and reported — a bounded sweep that reports "done" while silently dropping a
  // population reads as coverage it never had.
  const docs = new URL('../docs/', import.meta.url).pathname;
  const EXCLUDE = new Set([
    'DECISIONS.md',
    'answered-questions.md',
    'probe-runs.md',
    'unmodeled-entries-review.md',
  ]);
  const DATED = /^\d{4}-\d{2}-\d{2}-/;
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name !== 'closed') {
          walk(`${dir}${e.name}/`);
        }
      } else if (e.name.endsWith('.md')) {
        if (EXCLUDE.has(e.name) || DATED.test(e.name)) {
          skipped.push(dir + e.name);
        } else {
          out.push(dir + e.name);
        }
      }
    }
  };
  walk(docs);
  return out;
}

const skipped: string[] = [];

const write = process.argv.includes('--write');
const check = process.argv.includes('--check');
const unknown = process.argv
  .slice(2)
  .filter((a) => a !== '--write' && a !== '--check' && a !== '--report');
if (unknown.length) {
  console.error(
    `sweep-line-citations: unrecognized argument(s) ${unknown.join(', ')} (expected: <none> | --write)`
  );
  process.exit(2);
}

let replaced = 0;
const unmapped = new Map<string, string[]>();
const touched: string[] = [];

for (const path of targets()) {
  const base = path.split('/').pop()!;
  const before = readFileSync(path, 'utf8');
  let after = before;
  for (const [from, to] of LITERAL) {
    if (after.includes(from)) {
      after = after.split(from).join(to);
      replaced++;
    }
  }
  after = after.replace(CITATION, (whole, file: string, line: string) => {
    const key = `${file.split('/').pop()}:${line.replace('–', '-')}`;
    if (KEEP[base]?.has(key)) {
      return whole; // a deliberate example of the anti-pattern — see KEEP
    }
    const sub = MAP[key];
    if (sub === undefined) {
      unmapped.set(key, [...(unmapped.get(key) ?? []), path]);
      return whole;
    }
    replaced++;
    return file + sub;
  });
  if (after !== before) {
    touched.push(path);
    if (write) {
      writeFileSync(path, after);
    }
  }
}

console.log(
  `${write ? 'rewrote' : 'would rewrite'} ${replaced} citation(s) across ${touched.length} file(s)`
);
// A fresh non-global regex per test: CITATION is /g, and a shared /g regex's lastIndex persists
// across .test() calls, which silently under-reports every other file.
const hasCitation = (s: string) => new RegExp(CITATION.source).test(s);
const skippedWithCitations = skipped.filter((p) =>
  hasCitation(readFileSync(p, 'utf8'))
);
if (skippedWithCitations.length) {
  console.log(
    `NOT swept, by design (${skippedWithCitations.length} file(s) still carrying citations): CHANGELOG-class + generated + dated session records —\n  ` +
      skippedWithCitations.map((p) => p.split('/').pop()).join('\n  ')
  );
}
if (unmapped.size) {
  console.error(
    `\n${unmapped.size} UNMAPPED citation(s) — add them to MAP and re-run:`
  );
  for (const [key, files] of [...unmapped].sort()) {
    console.error(
      `  ${key}  ← ${[...new Set(files.map((f) => f.split('/').pop()))].join(', ')}`
    );
  }
  process.exit(1);
}
// --check is the verify.sh gate: the convention only holds if a NEW bare citation cannot land. A
// mapped-but-unswept citation is just as rotten as an unmapped one, so any survivor in scope fails.
if (check && replaced > 0) {
  console.error(
    `\nline-citation check FAILED: ${replaced} bare \`file:line\` citation(s) in scope.\n` +
      `Name the CODE BLOCK or symbol instead (\`sim.ts\` \`bossDefNow()\`, not \`sim.ts:1694\`) — a line\n` +
      `number rots on the next engine edit and then points at unrelated code.\n` +
      `Files: ${touched.map((p) => p.split('/').pop()).join(', ')}\n` +
      `Fix by hand, or add the mapping to MAP in this script and run --write.`
  );
  process.exit(1);
}
if (check) {
  console.log('line-citation check OK (no bare file:line citations in scope)');
}
