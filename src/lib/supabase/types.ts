// Hand-written to match supabase/migrations/0001_init.sql, shaped the way
// `supabase gen types typescript` emits so it satisfies @supabase/supabase-js's
// GenericSchema constraint. Regenerate with the CLI once the project is linked
// and keep this file in sync if the schema changes.

export type FloorId = "tiles" | "sanitary" | "kitchen" | "furniture";

export type UserRole = "owner" | "head" | "manager" | "staff";

export type CustomerTier = "vip" | "trade" | "retail";

export type WalkinSource =
  | "walk_in"
  | "referral"
  | "instagram"
  | "whatsapp"
  | "website"
  | "call"
  | "architect"
  | "builder"
  | "other";
export type WalkinStatus =
  | "new"
  | "contacted"
  | "visit_completed"
  | "quotation_required"
  | "quotation_sent"
  | "negotiation"
  | "won"
  | "lost";

export type QuotationStatus =
  | "draft"
  | "awaiting_approval"
  | "sent"
  | "viewed"
  | "follow_up_due"
  | "negotiation"
  | "accepted"
  | "rejected"
  | "expired"
  | "revised";
export type DiscountType = "flat" | "percent";

export type TileOrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "partially_fulfilled"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export type OrderPaymentStatus = "unpaid" | "partially_paid" | "paid";

export type PurchaseStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";

export type FollowUpPriority = "low" | "normal" | "high" | "urgent";
export type FollowUpType =
  | "call"
  | "whatsapp"
  | "email"
  | "showroom_visit"
  | "quotation_follow_up"
  | "payment_reminder"
  | "delivery_confirmation"
  | "other";
export type FollowUpStatus = "pending" | "completed" | "cancelled";
export type FollowUpEntity = "walk_in" | "customer" | "quotation" | "tile_order" | "purchase" | "payment";

export type Floor = {
  id: FloorId;
  name: string;
  short_code: string;
  sort_order: number;
  quotation_prefix: string;
  quotation_next_number: number;
  is_active: boolean;
};

/**
 * Every sidebar page, gateable per floor per person. Adding a new page never
 * needs a migration — just tag its nav-items.ts entry with a new key here
 * and a `defaults` entry; user_permissions.permission_key is a free-text
 * column with no matching check constraint.
 */
export type PageFeatureKey =
  | "page.today"
  | "page.walk_ins"
  | "page.catalog"
  | "page.customers"
  | "page.payments"
  | "page.payment_list"
  | "page.purchases"
  | "page.follow_ups"
  | "page.quotations"
  | "page.tile_orders"
  | "page.notifications"
  | "page.sales_data"
  | "page.team"
  | "page.settings";

/** Well-known permission_key values used by the app. */
export type PermissionKey = PageFeatureKey | "walk_ins.data_scope";

