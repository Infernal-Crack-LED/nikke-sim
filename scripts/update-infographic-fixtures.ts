// Regenerate the golden-image fixtures (scripts/tests/fixtures/infographics/).
// Run after an INTENTIONAL renderer change, then eyeball the PNGs before
// committing. Wired as `npm run fixtures:infographics`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderAll } from './tests/share/infographics-harness.js';

const FIXTURE_DIR = new URL('./tests/fixtures/infographics/', import.meta.url);
mkdirSync(FIXTURE_DIR, { recursive: true });
for (const { name, png } of await renderAll()) {
  writeFileSync(new URL(name, FIXTURE_DIR), png);
  console.log(`wrote scripts/tests/fixtures/infographics/${name}`);
}
