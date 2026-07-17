// Materialize skill overrides: make every src/skills/overrides/<slug>.json the
// COMPLETE description of what the unit's skills do, so the engine never parses
// skill prose at runtime (docs/DECISIONS.md 2026-07-16).
//
//   npx tsx scripts/materialize-overrides.ts            # dry-run: report + verify, write nothing
//   npx tsx scripts/materialize-overrides.ts --write    # verify + write (refuses on a verify DIFF)
//   npx tsx scripts/materialize-overrides.ts --write <slug...>   # limit to specific units
//
// For each roster unit in data/characters.json:
//   - slots the override already defines are kept VERBATIM (never overwritten);
//   - missing slots are filled from the OFFLINE kit parser run on the current prose
//     (blablalink text — the official source of truth), with runtime-inert content
//     stripped: unsupported-trigger blocks, `unsupported` effects/escalating steps,
//     then now-empty blocks;
//   - every stripped/dropped kit-text line lands VERBATIM in the new `unmodeled`
//     field (per slot) — the auditable "no silent drops" record;
//   - parser warnings for materialized slots are copied verbatim into `caveats`
//     (the display-only warning channel that replaces runtime parser warnings).
//
// VERIFY (always runs): the old runtime path (parse prose + per-slot override
// replacement, unsupported content normalized out — provably inert in the engine)
// must produce structurally identical blocks to the new pure-override assembly.
// A DIFF is a materializer bug; the migration is behavior-preserving by contract.
//
// Safe to re-run after every data sync: new units get materialized files, existing
// files only gain missing slots. Idempotent when nothing is missing.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseSkill } from './lib/kit-parser.js';
import type { OverrideFile } from '../src/skills/index.js';
import type { Block, EffectDef, SkillSlot } from '../src/skills/types.js';
import type { CharacterData } from '../src/types.js';

const SLOTS: SkillSlot[] = ['skill1', 'skill2', 'burst'];
const OVERRIDES_URL = (slug: string) =>
  new URL(`../src/skills/overrides/${slug}.json`, import.meta.url);
const BASELINE_URL = (slug: string) =>
  new URL(`../src/skills/overrides-baselines/${slug}.json`, import.meta.url);

const args = process.argv.slice(2);
const write = args.includes('--write');
const onlySlugs = args.filter((a) => !a.startsWith('--'));
const today = new Date().toISOString().slice(0, 10);

const data = JSON.parse(
  readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8')
) as { characters: Record<string, CharacterData> };

// Strip content the engine provably never executes: blocks whose trigger is
// 'unsupported' (trigger dispatch matches explicit kinds only), 'unsupported'
// effects (the effect switch has no branch for them), and 'unsupported'
// escalating steps. Returns the surviving blocks; collects stripped kit text.
function stripInert(blocks: Block[], intoUnmodeled?: string[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.trigger.kind === 'unsupported') continue; // lines already reported by the parser
    const effects: EffectDef[] = [];
    for (const e of b.effects) {
      if (e.kind === 'unsupported') continue; // raw already reported by the parser
      if (e.kind === 'escalating') {
        const steps = e.steps.filter((s) => {
          if (s.kind !== 'unsupported') return true;
          intoUnmodeled?.push(s.raw);
          return false;
        });
        if (steps.length === 0) continue;
        effects.push(steps.length === e.steps.length ? e : { ...e, steps });
        continue;
      }
      effects.push(e);
    }
    if (effects.length) out.push(effects === b.effects ? b : { ...b, effects });
  }
  return out;
}

// Canonical key order so diffs stay readable across regenerations.
const KEY_ORDER = [
  'note', 'modes', 'hasPierce', 'pierceModes', 'charFixes', 'consolidation',
  'burstSnapshotsPreFb', 'unmodeled', 'caveats', 'skill1', 'skill2', 'burst',
];
function serialize(o: Record<string, unknown>): string {
  const ordered: Record<string, unknown> = {};
  for (const k of KEY_ORDER) if (o[k] !== undefined) ordered[k] = o[k];
  for (const k of Object.keys(o)) if (!(k in ordered) && o[k] !== undefined) ordered[k] = o[k];
  return JSON.stringify(ordered, null, 2) + '\n';
}

