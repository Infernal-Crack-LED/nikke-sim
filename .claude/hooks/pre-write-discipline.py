#!/usr/bin/env python3
# pre-write-discipline.py — ROUTER redesign of the PreToolUse discipline hook (2026-07-21, hardened r2).
#
# Replaces the always-emit-all-8 checklist with a router that emits ONLY the guard(s) whose
# firing condition the specific action actually matches. Restores the SIGNAL VALUE of each guard
# (a point that only appears when relevant gets read; a wall gets skimmed) and cuts per-action
# context/noise. Fail-OPEN: any parse error or unexpected shape exits 0 (no guard, never blocks).
#
# Wire it (settings.json PreToolUse, matcher "Edit|Write|MultiEdit|Agent|Task"):
#   command: python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-write-discipline.py"
#
# r2 hardening: MultiEdit edits[] aggregated; VALUE_SURFACE lookbehind excludes docs/data/ prose;
#   CLAUDE.md + STATE.md in SHARED_ARTIFACT; slug lint gated to project-content paths + agent spawns;
#   Agent `description` scanned alongside `prompt`.
# r3 (2026-07-22): TEST_AGENT scans subagent_type; P5 points at /scientific-method; R5/P9 enactment gate.
#
# ─── r4 (2026-07-25) — MAKE THE EVIDENCE GUARDS TWO-SIDED, AND ADD REUSE-BEFORE-DERIVE ───────────
# Root cause addressed: every guard here stated a FLOOR on evidence and none stated a CEILING, so the
# compliant reading of P4/P7 was always "not yet proven — go derive more." That is not a hypothetical:
# a 2026-07-24 review of a VLM/OCR reader spent ~5 hours and ~6% of a weekly quota hand-reading 7
# videos frame-by-frame to re-derive ground truth THE REGRESSION HARNESS ALREADY HELD. Nothing here
# was violated — the rules asked for it. Changes:
#   1. P4 and P7 gain an explicit SUFFICIENCY clause: an existing labeled fixture / snapshot / test in
#      this repo COUNTS as the independent method, and when the bar is met the instruction is ACT.
#   2. NEW P10 REUSE-BEFORE-DERIVE, routed on a broad "about to validate/verify/measure" agent spawn —
#      cheap (3 lines) and it fires on the class of action that produced the burn.
#   3. TEST_AGENT narrowed. `\btest\b|\bplan\b|validat|judge|reconcil|attribut|Fable` matched nearly
#      every subagent spawn in this project, so the ~200-word P5+P6 premise-gate block was effectively
#      always-on — i.e. back to the wall-of-text the router was built to kill. Now: the four durable
#      sci-method subagent_types by name, plus genuinely empirical keywords.
#   4. Slug lint skipped for trivial edits (<80 chars of changed text) and timeout 15s→10s. The lint
#      spawns `npx tsx` (~1-2s) on essentially every project write; over an overnight run that is real
#      wall clock. (Proper fix later: read data/characters.json inline instead of spawning.)
#
# ─── r5 (2026-08-11) — INERTNESS/A-B CLAIMS JOIN THE VERDICT ESCALATION (owner-approved, Tier 0/D5) ──
# "inert" / "byte-identical" / "moved by exactly zero" is a verdict verb: it asserts a measured result
# whose truth depends on the ROSTER it was measured in, and the losing case is silent (a claim that
# looks careful, is unfalsifiable as written, and is wrong by 22.6%). Same routing as the other verdict
# verbs — content predicate AND SHARED_ARTIFACT target — with its own escalation text, because the
# burden here is "in which fixture, with which enabling teammate", not "at what n".
#
# Companion: destructive-bash-guard.py (Bash tier), autonomous-blast-radius.py (autonomous diff cap).
import json, os, re, subprocess, sys

def out(ctx):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": ctx}}))
    sys.stdout.flush()

try:
    raw = sys.stdin.read()
    data = json.loads(raw)
    tool = data.get("tool_name", "") or ""
    ti = data.get("tool_input", {}) or {}
    if not isinstance(ti, dict):
        sys.exit(0)
except Exception:
    sys.exit(0)  # fail-open

