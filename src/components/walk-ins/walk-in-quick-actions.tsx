"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, Phone, Repeat, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";

import { addWalkInActivity, convertWalkInToCustomer, setWalkInStatus } from "@/lib/actions/walk-ins";
import type { FloorId, Profile, WalkIn } from "@/lib/supabase/types";
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
import { FollowUpForm } from "@/components/follow-ups/follow-up-form";

export function WalkInQuickActions({ walkIn, floorId, staff }: { walkIn: WalkIn; floorId: FloorId; staff: Profile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  function saveNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const result = await addWalkInActivity(walkIn.id, floorId, note.trim());
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

  function convert() {
    startTransition(async () => {
      const result = await convertWalkInToCustomer(walkIn.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Converted to customer");
      router.push(`/customers/${result.id}`);
    });
  }

  function markStatus(status: "won" | "lost" | "contacted") {
    startTransition(async () => {
      const result = await setWalkInStatus(walkIn.id, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "won" ? "Marked as won" : "Marked as lost");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={`tel:${walkIn.phone}`}>
          <Phone className="size-4" />
          Call
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={`https://wa.me/${(walkIn.whatsapp || walkIn.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
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

      <FollowUpForm
        entityType="walk_in"
        entityId={walkIn.id}
        staff={staff}
        trigger={
          <Button variant="outline" size="sm">
            Schedule follow-up
          </Button>
        }
      />

      {!walkIn.customer_id ? (
        <Button variant="outline" size="sm" onClick={convert} disabled={isPending}>
          <UserPlus className="size-4" />
          Convert to customer
        </Button>
      ) : null}

      {!["won", "lost"].includes(walkIn.status) ? (
        <>
          <Button size="sm" onClick={() => markStatus("won")} disabled={isPending}>
            <CheckCircle2 className="size-4" />
            Mark won
          </Button>
          <Button variant="outline" size="sm" onClick={() => markStatus("lost")} disabled={isPending}>
            <XCircle className="size-4" />
            Mark lost
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={() => markStatus("contacted")} disabled={isPending}>
          <Repeat className="size-4" />
          Reopen
        </Button>
      )}
    </div>
  );
}
