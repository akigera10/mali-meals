/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { signInternalRequest } from '@/lib/internal-request'

export const dynamic = 'force-dynamic'

const ZONE_FEES: Record<number, number> = { 1: 300, 2: 350, 3: 450, 4: 500 }
const DELIVERY_SLOTS = new Set(['12_2pm', '2_4pm', '4_6pm', '6_8pm'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(?:0[17]\d{8}|\+\d{7,15})$/

type RequestedCartEntry = {
  id: string
  variant: 'vegetarian' | 'meat' | 'addon' | 'special'
  meatType?: 'beef' | 'chicken' | null
  quantity: number
}

type CreateOrderBody = {
  firstName: string
  lastName: string
  email: string
  phone: string
  addressBuilding: string
  addressStreet: string
  addressApartment: string
  addressLandmark?: string
  zone: number
  deliveryDay: 'sunday_5pm' | 'sunday_free' | 'monday' | 'wednesday'
  deliverySlot?: string
  notes?: string
  cart: RequestedCartEntry[]
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function parseBody(value: unknown): CreateOrderBody | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const firstName = cleanText(input.firstName, 80)
  const lastName = cleanText(input.lastName, 80)
  const email = cleanText(input.email, 254).toLowerCase()
  const phone = cleanText(input.phone, 24).replace(/\s/g, '')
  const addressBuilding = cleanText(input.addressBuilding, 160)
  const addressStreet = cleanText(input.addressStreet, 160)
  const addressApartment = cleanText(input.addressApartment, 80)
  const addressLandmark = cleanText(input.addressLandmark, 240)
  const notes = cleanText(input.notes, 2000)
  const zone = Number(input.zone)
  const deliveryDay = input.deliveryDay
  const deliverySlot = cleanText(input.deliverySlot, 20)

  if (!firstName || !lastName || !EMAIL_RE.test(email) || !PHONE_RE.test(phone)) return null
  if (!addressBuilding || !addressStreet || !addressApartment || !Number.isInteger(zone) || !ZONE_FEES[zone]) return null
  if (!['sunday_5pm', 'sunday_free', 'monday', 'wednesday'].includes(String(deliveryDay))) return null
  if (deliveryDay === 'monday' && !DELIVERY_SLOTS.has(deliverySlot)) return null
  if (!Array.isArray(input.cart) || input.cart.length < 1 || input.cart.length > 50) return null

  const cart: RequestedCartEntry[] = []
  let totalQuantity = 0
  for (const raw of input.cart) {
    if (!raw || typeof raw !== 'object') return null
    const entry = raw as Record<string, unknown>
    const id = cleanText(entry.id, 100)
    const variant = entry.variant
    const quantity = Number(entry.quantity)
    const meatType = entry.meatType
    if (!id || !['vegetarian', 'meat', 'addon', 'special'].includes(String(variant))) return null
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return null
    if (variant === 'meat' && meatType != null && !['beef', 'chicken'].includes(String(meatType))) return null
    totalQuantity += quantity
    cart.push({ id, variant: variant as RequestedCartEntry['variant'], meatType: meatType as RequestedCartEntry['meatType'], quantity })
  }
  if (totalQuantity > 100) return null

  return {
    firstName, lastName, email, phone, addressBuilding, addressStreet, addressApartment,
    addressLandmark, zone, deliveryDay: deliveryDay as CreateOrderBody['deliveryDay'], deliverySlot, notes, cart,
  }
}

async function notify(origin: string, path: string, payload: unknown) {
  const body = JSON.stringify(payload)
  const { timestamp, signature } = signInternalRequest(body)
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-mali-timestamp': timestamp,
      'x-mali-signature': signature,
    },
    body,
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Notification request failed with ${response.status}`)
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const rate = checkRateLimit(`order:${ip}`, 5, 10 * 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many order attempts. Please wait and try again.' }, {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfter) },
    })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const input = parseBody(json)
  if (!input) return NextResponse.json({ error: 'Please check your order details and try again.' }, { status: 400 })

  const db = createAdminClient()
  const { data: settings, error: settingsError } = await (db.from('settings') as any)
    .select('active_cycle, weekend_cutoff, midweek_cutoff, next_sunday_date, next_monday_date, next_wednesday_date')
    .maybeSingle()
  if (settingsError || !settings) return NextResponse.json({ error: 'Ordering is temporarily unavailable.' }, { status: 503 })

  const activeCycle = settings.active_cycle === 'midweek' ? 'midweek' : 'weekend'
  const cutoff = activeCycle === 'midweek' ? settings.midweek_cutoff : settings.weekend_cutoff
  if (cutoff && Date.now() > new Date(cutoff).getTime()) {
    return NextResponse.json({ error: 'Orders for this cycle are closed.' }, { status: 409 })
  }
  if (activeCycle === 'midweek' && input.deliveryDay !== 'wednesday') {
    return NextResponse.json({ error: 'Please select the current delivery option.' }, { status: 409 })
  }
  if (activeCycle === 'weekend' && input.deliveryDay === 'wednesday') {
    return NextResponse.json({ error: 'Please select the current delivery option.' }, { status: 409 })
  }

  const menuIds = [...new Set(input.cart.filter(e => e.variant === 'vegetarian' || e.variant === 'meat').map(e => e.id.split(':')[0]))]
  const specialIds = [...new Set(input.cart.filter(e => e.variant === 'special').map(e => e.id.replace(/^special:/, '')))]
  const addonIds = [...new Set(input.cart.filter(e => e.variant === 'addon').map(e => e.id.replace(/^addon:/, '')))]
  if ([...menuIds, ...specialIds, ...addonIds].some(id => !UUID_RE.test(id))) {
    return NextResponse.json({ error: 'One or more cart items are invalid.' }, { status: 400 })
  }

  const [menuResult, specialResult, addonResult] = await Promise.all([
    menuIds.length ? (db.from('menu_items') as any).select('id, name, category, base_price, meat_upgrade_price, meat_upgrade_type, is_active, is_sold_out, available_weekend, available_midweek').in('id', menuIds) : Promise.resolve({ data: [], error: null }),
    specialIds.length ? (db.from('specials') as any).select('id, name, price, is_active, is_sold_out').in('id', specialIds) : Promise.resolve({ data: [], error: null }),
    addonIds.length ? (db.from('protein_addons') as any).select('id, name, price, is_active, is_sold_out').in('id', addonIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (menuResult.error || specialResult.error || addonResult.error) {
    return NextResponse.json({ error: 'Could not verify the menu. Please try again.' }, { status: 503 })
  }

  const menuById = new Map((menuResult.data || []).map((row: any) => [row.id, row]))
  const specialById = new Map((specialResult.data || []).map((row: any) => [row.id, row]))
  const addonById = new Map((addonResult.data || []).map((row: any) => [row.id, row]))
  const normalized: any[] = []

  for (const entry of input.cart) {
    if (entry.variant === 'special') {
      const id = entry.id.replace(/^special:/, '')
      const item = specialById.get(id) as any
      if (!item?.is_active || item.is_sold_out) return NextResponse.json({ error: 'A special in your cart is no longer available.' }, { status: 409 })
      normalized.push({ ...entry, source: 'special', sourceId: id, name: item.name, unitPrice: Number(item.price) })
      continue
    }
    if (entry.variant === 'addon') {
      const id = entry.id.replace(/^addon:/, '')
      const item = addonById.get(id) as any
      if (!item?.is_active || item.is_sold_out) return NextResponse.json({ error: 'An add-on in your cart is no longer available.' }, { status: 409 })
      normalized.push({ ...entry, source: 'addon', sourceId: id, name: item.name, unitPrice: Number(item.price) })
      continue
    }

    const id = entry.id.split(':')[0]
    const item = menuById.get(id) as any
    const cycleAvailable = activeCycle === 'midweek' ? item?.available_midweek !== false : item?.available_weekend !== false
    if (!item?.is_active || item.is_sold_out || !cycleAvailable) {
      return NextResponse.json({ error: 'A meal in your cart is no longer available.' }, { status: 409 })
    }
    if (entry.variant === 'meat') {
      if (item.meat_upgrade_price == null || item.meat_upgrade_type == null) return NextResponse.json({ error: 'A selected meal option is no longer available.' }, { status: 409 })
      if (item.meat_upgrade_type !== 'both' && entry.meatType && entry.meatType !== item.meat_upgrade_type) return NextResponse.json({ error: 'A selected protein option is invalid.' }, { status: 400 })
      if (item.meat_upgrade_type === 'both' && !entry.meatType) return NextResponse.json({ error: 'Please choose beef or chicken.' }, { status: 400 })
    }
    normalized.push({
      ...entry,
      source: 'menu',
      sourceId: id,
      name: item.name,
      category: item.category,
      meatType: entry.variant === 'meat' ? (entry.meatType || item.meat_upgrade_type) : null,
      unitPrice: Number(item.base_price) + (entry.variant === 'meat' ? Number(item.meat_upgrade_price || 0) : 0),
    })
  }

  const subtotal = normalized.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0)
  if (!Number.isSafeInteger(subtotal) || subtotal <= 0) return NextResponse.json({ error: 'The order total is invalid.' }, { status: 400 })
  if (input.deliveryDay === 'sunday_free' && subtotal < 5000) return NextResponse.json({ error: 'Free Sunday delivery requires a 5,000 subtotal.' }, { status: 409 })

  const deliveryFee = input.deliveryDay === 'sunday_free' ? 0 : ZONE_FEES[input.zone]
  const total = subtotal + deliveryFee
  const dbDeliveryDay = input.deliveryDay === 'wednesday' ? 'wednesday' : input.deliveryDay === 'monday' ? 'monday' : 'sunday'
  const deliveryWindow = input.deliveryDay === 'sunday_5pm' ? 'by_5pm' : input.deliveryDay === 'sunday_free' ? 'free_5_10pm' : input.deliveryDay === 'monday' ? input.deliverySlot : null
  const deliveryDate = dbDeliveryDay === 'wednesday' ? settings.next_wednesday_date : dbDeliveryDay === 'monday' ? settings.next_monday_date : settings.next_sunday_date
  const formattedAddress = `${input.addressBuilding}, ${input.addressStreet}, ${input.addressApartment}${input.addressLandmark ? `\nNear ${input.addressLandmark}` : ''}`

  const { data: order, error: orderError } = await (db.from('orders') as any).insert({
    customer_name: `${input.firstName} ${input.lastName}`,
    customer_phone: input.phone,
    customer_email: input.email,
    delivery_address: formattedAddress,
    address_building: input.addressBuilding,
    address_street: input.addressStreet,
    address_apartment: input.addressApartment,
    address_landmark: input.addressLandmark || null,
    delivery_zone: input.zone,
    delivery_day: dbDeliveryDay,
    delivery_window: deliveryWindow,
    delivery_slot: input.deliverySlot || null,
    delivery_date: deliveryDate || null,
    cycle_type: activeCycle,
    notes: input.notes || null,
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: total,
  }).select('id, order_ref').single()

  if (orderError || !order) return NextResponse.json({ error: 'Could not place your order. Please try again.' }, { status: 500 })

  try {
    const menuEntries = normalized.filter(entry => entry.source === 'menu')
    const specialEntries = normalized.filter(entry => entry.source === 'special')
    const addonEntries = normalized.filter(entry => entry.source === 'addon')

    const { data: insertedItems, error: itemsError } = menuEntries.length
      ? await (db.from('order_items') as any).insert(menuEntries.map(entry => ({
          order_id: order.id,
          menu_item_id: entry.sourceId,
          dish_name: entry.name,
          quantity: entry.quantity,
          variant: entry.variant,
          meat_type: entry.meatType || null,
          unit_price: entry.unitPrice,
        }))).select('id')
      : { data: [], error: null }
    if (itemsError) throw itemsError

    if (specialEntries.length) {
      const { error } = await (db.from('order_specials') as any).insert(specialEntries.map(entry => ({
        order_id: order.id,
        special_id: entry.sourceId,
        special_name: entry.name,
        quantity: entry.quantity,
        unit_price: entry.unitPrice,
      })))
      if (error) throw error
    }

    if (addonEntries.length) {
      if ((insertedItems || []).length) {
        const { error } = await (db.from('order_item_addons') as any).insert(addonEntries.map(entry => ({
          order_item_id: insertedItems![0].id,
          addon_id: entry.sourceId,
          quantity: entry.quantity,
          unit_price: entry.unitPrice,
        })))
        if (error) throw error
      } else {
        const { error } = await (db.from('order_addons') as any).insert(addonEntries.map(entry => ({
          order_id: order.id,
          addon_id: entry.sourceId,
          addon_name: entry.name,
          quantity: entry.quantity,
          unit_price: entry.unitPrice,
        })))
        if (error) throw error
      }
    }
  } catch {
    await (db.from('order_item_addons') as any).delete().in('order_item_id', (await (db.from('order_items') as any).select('id').eq('order_id', order.id)).data?.map((row: any) => row.id) || [])
    await (db.from('order_addons') as any).delete().eq('order_id', order.id)
    await (db.from('order_specials') as any).delete().eq('order_id', order.id)
    await (db.from('order_items') as any).delete().eq('order_id', order.id)
    await (db.from('orders') as any).delete().eq('id', order.id)
    return NextResponse.json({ error: 'Could not save all order items. Please try again.' }, { status: 500 })
  }

  const emailPayload = {
    order_ref: order.order_ref,
    customer_name: `${input.firstName} ${input.lastName}`,
    customer_first_name: input.firstName,
    customer_email: input.email,
    items: normalized.map(entry => ({ id: entry.id, name: entry.name, variant: entry.variant, meatType: entry.meatType, category: entry.category, unitPrice: entry.unitPrice, quantity: entry.quantity })),
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: total,
    delivery_zone: input.zone,
    delivery_day: input.deliveryDay,
    delivery_date: deliveryDate || null,
    delivery_slot: input.deliverySlot || null,
    delivery_address: formattedAddress,
    address_building: input.addressBuilding,
    address_street: input.addressStreet,
    address_apartment: input.addressApartment,
    address_landmark: input.addressLandmark || null,
    notes: input.notes || null,
  }

  const notifications = await Promise.allSettled([
    notify(req.nextUrl.origin, '/api/send-confirmation', emailPayload),
    notify(req.nextUrl.origin, '/api/send-admin-order-notification', { orderId: order.id }),
  ])

  return NextResponse.json({
    orderRef: order.order_ref,
    subtotal,
    deliveryFee,
    total,
    notificationsQueued: notifications.some(result => result.status === 'fulfilled'),
  }, { status: 201 })
}
