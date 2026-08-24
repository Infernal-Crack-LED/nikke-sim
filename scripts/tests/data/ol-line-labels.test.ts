// Pins the Overload line labels to the game's REAL strings, and the synced-roster
// label→key mapping on top of them. The canonical list below was read verbatim from
// the live CDN table (`equip_option_table_v2-en` `description_localkey`, fetched
// 2026-08-23) — the exact strings the synced-roster backend forwards. The sim
// shipped with invented "Increase …" names from day one, so every real synced OL
// line missed the exact-match map and was dropped (user report 2026-08-21); this
// test makes that failure mode impossible to reintroduce silently.
import { describe, expect, it } from 'vitest';
import olLinesJson from '../../../data/ol-lines.json' with { type: 'json' };
import charactersJson from '../../../data/characters.json' with { type: 'json' };
import { resolveSyncedLoadout } from '../../../web/src/rosterApply.js';
import type { SyncedUnitLoadout } from '../../../web/src/auth.js';

// key → the game's label, verbatim from the CDN table (state_effect_group_id noted).
const REAL_LABELS: Record<string, string> = {
  atk: 'Increased ATK', // 1000
  hitrate: 'Increased Hit Rate', // 3000
  elem: 'Increased Elemental Advantage Dmg', // 100100
  ammo: 'Increased Max Ammunition Capacity', // 100300
  chargedmg: 'Increased Charge Damage', // 100500
  chargespd: 'Increased Charge Speed', // 100600
  critrate: 'Increased Critical Rate', // 100700
  critdmg: 'Increased Critical Damage', // 100800
  def: 'Increased DEF', // 100900
};

// The sim's pre-2026-08-23 names — kept alive as aliases because local roster
// captures made before the rename still carry them.
const LEGACY_LABELS: Record<string, string> = {
  atk: 'Increase ATK',
  hitrate: 'Increase Hit Rate',
  elem: 'Increase Elemental Damage',
  ammo: 'Increase Max Ammo Capacity',
  chargedmg: 'Increase Charge Damage',
  chargespd: 'Increase Charge Speed',
  critrate: 'Increase Critical Rate',
  critdmg: 'Increase Critical Damage',
  def: 'Increase DEF',
};

// Any modeled unit works as the loadout carrier; take the first with a name_code.
const NAME_CODE: number = (() => {
  const chars = (charactersJson as any).characters as Record<string, any>;
  for (const c of Object.values(chars)) {
    const code = c?.role?.meta?.name_code;
    if (code != null) {
      return code;
    }
  }
  throw new Error('no character with role.meta.name_code in characters.json');
})();

const loadoutWith = (labels: string[]): SyncedUnitLoadout =>
  ({
    nameCode: NAME_CODE,
    ol: labels.map((label) => ({ label, tier: 15 })),
  }) as SyncedUnitLoadout;

describe('data/ol-lines.json names', () => {
  it('are exactly the game strings the backend forwards', () => {
    const lines = (olLinesJson as any).lines as Record<
      string,
      { name: string }
    >;
    const names = Object.fromEntries(
      Object.entries(lines).map(([k, v]) => [k, v.name])
    );
    expect(names).toEqual(REAL_LABELS);
  });
});

describe('resolveSyncedLoadout OL label mapping', () => {
  it('maps every real game label — none unmapped, every line lands a value', () => {
    const resolved = resolveSyncedLoadout(
      loadoutWith(Object.values(REAL_LABELS))
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.unmappedLines).toBeUndefined();
    expect(resolved!.olElem).toBeGreaterThan(0);
    expect(resolved!.olAtk).toBeGreaterThan(0);
    const extraKeys = resolved!.olExtra.map((e) => e.type).sort();
    expect(extraKeys).toEqual(
      Object.keys(REAL_LABELS)
        .filter((k) => k !== 'elem' && k !== 'atk')
        .sort()
    );
    for (const e of resolved!.olExtra) {
      expect(e.value).toBeGreaterThan(0);
    }
  });

  it('still maps the legacy pre-rename labels via aliases', () => {
    const resolved = resolveSyncedLoadout(
      loadoutWith(Object.values(LEGACY_LABELS))
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.unmappedLines).toBeUndefined();
    expect(resolved!.olElem).toBeGreaterThan(0);
    expect(resolved!.olAtk).toBeGreaterThan(0);
  });

  it('surfaces the unmodeled "Increased Recovery" line as unmapped by design', () => {
    const resolved = resolveSyncedLoadout(
      loadoutWith(['Increased Recovery', REAL_LABELS.atk])
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.unmappedLines).toEqual(['Increased Recovery']);
    expect(resolved!.olAtk).toBeGreaterThan(0);
  });
});
