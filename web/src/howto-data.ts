// Content for the "How to" page — a plain-language guide to using the site:
// what each tab is for, what every filter means, and the methodology behind the
// numbers. Community-facing: written out, no invented abbreviations, no internal
// file paths. Assumes general NIKKE knowledge (OL, dolls, burst, cores, etc.).

export interface HowToItem {
  term: string;
  def: string;
}

export interface HowToSection {
  title: string;
  intro?: string;
  bullets?: string[];
  items?: HowToItem[];
  outro?: string;
}

export const intro =
  'This site simulates NIKKE solo-raid fights frame by frame to predict how much damage each unit in a team deals over a 180-second fight against the raid boss. Below: the idea behind the numbers, what every tab is for, and what each filter does.';

export const sections: HowToSection[] = [
  {
    title: 'How the numbers are made',
    intro:
      'The engine plays out the whole fight on a frame clock — every shot, reload, charge, skill proc and burst rotation — and adds up the damage each unit deals. It models actual firing and burst timing, not averaged rates.',
    bullets: [
      'A fight is 180 seconds against a single-part raid boss. All five units run on full auto.',
      'The predictions are checked against real fights the dev records under one fixed test preset (see “Scope Lock” below), then tuned until the sim lands within a few percent per unit. Differences under about 5% are run-to-run noise, not error.',
      'Because the whole rotation is simulated, results react to team order, element, core exposure and gear — change any input and the numbers move the way the real fight would.',
    ],
    outro:
      'Standing assumptions in the current version: no enemy debuffs, boss at full HP, auto-mode enabled, middle unit is the focused unit, burst order is decided left to right. Parts and pierce damage are simplified for now.',
  },
  {
    title: 'The tabs across the top',
    intro:
      'The site is split into four tool sections and two reference pages, reachable from the top bar.',
    items: [
      {
        term: 'Sim',
        def: 'The main calculator: build a 5-unit team, set the boss and gear, and read per-unit damage. Also hosts Roster Sim (five teams at once) and the Team and Roster Generators.',
      },
      {
        term: 'Rankings',
        def: 'Pre-computed DPS Rankings of the strongest Burst-3 carries, plus Unit Comparison — a head-to-head lab for your own control groups.',
      },
      {
        term: 'Overload',
        def: 'Everything about overload gear: Optimize Overload (which lines to run), Overload Rolling (what it costs to roll them), and Overload Breakpoints (where the tiers pay off).',
      },
      {
        term: 'Tools',
        def: 'Team Builder, Doll Leveling, and the Resource Calculator.',
      },
      {
        term: 'How to',
        def: 'This page.',
      },
      {
        term: 'Mechanics',
        def: 'A reference for every game mechanic the simulator models, each tagged with how strongly it is verified (measured, datamined, community-confirmed, or calibrated).',
      },
    ],
    outro:
      'Testing Requested stays on the top bar for reach; Sync my roster, Patch Notes, Meet the dev and Credits live under the ☰ menu.',
  },
  {
    title: 'The tools, section by section',
    intro:
      'Each section in the top bar holds its own row of tabs. Team Sim, Unit Comparison and the generators all read the same boss options and gear controls, described further down.',
    items: [
      {
        term: 'Team Sim',
        def: 'Hand-build one team. Pick five units — search a slot directly, or use Browse Nikkes to filter the full roster by weapon, burst, class, element, manufacturer, or kit role — set each one’s gear, and see how much damage every unit deals, their share of the team total, DPS, and how many full bursts the team got. This is the tool to answer “how does THIS exact team perform?”',
      },
      {
        term: 'Roster Sim',
        def: 'Enter up to five teams of five and sim them all at once under one shared boss + loadout setup. Each nikke can be used once across the roster (solo-raid rule). Browse Nikkes opens the full 5×5 roster so you can pick all five teams at once — Save Roster applies them to the page.',
      },
      {
        term: 'Team Generator',
        def: 'Finds the single strongest 5-unit team for the chosen boss weakness out of the units you own.',
      },
      {
        term: 'Roster Generator',
        def: 'Builds an optimized solo-raid roster — the top 5 teams with no unit reused across them.',
      },
      {
        term: 'DPS Rankings',
        def: 'Pre-computed rankings of the strongest Burst-3 carries, each dropped into a standardized support team so they compete on equal footing. Use it to see which carries lead under a given setup — no team-building required.',
      },
      {
        term: 'Unit Comparison',
        def: 'A head-to-head lab. Lock in a fixed control group (3 or 4 units), then swap different units into the open slots and rank the variants by damage. Answers “which unit fits best into the rest of my team?”',
      },
      {
        term: 'Optimize Overload',
        def: 'Pick one carry and rank how it should spend its four free Overload lines. The 8/12 floor (4× Elemental DMG + 4× ATK) is held fixed; the tool sims every worthwhile spread of the remaining four and charts the damage plus the % gain over 8/12. Use Matrix mode to auto-build a standard control team, or Custom mode to pit the carry against your own support teams (one chart each).',
      },
      {
        term: 'Overload Rolling',
        def: 'Estimate the rerolls and Custom Modules a piece needs — from scratch or from its current lines — and get a guided, step-by-step roll plan for one piece.',
      },
      {
        term: 'Overload Breakpoints',
        def: 'Two calculators for stats that only pay off in whole steps: Charge Speed (the % thresholds at which charge time drops by one more frame, for any RL/SR or the standard 1-second table) and Max Ammo (every extra round a unit can reach and how many lines each one costs).',
      },
      {
        term: 'Team Builder',
        def: 'Browse the full roster with filters, build a team on the strip, and copy it into the Team Sim or the Roster Sim. The + beside the strip expands it to a full 5×5 roster. Units not in the sim yet can be placed here, but the copy buttons refuse them.',
      },
      {
        term: 'Doll Leveling',
        def: 'Plan the resource-efficient path to level favorite items (dolls) — from scratch or from a current level.',
      },
      {
        term: 'Resource Calculator',
        def: 'Expected daily income from Anomaly Interception — custom modules, fragments, locks and T10 gear — by boss and tier.',
      },
    ],
  },
  {
    title: 'Boss options (the top filter row)',
    intro:
      'These describe the fight and apply to Team Sim, Unit Comparison and the generator tabs.',
    items: [
      {
        term: 'Boss weakness',
        def: 'The element the boss is weak to. Pick it and any unit of that element gets the elemental-advantage damage bonus. Leave it on “None” for a neutral fight where no one is advantaged.',
      },
      {
        term: 'Boss DEF',
        def: 'The boss’s flat defense, subtracted from every hit. Leave at 0 unless you are matching a specific fight with a known defense value.',
      },
      {
        term: 'Core visibility',
        def: 'What percentage of the fight the boss’s core is exposed, from 0% to 100%. A core hit is a large damage bonus, so this is one of the biggest levers. Pick the preset that matches how exposed the core is in your fight, or type a custom percentage.',
      },
      {
        term: 'Synchro level',
        def: 'Your account’s Synchro level, which sets each unit’s base stats. Defaults to 400 (the level used for the solo-raids).',
      },
    ],
  },
  {
    title: 'Gear and loadout',
    intro:
      'On the Team Sim and Unit Comparison tabs, each unit has a full card — portrait, gear, duplicates, skill levels, cube and Overload lines. There is also a bulk row above the team to set an option on every unit at once.',
    items: [
      {
        term: 'Scope Lock (preset)',
        def: 'One click applies the fixed test preset every recorded fight uses: no cube, no doll, base Overload gear, 3★ / 7 core, 400 synchro. This is the apples-to-apples baseline the whole project is validated on — start here if you want numbers you can trust against reality.',
      },
      {
        term: 'Bulk “All …” buttons',
        def: 'The row of All cubes / gear / dolls / stars / cores / skills buttons applies that one choice to all five units at once. On the Unit Comparison tab they apply to the swap-in units only, leaving the control group locked.',
      },
      {
        term: 'Gear (per card)',
        def: 'OL 0 vs OL 5 is base Overload gear vs fully leveled Overload gear; Doll 15 toggles a max favorite item (doll). These set the stat backbone of the unit.',
      },
      {
        term: 'Dupes (per card)',
        def: 'Limit Break stars and Core level. Use the presets (0, MLB, Core 7) or the “…” button to set stars and core individually.',
      },
      {
        term: 'Skills (per card)',
        def: 'Levels for Skill 1, Skill 2 and Burst. Common breakpoints (4 / 7 / 10) are one click each. Units without per-level data stay at max.',
      },
      {
        term: 'Cube (per card)',
        def: 'Which cube is equipped, and its level. “None” means no cube at all (no bonus stats), which is different from the “Other” cube (still gives base stats and elemental damage, but does not give a specific cube’s bonus).',
      },
      {
        term: 'Overload lines (ELE / ATK + add)',
        def: 'Type the total Elemental Damage % and ATK % from your unit’s Overload gear. Use “+ OL line” to add other line types (ammo, charge, crit, etc.). This lets you match a unit’s exact gear.',
      },
    ],
    outro:
      'Team order matters: drag portraits to reorder. The leftmost unit ready to burst casts first, so order changes the rotation. Mode-switch units and Lambda-burst units show extra buttons on their card to pick which form the sim assumes.',
  },
  {
    title: 'Reading the results',
    intro: 'After the Sim runs you get a team summary and a per-unit table.',
    bullets: [
      'The summary line shows total team damage, team DPS, how many full bursts happened, and full-burst uptime.',
      'Each unit row shows its damage, its share of the team total, its DPS, a normal / skill / burst split, and its burst count. A ▲ marks elemental advantage; a ⚠️ marks a unit with effects the sim could not fully model.',
      'The toggles below open the exact team buffs applied, per-unit modeling notes, and a frame-by-frame rotation log — handy for checking why a rotation stalled or a unit under-performed.',
    ],
  },
  {
    title: 'DPS Rankings filters',
    intro:
      'The DPS Rankings (and the Unit Comparison tab’s Matrix mode) is a grid of standardized setups. Four selectors pick which setup you are looking at.',
    items: [
      {
        term: 'Framework',
        def: 'Which standardized support team backs the tested carry: Standard (a lean support core), the Hyper Carry versions (add a buffer bursting in sync with the carry), and the Anis variants (a different Burst-1 anchor). Expand “Control frameworks” on the chart for the exact rosters.',
      },
      {
        term: 'Element',
        def: 'Neutral (no one advantaged) or Ele Weak (the boss is weak to the tested unit’s element only, so just the carry gets the advantage).',
      },
      {
        term: 'Core',
        def: 'Boss-core exposure for the run — No Core, Core 50 or Core 100 — the same core-hit lever as the Sim’s Core visibility.',
      },
      {
        term: 'Investment',
        def: 'Gear level: Scope Lock (the bare test preset), 8/12 (a mid build — Other cube, rolled Overload, doll, 4 elemental + 4 ATK lines) or 12/12 (that plus the 4 best remaining lines per unit).',
      },
      {
        term: 'Compare a unit',
        def: 'Pick any Burst-3 from the dropdown and its rank is appended to every visible chart, so you can see where your unit lands even when it is outside the top 10.',
      },
    ],
  },
  {
    title: 'Saving and sharing',
    intro: 'The buttons in the Sim header let you keep and share a build.',
    bullets: [
      'Share team copies a link that reopens the exact five units. Copy image puts a summary graphic on your clipboard.',
      'Log in with Discord to save full teams — units, gear, dupes, skills and boss options — to your account and reload them later.',
      'The DPS Rankings’ per-chart share buttons copy a link to that exact cell (and your compare unit), or an image of the ranking.',
    ],
  },
];
