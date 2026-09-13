import { isOwner } from "@/lib/auth";
import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const { profile, floor } = await requireFloor();
  await requirePageAccess(floor, profile, "page.settings");

  const [owner, supabase] = await Promise.all([isOwner(), createClient()]);
  const { data: settings } = await supabase.from("company_settings").select("*").eq("id", true).single();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={owner ? "Business profile, branding and quotation defaults." : "View-only — ask the owner to make changes."}
      />

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
