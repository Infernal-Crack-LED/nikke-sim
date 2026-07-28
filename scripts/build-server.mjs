// Compile the TypeScript server (src/server/) into dist-server/ — Phase 3's
// server build step (plan §6.4): the server joins the typecheck surface and
// the deploy runs compiled JS, not tsx.
//
//   node scripts/build-server.mjs
//
// Output:
//   dist-server/index.js   esbuild bundle, ESM, node22. @napi-rs/canvas and
//                          sharp stay EXTERNAL (native modules — resolved from
//                          node_modules at runtime).
//   dist-server/assets/    copy of src/infographics/assets/ (Roboto TTFs +
//                          nikkesim-icon.png). THE FONT STEP IS LOAD-BEARING:
//                          a fontless host renders blank text SILENTLY (plan
//                          §1a); env-defaults.ts points fonts.ts at these
//                          copies and fonts.ts throws if a face is missing.
import * as esbuild from 'esbuild';
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${ROOT}/dist-server`;

await esbuild.build({
  entryPoints: [`${ROOT}/src/server/index.ts`],
  outfile: `${OUT}/index.js`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['@napi-rs/canvas', 'sharp'],
  logLevel: 'info',
});

// Fresh asset copy every build (a stale TTF dir is the blank-text bug's
// favorite hiding place).
rmSync(`${OUT}/assets`, { recursive: true, force: true });
cpSync(`${ROOT}/src/infographics/assets`, `${OUT}/assets`, { recursive: true });

console.log('build-server: dist-server/index.js + dist-server/assets/');
