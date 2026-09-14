"use client";

import { useRouter } from "next/navigation";

import { SelectionHeaderForm } from "@/components/quotations/selection-header-form";
import type { FloorId, Profile } from "@/lib/supabase/types";

export function NewSelectionClient({
  floorId,
  currentProfile,
  headManagers,
}: {
  floorId: FloorId;
  currentProfile: Pick<Profile, "id" | "full_name">;
  headManagers: Profile[];
}) {
  const router = useRouter();

  return (
    <SelectionHeaderForm
      floorId={floorId}
      currentProfile={currentProfile}
      headManagers={headManagers}
      submitLabel="Create selection"
      onSuccess={(id) => router.push(`/quotations/${id}`)}
    />
  );
}
