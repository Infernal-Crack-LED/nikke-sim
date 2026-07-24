// prepare-cross-family-packet.ts — Qwen-side model-router automation for the kit-autonomy gauntlet.
//
// Builds DE-CONTAMINATED blind packets for the cross-family blind roles (S2b/S5/S6) per
// scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md: redacts the effect schema (types.ts comments name specific
// units — the D12 leak) + the methodology of any line naming the TARGET, assembles each role's packet, runs
// the MANDATORY leak assertion (mirrors build-packet.ts), and writes the packets + a REQUEST.md for the other
// model family to run. S7 (the judge) is NOT de-contaminated — it grades the driver's artifacts, so it uses the
// full judge-packet pattern (results/judge-packet.md), not this script.
//
//   npx tsx scripts/kit-autonomy/prepare-cross-family-packet.ts <slug> --tokens "256.17,1687,Designated Target" [--roles s2b,s5,s6]
//
// `--tokens` = the target's ANSWER TOKENS (signature magnitudes + mechanic names) that must not appear outside
// the kit-prose block. The driver supplies them (it knows the kit). The kit prose itself legitimately contains
// them and is excluded from the leak check.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

function fail(msg: string): never {
  console.error(`\n❌ LEAK/ERROR: ${msg}`);
  process.exit(1);
}

// ---- args -------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
const getOpt = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
if (!slug)
  fail(
    'usage: prepare-cross-family-packet.ts <slug> --tokens "t1,t2,..." [--roles s2b,s5,s6]',
  );
const tokens = (getOpt('tokens') ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);
const roles = (getOpt('roles') ?? 's2b').split(',').map((r) => r.trim());
if (tokens.length === 0)
  fail(
    "--tokens is required (the target's signature magnitudes + mechanic names)",
  );

const TEMPLATE: Record<string, string> = {
  s2b: 'TEST-FAITHFULNESS-REVIEW.md',
  s5: 'BLIND-TEST-WRITER.md',
  s6: 'BLIND-OVERRIDE-WRITER.md',
};

// ---- leak check (case-insensitive substring search) -------------------------------------------
// `includeSlug=false` for the assembled-packet check: the kit prose legitimately names the unit (it is the
// input), so the slug may appear in the header/prose. The thing that must NOT appear outside the prose block is
// the ANSWER TOKENS (signature magnitudes + mechanic names) — those would hand the reviewer the encoding
// decision without deriving it from the prose. Component checks (schema/methodology/template) keep includeSlug
// true: those parts must not name the target at all.
function leakCheck(label: string, text: string, includeSlug = true) {
  const lower = text.toLowerCase();
  const needles = includeSlug
    ? [slug!.toLowerCase(), ...tokens.map((t) => t.toLowerCase())]
    : tokens.map((t) => t.toLowerCase());
  const hits = needles.filter((tok) => lower.includes(tok));
  if (hits.length)
    fail(
      `${label} still contains target token(s): ${hits.join(', ')} — redaction incomplete`,
    );
}

// ---- 1. kit prose (legitimate input; excluded from the leak check) ----------------------------
const extractPath = join(
  ROOT,
  'scripts',
  'blind-rebuild',
  'char-extracts',
  `${slug}.json`,
);
const extract = JSON.parse(readFileSync(extractPath, 'utf8'));
const unit = extract[slug] ?? Object.values(extract)[0];
const u = unit as any;
const prose = `=== KIT PROSE (legitimate input — ground truth; the answer tokens appear HERE by design) ===
Unit: ${u.name} (${u.slug})
Base: ${u.weapon}/${u.element}/${u.class}/Burst ${u.burst}, cd ${u.burstCooldownSec}s, ammo ${u.ammo}, reloadFrames ${u.reloadFrames}, chargeFrames ${u.chargeFrames}, hitsPerShot ${u.hitsPerShot}, normalAttackMultiplier ${u.normalAttackMultiplier}, coreAttackMultiplier ${u.coreAttackMultiplier}.

skill1:
${u.skills.skill1}

skill2:
${u.skills.skill2}

burst:
${u.skills.burst}
=== END KIT PROSE ===`;

