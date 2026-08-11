# Meta-table drift — unify the three per-route title/description tables (2026-08-11)

Status: **OPEN — nothing here is implemented. Fix plan §5, owner calls §4.** Found during the
`docs/frontend-conventions.md` rewrite (commit `3f46b3c0`), which documents the lockstep rule and
flags this hazard in §6.3.

Origin: per-route SEO titles/descriptions live in THREE tables that nothing keeps in sync:

| Table                         | File                                  | Who sees it                                                                                       |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Client head sync              | `web/src/useDocumentHead.ts` (`META`) | JS users — browser tab title, meta refreshed on nav                                               |
| Deployed server               | `src/server/static.ts` (`TAB_META`)   | ALL crawlers (Google, Discord, Twitter…) — this is the production server (`npm run start:server`) |
| Legacy server (parity mirror) | `scripts/serve.mjs` (`TAB_META`)      | `npm start`; kept behavior-locked to static.ts by the serve tests                                 |

Plus a structural gap: **`/characters` has no client `META` entry at all** — the browser tab falls
back to the sim's title while both servers serve the characters title correctly.

## 1. How it drifted (provenance — this flips the naive read)

The instinct is "the deployed server is stale." Git says the opposite for most routes:

1. **`d1c84a26` "static embed updates" (2026-07-30) reworded `static.ts` ALONE** — 9 routes
   (22+/18−), touching exactly the entries that now disagree. The rewording tracks features that
   actually shipped (verified §2): union-raid roster sim/team builder, the Anomaly Interception
   resource family. The other two tables never followed.
2. **`30460baf` "adding embed for builder" (2026-07-31) reworded `serve.mjs`'s builder entry
   ALONE** — the only route where all three tables now differ.
3. `useDocumentHead.ts` has had neither update — it is the fossilized pre-`d1c84a26` copy.

So crawlers currently see the NEWER strings for most drifted routes, and JS users see the older
ones — the site disagrees with itself between the tab title and the embed card.

## 2. Accuracy evidence (what the shipped pages actually do)

Checked against the code 2026-08-11, to judge which side of each drift is true:

- **Union-raid Roster Sim is live** — `rosterSimMode: 'solo' | 'union'` with a `?mode=union` deep
  link (`web/src/App.tsx`). static.ts's "Union Raid" titles are accurate. (The DEFERRED union work
  in QUEUE.md is the TEAM GENERATOR's allocator, not this.)
- **Union mode is live in Team Builder** (`RosterMode = 'team' | 'solo' | 'union'`,
  `UnionBossOpts`, UR DEF 12.2k in `web/src/TeamBuilderPage.tsx`) — **but tower/campaign modes do
  not exist anywhere in that file**, so static.ts's "solo raid, union raid, tower, and campaign
  teams" overclaims.
- **Anomaly Interception is the Resources page's first pill** (`{ key: 'modules', label: 'Anomaly
Interception' }` in `ResourcesPage.tsx`; Kraken/T9 content in `core/resourcesData.ts`).
  static.ts's resources strings describe the shipped page; the client's "Fragment Income / solo-raid
  drops" strings predate the expansion.
- **The serve tests pin only substrings** (`serve-headers.test.ts` asserts e.g.
  `toContain('NIKKE DPS Rankings')`, not full titles), so unifying the strings is low-risk; the
  2026-07-31 multi-line-attribute injection bug those tests guard is unaffected.

## 3. The full drift census

