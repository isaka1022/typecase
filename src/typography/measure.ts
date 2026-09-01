/**
 * Measurements taken from the rendered specimen. Nothing here reads the spec —
 * these are observations of what actually landed on screen, which is what makes
 * the diagnostics trustworthy rather than a restatement of the settings.
 */

import { specimenAdapter, type DocumentAdapter } from "./adapter";
import { readScript, type Script } from "./script";

export interface ParagraphMeasurement {
  lineCount: number;
  charCount: number;
  charsPerLine: number;
  lastLineWordCount: number;
  lastLineFraction: number;
}

export interface LevelSize {
  level: string;
  px: number;
}

/** A last line shorter than this share of the column reads as a stub in text
 * that has no word boundaries to fall on. */
const CJK_WIDOW_FRACTION = 0.12;

export interface SpecimenMeasurement {
  paragraphs: ParagraphMeasurement[];
  /** Which writing system the body text is in. A character count means a
   * different thing in each, so every rule that counts has to be told. */
  script: Script;
  cjkRatio: number;
  mixedScript: boolean;
  /** Body paragraphs actually on the page. Zero means the text-level rules have
   * nothing to judge and must say so rather than reporting zeroes. */
  paragraphCount: number;
  charsPerLine: number;
  computedLineHeight: number;
  computedFontSize: number;
  /** Rendered size of every typographic level present, largest first. */
  levelSizes: LevelSize[];
  headingSpaceBefore: number;
  headingSpaceAfter: number;
  /** Distance between the bottom of one paragraph and the top of the next. */
  paragraphGap: number;
  contrast: number;
  widowCount: number;
}

/** Count rendered line boxes by asking the Range for its client rects. */
function countLines(node: Text): number {
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
  if (rects.length === 0) return 0;
  const tops = new Set(rects.map((r) => Math.round(r.top)));
  return tops.size;
}

function lastLineWords(el: HTMLElement): { words: number; fraction: number } {
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return { words: 0, fraction: 1 };
  const text = node.textContent ?? "";
  const range = document.createRange();
  const rects = (() => {
    range.selectNodeContents(node);
    return Array.from(range.getClientRects()).filter((r) => r.width > 0);
  })();
  if (rects.length === 0) return { words: 0, fraction: 1 };
  const lastTop = Math.round(rects[rects.length - 1]!.top);
  const lastRects = rects.filter((r) => Math.round(r.top) === lastTop);
  const lastWidth = lastRects.reduce((sum, r) => sum + r.width, 0);
  const fullWidth = el.getBoundingClientRect().width || 1;

  // Walk characters to find where the final line starts.
  let startIndex = 0;
  for (let i = 0; i < text.length; i += 1) {
    range.setStart(node, i);
    range.setEnd(node, Math.min(i + 1, text.length));
    const r = range.getBoundingClientRect();
    if (Math.round(r.top) === lastTop) {
      startIndex = i;
      break;
    }
  }
  const tail = text.slice(startIndex).trim();
  const words = tail.length === 0 ? 0 : tail.split(/\s+/).length;
  return { words, fraction: lastWidth / fullWidth };
}

function measureParagraph(el: HTMLElement): ParagraphMeasurement {
  const node = el.firstChild;
  const text = node && node.nodeType === Node.TEXT_NODE ? (node.textContent ?? "") : el.textContent ?? "";
  const lineCount = node && node.nodeType === Node.TEXT_NODE ? countLines(node as Text) : 1;
  const charCount = text.trim().length;
  const { words, fraction } = lastLineWords(el);
  return {
    lineCount,
    charCount,
    charsPerLine: lineCount > 0 ? Math.round(charCount / lineCount) : charCount,
    lastLineWordCount: words,
    lastLineFraction: Number(fraction.toFixed(3)),
  };
}

export type Rgb = readonly [number, number, number];

function srgbChannel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance. Pure, so it can be tested without a document. */
export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** WCAG 2.1 contrast ratio between two resolved colours. */
export function contrastFromRgb(foreground: Rgb, background: Rgb): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

/** A colour with its alpha, because text is routinely set at less than full
 * opacity and the ratio is meaningless until it is composited. */
type Rgba = [number, number, number, number];

let sharedContext: CanvasRenderingContext2D | null | undefined;

/** A 1×1 canvas resolves any colour the browser itself understands — `oklch`,
 * `color-mix`, `lab`, named colours — without this file carrying a parser for
 * each. Real pages use those formats; a regex over `rgb()` silently returns
 * black for them, which reads as a contrast failure that is not there. */
function colorContext(): CanvasRenderingContext2D | null {
  if (sharedContext !== undefined) return sharedContext;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    sharedContext = canvas.getContext("2d", { willReadFrequently: true });
  } catch {
    sharedContext = null;
  }
  return sharedContext;
}

const SIMPLE_RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i;

export function resolveColor(input: string): Rgba {
  const trimmed = input.trim();
  if (trimmed === "transparent") return [0, 0, 0, 0];

  const simple = SIMPLE_RGB.exec(trimmed);
  if (simple) {
    return [Number(simple[1]), Number(simple[2]), Number(simple[3]), simple[4] === undefined ? 1 : Number(simple[4])];
  }

  const ctx = colorContext();
  if (!ctx) return [0, 0, 0, 1];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = trimmed;
  // An unparseable value leaves fillStyle untouched, so it stays the black above.
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const alpha = (a ?? 255) / 255;
  // getImageData returns premultiplied-looking values for translucent fills;
  // undo that so compositing below is done once, against the real backdrop.
  const undo = alpha === 0 ? 0 : 1 / alpha;
  return [
    Math.min(255, Math.round((r ?? 0) * undo)),
    Math.min(255, Math.round((g ?? 0) * undo)),
    Math.min(255, Math.round((b ?? 0) * undo)),
    alpha,
  ];
}

