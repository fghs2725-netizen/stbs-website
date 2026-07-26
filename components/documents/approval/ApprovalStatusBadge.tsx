"use client";

import { DOCUMENT_STATUS_CONFIG } from "@/lib/documents/template-registry";

interface ApprovalStatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

const APPROVAL_STATES = new Set([
  "PENDING_REVIEW",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "REVISION",
]);

export function ApprovalStatusBadge({ status, size = "md" }: ApprovalStatusBadgeProps) {
  const config =
    DOCUMENT_STATUS_CONFIG[status as keyof typeof DOCUMENT_STATUS_CONFIG] ?? {
      label: status,
      color: "#94a3b8",
      bgColor: "#1e293b",
    };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const isAnimated = APPROVAL_STATES.has(status);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border border-white/10 ${sizeClasses[size]} ${isAnimated ? "animate-pulse" : ""}`}
      style={{ color: config.color, backgroundColor: config.bgColor }}
    >
      {isAnimated && (
        <span
          className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
}