let changed = 0;
let verified = 0;
let diffs = 0;

for (const [slug, char] of Object.entries(data.characters)) {
  if (onlySlugs.length && !onlySlugs.includes(slug)) continue;
  const path = OVERRIDES_URL(slug);
  const old: Partial<OverrideFile> = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : {};

  // ---- build the new, complete override -----------------------------------
  const next: Record<string, unknown> = { ...old };
  const unmodeled: Record<SkillSlot, string[]> = {
    skill1: [], skill2: [], burst: [],
    ...(old as any).unmodeled,
  };
  const caveats: string[] = [...((old as any).caveats ?? [])];
  const filledSlots: SkillSlot[] = [];

  for (const slot of SLOTS) {
    if (old[slot]) continue; // hand-authored (or previously materialized) — keep verbatim
    const parsed = parseSkill(char.skills[slot], slot);
    const dropped: string[] = [];
    next[slot] = stripInert(parsed.blocks, dropped);
    unmodeled[slot] = [...parsed.unmodeled, ...dropped];
    caveats.push(...parsed.warnings);
    filledSlots.push(slot);
  }
  next.unmodeled = unmodeled;
  if (caveats.length) next.caveats = caveats;

  if (filledSlots.length) {
    if (!old.note) {
      const baseline = existsSync(BASELINE_URL(slug))
        ? ` The reviewed kit-parse hypothesis lives in src/skills/overrides-baselines/${slug}.json; promote via its MANIFEST.md guardrails (it replaces this file).`
        : '';
      next.note =
        `MATERIALIZED PARSER OUTPUT (${today}) — auto-generated from the offline kit parser on the ` +
        `official (blablalink) prose; behavior-identical to the previous runtime parse; NOT hand-verified.` +
        baseline;
    } else {
      next.note =
        `${old.note} [materialized ${today}: ${filledSlots.join('/')} auto-filled from the offline ` +
        `parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified]`;
    }
  }

  // ---- verify: old runtime path ≡ new pure-override assembly --------------
  // Old path (what the engine does today): parse all slots, then per-slot
  // replacement by the OLD override. Normalize inert content out of both sides.
  const oldMerged: Block[] = [];
  const newAssembled: Block[] = [];
  for (const slot of SLOTS) {
    const oldSlot = old[slot]
      ? old[slot]!.map((b) => ({ ...b, slot }))
      : parseSkill(char.skills[slot], slot).blocks;
    oldMerged.push(...stripInert(oldSlot));
    newAssembled.push(...stripInert((next[slot] as Block[]).map((b) => ({ ...b, slot }))));
  }
  const a = JSON.stringify(oldMerged);
  const b = JSON.stringify(newAssembled);
  if (a !== b) {
    diffs++;
    console.error(`✗ ${slug}: VERIFY DIFF — old runtime blocks != materialized blocks`);
    console.error(`  old: ${a.slice(0, 400)}`);
    console.error(`  new: ${b.slice(0, 400)}`);
    continue;
  }
  verified++;

  const before = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const after = serialize(next);
  if (before === after) continue;
  changed++;
  const summary = filledSlots.length ? `materialized ${filledSlots.join('/')}` : 'metadata refresh';
  if (write) {
    writeFileSync(path, after);
    console.log(`✓ ${slug}: wrote (${summary})`);
  } else {
    console.log(`~ ${slug}: would write (${summary})`);
  }
}

console.log(
  `\n${verified} verified identical, ${changed} file(s) ${write ? 'written' : 'pending (dry-run — pass --write)'}, ${diffs} verify diff(s)`
);
if (diffs) process.exit(1);
