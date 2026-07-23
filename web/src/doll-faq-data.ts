// Static doll-leveling FAQ content for the bakery-bot /doll command (Discord
// embed). The web page (App.tsx ~line 6501) renders its own JSX version with
// richer formatting and dynamic calibration values — keep the two in sync when
// editing FAQ content. Placeholders {mixed} and {pure} are replaced by the bot
// with static fallback values (~77 and ~63 respectively).

export interface DollFaqItem {
  question: string;
  tldr: string;
  why: string;
}

export const DOLL_FAQ: DollFaqItem[] = [
  {
    question: 'What is the overall strategy for leveling dolls?',
    tldr: 'Use all your kits — don\u2019t hoard. Blue kits are the workhorse; spend Purple and Gold to relieve the Blue crunch, and put Gold on the phase 10\u219215 push. Done right that\u2019s about {mixed} SR dolls per 1000 kit-boxes.',
    why: 'Kits come mostly Blue with a little Purple and Gold, and the fastest plan spends every kit \u2014 leaving Purple/Gold in your bag just wastes them. The simplest version (one tier per phase) still gets {pure} dolls per 1000 boxes: mostly Blue, Purple through the mid-phases, Gold for the final 10\u219215 climb. Splitting some phases between two tiers recovers the last ~20%, but the simple rule is close and much easier to follow.',
  },
  {
    question:
      'Better to level rare (R) dolls 0\u219215 first, or combine them?',
    tldr: 'Combine (trade) them. Four spare R dolls traded are worth far more than leveling one to 15 to launder.',
    why: 'Leveling an R doll to 15 to launder it into an SR nets only about 0.9 kit-value \u2014 it just skips the short SR 0\u21925 grind and still consumes the SR doll. Trading 4 R dolls is worth roughly 10.6 kit-value each (kits plus a 15% shot at an SR doll). So trade your spares \u2014 only launder when you specifically need the guaranteed SR-doll head-start.',
  },
];
