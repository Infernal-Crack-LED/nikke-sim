notes from max:
full configurable support is too heavy weight for the in-discord sim, lets focus this on a smaller slice, not sure how currently though. will need to ideate.

# Sharing sim results to Discord (maiden bot) — image-first

Goal: post a **generated result image** to Discord (replacing a plain text embed).
The web app now has a "🖼 Share image" button that renders a self-contained
summary card to a PNG client-side; this doc is how the same thing factors into
maiden bot so a Discord command can post that card.

## What exists now (web app)

- `buildShareImage()` in `web/src/App.tsx` draws a summary card to a `<canvas>`
  (title, team damage, DPS/FB/uptime, per-unit rows with element-tinted
  **placeholder** portraits + share bars + damage) and returns a PNG blob.
- `onShareImage()` shares it via the Web Share API (files) when available, else
  copies to clipboard, else downloads.
- Portraits are placeholders on purpose: nikke-synergy portraits can't be drawn
  in a browser canvas (their CORS `access-control-allow-origin` is a fixed origin
  → tainted canvas → export throws). A bot has **no CORS constraint**, so once
  the high-res blabla art lands in bakery-bot's DB (`nikke_characters.image_url`,
  see the image handoff), the bot can fetch and draw real portraits.

## Confirmed: Discord embed/image posting works

Tested against the provided webhook (do **not** commit the URL — keep it in an
env var, e.g. `MAIDEN_WEBHOOK_URL`):

- A JSON embed POST returns `204` (works).
- An **image is posted as a multipart attachment** — the same pattern, replacing
  the text embed with the picture:

```
curl -X POST "$MAIDEN_WEBHOOK_URL" \
  -F 'payload_json={"username":"nikke-sim","attachments":[{"id":0,"filename":"team.png"}]}' \
  -F 'file=@team.png;type=image/png'
```

To show the image _inside_ an embed instead of as a bare attachment, reference
it with `attachment://`:
`{"embeds":[{"title":"NIKKE Solo Raid Sim","image":{"url":"attachment://team.png"}}]}`.

## Recommended shape in maiden bot

The sim engine is filesystem-free and already importable
(`runSim`, `prepareTeam` from `~/nikke-sim/src`) — the bot can run the sim
server-side without a browser.

1. **Slash command** e.g. `/sim team:<5 slugs> [weakness] [level] [core]`
   (and later `/bestteam`, `/character` once the calc tabs' backend lands —
   see `docs/calc-tabs-handoff.md`).
2. **Run the sim** with a `SimConfig` built from the options (same mapping the
   web `useMemo` uses: `bossElement = WEAKNESS_TO_BOSS[weakness]`, etc.).
3. **Render the card** with the SAME drawing code as the web app. To avoid drift,
   **extract the canvas drawing into a shared pure function**
   `drawTeamCard(ctx, result, opts)` that takes any Canvas2D-compatible context:
   - web app passes a browser `CanvasRenderingContext2D`;
   - the bot passes a Node canvas from `@napi-rs/canvas` (preferred — no native
     build) or `node-canvas`. Register a sans-serif font so `FONT` resolves.
   - Keep `roundRect`, `ELEMENT_COLORS`, `FONT`, and the row layout in that
     shared module so both callers stay pixel-identical.
4. **Post the PNG** as an attachment via discord.js `AttachmentBuilder`
   (`new AttachmentBuilder(buffer, { name: 'team.png' })`) on the interaction
   reply, or via the webhook multipart form above if posting out-of-band.
5. **Portraits**: start with the placeholder boxes (identical to the web app);
   swap to real art once bakery-bot syncs high-res images. The bot fetches them
   server-side and `drawImage`s them into the 60×60 slots — no CORS issue.

## Suggested next step to make this clean

Move the drawing code out of `web/src/App.tsx` into a shared, dependency-light
module (e.g. `src/share/teamCard.ts`) exporting `drawTeamCard(ctx, result, opts)`
plus the color/font/roundRect helpers. The web app imports it and passes a
browser context; maiden bot imports it and passes a `@napi-rs/canvas` context.
One implementation, two surfaces.
