// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWA from "./components/PWA"; 
import SidebarNav from "./components/SidebarNav";
import BottomNav from "./components/BottomNav";
import WelcomeScreen from "./components/WelcomeScreen"; // 👈 Imported globally

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
      <html lang="en" data-theme="light">
        <body className="antialiased bg-base-200 min-h-screen text-base-content">
          <PWA /> 
          
          {/* 🔐 Full-screen security block layer wrapper */}
          <WelcomeScreen />

          <div className="flex flex-col md:flex-row min-h-screen">
            <SidebarNav />
            <div className="flex-1 pb-20 md:pb-0 md:pl-62">
              {children}
            </div>
          </div>

          <BottomNav />
        </body>
      </html>
    );
}