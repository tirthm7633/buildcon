import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Company name + logo only — safe to show on sign-in/reset pages before
 * anyone is authenticated. Backed by the `public_branding()` Postgres
 * function (security definer), which is the only part of company_settings
 * exposed to the `anon` role.
 */
export async function getPublicBranding() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_branding");
  return data?.[0] ?? { company_name: "Buildcon House", logo_url: null };
}
