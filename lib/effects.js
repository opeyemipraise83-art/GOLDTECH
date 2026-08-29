// Cinematic overlay effects drawn on top of each frame, shared by the preview and
// the WebCodecs render so they match. All are resolution-independent (sized as
// fractions of the frame) and time-aware where relevant (grain/leaks animate).
//
// drawEffects(ctx, W, H, t, { vignette, grain, leaks }) — each 0..1 strength (0 = off).

export const DEFAULT_VIGNETTE = 0;
export const DEFAULT_GRAIN = 0;
export const DEFAULT_LEAKS = 0;

// A cached radial-gradient vignette (rebuilt only when size changes).
let _vigKey = "";
let _vigGrad = null;
function vignetteGradient(ctx, W, H, strength) {
  const key = `${W}x${H}:${strength.toFixed(3)}`;
  if (key === _vigKey && _vigGrad) return _vigGrad;
  const cx = W / 2, cy = H / 2;
  const inner = Math.min(W, H) * 0.35;
  const outer = Math.hypot(W, H) / 2;
  const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${Math.max(0, Math.min(0.85, strength * 0.85))})`);
  _vigKey = key; _vigGrad = g;
  return g;
}

// A small tile of random monochrome noise, reused and re-seeded occasionally so the
// grain shimmers without generating a full-frame noise buffer every frame.
let _grainTiles = null;
function grainTiles(ctx) {
  if (_grainTiles) return _grainTiles;
  const N = 6, S = 128;
  _grainTiles = [];
  for (let k = 0; k < N; k++) {
    const c = (typeof OffscreenCanvas !== "undefined") ? new OffscreenCanvas(S, S)
      : Object.assign(document.createElement("canvas"), { width: S, height: S });
    const g = c.getContext("2d");
    const img = g.createImageData(S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    _grainTiles.push(c);
  }
  return _grainTiles;
}

export function drawEffects(ctx, W, H, t, { vignette = 0, grain = 0, leaks = 0 } = {}) {
  // Vignette: darken the edges.
  if (vignette > 0) {
    ctx.save();
    ctx.fillStyle = vignetteGradient(ctx, W, H, vignette);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Light leaks: soft warm glows that drift/pulse over time, in screen blend.
  if (leaks > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = Math.max(0, Math.min(1, leaks));
    const drift = (phase) => 0.5 + 0.5 * Math.sin(t * 0.6 + phase);
    const g1x = W * (0.15 + 0.1 * drift(0)), g1y = H * (0.2 + 0.1 * drift(1.3));
    const r1 = Math.max(W, H) * 0.55;
    const grad1 = ctx.createRadialGradient(g1x, g1y, 0, g1x, g1y, r1);
    grad1.addColorStop(0, "rgba(255,170,80,0.55)");
    grad1.addColorStop(1, "rgba(255,170,80,0)");
    ctx.fillStyle = grad1; ctx.fillRect(0, 0, W, H);
    const g2x = W * (0.85 - 0.1 * drift(2.1)), g2y = H * (0.8 - 0.1 * drift(0.7));
    const r2 = Math.max(W, H) * 0.5;
    const grad2 = ctx.createRadialGradient(g2x, g2y, 0, g2x, g2y, r2);
    grad2.addColorStop(0, "rgba(255,90,120,0.45)");
    grad2.addColorStop(1, "rgba(255,90,120,0)");
    ctx.fillStyle = grad2; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Film grain: overlay a shifting noise tile, tiled across the frame.
  if (grain > 0) {
    const tiles = grainTiles(ctx);
    const tile = tiles[Math.floor(t * 24) % tiles.length]; // ~24 reshuffles/sec
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(0.5, grain * 0.35));
    ctx.globalCompositeOperation = "overlay";
    const S = tile.width || 128;
    // Offset the tiling each frame so a static pattern isn't visible.
    const ox = (Math.floor(t * 120) % S) - S;
    const oy = (Math.floor(t * 90) % S) - S;
    for (let y = oy; y < H; y += S) for (let x = ox; x < W; x += S) ctx.drawImage(tile, x, y);
    ctx.restore();
  }
}
