import type { Metadata } from "next";
import { GalleryClient } from "@/components/gallery-client";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Proof of work: images of drilling, installation, and completed projects from our field operations.",
};

export default function Gallery() {
  return <GalleryClient />;
}
