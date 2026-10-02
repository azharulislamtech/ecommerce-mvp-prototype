/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.E2E_ISOLATED === "1" ? ".next-isolated" : ".next",
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
      ] },
      ...["/admin/:path*", "/cart", "/checkout", "/track-order", "/payment/:path*"].map((source) => ({
        source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
      }))
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co"
      }
    ]
  },
  reactStrictMode: true
};

export default nextConfig;
