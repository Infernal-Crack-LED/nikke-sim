---
name: kit-autonomy
description: Qwen router for the kit-autonomy gauntlet — Qwen drives S0-S4/S8-S9 and dispatches the blind roles cross-family via the CLI bridges. Trigger: "run the kit-autonomy gauntlet on <slug>". The stage procedure of record is scripts/kit-autonomy/SKILL.md (READ IT — this file is only the Qwen-harness routing + batch orchestration layer on top); canonical model names are scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md.
---

# kit-autonomy — Qwen router (procedure: `scripts/kit-autonomy/SKILL.md`)

**This is a ROUTER, not the procedure.** The stage protocol (S0–S9), non-negotiables, redaction,
landing, and reconciliation rules live ONLY in `scripts/kit-autonomy/SKILL.md` — follow it. This
file adds what is genuinely Qwen-harness-specific: (1) how cross-family dispatch works given
Qwen's constraints, (2) batch orchestration via the `kit-gauntlet-driver` agent. Model names are
NOT restated here on purpose — `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` is the single
source; an ad-hoc batch prompt that contradicts it loses (flag the conflict).

## Qwen's constraint

The Qwen `agent` tool has **no `model` parameter** — every subagent is the same Qwen model. So Qwen cannot
natively pin a blind role to a different model (unlike Claude, which pins Opus/Fable). The same-model
shared-prior limit (`docs/kit-autonomy-decisions.md` §14.1) applies in full when Qwen drives: a clean same-model
GO is evidence against IDIOSYNCRATIC error, NOT proof of faithfulness. A GO without cross-family review is
reported as **"GO (same-model only)"**, with the systematic-prior-prone lines (scope / duration /
trigger-identity) flagged for the owner; cross-family convergence upgrades it to **"GO (cross-family
corroborated)"**.

## Cross-family dispatch (Qwen cannot call another family directly → CLI bridge)

Prepare de-contaminated, leak-asserted packets + a `REQUEST.md`:

```sh
npx tsx scripts/kit-autonomy/prepare-cross-family-packet.ts <slug> \
  --tokens "<signature magnitudes + mechanic names, comma-separated>" --roles s2b,s7
```

Then run each packet through its CANONICAL family per the protocol:

```sh
bash scripts/kit-autonomy/dispatch-claude.sh cross-family/<slug>/<role>-packet.md <model> \
  cross-family/<slug>/<role>-result.json            # S2b / S5 / S6 (Claude family)
bash scripts/kit-autonomy/dispatch-kimi.sh   cross-family/<slug>/s7-packet.md <model> \
  cross-family/<slug>/s7-result.json                # S7 judge (Kimi family)
```

Tier-2 (×2 models): ALSO dispatch the same packet to the other family, writing to
`cross-family/<slug>/<role>-result-<family>.json`, and reconcile both results. Long packets take
**2–5 min** through either bridge — both dispatch scripts are carved out of any 60s
stop-don't-wait rule (see DISPATCH PATIENCE in the driver def). The `cross-family/<slug>/` result
JSONs are force-committed as evidence; the packets are regenerable scratch (never committed).

## Batch mode via sub-agent (Qwen orchestration)

Running the gauntlet for a BATCH of units: spawn the named **`kit-gauntlet-driver`** agent
(`.qwen/agents/kit-gauntlet-driver.md` — `maxTurns: 300`, lean recipe + resume logic baked in) per unit,
pinned to the shared worktree (`working_dir`), via `subagent_type: "kit-gauntlet-driver"`.

**Unit selection (restart-safe):** walk `data/kit-status.json` `units` in file order and take the FIRST unit FROM THE
BOTTOM whose `kitParse.provenance != "gauntlet"` (excluding any units already flagged this run via a skip-set). Re-derive
this on EVERY iteration: each commit flips its unit's provenance to `gauntlet`, so the bottom-most non-gauntlet pointer
auto-advances and a stalled/interrupted batch resumes with no bookkeeping. The authoritative completed count is
`git rev-list --count origin/main..HEAD` (one commit per unit).

**Continuation on stall:** after each spawn, check the outcome — commit exists → done; NO commit but
`.gauntlet-progress-<slug>.txt` shows partial progress → re-spawn `kit-gauntlet-driver` for the same slug (its
RESUME logic picks up from the last completed stage). A unit that stalls repeatedly with no further progress is
captured + FLAGGED + skipped, not counted toward the total.

**Setting:** run batches with `model.skipLoopDetection: true` (the default). Loop detection silently halts
these repetitive sub-agents mid-task with no error marker.

Hard-won rules (verified on the 2026-07-24/25 batches):

- **The sub-agent returns "(subagent produced no model-visible output)"** — it ends its turn on the commit tool
  call. This is BENIGN. Read the outcome from `scripts/kit-autonomy/results/<slug>.json` (`verdict` /
  `faithfulnessScore` — both MUST be top-level keys), the instrumentation file, and `git log origin/main..HEAD`
  — NOT the text return.
