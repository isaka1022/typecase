/**
 * How the measurement engine finds the things it measures.
 *
 * The specimen labels its own parts, which is exact but only works on a page
 * this project built. Pointing the same rules at an article somebody else wrote
 * means recovering the same parts from ordinary HTML, and the only difference
 * that should exist between the two is this file.
 */
export interface DocumentAdapter {
  /** Running text. Order matters: the first two decide the paragraph gap. */
  paragraphs(root: HTMLElement): HTMLElement[];
  /** A heading to read the space above and below from. */
  headings(root: HTMLElement): HTMLElement[];
  /** Every distinct typographic level present, named for the reader. */
  levels(root: HTMLElement): Array<{ level: string; el: HTMLElement }>;
}

export const specimenAdapter: DocumentAdapter = {
  paragraphs: (root) => Array.from(root.querySelectorAll<HTMLElement>("[data-measure='paragraph']")),
  headings: (root) => Array.from(root.querySelectorAll<HTMLElement>("[data-measure='heading']")),
  levels: (root) =>
    Array.from(root.querySelectorAll<HTMLElement>("[data-level]")).flatMap((el) => {
      const level = el.dataset["level"];
      return level ? [{ level, el }] : [];
    }),
};

/** Text short enough to be a caption, a byline or a nav item is not running
 * text, and letting it into the sample drags every average toward nonsense. */
const MIN_PARAGRAPH_CHARS = 40;

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * The reading column of an arbitrary page. `<article>` is the strongest signal
 * and `<main>` the next; falling back to the body is a last resort that usually
 * still works because the paragraph filter below throws out the furniture.
 */
export function findReadingRoot(doc: Document = document): HTMLElement | null {
  const candidates = [
    ...Array.from(doc.querySelectorAll<HTMLElement>("article")),
    ...Array.from(doc.querySelectorAll<HTMLElement>("main, [role='main']")),
    doc.body,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (genericAdapter.paragraphs(candidate).length >= 2) return candidate;
  }
  return doc.body ?? null;
}

export const genericAdapter: DocumentAdapter = {
  paragraphs: (root) =>
    Array.from(root.querySelectorAll<HTMLElement>("p")).filter(
      (p) =>
        (p.textContent ?? "").trim().length >= MIN_PARAGRAPH_CHARS &&
        // A paragraph wrapping another block is a layout device, not a column.
        !p.querySelector("p, ul, ol, table, figure") &&
        isVisible(p),
    ),
  headings: (root) =>
    Array.from(root.querySelectorAll<HTMLElement>("h2, h3, h1, h4")).filter(
      (h) => (h.textContent ?? "").trim().length > 0 && isVisible(h),
    ),
  levels: (root) => {
    const out: Array<{ level: string; el: HTMLElement }> = [];
    for (const tag of ["h1", "h2", "h3", "h4"]) {
      const el = Array.from(root.querySelectorAll<HTMLElement>(tag)).find(
        (candidate) => (candidate.textContent ?? "").trim().length > 0 && isVisible(candidate),
      );
      if (el) out.push({ level: tag, el });
    }
    const body = genericAdapter.paragraphs(root)[0];
    if (body) out.push({ level: "body", el: body });
    return out;
  },
};