export type UserPermission = {
  id: string;
  user_id: string;
  floor_id: FloorId;
  permission_key: string;
  value: boolean | "all" | "own";
  updated_by: string | null;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserFloorAccess = {
  user_id: string;
  floor_id: FloorId;
};

export type CompanySettings = {
  id: true;
  company_name: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  website: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  default_tax_percent: number;
  quotation_terms: string | null;
  follow_up_default_days: number;
  updated_at: string;
};

export type WalkIn = {
  id: string;
  walk_in_number: string;
  floor_id: FloorId;
  name: string;
  phone: string;
  whatsapp: string | null;
  alternate_phone: string | null;
  email: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  referred_by: string | null;
  source: WalkinSource;
  category: string | null;
  requirements: string | null;
  budget_estimate: number | null;
  expected_purchase_date: string | null;
  status: WalkinStatus;
  follow_up_at: string | null;
  /** Head or Manager who attended to this walk-in — never Staff. Who
   * actually logged it is created_by, shown in the UI as "Made by". */
  attended_by: string | null;
  customer_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  floor_id: FloorId;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  company_name: string | null;
  address: string | null;
  delivery_location: string | null;
  gstin: string | null;
  notes: string | null;
  tier: CustomerTier;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityEntityType = "walk_in" | "customer" | "quotation" | "tile_order" | "purchase";

export type Activity = {
  id: string;
  floor_id: FloorId;
  entity_type: ActivityEntityType;
  entity_id: string;
  actor_id: string | null;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type CatalogueItem = {
  id: string;
  floor_id: FloorId;
  sku: string;
  name: string;
  brand: string | null;
  collection: string | null;
  category: string | null;
  size: string | null;
  finish: string | null;
  colour: string | null;
  material: string | null;
  thickness: string | null;
  unit: string;
  pieces_per_box: number | null;
  coverage_per_box: number | null;
  selling_price: number;
  dealer_price: number | null;
  gst_rate: number;
  stock_quantity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogueImage = {
  id: string;
  catalogue_item_id: string;
  url: string;
  position: number;
  created_at: string;
};

export type Quotation = {
  id: string;
  floor_id: FloorId;
  quotation_number: string;
  /** Optional — a Selection can be started before the person is a formal
   * Customer, same independence walk_ins already has. */
  customer_id: string | null;
  /** Editable snapshot printed on the document — prefilled from a picked
   * Customer, but not locked to it. */
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  reference: string | null;
  walk_in_id: string | null;
  status: QuotationStatus;
  version: number;
  root_quotation_id: string | null;
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  delivery_charges: number;
  installation_charges: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  terms: string | null;
  notes: string | null;
  /** Head or Manager who attended to this Selection/Quotation — same
   * floor-scoped concept as walk_ins.attended_by. */
  attended_by: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  decided_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationItem = {
  id: string;
  quotation_id: string;
  catalogue_item_id: string | null;
  position: number;
  section: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  item_discount_percent: number;
  gst_rate: number;
  amount: number;
};

export type TileOrder = {
  id: string;
  floor_id: FloorId;
  order_number: string;
  customer_id: string;
  quotation_id: string | null;
  status: TileOrderStatus;
  payment_status: OrderPaymentStatus;
  order_value: number;
  amount_paid: number;
  expected_delivery_date: string | null;
  delivery_address: string | null;
  notes: string | null;
  sales_executive: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TileOrderItem = {
  id: string;
  tile_order_id: string;
  catalogue_item_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type Supplier = {
  id: string;
  floor_id: FloorId;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  notes: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  floor_id: FloorId;
  purchase_number: string;
  supplier_id: string;
  purchase_date: string;
  expected_arrival_date: string | null;
  status: PurchaseStatus;
  payment_status: OrderPaymentStatus;
  total_value: number;
  amount_paid: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseItem = {
  id: string;
  purchase_id: string;
  catalogue_item_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  gst_rate: number;
  amount: number;
};

export type Payment = {
  id: string;
  floor_id: FloorId;
  receipt_number: string;
  customer_id: string;
  quotation_id: string | null;
  tile_order_id: string | null;
  purchase_id: string | null;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  reference_no: string | null;
  collected_by: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
};

export type FollowUp = {
  id: string;
  floor_id: FloorId;
  entity_type: FollowUpEntity;
  entity_id: string;
  customer_id: string | null;
  due_at: string;
  assigned_to: string | null;
  priority: FollowUpPriority;
  type: FollowUpType;
  notes: string | null;
  outcome_note: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  floor_id: FloorId | null;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type Attachment = {
  id: string;
  floor_id: FloorId | null;
  entity_type: string;
  entity_id: string;
  url: string;
  filename: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  floor_id: FloorId | null;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type Table<Row, RequiredInsertKeys extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsertKeys>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      floors: Table<Floor, "id" | "name" | "short_code" | "quotation_prefix">;
      profiles: Table<Profile, "id" | "full_name" | "email">;
      user_floor_access: Table<UserFloorAccess, "user_id" | "floor_id">;
      user_permissions: Table<UserPermission, "user_id" | "floor_id" | "permission_key">;
      company_settings: Table<CompanySettings, never>;
      walk_ins: Table<WalkIn, "floor_id" | "name" | "phone">;
      customers: Table<Customer, "floor_id" | "name" | "phone">;
      activities: Table<Activity, "floor_id" | "entity_type" | "entity_id" | "action">;
      catalogue_items: Table<CatalogueItem, "floor_id" | "sku" | "name">;
      catalogue_images: Table<CatalogueImage, "catalogue_item_id" | "url">;
      quotations: Table<Quotation, "floor_id" | "quotation_number" | "customer_name" | "customer_phone">;
      quotation_items: Table<QuotationItem, "quotation_id" | "description">;
      tile_orders: Table<TileOrder, "floor_id" | "order_number" | "customer_id">;
      tile_order_items: Table<TileOrderItem, "tile_order_id" | "description">;
      suppliers: Table<Supplier, "floor_id" | "name">;
      purchases: Table<Purchase, "floor_id" | "purchase_number" | "supplier_id">;
      purchase_items: Table<PurchaseItem, "purchase_id" | "description">;
      payments: Table<Payment, "floor_id" | "receipt_number" | "customer_id">;
      follow_ups: Table<FollowUp, "floor_id" | "entity_type" | "entity_id" | "due_at">;
      notifications: Table<Notification, "user_id" | "type" | "title">;
      attachments: Table<Attachment, "entity_type" | "entity_id" | "url">;
      audit_logs: Table<AuditLog, "entity_type" | "action">;
    };
    Views: Record<string, never>;
    Functions: {
      generate_quotation_number: {
        Args: { p_floor_id: string };
        Returns: string;
      };
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_purchase_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_receipt_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      public_branding: {
        Args: Record<string, never>;
        Returns: { company_name: string; logo_url: string | null }[];
      };
    };
    Enums: {
      user_role: UserRole;
      customer_tier: CustomerTier;
      walkin_source: WalkinSource;
      walkin_status: WalkinStatus;
      quotation_status: QuotationStatus;
      discount_type: DiscountType;
      tile_order_status: TileOrderStatus;
      order_payment_status: OrderPaymentStatus;
      purchase_status: PurchaseStatus;
      payment_method: PaymentMethod;
      follow_up_priority: FollowUpPriority;
      follow_up_type: FollowUpType;
      follow_up_status: FollowUpStatus;
      follow_up_entity: FollowUpEntity;
    };
    CompositeTypes: Record<string, never>;
  };
}
