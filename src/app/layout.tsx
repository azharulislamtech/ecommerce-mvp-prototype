import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
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

// R11.2: Bangla font, self-hosted by next/font at build time (no request to Google from the
// visitor's browser). Hind Siliguri is not a variable font, so the weights are listed.
const bangla = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-bangla"
});

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // R11.2: the store is Bangla; the English admin marks its own subtree lang="en".
    <html className={bangla.variable} data-scroll-behavior="smooth" lang="bn">
      <body>{children}</body>
    </html>
  );
}
