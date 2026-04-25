/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ── Week boundary logic (same as Kitchen) ────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentOrder = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  delivery_zone: number
  subtotal: number
  delivery_fee: number
  total_amount: number
  payment_status: string
  mpesa_code: string | null
  paid_at: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPaidAt(ts: string): string {
  const d = new Date(ts)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
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

const tdStyle: React.CSSProperties = {
  padding: '11px 16px',
  fontSize: '13px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-inter)',
  verticalAlign: 'middle',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaymentsClient() {
  const [baseWeek] = useState(() => getWeekBounds(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<PaymentOrder[]>([])

  const weekBounds = useMemo(
    () => (weekOffset === 0 ? baseWeek : shiftWeek(baseWeek, weekOffset)),
    [weekOffset, baseWeek]
  )

  useEffect(() => {
    let active = true
    setLoading(true)

    async function load() {
      const { data } = await (supabase.from('orders') as any)
        .select('id, order_ref, customer_name, customer_phone, delivery_zone, subtotal, delivery_fee, total_amount, payment_status, mpesa_code, paid_at')
        .gte('created_at', weekBounds.start.toISOString())
        .lt('created_at', weekBounds.end.toISOString())

      if (!active) return
      setOrders(data || [])
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [weekBounds])

  const paidOrders = useMemo(() =>
    orders
      .filter(o => o.payment_status === 'paid' && o.mpesa_code)
      .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime()),
    [orders]
  )

  const totalFoodSubtotal = paidOrders.reduce((s, o) => s + o.subtotal, 0)
  const totalDeliveryFees = paidOrders.reduce((s, o) => s + o.delivery_fee, 0)
  const totalCollected = paidOrders.reduce((s, o) => s + o.total_amount, 0)
  const unpaidCount = orders.filter(o => o.payment_status !== 'paid').length

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        [data-noprint] { }
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

          {/* Header — hidden when printing */}
          <div data-noprint="">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '28px',
                color: 'var(--text-primary)',
                margin: 0,
                flex: '1',
              }}>
                Payments
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
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: 0, marginBottom: '28px' }}>
              {weekLabel(weekBounds)}
            </p>

            {/* Summary bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <StatCard label="Paid orders" value={String(paidOrders.length)} />
              <StatCard label="Collected" value={`Ksh ${totalCollected.toLocaleString()}`} />
              <StatCard label="Unpaid" value={String(unpaidCount)} alert={unpaidCount > 0} />
            </div>
          </div>

          {/* Print-only heading */}
          <div data-printonly="">
            <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Mali&apos;s Meals — Payments
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
              {weekLabel(weekBounds)}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : paidOrders.length === 0 ? (
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No paid orders this week.</p>
          ) : (
            <div style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                    {['Date paid', 'Order ref', 'Customer', 'Phone', 'Zone', 'Food total', 'Delivery', 'Total', 'M-Pesa code'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: '600',
                        fontFamily: 'var(--font-inter)',
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paidOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtPaidAt(order.paid_at!)}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-fraunces)', fontSize: '14px' }}>
                        {order.order_ref}
                      </td>
                      <td style={tdStyle}>{order.customer_name}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{order.customer_phone}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>Zone {order.delivery_zone}</td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-fraunces)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                        Ksh {order.subtotal.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        Ksh {order.delivery_fee.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-fraunces)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                        Ksh {order.total_amount.toLocaleString()}
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
                      Ksh {totalFoodSubtotal.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-inter)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      Ksh {totalDeliveryFees.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-fraunces)', fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      Ksh {totalCollected.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

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
      <div style={{
        fontSize: '12px',
        color: 'var(--text-tertiary)',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        fontWeight: '600',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-fraunces)',
        fontSize: '24px',
        color: alert ? 'var(--accent-terracotta)' : 'var(--text-primary)',
      }}>
        {value}
      </div>
    </div>
  )
}
