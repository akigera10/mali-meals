/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type Order = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_zone: number
  delivery_day: string
  delivery_window: string | null
  delivery_slot: string | null
  delivery_date: string | null
  notes: string | null
  address_building: string | null
  address_street: string | null
  address_apartment: string | null
  address_landmark: string | null
  subtotal: number
  delivery_fee: number
  total_amount: number
  payment_status: string
  order_status: string
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString()
}

function deliveryLabel(order: Order): string {
  const day = order.delivery_day === 'sunday' ? 'Sunday' : 'Monday'
  const w = order.delivery_window
  if (w === 'by_5pm') return `${day} · by 5pm`
  if (w === 'free_5_10pm') return `${day} · 5–10pm (free)`
  if (w) return `${day} · ${w.replace(/^(\d+)_(\d+pm)$/, '$1–$2')}`
  if (order.delivery_slot) return `${day} · ${order.delivery_slot.replace(/^(\d+)_(\d+pm)$/, '$1–$2')}`
  return day
}

function totalAmount(arr: Order[]) {
  return arr.reduce((s, o) => s + o.total_amount, 0)
}

// ── Status card sub-component ─────────────────────────────────────────────────

function StatusCard({
  label,
  count,
  total,
  active,
  onClick,
}: {
  label: string
  count: number
  total: number | null
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      role="button"
      onClick={onClick}
      style={{
        backgroundColor: active ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
        border: `2px solid ${active ? 'var(--brand-gold)' : 'var(--border)'}`,
        borderRadius: '8px',
        padding: '16px 18px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: '8px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-fraunces)',
        fontSize: '28px',
        color: 'var(--brand-gold)',
        lineHeight: 1,
        marginBottom: total !== null ? '4px' : '0',
      }}>
        {count}
      </div>
      {total !== null && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {fmt(total)}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const orders = initialOrders
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('')

  // ── Card stats ──────────────────────────────────────────────────────────────

  const newOrders = useMemo(() => orders.filter(o => o.order_status === 'new'), [orders])
  const confirmedOrders = useMemo(() => orders.filter(o => o.order_status === 'confirmed'), [orders])
  const dispatchedOrders = useMemo(() => orders.filter(o => o.order_status === 'dispatched'), [orders])
  const deliveredOrders = useMemo(() => orders.filter(o => o.order_status === 'delivered'), [orders])

  // ── Filtered list ───────────────────────────────────────────────────────────

  const visibleOrders = useMemo(() => {
    let base = orders
    if (activeFilter === 'new') base = newOrders
    else if (activeFilter === 'confirmed') base = confirmedOrders
    else if (activeFilter === 'dispatched') base = dispatchedOrders
    else if (activeFilter === 'delivered') base = deliveredOrders
    if (dateFilter) base = base.filter(o => o.delivery_date === dateFilter)
    return base
  }, [activeFilter, dateFilter, orders, newOrders, confirmedOrders, dispatchedOrders, deliveredOrders])

  function handleCardClick(status: string) {
    setActiveFilter(f => f === status ? null : status)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #status-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
        @media (max-width: 720px) {
          [data-orders-shell] { padding: 28px 14px 40px !important; }
          [data-orders-filter] { align-items: flex-start !important; flex-direction: column; gap: 8px !important; }
          [data-orders-filter] input { width: 100%; min-height: 40px; }
          [data-order-card] {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            padding: 16px !important;
          }
          [data-order-card-total] {
            text-align: left !important;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
            padding-top: 8px;
            border-top: 1px solid var(--border);
          }
          [data-order-ref] {
            font-size: 20px !important;
            min-height: 32px;
          }
        }
        @media (max-width: 600px) { #status-cards { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 24px; } }
      ` }} />

      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <div data-orders-shell style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '28px',
            color: 'var(--text-primary)',
            marginBottom: '4px',
          }}>
            Orders
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
            {orders.length} total
          </p>

          {/* ── Status cards ── */}
          <div id="status-cards">
            <StatusCard
              label="New orders"
              count={newOrders.length}
              total={totalAmount(newOrders)}
              active={activeFilter === 'new'}
              onClick={() => handleCardClick('new')}
            />
            <StatusCard
              label="Confirmed"
              count={confirmedOrders.length}
              total={totalAmount(confirmedOrders)}
              active={activeFilter === 'confirmed'}
              onClick={() => handleCardClick('confirmed')}
            />
            <StatusCard
              label="Out for delivery"
              count={dispatchedOrders.length}
              total={null}
              active={activeFilter === 'dispatched'}
              onClick={() => handleCardClick('dispatched')}
            />
            <StatusCard
              label="Delivered"
              count={deliveredOrders.length}
              total={totalAmount(deliveredOrders)}
              active={activeFilter === 'delivered'}
              onClick={() => handleCardClick('delivered')}
            />
          </div>

          {/* ── Date filter ── */}
          <div data-orders-filter style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', marginTop: '-8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Filter by delivery date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-raised)',
                fontFamily: 'var(--font-inter)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Filter label ── */}
          {(activeFilter || dateFilter) && (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '16px', marginTop: '-8px' }}>
              Showing {visibleOrders.length} order{visibleOrders.length !== 1 ? 's' : ''}
              {activeFilter ? ` · ${activeFilter}` : ''}
              {dateFilter ? ` · ${dateFilter}` : ''} ·{' '}
              <span
                role="button"
                onClick={() => { setActiveFilter(null); setDateFilter('') }}
                style={{ color: 'var(--brand-gold)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                show all
              </span>
            </p>
          )}

          {/* ── Orders list ── */}
          {visibleOrders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {activeFilter || dateFilter ? 'No orders match this filter.' : 'No orders yet.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {visibleOrders.map(order => (
                <div
                  key={order.id}
                  data-order-card
                  style={{
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px 20px',
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1fr',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  {/* Col 1: ref, name, phone */}
                  <div>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      data-order-ref
                      style={{
                        fontFamily: 'var(--font-fraunces)',
                        fontSize: '15px',
                        color: 'var(--brand-gold)',
                        textDecoration: 'none',
                        display: 'inline-block',
                        marginBottom: '2px',
                      }}
                    >
                      {order.order_ref}
                    </Link>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {order.customer_name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      {order.customer_phone}
                    </div>
                  </div>

                  {/* Col 2: delivery + badges */}
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {order.delivery_date
                        ? new Date(order.delivery_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                        : deliveryLabel(order)
                      } · Zone {order.delivery_zone}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                    </div>
                  </div>

                  {/* Col 3: amount + date */}
                  <div data-order-card-total style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-fraunces)',
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}>
                      {fmt(order.total_amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
