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
}

type OrderItem = {
  id: string
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
  quantity: number
  unit_price: number
  specials: { name: string } | null
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
  const t = item.meat_type || item.menu_items?.meat_upgrade_type
  if (t === 'beef') return 'With beef'
  if (t === 'chicken') return 'With chicken'
  return 'With meat'
}

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const orders = initialOrders
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, { items: OrderItem[]; specials: OrderSpecial[] }>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function toggleOrder(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (detailCache[id]) return
    setLoadingId(id)
    const [{ data: itemsData }, { data: specialsData }] = await Promise.all([
      (supabase.from('order_items') as any)
        .select('id, quantity, variant, meat_type, unit_price, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, unit_price, protein_addons(name))')
        .eq('order_id', id),
      (supabase.from('order_specials') as any)
        .select('id, quantity, unit_price, specials(name)')
        .eq('order_id', id),
    ])
    setDetailCache(c => ({ ...c, [id]: { items: itemsData || [], specials: specialsData || [] } }))
    setLoadingId(null)
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '28px',
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}>
          Orders
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '32px' }}>
          {orders.length} total · click a row to expand
        </p>

        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>No orders yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map(order => {
              const isExpanded = expandedId === order.id
              const detail = detailCache[order.id]
              const items: OrderItem[] = detail?.items || []
              const orderSpecials: OrderSpecial[] = detail?.specials || []
              const isLoading = loadingId === order.id
              const mainItems = items.filter(i => i.menu_items?.category === 'mains')
              const saladItems = items.filter(i => i.menu_items?.category === 'salads')
              const allAddons = items.flatMap(item => item.order_item_addons || [])

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {/* ── Clickable summary header ── */}
                  <div
                    role="button"
                    onClick={() => toggleOrder(order.id)}
                    style={{
                      padding: '16px 20px 14px',
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '12px',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontFamily: 'var(--font-fraunces)',
                          fontSize: '16px',
                          color: 'var(--brand-gold)',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        {order.order_ref}
                      </Link>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {order.customer_name}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {order.customer_phone}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        {deliveryLabel(order)}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Zone {order.delivery_zone}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: '16px', color: 'var(--text-primary)' }}>
                        {fmt(order.total_amount)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        subtotal {order.subtotal.toLocaleString()} + delivery {order.delivery_fee.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                  </div>

                  {/* ── Status badges row ── */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 20px 14px',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: '500',
                      backgroundColor: order.payment_status === 'paid' ? 'var(--accent-forest)' : 'var(--surface-sunken)',
                      color: order.payment_status === 'paid' ? '#fff' : 'var(--text-secondary)',
                    }}>
                      {order.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                    </span>

                    <span style={{
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

                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                      {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* ── Expandable detail panel ── */}
                  <div style={{
                    overflow: 'hidden',
                    maxHeight: isExpanded ? '800px' : '0',
                    transition: 'max-height 0.25s ease-in-out',
                  }}>
                    <div style={{
                      borderTop: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-sunken)',
                      padding: '20px',
                    }}>
                      {isLoading ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>Loading…</p>
                      ) : (
                        <>
                          {/* Mains */}
                          {mainItems.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {mainItems.map(item => (
                                  <div key={item.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto auto auto',
                                    gap: '16px',
                                    alignItems: 'baseline',
                                    fontSize: '13px',
                                  }}>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                      {item.menu_items?.name ?? '—'}
                                      <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px', fontSize: '12px' }}>
                                        {variantLabel(item)}
                                      </span>
                                    </span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>× {item.quantity}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>{fmt(item.unit_price)}</span>
                                    <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'right' }}>
                                      {fmt(item.unit_price * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Salads */}
                          {saladItems.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {saladItems.map(item => (
                                  <div key={item.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto auto auto',
                                    gap: '16px',
                                    alignItems: 'baseline',
                                    fontSize: '13px',
                                  }}>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                      {item.menu_items?.name ?? '—'}
                                      <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px', fontSize: '12px' }}>
                                        {variantLabel(item)}
                                      </span>
                                    </span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>× {item.quantity}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>{fmt(item.unit_price)}</span>
                                    <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'right' }}>
                                      {fmt(item.unit_price * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Chef's special */}
                          {orderSpecials.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--text-tertiary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                marginBottom: '10px',
                              }}>
                                Chef's special
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {orderSpecials.map(s => (
                                  <div key={s.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto auto auto',
                                    gap: '16px',
                                    alignItems: 'baseline',
                                    fontSize: '13px',
                                  }}>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                      {s.specials?.name ?? '—'}
                                    </span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>× {s.quantity}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>{fmt(s.unit_price)}</span>
                                    <span style={{
                                      fontFamily: 'var(--font-fraunces)',
                                      fontSize: '14px',
                                      color: 'var(--text-primary)',
                                      textAlign: 'right',
                                    }}>
                                      {fmt(s.unit_price * s.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Add-ons */}
                          {allAddons.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--text-tertiary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                marginBottom: '10px',
                              }}>
                                Protein add-ons
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                {allAddons.map((addon, i) => (
                                  <div key={i} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto auto auto',
                                    gap: '16px',
                                    alignItems: 'baseline',
                                    fontSize: '13px',
                                  }}>
                                    <span style={{ color: 'var(--text-primary)' }}>
                                      {addon.protein_addons?.name ?? '—'}
                                    </span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>× {addon.quantity}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>{fmt(addon.unit_price)}</span>
                                    <span style={{
                                      fontFamily: 'var(--font-fraunces)',
                                      fontSize: '14px',
                                      color: 'var(--text-primary)',
                                      textAlign: 'right',
                                    }}>
                                      {fmt(addon.unit_price * addon.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Delivery + Notes */}
                          <div style={{
                            borderTop: '1px solid var(--border)',
                            paddingTop: '16px',
                            display: 'flex',
                            gap: '40px',
                            flexWrap: 'wrap',
                          }}>
                            <div>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--text-tertiary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                marginBottom: '8px',
                              }}>
                                Delivery
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                {deliveryLabel(order)} · Zone {order.delivery_zone}
                              </div>
                              {order.address_building && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{order.address_building}</div>
                              )}
                              {order.address_street && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{order.address_street}</div>
                              )}
                              {order.address_apartment && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{order.address_apartment}</div>
                              )}
                              {order.address_landmark && (
                                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Near {order.address_landmark}</div>
                              )}
                            </div>

                            {order.notes && (
                              <div>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: 'var(--text-tertiary)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.07em',
                                  marginBottom: '8px',
                                }}>
                                  Notes
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: '1.5' }}>
                                  {order.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
