"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SelectionHeaderForm } from "@/components/quotations/selection-header-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { FloorId, Profile, Quotation } from "@/lib/supabase/types";

export function SelectionHeaderEditDialog({
  quotation,
  floorId,
  currentProfile,
  createdByName,
  headManagers,
  trigger,
}: {
  quotation: Quotation;
  floorId: FloorId;
  currentProfile: Pick<Profile, "id" | "full_name">;
  createdByName: string | null;
  headManagers: Profile[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit selection details</DialogTitle>
        </DialogHeader>
        <SelectionHeaderForm
          quotation={quotation}
          floorId={floorId}
          currentProfile={currentProfile}
          createdByName={createdByName}
          headManagers={headManagers}
          submitLabel="Save changes"
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
