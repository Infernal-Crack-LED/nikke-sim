// Roster invariant for the Burst-Skill-Damage amp scope tag (`burstDesc`), plus the
// self-validating fixture for scripts/census-burst-amp-scope.ts.
//
// OWNER RULING 2026-08-10 — the amps are LITERAL-ONLY. Both quote a string and amplify skills
// whose description contains it:
//   trina  'Burst Skill damage of skills with "Affects all enemies" ▲ 435.6% for 5 sec.'
//   jackal 'Burst Skill damage of skills with "Affects 1 enemy unit(s)" in the description …'
// A paraphrase that means the same thing in English ("Affects enemies within attack range",
// "Affects random enemy units", "Affects the enemy nearest to the crosshair") does NOT qualify.
// This is a DIFFERENT question from the earlier same-day scope-string ruling, which held that
// those clauses count as TARGETING THE BOSS — that one still stands and is unaffected.
//
// Why an invariant instead of 76 per-unit pins: `burstDesc` feeds nothing in the engine except
// these two amps, so the tag is exactly a claim of amp eligibility and the correct tag set is a
// pure function of the kit text. Pinning the function makes the whole class un-driftable.
import { describe, expect, it } from 'vitest';
import {
  AMP_LITERALS,
  blockLevelLiterals,
  carriesLiteral,
  censusRows,
  kitBlocks,
  nearMiss,
  stripStrayArticle,
  normalize,
} from '../census-burst-amp-scope.js';

const rows = censusRows();
const row = (slug: string) => {
  const r = rows.find((x) => x.slug === slug);
  if (!r) {
    throw new Error(`no census row for ${slug}`);
  }
  return r;
};

describe('burst-amp scope census — the matcher', () => {
  it('matches the literal on the exact clause, and only there', () => {
    expect(carriesLiteral('■ Affects all enemies.', 'allEnemies')).toBe(true);
    expect(carriesLiteral('■ Affects random enemies.', 'allEnemies')).toBe(
      false
    );
    expect(
      carriesLiteral('■ Affects enemies within attack range.', 'allEnemies')
    ).toBe(false);
  });

  it('survives a line wrap (batch-3 lesson: exact-phrase greps die on newlines)', () => {
    expect(carriesLiteral('■ Affects all\n   enemies.', 'allEnemies')).toBe(
      true
    );
    expect(normalize('a  \n b')).toBe('a b');
  });

  it('DISCRIMINATING: an inserted word breaks the match, a trailing qualifier does not', () => {
    // viper "Affects 1 designated enemy unit(s)" — inserted word, no match.
    expect(
      carriesLiteral('■ Affects 1 designated enemy unit(s).', 'singleEnemy')
    ).toBe(false);
    // 2b "Affects 1 enemy unit(s) with the highest remaining HP" — trailing, still matches.
    expect(
      carriesLiteral(
        '■ Affects 1 enemy unit(s) with the highest remaining HP.',
        'singleEnemy'
      )
    ).toBe(true);
  });

  it('pairs each scope clause with whether ITS OWN block deals damage', () => {
    const blocks = kitBlocks(
      '■ Affects self.\nAttack Damage ▲ 57.08% for 10 sec.\n' +
        '■ Affects all enemies.\nDeals 1736.31% of final ATK as Distributed Damage.'
    );
    expect(blocks.map((b) => b.dealsDamage)).toEqual([false, true]);
    expect(
      blockLevelLiterals(blocks[1].clause ? blocks[0].clause : '')
    ).toEqual([]);
  });

  it('"Affects the same target(s)" inherits the preceding block\'s clause', () => {
    const blocks = kitBlocks(
      '■ Affects all enemies.\nDeals 100% of final ATK as damage.\n' +
        '■ Affects the same target(s) when in Calm status.\nDeals 20% of final ATK as damage.'
    );
    expect(blocks[1].clause).toContain('inherits: Affects all enemies.');
  });
});

