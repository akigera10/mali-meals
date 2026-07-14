select setval(
  'public.order_ref_seq',
  greatest(
    coalesce(
      (
        select max(substring(order_ref from '^MAL-([0-9]+)$')::bigint)
        from public.orders
        where order_ref ~ '^MAL-[0-9]+$'
      ),
      0
    ),
    (select last_value from public.order_ref_seq)
  ),
  true
);
