// census-burst-amp-scope.ts — roster-wide audit of the `burstDesc` scope tag against the
// LITERAL strings the two Burst-Skill-Damage amps name in their own kit text.
//
//   npx tsx scripts/census-burst-amp-scope.ts            # mismatches only
//   npx tsx scripts/census-burst-amp-scope.ts --all      # every unit with a burst damage line
//   npx tsx scripts/census-burst-amp-scope.ts --check    # exit 1 on an OVER-tag (gate mode)
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
// See docs/DECISIONS.md and docs/handoffs/2026-08-10-faithfulness-batch5-findings.md.
//
// `burstDesc` feeds NOTHING in the engine except these two amps (sim.ts dmgUp, the only two
// reads), so a tag is exactly a claim of amp eligibility and nothing else — which makes this
// census decisive rather than advisory.
//
// TWO GRANULARITIES, REPORTED SEPARATELY — the kit text does not settle which one the game
// uses, and they disagree for real units:
//   BLOCK level  — the literal sits in the SAME '■' block as the damage line it would amplify.
//   SKILL level  — the literal appears ANYWHERE in the burst description ("skills with X in the
//                  description" reads skill-wide).
// `novel` is the discriminating case: her damage block is "Affects the 1 enemy unit(s) with the
// highest final ATK" (no literal), while a LATER, damage-free block is "Affects 1 enemy
// unit(s)." — so she qualifies skill-wide and not block-wise. UNRULED as of 2026-08-10; the
// census flags every unit where the two verdicts differ instead of silently picking one.
//
// Blocks are read from the kit text, not the override, so the scope clause and the damage line
// are always the game's own pairing. "Affects the same target(s)…" inherits the preceding
// block's clause, as the kit means it (cinderella / exia second blocks).
//
// Self-validating fixture: scripts/tests/census-burst-amp-scope.test.ts pins the four
// discriminating cases (liberalio literal-qualifying, cinderella paraphrase, viper/novel
// inserted-word near-misses) so a later refactor cannot silently loosen the match.
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

/** Does this burst description literally contain the string the amp names? */
export function carriesLiteral(burstText: string, desc: BurstDesc): boolean {
  return normalize(burstText).includes(AMP_LITERALS[desc]);
}

export interface KitBlock {
  clause: string; // the effective "Affects …" scope clause ('same target(s)' resolved)
  dealsDamage: boolean; // carries a "Deals X% of final ATK" line
  literals: BurstDesc[]; // amp literals present in THIS block's clause
}

const DAMAGE_LINE = /Deals\s+[\d.]+%\s+of\s+final\s+ATK/i;

/**
 * Split a burst description into its '■' blocks, pairing each scope clause with whether that
 * block deals damage. "Affects the same target(s)" inherits the previous block's clause.
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
    } else if (/Affects the same target\(s\)/i.test(clause)) {
      clause = `${clause} [inherits: ${lastScope}]`;
    } else {
      lastScope = clause;
    }
    out.push({
      clause: clause || '(no scope clause)',
      dealsDamage: DAMAGE_LINE.test(seg),
      literals: (Object.keys(AMP_LITERALS) as BurstDesc[]).filter((d) =>
        clause.includes(AMP_LITERALS[d])
      ),
    });
  }
  return out;
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
  literals: BurstDesc[]; // block-level: literal on a block that deals damage
  skillLiterals: BurstDesc[]; // skill-level: literal anywhere in the burst description
  blocks: KitBlock[];
  verdict: 'ok' | 'over-tagged' | 'under-tagged' | 'no-burst-text';
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
    for (const block of (ov.burst as Array<Record<string, unknown>>) ?? []) {
      walkEffects(block.effects, (e) => {
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
    if (tags.length === 0 && untaggedDamage === 0) {
      continue; // no burst-slot damage line — the amps cannot reach this unit at all
    }

    const burstText = characters[slug]?.skills?.burst;
    if (!burstText) {
      rows.push({
        slug,
        tags,
        untaggedDamage,
        literals: [],
        skillLiterals: [],
        blocks: [],
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
    rows.push({
      slug,
      tags,
      untaggedDamage,
      literals,
      skillLiterals,
      blocks,
      verdict,
      granularitySplit,
      detail,
    });
  }
  return rows;
}

function main() {
  const argv = process.argv.slice(2);
  const showAll = argv.includes('--all');
  const check = argv.includes('--check');
  const rows = censusRows();
  const bad = rows.filter((r) => r.verdict !== 'ok');

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
