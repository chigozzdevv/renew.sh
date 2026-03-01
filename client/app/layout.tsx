import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Renew | Stablecoin Billing on Avalanche",
  description:
    "Renew is a stablecoin billing and settlement platform for modern merchants building on Avalanche.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${manrope.variable}`}>
        {children}
      </body>
    </html>
  );
}

