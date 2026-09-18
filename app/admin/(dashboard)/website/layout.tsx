import { ReactNode } from "react";
import { WebsiteCmsTabs } from "@/components/admin/website/WebsiteCmsTabs";

export default function WebsiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-page">
      <WebsiteCmsTabs />
      {children}
    </div>
  );
}