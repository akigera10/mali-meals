/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type RawOrder = {
  id: string
  order_ref: string
  order_status: string
  delivery_day: string
  delivery_zone: number
  total_amount: number
  customer_name: string
}

type RawItem = {
  order_id: string
  dish_name: string | null
  quantity: number
  variant: string
  meat_type: string | null
  menu_items: { name: string; category: string; meat_upgrade_type: string | null } | null
  order_item_addons: { quantity: number; protein_addons: { name: string } | null }[]
}

type RawSpecial = {
  order_id: string
  special_name: string | null
  quantity: number
  specials: { name: string } | null
}

type RawAddon = {
  order_id: string
  addon_name: string | null
  quantity: number
  protein_addons: { name: string } | null
}

type DishBlock = {
  name: string
  variants: { variant: string; qty: number }[]
  total: number
}

type PrintSection = {
  name: string
  portions: number
  dishes?: DishBlock[]
  counts?: [string, number][]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function variantLabel(item: RawItem): string {
  if (item.variant === 'vegetarian') return 'Vegetarian'
  const t = item.meat_type || item.menu_items?.meat_upgrade_type
  if (t === 'beef') return 'With beef'
  if (t === 'chicken') return 'With chicken'
  return 'With protein'
}

function fmt(n: number) {
  return n.toLocaleString()
}

function portionLabel(qty: number) {
  return `${qty} ${qty === 1 ? 'portion' : 'portions'}`
}

function buildDishBlocks(items: RawItem[], category: string): DishBlock[] {
  const dishMap: Record<string, Record<string, number>> = {}
  for (const item of items) {
    if (item.menu_items?.category !== category) continue
    const name = item.dish_name || item.menu_items?.name || 'Unknown'
    const variant = variantLabel(item)
    if (!dishMap[name]) dishMap[name] = {}
    dishMap[name][variant] = (dishMap[name][variant] ?? 0) + item.quantity
  }
  return Object.entries(dishMap)
    .map(([name, variants]) => ({
      name,
      variants: Object.entries(variants).map(([variant, qty]) => ({ variant, qty })),
      total: Object.values(variants).reduce((s, q) => s + q, 0),
    }))
    .sort((a, b) => b.total - a.total)
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--surface-raised)',
  color: 'var(--text-primary)',
  fontSize: '16px',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  lineHeight: 1,
}

// ── Dish section ──────────────────────────────────────────────────────────────

