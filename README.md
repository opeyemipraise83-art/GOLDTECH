# AutoEditor — Personal Build

My personal copy of **AutoEditor**, a browser-based tool that turns a set of
timestamped images (plus an optional voiceover and transcript) into a rendered
MP4 video. See `ATTRIBUTION.md` for credit to the original author and `LICENSE`
for the terms (personal / non-commercial use).

## How the timing works

Each image is named by the time it should appear. The app reads that timestamp
from the filename and shows the image from its time until the next image's time
(the last image runs to the end of the audio).

Accepted filename formats (colon-free, Windows-safe):

| Filename        | Shows at |
|-----------------|----------|
| `0-00.png`      | 0:00     |
| `0-17.png`      | 0:17     |
| `10-24.png`     | 10:24    |
| `1-05-30.png`   | 1:05:30 (hh-mm-ss) |
| `17.png`        | 0:17 (bare seconds) |
| `147.png`       | 1:47 (bare mmss)    |

You can use `-` or `_` as the separator.

## My added features

On top of the original app, this personal build adds:

- **Background music** — mixed under the voiceover, looped with a tail fade and
  auto-ducking; audible in the preview without rendering. Controls live in the
  editor sidebar.
- **Captions** — 14 styles, 6 fonts, karaoke word-by-word highlighting, and
  **animate-in** entrances (fade / slide up / slide down / pop).
- **Logo / watermark** — upload an image, pick a corner, set size and opacity.
- **Cinematic effects** — vignette, animated film grain, and drifting light
  leaks (each an independent 0–100% strength slider).
- **Motion presets** — 9 per-clip options: none, zoom in, zoom out, zoom punch,
  pan left/right/up/down, and shake (richer than the original Ken Burns zoom).
- **Transitions** — 21 total (cut, fades, wipes, slides, smooth slides, circle
  open/close, pixelize, and more).
- **Export presets** — one-click **TikTok / Reels / Shorts / YouTube** that set
  aspect ratio, frame rate, and quality together.

All of these show live in the preview and are burned into the exported MP4, and
they're saved per project (restored on load, cleared on reset).

## Run it locally

Requirements: Node.js 18+.

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:3000). Add a voiceover,
add your timestamped images, choose transitions/captions, and export.

- `npm run build` — production build (static export)
- `npm test` — run the unit tests

## Optional native render backend

`server/` is a small Node/Express service that renders with native ffmpeg
(faster/heavier than the in-browser WebCodecs path). See `server/README.md`.

## Credit

Original work © TryAIToday (codewithsiddique-04). This is a personal,
non-commercial build. See `ATTRIBUTION.md` and `LICENSE`.
