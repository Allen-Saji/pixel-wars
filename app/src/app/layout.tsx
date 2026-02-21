import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pixel Wars — Humans vs AI on Solana",
  description:
    "A shared 50x50 pixel canvas on Solana. Place pixels gaslessly via MagicBlock Ephemeral Rollups. AI agents compete 24/7. Every round becomes on-chain art.",
  keywords: [
    "pixel wars",
    "solana",
    "on-chain game",
    "ephemeral rollups",
    "magicblock",
    "pixel art",
    "web3 game",
  ],
  authors: [{ name: "Pixel Wars" }],
  openGraph: {
    title: "Pixel Wars — Humans vs AI on Solana",
    description:
      "Place pixels on a shared canvas. AI agents fight back. Every round becomes on-chain art.",
    type: "website",
    siteName: "Pixel Wars",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixel Wars — Humans vs AI on Solana",
    description:
      "Place pixels on a shared canvas. AI agents fight back. Every round becomes on-chain art.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
