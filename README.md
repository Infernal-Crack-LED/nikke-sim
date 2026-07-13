# nikke-sim

Solo raid (180 s) damage simulator for NIKKE — a CLI and a website running the same engine. Input 5 Nikkes in slot order, get expected damage per unit from a full burst-rotation simulation. See `DESIGN.md` for architecture, `nikke-damage-formula.md` for the formula source, `future.md` for the roadmap.

## Setup

```bash
npm install
# .env needs DATABASE_PUBLIC_URL (Bakery Bot's Postgres)
npm run sync          # DB + nikke-synergy API → data/*.json (rerun after roster updates)
npm run sync:skills   # blablalink per-skill-level values (enables skill levels < 10)
```

## Website

```bash
npm run web           # dev server
npm run web:build && npm run web:preview   # production build → http://localhost:4173
```

Static site, no backend — the sim runs client-side (deploy `dist/` anywhere). Features: 5 slot pickers with portraits, boss element + boss DEF, core visibility presets (No Core → 100% / custom), per-character OL0/OL5 gear + Doll 15 + cube (Resilience / Bastion / Other at L7/L10/L15/custom), damage + % share per unit, rotation log, modeling notes. All skills factored at 10/10/10.

## CLI

```bash
npm run sim -- liter crown naga modernia alice --element Iron --doll yes --ol 5 \
  --cubes "resilience,resilience,bastion,bastion,resilience" --boss-def 8000 --core-rate 0.5
npm run sim -- --list [filter]      # browse slugs
npm run sim -- --coverage           # parser health across the roster
```

Options: `--element`, `--boss-def`, `--doll yes,no,…` (per slot; 1 entry = all), `--ol 0,5,…` (per slot), `--level` (default 400), `--copies 0-10` (default 3), `--core-rate 0-1`, `--no-range`, `--duration`, `--rotation`.

Loadout (per-slot lists in slot order; one entry applies to all 5):
- `--cubes resilience@15,bastion@7,-,…` — harmony cube per slot (real values from `cubes.md`: flat ATK + elemental damage from L5 + effect)
- `--lines "elem*4+atk*4;;;ammo*2;"` — OL lines, `type[*count][@value]` (max rolls from `data/ol-lines.json`)
- `--skill-levels "10/4/10,…"` — per-skill levels using exact blablalink per-level tables
- `--best-ol <1-5>` — greedy best-OL search for that slot: marginal % damage per max-roll line, cap 4/type

## How it works

- 60 fps frame simulation: weapon fire cycles (AR 12/s, SMG 20/s, SG 1.5/s, MG 60 rounds/s with 3.75 s spin-up, RL/SR charge), ammo/reload/Bastion refunds, burst gauge (`rl3`/3 %/s), stage I→II→III→full-burst rotation gated by real cooldowns (CDR modeled, incl. once-per-battle Λ refunds).
- Stats reconstructed exactly from the DB (`base_stats` + synchro curve) + gear ATK by class/OL + doll + cube flat ATK.
- Skills: prose parser → structured effects in formula buckets, hand-verified overrides in `src/skills/overrides/*.json` take precedence (all Prydwen bossing-tier S+ units are hand-verified; see `docs/override-guide.md` for authoring, `scripts/kit.ts` + `scripts/validate-overrides.ts` for tooling). Unmodeled effects are surfaced as modeling notes — never silently dropped.
- Λ units (Red Hood) burst at any stage by default; pin them with `--lambda-as` (CLI) or the "as B1/B2/B3" pills (site).

## v1 assumptions

No enemy debuffs on allies (full HP assumed), expected-value crits, always in effective range. Boss DEF and core-hit rate are inputs. Ally-applied Damage Taken debuffs ARE modeled. Parts/pierce are v3 (`future.md`).
