// doc-drift.ts — catch the two doc-drift classes that repeatedly outlived their landings.
//
// WHY (2026-07-22): a single planning pass hit four stale doc claims, each of which changed a
// priority. Root cause was always the same — a landing propagates to DECISIONS and to the code,
// but the doc that POSES the question keeps posing it. Two mechanically-checkable classes:
//
//   1. "which units use primitive X" — derivable from the overrides, yet hand-maintained in
//      docs/STATE.md §5 and restated in docs/engine-modeling-gaps.md. Failures seen: STATE.md
//      listed `snow-white` under weaponSwap/hasPierce/fbGate/teamAmmo for two days after her
//      re-encode dropped them; engine-modeling-gaps said "0 enactments" for `teamHas` and
//      `maxAmmoFlat` after both had landed.
//        → CENSUS is GENERATED here (single source), and STATE.md §5 is LINTED for FALSE MEMBERS
//          (a slug listed under a primitive it no longer uses). We lint rather than regenerate §5
//          because its Users cells carry editorial structure a generator would destroy: the `/`
//          convention maps users to specific primitives in a multi-primitive row, and long lists
//          are deliberately abbreviated ("~30 units"). False membership is the half that misleads;
//          a missing name is benign (STATE.md says the lists are "current but not a contract").
//
//   1b. "which damage bucket does StatKey X feed" — the same class, one axis over: a StatKey is
//      added to src/skills/types.ts and wired into a bucket in dealDamage, but nothing forces the
//      human-facing routing table to learn about it. The BUCKET_ROUTING map below is the single
//      written source for that routing; it is LINTED against the StatKey union (a new StatKey with
//      no routing entry, or a routing entry for a StatKey that no longer exists, fails verify.sh)
//      and GENERATED into docs/data/damage-bucket-matrix.md together with live carrier counts.
//
//   2. a resolved question still filed under open-questions ## UNANSWERED. Failures seen: U17 sat
//      in UNANSWERED with a header reading "CLOSED — OWNER OVERRIDE"; U22 stayed CONTESTED after
//      the owner re-ruled it the same day. Greps for open work kept resurfacing settled records.
//        → LINTED: a resolution verb in an UNANSWERED entry's header/opening is an error.
//
// USAGE
//   npx tsx scripts/doc-drift.ts            # check (verify.sh gate) — exits 1 on drift
//   npx tsx scripts/doc-drift.ts --update   # regenerate both generated blocks (primitive census in
//                                           # engine-modeling-gaps, StatKey→bucket matrix in
//                                           # docs/data/damage-bucket-matrix.md)
//
// MATCHING NOTE (learned the hard way): primitives are matched as a QUOTED TOKEN inside the
// override's NON-PROSE fields only. A bare-token grep hits `note`/`caveats` prose and produces
// false findings — a "hitRatePct ... inert" sweep once flagged six overrides whose caveats had
// ALREADY been corrected. Prose is excluded here by construction.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const OVERRIDES = new URL('src/skills/overrides/', ROOT);
const STATE_MD = new URL('docs/STATE.md', ROOT);
const GAPS_MD = new URL('docs/engine-modeling-gaps.md', ROOT);
const QUESTIONS_MD = new URL('docs/open-questions.md', ROOT);
const BUCKET_MD = new URL('docs/data/damage-bucket-matrix.md', ROOT);
const TYPES_TS = new URL('src/skills/types.ts', ROOT);
const SIM_TS = new URL('src/engine/sim.ts', ROOT);

const BEGIN =
  '<!-- BEGIN GENERATED: primitive-census (npx tsx scripts/doc-drift.ts --update) -->';
const END = '<!-- END GENERATED: primitive-census -->';
const BUCKET_BEGIN =
  '<!-- BEGIN GENERATED: stat-bucket-matrix (npx tsx scripts/doc-drift.ts --update) -->';
const BUCKET_END = '<!-- END GENERATED: stat-bucket-matrix -->';

// Prose fields are current-state narration, never structural — see CONVENTIONS "Doc hygiene".
const PROSE_FIELDS = new Set(['note', 'caveats', 'unmodeled']);

