import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/*": ["./node_modules/@sparticuz/chromium/bin/**"] },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Vercel Blob hosts media uploaded through the Website CMS.
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // Quotation templates moved under the document type they belong to; a bookmark still lands.
    return [
      { source: "/admin/templates", destination: "/admin/quotations/templates", permanent: false },
      { source: "/admin/templates/:id", destination: "/admin/quotations/templates/:id", permanent: false },
    ];
  },
  webpack(config) {
    config.resolve.alias["@splinetool/react-spline/next"] = path.resolve(
      process.cwd(),
      "node_modules/@splinetool/react-spline/dist/react-spline-next.js",
    );
    return config;
  },
};

export default nextConfig;
