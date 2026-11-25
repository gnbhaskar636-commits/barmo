import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/Toast";
import { HubProvider } from "@/components/HubProvider";
import AccountSync from "@/components/account/AccountSync";
import PwaSetup from "@/components/PwaSetup";
import { BRAND, getCanonicalUrl } from "@/lib/brand.config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: BRAND.title,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [
    "BARMO",
    "gaming universe",
    "online gaming platform",
    "multiplayer 3D game",
    "esports tournaments",
    "spatial gaming",
    "Three.js metaverse",
    "webgl games",
    "LiveKit spatial voice",
    "gaming squads",
    "AI gaming companion",
    "Next.js 15 gaming",
  ],
  authors: [{ name: "BARMO Team" }],
  creator: "BARMO",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BRAND.url,
    siteName: BRAND.name,
    title: BRAND.title,
    description: BRAND.description,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.title,
    description: BRAND.shortDescription,
    creator: BRAND.socials.twitter,
  },
  alternates: {
    canonical: getCanonicalUrl("/"),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: BRAND.themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Instrument+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "VideoGame",
              name: "BARMO Lounge",
              description: BRAND.description,
              genre: ["Action", "Arcade", "Strategy", "Social"],
              playMode: ["MultiPlayer", "SinglePlayer", "CoOp"],
              applicationCategory: "Game",
              operatingSystem: "Web, Windows, macOS, iOS, Android",
              url: BRAND.url,
            }),
          }}
        />
      </head>
      <body>
        <ToastProvider>
          <HubProvider>
            <AccountSync />
            <PwaSetup />
            {children}
          </HubProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
