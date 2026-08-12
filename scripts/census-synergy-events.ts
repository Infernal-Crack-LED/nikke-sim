// census-synergy-events.ts — roster-wide emit/consume census of the two cross-unit event
// synergy surfaces: RECOVERY (heal effects → 'recovery'-triggered blocks) and SHIELD
// (shield effects → 'shielded' triggers / requiresShielded gates).
//
//   npx tsx scripts/census-synergy-events.ts             # the emit/consume tables
//   npx tsx scripts/census-synergy-events.ts --pairing   # kit heal lines vs what the override emits
//
// Review-support instrument for the faithfulness pass (audit F9): heal HP magnitudes are inert
// by design (no HP pool), but the recovery EVENT drives on-recovery consumer kits (crown-class),
// so which units emit — and how many ticks — is board-relevant in those comps. The liter S2
// cover-HP ruling (owner 2026-07-21) is the canonical trap: a cover restore encoded as a heal
// spuriously fed crown every Full Burst. This census makes the emit/consume pairing visible in
// one read instead of 183 file opens. Print-only; nothing to gate.
//
// `--pairing` is axis 6 of the phase-4 TAIL (docs/handoffs/2026-08-11-faithfulness-tail-plan.md
// §4.6, which says to READ this instrument rather than rebuild it). Reading the tables alone
// cannot answer F9's actual question — "does this unit emit exactly the recovery events its kit
// grants, no more and no fewer" — because that is a claim about the kit TEXT, which the tables
// never look at. The cross-check is what makes the read decidable, and the direction that matters
// is the FALSE EMIT: a heal effect with no heal line behind it feeds every on-recovery consumer
// (`crown`, and `asuka` (AR/Fire, not `asuka-wille`)) in every comp, which is exactly the `liter`
// cover-HP trap the owner ruled on 2026-07-21.
import { readFileSync, readdirSync } from 'node:fs';

import { HEAL_LINE, auditableLines } from './census-kit-numbers.js';
import { blocks } from './census-unmodeled-entries.js';

const OVERRIDES_DIR = new URL('../src/skills/overrides/', import.meta.url);
const CHARACTERS = new URL('../data/characters.json', import.meta.url);
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/**
 * Cover HP is NOT life. A "Restores Cover HP" line reads as a heal to any verb matcher, but the
 * owner ruling (2026-07-21, `liter` S2) is that a cover restore emits NO recovery event — encoding
 * one spuriously fed `crown` every Full Burst. So a kit line mentioning cover is EXPECTED to have
 * no emitter behind it, and counting it as a missing one would bury the real signal under the
 * trap's own shape.
 */
const COVER_LINE = /\bcover\b/i;

/**
 * A restore verb is not enough — the thing restored has to be LIFE.
 *
 * Running the cross-check for the first time put three non-life restores in the worklist:
 * `kilo` and `mori` restore SHIELD HP (a shield effect, not a recovery event) and
 * `maiden-ice-rose`'s "MP recovers by 1" restores a resource. Requiring the line to name HP, and
 * excluding cover and shield restores, is what separates "this unit heals and does not emit" from
 * "this line contains the word recovers".
 */
const NOT_LIFE = /\b(?:cover|shield)\b/i;

export function restoresLife(line: string): boolean {
  return HEAL_LINE.test(line) && /\bHP\b/i.test(line) && !NOT_LIFE.test(line);
}

/**
 * Whether a restore reaches anyone but the caster — the property the 2026-08-10 ruling turns on.
 *
 * `fireRecovery` fires the blocks of the unit that RECEIVED the heal and nobody else, and the
 * roster has exactly two recovery consumers (`asuka` (AR/Fire, not `asuka-wille`), self-scoped,
 * and `crown`, fired when she herself is healed). So a SELF-scoped non-emitted heal is inert by
 * MECHANISM unless its own carrier owns a recovery block, while an ALLY-scoped one could reach
 * `crown` in any comp containing her — which is the only direction that can cost board accuracy.
 * The target lives on the '■' header, not on the restore line, so the line alone cannot answer it.
 */
export function healScope(kitText: string, line: string): 'ally' | 'self' {
  const block = blocks(kitText).find((b) => b.includes(line));
  return block && /\ball(?:y|ies)\b/i.test(block) ? 'ally' : 'self';
}

interface Emit {
  slug: string;
  slot: string;
  trigger: string;
  target: string;
  detail: string;
}
interface Consume {
  slug: string;
  slot: string;
  kind: string; // 'recovery' | 'shielded' | 'requiresShielded'
  detail: string;
}

function walkEffects(effects: any, cb: (e: any) => void) {
  if (!Array.isArray(effects)) {
    return;
  }
  for (const e of effects) {
    if (!e || typeof e !== 'object') {
      continue;
    }
    cb(e);
    if (e.kind === 'escalating') {
      walkEffects(e.steps, cb);
    }
  }
}

