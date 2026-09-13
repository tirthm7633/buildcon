import { canManagePermissions, isOwner } from "@/lib/auth";
import { getNavItems } from "@/components/layout/nav-items";
import { getRolePermissions, requirePageAccess, resolveFeatureAccess, resolveWalkInDataScope } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { GATABLE_ROLES } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { RolePermissionsPanel, type FeatureItem } from "@/components/settings/role-permissions-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GatableRole = (typeof GATABLE_ROLES)[number]["value"];

export default async function SettingsPage() {
  const { profile, floor } = await requireFloor();
  await requirePageAccess(floor, profile.role, "page.settings");

  const [owner, supabase, editableRoleChecks] = await Promise.all([
    isOwner(),
    createClient(),
    Promise.all(GATABLE_ROLES.map((r) => canManagePermissions(floor.id, r.value))),
  ]);
  const { data: settings } = await supabase.from("company_settings").select("*").eq("id", true).single();

  const editableRoles: GatableRole[] = GATABLE_ROLES.filter((_, i) => editableRoleChecks[i]).map((r) => r.value);

  // navItems (with each item's coded `defaults`) drives resolution below;
  // features strips that down to plain {key, label} — a Client Component
  // prop can't carry the rest (icon is a component reference, not JSON).
  const navItems = getNavItems(floor);
  const features: FeatureItem[] = navItems.map(({ permissionKey, label }) => ({ key: permissionKey, label }));

  let permissionsByRole = {} as Record<GatableRole, Record<string, boolean>>;
  let walkInsDataScope: "all" | "own" = "all";
  if (editableRoles.length > 0) {
    const maps = await Promise.all(editableRoles.map((role) => getRolePermissions(floor.id, role)));
    permissionsByRole = Object.fromEntries(
      editableRoles.map((role, i) => [
        role,
        Object.fromEntries(navItems.map((item) => [item.permissionKey, resolveFeatureAccess(maps[i], role, item)])),
      ])
    ) as Record<GatableRole, Record<string, boolean>>;

    const staffIndex = editableRoles.indexOf("staff");
    if (staffIndex >= 0) walkInsDataScope = resolveWalkInDataScope(maps[staffIndex]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={owner ? "Business profile, branding and quotation defaults." : "View-only — ask the owner to make changes."}
      />

      {editableRoles.length > 0 ? (
        <RolePermissionsPanel
          floorId={floor.id}
          floorName={floor.shortLabel}
          editableRoles={editableRoles}
          features={features}
          permissionsByRole={permissionsByRole}
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
