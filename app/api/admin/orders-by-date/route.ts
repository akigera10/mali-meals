import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

export async function GET(request: NextRequest) {
  const authError = await requireAdminRequest()
  if (authError) return authError

  const date = request.nextUrl.searchParams.get('date')
  const scope = request.nextUrl.searchParams.get('scope')
  if (!date) return NextResponse.json({ orders: [], items: [], specials: [], standaloneAddons: [] })

  const db = createAdminClient()

  let ordersQuery = db
    .from('orders')
    .select('id, order_ref, customer_name, customer_phone, customer_email, delivery_zone, delivery_day, delivery_window, delivery_slot, delivery_date, notes, address_building, address_street, address_apartment, address_landmark, subtotal, delivery_fee, total_amount, payment_status, order_status, created_at, updated_at, paid_at, mpesa_code')
    .eq('delivery_date', date)
    .order('created_at', { ascending: false })

  if (scope === 'kitchen') {
    ordersQuery = ordersQuery.in('order_status', ['new', 'confirmed', 'dispatched'])
  }

  const { data: ordersData } = await ordersQuery

  const orders = ordersData ?? []
  if (orders.length === 0) return NextResponse.json({ orders: [], items: [], specials: [], standaloneAddons: [] })

  const orderIds = orders.map((o: Record<string, unknown>) => o.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: itemsData }, { data: specialsData }, { data: standaloneAddonsData }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_items') as any)
      .select('order_id, dish_name, quantity, variant, meat_type, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, protein_addons(name))')
      .in('order_id', orderIds),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_specials') as any)
      .select('order_id, special_name, quantity, specials(name)')
      .in('order_id', orderIds),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_addons') as any)
      .select('order_id, addon_name, quantity, protein_addons(name)')
      .in('order_id', orderIds),
  ])

  return NextResponse.json({
    orders,
    items: itemsData ?? [],
    specials: specialsData ?? [],
    standaloneAddons: standaloneAddonsData ?? [],
  })
}
