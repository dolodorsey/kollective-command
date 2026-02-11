import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  className?: string;
  onClick?: () => void;
  alert?: boolean;
}

export function StatCard({ label, value, icon: Icon, description, className, onClick, alert }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border p-4 text-left transition-all duration-300",
        alert
          ? "border-status-error/30 bg-status-error/5 hover:border-status-error/50 hover:shadow-[0_0_20px_hsl(0_84%_60%/0.1)]"
          : "border-border/50 bg-card hover:border-primary/30 hover:shadow-gold-glow",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4 transition-colors", alert ? "text-status-error/70" : "text-primary/70 group-hover:text-primary")} />
      </div>
      <div className={cn("mt-2 font-mono text-2xl font-bold", alert ? "text-status-error" : "text-foreground")}>{value}</div>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {onClick && (
        <p className="mt-1.5 text-[10px] text-muted-foreground/40 transition-colors group-hover:text-primary/50">
          Click to intervene
        </p>
      )}
    </Wrapper>
  );
}