// Synthetic controls (noop-* placeholders and synthetic-* stand-ins) are build-framework
// scaffolding, not roster entries. They must not inflate the primitive census in
// engine-modeling-gaps.md, which counts real units only.
const isSyntheticSlug = (s: string) =>
  s.startsWith('noop-') || s.startsWith('synthetic-');

const update = process.argv.includes('--update');
const problems: string[] = [];

// ── load overrides, structural content only ──────────────────────────────────────────────────
const slugs = readdirSync(OVERRIDES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5))
  .filter((s) => !isSyntheticSlug(s))
  .sort();

const structural = new Map<string, string>();
for (const slug of slugs) {
  const doc = JSON.parse(
    readFileSync(new URL(`${slug}.json`, OVERRIDES), 'utf8')
  );
  const stripped = Object.fromEntries(
    Object.entries(doc).filter(([k]) => !PROSE_FIELDS.has(k))
  );
  structural.set(slug, JSON.stringify(stripped));
}

/** Units whose override structurally references `name` (as a JSON key OR an enum value). */
const usersOf = (name: string): string[] => {
  const token = `"${name}"`;
  return slugs.filter((s) => structural.get(s)!.includes(token));
};

// ── char-data source ─────────────────────────────────────────────────────────────────────────
// A few STATE.md §5 rows in the "Unit-level / char-static flags" table are NOT override opt-ins at
// all — they are datamined per-unit fields on data/characters.json (e.g. `hitsPerShot`). Censusing
// only the overrides under-reports those to 0, which reads as "nothing uses this". A unit counts as
// a user when its value differs from the field's MODAL value (= the datamine default), which is the
// only non-arbitrary "is this set meaningfully" rule available.
const charsRaw = JSON.parse(
  readFileSync(new URL('data/characters.json', ROOT), 'utf8')
);
const chars: Record<string, any> = charsRaw.characters ?? charsRaw;
const charDataUsers = (name: string): string[] => {
  const present = Object.entries(chars).filter(
    ([, c]) => (c as any)?.[name] !== undefined
  );
  if (!present.length) {
    return [];
  }
  const counts = new Map<string, number>();
  for (const [, c] of present) {
    const k = JSON.stringify((c as any)[name]);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return present
    .filter(([, c]) => JSON.stringify((c as any)[name]) !== modal)
    .map(([slug]) => slug)
    .sort();
};

// ── parse STATE.md §5 primitive tables ───────────────────────────────────────────────────────
// Row shape: | `prim` (+`opt`) | meaning | users |   — cell 1 may name several primitives.
const stateText = readFileSync(STATE_MD, 'utf8');
const sec5 =
  stateText
    .split('## 5. Opt-in kit primitives inventory')[1]
    ?.split('\n## ')[0] ?? '';
if (!sec5) {
  problems.push(
    'STATE.md: could not locate "## 5. Opt-in kit primitives inventory"'
  );
}

type Row = { prims: string[]; users: string; line: string; rawLine: string };
const rows: Row[] = [];
for (const line of sec5.split('\n')) {
  if (!line.startsWith('|')) {
    continue;
  }
  const cells = line.split('|').map((c) => c.trim());
  // cells[0] is '' (leading pipe). Need at least prim | meaning | users.
  if (cells.length < 5) {
    continue;
  }
  const [, c1, , c3] = cells;
  if (/^-+$/.test(c1) || c1 === 'Primitive') {
    continue;
  }
  const prims = [...c1.matchAll(/`([A-Za-z][A-Za-z0-9.]*)`/g)].map((m) => m[1]);
  if (!prims.length) {
    continue;
  }
  rows.push({ prims, users: c3, line: line.slice(0, 90), rawLine: line });
}

// ── CHECK 1: false members in STATE.md §5 ────────────────────────────────────────────────────
// Direction matters: a slug LISTED under a primitive it no longer uses actively misleads (it is
// what sent a 2026-07-22 planning pass down two wrong paths). A slug MISSING from a list is benign
// — STATE.md itself says these lists are "current but not a contract" and abbreviates long ones.
// So we flag (and under --update, prune) false members only, never absences.
const slugSet = new Set(slugs);
const falseMembers: { slug: string; row: Row }[] = [];
for (const row of rows) {
  const named = [...row.users.matchAll(/[a-z][a-z0-9]*(?:-[a-z0-9]+)*/g)]
    .map((m) => m[0])
    .filter((t) => slugSet.has(t));
  // union BOTH sources — a char-data-backed listing (e.g. under `hitsPerShot`) is a real user and
  // must never be pruned just because no override opts in.
  const anyUser = new Set(
    row.prims.flatMap((p) => [...usersOf(p), ...charDataUsers(p)])
  );
  for (const slug of new Set(named)) {
    if (!anyUser.has(slug)) {
      falseMembers.push({ slug, row });
    }
  }

  // EXACT prose counts ("8 units (…)") must match reality — this is the U14 class, where a stated
  // count outlived its landing and mis-set a priority. "~14 units" is approximate BY DESIGN
  // (the leading ~ is the author saying "about"), so those are skipped.
  // In a multi-primitive row a count is often SCOPED to one of them — e.g. the alliesOf* row reads
  // "(element) 8 units; …", where 8 is alliesOfElement alone, not the 4-primitive union. So accept a
  // claim matching the union OR any single constituent; only flag what matches nothing.
  const validCounts = new Set<number>([
    anyUser.size,
    ...row.prims.map((p) => new Set([...usersOf(p), ...charDataUsers(p)]).size),
  ]);
  for (const m of row.users.matchAll(/(?<!~)\b(\d+) units\b/g)) {
    const claimed = Number(m[1]);
    if (!validCounts.has(claimed)) {
      problems.push(
        `STATE.md §5: cell claims "${claimed} units" for ` +
          `${row.prims.map((p) => `\`${p}\``).join(' / ')} but the tree has ${anyUser.size}` +
          `\n      row: ${row.line}…\n      fix by hand (counts are prose), or write "~${anyUser.size} units"` +
          ` / link the generated census in engine-modeling-gaps.md`
      );
    }
  }
}

if (falseMembers.length && update) {
  // Group by ROW: a row can hold several false members, and pruning them one-at-a-time against the
  // ORIGINAL row text fails after the first edit (the line no longer matches). One pass per row.
  const byRow = new Map<string, { row: Row; slugs: string[] }>();
  for (const { slug, row } of falseMembers) {
    const e = byRow.get(row.rawLine) ?? { row, slugs: [] };
    e.slugs.push(slug);
    byRow.set(row.rawLine, e);
  }
  let out = stateText;
  for (const { row, slugs: dead } of byRow.values()) {
    let cell = row.users;
    for (const slug of dead) {
      // (?![\w-]) / (?<![\w-]) so `helm` never matches inside `helm-aquamarine`
      cell = cell.replace(new RegExp(`(?<![\\w-])${slug}(?![\\w-])`, 'g'), '');
    }
    // tidy the separators the removals left behind, without touching the editorial `/` grouping
    cell = cell
      .replace(/\s*,(\s*,)+/g, ',')
      .replace(/\(\s*,\s*/g, '(')
      .replace(/\s*,\s*\)/g, ')')
      .replace(/\s*,\s*(?=\/)/g, ' ')
      .replace(/(?<=\/)\s*,\s*/g, ' ')
      .replace(/^\s*,\s*|\s*,\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const cells = row.rawLine.split('|');
    cells[3] = ` ${cell} `;
    out = out.replace(row.rawLine, cells.join('|'));
  }
  writeFileSync(STATE_MD, out);
  console.log(
    `doc-drift: pruned ${falseMembers.length} false member(s) from STATE.md §5`
  );
  for (const { slug, row } of falseMembers) {
    console.log(
      `    - ${slug} from ${row.prims.map((p) => `\`${p}\``).join('/')}`
    );
  }
} else {
  for (const { slug, row } of falseMembers) {
    problems.push(
      `STATE.md §5: "${slug}" is listed under ${row.prims.map((p) => `\`${p}\``).join(' / ')} ` +
        `but its override does not structurally reference any of them (prose mentions do not count)` +
        `\n      row: ${row.line}…\n      fix: npx tsx scripts/doc-drift.ts --update`
    );
  }
}

// ── CHECK 2: a resolved question still filed under ## UNANSWERED ─────────────────────────────
// A resolved entry left here reads as live work to every future agent and to greps.
//
// PRECISION OVER RECALL, deliberately. A naive "resolution verb anywhere in the header" rule
// false-positives on the COMMON and legitimate case of an entry whose SUB-PART resolved while the
// entry stays open — e.g. U16 "(2026-07-16; over-generation RESOLVED 2026-07-21)", where the
// worklist itself is still live. A lint that cries wolf gets ignored, and this repo's own history
// (guardrails had to become ENFORCE, not remind) says that failure mode is the expensive one. So we
// match only the two shapes that actually caused the 2026-07-22 finds:
//   (a) a top-of-body status blockquote  →  "> **CLOSED — OWNER OVERRIDE (2026-07-17).**"   [U17]
//   (b) a struck-through / superseded stub header  →  "### ~~U22~~ — MOVED TO ANSWERED …"   [U22]
const STAMP_BLOCKQUOTE = /^\s*>\s*\*\*(?:~~)?(CLOSED|RESOLVED|SUPERSEDED)\b/;
const STUB_HEADER = /~~U\d+~~|\(SUPERSEDED\b|MOVED TO ANSWERED/i;
const qText = readFileSync(QUESTIONS_MD, 'utf8');
const unanswered =
  qText.split('## UNANSWERED')[1]?.split('\n## ANSWERED')[0] ?? '';
if (!unanswered) {
  problems.push('open-questions.md: could not locate "## UNANSWERED"');
}
for (const chunk of unanswered.split(/\n(?=### )/)) {
  const lines = chunk.split('\n');
  const header = lines[0] ?? '';
  if (!header.startsWith('### ')) {
    continue;
  }
  const body = lines.slice(1).filter((l) => l.trim() !== '');
  const stamped = STUB_HEADER.test(header)
    ? 'a superseded-stub header'
    : STAMP_BLOCKQUOTE.test(body[0] ?? '')
      ? `a "${(body[0].match(STAMP_BLOCKQUOTE) as RegExpMatchArray)[1]}" status stamp`
      : null;
  if (stamped) {
    problems.push(
      `open-questions.md: "${header.slice(4, 80)}…" is filed under UNANSWERED but carries ${stamped}` +
        ` — move the settled record to docs/answered-questions.md (append-only, single U-numbering) and leave only what is genuinely open.`
    );
  }
}

// ── GENERATE: the primitive census ───────────────────────────────────────────────────────────
const censusPrims = [...new Set(rows.flatMap((r) => r.prims))].sort();
const ABBREV_OVER = 8; // keep the block readable; the count stays exact
const censusLines = [
  BEGIN,
  '',
  '| Primitive | Users | Enacted on |',
  '| --- | --- | --- |',
  ...censusPrims.map((p) => {
    const u = usersOf(p);
    const cd = charDataUsers(p);
    // char-data-sourced rows (e.g. hitsPerShot) have no override opt-in; report their real source
    if (!u.length && cd.length) {
      const shown =
        cd.length > ABBREV_OVER
          ? `${cd.slice(0, ABBREV_OVER).join(', ')}, …`
          : cd.join(', ');
      return `| \`${p}\` | ${cd.length} _(char-data)_ | ${shown} |`;
    }
    const shown =
      u.length === 0
        ? '_none_'
        : u.length > ABBREV_OVER
          ? `${u.slice(0, ABBREV_OVER).join(', ')}, …`
          : u.join(', ');
    return `| \`${p}\` | ${u.length} | ${shown} |`;
  }),
  '',
  END,
];
const census = censusLines.join('\n');

