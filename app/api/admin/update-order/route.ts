import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

const ORDER_STATUSES = new Set(['new', 'confirmed', 'dispatched', 'delivered', 'cancelled'])
const PAYMENT_STATUSES = new Set(['unpaid', 'paid'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeUpdates(updates: unknown): Record<string, unknown> | null {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return null

  const input = updates as Record<string, unknown>
  const safe: Record<string, unknown> = {}

  if ('order_status' in input) {
    if (typeof input.order_status !== 'string' || !ORDER_STATUSES.has(input.order_status)) return null
    safe.order_status = input.order_status
  }

  if ('payment_status' in input) {
    if (typeof input.payment_status !== 'string' || !PAYMENT_STATUSES.has(input.payment_status)) return null
    safe.payment_status = input.payment_status
  }

  if ('mpesa_code' in input) {
    if (input.mpesa_code !== null && (typeof input.mpesa_code !== 'string' || input.mpesa_code.trim().length > 64)) return null
    safe.mpesa_code = typeof input.mpesa_code === 'string' ? input.mpesa_code.trim() : null
  }

  if ('paid_at' in input) {
    if (input.paid_at !== null && (typeof input.paid_at !== 'string' || Number.isNaN(Date.parse(input.paid_at)))) return null
    safe.paid_at = input.paid_at
  }

  if ('notes' in input) {
    if (input.notes !== null && (typeof input.notes !== 'string' || input.notes.length > 2000)) return null
    safe.notes = input.notes
  }

  return Object.keys(safe).length > 0 ? safe : null
}

export async function PATCH(request: Request) {
  const authError = await requireAdminRequest()
  if (authError) return authError

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid order update request' }, { status: 400 })
  }

  const { orderId, updates } = payload as Record<string, unknown>
  const safeUpdates = sanitizeUpdates(updates)
  if (typeof orderId !== 'string' || !UUID_PATTERN.test(orderId) || !safeUpdates) {
    return NextResponse.json({ error: 'Invalid order update request' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('orders')
    .update(safeUpdates)
    .eq('id', orderId)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Unable to update order' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
