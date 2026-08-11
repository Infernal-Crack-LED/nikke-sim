# 2026-08-10 — The Burst-Skill-Damage amps are LITERAL-ONLY (owner ruling enacted)

> Not a batch-6 unit sweep. This is the enactment of the owner ruling that answered batch 5's
> STOP-AND-SURFACE question — **"trina's amp is literal only"** — which turned out to have a
> much wider blast radius than the three carriers the batch-6 START-HERE doc anticipated.
> Batch 6's per-unit slice is still open; see §5.
>
> Slugs are exact and several are ambiguous base names: `anis` = RL/Iron, `elegg` = MG/Electric
> (`elegg-boom-and-shock` is listed separately), `eunhwa` = SR/Fire, `helm` = SR/Water Treasure,
> `ludmilla` = SMG/Water, `mica` = RL/Wind, `scarlet` = AR/Electric, `cinderella` = RL/Electric,
> `privaty` = AR/Water Treasure, `neon` = SG/Fire, `d` = SMG/Wind, `maiden` = SG/Electric,
> `mihara` = AR/Water, `milk` = SR/Water, `vesti` = RL/Water, `arcana` = RL/Electric,
> `anchor` = RL/Wind, `laplace-ultimate-hero` / `helm-aquamarine` / `privaty-unkind-maid` /
> `arcana-fortune-mate` / `delta-ninja-thief` / `rei-ayanami-tentative-name` /
> `vesti-tactical-upgrade` are the variants and are already unambiguous.

## 1. What the ruling settles, and what it does not

Both amps quote a string and amplify skills whose description contains it:

| amp                  | kit text                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `trina` Spread Roots | `Burst Skill damage of skills with "Affects all enemies" ▲ 435.6% for 5 sec.`                         |
| `jackal` burst       | `Burst Skill damage of skills with "Affects 1 enemy unit(s)" in the description ▲ 38.91% for 15 sec.` |

`jackal`'s "in the description" is explicit; `trina`'s is the same construction. The ruling is
applied to both, and the entry in `docs/DECISIONS.md` says so.

**It scopes, it does not overturn, the earlier same-day scope-string ruling.** That one answered
whether a non-literal clause counts as TARGETING THE BOSS — it does, and the damage still lands
on the boss. Whether it satisfies an amp that names a literal string is a different question,
which batch 5 flagged as conflated. `burstDesc` feeds nothing in the engine except these two
amps (`sim.ts` `dmgUp`, two reads), so a tag is exactly and only a claim of amp eligibility.

