-- ==========================================================
-- Supabase Schema for StockAudit (Warehouse Tracking App)
-- Copy and run this script in the Supabase SQL Editor
-- ==========================================================

-- 1. Warehouses Table
create table if not exists public.warehouses (
  id text primary key,
  name text not null,
  code text not null,
  description text,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- 2. Categories Table
create table if not exists public.categories (
  id text primary key,
  name text not null,
  color text not null,
  description text
);

-- 3. Products Table
create table if not exists public.products (
  id text primary key,
  name text not null,
  sku text,
  details text,
  category_id text references public.categories(id) on delete set null,
  image text,
  unit text default 'pcs',
  min_stock_threshold integer default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Warehouse Stocks Table
create table if not exists public.warehouse_stocks (
  id text primary key,
  product_id text references public.products(id) on delete cascade,
  warehouse_id text references public.warehouses(id) on delete cascade,
  stock_number integer default 0,
  audit_number integer default 0,
  variance integer default 0,
  last_audited_at timestamptz default now(),
  notes text,
  unique(product_id, warehouse_id)
);

-- 5. Audit Logs Table
create table if not exists public.audit_logs (
  id text primary key,
  product_id text,
  product_name text not null,
  warehouse_id text,
  warehouse_name text not null,
  previous_stock integer default 0,
  audited_stock integer default 0,
  variance integer default 0,
  notes text,
  timestamp timestamptz default now()
);

-- Indexes for lightning fast queries
create index if not exists idx_warehouse_stocks_product on public.warehouse_stocks(product_id);
create index if not exists idx_warehouse_stocks_warehouse on public.warehouse_stocks(warehouse_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_products_category on public.products(category_id);

-- Enable Row Level Security (RLS)
alter table public.warehouses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.warehouse_stocks enable row level security;
alter table public.audit_logs enable row level security;

-- Public / Anonymous access policies for standalone warehouse phone use
-- (Modify these if you later add Supabase Auth email/password login)
create policy "Allow all actions on warehouses" on public.warehouses for all using (true) with check (true);
create policy "Allow all actions on categories" on public.categories for all using (true) with check (true);
create policy "Allow all actions on products" on public.products for all using (true) with check (true);
create policy "Allow all actions on warehouse_stocks" on public.warehouse_stocks for all using (true) with check (true);
create policy "Allow all actions on audit_logs" on public.audit_logs for all using (true) with check (true);

