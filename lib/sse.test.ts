import { describe, expect, it } from "vitest";
import { createSseParser, formatSseEvent, type SseEvent } from "./sse";

function collect(chunks: string[]): SseEvent[] {
  const events: SseEvent[] = [];
  const parser = createSseParser((e) => events.push(e));
  for (const chunk of chunks) parser.push(chunk);
  return events;
}

describe("formatSseEvent", () => {
  it("formats an event with JSON data", () => {
    expect(formatSseEvent("delta", { text: "חתול" })).toBe('event: delta\ndata: {"text":"חתול"}\n\n');
  });
});

describe("createSseParser", () => {
  it("parses one complete event", () => {
    expect(collect(['event: delta\ndata: {"text":"שלום"}\n\n'])).toEqual([
      { event: "delta", data: { text: "שלום" } },
    ]);
  });

  it("parses several events in one chunk", () => {
    const chunk = formatSseEvent("delta", { text: "א" }) + formatSseEvent("complete", {});
    expect(collect([chunk])).toEqual([
      { event: "delta", data: { text: "א" } },
      { event: "complete", data: {} },
    ]);
  });

  it("waits for the rest of an event split across chunks", () => {
    const full = formatSseEvent("delta", { text: "חתול שחור" }) + formatSseEvent("complete", {});
    const chunks = [full.slice(0, 3), full.slice(3, 20), full.slice(20, 31), full.slice(31)];
    expect(collect(chunks)).toEqual([
      { event: "delta", data: { text: "חתול שחור" } },
      { event: "complete", data: {} },
    ]);
  });

  it("does not emit an event before its blank line arrives", () => {
    expect(collect(['event: delta\ndata: {"text":"א"}\n'])).toEqual([]);
  });

  it("supports CRLF line endings", () => {
    expect(collect(['event: complete\r\ndata: {}\r\n\r\n'])).toEqual([{ event: "complete", data: {} }]);
  });

  it("ignores comment lines", () => {
    expect(collect([': keep-alive\n\nevent: complete\ndata: {}\n\n'])).toEqual([
      { event: "complete", data: {} },
    ]);
  });

  it("reports invalid JSON data as an error event", () => {
    expect(collect(["event: delta\ndata: {oops\n\n"])).toEqual([
      { event: "error", data: { code: "BAD_EVENT" } },
    ]);
  });

  it("keeps Hebrew text and emoji intact through a round trip", () => {
    const text = "למה החתול צחק? 😂\nכי כן!";
    expect(collect([formatSseEvent("delta", { text })])).toEqual([{ event: "delta", data: { text } }]);
  });
});

describe("TextDecoder streaming", () => {
  it("keeps a Hebrew letter split between byte chunks whole", () => {
    const bytes = new TextEncoder().encode("שלום");
    const decoder = new TextDecoder();
    const text = decoder.decode(bytes.slice(0, 3), { stream: true }) + decoder.decode(bytes.slice(3));
    expect(text).toBe("שלום");
  });
});
