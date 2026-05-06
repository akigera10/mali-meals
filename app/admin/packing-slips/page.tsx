/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase'
import PackingSlipsClient, { type SlipOrder } from './PackingSlipsClient'

export const revalidate = 0

export default async function PackingSlipsPage({
  searchParams,
}: {
  searchParams: { order?: string; day?: string; week?: string; date?: string }
}) {
  const supabase = createAdminClient()

  let rawOrders: any[] = []

  if (searchParams.order) {
    const { data } = await (supabase.from('orders') as any)
      .select('id, order_ref, customer_name, customer_phone, delivery_zone, delivery_day, delivery_date, delivery_window, delivery_slot, address_building, address_street, address_apartment, address_landmark, payment_status, notes')
      .eq('id', searchParams.order)
    rawOrders = data || []
  } else if (searchParams.date) {
    const { data } = await (supabase.from('orders') as any)
      .select('id, order_ref, customer_name, customer_phone, delivery_zone, delivery_day, delivery_date, delivery_window, delivery_slot, address_building, address_street, address_apartment, address_landmark, payment_status, notes')
      .eq('delivery_date', searchParams.date)
      .order('delivery_zone', { ascending: true })
    rawOrders = data || []
  } else if (searchParams.day && searchParams.week) {
    const weekStart = new Date(decodeURIComponent(searchParams.week))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const { data } = await (supabase.from('orders') as any)
      .select('id, order_ref, customer_name, customer_phone, delivery_zone, delivery_day, delivery_date, delivery_window, delivery_slot, address_building, address_street, address_apartment, address_landmark, payment_status, notes')
      .eq('delivery_day', searchParams.day)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())
      .order('delivery_zone', { ascending: true })
    rawOrders = data || []
  }

  const orderIds = rawOrders.map((o: any) => o.id)

  let itemsData: any[] = []
  let specialsData: any[] = []

  if (orderIds.length > 0) {
    const [{ data: items }, { data: specials }] = await Promise.all([
      (supabase.from('order_items') as any)
        .select('order_id, quantity, variant, meat_type, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, protein_addons(name))')
        .in('order_id', orderIds),
      (supabase.from('order_specials') as any)
        .select('order_id, quantity, specials(name)')
        .in('order_id', orderIds),
    ])
    itemsData = items || []
    specialsData = specials || []
  }

  const slips: SlipOrder[] = rawOrders.map((o: any) => {
    const orderItems = itemsData.filter((i: any) => i.order_id === o.id)
    const orderSpecials = specialsData.filter((s: any) => s.order_id === o.id)

    const addons: { name: string; quantity: number }[] = []
    for (const item of orderItems) {
      for (const addon of item.order_item_addons || []) {
        const name = addon.protein_addons?.name ?? 'Unknown'
        const existing = addons.find(a => a.name === name)
        if (existing) existing.quantity += addon.quantity
        else addons.push({ name, quantity: addon.quantity })
      }
    }

    return {
      id: o.id,
      order_ref: o.order_ref,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      delivery_zone: o.delivery_zone,
      delivery_day: o.delivery_day,
      delivery_date: o.delivery_date ?? null,
      delivery_window: o.delivery_window,
      delivery_slot: o.delivery_slot,
      address_building: o.address_building,
      address_street: o.address_street,
      address_apartment: o.address_apartment,
      address_landmark: o.address_landmark,
      payment_status: o.payment_status ?? 'unpaid',
      notes: o.notes,
      items: orderItems.map((i: any) => ({
        name: i.menu_items?.name ?? 'Unknown',
        category: i.menu_items?.category ?? 'mains',
        variant: i.variant,
        meat_type: i.meat_type ?? null,
        meat_upgrade_type: i.menu_items?.meat_upgrade_type ?? null,
        quantity: i.quantity,
      })),
      specials: orderSpecials.map((s: any) => ({
        name: s.specials?.name ?? 'Unknown',
        quantity: s.quantity,
      })),
      addons,
    }
  })

  const backLink = searchParams.order
    ? `/admin/orders/${searchParams.order}`
    : '/admin/deliveries'

  let title: string
  if (searchParams.order) {
    title = `Packing slip — ${slips[0]?.order_ref ?? ''}`
  } else if (searchParams.date) {
    const d = new Date(searchParams.date + 'T12:00:00')
    const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    title = `Packing slips — ${dateLabel}`
  } else {
    const dayLabel = searchParams.day === 'monday' ? 'Monday' : 'Sunday'
    title = `Packing slips — ${dayLabel}`
  }

  return <PackingSlipsClient slips={slips} backLink={backLink} title={title} />
}
