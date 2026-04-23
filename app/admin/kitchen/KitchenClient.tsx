/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ── Week boundary logic ──────────────────────────────────────────────────────

function getWeekBounds(now: Date): { start: Date; end: Date } {
  const day = now.getDay() // 0=Sun … 5=Fri … 6=Sat
  const hour = now.getHours()
  // How many days since last Friday 2pm?
  let daysSince = (day - 5 + 7) % 7
  if (day === 5 && hour < 14) daysSince = 7 // Friday before 2pm → still previous week
  const start = new Date(now)
  start.setDate(now.getDate() - daysSince)
  start.setHours(14, 0, 0, 0)
  start.setMilliseconds(0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end }
}

function shiftWeek(base: { start: Date; end: Date }, offset: number): { start: Date; end: Date } {
  const start = new Date(base.start)
  start.setDate(start.getDate() + offset * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end }
}

function weekLabel(bounds: { start: Date; end: Date }): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${fmt(bounds.start)} 2pm — ${fmt(bounds.end)} 2pm`
}

// ── Types ────────────────────────────────────────────────────────────────────

type RawOrder = {
  id: string
  delivery_day: string
  subtotal: number
  delivery_fee: number
  total_amount: number
  payment_status: string
}

type RawItem = {
  order_id: string
  quantity: number
  variant: string
  meat_type: string | null
  menu_items: { name: string; meat_upgrade_type: string | null } | null
  order_item_addons: {
    quantity: number
    protein_addons: { name: string } | null
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function variantLabel(item: RawItem): string {
  if (item.variant === 'vegetarian') return 'Vegetarian'
  const t = item.meat_type ?? item.menu_items?.meat_upgrade_type
  if (t === 'beef') return 'With beef'
  if (t === 'chicken') return 'With chicken'
  return 'With meat'
}

function fmt(n: number) {
  return `Ksh ${n.toLocaleString()}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface-raised)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px 20px',
      minWidth: '160px',
      flex: '1',
    }}>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-fraunces)',
        fontSize: '24px',
        color: alert ? '#B5533C' : 'var(--text-primary)',
      }}>
        {value}
      </div>
    </div>
  )
}

type DayFilter = 'all' | 'sunday' | 'monday'

// ── Main component ────────────────────────────────────────────────────────────

