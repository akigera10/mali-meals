'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MenuItem = {
  id: string
  name: string
  description: string | null
  category: string
  base_price: number
  meat_upgrade_price: number | null
  meat_upgrade_type: 'beef' | 'chicken' | 'both' | null
  is_sold_out: boolean
}

type ProteinAddon = {
  id: string
  name: string
  price: number
  is_sold_out: boolean
}

type CartEntry = {
  id: string        // `${dishId}:vegetarian`, `${dishId}:meat`, or `addon:${addonId}`
  name: string
  variant: 'vegetarian' | 'meat' | 'addon'
  unitPrice: number
  quantity: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Ksh\u00a0${n.toLocaleString('en-KE')}`
}

function meatLabel(type: string | null): string {
  if (type === 'beef') return 'beef'
  if (type === 'chicken') return 'chicken'
  if (type === 'both') return 'beef or chicken'
  return 'meat'
}

// ─── Qty control ──────────────────────────────────────────────────────────────

function Qty({
  qty,
  onInc,
  onDec,
}: {
  qty: number
  onInc: () => void
  onDec: () => void
}) {
  if (qty === 0) {
    return (
      <button
        onClick={onInc}
        style={{
          background: 'var(--brand-gold)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '7px 18px',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          letterSpacing: '0.02em',
          flexShrink: 0,
        }}
      >
        Add
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <button
        onClick={onDec}
        aria-label="Remove one"
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '1.5px solid var(--border-strong)',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1,
        }}
      >−</button>
      <span style={{
        fontFamily: 'var(--font-fraunces), serif',
        fontSize: 16,
        minWidth: 18,
        textAlign: 'center',
        color: 'var(--text-primary)',
      }}>
        {qty}
      </span>
      <button
        onClick={onInc}
        aria-label="Add one"
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: 'none',
          background: 'var(--brand-gold)',
          cursor: 'pointer',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, lineHeight: 1,
        }}
      >+</button>
    </div>
  )
}

// ─── Dish card ─────────────────────────────────────────────────────────────────

function DishCard({
  dish,
  getQty,
  adjust,
}: {
  dish: MenuItem
  getQty: (key: string) => number
  adjust: (entry: Omit<CartEntry, 'quantity'>, delta: number) => void
}) {
  const soldOut = dish.is_sold_out
  const hasMeat = dish.meat_upgrade_price != null && dish.meat_upgrade_type != null
  const meatPrice = dish.base_price + (dish.meat_upgrade_price ?? 0)
  const meat = meatLabel(dish.meat_upgrade_type)
  const vegKey = `${dish.id}:vegetarian`
  const meatKey = `${dish.id}:meat`

  return (
    <article
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 20,
        opacity: soldOut ? 0.5 : 1,
      }}
    >
      {/* Name + sold-out badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <h3 style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontSize: 19,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: 0,
          lineHeight: 1.3,
          flex: 1,
        }}>
          {dish.name}
        </h3>
        {soldOut && (
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--text-tertiary)',
            background: 'var(--surface-sunken)',
            borderRadius: 4,
            padding: '3px 7px',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
          }}>
            Sold out
          </span>
        )}
      </div>

      {/* Description / allergy / spice notes */}
      {dish.description && (
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 13,
          color: 'var(--text-secondary)',
          margin: '6px 0 0',
          lineHeight: 1.55,
        }}>
          {dish.description}
        </p>
      )}

      {/* Price rows + quantity controls */}
      {!soldOut && (
        <div style={{
          marginTop: 14,
          borderTop: '1px solid var(--border)',
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 10,
        }}>
          {/* Vegetarian row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontSize: 18,
                color: 'var(--brand-gold)',
              }}>
                {fmt(dish.base_price)}
              </span>
              {hasMeat && (
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                }}>
                  vegetarian
                </span>
              )}
            </div>
            <Qty
              qty={getQty(vegKey)}
              onInc={() => adjust({ id: vegKey, name: dish.name, variant: 'vegetarian', unitPrice: dish.base_price }, 1)}
              onDec={() => adjust({ id: vegKey, name: dish.name, variant: 'vegetarian', unitPrice: dish.base_price }, -1)}
            />
          </div>

          {/* Meat row — shows full price (base + upgrade), not the upgrade cost */}
          {hasMeat && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontSize: 18,
                  color: 'var(--text-primary)',
                }}>
                  {fmt(meatPrice)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                }}>
                  with {meat}
                </span>
              </div>
              <Qty
                qty={getQty(meatKey)}
                onInc={() => adjust({ id: meatKey, name: dish.name, variant: 'meat', unitPrice: meatPrice }, 1)}
                onDec={() => adjust({ id: meatKey, name: dish.name, variant: 'meat', unitPrice: meatPrice }, -1)}
              />
            </div>
          )}
        </div>
      )}

      {/* Sold out: show price greyed, no controls */}
      {soldOut && (
        <p style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontSize: 18,
          color: 'var(--text-tertiary)',
          margin: '12px 0 0',
        }}>
          {fmt(dish.base_price)}
        </p>
      )}
    </article>
  )
}

// ─── Addon card ────────────────────────────────────────────────────────────────

function AddonCard({
  addon,
  getQty,
  adjust,
}: {
  addon: ProteinAddon
  getQty: (key: string) => number
  adjust: (entry: Omit<CartEntry, 'quantity'>, delta: number) => void
}) {
  const key = `addon:${addon.id}`
  const soldOut = addon.is_sold_out

  return (
    <div style={{
      background: 'var(--surface-raised)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      opacity: soldOut ? 0.5 : 1,
    }}>
      <div>
        <span style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontSize: 16,
          color: 'var(--text-primary)',
        }}>
          {addon.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-fraunces), serif',
          fontSize: 15,
          color: 'var(--brand-gold)',
          marginLeft: 12,
        }}>
          {fmt(addon.price)}
        </span>
      </div>
      {soldOut ? (
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--text-tertiary)',
          background: 'var(--surface-sunken)',
          borderRadius: 4,
          padding: '3px 7px',
          flexShrink: 0,
        }}>
          Sold out
        </span>
      ) : (
        <Qty
          qty={getQty(key)}
          onInc={() => adjust({ id: key, name: addon.name, variant: 'addon', unitPrice: addon.price }, 1)}
          onDec={() => adjust({ id: key, name: addon.name, variant: 'addon', unitPrice: addon.price }, -1)}
        />
      )}
    </div>
  )
}

// ─── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-fraunces), serif',
      fontSize: 28,
      fontWeight: 400,
      color: 'var(--text-primary)',
      margin: '0 0 20px',
      paddingBottom: 12,
      borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </h2>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MenuClient({
  menuItems,
  addons,
}: {
  menuItems: MenuItem[]
  addons: ProteinAddon[]
}) {
  const [cart, setCart] = useState<CartEntry[]>([])

  const mains = menuItems.filter(m => m.category === 'mains')
  const salads = menuItems.filter(m => m.category === 'salads')

  const cartTotal = cart.reduce((s, e) => s + e.unitPrice * e.quantity, 0)
  const cartCount = cart.reduce((s, e) => s + e.quantity, 0)

  function getQty(key: string): number {
    return cart.find(e => e.id === key)?.quantity ?? 0
  }

  function adjust(entry: Omit<CartEntry, 'quantity'>, delta: number) {
    setCart(prev => {
      const existing = prev.find(e => e.id === entry.id)
      if (!existing) {
        if (delta <= 0) return prev
        return [...prev, { ...entry, quantity: 1 }]
      }
      const next = existing.quantity + delta
      if (next <= 0) return prev.filter(e => e.id !== entry.id)
      return prev.map(e => e.id === entry.id ? { ...e, quantity: next } : e)
    })
  }

  return (
    <>
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '40px 20px',
        paddingBottom: cartCount > 0 ? 100 : 56,
      }}>

        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: 52 }}>
          <h1 style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: 'clamp(36px, 8vw, 52px)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.1,
          }}>
            Mali&apos;s Meals
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 16,
            color: 'var(--text-secondary)',
            margin: '8px 0 0',
          }}>
            Home-cooked meals, delivered Sunday evenings in Nairobi
          </p>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--brand-gold)',
            margin: '6px 0 0',
            letterSpacing: '0.01em',
          }}>
            Order by Friday 2 pm · Sunday &amp; Monday delivery
          </p>
        </header>

        {/* Mains */}
        <section style={{ marginBottom: 52 }}>
          <SectionHeading>Mains</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mains.map(dish => (
              <DishCard key={dish.id} dish={dish} getQty={getQty} adjust={adjust} />
            ))}
          </div>
        </section>

        {/* Salads */}
        <section style={{ marginBottom: 52 }}>
          <SectionHeading>Salads</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {salads.map(dish => (
              <DishCard key={dish.id} dish={dish} getQty={getQty} adjust={adjust} />
            ))}
          </div>
        </section>

        {/* Protein add-ons */}
        {addons.length > 0 && (
          <section>
            <SectionHeading>Protein add-ons</SectionHeading>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13,
              color: 'var(--text-secondary)',
              margin: '-8px 0 16px',
              lineHeight: 1.5,
            }}>
              Add to any dish, or order on their own.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {addons.map(addon => (
                <AddonCard key={addon.id} addon={addon} getQty={getQty} adjust={adjust} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div
          role="region"
          aria-label="Order summary"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--surface-raised)',
            borderTop: '1px solid var(--border-strong)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            zIndex: 50,
          }}
        >
          <div>
            <span style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}>
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
            <span style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontSize: 22,
              color: 'var(--text-primary)',
              marginLeft: 12,
            }}>
              {fmt(cartTotal)}
            </span>
          </div>
          <button
            style={{
              background: 'var(--brand-gold)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Checkout →
          </button>
        </div>
      )}
    </>
  )
}
