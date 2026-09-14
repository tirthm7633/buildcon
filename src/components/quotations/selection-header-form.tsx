"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createSelection, updateSelectionHeader } from "@/lib/actions/quotations";
import { searchCustomers } from "@/lib/actions/quotations";
import { selectionHeaderSchema, type SelectionHeaderValues } from "@/lib/validations/quotation";
import type { FloorId, Profile, Quotation } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchPicker } from "@/components/shared/search-picker";

function toFormValues(quotation?: Quotation): SelectionHeaderValues {
  return {
    customer_id: quotation?.customer_id ?? null,
    customer_name: quotation?.customer_name ?? "",
    customer_phone: quotation?.customer_phone ?? "",
    customer_address: quotation?.customer_address ?? "",
    reference: quotation?.reference ?? "",
    attended_by: quotation ? (quotation.attended_by ?? "none") : "",
  };
}

export function SelectionHeaderForm({
  quotation,
  floorId,
  currentProfile,
  createdByName,
  headManagers,
  onSuccess,
  submitLabel,
}: {
  quotation?: Quotation;
  floorId: FloorId;
  currentProfile: Pick<Profile, "id" | "full_name">;
  createdByName?: string | null;
  headManagers: Profile[];
  onSuccess: (id: string) => void;
  submitLabel: string;
}) {
  const form = useForm<SelectionHeaderValues>({
    resolver: zodResolver(selectionHeaderSchema),
    defaultValues: toFormValues(quotation),
  });
  const isPending = form.formState.isSubmitting;

  async function onSubmit(values: SelectionHeaderValues) {
    if (quotation) {
      const result = await updateSelectionHeader(quotation.id, values);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Selection updated");
      onSuccess(quotation.id);
      return;
    }

    const result = await createSelection(values);
    if (result.error || !result.id) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }
    toast.success("Selection created");
    onSuccess(result.id);
  }

  const madeByDisplay = quotation ? (createdByName ?? "Unknown") : currentProfile.full_name;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Customer</label>
          <SearchPicker
            placeholder="Search existing customers…"
            onSearch={(q) => searchCustomers(floorId, q)}
            resultKey={(c) => c.id}
            renderResult={(c) => (
              <div>
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
            )}
            onSelect={(c) => {
              form.setValue("customer_id", c.id);
              form.setValue("customer_name", c.name);
              form.setValue("customer_phone", c.phone);
              form.setValue("customer_address", c.address ?? "");
            }}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Optional — pick an existing customer to prefill the fields below, or just type them in directly.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customer_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact no.</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customer_address"
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
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference (optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Prepared by</FormLabel>
            <p className="flex h-9 items-center text-sm text-muted-foreground">{madeByDisplay}</p>
          </FormItem>

          <FormField
            control={form.control}
            name="attended_by"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Attended by</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Head or Manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headManagers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
