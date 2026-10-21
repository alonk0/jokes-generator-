import { STRINGS } from "./strings";

// Kinds of failure the UI can show (see the text table in spec/DESIGN.md).
export type JokeFailure = "offline" | "rateLimited" | "invalidTopic" | "server" | "interrupted";

// Maps a non-200 HTTP status to a failure. Only the status is used, never the
// body: a 429 from the WAF may come back as HTML or plain text.
export function failureFromStatus(status: number): JokeFailure {
  if (status === 429) return "rateLimited";
  if (status === 400) return "invalidTopic";
  return "server";
}

export function messageForFailure(failure: JokeFailure): string {
  switch (failure) {
    case "offline":
      return STRINGS.offline;
    case "rateLimited":
      return STRINGS.rateLimited;
    case "invalidTopic":
      return STRINGS.invalidTopic;
    case "interrupted":
      return STRINGS.interrupted;
    case "server":
      return STRINGS.genericError;
  }
}