path = ti.get("file_path", "") or ""
edits = ti.get("edits") or []          # MultiEdit
if not isinstance(edits, list):
    edits = []
olds = [ti.get("old_string") or ""] + [e.get("old_string") or "" for e in edits if isinstance(e, dict)]
news = [ti.get("new_string") or "", ti.get("content") or ""] + [
    e.get("new_string") or "" for e in edits if isinstance(e, dict)]
old = "\n".join(x for x in olds if x)
new = "\n".join(x for x in news if x)
prompt = "\n".join(x for x in (ti.get("prompt") or "", ti.get("description") or "") if x)
subagent = ti.get("subagent_type", "") or ""
blob = f"{new}\n{prompt}"

is_agent = tool in ("Agent", "Task") or bool(subagent) or (not path and bool(ti.get("prompt")))

# ---- TARGET predicates (path-based) ----
VALUE_SURFACE = bool(re.search(r"src/skills/|overrides-baselines/|src/engine/|(^|(?<!docs)/)data/|docs/data/.*\.json",
                               path))
IS_DECISIONS = "DECISIONS.md" in path
IS_SNAPSHOT = ("regression-snapshot" in path) or ("regression.ts" in path)
SHARED_ARTIFACT = (VALUE_SURFACE or IS_DECISIONS or IS_SNAPSHOT
                   or bool(re.search(r"docs/data/|open-questions\.md|modeling-priors\.md|STATE\.md|CLAUDE\.md$", path)))

# ---- CONTENT predicates ----
VERDICT = re.compile(r"VALIDATED|REFUTED|SUPERSEDED|DEBUNK|overturn|is (now )?(GONE|DELETE)")
has_verdict = bool(VERDICT.search(blob))
verdict_enact = has_verdict and SHARED_ARTIFACT

# r5 (2026-08-11, owner-approved — faithfulness Tier 0 / D5): AN INERTNESS OR A/B CLAIM IS A VERDICT.
# "inert" / "byte-identical" / "the board moved by exactly zero" asserts a MEASURED result, but whether
# a tag reaches damage depends on who else is in the comp — so the identical claim can be true in one
# fixture and wrong by tens of percent in another. Root: `alice` (SR/Fire, not alice-wonderland-bunny)
# carried "inert, verified byte-identical" for `hasPierce`, measured in a PIERCE-FREE fixture; her only
# graded comp seats `mint`, whose S2 makes the tag worth 22.6% of her damage. The A/B was not run
# carelessly — it was run correctly in the wrong roster, and nothing in its wording revealed which
# roster that was. A pattern LINT was rejected with numbers (620 mentions across 153 override files,
# most of the strong-looking ones "board A/B is the discriminator" — a plan, not a result, so a
# ~100-file backfill would be mostly false positives). The hook is the one place that catches the claim
# at WRITE time, and like every guard here it gates on the TARGET: only when it lands on a shared
# artifact. Convention text: docs/CONVENTIONS.md "An inertness or A/B claim must NAME ITS ROSTER".
INERT = re.compile(r"byte[-\s]?identical|board[-\s]?inert|\binert(ness)?\b|"
                   r"(move[sd]?|change[sd]?) (by )?(exactly )?zero|zero (board )?(movement|change)", re.I)
inert_enact = bool(INERT.search(blob)) and SHARED_ARTIFACT

def nums(s):  # numeric literals, for detecting a value change on an Edit
    return re.findall(r"-?\d+\.?\d*", s)

value_changed = VALUE_SURFACE and (tool == "Write" or (bool(old) and nums(old) != nums(new)))

ATTRIB = re.compile(r"\bHOT\b|\bCOLD\b|\bdrift|\bratio\b|sim/real|over-?credit|under-?credit|\b\d\.\d{2,}\b|±\d")
has_attribution = bool(ATTRIB.search(blob))

# r4: NARROWED. The four durable /scientific-method subagents by name (they must ALWAYS trip R3),
# plus genuinely empirical keywords. Dropped from r3: \btest\b, \bplan\b, validat, reconcil, attribut,
# Fable, judge — each of which matched routine non-empirical spawns and kept P5+P6 permanently on.
SCI_AGENT = subagent in ("premise-verifier", "preop-judge", "postop-judge", "implementation-reviewer")
TEST_AGENT = is_agent and (SCI_AGENT or bool(re.search(
    r"empirical|premise|pre-?op\b|post-?op\b|hypothes|ground.?truth|frame.by.frame|measure the|re-?derive",
    f"{prompt}\n{subagent}", re.I)))

