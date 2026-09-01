import { describe, expect, it } from "vitest";
import { diagnose } from "../diagnose";
import { leadingForMeasure } from "../bands";
import { readScript } from "../script";
import type { SpecimenMeasurement } from "../measure";
import { contrastFromRgb } from "../measure";
import { clampControl, INITIAL_SPEC, scaleStep, type TypeSpec } from "../spec";

/** A page that satisfies every rule, so each test can break exactly one thing. */
function healthy(): SpecimenMeasurement {
  return {
    paragraphs: [],
    script: "latin",
    cjkRatio: 0,
    mixedScript: false,
    paragraphCount: 4,
    charsPerLine: 66,
    computedFontSize: 18,
    computedLineHeight: 28.8,
    levelSizes: [
      { level: "title", px: 43.95 },
      { level: "heading", px: 28.13 },
      { level: "standfirst", px: 22.5 },
      { level: "body", px: 18 },
    ],
    levelAppearances: [
      { level: "title", fontWeight: 600, fontFamily: "Inter" },
      { level: "heading", fontWeight: 600, fontFamily: "Inter" },
      { level: "standfirst", fontWeight: 400, fontFamily: "Inter" },
      { level: "body", fontWeight: 400, fontFamily: "Inter" },
    ],
    headingSpaceBefore: 44,
    headingSpaceAfter: 18,
    paragraphGap: 14,
    paragraphIndent: 0,
    contrast: 9.2,
    widowCount: 0,
  };
}

function goodSpec(): TypeSpec {
  return { ...INITIAL_SPEC, bodySize: 18, lineHeight: 1.6, measureTarget: 66, scaleRatio: 1.25, headingWeight: 600, paragraphSpacing: 0.8, paragraphIndent: 0, headingSpaceBefore: 2, inkLightness: 25 };
}

const statusOf = (m: SpecimenMeasurement, rule: string, spec = goodSpec()) =>
  diagnose(spec, m, 3).find((f) => f.ruleId === rule)?.severity;

