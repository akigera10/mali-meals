'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/app/context/CartContext'
import type { CartEntry } from '@/app/context/CartContext'

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
  is_spicy: boolean
  is_freezer_friendly: boolean
  allergens: string[]
  is_family_friendly: boolean
}

type ProteinAddon = {
  id: string
  name: string
  price: number
  is_sold_out: boolean
}

type Special = {
  id: string
  name: string
  description: string
  price: number
  is_sold_out: boolean
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const ALLERGEN_SHORT: Record<string, string> = {
  dairy:   'D',
  nuts:    'N',
  soy:     'S',
  coconut: 'C',
}

const ALLERGEN_LABEL: Record<string, string> = {
  dairy:   'Contains dairy',
  nuts:    'Contains nuts',
  soy:     'Contains soy',
  coconut: 'Contains coconut',
}

type BadgeSpec = {
  key: string
  short: string
  label: string
  bg: string
}

function buildBadges(dish: MenuItem): BadgeSpec[] {
  const badges: BadgeSpec[] = []
  for (const a of dish.allergens) {
    if (ALLERGEN_SHORT[a]) {
      badges.push({
        key: `allergen-${a}`,
        short: ALLERGEN_SHORT[a],
        label: ALLERGEN_LABEL[a] ?? `Contains ${a}`,
        bg: '#B5533C',
      })
    }
  }
  if (dish.is_freezer_friendly) {
    badges.push({ key: 'freezer', short: '❄', label: 'Freezer-friendly', bg: '#C8872E' })
  }
  if (dish.is_spicy) {
    badges.push({ key: 'spicy', short: '🌶', label: 'Mild spice', bg: '#C8872E' })
  }
  return badges
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [showMeatSelector, setShowMeatSelector] = useState(false)

  const soldOut = dish.is_sold_out
  const hasMeat = dish.meat_upgrade_price != null && dish.meat_upgrade_type != null
  const meatPrice = dish.base_price + (dish.meat_upgrade_price ?? 0)
  const meat = meatLabel(dish.meat_upgrade_type)
  const vegKey = `${dish.id}:vegetarian`
  const meatKey = `${dish.id}:meat`
  const beefKey = `${dish.id}:meat:beef`
  const chickenKey = `${dish.id}:meat:chicken`
  const badges = buildBadges(dish)

  const isBoth = dish.meat_upgrade_type === 'both'
  const beefQty = getQty(beefKey)
  const chickenQty = getQty(chickenKey)

  function meatRowLabel(): string {
    if (!isBoth) return `with ${meat}`
    if (beefQty > 0) return 'with beef'
    if (chickenQty > 0) return 'with chicken'
    return 'with beef or chicken'
  }

  function toggleTooltip(key: string) {
    setActiveTooltip(prev => prev === key ? null : key)
  }

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

      {/* Description */}
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

      {/* Allergen / property badges */}
      {badges.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
            {badges.map(b => (
              <button
                key={b.key}
                onClick={() => toggleTooltip(b.key)}
                aria-pressed={activeTooltip === b.key}
                style={{
                  background: b.bg,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 7px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  lineHeight: 1.6,
                }}
              >
                {b.short}
              </button>
            ))}
          </div>
          {activeTooltip && (
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              margin: '5px 0 0',
              lineHeight: 1.4,
            }}>
              {badges.find(b => b.key === activeTooltip)?.label}
            </p>
          )}
        </div>
      )}

      {/* Family friendly line */}
      {dish.is_family_friendly && (
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 13,
          color: 'var(--text-tertiary)',
          fontStyle: 'italic',
          margin: '6px 0 0',
          lineHeight: 1.4,
        }}>
          Great for families
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
              <span style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, color: 'var(--brand-gold)' }}>
                {fmt(dish.base_price)}
              </span>
              {hasMeat && (
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
                  vegetarian
                </span>
              )}
            </div>
            <Qty
              qty={getQty(vegKey)}
              onInc={() => adjust({ id: vegKey, name: dish.name, variant: 'vegetarian', category: dish.category as 'mains' | 'salads', unitPrice: dish.base_price }, 1)}
              onDec={() => adjust({ id: vegKey, name: dish.name, variant: 'vegetarian', category: dish.category as 'mains' | 'salads', unitPrice: dish.base_price }, -1)}
            />
          </div>

          {/* Meat row — shows full price (base + upgrade), not the upgrade cost */}
          {hasMeat && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, color: 'var(--text-primary)' }}>
                  {fmt(meatPrice)}
                </span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {meatRowLabel()}
                </span>
              </div>

              {/* Standard Qty for single-meat dishes */}
              {!isBoth && (
                <Qty
                  qty={getQty(meatKey)}
                  onInc={() => adjust({ id: meatKey, name: dish.name, variant: 'meat', meatType: dish.meat_upgrade_type, category: dish.category as 'mains' | 'salads', unitPrice: meatPrice }, 1)}
                  onDec={() => adjust({ id: meatKey, name: dish.name, variant: 'meat', meatType: dish.meat_upgrade_type, category: dish.category as 'mains' | 'salads', unitPrice: meatPrice }, -1)}
                />
              )}

              {/* Beef/chicken selector for 'both' dishes */}
              {isBoth && (
                <>
                  {beefQty === 0 && chickenQty === 0 && (
                    !showMeatSelector ? (
                      <button
                        onClick={() => setShowMeatSelector(true)}
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
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {(['beef', 'chicken'] as const).map(choice => (
                          <button
                            key={choice}
                            onClick={() => {
                              const key = choice === 'beef' ? beefKey : chickenKey
                              adjust({ id: key, name: `${dish.name} with ${choice}`, variant: 'meat', meatType: choice, category: dish.category as 'mains' | 'salads', unitPrice: meatPrice }, 1)
                              setShowMeatSelector(false)
                            }}
                            style={{
                              border: '1.5px solid var(--border-strong)',
                              background: 'transparent',
                              borderRadius: 6,
                              padding: '5px 12px',
                              fontFamily: 'var(--font-inter), sans-serif',
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              textTransform: 'capitalize' as const,
                            }}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {beefQty > 0 && (
                    <Qty
                      qty={beefQty}
                      onInc={() => adjust({ id: beefKey, name: `${dish.name} with beef`, variant: 'meat', meatType: 'beef', category: dish.category as 'mains' | 'salads', unitPrice: meatPrice }, 1)}
                      onDec={() => adjust({ id: beefKey, name: `${dish.name} with beef`, variant: 'meat', meatType: 'beef', category: dish.category as 'mains' | 'salads', unitPrice: meatPrice }, -1)}
                    />
                  )}

                  {chickenQty > 0 && (
                    <Qty
                      qty={chickenQty}
                      onInc={() => adjust({ id: chickenKey, name: `${dish.name} with chicken`, variant: 'meat', meatType: 'chicken', category: dish.category as 'mains' | 'salads', unitPrice: meatPrice }, 1)}
                      onDec={() => adjust({ id: chickenKey, name: `${dish.name} with chicken`, variant: 'meat', meatType: 'chicken', category: dish.category as 'mains' | 'salads', unitPrice: meatPrice }, -1)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sold out: show price greyed, no controls */}
      {soldOut && (
        <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, color: 'var(--text-tertiary)', margin: '12px 0 0' }}>
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
        <span style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 16, color: 'var(--text-primary)' }}>
          {addon.name}
        </span>
        <span style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 15, color: 'var(--brand-gold)', marginLeft: 12 }}>
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

// ─── Special card ──────────────────────────────────────────────────────────────

function SpecialCard({
  special,
  getQty,
  adjust,
}: {
  special: Special
  getQty: (key: string) => number
  adjust: (entry: Omit<CartEntry, 'quantity'>, delta: number) => void
}) {
  const key = `special:${special.id}`
  const soldOut = special.is_sold_out

  return (
    <article style={{
      background: 'var(--surface-raised)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 20,
      opacity: soldOut ? 0.5 : 1,
    }}>
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
          {special.name}
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

      {special.description && (
        <p style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 13,
          color: 'var(--text-secondary)',
          margin: '6px 0 0',
          lineHeight: 1.55,
        }}>
          {special.description}
        </p>
      )}

      {!soldOut ? (
        <div style={{
          marginTop: 14,
          borderTop: '1px solid var(--border)',
          paddingTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, color: 'var(--brand-gold)' }}>
            {fmt(special.price)}
          </span>
          <Qty
            qty={getQty(key)}
            onInc={() => adjust({ id: key, name: special.name, variant: 'special', unitPrice: special.price }, 1)}
            onDec={() => adjust({ id: key, name: special.name, variant: 'special', unitPrice: special.price }, -1)}
          />
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, color: 'var(--text-tertiary)', margin: '12px 0 0' }}>
          {fmt(special.price)}
        </p>
      )}
    </article>
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
  specials,
}: {
  menuItems: MenuItem[]
  addons: ProteinAddon[]
  specials: Special[]
}) {
  const { cart, adjust, getQty } = useCart()
  const router = useRouter()

  const mains = menuItems.filter(m => m.category === 'mains')
  const salads = menuItems.filter(m => m.category === 'salads')

  const cartTotal = cart.reduce((s, e) => s + e.unitPrice * e.quantity, 0)
  const cartCount = cart.reduce((s, e) => s + e.quantity, 0)

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
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            margin: '-8px 0 20px',
            fontStyle: 'italic',
            fontWeight: 400,
          }}>
            All mains served with a side salad
          </p>
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

        {/* Chef's special */}
        {specials.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <SectionHeading>Chef&apos;s special</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {specials.map(special => (
                <SpecialCard key={special.id} special={special} getQty={getQty} adjust={adjust} />
              ))}
            </div>
          </section>
        )}

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
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: 'var(--text-secondary)' }}>
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
            <span style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 22, color: 'var(--text-primary)', marginLeft: 12 }}>
              {fmt(cartTotal)}
            </span>
          </div>
          <button
            onClick={() => router.push('/checkout')}
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
