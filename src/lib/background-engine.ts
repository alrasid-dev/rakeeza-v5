/**
 * Background Engine (دعم العمل في الخلفية).
 *
 * Runs heavy parsing/analysis/adaptation without freezing the UI by yielding
 * to the browser event loop between chunks. Browser + Node safe.
 */

export type BackgroundOptions = {
  /** Initial yield budget in ms before the first chunk. */
  yieldMs?: number;
  /** Chunk size for array-processing loops. */
  chunkSize?: number;
  /** Prefer requestIdleCallback when available. */
  useIdle?: boolean;
};

function schedule(fn: () => void, ms: number, useIdle: boolean): void {
  const g = globalThis as {
    requestIdleCallback?: (cb: () => void) => void;
    setTimeout?: typeof setTimeout;
  };
  if (useIdle && typeof g.requestIdleCallback === 'function') {
    g.requestIdleCallback(fn);
    return;
  }
  if (typeof g.setTimeout === 'function') {
    g.setTimeout(fn, ms);
    return;
  }
  fn();
}

/** Yield control to the event loop, then resolve. */
export function yieldToUi(ms = 0, useIdle = true): Promise<void> {
  return new Promise((resolve) => schedule(resolve, ms, useIdle));
}

/** Run a synchronous (possibly heavy) task asynchronously without blocking. */
export async function runInBackground<T>(task: () => T, opts?: BackgroundOptions): Promise<T> {
  await yieldToUi(opts?.yieldMs ?? 0, opts?.useIdle ?? true);
  return task();
}

/**
 * Run a chunked mapping task over a large array in the background.
 * Yields between chunks so the main thread stays responsive.
 */
export async function mapInBackground<T, R>(
  items: T[],
  mapFn: (item: T, index: number) => R,
  opts?: BackgroundOptions,
): Promise<R[]> {
  const chunk = opts?.chunkSize ?? 250;
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunk) {
    const end = Math.min(i + chunk, items.length);
    for (let j = i; j < end; j += 1) out[j] = mapFn(items[j], j);
    if (end < items.length) await yieldToUi(opts?.yieldMs ?? 0, opts?.useIdle ?? true);
  }
  return out;
}

/** Deferred wrapper: run `task` once the caller has painted / idled. */
export function scheduleBackground<T>(task: () => T, opts?: BackgroundOptions): Promise<T> {
  return runInBackground(task, opts);
}
