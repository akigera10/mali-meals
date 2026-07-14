import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_AGE_MS = 60_000

function signingSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return secret
}

function digest(timestamp: string, body: string): string {
  return createHmac('sha256', signingSecret())
    .update(`${timestamp}.${body}`)
    .digest('hex')
}

export function signInternalRequest(body: string): { timestamp: string; signature: string } {
  const timestamp = Date.now().toString()
  return { timestamp, signature: digest(timestamp, body) }
}

export function verifyInternalRequest(timestamp: string | null, signature: string | null, body: string): boolean {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false

  const requestTime = Number(timestamp)
  if (!Number.isFinite(requestTime) || Math.abs(Date.now() - requestTime) > MAX_AGE_MS) return false

  const expected = Buffer.from(digest(timestamp, body), 'hex')
  const received = Buffer.from(signature, 'hex')
  return expected.length === received.length && timingSafeEqual(expected, received)
}
