import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "solid" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const variantClasses = {
      default: "btn-liquid",
      solid: "btn-liquid btn-liquid-solid",
      ghost: "btn-liquid btn-liquid-ghost",
    };

    const sizeClasses = {
      sm: "h-8 px-3 text-xs rounded-lg",
      default: "h-10 px-5 text-sm rounded-xl",
      lg: "h-12 px-7 text-base rounded-xl",
      icon: "h-10 w-10 rounded-xl p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export { GlassButton };
export type { GlassButtonProps };
