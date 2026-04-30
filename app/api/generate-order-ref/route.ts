import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST() {
  const db = createAdminClient()

  const { data } = await db
    .from('orders')
    .select('order_ref')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastNum = data?.order_ref
    ? parseInt((data.order_ref as string).replace('MAL-', ''), 10)
    : 999
  const orderRef = `MAL-${isNaN(lastNum) ? 1000 : lastNum + 1}`

  return NextResponse.json({ orderRef })
}
