import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-8 w-full rounded-sm border border-neutral-800 bg-neutral-950 px-2 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
