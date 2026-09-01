import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Activity from "./ui/Activity";
import AgentPanel from "./ui/AgentPanel";
import Completion from "./ui/Completion";
import Controls from "./ui/Controls";
import Diagnostics from "./ui/Diagnostics";
import Masthead from "./ui/Masthead";
import Specimen from "./ui/Specimen";
import TextSource from "./ui/TextSource";
import { getActivity, record, subscribeActivity } from "./state/activity";
import {
  getState,
  markSolvedByReader,
  readMeasurement,
  resetSpec,
  setBlocks,
  setControl,
  setFamily,
  subscribe,
  TOTAL_LESSONS,
} from "./state/store";
import { diagnose, type Finding } from "./typography/diagnose";
import { isComplete } from "./typography/summary";
import type { NumericControl } from "./typography/spec";
import { getRuntimeStatus, onRuntimeStatus, startWebMCP, type RuntimeStatus } from "./webmcp/register";

export default function App() {
  const state = useSyncExternalStore(subscribe, getState);
  const activity = useSyncExternalStore(subscribeActivity, getActivity);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reading, setReading] = useState<{ script: "latin" | "cjk"; mixed: boolean }>({
    script: "latin",
    mixed: false,
  });
  const [status, setStatus] = useState<RuntimeStatus>(getRuntimeStatus);
  const [pasteOpen, setPasteOpen] = useState(false);

  useEffect(() => {
    const stop = startWebMCP();
    setStatus(getRuntimeStatus());
    const unsubscribe = onRuntimeStatus(setStatus);
    return () => {
      unsubscribe();
      stop();
    };
  }, []);

  /** Re-read the page after it has laid out, never from the settings object. */
  const remeasure = useCallback(() => {
    const measurement = readMeasurement();
    if (!measurement) return;
    setFindings(diagnose(getState().spec, measurement, getState().unlockedLesson));
    setReading({ script: measurement.script, mixed: measurement.mixedScript });
  }, []);

  useEffect(() => {
    const onResize = () => remeasure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [remeasure]);

  /**
   * Re-read the page whenever the state that produced it changes. This runs in
   * a layout effect rather than an animation frame on purpose: rAF is throttled
   * to a stop in a background tab, and an agent working the page while the
   * reader is looking at another tab would otherwise see a frozen diagnosis.
   * Reading geometry here forces the pending layout, which is exactly what the
   * measurements need.
   */
  useLayoutEffect(() => {
    remeasure();
  }, [state.spec, state.blocks, state.unlockedLesson, remeasure]);

  /** When the reader themselves brings the handed-over rule into range, credit
   * them for it and open the next lesson. */
  useEffect(() => {
    const challenge = state.challenge;
    if (!challenge) return;
    const finding = findings.find((f) => f.ruleId === challenge.ruleId);
    if (finding?.severity === "ok") markSolvedByReader(challenge.ruleId);
  }, [findings, state.challenge]);

  /** Opening a lesson brings new rules into scope without changing the layout,
   * so the diagnosis has to be re-run even though nothing moved. */
  useEffect(() => {
    remeasure();
  }, [state.unlockedLesson, remeasure]);

  const complete = isComplete(findings, state.unlockedLesson, TOTAL_LESSONS);
  const announced = useRef(false);

  useEffect(() => {
    if (!complete) {
      announced.current = false;
      return;
    }
    if (announced.current) return;
    announced.current = true;
    record({
      actor: "reader",
      headline: "Every rule in the page now passes.",
      detail: "The settings are yours to take away as CSS.",
    });
  }, [complete]);

  const handleControl = useCallback((control: NumericControl, value: number) => {
    setControl(control, value, "reader");
  }, []);

  return (
    <div className="app">
      <Masthead usingOwnText={state.usingOwnText} />
      <main className="stage">
        {complete && (
          <Completion
            spec={state.spec}
            findings={findings}
            solvedByReader={state.solvedByReader}
            usingOwnText={state.usingOwnText}
            onUseOwnText={() => setPasteOpen(true)}
            onReset={resetSpec}
          />
        )}
        <Specimen
          spec={state.spec}
          blocks={state.blocks}
          usingOwnText={state.usingOwnText}
          omittedBlocks={state.omittedBlocks}
          onLayout={remeasure}
        />
      </main>
      <aside className="studio" id="studio">
        <AgentPanel
          status={status}
          challenge={state.challenge}
          unlockedLesson={state.unlockedLesson}
          onReset={resetSpec}
        />
        {/* The rail follows the loop the lesson asks for: read the premise, see
            what the page currently measures, reach for a control, then look at
            what changed. Taking your own text away is the last step, not the first. */}
        <Diagnostics findings={findings} script={reading.script} mixedScript={reading.mixed} />
        <Controls
          spec={state.spec}
          unlockedLesson={state.unlockedLesson}
          challenge={state.challenge}
          onChange={handleControl}
          onFamily={setFamily}
        />
        <Activity entries={activity} />
        <TextSource
          spec={state.spec}
          usingOwnText={state.usingOwnText}
          open={pasteOpen}
          onOpenChange={setPasteOpen}
          onLoad={setBlocks}
        />
      </aside>
    </div>
  );
}
