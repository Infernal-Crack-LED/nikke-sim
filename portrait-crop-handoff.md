# Handoff: high-res portraits + the face-crop spec

**For:** the agent working on the nikke-sim web UI.
**TL;DR:** `imageUrl` now points at a **blablalink portrait** — a **256×512** (1:2) bust, not a placeholder. To match the framing Bakery Bot's `/nikke` embed uses, show it as a **1:1 square whose top sits 12.5% down** from the top of the source (frames the face). In this browser UI that is a **one-line CSS change** to `.portrait`: add `object-position: 50% 25%`. No JS, no canvas, no CORS issue.

---

## Status

- Bakery Bot change: `imageUrl` is set (during `sync:nikke`) to the blablalink "mi" portrait — logical path `/character/mi/mi_c<resource_id:3>_00_s.png`, served (obfuscated) from `sg-tools-cdn.blablalink.com`. All are **256×512**.
- The bot itself crops at render time (Discord can't crop) and attaches a 256×256 square. The sim reads the **same** `imageUrl` from the shared DB (`row.image_url` in `src/data/sync.ts`), so you just need the browser equivalent of that crop.
- Nothing to migrate or fetch — the URL is already in the DB you read.

## The crop spec (source of truth)

Given a source portrait `W × H` (currently always `256 × 512`):

- **Box:** a square, side = `min(W, H)` = the full width (256), horizontally centred.
- **Top edge:** `round(H × 1/8)` = `round(512 × 0.125)` = **64px** down, clamped so `top + side ≤ H`.
- **Result:** the `256×256` region covering source rows `[64, 320]` → the face.

`12.5%` (1/8) was picked by sweeping offsets on Emma / Cinderella / Maiden: Ice Rose; it frames the face cleanly across the roster.

## Do this in nikke-sim (the whole change)

`.portrait` already is a square box with `object-fit: cover` — it just defaults to centring on the **torso**. Point it at the face:

```css
/* web/src/styles.css — .portrait */
.portrait {
  width: 100%; aspect-ratio: 1; object-fit: cover; object-position: 50% 25%;
  border-radius: 8px; background: var(--panel2); border: 1px solid var(--border);
}
```

The small `<img>` in the character picker (App.tsx, `.picker-list img`) can take the same `object-fit: cover; object-position: 50% 25%` if you want the picker thumbnails framed identically.

### Why `object-position: 50% 25%` (not 12.5%)

`object-position`'s Y% aligns *that* percentage of the **overflow**, not of the image. With `cover` on a 1:2 image in a 1:1 box, the visible window is `W` tall and the vertical overflow is `H − W = 512 − 256 = 256px`. We want the window to start `64px` down, so:

```
Y% = topPx / (H − W) = 64 / 256 = 0.25 = 25%
```

For any 1:2 source this is always `25%` (`(H/8) / (H − H/2) = 1/4`). If the source aspect ever changes, recompute from the spec above rather than hard-coding 25%.

## If you ever need actual cropped pixels (not CSS)

Bakery Bot's implementation is `apps/bot/src/lib/nikke/portrait.ts` — a pure `squarePortraitCrop(width, height)` (returns `{left, top, width, height}`) plus a `sharp`-based `cropPortraitSquare(buffer)`. Port `squarePortraitCrop` verbatim if you add server-side image processing; it's the same spec this doc describes. Note blablalink's CDN 403s no-User-Agent/datacenter requests, so any server-side fetch needs a browser-ish `User-Agent` (canvas in the browser is fine for same-origin, but blablalink is cross-origin and will taint the canvas — prefer the CSS crop).
