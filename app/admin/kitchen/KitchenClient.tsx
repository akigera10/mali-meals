/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Week boundary logic ──────────────────────────────────────────────────────

function getWeekBounds(now: Date): { start: Date; end: Date } {
  const day = now.getDay()
  const hour = now.getHours()
  let daysSince = (day - 5 + 7) % 7
  if (day === 5 && hour < 14) daysSince = 7
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
  const f = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${f(bounds.start)} 2pm — ${f(bounds.end)} 2pm`
}

function deliveryDate(weekStart: Date, day: 'sunday' | 'monday'): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + (day === 'sunday' ? 2 : 3))
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RawOrder = {
  id: string
  order_ref: string
  order_status: string
  delivery_day: string
  delivery_zone: number
  total_amount: number
  customer_name: string
}

type RawItem = {
  order_id: string
  quantity: number
  variant: string
  meat_type: string | null
  menu_items: { name: string; category: string; meat_upgrade_type: string | null } | null
  order_item_addons: { quantity: number; protein_addons: { name: string } | null }[]
}

type RawSpecial = {
  order_id: string
  quantity: number
  specials: { name: string } | null
}

type DishBlock = {
  name: string
  variants: { variant: string; qty: number }[]
  total: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ZONE_NAMES: Record<number, string> = {
  1: 'Lavington, Kilimani, Kileleshwa, Hurlingham',
  2: 'Riverside, Westlands, Parklands, Peponi',
  3: 'Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga',
  4: 'Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function variantLabel(item: RawItem): string {
  if (item.variant === 'vegetarian') return 'Vegetarian'
  const t = item.meat_type || item.menu_items?.meat_upgrade_type
  if (t === 'beef') return 'With beef'
  if (t === 'chicken') return 'With chicken'
  return 'With meat'
}

function fmt(n: number) {
  return `Ksh ${n.toLocaleString()}`
}

function dayStats(orders: RawOrder[], day: 'sunday' | 'monday') {
  const dayOrders = orders.filter(o => o.delivery_day === day)
  return {
    total: dayOrders.length,
    revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0),
    unconfirmed: dayOrders.filter(o => o.order_status === 'new').length,
    confirmed: dayOrders.filter(o => o.order_status === 'confirmed').length,
  }
}

function buildDishBlocks(items: RawItem[], category: string): DishBlock[] {
  const dishMap: Record<string, Record<string, number>> = {}
  for (const item of items) {
    if (item.menu_items?.category !== category) continue
    const name = item.menu_items?.name ?? 'Unknown'
    const variant = variantLabel(item)
    if (!dishMap[name]) dishMap[name] = {}
    dishMap[name][variant] = (dishMap[name][variant] ?? 0) + item.quantity
  }
  return Object.entries(dishMap)
    .map(([name, variants]) => ({
      name,
      variants: Object.entries(variants).map(([variant, qty]) => ({ variant, qty })),
      total: Object.values(variants).reduce((s, q) => s + q, 0),
    }))
    .sort((a, b) => b.total - a.total)
}

// ── Shared style ──────────────────────────────────────────────────────────────

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

// ── Dots visualization ────────────────────────────────────────────────────────

function Dots({ qty }: { qty: number }) {
  const filled = Math.min(qty, 5)
  const empty = 5 - filled
  return (
    <span style={{ fontSize: '14px', letterSpacing: '2px' }}>
      <span style={{ color: 'var(--brand-gold)' }}>{'●'.repeat(filled)}</span>
      <span style={{ color: 'var(--border-strong)' }}>{'○'.repeat(empty)}</span>
    </span>
  )
}

// ── Day card ──────────────────────────────────────────────────────────────────

function DayCard({
  dateLabel, total, revenue, unconfirmed, confirmed, active, onClick,
}: {
  dateLabel: string; total: number; revenue: number
  unconfirmed: number; confirmed: number; active: boolean; onClick: () => void
}) {
  return (
    <div
      role="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: '200px',
        backgroundColor: active ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
        border: `2px solid ${active ? 'var(--brand-gold)' : 'var(--border)'}`,
        borderRadius: '10px',
        padding: '20px 22px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '17px', color: 'var(--text-primary)', marginBottom: '12px' }}>
        {dateLabel}
      </div>
      <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '28px', color: 'var(--brand-gold)', lineHeight: 1, marginBottom: '4px' }}>
        {total}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
        {total === 1 ? 'order' : 'orders'} · {fmt(revenue)}
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {unconfirmed > 0 && (
          <span style={{ fontSize: '13px', color: 'var(--brand-gold)', fontWeight: '500' }}>
            {unconfirmed} unconfirmed
          </span>
        )}
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {confirmed} confirmed
        </span>
      </div>
    </div>
  )
}

// ── Dish section (mains / salads) ─────────────────────────────────────────────

function DishSection({ heading, blocks, totalPortions }: {
  heading: string; blocks: DishBlock[]; totalPortions: number
}) {
  if (blocks.length === 0) return null
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>
          {heading}
        </h2>
        <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          {totalPortions} portions
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blocks.map(dish => (
          <div
            key={dish.name}
            style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)' }}>
                {dish.name}
              </span>
              <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-tertiary)' }}>
                {dish.total} total
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {dish.variants.map(({ variant, qty }) => (
                <div
                  key={variant}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', width: '130px', flexShrink: 0 }}>
                    {variant}
                  </span>
                  <Dots qty={qty} />
                  <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)', minWidth: '24px' }}>
                    {qty}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '10px', fontStyle: 'italic' }}>
        Total {heading.toLowerCase()}: {totalPortions} portions across {blocks.length} {blocks.length === 1 ? 'dish' : 'dishes'}
      </div>
    </div>
  )
}

// ── Simple count section (specials / add-ons) ─────────────────────────────────

function CountSection({ heading, rows }: { heading: string; rows: [string, number][] }) {
  if (rows.length === 0) return null
  return (
    <div style={{ marginBottom: '36px' }}>
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
        {heading}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(([name, qty]) => (
          <div
            key={name}
            style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)' }}>
              {name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Dots qty={qty} />
              <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'right' }}>
                {qty}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KitchenClient() {
  const [baseWeek] = useState(() => getWeekBounds(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<RawOrder[]>([])
  const [items, setItems] = useState<RawItem[]>([])
  const [rawSpecials, setRawSpecials] = useState<RawSpecial[]>([])
  const [selectedDay, setSelectedDay] = useState<'sunday' | 'monday'>('sunday')
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())

  const weekBounds = useMemo(
    () => weekOffset === 0 ? baseWeek : shiftWeek(baseWeek, weekOffset),
    [weekOffset, baseWeek]
  )

  useEffect(() => {
    let active = true
    setLoading(true)

    async function load() {
      const { data: ordersData } = await (supabase.from('orders') as any)
        .select('id, order_ref, order_status, delivery_day, delivery_zone, total_amount, customer_name')
        .gte('created_at', weekBounds.start.toISOString())
        .lt('created_at', weekBounds.end.toISOString())

      if (!active) return

      const rows: any[] = ordersData || []
      const fetchedOrders: RawOrder[] = rows.map((o: any) => ({
        id: o.id,
        order_ref: o.order_ref,
        order_status: o.order_status,
        delivery_day: o.delivery_day,
        delivery_zone: o.delivery_zone,
        total_amount: o.total_amount,
        customer_name: o.customer_name,
      }))

      let fetchedItems: RawItem[] = []
      let fetchedSpecials: RawSpecial[] = []

      if (rows.length > 0) {
        const orderIds = rows.map((o: any) => o.id)
        const [{ data: itemsData }, { data: specialsData }] = await Promise.all([
          (supabase.from('order_items') as any)
            .select('order_id, quantity, variant, meat_type, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, protein_addons(name))')
            .in('order_id', orderIds),
          (supabase.from('order_specials') as any)
            .select('order_id, quantity, specials(name)')
            .in('order_id', orderIds),
        ])
        fetchedItems = (itemsData || []).map((item: any) => ({
          order_id: item.order_id,
          quantity: item.quantity,
          variant: item.variant,
          meat_type: item.meat_type ?? null,
          menu_items: item.menu_items,
          order_item_addons: item.order_item_addons || [],
        }))
        fetchedSpecials = (specialsData || []).map((s: any) => ({
          order_id: s.order_id,
          quantity: s.quantity,
          specials: s.specials,
        }))
      }

      setOrders(fetchedOrders)
      setItems(fetchedItems)
      setRawSpecials(fetchedSpecials)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [weekBounds])

  // ── Day stats ───────────────────────────────────────────────────────────────

  const sunStats = useMemo(() => dayStats(orders, 'sunday'), [orders])
  const monStats = useMemo(() => dayStats(orders, 'monday'), [orders])

  // ── Filtered items for selected day ─────────────────────────────────────────

  const selectedDayOrderIds = useMemo(
    () => new Set(orders.filter(o => o.delivery_day === selectedDay).map(o => o.id)),
    [orders, selectedDay]
  )

  const filteredItems = useMemo(
    () => items.filter(item => selectedDayOrderIds.has(item.order_id)),
    [items, selectedDayOrderIds]
  )

  const filteredSpecials = useMemo(
    () => rawSpecials.filter(s => selectedDayOrderIds.has(s.order_id)),
    [rawSpecials, selectedDayOrderIds]
  )

  // ── Dish blocks ─────────────────────────────────────────────────────────────

  const mainBlocks = useMemo(() => buildDishBlocks(filteredItems, 'mains'), [filteredItems])
  const saladBlocks = useMemo(() => buildDishBlocks(filteredItems, 'salads'), [filteredItems])
  const mainPortions = useMemo(() => mainBlocks.reduce((s, d) => s + d.total, 0), [mainBlocks])
  const saladPortions = useMemo(() => saladBlocks.reduce((s, d) => s + d.total, 0), [saladBlocks])

  const specialGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of filteredSpecials) {
      const name = s.specials?.name ?? 'Unknown'
      map[name] = (map[name] ?? 0) + s.quantity
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filteredSpecials])

  const addonGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of filteredItems) {
      for (const addon of item.order_item_addons || []) {
        const name = addon.protein_addons?.name ?? 'Unknown add-on'
        map[name] = (map[name] ?? 0) + addon.quantity
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filteredItems])

  // ── Unconfirmed orders (all week) ───────────────────────────────────────────

  const unconfirmedOrders = useMemo(
    () => orders.filter(o => o.order_status === 'new'),
    [orders]
  )

  async function confirmOrder(orderId: string) {
    setConfirmingIds(s => new Set(s).add(orderId))
    await (supabase.from('orders') as any)
      .update({ order_status: 'confirmed' })
      .eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: 'confirmed' } : o))
    setConfirmingIds(s => { const next = new Set(s); next.delete(orderId); return next })
  }

  // ── Date labels ─────────────────────────────────────────────────────────────

  const sunLabel = deliveryDate(weekBounds.start, 'sunday')
  const monLabel = deliveryDate(weekBounds.start, 'monday')
  const selectedDateLabel = selectedDay === 'sunday' ? sunLabel : monLabel

  const hasContent = mainBlocks.length > 0 || saladBlocks.length > 0 || specialGroups.length > 0 || addonGroups.length > 0

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        [data-printonly] { display: none; }
        @media print {
          nav { display: none !important; }
          [data-noprint] { display: none !important; }
          [data-printonly] { display: block !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      ` }} />

      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>

          {/* ── Header + week nav ── */}
          <div data-noprint="">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '28px', color: 'var(--text-primary)', margin: 0, flex: '1' }}>
                Kitchen
              </h1>
              <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle} aria-label="Previous week">←</button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, fontSize: '12px', padding: '5px 10px' }}>
                  This week
                </button>
              )}
              <button onClick={() => setWeekOffset(w => w + 1)} style={navBtnStyle} aria-label="Next week">→</button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--surface-raised)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Print
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: '0 0 28px 0' }}>
              {weekLabel(weekBounds)}
            </p>
          </div>

          {/* ── Print-only header ── */}
          <div data-printonly="">
            <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mali&apos;s Meals — Kitchen Prep Sheet
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
              {selectedDateLabel}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
              {weekLabel(weekBounds)}
            </div>
          </div>

          {loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : (
            <>
              {/* ── Section 1: Day cards ── */}
              <div data-noprint="" style={{ display: 'flex', gap: '12px', marginBottom: '36px', flexWrap: 'wrap' }}>
                <DayCard
                  dateLabel={sunLabel}
                  total={sunStats.total}
                  revenue={sunStats.revenue}
                  unconfirmed={sunStats.unconfirmed}
                  confirmed={sunStats.confirmed}
                  active={selectedDay === 'sunday'}
                  onClick={() => setSelectedDay('sunday')}
                />
                <DayCard
                  dateLabel={monLabel}
                  total={monStats.total}
                  revenue={monStats.revenue}
                  unconfirmed={monStats.unconfirmed}
                  confirmed={monStats.confirmed}
                  active={selectedDay === 'monday'}
                  onClick={() => setSelectedDay('monday')}
                />
              </div>

              {/* ── Section 2: Cooking summary ── */}
              <section style={{ marginBottom: '48px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: '24px',
                }}>
                  Cooking summary · {selectedDateLabel}
                </div>

                {!hasContent ? (
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No orders for this day.</p>
                ) : (
                  <>
                    <DishSection heading="MAINS" blocks={mainBlocks} totalPortions={mainPortions} />
                    <DishSection heading="SALADS" blocks={saladBlocks} totalPortions={saladPortions} />
                    <CountSection heading="CHEF'S SPECIAL" rows={specialGroups} />
                    <CountSection heading="PROTEIN ADD-ONS" rows={addonGroups} />
                  </>
                )}
              </section>

              {/* ── Section 3: Unconfirmed orders (screen only) ── */}
              {unconfirmedOrders.length > 0 && (
                <section data-noprint="">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                    <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '20px', color: 'var(--accent-terracotta)', margin: 0 }}>
                      Unconfirmed orders
                    </h2>
                    <span style={{ fontSize: '14px', color: 'var(--accent-terracotta)', fontWeight: '500' }}>
                      {unconfirmedOrders.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {unconfirmedOrders.map(order => (
                      <div
                        key={order.id}
                        style={{
                          backgroundColor: 'var(--surface-raised)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Link
                          href={`/admin/orders/${order.id}`}
                          style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--brand-gold)', textDecoration: 'none', minWidth: '80px' }}
                        >
                          {order.order_ref}
                        </Link>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1, minWidth: '120px' }}>
                          {order.customer_name}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                          Zone {order.delivery_zone}
                          {ZONE_NAMES[order.delivery_zone] ? ` — ${ZONE_NAMES[order.delivery_zone].split(',')[0]}` : ''}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                          {order.delivery_day === 'sunday' ? 'Sunday' : 'Monday'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {fmt(order.total_amount)}
                        </span>
                        <button
                          onClick={() => confirmOrder(order.id)}
                          disabled={confirmingIds.has(order.id)}
                          style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            border: '1px solid var(--brand-gold)',
                            backgroundColor: 'transparent',
                            color: 'var(--brand-gold)',
                            fontSize: '13px',
                            fontFamily: 'var(--font-inter)',
                            fontWeight: '500',
                            cursor: confirmingIds.has(order.id) ? 'not-allowed' : 'pointer',
                            opacity: confirmingIds.has(order.id) ? 0.5 : 1,
                          }}
                        >
                          {confirmingIds.has(order.id) ? 'Confirming…' : 'Confirm'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}
