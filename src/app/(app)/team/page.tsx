import { redirect } from "next/navigation";

import { canManageTeam, getCurrentProfile, getManagedTeamMemberIds } from "@/lib/auth";
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
  await requirePageAccess(floor, profile, "page.team");

  const managedIds = await getManagedTeamMemberIds();

  const supabase = await createClient();
  let profilesQuery = supabase.from("profiles").select("*").order("created_at");
  if (managedIds !== "all") {
    if (managedIds.length === 0) {
      // Head with no Staff/Manager sharing any of their floors yet.
      return (
        <div>
          <PageHeader title="Team" description="No one on your floors yet." />
        </div>
      );
    }
    profilesQuery = profilesQuery.in("id", managedIds);
  }

  const [{ data: staff }, { data: access }] = await Promise.all([
    profilesQuery,
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
        description="Invite people, assign roles, and open a profile to control their floor access and permissions."
        actions={managedIds === "all" ? <InviteStaffForm /> : null}
      />
      <TeamTable staff={rows} currentUserId={profile.id} />
    </div>
  );
}
