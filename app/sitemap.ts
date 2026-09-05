import type { MetadataRoute } from "next";
import { canonicalSiteUrl } from "@/lib/site-url";
export default function sitemap(): MetadataRoute.Sitemap { const baseUrl=canonicalSiteUrl(); const routes=["","/about","/services","/clients","/gallery","/contact","/quote"]; return routes.map(route=>({url:`${baseUrl}${route}`,lastModified:new Date(),changeFrequency:route===""?"weekly":"monthly",priority:route===""?1:.8})); }
