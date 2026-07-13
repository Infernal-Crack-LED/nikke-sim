# Prydwen tier audit — autonomous pass (started 2026-07-12)

STATUS (end of first leg): SSS + SS tiers complete; S tier complete; A tier ~60% complete.
Remaining queue entries are marked "pending" / "retry" below. Regression check: all 7
validated real fights unchanged after the audit. 49 overrides valid, typecheck clean,
site rebuilt. New engine features shipped during the audit: fbGate (in/out full burst),
requiresCore, weaponSwap.trueNormals, flatDamage crit/noRange, casterMaxHpPct stat,
sequentialDamagePct stat, charFixes.chargeFrames, Max Ammo belt-clip, N-full-charge parser
trigger, sustained/sequential/true flavor gating.

Protocol per unit: Wayback-fetch the Prydwen character page → read Bossing rating (skip < A)
→ compare review mechanics vs our kit dump (`npx tsx scripts/kit.ts <slug>`) + override →
fix override if wrong → `npx tsx scripts/validate-overrides.ts <slug>` → record verdict HERE
immediately. Open mechanics questions go to docs/open-questions.md.

Wayback route: `curl "http://archive.org/wayback/available?url=prydwen.gg/nikke/characters/<slug>"`
→ curl snapshot with `-A "Mozilla/5.0" --compressed` → strip tags. Prydwen direct = 403.

Slug notes: prydwen `siren` = our `little-mermaid`; prydwen `helm-treasure`/`privaty-treasure`
= our `helm`/`privaty` (treasure-remapped); prydwen `sparkling-summer-anis` = summer Anis
(distinct from anis-star).

## Queue (Prydwen Story tiers as ordering proxy; bossing rating checked per unit)

### SSS
- [x] anis-star — VALIDATED this session (0.95-1.00 across 4 fights)
- [x] moran-treasure — FIXED (Fervor 20s CD)
- [x] siren (= little-mermaid) — audited, no change (teamAmmo gap logged)
- [x] crown — VALIDATED (0.92-1.14; 0.71 only under privaty ammo cut, open Q2)
- [x] ada-wong — FIXED (grenade cadence 2x)
- [x] rapi-red-hood — VALIDATED (0.96-1.12 post ordering fix)
- [x] vesti-tactical-upgrade — skipped (Bossing B)

### SS
- [x] red-hood — audited, no change
- [x] mast-romantic-maid — validated 0.84-0.86 (mild cold, open Q5)
- [x] mint — FIXED (solo/duet modes)
- [x] nayuta — FIXED (per-shot stage hit + ramp avg)
- [x] prika — FIXED (solo/duet modes)
- [x] takina-inoue — FIXED (S2 cooldown avg + trueNormals swap)
- [x] alice — audited, no change (cycle question logged)
- [x] ein — FIXED (Near Feathers rebuilt, crit/noRange flags)
- [x] helm-treasure (our `helm`) — FIXED this session (charge cycle 90f → 0.92-1.01)
- [x] liberalio — FIXED (202.5%; 1.16 residual, open Q1)
- [x] milk-blooming-bunny — FIXED (auto/manual modes)
- [x] neon-vision-eye — FIXED (Super Firepower exact) → 1.02
- [x] privaty-treasure (our `privaty`) — 1.29→ open Q1 (×0.59 proc factor)
- [x] scarlet-black-shadow — 1.13 (mild, open Q5)
- [x] snow-white-heavy-arms — FIXED (sequential AD dilution → 1.07/1.15)

### S
- [x] d-killer-wife — FIXED (CDR parser bug)
- [x] emma-tactical-upgrade — FIXED (rebuilt, duo/solo modes)
- [x] liter — audited, no change
- [x] rouge — FIXED (casterMaxHpPct grants)
- [x] ade-agent-bunny — audited, no change
- [x] anchor-innocent-maid — audited, no change
- [x] brid-silent-track — audited, no change
- [x] eunhwa-tactical-upgrade — FIXED (rebuilt, modes)
- [x] grave — audited, no change
- [x] naga — FIXED (shield-gated buffs via modes)
- [x] ark-ranger-black — audited (gaps warned)
- [x] asuka-shikinami-langley — FIXED (heal-trigger ATK)
- [x] cinderella — FIXED this session (burst ordering → 1.09-1.16)
- [x] dorothy-serendipity — audited, no change
- [x] modernia — audited, no change
- [x] scarlet — audited, no change
- [x] sparkling-summer-anis — audited, no change

