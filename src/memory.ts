/**
 * Cloud Superbrain helpers for the SuperAgent API: an end user's memory erased in one call, and a Memory Answer
 * read as it is written. Both are ordinary managed operations (`memory.erase`, `memory.answer` with
 * `stream: true`); these types and the event reader save each app from writing its own.
 */

/** What `memory.erase` returns: what went, and whether the end user's memory is now empty. */
export type HivemindOSMemoryErasure = {
  ok?: true;
  /** True when nothing of the end user's memory is left. */
  erased: boolean;
  /** False when the brain was too large for one call, or something was written while it ran: call again. */
  complete: boolean;
  memoriesErased: number;
  vectorsErased: number;
  /** How the search vectors went: deleted now, queued for deletion, none to delete, or failed (logged). */
  vectorCleanup: "none" | "deleted" | "queued" | "failed";
  erasureId: string;
  erasedAt: string;
  scope: { project: string | null; endUser: true };
  /** Always 0: an erase is never charged. */
  chargedCredits: number;
};

/** The input of a Memory Answer; `stream` is set by `memory.answerStream`. */
export type HivemindOSMemoryAnswerInput = {
  query: string;
  /** A reader from `memory.models`; absent, the default reader. */
  model?: string;
  reasoningEffort?: "none" | "low" | "medium" | "high";
  private?: boolean;
  turbo?: boolean;
  project?: string;
  tags?: string[];
  path?: string;
  limit?: number;
  [field: string]: unknown;
};

/** Everything a buffered Memory Answer returns except the answer itself, sent before the first words. */
export type HivemindOSMemoryAnswerMeta = {
  ok: true;
  stream: true;
  chargedCredits: number;
  citedMemoryIds?: string[];
  hits?: Array<Record<string, unknown>>;
  reader?: { model: string; provider: string; privacy: string; reasoningEffort?: string };
  privacy?: string;
  turbo?: boolean;
  [field: string]: unknown;
};

export type HivemindOSMemoryAnswerEvent =
  | { type: "meta"; meta: HivemindOSMemoryAnswerMeta }
  | { type: "delta"; text: string }
  | { type: "done"; answer: string; chargedCredits: number }
  /** The reader failed after it started. The answer so far stands, and so does its one charge. */
  | { type: "error"; error: string; chargedCredits: number };

/** A streamed Memory Answer once it has started: its one charge is already settled. */
export type HivemindOSMemoryAnswerStream = {
  /** The credits this answer cost, settled when the reader's first words arrived (also in `x-hivemindos-credits-charged`). */
  chargedCredits: number;
  /** meta, then delta events as the answer is written, then done (or error). Read it once. */
  events: AsyncIterable<HivemindOSMemoryAnswerEvent>;
  /** Stop reading. The answer is not charged again, and is not refunded: it was charged once, when it started. */
  cancel(): Promise<void>;
};

/** The answer's events from a server-sent event stream. A malformed event is skipped. */
export async function* memoryAnswerEvents(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<HivemindOSMemoryAnswerEvent> {
  if (signal?.aborted) {
    await body.cancel(signal.reason).catch(() => undefined);
    return;
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const onAbort = () => { void reader.cancel(signal?.reason).catch(() => undefined); };
  signal?.addEventListener("abort", onAbort, { once: true });
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, "");
        const event = memoryAnswerEvent(block);
        if (event) yield event;
      }
    }
    const last = memoryAnswerEvent(buffer);
    if (last) yield last;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await reader.cancel().catch(() => undefined);
  }
}

function memoryAnswerEvent(block: string): HivemindOSMemoryAnswerEvent | null {
  const lines = block.split(/\r?\n/);
  const name = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
  if (!name || !data) return null;
  let value: Record<string, unknown>;
  try { value = JSON.parse(data) as Record<string, unknown>; } catch { return null; }
  const credits = Number(value.chargedCredits ?? 0);
  if (name === "meta") return { type: "meta", meta: value as HivemindOSMemoryAnswerMeta };
  if (name === "delta" && typeof value.text === "string") return { type: "delta", text: value.text };
  if (name === "done") return { type: "done", answer: typeof value.answer === "string" ? value.answer : "", chargedCredits: credits };
  if (name === "error") return { type: "error", error: typeof value.error === "string" ? value.error : "The answer stopped.", chargedCredits: credits };
  return null;
}

/** Reads a streamed answer to its end: the whole answer, and whether it completed. */
export async function collectMemoryAnswer(stream: Pick<HivemindOSMemoryAnswerStream, "events">): Promise<{ answer: string; complete: boolean; chargedCredits: number; meta: HivemindOSMemoryAnswerMeta | null; error?: string }> {
  let answer = "";
  let meta: HivemindOSMemoryAnswerMeta | null = null;
  for await (const event of stream.events) {
    if (event.type === "meta") meta = event.meta;
    else if (event.type === "delta") answer += event.text;
    else if (event.type === "done") return { answer: event.answer || answer, complete: true, chargedCredits: event.chargedCredits, meta };
    else return { answer, complete: false, chargedCredits: event.chargedCredits, meta, error: event.error };
  }
  return { answer, complete: false, chargedCredits: meta?.chargedCredits ?? 0, meta, error: "The stream ended before the answer was complete." };
}
