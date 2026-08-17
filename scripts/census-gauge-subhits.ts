// census-gauge-subhits.ts — multi-hit DAMAGE lines vs the `flatDamage.gaugeHits` field that
// credits their burst gauge. Built 2026-08-17 for the `liberalio` gauge-credit audit
// (docs/handoffs/QUEUE.md, burst-generation thread).
//
//   npx tsx scripts/census-gauge-subhits.ts             # the worklist (candidates + accounting)
//   npx tsx scripts/census-gauge-subhits.ts --all       # every matched line, accounted or not
//   npx tsx scripts/census-gauge-subhits.ts --skipped    # what this census could NOT see
//   npx tsx scripts/census-gauge-subhits.ts --rl3        # the rl3 impact-count reconciliation
//   npx tsx scripts/census-gauge-subhits.ts --json       # machine-readable rows
//
// WHY THIS EXISTS. `docs/data/burst-gauge.md` §5: every skill/additional-damage impact generates the
// caster's `targetPerTrigger / hitsPerShot`, with no focus bonus. Anchor: `maiden-ice-rose`'s rider
// sub-step measured 3.45% vs her modeled 3.64% (targetPerTrigger 364) — flat and un-focus-multiplied
// is CONFIRMED, the magnitude is −5.2% off and open (U28). Do NOT cite this anchor as "exactly 364";
// that overstates it (the engine comment at src/engine/sim.ts:1583-1584 does, and is wrong).
// The engine keeps a sequential multi-hit as ONE aggregated
// damage instance to preserve tuned totals, so the HIT COUNT has to be carried separately: that is
// `flatDamage.gaugeHits` (src/skills/types.ts), which fires `skillGauge()` N times
// (src/engine/sim.ts, the `case 'flatDamage'` gaugeHits loop). Omitting it on a genuinely
// multi-hit line silently credits 1 impact where the kit delivers N — a gauge-only defect that is
// INVISIBLE in damage totals, which is exactly why it survives a damage-tuned override review.
//
// WHAT COUNTS AS A CANDIDATE. A single kit line that carries BOTH a damage clause and a
// multi-activation count. Both halves are required: a count on a non-damage line is a use-count
// limiter, not a multi-hit (see the LIMITER class below), and a damage clause with no count is an
// ordinary single-impact rider.
//
// THE TWO PHRASINGS ARE NOT INTERCHANGEABLE, AND THAT IS THE WHOLE POINT. The tree writes the same
// mechanic two ways, and a census that knows only one of them reads the other as absent:
//   * "Attacks sequentially N time(s)"  — eve, little-mermaid (both carry gaugeHits)
//   * "Activates N time(s)"             — liberalio ("Deals 40.5% ... Activates 5 times.")
// The first draft of this census matched only /Activates (\d+) time/ and therefore returned all
// three known-good `gaugeHits` users as NOT FOUND while reporting "coverage" — the census-holes
// failure mode recorded in memory. Hence `--skipped`: any line carrying a digit next to "time"
// that this matcher does NOT classify is printed LOUD, never silently dropped.
//
// THE LIMITER CLASS — "Activates N time(s) PER BATTLE" is a charge/use cap, not a hit count
// (`neon-vision-eye` Invulnerable ×5, `biscuit` Invincible ×2). Those lines deal no damage and
// must never acquire a gaugeHits. They are classified and counted, not skipped, so the worklist
// cannot quietly grow them back.
//
// WHAT IT CANNOT SEE (printed by --skipped):
//   * A multi-hit whose count lives in prose this matcher does not recognise ("volley", "barrage",
//     a bare "x3") — the --skipped list is the honest bound on recall.
//   * Whether an EXISTING gaugeHits value is the RIGHT count; it only compares kit N vs field N.
//   * Multi-hit lines correctly modeled as N separate effects rather than one aggregate + gaugeHits
//     (that encoding needs no gaugeHits and reads here as a mismatch — check the override).
//   * Damage delivered by a `dot`/`hitRepeat` (those credit per tick/impact already) or by a
//     weapon swap.
import { readFileSync, existsSync } from 'node:fs';

type Row = {
  slug: string;
  slot: string;
  kitCount: number;
  phrasing: 'sequential' | 'activates';
  line: string;
  hasOverride: boolean;
  encoding: 'aggregated' | 'perHit' | 'notModeled';
  gaugeHits: number | null;
  accounted: boolean;
  targetPerTrigger: number | null;
  perTriggerGaugeMissed: number | null;
};

const root = new URL('..', import.meta.url);
const readJson = (rel: string) =>
  JSON.parse(readFileSync(new URL(rel, root), 'utf8'));

const chars = readJson('data/characters.json').characters as Record<
  string,
  { skills?: Record<string, string>; weapon?: string; rl3?: number | null }
>;
const gaugeTable = readJson('data/gauge-per-shot.json') as Record<
  string,
  { basePerTrigger?: number; targetPerTrigger?: number }
>;

const GAUGE_MODAL_BY_WEAPON: Record<string, number> = {
  AR: 40,
  SMG: 20,
  SG: 400,
  SR: 560,
  RL: 280,
  MG: 10,
};

