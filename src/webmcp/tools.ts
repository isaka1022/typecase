import { record } from "../state/activity";
import { whenSynced } from "./sync";
import { specToCss } from "../typography/css";
import { diagnose, type Finding } from "../typography/diagnose";
import { RULES, RULES_BY_ID } from "../typography/rules";
import { NUMERIC_CONTROLS, isNumericControl, type NumericControl } from "../typography/spec";
import {
  getState,
  markSolvedByReader,
  readMeasurement,
  setChallenge,
  setControl,
} from "../state/store";

type ToolResult = { content: Array<{ type: "text"; text: string }> };

const text = (value: string): ToolResult => ({ content: [{ type: "text", text: value }] });
const json = (value: unknown): ToolResult => text(JSON.stringify(value, null, 2));

function currentFindings(): Finding[] {
  const state = getState();
  const measurement = readMeasurement();
  if (!measurement) return [];
  return diagnose(state.spec, measurement, state.unlockedLesson);
}

/** Controls the reader has been taught so far. The agent is only offered the
 * ones whose lesson is unlocked — capability is disclosed as the lesson opens,
 * not all at once. */
function availableControls(): NumericControl[] {
  const { unlockedLesson, challenge } = getState();
  const fromRules = RULES.filter((rule) => rule.lesson <= unlockedLesson)
    .flatMap((rule) => [rule.control, ...(rule.relatedControls ?? [])])
    .filter((control): control is NumericControl => control !== undefined);
  const unique = [...new Set(fromRules)];
  return challenge ? unique.filter((control) => control !== challenge.control) : unique;
}

/**
 * Descriptors are built from the state as it is now; `execute` bodies must not
 * close over it. A read-only tool's descriptor never changes, so it is never
 * re-registered — anything it captured at build time would be reported to the
 * agent forever.
 */
