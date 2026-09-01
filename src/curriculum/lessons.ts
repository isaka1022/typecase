import { RULES } from "../typography/rules";

export interface Lesson {
  number: number;
  title: string;
  /** What this lesson is about, in the reader's terms rather than the rules'. */
  premise: string;
  /** What to ask the agent for, so a first-time reader knows where to start. */
  prompt: string;
}

export const LESSONS: Lesson[] = [
  {
    number: 1,
    title: "Make it readable",
    premise:
      "Before anything else a page has to be comfortable to read. Three things decide that: how long the lines are, how much air sits between them, and how dark the ink is. They are not independent — change one and the other two need to move.",
    prompt: "Ask your agent to diagnose the page and fix the worst problem it finds.",
  },
  {
    number: 2,
    title: "Build a hierarchy",
    premise:
      "A reader should be able to see the structure of a page before reading a word of it. The levels need enough size difference to separate at a glance, one ratio to keep those sizes coherent, and a second cue such as family or weight so size is not doing all the work.",
    prompt: "Ask your agent whether the hierarchy works as a system, not just as a list of sizes.",
  },
  {
    number: 3,
    title: "Set the spacing",
    premise:
      "Almost everything left is a decision about space. A heading belongs to the text beneath it, so it needs more room above than below. Paragraphs need either a visible gap or a first-line indent — one signal, not both — and short final lines should not leave holes in the column.",
    prompt: "Ask your agent to diagnose the spacing, then hand you the weakest control.",
  },
];

export function lessonFor(number: number): Lesson {
  return LESSONS[number - 1] ?? LESSONS[0]!;
}

export function lessonRuleCount(number: number): number {
  return RULES.filter((rule) => rule.lesson === number).length;
}
