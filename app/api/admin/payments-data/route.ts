import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminRequest()
  if (authError) return authError

  const db = createAdminClient()
  const date = request.nextUrl.searchParams.get('date')

  if (!date) {
    const { data } = await db
      .from('orders')
      .select('delivery_date')
      .not('delivery_date', 'is', null)
      .neq('order_status', 'cancelled')
      .order('delivery_date', { ascending: true })

    const unique = Array.from(new Set((data ?? []).map((r: Record<string, unknown>) => r.delivery_date as string)))
    return NextResponse.json({ dates: unique })
  }

  const { data } = await db
    .from('orders')
    .select('id, order_ref, customer_name, customer_phone, delivery_zone, subtotal, delivery_fee, total_amount, payment_status, order_status, mpesa_code, paid_at')
    .eq('delivery_date', date)
    .neq('order_status', 'cancelled')

  const rows = (data ?? []) as Record<string, unknown>[]
  const paidTimestamp = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return 0
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }
  const paid = rows
    .filter(o => o.payment_status === 'paid' && o.mpesa_code)
    .sort((a, b) => paidTimestamp(b.paid_at) - paidTimestamp(a.paid_at))
  const unpaid = rows.filter(o => o.payment_status !== 'paid')

  return NextResponse.json({ paid, unpaid })
}
