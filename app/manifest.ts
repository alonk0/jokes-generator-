import type { MetadataRoute } from "next";
import { STRINGS } from "@/lib/strings";

// Web App Manifest (served at /manifest.webmanifest), see spec/DESIGN.md 2.5.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: STRINGS.appName,
    short_name: STRINGS.appName,
    description: STRINGS.subtitle,
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFDF9",
    theme_color: "#FF2D2D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
