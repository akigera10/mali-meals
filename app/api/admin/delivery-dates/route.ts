import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

export async function GET() {
  const authError = await requireAdminRequest()
  if (authError) return authError

  const db = createAdminClient()

  const [{ data, error }, { data: settings }] = await Promise.all([
    db
      .from('orders')
      .select('delivery_date')
      .not('delivery_date', 'is', null)
      .order('delivery_date', { ascending: true }),
    db
      .from('settings')
      .select('next_sunday_date, next_monday_date, next_wednesday_date')
      .maybeSingle(),
  ])

  if (error) return NextResponse.json({ dates: [] })
  const unique = Array.from(new Set([
    ...((data ?? []).map((r: Record<string, unknown>) => r.delivery_date as string)),
    settings?.next_sunday_date,
    settings?.next_monday_date,
    settings?.next_wednesday_date,
  ].filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))
  return NextResponse.json({ dates: unique })
}
