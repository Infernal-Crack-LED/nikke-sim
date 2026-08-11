# AGENTS.md — nikke-sim (Kimi harness shim)

> **Read [CLAUDE.md](CLAUDE.md) first — it is the canonical instruction file and full handoff**
> (project overview, hard constraints, verified facts, protected paths, discipline
> forcing-functions, doc taxonomy, conventions, git workflow + safety). Then
> [docs/STATE.md](docs/STATE.md) for what is landed right now, and
> [docs/handoffs/QUEUE.md](docs/handoffs/QUEUE.md) for live action items.
> This file carries ONLY Kimi-harness-specific content; if it ever disagrees with CLAUDE.md,
> CLAUDE.md wins (and this file is the bug — fix it).

## Kimi-harness specifics

- **Pre-commit hooks:** Husky + lint-staged run `eslint --fix`, `prettier --write`, and `npm run typecheck` on every commit. If the hook surfaces errors or warnings in files you are committing — even pre-existing ones — fix them as part of your change. Full details in [CLAUDE.md](CLAUDE.md) § "Pre-commit hooks".
- **Hooks:** Kimi's hooks live in `~/.kimi-code/config.toml` and route to the same hook scripts
  Claude uses under `.claude/hooks/` (commit-state-hygiene, stop-doc-drift, pre-write-discipline,
  pre-pr-patch-notes) — one copy, both harnesses.
- **Skills:** `.agents/skills` is a SYMLINK to `.claude/skills/` — one canonical copy, both
  harnesses (kit-autonomy is a router shim — the procedure of record is
  `scripts/kit-autonomy/SKILL.md`).
- **Subagents:** before spawning any empirical subagent, paste
  `.claude/subagent-non-negotiables.md` at the top of the prompt (exact slugs, measured>fudge,
  structured findings return) and verify your own premises first.
- **Cross-family gates:** `/logic-gate` (pre-op plan review + post-op blind verdict) and
  `/code-review` (post-op diff review) are available for higher-risk engineering work, but they run
  **only when the owner explicitly requests them** — do not trigger them automatically. When they do
  run, the reviewer is ALWAYS the opposite model family (Kimi driver → Claude via
  `dispatch-claude.sh`; Claude driver → Kimi k3 via `dispatch-kimi.sh`). Routing:
  `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` § "Generic engineering gates".
- **Front end:** read `docs/frontend-conventions.md` before any UI work — the binding,
  harness-agnostic reference for ALL user-visible web work: styling (named exports only, no CSS
  modules, `var(--token)` colors, pills `999px` / cards `10px` / inputs `8px` radius), routing,
  SEO + embed metadata, the no-JS crawler surface, backend/data flow, share-card pipelines, and
  image scaling. New pages follow its multi-file touch-point checklist (§13).

## Quick reference (details in CLAUDE.md)

- Node 22 (`tsx`), TypeScript strict ESM; Vite 5 + React 18 in `web/`; Vitest under
  `scripts/tests/**`.
- `bash scripts/verify.sh` — the canonical gate (fast); `full` adds web build + smoke; `deploy`
  adds the DPS-chart artifact. Green before anything leaves the machine.
- Commit early and often; **never push unless the owner asks**. Agent-authored commits carry a
  per-harness `Co-Authored-By` trailer — attribute to the harness that actually authored the commit:
  Claude/Kimi use `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; **Qwen uses
  `Co-Authored-By: Qwen Code <noreply@alibaba.com>`**.
- **NEVER discard working-tree changes** (`git restore` / `git checkout --` / `git reset --hard`)
  — the worktree is shared by concurrent sessions. Engine edits happen on an isolated worktree.
- Exact-slug is P0; measured > fudge; measurement ≠ enactment; an existing labeled fixture IS an
  independent method (check `docs/VALIDATION-INDEX.md` before deriving ground truth).
