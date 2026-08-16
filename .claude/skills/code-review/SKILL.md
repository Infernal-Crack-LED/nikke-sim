---
name: code-review
description: Cross-family POST-OP code review — the diff gets reviewed by a DIFFERENT model family than the one that wrote it, before commit/merge. Kimi-authored code → claude-opus-5 via dispatch-claude.sh; Claude-authored code → kimi-code/k3 via dispatch-kimi.sh; Qwen-authored → claude-opus-5. Invoke when the owner explicitly requests it (typically for higher-risk changes, after verify.sh is green and, if it ran, the logic-gate post-op) — and ALWAYS, as a standing owner ruling (2026-08-11), on an enactment that SKIPPED /scientific-method because the modeling question was already answered (an owner ruling on game behaviour, a literal kit line, an existing labeled fixture): the gate moves from the answer to the code, so those diffs are reviewed here instead. Otherwise never automatically. NOT for scientific-method landings — those already have implementation-reviewer.
---

# code-review — the author never reviews their own diff

Post-op code review, generalized from the kit-autonomy cross-family protocol
(`scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` — the WHY and the canonical model names). The rule is
one sentence: **the reviewer is always a different model family than the author**, because same-family
review shares the author's priors and re-derives the same reasoning instead of reading the code.

**Scope:** ordinary engineering changes — features, refactors, fixes. A scientific-method landing uses
`implementation-reviewer` instead (it reviews against the judges' accepted claim; this skill reviews
against plain stated intent). Trivial edits (typos, one-liners) may skip.

**Also in scope, and NOT optional (owner ruling 2026-08-11): the enactment of an ALREADY-ANSWERED
modeling question** — an owner ruling on game behaviour, a literal kit line, a fixture that already
asserts the value. Those skip `/scientific-method` deliberately, because that pipeline resolves
UNKNOWNS and there is no unknown left to gate. The risk does not vanish with the unknown, it MOVES:
a true ruling can still be encoded into the wrong bucket, trigger, scope or target, with a blast
radius nobody costed. So review the diff here, and tell the reviewer **what the ruling was** — its
job is "does this code implement that ruling and only that ruling", not "is the ruling true".

## Routing (reviewer = opposite family of the AUTHOR)

The author is whoever wrote the code — normally you, the driver.

| Author / driver       | Reviewer        | Bridge                                                                           |
| --------------------- | --------------- | -------------------------------------------------------------------------------- |
| **Kimi** or **Qwen**  | `claude-opus-5` | `bash scripts/kit-autonomy/dispatch-claude.sh <packet> claude-opus-5 <out.json>` |
| **Claude** (any tier) | `kimi-code/k3`  | `bash scripts/kit-autonomy/dispatch-kimi.sh <packet> kimi-code/k3 <out.json>`    |

Both bridges auto-detect the `# code-review` packet heading and run the reviewer SIGHTED with
read-only repo access (Read/Grep/Glob/Bash — it can inspect callers and run typecheck/tests). No
`KIMI_AGENT_FILE` override is needed for code-review; the detection wins over a stale one.

- Canonical model names come from `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` — `claude-opus-4-8`
  is NOT `claude-opus-5`; `kimi-code/kimi-for-coding` is NOT `kimi-code/k3`. The bridge injects the
  `model` field into the result JSON; an off-protocol `model` voids the review — re-dispatch.
- The role body lives in `.claude/agents/code-review.md` (pinned to Opus). The packet = role body +
  materials; the bridges prepend the subagent non-negotiables themselves.
- **Fallback (label it):** if the cross-family bridge is genuinely unavailable, run
  `Agent(subagent_type:'code-review')` natively and mark the review **"same-family only"** — weaker
  evidence, visible to the owner. Never silently substitute.

## Procedure

1. **Gate order.** Run the cheap local gates first: `bash scripts/verify.sh` green, and (for changes
   that went through `/logic-gate`) the post-op logic gate ACCEPTed. Do not spend a cross-family
   dispatch on code that fails locally.
