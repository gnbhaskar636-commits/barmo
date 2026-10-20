import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/Toast";
import { HubProvider } from "@/components/HubProvider";
import AccountSync from "@/components/account/AccountSync";
import PwaSetup from "@/components/PwaSetup";
import "./globals.css";

export const metadata: Metadata = {
  title: "BARMO",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "BARMO", statusBarStyle: "black-translucent" },
  description:
    "BARMO is a shared 3D lounge for professionals. Walk in as an avatar, find people worth knowing, and turn a hello into a connection.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#12151f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Instrument+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
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