### A
- [x] exia-treasure — MODELED (user screenshot)
- [x] label — skipped (Bossing B)
- [x] miranda-treasure — MODELED (user screenshot)
- [x] soline-frost-ticket — audited, approximation noted
- [x] tia — FIXED (shield-cycle CDR/AD)
- [x] zwei-treasure — audited (pierce gap → Q10)
- [x] blanc — audited, no change (page 404s)
- [x] crust — skipped (Bossing B)
- [x] mari-makinami-illustrious — audited, blocked on Q10
- [x] rosanna-chic-ocean — audited, no change
- [x] trina — FIXED (single-target buff narrowed)
- [x] velvet — FIXED this session (fbGate + charge cycle → 1.05)
- [x] asuka-shikinami-langley — FIXED (heal-trigger ATK)-wille
- [x] bready — logged, bounded gap
- [x] chisato-nishikigi — FIXED (gauge passives)
- [x] diesel-winter-sweets — audited, no change
- [x] e-h — logged, bounded gap
- [x] jill-valentine — FIXED (permanent acid dot)
- [x] laplace-treasure — skipped (Bossing B)
- [x] ludmilla-winter-owner — audited, no change (Bossing S)
- [x] maiden-ice-rose — MP model validated; no-burst 0.60 cold (open Q4)
- [x] maxwell — audited, no change (Bossing S)
- [x] noir — audited, no change (Bossing A)
- [x] phantom — skipped (Bossing B)
- [x] quency-escape-queen — FIXED (route passives)
- [x] rei-ayanami — audited, no change
- [x] snow-white — audited, no change

## Per-unit findings
(appended below as processed)

### moran-treasure (our `moran`) — FIXED (2026-07-12)
Bossing SSS. Parser skipped Fervor ("when Raptures appear: Burst CD ▼20s continuously" —
always active in raids) → she burst at 40s instead of 20s, halving her burst/CDR cadence.
Override: burstCdr 20 on own burstCast (effective 20s CD, bursts every rotation) + S1 47.18%
proc gated fbGate:inFb ("while weapon is changed" = her burst swap window). S2 team CDR 7.48s
kept from parser (Fervor requirement always met). Review confirms team ATK 42.57% casterAtkPct
+ swap/unlimited-ammo burst, both already parsed. No real-sample validation available yet.

### siren (our `little-mermaid`) — AUDITED, no change (2026-07-12)
Bossing SSS-adjacent (SS/SSS per review). Override faithful: FB-end team CDR 7.48s, FB
4%/10.13% AD buffs, Bubble 5.05% permanent taken-debuff, FB sequential dot 253.44%/s. Known
gap (flagged in override note): "per 400/500 total ally ammo" triggers modeled as HER OWN 400/500
hits — undercounts barrage count ~5-8x in MG comps BUT adding a true team-ammo counter would
push her ~1.36 hot unless "Attacks sequentially for N times" is a split-total there. She reads
1.02(T3)/1.15(T6) — leaving alone. ENGINE GAP LOGGED: no team-ammo-consumed trigger.

### ada-wong (our `ada`) — FIXED (2026-07-12)
Bossing S. Flash Grenade (420% true dmg every 2s in FB, every 1s during her own burst) was a
hitCount:3 blend assuming 25% FB uptime — real comps run ~75% → ~2x undercount. Now exact:
fullBurstEnter dot (2s interval, 10s) + a second identical stream on her burstCast (=interval
▼1s rider). Earlier session's sustained/true gating fix already corrected her True Damage ▲
buffs to grenade-only. S1 burstCasters targeting + burst swap kept as authored.

### vesti-tactical-upgrade — SKIPPED (Bossing: B)
Review: "her damage is not impressive at all against only one target... kit designed for
mobbing". Story-SSS but Bossing B — below audit threshold.

### red-hood — AUDITED, no change
B1 usage: Story SS / Bossing A-S. S1 charge-speed stacks parsed (3.81%×10); the excess-over-100%
→ Charge Damage 240% conversion stays unmodeled (inert unless team charge-speed buffs push her
past +100%; surfaced as a warning). Λ burst stages + Red Wolf swap + casterAtk 77.55 modeled.

