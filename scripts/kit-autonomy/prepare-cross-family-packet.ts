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
//
// TOKEN COVERAGE (hard-won 2026-07-24): the leak assertion only catches tokens the DRIVER supplies, so an
// under-supplied list leaks. Supply BOTH the signature MAGNITUDES (e.g. "256.17") AND the signature mechanic/
// resource/status NAMES (e.g. "Designated Target", a resource-pool name) — a types.ts comment that states the
// unit's own value OR names its mechanic leaks the answer if that token is missing (soda-twinkling-bunny leaked
// the chip economy via a comment until the name was added). The script prints an advisory TOKEN HINT listing
// prose magnitudes that also appear in types.ts but are absent from --tokens. Conversely, do NOT over-redact:
// schema/methodology lines naming OTHER units are legitimate (they don't leak the target) — stripping them
// starves the blind role of vocabulary (snow-white RECON_ERROR: a trueNormals line naming another unit was
// over-redacted). Redact only lines naming the TARGET or its answer tokens.
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
if (!slug) {
  fail(
    'usage: prepare-cross-family-packet.ts <slug> --tokens "t1,t2,..." [--roles s2b,s5,s6]'
  );
}
// SHORT-SLUG FIX (2026-07-25): match the slug on a WORD BOUNDARY, not a raw substring. A 3-letter
// slug like `eve` is a substring of `event`/`level`/`never`/`every`, which a substring match treats
// as a leak — false-positiving the template/schema redaction on generic infrastructure vocabulary
// and (worse) gutting the redacted schema of every `level`/`event` line the blind role needs.
// Word-boundary matching still catches the unit NAME standing alone; tokens stay substring-matched
// (they are distinctive magnitudes/mechanic names, not common substrings).
const slugRe = new RegExp(
  '\\b' + slug.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'
);
const tokens = (getOpt('tokens') ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);
const roles = (getOpt('roles') ?? 's2b').split(',').map((r) => r.trim());
if (tokens.length === 0) {
  fail(
    "--tokens is required (the target's signature magnitudes + mechanic names)"
  );
}

const TEMPLATE: Record<string, string> = {
  s2b: 'TEST-FAITHFULNESS-REVIEW.md',
  s5: 'BLIND-TEST-WRITER.md',
  s6: 'BLIND-OVERRIDE-WRITER.md',
};

// ---- leak check (case-insensitive substring search) -------------------------------------------
// `leakCheck` is passed an explicit needle list. Component parts (schema/methodology/template) are checked
// against the FULL name set (slug + display name + safe nicknames + answer tokens) — they must not name the
// target at all. The assembled-packet-outside-prose check drops the slug (it may sit in a path/header) but
// still forbids the display name / nicknames / answer tokens outside the prose block. The kit prose itself
// legitimately names the unit and is excluded from the assembled check by the caller.
function leakCheck(label: string, text: string, needles: string[]) {
  const lower = text.toLowerCase();
  const hits = needles.filter((tok) => lower.includes(tok));
  if (hits.length) {
    fail(
      `${label} still contains target token(s): ${hits.join(', ')} — redaction incomplete`
    );
  }
}

// ---- 1. kit prose (legitimate input; excluded from the leak check) ----------------------------
const extractPath = join(
  ROOT,
  'scripts',
  'blind-rebuild',
  'char-extracts',
  `${slug}.json`
);
const extract = JSON.parse(readFileSync(extractPath, 'utf8'));
const unit = extract[slug] ?? Object.values(extract)[0];
const u = unit as any;

