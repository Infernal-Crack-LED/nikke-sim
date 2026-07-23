# kit-autonomy — tracked templates + run artifacts

Tracked companion to the live skill `.claude/skills/kit-autonomy/SKILL.md` (gitignored, like every other
skill). The design + decisions of record live in `docs/kit-autonomy-decisions.md` (**§14 red-team revisions
are AUTHORITATIVE**). This directory holds the four agent-prompt templates the skill spawns, plus the
per-run artifacts (evidence trail) the gauntlet produces.

## Templates (spawn each as a fresh subagent, non-negotiables prepended)
| File | Stage | Role | Blind to |
| --- | --- | --- | --- |
| `TEST-FAITHFULNESS-REVIEW.md` | S2b | **adversarial** independent test-faithfulness reviewer — re-derives the spec + the nearest-wrong reading + the distinguishing assertion per line; proposes the load-bearing set | driver's tests / dispositions / reasoning |
| `BLIND-TEST-WRITER.md` | S5 | writes a full `<slug>.test.ts` from the prose alone (the forcing function) | driver's tests / override / reasoning; truth file |
| `BLIND-OVERRIDE-WRITER.md` | S6 | `kit-parse` BLIND-STUDY — writes an independent `OverrideFile` + audit + ⚑ list | this unit's override; driver's tests/reasoning; DECISIONS/handoffs/probe-data; board; git history |
| `RECONCILING-JUDGE.md` | S7 | **binding go/no-go** — grades artifacts vs prose + formula + the two blind re-derivations; convergence = run S5 tests vs the driver's override | nothing (grades artifacts; does not trust the author's self-report) |

## Blind-packet redaction + leak assertion (Stage 0, before dispatching S2b/S5/S6)
The blind roles read the **kit prose** (legitimate input — it names the mechanic being derived) and the
**`types.ts` schema** (vocabulary). They must NOT receive methodology text that *states the target's answer*.
1. **Redact** the target unit's name/slug, its trigger/gate/magnitudes, and any worked example naming it from
   the excerpts of `docs/kit-autonomy-decisions.md §5` and the `kit-parse` hard rules (substitute a *different*
   unit's example). For `privaty`: strip `256.17` / `1687` / `1407.64`, `Designated Target`, and the
   "privaty = lastBullet + targetStatus" / "Privaty S2 … 256.17%" examples (§5.2#4, §5.6, hard-rule #5).
2. **Leak assertion (mirrors `scripts/blind-rebuild/build-packet.ts`):** grep the assembled blind prompt for
   the slug + its key magnitudes + answer tokens **outside the prose block**; fail loudly if any appear.

## Run artifacts (evidence trail; created at runtime)
- `reviews/<slug>.test-review.json` — S2b adversarial spec.
- `reviews/<slug>.verify.txt` — S2d independent verification matrix (GREEN-vs-shipped + RED-vs-each-counterfactual).
- `blind/<slug>.test.ts` + `blind/<slug>.test-spec.json` — S5 blind tests.
- `blind/<slug>.override.json` + `blind/<slug>.audit.json` — S6 blind override.
- `results/<slug>.json` — S7 judge verdict (GO / NO-GO + gotchas + kitDescription + faithfulnessScore).

## The honest limit (read the skill / §14.1)
Every reviewing agent is the **same model** — a clean GO is evidence against idiosyncratic error + a
forcing-function check, NOT proof of faithfulness. Systematic shared-prior errors (scope / duration /
trigger-identity) need a different model or the owner; magnitude faithfulness is out of scope.
