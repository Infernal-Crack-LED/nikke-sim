---
name: submission-intake
description: Check the Nikke Sim Data Submission Google Form for NEW responses, download each submission's screenshot + full-fight video locally, map the form's question/answer columns into a per-submission metadata record, and queue it as a review action item. Use when the owner says "check for new submissions / form responses", periodically to drain the form, or before a hand-tune session that needs fresh community footage.
---

# Submission intake — form responses into the review queue

Turns rows of the **Nikke Sim Data Submission** Google Form into local, review-ready
probe folders. It does NOT read/score the footage — that's `/probe-processing`.
This skill only: detect new rows → download media → record the Q&A → queue it.

## Fixed IDs (the pipeline)

- **Responses sheet** (Google Sheet, form-linked): `1fDdy-GyX2koapcXYkNOQKQGD6cIWPC3dd-rvXX3_HR8`
- **Form (edit)**: `1_yMJD2HI0qwUK5_ZBTNlGl28cZ_C8KM0MWpmnUSo0Mw`
- Landing zone: `docs/probes/submissions/` (gitignored, local media)
- State: `docs/probes/submissions/.sync-state.json` (which rows are already done)
- Queue: `docs/probes/submissions/QUEUE.md` (pending-review list)

These are also stored in `.sync-state.json` so a fresh session can self-locate.

## Prerequisite (one-time, owner) — the `gdrive` rclone remote

Downloads go through **rclone `copyid`, never the Drive MCP `download_file_content`**
— the MCP returns base64 into the model's context, which is fine for the tiny sheet
text but ruinous for a 400–700 MB video. So a read-only Drive remote must exist:

```sh
rclone config create gdrive drive scope=drive.readonly   # opens a browser for Google OAuth
```

`scripts/submissions/pull.sh` checks for this remote and prints the exact command if
it's missing. The Google account authorized here must be the form owner
(maxwellcsutton@gmail.com) so it can see the Forms-uploaded files.

## Procedure

### 1. Read the responses sheet (MCP — text only, cheap)

```
mcp__claude_ai_Google_Drive__read_file_content(fileId="1fDdy-…_HR8")
```

Columns, in order:

| #   | Column                                        | Maps to                                             |
| --- | --------------------------------------------- | --------------------------------------------------- |
| 1   | Timestamp                                     | submission key + folder date                        |
| 2   | Which request number are you fulfilling?      | `requestNumber` (→ `web/src/testing-requests.json`) |
| 3   | Your team (5 units, in slot order)            | `teamRaw` → normalize to slugs (see step 3)         |
| 4   | Boss + element you were advantaged against    | `boss`, `element`                                   |
| 5   | Camera-focused unit                           | `focusRaw` → focus slug                             |
| 6   | End-of-fight team damage breakdown screenshot | Drive link → `screenshotId`                         |
| 7   | Full-fight video (landscape) …                | Drive link → `videoId`                              |
| 8   | Discord handle (…credit you)                  | `discord` (credit + follow-up only)                 |

The link cells are `https://drive.google.com/open?id=<FILE_ID>` — the file ID is
everything after `id=`.

### 2. Diff against state → new rows only

Read `.sync-state.json`. A row's key is `"<Timestamp> | <screenshotId>"` (timestamp
alone can collide; the screenshot ID makes it unique). Any row whose key is not in
`seen[]` is NEW. Process only new rows. If none, say so and stop.

### 3. Normalize team + focus to slugs — DO NOT GUESS (P0)

Submissions arrive in loose shorthand (`TDrake`, `SDoro`, `BSoda`, `MiharaBC`,
`XLud`, `Cindy`, `SSakura`, `Starnis`). Resolve each against `data/characters.json`
(`nicknames` + display names) under the **approved-nicknames / full-name
disambiguation** discipline:

