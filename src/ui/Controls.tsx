import type { Challenge } from "../state/store";
import { FAMILIES, NUMERIC_CONTROLS, NUMERIC_CONTROL_NAMES, type NumericControl, type TypeSpec } from "../typography/spec";
import { RULES } from "../typography/rules";

interface Props {
  spec: TypeSpec;
  unlockedLesson: number;
  challenge: Challenge | null;
  onChange: (control: NumericControl, value: number) => void;
  onFamily: (role: "bodyFamily" | "displayFamily", stack: string) => void;
}

/** Only the controls whose lesson is open are shown. Withholding the rest is
 * the point: an interface that offers everything at once teaches nothing. */
function visibleControls(unlockedLesson: number): NumericControl[] {
  const taught = RULES.filter((rule) => rule.lesson <= unlockedLesson)
    .map((rule) => rule.control)
    .filter((control): control is NumericControl => control !== undefined);
  const unique = new Set(taught);
  return NUMERIC_CONTROL_NAMES.filter((name) => unique.has(name));
}

export default function Controls({ spec, unlockedLesson, challenge, onChange, onFamily }: Props) {
  return (
    <div className="studio__section">
      <h3 className="studio__title">Controls</h3>

      {(["bodyFamily", "displayFamily"] as const).map((role) => (
        <div key={role} className="control">
          <div className="control__row">
            <label className="control__label" htmlFor={`control-${role}`}>
              {role === "bodyFamily" ? "Body face" : "Display face"}
            </label>
          </div>
          <select
            id={`control-${role}`}
            className="select"
            value={spec[role]}
            onChange={(event) => onFamily(role, event.target.value)}
          >
            {FAMILIES.map((family) => (
              <option key={family.stack} value={family.stack}>
                {family.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {visibleControls(unlockedLesson).map((name) => {
        const range = NUMERIC_CONTROLS[name];
        const handed = challenge?.control === name;
        return (
          <div key={name} className={`control${handed ? " control--handed" : ""}`}>
            <div className="control__row">
              <label className="control__label" htmlFor={`control-${name}`}>
                {range.label}
              </label>
              <span className="control__value">
                {spec[name].toFixed(name === "scaleRatio" ? 3 : 2)}
                {range.unit}
              </span>
            </div>
            <input
              id={`control-${name}`}
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={spec[name]}
              onChange={(event) => onChange(name, Number(event.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
