# Manual review — `d-killer-wife` (D: Killer Wife)

**Gauntlet verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **Tier 2**
**Date:** 2026-07-25 · **Driver:** Qwen · **Blind roles:** claude-fable-5 (S2b) / claude-opus-5 (S5/S6/S7)

Fire SR Burst-I Supporter — the SR/Fire **variant** of the SMG/Wind base unit `d` (a wholly different
kit; the two slugs are never conflated). Her whole kit is paced by her OWN full-charge shots: every
**8** full charges she shaves **7s** off the whole team's Burst cooldowns (her main support channel),
and every **5** she gives all allies **+5.06% Attack Damage** for 10s. On every Full Burst entry she
hands **13.55% Pierce Damage** (10s) to every Sniper-Rifle ally (herself included). Her burst fires a
**269.28%-of-final-ATK** hit and stamps the target with **Wipe Out** for 10s; while that mark is up,
allies shooting the marked enemy earn an ATK bonus worth **12.19% of her own ATK** on **body** hits
(the **parts** branch — +16.26% core damage — is out-of-domain on the partless scope-lock boss).

## Line inventory (8 lines)

| Line | Encoding | Disposition |
| --- | --- | --- |
| S1 Full Charge ×3 → self: Gain Pierce 1 shot | UNMODELED verbatim (damage-inert on partless boss; W1 pins skill1 emits EXACTLY {pierceDamagePct}) | DOCUMENTED_GAP |
| S1 FB-enter → SR allies: Pierce Damage ▲13.55%/10s | `fullBurstEnter`/`alliesOfWeapon SR`/pierceDamagePct 13.55 `durationSec 10` | FAITHFUL |
| S2 Full Charge ×8 → allies: Burst CDR ▼7s | `hitCount:8`/allies/`burstCdr 7` (recurring; no event — observed via FB cadence) | FAITHFUL |
| S2 Full Charge ×5 → allies: Attack damage ▲5.06%/10s | `hitCount:5`/allies/attackDamagePct 5.06 `durationSec 10` | FAITHFUL |
| Burst: 269.28% final ATK additional damage | `burstCast`/enemy/`flatDamage` atkPct 269.28 (no core; FB-exempt by cast timing) | FAITHFUL |
| Burst: inflicts Wipe Out 10s | `burstCast`/enemy/`targetStatus "Wipe Out"` `durationSec 10` (gate for the riders; block order load-bearing) | FAITHFUL |
| Burst parts branch: core damage ▲16.26%/10s | REMOVED (skipped-conditional; out-of-domain — partless boss; was an all-ally core-bucket over-credit) | DOCUMENTED_GAP |
| Burst body branch: ATK ▲12.19% of caster ATK/10s | `burstCast`/allies/casterAtkPct 12.19 `durationSec 10`, gated `requiresTargetStatus "Wipe Out"` | FAITHFUL |

## Cross-family convergence

- **S2b (fable) test-faithfulness review:** independently re-derived all 8 lines (leakDetected declared
  on a schema comment naming Wipe Out; reviewer re-derived from prose alone). Converged on SR-scoped
  FB-enter pierce 13.55, recurring burstCdr 7, attackDamagePct (not atkPct) 5.06, the 269.28 burst-cast
  nuke, the Wipe Out gate, and casterAtkPct 12.19 flat-resolved. Its two "FIX" calls (model the S1a
  pierce tag; flag the body-branch proxy) are modeling-completeness preferences the driver already
  addresses (documented UNMODELED; ⚑-flagged proxy) — both damage-neutral at scope-lock.
- **S5 (opus) blind test:** authored from prose alone (leakDetected null). Run against the driver's
  shipped override: **17 green / 6 red / 3 skip.** Every red re-classifies as a non-gotcha (below); the
  17 greens cover all load-bearing faithfulness claims.
- **S6 (opus) blind override:** independently chose the SAME magnitudes (13.55/7/5.06/269.28/16.26/12.19)
  and mechanisms. **Most tellingly, it placed `requiresCore` on the PARTS branch and left the body branch
  status-gated only** — the exact correction the S7 judge later demanded of the driver (see below). Its
  own caveat concedes the parts branch "can OVER-CREDIT … a strict reading would leave it fully inert,"
  independently corroborating the driver's 2026-07-17 removal.