### mint — FIXED (modes added)
Bossing SS. Override halved all Singing-gated buffs for the solo 50% alternation — correct
solo, but Prydwen confirms Prika enforces PERMANENT Singing (the meta "MiKa" pairing). Added
modes: 'solo' (halved, default) / 'duet (w/ Prika)' (full 45.02 casterAtk per charge + full
stage-3 crit/projExpl/pierce). Site mode pill appears automatically.

### nayuta — FIXED → 1.03 (T5)
Bossing SS. (1) 380.46% stage-target hit was once-per-burst; per Prydwen it lands on every
full charge in SR mode → folded into per-shot rider (530.46 for 10s). (2) S2 stack gates
(9s/30s/90s ramp) were permanent-from-t0 → time-averaged (14.4/16.8/10.5). (3) SR-mode swap
cycle 1.8s → 2.3s (+0.5s bolt recovery, third confirmation of the SR-cycle rule). 1.13 → 1.03.

### prika — FIXED (modes added)
Bossing SS. Real MiKa flow (Prydwen "Ad Infinitum"): Prika bursts ONCE, Mint's Sing Along
re-extends Performance forever, Mint bursts every later rotation. Added modes: 'solo' (25s
Performance per burst, as before) / 'duet (w/ Mint)' (bursts once via self CD +9999, permanent
25% team charge damage + permanent 25.01% Encore AD). Slot order note: Prika LEFT of Mint.
Verified: duet sim shows Prika 1 burst, Mint 5.

### takina-inoue (our `takina`) — FIXED
Bossing A. Three fixes: (1) S2 is a 15s-cooldown pulse (DB text lacks the cooldown line;
parser made both effects permanent) → uptime-averaged: enemy taken 3.36, team True Damage
93.66. (2) NEW ENGINE FEATURE weaponSwap.trueNormals — her burst swap's normal attacks deal
true damage, so True Damage ▲ buffs (hers + team) now apply to swap shots via flavor gating
(they were inert after the gating fix). (3) 6.04% per-hit taken debuff during swap as
shotFired+fbGate:inFb.

