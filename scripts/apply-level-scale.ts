// Apply `levelScale` / `levelConst` annotations to override files from a declarative table.
//
// Each row states WHERE the authored number came from, and every row's justification is a quote
// from that unit's OWN override note (or its kit text) — not a numeric search. That distinction
// matters: `scripts/audit-skill-scaling.ts` prints a "← 60 × 12" style hint, but that hint is a
// brute-force search over the level table and finds coincidences. eve's 720% is the worked
// example — the hint said `60 × 12`, while her note says "240% x3 sequential = 720%", so the real
// anchor is 240. Always read the note.
//
//   npx tsx scripts/apply-level-scale.ts            # apply every row, rewrite the JSONs
//   npx tsx scripts/apply-level-scale.ts --check    # report only, touch nothing
//
// Idempotent: a row whose annotation is already present is a no-op. A row that matches no effect
// (or matches more than one candidate ambiguously) is a hard error — the table must not rot
// silently against the overrides it annotates.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

type Slot = 'skill1' | 'skill2' | 'burst';

interface Row {
  slug: string;
  slot: Slot;
  /** effect kind, to disambiguate two effects sharing a value */
  kind: string;
  /** the numeric field on that effect */
  field: string;
  /** the authored value, used to locate the effect */
  value: number;
  /** table anchors the value was derived from; omit for `const` */
  anchors?: number[];
  /** true = verified level-INVARIANT, stop warning */
  const?: boolean;
  /** why — a quote from the unit's own note or kit text */
  why: string;
}

