# Hand-tuned kits — authoritative record

This is the record of which unit kits have been **tuned against real fights**, versus units that
are still pure model (a datamine/parser translation never checked against reality). It exists so
"is this unit trustworthy?" stops being a judgement call every time.

- **Machine-readable source of truth**: [`data/hand-tuned.json`](../data/hand-tuned.json)
  (`slug → tier, tuned, control, evidence, date, residual`). Tooling reads it — e.g. the hand-tune
  recording batch (`scripts/battery/hand-tune-714noon.ts`) draws its control-group support units
  only from `tuned: true` entries.
- The per-kit *mechanics* live in each `src/skills/overrides/<slug>.json` `note`; this doc records
  only the tuning provenance (what real fight set or confirmed the numbers).

> Reconstructed best-effort on 2026-07-14 — this list was not maintained from the start. Historical
> entries were recovered from [DECISIONS.md](DECISIONS.md), [open-questions.md](open-questions.md)
> (the answered items and the U8 residual list), [probe-runs.md](probe-runs.md), and the override
> notes. Going forward, **every tuning change records a row here + updates the JSON** as part of the
> change (add it to the `/skill-maintenance` and `/probe-processing` close-out).

## Tiers

Highest to lowest trust. Only the first three count as `tuned: true`.

- **Measured** — a focus recording, frame-count, or gauge/popup read set or confirmed the values.
  The strongest evidence.
- **Calibrated** — a fitted number tuned against validated real fights (mechanism suspected, the
  value is ours). A standing refit candidate.
- **Validated** — the unit's damage total graded to roughly reality (about 1.0) in a recorded team
  fight, though it was never the camera-focused unit.
- **Model only** — parser/datamine only, never confirmed against a real fight. **Untuned.** Some of
  these have been *seen* in a fight and read notably off — those are flagged as tuning candidates.

Counts: **14 measured, 11 calibrated, 11 validated, 31 model-only** (67 overrides total; 36 tuned).

## Reference-grade (a trust layer above the tiers)

A separate flag on top of the tier: a unit is **reference-grade** when it is `tuned: true` **and** its
final damage total lands within ±3% of reality (ratio 0.97–1.03) on **at least 5 different teams**
(reruns/replicates of the same team count once; the unit need not be camera-focused — only the
end-of-fight total matters). This is the top trust layer: proven reliable across many real fights,
not merely tuned once. It's the bar a unit must clear to be a no-caveat control anchor.

Computed by [`scripts/refgrade.ts`](../scripts/refgrade.ts) from the graded comps in
`scripts/experiment.ts`, written back into `data/hand-tuned.json` (`reference: bool`, plus
`graded: {teams, within3pct}` per unit and a top-level `reference_grade` summary). Recompute it
whenever the graded comps change.

**Current state (2026-07-14): none yet.** No unit reaches 5 different-team totals inside ±3% — the
board's median accuracy is ~0.93–0.99, so most tuned units sit reliably at 0.88–0.96, *close* but
just under the bar. Closest: Crown (3 of 10 teams within ±3%), Anis: Star and Helm (2 each). The
layer fills automatically as tuning tightens or more within-±3% fights are recorded.

*(Name is provisional — "reference-grade". Rename in `refgrade.ts` + the JSON key if you prefer
gold / verified / certified / anchor.)*

## Measured (14)

