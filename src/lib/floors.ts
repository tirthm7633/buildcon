import type { FloorId } from "@/lib/supabase/types";

export interface FloorConfig {
  id: FloorId;
  name: string;
  shortLabel: string;
  /** Which modules this floor's sidebar exposes, and what to call them. */
  modules: {
    today: boolean;
    walkInsLabel: string;
    catalog: boolean;
    customers: boolean;
    payments: boolean;
    paymentList: boolean;
    followUps: boolean;
    quotationsLabel: string | null;
    quotationBuilder: boolean;
    tileOrders: boolean;
    purchases: boolean;
    notifications: boolean;
    salesData: boolean;
    team: boolean;
    settings: boolean;
  };
}

export const FLOORS: FloorConfig[] = [
  {
    id: "tiles",
    name: "Ground Floor - Tiles",
    shortLabel: "Tiles",
    modules: {
      today: true,
      walkInsLabel: "Walk-ins",
      catalog: true,
      customers: true,
      payments: true,
      paymentList: true,
      followUps: true,
      quotationsLabel: "Quotation Tiles",
      quotationBuilder: true,
      tileOrders: true,
      purchases: false,
      notifications: true,
      salesData: true,
      team: true,
      settings: true,
    },
  },
  {
    id: "sanitary",
    name: "Second Floor - Sanitary Bathroom",
    shortLabel: "Sanitary",
    modules: {
      today: true,
      walkInsLabel: "Walk-ins",
      catalog: true,
      customers: true,
      payments: true,
      paymentList: true,
      followUps: true,
      quotationsLabel: "Quotations",
      quotationBuilder: true,
      tileOrders: false,
      purchases: true,
      notifications: true,
      salesData: true,
      team: true,
      settings: true,
    },
  },
  {
    id: "kitchen",
    name: "Kitchen Floor",
    shortLabel: "Kitchen",
    modules: {
      today: false,
      walkInsLabel: "Kitchen Walk-ins",
      catalog: false,
      customers: false,
      payments: false,
      paymentList: false,
      followUps: false,
      quotationsLabel: "Quotation Follow-up",
      quotationBuilder: false,
      tileOrders: false,
      purchases: false,
      notifications: false,
      salesData: false,
      team: false,
      settings: false,
    },
  },
  {
    id: "furniture",
    name: "Furniture Floor",
    shortLabel: "Furniture",
    modules: {
      today: false,
      walkInsLabel: "Furniture Walk-ins",
      catalog: false,
      customers: false,
      payments: false,
      paymentList: false,
      followUps: false,
      quotationsLabel: "Quotation Follow-up",
      quotationBuilder: false,
      tileOrders: false,
      purchases: false,
      notifications: false,
      salesData: false,
      team: false,
      settings: false,
    },
  },
];

export const DEFAULT_FLOOR: FloorId = "tiles";

export function getFloorConfig(id: FloorId): FloorConfig {
  return FLOORS.find((f) => f.id === id) ?? FLOORS[0];
}

export function isFloorId(value: string | undefined | null): value is FloorId {
  return !!value && FLOORS.some((f) => f.id === value);
}
