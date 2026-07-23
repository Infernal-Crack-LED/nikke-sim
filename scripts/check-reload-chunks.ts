// check-reload-chunks.ts — asserts the CHUNKED-RELOAD convention baked into `reloadFrames`.
//
//   npx tsx scripts/check-reload-chunks.ts            # report + exit 1 on an unexplained unit
//   npx tsx scripts/check-reload-chunks.ts --list     # always print the full table
//
// THE MECHANIC (owner-confirmed 2026-07-22). Some units empty the magazine and then refill it in
// PARTS — they do NOT top up mid-magazine while firing. The datamined `reload_bullet` is the
// fraction restored per part, so chunks = 10000 / reload_bullet: `10000` → 1 (whole mag),
// `3300` → 3 (a 9-round shotgun loading 33/33/34), `5000` → 2 (grave, 60 → 30+30, which is her
// kit's "Heat Emission: Reload Ratio ▼50%" — she reloads half her bullets per part, so a full
// magazine costs her two parts and her effective reload time doubles).
//
// WHY THIS CHECK EXISTS. The engine has no chunk concept: it models a reload as one opaque gap of
// `char.reloadFrames`. That is numerically right today only because the upstream weapon-frames
// table (`wf` in src/data/sync.ts) hands us a PRE-MULTIPLIED whole-reload value, i.e.
//
//     reloadFrames == reload_time × chunks × 0.6 + 21          (reload_time is PER CHUNK)
//
// Nothing in the code enforced that. sync.ts falls back `wf?.reloadFrames ?? api?.reload_time ?? …`,
// so if `wf` ever misses a unit the multiplier vanishes silently and that unit reloads N× too fast
// with nothing failing. `grave` is exactly that failure, already in the tree — she is the sole
// `5000` unit and ships on the ×1 value (81 where ×2 needs 141), papered over by a hand-fitted
// `charFixes.reloadFrames: 193`. This check makes the convention explicit and loud.
//
// WHAT IT DOES NOT DECIDE. How chunks COMPOSE into a duration is unsettled — the two units with
// measured reloads disagree. Per-chunk reload tail: grave 184 f (inside her measured 171–211 f,
// n=19) but noir 141 f against a measured ~36–54 f. Tail once: grave 150 f (51 f short), noir 73 f
// (still over her measurement). No single model fits both, so this file asserts the COUNT and the
// shipped convention only, and changes no behaviour. → open-questions U30.
import { readFileSync } from 'node:fs';

interface ShotRow {
  reload_bullet?: number;
  reload_time?: number;
  max_ammo?: number;
  reload_start_ammo?: number;
}

const LIST = process.argv.includes('--list');

const chars = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const units: any[] = Array.isArray(chars) ? chars : Object.values(chars.characters ?? chars);

/** The single shot row (weapon spec) on a character entry. */
const shotRow = (u: any): ShotRow | null => {
  const walk = (o: any): ShotRow | null => {
    if (Array.isArray(o)) {
      for (const v of o) { const r = walk(v); if (r) return r; }
    } else if (o && typeof o === 'object') {
      if ('reload_bullet' in o) return o as ShotRow;
      for (const v of Object.values(o)) { const r = walk(v); if (r) return r; }
    }
    return null;
  };
  return walk(u);
};

/** Parts a full magazine is reloaded in. `reload_bullet` is the fraction restored per part (×10000). */
export const reloadChunks = (reloadBullet: number | undefined): number =>
  !reloadBullet || reloadBullet <= 0 ? 1 : Math.round(10000 / reloadBullet);

/** The shipped convention: whole-reload frames from the PER-CHUNK datamined `reload_time`. */
const expectedReloadFrames = (reloadTime: number, chunks: number): number =>
  Math.round(reloadTime * chunks * 0.6 + 21);

const rows: Array<{ slug: string; weapon: string; chunks: number; rt: number; have: number; want: number; ok: boolean }> = [];

for (const u of units) {
  const s = shotRow(u);
  if (!s || s.reload_time == null || u.reloadFrames == null) continue;
  const chunks = reloadChunks(s.reload_bullet);
  const want = expectedReloadFrames(s.reload_time, chunks);
  rows.push({
    slug: u.slug, weapon: u.weapon, chunks, rt: s.reload_time,
    have: u.reloadFrames, want, ok: Math.abs(want - u.reloadFrames) <= 1,
  });
}

