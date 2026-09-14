"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { addCustomerNote, archiveCustomer } from "@/lib/actions/customers";
import type { Customer } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CallLink, WhatsAppLink } from "@/components/shared/contact-links";

export function CustomerQuickActions({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  function saveNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const result = await addCustomerNote(customer.id, note.trim());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setNote("");
      setNoteOpen(false);
      toast.success("Note added");
      router.refresh();
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      const result = await archiveCustomer(customer.id, !customer.is_archived);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(customer.is_archived ? "Customer restored" : "Customer archived");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <CallLink entityType="customer" entityId={customer.id} floorId={customer.floor_id} phone={customer.phone}>
          <Phone className="size-4" />
          Call
        </CallLink>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <WhatsAppLink entityType="customer" entityId={customer.id} floorId={customer.floor_id} phone={customer.phone}>
          <MessageCircle className="size-4" />
          WhatsApp
        </WhatsAppLink>
      </Button>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Add note
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a note</DialogTitle>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="What happened…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNote} disabled={isPending || !note.trim()}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" onClick={toggleArchive} disabled={isPending}>
        {customer.is_archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
        {customer.is_archived ? "Restore" : "Archive"}
      </Button>
    </div>
  );
}
