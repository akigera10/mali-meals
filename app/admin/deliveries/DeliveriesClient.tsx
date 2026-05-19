/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

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

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmt(n: number) {
  return n.toLocaleString()
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

// ── Shared style tokens ───────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--surface-raised)',
  color: 'var(--text-primary)',
  fontSize: '16px',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  lineHeight: 1,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeliveriesClient() {
  const [allDates, setAllDates] = useState<string[]>([])
  const [dateIdx, setDateIdx] = useState(0)
  const [datesLoaded, setDatesLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<DeliveryOrder[]>([])

  // Load distinct delivery dates on mount
  useEffect(() => {
    async function loadDates() {
      const res = await fetch('/api/admin/deliveries-data')
      const { dates } = await res.json()
      const unique: string[] = dates ?? []
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
      const res = await fetch(`/api/admin/deliveries-data?date=${selectedDate}`)
      if (!active) return
      const { orders: data } = await res.json()
      setOrders(data ?? [])
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [selectedDate])

  // Group by zone
  const zones = useMemo(() => {
    const groups: Record<number, DeliveryOrder[]> = {}
    for (const order of orders) {
      if (!groups[order.delivery_zone]) groups[order.delivery_zone] = []
      groups[order.delivery_zone].push(order)
    }
    return Object.entries(groups)
      .map(([z, list]) => ({ zone: Number(z), orders: list }))
      .sort((a, b) => a.zone - b.zone)
  }, [orders])

  const selectedDateLabel = selectedDate ? fmtDate(selectedDate) : '—'

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

      <div style={{ fontFamily: 'var(--font-ui)' }}>
        <div data-admin-page-shell style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '960px', margin: '0 auto', padding: '32px 56px', boxSizing: 'border-box', fontFamily: 'var(--font-ui), sans-serif', fontSize: 15, color: 'var(--text-primary)' }}>

          {/* ── Header row ── */}
          <div data-noprint="">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 24px', flex: '1' }}>
                Deliveries
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
              {selectedDate && (
                <Link
                  href={`/admin/packing-slips?date=${selectedDate}`}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-ui)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Packing slips
                </Link>
              )}
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
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Print
              </button>
            </div>

            <p style={{ fontSize: '15px', fontFamily: 'var(--font-instrument-serif)', color: 'var(--text-primary)', margin: '0 0 28px 0' }}>
              {datesLoaded && allDates.length === 0 ? 'No delivery dates found' : selectedDateLabel}
            </p>
          </div>

          {/* ── Print-only header ── */}
          <div data-printonly="">
            <div style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mali&apos;s Meals — Delivery Manifest
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              {selectedDateLabel}
            </div>
          </div>

          {/* ── Main content ── */}
          {!datesLoaded ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : allDates.length === 0 ? (
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              No orders with delivery dates yet. Orders placed with the new system will appear here.
            </p>
          ) : loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : zones.length === 0 ? (
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No orders for this date.</p>
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
                      <h3 style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '17px', color: 'var(--text-primary)', margin: 0 }}>
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
                          style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}
                        >
                          {/* Row 1: ref, name, phone, amount */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                              <Link href={`/admin/orders/${order.id}`} style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '15px', color: 'var(--brand-green)', textDecoration: 'none' }}>
                                {order.order_ref}
                              </Link>
                              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{order.customer_name}</span>
                              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{order.customer_phone}</span>
                            </div>
                            <span style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '15px', color: 'var(--text-primary)' }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
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
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', backgroundColor: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
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