2. **Build the packet** at `scratchpad/gates/<date>-<topic>/review-packet.md`:
   - the FULL role body of `.claude/agents/code-review.md` (minus its frontmatter), then
   - `## INTENT` — 2–4 sentences: what the change does and why, in plain terms,
   - `## DIFF` — the full `git diff` (uncommitted work, or branch-vs-base for a PR),
   - `## CONTEXT` — only the anchors the reviewer cannot derive from the diff (e.g. "callers live in
     web/src/", "verify.sh covers X but not Y"). The reviewer is sighted with READ-ONLY repo access
     (Read/Grep/Glob/Bash — it can open callers and run typecheck/tests itself), so you need not paste
     surrounding code; still NAME the callers/anchors worth checking when the diff changes a shared
     interface.
3. **Dispatch** per the routing table. A real review takes **2–15 minutes** on opus/k3 and scales with
   packet size; a 60s abort manufactures a fake timeout and pushes you to the weaker same-family
   fallback, so suspect impatience before suspecting the bridge. **How you launch it depends on
   whether the session is headless — check FIRST:**

   ```bash
   echo $CLAUDE_CODE_ENTRYPOINT   # sdk-cli (or any non-interactive entrypoint) …
   tty                            # … plus "not a tty"  ⇒ HEADLESS
   ```

   - **Interactive session:** a foreground `Bash` call with `timeout: 600000` (10 min — the tool's
     MAXIMUM, not a target you can raise). If the review needs longer than that, use the headless
     pattern below rather than letting it auto-background.
   - **HEADLESS session — launch DETACHED, then poll.** Do NOT rely on `run_in_background`, on the
     auto-background that fires when a foreground call exceeds its timeout, or on `Monitor`. In
     headless mode the harness can kill backgrounded shells silently: the output file is left
     **empty**, no result is written, and there is nothing to rescue — a state indistinguishable
     from "still running." (Observed 2026-08-03: a 125 KB packet exceeded 600s, auto-backgrounded,
     and both it and the Monitor watching it were reaped with zero output.) Instead put the dispatch
     outside the agent's process group so teardown cannot reach it, and poll with short foreground
     calls:

     ```python
     # python3 - <<'PY'   — NOT `nohup setsid …`: setsid is a Linux binary that does not
     # exist on macOS, so that form dies instantly with "setsid: No such file or directory".
     # start_new_session=True calls the setsid(2) SYSCALL, which macOS does have.
     import subprocess, pathlib
     d = pathlib.Path('<abs-gate-dir>')
     log = open(d/'dispatch.log', 'wb')
     p = subprocess.Popen(
         ['bash', '<abs-repo>/scripts/kit-autonomy/dispatch-kimi.sh',
          str(d/'review-packet.md'), 'kimi-code/k3', str(d/'result.json')],
         stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
         start_new_session=True, cwd='<abs-repo>')
     (d/'dispatch.pid').write_text(str(p.pid))
     PY
     ```

     Then poll with short foreground calls — each returns in milliseconds:

     ```bash
     kill -0 $(cat <gate-dir>/dispatch.pid) 2>/dev/null && echo ALIVE || echo EXITED
     ls -la <gate-dir>/result.json 2>/dev/null; tail -5 <gate-dir>/dispatch.log
     ```

     Use ABSOLUTE paths (the detached process does not inherit your cwd) and keep `dispatch.log` —
     it is the rescue input if the bridge answers but dies before writing the JSON.

     ⚠ **Check liveness by PID, never `pgrep -f dispatch-kimi.sh`** — `pgrep -f` matches its own
     command line and the shell wrapping it, so it reports the dispatch as alive when nothing is
     running. That false positive will happily mask a dispatch that died on launch.

     ⚠ **Aborting a stale dispatch (the diff changed under it): inspect BEFORE you clean.** Check
     for a non-empty `result.json` before the kill AND again after it, and never bundle `rm` of
     the result path into the kill command — the review may complete in the race window between
     your decision to abort and the kill landing, and a written result is the product (observed
     2026-08-16: a `kill && rm -f result.json` one-liner deleted a completed 5.6 KB verdict
     unread; `dispatch.log` held only the success banner, so nothing was rescuable). A completed
     verdict on a stale diff still has value — its findings on unchanged code carry into the
     re-review.

   - **Keep the packet lean so the dispatch fits comfortably.** The lever on runtime is packet SIZE,
     not the timeout. EXCLUDE regenerated artifacts from the pasted diff
     (`git diff <base>...HEAD -- . ':(exclude)data/<artifact>.json'`) and instead NAME them in
     `## CONTEXT` with the command that verifies them — the reviewer has read-only repo access and
     can open and re-derive them, and 250 lines of mechanical JSON buys nothing but latency.
   - **If the bridge leaves only a raw session log** (the model narrated its tool calls around the
     verdict, or the bridge died after it answered), rescue the verdict instead of re-spending the
     dispatch: `python3 scripts/extract-review-json.py <log-path> <out.json>`. Add `--model <name>`
     only when the bridge never stamped one, and use the canonical name — an off-protocol `model`
     voids the review.

4. **Read the result JSON:**
   - `CLEAN` → land it. A cross-family CLEAN is real evidence.
   - `FIX-BEFORE-MERGE` → resolve every `FIX` finding, then re-review the new diff (full loop —
     fixes introduce their own defects).
   - `BLOCKED` → stop. Resolve the BLOCKERs or take the review to the owner. Do not commit over a
     BLOCKER because you disagree with it — disagreement goes to the owner with both rationales.
5. **Disputes:** if you believe a finding is wrong, verify it concretely (run the code, read the
   caller) — and if it still looks wrong, that's an owner decision, not a silent override. Record the
   dispute next to the result JSON.

## Notes

- `FOLLOW-UP` findings: file them (backlog doc / issue) rather than blocking; say where you filed.
- Keep packets + result JSONs under `scratchpad/gates/` until the change lands — they are the audit
  trail, and re-reviews rebuild from them.
- If the driver is Qwen, the kit-autonomy router's constraint applies unchanged (no native model
  pinning → CLI bridges for everything cross-family).
