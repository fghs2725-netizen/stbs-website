import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("not found") || msg.includes("Not found")) return "Resource not found";
    if (msg.includes("Unauthorized") || msg.includes("unauthorized")) return "Unauthorized";
    if (msg.includes("expired")) return "Request has expired";
    if (msg.includes("already has")) return "Request already exists";
    if (msg.includes("Cannot submit")) return "Document cannot be submitted in its current state";
    if (msg.includes("not pending")) return "Request is no longer pending";
    if (msg.includes("Invalid decision")) return "Invalid action";
    if (msg.includes("Version not found")) return "Version not found";
    if (msg.includes("Version has no snapshot")) return "Version has no data";
    if (msg.includes("does not belong")) return "Version does not belong to this document";
    if (msg.includes("no pending")) return "No pending approval request";
    if (msg.includes("Version creation failed")) return "Failed to create version";
    return "An error occurred";
  }
  return "An error occurred";
}
