'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

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
  delivery_date: string | null
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
  updated_at?: string | null
  paid_at?: string | null
}

type Settings = {
  active_cycle?: string | null
  weekend_cutoff?: string | null
  midweek_cutoff?: string | null
  next_sunday_date?: string | null
  next_monday_date?: string | null
  next_wednesday_date?: string | null
} | null

type Bucket = 'all' | 'new' | 'confirmed' | 'paid' | 'out' | 'delivered' | 'cancelled'

const tabs: { key: Bucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'paid', label: 'Paid' },
  { key: 'out', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

function fmt(n: number) {
  return n.toLocaleString('en-KE')
}

function todayISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function timestamp(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deliveryWindow(order: Order) {
  if (order.delivery_window === 'by_5pm') return 'by 5pm'
  if (order.delivery_window === 'free_5_10pm') return '5-10pm (free)'
  if (order.delivery_window) return order.delivery_window.replace(/^(\d+)_(\d+pm)$/, '$1-$2')
  if (order.delivery_slot) return order.delivery_slot.replace(/^(\d+)_(\d+pm)$/, '$1-$2')
  return ''
}

function bucketFor(order: Order): Bucket {
  if (order.order_status === 'new') return 'new'
  if (order.order_status === 'confirmed' && order.payment_status === 'unpaid') return 'confirmed'
  if (order.order_status === 'confirmed' && order.payment_status === 'paid') return 'paid'
  if (order.order_status === 'dispatched') return 'out'
  if (order.order_status === 'delivered') return 'delivered'
  if (order.order_status === 'cancelled') return 'cancelled'
  return 'all'
}

function orderTime(order: Order, fallback: 'created' | 'updated') {
  if (fallback === 'updated') return new Date(order.updated_at ?? order.created_at).getTime()
  return new Date(order.created_at).getTime()
}

function countBucket(orders: Order[], bucket: Bucket) {
  if (bucket === 'all') return orders.length
  return orders.filter(order => bucketFor(order) === bucket).length
}

function defaultTab(orders: Order[]): Bucket {
  return countBucket(orders, 'new') > 0 ? 'new' : 'all'
}

function filterByTab(orders: Order[], tab: Bucket) {
  if (tab === 'all') return orders
  return orders.filter(order => bucketFor(order) === tab)
}

function sortForTab(orders: Order[], tab: Bucket) {
  const next = [...orders]
  if (tab === 'new') return next.sort((a, b) => orderTime(b, 'created') - orderTime(a, 'created'))
  if (tab === 'confirmed' || tab === 'paid') return next.sort((a, b) => orderTime(a, 'created') - orderTime(b, 'created'))
  if (tab === 'out') return next.sort((a, b) => orderTime(a, 'updated') - orderTime(b, 'updated'))
  if (tab === 'delivered' || tab === 'cancelled') return next.sort((a, b) => orderTime(b, 'updated') - orderTime(a, 'updated'))
  return next
}

function searchOrders(orders: Order[], search: string) {
  const term = search.trim().toLowerCase()
  if (!term) return orders
  return orders.filter(order =>
    order.customer_name.toLowerCase().includes(term) ||
    order.customer_phone.toLowerCase().includes(term) ||
    order.order_ref.toLowerCase().includes(term)
  )
}

function nearestDeliveryDate(dates: string[], selectedDate: string | null) {
  if (selectedDate) return selectedDate
  const today = todayISO()
  return dates.find(date => date >= today) ?? dates[dates.length - 1] ?? null
}

function visibleDateOptions(dates: string[], selectedDate: string | null) {
  const activeDate = nearestDeliveryDate(dates, selectedDate)
  if (!activeDate) return []

  const allDates = Array.from(new Set([...dates, activeDate]))
    .sort((a, b) => a.localeCompare(b))
  const past = allDates.filter(date => date < activeDate).slice(-2)
  const upcoming = allDates.filter(date => date > activeDate).slice(0, 2)

  return [...past, activeDate, ...upcoming]
}

function cutoffForDate(date: string | null, settings: Settings) {
  if (!date || !settings) return null
  if (date === settings.next_wednesday_date) return settings.midweek_cutoff ?? null
  if (date === settings.next_sunday_date || date === settings.next_monday_date) return settings.weekend_cutoff ?? null
  return null
}

function cutoffText(cutoff: string | null) {
  if (!cutoff) return null
  return new Date(cutoff).toLocaleDateString('en-GB', { weekday: 'long' })
}

function isFutureOrToday(date: string | null) {
  if (!date) return false
  return date >= todayISO()
}

function isCutoffOpen(cutoff: string | null) {
  if (!cutoff) return false
  return new Date() <= new Date(cutoff)
}

function OrderBadge({ order }: { order: Order }) {
  if (order.order_status === 'new') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', display: 'inline-block', backgroundColor: 'var(--surface-sunken)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
        New
      </span>
    )
  }

  if (order.order_status === 'confirmed' && order.payment_status === 'unpaid') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', display: 'inline-block', backgroundColor: 'var(--surface-sunken)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
        Confirmed · Unpaid
      </span>
    )
  }

  if (order.order_status === 'confirmed' && order.payment_status === 'paid') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', display: 'inline-block', backgroundColor: 'rgba(31,107,58,0.1)', color: 'var(--accent-forest)', border: '1px solid var(--accent-forest)' }}>
        Paid · Ready
      </span>
    )
  }

  if (order.order_status === 'dispatched') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', display: 'inline-block', backgroundColor: 'var(--brand-green-soft)', color: 'var(--accent-forest)', border: '1px solid var(--brand-green-hover)', letterSpacing: '0.04em' }}>
        Out for delivery
      </span>
    )
  }

  if (order.order_status === 'delivered' && order.payment_status === 'paid') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', display: 'inline-block', backgroundColor: 'rgba(31,107,58,0.1)', color: 'var(--accent-forest)', border: '1px solid var(--accent-forest)' }}>
        Delivered · Paid
      </span>
    )
  }

  if (order.order_status === 'delivered' && order.payment_status === 'unpaid') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', display: 'inline-block', backgroundColor: 'rgba(181,83,60,0.1)', color: 'var(--accent-terracotta)', border: '1px solid var(--accent-terracotta)' }}>
        Delivered · Unpaid
      </span>
    )
  }

  return (
    <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px', display: 'inline-block', backgroundColor: 'var(--surface-sunken)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', opacity: 0.7 }}>
      Cancelled
    </span>
  )
}

