import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  canManagePermissions,
  canManageTeam,
  getAccessibleFloorIds,
  getCurrentProfile,
  getManagedTeamMemberIds,
} from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { FLOORS, getFloorConfig } from "@/lib/floors";
import { getUserPermissions, requirePageAccess, resolveFeatureAccess, resolveWalkInDataScope } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { findLabel, USER_ROLES } from "@/lib/constants";
import { getNavItems } from "@/components/layout/nav-items";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAccessPanel, type MemberFloorAccess } from "@/components/settings/member-access-panel";

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!(await canManageTeam())) redirect("/");

  // Same floor-agnostic page-visibility check the Team list itself uses.
  const floor = getFloorConfig(await getActiveFloorId());
  await requirePageAccess(floor, profile, "page.team");

  const managedIds = await getManagedTeamMemberIds();
  if (managedIds !== "all" && !managedIds.includes(id)) redirect("/team");

  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!member) notFound();

  const header = (
    <>
      <Link href="/team" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Team
      </Link>
      <PageHeader title={member.full_name} description={`${member.email} · ${findLabel(USER_ROLES, member.role)}`} />
    </>
  );

  if (member.role === "owner") {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Owner</CardTitle>
            <CardDescription>
              Owners have full access to every floor and feature — there&apos;s nothing to configure here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const viewerFloorIds = await getAccessibleFloorIds();
  const floorsToShow = FLOORS.filter((f) => viewerFloorIds.includes(f.id));

  const [{ data: access }, editChecks, maps] = await Promise.all([
    supabase.from("user_floor_access").select("floor_id").eq("user_id", id),
    Promise.all(floorsToShow.map((f) => canManagePermissions(f.id, id))),
    Promise.all(floorsToShow.map((f) => getUserPermissions(f.id, id))),
  ]);

  const accessSet = new Set((access ?? []).map((row) => row.floor_id));

  const floors: MemberFloorAccess[] = floorsToShow.map((f, i) => ({
    floorId: f.id,
    floorName: f.shortLabel,
    hasAccess: accessSet.has(f.id),
    canEdit: editChecks[i],
    features: getNavItems(f).map((item) => ({
      key: item.permissionKey,
      label: item.label,
      enabled: resolveFeatureAccess(maps[i], member.role, item),
    })),
    walkInsDataScope: resolveWalkInDataScope(maps[i]),
  }));

  return (
    <div className="space-y-6">
      {header}
      {floors.length > 0 ? (
        <MemberAccessPanel userId={member.id} isStaffTarget={member.role === "staff"} floors={floors} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No floors available</CardTitle>
            <CardDescription>You don&apos;t have access to any floors yet, so there&apos;s nothing to manage here.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