**It localizes the batch-5 refutation to one term.** Tagging `cinderella` ("Affects **random**
enemies") took her 0.893 COLD → 1.523 HOT, her three `trina` readings 0.94/0.96/1.01 →
1.91/2.55/2.60, and the real fights refused it. Of the three candidate wrong terms (scope,
additive Damage-Up placement, 435.6 magnitude), the ruling names SCOPE. The other two are
untouched and still unmeasured — the ⚑ on additive placement stands.

## 2. The instrument (committed, per constraint 9)

`scripts/census-burst-amp-scope.ts` — block-level, whitespace-normalized, reads the kit text
from `data/characters.json` (never override prose, per the `cocoa` false-positive lesson).

- `--all` every unit with a burst-slot damage line · `--check` exits 1 on an OVER-tag only.
- Splits the burst description on `■`, pairs each scope clause with whether **that block** deals
  damage, and resolves "Affects the same target(s)" to the preceding clause.
- Self-validated by `scripts/tests/census-burst-amp-scope.test.ts` (13 pins), which also carries
  the roster invariant and the explicit known-debt list.

It answers the census question a grep cannot: rule 4 of the batch-5 handoff says a carrier
census must check LINE + TRIGGER + GATE, and all three prior census methods had each failed
once. Here the gate is the clause the damage line sits under, which is why per-block attribution
was necessary — see §4.

## 3. Applied

**31 tag instances removed across 12 units** whose damage-block clause contains no literal:

| clause class                                       | units                                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| "Affects enemies within attack range"              | `anis`, `belorta`, `signal`                                                                        |
| "Affects [the] 10 enemy unit(s) with the highest…" | `ein`, `eunhwa`, `exia` (×2), `frima`, `ludmilla`                                                  |
| "Affects random enemy units…"                      | `elegg-boom-and-shock` (×19, both branches)                                                        |
| "Affects the enemy nearest to the crosshair"       | `elegg`                                                                                            |
| "Affects the enemy with the highest final ATK"     | `crow`                                                                                             |
| "Affects 1 **designated** enemy unit(s)"           | `viper` — an inserted word breaks the match; a trailing qualifier would not (`2b` is the contrast) |

Plus `novel`, held on the granularity question (§4).

**3 tags added** — the true carriers in the graded slice, damage block reading "■ Affects all
enemies." verbatim: `noir` 351.64%, `privaty` 1407.64%, `quency-escape-queen` 1736.31%.

**6 tags kept** — all literal: `isabel` (×3), `liberalio`, `mica`, `phantom`, `scarlet`,
`soda-twinkling-bunny`.

**`helm`'s batch-5 hold collapses.** Her clause is non-literal, so there was never a tag to land;
the coordinated `jackal` J4/J5 edit the hold was waiting on is moot. H7 now asserts the absence
for the ruling's reason rather than as a pending chore.

**Prose + pins.** Falsified `note`/`caveats` rewritten on `belorta`, `cinderella`, `ein`,
`elegg-boom-and-shock`, `eunhwa`, `helm`, `jackal`, `mica`, `novel`, `signal`, `trina`; new
carrier caveats on `noir`, `privaty`, `quency-escape-queen` (`privaty` had no `caveats` array).
Six spec pins flipped from asserting the tag to asserting its ABSENCE **with the reason**
(`belorta`, `crow` C5, `ein` E4, `elegg-boom-and-shock` H3, `eunhwa` B2, `signal`) — the `helm`
H7 precedent, so no future reviewer silently "finishes the chore". `jackal`'s note now records
that **no unit on the roster qualifies for her amp today**, so it reaches nothing anywhere.

**Verification.** Board **byte-identical on a FULL diff** vs the §0 baseline — 7/14/23/22 across
142 datapoints / 45 units. Predicted and confirmed: no retagged unit shares a comp with `trina`,
and `jackal` sits in no graded comp. `liberalio` is the one board-active pairing and is literal,
so her 0.917 → 0.929 movement is untouched. `bash scripts/verify.sh` green; mirrors regenerated
(414 entries, unchanged count).

## 4. HELD — block-level vs skill-level granularity is UNRULED

"skills with X **in the description**" does not say whether the literal must sit on the same `■`
block as the damage line, or anywhere in the burst description. Three units split:

- **`novel`** — the sharpest case. Her damage block is "Affects **the** 1 enemy unit(s) with the
  highest final ATK" (no literal: the inserted "the" breaks it), while a LATER block that deals
  no damage reads "Affects 1 enemy unit(s)." verbatim. Skill-wide ⇒ she qualifies; per-block ⇒
  she does not. She shipped tagged; she now ships untagged.
- **`kilo`**, **`sin`** — same shape, both already untagged.

All three ship UNTAGGED: that is the inert default (a missing tag applies no amp) and it matches
the block-level reading the census enforces. The hold is pinned in the census test so it reads as
a decision, not an unfinished chore. **This is the one open owner question left in the tag class**
— and it is cheap to leave open, because `jackal` is in no graded comp, so all three are
board-inert either way.

## 5. Recorded, not applied — 24 literal carriers outside the graded slice

The census finds 24 units whose damage block IS literal and which carry no tag:

`2b` `anchor` `arcana` `arcana-fortune-mate` `d` `delta-ninja-thief` `dolla` `epinel` `harran`
`helm-aquamarine` `laplace-ultimate-hero` `maiden` `mari` `mihara` `milk` `nayuta` `neon`
`privaty-unkind-maid` `raven` `rei-ayanami-tentative-name` `rei-ayanami` `vesti-tactical-upgrade`
`vesti` `yulha`

Under-tagging is inert — a missing tag applies no amp — and none of these shares a comp with
`trina` or `jackal`, so tagging them moves nothing today. They are LISTED rather than swept
because each is a per-unit review under the phase-4 checklist (batch-and-stop). The list is
pinned in the census test so it can shrink deliberately and never grow silently. Tagging all 24
in one mechanical pass is a legitimate alternative if the owner prefers it — the census decides
each one and the board impact is provably zero — but it is the owner's call, not the sweep's.

## 6. Two carry-forwards for whoever tests the amp

- **The magnitude/placement measurement from batch 5 is still wanted, and is now cleaner.** The
  recipe is unchanged — popup-read a qualifying all-enemies burst nuke cast inside vs outside a
  `trina` Spread Roots window, compare against `1 + 4.356` additive-in-Damage-Up — but the
  qualifying set is now exact rather than a judgement call, and `cinderella` is no longer a
  candidate. Any comp with `trina` + one of `isabel`/`liberalio`/`mica`/`noir`/`phantom`/
  `privaty`/`quency-escape-queen`/`scarlet`/`soda-twinkling-bunny` gives the measurement.
- **A measured amp would also settle §4 for free** if the test unit is `novel` or another
  granularity-split unit: amped ⇒ skill-level, unamped ⇒ block-level.

## 7. Stats

12 units untagged (31 instances) + 1 held (`novel`) + 3 tagged + 6 kept · 6 spec pins flipped to
absence-with-reason · 11 override notes/caveats corrected + 3 carrier caveats added · 1 committed
instrument + 13-pin self-validating fixture + roster invariant · board byte-identical on a full
diff · verify.sh green · 1 owner question open (§4), 24 units recorded not applied (§5).
