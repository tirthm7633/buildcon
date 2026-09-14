"use client";

import { useRouter } from "next/navigation";

import { SelectionHeaderForm } from "@/components/quotations/selection-header-form";
import type { FloorId, Profile } from "@/lib/supabase/types";

export function NewSelectionClient({
  floorId,
  currentProfile,
  headManagers,
  startAsQuotation = false,
}: {
  floorId: FloorId;
  currentProfile: Pick<Profile, "id" | "full_name">;
  headManagers: Profile[];
  startAsQuotation?: boolean;
}) {
  const router = useRouter();

  return (
    <SelectionHeaderForm
      floorId={floorId}
      currentProfile={currentProfile}
      headManagers={headManagers}
      submitLabel={startAsQuotation ? "Create quotation" : "Create selection"}
      startAsQuotation={startAsQuotation}
      onSuccess={(id) => router.push(`/quotations/${id}`)}
    />
  );
}
