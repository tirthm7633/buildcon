import Link from "next/link";
import { Plus } from "lucide-react";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { findBadgeClass, findLabel, QUOTATION_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QuotationsList } from "@/components/quotations/quotations-list";

export default async function QuotationsPage() {
  const { profile, floor } = await requireFloor((f) => Boolean(f.modules.quotationsLabel));
  await requirePageAccess(floor, profile, "page.quotations");

  const supabase = await createClient();
  const { data: quotations } = await supabase
    .from("quotations")
    .select("id, quotation_number, customer_name, customer_phone, status, total, issue_date, created_at")
    .eq("floor_id", floor.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title={floor.modules.quotationsLabel ?? "Quotations"}
        description="Selections in progress, and quotations ready for the next stage."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/quotations/new?type=quotation">
                <Plus className="size-4" />
                New quotation
              </Link>
            </Button>
            <Button asChild>
              <Link href="/quotations/new">
                <Plus className="size-4" />
                New selection
              </Link>
            </Button>
          </>
        }
      />
      <QuotationsList
        rows={(quotations ?? []).map((q) => ({
          ...q,
          statusLabel: findLabel(QUOTATION_STATUSES, q.status),
          statusClass: findBadgeClass(QUOTATION_STATUSES, q.status),
          issueDateLabel: formatDate(q.issue_date),
        }))}
      />
    </div>
  );
}
