// census-burst-amp-scope.ts — roster-wide audit of the `burstDesc` scope tag against the
// LITERAL strings the two Burst-Skill-Damage amps name in their own kit text.
//
//   npx tsx scripts/census-burst-amp-scope.ts            # mismatches only
//   npx tsx scripts/census-burst-amp-scope.ts --all      # every unit with a burst damage line
//   npx tsx scripts/census-burst-amp-scope.ts --check    # exit 1 on an OVER-tag (gate mode)
//   npx tsx scripts/census-burst-amp-scope.ts --near-miss # damage clauses one inserted word off
//   npx tsx scripts/census-burst-amp-scope.ts --under    # the untagged-but-qualifying worklist
//
// `--check` fails on over-tagging only — a tag whose literal is absent is a WRONG claim of amp
// eligibility. Under-tagging is a missing tag, which applies no amp and is therefore inert; the
// remaining under-tagged units are tracked as an explicit list in the vitest pin, not here, so
// this flag stays usable as a gate instead of failing permanently on known debt.
//
// WHY LITERAL. Both amps quote a string and amplify skills that CONTAIN it:
//   trina  burst: 'Burst Skill damage of skills with "Affects all enemies" ▲ 435.6% for 5 sec.'
//   jackal burst: 'Burst Skill damage of skills with "Affects 1 enemy unit(s)" in the
//                  description ▲ 38.91% for 15 sec.'
// jackal's "in the description" is explicit; trina's is the same construction. Owner ruling
// 2026-08-10: the scope is LITERAL-ONLY — a paraphrase that means the same thing in English
// ("Affects random enemies", "Affects the enemy nearest to the crosshair") does NOT qualify.
// Full record: docs/DECISIONS.md (the ruling) and
// docs/handoffs/2026-08-10-burst-amp-literal-scope-findings.md (what it changed and what it
// left open); docs/handoffs/2026-08-10-faithfulness-batch5-findings.md is the measurement that
// raised the question.
//
// `burstDesc` feeds NOTHING in the engine except these two amps (sim.ts dmgUp, the only two
// reads), so a tag is exactly a claim of amp eligibility and nothing else — which makes this
// census decisive rather than advisory.
//
// THE MATCH IS BLOCK-LEVEL — owner ruling 2026-08-10: the literal must sit in the SAME '■'
// block as the damage line it would amplify, not merely somewhere in the burst description.
// Cited confirming case: `scarlet` (AR/Electric base), a known-working trina amp target, whose
// "Affects all enemies." sits on her damage block. (She is consistent with BOTH readings, so
// she is a confirming positive control, not the discriminator — the ruling is what settles it.)
// The rejected alternative was a skill-wide reading of "skills with X in the description". It
// differs for exactly ONE unit — `sin`, whose literal sits on a damage-free block while her
// damage block reads "Affects enemies within attack range" — and she is correctly untagged. The
// census still computes both readings and reports `granularitySplit` so any future case shows up.
//
// Blocks are read from the kit text, not the override, so the scope clause and the damage line
// are always the game's own pairing. "Affects the same target(s)…" inherits the preceding
// block's clause, as the kit means it (cinderella / exia second blocks).
//
// THE STRAY ARTICLE IS FORGIVEN — owner ruling 2026-08-10: the game is assumed to key the amp
// off an internal targeting id rather than the rendered English, so a translator's stray "the"
// cannot change eligibility. See stripStrayArticle() for the rule and the evidence. This is an
// ASSUMPTION, not a measurement — deliberately adopted because the alternative is absurd, and
// safe to adopt because every affected unit is on jackal's side and jackal reaches nothing on
// the board today. A popup read of an amped nuke on any of them would confirm it.
//
// --near-miss survives for what the article rule does NOT forgive: a clause one MEANINGFUL word
// off a literal. Only `viper` ("Affects 1 designated enemy unit(s)") is left — "designated"
// describes a real targeting rule, so hers is a genuine non-match, not a respelling.
//
// Self-validating fixture: scripts/tests/census-burst-amp-scope.test.ts pins the discriminating
// cases (liberalio literal-qualifying, cinderella paraphrase, viper/novel inserted-word
// near-misses) so a later refactor cannot silently loosen the match.
import { readFileSync, readdirSync } from 'node:fs';

