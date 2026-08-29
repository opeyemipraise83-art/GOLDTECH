// One-click export presets for common social platforms. Each sets the aspect
// ratio, frame rate, and render quality so a user doesn't have to configure them
// individually. These map onto the app's existing setAspect / setFps /
// setRenderQuality controls — they don't introduce new render behaviour.

export const EXPORT_PRESETS = [
  { id: "custom",  label: "Custom",       aspect: null,   fps: null, quality: null,   hint: "Manual settings" },
  { id: "tiktok",  label: "TikTok",       aspect: "9:16", fps: 30,   quality: "full", hint: "1080×1920 · 30fps" },
  { id: "reels",   label: "Reels",        aspect: "9:16", fps: 30,   quality: "full", hint: "1080×1920 · 30fps" },
  { id: "shorts",  label: "Shorts",       aspect: "9:16", fps: 30,   quality: "full", hint: "1080×1920 · 30fps" },
  { id: "youtube", label: "YouTube",      aspect: "16:9", fps: 30,   quality: "full", hint: "1920×1080 · 30fps" },
];

// Given the current aspect/fps/quality, return the matching preset id, or "custom".
export function matchPreset(aspect, fps, quality) {
  for (const p of EXPORT_PRESETS) {
    if (p.id === "custom") continue;
    if (p.aspect === aspect && p.fps === fps && p.quality === quality) return p.id;
  }
  return "custom";
}

export function getPreset(id) {
  return EXPORT_PRESETS.find((p) => p.id === id) || null;
}
