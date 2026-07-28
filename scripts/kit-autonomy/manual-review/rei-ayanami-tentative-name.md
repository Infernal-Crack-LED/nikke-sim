# Manual review — rei-ayanami-tentative-name (Rei Ayanami (Tentative Name))

**Gauntlet date:** 2026-07-28
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`burstCast`-vs-`fullBurstEnter` on the self-mode; status-gate via the `requiresTargetStatus` "Attack State" proxy; scoped flat `casterAtkPct` vs target-scaled `atkPct`)

> Slug disambiguation: `rei-ayanami-tentative-name` is the Evangelion-collab Rei Ayanami
> (AR / Wind / Attacker / Burst III, cd 40s, manufacturer Abnormal, name "Rei Ayanami (Tentative Name)",
> aka "reitn"). She has NO base counterpart and is distinct from the other Eva collab units `asuka`,
> `asuka-wille`, and `mari`. Her kit is deeply interdependent with those units' named statuses
> (Anti A.T. Field / Annihilation State / Attack State); in the v1 single-boss scope most of it is
> collab-team-gated and inert without an Eva teammate.

## Kit summary

Rei Ayanami (Tentative Name) is a Wind-element AR Attacker on Burst III. Her damage-relevant in-scope
core is small. Her burst puts her into a 10-second "Attack State": she gains +35.9% Attack Damage
plus a large flat ATK grant (63.36% of her own ATK), and fires a 990.2%-of-ATK nuke at all enemies at
cast (FB-exempt — the cast lands before the Full Burst window opens). While Attack State is up, every
7 normal attacks she lands fires a 286.37%-of-ATK bonus hit. Whenever ANY Full Burst begins, she gives
the whole team a flat ATK buff equal to 11.61% of her own ATK for 10s (`casterAtkPct`, identical add
per ally — NOT a % of each target's own ATK). The rest of her kit is collab-coupled and inert outside
an Eva team: an every-18-hits 590.64% rider that only works on targets holding the externally-applied
"Anti A.T. Field" status (encoded but faithfully inert in-scope), a team buff that only reaches allies
in "Annihilation State" (no in-scope carrier), and a Machine-Gun ramp-up speed buff for MG allies who
have burst (no engine primitive). In any non-Evangelion comp her effective kit is the burst self-buffs,
the nuke, the team ATK buff, and the burst-windowed 7-hit rider.

## Line-by-line

| Line                                                        | Disposition      | Notes                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: 18 hits vs Anti A.T. Field → enemy flatDamage 590.64%   | FAITHFUL (inert) | `hitCount:18` + `requiresTargetStatus "Anti A.T. Field"`; no in-scope unit applies the status as a targetStatus → zero fires; H5 pins inertness (removal-neutral)                                                                 |
| S1: Anti A.T. Field stacks ▲ 10                             | DOCUMENTED_GAP   | No add-stacks-to-existing-debuff primitive; the 590.64% proc it rides IS modeled (above); verbatim in `unmodeled`                                                                                                                 |
| S1: 7 hits in Attack State → enemy flatDamage 286.37%       | FAITHFUL         | `hitCount:7` + `requiresTargetStatus "Attack State"`; the self-mode is proxied as a boss targetStatus (10s, matching the self-buff window exactly); H1 gates it (every proc ≤10s post-cast; ungated counterfactual strictly more) |
| S1: FB → Annihilation-State allies: units ▲1 / range ▲500%  | DOCUMENTED_GAP   | Meta-modifiers of another unit's (asuka-wille's) effect; no ally-self-mode gate + no cross-unit param primitive; verbatim                                                                                                         |
| S1: FB → Annihilation-State allies: casterAtkPct 17.6/9s    | DOCUMENTED_GAP   | Real buff on an un-expressible ally target set; faithfully zero in-scope; H2 asserts NO 17.6%-ratio buff ever leaks into the 11.61% line                                                                                          |
| S2: FB → MG burst-caster allies: MG Ramp-Up Speed ▲100%/13s | DOCUMENTED_GAP   | No MG wind-up StatKey (asuka-wille ⚑2); compound MG∧burst-caster target inexpressible; inert on non-MG comps                                                                                                                      |
| S2: FB → all allies: casterAtkPct 11.61/10s                 | FAITHFUL         | FLAT caster-scaled add (≈0.1161×staticAtk, identical per ally), `fullBurstEnter` (every FB, incl. the co-B3's); H2 discriminates vs `atkPct`                                                                                      |
| Burst: burstCast → self attackDamagePct 35.9/10s            | FAITHFUL         | Damage-Up bucket, self only, `burstCast` (own casts only); H3 count == her cast count < FB count (dual-B3 fixture)                                                                                                                |
| Burst: burstCast → self casterAtkPct 63.36/10s              | FAITHFUL         | Flat caster-scaled self add (≈0.6336×staticAtk); paired 1:1 with her burst casts; H3 ratio-identified                                                                                                                             |
| Burst: burstCast → enemy flatDamage 990.2%                  | FAITHFUL         | Burst-cast nuke, FB-exempt (H4: empty `fbMajorApplied` list), snapshots her same-cast self-buffs                                                                                                                                  |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 6 load-bearing lines
  FAITHFUL; 4 non-load-bearing GAP/UNMODELED (Anti A.T. Field stacks, Annihilation units/range,
  Annihilation casterAtkPct 17.6, MG ramp-up). CONVERGED on every line. Reviewer flagged the
  590.64% Anti-A.T.-Field proc as a load-bearing INERTNESS pin (encode-gated + assert inert) rather
  than a drop — driver adopted this (H5). Reviewer's suggested S1-7-hit gate (`fbGate:'inFb'` +
  `ownBurstGate:'cast'`) differs mechanically from the driver's `requiresTargetStatus` proxy but is
  behaviorally equivalent (both gate to her burst window); the test pins the behavior.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 11 kit lines.
  Out-of-box vs the driver override: 15 pass / 3 fail / 5 skip. **All 3 failures were RECON_ERRORs**
  of one kind only: the blind asserted `durationShots` is `undefined`, but the `buffApply` event
  schema is `durationShots:number|null` (null when absent). After that mechanical fix (plus the
  import-path fix the blind location needs): **18 pass / 5 skip / 0 fail**. The 5 skips are the
  UNMODELED GAP lines the blind correctly marks as no-primitive. Every substantive assertion —
  flat `casterAtkPct`, self-only burst buffs, `burstCast`-vs-`fullBurstEnter`, 990.2 FB-exempt,
  590.64 inert, 286.37 gated, no-17.6-leak — passed unchanged against the driver override.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. NEAR-IDENTICAL to the driver: same
  blocks, same UNMODELED set. ONE divergence — the S1 286.37% gate mechanism: opus used
  `fbGate:'inFb'` + `ownBurstGate:'cast'` (FB-window proxy); driver used a burst-applied boss
  `targetStatus "Attack State"` (10s, matching the stated duration exactly). Both are sanctioned
  proxies for the missing self-status primitive; opus itself notes its FB-window version loses the
  ~0.37s pre-FB offset and any post-10s tail.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, 0 gotchas.**
  All 11 lines accounted (6 FAITHFUL + 5 DOCUMENTED_GAP), zero silent drops. Judge ruled the single
  cross-agent encoding divergence (the Attack-State gate) BENIGN — "driver's encoding is the more
  faithful of the two" (duration-exact), the S5 blind suite's gated-vs-ungated discriminator passes
  against it unmodified, and the proxy + its name side-channel are documented in the caveats. The two
  highest-risk misreads (`casterAtkPct` vs `atkPct` on the team buff; `burstCast` vs `fullBurstEnter`
  on the self-mode) are pinned by independent blind assertions with working counterfactuals in both
  suites, and the collab-gated lines are proven inert by removal-delta rather than assumed.

