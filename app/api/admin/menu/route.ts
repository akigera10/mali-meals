import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

type TableName = 'menu_items' | 'specials' | 'protein_addons'

const allowedFields: Record<TableName, Set<string>> = {
  menu_items: new Set([
    'name',
    'description',
    'meat_upgrade_type',
    'meat_upgrade_price',
    'allergens',
    'is_freezer_friendly',
    'is_spicy',
    'is_family_friendly',
    'is_active',
    'is_sold_out',
    'available_weekend',
    'available_midweek',
  ]),
  specials: new Set([
    'name',
    'description',
    'price',
    'is_active',
    'is_sold_out',
  ]),
  protein_addons: new Set([
    'name',
    'price',
    'is_active',
    'is_sold_out',
  ]),
}

function sanitizeUpdates(table: TableName, updates: Record<string, unknown>) {
  const safe: Record<string, unknown> = {}
  const fields = allowedFields[table]

  for (const [key, value] of Object.entries(updates ?? {})) {
    if (fields.has(key)) safe[key] = value
  }

  return safe
}

export async function PATCH(request: Request) {
  const authError = await requireAdminRequest()
  if (authError) return authError

  const { table, id, updates } = await request.json()

  if (!allowedFields[table as TableName] || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid menu update request' }, { status: 400 })
  }

  const safeUpdates = sanitizeUpdates(table, updates)
  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: 'No permitted fields to update' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from(table).update(safeUpdates).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  const authError = await requireAdminRequest()
  if (authError) return authError

  const { table, values } = await request.json()

  if (table !== 'specials') {
    return NextResponse.json({ error: 'Only specials can be created here' }, { status: 400 })
  }

  const safeValues = sanitizeUpdates(table, values)
  const db = createAdminClient()
  const { data, error } = await db.from('specials').insert(safeValues).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
