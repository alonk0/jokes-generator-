import { createSseParser } from "./sse";

export type JokeResult = "completed" | "failed" | "aborted";

type Options = {
  signal: AbortSignal;
  onDelta: (text: string) => void;
};

// Requests a joke from /api/joke and streams it. "completed" is returned only
// after an explicit `complete` event; a stream that just ends counts as failed.
export async function streamJoke(topic: string, { signal, onDelta }: Options): Promise<JokeResult> {
  let completed = false;
  let failed = false;

  try {
    const response = await fetch("/api/joke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
      signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !response.body || !contentType.startsWith("text/event-stream")) {
      return "failed";
    }

    const parser = createSseParser(({ event, data }) => {
      if (completed || failed) return;
      if (event === "delta") {
        const text = (data as { text?: unknown }).text;
        if (typeof text === "string") onDelta(text);
      } else if (event === "complete") {
        completed = true;
      } else if (event === "error") {
        failed = true;
      }
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (!completed && !failed) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    reader.cancel().catch(() => {});

    return completed && !failed ? "completed" : "failed";
  } catch (error) {
    if (signal.aborted || (error as Error)?.name === "AbortError") {
      return "aborted";
    }
    return "failed";
  }
}
