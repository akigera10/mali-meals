/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase'
import AdminNav from '../components/AdminNav'
import ReportsClient from './ReportsClient'

export const revalidate = 0

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function defaultFromDate() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return isoDate(d)
}

function defaultToDate() {
  return isoDate(new Date())
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; preset?: string }
}) {
  const db = createAdminClient()
  const from = searchParams.from || defaultFromDate()
  const to = searchParams.to || defaultToDate()
  const isAllTime = searchParams.preset === 'all'

  let ordersQuery = db
    .from('orders')
    .select('id, customer_name, customer_phone, delivery_date, delivery_zone, total_amount, payment_status, cycle_type')
    .not('delivery_date', 'is', null)
    .neq('order_status', 'cancelled')
    .order('delivery_date', { ascending: false })

  if (!isAllTime) {
    ordersQuery = ordersQuery.gte('delivery_date', from).lte('delivery_date', to)
  }

  const [{ data: ordersData }, { data: lifetimeOrdersData }] = await Promise.all([
    ordersQuery,
    db
      .from('orders')
      .select('id, customer_name, customer_phone, delivery_date, total_amount')
      .not('delivery_date', 'is', null)
      .neq('order_status', 'cancelled')
      .order('delivery_date', { ascending: false }),
  ])

  const orders = (ordersData ?? []) as any[]
  const orderIds = orders.map(o => o.id)

  let items: any[] = []
  let addons: any[] = []

  if (orderIds.length > 0) {
    const { data: itemsData } = await (db.from('order_items') as any)
      .select('id, order_id, dish_name, quantity, variant, unit_price, menu_items(name)')
      .in('order_id', orderIds)

    items = itemsData ?? []
    const itemIds = items.map(i => i.id)

    if (itemIds.length > 0) {
      const { data: addonsData } = await (db.from('order_item_addons') as any)
        .select('order_item_id, quantity, unit_price, protein_addons(name)')
        .in('order_item_id', itemIds)
      addons = addonsData ?? []
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <ReportsClient
        from={from}
        to={to}
        preset={searchParams.preset || ''}
        orders={orders}
        items={items}
        addons={addons}
        lifetimeOrders={(lifetimeOrdersData ?? []) as any[]}
      />
    </div>
  )
}