// PINNED exceptions — accepted values that do NOT satisfy the convention (2026-07-22). Pinned, not
// skipped: the shipped value must still equal the pin, so drift in an exception re-flags rather than
// hiding behind the allowlist.
//   grave — the one real chunked-reload gap: sole 2-part unit shipped at the ×1 value. HELD AT 81
//           by owner decision 2026-07-22 ("for now", low priority) rather than corrected to 141,
//           because the composition question is unsettled (→ U30) and correcting the data alone
//           would change nothing anyway: her MEASURED charFixes.reloadFrames 193 (3.35 s gap, n=19)
//           overrides it. Do NOT remove that charFixes to "use" the 81 — it is measured truth
//           (constraint 3) and 81 → 92 f effective against a measured 201 f.
//   asuka / scarlet-black-shadow — single-part units a few frames off the ×1 formula (+3, +11),
//           unrelated to chunking; upstream table values, never investigated.
const PINNED: Record<string, { frames: number; why: string }> = {
  grave: { frames: 81, why: 'held at the ×1 value by owner decision 2026-07-22 (low priority → U30); masked by measured charFixes 193' },
  asuka: { frames: 84, why: 'single-part, +3 f off the ×1 formula; uninvestigated' },
  'scarlet-black-shadow': { frames: 152, why: 'single-part, +11 f off the ×1 formula; uninvestigated' },
};

const chunked = rows.filter(r => r.chunks > 1);
const bad = rows.filter(r => !r.ok);
// A pinned unit is tolerated ONLY while its shipped value still equals the pin.
const pinnedOk = (r: typeof rows[number]) => PINNED[r.slug]?.frames === r.have;
const unexpected = bad.filter(r => !pinnedOk(r));
// Units whose shipped value matches the ×1 formula while `reload_bullet` says they chunk: the
// silent-regression class this check exists to catch.
const unmultiplied = bad.filter(r => Math.abs(expectedReloadFrames(r.rt, 1) - r.have) <= 1);

if (LIST || unexpected.length) {
  console.log(`\n${'slug'.padEnd(24)}${'wpn'.padEnd(5)}${'chunks'.padStart(7)}${'reload_time'.padStart(12)}${'reloadFrames'.padStart(13)}${'expected'.padStart(10)}`);
  for (const r of [...chunked, ...bad.filter(b => b.chunks === 1)].sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(
      `${r.slug.padEnd(24)}${r.weapon.padEnd(5)}${String(r.chunks).padStart(7)}${String(r.rt).padStart(12)}` +
      `${String(r.have).padStart(13)}${String(r.want).padStart(10)}  ${r.ok ? '✓' : '✗'}`,
    );
  }
}

console.log(
  `\nreload-chunk census: ${rows.length} units — ${chunked.length} chunked ` +
  `(${chunked.filter(r => r.chunks === 3).length}× 3-part, ${chunked.filter(r => r.chunks === 2).length}× 2-part), ` +
  `${rows.length - chunked.length} single-part.`,
);

const describe = (r: typeof rows[number]) =>
  `${r.slug}: reloadFrames ${r.have}, expected ${r.want} — ` +
  (unmultiplied.includes(r) ? `SHIPPED UN-MULTIPLIED (×1 of a ${r.chunks}-part reload)` : 'off-convention');

for (const r of bad.filter(pinnedOk)) console.log(`  pinned — ${r.slug}: reloadFrames ${r.have} (convention says ${r.want}) — ${PINNED[r.slug].why}`);

if (!unexpected.length) {
  console.log('reload chunks: all reloadFrames match reload_time × chunks × 0.6 + 21 (pinned exceptions aside)');
  process.exit(0);
}

console.log(`\nreload chunks: ${unexpected.length} NEW unexplained unit(s):`);
for (const r of unexpected) console.log(`  ✗ ${describe(r)}`);
console.log(
  '\nA UN-MULTIPLIED unit reloads chunks× too fast unless a charFixes override masks it — which is\n' +
  'the silent upstream regression this gate exists to catch. A pinned unit whose value DRIFTS also\n' +
  'lands here. Investigate before adding to\n' +
  'PINNED; do NOT paper over it with a hand-fitted charFixes.',
);
process.exit(1);
