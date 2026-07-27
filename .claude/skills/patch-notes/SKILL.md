---
name: patch-notes
description: Draft player-facing patch notes for the web app's Patch Notes page from the DECISIONS log, get owner approval, then publish. Use whenever the owner is about to make a PR or push to main (the pre-pr-patch-notes hook nudges here), or says "patch notes" / "update the changelog". Translates internal engine/override rulings into community-readable notes; never publishes without approval.
---

# Patch notes

## When to use

- The owner is about to **make a PR or push to `main`** (the `pre-pr-patch-notes.sh` PreToolUse
  hook fires a reminder), OR the owner says "patch notes" / "update the changelog".
- There are new settled changes worth telling players about (usually new `docs/DECISIONS.md`
  entries since the last published note).

The Patch Notes page (`/patch-notes`, `web/src/PatchNotesPage.tsx`) renders
`web/src/patch-notes.json`. This skill turns internal WHY-log entries into the
community-readable notes that file holds.

## Steps

1. **Find the coverage window.** Read `web/src/patch-notes.json` (array, newest first). The top
   entry's `date` is the last published note — new notes cover changes settled _after_ it.

2. **Collect what changed.** Read `docs/DECISIONS.md` and take the dated entries
   (`**(YYYY-MM-DD) …**`, newest first) with a date after the last published note. Cross-check the
   session's own work and the current handoff (`docs/handoffs/*`, `docs/handoffs/QUEUE.md`) for
   anything player-visible that didn't land a DECISIONS entry (e.g. a board/accuracy move, a new
   modeled unit or mechanic). Skip pure-internal churn (refactors, test harness, doc plumbing).

3. **Draft the notes.** One entry: a short `title`, and 2–5 `notes` bullets. Rules:
   - **Player-facing voice, no invented abbreviations** (per the DECISIONS 2026-07-13 doc-audience
     ruling; common game terms like B1 / MG / Full Burst are fine).
   - **No internal file paths, function names, override slugs, or ⚑ calibration jargon.** Translate
     ("re-modeled Snow White: Heavy Arms's volley onto her in-window shots" → "Snow White: Heavy
     Arms's burst volley now lands where the game actually places it").
   - Frame it as "what got more accurate / what changed," not the evidence trail.

4. **Get owner approval.** Show the drafted entry (title + bullets) and the exact JSON that would be
   prepended. **Do not write the file yet.** Wait for an explicit go-ahead; revise on feedback.

5. **Publish on approval.** Prepend the new entry to `web/src/patch-notes.json` (newest first),
   `date` = today's date (from session context, `YYYY-MM-DD`). Keep the file valid JSON, 2-space
   indented, matching the existing shape `{ "date", "title", "notes": [] }`.
   **The file is prepend-only history** (owner ruling 2026-07-14): every entry keeps its date
   stamp and stays forever — never edit, merge, or replace an entry that has shipped to `main`.
   Same-day follow-up changes get their own new entry (two entries may share a date). The page
   sorts newest-first by date defensively, but keep the file ordered that way too.

6. **Verify** (below), then remind the owner this is a public-repo file — it ships with the next
   web deploy and travels with the normal commit (owner-triggered, as always).

## Verify

```sh
npm run web:build && node scripts/web-smoke.mjs   # site still builds + renders with patch-notes.json
bash scripts/verify.sh
```

Then eyeball `/patch-notes` in `npm run web` — the new entry shows at the top of Patch notes.
