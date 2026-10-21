import { describe, expect, it } from "vitest";
import { MAX_TOPIC_CHARS, countChars, truncateChars } from "./text";

describe("countChars", () => {
  it("counts an empty string as zero", () => {
    expect(countChars("")).toBe(0);
  });

  it("counts Hebrew letters and spaces", () => {
    expect(countChars("חתולים")).toBe(6);
    expect(countChars("  חתול שחור ")).toBe(12);
  });

  it("counts an emoji as one character", () => {
    expect(countChars("😂")).toBe(1);
    expect(countChars("חתול😂")).toBe(5);
  });
});

describe("truncateChars", () => {
  it("defaults to a 100 character limit", () => {
    expect(MAX_TOPIC_CHARS).toBe(100);
  });

  it("keeps text of exactly 100 characters", () => {
    const text = "א".repeat(100);
    expect(truncateChars(text)).toBe(text);
  });

  it("cuts longer text to the first 100 characters", () => {
    const text = "ב".repeat(60) + "ג".repeat(90);
    const result = truncateChars(text);
    expect(countChars(result)).toBe(100);
    expect(result).toBe("ב".repeat(60) + "ג".repeat(40));
  });

  it("never splits an emoji in the middle", () => {
    const text = "😂".repeat(150);
    const result = truncateChars(text);
    expect(result).toBe("😂".repeat(100));
    expect(result.length).toBe(200);
  });
});
