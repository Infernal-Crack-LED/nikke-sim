# Handoff — anis-star double thread (2026-08-16, session ended at limit)

Two threads. Thread A is DONE and waiting on the owner. Thread B is a /scientific-method
measurement run interrupted at its session limit AFTER the work step substantially completed
but BEFORE the driver review / blind post-op / 2-of-2. Everything below is committed; nothing
is lost.

## Thread A — `anis-star` hitsPerShot carve-out removal: COMPLETE, owner-gated push

- Branch `anis-star-gauge-divisor` on worktree `../nikke-sim-wt-anis-star-gauge`, 7 commits
  (f1c784f3 → 991f3e45), `verify.sh` GREEN, working tree clean.
- Full /scientific-method run: premise gate (4× CONFIRM incl. one REFUTATION of the hack's
  stale "PA MiKa flips to 12" justification) → pre-op APPROVED-WITH-REVISIONS → work →
  driver ACCEPT HIGH + blind post-op ACCEPT HIGH → IMPLEMENT → implementation review
  FIX-BEFORE-MERGE, all FIX/NOTE items resolved in `991f3e45`. Record: harness log
  2026-08-16 entry (on the branch), DECISIONS entry (on the branch).
- Outcome: every enabled measured FB pin byte-identical (PA MiKa 11×25, T2 12×25, N5,
  misc B3s pin stands); T5 11/12→12×100% toward measured 13; blast radius exact-zero outside
  her comps; solo decomposition 8.90→10.39 %/pull (still below the ≥ ~10.96 exclusion bound —
  filed on U28, NOT closed).
- **Owner actions:** push + PR when ready (never push unbidden). At PR time: `/patch-notes`
  hook will nudge; expect a small QUEUE.md/CLAUDE.md merge (main moved concurrently — take
  per-hunk care, `--rebase-merges` rule if rebasing). Remove the worktree after merge.
- Follow-ups already filed in the branch's QUEUE edit: fit-exposure re-tune of PA MiKa
  supports (`mint` → 1.067, `prika` → 1.112, `alice` → 1.114, `red-hood` +2.7%); an
  engine-level pin for her rider gauge channel (current pins mirror the formula).

## Thread B — solo recording #2 measurement (`docs/probes/solo/anis-star-solo.mov`): work step ~done, JUDGING NOT STARTED

**Pipeline position:** pre-op APPROVED-WITH-REVISIONS (R1–R5 executed in the packet) → work
agent ran and produced the artifact + tooling, then DIED at the session limit before writing
the deliverable doc or committing. This session committed its output verbatim (this commit).
**No driver review, no blind post-op, no 2-of-2, no probe-runs/harness entries yet — the
measurement is UNJUDGED. Do not cite its numbers anywhere until the 2-of-2 lands.**

Files (all in this commit, main):

- Packet (pre-registration of record, R1–R5 inline):
  `docs/handoffs/2026-08-16-anis-star-solo2-gauge-preop-packet.md`
- Artifact (verdict-free, complete-looking: instrumentPrelude/windowMap/montage/perPullTable/
  questionA/noiseInput/result): `docs/probe-data/anis-star-solo2-gauge.json`
