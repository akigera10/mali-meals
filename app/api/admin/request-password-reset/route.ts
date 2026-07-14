import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getAuthorizedAdminEmails } from '@/lib/admin-authorization'
import { checkRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const GENERIC_MESSAGE = 'If this email has admin access, a reset link has been sent.'

function clientAddress(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

function productionOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (configured) {
    try {
      const url = new URL(configured)
      if (url.protocol === 'https:' || url.hostname === 'localhost') return url.origin
    } catch {
      // Fall through to the canonical production origin.
    }
  }
  return 'https://www.malismeals.com'
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`admin-password-reset:${clientAddress(req)}`, 3, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: GENERIC_MESSAGE },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    )
  }

  let email = ''
  try {
    const body = await req.json() as { email?: unknown }
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
  } catch {
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }

  if (!getAuthorizedAdminEmails().has(email)) {
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email })
    if (error || !data.properties.hashed_token) throw new Error('Recovery token generation failed')

    // Keep the token in the fragment so it is never included in server/CDN request logs.
    const resetUrl = `${productionOrigin()}/admin/reset-password#token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailError } = await resend.emails.send({
      from: "Mali's Meals <orders@malismeals.com>",
      to: email,
      subject: "Reset your Mali's Meals admin password",
      text: `Reset your Mali's Meals admin password:\n\n${resetUrl}\n\nThis link can only be used once. If you did not request it, you can ignore this email.`,
      html: `
        <h2>Reset your Mali's Meals admin password</h2>
        <p>Use the secure link below to choose a new admin password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link can only be used once. If you did not request it, you can ignore this email.</p>
      `,
    })
    if (emailError) throw new Error('Recovery email delivery failed')
  } catch {
    // Never expose account existence, provider details, or token data to callers/logs.
    console.error('Admin password reset request could not be completed')
  }

  return NextResponse.json({ message: GENERIC_MESSAGE })
}
