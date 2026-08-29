// Transition definitions shared by the preview (canvas) and the export (ffmpeg
// xfade). Each has an `xfade` name (null = hard cut) and a `canvas` painter so
// the preview matches the rendered result closely.

export const DEFAULT_TRANSITION_DURATION = 0.4;
export const MIN_TRANSITION_DURATION = 0.15;
export const MAX_TRANSITION_DURATION = 1.0;

// Draw an image contained in WxH, optionally zoomed by `scale` about the centre
// so transitions can blend two images at their current Ken Burns zoom.
function paint(ctx, img, W, H, scale = 1) {
  if (!img) return; // no image = black (gap / lead-in)
  // HTMLImageElement=naturalWidth; <video>=videoWidth; VideoFrame=displayWidth; ImageBitmap=width.
  const iw = img.naturalWidth || img.videoWidth || img.displayWidth || img.width;
  const ih = img.naturalHeight || img.videoHeight || img.displayHeight || img.height;
  if (!iw || !ih) return;
  const s = Math.min(W / iw, H / ih) * scale;
  const w = iw * s;
  const h = ih * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

// Each canvas painter receives a black-filled context and blends `from` -> `to`
// as progress p goes 0 -> 1. `sf`/`st` are the from/to images' zoom scales.
export const TRANSITIONS = {
  cut: {
    label: "None", icon: "⊘", xfade: null,
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => paint(c, t, W, H, st),
  },
  fade: {
    label: "Crossfade", icon: "✕", xfade: "fade",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.globalAlpha = p;
      paint(c, t, W, H, st);
      c.globalAlpha = 1;
    },
  },
  fadeblack: {
    label: "Fade to black", icon: "◐", xfade: "fadeblack",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      if (p < 0.5) { c.globalAlpha = 1 - 2 * p; paint(c, f, W, H, sf); }
      else { c.globalAlpha = 2 * p - 1; paint(c, t, W, H, st); }
      c.globalAlpha = 1;
    },
  },
  wipeleft: {
    label: "Wipe left", icon: "◀", xfade: "wipeleft",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.beginPath(); const x = W * (1 - p); c.rect(x, 0, W - x, H); c.clip();
      paint(c, t, W, H, st); c.restore();
    },
  },
  wiperight: {
    label: "Wipe right", icon: "▶", xfade: "wiperight",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.beginPath(); c.rect(0, 0, W * p, H); c.clip();
      paint(c, t, W, H, st); c.restore();
    },
  },
  slideleft: {
    label: "Slide left", icon: "⇐", xfade: "slideleft",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      c.save(); c.translate(-W * p, 0); paint(c, f, W, H, sf); c.restore();
      c.save(); c.translate(W * (1 - p), 0); paint(c, t, W, H, st); c.restore();
    },
  },
  slideright: {
    label: "Slide right", icon: "⇒", xfade: "slideright",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      c.save(); c.translate(W * p, 0); paint(c, f, W, H, sf); c.restore();
      c.save(); c.translate(-W * (1 - p), 0); paint(c, t, W, H, st); c.restore();
    },
  },
  circleopen: {
    label: "Circle open", icon: "◎", xfade: "circleopen",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.beginPath();
      c.arc(W / 2, H / 2, (Math.hypot(W, H) / 2) * p, 0, Math.PI * 2); c.clip();
      paint(c, t, W, H, st); c.restore();
    },
  },
  circleclose: {
    label: "Circle close", icon: "◍", xfade: "circleclose",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, t, W, H, st);
      c.save(); c.beginPath();
      c.arc(W / 2, H / 2, (Math.hypot(W, H) / 2) * (1 - p), 0, Math.PI * 2); c.clip();
      paint(c, f, W, H, sf); c.restore();
    },
  },
  slideup: {
    label: "Slide up", icon: "⇑", xfade: "slideup",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      c.save(); c.translate(0, -H * p); paint(c, f, W, H, sf); c.restore();
      c.save(); c.translate(0, H * (1 - p)); paint(c, t, W, H, st); c.restore();
    },
  },
  slidedown: {
    label: "Slide down", icon: "⇓", xfade: "slidedown",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      c.save(); c.translate(0, H * p); paint(c, f, W, H, sf); c.restore();
      c.save(); c.translate(0, -H * (1 - p)); paint(c, t, W, H, st); c.restore();
    },
  },
  wipeup: {
    label: "Wipe up", icon: "▲", xfade: "wipeup",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.beginPath(); const y = H * (1 - p); c.rect(0, y, W, H - y); c.clip();
      paint(c, t, W, H, st); c.restore();
    },
  },
  wipedown: {
    label: "Wipe down", icon: "▼", xfade: "wipedown",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.beginPath(); c.rect(0, 0, W, H * p); c.clip();
      paint(c, t, W, H, st); c.restore();
    },
  },
  smoothleft: {
    label: "Smooth left", icon: "↞", xfade: "smoothleft",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      // Soft-edged left slide: the incoming image glides in over the outgoing one.
      paint(c, f, W, H, sf);
      c.save(); c.globalAlpha = Math.min(1, p * 1.4);
      c.translate(W * (1 - p) * 0.5, 0); paint(c, t, W, H, st); c.restore();
    },
  },
  smoothright: {
    label: "Smooth right", icon: "↠", xfade: "smoothright",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.globalAlpha = Math.min(1, p * 1.4);
      c.translate(-W * (1 - p) * 0.5, 0); paint(c, t, W, H, st); c.restore();
    },
  },
  smoothup: {
    label: "Smooth up", icon: "↟", xfade: "smoothup",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.globalAlpha = Math.min(1, p * 1.4);
      c.translate(0, H * (1 - p) * 0.5); paint(c, t, W, H, st); c.restore();
    },
  },
  smoothdown: {
    label: "Smooth down", icon: "↡", xfade: "smoothdown",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.globalAlpha = Math.min(1, p * 1.4);
      c.translate(0, -H * (1 - p) * 0.5); paint(c, t, W, H, st); c.restore();
    },
  },
  diagtl: {
    label: "Diagonal", icon: "⟍", xfade: "diagtl",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      paint(c, f, W, H, sf);
      c.save(); c.beginPath();
      // Reveal the incoming image behind a diagonal edge sweeping from top-left.
      const d = (W + H) * p;
      c.moveTo(0, 0); c.lineTo(d, 0); c.lineTo(0, d); c.closePath(); c.clip();
      paint(c, t, W, H, st); c.restore();
    },
  },
  pixelize: {
    label: "Dissolve", icon: "▚", xfade: "pixelize",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      // No true pixelize on canvas; approximate with a quick crossfade (render uses
      // ffmpeg's real pixelize). Keeps preview close enough to communicate the cut.
      paint(c, f, W, H, sf);
      c.globalAlpha = p; paint(c, t, W, H, st); c.globalAlpha = 1;
    },
  },
  fadegrays: {
    label: "Fade (grays)", icon: "◑", xfade: "fadegrays",
    canvas: (c, f, t, p, W, H, sf = 1, st = 1) => {
      // Desaturate-through-fade approximation: crossfade with a grey midpoint.
      paint(c, f, W, H, sf);
      c.globalAlpha = p; paint(c, t, W, H, st); c.globalAlpha = 1;
    },
  },
};

export const TRANSITION_LIST = Object.keys(TRANSITIONS).map((id) => ({ id, ...TRANSITIONS[id] }));

export function transitionOf(id) {
  return TRANSITIONS[id] || TRANSITIONS.cut;
}

// Assign a transition id to each of `n` cuts, chosen randomly from `picks`,
// avoiding the same id on consecutive cuts when possible. With a single pick,
// every cut gets it. rnd() is injectable for deterministic tests.
export function mixTransitions(picks, n, rnd = Math.random) {
  const out = [];
  if (!picks || !picks.length || n <= 0) return out;
  for (let i = 0; i < n; i++) {
    let pool = picks;
    if (picks.length > 1 && i > 0) pool = picks.filter((p) => p !== out[i - 1]);
    out.push(pool[Math.floor(rnd() * pool.length)]);
  }
  return out;
}
