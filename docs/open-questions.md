# Open mechanics questions

Running record of game-mechanics questions affecting sim accuracy, reorganized 2026-07-13.
This file holds only what's left to research. ⚑ = calibrated-and-applied but mechanism
unconfirmed (flagged for review).

**Closing a question (single numbering, since 2026-07-26):** a question keeps its U-number for
life — no A-number is minted. When one resolves, MOVE its entry to
[answered-questions.md](answered-questions.md) (append-only) with the resolution + date inline;
`docs/DECISIONS.md` and other docs reference the U-number. A resolution recorded only in
DECISIONS leaves the stale question here reading as live — always move it.

---

## UNANSWERED

### U36 — the popup reader's AUTO-ACCEPT path is unexercised: does it hold on a clean-band unit? (opened 2026-07-24)

**Status: an INSTRUMENT question, not a game-mechanics one — but it gates how much popup reading can
be trusted without Opus confirmation, so it is tracked here rather than lost in a script comment.**

`scripts/probe/read-popups-vlm.ts` now scores every deduped popup: `confidence` = agreeing looks /
total looks over the frames the popup persists in (genuinely independent samples — different images,
unlike re-running one frame, which a deterministic decoder answers identically including its
mistakes), plus `inBand` membership in the focus unit's `hit-bands.ts` value bands, plus two
class checks. `autoAccept` = confidence ≥ 0.75 AND ≥3 agreeing looks AND in-band AND the matched
band variant is reachable from the reported class AND exactly one variant matches.

**Why it is unproven.** The validation pass (2026-07-24, 20 frames of `docs/probes/control/lm.MP4`
t=45–49 against the hand read in `docs/probe-data/control-little-mermaid.json`) met the ship gate —
zero auto-accepted popups the hand read disagrees with — **vacuously: 0 of 30 popups auto-accepted.**
`little-mermaid`'s bands overlap outright (normal 14,664–69,913, its crit image 21,484–87,858, its
core image 36,660–174,782), so no value there can pin a class. The gate passed because nothing was
offered to it, which is not evidence that the rule is right.

Worth keeping, because it is what shaped the rule: the FIRST draft (agreeing looks + in-band only)
auto-accepted 4, of which **2 were wrong** — a 10,818,572 read as "normal" whose only matching bands
were `skill:core`/`skill:crit+core` (identity still unresolved: it fits a real core barrage
arithmetically, but the same run had the hallucination guard drop `6473333` and `17333`, and
`108,189` recurs in the neighbouring frames, so a digit concatenation is equally likely — note it is
NOT the top-centre team total, which sits outside the damage crop), and a 64,733 called "crit" when
64,733 is that unit's *non-crit* normal. The two class conditions were added to catch exactly those.

