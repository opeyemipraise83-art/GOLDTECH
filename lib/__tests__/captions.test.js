import { describe, it, expect } from "vitest";
import { parseTranscript, captionAt } from "../captions";

describe("parseTranscript", () => {
  it("parses SRT with explicit start/end", () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Hello there

2
00:00:02,000 --> 00:00:05,000
General Kenobi`;
    const { cues, error } = parseTranscript(srt, 5);
    expect(error).toBeNull();
    expect(cues.length).toBeGreaterThanOrEqual(2);
    expect(cues[0].start).toBe(0);
    expect(captionAt(cues, 0.5)).toMatch(/Hello/);
    expect(captionAt(cues, 3)).toMatch(/Kenobi/);
  });

  it("parses NoteGPT range blocks and clamps end to the next block's start", () => {
    const t = `00:00:00 - 00:01:15
First line of narration here.

00:00:38 - 00:01:54
Second part of the narration continues.`;
    const { cues } = parseTranscript(t, 120);
    expect(cues.length).toBeGreaterThan(0);
    // First block's cues must not run past the second block's start (38s).
    const firstBlock = cues.filter((c) => c.start < 38);
    for (const c of firstBlock) expect(c.end).toBeLessThanOrEqual(38 + 0.001);
  });

  it("parses inline (m:ss) markers, including several per line", () => {
    const t = `(0:00) There was one quiet morning in a small mountain village. (0:03) A young man sat by his window.
(0:09) An old farmer passed by. (0:13) I have so little, he said.`;
    const { cues, error } = parseTranscript(t, 20);
    expect(error).toBeNull();
    expect(cues.length).toBeGreaterThanOrEqual(4);
    expect(cues[0].start).toBe(0);
    expect(captionAt(cues, 4)).toMatch(/young man/);
    expect(captionAt(cues, 10)).toMatch(/farmer/);
    expect(captionAt(cues, 14)).toMatch(/so little/);
  });

  it("parses inline [mm:ss] lines", () => {
    const t = `[0:00] one two three
[0:04] four five six`;
    const { cues, error } = parseTranscript(t, 8);
    expect(error).toBeNull();
    expect(cues[0].start).toBe(0);
    expect(captionAt(cues, 5)).toMatch(/four/);
  });

  it("splits a long segment into multiple shorter cues", () => {
    const long = Array(40).fill("word").join(" ");
    const { cues } = parseTranscript(`[0:00] ${long}`, 20);
    expect(cues.length).toBeGreaterThan(1);
    // cues are ordered and non-overlapping
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i].start).toBeGreaterThanOrEqual(cues[i - 1].start);
    }
  });

  it("reports an error when there are no timestamps", () => {
    const { cues, error } = parseTranscript("just some plain text with no times", 10);
    expect(cues.length).toBe(0);
    expect(error).toBeTruthy();
  });

  it("returns empty text when nothing is showing", () => {
    const { cues } = parseTranscript(`[0:05] later line`, 10);
    expect(captionAt(cues, 0)).toBe("");
  });
});

import { CAPTION_STYLES, CAPTION_STYLE_LIST } from "../captions";

describe("caption styles", () => {
  it("includes the newly added styles", () => {
    for (const id of ["shadow", "yellowbox", "mint", "pink"]) {
      expect(CAPTION_STYLES[id]).toBeTruthy();
    }
  });

  it("every style has a label, a fill colour, and a working dt() burn builder", () => {
    for (const st of CAPTION_STYLE_LIST) {
      expect(typeof st.label).toBe("string");
      // fill is any valid CSS canvas colour (hex or rgba()).
      expect(typeof st.fill).toBe("string");
      expect(st.fill.length).toBeGreaterThan(0);
      const dt = st.dt(3, 48);
      expect(typeof dt).toBe("string");
      expect(dt).toContain("fontcolor=");
    }
  });
});

import { CAPTION_FONTS, CAPTION_FONT_LIST, captionFontCss, activeCue, wordIndexAt } from "../captions";

describe("caption fonts", () => {
  it("exposes a non-empty font list, each with a css stack", () => {
    expect(CAPTION_FONT_LIST.length).toBeGreaterThanOrEqual(4);
    for (const f of CAPTION_FONT_LIST) {
      expect(typeof f.label).toBe("string");
      expect(typeof f.css).toBe("string");
      expect(f.css.length).toBeGreaterThan(0);
    }
  });
  it("captionFontCss falls back to default for unknown ids", () => {
    expect(captionFontCss("nope")).toBe(CAPTION_FONTS.default.css);
  });
});

describe("karaoke word timing", () => {
  it("wordIndexAt splits time evenly across words", () => {
    expect(wordIndexAt(4, 0)).toBe(0);
    expect(wordIndexAt(4, 0.26)).toBe(1);
    expect(wordIndexAt(4, 0.5)).toBe(2);
    expect(wordIndexAt(4, 0.99)).toBe(3);
  });
  it("wordIndexAt clamps to valid range", () => {
    expect(wordIndexAt(0, 0.5)).toBe(-1);
    expect(wordIndexAt(3, 1.5)).toBe(2);
  });
  it("activeCue returns progress within the current cue", () => {
    const cues = [{ start: 0, end: 4, text: "hello there" }, { start: 4, end: 8, text: "general kenobi" }];
    expect(activeCue(cues, 2).text).toBe("hello there");
    expect(activeCue(cues, 2).progress).toBeCloseTo(0.5, 5);
    expect(activeCue(cues, 6).text).toBe("general kenobi");
    expect(activeCue(cues, 99)).toBeNull();
  });
});

import { wordFractionAt, CAPTION_STYLES } from "../captions";

describe("karaoke animation styles", () => {
  it("wordFractionAt gives progress within the active word", () => {
    expect(wordFractionAt(4, 0)).toBeCloseTo(0, 5);
    expect(wordFractionAt(4, 0.125)).toBeCloseTo(0.5, 5); // half through word 0
    expect(wordFractionAt(0, 0.5)).toBe(0);
  });
  it("exposes the new animated karaoke styles, all flagged karaoke", () => {
    for (const id of ["karaokePop", "karaokePill", "karaokeFill", "karaokeHype"]) {
      expect(CAPTION_STYLES[id]).toBeTruthy();
      expect(CAPTION_STYLES[id].karaoke).toBe(true);
    }
  });
});
