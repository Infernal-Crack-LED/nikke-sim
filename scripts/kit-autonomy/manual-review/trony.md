# Manual review — trony (Trony)

**Gauntlet date:** 2026-08-04
**Verdict:** NO-GO(engine-core)
**Faithfulness:** n/a (no faithful override is landable on the current engine)
**Tier:** 2 (windowed %-of-damage accumulator with cap + burst-modulated collection rate + distributed release; sole roster carrier of the Cumulative Damage Skill)

> Slug disambiguation: `trony` is unique (S0 lint clean, no AMBIGUOUS). SR / Attacker / Fire /
> Burst III, cd 40s, ammo 6, chargeFrames 60, chargeMultiplier 250%, normalMult 69.04, coreMult
> 200%. Missilis, released 2024-05-16. First modeling attempt — no prior override, no kit-status
> row, `simSupported:false` (left as-is by this run).

## Kit summary

Trony is a Fire SR attacker whose sustained-damage identity is a planted bomb. Her S1 ("T.Rony
Bomber") applies a **Cumulative Damage Skill** state to the nearest enemy not already bombed
whenever her Full Charge lands: for 5 sec the bomb accumulates **50% of Trony's ATK damage**, up to
a maximum of **1536% of her final ATK**, and upon reaching the cap it explodes as **Distributed
Damage** to enemies within attack range. Her S2 ("Efficiency Increase") is a full-charge counter
pair: every 5th full-charge ATTACK grants herself +51.84% Distributed Damage for 10s (a bucket only
her bomb explosion can hit), and every 5th full-charge HIT drops the target's DEF by 9.59% for 10s.
Her burst ("Mega T.Rony", B3) grants herself +101.37% ATK for 10s and raises the bomb's collection
ratio by +62.83pp for 10s (50% → 112.83%).

## Line-by-line

| Line                                                                                     | Disposition                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1-L1: FC hit → plant T.Rony Bomber on nearest unbombed enemy, active 5 sec              | BLOCKER (part of the accumulator)  | The plant itself is expressible (`targetStatus 'T.Rony Bomber' 5s`) but is only meaningful as the carrier of the accumulator state; alone it moves no damage. Re-application is blocked while any enemy is bombed, so on the single-boss basis a fresh cycle starts only after the previous bomb ends.                                                                                                                       |
| S1-L2: bomb accumulates 50% of the skill user's ATK damage during the window             | **BLOCKER (missing primitive)**    | **The reason for NO-GO(engine-core).** See below.                                                                                                                                                                                                                                                                                                                                                                              |
| S1-L3: maximum accumulated damage = 1536% of final ATK; upon reaching cap, explode, end  | BLOCKER (missing primitive)        | Cap-vs-final-ATK + release-on-cap semantics; no accumulator state exists to hold or release the value.                                                                                                                                                                                                                                                                                                                         |
| S1-L4: explosion deals Distributed Damage to enemies within attack range                 | BLOCKER (parasitic)                | The distributed channel itself exists (a first-class formula bucket, `docs/data/game-mechanics.md:41`; `flavor:'distributed'`), and "enemies within attack range" collapses to the one boss — distributed deals the same TOTAL vs 1 target as vs many (game-mechanics.md:378; standard multi-target collapse precedent). What is missing is the explosion's SOURCE: the accumulated value.                                      |
| S2-L1: every 5th full-charge attack → self Distributed Damage ▲51.84% / 10s              | MODELABLE, INERT (parasitic)       | Trigger expressible (`chargeCounter count:5` → self `distributedDamagePct 51.84 /10s`). The stat boosts only distributed hits, and Trony's ONLY distributed hit is the (unmodelable) bomb explosion → inert until the accumulator exists.                                                                                                                                                                                     |
| S2-L2: every 5th full-charge hit → target DEF ▼9.59% / 10s                               | UNMODELED (inert, no channel)      | `defPct` has no engine wiring (types.ts: "inert in v1"; zero `defPct` branches in sim.ts), and boss DEF is a flat `cfg.bossDef` subtraction with no debuff channel. Damage-inert on the current engine; verbatim-recorded, not silently dropped. (Attack-vs-hit trigger nuance is moot while the effect is inexpressible.)                                                                                                   |
| Burst-L1: self ATK ▲101.37% / 10s                                                        | MODELABLE (FAITHFUL)               | `burstCast` → self → `atkPct 101.37 /10s`. The only line with standalone damage expression.                                                                                                                                                                                                                                                                                                                                    |
| Burst-L2: Cumulative Damage Skill accumulated damage ratio ▲62.83% / 10s                 | BLOCKER (parasitic)                | A buff to the bomb's 50% collection rate (→ 112.83% during the window); meaningless without the accumulator it modifies.                                                                                                                                                                                                                                                                                                       |

## The blocker — S1's windowed damage accumulator

The bomb needs three coupled capabilities, none present:

1. **%-of-damage-dealt collection into a state.** The closest engine facility, `hitRepeat` (landed
   2026-08-03 for emilia's "%-of-hit repeat"), proves the plumbing exists — the parent hit's FINAL
   damage now reaches the landing path in `dealDamage` — but it mirrors INSTANTLY as a separate
   hit. Trony needs the fraction COLLECTED into a persistent per-target state over a 5s window.
2. **A cap against % of the owner's FINAL ATK, checked against the running total.** `storedHit`
   accumulates too, but CHARGES (hit counts), not damage, and releases them all as hits when Full
   Burst begins — wrong resource, wrong release event, no cap.
3. **Release of the accumulated total as one distributed hit** (on cap reached), to enemies within
   attack range.

**Why the dorothy-Brand at-cap idiom does NOT save this unit.** Dorothy's Brand is the same
mechanic family (accumulate damage dealt over a window, cap at % of final ATK, re-deal as
Distributed), and her override expresses it faithfully as `flatDamage 8900.83 distributed
delaySec:10` because **the cap binds with ~11× headroom in any realistic comp** — the release is a
constant. Trony's numbers admit no such regime. Per bomb cycle she collects 50% of ~2 full charges
(her FC cycle is ~2.5–3s: 1s charge + shot, 6 ammo, 141f reload; the 5s window covers ≈ 2 FCs).
Each FC lands ≈ 2.5 (charge) × ~1.2 (crit EV, sheet 15%/150%) × ~1.25 (FB-major average) × 1.1
(element) × ~1.3 (range) × team Damage-Up ≈ 5.4–9.8× her final ATK, so a cycle accumulates ≈
**540–980% of final ATK — below the 1536% cap** outside her burst window. WITH the burst's +62.83pp
ratio buff the collection is ×2.257 → ≈ 1220–2210% → the cap binds **only in buffed windows**. The
cap-binding is thus burst-state- AND comp-dependent: a static `flatDamage 1536` over-credits every
sub-cap cycle by ~1.6–2.8×, and any sub-cap static magnitude is a fabricated fit value. Neither is
faithful, and the unresolved release-pipeline question (does the exploded total re-run
crit/Damage-Up/FB or land raw — dorothy Brand ⚑(b)) sits on top.

**Load-bearing and in-domain.** The bomb is effectively continuous (a fresh plant on the next FC
hit after each explosion/expiry; the 5s window ≥ her FC cycle): min(collection, cap) ≈ 540–1536%
of final ATK delivered every ~2.5–5s — comfortably ≥ ~25% of her total damage in any realistic
comp, far outside any ±3% board band. It fires on every full-charge hit against the scope-lock
boss; omitting it is a forced weakening of her central damage dealer, not an honest omission.

**Why this is NO-GO(engine-core) and not a ⚑-tolerated GO:** S4 of the gauntlet procedure rules
_"a missing primitive blocking a LOAD-BEARING line → NO-GO(engine-core); inert/out-of-domain lines →
⚑/UNMODELED, not NO-GO."_ The contrast cases are `yulha` (Calm cannot trigger on the immortal-boss
basis → GO with UNMODELED is honest) and `dorothy` (Brand expressible at-cap → GO); Trony is
neither — the line fires every cycle and admits no constant-magnitude encoding.

## Recommendation

1. **Primary (the blocker):** a windowed damage-accumulator effect — e.g.
   `{ kind: 'damageAccumulator', name, durationSec, collectPct, capAtkPct }`: while the named state
   is live on the target, collect `collectPct` of the owner's dealt damage (thread the hitRepeat
   landing path in `dealDamage`, where the parent hit's final damage is already available), and
   when the running total reaches `capAtkPct` × owner final ATK, release it as ONE distributed hit
   to enemies within attack range (boss-collapse on the scope-lock basis) and end the state.
   `collectPct` must be BUFFABLE — Trony's burst-L2 rides it (+62.83pp). Trony's S1 then encodes as
   FC-hit trigger → enemy → `damageAccumulator {durationSec:5, collectPct:50, capAtkPct:1536}`;
   burst-L2 as a windowed `collectPct +62.83` buff; S2-L1 as `chargeCounter:5 → self →
   distributedDamagePct 51.84 /10s` (which goes live against the explosion).
2. **Open semantics to pin before/during the build (footage or owner ruling):** (a) release
   pipeline — re-run (crit/Damage-Up/FB) vs raw (dorothy Brand ⚑(b) is the same unresolved
   question); (b) expiry behavior when the 5s window lapses below cap (the text only names the
   cap-reached explosion); (c) collection scope — "50% of the skill user's ATK damage": all dealt
   damage or only ATK-source hits (function damage excluded?). A Trony probe reading the explosion
   popup against her concurrent damage resolves (a) and (b).
3. **Secondary (not blocking):** a boss-DEF-debuff channel for S2-L2 (DEF ▼9.59%) — minor damage
   mover; `defPct` is inert and `cfg.bossDef` is flat today.

With (1) in place, five of the eight lines go live (L1–L4 bomb, L5 distributed buff, L7 ATK, L8
ratio buff) and this unit should re-gauntlet to GO.

## Cross-family corroboration

Not run. NO-GO(engine-core) is determined directly from the kit text + a definitive engine grep +
the dorothy-Brand precedent contrast; the gauntlet procedure STOPs before blind dispatch for an
engine-core blocker, so the S2b/S5/S6/S7 cross-family dispatches (which exist to corroborate a GO)
were not spent (emilia precedent, commit 35f0f0f6). **Run note:** this gauntlet resumed after a
driver crash at S0; the crashed session's triage ("no accumulator/cap/flavored-repeat primitives")
was re-verified and corrected where over-broad — `everyN`/`chargeCounter` (flavored-repeat) and
`hitRepeat` (%-of-hit, landed 2026-08-03) DO exist; the load-bearing gap is the windowed
damage-accumulator itself.

## Residual flags for owner

1. **Engine primitive gap (the blocker).** Windowed %-of-damage accumulator with cap + distributed
   release. Trony is the SOLE roster carrier of the Cumulative Damage Skill (verified sweep of
   `data/characters.json` skills text — only `trony` matches), so the primitive is unit-scoped, not
   a universal prior — low blast radius to build, and the only path to this unit. The hitRepeat
   landing path (built for emilia) is the natural threading point.
2. **Bomb semantics (the three open questions above).** Release pipeline raw-vs-re-run, sub-cap
   expiry, and collection scope are not answerable from text alone; a probe recording resolves the
   first two.
3. **Boss DEF debuff channel.** S2-L2 has no expression today; inert. Would matter if a DEF-debuff
   primitive ever lands for other reasons.
4. **No partial override committed.** Deliberately did NOT author a subset override — a file with
   only the burst ATK line would read as a landed (gutted) unit. `simSupported` stays `false`; no
   kit-status row added. The full proposed encoding is recorded above so nothing is lost for the
   re-run.