// A damage clause: the kit's own wording for "this line deals damage".
const DAMAGE_RE =
  /deals\s+[\d.]+%\s+of\s+final\s+ATK|as\s+(?:additional\s+)?damage/i;
// The two recognised multi-activation phrasings.
const SEQUENTIAL_RE = /attacks?\s+sequentially\s+(?:for\s+)?(\d+)\s+time/i;
const ACTIVATES_RE = /activates\s+(\d+)\s+time/i;
// A use-count limiter, not a hit count.
const PER_BATTLE_RE = /per\s+battle/i;
// The naive cross-check: any digit adjacent to "time". Anything matching this but classified by
// nothing above is a recall hole and gets printed.
const NAIVE_RE = /(\d+)\s*time/i;

const overrideFor = (slug: string) => {
  const path = new URL(`src/skills/overrides/${slug}.json`, root);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};

// Bind a kit LINE to the override effect that carries it, by MAGNITUDE rather than by slot.
// A multi-hit line prints a per-hit percentage and a count, so the override has exactly two
// faithful encodings and they are distinguishable arithmetically:
//   * AGGREGATED  — one flatDamage at (perHit x N). Needs `gaugeHits: N`, because the engine sees
//     a single impact. This is the shape the engine comment describes and the one that can be
//     silently wrong.
//   * PER-HIT     — N separate flatDamage effects at perHit each. Needs NO gaugeHits: each effect
//     already fires its own skillGauge.
// Matching on magnitude (not on "any gaugeHits anywhere in the file") is what makes the row
// trustworthy — the first draft took the file-wide MAX and reported `little-mermaid`'s unmodeled
// 4-hit line as though it carried the 10 from her Bubble Barrage.
type Match =
  | { kind: 'aggregated'; gaugeHits: number | null }
  | { kind: 'perHit'; count: number }
  | { kind: 'notModeled' };

