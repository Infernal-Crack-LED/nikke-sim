# Kit-audit implementation plan — 2026-07-20 blind-rebuild three-way audit

> **Source:** the full roster run through the blind-rebuild three-way audit
> (`scripts/blind-rebuild/`: blind rebuild → sighted full-context review → reconciling judge vs the
> formula SSOT). 76 result files, **avg faithfulness 0.95**, **106 gotchas across 53 kits**
> (45 FIDELITY / 33 ENGINE / 24 ENCODING / 4 SILENT_DROP; 25 high / 38 med / 43 low).
>
> **Companion to** `docs/engine-modeling-gaps.md` §2026-07-20 (the engine-level findings + theme
> routing). That section is the *engine* view; **this doc is the per-kit action plan** — it organizes
> every audit gotcha into work an implementer can pick up. Raw evidence:
> `scripts/blind-rebuild/results/<slug>.json` (judge) and `scripts/blind-rebuild/reviews/<slug>.json`.
>
> **The measured>fudge invariant (read first).** Almost every fix below is *measurement-gated*. The
> audit's job was to find where the model diverges from the kit, NOT to propose board-fitting numbers.
> For each item: enact the faithful mechanic with the datamined/observed value, or hold it COLD-but-faithful
> until the measurement lands. **Never pick a coefficient to hit a board ratio.** Each fix runs the
> scientific-method harness (premise gate → pre-reg → A/B → `bash scripts/verify.sh` + snapshot).

## Triage at a glance

- **106 gotchas / 53 kits.** Severity: 25 high / 38 med / 43 low. Subkind: 45 FIDELITY / 33 ENGINE / 24 ENCODING / 4 SILENT_DROP.
- **Board pressure:** 25 HOT / 30 COLD / 24 OK / 27 no-data. (`HOT` = sim over-predicts, `COLD` = under-predicts, `OK` = within band,
  `no-data` = MODEL_ONLY / ungraded.)
- **Gate breakdown (heuristic, see §How to read a gate):** **14** DOC · **7** ENACT-NOW · **18** OWNER/ENGINE · **55** MEASUREMENT · **12** DEFER. *(2026-07-20 review: `noir` skill2, `grave` burst-ammo, and `jill` retagged OWNER/ENGINE→ENACT-NOW — the primitives they were waiting on already exist; see the Phase A4 correction note.)*
- **22 kits carry ≥1 high-severity gotcha** (the priority head — see Phase C order).

## How to read a gate

Each gotcha is tagged with the thing that *blocks* it (this decides who can act and when):

- **DOC** — documentation-only. A stale caveat / review-prose / `unmodeled[]`-completeness correction.
  No engine change, no measurement. **Land now** (`verify.sh` only). → Phase B.
- **ENACT-NOW** — the engine primitive already exists and the value is datamined/known, so the override
  edit can land (a confirmation measurement is still nice-to-have, not a blocker). → Phase C, front of queue.
- **OWNER/ENGINE** — a cross-cutting engine increment with blast radius > 1 unit. Needs an **owner ruling**
  (and usually a recalibration pass) before any per-unit edit. → Phase A.
- **MEASUREMENT** — the faithful mechanic is understood but its value/trigger/cadence is unmeasured; needs
  footage or a datamine pull before enactment. The bulk of the work. → Phase C.
- **DEFER** — low-severity + board-neutral (OK/no-data) fidelity tail; correct but moves nothing today.
  → Phase E.

