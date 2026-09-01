import { useEffect, useRef, useState } from "react";
import { specToCss } from "../typography/css";
import type { Finding } from "../typography/diagnose";
import { controlChanges } from "../typography/summary";
import type { TypeSpec } from "../typography/spec";

interface Props {
  spec: TypeSpec;
  findings: Finding[];
  solvedByReader: string[];
  usingOwnText: boolean;
  onUseOwnText: () => void;
  onReset: () => void;
}

export default function Completion({ spec, findings, solvedByReader, usingOwnText, onUseOwnText, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLElement>(null);

  /** Bring the result into view: the reader may be halfway down the page when
   * the last rule comes into range, and the moment is worth seeing. */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, []);

  const changes = controlChanges(spec);
  const css = specToCss(spec);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="done" ref={ref} aria-label="Result">
      <header className="done__head">
        <h2 className="done__title">The page is set</h2>
        <button type="button" className="reset" onClick={onReset}>
          start over
        </button>
      </header>

      <p className="done__lede">
        All {findings.length} rules pass. You brought {solvedByReader.length} of them into range yourself.
      </p>

      <table className="done__table">
        <tbody>
          {changes.map((change) => (
            <tr key={change.control}>
              <th scope="row">{change.label}</th>
              <td className="done__from">{change.from}</td>
              <td className="done__to">{change.to}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="done__closing">
        None of these are house style. They are the ranges the measurements ask for, and they will ask for
        different numbers when the text, the size or the column changes — which is the actual lesson.
      </p>

      <div className="paste__actions">
        <button type="button" className="reset" onClick={copy}>
          {copied ? "copied" : "copy this as css"}
        </button>
      </div>
      <pre className="done__css">{css}</pre>

      {!usingOwnText && (
        <div className="done__next">
          <p>
            These numbers were fitted to the sample. Put in something you wrote and the measurements will
            change — which is the only way to find out whether you learned the rule or just this page.
          </p>
          <button type="button" className="reset" onClick={onUseOwnText}>
            set your own writing
          </button>
        </div>
      )}
    </section>
  );
}
