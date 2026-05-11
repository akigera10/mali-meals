import { NextResponse } from 'next/server'
import { createServerClient as createCookieServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase'

async function requireAdminSession() {
  const cookieStore = cookies()
  const supabase = createCookieServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  return !error && !!user
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
