import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function nullableDate(value: unknown): string | null | undefined {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return undefined
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value
}

function nullableDateTime(value: unknown): string | null | undefined {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return undefined
  return value
}

function nullableWhatsAppLink(value: unknown): string | null | undefined {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value !== 'string' || value.length > 2048) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'chat.whatsapp.com' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminRequest()
  if (authError) return authError

  let body: Record<string, unknown>
  try {
    const payload = await req.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid')
    body = payload as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const activeCycle = body.active_cycle
  const weekendCutoff = nullableDateTime(body.weekend_cutoff)
  const midweekCutoff = nullableDateTime(body.midweek_cutoff)
  const sundayDate = nullableDate(body.next_sunday_date)
  const mondayDate = nullableDate(body.next_monday_date)
  const wednesdayDate = nullableDate(body.next_wednesday_date)
  const whatsappLink = nullableWhatsAppLink(body.whatsapp_group_link)

  if (
    (activeCycle !== 'weekend' && activeCycle !== 'midweek') ||
    weekendCutoff === undefined ||
    midweekCutoff === undefined ||
    sundayDate === undefined ||
    mondayDate === undefined ||
    wednesdayDate === undefined ||
    whatsappLink === undefined
  ) {
    return NextResponse.json({ error: 'Invalid settings values' }, { status: 400 })
  }

  const db = createAdminClient()

  const { error } = await db.from('settings').upsert({
    id: SETTINGS_ID,
    active_cycle: activeCycle,
    weekend_cutoff: weekendCutoff,
    midweek_cutoff: midweekCutoff,
    next_sunday_date: sundayDate,
    next_monday_date: mondayDate,
    next_wednesday_date: wednesdayDate,
    whatsapp_group_link: whatsappLink,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: 'Unable to save settings' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
