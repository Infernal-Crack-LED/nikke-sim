---
name: testing-requests
description: Publishing recording asks for owner-unowned units to the community Testing Requests web page (uses hand-tune-batches rules). Use when the owner wants to ask the community for specific unit recordings.
---

# Testing requests — the community recording board

## What this is for

Maintain `web/src/testing-requests.json`, the **Testing Requests** page
(`#testing-requests`) rendered by `web/src/TestingRequestsPage.tsx`. It asks the
community to record teams the OWNER can't test themselves — teams featuring units
the owner doesn't own — so we can still hand-tune those units' overrides.

This skill is the publish step; the TEAMS come from `/hand-tune-batches` (same
construction + focus rules). Use this when the owner says "update testing
requests / requirements," adds/removes owned units, or after a purge changes
which unmodeled units survive.

## Which units get a request

A unit belongs on this page when BOTH hold:
1. **Owner doesn't own it** — see the unowned-units memory (kept current as the
   owner names more).
2. **It survives the roster methodology** — enikk-proven OR already has a
   hand-tuned override (DECISIONS 2026-07-14, `/enikk-audit`). Units the purge
   removes (not enikk-proven, no override) get NO request — we won't model them.

A unit must also be simmable (in `characters.json`) to build a predicted team;
enikk-proven units not yet in `characters.json` are blocked on base data first.

## Building each request

Follow `/hand-tune-batches` for team sourcing + the focus/slot rules, then:

- **Center the focus target** (middle slot = default focus) and, for a B3 target,
  make it the main-burst carry. State it in the note so the recorder just uses
  default focus.
- **`(T)` = Treasure**, and it comes from DATA, never a guess: a unit is a
  treasure iff `characters.json` has `treasure: true` (synced from the DB's
  `prydwen_slug` ending `-treasure`). Mark every treasure unit in the team string
  with ` (T)`. If a unit's treasure isn't flagged in Bakery Bot yet, it won't
  show `(T)` — the data is the source of truth.
- **Note format**: `Focus <Unit> (middle slot = default focus[, main-burst B3]) ·
  full-fight recording for hand-tuning · vs <Boss> (<element>-weak)`.
- Sim the team first (valid rotation + prediction to grade against).

### JSON shape

Array of `{ id, team, note }`, `id` ascending (the page sorts by id and shows it
as the quote-able request number). `team` = display names in slot order (middle =
focus), `(T)` on treasures. Keep it valid JSON, 2-space indented.

## Capture-format requirement (do not drop)

The page's "How to run a test fight" methodology MUST tell recorders to capture on
the **phone client held horizontal (landscape)**. The screenshot reader that pulls
per-unit numbers is calibrated to the mobile UI in landscape — PC-client
screenshots or portrait phone captures can't be parsed. This lives in both the
"Capture the result" bullet and the required-screenshot bullet under "Where to
submit"; keep it in any rewrite.

## Submission channel — Google Form (not Discord)

Submissions go through a **Google Form** (`dev.testingFormUrl` in
`web/src/site-data.ts`), NOT a Discord post or a shared Drive folder. The form's
file-upload questions collect the damage screenshot (required) and full-fight
video, and Forms drops them into a Drive folder automatically — so there's no
folder to keep publicly writable. The form fields mirror the "Where to submit"
list: screenshot upload, video upload, team (slot order), boss element, request
number, and camera-focus unit. If the form's fields change, keep that page list
in sync. The
Drive tools available here can create a folder but can't build/populate a Form —
the owner builds the form and pastes its `viewform` URL into `testingFormUrl`.

## Verify

```sh
npm run web:build && node scripts/web-smoke.mjs   # page renders the JSON
```
Then eyeball `#testing-requests`.
