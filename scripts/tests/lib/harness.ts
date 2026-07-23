// Shared test fixtures for the vitest suites (TDD transition step 1c, 2026-07-23).
//
// Everything a kit/primitive test needs to be ~20 lines of SPEC instead of ~80 lines of
// setup: the data files loaded once, the scope-lock comp builder, the in-memory override
// patch helper, and the generator-pool builder the roster suites share.
//
// TWO RULES this file exists to enforce:
//   1. Every sim config comes from `scopeLockCfg` (scripts/lib/scope-lock.ts is the SSOT
//      for the validation basis) — never hand-rolled, which silently drifts core/gear.
//   2. Override fixtures are patched IN MEMORY (`withPatchedOverride`) — the committed
//      JSON under src/skills/overrides/ is never touched, so writing a test never needs a
//      protected-path approval and never leaves the roster in a fixture state.
//
// Runs are deterministic: no `seed` in the config, so runSim does an expected-value pass
// and totals are byte-stable across runs (that is what makes equality assertions legal).
import { readFileSync } from 'node:fs';
import type { DataFile, Element, LevelMultiplier, SimConfig } from '../../../src/types.js';
import { runSim, type SimResult } from '../../../src/engine/sim.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
} from '../../../src/prepare.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';

const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../../../data/${file}`, import.meta.url), 'utf8')) as T;

export const data: DataFile = readJson<DataFile>('characters.json');
export const mult: LevelMultiplier = readJson<LevelMultiplier>('level-multiplier.json');
export const cubes: CubesFile = readJson<CubesFile>('cubes.json');
export const olLines: OlLinesFile = readJson<OlLinesFile>('ol-lines.json');
export const skillLevels: SkillLevelData = (() => {
  try {
    return readJson<SkillLevelData>('skill-levels.json');
  } catch {
    return {}; // optional (synced artifact)
  }
})();
export const archetypeTags: Record<string, string[]> =
  readJson<{ tags: Record<string, string[]> }>('archetype-tags.json').tags;

/** Every sim/generator fixture shares this dependency bundle. */
export const deps = { skillLevels, cubes, olLines };

/**
 * Load a unit's committed override, deep-clone it, and hand the clone to `mutate`.
 * The committed JSON on disk is NEVER modified — the clone exists only for this run.
 * Throws if the unit has no override (a stale fixture must fail loudly, not silently
 * test a default-parsed unit).
 */
export function withPatchedOverride(slug: string, mutate: (ov: any) => void): OverrideFile {
  const base = loadOverride(slug);
  if (!base) throw new Error(`${slug}: no override on disk — fixture is stale`);
  const clone = JSON.parse(JSON.stringify(base));
  mutate(clone);
  return clone as OverrideFile;
}

export interface CompOptions {
  slugs: string[];
  /** null = forced-neutral boss ("none"). */
  bossElement: Element | null;
  /** Camera-focused unit (×2.5 burst gauge on a charge weapon). Defaults to the middle slot. */
  focusSlug?: string;
  /** In-memory override patches, by slug. Unpatched slugs load from disk. */
  overrides?: Record<string, OverrideFile | undefined>;
  /** Extra SimConfig fields (still on the scope-lock basis). */
  cfg?: Partial<SimConfig>;
}

/** Run a scope-lock comp. Deterministic (no seed) unless `cfg.seed` is passed. */
export function runComp(o: CompOptions): SimResult {
  const overrides: Record<string, OverrideFile | undefined> = {};
  for (const s of o.slugs) overrides[s] = o.overrides?.[s] ?? loadOverride(s);
  const chars = o.slugs.map((s) => {
    const c = data.characters[s];
    if (!c) throw new Error(`${s}: not in characters.json — fixture is stale`);
    return c;
  });
  const prepared = prepareTeam(
    chars,
    o.slugs.map(() => ({ doll: false, ol: 'base5' as const })),
    { overrides, ...deps },
  );
  const cfg = scopeLockCfg(
    o.slugs,
    o.bossElement,
    o.focusSlug ? { focusSlug: o.focusSlug, ...o.cfg } : { ...o.cfg },
  );
  return runSim(chars, mult, cfg, prepared);
}

/** Per-unit total damage, keyed by slug. */
export function totals(res: SimResult): Record<string, number> {
  return Object.fromEntries(res.units.map((u) => [u.slug, u.totalDamage]));
}

/** A unit's result row, by slug. Throws if the unit was not in the comp. */
export function unitOf(res: SimResult, slug: string) {
  const u = res.units.find((x) => x.slug === slug);
  if (!u) throw new Error(`${slug} not in this comp`);
  return u;
}

/**
 * The 720-kit-audit CONTROL COMP: liter (B1) / crown (B2) / carry (B3) / `helm` (B3 —
 * the SR/Water Helm, NOT helm-aquamarine), boss Fire, focus = the slot-3 carry (slot 5
 * is empty). Byte-identical to the comps in scripts/control-regression.ts. The core is
 * constant across the four
 * control recordings (scripts/control-regression.ts), which is why it is the default
 * fixture for any test that needs bursts to actually be CAST — a lone Burst III unit
 * makes ZERO Full Bursts, so a solo fixture can never exercise a burst-gated line.
 */
export const CONTROL_CORE = ['liter', 'crown'] as const;
export const controlComp = (carry: string, helm = true): CompOptions => ({
  slugs: [...CONTROL_CORE, carry, ...(helm ? ['helm'] : [])],
  bossElement: 'Fire',
  focusSlug: carry,
});

// ---- clean-weapon (bare-weapon) fixtures ---------------------------------------------
// The BASE WEAPON faithfulness basis (owner, 2026-07-23; candidates ruled in
// docs/data/clean-weapons.md). Six units — one per weapon class — whose kits contribute
// NOTHING to damage, so a recording of them measures the engine's weapon model alone,
// with no kit encoding in the way.

/**
 * A synthetic EMPTY kit. All three slots are present-but-empty, which is exactly what
 * `resolveSkills` requires of an override, so the unit prepares cleanly and contributes
 * nothing but its weapon.
 *
 * These six units have NO override on disk (`simSupported: false`), and `resolveSkills`
 * THROWS for a unit that has prose but no override — so the fixture must supply one.
 * Synthesizing it here (rather than authoring six override files) keeps the base-weapon
 * basis out of `src/skills/overrides/` entirely: there is no committed encoding that
 * could drift away from "bare weapon", and no protected-path edit to approve.
 */
export function bareWeaponOverride(slug: string): OverrideFile {
  return { slug, skill1: [], skill2: [], burst: [] } as unknown as OverrideFile;
}

/**
 * The ONLY boss element neutral for all six (proved through the engine in
 * clean-weapons.test.ts, not just read off the wheel): Iron. Every other element hands
 * at least one of them the ×1.1 elemental major. `null` is also neutral, by construction.
 */
export const CLEAN_WEAPON_BOSS_ELEMENT: Element = 'Iron';

/**
 * Two teams of three — the owner cannot field the six as one team.
 *
 * The split is by BURST STAGE so the two teams disagree about bursting for a SECOND,
 * independent reason: team A has no Burst I unit, so its chain could never open even if
 * bursting were left on. `cfg.disableBursts` already guarantees zero casts for BOTH teams,
 * which makes team A a redundant structural check on that flag rather than the thing holding
 * the basis up. Each team fields three DISTINCT weapon classes; together they cover all six.
 */
export const CLEAN_WEAPON_TEAMS = {
  /** Burst II — also structurally unable to open a chain. AR / SG / SR. */
  a: ['folkwang', 'marciana', 'snow-crane'],
  /** Burst I — would cast if bursting were on, which is what makes it the real test. MG / RL / SMG. */
  b: ['emma', 'claire', 'idoll-ocean'],
} as const;

export const CLEAN_WEAPON_SLUGS = [...CLEAN_WEAPON_TEAMS.a, ...CLEAN_WEAPON_TEAMS.b];

/**
 * A bare-weapon comp: every slug's kit zeroed, bursting turned OFF, on the neutral-for-all
 * boss. `disableBursts` matches how the owner records these fights (bursting is off in game),
 * so the sim models that directly rather than relying on the units' burst blocks being empty.
 */
export const bareWeaponComp = (
  slugs: readonly string[],
  extra: Partial<CompOptions> = {},
): CompOptions => ({
  slugs: [...slugs],
  bossElement: CLEAN_WEAPON_BOSS_ELEMENT,
  overrides: Object.fromEntries(slugs.map((s) => [s, bareWeaponOverride(s)])),
  ...extra,
  cfg: { disableBursts: true, ...extra.cfg },
});

// ---- generator-suite pool ------------------------------------------------------------
// The roster/team generators run over `generatorSupported && simSupported` units — the
// same pool the web app builds. Kept here so the six generator suites agree on it.

export interface GeneratorPool {
  genChars: DataFile['characters'][string][];
  chars: Record<string, DataFile['characters'][string]>;
  overrides: Record<string, OverrideFile | undefined>;
}

export function generatorPool(): GeneratorPool {
  const genChars = Object.values(data.characters).filter(
    (c) => c.generatorSupported && c.simSupported,
  );
  const chars = Object.fromEntries(genChars.map((c) => [c.slug, c]));
  const overrides: Record<string, OverrideFile | undefined> = {};
  for (const c of genChars) overrides[c.slug] = loadOverride(c.slug);
  return { genChars, chars, overrides };
}

/** Effective burst class for generator selection — red-hood (the only Λ) is force-pinned
 *  to B3 by the generator (FORCED_BURST in src/teamcalc.ts). */
export const effBurst = (chars: Record<string, any>, slug: string): string =>
  slug === 'red-hood' ? 'III' : chars[slug].burst;

/** Mirror of teamcalc's stageCovered: a burst stage is sustainable iff ≥1 caster is ≤20s
 *  (covers every ~20s Full Burst cycle alone) or ≥2 casters are ≤40s (alternating). */
export function stageCovered(
  chars: Record<string, any>,
  slugs: string[],
  stage: 'I' | 'II',
): boolean {
  let short = 0;
  let pair = 0;
  for (const s of slugs) {
    if (effBurst(chars, s) !== stage) continue;
    const cd = chars[s].burstCooldownSec;
    if (cd <= 20) short++;
    else if (cd <= 40) pair++;
  }
  return short >= 1 || short + pair >= 2;
}

export const rotationLegal = (chars: Record<string, any>, slugs: string[]): boolean =>
  stageCovered(chars, slugs, 'I') && stageCovered(chars, slugs, 'II');

/** A generated team is 5 distinct units. */
export const distinct5 = (slugs: string[]): boolean =>
  slugs.length === 5 && new Set(slugs).size === 5;
