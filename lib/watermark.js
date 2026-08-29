// Logo / watermark overlay: draw a logo image in a corner of the frame, shared by
// the preview canvas and the WebCodecs render so they match. Resolution-independent
// — size and margin are fractions of the frame width, so 720p preview and full-res
// export place it identically (WYSIWYG).

export const LOGO_POSITIONS = {
  tl: { id: "tl", label: "Top left" },
  tr: { id: "tr", label: "Top right" },
  bl: { id: "bl", label: "Bottom left" },
  br: { id: "br", label: "Bottom right" },
};
export const LOGO_POSITION_LIST = Object.keys(LOGO_POSITIONS).map((id) => LOGO_POSITIONS[id]);

export const DEFAULT_LOGO_SIZE = 0.14;    // logo width as a fraction of frame width
export const DEFAULT_LOGO_OPACITY = 0.9;  // 0..1
export const LOGO_MARGIN = 0.035;         // gap from the edges, fraction of frame width

// Compute the destination rect for the logo, preserving its aspect ratio.
// Returns { x, y, w, h } in pixels, or null if the image isn't usable.
export function logoRect(img, W, H, { position = "br", size = DEFAULT_LOGO_SIZE } = {}) {
  if (!img) return null;
  const iw = img.naturalWidth || img.displayWidth || img.width;
  const ih = img.naturalHeight || img.displayHeight || img.height;
  if (!iw || !ih) return null;
  const w = Math.max(1, W * Math.min(0.6, Math.max(0.02, size)));
  const h = w * (ih / iw);
  const m = W * LOGO_MARGIN;
  const pos = LOGO_POSITIONS[position] ? position : "br";
  const left = pos === "tl" || pos === "bl";
  const top = pos === "tl" || pos === "tr";
  const x = left ? m : W - w - m;
  const y = top ? m : H - h - m;
  return { x, y, w, h };
}

// Draw the logo onto ctx. Safe no-op if img/rect is missing.
export function drawLogo(ctx, img, W, H, opts = {}) {
  const rect = logoRect(img, W, H, opts);
  if (!rect) return;
  const opacity = opts.opacity == null ? DEFAULT_LOGO_OPACITY : opts.opacity;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  try { ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h); } catch (_) {}
  ctx.restore();
}
