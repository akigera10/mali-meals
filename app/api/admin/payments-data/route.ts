import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
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
  const paid = rows
    .filter(o => o.payment_status === 'paid' && o.mpesa_code)
    .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
  const unpaid = rows.filter(o => o.payment_status !== 'paid')

  return NextResponse.json({ paid, unpaid })
}
