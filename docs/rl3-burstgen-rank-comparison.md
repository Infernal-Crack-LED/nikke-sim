# Burst-gen ranking: simulated vs. raw `rl3` column

Generated: 2026-07-27T05:04:49.802Z

The simulated board (`src/ranks/burstgen.ts`) runs each sim-supported unit solo for 180s with bursts disabled and the camera focused on the unit (charge weapons ×2.5). Kit gauge effects, skill-generation procs, and team-ammo-scaling profiles are included.

The `rl3` column in `data/characters.json` is the synergy API gauge generated in the first ~3 seconds of an arena opener, at **base** (non-boss) values and **unfocused**. It is a raw, short-window, no-kit snapshot of weapon generation.

This file ranks sim-supported units by `rl3` alone and lists the largest rank divergences against the simulated board. Big jumps usually mean kit gauge effects, focus/charge scaling, or the 180s window matter more than the raw 3s opener.

## Top 30 by simulated burst-gen board

| rank | slug                    | name                     | weapon | burst |  profile | bars/180s |
| ---: | ----------------------- | ------------------------ | ------ | ----- | -------: | --------- |
|    1 | helm                    | Helm (Treasure)          | SR     | III   |          | 33.2      |
|    2 | neon-vision-eye         | Neon: Vision Eye         | RL     | III   |          | 26.3      |
|    3 | snow-white-heavy-arms   | Snow White: Heavy Arms   | SR     | III   |          | 22.7      |
|    4 | rosanna                 | Rosanna                  | MG     | I     |          | 22.5      |
|    5 | bready                  | Bready                   | SR     | III   |          | 20.8      |
|    6 | flora                   | Flora                    | MG     | II    |          | 20.8      |
|    7 | raven                   | Raven                    | RL     | III   |          | 20.4      |
|    8 | liberalio               | Liberalio                | SR     | III   |          | 18.0      |
|    9 | red-hood                | Red Hood                 | SR     | Λ     |          | 17.6      |
|   10 | little-mermaid          | Little Mermaid           | SMG    | I     | with-2mg | 17.5      |
|   11 | ein                     | Ein                      | SR     | III   |          | 17.3      |
|   12 | trina                   | Trina                    | RL     | II    |          | 17.1      |
|   13 | grave                   | Grave                    | AR     | II    |          | 16.0      |
|   14 | noir                    | Noir                     | SG     | III   |          | 14.1      |
|   15 | rouge                   | Rouge                    | SR     | I     |          | 13.9      |
|   16 | ade-agent-bunny         | Ade: Agent Bunny         | SR     | II    |          | 13.7      |
|   17 | d-killer-wife           | D: Killer Wife           | SR     | I     |          | 13.7      |
|   18 | mari                    | Mari                     | SR     | II    |          | 13.7      |
|   19 | maxwell                 | Maxwell                  | SR     | III   |          | 13.7      |
|   20 | milk-blooming-bunny     | Milk: Blooming Bunny     | SR     | III   |          | 13.7      |
|   21 | prika                   | Prika                    | SR     | II    |          | 13.7      |
|   22 | takina                  | Takina                   | SR     | II    |          | 13.7      |
|   23 | velvet                  | Velvet                   | SR     | II    |          | 13.7      |
|   24 | drake                   | Drake                    | SG     | III   |          | 13.3      |
|   25 | scarlet-black-shadow    | Scarlet: Black Shadow    | RL     | III   |          | 13.0      |
|   26 | mana                    | Mana                     | AR     | III   |          | 12.6      |
|   27 | maiden-ice-rose         | Maiden: Ice Rose         | RL     | III   |          | 12.5      |
|   28 | cinderella-crystal-wave | Cinderella: Crystal Wave | MG     | III   | with-1mg | 11.3      |
|   29 | soda-twinkling-bunny    | Soda: Twinkling Bunny    | SG     | III   |          | 11.2      |
|   30 | anis-star               | Anis: Star               | RL     | I     |          | 11.1      |

## Top 30 by raw `rl3` (3-second opener, base/unfocused)

