import { useEffect } from 'react';

const SITE = 'https://nikkesim.app';

interface HeadMeta {
  title: string;
  description: string;
}

// Per-route SEO metadata. Titles are keyword-rich and unique per page so
// Google sees each route as a distinct, relevant result.
const META: Record<string, HeadMeta> = {
  sim: {
    title:
      'NIKKE Solo Raid Sim — DPS Calculator, Overload Optimizer & Team Builder',
    description:
      'NIKKE solo-raid damage simulator: per-unit DPS calculator, overload optimizer, best overload lines, team builder, and game mechanics reference. Frame-tick accuracy, runs in your browser.',
  },
  dpschart: {
    title: 'NIKKE DPS Rankings — Best Units & Overload Lines Tier List',
    description:
      'Ranked DPS of every NIKKE B3 carry under standardized solo-raid frameworks. Compare units, see best overload lines, and find your best carries.',
  },
  dps: {
    title: 'Unit Comparison — NIKKE Head-to-Head DPS Comparator',
    description:
      'Head-to-head per-unit DPS comparison with a custom control group. Pit any NIKKE against any other under identical conditions.',
  },
  overload: {
    title: 'NIKKE Overload Optimizer — Best Overload Lines Calculator',
    description:
      'Find the optimal 3rd overload line for every NIKKE B3. The overload calculator uses frame-tick sim data to rank every roll by DPS gain.',
  },
  team: {
    title: 'NIKKE Team Generator — Best 5-Unit Solo Raid Team',
    description:
      'Generate the best 5-Nikke solo-raid team against a custom boss profile. Factors element, burst rotation, and overload synergy.',
  },
  roster: {
    title: 'NIKKE Roster Generator — Best Solo-Raid Teams from Your Units',
    description:
      'Input your NIKKE roster and generate the optimal solo-raid teams. Accounts for your actual units, gear, and overload lines.',
  },
  rostersim: {
    title: 'NIKKE Roster Sim — Compare All Your Solo-Raid Teams',
    description:
      'Sim your own five solo-raid teams at once and compare their damage side by side. See which roster lineup deals the most DPS.',
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
      'Build and share NIKKE solo-raid teams visually. Filter the full roster, set loadouts, and copy your team into the sim or roster sim.',
  },
  resources: {
    title: 'NIKKE Resource Calculator — Daily Custom Module & Fragment Income',
    description:
      'Expected daily solo-raid resource drops by stage: overload custom modules, module fragments, locks, and XP fodder. Plan your daily farming.',
  },
  howto: {
    title: 'How to Use the NIKKE Solo Raid Sim — Quick Start Guide',
    description:
      'Learn how to use the NIKKE Solo Raid Sim: build a team, configure the boss, read DPS results, and optimize your overload lines.',
  },
  mechanics: {
    title: 'NIKKE Game Mechanics Reference — Damage Formula & Solo Raid Guide',
    description:
      'Comprehensive NIKKE mechanics reference: damage formula, burst rotation, charge math, and solo-raid mechanics — all sourced and tiered.',
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

// Resolve the active tab key from the current URL (mirrors tabFromLocation
// in App.tsx but without importing the full sim state).
function tabKey(): string {
  const seg = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (seg && META[seg]) return seg;
  return 'sim';
}

// Sync <title>, <meta description>, OG tags, and <link rel="canonical"> to
// the current route. Runs on mount and on popstate (SPA navigation).
export function useDocumentHead() {
  useEffect(() => {
    function sync() {
      const key = tabKey();
      const m = META[key] ?? DEFAULT_META;
      const canonical = SITE + window.location.pathname;

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
