# Burst-gen ranking: simulated vs. raw `rl3` column

Generated: 2026-07-27T08:02:56.103Z

The simulated board (`src/ranks/burstgen.ts`) runs each sim-supported unit in a standard no-op team for 180s with bursts enabled, the unit placed as the leftmost member of its burst category and measured UNFOCUSED (camera focus is parked on a non-charge no-op teammate, so charge weapons generate at ×1.0 — the ×2.5 focus bonus is not applied on this board). Kit gauge effects, skill-generation procs, and team-ammo-scaling profiles are included. The reported value is gauge-percent contributed per second of active gauge-building time.

The `rl3` column in `data/characters.json` is the synergy API gauge generated in the first ~3 seconds of an arena opener, at **base** (non-boss) values and **unfocused**. It is a raw, short-window, no-kit snapshot of weapon generation.

This file ranks sim-supported units by `rl3` alone and lists the largest rank divergences against the simulated board. Big jumps usually mean kit gauge effects, charge-weapon generation, rotation teammates, or the 180s window matter more than the raw 3s opener.

## Top 30 by simulated burst-gen board

| rank | slug                    | name                     | weapon | burst |  profile | gauge%/s |
| ---: | ----------------------- | ------------------------ | ------ | ----- | -------: | -------: |
|    1 | helm                    | Helm (Treasure)          | SR     | III   |          |    16.11 |
|    2 | little-mermaid          | Little Mermaid           | SMG    | I     | with-2mg |    14.54 |
|    3 | little-mermaid          | Little Mermaid           | SMG    | I     |          |    10.64 |
|    4 | cinderella-crystal-wave | Cinderella: Crystal Wave | MG     | III   |  with-mg |    10.25 |
|    5 | grave                   | Grave                    | AR     | II    |          |     9.34 |
|    6 | neon-vision-eye         | Neon: Vision Eye         | RL     | III   |          |     9.27 |
|    7 | raven                   | Raven                    | RL     | III   |          |     9.22 |
|    8 | noir                    | Noir                     | SG     | III   |          |     9.14 |
|    9 | drake                   | Drake (Treasure)         | SG     | III   |          |     8.62 |
|   10 | snow-white-heavy-arms   | Snow White: Heavy Arms   | SR     | III   |          |     8.34 |
|   11 | bready                  | Bready                   | SR     | III   |          |     7.52 |
|   12 | soda-twinkling-bunny    | Soda: Twinkling Bunny    | SG     | III   |          |     6.82 |
|   13 | liberalio               | Liberalio                | SR     | III   |          |     6.49 |
|   14 | jill                    | Jill                     | AR     | III   |          |     5.69 |
|   15 | zwei                    | Zwei (Treasure)          | SG     | I     |          |     5.66 |
|   16 | cinderella-crystal-wave | Cinderella: Crystal Wave | MG     | III   |          |     5.33 |
|   17 | ein                     | Ein                      | SR     | III   |          |     5.13 |
|   18 | quency-escape-queen     | Quency: Escape Queen     | SMG    | III   |          |     4.83 |
|   19 | red-hood                | Red Hood                 | SR     | Λ     |          |     4.61 |
|   20 | mana                    | Mana                     | AR     | III   |          |     4.53 |
|   21 | snow-white              | Snow White               | AR     | III   |          |     4.51 |
|   22 | maiden-ice-rose         | Maiden: Ice Rose         | RL     | III   |          |     4.34 |
|   23 | moran                   | Moran (Treasure)         | AR     | I     |          |     4.33 |
|   24 | sugar                   | Sugar (Treasure)         | SG     | III   |          |     4.29 |
|   25 | scarlet                 | Scarlet                  | AR     | III   |          |     4.22 |
|   26 | trina                   | Trina                    | RL     | II    |          |     4.19 |
|   27 | phantom                 | Phantom (Treasure)       | AR     | III   |          |     4.18 |
|   28 | laplace                 | Laplace (Treasure)       | RL     | III   |          |     4.05 |
|   29 | velvet                  | Velvet                   | SR     | II    |          |     4.05 |
|   30 | dorothy-serendipity     | Dorothy: Serendipity     | SG     | III   |          |     4.03 |

## Top 30 by raw `rl3` (3-second opener, base/unfocused)

