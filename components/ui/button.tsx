import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[.12em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { primary: "bg-signal text-black hover:bg-white", outline: "border border-white/25 text-white hover:border-signal hover:text-signal", dark: "bg-black text-white hover:bg-steel" }, size: { default: "h-12 px-6 text-xs", lg: "h-14 px-8 text-sm", icon: "size-11" } },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
