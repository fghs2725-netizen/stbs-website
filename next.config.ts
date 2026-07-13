import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
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