| rank | slug                  | name                   | weapon | burst |    rl3 | sim rank | sim gauge%/s |
| ---: | --------------------- | ---------------------- | ------ | ----: | -----: | -------: | -----------: |
|    1 | snow-white-heavy-arms | Snow White: Heavy Arms | SR     |   III |   67.2 |       10 |         8.34 |
|    2 | helm                  | Helm (Treasure)        | SR     |   III |  59.73 |        1 |        16.11 |
|    3 | anis-star             | Anis: Star             | RL     |     I | 53.424 |       47 |         3.40 |
|    4 | trina                 | Trina                  | RL     |    II |   43.2 |       26 |         4.19 |
|    5 | laplace               | Laplace (Treasure)     | RL     |   III |   34.8 |       28 |         4.05 |
|    6 | liberalio             | Liberalio              | SR     |   III |   33.6 |       13 |         6.49 |
|    7 | maiden-ice-rose       | Maiden: Ice Rose       | RL     |   III |   27.3 |       22 |         4.34 |
|    8 | drake                 | Drake (Treasure)       | SG     |   III |     27 |        9 |         8.62 |
|    9 | noir                  | Noir                   | SG     |   III |     27 |        8 |         9.14 |
|   10 | soda-twinkling-bunny  | Soda: Twinkling Bunny  | SG     |   III |     27 |       12 |         6.82 |
|   11 | sugar                 | Sugar (Treasure)       | SG     |   III |     27 |       24 |         4.29 |
|   12 | zwei                  | Zwei (Treasure)        | SG     |     I |     21 |       15 |         5.66 |
|   13 | arcana                | Arcana                 | RL     |    II |     18 |       83 |         1.65 |
|   14 | grave                 | Grave                  | AR     |    II |   17.1 |        5 |         9.34 |
|   15 | scarlet               | Scarlet                | AR     |   III |   17.1 |       25 |         4.22 |
|   16 | ada                   | Ada                    | RL     |   III |   16.8 |       78 |         2.20 |
|   17 | anchor-innocent-maid  | Anchor: Innocent Maid  | RL     |    II |   16.8 |       82 |         1.75 |
|   18 | diesel-winter-sweets  | Diesel: Winter Sweets  | RL     |   III |   16.8 |       81 |         1.76 |
|   19 | mint                  | Mint                   | RL     |    II |   16.8 |       80 |         1.82 |
|   20 | raven                 | Raven                  | RL     |   III |   16.8 |        7 |         9.22 |
|   21 | mana                  | Mana                   | AR     |   III | 16.188 |       20 |         4.53 |
|   22 | ein                   | Ein                    | SR     |   III |     14 |       17 |         5.13 |
|   23 | scarlet-black-shadow  | Scarlet: Black Shadow  | RL     |   III |  13.75 |       48 |         3.33 |
|   24 | jill                  | Jill                   | AR     |   III |   13.2 |       14 |         5.69 |
|   25 | anis-sparkling-summer | Anis: Sparkling Summer | SG     |   III |     13 |       65 |         3.06 |
|   26 | brid-silent-track     | Brid: Silent Track     | SG     |    II |   12.2 |       46 |         3.41 |
|   27 | arcana-fortune-mate   | Arcana: Fortune Mate   | SG     |    II |     12 |       69 |         3.00 |
|   28 | dorothy-serendipity   | Dorothy: Serendipity   | SG     |   III |     12 |       30 |         4.03 |
|   29 | guilty                | Guilty                 | SG     |    II |     12 |       62 |         3.11 |
|   30 | isabel                | Isabel                 | SG     |   III |     12 |       66 |         3.06 |

## Full raw `rl3` ranking (all sim-supported units)