**To answer it:** run the reader on a SHORT clip whose focus unit has a CLEAN, non-overlapping band
(a big skill/burst hit well clear of its normal band and of that normal's crit/core images — check
with `npx tsx scripts/probe/hit-values.ts <focus> <team…> --boss <E>` BEFORE picking the unit), then
compare every `autoAccepted[]` entry against a hand read of those instants. Ship the auto-accept
path as trusted only if the disagreement count is zero on a run where it actually accepted
something. Until then treat `autoAccept` as advisory and work from `needsConfirmation[]` (which is
the reader's real present-day value — it emits a ready-made batched `frames.ts --times` command).
Record: `docs/probe-runs.md` 2026-07-24; ruling: `docs/DECISIONS.md` "Probe reader build-out".

### U35 — `marciana` SG cold-read is the PELLET-LANDING term; exact per-band landing needs a solo recording (opened 2026-07-23)

**Settled by this probe (`docs/probe-data/marciana-sg-band.json`, n=2 = 0.850 COLD):** the 15% SG
cold-read on the bare-weapon basis is localized to the **pellet-landing** term of the SG weapon model,
by elimination. ATK basis pinned **+0.23%** (five popup values on one per-pellet lattice — near
26149/36207/46264 = 13u/18u/23u, far 20115/30172 = 10u/15u, all u≈2011.47); cadence = sim (40
game-frames); crit = fixed 15% stat; core popups visually rare (not the ~5× rise a core-driven gap
needs). With all held, the 17.7% real/sim excess is forced onto landing: real ≈ **8.45/10 mean** vs
sim **7.18** (sim per band: near 8.13 / mid 7.13 / midfar 6.57 / far 6.07), concentrated at the long
bands where the sim's silhouette-gap model drops pellets.

**What is STILL open (why this is UNANSWERED, not a verdict).** The **exact per-band landed-pellet
count** could not be measured: NIKKE stacks per-pellet popups nearly on top of each other (an isolated
near-band shot reads ~7–9 whites, indistinguishable from sim's 8.13), and the SG gold-standard fix —
the pellet lattice on the running-total **delta** — is unavailable because the mid-fight team DAMAGE
counter mixes all three units. **Recipe:** a **SOLO `marciana`** (exact slug `marciana`, SG/Iron — NOT
`marciana-marine-study`) scope-lock recording, boss Iron, bursting off. Then the single-unit running
total gives a clean per-shot delta on the lattice, reading landing shot-by-shot per band to ~0.1
pellet — which pins whether the fix is a flat landing lift or a band-shaped one (flat-at-range is the
hypothesis). Do NOT re-tune SG overrides to absorb this first: `marciana` has no override, so a pure
override re-tune would be fitting overrides to a weapon-model landing error. Related: **U27** (isabel
mid/midfar landing), the SG re-tune thread in CLAUDE.md, and **U32** (`folkwang` AR, same
solo-re-record need for the AR class).

**GATING FOLLOW-UP (owner direction 2026-07-24) — the instrument must be validated on a SECOND unit
before it answers this question.** We intend to score the solo recording with
`scripts/probe/read-pellets.ts` (CV pellet counter, `count-pellets.py`). It is currently tuned on
`marciana-solo.MP4` ALONE, and on that video it detects **70 of ~90** expected shots, averages
**7.6** pellets/shot against the lattice-measured ≈**8.45**, and reads `avgRed` 0.19 vs the ~0.5
expected — i.e. its landing average is itself ~10% cold, in the same direction as the effect under
test. Scoring U35 with it as-is would risk confirming the hypothesis with an instrument that shares
its bias. **Requirement:** validate the counter against a second SG unit's footage (a different
shooter, ideally a different band mix) and close the shot shortfall, then admit its per-shot histogram
ONLY where it agrees with the running-total pellet lattice — the lattice is arithmetic closure and
outranks the CV counter wherever they disagree. Build/validation plan:
`docs/handoffs/2026-07-24-probe-reader-buildout-plan.md` (P3).

### U34 — Max-Ammunition ▲ EXPIRY over-cap: does the belt clip immediately, or lazily at the next ▼? (opened 2026-07-23)
The engine clips the current belt to the new cap when a Max-Ammunition ▼ (`maxAmmoPct<0`) LANDS
(measured/user-confirmed, `docs/data/game-mechanics.md` § "Max Ammunition ▼"; `src/engine/sim.ts`
~1830). The contract is SILENT on the reverse: when a Max-Ammunition ▲ **expires** while the belt is
still OVER the new (lower) cap, the engine keeps the overhang and clips it LAZILY at the next ▼
landing — it does not clip at expiry. This path was unreached at the old 24/s SMG cadence but is now
REACHED at the shipped 20/s (2 genuine over-cap clips in the `modernia`/`liter` control comp — the
`hits-per-shot.test.ts` fixture that surfaced it). The behaviour is byte-identical between the two
cadence arms (only phasing differs), so it is NOT a frame-quantization defect — but it is now
load-bearing in the ammo economy of any SMG-or-MG comp that pairs a Max-Ammunition ▲ source (e.g.
`liter`) with a Max-Ammunition ▼ carrier (e.g. `modernia`), and it is MODEL-ONLY / unmeasured.
**Recipe:** in a focus recording of such a comp, read whether the ammo counter drops the instant the
▲ icon expires (immediate clip) or only later when the ▼ re-applies (lazy clip). Until measured, the
engine's lazy-clip stands as the current model, not a validated mechanic. Surfaced by the SMG-cadence
flip's implementation review (DECISIONS 2026-07-23).
**INSTRUMENT NOW EXISTS (2026-07-24, still UNANSWERED — nothing measured yet):**
`npx tsx scripts/probe/read-ammo.ts <video> --at <t> --dur 20 --out <dir>` reads the counter every
0.1 s and emits `reads[]` + `reloads[]`, so the clip instant is a JSON diff rather than a frame hunt
— an immediate clip shows as a step DOWN with no reload, a lazy clip shows the overhang persisting
until the ▼ lands. Validated on SMG in two range bands (`docs/probe-runs.md` 2026-07-24), which is
the relevant weapon class here. ⚠ It cannot yet read a small-magazine SG counter, so an SG-carrier
variant of this question stays blocked. **Still needs the recording** — the comps in question have
no focus footage yet.

### U33 — `idoll-ocean`'s ATK basis reads ~1.4% low against a popup (opened 2026-07-23)

**The observation.** On `docs/probes/clean-weapons/emma-claire-idollocean.MP4` a plain ranged normal
pops **7694**, repeatedly, at t≈60.5–62.0. A plain ranged SMG normal should be
`baseAtk × 8.73% × 1.3`. The modelled `baseAtk` 68,788 predicts **7806.8**; 7694 implies
**baseAtk ≈ 67,795 — 1.44% BELOW the model.**

**Why it matters.** `idoll-ocean` is not SSR, so the basis caps her at an owner-supplied
**0★ / core 0** (`CLEAN_WEAPON_LIMITS`). `data/characters.json` carries **no unit-rarity field**, so
nothing in the repo can check that ceiling — a popup is the only independent handle on her true
in-fight ATK. A 1.4% error is exactly the size a slightly-wrong ceiling would produce.

**Why it is NOT enacted.** Three live explanations, undiscriminated: (a) the rarity ceiling is
slightly off; (b) the range-bonus term is not exactly +30% for SMG; (c) the popup is not the plain
ranged normal I took it for (crit/core colour was not rigorously confirmed, and instances overlapped
visually). Also note the opposite-signed prior: **U18** has the in-fight ATK term reading ~1.6%
*above* the static reference on the SG probes.

**How to settle it.** A proper lattice read on an SMG probe pins the in-fight ATK term to ~0.01%
(the counter-reconciliation method in `/probe-processing`). Do that before touching any ceiling.
Do NOT tune the ceiling to close the gap. Parse record: `docs/probe-data/clean-weapons-idoll-ocean.json`.

### U32 — `folkwang` (AR) sits stably ~3.7% COLD on the bare-weapon basis (opened 2026-07-23)

**The reading.** `npx tsx scripts/clean-weapons-read.ts`: sim 23.91M vs real 24.82M = **0.963 COLD**,
**n=2**, with a run-to-run spread of only **±0.8%**. Tightened from 0.956 at n=1. So it is a small,
*stable* residual sitting just outside the ±3% goal — not noise, and not one of the two big weapon-model
errors this basis found (SG landing, SMG cadence).

**Why it is interesting.** `folkwang` has **no override** and her kit deals **zero damage** (shields /
taunt / Max HP only), and bursting was off — so this cannot be calibration debt, kit misencoding, or
rotation. It is the **AR weapon model**, measured with nothing in the way. It also matches the board's
AR class mean (0.965) almost exactly, so it is very likely a class-wide AR term rather than anything
about her.

**Candidates, none tested.** AR frame cadence is exact (720 rpm = 5 frames — the SMG quantization
finding cannot apply here, verified by census); so the suspect list is the AR core-hit rate / accuracy
geometry (δ0 15.9 px, f_bloom 0.578 — both ⚑ fit-selected), the range-band map, or reload timing.

**Next step.** Cheap, and not yet done: an ammo-counter cadence read + a popup lattice on an
AR-focused clean-weapon recording. No such recording exists yet — `folkwang` was slot 2 (unfocused)
in both team-A runs, so her popups are unreadable. **Needs a re-record with `folkwang` in slot 3.**

### U30 — chunked (multi-part) reloads: `reload_bullet` IS the tell, already honored for 14 of 15 units; `grave` is the lone gap (opened 2026-07-22)

**The mechanic (owner correction, 2026-07-22 — the framing this entry opened with was wrong).** A
chunked-reload unit does **not** top up mid-magazine while firing. She empties the magazine
completely, then **refills it in parts** — `grave` and `soda-twinkling-bunny` are the owner-named
examples. The engine-visible consequence is therefore **reload DURATION** (N chunks take N× as long),
not any fire-during-reload behavior.

**`reload_bullet` encodes it exactly, as `1 / chunks`:**

| value | chunks | n | who |
|---|---|---|---|
| `10000` | 1 (whole mag) | 177 | everyone else |
| `3300` | 3 | 14 | 9 SGs (9 ammo → 3 shells/chunk): `drake`, `maiden`, `neon`, `noir`, `pepper`, `product-23`, `soda-twinkling-bunny`, `sugar`, `viper` · 5 RLs (6 ammo → 2): `anis`, `centi`, `jackal`, `rumani`, `trina` |
| `5000` | 2 | 1 | `grave` (60 ammo → 30/chunk) |

**The datamined `reload_time` is PER CHUNK, and the shipped `reloadFrames` already multiplies it.**
Two independent confirmations:

1. **Bimodal split within one weapon class.** Chunked SGs carry `reload_time` 23–67; single-chunk SGs
   carry 150–267. Exactly ~3× apart, and they interleave nowhere. (`drake` 50 × 3 = 150 = exactly
   `dorothy-serendipity`/`brid-silent-track`/`naga`/`leona`'s single-chunk value.)
2. **The sync formula is exact.** `reloadFrames == reload_time × chunks × 0.6 + 21` holds to ±1 frame
   for **190 of 192** units — `× 1` for the 176 single-chunk units and **`× 3` for all 14 chunked
   ones**, with no tuning. (Two unrelated outliers: `asuka` 84 vs 81, `scarlet-black-shadow` 152 vs
   141 — small, separate.) The multiplier arrives via the upstream weapon-frames table
   (`src/data/sync.ts:178`, `wf?.reloadFrames`), so it is already live in the engine without anyone
   here having modeled it as chunking.

⇒ **No primitive is needed and none should be built.** The duration effect is modeled for 14 of the
15 carriers today.

**The one real gap — `grave`.** She is the sole `5000` unit and the sole carrier shipped on the
**× 1** formula: `reloadFrames 81` where × 2 chunks gives **141**. She is also the only carrier with a
measured reload — 3.35 s / **201 f** (n=19 clean gaps, range 2.85–3.52 s = 171–211 f, from
`grave solo.MP4`, 2026-07-15). Effective frames (`round(f × 0.975) + 13`):

| source | stored | effective | vs measured 201 f |
|---|---|---|---|
| shipped (× 1) | 81 | 92 f | −109 f, far too fast |
| × 2 (what `5000` implies) | 141 | 150 f | −51 f, still below her measured floor (171 f) |
| × 3 | 201 | 209 f | **inside the measured range** |
| her hand-fit `charFixes.reloadFrames` | 193 | 201 f | = measured (fitted to it) |

**`grave` is 2 chunks — owner ruling 2026-07-22**, i.e. `reload_bullet 5000` is correct at face value and
the ×3 fit above is NOT the explanation. So chunking takes her from 92 f to 150 f effective, and the
remaining ~51 f to her measured 201 f is **something else** — her kit's *"Heat Emission: Reload Ratio
▼50%"* and/or animation overhead, exactly the ambiguity her own note flags as *"attribution … inferred,
not isolated."* Her measured `charFixes.reloadFrames 193` stays the operative value; this is a
data-provenance correction sitting underneath it, **board-inert today**.

**Firing does NOT resume between chunks — measured twice.** `grave`: 61.5 shots per gap on a 60-round
mag (n=19) — if she resumed at the halfway chunk the shots-per-gap would average ~30–45. `noir`:
consecutive `009` → `009` mag-start frames bound *"EXACTLY one 9-shot mag,"* and the damage counter is
*"identical at t53.0 and t53.8 → confirmed no firing during the preceding reload"*
(`docs/probe-data/noir-solo-recon.json`). Duration-only, on both a 2-chunk and a 3-chunk unit.

**`reload_start_ammo` remains useless and is not this field.** It equals `max_ammo − 1` for **192 of
192** shot rows — no exceptions, every class. It never identified anyone, and step 5d's named targets
`modernia` (299) and `volume` (119) are both `reload_bullet 10000`, i.e. single-chunk units that never
had the mechanic at all. The `reload_start_ammo 8` clause cited as the tell in DECISIONS 2026-07-13
and in `jill.json` is non-discriminating (`jill` is `reload_bullet 10000`). Her real mechanic is a
BURST buff — 100% ammo dump + Forced Reload + reload speed fixed at +99.96% for 10 s — which is its own
thread: **U31**.

**BUILT 2026-07-22 — the chunk COUNT is now derived and gated** (`scripts/check-reload-chunks.ts`, wired
into `verify.sh`). `chunks = 10000 / reload_bullet`, asserted against
`reloadFrames == reload_time × chunks × 0.6 + 21`. Census: **192 units — 15 chunked (14× 3-part, 1×
2-part), 177 single-part.** Zero behaviour change; it makes the previously-undocumented upstream
convention explicit and fails loudly if `sync.ts`'s `wf?.reloadFrames ?? api?.reload_time ?? …` fallback
ever drops the multiplier. Three tolerated known exceptions, each recorded in the file: `grave` (the real
gap — shipped ×1 of a 2-part reload, masked by her measured `charFixes 193`), `asuka` (+3 f) and
`scarlet-black-shadow` (+11 f), both single-part and unrelated to chunking.

**`grave`'s "Reload Ratio ▼50%" is EXPLAINED (owner 2026-07-22):** she reloads only half her bullets per
part, so a full magazine costs two parts and her effective reload time doubles. That is exactly
`reload_bullet 5000`, and it reconciles with her measurement — 61.5 shots per gap (a FULL 60-round mag
between gaps) with a gap ~2× a single part.

**⚠ THE COMPOSITION IS NOT DETERMINED — do not guess it.** How N parts compose into a duration is
contradicted by the only two units with measured reloads:

| model | `grave` (measured **201 f**, range 171–211, n=19) | `noir` (measured **~36–54 f**) |
|---|---|---|
| shipped (one gap, tail once) | 92 f — far too fast | 73 f — already too SLOW |
| chunk-derived, tail once | 150 f — 51 f short | 73 f — too slow |
| per-chunk tail | **184 f — inside range ✓** | 141 f — wildly too slow |

No single model fits both. Per-chunk tail would also make all 9 chunked SGs ~40% slower
(`soda-twinkling-bunny` 151 → 216 f), a large board move on calibrated units. **Independent finding worth
its own thread: `noir`'s shipped reload (73 f) already over-predicts her measured 36–54 f**, before any
chunk change. Settling this needs a frame-count of one chunked unit's reload broken into parts.

**LOW-PRIORITY ACTION ITEM — `grave`'s data value is HELD AT 81 (owner decision 2026-07-22).** She is not
corrected to the convention's 141. Two reasons: the composition question above is unsettled, and the
correction would change nothing today anyway — her MEASURED `charFixes.reloadFrames 193` (3.35 s gap,
n=19) overrides the data value before it reaches the engine. She is now **pinned** in
`scripts/check-reload-chunks.ts` rather than skipped, so the gate still fires if her 81 ever drifts.
**Do NOT "resolve" this by deleting her `charFixes` so the 81 takes effect** — 81 → 92 f effective
against a measured 201 f, and the 193 is measured truth (constraint 3). Revisit when the composition
question is settled.

**What remains open:** (1) `grave`'s true chunk count, 2 vs 3, and whether *"Reload Ratio ▼50%"* is the
multiplier — one focus read of her reload split into visible chunks settles it; (2) whether the ×3 on
the 14 should be made explicit in the sync (derive `reloadFrames` from `reload_time × 10000 ÷
reload_bullet`) rather than inherited silently from the upstream table, which would fix `grave` as a
side effect; (3) the two formula outliers (`asuka`, `scarlet-black-shadow`). Confirmatory footage for
the 3300 group already exists if wanted — `noir`, `drake` (`docs/probe-data/coreband-drake-sg.json`),
`soda-twinkling-bunny` (`soda-tb-control-recon.json`). (NB `docs/probe-data/maiden-solo.json` is
**maiden-ice-rose** (RL/Electric), NOT `maiden` (SG/Electric, the unit in the 3300 group).)

### U29 — the Snow White: Heavy Arms fire team makes 12 Full Bursts in reality; the sim generates 10 (opened 2026-07-22)

The graded comp internally labeled "N5" — Anis: Star, Arcana: Fortune Mate, Privaty,
Snow White: Heavy Arms, Diesel: Winter Sweets, boss Fire, focus Privaty; recording
`docs/probes/714 noon/5.mp4` (+ `5.JPEG`) — has a **manually re-verified real Full Burst count of
12** (owner recount 2026-07-22, confirming what the original probe log always said:
`docs/probes/714 noon/probe.md:17` recorded "measured 12 / sim 11 ✗" at grading time).

**The sim has never matched it, and the pinned "11" was never a measurement** — it matched the OLD
sim's output, so this comp was wrongly counted among the "full-burst counts measured-exact" set.
Current state: 11 under the pre-UNIGEO engine, **10 under the shipped UNIGEO default** (the −1 from
11→10 is the shotgun-landing→burst-gauge coupling — isolated cleanly by the W6 gauge-decoupling run,
worktree deliverable addendum; decoupling restores 11 but the REAL count is 12, so both variants
under-generate and the coupling is not the root cause).

**What to investigate:** a burst-generation shortfall of ~2 Full Bursts on this comp — likely
family: the burst-cycle timing thread (same family as the open "re-pin the PH-water fire comp's FB
to 12 when the burst-cycle fix lands" item in the role-audit follow-ups), gauge under-generation on
one of the five kits, or a chain/cooldown collision unique to this comp. The per-pellet vs per-shot
question for shotgun gauge generation rides along: Anis: Star is RL, but Snow White: Heavy Arms'
weapon-swap kit and the comp's gauge economy need a real read against the footage's actual FB
timestamps. First measurement: pull the 12 real FB timestamps from `5.mp4` (03:00-anchored) and diff
against the sim's chain log to see WHERE the two missing chains fail to open.

### U28 — `extraHitDamagePct` vs `flatDamage` are not interchangeable: gauge + flavor asymmetry (split out of U13, 2026-07-22)
A32 closed the crit divergence between the two encodings of function "additional damage". Two
divergences remain at the same call site. **They are not the same kind of open:**

1. **Burst gauge — LIVE ON ALL THREE CARRIERS RIGHT NOW, not inert.** A `flatDamage` proc calls
   `skillGauge` (one target-base HIT of generation: `targetPerTrigger / hitsPerShot`, no
   `flatPerTrigger`, no charge/focus ×2.5). `extraHitDamagePct` generates **nothing**. So `modernia`,
   `nayuta` and `neon-vision-eye` each generate less burst gauge today than the same kit line would
   under the other encoding — an active difference in their gauge totals, and therefore potentially in
   their rotations. Whether it is an ERROR is what is unmeasured, but the direction is not neutral:
   the one MEASURED function rider (`maiden-ice-rose`, `burst-gauge.md`:145) **does** generate gauge —
   a visible second bar sub-step per pull. That is positive evidence these three riders SHOULD be
   generating something and are not, i.e. a probable live UNDER-generation pending the measurement,
   not merely an unproven hypothetical.
   Scale of the thing being lost: `modernia`'s S1 rider (which IS `flatDamage`) fires 2×/pull at
   `per/2` each, ~+50% on top of her weapon's own generation — her override keeps that encoding
   specifically to preserve the economy her measured-exact rotation depends on. So re-encoding a unit
   between the two primitives silently changes its rotation.
2. **Flavor — moot for crit (2026-07-25).** `extraHitDamagePct` is a SUMMED buff stat, so an individual rider
   has no `flavor`. This no longer matters for crit: true damage CAN crit (owner ruling 2026-07-25, in-game
   confirmed; reverses §2c), so a true-flavored rider critting at the caster rate is CORRECT and needs no
   per-source exemption. (The summed-stat flavor distinction could still matter for other flavor-gated
   behavior, e.g. `trueDamagePct` buff gating.)

**Also unmeasured (the reason this is a question, not just a TODO):** whether function additional
damage *should* generate burst gauge at high hit rates. The `skillGauge` constant is anchored on ONE
measurement — `maiden-ice-rose`, RL, `hitsPerShot` 1, where "one hit" and "one trigger" coincide
(`burst-gauge.md`:145, two visible bar sub-steps per pull: +9.1% weapon then +3.45% rider). The
`/hitsPerShot` divisor — and the hardcoded `/10` for SG — generalizes from that single case and is
UNVERIFIED for `hitsPerShot > 1`; every unit where the divisor actually bites (`modernia` at 2, any SG
carrier at 10) rides extrapolation. Note also the measured rider sub-step reads 3.45% vs the modeled
3.64%, a small unexplained residual on the exact constant the whole path is anchored to.

**Gate:** a focus recording with a readable gauge bar on an `extraHitDamagePct` carrier
(`modernia` Destroy Mode is the natural probe — MG hit rates make any per-hit generation obvious),
plus a `hitsPerShot > 1` bar read to pin the divisor. Until then: do NOT re-encode a unit between the
two primitives, and do NOT author a true-flavored rider. → A32 (U13), DECISIONS 2026-07-22.

### U27 — isabel's mid/midfar SG landing needs a clock-drift-corrected re-derive (split out of U17, 2026-07-22)
**The one SG-landing thread still open.** The rest of the per-unit-landing investigation was CLOSED by owner
override on 2026-07-17 — see **A31 (U17)** in ANSWERED: landing is per-unit, the class `SG_LANDING_BY_BAND`
table STANDS as the shipped compromise, a class-wide far 0.66 is REJECTED, and the seeded pellet-count jitter
+ `bossPelletProfile` landed instead. What remains: isabel's **mid** and **midfar** band reads rest on a
SINGLE anchor whose measurement PREDATES the clock-drift discovery, so those two cells are not trustworthy at
the precision the rest of the table now carries.

**Scope — deliberately narrow.** This is a re-derive of two existing cells from EXISTING footage. It is NOT
new footage, and NOT a per-unit landing profile (that is precisely the part the owner closed). isabel's near
and far cells are unaffected: far is already resolved as per-unit (her r0.87 sits low alongside
brid-silent-track r0.88, versus guilty r0.93 and noir r0.99 at/near table).

**Do NOT re-open the closed part from this.** The per-unit `sgFarScale≈0.88` candidate for isabel +
brid-silent-track stays DOCUMENTED-but-UNENCODED — both are sim-LOW for rider/term reasons, so a <1 landing
factor drags them further down. Trail: A31, `docs/probe-data/` isabel/guilty/brid-silent-track sg-band files
+ `noir-solo-recon.json`, DECISIONS 2026-07-16/17.

### U26 — "All-or-nothing" crit on sequential attacks + an Eve carve-out (2026-07-21)
**Surfaced while modeling cinderella's burst** (a 10-hit "1365.92% × 10 sequential" nuke the engine
represents as one flatDamage instance). The engine rolls crit ONCE per damage instance
(`dealDamage`, `src/engine/sim.ts` ~1186–1191: a single Bernoulli `rng() < critRate` → full crit bonus
or nothing), so a single instance is inherently all-or-nothing. For a **sequential attack** this is
believed CORRECT: in NIKKE a multi-hit sequential round (Snow White: Heavy Arms' sequence, cinderella's
10-hit nuke, Eve's concentrated payload) has its critical hit decided at the **round/action level** — if
the round crits, the crit multiplier scales the whole round's damage; it does NOT independently roll
"crit, normal, crit, normal" across the micro-hits inside the round.

**Open items for later review:**
1. **Verify the engine's all-or-nothing crit is applied at the right granularity** for every sequential
   attack — i.e. one crit determination per sequential *round*, not per micro-hit, and not per whole
   multi-round skill either. Confirm cinderella's nuke, Snow White: Heavy Arms' sequence, and Eve's
   sequential procs/burst are each rolled once per round as intended.
2. **Eve (`eve`) is the exception and needs a carve-out.** Her kit is built around sequential attacks
   plus Unstable Energy, a passive that triggers after landing **44 critical NORMAL hits**. For that
   counter to fill at the right rate her ordinary rapid-fire weapon attacks must roll a **normal
   per-shot crit chance** (each shot independently crits or not, stacking the counter), even though the
   sequential payload it eventually fires resolves all-or-nothing. Today the engine does NOT roll a live
   per-shot crit counter for her — her cadence is approximated by a static threshold (`hitCount 59` =
   44 crit hits ÷ ~0.75 crit, `src/skills/overrides/eve.json`), which cannot respond to external
   crit-rate buffs shortening the real cadence (already flagged in her caveats). A faithful Eve wants
   per-shot crit rolling driving the counter, distinct from the round-level all-or-nothing rule.

Eve is currently **ungraded** (no board data, no focused Eve footage in the catalog), so this is a
model-correctness note to settle when Eve footage is captured — do not fudge her to close it. Related:
[[full-kit-audit-requirement]], sequential/`sequentialMultPct` bucket (Phase A4), U13 (DoT/rider crit).

### U24 — Do TRUE-flavored normal attacks retain CORE hits? (chisato/jill shared; footage says YES, but jill enactment gated) (2026-07-20)
The kit-audit flagged (chisato gotcha 1, jill gotcha 1) that whether true-damage normal attacks forfeit
core is unverified — a large lever, because `coreMult` is big. **Direct-observation finding (kit-audit
measurement pass, from the EXISTING `docs/probe-data/jill-hitrate-core.json` recon of `jill control.MP4`):
true normals DO retain core.** In `jill`'s own-burst window (her "Normal attacks deal True Damage for
10s" is active) her bullet popups are red **"CORE HIT"** — ~14-15 of 15 sampled shots, with crit arrows,
and NO white/orange bullet popups. If true normals forfeited core, there would be zero CORE-HIT popups in
that window; instead they dominate (also lifted by her burst Hit Rate +80.78%). So the faithful direction
is **true normals keep core/crit** — `chisato`'s SMG `coreMult 250` and a `jill` trueNormals window should
NOT strip core. **This is a direct game-behavior observation (strong), but n=1 recording** → recorded here,
not stamped on the model.
**ENACTMENT STILL GATED for `jill` (do NOT blind-land the trueNormals window).** Separate risk: `jill`'s
per-hit popup values are ALREADY sim-matched at ~99.7% (her main note) WITHOUT the +34.99% `trueDamagePct`
being live (it is engine-inert today). If those matched values were read inside her burst window, adding a
trueNormals window (which activates +34.99%) would OVER-credit by ~35% and push her further HOT (she is
board HOT 1.041). Required before enacting: a per-hit reconciliation — does real jill burst-core reconstruct
as sim × 1.0 (no true bonus ⇒ do NOT enact / the +34.99% is not a per-hit add) or sim × 1.3499 (⇒ enact the
trueNormals window)? Recipe: reconcile `jill-hitrate-core.json` burst core popups (1.65–1.98M near-band)
against a sim burst-window per-shot core with vs without trueNormals. Trail: plan §jill / §chisato,
`docs/probe-data/jill-hitrate-core.json`.

### U23 — milk-blooming-bunny's burst-window over-model, exposed by the (faithful) Gain-Pierce landing (2026-07-20)
Enacting the kit-literal S1 "Gain Pierce for 6 sec" (`gainPierce` on `shotFired`; kit-audit Phase C
ENACT-NOW, DECISIONS 2026-07-20) lit `milk-blooming-bunny`'s previously-dead Pierce package — her burst
`pierceDamagePct +117.64%` now applies to her burst-window damage. Isolated A/B: **PG 0.653 COLD → 1.301
HOT** (total ~×2). The pierce value is datamined (not tuned) and the mechanism is verified faithful (debug:
`dmgUp` 1.00→2.31 during her ~10s burst window, correctly ending at t≈13.17 — the same unit-tagged pierce
Damage-Up model grave uses). So the residual **+0.30 HOT is a SEPARATE over-model**, not the pierce. Two
candidate drivers, both measurement-gated: **(1)** her 2nd audit gotcha — the Embarrassment mode-split: in
the default auto-mode the burst `atkPct 220` + S2 DoT `447.7% ×5` magnitudes and the whole
Embarrassment-off cadence are an unmeasured parser baseline (plan §milk-blooming-bunny gotcha 2, MEASUREMENT);
**(2)** the pierce-window DPS share is unmeasured — a milk-blooming-bunny-FOCUS recording is needed to
confirm how much of her damage really lands inside the +117.64% window. Do NOT re-fudge 117.64 to cool her.
Recipe: milk-blooming-bunny-focus video, read burst-window vs out-of-window DPS split + confirm the pierce
buff-icon window. Trail: `src/skills/overrides/milk-blooming-bunny.json` caveat, DECISIONS 2026-07-20, plan
§milk-blooming-bunny.
**UPDATE 2026-07-21 (U13 DoT-crit flip):** enabling DoT crit added +0.030 to her HOT residual (1.300→1.330)
via her S2 447.7% dot now critting — a FAITHFUL mechanic, not new over-model. So when this reconciliation is
finally taken, ~0.03 of her heat is now correctly attributed to dot-crit; do not re-chase it as part of the
Embarrassment/pierce-window over-model.

### U20 — Does a unit's OWN same-cast self-buff apply to its OWN cast-instant burst damage? (Phase A A2, DEFERRED 2026-07-20)
**Owner ruling 2026-07-20: DEFER A2 entirely — blocked on an isolating measurement.** The kit-audit plan
(§A2) proposed a "same-cast self-buff guard": exclude a unit's own same-`burstCast` self-buff from its own
cast-instant burst nuke. **Premise gate (fresh-context, blind) came back CANNOT-VERIFY**, and undercut the
plan's stated basis:
- **The leak is REAL and inconsistent (P1, CONFIRMED empirically).** `ein`'s 300.02% true nuke (burst slot)
  reads `dmgUp=1.9819` = baseline 1.4289 + her own same-cast +55.3% `trueDamagePct` (burst[0]), while her
  feather lump (skill2 slot, resolved earlier) at the same instant is `dmgUp=1.4289` — no self-buff. Pure
  block-array-ordering accident: same-slot-later damage eats the self-buff, earlier-slot damage doesn't.
- **The correctness DIRECTION is unmeasured (P2, CANNOT-VERIFY).** The SSOT's only "misses same-cast
  self-buffs" statement is scoped to **skill-slot** blocks ([damage-calculation.md:190-192], [game-mechanics.md:238-240]) —
  there is NO burst-slot rule. The one measured burst-slot anchor, Cinderella (`cinderella`) §5b
  ([damage-calculation.md:380-381]), actually **INCLUDES** her own cast-granted conversion in the matching
  FinalATK (it isolates the +50% FB and *another unit's* entry aura as excluded — never the caster's own
  same-cast self-buff). No probe recording isolates this variable for any unit.
- **Blast radius:** 16 units carry a burstCast self-buff + cast-instant burst damage (`ein`,
  `elegg-boom-and-shock`, `arcana-fortune-mate`, `quency-escape-queen`, `soda-twinkling-bunny`, `privaty`,
  `liberalio`, `eve`, `raven`, `drake`, `scarlet`, `nayuta`, `asuka-wille`, `cinderella-crystal-wave`,
  `delta-ninja-thief`, `helm`[inert: `charge:false` nuke]). Several are board-CALIBRATED (soda/privaty/
  liberalio OK), so a board A/B cannot reveal the direction (co-calibration, same wall as U14). The two
  directions move `ein` OPPOSITE ways (exclude → colder; include-everywhere → hotter toward 1.0).
**RESOLVER (the real test):** a focus-video that reads `ein`'s (or `elegg-boom-and-shock`'s) burst-nuke
popup value and back-derives whether the same-cast self-buff is in it (× the buff factor or not). Until
that measurement lands, NEITHER direction is enacted; the engine keeps its current (ordering-accidental)
behavior. Trail: `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A2.

### U21 — maxwell's "highest final ATK" buff recipient (A3, HELD 2026-07-20)
**A3 landed `byFinalAtk` on 4 units but HELD `maxwell`** — her S1 grants atkPct 43.1 + chargeSpeed to the
2 highest-FINAL-ATK allies on `fullBurstEnter`. Switching her to live-ATK ranking swings her only graded
comp ("PG iron sweep" [d-killer-wife, `takina`, `milk-blooming-bunny`, `maxwell`, `liberalio`]): the +43.1%
ATK lands on `takina` (Burst II — structurally the sole possible cause), pushing takina 0.988 OK → 1.280
HOT. This is a **transient-snapshot artifact**: peak effective ATK in that comp is milk 446k > liberalio
377k > takina 234k > maxwell 132k, so takina is NOT naturally top-2 — she only ranks up at maxwell's FB
*instant* because milk's 446k (her own burst peak) is transiently at base then. Entangled with milk's known
COLD (0.681, pierce package inert) under-model, so the ranking there is untrustworthy. **RESOLVER:** a
maxwell-focus video reading which 2 allies actually receive her ATK/charge-speed buff icon at FB entry
(and whether the real game snapshots instantaneously or over the window). Until then maxwell stays on
STATIC ranking (status quo, no regression). NOTE when she lands: she'd be the first FB-enter atkPct final-ATK
selector, activating a same-frame apply-ordering dependence (other FB-enter final-ATK selectors' ATK grants
would then reorder her pick) — verify apply order at that time. Trail: DECISIONS 2026-07-20 A3,
`docs/handoffs/2026-07-20-kit-audit-implementation-plan.md` §A3.

### U19 — grave's burst-window over-model, exposed by the (faithful) timed-pierce primitive (2026-07-17)
**Surfaced by the `gainPierce` primitive (engine-modeling-gaps fix #7).** The timed-pierce window lets
"Gain Pierce for N sec" wake a unit's Pierce Damage ▲ buffs. **MECHANISM (owner-confirmed 2026-07-17):**
Pierce Damage ▲ is a real Damage-Up-bucket entry that DOES apply on the partless scope-lock boss (only
the separate pierce core+body DOUBLE-HIT is multipart-only, `PIERCE_CORE_DOUBLE=false`). So wiring it on
**grave** (measured, solo 1.005) at faithful kit values (self 52.8 + team 39.98 = +92.78 Damage Up for
10s/burst, S1's 48.4 excludeSelf'd) is CORRECT — yet it overshot her three comps from 0.836/0.831/0.800
COLD to **1.178/1.171/1.219 HOT**. The faithful pierce is now ENABLED (owner-directed 2026-07-17,
faithful>fit) — so the HOT is a live, isolated residual, not the pierce. Since the pierce is real, the
overshoot is diagnostic: grave's 0.836 COLD was a **NET of two errors** — the missing pierce (COLD) was
MASKING a compensating over-model in her burst window (HOT = the documented "AR-carry burst-window
residual"). **Open question:** where is the burst-window over-model? Candidates — Overheat II/III ramp
modeled as full-window uptime (her own ⚑3 says durationSec 7.5/5.0 would match the real ramp-in vs the
current 10s), the unmodeled Prediction-end forced reload (~9-11/fight, ⚑2, would cut shots), or her
burst-window fire-rate/crit stack. **Method:** a focused grave burst-window recording — fire count across
the 10s Prediction window + a Pierce-Damage-on/off popup to pin the real pierce magnitude; then trim the
burst-window over-model (grave should land back near 1.0 with pierce ON). Links: grave override ⚑1,
engine-modeling-gaps theme 5 / fix #7, damage-calculation.md dmgUp bucket.

### U16 — Per-unit rotation re-tune worklist (2026-07-16; over-generation RESOLVED 2026-07-21)
The rotation over-generation / mis-allocation that spawned this item is RESOLVED (`STAGE_WINDOW_FRAMES`
600→120 + first-ready stage selection; the live rotation model is `docs/STATE.md` §3, → DECISIONS 2026-07-21).
What remains OPEN is the fit-exposure worklist: the corrected rotation exposed per-cast over-credits in
overrides that were fit to the OLD (sometimes under-counted) rotation. **REFRAMED 2026-07-21: the "fit to the
old rotation" premise does NOT hold** — the residual over-credits are rotation-INDEPENDENT unit-level
over-models (chisato uniform ~1.2 across 13/13/10-FB comps; trina inversely correlated), so de-fitting
per-cast would fudge. Each needs footage-gated per-unit localization, NOT a rotation de-fit. chisato's #1
suspect is RESOLVED (her true-damage-window normals RETAIN core+crit — MEASURED, faithful, not the lever).
Worklist units: chisato, trina, naga, soda-twinkling-bunny et al. — footage-gated per-unit re-tunes.

### U15 — Rapi: Red Hood explosion residual (after the 2026-07-16 reopen)
The explosion-core reopen (DECISIONS 2026-07-16) narrowed her deficit (T3 0.84→0.91, T7 0.72→0.81,
T8 0.84→0.90, N1 0.92→0.98) but left it EXPOSED as a prediction rather than fitting it away. Still open:
- **Explosion CRIT — LANDED 2026-07-16 (`storedHit.crit:true`).** Enabled by CONSISTENCY (every other RRH
  hit already crits additively at her sheet rate; only the stored-hit release was crit-OFF, an artifact), NOT
  by the ×1.5 magnitude (which is confounded by overlapping sub-hit coefficients). T7 0.81→0.83, uniform
  +0.01–0.02, residual preserved. See DECISIONS 2026-07-16.
- **~~FOUNDATIONAL: is the crit/core bracket additive or multiplicative?~~ — RESOLVED 2026-07-22 (owner ruling:
  ADDITIVE).** The shipped additive bracket (`major += critRate×critBonus + coreRate×coreBonus`) is CORRECT and
  stays; no engine change. The measured RRH core+crit body (7,948,092 = base ×1.80) that raised this is now
  re-attributed to RRH-LOCAL causes — a distinct explosion core bonus or popup mis-association — NOT the shared
  bracket. Bounded consequence ~0.3–0.4% of her total; folded into the explosion residual below. → DECISIONS
  2026-07-22.
- **Does the rocket ATTACH actually generate burst gauge in-game?** The engine treats every skill-damage
  hit as gauge-generating (pre-existing blanket rule), so her attach cadence shifts FB timing. Not
  introduced by the reopen, but now load-bearing — worth a targeted check (meter/gauge co-read).
- **Meter carryover semantics.** Modeled as a threshold switch (120→60), not +2-fill-per-hit; these differ
  only at the FB boundary. A meter-carryover measurement (count meter-100% events across an FB entry) would
  discriminate.
- Residual remainder is likely generic MG-cold (board ~0.947).

### U8 — Probe-team residuals: what remains after the recorded re-runs
Nine probe recordings (2026-07-13, docs/probes/u8 + docs/probes/tb2) have resolved almost
everything here; per-run details in docs/probe-runs.md. STILL OPEN after test battery 2:
- **ein 0.71-0.76** (both run-E configs) — she cooled when the burst-gauge model was
  rebuilt (gauge v4) and is now the largest team-fight residual; her kit (stored/stacked
  skill damage) needs a review or an ein-focused recording.
- Mild burst-3 heat in run I (chisato 1.22, grave 1.15, noir 1.07) — partially the sim's
  ~7% fast rotation there.
- Run A: WHO casts Burst 2 each rotation (mint vs prika duet order) is still unverified —
  the test-battery recording used Alice's sniper-scope camera, which hides the burst
  cut-ins; needs one more run with a different focus unit. Also observed: Alice's total
  came in +9.3% vs the original run A while every other unit repeated within ±5% — the
  camera-focused unit generates x2.5 burst gauge on its charge shots (see the answered
  gauge item), so WHICH unit holds camera focus genuinely changes a fight's totals.
- Cinderella items: all SOLVED (docs/probe-runs.md, runs e3 + battery tests 1-2).
- Jill: SOLVED (battery test 4 — see the answered items).

UPDATE 2026-07-14 (714 noon probe, nine focused testing-request fights — docs/probe-runs.md).
Every focused (middle-slot) unit in that batch is in the enikk top-100 supported set, so its
read is meta-valid. New residuals / confirmations from the FOCUSED units:
- **Scarlet: Black Shadow — RESOLVED 2026-07-14 (CALIBRATED ⛑).** Her tracked ~1.23 heat,
  confirmed by a second focused fight (N3 boss Iron, 1.31; T1 1.18) and localized by her N3
  popup read: her charged-normal popup reads 1.55M vs sim 1.60M (correct), so the excess was
  entirely in the proc bucket. The blend-to-6 over-credited the burst-window proc tripling; a
  cadence sweep across BOTH fights lands hitCount 6→10 (near the literal every-9 outside-burst
  rate — the tripling barely materializes), moving T1 1.18→1.00 and N3 1.31→1.07 with no
  teammate/FB blast radius (self-damage procs). Still calibrated tier; re-check if a frame-exact
  proc-cadence read lands.
- **Guillotine: Winter Slayer — NEW residual, consistently hot 1.21–1.31, LOCALIZED to her
  normal fire.** First FOCUSED measurement (N8 boss Fire, bursting: 1.21) plus the non-bursting
  bench read (PH: 1.31). Decomposition localizes it precisely: her burst DoT is level-11-scaled
  and grades ACCURATE (N8 real DoT ≈114M ≈ sim 115M), so her Hero-Level auras + effective level
  are CORRECT; the excess is entirely in her normal-fire bucket, uniformly ~26% over in both
  fights (real normals ≈224M vs sim 294M in N8; PH 1.31 is normals-only). Ruled OUT: the
  near-infinite-uptime instantReload charfix (removing it moves her only 1.31→1.26 / 1.21→1.16).
  A flat 0.76× normal haircut would fix both to ~1.0, but the MECHANISM is unidentified — the
  suspect is a datamined MG weapon parameter (rate_of_fire / per-shot atkPct 13.7). NOT refit:
  needs a datamined recheck against the reference sim (nikke-einkk), since MG normals are not
  popup-readable and her level-scaled effects are confirmed right. Do not apply a blind normal
  scalar. Her auras also buff Water teammates, so any change needs a blast-radius pass.
- **milk-blooming-bunny 0.73** (focused, N10) — CONFIRMS the accepted DECISION (~0.7, poor
  auto-play); N10's total also graded exact (782M sim = 782M real). No action.
- **Vesti: Tactical Upgrade 3.23** (UNFOCUSED, N8) — her custom-volley model (4 rockets over
  ~1s, charFixes) is badly over. NOT a tuning target from this batch: she is unfocused here and
  is outside the enikk top-100 set. Needs a vesti-focused recording before any refit.
- rapi-red-hood (0.92, N1) belongs to her own active rework increment; modernia (0.90, N2) and
  snow-white (1.11, N4) are confounded by that comp's full-burst-count anomaly; privaty (1.58,
  N5) is already calibrated (0.97 on T4) — her N5 heat is Arcana: Fortune Mate's team buff
  inflating the whole side (arcana 1.88 / privaty 1.58 / snow-white:HA 1.33 together), and
  Arcana is unfocused here.

### U11b — Unfocused charge-weapon gauge generation (⚑ the one open gauge knob)
The burst-gauge model is now datamined + solo-measured (see the answered gauge item), but
no recording yet isolates an UNFOCUSED charge unit's full-charge generation (a solo unit
is always camera-focused). Flat x1.0 makes every sniper/launcher-heavy 5-unit fight
10-20% cold vs the anchored totals, so the engine keeps x2.2 ⚑ for unfocused charge
units (between flat and the focused x2.5). One recording of a team fight with the gauge
bar visible and a sniper NOT holding camera focus settles it. The datamined
full_charge_burst_energy column (~250 = 2.5%) may be the true additive mechanism.

### U12 — Autofire vs release-fired classification (USER-TESTED 2026-07-13; partial)
The autofire ("new") system is SPARSE. User-tested: autofire = neon-VE (+ known: anis: star,
liberalio, nayuta-in-burst); old-style release-fired = diesel-WS, mint, prika, ada, velvet;
cinderella has NO inter-rocket delay (custom 1s wind-up, already modeled). ENGINE: the 22f
release latency (one mechanism, measured on Helm SR + Maiden RL) now applies to ALL SR+RL
by default, autofire exempted via charFixes.noBoltRecovery. Board effects: mint 1.21→0.91 ✓,
trina 2.62→1.98, maiden default-reproduced (solo 1.01). UNTESTED + flagged:
- SBS: AUTOFIRE CONFIRMED (user-tested, second round) — exemption now permanent. Bonus
  validation: her user-observed 150% charge cap matches the DB chargeMultiplier column
  exactly (the per-unit charge multipliers are trustworthy). Her 1.23 heat is a separate
  open item (see the residual list).
- tia: 1.09→0.85 with latency (kept latent) — needs charge-meter test.
- User-classified (2026-07-13, round 2): laplace, a2, raven, rapunzel, noise, crust,
  anchor-IM, arcana = ALL old-style (engine default latency already correct). vesti-TU =
  custom volley (4 rockets over ~1s post-charge, ~0.5s/rocket — modeled via charFixes).
- trina: CONFIRMED old-style (user-tested 2026-07-13, third round — 22 frames between
  shots, exactly the engine's default release latency; no change needed).
  REMAINING unclassified: tia only (currently latent per the sparse-autofire default;
  she reads 0.85 latent vs 1.09 bare — worth a charge-meter glance).

### U3 — CCW residual (1.15 no-advantage / 1.27-1.31 with elemental advantage)
The U1 rule fix (her 833.79% core-strike rider no longer receives the core bucket) plus
crit-on-procs roughly cancelled. Two remaining leads: (a) the ratio gap (~1.14) between the
iron-weak fight (T8, elemental advantage) and the wind-weak fight (T5, no advantage) says she
gained less from elemental advantage in reality than the sim's x1.1 — do function-damage riders
skip the element bucket for HER delivery type?; (b) her every-5s 900% crosshair cadence.

