// Sustain ranking board — the best healing/shielding units, ranked by total
// effective HP restored + shielded over a 180s scope-lock fight.
//
// The engine deliberately models heals/shields as EVENTS ONLY (no HP pool —
// the v1 boss deals no damage, src/skills/types.ts:235-236), so this board is a
// THIN ANALYTIC LAYER over one sim run per candidate: the sim provides the
// caster's final Max HP (UnitResult.maxHp) and the fight timeline (burstCast /
// fullBurstStart / fullBurstEnd / shot / damage via cfg.onEvent); the curated
// kit lines in src/ranks/sustain-table.ts are then valued against that
// timeline. No engine change.
//
// Methodology (owner, 2026-07-26):
//   - Comp: tested unit + synthetic no-op teammates covering the other burst
//     stages (two no-op B3s so the rotation cycles ~20s), bursts ENABLED, scope
//     lock (Base-5, 3★/core 7, 10/10/10). The tested unit bursts at its natural
//     stage on cooldown.
//   - Pair profiles: prika runs with mint (duet modes — prika opens once,
//     mint's Sing Along keeps Performance, and with it the HoT and the +49.92%
//     outgoing-heal potency, up permanently); anchor-innocent-maid runs with
//     mast-romantic-maid (satisfies her same-squad regen gate; the two 40s B2s
//     alternate).
//   - "Recovers X% of attack damage as HP" (lifesteal) is valued on the unit's
//     OWN damage in each proc window — understates real team context (allies'
//     damage counts too); documented limitation.
//   - Lines that cannot proc at scope lock (low-HP triggers, cover HP,
//     on-attacked, ally death) are valued 0 and carry the reason in the table.
//   - Team-total metric: multi-ally lines count per target at the CASTER's
//     maxHp basis ("X% of the skill user's Max HP" × targets).
import type { SimConfig, SimEvent } from '../types.js';
import { prepareTeam, type UnitOptions } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import type { RanksCtx } from './burstgen.js';
import { syntheticFor } from './synthetics.js';
import { NOOP_B1, NOOP_B2, NOOP_B3, NOOP_CHARACTERS } from '../dpschart/noop.js';
import { SUSTAIN_TABLE, type SustainLine } from './sustain-table.js';

// ---- pair profiles ----------------------------------------------------------

export interface SustainProfile {
  id: string;
  partners: string[];                    // extra real units on the team
  modes?: Record<string, string>;        // per-slug override mode selection
  note: string;                          // player-facing, in the artifact's profiles map
}
export const SUSTAIN_PROFILES: Record<string, SustainProfile> = {
  prika: {
    id: 'with-mint',
    partners: ['mint'],
    modes: { prika: 'duet (w/ Mint)', mint: 'duet (w/ Prika)' },
    note: 'mint duet: prika opens once, Sing Along keeps Performance (HoT + potency) permanent',
  },
  'anchor-innocent-maid': {
    id: 'with-mast-rm',
    partners: ['mast-romantic-maid'],
    note: 'mast satisfies the same-squad gate on her Full-Burst-enter regen; the 40s B2s alternate',
  },
};

// ---- timeline + result ------------------------------------------------------

interface Timeline {
  testedSlug: string;
  burstCasts: { sec: number; slug: string }[]; // whole team
  fbStarts: number[];
  fbEnds: number[];
  fcShots: number[];      // tested unit's full-charge shots (sec)
  lastBullets: number[];  // tested unit's shots that emptied the magazine (sec)
  shots: number[];        // tested unit's all shots (sec)
  damage: { sec: number; amount: number }[]; // tested unit's damage instances
  durationSec: number;
  maxHp: number;
}

export interface SustainResult {
  slug: string;
  totalPct: number;              // team-total sustain, % of caster's final Max HP
  totalHp: number;               // totalPct/100 × maxHp
  maxHp: number;
  healPct: number;               // split: HP-scaled heals
  shieldPct: number;             //       shields (face value)
  lifestealPct: number;          //       damage-scaled heals (own-damage basis)
  profile: string | null;        // profile id; null = plain run
  rank: number;
}