| rank | slug                  | name                   | weapon | burst |    rl3 | sim rank | sim bars/180s |
| ---: | --------------------- | ---------------------- | ------ | ----: | -----: | -------: | ------------: |
|    1 | snow-white-heavy-arms | Snow White: Heavy Arms | SR     |   III |   67.2 |        3 |          22.7 |
|    2 | helm                  | Helm (Treasure)        | SR     |   III |  59.73 |        1 |          33.2 |
|    3 | anis-star             | Anis: Star             | RL     |     I | 53.424 |       30 |          11.1 |
|    4 | trina                 | Trina                  | RL     |    II |   43.2 |       12 |          17.1 |
|    5 | laplace               | Laplace (Treasure)     | RL     |   III |   34.8 |       34 |           9.7 |
|    6 | liberalio             | Liberalio              | SR     |   III |   33.6 |        8 |          18.0 |
|    7 | maiden-ice-rose       | Maiden: Ice Rose       | RL     |   III |   27.3 |       27 |          12.5 |
|    8 | drake                 | Drake                  | SG     |   III |     27 |       24 |          13.3 |
|    9 | noir                  | Noir                   | SG     |   III |     27 |       14 |          14.1 |
|   10 | soda-twinkling-bunny  | Soda: Twinkling Bunny  | SG     |   III |     27 |       29 |          11.2 |
|   11 | sugar                 | Sugar                  | SG     |   III |     27 |       83 |           0.5 |
|   12 | zwei                  | Zwei                   | SG     |     I |     21 |       33 |           9.9 |
|   13 | arcana                | Arcana                 | RL     |    II |     18 |       43 |           7.1 |
|   14 | grave                 | Grave                  | AR     |    II |   17.1 |       13 |          16.0 |
|   15 | scarlet               | Scarlet                | AR     |   III |   17.1 |       41 |           7.2 |
|   16 | ada                   | Ada                    | RL     |   III |   16.8 |       46 |           6.9 |
|   17 | anchor-innocent-maid  | Anchor: Innocent Maid  | RL     |    II |   16.8 |       47 |           6.9 |
|   18 | diesel-winter-sweets  | Diesel: Winter Sweets  | RL     |   III |   16.8 |       48 |           6.9 |
|   19 | mint                  | Mint                   | RL     |    II |   16.8 |       49 |           6.9 |
|   20 | raven                 | Raven                  | RL     |   III |   16.8 |        7 |          20.4 |
|   21 | mana                  | Mana                   | AR     |   III | 16.188 |       26 |          12.6 |
|   22 | ein                   | Ein                    | SR     |   III |     14 |       11 |          17.3 |
|   23 | scarlet-black-shadow  | Scarlet: Black Shadow  | RL     |   III |  13.75 |       25 |          13.0 |
|   24 | jill                  | Jill                   | AR     |   III |   13.2 |       32 |          10.7 |
|   25 | anis-sparkling-summer | Anis: Sparkling Summer | SG     |   III |     13 |       67 |           5.6 |
|   26 | brid-silent-track     | Brid: Silent Track     | SG     |    II |   12.2 |       62 |           5.8 |
|   27 | arcana-fortune-mate   | Arcana: Fortune Mate   | SG     |    II |     12 |       77 |           5.2 |
|   28 | dorothy-serendipity   | Dorothy: Serendipity   | SG     |   III |     12 |       59 |           6.1 |
|   29 | guilty                | Guilty                 | SG     |    II |     12 |       82 |           5.0 |
|   30 | isabel                | Isabel                 | SG     |   III |     12 |       68 |           5.5 |

## Full raw `rl3` ranking (all sim-supported units)

