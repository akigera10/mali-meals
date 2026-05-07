/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Order = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  delivery_date: string | null
  delivery_zone: number | null
  total_amount: number | null
  payment_status: string | null
  cycle_type: string | null
}

type Item = {
  id: string
  order_id: string
  dish_name: string | null
  quantity: number
  variant: string
  unit_price: number
  menu_items: { name: string | null } | null
}

type Addon = {
  order_item_id: string
  quantity: number
  unit_price: number
  protein_addons: { name: string | null } | null
}

const ZONE_NAMES: Record<number, string> = {
  1: 'Lavington, Kilimani, Kileleshwa, Hurlingham',
  2: 'Riverside, Westlands, Parklands, Peponi',
  3: 'Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga',
  4: 'Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road',
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-KE')
}

function dateLabel(value: string | null) {
  if (!value) return '—'
  return new Date(value + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function monthLabel(value: string) {
  const [year, month] = value.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfWeek(d: Date) {
  const copy = new Date(d)
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  return copy
}

export default function ReportsClient({
  from,
  to,
  preset,
  orders,
  items,
  addons,
  lifetimeOrders,
}: {
  from: string
  to: string
  preset: string
  orders: Order[]
  items: Item[]
  addons: Addon[]
  lifetimeOrders: Order[]
}) {
  const router = useRouter()
  const [dishSort, setDishSort] = useState<'portions' | 'revenue'>('portions')

  const itemOrderMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of items) map[item.id] = item.order_id
    return map
  }, [items])

  const orderSet = useMemo(() => new Set(orders.map(o => o.id)), [orders])

  const dishRows = useMemo(() => {
    const map: Record<string, { name: string; portions: number; vegetarian: number; meat: number; revenue: number }> = {}
    for (const item of items) {
      const name = item.dish_name || item.menu_items?.name || 'Unknown dish'
      if (!map[name]) map[name] = { name, portions: 0, vegetarian: 0, meat: 0, revenue: 0 }
      map[name].portions += item.quantity
      map[name].revenue += item.quantity * item.unit_price
      if (item.variant === 'vegetarian') map[name].vegetarian += item.quantity
      if (item.variant === 'meat') map[name].meat += item.quantity
    }
    return Object.values(map).sort((a, b) => b.portions - a.portions)
  }, [items])

  const dishRowsByRevenue = useMemo(() => [...dishRows].sort((a, b) => b.revenue - a.revenue), [dishRows])
  const missingSnapshots = items.filter(i => !i.dish_name).length

  const monthlyRows = useMemo(() => {
    const map: Record<string, { month: string; orders: number; revenue: number; paid: number; phones: Set<string> }> = {}
    for (const order of orders) {
      if (!order.delivery_date) continue
      const month = order.delivery_date.slice(0, 7)
      if (!map[month]) map[month] = { month, orders: 0, revenue: 0, paid: 0, phones: new Set() }
      map[month].orders += 1
      map[month].revenue += order.total_amount ?? 0
      if (order.payment_status === 'paid') map[month].paid += order.total_amount ?? 0
      if (order.customer_phone) map[month].phones.add(order.customer_phone)
    }
    return Object.values(map).map(row => ({
      month: row.month,
      orders: row.orders,
      revenue: row.revenue,
      paid: row.paid,
      customers: row.phones.size,
    })).sort((a, b) => b.month.localeCompare(a.month))
  }, [orders])

  const zoneRows = useMemo(() => {
    const map: Record<number, { zone: number; orders: number; revenue: number }> = {}
    for (const order of orders) {
      const zone = order.delivery_zone ?? 0
      if (!zone) continue
      if (!map[zone]) map[zone] = { zone, orders: 0, revenue: 0 }
      map[zone].orders += 1
      map[zone].revenue += order.total_amount ?? 0
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [orders])

  const repeatStats = useMemo(() => {
    const map: Record<string, { phone: string; name: string; orders: number; spent: number; last: string }> = {}
    for (const order of lifetimeOrders) {
      const phone = order.customer_phone || 'Unknown'
      if (!map[phone]) map[phone] = { phone, name: order.customer_name || 'Unknown', orders: 0, spent: 0, last: order.delivery_date || '' }
      map[phone].orders += 1
      map[phone].spent += order.total_amount ?? 0
      if ((order.delivery_date || '') > map[phone].last) map[phone].last = order.delivery_date || ''
    }
    const customers = Object.values(map)
    const repeats = customers.filter(c => c.orders >= 2)
    return {
      total: customers.length,
      repeatCount: repeats.length,
      repeatRate: customers.length ? Math.round((repeats.length / customers.length) * 100) : 0,
      top: customers.sort((a, b) => b.orders - a.orders || b.spent - a.spent).slice(0, 10),
    }
  }, [lifetimeOrders])

  const cycleRows = useMemo(() => {
    const map: Record<string, { cycle: string; orders: number; revenue: number }> = {}
    for (const order of orders) {
      const cycle = order.cycle_type || 'unknown'
      if (!map[cycle]) map[cycle] = { cycle, orders: 0, revenue: 0 }
      map[cycle].orders += 1
      map[cycle].revenue += order.total_amount ?? 0
    }
    return Object.values(map).filter(row => row.cycle !== 'unknown')
  }, [orders])

  const addonRows = useMemo(() => {
    const totalOrders = orders.length || 1
    const map: Record<string, { name: string; quantity: number; revenue: number; orderIds: Set<string> }> = {}
    for (const addon of addons) {
      const orderId = itemOrderMap[addon.order_item_id]
      if (!orderSet.has(orderId)) continue
      const name = addon.protein_addons?.name || 'Unknown add-on'
      if (!map[name]) map[name] = { name, quantity: 0, revenue: 0, orderIds: new Set() }
      map[name].quantity += addon.quantity
      map[name].revenue += addon.quantity * addon.unit_price
      if (orderId) map[name].orderIds.add(orderId)
    }
    return Object.values(map).map(row => ({
      name: row.name,
      quantity: row.quantity,
      revenue: row.revenue,
      attachRate: Math.round((row.orderIds.size / totalOrders) * 100),
    })).sort((a, b) => b.quantity - a.quantity)
  }, [addons, itemOrderMap, orders.length, orderSet])

  function setRange(nextFrom: string, nextTo: string, nextPreset = '') {
    const params = new URLSearchParams()
    params.set('from', nextFrom)
    params.set('to', nextTo)
    if (nextPreset) params.set('preset', nextPreset)
    router.push(`/admin/reports?${params.toString()}`)
  }

  function applyPreset(next: string) {
    const today = new Date()
    if (next === 'this-week') {
      setRange(isoDate(startOfWeek(today)), isoDate(today), next)
    } else if (next === 'last-week') {
      const end = startOfWeek(today)
      end.setDate(end.getDate() - 1)
      const start = startOfWeek(end)
      setRange(isoDate(start), isoDate(end), next)
    } else if (next === 'this-month') {
      setRange(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), isoDate(today), next)
    } else if (next === 'last-month') {
      setRange(isoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), isoDate(new Date(today.getFullYear(), today.getMonth(), 0)), next)
    } else if (next === 'last-3-months') {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 3)
      setRange(isoDate(start), isoDate(today), next)
    } else {
      setRange('1900-01-01', isoDate(today), 'all')
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 64px' }}>
        <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '28px', color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Reports
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: '0 0 24px' }}>
          Strategic view of sales, customers, zones, and menu performance.
        </p>

        <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 20px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              From
              <input type="date" value={from} onChange={e => setRange(e.target.value, to)} style={{ marginLeft: '8px', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-primary)', fontFamily: 'var(--font-inter)', fontSize: '13px' }} />
            </label>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              To
              <input type="date" value={to} onChange={e => setRange(from, e.target.value)} style={{ marginLeft: '8px', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-primary)', fontFamily: 'var(--font-inter)', fontSize: '13px' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              ['this-week', 'This week'],
              ['last-week', 'Last week'],
              ['this-month', 'This month'],
              ['last-month', 'Last month'],
              ['last-3-months', 'Last 3 months'],
              ['all', 'All time'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => applyPreset(key)} style={{ padding: '7px 12px', borderRadius: '6px', border: preset === key ? '1px solid var(--brand-gold)' : '1px solid var(--border-strong)', backgroundColor: preset === key ? 'var(--brand-gold-soft)' : 'var(--surface-raised)', color: preset === key ? 'var(--brand-gold-dark)' : 'var(--text-secondary)', fontFamily: 'var(--font-inter)', fontSize: '13px', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Dish performance</h2>
          {missingSnapshots > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--accent-terracotta)', margin: '0 0 12px' }}>
              {missingSnapshots} item{missingSnapshots === 1 ? '' : 's'} predate dish snapshots and use current menu name fallback.
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setDishSort('portions')} style={{ padding: '7px 12px', borderRadius: '6px', border: dishSort === 'portions' ? '1px solid var(--brand-gold)' : '1px solid var(--border-strong)', backgroundColor: dishSort === 'portions' ? 'var(--brand-gold-soft)' : 'var(--surface-raised)', color: dishSort === 'portions' ? 'var(--brand-gold-dark)' : 'var(--text-secondary)', fontFamily: 'var(--font-inter)', fontSize: '13px', cursor: 'pointer' }}>
              Sort by portions
            </button>
            <button onClick={() => setDishSort('revenue')} style={{ padding: '7px 12px', borderRadius: '6px', border: dishSort === 'revenue' ? '1px solid var(--brand-gold)' : '1px solid var(--border-strong)', backgroundColor: dishSort === 'revenue' ? 'var(--brand-gold-soft)' : 'var(--surface-raised)', color: dishSort === 'revenue' ? 'var(--brand-gold-dark)' : 'var(--text-secondary)', fontFamily: 'var(--font-inter)', fontSize: '13px', cursor: 'pointer' }}>
              Sort by revenue
            </button>
          </div>
          <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-sunken)' }}>
                  {['Dish', 'Portions', 'Vegetarian', 'Meat', 'Revenue'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dishSort === 'revenue' ? dishRowsByRevenue : dishRows).map(row => (
                  <tr key={row.name} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)' }}>{row.name}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-primary)' }}>{row.portions}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{row.vegetarian}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{row.meat}</td>
                    <td style={{ padding: '11px 14px', fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)' }}>{fmt(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 12px' }}>Monthly summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monthlyRows.map(row => (
              <div key={row.month} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1.2fr repeat(4, 1fr)', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--text-primary)', fontSize: '15px' }}>{monthLabel(row.month)}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.orders} orders</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmt(row.revenue)} revenue</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmt(row.paid)} paid</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.customers} customers</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 12px' }}>Revenue by delivery zone</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {zoneRows.map(row => (
              <div key={row.zone} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1.5fr .7fr .9fr .9fr', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--text-primary)', fontSize: '15px' }}>Zone {row.zone} · {ZONE_NAMES[row.zone]}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.orders} orders</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmt(row.revenue)}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>AOV {fmt(row.revenue / row.orders)}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 12px' }}>Repeat customers</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', flex: '1 1 180px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Unique customers ever</div>
              <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '24px', color: 'var(--text-primary)' }}>{repeatStats.total}</div>
            </div>
            <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', flex: '1 1 180px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Customers with 2+ orders</div>
              <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '24px', color: 'var(--text-primary)' }}>{repeatStats.repeatCount} · {repeatStats.repeatRate}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {repeatStats.top.map(row => (
              <div key={row.phone} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', display: 'grid', gridTemplateColumns: '1.2fr 1fr .6fr .8fr .8fr', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{row.name}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{row.phone}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{row.orders} orders</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{fmt(row.spent)}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{dateLabel(row.last)}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 12px' }}>Weekend vs midweek</h2>
          {cycleRows.find(row => row.cycle === 'midweek') ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {cycleRows.map(row => (
                <div key={row.cycle} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 20px' }}>
                  <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'capitalize' }}>{row.cycle}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{row.orders} orders</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{fmt(row.revenue)} revenue</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>AOV {fmt(row.revenue / row.orders)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>No midweek orders in this period yet.</p>
          )}
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 12px' }}>Protein upgrade performance</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {addonRows.map(row => (
              <div key={row.name} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1.4fr .8fr .8fr .8fr', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--text-primary)', fontSize: '15px' }}>{row.name}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.quantity} ordered</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fmt(row.revenue)}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.attachRate}% attach</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
