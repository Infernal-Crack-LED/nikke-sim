# Sighted review prompt template (v2 — uses per-unit extracts, no large file reads)
#
# Usage: replace <slug> and <name> before sending to the agent.
# Run max 3 agents at a time to avoid freezing.

## NON-NEGOTIABLES
1. EXACT SLUG — `<slug>` (<name>). Never conflate base with variant.
2. MEASURED > FUDGE. 3. WHOLE-PICTURE. 4. PROVE-IT-DIFFERENTLY. 5. TREAD LIGHTLY. 6. RETURN STRUCTURED.

## TASK: Full-context kit review (SIGHTED)

Read the full instructions: /Users/maxwellsutton/nikke-sim/scripts/blind-rebuild/FULL-CONTEXT-REVIEW.md

Then read these 4 files (each ONCE, do NOT re-read, do NOT use grep_search):
1. `/Users/maxwellsutton/nikke-sim/scripts/blind-rebuild/char-extracts/<slug>.json` — character data (skill prose + stats)
2. `/Users/maxwellsutton/nikke-sim/scripts/blind-rebuild/ks-extracts/<slug>.json` — kit-status entry
3. `/Users/maxwellsutton/nikke-sim/src/skills/overrides/<slug>.json` — the full override
4. Run: `cd /Users/maxwellsutton/nikke-sim && npx tsx scripts/board-read.ts 2>&1 | grep -i "<slug>"` (just this unit's row)

After reading ALL, produce the review JSON.

For EVERY line of every skill (skill1/skill2/burst), record: MODELED_BLOCK, MODELED_CONFIG, UNMODELED, or MISSING.

Return ONLY the review JSON (format per FULL-CONTEXT-REVIEW.md). Do NOT write files.
