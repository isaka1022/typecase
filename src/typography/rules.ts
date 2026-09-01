import type { NumericControl } from "./spec";

export type Severity = "ok" | "warn" | "error";

export interface Rule {
  id: string;
  lesson: number;
  title: string;
  target: string;
  /** Why it matters. Kept short enough to read aloud while the fix happens. */
  why: string;
  source: string;
  control?: NumericControl;
  /** Extra controls taught by the rule without changing its challenge control. */
  relatedControls?: NumericControl[];
}

export const RULES: Rule[] = [
  {
    id: "measure",
    lesson: 1,
    title: "Measure",
    target: "45–75 characters per line",
    why: "The eye loses its place on the return sweep when a line runs long, and a line that is too short breaks the reading rhythm. 66 characters is the classic target for a single column.",
    source: "Bringhurst, The Elements of Typographic Style",
    control: "measureTarget",
  },
  {
    id: "leading",
    lesson: 1,
    title: "Line spacing",
    target: "1.4×–1.7× the body size",
    why: "Line spacing has to grow with the measure. Long lines need more space between them so the eye can find the start of the next one; tight spacing on a long measure is the most common cause of text that feels heavy. This is the one rule here that does not take a fixed number from its sources: WCAG asks for a flat 1.5\u00d7 and this page asks for 1.4\u00d7 to 1.7\u00d7 depending on how long the lines are. The band is deliberate — a short measure does not need the air a long one does — but it means a narrow column can pass here at 1.4\u00d7 and still fall short of WCAG 1.4.8.",
    source: "Butterick, Practical Typography; band checked against WCAG 2.1 success criterion 1.4.8",
    control: "lineHeight",
  },
  {
    id: "contrast",
    lesson: 1,
    title: "Contrast",
    target: "at least 4.5:1 against the paper",
    why: "Grey body text looks refined on a designer's monitor and disappears on everyone else's. 4.5:1 is the accessibility floor for text at normal sizes, not an aspiration.",
    source: "WCAG 2.1 AA, success criterion 1.4.3",
    control: "inkLightness",
  },
  {
    id: "scale-distinction",
    lesson: 2,
    title: "Level distinction",
    target: "adjacent levels differ by at least 15%",
    why: "If two heading levels are nearly the same size the hierarchy exists in the stylesheet but not in the reader's eye. A ratio too close to 1 produces a page with no visible structure.",
    source: "Tufte, and standard practice",
    control: "scaleRatio",
  },
  {
    id: "scale-coherence",
    lesson: 2,
    title: "Scale coherence",
    target: "each level resolves to the same ratio",
    why: "A scale is a system, not a list of plausible sizes. When each level implies a different ratio, small changes accumulate and the hierarchy loses the rhythm that made it useful.",
    source: "Bringhurst, The Elements of Typographic Style, section 8.6.1 (modular scales)",
    control: "scaleRatio",
  },
  {
    id: "secondary-cue",
    lesson: 2,
    title: "Secondary cue",
    target: "headings differ from body text in family or by at least one weight step",
    why: "Size should not carry the whole hierarchy. A change of family or weight keeps headings recognisable when the size difference is subtle or the page is scanned quickly.",
    source: "CSS Fonts Module Level 4; Gestalt similarity",
    control: "headingWeight",
  },
  {
    id: "heading-proximity",
    lesson: 3,
    title: "Heading proximity",
    target: "more space above a heading than below it",
    why: "A heading belongs to the text that follows it. When the space below is larger, the heading visually attaches to the preceding section and the structure reads backwards.",
    source: "Gestalt proximity; Williams, The Non-Designer's Design Book",
    control: "headingSpaceBefore",
  },
  {
    id: "paragraph-rhythm",
    lesson: 3,
    title: "Paragraph separation",
    target: "either space between paragraphs or a first-line indent — not both",
    why: "Paragraphs need one signal of separation. With no space and no indent the text becomes an undifferentiated block; with both it is over-signalled.",
    source: "Butterick, Practical Typography",
    control: "paragraphSpacing",
    relatedControls: ["paragraphIndent"],
  },
  {
    id: "widows",
    lesson: 3,
    title: "Widows",
    target: "no paragraph ending in a single word",
    why: "A lone word on the final line reads as a mistake and leaves a hole in the column. It is fixed by adjusting the measure, not by editing the writing.",
    source: "Standard typesetting practice",
    control: "measureTarget",
  },
];

export const RULES_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));

export function rulesForLessons(unlocked: number): Rule[] {
  return RULES.filter((rule) => rule.lesson <= unlocked);
}
