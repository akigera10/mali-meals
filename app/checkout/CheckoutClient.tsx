'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/app/context/CartContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_DATA = [
  { value: '1', fee: 300, areas: 'Lavington, Kilimani, Kileleshwa, Hurlingham' },
  { value: '2', fee: 350, areas: 'Riverside, Westlands, Parklands, Peponi' },
  { value: '3', fee: 450, areas: 'Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga' },
  { value: '4', fee: 500, areas: 'Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road' },
] as const

const ZONE_FEES: Record<string, number> = { '1': 300, '2': 350, '3': 450, '4': 500 }
const FREE_DELIVERY_THRESHOLD = 5000

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string
  phone: string
  address: string
  zone: string
  day: string
  notes: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Ksh\u00a0${n.toLocaleString('en-KE')}`
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) errors.name = 'Please enter your full name'
  if (!data.phone.trim()) {
    errors.phone = 'Please enter your phone number'
  } else if (data.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Phone number must be at least 10 digits'
  }
  if (!data.address.trim()) errors.address = 'Please enter your delivery address'
  if (!data.zone) errors.zone = 'Please select a delivery zone'
  if (!data.day) errors.day = 'Please select a delivery day'
  return errors
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: 14,
    color: 'var(--text-primary)',
    background: 'var(--surface-raised)',
    border: `1px solid ${hasError ? '#B5533C' : 'var(--border-strong)'}`,
    borderRadius: 8,
    padding: '12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, error, children }: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-primary)',
      }}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 12,
          color: '#B5533C',
        }}>
          {error}
        </span>
      )}
    </div>
  )
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    }}>
      <span style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 13,
        fontWeight: step === 1 ? 600 : 400,
        color: step === 1 ? 'var(--brand-gold)' : 'var(--text-tertiary)',
      }}>
        1 — Details
      </span>
      <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>·</span>
      <span style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 13,
        fontWeight: step === 2 ? 600 : 400,
        color: step === 2 ? 'var(--brand-gold)' : 'var(--text-tertiary)',
      }}>
        2 — Review
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutClient() {
  const { cart, clearCart } = useCart()
  const [step, setStep] = useState<1 | 2>(1)
  const [isSuccess, setIsSuccess] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '', phone: '', address: '', zone: '', day: '', notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  // ── Empty cart ────────────────────────────────────────────────────────────

  if (cart.length === 0 && !isSuccess) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontSize: 26,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 10px',
        }}>
          Your cart is empty
        </p>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '0 0 24px',
        }}>
          Add some dishes before checking out.
        </p>
        <Link href="/" style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--brand-gold)',
          textDecoration: 'none',
        }}>
          ← Back to menu
        </Link>
      </div>
    )
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontSize: 32,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 12px',
        }}>
          Order received!
        </p>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '0 0 6px',
          lineHeight: 1.6,
        }}>
          A confirmation email is on its way to you.
        </p>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '0 0 32px',
          lineHeight: 1.6,
        }}>
          Your M-Pesa payment reference will be in the email.
        </p>
        <Link href="/" style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--brand-gold)',
          textDecoration: 'none',
        }}>
          ← Back to menu
        </Link>
      </div>
    )
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const dishes = cart.filter(e => e.variant !== 'addon')
  const addons = cart.filter(e => e.variant === 'addon')
  const subtotal = cart.reduce((s, e) => s + e.unitPrice * e.quantity, 0)
  const rawFee = ZONE_FEES[form.zone] ?? 0
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD && rawFee > 0
  const deliveryFee = freeDelivery ? 0 : rawFee
  const total = subtotal + deliveryFee
  const zoneData = ZONE_DATA.find(z => z.value === form.zone)
  const dayLabel = form.day === 'sunday' ? 'Sunday evening' : form.day === 'monday' ? 'Monday' : ''

  function setField(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function handleContinue() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setStep(2)
    window.scrollTo(0, 0)
  }

  function handleSimulatePayment() {
    const order = {
      customer_name: form.name,
      customer_phone: form.phone,
      delivery_address: form.address,
      delivery_zone: Number(form.zone),
      delivery_day: form.day,
      notes: form.notes || null,
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: total,
      items: cart,
    }
    console.log('ORDER PAYLOAD:', order)
    clearCart()
    setIsSuccess(true)
    window.scrollTo(0, 0)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px 60px' }}>

      {/* Page header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--text-primary)',
          }}>
            Mali&apos;s Meals
          </span>
        </Link>
      </div>

      <StepIndicator step={step} />

      {/* ── STEP 1 — Details ──────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <h2 style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Your details
          </h2>

          <Field label="Full name" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Ada Okafor"
              style={inputStyle(!!errors.name)}
            />
          </Field>

          <Field label="Phone number" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setField('phone', e.target.value)}
              placeholder="07XX XXX XXX"
              style={inputStyle(!!errors.phone)}
            />
          </Field>

          <Field label="Delivery address" error={errors.address}>
            <textarea
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              placeholder="Street, estate, gate number..."
              rows={2}
              style={{ ...inputStyle(!!errors.address), resize: 'vertical' as const, lineHeight: '1.5' }}
            />
          </Field>

          {/* Delivery zone — radio cards */}
          <Field label="Delivery zone" error={errors.zone}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ZONE_DATA.map(z => {
                const selected = form.zone === z.value
                return (
                  <label
                    key={z.value}
                    style={{
                      display: 'block',
                      background: selected ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
                      border: `1px solid ${selected ? 'var(--brand-gold)' : errors.zone ? '#B5533C' : 'var(--border-strong)'}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="zone"
                      value={z.value}
                      checked={selected}
                      onChange={() => setField('zone', z.value)}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 3,
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-fraunces), serif',
                        fontSize: 16,
                        color: 'var(--text-primary)',
                      }}>
                        Zone {z.value}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-fraunces), serif',
                        fontSize: 15,
                        color: selected ? 'var(--brand-gold-dark)' : 'var(--brand-gold)',
                      }}>
                        {fmt(z.fee)}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      lineHeight: 1.4,
                    }}>
                      {z.areas}
                    </span>
                  </label>
                )
              })}
            </div>
          </Field>

          {/* Delivery day — two option cards */}
          <Field label="Delivery day" error={errors.day}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                { value: 'sunday', label: 'Sunday evening', sub: '5 – 10 pm' },
                { value: 'monday', label: 'Monday', sub: null },
              ] as const).map(opt => {
                const selected = form.day === opt.value
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: 'block',
                      background: selected ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
                      border: `1px solid ${selected ? 'var(--brand-gold)' : errors.day ? '#B5533C' : 'var(--border-strong)'}`,
                      borderRadius: 8,
                      padding: '14px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <input
                      type="radio"
                      name="day"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setField('day', opt.value)}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      fontFamily: 'var(--font-fraunces), serif',
                      fontSize: 15,
                      color: 'var(--text-primary)',
                      marginBottom: opt.sub ? 3 : 0,
                    }}>
                      {opt.label}
                    </div>
                    {opt.sub && (
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 12,
                        color: 'var(--text-tertiary)',
                      }}>
                        {opt.sub}
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          </Field>

          {/* Notes — optional */}
          <Field label="Order notes (optional)">
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Any allergies, gate codes, or special instructions"
              rows={3}
              style={{ ...inputStyle(false), resize: 'vertical' as const, lineHeight: '1.5' }}
            />
          </Field>

          <button
            onClick={handleContinue}
            style={{
              background: 'var(--brand-gold)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '14px 24px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              marginTop: 4,
            }}
          >
            Continue to review →
          </button>

          <Link href="/" style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            textAlign: 'center',
          }}>
            ← Back to menu
          </Link>

        </div>
      )}

      {/* ── STEP 2 — Review ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <h2 style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Review your order
          </h2>

          {/* Order items card */}
          <div style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 20,
          }}>

            {/* Dishes */}
            {dishes.map(entry => (
              <div key={entry.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                paddingBottom: 12,
                marginBottom: 12,
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontSize: 16,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                  }}>
                    {entry.name}
                  </div>
                  {entry.variant === 'vegetarian' && (
                    <div style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      marginTop: 2,
                    }}>
                      Vegetarian
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                  }}>
                    {entry.quantity} × {fmt(entry.unitPrice)}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontSize: 16,
                    color: 'var(--text-primary)',
                    marginTop: 2,
                  }}>
                    {fmt(entry.unitPrice * entry.quantity)}
                  </div>
                </div>
              </div>
            ))}

            {/* Add-ons */}
            {addons.length > 0 && (
              <>
                <div style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-tertiary)',
                  marginBottom: 10,
                }}>
                  Protein add-ons
                </div>
                {addons.map(entry => (
                  <div key={entry.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    paddingBottom: 12,
                    marginBottom: 12,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-fraunces), serif',
                      fontSize: 16,
                      color: 'var(--text-primary)',
                      flex: 1,
                    }}>
                      {entry.name}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: 12,
                        color: 'var(--text-tertiary)',
                      }}>
                        {entry.quantity} × {fmt(entry.unitPrice)}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-fraunces), serif',
                        fontSize: 16,
                        color: 'var(--text-primary)',
                        marginTop: 2,
                      }}>
                        {fmt(entry.unitPrice * entry.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}>
                  Subtotal
                </span>
                <span style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                }}>
                  {fmt(subtotal)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                  }}>
                    Delivery
                  </span>
                  {freeDelivery && (
                    <span style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: 12,
                      color: 'var(--brand-gold)',
                      marginLeft: 8,
                    }}>
                      Free delivery applied ✓
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontSize: 16,
                  color: freeDelivery ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  textDecoration: freeDelivery ? 'line-through' : 'none',
                }}>
                  {fmt(rawFee)}
                </span>
              </div>

              {freeDelivery && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span />
                  <span style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontSize: 16,
                    color: 'var(--brand-gold)',
                  }}>
                    {fmt(0)}
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                marginTop: 2,
              }}>
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  Total
                </span>
                <span style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontSize: 24,
                  color: 'var(--text-primary)',
                }}>
                  {fmt(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery details summary */}
          <div style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 20,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}>
              <span style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontSize: 17,
                color: 'var(--text-primary)',
              }}>
                Delivery details
              </span>
              <button
                onClick={() => { setStep(1); window.scrollTo(0, 0) }}
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 13,
                  color: 'var(--brand-gold)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Edit
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { label: 'Name',     value: form.name },
                { label: 'Phone',    value: form.phone },
                { label: 'Address',  value: form.address },
                { label: 'Zone',     value: zoneData ? `Zone ${zoneData.value} — ${zoneData.areas}` : '' },
                { label: 'Delivery', value: dayLabel },
                ...(form.notes ? [{ label: 'Notes', value: form.notes }] : []),
              ]).map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 12 }}>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 13,
                    color: 'var(--text-tertiary)',
                    width: 68,
                    flexShrink: 0,
                  }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulate payment */}
          <button
            onClick={handleSimulatePayment}
            style={{
              background: 'var(--brand-gold)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '16px 24px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              width: '100%',
            }}
          >
            Simulate payment
          </button>

          <button
            onClick={() => { setStep(1); window.scrollTo(0, 0) }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13,
              color: 'var(--text-tertiary)',
              padding: 0,
              textAlign: 'center',
            }}
          >
            ← Back to details
          </button>

        </div>
      )}

    </div>
  )
}