| rank | slug                     | name                      | weapon | burst |    rl3 | sim rank | sim bars/180s |
| ---: | ------------------------ | ------------------------- | ------ | ----: | -----: | -------: | ------------: |
|    1 | snow-white-heavy-arms    | Snow White: Heavy Arms    | SR     |   III |   67.2 |        3 |          22.7 |
|    2 | helm                     | Helm (Treasure)           | SR     |   III |  59.73 |        1 |          33.2 |
|    3 | anis-star                | Anis: Star                | RL     |     I | 53.424 |       30 |          11.1 |
|    4 | trina                    | Trina                     | RL     |    II |   43.2 |       12 |          17.1 |
|    5 | laplace                  | Laplace (Treasure)        | RL     |   III |   34.8 |       34 |           9.7 |
|    6 | liberalio                | Liberalio                 | SR     |   III |   33.6 |        8 |          18.0 |
|    7 | maiden-ice-rose          | Maiden: Ice Rose          | RL     |   III |   27.3 |       27 |          12.5 |
|    8 | drake                    | Drake                     | SG     |   III |     27 |       24 |          13.3 |
|    9 | noir                     | Noir                      | SG     |   III |     27 |       14 |          14.1 |
|   10 | soda-twinkling-bunny     | Soda: Twinkling Bunny     | SG     |   III |     27 |       29 |          11.2 |
|   11 | sugar                    | Sugar                     | SG     |   III |     27 |       83 |           0.5 |
|   12 | zwei                     | Zwei                      | SG     |     I |     21 |       33 |           9.9 |
|   13 | arcana                   | Arcana                    | RL     |    II |     18 |       43 |           7.1 |
|   14 | grave                    | Grave                     | AR     |    II |   17.1 |       13 |          16.0 |
|   15 | scarlet                  | Scarlet                   | AR     |   III |   17.1 |       41 |           7.2 |
|   16 | ada                      | Ada                       | RL     |   III |   16.8 |       46 |           6.9 |
|   17 | anchor-innocent-maid     | Anchor: Innocent Maid     | RL     |    II |   16.8 |       47 |           6.9 |
|   18 | diesel-winter-sweets     | Diesel: Winter Sweets     | RL     |   III |   16.8 |       48 |           6.9 |
|   19 | mint                     | Mint                      | RL     |    II |   16.8 |       49 |           6.9 |
|   20 | raven                    | Raven                     | RL     |   III |   16.8 |        7 |          20.4 |
|   21 | mana                     | Mana                      | AR     |   III | 16.188 |       26 |          12.6 |
|   22 | ein                      | Ein                       | SR     |   III |     14 |       11 |          17.3 |
|   23 | scarlet-black-shadow     | Scarlet: Black Shadow     | RL     |   III |  13.75 |       25 |          13.0 |
|   24 | jill                     | Jill                      | AR     |   III |   13.2 |       32 |          10.7 |
|   25 | anis-sparkling-summer    | Anis: Sparkling Summer    | SG     |   III |     13 |       67 |           5.6 |
|   26 | brid-silent-track        | Brid: Silent Track        | SG     |    II |   12.2 |       62 |           5.8 |
|   27 | arcana-fortune-mate      | Arcana: Fortune Mate      | SG     |    II |     12 |       77 |           5.2 |
|   28 | dorothy-serendipity      | Dorothy: Serendipity      | SG     |   III |     12 |       59 |           6.1 |
|   29 | guilty                   | Guilty                    | SG     |    II |     12 |       82 |           5.0 |
|   30 | isabel                   | Isabel                    | SG     |   III |     12 |       68 |           5.5 |
|   31 | leona                    | Leona                     | SG     |    II |     12 |       64 |           5.7 |
|   32 | naga                     | Naga                      | SG     |    II |     12 |       65 |           5.7 |
|   33 | soline-frost-ticket      | Soline: Frost Ticket      | SG     |     I |     12 |       66 |           5.7 |
|   34 | asuka                    | Asuka                     | AR     |   III |   11.4 |       55 |           6.5 |
|   35 | snow-white               | Snow White                | AR     |   III |   9.75 |       38 |           7.9 |
|   36 | moran                    | Moran                     | AR     |     I |    9.5 |       39 |           7.5 |
|   37 | phantom                  | Phantom                   | AR     |   III |    9.5 |       40 |           7.4 |
|   38 | neon-vision-eye          | Neon: Vision Eye          | RL     |   III |      9 |        2 |          26.3 |
|   39 | rouge                    | Rouge                     | SR     |     I |    8.7 |       15 |          13.9 |
|   40 | quency-escape-queen      | Quency: Escape Queen      | SMG    |   III |  8.436 |       35 |           8.3 |
|   41 | ade-agent-bunny          | Ade: Agent Bunny          | SR     |    II |    8.4 |       16 |          13.7 |
|   42 | bready                   | Bready                    | SR     |   III |    8.4 |        5 |          20.8 |
|   43 | d-killer-wife            | D: Killer Wife            | SR     |     I |    8.4 |       17 |          13.7 |
|   44 | mari                     | Mari                      | SR     |    II |    8.4 |       18 |          13.7 |
|   45 | maxwell                  | Maxwell                   | SR     |   III |    8.4 |       19 |          13.7 |
|   46 | milk-blooming-bunny      | Milk: Blooming Bunny      | SR     |   III |    8.4 |       20 |          13.7 |
|   47 | prika                    | Prika                     | SR     |    II |    8.4 |       21 |          13.7 |
|   48 | red-hood                 | Red Hood                  | SR     |     Λ |    8.4 |        9 |          17.6 |
|   49 | sakura-bloom-in-summer   | Sakura: Bloom in Summer   | AR     |   III |    8.4 |       50 |           6.8 |
|   50 | takina                   | Takina                    | SR     |    II |    8.4 |       22 |          13.7 |
|   51 | velvet                   | Velvet                    | SR     |    II |    8.4 |       23 |          13.7 |
|   52 | helm-aquamarine          | Helm: Aquamarine          | AR     |    II |    7.8 |       45 |           6.9 |
|   53 | ark-ranger-black         | Ark Ranger Black          | AR     |   III |    7.6 |       56 |           6.5 |
|   54 | blanc                    | Blanc                     | AR     |    II |    7.6 |       57 |           6.5 |
|   55 | eve                      | EVE                       | AR     |   III |    7.6 |       44 |           6.9 |
|   56 | guillotine-winter-slayer | Guillotine: Winter Slayer | AR     |   III |    7.6 |       54 |           6.5 |
|   57 | marciana-marine-study    | Marciana: Marine Study    | AR     |   III |    7.6 |       58 |           6.5 |
|   58 | privaty                  | Privaty                   | AR     |   III |    7.6 |       53 |           6.6 |
|   59 | rosanna-chic-ocean       | Rosanna: Chic Ocean       | AR     |    II |    7.6 |       51 |           6.8 |
|   60 | tove                     | Tove                      | AR     |     I |    7.6 |       52 |           6.6 |
|   61 | modernia                 | Modernia                  | MG     |   III |    7.1 |       42 |           7.2 |
|   62 | little-mermaid           | Little Mermaid            | SMG    |     I |    6.2 |       37 |           8.2 |
|   63 | chisato                  | Chisato                   | SMG    |   III |    5.7 |       63 |           5.7 |
|   64 | liter                    | Liter                     | SMG    |     I |    5.7 |       71 |           5.3 |
|   65 | miranda                  | Miranda                   | SMG    |     I |    5.7 |       72 |           5.3 |
|   66 | nayuta                   | Nayuta                    | SMG    |    II |    5.7 |       73 |           5.3 |
|   67 | volume                   | Volume                    | SMG    |     I |    5.7 |       74 |           5.3 |
|   68 | alice                    | Alice                     | SR     |   III |    5.6 |       31 |          10.8 |
|   69 | mihara-bonding-chain     | Mihara: Bonding Chain     | MG     |   III |   4.95 |       69 |           5.4 |
|   70 | rosanna                  | Rosanna                   | MG     |     I |   3.65 |        4 |          22.5 |
|   71 | asuka-wille              | Asuka: WILLE              | MG     |   III |    3.6 |       70 |           5.4 |
|   72 | cinderella               | Cinderella                | RL     |   III |    3.6 |       60 |           6.1 |
|   73 | ludmilla-winter-owner    | Ludmilla: Winter Owner    | MG     |   III |    3.6 |       61 |           6.0 |
|   74 | cinderella-crystal-wave  | Cinderella: Crystal Wave  | MG     |   III |   3.55 |       36 |           8.2 |
|   75 | crown                    | Crown                     | MG     |    II |   3.55 |       79 |           5.2 |
|   76 | delta-ninja-thief        | Delta: Ninja Thief        | MG     |    II |   3.55 |       80 |           5.2 |
|   77 | elegg-boom-and-shock     | Elegg: Boom and Shock     | MG     |   III |   3.55 |       78 |           5.2 |
|   78 | flora                    | Flora                     | MG     |    II |   3.55 |        6 |          20.8 |
|   79 | mast-romantic-maid       | Mast: Romantic Maid       | MG     |    II |   3.55 |       81 |           5.2 |
|   80 | rapi-red-hood            | Rapi: Red Hood            | MG     |   III |   3.55 |       76 |           5.2 |
|   81 | rei-ayanami              | Rei Ayanami               | MG     |   III |   3.55 |       75 |           5.2 |

