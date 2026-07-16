// Approved-nickname derivation from bakery-bot's nikke_characters.aliases.
// The raw alias list is community shorthand and contains P0 conflation traps —
// e.g. alias "neon" on neon-vision-eye, "anis" on anis-star, "soline" on
// soline-frost-ticket — exactly the base/variant conflations the slug lint
// exists to catch. An alias is APPROVED only if it can never be read as a
// different unit:
//   - dropped if it equals its own full name (identity, not a nickname)
//   - dropped if it equals ANY unit's full name (base-name-as-alias trap)
//   - dropped if it equals a base name shared by >= 2 units (ambiguous base)
//   - dropped if two or more units claim it (e.g. "etu")
// Approved nicknames land in data/characters.json as `nicknames` per unit and
// are the ONLY shorthand agents/UI may resolve; everything else needs the
// full name or slug.

export interface AliasRow {
  id: string;
  name: string;
  aliases: string[] | null;
}

export interface NicknameDerivation {
  byId: Record<string, string[]>;
  dropped: { alias: string; id: string; reason: string }[];
}

// " (Treasure)" is a favorite-item marker, not part of the unit's name — strip it
// before name/base comparisons (same normalization as sync.ts), else e.g.
// "Helm (Treasure)" and "Helm: Aquamarine" don't share the base "Helm" and the
// ambiguous alias "helm" slips through.
const normName = (n: string) => n.replace(' (Treasure)', '').trim();

export function deriveNicknames(rows: AliasRow[]): NicknameDerivation {
  const fullNames = new Map<string, string>(); // lowercased full name -> id
  const baseOwners = new Map<string, Set<string>>(); // lowercased base name -> ids
  for (const r of rows) {
    fullNames.set(normName(r.name).toLowerCase(), r.id);
    const base = normName(r.name).split(':')[0].trim().toLowerCase();
    (baseOwners.get(base) ?? baseOwners.set(base, new Set()).get(base)!).add(r.id);
  }

  // alias -> claiming ids (to drop cross-unit collisions)
  const claims = new Map<string, Set<string>>();
  for (const r of rows) {
    for (const raw of r.aliases ?? []) {
      const a = raw.toLowerCase().trim();
      if (!a) continue;
      (claims.get(a) ?? claims.set(a, new Set()).get(a)!).add(r.id);
    }
  }

  const byId: Record<string, string[]> = {};
  const dropped: NicknameDerivation['dropped'] = [];
  for (const r of rows) {
    const kept: string[] = [];
    for (const raw of r.aliases ?? []) {
      const a = raw.toLowerCase().trim();
      if (!a || kept.includes(a)) continue;
      const nameOwner = fullNames.get(a);
      const bases = baseOwners.get(a);
      let reason: string | null = null;
      if (nameOwner === r.id) reason = 'identity (equals own full name)';
      else if (nameOwner) reason = `equals full name of ${nameOwner}`;
      else if (bases && bases.size >= 2)
        reason = `ambiguous base name (${[...bases].sort().join(', ')})`;
      else if (claims.get(a)!.size >= 2)
        reason = `claimed by multiple units (${[...claims.get(a)!].sort().join(', ')})`;
      if (reason) dropped.push({ alias: a, id: r.id, reason });
      else kept.push(a);
    }
    if (kept.length) byId[r.id] = kept;
  }
  return { byId, dropped };
}
