import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getPublicBranding } from "@/lib/public-branding";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ForgotPasswordPage() {
  const branding = await getPublicBranding();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary/[0.03] px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo variant="dark" companyName={branding.company_name} logoUrl={branding.logo_url} showWordmark={false} height={64} priority />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Reset your password</CardTitle>
            <CardDescription>We&apos;ll email you a link to set a new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
