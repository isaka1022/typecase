/**
 * The tool surface is re-registered asynchronously when the reader's progress
 * changes what the agent may do. A tool that announces new capability has to
 * wait for that registration, or the agent's next call meets the old surface.
 *
 * This module is the seam between the tools and the registrar, which would
 * otherwise import each other.
 */
let pending: Promise<void> = Promise.resolve();

export function setPendingSync(promise: Promise<void>): void {
  pending = promise;
}

export function whenSynced(): Promise<void> {
  return pending;
}
