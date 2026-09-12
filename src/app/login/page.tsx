import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { getPublicBranding } from "@/lib/public-branding";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isSupabaseConfigured) {
    redirect("/setup");
  }

  const [{ next }, branding] = await Promise.all([searchParams, getPublicBranding()]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary/[0.03] px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo variant="dark" companyName={branding.company_name} logoUrl={branding.logo_url} showWordmark={false} size={56} />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to manage walk-ins, quotations and payments across every floor.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm nextPath={next && next.startsWith("/") ? next : "/"} />
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account? Ask your Buildcon House administrator to invite you.
        </p>
      </div>
    </div>
  );
}