- Replay pin: `scripts/tests/probe/noise-solo2.test.ts` — **5/5 GREEN** (recomputes the
  artifact's `result` from its own committed series/inputs; no verdict).
- Tooling: `scripts/probe/fill-trace-compare.ts` +243 lines (the noise-solo2 path over the
  NEW artifact — the committed `noise-solo` mode was hardwired to the old A3 artifact).
- Catalog entry for the video (escape-damage repaired, parses clean).

**NEXT SESSION — resume exactly here:**

1. Read the packet FIRST (it is the decision-rule SSOT), then the artifact.
2. Write the judge-ready deliverable the agent never wrote
   (`docs/handoffs/2026-08-16-anis-star-solo2-gauge-work-deliverable.md`) — transcribe from
   the artifact ONLY (it is verdict-free by design): instrument gate (maiden-ice-rose
   reproduction numbers — VERIFY the prelude actually ran and passed; if absent/failed,
   BASIS-BROKEN per packet), window map vs the pre-registered one (R2 drops, R3 W4 gate),
   pull inventory trace-vs-montage per window (R4 — every counted window needs the
   hand-montage cross-check; check the artifact's `montage` section actually covers each),
   Question A per-window table (baseline / K-bands per R1 disjointness / observed K /
   double-consistency flags), Question B bins-vs-floors + Wilson bounds.
3. DRIVER REVIEW (gate #1) — verify rule-adherence, whole-picture (cadence ≈1.05s/pull +
   2.35s reload vs window durations; the pre-registered W4 anomaly: ~6.5s fill that no
   hypothesis predicts — packet R3 says W4 is dropped unless montage-verified AND
   reconciled).
4. Blind post-op: `Agent(postop-judge)` with EXACTLY [the packet] + [the deliverable] + the
   pre-op judge's cannot-establish list — which is the packet's own list PLUS the judge's two
   additions recorded here because they exist only in this handoff otherwise:
   (a) at unfavorable rendered baselines (outside ~[1.4, 6.5)) K=10 is doubly-consistent
   between H-model 10.39 and the elevated band's bottom sliver [10.96, 11.11] — not a
   confirmation; (b) Question B's output is INPUT to the classification thread's ceiling
   test — it stamps nothing about H-C, and a floor-scraping ~150 bins with zero false events
   gives Wilson ~1.8%, short of the ~1% that thread wants (pooled ~355–385 bins reaches
   ~0.75–0.95%). Also show the judge the packet's partial-blindness declaration + the pre-op
   risk flag that the 1fps montage weakly encodes K.
5. 2-of-2 → outcome is LOG-class either way (measurement-only packet): probe-runs.md append,
   harness-log entry, close/annotate the QUEUE item-2 recording-ask clauses this satisfies
   (the divisor/magnitude read + the same-regime noise floor; note the ask ALSO wanted these
   bins for the C4 resolver — feed the classification thread's ranked item (2), which needs
   its OWN pre-op). If K=9 on ≥2 windows: that is a measured solo overshoot vs the enacted
   10.39 — file on U28's magnitude half; it does NOT re-open Thread A (its verification basis
   is comp-level FB pins; the packet + pre-op say so explicitly).
6. Constraint-9 sweep: the `--bar` override value + derivation must be IN the artifact's
   readerInvocation; the fill-trace-compare extension + replay pin are committed (done); if
   any cited helper is still /tmp-only, promote it.

**Context that will not survive the session (recorded here on purpose):**

- `gauge-fill.py` WITHOUT `--bar` self-calibrates onto a dark terrain edge on this footage —
  the first structural trace was garbage (all-'filling', fake reset clusters). Any future
  solo read: explicit `--bar` + maiden fixture gate. Candidate `/skill-maintenance` item:
  add this to /probe-processing's reader table row for gauge-fill.
- `read-ammo.ts` reads 0/851 frames on her HUD — she renders "AMMO / NNN" text-label style,
  not the boxed digits the template matches. Tooling follow-up (MISSING READERS): a
  text-label digit path. The hand-montage ammo read is the sanctioned fallback (it is the
  owner-primary instrument from the 2026-08-15 read).
- Recording structure (categorical, pre-registered): 4 solo Burst-1 casts (~t14/39/64.5/
  83–84 video), each → ~10s stage-II countdown (chain waits on a nonexistent Burst II) →
  expiry; refill windows W2≈27.5–39, W3≈51–64.5, W4≈77–83.5 (+opening W1≈2–14); t0∈[1.0,2.0]s
  video; clip ends mid-fight at timer ~01:35.
- Frames were extracted to `/tmp/anis-star-solo-2/frames30` (2552 @30fps) — regenerate if
  gone: `ffmpeg -v error -i docs/probes/solo/anis-star-solo.mov -vf fps=30 <dir>/%05d.png`
  (the .mov auto-rotates to 2622×1206 on decode; no transcode needed).

## QUEUE

Pointer added under QUEUE item 2 (this commit). This handoff closes when Thread B's 2-of-2
lands and Thread A's PR merges — then archive it per the closed/ procedure.