- **"Subagent execution failed" is a TRANSIENT launch failure, not a NO-GO** — check state (commit? progress
  file? scratch?); if there is NO commit, re-spawn the same slug. Escalate to FLAG+skip only on repeated
  no-progress failures.
- **Do NOT have the driver read the full skill/protocol files, and do NOT restate the gauntlet mechanics in the
  spawn prompt** — the mechanics are BAKED INTO the `kit-gauntlet-driver` agent definition. Reading the full
  protocol into the sub-agent context before any work causes early exhaustion and silent stalls.
- **Lean spawn-prompt template (verified 20/20, 2026-07-25):** prepend a CONDENSED non-negotiables header (exact slug ·
  measured>fudge · whole-picture · prove-it-differently · tread-lightly · no `ignored` blocks · structured return), then
  ONE task line: "Run the full kit-autonomy gauntlet on <slug> (<Full Name> — <weapon/class/element/burst>; variant of
  base <base> `<base>`). Follow your agent definition; one commit; return the tight RESULT line." Do NOT override the
  canonical model routing. Pull the identity (name/weapon/class/element/burst/nicknames) via the subprocess
  extract before spawning — NEVER `read_file` the whole `data/characters.json` (extract via subprocess to
  `.<slug>-extract.json`, then read that).
- **Pipe stdin into `scripts/lint-slug-disambiguation.ts`** — it does `readFileSync(0)` and hangs on a bare
  non-interactive run.
- **Content gate:** YOLO/approval does NOT bypass the safety classifier for genuinely suggestive prose. Handle prose
  structurally (subprocess extraction, clinical reasoning, route prose-heavy blind roles to Claude via dispatch-claude.sh
  so the prose stays in Claude's context). If a tool call is blocked "for safety", do NOT route around it — flag it.
- **SKIP-AND-FLAG complex Tier-2 units:** detection = no commit and `.gauntlet-progress-<slug>.txt` stops before
  `S2a`. Capture the S1 inventory + tier from the progress file, FLAG the unit for manual handling, clean its
  scratch, continue. A flagged unit is NOT counted toward the batch total.
- **DISPATCH PATIENCE:** a ~44KB blind packet takes **2–5 min** on opus/fable/kimi — a 60s abort makes the reviewer
  look "timed out" and forces a needless same-model fallback (a weaker "GO (same-model only)" verdict). All
  dispatches run with a **600000 ms (10 min)** shell timeout; only a real error / no-valid-JSON after a long wait
  is a failure. Suspect impatience before suspecting the bridge.
- **RECOVERY — upgrade a same-model unit to cross-family:** re-dispatch the EXISTING
  `cross-family/<slug>/s5-packet.md` + `s6-packet.md` (long timeout), build + dispatch the S7 judge packet,
  update `results/<slug>.json` (verdict → "GO (cross-family corroborated)"), then `git commit --amend` (the
  branch is local/unpublished — amend keeps one-commit-per-unit). Delegate to a general-purpose sub-agent (NOT
  kit-gauntlet-driver — its RESUME logic sees the completed progress file).
- **Variant slugs — name the base counterpart in the spawn prompt** ("this is the X variant
  (weapon/class/element/burst), NOT base Y") so the driver cannot conflate them.
- **WORKTREE PATH MAP (what is ABSENT in a clean worktree checkout):** the batch worktree is a clean
  `origin/main` checkout, so GITIGNORED paths are NOT present there:
  - `.claude/subagent-non-negotiables.md` — gitignored. `dispatch-claude.sh` tries the worktree copy FIRST, then
    falls back to a HARDCODED absolute main-tree path. Do not look for `.claude/` in the worktree.
  - `.qwen/skills/kit-autonomy/SKILL.md` — tracked, so present in the worktree, but the driver does
    not need it (the recipe is in the agent definition, loaded from the MAIN tree at spawn time).
  - `scripts/kit-autonomy/cross-family/**` — gitignored. Created at runtime by `prepare-cross-family-packet.ts`.
    In a SHARED batch worktree prior units' dirs accumulate — the result JSONs are force-committed per unit, the
    packets stay untracked scratch.
    Present-and-required (tracked → in the worktree): `scripts/blind-rebuild/char-extracts/<slug>.json`,
    `src/skills/types.ts`, the role templates, and `redacted-methodology.md`.

## References

- **Procedure (read this):** `scripts/kit-autonomy/SKILL.md`
- **Model routing (single source):** `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md`
- Driver agent: `.qwen/agents/kit-gauntlet-driver.md`
- Packet prep: `scripts/kit-autonomy/prepare-cross-family-packet.ts`; bridges: `dispatch-claude.sh` / `dispatch-kimi.sh`
- The same-model limit: `docs/kit-autonomy-decisions.md` §14.1
