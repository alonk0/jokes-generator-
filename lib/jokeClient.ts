import { failureFromStatus, type JokeFailure } from "./errors";
import { createSseParser } from "./sse";

export type JokeResult =
  | { status: "completed" }
  | { status: "aborted" }
  | { status: "failed"; failure: JokeFailure };

type Options = {
  signal: AbortSignal;
  onDelta: (text: string) => void;
};

const ABORTED: JokeResult = { status: "aborted" };

// Requests a joke from /api/joke and streams it. "completed" is returned only
// after an explicit `complete` event; a stream that just ends counts as failed.
export async function streamJoke(topic: string, { signal, onDelta }: Options): Promise<JokeResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { status: "failed", failure: "offline" };
  }

  let response: Response;
  try {
    response = await fetch("/api/joke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
      signal,
    });
  } catch {
    // No response at all: a network failure, unless the user stopped.
    return signal.aborted ? ABORTED : { status: "failed", failure: "offline" };
  }

  if (signal.aborted) return ABORTED;

  // Check the status before any parsing: the body may not be SSE or JSON.
  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    return { status: "failed", failure: failureFromStatus(response.status) };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.body || !contentType.startsWith("text/event-stream")) {
    response.body?.cancel().catch(() => {});
    return { status: "failed", failure: "server" };
  }

  let received = false;
  let completed = false;
  let failed = false;
  const failure = (): JokeResult => ({
    status: "failed",
    failure: received ? "interrupted" : "server",
  });

  const parser = createSseParser(({ event, data }) => {
    if (completed || failed || signal.aborted) return;
    if (event === "delta") {
      const text = (data as { text?: unknown }).text;
      if (typeof text === "string" && text !== "") {
        received = true;
        onDelta(text);
      }
    } else if (event === "complete") {
      completed = true;
    } else if (event === "error") {
      failed = true;
    }
  });

  const reader = response.body.getReader();
  const onAbort = () => reader.cancel().catch(() => {});
  signal.addEventListener("abort", onAbort);

  try {
    const decoder = new TextDecoder();
    while (!completed && !failed && !signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    if (signal.aborted) return ABORTED;
    parser.push(decoder.decode());
    return completed && !failed ? { status: "completed" } : failure();
  } catch {
    return signal.aborted ? ABORTED : failure();
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.cancel().catch(() => {});
  }
}
