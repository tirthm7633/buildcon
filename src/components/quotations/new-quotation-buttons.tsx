"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createEmptyQuotation } from "@/lib/actions/quotations";
import { Button } from "@/components/ui/button";

export function NewQuotationButtons() {
  const router = useRouter();
  const [pending, setPending] = useState<"selection" | "quotation" | null>(null);

  async function start(startAsQuotation: boolean) {
    setPending(startAsQuotation ? "quotation" : "selection");
    const result = await createEmptyQuotation(startAsQuotation);
    if (result.error || !result.id) {
      toast.error(result.error ?? "Something went wrong");
      setPending(null);
      return;
    }
    router.push(`/quotations/${result.id}`);
  }

  return (
    <>
      <Button variant="outline" onClick={() => start(true)} disabled={pending !== null}>
        {pending === "quotation" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        New quotation
      </Button>
      <Button onClick={() => start(false)} disabled={pending !== null}>
        {pending === "selection" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        New selection
      </Button>
    </>
  );
}
