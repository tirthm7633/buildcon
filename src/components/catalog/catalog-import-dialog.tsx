"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { bulkImportCatalogItems } from "@/lib/actions/catalog";
import { catalogItemSchema, type CatalogItemFormValues } from "@/lib/validations/catalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Flat shape a spreadsheet row naturally has — one size/rate per row.
 * Multiple rows sharing the same SKU/name for different sizes of the same
 * design aren't grouped yet; each row becomes its own single-size product
 * until we've seen a real price list's shape and can add that grouping. */
type FlatCatalogRow = {
  name?: string;
  sku?: string;
  brand?: string;
  category?: string;
  unit?: string;
  gst_rate?: number;
  image_url?: string;
  size?: string;
  rate?: number;
};

/** Maps the many ways a supplier price list might spell a column header to
 * our catalog fields — importers shouldn't have to reformat their sheet to
 * match our exact schema first. */
const HEADER_ALIASES: Record<string, keyof FlatCatalogRow> = {
  name: "name",
  "product name": "name",
  product: "name",
  sku: "sku",
  code: "sku",
  "product code": "sku",
  "item code": "sku",
  brand: "brand",
  make: "brand",
  category: "category",
  type: "category",
  size: "size",
  dimension: "size",
  dimensions: "size",
  unit: "unit",
  uom: "unit",
  rate: "rate",
  price: "rate",
  "selling price": "rate",
  "rate/sq.ft": "rate",
  "rate per sq.ft": "rate",
  "sq.ft rate": "rate",
  gst: "gst_rate",
  "gst%": "gst_rate",
  "gst rate": "gst_rate",
  "gst %": "gst_rate",
  image: "image_url",
  "image url": "image_url",
  "image_url": "image_url",
  photo: "image_url",
};

type ParsedRow = {
  raw: Record<string, unknown>;
  values: CatalogItemFormValues;
  error: string | null;
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function coerceRow(rawValues: Record<string, unknown>): ParsedRow {
  const flat: FlatCatalogRow = { unit: "sq.ft", gst_rate: 18 };

  for (const [key, cell] of Object.entries(rawValues)) {
    const field = HEADER_ALIASES[normalizeHeader(key)];
    if (!field || cell === null || cell === undefined || cell === "") continue;

    if (field === "rate" || field === "gst_rate") {
      const num = typeof cell === "number" ? cell : Number(String(cell).replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(num)) flat[field] = num;
    } else {
      (flat as Record<string, unknown>)[field] = String(cell).trim();
    }
  }

  const values = {
    name: flat.name ?? "",
    sku: flat.sku ?? "",
    brand: flat.brand ?? "",
    category: flat.category ?? "",
    unit: flat.unit ?? "sq.ft",
    gst_rate: flat.gst_rate ?? 18,
    image_url: flat.image_url ?? "",
    sizes: [{ size: flat.size ?? "", sku: "", rate: flat.rate ?? Number.NaN }],
  };

  const parsed = catalogItemSchema.safeParse(values);
  return { raw: rawValues, values, error: parsed.success ? null : (parsed.error.issues[0]?.message ?? "Invalid row") };
}

/** Minimal CSV line splitter that respects double-quoted fields — a plain
 * `split(",")` breaks on any product name or address that itself contains
 * a comma inside quotes, which real price lists frequently do. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    const sheet = workbook.addWorksheet("Sheet1");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      sheet.addRow(splitCsvLine(line));
    }
  } else {
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1).values as unknown[];
  const headers = headerRow.slice(1).map((h) => String(h ?? ""));

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = (row.values as unknown[]).slice(1);
    const rawValues: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      if (header) rawValues[header] = cells[i];
    });
    if (Object.values(rawValues).some((v) => v !== null && v !== undefined && v !== "")) {
      rows.push(coerceRow(rawValues));
    }
  });

  return rows;
}

export function CatalogImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setRows([]);
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseFile(file);
      if (!parsed.length) {
        toast.error("Couldn't find any product rows in that file");
      }
      setRows(parsed);
    } catch {
      toast.error("Couldn't read that file — check it's a valid .csv or .xlsx");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onImport() {
    if (!validRows.length) return;
    setImporting(true);
    const result = await bulkImportCatalogItems(validRows.map((r) => r.values));
    setImporting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Imported ${result.imported} product${result.imported === 1 ? "" : "s"}`);
    setOpen(false);
    setRows([]);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import products</DialogTitle>
        </DialogHeader>

        {!rows.length ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a .csv or .xlsx file. Recognized columns: Name, SKU, Brand, Category, Size, Unit, Rate, GST%, Image
              URL — column order and exact wording don&apos;t matter. Name, SKU, and Rate are required per row.
            </p>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Choose file
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={onFileSelected} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium text-foreground">{validRows.length}</span> product{validRows.length === 1 ? "" : "s"} ready to
              import
              {invalidRows.length ? (
                <span className="text-destructive"> · {invalidRows.length} row{invalidRows.length === 1 ? "" : "s"} skipped (invalid)</span>
              ) : null}
            </p>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="p-2">Name</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Size</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="p-2 text-foreground">{row.values.name || "—"}</td>
                      <td className="p-2 text-muted-foreground">{row.values.sku || "—"}</td>
                      <td className="p-2 text-muted-foreground">{row.values.sizes[0]?.size || "—"}</td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">
                        {Number.isFinite(row.values.sizes[0]?.rate) ? row.values.sizes[0].rate : "—"}
                      </td>
                      <td className="p-2">
                        {row.error ? (
                          <span className="text-xs text-destructive">{row.error}</span>
                        ) : (
                          <span className="text-xs text-emerald-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => setRows([])}>
              Choose a different file
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onImport} disabled={!validRows.length || importing}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : null}
            Import {validRows.length ? validRows.length : ""} product{validRows.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
