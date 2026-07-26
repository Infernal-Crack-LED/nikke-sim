---
name: kit-autonomy
description: Qwen driver for the kit-autonomy gauntlet — Qwen drives S0-S4/S8-S9, dispatches blind roles cross-family via CLI bridges (S2b → claude-fable-5, S5/S6 → claude-opus-5 via dispatch-claude.sh; S7 judge → kimi-code/k3 via dispatch-kimi.sh since 2026-07-26). Trigger: "run the kit-autonomy gauntlet on <slug>". Read the base skill scripts/kit-autonomy/SKILL.md for the stage protocol; this skill adds the model routing + CLI dispatch on top.
---

# kit-autonomy — Qwen driver + Claude dispatch

The Qwen-side adaptation of the kit-autonomy gauntlet. Read the BASE skill
(`scripts/kit-autonomy/SKILL.md`) for the stage protocol (S1–S7), the non-negotiables, and the redaction
procedure. This skill adds: (1) the **model router** (which blind roles run same-family vs cross-family, and how
cross-family is dispatched given Qwen's constraints); (2) the **same-model mitigations**; (3) the **honest
verdict downgrade** (a GO without cross-family review is "GO (same-model only)").

## Qwen's constraint

The Qwen `agent` tool has **no `model` parameter** — every subagent is the same Qwen model. So Qwen cannot
natively pin a blind role to a different model (unlike Claude, which pins Opus/Fable). The same-model
shared-prior limit (`docs/kit-autonomy-decisions.md` §14.1) applies in full when Qwen drives: a clean same-model
GO is evidence against IDIOSYNCRATIC error, NOT proof of faithfulness — two same-model agents both make the
systematic misreads the prior favors (scope / duration / trigger-identity) and converge on the wrong reading.

## Model router (Qwen side)

Per `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md`:

> **CANONICAL MODEL NAMES (authoritative):** S2b (pre-op) → `claude-fable-5`; S5/S6 (post-op) →
> `claude-opus-5` (REQUIRED); **S7 (judge) → `kimi-code/k3` via `dispatch-kimi.sh` (REQUIRED since
> 2026-07-26 — the binding judge sits on the third family)**. These match QWEN.md. **`claude-opus-4-8` is a
> DIFFERENT model, NOT an alias or substitute** — do not dispatch the post-op roles to it. (The 2026-07-24
> bottom-up batch ran on opus-4-8 via an ad-hoc prompt error; the owner accepted that batch as-is, but opus-5
> is required going forward.) `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` is the single source of truth
> for routing. Ad-hoc batch prompts may carry a wrong/different name — do NOT let an ad-hoc prompt override
> the routing here; a sub-agent that sees a conflicting name in its task should follow THIS skill + the
> protocol and flag the discrepancy. Change the canonical names only by editing the protocol AND QWEN.md
> together.

1. **Decide the tier** from the S1 line inventory:
   - **Tier 1 (default):** S2b + S7 are CROSS-FAMILY; S5 + S6 are same-family (native Qwen subagents).
   - **Tier 2 (elevated** — the unit has a scoped-buff / round-count / `burstCast`-vs-`fullBurstEnter` /
     status-gate mechanic, or is meta-defining/high-stakes**):** S2b/S5/S6/S7 all cross-family, S2b + S7 on ×2 models.
2. **Same-family roles** → dispatch as native Qwen subagents (the base skill's prompts) with the de-contaminated
   packet (base skill §0 redaction).
3. **Cross-family roles** → Qwen cannot call another family directly, so dispatch the packet through a CLI
   bridge. Prepare the handoff:
   ```sh
   npx tsx scripts/kit-autonomy/prepare-cross-family-packet.ts <slug> \
     --tokens "<signature magnitudes + mechanic names, comma-separated>" --roles s2b,s7
   ```
   This builds de-contaminated, leak-asserted packets in `scripts/kit-autonomy/cross-family/<slug>/` + a
   `REQUEST.md`. Then run each packet through its CANONICAL family:
   ```sh
   bash scripts/kit-autonomy/dispatch-claude.sh cross-family/<slug>/<role>-packet.md claude-opus-5 \
     cross-family/<slug>/<role>-result.json        # S2b (claude-fable-5) / S5 / S6 (claude-opus-5)
   bash scripts/kit-autonomy/dispatch-kimi.sh   cross-family/<slug>/s7-packet.md kimi-code/k3 \
     cross-family/<slug>/s7-result.json            # S7 judge — canonical on Kimi since 2026-07-26
   ```
   Tier-2 (×2 models): ALSO dispatch the same packet to the other family, writing to
   `cross-family/<slug>/<role>-result-<family>.json`, and reconcile both results.
   (The `--tokens` are the target's answer tokens — its signature magnitudes + mechanic names —
   that must not appear outside the kit-prose block; the driver supplies them. Long packets take minutes
   through either bridge — carve both dispatch scripts out of the 60s STOP-DON'T-WAIT rule.)
4. **Reconcile** when the cross-family results return: combine with the same-family results per the protocol's
   reconciliation rules. A cross-family divergence the same-family run missed is a candidate REAL-GOTCHA (the
   payload cross-family review exists to catch); the judge classifies it.

## Same-model mitigations (what Qwen does natively)

When cross-family review is unavailable (or for the same-family roles), reduce shared-prior risk with:

- **Adversarial blind reviewers** — S2b instructed to generate the NEAREST-WONG reading + the assertion that
  distinguishes it, not just re-derive (surfaces the shared prior).
- **De-contaminated packets** — redacted schema + methodology + the leak assertion (automated by the packet-prep
  script; `types.ts` comments name specific units — the D12 leak — so the schema MUST be redacted).
- **The independent execution gate** — S2d runs the tests vs the shipped override + each counterfactual; no
  self-reported RED.
- **Multiple independent runs** of a blind role with different framings, checking for convergence (decorrelates
  idiosyncratic error further; does NOT fix shared priors — be honest about that).
- **The judge's formula check** — S7 checks each line against the damage-formula SSOT (a different knowledge base
  than prose-reading).

## Honest verdict (Qwen driver)

The verdict MUST report provenance + the residual:

- **"GO (same-model only)"** — no cross-family review; evidence against idiosyncratic error only; the
  systematic-prior-prone lines (scope / duration / trigger) need the owner or a cross-family review.
- **"GO (cross-family corroborated)"** — S2b + S7 (at least) ran on the other family and converged on the
  load-bearing lines; substantially stronger, but still not proof (shared blind spots + measurement-gated
  magnitudes remain — no model count eliminates those; they need the owner/measurement).
- Flag the lines that rest only on same-model agreement, and the shared-blind-spot caveat.

## Batch mode via sub-agent (Qwen orchestration)

Running the gauntlet for a BATCH of units (e.g. "gauntlet the next 10 from kit-status.json"): spawn the named
**`kit-gauntlet-driver`** agent (`.qwen/agents/kit-gauntlet-driver.md` — `maxTurns: 300`, lean recipe + resume
logic baked in) per unit, pinned to the shared worktree (`working_dir`), via `subagent_type: "kit-gauntlet-driver"`.

**Unit selection (restart-safe):** walk `data/kit-status.json` `units` in file order and take the FIRST unit FROM THE
BOTTOM whose `kitParse.provenance != "gauntlet"` (excluding any units already flagged this run via a skip-set). Re-derive
this on EVERY iteration: each commit flips its unit's provenance to `gauntlet`, so the bottom-most non-gauntlet pointer
auto-advances and a stalled/interrupted batch resumes with no bookkeeping. The authoritative completed count is
`git rev-list --count origin/main..HEAD` (one commit per unit). Verified 2026-07-25: the 20-unit bu-batch ran this way.

**Continuation on stall:** after each spawn, check the outcome — commit exists → done; NO commit but
`.gauntlet-progress-<slug>.txt` shows partial progress → re-spawn `kit-gauntlet-driver` for the same slug (its
RESUME logic picks up from the last completed stage). Repeat until commit. A unit that stalls repeatedly with no
further progress (e.g. complex Tier-2 `ade-agent-bunny`) is captured + FLAGGED + skipped, not counted toward the total.

**Setting:** run batches with `model.skipLoopDetection: true` (the default). Loop detection (`false`) silently halts
these repetitive sub-agents mid-task with no error marker — it was the suspected cause of the ade-agent-bunny stalls.

Hard-won rules (verified 2026-07-24 on `ada` / `alice`):

- **The sub-agent returns "(subagent produced no model-visible output)"** — it ends its turn on the commit tool
  call. This is BENIGN. Read the outcome from `scripts/kit-autonomy/results/<slug>.json` (`verdict` /
  `faithfulnessScore`), the instrumentation file, and `git log origin/main..HEAD` — NOT the text return.
- **"Subagent execution failed" is a TRANSIENT launch failure, not a NO-GO** — a THIRD outcome, distinct from the benign
  no-output above and from a stall: the agent tool returns a bare "Subagent execution failed." Check state (commit?
  progress file? scratch?); if there is NO commit, re-spawn the same slug. Verified 2026-07-25 bu-batch (2/20): `nayuta`
  crashed after writing STARTED + the S1 extract (the retry resumed from the cached extract) and `naga` crashed at launch
  before any action (clean tree) — both recovered on the FIRST retry. Escalate to FLAG+skip only on repeated no-progress
  failures.
- **Mandatory instrumentation:** the sub-agent must `echo '<STAGE>: <status>' >> .gauntlet-progress-<slug>.txt`
  after each stage (S0…COMMIT) plus a final `RESULT: <slug> | <verdict> | faithfulness <x> | commit <sha>` line.
  Without this you cannot tell a successful run from a silent stall. Write `echo 'STARTED' > .gauntlet-progress-<slug>.txt`
  as the VERY FIRST action, before any read.
- **Do NOT have the driver read the full skill/protocol files, and do NOT restate the gauntlet mechanics in the spawn
  prompt** — the mechanics (lean recipe, instrumentation, subprocess extract, dispatch patience, S7 assembly, commit
  hygiene, model routing, same-model recovery, skip-and-flag) are BAKED INTO the `kit-gauntlet-driver` agent definition.
  Reading the full protocol (~20KB: non-negotiables + this driver skill + base protocol) into the sub-agent context before
  any work causes early exhaustion and silent stalls (it stalls right after the S1 extract, before S2a). The driver reads
  ONLY the unit data: the subprocess extract + `src/skills/overrides/<slug>.json` + the kit-status row via
  `grep -A 40 '"<slug>"'`. Nested blind sub-agents read their own role templates. Verified 2026-07-24 (`alice`, Tier 2,
  completed ONLY under the lean approach) and 2026-07-25 (20/20 bu-batch completed with the minimal spawn prompt below).
- **Lean spawn-prompt template (verified 20/20, 2026-07-25):** prepend a CONDENSED non-negotiables header (exact slug ·
  measured>fudge · whole-picture · prove-it-differently · tread-lightly · no `ignored` blocks · structured return), then
  ONE task line: "Run the full kit-autonomy gauntlet on <slug> (<Full Name> — <weapon/class/element/burst>; variant of
  base <base> `<base>`). Follow your agent definition; one commit; return the tight RESULT line." Do NOT override the
  skill's canonical model routing. Pull the identity (name/weapon/class/element/burst/nicknames) via the subprocess
  extract before spawning.
- **Extract the unit's entry via subprocess** — `npx tsx -e "...writeFileSync('.<slug>-extract.json',
JSON.stringify(c['<slug>']))"` then read that file. NEVER `read_file` the whole `data/characters.json`: pulling
  every unit's prose into the sub-agent context kills the run (content classifier + context bloat).
