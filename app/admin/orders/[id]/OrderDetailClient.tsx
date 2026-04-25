/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
  quantity: number
  variant: string
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
  return `Ksh ${n.toLocaleString()}`
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

function variantLabel(item: OrderItem): string {
  if (item.variant === 'vegetarian') return 'Vegetarian'
  const t = item.menu_items?.meat_upgrade_type
  if (t === 'beef') return 'With beef'
  if (t === 'chicken') return 'With chicken'
  return 'With meat'
}

const sectionLabel = {
  fontSize: '11px',
  fontWeight: '600',
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  marginBottom: '10px',
}

const card = {
  backgroundColor: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '20px',
}

function ItemRows({ items }: {
  items: { id: string; name: string; variant: string | null; quantity: number; unit_price: number }[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map(item => (
        <div key={item.id} style={{
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
          <span style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>× {item.quantity}</span>
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

  const mainItems = items.filter(i => i.menu_items?.category === 'mains')
  const saladItems = items.filter(i => i.menu_items?.category === 'salads')
  const allAddons = items.flatMap(i => i.order_item_addons || [])

  async function handleMarkPaid() {
    if (!mpesaCode.trim()) return
    setSaving(true)
    const paidAt = new Date().toISOString()
    await (supabase.from('orders') as any).update({
      payment_status: 'paid',
      mpesa_code: mpesaCode.trim(),
      paid_at: paidAt,
    }).eq('id', order.id)
    setOrder({ ...order, payment_status: 'paid', mpesa_code: mpesaCode.trim(), paid_at: paidAt })
    setShowMpesaForm(false)
    setMpesaCode('')
    setSaving(false)
  }

  async function handleStatusUpdate(next: string) {
    setSaving(true)
    await (supabase.from('orders') as any).update({ order_status: next }).eq('id', order.id)
    setOrder({ ...order, order_status: next })
    setSaving(false)
  }

  async function handleCancel() {
    if (!window.confirm(`Cancel order ${order.order_ref}? This cannot be undone.`)) return
    setSaving(true)
    await (supabase.from('orders') as any).update({ order_status: 'cancelled' }).eq('id', order.id)
    setOrder({ ...order, order_status: 'cancelled' })
    setSaving(false)
  }

  async function handleNotesBlur() {
    await (supabase.from('orders') as any).update({ notes: adminNotes }).eq('id', order.id)
  }

  const payBadge = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'var(--font-inter)',
    fontWeight: '500',
    backgroundColor: order.payment_status === 'paid' ? 'var(--accent-forest)' : 'var(--surface-sunken)',
    color: order.payment_status === 'paid' ? '#fff' : 'var(--text-secondary)',
  }

  const statusBadge = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'var(--font-inter)',
    fontWeight: '500',
    backgroundColor: 'var(--surface-sunken)',
    color: 'var(--text-secondary)',
  }

  const btnPrimary = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'var(--font-inter)',
    fontWeight: '500',
    backgroundColor: 'var(--brand-gold)',
    color: '#fff',
  }

  const btnSecondary = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--border-strong)',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'var(--font-inter)',
    backgroundColor: 'var(--surface-raised)',
    color: 'var(--text-secondary)',
  }

  const btnDanger = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--accent-terracotta)',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'var(--font-inter)',
    backgroundColor: 'transparent',
    color: 'var(--accent-terracotta)',
  }

  const hasItems = mainItems.length > 0 || saladItems.length > 0 || specials.length > 0 || allAddons.length > 0

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/admin" style={{
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '24px',
        }}>
          ← Orders
        </Link>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '32px',
              color: 'var(--text-primary)',
              margin: '0 0 10px 0',
            }}>
              {order.order_ref}
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={payBadge}>
                {order.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
              </span>
              <span style={statusBadge}>
                {order.order_status.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                {new Date(order.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {order.payment_status === 'unpaid' && (
              <button
                style={btnPrimary}
                onClick={() => setShowMpesaForm(v => !v)}
                disabled={saving}
              >
                Mark paid
              </button>
            )}
            {order.order_status === 'new' && (
              <button style={btnSecondary} onClick={() => handleStatusUpdate('confirmed')} disabled={saving}>
                Confirm order
              </button>
            )}
            {order.order_status === 'confirmed' && (
              <button style={btnSecondary} onClick={() => handleStatusUpdate('dispatched')} disabled={saving}>
                Mark dispatched
              </button>
            )}
            {order.order_status === 'dispatched' && (
              <button style={btnSecondary} onClick={() => handleStatusUpdate('delivered')} disabled={saving}>
                Mark delivered
              </button>
            )}
            {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
              <button style={btnDanger} onClick={handleCancel} disabled={saving}>
                Cancel order
              </button>
            )}
          </div>
        </div>

        {/* M-Pesa inline form */}
        {showMpesaForm && (
          <div style={{
            ...card,
            marginBottom: '20px',
            backgroundColor: 'var(--brand-gold-soft)',
            border: '1px solid var(--brand-gold)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '12px' }}>
              M-Pesa confirmation code
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={mpesaCode}
                onChange={e => setMpesaCode(e.target.value)}
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
                style={{ ...btnPrimary, opacity: mpesaCode.trim().length < 6 || saving ? 0.5 : 1, cursor: mpesaCode.trim().length < 6 ? 'not-allowed' : 'pointer' }}
                onClick={handleMarkPaid}
                disabled={mpesaCode.trim().length < 6 || saving}
              >
                {saving ? 'Saving…' : 'Confirm payment'}
              </button>
              <button
                style={btnSecondary}
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

        {/* Customer + Delivery two-column */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          {/* Customer */}
          <div style={card}>
            <div style={sectionLabel}>Customer</div>
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
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {order.customer_email}
            </div>
            {order.mpesa_code && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>M-Pesa code: </span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                  {order.mpesa_code}
                </span>
                {order.paid_at && (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                    Paid {new Date(order.paid_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delivery */}
          <div style={card}>
            <div style={sectionLabel}>Delivery</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
              Zone {order.delivery_zone} — {ZONE_NAMES[order.delivery_zone]}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {deliveryLabel(order)}
            </div>
            {order.address_building && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                {order.address_building}
              </div>
            )}
            {order.address_street && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                {order.address_street}
              </div>
            )}
            {order.address_apartment && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                {order.address_apartment}
              </div>
            )}
            {order.address_landmark && (
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Near {order.address_landmark}
              </div>
            )}
            {initialOrder.notes && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <div style={{ ...sectionLabel, marginBottom: '6px' }}>Customer notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {initialOrder.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {hasItems && (
          <div style={{ ...card, marginBottom: '16px' }}>

            {mainItems.length > 0 && (
              <div style={{ marginBottom: saladItems.length > 0 || specials.length > 0 || allAddons.length > 0 ? '20px' : '0' }}>
                <div style={sectionLabel}>Mains</div>
                <ItemRows items={mainItems.map(i => ({
                  id: i.id,
                  name: i.menu_items?.name ?? '—',
                  variant: variantLabel(i),
                  quantity: i.quantity,
                  unit_price: i.unit_price,
                }))} />
              </div>
            )}

            {saladItems.length > 0 && (
              <div style={{ marginBottom: specials.length > 0 || allAddons.length > 0 ? '20px' : '0' }}>
                <div style={sectionLabel}>Salads</div>
                <ItemRows items={saladItems.map(i => ({
                  id: i.id,
                  name: i.menu_items?.name ?? '—',
                  variant: variantLabel(i),
                  quantity: i.quantity,
                  unit_price: i.unit_price,
                }))} />
              </div>
            )}

            {specials.length > 0 && (
              <div style={{ marginBottom: allAddons.length > 0 ? '20px' : '0' }}>
                <div style={sectionLabel}>Chef&apos;s Special</div>
                <ItemRows items={specials.map(s => ({
                  id: s.id,
                  name: s.specials?.name ?? '—',
                  variant: null,
                  quantity: s.quantity,
                  unit_price: s.unit_price,
                }))} />
              </div>
            )}

            {allAddons.length > 0 && (
              <div>
                <div style={sectionLabel}>Protein Add-ons</div>
                <ItemRows items={allAddons.map((a, i) => ({
                  id: `addon-${i}`,
                  name: a.protein_addons?.name ?? '—',
                  variant: null,
                  quantity: a.quantity,
                  unit_price: a.unit_price,
                }))} />
              </div>
            )}

            {/* Totals */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '260px', marginLeft: 'auto' }}>
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
          </div>
        )}

        {/* Admin notes */}
        <div style={card}>
          <div style={sectionLabel}>Admin notes</div>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Internal notes about this order…"
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
        </div>

      </div>
    </div>
  )
}