function DatePill({
  date,
  active,
  onClick,
}: {
  date: string
  active: boolean
  onClick: () => void
}) {
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ minHeight: '40px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--accent-forest)', backgroundColor: 'var(--brand-green-soft)', color: 'var(--accent-forest)', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        {shortDate(date)}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: '40px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-sunken)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
  >
      {shortDate(date)}
    </button>
  )
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ padding: '0 0 10px', border: 'none', borderBottom: '2px solid var(--accent-forest)', backgroundColor: 'transparent', color: 'var(--accent-forest)', fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        {label} ({count})
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ padding: '0 0 10px', border: 'none', borderBottom: '2px solid transparent', backgroundColor: 'transparent', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 400, cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      {label} ({count})
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '12px 0 8px 0', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
      {children}
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Link
      href={`/admin/orders/${order.id}`}
      data-order-row
      style={{ display: 'grid', gridTemplateColumns: '34% 42% 24%', alignItems: 'center', textDecoration: 'none', backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--border)', padding: '16px 20px', minHeight: '72px', cursor: 'pointer' }}
    >
      <div>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-forest)', fontSize: '14px', fontWeight: 400, display: 'inline-block', marginBottom: '2px' }}>
          {order.order_ref}
        </span>
        <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, marginBottom: '1px' }}>
          {order.customer_name}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)', fontSize: '13px' }}>
          {order.customer_phone}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
          {order.delivery_date ? shortDate(order.delivery_date) : 'No date'} · Zone {order.delivery_zone}{deliveryWindow(order) ? ` · ${deliveryWindow(order)}` : ''}
        </div>
        <OrderBadge order={order} />
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '17px', fontWeight: 400, marginBottom: '3px' }}>
          {fmt(order.total_amount)}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-tertiary)', fontSize: '12px' }}>
          {timestamp(order.updated_at ?? order.created_at)}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({
  selectedDate,
  tab,
  search,
  totalOrderCount,
  settings,
}: {
  selectedDate: string | null
  tab: Bucket
  search: string
  totalOrderCount: number
  settings: Settings
}) {
  const cutoff = cutoffForDate(selectedDate, settings)
  const cutoffDay = cutoffText(cutoff)

  if (totalOrderCount === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '15px', padding: '42px 20px' }}>
        <p style={{ margin: '0 0 8px' }}>No orders yet.</p>
        <p style={{ margin: '0 0 12px' }}>Share your ordering link to start receiving orders.</p>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText('https://www.malismeals.com')}
          style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-forest)', fontFamily: 'var(--font-ui)', fontSize: '15px', cursor: 'pointer', padding: 0 }}
        >
          www.malismeals.com
        </button>
      </div>
    )
  }

  if (search.trim()) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '15px', padding: '42px 20px' }}>
        No orders matching &quot;{search.trim()}&quot;
      </div>
    )
  }

  if (tab !== 'all') {
    const label = tabs.find(item => item.key === tab)?.label.toLowerCase() ?? 'matching'
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '15px', padding: '42px 20px' }}>
        No {label} orders for this date.
      </div>
    )
  }

  if (selectedDate && isFutureOrToday(selectedDate) && isCutoffOpen(cutoff)) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '15px', padding: '42px 20px' }}>
        <p style={{ margin: '0 0 8px' }}>No orders for {shortDate(selectedDate)} yet.</p>
        {cutoffDay && <p style={{ margin: 0 }}>Orders close {cutoffDay} at 2pm.</p>}
      </div>
    )
  }

  if (selectedDate) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '15px', padding: '42px 20px' }}>
        No orders were placed for this date.
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '15px', padding: '42px 20px' }}>
      No orders yet.
    </div>
  )
}

