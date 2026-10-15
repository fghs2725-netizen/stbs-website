"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * A submit button that asks first. For actions the owner should not trigger by a stray tap, such as
 * deleting an invoice; the form still posts to its server action as usual once confirmed.
 */
export function ConfirmSubmit({ message, children, variant = "secondary", size = "sm", className }: {
  message: string;
  children: ReactNode;
  variant?: "secondary" | "destructive" | "primary";
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <Button type="submit" variant={variant} size={size} className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </Button>
  );
}
