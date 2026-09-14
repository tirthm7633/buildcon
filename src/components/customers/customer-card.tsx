import Link from "next/link";
import { MessageSquare, Phone } from "lucide-react";

import { CUSTOMER_TIERS, findBadgeClass, findLabel } from "@/lib/constants";
import { initials } from "@/lib/format";
import type { Customer } from "@/lib/supabase/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CallLink, WhatsAppLink } from "@/components/shared/contact-links";

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Card className="relative transition-shadow hover:shadow-md">
      <Link
        href={`/customers/${customer.id}`}
        aria-label={`Open ${customer.name}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate text-lg leading-snug">{customer.name}</CardTitle>
            {customer.company_name ? <p className="truncate text-xs text-muted-foreground">{customer.company_name}</p> : null}
          </div>
        </div>
        <CardAction>
          <StatusBadge
            label={findLabel(CUSTOMER_TIERS, customer.tier)}
            className={findBadgeClass(CUSTOMER_TIERS, customer.tier)}
          />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{customer.phone}</span>
          {customer.is_archived ? <span className="text-xs text-muted-foreground">Archived</span> : null}
        </div>

        <div className="relative z-10 flex items-center gap-2 pt-1">
          <CallLink
            entityType="customer"
            entityId={customer.id}
            floorId={customer.floor_id}
            phone={customer.phone}
            stopPropagation
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="size-3.5" />
            Call
          </CallLink>
          <WhatsAppLink
            entityType="customer"
            entityId={customer.id}
            floorId={customer.floor_id}
            phone={customer.phone}
            stopPropagation
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <MessageSquare className="size-3.5 text-[#25D366]" />
            Message
          </WhatsAppLink>
        </div>
      </CardContent>
    </Card>
  );
}