const OVERRIDES_DIR = new URL('../src/skills/overrides/', import.meta.url);

/** The exact substrings the amps name. Matched case-sensitively after whitespace collapse. */
export const AMP_LITERALS = {
  allEnemies: 'Affects all enemies',
  singleEnemy: 'Affects 1 enemy unit(s)',
} as const;

export type BurstDesc = keyof typeof AMP_LITERALS;

/** Collapse runs of whitespace so a line-wrapped description still matches (batch-3 lesson). */
export function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Strip the English localization's stray article before matching: "Affects the 1 enemy unit(s)"
 * → "Affects 1 enemy unit(s)".
 *
 * OWNER RULING 2026-08-10: the game is assumed to key the amp off an internal targeting id, not
 * off the rendered English, so an article the translators dropped in cannot change eligibility.
 * The article is provably a localization artifact and not a targeting distinction — seven clause
 * bodies are attested BOTH ways across the roster, and `pepper`, `rapi` (AR/Fire base) and
 * `maiden-ice-rose` each use both spellings of the SAME clause inside their own kit.
 *
 * DELIBERATELY NARROW. It fires only when the article precedes a COUNT ("the 1 …", "the 10 …",
 * "the all …"), which is exactly where the inconsistency is attested. It does NOT touch
 * "Affects the enemy nearest to the crosshair", "Affects the enemy with the highest final ATK"
 * or "Affects the same target(s)" — those are different targeting rules, not respellings, and
 * the literal-only ruling still excludes them. Nor does it forgive a meaningful inserted word
 * (`viper` "Affects 1 designated enemy unit(s)" stays a non-match).
 */
export function stripStrayArticle(text: string): string {
  return text.replace(/\bAffects the (?=(?:\d+|all)\b)/g, 'Affects ');
}

/** Does this burst description literally contain the string the amp names? */
export function carriesLiteral(burstText: string, desc: BurstDesc): boolean {
  return stripStrayArticle(normalize(burstText)).includes(AMP_LITERALS[desc]);
}

export interface KitBlock {
  clause: string; // the effective "Affects …" scope clause ('same target(s)' resolved)
  dealsDamage: boolean; // carries a recognised damage line
  /** mentions damage but in a phrasing DAMAGE_LINE does not recognise — needs a human look */
  unrecognisedDamagePhrasing: boolean;
  literals: BurstDesc[]; // amp literals present in THIS block's clause
}

// Matches every damage phrasing the kit actually uses, not just the common one:
//   "Deals 176.32% of final ATK as damage."
//   "Deals damage equal to 1150.84% of the ATK, which is calculated from 5% of final Max HP."
//   "Deals continuous damage equal to 20.87% of the final ATK * Hero Level every sec for 10 sec."
// The narrow first form alone silently misread `guillotine-winter-slayer`, `kilo` and
// `maiden-ice-rose` damage blocks as damage-FREE, which produced two wrong granularity-split
// verdicts before it was caught. Any change here must keep DAMAGE_LINE_LOOSE below in sync.
const DAMAGE_LINE = /\bDeals\b[^.]*?\b[\d.]+%/i;

// Deliberately over-broad: anything that so much as mentions dealing damage. A block that trips
// this but NOT `DAMAGE_LINE` is an unrecognised phrasing, and the census reports it rather than
// silently classifying it damage-free — the failure mode that bit this instrument twice.
const DAMAGE_LINE_LOOSE =
  /\bdeals?\b[^.]*?\bdamage\b|\bdamage\b[^.]*?\bdeals?\b/i;

// "Affects the same …" = this block reuses the PREVIOUS block's scope, so it inherits its
// literal. The localization spells it SEVEN ways across 13 occurrences — "target(s)", "targets",
// "target", "enemy unit(s)", "enemy units", plus status-qualified variants ("… when in Calm
// status") — so matching only the "target(s)" form silently dropped the inheritance on `epinel`,
// `sakura-bloom-in-summer`, `julia`, `brid`, `guillotine`, `ether`, `mihara-bonding-chain` and
// `laplace`. Third phrasing-variant hole of the same family as DAMAGE_LINE and the stray
// article; matched loosely on purpose.
const SAME_TARGET = /Affects the same (?:target|enemy unit)/i;

