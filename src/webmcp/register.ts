import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";
import { getState, subscribe } from "../state/store";
import { buildTools } from "./tools";
import { setPendingSync } from "./sync";

export type RuntimeKind = "native" | "polyfill" | "unavailable";

export interface RuntimeStatus {
  kind: RuntimeKind;
  toolNames: string[];
  error: string | null;
}

let status: RuntimeStatus = { kind: "unavailable", toolNames: [], error: null };
const statusListeners = new Set<(status: RuntimeStatus) => void>();

function setStatus(next: RuntimeStatus): void {
  status = next;
  for (const listener of statusListeners) listener(next);
}

export function getRuntimeStatus(): RuntimeStatus {
  return status;
}

export function onRuntimeStatus(listener: (status: RuntimeStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/**
 * The set of tools the agent can see is derived from how far the reader has
 * got. When that changes we tear the registration down and put up the new one,
 * so `getTools()` always reflects what is actually available right now.
 */
function surfaceSignature(): string {
  const { unlockedLesson, challenge } = getState();
  return `${unlockedLesson}:${challenge?.control ?? "-"}`;
}

/** Per-tool registrations, keyed by tool name. Only the tools whose descriptor
 * actually changed are torn down and put back up; re-registering the whole
 * surface would leave a window in which an agent mid-call finds nothing. */
const registrations = new Map<string, { controller: AbortController; signature: string }>();

/** Whether this page installed the polyfill. Checked once, because after the
 * polyfill runs `document.modelContext` exists and a second probe would report
 * a native runtime that is not there. */
let installedPolyfill = false;

function descriptorSignature(tool: Record<string, unknown>): string {
  const { execute: _execute, ...rest } = tool;
  return JSON.stringify(rest);
}

async function syncTools(): Promise<void> {
  const context = document.modelContext;
  if (!context) return;

  const tools = buildTools();
  const wanted = new Map(tools.map((tool) => [String(tool["name"]), tool]));

  for (const [name, existing] of registrations) {
    if (!wanted.has(name)) {
      existing.controller.abort();
      registrations.delete(name);
    }
  }

  try {
    for (const [name, tool] of wanted) {
      const signature = descriptorSignature(tool);
      const existing = registrations.get(name);
      if (existing && existing.signature === signature) continue;
      existing?.controller.abort();
      const controller = new AbortController();
      await context.registerTool(tool as never, { signal: controller.signal });
      registrations.set(name, { controller, signature });
    }
    setStatus({ ...status, toolNames: [...wanted.keys()], error: null });
  } catch (error) {
    setStatus({ ...status, error: error instanceof Error ? error.message : String(error) });
  }
}

/** Serialise syncs so two rapid state changes cannot interleave registrations. */
let syncChain: Promise<void> = Promise.resolve();
function scheduleSync(): void {
  syncChain = syncChain.then(syncTools).catch(() => {});
  setPendingSync(syncChain);
}

export function startWebMCP(): () => void {
  const hadNative = typeof document.modelContext !== "undefined" && !installedPolyfill;
  if (!hadNative) {
    try {
      initializeWebMCPPolyfill();
      installedPolyfill = true;
    } catch (error) {
      setStatus({ kind: "unavailable", toolNames: [], error: error instanceof Error ? error.message : String(error) });
      return () => {};
    }
  }

  const available = typeof document.modelContext !== "undefined";
  setStatus({
    kind: available ? (hadNative ? "native" : "polyfill") : "unavailable",
    toolNames: [],
    error: available ? null : "document.modelContext is unavailable in this browser.",
  });
  if (!available) return () => {};

  let lastSignature = surfaceSignature();
  scheduleSync();

  const unsubscribe = subscribe(() => {
    const signature = surfaceSignature();
    if (signature === lastSignature) return;
    lastSignature = signature;
    scheduleSync();
  });

  return () => {
    unsubscribe();
    for (const { controller } of registrations.values()) controller.abort();
    registrations.clear();
  };
}