const healEmits: Emit[] = [];
const shieldEmits: Emit[] = [];
const consumes: Consume[] = [];

for (const f of readdirSync(OVERRIDES_DIR).sort()) {
  if (!f.endsWith('.json')) {
    continue;
  }
  const slug = f.replace(/\.json$/, '');
  const o = JSON.parse(readFileSync(new URL(f, OVERRIDES_DIR), 'utf8'));
  for (const slot of SLOTS) {
    for (const b of o[slot] ?? []) {
      if (!b || typeof b !== 'object') {
        continue;
      }
      const trigger = b.trigger?.kind ?? '?';
      const target = b.target?.kind ?? '?';
      walkEffects(b.effects, (e) => {
        if (e.kind === 'heal') {
          healEmits.push({
            slug,
            slot,
            trigger,
            target,
            detail: e.ticks
              ? `ticks:${e.ticks}${e.intervalSec ? ` every ${e.intervalSec}s` : ''}`
              : 'instant',
          });
        }
        if (e.kind === 'shield') {
          shieldEmits.push({
            slug,
            slot,
            trigger,
            target,
            detail: e.durationSec ? `${e.durationSec}s` : 'permanent',
          });
        }
      });
      if (trigger === 'recovery') {
        consumes.push({ slug, slot, kind: 'recovery', detail: `→ ${target}` });
      }
      if (trigger === 'shielded') {
        consumes.push({ slug, slot, kind: 'shielded', detail: `→ ${target}` });
      }
      if (b.requiresShielded) {
        consumes.push({
          slug,
          slot,
          kind: 'requiresShielded',
          detail: `gate on ${trigger}`,
        });
      }
    }
  }
}

/**
 * Per-slot cross-check of kit heal LINES against heal EFFECTS. Slot-scoped on purpose: a unit that
 * heals in skill2 and emits in burst is not paired, it just happens to be non-empty in both.
 */
export function pairing(): {
  falseEmit: Array<{ slug: string; slot: string; detail: string }>;
  slotAttribution: Array<{ slug: string; slot: string; detail: string }>;
  noEmit: Array<{
    slug: string;
    slot: string;
    line: string;
    scope: 'ally' | 'self';
  }>;
  coverOnly: Array<{ slug: string; slot: string; line: string }>;
} {
  const characters = JSON.parse(readFileSync(CHARACTERS, 'utf8')).characters as
    Record<string, { skills?: Record<string, string> }> | undefined;
  const emitsBySlot = new Set(healEmits.map((e) => `${e.slug}.${e.slot}`));
  const falseEmit: Array<{ slug: string; slot: string; detail: string }> = [];
  const slotAttribution: Array<{ slug: string; slot: string; detail: string }> =
    [];
  const noEmit: Array<{
    slug: string;
    slot: string;
    line: string;
    scope: 'ally' | 'self';
  }> = [];
  const coverOnly: Array<{ slug: string; slot: string; line: string }> = [];

  for (const f of readdirSync(OVERRIDES_DIR).sort()) {
    if (!f.endsWith('.json')) {
      continue;
    }
    const slug = f.replace(/\.json$/, '');
    const skills = characters?.[slug]?.skills;
    if (!skills) {
      continue;
    }
    // A kit effect can be TRIGGERED by something outside the slot that grants it — `sin`'s skill2
    // is "Activates when using Burst Skill. … Once: Recover 15.3% of attack damage as HP", and the
    // override files that block under `burst` because that is when it fires. The override's `slot`
    // is an organizational label, not a claim about which skill printed the line, so a per-slot
    // mismatch alone cannot mean the emit is baseless. Only a unit whose WHOLE kit grants no life
    // restore is a real false emit.
    const grantsLifeAnywhere = SLOTS.some((s) =>
      auditableLines(skills[s] ?? '').some(restoresLife)
    );
    for (const slot of SLOTS) {
      const healLines = auditableLines(skills[slot] ?? '').filter((l) =>
        HEAL_LINE.test(l)
      );
      const life = healLines.filter(restoresLife);
      const emits = emitsBySlot.has(`${slug}.${slot}`);
      if (emits && life.length === 0) {
        const detail =
          healLines.length > 0
            ? 'kit heals COVER only in this slot — the liter ruling says that emits nothing'
            : 'kit prints no life restore in this slot';
        (grantsLifeAnywhere ? slotAttribution : falseEmit).push({
          slug,
          slot,
          detail,
        });
      }
      if (!emits) {
        for (const l of life) {
          noEmit.push({
            slug,
            slot,
            line: l,
            scope: healScope(skills[slot] ?? '', l),
          });
        }
        for (const l of healLines.filter((x) => COVER_LINE.test(x))) {
          coverOnly.push({ slug, slot, line: l });
        }
      }
    }
  }
  return { falseEmit, slotAttribution, noEmit, coverOnly };
}

