# Demo video — script and shot list

Target: 2:50 (hard limit 3:00). Narration: English TTS, ~150 wpm, 415 words.
Capture: ChatGPT in-app browser at https://typecase.vercel.app, window 1440x900,
system font scaling 100%. Record at 60fps so slider drags stay smooth.

The judges also visit the live URL, so the video does not have to prove the app
exists — it has to show the one thing a visitor cannot discover alone: the
handover.

---

## 0:00–0:18 · The problem (18s, 45 words)

**Shot.** The badly-set page, full screen, no panel yet. Slow scroll of two
paragraphs.

> Ask an assistant how to use a piece of software, and it will describe menus
> that do not exist. Last year ChatGPT told Soundslice users to paste guitar
> tabs into a feature nobody had built. The page could not correct it. It had no
> way to say what it could do.

## 0:18–0:40 · The page declares itself (22s, 55 words)

**Shot.** Panel visible, "AGENT SURFACE — NATIVE, 8 tools declared". Expand the
tool list so the eight names are readable for two seconds.

> Typecase is a typesetting studio that declares its controls as WebMCP tools.
> Eight of them: four that read the rendered page, four that change it. An agent
> does not have to find a button or guess a menu. It reads what the page says it
> can do, and the page cannot claim a capability it does not have.

## 0:40–1:12 · Diagnose (32s, 80 words)

**Shot.** Type into ChatGPT: *"Diagnose this page and tell me the worst
problem."* Show the tool call firing, then the answer. Cut to the diagnosis
panel filling in.

> So I ask it to diagnose the page. It calls diagnose_specimen, and what comes
> back is measured, not restated. Ninety-eight characters per line — that is the
> browser's own line box, read with getClientRects, not the setting echoed back.
> Every finding carries its source, and says which numbers are quoted standards
> and which are this tool's own calibration. A diagnosis that dresses a
> preference up as a citation is worse than no diagnosis.

## 1:12–1:40 · Demonstrate (28s, 70 words)

**Shot.** *"Fix the worst one and show me what you changed."* The measure
narrows on screen. Panel logs the change with its reasoning.

> Now it fixes one. demonstrate_fix moves the measure and says what changed and
> why — a worked example, which is how people actually learn a skill. The page
> re-measures itself afterwards, so the claim and the layout cannot drift apart.
> Everything happens on the document I am looking at, not in a description of
> one.

## 1:40–2:20 · The handover (40s, 95 words)

**Shot.** *"Now hand me the line spacing."* The slider lights up. Then ask the
agent to set it anyway — it refuses. Drag the slider by hand; the challenge
clears.

> Here is the part that needed WebMCP. Language is exact about intent and vague
> about quantity. "A little looser" has no number in it. So the agent calls
> hand_over_control, gives me the slider — and locks itself out. Watch: I ask it
> to set that value, and it refuses, because the challenge is mine until I meet
> it. I drag it, the page re-measures, the lesson clears. The agent sets what it
> can state precisely; I judge what only an eye can judge. Both of us read the
> same measurements off the same page.

## 2:20–2:40 · The surface grows (20s, 50 words)

**Shot.** Lesson 2 opens. Re-list the tools — set_control's enum now has more
controls than it did at lesson one.

> And the tool surface itself is the curriculum. set_control only lists controls
> whose lesson has started, so the tools an agent can see at lesson one are not
> the tools it sees at lesson three. Blocking advanced features is a teaching
> decision, and WebMCP made it enforceable.

## 2:40–2:50 · Close (10s, 25 words)

**Shot.** Probe pasted into a real article — findings panel appears over
somebody else's page. Then the URL card.

> The same engine reads any article you point it at, in Latin or Japanese, with
> the numbers each script actually needs. It is MIT licensed. Try it.

---

## Recording notes

- Do the run once without recording. ChatGPT's phrasing varies; find the prompts
  that reliably trigger the intended tool before you roll.
- The refusal at 1:55 is the money shot. If the agent complies instead of
  refusing, the challenge was not open — re-open it and take it again.
- Keep the panel visible in every shot after 0:18. It is the evidence that the
  page, not the model, is doing the work.
- No music. Narration only; the judges are listening for what was built.
