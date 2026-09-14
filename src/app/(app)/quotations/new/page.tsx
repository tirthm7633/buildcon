import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { NewSelectionClient } from "@/components/quotations/new-selection-client";

export default async function NewSelectionPage() {
  const { profile, floor } = await requireFloor((f) => Boolean(f.modules.quotationsLabel));
  await requirePageAccess(floor, profile, "page.quotations");

  const supabase = await createClient();
  const [{ data: profiles }, { data: floorAccess }] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("user_floor_access").select("user_id").eq("floor_id", floor.id),
  ]);

  const accessibleIds = new Set((floorAccess ?? []).map((r) => r.user_id));
  const headManagers = (profiles ?? []).filter((p) => (p.role === "head" || p.role === "manager") && accessibleIds.has(p.id));

  return (
    <div className="max-w-2xl">
      <PageHeader title="New selection" description="Capture the customer and start shortlisting products." />
      <NewSelectionClient floorId={floor.id} currentProfile={profile} headManagers={headManagers} />
    </div>
  );
}