// ---- 2. redacted schema (strip lines naming the target) ---------------------------------------
const schemaLines = readFileSync(
  join(ROOT, 'src', 'skills', 'types.ts'),
  'utf8',
).split('\n');
const redactedSchema = schemaLines
  .filter((l) => {
    const low = l.toLowerCase();
    return (
      !low.includes(slug.toLowerCase()) &&
      !tokens.some((t) => low.includes(t.toLowerCase()))
    );
  })
  .join('\n');
leakCheck('redacted schema (types.ts)', redactedSchema);

// ---- 3. redacted methodology (strip lines naming the target) ----------------------------------
const methLines = readFileSync(
  join(HERE, 'redacted-methodology.md'),
  'utf8',
).split('\n');
const redactedMeth = methLines
  .filter((l) => !l.toLowerCase().includes(slug.toLowerCase()))
  .join('\n');
leakCheck('redacted methodology', redactedMeth);

// ---- 4. assemble + leak-assert each role packet -----------------------------------------------
const outDir = join(HERE, 'cross-family', slug);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'types-redacted.ts'), redactedSchema);

const harnessNote = `=== HARNESS API (scripts/tests/lib/harness.ts) ===
controlComp(carry, helm?=true) → CompOptions (liter B1 / crown B2 / carry B3 / helm B3, boss Fire, focus carry).
runComp(opts) → SimResult (deterministic, no seed). totals(res); unitOf(res, slug).
withPatchedOverride(slug, mutate) → in-memory override clone (committed JSON untouched).
cfg.onEvent: (ev) => void — kinds shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/fullBurstEnd;
damage carries bucket, srcSlot, crit/core rates, inFullBurst, fbMajorApplied, rangeApplied, mult.
NOTE: boss-held debuffs emit buffApply with casterIdx===null AND targetIdx===null — filter them by stat+value.`;

const requestLines: string[] = [
  `# Cross-family review REQUEST — \`${slug}\``,
  ``,
  `Driver model family: **(fill in — e.g. Qwen)**. Requested reviewer family: **the OTHER family (e.g. Claude)**.`,
  `Run each packet UNMODIFIED on a model of the requested family; write the result JSON to the path below.`,
  `Protocol: scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md. Leak assertion passed on every packet at build time.`,
  ``,
  `| Role | Packet | Result contract | Write result to |`,
  `| --- | --- | --- | --- |`,
];

for (const role of roles) {
  if (role === 's7') {
    console.log(
      `note: ${role} is the judge — NOT de-contaminated; build the full judge-packet (results/judge-packet.md pattern) instead.`,
    );
    continue;
  }
  const tmplFile = TEMPLATE[role];
  if (!tmplFile)
    fail(
      `unknown role '${role}' (expected s2b/s5/s6; s7 uses the judge-packet pattern)`,
    );
  const template = readFileSync(join(HERE, tmplFile), 'utf8');
  leakCheck(`template ${tmplFile}`, template);

  const packet = `# CROSS-FAMILY BLIND PACKET — role ${role} — unit ${slug}
# Built by prepare-cross-family-packet.ts. De-contaminated + leak-asserted at build time.
# Run UNMODIFIED on a model of the OTHER family; do NOT consult the driver's test/override/reasoning.

${template}

${prose}

${redactedMeth}

${harnessNote}

=== REDACTED EFFECT SCHEMA (types.ts, target-naming comments stripped) ===
${redactedSchema}
`;
  // Final whole-packet leak check OUTSIDE the prose block: strip the prose, then search.
  const nonProse =
    packet.split('=== KIT PROSE')[0] + packet.split('=== END KIT PROSE ===')[1];
  leakCheck(`assembled ${role} packet (outside prose)`, nonProse, false);

  const packetPath = join(outDir, `${role}-packet.md`);
  writeFileSync(packetPath, packet);
  console.log(`✓ ${role}-packet.md  (${packet.length} bytes, leak-clean)`);
  requestLines.push(
    `| ${role} | cross-family/${slug}/${role}-packet.md | ${tmplFile.replace('.md', '')} output contract | cross-family/${slug}/${role}-result.json |`,
  );
}

writeFileSync(join(outDir, 'REQUEST.md'), requestLines.join('\n') + '\n');
console.log(
  `\n✓ wrote ${outDir.replace(ROOT + '/', '')}/{${roles.filter((r) => r !== 's7').join(', ')}-packet.md, types-redacted.ts, REQUEST.md}`,
);
console.log(
  `Next: the OTHER model family runs each packet and writes <role>-result.json; the driver reconciles into the verdict.`,
);
