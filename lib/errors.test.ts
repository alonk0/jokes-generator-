import { describe, expect, it } from "vitest";
import { failureFromStatus, messageForFailure, type JokeFailure } from "./errors";
import { STRINGS } from "./strings";

describe("failureFromStatus", () => {
  it("maps 429 to the rate limit failure", () => {
    expect(failureFromStatus(429)).toBe("rateLimited");
  });

  it("maps 400 to an invalid topic", () => {
    expect(failureFromStatus(400)).toBe("invalidTopic");
  });

  it.each([403, 404, 500, 502, 503])("maps %i to a server failure", (status) => {
    expect(failureFromStatus(status)).toBe("server");
  });
});

describe("messageForFailure", () => {
  it("shows the Hebrew rate limit message for 429", () => {
    expect(messageForFailure(failureFromStatus(429))).toBe(
      "יצרת יותר מדי בדיחות בזמן קצר. אפשר לנסות שוב בעוד רגע.",
    );
  });

  it.each<[JokeFailure, string]>([
    ["offline", STRINGS.offline],
    ["rateLimited", STRINGS.rateLimited],
    ["invalidTopic", STRINGS.invalidTopic],
    ["server", STRINGS.genericError],
    ["interrupted", STRINGS.interrupted],
  ])("maps %s to its UI text", (failure, text) => {
    expect(messageForFailure(failure)).toBe(text);
  });
});
