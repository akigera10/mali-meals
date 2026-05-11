/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const ZONE_NAMES: Record<number, string> = {
  1: 'Lavington, Kilimani, Kileleshwa, Hurlingham',
  2: 'Riverside, Westlands, Parklands, Peponi',
  3: 'Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga',
  4: 'Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road',
}

function fmt(n: number) {
  return n.toLocaleString('en-KE')
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function deliveryDateLabel(deliveryDate: string | null): string {
  if (!deliveryDate) return ''
  return new Date(deliveryDate + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function windowLabel(order: any): string {
  if (order.delivery_day === 'wednesday') return deliveryDateLabel(order.delivery_date) || 'Wednesday'

  const day = order.delivery_day === 'sunday' ? 'Sunday' : 'Monday'
  const w = order.delivery_window
  if (w === 'by_5pm') return `${day} - by 5pm`
  if (w === 'free_5_10pm') return `${day} - 5-10pm (free delivery)`
  if (w) return `${day} - ${w.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  if (order.delivery_slot) return `${day} - ${order.delivery_slot.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  return day
}

function variantLabel(variant: string, meatType: string | null, meatUpgradeType: string | null): string {
  if (variant === 'vegetarian') return 'Vegetarian'
  const t = meatType || meatUpgradeType
  if (t === 'beef') return 'with beef'
  if (t === 'chicken') return 'with chicken'
  return 'with protein'
}

function dishRow(name: string, variant: string | null, quantity: number, unitPrice: number): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF;">
        <span style="font-family: Georgia, serif; font-size: 15px; color: #1F1B16;">${escapeHtml(name)}</span>
        ${variant ? `<br><span style="font-family: Arial, sans-serif; font-size: 12px; color: #8B8375;">${escapeHtml(variant)}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #5C554A; white-space: nowrap;">${quantity} &times; ${fmt(unitPrice)}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF; text-align: right; font-family: Georgia, serif; font-size: 15px; color: #1F1B16; white-space: nowrap;">${fmt(unitPrice * quantity)}</td>
    </tr>
  `
}

function sectionHeading(label: string): string {
  return `
    <tr>
      <td colspan="3" style="padding: 10px 0 6px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8375;">
        ${escapeHtml(label)}
      </td>
    </tr>
  `
}

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const db = createAdminClient()

    const { data: order, error: orderError } = await (db.from('orders') as any)
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const [{ data: orderItems }, { data: orderSpecials }] = await Promise.all([
      (db.from('order_items') as any)
        .select(`
          id, dish_name, quantity, variant, meat_type, unit_price,
          menu_items ( name, category, meat_upgrade_type ),
          order_item_addons ( quantity, unit_price, protein_addons ( name ) )
        `)
        .eq('order_id', orderId),
      (db.from('order_specials') as any)
        .select('id, special_name, quantity, unit_price, specials ( name )')
        .eq('order_id', orderId),
    ])

    const mains = (orderItems || []).filter((i: any) => i.menu_items?.category === 'mains')
    const salads = (orderItems || []).filter((i: any) => i.menu_items?.category === 'salads')
    const allAddons = (orderItems || []).flatMap((i: any) => i.order_item_addons || [])
    const specials = orderSpecials || []

    const mainRows = mains.length > 0
      ? sectionHeading('Mains') + mains.map((i: any) =>
          dishRow(
            i.dish_name || i.menu_items?.name || '-',
            variantLabel(i.variant, i.meat_type ?? null, i.menu_items?.meat_upgrade_type ?? null),
            i.quantity,
            i.unit_price
          )
        ).join('')
      : ''

    const saladRows = salads.length > 0
      ? sectionHeading('Salads') + salads.map((i: any) =>
          dishRow(
            i.dish_name || i.menu_items?.name || '-',
            variantLabel(i.variant, i.meat_type ?? null, i.menu_items?.meat_upgrade_type ?? null),
            i.quantity,
            i.unit_price
          )
        ).join('')
      : ''

    const specialRows = specials.length > 0
      ? sectionHeading("Chef's special") + specials.map((s: any) =>
          dishRow(s.special_name || s.specials?.name || '-', null, s.quantity, s.unit_price)
        ).join('')
      : ''

    const addonRows = allAddons.length > 0
      ? sectionHeading('Protein add-ons') + allAddons.map((a: any) =>
          dishRow(a.protein_addons?.name ?? '-', null, a.quantity, a.unit_price)
        ).join('')
      : ''

    const reviewUrl = `${req.nextUrl.origin}/admin/orders/${order.id}`
    const deliveryLabel = windowLabel(order)
    const dateLabel = deliveryDateLabel(order.delivery_date)
    const zoneName = ZONE_NAMES[Number(order.delivery_zone)] || 'Unknown zone'
    const adminEmail = process.env.ADMIN_ORDER_EMAIL || process.env.MALI_ORDERS_EMAIL || 'orders@malismeals.com'
    const freeDelivery = order.delivery_fee === 0 && order.subtotal >= 5000
    const paymentStatusLabel = order.payment_status === 'paid' ? 'Paid' : 'Unpaid'

    const notesBlock = order.notes ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #EDE8DF;">
        <div style="background: #F5E3C0; border-left: 3px solid #C8872E; border-radius: 4px; padding: 12px 16px;">
          <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #A26B1E; margin: 0 0 6px;">Allergy &amp; special instructions</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; color: #1F1B16; margin: 0; line-height: 1.6;">${escapeHtml(order.notes)}</p>
        </div>
      </div>
    ` : ''

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Mali's Meals order - ${escapeHtml(order.order_ref)}</title>
</head>
<body style="margin: 0; padding: 0; background: #FBF7F0; -webkit-text-size-adjust: 100%;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">

    <p style="font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: #1F1B16; text-align: center; margin: 0 0 32px;">
      Mali's Meals
    </p>

    <h1 style="font-family: Georgia, serif; font-size: 34px; font-weight: 400; color: #1F1B16; text-align: center; margin: 0 0 10px;">
      New order received
    </h1>
    <p style="font-family: Arial, sans-serif; font-size: 15px; color: #5C554A; text-align: center; margin: 0 0 32px; line-height: 1.6;">
      ${escapeHtml(order.customer_name)} placed an order for ${escapeHtml(deliveryLabel)}.
    </p>

    <div style="background: #F5E3C0; border-radius: 8px; padding: 20px 24px; text-align: center; margin-bottom: 20px;">
      <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8375; margin: 0 0 6px;">
        Order reference
      </p>
      <p style="font-family: Georgia, serif; font-size: 32px; font-weight: 400; color: #1F1B16; margin: 0 0 8px;">
        ${escapeHtml(order.order_ref)}
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #5C554A; margin: 0 0 16px; line-height: 1.5;">
        ${dateLabel ? `${escapeHtml(dateLabel)} - ` : ''}Zone ${escapeHtml(order.delivery_zone)} - ${escapeHtml(zoneName)}
      </p>
      <a href="${escapeHtml(reviewUrl)}" style="display: inline-block; background: #C8872E; color: #FFFFFF; text-decoration: none; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; border-radius: 8px; padding: 12px 24px;">
        Review order
      </a>
    </div>

    <div style="background: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="font-family: Georgia, serif; font-size: 17px; color: #1F1B16; margin: 0 0 12px;">Customer</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0; width: 90px;">Name</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(order.customer_name)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Phone</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(order.customer_phone)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Email</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(order.customer_email)}</td>
        </tr>
      </table>
    </div>

    <div style="background: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="font-family: Georgia, serif; font-size: 17px; color: #1F1B16; margin: 0 0 12px;">Delivery</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0; width: 90px;">When</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(deliveryLabel)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Zone</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">Zone ${escapeHtml(order.delivery_zone)} - ${escapeHtml(zoneName)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Building</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(order.address_building)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Street</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(order.address_street)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Apt/House</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(order.address_apartment)}</td>
        </tr>
        ${order.address_landmark ? `
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Landmark</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${escapeHtml(order.address_landmark)}</td>
        </tr>` : ''}
      </table>
      ${notesBlock}
    </div>

    <div style="background: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8375; text-align: left; padding-bottom: 10px; border-bottom: 1px solid #EDE8DF;">Item</th>
            <th style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8375; text-align: right; padding-bottom: 10px; border-bottom: 1px solid #EDE8DF; white-space: nowrap;">Qty &amp; price</th>
            <th style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8375; text-align: right; padding-bottom: 10px; border-bottom: 1px solid #EDE8DF;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${mainRows}
          ${saladRows}
          ${specialRows}
          ${addonRows}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 14px; color: #5C554A; padding: 5px 0;">Subtotal</td>
          <td style="font-family: Georgia, serif; font-size: 16px; color: #1F1B16; text-align: right; padding: 5px 0;">${fmt(order.subtotal)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 14px; color: #5C554A; padding: 5px 0;">
            Delivery${freeDelivery ? ' <span style="color: #C8872E; font-size: 13px;">(free!)</span>' : ''}
          </td>
          <td style="font-family: Georgia, serif; font-size: 16px; color: ${freeDelivery ? '#C8872E' : '#1F1B16'}; text-align: right; padding: 5px 0;">
            ${freeDelivery ? 'Free' : fmt(order.delivery_fee)}
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1F1B16; padding: 14px 0 5px; border-top: 1px solid #EDE8DF;">Total</td>
          <td style="font-family: Georgia, serif; font-size: 24px; color: #1F1B16; text-align: right; padding: 14px 0 5px; border-top: 1px solid #EDE8DF;">${fmt(order.total_amount)}</td>
        </tr>
      </table>
    </div>

    <div style="background: #F5E3C0; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px; border: 1px solid #C8872E;">
      <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #A26B1E; margin: 0 0 8px;">
        Payment status
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 15px; color: #1F1B16; margin: 0 0 4px; line-height: 1.6;">
        <strong>${escapeHtml(paymentStatusLabel)}</strong>
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #5C554A; margin: 0; line-height: 1.6;">
        Total due: <strong style="color: #1F1B16;">${fmt(order.total_amount)}</strong>
      </p>
    </div>

    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; text-align: center; margin: 0; line-height: 1.6;">
      This notification was sent because a customer placed a new order.
    </p>

  </div>
</body>
</html>
    `.trim()

    const { error } = await resend.emails.send({
      from: "Mali's Meals <orders@malismeals.com>",
      to: adminEmail,
      replyTo: order.customer_email,
      subject: `New order ${order.order_ref} - ${deliveryLabel} - Zone ${order.delivery_zone}`,
      html,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('send-admin-order-notification error:', err)
    return NextResponse.json({ error: 'Failed to send admin order notification' }, { status: 500 })
  }
}
