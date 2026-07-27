// Register the bundled Roboto faces with @napi-rs/canvas so infographics render
// text on any platform (fontless Linux containers ship no system fonts, and an
// unregistered family fails SILENTLY — valid PNG, correct layout, zero glyphs).
// Roboto is Apache 2.0 licensed (googlefonts/roboto).
//
// NODE ONLY — never import this from a module the web bundle can reach (the
// eslint `no-restricted-imports` rule on src/infographics/core/** enforces the
// boundary). Import it once, BEFORE any canvas rendering (the renderers
// reference the 'Roboto' family via FONT in core/theme.ts) — node/render.ts is
// the single entry point that does this. Registration is verified: if any face
// fails to register we throw here, at import time, so a misconfigured host
// refuses to boot instead of serving textless cards.
import { GlobalFonts } from '@napi-rs/canvas';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// NIKKESIM_FONT_DIR lets a COMPILED host (the dist-server bundle, whose
// import.meta.url no longer sits next to the source tree) point at the TTF
// copies its build step shipped. Unset = the source-tree default every tsx /
// vitest run uses.
const FONT_DIR =
  process.env.NIKKESIM_FONT_DIR ??
  fileURLToPath(new URL('../assets/fonts/', import.meta.url));
const FACES = ['Roboto-Regular.ttf', 'Roboto-Medium.ttf', 'Roboto-Bold.ttf'];

for (const face of FACES) {
  const ok = GlobalFonts.registerFromPath(join(FONT_DIR, face), 'Roboto');
  if (!ok) {
    throw new Error(
      `infographics fonts: failed to register ${face} — text would render ` +
        `blank. Check that src/infographics/assets/fonts/ shipped with the build.`
    );
  }
}
