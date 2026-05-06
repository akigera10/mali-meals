import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const db = createAdminClient()

  const { data, error } = await db
    .from('orders')
    .select('delivery_date')
    .not('delivery_date', 'is', null)
    .in('order_status', ['new', 'confirmed', 'dispatched'])
    .order('delivery_date', { ascending: true })

  if (error) return NextResponse.json({ dates: [] })
  const unique = Array.from(new Set((data ?? []).map((r: any) => r.delivery_date as string)))
  return NextResponse.json({ dates: unique })
}
