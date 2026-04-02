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
  metadataBase: new URL("https://linecrew.ai"),
  title: {
    default: "LineCrew.ai — On-demand line holding marketplace",
    template: "%s | LineCrew.ai",
  },
  description:
    "Book trusted Line Holders for airports, concerts, theme parks, and more. We hold your spot so you don't have to.",
  keywords: [
    "line holder",
    "airport security",
    "skip the line",
    "line waiting service",
    "concert line",
    "theme park",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://linecrew.ai",
    siteName: "LineCrew.ai",
    title: "LineCrew.ai — Save your spot. Keep your day moving.",
    description:
      "Book trusted Line Holders for airports, concerts, theme parks, and more.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LineCrew.ai — Save your spot. Keep your day moving.",
    description:
      "Book trusted Line Holders for airports, concerts, theme parks, and more.",
    images: ["/og-image.png"],
  },
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