# r4: BROAD but CHEAP — the reuse-before-derive nudge. Deliberately wider than TEST_AGENT because the
# 5-hour burn started from an innocuous-looking "review this implementation" spawn.
DERIVE_AGENT = is_agent and bool(re.search(
    r"validat|verif|review|measur|ground.?truth|cross-?check|accuracy|confirm|score|read the (video|frames)",
    f"{prompt}\n{subagent}", re.I))

# ---- slug lint (only its OUTPUT gates point 1 — no lint hit ⇒ point 1 silent) ----
LINTABLE = is_agent or bool(re.search(r"docs/|src/|scripts/|(^|(?<!docs)/)data/|CLAUDE\.md$|README", path))
# r4: skip the ~1-2s npx spawn for trivial edits — a <80-char change cannot introduce a unit reference
# worth a P0 slug check, and over an overnight run these spawns are real wall clock.
if LINTABLE and not is_agent and len(blob.strip()) < 80:
    LINTABLE = False
# r4: META-FILE EXCLUSION. Files that DESCRIBE the guards quote unit names as EXAMPLES ("Snow White vs
# Snow White: Heavy Arms", "anchor identity"), so editing the guard machinery reliably trips the guard —
# observed live while authoring this very file (3 false positives in one write: Snow White, Anchor, D).
# Same principle as verdict_enact: gate on the TARGET, not the word.
if LINTABLE and re.search(r"\.claude/hooks/|subagent-non-negotiables|guardrail-rework/|"
                          r"\.claude/skills/[^/]+/SKILL\.md$", path):
    LINTABLE = False
lint = ""
if LINTABLE and blob.strip():
    try:
        lint = subprocess.run(
            ["npx", "tsx", "scripts/lint-slug-disambiguation.ts"],
            input=blob, capture_output=True, text=True, timeout=10,
            cwd=os.environ.get("CLAUDE_PROJECT_DIR", "."),
        ).stdout.strip()
    except Exception:
        lint = ""

# ---- canonical guard texts (condensed from the pre-router hook; keep meaning in sync) ----
P1 = ("SLUG/NAME: is the EXACT slug verified (base vs variant)? Many NIKKEs share a base name (Snow White "
      "vs Snow White: Heavy Arms) with entirely different kit/weapon/element — conflating is a P0 failure. "
      "Reason from the slug, not the base name. Units ONLY by full name, slug, or an APPROVED nickname.")
P2 = ("MEASURED > FUDGE: are you modeling a REAL OBSERVED mechanic, or inventing/tuning an unobserved value "
      "to hit a number? A calibrated value must trace to same-tier evidence — never fabricate to close a gap.")
P3 = ("WHOLE vs SHARD: does this reading cohere with ALL known constraints (fire rate, ammo, arithmetic total, "
      "mechanic math, board blast-radius, which recording it came from)? A locally-plausible claim that "
      "contradicts something you already know is WRONG — the contradiction is the tell.")
# r4: sufficiency clause added. Without it this guard has no upper bound — every level of evidence can be
# met with "but could you prove it another way?", which is how a review turns into a 5-hour re-derivation.
P4 = ("PROVE-IT-DIFFERENTLY: could you prove this by an INDEPENDENT method (different from how you derived "
      "it)? If the only support is the same derivation, it is an UNVERIFIED HYPOTHESIS.\n"
      "  ⇒ AND CONVERSELY — WHAT COUNTS AS 'INDEPENDENT' IS ALREADY IN THIS REPO. An existing labeled "
      "fixture, a regression snapshot, a vitest pin, docs/probe-data/*.json, or a prior measurement in "
      "docs/probe-runs.md IS an independent method: its labels were produced independently of your current "
      "derivation. Using one is a REAL check, not a shortcut. When such a check exists and passes, the bar "
      "is MET — say so and ACT. Naming a further conceivable experiment is not a reason to withhold.")
