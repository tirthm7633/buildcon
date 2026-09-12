import { canManagePermissions, isOwner } from "@/lib/auth";
import { getStaffPermissions, resolvePagePermission, resolveWalkInDataScope } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { STAFF_PAGE_PERMISSIONS } from "@/lib/constants";
import type { PagePermissionKey } from "@/lib/supabase/types";
import { PageHeader } from "@/components/shared/page-header";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { StaffPermissionsPanel } from "@/components/settings/staff-permissions-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const { profile, floor } = await requireFloor();
  const [owner, canManage, supabase] = await Promise.all([isOwner(), canManagePermissions(floor.id), createClient()]);
  const { data: settings } = await supabase.from("company_settings").select("*").eq("id", true).single();

  let pagePermissions: Record<PagePermissionKey, boolean> | null = null;
  let walkInsDataScope: "all" | "own" = "all";
  if (canManage) {
    const map = await getStaffPermissions(floor.id);
    pagePermissions = Object.fromEntries(
      STAFF_PAGE_PERMISSIONS.map(({ key }) => [key, resolvePagePermission(map, key)])
    ) as Record<PagePermissionKey, boolean>;
    walkInsDataScope = resolveWalkInDataScope(map);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={owner ? "Business profile, branding and quotation defaults." : "View-only — ask the owner to make changes."}
      />

      {canManage && pagePermissions ? (
        <StaffPermissionsPanel
          floorId={floor.id}
          floorName={floor.shortLabel}
          pagePermissions={pagePermissions}
          walkInsDataScope={walkInsDataScope}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          {owner ? (
            <LogoUploader logoUrl={settings?.logo_url ?? null} />
          ) : (
            <p className="text-sm text-muted-foreground">Only the owner can change the logo.</p>
          )}
        </CardContent>
      </Card>

      {settings ? <CompanySettingsForm settings={settings} readOnly={!owner} /> : null}

      <p className="text-xs text-muted-foreground">Signed in as {profile.email}</p>
    </div>
  );
}
