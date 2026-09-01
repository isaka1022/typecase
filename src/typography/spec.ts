/**
 * The typographic state of the specimen. This object is the single source of
 * truth that both the reader and the agent edit — it lives only in the page.
 */
export interface TypeSpec {
  bodyFamily: string;
  displayFamily: string;
  bodySize: number;
  lineHeight: number;
  measureTarget: number;
  scaleRatio: number;
  paragraphSpacing: number;
  headingSpaceBefore: number;
  headingSpaceAfter: number;
  inkLightness: number;
  paper: string;
}

export interface FamilyOption {
  label: string;
  stack: string;
}

export const FAMILIES: FamilyOption[] = [
  { label: "Source Serif", stack: '"Source Serif 4", Georgia, serif' },
  { label: "Inter", stack: '"Inter", system-ui, sans-serif' },
  { label: "IBM Plex Mono", stack: '"IBM Plex Mono", ui-monospace, monospace' },
];

const FALLBACK = FAMILIES[1]!;

/** Deliberately flawed starting point: every lesson has something to fix. */
export const INITIAL_SPEC: TypeSpec = {
  bodyFamily: FALLBACK.stack,
  displayFamily: FALLBACK.stack,
  bodySize: 15,
  lineHeight: 1.25,
  measureTarget: 108,
  scaleRatio: 1.111,
  paragraphSpacing: 0,
  headingSpaceBefore: 0.6,
  headingSpaceAfter: 0.9,
  inkLightness: 62,
  paper: "#ffffff",
};

export interface ControlRange {
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
}

export const NUMERIC_CONTROLS = {
  bodySize: { min: 12, max: 24, step: 0.5, unit: "px", label: "Body size" },
  lineHeight: { min: 1.0, max: 2.2, step: 0.05, unit: "×", label: "Line spacing" },
  measureTarget: { min: 30, max: 120, step: 1, unit: "ch", label: "Measure" },
  scaleRatio: { min: 1.05, max: 1.8, step: 0.005, unit: "×", label: "Scale ratio" },
  paragraphSpacing: { min: 0, max: 2, step: 0.05, unit: "em", label: "Paragraph spacing" },
  headingSpaceBefore: { min: 0, max: 4, step: 0.05, unit: "em", label: "Space above heading" },
  headingSpaceAfter: { min: 0, max: 4, step: 0.05, unit: "em", label: "Space below heading" },
  inkLightness: { min: 8, max: 70, step: 1, unit: "%", label: "Ink lightness" },
} as const satisfies Record<string, ControlRange>;

export type NumericControl = keyof typeof NUMERIC_CONTROLS;

export const NUMERIC_CONTROL_NAMES = Object.keys(NUMERIC_CONTROLS) as NumericControl[];

export function isNumericControl(name: string): name is NumericControl {
  return Object.prototype.hasOwnProperty.call(NUMERIC_CONTROLS, name);
}

/** Clamp to the control's range and snap to its step, so tool input can never
 * put the specimen into a state the sliders could not also reach. */
export function clampControl(name: NumericControl, value: number): number {
  const range = NUMERIC_CONTROLS[name];
  const clamped = Math.min(range.max, Math.max(range.min, value));
  const snapped = Math.round(clamped / range.step) * range.step;
  return Number(snapped.toFixed(3));
}

/** Sizes derived from the modular scale, in px. step 0 is the body size. */
export function scaleStep(spec: TypeSpec, step: number): number {
  return Number((spec.bodySize * Math.pow(spec.scaleRatio, step)).toFixed(2));
}

/** The ink is a single lightness on one hue, so that contrast is something the
 * reader can actually move rather than a verdict they can only read. */
export function inkColor(spec: TypeSpec): string {
  return `hsl(215 9% ${spec.inkLightness}%)`;
}
