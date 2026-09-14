import { History, Phone, MessageCircle, Users } from "lucide-react";

import { formatDateTime, formatRelativeToNow } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";

export interface TimelineEntry {
  id: string;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  actorName: string | null;
}

const CONTACT_MEDIUM_LABEL: Record<string, string> = {
  call: "called them",
  whatsapp: "messaged them on WhatsApp",
  in_person: "visited them in person",
};

const CONTACT_MEDIUM_ICON: Record<string, typeof Phone> = {
  call: Phone,
  whatsapp: MessageCircle,
  in_person: Users,
};

const ACTION_LABELS: Record<string, (meta: Record<string, unknown> | null) => string> = {
  note_added: (meta) => `added a note: "${meta?.note ?? ""}"`,
  status_changed: (meta) => `changed status from ${meta?.from} to ${meta?.to}`,
  converted_from_walkin: () => "converted this walk-in into a customer",
  quotation_created: (meta) => `created quotation ${meta?.quotation_number ?? ""}`,
  quotation_sent: () => "sent the quotation",
  quotation_accepted: () => "marked the quotation accepted",
  quotation_rejected: () => "marked the quotation rejected",
  payment_recorded: (meta) => `recorded a payment of ${meta?.amount ?? ""}`,
  contact_logged: (meta) => {
    const medium = typeof meta?.medium === "string" ? meta.medium : "";
    const label = CONTACT_MEDIUM_LABEL[medium] ?? "made contact";
    const note = typeof meta?.note === "string" && meta.note ? ` — "${meta.note}"` : "";
    return `${label}${note}`;
  },
};

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) {
    return <EmptyState icon={History} title="No activity yet" description="Actions taken here will appear as a timeline." />;
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => {
        const describe = ACTION_LABELS[entry.action];
        const medium = entry.action === "contact_logged" && typeof entry.meta?.medium === "string" ? entry.meta.medium : null;
        const MediumIcon = medium ? CONTACT_MEDIUM_ICON[medium] : null;
        return (
          <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="flex items-start gap-2.5">
              {MediumIcon ? (
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <MediumIcon className="size-3.5" />
                </span>
              ) : null}
              <p className="text-foreground">
                <span className="font-medium">{entry.actorName ?? "Someone"}</span>{" "}
                <span className="text-muted-foreground">
                  {describe ? describe(entry.meta) : entry.action.replaceAll("_", " ")}
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-foreground">{formatDateTime(entry.created_at)}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeToNow(entry.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
