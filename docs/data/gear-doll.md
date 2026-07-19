Favorite Item (doll) stat table — owner-measured 2026-07-18
Flat HP / ATK / DEF by rarity + level. Measured at checkpoints 0/5/10/15 only;
the engine (src/stats.ts) piecewise-linear interpolates the intermediate levels.
The survivability lines (DEF up, Damage Taken down, Cover Max HP up) are recorded
here for completeness but are NOT modeled — this is an offense-only boss sim.

Rarity  Level  HP       ATK    DEF    DEF up   Damage Taken down   Cover Max HP up
R       0      19400    638    128    0%       0%                  0%
R       5      48700    1577   328    0%       0%                  0%
R       10     91350    2943   620    0%       0%                  0%
R       15     147250   4736   1002   0%       0%                  0%
SR      0      94000    3029   638    30%      10%                 12%
SR      5      149950   4821   1020   32%      12%                 18%
SR      10     219200   7041   1494   35%      14%                 24%
SR      15     301800   9688   2058   37%      17%                 30%
SSR     0-2    301800   9688   2058   37%      17%                 30%   (== SR 15)

SSR's live levels are 0/1/2 and all read == SR 15 (owner-stated); the sim models
SSR as constant SR-15 stats. The legacy `doll: true` config path (== a maxed doll)
uses the SR-15 / SSR values 301800 HP / 9688 ATK directly.

Doll weapon "collection effect" — value at level 0 → level 15, per rarity.
R/SR scale their single weapon buff with level (interpolated); SSR uses the fixed
max-level value below. The engine keeps the SSR (== `doll: true`) constants as-is
(AR 17.0, SG/SMG 9.46, RL/SR 9.47, MG/SR 9.5) so the validation basis is unchanged.

Weapon  Buff                       R doll (L0 ~ L15)   SR doll (L0 ~ L15)
SG      Increase weapon modifier   1.57% ~ 6.3%        4.74% ~ 9.47%
RL      Increase weapon modifier   1.58% ~ 6.31%       4.73% ~ 9.46%
SR      Increase weapon modifier   1.58% ~ 6.31%       4.73% ~ 9.46%
SMG     Increase weapon modifier   1.57% ~ 6.3%        4.74% ~ 9.47%
AR      Increase core damage       5.67% ~ 12.49%      10.22% ~ 17.04%
MG      Increase Max Ammo          1.56% ~ 6.32%       4.74% ~ 9.5%

NOTE (owner follow-up): the SR-class doll below carries an extra "+9.5% max ammo"
line that the measured weapon table above does NOT list for the SR weapon. It is
preserved in the SSR/`doll: true` bonus only, pending confirmation.

Doll stats by weapon type (SSR / maxed — the `doll: true` collection effect)
AR
hp 301800
atk 9688
def 2058
+17.0% core damage multiplier
+37% def

SMG
hp 301800
atk 9688
def 2058
+9.46% normal attack damage multiplier
+37% def

RL
hp 301800
atk 9688
def 2058
+9.47% charge damage multiplier
+37% def

SR
hp 301800
atk 9688
def 2058
+9.5% max ammo
+37% def
+9.47% charge damage multiplier
+37% def

SG
hp 301800
atk 9688
def 2058
+9.46% normal attack damage multiplier
+37% def

MG
hp 301800
atk 9688
def 2058
+9.5% max ammo
+37% def

Equipment stats by class and OL gear level
Stats are broken down into each piece from when i recorded them, to get the real atk, add the 3 numbers together
DEF 0
atk 4010 2551 729
hp 60111 195360 45084
def 800 1199

DEF 5
atk 6015 3827 1093
hp 90167 293040 67626
def 1200 1799

ATK 0
atk 6014 3827 1093
hp 49181 159840 36887
def 654 981

ATK 5
atk 9021 5741 1639
hp 73771 239760 55331
def 981 1471

SUP 0
atk 5012 3189 911
hp 54646 177600 40985
def 727 1090

SUP 5
atk 7518 4783 1367
hp 81969 266400 61477
def 1091 1635

Base 5 — the SCOPE-LOCK gear set (base manufacture gear, not overloaded). This is the real
validation basis (owner-measured 2026-07-14); its ATK is ~1.76% below OL0. src/stats.ts models
it as the 'base5' gear level. To get the real ATK, add the 3 atk numbers together.
ATK
atk 4849 3087 882
hp 39663 29748 128905
def 528 791

DEF
atk 3234 2057 588
hp 48477 157548 36358
def 645 967

SUP
atk 4041 2573 735
hp 44070 33053 143227
def 587 879
