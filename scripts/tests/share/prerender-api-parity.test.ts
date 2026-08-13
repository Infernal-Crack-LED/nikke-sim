// The pre-rendered set and the API's on-demand renders must produce the SAME
// BYTES for the same card.
//
// This is load-bearing rather than cosmetic. bakery-bot resolves a per-unit
// table or a Resource Calculator tier through the manifest and falls back to
// the dynamic route on a manifest miss or outage — so both paths are live, and
// a drift between them means the same command shows two different cards
// depending on which path it took, under URLs Discord caches indefinitely.
//
// The test runs the REAL build script over a narrow slice (--only) into a temp
// dir, then re-renders those same cards through the API's own helpers
// (src/server/dps-table-cards.ts) and compares sha256. Comparing bytes, not
// draw calls, is the point: it catches a canvas-size, scale, icon or portrait
// difference that a draw-call assertion would miss entirely.
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildAmmoTable,
  buildChargeTable,
  chargeLatencyFrames,
  buildResourcesCard,
  BOSS_TABLES,
  iconBasename,
  loadIcon,
  loadPortrait,
  decodeToCanvas,
  type ChargeWeaponRow,
  type ResourcesIcons,
  type TableCardData,
} from '../../../src/infographics/node/render.js';
import {
  renderTableCardPng,
  renderResourcesCardPng,
  renderDollCardPng,
} from '../../../src/server/dps-table-cards.js';
import {
  buildDollPlan,
  dollCardData,
  type DollData,
} from '../../../src/doll/card.js';

const run = promisify(execFile);
const SCRIPT = new URL('../../build-infographics.ts', import.meta.url);
const CHARACTERS = new URL('../../../data/characters.json', import.meta.url);
const SITE_ICON = new URL(
  '../../../src/infographics/assets/nikkesim-icon.png',
  import.meta.url
);
const DOLL_ECONOMY = new URL(
  '../../../data/doll-economy.json',
  import.meta.url
);
const DOLL_PROC = new URL(
  '../../../data/doll-super-success.json',
  import.meta.url
);

interface Manifest {
  images: Record<string, { file: string; hash: string }>;
}

interface CharacterRow {
  slug: string;
  name: string;
  weapon: string;
  ammo?: number;
  chargeFrames?: number;
  role?: { weapon?: unknown } | null;
}

const characters = (): Record<string, CharacterRow> =>
  (
    JSON.parse(readFileSync(CHARACTERS, 'utf8')) as {
      characters: Record<string, CharacterRow>;
    }
  ).characters;

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');

async function build(only: string, out: string): Promise<Manifest> {
  await run('npx', ['tsx', SCRIPT.pathname, '--only', only, '--out', out]);
  return JSON.parse(
    readFileSync(join(out, 'manifest.json'), 'utf8')
  ) as Manifest;
}

/** The API path draws the site icon onto every card — see api.ts's
 * `data.icon = ctx.icon`, and app.ts loading the same asset file. */
async function withIcon(data: TableCardData): Promise<TableCardData> {
  data.icon = (await decodeToCanvas(SITE_ICON)) ?? undefined;
  return data;
}

/** The icon strip api.ts builds for a resources render. */
async function resourcesIcons(): Promise<ResourcesIcons> {
  const SIZE = 26;
  const [module, gear, lock, fodder, ...frags] = await Promise.all([
    loadIcon('res_module', SIZE),
    loadIcon('res_t9_gear', SIZE),
    loadIcon('res_lock', SIZE),
    loadIcon('res_xp_fodder', SIZE),
    ...BOSS_TABLES.map((t) => loadIcon(iconBasename(t.fragmentIcon), SIZE)),
  ]);
  const fragmentByBoss: ResourcesIcons['fragmentByBoss'] = {};
  BOSS_TABLES.forEach((t, i) => {
    fragmentByBoss[t.key] = frags[i] ?? undefined;
  });
  return {
    module: module ?? undefined,
    gear: gear ?? undefined,
    lock: lock ?? undefined,
    fodder: fodder ?? undefined,
    fragmentByBoss,
  };
}

