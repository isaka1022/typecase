import { bandsFor, leadingForMeasure } from "./bands";
import type { SpecimenMeasurement } from "./measure";
import { RULES, type Rule, type Severity } from "./rules";
import { NUMERIC_CONTROLS, clampControl, type NumericControl, type TypeSpec } from "./spec";

export interface Finding {
  ruleId: string;
  lesson: number;
  title: string;
  severity: Severity;
  measured: string;
  target: string;
  message: string;
  why: string;
  source: string;
  suggestion?: { control: NumericControl; from: number; to: number };
  /** Where this rule's numbers come from, and where they are this tool's own
   * rather than a cited figure. Kept apart from `source` so a calibration is
   * never mistaken for a standard. */
  provenance?: string;
}

const CONTRAST_MIN = 4.5;
const MIN_LEVEL_STEP = 1.15;

function suggestion(
  control: NumericControl,
  from: number,
  to: number,
): { control: NumericControl; from: number; to: number } {
  return { control, from: Number(from.toFixed(3)), to: clampControl(control, to) };
}

/** Rules that need running text to mean anything. */
const NEEDS_BODY_TEXT = new Set(["measure", "leading", "widows", "paragraph-rhythm"]);

function evaluate(rule: Rule, spec: TypeSpec, m: SpecimenMeasurement): Finding {
  const base = {
    ruleId: rule.id,
    lesson: rule.lesson,
    title: rule.title,
    target: rule.target,
    why: rule.why,
    source: rule.source,
  };

  if (NEEDS_BODY_TEXT.has(rule.id) && m.paragraphCount === 0) {
    return {
      ...base,
      severity: "ok",
      measured: "no body text on the page",
      message: "This rule needs running text to judge. Add a paragraph and it will apply.",
    };
  }

  if (rule.id === "paragraph-rhythm" && m.paragraphCount < 2) {
    return {
      ...base,
      severity: "ok",
      measured: "one paragraph on the page",
      message: "Separation between paragraphs cannot be judged until there are two of them.",
    };
  }

  switch (rule.id) {
    case "measure": {
      const band = bandsFor(m.script).measure;
      const unit = bandsFor(m.script).unit;
      const value = m.charsPerLine;
      const ok = value >= band.min && value <= band.max;
      const overLong = value > band.max;
      const aim = Math.round((band.min + band.max) / 2);
      return {
        ...base,
        target: `${band.min}–${band.max} ${unit} per line`,
        provenance: band.provenance,
        severity: ok ? "ok" : value > band.hardMax || value < band.hardMin ? "error" : "warn",
        measured: `${value} ${unit} per line`,
        message: ok
          ? "The measure is in the comfortable band."
          : overLong
            ? `Lines run to ${value} ${unit}. The eye struggles to find the next line on the return sweep.`
            : `Lines are only ${value} ${unit}. The reading rhythm breaks because the eye returns too often.`,
        ...(ok
          ? {}
          : { suggestion: suggestion("measureTarget", spec.measureTarget, overLong ? aim : aim - 6) }),
      };
    }

    case "leading": {
      const ratio = m.computedFontSize > 0 ? Number((m.computedLineHeight / m.computedFontSize).toFixed(2)) : 0;
      const wanted = leadingForMeasure(m.charsPerLine, m.script);
      const ok = Math.abs(ratio - wanted) <= 0.15;
      return {
        ...base,
        severity: ok ? "ok" : Math.abs(ratio - wanted) > 0.3 ? "error" : "warn",
        target: `${bandsFor(m.script).leading.min}×–${bandsFor(m.script).leading.max}× the body size`,
        provenance: bandsFor(m.script).leading.provenance,
        measured: `${ratio}× the body size`,
        message: ok
          ? "Line spacing suits this measure."
          : ratio < wanted
            ? `At ${m.charsPerLine} ${bandsFor(m.script).unit} per line, ${ratio}× is tight. A measure this long needs about ${wanted}×.`
            : `${ratio}× is looser than this measure needs. Around ${wanted}× would hold the paragraph together.`,
        ...(ok ? {} : { suggestion: suggestion("lineHeight", spec.lineHeight, wanted) }),
      };
    }

    case "contrast": {
      const ok = m.contrast >= CONTRAST_MIN;
      return {
        ...base,
        severity: ok ? "ok" : m.contrast < 3 ? "error" : "warn",
        measured: `${m.contrast}:1`,
        message: ok
          ? "Body text clears the accessibility floor."
          : `Body text sits at ${m.contrast}:1 against the paper, below the 4.5:1 floor.`,
        ...(ok ? {} : { suggestion: suggestion("inkLightness", spec.inkLightness, 32) }),
      };
    }

    case "scale-distinction": {
      const sizes = m.levelSizes;
      if (sizes.length < 2) {
        return {
          ...base,
          severity: "ok",
          measured: "one level on the page",
          message: "There is only one text size here, so there is no hierarchy to judge.",
        };
      }
      // The tightest step between two neighbouring levels, as rendered.
      let tightest = Number.POSITIVE_INFINITY;
      let pair = "";
      for (let i = 0; i < sizes.length - 1; i += 1) {
        const hi = sizes[i]!;
        const lo = sizes[i + 1]!;
        if (lo.px <= 0) continue;
        const ratio = hi.px / lo.px;
        if (ratio < tightest) {
          tightest = ratio;
          pair = `${hi.level} to ${lo.level}`;
        }
      }
      const ok = tightest >= MIN_LEVEL_STEP;
      return {
        ...base,
        severity: ok ? "ok" : tightest < 1.08 ? "error" : "warn",
        measured: `${tightest.toFixed(2)}× at the tightest step (${pair})`,
        message: ok
          ? "Every neighbouring pair of levels is far enough apart to read as different."
          : `${pair} differ by only ${tightest.toFixed(2)}×. At that distance the hierarchy exists in the stylesheet but not on the page.`,
        ...(ok
          ? {}
          : { suggestion: suggestion("scaleRatio", spec.scaleRatio, spec.scaleRatio * (MIN_LEVEL_STEP / tightest)) }),
      };
    }

    case "heading-proximity": {
      const ok = m.headingSpaceBefore > m.headingSpaceAfter;
      return {
        ...base,
        severity: ok ? "ok" : "warn",
        measured: `${m.headingSpaceBefore}px above, ${m.headingSpaceAfter}px below`,
        message: ok
          ? "Each heading sits closer to the text it introduces."
          : `There is ${m.headingSpaceAfter}px below the heading and only ${m.headingSpaceBefore}px above it, so the heading attaches to the section it just ended.`,
        ...(ok ? {} : { suggestion: suggestion("headingSpaceBefore", spec.headingSpaceBefore, spec.headingSpaceAfter * 2.2) }),
      };
    }

    case "paragraph-rhythm": {
      // Judged against the line box: a gap only reads as a separation when it
      // is clearly bigger than the space between two lines of the paragraph.
      const line = m.computedLineHeight || 1;
      const ratio = m.paragraphGap / line;
      const ok = ratio >= 0.35;
      return {
        ...base,
        severity: ok ? "ok" : "warn",
        measured: `${m.paragraphGap}px gap, ${ratio.toFixed(2)}× the line box`,
        message: ok
          ? "The gap between paragraphs reads as a separation."
          : `The gap is ${m.paragraphGap}px against a ${line}px line box. Below about a third of the line box the break stops registering and the text becomes one undifferentiated block.`,
        ...(ok ? {} : { suggestion: suggestion("paragraphSpacing", spec.paragraphSpacing, 0.8) }),
      };
    }

    case "widows": {
      const ok = m.widowCount === 0;
      const plural = m.widowCount === 1 ? "" : "s";
      // Japanese has no word boundaries for a last line to fall on, so the
      // same defect is described by how little of the column it fills.
      const stub = m.script === "cjk" ? "a stub of a line" : "one word";
      return {
        ...base,
        severity: ok ? "ok" : "warn",
        measured: `${m.widowCount} paragraph${plural} ending in ${stub}`,
        message: ok
          ? `No paragraph ends on ${stub}.`
          : `${m.widowCount} paragraph${plural} end on ${stub}, leaving a hole in the column.`,
        ...(ok ? {} : { suggestion: suggestion("measureTarget", spec.measureTarget, spec.measureTarget - 3) }),
      };
    }

    default:
      return { ...base, severity: "ok", measured: "—", message: "" };
  }
}

export function diagnose(spec: TypeSpec, m: SpecimenMeasurement, unlockedLesson: number): Finding[] {
  return RULES.filter((rule) => rule.lesson <= unlockedLesson).map((rule) => evaluate(rule, spec, m));
}

export function controlLabel(control: NumericControl): string {
  return NUMERIC_CONTROLS[control].label;
}
