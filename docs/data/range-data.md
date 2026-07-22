recorded the range of the target boss that we use for testing as well as effective ranges according to community sites. interestingly, RL NEVER gets the effective range bonus so we need to account for that, which I believe we did partially already.
starts mid
near ~2:27
far ~1:50
mid far ~1:14
near ~0:36
mid far ~0:04

at each breakpoint, boss becomes unhittable for 1s
during that 1s, nikkes attempt to reload - if their reload time is 1s or under, they reload, if not, their mag size stays the same

## band distances, bounded by the in-game effective-range readout (owner, 2026-07-22)

The effective-range bonus is visible in game, so which weapons receive it at each band bounds that
band's distance directly — no damage back-calculation needed. Taking the weapon windows above and
requiring that the weapons which DON'T get the bonus also fail their windows:

| band | weapons with the bonus | distance window |
|---|---|---|
| near | Shotgun + Submachine Gun | **15 – 25** |
| mid | Submachine Gun + Assault Rifle | **25 – 35** |
| mid far | Assault Rifle + Machine Gun | **35 – 45** |
| far | Machine Gun + Sniper Rifle | **45 – 55** |

Every window is 10 wide and they tile without gaps, so **consecutive bands sit about 10 apart**
regardless of where inside its window each one actually falls. Anchoring on the near band's measured
core size gives 20.7 / 30.7 / 40.7 / 50.7 — and all four land inside the windows above, which were
derived from a completely independent observable. Two separate lines of evidence agreeing.

**This refutes the older pixel-to-distance calibration** (`CORE_PX_K 2100`, `CORE_PX_C 47` in
`src/engine/sg-geometry.ts`, fit to fuzzy range midpoints). Inverted against the measured core sizes it
puts mid far at **53** where the readout allows at most 45, and far at **76.5** where the readout allows
at most 55. Near and mid are fine; the two long bands are out of bounds.

**What that implies about the hand-outlined sizes.** With the bands placed as above, the traced core is
12% small at mid far and 21% small at far, while the traced body is 8–16% too big at mid / mid far /
far. Small-and-smoke-obscured is exactly where hand-tracing over-runs a fuzzy body edge and under-runs
a small bright core, and it accounts for the body-to-core ratio drifting 4.67 → 6.50 across the bands
when a rigid object must hold it constant.

## the test boss has NO PARTS (owner, 2026-07-22)

The scope-lock test boss is partless, and **where on the boss a shot lands does not change the damage
value** — the only distinction that changes a hit's value is **core vs non-core**. There are no armoured
areas, no reduced-damage plates, and no per-region damage tiers.

How to apply when reading footage: a popup value that differs from the surrounding ones is NOT explained
by "it hit a different part of the boss". Look to buff state, crit, core, or a different damage source
(a skill/burst payload) instead — and if none of those account for it, record the value tier as
unexplained rather than attributing it to hit location.

Weapon
Effective range
SG — Shotgun 0–25
SMG 15–35
AR — Assault Rifle 25–45
MG — Machine Gun 35–55
SR — Sniper Rifle 45–100
RL — Rocket Launcher None (no range restriction; cannot receive the bonus)

these are my best guesses for how that relates to effective range bonus for our test boss
near - only SG
mid - smg, ar
mid far - mg, sr
far - sr
