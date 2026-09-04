import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { primary: "bg-signal text-black hover:bg-[#ffd429]", secondary: "border border-white/[.12] bg-surface text-white hover:bg-white/[.08]", ghost: "text-zinc-300 hover:bg-white/[.08] hover:text-white", destructive: "bg-red-500 text-white hover:bg-red-400", outline: "border border-white/[.25] text-white hover:border-signal hover:text-signal", dark: "bg-black text-white hover:bg-steel" }, size: { sm: "min-h-10 px-3 text-[13px]", default: "min-h-11 px-4", lg: "min-h-12 px-6", icon: "size-10 min-h-10 p-0" } },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