/**
 * Replace a BEGIN…END generated block in `file`, or (without --update) report it stale.
 * `label` names the block in the console/error line.
 */
const syncBlock = (
  file: URL,
  fileLabel: string,
  begin: string,
  end: string,
  label: string,
  body: string,
  freshMsg: string
) => {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(begin) || !text.includes(end)) {
    problems.push(
      `${fileLabel}: missing the generated ${label} markers. Add\n      ${begin}\n      ${end}\n      then run: npx tsx scripts/doc-drift.ts --update`
    );
    return;
  }
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc(begin)}[\\s\\S]*?${esc(end)}`);
  const current = text.match(re)![0];
  if (update) {
    if (current !== body) {
      writeFileSync(file, text.replace(re, body));
      console.log(`doc-drift: ${freshMsg}`);
    } else {
      console.log(`doc-drift: ${label} already fresh`);
    }
  } else if (current !== body) {
    problems.push(
      `${fileLabel}: the generated ${label} is STALE — run \`npx tsx scripts/doc-drift.ts --update\``
    );
  }
};

syncBlock(
  GAPS_MD,
  'engine-modeling-gaps.md',
  BEGIN,
  END,
  'primitive census',
  census,
  `census updated (${censusPrims.length} primitives)`
);

// ── GENERATE + LINT: the StatKey → damage-bucket matrix ──────────────────────────────────────
// The routing below is the WRITTEN source for "which factor of the damage product does this stat
// feed". It is read off src/engine/sim.ts (`dealDamage` / `effectiveAtk` / the economy paths) and
// kept honest by two mechanical checks:
//   (a) COVERAGE — every member of the StatKey union has exactly one entry here, and vice versa.
//       Adding a StatKey without deciding its bucket now fails the gate.
//   (b) LIVENESS — a stat routed to any factor must still be READ somewhere in sim.ts, and a stat
//       routed to `—` (inert) must NOT be. This is what catches a rewire that leaves the doc
//       describing a bucket the engine no longer feeds (and the reverse: a stat documented inert
//       that quietly gained a consumer).
// `factor` is the term of the per-instance product (damage-calculation.md §1) or the non-damage
// consumer; `how` is the composition INSIDE that factor; `gate` is when the term counts at all.
type Routing = { factor: string; how: string; gate: string };
const INERT = '—';
// Display order of the factors: the damage product left-to-right, then non-damage consumers.
const FACTOR_ORDER = [
  'FinalATK',
  'Major (crit)',
  'Major (core)',
  'Element',
  'Charge',
  'DamageUp',
  'seqMult',
  'Taken',
  'Distributed',
  'rate%',
  'Max HP',
  'Ammo',
  'Reload',
  'Fire cadence',
  'Charge time',
  'Core geometry',
  'Burst gauge',
  'Skill cooldown',
  'New instance',
  INERT,
];
const BUCKET_ROUTING: Record<string, Routing> = {
  // ---- FinalATK ----
  atkPct: {
    factor: 'FinalATK',
    how: '`staticAtk × (1 + Σ/100)` — dilutes against other ATK ▲%',
    gate: 'always',
  },
  casterAtkPct: {
    factor: 'FinalATK',
    how: 'flat ATK add, resolved at apply to `caster.staticAtk × %` — does NOT dilute',
    gate: 'always',
  },
  highestAllyAtkPct: {
    factor: 'FinalATK',
    how: 'flat ATK add of `max(all staticAtk) × %` at apply; stored as `casterAtkPct`',
    gate: 'always',
  },
  atkOfMaxHpPct: {
    factor: 'FinalATK',
    how: 'flat ATK add of `% × liveMaxHp`, **re-read every frame**',
    gate: 'always',
  },
  atkOfCasterMaxHpPct: {
    factor: 'FinalATK',
    how: "flat ATK add of `% × caster's liveMaxHp` snapshotted at apply; stored as `casterAtkPct`",
    gate: 'always',
  },
  // ---- Major ----
  critRatePct: {
    factor: 'Major (crit)',
    how: 'additive pp into `critRate`, clamped 0..1',
    gate: 'crit-eligible instances',
  },
  critRateNormalPct: {
    factor: 'Major (crit)',
    how: 'additive pp into `critRate`, alongside `critRatePct`',
    gate: "`category === 'normal'` only",
  },
  critDamagePct: {
    factor: 'Major (crit)',
    how: 'additive pp into `critBonus` (base `(critDamage−100)/100`)',
    gate: 'crit-eligible instances',
  },
  coreDamagePct: {
    factor: 'Major (core)',
    how: 'additive pp into `coreBonus`, together with the doll core line',
    gate: 'core-eligible instances × `coreExposure × ACR`',
  },
  // ---- Element ----
  elementDamagePct: {
    factor: 'Element',
    how: 'additive pp on the 1.1 advantage base',
    gate: 'elemental advantage only',
  },
  elemAdvantageDamagePct: {
    factor: 'Element',
    how: 'additive pp on the 1.1 base (`ELEMADV=damageup` reroutes it to DamageUp — A/B arm only)',
    gate: 'elemental advantage only',
  },
  // ---- Charge ----
  chargeDamagePct: {
    factor: 'Charge',
    how: 'flat percentage points added AFTER the base term',
    gate: 'charge instances only',
  },
  chargeDamageMultPct: {
    factor: 'Charge',
    how: 'scales the BASE charge term (`baseCharge × %`), like the doll/collection lines',
    gate: 'charge instances only',
  },
  // ---- DamageUp ----
  attackDamagePct: {
    factor: 'DamageUp',
    how: 'additive pp — the unflavored member every instance reads',
    gate: 'always',
  },
  sustainedDamagePct: {
    factor: 'DamageUp',
    how: 'additive pp',
    gate: 'sustained-flavored instances',
  },
  sequentialDamagePct: {
    factor: 'DamageUp',
    how: 'additive pp (dilutes — distinct mechanic from `sequentialMultPct`)',
    gate: 'sequential-flavored instances',
  },
  trueDamagePct: {
    factor: 'DamageUp',
    how: 'additive pp',
    gate: 'true-flavored instances',
  },
  pierceDamagePct: {
    factor: 'DamageUp',
    how: 'additive pp',
    gate: 'Pierce-tagged shots (`hasPierce` / live `gainPierce` / per-shot tag)',
  },
  projectileExplosionPct: {
    factor: 'DamageUp',
    how: 'additive pp, flavor-scoped',
    gate: 'explosion-flavored hits **plus RL normal attacks** (`projExplOnRlNormals`, default on)',
  },
  projectileAttachmentPct: {
    factor: 'DamageUp',
    how: 'additive pp, flavor-scoped',
    gate: 'attachment-flavored hits only',
  },
  // ---- own bucket / boss-side ----
  sequentialMultPct: {
    factor: 'seqMult',
    how: 'its OWN multiplicative bucket `1 + Σ/100` — never dilutes',
    gate: 'sequential-flavored instances',
  },
  damageTakenPct: {
    factor: 'Taken',
    how: 'additive pp; lives on the ENEMY buff list, not on a unit',
    gate: 'requires an `enemy`-targeted buff (any other target silently drops)',
  },
  distributedDamagePct: {
    factor: 'Distributed',
    how: 'TWO consumers by buff target: on a unit → `Distributed = 1 + Σ/100`; on the ENEMY → joins `Taken`, and only while a Damage-Taken ▲ is live',
    gate: 'distributed-flavored instances',
  },
  // ---- rate% / stat economy (not buckets) ----
  normalAttackPct: {
    factor: 'rate%',
    how: 'scales the normal-attack multiplier (with the doll SMG/SG line); bypassed while consolidating',
    gate: 'normal attacks only',
  },
  extraHitDamagePct: {
    factor: 'New instance',
    how: "spawns a per-pull rider hit of `value × hitsPerShot` %ATK — `category:'burst'`, crits (`RIDERCRIT`), never cores/ranges",
    gate: 'per trigger pull',
  },
  pelletCountFlat: {
    factor: 'rate%',
    how: 'flat add to the SG effective pellet count (damage only — per-trigger gauge is NOT pumped)',
    gate: 'SG, swap-off',
  },
  maxAmmoPct: {
    factor: 'Ammo',
    how: 'additive pp with the doll ammo line in `maxAmmo()`',
    gate: 'always',
  },
  maxAmmoFlat: {
    factor: 'Ammo',
    how: 'flat rounds added on top of the percentage scaling',
    gate: 'always',
  },
  reloadSpeedPct: {
    factor: 'Reload',
    how: 'SUBTRACTIVE on reload frames (`× (1 − Σ/100)`, +13-frame tail)',
    gate: 'always',
  },
  reloadSpeedClamp: {
    factor: 'Reload',
    how: 'OVERRIDES additive `reloadSpeedPct`; most recent active clamp wins',
    gate: 'when a clamp buff is active',
  },
  reloadTimeClamp: {
    factor: 'Reload',
    how: 'OVERRIDES both base reload frames and `reloadSpeedPct`; fixed seconds',
    gate: 'when a clamp buff is active',
  },
  attackSpeedPct: {
    factor: 'Fire cadence',
    how: 'ADDS with `fireRatePct` into one `speedMult` (MG ladder + ordinary cadence)',
    gate: 'always',
  },
  fireRatePct: {
    factor: 'Fire cadence',
    how: 'same consumer as `attackSpeedPct` — two names, one sum',
    gate: 'always',
  },
  chargeSpeedPct: {
    factor: 'Charge time',
    how: 'SUBTRACTIVE on charge frames, capped at 100%, floor 1 frame',
    gate: 'charge weapons',
  },
  chargeTimeClamp: {
    factor: 'Charge time',
    how: 'OVERRIDES additive `chargeSpeedPct`; fixed seconds, also accepted as a `weaponSwap` field',
    gate: 'charge weapons',
  },
  hitRatePct: {
    factor: 'Core geometry',
    how: 'shrinks the accuracy circle → raises ACR (`acrForHR`); no damage bucket of its own',
    gate: 'AR/SMG/SG core rolls (`HRCORE`/UNIGEO)',
  },
  burstGenPct: {
    factor: 'Burst gauge',
    how: 'kit buffs multiply as `(1 + Σ/100)`; cube/OL-sourced burst-gen is a SEPARATE `burstGenMult` factor, so the two multiply rather than add',
    gate: 'always',
  },
  skillCooldownReductionSec: {
    factor: 'Skill cooldown',
    how: 'shortens the effective period of `interval`-trigger blocks while the buff is live',
    gate: 'interval-trigger skills on the buff holder',
  },
  // ---- Max HP grants (feed FinalATK only via the atkOfMaxHpPct readers) ----
  casterMaxHpPct: {
    factor: 'Max HP',
    how: 'flat Max HP grant of `caster.maxHp × %`, stored as `maxHpFlat`',
    gate: 'feeds an ATK conversion only when self-granted (e3 rule)',
  },
  targetMaxHpPct: {
    factor: 'Max HP',
    how: "flat Max HP grant of the TARGET's own `maxHp × %`, stored as `maxHpFlat`",
    gate: 'feeds an ATK conversion only when self-granted (e3 rule)',
  },
  highestAllyMaxHpPct: {
    factor: 'Max HP',
    how: 'flat Max HP grant of `max(all maxHp) × %` at apply, stored as `maxHpFlat`',
    gate: 'feeds an ATK conversion only when self-granted (e3 rule)',
  },
  maxHpPct: {
    factor: 'Max HP',
    how: 'converted at build time to a `maxHpFlat` SELF-grant (Vigor cube path); no kit carrier',
    gate: 'feeds the holder’s own ATK conversion',
  },
  // ---- parsed, deliberately inert ----
  partsDamagePct: {
    factor: INERT,
    how: 'parsed and stored, read by NOTHING — the scope-lock boss is partless',
    gate: 'never',
  },
  defPct: {
    factor: INERT,
    how: 'parsed and stored, read by NOTHING — own DEF does not enter own damage',
    gate: 'never',
  },
};