| rank | slug                     | name                      | weapon | burst |    rl3 | sim rank | sim gauge%/s |
| ---: | ------------------------ | ------------------------- | ------ | ----: | -----: | -------: | -----------: |
|    1 | snow-white-heavy-arms    | Snow White: Heavy Arms    | SR     |   III |   67.2 |       10 |         8.34 |
|    2 | helm                     | Helm (Treasure)           | SR     |   III |  59.73 |        1 |        16.11 |
|    3 | anis-star                | Anis: Star                | RL     |     I | 53.424 |       47 |         3.40 |
|    4 | trina                    | Trina                     | RL     |    II |   43.2 |       26 |         4.19 |
|    5 | laplace                  | Laplace (Treasure)        | RL     |   III |   34.8 |       28 |         4.05 |
|    6 | liberalio                | Liberalio                 | SR     |   III |   33.6 |       13 |         6.49 |
|    7 | maiden-ice-rose          | Maiden: Ice Rose          | RL     |   III |   27.3 |       22 |         4.34 |
|    8 | drake                    | Drake (Treasure)          | SG     |   III |     27 |        9 |         8.62 |
|    9 | noir                     | Noir                      | SG     |   III |     27 |        8 |         9.14 |
|   10 | soda-twinkling-bunny     | Soda: Twinkling Bunny     | SG     |   III |     27 |       12 |         6.82 |
|   11 | sugar                    | Sugar (Treasure)          | SG     |   III |     27 |       24 |         4.29 |
|   12 | zwei                     | Zwei (Treasure)           | SG     |     I |     21 |       15 |         5.66 |
|   13 | arcana                   | Arcana                    | RL     |    II |     18 |       83 |         1.65 |
|   14 | grave                    | Grave                     | AR     |    II |   17.1 |        5 |         9.34 |
|   15 | scarlet                  | Scarlet                   | AR     |   III |   17.1 |       25 |         4.22 |
|   16 | ada                      | Ada                       | RL     |   III |   16.8 |       78 |         2.20 |
|   17 | anchor-innocent-maid     | Anchor: Innocent Maid     | RL     |    II |   16.8 |       82 |         1.75 |
|   18 | diesel-winter-sweets     | Diesel: Winter Sweets     | RL     |   III |   16.8 |       81 |         1.76 |
|   19 | mint                     | Mint                      | RL     |    II |   16.8 |       80 |         1.82 |
|   20 | raven                    | Raven                     | RL     |   III |   16.8 |        7 |         9.22 |
|   21 | mana                     | Mana                      | AR     |   III | 16.188 |       20 |         4.53 |
|   22 | ein                      | Ein                       | SR     |   III |     14 |       17 |         5.13 |
|   23 | scarlet-black-shadow     | Scarlet: Black Shadow     | RL     |   III |  13.75 |       48 |         3.33 |
|   24 | jill                     | Jill                      | AR     |   III |   13.2 |       14 |         5.69 |
|   25 | anis-sparkling-summer    | Anis: Sparkling Summer    | SG     |   III |     13 |       65 |         3.06 |
|   26 | brid-silent-track        | Brid: Silent Track        | SG     |    II |   12.2 |       46 |         3.41 |
|   27 | arcana-fortune-mate      | Arcana: Fortune Mate      | SG     |    II |     12 |       69 |         3.00 |
|   28 | dorothy-serendipity      | Dorothy: Serendipity      | SG     |   III |     12 |       30 |         4.03 |
|   29 | guilty                   | Guilty                    | SG     |    II |     12 |       62 |         3.11 |
|   30 | isabel                   | Isabel                    | SG     |   III |     12 |       66 |         3.06 |
|   31 | leona                    | Leona                     | SG     |    II |     12 |       50 |         3.30 |
|   32 | naga                     | Naga                      | SG     |    II |     12 |       51 |         3.30 |
|   33 | soline-frost-ticket      | Soline: Frost Ticket      | SG     |     I |     12 |       49 |         3.31 |
|   34 | asuka                    | Asuka                     | AR     |   III |   11.4 |       36 |         3.80 |
|   35 | snow-white               | Snow White                | AR     |   III |   9.75 |       21 |         4.51 |
|   36 | moran                    | Moran (Treasure)          | AR     |     I |    9.5 |       23 |         4.33 |
|   37 | phantom                  | Phantom (Treasure)        | AR     |   III |    9.5 |       27 |         4.18 |
|   38 | neon-vision-eye          | Neon: Vision Eye          | RL     |   III |      9 |        6 |         9.27 |
|   39 | rouge                    | Rouge                     | SR     |     I |    8.7 |       52 |         3.26 |
|   40 | quency-escape-queen      | Quency: Escape Queen      | SMG    |   III |  8.436 |       18 |         4.83 |
|   41 | ade-agent-bunny          | Ade: Agent Bunny          | SR     |    II |    8.4 |       56 |         3.17 |
|   42 | bready                   | Bready                    | SR     |   III |    8.4 |       11 |         7.52 |
|   43 | d-killer-wife            | D: Killer Wife            | SR     |     I |    8.4 |       61 |         3.14 |
|   44 | mari                     | Mari                      | SR     |    II |    8.4 |       57 |         3.17 |
|   45 | maxwell                  | Maxwell                   | SR     |   III |    8.4 |       54 |         3.24 |
|   46 | milk-blooming-bunny      | Milk: Blooming Bunny      | SR     |   III |    8.4 |       53 |         3.26 |
|   47 | prika                    | Prika                     | SR     |    II |    8.4 |       58 |         3.17 |
|   48 | red-hood                 | Red Hood                  | SR     |     Λ |    8.4 |       19 |         4.61 |
|   49 | sakura-bloom-in-summer   | Sakura: Bloom in Summer   | AR     |   III |    8.4 |       33 |         3.95 |
|   50 | takina                   | Takina                    | SR     |    II |    8.4 |       60 |         3.15 |
|   51 | velvet                   | Velvet                    | SR     |    II |    8.4 |       29 |         4.05 |
|   52 | helm-aquamarine          | Helm: Aquamarine          | AR     |    II |    7.8 |       31 |         3.98 |
|   53 | ark-ranger-black         | Ark Ranger Black          | AR     |   III |    7.6 |       41 |         3.73 |
|   54 | blanc                    | Blanc                     | AR     |    II |    7.6 |       37 |         3.78 |
|   55 | eve                      | EVE                       | AR     |   III |    7.6 |       32 |         3.96 |
|   56 | guillotine-winter-slayer | Guillotine: Winter Slayer | AR     |   III |    7.6 |       43 |         3.64 |
|   57 | marciana-marine-study    | Marciana: Marine Study    | AR     |   III |    7.6 |       42 |         3.73 |
|   58 | privaty                  | Privaty (Treasure)        | AR     |   III |    7.6 |       44 |         3.62 |
|   59 | rosanna-chic-ocean       | Rosanna: Chic Ocean       | AR     |    II |    7.6 |       34 |         3.95 |
|   60 | tove                     | Tove (Treasure)           | AR     |     I |    7.6 |       39 |         3.76 |
|   61 | modernia                 | Modernia                  | MG     |   III |    7.1 |       45 |         3.54 |
|   62 | little-mermaid           | Little Mermaid            | SMG    |     I |    6.2 |        3 |        10.64 |
|   63 | chisato                  | Chisato                   | SMG    |   III |    5.7 |       59 |         3.16 |
|   64 | liter                    | Liter                     | SMG    |     I |    5.7 |       64 |         3.07 |
|   65 | miranda                  | Miranda (Treasure)        | SMG    |     I |    5.7 |       63 |         3.07 |
|   66 | nayuta                   | Nayuta                    | SMG    |    II |    5.7 |       67 |         3.02 |
|   67 | volume                   | Volume                    | SMG    |     I |    5.7 |       68 |         3.01 |
|   68 | alice                    | Alice                     | SR     |   III |    5.6 |       76 |         2.35 |
|   69 | mihara-bonding-chain     | Mihara: Bonding Chain     | MG     |   III |   4.95 |       72 |         2.43 |
|   70 | rosanna                  | Rosanna (Treasure)        | MG     |     I |   3.65 |       40 |         3.73 |
|   71 | asuka-wille              | Asuka: WILLE              | MG     |   III |    3.6 |       55 |         3.21 |
|   72 | cinderella               | Cinderella                | RL     |   III |    3.6 |       79 |         1.91 |
|   73 | ludmilla-winter-owner    | Ludmilla: Winter Owner    | MG     |   III |    3.6 |       38 |         3.77 |
|   74 | cinderella-crystal-wave  | Cinderella: Crystal Wave  | MG     |   III |   3.55 |       16 |         5.33 |
|   75 | crown                    | Crown                     | MG     |    II |   3.55 |       35 |         3.90 |
|   76 | delta-ninja-thief        | Delta: Ninja Thief        | MG     |    II |   3.55 |       70 |         2.45 |
|   77 | elegg-boom-and-shock     | Elegg: Boom and Shock     | MG     |   III |   3.55 |       77 |         2.32 |
|   78 | flora                    | Flora (Treasure)          | MG     |    II |   3.55 |       71 |         2.45 |
|   79 | mast-romantic-maid       | Mast: Romantic Maid       | MG     |    II |   3.55 |       73 |         2.43 |
|   80 | rapi-red-hood            | Rapi: Red Hood            | MG     |   III |   3.55 |       75 |         2.36 |
|   81 | rei-ayanami              | Rei Ayanami               | MG     |   III |   3.55 |       74 |         2.37 |

