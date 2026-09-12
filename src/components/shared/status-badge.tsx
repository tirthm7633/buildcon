import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 font-medium capitalize", className)}
    >
      {label}
    </Badge>
  );
}