// (a) COVERAGE — the StatKey union vs the routing map.
// Union members are the only lines in the block that OPEN with `| '…'`; continuation comment lines
// (which contain apostrophes and quoted kit text) can never match that anchor.
const typesText = readFileSync(TYPES_TS, 'utf8');
const statKeyBlock =
  typesText.split('export type StatKey =')[1]?.split(/^\S/m)[0] ?? '';
const statKeys = [...statKeyBlock.matchAll(/^\s*\|\s*'([A-Za-z]+)'/gm)].map(
  (m) => m[1]
);
if (statKeys.length < 20) {
  problems.push(
    `types.ts: could not parse the StatKey union (got ${statKeys.length} members) — the damage-bucket matrix cannot be checked`
  );
}
for (const k of statKeys) {
  if (!BUCKET_ROUTING[k]) {
    problems.push(
      `damage-bucket-matrix: StatKey \`${k}\` has no BUCKET_ROUTING entry — decide which factor of the damage product it feeds (or mark it inert) in scripts/doc-drift.ts`
    );
  }
}
for (const k of Object.keys(BUCKET_ROUTING)) {
  if (!statKeys.includes(k)) {
    problems.push(
      `damage-bucket-matrix: BUCKET_ROUTING lists \`${k}\`, which is no longer a StatKey — drop the entry`
    );
  }
}
for (const r of Object.values(BUCKET_ROUTING)) {
  if (!FACTOR_ORDER.includes(r.factor)) {
    problems.push(
      `damage-bucket-matrix: unknown factor "${r.factor}" — add it to FACTOR_ORDER`
    );
  }
}

