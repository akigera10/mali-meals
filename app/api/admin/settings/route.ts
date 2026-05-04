import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(req: Request) {
  const body = await req.json()
  const db = createAdminClient()

  const { error } = await db.from('settings').upsert({
    id: SETTINGS_ID,
    active_cycle: body.active_cycle,
    weekend_cutoff: body.weekend_cutoff || null,
    midweek_cutoff: body.midweek_cutoff || null,
    next_sunday_date: body.next_sunday_date || null,
    next_monday_date: body.next_monday_date || null,
    next_wednesday_date: body.next_wednesday_date || null,
    whatsapp_group_link: body.whatsapp_group_link || null,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