// ---- team assembly ----------------------------------------------------------

function charFor(ctx: RanksCtx, slug: string) {
  return ctx.characters[slug] ?? syntheticFor(slug) ?? (NOOP_CHARACTERS as any)[slug];
}

// tested + no-op stage fillers (+ profile partners when withProfile), two
// no-op B3s so the rotation cycles ~20s for B1/B2-tested comps.
export function sustainTeam(slug: string, burst: string, withProfile = true): string[] {
  const partners = withProfile ? (SUSTAIN_PROFILES[slug]?.partners ?? []) : [];
  if (burst === 'I') return [slug, ...partners, NOOP_B2, NOOP_B3, NOOP_B3];
  if (burst === 'II') return [NOOP_B1, slug, ...partners, NOOP_B3, NOOP_B3];
  return [NOOP_B1, NOOP_B2, slug, NOOP_B3]; // B3 tested alternates with the no-op B3
}

// Run the board comp, capture the timeline, value the kit lines.
// withProfile=false forces the plain run for a profiled unit (the board emits
// both variants — owner ruling 2026-07-26).
export function sustainFor(slug: string, ctx: RanksCtx, withProfile = true): SustainResult {
  const char = ctx.characters[slug];
  if (!char) throw new Error(`${slug}: not in characters.json`);
  const slugs = sustainTeam(slug, char.burst, withProfile);
  const chars = slugs.map((s) => charFor(ctx, s));
  const profile = withProfile ? SUSTAIN_PROFILES[slug] : undefined;
  const unitOpts: UnitOptions[] = slugs.map((s) => ({
    ol: 'base5',
    stars: 3,
    core: 7,
    mode: profile?.modes?.[s],
  }));
  const testedIdx = slugs.indexOf(slug);

  const tl: Timeline = {
    testedSlug: slug,
    burstCasts: [],
    fbStarts: [],
    fbEnds: [],
    fcShots: [],
    lastBullets: [],
    shots: [],
    damage: [],
    durationSec: 180,
    maxHp: 0,
  };
  const onEvent = (ev: SimEvent) => {
    switch (ev.kind) {
      case 'burstCast':
        tl.burstCasts.push({ sec: ev.sec, slug: ev.slug });
        break;
      case 'fullBurstStart':
        tl.fbStarts.push(ev.sec);
        break;
      case 'fullBurstEnd':
        tl.fbEnds.push(ev.sec);
        break;
      case 'shot':
        if (ev.unitIdx !== testedIdx) break;
        tl.shots.push(ev.sec);
        if (ev.charged) tl.fcShots.push(ev.sec);
        if (ev.ammoAfter === 0 && !ev.unlimitedAmmo) tl.lastBullets.push(ev.sec);
        break;
      case 'damage':
        if (ev.unitIdx === testedIdx) tl.damage.push({ sec: ev.sec, amount: ev.amount });
        break;
    }
  };

  const cfg: SimConfig = {
    slugs,
    bossElement: null,
    bossDef: 0,
    level: 400,
    copies: 0,
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
    focusSlug: slug,
    onEvent,
  };
  // Units without an override get a bare empty kit — the analytic layer values
  // their sustain lines itself; the sim only supplies cadence, rotation timing,
  // and Max HP. Units WITH overrides keep them (rotation-relevant encoding like
  // blanc's self-CDR and the prika/mint duet modes stays faithful).
  const deps = {
    ...ctx.deps,
    overrides: Object.fromEntries(
      slugs.map((s) => [
        s,
        ctx.deps.overrides[s] ?? ({ slug: s, skill1: [], skill2: [], burst: [] } as any),
      ]),
    ),
  };
  const prepared = prepareTeam(chars, unitOpts, deps);
  const res = runSim(chars, ctx.mult, cfg, prepared);
  tl.maxHp = res.units[testedIdx].maxHp;

  const custom = PER_UNIT[slug];
  const parts = custom
    ? custom(tl, withProfile)
    : evaluateLines(SUSTAIN_TABLE[slug] ?? [], tl, withProfile);

  const totalPct = parts.heal + parts.shield + parts.lifesteal;
  return {
    slug,
    totalPct,
    totalHp: (totalPct / 100) * tl.maxHp,
    maxHp: tl.maxHp,
    healPct: parts.heal,
    shieldPct: parts.shield,
    lifestealPct: parts.lifesteal,
    profile: profile?.id ?? null,
    rank: 0,
  };
}

