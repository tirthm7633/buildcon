import { getPublicBranding } from "@/lib/public-branding";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordPage() {
  const branding = await getPublicBranding();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary/[0.03] px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo variant="dark" companyName={branding.company_name} logoUrl={branding.logo_url} showWordmark={false} height={64} priority />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Choose a new password</CardTitle>
            <CardDescription>Use at least 6 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
