export const MAX_TOPIC_CHARS = 100;

// Counts Unicode code points, so an emoji counts as a single character.
// Shared by the input, the counter and (later) the server validation.
export function countChars(text: string): number {
  return Array.from(text).length;
}

export function truncateChars(text: string, max: number = MAX_TOPIC_CHARS): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join("");
}