/**
 * Split a burst description into its '■' blocks, pairing each scope clause with whether that
 * block deals damage. An "Affects the same …" block inherits the previous block's clause.
 */
export function kitBlocks(burstText: string): KitBlock[] {
  const out: KitBlock[] = [];
  let lastScope = '';
  for (const raw of normalize(burstText).split('■')) {
    const seg = raw.trim();
    if (!seg) {
      continue;
    }
    // the header sentence(s) run up to the first line of effect text; take every "Affects …"
    // sentence in the block header, which is where the scope clause always lives
    const affects = seg.match(/Affects[^.]*\./g) ?? [];
    let clause = affects.join(' ');
    if (!clause) {
      clause = lastScope; // "Activates when …" with no Affects — inherits
    } else if (SAME_TARGET.test(clause)) {
      clause = `${clause} [inherits: ${lastScope}]`;
    } else {
      lastScope = clause;
    }
    out.push({
      clause: clause || '(no scope clause)',
      dealsDamage: DAMAGE_LINE.test(seg),
      unrecognisedDamagePhrasing:
        !DAMAGE_LINE.test(seg) && DAMAGE_LINE_LOOSE.test(seg),
      literals: (Object.keys(AMP_LITERALS) as BurstDesc[]).filter((d) =>
        stripStrayArticle(clause).includes(AMP_LITERALS[d])
      ),
    });
  }
  return out;
}

/**
 * A scope clause that would satisfy an amp literal but for ONE inserted word — e.g.
 * "Affects **the** 1 enemy unit(s) with the highest final ATK" against "Affects 1 enemy
 * unit(s)". Returns the inserted word and the literal it blocks, or null.
 *
 * Deliberately narrow: exactly one word, inserted at the one position where the localization is
 * known to vary. It does NOT match a semantic paraphrase ("Affects random enemies", "Affects
 * enemies within attack range") — those are different clauses, not spellings of the same one.
 */
export function nearMiss(
  clause: string
): { desc: BurstDesc; inserted: string } | null {
  const text = stripStrayArticle(normalize(clause));
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const desc of Object.keys(AMP_LITERALS) as BurstDesc[]) {
    if (text.includes(AMP_LITERALS[desc])) {
      continue; // an exact match is not a near miss
    }
    const words = AMP_LITERALS[desc].split(' ');
    // try inserting one word at each interior position of the literal
    for (let i = 1; i < words.length; i++) {
      const re = new RegExp(
        `\\b${esc(words.slice(0, i).join(' '))} ([A-Za-z]+) ${esc(
          words.slice(i).join(' ')
        )}`
      );
      const m = text.match(re);
      if (m) {
        return { desc, inserted: m[1] };
      }
    }
  }
  return null;
}

/** Literals that sit on a block which actually DEALS damage (the block-level reading). */
export function blockLevelLiterals(burstText: string): BurstDesc[] {
  const found = new Set<BurstDesc>();
  for (const b of kitBlocks(burstText)) {
    if (b.dealsDamage) {
      b.literals.forEach((l) => found.add(l));
    }
  }
  return [...found];
}

function walkEffects(
  effects: unknown,
  cb: (e: Record<string, unknown>) => void
) {
  if (!Array.isArray(effects)) {
    return;
  }
  for (const e of effects) {
    if (!e || typeof e !== 'object') {
      continue;
    }
    const eff = e as Record<string, unknown>;
    cb(eff);
    if (eff.kind === 'escalating') {
      walkEffects(eff.steps, cb);
    }
  }
}

interface Row {
  slug: string;
  tags: BurstDesc[]; // burstDesc values carried by burst-slot damage effects
  untaggedDamage: number; // burst-slot damage effects with NO burstDesc
  /** burst-slot `dot`/`stackedNuke` effects — structurally amp-ineligible (burstDesc is
   * authorable on `flatDamage` only) */
  dotDamage: number;
  literals: BurstDesc[]; // block-level: literal on a block that deals damage
  skillLiterals: BurstDesc[]; // skill-level: literal anywhere in the burst description
  blocks: KitBlock[];
  /** damage-block clauses one inserted word away from an amp literal (localization artifact) */
  nearMisses: { desc: BurstDesc; inserted: string; clause: string }[];
  verdict:
    'ok' | 'over-tagged' | 'under-tagged' | 'dot-ineligible' | 'no-burst-text';
  /** block-level and skill-level readings disagree — the granularity question is live here */
  granularitySplit: boolean;
  detail: string;
}

