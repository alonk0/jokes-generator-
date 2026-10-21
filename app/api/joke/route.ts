import OpenAI from "openai";
import { validateJokeRequest } from "@/lib/jokeRequest";
import { formatSseEvent, type JokeEventName } from "@/lib/sse";
import { INSTRUCTIONS, buildInput } from "./prompt";

// Node.js is the default runtime; `runtime` cannot be exported while
// cacheComponents is enabled (see ADR-1 in spec/ARCHITECTURE.md).
export const maxDuration = 60;

const MAX_BODY_BYTES = 1024;
const UPSTREAM_TIMEOUT_MS = 50_000;

function jsonError(status: number, code: string) {
  return Response.json(
    { code },
    { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return jsonError(403, "FORBIDDEN");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonError(400, "INVALID_TOPIC");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return jsonError(400, "INVALID_TOPIC");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(400, "INVALID_TOPIC");
  }

  const validation = validateJokeRequest(body);
  if (!validation.ok) {
    return jsonError(400, "INVALID_TOPIC");
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("[api/joke] OPENAI_API_KEY is not set");
    return jsonError(500, "INTERNAL_ERROR");
  }

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]);
  const client = new OpenAI();

  let upstream;
  try {
    upstream = await client.responses.create(
      {
        model: "gpt-5",
        reasoning: { effort: "minimal" },
        max_output_tokens: 1000,
        instructions: INSTRUCTIONS,
        input: buildInput(validation.topic),
        stream: true,
        store: false,
      },
      { signal },
    );
  } catch (error) {
    // Log only the status / error type, never the topic or provider message body.
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    console.error("[api/joke] OpenAI request failed", { status, type: (error as Error)?.name });
    return jsonError(502, "UPSTREAM_UNAVAILABLE");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: JokeEventName, data: object) => {
        if (!closed) controller.enqueue(encoder.encode(formatSseEvent(event, data)));
      };
      const finish = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        for await (const event of upstream) {
          if (event.type === "response.output_text.delta") {
            send("delta", { text: event.delta });
          } else if (event.type === "response.completed") {
            send("complete", {});
            return finish();
          } else if (event.type === "response.incomplete") {
            send("error", { code: "INCOMPLETE" });
            return finish();
          } else if (event.type === "response.failed" || event.type === "error") {
            send("error", { code: "UPSTREAM_ERROR" });
            return finish();
          }
        }
        // Upstream ended without a final event.
        send("error", { code: "UPSTREAM_ERROR" });
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("[api/joke] stream interrupted", { type: (error as Error)?.name });
        }
        try {
          send("error", { code: "UPSTREAM_ERROR" });
        } catch {
          // Client already gone.
        }
      }
      finish();
    },
    cancel() {
      // The client disconnected: stop generating at OpenAI as far as possible.
      upstream.controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
