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
    size: values.size || null,
    unit: values.unit,
    selling_price: values.selling_price,
    gst_rate: values.gst_rate,
  };
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

export async function setCatalogItemActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalogue_items").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/catalog");
  return { error: null };
}

/** Live search for the product picker on the Selection form — floor-scoped,
 * active items only, matched on name or SKU. */
export async function searchCatalogItems(floorId: FloorId, query: string) {
  const supabase = await createClient();
  let builder = supabase
    .from("catalogue_items")
    .select("id, name, sku, brand, size, unit, selling_price, catalogue_images(url)")
    .eq("floor_id", floorId)
    .eq("is_active", true)
    .order("name")
    .limit(20);

  const q = query.trim();
  if (q) builder = builder.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);

  const { data } = await builder;
  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    brand: item.brand,
    size: item.size,
    unit: item.unit,
    selling_price: item.selling_price,
    imageUrl: (item.catalogue_images as unknown as { url: string }[] | null)?.[0]?.url ?? null,
  }));
}
