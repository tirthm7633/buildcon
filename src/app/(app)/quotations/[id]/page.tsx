import { notFound } from "next/navigation";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { findBadgeClass, findLabel, QUOTATION_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SelectionActions } from "@/components/quotations/selection-actions";
import { SelectionDocument } from "@/components/quotations/selection-document";
import type { SelectionItemRow } from "@/components/quotations/selection-items-panel";

export default async function SelectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, floor } = await requireFloor((f) => Boolean(f.modules.quotationsLabel));
  await requirePageAccess(floor, profile, "page.quotations");

  const supabase = await createClient();
  const { data: quotation } = await supabase.from("quotations").select("*").eq("id", id).eq("floor_id", floor.id).single();
  if (!quotation) notFound();

  const [{ data: profiles }, { data: floorAccess }, { data: itemsRaw }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("user_floor_access").select("user_id").eq("floor_id", floor.id),
    supabase
      .from("quotation_items")
      .select("*, catalogue_items(catalogue_images(url, position), catalogue_item_sizes(id, size, rate, position))")
      .eq("quotation_id", id)
      .order("position"),
    supabase.from("company_settings").select("*").eq("id", true).single(),
  ]);

  const profileList = profiles ?? [];
  const profileById = new Map(profileList.map((p) => [p.id, p]));
  const createdByName = quotation.created_by ? (profileById.get(quotation.created_by)?.full_name ?? null) : null;
  const attendedByName = quotation.attended_by ? (profileById.get(quotation.attended_by)?.full_name ?? null) : null;

  const accessibleIds = new Set((floorAccess ?? []).map((r) => r.user_id));
  const headManagers = profileList.filter((p) => (p.role === "head" || p.role === "manager") && accessibleIds.has(p.id));

  const items: SelectionItemRow[] = (itemsRaw ?? []).map(({ catalogue_items, ...item }) => {
    const catalogueItem = catalogue_items as unknown as {
      catalogue_images: { url: string; position: number }[] | null;
      catalogue_item_sizes: { id: string; size: string; rate: number; position: number }[] | null;
    } | null;
    const images = catalogueItem?.catalogue_images ?? [];
    const sorted = [...images].sort((a, b) => a.position - b.position);
    const sizeOptions = (catalogueItem?.catalogue_item_sizes ?? []).slice().sort((a, b) => a.position - b.position);
    return { ...item, imageUrl: sorted[0]?.url ?? null, sizeOptions };
  });

  // Locked by locked_at, not status — a Selection approved from draft and a
  // Quotation created directly (skipping draft) both end up "awaiting_approval",
  // but the direct one starts empty and must stay editable until finalized.
  const editable = !quotation.locked_at;

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotation.customer_name || "Untitled selection"}
        description={<span className="font-mono">{quotation.quotation_number}</span>}
        actions={
          <StatusBadge
            label={findLabel(QUOTATION_STATUSES, quotation.status)}
            className={findBadgeClass(QUOTATION_STATUSES, quotation.status)}
          />
        }
      />

      <SelectionActions
        quotation={quotation}
        items={items}
        company={company ?? null}
        attendedByName={attendedByName}
        preparedByName={createdByName}
      />

      <SelectionDocument
        quotation={quotation}
        floorId={floor.id}
        createdByName={createdByName}
        headManagers={headManagers}
        items={items}
        editable={editable}
        company={company ?? null}
      />
    </div>
  );
}
