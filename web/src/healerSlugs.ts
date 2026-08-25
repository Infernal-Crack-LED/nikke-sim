// Healer candidates for the "Include Healer" generator toggle — shared by the
// requiredAny constraint in genCalc.ts and the roster shortfall explainer's
// diagnosis (App.tsx). Lives in its own vite-free module (JSON import via
// attribute, no import.meta.glob) so the generator test suites can import the
// REAL list under the root NodeNext tsconfig instead of reconstructing it.
//
// The healer tag is prose-derived (scripts/build-archetype-tags.ts), so it can't
// see kit conditions. A tagged healer whose heal cannot ACTIVATE in a team the
// generator builds must not satisfy the toggle — fielding them as the team's
// healer delivers zero healing:
//   - anis-star: heal is formation-gated on a SECOND Burst I ally
//     (`formation: hasB1`, src/skills/overrides/anis-star.json), and the search
//     never fields double Burst I from enumeration (reachable only via explicit
//     user locks — in that corner she could heal but still won't satisfy the
//     toggle, which costs at most a redundant second healer).
//   - delta-ninja-thief: heal requires a Defender ally; requiredAny is a static
//     list and can't express the conditional, so she is excluded outright (a
//     team that happens to carry a Defender simply fields a second healer).
// mint stays: her own heal is solo-mode-only, but the mint+prika together rule
// guarantees prika (an unconditional duet healer) whenever mint's is off.
import archetypeTagsJson from '../../data/archetype-tags.json' with { type: 'json' };

const tags = (archetypeTagsJson as { tags: Record<string, string[]> }).tags;

export const CONDITIONAL_HEALERS: ReadonlySet<string> = new Set([
  'anis-star',
  'delta-ninja-thief',
]);

export const HEALER_SLUGS: string[] = Object.entries(tags)
  .filter(([slug, t]) => t.includes('healer') && !CONDITIONAL_HEALERS.has(slug))
  .map(([slug]) => slug);
