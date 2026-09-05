import type { MetadataRoute } from "next";
import { absolutePath } from "@/lib/site-url";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/" }, sitemap: absolutePath("/sitemap.xml") }; }