describe('burst-amp scope census — the roster invariant', () => {
  it('NO unit is over-tagged: every burstDesc has the literal on its own damage block', () => {
    const over = rows.filter((r) => r.verdict === 'over-tagged');
    expect(
      over.map((r) => `${r.slug}: ${r.detail}`),
      'a tag without the literal claims amp eligibility the kit text does not grant'
    ).toEqual([]);
  });

  it('every kit burst text is adjudicable (no unit falls through the census)', () => {
    expect(
      rows.filter((r) => r.verdict === 'no-burst-text').map((r) => r.slug)
    ).toEqual([]);
  });

  it('the three literal allEnemies carriers reviewed in batch 6 are tagged', () => {
    // noir / privaty / quency-escape-queen carry the exact string trina's amp names, on the
    // block that deals the damage. These are the amp's true qualifying carriers — the finding
    // that resolved the batch-5 cinderella refutation (she is "Affects random enemies", a
    // paraphrase, so the 435.6% never reached her and her 0.893 COLD stands).
    for (const slug of ['noir', 'privaty', 'quency-escape-queen']) {
      expect(row(slug).tags, slug).toEqual(['allEnemies']);
      expect(row(slug).literals, slug).toContain('allEnemies');
    }
  });

  it('cinderella (RL/Electric base) stays UNtagged — her clause is a paraphrase', () => {
    expect(row('cinderella').tags).toEqual([]);
    expect(row('cinderella').literals).toEqual([]);
  });

  it('liberalio keeps her tag — hers IS the literal string, and she is the one live pairing', () => {
    // The only board-active amp pairing today (N3 seats her with trina). Her clause is
    // literally "Affects all enemies", so the literal-only ruling leaves her untouched — and
    // the amp moves her 0.917 → 0.929, toward her real fight.
    expect(row('liberalio').tags).toEqual(['allEnemies']);
    expect(row('liberalio').literals).toEqual(['allEnemies']);
  });

  it('the match is BLOCK-level: a literal on a damage-free block does NOT qualify', () => {
    // Owner ruling 2026-08-10: the literal must sit in the SAME '■' block as the damage line.
    // These three have their literal on a block that deals no damage while their damage block's
    // clause has none, so all three are correctly untagged. (`novel` used to be the sharpest
    // case here and no longer is: once the stray article is forgiven, HER damage block carries
    // the literal outright, so block-vs-skill stopped being what decides her.)
    expect(rows.filter((r) => r.granularitySplit).map((r) => r.slug)).toEqual([
      'guillotine-winter-slayer',
      'kilo',
      'sin',
    ]);
    for (const slug of ['guillotine-winter-slayer', 'kilo', 'sin']) {
      expect(
        row(slug).tags,
        `${slug} is untagged under the block rule`
      ).toEqual([]);
    }
  });

  it('scarlet is the cited confirming case: a working amp target, literal ON the damage block', () => {
    // `scarlet` = AR/Electric base (NOT `scarlet-black-shadow`). Owner names her as a known
    // working trina amp target. Her burst has two blocks — "Affects self. Activates when HP
    // falls below 50%." (Crit Rate, no damage) and "Affects all enemies." (the 849.15% nuke).
    // Note she is CONSISTENT with both readings, so she confirms the block rule rather than
    // discriminating against the skill-wide one; the ruling is what settles it.
    const blocks = row('scarlet').blocks;
    const dmg = blocks.filter((b) => b.dealsDamage);
    expect(dmg.length).toBe(1);
    expect(dmg[0].literals).toEqual(['allEnemies']);
    expect(row('scarlet').granularitySplit).toBe(false);
  });

  it('a burst-slot dot is STRUCTURALLY amp-ineligible, and the census says so out loud', () => {
    // `burstDesc` is plumbed only on flatDamage and its pending-hit path, so a burst-slot dot
    // can never read an amp however its clause reads. These units have a literal on their
    // damage block and STILL cannot be tagged — an engine gap, not a tagging chore. Pinned
    // because the census originally skipped dot-only carriers into invisibility, which is how
    // `ark-ranger-black` went unseen in the first pass — and she is now IN this set: forgiving
    // the article qualified her clause, and the dot is the only thing still blocking her.
    const dotOnly = rows.filter((r) => r.verdict === 'dot-ineligible');
    expect(dotOnly.map((r) => r.slug)).toEqual([
      'ark-ranger-black',
      'diesel-winter-sweets',
      'mana',
    ]);
    for (const r of dotOnly) {
      expect(r.dotDamage, r.slug).toBeGreaterThan(0);
      expect(r.tags, r.slug).toEqual([]);
    }
  });

  it('near-miss: only a MEANINGFUL inserted word is left — the article is forgiven', () => {
    // Owner ruling 2026-08-10: the game is ASSUMED to key the amp off an internal targeting id,
    // not the rendered English, so the localization's stray article cannot block eligibility.
    // stripStrayArticle() normalizes it away, which qualified 7 units (6 tagged; the 7th,
    // `ark-ranger-black`, is a burst-dot and blocked by the engine gap instead).
    // What survives as a near miss is a clause off by a word that MEANS something: `viper`'s
    // "Affects 1 designated enemy unit(s)" is a different targeting rule, not a respelling, so
    // she stays a genuine non-match. The two must never be conflated.
    const affected = rows.filter((r) => r.nearMisses.length).map((r) => r.slug);
    expect(affected).toEqual(['viper']);
    expect(row('viper').nearMisses.map((n) => n.inserted)).toEqual([
      'designated',
    ]);
    expect(row('viper').tags).toEqual([]);
  });

  it('the 6 article-forgiven units are tagged; the burst-dot one is not', () => {
    for (const slug of ['guilty', 'nero', 'novel', 'pepper', 'power', 'rapi']) {
      expect(
        row(slug).tags.every((t2) => t2 === 'singleEnemy'),
        slug
      ).toBe(true);
      expect(row(slug).tags.length, `${slug} has every burst hit tagged`).toBe(
        row(slug).tags.length + row(slug).untaggedDamage
      );
    }
    // guilty + power each carry a second, status-gated "Affects the same target(s)" rider that
    // inherits the scope (exia precedent), so both of their hits are tagged.
    expect(row('guilty').tags).toEqual(['singleEnemy', 'singleEnemy']);
    expect(row('power').tags).toEqual(['singleEnemy', 'singleEnemy']);
    // ark-ranger-black qualifies on the clause but her burst damage is a dot — engine gap.
    expect(row('ark-ranger-black').tags).toEqual([]);
    expect(row('ark-ranger-black').verdict).toBe('dot-ineligible');
  });

  it('nearMiss() matches one inserted word, not a paraphrase or a forgiven article', () => {
    // the article is stripped before matching, so it is no longer a near miss at all
    expect(
      nearMiss('Affects the 1 enemy unit(s) with the highest final ATK.')
    ).toBeNull();
    expect(stripStrayArticle('Affects the 1 enemy unit(s).')).toBe(
      'Affects 1 enemy unit(s).'
    );
    // a meaningful inserted word still is one
    expect(nearMiss('Affects 1 designated enemy unit(s).')).toEqual({
      desc: 'singleEnemy',
      inserted: 'designated',
    });
    // paraphrases are different clauses, not spellings of the same one
    expect(nearMiss('Affects random enemies.')).toBeNull();
    expect(nearMiss('Affects enemies within attack range.')).toBeNull();
    // an exact match is not a near miss
    expect(nearMiss('Affects all enemies.')).toBeNull();
  });

  it('KNOWN DEBT: the literal carriers outside the graded slice are not yet tagged', () => {
    // Under-tagging is inert (a missing tag applies no amp), and none of these units shares a
    // comp with trina or jackal, so tagging them moves nothing today. They are listed rather
    // than swept because each one is a per-unit review under the phase-4 checklist. This pin
    // exists so the debt is VISIBLE and any change to it is deliberate: shrink the list as
    // units are reviewed, never grow it silently.
    // EVERY entry below is an EXACT override slug (the list is derived from the filenames in
    // src/skills/overrides/), so the bare base names are the BASE units, not their variants —
    // `helm-aquamarine` is here and `helm` is not; `privaty-unkind-maid` AND `privaty` (the
    // AR/Water Treasure base) are both here; `d` is the SMG/Wind base, not `d-killer-wife`;
    // `neon` is the SG/Fire base, not `neon-vision-eye` or `neon-blue-ocean`.
    const under = rows
      .filter((r) => r.verdict === 'under-tagged')
      .map((r) => r.slug);
    expect(under).toEqual([
      '2b',
      'anchor',
      'arcana-fortune-mate',
      'arcana',
      'd',
      'delta-ninja-thief',
      'dolla',
      'epinel',
      'harran',
      'helm-aquamarine',
      'laplace-ultimate-hero',
      'maiden',
      'mari',
      'mihara',
      'milk',
      'nayuta',
      'neon',
      'privaty-unkind-maid',
      'raven',
      'rei-ayanami-tentative-name',
      'rei-ayanami',
      'vesti-tactical-upgrade',
      'vesti',
      'yulha',
    ]);
  });

  it('the two literals are exactly the strings the two amps quote', () => {
    expect(AMP_LITERALS).toEqual({
      allEnemies: 'Affects all enemies',
      singleEnemy: 'Affects 1 enemy unit(s)',
    });
  });
});
