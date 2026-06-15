import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md font-medium transition-colors shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/20",
        secondary: "bg-secondary/15 text-secondary border border-secondary/20",
        danger: "bg-danger/15 text-danger border border-danger/20",
        warning: "bg-warning/15 text-warning border border-warning/20",
        success: "bg-success/15 text-success border border-success/20",
        info: "bg-info/15 text-info border border-info/20",
        muted: "bg-muted/15 text-muted border border-muted/20",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] gap-1",
        md: "px-2.5 py-0.5 text-xs gap-1.5",
        lg: "px-3 py-1 text-sm gap-1.5",
      },
      dot: {
        true: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string;
}

const dotColorMap: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  info: "bg-info",
  muted: "bg-muted",
};

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, children, ...props }, ref) => {
    const dotColorClass = dotColor
      ? (dotColorMap[dotColor] ?? "bg-primary")
      : variant === "danger"
        ? "bg-danger"
        : variant === "warning"
          ? "bg-warning"
          : variant === "success"
            ? "bg-success"
            : variant === "info"
              ? "bg-info"
              : variant === "secondary"
                ? "bg-secondary"
                : "bg-primary";

    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, dot }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full animate-pulse",
              dotColorClass,
            )}
          />
        )}
        {children}
      </div>
    );
  },
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
