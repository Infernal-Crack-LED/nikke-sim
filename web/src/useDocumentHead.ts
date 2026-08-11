import { useEffect } from 'react';

const SITE = 'https://nikkesim.app';

interface HeadMeta {
  title: string;
  description: string;
}

// Per-route SEO metadata. Titles are keyword-rich and unique per page so
// Google sees each route as a distinct, relevant result. MUST stay in
// lockstep with the servers' TAB_META tables (src/server/static.ts,
// scripts/serve.mjs) — scripts/tests/share/meta-parity.test.ts enforces it.
export const META: Record<string, HeadMeta> = {
  sim: {
    title:
      'NIKKE Solo Raid Sim — DPS Calculator, Overload Optimizer & Team Builder',
    description:
      'NIKKE solo raid damage simulator: per-unit DPS calculator, overload optimizer, best overload lines, team builder, and game mechanics reference. Frame-tick accuracy, runs in your browser.',
  },
  dpschart: {
    title:
      'NIKKE DPS Rankings — Neutral, Elemental Advantaged, with and without Supports',
    description: 'Ranked DPS of every B3 under standardized frameworks.',
  },
  dps: {
    title: 'Unit Comparison — NIKKE Head-to-Head DPS Comparator',
    description:
      'Head-to-head per-unit DPS comparison with a custom control group. Pit any NIKKE against any other under identical conditions.',
  },
  ranks: {
    title:
      'NIKKE Support Rankings — Team Damage Buffs, Burst Gen, Burst CDR, & Sustain',
    description:
      'Ranked NIKKE support boards: team damage buffs, burst generation, burst cooldown reduction, and sustain. Computed from the same frame-tick solo raid sim as the DPS rankings.',
  },
  overload: {
    title: 'NIKKE Overload Optimizer — Best Overload Lines Calculator',
    description:
      'Find the optimal overload lines for any Nikke. The overload calculator uses frame-tick sim data to rank every roll by DPS gain.',
  },
  team: {
    title: 'NIKKE Team Generator — Best 5 Nikke Team',
    description:
      'Generate the best 5 Nikke team against a custom boss profile. Factors element, burst rotation, and overload synergy.',
  },
  roster: {
    title:
      'NIKKE Roster Generator — Best Solo Raid/Union Raid Teams from Your Units',
    description:
      'Input your NIKKE roster and generate the optimal solo raid teams. Accounts for your actual units, gear, and overload lines.',
  },
  rostersim: {
    title: 'NIKKE Roster Sim — Sim Your Solo Raid and Union Raid Teams',
    description:
      'Sim your own five solo raid teams at once and compare their damage side by side. See which roster lineup deals the most DPS.',
  },
  olsim: {
    title: 'NIKKE Overload Rolling Simulator — Module Cost Calculator',
    description:
      'Estimate the rerolls and Custom Modules needed to hit a target overload build. Plan your overload rolling budget before spending.',
  },
  doll: {
    title: 'NIKKE Doll Leveling Calculator — Efficient SR Leveling Path',
    description:
      'Calculate the most resource-efficient path to level your dolls (Favorite Items) to SR phase 15. Minimize waste, maximize stats.',
  },
  charge: {
    title: 'NIKKE Overload Breakpoints — Charge Speed & Max Ammo Tables',
    description:
      'Charge-speed frame breakpoints and max-ammo line costs for every RL and SR in NIKKE. See exactly how many overload lines each breakpoint takes.',
  },
  teambuilder: {
    title: 'NIKKE Team Builder — Visual Team Planner & Loadout Editor',
    description:
      'Build and share NIKKE solo raid and union raid teams visually. Filter the full roster, set loadouts, and copy your team into the sim or roster sim.',
  },
  resources: {
    title:
      'NIKKE Resource Calculator — Daily Custom Module & Anomaly Interception Outcome',
    description:
      'Expected daily custom module and T9 drops by stage. Supports Kraken and other Anomaly Interception bosses. Plan your daily farming.',
  },
  howto: {
    title: 'How to Use the NIKKE Solo Raid Sim — Quick Start Guide',
    description:
      'Learn how to use the NIKKE Solo Raid Sim: build a team, configure the boss, read DPS results, and optimize your overload lines.',
  },
  mechanics: {
    title:
      'NIKKE Game Mechanics Reference — Damage Formula & Other Game Mechanics',
    description:
      'Comprehensive NIKKE mechanics reference: damage formula, burst rotation, charge math, and other game mechanics — all sourced and tiered.',
  },
  dev: {
    title: 'Meet the Dev — NIKKE Solo Raid Sim',
    description:
      'About the developer behind the NIKKE Solo Raid Sim and the Maiden Discord bot.',
  },
  'patch-notes': {
    title: 'Patch Notes — NIKKE Solo Raid Sim Changelog',
    description:
      'Changelog for the NIKKE Solo Raid Sim: accuracy improvements, new unit models, mechanics updates, and bug fixes.',
  },
  'testing-requests': {
    title: 'Testing Requested — Help Improve NIKKE Sim Accuracy',
    description:
      'Units and matchups the NIKKE sim needs real recordings for. Submit your Union Shooting Range tests to help close the accuracy gap.',
  },
  'roster-sync': {
    title: 'Sync Your NIKKE Roster — Import from blablalink',
    description:
      'Import your real NIKKE roster into the sim via blablalink. Auto-fills your units, gear, and overload lines for accurate team generation.',
  },
  builder: {
    title: 'NIKKE Card Builder — Custom DPS Charts & Infographics',
    description:
      'Build a shareable NIKKE infographic: Nikke Card, custom DPS chart, unit comparison, rank board, and more. Live preview and specialized formatting for Discord and X.',
  },
  characters: {
    title: 'NIKKE Characters — Every Nikke’s Kit, Overload Lines & DPS Rank',
    description:
      'Browse every NIKKE character. Filter by element, weapon, burst stage, class or kit role, then open a Nikke for her full kit, best overload lines, and solo-raid DPS ranking.',
  },
  credits: {
    title: 'Credits — NIKKE Solo Raid Sim',
    description:
      'The community research, datamines, and tools the NIKKE Solo Raid Sim is built on.',
  },
};