export function censusRows(): Row[] {
  const { characters } = JSON.parse(
    readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
  ) as { characters: Record<string, { skills?: { burst?: string } }> };

  const rows: Row[] = [];
  for (const file of readdirSync(OVERRIDES_DIR).sort()) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const slug = file.replace(/\.json$/, '');
    const ov = JSON.parse(
      readFileSync(new URL(file, OVERRIDES_DIR), 'utf8')
    ) as Record<string, unknown>;

    const tags: BurstDesc[] = [];
    let untaggedDamage = 0;
    let dotDamage = 0;
    for (const block of (ov.burst as Array<Record<string, unknown>>) ?? []) {
      walkEffects(block.effects, (e) => {
        // `burstDesc` is plumbed ONLY on flatDamage (and its pending-hit path). A burst-slot
        // `dot` is therefore STRUCTURALLY amp-ineligible however its kit clause reads — an
        // engine gap, not a tagging decision. Counted so the census surfaces those units
        // instead of skipping them into invisibility.
        // `stackedNuke` is a third burst damage primitive (maiden-ice-rose) and, like `dot`,
        // carries no burstDesc — same structural amp-ineligibility, same reason to be visible.
        if (e.kind === 'dot' || e.kind === 'stackedNuke') {
          dotDamage++;
          return;
        }
        if (e.kind !== 'flatDamage') {
          return;
        }
        if (e.burstDesc) {
          tags.push(e.burstDesc as BurstDesc);
        } else {
          untaggedDamage++;
        }
      });
    }
    if (tags.length === 0 && untaggedDamage === 0 && dotDamage === 0) {
      continue; // no burst-slot damage line — the amps cannot reach this unit at all
    }

    const burstText = characters[slug]?.skills?.burst;
    if (!burstText) {
      rows.push({
        slug,
        tags,
        untaggedDamage,
        dotDamage,
        literals: [],
        skillLiterals: [],
        blocks: [],
        nearMisses: [],
        verdict: 'no-burst-text',
        granularitySplit: false,
        detail: 'no kit burst text in data/characters.json — cannot adjudicate',
      });
      continue;
    }

    const blocks = kitBlocks(burstText);
    const literals = blockLevelLiterals(burstText);
    const skillLiterals = (Object.keys(AMP_LITERALS) as BurstDesc[]).filter(
      (d) => carriesLiteral(burstText, d)
    );
    const granularitySplit = skillLiterals.some((l) => !literals.includes(l));

    const over = tags.filter((t) => !literals.includes(t));
    const under = literals.filter((l) => !tags.includes(l));
    let verdict: Row['verdict'] = 'ok';
    let detail = literals.length
      ? `literal ${literals.join('+')} on the damage block, tagged ${tags.join('+') || 'none'}`
      : 'no amp literal on a damage block; no tag — correct';
    if (over.length) {
      verdict = 'over-tagged';
      detail = `tagged ${[...new Set(over)].join('+')} but no damage block's clause contains "${[
        ...new Set(over),
      ]
        .map((d) => AMP_LITERALS[d])
        .join('" / "')}"`;
    } else if (under.length && untaggedDamage === 0 && dotDamage > 0) {
      verdict = 'dot-ineligible';
      detail =
        `a damage block's clause contains "${under
          .map((d) => AMP_LITERALS[d])
          .join(
            '" / "'
          )}" but its burst damage is ${dotDamage} dot/stackedNuke effect(s) — ` +
        'burstDesc is authorable on flatDamage only, so this unit is STRUCTURALLY ' +
        'amp-ineligible however it is tagged. Engine gap, not a tagging decision.';
    } else if (under.length && untaggedDamage > 0) {
      verdict = 'under-tagged';
      detail = `a damage block's clause contains "${under
        .map((d) => AMP_LITERALS[d])
        .join(
          '" / "'
        )}" and ${untaggedDamage} burst damage effect(s) carry no tag`;
    }
    if (granularitySplit) {
      detail += ` · GRANULARITY SPLIT: "${skillLiterals
        .filter((l) => !literals.includes(l))
        .map((d) => AMP_LITERALS[d])
        .join(
          '" / "'
        )}" appears elsewhere in the burst text but not on a damage block`;
    }
    const nearMisses = blocks
      .filter((b) => b.dealsDamage)
      .map((b) => ({ block: b, nm: nearMiss(b.clause) }))
      .filter(
        (
          x
        ): x is {
          block: KitBlock;
          nm: NonNullable<ReturnType<typeof nearMiss>>;
        } => Boolean(x.nm)
      )
      .map((x) => ({ ...x.nm, clause: x.block.clause }));
    rows.push({
      slug,
      tags,
      untaggedDamage,
      dotDamage,
      literals,
      skillLiterals,
      blocks,
      nearMisses,
      verdict,
      granularitySplit,
      detail,
    });
  }
  return rows;
}

