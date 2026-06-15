import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
  gradientBorder?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverLift = false, gradientBorder = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "glass card-gradient rounded-2xl border border-border-light p-6 shadow-sm transition-all duration-300",
        hoverLift && "hover-lift",
        gradientBorder && "gradient-border",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export { Card };