## Largest rank divergences (|Δrank| ≥ 10)

| rl3 rank | slug                     | name                      | weapon | burst | sim rank | Δrank |    rl3 | sim gauge%/s | notes                      |
| -------: | ------------------------ | ------------------------- | ------ | ----: | -------: | ----: | -----: | -----------: | -------------------------- |
|       13 | arcana                   | Arcana                    | RL     |    II |       83 |   -70 |     18 |         1.65 |                            |
|       17 | anchor-innocent-maid     | Anchor: Innocent Maid     | RL     |    II |       82 |   -65 |   16.8 |         1.75 |                            |
|       18 | diesel-winter-sweets     | Diesel: Winter Sweets     | RL     |   III |       81 |   -63 |   16.8 |         1.76 |                            |
|       16 | ada                      | Ada                       | RL     |   III |       78 |   -62 |   16.8 |         2.20 |                            |
|       19 | mint                     | Mint                      | RL     |    II |       80 |   -61 |   16.8 |         1.82 |                            |
|       62 | little-mermaid           | Little Mermaid            | SMG    |     I |        3 |   +59 |    6.2 |        10.64 | profiled: 4 MG teammate(s) |
|       74 | cinderella-crystal-wave  | Cinderella: Crystal Wave  | MG     |   III |       16 |   +58 |   3.55 |         5.33 | profiled: 4 MG teammate(s) |
|        3 | anis-star                | Anis: Star                | RL     |     I |       47 |   -44 | 53.424 |         3.40 |                            |
|       27 | arcana-fortune-mate      | Arcana: Fortune Mate      | SG     |    II |       69 |   -42 |     12 |         3.00 |                            |
|       25 | anis-sparkling-summer    | Anis: Sparkling Summer    | SG     |   III |       65 |   -40 |     13 |         3.06 |                            |
|       75 | crown                    | Crown                     | MG     |    II |       35 |   +40 |   3.55 |         3.90 |                            |
|       30 | isabel                   | Isabel                    | SG     |   III |       66 |   -36 |     12 |         3.06 |                            |
|       73 | ludmilla-winter-owner    | Ludmilla: Winter Owner    | MG     |   III |       38 |   +35 |    3.6 |         3.77 |                            |
|       29 | guilty                   | Guilty                    | SG     |    II |       62 |   -33 |     12 |         3.11 |                            |
|       38 | neon-vision-eye          | Neon: Vision Eye          | RL     |   III |        6 |   +32 |      9 |         9.27 |                            |
|       42 | bready                   | Bready                    | SR     |   III |       11 |   +31 |    8.4 |         7.52 |                            |
|       70 | rosanna                  | Rosanna (Treasure)        | MG     |     I |       40 |   +30 |   3.65 |         3.73 |                            |
|       48 | red-hood                 | Red Hood                  | SR     |     Λ |       19 |   +29 |    8.4 |         4.61 |                            |
|       59 | rosanna-chic-ocean       | Rosanna: Chic Ocean       | AR     |    II |       34 |   +25 |    7.6 |         3.95 |                            |
|       23 | scarlet-black-shadow     | Scarlet: Black Shadow     | RL     |   III |       48 |   -25 |  13.75 |         3.33 |                            |
|       55 | eve                      | EVE                       | AR     |   III |       32 |   +23 |    7.6 |         3.96 |                            |
|        5 | laplace                  | Laplace (Treasure)        | RL     |   III |       28 |   -23 |   34.8 |         4.05 |                            |
|       40 | quency-escape-queen      | Quency: Escape Queen      | SMG    |   III |       18 |   +22 |  8.436 |         4.83 |                            |
|        4 | trina                    | Trina                     | RL     |    II |       26 |   -22 |   43.2 |         4.19 |                            |
|       51 | velvet                   | Velvet                    | SR     |    II |       29 |   +22 |    8.4 |         4.05 |                            |
|       52 | helm-aquamarine          | Helm: Aquamarine          | AR     |    II |       31 |   +21 |    7.8 |         3.98 |                            |
|       60 | tove                     | Tove (Treasure)           | AR     |     I |       39 |   +21 |    7.6 |         3.76 |                            |
|       26 | brid-silent-track        | Brid: Silent Track        | SG     |    II |       46 |   -20 |   12.2 |         3.41 |                            |
|       31 | leona                    | Leona                     | SG     |    II |       50 |   -19 |     12 |         3.30 |                            |
|       32 | naga                     | Naga                      | SG     |    II |       51 |   -19 |     12 |         3.30 |                            |
|       43 | d-killer-wife            | D: Killer Wife            | SR     |     I |       61 |   -18 |    8.4 |         3.14 |                            |
|       54 | blanc                    | Blanc                     | AR     |    II |       37 |   +17 |    7.6 |         3.78 |                            |
|       71 | asuka-wille              | Asuka: WILLE              | MG     |   III |       55 |   +16 |    3.6 |         3.21 |                            |
|       61 | modernia                 | Modernia                  | MG     |   III |       45 |   +16 |    7.1 |         3.54 |                            |
|       49 | sakura-bloom-in-summer   | Sakura: Bloom in Summer   | AR     |   III |       33 |   +16 |    8.4 |         3.95 |                            |
|       33 | soline-frost-ticket      | Soline: Frost Ticket      | SG     |     I |       49 |   -16 |     12 |         3.31 |                            |
|       41 | ade-agent-bunny          | Ade: Agent Bunny          | SR     |    II |       56 |   -15 |    8.4 |         3.17 |                            |
|        7 | maiden-ice-rose          | Maiden: Ice Rose          | RL     |   III |       22 |   -15 |   27.3 |         4.34 |                            |
|       57 | marciana-marine-study    | Marciana: Marine Study    | AR     |   III |       42 |   +15 |    7.6 |         3.73 |                            |
|       58 | privaty                  | Privaty (Treasure)        | AR     |   III |       44 |   +14 |    7.6 |         3.62 |                            |
|       35 | snow-white               | Snow White                | AR     |   III |       21 |   +14 |   9.75 |         4.51 |                            |
|       56 | guillotine-winter-slayer | Guillotine: Winter Slayer | AR     |   III |       43 |   +13 |    7.6 |         3.64 |                            |
|       44 | mari                     | Mari                      | SR     |    II |       57 |   -13 |    8.4 |         3.17 |                            |
|       36 | moran                    | Moran (Treasure)          | AR     |     I |       23 |   +13 |    9.5 |         4.33 |                            |
|       20 | raven                    | Raven                     | RL     |   III |        7 |   +13 |   16.8 |         9.22 |                            |
|       39 | rouge                    | Rouge                     | SR     |     I |       52 |   -13 |    8.7 |         3.26 |                            |
|       11 | sugar                    | Sugar (Treasure)          | SG     |   III |       24 |   -13 |     27 |         4.29 |                            |
|       53 | ark-ranger-black         | Ark Ranger Black          | AR     |   III |       41 |   +12 |    7.6 |         3.73 |                            |
|       47 | prika                    | Prika                     | SR     |    II |       58 |   -11 |    8.4 |         3.17 |                            |
|       24 | jill                     | Jill                      | AR     |   III |       14 |   +10 |   13.2 |         5.69 |                            |
|       37 | phantom                  | Phantom (Treasure)        | AR     |   III |       27 |   +10 |    9.5 |         4.18 |                            |
|       15 | scarlet                  | Scarlet                   | AR     |   III |       25 |   -10 |   17.1 |         4.22 |                            |
|       50 | takina                   | Takina                    | SR     |    II |       60 |   -10 |    8.4 |         3.15 |                            |

## Summary stats

- Sim-supported units: 81
- Units with |Δrank| ≥ 10: 53
- rl3-over-performers (rl3 rank much better than sim rank, Δ ≤ -10): 24 units
- sim-over-performers (sim rank much better than rl3 rank, Δ ≥ +10): 25 units