// De-contamination name set (hard-won 2026-07-25 bu-batch): redact + leak-check the unit's OTHER names, not just
// the slug — types.ts comments name units by display name ("Neon: Vision Eye"), nickname ("RRH"), or abbreviation
// ("Neon:VE"), none of which equal the slug, so a slug-only match leaked (rapi-red-hood "RRH", neon-vision-eye
// "Neon:VE"). Nicknames are filtered to short alnum abbreviations (3–8 chars): word/phrase nicknames
// ("idols (with prika)", "neo neon") and 2-char ones ("ra", "rh") are substring-common and would over-redact
// legitimate schema vocabulary (the snow-white RECON_ERROR class) or false-fail the leak check. Abbreviation leaks
// from the display-name stem (e.g. "Neon:VE") are surfaced ADVISORILY in the TOKEN HINT below, not hard-redacted —
// a bare stem like "red" (red-hood) is a substring of "target"/"shared" and would starve the blind role.
const safeNicknames = ((u.nicknames as string[] | undefined) ?? []).filter(
  (n) => /^[a-z0-9]{3,8}$/i.test(n)
);
const tokLower = tokens.map((t) => t.toLowerCase());
const displayNameLower = (u.name as string).toLowerCase();
const nickLower = safeNicknames.map((n) => n.toLowerCase());
// Component parts (schema/methodology/template) must not name the target AT ALL — display name + safe nicknames
// + answer tokens, plus the slug matched separately on a WORD BOUNDARY (slugRe — a short slug like `eve` is a
// substring of `event`/`level`/`never`, so it must not be a substring needle here). (The assembled-packet check
// below is tokens-only: the assembled packet includes the generic harnessNote, whose infrastructure terms collide
// with short nicknames — "removeOnReload" contains "veon" — and the packet header names the unit by slug, which
// collides with the display name for base units.)
//
// SHORT-NAME FIX (2026-08-01, mirrors the eve slug fix above): the display name + nicknames are ALSO matched on a
// WORD BOUNDARY, not a raw substring. A 3-letter display name like `rem` (Rem) is a substring of
// `MEASUREMENT`/`premise`/`requirement`/`framework`, which a substring match treats as a leak — false-positiving
// the template/schema redaction on generic vocabulary. Word-boundary matching still catches the unit NAME standing
// alone (a real leak) while letting common substrings through. Answer TOKENS stay substring-matched (they are
// distinctive magnitudes/mechanic names, not common substrings).
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameNeedles = [displayNameLower, ...nickLower];
const nameRes = nameNeedles.map((n) => new RegExp('\\b' + escapeRe(n) + '\\b'));

// Component redaction predicate: the slug OR a name needle on a word boundary, OR an answer token as a substring.
// Used to strip target-naming lines from the schema + methodology.
const namesTarget = (lower: string): boolean =>
  slugRe.test(lower) ||
  nameRes.some((re) => re.test(lower)) ||
  tokLower.some((t) => lower.includes(t));

// Component leak assertion: the slug + name needles on a word boundary, plus the answer tokens as substrings. The
// assembled-packet check uses leakCheck directly with tokLower (tokens-only).
function componentLeakCheck(label: string, text: string) {
  const lower = text.toLowerCase();
  if (slugRe.test(lower)) {
    fail(
      `${label} still names the target slug "${slug}" — redaction incomplete`
    );
  }
  const hitName = nameNeedles.filter((_, i) => nameRes[i].test(lower));
  if (hitName.length) {
    fail(
      `${label} still names the target (${hitName.join(', ')}) — redaction incomplete`
    );
  }
  leakCheck(label, text, tokLower);
}

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
  'utf8'
).split('\n');
const redactedSchema = schemaLines
  .filter((l) => {
    const low = l.toLowerCase();
    return !namesTarget(low);
  })
  .join('\n');
componentLeakCheck('redacted schema (types.ts)', redactedSchema);

// ---- 2b. TOKEN HINT (advisory — catches under-supplied --tokens) ------------------------------
// The leak assertion only catches tokens the driver supplied. If a types.ts comment states one of the unit's
// OWN magnitudes and that magnitude isn't in --tokens, the redacted schema keeps the line and leaks the answer.
// List every distinctive kit-prose magnitude (2+ decimals) that also appears in types.ts but is NOT a token, so
// the driver can add it. Advisory only (console.warn) — does not change redaction or the fail-on-leak behavior.
const schemaText = schemaLines.join('\n');
const proseMagnitudes = Array.from(new Set(prose.match(/\d+\.\d{2,}/g) ?? []));
const missingTokens = proseMagnitudes.filter(
  (m) =>
    schemaText.includes(m) &&
    !tokens.some((t) => t.includes(m) || m.includes(t))
);
if (missingTokens.length) {
  console.warn(
    `\n⚠ TOKEN HINT: these kit-prose magnitudes also appear in types.ts but are NOT in --tokens:\n  ${missingTokens.join(
      ', '
    )}\n  If a types.ts comment states one of the unit's own values, add it to --tokens so redaction strips that\n  line. Also include signature mechanic/resource/status NAMES (not just numbers). Lines naming OTHER units\n  are legitimate — do NOT over-redact them.\n`
  );
}

