/**
 * What the agent has done, in the reader's language. The panel that shows this
 * is the only place the collaboration is visible, so entries are written as
 * statements about the page rather than as tool traces.
 */
export interface ActivityEntry {
  id: number;
  actor: "agent" | "reader";
  headline: string;
  detail?: string;
  source?: string;
  at: number;
}

let nextId = 1;
let entries: ActivityEntry[] = [];
const listeners = new Set<() => void>();

const MAX_ENTRIES = 40;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActivity(): ActivityEntry[] {
  return entries;
}

export function record(entry: Omit<ActivityEntry, "id" | "at">): void {
  entries = [
    { ...entry, id: nextId++, at: Date.now() },
    ...entries,
  ].slice(0, MAX_ENTRIES);
  emit();
}

export function clearActivity(): void {
  entries = [];
  emit();
}
