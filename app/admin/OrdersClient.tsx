'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'

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

function fmt(n: number) {
  return n.toLocaleString()
}

function deliveryLabel(order: Order): string {
  const day = order.delivery_day === 'sunday' ? 'Sunday' : order.delivery_day === 'wednesday' ? 'Wednesday' : 'Monday'
  const window = order.delivery_window
  if (window === 'by_5pm') return `${day} · by 5pm`
  if (window === 'free_5_10pm') return `${day} · 5-10pm (free)`
  if (window) return `${day} · ${window.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  if (order.delivery_slot) return `${day} · ${order.delivery_slot.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  return day
}

function deliveryDate(order: Order): string {
  if (!order.delivery_date) return deliveryLabel(order)
  return new Date(`${order.delivery_date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function createdAt(order: Order): string {
  return new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function totalAmount(arr: Order[]) {
  return arr.reduce((sum, order) => sum + order.total_amount, 0)
}

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
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: active ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
        border: active ? '2px solid var(--brand-gold)' : '2px solid var(--border)',
        borderRadius: '8px',
        padding: '16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-inter)',
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
    </button>
  )
}

function MobileFilterButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: '44px',
        padding: '0 14px',
        borderRadius: '8px',
        border: active ? '1px solid var(--brand-gold)' : '1px solid var(--border)',
        backgroundColor: active ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-inter)',
        fontSize: '13px',
        fontWeight: active ? '700' : '500',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const orders = initialOrders
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState('')

  const newOrders = useMemo(() => orders.filter(order => order.order_status === 'new'), [orders])
  const confirmedOrders = useMemo(() => orders.filter(order => order.order_status === 'confirmed'), [orders])
  const dispatchedOrders = useMemo(() => orders.filter(order => order.order_status === 'dispatched'), [orders])
  const deliveredOrders = useMemo(() => orders.filter(order => order.order_status === 'delivered'), [orders])

  const visibleOrders = useMemo(() => {
    let base = orders
    if (activeFilter === 'new') base = newOrders
    else if (activeFilter === 'confirmed') base = confirmedOrders
    else if (activeFilter === 'dispatched') base = dispatchedOrders
    else if (activeFilter === 'delivered') base = deliveredOrders
    if (dateFilter) base = base.filter(order => order.delivery_date === dateFilter)
    return base
  }, [activeFilter, dateFilter, orders, newOrders, confirmedOrders, dispatchedOrders, deliveredOrders])

  function handleStatusFilter(status: string) {
    setActiveFilter(filter => filter === status ? null : status)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        [data-status-cards] { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
        [data-mobile-status-filters] { display: none; }
        @media (max-width: 720px) {
          [data-orders-shell] { padding: 22px 14px 112px !important; }
          [data-orders-heading-row] {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 12px;
            margin-bottom: 18px;
          }
          [data-orders-title] { font-size: 30px !important; margin-bottom: 0 !important; }
          [data-orders-total] { margin-bottom: 2px !important; white-space: nowrap; }
          [data-status-cards] { display: none; }
          [data-mobile-status-filters] {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            margin: 0 -14px 18px;
            padding: 0 14px 2px;
            -webkit-overflow-scrolling: touch;
          }
          [data-orders-filter] {
            align-items: stretch !important;
            flex-direction: column;
            gap: 8px !important;
            margin: 0 0 18px !important;
          }
          [data-orders-filter] input { width: 100%; min-height: 44px; box-sizing: border-box; }
          [data-orders-filter] button { min-height: 44px; align-self: flex-start; }
          [data-order-list] { gap: 10px !important; }
          [data-order-card] {
            padding: 16px !important;
          }
          [data-order-card-link] {
            grid-template-columns: 1fr auto !important;
            gap: 12px !important;
          }
          [data-order-main] { order: 1; }
          [data-order-total] { order: 2; }
          [data-order-delivery] {
            order: 3;
            grid-column: 1 / -1;
          }
          [data-order-ref] { font-size: 19px !important; line-height: 1.1; }
          [data-order-customer] { font-size: 15px !important; margin-top: 5px; }
          [data-order-phone] { font-size: 14px !important; }
          [data-order-amount] { font-size: 19px !important; }
          [data-order-created] { font-size: 12px !important; }
          [data-order-delivery] {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid var(--border);
          }
          [data-order-badge] {
            min-height: 26px;
            display: inline-flex;
            align-items: center;
          }
        }
      ` }} />

      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <div data-orders-shell style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
          <div data-orders-heading-row>
            <div>
              <h1 data-orders-title style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '28px',
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}>
                Orders
              </h1>
            </div>
            <p data-orders-total style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
              {orders.length} total
            </p>
          </div>

          <div data-status-cards>
            <StatusCard label="New orders" count={newOrders.length} total={totalAmount(newOrders)} active={activeFilter === 'new'} onClick={() => handleStatusFilter('new')} />
            <StatusCard label="Confirmed" count={confirmedOrders.length} total={totalAmount(confirmedOrders)} active={activeFilter === 'confirmed'} onClick={() => handleStatusFilter('confirmed')} />
            <StatusCard label="Out for delivery" count={dispatchedOrders.length} total={null} active={activeFilter === 'dispatched'} onClick={() => handleStatusFilter('dispatched')} />
            <StatusCard label="Delivered" count={deliveredOrders.length} total={totalAmount(deliveredOrders)} active={activeFilter === 'delivered'} onClick={() => handleStatusFilter('delivered')} />
          </div>

          <div data-mobile-status-filters>
            <MobileFilterButton label={`All ${orders.length}`} active={activeFilter === null} onClick={() => setActiveFilter(null)} />
            <MobileFilterButton label={`New ${newOrders.length}`} active={activeFilter === 'new'} onClick={() => handleStatusFilter('new')} />
            <MobileFilterButton label={`Confirmed ${confirmedOrders.length}`} active={activeFilter === 'confirmed'} onClick={() => handleStatusFilter('confirmed')} />
            <MobileFilterButton label={`Dispatch ${dispatchedOrders.length}`} active={activeFilter === 'dispatched'} onClick={() => handleStatusFilter('dispatched')} />
            <MobileFilterButton label={`Delivered ${deliveredOrders.length}`} active={activeFilter === 'delivered'} onClick={() => handleStatusFilter('delivered')} />
          </div>

          <div data-orders-filter style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', marginTop: '-8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Filter by delivery date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={event => setDateFilter(event.target.value)}
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
                type="button"
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

          {(activeFilter || dateFilter) && (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '16px', marginTop: '-8px' }}>
              Showing {visibleOrders.length} order{visibleOrders.length !== 1 ? 's' : ''}
              {activeFilter ? ` · ${activeFilter}` : ''}
              {dateFilter ? ` · ${dateFilter}` : ''} ·{' '}
              <button
                type="button"
                onClick={() => { setActiveFilter(null); setDateFilter('') }}
                style={{
                  color: 'var(--brand-gold)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  font: 'inherit',
                }}
              >
                show all
              </button>
            </p>
          )}

          {visibleOrders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {activeFilter || dateFilter ? 'No orders match this filter.' : 'No orders yet.'}
            </p>
          ) : (
            <div data-order-list style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {visibleOrders.map(order => (
                <article
                  key={order.id}
                  data-order-card
                  style={{
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px 20px',
                  }}
                >
                  <Link
                    href={`/admin/orders/${order.id}`}
                    data-order-card-link
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1fr',
                      gap: '12px',
                      alignItems: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    <div data-order-main>
                      <span data-order-ref style={{
                        fontFamily: 'var(--font-fraunces)',
                        fontSize: '15px',
                        color: 'var(--brand-gold)',
                        display: 'inline-block',
                        marginBottom: '2px',
                      }}>
                        {order.order_ref}
                      </span>
                      <div data-order-customer style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {order.customer_name}
                      </div>
                      <div data-order-phone style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {order.customer_phone}
                      </div>
                    </div>

                    <div data-order-delivery>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        {deliveryDate(order)} · Zone {order.delivery_zone}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span data-order-badge style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          backgroundColor: order.payment_status === 'paid' ? 'var(--accent-forest)' : 'var(--surface-sunken)',
                          color: order.payment_status === 'paid' ? 'var(--surface-raised)' : 'var(--text-secondary)',
                        }}>
                          {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                        <span data-order-badge style={{
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

                    <div data-order-total style={{ textAlign: 'right' }}>
                      <div data-order-amount style={{
                        fontFamily: 'var(--font-fraunces)',
                        fontSize: '15px',
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                      }}>
                        {fmt(order.total_amount)}
                      </div>
                      <div data-order-created style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {createdAt(order)}
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