// Rank a population by absolute team-total HP restored + shielded. Profiled
// units appear TWICE (plain + profiled — owner ruling 2026-07-26).
export function sustainRank(slugs: string[], ctx: RanksCtx): SustainResult[] {
  const results = slugs.flatMap((slug) => {
    const rows = [sustainFor(slug, ctx, false)];
    if (SUSTAIN_PROFILES[slug]) rows.push(sustainFor(slug, ctx, true));
    return rows;
  });
  results.sort((a, b) => b.totalHp - a.totalHp);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---- generic line evaluator -------------------------------------------------

interface Parts {
  heal: number;
  shield: number;
  lifesteal: number;
}

// % of caster maxHp sustained by one unit's lines across the fight. Lines
// marked requiresProfile count only when the unit's pair profile ran (e.g.
// anchor-innocent-maid's same-squad regen gate).
function evaluateLines(lines: SustainLine[], tl: Timeline, withProfile: boolean): Parts {
  const parts: Parts = { heal: 0, shield: 0, lifesteal: 0 };
  for (const line of lines) {
    if (line.zero) continue;
    if (line.requiresProfile && !withProfile) continue;
    const procs = procTimes(line, tl);
    if (procs.length === 0) continue;
    const pct = line.maxHpPct ?? 0;
    const targets = line.targets ?? 5;

    if (line.kind === 'lifesteal') {
      // X% of the unit's own damage inside the union of [proc, proc+window] windows
      const windows = procs.map((t) => [t, t + (line.windowSec ?? 10)] as const);
      parts.lifesteal += ((pct / 100) * damageInWindows(tl.damage, windows) / tl.maxHp) * 100;
      continue;
    }

    // heal / shield: per proc, value = pct × ticks × targets, with escalating
    // ramps and potency windows applied per proc.
    procs.forEach((t, i) => {
      const rampSum = line.ramp
        ? line.ramp.slice(0, Math.min(i + 1, line.ramp.length)).reduce((a, b) => a + b, 0)
        : pct;
      const ticks = line.ticks ?? 1;
      let value = 0;
      for (let k = 0; k < ticks; k++) {
        const tickSec = t + k; // 1-per-second regen, first tick at proc time
        if (tickSec > tl.durationSec) break;
        let mult = 1;
        if (line.potency) {
          const windowStart = line.potency.procs === 'first' ? procs[0] : t;
          if (tickSec >= windowStart && tickSec <= windowStart + line.potency.windowSec)
            mult = line.potency.mult;
        }
        value += rampSum * mult;
      }
      if (line.kind === 'shield') parts.shield += value * targets;
      else parts.heal += value * targets;
    });
  }
  return parts;
}

function procTimes(line: SustainLine, tl: Timeline): number[] {
  const div = line.divisor ?? 1;
  let base: number[];
  switch (line.trigger) {
    case 'burstCast':
      base = tl.burstCasts.filter((c) => c.slug === tl.testedSlug).map((c) => c.sec);
      break;
    case 'fullBurstEnter':
      base = tl.fbStarts;
      break;
    case 'fullBurstEnd':
      base = tl.fbEnds;
      break;
    case 'fullChargeShot':
      base = tl.fcShots;
      break;
    case 'lastBullet':
      base = tl.lastBullets;
      break;
    case 'shot':
      base = tl.shots;
      break;
    case 'interval': {
      base = [];
      for (let t = line.intervalSec ?? 1; t <= tl.durationSec; t += line.intervalSec ?? 1)
        base.push(t);
      break;
    }
    case 'battleStart':
      base = [0];
      break;
  }
  if (div === 1) return base;
  return base.filter((_, i) => (i + 1) % div === 0);
}

// Sum damage amounts whose timestamps fall inside any [start, end] window
// (windows merged — an instance is counted once even under overlap).
function damageInWindows(
  damage: { sec: number; amount: number }[],
  windows: readonly (readonly [number, number])[],
): number {
  if (windows.length === 0) return 0;
  const sorted = [...windows].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  let total = 0;
  let wi = 0;
  for (const d of damage) {
    while (wi < merged.length && d.sec > merged[wi][1]) wi++;
    if (wi >= merged.length) break;
    if (d.sec >= merged[wi][0]) total += d.amount;
  }
  return total;
}

// ---- per-unit hooks ---------------------------------------------------------
// Kits whose sustain depends on state the generic triggers can't see.

const PER_UNIT: Record<string, (tl: Timeline, withProfile: boolean) => Parts> = {
  // Performance HoT 3.04%/s (all allies, ×5) + Outgoing-healing ▲49.92% while
  // in Performance. Solo: each cast opens a 25s HoT and a 25s Performance
  // window (potency applies inside it). Duet (with-mint profile): one opening
  // cast, then Sing Along keeps Performance — and with it the HoT and the
  // potency — live for the rest of the fight.
  prika: (tl, withProfile) => {
    const casts = tl.burstCasts.filter((c) => c.slug === 'prika').map((c) => c.sec);
    if (casts.length === 0) return { heal: 0, shield: 0, lifesteal: 0 };
    if (withProfile) {
      const ticks = Math.floor(tl.durationSec - casts[0]) + 1;
      return { heal: ticks * 3.04 * 1.4992 * 5, shield: 0, lifesteal: 0 };
    }
    let heal = 0;
    for (const cast of casts) {
      for (let k = 0; k < 25; k++) {
        const t = cast + k;
        if (t > tl.durationSec) break;
        heal += 3.04 * 1.4992 * 5; // the HoT runs inside its own Performance window
      }
    }
    return { heal, shield: 0, lifesteal: 0 };
  },

  // Dancing Effect: Full Charge while in Dancing → 1.8%/s×3 (all allies).
  // Her casts alternate Dancing/Singing; Dancing windows = [even cast, next cast).
  mint: (tl) => {
    const casts = tl.burstCasts.filter((c) => c.slug === 'mint').map((c) => c.sec);
    let heal = 0;
    for (let i = 0; i < casts.length; i += 2) {
      const end = casts[i + 1] ?? tl.durationSec;
      heal += tl.fcShots.filter((t) => t >= casts[i] && t < end).length * 3 * 1.8 * 5;
    }
    return { heal, shield: 0, lifesteal: 0 };
  },

  // Metal γ: 2.04% (all allies) per 10 normal attacks while in γ — γ runs 10s
  // from each of her bursts.
  mana: (tl) => {
    const casts = tl.burstCasts.filter((c) => c.slug === 'mana').map((c) => c.sec);
    const shots = tl.shots.filter((t) => casts.some((c) => t >= c && t <= c + 10));
    return { heal: Math.floor(shots.length / 10) * 2.04 * 5, shield: 0, lifesteal: 0 };
  },

  // Last-bullet 4.45% (1 ally) + burst 27.22% (all) once Refresh Heart is
  // stacked (5 stacks, one per last-bullet hit).
  pepper: (tl) => {
    const healLB = tl.lastBullets.length * 4.45;
    const stackedAt = tl.lastBullets[4] ?? Infinity;
    const casts = tl.burstCasts.filter((c) => c.slug === 'pepper' && c.sec >= stackedAt);
    return { heal: healLB + casts.length * 27.22 * 5, shield: 0, lifesteal: 0 };
  },
};
