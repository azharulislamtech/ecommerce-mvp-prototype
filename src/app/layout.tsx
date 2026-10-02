import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: "Kena Sathi",
  title: {
    default: "Kena Sathi | Trusted Online Shopping in Bangladesh",
    template: "%s | Kena Sathi"
  },
  description: "Kena Sathi is a Bangladesh-focused online store with easy checkout, order tracking, and secure payment options.",
  openGraph: {
    siteName: "Kena Sathi",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
