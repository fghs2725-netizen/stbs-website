"use client";

import { useState } from "react";
import { PendingApprovalsList } from "@/components/documents/approval/PendingApprovalsList";
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';

export default function AdminApprovalsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="admin-page max-w-5xl">
      <PageHeader eyebrow="Workflow" title="Approvals" description="Review and manage document approval requests." action={<Button
          onClick={() => setRefreshKey((k) => k + 1)}
          variant="secondary"
        >
          Refresh
        </Button>} />

      <PendingApprovalsList refreshKey={refreshKey} />
    </div>
  );
}
