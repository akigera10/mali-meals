/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Week boundary logic (same as Kitchen / Payments) ──────────────────────────

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
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${fmt(bounds.start)} 2pm — ${fmt(bounds.end)} 2pm`
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ZONE_NAMES: Record<number, string> = {
  1: 'Lavington, Kilimani, Kileleshwa, Hurlingham',
  2: 'Riverside, Westlands, Parklands, Peponi',
  3: 'Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga',
  4: 'Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DeliveryOrder = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  delivery_zone: number
  delivery_day: string
  delivery_window: string | null
  delivery_slot: string | null
  address_building: string | null
  address_street: string | null
  address_apartment: string | null
  address_landmark: string | null
  total_amount: number
  payment_status: string
  order_status: string
  notes: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Ksh ${n.toLocaleString()}`
}

function slotLabel(order: DeliveryOrder): string {
  const w = order.delivery_window
  if (w === 'by_5pm') return 'by 5pm'
  if (w === 'free_5_10pm') return '5–10pm (free)'
  if (w) return w.replace(/^(\d+)_(\d+pm)$/, '$1–$2')
  if (order.delivery_slot) return order.delivery_slot.replace(/^(\d+)_(\d+pm)$/, '$1–$2')
  return '—'
}

function addressLine(order: DeliveryOrder): string {
  return [order.address_building, order.address_street, order.address_apartment]
    .filter(Boolean)
    .join(', ')
}

function deliveryDate(weekStart: Date, day: 'sunday' | 'monday'): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + (day === 'sunday' ? 2 : 3))
  const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const dayNum = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${dayName} ${dayNum}`
}

// ── Shared style tokens ───────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeliveriesClient() {
  const [baseWeek] = useState(() => getWeekBounds(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  // Default to Monday if today is Sunday, otherwise Sunday
  const [selectedDay, setSelectedDay] = useState<'sunday' | 'monday'>(
    () => new Date().getDay() === 0 ? 'monday' : 'sunday'
  )
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<DeliveryOrder[]>([])

  const weekBounds = useMemo(
    () => weekOffset === 0 ? baseWeek : shiftWeek(baseWeek, weekOffset),
    [weekOffset, baseWeek]
  )

  useEffect(() => {
    let active = true
    setLoading(true)

    async function load() {
      const { data } = await (supabase.from('orders') as any)
        .select('id, order_ref, customer_name, customer_phone, delivery_zone, delivery_day, delivery_window, delivery_slot, address_building, address_street, address_apartment, address_landmark, total_amount, payment_status, order_status, notes')
        .gte('created_at', weekBounds.start.toISOString())
        .lt('created_at', weekBounds.end.toISOString())

      if (!active) return
      setOrders(data || [])
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [weekBounds])

  // Filter to selected day then group by zone
  const zones = useMemo(() => {
    const dayOrders = orders.filter(o => o.delivery_day === selectedDay)
    const groups: Record<number, DeliveryOrder[]> = {}
    for (const order of dayOrders) {
      if (!groups[order.delivery_zone]) groups[order.delivery_zone] = []
      groups[order.delivery_zone].push(order)
    }
    return Object.entries(groups)
      .map(([z, list]) => ({ zone: Number(z), orders: list }))
      .sort((a, b) => a.zone - b.zone)
  }, [orders, selectedDay])

  const sunLabel = deliveryDate(weekBounds.start, 'sunday')
  const monLabel = deliveryDate(weekBounds.start, 'monday')
  const selectedDateLabel = selectedDay === 'sunday' ? sunLabel : monLabel

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
          a { color: inherit !important; text-decoration: none !important; }
        }
      ` }} />

      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>

          {/* ── Header row ── */}
          <div data-noprint="">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '28px',
                color: 'var(--text-primary)',
                margin: 0,
                flex: '1',
              }}>
                Deliveries
              </h1>
              <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle} aria-label="Previous week">←</button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  style={{ ...navBtnStyle, fontSize: '12px', padding: '5px 10px' }}
                >
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

            {/* Week label */}
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: '0 0 24px 0' }}>
              {weekLabel(weekBounds)}
            </p>

            {/* Sunday / Monday toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
              {(['sunday', 'monday'] as const).map(day => {
                const label = day === 'sunday' ? sunLabel : monLabel
                const active = selectedDay === day
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '20px',
                      border: `1px solid ${active ? 'var(--brand-gold)' : 'var(--border-strong)'}`,
                      backgroundColor: active ? 'var(--brand-gold)' : 'var(--surface-raised)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      fontSize: '14px',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: active ? '500' : '400',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Print-only header ── */}
          <div data-printonly="">
            <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mali&apos;s Meals — Delivery Manifest
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
              {weekLabel(weekBounds)}
            </div>
          </div>

          {/* ── Delivery date heading (always visible) ── */}
          <h2 style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '22px',
            color: 'var(--text-primary)',
            margin: '0 0 24px 0',
          }}>
            {selectedDateLabel}
          </h2>

          {/* ── Main content ── */}
          {loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : zones.length === 0 ? (
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No orders for this day.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {zones.map(({ zone, orders: zoneOrders }) => {
                const zoneTotal = zoneOrders.reduce((s, o) => s + o.total_amount, 0)
                return (
                  <div key={zone}>
                    {/* Zone heading */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '12px',
                      paddingBottom: '10px',
                      borderBottom: '2px solid var(--border-strong)',
                    }}>
                      <h3 style={{
                        fontFamily: 'var(--font-fraunces)',
                        fontSize: '17px',
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}>
                        Zone {zone} — {ZONE_NAMES[zone]}
                      </h3>
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {zoneOrders.length} order{zoneOrders.length !== 1 ? 's' : ''} · {fmt(zoneTotal)}
                      </span>
                    </div>

                    {/* Orders */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {zoneOrders.map(order => (
                        <div
                          key={order.id}
                          style={{
                            backgroundColor: 'var(--surface-raised)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '14px 16px',
                          }}
                        >
                          {/* Row 1: ref, name, phone, amount */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '6px',
                          }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                              <Link
                                href={`/admin/orders/${order.id}`}
                                style={{
                                  fontFamily: 'var(--font-fraunces)',
                                  fontSize: '15px',
                                  color: 'var(--brand-gold)',
                                  textDecoration: 'none',
                                }}
                              >
                                {order.order_ref}
                              </Link>
                              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                {order.customer_name}
                              </span>
                              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                {order.customer_phone}
                              </span>
                            </div>
                            <span style={{
                              fontFamily: 'var(--font-fraunces)',
                              fontSize: '15px',
                              color: 'var(--text-primary)',
                            }}>
                              {fmt(order.total_amount)}
                            </span>
                          </div>

                          {/* Row 2: address */}
                          {addressLine(order) && (
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                              {addressLine(order)}
                            </div>
                          )}
                          {order.address_landmark && (
                            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                              Near {order.address_landmark}
                            </div>
                          )}

                          {/* Row 3: slot, notes, badges */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '8px',
                            flexWrap: 'wrap',
                          }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginRight: '4px' }}>
                              {slotLabel(order)}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: order.payment_status === 'paid' ? 'var(--accent-forest)' : 'var(--surface-sunken)',
                              color: order.payment_status === 'paid' ? '#fff' : 'var(--text-secondary)',
                            }}>
                              {order.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: 'var(--surface-sunken)',
                              color: 'var(--text-secondary)',
                            }}>
                              {order.order_status}
                            </span>
                            {order.notes && (
                              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginLeft: '4px' }}>
                                {order.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
