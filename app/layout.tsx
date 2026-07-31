import type { Metadata } from "next";
import { Pixelify_Sans, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
  weight: ["400", "500", "600", "700"],
});

const mono = Share_Tech_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
});

export const metadata: Metadata = {
  title: "SIP-N-Sanity — Please Hold",
  description:
    "A sarcastic 16-bit VoIP support survival game. Balance Sanity, CSAT, and the Queue from 9 to 5.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixel.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
