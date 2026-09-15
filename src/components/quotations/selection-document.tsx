"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { applyCustomerPick, updateQuotationField } from "@/lib/actions/quotations";
import { searchCustomers } from "@/lib/actions/quotations";
import { formatDate } from "@/lib/format";
import { BRAND_PARTNERS, FALLBACK_TERMS } from "@/lib/quotation-content";
import type { CompanySettings, FloorId, Profile, Quotation } from "@/lib/supabase/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchPicker } from "@/components/shared/search-picker";
import { SelectionItemsPanel, type SelectionItemRow } from "@/components/quotations/selection-items-panel";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function InlineField({
  label,
  value,
  editable,
  placeholder,
  required,
  onSave,
}: {
  label: string;
  value: string;
  editable: boolean;
  placeholder?: string;
  required?: boolean;
  onSave: (next: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }
  const missing = !!required && !value.trim();

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </p>
      {editable ? (
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            if (local !== value) onSave(local);
          }}
          placeholder={placeholder}
          className={`mt-0.5 w-full rounded-md border bg-transparent px-1.5 py-1 text-sm text-foreground outline-none transition-colors hover:border-border focus:border-primary focus:bg-background ${
            missing ? "border-destructive/40" : "border-transparent"
          }`}
        />
      ) : (
        <p className="mt-0.5 px-1.5 py-1 text-sm text-foreground">{value || "—"}</p>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 px-1.5 py-1 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

export function SelectionDocument({
  quotation,
  floorId,
  createdByName,
  headManagers,
  items,
  editable,
  company,
}: {
  quotation: Quotation;
  floorId: FloorId;
  createdByName: string | null;
  headManagers: Profile[];
  items: SelectionItemRow[];
  editable: boolean;
  company: CompanySettings | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const termsLines = company?.quotation_terms ? company.quotation_terms.split("\n").filter(Boolean) : FALLBACK_TERMS;

  function saveField(field: "customer_name" | "customer_phone" | "customer_address" | "reference", next: string) {
    startTransition(async () => {
      const result = await updateQuotationField(quotation.id, field, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function saveAttendedBy(next: string) {
    startTransition(async () => {
      const result = await updateQuotationField(quotation.id, "attended_by", next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function pickCustomer(customer: { id: string; name: string; phone: string; address: string | null }) {
    startTransition(async () => {
      const result = await applyCustomerPick(quotation.id, customer);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer details filled in");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 sm:p-5">
        {editable ? (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Search existing customers
            </p>
            <SearchPicker
              placeholder="Search by name or phone…"
              onSearch={(q) => searchCustomers(floorId, q)}
              resultKey={(c) => c.id}
              renderResult={(c) => (
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
              )}
              onSelect={pickCustomer}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <InlineField
            label="Customer Name"
            value={quotation.customer_name}
            editable={editable}
            placeholder="Customer name"
            required
            onSave={(v) => saveField("customer_name", v)}
          />
          <InlineField
            label="Contact No."
            value={quotation.customer_phone}
            editable={editable}
            placeholder="Phone number"
            required
            onSave={(v) => saveField("customer_phone", v)}
          />
          <ReadOnlyField label="Selection / Quotation Date" value={formatDate(quotation.issue_date)} />
          <ReadOnlyField label="Quotation No." value={quotation.quotation_number} />

          <InlineField
            label="Reference"
            value={quotation.reference ?? ""}
            editable={editable}
            placeholder="Referred by…"
            onSave={(v) => saveField("reference", v)}
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Attended by<span className="ml-0.5 text-destructive">*</span>
            </p>
            {editable ? (
              <Select value={quotation.attended_by ?? "none"} onValueChange={saveAttendedBy}>
                <SelectTrigger className="mt-0.5 h-8 w-full border-transparent bg-transparent px-1.5 text-sm hover:border-border">
                  <SelectValue placeholder="Select Head or Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headManagers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-0.5 px-1.5 py-1 text-sm text-foreground">
                {headManagers.find((m) => m.id === quotation.attended_by)?.full_name ?? "—"}
              </p>
            )}
          </div>
          <ReadOnlyField label="Prepared by" value={createdByName ?? "—"} />
          <InlineField
            label="Address"
            value={quotation.customer_address ?? ""}
            editable={editable}
            placeholder="Delivery / site address"
            required
            onSave={(v) => saveField("customer_address", v)}
          />
        </div>
      </div>

      <SectionCard title="Our Brand Partners">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-3 lg:grid-cols-6">
          {BRAND_PARTNERS.map((b) => (
            <div key={b.name} className="rounded-md border border-border p-2 text-center">
              <p className="text-xs font-semibold text-foreground">{b.name}</p>
              <p className="mt-0.5 text-[10px] italic text-muted-foreground">{b.tagline}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Terms & Conditions">
        <div className="space-y-1 rounded-lg border border-border p-3">
          {termsLines.map((line, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Product Details">
        <SelectionItemsPanel quotationId={quotation.id} floorId={floorId} items={items} editable={editable} />
      </SectionCard>
    </div>
  );
}
