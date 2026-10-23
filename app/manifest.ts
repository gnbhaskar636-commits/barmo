import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BARMO",
    short_name: "BARMO",
    description: "A shared 3D lounge to meet, chat and play together.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#12151f",
    theme_color: "#12151f",
    shortcuts: [
      { name: "Meeting Hall", short_name: "Meetings", url: "/world?room=meeting", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Party Hall", short_name: "Party", url: "/world?room=party", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "AI Lab", short_name: "AI Lab", url: "/world?room=lab", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
