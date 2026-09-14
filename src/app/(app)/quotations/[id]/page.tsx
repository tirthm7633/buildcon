import { notFound } from "next/navigation";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { findBadgeClass, findLabel, QUOTATION_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectionHeaderEditDialog } from "@/components/quotations/selection-header-edit-dialog";
import { SelectionActions } from "@/components/quotations/selection-actions";
import { SelectionItemsPanel, type SelectionItemRow } from "@/components/quotations/selection-items-panel";

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
      .select("*, catalogue_items(size, catalogue_images(url, position))")
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
      size: string | null;
      catalogue_images: { url: string; position: number }[] | null;
    } | null;
    const images = catalogueItem?.catalogue_images ?? [];
    const sorted = [...images].sort((a, b) => a.position - b.position);
    return { ...item, size: catalogueItem?.size ?? null, imageUrl: sorted[0]?.url ?? null };
  });

  const editable = quotation.status === "draft";

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotation.customer_name || "Untitled selection"}
        description={
          <>
            <span className="font-mono">{quotation.quotation_number}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={findLabel(QUOTATION_STATUSES, quotation.status)}
              className={findBadgeClass(QUOTATION_STATUSES, quotation.status)}
            />
            {editable ? (
              <SelectionHeaderEditDialog
                quotation={quotation}
                floorId={floor.id}
                currentProfile={profile}
                createdByName={createdByName}
                headManagers={headManagers}
                trigger={<Button variant="outline">Edit</Button>}
              />
            ) : null}
          </div>
        }
      />

      <SelectionActions
        quotation={quotation}
        items={items}
        company={company ?? null}
        attendedByName={attendedByName}
        preparedByName={createdByName}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SelectionItemsPanel quotationId={quotation.id} floorId={floor.id} items={items} editable={editable} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{quotation.customer_phone}</span>
            </div>
            {quotation.customer_address ? (
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Address</span>
                <span className="text-right">{quotation.customer_address}</span>
              </div>
            ) : null}
            {quotation.reference ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span>{quotation.reference}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prepared by</span>
              <span>{createdByName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attended by</span>
              <span>{attendedByName ?? "None"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