| Unit | What a real fight established | When |
|---|---|---|
| Anis: Star | Solo gauge recording — standard-launcher shot row confirmed; run A grades 0.94 | 2026-07-13 |
| Cinderella | Focus session — every per-instance popup verified exact; twin-rocket split + own-Max-HP fixes; 0.96–1.00 | 2026-07-13 |
| Crown | Solo recording read her machine-gun range-bands per popup class; 0.89–1.14 across ~10 comps. *DPS-chart control.* | 2026-07-14 |
| Helm | Sniper frame recording — 1.37-second cycle + 22-frame bolt recovery measured; 0.93–1.19. *DPS-chart control.* | 2026-07-13 |
| Jill | Focus video — popups 99.7% exact; her old 1.67 heat was pure cadence (150 rounds/min) → 1.02 | 2026-07-13 |
| Liberalio | Focus recording — four in-Full-Burst proc crit-step pairs read ×1.3333 exactly; ~1.0 on graded comps | 2026-07-14 |
| Maiden: Ice Rose | Solo video — 547.62% rider popups exact, cadence measured; solo 1.01. *Burst Max-HP scaling is a deliberate conservative lower bound.* | 2026-07-13 |
| Moran | Recorded video — firepower/cooldown-refund economy verified frame-by-frame; 0.91–0.93 | 2026-07-13 |
| Neon: Vision Eye | Recorded video — gauge tracked cast-by-cast, every-third-Super model confirmed; 0.91–1.06 | 2026-07-13 |
| Privaty | Focus recording — in-window/out-window popup ratio fixed her element bucket; 0.77 → 1.00 on the Fire-boss comp | 2026-07-14 |
| Rapi: Red Hood | Three focus recordings — burst-nuke recipe fit to measured constants, an inert +421% buff removed. *Invisible-X residual (44–52% of her damage) deliberately left open.* | 2026-07-14 |
| Snow White: Heavy Arms | Team recording — seven burst windows observed end-to-end, "Fully Active" ends-on-uses measured; ~0.93–0.95 | 2026-07-14 |
| Takina | Solo sniper gauge recording + focus/unfocused gauge steps; run G 1.01 after the sniper-generation fix | 2026-07-13 |
| Alice | Focus video — pierce is one popup per shot, no double-hit; run A total 1.12 | 2026-07-13 |

## Calibrated (11)

| Unit | Fitted change + fight it was fit against | Residual | When |
|---|---|---|---|
| Scarlet: Black Shadow | 714-noon: focus popup localized her heat to the proc set; proc cadence hit-count 6 → 10 swept across two fights → 1.00 / 1.07 | — | 2026-07-14 |
| Cinderella: Crystal Wave | Core-strike proc-class rule fix | Open: elemental-advantage delivery (open-questions U3) | 2026-07-13 |
| Dorothy: Serendipity | Shotgun pellet-falloff calibrated on a Naga/Dorothy/Noir sample; run H 0.99 | — | 2026-07-13 |
| Naga | Shotgun falloff + "with shielder" mode; run C 1.06 | — | 2026-07-13 |
| Red Hood | Red Wolf decoded from game data, +90% conversion, stack ramp averaged; run A 0.86–0.92 | — | 2026-07-13 |
| Rouge | Positional + Max-HP grant rebuilt from recorded videos, coin values timeline-averaged; 1.02 | — | 2026-07-13 |
| Mihara: Bonding Chain | Stack average (10.8 → 12) fit to a real sample; 1.19–1.51 → 1.03 | — | 2026-07-13 |
| Eunhwa: Tactical Upgrade | Swap cadence 0.67s fit from run D | Still 1.32 hot — open | 2026-07-13 |
| Maxwell | Railgun single-shot fix from run G (1.93 → 0.81) | Over-corrected; 0.80 in run G but 1.17 in a later comp — unstable, audit candidate | 2026-07-13 |
| Trina | Target scope "leftmost Electric assault-rifle ally" from run-B video; 2.62 → 1.14 | — | 2026-07-13 |
| Prika | Duet burst-first order confirmed live in a recording | Total 0.82 cold — open | 2026-07-14 |

## Validated (11)

