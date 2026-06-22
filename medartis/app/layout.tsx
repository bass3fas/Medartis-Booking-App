import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWA from "./components/PWA"; // 👈 Import it here

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medartis Inventory Engine",
  description: "High-performance medical kit tracker",
  manifest: "/manifest.json", // 👈 This links your manifest file
  themeColor: "#f8fafc",       // Match your manifest theme
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PWA />
        {children}
      </body>
    </html>
  );
}
