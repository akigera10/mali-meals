'use client'

import { useState, useEffect } from 'react'
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
  is_active?: boolean
  is_sold_out: boolean
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const ALLERGEN_LABEL: Record<string, string> = {
  dairy:   'Dairy',
  nuts:    'Nuts',
  soy:     'Soy',
  coconut: 'Coconut',
  gluten:  'Gluten',
}

type BadgeSpec = {
  key: string
  label: string
  tone: 'allergen' | 'feature' | 'warning'
}

function buildBadges(dish: MenuItem): BadgeSpec[] {
  const badges: BadgeSpec[] = []
  for (const a of dish.allergens) {
    if (ALLERGEN_LABEL[a]) {
      badges.push({
        key: `allergen-${a}`,
        label: ALLERGEN_LABEL[a],
        tone: 'allergen',
      })
    }
  }
  if (dish.is_freezer_friendly) {
    badges.push({ key: 'freezer', label: 'Freezer', tone: 'feature' })
  }
  if (dish.is_spicy) {
    badges.push({ key: 'spicy', label: 'Spicy', tone: 'warning' })
  }
  if (dish.is_family_friendly) {
    badges.push({ key: 'family', label: 'Family', tone: 'feature' })
  }
  return badges
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-KE')
}

function meatLabel(type: string | null): string {
  if (type === 'beef') return 'beef'
  if (type === 'chicken') return 'chicken'
  if (type === 'both') return 'beef or chicken'
  return 'meat'
}