## Residual flags for owner

1. **"Attack State" boss-targetStatus side channel (⚑5).** The self-mode is proxied as a name-keyed
   BOSS status (the asuka-wille pattern; the engine has no self-status gate). The name is a side
   channel any future `requiresTargetStatus "Attack State"` on another unit could read — inert today
   (no in-scope unit does). A `requiresOwnBuff` primitive would replace the proxy.
2. **hitCount:7 counter is cumulative, not window-reset.** The 286.37% proc gates on
   `requiresTargetStatus "Attack State"` but the hit counter accrues across the whole fight rather
   than resetting at each Attack-State window start — the same approximation asuka-wille's S1 uses.
   Behaviorally faithful (procs only land in-window); a window-reset counter would be marginally more
   exact.
3. **Cadence tuple is unverified datamine (⚑4).** AR rate_of_fire 720 (12/s) / ammo 60 /
   reloadFrames 111 / chargeFrames 0 (instant) are datamined, not measured for this collab AR. The
   cheapest outstanding measurement is a focus-video rounds-per-minute + reload-gap read.
4. **Collab-gated lines are inert outside an Eva team.** The 590.64% Anti-A.T.-Field proc, the
   Annihilation-State ally buff (units ▲1 / range ▲500% / casterAtkPct 17.6), and the MG ramp-up buff
   are all 0% damage in any non-Eva comp. They go live only if the Eva teammates (asuka-wille applies
   Annihilation State / Anti A.T. Field) are modeled with matching name-keyed channels AND the missing
   primitives (add-stacks, ally-self-mode gate, cross-unit param mod, MG wind-up) land. Each is
   documented in the override with an estimate + recipe + tier.
5. **MODEL_ONLY / tuned:false.** The gauntlet certifies STRUCTURE (faithfulness), not tuning. With no
   recording, the unit stays MODEL_ONLY and the board row is null until a real fight validates it.
