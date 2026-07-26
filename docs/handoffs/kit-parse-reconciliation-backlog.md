# Kit-parse owner-reconciliation backlog — OPEN TAIL

> AI-facing (CURRENT-STATE class — pruned when items land). The open remainder of the kit-parse
> rollout (COMPLETE 74/74; DECISIONS 2026-07-16). **Most of the original 1–6 owner list + the
> cross-cutting engine gaps have since LANDED** — the authoritative status of every engine-primitive
> thread is the dashboard in [`docs/engine-modeling-gaps.md`](../engine-modeling-gaps.md) (section A
> = done, B = wired-not-enacted, C = unwired). This doc now carries only the genuinely-open per-unit
> tail. Per-unit finding + tier SSOT: `data/kit-status.json`.

## Landed (do not re-open — see DECISIONS + engine-modeling-gaps for detail)

Treasure SSOT (helm/laplace/moran/miranda/drake), `excludeSelf` on typed allies (maiden-ice-rose),
own-burst-gated FB (`ownBurstGate`, cinderella-crystal-wave), naga shield-gate (default-off),
weapon-swap datamine spec (nayuta), `bossElementGate`, timed pierce (grave), `hitRatePct`→core
(`HRCORE` live), d-killer-wife parts-branch HOT bug, per-tick recovery emitter (capability). All
DECISIONS 2026-07-16/17/20. tove SG-team lines ENACTED (DECISIONS 2026-07-21).

## Open tail (measurement / owner-gated)

- **coreband-scarlet-ar mistag** — verify/fix the core-band tag on `scarlet` (AR/Electric).
- **swap-window throughput** — moran (footage-blocked: coldness is THROUGHPUT ~1.3×, not per-shot;
  needs isolated moran-solo or the swap weapon's `shot_count`), ada.
- **modes owner-review** — `cinderella-crystal-wave` (MG*/Snipe, pierce only in Snipe) and the
  `mint`↔`prika` duet pair (`solo`*/`duet` — mutually referencing, flip both together) still branch-default.
- **recovery-emitter HoT backfill** — prika (25-tick), trina (5-tick), mint (3-tick, no heal block yet)
  carry their HoT heals as UNMODELED; convert when each unit is touched.
- **timed-pierce deferred** — milk-blooming-bunny (0.70 COLD, mode confound), prika (measurement-held).
- **flat Max-Ammo faithful conversion** — noir (+5 team, modeled self-only %), grave (+3), tove (+2),
  drake, trina (+20) approximate the flat grant as a percent; the faithful `maxAmmoFlat` form is
  board-moving → per-unit measurement/owner-gated (engine-modeling-gaps theme 14).
- **ammo-dump trigger authoring** — grave (Prediction/burst-end forced reload, her comp-COLD cause),
  asuka-wille, jill need per-unit `consumeAmmo` triggers + board verification (theme 15).
- **diesel-winter-sweets Highlight** — the burst-order-coupled Highlight state (owner-deferred,
  doc-only); also tracked in CLAUDE.md web-TODO. Kit values in `src/skills/overrides/diesel-winter-sweets.json`.
- **arcana-fortune-mate magnitude** — faithful after the `alliesOfWeapon` retarget + pellet-count fix,
  but the residual HOT is buff MAGNITUDE (pellet/snapshot double-count) → needs a hand-tune vs a recording.
