/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SlipOrder = {
  id: string
  order_ref: string
  customer_name: string
  customer_phone: string
  delivery_zone: number
  delivery_day: string
  delivery_window: string | null
  delivery_slot: string | null
  address_building: string | null
  address_street: string | null
  address_apartment: string | null
  address_landmark: string | null
  total_amount: number
  payment_status: string | null
  notes: string | null
  items: { name: string; category: string; variant: string; meat_upgrade_type: string | null; quantity: number }[]
  specials: { name: string; quantity: number }[]
  addons: { name: string; quantity: number }[]
}

// ── Layout types ──────────────────────────────────────────────────────────────

type LayoutItem = { order: SlipOrder; x: number; y: number; w: number; h: number }
type CutLine = { x1: number; y1: number; x2: number; y2: number }
type LayoutPage = { items: LayoutItem[]; cutLines: CutLine[] }

// ── Constants ─────────────────────────────────────────────────────────────────


const A4_W = 794
const A4_H = 1122
const HALF_W = Math.floor(A4_W / 2) // 397px

// Bin thresholds (measured at 380px width)
const BIN_4UP = 260  // quarter page — 4 per A4
const BIN_2UP = 540  // half page   — 2 per A4

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Ksh ${n.toLocaleString()}`
}

function variantLabel(variant: string, meatUpgradeType: string | null): string {
  if (variant === 'vegetarian') return 'Vegetarian'
  if (meatUpgradeType === 'beef') return 'With beef'
  if (meatUpgradeType === 'chicken') return 'With chicken'
  return 'With meat'
}

function deliveryLabel(order: SlipOrder): string {
  const day = order.delivery_day === 'sunday' ? 'Sunday' : 'Monday'
  const w = order.delivery_window
  if (w === 'by_5pm') return `${day} · by 5pm`
  if (w === 'free_5_10pm') return `${day} · 5–10pm`
  if (w) return `${day} · ${w.replace(/^(\d+)_(\d+pm)$/, '$1–$2')}`
  if (order.delivery_slot) return `${day} · ${order.delivery_slot.replace(/^(\d+)_(\d+pm)$/, '$1–$2')}`
  return day
}

function isUnpaid(status: string | null): boolean {
  // Treat null/undefined/any unknown value as unpaid — safer for payment collection
  return !status || status === 'unpaid'
}

function getBin(height: number): 4 | 2 | 1 {
  if (height <= BIN_4UP) return 4
  if (height <= BIN_2UP) return 2
  return 1
}

// ── Pack algorithm ────────────────────────────────────────────────────────────

function packSlips(slips: SlipOrder[], heights: number[]): LayoutPage[] {
  type Row = {
    items: { order: SlipOrder; height: number }[]
    height: number
    bin: 4 | 2 | 1
  }

  const pages: LayoutPage[] = []
  let currentRows: Row[] = []

  function rowsHeight(): number {
    return currentRows.reduce((s, r) => s + r.height, 0)
  }

  function buildPage(rows: Row[]): LayoutPage {
    const items: LayoutItem[] = []
    const cutLines: CutLine[] = []
    let y = 0
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri]
      if (row.bin === 4) {
        items.push({ order: row.items[0].order, x: 0, y, w: HALF_W, h: row.height })
        if (row.items.length > 1) {
          items.push({ order: row.items[1].order, x: HALF_W, y, w: HALF_W, h: row.height })
          // vertical cut between the two 4-up slips
          cutLines.push({ x1: HALF_W, y1: y, x2: HALF_W, y2: y + row.height })
        }
      } else {
        items.push({ order: row.items[0].order, x: 0, y, w: A4_W, h: row.height })
      }
      // horizontal cut after every row except the last
      if (ri < rows.length - 1) {
        cutLines.push({ x1: 0, y1: y + row.height, x2: A4_W, y2: y + row.height })
      }
      y += row.height
    }
    return { items, cutLines }
  }

  function flushPage() {
    if (currentRows.length > 0) {
      pages.push(buildPage(currentRows))
      currentRows = []
    }
  }

  for (let i = 0; i < slips.length; i++) {
    const slip = slips[i]
    const h = heights[i]
    const bin = getBin(h)

    if (bin === 1) {
      flushPage()
      pages.push(buildPage([{ items: [{ order: slip, height: h }], height: h, bin: 1 }]))
      continue
    }

    if (bin === 2) {
      if (rowsHeight() + h > A4_H) flushPage()
      currentRows.push({ items: [{ order: slip, height: h }], height: h, bin: 2 })
      continue
    }

    // bin === 4: try to pair with an existing open 4-up row
    const lastRow = currentRows[currentRows.length - 1]
    if (lastRow && lastRow.bin === 4 && lastRow.items.length < 2) {
      const newRowH = Math.max(lastRow.height, h)
      // check the new row height still fits on the current page
      if (rowsHeight() - lastRow.height + newRowH <= A4_H) {
        lastRow.items.push({ order: slip, height: h })
        lastRow.height = newRowH
        continue
      }
      // doesn't fit — flush and start fresh
      flushPage()
    } else {
      if (rowsHeight() + h > A4_H) flushPage()
    }
    currentRows.push({ items: [{ order: slip, height: h }], height: h, bin: 4 })
  }

  flushPage()
  return pages
}

// ── Slip content component ────────────────────────────────────────────────────

function Slip({ order }: { order: SlipOrder }) {
  const mains = order.items.filter(i => i.category === 'mains')
  const salads = order.items.filter(i => i.category === 'salads')
  const hasItems = mains.length > 0 || salads.length > 0 || order.specials.length > 0 || order.addons.length > 0
  const unpaid = isUnpaid(order.payment_status)

  const addressParts = [order.address_building, order.address_street, order.address_apartment].filter(Boolean)
  const addressStr = addressParts.join(', ')
  const zoneDelivery = `Zone ${order.delivery_zone} · ${deliveryLabel(order)}`
  const infoLine = [addressStr, zoneDelivery].filter(Boolean).join(' · ')
  const landmark = order.address_landmark ? `Near ${order.address_landmark}` : ''

  return (
    <div style={{ fontFamily: 'var(--font-inter)', padding: '10px', lineHeight: 1.3 }}>

      {/* Header: branding + order ref */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: '3px',
        marginBottom: '3px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '10px', color: 'var(--text-tertiary)' }}>
          Mali&apos;s Meals
        </span>
        <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: '18px', color: 'var(--text-primary)' }}>
          {order.order_ref}
        </span>
      </div>

      {/* Customer: name + phone on one line */}
      <div style={{ marginBottom: '2px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {order.customer_name}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
          {order.customer_phone}
        </span>
      </div>

      {/* Address · zone · delivery — single line, wraps to two max */}
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {infoLine}
        {landmark && <span style={{ color: 'var(--text-tertiary)' }}> · {landmark}</span>}
      </div>

      {/* Divider before items */}
      {hasItems && (
        <div style={{ borderTop: '0.5px solid var(--border)', margin: '3px 0 4px' }} />
      )}

      {/* Items */}
      {hasItems && (
        <div style={{ marginBottom: '4px' }}>
          {mains.length > 0 && (
            <div style={{ marginBottom: salads.length > 0 || order.specials.length > 0 || order.addons.length > 0 ? '3px' : 0 }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Mains</div>
              {mains.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '1px' }}>
                  <span>
                    {item.name}
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                      {variantLabel(item.variant, item.meat_upgrade_type)}
                    </span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '6px' }}>×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {salads.length > 0 && (
            <div style={{ marginBottom: order.specials.length > 0 || order.addons.length > 0 ? '3px' : 0 }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Salads</div>
              {salads.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '1px' }}>
                  <span>
                    {item.name}
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                      {variantLabel(item.variant, item.meat_upgrade_type)}
                    </span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '6px' }}>×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {order.specials.length > 0 && (
            <div style={{ marginBottom: order.addons.length > 0 ? '3px' : 0 }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Chef&apos;s Special</div>
              {order.specials.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '1px' }}>
                  <span>{s.name}</span>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '6px' }}>×{s.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {order.addons.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Protein Add-ons</div>
              {order.addons.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '1px' }}>
                  <span>{a.name}</span>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '6px' }}>×{a.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes — safety critical, flat left-border style */}
      {order.notes && (
        <div style={{
          marginBottom: '4px',
          paddingLeft: '6px',
          borderLeft: '2px solid var(--accent-terracotta)',
        }}>
          <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--accent-terracotta)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ⚠ Notes{' '}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {order.notes}
          </span>
        </div>
      )}

      {/* Payment status — flat band, no border-radius */}
      {unpaid ? (
        <div style={{
          backgroundColor: 'var(--accent-terracotta)',
          padding: '5px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            fontSize: '9px',
            fontWeight: '700',
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Collect Payment
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
            {fmt(order.total_amount)}
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--accent-forest)',
          padding: '5px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>✓ PAID</div>
          <div style={{ fontSize: '12px', color: '#fff' }}>{fmt(order.total_amount)}</div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PackingSlipsClient({
  slips,
  backLink,
  title,
}: {
  slips: SlipOrder[]
  backLink: string
  title: string
}) {
  const [pages, setPages] = useState<LayoutPage[]>([])
  const [printReady, setPrintReady] = useState(false)
  const measRefs = useRef<(HTMLDivElement | null)[]>([])

  // Inject print styles only while this page is mounted — removed on unmount so
  // they never persist into other pages via React's style-hoisting behaviour.
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @page { size: A4 portrait; margin: 0; }
      @media print {
        [data-screen-view] { display: none !important; }
        [data-print-view] { display: block !important; }
        [data-print-view] * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        [data-page]:not(:last-child) { page-break-after: always; break-after: page; }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  useEffect(() => {
    if (slips.length === 0) {
      setPrintReady(true)
      return
    }
    document.fonts.ready.then(() => {
      const heights = measRefs.current.map(el =>
        el ? el.getBoundingClientRect().height : 200
      )
      setPages(packSlips(slips, heights))
      setPrintReady(true)
    })
  }, [slips])

  return (
    <>

      {/* Measurement div — fixed, invisible, out of flow */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}
      >
        {slips.map((slip, i) => (
          <div
            key={slip.id}
            ref={el => { measRefs.current[i] = el }}
            style={{ width: 380 }}
          >
            <Slip order={slip} />
          </div>
        ))}
      </div>

      {/* ── Screen view ── */}
      <div data-screen-view="" style={{ fontFamily: 'var(--font-inter)', minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>

        {/* Top bar */}
        <div style={{
          backgroundColor: 'var(--surface-raised)',
          borderBottom: '1px solid var(--border)',
          padding: '0 20px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <Link href={backLink} style={{ fontSize: '13px', color: 'var(--text-tertiary)', textDecoration: 'none' }}>
            ← Back
          </Link>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', flex: 1 }}>
            {title}
            {slips.length > 0 && (
              <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                — {slips.length} {slips.length === 1 ? 'slip' : 'slips'}
              </span>
            )}
          </span>
          <button
            onClick={() => window.print()}
            disabled={!printReady}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--brand-gold)',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'var(--font-inter)',
              fontWeight: '500',
              cursor: printReady ? 'pointer' : 'wait',
              opacity: printReady ? 1 : 0.6,
            }}
          >
            {printReady ? 'Print' : 'Preparing…'}
          </button>
        </div>

        {/* Slip previews */}
        {slips.length === 0 ? (
          <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>No orders found.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {slips.map(slip => (
              <div key={slip.id} style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
                <Slip order={slip} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Print view — paged A4 layout ── */}
      <div data-print-view="" style={{ display: 'none' }}>
        {pages.map((page, pi) => (
          <div
            key={pi}
            data-page=""
            style={{
              position: 'relative',
              width: A4_W,
              height: A4_H,
              backgroundColor: 'white',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* Slips positioned absolutely within the page */}
            {page.items.map((item, ii) => (
              <div
                key={ii}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  width: item.w,
                  height: item.h,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                <Slip order={item.order} />
              </div>
            ))}

            {/* Cut guide lines between slips */}
            {page.cutLines.map((line, li) => {
              const isVertical = line.x1 === line.x2
              return (
                <div
                  key={li}
                  style={{
                    position: 'absolute',
                    left: line.x1,
                    top: line.y1,
                    width: isVertical ? 0 : line.x2 - line.x1,
                    height: isVertical ? line.y2 - line.y1 : 0,
                    borderLeft: isVertical ? '1px dashed var(--border)' : undefined,
                    borderTop: isVertical ? undefined : '1px dashed var(--border)',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
