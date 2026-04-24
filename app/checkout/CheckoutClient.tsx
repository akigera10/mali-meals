'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/app/context/CartContext'
import { supabase } from '@/lib/supabase'

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
  return `Ksh\u00a0${n.toLocaleString('en-KE')}`
}

function buildAddress(f: FormData): string {
  const base = `${f.addrBuilding}, ${f.addrStreet}, ${f.addrApartment}`
  return f.addrLandmark ? `${base}\nNear ${f.addrLandmark}` : base
}

function buildDeliveryLabel(deliveryDay: string, deliverySlot: string): string {
  if (deliveryDay === 'sunday_5pm')  return 'Sunday — by 5pm'
  if (deliveryDay === 'sunday_free') return 'Sunday — 5–10pm (free delivery)'
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
  return match ? match[0] : 'with meat'
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

function inputStyle(hasError: boolean, focused = false): React.CSSProperties {
  return {
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: 14,
    color: 'var(--text-primary)',
    background: 'var(--surface-raised)',
    border: `1px solid ${hasError ? '#B5533C' : focused ? 'var(--brand-gold)' : 'var(--border-strong)'}`,
    borderRadius: 8,
    padding: '12px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, error, hint, children }: {
  label: React.ReactNode
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 13,
        fontWeight: 500,
        color: error ? '#B5533C' : 'var(--text-secondary)',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 12,
          fontStyle: 'italic',
          color: 'var(--text-tertiary)',
        }}>
          {hint}
        </span>
      )}
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
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    }}>
      <Link href="/" className="mali-menu-link" style={{
        position: 'absolute',
        left: 0,
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 13,
        color: 'var(--text-tertiary)',
        textDecoration: 'none',
      }}>
        ← Menu
      </Link>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutClient() {
  const { cart, clearCart, savedForm, saveForm } = useCart()
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
          margin: '0 0 24px',
        }}>
          Order received!
        </p>
        <div style={{
          background: 'var(--brand-gold-soft)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 20,
        }}>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            margin: '0 0 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Your order reference
          </p>
          <p style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: 34,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: '0 0 10px',
          }}>
            {orderRef}
          </p>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            Use this as your M-Pesa payment reference
          </p>
        </div>
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 14,
          color: 'var(--text-secondary)',
          margin: '0 0 32px',
          lineHeight: 1.6,
        }}>
          A confirmation email is on its way to {successEmail}.
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

  const dishes = cart.filter(e => e.variant !== 'addon' && e.variant !== 'special')
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

  const deliveryOpts = [
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

  async function handlePlaceOrder() {
    setIsSubmitting(true)
    setSubmitError(null)

    const formattedAddress = buildAddress(form)
    const dbDeliveryDay    = form.deliveryDay === 'monday' ? 'monday' : 'sunday'
    const dbDeliveryWindow = form.deliveryDay === 'sunday_5pm'  ? 'by_5pm'
                           : form.deliveryDay === 'sunday_free' ? 'free_5_10pm'
                           : form.deliverySlot || null

    // SQL required in Supabase before this works:
    // ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text NOT NULL DEFAULT '';
    // ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_building text;
    // ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_street text;
    // ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_apartment text;
    // ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_landmark text;
    // ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_window text;
    // ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot text;
    try {
      const orderPayload = {
        customer_name: fullName,
        customer_phone: form.phone,
        customer_email: form.email,
        delivery_address: formattedAddress,
        address_building: form.addrBuilding,
        address_street: form.addrStreet,
        address_apartment: form.addrApartment,
        address_landmark: form.addrLandmark || null,
        delivery_zone: Number(form.zone),
        delivery_day: dbDeliveryDay,
        delivery_window: dbDeliveryWindow,
        delivery_slot: form.deliverySlot || null,
        notes: form.notes || null,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: total,
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id, order_ref')
        .single()

      if (orderError) {
        console.error('Order insert error:', orderError)
        console.error('Order payload:', orderPayload)
        throw orderError
      }

      const orderId = orderData.id
      const ref = orderData.order_ref

      const insertedItemIds: string[] = []

      for (const entry of dishes) {
        const menuItemId = entry.id.split(':')[0]
        const variant = entry.variant === 'meat' ? 'meat' : 'vegetarian'

        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            menu_item_id: menuItemId,
            quantity: entry.quantity,
            variant,
            unit_price: entry.unitPrice,
          })
          .select('id')
          .single()

        if (itemError) throw itemError
        insertedItemIds.push(itemData.id)
      }

      for (const entry of specials) {
        const specialId = entry.id.replace('special:', '')

        const { error: specialError } = await supabase
          .from('order_specials')
          .insert({
            order_id: orderId,
            special_id: specialId,
            quantity: entry.quantity,
            unit_price: entry.unitPrice,
          })

        if (specialError) throw specialError
      }

      if (addons.length > 0 && insertedItemIds.length > 0) {
        const firstItemId = insertedItemIds[0]

        for (const entry of addons) {
          const addonId = entry.id.replace('addon:', '')

          const { error: addonError } = await supabase
            .from('order_item_addons')
            .insert({
              order_item_id: firstItemId,
              addon_id: addonId,
              quantity: entry.quantity,
              unit_price: entry.unitPrice,
            })

          if (addonError) throw addonError
        }
      }

      fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ref: ref,
          customer_name: fullName,
          customer_first_name: form.firstName.trim(),
          customer_email: form.email,
          items: cart,
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: total,
          delivery_zone: Number(form.zone),
          delivery_day: form.deliveryDay,
          delivery_slot: form.deliverySlot || null,
          delivery_address: formattedAddress,
          address_building: form.addrBuilding,
          address_street: form.addrStreet,
          address_apartment: form.addrApartment,
          address_landmark: form.addrLandmark || null,
          notes: form.notes || null,
        }),
      })

      clearCart()
      setOrderRef(ref)
      setSuccessEmail(form.email)
      setIsSuccess(true)
      window.scrollTo(0, 0)

    } catch (err) {
      console.error('Order submission error:', err)
      setSubmitError('Something went wrong placing your order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const sectionTitle = (text: string) => (
    <h2 style={{
      fontFamily: 'var(--font-fraunces), serif',
      fontSize: 22,
      fontWeight: 400,
      color: 'var(--text-primary)',
      margin: 0,
    }}>
      {text}
    </h2>
  )

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .mali-name-grid { grid-template-columns: 1fr !important; }
        }
        .mali-menu-link:hover { text-decoration: underline; }
      `}</style>

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

        {/* ── STEP 1 — Details ────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {sectionTitle('Your details')}

            <div
              className="mali-name-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
            >
              <Field label="First name" error={errors.firstName}>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setField('firstName', e.target.value)}
                  onFocus={() => focus('firstName')}
                  onBlur={blur}
                  style={inputStyle(!!errors.firstName, isFocused('firstName'))}
                />
              </Field>
              <Field label="Last name" error={errors.lastName}>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setField('lastName', e.target.value)}
                  onFocus={() => focus('lastName')}
                  onBlur={blur}
                  style={inputStyle(!!errors.lastName, isFocused('lastName'))}
                />
              </Field>
            </div>

            <Field label="Email address" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                onFocus={() => focus('email')}
                onBlur={blur}
                style={inputStyle(!!errors.email, isFocused('email'))}
              />
            </Field>

            <Field
              label="Phone number"
              error={errors.phone}
              hint="This is the number our rider will contact you on. International? Type your full number e.g. +447911123456"
            >
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                onFocus={() => focus('phone')}
                onBlur={blur}
                style={inputStyle(!!errors.phone, isFocused('phone'))}
              />
            </Field>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

            {sectionTitle('Delivery address')}

            <Field label="Building / Estate name" error={errors.addrBuilding}>
              <input
                type="text"
                value={form.addrBuilding}
                onChange={e => setField('addrBuilding', e.target.value)}
                onFocus={() => focus('addrBuilding')}
                onBlur={blur}
                style={inputStyle(!!errors.addrBuilding, isFocused('addrBuilding'))}
              />
            </Field>

            <Field label="Street address" error={errors.addrStreet}>
              <input
                type="text"
                value={form.addrStreet}
                onChange={e => setField('addrStreet', e.target.value)}
                onFocus={() => focus('addrStreet')}
                onBlur={blur}
                style={inputStyle(!!errors.addrStreet, isFocused('addrStreet'))}
              />
            </Field>

            <Field label="Apartment / House number" error={errors.addrApartment}>
              <input
                type="text"
                value={form.addrApartment}
                onChange={e => setField('addrApartment', e.target.value)}
                onFocus={() => focus('addrApartment')}
                onBlur={blur}
                style={inputStyle(!!errors.addrApartment, isFocused('addrApartment'))}
              />
            </Field>

            <Field
              label={<>Landmark <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></>}
              hint="Helps our rider find you"
            >
              <input
                type="text"
                value={form.addrLandmark}
                onChange={e => setField('addrLandmark', e.target.value)}
                onFocus={() => focus('addrLandmark')}
                onBlur={blur}
                placeholder="e.g. Next to Chandarana, opposite Total petrol station"
                style={inputStyle(false, isFocused('addrLandmark'))}
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
                      <div style={{ marginBottom: 3 }}>
                        <span style={{
                          fontFamily: 'var(--font-fraunces), serif',
                          fontSize: 16,
                          color: 'var(--text-primary)',
                        }}>
                          Zone {z.value}
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
                        background: selected ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
                        border: `1px solid ${selected ? 'var(--brand-gold)' : errors.deliveryDay ? '#B5533C' : 'var(--border-strong)'}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        cursor: 'pointer',
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
                            fontFamily: 'var(--font-fraunces), serif',
                            fontSize: 15,
                            color: 'var(--text-primary)',
                          }}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span style={{
                              fontFamily: 'var(--font-inter), sans-serif',
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--brand-gold-dark)',
                              background: 'var(--brand-gold-soft)',
                              border: '1px solid var(--brand-gold)',
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
                            fontFamily: 'var(--font-inter), sans-serif',
                            fontSize: 12,
                            fontStyle: 'italic',
                            color: 'var(--text-tertiary)',
                          }}>
                            Select a zone first
                          </span>
                        ) : opt.key === 'sunday_free' ? (
                          <span style={{
                            fontFamily: 'var(--font-fraunces), serif',
                            fontSize: 15,
                            color: 'var(--brand-gold)',
                            flexShrink: 0,
                            marginLeft: 12,
                          }}>
                            Free
                          </span>
                        ) : (
                          <span style={{
                            fontFamily: 'var(--font-fraunces), serif',
                            fontSize: 15,
                            color: selected ? 'var(--brand-gold-dark)' : 'var(--brand-gold)',
                            flexShrink: 0,
                            marginLeft: 12,
                          }}>
                            {fmt(rawFee)}
                          </span>
                        )}
                      </div>

                      {/* Monday time slot pills */}
                      {opt.key === 'monday' && selected && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {SLOT_OPTIONS.map(slot => (
                              <button
                                key={slot.value}
                                type="button"
                                onClick={e => { e.preventDefault(); setDeliverySlot(slot.value) }}
                                style={{
                                  background: form.deliverySlot === slot.value ? 'var(--brand-gold)' : '#fff',
                                  color: form.deliverySlot === slot.value ? '#fff' : 'var(--text-primary)',
                                  border: `1px solid ${form.deliverySlot === slot.value ? 'var(--brand-gold)' : 'var(--border-strong)'}`,
                                  borderRadius: 8,
                                  padding: '6px 14px',
                                  fontFamily: 'var(--font-inter), sans-serif',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                }}
                              >
                                {slot.label}
                              </button>
                            ))}
                          </div>
                          {errors.deliverySlot && (
                            <span style={{
                              fontFamily: 'var(--font-inter), sans-serif',
                              fontSize: 12,
                              color: '#B5533C',
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
            <Field label="Order notes (optional)">
              <textarea
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                onFocus={() => focus('notes')}
                onBlur={blur}
                rows={3}
                style={{
                  ...inputStyle(false, isFocused('notes')),
                  resize: 'vertical',
                  lineHeight: '1.5',
                }}
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

        {/* ── STEP 2 — Review ─────────────────────────────────────────────── */}
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
                    <div style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      marginTop: 2,
                    }}>
                      {variantLabel(entry)}
                    </div>
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

              {/* Chef's special */}
              {specials.length > 0 && (
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
                        fontFamily: 'var(--font-fraunces), serif',
                        fontSize: 16,
                        color: 'var(--text-primary)',
                        flex: 1,
                      }}>
                        {entry.name}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {entry.quantity} × {fmt(entry.unitPrice)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 16, color: 'var(--text-primary)', marginTop: 2 }}>
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
                    {isFreeWindow && (
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
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: 13,
                      color: 'var(--text-tertiary)',
                      width: 72,
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

            {/* Submit error */}
            {submitError && (
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13,
                color: '#B5533C',
                margin: 0,
                textAlign: 'center',
              }}>
                {submitError}
              </p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              style={{
                background: isSubmitting ? 'var(--text-tertiary)' : 'var(--brand-gold)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '16px 24px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 16,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                width: '100%',
              }}
            >
              {isSubmitting ? 'Placing order…' : 'Place order'}
            </button>

            <button
              onClick={() => { setStep(1); window.scrollTo(0, 0) }}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
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
    </>
  )
}
