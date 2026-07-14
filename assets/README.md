# assets/ — source media (not served)

Original source files the web assets are derived from. This directory is **not**
Vite's `publicDir` (that's `img/`), so nothing here ships to the site — it exists
so regeneration is self-contained and needs no external directory.

- `maiden-avatar-source.gif` — the Maiden bot's 1080×402 banner. The served avatar
  `img/maiden.gif` is a face-centered 340² crop of it (scaled to 160², animated),
  rendered circular in the UI. Regenerate with `bash scripts/gen-maiden-avatar.sh`.

The Blablalink footer logo (`img/blablalink.png`) came from the profile-README badge
(a base64 PNG) and already lives in-repo — no external source needed.
