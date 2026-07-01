import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopPilot E-commerce MVP",
  description: "A mobile-first e-commerce prototype with checkout and admin flows."
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