const DEFAULT_META = META.sim;

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOg(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

// Canonical paths never carry a trailing slash, except the root.
function normalizeCanonicalPath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

// Resolve the active tab key from the current URL (mirrors tabFromLocation
// in App.tsx but without importing the full sim state). The rankings section
// lives under /ranks/* (owner decision 2026-07-26): bare /ranks is the DPS
// chart, /ranks/support is Support Rankings, /ranks/compare is Unit
// Comparison.
function tabKey(): string {
  const segs = normalizeCanonicalPath(window.location.pathname.toLowerCase())
    .replace(/^\/+|\/+$/g, '')
    .split('/');
  if (segs[0] === 'ranks') {
    if (segs[1] === 'support') {
      return 'ranks';
    }
    if (segs[1] === 'compare') {
      return 'dps';
    }
    return 'dpschart';
  }
  if (segs[0] && META[segs[0]]) {
    return segs[0];
  }
  return 'sim';
}

// /dpschart and /dps are legacy aliases the client canonicalizes via
// replaceState (App.tsx); this covers the window before that effect runs.
const LEGACY_CANONICAL: Record<string, string> = {
  dpschart: '/ranks',
  dps: '/ranks/compare',
  sim: '/',
};

// Sync <title>, <meta description>, OG tags, and <link rel="canonical"> to
// the current route. Runs on mount and on popstate (SPA navigation).
export function useDocumentHead() {
  useEffect(() => {
    function sync() {
      const pathname = normalizeCanonicalPath(
        window.location.pathname.toLowerCase()
      );

      // /unit/:slug head updates are handled by the lazy UnitPage so the full
      // characters.json dataset does not need to live in the eager entry chunk.
      if (pathname.startsWith('/unit/')) {
        return;
      }

      const key = tabKey();
      const m = META[key] ?? DEFAULT_META;
      const seg = pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
      const canonicalPath = normalizeCanonicalPath(
        Object.hasOwn(LEGACY_CANONICAL, seg) ? LEGACY_CANONICAL[seg] : pathname
      );
      const canonical = SITE + canonicalPath;

      document.title = m.title;
      setMeta('description', m.description);
      setOg('og:title', m.title);
      setOg('og:description', m.description);
      setOg('og:url', canonical);
      setMeta('twitter:title', m.title);
      setMeta('twitter:description', m.description);
      setCanonical(canonical);
    }

    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
}
