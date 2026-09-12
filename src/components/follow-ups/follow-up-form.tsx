"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createFollowUp, updateFollowUp } from "@/lib/actions/follow-ups";
import { followUpSchema, type FollowUpFormValues } from "@/lib/validations/follow-up";
import { FOLLOW_UP_PRIORITIES, FOLLOW_UP_TYPES } from "@/lib/constants";
import { isoToISTInputValue, istInputToISOString } from "@/lib/format";
import type { FollowUp, FollowUpEntity, Profile } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

function toFormValues(
  entityType: FollowUpEntity,
  entityId: string,
  followUp?: FollowUp,
  customerId?: string | null
): FollowUpFormValues {
  return {
    entity_type: entityType,
    entity_id: entityId,
    customer_id: followUp?.customer_id ?? customerId ?? undefined,
    due_at: isoToISTInputValue(followUp?.due_at) || isoToISTInputValue(new Date().toISOString()),
    assigned_to: followUp?.assigned_to ?? undefined,
    priority: followUp?.priority ?? "normal",
    type: followUp?.type ?? "call",
    notes: followUp?.notes ?? "",
  };
}

export function FollowUpForm({
  entityType,
  entityId,
  customerId,
  followUp,
  staff,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  entityType: FollowUpEntity;
  entityId: string;
  customerId?: string | null;
  followUp?: FollowUp;
  staff: Profile[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: toFormValues(entityType, entityId, followUp, customerId),
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(toFormValues(entityType, entityId, followUp, customerId));
  }

  function onSubmit(values: FollowUpFormValues) {
    const payload = { ...values, due_at: istInputToISOString(values.due_at) ?? values.due_at };
    startTransition(async () => {
      const result = followUp ? await updateFollowUp(followUp.id, payload) : await createFollowUp(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(followUp ? "Follow-up updated" : "Follow-up scheduled");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{followUp ? "Edit follow-up" : "Schedule a follow-up"}</DialogTitle>
          <DialogDescription>Keep this on someone&apos;s radar.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_at"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Due date &amp; time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FOLLOW_UP_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FOLLOW_UP_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Assign to</FormLabel>
                    <Select value={field.value ?? "unassigned"} onValueChange={(v) => field.onChange(v === "unassigned" ? undefined : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {followUp ? "Save changes" : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