| Unit | Recorded comp + grade | Note | When |
|---|---|---|---|
| Ada | Run E 0.97–1.08; a "Burst-3 casters" scope fix came from run-E video | — | 2026-07-13 |
| D: Killer Wife | Run G 0.98–1.11; a hit-count parser-bug fix | — | 2026-07-13 |
| Diesel: Winter Sweets | Run D 1.01–1.06 | — | 2026-07-13 |
| Ein | Run E 0.89–0.98; orb gauge from datamined arena data | An older reading has her at 0.71–0.76 — an Ein-focus recording is worthwhile | 2026-07-13 |
| Emma: Tactical Upgrade | Run D 1.00–1.07 | — | 2026-07-13 |
| Little Mermaid | Graded ~1.0 on multiple comps, run H 1.03. *DPS-chart control.* | — | 2026-07-13 |
| Mast: Romantic Maid | Graded 0.95–1.06; Hangover-gate recalibration. *DPS-chart control.* | — | 2026-07-13 |
| Mint | Run A; release-latency landed 1.21 → 0.91; duet mode fix | — | 2026-07-13 |
| Nayuta | Wind-weak comp 0.86–1.03 | High run-to-run variance | 2026-07-13 |
| Velvet | Hand-verified against a real scope-lock run; 1.50 → 1.05 | — | 2026-07-13 |
| Milk: Blooming Bunny | Run G + a focus recording, 0.56–0.73 | ~0.7 is an **accepted decision** (poor auto-play), validated-by-decision, not tuned to 1.0 | 2026-07-14 |

## Model only — untuned (31)

**Seen in a fight and reads off — active tuning candidates (12):**

| Unit | Reading | Status |
|---|---|---|
| Guillotine: Winter Slayer | 1.21–1.34 | Partial: burst damage-over-time + Hero-Level auras measured accurate on a focus recording, but her normal fire runs ~26% hot and was deliberately **not** refit (suspect a datamined machine-gun parameter; needs a reference-sim recheck). Effectively untuned. |
| Vesti: Tactical Upgrade | 3.23 | Burst bucket blown out; needs a Vesti-focus recording. *Not enikk-supported.* |
| Arcana: Fortune Mate | 1.88 | Her own-damage bucket drives it; was unfocused. A focus A/B is in the current batch. |
| Chisato | 1.21–1.26 | Real modeling error, untuned. In the current batch. |
| Grave | 1.19–1.23 | Mild burst-3 heat, untuned. |
| Phantom | 1.28 | Untuned. *Not enikk-supported.* |
| Quency: Escape Queen | 0.77–0.86 | Cold; owns a timing-rule regression. In the current batch. |
| Dorothy (base) | 0.62 | Coldest reading, model short. *Not enikk-supported.* |
| Soda: Twinkling Bunny | 0.77 | Chip-economy model, untuned. In the current batch. |
| Tia | 1.09–1.25 | Cooldown structural fix from owner knowledge, but damage hot; charge-class open. |
| Modernia | 0.90 | Single read, confounded by that comp's full-burst-count anomaly. |
| Snow White (base) | 1.11 | The DPS-chart buff-neutral **filler** — used structurally, but its own calibration is thin (one confounded read). **Not** hand-tuned; excluded from control-group supports. |

**Pure model — never fielded in a recorded fight (19):** 2B, Ade: Agent Bunny (focus A/B batched), Arcana (base) (audit language only, not fight-validated), Ark: Ranger Black, Asuka: WILLE, Asuka, Chime, Drake, Elegg: Boom and Shock (serves pre-patch numbers), EVE (audit language only), Exia, Laplace, Ludmilla: Winter Owner, Miranda, Privaty: Unkind Maid, Raven, Rosanna: Chic Ocean, Sakura: Bloom in Summer, Tove.

## Controls

Six units are the DPS-chart control roster (`src/dpschart/matrix.ts`), flagged `control: true` in the
JSON: Crown, Helm, Mast: Romantic Maid, Little Mermaid, Anis: Star, and Snow White (the filler).
Five carry strong measured/validated evidence. **Snow White is the lone control that is not itself
hand-tuned** — she is trusted only as a minimal-team-buff filler, and is excluded from hand-tune
control-group support slots (drop the third burst-3 instead).