const flatDamagesIn = (ov: unknown): Record<string, unknown>[] => {
  const out: Record<string, unknown>[] = [];
  const walk = (n: unknown) => {
    if (Array.isArray(n)) {
      return n.forEach(walk);
    }
    if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      if (o.kind === 'flatDamage') {
        out.push(o);
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(ov);
  return out;
};

const near = (a: number, b: number) => Math.abs(a - b) < 0.05;

const matchLine = (
  ov: unknown,
  perHit: number | null,
  count: number
): Match => {
  if (ov == null || perHit == null) {
    return { kind: 'notModeled' };
  }
  const fds = flatDamagesIn(ov);
  const agg = fds.find((e) => near(Number(e.atkPct), perHit * count));
  if (agg) {
    return {
      kind: 'aggregated',
      gaugeHits: typeof agg.gaugeHits === 'number' ? agg.gaugeHits : null,
    };
  }
  const perHitEffects = fds.filter((e) => near(Number(e.atkPct), perHit));
  if (perHitEffects.length) {
    return { kind: 'perHit', count: perHitEffects.length };
  }
  return { kind: 'notModeled' };
};

const rows: Row[] = [];
const limiters: { slug: string; slot: string; line: string }[] = [];
const skipped: { slug: string; slot: string; line: string; why: string }[] = [];

for (const [slug, c] of Object.entries(chars)) {
  const skills = c.skills;
  if (!skills || typeof skills !== 'object') {
    continue;
  }
  for (const [slot, prose] of Object.entries(skills)) {
    if (typeof prose !== 'string') {
      continue;
    }
    for (const raw of prose.split('\n')) {
      const line = raw.replace(/^■\s*/, '').trim();
      if (!line) {
        continue;
      }
      const seq = SEQUENTIAL_RE.exec(line);
      const act = ACTIVATES_RE.exec(line);
      const isDamage = DAMAGE_RE.test(line);

      if (seq || act) {
        const kitCount = Number((seq ?? act)![1]);
        if (!isDamage) {
          // Classified, not skipped: a count on a non-damage line.
          limiters.push({ slug, slot, line });
          continue;
        }
        if (PER_BATTLE_RE.test(line)) {
          // A damage line capped per battle is a use limiter on the CAST, not sub-hits.
          limiters.push({ slug, slot, line });
          continue;
        }
        if (kitCount <= 1) {
          continue;
        } // "Activates 1 time" is a single impact — no-op here.

        const ov = overrideFor(slug);
        const perHitPct = /deals\s+([\d.]+)%\s+of\s+final\s+ATK/i.exec(line);
        const m = matchLine(
          ov,
          perHitPct ? Number(perHitPct[1]) : null,
          kitCount
        );
        const tpt =
          gaugeTable[slug]?.targetPerTrigger ??
          GAUGE_MODAL_BY_WEAPON[c.weapon ?? ''] ??
          null;
        const gh = m.kind === 'aggregated' ? m.gaugeHits : null;
        // Accounted = the credit matches the kit's hit count, by EITHER faithful encoding.
        // notModeled is out of scope, not a defect: the line is absent from the damage model
        // entirely (check the override's `unmodeled`), so there is no gauge credit to fix.
        const accounted =
          (m.kind === 'aggregated' && m.gaugeHits === kitCount) ||
          (m.kind === 'perHit' && m.count === kitCount) ||
          m.kind === 'notModeled';
        rows.push({
          slug,
          slot,
          kitCount,
          phrasing: seq ? 'sequential' : 'activates',
          line,
          hasOverride: !!ov,
          encoding: m.kind,
          gaugeHits: gh,
          accounted,
          targetPerTrigger: tpt,
          perTriggerGaugeMissed:
            accounted || tpt == null || m.kind !== 'aggregated'
              ? null
              : ((kitCount - (gh ?? 1)) * tpt) / 100,
        });
        continue;
      }

      // Recall check — a digit next to "time" that neither phrasing claimed.
      if (NAIVE_RE.test(line)) {
        skipped.push({
          slug,
          slot,
          line,
          why: isDamage
            ? 'DAMAGE line with an unrecognised count phrasing'
            : 'non-damage line with a count',
        });
      }
    }
  }
}

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);

if (has('--json')) {
  console.log(JSON.stringify({ rows, limiters, skipped }, null, 2));
  process.exit(0);
}

if (has('--skipped')) {
  // Only the damage-line holes are a real recall bound; the rest is noise (durations, stack caps).
  const real = skipped.filter((s) => s.why.startsWith('DAMAGE'));
  console.log(
    `UNCLASSIFIED damage lines carrying a count (recall holes): ${real.length}`
  );
  for (const s of real) {
    console.log(`  ${s.slug} [${s.slot}] ${s.line}`);
  }
  console.log(
    `\nOther count-bearing lines this census deliberately ignores: ${skipped.length - real.length}`
  );
  process.exit(0);
}

if (has('--rl3')) {
  // ⚠ THIS MODE IS A FLAG, NOT A CONFIRMATION (verified 2026-08-17 — read this before citing it).
  // `rl3` is ONE scalar over (window length x cadence x per-impact energy x impacts), so dividing it
  // out does NOT identify impacts-per-trigger: both the BASIS (a factor of 2 — burst-gauge.md §7 says
  // base, helm.json's worked example only balances on target) and the PULL COUNT (rl3's implied count
  // omits the 22f SR bolt recovery and disagrees with our datamined cadence in every charge case) are
  // free. `liberalio`'s 33.6 fits 6, 3 or 12 impacts per trigger equally well. What the column CAN do
  // is flag that a unit generates more than its plain weapon class predicts, and bound that excess in
  // base-units. Never use it as the confirming leg for a per-unit gauge constant.
  console.log(
    'rl3 impact-count reconciliation — FLAG ONLY, not a confirmation (see the header note).\n' +
      'rl3 / basePerTrigger% = base-value impact-EQUIVALENTS per ~3s opener; the split into\n' +
      'pulls x impacts-per-pull is NOT identified by this column.\n'
  );
  console.log(
    `${'slug'.padEnd(24)} ${'wpn'.padEnd(4)} ${'rl3'.padStart(7)} ${'base%'.padStart(6)} ${'impacts'.padStart(8)}  kit sub-hits`
  );
  for (const r of rows) {
    const c = chars[r.slug];
    const base = gaugeTable[r.slug]?.basePerTrigger ?? null;
    if (c?.rl3 == null || base == null) {
      console.log(`${r.slug.padEnd(24)} (no rl3 or no base row)`);
      continue;
    }
    const impacts = c.rl3 / (base / 100);
    console.log(
      `${r.slug.padEnd(24)} ${(c.weapon ?? '?').padEnd(4)} ${c.rl3.toFixed(2).padStart(7)} ${(base / 100).toFixed(2).padStart(6)} ${impacts.toFixed(2).padStart(8)}  ${r.kitCount} (+1 bullet = ${r.kitCount + 1}/trigger)`
    );
  }
  process.exit(0);
}

const show = has('--all') ? rows : rows.filter((r) => !r.accounted);
console.log(
  `multi-hit DAMAGE lines: ${rows.length} matched | accounted (gaugeHits === kit N): ${rows.filter((r) => r.accounted).length} | UNACCOUNTED: ${rows.filter((r) => !r.accounted).length}`
);
console.log(
  `use-count limiters correctly excluded: ${limiters.length} | unclassified count-bearing lines: ${skipped.length} (see --skipped)\n`
);
console.log(
  `${'slug'.padEnd(24)} ${'slot'.padEnd(7)} ${'kitN'.padStart(4)} ${'field'.padStart(5)} ${'encoding'.padEnd(11)} ${'phrasing'.padEnd(10)} missed gauge/trigger`
);
for (const r of show) {
  console.log(
    `${r.slug.padEnd(24)} ${r.slot.padEnd(7)} ${String(r.kitCount).padStart(4)} ${String(r.gaugeHits ?? '-').padStart(5)} ${r.encoding.padEnd(11)} ${r.phrasing.padEnd(10)} ${r.perTriggerGaugeMissed == null ? '-' : `${r.perTriggerGaugeMissed.toFixed(1)}%`}`
  );
  if (!has('--all')) {
    console.log(`${' '.repeat(26)}kit: ${r.line}`);
  }
}
if (!show.length) {
  console.log('  (none)');
}
