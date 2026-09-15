"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ListChecks, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { completeFollowUp, deleteFollowUp, reassignFollowUp, rescheduleFollowUp } from "@/lib/actions/follow-ups";
import { findBadgeClass, findLabel, FOLLOW_UP_PRIORITIES, FOLLOW_UP_TYPES } from "@/lib/constants";
import { formatDateTime, isoToISTInputValue, istInputToISOString } from "@/lib/format";
import type { FollowUpWithContext } from "@/lib/queries/follow-ups";
import type { Profile } from "@/lib/supabase/types";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function isOverdue(f: FollowUpWithContext) {
  return f.status === "pending" && new Date(f.due_at).getTime() < Date.now();
}

function isToday(f: FollowUpWithContext) {
  const due = new Date(f.due_at);
  const now = new Date();
  return due.toDateString() === now.toDateString();
}

const TABS = [
  { value: "today", label: "Today" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
] as const;

export function FollowUpsWorkspace({ followUps, staff }: { followUps: FollowUpWithContext[]; staff: Profile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completing, setCompleting] = useState<FollowUpWithContext | null>(null);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [rescheduling, setRescheduling] = useState<FollowUpWithContext | null>(null);
  const [newDueAt, setNewDueAt] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("today");

  const groups = useMemo(() => {
    const pending = followUps.filter((f) => f.status === "pending");
    return {
      today: pending.filter((f) => isToday(f) && !isOverdue(f)),
      overdue: pending.filter(isOverdue),
      upcoming: pending.filter((f) => !isToday(f) && !isOverdue(f)),
      completed: followUps.filter((f) => f.status === "completed"),
      all: followUps,
    };
  }, [followUps]);

  function handleComplete() {
    if (!completing) return;
    startTransition(async () => {
      const result = await completeFollowUp(completing.id, outcomeNote || undefined);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up completed");
      setCompleting(null);
      setOutcomeNote("");
      router.refresh();
    });
  }

  function handleReschedule() {
    if (!rescheduling || !newDueAt) return;
    startTransition(async () => {
      const result = await rescheduleFollowUp(rescheduling.id, istInputToISOString(newDueAt) ?? newDueAt);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Rescheduled");
      setRescheduling(null);
      router.refresh();
    });
  }

  function handleReassign(id: string, userId: string) {
    startTransition(async () => {
      const result = await reassignFollowUp(id, userId === "unassigned" ? null : userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteFollowUp(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up removed");
      router.refresh();
    });
  }

  function renderList(rows: FollowUpWithContext[]) {
    if (!rows.length) {
      return <EmptyState icon={ListChecks} title="Nothing here" description="You're all caught up." />;
    }

    return (
      <div className="divide-y divide-border rounded-lg border border-border">
        {rows.map((f) => (
          <div key={f.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <span
                  className={`mt-1.5 block size-2 shrink-0 rounded-full ${
                    isOverdue(f) ? "bg-destructive" : f.priority === "urgent" ? "bg-destructive" : f.priority === "high" ? "bg-primary" : "bg-muted-foreground/40"
                  }`}
                />
                <div className="min-w-0">
                  <Link href={f.href} className="font-medium text-foreground hover:underline">
                    {f.entityLabel}
                  </Link>
                  {f.notes ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.notes}</p> : null}
                </div>
              </div>
              {f.status === "pending" ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-emerald-600 hover:text-emerald-700"
                    onClick={() => setCompleting(f)}
                    title="Mark complete"
                  >
                    <CheckCircle2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      setRescheduling(f);
                      setNewDueAt(isoToISTInputValue(f.due_at));
                    }}
                    title="Reschedule"
                  >
                    <CalendarClock className="size-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(f.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">{f.outcome_note ?? "Done"}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pl-4">
              <span className="text-xs text-muted-foreground">{findLabel(FOLLOW_UP_TYPES, f.type)}</span>
              <StatusBadge
                label={findLabel(FOLLOW_UP_PRIORITIES, f.priority)}
                className={findBadgeClass(FOLLOW_UP_PRIORITIES, f.priority)}
              />
              <span className={`text-xs ${isOverdue(f) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                {formatDateTime(f.due_at)}
              </span>
              <Select value={f.assigned_to ?? "unassigned"} onValueChange={(v) => handleReassign(f.id, v)} disabled={isPending}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.value === "completed" || t.value === "all" ? "" : ` (${groups[t.value].length})`}
          </button>
        ))}
      </div>
      <div className="mt-4">{renderList(groups[tab])}</div>

      <Dialog open={!!completing} onOpenChange={(open) => !open && setCompleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete follow-up</DialogTitle>
          </DialogHeader>
          <Textarea
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            rows={3}
            placeholder="Outcome (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleting(null)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={isPending}>
              Mark complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduling} onOpenChange={(open) => !open && setRescheduling(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reschedule</DialogTitle>
          </DialogHeader>
          <Input type="datetime-local" value={newDueAt} onChange={(e) => setNewDueAt(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(null)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={isPending || !newDueAt}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