- **S7 (opus) reconciling judge:** first pass **NO-GO(faithfulness), 0.875** with ONE REAL-GOTCHA; after
  the fix, **GO, faithfulness 1.0, discriminationOk true, zero gotchas.** 8/8 lines FAITHFUL (6) or
  DOCUMENTED_GAP (2), both gaps carrying the full ⚑ triple.

## The one REAL-GOTCHA (found by the judge, FIXED)

**Stranded `requiresCore` gate on the body branch.** The body-hit rider carried `requiresCore:true` —
the parts→core proxy left behind when the parts branch was deleted (2026-07-17). The kit splits the
rider by area: "Allies that hit **parts**" → coreDamagePct, "Allies that hit the **body**" →
casterAtkPct. On the partless boss the only modelable area split is core-vs-non-core, so **body =
non-core** — gating the *body* branch on `requiresCore` asserted the **complement** of the kit line
(it would be maximally live at coreHitRate 0, where every hit is a body hit, yet `requiresCore` gated
it *out* there). The blind S6 override, prose-only, had correctly put that gate on the parts branch.

**Fix (exactly as the judge prescribed):** deleted `requiresCore` from the body branch (Wipe Out is now
the sole gate); re-pointed W7's third assertion to pin the correct **direction** (body branch fires
identically at coreHitRate 0 and 1 — a regression re-adding `requiresCore` fails at coreHitRate 0);
re-pointed the `requiresCore` proxy note onto the parked parts branch where it belongs. **Board impact:**
byte-identical at the scope-lock basis (coreHitRate 1, where the branch fired before and after) and
correctly larger on validate-overrides' coreHitRate 0 smoke basis (54.6M→57.1M) — the faithful direction.

## The 6 blind-test reds (all non-gotcha, ruled individually by the judge)

1. **#1 & #5** assert a `coreDamagePct 16.26` witness the driver correctly **deleted** (the ungated parts
   branch was a live all-ally core-bucket over-credit on a boss where no ally can earn it; the driver's
   own `cfPartsReadded` counterfactual proves it lifts all three totals). The burst provably casts via
   the 269.28 nuke + the body-branch casterAtkPct.
2. **#2** targets the documented, verbatim-recorded S1a inert-line omission; the blind test's OWN
   inertness assertion (teammates byte-identical without the tag) passes.
3. **#3 & #4** are primitive-NAME over-specification: `hitCount` vs `chargeCounter` is behaviorally
   identical for an SR that always full-charges on auto (mechanics §4/§7); every behavioral assertion
   in those blocks is green.
4. **#6** is a blind-test fixture leak: the `casterAtkPct` filter is not caster-isolated, so crown's own
   kit casterAtkPct contaminates the value set (size 2). The driver test W7 isolates by caster and pins
   the single flat value (12.19/100 × staticAtk).

## Same-model residual for owner spot-check (priority order)

1. **The surviving `requiresTargetStatus "Wipe Out"` gate on the body branch is in-fixture-NEUTRAL** —
   her burst always inflicts the status the same frame the gated block fires, so no test in this suite
   would catch that gate being dropped entirely. Documented, not asserted; only matters for the future
   parts wiring or a comp where the status could be absent.
2. **The 13.55% Pierce Damage buff applies correctly but is damage-INERT in this comp** — the only pierce
   tag this unit self-sources is the deliberately-unmodeled S1a line. S1a and S1b are coupled; closing
   S1a would need a measured one-shot window (S6 had to invent an unmeasured 1.2s), so the honest gap is
   the right call, but the pair currently contributes nothing to her own damage here.
3. **Every full-charge threshold (3/5/8) rides the datamined cadence tuple** (chargeFrames 60 /
   reloadFrames 141 / ammo 6), which S6 flagged ⚑ — the burstCdr firing rate and the 5.06% uptime are
   only as good as that tuple, and driver + both blinds share it, so agreement there is not independent
   evidence. All magnitudes are prose-sourced lv10 values (13.55/7/5.06/269.28/16.26/12.19), none tuned.

**Board:** 3 graded comps, mean 0.953 (COLD ▼, 0.90–0.98) — unchanged by the fix (byte-identical at the
scope-lock coreHitRate 1 the graded comps use).
