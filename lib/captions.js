// Captions: parse an uploaded timestamped transcript into short caption cues,
// draw them on the preview canvas, and build the ffmpeg drawtext chain that
// burns them into the render. Preview and render share the same font + styles
// so what you see is what you get.

// ---- style presets (shared by preview canvas + ffmpeg drawtext) ----
// `fill`/`stroke`/`box` drive the canvas preview; `dt(bw)` returns the
// drawtext colour/box options for the burn-in.
export const CAPTION_STYLES = {
  classic: {
    id: "classic", label: "Classic outline",
    fill: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
  boxed: {
    id: "boxed", label: "Boxed",
    fill: "#ffffff", stroke: null, box: "rgba(0,0,0,0.6)",
    dt: (bw, fs) => `fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=${Math.max(3, Math.round(fs * 0.16))}`,
  },
  yellow: {
    id: "yellow", label: "Yellow classic",
    fill: "#ffd400", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFFD400:borderw=${bw}:bordercolor=black@0.9`,
  },
  shadow: {
    id: "shadow", label: "Soft shadow",
    fill: "#ffffff", stroke: null, box: null, shadow: "rgba(0,0,0,0.85)",
    dt: (bw, fs) => `fontcolor=white:shadowcolor=black@0.85:shadowx=${Math.max(2, Math.round(fs * 0.05))}:shadowy=${Math.max(2, Math.round(fs * 0.05))}`,
  },
  yellowbox: {
    id: "yellowbox", label: "Yellow box",
    fill: "#ffd400", stroke: null, box: "rgba(0,0,0,0.72)",
    dt: (bw, fs) => `fontcolor=0xFFD400:box=1:boxcolor=black@0.72:boxborderw=${Math.max(3, Math.round(fs * 0.16))}`,
  },
  mint: {
    id: "mint", label: "Mint pop",
    fill: "#4affd0", stroke: "#053b2e", box: null,
    dt: (bw) => `fontcolor=0x4AFFD0:borderw=${bw}:bordercolor=0x053B2E@0.95`,
  },
  pink: {
    id: "pink", label: "Hot pink",
    fill: "#ff4fa3", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=0xFF4FA3:borderw=${bw}:bordercolor=black@0.9`,
  },
  // ---- Karaoke styles: the current word is highlighted as the voiceover reaches
  // it. `karaoke` turns on per-word timing; `fill` is the not-yet-spoken colour,
  // `highlight` is the active word. Burn-in (ffmpeg) shows the plain text.
  karaoke: {
    id: "karaoke", label: "Karaoke (yellow)", karaoke: true,
    fill: "#ffffff", highlight: "#ffd400", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
  karaokeGreen: {
    id: "karaokeGreen", label: "Karaoke (green)", karaoke: true,
    fill: "#ffffff", highlight: "#4affd0", stroke: "#053b2e", box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=0x053B2E@0.95`,
  },
  karaokeBox: {
    id: "karaokeBox", label: "Karaoke (box)", karaoke: true,
    fill: "#ffffff", highlight: "#ffd400", stroke: null, box: "rgba(0,0,0,0.62)", highlightBox: "rgba(0,0,0,0.62)",
    dt: (bw, fs) => `fontcolor=white:box=1:boxcolor=black@0.62:boxborderw=${Math.max(3, Math.round(fs * 0.16))}`,
  },
  // Active word "pops" — scales up with a quick spring, then settles. `anim: "pop"`.
  karaokePop: {
    id: "karaokePop", label: "Karaoke pop", karaoke: true, anim: "pop",
    fill: "#ffffff", highlight: "#ffd400", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
  // Active word gets a rounded highlight pill behind it (TikTok-style). `pill`.
  karaokePill: {
    id: "karaokePill", label: "Karaoke pill", karaoke: true, pill: "#ff2e63",
    fill: "#ffffff", highlight: "#ffffff", stroke: null, box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
  // Words already spoken stay coloured; the rest are dim — a progress "fill".
  karaokeFill: {
    id: "karaokeFill", label: "Karaoke fill", karaoke: true, mode: "fill",
    fill: "rgba(255,255,255,0.45)", highlight: "#ffd400", spoken: "#ffffff", stroke: "#000000", box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
  // Pop + pill combined, bright green — energetic short-form look.
  karaokeHype: {
    id: "karaokeHype", label: "Karaoke hype", karaoke: true, anim: "pop", pill: "#1ed760",
    fill: "#ffffff", highlight: "#0b3d1f", stroke: null, box: null,
    dt: (bw) => `fontcolor=white:borderw=${bw}:bordercolor=black@0.9`,
  },
};
export const CAPTION_STYLE_LIST = Object.keys(CAPTION_STYLES).map((id) => CAPTION_STYLES[id]);

export const CAPTION_SIZES = { sm: 0.042, md: 0.052, lg: 0.064 };
export const CAPTION_FONT = "caption.ttf";          // path in the ffmpeg FS
export const captionCueFile = (i) => `cap${i}.txt`;  // per-cue textfile in the FS

// Font choices for captions. `css` is the CSS font-family stack used by the
// canvas preview + WebCodecs render; `weight` is the numeric font-weight. The
// bundled "CaptionFont" is the default (and the one ffmpeg burns in); the others
// are widely-available system font stacks so no extra files are needed.
export const CAPTION_FONTS = {
  default:   { id: "default",   label: "Default",     css: '"CaptionFont", system-ui, sans-serif', weight: 700 },
  sans:      { id: "sans",      label: "Clean sans",  css: 'Arial, Helvetica, system-ui, sans-serif', weight: 700 },
  condensed: { id: "condensed", label: "Impact",      css: '"Arial Narrow", "Impact", system-ui, sans-serif', weight: 700 },
  serif:     { id: "serif",     label: "Serif",       css: 'Georgia, "Times New Roman", serif', weight: 700 },
  mono:      { id: "mono",      label: "Monospace",   css: '"Courier New", ui-monospace, monospace', weight: 700 },
  rounded:   { id: "rounded",   label: "Rounded",     css: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif', weight: 800 },
};
export const CAPTION_FONT_LIST = Object.keys(CAPTION_FONTS).map((id) => CAPTION_FONTS[id]);

// Caption entrance animations — how each caption appears on screen.
export const CAPTION_ANIMS = {
  none:      { id: "none",      label: "None" },
  fade:      { id: "fade",      label: "Fade in" },
  slideup:   { id: "slideup",   label: "Slide up" },
  slidedown: { id: "slidedown", label: "Slide down" },
  pop:       { id: "pop",       label: "Pop" },
};
export const CAPTION_ANIM_LIST = Object.keys(CAPTION_ANIMS).map((id) => CAPTION_ANIMS[id]);
export const CAPTION_ANIM_DURATION = 0.35; // seconds the entrance takes

// How far into its entrance a cue is at time t: 0 at the cue start, 1 once the
// CAPTION_ANIM_DURATION window has passed (clamped). Used to drive drawCaption's
// `appear` param.
export function appearProgress(cue, t, dur = CAPTION_ANIM_DURATION) {
  if (!cue || !(dur > 0)) return 1;
  return Math.max(0, Math.min(1, (t - cue.start) / dur));
}
export function captionFontCss(fontId) {
  return (CAPTION_FONTS[fontId] || CAPTION_FONTS.default).css;
}
export function captionFontWeight(fontId) {
  return (CAPTION_FONTS[fontId] || CAPTION_FONTS.default).weight;
}

export function captionFontPx(height, sizeId, customScale) {
  const frac = customScale > 0 ? customScale : (CAPTION_SIZES[sizeId] || CAPTION_SIZES.md);
  return Math.round(height * frac);
}

const MAX_LINE = 42;       // chars before wrapping to a second line
const MAX_CUE_CHARS = 84;  // chars before starting a new caption cue
const MARGIN_FACTOR = 0.07;

// ---- timestamp helpers ----
function hms(str) {
  const m = String(str).match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/);
  if (!m) return null;
  const h = +(m[1] || 0), mi = +m[2], se = +m[3];
  const ms = m[4] ? +m[4].padEnd(3, "0") : 0;
  return h * 3600 + mi * 60 + se + ms / 1000;
}

// SRT / VTT — cues carry explicit start AND end.
function parseArrow(text) {
  const out = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim())
      .filter((l) => l && l !== "WEBVTT" && !/^\d+$/.test(l));
    const tl = lines.find((l) => l.includes("-->"));
    if (!tl) continue;
    const ts = tl.match(/(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?/g);
    if (!ts || ts.length < 2) continue;
    const txt = lines.filter((l) => l !== tl).join(" ").trim();
    if (txt) out.push({ start: hms(ts[0]), end: hms(ts[1]), text: txt });
  }
  return out;
}

// NoteGPT-style range blocks: "HH:MM:SS - HH:MM:SS" then a paragraph.
function parseRanges(text) {
  const re = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[-–—]\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*$/;
  const out = [];
  let cur = null;
  for (const ln of text.split("\n")) {
    const m = ln.match(re);
    if (m) {
      if (cur && cur.text.trim()) out.push(cur);
      cur = { start: hms(m[1]), end: hms(m[2]), text: "" };
    } else if (cur) {
      const t = ln.trim();
      if (t) cur.text += (cur.text ? " " : "") + t;
    }
  }
  if (cur && cur.text.trim()) out.push(cur);
  return out;
}

// Inline markers anywhere in the text: "(0:03) text ... (0:20) more".
// Each marker owns the text up to the next marker, across line breaks.
function parseMarkers(text) {
  const re = /[([]\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\s*[)\]]/g;
  const marks = [];
  let m;
  while ((m = re.exec(text))) marks.push({ start: hms(m[1]), from: re.lastIndex, at: m.index });
  const out = [];
  for (let i = 0; i < marks.length; i++) {
    const to = i + 1 < marks.length ? marks[i + 1].at : text.length;
    const txt = text.slice(marks[i].from, to).replace(/\s+/g, " ").trim();
    if (txt) out.push({ start: marks[i].start, end: null, text: txt });
  }
  return out;
}

// Inline: "[0:03] text" or "0:03 text" per line.
function parseInline(text) {
  const re = /^\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]?\s+(.*\S)\s*$/;
  const out = [];
  for (const ln of text.split("\n")) {
    const m = ln.match(re);
    if (m) out.push({ start: hms(m[1]), end: null, text: m[2].trim() });
  }
  return out;
}

// Wrap a caption string onto (at most) two balanced lines.
function wrap(str) {
  if (str.length <= MAX_LINE) return str;
  const words = str.split(" ");
  const half = str.length / 2;
  let a = "", b = "";
  for (const w of words) {
    if (!b && a.length + w.length <= half) a = a ? `${a} ${w}` : w;
    else b = b ? `${b} ${w}` : w;
  }
  return b ? `${a}\n${b}` : a;
}

// Reflow a caption into balanced lines that each fit the frame WIDTH at the given
// font size. Unlike the fixed-char wrap() used at parse time, this is width-aware,
// so 9:16 (portrait) captions don't overflow the sides. It's resolution-
// independent: W and fontPx scale together, so preview (full res) and render
// (e.g. 720p) wrap the same way = WYSIWYG.
export function captionMaxChars(W, fontPx) {
  return Math.max(8, Math.floor((W * 0.90) / (fontPx * 0.58)));
}
export function wrapToWidth(text, maxChars) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  // Greedy fill: every line is guaranteed to stay within maxChars (except a lone
  // word longer than a line), so nothing ever overflows the frame width.
  const words = clean.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cur && cand.length > maxChars) { lines.push(cur); cur = w; }
    else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Split one timed segment into caption cues, timed proportionally to length.
function chunkSegment(seg, cues) {
  const words = seg.text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return;
  const chunks = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > MAX_CUE_CHARS && cur) { chunks.push(cur); cur = w; }
    else cur = cand;
    if (/[.!?]["')]?$/.test(w) && cur.length >= MAX_CUE_CHARS * 0.5) { chunks.push(cur); cur = ""; }
  }
  if (cur) chunks.push(cur);

  const totalChars = chunks.reduce((a, c) => a + c.length, 0) || 1;
  const span = Math.max(0.2, seg.end - seg.start);
  let t = seg.start;
  for (const c of chunks) {
    const d = span * (c.length / totalChars);
    const end = c === chunks[chunks.length - 1] ? seg.end : t + d;
    cues.push({ start: t, end, text: wrap(c) });
    t = end;
  }
}

// Parse raw transcript text into caption cues. `duration` (audio length) is used
// only to close the final segment. Returns { cues, error }.
export function parseTranscript(raw, duration = 0) {
  if (!raw || !raw.trim()) return { cues: [], error: "The file is empty." };
  const text = raw.replace(/\r/g, "");

  let segs = text.includes("-->") ? parseArrow(text) : parseRanges(text);
  if (!segs.length) segs = parseMarkers(text);
  if (!segs.length) segs = parseInline(text);
  segs = segs.filter((s) => s.start != null && s.text);
  if (!segs.length) {
    return { cues: [], error: "No timestamps found — use an SRT/VTT or a timestamped transcript." };
  }

  segs.sort((a, b) => a.start - b.start);
  for (let i = 0; i < segs.length; i++) {
    const nextStart = i + 1 < segs.length
      ? segs[i + 1].start
      : (duration || segs[i].start + segs[i].text.split(/\s+/).length / 2.5);
    let end = segs[i].end != null ? Math.min(segs[i].end, nextStart) : nextStart;
    if (!(end > segs[i].start)) end = Math.max(nextStart, segs[i].start + 0.4);
    segs[i].end = end;
  }

  const cues = [];
  for (const s of segs) chunkSegment(s, cues);
  return { cues, error: cues.length ? null : "Could not build any caption lines." };
}

// For karaoke: which cue is showing at time t, and how far through it we are.
// Returns { text, start, end, progress } or null. `progress` is 0..1 across the
// cue's duration, used to pick the "current" word.
export function activeCue(cues, t) {
  if (!cues) return null;
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (t >= c.start && t < c.end) {
      const dur = Math.max(1e-3, c.end - c.start);
      return { text: c.text, start: c.start, end: c.end, progress: (t - c.start) / dur };
    }
  }
  return null;
}

// Index of the word being spoken at fractional progress `p` (0..1) for a caption
// with `n` words — time is split evenly across the words. Clamped to [0, n-1].
export function wordIndexAt(n, p) {
  if (n <= 0) return -1;
  return Math.max(0, Math.min(n - 1, Math.floor(p * n)));
}

// Progress 0..1 *within* the currently-spoken word (for pop/bounce animation).
// e.g. n=4, p=0.30 → word 1, and 0.20 of the way through it.
export function wordFractionAt(n, p) {
  if (n <= 0) return 0;
  const scaled = Math.max(0, Math.min(0.999999, p)) * n;
  return scaled - Math.floor(scaled);
}

// Current caption text for time t (empty string if none).
export function captionAt(cues, t) {
  if (!cues) return "";
  for (let i = 0; i < cues.length; i++) {
    if (t >= cues[i].start && t < cues[i].end) return cues[i].text;
  }
  return "";
}

// Line-height factor (top-to-top). Boxed captions need extra spacing so the
// per-line background boxes keep a visible gap instead of touching/overlapping.
const lineHeightFactor = (st) => (st && st.box ? 1.5 : 1.16);
// The default line spacing for a style (what the UI slider starts at).
export function captionLineHeightDefault(styleId) {
  return lineHeightFactor(CAPTION_STYLES[styleId] || CAPTION_STYLES.classic);
}

// Vertical slot (top y) for line i of an n-line caption, bottom-anchored.
const lineTop = (H, fontPx, n, i, lhf = 1.16) =>
  Math.round(H - H * MARGIN_FACTOR - (n - i) * fontPx * lhf);

// ---- preview: draw the current caption onto the canvas ----
// Every line is centered individually (and boxed individually for the boxed
// style) so the preview matches the per-line drawtext burn-in exactly.
export function drawCaption(ctx, text, W, H, styleId, fontPx, lineHeight, fontId = "default", activeWord = -1, wordFrac = 0, animIn = "none", appear = 1) {
  if (!text) return;
  const st = CAPTION_STYLES[styleId] || CAPTION_STYLES.classic;
  const lines = wrapToWidth(text, captionMaxChars(W, fontPx));
  const n = lines.length;
  const lhf = lineHeight > 0 ? lineHeight : lineHeightFactor(st);
  const fontCss = captionFontCss(fontId);
  const fontWeight = captionFontWeight(fontId);
  const karaoke = !!st.karaoke && activeWord >= 0;

  ctx.save();
  ctx.font = `${fontWeight} ${fontPx}px ${fontCss}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Entrance animation: transform the WHOLE caption block for its first moments on
  // screen. `appear` is 0..1 across the entrance window (1 = fully settled). Applied
  // once here so it composes with per-word karaoke effects drawn inside.
  if (animIn && animIn !== "none" && appear < 1) {
    const a = 1 - Math.pow(1 - Math.max(0, Math.min(1, appear)), 3); // easeOutCubic
    ctx.globalAlpha = a;
    const topFirst = lineTop(H, fontPx, n, 0, lhf);
    const baseLast = lineTop(H, fontPx, n, n - 1, lhf) + fontPx;
    const pivotY = (topFirst + baseLast) / 2;
    if (animIn === "slideup") {
      ctx.translate(0, (1 - a) * fontPx * 0.9);
    } else if (animIn === "slidedown") {
      ctx.translate(0, -(1 - a) * fontPx * 0.9);
    } else if (animIn === "pop") {
      const s = 0.7 + 0.3 * a;
      ctx.translate(W / 2, pivotY); ctx.scale(s, s); ctx.translate(-W / 2, -pivotY);
    }
    // "fade" uses globalAlpha alone.
  }

  // Paint one glyph run (stroke + shadow + fill) centred at cx with a given colour.
  const paintText = (str, cx, base, fillColor) => {
    if (st.stroke) {
      ctx.lineJoin = "round"; ctx.miterLimit = 2;
      ctx.lineWidth = Math.max(2, fontPx / 7);
      ctx.strokeStyle = st.stroke;
      ctx.strokeText(str, cx, base);
    }
    if (st.shadow) {
      ctx.save();
      ctx.shadowColor = st.shadow; ctx.shadowBlur = fontPx * 0.14;
      ctx.shadowOffsetX = Math.max(2, fontPx * 0.05); ctx.shadowOffsetY = Math.max(2, fontPx * 0.05);
      ctx.fillStyle = fillColor; ctx.fillText(str, cx, base);
      ctx.restore();
    }
    ctx.fillStyle = fillColor;
    ctx.fillText(str, cx, base);
  };

  let wordCursor = 0; // running word index across all lines (for karaoke)
  for (let i = 0; i < n; i++) {
    const ln = lines[i];
    const top = lineTop(H, fontPx, n, i, lhf);
    const base = top + fontPx * 0.82;
    if (st.box) {
      const w = ctx.measureText(ln).width;
      const padX = fontPx * 0.38, padY = fontPx * 0.12;
      const boxTop = base - fontPx * 0.78 - padY;
      const boxH = fontPx * 0.98 + padY * 2;
      ctx.fillStyle = st.box;
      ctx.fillRect((W - w) / 2 - padX, boxTop, w + padX * 2, boxH);
    }

    if (!karaoke) {
      paintText(ln, W / 2, base, st.fill);
      continue;
    }

    // Karaoke: draw words individually so the current one uses the highlight colour.
    // Words are laid out left-to-right, centred as a whole line (a leading space is
    // measured between words to keep spacing identical to the plain line).
    const words = ln.split(" ");
    const spaceW = ctx.measureText(" ").width;
    const widths = words.map((w) => ctx.measureText(w).width);
    const lineW = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
    let x = (W - lineW) / 2;
    ctx.save();
    ctx.textAlign = "left";
    // "pop" spring: fast up (over the first ~35% of the word) then ease back to 1.
    const popScale = (f) => {
      const peak = 1.28;
      if (f < 0.35) return 1 + (peak - 1) * (f / 0.35);
      return peak - (peak - 1) * ((f - 0.35) / 0.65);
    };
    for (let wi = 0; wi < words.length; wi++) {
      const gi = wordCursor + wi;
      const isActive = gi === activeWord;
      const isSpoken = gi < activeWord;
      // Colour: "fill" mode keeps spoken words bright; otherwise only the active word.
      let color = st.fill;
      if (isActive) color = st.highlight || st.fill;
      else if (isSpoken && st.mode === "fill") color = st.spoken || st.fill;
      const w = widths[wi];
      const cx = x + w / 2; // word centre, for scaling about the middle

      // Rounded highlight pill behind the active word (TikTok style).
      if (isActive && st.pill) {
        const padX = fontPx * 0.22, padY = fontPx * 0.14;
        const pillTop = base - fontPx * 0.80 - padY;
        const pillH = fontPx * 1.00 + padY * 2;
        const r = pillH / 2;
        const px = x - padX, pw = w + padX * 2;
        ctx.save();
        ctx.fillStyle = st.pill;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px, pillTop, pw, pillH, r); ctx.fill(); }
        else ctx.fillRect(px, pillTop, pw, pillH);
        ctx.restore();
      }

      if (isActive && st.anim === "pop") {
        const s = popScale(Math.max(0, Math.min(1, wordFrac)));
        ctx.save();
        ctx.textAlign = "center";     // draw about the translated centre point
        ctx.translate(cx, base);
        ctx.scale(s, s);
        paintText(words[wi], 0, 0, color);
        ctx.restore();
      } else {
        paintText(words[wi], x, base, color);
      }
      x += w + spaceW;
    }
    ctx.restore();
    wordCursor += words.length;
  }
  ctx.restore();
}

// ---- render: one centered drawtext per LINE (so each line is centered) ----
// Returns the filter chain plus the per-line textfiles to write into the FS.
export function buildCaptionBurn(cues, styleId, width, height, sizeId, lineHeight, fontScale) {
  const st = CAPTION_STYLES[styleId] || CAPTION_STYLES.classic;
  const fs = captionFontPx(height, sizeId, fontScale);
  const bw = Math.max(2, Math.round(fs / 9));
  const lhf = lineHeight > 0 ? lineHeight : lineHeightFactor(st);
  const files = [];
  const filters = [];
  let li = 0;
  for (const c of cues) {
    const lines = wrapToWidth(c.text, captionMaxChars(width, fs));
    const n = lines.length;
    const s = c.start.toFixed(3), e = c.end.toFixed(3);
    for (let i = 0; i < n; i++) {
      const name = captionCueFile(li++);
      files.push({ name, text: sanitizeCueText(lines[i]) });
      const y = lineTop(height, fs, n, i, lhf);
      filters.push(
        `drawtext=fontfile=${CAPTION_FONT}:textfile=${name}:${st.dt(bw, fs)}` +
        `:fontsize=${fs}:x=(w-text_w)/2:y=${y}:enable=between(t\\,${s}\\,${e})`
      );
    }
  }
  return { filter: filters.join(","), files };
}

// drawtext reads textfiles literally; strip chars its expander would choke on.
export function sanitizeCueText(text) {
  return String(text).replace(/\\/g, "").replace(/%/g, "percent");
}
