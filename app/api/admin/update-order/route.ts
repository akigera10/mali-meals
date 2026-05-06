import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(request: Request) {
  const db = createAdminClient()
  const { orderId, updates } = await request.json()

  console.log('[update-order] orderId:', orderId, 'updates:', updates)
  const { error } = await db.from('orders').update(updates).eq('id', orderId)
  console.log('[update-order] error:', error)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