export default function KitchenClient() {
  const [baseWeek] = useState(() => getWeekBounds(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<RawOrder[]>([])
  const [items, setItems] = useState<RawItem[]>([])
  const [dayFilter, setDayFilter] = useState<DayFilter>('all')

  const weekBounds = useMemo(
    () => (weekOffset === 0 ? baseWeek : shiftWeek(baseWeek, weekOffset)),
    [weekOffset, baseWeek]
  )

  useEffect(() => {
    let active = true
    setLoading(true)

    async function load() {
      const { data: ordersData } = await (supabase.from('orders') as any)
        .select(`
          id, delivery_day, subtotal, delivery_fee, total_amount, payment_status,
          order_items(
            quantity, variant, meat_type,
            menu_items(name, meat_upgrade_type),
            order_item_addons(quantity, protein_addons(name))
          )
        `)
        .gte('created_at', weekBounds.start.toISOString())
        .lt('created_at', weekBounds.end.toISOString())

      if (!active) return

      const rows: any[] = ordersData || []

      const fetchedOrders: RawOrder[] = rows.map((o: any) => ({
        id: o.id,
        delivery_day: o.delivery_day,
        subtotal: o.subtotal,
        delivery_fee: o.delivery_fee,
        total_amount: o.total_amount,
        payment_status: o.payment_status,
      }))

      const fetchedItems: RawItem[] = rows.flatMap((o: any) =>
        (o.order_items || []).map((item: any) => ({
          order_id: o.id,
          quantity: item.quantity,
          variant: item.variant,
          meat_type: item.meat_type,
          menu_items: item.menu_items,
          order_item_addons: item.order_item_addons || [],
        }))
      )

      setOrders(fetchedOrders)
      setItems(fetchedItems)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [weekBounds])

  // ── Filtered views ──────────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    if (dayFilter === 'all') return orders
    return orders.filter(o => o.delivery_day === dayFilter)
  }, [orders, dayFilter])

  const filteredOrderIds = useMemo(
    () => new Set(filteredOrders.map(o => o.id)),
    [filteredOrders]
  )

  const filteredItems = useMemo(
    () => items.filter(item => filteredOrderIds.has(item.order_id)),
    [items, filteredOrderIds]
  )

  // ── Cooking summary ─────────────────────────────────────────────────────────

  // dish groups: { "Pad kra pow · With chicken": 5, ... }
  const dishGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of filteredItems) {
      const name = item.menu_items?.name ?? 'Unknown dish'
      const variant = variantLabel(item)
      const key = `${name} · ${variant}`
      map[key] = (map[key] ?? 0) + item.quantity
    }
    return map
  }, [filteredItems])

  const addonGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of filteredItems) {
      for (const addon of item.order_item_addons || []) {
        const name = addon.protein_addons?.name ?? 'Unknown add-on'
        map[name] = (map[name] ?? 0) + addon.quantity
      }
    }
    return map
  }, [filteredItems])

  // ── Popularity ranking (all days, no filter) ────────────────────────────────

  const popularity = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      const name = item.menu_items?.name ?? 'Unknown dish'
      map[name] = (map[name] ?? 0) + item.quantity
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items])

  // ── Summary bar stats (always full week) ───────────────────────────────────

  const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0)
  const unpaidCount = orders.filter(o => o.payment_status !== 'paid').length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>

        {/* ── Header + week navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <h1 style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '28px',
            color: 'var(--text-primary)',
            margin: 0,
            flex: '1',
          }}>
            Kitchen
          </h1>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={navBtnStyle}
            aria-label="Previous week"
          >
            ←
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{ ...navBtnStyle, fontSize: '12px', padding: '5px 10px' }}
            >
              This week
            </button>
          )}
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            style={navBtnStyle}
            aria-label="Next week"
          >
            →
          </button>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '28px', marginTop: 0 }}>
          {weekLabel(weekBounds)}
        </p>

        {/* ── Summary bar (full week) ── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <StatCard label="Orders" value={String(orders.length)} />
          <StatCard label="Revenue" value={fmt(totalRevenue)} />
          <StatCard label="Unpaid" value={String(unpaidCount)} alert={unpaidCount > 0} />
        </div>

        {loading ? (
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
        ) : orders.length === 0 ? (
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No orders this week.</p>
        ) : (
          <>
            {/* ── Day filter ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {(['all', 'sunday', 'monday'] as DayFilter[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDayFilter(d)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: '1px solid var(--border-strong)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: dayFilter === d ? 'var(--brand-gold)' : 'var(--surface-raised)',
                    color: dayFilter === d ? '#fff' : 'var(--text-secondary)',
                    fontWeight: dayFilter === d ? '500' : '400',
                  }}
                >
                  {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            {/* ── Cooking summary ── */}
            <section style={{ marginBottom: '40px' }}>
              <SectionHeading>Cooking summary</SectionHeading>

              {/* Dishes */}
              <div style={{ marginBottom: '20px' }}>
                <SubHeading>Dishes</SubHeading>
                {Object.keys(dishGroups).length === 0 ? (
                  <Empty>No dishes.</Empty>
                ) : (
                  <SummaryTable rows={Object.entries(dishGroups).sort((a, b) => b[1] - a[1])} />
                )}
              </div>

              {/* Protein add-ons */}
              {Object.keys(addonGroups).length > 0 && (
                <div>
                  <SubHeading>Protein add-ons</SubHeading>
                  <SummaryTable rows={Object.entries(addonGroups).sort((a, b) => b[1] - a[1])} />
                </div>
              )}
            </section>

            {/* ── Popularity ranking (full week, no filter) ── */}
            <section>
              <SectionHeading>Popularity</SectionHeading>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '-8px', marginBottom: '16px' }}>
                All days · dishes ranked by total portions
              </p>
              {popularity.length === 0 ? (
                <Empty>No data.</Empty>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {popularity.map(([name, qty], i) => {
                    const max = popularity[0][1]
                    const pct = Math.round((qty / max) * 100)
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '20px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'right', flexShrink: 0 }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', width: '200px', flexShrink: 0 }}>
                          {name}
                        </span>
                        <div style={{ flex: 1, backgroundColor: 'var(--surface-sunken)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--brand-gold)', borderRadius: '4px' }} />
                        </div>
                        <span style={{ fontSize: '14px', fontFamily: 'var(--font-fraunces)', color: 'var(--text-primary)', width: '32px', textAlign: 'right', flexShrink: 0 }}>
                          {qty}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

// ── Shared micro-components ───────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-fraunces)',
      fontSize: '18px',
      color: 'var(--text-primary)',
      marginBottom: '16px',
      marginTop: 0,
    }}>
      {children}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px',
      fontWeight: '600',
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>{children}</p>
}

function SummaryTable({ rows }: { rows: [string, number][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {rows.map(([label, qty]) => (
        <div key={label} style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '16px',
          alignItems: 'baseline',
          fontSize: '14px',
          padding: '8px 12px',
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
        }}>
          <span style={{ color: 'var(--text-primary)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '16px', color: 'var(--text-primary)' }}>
            × {qty}
          </span>
        </div>
      ))}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--surface-raised)',
  color: 'var(--text-primary)',
  fontSize: '16px',
  cursor: 'pointer',
  fontFamily: 'var(--font-inter)',
  lineHeight: 1,
}
