// Editable site content — dev bio + social links. Keep this human-readable;
// the Dev page and shared footer render straight from these values.

// each social is a rounded tile with the brand's official mark; `round` makes
// the tile a circle (Discord-style avatar) for Maiden's bot picture.
export type SocialIcon =
  | { kind: 'brand'; name: 'discord' | 'x' | 'github' }
  | { kind: 'img'; src: string; round?: boolean };

export interface Social {
  label: string;
  href: string;
  brand: string; // tile background color
  icon: SocialIcon;
}

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
  // Google Form the community submits test fights through — collects the fight
  // metadata plus the damage screenshot + full-fight video as file uploads
  // (Forms drops the files into a Drive folder automatically). Replace the
  // placeholder below with the published form's "viewform" responder URL.
  testingFormUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSelnurU40O0vyKsols1lPEJs7_NRZHuTH2ZiamrmlJpj3ZDbQ/viewform',
} as const;

// Social buttons — rendered as brand tiles in the shared site footer.
export const socials: Social[] = [
  {
    label: 'Maiden',
    href: 'https://discord.com/discovery/applications/1523719703950790946',
    brand: '#0b0e14',
    icon: { kind: 'img', src: '/maiden.gif' },
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
