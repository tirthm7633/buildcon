import Link from "next/link";
import { MessageSquare, Phone } from "lucide-react";

import { findBadgeClass, findLabel, WALKIN_STATUSES } from "@/lib/constants";
import { formatRelativeToNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile, WalkIn } from "@/lib/supabase/types";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CallLink, WhatsAppLink } from "@/components/shared/contact-links";

export interface LastContact {
  actorName: string | null;
  medium: "call" | "whatsapp" | "in_person";
  createdAt: string;
}

export interface WalkInCardData extends WalkIn {
  createdByProfile: Profile | null;
  lastContact: LastContact | null;
}

const MEDIUM_LABEL: Record<LastContact["medium"], string> = {
  call: "a call",
  whatsapp: "WhatsApp",
  in_person: "an in-person visit",
};

export function WalkInCard({ walkIn }: { walkIn: WalkInCardData }) {
  return (
    <Card className="relative transition-shadow hover:shadow-md">
      <Link
        href={`/walk-ins/${walkIn.id}`}
        aria-label={`Open ${walkIn.name}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <CardHeader>
        <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground">{walkIn.walk_in_number}</p>
        <CardTitle className="text-lg leading-snug">{walkIn.name}</CardTitle>
        <CardAction>
          <StatusBadge
            label={findLabel(WALKIN_STATUSES, walkIn.status)}
            className={findBadgeClass(WALKIN_STATUSES, walkIn.status)}
          />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{walkIn.phone}</span>
          <span className="truncate text-right text-muted-foreground">Made by {walkIn.createdByProfile?.full_name ?? "—"}</span>
        </div>

        <p className={cn("text-xs", walkIn.lastContact ? "text-muted-foreground" : "text-muted-foreground/70 italic")}>
          {walkIn.lastContact ? (
            <>
              Last reached by <span className="font-medium text-foreground">{walkIn.lastContact.actorName ?? "someone"}</span>{" "}
              via {MEDIUM_LABEL[walkIn.lastContact.medium]} · {formatRelativeToNow(walkIn.lastContact.createdAt)}
            </>
          ) : (
            "Not contacted yet"
          )}
        </p>

        <div className="relative z-10 flex items-center gap-2 pt-1">
          <CallLink
            entityType="walk_in"
            entityId={walkIn.id}
            floorId={walkIn.floor_id}
            phone={walkIn.phone}
            stopPropagation
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="size-3.5" />
            Call
          </CallLink>
          <WhatsAppLink
            entityType="walk_in"
            entityId={walkIn.id}
            floorId={walkIn.floor_id}
            phone={walkIn.phone}
            stopPropagation
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
          >
            <MessageSquare className="size-3.5 text-[#25D366]" />
            Message
          </WhatsAppLink>
        </div>
      </CardContent>
    </Card>
  );
}