### alice — AUDITED, no change
Bossing S. Reworked kit parses clean (S1 team charge-speed/charge-damage on FB, burst self
charge-speed 80.15 + ATK 55.12; pierce/lifesteal inert). Open: whether her 1.5s listed charge
carries the +0.5s SR bolt recovery (no real sample; helm/velvet/nayuta-swap needed it, SWHA's
fixed-1.2s did not, liberalio's DB value already appears cycle-inclusive).

### ein — FIXED (major)
Bossing A. Parser had skipped: S1's 70.12% ATK on stage-3 entry (trigger phrasing), and the
ENTIRE Near Feather system (her main damage). Rebuilt with Prydwen's exact counts: 34 feather
instances per her burst + ~6 between bursts, 90.81% true damage each, CAN CRIT, no +30% range
bonus. NEW ENGINE FLAGS: flatDamage crit/noRange (Prydwen explicitly documents feathers as
FB-boosted but range-exempt — first confirmed range-exempt skill damage; relevant to Q1).
Burst restated (TD 55.3 + charge 140.68 + 300.02 true nuke). Review also confirms stage-3
buffs land before burst damage (our ordering).

### milk-blooming-bunny — FIXED (modes)
Bossing S. Embarrassment needs a manual 1.5s charge-hold (Prydwen) — never procs on auto, but
the override modeled it as her permanent state. Modes added: 'auto (no Embarrassment)' default
(plain SR + S2 burst DoT + burst buffs) / 'manual (Embarrassment cycle)' (previous model).

### rouge — FIXED
Bossing S. Override's CDR (hitCount 8) was already right; PARSER FIX shipped for the general
"Full Charge for N time(s)" trigger (was shotFired-every-shot — also hit d-killer-wife badly,
trony). NEW ENGINE STAT casterMaxHpPct: her Max-HP grants now feed HP→ATK converters
(the Rouge+Cinderella synergy; burst ~22% avg across coin progression + S2 perm 7.5 avg).

### d-killer-wife — FIXED
Bossing A. Parser bug: team burst-CDR 7s fired on EVERY shot (should be every 8 full charges,
~once per rotation) — cooldowns were being flooded. Override with hitCount 8 (CDR) + hitCount 5
(AD 5.06). Parser itself also fixed for the N-full-charge pattern.

### liter — AUDITED, no change
Bossing S. Escalating CDR/ammo/ATK chain parses clean (the escalating effect kind was built
for her). Nothing skipped.

### naga — FIXED (major)
Bossing A. Her shield-gated team buffs (core damage 85.17%/10s + extra 31.02% casterAtk on
burst) were SKIPPED (no shield tracking) — her whole identity, since she is always run with a
shielder (Tia/Blanc/Crown, whose burst shields every rotation). Modes: 'with shielder'
(default; 85.17 core dmg at full FB uptime + both burst ATK lines) / 'no shielder'.

### emma-tactical-upgrade — FIXED (rebuilt, modes)
Bossing A. Structured Function/Effect kit text defeated the parser (nearly everything skipped).
Rebuilt: duo mode (permanent 3.9% taken debuff + team projExpl 2.32) / solo mode (team True
Damage 30.97 + projExpl 3.09, 1/3-uptime taken debuff). Burst casterAtk 40.07 kept.

### ade-agent-bunny — AUDITED, no change
Bossing S. Override present; parses fine. Minimum Effective Range stacks = aiming stat, inert
(warned, correctly). casterAtk/pierce/AD buffs modeled.

### anchor-innocent-maid — AUDITED, no change
Bossing S. Clean parse via escalating (distributedDamagePct team buffs — properly gated to
distributed-flavored dealers by the engine — plus casterAtk chains).

### brid-silent-track — AUDITED, no change
Bossing S. Clean parse: FB-enter taken 15.12 + 636% nuke, per-10-hit taken 12.12, per-5-hit
675% proc, burst casterAtk 66.52.

### eunhwa-tactical-upgrade — FIXED (rebuilt, modes)
Bossing A. AS/LT Formation text all-skipped by parser. Rebuilt: base = team Charge Damage
41.81 + self ATK 42.24; duo mode adds team projExpl 5.11 + True Damage 30.97. Burst swap kept
+ 27.87% taken debuff per swap hit (fbGate). S1 Camouflage-gated self TD left skipped (noted).

### grave — AUDITED, no change
Bossing S. Override present; parses clean (burst crit 85.19/pierce/AD/unlimited ammo all in).

### ark-ranger-black — AUDITED (known gaps surfaced)
Bossing S. Override + sustained flavors correct (fixed earlier this session). Battery/
Transformation loop partially modeled; skipped blocks surface as warnings. Battery-uptime
assumption behind the passive ATK 156.19 unverified — no real sample.

### dorothy-serendipity — AUDITED, no change
Bossing SS. Clean parse (hitCount-80 permanent AD 72, FB atk 75.24, burst attack-speed 65 +
normalAttack +50).

### sparkling-summer-anis (our `anis-sparkling-summer`) — AUDITED, no change
Bossing S. Clean parse; her burst ammo-cut (−73.92%) accelerating her own 382.42% last-bullet
procs works with the new belt-clip rule.

### modernia — AUDITED, no change
Bossing A. Override present (extraHit fix from earlier sessions); clean parse.

### scarlet — AUDITED, no change (v1-scope note)
Bossing A. ATK stacks + burst nuke parse. Her low-HP crit blocks are skipped by the v1
"boss never damages" assumption — correct for sim scope, but real raids may see her low-HP
state active (noted; she is not in meta validation comps).

### diesel-winter-sweets — AUDITED, no change
Bossing SS. Override + sustained flavor gating handle her burn-support kit; Mute mechanics
surface as warnings. No real sample.

### miranda-treasure — DATA GAP (cannot audit)
Bossing S. Her treasure kit is in neither the synergy API (no 宝ミランダ entry; only 8 treasure
kits exist there: tove/bay/poli/julia/centi/privaty/zwei/moran) nor our DB row (base kit only,
no Phase markers). Needs a new data source (blablalink?) before she can be modeled.

### tia — FIXED
Bossing A. S1 team CDR 13s + AD 32.11%/10s were skipped (cover/shield-cycle triggers) —
now fullBurstEnter (once per rotation). She is the shielder for naga's 'with shielder' mode.

### trina — FIXED
Bossing A. S2's 94.15% AD + 50.82% reload is single-target ("1 leftmost Electric AR ally") but
parsed to ALL allies (5x over-buff) → narrowed to alliesOfElement Electric (exact for the
usual one-Electric-carry comps, e.g. Trina→Moran).

### bready — LOGGED, not modeled (bounded gap)
Bossing A. Taste/Aftertaste + EVE-pair base-ATK mechanics half-parse; sustained pieces flavor
correctly, duo economy not modeled. Niche duo unit; no validation sample.

### e-h — LOGGED, not modeled (bounded gap)
Bossing A. Scrap-crafting economy fully unsupported; vs a partless boss scraps barely generate
(parts/projectile kills feed it), so her scrap buffs are near-inert in our test scenario anyway.
Burst swap + parsed values remain. The stray "ATK 430.05" parse needs eyes if she's ever used.

### zwei-treasure (our `zwei`) — AUDITED, no change (engine gap logged)
Bossing S. Clean parse (pierce-damage stacks, crit-rate stacks, burst swap). BUT her pierce
buffs are inert in v1 — see open Q10.

### rosanna-chic-ocean / snow-white / rei-ayanami — AUDITED, no change
Bossing S / S / A. All parse clean (rosanna + snow-white have overrides; SW's 499.5%
railgun swap modeled; rei's per-100-hit procs + stage casterAtk fine).

### asuka — FIXED
Bossing A. S1 ATK 96.98%/25s ("when recovery takes effect") was skipped; her comps always
carry recurring heals → modeled as permanent passive (noted caveat for healer-less comps).

### asuka-wille — AUDITED (gaps warned)
Bossing S. Override present (heat penalty −40 normalAttack modeled); Emergency Repair MG
heat/ammo economy unsupported but surfaced as warnings.

### maxwell / ludmilla-winter-owner / noir — AUDITED, no change
Bossing S / S / A. All parse clean (maxwell's 813.42% railgun swap, xLudmilla's per-hit
procs, noir's SG support buffs). Overrides already present for maxwell + ludmilla-WO.

### phantom — SKIPPED (Bossing B)

### soline-frost-ticket — AUDITED, approximation noted
Bossing A. Ticket bookkeeping unsupported; the FB-enter team CDR 7.48s parses and fires each
rotation, which matches her B1 20s-CD usage. Ticket-cap edge cases unmodeled (warned).

### mari — AUDITED, blocked on Q10
Bossing A. Her core-hit team Pierce Damage 40.99 is skipped, but pierceDamagePct is inert
anyway (Q10). Revisit when pierce支 support lands. Rest parses.

### chisato — FIXED
Bossing A. Extrasensory-gated ATK 53.69 + True Damage 48.62 (>70%/>55% gauge) were skipped;
gauge stays high with regular bursts → permanent passives (noted optimism during dips).

### jill — FIXED
Bossing A. Acid Ammo 192%/s sustained dot re-applies every reload = permanent; parser's
one-shot 30s dot died at t=30 → whole-fight duration.

### quency-escape-queen — FIXED
Bossing A. Explore-Route-gated permanents (distributed 49.58 / core 25.25 / crit 16.73)
were skipped → passives at steady state. Burst 1736% distributed nuke parses.

### exia-treasure — DATA GAP
Bossing A. Like miranda-treasure: her treasure kit is not in the synergy API (only 8 宝
entries) and the DB row is base-kit only.

### blanc — RETRY (Wayback snapshot fetch keeps failing)

### blanc — AUDITED, no change
Prydwen page 404s (slug moved; rating unknown, likely ≤A). Parse verified: the 40.76s
fullBurstEnd CDR is SELF-only (bunny-pair gimmick — she re-bursts every rotation) and benign;
burst 39.26% taken debuff parses. Nothing to fix.

## FIRST LEG COMPLETE (2026-07-12)
Every SSS/SS/S unit and all reachable A units audited. Outstanding: miranda-treasure +
exia-treasure (kit data unavailable in synergy API/DB — need blablalink or manual entry),
mari (blocked on Q10 pierce support). 52 overrides all valid; 7-fight regression unchanged;
site rebuilt.

### miranda-treasure (our `miranda`) — DATA GAP CLOSED (2026-07-13)
User provided the treasure kit screenshot. Full-slot override: S1 self ATK 50.06 per 30 hits,
S2 FB crit package incl. the famous 85.42% crit-snapshot to the top-ATK carry (1 round ≈ 1.5s),
burst ATK 40.4 + CD 56.23 to top-2 allies. Base weapon row already matched (SMG 120, CD 20s).

### exia-treasure (our `exia`) — DATA GAP CLOSED (2026-07-13)
User provided the treasure kit screenshot. Full-slot override: Hacking Code ATK stacks (28x5),
last-bullet Electric-ally casterAtk stacks, burst 2x122.32% + 18.04% taken debuff. Standard SR
→ universal bolt recovery applies.


## Mechanics-calibration leg (2026-07-13, post-handoff)
Implemented from the user's answers: Q1 proc exemptions CALIBRATED (liberalio 1.00/1.10,
privaty 0.97 — noRange+noFb on their procs, flagged for review); Q5 mast stun re-gated to her
own casts (1.12/1.06); Q6 teamAmmo trigger + LM per-hit barrage with exemptions (1.03-1.07);
Q8 universal SR bolt recovery (swap-exempt; helm/velvet charFixes retired, SWHA/liberalio
noBoltRecovery). Miranda:T + Exia:T modeled from user screenshots (data gaps closed).
Q2 crown-under-privaty RESOLVED by the spool-skip (0.71→1.00); windup duration calibration
pending user's in-game measurement (mgWindupSec knob + scripts/mg-windup-ab.ts ready).
Q4 maiden unresolved (per-shot 1.92 vs burst-gated 0.60 — proc semantics question logged).
CCW 1.33 blocked on Q2 windup. Current board: 30/35 readings within 0.94-1.16.

### neon-vision-eye — FIXED (2026-07-13; queue-marking oversight corrected)
Bossing SS. Was pre-checked as "validated 0.87, parked" and never got the Prydwen pass — user
caught it. Super Firepower now exact: gauge starts full, Super on her casts 1/4/7 (new
everyN+everyNOffset gate); each 10s window grants all THREE riders (+262.79%/shot extra,
ATK +35.05, AD +45.03 — the latter two were entirely unmodeled; the first was a hitCount:12
smear). 0.87 → 1.02. Also reinforces the proc-class pattern: her on-hit "additional damage"
keeps full majors (helm/anis class), unlike the Q1-exempt sequential/last-bullet class.


## Rider-rules leg (2026-07-13, second pass)
User rulings implemented: (1) riders NEVER get the +30% range bonus — engine-wide for all
flatDamage/dot/storedHit/extraHit/stackedNuke damage; (2) projExpl DOES buff regular RL
normals (Damage Up bucket) — default ON, masking hypothesis confirmed (anis/RRH stable);
(3) MG estimates stand (no misses — core-or-body confirmed). Fallout fixed: SBS proc set →
noFb class (1.30→1.14), mihara DoT stack average refit 10.8→12 (0.91→0.93), CCW 1.32→1.18.
Maiden worsened to 1.60 (U2 sharpened). Board: 0.89-1.18 everywhere except maiden.
Probe plan for all unvalidated overrides: docs/probe-runs.md (runs A-I).

## Roster prune + rules addendum (2026-07-13)
- burstFirst effect: Prika (duet) always takes the FIRST B2, Mint every one after — slot-order
  independent (user rule; engine burst-priority override, same family as Maiden's mpPriority).
- Red Hood Red Wolf window: infinite ammo (no reloads) + ammo restored at window end.
- Roster prune: Prydwen Bossing C/D/E/F units dropped from data/characters.json and from all
  future syncs (data/bossing-tiers.json consumed by sync.ts; scripts/fetch-bossing-tiers.py
  refreshes it, scripts/apply-tier-prune.py applies). Unknown ratings kept.

## Straggler pass (2026-07-13) — bossing-A units the story-tier queue missed
(Found via the DB's prydwen_tiers after the roster prune; the original queue used Story tiers
as ordering proxy and missed low-story/high-bossing units.)

### helm-aquamarine — AUDITED, no change (clean parse: escalating CDR, bossElement gates)
### volume — AUDITED, no change (clean parse: escalating CDR + crit packages)
### arcana — AUDITED, no change (parses; unsupported S2-cooldown line is moot in the
event-triggered model; large casterAtk self-chains kept as parsed)
### isabel — AUDITED, no change (Marked-Target burst chain parses cumulatively incl. the
negative fullBurstExtend -5s quirk; phase repeats warned)
### eve — FIXED (override): Exospine system rebuilt — Unstable Energy 720% per ~59 hits
(44 crits at 75% crit rate), sequential-flavored (noFb ⚑); Mk2 = sequentialDamagePct +100 +
casterAtk +50 for 10s; Electric-gated taken debuff via bossElement. Review reconciliation
pending (wayback rate-limited).
### guillotine-winter-slayer — FIXED (override): Hero Level 11 steady-state auras (Water-ally
elemAdv 12.76 + casterAtk 10.01), burst dot 229.57%/s x10s (20.87 x level); EXP ATK stacks
stay parser-side (1.81 x100).
### soda-twinkling-bunny — FIXED (override): Golden Chip economy time-averaged — +3s FB
extension per rotation ⚑, ~100% per FB normal cast proc ⚑, 628.7% burst nuke, first-burst-only
ATK 65.25 (everyN 99 offset 1). Chip-count dynamics flagged as approximation.

