import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kena Sathi | Trusted Online Shopping in Bangladesh",
  description: "Kena Sathi is a Bangladesh-focused online store with easy checkout, order tracking, and secure payment options."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
