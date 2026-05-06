import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const DELIVERY_STATUSES = ['confirmed', 'dispatched', 'delivered']

export async function GET(request: NextRequest) {
  const db = createAdminClient()
  const date = request.nextUrl.searchParams.get('date')

  if (!date) {
    const { data } = await db
      .from('orders')
      .select('delivery_date')
      .not('delivery_date', 'is', null)
      .in('order_status', DELIVERY_STATUSES)
      .order('delivery_date', { ascending: true })

    const unique = Array.from(new Set((data ?? []).map((r: Record<string, unknown>) => r.delivery_date as string)))
    return NextResponse.json({ dates: unique })
  }

  const { data } = await db
    .from('orders')
    .select('id, order_ref, customer_name, customer_phone, delivery_zone, delivery_day, delivery_window, delivery_slot, address_building, address_street, address_apartment, address_landmark, total_amount, payment_status, order_status, notes')
    .eq('delivery_date', date)
    .in('order_status', DELIVERY_STATUSES)
    .order('delivery_zone', { ascending: true })

  return NextResponse.json({ orders: data ?? [] })
}
