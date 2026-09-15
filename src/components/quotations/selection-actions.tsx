"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { approveSelection } from "@/lib/actions/quotations";
import { Button } from "@/components/ui/button";
import { SelectionPdfDocument } from "@/components/quotations/selection-pdf";
import type { SelectionItemRow } from "@/components/quotations/selection-items-panel";
import type { CompanySettings, Quotation } from "@/lib/supabase/types";

export function SelectionActions({
  quotation,
  items,
  company,
  attendedByName,
  preparedByName,
}: {
  quotation: Quotation;
  items: SelectionItemRow[];
  company: CompanySettings | null;
  attendedByName: string | null;
  preparedByName: string | null;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, startApprove] = useTransition();

  async function generatePdf() {
    setIsGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <SelectionPdfDocument
          quotation={quotation}
          items={items}
          company={company}
          attendedByName={attendedByName}
          preparedByName={preparedByName}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quotation.quotation_number.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't generate the PDF");
    } finally {
      setIsGenerating(false);
    }
  }

  const wasDraft = quotation.status === "draft";

  function approve() {
    startApprove(async () => {
      const result = await approveSelection(quotation.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(wasDraft ? "Selection approved — moved to Quotations" : "Quotation finalized");
      router.push("/quotations");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={isGenerating}>
        {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Generate PDF
      </Button>
      {!quotation.locked_at ? (
        <Button size="sm" onClick={approve} disabled={isApproving || items.length === 0}>
          {isApproving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {wasDraft ? "Approve" : "Finalize"}
        </Button>
      ) : null}
    </div>
  );
}
