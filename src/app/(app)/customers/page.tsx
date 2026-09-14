import { Plus } from "lucide-react";

import { canManageCustomerTier } from "@/lib/auth";
import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomersList } from "@/components/customers/customers-list";

export default async function CustomersPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.customers);
  await requirePageAccess(floor, profile, "page.customers");

  const supabase = await createClient();
  const [{ data: customers }, canEditTier] = await Promise.all([
    supabase.from("customers").select("*").eq("floor_id", floor.id).order("created_at", { ascending: false }),
    canManageCustomerTier(floor.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Every customer on this floor, with their full history."
        actions={
          <CustomerForm
            canEditTier={canEditTier}
            trigger={
              <Button>
                <Plus className="size-4" />
                Add customer
              </Button>
            }
          />
        }
      />
      <CustomersList customers={customers ?? []} />
    </div>
  );
}