function reportNearMisses(rows: Row[]) {
  const hits = rows.filter((r) => r.nearMisses.length);
  console.log(
    'Damage-block clauses ONE inserted word away from an amp literal.\n' +
      "Reported, never auto-tagged: whether the game's matcher sees the stray word is\n" +
      'UNMEASURED. Evidence it is a localization artifact rather than a real distinction is\n' +
      'below the table — the same clause body appears both ways across units.\n'
  );
  for (const r of hits) {
    for (const nm of r.nearMisses) {
      console.log(
        `  ${r.slug.padEnd(26)} +"${nm.inserted}"  blocks ${nm.desc.padEnd(11)} ${nm.clause}`
      );
    }
  }
  // The artifact evidence. Scanned over EVERY skill of EVERY character, not just the burst
  // blocks above: the claim is about the localization as a whole, so restricting it to units
  // that happen to carry a burst damage line would understate it.
  const { characters } = JSON.parse(
    readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
  ) as {
    characters: Record<string, { skills?: Record<string, string> }>;
  };
  const bodies = new Map<string, { with: string[]; without: string[] }>();
  for (const [slug, c] of Object.entries(characters)) {
    for (const text of Object.values(c.skills ?? {})) {
      if (typeof text !== 'string') {
        continue;
      }
      for (const m of normalize(text).matchAll(
        /Affects (the )?(\d+|all) enemy unit\(s\)([^.]*)\./g
      )) {
        const key = `Affects ${m[2]} enemy unit(s)${m[3]}.`;
        const e = bodies.get(key) ?? { with: [], without: [] };
        (m[1] ? e.with : e.without).push(slug);
        bodies.set(key, e);
      }
    }
  }
  const both = [...bodies.entries()].filter(
    ([, e]) => e.with.length && e.without.length
  );
  console.log(
    `\n  ${hits.length} unit(s) affected · ${both.length} clause body(ies) attested BOTH ways:`
  );
  const selfInconsistent = new Set<string>();
  for (const [body, e] of both) {
    const w = [...new Set(e.with)];
    const wo = [...new Set(e.without)];
    console.log(`    ${body}`);
    console.log(`        with: ${w.join(', ')}  |  without: ${wo.join(', ')}`);
    w.filter((s) => wo.includes(s)).forEach((s) => selfInconsistent.add(s));
  }
  console.log(
    `\n  STRONGEST DATUM — ${selfInconsistent.size} unit(s) use BOTH spellings of the SAME clause\n` +
      `  inside their OWN kit: ${[...selfInconsistent].join(', ')}.\n` +
      '  One unit cannot mean two different targeting rules by one clause, so the article is a\n' +
      "  localization inconsistency. That does NOT settle whether the game's matcher sees it."
  );
}

/**
 * The under-tagged worklist, split by how safe a mechanical tag would be. A unit whose EVERY
 * damage-bearing block carries the literal can be tagged wholesale; one with a mix needs the tag
 * placed per block, because only some of its damage lines qualify.
 */
