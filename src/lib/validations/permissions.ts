import { z } from "zod";

const FLOOR_ID = z.enum(["tiles", "sanitary", "kitchen", "furniture"]);

const PAGE_FEATURE_KEY = z.enum([
  "page.today",
  "page.walk_ins",
  "page.catalog",
  "page.customers",
  "page.payments",
  "page.payment_list",
  "page.purchases",
  "page.follow_ups",
  "page.quotations",
  "page.tile_orders",
  "page.notifications",
  "page.sales_data",
  "page.team",
  "page.settings",
]);

export const setUserFeaturePermissionSchema = z.object({
  userId: z.string().uuid(),
  floorId: FLOOR_ID,
  key: PAGE_FEATURE_KEY,
  enabled: z.boolean(),
});

export type SetUserFeaturePermissionValues = z.infer<typeof setUserFeaturePermissionSchema>;

export const setUserWalkInsDataScopeSchema = z.object({
  userId: z.string().uuid(),
  floorId: FLOOR_ID,
  scope: z.enum(["all", "own"]),
});

export type SetUserWalkInsDataScopeValues = z.infer<typeof setUserWalkInsDataScopeSchema>;

export const setUserFloorAccessSchema = z.object({
  userId: z.string().uuid(),
  floorId: FLOOR_ID,
  enabled: z.boolean(),
});

export type SetUserFloorAccessValues = z.infer<typeof setUserFloorAccessSchema>;