P5 = ("PREMISE GATE: does the plan rest on a LOAD-BEARING premise held in memory (anchor identity / basis "
      "cleanliness / a ground-truth value / a prior result reused from chat)? Spawn a FRESH-CONTEXT premise-"
      "verification subagent to re-derive that ONE premise from PRIMARY FILES, BLIND to your belief; CONFIRM "
      "before the plan rests on it. ⇒ RUN THE SKILL: /scientific-method (step 0 spawns "
      "Agent(subagent_type:'premise-verifier'), one per premise, in parallel). LOAD-BEARING ONLY — a premise "
      "you read from a file this session and have not mutated does NOT need re-probing.")
P6 = ("FULL-CONTEXT GATE: before putting a unit under test, read for that EXACT slug its characters.json + "
      "kit-status.json + override (note/caveats/unmodeled) + board accuracy — THEN rule EACH documented ⚑ "
      "confound OUT before attributing a sim/real gap to the mechanic under investigation.")
# r4: sufficiency clause added (second paragraph). The first paragraph alone is a one-way ratchet.
P7 = ("EVIDENCE-PROPORTIONALITY / MEASUREMENT ≠ ENACTMENT: what is the n + evidence TIER behind THIS change, and "
      "does its blast radius exceed them? n=1 / one recording / MEDIUM-confidence RECORDS an observation; it may "
      "NEVER in the same motion change a constant/default, rewrite a plan's direction, stamp a verdict, or "
      "overturn DECISIONS — those need ≥ same-tier evidence at n≥5 or independent confirmation AND a separate "
      "gated enactment pass.\n"
      "  ⇒ TWO-SIDED: this bounds the action to the evidence in BOTH directions. When the tier IS met, the "
      "instruction is ACT — land it, with the tier stated. Do not escalate a met bar into a larger "
      "investigation, and do not treat 'more evidence is conceivable' as 'evidence is insufficient'. State "
      "explicitly what would be sufficient, check whether it already exists in the repo, and if it does, use "
      "it and proceed. Over-validation is a real failure mode here, with real cost.")
P8 = ("BATCH-AND-STOP: a per-unit sweep finding is FINDINGS-ONLY — it may NOT edit shared/load-bearing artifacts "
      "(engine, DECISIONS, plan docs, snapshot). A cross-cutting signal across units → STOP and surface ONE "
      "batched proposal, never a sweeping shared change mid-sweep.")
P9 = ("SCI-METHOD GATE: this edit ENACTS a value on a load-bearing surface. FIRST ASK: DO WE KNOW THE ANSWER?\n"
      "  ⇒ NO — the value is DERIVED (from a measurement, a fit, an inference, a residual attributed to a "
      "mechanic): /scientific-method governs. IMPLEMENT requires 2-of-2 ACCEPT (driver + BLIND Fable "
      "postop-judge) at HIGH+HIGH. Name the decision-log entry in docs/handoffs/scientific-method-harness.md "
      "that authorized it — or, if no pipeline ran, STOP and run it. Judge-approved-but-below-HIGH is a LOG "
      "decision: record it as an owner action item and DO NOT touch the engine.\n"
      "  ⇒ YES — the modeling question is already ANSWERED (an OWNER RULING on game behaviour, a literal kit "
      "line, an existing labeled fixture/vitest pin asserting this exact value): the pipeline has nothing to "
      "gate — it resolves UNKNOWNS, and re-litigating a settled fact is pure cost (owner ruling 2026-08-11). "
      "CITE the ruling/line/fixture and encode it. The gate MOVES rather than disappears: run /code-review on "
      "the diff, because the onus is then on the CODE being correct (right bucket, trigger, scope, blast "
      "radius), not on the answer being true.\n"
      "  ⇒ EITHER WAY: verify.sh + the unit's spec tests are mandatory, and engine edits go on an ISOLATED "
      "worktree, never the shared main tree. Tooling, scripts, readers and test files are not this surface "
      "at all.")
