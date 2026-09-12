-- Buildcon House — multi-floor schema, constraints, triggers and row level security.
-- Run this against a fresh Supabase project (SQL Editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Each enum is wrapped so re-running this file is a no-op instead of erroring
-- with "type already exists" (SQLSTATE 42710 / duplicate_object).
do $$ begin
  create type user_role as enum ('owner', 'floor_manager', 'sales_executive', 'accountant', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type walkin_source as enum (
    'walk_in', 'referral', 'instagram', 'whatsapp', 'website', 'call', 'architect', 'builder', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type walkin_status as enum (
    'new', 'contacted', 'visit_completed', 'quotation_required', 'quotation_sent',
    'negotiation', 'won', 'lost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type quotation_status as enum (
    'draft', 'awaiting_approval', 'sent', 'viewed', 'follow_up_due',
    'negotiation', 'accepted', 'rejected', 'expired', 'revised'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type discount_type as enum ('flat', 'percent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tile_order_status as enum (
    'pending_confirmation', 'confirmed', 'partially_fulfilled', 'ready_for_delivery',
    'out_for_delivery', 'delivered', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_payment_status as enum ('unpaid', 'partially_paid', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type purchase_status as enum ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type follow_up_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type follow_up_type as enum (
    'call', 'whatsapp', 'email', 'showroom_visit', 'quotation_follow_up',
    'payment_reminder', 'delivery_confirmation', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type follow_up_status as enum ('pending', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type follow_up_entity as enum ('walk_in', 'customer', 'quotation', 'tile_order', 'purchase', 'payment');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- FLOORS (fixed business areas — kept as a table, not an enum, so labels,
-- numbering rules and active/inactive state can change without a migration)
-- ============================================================================

create table if not exists floors (
  id text primary key,
  name text not null,
  short_code text not null,
  sort_order int not null default 0,
  quotation_prefix text not null,
  quotation_next_number int not null default 1,
  is_active boolean not null default true
);

insert into floors (id, name, short_code, sort_order, quotation_prefix) values
  ('tiles', 'Ground Floor - Tiles', 'TILE', 1, 'BCH/TILE/'),
  ('sanitary', 'Second Floor - Sanitary Bathroom', 'SAN', 2, 'BCH/SAN/'),
  ('kitchen', 'Kitchen Floor', 'KIT', 3, 'BCH/KIT/'),
  ('furniture', 'Furniture Floor', 'FUR', 4, 'BCH/FUR/')
on conflict (id) do nothing;

-- ============================================================================
-- PROFILES + FLOOR ACCESS
-- ============================================================================

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'sales_executive',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'sales_executive')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table if not exists user_floor_access (
  user_id uuid not null references profiles (id) on delete cascade,
  floor_id text not null references floors (id) on delete cascade,
  primary key (user_id, floor_id)
);

-- ============================================================================
-- COMPANY SETTINGS (single row — business-wide, not per floor)
-- ============================================================================

create table if not exists company_settings (
  id boolean primary key default true constraint single_row check (id),
  company_name text not null default 'Buildcon House',
  logo_url text,
  address text,
  city text,
  phone text,
  email text,
  gstin text,
  website text,
  bank_name text,
  bank_account_no text,
  bank_ifsc text,
  upi_id text,
  default_tax_percent numeric(5, 2) not null default 18,
  quotation_terms text default E'1. Prices are valid for 30 days from the date of issue.\n2. 50% advance payment required to commence work.\n3. Balance payment due before delivery/installation.\n4. GST as applicable.',
  follow_up_default_days int not null default 3,
  updated_at timestamptz not null default now()
);

insert into company_settings (id) values (true) on conflict (id) do nothing;

create table if not exists settings_lists (
  id uuid primary key default gen_random_uuid(),
  list_type text not null check (list_type in ('product_category', 'brand', 'walkin_source_label', 'payment_method_label')),
  floor_id text references floors (id) on delete cascade,
  value text not null,
  sort_order int not null default 0
);

-- ============================================================================
-- WALK-INS
-- ============================================================================

create table if not exists walk_ins (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  name text not null,
  phone text not null,
  whatsapp text,
  email text,
  company_name text,
  address text,
  source walkin_source not null default 'walk_in',
  category text,
  requirements text,
  budget_estimate numeric(14, 2),
  expected_purchase_date date,
  status walkin_status not null default 'new',
  follow_up_at timestamptz,
  assigned_to uuid references profiles (id) on delete set null,
  customer_id uuid,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists walk_ins_floor_idx on walk_ins (floor_id);
create index if not exists walk_ins_status_idx on walk_ins (floor_id, status);
create index if not exists walk_ins_phone_idx on walk_ins (phone);
create index if not exists walk_ins_created_at_idx on walk_ins (created_at desc);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  name text not null,
  phone text not null,
  whatsapp text,
  email text,
  company_name text,
  address text,
  delivery_location text,
  gstin text,
  notes text,
  is_archived boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_floor_idx on customers (floor_id);
create index if not exists customers_phone_idx on customers (phone);

do $$ begin
  alter table walk_ins
    add constraint walk_ins_customer_fk foreign key (customer_id) references customers (id) on delete set null;
exception when duplicate_object then null; end $$;

-- Generic, floor-scoped activity timeline shared by walk-ins, customers,
-- quotations, orders and purchases (entity_type + entity_id, polymorphic).
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  entity_type text not null,
  entity_id uuid not null,
  actor_id uuid references profiles (id) on delete set null,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activities_entity_idx on activities (entity_type, entity_id, created_at desc);
create index if not exists activities_floor_idx on activities (floor_id);

-- ============================================================================
-- CATALOGUE
-- ============================================================================

create table if not exists catalogue_items (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  sku text not null,
  name text not null,
  brand text,
  collection text,
  category text,
  size text,
  finish text,
  colour text,
  material text,
  thickness text,
  unit text not null default 'piece',
  pieces_per_box int,
  coverage_per_box numeric(10, 2),
  selling_price numeric(14, 2) not null default 0,
  dealer_price numeric(14, 2),
  gst_rate numeric(5, 2) not null default 18,
  stock_quantity numeric(12, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, sku)
);

create index if not exists catalogue_items_floor_idx on catalogue_items (floor_id);
create index if not exists catalogue_items_category_idx on catalogue_items (floor_id, category);
create index if not exists catalogue_items_active_idx on catalogue_items (floor_id, is_active);

create table if not exists catalogue_images (
  id uuid primary key default gen_random_uuid(),
  catalogue_item_id uuid not null references catalogue_items (id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- QUOTATIONS
-- ============================================================================

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  quotation_number text not null unique,
  customer_id uuid not null references customers (id) on delete restrict,
  walk_in_id uuid references walk_ins (id) on delete set null,
  status quotation_status not null default 'draft',
  version int not null default 1,
  root_quotation_id uuid,
  issue_date date not null default current_date,
  valid_until date,
  subtotal numeric(14, 2) not null default 0,
  discount_type discount_type not null default 'flat',
  discount_value numeric(14, 2) not null default 0,
  delivery_charges numeric(14, 2) not null default 0,
  installation_charges numeric(14, 2) not null default 0,
  tax_percent numeric(5, 2) not null default 18,
  tax_amount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  terms text,
  notes text,
  sales_executive uuid references profiles (id) on delete set null,
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table quotations
    add constraint quotations_root_fk foreign key (root_quotation_id) references quotations (id) on delete cascade;
exception when duplicate_object then null; end $$;

create index if not exists quotations_floor_idx on quotations (floor_id);
create index if not exists quotations_customer_idx on quotations (customer_id);
create index if not exists quotations_status_idx on quotations (floor_id, status);
create index if not exists quotations_root_idx on quotations (root_quotation_id);

create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations (id) on delete cascade,
  catalogue_item_id uuid references catalogue_items (id) on delete set null,
  position int not null default 0,
  section text,
  description text not null,
  unit text not null default 'unit',
  quantity numeric(12, 2) not null default 1,
  rate numeric(14, 2) not null default 0,
  item_discount_percent numeric(5, 2) not null default 0,
  gst_rate numeric(5, 2) not null default 18,
  amount numeric(14, 2) generated always as (
    round(quantity * rate * (1 - item_discount_percent / 100.0), 2)
  ) stored
);

create index if not exists quotation_items_quotation_idx on quotation_items (quotation_id);

-- ============================================================================
-- TILE ORDERS (Ground Floor only, enforced in application logic)
-- ============================================================================

create table if not exists tile_orders (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  order_number text not null unique,
  customer_id uuid not null references customers (id) on delete restrict,
  quotation_id uuid references quotations (id) on delete set null,
  status tile_order_status not null default 'pending_confirmation',
  payment_status order_payment_status not null default 'unpaid',
  order_value numeric(14, 2) not null default 0,
  amount_paid numeric(14, 2) not null default 0,
  expected_delivery_date date,
  delivery_address text,
  notes text,
  sales_executive uuid references profiles (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tile_orders_floor_idx on tile_orders (floor_id);
create index if not exists tile_orders_customer_idx on tile_orders (customer_id);
create index if not exists tile_orders_status_idx on tile_orders (floor_id, status);

create table if not exists tile_order_items (
  id uuid primary key default gen_random_uuid(),
  tile_order_id uuid not null references tile_orders (id) on delete cascade,
  catalogue_item_id uuid references catalogue_items (id) on delete set null,
  description text not null,
  unit text not null default 'unit',
  quantity numeric(12, 2) not null default 1,
  rate numeric(14, 2) not null default 0,
  amount numeric(14, 2) generated always as (round(quantity * rate, 2)) stored
);

create index if not exists tile_order_items_order_idx on tile_order_items (tile_order_id);

-- ============================================================================
-- SUPPLIERS + PURCHASES (Second Floor - Sanitary Bathroom only)
-- ============================================================================

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  name text not null,
  phone text,
  email text,
  address text,
  gstin text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists suppliers_floor_idx on suppliers (floor_id);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  purchase_number text not null unique,
  supplier_id uuid not null references suppliers (id) on delete restrict,
  purchase_date date not null default current_date,
  expected_arrival_date date,
  status purchase_status not null default 'draft',
  payment_status order_payment_status not null default 'unpaid',
  total_value numeric(14, 2) not null default 0,
  amount_paid numeric(14, 2) not null default 0,
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_floor_idx on purchases (floor_id);
create index if not exists purchases_supplier_idx on purchases (supplier_id);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases (id) on delete cascade,
  catalogue_item_id uuid references catalogue_items (id) on delete set null,
  description text not null,
  unit text not null default 'unit',
  quantity numeric(12, 2) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  gst_rate numeric(5, 2) not null default 18,
  amount numeric(14, 2) generated always as (round(quantity * unit_cost, 2)) stored
);

create index if not exists purchase_items_purchase_idx on purchase_items (purchase_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  receipt_number text not null unique,
  customer_id uuid not null references customers (id) on delete restrict,
  quotation_id uuid references quotations (id) on delete set null,
  tile_order_id uuid references tile_orders (id) on delete set null,
  purchase_id uuid references purchases (id) on delete set null,
  payment_date date not null default current_date,
  amount numeric(14, 2) not null check (amount > 0),
  method payment_method not null default 'bank_transfer',
  reference_no text,
  collected_by uuid references profiles (id) on delete set null,
  notes text,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists payments_floor_idx on payments (floor_id);
create index if not exists payments_customer_idx on payments (customer_id);
create index if not exists payments_order_idx on payments (tile_order_id);
create index if not exists payments_purchase_idx on payments (purchase_id);

-- ============================================================================
-- FOLLOW-UPS (polymorphic link to whichever entity raised it)
-- ============================================================================

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  entity_type follow_up_entity not null,
  entity_id uuid not null,
  customer_id uuid references customers (id) on delete cascade,
  due_at timestamptz not null,
  assigned_to uuid references profiles (id) on delete set null,
  priority follow_up_priority not null default 'normal',
  type follow_up_type not null default 'call',
  notes text,
  outcome_note text,
  status follow_up_status not null default 'pending',
  completed_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists follow_ups_floor_idx on follow_ups (floor_id);
create index if not exists follow_ups_due_idx on follow_ups (floor_id, status, due_at);
create index if not exists follow_ups_entity_idx on follow_ups (entity_type, entity_id);
create index if not exists follow_ups_assigned_idx on follow_ups (assigned_to);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  floor_id text references floors (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, is_read, created_at desc);

-- ============================================================================
-- ATTACHMENTS (generic, polymorphic)
-- ============================================================================

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  floor_id text references floors (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  url text not null,
  filename text,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_entity_idx on attachments (entity_type, entity_id);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  floor_id text references floors (id) on delete set null,
  actor_id uuid references profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id, created_at desc);

-- ============================================================================
-- updated_at maintenance
-- ============================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists walk_ins_set_updated_at on walk_ins;
create trigger walk_ins_set_updated_at before update on walk_ins for each row execute function set_updated_at();
drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at before update on customers for each row execute function set_updated_at();
drop trigger if exists catalogue_items_set_updated_at on catalogue_items;
create trigger catalogue_items_set_updated_at before update on catalogue_items for each row execute function set_updated_at();
drop trigger if exists quotations_set_updated_at on quotations;
create trigger quotations_set_updated_at before update on quotations for each row execute function set_updated_at();
drop trigger if exists tile_orders_set_updated_at on tile_orders;
create trigger tile_orders_set_updated_at before update on tile_orders for each row execute function set_updated_at();
drop trigger if exists purchases_set_updated_at on purchases;
create trigger purchases_set_updated_at before update on purchases for each row execute function set_updated_at();
drop trigger if exists company_settings_set_updated_at on company_settings;
create trigger company_settings_set_updated_at before update on company_settings for each row execute function set_updated_at();

-- ============================================================================
-- QUOTATION / ORDER / PURCHASE NUMBERING (fiscal-year aware, atomic)
-- ============================================================================

create or replace function current_fiscal_year_label()
returns text
language sql
stable
as $$
  select case
    when extract(month from current_date) >= 4
      then extract(year from current_date)::text || '-' || lpad(((extract(year from current_date)::int + 1) % 100)::text, 2, '0')
    else (extract(year from current_date)::int - 1)::text || '-' || lpad((extract(year from current_date)::int % 100)::text, 2, '0')
  end;
$$;

create or replace function generate_quotation_number(p_floor_id text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  next_number int;
  prefix text;
begin
  update floors
    set quotation_next_number = quotation_next_number + 1
    where id = p_floor_id
    returning quotation_next_number - 1, quotation_prefix into next_number, prefix;

  return prefix || current_fiscal_year_label() || '/' || lpad(next_number::text, 4, '0');
end;
$$;

create sequence if not exists tile_order_number_seq start 1;
create sequence if not exists purchase_number_seq start 1;

create or replace function generate_order_number()
returns text
language sql
as $$
  select 'BCH/ORD/' || current_fiscal_year_label() || '/' || lpad(nextval('tile_order_number_seq')::text, 4, '0');
$$;

create or replace function generate_purchase_number()
returns text
language sql
as $$
  select 'BCH/PUR/' || current_fiscal_year_label() || '/' || lpad(nextval('purchase_number_seq')::text, 4, '0');
$$;

create sequence if not exists receipt_number_seq start 1;

create or replace function generate_receipt_number()
returns text
language sql
as $$
  select 'BCH/RCPT/' || current_fiscal_year_label() || '/' || lpad(nextval('receipt_number_seq')::text, 5, '0');
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table user_floor_access enable row level security;
alter table company_settings enable row level security;
alter table settings_lists enable row level security;
alter table floors enable row level security;
alter table walk_ins enable row level security;
alter table customers enable row level security;
alter table activities enable row level security;
alter table catalogue_items enable row level security;
alter table catalogue_images enable row level security;
alter table quotations enable row level security;
alter table quotation_items enable row level security;
alter table tile_orders enable row level security;
alter table tile_order_items enable row level security;
alter table suppliers enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table payments enable row level security;
alter table follow_ups enable row level security;
alter table notifications enable row level security;
alter table attachments enable row level security;
alter table audit_logs enable row level security;

create or replace function is_owner()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

create or replace function is_staff()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

-- True when the current user is the owner, or has been explicitly granted
-- access to the given floor.
create or replace function has_floor_access(p_floor_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select is_staff() and (
    is_owner()
    or exists (
      select 1 from user_floor_access
      where user_id = auth.uid() and floor_id = p_floor_id
    )
  );
$$;

-- Viewers get read-only access; every other active role can write within
-- floors they have access to.
create or replace function can_write_floor(p_floor_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select has_floor_access(p_floor_id) and not exists (
    select 1 from profiles where id = auth.uid() and role = 'viewer'
  );
$$;

drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles for select using (is_staff());
drop policy if exists "profiles_insert_owner" on profiles;
create policy "profiles_insert_owner" on profiles for insert with check (is_owner());
drop policy if exists "profiles_update_self_or_owner" on profiles;
create policy "profiles_update_self_or_owner" on profiles for update using (id = auth.uid() or is_owner());
drop policy if exists "profiles_delete_owner" on profiles;
create policy "profiles_delete_owner" on profiles for delete using (is_owner());

drop policy if exists "user_floor_access_select" on user_floor_access;
create policy "user_floor_access_select" on user_floor_access for select using (is_staff());
drop policy if exists "user_floor_access_write" on user_floor_access;
create policy "user_floor_access_write" on user_floor_access for all using (is_owner()) with check (is_owner());

drop policy if exists "floors_select" on floors;
create policy "floors_select" on floors for select using (is_staff());
drop policy if exists "floors_update_owner" on floors;
create policy "floors_update_owner" on floors for update using (is_owner());

drop policy if exists "company_settings_select" on company_settings;
create policy "company_settings_select" on company_settings for select using (is_staff());
drop policy if exists "company_settings_update" on company_settings;
create policy "company_settings_update" on company_settings for update using (is_owner());

drop policy if exists "settings_lists_select" on settings_lists;
create policy "settings_lists_select" on settings_lists for select using (is_staff());
drop policy if exists "settings_lists_write" on settings_lists;
create policy "settings_lists_write" on settings_lists for all using (is_owner()) with check (is_owner());

drop policy if exists "walk_ins_select" on walk_ins;
create policy "walk_ins_select" on walk_ins for select using (has_floor_access(floor_id));
drop policy if exists "walk_ins_insert" on walk_ins;
create policy "walk_ins_insert" on walk_ins for insert with check (can_write_floor(floor_id));
drop policy if exists "walk_ins_update" on walk_ins;
create policy "walk_ins_update" on walk_ins for update using (can_write_floor(floor_id));
drop policy if exists "walk_ins_delete" on walk_ins;
create policy "walk_ins_delete" on walk_ins for delete using (is_owner());

drop policy if exists "customers_select" on customers;
create policy "customers_select" on customers for select using (has_floor_access(floor_id));
drop policy if exists "customers_insert" on customers;
create policy "customers_insert" on customers for insert with check (can_write_floor(floor_id));
drop policy if exists "customers_update" on customers;
create policy "customers_update" on customers for update using (can_write_floor(floor_id));
drop policy if exists "customers_delete" on customers;
create policy "customers_delete" on customers for delete using (is_owner());

drop policy if exists "activities_select" on activities;
create policy "activities_select" on activities for select using (has_floor_access(floor_id));
drop policy if exists "activities_insert" on activities;
create policy "activities_insert" on activities for insert with check (can_write_floor(floor_id));

drop policy if exists "catalogue_items_select" on catalogue_items;
create policy "catalogue_items_select" on catalogue_items for select using (has_floor_access(floor_id));
drop policy if exists "catalogue_items_write" on catalogue_items;
create policy "catalogue_items_write" on catalogue_items for all using (can_write_floor(floor_id)) with check (can_write_floor(floor_id));

drop policy if exists "catalogue_images_select" on catalogue_images;
create policy "catalogue_images_select" on catalogue_images for select using (
  exists (select 1 from catalogue_items ci where ci.id = catalogue_item_id and has_floor_access(ci.floor_id))
);
drop policy if exists "catalogue_images_write" on catalogue_images;
create policy "catalogue_images_write" on catalogue_images for all using (
  exists (select 1 from catalogue_items ci where ci.id = catalogue_item_id and can_write_floor(ci.floor_id))
) with check (
  exists (select 1 from catalogue_items ci where ci.id = catalogue_item_id and can_write_floor(ci.floor_id))
);

drop policy if exists "quotations_select" on quotations;
create policy "quotations_select" on quotations for select using (has_floor_access(floor_id));
drop policy if exists "quotations_insert" on quotations;
create policy "quotations_insert" on quotations for insert with check (can_write_floor(floor_id));
drop policy if exists "quotations_update" on quotations;
create policy "quotations_update" on quotations for update using (can_write_floor(floor_id));
drop policy if exists "quotations_delete" on quotations;
create policy "quotations_delete" on quotations for delete using (is_owner());

drop policy if exists "quotation_items_select" on quotation_items;
create policy "quotation_items_select" on quotation_items for select using (
  exists (select 1 from quotations q where q.id = quotation_id and has_floor_access(q.floor_id))
);
drop policy if exists "quotation_items_write" on quotation_items;
create policy "quotation_items_write" on quotation_items for all using (
  exists (select 1 from quotations q where q.id = quotation_id and can_write_floor(q.floor_id))
) with check (
  exists (select 1 from quotations q where q.id = quotation_id and can_write_floor(q.floor_id))
);

drop policy if exists "tile_orders_select" on tile_orders;
create policy "tile_orders_select" on tile_orders for select using (has_floor_access(floor_id));
drop policy if exists "tile_orders_write" on tile_orders;
create policy "tile_orders_write" on tile_orders for all using (can_write_floor(floor_id)) with check (can_write_floor(floor_id));

drop policy if exists "tile_order_items_select" on tile_order_items;
create policy "tile_order_items_select" on tile_order_items for select using (
  exists (select 1 from tile_orders o where o.id = tile_order_id and has_floor_access(o.floor_id))
);
drop policy if exists "tile_order_items_write" on tile_order_items;
create policy "tile_order_items_write" on tile_order_items for all using (
  exists (select 1 from tile_orders o where o.id = tile_order_id and can_write_floor(o.floor_id))
) with check (
  exists (select 1 from tile_orders o where o.id = tile_order_id and can_write_floor(o.floor_id))
);

drop policy if exists "suppliers_select" on suppliers;
create policy "suppliers_select" on suppliers for select using (has_floor_access(floor_id));
drop policy if exists "suppliers_write" on suppliers;
create policy "suppliers_write" on suppliers for all using (can_write_floor(floor_id)) with check (can_write_floor(floor_id));

drop policy if exists "purchases_select" on purchases;
create policy "purchases_select" on purchases for select using (has_floor_access(floor_id));
drop policy if exists "purchases_write" on purchases;
create policy "purchases_write" on purchases for all using (can_write_floor(floor_id)) with check (can_write_floor(floor_id));

drop policy if exists "purchase_items_select" on purchase_items;
create policy "purchase_items_select" on purchase_items for select using (
  exists (select 1 from purchases p where p.id = purchase_id and has_floor_access(p.floor_id))
);
drop policy if exists "purchase_items_write" on purchase_items;
create policy "purchase_items_write" on purchase_items for all using (
  exists (select 1 from purchases p where p.id = purchase_id and can_write_floor(p.floor_id))
) with check (
  exists (select 1 from purchases p where p.id = purchase_id and can_write_floor(p.floor_id))
);

drop policy if exists "payments_select" on payments;
create policy "payments_select" on payments for select using (has_floor_access(floor_id));
drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert with check (can_write_floor(floor_id) and not exists (
  select 1 from profiles where id = auth.uid() and role in ('sales_executive')
));
drop policy if exists "payments_update" on payments;
create policy "payments_update" on payments for update using (is_owner() or exists (
  select 1 from profiles where id = auth.uid() and role = 'accountant'
));
drop policy if exists "payments_delete" on payments;
create policy "payments_delete" on payments for delete using (is_owner());

drop policy if exists "follow_ups_select" on follow_ups;
create policy "follow_ups_select" on follow_ups for select using (has_floor_access(floor_id));
drop policy if exists "follow_ups_insert" on follow_ups;
create policy "follow_ups_insert" on follow_ups for insert with check (can_write_floor(floor_id));
drop policy if exists "follow_ups_update" on follow_ups;
create policy "follow_ups_update" on follow_ups for update using (can_write_floor(floor_id));
drop policy if exists "follow_ups_delete" on follow_ups;
create policy "follow_ups_delete" on follow_ups for delete using (is_owner() or created_by = auth.uid());

drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid());
drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert" on notifications for insert with check (is_staff());

drop policy if exists "attachments_select" on attachments;
create policy "attachments_select" on attachments for select using (floor_id is null or has_floor_access(floor_id));
drop policy if exists "attachments_insert" on attachments;
create policy "attachments_insert" on attachments for insert with check (floor_id is null or can_write_floor(floor_id));
drop policy if exists "attachments_delete" on attachments;
create policy "attachments_delete" on attachments for delete using (is_owner());

drop policy if exists "audit_logs_select" on audit_logs;
create policy "audit_logs_select" on audit_logs for select using (is_owner());
drop policy if exists "audit_logs_insert" on audit_logs;
create policy "audit_logs_insert" on audit_logs for insert with check (is_staff());

-- ============================================================================
-- STORAGE (company logo + catalogue images + receipts)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('catalogue', 'catalogue', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "branding_public_read" on storage.objects;
create policy "branding_public_read" on storage.objects for select using (bucket_id = 'branding');
drop policy if exists "branding_staff_write" on storage.objects;
create policy "branding_staff_write" on storage.objects for insert with check (bucket_id = 'branding' and is_staff());
drop policy if exists "branding_staff_update" on storage.objects;
create policy "branding_staff_update" on storage.objects for update using (bucket_id = 'branding' and is_staff());

drop policy if exists "catalogue_public_read" on storage.objects;
create policy "catalogue_public_read" on storage.objects for select using (bucket_id = 'catalogue');
drop policy if exists "catalogue_staff_write" on storage.objects;
create policy "catalogue_staff_write" on storage.objects for insert with check (bucket_id = 'catalogue' and is_staff());
drop policy if exists "catalogue_staff_update" on storage.objects;
create policy "catalogue_staff_update" on storage.objects for update using (bucket_id = 'catalogue' and is_staff());

drop policy if exists "attachments_bucket_staff_read" on storage.objects;
create policy "attachments_bucket_staff_read" on storage.objects for select using (bucket_id = 'attachments' and is_staff());
drop policy if exists "attachments_bucket_staff_write" on storage.objects;
create policy "attachments_bucket_staff_write" on storage.objects for insert with check (bucket_id = 'attachments' and is_staff());
