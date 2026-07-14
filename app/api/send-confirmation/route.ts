import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { verifyInternalRequest } from '@/lib/internal-request'
/* eslint-disable @typescript-eslint/no-unused-vars */

type CartEntry = {
  id: string
  name: string
  variant: 'vegetarian' | 'meat' | 'addon' | 'special'
  meatType?: 'beef' | 'chicken' | 'both' | null
  category?: 'mains' | 'salads' | null
  unitPrice: number
  quantity: number
}

const SLOT_LABELS: Record<string, string> = {
  '12_2pm': '12-2pm',
  '2_4pm':  '2-4pm',
  '4_6pm':  '4-6pm',
  '6_8pm':  '6-8pm',
}

function buildDeliveryLabel(delivery_day: string, delivery_slot: string | null, delivery_date: string | null): string {
  if (delivery_day === 'sunday_5pm')  return 'Sunday - by 5pm'
  if (delivery_day === 'sunday_free') return 'Sunday - 5-10pm (free delivery)'
  if (delivery_day === 'monday') {
    const slot = delivery_slot ? SLOT_LABELS[delivery_slot] : null
    return slot ? `Monday ${slot}` : 'Monday'
  }
  if (delivery_day === 'wednesday') {
    if (delivery_date) {
      const d = new Date(delivery_date + 'T12:00:00')
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
      return `Wednesday ${dateStr}`
    }
    return 'Wednesday'
  }
  return ''
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

function variantLabel(e: CartEntry): string {
  if (e.variant === 'vegetarian') return 'Vegetarian'
  if (e.meatType === 'beef')    return 'with beef'
  if (e.meatType === 'chicken') return 'with chicken'
  const match = e.name.match(/with (beef or chicken|chicken|beef)/i)
  return match ? match[0] : 'with protein'
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const authorized = verifyInternalRequest(
      req.headers.get('x-mali-timestamp'),
      req.headers.get('x-mali-signature'),
      rawBody
    )
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resend = new Resend(process.env.RESEND_API_KEY)
    const {
      order_ref,
      customer_name,
      customer_first_name,
      customer_email,
      items,
      subtotal,
      delivery_fee,
      total_amount,
      delivery_zone,
      delivery_day,
      delivery_date,
      delivery_slot,
      delivery_address,
      address_building,
      address_street,
      address_apartment,
      address_landmark,
      notes,
    } = JSON.parse(rawBody)

    if (!Array.isArray(items) || typeof customer_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 })
    }

    const mains = (items as CartEntry[]).filter(e => e.category === 'mains')
    const salads = (items as CartEntry[]).filter(e => e.category === 'salads')
    const specials = (items as CartEntry[]).filter(e => e.variant === 'special')
    const addons = (items as CartEntry[]).filter(e => e.variant === 'addon')
    const dayLabel = buildDeliveryLabel(delivery_day, delivery_slot, delivery_date)
    const freeDelivery = delivery_fee === 0 && subtotal >= 5000
    const maliPhone = (process.env.MALI_PHONE ?? '').replace('+254', '0')

    const dishRows = (entries: CartEntry[]) => entries.map(e => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF;">
            <span style="font-family: Georgia, serif; font-size: 15px; color: #102015;">${escapeHtml(e.name)}</span>
            <br><span style="font-family: Arial, sans-serif; font-size: 12px; color: #6B7D6E;">${escapeHtml(variantLabel(e))}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #3A4F3E; white-space: nowrap;">${e.quantity} &times; ${fmt(e.unitPrice)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Georgia, serif; font-size: 15px; color: #102015; white-space: nowrap;">${fmt(e.unitPrice * e.quantity)}</td>
        </tr>
      `).join('')

    const mainRows = mains.length > 0 ? `
      <tr>
        <td colspan="3" style="padding: 10px 0 6px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E;">
          Mains
        </td>
      </tr>
      ${dishRows(mains)}
    ` : ''

    const saladRows = salads.length > 0 ? `
      <tr>
        <td colspan="3" style="padding: 10px 0 6px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E;">
          Salads
        </td>
      </tr>
      ${dishRows(salads)}
    ` : ''

    const specialRows = specials.length > 0 ? `
      <tr>
        <td colspan="3" style="padding: 10px 0 6px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E;">
          Chef&apos;s special
        </td>
      </tr>
      ${specials.map(e => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; font-family: Georgia, serif; font-size: 15px; color: #102015;">${escapeHtml(e.name)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #3A4F3E; white-space: nowrap;">${e.quantity} &times; ${fmt(e.unitPrice)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Georgia, serif; font-size: 15px; color: #102015; white-space: nowrap;">${fmt(e.unitPrice * e.quantity)}</td>
        </tr>
      `).join('')}
    ` : ''

    const addonRows = addons.length > 0 ? `
      <tr>
        <td colspan="3" style="padding: 10px 0 6px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E;">
          Protein add-ons
        </td>
      </tr>
      ${addons.map(e => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; font-family: Georgia, serif; font-size: 15px; color: #102015;">${escapeHtml(e.name)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #3A4F3E; white-space: nowrap;">${e.quantity} &times; ${fmt(e.unitPrice)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #D4E8CF; text-align: right; font-family: Georgia, serif; font-size: 15px; color: #102015; white-space: nowrap;">${fmt(e.unitPrice * e.quantity)}</td>
        </tr>
      `).join('')}
    ` : ''

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Mali's Meals order received - ${escapeHtml(order_ref)}</title>
</head>
<body style="margin: 0; padding: 0; background: #EEF3EC; -webkit-text-size-adjust: 100%;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">

    <!-- Brand -->
    <p style="font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: #102015; text-align: center; margin: 0 0 32px;">
      Mali's Meals
    </p>

    <!-- Heading -->
    <h1 style="font-family: Georgia, serif; font-size: 34px; font-weight: 400; color: #102015; text-align: center; margin: 0 0 10px;">
      Order received!
    </h1>
    <p style="font-family: Arial, sans-serif; font-size: 15px; color: #3A4F3E; text-align: center; margin: 0 0 32px; line-height: 1.6;">
      Hi ${escapeHtml(customer_first_name)}, we received your order.
    </p>

    <!-- Order ref -->
    <div style="background: #D4EDD4; border-radius: 8px; padding: 20px 24px; text-align: center; margin-bottom: 28px;">
      <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7D6E; margin: 0 0 6px;">
        Order reference
      </p>
      <p style="font-family: Georgia, serif; font-size: 32px; font-weight: 400; color: #102015; margin: 0;">
        ${escapeHtml(order_ref)}
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
          <td style="font-family: Georgia, serif; font-size: 16px; color: #102015; text-align: right; padding: 5px 0;">${fmt(subtotal)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 14px; color: #3A4F3E; padding: 5px 0;">
            Delivery${freeDelivery ? ' <span style="color: #1F6B3A; font-size: 13px;">(free!)</span>' : ''}
          </td>
          <td style="font-family: Georgia, serif; font-size: 16px; color: ${freeDelivery ? '#1F6B3A' : '#102015'}; text-align: right; padding: 5px 0;">
            ${freeDelivery ? 'Free' : fmt(delivery_fee)}
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; color: #102015; padding: 14px 0 5px; border-top: 1px solid #D4E8CF;">Total</td>
          <td style="font-family: Georgia, serif; font-size: 24px; color: #102015; text-align: right; padding: 14px 0 5px; border-top: 1px solid #D4E8CF;">${fmt(total_amount)}</td>
        </tr>
      </table>
    </div>

    <!-- Delivery details -->
    <div style="background: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="font-family: Georgia, serif; font-size: 17px; color: #102015; margin: 0 0 12px;">Delivery details</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; padding: 4px 0; width: 80px;">Building</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #102015; padding: 4px 0;">${escapeHtml(address_building)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; padding: 4px 0; width: 80px;">Street</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #102015; padding: 4px 0;">${escapeHtml(address_street)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; padding: 4px 0; width: 80px;">Apt/House</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #102015; padding: 4px 0;">${escapeHtml(address_apartment)}</td>
        </tr>
        ${address_landmark ? `
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; padding: 4px 0; width: 80px;">Landmark</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #102015; padding: 4px 0;">${escapeHtml(address_landmark)}</td>
        </tr>` : ''}
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; padding: 4px 0; width: 80px;">Zone</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #102015; padding: 4px 0;">Zone ${delivery_zone}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; padding: 4px 0;">Delivery</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #102015; padding: 4px 0;">${dayLabel}</td>
        </tr>
      </table>
      ${notes ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #D4E8CF;">
        <div style="background: #FFFFFF; border: 1px solid #B5533C; border-radius: 8px; padding: 12px 16px;">
          <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #B5533C; margin: 0 0 6px;">Allergy &amp; special instructions</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; color: #102015; margin: 0; line-height: 1.6;">${escapeHtml(notes)}</p>
        </div>
      </div>` : ''}
    </div>

    <!-- M-Pesa instruction -->
    <div style="background: #D4EDD4; border-radius: 8px; padding: 20px; margin-bottom: 28px; border: 1px solid #1F6B3A;">
      <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #1F6B3A; margin: 0 0 10px;">
        How to pay
      </p>
      <p style="font-family: Arial, sans-serif; font-size: 15px; color: #102015; margin: 0; line-height: 1.7;">
        To pay for your order, send <strong>${fmt(total_amount)}</strong> to <strong>${maliPhone} (Godrick Mali Luta)</strong> via M-Pesa.
      </p>
    </div>

    <!-- Footer -->
    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6B7D6E; text-align: center; margin: 0; line-height: 1.6;">
      Questions? Reply to this email.
    </p>

  </div>
</body>
</html>
    `.trim()

    const { error } = await resend.emails.send({
      from: "Mali's Meals <orders@malismeals.com>",
      to: customer_email,
      replyTo: 'orders@malismeals.com',
      subject: `Your Mali's Meals order received - ${String(order_ref).replace(/[\r\n]/g, '')}`,
      html,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('send-confirmation error:', err)
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }
}
