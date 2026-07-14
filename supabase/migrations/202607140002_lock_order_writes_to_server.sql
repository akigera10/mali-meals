drop policy if exists "Public can insert order item addons" on public.order_item_addons;
drop policy if exists "Public can insert order items" on public.order_items;
drop policy if exists "Public can insert order specials" on public.order_specials;
drop policy if exists "Public can insert orders" on public.orders;

revoke insert on public.orders from anon, authenticated;
revoke insert on public.order_items from anon, authenticated;
revoke insert on public.order_item_addons from anon, authenticated;
revoke insert on public.order_specials from anon, authenticated;
revoke all on public.order_addons from anon, authenticated;
