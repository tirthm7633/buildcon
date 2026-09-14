import { Plus } from "lucide-react";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WalkInForm } from "@/components/walk-ins/walk-in-form";
import { WalkInsList } from "@/components/walk-ins/walk-ins-list";
import type { LastContact, WalkInCardData } from "@/components/walk-ins/walk-in-card";

export default async function WalkInsPage() {
  const { profile, floor } = await requireFloor();
  await requirePageAccess(floor, profile, "page.walk_ins");

  const supabase = await createClient();

  const [{ data: walkIns }, { data: profiles }, { data: floorAccess }, { data: contacts }] = await Promise.all([
    supabase.from("walk_ins").select("*").eq("floor_id", floor.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("user_floor_access").select("user_id").eq("floor_id", floor.id),
    supabase
      .from("activities")
      .select("entity_id, meta, created_at, profiles(full_name)")
      .eq("floor_id", floor.id)
      .eq("entity_type", "walk_in")
      .eq("action", "contact_logged")
      .order("created_at", { ascending: false }),
  ]);

  const profileList = profiles ?? [];
  const profileById = new Map(profileList.map((p) => [p.id, p]));

  // "Attended by" can only ever be a Head or Manager with access to this
  // floor — same boundary the rest of the per-floor permission system uses.
  const accessibleIds = new Set((floorAccess ?? []).map((r) => r.user_id));
  const headManagers = profileList.filter((p) => (p.role === "head" || p.role === "manager") && accessibleIds.has(p.id));

  // Rows are already newest-first, so the first row seen per walk-in is its
  // most recent contact.
  const lastContactByWalkIn = new Map<string, LastContact>();
  for (const row of contacts ?? []) {
    if (lastContactByWalkIn.has(row.entity_id)) continue;
    lastContactByWalkIn.set(row.entity_id, {
      actorName: (row as unknown as { profiles: { full_name: string } | null }).profiles?.full_name ?? null,
      medium: (row.meta as { medium?: LastContact["medium"] } | null)?.medium ?? "call",
      createdAt: row.created_at,
    });
  }

  const rows: WalkInCardData[] = (walkIns ?? []).map((w) => ({
    ...w,
    createdByProfile: w.created_by ? profileById.get(w.created_by) ?? null : null,
    lastContact: lastContactByWalkIn.get(w.id) ?? null,
  }));

  return (
    <div>
      <PageHeader
        title={floor.modules.walkInsLabel}
        description="Every showroom visit and enquiry for this floor."
        actions={
          <WalkInForm
            floorId={floor.id}
            currentProfile={profile}
            headManagers={headManagers}
            trigger={
              <Button>
                <Plus className="size-4" />
                Add walk-in
              </Button>
            }
          />
        }
      />
      <WalkInsList walkIns={rows} walkInLabel={floor.modules.walkInsLabel} />
    </div>
  );
}
