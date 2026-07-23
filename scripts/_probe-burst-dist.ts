// Temporary probe: burst-role distribution of the generator pool + Λ unit list.
import { readFileSync } from 'node:fs';
import type { DataFile } from '../src/types.js';

const data: DataFile = JSON.parse(
  readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'),
);
const genChars = Object.values(data.characters).filter(
  (c) => c.generatorSupported && c.simSupported,
);
const byBurst: Record<string, string[]> = {};
for (const c of genChars) (byBurst[c.burst] ??= []).push(c.slug);
for (const b of ['I', 'II', 'III', 'Λ'])
  console.log(`Burst ${b}: ${(byBurst[b] ?? []).length}`);
console.log('\nΛ units:', (byBurst['Λ'] ?? []).join(', '));
console.log('\nBurst I (first 12):', (byBurst['I'] ?? []).slice(0, 12).join(', '));
console.log('Burst II (first 12):', (byBurst['II'] ?? []).slice(0, 12).join(', '));
console.log('Burst III count:', (byBurst['III'] ?? []).length);
