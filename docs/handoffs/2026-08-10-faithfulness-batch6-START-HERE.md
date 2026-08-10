# Faithfulness phase-4 BATCH 6 — start here (written 2026-08-10, for a fresh session)

> **You are continuing an in-flight sweep.** Batches 1–5 + a remainder pass are done and
> committed. This doc is the full entry point: what the sweep is, what changed under you, the
> exact unit list, the pre-computed per-unit signals, and the rules that now bind. Read the
> plan-of-record (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4) for the checklist itself;
> everything else you need is here.

**Slug discipline.** Every unit below is named by its EXACT slug, and several are ambiguous
base names — read them as the BASE unit, not the variant: `helm` = SR/Water Treasure (NOT
`helm-aquamarine`), `privaty` = AR/Water (NOT `privaty-unkind-maid`), `alice` = SR/Fire (NOT
`alice-wonderland-bunny`), `cinderella` = RL/Electric (NOT `cinderella-crystal-wave`), `anis` =
RL/Iron, `eunhwa` = SR/Fire (NOT `eunhwa-tactical-upgrade`), `d` = SMG/Wind (NOT
`d-killer-wife`, which appears separately), `mica` = RL/Wind, `elegg` = MG/Electric (NOT
`elegg-boom-and-shock`, the Water variant, which appears separately). Hyphenated slugs
(`ade-agent-bunny`, `maiden-ice-rose`, `mihara-bonding-chain`, `quency-escape-queen`,
`rapi-red-hood`, `snow-white-heavy-arms`, `mast-romantic-maid`, `dorothy-serendipity`,
`guillotine-winter-slayer`, `neon-vision-eye`, `anis-star`, `soda-twinkling-bunny`) are
already unambiguous. `red-hood` and `rapi-red-hood` are two different units.

## 0. Tree state before you touch anything

- **Worktree:** `/Users/maxwellsutton/nikke-sim-wt-faithfulness`, branch `fix/faithfulness-pass`.
  Do the work HERE, not in the shared main tree (CLAUDE.md constraint 8).
- **4 commits are UNPUSHED** (batch 4, a jill spec-header fix, the batch-4 remainder, batch 5).
  The owner has not asked for a push or PR. Commit freely; do not push.
- `bash scripts/verify.sh` is green at HEAD and the board is byte-identical to the pre-batch-4
  read (`within ±3%: 7 | ±5%: 14 | ±8%: 23 | worse: 22`, 142 datapoints / 45 units). If your
  first board read differs from that, something moved before you started — find out what.
- Husky hooks DO run in this worktree (`.husky/_` is present).

## 1. What batch 6 is

Batch 6 continues the **graded-comp slice** of the phase-4 ordering. 33 units appear in the
ENABLED graded comps (`scripts/regression.ts`; the 4 disabled comps do not count); 12 are
reviewed. **21 remain**, listed in §3. Take ~6, highest-leverage first.

Reviewed so far (34 units, do not redo): batch 1 `viper phantom novel exia soda-twinkling-bunny
isabel` · batch 2 `anis cocoa elegg frima ludmilla marciana-marine-study` · batch 3 `ether
eunhwa himeno signal mica crow` · batch 4 `jill ein moran maxwell takina elegg-boom-and-shock` ·
remainder `belorta jackal quiry ram` · batch 5 `crown anis-star cinderella little-mermaid helm
trina`.

## 2. Rules that bind you (three are NEW as of batch 5 — read them before tagging anything)

1. **Batch-and-stop, findings-only.** Per-unit output is findings. You may apply only the
   already-owner-ruled pattern classes: `burstDesc` scope tags (but see rule 2), enemy DEF ▼
   encodes (none left — see §3), and falsified/stale prose. Anything that moves the board stops
   and gets surfaced with a measurement, never enacted mid-sweep.
2. **⇒ NEW — TAGGING IS PAUSED where an amp can reach.** `trina`'s Spread Roots
   (`burstSkillAoeDamagePct` 435.6/5s) and `jackal`'s (`burstSkillSingleDamagePct` 38.91/15s)
   are LIVE. Tagging `cinderella` took her **0.893 COLD → 1.523 HOT**; the real fights refute
   the combination of (435.6 magnitude, additive Damage-Up placement, non-literal scope) at that
   scale. So: **A/B every tag with a FULL board diff before landing it**, and do not land one
   that moves the board or another unit's spec. Detail + the validation recipe:
   `2026-08-10-faithfulness-batch5-findings.md`.
3. **⇒ NEW — "board-inert" is not "inert". Check the FIXTURES too.** `helm`'s tag was
   board-inert by full diff and still broke two `jackal` pins, because jackal's spec fixture
   seats helm. `controlComp()` seats liter/crown/`<unit>`/helm, so anything in a controlComp
   fixture co-occurs with those three. §3 has the co-occurrence pre-computed for every candidate.
