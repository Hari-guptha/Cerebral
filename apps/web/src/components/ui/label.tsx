import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-[10px] font-medium uppercase tracking-wider text-neutral-500", className)} {...props} />
  );
}
