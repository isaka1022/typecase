/**
 * The specimen text. Real prose rather than filler: the rules being taught are
 * about how text behaves when someone is actually reading it, and greeked text
 * hides exactly the problems the lessons are about.
 */
export interface Block {
  kind: "heading" | "subheading" | "paragraph";
  text: string;
}

export const ARTICLE_TITLE = "This page is set badly on purpose";

export const ARTICLE: Block[] = [
  {
    kind: "paragraph",
    text: "Your agent can read this page through the tools it declares: it can measure what is actually on screen, tell you which typographic rules the page fails and why, change a setting to show you the fix, and then hand a control to you and step back until you have made the correction yourself. Everything it does appears in the panel beside you, with its reasoning. The panel is not a chat log — it is a record of what changed on this page.",
  },
  {
    kind: "paragraph",
    text: "Start by asking your agent to diagnose the page. Or move the sliders yourself and watch the measurements respond. When the rules of a lesson are satisfied, the next lesson opens and more controls appear. When you would rather work on something of your own, paste your writing in and the same measurements will apply to it; the CSS you end up with is yours to take away.",
  },
  {
    kind: "subheading",
    text: "The space between words",
  },
  {
    kind: "paragraph",
    text: "For most of the history of writing there were no spaces between words. Greek and Latin were written in a continuous stream of letters, and a reader met the page the way we meet speech: as an unbroken run of sound that has to be parsed before it can be understood. Reading was performed aloud, slowly, and usually by someone trained to do it.",
  },
  {
    kind: "subheading",
    text: "An invention that looks like nothing",
  },
  {
    kind: "paragraph",
    text: "The word space arrived late, in Irish and English monasteries around the seventh century. Scribes working in Latin, a language they had learned rather than spoken from birth, could not lean on familiarity to find the boundaries between words. So they put the boundaries in. Within a few centuries the practice had spread across Europe, and with it came something new: silent reading, and the possibility of reading quickly.",
  },
  {
    kind: "paragraph",
    text: "It is worth sitting with how strange this is. The most consequential typographic invention of the last two thousand years is an absence. It has no shape, no colour, and no weight. You cannot point at it in a specimen book. Its only property is size, and getting that size wrong is enough to make a page unreadable.",
  },
  {
    kind: "subheading",
    text: "Everything since is the same argument",
  },
  {
    kind: "paragraph",
    text: "Almost every decision in typesetting turns out to be a decision about space. How much sits between two letters, between two lines, between a heading and the paragraph it introduces. Type designers spend far longer on the gaps than on the letterforms, because the gaps are what the eye actually reads. A page that feels wrong rarely has bad letters in it. It has bad distances.",
  },
  {
    kind: "paragraph",
    text: "This is why typography resists being learned from rules alone. The rules are real, and they are stated in numbers, but the numbers are relationships rather than constants: the right line spacing depends on the line length, which depends on the size, which depends on how far away the reader is sitting. You learn it by moving one thing and watching what happens to everything else.",
  },
];

export const ARTICLE_STANDFIRST =
  "The lines are too long, the spacing is too tight and the ink is too pale — each of them wrong by an amount you can measure. Fixing it is the exercise.";