## B-tier triage (2026-07-13) — parse-quality sweep, fixes only where damage-relevant
### batch 1: dolla ✓clean · alice-WB ✓serviceable (tiny stack pieces warned) · crust
✓serviceable (Maillard cycle partial, buff-bot) · delta-NT ✓serviceable (formation defensive
bits skipped) · a2 — bounded gap (Mode B berserk ramp parsed as flat base values, warned) ·
**chime FIXED** ("the king" single-ally buffs were hitting ALL allies, 5x over → alliesTopAtk 1)
· **2b FIXED** (per-300-hits 167.45% AoE proc was skipped → hitCount 300)
### batch 2: dolla ✓clean (escalating) · julia ✓serviceable (crescendo 2nd nuke skipped,
warned) · mana ✓serviceable (Metal system partial, big pieces in) · leona ✓bounded (pellet
mechanics unmodeled) · label ✓bounded (defensive/revive kit) · guilty ✓bounded (ATK-duplicate
stacks unmodeled) · **dorothy FIXED** (S2 216% distributed = 20s-cooldown cycle, was one-shot
at t0; burst compresses to 2s for 10s) · **laplace FIXED** (burst beam swap had damagePct 0 —
rebuilt: 1455.72% first hit + 22.2%/pull true-damage beam + 11.9% rider)
### batch 3+4: marciana/rapunzel ✓clean-by-vacancy (pure heal kits) · noise/mica-SB/rem/
sakura/viper/yulha ✓serviceable (defensive gaps are v1-by-design) · **phantom FIXED** (Calling
Card AD 75.17 → passive, always-marked vs single boss) · **privaty-UM FIXED** (per-30-pellet
202.84% proc → hitCount 30) · **sakura-BiS FIXED** (S2 sustained field was one-shot at t0 →
permanent 192%/s uptime-avg ⚑) · **vesti-TU FIXED** (burst 492.3% true nuke skipped — stacked
"Burst Skill true" prefixes defeat the parser regex — restated)

