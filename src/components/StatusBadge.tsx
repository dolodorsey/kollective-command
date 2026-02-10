import { cn } from "@/lib/utils";

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'purple' | 'pink' | 'cyan' | 'default';

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-status-success/15 text-status-success border-status-success/30",
  error: "bg-status-error/15 text-status-error border-status-error/30",
  warning: "bg-status-warning/15 text-status-warning border-status-warning/30",
  info: "bg-status-info/15 text-status-info border-status-info/30",
  purple: "bg-status-purple/15 text-status-purple border-status-purple/30",
  pink: "bg-status-pink/15 text-status-pink border-status-pink/30",
  cyan: "bg-status-cyan/15 text-status-cyan border-status-cyan/30",
  default: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ variant = 'default', children, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      variantStyles[variant],
      className
    )}>
      {children}
    </span>
  );
}
