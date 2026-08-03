// Audit `characters.releaseDate` against its upstream source, and enforce the Treasure policy.
//
//   npx tsx scripts/audit-release-dates.ts          # audit; exits 1 on any finding
//   npx tsx scripts/audit-release-dates.ts --all    # also print the units that agree
//
// WHY THIS EXISTS. `releaseDate` is display-only (the unit card's "Released <date>" line) and no
// test could pin it, so a wrong value is invisible until someone reads a card. It is copied into
// data/characters.json from bakery-bot's `attributes` blob, which in turn takes the FIRST date of
// the Synergy `attack_damage_characters` row the DB matched the unit to. That match is the whole
// story: Synergy lists a Treasure as its own row (宝 + the base unit's Japanese name) with its own
// release date, so whether a Treasure unit reads its Treasure date or its base debut depended
// entirely on which of the two rows upstream happened to pick — base for 18 of 21, 宝 for 3.
//
// This re-derives both candidate dates per unit straight from the DB + Synergy and reports:
//   MISMATCH   — data/characters.json disagrees with the expected value
//   NO-SYNERGY — the unit has no Synergy row, so no date can be derived (releaseDate must be null)
//   NO-宝-ROW  — a Treasure unit whose 宝 row is missing, so the policy cannot be applied
//
// Expected value = the 宝 row's first date for a Treasure unit (owner ruling 2026-08-03 — the
// roster carries the Treasure version of those units, so the card states when THAT released), and
// the unit's own row's first date otherwise.
//
// Needs DATABASE_PUBLIC_URL (same .env as `npm run sync`) plus network access to Synergy.

import { readFileSync } from 'node:fs';
import pg from 'pg';

const SYNERGY_API =
  'https://api.nikke-synergy.com/rest/v1/attack_damage_characters';
const SYNERGY_HEADERS = { apikey: 'dummy-key', Authorization: 'Bearer dummy-key' };

/** Synergy lists re-runs as extra ranges; the first date is the original release. */
const firstReleaseDate = (v: string | null | undefined): string | null =>
  v?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

interface SynergyRow {
  id: number;
  name: string;
  release_date: string | null;
}

async function main() {
  const showAll = process.argv.includes('--all');

  const url = process.env.DATABASE_PUBLIC_URL;
  if (!url) {
    throw new Error('DATABASE_PUBLIC_URL not set (add it to .env)');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ id: string; synergy_id: number | null }>(
    `select id, synergy_id from nikke_characters order by id`
  );
  await client.end();
  const synergyIdBySlug = new Map(rows.map((r) => [r.id, r.synergy_id]));

  const res = await fetch(`${SYNERGY_API}?limit=500`, {
    headers: SYNERGY_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`synergy API ${res.status}`);
  }
  const apiRows = (await res.json()) as SynergyRow[];
  const bySynergyId = new Map(apiRows.map((r) => [r.id, r]));
  const bySynergyName = new Map(apiRows.map((r) => [r.name, r]));

  const characters = (
    JSON.parse(
      readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
    ) as {
      characters: Record<
        string,
        { releaseDate?: string | null; treasure?: boolean }
      >;
    }
  ).characters;

  const findings: string[] = [];
  let agreed = 0;

  for (const [slug, c] of Object.entries(characters).sort()) {
    const actual = c.releaseDate ?? null;
    const synRow = bySynergyId.get(synergyIdBySlug.get(slug) ?? -1);

    if (!synRow) {
      // No Synergy row → no derivable date. Only a finding if a date got in anyway.
      if (actual !== null) {
        findings.push(
          `NO-SYNERGY  ${slug}: reads ${actual} but has no Synergy row to source it from`
        );
      } else if (showAll) {
        console.log(`ok (no date)  ${slug}`);
      }
      continue;
    }

    const baseName = synRow.name.replace(/^宝/, '');
    const treasureRow = bySynergyName.get(`宝${baseName}`);
    if (c.treasure && !treasureRow) {
      findings.push(
        `NO-宝-ROW   ${slug}: Treasure unit with no 宝${baseName} row in Synergy`
      );
      continue;
    }

    const expected = firstReleaseDate(
      (c.treasure ? treasureRow : synRow)?.release_date
    );
    if (actual !== expected) {
      const why = c.treasure
        ? `Treasure date from 宝${baseName}`
        : `from ${synRow.name}`;
      findings.push(
        `MISMATCH    ${slug}: reads ${actual ?? 'null'}, expected ${expected ?? 'null'} (${why})`
      );
    } else {
      agreed++;
      if (showAll) {
        console.log(
          `ok  ${slug.padEnd(28)} ${expected ?? 'null'}${c.treasure ? '  (Treasure)' : ''}`
        );
      }
    }
  }

  const treasureCount = Object.values(characters).filter(
    (c) => c.treasure
  ).length;
  console.log(
    `\n${Object.keys(characters).length} characters (${treasureCount} Treasure) — ${agreed} agree, ${findings.length} findings`
  );
  for (const f of findings) {
    console.log(`  ${f}`);
  }
  if (findings.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
