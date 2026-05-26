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

  const orderId = request.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  const db = createAdminClient()

  const [{ data: order, error: orderError }, { data: items }, { data: specials }] = await Promise.all([
    db.from('orders').select('*').eq('id', orderId).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_items') as any)
      .select('id, dish_name, quantity, variant, meat_type, unit_price, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, unit_price, protein_addons(name))')
      .eq('order_id', orderId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('order_specials') as any)
      .select('id, special_name, quantity, unit_price, specials(name)')
      .eq('order_id', orderId),
  ])

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({
    order,
    items: items ?? [],
    specials: specials ?? [],
  })
}
