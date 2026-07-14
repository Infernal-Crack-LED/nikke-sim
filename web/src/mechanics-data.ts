// Web-friendly TLDR of docs/data/game-mechanics.md — the mechanics the solo-raid
// sim models. Community-facing: written out, no invented abbreviations, no
// internal file paths. Keep in sync with the source-of-truth doc when it moves.

export type Tier = 'Measured' | 'Datamined' | 'Community' | 'Calibrated';

export interface MechSection {
  title: string;
  tiers: Tier[];
  bullets: string[];
}

export const tierLegend: Record<Tier, string> = {
  Measured: 'Frame-counted from our own recorded fights under a fixed test preset.',
  Datamined: 'Decoded from the game’s own data tables or a frame-accurate reference sim.',
  Community: 'Independently verified by multiple community testers (JP / KR / EN).',
  Calibrated:
    'Mechanism is known, but the exact number is fitted against our validated fights.',
};

export const intro =
  'How the simulator models a 180-second solo-raid fight, mechanic by mechanic. Everything below is measured, datamined, or community-verified under a fixed test preset (no cubes or dolls, base gear, 3★ / core 7, 400 synchro, full auto vs the partless test boss). Deltas under about 5% are run-to-run noise.';

export const sections: MechSection[] = [
  {
    title: 'Damage formula',
    tiers: ['Datamined', 'Community'],
    bullets: [
      'Damage is a product of independent buckets — buffs inside a bucket add together, buckets multiply.',
      'Crit, core hit (+100% base), Full Burst (+50%), and effective range (+30%) all share ONE additive bracket, so they don’t multiply against each other.',
      'The Full Burst +50% applies by timing: damage that lands before the window opens never gets it.',
    ],
  },
  {
    title: 'Weapon fire cadence',
    tiers: ['Community', 'Measured', 'Datamined'],
    bullets: [
      'Base rates: AR ~12/s, SMG ~20/s, Shotgun 1.5/s (10 pellets), Pistol 4/s, MG up to 60/s after wind-up.',
      'The class rate is only a default — per-unit data overrides it (e.g. Jill’s “AR” fires at 2.5/s), and some units reload while still firing.',
      'Reload speed is subtractive: buffs past 100% only remove the scaled part of the reload, never the fixed tail.',
    ],
  },
  {
    title: 'Machine-gun wind-up',
    tiers: ['Measured', 'Calibrated'],
    bullets: [
      'MGs ramp up over a measured ladder (35 rounds across ~142 frames) before hitting the 60/s cap.',
      'While not firing the spin winds down after a short grace and fully resets after ~1.1s idle.',
      'The first rounds of each wind-up spray wide and don’t land on the core.',
    ],
  },
  {
    title: 'Charge weapons (Snipers & Rocket Launchers)',
    tiers: ['Datamined', 'Measured'],
    bullets: [
      'Charge Speed is subtractive on charge time (capped at +100%), not a simple divide.',
      'Snipers add a 22-frame bolt cycle after each shot; auto play always full-charges.',
      'Full-charge multipliers are per-unit (snipers ~250%, Alice 350%); some kits convert wasted charge speed into charge damage.',
    ],
  },
  {
    title: 'Effective range & the test boss',
    tiers: ['Measured', 'Community'],
    bullets: [
      '+30% damage when the target sits in the weapon’s optimal band — Rocket Launchers never get it.',
      'The test boss walks a fixed script (mid → near → far → mid-far → near → mid-far) with a ~1s unhittable window at each move.',
      'The range bonus tracks the boss’s physical position, leading/lagging the scripted boundaries by a few seconds.',
    ],
  },
  {
    title: 'Burst gauge generation',
    tiers: ['Datamined', 'Measured'],
    bullets: [
      'The gauge fills on hit count, not damage — each unit has a datamined per-shot value (doubled versus the boss).',
      'The camera-focused unit’s charge weapon generates ×2.5 gauge at full charge; unfocused charge units generate ×1.0.',
      'Opening the burst chain consumes the gauge; hits during the chain or Full Burst generate nothing.',
    ],
  },
  {
    title: 'Full-auto behaviors',
    tiers: ['Measured', 'Community', 'Calibrated'],
    bullets: [
      'Auto-aim never fully centers, so core-hit rate is scaled down a little versus perfect play.',
      'After Full Burst ends, the next chain cannot open for ~3 seconds — this delay, not gauge refill, paces high-generation teams.',
      'Auto burst priority is leftmost slot order, with waiting: the chain waits for the leftmost ready unit of the needed stage rather than handing off.',
      'Casts are blocked while the boss is off-screen during a range transition — the only real source of run-to-run burst-count variance.',
    ],
  },
  {
    title: 'Burst rotation rules',
    tiers: ['Datamined', 'Measured'],
    bullets: [
      'Full Burst lasts 10s; a Burst 1/2 cast opens the next stage for 10s (some units use 5s/15s/20s variants).',
      'If a stage window expires with no ready caster, the chain collapses and the gauge must fully refill.',
      'Burst-cast damage lands before Full Burst begins — it gets neither the +50% nor entry auras — but buffs from earlier casts in the same chain still apply.',
    ],
  },
  {
    title: 'Skill damage, DoTs & damage flavors',
    tiers: ['Datamined', 'Community'],
    bullets: [
      '“Deals X% of final ATK as additional damage” lines crit at the caster’s rate but never core and never get range.',
      'Weapon-delivered skill projectiles (e.g. stars, thrown projectiles) do core and crit, but still no range bonus.',
      'Damage-over-time ticks reference current buffs, not a snapshot from when they were applied.',
    ],
  },
  {
    title: 'Elemental advantage',
    tiers: ['Community'],
    bullets: [
      'Advantage is its own ×(1.1 + elemental-damage bonuses) bucket, applied only when you have the advantage.',
      'Wheel: Fire → Wind → Iron → Electric → Water → Fire.',
      'There’s no hidden bonus beyond the base 1.1.',
    ],
  },
  {
    title: 'Buff stacking & targeting',
    tiers: ['Community', 'Measured'],
    bullets: [
      'The same buff from the same source refreshes (overwrites); the same effect from different sources stacks.',
      '“ATK ▲ X% of caster’s ATK” adds a flat term from the caster’s ATK — strong from high-ATK buffers — while plain ATK ▲ just dilutes into the ATK sum.',
      'Damage Taken ▲ debuffs from different sources stack with no cap found; Pierce Damage ▲ only helps Pierce-tagged kits.',
    ],
  },
  {
    title: 'Environment & data caveats',
    tiers: ['Community', 'Measured'],
    bullets: [
      'Everything assumes 60 fps with “Min Firing Rounds Adjustment” on — MG/SMG/AR DPS drops hard below that.',
      'Official skill data can lag balance patches, so recently reworked values are pinned by hand until the source catches up.',
      'On-screen damage popups belong only to the currently focused unit; the top counter still totals the whole team.',
    ],
  },
];