- Prefix letters usually mean a variant (`T…`=Treasure, `S…`=a "…: <word>" variant,
  `B…`=often a burst/variant, `X…`=e.g. `Ludmilla: Winter`). These are RECORDER
  shorthand, not approved nicknames — resolve, don't trust blindly.
- Run `npx tsx scripts/lint-slug-disambiguation.ts` mentally/for real on any bare
  base name (e.g. plain "Sakura", "Helm", "Drake") — if it maps to multiple
  variants you own, it's AMBIGUOUS.
- If ANY unit is ambiguous or unrecognized, set `"needsReview": true` on the
  metadata and write the uncertainty into the queue note — never silently pick one.
  A wrong anchor/focus poisons the downstream read (this is a documented P0 failure).
- The **camera-focused unit** must resolve to exactly one owned unit (the popup
  reader attributes every number to it) — if it doesn't, flag `needsReview`.

### 4. Download the media (rclone, per new row)

Folder name: `docs/probes/submissions/<YYYY-MM-DD-HHMM>-req<N>-<focusSlug>/`
(derive date/time from the Timestamp; use `unknown` for a missing piece).

```sh
scripts/submissions/pull.sh <screenshotId> <folder>/screenshot.<ext>
scripts/submissions/pull.sh <videoId>      <folder>/video.<ext>
```

Get the real extension from file metadata if unsure:
`mcp__claude_ai_Google_Drive__get_file_metadata(fileId=…)` → `fileExtension`.
Videos are large (~350–700 MB) — expect the pull to take a bit; that's rclone, not a
hang. If disk pressure is a concern, you may DEFER the video pull (queue it with the
`videoId` and pull at review time) — but the default is to pull both now.

### 5. Write the per-submission metadata

`<folder>/metadata.json`:

```json
{
  "timestamp": "7/16/2026 12:11:55",
  "requestNumber": "2",
  "teamRaw": "Tove, Nayuta, Drake, BSoda, SDoro",
  "teamSlugs": [
    "tove",
    "nayuta",
    "drake",
    "soda-twinkling",
    "dorothy-serendipity"
  ],
  "boss": "Armstrong",
  "element": "iron",
  "focusRaw": "Drake",
  "focusSlug": "drake",
  "screenshotId": "1Xh6…",
  "videoId": "12dt…",
  "discord": "Tsareenakagame",
  "needsReview": false,
  "reviewNotes": ""
}
```

Keep BOTH the raw strings and your normalization — a later reviewer must be able to
audit the slug mapping.

### 6. Queue it + update state

- **Prepend** an entry to `docs/probes/submissions/QUEUE.md` (newest first):
  ```
  ## PENDING — <folder name>
  - Request #<N> · focus <focusSlug> · <boss> (<element>-weak) · by <discord>
  - Team: <teamSlugs joined>
  - Files: screenshot.<ext> (<size>), video.<ext> (<size or "deferred: id=…">)
  - ⚠ <needsReview reason, if any>
  ```
- Add the row key to `seen[]` in `.sync-state.json` (so it isn't re-downloaded).
- Update the `docs/handoffs/QUEUE.md` **submission-intake count** of pending submissions
  (the durable, tracked handoff — `docs/probes/submissions/QUEUE.md` itself is gitignored).

### 7. Report

Tell the owner: N new submissions pulled, K flagged `needsReview` (and why), total
bytes downloaded, and that they're queued for `/probe-processing`. Do NOT score them
here unless asked.

## Guardrails

- **Read-only**: this skill downloads and records; it never edits engine/overrides.
- **No commit/push** (owner-triggered only, per repo rules). Media is gitignored;
  only the CLAUDE.md pointer + this skill are tracked.
- **Never guess a slug** — flag ambiguity (§3). Wrong focus/anchor is a P0 error.
- **Idempotent**: re-running must not re-download or re-queue a seen row.
- Discord handles are for credit/follow-up; keep them in the (gitignored) queue,
  not in any public-facing doc.