// Advisory: display-name stem abbreviation leak (e.g. a "Neon:VE" comment for neon-vision-eye). The bare stem is
// NOT a hard needle (over-redaction risk — "red" is a substring of "target"/"shared"), so surface it for the
// driver to add the abbreviation as a token if a types.ts comment uses it for this unit.
const baseStem = (u.name as string).includes(':')
  ? (u.name as string).split(':')[0].trim().toLowerCase()
  : '';
if (
  baseStem.length >= 4 &&
  schemaText.toLowerCase().includes(baseStem) &&
  !tokLower.some((t) => t.includes(baseStem))
) {
  console.warn(
    `\n⚠ TOKEN HINT: the display-name stem "${baseStem}" appears in types.ts — a comment may abbreviate this\n  unit (e.g. "${baseStem}:XX"). If so, add the abbreviation to --tokens so redaction strips that line.\n`
  );
}

// ---- 3. redacted methodology (strip lines naming the target) ----------------------------------
const methLines = readFileSync(
  join(HERE, 'redacted-methodology.md'),
  'utf8'
).split('\n');
const redactedMeth = methLines
  .filter((l) => !namesTarget(l.toLowerCase()))
  .join('\n');
componentLeakCheck('redacted methodology', redactedMeth);

// ---- 4. assemble + leak-assert each role packet -----------------------------------------------
const outDir = join(HERE, 'cross-family', slug);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'types-redacted.ts'), redactedSchema);

