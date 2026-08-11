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

## 4. RULED — the match is BLOCK-level

Owner, same day: _"it does require it to be on the same block — look at `scarlet` as an example
for a known working trina amp target."_ The literal must sit in the SAME `■` block as the damage
line it amplifies, not merely somewhere in the burst description.

`scarlet` (AR/Electric base) has two burst blocks — "Affects self. Activates when HP falls below
50%." (Crit Rate, no damage) and "Affects all enemies." (the 849.15% nuke) — with the literal on
the damage block. Worth stating plainly: she is consistent with BOTH readings, so she is a
confirming positive control, not the discriminator. The ruling is what settles it.

Four units differ between the readings — literal on a damage-free block, no literal on the
damage block — and all four are correctly UNTAGGED:

- **`novel`** — the sharpest. Damage block "Affects **the** 1 enemy unit(s) with the highest
  final ATK"; a later, damage-free block reads "Affects 1 enemy unit(s)." verbatim. She shipped
  tagged; she now ships untagged.
- **`guillotine-winter-slayer`**, **`kilo`**, **`sin`** — same shape, all already untagged.
  (`guillotine-winter-slayer` only became visible once the census stopped skipping dot carriers
  — see §4b.)

Also settled by the same rule: a TRAILING qualifier does not break a match (`2b` "Affects 1 enemy
unit(s) with the highest remaining HP" qualifies), while an INSERTED word does — §4a.

## 4a. The stray article — 7 units, recorded not enacted

Seven units have a burst DAMAGE block one article away from `jackal`'s literal:
`ark-ranger-black`, `guilty`, `nero`, `novel`, `pepper`, `power`, `rapi` (AR/Fire base) — all
reading "Affects **the** 1 enemy unit(s) with …".

**The article is a localization artifact, not a targeting distinction.** Seven clause bodies are
attested BOTH ways across the roster, and decisively **`pepper`, `rapi` and `maiden-ice-rose`
each use both spellings of the SAME clause inside their own kit** — no targeting rule can mean
two things by one clause in one unit's kit.

| clause body                                    | with "the"                                | without                              |
| ---------------------------------------------- | ----------------------------------------- | ------------------------------------ |
| …1 enemy unit(s) with the highest remaining HP | `nero`                                    | `2b`                                 |
| …1 enemy unit(s) with the highest final DEF    | `guilty`                                  | `dolla`, `milk`, `neon`              |
| …1 enemy unit(s) with the highest final ATK    | `novel`, `pepper`, `power`, `rapi`        | `idoll-flower`, `pepper`, `rapi`     |
| …1 enemy unit(s) with the highest final Max HP | `marciana-marine-study`                   | `guillotine-winter-slayer`, `jackal` |
| …1 enemy unit(s) nearest to the crosshair      | `maiden-ice-rose`, `soda-twinkling-bunny` | `maiden-ice-rose`, `mana`            |
| …2 enemy unit(s) with the highest final ATK    | `anis-sparkling-summer`, `rosanna`        | `product-23`                         |
| …10 enemy unit(s) with the highest final DEF   | `exia`                                    | `ein`, `frima`                       |

**What this does NOT settle is the enactable question:** whether the GAME's matcher sees the
stray word. If it string-matches the localized description it does and these seven genuinely
miss the amp; if it keys on an internal id it does not and they are real targets. Unmeasured, so
all seven stay untagged. Cost of being wrong is currently ZERO — every one is on `jackal`'s side
and `jackal` sits in no graded comp. Owner 2026-08-10: `novel` is low priority, not worth a test.

`viper` ("Affects 1 **designated** enemy unit(s)") is reported by the same detector and is NOT
this class — "designated" is a real word describing a real targeting rule, so hers is a genuine
non-match. The detector reports the inserted word so the two never get conflated; the census
test pins them as separate sets.

Detector: `npx tsx scripts/census-burst-amp-scope.ts --near-miss`.

## 4b. A burst-slot `dot` is structurally amp-ineligible (engine gap)

`burstDesc` is plumbed only on `flatDamage` and its pending-hit path, so a burst damage line
modeled as a `dot` can never read an amp however its clause reads. `diesel-winter-sweets` and
`mana` have the literal on their damage block and still cannot be tagged; `ark-ranger-black` and
`mihara-bonding-chain` are dot carriers too (both non-literal, so moot today).

This surfaced as a **defect in the instrument**: the first census skipped units with no burst
`flatDamage` entirely, which silently hid every dot carrier — `ark-ranger-black` appeared in a
raw kit-text grep and then vanished from the census, which is what exposed it. The census now
counts burst dots and reports a distinct `dot-ineligible` verdict; the unit count went 76 → 83.
Board-inert (no dot carrier shares a comp with an amp). Fixing the gap means threading
`burstDesc` through the dot record and its tick path — an engine change, out of scope here.
It also retires a batch-6 item: the START-HERE doc flagged `mihara-bonding-chain` as needing this
gap recorded, and her clause turns out to be non-literal anyway, so she is moot on both counts.

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

13 units untagged (32 instances) + 3 tagged + 6 kept · 6 spec pins flipped to
absence-with-reason · 11 override notes/caveats corrected + 3 carrier caveats added · 1 committed
instrument (`--all` / `--check` / `--near-miss`) + 17-pin self-validating fixture + roster
invariant · board byte-identical on a full diff · verify.sh green.

**Open owner questions: none.** Both scope questions are ruled (literal-only; block-level).
Three things are RECORDED, not enacted, all board-inert: the 7-unit stray-article class (§4a),
the burst-`dot` engine gap (§4b), and the 24 untagged literal carriers outside the graded slice
(§5). Batch 6's per-unit sweep is still open.

**One process note worth carrying.** The instrument had a silent hole — it skipped any unit
whose burst damage is a `dot`, hiding 7 units including one (`ark-ranger-black`) that a raw
kit-text grep HAD surfaced. It was caught only because the two methods disagreed and the
disagreement got chased rather than waved off. A census that silently drops a category is
strictly worse than no census, because it reads as coverage. Cross-check any new census against
a dumb grep over the raw source at least once.