function reportUnderTagged(rows: Row[]) {
  const under = rows.filter((r) => r.verdict === 'under-tagged');
  const clean: Row[] = [];
  const mixed: Row[] = [];
  for (const r of under) {
    const dmg = r.blocks.filter((b) => b.dealsDamage);
    const lit = dmg.filter((b) => b.literals.length);
    // Wholesale is safe only when every damage block qualifies AND they all want the SAME tag.
    // `2b` is the counter-example: "Affects all enemies" on her distributed nuke and "Affects 1
    // enemy unit(s) with the highest remaining HP" on her additional-damage line, so a single
    // blanket value would mis-tag one of the two.
    const distinct = new Set(dmg.flatMap((b) => b.literals));
    (lit.length === dmg.length && distinct.size === 1 ? clean : mixed).push(r);
  }
  console.log(
    'Untagged units whose damage block DOES carry a literal. Tagging them is board-inert while\n' +
      'no amp shares their comps, but it is a real eligibility claim the day one does.\n'
  );
  console.log(
    `SAFE TO TAG WHOLESALE — every damage block qualifies (${clean.length}):`
  );
  for (const r of clean) {
    console.log(
      `  ${r.slug.padEnd(28)} ${String(r.untaggedDamage).padStart(2)} effect(s)  ${r.literals.join('+')}`
    );
  }
  console.log(
    `\nTAG PER BLOCK — only some damage blocks qualify (${mixed.length}):`
  );
  for (const r of mixed) {
    console.log(`  ${r.slug} (${r.untaggedDamage} untagged effect(s))`);
    for (const b of r.blocks.filter((x) => x.dealsDamage)) {
      console.log(
        `      ${b.literals.length ? 'QUALIFIES  ' : 'no literal '} ${b.clause}`
      );
    }
  }
}

function main() {
  const argv = process.argv.slice(2);
  const showAll = argv.includes('--all');
  const check = argv.includes('--check');
  const rows = censusRows();
  const bad = rows.filter((r) => r.verdict !== 'ok');

  if (argv.includes('--near-miss')) {
    reportNearMisses(rows);
    return;
  }
  if (argv.includes('--under')) {
    reportUnderTagged(rows);
    return;
  }

  const shown = showAll ? rows : bad;
  for (const r of shown) {
    const mark =
      r.verdict === 'ok'
        ? '  ok'
        : r.verdict === 'no-burst-text'
          ? '  ??'
          : '  ▲▲';
    console.log(
      `${mark} ${r.slug.padEnd(26)} ${r.verdict.padEnd(13)} ${r.detail}`
    );
    if (r.verdict !== 'ok' || r.granularitySplit) {
      for (const b of r.blocks) {
        console.log(`       ${b.dealsDamage ? 'DMG ' : '    '} ${b.clause}`);
      }
    }
  }
  const split = rows.filter((r) => r.granularitySplit);
  console.log(
    `\n${rows.length} unit(s) with a burst-slot damage line · ${
      rows.filter((r) => r.tags.length).length
    } tagged · ${bad.length} mismatch(es) · ${split.length} granularity split(s)${
      split.length ? `: ${split.map((r) => r.slug).join(', ')}` : ''
    }`
  );
  // Loud, unconditional: a phrasing the damage-line matcher does not recognise means a block
  // may be misclassified as damage-free, which silently changes a unit's verdict. This is the
  // failure mode that produced two wrong granularity-split calls before it was caught.
  const unrecognised = rows.flatMap((r) =>
    r.blocks
      .filter((b) => b.unrecognisedDamagePhrasing)
      .map((b) => `${r.slug}: ${b.clause}`)
  );
  if (unrecognised.length) {
    console.log(
      `\n⚠ ${unrecognised.length} burst block(s) mention damage in a phrasing DAMAGE_LINE does ` +
        'not recognise — verify each by hand before trusting its verdict:'
    );
    unrecognised.forEach((u) => console.log(`    ${u}`));
  }

  const wrong = rows.filter(
    (r) => r.verdict === 'over-tagged' || r.verdict === 'no-burst-text'
  );
  if (check && wrong.length) {
    console.error(
      `\n${wrong.length} unit(s) claim amp eligibility the kit text does not grant: ${wrong
        .map((r) => r.slug)
        .join(', ')}`
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!)
) {
  main();
}