## Largest rank divergences (|Δrank| ≥ 10)

| rl3 rank | slug                    | name                     | weapon | burst | sim rank | Δrank | rl3 | sim bars/180s | notes |
| -------: | ----------------------- | ------------------------ | ------ | ----: | -------: | ----: | --: | ------------: | ----- |
|       78 | flora                   | Flora                    | MG     |    II |       78 |     6 | +72 |          3.55 | 20.8  |                           |
|       11 | sugar                   | Sugar                    | SG     |   III |       11 |    83 | -72 |            27 | 0.5   |                           |
|       70 | rosanna                 | Rosanna                  | MG     |     I |       70 |     4 | +66 |          3.65 | 22.5  |                           |
|       29 | guilty                  | Guilty                   | SG     |    II |       29 |    82 | -53 |            12 | 5.0   |                           |
|       27 | arcana-fortune-mate     | Arcana: Fortune Mate     | SG     |    II |       27 |    77 | -50 |            12 | 5.2   |                           |
|       25 | anis-sparkling-summer   | Anis: Sparkling Summer   | SG     |   III |       25 |    67 | -42 |            13 | 5.6   |                           |
|       48 | red-hood                | Red Hood                 | SR     |     Λ |       48 |     9 | +39 |           8.4 | 17.6  |                           |
|       74 | cinderella-crystal-wave | Cinderella: Crystal Wave | MG     |   III |       74 |    36 | +38 |          3.55 | 8.2   | profiled: 1 MG partner(s) |
|       30 | isabel                  | Isabel                   | SG     |   III |       30 |    68 | -38 |            12 | 5.5   |                           |
|       68 | alice                   | Alice                    | SR     |   III |       68 |    31 | +37 |           5.6 | 10.8  |                           |
|       42 | bready                  | Bready                   | SR     |   III |       42 |     5 | +37 |           8.4 | 20.8  |                           |
|       26 | brid-silent-track       | Brid: Silent Track       | SG     |    II |       26 |    62 | -36 |          12.2 | 5.8   |                           |
|       38 | neon-vision-eye         | Neon: Vision Eye         | RL     |   III |       38 |     2 | +36 |             9 | 26.3  |                           |
|       31 | leona                   | Leona                    | SG     |    II |       31 |    64 | -33 |            12 | 5.7   |                           |
|       32 | naga                    | Naga                     | SG     |    II |       32 |    65 | -33 |            12 | 5.7   |                           |
|       33 | soline-frost-ticket     | Soline: Frost Ticket     | SG     |     I |       33 |    66 | -33 |            12 | 5.7   |                           |
|       28 | dorothy-serendipity     | Dorothy: Serendipity     | SG     |   III |       28 |    59 | -31 |            12 | 6.1   |                           |
|       16 | ada                     | Ada                      | RL     |   III |       16 |    46 | -30 |          16.8 | 6.9   |                           |
|       17 | anchor-innocent-maid    | Anchor: Innocent Maid    | RL     |    II |       17 |    47 | -30 |          16.8 | 6.9   |                           |
|       13 | arcana                  | Arcana                   | RL     |    II |       13 |    43 | -30 |            18 | 7.1   |                           |
|       18 | diesel-winter-sweets    | Diesel: Winter Sweets    | RL     |   III |       18 |    48 | -30 |          16.8 | 6.9   |                           |
|       19 | mint                    | Mint                     | RL     |    II |       19 |    49 | -30 |          16.8 | 6.9   |                           |
|        5 | laplace                 | Laplace (Treasure)       | RL     |   III |        5 |    34 | -29 |          34.8 | 9.7   |                           |
|       50 | takina                  | Takina                   | SR     |    II |       50 |    22 | +28 |           8.4 | 13.7  |                           |
|       51 | velvet                  | Velvet                   | SR     |    II |       51 |    23 | +28 |           8.4 | 13.7  |                           |
|        3 | anis-star               | Anis: Star               | RL     |     I |        3 |    30 | -27 |        53.424 | 11.1  |                           |
|       43 | d-killer-wife           | D: Killer Wife           | SR     |     I |       43 |    17 | +26 |           8.4 | 13.7  |                           |
|       44 | mari                    | Mari                     | SR     |    II |       44 |    18 | +26 |           8.4 | 13.7  |                           |
|       45 | maxwell                 | Maxwell                  | SR     |   III |       45 |    19 | +26 |           8.4 | 13.7  |                           |
|       46 | milk-blooming-bunny     | Milk: Blooming Bunny     | SR     |   III |       46 |    20 | +26 |           8.4 | 13.7  |                           |
|       47 | prika                   | Prika                    | SR     |    II |       47 |    21 | +26 |           8.4 | 13.7  |                           |
|       15 | scarlet                 | Scarlet                  | AR     |   III |       15 |    41 | -26 |          17.1 | 7.2   |                           |
|       41 | ade-agent-bunny         | Ade: Agent Bunny         | SR     |    II |       41 |    16 | +25 |           8.4 | 13.7  |                           |
|       62 | little-mermaid          | Little Mermaid           | SMG    |     I |       62 |    37 | +25 |           6.2 | 8.2   | profiled: 2 MG partner(s) |
|       39 | rouge                   | Rouge                    | SR     |     I |       39 |    15 | +24 |           8.7 | 13.9  |                           |
|       34 | asuka                   | Asuka                    | AR     |   III |       34 |    55 | -21 |          11.4 | 6.5   |                           |
|       12 | zwei                    | Zwei                     | SG     |     I |       12 |    33 | -21 |            21 | 9.9   |                           |
|        7 | maiden-ice-rose         | Maiden: Ice Rose         | RL     |   III |        7 |    27 | -20 |          27.3 | 12.5  |                           |
|       61 | modernia                | Modernia                 | MG     |   III |       61 |    42 | +19 |           7.1 | 7.2   |                           |
|       10 | soda-twinkling-bunny    | Soda: Twinkling Bunny    | SG     |   III |       10 |    29 | -19 |            27 | 11.2  |                           |
|        8 | drake                   | Drake                    | SG     |   III |        8 |    24 | -16 |            27 | 13.3  |                           |
|       20 | raven                   | Raven                    | RL     |   III |       20 |     7 | +13 |          16.8 | 20.4  |                           |
|       72 | cinderella              | Cinderella               | RL     |   III |       72 |    60 | +12 |           3.6 | 6.1   |                           |
|       73 | ludmilla-winter-owner   | Ludmilla: Winter Owner   | MG     |   III |       73 |    61 | +12 |           3.6 | 6.0   |                           |
|       22 | ein                     | Ein                      | SR     |   III |       22 |    11 | +11 |            14 | 17.3  |                           |
|       55 | eve                     | EVE                      | AR     |   III |       55 |    44 | +11 |           7.6 | 6.9   |                           |

## Summary stats

- Sim-supported units: 81
- Units with |Δrank| ≥ 10: 46
- rl3-over-performers (rl3 rank much better than sim rank, Δ ≤ -10): 23 units
- sim-over-performers (sim rank much better than rl3 rank, Δ ≥ +10): 23 units
