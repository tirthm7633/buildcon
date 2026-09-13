import { Plus } from "lucide-react";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomersTable } from "@/components/customers/customers-table";

export default async function CustomersPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.customers);
  await requirePageAccess(floor, profile, "page.customers");

  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("floor_id", floor.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Every customer on this floor, with their full history."
        actions={
          <CustomerForm
            trigger={
              <Button>
                <Plus className="size-4" />
                Add customer
              </Button>
            }
          />
        }
      />
      <CustomersTable customers={customers ?? []} />
    </div>
  );
}