describe("diagnose", () => {
  it("passes every rule on a well-set page", () => {
    expect(diagnose(goodSpec(), healthy(), 3).every((f) => f.severity === "ok")).toBe(true);
  });

  it("only reports rules whose lesson has opened", () => {
    const lessons = diagnose(goodSpec(), healthy(), 1).map((f) => f.lesson);
    expect(new Set(lessons)).toEqual(new Set([1]));
  });

  it("flags a measure outside 45–75 characters", () => {
    expect(statusOf({ ...healthy(), charsPerLine: 96 }, "measure")).toBe("error");
    expect(statusOf({ ...healthy(), charsPerLine: 80 }, "measure")).toBe("warn");
    expect(statusOf({ ...healthy(), charsPerLine: 60 }, "measure")).toBe("ok");
  });

  it("asks for more line spacing as the measure grows", () => {
    expect(leadingForMeasure(45, "latin")).toBeLessThan(leadingForMeasure(75, "latin"));
    // 1.45x is comfortable on a short measure and tight on a long one.
    const tight = { ...healthy(), charsPerLine: 75, computedLineHeight: 18 * 1.45 };
    const fine = { ...healthy(), charsPerLine: 45, computedLineHeight: 18 * 1.45 };
    expect(statusOf(tight, "leading")).not.toBe("ok");
    expect(statusOf(fine, "leading")).toBe("ok");
  });

  it("holds body text to the 4.5:1 floor", () => {
    expect(statusOf({ ...healthy(), contrast: 4.6 }, "contrast")).toBe("ok");
    expect(statusOf({ ...healthy(), contrast: 4.4 }, "contrast")).toBe("warn");
    expect(statusOf({ ...healthy(), contrast: 2.7 }, "contrast")).toBe("error");
  });

  it("measures level distinction from the rendered sizes, not the ratio setting", () => {
    // The setting claims a wide scale; what is on the page is nearly flat.
    const flat = {
      ...healthy(),
      levelSizes: [
        { level: "title", px: 20 },
        { level: "heading", px: 19 },
        { level: "body", px: 18 },
      ],
    };
    const spec = { ...goodSpec(), scaleRatio: 1.6 };
    expect(statusOf(flat, "scale-distinction", spec)).not.toBe("ok");
    expect(diagnose(spec, flat, 3).find((f) => f.ruleId === "scale-distinction")?.measured).toContain("1.05");
  });

  it("treats a single level as having no hierarchy to judge", () => {
    const one = { ...healthy(), levelSizes: [{ level: "body", px: 18 }] };
    expect(statusOf(one, "scale-distinction")).toBe("ok");
  });

  it("measures whether rendered sizes resolve to one ratio", () => {
    const incoherent = {
      ...healthy(),
      levelSizes: [
        { level: "title", px: 54 },
        { level: "heading", px: 24 },
        { level: "body", px: 18 },
      ],
    };
    const finding = diagnose({ ...goodSpec(), scaleRatio: 1.25 }, incoherent, 2).find((f) => f.ruleId === "scale-coherence");
    expect(finding?.severity).not.toBe("ok");
    expect(finding?.measured).toContain("title");
  });

  it("measures a non-size cue from rendered family and weight", () => {
    const sizeOnly = {
      ...healthy(),
      levelAppearances: healthy().levelAppearances.map((level) => ({
        ...level,
        fontWeight: 400,
        fontFamily: "Inter",
      })),
    };
    expect(statusOf(sizeOnly, "secondary-cue", { ...goodSpec(), headingWeight: 800 })).toBe("error");
    expect(statusOf({
      ...sizeOnly,
      levelAppearances: sizeOnly.levelAppearances.map((level) =>
        level.level === "body" ? level : { ...level, fontFamily: "Source Serif" },
      ),
    }, "secondary-cue")).toBe("ok");
  });

  it("wants more space above a heading than below it", () => {
    expect(statusOf({ ...healthy(), headingSpaceBefore: 10, headingSpaceAfter: 30 }, "heading-proximity")).toBe("warn");
  });

  it("judges paragraph separation against the line box, not the setting", () => {
    const line = healthy().computedLineHeight;
    // A gap that would pass on a tight line box fails on a generous one.
    expect(statusOf({ ...healthy(), paragraphGap: line * 0.5 }, "paragraph-rhythm")).toBe("ok");
    expect(statusOf({ ...healthy(), paragraphGap: line * 0.2 }, "paragraph-rhythm")).toBe("warn");
  });

  it("accepts an indent instead of a gap, but not both", () => {
    expect(statusOf({ ...healthy(), paragraphGap: 0, paragraphIndent: 18 }, "paragraph-rhythm")).toBe("ok");
    expect(statusOf({ ...healthy(), paragraphGap: 14, paragraphIndent: 18 }, "paragraph-rhythm")).toBe("warn");
  });

  it("reports paragraphs that end on a single word", () => {
    expect(statusOf({ ...healthy(), widowCount: 2 }, "widows")).toBe("warn");
  });

  it("suggests a fix that is inside the control's own range", () => {
    const findings = diagnose(INITIAL_SPEC, { ...healthy(), charsPerLine: 108, contrast: 2.7 }, 3);
    for (const finding of findings) {
      if (!finding.suggestion) continue;
      const { control, to } = finding.suggestion;
      expect(to).toBe(clampControl(control, to));
    }
  });
});

describe("a page with no running text", () => {
  it("says the text rules have nothing to judge rather than reporting zeroes", () => {
    const bare: SpecimenMeasurement = { ...healthy(), paragraphCount: 0, charsPerLine: 0, computedLineHeight: 0 };
    const findings = diagnose(goodSpec(), bare, 3);
    for (const id of ["measure", "leading", "widows", "paragraph-rhythm"]) {
      const finding = findings.find((f) => f.ruleId === id);
      expect(finding?.severity).toBe("ok");
      expect(finding?.measured).not.toContain("0 characters");
    }
  });

  it("waits for a second paragraph before judging separation", () => {
    const single: SpecimenMeasurement = { ...healthy(), paragraphCount: 1, paragraphGap: 0 };
    expect(diagnose(goodSpec(), single, 3).find((f) => f.ruleId === "paragraph-rhythm")?.severity).toBe("ok");
  });
});

