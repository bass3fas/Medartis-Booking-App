// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWA from "./components/PWA"; 
import SidebarNav from "./components/SidebarNav";
import BottomNav from "./components/BottomNav";

export const metadata: Metadata = {
  title: "Medartis Inventory Engine",
  description: "High-performance medical kit tracker",
  manifest: "/manifest.json", 
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="lemonade">
      <body className="antialiased bg-base-200 min-h-screen text-base-content">
        <PWA /> 
        
        <div className="flex flex-col md:flex-row min-h-screen">
          {/* Left Sidebar Fixed Rail */}
          <SidebarNav />

          {/* md:pl-64 ensures desktop pages spawn smoothly *after* the sidebar.
            pb-20 makes sure mobile pages don't get hidden under your bottom touch rail!
          */}
          <div className="flex-1 pb-20 md:pb-0 md:pl-64">
            {children}
          </div>
        </div>

        {/* Bottom Horizontal Touch Bar */}
        <BottomNav />
      </body>
    </html>
  );
}