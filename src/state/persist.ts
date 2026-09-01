import type { Block } from "../content/article";
import { INITIAL_SPEC, type TypeSpec } from "../typography/spec";

const KEY = "typecase:v1";

export interface PersistedState {
  spec: TypeSpec;
  unlockedLesson: number;
  solvedByReader: string[];
  blocks: Block[];
  usingOwnText: boolean;
  omittedBlocks: number;
}

/** Storage can throw outright in a private window or with site data blocked, so
 * every access is guarded and a failure simply means starting fresh. */
export function load(): Partial<PersistedState> | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== "object") return null;
    const spec = parsed.spec;
    if (!spec || typeof spec !== "object") return null;
    // Drop anything whose shape has drifted since it was written.
    for (const key of Object.keys(INITIAL_SPEC) as Array<keyof TypeSpec>) {
      if (typeof spec[key] !== typeof INITIAL_SPEC[key]) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function save(state: PersistedState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Nothing to do: the studio works perfectly well without remembering.
  }
}

export function clear(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignored
  }
}
