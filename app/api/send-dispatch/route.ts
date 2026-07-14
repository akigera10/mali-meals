/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdminRequest } from '@/lib/admin-session'

function fmt(n: number) {
  return n.toLocaleString('en-KE')
}

function windowLabel(deliveryWindow: string | null, deliverySlot: string | null): string {
  const w = deliveryWindow
  if (w === 'by_5pm') return 'by 5pm'
  if (w === 'free_5_10pm') return 'between 5-10pm'
  if (w) return `between ${w.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  if (deliverySlot) return `between ${deliverySlot.replace(/^(\d+)_(\d+pm)$/, '$1-$2')}`
  return 'today'
}

function variantLabel(variant: string, meatUpgradeType: string | null): string {
  if (variant === 'vegetarian') return 'Vegetarian'
  if (meatUpgradeType === 'beef') return 'with beef'
  if (meatUpgradeType === 'chicken') return 'with chicken'
  return 'with protein'
}

function dishRow(name: string, variant: string | null, quantity: number, unitPrice: number): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF;">
        <span style="font-family: Georgia, serif; font-size: 15px; color: #102015;">${name}</span>
        ${variant ? `<br><span style="font-family: Arial, sans-serif; font-size: 12px; color: #6B7D6E;">${variant}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #3A4F3E; white-space: nowrap;">${quantity} &times; ${fmt(unitPrice)}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Georgia, serif; font-size: 15px; color: #102015; white-space: nowrap;">${fmt(unitPrice * quantity)}</td>
    </tr>
  `
}

function sectionHeading(label: string): string {
  return `
    <tr>
      <td colspan="3" style="padding: 10px 0 6px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E;">
        ${label}
      </td>
    </tr>
  `
}

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdminRequest()
    if (authError) return authError

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { orderId } = await req.json()

    const db = createAdminClient()

    const { data: order, error: orderError } = await (db.from('orders') as any)
      .select('*')
      .eq('id', orderId)
      .single()


    if (orderError || !order) {
      console.error('[send-dispatch] order lookup failed')
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: orderItems, error: itemsError } = await (db.from('order_items') as any)
      .select(`
        id, dish_name, quantity, variant, unit_price,
        menu_items ( name, category, meat_upgrade_type ),
        order_item_addons ( quantity, unit_price, protein_addons ( name ) )
      `)
      .eq('order_id', orderId)

    const { data: orderSpecials, error: specialsError } = await (db.from('order_specials') as any)
      .select('id, special_name, quantity, unit_price, specials ( name )')
      .eq('order_id', orderId)

    const { data: orderAddons, error: addonsError } = await (db.from('order_addons') as any)
      .select('addon_name, quantity, unit_price, protein_addons ( name )')
      .eq('order_id', orderId)

    if (itemsError || specialsError || addonsError) {
      console.error('[send-dispatch] order item lookup failed')
    }

    const firstName = order.customer_name.split(' ')[0]
    const windowStr = windowLabel(order.delivery_window, order.delivery_slot)
    const freeDelivery = order.delivery_fee === 0 && order.subtotal >= 5000
    const unpaid = !order.payment_status || order.payment_status === 'unpaid'

    const mains = (orderItems || []).filter((i: any) => i.menu_items?.category === 'mains')
    const salads = (orderItems || []).filter((i: any) => i.menu_items?.category === 'salads')
    const allAddons = [
      ...(orderItems || []).flatMap((i: any) => i.order_item_addons || []),
      ...(orderAddons || []).map((a: any) => ({ ...a, protein_addons: a.protein_addons || { name: a.addon_name } })),
    ]
    const specials = orderSpecials || []

    const mainRows = mains.length > 0
      ? sectionHeading('Mains') + mains.map((i: any) =>
          dishRow(i.dish_name || i.menu_items?.name || '-', variantLabel(i.variant, i.menu_items?.meat_upgrade_type ?? null), i.quantity, i.unit_price)
        ).join('')
      : ''

    const saladRows = salads.length > 0
      ? sectionHeading('Salads') + salads.map((i: any) =>
          dishRow(i.dish_name || i.menu_items?.name || '-', variantLabel(i.variant, i.menu_items?.meat_upgrade_type ?? null), i.quantity, i.unit_price)
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

    const paymentBlock = unpaid
      ? `
        <div style="background: #B5533C; border-radius: 8px; padding: 20px 24px; margin-bottom: 28px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; margin: 0; line-height: 1.5;">
            Please have <strong>${fmt(order.total_amount)}</strong> ready for the rider (M-Pesa or cash).
          </p>
        </div>
      `
      : `
        <div style="background: #1F6B3A; border-radius: 8px; padding: 16px 24px; margin-bottom: 28px;">
          <p style="font-family: Arial, sans-serif; font-size: 15px; color: #ffffff; margin: 0; line-height: 1.5;">
            Your payment of <strong>${fmt(order.total_amount)}</strong> is confirmed - nothing to pay on delivery.
          </p>
        </div>
      `

    const maliPhone = process.env.MALI_PHONE

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Mali's Meals order is on its way - ${order.order_ref}</title>
</head>
<body style="margin: 0; padding: 0; background: #EEF3EC; -webkit-text-size-adjust: 100%;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">

    <!-- Brand -->
    <p style="font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: #102015; text-align: center; margin: 0 0 32px;">
      Mali's Meals
    </p>

    <!-- Heading -->
    <h1 style="font-family: Georgia, serif; font-size: 34px; font-weight: 400; color: #102015; text-align: center; margin: 0 0 10px;">
      Your order is on its way!
    </h1>
    <p style="font-family: Arial, sans-serif; font-size: 15px; color: #3A4F3E; text-align: center; margin: 0 0 32px; line-height: 1.6;">
      Hi ${firstName}, your order will arrive ${windowStr} today.
    </p>

    <!-- Order ref -->
    <div style="background: #D4EDD4; border-radius: 8px; padding: 20px 24px; text-align: center; margin-bottom: 28px;">
      <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E; margin: 0 0 6px;">
        Order reference
      </p>
      <p style="font-family: Georgia, serif; font-size: 32px; font-weight: 400; color: #102015; margin: 0;">
        ${order.order_ref}
      </p>
    </div>

    <!-- Items -->
    <div style="background: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E; text-align: left; padding-bottom: 10px; border-bottom: 1px solid #D4E8CF;">Item</th>
            <th style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E; text-align: right; padding-bottom: 10px; border-bottom: 1px solid #D4E8CF; white-space: nowrap;">Qty &amp; price</th>
            <th style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E; text-align: right; padding-bottom: 10px; border-bottom: 1px solid #D4E8CF;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${mainRows}
          ${saladRows}
          ${specialRows}
          ${addonRows}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 14px; color: #3A4F3E; padding: 5px 0;">Subtotal</td>
          <td style="font-family: Georgia, serif; font-size: 16px; color: #102015; text-align: right; padding: 5px 0;">${fmt(order.subtotal)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 14px; color: #3A4F3E; padding: 5px 0;">
            Delivery${freeDelivery ? ' <span style="color: #1F6B3A; font-size: 13px;">(free!)</span>' : ''}
          </td>
          <td style="font-family: Georgia, serif; font-size: 16px; color: ${freeDelivery ? '#1F6B3A' : '#102015'}; text-align: right; padding: 5px 0;">
            ${freeDelivery ? 'Free' : fmt(order.delivery_fee)}
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; color: #102015; padding: 14px 0 5px; border-top: 1px solid #D4E8CF;">Total</td>
          <td style="font-family: Georgia, serif; font-size: 24px; color: #102015; text-align: right; padding: 14px 0 5px; border-top: 1px solid #D4E8CF;">${fmt(order.total_amount)}</td>
        </tr>
      </table>
    </div>

    <!-- Payment status -->
    ${paymentBlock}

    <!-- Footer -->
    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; text-align: center; margin: 0; line-height: 1.6;">
      Questions? Reply to this email or WhatsApp Mali on ${maliPhone}.
    </p>
    <p style="font-family: Georgia, serif; font-size: 15px; color: #102015; text-align: center; margin: 16px 0 0;">
      Mali's Meals
    </p>

  </div>
</body>
</html>
    `.trim()

    const { error } = await resend.emails.send({
      from: "Mali's Meals <orders@malismeals.com>",
      to: order.customer_email,
      replyTo: 'orders@malismeals.com',
      subject: `Your Mali's Meals order is on its way - ${order.order_ref}`,
      html,
    })

    if (error) {
      console.error('[send-dispatch] email provider rejected request')
      return NextResponse.json({ error: 'Unable to send dispatch email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch {
    console.error('[send-dispatch] request failed')
    return NextResponse.json({ error: 'Failed to send dispatch email' }, { status: 500 })
  }
}
