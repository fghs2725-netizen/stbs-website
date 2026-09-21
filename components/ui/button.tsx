import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Only the admin uses this button, and the admin is wrapped in `.theme-admin`,
// so the visual definition lives with the rest of that design system in
// app/admin/admin.css. This file just maps variants onto those classes.
const variants = cva("a-btn", {
  variants: {
    variant: {
      primary: "a-btn-primary",
      secondary: "a-btn-secondary",
      ghost: "a-btn-quiet",
      destructive: "a-btn-danger",
      outline: "a-btn-secondary",
      dark: "a-btn-primary",
    },
    size: { sm: "a-btn-sm", default: "", lg: "min-h-[48px] px-6", icon: "size-11 !px-0" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
