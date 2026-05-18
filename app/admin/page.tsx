/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase'
import OrdersClient from './OrdersClient'
import AdminNav from './components/AdminNav'

export const revalidate = 0

type Settings = {
  active_cycle?: string | null
  weekend_cutoff?: string | null
  midweek_cutoff?: string | null
  next_sunday_date?: string | null
  next_monday_date?: string | null
  next_wednesday_date?: string | null
} | null

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

function settingsDates(settings: Settings) {
  if (!settings) return []
  return [
    settings.next_sunday_date,
    settings.next_monday_date,
    settings.next_wednesday_date,
  ].filter(Boolean) as string[]
}

function defaultDate(dates: string[], settings: Settings) {
  if (settings?.active_cycle === 'midweek' && settings.next_wednesday_date) return settings.next_wednesday_date
  if (settings?.active_cycle === 'weekend' && settings.next_sunday_date) return settings.next_sunday_date

  const today = todayISO()
  return dates.find(date => date >= today) ?? dates[dates.length - 1] ?? null
}

export default async function AdminPage() {
  const supabase = createAdminClient()

  const [settingsResult, datesResult, countResult] = await Promise.all([
    (supabase.from('settings') as any)
      .select('active_cycle, weekend_cutoff, midweek_cutoff, next_sunday_date, next_monday_date, next_wednesday_date')
      .maybeSingle(),
    supabase
      .from('orders')
      .select('delivery_date')
      .not('delivery_date', 'is', null)
      .order('delivery_date', { ascending: true }),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true }),
  ])

  const settings = (settingsResult.data ?? null) as Settings
  const deliveryDates = Array.from(new Set([
    ...((datesResult.data ?? []).map((row: any) => row.delivery_date as string)),
    ...settingsDates(settings),
  ].filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))

  const selectedDate = defaultDate(deliveryDates, settings)
  const { data: orders, error } = selectedDate
    ? await supabase
      .from('orders')
      .select('id, order_ref, customer_name, customer_phone, customer_email, delivery_zone, delivery_day, delivery_window, delivery_slot, delivery_date, notes, address_building, address_street, address_apartment, address_landmark, subtotal, delivery_fee, total_amount, payment_status, order_status, created_at, updated_at, paid_at')
      .eq('delivery_date', selectedDate)
      .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (error || datesResult.error || settingsResult.error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'var(--font-ui)', color: '#B5533C' }}>
        Error loading orders: {error?.message ?? datesResult.error?.message ?? settingsResult.error?.message}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <OrdersClient
        initialOrders={orders ?? []}
        initialDate={selectedDate}
        deliveryDates={deliveryDates}
        settings={settings}
        totalOrderCount={countResult.count ?? 0}
      />
    </div>
  )
}
