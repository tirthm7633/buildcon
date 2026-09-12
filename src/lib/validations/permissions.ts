import { z } from "zod";

const FLOOR_ID = z.enum(["tiles", "sanitary", "kitchen", "furniture"]);

/** Never "owner" — Owner is never a gate-able target, only ever an editor. */
const GATABLE_ROLE = z.enum(["head", "manager", "staff"]);

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

export const setFeaturePermissionSchema = z.object({
  floorId: FLOOR_ID,
  role: GATABLE_ROLE,
  key: PAGE_FEATURE_KEY,
  enabled: z.boolean(),
});

export type SetFeaturePermissionValues = z.infer<typeof setFeaturePermissionSchema>;

export const setWalkInsDataScopeSchema = z.object({
  floorId: FLOOR_ID,
  scope: z.enum(["all", "own"]),
});

export type SetWalkInsDataScopeValues = z.infer<typeof setWalkInsDataScopeSchema>;
