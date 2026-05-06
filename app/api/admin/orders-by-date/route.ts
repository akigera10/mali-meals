import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ orders: [], items: [], specials: [] })

  const db = createAdminClient()

  const { data: ordersData } = await db
    .from('orders')
    .select('id, order_ref, order_status, delivery_day, delivery_zone, total_amount, customer_name')
    .eq('delivery_date', date)
    .in('order_status', ['new', 'confirmed', 'dispatched'])

  const orders = ordersData ?? []
  if (orders.length === 0) return NextResponse.json({ orders: [], items: [], specials: [] })

  const orderIds = orders.map((o: any) => o.id)
  const [{ data: itemsData }, { data: specialsData }] = await Promise.all([
    (db.from('order_items') as any)
      .select('order_id, quantity, variant, meat_type, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, protein_addons(name))')
      .in('order_id', orderIds),
    (db.from('order_specials') as any)
      .select('order_id, quantity, specials(name)')
      .in('order_id', orderIds),
  ])

  return NextResponse.json({
    orders,
    items: itemsData ?? [],
    specials: specialsData ?? [],
  })
}
