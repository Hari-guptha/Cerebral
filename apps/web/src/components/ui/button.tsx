import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium transition-colors disabled:opacity-40",
        variant === "default" && "bg-white text-black hover:bg-neutral-200",
        variant === "outline" && "border border-neutral-700 bg-transparent text-white hover:bg-neutral-900",
        variant === "ghost" && "text-neutral-400 hover:bg-neutral-900 hover:text-white",
        variant === "destructive" && "bg-white text-black hover:bg-neutral-300",
        size === "sm" && "h-7 px-2.5 text-[11px]",
        size === "md" && "h-9 px-4 text-sm",
        size === "icon" && "h-8 w-8",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
