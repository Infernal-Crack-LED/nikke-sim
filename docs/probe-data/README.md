# Parsed probe data

Structured, version-controlled records of what we read out of each probe video — so a
recording can be reviewed again **cheaply**, without re-running ffmpeg extraction and
re-reading every popup by eye.

The raw recordings under `docs/probes/` are gitignored (private media). The **parsed
numbers** (popup values, timestamps, crit/core flags) live here, one JSON file per parsed
video, and are tracked. `docs/probe-runs.md` remains the human prose log of findings;
these files are the machine-reviewable data behind those findings.

## Why

Reading popups off a video is the expensive step (contact sheets → frame-by-frame reads).
Persisting the result means later questions — "do this unit's DoT ticks ever crit?",
"what was the per-hit spread?", "re-grade against a new sim value" — become a JSON load
plus an analysis pass (e.g. `scripts/probe/dot-crit.ts`), not another manual video read.

## Format

One file per parsed video: `docs/probe-data/<slug>.json` (`<slug>` = a short handle,
usually `<probe>-<focus>`, e.g. `control-little-mermaid`). Schema and helpers live in
`scripts/probe/parsed.ts`.

| field           | meaning                                                                                |
| --------------- | -------------------------------------------------------------------------------------- |
| `video`         | repo-relative path to the source recording                                             |
| `focus`         | slug of the camera-focus unit (popups belong ONLY to the focused unit)                 |
| `boss`          | boss element (`null` = neutral)                                                        |
| `comp`          | team slug list in slot order                                                           |
| `basis`         | validation basis, e.g. `scope-lock base5`                                              |
| `extractedOn`   | date the read was done (`YYYY-MM-DD`)                                                  |
| `method`        | how popups were read (contact-sheet fps, crop, full-res frames)                        |
| `fightStartSec` | video time where the fight (AMBUSH) begins, if known                                   |
| `fightClock`    | `true` if `popups[].t` is fight-relative rather than video-relative                    |
| `popups[]`      | the readings: `t` (seconds), `value` (damage), optional `crit`, `core`, `kind`, `note` |

`kind` is a best-effort tag (`normal`, `charge`, `proc`, `dot`, `nuke`, `barrage`, …).
Leave `crit`/`core` unset when the frame didn't let you tell — absent means "not
determined", not "false".

## Discipline

- Popups are FOCUS-UNIT-ONLY (including damage received by that unit's own summons).
  Never attribute a popup by value coincidence.
- Record what you SAW, not what the sim predicted. Sim comparison happens in the analyzer.
- A partial or overlapping read gets a `note`; don't silently drop it.

## Tooling (`scripts/probe/`)

- `hit-values.ts <focus> <team…> --boss <E>` — per-unit hit-value table; **run first** to map a popup
  value → hit type (normal/DoT/proc/barrage/nuke). The attribution key; eyeballing mis-attributes.
- `frames.ts <video> --at <s> [--dur --fps --region crosshair|character|full --sheet --zoom]` — ffmpeg
  extraction with region presets (crosshair = damage, character = heals); `--fps 60` for fast streams.
- `classify.py <img-glob> [--region … --rate]` — popup colour classifier (crit/core/normal/heal by
  colour + region; approximate rate). No OCR — values are still read by eye.
- `read-popups-vlm.ts <video> --focus <slug> [--fps --at --dur --endpoint --model …]` — EXPERIMENTAL
  MVP that automates the value read: a local vision model (Qwen2.5-VL via llama.cpp) reads popup
  VALUES + the fight timer per frame, dedups repeats across frames, emits Popup-schema JSON. Classical
  CV could not separate popups from the bright moving boss; the VLM reads the scene semantically.
  Output is UNVALIDATED — confirm against `hit-values.ts` before trusting. `--mock` runs the pipeline
  without a server.
- `parsed.ts` — validate/list parsed files. `catalog.ts` — recording index (`catalog.json`).
- `dot-crit.ts` — crit-signature analyzer over a parsed file.

## Validate

```sh
npx tsx scripts/probe/parsed.ts     # lists + structurally validates every parsed file
npx tsx scripts/probe/catalog.ts    # coverage: which recordings are catalogued / parsed
```
