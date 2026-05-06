import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST() {
  const db = createAdminClient()

  const { data } = await db
    .from('orders')
    .select('order_ref')

  const maxNumber = (data ?? []).reduce((max: number, row: { order_ref: string }) => {
    const num = parseInt(row.order_ref.replace('MAL-', ''), 10)
    return !isNaN(num) && num > max ? num : max
  }, 999)

  const orderRef = `MAL-${maxNumber + 1}`

  return NextResponse.json({ orderRef })
}
