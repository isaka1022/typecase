import type { Finding } from "./diagnose";
import { INITIAL_SPEC, NUMERIC_CONTROLS, NUMERIC_CONTROL_NAMES, type NumericControl, type TypeSpec } from "./spec";

export interface ControlChange {
  control: NumericControl;
  label: string;
  from: string;
  to: string;
}

/** What actually moved between the deliberately flawed starting point and where
 * the page ended up. This is the record of the work, so it reads in the
 * controls' own units rather than as raw numbers. */
export function controlChanges(spec: TypeSpec): ControlChange[] {
  return NUMERIC_CONTROL_NAMES.flatMap((control) => {
    const from = INITIAL_SPEC[control];
    const to = spec[control];
    if (from === to) return [];
    const { label, unit } = NUMERIC_CONTROLS[control];
    const digits = control === "scaleRatio" ? 3 : 2;
    return [{ control, label, from: `${from.toFixed(digits)}${unit}`, to: `${to.toFixed(digits)}${unit}` }];
  });
}

export function isComplete(findings: Finding[], unlockedLesson: number, totalLessons: number): boolean {
  return (
    unlockedLesson >= totalLessons && findings.length > 0 && findings.every((f) => f.severity === "ok")
  );
}
