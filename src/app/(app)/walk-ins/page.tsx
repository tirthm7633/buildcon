import { Plus } from "lucide-react";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WalkInForm } from "@/components/walk-ins/walk-in-form";
import { WalkInsTable } from "@/components/walk-ins/walk-ins-table";
import type { WalkInRow } from "@/components/walk-ins/walk-in-columns";

export default async function WalkInsPage() {
  const { profile, floor } = await requireFloor();
  await requirePageAccess(floor, profile.role, "page.walk_ins");

  const supabase = await createClient();

  const [{ data: walkIns }, { data: staff }] = await Promise.all([
    supabase.from("walk_ins").select("*").eq("floor_id", floor.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
  ]);

  const staffList = staff ?? [];
  const staffById = new Map(staffList.map((s) => [s.id, s]));

  const rows: WalkInRow[] = (walkIns ?? []).map((w) => ({
    ...w,
    assignedProfile: w.assigned_to ? staffById.get(w.assigned_to) ?? null : null,
  }));

  return (
    <div>
      <PageHeader
        title={floor.modules.walkInsLabel}
        description="Every showroom visit and enquiry for this floor."
        actions={
          <WalkInForm
            floorId={floor.id}
            staff={staffList}
            trigger={
              <Button>
                <Plus className="size-4" />
                Add walk-in
              </Button>
            }
          />
        }
      />
      <WalkInsTable walkIns={rows} walkInLabel={floor.modules.walkInsLabel} />
    </div>
  );
}
