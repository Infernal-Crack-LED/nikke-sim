# Legacy hand-tune overrides (historical record)

These are hand-tuned override JSONs for units **removed from the sim/site on 2026-07-15** (owner ruling,
"Option 3"). They are **not loaded** by the engine — the active loader only reads `src/skills/overrides/`,
and the sync prune (`src/data/sync.ts`) keeps a unit only if it is enikk-proven **or** has an override in
that active directory. Moving these here therefore drops the units from `data/characters.json` on the next
sync (they were already removed directly), which removes them from the web roster.

## Why removed
All 11 were kept only by the override KEEP rule (not enikk-proven, i.e. not in the top-100 meta). The owner
chose to stop serving/supporting them. Their tuning WORK is preserved here so it can be revived if a unit
re-enters the meta — restore the file to `src/skills/overrides/`, re-add the unit to `characters.json`
(or re-run sync once enikk-proven), and re-add any validation comp.

## Cost paid (recorded, so it isn't rediscovered later)
Removing these deleted **5 graded comps** from `scripts/experiment.ts` + `scripts/regression.ts`
(PC shields, PD Eva duo, N4 neon/nayuta, N8 emma/eunhwa, N10 milk/phantom) = **24 of 146 comp-rows (~16%
of the validation board)**. Meta units that lost their recording *in these comps* — nayuta, neon-vision-eye,
laplace, eve, arcana, diesel-winter-sweets, guillotine-winter-slayer, snow-white-heavy-arms, helm, anis-star,
naga, little-mermaid, milk, snow-white — mostly survive via other comps; **snow-white** also has control-group
recordings (owner). laplace / eve / arcana may lose their only main-board anchor (check control recordings).

## The 11 units
tia, phantom, 2b, dorothy (base AR), emma-tactical-upgrade, exia, privaty-unkind-maid,
vesti-tactical-upgrade, eunhwa-tactical-upgrade, chime, ark-ranger-black.

(Note: `dorothy-serendipity`, the SG attacker, is a DIFFERENT unit and is NOT removed.)
