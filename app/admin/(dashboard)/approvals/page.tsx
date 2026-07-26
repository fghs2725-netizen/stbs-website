"use client";

import { useState } from "react";
import { PendingApprovalsList } from "@/components/documents/approval/PendingApprovalsList";

export default function AdminApprovalsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-oswald font-bold text-white">
            Approvals
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Review and manage document approval requests
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <PendingApprovalsList refreshKey={refreshKey} />
    </div>
  );
}
