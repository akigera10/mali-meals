import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createCookieServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase'

async function requireAdminSession() {
  const cookieStore = cookies()
  const supabase = createCookieServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  return !error && !!user
}

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = request.nextUrl.searchParams.get('date')
  const scope = request.nextUrl.searchParams.get('scope')
  if (!date) return NextResponse.json({ orders: [], items: [], specials: [] })

  const db = createAdminClient()

  let ordersQuery = db
    .from('orders')
    .select('id, order_ref, customer_name, customer_phone, customer_email, delivery_zone, delivery_day, delivery_window, delivery_slot, delivery_date, notes, address_building, address_street, address_apartment, address_landmark, subtotal, delivery_fee, total_amount, payment_status, order_status, created_at, updated_at, paid_at')
    .eq('delivery_date', date)
    .order('created_at', { ascending: false })

  if (scope === 'kitchen') {
    ordersQuery = ordersQuery.in('order_status', ['new', 'confirmed', 'dispatched'])
  }

  const { data: ordersData } = await ordersQuery

  const orders = ordersData ?? []
  if (orders.length === 0) return NextResponse.json({ orders: [], items: [], specials: [] })

  const orderIds = orders.map((o: Record<string, unknown>) => o.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: itemsData }, { data: specialsData }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_items') as any)
      .select('order_id, dish_name, quantity, variant, meat_type, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, protein_addons(name))')
      .in('order_id', orderIds),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_specials') as any)
      .select('order_id, special_name, quantity, specials(name)')
      .in('order_id', orderIds),
  ])

  return NextResponse.json({
    orders,
    items: itemsData ?? [],
    specials: specialsData ?? [],
  })
}
