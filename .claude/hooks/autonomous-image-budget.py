#!/usr/bin/env python3
# autonomous-image-budget.py — NEW PreToolUse hook (2026-07-25), matcher "Read|Bash".
#
# THE PROBLEM IT SOLVES. Image reads are the most expensive action available in this repo, and their
# cost is SUPERLINEAR: each frame is ~1-1.5k tokens, and it stays in context, so frame N does not cost
# 1.5k — it costs 1.5k plus re-carrying the previous N-1 frames on every subsequent turn. Frame-by-frame
# video reading is therefore the single fastest way for an unattended run to consume a quota. On
# 2026-07-24 a review of the VLM/OCR reader did exactly this for ~5 hours (~6% of a weekly limit),
# hand-reading 7 videos to re-derive labels the regression harness already held.
#
# /probe-processing already carries a "ZERO frame reads by default, ≤3 frames.ts calls" rule — as PROSE.
# An unattended run that has convinced itself the frames are necessary reads that prose and continues.
# This makes it a DENY, which cannot be reasoned past.
#
# BEHAVIOUR (autonomous runs only; attended sessions exit 0 immediately — the owner is watching):
#   • Read of an image file  → counted. Warn at 60% and 85% of budget, DENY at 100%.
#   • Bash running frames.ts → counted separately, WARN only (extraction is cheap; reading the output
#     is what costs). Crossing it is the tell that a frame hunt has started.
#   • Everything else → exit 0.
#
# Budgets (per session, override at launch):
#   NIKKE_IMAGE_BUDGET   default 30   image reads before DENY
#   NIKKE_FRAMES_BUDGET  default 6    frames.ts invocations before a standing warning
#
# STATE: a JSON counter in TMPDIR keyed on session_id, so it self-expires and never needs cleanup. A
# missing/corrupt state file fails OPEN (counts restart) — this hook must never block real work.
#
# ESCAPE HATCH: the deny text tells the run how to proceed legitimately — the reader scripts produce
# JSON (cheap) instead of images (expensive), and the Sonnet-pinned `probe-scaffold` agent exists to do
# image work in a context that is not the Opus main loop. Denying the expensive path only helps if the
# cheap path is named, so it is named.
import json, os, re, sys, pathlib

IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".tif", ".heic")
IMG_DEFAULT = 30
FRAMES_DEFAULT = 6


def emit(decision, reason):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                             "permissionDecision": decision,
                                             "permissionDecisionReason": reason}}))
    sys.exit(0)


def note(ctx):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                             "additionalContext": ctx}}))
    sys.exit(0)


try:
    data = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)  # fail-open

auton = os.environ.get("NIKKE_AUTONOMOUS", "")
if not auton or auton in ("0", "false"):
    sys.exit(0)  # attended: no cap

tool = data.get("tool_name", "") or ""
ti = data.get("tool_input") or {}
if not isinstance(ti, dict):
    sys.exit(0)

kind = None
if tool == "Read":
    p = (ti.get("file_path") or "").lower()
    if p.endswith(IMAGE_EXT):
        kind = "img"
elif tool == "Bash":
    if re.search(r"\bframes\.ts\b", ti.get("command") or ""):
        kind = "frames"
if kind is None:
    sys.exit(0)

try:
    img_budget = int(os.environ.get("NIKKE_IMAGE_BUDGET") or IMG_DEFAULT)
except Exception:
    img_budget = IMG_DEFAULT
try:
    frames_budget = int(os.environ.get("NIKKE_FRAMES_BUDGET") or FRAMES_DEFAULT)
except Exception:
    frames_budget = FRAMES_DEFAULT

sid = re.sub(r"[^A-Za-z0-9_-]", "", str(data.get("session_id", "nosid")))[:64] or "nosid"
state_path = pathlib.Path(os.environ.get("TMPDIR", "/tmp")) / f"nikke-imgbudget-{sid}.json"

state = {"img": 0, "frames": 0}
try:
    if state_path.exists():
        loaded = json.loads(state_path.read_text())
        if isinstance(loaded, dict):
            state.update({k: int(loaded.get(k, 0)) for k in ("img", "frames")})
except Exception:
    pass  # fail-open: restart the count rather than block

state[kind] = state.get(kind, 0) + 1
try:
    state_path.write_text(json.dumps(state))
except Exception:
    pass

CHEAP_PATH = (
    "CHEAPER ROUTES, in order of preference:\n"
    "  1. The reader SCRIPTS return JSON, not images — scripts/probe/read-popups-vlm.ts, read-pellets.ts, "
    "read-total-damage.ts, read-burst-gauge.ts, read-battle-records.ts, read-ammo.ts, scan.ts, "
    "count-pellets.py. Reading their JSON costs a fraction of reading frames.\n"
    "  2. ALREADY-PARSED data: docs/probe-data/*.json (one file per parsed video), docs/probe-runs.md, "
    "scripts/tests/** pins, the regression snapshot. See docs/VALIDATION-INDEX.md — if the answer is "
    "already recorded, reading frames re-derives it at maximum cost.\n"
    "  3. Delegate image work to Agent(subagent_type:'probe-scaffold') — it is pinned to Sonnet and runs "
    "in its own context, so frames do not accumulate in this one.\n"
    "  4. If you genuinely must look: ONE batched frames.ts call with --times \"t1,t2,t3\" and a contact "
    "--sheet, which is a single image instead of N."
)

if kind == "frames":
    if state["frames"] > frames_budget:
        note(f"[frames budget] This is frames.ts call #{state['frames']} this session (soft budget "
             f"{frames_budget}; /probe-processing's rule is ≤3 per video). Crossing this is the signature of "
             f"a frame hunt, which is the most expensive thing an unattended run can do.\n{CHEAP_PATH}\n"
             "⇒ If you cannot resolve the question within the budget, that is a STOP-and-report, not a "
             "reason to keep extracting. Write down what is unresolved and move on.")
    sys.exit(0)

# kind == "img"
used, left = state["img"], img_budget - state["img"]
if used > img_budget:
    emit("deny",
         f"⛔ AUTONOMOUS IMAGE BUDGET EXHAUSTED — {used} image reads this session (limit {img_budget}).\n"
         "Image reads are the most expensive action in this repo and their cost is SUPERLINEAR: each frame "
         "stays in context, so every later turn re-pays for every earlier frame. An unattended frame hunt "
         "is how a night's quota disappears (2026-07-24: ~5h / ~6% of a weekly limit re-deriving labels the "
         "harness already had).\n"
         f"{CHEAP_PATH}\n"
         "⇒ DO NOT work around this by batching the same frames into one contact sheet you then read "
         "repeatedly, and do NOT spawn a subagent purely to keep reading frames from a fresh context. If "
         "the question truly requires more visual evidence than this budget allows, STOP: write what you "
         "found, what remains unresolved, and what recording/timestamps would settle it, then continue "
         "with other queued work. Raising the cap is an OWNER decision (NIKKE_IMAGE_BUDGET).")

if used == int(img_budget * 0.6) or used == int(img_budget * 0.85):
    note(f"[image budget] {used}/{img_budget} image reads used this session ({left} left, then a hard "
         f"DENY). If you are reading frames to derive something, check docs/VALIDATION-INDEX.md first — "
         f"it may already be recorded.\n{CHEAP_PATH}")

sys.exit(0)
