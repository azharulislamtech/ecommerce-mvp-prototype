/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.E2E_ISOLATED === "1" ? ".next-isolated" : ".next",
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  // R2.8: the legacy demo categories are hidden by V12 (R1.8) and ship in the same release.
  // The owner chose 301 (Q6); Next's `permanent: true` would send 308, so statusCode is set.
  // home-living goes to the Home Solutions listing; the others go to the homepage.
  async redirects() {
    return [
      { source: "/categories/home-living", destination: "/products?section=home", statusCode: 301 },
      ...["electronics", "fashion", "beauty", "accessories"].map((slug) => ({
        source: `/categories/${slug}`,
        destination: "/",
        statusCode: 301
      }))
    ];
  },
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
