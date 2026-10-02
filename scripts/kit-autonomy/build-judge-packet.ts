// build-judge-packet.ts — assemble the S7 RECONCILING-JUDGE packet for one unit.
//
//   npx tsx scripts/kit-autonomy/build-judge-packet.ts <slug> [--notes <file.md>]
//
// Concatenates, in the order the driver definition prescribes (.qwen/agents/kit-gauntlet-driver.md
// "S7 judge packet assembly"): (1) the judge contract; (2) the mechanics SSOT pair; (3) GROUND TRUTH
// (the unit's kit prose + base stats from scripts/blind-rebuild/char-extracts/<slug>.json); (4) the
// S2b review(s) — reviews/<slug>.test-review.json plus any reviews/<slug>.test-review-<family>.json
// second-reviewer file (Tier 2); (5) the S5 blind test + spec; (6) the S6 blind override + audit +
// a block-level diff vs the driver override; (7) the driver's implementation — the spec test and
// the shipped override; (8) the S2d verification matrix (reviews/<slug>.verify.txt) and an optional
// driver-notes file (convergence run results, engine-order findings the blind roles could not see).
//
// Writes scripts/kit-autonomy/cross-family/<slug>/s7-packet.md (dispatch it with dispatch-kimi.sh /
// dispatch-claude.sh) and mirrors it to results/<slug>-judge-packet.md, the committed evidence copy.
// The judge is NOT blind (it grades artifacts), so no redaction runs here.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
if (!slug) {
  console.error(
    'usage: build-judge-packet.ts <slug> [--notes <driver-notes.md>]'
  );
  process.exit(1);
}
const notesIdx = argv.indexOf('--notes');
const notesPath = notesIdx >= 0 ? argv[notesIdx + 1] : undefined;

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const optional = (rel: string) =>
  existsSync(join(ROOT, rel)) ? read(rel) : undefined;
const fence = (lang: string, body: string) =>
  '```' + lang + '\n' + body.replace(/\n$/, '') + '\n```\n';

// ---- 3. ground truth -----------------------------------------------------------------------
interface Extract {
  slug: string;
  name: string;
  weapon: string;
  burst: string;
  class: string;
  element: string;
  manufacturer: string | null;
  burstCooldownSec: number;
  ammo: number;
  reloadFrames: number;
  chargeFrames: number;
  chargeMultiplier: number;
  hitsPerShot: number;
  normalAttackMultiplier: number;
  coreAttackMultiplier: number;
  skillCooldownsSec?: Record<string, number | null>;
  skills: { skill1: string; skill2: string; burst: string };
}
type Block = Record<string, unknown>;
type Override = Record<string, unknown> & {
  skill1?: Block[];
  skill2?: Block[];
  burst?: Block[];
};
const extract = JSON.parse(
  read(`scripts/blind-rebuild/char-extracts/${slug}.json`)
) as Record<string, Extract>;
const u = extract[slug] ?? Object.values(extract)[0];
const base = {
  slug: u.slug,
  name: u.name,
  weapon: u.weapon,
  burst: u.burst,
  class: u.class,
  element: u.element,
  manufacturer: u.manufacturer,
  burstCooldownSec: u.burstCooldownSec,
  ammo: u.ammo,
  reloadFrames: u.reloadFrames,
  chargeFrames: u.chargeFrames,
  chargeMultiplier: u.chargeMultiplier,
  hitsPerShot: u.hitsPerShot,
  normalAttackMultiplier: u.normalAttackMultiplier,
  coreAttackMultiplier: u.coreAttackMultiplier,
  skillCooldownsSec: u.skillCooldownsSec,
};

// ---- 4. S2b review(s) ----------------------------------------------------------------------
const s2bMain = JSON.parse(
  read(`scripts/kit-autonomy/reviews/${slug}.test-review.json`)
) as { model?: string };
const s2bSecond = optional(
  `scripts/kit-autonomy/reviews/${slug}.test-review-opus.json`
);
const s2bSecondJson = s2bSecond
  ? (JSON.parse(s2bSecond) as { model?: string })
  : undefined;

// ---- 5/6. blind artifacts ------------------------------------------------------------------
const blindTest = read(`scripts/kit-autonomy/blind/${slug}.test.ts`);
const blindSpec = optional(`scripts/kit-autonomy/blind/${slug}.test-spec.json`);
const blindOverride = JSON.parse(
  read(`scripts/kit-autonomy/blind/${slug}.override.json`)
) as Override;
const blindAudit = optional(`scripts/kit-autonomy/blind/${slug}.audit.json`);
const blindModelOf = (rel: string) => {
  const j = optional(rel);
  return j
    ? ((JSON.parse(j) as { model?: string }).model ?? 'unknown')
    : 'unknown';
};

// ---- 7. driver implementation --------------------------------------------------------------
const driverOverride = JSON.parse(
  read(`src/skills/overrides/${slug}.json`)
) as Override;
const driverTest = read(`scripts/tests/units/${slug}.test.ts`);

// block-level diff: driver vs blind, per slot
const blockKey = (b: Block) =>
  JSON.stringify({
    trigger: b.trigger,
    target: b.target,
    effects: b.effects,
    gates: {
      fbGate: b.fbGate,
      ownBurstGate: b.ownBurstGate,
      swapGate: b.swapGate,
      delaySec: b.delaySec,
      bossElementGate: b.bossElementGate,
      everyN: b.everyN,
      requiresCore: b.requiresCore,
    },
  });
