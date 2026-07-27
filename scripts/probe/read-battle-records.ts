// Battle-Records screenshot reader — per-unit totals off the end-of-fight screen.
//
// VLM, not OCR, and deliberately so: this screen is sampled ONCE per probe (not 190x), it is static
// and high-contrast, and its content is SEMANTIC (per-unit rows in team-slot order, four
// icon-labelled fields). That is what a VLM is good at, and installing an OCR engine to read one
// screenshot per probe is not worth the dependency.
//
// WHAT MAKES IT TRUSTWORTHY IS ARITHMETIC, NOT A SECOND OPINION: the per-unit damage totals must
// sum to the final cumulative team total, which `read-total-damage.ts` measures independently off
// the in-fight running total. If the sum closes, the read is confirmed for free. (Re-running a VLM
// is NOT a confirmation route — two runs over one video agreed 190/190 including their mistakes.)
//
//   npx tsx scripts/probe/read-battle-records.ts <screenshot> [opts]
//     --comp <slugs>          comma-separated team slugs in SLOT order — attaches slugs to rows
//     --expect-total <n>      cumulative team total for the checksum
//     --total-damage <path>   ...or a total-damage.json to take the final cumulative from
//     --endpoint <url>        OpenAI-compatible base (default http://localhost:8090/v1)
//     --model <name>          default qwen2.5-vl
//     --tolerance <pct>       checksum tolerance in percent (default 1)
//     --out <dir>             default $CLAUDE_SCRATCH|/tmp/battle-records
//
// FIELD MAP — HARD-CODED, because misreading it caused a phantom "13% ATK confound" (2026-07-15):
//   crossed swords (⚔) = COMBAT POWER, a per-unit composite of stats+skills. NEVER Combat ATK.
//   red bar = total damage dealt · shield = damage taken · asterisk = healing done.
// ATK is CLASS-BASED (same class => identical ATK, data/reference-stats.json), so a per-unit
// varying number cannot be ATK by definition. The reader asserts this invariant on the CP column
// and refuses to emit an `atk` field at all.
//
// Output: <out>/battle-records.json
//   { screenshot, units[{slot, slug?, name, level, combatPower, totalDamage, damageTaken, healing}],
//     checksum{sum, cumulativeTotal, deltaPct, pass}, warnings[] }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const shot = argv[0];
const flags: Record<string, string> = {};
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    flags[argv[i].slice(2)] =
      argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined
        ? 'true'
        : argv[++i];
  }
}

if (!shot || !existsSync(shot)) {
  console.error(
    'usage: read-battle-records.ts <screenshot> [--comp a,b,c] [--expect-total N] ' +
      '[--total-damage path] [--endpoint URL] [--model NAME] [--tolerance 1] [--out DIR]'
  );
  process.exit(1);
}

const endpoint = (flags.endpoint ?? 'http://localhost:8090/v1').replace(
  /\/$/,
  ''
);
const model = flags.model ?? 'qwen2.5-vl';
const apikey = flags.apikey ?? 'no-key';
const comp =
  flags.comp && flags.comp !== 'true'
    ? flags.comp.split(',').map((s) => s.trim())
    : null;
const tolerance = Number(flags.tolerance ?? 1);
const outDir =
  flags.out ?? `${process.env.CLAUDE_SCRATCH ?? '/tmp'}/battle-records`;

let cumulativeTotal: number | null =
  flags['expect-total'] && flags['expect-total'] !== 'true'
    ? Number(flags['expect-total'])
    : null;
if (
  cumulativeTotal == null &&
  flags['total-damage'] &&
  flags['total-damage'] !== 'true'
) {
  const td = JSON.parse(readFileSync(flags['total-damage'], 'utf8')) as {
    reads: { videoT: number; totalDamage: number | null }[];
  };
  // the LAST non-null, non-zero read: the tail of the series is the post-fight screen (reads 0)
  const vals = td.reads.filter(
    (r) => r.totalDamage != null && r.totalDamage > 0
  );
  cumulativeTotal = vals.length
    ? (vals[vals.length - 1].totalDamage as number)
    : null;
}

const PROMPT = `This is the end-of-fight "Battle Records" screen from the game NIKKE.

It lists up to 5 unit rows in TEAM SLOT ORDER (top to bottom). Some rows may read "EMPTY SLOT".

Each occupied row shows:
- the unit's NAME and "LV.400"
- a crossed-swords icon with a number (this is Combat Power)
- three stacked stat rows with icons, each with a number:
    1st (bar chart icon, RED number)   = total damage dealt
    2nd (shield icon)                  = damage taken
    3rd (asterisk icon)                = healing done

Read every row EXACTLY. Numbers may contain commas — return them as plain integers with no commas.
For an empty slot, use null for name and 0 for the numbers.

Respond with ONLY this JSON (no markdown, no commentary):
{"units":[{"slot":1,"name":"...","level":400,"combatPower":0,"totalDamage":0,"damageTaken":0,"healing":0}]}`;

interface Unit {
  slot: number;
  slug?: string;
  name: string | null;
  level: number | null;
  combatPower: number | null;
  totalDamage: number;
  damageTaken: number | null;
  healing: number | null;
}

