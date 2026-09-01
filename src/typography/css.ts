import { inkColor, scaleStep, type TypeSpec } from "./spec";

/**
 * The settings as CSS the reader can paste into their own project. This is what
 * turns the lesson into something they keep: the exercise ends with the rules
 * they just satisfied, expressed in their own stylesheet.
 */
export function specToCss(spec: TypeSpec): string {
  return `:root {
  --measure: ${spec.measureTarget}ch;
  --body-size: ${spec.bodySize}px;
  --line-height: ${spec.lineHeight};
  --scale-ratio: ${spec.scaleRatio};
  --ink: ${inkColor(spec)};
  --paper: ${spec.paper};
}

body {
  max-width: var(--measure);
  margin-inline: auto;
  font-family: ${spec.bodyFamily};
  font-size: var(--body-size);
  line-height: var(--line-height);
  color: var(--ink);
  background: var(--paper);
}

h1 { font-family: ${spec.displayFamily}; font-size: ${scaleStep(spec, 4)}px; font-weight: ${spec.headingWeight}; line-height: 1.08; }
h2 { font-family: ${spec.displayFamily}; font-size: ${scaleStep(spec, 2)}px; font-weight: ${spec.headingWeight}; line-height: 1.2; }

h2 {
  margin-top: ${spec.headingSpaceBefore}em;
  margin-bottom: ${spec.headingSpaceAfter}em;
}

p + p {
  margin-top: ${spec.paragraphSpacing}em;
  text-indent: ${spec.paragraphIndent}em;
}
`;
}
