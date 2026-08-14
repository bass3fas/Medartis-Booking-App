// app/(app)/layout.tsx

import "./globals.css";
import PWA from "./components/PWA"; 
import SidebarNav from "./components/SidebarNav";
import BottomNav from "./components/BottomNav";
import WelcomeScreen from "./components/WelcomeScreen";
import QueryProvider from "./components/providers/QueryProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
      <html lang="en" data-theme="light">
        <body className="antialiased bg-base-200 min-h-screen text-base-content">
          <QueryProvider>
            <PWA />
            {/* 🔐 Full-screen security block layer wrapper */}
            <WelcomeScreen />

            <div className="flex flex-col md:flex-row min-h-screen">
              <SidebarNav />
              <main className="flex-1 pb-20 md:pb-0 md:pl-64">{children}</main>
            </div>

            <BottomNav />
          </QueryProvider>
        </body>
      </html>
    );
}