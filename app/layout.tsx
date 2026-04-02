import type { Metadata } from "next";
import { AppFooter } from "@/components/app-footer";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LineCrew — On-demand line holding marketplace",
  description:
    "Book trusted Line Holders for airports, events, retail drops, services, and other high-wait situations.",
  icons: {
    icon: "/linecrew-logo.png",
    shortcut: "/linecrew-logo.png",
    apple: "/linecrew-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
