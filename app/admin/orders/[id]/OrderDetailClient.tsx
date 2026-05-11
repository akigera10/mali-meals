/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState } from 'react'
import Link from 'next/link'

type Order = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_zone: number
  delivery_day: string
  delivery_date: string | null
  delivery_window: string | null
  delivery_slot: string | null
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
  mpesa_code: string | null
  paid_at: string | null
}

type OrderItem = {
  id: string
  dish_name: string | null
  quantity: number
  variant: string
  meat_type: string | null
  unit_price: number
  menu_items: { name: string; category: string | null; meat_upgrade_type: string | null } | null
  order_item_addons: {
    quantity: number
    unit_price: number
    protein_addons: { name: string } | null
  }[]
}

type OrderSpecial = {
  id: string
  special_name: string | null
  quantity: number
  unit_price: number
  specials: { name: string } | null
}

const ZONE_NAMES: Record<number, string> = {
  1: 'Lavington, Kilimani, Kileleshwa, Hurlingham',
  2: 'Riverside, Westlands, Parklands, Peponi',
  3: 'Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga',
  4: 'Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road',
}

function fmt(n: number) {
  return n.toLocaleString()
}

function deliveryLabel(order: Order): string {
  if (order.delivery_day === 'wednesday') {
    if (order.delivery_date) {
      const dateStr = new Date(`${order.delivery_date}T12:00:00`)
        .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      return `Wednesday · ${dateStr}`
    }
    return 'Wednesday'
  }

  const day = order.delivery_day === 'sunday' ? 'Sunday' : 'Monday'
  const window = order.delivery_window
  if (window === 'by_5pm') return `${day} · by 5pm`
  if (window === 'free_5_10pm') return `${day} · 5-10pm (free)`
  if (window) return `${day} · ${window.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  if (order.delivery_slot) return `${day} · ${order.delivery_slot.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  return day
}

function variantLabel(item: OrderItem): string {
  if (item.variant === 'vegetarian') return 'Vegetarian'
  const type = item.meat_type || item.menu_items?.meat_upgrade_type
  if (type === 'beef') return 'With beef'
  if (type === 'chicken') return 'With chicken'
  return 'With protein'
}

function ItemRows({ items }: {
  items: { id: string; name: string; variant: string | null; quantity: number; unit_price: number }[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map(item => (
        <div key={item.id} data-order-item-row style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: '16px',
          alignItems: 'baseline',
          fontSize: '14px',
        }}>
          <span style={{ color: 'var(--text-primary)' }}>
            {item.name}
            {item.variant && (
              <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px', fontSize: '12px' }}>
                {item.variant}
              </span>
            )}
          </span>
          <span style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>x {item.quantity}</span>
          <span style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{fmt(item.unit_price)}</span>
          <span style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '14px',
            color: 'var(--text-primary)',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}>
            {fmt(item.unit_price * item.quantity)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function OrderDetailClient({
  initialOrder,
  items,
  specials,
}: {
  initialOrder: Order
  items: OrderItem[]
  specials: OrderSpecial[]
}) {
  const [order, setOrder] = useState(initialOrder)
  const [showMpesaForm, setShowMpesaForm] = useState(false)
  const [mpesaCode, setMpesaCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [adminNotes, setAdminNotes] = useState(initialOrder.notes || '')

  const mainItems = items.filter(item => item.menu_items?.category === 'mains')
  const saladItems = items.filter(item => item.menu_items?.category === 'salads')
  const allAddons = items.flatMap(item => item.order_item_addons || [])
  const hasItems = mainItems.length > 0 || saladItems.length > 0 || specials.length > 0 || allAddons.length > 0

  async function updateOrder(updates: Record<string, any>) {
    await fetch('/api/admin/update-order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, updates }),
    })
  }

  async function handleMarkPaid() {
    if (!mpesaCode.trim()) return
    setSaving(true)
    const paidAt = new Date().toISOString()
    await updateOrder({ payment_status: 'paid', mpesa_code: mpesaCode.trim(), paid_at: paidAt })
    setOrder({ ...order, payment_status: 'paid', mpesa_code: mpesaCode.trim(), paid_at: paidAt })
    setShowMpesaForm(false)
    setMpesaCode('')
    setSaving(false)
  }

  async function handleStatusUpdate(next: string) {
    setSaving(true)
    await updateOrder({ order_status: next })
    setOrder({ ...order, order_status: next })
    setSaving(false)
  }

  async function handleMarkDispatched() {
    await handleStatusUpdate('dispatched')
    fetch('/api/send-dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(() => {})
  }

  async function handleCancel() {
    if (!window.confirm(`Cancel order ${order.order_ref}? This cannot be undone.`)) return
    setSaving(true)
    await updateOrder({ order_status: 'cancelled' })
    setOrder({ ...order, order_status: 'cancelled' })
    setSaving(false)
  }

  async function handleNotesBlur() {
    await updateOrder({ notes: adminNotes })
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 760px) {
          [data-order-detail-shell] { padding: 18px 14px 112px !important; }
          [data-order-back-link] {
            min-height: 44px;
            display: inline-flex !important;
            align-items: center;
            margin-bottom: 10px !important;
          }
          [data-order-detail-header] {
            display: block !important;
            margin-bottom: 14px !important;
            padding: 16px !important;
            background-color: var(--surface-raised);
            border: 1px solid var(--border);
            border-radius: 8px;
          }
          [data-order-detail-title-row] {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }
          [data-order-detail-title] { font-size: 32px !important; margin-bottom: 8px !important; }
          [data-order-detail-mobile-total] { display: block !important; }
          [data-order-detail-meta] { gap: 6px !important; }
          [data-order-detail-actions] {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 8px !important;
            margin-top: 14px;
            width: 100%;
          }
          [data-order-detail-actions] a,
          [data-order-detail-actions] button {
            justify-content: center;
            min-height: 44px;
            width: 100%;
            box-sizing: border-box;
          }
          [data-order-detail-primary-action] { grid-column: 1 / -1; }
          [data-order-detail-section] { padding: 16px !important; }
          [data-order-detail-two-column] { grid-template-columns: 1fr !important; gap: 12px !important; }
          [data-mpesa-row] { display: grid !important; grid-template-columns: 1fr !important; gap: 10px !important; }
          [data-mpesa-row] input,
          [data-mpesa-row] button {
            width: 100%;
            min-width: 0 !important;
            min-height: 44px;
            box-sizing: border-box;
          }
          [data-order-item-row] {
            grid-template-columns: 1fr auto !important;
            gap: 4px 12px !important;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
          }
          [data-order-item-row] > span:first-child { grid-column: 1 / -1; }
          [data-order-detail-totals] {
            max-width: none !important;
            margin-left: 0 !important;
          }
        }
      ` }} />
      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <div data-order-detail-shell style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 20px' }}>
          <Link data-order-back-link href="/admin" style={{
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '24px',
          }}>
            &lt; Orders
          </Link>

          <div data-order-detail-header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div>
              <div data-order-detail-title-row>
                <h1 data-order-detail-title style={{
                  fontFamily: 'var(--font-fraunces)',
                  fontSize: '32px',
                  color: 'var(--text-primary)',
                  margin: '0 0 10px 0',
                }}>
                  {order.order_ref}
                </h1>
                <div data-order-detail-mobile-total style={{
                  display: 'none',
                  fontFamily: 'var(--font-fraunces)',
                  fontSize: '24px',
                  color: 'var(--text-primary)',
                  textAlign: 'right',
                  lineHeight: 1.1,
                }}>
                  {fmt(order.total_amount)}
                </div>
              </div>
              <div data-order-detail-meta style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: '500',
                  backgroundColor: order.payment_status === 'paid' ? 'var(--accent-forest)' : 'var(--surface-sunken)',
                  color: order.payment_status === 'paid' ? 'var(--surface-raised)' : 'var(--text-secondary)',
                }}>
                  {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: '500',
                  backgroundColor: 'var(--surface-sunken)',
                  color: 'var(--text-secondary)',
                }}>
                  {order.order_status.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  {new Date(order.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div data-order-detail-actions style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <a href={`tel:${order.customer_phone}`} style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'var(--font-inter)',
                backgroundColor: 'var(--surface-raised)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                Call customer
              </a>
              <a href={`mailto:${order.customer_email}`} style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'var(--font-inter)',
                backgroundColor: 'var(--surface-raised)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                Email
              </a>
              {order.payment_status === 'unpaid' && (
                <button
                  data-order-detail-primary-action
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: '500',
                    backgroundColor: 'var(--brand-gold)',
                    color: 'var(--surface-raised)',
                  }}
                  onClick={() => setShowMpesaForm(value => !value)}
                  disabled={saving}
                >
                  Mark paid
                </button>
              )}
              {order.order_status === 'new' && (
                <button
                  data-order-detail-primary-action
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={saving}
                >
                  Confirm order
                </button>
              )}
              {order.order_status === 'confirmed' && (
                <button
                  data-order-detail-primary-action
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={handleMarkDispatched}
                  disabled={saving}
                >
                  Mark dispatched
                </button>
              )}
              {order.order_status === 'dispatched' && (
                <button
                  data-order-detail-primary-action
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={saving}
                >
                  Mark delivered
                </button>
              )}
              <Link href={`/admin/packing-slips?order=${order.id}`} style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'var(--font-inter)',
                backgroundColor: 'var(--surface-raised)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                Print slip
              </Link>
              {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--accent-terracotta)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: 'transparent',
                    color: 'var(--accent-terracotta)',
                  }}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel order
                </button>
              )}
            </div>
          </div>

          {showMpesaForm && (
            <div data-order-detail-section style={{
              backgroundColor: 'var(--brand-gold-soft)',
              border: '1px solid var(--brand-gold)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '12px' }}>
                M-Pesa confirmation code
              </div>
              <div data-mpesa-row style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={mpesaCode}
                  onChange={event => setMpesaCode(event.target.value)}
                  placeholder="e.g. QHX1234XY5"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                    minWidth: '200px',
                    letterSpacing: '0.05em',
                  }}
                />
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: mpesaCode.trim().length < 6 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: '500',
                    backgroundColor: 'var(--brand-gold)',
                    color: 'var(--surface-raised)',
                    opacity: mpesaCode.trim().length < 6 || saving ? 0.5 : 1,
                  }}
                  onClick={handleMarkPaid}
                  disabled={mpesaCode.trim().length < 6 || saving}
                >
                  {saving ? 'Saving...' : 'Confirm payment'}
                </button>
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={() => { setShowMpesaForm(false); setMpesaCode('') }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
              {mpesaCode.trim().length < 6 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: mpesaCode.trim().length > 0 ? 'var(--accent-terracotta)' : 'var(--text-tertiary)',
                }}>
                  Enter M-Pesa code to continue
                </div>
              )}
            </div>
          )}

          <div data-order-detail-two-column style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <section data-order-detail-section style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '10px',
              }}>
                Customer
              </div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>
                {order.customer_name}
              </div>
              <a href={`tel:${order.customer_phone}`} style={{
                fontSize: '14px',
                color: 'var(--brand-gold)',
                textDecoration: 'none',
                display: 'block',
                marginBottom: '4px',
              }}>
                {order.customer_phone}
              </a>
              <a href={`mailto:${order.customer_email}`} style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                display: 'block',
                overflowWrap: 'anywhere',
              }}>
                {order.customer_email}
              </a>
              {order.mpesa_code && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>M-Pesa code: </span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                    {order.mpesa_code}
                  </span>
                  {order.paid_at && (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                      Paid {new Date(order.paid_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section data-order-detail-section style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '10px',
              }}>
                Delivery
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
                Zone {order.delivery_zone} - {ZONE_NAMES[order.delivery_zone]}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {deliveryLabel(order)}
              </div>
              {order.address_building && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{order.address_building}</div>}
              {order.address_street && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{order.address_street}</div>}
              {order.address_apartment && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{order.address_apartment}</div>}
              {order.address_landmark && <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Near {order.address_landmark}</div>}
              {initialOrder.notes && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: '6px',
                  }}>
                    Customer notes
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {initialOrder.notes}
                  </div>
                </div>
              )}
            </section>
          </div>

          {hasItems && (
            <section data-order-detail-section style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              {mainItems.length > 0 && (
                <div style={{ marginBottom: saladItems.length > 0 || specials.length > 0 || allAddons.length > 0 ? '20px' : '0' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: '10px',
                  }}>
                    Mains
                  </div>
                  <ItemRows items={mainItems.map(item => ({
                    id: item.id,
                    name: item.dish_name || item.menu_items?.name || '-',
                    variant: variantLabel(item),
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                  }))} />
                </div>
              )}

              {saladItems.length > 0 && (
                <div style={{ marginBottom: specials.length > 0 || allAddons.length > 0 ? '20px' : '0' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: '10px',
                  }}>
                    Salads
                  </div>
                  <ItemRows items={saladItems.map(item => ({
                    id: item.id,
                    name: item.dish_name || item.menu_items?.name || '-',
                    variant: variantLabel(item),
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                  }))} />
                </div>
              )}

              {specials.length > 0 && (
                <div style={{ marginBottom: allAddons.length > 0 ? '20px' : '0' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: '10px',
                  }}>
                    Chef&apos;s Special
                  </div>
                  <ItemRows items={specials.map(special => ({
                    id: special.id,
                    name: special.special_name || special.specials?.name || '-',
                    variant: null,
                    quantity: special.quantity,
                    unit_price: special.unit_price,
                  }))} />
                </div>
              )}

              {allAddons.length > 0 && (
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: '10px',
                  }}>
                    Protein Add-ons
                  </div>
                  <ItemRows items={allAddons.map((addon, index) => ({
                    id: `addon-${index}`,
                    name: addon.protein_addons?.name ?? '-',
                    variant: null,
                    quantity: addon.quantity,
                    unit_price: addon.unit_price,
                  }))} />
                </div>
              )}

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div data-order-detail-totals style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '260px', marginLeft: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span>
                    <span>{fmt(order.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Delivery fee</span>
                    <span>{fmt(order.delivery_fee)}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '16px',
                    fontFamily: 'var(--font-fraunces)',
                    color: 'var(--text-primary)',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <span>Total</span>
                    <span>{fmt(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section data-order-detail-section style={{
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '20px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '10px',
            }}>
              Admin notes
            </div>
            <textarea
              value={adminNotes}
              onChange={event => setAdminNotes(event.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Internal notes about this order..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                fontSize: '14px',
                fontFamily: 'var(--font-inter)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--surface-raised)',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </section>
        </div>
      </div>
    </>
  )
}
