import React from "react";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";

export const metadata: Metadata = {
  title: "Longevity Game",
  description:
    "Join competitions, track your progress, and compete with others in our modern PWA platform.",
  generator: "v0.app",
  manifest: "/manifest.json",
  keywords: ["competition", "pwa", "mobile", "app", "contests", "leaderboard"],
  authors: [{ name: "Longevity Game Team" }],
  creator: "Longevity Game Team",
  publisher: "Longevity Game Team",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://longevitygame.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Longevity Game",
    description:
      "Join competitions, track your progress, and compete with others in our modern PWA platform.",
    url: "https://longevitygame.app",
    siteName: "Longevity Game",
    images: [
      {
        url: "/icons/icon-512x512.jpg",
        width: 512,
        height: 512,
        alt: "Longevity Game",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Longevity Game",
    description:
      "Join competitions, track your progress, and compete with others in our modern PWA platform.",
    images: ["/icons/icon-512x512.jpg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Longevity Game",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#3b82f6" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.jpg" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.jpg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Longevity Game" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta
          name="msapplication-TileImage"
          content="/icons/icon-144x144.jpg"
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ClientProviders>{children}</ClientProviders>
        <Analytics />
      </body>
    </html>
  );
}
