import type { Block } from "./article";

/**
 * Turn pasted prose into blocks. Deliberately minimal: a line starting with one
 * or more `#` is a heading, blank lines separate paragraphs. Anything richer
 * would be a document format, and the point here is the reader's own words, not
 * a parser.
 */
/**
 * How much of a pasted document is set. Every slider move re-lays-out whatever
 * is on the page, so an unbounded paste makes the controls unusable: measured
 * at 15px, a drag step costs ~14ms at 10 paragraphs, ~54ms at 105 and ~142ms at
 * 366. A specimen is the right unit anyway — you judge a setting from a spread,
 * not from the whole book, and the CSS you leave with applies to all of it.
 */
export const SPECIMEN_BLOCK_LIMIT = 60;

export function parseText(input: string): Block[] {
  const chunks = input
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  return chunks.map((chunk) => {
    const heading = chunk.match(/^#{1,6}\s+(.*)$/s);
    if (heading?.[1]) return { kind: "subheading", text: heading[1].replace(/\s+/g, " ").trim() };
    return { kind: "paragraph", text: chunk.replace(/\s+/g, " ").trim() };
  });
}

export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((block) => (block.kind === "paragraph" ? block.text : `## ${block.text}`))
    .join("\n\n");
}