/** Lay a translucent colour over an opaque one. */
export function composite([r, g, b, a]: Rgba, [br, bg, bb]: Rgb): Rgb {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];
}

/** Walk up for the first backdrop that actually paints something. A paragraph
 * almost never carries its own background, so the colour behind the text is
 * an ancestor's. */
export function backdropOf(el: HTMLElement): Rgb {
  let node: HTMLElement | null = el;
  while (node) {
    const resolved = resolveColor(getComputedStyle(node).backgroundColor);
    if (resolved[3] > 0) return composite(resolved, [255, 255, 255]);
    node = node.parentElement;
  }
  return [255, 255, 255];
}

/** Contrast between two CSS colour strings, resolved by the browser. */
export function contrastRatio(foreground: string, background: string): number {
  const back = composite(resolveColor(background), [255, 255, 255]);
  return contrastFromRgb(composite(resolveColor(foreground), back), back);
}

/** The nearest rendered box before or after an element in flow order, climbing
 * out of wrappers so a heading boxed in a <div> still finds its neighbours. */
function flowNeighbour(el: HTMLElement, direction: "prev" | "next", root: HTMLElement): DOMRect | null {
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    let sibling: Element | null =
      direction === "prev" ? node.previousElementSibling : node.nextElementSibling;
    while (sibling) {
      const rect = sibling.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
      sibling = direction === "prev" ? sibling.previousElementSibling : sibling.nextElementSibling;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * The space a reader actually sees around a heading.
 *
 * Reading the heading's own margins is only right on a page that sets them
 * directly. Elsewhere the space is carried by a wrapper, by padding, or by the
 * neighbouring block's margin collapsing into the heading's — so the gap is
 * measured between rendered boxes, the same way the paragraph gap is.
 */
function headingGaps(heading: HTMLElement, root: HTMLElement): { before: number; after: number } {
  const self = heading.getBoundingClientRect();
  const previous = flowNeighbour(heading, "prev", root);
  const next = flowNeighbour(heading, "next", root);
  return {
    before: previous ? Number(Math.max(0, self.top - previous.bottom).toFixed(2)) : 0,
    after: next ? Number(Math.max(0, next.top - self.bottom).toFixed(2)) : 0,
  };
}

export function measureSpecimen(
  root: HTMLElement,
  adapter: DocumentAdapter = specimenAdapter,
): SpecimenMeasurement {
  const paragraphEls = adapter.paragraphs(root);
  const paragraphs = paragraphEls.map(measureParagraph);

  const totalChars = paragraphs.reduce((sum, p) => sum + p.charCount, 0);
  const totalLines = paragraphs.reduce((sum, p) => sum + p.lineCount, 0);

  const firstParagraph = paragraphEls[0];
  const bodyStyle = firstParagraph ? getComputedStyle(firstParagraph) : null;

  const headingEls = adapter.headings(root);
  // A page title has running text only on one side of it, so it says nothing
  // about proximity. The rule is about a heading sitting inside the text.
  const sampleHeading =
    (firstParagraph
      ? headingEls.find(
          (h) =>
            (h.compareDocumentPosition(firstParagraph) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
        )
      : undefined) ?? headingEls[0];
  const headingSpace = sampleHeading
    ? headingGaps(sampleHeading, root)
    : { before: 0, after: 0 };

  // Every level that is actually on the page, measured as rendered.
  const seen = new Map<string, number>();
  for (const { level, el } of adapter.levels(root)) {
    if (seen.has(level)) continue;
    seen.set(level, Number(parseFloat(getComputedStyle(el).fontSize).toFixed(2)));
  }
  const levelSizes: LevelSize[] = [...seen.entries()]
    .map(([level, px]) => ({ level, px }))
    .sort((a, b) => b.px - a.px);

  // The gap the reader actually sees between two paragraphs, rather than the
  // margin that was asked for: collapsing margins mean the two can differ.
  let paragraphGap = 0;
  if (paragraphEls.length >= 2) {
    const first = paragraphEls[0]!.getBoundingClientRect();
    const second = paragraphEls[1]!.getBoundingClientRect();
    paragraphGap = Number(Math.max(0, second.top - first.bottom).toFixed(2));
  }

  const bodyForContrast = firstParagraph ?? root;
  const textStyle = getComputedStyle(bodyForContrast);

  const reading = readScript(paragraphEls.map((el) => el.textContent ?? "").join(" "));

  return {
    paragraphs,
    script: reading.script,
    cjkRatio: reading.cjkRatio,
    mixedScript: reading.mixed,
    paragraphCount: paragraphEls.length,
    charsPerLine: totalLines > 0 ? Math.round(totalChars / totalLines) : 0,
    computedLineHeight: bodyStyle ? Number(parseFloat(bodyStyle.lineHeight).toFixed(2)) : 0,
    computedFontSize: bodyStyle ? Number(parseFloat(bodyStyle.fontSize).toFixed(2)) : 0,
    levelSizes,
    headingSpaceBefore: headingSpace.before,
    headingSpaceAfter: headingSpace.after,
    paragraphGap,
    contrast: (() => {
      const back = backdropOf(bodyForContrast);
      return contrastFromRgb(composite(resolveColor(textStyle.color), back), back);
    })(),
    // Counting words only finds a widow in a script that separates them. A
    // Japanese paragraph is one unbroken run, so every last line would look
    // like a lone word; there the stub is measured as a share of the column.
    widowCount: paragraphs.filter((p) =>
      p.lineCount > 1 &&
      (reading.script === "cjk" ? p.lastLineFraction <= CJK_WIDOW_FRACTION : p.lastLineWordCount === 1),
    ).length,
  };
}
