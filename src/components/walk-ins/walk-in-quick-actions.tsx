"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, Phone, Repeat, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { addWalkInActivity, markWalkInConverted, setWalkInStatus } from "@/lib/actions/walk-ins";
import { logContact } from "@/lib/actions/activity";
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
import { CallLink, WhatsAppLink } from "@/components/shared/contact-links";

export function WalkInQuickActions({ walkIn, floorId, staff }: { walkIn: WalkIn; floorId: FloorId; staff: Profile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitNote, setVisitNote] = useState("");

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

  function logVisit() {
    startTransition(async () => {
      const result = await logContact("walk_in", walkIn.id, floorId, "in_person", visitNote.trim() || undefined);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setVisitNote("");
      setVisitOpen(false);
      toast.success("Visit logged");
      router.refresh();
    });
  }

  function convert() {
    startTransition(async () => {
      const result = await markWalkInConverted(walkIn.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked as converted");
      router.refresh();
    });
  }

  function markStatus(status: "lost" | "contacted") {
    startTransition(async () => {
      const result = await setWalkInStatus(walkIn.id, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "lost" ? "Marked as lost" : "Reopened");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <CallLink entityType="walk_in" entityId={walkIn.id} floorId={floorId} phone={walkIn.phone}>
          <Phone className="size-4" />
          Call
        </CallLink>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <WhatsAppLink entityType="walk_in" entityId={walkIn.id} floorId={floorId} phone={walkIn.phone}>
          <MessageCircle className="size-4" />
          WhatsApp
        </WhatsAppLink>
      </Button>

      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Users className="size-4" />
            Log in-person visit
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log an in-person visit</DialogTitle>
          </DialogHeader>
          <Textarea
            value={visitNote}
            onChange={(e) => setVisitNote(e.target.value)}
            rows={4}
            placeholder="What was discussed… (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={logVisit} disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {!["won", "lost"].includes(walkIn.status) ? (
        <>
          <Button size="sm" onClick={convert} disabled={isPending}>
            <CheckCircle2 className="size-4" />
            Mark converted
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
