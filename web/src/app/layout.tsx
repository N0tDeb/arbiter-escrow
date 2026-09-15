import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Web3Provider } from "@/components/providers/web3-provider";
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
  title: "Arbiter | Ethereum Escrow with Dispute Resolution",
  description:
    "A local Ethereum escrow dApp with buyer, seller, and arbitrator roles, deadline handling, dispute resolution, and pull-payment withdrawals.",
  keywords: ["escrow", "ethereum", "hardhat", "dApp", "web3", "smart contract", "solidity"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[oklch(0.98_0.004_250)]">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
