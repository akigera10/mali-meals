import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

export async function GET(request: NextRequest) {
  const authError = await requireAdminRequest()
  if (authError) return authError

  const orderId = request.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  const db = createAdminClient()

  const [{ data: order, error: orderError }, { data: items }, { data: specials }, { data: standaloneAddons }] = await Promise.all([
    db.from('orders').select('*').eq('id', orderId).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_items') as any)
      .select('id, dish_name, quantity, variant, meat_type, unit_price, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, unit_price, protein_addons(name))')
      .eq('order_id', orderId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_specials') as any)
      .select('id, special_name, quantity, unit_price, specials(name)')
      .eq('order_id', orderId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_addons') as any)
      .select('id, addon_name, quantity, unit_price, protein_addons(name)')
      .eq('order_id', orderId),
  ])

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({
    order,
    items: items ?? [],
    specials: specials ?? [],
    standaloneAddons: standaloneAddons ?? [],
  })
}
