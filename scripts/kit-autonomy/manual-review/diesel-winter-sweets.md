# diesel-winter-sweets — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Diesel: Winter Sweets (`diesel-winter-sweets`) — Fire · RL · Attacker · Burst III · 40s CD · ammo 6 ·
reloadFrames 141 · chargeFrames 60 · chargeMultiplier 250 · hitsPerShot 1 · normalMult 61.3 / coreMult 200 ·
burstGaugePerShot 1.4 · critRate 15 / critDamage 150 · Elysion. **VARIANT** of base Diesel (`diesel`, MG/Wind) —
NOT the same unit (approved nicknames: dws / xdiesel / dieselws).

**Verdict:** 🟢 **GO** · faithfulness **1.0** (12 kit lines: 8 FAITHFUL + 4 DOCUMENTED_GAP; 0 GO-blocking gotchas) ·
**cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-5`; driver Qwen. Both blind
re-derivations converge with the driver; the opus S6 blind override reproduces the driver's encoding line-for-line on
every load-bearing damage line. The reconciling judge's JSON omitted the `verdict` field; it is set to **GO** from the
judge's explicit `verdictRationale` (begins "GO.", concludes the two ENGINE gotchas are documented and "not
GO-blocking") — see `results/diesel-winter-sweets.json → verdictFieldNote`.

**THE GAUNTLET MADE A REAL ENCODING CHANGE (a fidelity gain, per the judge).** The shipped parser-baseline encoded S1
**Intro-only** (hard-coded Sustained ▲60.19%). The 2026-07-16 kit-status finding had already CONFIRMED this was the
root cause of her 0.793 COLD (>15% error): in graded comp N5 (Privaty/SWHA alternate) she never reaches her burst slot
→ makes 0 bursts → stays in **Highlight** → the sustained tier must be **235.03%**, not 60.19%. The gauntlet revised S1
to model **both** tiers via `ownBurstGate` — the engine's _canonical encoding for this exact line_ (`src/skills/types.ts:368`:
"the inverse is diesel-winter-sweets' Highlight sustained ('notCast')"). Board ratio moved **0.79 → 0.88** toward 1.0
on re-sim, corroborating the fix.

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

- **S1 (Ah Ah, Mic Test)**
  - ■ Entering Full Burst for the first time AFTER using own Burst → self: **Intro** — Critical damage ▲20.28% continuously (cannot be removed; persists after revival).
  - ■ Entering Full Burst for the first time WITHOUT own Burst → self: **Highlight** — Critical damage ▲20.28% continuously (same value).
  - ■ Entering Full Burst, if in Intro status → self: Sustained damage ▲60.19% for 10 sec.
  - ■ Entering Full Burst, if in Highlight status → self: Sustained damage ▲235.03% for 10 sec.
- **S2 (I'm Gonna Sing Now!)**
  - ■ Ally/self destroys an enemy part → all allies (except self): Mute (immunity to Noise Pollution), stacks to 3.
  - ■ Ally/self destroys an enemy part → self: Sustained Damage ▲68.04% for 15 sec.
  - ■ Performing a Full Charge attack → self: Sustained Damage ▲318.14% for 3 sec, stacks up to 2.
  - ■ Entering Full Burst → the stage target: 63.33% of final ATK as sustained damage every 1s for 9 sec.
- **Burst (La La La ♬)**
  - ■ All enemies: Damage Taken ▲25.09% for 10 sec; plus 18.43% of final ATK as sustained damage every 1s for 9 sec.
  - ■ The stage target: 181.2% of final ATK as sustained damage every 1s for 9 sec.
  - ■ While in Highlight → all allies (except self): Noise Pollution — Hit Rate ▼100% for 1 sec.
  - ■ If in Highlight → all allies: Mute stacks ▼1.

**Intro/Highlight** is a once-per-battle status decided at the first Full Burst by whether she cast her own burst. Both
grant the same permanent +20.28% Critical Damage; they differ only in the 10s FB-entry sustained tier (60.19 vs 235.03).
She is a sustained-DoT attacker: **every damage line she owns is `sustained`-flavored**, and her kit is a
`sustainedDamagePct` amplifier feeding three DoT channels (S2 63.33%/s FB-entry; burst 18.43%/s all-enemies; burst
181.2%/s stage-target). Her RL normals are NOT sustained-flavored and receive none of it.

---

## 2. What the sim implements (FAITHFUL, 8 lines)

| Line                                            | Encoding                                                                     | Note                                                                                                                                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1 Intro/Highlight Crit Dmg +20.28% (permanent) | `fullBurstEnter → self → critDamagePct 20.28`, single ungated block          | Same value in both statuses; re-applied each FB but capped at maxStacks 1 → never stacks.                                                                                                                                |
| S1 Intro Sustained +60.19% / 10s                | `fullBurstEnter + ownBurstGate:'cast' → self → sustainedDamagePct 60.19`     | Fires on FBs she casts.                                                                                                                                                                                                  |
| S1 Highlight Sustained +235.03% / 10s           | `fullBurstEnter + ownBurstGate:'notCast' → self → sustainedDamagePct 235.03` | Fires on FBs she does NOT cast (comp N5). **The fix.**                                                                                                                                                                   |
| S2 Full-Charge Sustained +318.14% / 3s / ×2     | `shotFired → self → sustainedDamagePct 318.14, maxStacks 2`                  | RL fires every pull as a full charge (`firePull(charged=true)`), so `shotFired` ≡ "Full Charge attack". 636.28% at 2 stacks; the 3s window LAPSES across the ~3.35s reload+charge gap → stacks reset to 1 each magazine. |
| S2 FB-entry DoT 63.33%/s ×9s                    | `fullBurstEnter → enemy → dot 63.33, 9s, 1s, sustained`                      | Stage target = the single partless boss.                                                                                                                                                                                 |
| Burst Damage Taken +25.09% / 10s                | `burstCast → enemy → damageTakenPct 25.09`                                   | Boss-side debuff; team-wide amplifier.                                                                                                                                                                                   |
| Burst DoT 18.43%/s ×9s (all enemies)            | `burstCast → enemy → dot 18.43, 9s, 1s, sustained`                           | Additive with the 181.2 line on the solo boss (~199.63%/s combined).                                                                                                                                                     |
| Burst DoT 181.2%/s ×9s (stage target)           | `burstCast → enemy → dot 181.2, 9s, 1s, sustained`                           | NOT either/or with 18.43 — both hit the solo boss.                                                                                                                                                                       |

The sustained buffs feed ONLY sustained-flavored damage (the four DoT/tick channels) via `sustainedDamagePct`
(sim.ts:1412) — the driver's D-scope counterfactual proves her RL normal bucket is byte-identical with them removed
while her DoT total drops (the `attackDamagePct` misread is excluded).

---

## 3. Documented gaps (UNMODELED, 4 lines — verbatim in the override, no silent drops)

- **S2 Mute (Noise-Pollution immunity ×3, allies except self)** — defensive status-immunity counter; no schema primitive, and the part-destruction trigger cannot fire on the partless v1 boss.
- **S2 part-gated Sustained ▲68.04% / 15s** — real magnitude, but the part-destruction trigger never fires on the partless boss (test pins it ABSENT). Becomes live the moment destructible parts are modeled.
- **Burst Highlight Noise Pollution (ally Hit Rate ▼100% / 1s)** — engine-gap: `hitRatePct` drives the accuracy-circle radius `R(hr)=(K·scale/2)(1−hr/100)`, so −100 merely doubles the circle rather than "miss everything" — a different, smaller mechanic. Documented, not fudged (the judge confirmed the S6 blind's `hitRatePct −100` encoding is the less faithful option). Inert in the clean never-burst Highlight case (comp N5) because she never casts her burst there.
- **Burst Highlight Mute stacks ▼1** — no Mute pool exists to decrement (its only accrual source is part destruction).

---

## 4. Owner spot-checks (non-GO-blocking)

1. **VERIFY the "graded comps are clean" premise (gotcha 1 / flag1, med).** `ownBurstGate` is a PER-ROTATION gate, but
   the prose's "for the first time" is a once-per-battle LATCH; the engine has no latch primitive. The encoding is exact
   on both clean domains (always-burst ⇒ Intro every FB; never-burst comp N5 ⇒ Highlight every FB), but in a comp where
   she casts INTERMITTENTLY the tier flips per rotation (a ~4× swing on her whole sustained bucket). **Read the rotation
   log of every graded comp containing her and confirm she casts into ALL Full Bursts or NONE.** If any graded comp has
   her casting intermittently, the faithful fix is a once-per-battle latch primitive (snapshot `ownBurstGate` at the
   first `fullBurstEnter` and pin the disposition for the fight) — never a magnitude tweak.
2. **flag3 — RL cadence tuple (med).** chargeFrames 60 / reloadFrames 141 are unverified datamine; they set both her shot
   count and the 318.14 stack duty cycle. Recipe: a focus-video rounds/min + reload-gap read.
3. **Burst DoT first tick** lands pre-Full-Burst by the 22f rule while ticks 2–9 land inside it (default FB-by-landing
   timing; correctly carries no per-kit `noFb` without measurement).

---

## 5. Provenance

- Cross-family: S2b `claude-fable-5` (pre-op review) · S5/S6/S7 `claude-opus-5` (blind test-writer, blind override-writer, reconciling judge). Driver Qwen.
- Artifacts: `scripts/kit-autonomy/cross-family/diesel-winter-sweets/` (packets + results), `results/diesel-winter-sweets.json` (binding verdict), `results/diesel-winter-sweets-judge-packet.md`, `blind/diesel-winter-sweets.{test.ts,adapted.test.ts,override.json}`, `reviews/diesel-winter-sweets.{test-review.json,verify.txt}`.
- Driver test: `scripts/tests/units/diesel-winter-sweets.test.ts` — 27 assertions, all GREEN vs shipped (incl. the comp-dependence demonstration: sole-B3 → Intro only; two-B3 → Intro on her casts + Highlight on helm's, partitioning the FB entries).
- Blind test vs shipped: S1d passes UNMODIFIED (Highlight block exists, `ownBurstGate`-gated); one mechanical adaptation (per-fight → per-FB-entry mutual-exclusivity, reflecting the engine's per-rotation gate); adapted 17 passed / 0 failed / 2 GAP skips.
