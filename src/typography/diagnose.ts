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
const SCALE_RATIO_TOLERANCE = 0.03;
const MIN_WEIGHT_STEP = 100;
const SCALE_STEPS: Readonly<Record<string, number>> = {
  title: 4,
  h1: 4,
  heading: 2,
  h2: 2,
  standfirst: 1,
  h3: 1,
};
const HEADING_LEVELS = new Set(["title", "heading", "h1", "h2", "h3", "h4"]);

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
        provenance:
          "The 1.15 minimum and 1.08 error boundary are this tool's own visual calibration, not figures stated by Tufte.",
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

    case "scale-coherence": {
      const body = m.levelSizes.find((level) => level.level === "body");
      const ratios = body
        ? m.levelSizes.flatMap((level) => {
            const step = SCALE_STEPS[level.level];
            return step && level.px > 0
              ? [{ level: level.level, ratio: Math.pow(level.px / body.px, 1 / step) }]
              : [];
          })
        : [];
      if (ratios.length < 2) {
        return {
          ...base,
          severity: "ok",
          measured: "not enough named levels on the page",
          message: "At least two heading levels and body text are needed to test one shared ratio.",
        };
      }
      const values = ratios.map(({ ratio }) => ratio);
      const spread = Math.max(...values) - Math.min(...values);
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      const ok = spread <= SCALE_RATIO_TOLERANCE;
      return {
        ...base,
        provenance:
          "Bringhurst allows scales built from one or more proportions. This lesson chooses one ratio; the 0.03 tolerance is this tool's own calibration for rounding and browser rendering.",
        severity: ok ? "ok" : spread > 0.08 ? "error" : "warn",
        measured: `${spread.toFixed(3)} spread across implied ratios (${ratios.map(({ level, ratio }) => `${level} ${ratio.toFixed(3)}×`).join(", ")})`,
        message: ok
          ? "The rendered levels resolve to one ratio."
          : `The rendered levels imply ratios from ${Math.min(...values).toFixed(3)}× to ${Math.max(...values).toFixed(3)}×, so the scale is not behaving as one system.`,
        ...(ok ? {} : { suggestion: suggestion("scaleRatio", spec.scaleRatio, average) }),
      };
    }

    case "secondary-cue": {
      const body = m.levelAppearances.find((level) => level.level === "body");
      const headings = m.levelAppearances.filter((level) => HEADING_LEVELS.has(level.level));
      if (!body || headings.length === 0) {
        return {
          ...base,
          severity: "ok",
          measured: "no heading and body pair on the page",
          message: "A heading and body text are both needed to compare their non-size cues.",
        };
      }
      const comparisons = headings.map((heading) => {
        const differentFamily = heading.fontFamily !== body.fontFamily;
        const weightDifference = Math.abs(heading.fontWeight - body.fontWeight);
        return { ...heading, differentFamily, weightDifference, ok: differentFamily || weightDifference >= MIN_WEIGHT_STEP };
      });
      const weak = comparisons.filter((comparison) => !comparison.ok);
      const ok = weak.length === 0;
      return {
        ...base,
        provenance:
          "CSS Fonts defines the numeric weight scale. Requiring a second cue and treating 100 units as visible are this tool's own calibrations; actual darkness remains face-dependent.",
        severity: ok ? "ok" : weak.length === headings.length ? "error" : "warn",
        measured: comparisons
          .map((comparison) => `${comparison.level}: ${comparison.differentFamily ? "different family" : `${comparison.weightDifference} weight units`}`)
          .join(", "),
        message: ok
          ? "Each heading has a non-size cue as well as scale."
          : `${weak.map((comparison) => comparison.level).join(" and ")} rely on size alone; their rendered family matches the body and the weight difference is under one step.`,
        ...(ok ? {} : { suggestion: suggestion("headingWeight", spec.headingWeight, body.fontWeight + MIN_WEIGHT_STEP) }),
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
      const line = m.computedLineHeight || 1;
      const gapRatio = m.paragraphGap / line;
      const indentRatio = m.computedFontSize > 0 ? m.paragraphIndent / m.computedFontSize : 0;
      const hasGap = gapRatio >= 0.35;
      const indentPresent = indentRatio > 0.05;
      const hasValidIndent = indentRatio >= 1 && indentRatio <= 4;
      const ok = (hasGap && !indentPresent) || (!hasGap && hasValidIndent);
      return {
        ...base,
        provenance:
          "Butterick specifies a first-line indent of 1–4 times the point size and says to use indent or paragraph space, not both. The 0.35× line-box threshold for a visible gap is this tool's own calibration.",
        severity: ok ? "ok" : "warn",
        measured: `${m.paragraphGap}px gap (${gapRatio.toFixed(2)}× the line box), ${m.paragraphIndent}px indent (${indentRatio.toFixed(2)}× the body size)`,
        message: ok
          ? hasGap
            ? "The gap between paragraphs supplies one clear signal of separation."
            : "The first-line indent supplies one clear signal of separation."
          : hasGap && indentPresent
            ? "The paragraphs use both a gap and an indent. One signal is enough; together they overstate every break."
            : indentRatio > 4
              ? "The indent is more than four times the body size, so the first line disconnects from the paragraph edge."
              : "There is neither a visible gap nor a full-em indent, so the paragraphs run together.",
        ...(ok
          ? {}
          : {
              suggestion: hasGap && indentPresent
                ? suggestion("paragraphIndent", spec.paragraphIndent, 0)
                : indentPresent
                  ? suggestion("paragraphIndent", spec.paragraphIndent, 1)
                  : suggestion("paragraphSpacing", spec.paragraphSpacing, 0.8),
            }),
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
