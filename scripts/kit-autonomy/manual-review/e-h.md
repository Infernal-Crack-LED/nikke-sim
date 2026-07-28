# Manual review — e-h (E.H.)

**Gauntlet date:** 2026-07-27
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (resource-gate craft chain; scoped `elemAdvantageDamagePct` buff; round-count `maxShots` swap deactivation; `burstCast`-vs-`fullBurstEnter`)

> Slug disambiguation: `e-h` IS the standalone unit E.H. (data name "E.H.", SMG/Wind/Attacker/Burst
> III, Elysion, resource_id 113). No base counterpart exists; lint clean (no AMBIGUOUS).

## Kit summary

E.H. is a Wind-element SMG Attacker on Burst III built around a Scrap→magazine crafting chain. She
starts battle with 10 Scraps (skill2 E1), which immediately trips skill1: spend the 10 Scraps, craft
1 homemade magazine (cap 4), and hold a permanent ATK ▲7.5% × magazines buff (a live per-resource
read, so +7.5% at the in-scope steady state). Each time she obtains Scraps she also gains +16.36%
Elemental Advantage Attack Damage for 15s — in scope that fires exactly once (the battle-start
grant), so it is a frame-0 fused passive that lapses at t=15s. Her other three Scrap sources
(destructible projectile +1, enemy part +5, enemy neutralized +2) have NO carrier in the v1 sim
(no projectile entities, partless boss, immortal solo target) and sit verbatim in `unmodeled`. Her
burst CHANGES THE WEAPON: a 0.4s-charge weapon dealing 61% of final ATK per shot (×2.5 on full
charge = 152.5%), loaded with 1 round per magazine (1 in scope), deactivating on the 10s duration
OR when all rounds are fired (`maxShots 1`), plus ATK ▲430.05% for 10s keyed to HER OWN burstCast
— covering both the single swap shot (which lands inside the FB window she opens, taking the +50%
major) and her resumed SMG fire. On the scope-lock partless solo boss she fights the whole fight
with exactly one magazine: +7.5% ATK and one 152.5% charged shot per burst.

## Line-by-line

| Line                                                                       | Disposition    | Notes                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: on 10 Scraps & <4 magazines → craft (remove 10, +1 mag)                | FAITHFUL       | Resource chain: `scrap` pool seed 10 → passive craft block (`resourceGate scrap≥10` → scrap −10, magazine +1); fires once at frame 0                                                                                             |
| S1: ATK ▲7.5% continuously × magazines                                     | FAITHFUL       | `perResource {magazine, mult 7.5}` live read, no expiry; exact-diff pin: baseAtk Δ = staticAtk×0.075 vs chain-broken, still at t≈70s; 0- and 4-magazine counterfactuals discriminated                                            |
| S2 E1: battle start Scraps ▲10 (max 10)                                    | FAITHFUL       | Encoded as the pool SEED (`resources[].initial 10`, soda precedent), not a block; one-shot, never recurring                                                                                                                      |
| S2 E2: destructible projectile → Scraps ▲1                                 | DOCUMENTED_GAP | Verbatim in `unmodeled`; no projectile entities/events in v1; no interval drip substituted                                                                                                                                       |
| S2 E3: enemy part destroyed → Scraps ▲5                                    | DOCUMENTED_GAP | Verbatim in `unmodeled`; scope-lock boss is partless                                                                                                                                                                             |
| S2 E4: enemy neutralized → Scraps ▲2                                       | DOCUMENTED_GAP | Verbatim in `unmodeled`; immortal solo boss never neutralized in-fight                                                                                                                                                           |
| S2 E5: on Scrap gain → Elem Advantage Atk Dmg ▲16.36%/15s                  | FAITHFUL       | `elemAdvantageDamagePct` (Element bucket, advantage-gated by construction, MEASURED 2026-07-14 battery 5); fused passive frame 0, expires t=15s; mult.elem 1.2636→1.1 pinned; Fire-boss run byte-identical with the line removed |
| Burst: weapon change (61% final ATK, ×250 full charge)                     | FAITHFUL       | `weaponSwap {damagePct 61, chargeMultPct 250, chargeTimeSec 0.4}`; exactly one atkPct-61 instance per cast at mult.charge 2.5; lands <1s after cast, fbMajorApplied                                                              |
| Burst: max ammo 1 × magazines; duration 10s; all-rounds-fired deactivation | FAITHFUL       | `maxAmmo 1 / durationSec 10 / maxShots 1` (in-scope values); no-maxShots counterfactual refires ~5×/window — discriminated                                                                                                       |
| Burst: ATK ▲430.05% for 10s                                                | FAITHFUL       | `burstCast`/self (NOT fullBurstEnter — co-B3 helm fixture: applications == her casts < team FB count; fullBurstEnter counterfactual over-applies); exact staticAtk×4.3005 diff in-window, 0 outside                              |

