import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { getFollowUpsForFloor } from "@/lib/queries/follow-ups";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { FollowUpsWorkspace } from "@/components/follow-ups/follow-ups-workspace";

export default async function FollowUpsPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.followUps);
  await requirePageAccess(floor, profile, "page.follow_ups");

  const supabase = await createClient();

  const [followUps, { data: staff }] = await Promise.all([
    getFollowUpsForFloor(floor.id),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
  ]);

  return (
    <div>
      <PageHeader title="Follow-ups" description="Everything waiting on your team for this floor." />
      <FollowUpsWorkspace followUps={followUps} staff={staff ?? []} />
    </div>
  );
}
