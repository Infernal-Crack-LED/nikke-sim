# Shotgun auto-aim core-hit rate versus range — community/datamine research

Purpose: resolve whether the shotgun "near" core-pellet fraction we measured from the Drake
solo recording (~0.072, flagged a lower bound) understates the true point-blank / front-row
value. The video cannot reach the true extreme-near regime, so this note gathers the
community and datamine evidence for shotgun core-hit rate as a function of distance and
accuracy, and proposes a curve.

Evidence tiers used here (see docs/CONVENTIONS.md): **COMMUNITY** = independently reported by
one or more community testers; **DATAMINED** = from extracted game tables. No number below is
DATAMINED — all are COMMUNITY measurements.

---

## Bottom line first

- The strongest source (ore-game verify-memo) reports shotgun core-hit rate of **~6% at the
  front row** (the shotgun's proper/effective distance), ~1.6% mid row, ~0% back row — measured
  in auto mode on the practice-range boss at base accuracy.
- Our own video measurement of **~0.072 (7.2%) near** sits *at or slightly above* that number.
  Two independent auto-mode base-accuracy measurements therefore converge at roughly **6–8%**
  for the front-row / near regime.
- **No source supports a point-blank value of 15–30% at base accuracy.** The high core-hit
  rates that do exist in the community record (40%–90%) all require heavy accuracy-stat
  investment (75%–85% accuracy), which is not our validation condition (base gear, no cube, no
  accuracy buffs).
- Correction to our own notes: docs/closed/range-dependent-core-model.md and docs/open-questions.md
  cite ore-game verify-memo as "**~100% front row**." That is a transcription error. The
  verify-memo actually says **~6%** front row. The 1.6% mid / ~0% back figures we cite are
  correct; the front-row figure is off by more than an order of magnitude.

Recommendation: the evidence does **not** justify raising the 0.072 near value. If anything it
corroborates that 6–8% is the correct order of magnitude for base-accuracy shotgun cores at
front row. See "Implication for the cold-SG problem" below for where to look instead.

---

## Sources

### 1. ore-game.com — verify-memo (JP) — STRONGEST LEAD, tier COMMUNITY
URL: https://ore-game.com/nikke/post/verify-memo/

Shotgun core-hit rate by enemy row, measured on the practice-range boss in auto mode:
- Front row (前列, the shotgun's 適性 / effective distance): **"約6％くらい"** — approximately **6%**
- Middle row (中列): **"約1.6％くらい"** — approximately **1.6%**
- Back row (後列): **"約0％くらい"** — approximately **0%**

The author flags their own methodology as rough ("ちょっと検証の仕方を考えんとなー" — "I need to
rethink how I verify this"), so this front-row 6% is itself likely a soft/low estimate for the
same reason ours is (red core numbers are hard to read). Shotgun fires **10 pellets** (10発),
each pellet dealing 1/5 of the base calculation. The memo also notes that in its firepower
rankings SR/RL/MG dominate, consistent with shotguns having structurally low core probability.

This is the exact source our notes meant to cite. Its real front-row number is ~6%, not the
~100% currently written in our docs.

### 2. note.com — _TricK_ "命中率の検証をちゃんとやる話" (JP) — tier COMMUNITY
URL: https://note.com/_trick_/n/n6efe08af53e8

Auto-aim reticle / accuracy study on shotguns:
- **Auto mode enlarges the reticle** vs manual. Linear fits of reticle *diameter* (px) vs
  accuracy %: manual `y = -1.40x + 140`, auto `y = -1.45x + 170`.
- **Reticle floor:** "命中率を100%にしても半径12.5ピクセル程度のレティクルになってしまう" — even at
  100% accuracy the auto reticle bottoms out at ~**12.5 px radius**, which is why "命中率100%
  なのにコアヒットしていない" (100% accuracy still fails to core-hit in auto).
- **Auto-aim penalty:** "ワーストで20%、ベストで18%相当の命中率ロス" — auto mode costs the
  equivalent of **~18–20% accuracy** vs manual, from the enlarged reticle baseline.

Relevance: we play in auto/scope-lock. The 12.5 px auto reticle floor structurally caps
shotgun core rate below what a manual player (or a raw single-shot weapon) would achieve, and it
does so *regardless of distance*. This is the mechanism behind a low SG core ceiling.

### 3. note.com — tt00771 "武器別考察 ショットガン編" (JP) — tier COMMUNITY
URL: https://note.com/tt00771/n/n7b6204613ade

Shotgun accuracy thresholds (how many of 10 pellets connect):
- **52% accuracy:** "大型の敵やボスの部位にはほぼ全段命中" — nearly all pellets hit large enemies /
  boss *parts*.
- **74% accuracy:** "雑魚にも大体全段命中" — nearly all pellets hit even small enemies.
- **88% accuracy:** "ボスのコアにも8発くらいは命中" — about **8 of 10 pellets hit the boss core**.
- Shotgun = 10 pellets/shot at 1.5 shots/s.

Relevance: the *only* way to get shotgun cores near saturation (8/10) is **88% accuracy** — a
heavily-buffed condition. At base accuracy (our validation), you are far down this curve, which
is consistent with the ~6% front-row figure.

### 4. arca.live — "명중의 모든 것을 알려주겠다" (KR) — tier COMMUNITY
URL: https://arca.live/b/nikketgv/96243965 (post 96243965)
(Page returns HTTP 403 to the fetcher; numbers below are from the indexed summary and the
task's prior notes, cross-checked against source 3.)

- Shotgun spread *diameter* vs accuracy: `y = -2.18x + 240` px (2.18 px narrower per +1% acc).
  At 85% accuracy → ~55 px spread.
- **Core-hit rate vs accuracy stat** (measured mid-range, on a large part / arm, Blacksmith
  dungeon): **~40% core at 75.6% accuracy**, **~90% core at ~85% accuracy**.
- Base shotgun accuracy is described as very low ("abysmal", excluding Maid Privaty per
  nikke.gg), and AR is "realistically the only weapon class that benefits from accuracy" in
  normal play.

Relevance: confirms core-hit rate is driven primarily by the **accuracy stat**, and that the
40–90% figures are high-accuracy points, not base-accuracy. Also note these were measured on a
*large* arm/part, not a small core (see source 5 and the small-core caveat).

### 5. nikke.gg — Weapon guide / FAQ / Damage formula (EN) — tier COMMUNITY
URLs: https://nikke.gg/nikke-goddess-of-victory-weapon-guide/,
https://nikke.gg/frequently-asked-questions/, https://nikke.gg/damage-formula/

- Shotgun **effective range is 0–25**. Even at range 0, against a *regular* enemy a shotgun hits
  only **7–10 pellets (≈8.5 avg)**; this drops sharply outside 0–25 and can fall below 1
  pellet/shot beyond range ~35 against small targets. Against **large bosses they hit all 10
  pellets consistently.**
- "Base hit rate for shotguns are abysmal (excluding Maid Privaty)."
- Hit rate reduces bullet spread, "most effective for shotguns," and increases core-hit
  likelihood for SG/SMG/AR/MG.

Relevance: distinguishes **pellet hit count** (how many of 10 land on the body) from **core
rate** (how many land on the small core). At near range a shotgun lands ~all 10 pellets on a big
boss body, but only a small fraction on the core — the two are different quantities.

---

## Synthesis — proposed shotgun core-rate-vs-range curve

All values assume **auto mode, base accuracy, no accuracy buffs** (our scope-lock validation
condition), against a large boss.

| Range band | Proposed core-pellet fraction | Basis | Tier | Confidence |
|---|---|---|---|---|
| Extreme-near / point-blank (0–~10) | ~0.06–0.09 (**not distinctly higher** than near) | ore-game front-row 6%; our video 7.2% | COMMUNITY | Medium |
| Near / front-row (~10–25, effective range) | ~0.06–0.08 | ore-game 6%; our video 7.2% | COMMUNITY | Medium-high (two independent measurements converge) |
| Mid | ~0.016 | ore-game 1.6%; our video ~0.0045 | COMMUNITY | Medium |
| Mid-far / far | ~0 | ore-game ~0%; our video ~0–0.0045 | COMMUNITY | High |

**Shape:** steep, effectively a near-only step. ore-game's 6% → 1.6% → 0% across front/mid/back
is a sharp decay tied to the 0–25 effective-range window, not a gentle continuous falloff.
Modeling it as a near-heavy step (as our band table does) is well-supported; a smooth
distance→core curve is not needed and is not what the sources describe.

**Is point-blank distinct from our "near"?** For shotguns, *no* meaningful distinct
higher-core regime is evidenced. The shotgun's effective range is 0–25; the practice-range
"front row" *is* that point-blank regime, and it measures ~6%. There is no source showing a
separate 0–10 px window with materially higher core rate at base accuracy. The auto-aim 12.5 px
reticle floor (source 2) is the structural reason: even at perfect accuracy the auto reticle
never collapses to a point, so a 10-pellet spread cannot concentrate on a small core.

---

## Answers to the key questions

1. **True point-blank SG core rate?** ~6–8% at base accuracy (ore-game 6%, our video 7.2%). It
   is **not** 15–30%. Reaching high core rates (40–90%) requires 75–88% accuracy — a
   heavily-buffed state, not our validation condition.

2. **Continuous vs sharp step?** Sharp, near-only step tied to the 0–25 effective range.
   6%→1.6%→0% across front/mid/back. A near-heavy step model is the right shape.

3. **Does 10-pellet spread cap SG core below single-shot weapons regardless of range?** Yes.
   One aim point + 10-pellet spread + a 12.5 px auto reticle floor means only a fraction of
   pellets can land on a small core even at point-blank. This is exactly why our AR measured
   ~0.40 near vs SG ~0.072 — an order of magnitude — and that gap is **consistent** with the
   community understanding (SG base hit rate "abysmal"; SG needs 88% accuracy to core-saturate;
   AR is the class that actually benefits from accuracy). The gap is a real structural property,
   not a measurement artifact.

4. **Small central core (spider-mech boss)?** No source addresses our specific raid boss. But
   the relevant community core measurements (arca 40–90%, tt00771 8/10) were taken on **large
   parts / arms / big cores**. A *smaller* core is *harder* to hit, so it pushes core rate
   **down**, not up. This argues our small-core boss should sit at or below the community
   large-boss front-row figure — i.e. against raising 0.072.

---

## Recommendation on the 0.072 lower bound

**Do not raise it on this evidence.** The best independent source (ore-game 6%) sits *below*
our 7.2%, the accuracy needed for higher core rates is absent under scope lock, the auto reticle
floor structurally caps SG cores, and our small central core should if anything be lower than
the large-boss community numbers. The "lower bound" flag is real (red-core legibility), but the
external evidence bounds the true value from *above* near ~6–8%, not toward 15–30%. Raising
0.072 would likely over-credit SG cores.

## Implication for the cold-SG problem (hypothesis, not a fix)

If applying 0.072 made SG run cold (per-weapon mean 1.106→0.755), the near core rate is probably
**not** the culprit, since 0.072 already matches the community front-row figure. More likely
candidates, for the engine owner to investigate (out of scope here):
- **Non-core pellet (body) hit-rate at near range.** nikke.gg: at range 0–25 a shotgun lands
  ~all 10 pellets on a large boss *body*. If the model under-credits full-pellet body hits in
  the near band, SG goes cold independently of core rate.
- **Band time allocation** — how much of the fight the boss actually spends inside 0–25 vs the
  bands the model assigns.
- **Mid/far bands** possibly too low relative to ore-game's 1.6% mid.

## Caveats
- Everything here is COMMUNITY tier; nothing is DATAMINED. No extracted core-rate-vs-distance
  table was found.
- ore-game's front-row 6% is self-flagged as rough and was measured on the practice-range boss,
  not a raid boss.
- arca (source 4) could not be fetched directly (403); its formula and 40/90% points are from
  the search index and prior notes, but they are internally consistent with sources 2 and 3.
- Accuracy-stat effects dominate core rate; all proposed values are pinned to *base accuracy*.
  Any in-team accuracy buff (e.g. a Maid Privaty / accuracy-buffer) would raise these materially
  and would need separate handling.
