import { MAX_TOPIC_CHARS, countChars } from "./text";

export type JokeRequestResult = { ok: true; topic: string } | { ok: false };

// Validates the JSON body of POST /api/joke. Length is checked on the raw
// value (before trimming); an empty or whitespace-only topic becomes "".
export function validateJokeRequest(body: unknown): JokeRequestResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false };
  }
  const topic = (body as Record<string, unknown>).topic;
  if (topic === undefined) {
    return { ok: true, topic: "" };
  }
  if (typeof topic !== "string" || countChars(topic) > MAX_TOPIC_CHARS) {
    return { ok: false };
  }
  return { ok: true, topic: topic.trim() };
}
