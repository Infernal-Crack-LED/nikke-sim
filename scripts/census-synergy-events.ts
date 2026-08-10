// census-synergy-events.ts — roster-wide emit/consume census of the two cross-unit event
// synergy surfaces: RECOVERY (heal effects → 'recovery'-triggered blocks) and SHIELD
// (shield effects → 'shielded' triggers / requiresShielded gates).
//
//   npx tsx scripts/census-synergy-events.ts
//
// Review-support instrument for the faithfulness pass (audit F9): heal HP magnitudes are inert
// by design (no HP pool), but the recovery EVENT drives on-recovery consumer kits (crown-class),
// so which units emit — and how many ticks — is board-relevant in those comps. The liter S2
// cover-HP ruling (owner 2026-07-21) is the canonical trap: a cover restore encoded as a heal
// spuriously fed crown every Full Burst. This census makes the emit/consume pairing visible in
// one read instead of 183 file opens. Print-only; nothing to gate.
import { readFileSync, readdirSync } from 'node:fs';

const OVERRIDES_DIR = new URL('../src/skills/overrides/', import.meta.url);
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

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

function printGroup(title: string, rows: Emit[]) {
  console.log(`\n== ${title} (${rows.length}) ==`);
  for (const r of rows) {
    console.log(
      `  ${r.slug.padEnd(28)} ${r.slot.padEnd(7)} on ${r.trigger.padEnd(15)} → ${r.target.padEnd(14)} ${r.detail}`
    );
  }
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
