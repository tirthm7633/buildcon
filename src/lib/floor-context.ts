import "server-only";
import { cookies } from "next/headers";

import { DEFAULT_FLOOR, isFloorId } from "@/lib/floors";
import type { FloorId } from "@/lib/supabase/types";

export const FLOOR_COOKIE = "bh_floor";

export async function getActiveFloorId(): Promise<FloorId> {
  const cookieStore = await cookies();
  const value = cookieStore.get(FLOOR_COOKIE)?.value;
  return isFloorId(value) ? value : DEFAULT_FLOOR;
}
