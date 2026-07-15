# Modeling priors — start new characters from the accumulated fit

Recurring correction patterns mined across all hand-tunes, so a fresh override starts close instead
of re-discovering the same fix. Maintained by the `/tuning-priors` skill. A **pattern** is the same
root-cause fix seen in **three or more units**; each names the game mechanic it comes from.

Two classes: **engine defaults** (a prior that held universally and was promoted to automatic engine
behavior) and **per-kit priors** (apply as a starting guess, then verify per unit — genuinely varies).

## Engine defaults (already automatic — no per-unit action)

- **Release latency** — snipers and rocket launchers carry a ~22-frame (~0.37 s) bolt-recovery gap
  between shots by default; autofire units are exempt (`charFixes.noBoltRecovery`). Graduated from
  Mint (1.21→0.91), Trina, Maiden, Helm.
- **Machine-gun wind-up ladder** — the measured ramp, applied to every machine gun (measured
  constant, never refit).
- **Focus gauge** — the camera-focused unit generates ×2.5 burst gauge **only on charge-weapon
  shots** (snipers/launchers). Focusing a non-charge weapon (machine gun, submachine gun, assault
  rifle, shotgun) adds essentially no gauge. So which unit holds the camera changes a fight only
  when that unit is a charge weapon.
- **Distributed damage** deals full value against a single target — never model a split penalty.
- **Stat basis** — scope lock uses **Base 5 gear** (corrected 2026-07-14, was OL0).

## Per-kit priors (apply as the starting guess, verify per unit)

1. **Cadence / rate-of-fire is the #1 cause of uniform heat.** When a unit reads uniformly hot or
   cold across a fight, suspect the datamined `rate_of_fire` / proc cadence BEFORE touching damage
   values — the value is usually right and the frequency is wrong. Fixed this way: Jill
   (1.67→1.02, real 150 rounds/min), Cinderella (1.67 was cadence), Scarlet: Black Shadow (proc
   blend every 6→10 shots), Maiden (×0.68 was cadence, not value).

2. **Function-damage rider Full-Burst & range treatment is genuinely per-kit.** Default: a rider
   (proc / function damage) is exempt from the +50% Full Burst major and the +30% range bonus
   (`noFb` / `noRange`). BUT verify per kit — Scarlet: Black Shadow's procs measured exempt;
   Liberalio's measured ×1.3333 WITH Full Burst (the opposite). Never assume from the class rule.

3. **The parser drops sustained damage-over-time lines and unsupported triggers → undercounts.**
   Scan a new parse for missing burst/DoT lines and rebuild them as real-interval DoTs. Fixed:
   Modernia (a per-hit stack read as 1/s), Milk: Blooming Bunny (S2 burst DoT dropped), and many
   "parser skipped …" notes.

4. **Stack / currency mechanics → model as steady-state throughput with a ramp haircut.** The
   average stack level over the fight is the calibration knob. Fixed: Mihara (stacks 10.8→12),
   Cinderella (the Beautiful ramp), Soda: Twinkling Bunny (Golden Chip economy). Guillotine: Winter
   Slayer (Hero Level) is the current open case in this family.

5. **Multi-projectile weapons either split into N damage instances or merge into one — per-unit,
   video-verify.** Cinderella's twin rockets are two separate instances; Maiden's twins merge into
   one; Vesti fires a volley. Don't assume; read the popups.

6. **HP-scaling kits count the unit's OWN Max HP only** — ally Max-HP grants do not feed the
   conversion. Fixed: Cinderella.

7. **Element advantage is a clean ×1.10 on the total UNLESS the kit carries an elemental-advantage
   damage buff** (Superior Elemental Code and similar) — then it exceeds ×1.10 and must be modeled.
   Confirmed ×1.1000 exact for the four control anchors (Little Mermaid, Crown, Helm, Snow White —
   no kit element interaction), which is why they can be recorded neutral and multiplied.

8. **Heals are NOT always defensive — some kits trigger damage buffs on recovery.** The parser
   blanket-drops everything matching `heal / recover / restore / potency` as out-of-scope, which is
   wrong when a teammate keys a damage buff off "when recovery takes effect." Root example: Helm's
   0.59% full-charge heal (~every 1.5 s) drives **Crown's team ATK ▲ 20.99% on recovery** to
   near-permanent uptime — dropping the heal left every Crown+Helm team ~15% cold. Engine support:
   the `heal` effect (event-only) + `recovery` trigger (2026-07-14). When auditing a healer OR a
   unit with an "on recovery / when healed" clause, wire the heal→buff pair.

## The offsetting-errors principle (why bare-frame + firing-validation matter)

A unit graded ~1.0 in normal (buffed, advantaged) teams can still be **wrong** — its value calibrated
to *absorb* a missing shared buff. The minimal-variable neutral **control-frame** test (see
`scripts/battery/ref-calibration.ts`) strips buffs/advantage and exposes the base truth; the four
control anchors read 0.85–0.97 bare while grading ~1.0 in the board. Corollary: **"modeled" is not
"working."** Crown's team ATK buff was a fixed self-cadence proxy (~27% uptime) instead of
heal-triggered (near-permanent via Helm), and Helm's "defensive" heal — the trigger — was dropped
entirely. Always **run-validate** that a modeled block fires at the right rate (DBG taps), don't
trust its presence in the override.

**But run-validation itself needs care — DBG can lie.** While chasing the above I twice mis-read
the DBG: `DBG_N=200` capped the instance dump so a barrage that fires 20× looked like it fired
"once," and `fillGauge` writes gauge directly with no `[g]` log line so a firing effect looked like
it "never fired." Count over the WHOLE fight with no cap, and confirm the effect's side-effect
(gauge/damage), not just a log line. LM's `teamAmmo` gauge-fill + barrage are in fact working
(20 fires) — there was no bug there.

## New-character starting checklist

Apply before the first sim of a fresh override, in order:

1. Gear basis = Base 5 (scope lock); release latency on unless autofire-confirmed.
2. Sanity-check the datamined cadence / rate-of-fire against reality (prior 1).
3. Scan the parse for dropped burst / DoT lines and unsupported triggers → rebuild (prior 3).
4. Identify stack / currency mechanics → steady-state with a ramp haircut (prior 4).
5. Identify function-damage riders → apply the `noFb` / `noRange` default, flag for per-kit
   verification (prior 2).
6. Check for multi-projectile weapons → decide split vs merge from video (prior 5).
7. Check for HP-scaling → own Max HP only (prior 6).
8. Element advantage → default ×1.10 unless a Superior-Elemental-Code-style buff (prior 7).

## Exceptions log

When a fresh tune contradicts a prior, record it here (it usually means the pattern is per-kit, not
universal). None recorded yet beyond the per-kit caveats already noted in priors 2 and 5.
