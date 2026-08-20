/**
 * Landing-page copy and dev/companion-project identity — the single source for
 * BOTH renderings of the home page.
 *
 * WHY this is shared rather than web-local: the landing page is a crawl
 * surface. `src/server/static.ts` server-renders a no-JS body for it, and
 * `web/src/LandingPage.tsx` renders the React version. Those two used to hold
 * independent hand-copied literals of the same six feature blurbs and the two
 * callouts, with nothing linking them and no test comparing them — so the day
 * a blurb was reworded on one side, the other would silently keep the old text
 * and nothing would fail. The crawler body is the copy Google indexes and the
 * one nobody looks at, so that drift would rot the indexed page while the
 * visible page stayed correct.
 *
 * Anything the landing page says in words belongs here. `scripts/tests/
 * landing-copy-parity.test.ts` fails if the server body stops containing it.
 *
 * Keep this human-readable: it is edited as copy, not as config.
 */

export const dev = {
  name: 'Max',
  greeting: "Hi, I'm Max",
  bio: 'I’m an independent developer who builds self-hosted AI systems and tools, along with some passion projects for games I like.',
  // the flagship project (the Maiden bot)
  maiden: {
    name: 'Maiden',
    blurb:
      'A NIKKE: Goddess of Victory info & strategy Discord bot that serves up character data on demand. Built for my union cluster, Maiden’s Bakery, but it works in any Nikke-oriented server.',
    botUrl: 'https://github.com/Infernal-Crack-LED/bakery-bot',
    discordInvite: 'https://discord.gg/3Yx4pHB88R',
    addToServer:
      'https://discord.com/discovery/applications/1523719703950790946',
  },
  // the GFL2-side companion bot, kept here so both sites cross-link
  helen: {
    name: 'Helen',
    blurb:
      'A Girls’ Frontline 2: Exilium info & team-building Discord bot that serves up doll kits, weapon data, and shareable squad cards on demand. Works in any GFL2-oriented server.',
    addToServer:
      'https://discord.com/discovery/applications/1538690317363191922',
  },
  // the sister site — the two share a brand mark, so they cross-link
  refittingroom: {
    name: 'Refitting Room',
    url: 'https://refittingroom.app',
    blurb:
      'My other game tool: a Girls’ Frontline 2: Exilium squad planner. Browse dolls and weapons, filter by class, phase, and weapon type, and assemble a team — all running in the browser.',
  },
  // Google Form the community submits test fights through — collects the fight
  // metadata plus the damage screenshot + full-fight video as file uploads
  // (Forms drops the files into a Drive folder automatically).
  testingFormUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSelnurU40O0vyKsols1lPEJs7_NRZHuTH2ZiamrmlJpj3ZDbQ/viewform',
} as const;

// --- Landing page copy ------------------------------------------------------

export const SITE_NAME = 'Nikke Simulator';

/**
 * The hero paragraph, split around the game's name so the React page can bold
 * it and the no-JS body can emit the same sentence — one source, two
 * renderings, no chance of the copy drifting apart.
 */
export const GAME_NAME = 'NIKKE: Goddess of Victory';
export const HOME_HERO_BEFORE = 'Plan, build, and share ';
export const HOME_HERO_AFTER =
  ' squads. Browse every Nikke, assemble teams, optimize overload lines, and ' +
  'compare DPS — all in one place.';

/** The whole hero line as flat text. */
export const HOME_HERO = HOME_HERO_BEFORE + GAME_NAME + HOME_HERO_AFTER;

export const HOME_SECTION_TITLE = 'Everything you need to plan a squad';

export interface HomeFeature {
  href: string;
  title: string;
  blurb: string;
  cta: string;
}

export const HOME_FEATURES: HomeFeature[] = [
  {
    href: '/sim',
    title: 'Team Simulator',
    blurb:
      'Run a frame-tick damage simulation for your squad against a custom boss. Per-unit DPS, share breakdowns, and full-burst counts.',
    cta: 'Open the sim',
  },
  {
    href: '/teambuilder',
    title: 'Team Builder',
    blurb:
      'Assemble up to five Nikkes and see team effects, elemental synergies, and burst coverage at a glance.',
    cta: 'Build a team',
  },
  {
    href: '/ranks',
    title: 'DPS Rankings',
    blurb:
      'Ranked damage under standardized frameworks: neutral, elementally advantaged, with and without supports.',
    cta: 'View rankings',
  },
  {
    href: '/roster',
    title: 'Roster Generator',
    blurb:
      'Generate the best solo-raid or union-raid roster teams from your unit pool, accounting for element, burst rotation, and overload synergy.',
    cta: 'Generate rosters',
  },
  {
    href: '/overload',
    title: 'Overload Optimizer',
    blurb:
      'Find the best overload lines for any Nikke, estimate rolling costs, and check charge-speed breakpoints.',
    cta: 'Optimize lines',
  },
  {
    href: '/builder',
    title: 'Infographic Generator',
    blurb:
      'Build and download shareable infographics for teams, DPS charts, unit comparisons, rank boards, and pull odds.',
    cta: 'Open builder',
  },
];

/** The hero's two call-to-action buttons. */
export const HOME_CTAS = [
  { href: '/teambuilder', label: 'Build a Team', style: 'btn-solid' },
  { href: '/characters', label: 'Browse Characters', style: 'btn-outline' },
] as const;