Agree in all three: `dps`, `olsim`, `doll`, `charge`, `howto`, `dev`, `patch-notes`,
`testing-requests`, `roster-sync`, `credits` (and `sim`'s title). Drifted:

| Route         | Field | client `META` / serve.mjs                            | static.ts (deployed)                                                                    |
| ------------- | ----- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `sim`         | desc  | "solo-raid" hyphenation                              | "solo raid" (de-hyphenated) — cosmetic only                                             |
| `dpschart`    | title | "…Best Units & Overload Lines Tier List"             | "…Neutral, Elemental Advantaged, with and without Supports"                             |
| `dpschart`    | desc  | long keyword version                                 | "Ranked DPS of every B3 under standardized frameworks."                                 |
| `ranks`       | title | "…Burst Gen, Burst CDR, Sustain & Team Buffs Boards" | "…Team Damage Buffs, Burst Gen, Burst CDR, & Sustain"                                   |
| `ranks`       | desc  | buffer-value wording                                 | team-damage-buffs wording                                                               |
| `team`        | title | "…Best 5-Unit Solo Raid Team"                        | "…Best 5 Nikke Team"                                                                    |
| `team`        | desc  | "best 5-Nikke solo-raid team"                        | "best 5 Nikke team"                                                                     |
| `roster`      | title | "…Best Solo-Raid Teams from Your Units"              | "…Best Solo Raid/Union Raid Teams from Your Units"                                      |
| `rostersim`   | title | "…Compare All Your Solo-Raid Teams"                  | "…Sim Your Solo Raid and Union Raid Teams"                                              |
| `overload`    | desc  | "optimal 3rd overload line for every NIKKE B3"       | "optimal overload lines for any Nikke"                                                  |
| `teambuilder` | desc  | "solo-raid teams visually"                           | "solo raid, union raid, tower, and campaign teams visually" ⚠ overclaims                |
| `resources`   | title | "…Daily Custom Module & Fragment Income"             | "…Daily Custom Module & Anomaly Interception Outcome"                                   |
| `resources`   | desc  | solo-raid drops list                                 | Kraken / anomaly bosses / T9                                                            |
| `mechanics`   | title | "…Damage Formula & Solo Raid Guide"                  | "…Damage Formula & Other Game Mechanics"                                                |
| `mechanics`   | desc  | "solo-raid mechanics"                                | "other game mechanics"                                                                  |
| `builder`     | title | client "…Custom DPS Charts & Share Images"           | "…Custom DPS Charts & Infographics" — and serve.mjs says "…Custom Infographics" (3-way) |
| `builder`     | desc  | client = static.ts (five card types + hosted URL)    | serve.mjs: "Nikke Card, custom DPS chart, … specialized formatting for Discord and X"   |
| `characters`  | —     | **missing entirely**                                 | present (identical in both servers)                                                     |

Cosmetic while you are in there: both servers' TAB_META header comment still says the branching is
on a `?tab=` query; it is path-based (`tabFromReqUrl`). One-line comment fix in each.

## 4. Proposed resolution (owner calls marked ⚖)

Default rule: **adopt static.ts's strings** — they are the newest intentional edit and verified
accurate for `roster` (title), `rostersim` (title), `resources` (title + desc), and the `sim`
de-hyphenation. Exceptions:

- **`teambuilder` desc — rewrite, neither side is right.** Union is live, tower/campaign are not.
  Proposed: "Build and share NIKKE solo raid and union raid teams visually. Filter the full roster,
  set loadouts, and copy your team into the sim or roster sim."
- ⚖ **`dpschart` title — SEO strategy call, not accuracy.** "Best Units & Overload Lines Tier
  List" (keyword-dense) vs "Neutral, Elemental Advantaged, with and without Supports" (describes
  the matrix axes). This is the site's #2-priority page; owner picks in one line.
- ⚖ **`builder` — pick a title/desc pair.** Evidence-backed suggestion: static.ts's title
  ("Custom DPS Charts & Infographics") + serve.mjs's desc (the only one mentioning the Nikke Card
  and the Discord/X dual shapes, which shipped 2026-07-28).
- ⚖ **`team`, `ranks`, `mechanics` — static.ts by provenance,** but these are pure wording taste;
  a one-glance owner veto is enough.
- ⚖ **`overload` desc — verify the page first.** "every NIKKE B3" (client, matches llms.txt) vs
  "any Nikke" (static.ts). If the optimizer accepts non-B3 units with a fallback path, static.ts
  wins; else the client does.
- **`characters` — copy the servers' existing entry into `useDocumentHead.ts` META** (title
  "NIKKE Characters — Every Nikke's Kit, Overload Lines & DPS Rank", desc as served).

## 5. Fix plan

1. Choose strings per §4 (10-minute owner pass over the §3 table).
2. Apply to ALL THREE tables: `useDocumentHead.ts` `META`, `static.ts` `TAB_META`, `serve.mjs`
   `TAB_META`. Keep the servers' `label`/`image` fields as-is (`image` keys mirror
   `build-infographics.ts` manifest keys — out of scope here).
3. Add the `characters` entry to `useDocumentHead.ts` (the `tabKey()` fallthrough already routes
   `/characters` correctly; only the table row is missing).
4. Fix the `?tab=` header comments in both servers.
5. **Land the durable guard (the actual "never re-learn this" fix):** a
   `scripts/tests/share/meta-parity.test.ts` that loads the three tables (import the TS modules;
   `serve.mjs` is importable ESM) and asserts title + desc equality per shared key, failing with
   the exact drifted keys. This is the piece that turns the §6.3 lockstep RULE into an enforced
   invariant; without it the next single-table edit recreates this handoff.
6. Verify: `npx vitest run scripts/tests/share/serve-headers.test.ts
scripts/tests/share/serve-api.test.ts scripts/tests/share/meta-parity.test.ts`, then
   `bash scripts/verify.sh`. Smoke both servers locally (`npm start` and `npm run start:server`
   against a built `dist/`) and confirm `/ranks` and `/characters` titles.
7. Post-deploy spot check: `curl -s https://nikkesim.app/ranks | grep -o '<title>[^<]*'` should
   match the chosen string (deployed server is static.ts).

Blast radius: cosmetic SEO/embed text only — no routing, no cache policy, no JSON-LD, no no-JS
bodies. Embed cards change title/desc text in lockstep (that is the point). `docs/STATE.md` and
`docs/frontend-conventions.md` §6.3 need a one-line "drift resolved + parity test landed" update
when this closes, and the entry leaves QUEUE.md per the pre-PR hygiene rule.
