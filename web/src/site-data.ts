// Editable site content — dev bio + social links. Keep this human-readable;
// the Dev page and shared footer render straight from these values.

// each social is a rounded tile with the brand's official mark; `round` makes
// the tile a circle (Discord-style avatar) for a bot's profile picture.
export type SocialIcon =
  | { kind: 'brand'; name: 'discord' | 'x' | 'github' }
  | { kind: 'img'; src: string; round?: boolean };

export interface Social {
  label: string;
  href: string;
  brand: string; // tile background color
  icon: SocialIcon;
}

// The dev bio and companion-project blurbs live in src/share because the
// server renders them into the crawlable landing-page body too (see
// src/share/site-identity.ts). Re-exported here so this module stays the one
// import site the web app reaches for.
export { dev } from '../../src/share/site-identity';
import { dev } from '../../src/share/site-identity';

// Social buttons — rendered as brand tiles in the shared site footer.
export const socials: Social[] = [
  {
    label: 'Maiden',
    href: 'https://discord.com/discovery/applications/1523719703950790946',
    brand: '#0b0e14',
    icon: { kind: 'img', src: '/maiden.gif' },
  },
  {
    label: 'Helen',
    href: dev.helen.addToServer,
    brand: '#0b0e14',
    icon: { kind: 'img', src: '/helen.png' },
  },
  // The sister site. This is a logo, not an avatar — it already ships as a
  // full-bleed dark square, so it fills the tile the same way the others do.
  {
    label: 'refittingroom.app',
    href: dev.refittingroom.url,
    brand: '#101216',
    icon: { kind: 'img', src: '/refittingroom-icon.png' },
  },
  {
    label: 'Discord',
    href: 'https://discord.com/users/177179150669316096',
    brand: '#5865f2',
    icon: { kind: 'brand', name: 'discord' },
  },
  {
    label: 'X',
    href: 'https://x.com/fourbrainstorms',
    brand: '#000000',
    icon: { kind: 'brand', name: 'x' },
  },
  {
    label: 'GitHub',
    href: 'https://github.com/Infernal-Crack-LED',
    brand: '#181717',
    icon: { kind: 'brand', name: 'github' },
  },
  {
    label: 'Blablalink',
    href: 'https://www.blablalink.com/user?openid=MjkwODAtMTczODk5ODEwMzMzMTgwOTYwMDc=',
    brand: '#000000',
    icon: { kind: 'img', src: '/blablalink.png' },
  },
];
