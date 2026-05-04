/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

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

// ── Shared styles ─────────────────────────────────────────────────────────────

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

// ── Dish section ──────────────────────────────────────────────────────────────

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
          <div key={dish.name} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)' }}>{dish.name}</span>
              <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-tertiary)' }}>{dish.total} total</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {dish.variants.map(({ variant, qty }) => (
                <div key={variant} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', width: '130px', flexShrink: 0 }}>{variant}</span>
                  <Dots qty={qty} />
                  <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)', minWidth: '24px' }}>{qty}</span>
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

function CountSection({ heading, rows }: { heading: string; rows: [string, number][] }) {
  if (rows.length === 0) return null
  return (
    <div style={{ marginBottom: '36px' }}>
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
        {heading}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(([name, qty]) => (
          <div key={name} style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)' }}>{name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Dots qty={qty} />
              <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'right' }}>{qty}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KitchenClient() {
  const [allDates, setAllDates] = useState<string[]>([])
  const [dateIdx, setDateIdx] = useState(0)
  const [datesLoaded, setDatesLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<RawOrder[]>([])
  const [items, setItems] = useState<RawItem[]>([])
  const [rawSpecials, setRawSpecials] = useState<RawSpecial[]>([])
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())

  // Load distinct delivery dates on mount
  useEffect(() => {
    async function loadDates() {
      const { data } = await (supabase.from('orders') as any)
        .select('delivery_date')
        .not('delivery_date', 'is', null)
        .order('delivery_date', { ascending: true })

      const unique: string[] = Array.from(new Set((data || []).map((r: any) => r.delivery_date as string)))
      setAllDates(unique)

      const today = new Date().toISOString().slice(0, 10)
      const idx = unique.findIndex(d => d >= today)
      setDateIdx(idx === -1 ? Math.max(0, unique.length - 1) : idx)
      setDatesLoaded(true)
    }
    loadDates()
  }, [])

  const selectedDate = allDates[dateIdx] ?? null

  // Load orders for selected delivery date
  useEffect(() => {
    if (!selectedDate) return
    let active = true
    setLoading(true)

    async function load() {
      const { data: ordersData } = await (supabase.from('orders') as any)
        .select('id, order_ref, order_status, delivery_day, delivery_zone, total_amount, customer_name')
        .eq('delivery_date', selectedDate)

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
  }, [selectedDate])

  // ── Dish blocks ─────────────────────────────────────────────────────────────

  const mainBlocks = useMemo(() => buildDishBlocks(items, 'mains'), [items])
  const saladBlocks = useMemo(() => buildDishBlocks(items, 'salads'), [items])
  const mainPortions = useMemo(() => mainBlocks.reduce((s, d) => s + d.total, 0), [mainBlocks])
  const saladPortions = useMemo(() => saladBlocks.reduce((s, d) => s + d.total, 0), [saladBlocks])

  const specialGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of rawSpecials) {
      const name = s.specials?.name ?? 'Unknown'
      map[name] = (map[name] ?? 0) + s.quantity
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [rawSpecials])

  const addonGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      for (const addon of item.order_item_addons || []) {
        const name = addon.protein_addons?.name ?? 'Unknown add-on'
        map[name] = (map[name] ?? 0) + addon.quantity
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items])

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

  const selectedDateLabel = selectedDate ? fmtDate(selectedDate) : '—'
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

          {/* ── Header + date nav ── */}
          <div data-noprint="">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '28px', color: 'var(--text-primary)', margin: 0, flex: '1' }}>
                Kitchen
              </h1>
              <button
                onClick={() => setDateIdx(i => i - 1)}
                disabled={dateIdx <= 0}
                style={{ ...navBtnStyle, opacity: dateIdx <= 0 ? 0.4 : 1 }}
                aria-label="Previous date"
              >←</button>
              <button
                onClick={() => setDateIdx(i => i + 1)}
                disabled={dateIdx >= allDates.length - 1}
                style={{ ...navBtnStyle, opacity: dateIdx >= allDates.length - 1 ? 0.4 : 1 }}
                aria-label="Next date"
              >→</button>
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
            <p style={{ fontSize: '15px', fontFamily: 'var(--font-fraunces)', color: 'var(--text-primary)', margin: '0 0 28px 0' }}>
              {datesLoaded && allDates.length === 0 ? 'No delivery dates found' : selectedDateLabel}
            </p>
          </div>

          {/* ── Print-only header ── */}
          <div data-printonly="">
            <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mali&apos;s Meals — Kitchen Prep Sheet
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              {selectedDateLabel}
            </div>
          </div>

          {!datesLoaded ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : allDates.length === 0 ? (
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              No orders with delivery dates yet. Orders placed with the new system will appear here.
            </p>
          ) : loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : (
            <>
              {/* ── Stats bar ── */}
              <div data-noprint="" style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--brand-gold)', fontFamily: 'var(--font-fraunces)', fontSize: '18px' }}>{orders.length}</strong>
                  {' '}order{orders.length !== 1 ? 's' : ''}
                  {' · '}Ksh {orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}
                </span>
                {unconfirmedOrders.length > 0 && (
                  <span style={{ fontSize: '14px', color: 'var(--accent-terracotta)', fontWeight: '500' }}>
                    {unconfirmedOrders.length} unconfirmed
                  </span>
                )}
              </div>

              {/* ── Cooking summary ── */}
              <section style={{ marginBottom: '48px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '24px' }}>
                  Cooking summary · {selectedDateLabel}
                </div>

                {!hasContent ? (
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No orders for this date.</p>
                ) : (
                  <>
                    <DishSection heading="MAINS" blocks={mainBlocks} totalPortions={mainPortions} />
                    <DishSection heading="SALADS" blocks={saladBlocks} totalPortions={saladPortions} />
                    <CountSection heading="CHEF'S SPECIAL" rows={specialGroups} />
                    <CountSection heading="PROTEIN ADD-ONS" rows={addonGroups} />
                  </>
                )}
              </section>

              {/* ── Unconfirmed orders ── */}
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
                        style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                      >
                        <Link href={`/admin/orders/${order.id}`} style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--brand-gold)', textDecoration: 'none', minWidth: '80px' }}>
                          {order.order_ref}
                        </Link>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1, minWidth: '120px' }}>
                          {order.customer_name}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                          Zone {order.delivery_zone}
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