export function buildTools(): Array<Record<string, unknown>> {
  const controls = availableControls();
  const openLesson = getState().unlockedLesson;

  return [
    {
      name: "read_specimen",
      description:
        "Read the current typographic settings and the measurements taken from the rendered page. Call this before changing anything; the numbers here are measured from the layout, not read back from the settings.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const state = getState();
        const measurement = readMeasurement();
        if (!measurement) return text("The specimen has not been rendered yet.");
        return json({
          settings: state.spec,
          measured: {
            charactersPerLine: measurement.charsPerLine,
            lineHeightRatio:
              measurement.computedFontSize > 0
                ? Number((measurement.computedLineHeight / measurement.computedFontSize).toFixed(2))
                : 0,
            levelSizesPx: measurement.levelSizes,
            levelAppearances: measurement.levelAppearances,
            paragraphGapPx: measurement.paragraphGap,
            paragraphIndentPx: measurement.paragraphIndent,
            spaceAboveHeadingPx: measurement.headingSpaceBefore,
            spaceBelowHeadingPx: measurement.headingSpaceAfter,
            contrastRatio: measurement.contrast,
            paragraphsEndingInOneWord: measurement.widowCount,
          },
          openLesson: getState().unlockedLesson,
          textSource: state.usingOwnText ? "the reader's own writing" : "the built-in sample essay",
          challenge: state.challenge,
        });
      },
    },

    {
      name: "diagnose_specimen",
      description:
        "List every typographic rule in scope for the open lesson, whether the page passes it, the measured value, and why the rule exists. This is the authoritative judgement of this page — do not infer typographic problems from anything else.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const findings = currentFindings();
        if (findings.length === 0) return text("The specimen has not been rendered yet.");
        return json(
          findings.map((f) => ({
            rule: f.ruleId,
            status: f.severity,
            measured: f.measured,
            target: f.target,
            problem: f.severity === "ok" ? null : f.message,
            why: f.why,
            source: f.source,
            provenance: f.provenance ?? null,
            fixableWith: f.suggestion?.control ?? null,
          })),
        );
      },
    },

    {
      name: "export_css",
      description:
        "Return the current settings as CSS the reader can paste into their own project. Offer this once a lesson's rules pass — it is what the reader takes away from the exercise.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        record({ actor: "agent", headline: "Handed you the CSS for these settings." });
        return text(specToCss(getState().spec));
      },
    },

    {
      name: "list_lessons",
      description:
        "List the three lessons, which one is open, and which rules the reader has brought into range without help.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const state = getState();
        return json(
          [1, 2, 3].map((lesson) => ({
            lesson,
            open: lesson <= state.unlockedLesson,
            rules: RULES.filter((rule) => rule.lesson === lesson).map((rule) => ({
              id: rule.id,
              title: rule.title,
              solvedByReader: state.solvedByReader.includes(rule.id),
            })),
          })),
        );
      },
    },

    {
      name: "set_control",
      description:
        `Move one typographic control. Only the controls taught in the open lesson are available: ${controls.join(", ")}. Values outside the control's range are clamped to it, so the page can never reach a state the reader could not also reach by hand.`,
      inputSchema: {
        type: "object",
        properties: {
          control: { type: "string", enum: controls, description: "Which control to move." },
          value: { type: "number", description: "The new value, in the control's own unit." },
        },
        required: ["control", "value"],
      },
      async execute({ control, value }: { control: string; value: number }) {
        if (!isNumericControl(control)) return text(`There is no control called "${control}".`);
        const open = availableControls();
        if (!open.includes(control)) {
          return text(
            `"${control}" is not available yet. Controls open in lesson ${getState().unlockedLesson}: ${open.join(", ")}.`,
          );
        }
        const result = setControl(control, value, "agent");
        if (!result.ok) return text(result.reason ?? "That control is not available.");
        const unit = NUMERIC_CONTROLS[control].unit;
        record({
          actor: "agent",
          headline: `${NUMERIC_CONTROLS[control].label}: ${result.from}${unit} → ${result.to}${unit}`,
        });
        return text(`${NUMERIC_CONTROLS[control].label}: ${result.from}${unit} → ${result.to}${unit}`);
      },
    },

    {
      name: "demonstrate_fix",
      description:
        "Fix one failing rule yourself so the reader can watch the page change, then say why it was wrong. Use this the first time a rule comes up — showing the worked example before asking the reader to try it is the point.",
      inputSchema: {
        type: "object",
        properties: {
          rule: {
            type: "string",
            enum: RULES.filter((r) => r.lesson <= openLesson).map((r) => r.id),
            description: "The rule to fix.",
          },
        },
        required: ["rule"],
      },
      async execute({ rule }: { rule: string }) {
        const finding = currentFindings().find((f) => f.ruleId === rule);
        if (!finding) {
          return text(`"${rule}" is not in scope for lesson ${getState().unlockedLesson}.`);
        }
        if (finding.severity === "ok") return text(`"${rule}" already passes: ${finding.measured}.`);
        if (!finding.suggestion) {
          return text(`${finding.message} This one is not fixed with a control — ${finding.why}`);
        }
        const result = setControl(finding.suggestion.control, finding.suggestion.to, "agent");
        if (!result.ok) return text(result.reason ?? "That control is not available.");
        const unit = NUMERIC_CONTROLS[finding.suggestion.control].unit;
        const label = NUMERIC_CONTROLS[finding.suggestion.control].label;
        record({
          actor: "agent",
          headline: `${label} ${result.from}${unit} → ${result.to}${unit}`,
          detail: finding.why,
          source: finding.source,
        });
        return text(
          `${finding.message}\n\nMoved ${label} ${result.from}${unit} → ${result.to}${unit}.\n\nWhy: ${finding.why} (${finding.source})`,
        );
      },
    },

    {
      name: "hand_over_control",
      description:
        "Give one control to the reader and step back. While the challenge is open you cannot move that control with set_control — the reader has to bring the rule into range themselves. Use this after you have demonstrated the same kind of fix once.",
      inputSchema: {
        type: "object",
        properties: {
          rule: {
            type: "string",
            enum: RULES.filter((r) => r.lesson <= openLesson && r.control !== undefined).map((r) => r.id),
            description: "The rule the reader should bring into range.",
          },
        },
        required: ["rule"],
      },
      async execute({ rule }: { rule: string }) {
        const definition = RULES_BY_ID.get(rule);
        if (!definition?.control) return text(`"${rule}" has no control the reader can move.`);
        setChallenge({
          ruleId: rule,
          control: definition.control,
          targetDescription: definition.target,
        });
        record({
          actor: "agent",
          headline: `Handed you the ${NUMERIC_CONTROLS[definition.control].label} control.`,
          detail: `Your turn: ${definition.target}. The agent cannot move this one until you do.`,
        });
        await whenSynced();
        return text(
          `Handed ${NUMERIC_CONTROLS[definition.control].label} to the reader. They need to reach: ${definition.target}. Call check_attempt to see how they are doing.`,
        );
      },
    },

    {
      name: "check_attempt",
      description:
        "Check whether the reader has brought the open challenge into range. Returns the measured value and how far off it still is.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const { challenge } = getState();
        if (!challenge) return text("There is no open challenge.");
        const finding = currentFindings().find((f) => f.ruleId === challenge.ruleId);
        if (!finding) return text("That rule is no longer in scope.");
        if (finding.severity === "ok") {
          const next = markSolvedByReader(challenge.ruleId);
          // The lesson has opened; wait for the wider tool surface to be live
          // before telling the agent it can use it.
          await whenSynced();
          return text(
            `Solved by the reader: ${finding.measured} — target was ${finding.target}. Lesson ${next} is now open.`,
          );
        }
        return text(`Not there yet. Measured ${finding.measured}, target ${finding.target}. ${finding.message}`);
      },
    },
  ];
}
