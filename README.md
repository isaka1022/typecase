# Typecase

A typesetting studio that teaches by doing. The page declares what it can do as
WebMCP tools, an agent demonstrates a fix on the layout you are actually
looking at, and then hands the control back to you.

Built for [The WebMCP Challenge](https://webmcp.devpost.com/).

## Why this exists

Ask an assistant how to use a piece of software and it will describe menus that
do not exist. In July 2025 ChatGPT told Soundslice users they could paste ASCII
guitar tabs into the app; the feature was imaginary, and the team
[shipped it afterwards](https://www.holovaty.com/writing/chatgpt-fake-feature/)
because so many people arrived expecting it. Agents that try to operate a UI by
looking at screenshots do not fare much better — the best systems on
[OSWorld](https://os-world.github.io/) sit far below human success rates,
because a click that lands one element off cascades into a misread of the whole
screen.

WebMCP removes the guessing. A page that registers its capabilities cannot be
credited with capabilities it does not have, and an agent calling a declared
tool does not have to find a button.

Typecase applies that to the thing software assistants are worst at: teaching
you to do something yourself.

## The part language cannot do

Language is exact about intent and vague about quantity. "A little looser" has
no number in it, and neither does "that heading is fighting the body text" — the
value that settles it is found by moving something and looking, not by naming
it.

This is not a novel observation, and the tools that generate interfaces have
already reacted to it: [Onlook](https://onlook.com) and
[Figma Make](https://www.figma.com/make/) both pair a prompt with direct
manipulation of the result, and
[CADAM](https://github.com/Adam-CAD/CADAM) makes the split explicit in another
domain — a model writes the CAD source, its parameters surface as sliders, and
moving one is a deterministic update that never calls the model again.

What none of them can do is let an agent that the vendor did not ship reach the
same controls. Those panels belong to one editor. WebMCP is the piece that makes
the split a property of the page instead: Typecase declares one set of controls,
the agent sets what it can state precisely, the reader drags what they can only
judge by eye, and both read the same measurements off the same rendered page.
`hand_over_control` is the handover made explicit — the agent names the control
it is stepping back from, and `set_control` refuses it until the reader is done.

## How it teaches

The lesson structure follows three findings that long predate agents.

- **Worked examples.** Novices learn more from watching a problem solved than
  from being told to solve it (Sweller & Cooper). `demonstrate_fix` changes the
  page and says what changed and why.
- **Scaffolding and fading.** Support has to be withdrawn on purpose.
  `hand_over_control` gives one control to the reader — and while that challenge
  is open, `set_control` refuses to touch it. The agent cannot take the wheel
  back.
- **Training wheels.** Carroll's minimal-instruction work found that blocking
  advanced features helps beginners. The tool surface grows as lessons open:
  `set_control`'s enum only lists controls whose lesson has started, so
  `getTools()` shows a different set of capabilities at lesson 1 than at
  lesson 3.

## The tools

| Tool | Kind | What it does |
| --- | --- | --- |
| `read_specimen` | read-only | Settings plus measurements taken from the rendered page |
| `diagnose_specimen` | read-only | Every rule in scope, pass/fail, measured value, and why the rule exists |
| `list_lessons` | read-only | Lesson progress and which rules the reader solved unaided |
| `set_control` | write | Move one control; values are clamped to the slider's own range |
| `demonstrate_fix` | write | Fix a failing rule and explain it |
| `hand_over_control` | write | Give a control to the reader and lock the agent out of it |
| `check_attempt` | read-only | Whether the reader met the open challenge |

The read-only tools stay registered for the life of the page so they are always
in context; only the tools whose descriptor actually changes are re-registered
when the surface grows.

## Two writing systems, two sets of numbers

Most typographic advice on the web is Latin advice that does not say so. Thirty
characters to a line is a cramped measure in English and a comfortable one in
Japanese, where every glyph is full-width; a tool that does not know which it is
looking at will confidently give the wrong answer to half the world.

Typecase reads the script off the text itself and judges against the matching
band. It also changes what a defect *is*: a widow is a last line holding one
word, but Japanese has no word boundaries for a line to break on, so there the
same fault is measured as a last line filling too little of the column.

Where the numbers come from is tracked per figure, not per rule, and shown in
the panel:

| | Latin | Japanese |
| --- | --- | --- |
| Measure | 45–75 characters (Bringhurst) | up to 40 glyphs (WCAG 1.4.8, quoted); lower bound is ours |
| Line spacing | 1.4×–1.7×, scaled to the measure | 1.6×–2.0×, ours — full-width glyphs have no ascender rhythm to open the line |
| Widow | last line of one word | last line under 12% of the column |

Two of those numbers are this tool's own calibration rather than a cited
standard, and the panel says so in those words. WCAG 1.4.8 asks for a flat 1.5×
line spacing at AAA; the Latin band deliberately goes below it on short
measures, and the rule says that too. A diagnosis that dresses a preference up
as a citation is worse than no diagnosis.

## The diagnosis is measured, not restated

`src/typography/measure.ts` reads the rendered document — line boxes via
`Range.getClientRects()`, computed styles, WCAG relative luminance — so the
character count per line is what the browser actually laid out, not the
`measure` setting echoed back. Rules and thresholds live in
`src/typography/rules.ts` with their sources (Bringhurst, Butterick, WCAG 2.1).

## Pointing it at a page you did not build

The rules are worth more on your own writing than on a sample. `npm run
build:probe` bundles the same measurement engine into `public/probe.js`, a
read-only probe you can drop onto any article:

```bash
npm run build:probe
pbcopy < public/probe.js   # then paste it into the DevTools console of the page
```

Paste rather than `<script src>`: an `https` article cannot load a script from
`http://localhost`, and once the site is served over `https` a one-line loader
works instead.

It finds the reading column (`<article>`, then `<main>`, then the body),
measures the paragraphs that are actually running text, and prints the same
findings in a panel — in a shadow root, `position: fixed`, so measuring the page
does not reflow it. On a page with a WebMCP runtime it also registers
`read_page_typography` and `diagnose_page` there, so an assistant can ask the
article about itself.

It reads and never writes. Somebody else's CSS is not ours to move, so the
sliders stay in the studio.

Two limits worth knowing. A page that sends a `script-src` policy with
`strict-dynamic` and a nonce (note.com and zenn.dev both do) will refuse an
injected bookmarklet; the DevTools console is not subject to that and still
works. And the probe reads whichever heading sits inside the running text, so a
page whose article is assembled entirely out of `<div>`s gives it nothing to
find.

Measured while building it: this repository's author's own Japanese article
reads 32 glyphs per line at 1.9× — comfortable under the CJK bands, and the
reading that first showed the Latin numbers were wrong for it. English Wikipedia
comes back at 90 characters per line, over the band and over WCAG 1.4.8's
ceiling of 80.

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:4173>. For Chrome's own WebMCP runtime, enable
`chrome://flags/#enable-webmcp-testing` and reload; without it the page falls
back to [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill)
and the tools remain registered and callable. The panel in the top right says
which runtime is in use.

To drive the tools by hand, open DevTools → Application → WebMCP.

### A note on `executeTool`

Chromium's `executeTool(tool, inputArgsJson)` takes the arguments as a **JSON
string**, not an object, and returns the serialised return value of `execute`.
Tools here return the MCP `{ content: [...] }` envelope, matching the
[explainer](https://github.com/webmachinelearning/webmcp) and the reference
implementations, so calling `executeTool` directly shows that envelope as text.

## Licence

MIT. See [LICENSE](./LICENSE).
