import { Boxes, CloudRain, Construction, Drill, type LucideIcon } from "lucide-react";
import type { ServiceIconKey } from "@/lib/website/service-pages";

/**
 * Service icons, kept out of any "use client" module so server pages (the /services index)
 * and client sections (the homepage cards) share exactly one map: one icon set, one stroke.
 */
export const SERVICE_ICONS: Record<ServiceIconKey, LucideIcon> = {
  drill: Drill,
  rain: CloudRain,
  supply: Boxes,
  tubewell: Construction,
};
