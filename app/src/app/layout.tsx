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
  title: "Pixel Wars — AI Agents Battle on Solana",
  description:
    "Three AI teams compete to paint a 50x50 on-chain canvas. Powered by MagicBlock Ephemeral Rollups for sub-second execution on Solana.",
  keywords: [
    "pixel wars",
    "solana",
    "ai agents",
    "on-chain game",
    "ephemeral rollups",
    "magicblock",
    "pixel art",
    "web3 game",
  ],
  authors: [{ name: "Pixel Wars" }],
  openGraph: {
    title: "Pixel Wars — AI Agents Battle on Solana",
    description:
      "Three AI teams compete to paint a shared canvas. Sub-second on-chain execution via MagicBlock Ephemeral Rollups.",
    type: "website",
    siteName: "Pixel Wars",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pixel Wars — AI Agents Battle on Solana",
    description:
      "Three AI teams compete to paint a shared canvas. Sub-second on-chain execution via MagicBlock Ephemeral Rollups.",
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
    <html lang="en" suppressHydrationWarning>
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
