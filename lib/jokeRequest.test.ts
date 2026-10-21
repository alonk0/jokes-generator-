import { describe, expect, it } from "vitest";
import { validateJokeRequest } from "./jokeRequest";

describe("validateJokeRequest", () => {
  it("accepts a normal topic", () => {
    expect(validateJokeRequest({ topic: "חתולים" })).toEqual({ ok: true, topic: "חתולים" });
  });

  it("treats a missing, empty or whitespace-only topic as general", () => {
    expect(validateJokeRequest({})).toEqual({ ok: true, topic: "" });
    expect(validateJokeRequest({ topic: "" })).toEqual({ ok: true, topic: "" });
    expect(validateJokeRequest({ topic: "   " })).toEqual({ ok: true, topic: "" });
  });

  it("trims surrounding spaces", () => {
    expect(validateJokeRequest({ topic: "  כלבים " })).toEqual({ ok: true, topic: "כלבים" });
  });

  it("accepts exactly 100 characters, including emoji", () => {
    expect(validateJokeRequest({ topic: "א".repeat(100) }).ok).toBe(true);
    expect(validateJokeRequest({ topic: "😂".repeat(100) }).ok).toBe(true);
  });

  it("rejects more than 100 characters", () => {
    expect(validateJokeRequest({ topic: "א".repeat(101) })).toEqual({ ok: false });
    expect(validateJokeRequest({ topic: "😂".repeat(101) })).toEqual({ ok: false });
  });

  it("checks the length before trimming", () => {
    expect(validateJokeRequest({ topic: " " + "א".repeat(100) })).toEqual({ ok: false });
  });

  it("rejects a topic that is not a string", () => {
    expect(validateJokeRequest({ topic: 5 })).toEqual({ ok: false });
    expect(validateJokeRequest({ topic: null })).toEqual({ ok: false });
    expect(validateJokeRequest({ topic: ["a"] })).toEqual({ ok: false });
  });

  it("rejects a body that is not an object", () => {
    expect(validateJokeRequest(null)).toEqual({ ok: false });
    expect(validateJokeRequest("חתולים")).toEqual({ ok: false });
    expect(validateJokeRequest([{ topic: "a" }])).toEqual({ ok: false });
  });

  it("ignores extra fields such as model", () => {
    expect(validateJokeRequest({ topic: "ים", model: "other" })).toEqual({ ok: true, topic: "ים" });
  });
});
