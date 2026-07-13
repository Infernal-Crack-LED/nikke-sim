# Prydwen tier audit — autonomous pass (started 2026-07-12)

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
- [ ] siren (= little-mermaid) — mild 1.02-1.15, re-audit vs review
- [x] crown — VALIDATED (0.92-1.14; 0.71 only under privaty ammo cut, open Q2)
- [ ] ada-wong
- [x] rapi-red-hood — VALIDATED (0.96-1.12 post ordering fix)
- [ ] vesti-tactical-upgrade

### SS
- [ ] red-hood
- [x] mast-romantic-maid — validated 0.84-0.86 (mild cold, open Q5)
- [ ] mint
- [ ] nayuta — 1.13 in T5, audit vs review
- [ ] prika
- [ ] takina-inoue
- [ ] alice
- [ ] ein
- [x] helm-treasure (our `helm`) — FIXED this session (charge cycle 90f → 0.92-1.01)
- [x] liberalio — FIXED (202.5%; 1.16 residual, open Q1)
- [ ] milk-blooming-bunny
- [x] neon-vision-eye — 0.84-0.87 (mild cold, open Q5)
- [x] privaty-treasure (our `privaty`) — 1.29→ open Q1 (×0.59 proc factor)
- [x] scarlet-black-shadow — 1.13 (mild, open Q5)
- [x] snow-white-heavy-arms — FIXED (sequential AD dilution → 1.07/1.15)

### S
- [ ] d-killer-wife
- [ ] emma-tactical-upgrade
- [ ] liter
- [ ] rouge
- [ ] ade-agent-bunny
- [ ] anchor-innocent-maid
- [ ] brid-silent-track
- [ ] eunhwa-tactical-upgrade
- [ ] grave
- [ ] naga
- [ ] ark-ranger-black
- [ ] asuka-shikinami-langley
- [x] cinderella — FIXED this session (burst ordering → 1.09-1.16)
- [ ] dorothy-serendipity
- [ ] modernia
- [ ] scarlet
- [ ] sparkling-summer-anis

### A
- [ ] exia-treasure
- [ ] label
- [ ] miranda-treasure
- [ ] soline-frost-ticket
- [ ] tia
- [ ] zwei-treasure
- [ ] blanc
- [ ] crust
- [ ] mari-makinami-illustrious
- [ ] rosanna-chic-ocean
- [ ] trina
- [x] velvet — FIXED this session (fbGate + charge cycle → 1.05)
- [ ] asuka-shikinami-langley-wille
- [ ] bready
- [ ] chisato-nishikigi
- [ ] diesel-winter-sweets
- [ ] e-h
- [ ] jill-valentine
- [ ] laplace-treasure
- [ ] ludmilla-winter-owner
- [x] maiden-ice-rose — MP model validated; no-burst 0.60 cold (open Q4)
- [ ] maxwell
- [ ] noir
- [ ] phantom
- [ ] quency-escape-queen
- [ ] rei-ayanami
- [ ] snow-white

## Per-unit findings
(appended below as processed)

### moran-treasure (our `moran`) — FIXED (2026-07-12)
Bossing SSS. Parser skipped Fervor ("when Raptures appear: Burst CD ▼20s continuously" —
always active in raids) → she burst at 40s instead of 20s, halving her burst/CDR cadence.
Override: burstCdr 20 on own burstCast (effective 20s CD, bursts every rotation) + S1 47.18%
proc gated fbGate:inFb ("while weapon is changed" = her burst swap window). S2 team CDR 7.48s
kept from parser (Fervor requirement always met). Review confirms team ATK 42.57% casterAtkPct
+ swap/unlimited-ammo burst, both already parsed. No real-sample validation available yet.
