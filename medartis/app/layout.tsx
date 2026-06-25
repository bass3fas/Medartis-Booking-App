import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWA from "./components/PWA"; 


// 1. Standard descriptive metadata layout
export const metadata: Metadata = {
  title: "Medartis Inventory Engine",
  description: "High-performance medical kit tracker",
  manifest: "/manifest.json", 
};

// 2. Mobile device theme viewports
export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="cupcake">
      <body className="antialiased">
        <PWA /> 
        {children}
      </body>
    </html>
  );
}