// (b) LIVENESS — a routed stat must still be read by the engine; an inert one must still be unread.
const simText = readFileSync(SIM_TS, 'utf8');
for (const [k, r] of Object.entries(BUCKET_ROUTING)) {
  const readBySim = simText.includes(`'${k}'`);
  if (r.factor === INERT && readBySim) {
    problems.push(
      `damage-bucket-matrix: \`${k}\` is documented INERT but sim.ts now reads it — give it a factor`
    );
  }
  if (r.factor !== INERT && !readBySim) {
    problems.push(
      `damage-bucket-matrix: \`${k}\` is routed to "${r.factor}" but sim.ts reads it nowhere — the routing is stale`
    );
  }
}

/**
 * Units whose override applies a BUFF of StatKey `key`.
 *
 * Deliberately NOT `usersOf` (the bare quoted-token matcher the primitive census uses): several
 * StatKey spellings are also FIELD NAMES elsewhere in the schema, so the loose match over-counts
 * badly — `atkPct` is the coefficient field on every `flatDamage` effect, which inflated its
 * carrier count by half the roster. `structural` is re-stringified with JSON.stringify, so key
 * and value are always adjacent with no whitespace and this anchor is exact.
 */
const statCarriers = (key: string): string[] =>
  slugs.filter((s) => structural.get(s)!.includes(`"stat":"${key}"`));