export default function OrdersClient({
  initialOrders,
  initialDate,
  deliveryDates,
  settings,
  totalOrderCount,
}: {
  initialOrders: Order[]
  initialDate: string | null
  deliveryDates: string[]
  settings: Settings
  totalOrderCount: number
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [orders, setOrders] = useState(initialOrders)
  const [activeTab, setActiveTab] = useState<Bucket>(defaultTab(initialOrders))
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const counts = useMemo(() => {
    return tabs.reduce((acc, tab) => {
      acc[tab.key] = countBucket(orders, tab.key)
      return acc
    }, {} as Record<Bucket, number>)
  }, [orders])

  const searchedOrders = useMemo(() => searchOrders(orders, search), [orders, search])
  const visibleOrders = useMemo(() => sortForTab(filterByTab(searchedOrders, activeTab), activeTab), [searchedOrders, activeTab])
  const activeDates = useMemo(() => visibleDateOptions(deliveryDates, selectedDate), [deliveryDates, selectedDate])
  const showDeliveredTab = counts.delivered > 0
  const showCancelledTab = counts.cancelled > 0
  const hasMoreDates = deliveryDates.length > activeDates.length

  useEffect(() => {
    setActiveTab(defaultTab(orders))
    setSearch('')
  }, [selectedDate, orders])

  async function changeDate(date: string) {
    if (date === selectedDate) return
    setSelectedDate(date)
    setLoading(true)
    const response = await fetch(`/api/admin/orders-by-date?date=${date}`)
    const body = await response.json()
    setOrders(body.orders ?? [])
    setLoading(false)
  }

  function renderAllGroups() {
    const readyToGo = sortForTab(searchedOrders.filter(order => bucketFor(order) === 'paid' || bucketFor(order) === 'out'), 'paid')
    const needsPayment = sortForTab(searchedOrders.filter(order => bucketFor(order) === 'confirmed'), 'confirmed')
    const newOrders = sortForTab(searchedOrders.filter(order => bucketFor(order) === 'new'), 'new')
    const completed = [...searchedOrders.filter(order => bucketFor(order) === 'delivered' || bucketFor(order) === 'cancelled')]
      .sort((a, b) => orderTime(a, 'updated') - orderTime(b, 'updated'))

    return (
      <>
        {readyToGo.length > 0 && <SectionLabel>Ready to go</SectionLabel>}
        {readyToGo.map(order => <OrderRow key={order.id} order={order} />)}
        {needsPayment.length > 0 && <SectionLabel>Needs payment</SectionLabel>}
        {needsPayment.map(order => <OrderRow key={order.id} order={order} />)}
        {newOrders.length > 0 && <SectionLabel>New orders</SectionLabel>}
        {newOrders.map(order => <OrderRow key={order.id} order={order} />)}
        {completed.length > 0 && <SectionLabel>Completed</SectionLabel>}
        {completed.map(order => <OrderRow key={order.id} order={order} />)}
      </>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        [data-order-row]:hover { background: var(--surface-sunken) !important; }
        [data-date-pills], [data-tabs] { scrollbar-width: none; }
        [data-date-pills]::-webkit-scrollbar, [data-tabs]::-webkit-scrollbar { display: none; }
        @media (max-width: 720px) {
          [data-orders-shell] { padding: 22px 14px 112px !important; }
          [data-date-pills], [data-tabs] { margin-left: -14px; margin-right: -14px; padding-left: 14px; padding-right: 14px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          [data-order-row] { grid-template-columns: 1fr auto !important; gap: 12px !important; }
          [data-order-row] > div:nth-child(2) { grid-column: 1 / -1; grid-row: 2; padding-top: 8px; }
          [data-order-row] > div:nth-child(3) { grid-column: 2; grid-row: 1; }
        }
      ` }} />

      <div data-orders-shell style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '1212px', margin: '0 auto', padding: '40px 56px', boxSizing: 'border-box', fontFamily: 'var(--font-ui), sans-serif', fontSize: 15, color: 'var(--text-primary)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '28px', fontWeight: 400, margin: '0 0 24px' }}>
          Orders
        </h1>

        <div data-date-pills style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'nowrap' }}>
          {activeDates.map(date => (
            <DatePill
              key={date}
              date={date}
              active={selectedDate === date}
              onClick={() => changeDate(date)}
            />
          ))}
          {hasMoreDates && (
            <button
              type="button"
              onClick={() => setShowDatePicker(open => !open)}
              style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '13px', cursor: 'pointer', padding: '0 4px', whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
              Older orders ›
            </button>
          )}
          {showDatePicker && (
            <input
              type="date"
              max={todayISO()}
              onChange={event => {
                if (event.target.value) changeDate(event.target.value)
              }}
              style={{ minHeight: '38px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: '13px', padding: '0 10px', outline: 'none' }}
            />
          )}
        </div>

        {(counts.new > 0 || counts.confirmed > 0 || counts.paid > 0 || counts.out > 0) && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            {counts.new > 0 && <><span style={{ color: 'var(--accent-forest)', fontWeight: 700 }}>{counts.new} new</span>{(counts.confirmed > 0 || counts.paid > 0 || counts.out > 0) && '  ·  '}</>}
            {counts.confirmed > 0 && <>{counts.confirmed} confirmed{(counts.paid > 0 || counts.out > 0) && '  ·  '}</>}
            {counts.paid > 0 && <>{counts.paid} paid{counts.out > 0 && '  ·  '}</>}
            {counts.out > 0 && <>{counts.out} out for delivery</>}
          </p>
        )}

        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by name, phone, or order ref..."
          style={{ width: '100%', boxSizing: 'border-box', minHeight: '44px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 14px', fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', marginBottom: search.trim() ? '8px' : '18px' }}
        />
        {search.trim() && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-tertiary)', margin: '0 0 18px' }}>
            {visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'} matching &apos;{search.trim()}&apos;
          </p>
        )}

        <div data-tabs style={{ display: 'flex', alignItems: 'flex-end', gap: '22px', borderBottom: '1px solid var(--border)', marginBottom: '16px', overflowX: 'auto' }}>
          {tabs.filter(tab => (tab.key !== 'delivered' || showDeliveredTab) && (tab.key !== 'cancelled' || showCancelledTab)).map(tab => (
            <TabButton
              key={tab.key}
              label={tab.label}
              count={counts[tab.key] ?? 0}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>

        <div style={{ opacity: loading ? 0.5 : 1 }}>
          {visibleOrders.length === 0 ? (
            <EmptyState
              selectedDate={selectedDate}
              tab={activeTab}
              search={search}
              totalOrderCount={totalOrderCount}
              settings={settings}
            />
          ) : (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {activeTab === 'all' ? renderAllGroups() : visibleOrders.map(order => <OrderRow key={order.id} order={order} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