function shortDateLabel(date: string | null | undefined): string | null {
  if (!date) return null
  return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ─── Qty control ──────────────────────────────────────────────────────────────

function Qty({
  qty,
  onInc,
  onDec,
  compact = false,
}: {
  qty: number
  onInc: () => void
  onDec: () => void
  compact?: boolean
}) {
  if (qty === 0) {
    return (
      <button
        onClick={onInc}
        style={{
          background: 'var(--brand-green)',
          color: '#102015',
          border: 'none',
          borderRadius: 8,
          padding: compact ? '8px 14px' : '10px 20px',
          minHeight: compact ? 40 : 44,
          fontFamily: 'var(--font-ui), sans-serif',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          lineHeight: 1,
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
        fontFamily: 'var(--font-instrument-serif), serif',
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
          background: 'var(--brand-green)',
          cursor: 'pointer',
          color: '#102015',
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
          fontFamily: 'var(--font-instrument-serif), serif',
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
            fontFamily: 'var(--font-ui), sans-serif',
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
          fontFamily: 'var(--font-ui), sans-serif',
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
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
            {badges.map(b => (
              b.tone === 'feature' ? (
                <button
                  key={b.key}
                  onClick={() => toggleTooltip(b.key)}
                  aria-pressed={activeTooltip === b.key}
                  style={{
                    background: 'var(--surface-sunken)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '3px 8px',
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    lineHeight: 1.4,
                  }}
                >
                  {b.label}
                </button>
              ) : (
                <button
                  key={b.key}
                  onClick={() => toggleTooltip(b.key)}
                  aria-pressed={activeTooltip === b.key}
                  style={{
                    background: 'transparent',
                    color: 'var(--accent-terracotta)',
                    border: '1px solid var(--accent-terracotta)',
                    borderRadius: 4,
                    padding: '3px 8px',
                    fontFamily: 'var(--font-ui), sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    lineHeight: 1.4,
                  }}
                >
                  {b.label}
                </button>
              )
            ))}
          </div>
          {activeTooltip && (
            <p style={{
              fontFamily: 'var(--font-ui), sans-serif',
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

      {/* Price rows + quantity controls */}
      {!soldOut && (
        <div style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 0,
        }}>
          {/* Vegetarian row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 18, color: 'var(--text-primary)' }}>
                {fmt(dish.base_price)}
              </span>
              {hasMeat && (
                <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 18, color: 'var(--text-primary)' }}>
                  {fmt(meatPrice)}
                </span>
                <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 12, color: 'var(--text-tertiary)' }}>
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
                          background: 'var(--brand-green)',
                          color: '#102015',
                          border: 'none',
                          borderRadius: 8,
                          padding: '10px 20px',
                          minHeight: 44,
                          fontFamily: 'var(--font-ui), sans-serif',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          lineHeight: 1,
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
                              fontFamily: 'var(--font-ui), sans-serif',
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
        <p style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 18, color: 'var(--text-tertiary)', margin: '12px 0 0' }}>
          {fmt(dish.base_price)}
        </p>
      )}
    </article>
  )
}

// ─── Addon card ────────────────────────────────────────────────────────────────

function AddonRow({
  addon,
  isLast,
  getQty,
  adjust,
}: {
  addon: ProteinAddon
  isLast: boolean
  getQty: (key: string) => number
  adjust: (entry: Omit<CartEntry, 'quantity'>, delta: number) => void
}) {
  const key = `addon:${addon.id}`
  const soldOut = addon.is_sold_out

  if (isLast) {
    return (
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 48,
        opacity: soldOut ? 0.5 : 1,
      }}>
        <div>
          <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            {addon.name}
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-display), serif',
          fontSize: 15,
          fontWeight: 400,
          color: 'var(--text-primary)',
          marginLeft: 'auto',
          textAlign: 'right',
          flexShrink: 0,
        }}>
          {fmt(addon.price)}
        </span>
        {soldOut ? (
          <span style={{
            fontFamily: 'var(--font-ui), sans-serif',
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
            compact
          />
        )}
      </div>
    )
  }

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 48,
      opacity: soldOut ? 0.5 : 1,
    }}>
      <div>
        <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {addon.name}
        </span>
      </div>
      <span style={{
        fontFamily: 'var(--font-display), serif',
        fontSize: 15,
        fontWeight: 400,
        color: 'var(--text-primary)',
        marginLeft: 'auto',
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {fmt(addon.price)}
      </span>
      {soldOut ? (
        <span style={{
          fontFamily: 'var(--font-ui), sans-serif',
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
          compact
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
          fontFamily: 'var(--font-instrument-serif), serif',
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
            fontFamily: 'var(--font-ui), sans-serif',
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
          fontFamily: 'var(--font-ui), sans-serif',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span>
            <span style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 18, color: 'var(--text-primary)' }}>
              {fmt(special.price)}
            </span>
            <span style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-ui), sans-serif',
              fontSize: 13,
              fontWeight: 400,
              marginLeft: 6,
            }}>
              one serving
            </span>
          </span>
          <Qty
            qty={getQty(key)}
            onInc={() => adjust({ id: key, name: special.name, variant: 'special', unitPrice: special.price }, 1)}
            onDec={() => adjust({ id: key, name: special.name, variant: 'special', unitPrice: special.price }, -1)}
          />
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 18, color: 'var(--text-tertiary)', margin: '12px 0 0' }}>
          {fmt(special.price)}
          <span style={{
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 13,
            fontWeight: 400,
            marginLeft: 6,
          }}>
            one serving
          </span>
        </p>
      )}
    </article>
  )
}

// ─── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-instrument-serif), serif',
      fontSize: 28,
      fontWeight: 400,
      color: 'var(--text-primary)',
      margin: '0 0 20px',
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
  activeCycle,
  nextSundayDate,
  nextMondayDate,
  nextWednesdayDate,
}: {
  menuItems: MenuItem[]
  addons: ProteinAddon[]
  specials: Special[]
  activeCycle?: string | null
  nextSundayDate?: string | null
  nextMondayDate?: string | null
  nextWednesdayDate?: string | null
}) {
  const { cart, adjust, getQty, setCycleInfo } = useCart()
  const router = useRouter()

  useEffect(() => {
    setCycleInfo({
      activeCycle: activeCycle ?? null,
      nextSundayDate: nextSundayDate ?? null,
      nextMondayDate: nextMondayDate ?? null,
      nextWednesdayDate: nextWednesdayDate ?? null,
    })
  }, [activeCycle, nextSundayDate, nextMondayDate, nextWednesdayDate, setCycleInfo])

  const mains = menuItems.filter(m => m.category === 'mains')
  const salads = menuItems.filter(m => m.category === 'salads')
  const visibleSpecials = specials.filter(s => s.is_active !== false && !s.is_sold_out)

  const cartTotal = cart.reduce((s, e) => s + e.unitPrice * e.quantity, 0)
  const cartCount = cart.reduce((s, e) => s + e.quantity, 0)
  const isMidweek = activeCycle === 'midweek'
  const primaryDeliveryLabel = isMidweek
    ? shortDateLabel(nextWednesdayDate) ?? 'Wednesday delivery'
    : shortDateLabel(nextSundayDate) ?? 'Sunday delivery'
  const secondaryDeliveryLabel = !isMidweek && nextMondayDate
    ? shortDateLabel(nextMondayDate)
    : null

  return (
    <>
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '40px 20px',
        paddingBottom: cartCount > 0 ? 100 : 56,
      }}>

        {/* Header */}
        <header style={{ textAlign: 'left', marginBottom: 44 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface-sunken)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '5px 12px',
            marginBottom: 18,
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-forest)',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-ui), sans-serif',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em',
            }}>
              {isMidweek ? 'Midweek menu open' : 'Weekend menu open'}
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-instrument-serif), serif',
            fontSize: 'clamp(42px, 11vw, 64px)',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 0.98,
          }}>
            Mali&apos;s Meals
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 16,
            color: 'var(--text-secondary)',
            margin: '14px 0 0',
            lineHeight: 1.55,
            maxWidth: 480,
          }}>
            Home-cooked meals for Nairobi, prepared in weekly batches and delivered on schedule.
          </p>
          <div style={{
            marginTop: 22,
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            padding: '16px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 14,
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                margin: '0 0 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Order by
              </p>
              <p style={{
                fontFamily: 'var(--font-display), serif',
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.1,
              }}>
                {isMidweek ? 'Tuesday 2pm' : 'Friday 2pm'}
              </p>
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                margin: '0 0 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Delivery
              </p>
              <p style={{
                fontFamily: 'var(--font-display), serif',
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.1,
              }}>
                {primaryDeliveryLabel}{secondaryDeliveryLabel ? ` + ${secondaryDeliveryLabel}` : ''}
              </p>
            </div>
          </div>
          <p style={{
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            margin: '14px 0 0',
            lineHeight: 1.5,
          }}>
            After you order, you will get an email receipt. Mali reviews the order, confirms it, then payment is handled before dispatch.
          </p>
        </header>

        {/* Mains */}
        <section style={{ marginBottom: 52 }}>
          <SectionHeading>Mains</SectionHeading>
          <p style={{
            fontFamily: 'var(--font-ui), sans-serif',
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
        <section style={{ marginBottom: 52, marginTop: 48 }}>
          <SectionHeading>Salads</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {salads.map(dish => (
              <DishCard key={dish.id} dish={dish} getQty={getQty} adjust={adjust} />
            ))}
          </div>
        </section>

        {/* Chef's special */}
        {visibleSpecials.length > 0 && (
          <section style={{ marginBottom: 52, marginTop: 48 }}>
            <SectionHeading>Chef&apos;s special</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visibleSpecials.map(special => (
                <SpecialCard key={special.id} special={special} getQty={getQty} adjust={adjust} />
              ))}
            </div>
          </section>
        )}

        {/* Protein add-ons */}
        {addons.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <SectionHeading>Protein add-ons</SectionHeading>
            <p style={{
              fontFamily: 'var(--font-ui), sans-serif',
              fontSize: 13,
              color: 'var(--text-secondary)',
              margin: '-8px 0 16px',
              lineHeight: 1.5,
            }}>
              Add to any dish, or order on their own.
            </p>
            <div style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              {addons.map((addon, index) => (
                <AddonRow
                  key={addon.id}
                  addon={addon}
                  isLast={index === addons.length - 1}
                  getQty={getQty}
                  adjust={adjust}
                />
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
            <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 13, color: 'var(--text-secondary)' }}>
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
            <span style={{ fontFamily: 'var(--font-instrument-serif), serif', fontSize: 22, color: 'var(--text-primary)', marginLeft: 12 }}>
              {fmt(cartTotal)}
            </span>
          </div>
          <button
            onClick={() => router.push('/checkout')}
            style={{
              background: 'var(--brand-green)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontFamily: 'var(--font-ui), sans-serif',
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
