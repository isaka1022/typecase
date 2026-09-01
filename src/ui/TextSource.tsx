import { useEffect, useRef, useState } from "react";
import { parseText, SPECIMEN_BLOCK_LIMIT } from "../content/parse";
import { specToCss } from "../typography/css";
import type { TypeSpec } from "../typography/spec";
import type { Block } from "../content/article";

interface Props {
  spec: TypeSpec;
  usingOwnText: boolean;
  /** Open state is lifted so the completion card can send the reader here
   * rather than growing a second copy of this panel. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (blocks: Block[], usingOwnText: boolean, omittedBlocks: number) => void;
}

export default function TextSource({ spec, usingOwnText, open, onOpenChange, onLoad }: Props) {
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  /** The panel sits at the foot of a rail that scrolls on its own, so opening it
   * from anywhere else has to bring it into view to mean anything. */
  useEffect(() => {
    if (!open) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }, [open]);

  const load = () => {
    const blocks = parseText(draft);
    if (blocks.length === 0) {
      setProblem("There is nothing to set yet.");
      return;
    }
    if (!blocks.some((block) => block.kind === "paragraph")) {
      setProblem("Add at least one paragraph — most of the rules are about running text, and headings alone give them nothing to measure.");
      return;
    }
    setProblem(null);
    const shown = blocks.slice(0, SPECIMEN_BLOCK_LIMIT);
    onLoad(shown, true, blocks.length - shown.length);
    onOpenChange(false);
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(specToCss(spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="studio__section" ref={ref}>
      <h3 className="studio__title">
        <span>{usingOwnText ? "Your text" : "Sample text"}</span>
        <button type="button" className="reset" onClick={() => onOpenChange(!open)}>
          {open ? "close" : "paste your own"}
        </button>
      </h3>

      {open ? (
        <>
          <p className="note">
            Paste something you wrote. A line starting with <code>##</code> becomes a heading; blank lines
            separate paragraphs.
          </p>
          <textarea
            className="paste"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setProblem(null);
            }}
            placeholder={"## A heading\n\nA paragraph of your own writing, long enough to wrap over several lines."}
            rows={7}
          />
          {problem && (
            <p className="note paste__problem" role="alert">
              {problem}
            </p>
          )}
          <div className="paste__actions">
            <button type="button" className="reset" onClick={load} disabled={draft.trim().length === 0}>
              set this text
            </button>
          </div>
        </>
      ) : (
        <p className="note">
          {usingOwnText
            ? "The diagnosis below is measuring your own writing."
            : "Set the sample, or paste your own writing and set that instead — the rules only transfer when you apply them to something you wrote."}
        </p>
      )}

      <div className="paste__actions" style={{ marginTop: 12 }}>
        <button type="button" className="reset" onClick={copyCss}>
          {copied ? "css copied" : "copy the css"}
        </button>
      </div>
    </div>
  );
}