// Structural cheat-sheet for the blind roles: the NON-unit-specific harness/override shapes they
// kept guessing wrong (structural RECON_ERRORs — flat "blocks" vs slot-keyed file, totals() map vs
// scalar, gainPierce vs hasPierce, flat-resolved caster-stat event values, no buffRemove on lapse).
// All generic infrastructure (true for every unit) — exposes NO answer tokens, so it preserves
// blindness; the per-packet leak assertion below still runs over it.
const harnessNote = `=== HARNESS API (scripts/tests/lib/harness.ts) ===
Imports (ESM, .js extensions, relative to scripts/tests/units/<slug>.test.ts):
  import { describe, expect, it } from 'vitest';
  import type { SimEvent } from '../../../src/types.js';
  import { controlComp, runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';
controlComp(carry, helm?=true) → CompOptions (liter B1 / crown B2 / carry B3 / helm B3, boss Fire, focus carry). A lone Burst III unit makes ZERO full bursts — the fixture MUST include B1+B2 so bursts actually cast.
runComp(opts) → SimResult (deterministic, no seed).
totals(res) → Record<slug, number>: a PER-SLUG MAP keyed by unit slug → that unit's totalDamage. Index totals(res)[slug]; it is NOT a scalar.
unitOf(res, slug) → that unit's result row (throws if the slug is not in the comp).
CompOptions.overrides → Record<slug, OverrideFile | undefined>: a PER-SLUG MAP of in-memory override patches keyed by slug (unpatched slugs load from disk).
withPatchedOverride(slug, mutate) → deep-clones the committed override, applies mutate to the CLONE, returns it (committed JSON on disk untouched).
cfg.onEvent: (ev) => void — kinds shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/fullBurstEnd.
damage events carry bucket, srcSlot, crit/core rates, inFullBurst, fbMajorApplied, rangeApplied, mult.
buffApply events carry { stat, key, value, stacks, maxStacks, casterIdx, targetIdx, targetSlug, refresh, expiresFrame, durationShots }.
buffRemove is emitted ONLY for removeOnReload buffs at reload-to-max (cause:'reload') — the engine does NOT emit buffRemove when a buff expires by time. Do NOT pair a buffApply with a buffRemove on natural lapse; read expiresFrame / durationShots off the buffApply to reason about expiry.
CASTER-SCALED STAT VALUES ARE FLAT-RESOLVED AT APPLY TIME: a buffApply 'value' for casterAtkPct is (kit%/100)×caster.staticAtk — a flat ATK number, NOT the raw kit percentage. highestAllyAtkPct is emitted under stat 'casterAtkPct' (flat ATK); casterMaxHpPct / targetMaxHpPct are emitted under stat 'maxHpFlat' (flat HP). Plain percentage stats (atkPct, attackDamagePct, critRatePct, …) keep their raw percentage value. Filter events by stat+key and assert on the emitted value accordingly.
NOTE: boss-held debuffs emit buffApply with casterIdx===null AND targetIdx===null — filter them by stat+value.

=== OVERRIDE FILE SHAPE (src/skills/overrides/<slug>.json — the OverrideFile you read and write) ===
The override JSON is keyed by SKILL SLOT: { note?, unmodeled?: {skill1[],skill2[],burst[]}, skill1: Block[], skill2: Block[], burst: Block[], hasPierce?, modes?, … }. All three slot arrays are REQUIRED for a roster unit. Each Block also redundantly carries its own "slot" field. There is NO top-level "blocks" array on the file — iterate override.skill1 / .skill2 / .burst. (The engine's INTERNAL CharacterSkills flattens the slots into one blocks[] array, but the override FILE is slot-keyed.)
A Block = { slot, trigger: TriggerDef, target: TargetDef, effects: EffectDef[], + optional gates: formation / teamHas / everyN+everyNOffset / requiresCore / fbGate / swapGate / requiresShielded / requiresTargetStatus / ownBurstGate / bossElementGate / resourceGate / mode }.
PIERCE: timed or step-gated "Gain Pierce" is a gainPierce effect (kind:'gainPierce', optional durationSec; absent durationSec = continuous) — DISTINCT from the top-level hasPierce:boolean flag (whole-fight Pierce tagging). A boolean cannot step-gate pierce that turns on only after a stack threshold; use a gainPierce effect on the triggering block.
The exact StatKey / TriggerDef / TargetDef / EffectDef identifiers are in the REDACTED EFFECT SCHEMA below — read it for precise field names before writing assertions or override JSON.`;

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
      `note: ${role} is the judge — NOT de-contaminated; build the full judge-packet (results/judge-packet.md pattern) instead.`
    );
    continue;
  }
  const tmplFile = TEMPLATE[role];
  if (!tmplFile) {
    fail(
      `unknown role '${role}' (expected s2b/s5/s6; s7 uses the judge-packet pattern)`
    );
  }
  const template = readFileSync(join(HERE, tmplFile), 'utf8');
  componentLeakCheck(`template ${tmplFile}`, template);

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
  // Final whole-packet leak check OUTSIDE the prose block, ANSWER TOKENS only (matching the original
  // includeSlug=false behavior). The header legitimately names the unit by slug, so strip the slug first —
  // otherwise a token that is a substring of the slug (e.g. "neon" for neon-vision-eye, which the TOKEN HINT stem
  // advisory may prompt the driver to add) false-fails on the header. Name leaks (display name / nickname) in the
  // schema/methodology/template are caught by the component checks above; the assembled packet's harnessNote is
  // generic infrastructure and is not name-checked.
  const nonProse = (
    packet.split('=== KIT PROSE')[0] + packet.split('=== END KIT PROSE ===')[1]
  )
    .split(slug!)
    .join('');
  leakCheck(`assembled ${role} packet (outside prose)`, nonProse, tokLower);

  const packetPath = join(outDir, `${role}-packet.md`);
  writeFileSync(packetPath, packet);
  console.log(`✓ ${role}-packet.md  (${packet.length} bytes, leak-clean)`);
  requestLines.push(
    `| ${role} | cross-family/${slug}/${role}-packet.md | ${tmplFile.replace('.md', '')} output contract | cross-family/${slug}/${role}-result.json |`
  );
}

writeFileSync(join(outDir, 'REQUEST.md'), requestLines.join('\n') + '\n');
console.log(
  `\n✓ wrote ${outDir.replace(ROOT + '/', '')}/{${roles.filter((r) => r !== 's7').join(', ')}-packet.md, types-redacted.ts, REQUEST.md}`
);
console.log(
  `Next: the OTHER model family runs each packet and writes <role>-result.json; the driver reconciles into the verdict.`
);
