import type { RuntimeStatus } from "../webmcp/register";
import type { Challenge } from "../state/store";
import { lessonFor, lessonRuleCount, LESSONS } from "../curriculum/lessons";

interface Props {
  status: RuntimeStatus;
  challenge: Challenge | null;
  unlockedLesson: number;
  onReset: () => void;
}

const RUNTIME_COPY: Record<RuntimeStatus["kind"], string> = {
  native: "Chrome is providing the WebMCP runtime, so an agent can discover this page's tools directly.",
  polyfill: "Running on the WebMCP polyfill. The tools are registered and callable; Chrome's own runtime is not switched on.",
  unavailable: "No WebMCP runtime here. The sliders and the diagnosis still work — only the agent side is missing.",
};

export default function AgentPanel({ status, challenge, unlockedLesson, onReset }: Props) {
  const lesson = lessonFor(unlockedLesson);

  return (
    <>
      <div className="studio__section">
        <h3 className="studio__title">
          <span>Agent surface</span>
          <span className={`badge badge--${status.kind}`}>{status.kind}</span>
        </h3>
        <p className="note">{RUNTIME_COPY[status.kind]}</p>
        {status.kind === "unavailable" && (
          <p className="note" style={{ marginTop: 10 }}>
            Enable <code>chrome://flags/#enable-webmcp-testing</code> and reload, or open this page in a browser
            with a WebMCP runtime.
          </p>
        )}
        {status.error && (
          <p className="note" style={{ marginTop: 10, color: "var(--studio-error)" }}>
            {status.error}
          </p>
        )}
        {status.toolNames.length > 0 && (
          <details className="dev-details">
            <summary>{status.toolNames.length} tools declared</summary>
            <ul className="tools" style={{ marginTop: 10 }}>
              {status.toolNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            <p className="note" style={{ marginTop: 10 }}>
              Call these by hand in DevTools → Application → WebMCP.
            </p>
          </details>
        )}
      </div>

      <div className="studio__section">
        <h3 className="studio__title">
          <span>
            Lesson {unlockedLesson} of {LESSONS.length} — {lesson.title}
          </span>
          <button type="button" className="reset" onClick={onReset}>
            reset
          </button>
        </h3>
        <div className="lesson-row">
          {LESSONS.map((entry) => (
            <span
              key={entry.number}
              className={`lesson-pip${entry.number <= unlockedLesson ? " lesson-pip--open" : ""}`}
            />
          ))}
        </div>
        <p className="note">{lesson.premise}</p>
        <p className="note lesson-count">
          {lessonRuleCount(lesson.number)} rules come into scope in this lesson.
        </p>
        {challenge ? (
          <div className="challenge">
            <h4>your turn</h4>
            <p>
              The agent has stepped back from this control. Bring <strong>{challenge.ruleId}</strong> into range
              yourself: {challenge.targetDescription}.
            </p>
          </div>
        ) : (
          <p className="note lesson-prompt">{lesson.prompt}</p>
        )}
      </div>
    </>
  );
}
