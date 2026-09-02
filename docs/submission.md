# Devpost submission — The WebMCP Challenge

Live: https://typecase.vercel.app
Repo: https://github.com/isaka1022/typecase
Video: (pending)

## Elevator pitch

A typesetting studio that teaches by doing. The page declares its controls as
WebMCP tools, an agent demonstrates a fix on the layout you are actually looking
at, and then hands the control back to you.

## What it does

Typecase opens on an article that is set badly on purpose — lines too long,
spacing too tight, ink too pale. Every fault is measurable, and the page
declares eight tools that let an agent measure them, explain them, fix one in
front of you, and then step back.

The lesson loop is the point. The agent diagnoses the page, demonstrates one
fix and says what changed and why, then calls `hand_over_control` to give the
reader a slider — and until the reader meets the target, `set_control` refuses
to touch that control. The agent cannot take the wheel back. Three lessons open
in sequence, and the tool surface grows as they do: `set_control`'s enum only
lists controls whose lesson has started, so `getTools()` at lesson 1 shows a
different set of capabilities than at lesson 3.

## Why WebMCP fits this use case

Ask an assistant how to use a piece of software and it will describe menus that
do not exist. In July 2025 ChatGPT told Soundslice users they could paste ASCII
guitar tabs into the app; the feature was imaginary, and the team shipped it
afterwards because so many people arrived expecting it. Agents that operate a UI
from screenshots do not fare much better — the best systems on OSWorld sit far
below human success rates, because a click that lands one element off cascades
into a misread of the whole screen.

WebMCP removes the guessing on both sides. A page that registers its
capabilities cannot be credited with capabilities it does not have, and an agent
calling a declared tool does not have to find a button.

Teaching is where that matters most. A tutorial that hallucinates a control is
worse than no tutorial, because the learner blames themselves.

## What people and agents can do together here that they could not before

Language is exact about intent and vague about quantity. "A little looser" has
no number in it, and neither does "that heading is fighting the body text" — the
value that settles it is found by moving something and looking, not by naming
it.

Tools that generate interfaces have already reacted to this: Onlook and Figma
Make both pair a prompt with direct manipulation of the result. What none of
them can do is let an agent the vendor did not ship reach the same controls.
Those panels belong to one editor.

WebMCP makes the split a property of the page instead. Typecase declares one set
of controls; the agent sets what it can state precisely, the reader drags what
they can only judge by eye, and both read the same measurements off the same
rendered page. `hand_over_control` makes the handover explicit rather than
implicit — a page that can refuse the agent is a page that can teach.

## How we used WebMCP — implementation

Eight tools, split by what they cost:

| Tool | Kind | What it does |
| --- | --- | --- |
| `read_specimen` | read-only | Settings plus measurements taken from the rendered page |
| `diagnose_specimen` | read-only | Every rule in scope, pass/fail, measured value, and why the rule exists |
| `list_lessons` | read-only | Lesson progress and which rules the reader solved unaided |
| `check_attempt` | read-only | Whether the reader met the open challenge |
| `export_css` | read-only | The current settings as CSS the reader can paste into their own project |
| `set_control` | write | Move one control; values clamped to the slider's own range |
| `demonstrate_fix` | write | Fix a failing rule and explain it |
| `hand_over_control` | write | Give a control to the reader and lock the agent out of it |

The read-only tools stay registered for the life of the page so they are always
in context; only tools whose descriptor actually changes are re-registered when
the surface grows. Tools return the MCP `{ content: [...] }` envelope, matching
the explainer and the reference implementations.

Two decisions did most of the work:

**The diagnosis is measured, not restated.** `src/typography/measure.ts` reads
the rendered document — line boxes via `Range.getClientRects()`, computed
styles, WCAG relative luminance — so the character count per line is what the
browser actually laid out, not the `measure` setting echoed back. An agent
cannot be told the page is fine by the same state that made it wrong.

**Where each number comes from is tracked per figure.** Nine rules carry their
sources (Bringhurst, Butterick, WCAG 2.1, CSS Fonts), and every finding carries
a `provenance` line separating quoted standards from this tool's own
calibration. WCAG 1.4.8 asks for a flat 1.5x line spacing; our Latin band goes
below it on short measures, and the rule says so in those words. A diagnosis
that dresses a preference up as a citation is worse than no diagnosis.

## Two writing systems, two sets of numbers

Most typographic advice on the web is Latin advice that does not say so. Thirty
characters to a line is cramped in English and comfortable in Japanese, where
every glyph is full-width. Typecase reads the script off the text itself and
judges against the matching band — and changes what a defect *is*: a widow is a
last line holding one word, but Japanese has no word boundaries for a line to
break on, so there the same fault is measured as a last line filling too little
of the column.

## Beyond the demo

`npm run build:probe` bundles the same measurement engine into a read-only probe
you can paste into the DevTools console of any article. On a page with a WebMCP
runtime it registers `read_page_typography` and `diagnose_page` there, so an
assistant can ask somebody else's article about itself. It reads and never
writes — somebody else's CSS is not ours to move.

Measured while building it: the author's own Japanese article reads 32 glyphs
per line at 1.9x, comfortable under the CJK bands. English Wikipedia comes back
at 90 characters per line, over the band and over WCAG 1.4.8's ceiling of 80.

## Built with

TypeScript, React 19, Vite 7, `@mcp-b/webmcp-polyfill` (fallback when Chrome's
own WebMCP runtime is off), no backend. MIT licensed.