const ROWS: Row[] = [
  // ---- little-mermaid: note states both derivations verbatim -----------------------------
  {
    slug: 'little-mermaid',
    slot: 'skill2',
    kind: 'dot',
    field: 'atkPct',
    value: 253.44,
    anchors: [63.36],
    why: 'note: "every 1s during Full Burst, 63.36% x4 to random enemies\' = 253.44%/s"',
  },
  {
    slug: 'little-mermaid',
    slot: 'skill2',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 850,
    anchors: [85],
    why: 'note: "Bubble Barrage \'85% x10 each time allies expend 500 ammo\' = 850%"',
  },

  // ---- eve: the hint said 60x12; her NOTE says 240x3. The note wins. ---------------------
  {
    slug: 'eve',
    slot: 'skill1',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 720,
    anchors: [240],
    why: 'note: "Unstable Energy: per 44 CRIT normal hits -> 240% x3 sequential = 720%"',
  },
  {
    slug: 'eve',
    slot: 'burst',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 2742.84,
    anchors: [457.14],
    why: 'note: "457.14 x6 sequential nuke"',
  },
  {
    slug: 'eve',
    slot: 'burst',
    kind: 'buff',
    field: 'value',
    value: 100,
    const: true,
    why: 'note: Mk2 "doubles S1+S2" encoded as sequentialMultPct +100 — a x2 expressed in percent, structural, not a kit magnitude',
  },

  // ---- mihara-bonding-chain: per-chain value x chain count -------------------------------
  {
    slug: 'mihara-bonding-chain',
    slot: 'skill1',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 500.6,
    anchors: [50.06],
    why: 'note: "one 50.06% hit per chain ... 500.6% (10 x 50.06) flatDamage dump"',
  },
  {
    slug: 'mihara-bonding-chain',
    slot: 'burst',
    kind: 'dot',
    field: 'atkPct',
    value: 1001,
    anchors: [50.05],
    why: 'note: "the full 1001%/s (20 x 50.05)"',
  },

  // ---- guillotine-winter-slayer: per-stack value x 11 stacks -----------------------------
  {
    slug: 'guillotine-winter-slayer',
    slot: 'skill1',
    kind: 'buff',
    field: 'value',
    value: 12.76,
    anchors: [1.16],
    why: 'note: "1.16 x 11 = 12.76"',
  },
  {
    slug: 'guillotine-winter-slayer',
    slot: 'skill1',
    kind: 'buff',
    field: 'value',
    value: 10.01,
    anchors: [0.91],
    why: 'note: "0.91 x 11 = 10.01"',
  },
  {
    slug: 'guillotine-winter-slayer',
    slot: 'burst',
    kind: 'dot',
    field: 'atkPct',
    value: 229.57,
    anchors: [20.87],
    why: 'note: "a 229.57%/s dot for 10s on the boss (= 20.87 x 11)"',
  },

  // ---- neon-vision-eye: burst-gen line is "5% x Firepower Gauge charge" -------------------
  {
    slug: 'neon-vision-eye',
    slot: 'skill2',
    kind: 'buff',
    field: 'value',
    value: 330,
    anchors: [5],
    why: 'note: "\'Burst Gauge filling speed ▲5% × Firepower Gauge charge for 5s\' = everyN:3 self burstGenPct 330/500"',
  },
  {
    slug: 'neon-vision-eye',
    slot: 'skill2',
    kind: 'buff',
    field: 'value',
    value: 500,
    anchors: [5],
    why: 'note: same 5%-per-charge line at full (100) Firepower Gauge',
  },
  // ---- mast-romantic-maid: every value is the kit line x2 stacks -------------------------
  {
    slug: 'mast-romantic-maid',
    slot: 'skill1',
    kind: 'buff',
    field: 'value',
    value: -40,
    anchors: [20],
    why: 'note: "Drunken\'s Hit Rate ▼20% per stack means that at the average 2 stacks roughly 40% of her MG rounds miss, modeled as normalAttackPct -40"',
  },
  {
    slug: 'mast-romantic-maid',
    slot: 'skill2',
    kind: 'buff',
    field: 'value',
    value: 30.06,
    anchors: [15.03],
    why: 'note: "15.03 x 2 = 30.06% Distributed Damage"',
  },
  {
    slug: 'mast-romantic-maid',
    slot: 'skill2',
    kind: 'buff',
    field: 'value',
    value: 30.08,
    anchors: [15.04],
    why: 'note: "15.04 x 2 = 30.08% Reload Speed for 10s"',
  },
  {
    slug: 'mast-romantic-maid',
    slot: 'burst',
    kind: 'buff',
    field: 'value',
    value: 40.12,
    anchors: [20.06],
    why: 'note: "20.06 x 2 = 40.12%"',
  },

  // ---- ein: all three are multiples of the same 90.81% feather --------------------------
  // ein skill1's 363.24 is 4 x 90.81, but 90.81 lives in her SKILL2 table — skill1's only
  // varying entry is 70.12, which does not divide it. A cross-slot anchor is not expressible
  // (and would scale off the wrong slot's level anyway), so this one is deliberately left
  // WARNING rather than annotated. See the handoff doc's cross-slot note.
  {
    slug: 'ein',
    slot: 'skill2',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 3087.54,
    anchors: [90.81],
    why: 'note: "34 x 90.81 = 3087.54"',
  },
  {
    slug: 'ein',
    slot: 'skill2',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 544.86,
    anchors: [90.81],
    why: 'note: "6 x 90.81 = 544.86 (fires each rotation)"',
  },

  // ---- snow-white-heavy-arms: multiples of the 105.59% volley shot -----------------------
  // The audit hint offered `42.24 x 25` for 1055.9, but that is 1056.0 — off by 0.1. The note's
  // own 105.59% volley shot divides it EXACTLY (x10), and is the same anchor as the 527.95 line.
  {
    slug: 'snow-white-heavy-arms',
    slot: 'skill1',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 527.95,
    anchors: [105.59],
    why: 'note: "527.95% sequential — the baseline volley, 105.59 x 5"',
  },
  {
    slug: 'snow-white-heavy-arms',
    slot: 'skill1',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 1055.9,
    anchors: [105.59],
    why: 'note: "fullCharge, swapGate:\'swapped\': +1055.9% sequential" = the same 105.59 volley shot x10 (exact; 42.24 x 25 = 1056.0, not this value)',
  },
  {
    slug: 'snow-white-heavy-arms',
    slot: 'burst',
    kind: 'weaponSwap',
    field: 'damagePct',
    value: 69.04,
    const: true,
    why: 'note: "weaponSwap: the same 69.04% shot" — 69.04 IS her AR normalAttackMultiplier, a weapon stat. ⚑ OPEN: this swap may warrant sameWeapon:true, which would also change its ammo economy (no magazine refill at either end) — a behaviour change, deliberately NOT made here',
  },

  // ---- sakura-bloom-in-summer -----------------------------------------------------------
  {
    slug: 'sakura-bloom-in-summer',
    slot: 'skill2',
    kind: 'buff',
    field: 'value',
    value: 7.82,
    anchors: [15.64],
    why: 'note: "Dancing Flower attackDamagePct 15.64" time-averaged: "15.64 x 90/180 = 7.82"',
  },
  {
    slug: 'sakura-bloom-in-summer',
    slot: 'burst',
    kind: 'dot',
    field: 'atkPct',
    value: 351.6,
    anchors: [35.16],
    why: 'note: "35.16%/s x10 stacks ... = one dot 351.6%/s"',
  },

  // ---- verified level-INVARIANT sentinels / cooldown constants ---------------------------
  {
    slug: 'prika',
    slot: 'skill2',
    kind: 'burstCdr',
    field: 'seconds',
    value: -9999,
    const: true,
    why: 'note: "a burstCast burstCdr -9999 (she then locks out)" — a lockout SENTINEL, not a duration',
  },
  {
    slug: 'red-hood',
    slot: 'burst',
    kind: 'burstCdr',
    field: 'seconds',
    value: 40,
    const: true,
    why: 'equals her own burstCooldownSec (40) — a burst-cooldown constant, not a level-scaled skill magnitude',
  },
  // ---- kit-text-confirmed "value x stack count" lines ------------------------------------
  // Each of these reads "<X>% ... Mirrors/x the stack count of <thing>" in the PRIMARY kit text
  // (data/characters.json skills), and the override bakes the max-stack product.
  {
    slug: 'arcana-fortune-mate',
    slot: 'skill1',
    kind: 'buff',
    field: 'value',
    value: 39,
    anchors: [13],
    why: 'kit: "ATK ▲ 13% of the skill user\'s ATK x stack count of Precious Moments" — baked at the 3-stack cap',
  },
  {
    slug: 'arcana-fortune-mate',
    slot: 'skill1',
    kind: 'buff',
    field: 'value',
    value: 30,
    const: true,
    why: 'kit: "Snapshots of Youth: Normal Attack Damage Multiplier ▲ 10% ... stacks up to 3" — 10 x 3, and 10 is a CONSTANT array in her skill1 table (level-invariant), so the product is too',
  },
  {
    slug: 'arcana-fortune-mate',
    slot: 'skill2',
    kind: 'buff',
    field: 'value',
    value: 7.47,
    anchors: [2.49],
    why: 'note: "Precious atkPct 7.47" baked to max — 2.49 x 3 stacks, same 3-stack cap as her S1 line',
  },
  {
    slug: 'asuka-wille',
    slot: 'burst',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 198.6,
    anchors: [6.62],
    why: 'kit: "Deals 6.62% of final ATK as additional damage. Mirrors the stack count of Anti A.T. Field" — 6.62 x 30',
  },
  {
    slug: 'mast',
    slot: 'burst',
    kind: 'dot',
    field: 'atkPct',
    value: 226,
    anchors: [4.52],
    why: 'kit: "Storm: Deals 4.52% of final ATK as damage. Mirrors the stack count of Sea Breeze" — 4.52 x 50',
  },
  {
    slug: 'cinderella',
    slot: 'burst',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 13659.2,
    anchors: [1365.92],
    why: 'kit: "Deals 1365.92% of final ATK as damage. Attacks sequentially for 10 time(s)"',
  },
  {
    slug: 'cinderella',
    slot: 'burst',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 346.8,
    anchors: [28.9],
    why: 'kit: "Deals 28.9% of final ATK as additional damage. Mirrors the stack count of Beautiful" — 28.9 x 12',
  },
  {
    slug: 'soline-frost-ticket',
    slot: 'skill1',
    kind: 'buff',
    field: 'value',
    value: 20,
    anchors: [10],
    why: 'kit: "Max HP ▲ number of tickets * 10% of the skill user\'s Max HP", max 2 tickets — 10 x 2 (not the 10+10 fold the audit hint guessed)',
  },
  {
    slug: 'emilia',
    slot: 'skill1',
    kind: 'buff',
    field: 'value',
    value: 12.06,
    anchors: [2.01],
    why: 'note: "2.01% for every unit in the final Max Ammunition Capacity -> chargeDamagePct 12.06" — 2.01 x 6',
  },
  {
    slug: 'liberalio',
    slot: 'skill1',
    kind: 'flatDamage',
    field: 'atkPct',
    value: 202.5,
    anchors: [40.5],
    why: 'note: "40.5% additional damage per full charge that \'Activates 5 times\' = 5 hits per full charge -> 202.5% flatDamage per shot"',
  },
  {
    slug: 'mana',
    slot: 'skill2',
    kind: 'buff',
    field: 'value',
    value: 18,
    anchors: [0.18],
    why: 'kit: "Charge Time ▼ 0.18 sec" encoded as chargeSpeedPct 18 — a seconds->percent CONVERSION, so the scaling is proportional to the 0.18s kit value and inherits that conversion\'s approximation',
  },
  {
    slug: 'ada',
    slot: 'burst',
    kind: 'weaponSwap',
    field: 'damagePct',
    value: 61.3,
    const: true,
    why: "61.3 IS ada's own normalAttackMultiplier — a weapon stat, level-invariant (same shape as snow-white-heavy-arms's 69.04 swap)",
  },
  {
    slug: 'maiden-ice-rose',
    slot: 'burst',
    kind: 'stackedNuke',
    field: 'hpPct',
    value: 137.28,
    anchors: [1372.8],
    why: 'kit: "damage equal to 1372.8% of the sum of 10% of the skill user\'s final Max HP and the skill user\'s ATK" — the HP component IS 1372.8 x 10%, so it rides the same anchor as the atkPct leg',
  },
  {
    slug: 'rapi-red-hood',
    slot: 'burst',
    kind: 'burstCdr',
    field: 'seconds',
    value: 20,
    const: true,
    why: 'kit: "Cooldown of Burst Skill ▼ 20 sec." — a literal in the kit text, not a per-level placeholder (20 appears nowhere in her burst level table)',
  },
];

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

