import type { Script } from "./script";

/**
 * The ranges each rule judges against, per writing system.
 *
 * Provenance is tracked per number rather than per rule, because the two are
 * not equally well supported. Where a standard states a figure it is cited and
 * used unchanged; where none does, the number is this tool's own calibration
 * and says so. A diagnosis that dresses a preference up as a citation is worse
 * than no diagnosis, so the distinction is carried all the way to the panel.
 */
export interface Band {
  min: number;
  max: number;
  /** Outside these the finding is an error rather than a warning. */
  hardMin: number;
  hardMax: number;
  /** Shown under the rule. States which end of the band is a cited figure. */
  provenance: string;
}

export interface Bands {
  measure: Band;
  leading: Band;
  /** What one "character" means when counting a line, in the reader's terms. */
  unit: string;
}

const LATIN: Bands = {
  measure: {
    min: 45,
    max: 75,
    hardMin: 35,
    hardMax: 95,
    provenance:
      "45–75 characters is Bringhurst's range for a single column. WCAG 1.4.8 sets a separate ceiling of 80.",
  },
  leading: {
    min: 1.4,
    max: 1.7,
    hardMin: 1.1,
    hardMax: 2.2,
    provenance:
      "Scaled to the measure rather than fixed. WCAG 1.4.8 asks for a flat 1.5×, so a short column can pass here at 1.4× and still fall short of it.",
  },
  unit: "characters",
};

const CJK: Bands = {
  measure: {
    min: 20,
    max: 40,
    hardMin: 12,
    hardMax: 55,
    provenance:
      "40 glyphs is WCAG 1.4.8's ceiling for CJK, quoted exactly. The lower bound is this tool's own — no standard checked states one.",
  },
  leading: {
    min: 1.6,
    max: 2.0,
    hardMin: 1.3,
    hardMax: 2.6,
    provenance:
      "This tool's calibration, not a cited figure. Full-width glyphs have no ascender and descender rhythm to open the line up, so Japanese text reads tighter than Latin at the same line height. It clears WCAG 1.4.8's 1.5× floor at every point.",
  },
  unit: "glyphs",
};

export function bandsFor(script: Script): Bands {
  return script === "cjk" ? CJK : LATIN;
}

/** Line spacing the measure asks for: longer lines need more air to return to. */
export function leadingForMeasure(charsPerLine: number, script: Script): number {
  const { measure, leading } = bandsFor(script);
  const span = measure.max - measure.min;
  const t = span <= 0 ? 0 : Math.min(1, Math.max(0, (charsPerLine - measure.min) / span));
  return Number((leading.min + t * (leading.max - leading.min)).toFixed(2));
}
