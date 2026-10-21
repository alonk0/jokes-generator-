// Minimal SSE helpers for the /api/joke stream (see spec/ARCHITECTURE.md, section 2.4).

export type JokeEventName = "delta" | "complete" | "error";

export type SseEvent = { event: string; data: unknown };

export function formatSseEvent(event: JokeEventName, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Incremental parser: chunks may split an event anywhere, so text is buffered
// until a blank line ends the event. Invalid JSON data is reported as "error".
export function createSseParser(onEvent: (event: SseEvent) => void) {
  let buffer = "";

  function dispatch(block: string) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line === "" || line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") event = value;
      else if (field === "data") dataLines.push(value);
    }
    if (dataLines.length === 0) return;
    try {
      onEvent({ event, data: JSON.parse(dataLines.join("\n")) });
    } catch {
      onEvent({ event: "error", data: { code: "BAD_EVENT" } });
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n?/g, "\n");
      let end = buffer.indexOf("\n\n");
      while (end !== -1) {
        dispatch(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        end = buffer.indexOf("\n\n");
      }
    },
  };
}
