# Full-auto behavior — corrections the frame model needs

Detail doc for [game-mechanics.md](game-mechanics.md) §7. All scope-lock validation runs
are FULL AUTO; these are the measured/documented gaps between ideal frame-model play and
what the auto AI actually does. Each ⚑ is calibrated against our validated fights.

## 1. Core-hit floor — AUTO_CORE_RATE = 0.85 ⚑

Auto-aim's reticle never fully converges: JP tester _TricK_ measured SG reticle diameter
manual = −1.40x+140px vs auto = −1.45x+170px (x = accuracy stat) — at 100 accuracy manual
converges to ~1px but auto floors at ~12.5px radius, an ~18–20% effective accuracy loss
[https://note.com/_trick_/n/n6efe08af53e8]. Consequence: even at "100% core exposure" a
fraction of auto shots land off-core. Engine: `AUTO_CORE_RATE = 0.85` multiplies the
configured core-hit rate inside the Major bucket ⚑ (calibrated 2026-07-13; centered every
validated-fight anchor: anis 0.97–1.06 across seven comps, crown/rapi/LM/liberalio/moran/
ada/ein/diesel ~1.0).

## 2a. Release latency on release-fired charge weapons (MEASURED)

"Old-style" charge weapons fire on trigger RELEASE (vs the newer AUTOFIRING guns —
liberalio, anis: star, nayuta-in-burst — which fire at baked cadence while held; user
taxonomy). On auto, release-fired weapons carry a ~21-22 frame release latency after full
charge, measured independently twice: Helm SR 22f (the engine's "bolt recovery" constant)
and Maiden:IR RL 21f average (charge meter showing 156-212% at release,
charFixes.chargeFrames 81). Same number, one mechanism. Validated RL carries read correct
at bare cadence (autofire-style); classify further RLs via their on-screen charge meters
(steady ~100% releases = autofire; 150%+ = release-fired). See
[charge-weapons.md](charge-weapons.md) §2.

## 2. Early charge releases are RARE (~2% of shots)

Auto always waits for full charge [einkk `NikkeFullChargeMode.always`]; the user observes
only ~3 early releases per 180s fight (boss movement/unhittable interruptions) — negligible
for damage and for full-charge-gated proc counters (SBS, rouge CDR, neon-VE all count
full-charge hits ≈ every shot on auto). Maiden: Ice Rose's former ×0.68 proc factor
is RESOLVED: full rider value confirmed by popup reads; the deficit was her overcharge-hold
cadence (§2a). No calibrated factor remains in her model.

## 3. Burst-chain delays

Measured auto cast timing: gauge-full → B1 ≈ 0.433s; B1→B2 and B2→B3 ≈ 0.533s each; skill
EFFECT applies ~0.1s after cast [https://nikke-synergy.com/arena-guide_en]. ≈1.6s per
rotation vs instant manual casting. Engine approximates with 0.5s per stage cast
(`STAGE_CAST_GAP_FRAMES = 30`); the remaining difference is inside AUTO_GEN_EFFICIENCY
([burst-gauge.md](burst-gauge.md) §5).

## 4. SG pellet falloff out of near — 0.3 ⚑

Outside the near band only ~30% of a shotgun's 10 pellets land on the moving test boss
(`SG_OUT_OF_NEAR_HIT_FRACTION = 0.3` ⚑, calibrated on the naga / dorothy-S / noir triple,
all ~×2 hot at full volleys before it). Applies to damage AND gauge generation (missed
pellets generate nothing). Consistent with the reticle-floor mechanism in §1 but
calibrated independently.

## 5. Burst selection on auto

Leftmost-first among ready, stage-eligible units
[https://m.inven.co.kr/webzine/wznews.php?site=nikke&p=2&idx=303197 ;
https://nikke.gg/mastering-burst-chains-the-core-combat-mechanic-every-nikke-player-needs-to-understand/].
Slot order is therefore load-bearing — always record the fielded order (the 2026-07-13
screenshot audit found three T-fights with wrong assumed orders). Λ units are eligible at
ANY open stage (positioning them left of the B1 ruins rotations — Inven warns explicitly);
under our formation rules they count as NO burst type for formation checks (user ruling).

## 6. Known auto quirks (documented, not modeled)

- Auto keeps firing/bursting through boss invulnerability phases (wasted casts)
  [https://bittopup.com/article/NIKKE-Solo-Raid-Golden-Frame-Guide-Top-3-Teams-2025].
  The test boss's 1s unhittable windows ARE modeled (engine `UNHITTABLE_FRAMES`).
- Auto does not target interrupt/QTE parts [https://dengekionline.com/articles/171104/].
- Render load can throttle the focused unit's fire rate (Modernia fired ~50 more rounds
  when off-camera in a KR frame test)
  [https://gall.dcinside.com/mgallery/board/view/?id=gov&no=1616440].
- Milk: Blooming Bunny is a known severe auto under-performer (accepted cold at ~0.57 per
  user ruling rather than modeled).
- FPS: fire rate is frame-computed — MG/SMG/AR lose 40–50% DPS at 30fps; the
  "Min Firing Rounds Adjustment" setting (2025-04 update) decouples MG round counts from
  device FPS [https://note.com/tt00771/n/nce4d6818b73c ,
  https://lootandwaifus.com/guides/best-settings-nikke-goddess-of-victory/ ,
  https://trees.gamemeca.com/view.php?gid=1760784]. All our measurements assume 60fps +
  setting ON.
