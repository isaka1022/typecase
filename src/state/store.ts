import { record } from "./activity";
import { clear as clearPersisted, load, save } from "./persist";
import { ARTICLE, type Block } from "../content/article";
import { measureSpecimen, type SpecimenMeasurement } from "../typography/measure";
import { clampControl, INITIAL_SPEC, type NumericControl, type TypeSpec } from "../typography/spec";

export interface Challenge {
  ruleId: string;
  control: NumericControl;
  /** The control the agent has handed over. While a challenge is open the
   * agent may not touch it — support is withdrawn on purpose. */
  targetDescription: string;
}

export interface AppState {
  spec: TypeSpec;
  /** The text being set. Starts as the sample essay; the reader can paste their
   * own, which is the point — the rules only transfer if you apply them to
   * something you actually wrote. */
  blocks: Block[];
  usingOwnText: boolean;
  /** Blocks the reader pasted that are not being set, so the page can say so. */
  omittedBlocks: number;
  unlockedLesson: number;
  challenge: Challenge | null;
  /** Rules the reader brought into range with their own hands. */
  solvedByReader: string[];
  lastAgentAction: string | null;
}

export const TOTAL_LESSONS = 3;

const listeners = new Set<() => void>();

const restored = load();

let state: AppState = {
  spec: { ...INITIAL_SPEC, ...restored?.spec },
  blocks: restored?.blocks ?? ARTICLE,
  usingOwnText: restored?.usingOwnText ?? false,
  omittedBlocks: restored?.omittedBlocks ?? 0,
  unlockedLesson: restored?.unlockedLesson ?? 1,
  challenge: null,
  solvedByReader: restored?.solvedByReader ?? [],
  lastAgentAction: null,
};

let specimenRoot: HTMLElement | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AppState {
  return state;
}

function update(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  save({
    spec: state.spec,
    unlockedLesson: state.unlockedLesson,
    solvedByReader: state.solvedByReader,
    blocks: state.blocks,
    usingOwnText: state.usingOwnText,
    omittedBlocks: state.omittedBlocks,
  });
  emit();
}

export function setFamily(role: "bodyFamily" | "displayFamily", value: string): void {
  update({ spec: { ...state.spec, [role]: value } });
}

export function registerSpecimenRoot(el: HTMLElement | null): void {
  specimenRoot = el;
}

/** Measure what is actually on screen right now. Returns null before first paint. */
export function readMeasurement(): SpecimenMeasurement | null {
  if (!specimenRoot) return null;
  return measureSpecimen(specimenRoot);
}

export type ControlSource = "reader" | "agent";

export interface SetControlResult {
  ok: boolean;
  reason?: string;
  from: number;
  to: number;
}

export function setControl(
  control: NumericControl,
  value: number,
  source: ControlSource,
): SetControlResult {
  const from = state.spec[control];
  if (source === "agent" && state.challenge?.control === control) {
    return {
      ok: false,
      reason: `You handed this control to the reader for the "${state.challenge.ruleId}" challenge. Let them move it.`,
      from,
      to: from,
    };
  }
  const to = clampControl(control, value);
  update({
    spec: { ...state.spec, [control]: to },
    ...(source === "agent" ? { lastAgentAction: `set ${control} to ${to}` } : {}),
  });
  return { ok: true, from, to };
}

export function setChallenge(challenge: Challenge | null): void {
  update({ challenge });
}

/**
 * Credit the reader for a rule they brought into range themselves and open the
 * next lesson. Both the UI and `check_attempt` can notice the same solve, so
 * this is idempotent and is the only place a lesson is unlocked.
 */
export function markSolvedByReader(ruleId: string): number {
  if (state.solvedByReader.includes(ruleId)) return state.unlockedLesson;
  const unlockedLesson = Math.min(TOTAL_LESSONS, state.unlockedLesson + 1);
  record({
    actor: "reader",
    headline: `You brought "${ruleId}" into range yourself.`,
    ...(unlockedLesson > state.unlockedLesson ? { detail: `Lesson ${unlockedLesson} is now open.` } : {}),
  });
  update({
    solvedByReader: [...state.solvedByReader, ruleId],
    challenge: null,
    unlockedLesson,
  });
  return unlockedLesson;
}

export function setBlocks(blocks: Block[], usingOwnText: boolean, omittedBlocks = 0): void {
  if (blocks.length === 0) return;
  if (usingOwnText) {
    record({
      actor: "reader",
      headline: "You put your own writing on the page.",
      detail:
        omittedBlocks > 0
          ? `The first ${blocks.length} blocks are set as the specimen; ${omittedBlocks} more are held back.`
          : "Everything below is now measuring your text.",
    });
  }
  update({ blocks, usingOwnText, omittedBlocks });
}

export function resetSpec(): void {
  clearPersisted();
  update({
    spec: { ...INITIAL_SPEC },
    blocks: ARTICLE,
    usingOwnText: false,
    omittedBlocks: 0,
    challenge: null,
    solvedByReader: [],
    lastAgentAction: null,
  });
}
