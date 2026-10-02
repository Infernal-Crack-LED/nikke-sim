# Driver notes — `aigis` (Aigis) — kit-autonomy gauntlet 2026-09-03

Driver: Claude Fable 5.1 (this harness). Routing (owner instruction for this run): the roles the
protocol pins to `claude-fable-5` went to `kimi-code/k3`; S5/S6 stayed on `claude-opus-5`; Tier-2 second
S2b reviewer `claude-opus-5`; S7 judge `kimi-code/k3` (+ `claude-opus-5` as the Tier-2 second judge).

## Convergence run — S5 blind test vs the driver's shipped override

- **Unmodified blind file (`blind/aigis.test.ts`): does not compile** — one unescaped apostrophe inside a
  single-quoted `it.skip` title ("the skill user's DEF"). Mechanical defect, preserved verbatim.
- **Adapted copy (`blind/aigis.adapted.test.ts`), two changes only:** (1) that quote; (2) the FIXTURE. The
  blind author used `controlComp('aigis', true)` = liter / crown / aigis / helm, which seats **crown ahead of
  aigis in the stage-2 slot** — both on a 20s cooldown, first-ready → slot order — so aigis **never casts**
  and every S2/burst assertion runs against an empty event set (its own non-vacuity gate is satisfied by
  liter's casterAtkPct grant, not hers). With the quote fixed but the fixture unchanged the file runs
  **6 passed / 5 failed / 1 skipped**, every failure downstream of the empty cast set (the second S2b
  reviewer predicted exactly this hazard). With the fixture swapped to liter / aigis / scarlet / helm (she is
  the sole Burst II; two alternating Burst IIIs so every rotation reaches Full Burst) the adapted file runs
  **11 passed / 1 skipped / 0 failed** — the skip is the blind author's own Marakukaja GAP.
- Verdict from the driver's side: convergence GREEN once the fixture lets her cast; the 5 unmodified
  failures are RECON/fixture errors, not divergences.

## Divergences the driver reconciled (S2c)

1. **Marakukaja (DEF ▲ 21.12% of the skill user's DEF, all allies).** Driver + kimi S2b + opus S2b + S5:
   UNMODELED/GAP (no caster-DEF-scaled StatKey; DEF has no consumer in v1). S6 blind override instead ships
   `defPct 21.12` on allies as a labeled basis approximation. Resolved toward the prose: `defPct` scales the
   TARGET'S own DEF, a different quantity; the line is verbatim in `unmodeled.skill2` with a recipe.
2. **`burstDesc: 'allEnemies'` on the nuke.** The opus S2b reviewer called tagging "reflexive". The repo
   rule is the owner ruling 2026-08-10 (literal-only): her clause is exactly "■ Affects all enemies.", and
   `scripts/tests/census-burst-amp-scope.test.ts` ENFORCES the tag roster-wide (an existing labeled fixture).
   Kept.
3. **Window length.** S6 authored 11 s; the driver's 652 f (10.867 s) is frame-exact for a Burst II cast
   (30 f stage gap + 22 f pre-FB delay + 600 f) and the spec test pins every expiry to the actual
   `fullBurstEnd` frame. Both reviewers flagged the value as a derived ⚑ — it is, and the caveat says so.
4. **`crit: true` on the nuke (S6).** Equivalent: the engine's rider convention makes burst-slot flatDamage
   crit-eligible by default (the driver test pins `critEligible === true`).
5. **`rangeApplied === false` on the nuke** (kimi/opus asked for it): added to the driver test.

## Engine facts the blind roles could not see

- The engine has no "until Full Burst ends" duration primitive; the durationSec stand-in is the documented
  precedent (yukiko's 622 f Burst-III window, 2026-08-19).
- `defPct` has no reader anywhere in the engine (types.ts: "inert in v1"), so the S1 Rakukaja pin is an
  inertness pin by mechanism, not by fixture.
