import { redirect } from "next/navigation";

import { getAccessibleFloorIds, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { getFloorConfig } from "@/lib/floors";
import { disabledKeysForRole, getRolePermissions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const [accessibleFloorIds, activeFloorId, { data: settings }] = await Promise.all([
    getAccessibleFloorIds(),
    getActiveFloorId(),
    (await createClient()).from("company_settings").select("logo_url").eq("id", true).single(),
  ]);

  const floorId = accessibleFloorIds.includes(activeFloorId) ? activeFloorId : accessibleFloorIds[0];
  const floorConfig = getFloorConfig(floorId ?? "tiles");
  const logoUrl = settings?.logo_url ?? null;

  // Generic across every role: Owner is never gated (and never fetched for),
  // everyone else is resolved from role_permissions with each nav item's own
  // coded default filling in whatever hasn't been explicitly toggled yet.
  let disabledPages: string[] = [];
  if (floorId && profile.role !== "owner") {
    const map = await getRolePermissions(floorId, profile.role);
    disabledPages = disabledKeysForRole(floorConfig, profile.role, map);
  }

  if (!floorId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="font-heading text-xl font-semibold">No floor access yet</h1>
          <p className="text-sm text-muted-foreground">
            Ask an owner to grant you access to a floor before you can use Buildcon House.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        logoUrl={logoUrl}
        profile={profile}
        floor={floorConfig}
        activeFloorId={floorId}
        accessibleFloorIds={accessibleFloorIds}
        disabledPages={disabledPages}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          logoUrl={logoUrl}
          profile={profile}
          floor={floorConfig}
          activeFloorId={floorId}
          accessibleFloorIds={accessibleFloorIds}
          disabledPages={disabledPages}
        />
        <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
