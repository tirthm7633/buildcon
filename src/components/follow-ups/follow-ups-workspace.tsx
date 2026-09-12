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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function FollowUpsWorkspace({ followUps, staff }: { followUps: FollowUpWithContext[]; staff: Profile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completing, setCompleting] = useState<FollowUpWithContext | null>(null);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [rescheduling, setRescheduling] = useState<FollowUpWithContext | null>(null);
  const [newDueAt, setNewDueAt] = useState("");

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
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-0">
                <td className="w-2 py-3 pl-4">
                  <span
                    className={`block size-2 rounded-full ${
                      isOverdue(f) ? "bg-destructive" : f.priority === "urgent" ? "bg-destructive" : f.priority === "high" ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  />
                </td>
                <td className="py-3 pr-3">
                  <Link href={f.href} className="font-medium text-foreground hover:underline">
                    {f.entityLabel}
                  </Link>
                  {f.notes ? <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{f.notes}</p> : null}
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{findLabel(FOLLOW_UP_TYPES, f.type)}</td>
                <td className="py-3 pr-3">
                  <StatusBadge
                    label={findLabel(FOLLOW_UP_PRIORITIES, f.priority)}
                    className={findBadgeClass(FOLLOW_UP_PRIORITIES, f.priority)}
                  />
                </td>
                <td className={`py-3 pr-3 whitespace-nowrap ${isOverdue(f) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                  {formatDateTime(f.due_at)}
                </td>
                <td className="py-3 pr-3">
                  <Select
                    value={f.assigned_to ?? "unassigned"}
                    onValueChange={(v) => handleReassign(f.id, v)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
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
                </td>
                <td className="py-3 pr-4 text-right">
                  {f.status === "pending" ? (
                    <div className="flex items-center justify-end gap-1">
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
                    <span className="text-xs text-muted-foreground">{f.outcome_note ?? "Done"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({groups.today.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({groups.overdue.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({groups.upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          {renderList(groups.today)}
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          {renderList(groups.overdue)}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          {renderList(groups.upcoming)}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {renderList(groups.completed)}
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          {renderList(groups.all)}
        </TabsContent>
      </Tabs>

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
