/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type PaidOrder = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  delivery_zone: number
  subtotal: number
  delivery_fee: number
  total_amount: number
  mpesa_code: string
  paid_at: string
}

type UnpaidOrder = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  total_amount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtPaidAt(ts: string): string {
  const d = new Date(ts)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

function fmt(n: number) {
  return n.toLocaleString()
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

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: '600',
  fontFamily: 'var(--font-inter)',
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 16px',
  fontSize: '13px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-inter)',
  verticalAlign: 'middle',
}

function StatCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 20px', minWidth: '160px', flex: '1' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '24px', color: alert ? 'var(--accent-terracotta)' : 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaymentsClient() {
  const [allDates, setAllDates] = useState<string[]>([])
  const [dateIdx, setDateIdx] = useState(0)
  const [datesLoaded, setDatesLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([])
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([])

  // Load distinct delivery dates on mount
  useEffect(() => {
    async function loadDates() {
      const res = await fetch('/api/admin/payments-data')
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
      const res = await fetch(`/api/admin/payments-data?date=${selectedDate}`)
      if (!active) return
      const { paid, unpaid } = await res.json()
      setPaidOrders(paid ?? [])
      setUnpaidOrders(unpaid ?? [])
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [selectedDate])

  const totalFoodSubtotal = paidOrders.reduce((s, o) => s + o.subtotal, 0)
  const totalDeliveryFees  = paidOrders.reduce((s, o) => s + o.delivery_fee, 0)
  const totalCollected     = paidOrders.reduce((s, o) => s + o.total_amount, 0)

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
        }
      ` }} />

      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>

          {/* Header */}
          <div data-noprint="">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '28px', color: 'var(--text-primary)', margin: 0, flex: '1' }}>
                Payments
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
            <p style={{ fontSize: '15px', fontFamily: 'var(--font-fraunces)', color: 'var(--text-primary)', marginTop: 0, marginBottom: '28px' }}>
              {datesLoaded && allDates.length === 0 ? 'No delivery dates found' : selectedDateLabel}
            </p>

            {/* Summary bar */}
            {datesLoaded && allDates.length > 0 && !loading && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <StatCard label="Paid orders" value={String(paidOrders.length)} />
                <StatCard label="Collected" value={totalCollected.toLocaleString()} />
                <StatCard label="Outstanding" value={String(unpaidOrders.length)} alert={unpaidOrders.length > 0} />
              </div>
            )}
          </div>

          {/* Print-only heading */}
          <div data-printonly="">
            <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mali&apos;s Meals — Payments
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

              {/* ── Outstanding payments ── */}
              {unpaidOrders.length > 0 && (
                <section>
                  <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '20px', color: 'var(--accent-terracotta)', margin: '0 0 16px 0' }}>
                    Outstanding payments
                  </h2>
                  <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                          {['Order ref', 'Customer', 'Phone', 'Amount due'].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {unpaidOrders.map(order => (
                          <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ ...tdStyle }}>
                              <Link href={`/admin/orders/${order.id}`} style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--brand-gold)', textDecoration: 'none' }}>
                                {order.order_ref}
                              </Link>
                            </td>
                            <td style={tdStyle}>{order.customer_name}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{order.customer_phone}</td>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-fraunces)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                              {fmt(order.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border-strong)', backgroundColor: 'var(--surface-sunken)' }}>
                          <td colSpan={3} style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-inter)', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {unpaidOrders.length} order{unpaidOrders.length !== 1 ? 's' : ''} outstanding
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--accent-terracotta)', whiteSpace: 'nowrap' }}>
                            {fmt(unpaidOrders.reduce((s, o) => s + o.total_amount, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}

              {/* ── Paid orders reconciliation ── */}
              <section>
                <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
                  Paid orders
                </h2>
                {paidOrders.length === 0 ? (
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No paid orders for this date.</p>
                ) : (
                  <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                          {['Date paid', 'Order ref', 'Customer', 'Phone', 'Zone', 'Food total', 'Delivery', 'Total', 'M-Pesa code'].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paidOrders.map(order => (
                          <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {fmtPaidAt(order.paid_at)}
                            </td>
                            <td style={{ ...tdStyle }}>
                              <Link href={`/admin/orders/${order.id}`} style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--brand-gold)', textDecoration: 'none' }}>
                                {order.order_ref}
                              </Link>
                            </td>
                            <td style={tdStyle}>{order.customer_name}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{order.customer_phone}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>Zone {order.delivery_zone}</td>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-fraunces)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                              {order.subtotal.toLocaleString()}
                            </td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {order.delivery_fee.toLocaleString()}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-fraunces)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                              {order.total_amount.toLocaleString()}
                            </td>
                            <td style={{ ...tdStyle, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                              {order.mpesa_code}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border-strong)', backgroundColor: 'var(--surface-sunken)' }}>
                          <td colSpan={5} style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-inter)', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {paidOrders.length} order{paidOrders.length !== 1 ? 's' : ''}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {totalFoodSubtotal.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-inter)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {totalDeliveryFees.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {totalCollected.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px' }} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>

            </div>
          )}

        </div>
      </div>
    </>
  )
}
