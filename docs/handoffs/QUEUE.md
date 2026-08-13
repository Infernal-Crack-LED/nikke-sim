# QUEUE.md — live action items (session state, AI-facing)

> Moved out of `CLAUDE.md` 2026-07-26 (owner ruling: the work queue is session state, not an
> instruction file — `CLAUDE.md` keeps durable rules + verified facts only). Every live/deferred
> TODO or "next steps" list MUST live HERE — chat is ephemeral, only files carry across sessions.
> Landed current state → `docs/STATE.md`; research threads → `docs/open-questions.md`; settled WHY
> → `docs/DECISIONS.md`; the actionable **live TODO → here**.
>
> **Hygiene (the `.claude/hooks/commit-state-hygiene.sh` nudge fires once per session on commit):**
> items below carry ONLY genuinely-open action items as short pointers into their handoff/plan docs
> — no landed-work narration (landed state → `docs/STATE.md`; settled WHY → `docs/DECISIONS.md`).
> When an item lands, DELETE it here (keep only its open follow-up clause); a done handoff →
> `CLOSED (date)` marker + **`git rm --cached` then a plain `mv`** into `docs/handoffs/closed/`
> (archiving UNTRACKS — the archives are gitignored; procedure and its failure modes in
> `docs/CONVENTIONS.md` → Doc hygiene); a fully-landed top-level `docs/*.md`
> (never a living log) → same into `docs/closed/`; a resolved question → close it in
> `docs/open-questions.md` (single U-numbering — move it to `docs/answered-questions.md` with the
> answer inline, no new A-number).
>
> **Last audited 2026-08-09** — every claim below was re-verified against the tree (branch merge
> state, file/symbol existence, test skips, doc paths). Landed narration deleted; dangling pointers
> repaired.

**PHASE: industrialize the accuracy sweep** — every owned unit within ±3% (multi-run avg) at n≥5,
fewest videos. Master plan: `docs/handoffs/2026-07-16-full-sweep-plan.md`. Dashboard:
`npx tsx scripts/board-read.ts`. **Submission intake: 0 pending** (Nikke Sim Data Submission Google
Form → `/submission-intake` → `/probe-processing` → hand-tune; this line is the tracked count).

### 🤖 AUTONOMOUS WORK QUEUE — read this INSTEAD of the pointer list below if unattended

> **Why this exists (2026-07-25).** The pointer list below is an excellent _attended_ handoff and a poor
> _autonomous_ task list: ~15 threads, most gated on recordings the run cannot obtain, owner rulings it
> cannot get. An unattended session reading it finds no unambiguous
> next action and wanders — burning a night for near-zero landed output. This queue is the opposite: a
> short, ordered list where every item is **(a) unblocked, (b) verifiable by
> a script that already exists.** Owner maintains it; keep it SHORT (≤5) and delete items as they land.
>
> **Rules for an unattended run:**
>
> 1. **Take the topmost unblocked item and finish it.** Do not survey the whole list, do not re-plan the
>    phase, do not "improve" an area you were not sent to.
> 2. **Land in committed slices.** A slice = a coherent change + its gate green (`bash scripts/verify.sh`
>    or `npx vitest run`) + a commit whose message names the premise it rests on and how it was verified.
>    Committing is encouraged and cheap (constraint 2); pushing stays owner-gated. The autonomous
>    blast-radius cap enforces this mechanically at 300 uncommitted lines.
> 3. **PRODUCTIVITY STOP.** Every ~45 min, ask: _what have I committed with a green gate?_ Two consecutive
>    checkpoints with no commit ⇒ **STOP the thread**, write findings to a handoff doc, and either move to
>    the next queue item or end the run. A night that produces one honest committed slice plus a clear
>    handoff beats a night of exploration with nothing landed.
> 4. **Reuse before you derive** (the SUFFICIENCY rule) — search for an existing labeled set before
>    generating ground truth. An unattended run is exactly where the 5-hour re-derivation happens.
> 5. **One unvalidated fact is not a mandate.** If a finding implies a broad rewrite, that is a STOP-and-
>    propose, not a green light: write the proposal, commit it, continue. Sweeps are FINDINGS-ONLY.

**QUEUE (owner-maintained; empty = do a survey pass and propose, do not invent work):**

1. **`takina`'s residual is now BIGGER and unexplained — 0.579 COLD, n=1.** The 2026-08-12 swap
2. **`snow-white-heavy-arms` is FIT-EXPOSED by the stage-entry correction — re-tune, do not
   re-fudge.** The 2026-08-13 ruling (DECISIONS) re-times "entering Burst Stage N" to the chain's
   stage TRANSITION, one step ahead of the stage-N cast. Her S2 ATK ▲73.92%/10s rides exactly that
   trigger, and her magnitudes were hand-tuned against the old cast-frame timing, so she moved
   0.954 → 0.946 (n=4) and crossed the ±5% band into ±8% — the board's only band movement from that
   change. Same class as the 2026-07-21 rotation-fix exposure: the fix is right, the unit's fit was
   standing on the bug. Re-tune her against her existing recordings; do NOT restore the old timing.

3. **⚑ `hitCount` counts attacks the kit would not count (engine-wide, surfaced via `velvet`).** The
   trigger's counter accrues on EVERY normal attack and the gate (`fbGate` etc.) is applied at
   FIRING time, so a threshold crossing that the gate blocks still SPENDS its N. For a kit line
   worded "landing 50 normal attack(s) **during Full Burst**", out-of-FB attacks should not advance
   the counter at all. Measured divergence on velvet: the two readings converge where gated shots
   dominate (55 procs vs the in-FB-only 54) and part company at low volume (1 vs 0 in her off-B2
   fixture); both counts are pinned in `scripts/tests/units/velvet.test.ts` so it cannot drift
   silently. Fix shape: a count-scope option on the trigger (count only while the gate passes).
   Cross-cutting across every hitCount carrier ⇒ needs its own blast-radius pass, which is why it
   was filed rather than made.

