import { CheckCircle2, Database, KeyRound, Rocket } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo variant="dark" />
        <h1 className="text-2xl font-semibold tracking-tight">Connect Supabase to finish setup</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Buildcon House is installed, but it needs a Supabase project for authentication, the
          database, and file storage before anyone can sign in.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <Database className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">1. Create a Supabase project</CardTitle>
              <CardDescription>
                Sign up at{" "}
                <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  supabase.com
                </a>{" "}
                and create a new project (any region close to your users works).
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <Rocket className="size-4.5" />
            </div>
            <div className="w-full">
              <CardTitle className="text-base">2. Run the database migration</CardTitle>
              <CardDescription>
                Open the SQL Editor in your Supabase project and run the contents of{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">supabase/migrations/0001_init.sql</code>{" "}
                from this repository. It creates every table, security policy, and the storage
                bucket used for the company logo.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <KeyRound className="size-4.5" />
            </div>
            <div className="w-full">
              <CardTitle className="text-base">3. Add your project keys</CardTitle>
              <CardDescription>
                From Project Settings → API, copy the values into a{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> file at the
                project root:
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <CheckCircle2 className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">4. Create your owner account</CardTitle>
              <CardDescription>
                In Supabase → Authentication → Users, add yourself with a password and set{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">role: &quot;owner&quot;</code>{" "}
                under User Metadata. Restart the dev server, then sign in.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