function DishSection({ heading, blocks, totalPortions }: {
  heading: string; blocks: DishBlock[]; totalPortions: number
}) {
  if (blocks.length === 0) return null
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
          {heading}
        </h2>
        <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {portionLabel(totalPortions)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        {blocks.map((dish, index) => (
          <div key={dish.name} style={{ padding: '14px 16px', borderBottom: index === blocks.length - 1 ? 'none' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 400, color: 'var(--text-primary)', minWidth: 0 }}>{dish.name}</span>
              <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{portionLabel(dish.total)}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {dish.variants.map(({ variant, qty }) => (
                <span key={variant} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border)', fontFamily: 'var(--font-ui), sans-serif', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>{variant}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{portionLabel(qty)}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountSection({ heading, rows, totalPortions }: { heading: string; rows: [string, number][]; totalPortions: number }) {
  if (rows.length === 0) return null
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
          {heading}
        </h2>
        <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {portionLabel(totalPortions)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        {rows.map(([name, qty], index) => (
          <div key={name} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', borderBottom: index === rows.length - 1 ? 'none' : '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 400, color: 'var(--text-primary)', minWidth: 0 }}>{name}</span>
            <span style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{portionLabel(qty)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildPrintHTML({
  formattedDate,
  orderCount,
  totalPortions,
  sections,
}: {
  formattedDate: string
  orderCount: number
  totalPortions: number
  sections: PrintSection[]
}) {
  const portionLabel = (n: number) => `${n} portion${n !== 1 ? 's' : ''}`

  const sectionsHTML = sections.map(section => {
    const dishesHTML = (section.dishes ?? []).map(dish => {
      const variantsHTML = dish.variants.map(({ variant, qty }) => `
        <div style="font-size:13px;color:#3A4F3E;padding-left:16px;margin-bottom:3px;display:flex;justify-content:space-between;align-items:baseline;gap:24px;">
          <span>${escapeHTML(variant)}</span>
          <span style="font-weight:500;white-space:nowrap;">${portionLabel(qty)}</span>
        </div>
      `).join('')

      return `
        <div style="break-inside:avoid;page-break-inside:avoid;">
          <div style="font-family:'Instrument Serif',serif;font-size:17px;font-weight:400;color:#102015;margin-top:10px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:baseline;gap:24px;">
            <span>${escapeHTML(dish.name)}</span>
            <span style="font-family:'Manrope',sans-serif;font-weight:600;font-size:17px;white-space:nowrap;">${portionLabel(dish.total)}</span>
          </div>
          ${variantsHTML}
        </div>
      `
    }).join('')

    const countsHTML = (section.counts ?? []).map(([name, qty]) => `
      <div style="font-family:'Instrument Serif',serif;font-size:17px;font-weight:400;color:#102015;margin-top:10px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:baseline;gap:24px;break-inside:avoid;">
        <span>${escapeHTML(name)}</span>
        <span style="font-family:'Manrope',sans-serif;font-weight:600;font-size:17px;white-space:nowrap;">${portionLabel(qty)}</span>
      </div>
    `).join('')

    return `
      <section style="break-inside:avoid;page-break-inside:avoid;">
        <div style="font-size:13px;font-weight:700;color:#6B7D6E;text-transform:uppercase;letter-spacing:0.08em;margin-top:28px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(16,32,21,0.20);display:flex;justify-content:space-between;align-items:baseline;">
          <span>${escapeHTML(section.name)}</span>
          <span>${portionLabel(section.portions)}</span>
        </div>
        ${dishesHTML}
        ${countsHTML}
      </section>
    `
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Mali's Meals — Kitchen Prep</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { margin: 15mm 18mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Manrope', sans-serif; color: #102015; width: 100%; }
  </style>
</head>
<body>
  <div style="font-family:'Manrope',sans-serif;color:#102015;padding:0;margin:0;width:100%;max-width:100%;">
    <div style="border-bottom:2px solid #102015;padding-bottom:16px;margin-bottom:24px;">
      <div style="font-family:'Instrument Serif',serif;font-size:26px;font-weight:400;color:#102015;margin-bottom:4px;">
        Mali's Meals — Kitchen Prep
      </div>
      <div style="font-size:15px;color:#102015;margin-bottom:2px;">${escapeHTML(formattedDate)}</div>
      <div style="font-size:13px;color:#3A4F3E;">${orderCount} orders · ${portionLabel(totalPortions)}</div>
    </div>
    ${sectionsHTML}
  </div>
</body>
</html>`
}


// ── Main component ────────────────────────────────────────────────────────────

export default function KitchenClient() {
  const [allDates, setAllDates] = useState<string[]>([])
  const [dateIdx, setDateIdx] = useState(0)
  const [datesLoaded, setDatesLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<RawOrder[]>([])
  const [items, setItems] = useState<RawItem[]>([])
  const [rawSpecials, setRawSpecials] = useState<RawSpecial[]>([])
  const [standaloneAddons, setStandaloneAddons] = useState<RawAddon[]>([])
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())

  // Load distinct delivery dates on mount
  useEffect(() => {
    async function loadDates() {
      const res = await fetch('/api/admin/delivery-dates')
      const { dates } = await res.json()
      const unique: string[] = dates ?? []
      setAllDates(unique)

      const today = new Date().toISOString().slice(0, 10)
      const idx = unique.findIndex(d => d >= today)
      setDateIdx(idx === -1 ? Math.max(0, unique.length - 1) : idx)
      setDatesLoaded(true)
    }
    loadDates()
  }, [])

  const selectedDate = allDates[dateIdx] ?? null

  // Load orders for selected delivery date
  useEffect(() => {
    if (!selectedDate) return
    let active = true
    setLoading(true)

    async function load() {
      const res = await fetch(`/api/admin/orders-by-date?date=${selectedDate}&scope=kitchen`)
      if (!active) return
      const { orders: ordersData, items: itemsData, specials: specialsData, standaloneAddons: standaloneAddonsData } = await res.json()

      const fetchedOrders: RawOrder[] = (ordersData ?? []).map((o: any) => ({
        id: o.id,
        order_ref: o.order_ref,
        order_status: o.order_status,
        delivery_day: o.delivery_day,
        delivery_zone: o.delivery_zone,
        total_amount: o.total_amount,
        customer_name: o.customer_name,
      }))
      const fetchedItems: RawItem[] = (itemsData ?? []).map((item: any) => ({
        order_id: item.order_id,
        dish_name: item.dish_name ?? null,
        quantity: item.quantity,
        variant: item.variant,
        meat_type: item.meat_type ?? null,
        menu_items: item.menu_items,
        order_item_addons: item.order_item_addons || [],
      }))
      const fetchedSpecials: RawSpecial[] = (specialsData ?? []).map((s: any) => ({
        order_id: s.order_id,
        special_name: s.special_name ?? null,
        quantity: s.quantity,
        specials: s.specials,
      }))
      const fetchedStandaloneAddons: RawAddon[] = (standaloneAddonsData ?? []).map((a: any) => ({
        order_id: a.order_id,
        addon_name: a.addon_name ?? null,
        quantity: a.quantity,
        protein_addons: a.protein_addons,
      }))

      setOrders(fetchedOrders)
      setItems(fetchedItems)
      setRawSpecials(fetchedSpecials)
      setStandaloneAddons(fetchedStandaloneAddons)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [selectedDate])

  // ── Dish blocks ─────────────────────────────────────────────────────────────

  const mainBlocks = useMemo(() => buildDishBlocks(items, 'mains'), [items])
  const saladBlocks = useMemo(() => buildDishBlocks(items, 'salads'), [items])
  const mainPortions = useMemo(() => mainBlocks.reduce((s, d) => s + d.total, 0), [mainBlocks])
  const saladPortions = useMemo(() => saladBlocks.reduce((s, d) => s + d.total, 0), [saladBlocks])

  const specialGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of rawSpecials) {
      const name = s.special_name || s.specials?.name || 'Unknown'
      map[name] = (map[name] ?? 0) + s.quantity
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [rawSpecials])
  const specialPortions = useMemo(() => specialGroups.reduce((s, row) => s + row[1], 0), [specialGroups])

  const addonGroups = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      for (const addon of item.order_item_addons || []) {
        const name = addon.protein_addons?.name ?? 'Unknown add-on'
        map[name] = (map[name] ?? 0) + addon.quantity
      }
    }
    for (const addon of standaloneAddons) {
      const name = addon.protein_addons?.name ?? addon.addon_name ?? 'Unknown add-on'
      map[name] = (map[name] ?? 0) + addon.quantity
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items, standaloneAddons])
  const addonPortions = useMemo(() => addonGroups.reduce((s, row) => s + row[1], 0), [addonGroups])
  const totalPortions = mainPortions + saladPortions + specialPortions + addonPortions

  const unconfirmedOrders = useMemo(
    () => orders.filter(o => o.order_status === 'new'),
    [orders]
  )

  const printSections = useMemo(() => {
    const sections: PrintSection[] = []
    if (mainBlocks.length > 0) sections.push({ name: 'Mains', portions: mainPortions, dishes: mainBlocks })
    if (saladBlocks.length > 0) sections.push({ name: 'Salads', portions: saladPortions, dishes: saladBlocks })
    if (specialGroups.length > 0) sections.push({ name: "Chef's special", portions: specialPortions, counts: specialGroups })
    if (addonGroups.length > 0) sections.push({ name: 'Protein add-ons', portions: addonPortions, counts: addonGroups })
    return sections
  }, [addonGroups, addonPortions, mainBlocks, mainPortions, saladBlocks, saladPortions, specialGroups, specialPortions])

  async function confirmOrder(orderId: string) {
    setConfirmingIds(s => new Set(s).add(orderId))
    await fetch('/api/admin/update-order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, updates: { order_status: 'confirmed' } }),
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: 'confirmed' } : o))
    setConfirmingIds(s => { const next = new Set(s); next.delete(orderId); return next })
  }

  const selectedDateLabel = selectedDate ? fmtDate(selectedDate) : '—'
  const hasContent = mainBlocks.length > 0 || saladBlocks.length > 0 || specialGroups.length > 0 || addonGroups.length > 0

  function handlePrint() {
    const printHTML = buildPrintHTML({
      formattedDate: selectedDateLabel,
      orderCount: orders.length,
      totalPortions,
      sections: printSections,
    })

    const blob = new Blob([printHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) return
    win.onload = () => {
      win.document.fonts.ready.then(() => {
        win.print()
        win.onafterprint = () => {
          win.close()
          URL.revokeObjectURL(url)
        }
      })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div data-noprint="" style={{ fontFamily: 'var(--font-ui)' }}>
        <div data-admin-page-shell style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '1212px', margin: '0 auto', padding: '40px 56px', boxSizing: 'border-box', fontFamily: 'var(--font-ui), sans-serif', fontSize: 15, color: 'var(--text-primary)' }}>

          {/* ── Header + date nav ── */}
          <div data-noprint="">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 24px', flex: '1' }}>
                Kitchen
              </h1>
              <button
                onClick={() => setDateIdx(i => i - 1)}
                disabled={dateIdx <= 0}
                style={{ ...navBtnStyle, opacity: dateIdx <= 0 ? 0.4 : 1 }}
                aria-label="Previous date"
              >←</button>
              <button
                onClick={() => setDateIdx(i => i + 1)}
                disabled={dateIdx >= allDates.length - 1}
                style={{ ...navBtnStyle, opacity: dateIdx >= allDates.length - 1 ? 0.4 : 1 }}
                aria-label="Next date"
              >→</button>
              <button
                onClick={handlePrint}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--surface-raised)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Print
              </button>
            </div>
            <p style={{ fontSize: '15px', fontFamily: 'var(--font-instrument-serif)', color: 'var(--text-primary)', margin: '0 0 28px 0' }}>
              {datesLoaded && allDates.length === 0 ? 'No delivery dates found' : selectedDateLabel}
            </p>
          </div>

          {!datesLoaded ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : allDates.length === 0 ? (
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              No orders with delivery dates yet. Orders placed with the new system will appear here.
            </p>
          ) : loading ? (
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Loading…</p>
          ) : (
            <>
              {/* ── Stats bar ── */}
              <div data-noprint="" style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-forest)', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400 }}>{orders.length}</strong>
                  {' '}order{orders.length !== 1 ? 's' : ''}
                  {' · '}
                  <strong style={{ color: 'var(--accent-forest)', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400 }}>{totalPortions}</strong>
                  {' '}portion{totalPortions !== 1 ? 's' : ''}
                </span>
                {unconfirmedOrders.length > 0 && (
                  <span style={{ fontSize: '14px', color: 'var(--accent-terracotta)', fontWeight: '500' }}>
                    {unconfirmedOrders.length} unconfirmed
                  </span>
                )}
              </div>

              {/* ── Cooking summary ── */}
              <section style={{ marginBottom: '48px' }}>
                {!hasContent ? (
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No orders for this date.</p>
                ) : (
                  <>
                    <DishSection heading="Mains" blocks={mainBlocks} totalPortions={mainPortions} />
                    <DishSection heading="Salads" blocks={saladBlocks} totalPortions={saladPortions} />
                    <CountSection heading="Chef's special" rows={specialGroups} totalPortions={specialPortions} />
                    <CountSection heading="Protein add-ons" rows={addonGroups} totalPortions={addonPortions} />
                  </>
                )}
              </section>

              {/* ── Unconfirmed orders ── */}
              {unconfirmedOrders.length > 0 && (
                <section data-noprint="">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                    <h2 style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '20px', color: 'var(--accent-terracotta)', margin: 0 }}>
                      Unconfirmed orders
                    </h2>
                    <span style={{ fontSize: '14px', color: 'var(--accent-terracotta)', fontWeight: '500' }}>
                      {unconfirmedOrders.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {unconfirmedOrders.map(order => (
                      <div
                        key={order.id}
                        style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                      >
                        <Link href={`/admin/orders/${order.id}`} style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '14px', color: 'var(--brand-green)', textDecoration: 'none', minWidth: '80px' }}>
                          {order.order_ref}
                        </Link>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1, minWidth: '120px' }}>
                          {order.customer_name}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                          Zone {order.delivery_zone}
                        </span>
                        <span style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {fmt(order.total_amount)}
                        </span>
                        <button
                          onClick={() => confirmOrder(order.id)}
                          disabled={confirmingIds.has(order.id)}
                          style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            border: '1px solid var(--brand-green)',
                            backgroundColor: 'transparent',
                            color: 'var(--brand-green)',
                            fontSize: '13px',
                            fontFamily: 'var(--font-ui)',
                            fontWeight: '500',
                            cursor: confirmingIds.has(order.id) ? 'not-allowed' : 'pointer',
                            opacity: confirmingIds.has(order.id) ? 0.5 : 1,
                          }}
                        >
                          {confirmingIds.has(order.id) ? 'Confirming…' : 'Confirm'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}