interface Eff {
  [k: string]: unknown;
  kind?: string;
  levelScale?: Record<string, number[]>;
  levelConst?: string[];
}

let applied = 0;
let already = 0;
const errors: string[] = [];

const bySlug = new Map<string, Row[]>();
for (const r of ROWS) {
  if (!bySlug.has(r.slug)) {
    bySlug.set(r.slug, []);
  }
  bySlug.get(r.slug)!.push(r);
}

for (const [slug, rows] of bySlug) {
  const path = join(ROOT, 'src/skills/overrides', `${slug}.json`);
  const raw = readFileSync(path, 'utf8');
  const ov = JSON.parse(raw);
  let dirty = false;

  for (const row of rows) {
    // Collect every effect in the slot matching (kind, field, value). `escalating` steps count.
    const hits: Eff[] = [];
    const visit = (e: Eff) => {
      if (e.kind === 'escalating' && Array.isArray(e.steps)) {
        (e.steps as Eff[]).forEach(visit);
      }
      if (e.kind === row.kind && e[row.field] === row.value) {
        hits.push(e);
      }
    };
    for (const b of ov[row.slot] ?? []) {
      for (const e of b.effects ?? []) {
        visit(e as Eff);
      }
    }
    if (!hits.length) {
      errors.push(
        `${slug} ${row.slot} ${row.kind}.${row.field}=${row.value}: no matching effect`
      );
      continue;
    }
    // Several identical effects (e.g. a value repeated across two blocks) all get the same
    // annotation — they are the same kit line by construction, so this is not ambiguity.
    for (const e of hits) {
      if (row.const) {
        const list = e.levelConst ?? [];
        if (list.includes(row.field)) {
          already++;
          continue;
        }
        e.levelConst = [...list, row.field];
      } else {
        const cur = e.levelScale?.[row.field];
        if (cur && JSON.stringify(cur) === JSON.stringify(row.anchors)) {
          already++;
          continue;
        }
        e.levelScale = { ...(e.levelScale ?? {}), [row.field]: row.anchors! };
      }
      applied++;
      dirty = true;
    }
  }

  if (dirty && !checkOnly) {
    // Preserve the file's 2-space formatting; prettier owns the final shape via lint-staged.
    writeFileSync(path, `${JSON.stringify(ov, null, 2)}\n`);
  }
}

console.log(
  `${checkOnly ? '[check] ' : ''}${applied} annotation(s) applied, ${already} already present, ${errors.length} error(s)`
);
for (const e of errors) {
  console.log(`  ✗ ${e}`);
}
if (errors.length) {
  process.exit(1);
}
