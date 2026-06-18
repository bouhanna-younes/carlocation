import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
  }
>(({ className, label, error, id, ...props }, ref) => {
  const textareaId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block mb-1.5 text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full min-h-[80px] bg-input/80 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors duration-200 disabled:opacity-50",
          error && "border-danger/60 focus:ring-danger/40 focus:border-danger/60",
          className,
        )}
        {...props}
      />
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
});
Textarea.displayName = "Textarea";
