import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AdminServiceWorker } from "@/components/admin/app/AdminServiceWorker";

/**
 * Wraps every admin page (sign-in, dashboard and the full-screen studios) so that "Add to Home Screen"
 * on an iPhone installs it as its own app: the admin manifest instead of the public site's, the Apple
 * web-app tags, and an edge-to-edge viewport so the bars' safe-area padding takes effect.
 */
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  applicationName: "STBS Admin",
  appleWebApp: { capable: true, title: "STBS Admin", statusBarStyle: "default" },
  icons: { apple: "/apple-icon.png" },
  robots: { index: false, follow: false },
  // Next writes only the newer mobile-web-app-capable; iOS before 16.4 still looks for Apple's own name.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AdminServiceWorker />
    </>
  );
}
