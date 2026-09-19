import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saini Tubewell Boring Service",
    short_name: "STBS",
    description: "Borewell drilling, tubewell construction and rainwater harvesting across Haryana & NCR since 1992.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1F33",
    theme_color: "#0B1F33",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
