import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 hover-lift focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-primary to-emerald-600 text-white hover:shadow-lg hover:shadow-primary/30 focus:ring-primary",
        secondary:
          "bg-gradient-to-br from-secondary to-indigo-600 text-white hover:shadow-lg hover:shadow-secondary/30 focus:ring-secondary",
        danger:
          "bg-gradient-to-br from-danger to-red-600 text-white hover:shadow-lg hover:shadow-danger/30 focus:ring-danger",
        ghost:
          "bg-transparent text-muted hover:bg-surface-hover hover:text-foreground focus:ring-muted",
        outline:
          "bg-transparent border border-border-light text-foreground hover:bg-surface-hover focus:ring-primary",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-10 px-4 text-sm gap-2",
        lg: "h-12 px-6 text-base gap-2.5",
        icon: "h-10 w-10 p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
      loading?: boolean;
      iconLeft?: React.ReactNode;
      iconRight?: React.ReactNode;
    }
>(
  (
    {
      className,
      variant,
      size,
      loading,
      fullWidth,
      iconLeft,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          iconLeft && <span className="inline-flex shrink-0">{iconLeft}</span>
        )}
        {children}
        {iconRight && !loading && (
          <span className="inline-flex shrink-0">{iconRight}</span>
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