4. **⇒ NEW — a carrier census must check LINE + TRIGGER + GATE.** Three census methods have now
   each failed once: prose-grep (over-counted `cocoa`), list-keyed (under-counted 4 units in
   batch 2), and kit-text grep (over-counted `belorta` — her DEF ▼ is gated on ">4 enemy units",
   unsatisfiable solo). A grep finds the line, not its gate.
5. **Sweep greps must be whitespace-normalized and cover BOTH trees** (`src/skills/overrides/*`
   AND `scripts/tests/units/*`). A line-wrap defeated an exact-phrase grep in batch 3, and
   batch 4's remainder found two spec headers nobody had listed. Pattern:
   `tr -s ' \n' '  ' < "$f" | grep -o -i -E "..."`.
6. **Verify claims before writing them down.** Two claims in this sweep were wrong on first
   pass and caught only by re-checking: a grep-filtered A/B that reported "the board moves by
   exactly zero" (the full diff found `liberalio`), and a "the sweep grep now returns zero"
   line written before running it (it didn't). Run the check, then write the sentence.

## 3. The 21 remaining units, with the signals pre-computed

`ampComp` = shares a board-reading comp with an amp carrier. `tag?` = does the burst have a
damage line, and what is its scope clause. **No fixture seats ANY of these candidates with
`trina` or `jackal`** (checked; the helm trap does not apply to them — but re-check if you add
a fixture).

| unit                       | graded comps    | board      | burst-damage scope clause → tag?                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | --------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `neon-vision-eye`          | 2 (run-B, T2)   | 1.040 HOT  | no burst damage line. **Shares run-B with `trina`** — nothing to tag, so no risk                                                                                                                                                                                                                                                                                                                                                                    |
| `rouge`                    | 1 (run E)       | 1.027      | no burst damage line. Shares N3 with `trina` — no risk                                                                                                                                                                                                                                                                                                                                                                                              |
| `dorothy-serendipity`      | 2 (PH, N9)      | 0.924 COLD | no burst damage line                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `grave`                    | 2 (run I, N1)   | 1.095 HOT  | no burst damage line. Carries U19 (F11 held primitive)                                                                                                                                                                                                                                                                                                                                                                                              |
| `maiden-ice-rose`          | 2 (T2, N6)      | 0.938 COLD | no burst damage line                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `quency-escape-queen`      | 2 (PH, N1)      | 1.041 HOT  | **"Affects all enemies" — LITERAL. Tag candidate**                                                                                                                                                                                                                                                                                                                                                                                                  |
| `rapi-red-hood`            | 2 (T7, N1)      | 0.929 COLD | **"Affects the enemy nearest to the crosshair" → singleEnemy (elegg precedent)**                                                                                                                                                                                                                                                                                                                                                                    |
| `red-hood`                 | 2 (PA MiKa, N9) | 0.970      | no burst damage line. Lifesteal non-emitter (see §4)                                                                                                                                                                                                                                                                                                                                                                                                |
| `ada`                      | 1 (run E)       | 0.995      | no burst damage line                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `ade-agent-bunny`          | 1 (N6)          | 0.964      | no burst damage line                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `alice`                    | 1 (PA MiKa)     | 1.101 HOT  | no burst damage line                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `chisato`                  | 1 (run I)       | 0.968      | no burst damage line. F7 ramp-bake + F8 swap carrier                                                                                                                                                                                                                                                                                                                                                                                                |
| `d-killer-wife`            | 1 (N1)          | 0.937 COLD | **"Affects the enemy nearest to the crosshair" → singleEnemy.** Also the `targetStatus` string-pair carrier (F2.2) and the intra-unit block-ORDER carrier (F2.5)                                                                                                                                                                                                                                                                                    |
| `guillotine-winter-slayer` | 1 (PH)          | 1.024      | no burst damage line                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `mast-romantic-maid`       | 1 (T7)          | 0.951      | no burst damage line. F7 ramp-bake carrier                                                                                                                                                                                                                                                                                                                                                                                                          |
| `mihara-bonding-chain`     | 1 (N6)          | 1.034 HOT  | burst damage is a **`dot`** (Dragging Chain, 50.05%/s sustained, stack-mirrored → `dot` atkPct 700), not a `flatDamage`. **Not a tagging decision — an engine-coverage one:** `burstDesc` is plumbed only on the `flatDamage` effect and the pending-hit path; the `dot` record built in the dot case carries no `burstDesc`, so a burst-slot dot can never be amp-eligible however it is tagged. Record as an F3-adjacent gap; do not invent a tag |
| `mint`                     | 1 (PA MiKa)     | 1.015      | no burst damage line. 5e state-machine trio (XOR toggle) — held                                                                                                                                                                                                                                                                                                                                                                                     |
| `noir`                     | 1 (run I)       | 0.884 COLD | **"Affects all enemies" — LITERAL. Tag candidate**                                                                                                                                                                                                                                                                                                                                                                                                  |
| `prika`                    | 1 (PA MiKa)     | 0.890 COLD | no burst damage line. 5e trio (cross-unit event bus) — held                                                                                                                                                                                                                                                                                                                                                                                         |
| `privaty`                  | 1 (T4)          | 1.120 HOT  | **"Affects all enemies" — LITERAL. Tag candidate**                                                                                                                                                                                                                                                                                                                                                                                                  |
| `snow-white-heavy-arms`    | 1 (T4)          | 0.954 COLD | "Affects all destructible projectiles" — NOT an enemy scope; probably no tag                                                                                                                                                                                                                                                                                                                                                                        |

**No enemy DEF ▼ kit lines among the 21** (checked against `data/characters.json`). The DEF ▼
class is closed for the graded slice; `belorta` was its last false positive.

### The three literal-`"Affects all enemies"` carriers are the interesting ones

`noir`, `privaty`, `quency-escape-queen` carry the **exact string `trina`'s amp names**. That
matters for the open batch-5 question: if the amp's scope is literal-only (hypothesis 1), these
three are its true qualifying carriers and `cinderella` is not. None of them shares a comp with
`trina` today, so tagging them is board-inert — but it pre-loads the landmine for any future
comp. **Recommendation: tag them only alongside the amp validation, or A/B and land with an
explicit note that they are now live amp targets.**

### Suggested batch-6 six

`d-killer-wife`, `noir`, `privaty`, `quency-escape-queen`, `rapi-red-hood`, `mihara-bonding-chain`
— i.e. every unit in the slice with an open tag decision, so the tag question is settled in one
motion instead of dribbling across batches. If you would rather lead with board pain, swap in
`grave` (1.095, U19) and `dorothy-serendipity` (0.924).

## 4. Open threads a batch-6 unit will run into

- **`red-hood` is one of the 5 lifesteal non-emitters** (`d`, `moran`, `red-hood`, `rem`, `tia`
  of 13 carriers). Batch 4 proved this class board-inert for a SELF-scoped lifesteal (a heal
  fires recovery only at its own targets, so it cannot reach an ally-side consumer; a probe emit
  on `moran` moved the board by zero). Check her scope; if self, it is a consistency item, not a
  fit item. One roster-wide ruling is wanted, not 5 unit-local fixes.
- **`chisato` / `mast-romantic-maid` are F7 ramp-bake carriers** — flag, never inline-fix, and do
  not double-correct hand-averaged units.
- **`chisato` is an F8 swap-economy unit.** Batch 4 found the engine's swap branch reads
  `u.swap.pullsPerSec ?? PULLS_PER_SEC[...]` and never falls back to `u.pullsPerSec` — `jill` was
  the only unit with both a `charFixes` cadence and a swap, but check any swap unit's cadence
  assumptions against that code path.
- **`d-killer-wife` carries two F2 silent-failure surfaces at once** (the cross-slug
  `targetStatus` string pair, and load-bearing intra-unit block order). Worth the extra care.
- **`mint` / `prika` are 2 of the 5e state-machine trio** — explicitly NOT solvable by one
  registry; leave held.

## 5. Procedure per unit (what "reviewed" means)

1. Read the kit from `data/characters.json` (the SSOT — never the override's own prose), the
   override, and the unit's spec.
2. Walk the §2-phase-4 checklist (11 items) in the audit doc.
3. Apply only the ruled classes; A/B anything that could move damage; run the unit's spec after
   each change.
4. `npx tsx scripts/validate-overrides.ts <slugs>` — it lints bare `sim.ts:<line>` citations
   (they rot: 6 of 6 checked in batch 4 had already drifted) and echoes caveats.
5. Regenerate mirrors: `npx tsx scripts/kit-status.ts --refresh` then
   `npx tsx scripts/gen-unmodeled-review.ts`.
6. `bash scripts/verify.sh` green + a full `npx tsx scripts/board-read.ts` diff against the
   §0 baseline.
7. Write `docs/handoffs/2026-08-10-faithfulness-batch6-findings.md` in the shape of batches 4/5
   (Applied / Cross-cutting STOP-AND-SURFACE / Recorded-not-applied / Batch stats), add a
   DECISIONS entry, update QUEUE.md, commit.

## 6. The recurring defect class — expect it, look for it

Every batch so far has found **override prose describing a unit that no longer exists**, and in
two cases the note contradicted itself:

- `jackal`: ~600 words of "ENGINE GAP: no Burst-Skill-Damage bucket" + a caveat opening "is NOT
  modeled", while the override carried the amp. Two of five caveats disagreed with a third.
- `trina`: caveat 1 said Spread Roots is "NOT modeled", caveat 5 said MODELED.
- `jill`: a falsified board grade ("~1.07–1.34" vs an actual 1.924) and a `noFb` claim the
  override contradicts, plus a spec header citing a group that no longer exists.
- base-`eunhwa` + `phantom` spec headers: "UNMODELED / pinned by ABSENCE" for DEF ▼ lines that
  the same passes had just encoded.

**Cheap detector:** for each unit, grep its note+caveats for `NOT modeled`, `unmodeled`,
`no primitive`, `engine gap`, `dormant`, `inert` and check each hit against the shipped blocks.
A note claiming a line is absent while the JSON carries it is the highest-yield finding in this
sweep, and it is invisible to every test.