async function ask(
  prompt: string,
  b64: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apikey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${b64}` },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 900,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `VLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`
    );
  }
  const j = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  let content = j?.choices?.[0]?.message?.content ?? '';
  if (Array.isArray(content)) {
    content = content.map((c) => (c as { text?: string }).text ?? '').join('');
  }
  let s = String(content).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    s = fence[1].trim();
  }
  const a = s.indexOf('{'),
    b = s.lastIndexOf('}');
  if (a >= 0 && b > a) {
    s = s.slice(a, b + 1);
  }
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.round(v);
  }
  if (typeof v === 'string') {
    const n = Number(v.replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
};

const b64 = readFileSync(shot).toString('base64');
console.log(`reading ${shot} ...`);
let parsed: Record<string, unknown> = {};
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    parsed = await ask(PROMPT, b64);
    break;
  } catch (e) {
    if (attempt === 2) {
      console.error(`  FAILED — ${(e as Error).message}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const warnings: string[] = [];
const rows = Array.isArray(parsed.units)
  ? (parsed.units as Record<string, unknown>[])
  : [];
if (!rows.length) {
  console.error('VLM returned no rows — check the endpoint and the screenshot');
  process.exit(1);
}

const units: Unit[] = rows.map((r, i) => {
  const slot = num(r.slot) ?? i + 1;
  return {
    slot,
    slug: comp?.[slot - 1],
    name:
      typeof r.name === 'string' && r.name.trim() && !/empty/i.test(r.name)
        ? r.name.trim()
        : null,
    level: num(r.level),
    combatPower: num(r.combatPower),
    totalDamage: num(r.totalDamage) ?? 0,
    damageTaken: num(r.damageTaken),
    healing: num(r.healing),
  };
});
const occupied = units.filter((u) => u.name != null || u.totalDamage > 0);

// ---- the checksum: per-unit damage must sum to the independently-measured team total ----
const sum = occupied.reduce((s, u) => s + u.totalDamage, 0);
const deltaPct = cumulativeTotal
  ? Math.round(((sum - cumulativeTotal) / cumulativeTotal) * 10000) / 100
  : null;
const pass = deltaPct == null ? null : Math.abs(deltaPct) <= tolerance;
if (cumulativeTotal == null) {
  warnings.push(
    'NO CHECKSUM — pass --expect-total or --total-damage. Without it this is an ' +
      'unconfirmed VLM read: report it as a survey, never as a measured per-unit total.'
  );
} else if (!pass) {
  warnings.push(
    `CHECKSUM FAILED — per-unit sum ${sum.toLocaleString()} vs cumulative ` +
      `${cumulativeTotal.toLocaleString()} (${deltaPct}%). At least one row is misread; do not use these values.`
  );
}

// ---- invariants that catch the classic misreads ----
if (occupied.some((u) => u.level != null && u.level !== 400)) {
  warnings.push(
    'a row reads LV != 400 — scope-lock recordings are sync 400, so the level column was misread'
  );
}
const cps = occupied
  .map((u) => u.combatPower)
  .filter((v): v is number => v != null);
if (cps.length > 1 && new Set(cps).size === 1) {
  warnings.push(
    'every Combat Power is identical — that is the signature of ATK, not CP, so the ⚔ column was misread'
  );
}
for (const u of occupied) {
  if (u.combatPower != null && u.combatPower > 200000) {
    warnings.push(
      `slot ${u.slot} Combat Power ${u.combatPower} is implausibly large — likely a damage value read into the ⚔ column`
    );
  }
}
if (comp && comp.length !== occupied.length) {
  warnings.push(
    `--comp lists ${comp.length} slugs but ${occupied.length} rows are occupied — slot mapping is unreliable`
  );
}

const result = {
  screenshot: shot,
  model,
  fieldMap: {
    crossedSwords:
      'Combat Power (NOT ATK — ATK is class-based, see data/reference-stats.json)',
    redBar: 'total damage dealt',
    shield: 'damage taken',
    asterisk: 'healing done',
  },
  units,
  occupied: occupied.length,
  // The focused unit sits in the MIDDLE slot — a convention that only resolves for a full team.
  focusSlotByConvention: occupied.length === 5 ? 3 : null,
  checksum: { sum, cumulativeTotal, deltaPct, pass, tolerancePct: tolerance },
  warnings,
};
mkdirSync(outDir, { recursive: true });
writeFileSync(
  `${outDir}/battle-records.json`,
  JSON.stringify(result, null, 2) + '\n'
);

console.log(`\nwrote ${outDir}/battle-records.json`);
for (const u of occupied) {
  console.log(
    `  slot ${u.slot}  ${(u.slug ?? u.name ?? '?').padEnd(24)} dmg ${u.totalDamage.toLocaleString().padStart(14)}  taken ${u.damageTaken}  heal ${u.healing}  CP ${u.combatPower}`
  );
}
console.log(
  `  sum ${sum.toLocaleString()}` +
    (cumulativeTotal != null
      ? `  vs cumulative ${cumulativeTotal.toLocaleString()}  Δ ${deltaPct}%  ${pass ? 'CHECKSUM PASS' : 'CHECKSUM FAIL'}`
      : '  (no checksum)')
);
for (const w of warnings) {
  console.log(`  ⚠ ${w}`);
}
