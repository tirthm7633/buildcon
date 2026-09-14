"use server";

import { revalidatePath } from "next/cache";

import { canAccessFloor, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { createClient } from "@/lib/supabase/server";
import type { FloorId } from "@/lib/supabase/types";
import { catalogItemSchema, type CatalogItemFormValues } from "@/lib/validations/catalog";

function clean(values: CatalogItemFormValues) {
  return {
    name: values.name,
    sku: values.sku,
    brand: values.brand || null,
    category: values.category || null,
    unit: values.unit,
    gst_rate: values.gst_rate,
  };
}

function cleanSizes(catalogueItemId: string, values: CatalogItemFormValues) {
  return values.sizes.map((s, i) => ({
    catalogue_item_id: catalogueItemId,
    size: s.size,
    sku: s.sku || null,
    rate: s.rate,
    position: i,
  }));
}

export async function createCatalogItem(values: CatalogItemFormValues) {
  const parsed = catalogItemSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const floorId = await getActiveFloorId();
  if (!(await canAccessFloor(floorId))) return { error: "You don't have access to this floor." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogue_items")
    .insert({ ...clean(parsed.data), floor_id: floorId })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: sizesError } = await supabase.from("catalogue_item_sizes").insert(cleanSizes(data.id, parsed.data));
  if (sizesError) return { error: sizesError.message };

  if (parsed.data.image_url) {
    await supabase.from("catalogue_images").insert({ catalogue_item_id: data.id, url: parsed.data.image_url, position: 0 });
  }

  revalidatePath("/catalog");
  return { error: null, id: data.id as string };
}

export async function updateCatalogItem(id: string, values: CatalogItemFormValues) {
  const parsed = catalogItemSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("catalogue_items").update(clean(parsed.data)).eq("id", id);
  if (error) return { error: error.message };

  // Full replace rather than diffing — quotation_items snapshots its own
  // size text and never references a catalogue_item_sizes row directly, so
  // there's nothing pointing at these rows that a replace could break.
  const { error: deleteError } = await supabase.from("catalogue_item_sizes").delete().eq("catalogue_item_id", id);
  if (deleteError) return { error: deleteError.message };

  const { error: sizesError } = await supabase.from("catalogue_item_sizes").insert(cleanSizes(id, parsed.data));
  if (sizesError) return { error: sizesError.message };

  if (parsed.data.image_url) {
    const { data: existing } = await supabase
      .from("catalogue_images")
      .select("id")
      .eq("catalogue_item_id", id)
      .order("position")
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from("catalogue_images").update({ url: parsed.data.image_url }).eq("id", existing.id);
    } else {
      await supabase.from("catalogue_images").insert({ catalogue_item_id: id, url: parsed.data.image_url, position: 0 });
    }
  }

  revalidatePath("/catalog");
  return { error: null };
}

/** Bulk-imports catalog items from a parsed spreadsheet/CSV. Rows are
 * validated server-side too (never trust the client-side pre-check alone);
 * invalid rows are skipped and reported back individually rather than
 * failing the whole batch, since a single bad row in a 500-row price list
 * shouldn't block importing the other 499. Each imported row becomes a
 * single-size product for now — if your real price list lists the same
 * design across multiple rows for its size options, tell me and I'll add
 * grouping (e.g. by matching SKU prefix or name) once I can see its shape. */
export async function bulkImportCatalogItems(rows: unknown[]) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in.", imported: 0, failed: [] as { row: number; message: string }[] };

  const floorId = await getActiveFloorId();
  if (!(await canAccessFloor(floorId))) {
    return { error: "You don't have access to this floor.", imported: 0, failed: [] as { row: number; message: string }[] };
  }

  const valid: CatalogItemFormValues[] = [];
  const failed: { row: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const parsed = catalogItemSchema.safeParse(row);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      failed.push({ row: i + 1, message: parsed.error.issues[0]?.message ?? "Invalid row" });
    }
  });

  if (!valid.length) return { error: null, imported: 0, failed };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("catalogue_items")
    .insert(valid.map((v) => ({ ...clean(v), floor_id: floorId })))
    .select("id");

  if (error) return { error: error.message, imported: 0, failed };

  const sizeRows = valid.flatMap((v, i) => cleanSizes(inserted[i].id, v));
  if (sizeRows.length) {
    const { error: sizesError } = await supabase.from("catalogue_item_sizes").insert(sizeRows);
    if (sizesError) return { error: sizesError.message, imported: 0, failed };
  }

  const imageRows = valid
    .map((v, i) => (v.image_url ? { catalogue_item_id: inserted[i].id, url: v.image_url, position: 0 } : null))
    .filter((row): row is { catalogue_item_id: string; url: string; position: number } => row !== null);

  if (imageRows.length) await supabase.from("catalogue_images").insert(imageRows);

  revalidatePath("/catalog");
  return { error: null, imported: inserted.length, failed };
}

export async function setCatalogItemActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalogue_items").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/catalog");
  return { error: null };
}

/** Live search for the product picker on the Selection form — floor-scoped,
 * active items only, matched on name or SKU. Returns every size option so
 * the picker can prompt for one when there's more than one. */
export async function searchCatalogItems(floorId: FloorId, query: string) {
  const supabase = await createClient();
  let builder = supabase
    .from("catalogue_items")
    .select("id, name, sku, brand, unit, catalogue_images(url), catalogue_item_sizes(id, size, sku, rate, position)")
    .eq("floor_id", floorId)
    .eq("is_active", true)
    .order("name")
    .limit(20);

  const q = query.trim();
  if (q) builder = builder.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);

  const { data } = await builder;
  return (data ?? []).map((item) => {
    const sizes = ((item.catalogue_item_sizes as unknown as { id: string; size: string; sku: string | null; rate: number; position: number }[]) ?? [])
      .slice()
      .sort((a, b) => a.position - b.position);
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      brand: item.brand,
      unit: item.unit,
      sizes,
      imageUrl: (item.catalogue_images as unknown as { url: string }[] | null)?.[0]?.url ?? null,
    };
  });
}
