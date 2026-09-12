import { History } from "lucide-react";

import { formatRelativeToNow } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";

export interface TimelineEntry {
  id: string;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  actorName: string | null;
}

const ACTION_LABELS: Record<string, (meta: Record<string, unknown> | null) => string> = {
  note_added: (meta) => `added a note: "${meta?.note ?? ""}"`,
  status_changed: (meta) => `changed status from ${meta?.from} to ${meta?.to}`,
  converted_from_walkin: () => "converted this walk-in into a customer",
  quotation_created: (meta) => `created quotation ${meta?.quotation_number ?? ""}`,
  quotation_sent: () => "sent the quotation",
  quotation_accepted: () => "marked the quotation accepted",
  quotation_rejected: () => "marked the quotation rejected",
  payment_recorded: (meta) => `recorded a payment of ${meta?.amount ?? ""}`,
};

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) {
    return <EmptyState icon={History} title="No activity yet" description="Actions taken here will appear as a timeline." />;
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => {
        const describe = ACTION_LABELS[entry.action];
        return (
          <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
            <p className="text-foreground">
              <span className="font-medium">{entry.actorName ?? "Someone"}</span>{" "}
              <span className="text-muted-foreground">
                {describe ? describe(entry.meta) : entry.action.replaceAll("_", " ")}
              </span>
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeToNow(entry.created_at)}</span>
          </li>
        );
      })}
    </ol>
  );
}
