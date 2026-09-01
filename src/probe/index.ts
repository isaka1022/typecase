/**
 * Typecase probe — the rules, pointed at a page this project did not build.
 *
 * Two things matter more here than in the studio. First, a measuring instrument
 * must not disturb what it measures: the panel is fixed-position and lives in a
 * shadow root, so it neither reflows the article nor leaks a stylesheet into it.
 * Second, the page is read and never written — an arbitrary site's CSS is not
 * ours to move, so the probe reports and stops there.
 */
import { findReadingRoot, genericAdapter } from "../typography/adapter";
import { diagnose, type Finding } from "../typography/diagnose";
import { measureSpecimen, type SpecimenMeasurement } from "../typography/measure";
import { INITIAL_SPEC } from "../typography/spec";

const PANEL_ID = "typecase-probe";
const ALL_LESSONS = 3;

interface Reading {
  measurement: SpecimenMeasurement;
  findings: Finding[];
  root: HTMLElement;
}

function read(): Reading | null {
  const root = findReadingRoot();
  if (!root) return null;
  const measurement = measureSpecimen(root, genericAdapter);
  if (measurement.paragraphCount === 0) return null;
  // The spec is only consulted for the suggestion arithmetic; every number the
  // reader sees below came off the rendered page.
  return { measurement, findings: diagnose(INITIAL_SPEC, measurement, ALL_LESSONS), root };
}

const STYLE = `
:host { all: initial; }
.panel {
  position: fixed; right: 16px; bottom: 16px; width: 340px; max-height: 70vh;
  display: flex; flex-direction: column;
  background: #14161a; color: #e9ecef; border: 1px solid #2b3038; border-radius: 6px;
  font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif;
  box-shadow: 0 10px 40px rgba(0,0,0,.45); z-index: 2147483647;
}
header { display: flex; align-items: baseline; justify-content: space-between;
  gap: 10px; padding: 12px 14px; border-bottom: 1px solid #2b3038; }
h1 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: -.01em; }
.count { font: 11px ui-monospace, monospace; color: #949cab; }
button { font: 11px ui-monospace, monospace; color: #949cab; background: none;
  border: 1px solid #2b3038; border-radius: 2px; padding: 3px 7px; cursor: pointer; }
button:hover { color: #e9ecef; border-color: #949cab; }
button:focus-visible { outline: 2px solid #d6a35c; outline-offset: 2px; }
.body { overflow-y: auto; overflow-x: hidden; padding: 12px 14px; }
.note { margin: 0 0 12px; font-size: 12px; color: #949cab; }
.note--script { padding-left: 9px; border-left: 2px solid #a68cd8; }
.f { border-left: 2px solid #2b3038; padding-left: 11px; margin-bottom: 14px; }
.f:last-child { margin-bottom: 0; }
.f[data-s="ok"] { border-left-color: #6fbf9a; }
.f[data-s="warn"] { border-left-color: #d6a35c; }
.f[data-s="error"] { border-left-color: #e08585; }
.f-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 8px; align-items: baseline; }
.f-title { font-size: 12.5px; font-weight: 500; }
.f-measured { font: 11px ui-monospace, monospace; color: #949cab; }
.f-msg { margin: 3px 0 0; font-size: 12px; color: #949cab; }
.foot { padding: 10px 14px; border-top: 1px solid #2b3038; font-size: 11px; color: #949cab; }
a { color: #d6a35c; }
`;

