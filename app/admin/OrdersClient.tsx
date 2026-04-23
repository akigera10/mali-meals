'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Order = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  delivery_zone: number
  delivery_day: string
  delivery_slot: string | null
  subtotal: number
  delivery_fee: number
  total_amount: number
  payment_status: string
  order_status: string
  created_at: string
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'out_for_delivery', 'delivered']

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders)

  async function togglePayment(id: string, current: string) {
    const next = current === 'paid' ? 'unpaid' : 'paid'
    setOrders(orders.map(o => o.id === id ? { ...o, payment_status: next } : o))
    await supabase.from('orders').update({ payment_status: next } as any).eq('id', id)
  }

  async function updateStatus(id: string, next: string) {
    setOrders(orders.map(o => o.id === id ? { ...o, order_status: next } : o))
    await supabase.from('orders').update({ order_status: next } as any).eq('id', id)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--surface-base)',
      fontFamily: 'var(--font-inter)',
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '28px',
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}>
          Orders
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-tertiary)',
          marginBottom: '32px',
        }}>
          {orders.length} total
        </p>

        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            No orders yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map(order => (
              <div key={order.id} style={{
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {/* Top row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  alignItems: 'start',
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-fraunces)',
                      fontSize: '16px',
                      color: 'var(--text-primary)',
                    }}>
                      {order.order_ref}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {order.customer_name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {order.customer_phone}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      {order.delivery_day === 'sunday' ? 'Sunday' : 'Monday'}
                      {order.delivery_slot ? ` · ${order.delivery_slot.replace(/_/g, ' ')}` : ''}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      Zone {order.delivery_zone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-fraunces)',
                      fontSize: '16px',
                      color: 'var(--text-primary)',
                    }}>
                      Ksh {order.total_amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      subtotal {order.subtotal.toLocaleString()} + delivery {order.delivery_fee.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border)',
                }}>
                  {/* Payment toggle */}
                  <button
                    onClick={() => togglePayment(order.id, order.payment_status)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'var(--font-inter)',
                      backgroundColor: order.payment_status === 'paid' ? '#3F5A3C' : 'var(--surface-sunken)',
                      color: order.payment_status === 'paid' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {order.payment_status === 'paid' ? '✓ Paid' : 'Mark as paid'}
                  </button>

                  {/* Status dropdown */}
                  <select
                    value={order.order_status}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--surface-raised)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-inter)',
                      cursor: 'pointer',
                    }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>

                  <span style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginLeft: 'auto',
                  }}>
                    {new Date(order.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}