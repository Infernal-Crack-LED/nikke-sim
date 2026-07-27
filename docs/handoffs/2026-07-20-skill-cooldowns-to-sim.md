# Skill cooldowns → sim: read the datamined skill CDs and put skills 1/2 on real timers (2026-07-20)

> AI-facing handoff. **Data side is DONE; engine consumption is the open work.** Referenced by
> `src/data/sync.ts` (the field's landing site). Companion precedent: the `interval` trigger, first used
> for `snow-white`'s Skill-2 (DECISIONS 2026-07-20, kit-audit Phase C). Superseded by anything in
> `docs/DECISIONS.md`.

## Status

> **The CDs are MEASURED-TRUTH — treat them like the other datamined game constants** (normalAttackMultiplier,
> chargeMultiplier, burstCooldownSec, gauge-per-shot). This was never a "should we trust the number" problem;
> the numbers are true. The only problem was a **plumbing gap** — the cooldowns weren't riding along with the
> rest of the game data through sync. That's now fixed. So the engine work is NOT "validate the CD against the
> current encoding" — it is "**make the encoding honor the true CD.**" Where a current proxy trigger
> (`hitCount`/`shotFired`/`fullBurstEnter`) disagrees with the CD, **the encoding is the bug, not the CD.**

- **✅ DATA (landed):** bakery-bot folds an optional `cooldowns: {skill1, skill2, burst}` (seconds) into the
  DB `skill_descriptions` jsonb. `src/types.ts` has `SkillCooldownsSec` + optional `CharacterData.skillCooldownsSec`;
  `src/data/sync.ts` reads `row.skill_descriptions?.cooldowns` and lands it per unit (188/192 units carry it).
  **Semantics (do not conflate the three states):**
  - `number` → activation cooldown in **seconds**.
  - `null` → **passive / no timer** (the skill has no cooldown).
  - **field ABSENT** → **unknown** (unit not yet wiki-matched) — read as "we don't know", NEVER as null/0.
    `snow-white {null,15,40}` and `modernia {null,null,40}` match the contract's validation examples.
- **⏳ ENGINE (deferred — THIS handoff):** nothing reads `skillCooldownsSec` yet. Goal: drive skill-1/2
  activation off the real datamined CD instead of the current proxy triggers (`hitCount`/`shotFired`/
  `fullBurstEnter`/`passive`), the same way `snow-white`'s S2a now uses `{kind:'interval', sec:15}`.

## Session outcome (2026-07-20 — audit complete + 1 clean landing)

**Audit of all 8 CD units done. Cooldown-gate primitive NOT built — it is not needed:** reading each
kit text, **no unit is a genuine class-3** (event + rate-limit). The two damage lines that carried
event-proxy triggers (helm-aquamarine `hitCount:30`) turned out to have **no "Activates when…" clause
at all** → they are class-1 pure timers, not gated events. So the missing per-block cooldown-gate
mechanism has no consumer; leave it unbuilt (byte-identical, no dead schema).

- **✅ helm-aquamarine — LANDED (class 1).** skill2 105.58% line: `hitCount:30` → `{interval:4}` from the
  datamined CD. This RESOLVES the override's own flagged ⚑TOP (the note called `hitCount:30` an "invented
  proxy… pure guess" borrowed from skill1's genuine 30-normal trigger). Solo total 51.499M→50.142M
  (−2.6%, over-firing proxy → true 4s cadence). **MODEL_ONLY** (she is in no graded comp; regression
  byte-identical). Note + caveats updated. ⚑ first-fire phase (t=4 vs t=0) left unpinned.
- **✅ isabel — RE-ENCODED (owner-corrected).** Datamine confirms S2 "Pointed Feather" is a SINGLE hit on
  the 15s CD — NOT a DoT (her only "45 sec" values are S1's three Marked-Target BUFFs: crit rate / crit
  dmg / ATK, gated on burst). The override had faked the periodic hit with a `dot intervalSec:14.7` device.
  Re-encoded faithfully: `passive flatDamage 170.58` (t=0) + `interval:15 flatDamage 170.58` (t=15…165) =
  12 hits/180s. **Behavior-identical** (solo A/B crit-off: 2.4610M / 12 hits / same per-hit), just correctly
  labeled. First-fire phase is load-bearing: `interval:15` alone (first t=15) = 11 hits (the 12th at
  t=180.000, the excluded final frame); the t=0 battle-start hit reproduces the measured 12.
- **⏳ snow-white / prika / liter / takina — no change (inert).** snow-white already `interval:15`
  (template). prika CD 0 = fires freely (class 5). liter S2 = heal, damage-inert at scope. takina S2 =
  continuous `passive` buffs (no durationSec → never lapse); CD 15 = refresh interval, inert.

### ✅ Data-provenance conflicts — OWNER-RULED + LANDED (2026-07-20)

The new `skillCooldownsSec.skill2 = 30` on two units conflicted with deliberate prior modeling. Owner ruled
**the datamined CD is real** for both, and set the first-fire convention: **a "force-cast" skill fires at
t=0; a normal CD skill waits its first CD (t=CD).**

- **rosanna-chic-ocean — LANDED.** S2 DoT `passive dur999` (continuous) → `{interval, sec:30}` + `dot dur15`.
  No force-cast → first fire **t=30**; windows [30-45]…[150-165] = 5×15 = 75s (was 180s). Solo
  41.763M→34.472M (−17.5%). The S2 parts buff moves to interval:30 too (inert vs partless boss). MODEL_ONLY.
- **sakura-bloom-in-summer — LANDED.** S1 "Forcefully uses Skill 2" → first fire **t=0**, re-casts every 30s
  = 6×15s (90s). Sakura Petals DoT = passive dur15 (t=0) + interval:30 dur15 (re-casts). Dancing Flower AD
  buff stays time-averaged (passive buffs are always-on) 1.30→7.82 (15.64×90/180). Solo 40.165M→67.494M
  (+68%). MODEL_ONLY. Her note's earlier "datamine has NO S2 CD" claim is superseded by the wiki-matched CD.

### Burst-CD cross-check (roster sweep) — 2 divergences, both owner-ruled

`skillCooldownsSec.burst` vs `burstCooldownSec` disagree on exactly two units (both already modeled via
`burstCooldownSec`; the `.burst` field is unconsumed, so no double-model risk — a data-quality signal):

- **bready** `.burst=20` vs `burstCooldownSec=40` — **owner: 40s is correct.** `.burst=20` is the wrong
  source; `burstCooldownSec=40` (engine) already right. No change.
- **quiry** `.burst=40` vs `burstCooldownSec=60` — **owner: 40s is correct**, `burstCooldownSec=60` is
  WRONG. ⇒ **OPEN: data-source fix at bakery-bot/sync** (would change quiry's burst rotation; NOT hand-patched
  in characters.json here — needs the proper synced correction + a rotation A/B when it lands).

### Follow-up audit — dots masquerading as periodic single hits (2026-07-20, findings-only)

Prompted by the isabel fix: scanned all 75 overrides for `dot` effects with `intervalSec > 1` (a genuine
DoT ticks every 1 s; anything larger is a periodic single hit wearing the `dot` schema). Seven matched.
**Net: nothing enacted — the two that looked like behavior-neutral cleanups both turned out unsafe, and
the rest are either faithful or measurement-gated.**

**⚙️ ENGINE LESSON (why the "cosmetic" swaps aren't cosmetic):** a `dot` and a `flatDamage` are NOT
interchangeable even for one periodic hit. They diverge on (a) **crit default** — `flatDamage` defaults
`crit:true` (skill "additional damage" crits at sheet rate, U1) while a flavor-less `dot` is non-crit; and
(b) **within-frame FB ordering** — interval blocks fire at the top of the frame (sim.ts:1874), dot ticks
near the end (sim.ts:2271), so at a Full-Burst window boundary the two see different FB state and the +50%
overlap differs. Both are invisible SOLO (no FB, crit matched) but real in a team. ⇒ **a dot→interval+
flatDamage re-encode is only byte-safe for a MODEL_ONLY unit** (isabel qualified — solo-identical). For a
GRADED unit it is a board-moving change requiring the gated path.

**Attempted "behavior-neutral" cleanups — NEITHER safe to land:**

- **ein** skill2 `atk=0` dot — NOT dead code. Her note documents it as the **Orb-Gauge emitter** (560
  energy every ~2.83 s to the team, via the `skillGauge` call each dot tick fires regardless of damage).
  Removing it is byte-identical only SOLO (ein can't solo-burst); in a team it would cut her gauge
  generation. **Leave as-is (working as intended).**
- **cinderella-crystal-wave** skill1 "Activates **every 5 sec** → 900%" — genuinely a periodic single hit
  dressed as `dot iv=5 dur=100000`, but re-encoding to `interval:5 + flatDamage` is **NOT board-safe**:
  byte-identical solo, but drifts on graded comps (**−1.25% on T5-wind-weak, −0.06% on standard-hc —
  comp-dependent**, per the engine lesson above). **Reverted; not landed.** ALSO surfaces an open
  faithfulness question the dot was hiding: **should this every-5s hit CRIT?** U1 says skill additional-
  damage crits by default; the dot silently suppressed it → possible **~+3.5% under-credit** (`crit:true`
  measured +3.47% on this graded unit). Both the re-encode and the crit question need the gated path
  (Fable + full-board A/B + snapshot + owner) — not a mid-sweep edit.

**Event-cadence PROXY dots (an _estimated_ interval standing in for a kit event — the hit count can be
materially wrong, same failure mode as helm-aquamarine's old `hitCount:30`):**

- **elegg-boom-and-shock** skill2 — kit "_when a ghost is captured while at max ghost capacity_ → 1100%"
  modeled as `dot iv=6 dur=102`; the 6 s / 102 s are UNMEASURED cadence estimates. ⚠ **elegg is GRADED**
  (regression snapshot), so this drives a board number. Needs a recording of the ghost-capture cadence.
- **privaty** skill2 — kit "_when the last bullet hits a Designated Target_ → 1687%" modeled as
  `dot iv=3 dur=10` on burst; iv=3 is an unmeasured last-bullet-cadence estimate. ⚑.

**Kit-faithful periodic dots (kit explicitly says "every N sec") — no action:** `ada` skill2 and
`milk-blooming-bunny` skill2 both say _"every 2 sec"_ in-kit, so `dot iv=2` is faithful.

## The methodology precedent (snow-white)

`snow-white` S2a "144.73% enemies within range" has NO activation clause in its kit text (a pure internal
timer). It is now `{kind:'interval', sec:15}` — fires every 15 s of battle, first at t=15 s. The datamined
CD `skillCooldownsSec.skill2 = 15` **confirms** the owner-stated 15 s. This is the clean case. Most other
CDs are NOT this simple (see the taxonomy).

## ⚠ The core insight: a CD is NOT always an `interval` trigger

The CD value is **true** — the remaining judgment is NOT whether to trust it, but WHICH encoding mechanism
carries it. A cooldown is the **minimum time between activations**; how it maps to an encoding depends on the
skill's **activation shape** (from the kit text), which the CD number alone does not tell you. Read the kit
text per unit, classify, then wire the true CD in via the matching mechanism:

| Class                     | Kit shape                                                                     | CD meaning                      | Encoding                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Pure timer**         | no "Activates when…" clause (damage that "just happens")                      | the firing interval             | `{kind:'interval', sec:CD}` — the snow-white template                                                                                                                                                |
| **2. Periodic DoT/hit**   | a recurring self-hit modeled as a `dot`                                       | the tick period                 | validate `dot.intervalSec` **==** CD; correct if they disagree                                                                                                                                       |
| **3. Event + rate-limit** | "Activates when <event>" (hitCount / fullBurstEnter / lastBullet / burstCast) | a FLOOR between fires           | keep the event trigger; add a **cooldown GATE** (min frames between activations). Inert when the event is already rarer than CD; MATERIAL when the event fires faster than CD (the proxy over-fires) |
| **4. Passive buff w/ CD** | "continuously" buff carrying a CD                                             | re-application/refresh interval | usually inert if `durationSec ≥ CD`; else the buff can lapse between refreshes                                                                                                                       |
| **5. CD = 0**             | instant / no gate                                                             | fires freely                    | leave the event trigger as-is (no gate)                                                                                                                                                              |

**The engine gap:** the `interval` trigger (class 1) EXISTS. A per-block **cooldown gate** (class 3 — event
trigger + "can't re-fire for N sec") does NOT exist yet. Grep confirms no `lastFired`/`cdFrame` per-block
concept (`mgCooldown` is MG-round pacing, unrelated; `burstCooldownSec` is burst-rotation only). If any
class-3 unit needs it, build a small `cooldownSec?: number` on `Block` gated in `applyBlock` against a
per-(unit,block) last-fire frame — mirrors `everyN`'s activation-counter plumbing.

## First-fire phase ⚑ (unresolved convention)

`interval` fires first at **t = sec** (engine convention; see `types.ts` trigger comment). Whether the real
first proc is at t=0 or t=CD is **unmeasured** — worth ~1 proc over 180 s. Pin per consumer from footage
(recipe: time the first popup of that skill's signature value). Same ⚑ applies to a cooldown gate's initial
availability (available at t=0 vs after one CD).

## Per-unit worklist

**Overridden units WITH a non-null skill-1/2 CD (8) — reconcile each against its current encoding:**

| slug                     | s1   | s2  | current skill2 trigger                   | first read                                                                                                                                                                                                                                                                    |
| ------------------------ | ---- | --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `snow-white`             | null | 15  | `interval 15` ✅                         | DONE (the template)                                                                                                                                                                                                                                                           |
| `isabel`                 | null | 15  | `passive` `dot` intervalSec **14.7**     | **CLASS 2**: her hand-measured DoT period 14.7 sits within 2% of the true CD 15 — a nice corroboration that the field is right. Since the CD is true, **snap intervalSec 14.7 → 15** (the 14.7 was a slightly-off frame count; the CD is the ground truth it was estimating). |
| `helm-aquamarine`        | null | 4   | `hitCount 30` `flatDamage`               | CLASS 3 suspect: 30 AR hits ≈ 2.5 s at ~12/s vs CD 4 s → the proxy likely OVER-fires. Read kit text: pure timer (→ interval 4) or event+gate?                                                                                                                                 |
| `liter`                  | null | 15  | `fullBurstEnter` `heal`                  | CLASS 3/4: FB recurs ~14 s ≈ CD 15 → near-inert; confirm the heal is FB-gated not free. Heal is damage-inert at scope anyway.                                                                                                                                                 |
| `takina`                 | null | 15  | `passive` buffs (damageTaken/trueDamage) | CLASS 4: continuous buffs; CD 15 = refresh interval, likely inert if buffs persist. Verify no lapse.                                                                                                                                                                          |
| `rosanna-chic-ocean`     | null | 30  | `passive` buff + `dot`                   | CLASS 2/4: is CD 30 the dot period or a buff refresh? Reconcile dot.intervalSec.                                                                                                                                                                                              |
| `sakura-bloom-in-summer` | null | 30  | `passive` buff + `dot`                   | CLASS 2/4: same question as rosanna.                                                                                                                                                                                                                                          |
| `prika`                  | 0    | 0   | `fullBurstEnter`/`burstCast` buffs       | CLASS 5: CD 0 = no gate, fires freely — current encoding already correct; no change.                                                                                                                                                                                          |

**Overridden units with ABSENT (unknown) cooldowns (3):** `helm`, `laplace`, `mari` — cannot act until
bakery-bot wiki-matches them (field stays omitted). Do NOT invent CDs; leave the current proxy encodings.

**Data-source conflict flag (owner attention):** `bready` has `skillCooldownsSec.burst = 20` vs
`burstCooldownSec = 40` — TWO datamined game-data sources that disagree, so this is a data-provenance
question, not a modeling one. Burst CD is already modeled via `burstCooldownSec` (engine `burstCdFrames`,
sim.ts:1974), so `.burst` is otherwise a redundant cross-check of it — which makes this divergence a useful
free data-quality signal. Surface it to the owner to reconcile at the SOURCE (which pipeline is right for
bready's burst), and sweep the rest of the roster for the same `skillCooldownsSec.burst` vs `burstCooldownSec`
divergence while you're there. Do NOT silently pick one.

## Corroboration (the CDs agree with what we independently measured)

Not "validation" — the CDs are treated as true regardless. These just show the data is internally
consistent with prior measurements, so wiring it in should only ever CONFIRM or gently CORRECT existing
encodings, never contradict reality:

- `snow-white` S2 = 15 matches the owner-stated cooldown.
- `isabel` hand-measured DoT period 14.7 ≈ true CD 15 (the measurement was estimating the true value).
- `modernia {null,null,40}` — both skills passive, burst 40 = her `burstCooldownSec`. Consistent.

## Recommended order + gates

1. **Audit pass (findings-only, no edits):** for each of the 8 CD units, read the kit text, classify (table
   above), and record whether the current proxy trigger AGREES with the CD or over/under-fires. Batch the
   findings — do not enact mid-audit (batch-and-stop). Most will be inert (event rarer than CD, or damage-inert
   buffs); the material ones are the class-3 over-firing damage lines (helm-aquamarine the prime suspect).
2. **Build the cooldown-gate primitive** ONLY if the audit finds a class-3 unit whose proxy materially
   over-fires (`Block.cooldownSec` + a per-block last-fire gate). Opt-in, default-absent → byte-identical.
3. **Per-unit enactment** (scientific-method harness each): premise-gate the kit-text classification → Fable
   pre-op → isolated A/B (board unit) or MODEL_ONLY note → `verify.sh` + snapshot. Never tune the CD to a
   board number; the CD is datamined truth (measured > fudge). Pin the first-fire phase from footage where a
   consumer's cadence is popup-read.
4. **Burst-CD cross-check** (cheap): sweep `skillCooldownsSec.burst` vs `burstCooldownSec`; fix data
   mismatches (bready) at the source, don't double-model.

## Cross-references

- `src/skills/types.ts` — `{kind:'interval', sec}` trigger (the class-1 primitive) + `Block` gates
  (`everyN`/`fbGate`/… the plumbing pattern a `cooldownSec` gate would mirror).
- `src/engine/sim.ts` — interval firing loop (search `intervalBlocks`); `applyBlock` (where a cooldown gate
  slots in, alongside the `everyN` activation counter); `burstCdFrames` (burst CD, already modeled).
- `src/types.ts` / `src/data/sync.ts` — the `skillCooldownsSec` contract + landing.
- `docs/DECISIONS.md` (2026-07-20) — snow-white delayed-cannon + the interval-trigger precedent.
- `docs/data/game-mechanics.md` — the trigger vocabulary (add `interval` + any cooldown-gate here via
  `/mechanics-doc-upkeep` when enacted).