# r4 NEW — the direct answer to the over-validation failure mode, routed on DERIVE_AGENT.
P10 = ("REUSE BEFORE YOU DERIVE: before spending a single expensive pass generating ground truth, SEARCH for it. "
       "This repo already holds labeled/measured data — scripts/tests/** (vitest pins), the regression snapshot, "
       "docs/probe-data/*.json, docs/probe-runs.md, data/*.json. If a labeled set exists for what you are about "
       "to validate, RUN THE EXISTING HARNESS AGAINST IT and report the result; that IS the validation and you "
       "are done. Hand-deriving data the repo already contains is the single most expensive mistake available "
       "here (a 2026-07-24 reader review burned ~5h re-reading 7 videos frame-by-frame for data the harness "
       "already had). Budget: if you cannot find an existing set in ~5 minutes of searching, say so explicitly "
       "and state the cost of deriving one BEFORE starting.")
VERDICT_ESCALATE = ("⛔ VERDICT-VERB DETECTED — point 7 applies HARD: name the n + evidence TIER that earns this "
                    "verdict. n=1 / single recording / MEDIUM-confidence ⇒ DOWNGRADE to a recorded observation; "
                    "do NOT assert the verdict, flip a constant/default, or rewrite a plan's direction here.")
# r5 — the inertness verb carries a DIFFERENT burden than the other verdict verbs: not "how much
# evidence", but "IN WHICH ROSTER". A missing roster does not make the claim weaker, it makes it
# unfalsifiable, so the demand is for the two facts that make it checkable.
INERT_ESCALATE = ("⛔ INERTNESS / A-B CLAIM DETECTED — an 'inert' / 'byte-identical' / 'moved by exactly zero' "
                  "result is a statement about a FIXTURE, never a property of the encoding. Name BOTH: (1) the "
                  "comp/fixture it was measured in, and (2) the ENABLING TEAMMATE it did or did not seat — the "
                  "unit whose buff the tag is eligible FOR. A claim missing (2) is not a weaker claim, it is an "
                  "unfalsifiable one (`alice`'s hasPierce was 'byte-identical' in a pierce-free fixture and worth "
                  "22.6% of her damage on her actual graded comp, which seats `mint`). If the A/B has not run "
                  "yet, write 'board A/B is the discriminator — not yet run', NOT an inertness result. Inert BY "
                  "MECHANISM (no consumer exists roster-wide) is a stronger claim than inert by measurement — if "
                  "that is what you mean, say so and name the consumer sweep.")

# ---- ROUTER: build only the applicable blocks ----
blocks = []

# R1 — slug: fires ONLY when the lint actually flags an ambiguous base-name.
if lint:
    blocks.append(f"{P1}\n  ⚠ SLUG LINT: {lint}")

# R2 — evidence/enactment: a VALUE changed on a value surface, OR a DECISIONS/snapshot edit, OR a
# verdict-verb STAMPED on a load-bearing surface.
if value_changed or IS_DECISIONS or IS_SNAPSHOT or verdict_enact or inert_enact:
    b = f"{P2}\n{P7}"
    if verdict_enact:
        b += f"\n  {VERDICT_ESCALATE}"
    if inert_enact:
        b += f"\n  {INERT_ESCALATE}"
    if SHARED_ARTIFACT:
        b += f"\n  {P8}"
    blocks.append(b)

# R3 — test-agent gates: spawning a genuinely empirical / sci-method agent.
if TEST_AGENT:
    blocks.append(f"{P5}\n{P6}")

# R3b (r4) — reuse-before-derive: any spawn that is about to validate/measure/review something.
# Fires on the broad set but costs 6 lines; TEST_AGENT already implies it, so don't double-emit.
if DERIVE_AGENT and not TEST_AGENT:
    blocks.append(P10)
elif TEST_AGENT:
    blocks.append(P10)

# R4 — attribution: writing a finding/reading (ratios, HOT/COLD, drift, a bare damage claim).
if has_attribution:
    blocks.append(f"{P3}\n{P4}")

# R5 — enactment gate on a value landing.
if value_changed:
    blocks.append(P9)

if not blocks:
    sys.exit(0)  # the win: mundane edits pass SILENTLY

out("[discipline — targeted to this action]\n" + "\n\n".join(f"• {b}" for b in blocks))
sys.exit(0)
