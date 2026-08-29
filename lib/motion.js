// Per-clip motion presets, shared by the preview and the WebCodecs render so they
// match. Extends the original Ken Burns zoom (zoomin/zoomout) with directional pans,
// a "punch" boom zoom, and a subtle shake.
//
// motionTransform(type, lp, amount, W, H, tSec) -> { scale, dx, dy }
//   lp     : clip-local progress 0..1
//   amount : base motion strength (the UI's motionAmount, e.g. 0.08)
//   W, H   : frame size (so pan/shake offsets can stay within the zoom headroom)
//   tSec   : absolute time in seconds (drives the time-based shake)
// scale is applied about the frame centre; dx/dy are pixel offsets.

export const MOTIONS = {
  none:    { id: "none",    label: "None" },
  zoomin:  { id: "zoomin",  label: "Zoom in" },
  zoomout: { id: "zoomout", label: "Zoom out" },
  punch:   { id: "punch",   label: "Zoom punch" },
  panleft: { id: "panleft", label: "Pan left" },
  panright:{ id: "panright",label: "Pan right" },
  panup:   { id: "panup",   label: "Pan up" },
  pandown: { id: "pandown", label: "Pan down" },
  shake:   { id: "shake",   label: "Shake" },
};
export const MOTION_LIST = Object.keys(MOTIONS).map((id) => MOTIONS[id]);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (p) => 1 - Math.pow(1 - clamp01(p), 3);

export function motionTransform(type, lp, amount = 0.08, W = 0, H = 0, tSec = 0) {
  const p = clamp01(lp);
  const a = Math.max(0, amount);
  const none = { scale: 1, dx: 0, dy: 0 };
  if (!type || type === "none") return none;

  if (type === "zoomin")  return { scale: 1 + a * p, dx: 0, dy: 0 };
  if (type === "zoomout") return { scale: 1 + a * (1 - p), dx: 0, dy: 0 };
  // Punch: most of the zoom happens fast at the start, then eases to rest — a "boom".
  if (type === "punch")   return { scale: 1 + a * 1.6 * easeOutCubic(p), dx: 0, dy: 0 };

  // Pans use a fixed zoom for headroom so the edges never reveal black while moving.
  if (type === "panleft" || type === "panright" || type === "panup" || type === "pandown") {
    const scale = 1 + Math.max(a, 0.08);
    const maxX = ((scale - 1) * W) / 2;
    const maxY = ((scale - 1) * H) / 2;
    if (type === "panleft")  return { scale, dx: maxX * (1 - 2 * p), dy: 0 };  // right -> left
    if (type === "panright") return { scale, dx: -maxX * (1 - 2 * p), dy: 0 }; // left -> right
    if (type === "panup")    return { scale, dx: 0, dy: maxY * (1 - 2 * p) };  // down -> up
    return { scale, dx: 0, dy: -maxY * (1 - 2 * p) };                          // pandown
  }

  // Shake: small, fast oscillation within a little zoom headroom.
  if (type === "shake") {
    const scale = 1 + Math.max(a, 0.05);
    const amp = Math.min(W, H) * 0.012 * (1 + a * 2);
    return { scale, dx: Math.sin(tSec * 38) * amp, dy: Math.cos(tSec * 31) * amp };
  }
  return none;
}
