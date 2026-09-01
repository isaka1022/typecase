import { useEffect, useRef } from "react";
import { ARTICLE_STANDFIRST, ARTICLE_TITLE, type Block } from "../content/article";
import { registerSpecimenRoot } from "../state/store";
import { inkColor, scaleStep, type TypeSpec } from "../typography/spec";

interface Props {
  spec: TypeSpec;
  blocks: Block[];
  usingOwnText: boolean;
  onLayout: () => void;
  omittedBlocks: number;
}

export default function Specimen({ spec, blocks, usingOwnText, onLayout, omittedBlocks }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerSpecimenRoot(ref.current);
    return () => registerSpecimenRoot(null);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => onLayout());
    observer.observe(element);
    // Web fonts change every measurement on the page, so re-read once they land.
    document.fonts?.ready.then(() => onLayout()).catch(() => {});
    return () => observer.disconnect();
  }, [onLayout]);

  return (
    <div
      className="paper"
      ref={ref}
      style={{
        maxWidth: `calc(${spec.measureTarget}ch + 128px)`,
        background: spec.paper,
        color: inkColor(spec),
        fontFamily: spec.bodyFamily,
        fontSize: `${spec.bodySize}px`,
        lineHeight: spec.lineHeight,
      }}
    >
      <div style={{ maxWidth: `${spec.measureTarget}ch` }}>
        <div className="paper__eyebrow" style={{ fontFamily: spec.displayFamily }}>
          {usingOwnText ? "Your text" : "Specimen"}
        </div>
        {!usingOwnText && (
          <>
            <h1
              className="paper__title"
              data-level="title"
              style={{ fontFamily: spec.displayFamily, fontSize: `${scaleStep(spec, 4)}px` }}
            >
              {ARTICLE_TITLE}
            </h1>
            <p className="paper__standfirst" data-level="standfirst" style={{ fontSize: `${scaleStep(spec, 1)}px` }}>
              {ARTICLE_STANDFIRST}
            </p>
          </>
        )}

        {blocks.map((block, index) =>
          block.kind === "subheading" ? (
            <h2
              key={index}
              data-measure="heading"
              data-level="heading"
              style={{
                fontFamily: spec.displayFamily,
                fontSize: `${scaleStep(spec, 2)}px`,
                marginTop: `${spec.headingSpaceBefore}em`,
                marginBottom: `${spec.headingSpaceAfter}em`,
              }}
            >
              {block.text}
            </h2>
          ) : (
            <p
              key={index}
              data-measure="paragraph"
              data-level="body"
              style={{ marginTop: index === 0 ? 0 : `${spec.paragraphSpacing}em` }}
            >
              {block.text}
            </p>
          ),
        )}
        {omittedBlocks > 0 && (
          <p className="specimen__limit" data-measure="ignore">
            {omittedBlocks} more block{omittedBlocks === 1 ? "" : "s"} of your text are held back. A specimen is
            enough to judge a setting, and a shorter page keeps the controls responsive — the CSS you leave with
            applies to all of it.
          </p>
        )}
      </div>
    </div>
  );
}
