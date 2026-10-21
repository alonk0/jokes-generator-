// Client-side generation states (see spec/ARCHITECTURE.md, section 2.3).
export type GenerationStatus = "idle" | "streaming" | "completed" | "stopped" | "error";