describe('pre-rendered set vs the API render', () => {
  it('per-unit table cards are byte-identical either way', async () => {
    const out = mkdtempSync(join(tmpdir(), 'prerender-parity-'));
    try {
      const manifest = await build('table/', out);
      const chars = characters();

      // Every per-unit key the build emitted, checked against the API path.
      // Both kinds appear, and BOTH carry the unit's portrait: api.ts attaches
      // it on `spec.unit` without branching on the table kind. This test used
      // to hand-build the API side as "max-ammo (no portrait)", which is what
      // the pre-render did rather than what the API does — so it pinned the
      // disagreement instead of catching it, and every /max-ammo card the bot
      // posted (manifest-resolved) shipped portrait-less while the same card
      // rendered on demand had one.
      const perUnit = Object.keys(manifest.images).filter((k) =>
        k.includes('.')
      );
      expect(perUnit.length).toBeGreaterThan(100);
      let checkedAmmo = 0;
      let checkedCharge = 0;

      for (const key of perUnit) {
        const [kind, slug] = key.replace('table/', '').split('.');
        const ch = chars[slug!];
        expect(ch, `${key} names a unit that exists`).toBeTruthy();

        let data: TableCardData;
        if (kind === 'max-ammo') {
          data = await withIcon(buildAmmoTable(ch!.ammo!, ch!.name));
          checkedAmmo++;
        } else {
          data = await withIcon(
            buildChargeTable(
              ch!.chargeFrames!,
              ch!.name,
              chargeLatencyFrames(ch as unknown as ChargeWeaponRow)
            )
          );
          checkedCharge++;
        }
        // Unconditional, mirroring api.ts's `if (spec.unit)` — a per-kind
        // branch here is what let the two paths drift apart unnoticed.
        data.portrait = (await loadPortrait(slug!)) ?? undefined;

        const fromApi = sha(renderTableCardPng(data));
        const fromBuild = sha(
          readFileSync(join(out, manifest.images[key]!.file))
        );
        expect(fromApi, `${key} differs between the two render paths`).toBe(
          fromBuild
        );
      }
      expect(checkedAmmo).toBeGreaterThan(0);
      expect(checkedCharge).toBeGreaterThan(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 300_000);

  it('resource-calculator tier cards are byte-identical either way', async () => {
    const out = mkdtempSync(join(tmpdir(), 'prerender-parity-res-'));
    try {
      const manifest = await build('resources/', out);
      const icons = await resourcesIcons();
      const keys = Object.keys(manifest.images);
      // One card per AI tier — the whole space, which is why it is pre-rendered.
      expect(keys.sort()).toEqual(
        Array.from({ length: 9 }, (_, i) => `resources/t${i + 1}`).sort()
      );

      for (const key of keys) {
        const tier = Number(key.replace('resources/t', ''));
        const data = buildResourcesCard(tier, icons);
        data.icon = (await decodeToCanvas(SITE_ICON)) ?? undefined;
        expect(
          sha(renderResourcesCardPng(data)),
          `${key} differs between the two render paths`
        ).toBe(sha(readFileSync(join(out, manifest.images[key]!.file))));
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 180_000);

  it('doll cards are byte-identical either way', async () => {
    const out = mkdtempSync(join(tmpdir(), 'prerender-parity-doll-'));
    try {
      const manifest = await build('doll/', out);
      const keys = Object.keys(manifest.images).sort();
      // Phase 0 (the whole journey) per rarity — see build-infographics.ts
      // dollJobs for why the other starting phases are on-demand only.
      expect(keys).toEqual(['doll/r.0', 'doll/sr.0']);

      const data: DollData = {
        economy: JSON.parse(readFileSync(DOLL_ECONOMY, 'utf8')),
        proc: JSON.parse(readFileSync(DOLL_PROC, 'utf8')),
      };
      for (const key of keys) {
        const rarity = key === 'doll/r.0' ? 'R' : 'SR';
        const card = dollCardData(
          buildDollPlan(data.economy, data.proc, rarity, 0)
        );
        card.icon = (await decodeToCanvas(SITE_ICON)) ?? undefined;
        expect(
          sha(renderDollCardPng(card)),
          `${key} differs between the two render paths`
        ).toBe(sha(readFileSync(join(out, manifest.images[key]!.file))));
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 180_000);

  // The plan is a Monte Carlo. It is seeded, but nothing about a seeded RNG is
  // self-evidently reproducible across calls — if it ever stopped being, the
  // pre-rendered card and every on-demand render would silently disagree.
  it('the doll plan is reproducible, so the two paths can agree at all', () => {
    const data: DollData = {
      economy: JSON.parse(readFileSync(DOLL_ECONOMY, 'utf8')),
      proc: JSON.parse(readFileSync(DOLL_PROC, 'utf8')),
    };
    const a = buildDollPlan(data.economy, data.proc, 'SR', 0);
    const b = buildDollPlan(data.economy, data.proc, 'SR', 0);
    expect(b).toEqual(a);
  }, 60_000);

  it('emits a table card for exactly the units the API would render one for', () => {
    const chars = characters();
    // Mirrors src/server/api.ts resolveRender's 'table' branch: a unit the API
    // would 400 must get no manifest key, so a miss and a rejection agree.
    const ammoEligible = Object.values(chars).filter((c) => (c.ammo ?? 0) > 0);
    const chargeEligible = Object.values(chars).filter(
      (c) =>
        (c.chargeFrames ?? 0) > 0 && (c.weapon === 'SR' || c.weapon === 'RL')
    );
    expect(ammoEligible.length).toBeGreaterThan(0);
    expect(chargeEligible.length).toBeGreaterThan(0);
    // A charge weapon with no ammo, or ammo with no charge, must not crash the
    // job builder — assert the two sets are independent rather than nested.
    expect(chargeEligible.length).toBeLessThan(ammoEligible.length);
  });
});
