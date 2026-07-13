# Open mechanics questions (for user research)

Running record of unresolved game-mechanics questions that block sim accuracy.
Add entries as they come up; strike through when answered (record the answer inline).

## Q1 — the ×0.59 proc factor (2026-07-12)
Privaty:T's S2 procs (last-bullet 256.17% + Designated 1687%) scaled by ×0.59 land her at
1091M vs 1104M real (T4); Liberalio's S1 procs (202.5%/core-hit) scaled by the same ×0.59 land
1141M vs 1142M real (T1). SWHA's dwarves needed the same factor until the real mechanism was
found (sequential-AD dilution). BUT helm's 178.98% and anis-star's 120.13% full-charge procs
validate at FULL value — so it is not a universal "additional damage" rule.
0.59 ≈ 1/1.7 ≈ losing the +50% FB + +30% range major bucket.
**Question: do proc hits like Privaty's last-bullet and Liberalio's core-hit additional damage
receive the +50% full-burst damage bonus and the +30% full-range bonus? What distinguishes them
from helm/anis procs (which clearly get full value)?**
UPDATE (tier audit): Prydwen documents Ein's Near Feathers as "affected by Full Burst
Multiplier (0.5×) but NOT Damage Distance (0.3×)" — so range-exemption is a real per-skill
property. Losing only range = ÷1.2, not the needed ÷1.7, so the ×0.59 units would need to lose
FB too. Prydwen may document this per unit — check privaty/liberalio reviews for wording.

## Q2 — MG spool vs Privaty ammo cut (crown-T4 0.71)
Max Ammo ▼ clips the current belt (confirmed) and MG wind-up resets on reload (confirmed) —
i.e. real mechanics are as-simmed or harsher, yet real Crown does BEST in the Privaty comp
(373-375M vs 215-290M elsewhere, reproduced twice). Full spool persistence overshoots (1.36).
**Question: does the MG wind-up ramp take ~3.75s (our cubic, calibrated to "8s to empty 300")
or is it much faster in practice? Anything else Privaty grants MGs that would offset the cut?**

## Q3 — CCW review (unit too new for Wayback)
CCW reads 1.33 hot (T5, MG mode). Need her Prydwen review pasted to re-derive:
whether the 833.79% core-strike rider receives the core bucket (we model core:true),
her 900%/5s dot, the 6000% burst nuke interactions, and MG-mode cadence.

## Q4 — Maiden: Ice Rose without burst reads 0.60 cold
With her burst never cast (real T2), sim gives 151M vs 251M real. Her non-burst kit
(normals + MP auras) is undercounted ~40%. Candidates: RL cadence, the "MP replenished"
ally aura value, unmodeled passive damage.

## Q5 — mild systematic edges (park until majors are done)
Mast:RM 0.84-0.86 (both fights, never-bursting B2) · Neon:VE 0.87 · SBS 1.13 ·
Little Mermaid 1.15/1.02 · Nayuta 1.13.

## Q6 — "total ammo expended by allies" triggers + sequential value reading (Little Mermaid)
LM's 37%-gauge-per-400-ammo and Bubble-Barrage-per-500-ammo count TEAM ammo (MG comps hit the
threshold every ~3s). Engine models them as her own hits (5-8x undercount). But per-hit ×10
barrage at true cadence would overshoot her badly (→~1.36) — unless "Deals 85% ... attacks
sequentially for 10 time(s)" is a SPLIT TOTAL vs single target for HER (while Cinderella's
burst sequential is confirmed per-hit ×10). **Question: vs one boss, does LM's Bubble Barrage
deal 85%×10 or 85% total? Same for her 63.36%×4/s full-burst attack?**

## Q7 — RESOLVED: Nayuta lands 1.03 (T5)
Per-Prydwen model (530.46%/shot stage rider = 150 full-screen + 380.46 stage stacking,
ramp-averaged stack gates) + the SR bolt-recovery cycle (1.8s charge → 2.3s) = ratio 1.03.
Third independent confirmation of the +0.5s SR recovery (helm, velvet, nayuta swap).

## Q8 — which SRs carry the +0.5s bolt recovery?
Confirmed needed: helm, velvet (DB 60f = charge only), nayuta's 1.8s swap. NOT needed: SWHA
(kit-fixed 1.2s, validated 1.07-1.15), liberalio (DB 90f already ≈ 1.0s charge + recovery,
validated ~1.0). Unknown: alice (listed 1.5s charge, DB 90f), red-hood, maxwell, other SRs.
**Question: is the recovery universal (and some DB chargeFrames already bake it in), or
kit-dependent? A controlled alice/red-hood run would settle their cycle.**

## Q9 — Prydwen contradicts our projectile-bucket rule
Prydwen (Emma:TU review): Projectile Explosion DMG "affects Explosive types of damage, such as
RRH's Attachment AND REGULAR RL ATTACKS ... functions as ATK DMG but only affects the base
multiplier itself". Our validated rule (user-provided, RRH share-matched): projectile bucket is
its own multiplier on FLAVORED hits only, RL normals never benefit. Keeping our rule; flag for
adjudication — if regular RL normals do get projExpl on the base multiplier, Anis:Star/SBS/RL
units gain a small bucket from projExpl team buffs (Mint duet, Emma:TU, Anis:Star's own aura).

## Q10 — pierceDamagePct is inert but shouldn't be for pierce-tagged units
DKW review: Pierce Damage "empowers any attacks tagged with Pierce (regardless of whether
there is any surface to pierce)" — i.e. a dmgUp-bucket buff for units WITH pierce (red-hood
permanent, alice >80% HP, grave, SWHA during full charge). Engine treats it as inert, which
under-models zwei-T / d-killer-wife / mint-duet support value for pierce carries.
Needs: per-unit hasPierce tracking + pierceDamagePct in the dmgUp bucket for their hits.