const bucketRows = [...statKeys].sort((a, b) => {
  const fa = FACTOR_ORDER.indexOf(BUCKET_ROUTING[a]?.factor ?? INERT);
  const fb = FACTOR_ORDER.indexOf(BUCKET_ROUTING[b]?.factor ?? INERT);
  return fa - fb || a.localeCompare(b);
});
const bucketLines = [
  BUCKET_BEGIN,
  '',
  '| StatKey | Factor | Composition | Applies to | Carriers | Enacted on |',
  '| --- | --- | --- | --- | --- | --- |',
  ...bucketRows.map((k) => {
    const r = BUCKET_ROUTING[k] ?? { factor: '?', how: '?', gate: '?' };
    const u = statCarriers(k);
    const shown =
      u.length === 0
        ? '_none_'
        : u.length > ABBREV_OVER
          ? `${u.slice(0, ABBREV_OVER).join(', ')}, …`
          : u.join(', ');
    return `| \`${k}\` | ${r.factor} | ${r.how} | ${r.gate} | ${u.length} | ${shown} |`;
  }),
  '',
  BUCKET_END,
];

syncBlock(
  BUCKET_MD,
  'damage-bucket-matrix.md',
  BUCKET_BEGIN,
  BUCKET_END,
  'stat-bucket matrix',
  bucketLines.join('\n'),
  `stat-bucket matrix updated (${statKeys.length} StatKeys)`
);

// ── report ───────────────────────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error(`\ndoc-drift: ${problems.length} problem(s)\n`);
  for (const p of problems) {
    console.error(`  ✗ ${p}`);
  }
  console.error('');
  process.exit(1);
}
console.log(
  `doc-drift: ok (${censusPrims.length} primitives censused across ${slugs.length} overrides; ` +
    `${rows.length} STATE.md §5 rows checked)`
);
