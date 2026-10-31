import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // three.js ships ES modules that next handles fine; keep config minimal.
  // Silences the "workspace root inferred" warning caused by lockfiles in this folder.
  outputFileTracingRoot: process.cwd(),
  // The service worker file must never be cached by the browser, so updates reach people.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
