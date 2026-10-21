"use client";

import { useEffect } from "react";

// Same-origin build assets worth keeping for offline use (hashed JS/CSS, fonts, images).
function loadedAssetUrls(): string[] {
  return performance
    .getEntriesByType("resource")
    .map((entry) => new URL(entry.name))
    .filter(
      (url) =>
        url.origin === location.origin &&
        (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image")),
    )
    .map((url) => url.href);
}

// Registers the service worker in production only; in development it removes
// any worker left over from a local production test.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(version)}`, {
        scope: "/",
        updateViaCache: "none",
      })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // Assets loaded before the worker took control are not cached yet.
        registration.active?.postMessage({ type: "CACHE_URLS", urls: loadedAssetUrls() });
      })
      .catch(() => {
        // Without a worker the site still works, just not offline.
      });
  }, []);

  return null;
}
