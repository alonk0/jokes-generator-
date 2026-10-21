import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("manifest", () => {
  const m = manifest();

  it("uses the Hebrew app name and RTL", () => {
    expect(m.name).toBe("מחולל בדיחות");
    expect(m.short_name).toBe("מחולל בדיחות");
    expect(m.lang).toBe("he");
    expect(m.dir).toBe("rtl");
  });

  it("opens standalone at the root with the design colors", () => {
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.background_color).toBe("#FFFDF9");
    expect(m.theme_color).toBe("#FF2D2D");
  });

  it("includes 192, 512 and maskable icons", () => {
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
  });
});
