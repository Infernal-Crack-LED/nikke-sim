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

Three units differ between the readings — literal on a damage-free block, no literal on the
damage block — and all three are correctly UNTAGGED: **`guillotine-winter-slayer`**, **`kilo`**,
**`sin`**. (`guillotine-winter-slayer` only became visible once the census stopped skipping dot
carriers — see §4b.)

`novel` was the sharpest case in this section until §4a landed. Forgiving the stray article puts
the literal on her OWN damage block, so block-vs-skill no longer decides her and she is tagged.

Also settled by the same rule: a TRAILING qualifier does not break a match (`2b` "Affects 1 enemy
unit(s) with the highest remaining HP" qualifies), while a MEANINGFUL inserted word does — §4a.

## 4a. The stray article — FORGIVEN, 6 units tagged

Owner: _"let's operate under the assumption it keys off internal id because it'd be really dumb
if it didn't."_ Seven units have a burst DAMAGE block reading "Affects **the** 1 enemy unit(s)
with …", one article off `jackal`'s literal: `ark-ranger-black`, `guilty`, `nero`, `novel`,
`pepper`, `power`, `rapi` (AR/Fire base).

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

**Enacted as a matcher rule, not a unit list.** `stripStrayArticle()` normalizes
"Affects the ⟨count⟩" → "Affects ⟨count⟩" before matching, so the census decides membership and
a future unit with the same typo is handled automatically. 8 tag instances across 6 units:
`guilty` ×2, `nero`, `novel`, `pepper`, `power` ×2, `rapi`. The two doubles are the nuke plus a
status-gated "Affects the same target(s)" rider inheriting the scope (`exia` precedent).
`ark-ranger-black` qualifies on the clause but her burst damage is a `dot` — blocked by §4b
instead. Board byte-identical on a full diff.

**It is an ASSUMPTION and is recorded as one.** Cheap to adopt: every affected unit is on
`jackal`'s side and `jackal` sits in no graded comp, so being wrong costs zero on the board
today. A popup read of an amped nuke on any of the six confirms or refutes it.

The rule is deliberately narrow — it fires only where the article precedes a COUNT, which is
exactly where the inconsistency is attested. It does not touch "Affects the enemy nearest to the
crosshair", "…with the highest final ATK" or "…the same target(s)", which are different
targeting rules the literal-only ruling still excludes, and it does not forgive a meaningful
word: `viper` ("Affects 1 **designated** enemy unit(s)") stays a genuine non-match and is the
only remaining `--near-miss` hit. The census pins the two classes separately.

**Knock-on:** `novel` stops being a block-vs-skill case at all — with the article forgiven her
own damage block carries the literal, so §4's rule is no longer what decides her.

## 4b. A burst-slot `dot` is structurally amp-ineligible (engine gap)

`burstDesc` is plumbed only on `flatDamage` and its pending-hit path, so a burst damage line
modeled as a `dot` can never read an amp however its clause reads. Three units are blocked by
this and nothing else — `ark-ranger-black`, `diesel-winter-sweets` and `mana` all have a
qualifying literal on their damage block and still cannot be tagged. (`ark-ranger-black` joined
that set via §4a: forgiving the article qualified her clause, leaving the dot as the only
obstacle.) `mihara-bonding-chain` is a dot carrier too but her clause is non-literal, so she is
moot on both counts — which retires the batch-6 START-HERE item that flagged her.

This surfaced as a **defect in the instrument**: the first census skipped units with no burst
`flatDamage` entirely, silently hiding every dot carrier — `ark-ranger-black` appeared in a raw
kit-text grep and then vanished from the census, which is what exposed it. The census now counts
burst dots and reports a distinct `dot-ineligible` verdict; the unit count went 76 → 83.

Board-inert (no dot carrier shares a comp with an amp). Fixing the gap means threading
`burstDesc` through the dot record and its tick path — an engine change, out of scope here.

## 5. The untagged-carrier debt is CLEARED

The 24-unit list this section used to hold (25 after the batch-6 census fix reclassified `kilo`)
is gone — owner-directed, all tagged. **28 instances across 25 units**, board byte-identical on a
full diff because none of them shares a comp with `trina` or `jackal`.

- **22 units tagged wholesale** — every damage block qualifies AND wants the same tag.
- **3 units tagged PER BLOCK**, because only some of their damage blocks qualify:
  - `2b` — `allEnemies` on the 2439.36% distributed nuke, `singleEnemy` on the 792%
    additional-damage line. Two different literals in one burst; a blanket tag would have
    mis-tagged one of them, which is why the worklist now refuses to call a multi-literal unit
    "safe to tag wholesale".
  - `helm-aquamarine` — `allEnemies` on the 164.83% nuke; the Electric-Code-gated second block
    ("Affects the target") is NOT a literal and stays untagged.
  - `laplace-ultimate-hero` — `allEnemies` on the 2953.84% nuke; the four Over-Energy-staged
    934.76% blocks ("Affects the enemy nearest to the crosshair") stay untagged.

The vitest pin no longer holds a list: it asserts the debt set is EMPTY, and that every remaining
census mismatch is the engine-gap class. An empty invariant beats a list that needs maintaining,
and anything reappearing there is a NEW gap rather than a known one.

**A third phrasing-variant hole surfaced doing this** — the same family as the DAMAGE_LINE and
stray-article bugs. The "this block reuses the previous block's scope" rule matched only
`Affects the same target(s)`, but the localization spells it SEVEN ways across 13 occurrences
(`targets`, `target`, `enemy unit(s)`, `enemy units`, plus status-qualified variants). Matching
only the parenthesised form silently dropped inheritance on `epinel`, `sakura-bloom-in-summer`,
`julia`, `brid`, `guillotine`, `ether`, `mihara-bonding-chain` and `laplace` — `epinel` was
misfiled as needing per-block care when her second block plainly inherits "Affects all enemies".
Now matched loosely. **Three holes of one shape in one session: the instrument was too literal
about a kit text that is not written consistently.**

The worklist that drove all this is committed as `--under`, which splits the remaining work into
"safe to tag wholesale" and "tag per block" so the next person does not have to re-derive it.

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

13 units untagged (32 instances) then 9 units tagged (11 instances: 3 `allEnemies` carriers +
6 article-forgiven `singleEnemy` carriers) + 6 tags kept · 6 spec pins flipped to
absence-with-reason · 17 override notes/caveats corrected or added · 1 committed instrument
(`--all` / `--check` / `--near-miss`) + 18-pin self-validating fixture + roster invariant ·
**board byte-identical on a full diff at every step** · verify.sh green.

**Open owner questions: none.** Three scope questions ruled — literal-only, block-level, and the
stray article forgiven on the internal-id assumption.

Recorded, not enacted, all board-inert: the burst-`dot` engine gap (§4b, 3 units blocked on
qualifying clauses) and the 24 untagged literal carriers outside the graded slice (§5). One
standing assumption to confirm when convenient: the internal-id premise behind §4a — a popup read
of an amped nuke on any of `guilty`/`nero`/`novel`/`pepper`/`power`/`rapi` settles it, and being
wrong costs nothing on the board today.

**One process note worth carrying.** The instrument had a silent hole — it skipped any unit whose
burst damage is a `dot`, hiding 7 units including one (`ark-ranger-black`) that a raw kit-text
grep HAD surfaced. It was caught only because the two methods disagreed and the disagreement got
chased rather than waved off. A census that silently drops a category is strictly worse than no
census, because it reads as coverage. Cross-check any new census against a dumb grep over the raw
source at least once.
