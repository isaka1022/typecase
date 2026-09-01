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
      "A reader should be able to see the structure of a page before reading a word of it. That means the levels have to differ enough to be told apart at a glance, and the sizes have to come from one ratio rather than being picked one at a time.",
    prompt: "Ask your agent why the headings are hard to distinguish from the body.",
  },
  {
    number: 3,
    title: "Set the spacing",
    premise:
      "Almost everything left is a decision about space. A heading belongs to the text beneath it, so it needs more room above than below. Paragraphs need one signal of separation — not two, and not none.",
    prompt: "Ask your agent to fix the heading spacing, then hand you a control.",
  },
];

export function lessonFor(number: number): Lesson {
  return LESSONS[number - 1] ?? LESSONS[0]!;
}

export function lessonRuleCount(number: number): number {
  return RULES.filter((rule) => rule.lesson === number).length;
}