function printPairing(): void {
  const { falseEmit, slotAttribution, noEmit, coverOnly } = pairing();
  console.log(
    "== FALSE EMIT? — the override emits a recovery event this slot's kit does not grant " +
      `(${falseEmit.length}) ==\n` +
      '   the board-relevant direction: a spurious emit feeds crown/asuka in EVERY comp'
  );
  for (const r of falseEmit) {
    console.log(`  ${r.slug.padEnd(28)} ${r.slot.padEnd(7)} ${r.detail}`);
  }
  if (falseEmit.length === 0) {
    console.log('  (none)');
  }

  console.log(
    `\n== SLOT ATTRIBUTION — emitted in one slot, granted by another (${slotAttribution.length}) ==\n` +
      '   benign for synergy: the event IS kit-granted, so consumers fire correctly. Worth knowing\n' +
      '   only because the buff engine overwrites same-caster-SLOT buffs.'
  );
  for (const r of slotAttribution) {
    console.log(`  ${r.slug.padEnd(28)} ${r.slot.padEnd(7)} ${r.detail}`);
  }
  if (slotAttribution.length === 0) {
    console.log('  (none)');
  }

  // ALLY-scoped first: those are the only ones that can reach a consumer the carrier does not own.
  const ordered = [
    ...noEmit.filter((r) => r.scope === 'ally'),
    ...noEmit.filter((r) => r.scope === 'self'),
  ];
  console.log(
    `\n== NO EMIT — the kit restores LIFE here and the override emits nothing (${noEmit.length}: ` +
      `${noEmit.filter((r) => r.scope === 'ally').length} ally-scoped, ` +
      `${noEmit.filter((r) => r.scope === 'self').length} self-scoped) ==\n` +
      '   NOT automatically a defect: the 5-carrier lifesteal non-emitter ruling (DECISIONS\n' +
      '   2026-08-10) covers d/moran/red-hood/rem/tia. SELF-scoped entries are inert by the same\n' +
      "   MECHANISM — fireRecovery only fires the receiver's own blocks, and no carrier here owns\n" +
      '   a recovery block. ALLY-scoped ones are the ones to disposition: they could reach crown.'
  );
  for (const r of ordered) {
    console.log(
      `  ${r.scope === 'ally' ? '→ALLY' : '  self'} ${r.slug.padEnd(24)} ${r.slot.padEnd(7)} ${r.line.slice(0, 78)}`
    );
  }
  if (noEmit.length === 0) {
    console.log('  (none)');
  }

  console.log(
    `\n== COVER-ONLY, no emit — expected by the liter ruling, listed so it stays visible ` +
      `(${coverOnly.length}) ==`
  );
  console.log(
    `  ${[...new Set(coverOnly.map((r) => r.slug))].join(', ') || '(none)'}`
  );
}

function printGroup(title: string, rows: Emit[]) {
  console.log(`\n== ${title} (${rows.length}) ==`);
  for (const r of rows) {
    console.log(
      `  ${r.slug.padEnd(28)} ${r.slot.padEnd(7)} on ${r.trigger.padEnd(15)} → ${r.target.padEnd(14)} ${r.detail}`
    );
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const unknown = argv.filter((a) => a !== '--pairing');
  if (unknown.length > 0) {
    console.error(
      `census-synergy-events: unrecognised argument(s): ${unknown.join(', ')}\n` +
        'expected any of: --pairing'
    );
    process.exit(2);
  }
  if (argv.includes('--pairing')) {
    printPairing();
    return;
  }

  printGroup('RECOVERY-EVENT EMITTERS (heal effects)', healEmits);
  printGroup('SHIELD EMITTERS (shield effects)', shieldEmits);

  console.log(`\n== CONSUMERS (${consumes.length}) ==`);
  for (const c of consumes) {
    console.log(
      `  ${c.slug.padEnd(28)} ${c.slot.padEnd(7)} ${c.kind.padEnd(17)} ${c.detail}`
    );
  }

  const emitterSlugs = new Set(healEmits.map((e) => e.slug));
  const recoveryConsumers = consumes.filter((c) => c.kind === 'recovery');
  console.log(
    `\nSummary: ${emitterSlugs.size} units emit recovery events, ` +
      `${new Set(recoveryConsumers.map((c) => c.slug)).size} consume them; ` +
      `${new Set(shieldEmits.map((e) => e.slug)).size} emit shields, ` +
      `${new Set(consumes.filter((c) => c.kind !== 'recovery').map((c) => c.slug)).size} consume shield state.`
  );
}

// Importable for the fixture: only run the CLI when invoked directly.
if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop()!)
) {
  main();
}
