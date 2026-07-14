create table if not exists public.order_addons (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  addon_id uuid not null references public.protein_addons(id),
  addon_name text,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_addons_order_id_idx on public.order_addons(order_id);

alter table public.order_addons enable row level security;

comment on table public.order_addons is
  'Order-level protein add-ons, including add-on-only orders. Writes are server-side only.';

alter function public.set_updated_at() set search_path = pg_catalog, public;