function render(host: ShadowRoot, reading: Reading, agentTools: number): void {
  const { measurement, findings } = reading;
  const failing = findings.filter((f) => f.severity !== "ok").length;

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <header>
      <h1>Typecase</h1>
      <span class="count">${failing === 0 ? "all clear" : `${failing} to fix`}</span>
      <button type="button" data-close>close</button>
    </header>
    <div class="body">
      ${
        measurement.script === "cjk"
          ? `<p class="note note--script">Judged as Japanese${
              measurement.mixedScript ? " (mixed with Latin)" : ""
            }. Counts and spacing are held to different ranges than for Latin.</p>`
          : ""
      }
      ${findings
        .map(
          (f) => `<div class="f" data-s="${f.severity}">
            <div class="f-head"><span class="f-title"></span><span class="f-measured"></span></div>
            <p class="f-msg"></p>
          </div>`,
        )
        .join("")}
    </div>
    <div class="foot">
      Measured ${measurement.paragraphCount} paragraphs. Read-only — this page's CSS is not ours to move.
      ${agentTools > 0 ? `<br>${agentTools} WebMCP tools registered on this page.` : ""}
    </div>`;

  // Text is set through the DOM rather than interpolated, so a page's own words
  // can never become markup inside the panel.
  const blocks = Array.from(panel.querySelectorAll<HTMLElement>(".f"));
  findings.forEach((f, i) => {
    const block = blocks[i];
    if (!block) return;
    block.querySelector(".f-title")!.textContent = f.title;
    block.querySelector(".f-measured")!.textContent = f.measured;
    block.querySelector(".f-msg")!.textContent = f.message;
  });

  panel.querySelector("[data-close]")!.addEventListener("click", () => {
    document.getElementById(PANEL_ID)?.remove();
  });

  // The stylesheet is rebuilt with the panel: a re-render replaces everything
  // in the root, so a style appended once at mount would not survive the first
  // resize.
  const style = document.createElement("style");
  style.textContent = STYLE;
  host.replaceChildren(style, panel);
}

/** Offer the same reading to an agent, if the browser has a runtime for it. */
function registerTools(getReading: () => Reading | null): number {
  const context = (document as unknown as { modelContext?: { registerTool: (t: unknown) => void } })
    .modelContext;
  if (!context?.registerTool) return 0;

  const tools = [
    {
      name: "read_page_typography",
      description:
        "Measure the typography of the article on this page as it is actually rendered: characters or glyphs per line, line spacing, contrast, heading spacing and the size of each level.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const reading = getReading();
        if (!reading) return { content: [{ type: "text", text: "No running text found on this page." }] };
        const m = reading.measurement;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                script: m.script,
                mixedScript: m.mixedScript,
                paragraphs: m.paragraphCount,
                perLine: m.charsPerLine,
                unit: m.script === "cjk" ? "glyphs" : "characters",
                fontSizePx: m.computedFontSize,
                lineHeightPx: m.computedLineHeight,
                contrast: m.contrast,
                levelSizes: m.levelSizes,
                paragraphGapPx: m.paragraphGap,
              }),
            },
          ],
        };
      },
    },
    {
      name: "diagnose_page",
      description:
        "Judge this page's typography against the rules, and say for each one what was measured, whether it passes, why the rule exists and where its numbers come from.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const reading = getReading();
        if (!reading) return { content: [{ type: "text", text: "No running text found on this page." }] };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                reading.findings.map((f) => ({
                  rule: f.ruleId,
                  severity: f.severity,
                  measured: f.measured,
                  target: f.target,
                  message: f.message,
                  why: f.why,
                  source: f.source,
                  provenance: f.provenance,
                })),
              ),
            },
          ],
        };
      },
    },
  ];

  for (const tool of tools) context.registerTool(tool);
  return tools.length;
}

function mount(): void {
  document.getElementById(PANEL_ID)?.remove();

  let reading = read();
  if (!reading) {
    // eslint-disable-next-line no-console
    console.warn("[typecase] No running text found on this page.");
    return;
  }

  const holder = document.createElement("div");
  holder.id = PANEL_ID;
  const shadow = holder.attachShadow({ mode: "open" });
  document.body.appendChild(holder);

  const toolCount = registerTools(() => reading);
  render(shadow, reading, toolCount);

  // The measure changes with the window, so the reading has to follow it.
  let pending = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(pending);
    pending = window.setTimeout(() => {
      const next = read();
      if (!next) return;
      reading = next;
      render(shadow, next, toolCount);
    }, 200);
  });
}

mount();
