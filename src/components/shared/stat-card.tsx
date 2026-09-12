import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  accent?: "default" | "accent";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            accent === "accent" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {trendLabel ? (
        <p
          className={cn(
            "mt-1.5 text-xs font-medium",
            trend === "up" && "text-emerald-600",
            trend === "down" && "text-rose-600",
            trend === "flat" && "text-muted-foreground"
          )}
        >
          {trendLabel}
        </p>
      ) : null}
    </div>
  );
}
