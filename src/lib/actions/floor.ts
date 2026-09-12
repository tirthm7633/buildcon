"use server";

import { cookies } from "next/headers";

import { canAccessFloor } from "@/lib/auth";
import { FLOOR_COOKIE } from "@/lib/floor-context";
import { isFloorId } from "@/lib/floors";

export async function setActiveFloor(floorId: string) {
  if (!isFloorId(floorId)) return { error: "Unknown floor" };
  if (!(await canAccessFloor(floorId))) return { error: "You don't have access to that floor" };

  const cookieStore = await cookies();
  cookieStore.set(FLOOR_COOKIE, floorId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return { error: null };
}
