import { redirect } from "next/navigation";

import { canManageTeam, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { getFloorConfig } from "@/lib/floors";
import { requirePageAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { InviteStaffForm } from "@/components/settings/invite-staff-form";
import { TeamTable, type StaffRow } from "@/components/settings/team-table";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!(await canManageTeam())) redirect("/");

  // Team itself isn't floor-scoped data, but its page-visibility toggle is
  // — same as every other page — so it's checked against the active floor.
  const floor = getFloorConfig(await getActiveFloorId());
  await requirePageAccess(floor, profile.role, "page.team");

  const supabase = await createClient();
  const [{ data: staff }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("user_floor_access").select("*"),
  ]);

  const accessByUser = new Map<string, string[]>();
  for (const row of access ?? []) {
    accessByUser.set(row.user_id, [...(accessByUser.get(row.user_id) ?? []), row.floor_id]);
  }

  const rows: StaffRow[] = (staff ?? []).map((s) => ({
    ...s,
    floorIds: (accessByUser.get(s.id) ?? []) as StaffRow["floorIds"],
  }));

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite staff, assign roles, and control which floors they can see."
        actions={<InviteStaffForm />}
      />
      <TeamTable staff={rows} currentUserId={profile.id} />
    </div>
  );
}
