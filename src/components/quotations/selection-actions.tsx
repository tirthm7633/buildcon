"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { approveSelection, deleteQuotation } from "@/lib/actions/quotations";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SelectionPdfDocument } from "@/components/quotations/selection-pdf";
import type { SelectionItemRow } from "@/components/quotations/selection-items-panel";
import type { CompanySettings, Quotation, UserRole } from "@/lib/supabase/types";

export function SelectionActions({
  quotation,
  items,
  company,
  attendedByName,
  preparedByName,
  role,
}: {
  quotation: Quotation;
  items: SelectionItemRow[];
  company: CompanySettings | null;
  attendedByName: string | null;
  preparedByName: string | null;
  role: UserRole;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, startApprove] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  function saveNow() {
    router.refresh();
    toast.success("All changes saved");
  }

  const wasDraft = quotation.status === "draft";
  const isQuotationContext = !wasDraft;

  function approve() {
    startApprove(async () => {
      const result = await approveSelection(quotation.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(wasDraft ? "Selection moved to Quotations" : "Order placed");
      router.push("/quotations");
    });
  }

  async function confirmDelete() {
    setIsDeleting(true);
    const result = await deleteQuotation(quotation.id);
    setIsDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setDeleteOpen(false);
    toast.success("Quotation deleted");
    router.push("/quotations");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={saveNow}>
        <Save className="size-4" />
        Save
      </Button>
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={isGenerating}>
        {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Download
      </Button>
      {!quotation.locked_at ? (
        <Button size="sm" onClick={approve} disabled={isApproving || items.length === 0}>
          {isApproving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {wasDraft ? "Move to quotation" : "Place order"}
        </Button>
      ) : null}

      {isQuotationContext && role !== "staff" ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {quotation.quotation_number}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the quotation and its product list. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={confirmDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