describe("scale", () => {
  it("derives every step from one ratio", () => {
    const spec = { ...goodSpec(), bodySize: 16, scaleRatio: 1.5 };
    expect(scaleStep(spec, 0)).toBe(16);
    expect(scaleStep(spec, 2)).toBe(36);
  });
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastFromRgb([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(contrastFromRgb([255, 255, 255], [255, 255, 255])).toBe(1);
    // #767676 on white is the canonical 4.54:1 example.
    expect(contrastFromRgb([118, 118, 118], [255, 255, 255])).toBeCloseTo(4.54, 1);
  });
});

describe("clampControl", () => {
  it("keeps agent input inside the range the sliders offer", () => {
    expect(clampControl("measureTarget", 9999)).toBe(120);
    expect(clampControl("measureTarget", -5)).toBe(30);
    expect(clampControl("lineHeight", 1.523)).toBe(1.5);
  });
});

describe("writing systems", () => {
  it("reads Japanese prose as CJK and English as Latin", () => {
    expect(readScript("組版は文字のまわりの空間を決める仕事である。").script).toBe("cjk");
    expect(readScript("Typesetting is the arrangement of space around letters.").script).toBe("latin");
  });

  it("still reads as CJK when Latin words are mixed into Japanese", () => {
    const reading = readScript("WebMCP を使った組版の実験。CSS を書き出せる。");
    expect(reading.script).toBe("cjk");
    expect(reading.mixed).toBe(true);
  });

  it("does not call a 32-glyph Japanese line too short", () => {
    const japanese: SpecimenMeasurement = { ...healthy(), script: "cjk", charsPerLine: 32, computedLineHeight: 30.4, computedFontSize: 16 };
    const finding = diagnose(goodSpec(), japanese, 1).find((f) => f.ruleId === "measure");
    expect(finding?.severity).toBe("ok");
    expect(finding?.measured).toContain("glyphs");
  });

  it("does call the same 32 characters too short in Latin", () => {
    const latin: SpecimenMeasurement = { ...healthy(), script: "latin", charsPerLine: 32 };
    expect(diagnose(goodSpec(), latin, 1).find((f) => f.ruleId === "measure")?.severity).not.toBe("ok");
  });

  it("applies WCAG's CJK ceiling of 40 glyphs", () => {
    const wide: SpecimenMeasurement = { ...healthy(), script: "cjk", charsPerLine: 52 };
    expect(diagnose(goodSpec(), wide, 1).find((f) => f.ruleId === "measure")?.severity).not.toBe("ok");
  });

  it("asks for more leading on Japanese than on Latin at the same fill", () => {
    expect(leadingForMeasure(40, "cjk")).toBeGreaterThan(leadingForMeasure(75, "latin"));
  });

  it("names where each band's numbers come from", () => {
    const japanese: SpecimenMeasurement = { ...healthy(), script: "cjk", charsPerLine: 32 };
    const finding = diagnose(goodSpec(), japanese, 1).find((f) => f.ruleId === "measure");
    expect(finding?.provenance).toContain("WCAG");
    expect(finding?.provenance).toContain("this tool's own");
  });
});

describe("widows across writing systems", () => {
  it("does not call every Japanese paragraph a widow", () => {
    const japanese: SpecimenMeasurement = { ...healthy(), script: "cjk", charsPerLine: 32, widowCount: 0 };
    expect(diagnose(goodSpec(), japanese, 3).find((f) => f.ruleId === "widows")?.severity).toBe("ok");
  });

  it("describes the defect in the terms of the script", () => {
    const japanese: SpecimenMeasurement = { ...healthy(), script: "cjk", charsPerLine: 32, widowCount: 2 };
    const finding = diagnose(goodSpec(), japanese, 3).find((f) => f.ruleId === "widows");
    expect(finding?.measured).toContain("stub of a line");
    expect(finding?.measured).not.toContain("one word");
  });
});