B-TIER SWEEP COMPLETE: all 26 examined; 8 fixed (chime, 2b, dorothy, laplace, phantom,
privaty-UM, sakura-BiS, vesti-TU), rest clean/serviceable/bounded. Every surviving roster
unit (101) has now had at least a parse-level examination; everything Bossing A+ has had the
full Prydwen treatment.

## Straggler review reconciliation (slow-fetch landed, 2026-07-13)
- eve: hitCount-59 cadence confirmed exactly (AR 12RPS, 4.9s/proc); ADDED the missed
  3-per-10th-hit ammo refund; Mk2 doubling via sequentialDamagePct noted ~20% conservative ⚑.
- soda-TB: chip economy confirmed; ADDED her padded reload (+49 frames, review-measured) via
  new charFixes.reloadFrames (182).
- guillotine-WS: AR confirmed; ADDED max-level reload loop (10.26% per ~30 core hits —
  review: "potentially infinite shooting").
- arcana: UPGRADED from no-change to FIXED — her 180%/180% buffs are Wheel-of-Fortune-gated
  (every 2nd FB-end, Electric B3 targets); parser fired them ungated to everyone every FB end.
  Modeled with everyN 2 offset 1.
- isabel/volume/aqua-marine-helm snapshots were profile-only stubs; parse-level audit stands.

## Range-band model (2026-07-13, user-measured)
Test boss movement script + per-band weapon range eligibility + RL-never rule + 1s unhittable
transition windows (with <=1s-reload snap-refills) implemented as ground truth. Board re-centered
(mean ~0.99). Recalibrated: SR bolt recovery 30f→20f, nayuta swap 2.13s. Remaining outliers:
maiden 1.47 (U2), CCW 1.18 (U3), crown-T2 1.14, velvet 1.13 ⚑, T4 comp-wide ~0.90 floor.
All probe-run predictions shifted — maiden solo now 96.1M.