## Judgment calls (owner spot-checks)

1. **Magazine persistence.** The kit never states the burst CONSUMES a magazine — "Max Ammunition
   Capacity: 1 x the number of homemade magazines" reads as the live count, so magazines persist and
   EVERY cast loads 1 round. The consumption reading would leave later casts with 0 rounds (no Scrap
   income to re-craft). Driver + S2b fable converged on persist; the unit test pins one swap shot per
   cast on every cast. **A recording confirming one swap shot on her SECOND burst cast closes the loop.**
2. **Static maxAmmo/maxShots at 1.** The dynamic magazine→ammo link awaits out-of-scope Scrap events
   (parts/projectiles/neutralize). ⚑ tier 2 with recipe: a resource-scaled swap-ammo engine primitive
   (`weaponSwap.maxAmmo/maxShots` read from a named pool at cast).
3. **Fused-passive E5.** "When obtaining Scraps" fires exactly once in scope (battle start), so the
   frame-0/15s encoding is exact; refresh-on-later-gain awaits the same out-of-scope Scrap events.
4. **One-resourceGate-per-block.** The "<4 magazines" half of the craft condition is carried by the
   magazine pool clamp (max 4); the only misbehavior it could produce (spending Scrap at the magazine
   cap) is unreachable in scope. Documented in caveats.
5. **Swap-exit reload.** On "all rounds fired" the engine forces an empty-belt reload (~1.35s) before
   SMG fire resumes — the shared weaponSwap exit convention (SWHA et al.), in-game restore behavior
   unmeasured. ⚑ low.

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Same 6 load-bearing lines
  FAITHFUL, same 3 skill2 lines UNMODELED verbatim. Independently derived the 1-magazine steady state
  (start 10 / consume 10 / rebuild 0) — killing the 30%-ATK and 4-round-swap over-credit traps — and
  the 152.5% "250% OF damage" reading. Two driver adoptions: (1) the co-B3 (helm) fixture making the
  burstCast-vs-fullBurstEnter discrimination observable; (2) the explicit persist-vs-consume judgment
  pin. One behavior-neutral divergence: fable suggested `elementDamagePct`; driver keeps
  `elemAdvantageDamagePct` (exact kit-phrase carrier, same Element bucket + advantage gate).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all kit lines (23
  assertions). Pristine vs the driver override: 9 pass / 11 fail / 3 skip — **all 11 failures
  harness-wiring/observable artifacts, zero faithfulness divergences**: patch helper iterated
  `ov[slot].blocks` but OverrideFile slots ARE `Block[]` (×5, the phantom-class artifact); perResource
  buffs log authored value 0 and the buffApply event carries no perResource field (×3); broad
  `atkPct||casterAtkPct` filters caught liter's ally-granted flat ATK (×2); `CompOptions.bossElement`
  field path (×1). Wiring-repaired (assertion intent untouched, repairs commented inline): **20 pass /
  3 skip / 0 fail — GREEN vs the driver override.** The 3 skips are the blind's OWN UNMODELED lines —
  the same three Scrap sources the driver records verbatim.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. All magnitudes concur (61/250/152.5,
  7.5, 16.36/15s, 430.05/10s, maxAmmo 1, burstCast/self) and the same three lines verbatim in
  `unmodeled`. Driver strictly ahead on three points the judge confirmed: (1) live resource pools vs
  S6's static magazine=1 resolution (behaviorally equal at scope; the pool keeps re-crafting
  expressible); (2) `maxShots 1` shipped — S6 SKIPPED the all-rounds-fired deactivation as
  inexpressible (the engine HAS the primitive, MEASURED 2026-07-14 SWHA) — without it the swap refires
  ~5× per window; (3) S6's `bossElementGate 'Water'` is a blind misread (Wind beats IRON; the gate
  would silence the line on the advantaged boss) — driver's `elemAdvantageDamagePct` is advantage-gated
  by construction. ⚑s carry estimate + reasoning + recipe.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, zero
  REAL-GOTCHAs.** All 11 kit lines FAITHFUL or DOCUMENTED_GAP. Judge independently sided with the
  driver on both S6 divergences (ruled RECON_ERROR-class against S6, not the driver), certified the
  pristine-11-reds as observable-shape bugs in the blind test, and confirmed discrimination holds on
  every load-bearing line (0/4-magazine worlds, Damage-Up-bucket stat, Fire-boss byte-identity,
  no-chargeMult, noMaxShots, fullBurstEnter re-key). Residual for the owner: the magazine-persistence
  judgment + static maxAmmo link are shared-prior readings no blind party challenged from footage.
