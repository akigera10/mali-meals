import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
/* eslint-disable @typescript-eslint/no-unused-vars */

const resend = new Resend(process.env.RESEND_API_KEY)

type CartEntry = {
  id: string
  name: string
  variant: 'vegetarian' | 'meat' | 'addon'
  meatType?: 'beef' | 'chicken' | 'both' | null
  unitPrice: number
  quantity: number
}

const SLOT_LABELS: Record<string, string> = {
  '12_2pm': '12–2pm',
  '2_4pm':  '2–4pm',
  '4_6pm':  '4–6pm',
  '6_8pm':  '6–8pm',
}

function buildDeliveryLabel(delivery_day: string, delivery_slot: string | null): string {
  if (delivery_day === 'sunday_5pm')  return 'Sunday — by 5pm'
  if (delivery_day === 'sunday_free') return 'Sunday — 5–10pm (free delivery)'
  if (delivery_day === 'monday') {
    const slot = delivery_slot ? SLOT_LABELS[delivery_slot] : null
    return slot ? `Monday ${slot}` : 'Monday'
  }
  return ''
}

function fmt(n: number) {
  return `Ksh ${n.toLocaleString('en-KE')}`
}

function variantLabel(e: CartEntry): string {
  if (e.variant === 'vegetarian') return 'Vegetarian'
  if (e.meatType === 'beef')    return 'with beef'
  if (e.meatType === 'chicken') return 'with chicken'
  const match = e.name.match(/with (beef or chicken|chicken|beef)/i)
  return match ? match[0] : 'with meat'
}

export async function POST(req: NextRequest) {
  try {
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
      delivery_slot,
      delivery_address,
      address_building,
      address_street,
      address_apartment,
      address_landmark,
      notes,
    } = await req.json()

    const dishes = (items as CartEntry[]).filter(e => e.variant !== 'addon')
    const addons = (items as CartEntry[]).filter(e => e.variant === 'addon')
    const dayLabel = buildDeliveryLabel(delivery_day, delivery_slot)
    const freeDelivery = delivery_fee === 0 && subtotal >= 5000

    const dishRows = dishes.map(e => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF;">
          <span style="font-family: Georgia, serif; font-size: 15px; color: #1F1B16;">${e.name}</span>
          <br><span style="font-family: Arial, sans-serif; font-size: 12px; color: #8B8375;">${variantLabel(e)}</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #5C554A; white-space: nowrap;">${e.quantity} × ${fmt(e.unitPrice)}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF; text-align: right; font-family: Georgia, serif; font-size: 15px; color: #1F1B16; white-space: nowrap;">${fmt(e.unitPrice * e.quantity)}</td>
      </tr>
    `).join('')

    const addonRows = addons.length > 0 ? `
      <tr>
        <td colspan="3" style="padding: 10px 0 6px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8375;">
          Protein add-ons
        </td>
      </tr>
      ${addons.map(e => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF; font-family: Georgia, serif; font-size: 15px; color: #1F1B16;">${e.name}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #5C554A; white-space: nowrap;">${e.quantity} × ${fmt(e.unitPrice)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE8DF; text-align: right; font-family: Georgia, serif; font-size: 15px; color: #1F1B16; white-space: nowrap;">${fmt(e.unitPrice * e.quantity)}</td>
        </tr>
      `).join('')}
    ` : ''

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Mali's Meals order — ${order_ref}</title>
</head>
<body style="margin: 0; padding: 0; background: #FBF7F0; -webkit-text-size-adjust: 100%;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">

    <!-- Brand -->
    <p style="font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: #1F1B16; text-align: center; margin: 0 0 32px;">
      Mali's Meals
    </p>

    <!-- Heading -->
    <h1 style="font-family: Georgia, serif; font-size: 34px; font-weight: 400; color: #1F1B16; text-align: center; margin: 0 0 10px;">
      Order confirmed!
    </h1>
    <p style="font-family: Arial, sans-serif; font-size: 15px; color: #5C554A; text-align: center; margin: 0 0 32px; line-height: 1.6;">
      Hi ${customer_first_name}, your order is confirmed.
    </p>

    <!-- Order ref -->
    <div style="background: #F5E3C0; border-radius: 8px; padding: 20px 24px; text-align: center; margin-bottom: 28px;">
      <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8375; margin: 0 0 6px;">
        Order reference
      </p>
      <p style="font-family: Georgia, serif; font-size: 32px; font-weight: 400; color: #1F1B16; margin: 0;">
        ${order_ref}
      </p>
    </div>

    <!-- Items -->
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
          ${dishRows}
          ${addonRows}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 14px; color: #5C554A; padding: 5px 0;">Subtotal</td>
          <td style="font-family: Georgia, serif; font-size: 16px; color: #1F1B16; text-align: right; padding: 5px 0;">${fmt(subtotal)}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 14px; color: #5C554A; padding: 5px 0;">
            Delivery${freeDelivery ? ' <span style="color: #C8872E; font-size: 13px;">(free!)</span>' : ''}
          </td>
          <td style="font-family: Georgia, serif; font-size: 16px; color: ${freeDelivery ? '#C8872E' : '#1F1B16'}; text-align: right; padding: 5px 0;">
            ${freeDelivery ? 'Free' : fmt(delivery_fee)}
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1F1B16; padding: 14px 0 5px; border-top: 1px solid #EDE8DF;">Total</td>
          <td style="font-family: Georgia, serif; font-size: 24px; color: #1F1B16; text-align: right; padding: 14px 0 5px; border-top: 1px solid #EDE8DF;">${fmt(total_amount)}</td>
        </tr>
      </table>
    </div>

    <!-- Delivery details -->
    <div style="background: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="font-family: Georgia, serif; font-size: 17px; color: #1F1B16; margin: 0 0 12px;">Delivery details</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0; width: 80px;">Building</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${address_building}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0; width: 80px;">Street</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${address_street}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0; width: 80px;">Apt/House</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${address_apartment}</td>
        </tr>
        ${address_landmark ? `
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0; width: 80px;">Landmark</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${address_landmark}</td>
        </tr>` : ''}
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0; width: 80px;">Zone</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">Zone ${delivery_zone}</td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; padding: 4px 0;">Delivery</td>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #1F1B16; padding: 4px 0;">${dayLabel}</td>
        </tr>
      </table>
      ${notes ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #EDE8DF;">
        <div style="background: #F5E3C0; border-left: 3px solid #C8872E; border-radius: 4px; padding: 12px 16px;">
          <p style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #A26B1E; margin: 0 0 6px;">Allergy &amp; special instructions</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; color: #1F1B16; margin: 0; line-height: 1.6;">${notes}</p>
        </div>
      </div>` : ''}
    </div>

    <!-- M-Pesa instruction -->
    <div style="background: #F5E3C0; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #1F1B16; margin: 0; line-height: 1.7;">
        Please send <strong>${fmt(total_amount)}</strong> to <strong>[M-Pesa number]</strong> using reference <strong>${order_ref}</strong>
      </p>
    </div>

    <!-- Footer -->
    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #8B8375; text-align: center; margin: 0; line-height: 1.6;">
      Questions? Reply to this email.
    </p>

  </div>
</body>
</html>
    `.trim()

    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // TODO: swap to verified sending domain before launch
      to: 'amanda@confid3ntial.studio', // TODO: swap to customer email before launch
      replyTo: 'malismealorders@gmail.com', // TODO: update to Mali's final email before launch
      subject: `Your Mali's Meals order — ${order_ref}`,
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