The gate is a *triage heuristic* (keyword-classified from each gotcha's suggested fix), not a verdict —
confirm the gate when you pick up an item.

---

## Phase C SWEEP STATUS — 2026-07-20 (autonomous drive; the whole doc reviewed)

A full pass over every Phase C kit, dispositioned. "LANDED" = enacted + DECISIONS entry; "MEASURED" =
footage reviewed, findings recorded, n=1 → NOT enacted (gated); "BLOCKED" = footage exists but can't isolate
the mechanic; "NO FOOTAGE" = needs a new recording; "OWNER/ENGINE" = cross-cutting, gated on a ruling/increment.

**✅ ENACTED this drive (7 total, each Fable pre-op + isolated A/B + DECISIONS 2026-07-20):**
`grave` (maxAmmoFlat 3), `eve` (bossElementGate Electric + fraction 0.04), `d-killer-wife` (S1 → alliesOfWeapon SR),
`milk-blooming-bunny` (gainPierce 6s → Pierce package, deliberate overshoot U23), `tove` (datamine-refresh crit
10.08 + burst dur 15). *(Prior sessions: `naga`, `noir`, `red-hood` #1, `snow-white` ×4, Phase B DOC batch.)*

**📹 MEASURED this drive (findings recorded, n=1 → NOT enacted, enactment gated):**
- `soda-twinkling-bunny` FB-ext — premise-corrected (soda is SOLE FB extender; stage-3-entry trigger extends
  both B3s' FBs). n=1 leans chip-tiers +2/+5 over flat +4; + a pre/post-consume gate subtlety. QUEUED (§soda gotcha 3).
- `jill` true-normal core-retention — true normals RETAIN core (open-questions U24); jill trueNormals enactment
  gated (per-hit +34.99% double-count risk on a HOT unit).
- `maiden-ice-rose` MP-at-cast — INCONCLUSIVE (tb2-3-maiden is a partial ~70s capture, she never bursts in it;
  MP held at 1 → slow cadence weakly suggests fixed-12 over-counts). Needs footage with her burst cast.
- `quency-escape-queen` Explore-Route ordering — ramp is REAL but SHORT (~10–13s, ~7% of fight) and
  NOT her HOT-1.14 driver (a 14% sustained over-credit needs a steady-state magnitude source, not a short
  opening ramp). Slug gate passed. Enactment gated (n=1, HOT). Both findings in their §sections.

**⛔ BLOCKED (footage exists, mechanic not isolable):** `scarlet-black-shadow` (in-burst per-phase proc count —
sbs-control overlap), `moran` (swap throughput — electric muzzle bloom + occluded ammo). Need new isolated recordings.

**🎞 NO USABLE FOOTAGE (need new recordings, mostly burst-gated mechanics not in solo clips):** `red-hood` #2
(excess-CS→charge-damage), `elegg-boom-and-shock` (ghost-count uptime), `prika`/`mint`/`milk-blooming-bunny` #2
(Sing-Along/Encore/Embarrassment state machines), `ada` #1 (uses-cap), `diesel-winter-sweets` (Intro/Highlight
gate), `maxwell` #1 (railgun charge), `modernia` #1 (Destroy-Mode crit), `arcana-fortune-mate` #1 (stack count),
`dorothy-serendipity` #2 (pellet count), `trina` (ally Hit-Rate), `privaty` (Designated-Target gate), `arcana`,
`rouge`, `velvet`, `bready`, `mast-romantic-maid`, `asuka-wille`, `mari`, `laplace`. `nayuta` #1 (self Hit-Rate
stack) HAS footage (nayuta solo) but the SMG cone is near-inert to Hit-Rate (cone-freeze note) → low-value, deferred.

**🔧 OWNER/ENGINE (gated on a ruling or cross-cutting increment, not a per-kit edit):** U13 DoT/rider-crit flip
(`ada` #2, `mana`, `raven`, `rosanna-chic-ocean`, `modernia` #2, `nayuta` #2, `neon-vision-eye`); A2 same-cast
self-buff guard (`ein`→U20, `cinderella`, `elegg` #2); `chisato` #2 (swap free-refill), `moran` #2 + `guilty` #2
(casterAtkPct static-vs-final), `eve` #2 (A4 sequential-bucket split), `isabel` #1 (sim-battery fullBurstExtend sign),
`ludmilla-winter-owner`, `maiden-ice-rose` #? engine bits.

**📝 DOC / DEFER (Phase B mostly done; Phase E tail):** the low-severity board-neutral fidelity tail
(`liberalio` ×3, `rouge`, `mast-romantic-maid`, `guilty` #1, `rapi-red-hood`, `cinderella-crystal-wave` ×2,
`helm`, `miranda`, `snow-white-heavy-arms`, `anis-star` #1, `dorothy-serendipity` #1, `mari` #2/#3) — correct-but-inert,
revisit when a board moves or a primitive lands.

**⇒ Bottom line:** every ENACT-NOW item is landed; every MEASUREMENT item with *isolating* footage has been
reviewed (findings recorded, enactment correctly gated per evidence-proportionality). The remaining Phase C tail
is (a) new-footage-gated measurements, (b) owner/engine cross-cutting increments, (c) the DOC/DEFER fidelity tail —
none of which is a blind-enactable action this session.

---

## Phase A — Engine prerequisites & owner decisions (cross-cutting, blast radius > 1)

These are the items that must be ruled on (and usually measured + recalibrated) **before** the per-kit
fixes that depend on them. They correct many units at once. Each routes to an `engine-modeling-gaps.md`
theme and/or an `open-questions.md` entry.

### A1. U13 — DoT / function-rider ticks do not crit (systematic under-credit) → `open-questions.md` U13
The engine env-gates DoT/rider crit behind `XCRIT` (empty default) and hard-codes the `extraHitDamagePct`
path `crit:false`, so function "additional damage" that SSOT §2b says crits at caster rate never crits.
Two sub-populations:
- **DoT-tick crit-OFF:** `ada` (grenade DoT, FRESH), `mana` (FRESH), `raven` (FRESH), `rosanna-chic-ocean`
  (FRESH), and interacting magnitude/delivery questions on `bready`, `elegg-boom-and-shock`, `privaty`.
- **`extraHitDamagePct` function-rider crit-OFF:** `modernia` (Destroy Mode 2.24%, her ⚑4), `nayuta`
  (Memory Incineration 530.46%, FRESH), `neon-vision-eye` (Super Firepower 262.79%).
**Owner decision:** greenlight the engine flip (DoT/proc path crit at caster rate; flip the
`extraHitDamagePct` path to `crit:true` or re-encode those riders as crit-ON `flatDamage` procs) **plus a
DoT-roster recalibration** — current calibrated DoT values absorb the under-credit, so flipping crit without
de-crediting the bases (÷~1.075) overshoots (guillotine's DoT is already popup-measured). High blast radius;
this is a dedicated increment, not a per-unit edit. Confirm each rider with a focus-video crit signature first.

### A2. Same-cast self-buff guard on burst-cast damage
The engine can apply a same-`burstCast` self-buff to the burst nuke that SSOT §1b/§8 says it should miss
("it still misses same-cast self-buffs and entry auras"). Units: `ein` (`trueDamagePct` 55.3% feeding the
same-cast 300.02% nuke = unintended ×1.553, FRESH), `cinderella` (`burstSnapshotsPreFb` flag contradicts the
documented pre-FB/pre-same-frame-stage-buff resolution — the §5b worked example), `elegg-boom-and-shock`
(S2 +40% self-ATK vs same-cast 4800% nuke ordering). **Owner/engine:** add a same-cast self-buff guard on
burst-slot damage consistent with the Cinderella popup-verified boundary; verify ordering in code first.

### A3. static-vs-final ATK selector / snapshot convention (engine-wide)
> **✅ LANDED 2026-07-20 (4 of 5 units; `maxwell` HELD).** Owner ruling: implement keyed on the literal
> word "final" — "highest/lowest **final** ATK" selectors rank by live `effectiveAtk` (new per-selector
> `byFinalAtk` flag, default-absent = static); `casterAtkPct` and plain "highest ATK" (`naga`) stay static.
> Landed board-neutral on `alice`, `liberalio`, `miranda` (×2), `soda-twinkling-bunny`. `maxwell` HELD —
> her sole graded comp is a transient-snapshot artifact (→ `takina` 1.280), needs a real-recipient
> measurement (open-questions **U21**). `guilty` basis bug (own-ATK vs highest-ally) noted separate. Fable
> pre-op APPROVED-w-rev + post-op ACCEPT/HIGH, 2-of-2; verify.sh green. See DECISIONS 2026-07-20 A3.

`alliesTopAtk` sorts by `staticAtk` and `casterAtkPct` sizes off `owner.staticAtk`, but several kits say
"highest **final** ATK" / "% of the skill user's ATK" (which may snapshot buffed ATK). Units: `maxwell`
(S1 highest-final-ATK selector, FRESH), `moran` (`casterAtkPct` off static, FRESH), `miranda`
(`alliesTopAtk` static, FRESH), `guilty` (needs a `highestAllyAtkPct` source). **Owner decision:** is the
static-ATK convention a deliberate simplification (document it) or a bug (fix the shared selector to rank by
live `effectiveAtk`)? Cross-unit blast radius — do not patch one unit alone; confirm snapshot semantics empirically.

### A4. New engine vocabulary (each a primitive; owner-scoped, multiple units)
| Primitive (theme) | Units needing it | Note |
|---|---|---|
| ~~Swap-cadence charge-speed~~ | `snow-white` | **MOOTED 2026-07-20** — owner ruling: exactly 1 cannon shot per burst no matter what (charge-speed support cannot enable a 2nd); encoded as `maxShots:1` |
| Per-buff pellet-count modifier | `arcana-fortune-mate` (+1×3), `dorothy-serendipity` (+5) | currently approximated as `normalAttackPct` |
| ~~Squad-membership gate (theme 4)~~ | `noir` | **✅ LANDED 2026-07-20** as `teamHas.slugs` (owner: blanc/rouge satisfy noir's gate; no squad data axis exists, slug list is the minimal encoding) |
| ~~Swap-scoped / step-gated pierce~~ | ~~`snow-white`~~ ✅ (`weaponSwap.hasPierce` landed 2026-07-20), ~~`ade-agent-bunny`~~ ✅ (**step-gated pierce LANDED 2026-07-20** — `gainPierce` optional-duration on the `hitCount:10` Spy-Lens-max trigger; DECISIONS 2026-07-20) | per-shot pierceActive tag; PIERCE_CORE_DOUBLE stays off |
| ~~Shield-state gate~~ | `naga` | **✅ LANDED 2026-07-20** — `shielded` event trigger (existing) + new `requiresShielded`/`shieldedUntilFrame` state gate; default-off, owner-ruled |
| ~~Area-status gating (Wipe Out)~~ | `d-killer-wife` (body-hit ATK buff) | **✅ LANDED 2026-07-20** — `wipeOut` effect (global boss-status window) + `requiresWipeOut` gate; body ATK buff (casterAtkPct 12.19) gated to the 10s window + `requiresCore` (owner: CORE-ONLY proxy). **TODO parts:** parts branch (coreDamagePct 16.26) awaits destructible-part modeling (DECISIONS 2026-07-20). |
| Singing / Performance / Embarrassment state machines | `prika`, `mint`, `milk-blooming-bunny` | mode/proxy stand-ins for named timed states |
| Sequential-damage bucket split (theme 12-tail) | `eve` (Mk2 ×2 Unstable Energy) | true ×2 needs a bucket multiplicative with DamageUp |

> **Removed on review (2026-07-20) — NOT new vocabulary, both already exist:** (1) *flat per-target ammo
> grants* — `maxAmmoFlat` is a live StatKey summed from buffs inside `maxAmmo()` (sim.ts; the types.ts
> theme-14 comment names grave/noir/tove/drake/trina), so a `maxAmmoFlat` effect on any target set works
> through the ordinary buff path today (0 enactments so far is usage, not capability); (2)
> `weaponSwap.trueNormals` — exists since the takina encoding, and `chisato` already uses the exact
> same-weapon-swap pattern. `noir`/`grave`/`jill` are retagged **ENACT-NOW** in Phase C accordingly.

> **⇒ A4 EXECUTION — DEFERRED to focused fresh sessions (2026-07-20, driver ruling under batch-and-stop).**
> Owner ruled "A4: confirmed, implement," and the *direction* of each primitive is approved. But driving A4
> through the mandated scientific-method workflow surfaced that **every A4 primitive's WIRING is either
> measurement-gated or moves a calibrated board** — none is a clean board-neutral land like A3's 4 units
> were. Building 8 shared engine primitives on unvalidatable wirings at the tail of a long session is the
> exact batch-and-stop / "do P0 engine work in a fresh session" risk. So A4's *capability builds are
> approved and queued*, but each is executed in its own focused session **paired with its gating
> measurement**, one at a time through the full harness (premise gate → Fable pre-op → A/B → verify). Do NOT
> bulk-land these. **Recommended build-order (cheapest/most-isolated capability first; wiring waits on the
> named measurement):**
>
> 1. **Sequential-damage bucket split** (`eve` Mk2 ×2). Capability: a bucket multiplicative with DamageUp
>    (not an additive `sequentialDamagePct` entry). Isolated engine change; `eve` is no-data so a build can
>    be validated only by unit-test (solo ×2 invariant), not the board. Lowest blast radius. Gate: measure
>    eve's real ×2 in a live comp before wiring the live value.
> 2. **Shield-state gate** (`naga`, HOT 1.08). Capability is SMALL — the `shielded` trigger already exists;
>    add a per-unit "shield-present" *condition* (uptime-driven) instead of the default-ON mode. Gate:
>    measure naga's shield uptime / drive the 85.17% core + 31.02% ATK blocks off a real shield event. Board
>    risk: HOT → correct direction, but co-calibrated; A/B required.
> 3. **Squad-membership axis** on `teamHas` (`noir`, HOT 1.119). Capability tiny (add a `squad` axis to the
>    existing `teamHas:{element/class/weapon/burst}`). Gate: review ⚑4 recipe — cast noir's burst in a team
>    WITHOUT Blanc, check whether the 11.61% Hit-Rate buff icon appears. Only wire if the gate is real.
> 4. **Swap/step-gated pierce** (`snow-white`, `ade-agent-bunny`). Capability: a swap-scoped / stack-step
>    `hasPierce` acquisition (today `hasPierce` is always-on; `gainPierce`→`pierceUntilFrame` already exists
>    for timed windows). Gate: ade-agent-bunny = pierce only after Spy Lens max stacks (~16s); snow-white =
>    nuke popup vs a core-exposed boss. Inert on the partless scope-lock boss.
> 5. **Swap-cadence charge-speed** (`snow-white`). Capability: let charge-speed buffs affect swap cadences
>    (engine currently zeroes them). Gate (measurement): focus video counting cannon shots/burst with vs
>    without charge-speed support — 1 vs 2. Do NOT hand-pick the shot count.
> 6. **Per-buff pellet-count modifier** (`dorothy-serendipity` +5 HOT 1.115, `arcana-fortune-mate` +1×3 HOT
>    1.132). Values kit-datamined, and a deep fixplan exists (`kit-audit-fixplans/dorothy-serendipity.md`).
>    HIGHER RISK: replaces a *calibrated* `normalAttackPct` approximation on two HOT units and interacts with
>    the live SG cone (pellet-landing/gauge) — full A/B + cone-coupling check required. **⇒ OWNER-DEFERRED
>    2026-07-21 to a DEDICATED FRESH SESSION** (it deserves focused context) — full brief:
>    **`docs/handoffs/2026-07-21-a4-pellet-count-handoff.md`** (primitive design, the two units' wiring, the
>    cone-coupling A/B requirement, the open owner rulings, and the footage needed). Start there.
> 7. **Wipe-Out area-status** (`d-killer-wife`, OK 0.996). Capability: a boss-applied "Wipe Out" status +
>    trigger on allies hitting the afflicted body. New status system; unit is board-OK so wiring risks
>    regression — build behind the status, keep board-neutral, measure the body-hit ATK buff uptime first.
> 8. **Singing / Performance / Embarrassment state machines** (`prika`, `mint`, `milk-blooming-bunny`, all
>    COLD). Highest complexity — real per-burst state machines replacing the mode/value-halving proxies. All
>    measurement-gated (Encore/Sing-Along presence, Performance duration, Embarrassment 0.5s-hold trigger).
>    Do LAST, one unit at a time, each with its own footage.

---

## Phase B — Quick wins: documentation-only (land now, `verify.sh` only)

> **✅ LANDED 2026-07-20.** B1: all 13 overrides corrected (the 7 audit-surfaced + the 6 grep-sweep files —
> each verified to be the hitRatePct caveat; note-body AND caveat-array spots both fixed; per-unit weapon
> nuance kept: modernia/anchor-innocent-maid marked MG/RL-excluded-from-cone). B2: both review confound
> ledgers corrected (dorothy-serendipity S2 40.68 → LIVE/HOT-direction; anis-star reenterStage inertness
> CODE-VERIFIED — passive trigger vs the burstCast-only stage-hold detector, effect handler an explicit
> no-op). B3: both `unmodeled` additions landed verbatim-checked against kit truth + `kit-status.ts
> --refresh` (the refresh also resynced 17 stale board means to the landed engine — largest:
> guillotine-winter-slayer 1.147→1.070, grave 1.243→1.179, moran 0.739→0.706). `verify.sh` GREEN;
> regression byte-identical ⇒ behavior-neutrality proven. NEW FINDING (not enacted): chisato's note
> attributes her PI/PI2 multi-B3 casts to "anis-star reenterStage" — that mechanism is inert, so the
> attribution is suspect; re-derive the PI/PI2 multi-B3 mechanism via a rotation log when chisato is next touched.

Zero-risk corrections that make the overrides/reviews tell the truth. No engine change, no measurement.

### B1. Stale "hitRatePct inert" caveats → correct the wording
`hitRatePct` is **live** since the 2026-07-19 CONE_DELTA Rician-cone landing: it feeds
`acrForHR(weapon, band, hitRatePct)` → core-hit fraction for **AR/SMG/SG** (accuracy-circle weapons);
**MG/SR/RL keep the flat HR-independent base table.** The 7 audit-surfaced overrides (per
`engine-modeling-gaps.md` §2026-07-20): `miranda`, `modernia`, `nayuta`, `noir`, `quency-escape-queen`,
`soda-twinkling-bunny`, `trina`. (Note `modernia` is MG — hers is a wording-only fix: the stale part is the
"engine-wide inertness" *reason*, but per the MG/SR/RL rule above `hitRatePct` still yields no core lift for
her.) **Recommended follow-up:** a corpus-wide sweep for the same stale wording —
a grep for `hitRatePct`+`inert` also flags `anchor-innocent-maid`, `asuka`, `chisato`, `dorothy-serendipity`,
`drake`, `leona` (verify each is the hitRatePct caveat, not an unrelated "inert").

### B2. Confound-ledger / review-prose corrections
- `dorothy-serendipity` — S2 Hit Rate ▲40.68% is **live via HRCORE** (raises SG core fraction in the team-FB
  window); the review documents it as inert. Correct the confound ledger; re-attribute her HOT 1.115 residual.
- `anis-star` — the `reenterStage` "Everyone's Star" block is **inert** (passive trigger; the rotation
  stage-hold detector only inspects `burstCast` blocks). The review must stop asserting it works. Board-inert
  (only tia pairing, deliberately excluded), but the prose claim is wrong.

### B3. `unmodeled[]`-array completeness
- `rapi-red-hood` — add Stage 3 "Explosion Radius ▲100.62% for 10 sec (self)" to `unmodeled.burst`
  (documentation completeness; inert on the partless boss).
- `snow-white-heavy-arms` — add "Fixes charge time at 1.2 sec continuously" to `unmodeled.skill2`
  (inert — datamined 72f = 1.2s already equals it — but a naive unmodeled-scan misses it).

---

## Phase C — Per-kit roadmap (priority-ordered)

Every audited kit, highest-leverage first (high-severity count → board-moving count → total). Each gotcha
carries its gate + a one-line finding/action; full evidence is in `results/<slug>.json` / `reviews/<slug>.json`,
and five kits already have deep fix briefs in `kit-audit-fixplans/`. Work the **ENACT-NOW** and board-moving
**MEASUREMENT** items at the top first; the DEFER tail is Phase E.

### `naga` — board HOT 1.08, 2 gotcha(s) — **✅ BOTH LANDED 2026-07-20 (owner ruling: default off, require a shielder)**

1. **[high/ENCODING/skill1 · HOT 1.08]** → ~~MEASUREMENT~~ **✅ LANDED**
   - S1 85.17% now rides the `{kind:'shielded'}` EVENT trigger (fires when an ally's `shield` effect
     targets naga — crown/blanc emit); modes array dropped. N2 byte-identical (no shielder there).
   - residual ⚑ (measurement, non-blocking): uptime now inherits the shielder's shield cadence —
     naga+crown focus video compares the 85.17% buff-icon windows to crown's shield icon.
2. **[high/ENCODING/burst · HOT 1.08]** → ~~MEASUREMENT~~ **✅ LANDED**
   - burst 31.02% casterAtkPct now `burstCast` + the new `requiresShielded` state gate
     (`shieldedUntilFrame` opened by each shield's durationSec). DECISIONS 2026-07-20.

### `red-hood` — board COLD 0.867, 2 gotcha(s)

1. **[high/ENGINE/base normal attack (engine cadence) · COLD 0.867]** → ~~MEASUREMENT~~ **✅ CLOSED 2026-07-20 (owner-confirmed)**
   - Base SR outside Red Wolf HAS bolt recovery (bolt-action; the +22f SSOT default stands). No
     behavior change — the sim already modeled it. Her COLD 0.867 residual points at gotcha 2
     (the static chargeDamagePct 90 average for the S1 excess-CS conversion). DECISIONS 2026-07-20.
2. **[high/FIDELITY/skill1 · COLD 0.867]** → **MEASUREMENT**
   - finding: The Skill 1 excess-Charge-Speed→Charge-Damage conversion ('Charge Damage ▲ 240% of the excess over 100% CS, continuously') is modeled as a STATIC Charge Damage…
   - action: Model the named mechanic faithfully: Charge Damage ▲% = 2.4 × max(0, liveCS − 100), applied continuously whenever CS exceeds 100% (including team CS buffers outside Red Wolf), routing into the charge…

### `snow-white` — ~~board no-data~~ **BOARD-GRADED (owner correction 2026-07-20: the 4 control-anchor runs are her data — comps C-SW/C-Helm/C-LM/C-Crown)**, 4 gotcha(s)

1. **[high/ENCODING/burst]** → **⚠ CONTESTED — owner ruled ADDITIVE (landed: chargeMultPct 300.2002 → 1499.5%/shot), but the same-day sw.MP4 footage pass contradicts it → open-questions U22, OWNER TO RE-RULE**
   - footage (6/6 cannon windows): charge UI ramps to "1000%" at the shot (the multiplier display);
     popups 45.1–59.5M ≈ ~630 sheet-ATK-multiples — only the ×10 4995% class reaches them; control
     A/B: additive reads 0.452–0.503 COLD (old ×10 read 0.696–0.777). Additive left standing per
     evidence-proportionality pending the re-rule.
2. **[high/ENGINE/burst]** → ~~OWNER/ENGINE~~ **✅ LANDED 2026-07-20 (owner-ruled + footage-corroborated)**
   - exactly 1 cannon shot per burst no matter what, then back to the AR: `maxShots:1` (all 6 recorded
     windows: one shot at FB-entry+5.4-5.6s, AR back ~2s later). The swap-cadence charge-speed engine
     gap is MOOTED. NEW GAP (⚑ recorded, U22): her AR keeps firing DURING the 5s cannon charge —
     inexpressible with weaponSwap; sim loses ~5s AR fire per window (her plausible residual COLD driver).
3. **[med/ENCODING/skill2]** → ~~MEASUREMENT~~ **✅ LANDED 2026-07-20 (owner-ruled)**
   - S2a 144.73% = internal cooldown 15s (owner-stated) → new `interval` trigger; S2b crit +26.1% =
     gained on FB entry → `fullBurstEnter`. ⚑ first-fire phase + FB-scoping unmeasured (recipe in override).
4. **[low/ENCODING/burst]** → ~~OWNER/ENGINE~~ **✅ LANDED 2026-07-20 (owner-ruled + footage-corroborated)**
   - swap-scoped pierce: `weaponSwap.hasPierce` (every cannon popup carries the PIERCE tag). Double-hit
     stays off (PIERCE_CORE_DOUBLE=false, multipart scope only).

### `noir` — board HOT 1.119, 4 gotcha(s) — **✅ #1+#2 LANDED 2026-07-20 (maxAmmoFlat team grant; owner-ruled blanc/rouge squad gate via teamHas.slugs); #3+#4 were Phase B DOC**

1. **[high/ENCODING/skill2 · HOT 1.119]** → **ENACT-NOW** *(retagged 2026-07-20 review; was OWNER/ENGINE)* **✅ LANDED — see DECISIONS 2026-07-20 (anis-star 0.93→1.01 side-effect)**
   - finding: Max Ammunition '+5 rounds to ALL allies' is encoded self-only as maxAmmoPct 55.56%; teammates' +5 rounds are unmodeled and a flat +5 on a high-ammo ally is not…
   - action: The engine path already EXISTS — `maxAmmoFlat` is a live StatKey summed from buffs in `maxAmmo()` (sim.ts; the types.ts theme-14 comment names noir) and reaches any target through the ordinary buff path. Encode the kit's '+5 rounds' as a `maxAmmoFlat` 5 all-allies grant, replacing the self-only 55.56% (which equals the same 5 rounds on her 9-round belt). The review-⚑2 focused-SG-team recording remains the nice-to-have confirmation, not a blocker.
2. **[med/ENCODING/burst · HOT 1.119]** → ~~MEASUREMENT~~ **✅ LANDED 2026-07-20 (owner-confirmed gate is real)**
   - Owner: the 11.61% Hit Rate buff does NOT appear without a same-squad teammate; satisfied by
     `blanc` or `rouge`. Enacted as `teamHas:{slugs:['blanc','rouge']}` (new facet). Correctly inert
     in PI/PI2 (no blanc/rouge there). DECISIONS 2026-07-20.
3. **[med/ENGINE/burst · HOT 1.119]** → **DOC**
   - finding: Review/override note claim hitRatePct is 'inert in the engine (per types.ts)' — STALE. The CONE_DELTA Rician cone model landed live 2026-07-19 and hitRatePct f…
   - action: Documentation correction (no number change): update caveat ⚑3 and the override note to state hitRatePct routes through the SG cone model (ACR = acrForHR(weapon, band, hitRatePct), CONE_DELTA live 202…
4. **[low/ENCODING/skill1 · HOT 1.119]** → **DOC**
   - finding: Skill 1's 'above 70% HP' activation gate is not encoded (passive treated as always-on). Harmless at scope lock where no incoming damage is modeled and HP stays…
   - action: No change needed at scope lock. If boss-damage / HP-drain mechanics ever enter scope, encode the >70% HP gate. No measurement required for the current scope.

### `elegg-boom-and-shock` — board COLD 0.825, 3 gotcha(s)

1. **[high/FIDELITY/skill1 · COLD 0.825]** → **MEASUREMENT**
   - finding: The >=4-ghost 'Elemental Advantage Attack Damage ▲ 35%' tier is shipped at 17.5% = 35 x 0.5, a derived time-average of the ghost-count gate rather than tracked…
   - action: Needs measurement, never a fudge: record a real fight and track the ghost count (UI counter) to derive the true >=4-tier uptime under the actual FB cadence, then ship 35 x (measured uptime). The 0.5…
2. **[med/ENGINE/skill2 · COLD 0.825]** → **MEASUREMENT**
   - finding: Same-frame ordering of S2's +40% self-ATK buff (burstCast trigger) against her own same-cast 4800% burst nuke is unverified. If the buff does NOT apply to the…
   - action: Needs measurement: probe her burst popup value with the +40% included vs excluded to determine the real same-frame ordering, then verify the engine's burstCast block ordering matches (buff-before-nuk…
3. **[low/FIDELITY/skill2 · COLD 0.825]** → **MEASUREMENT**
   - finding: The 1100% capture-at-max-capacity nuke is encoded as a passive DoT (1100%/6s x 102s = 17 ticks) rather than a discrete per-capture function proc. Models the do…
   - action: Inert in rotation (ghosts never reach 13, zero procs; review couldCauseGap 'neither'). Only if no-burst mode is used for calibration: encode as a discrete function-type proc (crit at caster rate, sna…

### `prika` — board COLD 0.691, 3 gotcha(s)

1. **[high/SILENT_DROP/skill1 · COLD 0.691]** → **MEASUREMENT**
   - finding: Prika's continuous 'Gains Pierce' (while in Performance) is unmodeled and no hasPierce tag is carried, so she is never Pierce-tagged — her own Pierce Damage ▲…
   - action: needs measurement — tag Prika as Pierce while in Performance (e.g. hasPierce:true, or a Performance-gated continuous gainPierce) so her own +13.09% Pierce Damage and partner Pierce buffs apply. Held…
2. **[med/FIDELITY/skill2 · COLD 0.691]** → **MEASUREMENT**
   - finding: Encore 'Performance duration ▲ 21 sec' (Effect 2) is unmodeled, so in solo the burst Charge Damage ▲ 25% (and heal) run 25s instead of an extended ~46s when En…
   - action: needs measurement — model the Performance-duration extension so the burst Charge Damage ▲ 25% lasts ~46s (25s + 21s) when Encore fires in solo. Requires tracking the Performance status; verify the ex…
3. **[med/FIDELITY/skill2 · COLD 0.691]** → **MEASUREMENT**
   - finding: The Encore trigger is proxied to fire on every Full Burst entry in solo (and per burstCast in duet) regardless of whether a Sing Along caster is present, over-…
   - action: needs measurement — gate the solo Encore proxy on an actual Sing Along caster being present (e.g. Mint) or model the Sing Along↔Performance interaction directly, rather than firing on every Full Burs…

### `ada` — board COLD 0.902, 2 gotcha(s)

1. **[high/ENCODING/burst · COLD 0.902]** → **MEASUREMENT**
   - finding: Special Modification's 'for 1 round(s)' uses-cap is unencoded — the weaponSwap runs a flat 10s time window with no maxShots, over-firing ~2 special charge shot…
   - action: Add maxShots:1 to the weaponSwap so Special Modification ends after the first swapped shot fires (honoring 'for 1 round(s)'), mirroring Snow White:HA's maxShots swap-end (damage-calc §2b). NEEDS MEAS…
2. **[med/ENGINE/skill2 · COLD 0.902 · FRESH]** → **OWNER/ENGINE**
   - finding: Ada's Flash Grenade DoTs never crit in the sim (DOT_CRIT default off), but real DoTs DO crit (~47% with elem advantage). Because Ada is grenade-DoT-dominated a…
   - action: Engine flip to let DoT ticks crit at the caster's rate in dealDamage's DoT/proc path (open-questions U13), followed by a DoT-roster recalibration (offsetting errors, high blast radius) — an owner-gre…

### `chisato` — board HOT 1.202, 2 gotcha(s)

1. **[high/ENGINE/skill2 (true-damage normals window) · HOT 1.202]** → **MEASUREMENT**
   - finding: Core/crit are retained on true-flavored normal attacks; whether true damage forfeits core hits in-game is unverified. SMG coreMult 250 is a large lever — if tr…
   - action: needs measurement — verify in-game whether true-damage normal attacks on an SMG forfeit core hits (coreMult 250). If they do, true normals should strip core (e.g. a true-damage core-exemption / coreO…
2. **[med/ENGINE/skill2 (weaponSwap) · HOT 1.202]** → **OWNER/ENGINE**
   - finding: The weaponSwap instant-refills the magazine at both swap start and window end (~2 free reloads per cycle), granting extra shots the kit does not describe — a s…
   - action: needs measurement / engine fix — a trueNormals-only same-weapon swap should not grant instant mag refills unless the kit grants a reload; either suppress the swap's free refill for these swaps or mea…

### `cinderella` — board COLD 0.937, 2 gotcha(s)

1. **[high/ENGINE/burst · COLD 0.937]** → **OWNER/ENGINE**
   - finding: burstSnapshotsPreFb is FALSE in the override, but the override note and the damage-calculation.md §5b worked example both state the nuke resolves PRE-full-burs…
   - action: Resolve the flag contradiction. The §5b worked example (Major = 1.0, 98.9% popup match) and the engine's forced noFb rule for burst-cast damage suggest the FB-multiplier exclusion is already handled…
2. **[low/FIDELITY/skill1 · COLD 0.937]** → **OWNER/ENGINE**
   - finding: Charge Speed ▲ 100% (on full-charge, removed on reload) is re-expressed as a permanent +45% passive. The override models the averaged steady-state cadence (dow…
   - action: Model the 100% CS as an on/off toggle (applied on full-charge attack, removed on reload-to-max-ammo) rather than a permanent +45 average. Requires engine support for reload-triggered buff removal and…
   - **STATUS 2026-07-21 — PRIMITIVE BUILT, WIRING HELD (DECISIONS 2026-07-21; commit 75f8873).** The engine
     primitive `removeOnReload` + `stripReloadBuffs` LANDED INERT (opt-in buff flag, stripped at the two
     reload-to-max sites; regression byte-identical; test `scripts/tests/reload-buff-removal.test.ts`). But
     wiring cinderella's toggle (shotFired → CS 100 removeOnReload) under the engine's SUBTRACTIVE charge
     formula floors CS-100 to 1-frame charges (no RL rate floor) → ~1536 pulls vs measured ~315 → board
     0.937 COLD → **4.834 HOT** (measured on the wired toggle). faithful>fit ⇒ HELD. Root fix is NOT this
     toggle alone: her measured cadence fits a DIVISIVE charge-speed formula at ~311/315 with zero free
     params (rate-floor candidate refuted at ~430) — an engine-wide hypothesis, open-questions **U25**,
     needing its own gated pass (fresh context + Fable pre-reg + full-board A/B + owner). Under either
     formula `removeOnReload` is the correct building block, so it stands; DO NOT re-attempt the naive
     subtractive toggle (it is the 5× regression above). +45 proxy flagged formula-coupled in cinderella.json.

### `diesel-winter-sweets` — board COLD 0.824, 2 gotcha(s)

1. **[high/ENCODING/skill1 · COLD 0.824]** → **MEASUREMENT**
   - finding: The override hard-codes the Intro branch (Sustained +60.19% on fullBurstEnter) with no burst-state gate. The real kit's Intro/Highlight branches are mutually e…
   - action: Encode the Intro/Highlight condition the review proposes — a chainGate selfCast/selfNotCast on the fullBurstEnter trigger selecting Intro (60.19%) when she casts her burst vs Highlight (235.03%) when…
2. **[low/FIDELITY/skill2 · COLD 0.824]** → **MEASUREMENT**
   - finding: The 'Full Charge attack' trigger is encoded as shotFired. For this RL unit every shot is a full charge, so the two triggers fire on identical events and the bo…
   - action: If cross-weapon faithfulness matters, gate on a full-charge-release event rather than raw shotFired. Inert for this RL-only unit; no board impact, no value change required.

### `maxwell` — board COLD 0.925, 2 gotcha(s)

1. **[high/FIDELITY/burst · COLD 0.925]** → **MEASUREMENT**
   - finding: The burst is modeled as a single UNCHARGED 813.42% flatDamage nuke, whereas the kit describes a full-charged Pierce weapon-swap railgun shot. The 'Full Charge…
   - action: needs measurement — do NOT pick a value to hit the board. Recipe: popup-read Maxwell's burst railgun hit in the run-G footage. If the landed popup reconstructs as FinalATK × 8.1342 × charge(3.0) × (c…
2. **[low/ENGINE/skill1 · COLD 0.925 · FRESH]** → **OWNER/ENGINE**
   - finding: skill1 selects its two beneficiaries by STATIC (base) ATK, but the kit says 'highest FINAL ATK'. The alliesTopAtk selector hardcodes a staticAtk sort, so live…
   - action: Faithful representation: the kit says 'highest final ATK', so the selector should rank candidates by live effectiveAtk (staticAtk × (1+ΣATK%) + flat grants) at the fullBurstEnter instant rather than…

### `mint` — board COLD 0.776, 2 gotcha(s)

1. **[high/ENCODING/skill1+skill2 (mode selection / config default) · COLD 0.776]** → **MEASUREMENT**
   - finding: Mode defaults to 'solo' (halved Singing values) unless the comp explicitly fields Prika or sets modes.mint. The COLD board comp 'PA MiKa (boss Iron)' likely in…
   - action: needs measurement/confirmation: verify whether the board comp 'PA MiKa' includes Prika. If so, force duet mode for that comp (set modes.mint = 'duet (w/ Prika)', or auto-select duet whenever Prika is…
2. **[low/FIDELITY/skill1+skill2 (Singing-gated lines) · COLD 0.776]** → **MEASUREMENT**
   - finding: The Singing-state gate on S1 (ATK) and S2 (crit / projExpl / pierce) is modeled as a steady-state value reduction (solo halves to ~50% uptime) rather than an e…
   - action: Optional fidelity upgrade: model the Singing/Dancing toggle as a real per-burst state (burst toggles the state each cast; S1/S2 buffs gate on Singing being active) instead of value-halving. Until the…

### `modernia` — board COLD 0.868, 2 gotcha(s)

1. **[high/ENCODING/burst · COLD 0.868]** → **MEASUREMENT**
   - finding: Destroy Mode's 2.24%-of-final-ATK per-hit stream is encoded crit-OFF (extraHitDamagePct crit:false path), but the SSOT says function-type 'deals X% of final AT…
   - action: Route the 2.24% Destroy Mode per-hit stream through the crit-ON function-damage path (crit at caster sheet rate per damage-calculation.md §2b), OR confirm via focus video whether Destroy Mode per-hit…
2. **[med/ENGINE/skill2 · COLD 0.868]** → **OWNER/ENGINE**
   - finding: Caveat ⚑2 claims Hit Rate ▲ 8.56% (hitRatePct) is 'INERT in the engine' — STALE *reasoning, unchanged outcome*: the CONE_DELTA cone consumes hitRatePct for AR/SMG/SG only; modernia is MG and MG/SR/RL keep the flat base table, so she still gets NO core-rate benefit. The residual gap is MG cone-exclusion, not engine-wide inertness — whether Hit Rate lifts MG core rate in-game is an unmeasured HOT-direction question.
   - action: needs measurement — recipe (⚑2): read CORE-HIT popup fraction inside vs outside the 15s post-FB-enter window in a focus video at matched MG spin state (first 18 wind-up rounds never core). Also correct the stale ⚑2 wording per the finding (that half is the B1 doc pass).

### `quency-escape-queen` — board HOT 1.14, 2 gotcha(s)

1. **[high/FIDELITY/skill2 · HOT 1.14]** → **MEASUREMENT — attempted 2026-07-20; ramp REAL but SHORT, and NOT the HOT driver**
   - finding: The Skill 2 stage-unlock ORDERING gates ('Stage 2 activates when Explore Route Stage 1 is at max stacks'; 'Stage 3 ... Stage 2 ...') are not encoded — all six…
   - action: needs measurement — gate stage-2 stack accrual behind stage-1 stack-count == max (10) and stage-3 behind stage-2 == max (10), then record the ramp / post-reload rebuild timing against a real fight po…
   - **2026-07-20 measurement (video subagent, `ar-sg-smg/quency smg.MP4`; slug gate PASSED — confirmed quency-escape-queen via the Explore-Route maze icon + Water "Escape Queen" outfit, NOT base quency):** An opening ramp GENUINELY EXISTS (maze fills over the first seconds; buff-icon bar grows ~5→9 over t9→25) — so the flat "all stages live from t=0" model does over-credit the opening. **But the ramp is SHORT (~10–13s, ~7% of the fight):** per-6s damage increments plateau by ~13s in (5.78/5.37/4.75/4.81/4.01/6.06/6.21M — no rising slope), and post-reload rebuild is quick (~1–2s). **KEY WHOLE-PICTURE CONCLUSION: a ~10–13s opening ramp CANNOT explain a sustained whole-fight HOT 1.14** — a 14% average over-credit needs a STEADY-STATE magnitude source (peak ATK/HR stack values, cadence/throughput, or the hitRatePct→core lift), NOT the ordering gate. So this gotcha is real-but-minor and is NOT her HOT driver; the ordering-gate enactment (if ever done) targets only a ~10–13s opening ramp. HUD limit: single aggregate maze icon (badge is a duration countdown, not per-stage stacks) → exact sequential unlock times not readable. Confidence: variant-ID HIGH, ramp-exists HIGH, ramp-short MED (burst-confounded, n=1). **NO enactment** (n=1 + HOT + prior quency conflation risk — gated pass only).
2. **[low/FIDELITY/skill1 · HOT 1.14]** → **MEASUREMENT**
   - finding: The three Explore-Route-max gates are firing-tracking proxies (S1a blind passive, S1b hitCount 20 / dur 1s, S1c hitCount 10 / dur 0.5s) rather than real stack-…
   - action: needs measurement — replace the firing-tracking proxies with a real Explore-Route stack-count gate (activate each S1 buff only when the corresponding stage's stack count is at max), then record rebui…

### `scarlet-black-shadow` — board HOT 1.042, 2 gotcha(s)

1. **[high/ENCODING/burst line 2 / skill1 trigger.countInFb · HOT 1.042]** → **MEASUREMENT — ⛔ FOOTAGE-BLOCKED (2026-07-20 measurement pass)**
   - finding: In-burst Skill-1 threshold encoded as scalar countInFb=1 (every phase fires on 1 Full Charge in-window) instead of the real per-phase 1/2/3; this over-fires th…
   - action: needs measurement — pin the real in-burst per-phase proc count from one clean isolated-burst SBS recording (count the 848% popups in a single burst window). The truth lies between scalar countInFb=1…
   - **2026-07-20 status: the EXISTING `sbs control.MP4` recon (`docs/probe-data/sbs-control-recon.json`) already tried and the in-burst per-phase count is "obscured by overlap" — charged-body + core + S1 distributed procs land together, exact count not cleanly separable. A fresh review hits the same wall. Needs a NEW isolated-burst scarlet-black-shadow recording (single burst window, boss centered, minimal team overlap) before this can be measured. NOT enactable from current footage. Cadence gotcha 2 likewise reads "consistent with engine charge model" (~0.8-1.0s/charged shot) in the same recon — the ~42f/0.70s tension is unresolved but not clearly refuting the 40f model.**
2. **[med/ENGINE/skill1 charge cadence (charge-cycle timing) · HOT 1.042]** → **MEASUREMENT**
   - finding: Charge cycle modeled at 40f (datamined 18f charge + standard 22f SR/RL recovery) vs video-measured ~42f/0.70s — sim runs ~2f short per cycle (~4.8% fast), a se…
   - action: needs measurement — re-pin the full charge cycle from N3/sbs-control footage toward ~42f/0.70s; keep the 18f charge portion charge-speed-scalable and the recovery fixed (per SSOT §4 the recovery is n…

### `soda-twinkling-bunny` — board OK 1.021, 4 gotcha(s)

1. **[high/ENGINE/burst/rotation (engine, not an override block) · OK 1.021]** → **MEASUREMENT**
   - finding: Engine over-generates Soda's bursts: 6 sim bursts vs 5 recorded. The extra burst adds a 628.7% nuke plus extra ATK-buff uptime, directly inflating sim damage (…
   - action: needs measurement — diagnose the suspected B3-alternation cooldown collision or FB-extension-shifted timing (engine rotation work, not a per-block override edit). The 6th real burst should be gated o…
2. **[med/FIDELITY/burst[1] / Hit Rate · OK 1.021]** → **MEASUREMENT**
   - finding: Hit Rate ▲38.91% (>=20 chips, 15s) is unmodeled, and the review's 'inert in the engine' justification is STALE. Per the CONE_DELTA Rician cone model (live 2026…
   - action: needs measurement — the SG core-rate lift at +38.91% HR across bands is unmeasured (recon hit_rate_core_test INCONCLUSIVE). Faithful representation once measured: buff hitRatePct 38.91 15s with resou…
3. **[med/FIDELITY/skill2[0] / Full Burst extension · OK 1.021]** → ~~ENACT-NOW~~ **MEASURE-FIRST, n=1 OBSERVATION 2026-07-20 (leans chip-tiers over flat +4); NOT a stamped verdict, NOT enacted**
   - **2026-07-20 MEASUREMENT OBSERVATION (video subagent a754360, `soda tb control.mov`, n=1; premise-corrected):** TWO driver/plan premises were re-derived blind from primary files and did NOT hold: (a) **Crown does NOT extend FB** — crown/helm/little-mermaid all have `fullBurstExtend`=0; **soda-twinkling-bunny is the SOLE FB-duration extender** in that comp (little-mermaid's FB-end effect is `burstCdr`, not extension). (b) Her S2 triggers on "entering **Burst Stage 3**" (both B3s — soda + helm — occupy stage 3 and alternate), so she extends EVERY FB regardless of caster (sim.ts:1998-2004). So a "Soda-cast vs Helm-cast" isolation gives ~0 by construction (NOT inertness). **With base FB=10s and soda the sole extender, duration−10 = her extension, and it tracks her chip count:** ≥20 chips → ~+5s observed (14.3-15.0s; banner VFX under-reads the peak ~0.3-0.7s), the one low-chip late FB (~14-19 chips) → +2s (12.50s). **⇒ the n=1 reading FAVORS the chip-gated +2/+5 shape over the flat +4** (which would under-credit the ≥20 majority ~1s, over-credit the late 10-19 tail ~2s) — an OBSERVATION at MED-HIGH confidence on the shape, NOT a stamped verdict (single recording; the flat +4 stands until a gated pass). **NEW ENCODING SUBTLETY (MED-LOW):** her late own-cast FBs (FB9 pre-consume 30→post 13, measured ~13.4 not ~15) fit the gate reading chips **POST her own −17 spend**, not pre-consume — the current model spends AFTER the burst gates, so a naive `resourceGate goldenChip min 20/10` reads pre-consume and would mis-tier her own late casts. **ENACTMENT PATH (focused gated session, NOT the discovering one — n=1 + full-N3 rotation blast): resolve pre-vs-post-consume gate timing → Fable pre-reg → full-board A/B (soda+rouge+trina+scarlet-black-shadow+liberalio all move) → owner.**
   - finding: Full Burst extension modeled as a flat +4s; the real kit is chip-gated cumulative (+2s at 10-19 chips, +5s at >=20 = TE-I+TE-II). Late-fight Full Bursts at <20…
   - action: Faithful representation: replace the flat +4s with chip-gated tiers (resourceGate goldenChip min 10 -> +2s; min 20 -> +5s cumulative). The Golden Chip pool is already modeled, so the gate is implemen…
4. **[low/FIDELITY/skill2[1] / in-FB rider · OK 1.021]** → **DEFER**
   - finding: In-FB rider modeled as a flat 130% (recording-derived TE-II-dominant average); the datamined cumulative is 137.06% (52.04 + 85.02) with Time-Extension-state ga…
   - action: needs measurement — refine on a soda-focus recording. Faithful target is TE-state-gated 52.04% (TE-I) / 137.06% cumulative (TE-II), not a flat value fit to the board.

### `mari` — board no-data, 3 gotcha(s)

1. **[high/ENCODING/skill2 (trigger — applies to both blocks + hasPierce) · no-data None]** → **MEASUREMENT**
   - finding: Skill 2's activation trigger is KIT-SILENT; the override encodes an unmeasured shotFired estimate (refresh every pull → near-permanent self ATK▲ + ally caster-…
   - action: needs measurement — recipe: in any Mari-focus video, watch WHEN the ally ATK▲ buff icon appears/refreshes: per shot outside Full Burst (confirms shotFired) vs only at burst/Full-Burst entry (⇒ switch…
2. **[low/FIDELITY/skill2 — 'Gain Pierce for 5 sec.' · no-data None]** → **DEFER**
   - finding: The named 5s timed Pierce grant is modeled as a permanent static hasPierce:true flag. ≈ right-on-the-board while she fires continuously (5s grant refreshed eve…
   - action: Once gotcha #1's trigger is measured, prefer the now-available gainPierce primitive (5s window riding the resolved trigger) over static hasPierce for fidelity; if the trigger confirms shotFired, stat…
3. **[low/FIDELITY/burst — 'Affects all enemies.' · no-data None]** → **DOC**
   - finding: Kit says 'all enemies' but the burst nuke targets a single enemy (and the flatDamage branch never calls resolveTargets, so the {kind:'enemy'} field is decorati…
   - action: No action at current scope (partless single-boss raid). If a multi-target boss enters scope, route flatDamage through resolveTargets('enemy') so it splits/applies to all enemies faithfully.

### `asuka-wille` — board no-data, 2 gotcha(s)

1. **[high/SILENT_DROP/burst · no-data None]** → **MEASUREMENT**
   - finding: The 'Anti A.T. Field status is removed after the effect is triggered' line is represented nowhere; the up-to-24.9% Damage-Taken debuff persists for its full 30…
   - action: Needs measurement first (whole override is an unmeasured parser baseline, no board data). Faithful representation: clear the skill1[1] damageTakenPct debuff when the Annihilation finisher fires (~t+9…
2. **[med/ENGINE/burst · no-data None]** → **MEASUREMENT**
   - finding: The Annihilation finisher (198.6% = 6.62% × 30 stacks) is encoded as a cast-instant burstCast block, so the engine's no-Full-Burst-on-cast rule strips the +50%…
   - action: Needs measurement (verify the finisher actually lands inside the FB window and is FB-boosted in-game, per F2). If confirmed, the faithful representation is a delaySec≈9 flat-damage encoding so the hi…

### `d-killer-wife` — board OK 0.996, 2 gotcha(s)

1. **[high/FIDELITY/burst · OK 0.996]** → **OWNER/ENGINE**
   - finding: The body-hit ATK buff (casterAtkPct 12.19%) is modeled as the downstream effect on an ungated hitCount-1 trigger fired on this unit's own hits, instead of the…
   - action: Faithful representation requires engine vocabulary the override currently lacks: apply a Wipe Out status on the burst target for 10s, then trigger the body ATK buff on allies hitting the Wipe Out-aff…
2. **[med/ENCODING/skill1 · OK 0.996]** → ~~ENACT-NOW~~ **✅ LANDED 2026-07-20 (commit 2374fc5; DECISIONS 2026-07-20)**
   - Re-targeted `alliesOfWeapon SR`. dkw is SR so keeps it; only board effect (isolated A/B) = removing the spurious buff from grave (AR, Pierce-tagged in Prediction in N1), cooling that over-modeled HOT unit grave 1.179→1.162. Other comps + full-burst asserts byte-identical.

### `tove` — board no-data, 2 gotcha(s)

1. **[high/FIDELITY/skill2 · no-data None]** → **MEASUREMENT**
   - finding: Team-wide Critical Rate is modeled at a stale 3.32% vs the current in-game 10.08% (~3x too low).
   - action: needs measurement — verify the live L10 value against the current in-game prose (char-extract shows 10.08%); if confirmed, update critRatePct 3.32 → 10.08. Source the number from the current composed…
2. **[med/FIDELITY/burst · no-data None]** → **MEASUREMENT**
   - finding: Burst all-ally ATK buff duration is modeled at a stale 10s vs the current 15s (50% vs 75% uptime on a 20s CD).
   - action: needs measurement — verify the live burst duration against the current in-game prose (char-extract shows 15s); if confirmed, update durationSec 10 → 15. Source from current kit text, not a board-fitt…

### `laplace` — board no-data, 1 gotcha(s)

1. **[high/ENGINE/burst (weaponSwap, burst[1] — 'Normal Damage: 22.2% of final ATK') · no-data None · FRESH]** → **MEASUREMENT**
   - finding: Each 22.2% Laplace Bazooka beam tick is implicitly multiplied by the base 250% charge multiplier: the swap sets chargeTimeSec 0.25 (intended as the tick CADENC…
   - action: needs measurement — from a focus video, determine whether the Laplace Bazooka beam ticks are charged (and at what multiplier) or uncharged normals, by reading the per-tick popup against a 22.2%-of-AT…

### `privaty` — board OK 0.971, 1 gotcha(s)

1. **[high/FIDELITY/skill2[1] · OK 0.971]** → **MEASUREMENT**
   - finding: The 1687% Designated-Target rider is modeled as a burstCast-triggered DoT (1687% ATK every 3s × ~3 ticks, noRange, forced noFb, non-crit) instead of the real m…
   - action: needs measurement — do NOT tune the DoT proxy to hit the board. (1) Determine what satisfies the Designated-Target gate in the T4/T4b calibration comps but not the u7 comp (both partless Fire boss):…

### `grave` — board HOT 1.179, 3 gotcha(s)

1. **[med/FIDELITY/skill2 (Overheat II/III) · HOT 1.179]** → **MEASUREMENT**
   - finding: Overheat II (+20.66% ATK) and III (+30.8% Attack Damage) are modeled as full 10s burst-window uptime via the burstCast proxy, but the real kit builds them only…
   - action: Needs measurement, not a fudge: the review's U19 candidate is durationSec 7.5 (Overheat II) / 5.0 (Overheat III) to equal the real in-window uptime from the measured 12.0 rounds/s ramp; confirm again…
2. **[low/FIDELITY/skill1 (Heat Emission reload) · HOT 1.179]** → **MEASUREMENT**
   - finding: The named mechanic 'Heat Emission: Reload Ratio ▼ 50%' is encoded as a downstream charFixes.reloadFrames=193 frame value rather than a reload-speed percentage.…
   - action: Needs measurement to isolate whether the real mechanic is a 50% reload-speed reduction vs a datamine error; the current measured frame encoding is behaviorally faithful and should not be changed to a…
3. **[low/FIDELITY/burst (team max ammo) · HOT 1.179]** → ~~ENACT-NOW~~ **✅ LANDED 2026-07-20 (commit 4d1d4e3; DECISIONS 2026-07-20)**
   - `maxAmmoFlat 3` to all allies, 10s. **The 'negligible' premise was WRONG** — the buff goes to the whole team and grave is a frequent B2 (~72% window uptime), so it materially warms small-mag teammates. Isolated A/B (faithful>fit, mixed): improves COLD d-killer-wife 0.954→0.969, anis-star 0.967→0.979; worsens tracked-HOT noir 1.116→1.150, jill 1.041→1.051. Full-burst asserts byte-identical.

### `moran` — board COLD 0.739, 3 gotcha(s) — **full fixplan exists** (`kit-audit-fixplans/moran.md`)

1. **[med/ENGINE/burst · COLD 0.739]** → **MEASUREMENT**
   - finding: Swap-window THROUGHPUT is unmodeled — real fight lands ~1.3x more hits than the sim during the 10s unlimited-ammo swap; this is the dominant driver of the 0.73…
   - action: NEEDS MEASUREMENT: isolated moran-solo recording (comp footage blocked by electric muzzle bloom + occluded ammo + overlapping popups) OR datamined shot_count/muzzle_count for shot_id 1028102. Do NOT…
2. **[low/ENGINE/burst · COLD 0.739 · FRESH]** → **OWNER/ENGINE**
   - finding: casterAtkPct ally ATK buff is sized off caster's STATIC (base) ATK, not final/buffed ATK — potential under-credit for the team's other 4 units, engine-wide con…
   - action: Verify empirically whether '% of the skill user's ATK' snapshots final (buffed) caster ATK; if so this is a global casterAtkPct convention fix, not a moran-only edit — needs a measurement, do not fud…
3. **[low/ENGINE/skill1 · COLD 0.739]** → **DOC**
   - finding: S1 47.18% rider is gated fbGate:inFb, approximating the real 'while weapon is changed' (burst-swap) window; the two windows are offset for a Burst I unit so ri…
   - action: Faithful representation would be a 'weapon-changed' state gate spanning her own 10s swap window rather than the team FB window; low-impact since she bursts every rotation and windows largely coincide…

### `anis-star` — board COLD 0.954, 2 gotcha(s) — **full fixplan exists** (`kit-audit-fixplans/anis-star.md`)

1. **[low/ENGINE/skill1 · COLD 0.954 · FRESH]** → **DOC**
   - finding: The hasB1 'Everyone's Star: Re-enters Burst → Stage 1' reenterStage block is INERT: it is authored with a `passive` trigger, but the rotation's stage-hold dete…
   - action: Faithful fix: make the rotation stage-hold also honor a continuous/passive-triggered reenterStage on the caster (or re-author the block under a burstCast trigger at stage 1), so the paired-B1 re-entr…
2. **[low/FIDELITY/burst · COLD 0.954]** → **MEASUREMENT**
   - finding: Shooting Stars DoT gauge/hit modeling carries an unresolved hitsPerShot=2 carve-out and a flagged dot-gauge re-model; it is the documented likely driver of the…
   - action: needs measurement — re-measure the Shooting Stars auto-fire cadence/gauge and hit count against footage, then drop the hitsPerShot carve-out to 1 if the measurement confirms; do NOT adjust the 40.01%…

### `arcana-fortune-mate` — board HOT 1.132, 2 gotcha(s)

1. **[med/ENCODING/skill1 · HOT 1.132]** → **MEASUREMENT**
   - finding: S1 team ATK buff baked to 39% (3 Precious Moments stacks) instead of tracking the dynamic stack count (13% × actual stacks). Over-credits ~13% casterATK to all…
   - action: Needs measurement: record a focus video counting Precious Moments stacks at FB end to determine the typical stack count (expected ~2 at ⚑1.5 pulls/s SG cadence). If confirmed ~2, the faithful encodin…
2. **[low/FIDELITY/skill2 · HOT 1.132]** → **OWNER/ENGINE**
   - finding: Happy Memories 'Number of pellets ▲ 1, stacks up to 3' is encoded as normalAttackPct 30% (additive damage approximation) rather than modeling the actual pellet…
   - action: Faithful representation: model as a pelletCount modifier (+1 per stack, ×3) that multiplies the SG shot's pellet count from 10 to 13, compounding multiplicatively with the Snapshots normalAttackPct.…

### `dorothy-serendipity` — board HOT 1.115, 2 gotcha(s) — **full fixplan exists** (`kit-audit-fixplans/dorothy-serendipity.md`)

1. **[med/ENGINE/skill2 · HOT 1.115 · FRESH]** → **DOC**
   - finding: S2 Hit Rate ▲ 40.68% is LIVE via HRCORE (raises SG core fraction during the team-FB window), yet the full-context review documents it as inert — an unaccounted…
   - action: No override change needed — routing hitRatePct→HRCORE is the FAITHFUL representation of 'Hit Rate ▲'. Correct the CONFOUND LEDGER: the review must stop treating this as inert. In team comps where she…
2. **[med/FIDELITY/burst · HOT 1.115]** → **MEASUREMENT**
   - finding: Burst 'Number of pellets ▲ 5' is modeled as normalAttackPct +50% (a downstream normal-attack multiplier), not the named pellet-count mechanic.
   - action: Faithful representation: raise effective pellets/hitsPerShot 10→15 (or scale sgFalloff by 1.5) during the 15s burst window so pellet-landing and gauge interactions are captured, rather than a flat no…

### `milk-blooming-bunny` — board COLD 0.681, 2 gotcha(s)

1. **[med/ENCODING/skill1 (root) → burst & skill2 pierceDamagePct (symptom) · COLD 0.681]** → ~~ENACT-NOW~~ **✅ LANDED 2026-07-20 (commit 0ced312; DECISIONS 2026-07-20; open-questions U23)**
   - `gainPierce durationSec:6` on `shotFired` (SR auto-full-charge → permanent tag). Lights the dead Pierce package (burst pierceDamagePct +117.64%). **DELIBERATE overshoot (grave precedent), faithful>fit:** PG 0.653→1.301 HOT (~×2; verified dmgUp 1.00→2.31 in the 10s burst window). Value datamined, not tuned. Residual +0.30 HOT → her 2nd measurement-gated gotcha (Embarrassment mode-split) + pierce-window DPS share (U23).
2. **[med/FIDELITY/skill1 (Embarrassment trigger → mode split) · COLD 0.681]** → **MEASUREMENT**
   - finding: The named Embarrassment trigger ('not in Embarrassment state AND Full Charge lasts ≥0.5s') is modeled as a config mode-split rather than the mechanic itself, a…
   - action: Needs measurement — do NOT fudge. Measure in-game whether full-auto ever satisfies 'Full Charge lasts for 0.5s or more' (i.e. is the 0.5s an extra hold beyond full charge, per the Prydwen reading the…

### `nayuta` — board COLD 0.897, 2 gotcha(s)

1. **[med/ENCODING/skill2[0] (Memory Absorption Hit Rate stack, unmodeled) · COLD 0.897]** → **MEASUREMENT**
   - finding: The Memory Absorption Hit Rate stack (▲1.4% × 30 = 42% cap) is dropped as 'inert', but that caveat is stale: since the 2026-07-19 CONE_DELTA model, Hit Rate fe…
   - action: Encode the stack as a self hitRatePct buff (▲1.4%×stacks, 42% at steady-state cap) so it feeds acrForHR for her SMG baseline. Magnitude is bounded: it affects only her SMG normal-attack core rate, NO…
2. **[med/ENGINE/skill1[1] (extraHitDamagePct 530.46 = 150% + 380.46% rider) · COLD 0.897 · FRESH]** → **OWNER/ENGINE**
   - finding: The Memory Incineration full-charge rider is dealt crit-OFF, but '% of final ATK' function damage should crit at the caster's rate. A real under-credit on a su…
   - action: Route the rider through a crit-ON path per SSOT §2b/§9 (function additional damage crits at caster rate, never core, never range). This is an ENGINE decision (the extraHitDamagePct path is hard-coded…

### `rouge` — board HOT 1.052, 2 gotcha(s)

1. **[low/ENCODING/burst[0]+burst[1] · HOT 1.052]** → **MEASUREMENT**
   - finding: Burst Max HP grants double-counted: casterMaxHpPct 22 + 22.5 = 44.5% of caster Max HP per cast, exceeding the real kit's maximum single-tier value of 30.02%. T…
   - action: Needs measurement of actual coin-tier uptime fractions to derive a single correct time-averaged casterMaxHpPct value (≤30.02% × weighted uptime). Currently moot: the 2026-07-17 correction renders all…
2. **[low/FIDELITY/burst[2] · HOT 1.052]** → **MEASUREMENT**
   - finding: The 8.7% selfAndAdjacent Max HP grant has no durationSec, making it permanent (expiresFrame=null) and refreshed on every burst cast. The real kit's burst coin-…
   - action: If the Double Sword Coin permanent portion (from skill2's 'continuously' grant) is intended to be modeled separately from the burst's timed 10s grants, it should live in skill2 only (as a passive), n…

### `ein` — board COLD 0.805, 1 gotcha(s)

1. **[med/ENGINE/burst · COLD 0.805 · FRESH]** → **OWNER/ENGINE**
   - finding: Blind agent reports the +55.3% trueDamagePct self-buff (burst[0]) feeds multiplicatively into the DamageUp bucket of the 300.02% burst nuke (burst[1]) — a same…
   - action: needs measurement — verify in code whether burst[0] buff is applied before burst[1] flatDamage resolves within the same burstCast trigger. If confirmed, the engine needs a same-cast self-buff guard o…

### `jill` — board HOT 1.042, 1 gotcha(s)

1. **[med/ENGINE/skill1 · HOT 1.042]** → **ENACT-NOW** *(retagged 2026-07-20 review; was OWNER/ENGINE)*
   - finding: trueDamagePct +34.99% on burstCast is correctly encoded but engine-inert: the DamageUp bucket's True Damage ▲ term only applies to true-flavored instances, and…
   - action: Override authoring, NOT engine support — `weaponSwap.trueNormals` already exists (types.ts; takina precedent) and `chisato` already uses the exact encoding: a same-weapon swap (damagePct = own normal mult, trueNormals:true) riding burstCast for 10s, which activates the 34.99%. Shared caveat with chisato #1: core/crit retention on true normals is in-game-unverified (HOT-direction lever if wrong; jill is already HOT 1.042) — a focus-video read of the window's DPS share remains the confirmation.

### `neon-vision-eye` — board HOT 1.083, 1 gotcha(s)

1. **[med/ENGINE/skill1 (Super Firepower 262.79% rider, encoded in skill1[1] extraHitDamagePct) · HOT 1.083]** → **MEASUREMENT**
   - finding: The Super Firepower +262.79% additional-damage rider is routed crit-OFF and as damage category 'burst', but its real prose is the same function class as the 43…
   - action: needs measurement — confirm in-game whether the Super Firepower 262.79% rider actually crits. Recipe: capture a Super-window full-charge popup pair and test for a ×1.5 crit signature on the 262.79 hi…

### `trina` — board HOT 1.151, 1 gotcha(s)

1. **[med/FIDELITY/burst · HOT 1.151]** → **MEASUREMENT**
   - finding: Hit Rate ▲ 45.3% on Electric AR allies (10s, burstCast) is unmodeled, and the review's 'no misses vs boss / inert in scope' justification is STALE: under the l…
   - action: Model the line faithfully: on burstCast, grant hitRatePct 45.3 for 10s to alliesOfElementWeapon Electric/AR (count 99), letting the engine route it through acrForHR → offsetCoreProb to lift those all…

### `velvet` — board HOT 1.059, 1 gotcha(s)

1. **[low/FIDELITY/skill2 (50-hit proc) · HOT 1.059 · FRESH]** → **MEASUREMENT**
   - finding: hitCount counter is consumed unconditionally (c -= threshold runs before the fbGate check), so if the 50th total hit lands OUTSIDE Full Burst the counter reset…
   - action: needs measurement — verify against footage whether the in-game counter counts only in-FB hits (countInFb:50) or all hits with an in-FB gate (hitCount:50 + fbGate:inFb). If only in-FB hits count, the…

### `liberalio` — board OK 0.992, 5 gotcha(s)

1. **[med/FIDELITY/skill2 · OK 0.992]** → **MEASUREMENT**
   - finding: Her battle-start immunity to Increase/Decrease Charge Speed effects is not modeled as a true immunity; it is only approximated by excludeSelf on her own S1 Cha…
   - action: Documented dormant HOT gap. A faithful fix would add a per-unit immunity that excludes external Charge Speed increases/decreases from her charge-time calc (rather than relying on excludeSelf on her o…
2. **[low/ENGINE/skill1 · OK 0.992 · FRESH]** → **DEFER**
   - finding: The lowest-ATK 'Burst 3' ally selector (resolveTargets) also admits Λ (all-stage) units as if they were Burst III, so a Λ unit can receive the Charge Speed gra…
   - action: HYPOTHESIS — needs measurement: the SSOT pins Λ as 'no burst type' for FORMATION checks but does not explicitly pin ally-targeting ('affects Burst 3 ally') behavior, so whether in-game targeting admi…
3. **[low/FIDELITY/skill1 · OK 0.992]** → **DEFER**
   - finding: The 20.83%/60s Attack Damage self-buff is triggered by shotFired+requiresCore (a proxy for 'landing a Full Charge on the core'), modeling the always-up steady-…
   - action: Faithful as-is for scope (SR auto always full-charges; 100% scope-lock core exposure; 60s duration keeps it up). A literal fix would gate on a resolved core-full-charge landing event instead of shotF…
4. **[low/FIDELITY/skill1 · OK 0.992]** → **DOC**
   - finding: The '40.5% additional damage, Activates 5 times' per full charge is consolidated into a single 202.5% flatDamage proc (5×40.5% lump).
   - action: Board-equivalent in expected-value mode (5×40.5% = 202.5%); only Monte-Carlo crit variance differs marginally. User-confirmed reading. No change needed; if hit-count fidelity mattered (e.g. per-hit g…
5. **[low/FIDELITY/skill1 · OK 0.992]** → **DEFER**
   - finding: 'Charge Speed ▲ 12.74% of the skill user's Charge Speed' is encoded as a flat chargeSpeedPct 12.74 rather than scaling off Liberalio's own Charge Speed stat.
   - action: No-op in scope: scope-lock caster Charge Speed = base 100 (no cube, Base 5 gear carries no Charge Speed), so 12.74% × 100 = 12.74 = the flat value. A faithful encoding would compute 12.74% × caster.c…

### `cinderella-crystal-wave` — board OK 0.99, 3 gotcha(s) — **full fixplan exists** (`kit-audit-fixplans/cinderella-crystal-wave.md`)

1. **[med/ENCODING/skill2 · OK 0.99]** → **MEASUREMENT**
   - finding: Snipe-mode 1189.66% FB-enter rider carries core:true, but its kit text says plain 'as damage' (only the MG branch says 'core strike damage') — over-credits the…
   - action: Strip core:true from the Snipe branch to match the plain 'as damage' wording (the MG branch keeps it — text explicitly says 'core strike damage'). Board-inert today (both graded comps are MG); confir…
2. **[low/ENCODING/skill1 · OK 0.99]** → **DEFER**
   - finding: Snipe magazine collapsed to maxAmmo 1 vs listed 15 (justified by the 40-round full-charge expend) — if the 40 draws from a separate pool, Snipe under-fires (~o…
   - action: Needs measurement: record a Snipe-mode fight to observe actual Snipe fire cadence; if >1 shot per reload cycle, set maxAmmo 15 and model the 40-round expend as a separate cost. Board-inert (MG comps).
3. **[low/FIDELITY/skill1 · OK 0.99]** → **DEFER**
   - finding: Snipe weaponSwap omits a `weapon` field, so the engine keeps MG range-banding and the MG auto-core-rate row for Snipe shots even though the mode swaps to a cha…
   - action: If the intended Snipe class differs (e.g. SR banding/0.95 core-rate), set swap.weapon accordingly; otherwise document that Snipe deliberately retains MG banding. Board-inert (Snipe is not the default…

### `arcana` — board no-data, 2 gotcha(s)

1. **[med/FIDELITY/skill1[0] / skill2[0] / skill2[1] (shared Wheel-of-Fortune gate) · no-data None]** → **MEASUREMENT**
   - finding: The Wheel-of-Fortune condition on the big conditional grants is modeled as a everyN-2/everyNOffset-1 timing proxy ('every 2nd Full-Burst-end') rather than deri…
   - action: Needs measurement + a faithful gate: drive the S1/S2 conditional blocks off Arcana's actual Wheel of Fortune status (active within 10s of her own burst cast) instead of the everyN 2/offset 1 proxy, t…
2. **[med/FIDELITY/skill1[0] / skill2[0] ('previously cast their Burst Skill' scope) · no-data None]** → **MEASUREMENT**
   - finding: 'Affects all Burst-3 Electric Code allies who previously cast their Burst Skill' is modeled as this-rotation burstCasters (units that ACTUALLY cast this rotati…
   - action: Needs measurement: record a fight to determine whether 'previously cast' resets each rotation (current model) or persists across rotations, and confirm the buffed set. Adjust the burstCasters scope t…

### `eve` — board no-data, 2 gotcha(s)

1. **[med/ENCODING/skill2 · no-data None]** → ~~ENACT-NOW~~ **✅ LANDED 2026-07-20 (commit 852fcd9; DECISIONS 2026-07-20): bossElementGate Electric + fraction 0.04 (=3 rounds); ungraded, solo unit-test, regression byte-identical.**
   - finding: Reload refund mis-encodes both the trigger gate and the refund amount: fires unconditionally (kit gates on Electric-code target) and grants 4 rounds (5% of 75-…
   - action: Two-part fix: (1) gate the hitCount-10 block on `bossElementGate` Electric (the gate exists in-engine) so it is inert vs non-Electric bosses; (2) for the kit's 'Reloads 3 round(s)': `instantReload` carries only a `fraction` field (no flat-rounds) — fraction 0.04 = exactly 3 of the 75-round mag and is the faithful equivalent while max ammo is unbuffed; a literal flat-rounds field would be a small engine addition if max-ammo buffs ever enter her comps.
2. **[low/FIDELITY/burst · no-data None]** → **OWNER/ENGINE**
   - finding: Mk2's Unstable Energy doubling (sequentialDamagePct +100) routes through the shared DamageUp bucket — a true ×2 only in solo; dilutes below ×2 when other Damag…
   - action: Needs measurement + engine-level bucket split: a true ×2 on Unstable Energy would require a separate sequential-damage multiplier bucket (multiplicative with DamageUp) rather than an additive entry i…

### `guilty` — board no-data, 2 gotcha(s)

1. **[low/ENGINE/burst · no-data None]** → **DEFER**
   - finding: Burst's 'when Mind If I Borrow This? is at max stacks' gate on the DEF▼ + 277.71% riders is modeled always-on — the engine has no full-stack gate mechanism, so…
   - action: Needs measurement: read the ATK-buff-popup / stack-icon count and the HP of the first burst's 277.71% popup from a focus video to confirm the first burst does NOT fire the rider (⚑2 recipe). If confi…
2. **[low/FIDELITY/skill1 · no-data None]** → **OWNER/ENGINE**
   - finding: S1 'Duplicates 8.81% of the ATK of the ally with the highest ATK' is modeled as casterAtkPct (% of Guilty's own static ATK) — right-on-the-board solo but not f…
   - action: Needs a 'highestAllyAtkPct' stat source in the schema that resolves to max(ally.staticAtk) at apply time, then converts to a flat add per the caster-ATK rule. Until then the casterAtkPct proxy is exa…

### `isabel` — board no-data, 2 gotcha(s)

1. **[med/ENGINE/burst · no-data None]** → **MEASUREMENT**
   - finding: fullBurstExtend:-5 net rotation sign is unverified — the engine may net-harm the board if its rotation model mis-signs shorter-FB-window vs faster-re-cycle.
   - action: Needs measurement, not a number change: run a /sim-battery diff with fullBurstExtend:-5 vs 0 to confirm the net rotation sign on representative Isabel teams; keep −5 (the faithful encoding) and only…
2. **[low/ENCODING/burst · no-data None]** → **DEFER**
   - finding: Burst flatDamage crit behavior is ambiguous: the review note calls the base 149.85% nuke 'no crit', but the formula SSOT lists burst nukes (and function 'addit…
   - action: Needs verification against the override code: confirm whether the burstCast flatDamage path (base nuke + MT2/MT3 riders) rolls crit. Per SSOT burst/skill damage crits by default; if the path suppress…

### `maiden-ice-rose` — board OK 0.97, 2 gotcha(s) — **full fixplan exists** (`kit-audit-fixplans/maiden-ice-rose.md`)

1. **[med/ENGINE/burst · OK 0.97]** → **MEASUREMENT — attempted 2026-07-20, INCONCLUSIVE (footage insufficient)**
   - finding: Burst stack count is the dynamic fbMissedSinceBurst counter (floors at 0 when she bursts every FB), not the 'fixed maxStacks:12' the full-context review's pros…
   - action: Needs measurement — pin MP-at-cast from a TEAM burst video (count the repeat instances of the 1372.8% nuke), then map measured MP->stacks. fbMissedSinceBurst is directionally reasonable but should no…
   - **2026-07-20 measurement (video subagent, `tb2/tb2 3 maiden.MP4`): INCONCLUSIVE — the clip is a PARTIAL capture (~70s of the 180s fight; ends on an iOS Control-Center overlay, recording stopped early) and maiden-ice-rose NEVER casts her burst in it (MP counter reads 1 at the last combat frame, never consumed; no 1372.8% nuke popups; no damage spike).** Slug confirmed (RL + "[MAIDEN] MP" counter, boss ARMSTRONG/Water; her 547.62% rider popup 437,296 matches the override). SECONDARY signal (LOW-MED conf): her MP reached only 1 by fight-t≈15s and HELD at 1 through ≈70s — a slow real full-burst cadence, nowhere near the modeled cap 12; weakly suggests a fixed-12 model would OVER-count nuke instances for this comp (directionally consistent with her note's "conservative lower bound"). Can't pin the exact MP-increment trigger from footage. NEEDS a recording that INCLUDES her burst cast (sibling `tb2 1/2/4/5` clips or other maiden-ice-rose team footage). No edit (board OK 0.97).
2. **[low/ENGINE/skill2 · OK 0.97]** → **DOC**
   - finding: The Electric-ally elem-advantage+ATK grant fires on 'when MP is replenished', which per skill1 happens on BOTH Burst-Stage-1 entry AND Full-Burst entry, but is…
   - action: Timing approximation only; magnitude faithful and the 10s buff covers the FB window regardless. Leave as-is unless a measurement shows the ally buff should be live before FB entry.

### `mast-romantic-maid` — board OK 1.023, 2 gotcha(s)

1. **[med/ENCODING/skill2 · OK 1.023]** → **MEASUREMENT**
   - finding: Hangover stun trigger is re-gated from the prose 'when Drunken is at max stacks at the END of Full Burst' to 'every 3rd of HER OWN burst casts' (burstCast ever…
   - action: Deliberate, board-validated interpretation (board OK 1.023), so do NOT change the value to hit a number. This is an open interpretive item the author flagged for manual review: confirm whether the re…
2. **[low/FIDELITY/skill1 · OK 1.023]** → **DEFER**
   - finding: Drunken's 'Hit Rate ▼ 20% per stack (self, up to 3)' is modeled as a flat, always-on normalAttackPct -40 (cycle-average 2 stacks × 20% = ~40% of MG rounds miss…
   - action: Keep the validated -40% damage proxy (do NOT refit it to hit the board — it is calibrated to a real 149M-vs-140M sample). Encoding hitRatePct directly would be inert for an MG (no cone model), so the…

### `miranda` — board no-data, 2 gotcha(s)

1. **[low/FIDELITY/skill2[2] + burst[0] targeting (alliesTopAtk) · no-data None · FRESH]** → **DOC**
   - finding: The code ranks 'highest ATK' allies by staticAtk (base/out-of-combat ATK), but the kit text says 'highest final ATK' (live buffed ATK). A real but practically…
   - action: Likely no change needed: ranking by base ATK selects the same carry as ranking by final ATK in practice. If exact fidelity is wanted, rank candidates by live effectiveAtk at the selection instant — b…
2. **[low/SILENT_DROP/skill1 (both Hit Rate lines) · no-data None]** → **DOC**
   - finding: Both S1 Hit Rate buffs (▲5.44% all allies, ▲3.79% SMG allies, 5s, effectively permanent at SMG cadence) are dropped as 'inert' — but Hit Rate is NO LONGER iner…
   - action: Re-evaluate, do not keep dropping on the 'inert' premise. Faithful model = add the two S1 Hit Rate buff blocks (hitCount 30 trigger, 5s, effectively permanent) with the DATAMINED values hitRatePct 5.…

### `rapi-red-hood` — board OK 0.972, 2 gotcha(s)

1. **[low/FIDELITY/skill2 / burst (in-FB rocket cadence + carryover) · OK 0.972]** → **DEFER**
   - finding: The burst Stage 3 line 'Skill 2's requirement for triggering attachable projectiles ▼ 60 for 10 sec' (a timed 10s debuff lowering the 120 requirement to 60) is…
   - action: needs measurement — a meter-carryover measurement can discriminate the threshold-switch model from a true timed ▼60 debuff + fill-rate model (the note flags this explicitly). If discriminated, encode…
2. **[low/SILENT_DROP/burst (Stage 3) · OK 0.972]** → **DOC**
   - finding: Stage 3 'Explosion Radius ▲100.62% for 10 sec (self)' is absent from the override entirely — not in any block and not in the unmodeled array (which only cites…
   - action: Documentation completeness only: add 'Explosion Radius ▲100.62% for 10 sec (self; Burst Stage 3)' to unmodeled.burst. No damage change — inert on the partless single boss.

### `ade-agent-bunny` — board OK 1.001, 1 gotcha(s)

1. **[low/ENGINE/skill2 · OK 1.001]** → **OWNER/ENGINE**
   - finding: hasPierce boolean applies from t=0 instead of after Spy Lens reaches max stacks (~16s / 10 full-charge hits). The kit says 'Activates only if Spy Lens is at ma…
   - action: Needs engine support for step-gated pierce acquisition (e.g., a gainPierceAtHitCount or pierceAfterStacks field). The engine already has gainPierce → pierceUntilFrame for timed pierce windows (game-m…

### `bready` — board no-data, 1 gotcha(s)

1. **[med/FIDELITY/burst · no-data None]** → **MEASUREMENT**
   - finding: 'Aftertaste Effect ▲ 349.8%' is encoded as additive sustainedDamagePct (Damage-Up bucket) rather than as a potential multiplicative DoT-magnitude scalar. If mu…
   - action: Needs measurement. Recipe: record a Bready burst window with Lingering Taste active; compare the Aftertaste DoT tick popup values during the 10s burst buff against (a) additive prediction: ATK × 1.50…

### `helm` — board OK 1.02, 1 gotcha(s)

1. **[low/FIDELITY/skill1 · OK 1.02]** → **DOC**
   - finding: 'Critical Rate of normal attacks' qualifier dropped — buff applies to all damage types including S2 skill procs
   - action: No change recommended without measurement. The impact is negligible: the buff is up for only 5s on last-bullet-hit, the S2 proc is a fraction of total damage, and the board validates at 1.020 (OK). I…

### `ludmilla-winter-owner` — board no-data, 1 gotcha(s)

1. **[low/ENGINE/skill1 · no-data None · FRESH]** → **DEFER**
   - finding: Intra-block effect ordering makes the 158.43% rider self-benefit from its own just-applied 12.56% Damage Taken debuff: effects[0] (damageTakenPct) is applied t…
   - action: needs measurement — verify against footage whether the 158.43% rider benefits from the simultaneously-applied 12.56% Damage Taken debuff (intra-proc frame ordering). If the real game applies the debu…

### `mana` — board no-data, 1 gotcha(s)

1. **[low/ENGINE/burst · no-data None · FRESH]** → **OWNER/ENGINE**
   - finding: Mana's sustained DoT ticks do NOT crit at baseline (engine env-gates tick-crit off via XCRIT, empty default), whereas DoTs empirically crit in-game (~47%). Thi…
   - action: Needs the engine DoT-crit flip (open-questions U13), NOT a Mana override change. Recipe: enable tick-crit in dealDamage's DoT/proc path (default XCRIT on) and recalibrate the DoT roster (offsetting e…

### `raven` — board no-data, 1 gotcha(s)

1. **[med/ENGINE/skill1 (S1 sustained DoT execution) · no-data None · FRESH]** → **OWNER/ENGINE**
   - finding: DoT ticks never crit in the engine (DOT_CRIT/XCRIT default off), but DoTs empirically DO crit in-game — a systematic under-credit on Raven's DOMINANT damage bu…
   - action: Engine-level, NOT a Raven number: flip DoT/proc crit in dealDamage so ticks crit at the caster's rate per SSOT §1b (empirically confirmed), as the tracked global increment U13 with a DoT-roster recal…

### `rosanna-chic-ocean` — board no-data, 1 gotcha(s)

1. **[low/ENGINE/skill2 (sustained DoT, line 2b) · no-data None · FRESH]** → **DOC**
   - finding: Her sustained DoT (the unit's entire personal damage source) never crits in the engine — no `crit` field → DOT_CRIT/XCRIT global gate, default OFF — but the SS…
   - action: No per-unit fix — needs the engine DoT-crit flip tracked in open-questions U13 (wire DoT crit into dealDamage's DoT path / flip the XCRIT default, then recalibrate the DoT roster, since current DoT v…

### `snow-white-heavy-arms` — board OK 0.982, 1 gotcha(s)

1. **[low/FIDELITY/skill2 · OK 0.982]** → **DOC**
   - finding: The skill-2 'Fixes charge time at 1.2 sec continuously' line is discussed in the override's prose note but is ABSENT from the structured unmodeled.skill2 array…
   - action: Add the verbatim line 'Activates at the start of battle. Affects self. Fixes charge time at 1.2 sec continuously.' to unmodeled.skill2 for array completeness. No engine change needed — datamined base…

---

## Phase E — Deferred / low-severity / board-neutral fidelity tail

The `DEFER`-tagged gotchas above (low severity, OK/no-data board). Correct-but-inert today — e.g. `liberalio`
(external charge-speed immunity, Λ-selector edge, consolidated 5×40.5% proc, charge-speed-off-stat),
`rouge` (Max-HP double-count — moot while ally-Max-HP→ATK feeding is off), `helm` (normal-attack crit
qualifier), `mast-romantic-maid` (Drunken hit-rate-as-damage proxy gauge over-credit). Revisit only if their
board moves or a relevant primitive (A4) lands.

---

## Recommended order of attack

1. **Land Phase B now** (B1–B3). Zero risk, `verify.sh` only — gets 7+ overrides telling the truth about
   `hitRatePct` and clears the stale-caveat backlog in one focused pass.
2. **Owner rules on Phase A**, in this order: **A1 (U13)** first — it is the single largest systematic
   under-credit and unblocks the DoT roster (`ada`/`mana`/`raven`/`rosanna`) + the function riders
   (`modernia`/`nayuta`/`neon`); then **A2** (same-cast guard) and **A3** (static-vs-final ATK) as their
   measurements arrive; **A4** primitives opportunistically as a unit's measurement needs one.
3. **Work Phase C head** (the 22 kits with high-severity gotchas) in the listed order. Each is gated on
   its measurement recipe — batch the focus-video work by mechanic (e.g. one SG core-rate session sizes
   `nayuta`/`soda`/`trina`/`miranda` together; one true-damage session covers `chisato`/`jill`).
4. **Sweep the ENACT-NOW items** whenever a `verify.sh` window is cheap — these move boards with existing
   primitives and datamined/kit-text values: `milk-blooming-bunny` (`gainPierce` 6s lights up her whole
   Pierce package, COLD 0.681), `d-killer-wife` S1 (`alliesOfWeapon SR` target correction), `eve`
   (reload-refund Electric gate + the 0.04-fraction 3-round refund), `soda-twinkling-bunny` (chip-gated
   Full-Burst extension tiers), `noir` (`maxAmmoFlat` 5 all-allies grant, HOT 1.119), `grave`
   (`maxAmmoFlat` 3, negligible), `jill` (trueNormals burst window via the chisato/takina encoding —
   core-retention caveat). `cinderella-crystal-wave` strip-`core:true`-Snipe is a faithful board-inert
   correction too, but confirm with a Snipe-mode core-exposed reading first (tagged MEASUREMENT).
5. **Defer Phase E** until a board moves or a primitive lands.

## Cross-references

- `docs/engine-modeling-gaps.md` §2026-07-20 — engine-level audit findings + the 19-theme routing.
- `docs/open-questions.md` — **U13** (DoT/rider no-crit), **U16** (Soda burst over-generation),
  **U17** (per-unit SG landing), **U19** (grave burst-window over-model).
- `docs/handoffs/kit-audit-fixplans/` — deep per-kit scientific-method briefs: `anis-star`,
  `cinderella-crystal-wave`, `dorothy-serendipity`, `maiden-ice-rose`, `moran`.
- `docs/handoffs/kit-parse-reconciliation-backlog.md` — the live owner-reconciliation backlog (route
  ENCODING/FIDELITY items here as they get picked up).
- Raw audit evidence: `scripts/blind-rebuild/results/<slug>.json`, `scripts/blind-rebuild/reviews/<slug>.json`.

---

## Appendix — completeness check (all 53 kits / 106 gotchas)

Subkind/gate keys: FID=FIDELITY, ENG=ENGINE, ENC=ENCODING, SIL=SILENT_DROP · DOC/ENA(ct)/OWN(er)/MEA(sure)/DEF(er).

| kit | board | gotchas | high | subkinds | gates |
|---|---|---|---|---|---|
| `naga` | HOT 1.08 | 2 | 2 | 2ENC | 2MEA |
| `red-hood` | COLD 0.867 | 2 | 2 | 1FID 1ENG | 2MEA |
| `snow-white` | no-data | 4 | 2 | 1ENG 3ENC | 2OWN 2MEA |
| `noir` | HOT 1.119 | 4 | 1 | 3ENC 1ENG | 1ENA 2DOC 1MEA |
| `elegg-boom-and-shock` | COLD 0.825 | 3 | 1 | 2FID 1ENG | 3MEA |
| `prika` | COLD 0.691 | 3 | 1 | 1SIL 2FID | 3MEA |
| `ada` | COLD 0.902 | 2 | 1 | 1ENC 1ENG | 1MEA 1OWN |
| `chisato` | HOT 1.202 | 2 | 1 | 2ENG | 1MEA 1OWN |
| `cinderella` | COLD 0.937 | 2 | 1 | 1FID 1ENG | 2OWN |
| `diesel-winter-sweets` | COLD 0.824 | 2 | 1 | 1ENC 1FID | 2MEA |
| `maxwell` | COLD 0.925 | 2 | 1 | 1FID 1ENG | 1MEA 1OWN |
| `mint` | COLD 0.776 | 2 | 1 | 1ENC 1FID | 2MEA |
| `modernia` | COLD 0.868 | 2 | 1 | 1ENC 1ENG | 1MEA 1OWN |
| `quency-escape-queen` | HOT 1.14 | 2 | 1 | 2FID | 2MEA |
| `scarlet-black-shadow` | HOT 1.042 | 2 | 1 | 1ENC 1ENG | 2MEA |
| `soda-twinkling-bunny` | OK 1.021 | 4 | 1 | 1ENG 3FID | 2MEA 1ENA 1DEF |
| `mari` | no-data | 3 | 1 | 1ENC 2FID | 1MEA 1DEF 1DOC |
| `asuka-wille` | no-data | 2 | 1 | 1SIL 1ENG | 2MEA |
| `d-killer-wife` | OK 0.996 | 2 | 1 | 1FID 1ENC | 1OWN 1ENA |
| `tove` | no-data | 2 | 1 | 2FID | 2MEA |
| `laplace` | no-data | 1 | 1 | 1ENG | 1MEA |
| `privaty` | OK 0.971 | 1 | 1 | 1FID | 1MEA |
| `grave` | HOT 1.179 | 3 | 0 | 3FID | 2MEA 1ENA |
| `moran` | COLD 0.739 | 3 | 0 | 3ENG | 1MEA 1OWN 1DOC |
| `anis-star` | COLD 0.954 | 2 | 0 | 1ENG 1FID | 1DOC 1MEA |
| `arcana-fortune-mate` | HOT 1.132 | 2 | 0 | 1ENC 1FID | 1MEA 1OWN |
| `dorothy-serendipity` | HOT 1.115 | 2 | 0 | 1FID 1ENG | 1MEA 1DOC |
| `milk-blooming-bunny` | COLD 0.681 | 2 | 0 | 1ENC 1FID | 1ENA 1MEA |
| `nayuta` | COLD 0.897 | 2 | 0 | 1ENG 1ENC | 1OWN 1MEA |
| `rouge` | HOT 1.052 | 2 | 0 | 1ENC 1FID | 2MEA |
| `ein` | COLD 0.805 | 1 | 0 | 1ENG | 1OWN |
| `jill` | HOT 1.042 | 1 | 0 | 1ENG | 1ENA |
| `neon-vision-eye` | HOT 1.083 | 1 | 0 | 1ENG | 1MEA |
| `trina` | HOT 1.151 | 1 | 0 | 1FID | 1MEA |
| `velvet` | HOT 1.059 | 1 | 0 | 1FID | 1MEA |
| `liberalio` | OK 0.992 | 5 | 0 | 4FID 1ENG | 3DEF 1DOC 1MEA |
| `cinderella-crystal-wave` | OK 0.99 | 3 | 0 | 2ENC 1FID | 1MEA 2DEF |
| `arcana` | no-data | 2 | 0 | 2FID | 2MEA |
| `eve` | no-data | 2 | 0 | 1ENC 1FID | 1ENA 1OWN |
| `guilty` | no-data | 2 | 0 | 1FID 1ENG | 1OWN 1DEF |
| `isabel` | no-data | 2 | 0 | 1ENG 1ENC | 1MEA 1DEF |
| `maiden-ice-rose` | OK 0.97 | 2 | 0 | 2ENG | 1MEA 1DOC |
| `mast-romantic-maid` | OK 1.023 | 2 | 0 | 1ENC 1FID | 1MEA 1DEF |
| `miranda` | no-data | 2 | 0 | 1SIL 1FID | 2DOC |
| `rapi-red-hood` | OK 0.972 | 2 | 0 | 1SIL 1FID | 1DOC 1DEF |
| `ade-agent-bunny` | OK 1.001 | 1 | 0 | 1ENG | 1OWN |
| `bready` | no-data | 1 | 0 | 1FID | 1MEA |
| `helm` | OK 1.02 | 1 | 0 | 1FID | 1DOC |
| `ludmilla-winter-owner` | no-data | 1 | 0 | 1ENG | 1DEF |
| `mana` | no-data | 1 | 0 | 1ENG | 1OWN |
| `raven` | no-data | 1 | 0 | 1ENG | 1OWN |
| `rosanna-chic-ocean` | no-data | 1 | 0 | 1ENG | 1DOC |
| `snow-white-heavy-arms` | OK 0.982 | 1 | 0 | 1FID | 1DOC |
