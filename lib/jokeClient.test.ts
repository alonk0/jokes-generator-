import { afterEach, describe, expect, it, vi } from "vitest";
import { messageForFailure } from "./errors";
import { streamJoke, type JokeResult } from "./jokeClient";
import { formatSseEvent } from "./sse";

const encoder = new TextEncoder();
const SSE_HEADERS = { "Content-Type": "text/event-stream; charset=utf-8" };

// A body that sends the given chunks and then either ends or stays open.
function sseBody(chunks: string[], { keepOpen = false } = {}) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      if (!keepOpen) controller.close();
    },
  });
}

function mockFetch(response: Response | (() => never)) {
  const fn = vi.fn(async () => {
    if (typeof response === "function") response();
    return response as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function run(onDelta = vi.fn(), signal = new AbortController().signal) {
  const result = await streamJoke("חתולים", { signal, onDelta });
  return { result, onDelta };
}

const failed = (failure: string): JokeResult => ({ status: "failed", failure } as JokeResult);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamJoke – responses before the stream", () => {
  it("treats 429 with an HTML body as rate limiting without reading the body", async () => {
    const response = new Response("<html>Too Many Requests</html>", {
      status: 429,
      headers: { "Content-Type": "text/html" },
    });
    const text = vi.spyOn(response, "text");
    const json = vi.spyOn(response, "json");
    mockFetch(response);

    const { result, onDelta } = await run();

    expect(result).toEqual(failed("rateLimited"));
    expect(text).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    expect(onDelta).not.toHaveBeenCalled();
    const message = messageForFailure("rateLimited");
    expect(message).toBe("יצרת יותר מדי בדיחות בזמן קצר. אפשר לנסות שוב בעוד רגע.");
    expect(message).not.toContain("Too Many Requests");
  });

  it("treats 429 with a JSON or empty body the same way", async () => {
    mockFetch(Response.json({ error: "rate_limited" }, { status: 429 }));
    expect((await run()).result).toEqual(failed("rateLimited"));

    mockFetch(new Response(null, { status: 429 }));
    expect((await run()).result).toEqual(failed("rateLimited"));
  });

  it("maps 400 to an invalid topic and 502 to a server failure", async () => {
    mockFetch(Response.json({ code: "INVALID_TOPIC" }, { status: 400 }));
    expect((await run()).result).toEqual(failed("invalidTopic"));

    mockFetch(Response.json({ code: "UPSTREAM_UNAVAILABLE" }, { status: 502 }));
    expect((await run()).result).toEqual(failed("server"));
  });

  it("treats a 200 that is not an event stream as a server failure", async () => {
    mockFetch(new Response("<html>hi</html>", { headers: { "Content-Type": "text/html" } }));
    expect((await run()).result).toEqual(failed("server"));
  });

  it("reports a network error as offline", async () => {
    mockFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    expect((await run()).result).toEqual(failed("offline"));
  });

  it("reports offline without calling fetch when the browser is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchFn = mockFetch(new Response(null));
    expect((await run()).result).toEqual(failed("offline"));
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("streamJoke – the stream", () => {
  it("completes only after a complete event", async () => {
    mockFetch(
      new Response(
        sseBody([
          formatSseEvent("delta", { text: "חתול " }),
          formatSseEvent("delta", { text: "נכנס לבר" }),
          formatSseEvent("complete", {}),
        ]),
        { headers: SSE_HEADERS },
      ),
    );
    const { result, onDelta } = await run();
    expect(result).toEqual({ status: "completed" });
    expect(onDelta.mock.calls.map((c) => c[0]).join("")).toBe("חתול נכנס לבר");
  });

  it("treats a stream that ends without complete after text as interrupted", async () => {
    mockFetch(new Response(sseBody([formatSseEvent("delta", { text: "חתול" })]), { headers: SSE_HEADERS }));
    expect((await run()).result).toEqual(failed("interrupted"));
  });

  it("treats an incomplete response after text as interrupted", async () => {
    mockFetch(
      new Response(
        sseBody([formatSseEvent("delta", { text: "חתול" }), formatSseEvent("error", { code: "INCOMPLETE" })]),
        { headers: SSE_HEADERS },
      ),
    );
    expect((await run()).result).toEqual(failed("interrupted"));
  });

  it("treats an error before any text as a server failure", async () => {
    mockFetch(
      new Response(sseBody([formatSseEvent("error", { code: "UPSTREAM_ERROR" })]), { headers: SSE_HEADERS }),
    );
    expect((await run()).result).toEqual(failed("server"));
  });

  it("returns aborted and delivers no text after the user stops", async () => {
    mockFetch(
      new Response(sseBody([formatSseEvent("delta", { text: "חתול" })], { keepOpen: true }), {
        headers: SSE_HEADERS,
      }),
    );
    const controller = new AbortController();
    const onDelta = vi.fn(() => controller.abort());

    const { result } = await run(onDelta, controller.signal);

    expect(result).toEqual({ status: "aborted" });
    expect(onDelta).toHaveBeenCalledTimes(1);
  });

  it("ignores events that arrive in the same chunk after a stop", async () => {
    mockFetch(
      new Response(
        sseBody([
          formatSseEvent("delta", { text: "א" }) +
            formatSseEvent("delta", { text: "ב" }) +
            formatSseEvent("complete", {}),
        ]),
        { headers: SSE_HEADERS },
      ),
    );
    const controller = new AbortController();
    const onDelta = vi.fn(() => controller.abort());

    const { result } = await run(onDelta, controller.signal);

    expect(result).toEqual({ status: "aborted" });
    expect(onDelta).toHaveBeenCalledTimes(1);
  });
});