const diffLines: string[] = [];
for (const slot of ['skill1', 'skill2', 'burst'] as const) {
  const driverKeys = (driverOverride[slot] ?? []).map(blockKey);
  const blindKeys = (blindOverride[slot] ?? []).map(blockKey);
  const onlyDriver = driverKeys.filter((k) => !blindKeys.includes(k));
  const onlyBlind = blindKeys.filter((k) => !driverKeys.includes(k));
  const shared = driverKeys.filter((k) => blindKeys.includes(k)).length;
  diffLines.push(
    `### ${slot}: ${shared} identical block(s); ${onlyDriver.length} driver-only; ${onlyBlind.length} blind-only`
  );
  for (const k of onlyDriver) {
    diffLines.push(`- DRIVER ONLY: ${k}`);
  }
  for (const k of onlyBlind) {
    diffLines.push(`- BLIND ONLY: ${k}`);
  }
}

// ---- 8. S2d matrix + driver notes ----------------------------------------------------------
const verify = optional(`scripts/kit-autonomy/reviews/${slug}.verify.txt`);
const notes = notesPath ? readFileSync(notesPath, 'utf8') : undefined;

const s2bModel = s2bMain.model ?? 'unknown';
const s5Model = blindModelOf(
  `scripts/kit-autonomy/cross-family/${slug}/s5-result.json`
);
const s6Model = blindModelOf(
  `scripts/kit-autonomy/cross-family/${slug}/s6-result.json`
);

const parts: string[] = [];
parts.push(
  `# S7 RECONCILING-JUDGE PACKET — \`${slug}\` (${u.name}, ${u.weapon}/${u.class}/${u.element}/Burst ${u.burst})\n`
);
parts.push(
  `Built ${new Date().toISOString().slice(0, 10)} by scripts/kit-autonomy/build-judge-packet.ts. Sections: 1 contract · 2 mechanics SSOT · 3 ground truth · 4 S2b review(s) · 5 S5 blind test · 6 S6 blind override · 7 driver implementation · 8 S2d matrix + driver notes.\n`
);
parts.push(
  `## 1. YOUR CONTRACT (role template, verbatim)\n\n${read('scripts/kit-autonomy/RECONCILING-JUDGE.md')}\n`
);
parts.push(
  `## 2. MECHANICS SSOT (damage formula + game mechanics)\n\n${read('docs/data/damage-calculation.md')}\n\n${read('docs/data/game-mechanics.md')}\n`
);
parts.push(
  `## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, verbatim)\n\n${fence('json', JSON.stringify(base, null, 2))}\n### skill1\n\n${fence('text', u.skills.skill1)}\n### skill2\n\n${fence('text', u.skills.skill2)}\n### burst\n\n${fence('text', u.skills.burst)}\n`
);
parts.push(
  `## 4. S2b TEST-FAITHFULNESS REVIEW (${s2bModel}, blind — written BEFORE the driver's tests were shown to it)\n\n${fence('json', JSON.stringify(s2bMain, null, 2))}\n`
);
if (s2bSecondJson) {
  parts.push(
    `### 4b. Second S2b reviewer (${s2bSecondJson.model ?? 'unknown'}, blind — Tier-2 ×2 models)\n\n${fence('json', JSON.stringify(s2bSecondJson, null, 2))}\n`
  );
}
parts.push(
  `## 5. S5 BLIND TEST-WRITER (${s5Model}, blind — written from the prose alone)\n\n### 5a. blind spec\n\n${blindSpec ? fence('json', blindSpec) : '(no spec file)\n'}\n### 5b. blind test source (VERBATIM — mechanical defects preserved; see section 8 for the run against the driver's override)\n\n${fence('ts', blindTest)}\n`
);
parts.push(
  `## 6. S6 BLIND OVERRIDE-WRITER (${s6Model}, blind — kit-parse BLIND-STUDY)\n\n### 6a. blind override\n\n${fence('json', JSON.stringify(blindOverride, null, 2))}\n### 6b. blind audit + flags\n\n${blindAudit ? fence('json', blindAudit) : '(no audit file)\n'}\n### 6c. block-level diff — DRIVER vs BLIND override\n\n${diffLines.join('\n')}\n`
);
parts.push(
  `## 7. THE DRIVER'S IMPLEMENTATION\n\n### 7a. src/skills/overrides/${slug}.json\n\n${fence('json', JSON.stringify(driverOverride, null, 2))}\n### 7b. scripts/tests/units/${slug}.test.ts\n\n${fence('ts', driverTest)}\n`
);
parts.push(
  `## 8. S2d INDEPENDENT VERIFICATION MATRIX + DRIVER NOTES\n\n### 8a. S2d matrix (scripts/kit-autonomy/reviews/${slug}.verify.txt)\n\n${verify ? fence('text', verify) : '(no verify.txt)\n'}\n${notes ? `### 8b. Driver notes (convergence run + findings the blind roles could not see)\n\n${notes}\n` : ''}`
);

const out = parts.join('\n');
const outDir = join(ROOT, 'scripts', 'kit-autonomy', 'cross-family', slug);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 's7-packet.md'), out);
writeFileSync(
  join(ROOT, 'scripts', 'kit-autonomy', 'results', `${slug}-judge-packet.md`),
  out
);
console.log(
  `✓ wrote cross-family/${slug}/s7-packet.md + results/${slug}-judge-packet.md (${out.length} bytes; S2b ${s2bModel}${s2bSecondJson ? ' + ' + s2bSecondJson.model : ''}, S5 ${s5Model}, S6 ${s6Model})`
);