- **Pipe stdin into `scripts/lint-slug-disambiguation.ts`** (`printf '%s' "…" | npx tsx scripts/lint-slug-disambiguation.ts`).
  It does `readFileSync(0)` and hangs forever on a bare non-interactive run (the script now also bails on a bare TTY run).
- **Pass role-template PATHS to nested blind sub-agents**; don't load all four templates into the driver's context.
  Keep the driver turn-efficient; read the kit-status row via `grep -A 40 '"<slug>"'`, not the whole file.
- **Content gate:** YOLO/approval does NOT bypass the safety classifier for genuinely suggestive prose. Handle prose
  structurally (subprocess extraction, clinical reasoning, route prose-heavy blind roles to Claude via dispatch-claude.sh
  so the prose stays in Claude's context). If a tool call is blocked "for safety", do NOT route around it — flag it for
  owner approval.
- **SKIP-AND-FLAG complex Tier-2 units:** a complex unit (scoped-buff / round-count / stack-gate / status-gate mechanics
  → Tier 2) can exhaust a single sub-agent's budget — it builds the S1 inventory + picks Tier 2, then stalls BEFORE writing
  the test (S2a), and continuations stall at the same point. Detection: no commit after the run and
  `.gauntlet-progress-<slug>.txt` stops before `S2a`. When this happens, capture the S1 inventory + tier from the progress
  file, FLAG the unit for manual / main-session handling, clean its scratch, and continue to the next unit. A flagged unit
  is NOT counted toward the batch total — keep going until 10 COMMIT.
- **DISPATCH PATIENCE (opus S5/S6 + fable S2b + kimi S7):** the driver's `STOP-DON'T-WAIT` (60s) rule is TOO AGGRESSIVE for
  `dispatch-claude.sh` / `dispatch-kimi.sh` — a ~44KB blind packet to claude-opus-5 or kimi-code/k3 takes **2–5 min**, so a
  60s abort makes the reviewer look "timed out" and forces a needless same-model fallback (weaker "GO (same-model only)"
  verdict). Verified 2026-07-24: the opus
  bridge was HEALTHY (a tiny test packet returned in seconds) — `anchor-innocent-maid` fell back to same-model ONLY because
  of a premature 60s abort. The driver definition now carves the dispatch scripts out of STOP-DON'T-WAIT (run dispatches
  — opus, fable, AND kimi — with a 600000 ms = 10 min shell timeout, the shell-tool max; only a real error / no-valid-JSON
  after a long wait is a failure). If you still
  see a same-model fallback, suspect impatience before suspecting the bridge. (No per-spawn injection needed anymore.)
- **RECOVERY — upgrade a same-model unit to cross-family:** if a unit lands "GO (same-model only)" because an opus dispatch
  was aborted, upgrade it in place: re-dispatch the EXISTING `cross-family/<slug>/s5-packet.md` + `s6-packet.md` to
  claude-opus-5 (long timeout), build + dispatch the S7 judge packet (base: `scripts/kit-autonomy/RECONCILING-JUDGE.md`),
  update `results/<slug>.json` (verdict → "GO (cross-family corroborated)", faithfulness, crossFamily fields) +
  `manual-review/<slug>.md`, then `git commit --amend` (the branch is local/unpublished — amend keeps one-commit-per-unit so
  the `git rev-list origin/main..HEAD` batch count stays correct). Delegate this targeted re-run to a general-purpose
  sub-agent (NOT kit-gauntlet-driver — its RESUME logic sees the completed progress file). Verified on `anchor-innocent-maid`
  (6a56e1b → e265baa, 0.92 → 1.0).
- **Variant slugs — name the base counterpart in the spawn prompt:** for a variant (e.g. `anis-star`, `anis-sparkling-summer`,
  `arcana-fortune-mate`, `asuka-wille`), the spawn prompt should explicitly state "this is the X variant
  (weapon/class/element/burst), NOT base Y" so the driver cannot conflate them (reinforces non-negotiable #1). Pull the
  identity (name/weapon/class/element/burst/nicknames) via the subprocess extract before spawning.
- **WORKTREE PATH MAP (private/public — what is ABSENT in a clean worktree checkout):** the batch worktree is a clean
  `origin/main` checkout, so GITIGNORED paths are NOT present there. Sub-agents keep going looking for them — tell them
  up front. Required-but-ABSENT in the worktree:
  - `.claude/subagent-non-negotiables.md` — gitignored (`.claude/`). `dispatch-claude.sh` needs it; it tries
    `$ROOT/.claude/subagent-non-negotiables.md` (worktree) FIRST, then falls back to a HARDCODED absolute main-tree path
    (`/Users/maxwellsutton/nikke-sim/.claude/subagent-non-negotiables.md`). If the main tree moves, dispatch breaks. Do
    not look for `.claude/` in the worktree — the fallback is what makes dispatch work there.
  - `.qwen/skills/kit-autonomy/SKILL.md` — gitignored (`.qwen/skills/`). Absent in the worktree; the driver does not need
    it (the protocol is embedded in the agent definition, which Qwen loads from the MAIN tree at spawn time, not the
    worktree — so edits to `.qwen/agents/kit-gauntlet-driver.md` in the main tree take effect even though the worktree
    holds a stale committed copy).
  - `scripts/kit-autonomy/cross-family/**` — gitignored. ABSENT in a fresh worktree; created at runtime by
    `prepare-cross-family-packet.ts`. In a SHARED batch worktree, prior units' `cross-family/<slug>/` dirs accumulate —
    they are ALL regenerable scratch, NEVER committed; each driver commits only its OWN unit's tracked artifacts.
    Present-and-required (tracked → in the worktree): `scripts/blind-rebuild/char-extracts/<slug>.json` (192 tracked
    extracts — the packet-prep's kit-prose source), `src/skills/types.ts` (schema to redact), the role templates
    (`TEST-FAITHFULNESS-REVIEW.md`, `BLIND-TEST-WRITER.md`, `BLIND-OVERRIDE-WRITER.md`, `RECONCILING-JUDGE.md`), and
    `redacted-methodology.md`.

## References

- Base skill: `scripts/kit-autonomy/SKILL.md`
- Protocol (single source of truth for interop): `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md`
- Claude CLI dispatch bridge: `scripts/kit-autonomy/dispatch-claude.sh`
- Packet prep (Qwen-side router automation): `scripts/kit-autonomy/prepare-cross-family-packet.ts`
- Redacted methodology (blind-packet insert): `scripts/kit-autonomy/redacted-methodology.md`
- The same-model limit: `docs/kit-autonomy-decisions.md` §14.1
- Claude-side implementation (work order): `docs/handoffs/2026-07-23-kit-autonomy-model-router-claude.md`

## Change log

- 2026-07-26 (Kimi bridge + S7 re-route) — added `scripts/kit-autonomy/dispatch-kimi.sh` (same packet/result
  contract as dispatch-claude.sh; tools structurally disabled via an agent profile with `tools: []`, verified
  it cannot read files) and moved the S7 reconciling judge off `claude-opus-5` onto **`kimi-code/k3`** as the
  canonical dispatch — the binding go/no-go is now graded by a third model family that shares no priors with
  the driver or the S5/S6 writers. S2b stays `claude-fable-5`, S5/S6 stay `claude-opus-5`. Canonical names
  updated in `CROSS-FAMILY-PROTOCOL.md` + QWEN.md together (protocol rule); driver def + DISPATCH PATIENCE
  updated to cover the kimi bridge (2–5 min for 44KB packets, same as opus).
- 2026-07-25 (bu-batch hardening) — completed the 20-unit bottom-up batch `kit-autonomy-bu-batch-2026-07-25` (all GO
  cross-family corroborated: 18× 1.0 + prika 0.92 + neon-vision-eye 0.93). Rolled in: (1) `prepare-cross-family-packet.ts`
  now redacts + leak-checks the unit's display name + safe nicknames (3–8 char alnum), not just the slug — closes the
  rapi-red-hood "RRH" and neon-vision-eye "Neon:VE" leaks; display-name-stem abbreviations are surfaced via an advisory
  TOKEN HINT (a bare stem like "red" would over-redact). The assembled-packet check stays tokens-only (the harnessNote's
  "removeOnReload" contains "veon") and strips the slug from non-prose so slug-substring tokens don't false-fail on the
  header. (2) Dispatch timeout pinned to 600000 ms (10 min, shell-tool max) for opus AND fable (was a 480000–600000
  range). (3) Batch-mode section: restart-safe bottom-up unit selection, the "Subagent execution failed" =
  transient-retry outcome, and the verified lean spawn-prompt template (non-negotiables header + one task line; mechanics
  baked into the agent def). (4) results JSON contract: `verdict` + `faithfulnessScore` must be top-level keys.
- 2026-07-24 (model-name correction) — the CANONICAL MODEL NAMES note no longer calls `claude-opus-4-8` a
  "stale alias": it is a DIFFERENT model, not a substitute for the required `claude-opus-5`. The 2026-07-24
  bottom-up batch ran on opus-4-8 via an ad-hoc prompt error and was owner-accepted as-is; opus-5 is required
  going forward. Routing SSOT is `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` (carries the canonical names).
- 2026-07-24 (blind-packet structural cheat-sheet) — enriched the harnessNote in `prepare-cross-family-packet.ts`
  with the non-unit-specific shapes the blind roles kept guessing wrong (verified against sim.ts / harness.ts /
  types.ts / a real override): `totals(res)`/`CompOptions.overrides` are per-slug MAPS; the OverrideFile is slot-keyed
  (`skill1/skill2/burst`, no top-level `blocks`); `gainPierce` effect vs `hasPierce` flag; caster-scaled buff events
  emit FLAT-resolved values (casterAtkPct→flat ATK, highestAllyAtkPct re-emits as casterAtkPct, caster/targetMaxHpPct
  as maxHpFlat); no `buffRemove` on time-lapse. All generic + leak-safe (verified: ada packets build leak-clean).
  Also added the CANONICAL MODEL NAMES authority note (opus-5/fable-5; ad-hoc prompts must not override).
- 2026-07-24 (post-batch hardening) — added the WORKTREE PATH MAP (which gitignored paths are absent in a clean
  worktree checkout + the dispatch bridge's hardcoded `.claude/` fallback) after sub-agents kept hunting for them;
  driver def now carries an explicit S7 judge-packet assembly recipe (stop mirroring prior runs' judge-packets) and
  COMMIT HYGIENE for the shared worktree (commit only this unit's tracked artifacts; never `git add -A`).
- 2026-07-24 (batch resume) — dispatch patience: carved `dispatch-claude.sh` out of the driver's 60s STOP-DON'T-WAIT
  (opus S5/S6/S7 take 2–5 min; the premature abort caused needless same-model fallbacks — the driver definition now carries
  the patience rule in ENVIRONMENT + the S5/S6/S7 + S2b stage notes, so no per-spawn injection is needed). Added the
  same-model→cross-family RECOVERY procedure (opus retry + `git commit --amend`) and variant-slug spawn guidance. Completed
  the 10-unit batch `kit-autonomy-batch-2026-07-24`: all GO cross-family corroborated (9× 1.0 + asuka-wille 0.95).
- 2026-07-24 — added "Batch mode via sub-agent" section: foreground working_dir launch, mandatory instrumentation,
  subprocess kit-extract (never read whole characters.json), piped lint, content-gate structural handling, and
  skip-and-flag for complex Tier-2 units that exhaust a single sub-agent. Verified on `ada` (GO cross-family, 1.0).
- 2026-07-23 — created. Qwen adapter + model router for the kit-autonomy gauntlet: cross-family handoff via
  prepare-cross-family-packet.ts, same-model mitigations, honest verdict downgrade.
