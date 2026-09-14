"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createWalkIn, findDuplicateWalkIns, updateWalkIn } from "@/lib/actions/walk-ins";
import { walkInSchema, type WalkInFormValues } from "@/lib/validations/walk-in";
import { WALKIN_SOURCES, WALKIN_STATUSES } from "@/lib/constants";
import { isoToISTInputValue, istInputToISOString } from "@/lib/format";
import type { FloorId, Profile, WalkIn } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

function toFormValues(walkIn?: WalkIn): WalkInFormValues {
  return {
    name: walkIn?.name ?? "",
    phone: walkIn?.phone ?? "",
    alternate_phone: walkIn?.alternate_phone ?? "",
    email: walkIn?.email ?? "",
    company_name: walkIn?.company_name ?? "",
    address: walkIn?.address ?? "",
    city: walkIn?.city ?? "",
    pincode: walkIn?.pincode ?? "",
    referred_by: walkIn?.referred_by ?? "",
    source: walkIn?.source ?? "walk_in",
    category: walkIn?.category ?? "",
    requirements: walkIn?.requirements ?? "",
    budget_estimate: walkIn?.budget_estimate ?? undefined,
    expected_purchase_date: walkIn?.expected_purchase_date ?? "",
    status: walkIn?.status ?? "new",
    follow_up_at: isoToISTInputValue(walkIn?.follow_up_at),
    // Editing an existing walk-in shows its current value (or "none") —
    // already valid, no re-selection forced. Creating one starts blank so
    // the required-field check actually makes the user choose.
    attended_by: walkIn ? (walkIn.attended_by ?? "none") : "",
  };
}

export function WalkInForm({
  walkIn,
  floorId,
  currentProfile,
  createdByName,
  headManagers,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  walkIn?: WalkIn;
  floorId: FloorId;
  /** Signed-in user — shown as "Made by" when creating a new walk-in. */
  currentProfile: Pick<Profile, "id" | "full_name">;
  /** Resolved name of the walk-in's actual creator — only meaningful (and
   * only passed) when editing; ignored when creating. */
  createdByName?: string | null;
  /** Active Head/Manager accounts with access to this floor — the only
   * people selectable as "Attended by". */
  headManagers: Profile[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<{ id: string; name: string }[]>([]);

  const form = useForm<WalkInFormValues>({
    resolver: zodResolver(walkInSchema),
    defaultValues: toFormValues(walkIn),
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(toFormValues(walkIn));
      setDuplicates([]);
    }
  }

  async function checkDuplicates() {
    if (walkIn) return;
    const { phone, email } = form.getValues();
    if (!phone || phone.length < 10) return;
    const matches = await findDuplicateWalkIns(floorId, phone, email || undefined);
    setDuplicates(matches);
  }

  function onSubmit(values: WalkInFormValues) {
    const payload = { ...values, follow_up_at: values.follow_up_at ? istInputToISOString(values.follow_up_at) ?? "" : "" };
    startTransition(async () => {
      const result = walkIn ? await updateWalkIn(walkIn.id, payload) : await createWalkIn(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(walkIn ? "Walk-in updated" : "Walk-in added");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{walkIn ? "Edit walk-in" : "Add a walk-in"}</DialogTitle>
          <DialogDescription>Capture the visit while it&apos;s fresh.</DialogDescription>
        </DialogHeader>

        {duplicates.length ? (
          <Alert className="border-accent bg-accent/40 text-accent-foreground">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-accent-foreground">
              Possible duplicate: {duplicates.map((d) => d.name).join(", ")} already has a record with this
              phone or email.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Visitor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="98765 43210" {...field} onBlur={checkDuplicates} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alternate_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternative phone (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Backup contact number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="optional" {...field} onBlur={checkDuplicates} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode (optional)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" maxLength={6} placeholder="e.g. 380015" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referred_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Name of who referred them" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead source</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WALKIN_SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WALKIN_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interested product</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Vitrified tiles" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget_estimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated budget (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="follow_up_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up date &amp; time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Made by</FormLabel>
                <p className="flex h-9 items-center text-sm text-muted-foreground">
                  {walkIn ? (createdByName ?? "Unknown") : currentProfile.full_name}
                </p>
              </FormItem>

              <FormField
                control={form.control}
                name="attended_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attended by</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Head or Manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {headManagers.map((member) => (
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
                name="requirements"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
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
                {walkIn ? "Save changes" : "Add walk-in"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
