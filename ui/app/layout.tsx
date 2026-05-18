import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { AgentStatusProvider } from "@/lib/use-agent-ws";
import { AgentNotificationBar } from "@/components/AgentNotificationBar";
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
  title: "Aurat AI",
  description: "AI-powered desktop application",
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
        <AgentStatusProvider>
          <AgentNotificationBar />
          <div className="flex h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 overflow-auto [&:has([data-fullscreen])]:p-0 p-8">
              {children}
            </main>
          </div>
        </AgentStatusProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}