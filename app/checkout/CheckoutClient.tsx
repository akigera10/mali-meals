'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

const SLOT_OPTIONS = [
  { value: '12_2pm', label: '12–2pm' },
  { value: '2_4pm',  label: '2–4pm' },
  { value: '4_6pm',  label: '4–6pm' },
  { value: '6_8pm',  label: '6–8pm' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  firstName: string
  lastName: string
  phone: string
  email: string
  addrBuilding: string
  addrStreet: string
  addrApartment: string
  addrLandmark: string
  zone: string
  deliveryDay: string
  deliverySlot: string
  notes: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-KE')
}

function buildDeliveryLabel(deliveryDay: string, deliverySlot: string): string {
  if (deliveryDay === 'sunday_5pm')  return 'Sunday — by 5pm'
  if (deliveryDay === 'sunday_free') return 'Sunday — 5–10pm (free delivery)'
  if (deliveryDay === 'wednesday')   return 'Wednesday'
  if (deliveryDay === 'monday') {
    const slot = SLOT_OPTIONS.find(s => s.value === deliverySlot)
    return slot ? `Monday ${slot.label}` : 'Monday'
  }
  return ''
}

function variantLabel(entry: { variant: string; name: string; meatType?: string | null }): string {
  if (entry.variant === 'vegetarian') return 'Vegetarian'
  if (entry.meatType === 'beef')    return 'with beef'
  if (entry.meatType === 'chicken') return 'with chicken'
  const match = entry.name.match(/with (beef or chicken|chicken|beef)/i)
  return match ? match[0] : 'with protein'
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}

  if (!data.firstName.trim()) errors.firstName = 'Please enter your first name'
  if (!data.lastName.trim())  errors.lastName  = 'Please enter your last name'

  if (!data.email.trim()) {
    errors.email = 'Please enter a valid email address'
  } else {
    const atIdx = data.email.indexOf('@')
    if (atIdx < 1 || !data.email.slice(atIdx + 1).includes('.')) {
      errors.email = 'Please enter a valid email address'
    }
  }

  if (!data.phone.trim()) {
    errors.phone = 'Please enter your phone number'
  } else {
    const stripped = data.phone.replace(/\s/g, '')
    const isKenyan        = /^0[17]\d{8}$/.test(stripped)
    const isInternational = /^\+\d{7,}$/.test(stripped)
    if (!isKenyan && !isInternational) errors.phone = 'Please enter your phone number'
  }

  if (!data.addrBuilding.trim())  errors.addrBuilding  = 'Please enter your building or estate name'
  if (!data.addrStreet.trim())    errors.addrStreet    = 'Please enter your street address'
  if (!data.addrApartment.trim()) errors.addrApartment = 'Please enter your apartment or house number'

  if (!data.zone)        errors.zone        = 'Please select a delivery zone'
  if (!data.deliveryDay) errors.deliveryDay = 'Please select a delivery option'
  if (data.deliveryDay === 'monday' && !data.deliverySlot) {
    errors.deliverySlot = 'Please select a delivery time slot'
  }

  return errors
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, error, hint, controlId, children }: {
  label: React.ReactNode
  error?: string
  hint?: string
  controlId?: string
  children: React.ReactNode
}) {
  const hintId = controlId && hint ? `${controlId}-hint` : undefined
  const errorId = controlId && error ? `${controlId}-error` : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={controlId} style={{
        fontFamily: 'var(--font-ui), sans-serif',
        fontSize: 13,
        fontWeight: 500,
        color: error ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <span id={hintId} style={{
          fontFamily: 'var(--font-ui), sans-serif',
          fontSize: 12,
          fontStyle: 'italic',
          color: 'var(--text-tertiary)',
        }}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" style={{
          fontFamily: 'var(--font-ui), sans-serif',
          fontSize: 12,
          color: 'var(--accent-terracotta)',
        }}>
          {error}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutClient() {
  const router = useRouter()
  const { cart, clearCart, savedForm, saveForm, cycleInfo } = useCart()
  const [step, setStep] = useState<1 | 2>(1)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [orderRef, setOrderRef] = useState<string>('')
  const [successEmail, setSuccessEmail] = useState<string>('')
  const [form, setForm] = useState<FormData>(() => savedForm ?? {
    firstName: '', lastName: '', phone: '', email: '',
    addrBuilding: '', addrStreet: '', addrApartment: '', addrLandmark: '',
    zone: '', deliveryDay: '', deliverySlot: '', notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  // ── Empty cart ────────────────────────────────────────────────────────────

  if (cart.length === 0 && !isSuccess) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-display), serif',
          fontSize: 26,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 10px',
        }}>
          Your cart is empty
        </p>
        <p style={{
          fontFamily: 'var(--font-ui), sans-serif',
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '0 0 24px',
        }}>
          Add some dishes before checking out.
        </p>
        <Link href="/" style={{
          fontFamily: 'var(--font-ui), sans-serif',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--brand-green)',
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
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '72px 20px 88px', textAlign: 'left' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 400,
          color: 'var(--text-primary)',
          textAlign: 'center',
          display: 'block',
          marginBottom: 32,
        }}>
          Mali&apos;s Meals
        </span>
        <p style={{
          fontFamily: 'var(--font-display), serif',
          fontSize: 40,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 10px',
          lineHeight: 1.02,
        }}>
          Order received!
        </p>
        <p style={{
          fontFamily: 'var(--font-ui), sans-serif',
          fontSize: 15,
          color: 'var(--text-secondary)',
          margin: '0 0 26px',
          lineHeight: 1.6,
          maxWidth: 500,
        }}>
          Your order is safely in Mali&apos;s queue. Keep the reference below for any questions about this order.
        </p>
        <div style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--brand-green-hover)',
          borderRadius: 8,
          padding: '22px 24px',
          marginBottom: 18,
        }}>
          <p style={{
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            margin: '0 0 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Your order reference
          </p>
          <p style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 42,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: '0 0 10px',
          }}>
            {orderRef}
          </p>
          <p style={{
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 13,
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Your order summary and payment details have been sent to {successEmail}
          </p>
        </div>
        <div style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '20px 22px',
          marginBottom: 28,
        }}>
          <p style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 20,
            color: 'var(--text-primary)',
            margin: '0 0 14px',
          }}>
            What happens next
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--surface-sunken)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                1
              </span>
              <p style={{
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}>
                Check your email for the full order summary and payment instructions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--surface-sunken)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                2
              </span>
              <p style={{
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}>
                Mali reviews the order and confirms it before it moves into prep.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--surface-sunken)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                3
              </span>
              <p style={{
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}>
                Payment is completed before dispatch, then you receive your delivery update.
              </p>
            </div>
          </div>
        </div>
        <Link href="/" style={{
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-ui), sans-serif',
          fontSize: 14,
          fontWeight: 400,
          textDecoration: 'none',
          textAlign: 'center',
          display: 'block',
          marginTop: 24,
          cursor: 'pointer',
        }}>
          Back to menu
        </Link>
      </div>
    )
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const mains = cart.filter(e => e.category === 'mains')
  const salads = cart.filter(e => e.category === 'salads')
  const specials = cart.filter(e => e.variant === 'special')
  const addons = cart.filter(e => e.variant === 'addon')
  const subtotal = cart.reduce((s, e) => s + e.unitPrice * e.quantity, 0)
  const rawFee = ZONE_FEES[form.zone] ?? 0
  const isFreeWindow = form.deliveryDay === 'sunday_free'
  const deliveryFee = isFreeWindow ? 0 : rawFee
  const total = subtotal + deliveryFee
  const zoneData = ZONE_DATA.find(z => z.value === form.zone)
  const dayLabel = buildDeliveryLabel(form.deliveryDay, form.deliverySlot)
  const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()

  const deliveryOpts = cycleInfo.activeCycle === 'midweek'
    ? [{ key: 'wednesday', label: 'Wednesday', badge: null as string | null }]
    : [
        { key: 'sunday_5pm',  label: 'Sunday — by 5pm', badge: null as string | null },
        ...(subtotal >= FREE_DELIVERY_THRESHOLD ? [{
          key: 'sunday_free', label: 'Sunday — 5–10pm', badge: 'Free' as string | null,
        }] : []),
        { key: 'monday',      label: 'Monday',           badge: null as string | null },
      ]

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setField(key: keyof FormData, value: string) {
    const next = { ...form, [key]: value }
    setForm(next)
    saveForm(next)
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function setDeliveryOption(key: string) {
    const next = { ...form, deliveryDay: key, deliverySlot: '' }
    setForm(next)
    saveForm(next)
    setErrors(prev => ({ ...prev, deliveryDay: undefined, deliverySlot: undefined }))
  }

  function setDeliverySlot(slot: string) {
    const next = { ...form, deliverySlot: slot }
    setForm(next)
    saveForm(next)
    if (errors.deliverySlot) setErrors(prev => ({ ...prev, deliverySlot: undefined }))
  }

  function focus(field: string) { setFocusedField(field) }
  function blur()               { setFocusedField(null) }
  function isFocused(field: string) { return focusedField === field }

  function handleContinue() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setStep(2)
    window.scrollTo(0, 0)
  }

  function handleBack() {
    if (step === 1) {
      router.push('/')
      return
    }
    setStep(1)
    window.scrollTo(0, 0)
  }

  async function handlePlaceOrder() {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          addressBuilding: form.addrBuilding,
          addressStreet: form.addrStreet,
          addressApartment: form.addrApartment,
          addressLandmark: form.addrLandmark,
          zone: Number(form.zone),
          deliveryDay: form.deliveryDay,
          deliverySlot: form.deliverySlot,
          notes: form.notes || null,
          cart: cart.map(entry => ({
            id: entry.id,
            variant: entry.variant,
            meatType: entry.meatType,
            quantity: entry.quantity,
          })),
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Something went wrong placing your order. Please try again.')

      clearCart()
      setOrderRef(result.orderRef)
      setSuccessEmail(form.email)
      setIsSuccess(true)
      window.scrollTo(0, 0)

    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong placing your order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* Page header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: 26,
              fontWeight: 400,
              color: 'var(--text-primary)',
              textAlign: 'center',
            }}>
              Mali&apos;s Meals
            </span>
          </Link>
        </div>

        <button
          onClick={handleBack}
          onMouseEnter={event => { event.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={event => { event.currentTarget.style.color = 'var(--text-tertiary)' }}
          style={{
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 13,
            fontWeight: 400,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 24,
          }}
        >
          ← Back
        </button>

        {/* ── STEP 1 — Details ────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <h2 style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '0 0 24px',
            }}>
              Your details
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Field label="First name" error={errors.firstName} controlId="first-name">
                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  aria-invalid={Boolean(errors.firstName)}
                  aria-describedby={errors.firstName ? 'first-name-error' : undefined}
                  value={form.firstName}
                  onChange={e => setField('firstName', e.target.value)}
                  onFocus={() => focus('firstName')}
                  onBlur={blur}
                  style={{
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 16,
                    color: 'var(--text-primary)',
                    background: 'var(--surface-raised)',
                    border: `1px solid ${errors.firstName ? 'var(--accent-terracotta)' : isFocused('firstName') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    minHeight: 44,
                    outline: isFocused('firstName') ? '2px solid var(--brand-green)' : 'none',
                    outlineOffset: 2,
                    width: '100%',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                />
              </Field>
              <Field label="Last name" error={errors.lastName} controlId="last-name">
                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  aria-invalid={Boolean(errors.lastName)}
                  aria-describedby={errors.lastName ? 'last-name-error' : undefined}
                  value={form.lastName}
                  onChange={e => setField('lastName', e.target.value)}
                  onFocus={() => focus('lastName')}
                  onBlur={blur}
                  style={{
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 16,
                    color: 'var(--text-primary)',
                    background: 'var(--surface-raised)',
                    border: `1px solid ${errors.lastName ? 'var(--accent-terracotta)' : isFocused('lastName') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    minHeight: 44,
                    outline: isFocused('lastName') ? '2px solid var(--brand-green)' : 'none',
                    outlineOffset: 2,
                    width: '100%',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                />
              </Field>
            </div>

            <Field label="Email address" error={errors.email} controlId="email">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                onFocus={() => focus('email')}
                onBlur={blur}
                style={{
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-raised)',
                  border: `1px solid ${errors.email ? 'var(--accent-terracotta)' : isFocused('email') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  minHeight: 44,
                  outline: isFocused('email') ? '2px solid var(--brand-green)' : 'none',
                  outlineOffset: 2,
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            <Field
              label="Phone number"
              error={errors.phone}
              hint="This is the number our rider will contact you on. International? Type your full number e.g. +447911123456"
              controlId="phone"
            >
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-hint phone-error' : 'phone-hint'}
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                onFocus={() => focus('phone')}
                onBlur={blur}
                style={{
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-raised)',
                  border: `1px solid ${errors.phone ? 'var(--accent-terracotta)' : isFocused('phone') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  minHeight: 44,
                  outline: isFocused('phone') ? '2px solid var(--brand-green)' : 'none',
                  outlineOffset: 2,
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            <div style={{ height: 12 }} />

            <h2 style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '0 0 24px',
            }}>
              Delivery address
            </h2>

            <Field label="Building / Estate name" error={errors.addrBuilding} controlId="address-building">
              <input
                id="address-building"
                name="addressBuilding"
                type="text"
                autoComplete="address-line1"
                required
                aria-invalid={Boolean(errors.addrBuilding)}
                aria-describedby={errors.addrBuilding ? 'address-building-error' : undefined}
                value={form.addrBuilding}
                onChange={e => setField('addrBuilding', e.target.value)}
                onFocus={() => focus('addrBuilding')}
                onBlur={blur}
                style={{
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-raised)',
                  border: `1px solid ${errors.addrBuilding ? 'var(--accent-terracotta)' : isFocused('addrBuilding') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  minHeight: 44,
                  outline: isFocused('addrBuilding') ? '2px solid var(--brand-green)' : 'none',
                  outlineOffset: 2,
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            <Field label="Street address" error={errors.addrStreet} controlId="address-street">
              <input
                id="address-street"
                name="addressStreet"
                type="text"
                autoComplete="address-line2"
                required
                aria-invalid={Boolean(errors.addrStreet)}
                aria-describedby={errors.addrStreet ? 'address-street-error' : undefined}
                value={form.addrStreet}
                onChange={e => setField('addrStreet', e.target.value)}
                onFocus={() => focus('addrStreet')}
                onBlur={blur}
                style={{
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-raised)',
                  border: `1px solid ${errors.addrStreet ? 'var(--accent-terracotta)' : isFocused('addrStreet') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  minHeight: 44,
                  outline: isFocused('addrStreet') ? '2px solid var(--brand-green)' : 'none',
                  outlineOffset: 2,
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            <Field label="Apartment / House number" error={errors.addrApartment} controlId="address-apartment">
              <input
                id="address-apartment"
                name="addressApartment"
                type="text"
                autoComplete="address-line3"
                required
                aria-invalid={Boolean(errors.addrApartment)}
                aria-describedby={errors.addrApartment ? 'address-apartment-error' : undefined}
                value={form.addrApartment}
                onChange={e => setField('addrApartment', e.target.value)}
                onFocus={() => focus('addrApartment')}
                onBlur={blur}
                style={{
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-raised)',
                  border: `1px solid ${errors.addrApartment ? 'var(--accent-terracotta)' : isFocused('addrApartment') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  minHeight: 44,
                  outline: isFocused('addrApartment') ? '2px solid var(--brand-green)' : 'none',
                  outlineOffset: 2,
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            <Field
              label={<>Landmark <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></>}
              hint="Helps our rider find you"
              controlId="address-landmark"
            >
              <input
                id="address-landmark"
                name="addressLandmark"
                type="text"
                autoComplete="off"
                aria-describedby="address-landmark-hint"
                value={form.addrLandmark}
                onChange={e => setField('addrLandmark', e.target.value)}
                onFocus={() => focus('addrLandmark')}
                onBlur={blur}
                placeholder="e.g. Next to Chandarana, opposite Total petrol station"
                style={{
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-raised)',
                  border: `1px solid ${isFocused('addrLandmark') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  minHeight: 44,
                  outline: isFocused('addrLandmark') ? '2px solid var(--brand-green)' : 'none',
                  outlineOffset: 2,
                  width: '100%',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            {/* Delivery zone */}
            <Field label="Delivery zone" error={errors.zone}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ZONE_DATA.map(z => {
                  const selected = form.zone === z.value
                  return (
                    <label
                      key={z.value}
                      style={{
                        display: 'block',
                        background: selected ? 'var(--brand-green-soft)' : 'var(--surface-raised)',
                        border: `1px solid ${selected ? 'var(--brand-green-hover)' : errors.zone ? 'var(--accent-terracotta)' : 'var(--border-strong)'}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        outline: selected ? '2px solid var(--brand-green)' : 'none',
                        outlineOffset: 2,
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
                      <div style={{ marginBottom: 3 }}>
                        <span style={{
                          fontFamily: 'var(--font-display), serif',
                          fontSize: 16,
                          color: 'var(--text-primary)',
                        }}>
                          Zone {z.value}
                        </span>
                      </div>
                      <span style={{
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-ui), sans-serif',
                        fontSize: 12,
                        fontWeight: 400,
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}>
                        {z.areas}
                      </span>
                    </label>
                  )
                })}
              </div>
            </Field>

            {/* Delivery options */}
            <Field label="Delivery option" error={errors.deliveryDay}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deliveryOpts.map(opt => {
                  const selected = form.deliveryDay === opt.key
                  return (
                    <label
                      key={opt.key}
                      style={{
                        display: 'block',
                        background: selected ? 'var(--brand-green-soft)' : 'var(--surface-raised)',
                        border: `1px solid ${selected ? 'var(--brand-green-hover)' : errors.deliveryDay ? 'var(--accent-terracotta)' : 'var(--border-strong)'}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        outline: selected ? '2px solid var(--brand-green)' : 'none',
                        outlineOffset: 2,
                      }}
                    >
                      <input
                        type="radio"
                        name="deliveryOption"
                        value={opt.key}
                        checked={selected}
                        onChange={() => setDeliveryOption(opt.key)}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: 'var(--font-display), serif',
                            fontSize: 15,
                            color: 'var(--text-primary)',
                          }}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span style={{
                              fontFamily: 'var(--font-ui), sans-serif',
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--brand-green-hover)',
                              background: 'var(--brand-green-soft)',
                              border: '1px solid var(--brand-green-hover)',
                              borderRadius: 4,
                              padding: '1px 6px',
                              letterSpacing: '0.04em',
                            }}>
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {!form.zone ? (
                          <span style={{
                            fontFamily: 'var(--font-ui), sans-serif',
                            fontSize: 12,
                            fontStyle: 'italic',
                            color: 'var(--text-tertiary)',
                          }}>
                            Select a zone first
                          </span>
                        ) : opt.key === 'sunday_free' ? (
                          <span style={{
                            fontFamily: 'var(--font-display), serif',
                            fontSize: 15,
                            color: 'var(--text-primary)',
                            flexShrink: 0,
                            marginLeft: 12,
                          }}>
                            Free
                          </span>
                        ) : (
                          <span style={{
                            fontFamily: 'var(--font-display), serif',
                            fontSize: 15,
                            color: 'var(--text-primary)',
                            flexShrink: 0,
                            marginLeft: 12,
                          }}>
                            {fmt(rawFee)}
                            <span style={{
                              color: 'var(--text-tertiary)',
                              fontFamily: 'var(--font-ui), sans-serif',
                              fontSize: 12,
                              fontWeight: 400,
                              marginLeft: 4,
                            }}>
                              fee
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Monday time slot pills */}
                      {opt.key === 'monday' && selected && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {SLOT_OPTIONS.map(slot => (
                              <button
                                key={slot.value}
                                type="button"
                                onClick={e => { e.preventDefault(); setDeliverySlot(slot.value) }}
                                style={{
                                  background: form.deliverySlot === slot.value ? 'var(--brand-green-soft)' : 'var(--surface-raised)',
                                  color: 'var(--text-primary)',
                                  border: `1px solid ${form.deliverySlot === slot.value ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                                  borderRadius: 8,
                                  padding: '6px 14px',
                                  fontFamily: 'var(--font-ui), sans-serif',
                                  fontSize: 13,
                                  fontWeight: form.deliverySlot === slot.value ? 600 : 500,
                                  outline: form.deliverySlot === slot.value ? '2px solid var(--brand-green)' : 'none',
                                  outlineOffset: 2,
                                  cursor: 'pointer',
                                }}
                              >
                                {slot.label}
                              </button>
                            ))}
                          </div>
                          {errors.deliverySlot && (
                            <span style={{
                              fontFamily: 'var(--font-ui), sans-serif',
                              fontSize: 12,
                              color: 'var(--accent-terracotta)',
                              display: 'block',
                              marginTop: 6,
                            }}>
                              {errors.deliverySlot}
                            </span>
                          )}
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            </Field>

            {/* Notes */}
            <Field label="Order notes (optional)" controlId="order-notes">
              <textarea
                id="order-notes"
                name="notes"
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                onFocus={() => focus('notes')}
                onBlur={blur}
                rows={3}
                style={{
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-raised)',
                  border: `1px solid ${isFocused('notes') ? 'var(--brand-green-hover)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  minHeight: 92,
                  outline: isFocused('notes') ? '2px solid var(--brand-green)' : 'none',
                  outlineOffset: 2,
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            <button
              onClick={handleContinue}
              style={{
                background: 'var(--brand-green)',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: 8,
                padding: '14px 24px',
                minHeight: 48,
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                marginTop: 4,
              }}
            >
              Continue to review
            </button>

          </div>
        )}

        {/* ── STEP 2 — Review ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <h2 style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '0 0 24px',
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

              {/* Mains */}
              {mains.length > 0 && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--text-tertiary)',
                    marginBottom: 10,
                  }}>
                    Mains
                  </div>
                  {mains.map(entry => (
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
                        <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {entry.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {variantLabel(entry)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {entry.quantity} × {fmt(entry.unitPrice)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 16, color: 'var(--text-primary)', marginTop: 2 }}>
                          {fmt(entry.unitPrice * entry.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Salads */}
              {salads.length > 0 && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--text-tertiary)',
                    marginBottom: 10,
                  }}>
                    Salads
                  </div>
                  {salads.map(entry => (
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
                        <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {entry.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {variantLabel(entry)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {entry.quantity} × {fmt(entry.unitPrice)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 16, color: 'var(--text-primary)', marginTop: 2 }}>
                          {fmt(entry.unitPrice * entry.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Chef's special */}
              {specials.length > 0 && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--text-tertiary)',
                    marginBottom: 10,
                  }}>
                    Chef&apos;s special
                  </div>
                  {specials.map(entry => (
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
                        fontFamily: 'var(--font-display), serif',
                        fontSize: 16,
                        color: 'var(--text-primary)',
                        flex: 1,
                      }}>
                        {entry.name}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {entry.quantity} × {fmt(entry.unitPrice)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 16, color: 'var(--text-primary)', marginTop: 2 }}>
                          {fmt(entry.unitPrice * entry.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Add-ons */}
              {addons.length > 0 && (
                <>
                  <div style={{
                    fontFamily: 'var(--font-ui), sans-serif',
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
                        fontFamily: 'var(--font-display), serif',
                        fontSize: 16,
                        color: 'var(--text-primary)',
                        flex: 1,
                      }}>
                        {entry.name}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-ui), sans-serif',
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                        }}>
                          {entry.quantity} × {fmt(entry.unitPrice)}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-display), serif',
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
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                  }}>
                    Subtotal
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display), serif',
                    fontSize: 16,
                    color: 'var(--text-primary)',
                  }}>
                    {fmt(subtotal)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{
                      fontFamily: 'var(--font-ui), sans-serif',
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                    }}>
                      Delivery
                    </span>
                    {isFreeWindow && (
                      <span style={{
                        fontFamily: 'var(--font-ui), sans-serif',
                        fontSize: 12,
                        color: 'var(--accent-forest)',
                        marginLeft: 8,
                      }}>
                        Free delivery applied ✓
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-display), serif',
                    fontSize: 16,
                    color: isFreeWindow ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    textDecoration: isFreeWindow ? 'line-through' : 'none',
                  }}>
                    {fmt(rawFee)}
                  </span>
                </div>

                {isFreeWindow && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span />
                    <span style={{
                      fontFamily: 'var(--font-display), serif',
                      fontSize: 16,
                      color: 'var(--text-primary)',
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
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    Total
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display), serif',
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
                  fontFamily: 'var(--font-display), serif',
                  fontSize: 17,
                  color: 'var(--text-primary)',
                }}>
                  Delivery details
                </span>
                <button
                  onClick={() => { setStep(1); window.scrollTo(0, 0) }}
                  style={{
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 13,
                    color: 'var(--brand-green-hover)',
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
                  { label: 'Name',      value: fullName },
                  { label: 'Phone',     value: form.phone },
                  { label: 'Email',     value: form.email },
                  { label: 'Building',  value: form.addrBuilding },
                  { label: 'Street',    value: form.addrStreet },
                  { label: 'Apt/House', value: form.addrApartment },
                  ...(form.addrLandmark ? [{ label: 'Landmark', value: form.addrLandmark }] : []),
                  { label: 'Zone',      value: zoneData ? `Zone ${zoneData.value} — ${zoneData.areas}` : '' },
                  { label: 'Delivery',  value: dayLabel },
                  ...(form.notes ? [{ label: 'Notes', value: form.notes }] : []),
                ]).map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 12 }}>
                    <span style={{
                      fontFamily: 'var(--font-ui), sans-serif',
                      fontSize: 13,
                      color: 'var(--text-tertiary)',
                      width: 72,
                      flexShrink: 0,
                    }}>
                      {row.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-ui), sans-serif',
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

            <div style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '18px 20px',
            }}>
              <p style={{
                fontFamily: 'var(--font-display), serif',
                fontSize: 18,
                color: 'var(--text-primary)',
                margin: '0 0 8px',
              }}>
                Payment
              </p>
              <p style={{
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                After you place the order, your confirmation email will include the M-Pesa payment instructions for {fmt(total)}. Payment is completed before dispatch.
              </p>
            </div>

            {/* Submit error */}
            {submitError && (
              <p style={{
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 13,
                color: 'var(--accent-terracotta)',
                margin: 0,
                textAlign: 'center',
              }}>
                {submitError}
              </p>
            )}

            <span style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-ui), sans-serif',
              fontSize: 12,
              fontWeight: 400,
              textAlign: 'center',
              display: 'block',
              marginBottom: 12,
            }}>
              You won&apos;t be charged until Mali confirms your order
            </span>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              style={{
                background: isSubmitting ? 'var(--text-tertiary)' : 'var(--brand-green)',
                color: 'var(--text-primary)',
                minHeight: 48,
                border: 'none',
                borderRadius: 8,
                padding: '16px 24px',
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 16,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                width: '100%',
              }}
            >
              {isSubmitting ? 'Placing order…' : 'Place order'}
            </button>

          </div>
        )}

      </div>
    </>
  )
}
